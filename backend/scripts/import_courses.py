"""Import a course-rules CSV into the database.

Usage (from the backend/ folder):
    python -m scripts.import_courses path/to/courses.csv             # real import
    python -m scripts.import_courses path/to/courses.csv --dry-run   # check only, saves nothing

Empty template: data/templates/courses_template.csv
Colleges must already exist (import them first with scripts.init_db).
"""
from __future__ import annotations

import argparse
from pathlib import Path

from app import models  # noqa: F401
from app.db import Base, SessionLocal, engine
from app.services.course_importer import import_courses_csv


def main() -> None:
    parser = argparse.ArgumentParser(description="Import course eligibility rules from a CSV.")
    parser.add_argument("csv_path", type=Path)
    parser.add_argument("--dry-run", action="store_true", help="validate only, do not save")
    args = parser.parse_args()

    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        report = import_courses_csv(db, args.csv_path, commit=not args.dry_run)

    mode = "DRY RUN (nothing saved)" if args.dry_run else "Imported"
    print(f"{mode} {args.csv_path.name}: {report.summary()}")
    for line, reason in report.rejected:
        print(f"  rejected row {line}: {reason}")
    for line, label in report.duplicates:
        print(f"  duplicate row {line}: {label}")


if __name__ == "__main__":
    main()
