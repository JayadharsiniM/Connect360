"""
Connect360 - Verification Lambda (DynamoDB)
Handles worker document verification workflow.
"""

import sys
import os
import uuid
import boto3

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'shared'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'shared'))

from db import (put_item, get_item, update_item, query_items, query_all,
                generate_id, now_iso, decimal_to_float)
from response import success, created, error, not_found, forbidden, server_error
from auth_helpers import get_user_claims, get_user_sub, get_user_role, get_path_param, get_query_param, get_body

S3_BUCKET = os.environ.get('S3_BUCKET', '')
s3_client = boto3.client('s3')


def lambda_handler(event, context):
    method = event.get('httpMethod', '')
    resource = event.get('resource', '')

    try:
        if method == 'POST' and '/verification/upload-url' in resource:
            return generate_upload_url(event)
        elif method == 'POST' and resource == '/api/worker/verification':
            return submit_verification(event)
        elif method == 'GET' and resource == '/api/worker/verification':
            return get_verification_status(event)
        elif method == 'GET' and resource == '/api/admin/verifications':
            return list_pending_verifications(event)
        elif method == 'GET' and '/admin/verifications/{id}' in resource:
            return get_verification_detail(event)
        elif method == 'PUT' and '/admin/verifications/{id}' in resource:
            return review_verification(event)
        else:
            return error('Route not found', status_code=404)
    except Exception as e:
        print(f"Error: {str(e)}")
        return server_error(str(e))


def _get_user_id_from_sub(cognito_sub):
    items = query_items(f'COGNITO#{cognito_sub}', sk_begins_with='USER', index_name='GSI2')
    return items[0].get('id') if items else None


def generate_upload_url(event):
    """POST /api/worker/verification/upload-url"""
    role = get_user_role(event)
    if role != 'worker':
        return forbidden('Only workers can upload verification documents')

    cognito_sub = get_user_sub(event)
    body = get_body(event)
    file_name = body.get('file_name', '')
    content_type = body.get('content_type', 'application/pdf')

    if not file_name:
        return error('file_name is required')

    allowed_types = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    if content_type not in allowed_types:
        return error(f'Content type must be one of: {", ".join(allowed_types)}')

    file_ext = file_name.split('.')[-1] if '.' in file_name else 'pdf'
    s3_key = f"verifications/{cognito_sub}/{uuid.uuid4().hex}.{file_ext}"

    presigned_url = s3_client.generate_presigned_url(
        'put_object',
        Params={'Bucket': S3_BUCKET, 'Key': s3_key, 'ContentType': content_type},
        ExpiresIn=900,
    )

    return success({'upload_url': presigned_url, 's3_key': s3_key, 'expires_in': 900})


def submit_verification(event):
    """POST /api/worker/verification"""
    role = get_user_role(event)
    if role != 'worker':
        return forbidden('Only workers can submit verification')

    user_id = _get_user_id_from_sub(get_user_sub(event))
    body = get_body(event)

    document_type = body.get('document_type')
    document_name = body.get('document_name', '')
    s3_key = body.get('s3_key', '')

    if not all([document_type, document_name, s3_key]):
        return error('document_type, document_name, and s3_key are required')

    valid_types = ['id_proof', 'address_proof', 'certification', 'other']
    if document_type not in valid_types:
        return error(f'document_type must be one of: {", ".join(valid_types)}')

    doc_id = generate_id()
    now = now_iso()

    # Get user info for admin display
    user = get_item(f'USER#{user_id}', 'PROFILE')
    worker_name = user.get('full_name', '') if user else ''
    worker_email = user.get('email', '') if user else ''

    item = {
        'PK': f'USER#{user_id}',
        'SK': f'VERIFICATION#{doc_id}',
        'id': doc_id,
        'worker_id': user_id,
        'worker_name': worker_name,
        'worker_email': worker_email,
        'document_type': document_type,
        'document_name': document_name,
        's3_key': s3_key,
        'status': 'pending',
        'created_at': now,
        'updated_at': now,
        # GSI1: for admin listing pending verifications
        'GSI1PK': 'VERIFICATION#pending',
        'GSI1SK': f'{now}#{doc_id}',
    }
    put_item(item)

    return created({'message': 'Verification document submitted successfully'})


def get_verification_status(event):
    """GET /api/worker/verification"""
    role = get_user_role(event)
    if role != 'worker':
        return forbidden('Only workers can access this endpoint')

    user_id = _get_user_id_from_sub(get_user_sub(event))
    items = query_items(f'USER#{user_id}', sk_begins_with='VERIFICATION#')
    documents = [decimal_to_float(d) for d in items]

    all_approved = all(d['status'] == 'approved' for d in documents) if documents else False
    has_pending = any(d['status'] == 'pending' for d in documents)

    return success({
        'documents': documents,
        'is_fully_verified': all_approved and len(documents) > 0,
        'has_pending': has_pending,
    })


def list_pending_verifications(event):
    """GET /api/admin/verifications"""
    role = get_user_role(event)
    if role != 'admin':
        return forbidden('Only admins can access this endpoint')

    status_filter = get_query_param(event, 'status', 'pending')
    items = query_items(f'VERIFICATION#{status_filter}', index_name='GSI1')
    verifications = [decimal_to_float(v) for v in items]

    return success({'verifications': verifications, 'count': len(verifications)})


def get_verification_detail(event):
    """GET /api/admin/verifications/{id}"""
    role = get_user_role(event)
    if role != 'admin':
        return forbidden('Only admins can access this endpoint')

    doc_id = get_path_param(event, 'id')

    # We need to find the doc - scan GSI1 for this doc ID
    # Since we stored it with doc_id in GSI1SK, we need to find the worker
    # Alternative: store a secondary reference. For now, scan pending/approved/rejected
    for status in ['pending', 'approved', 'rejected']:
        items = query_items(f'VERIFICATION#{status}', index_name='GSI1')
        for item in items:
            if item.get('id') == doc_id:
                doc = decimal_to_float(item)
                if doc.get('s3_key'):
                    doc['download_url'] = s3_client.generate_presigned_url(
                        'get_object',
                        Params={'Bucket': S3_BUCKET, 'Key': doc['s3_key']},
                        ExpiresIn=3600,
                    )
                return success({'verification': doc})

    return not_found('Verification document not found')


def review_verification(event):
    """PUT /api/admin/verifications/{id}"""
    role = get_user_role(event)
    if role != 'admin':
        return forbidden('Only admins can review verifications')

    doc_id = get_path_param(event, 'id')
    body = get_body(event)
    action = body.get('action')
    notes = body.get('notes', '')

    if action not in ('approve', 'reject'):
        return error('Action must be "approve" or "reject"')

    # Find the document
    items = query_items('VERIFICATION#pending', index_name='GSI1')
    doc = None
    for item in items:
        if item.get('id') == doc_id:
            doc = item
            break

    if not doc:
        return not_found('Verification document not found or already reviewed')

    worker_id = doc['worker_id']
    new_status = 'approved' if action == 'approve' else 'rejected'

    # Update the document
    update_item(f'USER#{worker_id}', f'VERIFICATION#{doc_id}', {
        'status': new_status,
        'admin_notes': notes,
        'reviewed_at': now_iso(),
        'GSI1PK': f'VERIFICATION#{new_status}',
        'GSI1SK': f'{now_iso()}#{doc_id}',
    })

    # If approved, check if worker should be marked as verified
    if action == 'approve':
        all_docs = query_items(f'USER#{worker_id}', sk_begins_with='VERIFICATION#')
        # Check if all docs (except this one being updated) are approved
        all_approved = all(
            d['status'] == 'approved' or d['id'] == doc_id
            for d in all_docs
        )
        if all_approved and len(all_docs) > 0:
            update_item(f'USER#{worker_id}', 'WORKER_PROFILE', {'is_verified': True})

    return success({'message': f'Document {new_status}', 'status': new_status})
