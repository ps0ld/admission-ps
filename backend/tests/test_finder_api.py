import pytest

from app.services.eligibility import INSUFFICIENT

URL = "/api/finder/recommend"

VALID = {
    "10th": {"qualification": "10th", "percentage_10": 75},
    "12th": {"qualification": "12th", "percentage_10": 80, "percentage_12": 70, "stream": "PCM"},
    "diploma": {"qualification": "diploma", "diploma_percentage": 65},
}


# ---------- valid inputs ----------

@pytest.mark.parametrize("qual", ["10th", "12th", "diploma"])
def test_valid_request_per_qualification(client, qual):
    r = client.post(URL, json=VALID[qual])
    assert r.status_code == 200
    data = r.json()
    assert data["count"] > 50
    assert len(data["results"]) <= 60
    assert "Eligibility only" in data["note"]


def test_result_shape(client):
    item = client.post(URL, json=VALID["12th"]).json()["results"][0]
    for key in ["slug", "name", "city", "state", "ownership", "website", "admission_url",
                "verification_status", "status", "reason", "courses"]:
        assert key in item


def test_optional_fields_are_accepted(client):
    body = {**VALID["diploma"], "diploma_branch": "Computer", "preferred_course": "B.Tech",
            "state": "Tamil Nadu"}
    assert client.post(URL, json=body).status_code == 200


# ---------- courses table empty => Insufficient data (no invented data) ----------

def test_no_course_data_gives_insufficient_data(client):
    results = client.post(URL, json=VALID["12th"]).json()["results"]
    assert all(r["status"] == INSUFFICIENT for r in results)
    assert all(r["courses"] == [] for r in results)
    assert all(r["reason"] == "No course data for this college yet." for r in results)


def test_preferred_course_without_data_still_insufficient(client):
    body = {**VALID["12th"], "preferred_course": "B.Tech"}
    results = client.post(URL, json=body).json()["results"]
    assert results and all(r["status"] == INSUFFICIENT for r in results)


# ---------- state filter ----------

def test_state_filter(client):
    data = client.post(URL, json={**VALID["10th"], "state": "Tamil Nadu"}).json()
    assert data["count"] > 0
    assert all(r["state"] == "Tamil Nadu" for r in data["results"])


def test_unknown_state_returns_empty(client):
    data = client.post(URL, json={**VALID["10th"], "state": "Narnia"}).json()
    assert data["count"] == 0 and data["results"] == []


# ---------- invalid inputs ----------

@pytest.mark.parametrize("body", [
    {"qualification": "10th"},                                              # percentage_10 missing
    {"qualification": "12th", "percentage_10": 80, "stream": "PCM"},        # percentage_12 missing
    {"qualification": "12th", "percentage_10": 80, "percentage_12": 70},    # stream missing
    {"qualification": "12th", "percentage_12": 70, "stream": "PCM"},        # percentage_10 missing
    {"qualification": "diploma"},                                           # diploma_percentage missing
    {"qualification": "diploma", "percentage_10": 80},                      # wrong field only
])
def test_missing_required_fields(client, body):
    assert client.post(URL, json=body).status_code == 422


@pytest.mark.parametrize("pct", [-1, 100.5, 101, 1000])
def test_percentage_out_of_range(client, pct):
    assert client.post(URL, json={"qualification": "10th", "percentage_10": pct}).status_code == 422


@pytest.mark.parametrize("field,value", [("qualification", "PhD"), ("stream", "Medical")])
def test_invalid_choice_values(client, field, value):
    body = {**VALID["12th"], field: value}
    assert client.post(URL, json=body).status_code == 422


def test_boundary_percentages_are_valid(client):
    for pct in (0, 100):
        assert client.post(URL, json={"qualification": "10th", "percentage_10": pct}).status_code == 200


def test_empty_body_and_wrong_method(client):
    assert client.post(URL, json={}).status_code == 422
    assert client.get(URL).status_code == 405
