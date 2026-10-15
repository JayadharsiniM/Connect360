"""
Unit tests for arrival OTP logic (otp_handler), offline (db stubbed).

Covers: generation shape, customer retrieval while valid, worker verify with
valid/invalid/expired/used codes, attempt limit, lifecycle guards, and the
accepted->in_progress transition on success.
"""
import os
import sys
import types
from datetime import datetime, timezone, timedelta

_store = {}


def _key(pk, sk):
    return f"{pk}||{sk}"


_db = types.ModuleType('db')
_db.get_item = lambda pk, sk, table_ref=None: _store.get(_key(pk, sk))
_db.put_item = lambda item, table_ref=None: _store.__setitem__(_key(item['PK'], item['SK']), dict(item))
_db.now_iso = lambda: datetime.now(timezone.utc).isoformat()
_db.decimal_to_float = lambda x: x
_db.activity_table = object()


# transact_write succeeds only if the booking is currently 'accepted'
def _transact_write(items):
    for op in items:
        up = op.get('Update')
        if up:
            bk = up['Key']['PK']['S'].split('#', 1)[1]
            meta = _store.get(_key(f'BOOKING#{bk}', 'METADATA'))
            if not meta or meta.get('status') != 'accepted':
                raise Exception('ConditionalCheckFailed')
            meta['status'] = 'in_progress'


_db.transact_write = _transact_write
sys.modules['db'] = _db

sys.path.insert(0, os.path.dirname(__file__))
os.environ['ARRIVAL_OTP_MAX_ATTEMPTS'] = '5'
import otp_handler as otp  # noqa: E402

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


def _seed_booking(bid, status='accepted'):
    _store[_key(f'BOOKING#{bid}', 'METADATA')] = {
        'PK': f'BOOKING#{bid}', 'SK': 'METADATA', 'id': bid, 'status': status,
        'customer_id': 'c1', 'worker_id': 'w1',
    }
    return _store[_key(f'BOOKING#{bid}', 'METADATA')]


# generation shape
check("code is 6 digits", otp._generate_code().isdigit() and len(otp._generate_code()) == 6)

# customer retrieval creates + returns code while accepted
b1 = _seed_booking('b1')
payload, err = otp.get_customer_otp(b1)
check("customer gets a code", err is None and payload.get('otp') and len(payload['otp']) == 6)
code1 = payload['otp']
# re-retrieval returns the SAME active code
payload2, _ = otp.get_customer_otp(b1)
check("re-retrieval returns same active code", payload2['otp'] == code1)

# worker verify with WRONG code -> fail + attempt counted
res, err, sc = otp.verify_arrival_otp(b1, '000000' if code1 != '000000' else '111111')
check("wrong code rejected (400)", res is None and sc == 400)
rec = _store[_key('OTP#b1', 'ARRIVAL')]
check("attempt counted", rec['attempts'] == 1)
check("booking still accepted after wrong code", _store[_key('BOOKING#b1', 'METADATA')]['status'] == 'accepted')

# worker verify with CORRECT code -> success + transition
res, err, sc = otp.verify_arrival_otp(b1, code1)
check("correct code verifies (200)", err is None and res['status'] == 'in_progress' and sc == 200)
check("booking moved to in_progress", _store[_key('BOOKING#b1', 'METADATA')]['status'] == 'in_progress')
check("otp marked verified + code cleared", rec_after := (_store[_key('OTP#b1', 'ARRIVAL')]['verified'] and _store[_key('OTP#b1', 'ARRIVAL')]['code'] is None))

# duplicate verify is idempotent (already in_progress)
res, err, sc = otp.verify_arrival_otp(_store[_key('BOOKING#b1', 'METADATA')], code1)
check("duplicate verify idempotent", err is None and res['verified'] is True and sc == 200)

# customer no longer sees the code after verification
payload3, _ = otp.get_customer_otp(_store[_key('BOOKING#b1', 'METADATA')])
check("code hidden after verify", payload3.get('otp') is None and payload3.get('status') in ('verified', 'in_progress'))

# expired code -> 410
b2 = _seed_booking('b2')
otp.get_customer_otp(b2)
rec2 = _store[_key('OTP#b2', 'ARRIVAL')]
rec2['expires_at'] = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()
_store[_key('OTP#b2', 'ARRIVAL')] = rec2
res, err, sc = otp.verify_arrival_otp(b2, rec2.get('code') or '123456')
check("expired code rejected (410)", res is None and sc == 410)

# attempt limit -> 429
b3 = _seed_booking('b3')
p3, _ = otp.get_customer_otp(b3)
good3 = p3['otp']
wrong = '999999' if good3 != '999999' else '888888'
for _ in range(5):
    otp.verify_arrival_otp(b3, wrong)
res, err, sc = otp.verify_arrival_otp(b3, wrong)
check("attempt limit returns 429", sc == 429)

# non-accepted booking cannot verify
b4 = _seed_booking('b4', status='completed')
res, err, sc = otp.verify_arrival_otp(b4, '123456')
check("completed booking not verifiable (409)", res is None and sc == 409)

# bad format rejected
b5 = _seed_booking('b5')
otp.get_customer_otp(b5)
res, err, sc = otp.verify_arrival_otp(b5, '12ab')
check("non-6-digit rejected (400)", res is None and sc == 400)

print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
