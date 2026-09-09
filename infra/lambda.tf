# =============================================================================
# Connect360 - Lambda Function Definitions
# 7 Lambdas with route-based multiplexing, NO VPC, using DynamoDB
# =============================================================================

# -----------------------------------------------------------------------------
# CloudWatch Log Groups with retention (prevents unlimited log accumulation)
# Free tier: 5 GB ingestion/month. 7-day retention keeps storage near zero.
# -----------------------------------------------------------------------------
resource "aws_cloudwatch_log_group" "lambda_logs" {
  for_each = toset([
    "${var.project_name}-auth-${var.environment}",
    "${var.project_name}-services-${var.environment}",
    "${var.project_name}-workers-${var.environment}",
    "${var.project_name}-bookings-${var.environment}",
    "${var.project_name}-verification-${var.environment}",
    "${var.project_name}-admin-${var.environment}",
    "${var.project_name}-assistant-${var.environment}",
  ])

  name              = "/aws/lambda/${each.value}"
  retention_in_days = 7

  tags = { Name = "${each.value}-logs" }
}

# Environment variables shared across all Lambdas
# Note: auth Lambda uses a separate env block to avoid circular dependency
# (Cognito references auth Lambda, so auth Lambda cannot reference Cognito)
locals {
  lambda_env_vars_base = {
    ENVIRONMENT    = var.environment
    DYNAMODB_TABLE = aws_dynamodb_table.main.name
    ACTIVITY_TABLE = aws_dynamodb_table.activity.name
    S3_BUCKET      = aws_s3_bucket.verification_docs.id
    AWS_REGION_NAME = var.aws_region
  }

  lambda_env_vars = merge(local.lambda_env_vars_base, {
    COGNITO_USER_POOL = aws_cognito_user_pool.main.id
  })

  # Bookings Lambda additionally gets Twilio calling config (Feature 1).
  # Empty by default -> calling endpoint safely reports "unavailable".
  bookings_env_vars = merge(local.lambda_env_vars, {
    TWILIO_ACCOUNT_SID = var.twilio_account_sid
    TWILIO_AUTH_TOKEN  = var.twilio_auth_token
    TWILIO_FROM_NUMBER = var.twilio_from_number
    TWILIO_TWIML_URL   = var.twilio_twiml_url
    TWILIO_API_BASE    = var.twilio_api_base
    # Priority Booking (Feature 3): how long a worker offer stays open before
    # it is treated as expired (lazy timeout, evaluated on customer poll/rematch).
    PRIORITY_OFFER_TIMEOUT_SECONDS = var.priority_offer_timeout_seconds
  })

  # Assistant Lambda additionally gets Bedrock AI config (Feature 2).
  # AI_PROVIDER="gemini" -> Gemini API; "bedrock" -> Bedrock; "" -> fallback only.
  assistant_env_vars = merge(local.lambda_env_vars, {
    AI_PROVIDER          = var.ai_provider
    GEMINI_MODEL         = var.gemini_model
    GEMINI_SECRET_NAME   = var.gemini_secret_name
    GEMINI_SECRET_REGION = var.aws_region
    BEDROCK_MODEL_ID     = var.bedrock_model_id
    BEDROCK_REGION       = var.bedrock_region
    AI_MAX_OUTPUT_TOKENS = var.ai_max_output_tokens
  })
}

# -----------------------------------------------------------------------------
# Lambda 1: connect360-auth
# -----------------------------------------------------------------------------
resource "aws_lambda_function" "auth" {
  function_name = "${var.project_name}-auth-${var.environment}"
  role          = aws_iam_role.lambda_exec.arn
  handler       = "handler.lambda_handler"
  runtime       = var.lambda_runtime
  timeout       = var.lambda_timeout
  memory_size   = var.lambda_memory

  filename         = "${path.module}/lambda_packages/auth.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda_packages/auth.zip")

  environment {
    variables = local.lambda_env_vars_base
  }

  tags = { Name = "${var.project_name}-auth", Domain = "authentication" }
}

# -----------------------------------------------------------------------------
# Lambda 2: connect360-services
# -----------------------------------------------------------------------------
resource "aws_lambda_function" "services" {
  function_name = "${var.project_name}-services-${var.environment}"
  role          = aws_iam_role.lambda_exec.arn
  handler       = "handler.lambda_handler"
  runtime       = var.lambda_runtime
  timeout       = var.lambda_timeout
  memory_size   = var.lambda_memory

  filename         = "${path.module}/lambda_packages/services.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda_packages/services.zip")

  environment {
    variables = local.lambda_env_vars
  }

  tags = { Name = "${var.project_name}-services", Domain = "services" }
}

# -----------------------------------------------------------------------------
# Lambda 3: connect360-workers
# -----------------------------------------------------------------------------
resource "aws_lambda_function" "workers" {
  function_name = "${var.project_name}-workers-${var.environment}"
  role          = aws_iam_role.lambda_exec.arn
  handler       = "handler.lambda_handler"
  runtime       = var.lambda_runtime
  timeout       = var.lambda_timeout
  memory_size   = var.lambda_memory

  filename         = "${path.module}/lambda_packages/workers.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda_packages/workers.zip")

  environment {
    variables = local.lambda_env_vars
  }

  tags = { Name = "${var.project_name}-workers", Domain = "workers" }
}

# -----------------------------------------------------------------------------
# Lambda 4: connect360-bookings
# -----------------------------------------------------------------------------
resource "aws_lambda_function" "bookings" {
  function_name = "${var.project_name}-bookings-${var.environment}"
  role          = aws_iam_role.lambda_exec.arn
  handler       = "handler.lambda_handler"
  runtime       = var.lambda_runtime
  timeout       = var.lambda_timeout
  memory_size   = var.lambda_memory

  filename         = "${path.module}/lambda_packages/bookings.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda_packages/bookings.zip")

  environment {
    variables = local.bookings_env_vars
  }

  tags = { Name = "${var.project_name}-bookings", Domain = "bookings" }
}

# -----------------------------------------------------------------------------
# Lambda 5: connect360-verification
# -----------------------------------------------------------------------------
resource "aws_lambda_function" "verification" {
  function_name = "${var.project_name}-verification-${var.environment}"
  role          = aws_iam_role.lambda_exec.arn
  handler       = "handler.lambda_handler"
  runtime       = var.lambda_runtime
  timeout       = var.lambda_timeout
  memory_size   = var.lambda_memory

  filename         = "${path.module}/lambda_packages/verification.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda_packages/verification.zip")

  environment {
    variables = local.lambda_env_vars
  }

  tags = { Name = "${var.project_name}-verification", Domain = "verification" }
}

# -----------------------------------------------------------------------------
# Lambda 6: connect360-admin
# -----------------------------------------------------------------------------
resource "aws_lambda_function" "admin" {
  function_name = "${var.project_name}-admin-${var.environment}"
  role          = aws_iam_role.lambda_exec.arn
  handler       = "handler.lambda_handler"
  runtime       = var.lambda_runtime
  timeout       = var.lambda_timeout
  memory_size   = var.lambda_memory

  filename         = "${path.module}/lambda_packages/admin.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda_packages/admin.zip")

  environment {
    variables = local.lambda_env_vars
  }

  tags = { Name = "${var.project_name}-admin", Domain = "admin" }
}

# -----------------------------------------------------------------------------
# Lambda 7: connect360-assistant (AI Assistant - Feature 2)
# -----------------------------------------------------------------------------
resource "aws_lambda_function" "assistant" {
  function_name = "${var.project_name}-assistant-${var.environment}"
  role          = aws_iam_role.lambda_exec.arn
  handler       = "handler.lambda_handler"
  runtime       = var.lambda_runtime
  timeout       = var.lambda_timeout
  memory_size   = var.lambda_memory

  filename         = "${path.module}/lambda_packages/assistant.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda_packages/assistant.zip")

  environment {
    variables = local.assistant_env_vars
  }

  tags = { Name = "${var.project_name}-assistant", Domain = "assistant" }
}

# -----------------------------------------------------------------------------
# API Gateway Permissions
# -----------------------------------------------------------------------------
resource "aws_lambda_permission" "api_gw_auth" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.auth.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gw_services" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.services.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gw_workers" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.workers.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gw_bookings" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.bookings.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gw_verification" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.verification.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gw_admin" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.admin.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gw_assistant" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.assistant.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}
