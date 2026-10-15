# =============================================================================
# Connect360 - Arrival OTP routes (Ola/Uber-style verification)
#   GET  /api/bookings/{id}/arrival-otp              (customer) -> bookings Lambda
#   POST /api/bookings/{id}/arrival-otp/regenerate   (customer) -> bookings Lambda
#   POST /api/bookings/{id}/verify-arrival-otp       (worker)   -> bookings Lambda
# All Cognito-authed; verification + status transition happen server-side.
# =============================================================================

# /api/bookings/{id}/arrival-otp
resource "aws_api_gateway_resource" "booking_arrival_otp" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.bookings_id.id
  path_part   = "arrival-otp"
}

resource "aws_api_gateway_method" "booking_arrival_otp_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.booking_arrival_otp.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "booking_arrival_otp_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.booking_arrival_otp.id
  http_method             = aws_api_gateway_method.booking_arrival_otp_get.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.bookings.invoke_arn
}

# /api/bookings/{id}/arrival-otp/regenerate
resource "aws_api_gateway_resource" "booking_arrival_otp_regen" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.booking_arrival_otp.id
  path_part   = "regenerate"
}

resource "aws_api_gateway_method" "booking_arrival_otp_regen_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.booking_arrival_otp_regen.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "booking_arrival_otp_regen_post" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.booking_arrival_otp_regen.id
  http_method             = aws_api_gateway_method.booking_arrival_otp_regen_post.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.bookings.invoke_arn
}

# /api/bookings/{id}/verify-arrival-otp
resource "aws_api_gateway_resource" "booking_verify_arrival_otp" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.bookings_id.id
  path_part   = "verify-arrival-otp"
}

resource "aws_api_gateway_method" "booking_verify_arrival_otp_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.booking_verify_arrival_otp.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "booking_verify_arrival_otp_post" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.booking_verify_arrival_otp.id
  http_method             = aws_api_gateway_method.booking_verify_arrival_otp_post.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.bookings.invoke_arn
}

# -----------------------------------------------------------------------------
# CORS (OPTIONS) for the arrival-OTP resources
# -----------------------------------------------------------------------------
locals {
  arrival_otp_cors_resources = {
    booking_arrival_otp        = aws_api_gateway_resource.booking_arrival_otp.id
    booking_arrival_otp_regen  = aws_api_gateway_resource.booking_arrival_otp_regen.id
    booking_verify_arrival_otp = aws_api_gateway_resource.booking_verify_arrival_otp.id
  }
}

resource "aws_api_gateway_method" "arrival_otp_cors" {
  for_each      = local.arrival_otp_cors_resources
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = each.value
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "arrival_otp_cors" {
  for_each    = local.arrival_otp_cors_resources
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = each.value
  http_method = aws_api_gateway_method.arrival_otp_cors[each.key].http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "arrival_otp_cors" {
  for_each    = local.arrival_otp_cors_resources
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = each.value
  http_method = aws_api_gateway_method.arrival_otp_cors[each.key].http_method
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

resource "aws_api_gateway_integration_response" "arrival_otp_cors" {
  for_each    = local.arrival_otp_cors_resources
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = each.value
  http_method = aws_api_gateway_method.arrival_otp_cors[each.key].http_method
  status_code = aws_api_gateway_method_response.arrival_otp_cors[each.key].status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Amz-Date,X-Api-Key'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,PATCH,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}
