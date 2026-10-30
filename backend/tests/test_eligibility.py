from types import SimpleNamespace as C

from app.services.eligibility import ELIGIBLE, INSUFFICIENT, NOT_ELIGIBLE, evaluate


def course(**kw):
    return C(**{"level": "UG", "stream_required": "PCM", "min_percentage": 75.0, **kw})


def test_eligible():
    assert evaluate(course(), "12th", 80, "PCM")[0] == ELIGIBLE


def test_below_minimum():
    assert evaluate(course(), "12th", 60, "PCM")[0] == NOT_ELIGIBLE


def test_wrong_stream():
    assert evaluate(course(), "12th", 90, "Arts")[0] == NOT_ELIGIBLE


def test_no_rule_is_insufficient():
    assert evaluate(course(min_percentage=None), "12th", 99, "PCM")[0] == INSUFFICIENT


def test_diploma_needs_lateral():
    assert evaluate(course(), "diploma", 80, None)[0] == NOT_ELIGIBLE
    assert evaluate(course(level="Lateral", stream_required=None), "diploma", 80, None)[0] == ELIGIBLE
