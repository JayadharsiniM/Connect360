"""
Connect360 - Unit tests for In-App Calling with Number Privacy (Feature 1)

Run:
    cd backend/lambdas/connect360-bookings
    python -m pytest test_calling.py -v
  or
    python test_calling.py

These tests mock the shared DB + provider layers so they run without AWS.
They assert:
  - Authorized customer can initiate a call
  - Assigned worker can initiate a call
  - Unrelated user is denied (403)
  - Inactive / completed / cancelled booking cannot call (409)
  - Real phone numbers are NEVER returned to the client
  - Missing phone numbers handled safely (422)
  - Provider not-configured / error handled safely (503 / 502)
"""

import os
import sys
import json
import types
import unittest
from unittest import mock

# --- Make shared modules importable and stub them BEFORE importing handler ---
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
SHARED_DIR = os.path.join(CURRENT_DIR, "..", "..", "shared")
sys.path.insert(0, SHARED_DIR)
sys.path.insert(0, CURRENT_DIR)

# Real shared modules (response, auth_helpers, calling_provider) import cleanly.
# We stub `db` so no AWS/boto3 is needed.
_fake_db = types.ModuleType("db")

# In-memory item store the tests will populate per-case
_STORE = {}


def _key(pk, sk):
    return f"{pk}||{sk}"


def _get_item(pk, sk, table_ref=None):
    return _STORE.get(_key(pk, sk))


def _query_items(pk, sk_begins_with=None, index_name=None, **kwargs):
    # Only GSI2 Cognito lookup is used by the call path
    results = []
    for v in _STORE.values():
        if index_name == "GSI2" and v.get("GSI2PK") == pk:
            results.append(v)
    return results


def _noop(*args, **kwargs):
    return None


_fake_db.get_item = _get_item
_fake_db.query_items = _query_items
_fake_db.put_item = _noop
_fake_db.update_item = _noop
_fake_db.delete_item = _noop
_fake_db.transact_write = _noop
_fake_db.query_all = lambda *a, **k: []
_fake_db.generate_id = lambda: "test-id"
_fake_db.now_iso = lambda: "2026-01-01T00:00:00Z"
_fake_db.decimal_to_float = lambda x: x
# handler imports priority_handler which needs `table` + `activity_table`
_fake_db.table = object()
_fake_db.activity_table = object()
sys.modules["db"] = _fake_db

import calling_provider  # noqa: E402  (real module)
import handler  # noqa: E402  (imports the stubbed db)


# ----------------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------------

CUSTOMER_SUB = "cog-customer-sub"
WORKER_SUB = "cog-worker-sub"
STRANGER_SUB = "cog-stranger-sub"

CUSTOMER_ID = "cust-1"
WORKER_ID = "work-1"
STRANGER_ID = "stranger-1"
BOOKING_ID = "book-1"

CUSTOMER_PHONE = "+919000000001"
WORKER_PHONE = "+919000000002"


def _reset_store(booking_status="accepted", customer_phone=CUSTOMER_PHONE, worker_phone=WORKER_PHONE):
    _STORE.clear()
    # User lookup by cognito sub (GSI2)
    _STORE[_key(f"COGNITO#{CUSTOMER_SUB}", "USER")] = {
        "id": CUSTOMER_ID, "GSI2PK": f"COGNITO#{CUSTOMER_SUB}", "role": "customer",
    }
    _STORE[_key(f"COGNITO#{WORKER_SUB}", "USER")] = {
        "id": WORKER_ID, "GSI2PK": f"COGNITO#{WORKER_SUB}", "role": "worker",
    }
    _STORE[_key(f"COGNITO#{STRANGER_SUB}", "USER")] = {
        "id": STRANGER_ID, "GSI2PK": f"COGNITO#{STRANGER_SUB}", "role": "customer",
    }
    # Profiles (hold phone numbers)
    _STORE[_key(f"USER#{CUSTOMER_ID}", "PROFILE")] = {
        "id": CUSTOMER_ID, "full_name": "Cust", "phone": customer_phone,
    }
    _STORE[_key(f"USER#{WORKER_ID}", "PROFILE")] = {
        "id": WORKER_ID, "full_name": "Work", "phone": worker_phone,
    }
    # Booking
    _STORE[_key(f"BOOKING#{BOOKING_ID}", "METADATA")] = {
        "id": BOOKING_ID, "customer_id": CUSTOMER_ID, "worker_id": WORKER_ID,
        "status": booking_status, "service_name": "Plumbing",
    }


def _event(sub, role, booking_id=BOOKING_ID):
    return {
        "httpMethod": "POST",
        "resource": "/api/bookings/{id}/call",
        "pathParameters": {"id": booking_id},
        "requestContext": {"authorizer": {"claims": {
            "sub": sub, "email": "x@y.com", "custom:role": role, "custom:full_name": "X",
        }}},
        "body": None,
    }


def _call(sub, role, booking_id=BOOKING_ID):
    resp = handler.lambda_handler(_event(sub, role, booking_id), None)
    body = json.loads(resp["body"]) if resp.get("body") else {}
    return resp["statusCode"], body, resp["body"] or ""


# ----------------------------------------------------------------------------
# Tests
# ----------------------------------------------------------------------------

class TestCallingAuthorization(unittest.TestCase):

    def setUp(self):
        _reset_store()
        # Force provider "configured" + successful, so auth logic is what we test
        self._patcher_cfg = mock.patch.object(calling_provider, "is_configured", return_value=True)
        self._patcher_call = mock.patch.object(
            calling_provider, "_twilio_connect",
            return_value={"status": calling_provider.STATUS_INITIATED, "call_ref": "CALLSID123"},
        )
        self._patcher_cfg.start()
        self._patcher_call.start()

    def tearDown(self):
        self._patcher_cfg.stop()
        self._patcher_call.stop()

    def test_authorized_customer_can_call(self):
        code, body, _ = _call(CUSTOMER_SUB, "customer")
        self.assertEqual(code, 200)
        self.assertEqual(body.get("call_status"), "calling")
        self.assertTrue(body.get("masked"))

    def test_assigned_worker_can_call(self):
        code, body, _ = _call(WORKER_SUB, "worker")
        self.assertEqual(code, 200)
        self.assertEqual(body.get("call_status"), "calling")

    def test_unrelated_user_denied(self):
        code, body, _ = _call(STRANGER_SUB, "customer")
        self.assertEqual(code, 403)

    def test_admin_role_denied(self):
        code, body, _ = _call(CUSTOMER_SUB, "admin")
        self.assertEqual(code, 403)


class TestCallingStatusGate(unittest.TestCase):

    def setUp(self):
        self._patcher_cfg = mock.patch.object(calling_provider, "is_configured", return_value=True)
        self._patcher_call = mock.patch.object(
            calling_provider, "_twilio_connect",
            return_value={"status": calling_provider.STATUS_INITIATED},
        )
        self._patcher_cfg.start()
        self._patcher_call.start()

    def tearDown(self):
        self._patcher_cfg.stop()
        self._patcher_call.stop()

    def test_pending_booking_cannot_call(self):
        _reset_store(booking_status="pending")
        code, _, _ = _call(CUSTOMER_SUB, "customer")
        self.assertEqual(code, 409)

    def test_completed_booking_cannot_call(self):
        _reset_store(booking_status="completed")
        code, _, _ = _call(CUSTOMER_SUB, "customer")
        self.assertEqual(code, 409)

    def test_cancelled_booking_cannot_call(self):
        _reset_store(booking_status="cancelled")
        code, _, _ = _call(CUSTOMER_SUB, "customer")
        self.assertEqual(code, 409)

    def test_in_progress_booking_can_call(self):
        _reset_store(booking_status="in_progress")
        code, body, _ = _call(CUSTOMER_SUB, "customer")
        self.assertEqual(code, 200)


class TestPhoneNumberPrivacy(unittest.TestCase):
    """The most important guarantee: numbers must never reach the client."""

    def setUp(self):
        _reset_store()
        self._patcher_cfg = mock.patch.object(calling_provider, "is_configured", return_value=True)
        self._patcher_call = mock.patch.object(
            calling_provider, "_twilio_connect",
            return_value={"status": calling_provider.STATUS_INITIATED, "call_ref": "CALLSID123"},
        )
        self._patcher_cfg.start()
        self._patcher_call.start()

    def tearDown(self):
        self._patcher_cfg.stop()
        self._patcher_call.stop()

    def test_no_phone_in_success_response(self):
        _, _, raw = _call(CUSTOMER_SUB, "customer")
        self.assertNotIn(CUSTOMER_PHONE, raw)
        self.assertNotIn(WORKER_PHONE, raw)
        # also check digits without + prefix
        self.assertNotIn(CUSTOMER_PHONE.lstrip("+"), raw)
        self.assertNotIn(WORKER_PHONE.lstrip("+"), raw)

    def test_no_phone_when_worker_calls(self):
        _, _, raw = _call(WORKER_SUB, "worker")
        self.assertNotIn(CUSTOMER_PHONE, raw)
        self.assertNotIn(WORKER_PHONE, raw)


class TestMissingNumbers(unittest.TestCase):

    def setUp(self):
        self._patcher_cfg = mock.patch.object(calling_provider, "is_configured", return_value=True)
        self._patcher_cfg.start()

    def tearDown(self):
        self._patcher_cfg.stop()

    def test_caller_missing_phone(self):
        _reset_store(customer_phone="")
        code, _, _ = _call(CUSTOMER_SUB, "customer")
        self.assertEqual(code, 422)

    def test_callee_missing_phone(self):
        _reset_store(worker_phone="")
        code, _, _ = _call(CUSTOMER_SUB, "customer")
        self.assertEqual(code, 422)


class TestProviderStates(unittest.TestCase):

    def test_not_configured_returns_503(self):
        _reset_store()
        with mock.patch.object(calling_provider, "is_configured", return_value=False):
            code, _, raw = _call(CUSTOMER_SUB, "customer")
        self.assertEqual(code, 503)
        # No numbers leaked even in the unavailable path
        self.assertNotIn(CUSTOMER_PHONE, raw)
        self.assertNotIn(WORKER_PHONE, raw)

    def test_provider_error_returns_502(self):
        _reset_store()
        with mock.patch.object(calling_provider, "is_configured", return_value=True), \
             mock.patch.object(calling_provider, "_twilio_connect",
                               return_value={"status": calling_provider.STATUS_PROVIDER_ERROR}):
            code, _, raw = _call(CUSTOMER_SUB, "customer")
        self.assertEqual(code, 502)
        self.assertNotIn(CUSTOMER_PHONE, raw)
        self.assertNotIn(WORKER_PHONE, raw)

    def test_booking_not_found(self):
        _reset_store()
        code, _, _ = _call(CUSTOMER_SUB, "customer", booking_id="does-not-exist")
        self.assertEqual(code, 404)


class TestProviderAdapterSafety(unittest.TestCase):
    """Provider adapter must not leak numbers or crash on bad input."""

    def test_invalid_numbers_status(self):
        # Not configured is checked after number validation, so force configured
        with mock.patch.object(calling_provider, "is_configured", return_value=True):
            res = calling_provider.initiate_masked_call("", "", BOOKING_ID)
        self.assertEqual(res["status"], calling_provider.STATUS_INVALID_NUMBERS)

    def test_not_configured_when_env_empty(self):
        # Ensure env is empty -> not configured
        for k in ("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER", "TWILIO_TWIML_URL"):
            os.environ.pop(k, None)
        res = calling_provider.initiate_masked_call(CUSTOMER_PHONE, WORKER_PHONE, BOOKING_ID)
        self.assertEqual(res["status"], calling_provider.STATUS_NOT_CONFIGURED)

    def test_result_never_contains_numbers(self):
        with mock.patch.object(calling_provider, "is_configured", return_value=True), \
             mock.patch.object(calling_provider, "_twilio_connect",
                               return_value={"status": calling_provider.STATUS_INITIATED, "call_ref": "X"}):
            res = calling_provider.initiate_masked_call(CUSTOMER_PHONE, WORKER_PHONE, BOOKING_ID)
        raw = json.dumps(res)
        self.assertNotIn(CUSTOMER_PHONE, raw)
        self.assertNotIn(WORKER_PHONE, raw)


if __name__ == "__main__":
    unittest.main(verbosity=2)
