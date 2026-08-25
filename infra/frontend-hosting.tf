# =============================================================================
# Connect360 - Frontend Hosting (S3 Static Website)
# Direct S3 static website hosting (HTTP only)
# Cost: $0/month (S3 free tier: 5 GB storage + 20K GET requests for 12 months)
# Can switch to CloudFront later once account is verified for HTTPS + CDN
# =============================================================================

# S3 Bucket for frontend static files
resource "aws_s3_bucket" "frontend" {
  bucket = "${var.project_name}-frontend-${random_id.suffix.hex}"

  tags = { Name = "${var.project_name}-frontend" }
}

# Enable static website hosting
resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html" # SPA routing - all errors go to index.html
  }
}

# Allow public read access for website hosting
resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# Bucket policy to allow public read
resource "aws_s3_bucket_policy" "frontend" {
  bucket     = aws_s3_bucket.frontend.id
  depends_on = [aws_s3_bucket_public_access_block.frontend]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.frontend.arn}/*"
      }
    ]
  })
}

# =============================================================================
# Outputs
# =============================================================================
output "frontend_url" {
  description = "S3 website URL for the frontend"
  value       = "http://${aws_s3_bucket_website_configuration.frontend.website_endpoint}"
}

output "frontend_s3_bucket" {
  description = "S3 bucket for frontend files"
  value       = aws_s3_bucket.frontend.id
}
