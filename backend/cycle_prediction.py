from datetime import date, datetime, timedelta
from statistics import median


DEFAULT_CYCLE_LENGTH = 28
DEFAULT_PERIOD_LENGTH = 5
MIN_CYCLE_LENGTH = 15
MAX_CYCLE_LENGTH = 60
MIN_PERIOD_LENGTH = 1
MAX_PERIOD_LENGTH = 14


def parse_date(value):
    if isinstance(value, date):
        return value
    if not isinstance(value, str):
        raise ValueError("Date must use YYYY-MM-DD format")
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError as exc:
        raise ValueError("Date must use YYYY-MM-DD format") from exc


def _clamp(value, lower, upper):
    return max(lower, min(upper, value))


def normalize_cycles(cycles):
    normalized = []
    for cycle in cycles:
        try:
            start = parse_date(cycle.get("startDate"))
            end = parse_date(cycle.get("endDate")) if cycle.get("endDate") else None
        except (TypeError, ValueError):
            continue
        if end and end < start:
            continue
        normalized.append({"start": start, "end": end})
    return sorted(normalized, key=lambda cycle: cycle["start"])


def _weighted_average(values):
    if not values:
        return None
    recent = values[-6:]
    weights = list(range(1, len(recent) + 1))
    return round(sum(value * weight for value, weight in zip(recent, weights)) / sum(weights))


def predict_cycle(cycles, today=None, fallback_cycle_length=DEFAULT_CYCLE_LENGTH):
    today = parse_date(today or date.today())
    normalized = normalize_cycles(cycles)
    fallback = _clamp(int(fallback_cycle_length or DEFAULT_CYCLE_LENGTH), MIN_CYCLE_LENGTH, MAX_CYCLE_LENGTH)

    if not normalized:
        return {
            "hasHistory": False,
            "averageCycleLength": fallback,
            "averagePeriodLength": DEFAULT_PERIOD_LENGTH,
            "currentPhase": None,
            "cycleDay": None,
            "nextPeriodStart": None,
            "nextPeriodEnd": None,
            "ovulationDate": None,
            "ovulationWindowStart": None,
            "ovulationWindowEnd": None,
            "confidence": "low",
        }

    intervals = [
        (normalized[index]["start"] - normalized[index - 1]["start"]).days
        for index in range(1, len(normalized))
    ]
    valid_intervals = [
        value for value in intervals if MIN_CYCLE_LENGTH <= value <= MAX_CYCLE_LENGTH
    ]
    average_cycle = _weighted_average(valid_intervals) or fallback

    period_lengths = [
        (cycle["end"] - cycle["start"]).days + 1
        for cycle in normalized
        if cycle["end"]
    ]
    valid_period_lengths = [
        value for value in period_lengths if MIN_PERIOD_LENGTH <= value <= MAX_PERIOD_LENGTH
    ]
    average_period = round(median(valid_period_lengths)) if valid_period_lengths else DEFAULT_PERIOD_LENGTH

    latest_start = normalized[-1]["start"]
    next_period = latest_start + timedelta(days=average_cycle)
    while next_period <= today:
        next_period += timedelta(days=average_cycle)

    active_cycle_start = next_period - timedelta(days=average_cycle)
    cycle_day = (today - active_cycle_start).days + 1
    ovulation_day_number = max(average_period + 2, average_cycle - 14)
    ovulation_date = active_cycle_start + timedelta(days=ovulation_day_number - 1)
    window_start = ovulation_date - timedelta(days=5)
    window_end = ovulation_date + timedelta(days=1)

    if cycle_day <= average_period:
        current_phase = "Menstrual"
    elif today < window_start:
        current_phase = "Follicular"
    elif today <= window_end:
        current_phase = "Ovulation"
    else:
        current_phase = "Luteal"

    confidence = "high" if len(valid_intervals) >= 3 else "medium" if valid_intervals else "low"

    return {
        "hasHistory": True,
        "averageCycleLength": average_cycle,
        "averagePeriodLength": average_period,
        "currentPhase": current_phase,
        "cycleDay": cycle_day,
        "currentCycleStart": active_cycle_start.isoformat(),
        "nextPeriodStart": next_period.isoformat(),
        "nextPeriodEnd": (next_period + timedelta(days=average_period - 1)).isoformat(),
        "ovulationDate": ovulation_date.isoformat(),
        "ovulationWindowStart": window_start.isoformat(),
        "ovulationWindowEnd": window_end.isoformat(),
        "confidence": confidence,
    }
