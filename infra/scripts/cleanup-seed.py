"""
Connect360 - Delete SEEDED demo data only.

Removes the fake users/booking/review created by seed-data.py, leaving:
  - Real users (signed up via the app)
  - Real bookings/reviews they created
  - Service categories (reference data needed by real workers) -- KEPT

Deletes precisely (by PK/SK) the items seed-data.py inserted:
  - Demo workers  w-001, w-002, w-003  (+ their WORKER_PROFILE, SKILL#, SERVICE#, AVAIL# items)
  - Demo customers c-001, c-002
  - Seeded admin  admin-001
  - Sample booking booking-001 (+ customer ref, worker ref, review)
  - Admin settings

Usage:
  python cleanup-seed.py --table-name connect360-main-dev --region ap-south-1
  add --dry-run to preview without deleting
"""

import argparse
import boto3
from boto3.dynamodb.conditions import Key


SEED_WORKERS = ['w-001', 'w-002', 'w-003']
SEED_CUSTOMERS = ['c-001', 'c-002']
SEED_ADMIN = ['admin-001']
SEED_BOOKING = 'booking-001'
SEED_SETTINGS_KEYS = ['platform_name', 'booking_cancellation_hours', 'max_booking_days_ahead']


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--table-name', default='connect360-main-dev')
    ap.add_argument('--region', default='ap-south-1')
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()

    ddb = boto3.resource('dynamodb', region_name=args.region)
    table = ddb.Table(args.table_name)

    to_delete = []  # list of (PK, SK)

    # For each seeded USER, delete ALL items under that partition (PROFILE,
    # WORKER_PROFILE, SKILL#, SERVICE#, AVAIL#, and any BOOKING# refs).
    for uid in SEED_WORKERS + SEED_CUSTOMERS + SEED_ADMIN:
        resp = table.query(KeyConditionExpression=Key('PK').eq(f'USER#{uid}'))
        for item in resp.get('Items', []):
            to_delete.append((item['PK'], item['SK']))

    # Worker booking partition for the sample booking's worker
    resp = table.query(KeyConditionExpression=Key('PK').eq('WORKER_BOOKING#w-001'))
    for item in resp.get('Items', []):
        to_delete.append((item['PK'], item['SK']))

    # Sample booking partition (METADATA + REVIEW)
    resp = table.query(KeyConditionExpression=Key('PK').eq(f'BOOKING#{SEED_BOOKING}'))
    for item in resp.get('Items', []):
        to_delete.append((item['PK'], item['SK']))

    # Admin settings
    for key in SEED_SETTINGS_KEYS:
        to_delete.append(('ADMIN#SETTINGS', key))

    # De-duplicate
    to_delete = list({(pk, sk) for pk, sk in to_delete})

    print(f"Items targeted for deletion: {len(to_delete)}")
    for pk, sk in sorted(to_delete):
        print(f"  {pk} | {sk}")

    if args.dry_run:
        print("\nDRY RUN - nothing deleted.")
        return

    with table.batch_writer() as batch:
        for pk, sk in to_delete:
            batch.delete_item(Key={'PK': pk, 'SK': sk})

    print(f"\nDeleted {len(to_delete)} seeded items. Services and real users kept.")


if __name__ == '__main__':
    main()
