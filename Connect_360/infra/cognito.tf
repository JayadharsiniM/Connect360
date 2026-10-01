# =============================================================================
# Connect360 - Cognito Resources
# User Pool with email+password auth, custom:role attribute
# =============================================================================

resource "aws_cognito_user_pool" "main" {
  name = "${var.project_name}-users-${var.environment}"

  # Email as username
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  # Password policy
  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
    require_uppercase = true
  }

  # Custom attributes
  schema {
    name                = "role"
    attribute_data_type = "String"
    mutable             = true
    required            = false

    string_attribute_constraints {
      min_length = 1
      max_length = 20
    }
  }

  schema {
    name                = "full_name"
    attribute_data_type = "String"
    mutable             = true
    required            = false

    string_attribute_constraints {
      min_length = 1
      max_length = 100
    }
  }

  # Email verification (built-in)
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "Connect360 - Verify your email"
    email_message        = "Your verification code is: {####}"
  }

  # Account recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # Lambda triggers
  lambda_config {
    post_confirmation = aws_lambda_function.auth.arn
  }
}

# App Client (for frontend)
resource "aws_cognito_user_pool_client" "main" {
  name         = "${var.project_name}-web-client"
  user_pool_id = aws_cognito_user_pool.main.id

  # No client secret for SPA
  generate_secret = false

  # Auth flows
  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]

  # Token validity
  access_token_validity  = 1  # hours
  id_token_validity      = 1  # hours
  refresh_token_validity = 30 # days

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  # Read/write attributes
  read_attributes  = ["email", "custom:role", "custom:full_name"]
  write_attributes = ["email", "custom:role", "custom:full_name"]
}

# Allow Cognito to invoke the auth Lambda (post-confirmation trigger)
resource "aws_lambda_permission" "cognito_trigger" {
  statement_id  = "AllowCognitoInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.auth.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.main.arn
}
