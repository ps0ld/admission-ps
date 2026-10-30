def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_list_and_pagination(client):
    data = client.get("/api/colleges", params={"page_size": 10}).json()
    assert data["total"] > 50
    assert len(data["items"]) == 10
    page2 = client.get("/api/colleges", params={"page_size": 10, "page": 2}).json()
    assert {c["slug"] for c in data["items"]}.isdisjoint({c["slug"] for c in page2["items"]})


def test_page_size_is_capped(client):
    assert client.get("/api/colleges", params={"page_size": 500}).status_code == 422


def test_search_by_name_and_city(client):
    by_name = client.get("/api/colleges", params={"q": "Madras"}).json()
    assert any(c["short_name"] == "IIT Madras" for c in by_name["items"])
    by_city = client.get("/api/colleges", params={"q": "Pilani"}).json()
    assert any("Pilani" in c["name"] for c in by_city["items"])


def test_filters(client):
    iits = client.get("/api/colleges", params={"institution_type": "IIT", "page_size": 60}).json()
    assert iits["total"] == 23
    assert all(c["institution_type"] == "IIT" for c in iits["items"])

    private = client.get("/api/colleges", params={"ownership": "Private", "page_size": 60}).json()
    assert private["total"] > 0 and all(c["ownership"] == "Private" for c in private["items"])

    cuet = client.get("/api/colleges", params={"exam": "CUET UG"}).json()
    assert cuet["total"] > 0 and all("CUET UG" in c["entrance_exams"] for c in cuet["items"])


def test_wildcards_are_matched_literally(client):
    assert client.get("/api/colleges", params={"q": "%"}).json()["total"] == 0
    assert client.get("/api/colleges", params={"q": "_"}).json()["total"] == 0


def test_verified_only_returns_nothing_for_starter_data(client):
    assert client.get("/api/colleges", params={"verified_only": True}).json()["total"] == 0


def test_facets(client):
    facets = client.get("/api/colleges/facets").json()
    assert any(f["value"] == "Tamil Nadu" for f in facets["states"])
    assert {"IIT", "NIT"} <= {f["value"] for f in facets["institution_types"]}
    assert any(f["value"] == "JEE Main" for f in facets["exams"])


def test_detail_and_404(client):
    slug = client.get("/api/colleges", params={"q": "IIT Bombay"}).json()["items"][0]["slug"]
    detail = client.get(f"/api/colleges/{slug}")
    assert detail.status_code == 200
    body = detail.json()
    assert body["verification_status"] == "unverified"
    assert body["data_source"]["name"].startswith("Admission PS starter list")
    assert client.get("/api/colleges/does-not-exist").status_code == 404


def test_coverage_reports_gaps_honestly(client):
    cov = client.get("/api/coverage").json()
    by_type = {r["institution_type"]: r for r in cov["rows"]}
    assert by_type["Polytechnic"]["status"] == "missing"
    assert by_type["IIT"]["status"] == "unverified"
    assert cov["verified_colleges"] == 0
    assert "not yet a complete" in cov["note"]


def test_security_headers(client):
    headers = client.get("/api/health").headers
    assert headers["x-content-type-options"] == "nosniff"
    assert headers["x-frame-options"] == "DENY"
