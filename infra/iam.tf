# =============================================================================
# Connect360 - IAM Resources
# Lambda execution role with DynamoDB, S3, Cognito permissions
# =============================================================================

# Lambda execution role
resource "aws_iam_role" "lambda_exec" {
  name = "${var.project_name}-lambda-exec-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# CloudWatch Logs policy (Lambda basic execution)
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# DynamoDB full access to both tables
resource "aws_iam_role_policy" "lambda_dynamodb" {
  name = "${var.project_name}-dynamodb-access"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem",
          "dynamodb:TransactWriteItems",
          "dynamodb:TransactGetItems"
        ]
        Resource = [
          aws_dynamodb_table.main.arn,
          "${aws_dynamodb_table.main.arn}/index/*",
          aws_dynamodb_table.activity.arn,
          "${aws_dynamodb_table.activity.arn}/index/*"
        ]
      }
    ]
  })
}

# S3 access policy (for verification documents)
resource "aws_iam_role_policy" "lambda_s3" {
  name = "${var.project_name}-s3-access"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.verification_docs.arn}/*"
      }
    ]
  })
}

# Bedrock invoke permission — only when ai_provider="bedrock".
resource "aws_iam_role_policy" "lambda_bedrock" {
  count = var.ai_provider == "bedrock" ? 1 : 0

  name = "${var.project_name}-bedrock-access"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["bedrock:InvokeModel"]
        Resource = "arn:aws:bedrock:${var.bedrock_region}::foundation-model/*"
      }
    ]
  })
}

# Secrets Manager read permission for Gemini API key — only when ai_provider="gemini".
resource "aws_iam_role_policy" "lambda_secrets" {
  count = var.ai_provider == "gemini" ? 1 : 0

  name = "${var.project_name}-secrets-access"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = "arn:aws:secretsmanager:${var.aws_region}:*:secret:${var.gemini_secret_name}*"
      }
    ]
  })
}

# Cognito admin actions (for post-confirmation trigger)
resource "aws_iam_role_policy" "lambda_cognito" {
  name = "${var.project_name}-cognito-access"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cognito-idp:AdminGetUser",
          "cognito-idp:AdminUpdateUserAttributes",
          "cognito-idp:AdminDisableUser",
          "cognito-idp:AdminEnableUser",
          "cognito-idp:ListUsers"
        ]
        Resource = aws_cognito_user_pool.main.arn
      }
    ]
  })
}
