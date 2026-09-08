"""
Connect360 - Priority Booking Matching Service

Isolated, configurable, server-side worker-matching engine for Priority Booking
(Feature 3). Manual Booking does NOT use this module.

DESIGN GOALS:
  - Deterministic weighted scoring (NO external AI model for basic matching).
  - Fully configurable weights via MATCHING_WEIGHTS (single source of truth) so
    scoring can be tuned later without touching call sites.
  - Pure/near-pure functions that are easy to unit test without AWS: the DB
    lookup is injected via a `data_provider` object so tests can stub it.
  - Never trusts frontend data. Callers pass authorization-checked inputs only.

SCORING (weights sum to 1.0):
    availability   0.30
    service_match  0.20
    distance       0.20
    rating         0.15
    experience     0.10
    budget         0.05

Every component score is normalized to 0.0 - 1.0 before weighting, so the final
score is also 0.0 - 1.0. Callers multiply by 100 for a human-friendly percentage.
"""

from datetime import datetime

# =============================================================================
# Configuration - single source of truth for weights & tunables.
# Change here to re-tune matching; nothing else needs editing.
# =============================================================================
MATCHING_WEIGHTS = {
    "availability": 0.30,
    "service": 0.20,
    "distance": 0.20,
    "rating": 0.15,
    "experience": 0.10,
    "budget": 0.05,
}

# Tunables (kept out of business logic / not hard-coded at call sites)
EXPERIENCE_CAP_YEARS = 10       # experience normalized against this cap
MAX_RATING = 5.0                # rating scale
DISTANCE_FULL_SCORE_KM = 2.0    # <= this distance scores 1.0
DISTANCE_ZERO_SCORE_KM = 25.0   # >= this distance scores 0.0
NEUTRAL_SCORE = 0.5             # used when a signal is unavailable

# Day-of-week name -> int (matches worker AVAIL day_of_week: 0=Sunday..6=Saturday)
_WEEKDAY_TO_DOW = {
    "sunday": 0, "monday": 1, "tuesday": 2, "wednesday": 3,
    "thursday": 4, "friday": 5, "saturday": 6,
}


def _clamp01(x):
    """Clamp a value into the 0.0 - 1.0 range."""
    if x is None:
        return 0.0
    if x < 0.0:
        return 0.0
    if x > 1.0:
        return 1.0
    return float(x)


# =============================================================================
# Component score calculators (each returns a normalized 0.0 - 1.0 value)
# =============================================================================

def calculate_availability_score(worker, request):
    """
    Availability score based on:
      - worker.is_available flag (must be generally available)
      - whether the worker's weekly schedule covers the requested day/time window

    If no schedule data exists, fall back to the is_available flag alone.
    """
    if not worker.get("is_available", False):
        return 0.0

    availability = worker.get("availability") or []
    if not availability:
        # Generally available but no detailed schedule -> partial confidence
        return 0.7

    dow = _requested_day_of_week(request)
    req_time = (request.get("scheduled_time") or "").strip()

    # Slots for the requested day that are marked available
    day_slots = [
        s for s in availability
        if int(s.get("day_of_week", -1)) == dow and s.get("is_available", True)
    ]
    if not day_slots:
        return 0.0

    if not req_time:
        # Day is covered, no specific time requested -> strong but not perfect
        return 0.85

    # Specific time requested: does any slot's [start,end) cover it?
    for s in day_slots:
        if _time_in_slot(req_time, s.get("start_time"), s.get("end_time")):
            return 1.0
    # Day works but the exact time window doesn't -> weak
    return 0.3


def calculate_service_score(worker, request):
    """
    Service match: does the worker offer the requested service?
      1.0  -> worker explicitly offers this service (by id or name)
      0.0  -> worker does not offer it
    Eligibility filtering already narrows candidates, but this keeps scoring
    self-contained and testable.
    """
    service_id = request.get("service_id")
    service_name = (request.get("service_name") or "").strip().lower()

    offered_ids = {str(s) for s in (worker.get("service_ids") or [])}
    offered_names = {str(n).strip().lower() for n in (worker.get("service_names") or [])}

    if service_id is not None and str(service_id) in offered_ids:
        return 1.0
    if service_name and service_name in offered_names:
        return 1.0
    return 0.0


def calculate_distance_score(worker, request):
    """
    Distance score. Uses a precomputed distance_km if the caller supplies one on
    the worker dict, else falls back to a same-city heuristic, else neutral.

    Linear falloff: <= DISTANCE_FULL_SCORE_KM => 1.0, >= DISTANCE_ZERO_SCORE_KM => 0.0
    """
    distance_km = worker.get("distance_km")
    if distance_km is not None:
        if distance_km <= DISTANCE_FULL_SCORE_KM:
            return 1.0
        if distance_km >= DISTANCE_ZERO_SCORE_KM:
            return 0.0
        span = DISTANCE_ZERO_SCORE_KM - DISTANCE_FULL_SCORE_KM
        return _clamp01(1.0 - (distance_km - DISTANCE_FULL_SCORE_KM) / span)

    # No coordinates available -> city-based heuristic (privacy-safe, no PII)
    req_city = (request.get("city") or request.get("location") or "").strip().lower()
    worker_city = (worker.get("city") or "").strip().lower()
    if req_city and worker_city:
        return 1.0 if req_city == worker_city else 0.2

    # No location signal at all -> neutral (don't unfairly penalize)
    return NEUTRAL_SCORE


def calculate_rating_score(worker, request=None):
    """Rating normalized against MAX_RATING. New workers (no rating) -> neutral-ish."""
    rating = float(worker.get("rating_avg", 0) or 0)
    count = int(worker.get("rating_count", 0) or 0)
    if count == 0:
        return NEUTRAL_SCORE  # unrated worker isn't punished to zero
    return _clamp01(rating / MAX_RATING)


def calculate_experience_score(worker, request=None):
    """Experience normalized against EXPERIENCE_CAP_YEARS."""
    years = int(worker.get("experience_years", 0) or 0)
    return _clamp01(years / float(EXPERIENCE_CAP_YEARS))


def calculate_budget_score(worker, request):
    """
    Budget compatibility using the worker's hourly_rate against the requested
    budget window. If no budget provided -> neutral (don't filter on price).

    Estimated cost uses duration_hours (default 1). Within budget -> 1.0,
    above max -> linear penalty, below min -> still fine (cheaper is ok).
    """
    budget_min = request.get("budget_min")
    budget_max = request.get("budget_max")
    if budget_max is None:
        return NEUTRAL_SCORE

    rate = float(worker.get("hourly_rate", 0) or 0)
    duration = float(request.get("duration_hours", 1) or 1)
    est_cost = rate * duration

    try:
        budget_max = float(budget_max)
    except (TypeError, ValueError):
        return NEUTRAL_SCORE

    if est_cost <= budget_max:
        return 1.0
    if budget_max <= 0:
        return 0.0
    # Over budget: penalize proportionally, floor at 0
    overage = (est_cost - budget_max) / budget_max
    return _clamp01(1.0 - overage)


# =============================================================================
# Aggregation
# =============================================================================

def calculate_final_score(worker, request, weights=None):
    """
    Compute the weighted final score (0.0 - 1.0) and a per-component breakdown
    (match_reason) explaining the decision. No PII in the breakdown.
    """
    w = weights or MATCHING_WEIGHTS

    components = {
        "availability": calculate_availability_score(worker, request),
        "service": calculate_service_score(worker, request),
        "distance": calculate_distance_score(worker, request),
        "rating": calculate_rating_score(worker, request),
        "experience": calculate_experience_score(worker, request),
        "budget": calculate_budget_score(worker, request),
    }

    final = sum(components[k] * w.get(k, 0.0) for k in components)
    final = _clamp01(final)

    breakdown = {k: round(v, 3) for k, v in components.items()}
    return round(final, 4), breakdown


def rank_workers(workers, request, weights=None):
    """
    Score and rank a list of eligible worker dicts.
    Returns a list of dicts sorted by score desc:
        {"worker_id", "score", "score_pct", "match_reason", "worker": <summary>}
    """
    ranked = []
    for worker in workers:
        wid = worker.get("id")
        if not wid:
            continue
        score, reason = calculate_final_score(worker, request, weights)
        ranked.append({
            "worker_id": wid,
            "score": score,
            "score_pct": int(round(score * 100)),
            "match_reason": reason,
            "worker": worker,
        })
    ranked.sort(key=lambda r: r["score"], reverse=True)
    return ranked


def select_best_worker(ranked, attempted_worker_ids=None):
    """
    Pick the highest-ranked candidate not already attempted.
    Returns the ranked entry, or None if none remain.
    """
    attempted = set(attempted_worker_ids or [])
    for entry in ranked:
        if entry["worker_id"] not in attempted:
            return entry
    return None


# =============================================================================
# Eligibility + orchestration (uses an injected data_provider for testability)
# =============================================================================

def find_eligible_workers(request, data_provider):
    """
    Find workers capable of the requested service who are verified & available.

    `data_provider` must expose:
        get_workers_for_service(service_id) -> list[worker summary dicts]
        get_worker_availability(worker_id)  -> list[availability slot dicts]

    Each worker summary should include: id, is_verified, is_available,
    rating_avg, rating_count, experience_years, hourly_rate, city, service_ids,
    service_names. Availability is attached here for scoring.
    """
    service_id = request.get("service_id")
    workers = data_provider.get_workers_for_service(service_id) or []

    eligible = []
    for w in workers:
        if not w.get("is_verified"):
            continue
        if not w.get("is_available"):
            continue
        # Attach detailed availability for accurate scoring
        try:
            w["availability"] = data_provider.get_worker_availability(w.get("id")) or []
        except Exception:  # noqa: BLE001 - availability is best-effort
            w["availability"] = []
        eligible.append(w)
    return eligible


def match(request, data_provider, attempted_worker_ids=None, weights=None):
    """
    High-level entry point: find eligible workers, rank them, and select the best
    not-yet-attempted candidate.

    Returns:
        {
          "candidates": [worker_id, ...],   # ranked, full candidate pool
          "ranked": [ranked entries...],    # full detail (score, reason)
          "best": <ranked entry or None>,   # chosen worker (not previously attempted)
        }
    """
    eligible = find_eligible_workers(request, data_provider)
    ranked = rank_workers(eligible, request, weights)
    best = select_best_worker(ranked, attempted_worker_ids)
    return {
        "candidates": [r["worker_id"] for r in ranked],
        "ranked": ranked,
        "best": best,
    }


# =============================================================================
# Helpers
# =============================================================================

def _requested_day_of_week(request):
    """
    Resolve the requested day-of-week (0=Sun..6=Sat) from scheduled_date
    (YYYY-MM-DD) or an explicit day name. Returns -1 if unknown.
    """
    date_str = (request.get("scheduled_date") or "").strip()
    if date_str:
        try:
            d = datetime.strptime(date_str[:10], "%Y-%m-%d")
            # Python weekday(): Mon=0..Sun=6  ->  convert to Sun=0..Sat=6
            return (d.weekday() + 1) % 7
        except ValueError:
            pass
    day_name = (request.get("day") or "").strip().lower()
    return _WEEKDAY_TO_DOW.get(day_name, -1)


def _time_in_slot(req_time, start_time, end_time):
    """True if req_time (HH:MM) falls within [start_time, end_time)."""
    def _to_minutes(t):
        try:
            hh, mm = str(t).split(":")[:2]
            return int(hh) * 60 + int(mm)
        except (ValueError, AttributeError):
            return None

    r = _to_minutes(req_time)
    s = _to_minutes(start_time)
    e = _to_minutes(end_time)
    if r is None or s is None or e is None:
        return False
    return s <= r < e
