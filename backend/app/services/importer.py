"""College dataset importer.

Reads a CSV (or DataFrame), validates every row, rejects duplicates and bad
rows with a reason, and upserts the rest. Nothing is guessed: empty cells stay
empty. Rows are only marked "verified" when the CSV says so *and* supplies a
last_verified_on date.

Expected columns (header names are case-insensitive):
  required : name, state, city, institution_type, ownership
  optional : short_name, website, admission_url, established_year, aishe_code,
             entrance_exams (| separated), admission_routes (| separated),
             description, data_source, data_source_url,
             verification_status, last_verified_on (YYYY-MM-DD)
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import College, DataSource
from .slug import slugify

REQUIRED = ["name", "state", "city", "institution_type", "ownership"]
OWNERSHIPS = {"Government", "Private", "Public-Private"}
INSTITUTION_TYPES = {
    "IIT", "NIT", "IIIT", "IISc", "IISER", "Central University", "State University",
    "Government College", "Private University", "Deemed University", "Engineering College",
    "Polytechnic", "Diploma College", "Autonomous College", "Affiliated College",
    "Science College", "Commerce College", "Arts College", "Management Institute",
    "Computer Application Institute", "Other",
}


@dataclass
class ImportReport:
    created: int = 0
    updated: int = 0
    rejected: list[tuple[int, str]] = field(default_factory=list)   # (csv row number, reason)
    duplicates: list[tuple[int, str]] = field(default_factory=list)

    def summary(self) -> str:
        return (
            f"created={self.created} updated={self.updated} "
            f"rejected={len(self.rejected)} duplicates={len(self.duplicates)}"
        )


def _clean(value) -> str | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    text = str(value).strip()
    return text or None


def _split_list(value) -> list[str]:
    text = _clean(value)
    return [p.strip() for p in text.split("|") if p.strip()] if text else []


def _valid_url(url: str | None) -> bool:
    if not url:
        return True
    parsed = urlparse(url)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def _parse_date(value) -> date | None:
    text = _clean(value)
    if not text:
        return None
    return date.fromisoformat(text)


def import_dataframe(db: Session, df: pd.DataFrame) -> ImportReport:
    report = ImportReport()
    df = df.copy()
    df.columns = [str(c).strip().lower() for c in df.columns]
    missing = [c for c in REQUIRED if c not in df.columns]
    if missing:
        raise ValueError(f"CSV is missing required columns: {', '.join(missing)}")

    seen: set[tuple[str, str, str]] = set()
    sources: dict[str, DataSource] = {}

    for idx, row in df.iterrows():
        line = int(idx) + 2  # header is line 1
        name, state, city = _clean(row["name"]), _clean(row["state"]), _clean(row["city"])
        itype, ownership = _clean(row["institution_type"]), _clean(row["ownership"])

        if not all([name, state, city, itype, ownership]):
            report.rejected.append((line, "missing a required value"))
            continue
        if itype not in INSTITUTION_TYPES:
            report.rejected.append((line, f"unknown institution_type '{itype}'"))
            continue
        if ownership not in OWNERSHIPS:
            report.rejected.append((line, f"unknown ownership '{ownership}'"))
            continue

        website = _clean(row.get("website"))
        admission_url = _clean(row.get("admission_url"))
        if not _valid_url(website) or not _valid_url(admission_url):
            report.rejected.append((line, "website/admission_url must be a full http(s) URL"))
            continue

        try:
            verified_on = _parse_date(row.get("last_verified_on"))
        except ValueError:
            report.rejected.append((line, "last_verified_on must be YYYY-MM-DD"))
            continue

        status = (_clean(row.get("verification_status")) or "unverified").lower()
        if status not in {"unverified", "verified"}:
            report.rejected.append((line, f"unknown verification_status '{status}'"))
            continue
        if status == "verified" and verified_on is None:
            report.rejected.append((line, "verified rows need a last_verified_on date"))
            continue

        key = (name.lower(), city.lower(), state.lower())
        if key in seen:
            report.duplicates.append((line, f"{name}, {city}, {state}"))
            continue
        seen.add(key)

        source_name = _clean(row.get("data_source"))
        source = None
        if source_name:
            source = sources.get(source_name) or db.scalar(
                select(DataSource).where(DataSource.name == source_name)
            )
            if source is None:
                source = DataSource(name=source_name, url=_clean(row.get("data_source_url")), kind="manual")
                db.add(source)
                db.flush()
            sources[source_name] = source

        year = _clean(row.get("established_year"))
        values = dict(
            slug=slugify(name, city),
            name=name,
            short_name=_clean(row.get("short_name")),
            state=state,
            city=city,
            institution_type=itype,
            ownership=ownership,
            established_year=int(float(year)) if year else None,
            aishe_code=_clean(row.get("aishe_code")),
            website=website,
            admission_url=admission_url,
            entrance_exams=_split_list(row.get("entrance_exams")),
            admission_routes=_split_list(row.get("admission_routes")),
            description=_clean(row.get("description")),
            verification_status=status,
            last_verified_on=verified_on,
            data_source_id=source.id if source else None,
        )

        existing = db.scalar(
            select(College).where(College.name == name, College.city == city, College.state == state)
        )
        if existing:
            for k, v in values.items():
                setattr(existing, k, v)
            report.updated += 1
        else:
            db.add(College(**values))
            report.created += 1

    db.commit()
    return report


def import_csv(db: Session, path: str | Path) -> ImportReport:
    return import_dataframe(db, pd.read_csv(path, dtype=str, keep_default_na=False))
