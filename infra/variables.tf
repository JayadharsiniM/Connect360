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

# =============================================================================
# Calling Provider (Twilio Voice) - Number Privacy / Masked Calling (Feature 1)
# Works with a Twilio free trial for testing (no purchase required).
# Leave empty to keep calling disabled (endpoint returns "unavailable").
# Populate via a local, gitignored terraform.tfvars or a secure secret store.
# NEVER commit real values.
# =============================================================================
variable "twilio_account_sid" {
  description = "Twilio Account SID (leave empty to disable calling)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "twilio_auth_token" {
  description = "Twilio Auth Token (leave empty to disable calling)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "twilio_from_number" {
  description = "Twilio phone number (E.164) used as the masked caller ID"
  type        = string
  default     = ""
  sensitive   = true
}

variable "twilio_twiml_url" {
  description = "TwiML URL (e.g. a Twilio TwiML Bin) that <Dial>s the callee for the second leg"
  type        = string
  default     = ""
  sensitive   = true
}

variable "twilio_api_base" {
  description = "Twilio API base URL"
  type        = string
  default     = "https://api.twilio.com"
}

# =============================================================================
# AI Assistant (Amazon Bedrock) - Feature 2
# AI_ENABLED=false by default -> assistant uses rule-based fallback (Rs.0).
# Set ai_enabled="true" + a model id + region to enable Bedrock (uses credits).
# =============================================================================
variable "ai_enabled" {
  description = "Enable Bedrock-powered AI assistant (\"true\"/\"false\"). Off = rule-based fallback, Rs.0."
  type        = string
  default     = "false"
}

variable "bedrock_model_id" {
  description = "Bedrock model id (e.g. amazon.nova-micro-v1:0). Empty keeps AI disabled."
  type        = string
  default     = ""
}

variable "bedrock_region" {
  description = "AWS region for Bedrock (e.g. us-east-1). Bedrock may not be in ap-south-1 for all models."
  type        = string
  default     = "us-east-1"
}

variable "ai_max_output_tokens" {
  description = "Max output tokens per assistant response (cost cap)."
  type        = string
  default     = "400"
}
