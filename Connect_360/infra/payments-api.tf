# =============================================================================
# Connect360 - Razorpay Payments API routes (TEST MODE)
#   POST /api/payments/create-order   (Cognito)   -> bookings Lambda
#   POST /api/payments/verify         (Cognito)   -> bookings Lambda
#   GET  /api/payments/{booking_id}   (Cognito)   -> bookings Lambda
#   POST /api/payments/webhook        (NONE/sig)  -> bookings Lambda
#   GET  /api/admin/payments          (Cognito)   -> bookings Lambda
#
# The webhook route intentionally has authorization = "NONE": Razorpay cannot
# present a Cognito token, so it is authenticated by HMAC signature inside the
# Lambda (payments_handler.handle_webhook). All other routes keep Cognito auth.
# =============================================================================

# /api/payments
resource "aws_api_gateway_resource" "payments" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.api.id
  path_part   = "payments"
}

# /api/payments/create-order
resource "aws_api_gateway_resource" "payments_create_order" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.payments.id
  path_part   = "create-order"
}

resource "aws_api_gateway_method" "payments_create_order_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.payments_create_order.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "payments_create_order_post" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.payments_create_order.id
  http_method             = aws_api_gateway_method.payments_create_order_post.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.bookings.invoke_arn
}

# /api/payments/verify
resource "aws_api_gateway_resource" "payments_verify" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.payments.id
  path_part   = "verify"
}

resource "aws_api_gateway_method" "payments_verify_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.payments_verify.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "payments_verify_post" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.payments_verify.id
  http_method             = aws_api_gateway_method.payments_verify_post.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.bookings.invoke_arn
}

# /api/payments/webhook  (NO Cognito — HMAC-signature authenticated in Lambda)
resource "aws_api_gateway_resource" "payments_webhook" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.payments.id
  path_part   = "webhook"
}

resource "aws_api_gateway_method" "payments_webhook_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.payments_webhook.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "payments_webhook_post" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.payments_webhook.id
  http_method             = aws_api_gateway_method.payments_webhook_post.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.bookings.invoke_arn
}

# /api/payments/{booking_id}
resource "aws_api_gateway_resource" "payments_booking_id" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.payments.id
  path_part   = "{booking_id}"
}

resource "aws_api_gateway_method" "payments_booking_id_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.payments_booking_id.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "payments_booking_id_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.payments_booking_id.id
  http_method             = aws_api_gateway_method.payments_booking_id_get.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.bookings.invoke_arn
}

# /api/worker/payments (worker earnings dashboard)
resource "aws_api_gateway_resource" "worker_payments" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.worker.id
  path_part   = "payments"
}

resource "aws_api_gateway_method" "worker_payments_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.worker_payments.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "worker_payments_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.worker_payments.id
  http_method             = aws_api_gateway_method.worker_payments_get.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.bookings.invoke_arn
}

# /api/admin/payments
resource "aws_api_gateway_resource" "admin_payments" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.admin.id
  path_part   = "payments"
}

resource "aws_api_gateway_method" "admin_payments_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.admin_payments.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "admin_payments_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.admin_payments.id
  http_method             = aws_api_gateway_method.admin_payments_get.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.bookings.invoke_arn
}

# /api/admin/payments/analytics
resource "aws_api_gateway_resource" "admin_payments_analytics" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.admin_payments.id
  path_part   = "analytics"
}

resource "aws_api_gateway_method" "admin_payments_analytics_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.admin_payments_analytics.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "admin_payments_analytics_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.admin_payments_analytics.id
  http_method             = aws_api_gateway_method.admin_payments_analytics_get.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.bookings.invoke_arn
}

# -----------------------------------------------------------------------------
# CORS (OPTIONS) for the payment resources
# -----------------------------------------------------------------------------
locals {
  payment_cors_resources = {
    payments_create_order    = aws_api_gateway_resource.payments_create_order.id
    payments_verify          = aws_api_gateway_resource.payments_verify.id
    payments_webhook         = aws_api_gateway_resource.payments_webhook.id
    payments_booking_id      = aws_api_gateway_resource.payments_booking_id.id
    admin_payments           = aws_api_gateway_resource.admin_payments.id
    admin_payments_analytics = aws_api_gateway_resource.admin_payments_analytics.id
    worker_payments          = aws_api_gateway_resource.worker_payments.id
  }
}

resource "aws_api_gateway_method" "payment_cors" {
  for_each      = local.payment_cors_resources
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = each.value
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "payment_cors" {
  for_each    = local.payment_cors_resources
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = each.value
  http_method = aws_api_gateway_method.payment_cors[each.key].http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "payment_cors" {
  for_each    = local.payment_cors_resources
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = each.value
  http_method = aws_api_gateway_method.payment_cors[each.key].http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
  response_models = {
    "application/json" = "Empty"
  }
}

resource "aws_api_gateway_integration_response" "payment_cors" {
  for_each    = local.payment_cors_resources
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = each.value
  http_method = aws_api_gateway_method.payment_cors[each.key].http_method
  status_code = aws_api_gateway_method_response.payment_cors[each.key].status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Razorpay-Signature'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,PATCH,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}
