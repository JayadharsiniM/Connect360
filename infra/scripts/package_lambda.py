#!/usr/bin/env python3
"""
Connect360 - Lambda Packaging Script (cross-platform, Windows-friendly)

Mirrors package-lambda.sh but uses Python's zipfile so it works without a `zip`
binary (handy on Windows/PowerShell). Packages each Lambda's source files
(handler.py + sibling modules like priority_handler.py, excluding tests) plus the
shared modules (copied to both the zip root and a shared/ subpackage).

Run from anywhere:
    python infra/scripts/package_lambda.py
"""

import os
import zipfile

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
SHARED_DIR = os.path.join(BACKEND_DIR, "shared")
LAMBDAS_DIR = os.path.join(BACKEND_DIR, "lambdas")
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "infra", "lambda_packages")

# (lambda source dir, zip name)
LAMBDAS = [
    ("connect360-auth", "auth"),
    ("connect360-services", "services"),
    ("connect360-workers", "workers"),
    ("connect360-bookings", "bookings"),
    ("connect360-verification", "verification"),
    ("connect360-admin", "admin"),
    ("connect360-assistant", "assistant"),
]


def _is_test(name):
    return name.startswith("test_") or name.endswith("_test.py")


def _py_files(directory):
    if not os.path.isdir(directory):
        return []
    return [
        f for f in os.listdir(directory)
        if f.endswith(".py") and not _is_test(f)
    ]


def package(lambda_dir, zip_name):
    src_dir = os.path.join(LAMBDAS_DIR, lambda_dir)
    out_path = os.path.join(OUTPUT_DIR, f"{zip_name}.zip")

    with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED) as z:
        # Lambda source files (handler + siblings, no tests)
        for f in _py_files(src_dir):
            z.write(os.path.join(src_dir, f), f)

        # Shared modules at root (for `import db`, `import matching_service`, etc.)
        for f in _py_files(SHARED_DIR):
            z.write(os.path.join(SHARED_DIR, f), f)

        # Shared modules as a package too (for `from shared import ...`)
        z.writestr("shared/__init__.py", "")
        for f in _py_files(SHARED_DIR):
            z.write(os.path.join(SHARED_DIR, f), f"shared/{f}")

    print(f"  -> {out_path}")


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print("=== Connect360 Lambda Packager (python) ===")
    for lambda_dir, zip_name in LAMBDAS:
        print(f"Packaging: {lambda_dir} -> {zip_name}.zip")
        package(lambda_dir, zip_name)
    print(f"=== All packages written to: {OUTPUT_DIR} ===")


if __name__ == "__main__":
    main()
