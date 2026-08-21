# =============================================================================
# Connect360 - API Gateway (REST) with Cognito Authorizer
# Route-based multiplexing: each path prefix maps to one Lambda
# =============================================================================

# REST API
resource "aws_api_gateway_rest_api" "main" {
  name        = "${var.project_name}-api-${var.environment}"
  description = "Connect360 REST API"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# Cognito Authorizer (built-in, zero code)
resource "aws_api_gateway_authorizer" "cognito" {
  name            = "${var.project_name}-cognito-auth"
  rest_api_id     = aws_api_gateway_rest_api.main.id
  type            = "COGNITO_USER_POOLS"
  identity_source = "method.request.header.Authorization"

  provider_arns = [aws_cognito_user_pool.main.arn]
}

# =============================================================================
# /api resource (base path)
# =============================================================================
resource "aws_api_gateway_resource" "api" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = "api"
}

# =============================================================================
# AUTH routes: /api/auth
# =============================================================================
resource "aws_api_gateway_resource" "auth" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.api.id
  path_part   = "auth"
}

resource "aws_api_gateway_resource" "auth_me" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.auth.id
  path_part   = "me"
}

resource "aws_api_gateway_method" "auth_me_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.auth_me.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "auth_me_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.auth_me.id
  http_method             = aws_api_gateway_method.auth_me_get.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.auth.invoke_arn
}

# =============================================================================
# SERVICES routes: /api/services, /api/services/{id}
# =============================================================================
resource "aws_api_gateway_resource" "services" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.api.id
  path_part   = "services"
}

resource "aws_api_gateway_resource" "services_id" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.services.id
  path_part   = "{id}"
}

# GET /api/services
resource "aws_api_gateway_method" "services_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.services.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "services_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.services.id
  http_method             = aws_api_gateway_method.services_get.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.services.invoke_arn
}

# POST /api/services
resource "aws_api_gateway_method" "services_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.services.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "services_post" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.services.id
  http_method             = aws_api_gateway_method.services_post.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.services.invoke_arn
}

# PUT /api/services/{id}
resource "aws_api_gateway_method" "services_id_put" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.services_id.id
  http_method   = "PUT"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "services_id_put" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.services_id.id
  http_method             = aws_api_gateway_method.services_id_put.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.services.invoke_arn
}

# DELETE /api/services/{id}
resource "aws_api_gateway_method" "services_id_delete" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.services_id.id
  http_method   = "DELETE"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "services_id_delete" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.services_id.id
  http_method             = aws_api_gateway_method.services_id_delete.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.services.invoke_arn
}

# =============================================================================
# WORKERS routes: /api/workers, /api/workers/recommended, /api/workers/{id}
#                 /api/worker/profile, /api/worker/availability
# =============================================================================
resource "aws_api_gateway_resource" "workers" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.api.id
  path_part   = "workers"
}

resource "aws_api_gateway_resource" "workers_recommended" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.workers.id
  path_part   = "recommended"
}

resource "aws_api_gateway_resource" "workers_id" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.workers.id
  path_part   = "{id}"
}

resource "aws_api_gateway_resource" "worker" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.api.id
  path_part   = "worker"
}

resource "aws_api_gateway_resource" "worker_profile" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.worker.id
  path_part   = "profile"
}

resource "aws_api_gateway_resource" "worker_availability" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.worker.id
  path_part   = "availability"
}

# GET /api/workers
resource "aws_api_gateway_method" "workers_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.workers.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "workers_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.workers.id
  http_method             = aws_api_gateway_method.workers_get.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.workers.invoke_arn
}

# GET /api/workers/recommended
resource "aws_api_gateway_method" "workers_recommended_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.workers_recommended.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "workers_recommended_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.workers_recommended.id
  http_method             = aws_api_gateway_method.workers_recommended_get.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.workers.invoke_arn
}

# GET /api/workers/{id}
resource "aws_api_gateway_method" "workers_id_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.workers_id.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "workers_id_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.workers_id.id
  http_method             = aws_api_gateway_method.workers_id_get.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.workers.invoke_arn
}

# GET /api/worker/profile
resource "aws_api_gateway_method" "worker_profile_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.worker_profile.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "worker_profile_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.worker_profile.id
  http_method             = aws_api_gateway_method.worker_profile_get.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.workers.invoke_arn
}

# PUT /api/worker/profile
resource "aws_api_gateway_method" "worker_profile_put" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.worker_profile.id
  http_method   = "PUT"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "worker_profile_put" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.worker_profile.id
  http_method             = aws_api_gateway_method.worker_profile_put.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.workers.invoke_arn
}

# GET /api/worker/availability
resource "aws_api_gateway_method" "worker_availability_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.worker_availability.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "worker_availability_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.worker_availability.id
  http_method             = aws_api_gateway_method.worker_availability_get.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.workers.invoke_arn
}

# PUT /api/worker/availability
resource "aws_api_gateway_method" "worker_availability_put" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.worker_availability.id
  http_method   = "PUT"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "worker_availability_put" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.worker_availability.id
  http_method             = aws_api_gateway_method.worker_availability_put.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.workers.invoke_arn
}

# =============================================================================
# BOOKINGS routes: /api/bookings, /api/bookings/{id}, /api/bookings/{id}/cancel
#                  /api/worker/bookings, /api/worker/bookings/{id}/respond,
#                  /api/worker/bookings/{id}/status
#                  /api/reviews, /api/workers/{id}/reviews
# =============================================================================
resource "aws_api_gateway_resource" "bookings" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.api.id
  path_part   = "bookings"
}

resource "aws_api_gateway_resource" "bookings_id" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.bookings.id
  path_part   = "{id}"
}

resource "aws_api_gateway_resource" "bookings_id_cancel" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.bookings_id.id
  path_part   = "cancel"
}

resource "aws_api_gateway_resource" "worker_bookings" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.worker.id
  path_part   = "bookings"
}

resource "aws_api_gateway_resource" "worker_bookings_id" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.worker_bookings.id
  path_part   = "{id}"
}

resource "aws_api_gateway_resource" "worker_bookings_id_respond" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.worker_bookings_id.id
  path_part   = "respond"
}

resource "aws_api_gateway_resource" "worker_bookings_id_status" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.worker_bookings_id.id
  path_part   = "status"
}

resource "aws_api_gateway_resource" "reviews" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.api.id
  path_part   = "reviews"
}

resource "aws_api_gateway_resource" "workers_id_reviews" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.workers_id.id
  path_part   = "reviews"
}

# POST /api/bookings
resource "aws_api_gateway_method" "bookings_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.bookings.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "bookings_post" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.bookings.id
  http_method             = aws_api_gateway_method.bookings_post.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.bookings.invoke_arn
}

# GET /api/bookings
resource "aws_api_gateway_method" "bookings_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.bookings.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "bookings_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.bookings.id
  http_method             = aws_api_gateway_method.bookings_get.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.bookings.invoke_arn
}

# GET /api/bookings/{id}
resource "aws_api_gateway_method" "bookings_id_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.bookings_id.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "bookings_id_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.bookings_id.id
  http_method             = aws_api_gateway_method.bookings_id_get.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.bookings.invoke_arn
}

# PUT /api/bookings/{id}/cancel
resource "aws_api_gateway_method" "bookings_id_cancel_put" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.bookings_id_cancel.id
  http_method   = "PUT"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "bookings_id_cancel_put" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.bookings_id_cancel.id
  http_method             = aws_api_gateway_method.bookings_id_cancel_put.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.bookings.invoke_arn
}

# GET /api/worker/bookings
resource "aws_api_gateway_method" "worker_bookings_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.worker_bookings.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "worker_bookings_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.worker_bookings.id
  http_method             = aws_api_gateway_method.worker_bookings_get.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.bookings.invoke_arn
}

# GET /api/worker/bookings/{id}
resource "aws_api_gateway_method" "worker_bookings_id_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.worker_bookings_id.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "worker_bookings_id_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.worker_bookings_id.id
  http_method             = aws_api_gateway_method.worker_bookings_id_get.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.bookings.invoke_arn
}

# PUT /api/worker/bookings/{id}/respond
resource "aws_api_gateway_method" "worker_bookings_id_respond_put" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.worker_bookings_id_respond.id
  http_method   = "PUT"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "worker_bookings_id_respond_put" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.worker_bookings_id_respond.id
  http_method             = aws_api_gateway_method.worker_bookings_id_respond_put.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.bookings.invoke_arn
}

# PUT /api/worker/bookings/{id}/status
resource "aws_api_gateway_method" "worker_bookings_id_status_put" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.worker_bookings_id_status.id
  http_method   = "PUT"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "worker_bookings_id_status_put" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.worker_bookings_id_status.id
  http_method             = aws_api_gateway_method.worker_bookings_id_status_put.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.bookings.invoke_arn
}

# POST /api/reviews
resource "aws_api_gateway_method" "reviews_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.reviews.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "reviews_post" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.reviews.id
  http_method             = aws_api_gateway_method.reviews_post.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.bookings.invoke_arn
}

# GET /api/workers/{id}/reviews
resource "aws_api_gateway_method" "workers_id_reviews_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.workers_id_reviews.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "workers_id_reviews_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.workers_id_reviews.id
  http_method             = aws_api_gateway_method.workers_id_reviews_get.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.bookings.invoke_arn
}

# =============================================================================
# VERIFICATION routes: /api/worker/verification, /api/worker/verification/upload-url
#                      /api/admin/verifications, /api/admin/verifications/{id}
# =============================================================================
resource "aws_api_gateway_resource" "worker_verification" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.worker.id
  path_part   = "verification"
}

resource "aws_api_gateway_resource" "worker_verification_upload_url" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.worker_verification.id
  path_part   = "upload-url"
}

resource "aws_api_gateway_resource" "admin" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.api.id
  path_part   = "admin"
}

resource "aws_api_gateway_resource" "admin_verifications" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.admin.id
  path_part   = "verifications"
}

resource "aws_api_gateway_resource" "admin_verifications_id" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.admin_verifications.id
  path_part   = "{id}"
}

# POST /api/worker/verification/upload-url
resource "aws_api_gateway_method" "worker_verification_upload_url_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.worker_verification_upload_url.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "worker_verification_upload_url_post" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.worker_verification_upload_url.id
  http_method             = aws_api_gateway_method.worker_verification_upload_url_post.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.verification.invoke_arn
}

# POST /api/worker/verification
resource "aws_api_gateway_method" "worker_verification_post" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.worker_verification.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "worker_verification_post" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.worker_verification.id
  http_method             = aws_api_gateway_method.worker_verification_post.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.verification.invoke_arn
}

# GET /api/worker/verification
resource "aws_api_gateway_method" "worker_verification_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.worker_verification.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "worker_verification_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.worker_verification.id
  http_method             = aws_api_gateway_method.worker_verification_get.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.verification.invoke_arn
}

# GET /api/admin/verifications
resource "aws_api_gateway_method" "admin_verifications_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.admin_verifications.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "admin_verifications_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.admin_verifications.id
  http_method             = aws_api_gateway_method.admin_verifications_get.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.verification.invoke_arn
}

# GET /api/admin/verifications/{id}
resource "aws_api_gateway_method" "admin_verifications_id_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.admin_verifications_id.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "admin_verifications_id_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.admin_verifications_id.id
  http_method             = aws_api_gateway_method.admin_verifications_id_get.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.verification.invoke_arn
}

# PUT /api/admin/verifications/{id}
resource "aws_api_gateway_method" "admin_verifications_id_put" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.admin_verifications_id.id
  http_method   = "PUT"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "admin_verifications_id_put" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.admin_verifications_id.id
  http_method             = aws_api_gateway_method.admin_verifications_id_put.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.verification.invoke_arn
}

# =============================================================================
# ADMIN routes: /api/admin/dashboard
# CUSTOMER routes: /api/customer/profile
# =============================================================================
resource "aws_api_gateway_resource" "admin_dashboard" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.admin.id
  path_part   = "dashboard"
}

resource "aws_api_gateway_resource" "customer" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.api.id
  path_part   = "customer"
}

resource "aws_api_gateway_resource" "customer_profile" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.customer.id
  path_part   = "profile"
}

# GET /api/admin/dashboard
resource "aws_api_gateway_method" "admin_dashboard_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.admin_dashboard.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "admin_dashboard_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.admin_dashboard.id
  http_method             = aws_api_gateway_method.admin_dashboard_get.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.admin.invoke_arn
}

# GET /api/customer/profile
resource "aws_api_gateway_method" "customer_profile_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.customer_profile.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "customer_profile_get" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.customer_profile.id
  http_method             = aws_api_gateway_method.customer_profile_get.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.admin.invoke_arn
}

# PUT /api/customer/profile
resource "aws_api_gateway_method" "customer_profile_put" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.customer_profile.id
  http_method   = "PUT"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "customer_profile_put" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.customer_profile.id
  http_method             = aws_api_gateway_method.customer_profile_put.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = aws_lambda_function.admin.invoke_arn
}

# =============================================================================
# CORS - Enable CORS on all resources (OPTIONS method)
# Using a module-like approach with for_each for cleanliness
# =============================================================================
locals {
  cors_resources = {
    auth_me                      = aws_api_gateway_resource.auth_me.id
    services                     = aws_api_gateway_resource.services.id
    services_id                  = aws_api_gateway_resource.services_id.id
    workers                      = aws_api_gateway_resource.workers.id
    workers_recommended          = aws_api_gateway_resource.workers_recommended.id
    workers_id                   = aws_api_gateway_resource.workers_id.id
    worker_profile               = aws_api_gateway_resource.worker_profile.id
    worker_availability          = aws_api_gateway_resource.worker_availability.id
    bookings                     = aws_api_gateway_resource.bookings.id
    bookings_id                  = aws_api_gateway_resource.bookings_id.id
    bookings_id_cancel           = aws_api_gateway_resource.bookings_id_cancel.id
    worker_bookings              = aws_api_gateway_resource.worker_bookings.id
    worker_bookings_id           = aws_api_gateway_resource.worker_bookings_id.id
    worker_bookings_id_respond   = aws_api_gateway_resource.worker_bookings_id_respond.id
    worker_bookings_id_status    = aws_api_gateway_resource.worker_bookings_id_status.id
    reviews                      = aws_api_gateway_resource.reviews.id
    workers_id_reviews           = aws_api_gateway_resource.workers_id_reviews.id
    worker_verification          = aws_api_gateway_resource.worker_verification.id
    worker_verification_upload   = aws_api_gateway_resource.worker_verification_upload_url.id
    admin_verifications          = aws_api_gateway_resource.admin_verifications.id
    admin_verifications_id       = aws_api_gateway_resource.admin_verifications_id.id
    admin_dashboard              = aws_api_gateway_resource.admin_dashboard.id
    customer_profile             = aws_api_gateway_resource.customer_profile.id
  }
}

resource "aws_api_gateway_method" "cors" {
  for_each = local.cors_resources

  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = each.value
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "cors" {
  for_each = local.cors_resources

  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = each.value
  http_method = aws_api_gateway_method.cors[each.key].http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "cors" {
  for_each = local.cors_resources

  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = each.value
  http_method = aws_api_gateway_method.cors[each.key].http_method
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

resource "aws_api_gateway_integration_response" "cors" {
  for_each = local.cors_resources

  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = each.value
  http_method = aws_api_gateway_method.cors[each.key].http_method
  status_code = aws_api_gateway_method_response.cors[each.key].status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Amz-Date,X-Api-Key'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# =============================================================================
# API Gateway Deployment
# =============================================================================
resource "aws_api_gateway_deployment" "main" {
  rest_api_id = aws_api_gateway_rest_api.main.id

  triggers = {
    redeployment = timestamp()
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    aws_api_gateway_integration.auth_me_get,
    aws_api_gateway_integration.services_get,
    aws_api_gateway_integration.services_post,
    aws_api_gateway_integration.services_id_put,
    aws_api_gateway_integration.services_id_delete,
    aws_api_gateway_integration.workers_get,
    aws_api_gateway_integration.workers_recommended_get,
    aws_api_gateway_integration.workers_id_get,
    aws_api_gateway_integration.worker_profile_get,
    aws_api_gateway_integration.worker_profile_put,
    aws_api_gateway_integration.worker_availability_get,
    aws_api_gateway_integration.worker_availability_put,
    aws_api_gateway_integration.bookings_post,
    aws_api_gateway_integration.bookings_get,
    aws_api_gateway_integration.bookings_id_get,
    aws_api_gateway_integration.bookings_id_cancel_put,
    aws_api_gateway_integration.worker_bookings_get,
    aws_api_gateway_integration.worker_bookings_id_get,
    aws_api_gateway_integration.worker_bookings_id_respond_put,
    aws_api_gateway_integration.worker_bookings_id_status_put,
    aws_api_gateway_integration.reviews_post,
    aws_api_gateway_integration.workers_id_reviews_get,
    aws_api_gateway_integration.worker_verification_upload_url_post,
    aws_api_gateway_integration.worker_verification_post,
    aws_api_gateway_integration.worker_verification_get,
    aws_api_gateway_integration.admin_verifications_get,
    aws_api_gateway_integration.admin_verifications_id_get,
    aws_api_gateway_integration.admin_verifications_id_put,
    aws_api_gateway_integration.admin_dashboard_get,
    aws_api_gateway_integration.customer_profile_get,
    aws_api_gateway_integration.customer_profile_put,
    aws_api_gateway_integration.cors,
  ]
}

resource "aws_api_gateway_stage" "main" {
  deployment_id = aws_api_gateway_deployment.main.id
  rest_api_id   = aws_api_gateway_rest_api.main.id
  stage_name    = var.environment
}
