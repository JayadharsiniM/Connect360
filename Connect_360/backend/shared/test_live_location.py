"""
Tests for live-location proximity matching (no AWS, pure functions).

Covers haversine_km, distance-based scoring, and the request/worker coordinate
plumbing in calculate_distance_score (haversine when coords present, city
fallback otherwise, neutral when nothing).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import matching_service as ms  # noqa: E402

passed = 0
failed = 0


def check(name, cond):
    global passed, failed
    if cond:
        passed += 1
        print(f"  PASS: {name}")
    else:
        failed += 1
        print(f"  FAIL: {name}")


def approx(a, b, tol=1.0):
    return a is not None and abs(a - b) <= tol


# --- haversine sanity ---
# Chennai (13.0827, 80.2707) to Bangalore (12.9716, 77.5946) ~ 290 km
d = ms.haversine_km(13.0827, 80.2707, 12.9716, 77.5946)
check("haversine Chennai->Bangalore ~290km", approx(d, 290, 15))
check("haversine same point = 0", approx(ms.haversine_km(13, 80, 13, 80), 0, 0.01))
check("haversine missing coord -> None", ms.haversine_km(13, 80, None, 80) is None)

# --- distance score falloff (FULL=2km=>1.0, ZERO=25km=>0.0 per defaults) ---
check("score at 0km near 1.0", ms._score_from_distance(0.0) == 1.0)
check("score at 2km == 1.0", ms._score_from_distance(2.0) == 1.0)
check("score at 25km == 0.0", ms._score_from_distance(25.0) == 0.0)
mid = ms._score_from_distance(13.5)  # midpoint of 2..25
check("score at midpoint ~0.5", 0.4 <= mid <= 0.6)

# --- calculate_distance_score uses request+worker coords (haversine) ---
# Worker very close to customer -> high score
near = ms.calculate_distance_score(
    {'lat': 13.083, 'lng': 80.271}, {'lat': 13.0827, 'lng': 80.2707})
check("close worker -> high distance score", near >= 0.95)
# Worker far -> zero
far = ms.calculate_distance_score(
    {'lat': 12.9716, 'lng': 77.5946}, {'lat': 13.0827, 'lng': 80.2707})
check("far worker -> zero distance score", far == 0.0)

# --- precomputed distance_km wins over coords ---
pre = ms.calculate_distance_score({'distance_km': 2.0, 'lat': 0, 'lng': 0},
                                  {'lat': 50, 'lng': 50})
check("precomputed distance_km honored", pre == 1.0)

# --- no coords -> city fallback ---
same_city = ms.calculate_distance_score({'city': 'Chennai'}, {'city': 'chennai'})
diff_city = ms.calculate_distance_score({'city': 'Mumbai'}, {'city': 'chennai'})
check("same city fallback = 1.0", same_city == 1.0)
check("different city fallback = 0.2", diff_city == 0.2)

# --- no signal at all -> neutral ---
neutral = ms.calculate_distance_score({}, {})
check("no location -> neutral", neutral == ms.NEUTRAL_SCORE)

print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
