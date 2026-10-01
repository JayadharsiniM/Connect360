"""
Connect360 - DynamoDB Seed Script
Run after terraform apply to populate demo data.
Usage: python seed-data.py [--table-name connect360-main-dev] [--region ap-south-1]
"""

import argparse
import boto3
from decimal import Decimal

def main():
    parser = argparse.ArgumentParser(description='Seed Connect360 DynamoDB table')
    parser.add_argument('--table-name', default='connect360-main-dev')
    parser.add_argument('--region', default='ap-south-1')
    args = parser.parse_args()

    dynamodb = boto3.resource('dynamodb', region_name=args.region)
    table = dynamodb.Table(args.table_name)

    print(f"Seeding table: {args.table_name} in {args.region}")

    # =========================================================================
    # Services
    # =========================================================================
    services = [
        ('a1000001', 'Plumbing', 'Pipe repair, installation, drain cleaning', 'wrench'),
        ('a1000002', 'Electrical', 'Wiring, fixture installation, panel upgrades', 'zap'),
        ('a1000003', 'House Cleaning', 'Deep cleaning, regular maintenance', 'sparkles'),
        ('a1000004', 'Painting', 'Interior and exterior painting', 'paintbrush'),
        ('a1000005', 'Carpentry', 'Furniture repair, custom builds', 'hammer'),
        ('a1000006', 'AC/HVAC', 'AC installation, repair, servicing', 'thermometer'),
        ('a1000007', 'Gardening', 'Lawn care, landscaping, tree trimming', 'leaf'),
        ('a1000008', 'Appliance Repair', 'Washing machine, refrigerator repair', 'settings'),
    ]

    for sid, name, desc, icon in services:
        table.put_item(Item={
            'PK': f'SERVICE#{sid}',
            'SK': 'METADATA',
            'id': sid,
            'name': name,
            'description': desc,
            'icon': icon,
            'is_active': True,
            'created_at': '2026-08-01T00:00:00Z',
            'updated_at': '2026-08-01T00:00:00Z',
            'GSI1PK': 'ENTITY#SERVICE',
            'GSI1SK': f'NAME#{name}',
        })
    print(f"  Seeded {len(services)} services")

    # =========================================================================
    # Admin user
    # =========================================================================
    table.put_item(Item={
        'PK': 'USER#admin-001',
        'SK': 'PROFILE',
        'id': 'admin-001',
        'cognito_sub': 'admin-cognito-sub-placeholder',
        'email': 'admin@connect360.com',
        'full_name': 'Platform Admin',
        'role': 'admin',
        'phone': '+919876543210',
        'city': 'Chennai',
        'is_active': True,
        'created_at': '2026-08-01T00:00:00Z',
        'updated_at': '2026-08-01T00:00:00Z',
        'GSI1PK': 'ROLE#admin',
        'GSI1SK': 'USER#admin-001',
        'GSI2PK': 'COGNITO#admin-cognito-sub-placeholder',
        'GSI2SK': 'USER',
    })
    print("  Seeded admin user")

    # =========================================================================
    # Demo customers
    # =========================================================================
    customers = [
        ('c-001', 'customer1-sub', 'customer1@demo.com', 'Priya Sharma', '42 Anna Nagar, Chennai'),
        ('c-002', 'customer2-sub', 'customer2@demo.com', 'Rahul Verma', '15 T. Nagar, Chennai'),
    ]
    for cid, sub, email, name, addr in customers:
        table.put_item(Item={
            'PK': f'USER#{cid}',
            'SK': 'PROFILE',
            'id': cid,
            'cognito_sub': sub,
            'email': email,
            'full_name': name,
            'role': 'customer',
            'city': 'Chennai',
            'address': addr,
            'is_active': True,
            'created_at': '2026-08-01T00:00:00Z',
            'updated_at': '2026-08-01T00:00:00Z',
            'GSI1PK': 'ROLE#customer',
            'GSI1SK': f'USER#{cid}',
            'GSI2PK': f'COGNITO#{sub}',
            'GSI2SK': 'USER',
        })
    print(f"  Seeded {len(customers)} customers")

    # =========================================================================
    # Demo workers
    # =========================================================================
    workers = [
        ('w-001', 'worker1-sub', 'worker1@demo.com', 'Suresh Kumar', 10, 500, 4.7, 25, 'a1000001', 'Plumbing',
         ['Pipe Fitting', 'Water Heater', 'Drain Cleaning', 'Leak Detection']),
        ('w-002', 'worker2-sub', 'worker2@demo.com', 'Meena Devi', 5, 350, 4.85, 40, 'a1000003', 'House Cleaning',
         ['Deep Cleaning', 'Eco-Friendly', 'Move-in/out', 'Organizing']),
        ('w-003', 'worker3-sub', 'worker3@demo.com', 'Rajesh Patel', 8, 600, 4.5, 18, 'a1000002', 'Electrical',
         ['Wiring', 'Panel Upgrades', 'Fixture Install', 'Troubleshooting']),
    ]

    for wid, sub, email, name, exp, rate, rating, count, svc_id, svc_name, skills in workers:
        # User profile
        table.put_item(Item={
            'PK': f'USER#{wid}',
            'SK': 'PROFILE',
            'id': wid,
            'cognito_sub': sub,
            'email': email,
            'full_name': name,
            'role': 'worker',
            'city': 'Chennai',
            'is_active': True,
            'created_at': '2026-08-01T00:00:00Z',
            'updated_at': '2026-08-01T00:00:00Z',
            'GSI1PK': 'ROLE#worker',
            'GSI1SK': f'USER#{wid}',
            'GSI2PK': f'COGNITO#{sub}',
            'GSI2SK': 'USER',
        })

        # Worker profile
        table.put_item(Item={
            'PK': f'USER#{wid}',
            'SK': 'WORKER_PROFILE',
            'user_id': wid,
            'bio': f'Experienced {svc_name.lower()} professional with {exp}+ years.',
            'experience_years': exp,
            'hourly_rate': Decimal(str(rate)),
            'rating_avg': Decimal(str(rating)),
            'rating_count': count,
            'is_verified': True,
            'is_available': True,
            'created_at': '2026-08-01T00:00:00Z',
            'updated_at': '2026-08-01T00:00:00Z',
        })

        # Skills
        for skill in skills:
            table.put_item(Item={
                'PK': f'USER#{wid}',
                'SK': f'SKILL#{skill}',
                'skill_name': skill,
                'created_at': '2026-08-01T00:00:00Z',
            })

        # Service link
        table.put_item(Item={
            'PK': f'USER#{wid}',
            'SK': f'SERVICE#{svc_id}',
            'service_id': svc_id,
            'service_name': svc_name,
            'created_at': '2026-08-01T00:00:00Z',
            'GSI1PK': f'SERVICE_WORKER#{svc_id}',
            'GSI1SK': f'WORKER#{wid}',
        })

        # Availability (Mon-Fri 9-17)
        for day in range(1, 6):
            table.put_item(Item={
                'PK': f'USER#{wid}',
                'SK': f'AVAIL#{day}#09:00',
                'day_of_week': day,
                'start_time': '09:00',
                'end_time': '17:00',
                'is_available': True,
            })

    print(f"  Seeded {len(workers)} workers with profiles, skills, services, availability")

    # =========================================================================
    # Sample booking
    # =========================================================================
    booking_id = 'booking-001'
    table.put_item(Item={
        'PK': f'BOOKING#{booking_id}',
        'SK': 'METADATA',
        'id': booking_id,
        'customer_id': 'c-001',
        'worker_id': 'w-001',
        'service_id': 'a1000001',
        'status': 'completed',
        'scheduled_date': '2026-08-15',
        'scheduled_time': '10:00',
        'duration_hours': Decimal('2'),
        'address': '42 Anna Nagar, Chennai 600040',
        'notes': 'Kitchen sink leak repair',
        'total_amount': Decimal('1000'),
        'customer_name': 'Priya Sharma',
        'worker_name': 'Suresh Kumar',
        'service_name': 'Plumbing',
        'created_at': '2026-08-10T10:00:00Z',
        'updated_at': '2026-08-15T12:00:00Z',
        'GSI1PK': 'STATUS#completed',
        'GSI1SK': f'BOOKING#2026-08-10T10:00:00Z',
    })
    # Customer ref
    table.put_item(Item={
        'PK': 'USER#c-001',
        'SK': f'BOOKING#{booking_id}',
        'booking_id': booking_id,
        'worker_name': 'Suresh Kumar',
        'service_name': 'Plumbing',
        'status': 'completed',
        'scheduled_date': '2026-08-15',
        'scheduled_time': '10:00',
        'total_amount': Decimal('1000'),
        'created_at': '2026-08-10T10:00:00Z',
    })
    # Worker ref
    table.put_item(Item={
        'PK': 'WORKER_BOOKING#w-001',
        'SK': f'BOOKING#{booking_id}',
        'booking_id': booking_id,
        'customer_name': 'Priya Sharma',
        'service_name': 'Plumbing',
        'status': 'completed',
        'scheduled_date': '2026-08-15',
        'scheduled_time': '10:00',
        'total_amount': Decimal('1000'),
        'address': '42 Anna Nagar, Chennai 600040',
        'created_at': '2026-08-10T10:00:00Z',
        'GSI2PK': 'WORKER#w-001',
        'GSI2SK': f'BOOKING#2026-08-15#{booking_id}',
    })
    # Review
    table.put_item(Item={
        'PK': f'BOOKING#{booking_id}',
        'SK': 'REVIEW',
        'booking_id': booking_id,
        'customer_id': 'c-001',
        'worker_id': 'w-001',
        'rating': 5,
        'comment': 'Excellent work! Fixed the leak quickly and cleanly.',
        'customer_name': 'Priya Sharma',
        'created_at': '2026-08-16T10:00:00Z',
        'GSI1PK': 'WORKER_REVIEWS#w-001',
        'GSI1SK': 'REVIEW#2026-08-16T10:00:00Z',
    })
    print("  Seeded 1 completed booking with review")

    # =========================================================================
    # Admin settings
    # =========================================================================
    settings = [
        ('platform_name', 'Connect360'),
        ('booking_cancellation_hours', '24'),
        ('max_booking_days_ahead', '30'),
    ]
    for key, val in settings:
        table.put_item(Item={
            'PK': 'ADMIN#SETTINGS',
            'SK': key,
            'setting_key': key,
            'setting_value': val,
        })
    print(f"  Seeded {len(settings)} admin settings")

    print("\nDone! All seed data inserted.")


if __name__ == '__main__':
    main()
