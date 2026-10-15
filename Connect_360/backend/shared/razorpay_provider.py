"""
Connect360 - Razorpay Provider Adapter (TEST MODE ONLY)

Thin, dependency-free adapter around the Razorpay REST API, mirroring the design
of ai_provider.py:
  - Credentials are fetched from AWS Secrets Manager and cached in-process
    (never read from plain env vars, never logged, never returned to clients).
  - Only the Python standard library is used (urllib + hmac + hashlib), so no
    extra Lambda dependency/layer is required.

SECURITY / SAFETY:
  - RAZORPAY_MODE must be "test" (default). Any other value disables the
    integration so live keys can never be used by accident.
  - Only the PUBLIC key_id is ever exposed to the frontend. The key_secret and
    webhook_secret stay server-side.
  - Signature verification uses hmac.compare_digest (constant-time).

SECRET SHAPE (Secrets Manager JSON, name from RAZORPAY_SECRET_NAME):
    {
      "key_id": "rzp_test_xxxxxxxx",
      "key_secret": "xxxxxxxx",
      "webhook_secret": "xxxxxxxx"
    }
"""

import os
import json
import hmac
import hashlib
import base64
import urllib.request
import urllib.error

RAZORPAY_API_BASE = os.environ.get("RAZORPAY_API_BASE", "https://api.razorpay.com/v1")

STATUS_OK = "ok"
STATUS_NOT_CONFIGURED = "not_configured"
STATUS_PROVIDER_ERROR = "provider_error"

# In-process cache for the Razorpay credentials (avoids a Secrets Manager call
# on every invocation; Lambda reuses warm containers).
_creds_cache = None


class RazorpayConfigError(Exception):
    """Raised when Razorpay is not configured / not in test mode."""


def _mode():
    return os.environ.get("RAZORPAY_MODE", "test").strip().lower()


def is_test_mode():
    return _mode() == "test"


def is_configured():
    """True only when test mode is on AND a secret name is provided."""
    return is_test_mode() and bool(os.environ.get("RAZORPAY_SECRET_NAME", "").strip())


def _load_creds():
    """
    Fetch and cache {key_id, key_secret, webhook_secret} from Secrets Manager.
    Raises RazorpayConfigError if not configured or not in test mode.
    """
    global _creds_cache
    if _creds_cache:
        return _creds_cache

    if not is_test_mode():
        raise RazorpayConfigError(
            "RAZORPAY_MODE is not 'test' — refusing to run (test mode only).")

    secret_name = os.environ.get("RAZORPAY_SECRET_NAME", "").strip()
    if not secret_name:
        raise RazorpayConfigError("RAZORPAY_SECRET_NAME is not set.")

    import boto3
    region = os.environ.get("RAZORPAY_SECRET_REGION",
                            os.environ.get("AWS_REGION_NAME",
                                           os.environ.get("AWS_REGION", "ap-south-1")))
    client = boto3.client("secretsmanager", region_name=region)
    resp = client.get_secret_value(SecretId=secret_name)
    raw = resp.get("SecretString", "") or ""
    try:
        data = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        raise RazorpayConfigError("Razorpay secret must be JSON with key_id/key_secret.")

    key_id = (data.get("key_id") or "").strip()
    key_secret = (data.get("key_secret") or "").strip()
    webhook_secret = (data.get("webhook_secret") or "").strip()

    if not key_id or not key_secret:
        raise RazorpayConfigError("Razorpay secret missing key_id or key_secret.")

    # Extra safety net: refuse non-test keys even if mode slipped through.
    if not key_id.startswith("rzp_test_"):
        raise RazorpayConfigError(
            "Razorpay key_id is not a test key (must start with 'rzp_test_').")

    _creds_cache = {
        "key_id": key_id,
        "key_secret": key_secret,
        "webhook_secret": webhook_secret,
    }
    return _creds_cache


def get_public_key_id():
    """Return ONLY the public test key id — safe to send to the frontend."""
    return _load_creds()["key_id"]


# =============================================================================
# REST helper (HTTP Basic auth with key_id:key_secret)
# =============================================================================
def _request(method, path, body=None):
    creds = _load_creds()
    url = f"{RAZORPAY_API_BASE}{path}"
    token = base64.b64encode(
        f"{creds['key_id']}:{creds['key_secret']}".encode()).decode()
    headers = {
        "Authorization": f"Basic {token}",
        "Content-Type": "application/json",
    }
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        detail = ""
        try:
            detail = e.read().decode()[:500]
        except Exception:  # noqa: BLE001
            pass
        # Never log the request body (may contain amounts/notes); log status only.
        print(f"[razorpay] HTTP {e.code} on {method} {path}: {detail}")
        raise
    except Exception as e:  # noqa: BLE001
        print(f"[razorpay] request error on {method} {path}: {type(e).__name__}")
        raise


# =============================================================================
# Orders API — https://razorpay.com/docs/api/orders/create/
# =============================================================================
def create_order(amount_paise, currency, receipt, notes=None):
    """
    Create a Razorpay order. amount_paise is the integer smallest-unit amount.
    Returns the Razorpay order dict (contains 'id', 'amount', 'currency', ...).
    """
    payload = {
        "amount": int(amount_paise),
        "currency": currency,
        "receipt": receipt,
        "payment_capture": 1,  # auto-capture authorized payments
    }
    if notes:
        payload["notes"] = notes
    return _request("POST", "/orders", payload)


def fetch_order(order_id):
    return _request("GET", f"/orders/{order_id}")


def fetch_payment(payment_id):
    """Fetch a payment to confirm its real state (e.g. 'captured')."""
    return _request("GET", f"/payments/{payment_id}")


# =============================================================================
# Signature verification (checkout handshake + webhooks)
# =============================================================================
def verify_checkout_signature(order_id, payment_id, signature):
    """
    Verify the Razorpay Checkout handshake signature:
        HMAC_SHA256(order_id + "|" + payment_id, key_secret) == signature
    Constant-time comparison. Returns bool.
    """
    if not (order_id and payment_id and signature):
        return False
    creds = _load_creds()
    expected = hmac.new(
        creds["key_secret"].encode(),
        f"{order_id}|{payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def verify_webhook_signature(raw_body, signature):
    """
    Verify a Razorpay webhook signature over the RAW request body using the
    webhook secret. raw_body must be the exact bytes/str Razorpay sent.
    Returns bool.
    """
    if not signature:
        return False
    creds = _load_creds()
    webhook_secret = creds.get("webhook_secret")
    if not webhook_secret:
        print("[razorpay] webhook secret not configured; rejecting webhook")
        return False
    if isinstance(raw_body, str):
        raw_body = raw_body.encode()
    expected = hmac.new(
        webhook_secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)
