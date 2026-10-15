"""
Connect360 - Booking Reminder / Overdue Monitoring (Enhancement)

Adds automatic monitoring of scheduled bookings so that a booking whose service
time has passed but which the worker never marked "completed" is surfaced as an
OVERDUE reminder instead of silently sitting in the dashboard forever.

DESIGN PRINCIPLES (kept consistent with the rest of the bookings Lambda):
  - Lives in the bookings Lambda as a sibling module (packaged automatically).
  - Reuses the SAME booking entity (BOOKING#{id}/METADATA) and the SAME three
    denormalized refs (customer ref, worker ref) used by manual + priority flows.
  - Reuses the existing NOTIF#{user_id} items on the activity table (the exact
    pattern priority_handler._notify writes) so no new infra is required for
    notifications.
  - Does NOT change the booking workflow: an overdue booking keeps its real
    status (accepted / in_progress / pending). "Overdue" is a SEPARATE boolean
    flag (overdue_flag) + a timestamp, never an automatic transition to
    'completed'. Only the worker can mark a job completed, as before.

RELIABLE SERVER-SIDE EXECUTION:
  sweep_overdue_bookings() is invoked by an EventBridge schedule (see
  infra/reminders.tf). The bookings Lambda handler recognises the scheduled
  event and calls this sweep. The same function is safe to call lazily (e.g.
  when a worker lists their bookings) so reminders still work even without the
  schedule, mirroring the "lazy expiry" approach already used by priority
  bookings.

DE-DUPLICATION:
  A booking is only flagged overdue once (overdue_flag guard), and the worker
  reminder notification uses a DETERMINISTIC sort key (OVERDUE#{booking_id})
  written with a conditional put, so repeated sweeps never create duplicate
  reminder notifications for the same booking.
"""

import os
from datetime import datetime, timezone, timedelta

from db import (get_item, update_item, query_items, query_all,
                now_iso, decimal_to_float, activity_table)

# Statuses that represent "work still owed" — these can become overdue if the
# scheduled time passes without completion. Terminal statuses are never overdue.
OVERDUE_CANDIDATE_STATUSES = ('pending', 'accepted', 'in_progress')

# Grace period (minutes) after the scheduled start before a booking is treated
# as overdue. Configurable via env; defaults to 60 minutes.
OVERDUE_GRACE_MINUTES = int(os.environ.get('OVERDUE_GRACE_MINUTES', '60'))

# Business time zone offset (in minutes) for interpreting scheduled_date /
# scheduled_time. Bookings are captured from a plain <input type="date|time">
# as the customer's LOCAL wall-clock time (no offset) and stored verbatim, so to
# compare them against "now" we must know the local offset. Default is +330
# (IST, UTC+5:30) since the app targets India; override via BOOKING_TZ_OFFSET_MINUTES.
#   e.g. UTC = 0, IST = 330, EST = -300.
BOOKING_TZ_OFFSET_MINUTES = int(os.environ.get('BOOKING_TZ_OFFSET_MINUTES', '330'))

# Notifications auto-expire after 30 days (same TTL policy as priority notifs).
_NOTIF_TTL_DAYS = 30


# =============================================================================
# Datetime helpers
# =============================================================================
def _parse_scheduled_dt(scheduled_date, scheduled_time):
    """
    Combine a booking's scheduled_date (YYYY-MM-DD) and optional scheduled_time
    (HH:MM) into a timezone-aware UTC datetime. Returns None if unparseable.

    scheduled_date/time are stored as the customer's LOCAL wall-clock values, so
    we attach the configured business offset (BOOKING_TZ_OFFSET_MINUTES) and then
    convert to UTC for a correct comparison against datetime.now(timezone.utc).

    When no time is given we treat the service window as end-of-day so we never
    prematurely flag a same-day booking as overdue.
    """
    if not scheduled_date:
        return None
    date_part = str(scheduled_date)[:10]
    try:
        base = datetime.strptime(date_part, '%Y-%m-%d')
    except ValueError:
        return None

    time_str = (scheduled_time or '').strip()
    parsed_time = None
    if time_str:
        for fmt in ('%H:%M', '%H:%M:%S', '%I:%M %p', '%I:%M%p'):
            try:
                parsed_time = datetime.strptime(time_str.upper(), fmt).time()
                break
            except ValueError:
                continue

    if parsed_time is not None:
        base = base.replace(hour=parsed_time.hour, minute=parsed_time.minute)
    else:
        # No usable time -> end of the scheduled day
        base = base.replace(hour=23, minute=59)

    # Interpret as local business time, then normalise to UTC.
    local_tz = timezone(timedelta(minutes=BOOKING_TZ_OFFSET_MINUTES))
    return base.replace(tzinfo=local_tz).astimezone(timezone.utc)


def _is_overdue(booking, now=None):
    """
    A booking is overdue if its status still owes work AND its scheduled time
    (plus grace period) is in the past.
    """
    if booking.get('status') not in OVERDUE_CANDIDATE_STATUSES:
        return False
    scheduled_dt = _parse_scheduled_dt(
        booking.get('scheduled_date'), booking.get('scheduled_time'))
    if scheduled_dt is None:
        return False
    now = now or datetime.now(timezone.utc)
    deadline = scheduled_dt + timedelta(minutes=OVERDUE_GRACE_MINUTES)
    return now >= deadline


# =============================================================================
# Notifications (reuses the activity table NOTIF# pattern, with dedup)
# =============================================================================
def _write_overdue_notification(worker_id, booking):
    """
    Write a single, de-duplicated overdue reminder for the worker.

    Uses a DETERMINISTIC sort key (NOTIF#OVERDUE#{booking_id}) with a conditional
    put so re-running the sweep never produces duplicate reminders for the same
    booking. Returns True if a new notification was created, False if it already
    existed (idempotent).
    """
    if not worker_id:
        return False

    booking_id = booking.get('id')
    sk = f'NOTIF#OVERDUE#{booking_id}'
    ts = now_iso()
    service_name = booking.get('service_name', 'a service')
    customer_name = booking.get('customer_name', 'a customer')
    message = (
        f"Booking for {service_name} with {customer_name} on "
        f"{booking.get('scheduled_date', '')} is overdue. Please update its "
        f"status or mark it completed."
    )
    item = {
        'PK': f'NOTIF#{worker_id}',
        'SK': sk,
        'user_id': worker_id,
        'kind': 'booking_overdue',
        'booking_id': booking_id,
        'message': message,
        'service_name': service_name,
        'customer_name': customer_name,
        'scheduled_date': booking.get('scheduled_date', ''),
        'scheduled_time': booking.get('scheduled_time', ''),
        'booking_status': booking.get('status'),
        'read': False,
        'created_at': ts,
        'TTL': int((datetime.now(timezone.utc) + timedelta(days=_NOTIF_TTL_DAYS)).timestamp()),
    }
    try:
        # Conditional put: only create if a reminder for this booking doesn't
        # already exist (dedup across repeated sweeps).
        activity_table.put_item(
            Item=item,
            ConditionExpression='attribute_not_exists(PK)',
        )
        return True
    except Exception:  # noqa: BLE001 - ConditionalCheckFailed => already notified
        return False


def _mark_booking_overdue(booking):
    """
    Flag a booking (and its denormalized refs) as overdue WITHOUT changing its
    status. Idempotent: only writes if not already flagged.
    """
    booking_id = booking.get('id')
    if booking.get('overdue_flag'):
        return False

    overdue_updates = {'overdue_flag': True, 'overdue_since': now_iso()}
    update_item(f'BOOKING#{booking_id}', 'METADATA', overdue_updates)

    # Mirror the flag onto the denormalized refs so worker/customer lists can
    # show it without an extra fetch (consistent with how status is mirrored).
    customer_id = booking.get('customer_id')
    if customer_id:
        try:
            update_item(f'USER#{customer_id}', f'BOOKING#{booking_id}', overdue_updates)
        except Exception:  # noqa: BLE001 - best effort on refs
            pass
    worker_id = booking.get('worker_id')
    if worker_id:
        try:
            update_item(f'WORKER_BOOKING#{worker_id}', f'BOOKING#{booking_id}', overdue_updates)
        except Exception:  # noqa: BLE001
            pass
    return True


# =============================================================================
# Core sweep
# =============================================================================
def sweep_overdue_bookings(limit_statuses=OVERDUE_CANDIDATE_STATUSES):
    """
    Scan non-terminal bookings via the STATUS# GSI, flag overdue ones, and send
    a de-duplicated reminder to the assigned worker.

    Returns a summary dict (used by the scheduled invocation log + for lazy
    callers). Safe to run repeatedly (idempotent via overdue_flag + conditional
    notification put).
    """
    now = datetime.now(timezone.utc)
    checked = 0
    newly_overdue = 0
    reminders_sent = 0

    for status in limit_statuses:
        # GSI1PK = STATUS#{status} already indexes bookings by status.
        items = query_all(f'STATUS#{status}', index_name='GSI1')
        for ref in items:
            # The GSI projects booking METADATA items; ensure we have the id.
            booking_id = ref.get('id')
            if not booking_id:
                continue
            booking = get_item(f'BOOKING#{booking_id}', 'METADATA')
            if not booking:
                continue
            checked += 1

            if not _is_overdue(booking, now=now):
                continue

            if _mark_booking_overdue(booking):
                newly_overdue += 1
                # refresh local copy flag so notification carries correct info
                booking['overdue_flag'] = True

            worker_id = booking.get('worker_id')
            if worker_id and _write_overdue_notification(worker_id, booking):
                reminders_sent += 1

    summary = {
        'checked': checked,
        'newly_overdue': newly_overdue,
        'reminders_sent': reminders_sent,
        'swept_at': now_iso(),
    }
    print(f"[reminders] overdue sweep: {summary}")
    return summary


# =============================================================================
# Notification read API (reuses existing NOTIF# items)
# =============================================================================
def list_notifications(user_id, unread_only=False):
    """Return a user's notifications (newest first)."""
    items = query_items(
        f'NOTIF#{user_id}', sk_begins_with='NOTIF#',
        index_name=None, scan_forward=False, table_ref=activity_table,
    )
    notifs = [decimal_to_float(n) for n in items]
    if unread_only:
        notifs = [n for n in notifs if not n.get('read')]
    notifs.sort(key=lambda n: n.get('created_at', ''), reverse=True)
    return notifs


def mark_notification_read(user_id, notification_sk):
    """Mark a single notification as read. notification_sk is the full SK."""
    update_item(f'NOTIF#{user_id}', notification_sk, {'read': True},
                table_ref=activity_table)


def clear_booking_overdue(booking):
    """
    Called when a worker resolves an overdue booking (status update). Clears the
    overdue flag on the booking + refs and marks the related reminder read so it
    stops showing. Best-effort; never raises.
    """
    booking_id = booking.get('id')
    worker_id = booking.get('worker_id')
    customer_id = booking.get('customer_id')

    clear = {'overdue_flag': False}
    for pk, sk in (
        (f'BOOKING#{booking_id}', 'METADATA'),
        (f'USER#{customer_id}', f'BOOKING#{booking_id}') if customer_id else (None, None),
        (f'WORKER_BOOKING#{worker_id}', f'BOOKING#{booking_id}') if worker_id else (None, None),
    ):
        if not pk:
            continue
        try:
            update_item(pk, sk, clear)
        except Exception:  # noqa: BLE001
            pass

    # Mark the worker's overdue reminder as read (if present).
    if worker_id:
        try:
            update_item(f'NOTIF#{worker_id}', f'NOTIF#OVERDUE#{booking_id}',
                        {'read': True}, table_ref=activity_table)
        except Exception:  # noqa: BLE001
            pass
