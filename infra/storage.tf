# =============================================================================
# Connect360 - S3 Storage (Verification Documents)
# =============================================================================

resource "aws_s3_bucket" "verification_docs" {
  bucket = "${var.project_name}-verification-docs-${random_id.suffix.hex}"

  tags = {
    Name = "${var.project_name}-verification-docs"
  }
}

# Block all public access
resource "aws_s3_bucket_public_access_block" "verification_docs" {
  bucket = aws_s3_bucket.verification_docs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CORS configuration (for frontend direct upload via pre-signed URLs)
resource "aws_s3_bucket_cors_configuration" "verification_docs" {
  bucket = aws_s3_bucket.verification_docs.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST"]
    allowed_origins = ["*"] # Restrict to your domain in production
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}

# Lifecycle rule - auto-delete old rejected documents after 30 days
resource "aws_s3_bucket_lifecycle_configuration" "verification_docs" {
  bucket = aws_s3_bucket.verification_docs.id

  rule {
    id     = "delete-old-documents"
    status = "Enabled"

    filter {
      prefix = "rejected/"
    }

    expiration {
      days = 30
    }
  }
}

# Server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "verification_docs" {
  bucket = aws_s3_bucket.verification_docs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
