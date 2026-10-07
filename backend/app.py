import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.staticfiles import StaticFiles
from PIL import Image
from sqlalchemy.orm import Session

from backend.config import settings
from backend.database import SessionLocal, get_db, init_db
from backend.models import PredictionRecord, User
from backend.model_service import ModelService
from backend.security import create_access_token, decode_access_token, hash_password, verify_password

logger = logging.getLogger("plantguard")

app = FastAPI(
    title="Plant Disease Detection API",
    version="1.0.0",
    description="Enterprise-grade agronomic plant pathology classification service.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer(auto_error=False)
model_service = ModelService()
init_db()



def _seed_default_admin(db: Session) -> None:
    if not db.query(User).filter(User.username == "admin").first():
        db.add(
            User(
                username="admin",
                password_hash=hash_password("admin123"),
                role="admin",
            )
        )
        db.commit()


def _seed_default_admin() -> None:
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.username == "admin").first():
            db.add(
                User(
                    username="admin",
                    password_hash=hash_password("admin123"),
                    role="admin",
                )
            )
            db.commit()
    finally:
        db.close()


_seed_default_admin()


def _authenticated_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    try:
        payload = decode_access_token(credentials.credentials)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    user = db.query(User).filter(User.username == payload["sub"]).first()
    if user is None or user.role != payload.get("role", "user"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user session")
    return user


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "model": model_service.model_name, "timestamp": datetime.now(timezone.utc).isoformat()}


@app.get("/api/model-info")
def model_info() -> dict:
    is_mobilenet = "mobilenet" in model_service.model_name.lower()
    return {
        "model": model_service.model_name,
        "classes": len(model_service.class_names),
        "input_size": 224,
        "architecture": "MobileNetV2 Fine-Tuned Backbone (97.38% Acc)" if is_mobilenet else "3 Conv Blocks + Dense(512)",
        "status": "ready",
    }


@app.post("/api/auth/login")
def login(payload: dict, db: Session = Depends(get_db)) -> dict:
    if not isinstance(payload, dict) or not payload.get("username") or not payload.get("password"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username and password are required")
    user = db.query(User).filter(User.username == payload["username"]).first()
    if user is None or not verify_password(payload["password"], user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(user.username, user.role)
    return {
        "token": token,
        "expires_in": 8 * 60 * 60,
        "user": {"username": user.username, "role": user.role},
    }


@app.post("/api/auth/register")
def register(payload: dict, db: Session = Depends(get_db)) -> dict:
    if not payload.get("username") or not payload.get("password"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username and password are required")
    if len(payload["password"]) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must contain at least 8 characters")
    if db.query(User).filter(User.username == payload["username"]).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")
    user = User(username=payload["username"], password_hash=hash_password(payload["password"]))
    db.add(user)
    db.commit()
    return {"message": "Account created", "user": {"username": user.username, "role": user.role}}


@app.post("/api/predict")
async def predict(
    image: UploadFile,
    db: Session = Depends(get_db),
    user: User = Depends(_authenticated_user),
) -> dict:
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Only image files are supported")
    try:
        image_bytes = await image.read()
        if len(image_bytes) > 12 * 1024 * 1024:
            raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Image exceeds 12 MB")
        with Image.open(__import__("io").BytesIO(image_bytes)) as source:
            source.verify()
    except (ValueError, OSError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image file") from exc

    result = model_service.predict(image_bytes)
    prediction = result["prediction"]
    record = PredictionRecord(
        user_id=user.id,
        predicted_class=prediction["class_name"],
        confidence=prediction["confidence"],
        top_predictions=result["top_predictions"],
    )
    db.add(record)
    db.commit()
    return {
        **result,
        "record_id": record.id,
        "authenticated_user": user.username,
    }


@app.post("/api/predict/batch")
async def predict_batch(
    images: list[UploadFile],
    db: Session = Depends(get_db),
    user: User = Depends(_authenticated_user),
) -> dict:
    if not images or len(images) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one image is required")
    if len(images) > 10:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Batch limit is 10 images per request")

    batch_results = []
    healthy_count = 0
    pathologies = {}

    for img in images:
        if not img.content_type or not img.content_type.startswith("image/"):
            continue
        try:
            image_bytes = await img.read()
            if len(image_bytes) > settings.MAX_IMAGE_SIZE_BYTES:
                continue
            with Image.open(__import__("io").BytesIO(image_bytes)) as source:
                source.verify()
        except (ValueError, OSError):
            continue

        res = model_service.predict(image_bytes)
        pred = res["prediction"]
        is_healthy = "healthy" in pred["class_name"].lower()
        if is_healthy:
            healthy_count += 1
        else:
            pathologies[pred["class_name"]] = pathologies.get(pred["class_name"], 0) + 1

        record = PredictionRecord(
            user_id=user.id,
            predicted_class=pred["class_name"],
            confidence=pred["confidence"],
            top_predictions=res["top_predictions"],
        )
        db.add(record)
        batch_results.append({
            "filename": img.filename,
            **res,
        })

    db.commit()
    total_processed = len(batch_results)
    vigor_pct = round((healthy_count / total_processed * 100), 1) if total_processed > 0 else 0.0

    return {
        "total_specimens": total_processed,
        "healthy_count": healthy_count,
        "infected_count": total_processed - healthy_count,
        "crop_vigor_percentage": vigor_pct,
        "primary_pathologies": pathologies,
        "results": batch_results,
    }


@app.get("/api/history")

def history(
    db: Session = Depends(get_db),
    user: User = Depends(_authenticated_user),
) -> dict:
    records = (
        db.query(PredictionRecord)
        .filter(PredictionRecord.user_id == user.id)
        .order_by(PredictionRecord.created_at.desc())
        .limit(10)
        .all()
    )
    return {
        "records": [
            {
                "id": record.id,
                "predicted_class": record.predicted_class,
                "confidence": record.confidence,
                "top_predictions": record.top_predictions,
                "created_at": record.created_at.isoformat(),
            }
            for record in records
        ]
    }


@app.post("/api/gradcam")
async def gradcam(
    image: UploadFile,
    user: User = Depends(_authenticated_user),
) -> dict:
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Only image files are supported")
    try:
        image_bytes = await image.read()
        if len(image_bytes) > settings.MAX_IMAGE_SIZE_BYTES:
            raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Image exceeds maximum file size")
        with Image.open(__import__("io").BytesIO(image_bytes)) as source:
            source.verify()
    except (ValueError, OSError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image file") from exc

    import base64
    overlay_bytes, result = model_service.generate_gradcam(image_bytes)
    base64_image = base64.b64encode(overlay_bytes).decode("utf-8")
    return {
        **result,
        "gradcam_image": f"data:image/png;base64,{base64_image}",
        "authenticated_user": user.username,
    }


if settings.FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(settings.FRONTEND_DIST), html=True), name="frontend")



