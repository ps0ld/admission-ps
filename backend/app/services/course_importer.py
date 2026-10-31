"""Course dataset importer (Phase 2).

Reads a CSV (or DataFrame) of course eligibility rules, validates every row,
rejects bad rows with a reason, and upserts the rest. Nothing is guessed:
an empty min_percentage stays empty, so the finder shows "Insufficient data".

Every row must name its official source, source URL and the date it was
checked, so course data is never entered without a trail.

Expected columns (header names are case-insensitive, spaces = underscores):
  required : college_name, city, state, course_name, level, source_name,
             source_url, last_verified_on (YYYY-MM-DD)
  optional : stream_required, allowed_branches, min_percentage (0-100),
             eligibility_notes, admission_route

allowed_branches is for Lateral courses only: diploma branches the course
accepts, separated by | (for example Computer|Electronics). Allowed values:
Computer, Mechanical, Civil, Electrical, Electronics, Other. Leave it empty
when the college states no branch rule.

The college must already exist (matched on college_name + city + state).
Unknown colleges are rejected, never created.
"""
from __future__ import annotations

from datetime import date
from pathlib import Path

import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import College, Course, DataSource
from .eligibility import DIPLOMA_BRANCHES
from .importer import ImportReport, _clean, _valid_url

REQUIRED = [
    "college_name", "city", "state", "course_name", "level",
    "source_name", "source_url", "last_verified_on",
]
LEVELS = {"UG", "PG", "Diploma", "Lateral"}
STREAMS = {"PCM", "PCB", "Commerce", "Arts", "Other"}


def import_courses_dataframe(db: Session, df: pd.DataFrame, commit: bool = True) -> ImportReport:
    """commit=False validates everything and then rolls back (dry run)."""
    report = ImportReport()
    df = df.copy()
    df.columns = [str(c).strip().lower().replace(" ", "_") for c in df.columns]
    missing_cols = [c for c in REQUIRED if c not in df.columns]
    if missing_cols:
        raise ValueError(f"CSV is missing required columns: {', '.join(missing_cols)}")

    colleges = {
        (c.name.lower(), c.city.lower(), c.state.lower()): c
        for c in db.scalars(select(College)).all()
    }
    branch_names = {b.lower(): b for b in DIPLOMA_BRANCHES}
    seen: set[tuple[int, str, str]] = set()
    sources: dict[str, DataSource] = {}

    for idx, row in df.iterrows():
        line = int(idx) + 2  # header is line 1

        values = {col: _clean(row.get(col)) for col in REQUIRED}
        missing = [col for col, v in values.items() if not v]
        if missing:
            report.rejected.append((line, f"missing required value: {', '.join(missing)}"))
            continue

        level = values["level"]
        if level not in LEVELS:
            report.rejected.append((line, f"unknown level '{level}' (use UG, PG, Diploma or Lateral)"))
            continue

        stream = _clean(row.get("stream_required"))
        if stream and stream not in STREAMS:
            report.rejected.append((line, f"unknown stream_required '{stream}'"))
            continue

        allowed_branches = None
        branches_text = _clean(row.get("allowed_branches"))
        if branches_text:
            if level != "Lateral":
                report.rejected.append((line, "allowed_branches applies only to Lateral courses"))
                continue
            parts = [p.strip() for p in branches_text.split("|") if p.strip()]
            unknown = [p for p in parts if p.lower() not in branch_names]
            if unknown:
                report.rejected.append(
                    (line, f"unknown branch {', '.join(unknown)} (use {', '.join(DIPLOMA_BRANCHES)})")
                )
                continue
            allowed_branches = "|".join(dict.fromkeys(branch_names[p.lower()] for p in parts)) or None

        min_pct = None
        pct_text = _clean(row.get("min_percentage"))
        if pct_text:
            try:
                min_pct = float(pct_text)
            except ValueError:
                report.rejected.append((line, f"min_percentage '{pct_text}' is not a number"))
                continue
            if not 0 <= min_pct <= 100:
                report.rejected.append((line, "min_percentage must be between 0 and 100"))
                continue

        if not _valid_url(values["source_url"]):
            report.rejected.append((line, "source_url must be a full http(s) URL"))
            continue

        try:
            verified_on = date.fromisoformat(values["last_verified_on"])
        except ValueError:
            report.rejected.append((line, "last_verified_on must be YYYY-MM-DD"))
            continue
        if verified_on > date.today():
            report.rejected.append((line, "last_verified_on cannot be in the future"))
            continue

        course_name = values["course_name"]
        route = _clean(row.get("admission_route"))
        if len(course_name) > 200 or (route and len(route) > 120):
            report.rejected.append((line, "course_name (max 200) or admission_route (max 120) too long"))
            continue

        college = colleges.get(
            (values["college_name"].lower(), values["city"].lower(), values["state"].lower())
        )
        if college is None:
            report.rejected.append(
                (line, f"unknown college '{values['college_name']}, {values['city']}, {values['state']}'")
            )
            continue

        key = (college.id, course_name.lower(), level)
        if key in seen:
            report.duplicates.append((line, f"{college.name}: {course_name} ({level})"))
            continue
        seen.add(key)

        source_name = values["source_name"]
        source = sources.get(source_name) or db.scalar(
            select(DataSource).where(DataSource.name == source_name)
        )
        if source is None:
            source = DataSource(name=source_name, url=values["source_url"], kind="manual")
            db.add(source)
            db.flush()
        sources[source_name] = source

        fields = dict(
            name=course_name,
            level=level,
            stream_required=stream,
            allowed_branches=allowed_branches,
            min_percentage=min_pct,
            eligibility_notes=_clean(row.get("eligibility_notes")),
            admission_route=route,
            data_source_id=source.id,
            last_verified_on=verified_on,
        )
        existing = db.scalar(
            select(Course).where(
                Course.college_id == college.id, Course.name == course_name, Course.level == level
            )
        )
        if existing:
            for k, v in fields.items():
                setattr(existing, k, v)
            report.updated += 1
        else:
            db.add(Course(college_id=college.id, **fields))
            report.created += 1

    if commit:
        db.commit()
    else:
        db.rollback()
    return report


def import_courses_csv(db: Session, path: str | Path, commit: bool = True) -> ImportReport:
    return import_courses_dataframe(db, pd.read_csv(path, dtype=str, keep_default_na=False), commit=commit)
