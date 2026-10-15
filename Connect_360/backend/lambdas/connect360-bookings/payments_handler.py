"""
Connect360 - Razorpay Payments handler (TEST MODE ONLY)

Lives inside the bookings Lambda (sibling of priority_handler.py /
reminders_handler.py) and shares the booking entity + DynamoDB single table, so
no new Lambda/IAM/packaging wiring is needed. Reuses the project's existing
auth, response and db helpers.

ENDPOINTS:
  POST /api/payments/create-order     (customer, Cognito-authed)
  POST /api/payments/verify           (customer, Cognito-authed)
  GET  /api/payments/{booking_id}     (customer/worker/admin, Cognito-authed)
  POST /api/payments/webhook          (NO Cognito — authenticated by signature)

PAYMENT DATA MODEL (DynamoDB single-table):
  PAYMENT#{payment_id} / METADATA        -> the payment record (source of truth)
  BOOKING#{booking_id} / PAYMENT          -> pointer to the active payment id
  RZP_ORDER#{order_id} / METADATA         -> order_id -> payment_id reverse lookup
  RZP_EVENT#{event_id} / EVENT            -> webhook idempotency guard (activity table, TTL)
  GSI1: PAYMENT_STATUS#{status}           -> admin listing by status

PAYMENT STATES (kept SEPARATE from booking.status):
  PENDING -> AUTHORIZED -> SUCCESSFUL ; FAILED ; REFUNDED / PARTIALLY_REFUNDED
A delayed FAILED event can never overwrite a SUCCESSFUL/REFUNDED payment.

SAFETY:
  - Amount is computed on the backend from the trusted booking record; the
    frontend-supplied amount/currency/status is ignored.
  - Verifying a payment NEVER changes booking.status (completion is independent).
  - All signature checks are constant-time; failures are treated as NOT paid.
"""

import os
from datetime import datetime, timezone, timedelta

from db import (put_item, get_item, update_item, query_items, query_all,
                generate_id, now_iso, decimal_to_float, table, activity_table)
from response import success, created, error, not_found, forbidden
from auth_helpers import get_user_sub, get_user_role, get_path_param, get_body
import razorpay_provider as rzp

CURRENCY = os.environ.get("PAYMENT_CURRENCY", "INR")

# Platform commission (take rate). Configurable; stored PER PAYMENT at capture
# time so historical records stay stable even if the rate changes later.
COMMISSION_RATE = float(os.environ.get("COMMISSION_RATE", "0.10"))


def _split_amount(amount_paise, rate):
    """
    Split a captured amount (paise) into platform commission + worker payout.
    Commission is rounded to the nearest paise; payout is the remainder so the
    two always sum back to the gross exactly.
    """
    amount_paise = int(amount_paise or 0)
    commission = int(round(amount_paise * rate))
    commission = max(0, min(commission, amount_paise))
    payout = amount_paise - commission
    return commission, payout

# Payment states
P_PENDING = "PENDING"
P_AUTHORIZED = "AUTHORIZED"
P_SUCCESSFUL = "SUCCESSFUL"
P_FAILED = "FAILED"
P_REFUNDED = "REFUNDED"
P_PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED"

# Terminal / protected states that a late/out-of-order event must not downgrade.
_PROTECTED_STATES = (P_SUCCESSFUL, P_REFUNDED, P_PARTIALLY_REFUNDED)

# Booking statuses for which taking a payment makes sense. A booking must be
# accepted by a worker (or beyond) before it is payable; cancelled/rejected are
# never payable.
_PAYABLE_BOOKING_STATUSES = ("accepted", "in_progress", "completed")

# Attempt states that may be retried with a brand new order.
_RETRIABLE_STATES = (P_FAILED,)


# =============================================================================
# Helpers
# =============================================================================
def _get_user_id_from_sub(cognito_sub):
    items = query_items(f'COGNITO#{cognito_sub}', sk_begins_with='USER', index_name='GSI2')
    return items[0].get('id') if items else None


def _to_paise(amount_rupees):
    """Convert a rupee amount (int/float/Decimal) to integer paise safely."""
    return int(round(float(amount_rupees) * 100))


def _payment_public_view(payment):
    """Client-safe payment projection (no secrets, no signatures)."""
    p = decimal_to_float(payment)
    return {
        'payment_id': p.get('id'),
        'booking_id': p.get('booking_id'),
        'status': p.get('status'),
        'amount': p.get('amount'),            # paise
        'amount_display': round(p.get('amount', 0) / 100, 2),
        'currency': p.get('currency'),
        'razorpay_order_id': p.get('razorpay_order_id'),
        'razorpay_payment_id': p.get('razorpay_payment_id'),
        'attempt': p.get('attempt', 1),
        'created_at': p.get('created_at'),
        'updated_at': p.get('updated_at'),
        'captured_at': p.get('captured_at'),
        'refunded_amount': p.get('refunded_amount', 0),
        'refund_id': p.get('refund_id'),
        # Commission split (present once captured).
        'commission_rate': p.get('commission_rate'),
        'commission_amount': p.get('commission_amount'),
        'commission_display': round((p.get('commission_amount') or 0) / 100, 2),
        'worker_payout': p.get('worker_payout'),
        'worker_payout_display': round((p.get('worker_payout') or 0) / 100, 2),
        'settlement_status': p.get('settlement_status'),
    }


def _get_active_payment_for_booking(booking_id):
    """Return the current payment record for a booking, or None."""
    pointer = get_item(f'BOOKING#{booking_id}', 'PAYMENT')
    if not pointer:
        return None
    payment_id = pointer.get('payment_id')
    if not payment_id:
        return None
    return get_item(f'PAYMENT#{payment_id}', 'METADATA')


def _write_payment(payment):
    """Persist a payment record + its booking pointer + order reverse lookup."""
    put_item(payment)
    put_item({
        'PK': f'BOOKING#{payment["booking_id"]}',
        'SK': 'PAYMENT',
        'payment_id': payment['id'],
        'status': payment['status'],
        'updated_at': now_iso(),
    })
    if payment.get('razorpay_order_id'):
        put_item({
            'PK': f'RZP_ORDER#{payment["razorpay_order_id"]}',
            'SK': 'METADATA',
            'payment_id': payment['id'],
            'booking_id': payment['booking_id'],
            'created_at': now_iso(),
        })


def _update_payment(payment_id, updates):
    update_item(f'PAYMENT#{payment_id}', 'METADATA', updates)
    # keep the booking pointer status in sync (best-effort)
    booking_id = updates.get('_booking_id')
    status = updates.get('status')
    if booking_id and status:
        try:
            update_item(f'BOOKING#{booking_id}', 'PAYMENT', {'status': status})
        except Exception:  # noqa: BLE001
            pass


# =============================================================================
# A) POST /api/payments/create-order
# =============================================================================
def create_order(event):
    if not rzp.is_configured():
        return error('Payments are not configured', status_code=503)

    role = get_user_role(event)
    if role != 'customer':
        return forbidden('Only customers can pay for bookings')

    customer_id = _get_user_id_from_sub(get_user_sub(event))
    if not customer_id:
        return error('User not found')

    body = get_body(event)
    booking_id = body.get('booking_id')
    if not booking_id:
        return error('booking_id is required')

    booking = get_item(f'BOOKING#{booking_id}', 'METADATA')
    if not booking:
        return not_found('Booking not found')

    # Ownership — never trust a customer_id from the body.
    if booking.get('customer_id') != customer_id:
        return forbidden('This booking does not belong to you')

    # Eligibility — booking must be in a payable state.
    if booking.get('status') not in _PAYABLE_BOOKING_STATUSES:
        return error('This booking is not eligible for payment yet', status_code=409)

    # Amount comes ONLY from the trusted booking record (ignore any body amount).
    amount_rupees = booking.get('total_amount', 0)
    try:
        amount_paise = _to_paise(amount_rupees)
    except (TypeError, ValueError):
        return error('Booking has no valid amount to charge')
    if amount_paise <= 0:
        return error('Booking amount must be greater than zero')

    # Reuse / dedup: if an active (non-failed, non-terminal) payment already
    # exists, return it instead of creating a duplicate order.
    existing = _get_active_payment_for_booking(booking_id)
    if existing:
        st = existing.get('status')
        if st in _PROTECTED_STATES or st == P_AUTHORIZED:
            return error('This booking is already paid or being processed', status_code=409)
        if st == P_PENDING:
            # Reuse the still-open order (safe retry, no duplicate charge).
            return created({
                'reused': True,
                'key_id': rzp.get_public_key_id(),
                'razorpay_order_id': existing.get('razorpay_order_id'),
                'amount': existing.get('amount'),
                'currency': existing.get('currency'),
                'payment_id': existing.get('id'),
                'booking': {
                    'booking_id': booking_id,
                    'service_name': booking.get('service_name'),
                },
            })

    # Determine attempt number (previous failed attempts increment it).
    attempt = 1
    if existing and existing.get('status') in _RETRIABLE_STATES:
        attempt = int(existing.get('attempt', 1)) + 1

    # Create the Razorpay order (test mode).
    receipt = f"bk_{booking_id[:30]}_{attempt}"
    try:
        order = rzp.create_order(amount_paise, CURRENCY, receipt,
                                 notes={'booking_id': booking_id, 'customer_id': customer_id})
    except rzp.RazorpayConfigError as e:
        print(f"[payments] config error: {e}")
        return error('Payments are not configured', status_code=503)
    except Exception:  # noqa: BLE001
        return error('Could not create payment order; please try again', status_code=502)

    payment_id = generate_id()
    now = now_iso()
    payment = {
        'PK': f'PAYMENT#{payment_id}',
        'SK': 'METADATA',
        'id': payment_id,
        'booking_id': booking_id,
        'customer_id': customer_id,
        'worker_id': booking.get('worker_id'),
        'service_name': booking.get('service_name', ''),
        'amount': amount_paise,
        'currency': CURRENCY,
        'status': P_PENDING,
        'razorpay_order_id': order.get('id'),
        'razorpay_payment_id': None,
        'attempt': attempt,
        'refunded_amount': 0,
        'created_at': now,
        'updated_at': now,
        'captured_at': None,
        # GSI1: list payments by status (admin)
        'GSI1PK': f'PAYMENT_STATUS#{P_PENDING}',
        'GSI1SK': f'PAYMENT#{now}',
    }
    _write_payment(payment)

    # Return ONLY what Checkout needs. key_id is the public test key.
    return created({
        'key_id': rzp.get_public_key_id(),
        'razorpay_order_id': order.get('id'),
        'amount': amount_paise,
        'currency': CURRENCY,
        'payment_id': payment_id,
        'booking': {
            'booking_id': booking_id,
            'service_name': booking.get('service_name'),
            'amount_display': round(amount_paise / 100, 2),
        },
    })


# =============================================================================
# B) POST /api/payments/verify
# =============================================================================
def verify_payment(event):
    if not rzp.is_configured():
        return error('Payments are not configured', status_code=503)

    role = get_user_role(event)
    if role != 'customer':
        return forbidden('Only customers can verify payments')

    customer_id = _get_user_id_from_sub(get_user_sub(event))
    if not customer_id:
        return error('User not found')

    body = get_body(event)
    booking_id = body.get('booking_id')
    order_id = body.get('razorpay_order_id')
    rzp_payment_id = body.get('razorpay_payment_id')
    signature = body.get('razorpay_signature')

    if not all([booking_id, order_id, rzp_payment_id, signature]):
        return error('booking_id, razorpay_order_id, razorpay_payment_id and '
                     'razorpay_signature are required')

    payment = _get_active_payment_for_booking(booking_id)
    if not payment:
        return not_found('No payment found for this booking')

    # Ownership — the payment/booking must belong to the caller.
    if payment.get('customer_id') != customer_id:
        return forbidden('This payment does not belong to you')

    # The order must match the one we created (prevents associating a foreign order).
    if payment.get('razorpay_order_id') != order_id:
        return error('Order does not match this booking payment', status_code=409)

    # Idempotency: already confirmed -> return success without re-processing.
    if payment.get('status') in _PROTECTED_STATES:
        return success({'status': payment.get('status'),
                        'payment': _payment_public_view(payment),
                        'message': 'Payment already confirmed'})

    # 1) Verify the checkout handshake signature (constant-time).
    if not rzp.verify_checkout_signature(order_id, rzp_payment_id, signature):
        # Signature failure is NOT proof of payment — record a failed attempt.
        _update_payment(payment['id'], {
            'status': P_FAILED,
            'razorpay_payment_id': rzp_payment_id,
            'failure_reason': 'signature_mismatch',
            '_booking_id': booking_id,
            'GSI1PK': f'PAYMENT_STATUS#{P_FAILED}',
        })
        return error('Payment signature verification failed', status_code=400)

    # 2) Confirm the real payment state with Razorpay (don't trust the callback).
    try:
        rp = rzp.fetch_payment(rzp_payment_id)
    except Exception:  # noqa: BLE001
        # Can't confirm yet — leave as pending/authorized, let webhook/poll settle.
        return success({'status': P_PENDING, 'payment': _payment_public_view(payment),
                        'message': 'Payment is being confirmed'}, )

    rp_status = (rp.get('status') or '').lower()
    rp_order = rp.get('order_id')
    rp_amount = rp.get('amount')

    # The fetched payment must belong to our order and match our amount.
    if rp_order != order_id or int(rp_amount or 0) != int(payment.get('amount', 0)):
        _update_payment(payment['id'], {
            'status': P_FAILED,
            'razorpay_payment_id': rzp_payment_id,
            'failure_reason': 'order_or_amount_mismatch',
            '_booking_id': booking_id,
            'GSI1PK': f'PAYMENT_STATUS#{P_FAILED}',
        })
        return error('Payment does not match the order', status_code=409)

    new_state, _ = _apply_payment_state(payment, rp_status, rzp_payment_id)
    refreshed = get_item(f'PAYMENT#{payment["id"]}', 'METADATA')
    msg = 'Payment successful' if new_state == P_SUCCESSFUL else (
        'Payment authorized; awaiting capture' if new_state == P_AUTHORIZED
        else 'Payment pending')
    return success({'status': new_state,
                    'payment': _payment_public_view(refreshed),
                    'message': msg})


def _apply_payment_state(payment, rp_status, rzp_payment_id, extra=None):
    """
    Map a Razorpay payment status to our state and persist it with guards.
    rp_status: 'captured' | 'authorized' | 'failed' | 'refunded' | ...
    Returns (new_state, changed_bool). Never downgrades a protected state.
    """
    current = payment.get('status')
    booking_id = payment.get('booking_id')
    payment_id = payment['id']

    # Protected states are terminal for negative transitions.
    if current in _PROTECTED_STATES and rp_status in ('failed', 'authorized', 'created'):
        return current, False

    updates = {'razorpay_payment_id': rzp_payment_id, '_booking_id': booking_id}
    if extra:
        updates.update(extra)

    if rp_status == 'captured':
        if current == P_SUCCESSFUL:
            return P_SUCCESSFUL, False
        # Compute + persist the commission split at capture time, locking in the
        # rate on the record so later rate changes don't rewrite history.
        commission, payout = _split_amount(payment.get('amount', 0), COMMISSION_RATE)
        updates['status'] = P_SUCCESSFUL
        updates['captured_at'] = now_iso()
        updates['commission_rate'] = COMMISSION_RATE
        updates['commission_amount'] = commission
        updates['worker_payout'] = payout
        updates['settlement_status'] = 'settled'
        updates['GSI1PK'] = f'PAYMENT_STATUS#{P_SUCCESSFUL}'
        _update_payment(payment_id, updates)
        return P_SUCCESSFUL, True

    if rp_status == 'authorized':
        if current in (P_SUCCESSFUL, P_AUTHORIZED):
            return current, False
        updates['status'] = P_AUTHORIZED
        updates['GSI1PK'] = f'PAYMENT_STATUS#{P_AUTHORIZED}'
        _update_payment(payment_id, updates)
        return P_AUTHORIZED, True

    if rp_status == 'failed':
        if current in _PROTECTED_STATES:
            return current, False
        updates['status'] = P_FAILED
        updates['GSI1PK'] = f'PAYMENT_STATUS#{P_FAILED}'
        _update_payment(payment_id, updates)
        return P_FAILED, True

    # Unknown/created -> leave as-is.
    return current, False


def _reconcile_with_razorpay(payment):
    """
    Pull the authoritative payment state from Razorpay for a non-terminal
    payment and apply it. This gives webhook-like settling WITHOUT a webhook
    (lazy, on status read) — useful when webhooks aren't configured. Returns the
    (possibly refreshed) payment record. Best-effort; never raises.
    """
    if payment.get('status') in _PROTECTED_STATES + (P_FAILED,):
        return payment
    rzp_payment_id = payment.get('razorpay_payment_id')
    if not rzp_payment_id:
        return payment  # Checkout never completed; nothing to reconcile yet.
    try:
        rp = rzp.fetch_payment(rzp_payment_id)
    except Exception:  # noqa: BLE001
        return payment
    rp_status = (rp.get('status') or '').lower()
    # Only trust it if the order + amount match ours.
    if rp.get('order_id') != payment.get('razorpay_order_id'):
        return payment
    if int(rp.get('amount') or 0) != int(payment.get('amount', 0)):
        return payment
    _apply_payment_state(payment, rp_status, rzp_payment_id)
    return get_item(f'PAYMENT#{payment["id"]}', 'METADATA') or payment


# =============================================================================
# C) GET /api/payments/{booking_id}
# =============================================================================
def get_payment_status(event):
    role = get_user_role(event)
    user_id = _get_user_id_from_sub(get_user_sub(event))
    if not user_id:
        return error('User not found')

    booking_id = get_path_param(event, 'booking_id') or get_path_param(event, 'id')
    if not booking_id:
        return error('booking_id is required')

    booking = get_item(f'BOOKING#{booking_id}', 'METADATA')
    if not booking:
        return not_found('Booking not found')

    # Authorization: customer owns it, worker is assigned, or admin.
    is_customer = booking.get('customer_id') == user_id
    is_worker = booking.get('worker_id') == user_id
    if role != 'admin' and not is_customer and not is_worker:
        return forbidden('You do not have access to this payment')

    payment = _get_active_payment_for_booking(booking_id)
    if not payment:
        return success({'booking_id': booking_id, 'payment': None,
                        'payment_status': 'NONE'})

    # Lazy reconcile with Razorpay for non-terminal payments. This settles
    # authorized->captured without needing a webhook (webhook is an optional
    # backup). Only the owning customer / admin triggers the pull.
    if (is_customer or role == 'admin') and rzp.is_configured():
        payment = _reconcile_with_razorpay(payment)

    view = _payment_public_view(payment)
    # Workers assigned to the booking get a worker-scoped view: their OWN
    # transaction references (these are their earnings) + amount/status/dates,
    # but no customer id / internal customer PII.
    if role == 'worker' and not is_customer:
        view = _worker_payment_view(payment, booking)
    return success({'booking_id': booking_id, 'payment': view,
                    'payment_status': payment.get('status')})


def _worker_payment_view(payment, booking=None):
    """
    Worker-scoped payment projection. A worker may see the references for jobs
    assigned to them (their own earnings), but not the customer's internal id.
    """
    p = decimal_to_float(payment)
    return {
        'booking_id': p.get('booking_id'),
        'status': p.get('status'),
        'amount': p.get('amount'),
        'amount_display': round(p.get('amount', 0) / 100, 2),
        'currency': p.get('currency'),
        'razorpay_order_id': p.get('razorpay_order_id'),
        'razorpay_payment_id': p.get('razorpay_payment_id'),
        'captured_at': p.get('captured_at'),
        'created_at': p.get('created_at'),
        'refunded_amount': p.get('refunded_amount', 0),
        # The worker's own payout (gross minus platform commission).
        'worker_payout': p.get('worker_payout'),
        'worker_payout_display': round((p.get('worker_payout') or 0) / 100, 2),
        'commission_amount': p.get('commission_amount'),
        'settlement_status': p.get('settlement_status'),
        # Safe, worker-relevant context from the booking record (no PII beyond
        # the customer name the worker already sees on their booking).
        'service_name': (booking or {}).get('service_name') or p.get('service_name'),
        'customer_name': (booking or {}).get('customer_name', ''),
        'scheduled_date': (booking or {}).get('scheduled_date', ''),
        'scheduled_time': (booking or {}).get('scheduled_time', ''),
    }


# =============================================================================
# Worker earnings dashboard: list payments for the worker's bookings + summary
# =============================================================================
def list_worker_payments(worker_id):
    """
    Return the worker's booking-wise payments (worker-scoped projection) plus an
    aggregated earnings summary. Derived from the worker's own WORKER_BOOKING
    refs + the payment records for those bookings. No new booking data is
    exposed beyond what the worker already sees.
    """
    refs = query_items(f'WORKER_BOOKING#{worker_id}', sk_begins_with='BOOKING#')
    items = []
    total_captured = 0      # paise, SUCCESSFUL (minus refunds)
    total_pending = 0       # paise, PENDING/AUTHORIZED
    month_captured = 0      # paise captured in current calendar month
    completed_paid = 0      # count of SUCCESSFUL payments

    now = datetime.now(timezone.utc)
    month_prefix = now.strftime('%Y-%m')

    for ref in refs:
        booking_id = ref.get('booking_id')
        if not booking_id:
            continue
        payment = _get_active_payment_for_booking(booking_id)
        if not payment:
            continue
        booking = get_item(f'BOOKING#{booking_id}', 'METADATA')
        # Only surface payments for bookings still assigned to THIS worker.
        if not booking or booking.get('worker_id') != worker_id:
            continue

        view = _worker_payment_view(payment, booking)
        items.append(view)

        amount = int(payment.get('amount', 0) or 0)
        refunded = int(payment.get('refunded_amount', 0) or 0)
        status = payment.get('status')
        if status == P_SUCCESSFUL:
            # Worker earns their payout (gross - commission); fall back to gross
            # for any legacy record captured before commission was stored.
            payout = payment.get('worker_payout')
            base = int(payout) if payout is not None else amount
            net = max(base - refunded, 0)
            total_captured += net
            completed_paid += 1
            captured_at = str(payment.get('captured_at') or '')
            if captured_at[:7] == month_prefix:
                month_captured += net
        elif status in (P_PENDING, P_AUTHORIZED):
            total_pending += amount

    items.sort(key=lambda x: x.get('created_at') or '', reverse=True)

    summary = {
        'total_earned': round(total_captured / 100, 2),
        'this_month': round(month_captured / 100, 2),
        'pending': round(total_pending / 100, 2),
        'completed_payments': completed_paid,
        'currency': CURRENCY,
    }
    return items, summary


# =============================================================================
# D) POST /api/payments/webhook  (authenticated by signature, NOT Cognito)
# =============================================================================
def handle_webhook(event):
    # Raw body is required for signature verification (do NOT re-serialize).
    raw_body = event.get('body') or ''
    if event.get('isBase64Encoded'):
        import base64 as _b64
        try:
            raw_body = _b64.b64decode(raw_body).decode()
        except Exception:  # noqa: BLE001
            return error('Invalid webhook body', status_code=400)

    headers = {k.lower(): v for k, v in (event.get('headers') or {}).items()}
    signature = headers.get('x-razorpay-signature', '')

    if not rzp.verify_webhook_signature(raw_body, signature):
        # Receiving a webhook is NOT proof of payment; a bad signature is rejected.
        return error('Invalid webhook signature', status_code=400)

    import json as _json
    try:
        payload = _json.loads(raw_body)
    except (ValueError, TypeError):
        return error('Invalid webhook payload', status_code=400)

    event_id = (headers.get('x-razorpay-event-id')
                or payload.get('id')
                or f"evt_{generate_id()}")

    # Idempotency: dedup via a conditional put keyed on the event id.
    if not _claim_webhook_event(event_id):
        return success({'message': 'Duplicate event ignored', 'event_id': event_id})

    event_type = payload.get('event', '')
    try:
        _process_webhook_event(event_type, payload)
    except Exception as e:  # noqa: BLE001
        print(f"[payments] webhook processing error for {event_type}: {type(e).__name__}")
        # Still 200 so Razorpay doesn't hammer retries for a transient issue;
        # the event is recorded and can be reconciled.
    return success({'message': 'ok', 'event': event_type})


def _claim_webhook_event(event_id):
    """
    Record the event id with a conditional put. Returns True if this is the
    first time we've seen it (claim succeeded), False if it's a duplicate.
    """
    item = {
        'PK': f'RZP_EVENT#{event_id}',
        'SK': 'EVENT',
        'event_id': event_id,
        'processed_at': now_iso(),
        'TTL': int((datetime.now(timezone.utc) + timedelta(days=30)).timestamp()),
    }
    try:
        activity_table.put_item(Item=item, ConditionExpression='attribute_not_exists(PK)')
        return True
    except Exception:  # noqa: BLE001 - ConditionalCheckFailed => duplicate
        return False


def _payment_from_order(order_id):
    if not order_id:
        return None
    lookup = get_item(f'RZP_ORDER#{order_id}', 'METADATA')
    if not lookup:
        return None
    return get_item(f'PAYMENT#{lookup["payment_id"]}', 'METADATA')


def _process_webhook_event(event_type, payload):
    """
    Handle payment authorized/captured/failed and refund events. Out-of-order
    safe because _apply_payment_state never downgrades a protected state.
    """
    entities = payload.get('payload', {})
    pay_entity = (entities.get('payment', {}) or {}).get('entity', {})
    refund_entity = (entities.get('refund', {}) or {}).get('entity', {})

    order_id = pay_entity.get('order_id') or refund_entity.get('order_id')
    rzp_payment_id = pay_entity.get('id') or refund_entity.get('payment_id')
    payment = _payment_from_order(order_id)
    if not payment:
        print(f"[payments] webhook {event_type}: no local payment for order {order_id}")
        return

    if event_type in ('payment.captured',):
        _apply_payment_state(payment, 'captured', rzp_payment_id)
    elif event_type in ('payment.authorized',):
        _apply_payment_state(payment, 'authorized', rzp_payment_id)
    elif event_type in ('payment.failed',):
        _apply_payment_state(payment, 'failed', rzp_payment_id)
    elif event_type in ('refund.created', 'refund.processed'):
        _apply_refund(payment, refund_entity)


def _apply_refund(payment, refund_entity):
    """Record a (partial) refund without clobbering the successful record."""
    current = payment.get('status')
    if current not in (P_SUCCESSFUL, P_PARTIALLY_REFUNDED, P_REFUNDED):
        # Only a captured payment can be refunded.
        return
    refunded_amount = int(refund_entity.get('amount') or 0)
    total = int(payment.get('amount', 0))
    prior = int(payment.get('refunded_amount', 0))
    new_total_refunded = min(prior + refunded_amount, total)
    new_state = P_REFUNDED if new_total_refunded >= total else P_PARTIALLY_REFUNDED
    _update_payment(payment['id'], {
        'status': new_state,
        'refunded_amount': new_total_refunded,
        'refund_id': refund_entity.get('id'),
        '_booking_id': payment.get('booking_id'),
        'GSI1PK': f'PAYMENT_STATUS#{new_state}',
    })


# =============================================================================
# Admin listing (used by the admin payments view)
# =============================================================================
def list_payments_by_status(status=None):
    """Return payment records, optionally filtered by status (admin use)."""
    results = []
    statuses = [status] if status else [
        P_PENDING, P_AUTHORIZED, P_SUCCESSFUL, P_FAILED, P_REFUNDED, P_PARTIALLY_REFUNDED]
    for st in statuses:
        for p in query_all(f'PAYMENT_STATUS#{st}', index_name='GSI1'):
            results.append(p)
    return results


def build_admin_analytics():
    """
    Compute platform payment analytics entirely from real captured payment
    records. No hardcoded figures. Monthly trend only includes months that
    actually have captured revenue; growth % is returned only when there are at
    least two months to compare.
    All money values are returned in rupees (converted from stored paise).
    """
    all_payments = list_payments_by_status(None)

    gmv = 0            # paise, gross captured (SUCCESSFUL + refunded states keep gross)
    commission_total = 0
    payout_total = 0
    pending_total = 0
    refunded_total = 0
    captured_count = 0

    by_category = {}   # service_name -> gross paise (captured)
    by_month = {}      # 'YYYY-MM' -> gross paise (captured)

    captured_states = (P_SUCCESSFUL, P_REFUNDED, P_PARTIALLY_REFUNDED)

    for p in all_payments:
        status = p.get('status')
        amount = int(p.get('amount', 0) or 0)
        if status in captured_states:
            gmv += amount
            commission_total += int(p.get('commission_amount') or 0)
            # payout: use stored value, else gross-minus-commission fallback
            payout = p.get('worker_payout')
            payout_total += int(payout) if payout is not None else amount
            refunded_total += int(p.get('refunded_amount', 0) or 0)
            captured_count += 1
            svc = p.get('service_name') or 'Other'
            by_category[svc] = by_category.get(svc, 0) + amount
            month = str(p.get('captured_at') or p.get('created_at') or '')[:7]
            if month:
                by_month[month] = by_month.get(month, 0) + amount
        elif status in (P_PENDING, P_AUTHORIZED):
            pending_total += amount

    def rupees(paise):
        return round(paise / 100, 2)

    # Category breakdown with percentage of GMV.
    category_list = sorted(
        [
            {
                'name': k,
                'amount': rupees(v),
                'pct': round((v / gmv) * 100, 1) if gmv else 0,
            }
            for k, v in by_category.items()
        ],
        key=lambda x: x['amount'], reverse=True,
    )

    # Monthly trend (chronological) — only real months.
    trend = [
        {'month': m, 'gmv': rupees(v)}
        for m, v in sorted(by_month.items())
    ]

    # Growth % only when we have >= 2 months of real data.
    growth_pct = None
    if len(trend) >= 2:
        prev = trend[-2]['gmv']
        curr = trend[-1]['gmv']
        if prev > 0:
            growth_pct = round(((curr - prev) / prev) * 100, 1)

    return {
        'summary': {
            'gmv': rupees(gmv),
            'commission': rupees(commission_total),
            'payouts': rupees(payout_total),
            'pending': rupees(pending_total),
            'refunded': rupees(refunded_total),
            'captured_count': captured_count,
            'effective_take_rate': round((commission_total / gmv) * 100, 2) if gmv else 0,
            'growth_pct': growth_pct,  # null when <2 months
            'currency': CURRENCY,
        },
        'by_category': category_list,
        'trend': trend,
    }
