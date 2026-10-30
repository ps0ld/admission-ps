"""POST /api/finder/recommend - eligibility only (no admission probability)."""
from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..db import get_db
from ..models import College
from ..services.eligibility import ELIGIBLE, INSUFFICIENT, NOT_ELIGIBLE, evaluate

router = APIRouter(prefix="/api/finder", tags=["finder"])
Pct = Field(None, ge=0, le=100)


class FinderRequest(BaseModel):
    qualification: Literal["10th", "12th", "diploma"]
    percentage_10: float | None = Pct
    percentage_12: float | None = Pct
    stream: Literal["PCM", "PCB", "Commerce", "Arts", "Other"] | None = None
    diploma_percentage: float | None = Pct
    diploma_branch: str | None = Field(None, max_length=80)
    preferred_course: str | None = Field(None, max_length=80)
    state: str | None = Field(None, max_length=80)

    @model_validator(mode="after")
    def _required_fields(self):
        need = {"10th": ["percentage_10"], "12th": ["percentage_10", "percentage_12", "stream"],
                "diploma": ["diploma_percentage"]}[self.qualification]
        missing = [f for f in need if getattr(self, f) is None]
        if missing:
            raise ValueError(f"Missing for {self.qualification}: {', '.join(missing)}")
        return self

    def score(self) -> float:
        return {"10th": self.percentage_10, "12th": self.percentage_12,
                "diploma": self.diploma_percentage}[self.qualification]


@router.post("/recommend")
def recommend(req: FinderRequest, db: Session = Depends(get_db)):
    stmt = select(College).options(selectinload(College.courses))
    if req.state:
        stmt = stmt.where(College.state == req.state)
    pref = (req.preferred_course or "").strip().lower()
    results = []
    for c in db.scalars(stmt).all():
        courses = [x for x in c.courses if not pref or pref in x.name.lower()]
        evals = []
        for x in courses:
            status, reason = evaluate(x, req.qualification, req.score(), req.stream)
            evals.append({"course": x.name, "level": x.level, "status": status, "reason": reason,
                          "admission_route": x.admission_route})
        if not evals:
            status, evals = INSUFFICIENT, []
            reason = "No course data for this college yet."
        else:
            order = [ELIGIBLE, INSUFFICIENT, NOT_ELIGIBLE]
            status = min((e["status"] for e in evals), key=order.index)
            reason = next(e["reason"] for e in evals if e["status"] == status)
        results.append({"slug": c.slug, "name": c.name, "city": c.city, "state": c.state,
                        "ownership": c.ownership, "website": c.website, "admission_url": c.admission_url,
                        "verification_status": c.verification_status, "status": status,
                        "reason": reason, "courses": evals})
    rank = {ELIGIBLE: 0, INSUFFICIENT: 1, NOT_ELIGIBLE: 2}
    results.sort(key=lambda r: (rank[r["status"]], r["name"]))
    return {"count": len(results), "results": results[:60],
            "note": "Eligibility only. Admission chances need cutoff data (Phase 3)."}
