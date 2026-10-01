"""
Connect360 - Shared Response Helpers
Standardized API responses for all Lambda functions.
"""

import json
from decimal import Decimal


class DecimalEncoder(json.JSONEncoder):
    """Handle Decimal types from database results."""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)


def success(body, status_code=200):
    """Return a successful API response."""
    return {
        'statusCode': status_code,
        'headers': _cors_headers(),
        'body': json.dumps(body, cls=DecimalEncoder, default=str),
    }


def created(body):
    """Return a 201 Created response."""
    return success(body, status_code=201)


def no_content():
    """Return a 204 No Content response."""
    return {
        'statusCode': 204,
        'headers': _cors_headers(),
        'body': '',
    }


def error(message, status_code=400):
    """Return an error response."""
    return {
        'statusCode': status_code,
        'headers': _cors_headers(),
        'body': json.dumps({'error': message}),
    }


def not_found(message='Resource not found'):
    """Return a 404 Not Found response."""
    return error(message, status_code=404)


def forbidden(message='Access denied'):
    """Return a 403 Forbidden response."""
    return error(message, status_code=403)


def unauthorized(message='Unauthorized'):
    """Return a 401 Unauthorized response."""
    return error(message, status_code=401)


def server_error(message='Internal server error'):
    """Return a 500 Internal Server Error response."""
    return error(message, status_code=500)


def _cors_headers():
    """Standard CORS headers for all responses."""
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    }
