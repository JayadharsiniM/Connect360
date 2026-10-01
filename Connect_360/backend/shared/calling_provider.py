"""
Connect360 - Calling Provider Adapter (Number Privacy)

Isolates all telephony-provider-specific logic behind a single interface so the
provider can be swapped without touching booking logic.

Active provider: Twilio Voice (works with a free trial for testing).

MASKING MODEL (Twilio):
  Twilio calls the initiating party (caller) FROM your Twilio number, then a
  TwiML instruction <Dial>s the other party (callee). Both parties only ever
  see the Twilio number, never each other's real number.

TRIAL NOTES (informational only, not enforced in code):
  - Twilio trial can only call *verified* numbers.
  - Trial plays a short "trial account" message before connecting.
  - One free trial phone number is sufficient for testing; no purchase needed.

SECURITY NOTES:
  - Real phone numbers are NEVER returned to callers of this module beyond what
    is strictly needed to place the call. This module returns only a masked,
    number-free result to the handler.
  - Provider credentials are read from environment variables and are NEVER
    logged. Do not print the auth token anywhere.
  - If the provider is not configured (empty credentials), calls return a
    structured "not_configured" result instead of raising — the feature simply
    reports "unavailable" to the client.
"""

import os
import json
import base64
from urllib import request as urlrequest
from urllib import parse as urlparse
from urllib.error import HTTPError, URLError


# Result status constants (kept free of any phone numbers)
STATUS_INITIATED = "initiated"
STATUS_NOT_CONFIGURED = "not_configured"
STATUS_PROVIDER_ERROR = "provider_error"
STATUS_INVALID_NUMBERS = "invalid_numbers"


def _redact(value):
    """Return a safe, number-free placeholder for logging."""
    if not value:
        return "<empty>"
    return "<redacted>"


def is_configured():
    """
    True only if all required Twilio credentials + a from-number + TwiML URL
    are present. Never logs the actual values.
    """
    account_sid = os.environ.get("TWILIO_ACCOUNT_SID", "")
    auth_token = os.environ.get("TWILIO_AUTH_TOKEN", "")
    from_number = os.environ.get("TWILIO_FROM_NUMBER", "")
    twiml_url = os.environ.get("TWILIO_TWIML_URL", "")
    return bool(account_sid and auth_token and from_number and twiml_url)


def _normalize_number(raw):
    """
    Normalize/validate a phone number to E.164-ish form for Twilio.
    Returns the normalized number string, or None if it is clearly invalid.
    Does NOT log the number.

    Twilio requires E.164 (e.g. +919876543210). We accept numbers with or
    without a leading '+', but the digit count must be plausible.
    """
    if not raw:
        return None
    n = str(raw).strip().replace(" ", "").replace("-", "")
    has_plus = n.startswith("+")
    digits = n[1:] if has_plus else n
    if not digits.isdigit():
        return None
    # E.164 allows up to 15 digits; require at least 10 (local) up to 15.
    if len(digits) < 10 or len(digits) > 15:
        return None
    # Return in E.164 form (ensure leading +)
    return n if has_plus else f"+{digits}"


def initiate_masked_call(caller_number, callee_number, booking_id):
    """
    Bridge a call between caller and callee through a masked virtual number.

    Args:
        caller_number: real phone number of the party initiating (server-side only)
        callee_number: real phone number of the other party (server-side only)
        booking_id:    booking this call is associated with (for provider records)

    Returns:
        dict with a 'status' key and NO phone numbers. Possible statuses:
          - STATUS_INITIATED       call successfully placed (masked)
          - STATUS_NOT_CONFIGURED  provider credentials not set
          - STATUS_INVALID_NUMBERS one/both numbers missing or invalid
          - STATUS_PROVIDER_ERROR  provider rejected/failed the request
    """
    # Validate presence/format WITHOUT logging the numbers
    caller = _normalize_number(caller_number)
    callee = _normalize_number(callee_number)
    if not caller or not callee:
        return {"status": STATUS_INVALID_NUMBERS}

    if not is_configured():
        # Feature coded but provider not wired up yet — safe, no crash.
        return {"status": STATUS_NOT_CONFIGURED}

    return _twilio_connect(caller, callee, booking_id)


def _twilio_connect(caller, callee, booking_id):
    """
    Twilio Voice masked call.

    Twilio dials `caller` FROM the Twilio number, then the TwiML at
    TWILIO_TWIML_URL instructs Twilio to <Dial> the `callee`. Both parties see
    only the Twilio number.

    The callee number is passed to the TwiML endpoint via a query parameter so
    the TwiML can dial it. (A Twilio TwiML Bin or a small TwiML endpoint reads
    this parameter and returns <Response><Dial>{Callee}</Dial></Response>.)

    Reference shape:
      POST https://api.twilio.com/2010-04-01/Accounts/{SID}/Calls.json
        To=<caller>&From=<twilio_number>&Url=<twiml_url>?Callee=<callee>
    """
    account_sid = os.environ.get("TWILIO_ACCOUNT_SID", "")
    auth_token = os.environ.get("TWILIO_AUTH_TOKEN", "")
    from_number = os.environ.get("TWILIO_FROM_NUMBER", "")
    twiml_url = os.environ.get("TWILIO_TWIML_URL", "")

    api_base = os.environ.get("TWILIO_API_BASE", "https://api.twilio.com")
    url = f"{api_base}/2010-04-01/Accounts/{account_sid}/Calls.json"

    # Append the callee (and booking ref) to the TwiML URL so the TwiML can
    # dial the second leg. urlencode ensures the number is safely encoded.
    sep = "&" if "?" in twiml_url else "?"
    voice_url = f"{twiml_url}{sep}" + urlparse.urlencode({
        "Callee": callee,
        "BookingRef": str(booking_id),
    })

    form = {
        "To": caller,
        "From": from_number,
        "Url": voice_url,
    }
    data = urlparse.urlencode(form).encode("utf-8")

    # HTTP Basic auth with AccountSID:AuthToken — never logged
    auth_raw = f"{account_sid}:{auth_token}".encode("utf-8")
    auth_header = "Basic " + base64.b64encode(auth_raw).decode("ascii")

    req = urlrequest.Request(url, data=data, method="POST")
    req.add_header("Authorization", auth_header)
    req.add_header("Content-Type", "application/x-www-form-urlencoded")

    try:
        with urlrequest.urlopen(req, timeout=10) as resp:
            # We deliberately do NOT return the provider body (may contain numbers).
            # Only surface a non-sensitive provider call SID if present.
            body = resp.read().decode("utf-8", errors="ignore")
            call_ref = _extract_call_sid(body)
            return {"status": STATUS_INITIATED, "call_ref": call_ref}
    except HTTPError as e:
        # Log status code only — never the response body or credentials
        print(f"[calling_provider] Twilio HTTP error: status={e.code}")
        return {"status": STATUS_PROVIDER_ERROR}
    except (URLError, TimeoutError) as e:
        print(f"[calling_provider] Twilio connection error: {type(e).__name__}")
        return {"status": STATUS_PROVIDER_ERROR}
    except Exception as e:  # noqa: BLE001 - defensive, never leak details
        print(f"[calling_provider] Unexpected calling error: {type(e).__name__}")
        return {"status": STATUS_PROVIDER_ERROR}


def _extract_call_sid(body):
    """
    Best-effort extract of a non-sensitive provider call identifier.
    Twilio returns JSON with a top-level "sid". Returns None if not found.
    Never returns phone numbers.
    """
    try:
        parsed = json.loads(body)
        if isinstance(parsed, dict):
            return parsed.get("sid")
        return None
    except (json.JSONDecodeError, AttributeError, TypeError):
        return None
