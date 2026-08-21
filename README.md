# Connect360 — Home Services Platform

A serverless home services marketplace connecting customers with verified service professionals.

## Architecture

- **Frontend:** React + Vite + Tailwind CSS (mock mode available for local dev)
- **Backend:** 6 Python Lambda functions with route-based multiplexing
- **Database:** DynamoDB (single-table design with GSIs)
- **Auth:** AWS Cognito (email + password, JWT)
- **Storage:** S3 (verification documents with pre-signed URLs)
- **Infra:** Terraform (flat structure, ~10 .tf files)
- **Hosting:** AWS Amplify (Next.js ready)

## Project Structure

```
connect360/
├── frontend/          # React + Vite + Tailwind (with mock mode)
│   ├── src/
│   │   ├── pages/     # Auth, Customer, Worker, Admin pages
│   │   ├── services/  # API service layer
│   │   ├── context/   # Auth context (Cognito + mock)
│   │   ├── mock/      # Mock data & API for local demo
│   │   └── components/
│   └── .env.example
├── backend/
│   ├── shared/        # DynamoDB helpers, auth, response utilities
│   └── lambdas/       # 6 Lambda handlers
│       ├── connect360-auth/
│       ├── connect360-services/
│       ├── connect360-workers/
│       ├── connect360-bookings/
│       ├── connect360-verification/
│       └── connect360-admin/
└── infra/             # Terraform (flat, no modules)
    ├── dynamodb.tf
    ├── cognito.tf
    ├── lambda.tf
    ├── api-gateway.tf
    ├── storage.tf
    ├── iam.tf
    ├── amplify.tf
    └── scripts/
        ├── seed-data.py
        └── package-lambda.sh
```

## Quick Start (Frontend - Mock Mode)

Run the full UI without deploying any AWS infrastructure:

```bash
cd frontend
npm install
npm run dev
```

Login credentials (mock mode - any password works):
| Role     | Email                  |
|----------|------------------------|
| Customer | customer1@demo.com     |
| Worker   | worker1@demo.com       |
| Admin    | admin@connect360.com   |

## Deploy to AWS

1. Package Lambda functions:
   ```bash
   bash infra/scripts/package-lambda.sh
   ```

2. Deploy infrastructure:
   ```bash
   cd infra
   terraform init
   terraform plan
   terraform apply
   ```

3. Seed demo data:
   ```bash
   python infra/scripts/seed-data.py --table-name connect360-main-dev --region ap-south-1
   ```

4. Update frontend env:
   ```bash
   cd frontend
   cp .env.example .env
   # Fill in values from terraform output
   # Set VITE_MOCK_MODE=false
   ```

## Three Roles

- **Customer:** Browse workers, view recommendations, book services, leave reviews
- **Worker:** Manage profile/skills/availability, accept/reject bookings, upload verification docs
- **Admin:** Dashboard stats, manage service categories, approve/reject worker verifications

## Key Features

- Intelligent worker recommendation engine (rule-based scoring)
- Complete booking lifecycle (pending → accepted → in_progress → completed)
- Worker verification with S3 document upload (pre-signed URLs)
- Role-based access control via Cognito JWT claims
- Responsive Tailwind UI with status badges, modals, and forms

## Tech Stack

| Layer        | Technology               |
|--------------|--------------------------|
| Frontend     | React 18, Vite, Tailwind |
| Auth         | AWS Cognito              |
| API          | API Gateway + Lambda     |
| Database     | DynamoDB                 |
| Storage      | S3                       |
| IaC          | Terraform                |
| Hosting      | AWS Amplify              |

## Team

Built for Connect360 academic project review.
