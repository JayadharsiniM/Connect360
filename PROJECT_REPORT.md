# Connect360 — Project Report

A serverless home-services marketplace connecting customers with verified service professionals. Built on AWS, fully within the Free Tier, and deployed live.

---

## Overview

Connect360 lets customers find and book verified workers (plumbers, electricians, cleaners, etc.), workers manage their profiles and jobs, and admins oversee the platform. It also includes a role-aware AI assistant.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS |
| Design | Manrope + Hanken Grotesk fonts, Material Symbols icons |
| Backend | Python 3.11 (AWS Lambda) |
| Auth | AWS Cognito (email + password, JWT) |
| Database | Amazon DynamoDB (single-table design) |
| Storage | Amazon S3 |
| AI | Amazon Bedrock (Nova Micro) |
| Hosting | S3 + CloudFront (HTTPS) |
| IaC | Terraform (remote state in S3) |
| Source | GitHub |

---

## AWS Services Deployed

| Service | Purpose |
|---------|---------|
| Lambda | 7 functions (auth, services, workers, bookings, verification, admin, assistant) |
| API Gateway | REST API with Cognito authorizer |
| Cognito | User authentication + roles (customer/worker/admin) |
| DynamoDB | 2 tables (main + activity) with GSIs |
| S3 | Frontend hosting + verification documents + Terraform state |
| CloudFront | HTTPS CDN for the frontend |
| Bedrock | AI assistant (Nova Micro model) |
| IAM | Scoped Lambda execution roles |
| CloudWatch | Lambda logs (7-day retention) |

---

## Core Features

### 1. Authentication & Roles
- Registration with email verification via AWS Cognito
- Secure login with JWT tokens
- Three roles with separate experiences: **customer**, **worker**, **admin**
- A Cognito post-confirmation trigger auto-creates the user's profile in DynamoDB
- Role-based protected routes on the frontend and role checks on every API

### 2. Customer Experience
- **Browse & search** verified workers, filter by service category
- **Recommendations** — a rule-based engine scores workers by rating, experience, review count, and availability
- **Worker profiles** — view skills, services, hourly rate, availability, and reviews
- **Booking** — pick a service, date, time, address, and notes; see a live cost estimate
- **My bookings** — track every booking through its lifecycle and status
- **Reviews** — rate and review a worker after a completed booking
- **Profile management** — update name, phone, address, city

### 3. Worker Experience
- **Dashboard** with stats: active jobs, completed jobs, rating, pending requests
- **Profile management** — bio, experience, hourly rate, skills, and services offered
- **Availability** — set a weekly schedule with time slots
- **Booking management** — accept/reject requests, mark jobs in-progress and completed
- **Verification** — upload ID/address/certification documents to S3 via secure pre-signed URLs

### 4. Admin Experience
- **Dashboard** — platform metrics: user counts, revenue, bookings by status, pending verifications
- **Service management** — full CRUD for service categories
- **Verification review** — approve or reject worker documents; approval marks the worker verified
- **User management** — list users and update role/status; revenue analytics

### 5. Booking Lifecycle
```
pending → accepted → in_progress → completed
        ↘ rejected / cancelled
```
- Each booking stores linked references for the customer and worker
- Status transitions are enforced server-side

### 6. Verification System
- Worker requests a pre-signed S3 upload URL and uploads documents privately
- Metadata is stored in DynamoDB with a pending status
- Admin reviews via pre-signed download URLs and approves/rejects
- Worker becomes visible to customers once verified

### 7. Role-Aware AI Assistant
- Powered by **Amazon Bedrock (Nova Micro)** with a rule-based fallback
- Understands natural language for troubleshooting, booking help, service info, and escalation
- **Role-aware** — customers and workers get different capabilities
- **Context-aware** — can use booking details, but only after backend authorization
- All authorization is enforced on the backend; the AI never grants access
- Never reveals phone numbers or personal contact details

---

## Architecture

```
React (CloudFront HTTPS)
      ↓
API Gateway (REST) → Cognito Authorizer
      ↓
7 Lambda functions (Python)
      ↓
DynamoDB · S3 · Bedrock
```

- Fully serverless — no VPC, no servers, no NAT Gateway
- Single-table DynamoDB design with 2 GSIs for all access patterns
- Terraform-managed with encrypted remote state in S3

---

## Security

- Cognito JWT authorization on all API routes
- All access control enforced server-side (never in the AI or frontend)
- S3 verification documents are private (accessed only via pre-signed URLs)
- Least-privilege IAM roles; secrets via config, never hardcoded or committed
- Terraform state encrypted in S3

---

## Cost

Runs at **₹0** on the AWS Free Plan:
- Lambda, DynamoDB, Cognito — always-free tier
- API Gateway, S3, CloudFront — usage far below free-tier limits
- Bedrock — covered by free credits

---

## Live URLs

| Component | URL |
|-----------|-----|
| Frontend (HTTPS) | https://d16bfx0x2gpl4u.cloudfront.net |
| Backend API | https://uo1qb039gh.execute-api.ap-south-1.amazonaws.com/dev |

**Region:** ap-south-1 (Mumbai) · Bedrock in us-east-1

---

## Demo Logins

| Role | Email | Password |
|------|-------|----------|
| Customer | democustomer@connect360.com | Demo@1234 |
| Worker | demoworker@connect360.com | Demo@1234 |
| Admin | demoadmin@connect360.com | Demo@1234 |
