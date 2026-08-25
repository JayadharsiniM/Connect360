# Connect360 — Home Services Platform

A serverless home services marketplace connecting customers with verified service professionals. Built with a corporate-modern design system featuring Manrope + Hanken Grotesk typography, Material Symbols icons, and a refined indigo/slate color palette.

## Live URLs

| Component | URL |
|-----------|-----|
| Frontend | http://connect360-frontend-11bf985b.s3-website.ap-south-1.amazonaws.com |
| Backend API | https://uo1qb039gh.execute-api.ap-south-1.amazonaws.com/dev |

## Architecture

```
Frontend (React + Vite + Tailwind)
  → AWS S3 Static Website Hosting
  → API Gateway REST API
  → Cognito User Pool Authorizer
  → 6 Lambda Functions (Python 3.11)
  → DynamoDB (Single-Table Design)
  → S3 (Verification Documents)
```

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, Tailwind CSS 3.4 |
| Design | Manrope, Hanken Grotesk, Material Symbols |
| Auth | AWS Cognito (email + password, JWT) |
| API | API Gateway REST + Lambda |
| Database | DynamoDB (single-table, 2 GSIs) |
| Storage | S3 (pre-signed URLs) |
| IaC | Terraform |
| Hosting | S3 Static Website / Vercel |

## Project Structure

```
connect360/
├── frontend/                    # React + Vite + Tailwind
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.jsx      # Public landing page
│   │   │   ├── auth/            # Login, Register, VerifyEmail
│   │   │   ├── customer/        # Dashboard, BrowseWorkers, WorkerDetail, BookingForm, MyBookings, Profile
│   │   │   ├── worker/          # Dashboard, Profile, Availability, Bookings, Verification
│   │   │   └── admin/           # Dashboard, ManageServices, VerificationReview
│   │   ├── components/          # Navbar, BottomNav, ProtectedRoute, StatusBadge, Loading
│   │   ├── services/            # API service layer (axios)
│   │   ├── context/             # AuthContext (Cognito + mock)
│   │   ├── config/              # API, Amplify, constants
│   │   └── mock/                # Mock data for local dev
│   ├── tailwind.config.js       # Full design system tokens
│   ├── index.html               # Google Fonts + Material Symbols
│   └── .env.example
├── backend/
│   ├── shared/                  # DynamoDB helpers, auth, response utilities
│   │   ├── db.py                # Single-table CRUD operations
│   │   ├── auth_helpers.py      # JWT claims extraction
│   │   └── response.py          # Standardized HTTP responses
│   └── lambdas/                 # 6 domain Lambda handlers
│       ├── connect360-auth/     # POST-confirmation + GET /api/auth/me
│       ├── connect360-services/ # CRUD /api/services
│       ├── connect360-workers/  # Worker profiles, availability, recommendations
│       ├── connect360-bookings/ # Full booking lifecycle + reviews
│       ├── connect360-verification/ # Document upload + admin review
│       └── connect360-admin/    # Dashboard stats + customer profile
└── infra/                       # Terraform (flat, no modules)
    ├── main.tf
    ├── variables.tf / outputs.tf / terraform.tfvars
    ├── cognito.tf               # User Pool + Post-confirmation trigger
    ├── dynamodb.tf              # 2 tables, 2 GSIs, PAY_PER_REQUEST
    ├── lambda.tf                # 6 Lambdas + CloudWatch log groups (7-day retention)
    ├── api-gateway.tf           # REST API + Cognito Authorizer + all routes
    ├── iam.tf                   # Lambda role + scoped policies
    ├── storage.tf               # S3 verification bucket (private, encrypted)
    ├── amplify.tf               # Conditional Amplify hosting
    ├── frontend-hosting.tf      # S3 static website hosting
    └── scripts/
        ├── seed-data.py         # DynamoDB seed data (boto3)
        └── package-lambda.sh    # Lambda packaging script
```

## Quick Start (Local Development)

```bash
cd frontend
npm install
npm run dev
```

Mock mode is enabled by default. Login with any password:

| Role | Email |
|------|-------|
| Customer | customer1@demo.com |
| Worker | worker1@demo.com |
| Admin | admin@connect360.com |

## Deploy to AWS

1. Configure AWS CLI:
   ```bash
   aws configure
   # Region: ap-south-1
   ```

2. Package Lambda functions:
   ```bash
   # PowerShell (Windows) - see infra/scripts/ or use the packaging commands
   ```

3. Deploy infrastructure:
   ```bash
   cd infra
   terraform init
   terraform plan
   terraform apply
   ```

4. Seed demo data:
   ```bash
   python infra/scripts/seed-data.py --table-name connect360-main-dev --region ap-south-1
   ```

5. Update frontend env:
   ```bash
   cd frontend
   cp .env.example .env
   # Fill in values from terraform output
   # Set VITE_MOCK_MODE=false
   ```

6. Build and deploy frontend:
   ```bash
   npm run build
   aws s3 sync dist s3://connect360-frontend-XXXXXXXX --delete
   ```

## Three User Roles

### Customer
- Browse verified workers with service filtering
- View worker profiles with ratings, skills, and availability
- Book services with date/time/address
- Track booking lifecycle (pending → accepted → in_progress → completed)
- Leave reviews after completed bookings
- Intelligent worker recommendations (rule-based scoring)

### Worker
- Manage profile (bio, skills, services, hourly rate)
- Set weekly availability schedule
- Accept/reject booking requests
- Update booking status (start work → mark complete)
- Upload verification documents (ID proof, address proof, certifications)
- Track ratings and reviews

### Admin
- Platform dashboard with key metrics (users, revenue, bookings, verifications)
- Manage service categories (CRUD)
- Review and approve/reject worker verification documents
- View top-rated workers and recent bookings

## Design System

The UI follows a **corporate-modern minimalist** aesthetic:

- **Typography:** Manrope (headings) + Hanken Grotesk (body)
- **Colors:** Deep indigo primary (#1E293B), blue secondary (#0058BE), slate surfaces
- **Icons:** Material Symbols Outlined
- **Layout:** 8px base unit, 1280px max-width, responsive (mobile-first)
- **Cards:** White surface, 1px border, subtle shadows, 16px radius
- **Elevation:** Tonal layering with ambient shadows (level-1, level-2, level-3)

## Key Features

- Intelligent worker recommendation engine (rating 40%, experience 25%, reviews 20%, availability 15%)
- Complete booking lifecycle with status transitions
- Worker verification with S3 document upload (pre-signed URLs)
- Role-based access control via Cognito JWT claims
- Mobile-first responsive design with bottom navigation
- DynamoDB single-table design with 2 GSIs for all access patterns
- No VPC, no NAT Gateway — pure serverless, free-tier optimized

## AWS Free Tier

This project is designed to run entirely within AWS Free Tier:

| Service | Free Limit | Our Usage |
|---------|-----------|-----------|
| Lambda | 1M requests/month | < 5,000 |
| API Gateway | 1M calls/month | < 5,000 |
| DynamoDB | 25 GB + 200M requests | < 1 MB |
| Cognito | 10,000 MAUs | < 100 |
| S3 | 5 GB | < 10 MB |
| CloudWatch | 5 GB logs | < 5 MB |

**Estimated monthly cost: ₹0**

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, Tailwind CSS 3.4 |
| Fonts | Manrope, Hanken Grotesk |
| Icons | Material Symbols Outlined |
| HTTP | Axios |
| Auth | AWS Cognito + AWS Amplify SDK |
| API | API Gateway (REST) + Lambda (Python 3.11) |
| Database | DynamoDB (On-Demand, Single-Table) |
| Storage | S3 (Private, AES256 encrypted) |
| IaC | Terraform |
| CI/CD | Vercel / S3 sync |

## Team

Built by Connect360 team for academic project review.
