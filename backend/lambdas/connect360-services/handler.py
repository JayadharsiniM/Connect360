"""
Connect360 - Services Lambda (DynamoDB)
Handles:
  - GET    /api/services         → List all active services
  - POST   /api/services         → Create service (admin only)
  - PUT    /api/services/{id}    → Update service (admin only)
  - DELETE /api/services/{id}    → Soft-delete service (admin only)
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'shared'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'shared'))

from db import put_item, get_item, update_item, query_items, generate_id, now_iso, decimal_to_float, table
from response import success, created, error, not_found, forbidden, server_error
from auth_helpers import get_user_role, get_path_param, get_body
from boto3.dynamodb.conditions import Key, Attr


def lambda_handler(event, context):
    method = event.get('httpMethod', '')
    resource = event.get('resource', '')

    try:
        if method == 'GET' and resource == '/api/services':
            return list_services(event)
        elif method == 'POST' and resource == '/api/services':
            return create_service(event)
        elif method == 'PUT' and '/services/{id}' in resource:
            return update_service(event)
        elif method == 'DELETE' and '/services/{id}' in resource:
            return delete_service(event)
        else:
            return error('Route not found', status_code=404)
    except Exception as e:
        print(f"Error: {str(e)}")
        return server_error(str(e))


def list_services(event):
    """GET /api/services - List all active services."""
    # Query GSI1 for all services
    items = query_items('ENTITY#SERVICE', index_name='GSI1')

    # Filter active only
    services = [decimal_to_float(s) for s in items if s.get('is_active', True)]

    return success({'services': services, 'count': len(services)})


def create_service(event):
    """POST /api/services - Create a new service (admin only)."""
    role = get_user_role(event)
    if role != 'admin':
        return forbidden('Only admins can create services')

    body = get_body(event)
    name = body.get('name', '').strip()
    description = body.get('description', '').strip()
    icon = body.get('icon', '').strip()

    if not name:
        return error('Service name is required')

    service_id = generate_id()
    now = now_iso()

    item = {
        'PK': f'SERVICE#{service_id}',
        'SK': 'METADATA',
        'id': service_id,
        'name': name,
        'description': description,
        'icon': icon,
        'is_active': True,
        'created_at': now,
        'updated_at': now,
        # GSI1 for listing all services
        'GSI1PK': 'ENTITY#SERVICE',
        'GSI1SK': f'NAME#{name}',
    }
    put_item(item)

    return created({'service': decimal_to_float(item)})


def update_service(event):
    """PUT /api/services/{id} - Update a service (admin only)."""
    role = get_user_role(event)
    if role != 'admin':
        return forbidden('Only admins can update services')

    service_id = get_path_param(event, 'id')
    body = get_body(event)

    existing = get_item(f'SERVICE#{service_id}', 'METADATA')
    if not existing:
        return not_found('Service not found')

    updates = {}
    if body.get('name'):
        updates['name'] = body['name']
        updates['GSI1SK'] = f"NAME#{body['name']}"
    if 'description' in body:
        updates['description'] = body['description']
    if 'icon' in body:
        updates['icon'] = body['icon']

    if not updates:
        return error('No fields to update')

    update_item(f'SERVICE#{service_id}', 'METADATA', updates)

    updated = get_item(f'SERVICE#{service_id}', 'METADATA')
    return success({'service': decimal_to_float(updated)})


def delete_service(event):
    """DELETE /api/services/{id} - Soft-delete (admin only)."""
    role = get_user_role(event)
    if role != 'admin':
        return forbidden('Only admins can delete services')

    service_id = get_path_param(event, 'id')
    existing = get_item(f'SERVICE#{service_id}', 'METADATA')

    if not existing or not existing.get('is_active', True):
        return not_found('Service not found or already deleted')

    update_item(f'SERVICE#{service_id}', 'METADATA', {'is_active': False})

    return success({'message': 'Service deleted successfully'})
