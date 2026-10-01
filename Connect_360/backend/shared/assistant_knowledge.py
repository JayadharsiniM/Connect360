"""
Connect360 - Assistant Knowledge Base (rule-based fallback + prompt content)

Two jobs:
  1. Provide the SYSTEM PROMPT text (role + rules + capabilities) used when
     AI is enabled.
  2. Provide a rule-based fallback answer when AI is disabled or errors.

IMPORTANT:
  - This module does NOT authorize anything and does NOT read the database.
    The Lambda handler injects only already-authorized, already-redacted context.
"""

# =============================================================================
# System prompts
# =============================================================================

_COMMON_RULES = (
    "You are the Connect360 assistant for a home-services marketplace. "
    "Be concise, friendly, and practical. "
    "Never reveal phone numbers, emails, addresses, or personal contact details of other users. "
    "Never claim to access data you were not given. "
    "Do not invent prices. "
    "Only give safe troubleshooting steps; always recommend a professional for gas, high-voltage, or safety risks."
)

_CUSTOMER_SCOPE = (
    "The user is a CUSTOMER. Help with: diagnosing their home service problem, safe basic troubleshooting, "
    "choosing the right service category, booking guidance, booking status explanation "
    "(pending/accepted/in_progress/completed), and preparing for the technician's visit."
)

_WORKER_SCOPE = (
    "The user is a WORKER (technician). Help with: understanding the customer's service request for their "
    "OWN assigned booking, preparation checklists, safe troubleshooting, and job completion steps."
)

_STRUCTURED_INSTRUCTION = (
    "\n\nOUTPUT FORMAT — CRITICAL: Every single response MUST be a valid JSON object. No exceptions. No plain text.\n"
    "Format:\n"
    "{\"reply\": \"<your message>\", \"structured\": {\"service_type\": \"<service or null>\", "
    "\"is_urgent\": <true|false>, \"missing_fields\": [\"<field>\", ...], "
    "\"location\": \"<location or null>\", \"date\": \"<date or null>\", "
    "\"time\": \"<time or null>\", \"confirmed\": <true|false>}}\n\n"
    "Rules:\n"
    "1. When user wants to BOOK a service (e.g. 'I need a plumber', 'need cleaning', 'book electrician'): "
    "set service_type, then ask for any missing fields one at a time (location, date, time). "
    "Do NOT give troubleshooting steps when intent is clearly to book.\n"
    "2. Map common words: 'plumber'→plumbing, 'electrician'→electrical, 'cleaner'→cleaning, "
    "'carpenter'→carpentry, 'painter'→painting, 'tv/appliance repair'→appliance_repair.\n"
    "3. Set confirmed=true only when service_type, location, date, AND time are all known.\n"
    "4. missing_fields lists only what is still needed.\n"
    "5. For non-booking questions: service_type=null, is_urgent=false, missing_fields=[], confirmed=false.\n"
    "6. NEVER output plain text. ALWAYS output the JSON object."
)

_MULTILINGUAL_INSTRUCTION = (
    "\n\nLANGUAGE: Always reply in the same language the user wrote in. "
    "Tamil → Tamil, Hindi → Hindi, default English."
)


def build_system_prompt(role):
    scope = _WORKER_SCOPE if role == "worker" else _CUSTOMER_SCOPE
    return f"{_COMMON_RULES}\n\n{scope}{_STRUCTURED_INSTRUCTION}{_MULTILINGUAL_INSTRUCTION}"


# =============================================================================
# Rule-based fallback
# =============================================================================

_TROUBLESHOOTING = {
    "ac": [
        "Check the thermostat is set to 'cool' and below room temperature.",
        "Clean or replace the air filter — a clogged filter reduces cooling.",
        "Ensure the outdoor unit is not blocked and has airflow.",
        "If it still doesn't cool, the refrigerant or compressor may need a professional — book an AC technician.",
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
        "If it won't drain: check the drain hose for kinks/blockage and clean the filter.",
        "If it won't start: confirm power, water supply, and that the door is latched.",
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
        "Carry gauge set, cleaning tools, spare filter, and refrigerant if certified.",
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


_TOPIC_ALIASES = {
    "plumbing": ["plumb", "plumber", "pipe", "leak", "tap", "drain", "water"],
    "electrical": ["electric", "electrician", "wiring", "wire", "switch", "power", "breaker"],
    "ac": ["ac ", "a/c", "air condition", "hvac", "cool"],
    "refrigerator": ["refrigerator", "fridge"],
    "washing machine": ["washing", "washer", "laundry"],
}


def _match_topic(text, table):
    t = (text or "").lower()
    # Direct key match first
    for key in table:
        if key in t:
            return key, table[key]
    # Alias match
    for canonical, aliases in _TOPIC_ALIASES.items():
        if canonical in table and any(a in t for a in aliases):
            return canonical, table[canonical]
    return None, None


def fallback_answer(role, message, context_text=""):
    msg = (message or "").strip().lower()

    if any(w in msg for w in ("complaint", "escalate", "support", "human", "refund")):
        return (
            "I can help you escalate this. You can contact Connect360 support or "
            "raise a complaint from your bookings page, and our team will follow up."
        )

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

    if role == "worker":
        key, steps = _match_topic(msg, _WORKER_PREP)
        if steps:
            return "Preparation checklist:\n- " + "\n- ".join(steps)
    key, steps = _match_topic(msg, _TROUBLESHOOTING)
    if steps:
        return "Here are some safe steps to try:\n- " + "\n- ".join(steps)

    if any(w in msg for w in ("service", "services", "offer", "provide", "price", "cost", "charge")):
        return (
            "Connect360 offers home services like plumbing, electrical, cleaning, "
            "AC/HVAC, painting, carpentry, and appliance repair. "
            "You can browse services and see each professional's hourly rate on their profile."
        )

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
