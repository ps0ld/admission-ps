"""Application settings, read from environment variables (see .env.example)."""
from __future__ import annotations

import os
from dataclasses import dataclass, field


def _split(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    database_url: str = field(
        default_factory=lambda: os.getenv(
            "DATABASE_URL",
            "postgresql+psycopg://admission:admission@localhost:5432/admission_ps",
        )
    )
    cors_origins: list[str] = field(
        default_factory=lambda: _split(os.getenv("CORS_ORIGINS", "http://localhost:5173"))
    )
    admin_emails: list[str] = field(
        default_factory=lambda: _split(os.getenv("ADMIN_EMAILS", ""))
    )
    # A record older than this many days is reported as "stale" in data-freshness views.
    stale_after_days: int = 365


def get_settings() -> Settings:
    return Settings()
