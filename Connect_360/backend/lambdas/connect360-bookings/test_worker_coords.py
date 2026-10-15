"""
Tests for _select_worker_coords in priority_handler: prefers fresh live
location, falls back to registered location, then None (offline).
"""
import os
import sys
import types
from datetime import datetime, timezone, timedelta

# Minimal db stub so priority_handler imports offline.
_db = types.ModuleType('db')
for fn in ('put_item', 'get_item', 'update_item', 'delete_item', 'query_items',
           'generate_id', 'decimal_to_float', 'transact_write'):
    setattr(_db, fn, lambda *a, **k: None)
_db.now_iso = lambda: datetime.now(timezone.utc).isoformat()
_db.decimal_to_float = lambda x: x
_db.table = object()
_db.activity_table = object()
sys.modules['db'] = _db

# matching_service is a real import (pure); response/auth stubs:
for name in ('response', 'auth_helpers'):
    m = types.ModuleType(name)
    sys.modules[name] = m
_resp = sys.modules['response']
for fn in ('success', 'created', 'error', 'not_found', 'forbidden', 'server_error'):
    setattr(_resp, fn, lambda *a, **k: None)
_auth = sys.modules['auth_helpers']
for fn in ('get_user_sub', 'get_user_role', 'get_path_param', 'get_body'):
    setattr(_auth, fn, lambda *a, **k: None)

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'shared'))
sys.path.insert(0, os.path.dirname(__file__))
os.environ['WORKER_LIVE_LOC_TTL_SECONDS'] = '600'
import priority_handler as ph  # noqa: E402

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


now = datetime.now(timezone.utc)
fresh = now.isoformat()
stale = (now - timedelta(minutes=30)).isoformat()

# fresh live location -> used
lat, lng, src = ph._select_worker_coords({
    'live_lat': 13.0, 'live_lng': 80.0, 'live_location_at': fresh,
    'home_lat': 1.0, 'home_lng': 2.0,
})
check("fresh live location used", lat == 13.0 and lng == 80.0 and src == 'live')

# stale live location -> falls back to registered home
lat, lng, src = ph._select_worker_coords({
    'live_lat': 13.0, 'live_lng': 80.0, 'live_location_at': stale,
    'home_lat': 1.0, 'home_lng': 2.0,
})
check("stale live falls back to registered", lat == 1.0 and lng == 2.0 and src == 'registered')

# no live, only registered
lat, lng, src = ph._select_worker_coords({'home_lat': 5.0, 'home_lng': 6.0})
check("registered when no live", lat == 5.0 and lng == 6.0 and src == 'registered')

# nothing -> None
lat, lng, src = ph._select_worker_coords({})
check("no coords -> None", lat is None and lng is None and src is None)

# coord validation
check("coerce valid", ph._coerce_coord('13.08') == 13.08)
check("coerce invalid -> None", ph._coerce_coord('abc') is None)
check("coerce out-of-range -> None", ph._coerce_coord(999) is None)

print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
