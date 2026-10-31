import pandas as pd
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.main import app
from app.models import College, Course
from app.services.course_importer import import_courses_dataframe
from app.services.eligibility import ELIGIBLE, NOT_ELIGIBLE

COLLEGE = dict(
    slug="test-institute-bengaluru",
    name="Test Institute of Technology",
    state="Karnataka",
    city="Bengaluru",
    institution_type="Engineering College",
    ownership="Private",
)

ROW = dict(
    college_name="Test Institute of Technology",
    city="Bengaluru",
    state="Karnataka",
    course_name="B.Tech Computer Science",
    level="UG",
    stream_required="PCM",
    min_percentage="75",
    eligibility_notes="",
    admission_route="JEE Main",
    source_name="Test Source",
    source_url="https://example.edu/admissions",
    last_verified_on="2026-10-01",
)


@pytest.fixture()
def college(db):
    c = College(**COLLEGE)
    db.add(c)
    db.commit()
    return c


def frame(*rows):
    return pd.DataFrame([{**ROW, **r} for r in rows])


def count_courses(db):
    return db.scalar(select(func.count(Course.id)))


def test_valid_row_creates_course(db, college):
    report = import_courses_dataframe(db, frame({}))
    assert (report.created, report.updated) == (1, 0)
    assert report.rejected == [] and report.duplicates == []
    course = db.scalar(select(Course))
    assert course.college_id == college.id
    assert course.level == "UG" and course.stream_required == "PCM"
    assert course.min_percentage == 75.0
    assert course.data_source_id is not None
    assert str(course.last_verified_on) == "2026-10-01"


def test_empty_min_percentage_stays_empty(db, college):
    import_courses_dataframe(db, frame({"min_percentage": "", "stream_required": ""}))
    course = db.scalar(select(Course))
    assert course.min_percentage is None and course.stream_required is None


def test_unknown_college_is_rejected_not_created(db, college):
    report = import_courses_dataframe(db, frame({"college_name": "Unknown Institute"}))
    assert report.created == 0
    assert "unknown college" in report.rejected[0][1]
    assert db.scalar(select(func.count(College.id))) == 1


def test_college_match_is_case_insensitive(db, college):
    report = import_courses_dataframe(db, frame({"college_name": "test institute of technology", "city": "BENGALURU"}))
    assert report.created == 1


@pytest.mark.parametrize("field,value", [
    ("level", "PhD"),
    ("stream_required", "Medical"),
    ("min_percentage", "abc"),
    ("min_percentage", "101"),
    ("min_percentage", "-5"),
    ("source_url", "javascript:alert(1)"),
    ("source_url", "example.edu"),
    ("last_verified_on", "01/10/2026"),
    ("last_verified_on", "2099-01-01"),
])
def test_invalid_values_are_rejected(db, college, field, value):
    report = import_courses_dataframe(db, frame({field: value}))
    assert report.created == 0 and len(report.rejected) == 1
    assert count_courses(db) == 0


@pytest.mark.parametrize("field", [
    "college_name", "city", "state", "course_name", "level",
    "source_name", "source_url", "last_verified_on",
])
def test_missing_required_value_is_rejected(db, college, field):
    report = import_courses_dataframe(db, frame({field: ""}))
    assert report.created == 0
    assert "missing required value" in report.rejected[0][1]


def test_missing_required_column_raises(db, college):
    df = frame({}).drop(columns=["source_url"])
    with pytest.raises(ValueError, match="source_url"):
        import_courses_dataframe(db, df)


def test_headers_are_case_and_space_insensitive(db, college):
    df = frame({}).rename(columns={"college_name": "College Name", "course_name": "COURSE NAME"})
    assert import_courses_dataframe(db, df).created == 1


def test_duplicate_rows_in_one_file_are_reported(db, college):
    report = import_courses_dataframe(db, frame({}, {}))
    assert report.created == 1 and len(report.duplicates) == 1


def test_same_course_name_different_level_is_not_duplicate(db, college):
    report = import_courses_dataframe(db, frame({}, {"level": "Lateral"}))
    assert report.created == 2 and report.duplicates == []


def test_reimport_updates_instead_of_duplicating(db, college):
    import_courses_dataframe(db, frame({}))
    report = import_courses_dataframe(db, frame({"min_percentage": "80"}))
    assert (report.created, report.updated) == (0, 1)
    assert count_courses(db) == 1
    assert db.scalar(select(Course)).min_percentage == 80.0


def test_one_bad_row_does_not_block_good_rows(db, college):
    report = import_courses_dataframe(db, frame({}, {"course_name": "B.Tech Mechanical", "level": "PhD"}))
    assert report.created == 1 and len(report.rejected) == 1
    assert report.rejected[0][0] == 3  # header = line 1, second data row = line 3


def test_dry_run_saves_nothing(db, college):
    report = import_courses_dataframe(db, frame({}), commit=False)
    assert report.created == 1
    assert count_courses(db) == 0


def test_empty_file_with_only_header(db, college):
    report = import_courses_dataframe(db, frame({}).iloc[0:0])
    assert (report.created, report.updated) == (0, 0)


def test_imported_course_drives_finder(db, college):
    import_courses_dataframe(db, frame({}))
    client = TestClient(app)

    def status_for(pct):
        body = {"qualification": "12th", "percentage_10": 80, "percentage_12": pct, "stream": "PCM"}
        results = client.post("/api/finder/recommend", json=body).json()["results"]
        return next(r for r in results if r["slug"] == COLLEGE["slug"])["status"]

    assert status_for(80) == ELIGIBLE
    assert status_for(60) == NOT_ELIGIBLE
