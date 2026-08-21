#!/bin/bash
# =============================================================================
# Connect360 - Lambda Packaging Script
# Creates zip files for each Lambda function with shared dependencies
# Run from project root: bash infra/scripts/package-lambda.sh
# =============================================================================

set -e

echo "=== Connect360 Lambda Packager ==="
echo ""

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
SHARED_DIR="$BACKEND_DIR/shared"
LAMBDAS_DIR="$BACKEND_DIR/lambdas"
OUTPUT_DIR="$PROJECT_ROOT/infra/lambda_packages"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# List of Lambda functions to package
LAMBDAS=(
    "connect360-auth:auth"
    "connect360-services:services"
    "connect360-workers:workers"
    "connect360-bookings:bookings"
    "connect360-verification:verification"
    "connect360-admin:admin"
)

for entry in "${LAMBDAS[@]}"; do
    LAMBDA_DIR="${entry%%:*}"
    ZIP_NAME="${entry##*:}"
    
    echo "Packaging: $LAMBDA_DIR -> $ZIP_NAME.zip"
    
    # Create temp build directory
    BUILD_DIR=$(mktemp -d)
    
    # Copy Lambda handler
    cp "$LAMBDAS_DIR/$LAMBDA_DIR/handler.py" "$BUILD_DIR/"
    
    # Copy shared modules into a 'shared' subdirectory AND root (for direct imports)
    mkdir -p "$BUILD_DIR/shared"
    cp "$SHARED_DIR"/*.py "$BUILD_DIR/shared/"
    cp "$SHARED_DIR"/*.py "$BUILD_DIR/"
    
    # Add __init__.py for shared package
    touch "$BUILD_DIR/shared/__init__.py"
    
    # Create zip
    cd "$BUILD_DIR"
    zip -r "$OUTPUT_DIR/$ZIP_NAME.zip" . -x "*.pyc" "__pycache__/*"
    
    # Cleanup
    rm -rf "$BUILD_DIR"
    
    echo "  -> Created $OUTPUT_DIR/$ZIP_NAME.zip"
done

echo ""
echo "=== All Lambda packages created in: $OUTPUT_DIR ==="
echo ""
ls -la "$OUTPUT_DIR"
