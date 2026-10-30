"""Pydantic response/request models."""
from __future__ import annotations

from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class DataSourceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    name: str
    url: str | None = None
    kind: str


class CourseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    level: str
    stream_required: str | None = None
    duration_years: float | None = None
    min_percentage: float | None = None
    eligibility_notes: str | None = None
    admission_route: str | None = None
    annual_fees_inr: int | None = None
    fees_verified: bool = False


class CollegeSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    slug: str
    name: str
    short_name: str | None = None
    state: str
    city: str
    institution_type: str
    ownership: str
    website: str | None = None
    admission_url: str | None = None
    entrance_exams: list[str] = Field(default_factory=list)
    admission_routes: list[str] = Field(default_factory=list)
    verification_status: str
    last_verified_on: date | None = None


class CollegeDetail(CollegeSummary):
    established_year: int | None = None
    aishe_code: str | None = None
    description: str | None = None
    data_source: DataSourceOut | None = None
    courses: list[CourseOut] = Field(default_factory=list)


class CollegePage(BaseModel):
    items: list[CollegeSummary]
    total: int
    page: int
    page_size: int


class FacetValue(BaseModel):
    value: str
    count: int


class Facets(BaseModel):
    states: list[FacetValue]
    institution_types: list[FacetValue]
    ownerships: list[FacetValue]
    exams: list[FacetValue]


class CoverageRow(BaseModel):
    institution_type: str
    count: int
    verified: int
    status: str  # "missing" (no records) | "unverified" (records, none verified) | "partial" (some verified)


class Coverage(BaseModel):
    total_colleges: int
    verified_colleges: int
    states_covered: int
    rows: list[CoverageRow]
    note: str
