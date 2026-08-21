# =============================================================================
# Connect360 - Variables
# =============================================================================

variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "connect360"
}

# Lambda
variable "lambda_runtime" {
  description = "Python runtime for Lambda functions"
  type        = string
  default     = "python3.11"
}

variable "lambda_timeout" {
  description = "Lambda function timeout in seconds"
  type        = number
  default     = 30
}

variable "lambda_memory" {
  description = "Lambda function memory in MB"
  type        = number
  default     = 256
}

# Cognito
variable "admin_email" {
  description = "Email for the pre-created admin user"
  type        = string
  default     = "admin@connect360.com"
}

# Frontend
variable "frontend_repo" {
  description = "GitHub repository URL for Amplify frontend"
  type        = string
  default     = ""
}

variable "github_access_token" {
  description = "GitHub personal access token for Amplify"
  type        = string
  default     = ""
  sensitive   = true
}
