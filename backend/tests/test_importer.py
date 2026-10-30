import pandas as pd
from sqlalchemy import func, select

from app.models import College
from app.services.importer import import_csv, import_dataframe

from .conftest import SEED

BASE = dict(
    name="Test Institute of Technology",
    state="Karnataka",
    city="Bengaluru",
    institution_type="Engineering College",
    ownership="Private",
)


def frame(*rows):
    return pd.DataFrame([{**BASE, **r} for r in rows])


def test_seed_file_imports_cleanly(db):
    report = import_csv(db, SEED)
    assert report.rejected == []
    assert report.duplicates == []
    assert report.created > 50
    assert db.scalar(select(func.count(College.id))) == report.created


def test_seed_records_are_never_marked_verified(db):
    import_csv(db, SEED)
    verified = db.scalar(select(func.count(College.id)).where(College.verification_status == "verified"))
    assert verified == 0


def test_missing_required_value_is_rejected(db):
    report = import_dataframe(db, frame({"city": ""}))
    assert report.created == 0
    assert report.rejected and "required" in report.rejected[0][1]


def test_missing_required_column_raises(db):
    df = frame({}).drop(columns=["state"])
    try:
        import_dataframe(db, df)
    except ValueError as exc:
        assert "state" in str(exc)
    else:
        raise AssertionError("expected ValueError")


def test_unknown_type_and_ownership_rejected(db):
    report = import_dataframe(
        db, frame({"institution_type": "Space Academy"}, {"name": "B", "ownership": "Mars"})
    )
    assert report.created == 0
    assert len(report.rejected) == 2


def test_duplicate_rows_in_one_file_are_reported(db):
    report = import_dataframe(db, frame({}, {}))
    assert report.created == 1
    assert len(report.duplicates) == 1


def test_reimport_updates_instead_of_duplicating(db):
    import_dataframe(db, frame({}))
    report = import_dataframe(db, frame({"website": "https://example.edu"}))
    assert (report.created, report.updated) == (0, 1)
    assert db.scalar(select(func.count(College.id))) == 1


def test_verified_requires_date(db):
    report = import_dataframe(db, frame({"verification_status": "verified"}))
    assert report.created == 0
    ok = import_dataframe(
        db, frame({"verification_status": "verified", "last_verified_on": "2026-10-01"})
    )
    assert ok.created == 1


def test_bad_url_and_bad_date_rejected(db):
    report = import_dataframe(
        db,
        frame({"website": "javascript:alert(1)"}, {"name": "B", "last_verified_on": "01/10/2026"}),
    )
    assert report.created == 0
    assert len(report.rejected) == 2
