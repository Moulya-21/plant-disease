import os
from pathlib import Path
from typing import List


class Settings:
    """Production configuration and environment variable manager."""

    # Project Paths
    BASE_DIR: Path = Path(__file__).resolve().parents[1]
    DATA_DIR: Path = Path(os.getenv("DATA_DIR", str(BASE_DIR / "data")))
    MODEL_DIR: Path = BASE_DIR / "model"
    FRONTEND_DIST: Path = BASE_DIR / "frontend" / "dist"

    # Security & JWT
    JWT_SECRET: str = os.getenv("JWT_SECRET", "plantguard-production-jwt-secret-replace-in-env")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_SECONDS: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_SECONDS", str(8 * 3600)))

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{(DATA_DIR / 'plant_disease.db').resolve()}",
    )

    # CORS
    CORS_ORIGINS: List[str] = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000,http://127.0.0.1:8000",
        ).split(",")
        if origin.strip()
    ]

    # Model & Inference
    DEFAULT_MODEL_FILE: str = (
        "mobilenetv2_finetuned_best.keras"
        if (MODEL_DIR / "mobilenetv2_finetuned_best.keras").exists()
        else "custom_cnn_best.keras"
    )
    MODEL_PATH: Path = MODEL_DIR / os.getenv("MODEL_FILE", DEFAULT_MODEL_FILE)
    CLASS_NAMES_PATH: Path = MODEL_DIR / "class_names.json"
    MAX_IMAGE_SIZE_BYTES: int = int(os.getenv("MAX_IMAGE_SIZE_BYTES", str(12 * 1024 * 1024)))  # 12 MB

    # Server Runtime
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"


settings = Settings()
