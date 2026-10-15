"""
Connect360 - Arrival OTP verification (Ola/Uber-style)

A 6-digit OTP shown to the CUSTOMER in their app. When the worker arrives they
ask for it and enter it in their dashboard; the backend verifies it and only
then moves the booking accepted -> in_progress. Clicking a button never changes
the status — the server-side OTP check does.

STORAGE (activity table, short-lived with TTL):
    PK = OTP#{booking_id}, SK = ARRIVAL
    fields: code_hash, salt, code (for owner re-display only), expires_at,
            attempts, verified, created_at, last_regen_at, TTL

SECURITY:
  - Code is generated with secrets.randbelow (cryptographically secure).
  - A SHA-256(salt + code) hash is used for the worker verify path; comparison
    is constant-time (hmac.compare_digest).
  - The plaintext code is returned ONLY to the owning customer (for re-display,
    which the spec explicitly allows). It is NEVER returned to the worker or in
    the worker verify response.
  - Expiry, attempt cap, and regeneration cooldown are enforced.
  - Once verified, the code is cleared and never shown again.
"""

import os
import hmac
import hashlib
import secrets
from datetime import datetime, timezone, timedelta

from db import get_item, put_item, now_iso, decimal_to_float, activity_table

OTP_TTL_SECONDS = int(os.environ.get("ARRIVAL_OTP_TTL_SECONDS", "900"))      # 15 min
OTP_MAX_ATTEMPTS = int(os.environ.get("ARRIVAL_OTP_MAX_ATTEMPTS", "5"))
OTP_REGEN_COOLDOWN_SECONDS = int(os.environ.get("ARRIVAL_OTP_REGEN_COOLDOWN", "30"))

# Booking statuses for which an arrival OTP is valid to issue/verify.
_OTP_ELIGIBLE_STATUS = "accepted"


# =============================================================================
# Helpers
# =============================================================================
def _now():
    return datetime.now(timezone.utc)


def _parse(ts):
    if not ts:
        return None
    try:
        dt = datetime.fromisoformat(str(ts))
    except ValueError:
        return None
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


def _generate_code():
    """Cryptographically secure 6-digit code (000000-999999)."""
    return f"{secrets.randbelow(1_000_000):06d}"


def _hash(salt, code):
    return hashlib.sha256(f"{salt}{code}".encode()).hexdigest()


def _otp_key(booking_id):
    return (f"OTP#{booking_id}", "ARRIVAL")


def _get_record(booking_id):
    pk, sk = _otp_key(booking_id)
    return get_item(pk, sk, table_ref=activity_table)


def _is_expired(record):
    exp = _parse(record.get("expires_at"))
    return exp is None or _now() >= exp


def _write_record(booking_id, code, created_now, prior=None):
    """Create/replace the OTP record for a booking."""
    salt = secrets.token_hex(8)
    expires = created_now + timedelta(seconds=OTP_TTL_SECONDS)
    pk, sk = _otp_key(booking_id)
    item = {
        "PK": pk,
        "SK": sk,
        "booking_id": booking_id,
        "code": code,                       # owner re-display only
        "code_hash": _hash(salt, code),
        "salt": salt,
        "expires_at": expires.isoformat(),
        "attempts": 0,
        "verified": False,
        "created_at": created_now.isoformat(),
        "last_regen_at": created_now.isoformat(),
        # Auto-clean the OTP a little after it expires.
        "TTL": int((created_now + timedelta(seconds=OTP_TTL_SECONDS + 300)).timestamp()),
    }
    put_item(item, table_ref=activity_table)
    return item


def _public_status(record):
    """Validity metadata safe for either party (no code)."""
    exp = _parse(record.get("expires_at"))
    return {
        "expires_at": record.get("expires_at"),
        "valid": not record.get("verified") and not _is_expired(record),
        "verified": bool(record.get("verified")),
        "seconds_remaining": max(0, int((exp - _now()).total_seconds())) if exp else 0,
    }


# =============================================================================
# Customer: get / regenerate the OTP (owning customer only)
# =============================================================================
def get_customer_otp(booking, regenerate=False):
    """
    Return the active OTP for the booking owner. Creates one on first request
    for an accepted booking. `regenerate` forces a new code (cooldown enforced).

    Returns (payload_dict, error_or_None). The payload includes the plaintext
    `otp` ONLY when valid and unverified (owner-side re-display).
    """
    booking_id = booking["id"]
    status = booking.get("status")

    # Once the service has started/finished, the OTP is done — never show it.
    if status != _OTP_ELIGIBLE_STATUS:
        record = _get_record(booking_id)
        if record and record.get("verified"):
            return {"otp": None, "status": "verified",
                    "message": "Arrival already verified."}, None
        if status in ("in_progress", "completed"):
            return {"otp": None, "status": status,
                    "message": "Arrival verification is no longer required."}, None
        return None, "Arrival OTP is only available after the worker accepts."

    record = _get_record(booking_id)
    now = _now()

    if record and record.get("verified"):
        return {"otp": None, "status": "verified",
                "message": "Arrival already verified."}, None

    if regenerate:
        if record:
            last = _parse(record.get("last_regen_at")) or _parse(record.get("created_at"))
            if last and (now - last).total_seconds() < OTP_REGEN_COOLDOWN_SECONDS:
                wait = OTP_REGEN_COOLDOWN_SECONDS - int((now - last).total_seconds())
                return None, f"Please wait {wait}s before requesting a new code."
        record = _write_record(booking_id, _generate_code(), now)
    elif not record or _is_expired(record):
        # No record yet, or the previous one expired -> issue a fresh code.
        record = _write_record(booking_id, _generate_code(), now)

    payload = _public_status(record)
    payload["otp"] = record.get("code") if payload["valid"] else None
    payload["status"] = "active" if payload["valid"] else "expired"
    return payload, None


# =============================================================================
# Worker: verify the OTP (atomic verify + status transition)
# =============================================================================
def verify_arrival_otp(booking, submitted_code):
    """
    Verify a worker-submitted code against the active OTP. On success, mark the
    OTP verified and move the booking accepted -> in_progress.

    Returns (result_dict, error_or_None, http_status). Never returns the code.
    `result_dict` on success: {verified: True, status: 'in_progress'}.
    """
    booking_id = booking["id"]
    status = booking.get("status")

    # Idempotency / lifecycle guards.
    if status == "in_progress":
        return {"verified": True, "status": "in_progress",
                "message": "Arrival already verified."}, None, 200
    if status != _OTP_ELIGIBLE_STATUS:
        return None, "This booking is not awaiting arrival verification.", 409

    code = (submitted_code or "").strip()
    if not (code.isdigit() and len(code) == 6):
        return None, "Enter the 6-digit code from the customer's app.", 400

    record = _get_record(booking_id)
    if not record:
        return None, "No active code. Ask the customer to open their booking.", 409
    if record.get("verified"):
        return {"verified": True, "status": "in_progress",
                "message": "Arrival already verified."}, None, 200
    if _is_expired(record):
        return None, "The code has expired. Ask the customer to regenerate it.", 410

    attempts = int(record.get("attempts", 0))
    if attempts >= OTP_MAX_ATTEMPTS:
        return None, "Too many incorrect attempts. Ask the customer to regenerate the code.", 429

    expected = record.get("code_hash", "")
    actual = _hash(record.get("salt", ""), code)
    if not hmac.compare_digest(expected, actual):
        # Count the failed attempt (best-effort).
        record["attempts"] = attempts + 1
        try:
            put_item(record, table_ref=activity_table)
        except Exception:  # noqa: BLE001
            pass
        remaining = max(0, OTP_MAX_ATTEMPTS - record["attempts"])
        return None, f"Incorrect code. {remaining} attempt(s) left.", 400

    # Correct code -> atomically flip the booking to in_progress using a
    # conditional transaction so concurrent/duplicate submits can't double-apply.
    from db import transact_write
    now = now_iso()
    table_name = os.environ.get("DYNAMODB_TABLE", "connect360-main-dev")
    try:
        transact_write([
            {
                "Update": {
                    "TableName": table_name,
                    "Key": {"PK": {"S": f"BOOKING#{booking_id}"}, "SK": {"S": "METADATA"}},
                    "UpdateExpression": (
                        "SET #s = :inprog, arrival_verified_at = :now, "
                        "GSI1PK = :gpk, GSI1SK = :gsk, updated_at = :now"
                    ),
                    "ConditionExpression": "#s = :accepted",
                    "ExpressionAttributeNames": {"#s": "status"},
                    "ExpressionAttributeValues": {
                        ":inprog": {"S": "in_progress"},
                        ":accepted": {"S": "accepted"},
                        ":gpk": {"S": "STATUS#in_progress"},
                        ":gsk": {"S": f"BOOKING#{now}"},
                        ":now": {"S": now},
                    },
                }
            }
        ])
    except Exception as e:  # noqa: BLE001 - condition failed = lost the race / already moved
        print(f"[otp] status transition failed: {type(e).__name__}")
        return None, "Could not start the service. Please refresh and try again.", 409

    # Mark the OTP verified + clear the code so it is never shown again.
    record["verified"] = True
    record["verified_at"] = now
    record["code"] = None
    try:
        put_item(record, table_ref=activity_table)
    except Exception:  # noqa: BLE001
        pass

    return {"verified": True, "status": "in_progress",
            "message": "Arrival verified. You can start the service."}, None, 200
