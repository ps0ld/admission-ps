import os
from pathlib import Path

# Must be set before the app package is imported.
os.environ["DATABASE_URL"] = "sqlite://"

import pytest
from fastapi.testclient import TestClient

from app.db import Base, SessionLocal, engine
from app.main import app
from app.services.importer import import_csv

SEED = Path(__file__).resolve().parent.parent / "data" / "seed" / "colleges_seed.csv"


@pytest.fixture()
def db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        yield session


@pytest.fixture()
def seeded(db):
    import_csv(db, SEED)
    return db


@pytest.fixture()
def client(seeded):
    return TestClient(app)
