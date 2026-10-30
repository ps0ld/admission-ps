"""Rule-based eligibility. Never guesses: no stated rule -> insufficient data."""
from __future__ import annotations

ELIGIBLE = "eligible"
NOT_ELIGIBLE = "not_eligible"
INSUFFICIENT = "insufficient_data"

# Which course levels each qualification can apply to.
LEVELS = {"10th": {"Diploma"}, "12th": {"UG"}, "diploma": {"Lateral"}}


def evaluate(course, qualification: str, percentage: float, stream: str | None):
    """Return (status, reason) for one course. `course` needs level,
    stream_required, min_percentage attributes."""
    if course.level not in LEVELS[qualification]:
        return NOT_ELIGIBLE, f"{course.level} course is not open to a {qualification} qualification."
    if qualification == "12th" and course.stream_required:
        if not stream:
            return INSUFFICIENT, "Stream not provided."
        if stream.lower() != course.stream_required.lower():
            return NOT_ELIGIBLE, f"Requires {course.stream_required} stream; you selected {stream}."
    if course.min_percentage is None:
        return INSUFFICIENT, "No officially stated minimum percentage in our data."
    if percentage < course.min_percentage:
        return NOT_ELIGIBLE, f"Minimum {course.min_percentage}% required; you entered {percentage}%."
    return ELIGIBLE, f"Meets the stated minimum of {course.min_percentage}%. This is eligibility, not an admission guarantee."
