"""Rule-based eligibility. Never guesses: no stated rule -> insufficient data."""
from __future__ import annotations

ELIGIBLE = "eligible"
NOT_ELIGIBLE = "not_eligible"
INSUFFICIENT = "insufficient_data"

# Which course levels each qualification can apply to.
LEVELS = {"10th": {"Diploma"}, "12th": {"UG"}, "diploma": {"Lateral"}}

# Diploma branches the Predictor offers. Lateral courses can list the branches they accept.
# "Other" means "a branch that is not in this list": we never guess for it.
DIPLOMA_BRANCHES = ("Computer", "Mechanical", "Civil", "Electrical", "Electronics", "Other")


def split_branches(value: str | None) -> list[str]:
    """'Computer|Electronics' -> ['Computer', 'Electronics']. Empty/None -> []."""
    if not value:
        return []
    return [p.strip() for p in value.split("|") if p.strip()]


def evaluate(course, qualification: str, percentage: float, stream: str | None, branch: str | None = None):
    """Return (status, reason) for one course. `course` needs level,
    stream_required, min_percentage attributes (allowed_branches is optional)."""
    if course.level not in LEVELS[qualification]:
        return NOT_ELIGIBLE, f"{course.level} course is not open to a {qualification} qualification."
    if qualification == "12th" and course.stream_required:
        if not stream:
            return INSUFFICIENT, "Stream not provided."
        if stream.lower() != course.stream_required.lower():
            return NOT_ELIGIBLE, f"Requires {course.stream_required} stream; you selected {stream}."

    allowed = split_branches(getattr(course, "allowed_branches", None))
    if qualification == "diploma" and allowed:
        listed = ", ".join(allowed)
        if not branch:
            return INSUFFICIENT, f"This course accepts only some diploma branches ({listed}). Your branch was not provided."
        if branch.lower() not in {b.lower() for b in allowed}:
            if branch.lower() == "other":
                return INSUFFICIENT, f"This course accepts only these diploma branches: {listed}. Your branch is not in our list, so check the college's official rules."
            return NOT_ELIGIBLE, f"Open only to {listed} diploma holders; you selected {branch}."

    if course.min_percentage is None:
        return INSUFFICIENT, "No officially stated minimum percentage in our data."
    if percentage < course.min_percentage:
        return NOT_ELIGIBLE, f"Minimum {course.min_percentage}% required; you entered {percentage}%."
    return ELIGIBLE, f"Meets the stated minimum of {course.min_percentage}%. This is eligibility, not an admission guarantee."
