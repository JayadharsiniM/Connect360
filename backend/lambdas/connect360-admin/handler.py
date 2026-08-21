"""
Connect360 - Admin Lambda (DynamoDB)
Handles:
  - GET  /api/admin/dashboard      → Platform stats
  - GET  /api/customer/profile     → Customer gets own profile
  - PUT  /api/customer/profile     → Customer updates profile
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'shared'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'shared'))

from db import (get_item, update_item, query_items, query_all,
                now_iso, decimal_to_float, table)
from response import success, error, not_found, forbidden, server_error
from auth_helpers import get_user_claims, get_user_sub, get_user_role, get_body
from boto3.dynamodb.conditions import Key


def lambda_handler(event, context):
    method = event.get('httpMethod', '')
    resource = event.get('resource', '')

    try:
        if method == 'GET' and '/admin/dashboard' in resource:
            return get_dashboard(event)
        elif method == 'GET' and '/customer/profile' in resource:
            return get_customer_profile(event)
        elif method == 'PUT' and '/customer/profile' in resource:
            return update_customer_profile(event)
        else:
            return error('Route not found', status_code=404)
    except Exception as e:
        print(f"Error: {str(e)}")
        return server_error(str(e))


def _get_user_id_from_sub(cognito_sub):
    items = query_items(f'COGNITO#{cognito_sub}', sk_begins_with='USER', index_name='GSI2')
    return items[0] if items else None


def get_dashboard(event):
    """GET /api/admin/dashboard"""
    role = get_user_role(event)
    if role != 'admin':
        return forbidden('Only admins can access the dashboard')

    # Count users by role
    customers = query_items('ROLE#customer', index_name='GSI1')
    workers = query_items('ROLE#worker', index_name='GSI1')
    admins = query_items('ROLE#admin', index_name='GSI1')

    # Booking counts by status
    booking_stats = {}
    for status in ['pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'rejected']:
        items = query_items(f'STATUS#{status}', index_name='GSI1')
        if items:
            booking_stats[status] = len(items)

    # Revenue from completed bookings
    completed_bookings = query_items('STATUS#completed', index_name='GSI1')
    total_revenue = sum(float(b.get('total_amount', 0)) for b in completed_bookings)

    # Pending verifications
    pending_verifications = query_items('VERIFICATION#pending', index_name='GSI1')

    # Services count
    services = query_items('ENTITY#SERVICE', index_name='GSI1')
    active_services = [s for s in services if s.get('is_active', True)]

    # Top workers (from worker role items, get profiles)
    top_workers = []
    for w in workers[:10]:
        wid = w.get('id')
        if wid:
            profile = get_item(f'USER#{wid}', 'WORKER_PROFILE')
            if profile and profile.get('is_verified') and int(profile.get('rating_count', 0)) > 0:
                top_workers.append({
                    'full_name': w.get('full_name'),
                    'rating_avg': float(profile.get('rating_avg', 0)),
                    'rating_count': int(profile.get('rating_count', 0)),
                    'experience_years': int(profile.get('experience_years', 0)),
                })
    top_workers.sort(key=lambda x: x['rating_avg'], reverse=True)
    top_workers = top_workers[:5]

    # Recent bookings (from completed + pending + accepted)
    recent = sorted(completed_bookings, key=lambda b: b.get('created_at', ''), reverse=True)[:10]
    recent_bookings = [decimal_to_float({
        'id': b.get('id'),
        'service_name': b.get('service_name'),
        'customer_name': b.get('customer_name'),
        'worker_name': b.get('worker_name'),
        'scheduled_date': b.get('scheduled_date'),
        'total_amount': b.get('total_amount'),
        'status': b.get('status'),
    }) for b in recent]

    return success({
        'stats': {
            'users': {
                'customer': len(customers),
                'worker': len(workers),
                'admin': len(admins),
            },
            'bookings': booking_stats,
            'revenue': {
                'total_revenue': total_revenue,
                'completed_bookings': len(completed_bookings),
            },
            'pending_verifications': len(pending_verifications),
            'total_services': len(active_services),
        },
        'recent_bookings': recent_bookings,
        'top_workers': top_workers,
    })


def get_customer_profile(event):
    """GET /api/customer/profile"""
    role = get_user_role(event)
    if role != 'customer':
        return forbidden('Only customers can access this endpoint')

    user_item = _get_user_id_from_sub(get_user_sub(event))
    if not user_item:
        return not_found('Profile not found')

    user_id = user_item.get('id')

    # Count bookings
    bookings = query_items(f'USER#{user_id}', sk_begins_with='BOOKING#')

    profile = decimal_to_float(user_item)
    profile['total_bookings'] = len(bookings)

    # Remove internal keys
    for key in ['PK', 'SK', 'GSI1PK', 'GSI1SK', 'GSI2PK', 'GSI2SK']:
        profile.pop(key, None)

    return success({'profile': profile})


def update_customer_profile(event):
    """PUT /api/customer/profile"""
    role = get_user_role(event)
    if role != 'customer':
        return forbidden('Only customers can update their profile')

    user_item = _get_user_id_from_sub(get_user_sub(event))
    if not user_item:
        return not_found('Profile not found')

    user_id = user_item.get('id')
    body = get_body(event)

    updates = {}
    if 'full_name' in body:
        updates['full_name'] = body['full_name']
    if 'phone' in body:
        updates['phone'] = body['phone']
    if 'address' in body:
        updates['address'] = body['address']
    if 'city' in body:
        updates['city'] = body['city']

    if not updates:
        return error('No fields to update')

    update_item(f'USER#{user_id}', 'PROFILE', updates)
    return success({'message': 'Profile updated successfully'})
