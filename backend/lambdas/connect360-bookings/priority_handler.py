"""
Connect360 - Priority Booking handler (Feature 3)

Implements the automatic worker-matching booking flow. This lives in the
bookings Lambda and shares the SAME core booking entity (BOOKING#{id}/METADATA)
as Manual Booking. Manual Booking code is untouched.

LIFECYCLE (stored in booking.status):
    matching        -> engine is selecting/ranking workers
    worker_pending  -> a worker has been offered the job, awaiting response
    accepted        -> worker accepted; booking is confirmed (reuses manual flow)
    rematching      -> previous worker rejected/expired; picking the next one
    no_worker_available -> pool exhausted / none eligible
    expired         -> worker did not respond in time (transient, -> rematch)
    cancelled       -> customer cancelled

Once a priority booking reaches 'accepted' it behaves exactly like a manual
booking (in_progress/completed/cancel/call/review all work unchanged) because it
is the same item with the same fields.

AUTHORIZATION (server-side only):
  - Only a customer can create/cancel their own priority request.
  - Only the CURRENT offered worker can accept/reject a request.
  - Availability is ALWAYS re-checked server-side before confirmation.

RACE SAFETY:
  - Worker acceptance uses a conditional transactional write so only one booking
    can be confirmed for a worker+slot, and a stale/expired offer cannot be
    accepted.

TIMEOUT NOTE (documented limitation):
  There is no always-on scheduler (to stay within the free tier / Rs.0). Offer
  expiry is evaluated LAZILY: whenever the customer polls status or a rematch is
  triggered, an offer past its `expires_at` is treated as expired and the next
  worker is tried. An EventBridge-scheduled sweeper could later make this
  proactive without changing the data model.
"""

import os
from datetime import datetime, timezone, timedelta

from db import (put_item, get_item, update_item, delete_item, query_items,
                generate_id, now_iso, decimal_to_float, table, transact_write)
from response import success, created, error, not_found, forbidden, server_error
from auth_helpers import get_user_sub, get_user_role, get_path_param, get_body
import matching_service

# How long a worker has to respond to an offer before it is considered expired.
OFFER_TIMEOUT_SECONDS = int(os.environ.get("PRIORITY_OFFER_TIMEOUT_SECONDS", "120"))

TABLE_NAME = os.environ.get("DYNAMODB_TABLE", "connect360-main-dev")

# Priority-specific statuses (manual statuses reused for the confirmed path)
STATUS_MATCHING = "matching"
STATUS_WORKER_PENDING = "worker_pending"
STATUS_REMATCHING = "rematching"
STATUS_NO_WORKER = "no_worker_available"
STATUS_EXPIRED = "expired"
STATUS_ACCEPTED = "accepted"
STATUS_CANCELLED = "cancelled"


# =============================================================================
# Data provider adapter for the matching engine (keeps engine AWS-agnostic)
# =============================================================================
class _DynamoDataProvider:
    """Adapts DynamoDB single-table queries to the matching_service interface."""

    def get_workers_for_service(self, service_id):
        workers = []
        if service_id:
            refs = query_items(f'SERVICE_WORKER#{service_id}', index_name='GSI1')
            worker_ids = [r.get('GSI1SK', '').replace('WORKER#', '') for r in refs]
        else:
            items = query_items('ROLE#worker', index_name='GSI1')
            worker_ids = [i.get('id') for i in items if i.get('id')]

        for wid in worker_ids:
            summary = self._build_summary(wid)
            if summary:
                workers.append(summary)
        return workers

    def get_worker_availability(self, worker_id):
        items = query_items(f'USER#{worker_id}', sk_begins_with='AVAIL#')
        return [decimal_to_float(a) for a in items]

    def _build_summary(self, user_id):
        user = get_item(f'USER#{user_id}', 'PROFILE')
        profile = get_item(f'USER#{user_id}', 'WORKER_PROFILE')
        if not user or not profile:
            return None
        service_items = query_items(f'USER#{user_id}', sk_begins_with='SERVICE#')
        return decimal_to_float({
            'id': user_id,
            'full_name': user.get('full_name'),
            'city': user.get('city'),
            'experience_years': profile.get('experience_years', 0),
            'hourly_rate': profile.get('hourly_rate', 0),
            'rating_avg': profile.get('rating_avg', 0),
            'rating_count': profile.get('rating_count', 0),
            'is_verified': profile.get('is_verified', False),
            'is_available': profile.get('is_available', True),
            'service_ids': [s.get('service_id') for s in service_items],
            'service_names': [s.get('service_name', '') for s in service_items],
        })


_PROVIDER = _DynamoDataProvider()


# =============================================================================
# Helpers
# =============================================================================
def _get_user_id_from_sub(cognito_sub):
    items = query_items(f'COGNITO#{cognito_sub}', sk_begins_with='USER', index_name='GSI2')
    return items[0].get('id') if items else None


def _offer_expiry_iso():
    return (datetime.now(timezone.utc) + timedelta(seconds=OFFER_TIMEOUT_SECONDS)).isoformat()


def _is_offer_expired(booking):
    expires_at = booking.get('offer_expires_at')
    if not expires_at:
        return False
    try:
        exp = datetime.fromisoformat(str(expires_at))
    except ValueError:
        return False
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) >= exp


def _validate_request_fields(body):
    """Backend validation (never trust the frontend)."""
    service_id = body.get('service_id')
    address = (body.get('address') or '').strip()
    if not service_id:
        return 'service_id is required'
    if not address:
        return 'address is required'

    date_str = (body.get('scheduled_date') or '').strip()
    if date_str:
        try:
            d = datetime.strptime(date_str[:10], '%Y-%m-%d').date()
        except ValueError:
            return 'scheduled_date must be YYYY-MM-DD'
        if d < datetime.now(timezone.utc).date():
            return 'scheduled_date cannot be in the past'

    bmin = body.get('budget_min')
    bmax = body.get('budget_max')
    if bmin is not None and bmax is not None:
        try:
            if float(bmin) > float(bmax):
                return 'budget_min cannot exceed budget_max'
        except (TypeError, ValueError):
            return 'budget values must be numbers'
    return None


def _public_worker_view(ranked_entry):
    """
    Privacy-safe worker snapshot for the customer status screen.
    NO phone/email/address — only what the app already exposes publicly.
    """
    w = ranked_entry['worker']
    return {
        'worker_id': ranked_entry['worker_id'],
        'full_name': w.get('full_name'),
        'city': w.get('city'),
        'rating_avg': w.get('rating_avg', 0),
        'rating_count': w.get('rating_count', 0),
        'experience_years': w.get('experience_years', 0),
        'hourly_rate': w.get('hourly_rate', 0),
        'match_score': ranked_entry['score_pct'],
    }


def _write_customer_ref(customer_id, booking):
    put_item({
        'PK': f'USER#{customer_id}',
        'SK': f'BOOKING#{booking["id"]}',
        'booking_id': booking['id'],
        'booking_type': 'priority',
        'worker_name': booking.get('worker_name', ''),
        'service_name': booking.get('service_name', ''),
        'status': booking['status'],
        'scheduled_date': booking.get('scheduled_date', ''),
        'scheduled_time': booking.get('scheduled_time', ''),
        'total_amount': booking.get('total_amount', 0),
        'created_at': booking.get('created_at'),
    })


def _update_customer_ref(customer_id, booking_id, updates):
    # Only update if the ref exists (it always should for priority)
    update_item(f'USER#{customer_id}', f'BOOKING#{booking_id}', updates)


# =============================================================================
# Matching orchestration
# =============================================================================
def _run_match_and_offer(booking, attempted):
    """
    Run the matching engine, pick the best not-yet-attempted worker, and record
    an offer on the booking. Mutates and persists the booking item.
    Returns the updated booking dict.
    """
    request = {
        'service_id': booking.get('service_id'),
        'service_name': booking.get('service_name'),
        'scheduled_date': booking.get('scheduled_date'),
        'scheduled_time': booking.get('scheduled_time'),
        'duration_hours': booking.get('duration_hours', 1),
        'city': booking.get('city'),
        'location': booking.get('address'),
        'budget_min': booking.get('budget_min'),
        'budget_max': booking.get('budget_max'),
    }

    result = matching_service.match(request, _PROVIDER, attempted_worker_ids=attempted)
    best = result['best']

    booking_id = booking['id']
    customer_id = booking['customer_id']

    if not best:
        # No (more) eligible workers
        updates = {
            'status': STATUS_NO_WORKER,
            'worker_id': None,
            'candidate_worker_ids': result['candidates'],
            'attempted_worker_ids': attempted,
            'offer_expires_at': None,
            'match_score': 0,
        }
        update_item(f'BOOKING#{booking_id}', 'METADATA', updates)
        _update_customer_ref(customer_id, booking_id, {'status': STATUS_NO_WORKER})
        _notify(customer_id, 'priority_no_worker', booking_id,
                'We could not find an available worker for your request.')
        booking.update(updates)
        return booking

    worker = best['worker']
    hourly_rate = float(worker.get('hourly_rate', 0) or 0)
    duration = float(booking.get('duration_hours', 1) or 1)
    total_amount = hourly_rate * duration

    updates = {
        'status': STATUS_WORKER_PENDING,
        'worker_id': best['worker_id'],
        'worker_name': worker.get('full_name', ''),
        'total_amount': total_amount,
        'match_score': best['score_pct'],
        'match_reason': best['match_reason'],
        'candidate_worker_ids': result['candidates'],
        'attempted_worker_ids': attempted,
        'offer_expires_at': _offer_expiry_iso(),
        'GSI1PK': f'STATUS#{STATUS_WORKER_PENDING}',
        'GSI1SK': f'BOOKING#{now_iso()}',
    }
    update_item(f'BOOKING#{booking_id}', 'METADATA', updates)
    booking.update(updates)

    # Write/refresh the worker's priority-request ref so it appears in their queue
    _write_worker_priority_ref(booking)

    _update_customer_ref(customer_id, booking_id, {
        'status': STATUS_WORKER_PENDING,
        'worker_name': worker.get('full_name', ''),
        'total_amount': total_amount,
    })
    _notify(customer_id, 'priority_worker_found', booking_id,
            f"We found {worker.get('full_name', 'a worker')} for your request.")
    _notify(best['worker_id'], 'priority_request', booking_id,
            'You have a new priority job request.')
    return booking


def _write_worker_priority_ref(booking):
    """Worker-facing pending request ref (privacy-safe fields only)."""
    worker_id = booking['worker_id']
    put_item({
        'PK': f'WORKER_PRIORITY#{worker_id}',
        'SK': f'REQUEST#{booking["id"]}',
        'booking_id': booking['id'],
        'booking_type': 'priority',
        'customer_name': booking.get('customer_name', ''),
        'service_name': booking.get('service_name', ''),
        'scheduled_date': booking.get('scheduled_date', ''),
        'scheduled_time': booking.get('scheduled_time', ''),
        'address_area': booking.get('city') or _coarse_area(booking.get('address', '')),
        'total_amount': booking.get('total_amount', 0),
        'match_score': booking.get('match_score', 0),
        'status': STATUS_WORKER_PENDING,
        'offer_expires_at': booking.get('offer_expires_at'),
        'created_at': now_iso(),
    })


def _clear_worker_priority_ref(worker_id, booking_id):
    if worker_id:
        delete_item(f'WORKER_PRIORITY#{worker_id}', f'REQUEST#{booking_id}')


def _coarse_area(address):
    """Coarsen an address to avoid exposing an exact location before acceptance."""
    if not address:
        return ''
    parts = [p.strip() for p in str(address).split(',') if p.strip()]
    return parts[-1] if parts else ''


# =============================================================================
# Notifications (reuses the activity table; lightweight, no new infra)
# =============================================================================
def _notify(user_id, kind, booking_id, message):
    if not user_id:
        return
    try:
        from db import activity_table
        ts = now_iso()
        put_item({
            'PK': f'NOTIF#{user_id}',
            'SK': f'NOTIF#{ts}#{generate_id()[:8]}',
            'user_id': user_id,
            'kind': kind,
            'booking_id': booking_id,
            'message': message,
            'read': False,
            'created_at': ts,
            # auto-expire notifications after 30 days
            'TTL': int((datetime.now(timezone.utc) + timedelta(days=30)).timestamp()),
        }, table_ref=activity_table)
    except Exception as e:  # noqa: BLE001 - notifications are best-effort
        print(f"[priority] notify failed: {type(e).__name__}")


# =============================================================================
# API: create priority booking
# =============================================================================
def create_priority_booking(event):
    """POST /api/bookings/priority"""
    role = get_user_role(event)
    if role != 'customer':
        return forbidden('Only customers can create priority bookings')

    customer_id = _get_user_id_from_sub(get_user_sub(event))
    if not customer_id:
        return error('User not found')

    body = get_body(event)
    validation_error = _validate_request_fields(body)
    if validation_error:
        return error(validation_error)

    service = get_item(f'SERVICE#{body["service_id"]}', 'METADATA')
    if not service:
        return error('Selected service does not exist')

    customer_user = get_item(f'USER#{customer_id}', 'PROFILE')

    booking_id = generate_id()
    now = now_iso()

    booking = {
        'PK': f'BOOKING#{booking_id}',
        'SK': 'METADATA',
        'id': booking_id,
        'booking_type': 'priority',
        'customer_id': customer_id,
        'worker_id': None,
        'service_id': body['service_id'],
        'status': STATUS_MATCHING,
        'scheduled_date': (body.get('scheduled_date') or '').strip(),
        'scheduled_time': (body.get('scheduled_time') or '').strip(),
        'duration_hours': float(body.get('duration_hours', 1) or 1),
        'address': (body.get('address') or '').strip(),
        'city': (body.get('city') or customer_user.get('city', '') if customer_user else '') or '',
        'notes': body.get('special_requirements', '') or body.get('notes', ''),
        'total_amount': 0,
        'customer_name': customer_user.get('full_name', '') if customer_user else '',
        'worker_name': '',
        'service_name': service.get('name', ''),
        # Priority request payload
        'urgency': body.get('urgency', ''),
        'budget_min': body.get('budget_min'),
        'budget_max': body.get('budget_max'),
        'experience_preference': body.get('experience_preference'),
        # Matching state
        'candidate_worker_ids': [],
        'attempted_worker_ids': [],
        'match_score': 0,
        'match_reason': {},
        'offer_expires_at': None,
        'created_at': now,
        'updated_at': now,
        'GSI1PK': f'STATUS#{STATUS_MATCHING}',
        'GSI1SK': f'BOOKING#{now}',
    }
    put_item(booking)
    _write_customer_ref(customer_id, booking)
    _notify(customer_id, 'priority_submitted', booking_id,
            'Your priority request was submitted. Finding the best worker...')

    # Run first match immediately (synchronous, keeps flow simple + Rs.0)
    booking = _run_match_and_offer(booking, attempted=[])

    return created({
        'message': 'Priority request created',
        'booking_id': booking_id,
        'status': booking['status'],
        'match_score': booking.get('match_score', 0),
    })


# =============================================================================
# API: customer status list / polling
# =============================================================================
def list_customer_priority_bookings(event):
    """GET /api/customer/priority-bookings"""
    role = get_user_role(event)
    if role != 'customer':
        return forbidden('Only customers can access this endpoint')

    customer_id = _get_user_id_from_sub(get_user_sub(event))
    if not customer_id:
        return error('User not found')

    refs = query_items(f'USER#{customer_id}', sk_begins_with='BOOKING#')
    result = []
    for ref in refs:
        if ref.get('booking_type') != 'priority':
            continue
        booking = get_item(f'BOOKING#{ref["booking_id"]}', 'METADATA')
        if not booking:
            continue
        # Lazy expiry check on read
        booking = _maybe_expire_and_rematch(booking)
        result.append(_customer_status_payload(booking))

    result.sort(key=lambda b: b.get('created_at', ''), reverse=True)
    return success({'priority_bookings': result, 'count': len(result)})


def _customer_status_payload(booking):
    b = decimal_to_float(booking)
    payload = {
        'booking_id': b['id'],
        'booking_type': 'priority',
        'status': b['status'],
        'service_name': b.get('service_name'),
        'scheduled_date': b.get('scheduled_date'),
        'scheduled_time': b.get('scheduled_time'),
        'total_amount': b.get('total_amount', 0),
        'match_score': b.get('match_score', 0),
        'created_at': b.get('created_at'),
    }
    # Show the currently offered / assigned worker (privacy-safe)
    if b.get('worker_id') and b['status'] in (STATUS_WORKER_PENDING, STATUS_ACCEPTED):
        payload['worker'] = {
            'worker_id': b.get('worker_id'),
            'full_name': b.get('worker_name'),
            'match_score': b.get('match_score', 0),
        }
    return payload


def _maybe_expire_and_rematch(booking):
    """If an offer has expired, mark expired and try the next worker."""
    if booking.get('status') == STATUS_WORKER_PENDING and _is_offer_expired(booking):
        attempted = list(booking.get('attempted_worker_ids') or [])
        current = booking.get('worker_id')
        if current and current not in attempted:
            attempted.append(current)
        _clear_worker_priority_ref(current, booking['id'])
        _notify(current, 'priority_expired', booking['id'],
                'A priority request offer expired and was reassigned.')
        booking['status'] = STATUS_REMATCHING
        booking = _run_match_and_offer(booking, attempted=attempted)
    return booking


# =============================================================================
# API: worker priority request queue
# =============================================================================
def list_worker_priority_requests(event):
    """GET /api/worker/priority-requests"""
    role = get_user_role(event)
    if role != 'worker':
        return forbidden('Only workers can access this endpoint')

    worker_id = _get_user_id_from_sub(get_user_sub(event))
    if not worker_id:
        return error('User not found')

    refs = query_items(f'WORKER_PRIORITY#{worker_id}', sk_begins_with='REQUEST#')
    requests = []
    for ref in refs:
        booking = get_item(f'BOOKING#{ref["booking_id"]}', 'METADATA')
        # Only surface offers still actively pending for THIS worker
        if not booking or booking.get('worker_id') != worker_id:
            _clear_worker_priority_ref(worker_id, ref['booking_id'])
            continue
        if booking.get('status') != STATUS_WORKER_PENDING or _is_offer_expired(booking):
            continue
        r = decimal_to_float(ref)
        requests.append({
            'booking_id': r['booking_id'],
            'booking_type': 'priority',
            'customer_name': r.get('customer_name'),
            'service_name': r.get('service_name'),
            'scheduled_date': r.get('scheduled_date'),
            'scheduled_time': r.get('scheduled_time'),
            'area': r.get('address_area'),
            'estimated_earnings': r.get('total_amount', 0),
            'match_score': r.get('match_score', 0),
            'offer_expires_at': r.get('offer_expires_at'),
        })

    requests.sort(key=lambda x: x.get('match_score', 0), reverse=True)
    return success({'priority_requests': requests, 'count': len(requests)})


# =============================================================================
# API: worker accept (atomic, race-safe)
# =============================================================================
def worker_accept_priority(event):
    """POST /api/priority/{id}/accept"""
    role = get_user_role(event)
    if role != 'worker':
        return forbidden('Only workers can accept priority requests')

    worker_id = _get_user_id_from_sub(get_user_sub(event))
    if not worker_id:
        return error('User not found')

    booking_id = get_path_param(event, 'id')
    booking = get_item(f'BOOKING#{booking_id}', 'METADATA')
    if not booking or booking.get('booking_type') != 'priority':
        return not_found('Priority request not found')

    # Only the currently offered worker may accept
    if booking.get('worker_id') != worker_id:
        return forbidden('This request is not assigned to you')

    # Stale / expired offer -> safely reject the acceptance and rematch
    if booking.get('status') != STATUS_WORKER_PENDING or _is_offer_expired(booking):
        _clear_worker_priority_ref(worker_id, booking_id)
        return error('This request is no longer available', status_code=409)

    # Re-check the worker is still generally available (never trust prior state)
    profile = get_item(f'USER#{worker_id}', 'WORKER_PROFILE')
    if not profile or not profile.get('is_available') or not profile.get('is_verified'):
        # Worker no longer eligible -> auto-rematch to the next candidate
        attempted = list(booking.get('attempted_worker_ids') or [])
        if worker_id not in attempted:
            attempted.append(worker_id)
        _clear_worker_priority_ref(worker_id, booking_id)
        booking['status'] = STATUS_REMATCHING
        _run_match_and_offer(booking, attempted=attempted)
        return error('You are not currently available for this job', status_code=409)

    now = now_iso()
    slot_key = f"{booking.get('scheduled_date','')}#{booking.get('scheduled_time','')}"

    # Atomic transaction:
    #   1. Confirm the booking ONLY if it is still worker_pending for THIS worker.
    #   2. Claim a unique worker+slot lock so the same slot can't be double-booked.
    try:
        transact_write([
            {
                'Update': {
                    'TableName': TABLE_NAME,
                    'Key': {'PK': {'S': f'BOOKING#{booking_id}'}, 'SK': {'S': 'METADATA'}},
                    'UpdateExpression': (
                        'SET #s = :accepted, GSI1PK = :gpk, GSI1SK = :gsk, '
                        'offer_expires_at = :null, updated_at = :now'
                    ),
                    'ConditionExpression': '#s = :pending AND worker_id = :wid',
                    'ExpressionAttributeNames': {'#s': 'status'},
                    'ExpressionAttributeValues': {
                        ':accepted': {'S': STATUS_ACCEPTED},
                        ':pending': {'S': STATUS_WORKER_PENDING},
                        ':wid': {'S': worker_id},
                        ':gpk': {'S': f'STATUS#{STATUS_ACCEPTED}'},
                        ':gsk': {'S': f'BOOKING#{now}'},
                        ':null': {'NULL': True},
                        ':now': {'S': now},
                    },
                }
            },
            {
                'Put': {
                    'TableName': TABLE_NAME,
                    'Item': {
                        'PK': {'S': f'WORKER_SLOT#{worker_id}'},
                        'SK': {'S': f'SLOT#{slot_key}'},
                        'booking_id': {'S': booking_id},
                        'created_at': {'S': now},
                    },
                    'ConditionExpression': 'attribute_not_exists(PK)',
                }
            },
        ])
    except Exception as e:  # noqa: BLE001 - transaction cancelled = lost the race
        print(f"[priority] accept transaction failed: {type(e).__name__}")
        return error('This slot is no longer available', status_code=409)

    # Post-confirmation: mirror into the standard booking refs so the confirmed
    # priority booking shows up in the normal customer & worker booking lists.
    customer_id = booking.get('customer_id')
    _update_customer_ref(customer_id, booking_id, {
        'status': STATUS_ACCEPTED,
        'worker_name': booking.get('worker_name', ''),
    })
    put_item({
        'PK': f'WORKER_BOOKING#{worker_id}',
        'SK': f'BOOKING#{booking_id}',
        'booking_id': booking_id,
        'booking_type': 'priority',
        'customer_name': booking.get('customer_name', ''),
        'service_name': booking.get('service_name', ''),
        'status': STATUS_ACCEPTED,
        'scheduled_date': booking.get('scheduled_date', ''),
        'scheduled_time': booking.get('scheduled_time', ''),
        'total_amount': booking.get('total_amount', 0),
        'address': booking.get('address', ''),
        'notes': booking.get('notes', ''),
        'created_at': now,
        'GSI2PK': f'WORKER#{worker_id}',
        'GSI2SK': f'BOOKING#{booking.get("scheduled_date","")}#{booking_id}',
    })
    _clear_worker_priority_ref(worker_id, booking_id)

    _notify(customer_id, 'priority_confirmed', booking_id,
            f"{booking.get('worker_name','Your worker')} accepted. Booking confirmed.")
    _notify(worker_id, 'priority_accepted', booking_id, 'You accepted a priority job.')

    return success({'message': 'Priority booking confirmed', 'status': STATUS_ACCEPTED})


# =============================================================================
# API: worker reject -> auto rematch
# =============================================================================
def worker_reject_priority(event):
    """POST /api/priority/{id}/reject"""
    role = get_user_role(event)
    if role != 'worker':
        return forbidden('Only workers can reject priority requests')

    worker_id = _get_user_id_from_sub(get_user_sub(event))
    if not worker_id:
        return error('User not found')

    booking_id = get_path_param(event, 'id')
    booking = get_item(f'BOOKING#{booking_id}', 'METADATA')
    if not booking or booking.get('booking_type') != 'priority':
        return not_found('Priority request not found')
    if booking.get('worker_id') != worker_id:
        return forbidden('This request is not assigned to you')
    if booking.get('status') != STATUS_WORKER_PENDING:
        return error('This request can no longer be rejected', status_code=409)

    attempted = list(booking.get('attempted_worker_ids') or [])
    if worker_id not in attempted:
        attempted.append(worker_id)

    _clear_worker_priority_ref(worker_id, booking_id)
    _notify(worker_id, 'priority_rejected', booking_id, 'You declined a priority job.')

    booking['status'] = STATUS_REMATCHING
    booking = _run_match_and_offer(booking, attempted=attempted)

    return success({
        'message': 'Request declined; finding the next best worker',
        'status': booking['status'],
    })


# =============================================================================
# API: explicit rematch (customer-triggered from a no_worker screen, or retry)
# =============================================================================
def rematch_priority_booking(event):
    """POST /api/priority/{id}/rematch"""
    role = get_user_role(event)
    customer_id = _get_user_id_from_sub(get_user_sub(event))
    booking_id = get_path_param(event, 'id')
    booking = get_item(f'BOOKING#{booking_id}', 'METADATA')

    if not booking or booking.get('booking_type') != 'priority':
        return not_found('Priority request not found')
    if role != 'customer' or booking.get('customer_id') != customer_id:
        return forbidden('You cannot modify this request')
    if booking.get('status') in (STATUS_ACCEPTED, STATUS_CANCELLED):
        return error('This booking can no longer be rematched', status_code=409)

    attempted = list(booking.get('attempted_worker_ids') or [])
    booking['status'] = STATUS_REMATCHING
    booking = _run_match_and_offer(booking, attempted=attempted)
    return success({'message': 'Rematching', 'status': booking['status']})


# =============================================================================
# API: customer cancel (while matching / pending)
# =============================================================================
def cancel_priority_booking(event):
    """PUT /api/priority/{id}/cancel"""
    role = get_user_role(event)
    customer_id = _get_user_id_from_sub(get_user_sub(event))
    booking_id = get_path_param(event, 'id')
    booking = get_item(f'BOOKING#{booking_id}', 'METADATA')

    if not booking or booking.get('booking_type') != 'priority':
        return not_found('Priority request not found')
    if role != 'customer' or booking.get('customer_id') != customer_id:
        return forbidden('You cannot cancel this request')

    # Confirmed priority bookings follow the normal cancellation path elsewhere.
    if booking.get('status') == STATUS_ACCEPTED:
        return error('This booking is confirmed; cancel it from My Bookings', status_code=409)
    if booking.get('status') == STATUS_CANCELLED:
        return error('Already cancelled', status_code=409)

    current_worker = booking.get('worker_id')
    _clear_worker_priority_ref(current_worker, booking_id)

    update_item(f'BOOKING#{booking_id}', 'METADATA', {
        'status': STATUS_CANCELLED,
        'offer_expires_at': None,
        'GSI1PK': f'STATUS#{STATUS_CANCELLED}',
        'GSI1SK': f'BOOKING#{now_iso()}',
    })
    _update_customer_ref(customer_id, booking_id, {'status': STATUS_CANCELLED})
    if current_worker:
        _notify(current_worker, 'priority_cancelled', booking_id,
                'A priority request was cancelled by the customer.')

    return success({'message': 'Priority request cancelled', 'status': STATUS_CANCELLED})
