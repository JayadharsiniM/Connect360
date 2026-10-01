"""
Connect360 - Shared Auth Helpers
Extract user info from Cognito authorizer claims in API Gateway events.
"""


def get_user_claims(event):
    """
    Extract user claims from API Gateway event (Cognito authorizer).
    
    Returns:
        dict with 'sub', 'email', 'role', 'full_name'
    """
    claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
    
    return {
        'sub': claims.get('sub', ''),
        'email': claims.get('email', ''),
        'role': claims.get('custom:role', ''),
        'full_name': claims.get('custom:full_name', ''),
    }


def get_user_sub(event):
    """Get Cognito sub (unique user ID) from event."""
    return get_user_claims(event)['sub']


def get_user_role(event):
    """Get user role from event claims."""
    return get_user_claims(event)['role']


def require_role(event, *allowed_roles):
    """
    Check if user has one of the allowed roles.
    
    Args:
        event: API Gateway event
        *allowed_roles: One or more role strings ('admin', 'worker', 'customer')
    
    Returns:
        tuple: (is_authorized: bool, role: str)
    """
    role = get_user_role(event)
    return (role in allowed_roles, role)


def get_path_param(event, param_name):
    """Extract a path parameter from the event."""
    params = event.get('pathParameters') or {}
    return params.get(param_name)


def get_query_param(event, param_name, default=None):
    """Extract a query string parameter from the event."""
    params = event.get('queryStringParameters') or {}
    return params.get(param_name, default)


def get_body(event):
    """Parse JSON body from the event."""
    import json
    body = event.get('body', '')
    if not body:
        return {}
    try:
        return json.loads(body)
    except (json.JSONDecodeError, TypeError):
        return {}
