"""
Connect360 - Bookings Lambda (DynamoDB)
Handles all booking lifecycle + reviews.
"""

import sys
import os
from decimal import Decimal

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'shared'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'shared'))

from db import (put_item, get_item, update_item, query_items, query_all,
                generate_id, now_iso, decimal_to_float)
from response import success, created, error, not_found, forbidden, server_error
from auth_helpers import get_user_claims, get_user_sub, get_user_role, get_path_param, get_query_param, get_body
import calling_provider
import priority_handler


def lambda_handler(event, context):
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
        elif method == 'GET' and resource == '/api/worker/bookings/{id}':
            return get_worker_booking_detail(event)
        elif method == 'PUT' and '/worker/bookings/{id}/respond' in resource:
            return respond_to_booking(event)
        elif method == 'PUT' and '/worker/bookings/{id}/status' in resource:
            return update_booking_status(event)
        elif method == 'POST' and resource == '/api/reviews':
            return create_review(event)
        elif method == 'GET' and '/workers/{id}/reviews' in resource:
            return get_worker_reviews(event)
        elif method == 'POST' and '/bookings/{id}/call' in resource:
            return initiate_call(event)
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

    bookings.sort(key=lambda b: b.get('scheduled_date', ''), reverse=True)
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

    bookings.sort(key=lambda b: b.get('scheduled_date', ''), reverse=True)
    return success({'bookings': bookings, 'count': len(bookings)})


def get_worker_booking_detail(event):
    """GET /api/worker/bookings/{id}"""
    booking_id = get_path_param(event, 'id')
    booking = get_item(f'BOOKING#{booking_id}', 'METADATA')
    if not booking:
        return not_found('Booking not found')
    return success({'booking': decimal_to_float(booking)})


def respond_to_booking(event):
    """PUT /api/worker/bookings/{id}/respond"""
    role = get_user_role(event)
    if role != 'worker':
        return forbidden('Only workers can respond to bookings')

    booking_id = get_path_param(event, 'id')
    body = get_body(event)
    action = body.get('action')

    if action not in ('accept', 'reject'):
        return error('Action must be "accept" or "reject"')

    booking = get_item(f'BOOKING#{booking_id}', 'METADATA')
    if not booking:
        return not_found('Booking not found')
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

    booking_id = get_path_param(event, 'id')
    body = get_body(event)
    new_status = body.get('status')

    valid_transitions = {'accepted': ['in_progress'], 'in_progress': ['completed']}

    booking = get_item(f'BOOKING#{booking_id}', 'METADATA')
    if not booking:
        return not_found('Booking not found')

    current = booking['status']
    if new_status not in valid_transitions.get(current, []):
        return error(f'Cannot transition from "{current}" to "{new_status}"')

    _update_booking_status(booking_id, new_status, booking)

    return success({'message': f'Booking status updated to {new_status}', 'status': new_status})


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

    Bridges a masked call between the customer and the assigned worker for an
    active booking. Neither party's real phone number is returned to the client.

    Authorization:
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

    # Determine caller vs callee and fetch numbers SERVER-SIDE ONLY.
    # These numbers are never placed in any response, log, or error.
    if caller_user_id == customer_id:
        caller_profile = get_item(f'USER#{customer_id}', 'PROFILE')
        callee_profile = get_item(f'USER#{worker_id}', 'PROFILE')
        callee_role = 'worker'
    else:
        caller_profile = get_item(f'USER#{worker_id}', 'PROFILE')
        callee_profile = get_item(f'USER#{customer_id}', 'PROFILE')
        callee_role = 'customer'

    caller_number = (caller_profile or {}).get('phone', '')
    callee_number = (callee_profile or {}).get('phone', '')

    if not caller_number:
        return error('Add your phone number in your profile to make calls', status_code=422)
    if not callee_number:
        return error(f'The {callee_role} has not added a phone number yet', status_code=422)

    # Delegate to the isolated provider adapter. It returns NO phone numbers.
    result = calling_provider.initiate_masked_call(
        caller_number=caller_number,
        callee_number=callee_number,
        booking_id=booking_id,
    )

    status = result.get('status')

    if status == calling_provider.STATUS_INITIATED:
        return success({
            'call_status': 'calling',
            'masked': True,
            'message': f'Connecting your call to the {callee_role}. Please answer your phone.',
        })

    if status == calling_provider.STATUS_NOT_CONFIGURED:
        return error('Calling is not available right now', status_code=503)

    if status == calling_provider.STATUS_INVALID_NUMBERS:
        return error('Calling could not be completed. Please check phone numbers.', status_code=422)

    # STATUS_PROVIDER_ERROR or anything unexpected — safe generic message
    return error('Unable to connect the call. Please try again later.', status_code=502)
