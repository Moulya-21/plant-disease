from backend.database import Base, engine
from backend.models import PredictionRecord, User


def test_database_schema_is_createable():
    Base.metadata.create_all(engine)
    assert User.__tablename__ == "users"
    assert PredictionRecord.__tablename__ == "predictions"
