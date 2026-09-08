"""
Connect360 - Unit tests for Priority Booking (Feature 3).

Stubs the shared `db` module (in-memory store, incl. a transact_write that
honors ConditionExpressions) so the full lifecycle runs without AWS.

Covers: create+match, validation, worker filtering/availability, best-worker
selection, worker accept, worker reject -> rematch, no-worker, confirmation,
duplicate-acceptance prevention, double-booking (slot) prevention, unauthorized
access, cancellation, and lazy timeout/expiry.

Run:
    cd backend/lambdas/connect360-bookings
    python -m unittest test_priority -v
"""

import os
import sys
import json
import types
import unittest
from datetime import datetime, timezone, timedelta

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
SHARED_DIR = os.path.join(CURRENT_DIR, "..", "..", "shared")
sys.path.insert(0, SHARED_DIR)
sys.path.insert(0, CURRENT_DIR)

# ---------------------------------------------------------------------------
# In-memory DB stub (main + activity share one store keyed by table marker)
# ---------------------------------------------------------------------------
_STORE = {}
_now_holder = {"t": datetime(2026, 1, 1, tzinfo=timezone.utc)}


def _key(pk, sk):
    return f"{pk}||{sk}"


def _now_iso():
    return _now_holder["t"].isoformat()


def _put_item(item, table_ref=None):
    _STORE[_key(item["PK"], item["SK"])] = dict(item)
    return item


def _get_item(pk, sk, table_ref=None):
    it = _STORE.get(_key(pk, sk))
    return dict(it) if it else None


def _update_item(pk, sk, updates, table_ref=None):
    it = _STORE.get(_key(pk, sk))
    if it is None:
        it = {"PK": pk, "SK": sk}
        _STORE[_key(pk, sk)] = it
    it.update(updates)
    it["updated_at"] = _now_iso()


def _delete_item(pk, sk, table_ref=None):
    _STORE.pop(_key(pk, sk), None)


def _query_items(pk, sk_begins_with=None, index_name=None, **kwargs):
    results = []
    for v in _STORE.values():
        if index_name == "GSI2":
            if v.get("GSI2PK") == pk and (not sk_begins_with or str(v.get("GSI2SK", "")).startswith(sk_begins_with) or str(v.get("SK", "")).startswith(sk_begins_with or "")):
                results.append(v)
        elif index_name == "GSI1":
            if v.get("GSI1PK") == pk:
                results.append(v)
        else:
            if v.get("PK") == pk and (not sk_begins_with or str(v.get("SK", "")).startswith(sk_begins_with)):
                results.append(v)
    return [dict(r) for r in results]


def _transact_write(transact_items):
    """
    Minimal transact_write supporting Update (with ConditionExpression on
    status/worker_id) and Put (attribute_not_exists(PK)). All-or-nothing.
    Raises on any condition failure (mirrors DynamoDB TransactionCanceled).
    """
    # First pass: validate all conditions against a snapshot
    for op in transact_items:
        if "Update" in op:
            u = op["Update"]
            pk = u["Key"]["PK"]["S"]
            sk = u["Key"]["SK"]["S"]
            it = _STORE.get(_key(pk, sk))
            cond = u.get("ConditionExpression", "")
            if "status = :pending" in cond.replace("#s", "status"):
                vals = u["ExpressionAttributeValues"]
                if not it or it.get("status") != vals[":pending"]["S"]:
                    raise Exception("ConditionalCheckFailed:status")
                if "worker_id = :wid" in cond and it.get("worker_id") != vals[":wid"]["S"]:
                    raise Exception("ConditionalCheckFailed:worker")
        elif "Put" in op:
            p = op["Put"]
            pk = p["Item"]["PK"]["S"]
            sk = p["Item"]["SK"]["S"]
            if p.get("ConditionExpression") == "attribute_not_exists(PK)":
                if _STORE.get(_key(pk, sk)) is not None:
                    raise Exception("ConditionalCheckFailed:slot")

    # Second pass: apply
    for op in transact_items:
        if "Update" in op:
            u = op["Update"]
            pk = u["Key"]["PK"]["S"]
            sk = u["Key"]["SK"]["S"]
            it = _STORE.setdefault(_key(pk, sk), {"PK": pk, "SK": sk})
            vals = u["ExpressionAttributeValues"]
            # apply the known SET attributes from the accept transaction
            it["status"] = vals[":accepted"]["S"]
            it["GSI1PK"] = vals[":gpk"]["S"]
            it["GSI1SK"] = vals[":gsk"]["S"]
            it["offer_expires_at"] = None
            it["updated_at"] = vals[":now"]["S"]
        elif "Put" in op:
            p = op["Put"]
            item = {k: list(v.values())[0] for k, v in p["Item"].items()}
            _STORE[_key(item["PK"], item["SK"])] = item


_fake_db = types.ModuleType("db")
_fake_db.put_item = _put_item
_fake_db.get_item = _get_item
_fake_db.update_item = _update_item
_fake_db.delete_item = _delete_item
_fake_db.query_items = _query_items
_fake_db.query_all = lambda *a, **k: []
_fake_db.transact_write = _transact_write
_fake_db.generate_id = lambda: f"gen-{len(_STORE)}"
_fake_db.now_iso = _now_iso
_fake_db.decimal_to_float = lambda x: x
_fake_db.table = object()
_fake_db.activity_table = object()
sys.modules["db"] = _fake_db

os.environ["DYNAMODB_TABLE"] = "test-table"
os.environ["PRIORITY_OFFER_TIMEOUT_SECONDS"] = "120"

import priority_handler as ph  # noqa: E402
import handler  # noqa: E402  (routing)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
CUST_SUB, CUST_ID = "cog-c", "cust-1"
W1_SUB, W1_ID = "cog-w1", "worker-1"
W2_SUB, W2_ID = "cog-w2", "worker-2"
STRANGER_SUB, STRANGER_ID = "cog-x", "stranger-1"


def _seed(worker_ratings=((W1_ID, 4.9, 50, 5), (W2_ID, 3.5, 5, 1), (STRANGER_ID, 2.0, 1, 0))):
    _STORE.clear()
    _now_holder["t"] = datetime(2026, 1, 1, tzinfo=timezone.utc)

    # Users by cognito sub (GSI2)
    for sub, uid, role in [(CUST_SUB, CUST_ID, "customer"), (W1_SUB, W1_ID, "worker"),
                           (W2_SUB, W2_ID, "worker"), (STRANGER_SUB, STRANGER_ID, "worker")]:
        _STORE[_key(f"COGNITO#{sub}", "USER")] = {
            "PK": f"COGNITO#{sub}", "SK": "USER", "id": uid, "GSI2PK": f"COGNITO#{sub}", "role": role,
        }
    # Customer profile
    _STORE[_key(f"USER#{CUST_ID}", "PROFILE")] = {"PK": f"USER#{CUST_ID}", "SK": "PROFILE", "id": CUST_ID, "full_name": "Cust", "city": "chennai"}
    # Service
    _STORE[_key("SERVICE#s1", "METADATA")] = {"PK": "SERVICE#s1", "SK": "METADATA", "id": "s1", "name": "AC Repair"}

    # Workers offering s1 (GSI1 SERVICE_WORKER)
    for wid, rating, count, exp in worker_ratings:
        _STORE[_key(f"USER#{wid}", "PROFILE")] = {"PK": f"USER#{wid}", "SK": "PROFILE", "id": wid, "full_name": f"Worker {wid}", "city": "chennai"}
        _STORE[_key(f"USER#{wid}", "WORKER_PROFILE")] = {
            "PK": f"USER#{wid}", "SK": "WORKER_PROFILE", "is_verified": True, "is_available": True,
            "rating_avg": rating, "rating_count": count, "experience_years": exp, "hourly_rate": 300,
        }
        _STORE[_key(f"USER#{wid}", "SERVICE#s1")] = {
            "PK": f"USER#{wid}", "SK": "SERVICE#s1", "service_id": "s1", "service_name": "AC Repair",
            "GSI1PK": "SERVICE_WORKER#s1", "GSI1SK": f"WORKER#{wid}",
        }
        _STORE[_key(f"USER#{wid}", "AVAIL#2#09:00")] = {
            "PK": f"USER#{wid}", "SK": "AVAIL#2#09:00", "day_of_week": 2,
            "start_time": "09:00", "end_time": "18:00", "is_available": True,
        }


def _event(method, resource, sub, role, path_id=None, body=None):
    return {
        "httpMethod": method,
        "resource": resource,
        "pathParameters": {"id": path_id} if path_id else None,
        "requestContext": {"authorizer": {"claims": {"sub": sub, "custom:role": role}}},
        "body": json.dumps(body) if body is not None else None,
    }


def _invoke(method, resource, sub, role, path_id=None, body=None):
    resp = handler.lambda_handler(_event(method, resource, sub, role, path_id, body), None)
    parsed = json.loads(resp["body"]) if resp.get("body") else {}
    return resp["statusCode"], parsed, resp.get("body") or ""


def _create(body=None):
    b = {"service_id": "s1", "address": "12 Main St, Chennai", "scheduled_date": "2026-09-08",
         "scheduled_time": "10:00", "budget_min": 200, "budget_max": 1000}
    if body:
        b.update(body)
    return _invoke("POST", "/api/bookings/priority", CUST_SUB, "customer", body=b)


class TestCreateAndMatch(unittest.TestCase):
    def setUp(self):
        _seed()

    def test_create_matches_best_worker(self):
        code, body, _ = _create()
        self.assertEqual(code, 201)
        self.assertEqual(body["status"], "worker_pending")
        booking = _get_item(f"BOOKING#{body['booking_id']}", "METADATA")
        # W1 has far higher rating/experience -> should be chosen
        self.assertEqual(booking["worker_id"], W1_ID)
        self.assertEqual(booking["booking_type"], "priority")
        self.assertTrue(booking["match_score"] > 0)

    def test_create_requires_service(self):
        code, _, _ = _invoke("POST", "/api/bookings/priority", CUST_SUB, "customer",
                             body={"address": "x"})
        self.assertEqual(code, 400)

    def test_create_rejects_past_date(self):
        code, _, _ = _create({"scheduled_date": "2020-01-01"})
        self.assertEqual(code, 400)

    def test_create_rejects_bad_budget(self):
        code, _, _ = _create({"budget_min": 2000, "budget_max": 500})
        self.assertEqual(code, 400)

    def test_worker_cannot_create(self):
        code, _, _ = _invoke("POST", "/api/bookings/priority", W1_SUB, "worker", body={"service_id": "s1", "address": "x"})
        self.assertEqual(code, 403)

    def test_no_eligible_worker(self):
        _seed()
        # Make all workers unavailable
        for wid in (W1_ID, W2_ID, STRANGER_ID):
            _STORE[_key(f"USER#{wid}", "WORKER_PROFILE")]["is_available"] = False
        code, body, _ = _create()
        self.assertEqual(code, 201)
        self.assertEqual(body["status"], "no_worker_available")


class TestWorkerListAndPrivacy(unittest.TestCase):
    def setUp(self):
        _seed()
        _, self.created, _ = _create()

    def test_matched_worker_sees_request(self):
        code, body, _ = _invoke("GET", "/api/worker/priority-requests", W1_SUB, "worker")
        self.assertEqual(code, 200)
        self.assertEqual(body["count"], 1)

    def test_other_worker_does_not_see_request(self):
        code, body, _ = _invoke("GET", "/api/worker/priority-requests", W2_SUB, "worker")
        self.assertEqual(code, 200)
        self.assertEqual(body["count"], 0)

    def test_worker_request_has_no_exact_address_or_contact(self):
        _, body, raw = _invoke("GET", "/api/worker/priority-requests", W1_SUB, "worker")
        self.assertNotIn("12 Main St", raw)  # exact street hidden; only coarse area
        self.assertNotIn("phone", raw)


class TestAcceptRejectRematch(unittest.TestCase):
    def setUp(self):
        _seed()
        _, self.created, _ = _create()
        self.bid = self.created["booking_id"]

    def test_worker_accept_confirms(self):
        code, body, _ = _invoke("POST", "/api/priority/{id}/accept", W1_SUB, "worker", path_id=self.bid)
        self.assertEqual(code, 200)
        self.assertEqual(body["status"], "accepted")
        booking = _get_item(f"BOOKING#{self.bid}", "METADATA")
        self.assertEqual(booking["status"], "accepted")
        # mirrored into worker booking list
        self.assertIsNotNone(_get_item(f"WORKER_BOOKING#{W1_ID}", f"BOOKING#{self.bid}"))

    def test_non_assigned_worker_cannot_accept(self):
        code, _, _ = _invoke("POST", "/api/priority/{id}/accept", W2_SUB, "worker", path_id=self.bid)
        self.assertEqual(code, 403)

    def test_duplicate_acceptance_prevented(self):
        code1, _, _ = _invoke("POST", "/api/priority/{id}/accept", W1_SUB, "worker", path_id=self.bid)
        self.assertEqual(code1, 200)
        # Second accept must fail (status no longer worker_pending)
        code2, _, _ = _invoke("POST", "/api/priority/{id}/accept", W1_SUB, "worker", path_id=self.bid)
        self.assertEqual(code2, 409)

    def test_reject_triggers_rematch_to_next_worker(self):
        code, body, _ = _invoke("POST", "/api/priority/{id}/reject", W1_SUB, "worker", path_id=self.bid)
        self.assertEqual(code, 200)
        booking = _get_item(f"BOOKING#{self.bid}", "METADATA")
        # W1 rejected -> should now offer to W2
        self.assertEqual(booking["worker_id"], W2_ID)
        self.assertEqual(booking["status"], "worker_pending")
        self.assertIn(W1_ID, booking["attempted_worker_ids"])

    def test_reject_all_workers_no_worker(self):
        _invoke("POST", "/api/priority/{id}/reject", W1_SUB, "worker", path_id=self.bid)
        # now W2 holds it; reject as W2
        _invoke("POST", "/api/priority/{id}/reject", W2_SUB, "worker", path_id=self.bid)
        # stranger also offers s1; reject that too
        booking = _get_item(f"BOOKING#{self.bid}", "METADATA")
        if booking["worker_id"] == STRANGER_ID:
            _invoke("POST", "/api/priority/{id}/reject", STRANGER_SUB, "worker", path_id=booking["id"])
        booking = _get_item(f"BOOKING#{self.bid}", "METADATA")
        self.assertEqual(booking["status"], "no_worker_available")

    def test_double_booking_slot_prevented(self):
        # W1 accepts one booking on a slot
        _invoke("POST", "/api/priority/{id}/accept", W1_SUB, "worker", path_id=self.bid)
        # Create a second request for the same slot; force it to also match W1
        _STORE[_key(f"USER#{W2_ID}", "WORKER_PROFILE")]["is_available"] = False
        _STORE[_key(f"USER#{STRANGER_ID}", "WORKER_PROFILE")]["is_available"] = False
        _, created2, _ = _create()
        bid2 = created2["booking_id"]
        booking2 = _get_item(f"BOOKING#{bid2}", "METADATA")
        self.assertEqual(booking2["worker_id"], W1_ID)
        # W1 tries to accept the second, same-slot booking -> slot lock rejects it
        code, _, _ = _invoke("POST", "/api/priority/{id}/accept", W1_SUB, "worker", path_id=bid2)
        self.assertEqual(code, 409)


class TestCancelAndTimeout(unittest.TestCase):
    def setUp(self):
        _seed()
        _, self.created, _ = _create()
        self.bid = self.created["booking_id"]

    def test_customer_can_cancel_while_pending(self):
        code, body, _ = _invoke("PUT", "/api/priority/{id}/cancel", CUST_SUB, "customer", path_id=self.bid)
        self.assertEqual(code, 200)
        self.assertEqual(_get_item(f"BOOKING#{self.bid}", "METADATA")["status"], "cancelled")

    def test_stranger_cannot_cancel(self):
        code, _, _ = _invoke("PUT", "/api/priority/{id}/cancel", STRANGER_SUB, "worker", path_id=self.bid)
        self.assertEqual(code, 403)

    def test_expired_offer_rematches_on_customer_poll(self):
        # Force the current offer to be already expired (past timestamp), then
        # poll as the customer -> lazy expiry should reassign to the next worker.
        past = (datetime.now(timezone.utc) - timedelta(seconds=10)).isoformat()
        _update_item(f"BOOKING#{self.bid}", "METADATA", {"offer_expires_at": past})
        code, body, _ = _invoke("GET", "/api/customer/priority-bookings", CUST_SUB, "customer")
        self.assertEqual(code, 200)
        booking = _get_item(f"BOOKING#{self.bid}", "METADATA")
        # W1's offer expired -> reassigned to the next best worker (W2)
        self.assertIn(W1_ID, booking.get("attempted_worker_ids", []))
        self.assertEqual(booking["worker_id"], W2_ID)

    def test_confirmed_cannot_be_cancelled_via_priority_endpoint(self):
        _invoke("POST", "/api/priority/{id}/accept", W1_SUB, "worker", path_id=self.bid)
        code, _, _ = _invoke("PUT", "/api/priority/{id}/cancel", CUST_SUB, "customer", path_id=self.bid)
        self.assertEqual(code, 409)


class TestManualRegression(unittest.TestCase):
    """Manual booking create must still work and be tagged booking_type=manual."""

    def setUp(self):
        _seed()

    def test_manual_booking_still_works(self):
        # Verify the worker so create_booking accepts it
        body = {"worker_id": W1_ID, "service_id": "s1", "scheduled_date": "2026-09-08",
                "scheduled_time": "10:00", "address": "12 Main St"}
        _STORE[_key(f"USER#{W1_ID}", "WORKER_PROFILE")]["is_verified"] = True
        code, resp, _ = _invoke("POST", "/api/bookings", CUST_SUB, "customer", body=body)
        self.assertEqual(code, 201)
        booking = _get_item(f"BOOKING#{resp['booking_id']}", "METADATA")
        self.assertEqual(booking["booking_type"], "manual")
        self.assertEqual(booking["status"], "pending")


if __name__ == "__main__":
    unittest.main(verbosity=2)
