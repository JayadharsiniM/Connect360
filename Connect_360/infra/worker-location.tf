# =============================================================================
# Connect360 - Worker live-location route (for proximity matching)
#   POST /api/worker/location  (worker, Cognito) -> workers Lambda
# Stores the worker's live/registered coordinates on their profile so the
# Priority matching engine can rank by real haversine distance.
# =============================================================================

resource "aws_api_gateway_resource" "worker_location" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.worker.id
  path_part   = "location"
}

resource "aws_api_gateway_method" "worker_location_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.worker_location.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "worker_location_post" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.worker_location.id
  http_method             = aws_api_gateway_method.worker_location_post.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.workers.invoke_arn
}

variable "worker_live_loc_ttl_seconds" {
  description = "How long a worker's shared live location stays fresh for proximity matching (seconds)."
  type        = string
  default     = "600"
}

# CORS (OPTIONS)
resource "aws_api_gateway_method" "worker_location_cors" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.worker_location.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "worker_location_cors" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.worker_location.id
  http_method = aws_api_gateway_method.worker_location_cors.http_method
  type        = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "worker_location_cors" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.worker_location.id
  http_method = aws_api_gateway_method.worker_location_cors.http_method
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

resource "aws_api_gateway_integration_response" "worker_location_cors" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.worker_location.id
  http_method = aws_api_gateway_method.worker_location_cors.http_method
  status_code = aws_api_gateway_method_response.worker_location_cors.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Amz-Date,X-Api-Key'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,PATCH,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}
