from types import SimpleNamespace as C

import pandas as pd
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.main import app
from app.models import College, Course
from app.services.course_importer import import_courses_dataframe
from app.services.eligibility import (
    DIPLOMA_BRANCHES,
    ELIGIBLE,
    INSUFFICIENT,
    NOT_ELIGIBLE,
    evaluate,
    split_branches,
)

URL = "/api/finder/recommend"


# ---------- engine ----------

def lateral(**kw):
    return C(**{"level": "Lateral", "stream_required": None, "min_percentage": 50.0,
                "allowed_branches": "Computer|Electronics", **kw})


def test_branch_list_has_other():
    assert "Other" in DIPLOMA_BRANCHES


def test_split_branches():
    assert split_branches("Computer|Electronics") == ["Computer", "Electronics"]
    assert split_branches(" Computer | ") == ["Computer"]
    assert split_branches(None) == [] and split_branches("") == []


def test_allowed_branch_is_eligible():
    assert evaluate(lateral(), "diploma", 70, None, "Computer")[0] == ELIGIBLE


def test_branch_match_ignores_case():
    assert evaluate(lateral(), "diploma", 70, None, "electronics")[0] == ELIGIBLE


def test_other_branch_is_not_eligible():
    status, reason = evaluate(lateral(), "diploma", 70, None, "Mechanical")
    assert status == NOT_ELIGIBLE and "Computer, Electronics" in reason


def test_missing_branch_is_insufficient():
    assert evaluate(lateral(), "diploma", 70, None, None)[0] == INSUFFICIENT


def test_branch_other_is_never_guessed():
    assert evaluate(lateral(), "diploma", 70, None, "Other")[0] == INSUFFICIENT


def test_course_without_branch_rule_ignores_branch():
    course = lateral(allowed_branches=None)
    assert evaluate(course, "diploma", 70, None, None)[0] == ELIGIBLE
    assert evaluate(course, "diploma", 70, None, "Mechanical")[0] == ELIGIBLE


def test_branch_rule_still_checks_percentage():
    assert evaluate(lateral(), "diploma", 40, None, "Computer")[0] == NOT_ELIGIBLE


def test_old_style_course_without_attribute_still_works():
    course = C(level="Lateral", stream_required=None, min_percentage=50.0)
    assert evaluate(course, "diploma", 70, None, "Computer")[0] == ELIGIBLE


# ---------- API ----------

@pytest.fixture()
def client_with_lateral(db):
    college = College(
        slug="test-institute-bengaluru", name="Test Institute of Technology", state="Karnataka",
        city="Bengaluru", institution_type="Engineering College", ownership="Private",
    )
    db.add(college)
    db.flush()
    db.add(Course(college_id=college.id, name="B.Tech Computer Science (Lateral)", level="Lateral",
                  min_percentage=50.0, allowed_branches="Computer|Electronics"))
    db.commit()
    return TestClient(app)


def first_result(client, **extra):
    body = {"qualification": "diploma", "diploma_percentage": 70, **extra}
    r = client.post(URL, json=body)
    assert r.status_code == 200
    return r.json()["results"][0]


def test_api_allowed_branch(client_with_lateral):
    assert first_result(client_with_lateral, diploma_branch="Computer")["status"] == ELIGIBLE


def test_api_wrong_branch(client_with_lateral):
    assert first_result(client_with_lateral, diploma_branch="Mechanical")["status"] == NOT_ELIGIBLE


def test_api_no_branch_is_insufficient(client_with_lateral):
    assert first_result(client_with_lateral)["status"] == INSUFFICIENT


def test_api_branch_other_is_insufficient(client_with_lateral):
    assert first_result(client_with_lateral, diploma_branch="Other")["status"] == INSUFFICIENT


def test_api_branch_is_case_insensitive(client_with_lateral):
    assert first_result(client_with_lateral, diploma_branch="computer")["status"] == ELIGIBLE


def test_api_returns_allowed_branches(client_with_lateral):
    course = first_result(client_with_lateral, diploma_branch="Computer")["courses"][0]
    assert course["allowed_branches"] == ["Computer", "Electronics"]


def test_api_unknown_branch_is_rejected(client_with_lateral):
    body = {"qualification": "diploma", "diploma_percentage": 70, "diploma_branch": "Astrology"}
    assert client_with_lateral.post(URL, json=body).status_code == 422


# ---------- importer ----------

ROW = dict(
    college_name="Test Institute of Technology", city="Bengaluru", state="Karnataka",
    course_name="B.Tech Computer Science (Lateral)", level="Lateral", stream_required="",
    allowed_branches="Computer|Electronics", min_percentage="50", eligibility_notes="",
    admission_route="", source_name="Test Source", source_url="https://example.edu/admissions",
    last_verified_on="2026-10-01",
)


@pytest.fixture()
def college(db):
    c = College(
        slug="test-institute-bengaluru", name="Test Institute of Technology", state="Karnataka",
        city="Bengaluru", institution_type="Engineering College", ownership="Private",
    )
    db.add(c)
    db.commit()
    return c


def frame(**changes):
    return pd.DataFrame([{**ROW, **changes}])


def test_importer_saves_branches(db, college):
    report = import_courses_dataframe(db, frame())
    assert report.created == 1
    assert db.scalar(select(Course)).allowed_branches == "Computer|Electronics"


def test_importer_normalises_branch_names(db, college):
    import_courses_dataframe(db, frame(allowed_branches="computer | ELECTRONICS | computer"))
    assert db.scalar(select(Course)).allowed_branches == "Computer|Electronics"


def test_importer_empty_branches_stay_empty(db, college):
    import_courses_dataframe(db, frame(allowed_branches=""))
    assert db.scalar(select(Course)).allowed_branches is None


def test_importer_rejects_unknown_branch(db, college):
    report = import_courses_dataframe(db, frame(allowed_branches="Computer|Astrology"))
    assert report.created == 0 and "unknown branch" in report.rejected[0][1]


def test_importer_rejects_branches_on_non_lateral(db, college):
    report = import_courses_dataframe(db, frame(level="UG"))
    assert report.created == 0 and "Lateral" in report.rejected[0][1]


def test_importer_column_is_optional(db, college):
    report = import_courses_dataframe(db, frame().drop(columns=["allowed_branches"]))
    assert report.created == 1
