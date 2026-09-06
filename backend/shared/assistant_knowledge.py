"""
Connect360 - Assistant Knowledge Base (rule-based fallback + prompt content)

Two jobs:
  1. Provide the SYSTEM PROMPT text (role + rules + capabilities) used when
     Bedrock AI is enabled.
  2. Provide a rule-based fallback answer when AI is disabled (Rs.0 mode) or the
     provider errors, so the assistant always responds usefully.

IMPORTANT:
  - This module does NOT authorize anything and does NOT read the database.
    The Lambda handler injects only already-authorized, already-redacted context.
  - Troubleshooting guidance here is generic/safe (no dangerous instructions).
"""

# =============================================================================
# System prompts (used when Bedrock AI is enabled)
# =============================================================================

_COMMON_RULES = (
    "You are the Connect360 assistant for a home-services marketplace. "
    "Be concise, friendly, and practical. "
    "Never reveal phone numbers, emails, addresses, or any personal contact "
    "details of other users. "
    "Never claim to access data you were not given. "
    "If you are unsure or the request needs a human, suggest contacting support. "
    "Do not invent prices; only state pricing if it is provided in the context. "
    "Only give safe troubleshooting steps; tell users to call a professional for "
    "anything involving gas, high-voltage, or safety risk."
)

_CUSTOMER_SCOPE = (
    "The user is a CUSTOMER. You may help with: understanding their service "
    "problem, basic safe troubleshooting, choosing the right service category, "
    "how to book/reschedule/cancel per platform rules, explaining booking status "
    "(pending/accepted/in_progress/completed), what to prepare before the "
    "technician arrives, and how to use chat/calling. "
    "You must NOT reveal other customers' or technicians' private details."
)

_WORKER_SCOPE = (
    "The user is a WORKER (technician). You may help with: understanding the "
    "customer's requested service for their OWN assigned booking, safe "
    "troubleshooting/preparation checklists, job completion steps (photos, notes, "
    "parts used, confirmation), and their own schedule. "
    "You must NOT reveal other customers' private details or other workers' data."
)


def build_system_prompt(role):
    scope = _WORKER_SCOPE if role == "worker" else _CUSTOMER_SCOPE
    return f"{_COMMON_RULES}\n\n{scope}"


# =============================================================================
# Rule-based fallback (used when AI disabled or provider error)
# =============================================================================

# Safe, generic troubleshooting guides keyed by simple keywords.
_TROUBLESHOOTING = {
    "ac": [
        "Check the thermostat is set to 'cool' and below room temperature.",
        "Clean or replace the air filter — a clogged filter reduces cooling.",
        "Ensure the outdoor unit is not blocked and has airflow.",
        "If it still doesn't cool, the refrigerant or compressor may need a "
        "professional — book an AC technician.",
    ],
    "refrigerator": [
        "Confirm the temperature dial isn't set too warm.",
        "Check the door seals close fully and vents aren't blocked by food.",
        "A continuous loud noise or no cooling usually needs a technician.",
    ],
    "fridge": [
        "Confirm the temperature dial isn't set too warm.",
        "Check the door seals and that vents aren't blocked.",
        "No cooling or loud noise usually needs a technician.",
    ],
    "washing machine": [
        "If it won't drain: check the drain hose for kinks/blockage and clean "
        "the filter.",
        "If it won't start: confirm power, water supply, and that the door is "
        "latched.",
        "Persistent draining or motor issues need a technician.",
    ],
    "plumbing": [
        "For a leak: turn off the local shut-off valve to limit water.",
        "For a clog: avoid chemical mixes; a plunger may help minor blockages.",
        "Hidden leaks or no water usually need a plumber.",
    ],
    "electrical": [
        "For a tripped breaker: unplug devices on that circuit and reset once.",
        "Never open outlets or panels yourself — electrical work is unsafe.",
        "Repeated tripping or sparking needs a licensed electrician immediately.",
    ],
}

_WORKER_PREP = {
    "ac": [
        "Carry gauge set, cleaning tools, spare filter, and refrigerant if "
        "certified.",
        "Confirm indoor + outdoor unit access with the customer.",
    ],
    "washing machine": [
        "Bring drain-cleaning tools, spare filter, and multimeter.",
        "Check model number in the booking notes if available.",
    ],
    "plumbing": [
        "Carry wrenches, sealant, spare washers, and a bucket.",
        "Confirm the water shut-off location on arrival.",
    ],
    "electrical": [
        "Bring a tester, insulated tools, and spare fuses/breakers.",
        "Confirm power can be safely isolated before work.",
    ],
}


def _match_topic(text, table):
    t = (text or "").lower()
    for key, steps in table.items():
        if key in t:
            return key, steps
    return None, None


def fallback_answer(role, message, context_text=""):
    """
    Produce a helpful rule-based reply without any LLM.
    Never includes private data (caller passes only safe context_text).
    """
    msg = (message or "").strip().lower()

    # Escalation intent
    if any(w in msg for w in ("complaint", "escalate", "support", "human", "refund")):
        return (
            "I can help you escalate this. You can contact Connect360 support or "
            "raise a complaint from your bookings page, and our team will follow up."
        )

    # Booking status / process
    if any(w in msg for w in ("status", "when", "arrive", "coming", "reschedule", "cancel", "book")):
        base = (
            "Bookings move through: pending -> accepted -> in progress -> completed. "
            "You can view the current status on your bookings page."
        )
        if context_text:
            base += f"\n\n{context_text}"
        if role == "customer":
            base += (
                "\nTo reschedule or cancel, open the booking; cancellation is "
                "allowed while it is pending or accepted."
            )
        return base

    # Troubleshooting / preparation
    if role == "worker":
        key, steps = _match_topic(msg, _WORKER_PREP)
        if steps:
            return "Preparation checklist:\n- " + "\n- ".join(steps)
    key, steps = _match_topic(msg, _TROUBLESHOOTING)
    if steps:
        return "Here are some safe steps to try:\n- " + "\n- ".join(steps)

    # Service info
    if any(w in msg for w in ("service", "services", "offer", "provide", "price", "cost", "charge")):
        text = (
            "Connect360 offers home services like plumbing, electrical, cleaning, "
            "AC/HVAC, painting, carpentry, and appliance repair. "
            "You can browse services and see each professional's hourly rate on "
            "their profile."
        )
        return text

    # Generic help
    if role == "worker":
        return (
            "I can help with your assigned jobs: understanding the requested "
            "service, preparation checklists, safe troubleshooting, and completion "
            "steps (photos, notes, parts, confirmation). What do you need?"
        )
    return (
        "I can help you troubleshoot a problem, choose the right service, "
        "understand your booking status, or prepare for your technician's visit. "
        "What would you like help with?"
    )
