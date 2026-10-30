"""Public college directory endpoints."""
from __future__ import annotations

from collections import Counter

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.orm import Session, selectinload

from ..db import get_db
from ..models import College
from ..schemas import CollegeDetail, CollegePage, Coverage, Facets, FacetValue
from ..services.coverage import build_coverage

router = APIRouter(prefix="/api", tags=["colleges"])

SORTS = {
    "name": College.name.asc(),
    "state": College.state.asc(),
    "newest": College.updated_at.desc(),
}


def _like(text: str) -> str:
    """Escape LIKE wildcards so user input is always matched literally."""
    return "%" + text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"


@router.get("/colleges", response_model=CollegePage)
def list_colleges(
    q: str | None = Query(None, max_length=100),
    state: str | None = Query(None, max_length=80),
    institution_type: str | None = Query(None, max_length=60),
    ownership: str | None = Query(None, max_length=40),
    exam: str | None = Query(None, max_length=40),
    verified_only: bool = False,
    sort: str = Query("name", pattern="^(name|state|newest)$"),
    page: int = Query(1, ge=1, le=10_000),
    page_size: int = Query(12, ge=1, le=60),
    db: Session = Depends(get_db),
):
    stmt = select(College)
    if q and q.strip():
        pattern = _like(q.strip())
        stmt = stmt.where(
            or_(
                College.name.ilike(pattern, escape="\\"),
                College.short_name.ilike(pattern, escape="\\"),
                College.city.ilike(pattern, escape="\\"),
                College.state.ilike(pattern, escape="\\"),
            )
        )
    if state:
        stmt = stmt.where(College.state == state)
    if institution_type:
        stmt = stmt.where(College.institution_type == institution_type)
    if ownership:
        stmt = stmt.where(College.ownership == ownership)
    if exam:
        stmt = stmt.where(cast(College.entrance_exams, String).ilike(_like(f'"{exam}"'), escape="\\"))
    if verified_only:
        stmt = stmt.where(College.verification_status == "verified")

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    items = db.scalars(
        stmt.order_by(SORTS[sort], College.id).offset((page - 1) * page_size).limit(page_size)
    ).all()
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/colleges/facets", response_model=Facets)
def facets(db: Session = Depends(get_db)):
    def counts(column) -> list[FacetValue]:
        rows = db.execute(select(column, func.count(College.id)).group_by(column).order_by(column)).all()
        return [FacetValue(value=v, count=c) for v, c in rows if v]

    exam_counter: Counter[str] = Counter()
    for (exams,) in db.execute(select(College.entrance_exams)):
        exam_counter.update(exams or [])
    exams = [FacetValue(value=k, count=v) for k, v in sorted(exam_counter.items())]

    return Facets(
        states=counts(College.state),
        institution_types=counts(College.institution_type),
        ownerships=counts(College.ownership),
        exams=exams,
    )


@router.get("/colleges/{slug}", response_model=CollegeDetail)
def get_college(slug: str, db: Session = Depends(get_db)):
    college = db.scalar(
        select(College)
        .where(College.slug == slug)
        .options(selectinload(College.courses), selectinload(College.data_source))
    )
    if college is None:
        raise HTTPException(status_code=404, detail="College not found")
    return college


@router.get("/coverage", response_model=Coverage)
def coverage(db: Session = Depends(get_db)):
    return build_coverage(db)
