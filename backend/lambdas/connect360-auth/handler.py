"""
Connect360 - Auth Lambda (DynamoDB)
Handles:
  - Cognito Post-Confirmation Trigger (creates user in DynamoDB)
  - GET /api/auth/me (returns current user info)
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'shared'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'shared'))

from db import put_item, get_item, query_items, generate_id, now_iso, decimal_to_float
from response import success, error, not_found, server_error
from auth_helpers import get_user_claims, get_user_sub


def lambda_handler(event, context):
    """Main entry point."""
    if 'triggerSource' in event:
        return handle_cognito_trigger(event, context)

    method = event.get('httpMethod', '')
    resource = event.get('resource', '')

    try:
        if method == 'GET' and '/auth/me' in resource:
            return get_current_user(event)
        else:
            return error('Route not found', status_code=404)
    except Exception as e:
        print(f"Error: {str(e)}")
        return server_error(str(e))


def handle_cognito_trigger(event, context):
    """Cognito Post-Confirmation: create user in DynamoDB."""
    trigger_source = event.get('triggerSource', '')

    if trigger_source != 'PostConfirmation_ConfirmSignUp':
        return event

    user_attributes = event.get('request', {}).get('userAttributes', {})
    cognito_sub = user_attributes.get('sub', '')
    email = user_attributes.get('email', '')
    full_name = user_attributes.get('custom:full_name', email.split('@')[0])
    role = user_attributes.get('custom:role', 'customer')

    if role not in ('customer', 'worker', 'admin'):
        role = 'customer'

    user_id = generate_id()
    now = now_iso()

    # Create user profile item
    user_item = {
        'PK': f'USER#{user_id}',
        'SK': 'PROFILE',
        'id': user_id,
        'cognito_sub': cognito_sub,
        'email': email,
        'full_name': full_name,
        'role': role,
        'is_active': True,
        'created_at': now,
        'updated_at': now,
        # GSI1: for listing users by role
        'GSI1PK': f'ROLE#{role}',
        'GSI1SK': f'USER#{user_id}',
        # GSI2: for lookup by Cognito sub
        'GSI2PK': f'COGNITO#{cognito_sub}',
        'GSI2SK': 'USER',
    }
    put_item(user_item)

    # If worker, create empty worker profile
    if role == 'worker':
        worker_profile = {
            'PK': f'USER#{user_id}',
            'SK': 'WORKER_PROFILE',
            'user_id': user_id,
            'bio': '',
            'experience_years': 0,
            'hourly_rate': 0,
            'rating_avg': 0,
            'rating_count': 0,
            'is_verified': False,
            'is_available': True,
            'created_at': now,
            'updated_at': now,
        }
        put_item(worker_profile)

    print(f"Created user: {email} with role: {role}")
    return event


def get_current_user(event):
    """GET /api/auth/me - Returns current user info."""
    claims = get_user_claims(event)
    cognito_sub = claims['sub']

    if not cognito_sub:
        return error('User not authenticated', status_code=401)

    # Look up user by Cognito sub using GSI2
    items = query_items(f'COGNITO#{cognito_sub}', sk_begins_with='USER', index_name='GSI2')

    if not items:
        return not_found('User not found in database')

    user = items[0]
    user_id = user['id']

    # If worker, get profile
    if user.get('role') == 'worker':
        profile = get_item(f'USER#{user_id}', 'WORKER_PROFILE')
        if profile:
            user['worker_profile'] = decimal_to_float(profile)

    return success({'user': decimal_to_float(user)})
