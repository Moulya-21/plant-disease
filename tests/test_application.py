from fastapi.testclient import TestClient
from PIL import Image
from io import BytesIO

from backend.app import app

client = TestClient(app)


def test_health_endpoint_is_public():
    response = client.get("/api/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["model"] == "custom_cnn_best"


def test_protected_prediction_endpoint_rejects_unauthenticated_requests():
    response = client.post("/api/predict", files={"image": ("leaf.jpg", b"not-an-image", "image/jpeg")})
    assert response.status_code == 401


def test_login_returns_expiring_jwt_and_user_context():
    response = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "admin123"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["token"]
    assert payload["user"]["role"] == "admin"
    assert payload["expires_in"] > 0


def test_prediction_accepts_valid_image_and_returns_38_classes():
    image = Image.new("RGB", (224, 224), color=(120, 180, 100))
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    buffer.seek(0)

    login_response = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "admin123"},
    )
    token = login_response.json()["token"]
    response = client.post(
        "/api/predict",
        files={"image": ("leaf.png", buffer.getvalue(), "image/png")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert len(payload["top_predictions"]) == 3
    assert len(payload["all_predictions"]) == 38
    assert payload["prediction"]["confidence"] >= 0
    assert payload["prediction"]["confidence"] <= 1
