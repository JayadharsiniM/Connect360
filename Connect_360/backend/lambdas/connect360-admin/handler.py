"""
Connect360 - Admin Lambda (DynamoDB)
Handles:
  - GET   /api/admin/dashboard     → Platform stats
  - GET   /api/admin/users         → List/filter platform users
  - PATCH /api/admin/users/{id}    → Update a user's role or status (active/suspended)
  - GET   /api/admin/revenue       → Revenue analytics (by category + monthly trend)
  - GET   /api/customer/profile    → Customer gets own profile
  - PUT   /api/customer/profile    → Customer updates profile
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'shared'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'shared'))

import boto3

from db import (get_item, update_item, query_items, query_all,
                now_iso, decimal_to_float, table)
from response import success, error, not_found, forbidden, server_error
from auth_helpers import (get_user_claims, get_user_sub, get_user_role, get_body,
                          get_path_param, get_query_param)
from boto3.dynamodb.conditions import Key

COGNITO_USER_POOL = os.environ.get('COGNITO_USER_POOL', '')
AWS_REGION = os.environ.get('AWS_REGION_NAME', 'ap-south-1')


def lambda_handler(event, context):
    method = event.get('httpMethod', '')
    resource = event.get('resource', '')

    try:
        if method == 'GET' and '/admin/dashboard' in resource:
            return get_dashboard(event)
        elif method == 'GET' and '/admin/users' in resource and '{id}' not in resource:
            return list_users(event)
        elif method == 'PATCH' and '/admin/users/{id}' in resource:
            return update_user(event)
        elif method == 'GET' and '/admin/revenue' in resource:
            return get_revenue(event)
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


# =============================================================================
# User Management
# =============================================================================

def _cognito_client():
    return boto3.client('cognito-idp', region_name=AWS_REGION)


def _clean_user(item):
    """Convert a user profile item to a safe API shape."""
    u = decimal_to_float(item)
    for key in ['PK', 'SK', 'GSI1PK', 'GSI1SK', 'GSI2PK', 'GSI2SK']:
        u.pop(key, None)
    # Normalize status: is_active True/absent -> active, False -> suspended
    u['status'] = 'active' if u.get('is_active', True) else 'suspended'
    return u


def list_users(event):
    """
    GET /api/admin/users
    Query params:
      role   - customer | worker | admin (optional; default all)
      status - active | suspended (optional)
      q      - search term matched against name/email (optional)
    """
    role = get_user_role(event)
    if role != 'admin':
        return forbidden('Only admins can list users')

    role_filter = (get_query_param(event, 'role') or '').strip().lower()
    status_filter = (get_query_param(event, 'status') or '').strip().lower()
    search = (get_query_param(event, 'q') or '').strip().lower()

    roles = [role_filter] if role_filter in ('customer', 'worker', 'admin') else ['customer', 'worker', 'admin']

    users = []
    for r in roles:
        # GSI1PK = ROLE#{role} lists all users of that role
        items = query_all(f'ROLE#{r}', index_name='GSI1')
        for it in items:
            # Only profile rows carry the role listing on GSI1
            u = _clean_user(it)
            if status_filter in ('active', 'suspended') and u.get('status') != status_filter:
                continue
            if search:
                haystack = f"{u.get('full_name', '')} {u.get('email', '')}".lower()
                if search not in haystack:
                    continue
            users.append({
                'id': u.get('id'),
                'full_name': u.get('full_name'),
                'email': u.get('email'),
                'role': u.get('role'),
                'status': u.get('status'),
                'city': u.get('city'),
                'phone': u.get('phone'),
                'created_at': u.get('created_at'),
            })

    # Newest first when created_at present
    users.sort(key=lambda x: x.get('created_at') or '', reverse=True)

    counts = {
        'total': len(users),
        'customer': len([u for u in users if u['role'] == 'customer']),
        'worker': len([u for u in users if u['role'] == 'worker']),
        'admin': len([u for u in users if u['role'] == 'admin']),
        'suspended': len([u for u in users if u['status'] == 'suspended']),
    }

    return success({'users': users, 'counts': counts})


def update_user(event):
    """
    PATCH /api/admin/users/{id}
    Body: { "role"?: "customer|worker|admin", "status"?: "active|suspended" }
    Updates the DynamoDB profile and mirrors changes to Cognito.
    """
    admin_role = get_user_role(event)
    if admin_role != 'admin':
        return forbidden('Only admins can update users')

    user_id = get_path_param(event, 'id')
    if not user_id:
        return error('Missing user id')

    profile = get_item(f'USER#{user_id}', 'PROFILE')
    if not profile:
        return not_found('User not found')

    body = get_body(event)
    new_role = (body.get('role') or '').strip().lower()
    new_status = (body.get('status') or '').strip().lower()

    if not new_role and not new_status:
        return error('Nothing to update. Provide role and/or status.')

    # Guard: don't let an admin change their own account here (avoids self-lockout)
    acting_sub = get_user_sub(event)
    if profile.get('cognito_sub') and profile.get('cognito_sub') == acting_sub:
        return error('You cannot change your own role or status from here.')

    updates = {}
    cognito_sub = profile.get('cognito_sub')

    # --- Role change ---
    if new_role:
        if new_role not in ('customer', 'worker', 'admin'):
            return error('Invalid role')
        updates['role'] = new_role
        updates['GSI1PK'] = f'ROLE#{new_role}'
        # Mirror to Cognito custom:role so JWT claims match on next token refresh
        if cognito_sub and COGNITO_USER_POOL:
            try:
                _cognito_client().admin_update_user_attributes(
                    UserPoolId=COGNITO_USER_POOL,
                    Username=_cognito_username(cognito_sub, profile.get('email')),
                    UserAttributes=[{'Name': 'custom:role', 'Value': new_role}],
                )
            except Exception as e:
                print(f"Cognito role update failed: {e}")
                return server_error('Failed to update role in Cognito')

    # --- Status change ---
    if new_status:
        if new_status not in ('active', 'suspended'):
            return error('Invalid status')
        updates['is_active'] = (new_status == 'active')
        if cognito_sub and COGNITO_USER_POOL:
            try:
                client = _cognito_client()
                username = _cognito_username(cognito_sub, profile.get('email'))
                if new_status == 'suspended':
                    client.admin_disable_user(UserPoolId=COGNITO_USER_POOL, Username=username)
                else:
                    client.admin_enable_user(UserPoolId=COGNITO_USER_POOL, Username=username)
            except Exception as e:
                print(f"Cognito status update failed: {e}")
                return server_error('Failed to update status in Cognito')

    update_item(f'USER#{user_id}', 'PROFILE', updates)

    refreshed = get_item(f'USER#{user_id}', 'PROFILE')
    return success({
        'message': 'User updated',
        'user': {
            'id': user_id,
            'role': refreshed.get('role'),
            'status': 'active' if refreshed.get('is_active', True) else 'suspended',
        },
        'note': 'Role changes take effect after the user re-authenticates (token refresh).',
    })


def _cognito_username(cognito_sub, email):
    """
    Cognito username: this pool uses email as the username alias, but the
    immutable username is the sub. admin_* APIs accept the sub as Username.
    Prefer sub; fall back to email.
    """
    return cognito_sub or email


# =============================================================================
# Revenue Analytics
# =============================================================================

def get_revenue(event):
    """
    GET /api/admin/revenue
    Returns totals, per-service-category breakdown, and a monthly trend,
    all derived from completed bookings (real data).
    """
    role = get_user_role(event)
    if role != 'admin':
        return forbidden('Only admins can access revenue analytics')

    completed = query_all('STATUS#completed', index_name='GSI1')

    total_revenue = 0.0
    by_category = {}
    by_month = {}
    transactions = []

    for b in completed:
        amount = float(b.get('total_amount', 0) or 0)
        total_revenue += amount

        # Category = service_name
        svc = b.get('service_name') or 'Other'
        by_category[svc] = by_category.get(svc, 0.0) + amount

        # Month bucket from created_at (YYYY-MM) or scheduled_date
        stamp = (b.get('created_at') or b.get('scheduled_date') or '')[:7]
        if stamp:
            by_month[stamp] = by_month.get(stamp, 0.0) + amount

        transactions.append(decimal_to_float({
            'id': b.get('id'),
            'date': b.get('scheduled_date') or (b.get('created_at') or '')[:10],
            'customer_name': b.get('customer_name'),
            'worker_name': b.get('worker_name'),
            'service_name': svc,
            'amount': amount,
            'status': b.get('status'),
        }))

    completed_count = len(completed)
    avg_ticket = (total_revenue / completed_count) if completed_count else 0.0

    category_list = sorted(
        [{'name': k, 'amount': round(v, 2),
          'pct': round((v / total_revenue * 100), 1) if total_revenue else 0}
         for k, v in by_category.items()],
        key=lambda x: x['amount'], reverse=True
    )

    trend = [{'month': k, 'amount': round(v, 2)} for k, v in sorted(by_month.items())]

    transactions.sort(key=lambda x: x.get('date') or '', reverse=True)

    return success({
        'summary': {
            'total_revenue': round(total_revenue, 2),
            'completed_bookings': completed_count,
            'avg_ticket': round(avg_ticket, 2),
        },
        'by_category': category_list,
        'trend': trend,
        'transactions': transactions[:20],
    })
