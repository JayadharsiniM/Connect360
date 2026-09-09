"""
Connect360 - AI Assistant Lambda (role-aware)

Routes:
  POST /api/assistant/chat   -> answer a natural-language question

AUTHORIZATION MODEL (critical):
  - The AI NEVER authorizes anything. This handler enforces all access control.
  - Role (customer/worker/admin) comes from the Cognito JWT claims.
  - Optional booking context is loaded ONLY after verifying the caller owns /
    is assigned to that booking. Otherwise it is ignored.
  - Booking context is REDACTED (no phone numbers, emails, or addresses of the
    other party) before it is ever passed to the AI or returned to the client.
  - If AI is disabled or errors, a safe rule-based answer is returned.
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'shared'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'shared'))

from db import get_item, query_items, decimal_to_float
from response import success, error, forbidden, server_error
from auth_helpers import get_user_sub, get_user_role, get_body
import ai_provider
import assistant_knowledge


_ACTIVE_STATUSES = ('accepted', 'in_progress')
_MAX_MESSAGE_LEN = 1000


def lambda_handler(event, context):
    method = event.get('httpMethod', '')
    resource = event.get('resource', '')

    try:
        if method == 'POST' and '/assistant/chat' in resource:
            return chat(event)
        return error('Route not found', status_code=404)
    except Exception as e:  # noqa: BLE001
        print(f"[assistant] Error: {type(e).__name__}")
        return server_error('Assistant is unavailable right now')


def _get_user_id_from_sub(cognito_sub):
    items = query_items(f'COGNITO#{cognito_sub}', sk_begins_with='USER', index_name='GSI2')
    return items[0].get('id') if items else None


def chat(event):
    """POST /api/assistant/chat  { message, booking_id?, image_base64?, language?, history? }"""
    role = get_user_role(event)
    if role not in ('customer', 'worker', 'admin'):
        return forbidden('Not allowed')

    user_id = _get_user_id_from_sub(get_user_sub(event))
    if not user_id:
        return error('User not found')

    body = get_body(event)
    message = (body.get('message') or '').strip()
    booking_id = (body.get('booking_id') or '').strip()
    image_base64 = body.get('image_base64') or None
    language = (body.get('language') or 'en').strip()
    history = body.get('history') or []

    if not message:
        return error('Please enter a question')
    if len(message) > _MAX_MESSAGE_LEN:
        message = message[:_MAX_MESSAGE_LEN]

    context_text = _build_authorized_context(user_id, role, booking_id)
    system_prompt = assistant_knowledge.build_system_prompt(role)

    ai_result = ai_provider.generate(
        system_prompt, message, context_text,
        image_base64=image_base64, language=language, history=history
    )

    structured = None
    workers = []

    if ai_result.get('status') == ai_provider.STATUS_OK:
        answer = ai_result.get('text', '').strip()
        structured = ai_result.get('structured')
        source = 'ai'
        if not answer:
            answer = assistant_knowledge.fallback_answer(role, message, context_text)
            source = 'fallback'
        elif structured and role == 'customer':
            # All required fields collected and user confirmed
            if structured.get('confirmed') and not structured.get('missing_fields'):
                if structured.get('is_urgent'):
                    # Urgent → steer toward Priority Booking
                    answer += (
                        "\n\n⚡ Since this is urgent, I recommend using **Priority Booking** — "
                        "our system will automatically match you with the best available worker right away."
                    )
                    structured['suggest_priority'] = True
                else:
                    # Non-urgent confirmed → fetch matching workers
                    service_type = structured.get('service_type') or ''
                    workers = _fetch_recommended_workers(service_type)
    else:
        answer = assistant_knowledge.fallback_answer(role, message, context_text)
        source = 'fallback'

    answer = _strip_contact_details(answer)

    return success({
        'answer': answer,
        'role': role,
        'source': source,
        'has_booking_context': bool(context_text),
        'structured': structured,
        'workers': workers,
    })


def _fetch_recommended_workers(service_type):
    """Query GSI1 for active workers offering the given service type."""
    if not service_type:
        return []
    try:
        items = query_items(f'SERVICE#{service_type.lower()}', sk_begins_with='WORKER', index_name='GSI1')
        workers = []
        for item in items[:5]:
            item = decimal_to_float(item)
            workers.append({
                'id': item.get('id'),
                'name': item.get('name'),
                'rating': item.get('rating'),
                'hourly_rate': item.get('hourly_rate'),
                'area': item.get('area'),
            })
        return workers
    except Exception as e:  # noqa: BLE001
        print(f"[assistant] Worker fetch error: {type(e).__name__}")
        return []


def _build_authorized_context(user_id, role, booking_id):
    """
    Returns a short, REDACTED context string for the given booking ONLY if the
    caller is the booking's customer or assigned worker. Otherwise returns "".
    Never includes phone numbers, emails, or addresses of the other party.
    """
    if not booking_id:
        return ""

    booking = get_item(f'BOOKING#{booking_id}', 'METADATA')
    if not booking:
        return ""

    customer_id = booking.get('customer_id')
    worker_id = booking.get('worker_id')

    if user_id not in (customer_id, worker_id):
        return ""

    booking = decimal_to_float(booking)

    parts = [
        "Booking context (for this user's own booking):",
        f"- Service: {booking.get('service_name', 'N/A')}",
        f"- Status: {booking.get('status', 'N/A')}",
        f"- Scheduled: {booking.get('scheduled_date', 'N/A')} {booking.get('scheduled_time', '')}".strip(),
    ]

    if role == 'customer':
        parts.append(f"- Assigned technician: {booking.get('worker_name', 'to be assigned')}")
    elif role == 'worker':
        parts.append(f"- Customer: {booking.get('customer_name', 'N/A')}")
        if booking.get('notes'):
            parts.append(f"- Customer notes: {booking.get('notes')}")

    is_active = booking.get('status') in _ACTIVE_STATUSES
    parts.append(f"- Active: {'yes' if is_active else 'no'}")

    return "\n".join(parts)


def _strip_contact_details(text):
    """Defensive redaction: remove phone numbers and emails from outgoing answer."""
    import re
    if not text:
        return text
    text = re.sub(r'[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}', '[hidden]', text)
    text = re.sub(r'(?<!\d)(\+?\d[\d\s\-]{8,}\d)(?!\d)', '[hidden]', text)
    return text
