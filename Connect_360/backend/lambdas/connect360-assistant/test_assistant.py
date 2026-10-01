"""
Connect360 - Unit tests for the role-aware AI Assistant (Feature 2)

Run:
    cd backend/lambdas/connect360-assistant
    python -m unittest test_assistant -v

Asserts:
  - Customer and worker both get answers (role-aware)
  - AI is NEVER trusted for authorization; the handler enforces booking ownership
  - A user referencing someone else's booking gets NO booking context
  - Phone numbers / emails never appear in the answer (privacy safety net)
  - AI-disabled -> rule-based fallback (Rs.0 mode) still answers
  - Provider error -> safe fallback
  - Empty message rejected
"""

import os
import sys
import json
import types
import unittest
from unittest import mock

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
SHARED_DIR = os.path.join(CURRENT_DIR, "..", "..", "shared")
sys.path.insert(0, SHARED_DIR)
sys.path.insert(0, CURRENT_DIR)

# Stub db so no AWS/boto3 is needed
_fake_db = types.ModuleType("db")
_STORE = {}


def _key(pk, sk):
    return f"{pk}||{sk}"


def _get_item(pk, sk, table_ref=None):
    return _STORE.get(_key(pk, sk))


def _query_items(pk, sk_begins_with=None, index_name=None, **kwargs):
    results = []
    for v in _STORE.values():
        if index_name == "GSI2" and v.get("GSI2PK") == pk:
            results.append(v)
    return results


_fake_db.get_item = _get_item
_fake_db.query_items = _query_items
_fake_db.decimal_to_float = lambda x: x
sys.modules["db"] = _fake_db

import ai_provider          # noqa: E402  (real)
import assistant_knowledge  # noqa: E402  (real)
import handler              # noqa: E402  (imports stubbed db)


CUSTOMER_SUB = "cog-customer"
WORKER_SUB = "cog-worker"
STRANGER_SUB = "cog-stranger"
CUSTOMER_ID = "cust-1"
WORKER_ID = "work-1"
STRANGER_ID = "stranger-1"
BOOKING_ID = "book-1"
WORKER_PHONE = "+919000000002"
CUSTOMER_PHONE = "+919000000001"


def _reset():
    _STORE.clear()
    _STORE[_key(f"COGNITO#{CUSTOMER_SUB}", "USER")] = {"id": CUSTOMER_ID, "GSI2PK": f"COGNITO#{CUSTOMER_SUB}"}
    _STORE[_key(f"COGNITO#{WORKER_SUB}", "USER")] = {"id": WORKER_ID, "GSI2PK": f"COGNITO#{WORKER_SUB}"}
    _STORE[_key(f"COGNITO#{STRANGER_SUB}", "USER")] = {"id": STRANGER_ID, "GSI2PK": f"COGNITO#{STRANGER_SUB}"}
    _STORE[_key(f"USER#{CUSTOMER_ID}", "PROFILE")] = {"id": CUSTOMER_ID, "full_name": "Cust", "phone": CUSTOMER_PHONE}
    _STORE[_key(f"USER#{WORKER_ID}", "PROFILE")] = {"id": WORKER_ID, "full_name": "Work", "phone": WORKER_PHONE}
    _STORE[_key(f"BOOKING#{BOOKING_ID}", "METADATA")] = {
        "id": BOOKING_ID, "customer_id": CUSTOMER_ID, "worker_id": WORKER_ID,
        "status": "accepted", "service_name": "AC Repair",
        "scheduled_date": "2026-02-01", "scheduled_time": "10:00",
        "customer_name": "Cust", "worker_name": "Work",
        "notes": "AC not cooling",
    }


def _event(sub, role, message, booking_id=None):
    body = {"message": message}
    if booking_id is not None:
        body["booking_id"] = booking_id
    return {
        "httpMethod": "POST",
        "resource": "/api/assistant/chat",
        "requestContext": {"authorizer": {"claims": {
            "sub": sub, "custom:role": role, "email": "x@y.com", "custom:full_name": "X",
        }}},
        "body": json.dumps(body),
    }


def _chat(sub, role, message, booking_id=None):
    resp = handler.lambda_handler(_event(sub, role, message, booking_id), None)
    body = json.loads(resp["body"]) if resp.get("body") else {}
    return resp["statusCode"], body, resp["body"] or ""


class TestFallbackMode(unittest.TestCase):
    """AI disabled -> rule-based fallback answers (Rs.0 mode)."""

    def setUp(self):
        _reset()
        self._p = mock.patch.object(ai_provider, "is_enabled", return_value=False)
        self._p.start()

    def tearDown(self):
        self._p.stop()

    def test_customer_gets_answer(self):
        code, body, _ = _chat(CUSTOMER_SUB, "customer", "My AC isn't cooling")
        self.assertEqual(code, 200)
        self.assertEqual(body["source"], "fallback")
        self.assertTrue(len(body["answer"]) > 0)
        self.assertEqual(body["role"], "customer")

    def test_worker_gets_answer(self):
        code, body, _ = _chat(WORKER_SUB, "worker", "washing machine job tomorrow, what to prepare")
        self.assertEqual(code, 200)
        self.assertTrue(len(body["answer"]) > 0)
        self.assertEqual(body["role"], "worker")

    def test_empty_message_rejected(self):
        code, body, _ = _chat(CUSTOMER_SUB, "customer", "   ")
        self.assertEqual(code, 400)


class TestBackendAuthorization(unittest.TestCase):
    """The AI never authorizes; handler enforces booking ownership."""

    def setUp(self):
        _reset()
        self._p = mock.patch.object(ai_provider, "is_enabled", return_value=False)
        self._p.start()

    def tearDown(self):
        self._p.stop()

    def test_owner_customer_gets_booking_context(self):
        code, body, _ = _chat(CUSTOMER_SUB, "customer", "when is my technician coming?", BOOKING_ID)
        self.assertEqual(code, 200)
        self.assertTrue(body["has_booking_context"])

    def test_assigned_worker_gets_booking_context(self):
        code, body, _ = _chat(WORKER_SUB, "worker", "what did the customer report?", BOOKING_ID)
        self.assertEqual(code, 200)
        self.assertTrue(body["has_booking_context"])

    def test_stranger_gets_no_booking_context(self):
        # Stranger references a booking they don't belong to -> context ignored
        code, body, _ = _chat(STRANGER_SUB, "customer", "show me this booking", BOOKING_ID)
        self.assertEqual(code, 200)
        self.assertFalse(body["has_booking_context"])

    def test_nonexistent_booking_no_context(self):
        code, body, _ = _chat(CUSTOMER_SUB, "customer", "status?", "no-such-booking")
        self.assertEqual(code, 200)
        self.assertFalse(body["has_booking_context"])


class TestPrivacy(unittest.TestCase):
    """Phone numbers / emails must never reach the client."""

    def setUp(self):
        _reset()

    def test_no_phone_in_fallback_with_context(self):
        with mock.patch.object(ai_provider, "is_enabled", return_value=False):
            _, _, raw = _chat(WORKER_SUB, "worker", "customer contact details", BOOKING_ID)
        self.assertNotIn(CUSTOMER_PHONE, raw)
        self.assertNotIn(CUSTOMER_PHONE.lstrip("+"), raw)

    def test_ai_output_contact_details_are_stripped(self):
        # Even if the model leaks a phone/email, the handler redacts it
        leaked = f"You can reach them at {CUSTOMER_PHONE} or cust@example.com"
        with mock.patch.object(ai_provider, "is_enabled", return_value=True), \
             mock.patch.object(ai_provider, "generate",
                               return_value={"status": ai_provider.STATUS_OK, "text": leaked}):
            _, body, raw = _chat(CUSTOMER_SUB, "customer", "how do I contact my tech?", BOOKING_ID)
        self.assertNotIn(CUSTOMER_PHONE, raw)
        self.assertNotIn("cust@example.com", raw)
        self.assertIn("[hidden]", body["answer"])


class TestAIProviderStates(unittest.TestCase):

    def setUp(self):
        _reset()

    def test_ai_ok_returns_ai_source(self):
        with mock.patch.object(ai_provider, "is_enabled", return_value=True), \
             mock.patch.object(ai_provider, "generate",
                               return_value={"status": ai_provider.STATUS_OK, "text": "Try cleaning the filter."}):
            code, body, _ = _chat(CUSTOMER_SUB, "customer", "AC not cooling")
        self.assertEqual(code, 200)
        self.assertEqual(body["source"], "ai")

    def test_provider_error_falls_back(self):
        with mock.patch.object(ai_provider, "is_enabled", return_value=True), \
             mock.patch.object(ai_provider, "generate",
                               return_value={"status": ai_provider.STATUS_PROVIDER_ERROR}):
            code, body, _ = _chat(CUSTOMER_SUB, "customer", "AC not cooling")
        self.assertEqual(code, 200)
        self.assertEqual(body["source"], "fallback")

    def test_ai_empty_text_falls_back(self):
        with mock.patch.object(ai_provider, "is_enabled", return_value=True), \
             mock.patch.object(ai_provider, "generate",
                               return_value={"status": ai_provider.STATUS_OK, "text": "  "}):
            code, body, _ = _chat(CUSTOMER_SUB, "customer", "AC not cooling")
        self.assertEqual(code, 200)
        self.assertEqual(body["source"], "fallback")


class TestProviderConfigGate(unittest.TestCase):

    def test_disabled_by_default(self):
        for k in ("AI_ENABLED", "BEDROCK_MODEL_ID", "BEDROCK_REGION"):
            os.environ.pop(k, None)
        self.assertFalse(ai_provider.is_enabled())
        res = ai_provider.generate("sys", "hi", "")
        self.assertEqual(res["status"], ai_provider.STATUS_NOT_CONFIGURED)

    def test_enabled_requires_all_three(self):
        os.environ["AI_ENABLED"] = "true"
        os.environ["BEDROCK_MODEL_ID"] = ""
        os.environ["BEDROCK_REGION"] = "us-east-1"
        self.assertFalse(ai_provider.is_enabled())
        os.environ.pop("AI_ENABLED", None)
        os.environ.pop("BEDROCK_REGION", None)


if __name__ == "__main__":
    unittest.main(verbosity=2)
