# =============================================================================
# Connect360 - Razorpay Payments (TEST MODE ONLY)
#
# Payment logic lives inside the existing bookings Lambda (payments_handler.py),
# so this file only adds:
#   - variables for the Razorpay config (NO secrets in source — see below)
#   - IAM permission for the shared Lambda role to read the Razorpay secret
#   - env vars on the bookings Lambda (wired in lambda.tf)
#
# SECRET HANDLING:
#   The Razorpay credentials live in AWS Secrets Manager under the name given by
#   var.razorpay_secret_name, as JSON:
#     { "key_id": "rzp_test_xxx", "key_secret": "xxx", "webhook_secret": "xxx" }
#   NEVER put the secret value in Terraform or committed tfvars. Create it once:
#     aws secretsmanager create-secret \
#       --name connect360/razorpay \
#       --secret-string '{"key_id":"rzp_test_...","key_secret":"...","webhook_secret":"..."}' \
#       --region ap-south-1
#   Obtain TEST keys from the Razorpay Dashboard (Account & Settings -> API Keys,
#   with the dashboard toggled to "Test Mode"). Webhook secret is set when you
#   create the webhook (Settings -> Webhooks) pointing at /api/payments/webhook.
# =============================================================================

variable "razorpay_mode" {
  description = "Razorpay mode. MUST be 'test'. Any other value disables payments."
  type        = string
  default     = "test"

  validation {
    condition     = var.razorpay_mode == "test"
    error_message = "razorpay_mode must be 'test' — live payments are not permitted."
  }
}

variable "razorpay_secret_name" {
  description = "Secrets Manager name holding the Razorpay test credentials JSON."
  type        = string
  default     = "connect360/razorpay"
}

variable "payment_currency" {
  description = "ISO currency code for payments (smallest unit handled in code)."
  type        = string
  default     = "INR"
}

variable "commission_rate" {
  description = "Platform commission (take rate) as a fraction, e.g. 0.10 = 10%. Stored per payment at capture for historical stability."
  type        = string
  default     = "0.10"
}

# Secrets Manager read permission for the Razorpay secret, attached to the same
# shared Lambda execution role used everywhere else. Created only when a secret
# name is configured.
resource "aws_iam_role_policy" "lambda_razorpay_secret" {
  count = var.razorpay_secret_name != "" ? 1 : 0

  name = "${var.project_name}-razorpay-secret-access"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = "arn:aws:secretsmanager:${var.aws_region}:*:secret:${var.razorpay_secret_name}*"
      }
    ]
  })
}
