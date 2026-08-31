# =============================================================================
# Connect360 - Main Terraform Configuration
# Simplified Architecture: RDS Data API, No VPC for Lambda, Cognito Authorizer
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  # Remote state stored in S3 (ap-south-1)
  # Native S3 state locking via use_lockfile (Terraform >= 1.10)
  backend "s3" {
    bucket       = "connect360-tfstate-022598396983"
    key          = "connect360/dev/terraform.tfstate"
    region       = "ap-south-1"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "Connect360"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Random suffix for globally unique resource names
resource "random_id" "suffix" {
  byte_length = 4
}
