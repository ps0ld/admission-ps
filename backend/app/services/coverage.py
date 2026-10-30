"""Honest coverage report: what the database does and does not contain yet."""
from __future__ import annotations

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from ..models import College
from .importer import INSTITUTION_TYPES

# Categories the platform is meant to cover. "Other" is excluded from the report.
TARGET_TYPES = [t for t in sorted(INSTITUTION_TYPES) if t != "Other"]

NOTE = (
    "Counts reflect only the records imported so far. Admission PS is not yet a complete "
    "national directory: categories marked 'missing' have no data, and 'unverified' records "
    "come from a starter list that still needs confirmation against official sources."
)


def build_coverage(db: Session) -> dict:
    rows = db.execute(
        select(
            College.institution_type,
            func.count(College.id),
            func.sum(case((College.verification_status == "verified", 1), else_=0)),
        ).group_by(College.institution_type)
    ).all()
    by_type = {t: (int(c), int(v or 0)) for t, c, v in rows}

    report_rows = []
    for t in TARGET_TYPES:
        count, verified = by_type.get(t, (0, 0))
        status = "missing" if count == 0 else ("partial" if verified else "unverified")
        report_rows.append({"institution_type": t, "count": count, "verified": verified, "status": status})

    total = sum(c for c, _ in by_type.values())
    verified_total = sum(v for _, v in by_type.values())
    states = db.scalar(select(func.count(func.distinct(College.state)))) or 0
    return {
        "total_colleges": total,
        "verified_colleges": verified_total,
        "states_covered": int(states),
        "rows": report_rows,
        "note": NOTE,
    }
