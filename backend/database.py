from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.config import settings
from backend.models import Base

settings.DATA_DIR.mkdir(parents=True, exist_ok=True)

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {},
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    if settings.DATABASE_URL.startswith("sqlite"):
        # Safe schema column additions for SQLite
        with engine.connect() as conn:
            user_cols = [row[1] for row in conn.exec_driver_sql("PRAGMA table_info(users)").fetchall()]
            if "full_name" not in user_cols:
                conn.exec_driver_sql("ALTER TABLE users ADD COLUMN full_name VARCHAR(120) DEFAULT ''")
            if "email" not in user_cols:
                conn.exec_driver_sql("ALTER TABLE users ADD COLUMN email VARCHAR(150) DEFAULT ''")
            if "created_at" not in user_cols:
                # SQLite only permits constant defaults when adding columns. New
                # records use the SQLAlchemy model default; backfill legacy rows.
                conn.exec_driver_sql("ALTER TABLE users ADD COLUMN created_at TIMESTAMP")
                conn.exec_driver_sql("UPDATE users SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL")

            pred_cols = [row[1] for row in conn.exec_driver_sql("PRAGMA table_info(predictions)").fetchall()]
            if "image_data" not in pred_cols:
                conn.exec_driver_sql("ALTER TABLE predictions ADD COLUMN image_data TEXT DEFAULT ''")
            if "severity_percentage" not in pred_cols:
                conn.exec_driver_sql("ALTER TABLE predictions ADD COLUMN severity_percentage FLOAT DEFAULT 0.0")
            if "severity_grade" not in pred_cols:
                conn.exec_driver_sql("ALTER TABLE predictions ADD COLUMN severity_grade VARCHAR(50) DEFAULT 'None'")
            conn.commit()
