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
