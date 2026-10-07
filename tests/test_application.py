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


def test_gradcam_endpoint_returns_base64_heatmap():
    image = Image.new("RGB", (224, 224), color=(80, 160, 90))
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    buffer.seek(0)

    login_response = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "admin123"},
    )
    token = login_response.json()["token"]
    response = client.post(
        "/api/gradcam",
        files={"image": ("leaf.png", buffer.getvalue(), "image/png")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["gradcam_image"].startswith("data:image/png;base64,")
    assert "prediction" in payload


def test_root_serves_spa_frontend():
    response = client.get("/")
    assert response.status_code == 200
    assert "PlantGuard" in response.text
    assert '<div id="root">' in response.text


def test_batch_prediction_endpoint():
    # Create two synthetic specimen images
    img1 = Image.new("RGB", (224, 224), color=(60, 150, 70))
    buf1 = BytesIO()
    img1.save(buf1, format="PNG")

    img2 = Image.new("RGB", (224, 224), color=(120, 100, 50))
    buf2 = BytesIO()
    img2.save(buf2, format="PNG")

    login_response = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "admin123"},
    )
    token = login_response.json()["token"]

    response = client.post(
        "/api/predict/batch",
        files=[
            ("images", ("leaf1.png", buf1.getvalue(), "image/png")),
            ("images", ("leaf2.png", buf2.getvalue(), "image/png")),
        ],
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["total_specimens"] == 2
    assert "crop_vigor_percentage" in payload
    assert len(payload["results"]) == 2



