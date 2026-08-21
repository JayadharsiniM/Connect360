"""
Connect360 - Shared DynamoDB Helper
All Lambdas use this module to interact with DynamoDB.
Single-table design with GSIs.
"""

import os
import uuid
from datetime import datetime, timezone
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Key, Attr

# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb')
TABLE_NAME = os.environ.get('DYNAMODB_TABLE', 'connect360-main-dev')
ACTIVITY_TABLE_NAME = os.environ.get('ACTIVITY_TABLE', 'connect360-activity-dev')

table = dynamodb.Table(TABLE_NAME)
activity_table = dynamodb.Table(ACTIVITY_TABLE_NAME)


def generate_id():
    """Generate a unique ID."""
    return str(uuid.uuid4())


def now_iso():
    """Current UTC timestamp in ISO format."""
    return datetime.now(timezone.utc).isoformat()


# =============================================================================
# Core CRUD Operations
# =============================================================================

def put_item(item, table_ref=None):
    """Put a single item into the table."""
    t = table_ref or table
    # Convert floats to Decimal for DynamoDB
    item = _convert_floats(item)
    t.put_item(Item=item)
    return item


def get_item(pk, sk, table_ref=None):
    """Get a single item by PK and SK."""
    t = table_ref or table
    response = t.get_item(Key={'PK': pk, 'SK': sk})
    return response.get('Item')


def update_item(pk, sk, updates, table_ref=None):
    """
    Update specific attributes of an item.
    updates: dict of {attribute_name: new_value}
    """
    t = table_ref or table
    update_expr_parts = []
    expr_names = {}
    expr_values = {}

    for key, value in updates.items():
        safe_key = f"#{key}"
        safe_val = f":{key}"
        update_expr_parts.append(f"{safe_key} = {safe_val}")
        expr_names[safe_key] = key
        expr_values[safe_val] = _convert_value(value)

    # Always update timestamp
    update_expr_parts.append("#updated_at = :updated_at")
    expr_names["#updated_at"] = "updated_at"
    expr_values[":updated_at"] = now_iso()

    t.update_item(
        Key={'PK': pk, 'SK': sk},
        UpdateExpression="SET " + ", ".join(update_expr_parts),
        ExpressionAttributeNames=expr_names,
        ExpressionAttributeValues=expr_values,
    )


def delete_item(pk, sk, table_ref=None):
    """Delete a single item."""
    t = table_ref or table
    t.delete_item(Key={'PK': pk, 'SK': sk})


def query_items(pk, sk_begins_with=None, index_name=None, limit=None,
                scan_forward=True, table_ref=None):
    """
    Query items by PK and optional SK prefix.
    Can query main table or a GSI.
    """
    t = table_ref or table
    kwargs = {
        'ScanIndexForward': scan_forward,
    }

    if index_name:
        kwargs['IndexName'] = index_name
        # GSI key names
        if index_name == 'GSI1':
            pk_name, sk_name = 'GSI1PK', 'GSI1SK'
        elif index_name == 'GSI2':
            pk_name, sk_name = 'GSI2PK', 'GSI2SK'
        else:
            pk_name, sk_name = 'PK', 'SK'
    else:
        pk_name, sk_name = 'PK', 'SK'

    key_condition = Key(pk_name).eq(pk)
    if sk_begins_with:
        key_condition = key_condition & Key(sk_name).begins_with(sk_begins_with)

    kwargs['KeyConditionExpression'] = key_condition

    if limit:
        kwargs['Limit'] = limit

    response = t.query(**kwargs)
    return response.get('Items', [])


def query_all(pk, sk_begins_with=None, index_name=None, table_ref=None):
    """Query all items (handles pagination)."""
    t = table_ref or table
    items = []
    kwargs = {}

    if index_name:
        kwargs['IndexName'] = index_name
        if index_name == 'GSI1':
            pk_name, sk_name = 'GSI1PK', 'GSI1SK'
        elif index_name == 'GSI2':
            pk_name, sk_name = 'GSI2PK', 'GSI2SK'
        else:
            pk_name, sk_name = 'PK', 'SK'
    else:
        pk_name, sk_name = 'PK', 'SK'

    key_condition = Key(pk_name).eq(pk)
    if sk_begins_with:
        key_condition = key_condition & Key(sk_name).begins_with(sk_begins_with)

    kwargs['KeyConditionExpression'] = key_condition

    while True:
        response = t.query(**kwargs)
        items.extend(response.get('Items', []))
        if 'LastEvaluatedKey' not in response:
            break
        kwargs['ExclusiveStartKey'] = response['LastEvaluatedKey']

    return items


def batch_write(items, table_ref=None):
    """Batch write multiple items."""
    t = table_ref or table
    with t.batch_writer() as batch:
        for item in items:
            batch.put_item(Item=_convert_floats(item))


def transact_write(transact_items):
    """
    Execute a DynamoDB transaction.
    transact_items: list of dicts with 'Put', 'Update', or 'Delete' operations
    """
    client = boto3.client('dynamodb')
    client.transact_write_items(TransactItems=transact_items)


# =============================================================================
# Helpers
# =============================================================================

def _convert_floats(item):
    """Convert Python floats to Decimal for DynamoDB."""
    if isinstance(item, dict):
        return {k: _convert_floats(v) for k, v in item.items()}
    elif isinstance(item, list):
        return [_convert_floats(v) for v in item]
    elif isinstance(item, float):
        return Decimal(str(item))
    return item


def _convert_value(value):
    """Convert a single value for DynamoDB."""
    if isinstance(value, float):
        return Decimal(str(value))
    if isinstance(value, dict):
        return _convert_floats(value)
    if isinstance(value, list):
        return [_convert_value(v) for v in value]
    return value


def decimal_to_float(item):
    """Convert DynamoDB Decimals back to floats for JSON serialization."""
    if isinstance(item, dict):
        return {k: decimal_to_float(v) for k, v in item.items()}
    elif isinstance(item, list):
        return [decimal_to_float(v) for v in item]
    elif isinstance(item, Decimal):
        if item % 1 == 0:
            return int(item)
        return float(item)
    return item
