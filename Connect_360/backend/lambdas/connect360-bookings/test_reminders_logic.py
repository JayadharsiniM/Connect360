"""
Focused checklist verification for overdue booking logic.

Pure-logic tests for reminders_handler._is_overdue / _parse_scheduled_dt that run
WITHOUT AWS. The `db` module is stubbed so the handler imports cleanly offline.

Covers checklist items:
  - Overdue uses the correct booking date/time (UTC) + grace period.
  - completed / cancelled / rejected are excluded from overdue.
  - upcoming bookings are NOT overdue.
"""
import os
import sys
import types
from datetime import datetime, timezone, timedelta

# --- Stub the shared `db` module so reminders_handler imports offline ---
_db = types.ModuleType('db')
_db.get_item = lambda *a, **k: None
_db.update_item = lambda *a, **k: None
_db.query_items = lambda *a, **k: []
_db.query_all = lambda *a, **k: []
_db.now_iso = lambda: datetime.now(timezone.utc).isoformat()
_db.decimal_to_float = lambda x: x
_db.activity_table = types.SimpleNamespace(put_item=lambda *a, **k: None)
sys.modules['db'] = _db

sys.path.insert(0, os.path.dirname(__file__))
os.environ['OVERDUE_GRACE_MINUTES'] = '60'
# Interpret scheduled times as UTC for the bulk of these assertions.
os.environ['BOOKING_TZ_OFFSET_MINUTES'] = '0'

import reminders_handler as rh  # noqa: E402

NOW = datetime(2026, 10, 12, 12, 0, tzinfo=timezone.utc)
passed = 0
failed = 0


def check(name, cond):
    global passed, failed
    if cond:
        passed += 1
        print(f"  PASS: {name}")
    else:
        failed += 1
        print(f"  FAIL: {name}")


# 1) A booking 3 hours past its scheduled time (status accepted) IS overdue.
check(
    "past accepted booking is overdue",
    rh._is_overdue(
        {'status': 'accepted', 'scheduled_date': '2026-10-12', 'scheduled_time': '09:00'},
        now=NOW) is True,
)

# 2) A booking scheduled later today is NOT overdue (upcoming).
check(
    "future booking today is not overdue",
    rh._is_overdue(
        {'status': 'accepted', 'scheduled_date': '2026-10-12', 'scheduled_time': '18:00'},
        now=NOW) is False,
)

# 3) Within the 60-min grace window -> not yet overdue.
check(
    "within grace window not overdue",
    rh._is_overdue(
        {'status': 'in_progress', 'scheduled_date': '2026-10-12', 'scheduled_time': '11:30'},
        now=NOW) is False,
)

# 4) Just past the grace window -> overdue.
check(
    "just past grace window is overdue",
    rh._is_overdue(
        {'status': 'in_progress', 'scheduled_date': '2026-10-12', 'scheduled_time': '10:30'},
        now=NOW) is True,
)

# 5) Terminal statuses are excluded even if long past.
for st in ('completed', 'cancelled', 'rejected'):
    check(
        f"{st} booking never overdue",
        rh._is_overdue(
            {'status': st, 'scheduled_date': '2026-09-01', 'scheduled_time': '09:00'},
            now=NOW) is False,
    )

# 6) No scheduled_time -> end-of-day window; same day midday is NOT overdue.
check(
    "no time, same day midday not overdue",
    rh._is_overdue(
        {'status': 'accepted', 'scheduled_date': '2026-10-12', 'scheduled_time': ''},
        now=NOW) is False,
)

# 7) No scheduled_time, previous day -> overdue.
check(
    "no time, previous day is overdue",
    rh._is_overdue(
        {'status': 'accepted', 'scheduled_date': '2026-10-11', 'scheduled_time': ''},
        now=NOW) is True,
)

# 8) 12-hour clock format parses correctly (02:00 PM = 14:00).
dt = rh._parse_scheduled_dt('2026-10-12', '02:00 PM')
check("12h time parses to 14:00 UTC", dt == datetime(2026, 10, 12, 14, 0, tzinfo=timezone.utc))

# 9) Unparseable date -> not overdue (never crashes).
check(
    "garbage date is not overdue",
    rh._is_overdue({'status': 'accepted', 'scheduled_date': 'not-a-date'}, now=NOW) is False,
)

# 10) Time-zone handling: with an IST offset (330), a 09:00 local time means
#     03:30 UTC. At 12:00 UTC that is 8.5h past -> overdue; and a 14:00 IST
#     booking = 08:30 UTC is also past, while 20:00 IST = 14:30 UTC is future.
rh.BOOKING_TZ_OFFSET_MINUTES = 330
check(
    "IST 09:00 booking parses to 03:30 UTC",
    rh._parse_scheduled_dt('2026-10-12', '09:00') == datetime(2026, 10, 12, 3, 30, tzinfo=timezone.utc),
)
check(
    "IST evening booking still future is not overdue",
    rh._is_overdue({'status': 'accepted', 'scheduled_date': '2026-10-12', 'scheduled_time': '20:00'}, now=NOW) is False,
)
rh.BOOKING_TZ_OFFSET_MINUTES = 0

print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
