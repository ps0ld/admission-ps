"""Create tables and import a college CSV.

Usage (from the backend/ folder):
    python -m scripts.init_db                       # tables + bundled starter dataset
    python -m scripts.init_db path/to/colleges.csv  # tables + your own dataset
"""
from __future__ import annotations

import sys
from pathlib import Path

from app import models  # noqa: F401
from app.db import Base, SessionLocal, engine
from app.services.importer import import_csv

DEFAULT_CSV = Path(__file__).resolve().parent.parent / "data" / "seed" / "colleges_seed.csv"


def main() -> None:
    csv_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_CSV
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        report = import_csv(db, csv_path)
    print(f"Imported {csv_path.name}: {report.summary()}")
    for line, reason in report.rejected:
        print(f"  rejected row {line}: {reason}")
    for line, label in report.duplicates:
        print(f"  duplicate row {line}: {label}")


if __name__ == "__main__":
    main()
