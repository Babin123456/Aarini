"""
Prediction feedback and adaptive learning for cycle predictions.

Computes prediction errors when new cycles are logged, detects systematic
bias, and provides correction factors to improve future predictions.
"""

from datetime import date, timedelta
from cycle_prediction import parse_date, normalize_cycles, predict_cycle


def compute_prediction_errors(cycles):
    """
    For each cycle after the 2nd, compute what the prediction WOULD have been
    using only prior history, and compare to the actual start date.

    Returns a list of { cycleIndex, predicted, actual, errorDays } dicts.
    """
    normalized = normalize_cycles(cycles)
    if len(normalized) < 3:
        return []

    errors = []
    for i in range(2, len(normalized)):
        history_so_far = [
            {"startDate": c["start"].isoformat(), "endDate": c["end"].isoformat() if c["end"] else None}
            for c in normalized[:i]
        ]
        day_before_actual = normalized[i]["start"] - timedelta(days=1)
        prediction = predict_cycle(history_so_far, today=day_before_actual)

        if not prediction.get("hasHistory") or not prediction.get("nextPeriodStart"):
            continue

        predicted_start = parse_date(prediction["nextPeriodStart"])
        actual_start = normalized[i]["start"]
        error_days = (actual_start - predicted_start).days

        errors.append({
            "cycleIndex": i,
            "predicted": predicted_start.isoformat(),
            "actual": actual_start.isoformat(),
            "errorDays": error_days,
            "accurate": abs(error_days) <= 2,
        })

    return errors


def compute_bias(errors, min_samples=3):
    """
    Detect systematic prediction bias from error history.

    Returns the mean signed error (positive = predictions are too early,
    negative = too late). Only computed with min_samples errors.
    """
    if len(errors) < min_samples:
        return None

    recent = errors[-6:]
    mean_error = sum(e["errorDays"] for e in recent) / len(recent)
    return round(mean_error, 1)


def get_adaptive_correction(cycles, min_samples=3):
    """
    Compute the correction factor to apply to predictions.

    If predictions are consistently early by 2 days (bias = +2),
    the correction shifts the prediction forward by 2 days.

    Returns { bias, correction, accuracy, sampleSize } or None if
    insufficient data.
    """
    errors = compute_prediction_errors(cycles)
    if len(errors) < min_samples:
        return None

    bias = compute_bias(errors, min_samples)
    if bias is None:
        return None

    correction = round(bias) if abs(bias) >= 1.0 else 0
    accurate_count = sum(1 for e in errors if e["accurate"])
    accuracy = round((accurate_count / len(errors)) * 100)

    return {
        "bias": bias,
        "correctionDays": correction,
        "accuracy": accuracy,
        "sampleSize": len(errors),
        "errors": errors[-5:],
    }


def get_prediction_feedback(cycles):
    """
    Full feedback response for the /prediction-feedback endpoint.
    """
    errors = compute_prediction_errors(cycles)
    correction = get_adaptive_correction(cycles)

    if not errors:
        return {
            "hasEnoughData": False,
            "message": "Log at least 3 cycles to start tracking prediction accuracy.",
        }

    accurate_count = sum(1 for e in errors if e["accurate"])
    accuracy = round((accurate_count / len(errors)) * 100)

    result = {
        "hasEnoughData": True,
        "accuracy": accuracy,
        "totalPredictions": len(errors),
        "accurateCount": accurate_count,
        "recentErrors": errors[-5:],
    }

    if correction:
        result["adaptiveCorrection"] = correction

    return result
