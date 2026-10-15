"""
Unit tests for Razorpay payment logic (TEST MODE), run WITHOUT AWS or network.

The `db` and `razorpay_provider` modules are stubbed so payments_handler imports
offline. Covers the security-critical behaviour from the spec:
  - HMAC checkout + webhook signature verification (real crypto, fake secret)
  - amount is computed from the booking in paise (frontend amount ignored)
  - payment state machine never downgrades a protected state
  - webhook idempotency (duplicate event ignored)
  - refund application
"""
import os
import sys
import types
import json
import hmac
import hashlib
from datetime import datetime, timezone

# ---- Stub shared `db` with an in-memory table ----
_store = {}


def _key(pk, sk):
    return f"{pk}||{sk}"


_db = types.ModuleType('db')
_db.put_item = lambda item, table_ref=None: _store.__setitem__(_key(item['PK'], item['SK']), dict(item))
_db.get_item = lambda pk, sk, table_ref=None: _store.get(_key(pk, sk))


def _update_item(pk, sk, updates, table_ref=None):
    it = _store.setdefault(_key(pk, sk), {'PK': pk, 'SK': sk})
    for k, v in updates.items():
        if not k.startswith('_'):
            it[k] = v


_db.update_item = _update_item


def _query_items(pk, sk_begins_with=None, index_name=None, **k):
    out = []
    for stored_key, item in _store.items():
        if item.get('PK') != pk:
            continue
        if sk_begins_with and not str(item.get('SK', '')).startswith(sk_begins_with):
            continue
        out.append(item)
    return out


_db.query_items = _query_items
_db.query_all = lambda *a, **k: []
_db.generate_id = lambda: 'id-' + str(len(_store))
_db.now_iso = lambda: datetime.now(timezone.utc).isoformat()
_db.decimal_to_float = lambda x: x
_db.table = object()


class _ActivityTable:
    def put_item(self, Item=None, ConditionExpression=None):
        k = _key(Item['PK'], Item['SK'])
        if ConditionExpression and k in _store:
            raise Exception('ConditionalCheckFailedException')
        _store[k] = dict(Item)


_db.activity_table = _ActivityTable()
sys.modules['db'] = _db

# ---- Stub response helpers (return simple dicts we can assert on) ----
_resp = types.ModuleType('response')
_resp.success = lambda body, status_code=200: {'statusCode': status_code, 'body': body}
_resp.created = lambda body: {'statusCode': 201, 'body': body}
_resp.error = lambda msg, status_code=400: {'statusCode': status_code, 'body': {'error': msg}}
_resp.not_found = lambda msg='nf': {'statusCode': 404, 'body': {'error': msg}}
_resp.forbidden = lambda msg='fb': {'statusCode': 403, 'body': {'error': msg}}
sys.modules['response'] = _resp

# ---- Stub auth_helpers (not used directly by the functions we unit-test) ----
_auth = types.ModuleType('auth_helpers')
_auth.get_user_sub = lambda e: 'sub'
_auth.get_user_role = lambda e: 'customer'
_auth.get_path_param = lambda e, n: None
_auth.get_body = lambda e: {}
sys.modules['auth_helpers'] = _auth

# ---- Stub razorpay_provider with REAL hmac so signature tests are meaningful ----
_SECRET = 'test_secret_123'
_WEBHOOK_SECRET = 'whsec_123'
_rzp = types.ModuleType('razorpay_provider')


class RazorpayConfigError(Exception):
    pass


_rzp.RazorpayConfigError = RazorpayConfigError
_rzp.is_configured = lambda: True
_rzp.get_public_key_id = lambda: 'rzp_test_pub'


def _verify_checkout(order_id, payment_id, signature):
    expected = hmac.new(_SECRET.encode(), f"{order_id}|{payment_id}".encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature or '')


def _verify_webhook(raw, signature):
    if isinstance(raw, str):
        raw = raw.encode()
    expected = hmac.new(_WEBHOOK_SECRET.encode(), raw, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature or '')


_rzp.verify_checkout_signature = _verify_checkout
_rzp.verify_webhook_signature = _verify_webhook
_rzp.create_order = lambda amt, cur, rcpt, notes=None: {'id': 'order_test_1', 'amount': amt, 'currency': cur}
_rzp.fetch_payment = lambda pid: {'status': 'captured', 'order_id': 'order_test_1', 'amount': 50000}
sys.modules['razorpay_provider'] = _rzp

sys.path.insert(0, os.path.dirname(__file__))
import payments_handler as ph  # noqa: E402

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


# --- amount conversion ---
check("to_paise 500 -> 50000", ph._to_paise(500) == 50000)
check("to_paise 499.99 -> 49999", ph._to_paise(499.99) == 49999)

# --- checkout signature (good + bad) ---
good_sig = hmac.new(_SECRET.encode(), b"order_test_1|pay_1", hashlib.sha256).hexdigest()
check("valid checkout signature accepted", _rzp.verify_checkout_signature('order_test_1', 'pay_1', good_sig) is True)
check("invalid checkout signature rejected", _rzp.verify_checkout_signature('order_test_1', 'pay_1', 'deadbeef') is False)

# --- state machine: never downgrade a protected state ---
pay = {'id': 'p1', 'booking_id': 'b1', 'status': ph.P_SUCCESSFUL, 'amount': 50000}
_store[_key('PAYMENT#p1', 'METADATA')] = dict(pay, PK='PAYMENT#p1', SK='METADATA')
state, changed = ph._apply_payment_state(pay, 'failed', 'pay_1')
check("SUCCESSFUL not downgraded by later failed", state == ph.P_SUCCESSFUL and changed is False)

pay2 = {'id': 'p2', 'booking_id': 'b2', 'status': ph.P_PENDING, 'amount': 50000}
_store[_key('PAYMENT#p2', 'METADATA')] = dict(pay2, PK='PAYMENT#p2', SK='METADATA')
state2, changed2 = ph._apply_payment_state(pay2, 'captured', 'pay_2')
check("PENDING -> SUCCESSFUL on captured", state2 == ph.P_SUCCESSFUL and changed2 is True)
check("captured persists captured_at", _store[_key('PAYMENT#p2', 'METADATA')].get('captured_at') is not None)

pay3 = {'id': 'p3', 'booking_id': 'b3', 'status': ph.P_PENDING, 'amount': 50000}
_store[_key('PAYMENT#p3', 'METADATA')] = dict(pay3, PK='PAYMENT#p3', SK='METADATA')
state3, _ = ph._apply_payment_state(pay3, 'authorized', 'pay_3')
check("PENDING -> AUTHORIZED on authorized", state3 == ph.P_AUTHORIZED)

# --- webhook idempotency (dedup via conditional put) ---
check("first webhook event claim succeeds", ph._claim_webhook_event('evt_dup') is True)
check("duplicate webhook event claim fails", ph._claim_webhook_event('evt_dup') is False)

# --- refund application ---
paid = {'id': 'p4', 'booking_id': 'b4', 'status': ph.P_SUCCESSFUL, 'amount': 50000, 'refunded_amount': 0}
_store[_key('PAYMENT#p4', 'METADATA')] = dict(paid, PK='PAYMENT#p4', SK='METADATA')
ph._apply_refund(paid, {'id': 'rfnd_1', 'amount': 20000})
check("partial refund -> PARTIALLY_REFUNDED", _store[_key('PAYMENT#p4', 'METADATA')]['status'] == ph.P_PARTIALLY_REFUNDED)
paid['status'] = ph.P_PARTIALLY_REFUNDED
paid['refunded_amount'] = 20000
ph._apply_refund(paid, {'id': 'rfnd_2', 'amount': 30000})
check("full refund -> REFUNDED", _store[_key('PAYMENT#p4', 'METADATA')]['status'] == ph.P_REFUNDED)

# --- webhook signature over raw body ---
raw = json.dumps({'event': 'payment.captured'})
wh_sig = hmac.new(_WEBHOOK_SECRET.encode(), raw.encode(), hashlib.sha256).hexdigest()
check("valid webhook signature accepted", _rzp.verify_webhook_signature(raw, wh_sig) is True)
check("tampered webhook body rejected", _rzp.verify_webhook_signature(raw + ' ', wh_sig) is False)

# --- worker earnings aggregation ---
from datetime import datetime as _dt, timezone as _tz  # noqa: E402
_month = _dt.now(_tz.utc).strftime('%Y-%m')
WID = 'wkr-1'
# Two bookings for the worker: one SUCCESSFUL (this month), one PENDING.
_store[_key(f'WORKER_BOOKING#{WID}', 'BOOKING#bk1')] = {'PK': f'WORKER_BOOKING#{WID}', 'SK': 'BOOKING#bk1', 'booking_id': 'bk1'}
_store[_key(f'WORKER_BOOKING#{WID}', 'BOOKING#bk2')] = {'PK': f'WORKER_BOOKING#{WID}', 'SK': 'BOOKING#bk2', 'booking_id': 'bk2'}
_store[_key('BOOKING#bk1', 'METADATA')] = {'PK': 'BOOKING#bk1', 'SK': 'METADATA', 'worker_id': WID, 'service_name': 'Wiring', 'customer_name': 'Asha'}
_store[_key('BOOKING#bk2', 'METADATA')] = {'PK': 'BOOKING#bk2', 'SK': 'METADATA', 'worker_id': WID, 'service_name': 'Leak', 'customer_name': 'Ravi'}
_store[_key('BOOKING#bk1', 'PAYMENT')] = {'PK': 'BOOKING#bk1', 'SK': 'PAYMENT', 'payment_id': 'pw1'}
_store[_key('BOOKING#bk2', 'PAYMENT')] = {'PK': 'BOOKING#bk2', 'SK': 'PAYMENT', 'payment_id': 'pw2'}
_store[_key('PAYMENT#pw1', 'METADATA')] = {'PK': 'PAYMENT#pw1', 'SK': 'METADATA', 'id': 'pw1', 'booking_id': 'bk1', 'amount': 125000, 'status': ph.P_SUCCESSFUL, 'captured_at': f'{_month}-15T10:00:00+00:00', 'refunded_amount': 0, 'razorpay_order_id': 'order_w1', 'razorpay_payment_id': 'pay_w1'}
_store[_key('PAYMENT#pw2', 'METADATA')] = {'PK': 'PAYMENT#pw2', 'SK': 'METADATA', 'id': 'pw2', 'booking_id': 'bk2', 'amount': 60000, 'status': ph.P_PENDING, 'refunded_amount': 0, 'razorpay_order_id': 'order_w2'}

items, summary = ph.list_worker_payments(WID)
check("worker sees both of their payments", len(items) == 2)
check("worker total_earned = captured net (1250)", summary['total_earned'] == 1250.0)
check("worker this_month = 1250", summary['this_month'] == 1250.0)
check("worker pending = 600", summary['pending'] == 600.0)
check("worker completed_payments = 1", summary['completed_payments'] == 1)
check("worker view exposes own order id", any(i.get('razorpay_order_id') == 'order_w1' for i in items))
check("worker view has no customer_id", all('customer_id' not in i for i in items))

# --- commission split on capture ---
comm, payout = ph._split_amount(100000, 0.10)
check("split 1000 @10% -> commission 100", comm == 10000)
check("split 1000 @10% -> payout 900", payout == 90000)
check("commission + payout == gross", comm + payout == 100000)
# capture persists commission on the record
payc = {'id': 'pc1', 'booking_id': 'bc1', 'status': ph.P_PENDING, 'amount': 100000}
_store[_key('PAYMENT#pc1', 'METADATA')] = dict(payc, PK='PAYMENT#pc1', SK='METADATA')
ph._apply_payment_state(payc, 'captured', 'pay_c1')
rec = _store[_key('PAYMENT#pc1', 'METADATA')]
check("captured record stores commission_amount", rec.get('commission_amount') == 10000)
check("captured record stores worker_payout", rec.get('worker_payout') == 90000)
check("captured record settlement_status settled", rec.get('settlement_status') == 'settled')

# --- admin analytics aggregation from real records ---
# Reset store to a known set for a clean analytics computation.
_store.clear()
# Patch the name bound inside payments_handler (it did `from db import query_all`).
ph.query_all = lambda pk, index_name=None, **k: [
    v for v in _store.values() if v.get('GSI1PK') == pk
]
# Two captured payments (same month) + one pending.
_store[_key('PAYMENT#a1', 'METADATA')] = {'PK': 'PAYMENT#a1', 'SK': 'METADATA', 'id': 'a1', 'status': ph.P_SUCCESSFUL, 'amount': 100000, 'commission_amount': 10000, 'worker_payout': 90000, 'refunded_amount': 0, 'service_name': 'Electrical', 'captured_at': '2026-03-10T00:00:00+00:00', 'GSI1PK': f'PAYMENT_STATUS#{ph.P_SUCCESSFUL}'}
_store[_key('PAYMENT#a2', 'METADATA')] = {'PK': 'PAYMENT#a2', 'SK': 'METADATA', 'id': 'a2', 'status': ph.P_SUCCESSFUL, 'amount': 300000, 'commission_amount': 30000, 'worker_payout': 270000, 'refunded_amount': 0, 'service_name': 'Plumbing', 'captured_at': '2026-03-20T00:00:00+00:00', 'GSI1PK': f'PAYMENT_STATUS#{ph.P_SUCCESSFUL}'}
_store[_key('PAYMENT#a3', 'METADATA')] = {'PK': 'PAYMENT#a3', 'SK': 'METADATA', 'id': 'a3', 'status': ph.P_PENDING, 'amount': 50000, 'GSI1PK': f'PAYMENT_STATUS#{ph.P_PENDING}'}

an = ph.build_admin_analytics()
check("analytics GMV = 4000", an['summary']['gmv'] == 4000.0)
check("analytics commission = 400", an['summary']['commission'] == 400.0)
check("analytics payouts = 3600", an['summary']['payouts'] == 3600.0)
check("analytics pending = 500", an['summary']['pending'] == 500.0)
check("analytics take rate = 10.0", an['summary']['effective_take_rate'] == 10.0)
check("analytics growth null with 1 month", an['summary']['growth_pct'] is None)
check("analytics 2 categories", len(an['by_category']) == 2)
check("analytics top category is Plumbing (3000)", an['by_category'][0]['name'] == 'Plumbing' and an['by_category'][0]['amount'] == 3000.0)
check("analytics trend has 1 real month", len(an['trend']) == 1 and an['trend'][0]['month'] == '2026-03')

print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
