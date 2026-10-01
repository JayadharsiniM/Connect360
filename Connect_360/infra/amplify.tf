# =============================================================================
# Connect360 - AWS Amplify (Next.js Frontend Hosting)
# Conditional: only created if frontend_repo is provided
# =============================================================================

resource "aws_amplify_app" "frontend" {
  count = var.frontend_repo != "" ? 1 : 0

  name       = "${var.project_name}-frontend-${var.environment}"
  repository = var.frontend_repo

  access_token = var.github_access_token

  # Build settings for Next.js
  build_spec = <<-EOT
    version: 1
    frontend:
      phases:
        preBuild:
          commands:
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: .next
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
          - .next/cache/**/*
  EOT

  # Next.js framework detection
  platform = "WEB_COMPUTE"

  # Environment variables for frontend
  environment_variables = {
    NEXT_PUBLIC_API_URL            = aws_api_gateway_deployment.main.invoke_url
    NEXT_PUBLIC_COGNITO_USER_POOL  = aws_cognito_user_pool.main.id
    NEXT_PUBLIC_COGNITO_CLIENT_ID  = aws_cognito_user_pool_client.main.id
    NEXT_PUBLIC_AWS_REGION         = var.aws_region
    AMPLIFY_MONOREPO_APP_ROOT      = "frontend"
  }

  # SPA rewrite rule
  custom_rule {
    source = "/<*>"
    target = "/index.html"
    status = "404-200"
  }
}

# Main branch auto-deploy
resource "aws_amplify_branch" "main" {
  count = var.frontend_repo != "" ? 1 : 0

  app_id      = aws_amplify_app.frontend[0].id
  branch_name = "main"

  framework = "Next.js - SSR"
  stage     = "PRODUCTION"

  environment_variables = {
    NEXT_PUBLIC_ENVIRONMENT = var.environment
  }
}
