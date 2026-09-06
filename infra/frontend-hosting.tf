# =============================================================================
# Connect360 - Frontend Hosting (S3 + CloudFront HTTPS)
# S3 static website origin + CloudFront distribution for HTTPS + global CDN.
# Cost: $0/month (S3 free tier + CloudFront always-free: 1TB + 10M req/month)
# =============================================================================

# S3 Bucket for frontend static files
resource "aws_s3_bucket" "frontend" {
  bucket = "${var.project_name}-frontend-${random_id.suffix.hex}"

  tags = { Name = "${var.project_name}-frontend" }
}

# Enable static website hosting (used as the CloudFront origin)
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
# CloudFront Distribution (HTTPS + CDN in front of the S3 website)
# =============================================================================
resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Connect360 frontend"
  default_root_object = "index.html"
  price_class         = "PriceClass_100" # cheapest: NA + EU edge locations

  origin {
    # Use the S3 *website* endpoint as a custom origin (supports SPA routing).
    domain_name = aws_s3_bucket_website_configuration.frontend.website_endpoint
    origin_id   = "s3-website-frontend"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only" # S3 website endpoints are HTTP-only
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-website-frontend"
    viewer_protocol_policy = "redirect-to-https" # force HTTPS

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
    compress    = true
  }

  # SPA routing: serve index.html for 403/404 so client-side routes work
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true # free *.cloudfront.net HTTPS cert
  }

  tags = { Name = "${var.project_name}-frontend-cdn" }
}

# =============================================================================
# Outputs
# =============================================================================
output "frontend_url_http" {
  description = "S3 website URL (HTTP)"
  value       = "http://${aws_s3_bucket_website_configuration.frontend.website_endpoint}"
}

output "frontend_url" {
  description = "CloudFront HTTPS URL for the frontend"
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "frontend_s3_bucket" {
  description = "S3 bucket for frontend files"
  value       = aws_s3_bucket.frontend.id
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (for cache invalidation on redeploy)"
  value       = aws_cloudfront_distribution.frontend.id
}
