import logging
import os
import re
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





def _seed_default_admin() -> None:
    db = SessionLocal()
    try:
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            db.add(
                User(
                    username="admin",
                    full_name="Lead Agronomist (Admin)",
                    email="admin@plantguard.ai",
                    password_hash=hash_password("admin123"),
                    role="admin",
                )
            )
            db.commit()
        else:
            if not admin_user.full_name:
                admin_user.full_name = "Lead Agronomist (Admin)"
            if not admin_user.email:
                admin_user.email = "admin@plantguard.ai"
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
    return {
        "status": "ok",
        "model": "Custom Convolutional Neural Network",
        "classes": len(model_service.class_names),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/model-info")
def model_info() -> dict:
    return {
        "model": "Custom Convolutional Neural Network",
        "classes": len(model_service.class_names),
        "input_size": "224 × 224",
        "architecture": "3 Conv Blocks (32 → 64 → 128) + Dense(512) + Dropout(0.5)",
        "optimizer": "Adam (lr=0.001)",
        "dropout": 0.5,
        "metrics": {
            "test_accuracy": 97.35,
            "precision": 96.78,
            "recall": 95.97,
            "macro_f1": 96.27,
        },
        "status": "ready",
    }


@app.post("/api/auth/login")
def login(payload: dict, db: Session = Depends(get_db)) -> dict:
    identifier = payload.get("username", "").strip() or payload.get("email", "").strip()
    password = payload.get("password", "")
    if not identifier or not password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username/email and password are required")

    user = db.query(User).filter(
        (User.username == identifier) | (User.email == identifier.lower())
    ).first()

    if user is None or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username/email or password")

    token = create_access_token(user.username, user.role)
    return {
        "token": token,
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_SECONDS,
        "user": {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name or user.username,
            "email": user.email or "",
            "role": user.role,
            "created_at": user.created_at.isoformat() if user.created_at else datetime.now(timezone.utc).isoformat(),
        },
    }


@app.post("/api/auth/register")
def register(payload: dict, db: Session = Depends(get_db)) -> dict:
    full_name = payload.get("full_name", "").strip()
    email = payload.get("email", "").strip().lower()
    username = payload.get("username", "").strip()
    password = payload.get("password", "")
    confirm_password = payload.get("confirm_password", "")

    if not full_name or not email or not username or not password or not confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full name, email, username, password, and password confirmation are required",
        )
    if not re.fullmatch(r"[A-Za-z0-9_.-]{3,80}", username):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username must be 3–80 characters and use only letters, numbers, dots, dashes, or underscores")
    if password != confirm_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Passwords do not match")
    if len(password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must contain at least 8 characters")
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Valid email address is required")

    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")
    if email and db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        username=username,
        full_name=full_name or username,
        email=email,
        password_hash=hash_password(password),
        role="user",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.username, user.role)
    return {
        "token": token,
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_SECONDS,
        "user": {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "created_at": user.created_at.isoformat() if user.created_at else datetime.now(timezone.utc).isoformat(),
        },
    }


@app.get("/api/auth/me")
def get_current_user_profile(
    db: Session = Depends(get_db),
    user: User = Depends(_authenticated_user),
) -> dict:
    preds_count = db.query(PredictionRecord).filter(PredictionRecord.user_id == user.id).count()
    return {
        "id": user.id,
        "username": user.username,
        "full_name": user.full_name or user.username,
        "email": user.email or "",
        "role": user.role,
        "created_at": user.created_at.isoformat() if user.created_at else datetime.now(timezone.utc).isoformat(),
        "predictions_count": preds_count,
    }


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
        if len(image_bytes) > settings.MAX_IMAGE_SIZE_BYTES:
            raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Image exceeds maximum file size (12 MB)")
        with Image.open(__import__("io").BytesIO(image_bytes)) as source:
            source.verify()
    except (ValueError, OSError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid image file") from exc

    result = model_service.predict(image_bytes)
    prediction = result["prediction"]

    # Generate compact thumbnail for history display
    import base64
    from io import BytesIO
    thumb_buf = BytesIO()
    with Image.open(BytesIO(image_bytes)) as img_obj:
        thumb = img_obj.convert("RGB").resize((96, 96))
        thumb.save(thumb_buf, format="JPEG", quality=75)
    thumb_b64 = f"data:image/jpeg;base64,{base64.b64encode(thumb_buf.getvalue()).decode('utf-8')}"

    record = PredictionRecord(
        user_id=user.id,
        image_data=thumb_b64,
        predicted_class=prediction["class_name"],
        confidence=prediction["confidence"],
        severity_percentage=prediction.get("severity_percentage", 0.0),
        severity_grade=prediction.get("severity_grade", "None"),
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

    import base64
    from io import BytesIO

    for img in images:
        if not img.content_type or not img.content_type.startswith("image/"):
            continue
        try:
            image_bytes = await img.read()
            if len(image_bytes) > settings.MAX_IMAGE_SIZE_BYTES:
                continue
            with Image.open(BytesIO(image_bytes)) as source:
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

        thumb_buf = BytesIO()
        with Image.open(BytesIO(image_bytes)) as img_obj:
            thumb = img_obj.convert("RGB").resize((96, 96))
            thumb.save(thumb_buf, format="JPEG", quality=75)
        thumb_b64 = f"data:image/jpeg;base64,{base64.b64encode(thumb_buf.getvalue()).decode('utf-8')}"

        record = PredictionRecord(
            user_id=user.id,
            image_data=thumb_b64,
            predicted_class=pred["class_name"],
            confidence=pred["confidence"],
            severity_percentage=pred.get("severity_percentage", 0.0),
            severity_grade=pred.get("severity_grade", "None"),
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
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(_authenticated_user),
) -> dict:
    limit = max(1, min(limit, 100))
    records = (
        db.query(PredictionRecord)
        .filter(PredictionRecord.user_id == user.id)
        .order_by(PredictionRecord.created_at.desc())
        .limit(limit)
        .all()
    )
    return {
        "records": [
            {
                "id": record.id,
                "predicted_class": record.predicted_class,
                "confidence": record.confidence,
                "severity_percentage": record.severity_percentage or 0.0,
                "severity_grade": record.severity_grade or "None",
                "image_data": record.image_data or "",
                "top_predictions": record.top_predictions,
                "created_at": record.created_at.isoformat() if record.created_at else "",
            }
            for record in records
        ]
    }


@app.delete("/api/history/{record_id}")
def delete_history_item(
    record_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(_authenticated_user),
) -> dict:
    record = db.query(PredictionRecord).filter(
        PredictionRecord.id == record_id, PredictionRecord.user_id == user.id
    ).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    db.delete(record)
    db.commit()
    return {"message": "Record deleted", "id": record_id}


@app.delete("/api/history")
def clear_user_history(
    db: Session = Depends(get_db),
    user: User = Depends(_authenticated_user),
) -> dict:
    deleted_count = db.query(PredictionRecord).filter(PredictionRecord.user_id == user.id).delete()
    db.commit()
    return {"message": "History cleared", "deleted_count": deleted_count}


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
    original_bytes, heatmap_bytes, overlay_bytes, result = model_service.generate_gradcam(image_bytes)
    orig_b64 = f"data:image/png;base64,{base64.b64encode(original_bytes).decode('utf-8')}"
    heat_b64 = f"data:image/png;base64,{base64.b64encode(heatmap_bytes).decode('utf-8')}"
    overlay_b64 = f"data:image/png;base64,{base64.b64encode(overlay_bytes).decode('utf-8')}"

    return {
        **result,
        "original_image": orig_b64,
        "heatmap_image": heat_b64,
        "gradcam_image": overlay_b64,
        "overlay_image": overlay_b64,
        "authenticated_user": user.username,
    }


if settings.FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(settings.FRONTEND_DIST), html=True), name="frontend")



