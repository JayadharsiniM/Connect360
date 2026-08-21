# =============================================================================
# Connect360 - DynamoDB Tables
# Single-table design with GSIs for all access patterns
# =============================================================================

# -----------------------------------------------------------------------------
# Main Table - All core entities
# -----------------------------------------------------------------------------
resource "aws_dynamodb_table" "main" {
  name         = "${var.project_name}-main-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"  # On-demand: no capacity planning needed
  hash_key     = "PK"
  range_key    = "SK"

  # Primary key attributes
  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  # GSI1 attributes
  attribute {
    name = "GSI1PK"
    type = "S"
  }

  attribute {
    name = "GSI1SK"
    type = "S"
  }

  # GSI2 attributes
  attribute {
    name = "GSI2PK"
    type = "S"
  }

  attribute {
    name = "GSI2SK"
    type = "S"
  }

  # GSI1: Multi-purpose index
  # - Workers by service+rating, bookings by status, pending verifications
  global_secondary_index {
    name            = "GSI1"
    hash_key        = "GSI1PK"
    range_key       = "GSI1SK"
    projection_type = "ALL"
  }

  # GSI2: Secondary access patterns
  # - User lookup by Cognito sub, worker bookings by date
  global_secondary_index {
    name            = "GSI2"
    hash_key        = "GSI2PK"
    range_key       = "GSI2SK"
    projection_type = "ALL"
  }

  # TTL for future use (chat messages, notifications)
  ttl {
    attribute_name = "TTL"
    enabled        = true
  }

  # Point-in-time recovery
  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Name = "${var.project_name}-main-table"
  }
}

# -----------------------------------------------------------------------------
# Activity Table - High-write entities (Phase 2: chat, notifications, presence)
# Separated to prevent hot partitions from affecting core operations
# -----------------------------------------------------------------------------
resource "aws_dynamodb_table" "activity" {
  name         = "${var.project_name}-activity-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "GSI1PK"
    type = "S"
  }

  attribute {
    name = "GSI1SK"
    type = "S"
  }

  global_secondary_index {
    name            = "GSI1"
    hash_key        = "GSI1PK"
    range_key       = "GSI1SK"
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "TTL"
    enabled        = true
  }

  tags = {
    Name = "${var.project_name}-activity-table"
  }
}
