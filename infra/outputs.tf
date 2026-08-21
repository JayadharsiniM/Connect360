# =============================================================================
# Connect360 - Outputs
# =============================================================================

# API Gateway
output "api_gateway_url" {
  description = "Base URL of the API Gateway"
  value       = aws_api_gateway_deployment.main.invoke_url
}

output "api_gateway_id" {
  description = "API Gateway REST API ID"
  value       = aws_api_gateway_rest_api.main.id
}

# Cognito
output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.main.id
}

output "cognito_client_id" {
  description = "Cognito App Client ID"
  value       = aws_cognito_user_pool_client.main.id
}

# DynamoDB
output "dynamodb_main_table" {
  description = "Main DynamoDB table name"
  value       = aws_dynamodb_table.main.name
}

output "dynamodb_activity_table" {
  description = "Activity DynamoDB table name"
  value       = aws_dynamodb_table.activity.name
}

# S3
output "s3_bucket_name" {
  description = "S3 bucket for verification documents"
  value       = aws_s3_bucket.verification_docs.id
}

# Lambda
output "lambda_functions" {
  description = "Map of Lambda function names to ARNs"
  value = {
    auth         = aws_lambda_function.auth.arn
    services     = aws_lambda_function.services.arn
    workers      = aws_lambda_function.workers.arn
    bookings     = aws_lambda_function.bookings.arn
    verification = aws_lambda_function.verification.arn
    admin        = aws_lambda_function.admin.arn
  }
}
