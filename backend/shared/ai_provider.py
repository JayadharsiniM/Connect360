"""
Connect360 - AI Provider Adapter

Provider is selected via AI_PROVIDER env var:
  "gemini"  -> Google Gemini API (key from Secrets Manager)
  "bedrock" -> Amazon Bedrock (Lambda IAM role)
  ""        -> disabled, rule-based fallback only

SECURITY:
  - Gemini key is fetched from Secrets Manager, never from env vars or code.
  - No credentials handled directly for Bedrock (uses Lambda IAM role).
  - Never logs prompt contents, user data, or model output at INFO level.
  - Returns only text; caller is responsible for authorization + redaction.
"""

import os
import json

STATUS_OK = "ok"
STATUS_NOT_CONFIGURED = "not_configured"
STATUS_PROVIDER_ERROR = "provider_error"

_MAX_OUTPUT_TOKENS = int(os.environ.get("AI_MAX_OUTPUT_TOKENS", "1024"))
_TEMPERATURE = float(os.environ.get("AI_TEMPERATURE", "0.3"))

# In-process cache for the Gemini API key (avoids Secrets Manager call per request)
_gemini_key_cache = None


def _get_provider():
    return os.environ.get("AI_PROVIDER", "").strip().lower()


def is_enabled():
    provider = _get_provider()
    if provider == "gemini":
        return bool(os.environ.get("GEMINI_SECRET_NAME", "").strip())
    if provider == "bedrock":
        return bool(
            os.environ.get("BEDROCK_MODEL_ID", "").strip()
            and os.environ.get("BEDROCK_REGION", "").strip()
        )
    return False


def generate(system_prompt, user_message, context_text="", image_base64=None, language="en", history=None):
    """
    Generate an assistant reply.

    Returns:
        {"status": "ok", "text": "...", "structured": {...}}  on success
        {"status": "not_configured"}                          when AI disabled
        {"status": "provider_error"}                          on any failure
    """
    if not is_enabled():
        return {"status": STATUS_NOT_CONFIGURED}

    provider = _get_provider()
    try:
        if provider == "gemini":
            return _gemini_generate(system_prompt, user_message, context_text, image_base64, language, history)
        if provider == "bedrock":
            return _bedrock_generate(system_prompt, user_message, context_text)
    except Exception as e:  # noqa: BLE001
        print(f"[ai_provider] {provider} error: {type(e).__name__}: {e}")
    return {"status": STATUS_PROVIDER_ERROR}


# =============================================================================
# Gemini
# =============================================================================

def _get_gemini_key():
    global _gemini_key_cache
    if _gemini_key_cache:
        return _gemini_key_cache

    import boto3
    secret_name = os.environ.get("GEMINI_SECRET_NAME", "connect360/gemini-api-key")
    region = os.environ.get("GEMINI_SECRET_REGION", os.environ.get("AWS_REGION", "ap-south-1"))
    client = boto3.client("secretsmanager", region_name=region)
    resp = client.get_secret_value(SecretId=secret_name)
    raw = resp.get("SecretString", "")
    # Secret may be plain key string or JSON {"api_key": "..."}
    try:
        _gemini_key_cache = json.loads(raw).get("api_key", raw)
    except (json.JSONDecodeError, AttributeError):
        _gemini_key_cache = raw.strip()
    return _gemini_key_cache


def _gemini_generate(system_prompt, user_message, context_text, image_base64, language, history):
    import urllib.request

    api_key = _get_gemini_key()
    model = os.environ.get("GEMINI_MODEL", "gemini-1.5-flash")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

    # Build contents list
    contents = []

    # Inject conversation history — only last 6 turns to stay within token budget
    for turn in (history or [])[-6:]:
        role = "user" if turn.get("role") == "user" else "model"
        content = turn.get("content", "")
        # Strip any JSON envelope if the frontend accidentally stored raw bot JSON
        if role == "model" and content.strip().startswith("{"):
            try:
                parsed = json.loads(content)
                content = parsed.get("reply", content)
            except (json.JSONDecodeError, AttributeError):
                pass
        contents.append({"role": role, "parts": [{"text": content}]})

    # Build current user turn parts
    user_parts = []
    if context_text:
        user_parts.append({"text": f"{context_text}\n\nUser question: {user_message}"})
    else:
        user_parts.append({"text": user_message})

    if image_base64:
        user_parts.append({
            "inline_data": {"mime_type": "image/jpeg", "data": image_base64}
        })

    contents.append({"role": "user", "parts": user_parts})

    payload = {
        "system_instruction": {"parts": [{"text": system_prompt}]},
        "contents": contents,
        "generationConfig": {
            "maxOutputTokens": _MAX_OUTPUT_TOKENS,
            "temperature": _TEMPERATURE,
            "responseMimeType": "application/json",
        },
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    last_err = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                body = json.loads(resp.read())
            break
        except Exception as e:  # noqa: BLE001
            last_err = e
            if attempt < 2:
                import time; time.sleep(1)
    else:
        raise last_err

    raw_text = (
        body.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [{}])[0]
        .get("text", "")
        .strip()
    )

    if not raw_text:
        return {"status": STATUS_PROVIDER_ERROR}

    # Try to parse structured JSON envelope from Gemini
    structured = None
    text = raw_text
    try:
        # Gemini may wrap JSON in markdown code fences
        clean = raw_text.strip()
        if clean.startswith("```"):
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
        parsed = json.loads(clean.strip())
        if isinstance(parsed, dict) and "reply" in parsed:
            text = parsed["reply"]
            structured = parsed.get("structured")
    except (json.JSONDecodeError, IndexError):
        pass  # plain text response — that's fine

    return {"status": STATUS_OK, "text": text, "structured": structured}


# =============================================================================
# Bedrock (kept intact for future use)
# =============================================================================

def _bedrock_generate(system_prompt, user_message, context_text):
    import boto3

    model_id = os.environ.get("BEDROCK_MODEL_ID", "")
    region = os.environ.get("BEDROCK_REGION", "us-east-1")
    client = boto3.client("bedrock-runtime", region_name=region)

    user_content = user_message
    if context_text:
        user_content = f"{context_text}\n\nUser question: {user_message}"

    response = client.converse(
        modelId=model_id,
        system=[{"text": system_prompt}],
        messages=[{"role": "user", "content": [{"text": user_content}]}],
        inferenceConfig={"maxTokens": _MAX_OUTPUT_TOKENS, "temperature": _TEMPERATURE},
    )

    try:
        content = response["output"]["message"]["content"]
        text = "".join(c.get("text", "") for c in content if isinstance(c, dict)).strip()
    except (KeyError, TypeError):
        text = ""

    if not text:
        return {"status": STATUS_PROVIDER_ERROR}
    return {"status": STATUS_OK, "text": text, "structured": None}
