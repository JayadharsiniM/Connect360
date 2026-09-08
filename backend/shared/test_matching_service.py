"""
Connect360 - Unit tests for the Priority Booking matching engine.

Pure logic; no AWS. Run:
    cd backend/shared
    python -m unittest test_matching_service -v
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import matching_service as m


def _worker(**over):
    base = {
        "id": "w1",
        "is_verified": True,
        "is_available": True,
        "rating_avg": 4.5,
        "rating_count": 10,
        "experience_years": 5,
        "hourly_rate": 400,
        "city": "chennai",
        "service_ids": ["s1"],
        "service_names": ["AC Repair"],
        "availability": [
            {"day_of_week": 2, "start_time": "09:00", "end_time": "18:00", "is_available": True},
        ],
    }
    base.update(over)
    return base


def _request(**over):
    base = {
        "service_id": "s1",
        "service_name": "AC Repair",
        "scheduled_date": "2026-09-08",  # a Tuesday -> dow 2
        "scheduled_time": "10:00",
        "duration_hours": 2,
        "city": "chennai",
        "budget_min": 500,
        "budget_max": 1500,
    }
    base.update(over)
    return base


class _StubProvider:
    def __init__(self, workers):
        self._workers = workers

    def get_workers_for_service(self, service_id):
        return list(self._workers)

    def get_worker_availability(self, worker_id):
        for w in self._workers:
            if w["id"] == worker_id:
                return w.get("availability", [])
        return []


class TestComponentScores(unittest.TestCase):
    def test_all_scores_normalized_0_to_1(self):
        w, r = _worker(), _request()
        for fn in (
            m.calculate_availability_score,
            m.calculate_service_score,
            m.calculate_distance_score,
            m.calculate_rating_score,
            m.calculate_experience_score,
            m.calculate_budget_score,
        ):
            score = fn(w, r)
            self.assertGreaterEqual(score, 0.0)
            self.assertLessEqual(score, 1.0)

    def test_service_match_by_id(self):
        self.assertEqual(m.calculate_service_score(_worker(service_ids=["s1"]), _request(service_id="s1")), 1.0)
        self.assertEqual(m.calculate_service_score(_worker(service_ids=["s2"], service_names=[]), _request(service_id="s1", service_name="")), 0.0)

    def test_availability_unavailable_worker_scores_zero(self):
        self.assertEqual(m.calculate_availability_score(_worker(is_available=False), _request()), 0.0)

    def test_availability_time_in_slot_full_score(self):
        self.assertEqual(m.calculate_availability_score(_worker(), _request(scheduled_time="10:00")), 1.0)

    def test_availability_time_outside_slot_low(self):
        score = m.calculate_availability_score(_worker(), _request(scheduled_time="20:00"))
        self.assertLess(score, 0.5)

    def test_distance_same_city_beats_other_city(self):
        same = m.calculate_distance_score(_worker(city="chennai"), _request(city="chennai"))
        other = m.calculate_distance_score(_worker(city="delhi"), _request(city="chennai"))
        self.assertGreater(same, other)

    def test_distance_km_linear(self):
        near = m.calculate_distance_score(_worker(distance_km=1), _request())
        far = m.calculate_distance_score(_worker(distance_km=30), _request())
        self.assertEqual(near, 1.0)
        self.assertEqual(far, 0.0)

    def test_rating_unrated_is_neutral(self):
        self.assertEqual(m.calculate_rating_score(_worker(rating_avg=0, rating_count=0)), m.NEUTRAL_SCORE)

    def test_budget_within_is_full_over_is_penalized(self):
        within = m.calculate_budget_score(_worker(hourly_rate=200), _request(duration_hours=1, budget_max=500))
        over = m.calculate_budget_score(_worker(hourly_rate=1000), _request(duration_hours=1, budget_max=500))
        self.assertEqual(within, 1.0)
        self.assertLess(over, 1.0)

    def test_budget_absent_is_neutral(self):
        self.assertEqual(m.calculate_budget_score(_worker(), _request(budget_max=None)), m.NEUTRAL_SCORE)


class TestScoringAndRanking(unittest.TestCase):
    def test_final_score_weighted_and_bounded(self):
        score, breakdown = m.calculate_final_score(_worker(), _request())
        self.assertGreaterEqual(score, 0.0)
        self.assertLessEqual(score, 1.0)
        self.assertEqual(set(breakdown.keys()), set(m.MATCHING_WEIGHTS.keys()))

    def test_weights_sum_to_one(self):
        self.assertAlmostEqual(sum(m.MATCHING_WEIGHTS.values()), 1.0, places=6)

    def test_better_worker_ranks_higher(self):
        good = _worker(id="good", rating_avg=4.9, rating_count=50, experience_years=8, hourly_rate=300, city="chennai")
        bad = _worker(id="bad", rating_avg=2.5, rating_count=1, experience_years=0, hourly_rate=2000, city="delhi", availability=[])
        ranked = m.rank_workers([bad, good], _request())
        self.assertEqual(ranked[0]["worker_id"], "good")
        self.assertGreater(ranked[0]["score"], ranked[1]["score"])

    def test_score_pct_is_int_0_100(self):
        ranked = m.rank_workers([_worker()], _request())
        self.assertIsInstance(ranked[0]["score_pct"], int)
        self.assertTrue(0 <= ranked[0]["score_pct"] <= 100)

    def test_select_best_skips_attempted(self):
        ranked = m.rank_workers([_worker(id="a"), _worker(id="b")], _request())
        top = ranked[0]["worker_id"]
        best = m.select_best_worker(ranked, attempted_worker_ids=[top])
        self.assertNotEqual(best["worker_id"], top)

    def test_select_best_none_when_all_attempted(self):
        ranked = m.rank_workers([_worker(id="a")], _request())
        self.assertIsNone(m.select_best_worker(ranked, attempted_worker_ids=["a"]))


class TestEligibilityAndMatch(unittest.TestCase):
    def test_unverified_and_unavailable_excluded(self):
        workers = [
            _worker(id="ok"),
            _worker(id="unverified", is_verified=False),
            _worker(id="unavailable", is_available=False),
        ]
        eligible = m.find_eligible_workers(_request(), _StubProvider(workers))
        ids = {w["id"] for w in eligible}
        self.assertEqual(ids, {"ok"})

    def test_match_returns_best_and_candidates(self):
        workers = [_worker(id="a", rating_avg=3.0, rating_count=5), _worker(id="b", rating_avg=5.0, rating_count=40)]
        result = m.match(_request(), _StubProvider(workers))
        self.assertEqual(result["best"]["worker_id"], "b")
        self.assertIn("a", result["candidates"])
        self.assertIn("b", result["candidates"])

    def test_match_no_eligible_returns_none(self):
        result = m.match(_request(), _StubProvider([_worker(is_verified=False)]))
        self.assertIsNone(result["best"])
        self.assertEqual(result["candidates"], [])

    def test_match_respects_attempted(self):
        workers = [_worker(id="a", rating_avg=5.0, rating_count=40), _worker(id="b", rating_avg=4.0, rating_count=20)]
        result = m.match(_request(), _StubProvider(workers), attempted_worker_ids=["a"])
        self.assertEqual(result["best"]["worker_id"], "b")


if __name__ == "__main__":
    unittest.main(verbosity=2)
