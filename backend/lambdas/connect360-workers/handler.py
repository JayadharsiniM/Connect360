"""
Connect360 - Workers Lambda (DynamoDB)
Handles:
  - GET  /api/worker/profile         → Worker gets own profile
  - PUT  /api/worker/profile         → Worker updates profile
  - GET  /api/worker/availability    → Worker gets own availability
  - PUT  /api/worker/availability    → Worker sets availability
  - GET  /api/workers                → Customer lists workers
  - GET  /api/workers/recommended    → Recommendation engine
  - GET  /api/workers/{id}           → Customer views worker profile
"""

import sys
import os
from decimal import Decimal

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'shared'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'shared'))

from db import (put_item, get_item, update_item, delete_item, query_items,
                query_all, batch_write, generate_id, now_iso, decimal_to_float, table)
from response import success, error, not_found, forbidden, server_error
from auth_helpers import get_user_claims, get_user_sub, get_user_role, get_path_param, get_query_param, get_body


def lambda_handler(event, context):
    method = event.get('httpMethod', '')
    resource = event.get('resource', '')

    try:
        if method == 'GET' and resource == '/api/worker/profile':
            return get_worker_profile(event)
        elif method == 'PUT' and resource == '/api/worker/profile':
            return update_worker_profile(event)
        elif method == 'GET' and resource == '/api/worker/availability':
            return get_worker_availability(event)
        elif method == 'PUT' and resource == '/api/worker/availability':
            return set_worker_availability(event)
        elif method == 'GET' and resource == '/api/workers/recommended':
            return get_recommended_workers(event)
        elif method == 'GET' and resource == '/api/workers/{id}':
            return get_worker_by_id(event)
        elif method == 'GET' and resource == '/api/workers':
            return list_workers(event)
        else:
            return error('Route not found', status_code=404)
    except Exception as e:
        print(f"Error: {str(e)}")
        return server_error(str(e))


def _get_user_id_from_sub(cognito_sub):
    """Look up user ID from Cognito sub."""
    items = query_items(f'COGNITO#{cognito_sub}', sk_begins_with='USER', index_name='GSI2')
    if items:
        return items[0].get('id')
    return None


def get_worker_profile(event):
    """GET /api/worker/profile"""
    role = get_user_role(event)
    if role != 'worker':
        return forbidden('Only workers can access this endpoint')

    user_id = _get_user_id_from_sub(get_user_sub(event))
    if not user_id:
        return not_found('User not found')

    # Get profile and user info
    user = get_item(f'USER#{user_id}', 'PROFILE')
    profile = get_item(f'USER#{user_id}', 'WORKER_PROFILE')

    if not user or not profile:
        return not_found('Worker profile not found')

    # Get skills
    skill_items = query_items(f'USER#{user_id}', sk_begins_with='SKILL#')
    skills = [s['skill_name'] for s in skill_items]

    # Get services
    service_items = query_items(f'USER#{user_id}', sk_begins_with='SERVICE#')
    services = [{'id': s['service_id'], 'name': s['service_name']} for s in service_items]

    result = {**user, **profile, 'skills': skills, 'services': services}
    return success({'profile': decimal_to_float(result)})


def update_worker_profile(event):
    """PUT /api/worker/profile"""
    role = get_user_role(event)
    if role != 'worker':
        return forbidden('Only workers can update their profile')

    user_id = _get_user_id_from_sub(get_user_sub(event))
    if not user_id:
        return not_found('User not found')

    body = get_body(event)

    # Update worker profile fields
    profile_updates = {}
    if 'bio' in body:
        profile_updates['bio'] = body['bio']
    if 'experience_years' in body:
        profile_updates['experience_years'] = int(body['experience_years'])
    if 'hourly_rate' in body:
        profile_updates['hourly_rate'] = float(body['hourly_rate'])
    if 'is_available' in body:
        profile_updates['is_available'] = body['is_available']

    if profile_updates:
        update_item(f'USER#{user_id}', 'WORKER_PROFILE', profile_updates)

    # Update user fields
    user_updates = {}
    if 'full_name' in body:
        user_updates['full_name'] = body['full_name']
    if 'phone' in body:
        user_updates['phone'] = body['phone']
    if 'address' in body:
        user_updates['address'] = body['address']
    if 'city' in body:
        user_updates['city'] = body['city']

    if user_updates:
        update_item(f'USER#{user_id}', 'PROFILE', user_updates)

    # Replace skills
    if 'skills' in body:
        # Delete existing
        old_skills = query_items(f'USER#{user_id}', sk_begins_with='SKILL#')
        for skill in old_skills:
            delete_item(f'USER#{user_id}', skill['SK'])
        # Add new
        for skill_name in body['skills']:
            put_item({
                'PK': f'USER#{user_id}',
                'SK': f'SKILL#{skill_name}',
                'skill_name': skill_name,
                'created_at': now_iso(),
            })

    # Replace services
    if 'service_ids' in body:
        old_services = query_items(f'USER#{user_id}', sk_begins_with='SERVICE#')
        for svc in old_services:
            delete_item(f'USER#{user_id}', svc['SK'])
        # Get service names and add
        for service_id in body['service_ids']:
            svc_item = get_item(f'SERVICE#{service_id}', 'METADATA')
            service_name = svc_item['name'] if svc_item else 'Unknown'
            put_item({
                'PK': f'USER#{user_id}',
                'SK': f'SERVICE#{service_id}',
                'service_id': service_id,
                'service_name': service_name,
                'created_at': now_iso(),
                # GSI1: workers for a service
                'GSI1PK': f'SERVICE_WORKER#{service_id}',
                'GSI1SK': f'WORKER#{user_id}',
            })

    return success({'message': 'Profile updated successfully'})


def get_worker_availability(event):
    """GET /api/worker/availability"""
    role = get_user_role(event)
    if role != 'worker':
        return forbidden('Only workers can access this endpoint')

    user_id = _get_user_id_from_sub(get_user_sub(event))
    if not user_id:
        return not_found('User not found')

    items = query_items(f'USER#{user_id}', sk_begins_with='AVAIL#')
    availability = [decimal_to_float(a) for a in items]

    return success({'availability': availability})


def set_worker_availability(event):
    """PUT /api/worker/availability"""
    role = get_user_role(event)
    if role != 'worker':
        return forbidden('Only workers can set availability')

    user_id = _get_user_id_from_sub(get_user_sub(event))
    if not user_id:
        return not_found('User not found')

    body = get_body(event)
    schedule = body.get('schedule', [])

    # Delete existing availability
    old_avail = query_items(f'USER#{user_id}', sk_begins_with='AVAIL#')
    for slot in old_avail:
        delete_item(f'USER#{user_id}', slot['SK'])

    # Add new slots
    for slot in schedule:
        day = slot.get('day_of_week')
        start = slot.get('start_time')
        end = slot.get('end_time')
        if day is not None and start and end:
            put_item({
                'PK': f'USER#{user_id}',
                'SK': f'AVAIL#{day}#{start}',
                'day_of_week': int(day),
                'start_time': start,
                'end_time': end,
                'is_available': slot.get('is_available', True),
            })

    return success({'message': 'Availability updated successfully'})


def list_workers(event):
    """GET /api/workers - List available workers."""
    service_id = get_query_param(event, 'service_id')

    if service_id:
        # Query workers offering this service via GSI1
        worker_refs = query_items(f'SERVICE_WORKER#{service_id}', index_name='GSI1')
        workers = []
        for ref in worker_refs:
            wid = ref.get('GSI1SK', '').replace('WORKER#', '')
            worker = _build_worker_summary(wid)
            if worker and worker.get('is_available') and worker.get('is_verified'):
                workers.append(worker)
    else:
        # Query all workers via GSI1
        items = query_items('ROLE#worker', index_name='GSI1')
        workers = []
        for item in items:
            wid = item.get('id')
            if wid:
                worker = _build_worker_summary(wid)
                if worker and worker.get('is_available') and worker.get('is_verified'):
                    workers.append(worker)

    # Sort by rating
    workers.sort(key=lambda w: float(w.get('rating_avg', 0)), reverse=True)

    return success({'workers': workers, 'count': len(workers)})


def get_recommended_workers(event):
    """GET /api/workers/recommended - Recommendation engine."""
    service_id = get_query_param(event, 'service_id')
    limit = int(get_query_param(event, 'limit', '5'))

    if service_id:
        worker_refs = query_items(f'SERVICE_WORKER#{service_id}', index_name='GSI1')
        worker_ids = [ref.get('GSI1SK', '').replace('WORKER#', '') for ref in worker_refs]
    else:
        items = query_items('ROLE#worker', index_name='GSI1')
        worker_ids = [item.get('id') for item in items if item.get('id')]

    # Build profiles and score
    workers = []
    for wid in worker_ids:
        worker = _build_worker_summary(wid)
        if worker and worker.get('is_verified'):
            # Scoring algorithm
            rating = float(worker.get('rating_avg', 0))
            exp = min(int(worker.get('experience_years', 0)), 10)
            reviews = min(int(worker.get('rating_count', 0)), 50)
            available = 1 if worker.get('is_available') else 0

            score = (rating / 5.0) * 40 + (exp / 10.0) * 25 + (reviews / 50.0) * 20 + available * 15
            worker['recommendation_score'] = round(score, 1)
            workers.append(worker)

    # Sort by score desc, limit
    workers.sort(key=lambda w: w['recommendation_score'], reverse=True)
    workers = workers[:limit]
    for i, w in enumerate(workers):
        w['rank'] = i + 1

    return success({
        'workers': workers,
        'count': len(workers),
        'algorithm': 'rule_based_scoring_v1',
        'scoring': {'rating_weight': 40, 'experience_weight': 25, 'review_count_weight': 20, 'availability_bonus': 15},
    })


def get_worker_by_id(event):
    """GET /api/workers/{id} - View worker profile."""
    worker_user_id = get_path_param(event, 'id')
    if not worker_user_id:
        return error('Worker ID is required')

    user = get_item(f'USER#{worker_user_id}', 'PROFILE')
    if not user or user.get('role') != 'worker':
        return not_found('Worker not found')

    profile = get_item(f'USER#{worker_user_id}', 'WORKER_PROFILE')
    skills_items = query_items(f'USER#{worker_user_id}', sk_begins_with='SKILL#')
    services_items = query_items(f'USER#{worker_user_id}', sk_begins_with='SERVICE#')
    avail_items = query_items(f'USER#{worker_user_id}', sk_begins_with='AVAIL#')

    worker = {
        'id': worker_user_id,
        'full_name': user.get('full_name'),
        'city': user.get('city'),
        **(profile or {}),
        'skills': [s['skill_name'] for s in skills_items],
        'services': [{'id': s['service_id'], 'name': s['service_name']} for s in services_items],
        'availability': [decimal_to_float(a) for a in avail_items],
    }
    # Remove internal keys
    for key in ['PK', 'SK', 'GSI1PK', 'GSI1SK', 'GSI2PK', 'GSI2SK']:
        worker.pop(key, None)

    return success({'worker': decimal_to_float(worker)})


def _build_worker_summary(user_id):
    """Build a worker summary dict from DynamoDB items."""
    user = get_item(f'USER#{user_id}', 'PROFILE')
    profile = get_item(f'USER#{user_id}', 'WORKER_PROFILE')

    if not user or not profile:
        return None

    return decimal_to_float({
        'id': user_id,
        'full_name': user.get('full_name'),
        'city': user.get('city'),
        'bio': profile.get('bio'),
        'experience_years': profile.get('experience_years', 0),
        'hourly_rate': profile.get('hourly_rate', 0),
        'rating_avg': profile.get('rating_avg', 0),
        'rating_count': profile.get('rating_count', 0),
        'is_verified': profile.get('is_verified', False),
        'is_available': profile.get('is_available', True),
    })
