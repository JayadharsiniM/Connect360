"""
Connect360 - AI Provider Adapter (Amazon Bedrock)

Isolates all LLM-provider-specific logic behind a single interface so the model
or provider can be swapped without touching assistant/business logic.

Active model: Amazon Nova Micro on Amazon Bedrock (cheapest text model).

DESIGN:
  - Disabled by default. If AI_ENABLED != "true" OR credentials/region missing,
    generate() returns {status: "not_configured"} and the caller falls back to
    the rule-based knowledge base. This keeps the feature at Rs.0 out of the box.
  - Hard token cap on output to bound per-request cost.
  - Bedrock is called in its own region (default us-east-1) via boto3; the rest
    of the stack stays in ap-south-1.

SECURITY:
  - No credentials are handled here directly (uses the Lambda's IAM role).
  - Never logs prompt contents, user data, or model output at INFO level.
  - Returns only text; the caller is responsible for authorization + redaction.
"""

import os
import json

# Result status constants
STATUS_OK = "ok"
STATUS_NOT_CONFIGURED = "not_configured"
STATUS_PROVIDER_ERROR = "provider_error"

# Bound output tokens to cap cost per request (Nova Micro is very cheap, but
# we still cap defensively).
_MAX_OUTPUT_TOKENS = int(os.environ.get("AI_MAX_OUTPUT_TOKENS", "400"))
_TEMPERATURE = float(os.environ.get("AI_TEMPERATURE", "0.3"))


def is_enabled():
    """
    True only if AI is explicitly enabled and a model id + region are present.
    Off by default -> Rs.0 and rule-based fallback is used.
    """
    enabled = os.environ.get("AI_ENABLED", "").strip().lower() == "true"
    model_id = os.environ.get("BEDROCK_MODEL_ID", "").strip()
    region = os.environ.get("BEDROCK_REGION", "").strip()
    return bool(enabled and model_id and region)


def generate(system_prompt, user_message, context_text=""):
    """
    Generate an assistant reply.

    Args:
        system_prompt: role + rules + capability scope (built by the caller)
        user_message:  the end user's natural-language question
        context_text:  already-authorized, already-redacted booking/service
                       context (the caller guarantees no private data here)

    Returns:
        dict:
          {"status": "ok", "text": "..."}                 on success
          {"status": "not_configured"}                    when AI disabled
          {"status": "provider_error"}                    on any provider failure
    """
    if not is_enabled():
        return {"status": STATUS_NOT_CONFIGURED}

    try:
        return _bedrock_generate(system_prompt, user_message, context_text)
    except Exception as e:  # noqa: BLE001 - defensive; never leak prompt/model detail
        print(f"[ai_provider] Bedrock error: {type(e).__name__}")
        return {"status": STATUS_PROVIDER_ERROR}


def _bedrock_generate(system_prompt, user_message, context_text):
    """
    Call Amazon Bedrock using the Converse API (uniform across models incl. Nova).
    """
    import boto3

    model_id = os.environ.get("BEDROCK_MODEL_ID", "")
    region = os.environ.get("BEDROCK_REGION", "us-east-1")

    client = boto3.client("bedrock-runtime", region_name=region)

    # Combine context into the user turn so the system prompt stays purely
    # about role + rules.
    user_content = user_message
    if context_text:
        user_content = f"{context_text}\n\nUser question: {user_message}"

    response = client.converse(
        modelId=model_id,
        system=[{"text": system_prompt}],
        messages=[{"role": "user", "content": [{"text": user_content}]}],
        inferenceConfig={
            "maxTokens": _MAX_OUTPUT_TOKENS,
            "temperature": _TEMPERATURE,
        },
    )

    text = _extract_text(response)
    if not text:
        return {"status": STATUS_PROVIDER_ERROR}
    return {"status": STATUS_OK, "text": text}


def _extract_text(response):
    """Extract the assistant text from a Bedrock Converse response, safely."""
    try:
        content = response["output"]["message"]["content"]
        parts = [c.get("text", "") for c in content if isinstance(c, dict)]
        return "".join(parts).strip()
    except (KeyError, TypeError, AttributeError):
        return ""
