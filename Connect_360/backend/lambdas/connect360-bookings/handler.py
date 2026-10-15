"""
Connect360 - Bookings Lambda (DynamoDB)
Handles all booking lifecycle + reviews.
"""

import sys
import os
from decimal import Decimal

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'shared'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'shared'))

from datetime import datetime, timezone, timedelta
from db import (put_item, get_item, update_item, query_items, query_all,
                generate_id, now_iso, decimal_to_float)
from response import success, created, error, not_found, forbidden, server_error
from auth_helpers import get_user_claims, get_user_sub, get_user_role, get_path_param, get_query_param, get_body
import calling_provider
import priority_handler
import reminders_handler
import payments_handler
import otp_handler


def lambda_handler(event, context):
    # ---- Scheduled overdue sweep (EventBridge) ----
    # The reminders EventBridge rule invokes this Lambda directly (not via API
    # Gateway) with a marker so we run the server-side overdue monitor.
    if event.get('source') == 'connect360.reminders' or event.get('task') == 'sweep_overdue_bookings':
        return reminders_handler.sweep_overdue_bookings()

    method = event.get('httpMethod', '')
    resource = event.get('resource', '')

    try:
        if method == 'POST' and resource == '/api/bookings':
            return create_booking(event)
        elif method == 'GET' and resource == '/api/bookings':
            return list_customer_bookings(event)
        elif method == 'GET' and resource == '/api/bookings/{id}':
            return get_booking_detail(event)
        elif method == 'PUT' and '/bookings/{id}/cancel' in resource:
            return cancel_booking(event)
        elif method == 'GET' and resource == '/api/worker/bookings':
            return list_worker_bookings(event)
        elif method == 'GET' and resource == '/api/worker/overdue-bookings':
            return list_worker_overdue_bookings(event)
        elif method == 'GET' and resource == '/api/worker/bookings/{id}':
            return get_worker_booking_detail(event)
        # ---- Notifications (overdue reminders + priority alerts) ----
        elif method == 'GET' and resource == '/api/notifications':
            return list_notifications(event)
        elif method == 'PUT' and '/notifications/{id}/read' in resource:
            return mark_notification_read(event)
        elif method == 'PUT' and '/worker/bookings/{id}/respond' in resource:
            return respond_to_booking(event)
        elif method == 'PUT' and '/worker/bookings/{id}/status' in resource:
            return update_booking_status(event)
        # ---- Arrival OTP (Ola/Uber-style verification) ----
        elif method == 'GET' and resource == '/api/bookings/{id}/arrival-otp':
            return get_arrival_otp(event)
        elif method == 'POST' and '/bookings/{id}/arrival-otp/regenerate' in resource:
            return regenerate_arrival_otp(event)
        elif method == 'POST' and '/bookings/{id}/verify-arrival-otp' in resource:
            return verify_arrival_otp(event)
        elif method == 'POST' and resource == '/api/reviews':
            return create_review(event)
        elif method == 'GET' and '/workers/{id}/reviews' in resource:
            return get_worker_reviews(event)
        elif method == 'POST' and '/bookings/{id}/call' in resource:
            return initiate_call(event)
        # ---- Real GPS Live Tracking ----
        elif method == 'PUT' and '/bookings/{id}/location' in resource:
            return update_booking_location(event)
        elif method == 'GET' and '/bookings/{id}/location' in resource:
            return get_booking_location(event)
        # ---- Priority Booking (Feature 3) — delegated to priority_handler ----
        elif method == 'POST' and resource == '/api/bookings/priority':
            return priority_handler.create_priority_booking(event)
        elif method == 'GET' and resource == '/api/customer/priority-bookings':
            return priority_handler.list_customer_priority_bookings(event)
        elif method == 'GET' and resource == '/api/worker/priority-requests':
            return priority_handler.list_worker_priority_requests(event)
        elif method == 'POST' and '/priority/{id}/accept' in resource:
            return priority_handler.worker_accept_priority(event)
        elif method == 'POST' and '/priority/{id}/reject' in resource:
            return priority_handler.worker_reject_priority(event)
        elif method == 'POST' and '/priority/{id}/rematch' in resource:
            return priority_handler.rematch_priority_booking(event)
        elif method == 'PUT' and '/priority/{id}/cancel' in resource:
            return priority_handler.cancel_priority_booking(event)
        # ---- Razorpay Payments (TEST MODE) — delegated to payments_handler ----
        elif method == 'POST' and resource == '/api/payments/create-order':
            return payments_handler.create_order(event)
        elif method == 'POST' and resource == '/api/payments/verify':
            return payments_handler.verify_payment(event)
        elif method == 'POST' and resource == '/api/payments/webhook':
            # Public route (no Cognito authorizer) — authenticated by signature.
            return payments_handler.handle_webhook(event)
        elif method == 'GET' and resource == '/api/payments/{booking_id}':
            return payments_handler.get_payment_status(event)
        elif method == 'GET' and resource == '/api/admin/payments':
            return list_admin_payments(event)
        elif method == 'GET' and resource == '/api/admin/payments/analytics':
            return admin_payment_analytics(event)
        elif method == 'GET' and resource == '/api/worker/payments':
            return list_worker_payments(event)
        else:
            return error('Route not found', status_code=404)
    except Exception as e:
        print(f"Error: {str(e)}")
        return server_error(str(e))


def _get_user_id_from_sub(cognito_sub):
    items = query_items(f'COGNITO#{cognito_sub}', sk_begins_with='USER', index_name='GSI2')
    return items[0].get('id') if items else None


def create_booking(event):
    """POST /api/bookings"""
    role = get_user_role(event)
    if role != 'customer':
        return forbidden('Only customers can create bookings')

    customer_id = _get_user_id_from_sub(get_user_sub(event))
    if not customer_id:
        return error('User not found')

    body = get_body(event)
    worker_id = body.get('worker_id')
    service_id = body.get('service_id')
    scheduled_date = body.get('scheduled_date')
    scheduled_time = body.get('scheduled_time')
    address = body.get('address', '').strip()

    if not all([worker_id, service_id, scheduled_date, scheduled_time, address]):
        return error('worker_id, service_id, scheduled_date, scheduled_time, and address are required')

    # Get worker info
    worker_profile = get_item(f'USER#{worker_id}', 'WORKER_PROFILE')
    worker_user = get_item(f'USER#{worker_id}', 'PROFILE')
    customer_user = get_item(f'USER#{customer_id}', 'PROFILE')
    service = get_item(f'SERVICE#{service_id}', 'METADATA')

    if not worker_profile or not worker_profile.get('is_verified'):
        return error('Worker is not available or not verified')

    # The selected service must exist on the platform...
    if not service:
        return error('Selected service does not exist')

    # ...and the worker must actually offer it. A worker's offered services are
    # stored as USER#{worker}/SERVICE#{service_id} sub-items. Enforce this
    # server-side so a crafted request can't book a service the worker doesn't do.
    worker_service = get_item(f'USER#{worker_id}', f'SERVICE#{service_id}')
    if not worker_service:
        return error('This professional does not offer the selected service', status_code=409)

    duration_hours = float(body.get('duration_hours', 1))
    hourly_rate = float(worker_profile.get('hourly_rate', 0))
    total_amount = hourly_rate * duration_hours

    booking_id = generate_id()
    now = now_iso()

    # Main booking item
    booking = {
        'PK': f'BOOKING#{booking_id}',
        'SK': 'METADATA',
        'id': booking_id,
        'booking_type': 'manual',
        'customer_id': customer_id,
        'worker_id': worker_id,
        'service_id': service_id,
        'status': 'pending',
        'scheduled_date': scheduled_date,
        'scheduled_time': scheduled_time,
        'duration_hours': duration_hours,
        'address': address,
        'notes': body.get('notes', ''),
        'total_amount': total_amount,
        'customer_name': customer_user.get('full_name', '') if customer_user else '',
        'worker_name': worker_user.get('full_name', '') if worker_user else '',
        'service_name': service.get('name', '') if service else '',
        'created_at': now,
        'updated_at': now,
        # GSI1: bookings by status
        'GSI1PK': 'STATUS#pending',
        'GSI1SK': f'BOOKING#{now}',
    }
    put_item(booking)

    # Customer reference
    put_item({
        'PK': f'USER#{customer_id}',
        'SK': f'BOOKING#{booking_id}',
        'booking_id': booking_id,
        'booking_type': 'manual',
        'worker_name': worker_user.get('full_name', '') if worker_user else '',
        'service_name': service.get('name', '') if service else '',
        'status': 'pending',
        'scheduled_date': scheduled_date,
        'scheduled_time': scheduled_time,
        'total_amount': total_amount,
        'created_at': now,
    })

    # Worker reference
    put_item({
        'PK': f'WORKER_BOOKING#{worker_id}',
        'SK': f'BOOKING#{booking_id}',
        'booking_id': booking_id,
        'booking_type': 'manual',
        'customer_name': customer_user.get('full_name', '') if customer_user else '',
        'service_name': service.get('name', '') if service else '',
        'status': 'pending',
        'scheduled_date': scheduled_date,
        'scheduled_time': scheduled_time,
        'total_amount': total_amount,
        'address': address,
        'notes': body.get('notes', ''),
        'created_at': now,
        # GSI2: worker bookings by date
        'GSI2PK': f'WORKER#{worker_id}',
        'GSI2SK': f'BOOKING#{scheduled_date}#{booking_id}',
    })

    return created({'message': 'Booking created successfully', 'booking_id': booking_id, 'total_amount': total_amount})


def list_customer_bookings(event):
    """GET /api/bookings"""
    customer_id = _get_user_id_from_sub(get_user_sub(event))
    if not customer_id:
        return error('User not found')

    items = query_items(f'USER#{customer_id}', sk_begins_with='BOOKING#')
    bookings = [decimal_to_float(b) for b in items]

    # Filter by status if provided
    status_filter = get_query_param(event, 'status')
    if status_filter:
        bookings = [b for b in bookings if b.get('status') == status_filter]

    # Most recently BOOKED first (by creation time), not by appointment date,
    # so a just-created booking always appears at the top. Fall back to the
    # scheduled date when created_at is missing (legacy records).
    bookings.sort(key=lambda b: (b.get('created_at') or b.get('scheduled_date', '')), reverse=True)
    return success({'bookings': bookings, 'count': len(bookings)})


def get_booking_detail(event):
    """GET /api/bookings/{id}"""
    booking_id = get_path_param(event, 'id')
    booking = get_item(f'BOOKING#{booking_id}', 'METADATA')
    if not booking:
        return not_found('Booking not found')
    return success({'booking': decimal_to_float(booking)})


def cancel_booking(event):
    """PUT /api/bookings/{id}/cancel"""
    customer_id = _get_user_id_from_sub(get_user_sub(event))
    booking_id = get_path_param(event, 'id')
    body = get_body(event)

    booking = get_item(f'BOOKING#{booking_id}', 'METADATA')
    if not booking or booking.get('customer_id') != customer_id:
        return not_found('Booking not found')

    if booking['status'] not in ('pending', 'accepted'):
        return error('Only pending or accepted bookings can be cancelled')

    reason = body.get('reason', 'Cancelled by customer')
    _update_booking_status(booking_id, 'cancelled', booking, reason=reason)

    return success({'message': 'Booking cancelled successfully'})


def list_worker_bookings(event):
    """GET /api/worker/bookings"""
    role = get_user_role(event)
    if role != 'worker':
        return forbidden('Only workers can access this endpoint')

    worker_id = _get_user_id_from_sub(get_user_sub(event))
    items = query_items(f'WORKER_BOOKING#{worker_id}', sk_begins_with='BOOKING#')
    bookings = [decimal_to_float(b) for b in items]

    status_filter = get_query_param(event, 'status')
    if status_filter:
        bookings = [b for b in bookings if b.get('status') == status_filter]

    # Most recently booked first (creation time), falling back to schedule.
    bookings.sort(key=lambda b: (b.get('created_at') or b.get('scheduled_date', '')), reverse=True)
    return success({'bookings': bookings, 'count': len(bookings)})


def get_worker_booking_detail(event):
    """GET /api/worker/bookings/{id}"""
    booking_id = get_path_param(event, 'id')
    booking = get_item(f'BOOKING#{booking_id}', 'METADATA')
    if not booking:
        return not_found('Booking not found')
    return success({'booking': decimal_to_float(booking)})


def list_worker_overdue_bookings(event):
    """
    GET /api/worker/overdue-bookings

    Returns this worker's overdue bookings (scheduled time passed, still not
    completed). Runs a lazy sweep first so reminders stay correct even if the
    EventBridge schedule is disabled, mirroring the priority 'lazy expiry' model.
    """
    role = get_user_role(event)
    if role != 'worker':
        return forbidden('Only workers can access this endpoint')

    worker_id = _get_user_id_from_sub(get_user_sub(event))
    if not worker_id:
        return error('User not found')

    # Lazy sweep (best-effort; never block the response on it).
    try:
        reminders_handler.sweep_overdue_bookings()
    except Exception as e:  # noqa: BLE001
        print(f"[bookings] lazy overdue sweep failed: {type(e).__name__}")

    items = query_items(f'WORKER_BOOKING#{worker_id}', sk_begins_with='BOOKING#')
    overdue = []
    for ref in items:
        booking_id = ref.get('booking_id')
        booking = get_item(f'BOOKING#{booking_id}', 'METADATA') if booking_id else None
        if not booking:
            continue
        if booking.get('overdue_flag') and booking.get('status') in reminders_handler.OVERDUE_CANDIDATE_STATUSES:
            overdue.append(decimal_to_float({
                'booking_id': booking_id,
                'booking_type': booking.get('booking_type', 'manual'),
                'customer_name': booking.get('customer_name', ''),
                'service_name': booking.get('service_name', ''),
                'scheduled_date': booking.get('scheduled_date', ''),
                'scheduled_time': booking.get('scheduled_time', ''),
                'status': booking.get('status'),
                'address': booking.get('address', ''),
                'total_amount': booking.get('total_amount', 0),
                'overdue_since': booking.get('overdue_since', ''),
            }))

    overdue.sort(key=lambda b: b.get('scheduled_date', ''))
    return success({'overdue_bookings': overdue, 'count': len(overdue)})


# =============================================================================
# Notifications (overdue reminders + priority alerts). Reuses NOTIF# items.
# =============================================================================
def list_notifications(event):
    """GET /api/notifications - current user's notifications (newest first)."""
    user_id = _get_user_id_from_sub(get_user_sub(event))
    if not user_id:
        return error('User not found')

    unread_only = (get_query_param(event, 'unread') or '').lower() == 'true'
    notifs = reminders_handler.list_notifications(user_id, unread_only=unread_only)

    # Expose the SK as a stable client-side id for the mark-read call.
    for n in notifs:
        n['notification_id'] = n.get('SK', '')
        for k in ('PK', 'SK', 'TTL'):
            n.pop(k, None)

    unread = len([n for n in notifs if not n.get('read')])
    return success({'notifications': notifs, 'count': len(notifs), 'unread_count': unread})


def mark_notification_read(event):
    """PUT /api/notifications/{id}/read - mark one notification as read."""
    user_id = _get_user_id_from_sub(get_user_sub(event))
    if not user_id:
        return error('User not found')

    # The path param is the URL-safe notification id; the real SK is sent in the
    # body (SKs contain '#' and ':' which are awkward in a path). Fall back to
    # reconstructing from a booking_id for overdue reminders.
    body = get_body(event)
    notification_sk = body.get('notification_id') or body.get('sk')
    if not notification_sk:
        booking_id = get_path_param(event, 'id')
        if booking_id:
            notification_sk = f'NOTIF#OVERDUE#{booking_id}'
    if not notification_sk:
        return error('notification_id is required')

    reminders_handler.mark_notification_read(user_id, notification_sk)
    return success({'message': 'Notification marked as read'})


# =============================================================================
# Admin payments listing (Razorpay). Admin-gated; reuses payments_handler.
# =============================================================================
def list_admin_payments(event):
    """GET /api/admin/payments?status=... - admin payment management view."""
    role = get_user_role(event)
    if role != 'admin':
        return forbidden('Only admins can list payments')

    status_filter = get_query_param(event, 'status')
    records = payments_handler.list_payments_by_status(status_filter)
    payments = [payments_handler._payment_public_view(p) for p in records]
    # Attach customer/worker names for the admin table (from the booking record).
    for p in payments:
        booking = get_item(f'BOOKING#{p["booking_id"]}', 'METADATA') if p.get('booking_id') else None
        if booking:
            p['customer_name'] = booking.get('customer_name', '')
            p['worker_name'] = booking.get('worker_name', '')
            p['service_name'] = booking.get('service_name', '')
    payments.sort(key=lambda x: x.get('created_at') or '', reverse=True)
    return success({'payments': payments, 'count': len(payments)})


def admin_payment_analytics(event):
    """GET /api/admin/payments/analytics - real revenue/commission analytics."""
    role = get_user_role(event)
    if role != 'admin':
        return forbidden('Only admins can access payment analytics')
    return success(payments_handler.build_admin_analytics())


# =============================================================================
# Worker earnings & payments (Razorpay). Worker-gated; own bookings only.
# =============================================================================
def list_worker_payments(event):
    """GET /api/worker/payments - worker earnings dashboard (list + summary)."""
    role = get_user_role(event)
    if role != 'worker':
        return forbidden('Only workers can access their earnings')

    worker_id = _get_user_id_from_sub(get_user_sub(event))
    if not worker_id:
        return error('User not found')

    items, summary = payments_handler.list_worker_payments(worker_id)
    return success({'payments': items, 'summary': summary, 'count': len(items)})


def respond_to_booking(event):
    """PUT /api/worker/bookings/{id}/respond"""
    role = get_user_role(event)
    if role != 'worker':
        return forbidden('Only workers can respond to bookings')

    worker_id = _get_user_id_from_sub(get_user_sub(event))
    if not worker_id:
        return error('User not found')

    booking_id = get_path_param(event, 'id')
    body = get_body(event)
    action = body.get('action')

    if action not in ('accept', 'reject'):
        return error('Action must be "accept" or "reject"')

    booking = get_item(f'BOOKING#{booking_id}', 'METADATA')
    if not booking:
        return not_found('Booking not found')
    # Ownership: only the assigned worker may respond to this booking.
    if booking.get('worker_id') != worker_id:
        return forbidden('You are not assigned to this booking')
    if booking['status'] != 'pending':
        return error('Only pending bookings can be responded to')

    new_status = 'accepted' if action == 'accept' else 'rejected'
    _update_booking_status(booking_id, new_status, booking)

    return success({'message': f'Booking {new_status}', 'status': new_status})


def update_booking_status(event):
    """PUT /api/worker/bookings/{id}/status"""
    role = get_user_role(event)
    if role != 'worker':
        return forbidden('Only workers can update booking status')

    worker_id = _get_user_id_from_sub(get_user_sub(event))
    if not worker_id:
        return error('User not found')

    booking_id = get_path_param(event, 'id')
    body = get_body(event)
    new_status = body.get('status')

    # Note: accepted -> in_progress is intentionally NOT allowed here. Starting
    # the service requires successful arrival-OTP verification via
    # POST /api/bookings/{id}/verify-arrival-otp. Clicking "start" alone must
    # never move a booking to in_progress.
    valid_transitions = {'in_progress': ['completed']}

    booking = get_item(f'BOOKING#{booking_id}', 'METADATA')
    if not booking:
        return not_found('Booking not found')
    # Ownership: only the assigned worker may change this booking's status
    # (frontend hiding the button is not sufficient — enforce server-side).
    if booking.get('worker_id') != worker_id:
        return forbidden('You are not assigned to this booking')

    current = booking['status']
    if current == 'accepted' and new_status == 'in_progress':
        return error('Verify the customer\'s arrival OTP to start the service', status_code=409)
    if new_status not in valid_transitions.get(current, []):
        return error(f'Cannot transition from "{current}" to "{new_status}"')

    _update_booking_status(booking_id, new_status, booking)

    # If this booking was flagged overdue, resolving it clears the flag and the
    # worker's overdue reminder so it stops showing in the dashboard.
    if booking.get('overdue_flag'):
        reminders_handler.clear_booking_overdue(booking)

    return success({'message': f'Booking status updated to {new_status}', 'status': new_status})


# =============================================================================
# Arrival OTP (Ola/Uber-style): customer displays, worker verifies.
# =============================================================================
def get_arrival_otp(event):
    """GET /api/bookings/{id}/arrival-otp - owning customer retrieves the code."""
    role = get_user_role(event)
    if role != 'customer':
        return forbidden('Only customers can view the arrival OTP')

    customer_id = _get_user_id_from_sub(get_user_sub(event))
    if not customer_id:
        return error('User not found')

    booking_id = get_path_param(event, 'id')
    booking = get_item(f'BOOKING#{booking_id}', 'METADATA')
    if not booking:
        return not_found('Booking not found')
    if booking.get('customer_id') != customer_id:
        return forbidden('This booking does not belong to you')

    payload, err = otp_handler.get_customer_otp(booking, regenerate=False)
    if err:
        return error(err)
    return success(payload)


def regenerate_arrival_otp(event):
    """POST /api/bookings/{id}/arrival-otp/regenerate - owner regenerates (cooldown)."""
    role = get_user_role(event)
    if role != 'customer':
        return forbidden('Only customers can regenerate the arrival OTP')

    customer_id = _get_user_id_from_sub(get_user_sub(event))
    if not customer_id:
        return error('User not found')

    booking_id = get_path_param(event, 'id')
    booking = get_item(f'BOOKING#{booking_id}', 'METADATA')
    if not booking:
        return not_found('Booking not found')
    if booking.get('customer_id') != customer_id:
        return forbidden('This booking does not belong to you')

    payload, err = otp_handler.get_customer_otp(booking, regenerate=True)
    if err:
        return error(err, status_code=429)
    return success(payload)


def verify_arrival_otp(event):
    """POST /api/bookings/{id}/verify-arrival-otp - assigned worker verifies."""
    role = get_user_role(event)
    if role != 'worker':
        return forbidden('Only workers can verify the arrival OTP')

    worker_id = _get_user_id_from_sub(get_user_sub(event))
    if not worker_id:
        return error('User not found')

    booking_id = get_path_param(event, 'id')
    booking = get_item(f'BOOKING#{booking_id}', 'METADATA')
    if not booking:
        return not_found('Booking not found')
    # Ownership: only the assigned worker may verify / start.
    if booking.get('worker_id') != worker_id:
        return forbidden('You are not assigned to this booking')

    body = get_body(event)
    result, err, status_code = otp_handler.verify_arrival_otp(booking, body.get('otp'))
    if err:
        return error(err, status_code=status_code)

    # Sync the denormalized customer/worker refs to in_progress so all
    # dashboards show a consistent status (METADATA was updated atomically).
    _sync_refs_status(booking, 'in_progress')
    return success(result)


def _sync_refs_status(booking, new_status):
    """Mirror a status change onto the customer + worker booking refs."""
    booking_id = booking.get('id')
    customer_id = booking.get('customer_id')
    worker_id = booking.get('worker_id')
    if customer_id:
        try:
            update_item(f'USER#{customer_id}', f'BOOKING#{booking_id}', {'status': new_status})
        except Exception:  # noqa: BLE001
            pass
    if worker_id:
        try:
            update_item(f'WORKER_BOOKING#{worker_id}', f'BOOKING#{booking_id}', {'status': new_status})
        except Exception:  # noqa: BLE001
            pass


def _update_booking_status(booking_id, new_status, booking, reason=None):
    """Update booking status across all items."""
    updates = {'status': new_status, 'GSI1PK': f'STATUS#{new_status}', 'GSI1SK': f'BOOKING#{now_iso()}'}
    if reason:
        updates['cancellation_reason'] = reason
    update_item(f'BOOKING#{booking_id}', 'METADATA', updates)

    # Update customer ref
    customer_id = booking.get('customer_id')
    if customer_id:
        update_item(f'USER#{customer_id}', f'BOOKING#{booking_id}', {'status': new_status})

    # Update worker ref
    worker_id = booking.get('worker_id')
    if worker_id:
        update_item(f'WORKER_BOOKING#{worker_id}', f'BOOKING#{booking_id}', {'status': new_status})


def create_review(event):
    """POST /api/reviews"""
    role = get_user_role(event)
    if role != 'customer':
        return forbidden('Only customers can submit reviews')

    customer_id = _get_user_id_from_sub(get_user_sub(event))
    body = get_body(event)
    booking_id = body.get('booking_id')
    rating = body.get('rating')
    comment = body.get('comment', '')

    if not booking_id or not rating:
        return error('booking_id and rating are required')

    rating = int(rating)
    if not (1 <= rating <= 5):
        return error('Rating must be between 1 and 5')

    booking = get_item(f'BOOKING#{booking_id}', 'METADATA')
    if not booking or booking.get('customer_id') != customer_id or booking['status'] != 'completed':
        return error('Booking not found or not completed')

    # Check if review exists
    existing = get_item(f'BOOKING#{booking_id}', 'REVIEW')
    if existing:
        return error('Review already submitted for this booking')

    worker_id = booking['worker_id']

    put_item({
        'PK': f'BOOKING#{booking_id}',
        'SK': 'REVIEW',
        'booking_id': booking_id,
        'customer_id': customer_id,
        'worker_id': worker_id,
        'rating': rating,
        'comment': comment,
        'customer_name': booking.get('customer_name', ''),
        'created_at': now_iso(),
        # GSI1: worker reviews
        'GSI1PK': f'WORKER_REVIEWS#{worker_id}',
        'GSI1SK': f'REVIEW#{now_iso()}',
    })

    # Update worker rating
    all_reviews = query_items(f'WORKER_REVIEWS#{worker_id}', index_name='GSI1')
    total = sum(int(r.get('rating', 0)) for r in all_reviews)
    count = len(all_reviews)
    avg = round(total / count, 2) if count > 0 else 0

    update_item(f'USER#{worker_id}', 'WORKER_PROFILE', {
        'rating_avg': avg,
        'rating_count': count,
    })

    return created({'message': 'Review submitted successfully'})


def get_worker_reviews(event):
    """GET /api/workers/{id}/reviews"""
    worker_id = get_path_param(event, 'id')
    if not worker_id:
        return error('Worker ID is required')

    items = query_items(f'WORKER_REVIEWS#{worker_id}', index_name='GSI1', scan_forward=False)
    reviews = [decimal_to_float(r) for r in items]

    total = sum(r.get('rating', 0) for r in reviews)
    count = len(reviews)
    avg = round(total / count, 2) if count > 0 else 0

    return success({
        'reviews': reviews,
        'count': count,
        'average_rating': avg,
        'total_reviews': count,
    })


# =============================================================================
# In-App Calling with Number Privacy (Feature 1)
# =============================================================================

# Booking statuses during which calling is permitted
_CALLABLE_STATUSES = ('accepted', 'in_progress')


def initiate_call(event):
    """
    POST /api/bookings/{id}/call

    Direct-dial calling for an active booking. The caller places the call from
    their OWN phone via the device's native dialer, so this endpoint returns the
    other party's phone number ONLY so the client can hand it to the OS dialer.

    Privacy model:
      - The number is returned solely to trigger the native dialer; the app UI
        never displays it (see CallButton.jsx — it shows only the callee's name).
      - The number IS handed to the caller's own phone (unavoidable for a
        self-dialed call: the phone must receive a number to dial it, and it
        will appear in the OS dialer / call history).

    Authorization (unchanged, strict):
      - Caller must be the customer OR the assigned worker of THIS booking.
      - Booking status must be 'accepted' or 'in_progress'.
    """
    role = get_user_role(event)
    if role not in ('customer', 'worker'):
        return forbidden('Only customers or workers can initiate calls')

    caller_user_id = _get_user_id_from_sub(get_user_sub(event))
    if not caller_user_id:
        return error('User not found')

    booking_id = get_path_param(event, 'id')
    if not booking_id:
        return error('Booking ID is required')

    booking = get_item(f'BOOKING#{booking_id}', 'METADATA')
    if not booking:
        return not_found('Booking not found')

    customer_id = booking.get('customer_id')
    worker_id = booking.get('worker_id')

    # Ownership / assignment check — caller must belong to this booking
    if caller_user_id not in (customer_id, worker_id):
        return forbidden('You are not part of this booking')

    # Status gate — calling only while the booking is active
    if booking.get('status') not in _CALLABLE_STATUSES:
        return error('Calling is only available for active bookings', status_code=409)

    # Determine the callee (the OTHER party) and fetch their profile server-side.
    if caller_user_id == customer_id:
        callee_profile = get_item(f'USER#{worker_id}', 'PROFILE')
        callee_role = 'worker'
        callee_name = booking.get('worker_name', '') or (callee_profile or {}).get('full_name', '')
    else:
        callee_profile = get_item(f'USER#{customer_id}', 'PROFILE')
        callee_role = 'customer'
        callee_name = booking.get('customer_name', '') or (callee_profile or {}).get('full_name', '')

    callee_number = (callee_profile or {}).get('phone', '')

    if not callee_number:
        return error(f'The {callee_role} has not added a phone number yet', status_code=422)

    # Return the number ONLY so the client can open the native dialer.
    # The frontend must NOT render this number; it displays only the name.
    return success({
        'call_status': 'dial',
        'phone': callee_number,
        'callee_name': callee_name or callee_role.capitalize(),
        'callee_role': callee_role,
    })


def update_booking_location(event):
    """PUT /api/bookings/{id}/location - Worker broadcasts real GPS"""
    role = get_user_role(event)
    if role != 'worker':
        return forbidden('Only assigned workers can update location')

    worker_id = _get_user_id_from_sub(get_user_sub(event))
    if not worker_id:
        return not_found('User not found')

    booking_id = get_path_param(event, 'id')
    booking = get_item(f'BOOKING#{booking_id}', 'METADATA')
    if not booking:
        return not_found('Booking not found')

    if booking.get('worker_id') != worker_id:
        return forbidden('You are not assigned to this booking')

    body = get_body(event)
    lat = body.get('latitude')
    lng = body.get('longitude')
    if lat is None or lng is None:
        return error('latitude and longitude are required')

    try:
        lat_f = float(lat)
        lng_f = float(lng)
        heading_f = float(body.get('heading') or 0)
        speed_f = float(body.get('speed') or 0)
        acc_f = float(body.get('accuracy') or 0)
    except (ValueError, TypeError):
        return error('latitude, longitude, heading, speed and accuracy must be valid numbers')

    from db import activity_table
    now = now_iso()
    ttl = int((datetime.now(timezone.utc) + timedelta(days=7)).timestamp())

    tracking_item = {
        'PK': f'TRACKING#{booking_id}',
        'SK': 'LATEST',
        'booking_id': booking_id,
        'worker_id': worker_id,
        'latitude': lat_f,
        'longitude': lng_f,
        'heading': heading_f,
        'speed': speed_f,
        'accuracy': acc_f,
        'timestamp': body.get('timestamp') or now,
        'updated_at': now,
        'TTL': ttl,
    }
    put_item(tracking_item, table_ref=activity_table)

    return success({
        'success': True,
        'message': 'Location updated successfully',
        'status': 'recorded',
        'booking_id': booking_id,
        'location': {
            'latitude': lat_f,
            'longitude': lng_f,
            'heading': heading_f,
            'speed': speed_f,
            'accuracy': acc_f,
            'timestamp': body.get('timestamp') or now,
        },
        'timestamp': now,
    })


def get_booking_location(event):
    """GET /api/bookings/{id}/location - Customer or worker tracks live location"""
    user_id = _get_user_id_from_sub(get_user_sub(event))
    if not user_id:
        return not_found('User not found')

    booking_id = get_path_param(event, 'id')
    booking = get_item(f'BOOKING#{booking_id}', 'METADATA')
    if not booking:
        return not_found('Booking not found')

    role = get_user_role(event)
    if role != 'admin' and booking.get('customer_id') != user_id and booking.get('worker_id') != user_id:
        return forbidden('You do not have access to this booking location')

    from db import activity_table
    tracking = get_item(f'TRACKING#{booking_id}', 'LATEST', table_ref=activity_table)
    loc = decimal_to_float(tracking) if tracking else None

    return success({
        'booking_id': booking_id,
        'status': booking.get('status'),
        'location': loc,
        'worker_location': loc,
        'destination_address': booking.get('address'),
        'destination': {
            'address': booking.get('address'),
            'city': booking.get('city'),
        },
        'service_name': booking.get('service_name'),
    })
