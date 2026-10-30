"""Database schema for Admission PS.

Design rules that protect data quality:
  * Every college row carries a data source, a verification status and a
    last-verified date. Nothing is shown as "verified" unless an admin set it.
  * Fees, cutoffs and eligibility are nullable: missing data stays missing
    instead of being guessed.
  * (name, city, state) is unique so duplicate imports are rejected.
"""
from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ----------------------------------------------------------------------------
# Reference data
# ----------------------------------------------------------------------------
class DataSource(Base):
    __tablename__ = "data_sources"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), unique=True)
    url: Mapped[str | None] = mapped_column(String(500))
    kind: Mapped[str] = mapped_column(String(40), default="official")  # official | aggregate | manual
    notes: Mapped[str | None] = mapped_column(Text)


class College(Base):
    __tablename__ = "colleges"
    __table_args__ = (UniqueConstraint("name", "city", "state", name="uq_college_name_city_state"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(220), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(300), index=True)
    short_name: Mapped[str | None] = mapped_column(String(60))
    state: Mapped[str] = mapped_column(String(80), index=True)
    city: Mapped[str] = mapped_column(String(120), index=True)
    institution_type: Mapped[str] = mapped_column(String(60), index=True)
    ownership: Mapped[str] = mapped_column(String(40), index=True)  # Government | Private | Public-Private
    established_year: Mapped[int | None] = mapped_column(Integer)
    aishe_code: Mapped[str | None] = mapped_column(String(30))
    website: Mapped[str | None] = mapped_column(String(300))
    admission_url: Mapped[str | None] = mapped_column(String(500))
    entrance_exams: Mapped[list] = mapped_column(JSON, default=list)
    admission_routes: Mapped[list] = mapped_column(JSON, default=list)
    description: Mapped[str | None] = mapped_column(Text)

    verification_status: Mapped[str] = mapped_column(String(20), default="unverified", index=True)
    data_source_id: Mapped[int | None] = mapped_column(ForeignKey("data_sources.id"))
    last_verified_on: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    data_source: Mapped[DataSource | None] = relationship()
    courses: Mapped[list["Course"]] = relationship(back_populates="college", cascade="all, delete-orphan")


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(primary_key=True)
    college_id: Mapped[int] = mapped_column(ForeignKey("colleges.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(200))          # e.g. B.Tech Computer Science
    level: Mapped[str] = mapped_column(String(30))          # UG | PG | Diploma | Lateral
    stream_required: Mapped[str | None] = mapped_column(String(40))  # PCM | PCB | Commerce | Arts
    duration_years: Mapped[float | None] = mapped_column(Float)
    min_percentage: Mapped[float | None] = mapped_column(Float)      # eligibility cut, if officially stated
    eligibility_notes: Mapped[str | None] = mapped_column(Text)
    admission_route: Mapped[str | None] = mapped_column(String(120))
    annual_fees_inr: Mapped[int | None] = mapped_column(Integer)
    fees_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    data_source_id: Mapped[int | None] = mapped_column(ForeignKey("data_sources.id"))
    last_verified_on: Mapped[date | None] = mapped_column(Date)

    college: Mapped[College] = relationship(back_populates="courses")


class Cutoff(Base):
    """Historical opening/closing ranks (JoSAA, CSAB, state counselling...)."""

    __tablename__ = "cutoffs"

    id: Mapped[int] = mapped_column(primary_key=True)
    college_id: Mapped[int] = mapped_column(ForeignKey("colleges.id", ondelete="CASCADE"), index=True)
    exam: Mapped[str] = mapped_column(String(40), index=True)  # JEE Main | JEE Advanced | ...
    year: Mapped[int] = mapped_column(Integer, index=True)
    counselling_round: Mapped[int | None] = mapped_column(Integer)
    branch: Mapped[str] = mapped_column(String(200))
    quota: Mapped[str | None] = mapped_column(String(20))       # AI | HS | OS | GO | JK ...
    seat_type: Mapped[str] = mapped_column(String(20))          # OPEN | EWS | OBC-NCL | SC | ST
    gender_pool: Mapped[str | None] = mapped_column(String(40))
    opening_rank: Mapped[int | None] = mapped_column(Integer)
    closing_rank: Mapped[int | None] = mapped_column(Integer)
    data_source_id: Mapped[int | None] = mapped_column(ForeignKey("data_sources.id"))


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(300))
    body: Mapped[str | None] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(40))  # application | counselling | exam | announcement | deadline
    exam: Mapped[str | None] = mapped_column(String(60))
    event_date: Mapped[date | None] = mapped_column(Date)
    deadline: Mapped[date | None] = mapped_column(Date)
    source_name: Mapped[str] = mapped_column(String(200))
    source_url: Mapped[str] = mapped_column(String(500))
    verified_on: Mapped[date] = mapped_column(Date)


# ----------------------------------------------------------------------------
# Students (populated from Phase 4 onwards)
# ----------------------------------------------------------------------------
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    firebase_uid: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(320), index=True)
    name: Mapped[str | None] = mapped_column(String(200))
    photo_url: Mapped[str | None] = mapped_column(String(500))
    academic_profile: Mapped[dict] = mapped_column(JSON, default=dict)
    preferences: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class SavedCollege(Base):
    __tablename__ = "saved_colleges"
    __table_args__ = (UniqueConstraint("user_id", "college_id", name="uq_saved_college"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    college_id: Mapped[int] = mapped_column(ForeignKey("colleges.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class SavedPrediction(Base):
    __tablename__ = "saved_predictions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(40))  # finder | jee_main | jee_advanced | lateral
    inputs: Mapped[dict] = mapped_column(JSON)
    results: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class SavedComparison(Base):
    __tablename__ = "saved_comparisons"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    college_ids: Mapped[list] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200), default="New chat")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    messages: Mapped[list["ChatMessage"]] = relationship(
        back_populates="session", cascade="all, delete-orphan", order_by="ChatMessage.id"
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("chat_sessions.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(20))  # user | assistant
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    session: Mapped[ChatSession] = relationship(back_populates="messages")
