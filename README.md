# Connect360 — Home Services Platform

A serverless home services marketplace connecting customers with verified service professionals. Built with a corporate-modern design system featuring Manrope + Hanken Grotesk typography, Material Symbols icons, and a refined indigo/slate color palette.

## Live URLs

| Component | URL |
|-----------|-----|
| Frontend (HTTPS) | https://d16bfx0x2gpl4u.cloudfront.net |
| Frontend (S3) | http://connect360-frontend-11bf985b.s3-website.ap-south-1.amazonaws.com |
| Backend API | https://uo1qb039gh.execute-api.ap-south-1.amazonaws.com/dev |

## Architecture

```
Frontend (React + Vite + Tailwind)
  → CloudFront (HTTPS) + S3 Static Website Hosting
  → API Gateway REST API
  → Cognito User Pool Authorizer
  → 7 Lambda Functions (Python 3.11)
  → DynamoDB (Single-Table Design)
  → S3 (Verification Documents)
  → Google Gemini API (AI Assistant, via Secrets Manager)
```

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, Tailwind CSS 3.4 |
| Design | Manrope, Hanken Grotesk, Material Symbols |
| Auth | AWS Cognito (email + password, JWT) |
| API | API Gateway REST + Lambda |
| Database | DynamoDB (single-table, 2 GSIs) |
| Storage | S3 (pre-signed URLs) |
| AI | Google Gemini API (gemini-3.6-flash) with rule-based fallback |
| Maps | Leaflet.js + OSRM (real road routing) + Nominatim geocoding |
| IaC | Terraform (remote state in S3) |
| Hosting | S3 + CloudFront (HTTPS) |

## Project Structure

```
connect360/
├── frontend/                    # React + Vite + Tailwind
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.jsx      # Public landing page
│   │   │   ├── auth/            # Login, Register, VerifyEmail
│   │   │   ├── customer/        # Dashboard, BrowseWorkers, WorkerDetail, BookingForm, MyBookings, Profile
│   │   │   │                    #   + BookingChoice, PriorityBookingForm, PriorityBookings (Priority Booking)
│   │   │   ├── worker/          # Dashboard, Profile, Availability, Bookings, Verification, PriorityRequests
│   │   │   └── admin/           # Dashboard, ManageServices, VerificationReview, RevenueOverview,
│   │   │                        #   UserManagement, VerificationQueue
│   │   ├── components/          # Navbar, BottomNav, ProtectedRoute, StatusBadge, Loading,
│   │   │                        #   CallButton, AIAssistant, PriorityStatus, LiveTrackingMap, DashboardLayout
│   │   ├── services/            # API service layer (axios), incl. priorityService, assistantService,
│   │   │                        #   routingService (road routing + geocoding)
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
│   │   ├── response.py          # Standardized HTTP responses
│   │   ├── matching_service.py  # Dual-weight matching engine (Normal + Priority Booking)
│   │   ├── ai_provider.py       # Multi-provider AI adapter (Gemini + Bedrock)
│   │   ├── assistant_knowledge.py # Structured JSON prompts + rule-based fallback
│   │   └── calling_provider.py  # Twilio masked-calling adapter
│   └── lambdas/                 # 7 domain Lambda handlers
│       ├── connect360-auth/     # POST-confirmation + GET /api/auth/me
│       ├── connect360-services/ # CRUD /api/services
│       ├── connect360-workers/  # Worker profiles, availability, recommendations
│       ├── connect360-bookings/ # Booking lifecycle + reviews + Priority Booking (priority_handler.py) + masked calling
│       ├── connect360-verification/ # Document upload + admin review
│       ├── connect360-admin/    # Dashboard stats + revenue + user management
│       └── connect360-assistant/ # Role-aware AI assistant (Gemini / Bedrock)
└── infra/                       # Terraform (flat, no modules)
    ├── main.tf
    ├── variables.tf / outputs.tf / terraform.tfvars
    ├── cognito.tf               # User Pool + Post-confirmation trigger
    ├── dynamodb.tf              # 2 tables, 2 GSIs, PAY_PER_REQUEST
    ├── lambda.tf                # 7 Lambdas + CloudWatch log groups (7-day retention)
    ├── api-gateway.tf           # REST API + Cognito Authorizer + all routes
    ├── iam.tf                   # Lambda role + scoped policies (Gemini/Bedrock conditional)
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

Mock mode is enabled by default (`VITE_MOCK_MODE=true` in `.env`). Login with any password:

| Role | Email |
|------|-------|
| Customer | customer1@demo.com |
| Worker | worker1@demo.com |
| Admin | admin@connect360.com |

> To use the live AWS backend, set `VITE_MOCK_MODE=false` in `frontend/.env` and use a real Cognito account (e.g. `democustomer@connect360.com` / `Test1234!`).

## Deploy to AWS

1. Configure AWS CLI:
   ```bash
   aws configure
   # Region: ap-south-1
   ```

2. Package Lambda functions:
   ```bash
   # Cross-platform (recommended, works on Windows/PowerShell too):
   python infra/scripts/package_lambda.py
   # or on macOS/Linux:
   bash infra/scripts/package-lambda.sh
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
   aws s3 sync dist s3://connect360-frontend-XXXXXXXX --delete --region ap-south-1
   # Invalidate the CloudFront cache so users get the new build:
   aws cloudfront create-invalidation --distribution-id E22T4LZFPADERF --paths "/*"
   ```

## Three User Roles

### Customer
- Browse verified workers with service filtering
- View worker profiles with ratings, skills, and availability
- **Two ways to book:**
  - **Manual Booking** — choose the worker and time slot yourself
  - **⚡ Priority Booking** — describe what you need and the platform automatically matches the best available worker
- Track booking lifecycle (pending → accepted → in_progress → completed)
- Leave reviews after completed bookings
- Intelligent worker recommendations (Normal Booking weighted scoring engine)
- Role-aware AI assistant for help and troubleshooting
- Live tracking map with real road routing (Leaflet + OSRM)

### Worker
- Manage profile (bio, skills, services, hourly rate)
- Set weekly availability schedule
- Accept/reject booking requests
- **⚡ Priority Requests** — accept or decline auto-matched jobs with match score and estimated earnings
- Update booking status (start work → mark complete)
- Upload verification documents (ID proof, address proof, certifications)
- Track ratings and reviews

### Admin
- Platform dashboard with key metrics (users, revenue, bookings, verifications)
- Revenue Overview — monthly trend chart, category breakdown, recent transactions
- User Management — list/search all users, change roles, suspend/reactivate accounts
- Verification Queue — pending documents with age-based priority (2+ days = High)
- Manage service categories (CRUD)
- Review and approve/reject worker verification documents

## Design System

The UI follows a **corporate-modern minimalist** aesthetic:

- **Typography:** Manrope (headings) + Hanken Grotesk (body)
- **Colors:** Deep indigo primary (#1E293B), blue secondary (#0058BE), slate surfaces
- **Icons:** Material Symbols Outlined
- **Layout:** 8px base unit, 1280px max-width, responsive (mobile-first)
- **Cards:** White surface, 1px border, subtle shadows, 16px radius
- **Elevation:** Tonal layering with ambient shadows (level-1, level-2, level-3)

---

## Recent Updates & Modifications

### 1. AI Provider — Replaced Bedrock with Google Gemini

**File:** `backend/shared/ai_provider.py`

- Provider is selected via `AI_PROVIDER` env var: `"gemini"` | `"bedrock"` | `""` (disabled)
- Gemini API key is stored in AWS Secrets Manager (`connect360/gemini-api-key`) — never in env vars or code
- In-process key cache avoids a Secrets Manager call on every request
- Gemini is called via `urllib.request` (no extra SDK) with `responseMimeType: application/json` to enforce structured output
- 3-attempt retry with 1-second backoff for transient 503 errors
- Conversation history (last 6 turns) is injected into the `contents` array
- Image input (`image_base64`) is supported via `inline_data`
- Bedrock adapter kept intact — switch back by setting `AI_PROVIDER=bedrock`
- Working model: `gemini-3.6-flash` (configured in `infra/terraform.tfvars`)

**IAM (conditional):**
- `ai_provider == "gemini"` → `lambda_secrets` policy grants `secretsmanager:GetSecretValue` on the Gemini secret
- `ai_provider == "bedrock"` → `lambda_bedrock` policy grants `bedrock:InvokeModel`

### 2. Structured JSON Output from AI Assistant

**Files:** `backend/shared/assistant_knowledge.py`, `backend/lambdas/connect360-assistant/handler.py`

- Every AI response is a JSON envelope: `{"reply": "...", "structured": {"service_type", "is_urgent", "missing_fields", "location", "date", "time", "confirmed"}}`
- `build_system_prompt()` appends `_STRUCTURED_INSTRUCTION` (mandatory JSON format) and `_MULTILINGUAL_INSTRUCTION` (reply in user's language)
- Handler parses `structured` from the AI response:
  - `confirmed=true + is_urgent=true` → appends Priority Booking suggestion, sets `suggest_priority: true`
  - `confirmed=true + not urgent` → calls `_fetch_recommended_workers()` and returns matching workers
- Outgoing answers are defensively redacted (`_strip_contact_details`) — phone numbers and emails replaced with `[hidden]`
- Rule-based fallback unchanged for when AI is disabled or errors

### 3. Dual Scoring Weights — Normal vs Priority Booking

**File:** `backend/shared/matching_service.py`

Two separate weight sets replace the single `MATCHING_WEIGHTS` config:

**Normal Booking** (`NORMAL_BOOKING_WEIGHTS`) — scheduled, customer picks date/time:

| Signal | Weight |
|--------|--------|
| Service match | 30% |
| Trust (rating + verified bonus) | 25% |
| Experience | 15% |
| Availability | 15% |
| Reliability (completion ratio) | 10% |
| Distance | 5% |

**Priority Booking** (`PRIORITY_BOOKING_WEIGHTS`) — urgent/immediate:

| Signal | Weight |
|--------|--------|
| Availability | 30% |
| Distance | 25% |
| Service match | 20% |
| Trust | 15% |
| Reliability | 5% |
| Experience | 5% |

**New scoring functions:**
- `calculate_trust_score()` — normalized rating + 0.2 verification bonus; unrated verified workers score 0.7
- `calculate_reliability_score()` — `completed_bookings / total_bookings`; falls back to `rating_count / 20` as a proxy

**Call sites:**
- `connect360-workers/handler.py` → `get_recommended_workers()` uses `NORMAL_BOOKING_WEIGHTS` via `matching_service.rank_workers()`; returns `algorithm: "normal_booking_weighted_v2"`
- `connect360-bookings/priority_handler.py` → `_run_match_and_offer()` explicitly passes `weights=PRIORITY_BOOKING_WEIGHTS` to `matching_service.match()`

### 4. Live Tracking Map

**Files:** `frontend/src/components/LiveTrackingMap.jsx`, `frontend/src/services/routingService.js`

- Leaflet.js map with CartoDB Voyager tiles (no API key required)
- Custom HTML markers: animated ping for customer location, van icon with LIVE badge and heading rotation for worker
- Real road routing via **OSRM** (Open Source Routing Machine, free, no key) with fallback to **Google Maps Routes API** if `VITE_GOOGLE_MAPS_API_KEY` is set
- Address geocoding via **Nominatim** (OpenStreetMap) with city-centroid fallback
- Route recalculated when worker moves > 15 metres; in-memory cache keyed to 4 decimal places (~10 m)
- Floating HUD shows real road distance (km) and driving ETA (minutes)
- Recenter button fits both markers in view
- `haversineDistance` utility exported for distance scoring

### 5. Admin Panel Expansion

**New pages:**

- `frontend/src/pages/admin/RevenueOverview.jsx` — total revenue, completed bookings, avg ticket, monthly SVG trend chart (no Chart.js dependency), revenue by category with progress bars, recent transactions table
- `frontend/src/pages/admin/UserManagement.jsx` — paginated user table with role tabs (All / Customer / Worker / Admin), search by name/email, inline role change dropdown, suspend/reactivate toggle
- `frontend/src/pages/admin/VerificationQueue.jsx` — pending verification documents with document-type filter, age-based priority badge (High = 2+ days), link to Review Console

### 6. Priority Booking Form — Uber/Ola Style UI

**File:** `frontend/src/pages/customer/PriorityBookingForm.jsx`

- Two-column layout: booking sheet (left) + stylized SVG map (right)
- Mode toggle: **Priority Auto-Match** (express surcharge) vs **Standard Schedule** (redirects to Browse Workers)
- Inline address and notes editing
- Payment method selector (Visa / UPI / Cash) via modal
- Promo code input (`CONNECT15` / `PRIORITY` → $15 discount)
- Live price breakdown (base + express surcharge − promo)
- Animated worker markers on the map showing ETA and ratings

---

## Priority Booking (Automatic Matching)

Priority Booking is a second booking type that sits alongside Manual Booking and shares the same core booking entity (`booking_type = "manual" | "priority"`). Instead of picking a worker, the customer submits their requirements and a server-side engine finds and offers the job to the best available worker.

**Lifecycle:** `matching → worker_pending → accepted`, with automatic **rematching** on worker rejection, unavailability, or offer timeout, and a `no_worker_available` outcome when the candidate pool is exhausted.

**Reliability & safety:**
- Worker acceptance uses an atomic DynamoDB transaction (conditional status update + unique worker+slot lock) to prevent double-booking
- Availability is always re-checked server-side before confirmation
- Only the currently offered worker can accept/reject; only the owning customer can cancel — enforced from Cognito claims
- Worker offers expose only privacy-safe fields (name, coarse area, service, time, estimated earnings, match score)

> Offer timeouts are evaluated lazily (on customer poll / rematch) to stay within the free tier. An EventBridge-scheduled sweeper is the clean upgrade path.

---

## Key Features

- **Priority Booking** with a configurable server-side matching engine + auto-rematching
- **Dual scoring weights** — Normal Booking optimises for skill/trust; Priority Booking optimises for availability/proximity
- **Google Gemini AI assistant** with structured JSON output, multilingual support, conversation history, and image input
- **Live tracking map** (Leaflet + OSRM real road routing, no paid API required)
- **Admin Revenue Overview** with inline SVG trend chart
- **Admin User Management** with role change and suspend/reactivate
- **Admin Verification Queue** with age-based priority
- Intelligent worker recommendation engine (Normal Booking weighted scoring)
- Complete booking lifecycle with status transitions
- In-app masked calling between customer and worker (numbers stay private)
- Worker verification with S3 document upload (pre-signed URLs)
- Role-based access control via Cognito JWT claims
- Mobile-first responsive design with bottom navigation; respects reduced-motion
- DynamoDB single-table design with 2 GSIs for all access patterns
- HTTPS via CloudFront; Terraform remote state in S3
- No VPC, no NAT Gateway — pure serverless, free-tier optimized

---

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
| Secrets Manager | 10,000 API calls/month | < 500 |

**Estimated monthly cost: ₹0**

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, Tailwind CSS 3.4 |
| Fonts | Manrope, Hanken Grotesk |
| Icons | Material Symbols Outlined |
| Maps | Leaflet.js, OSRM, Nominatim |
| HTTP | Axios |
| Auth | AWS Cognito + AWS Amplify SDK |
| API | API Gateway (REST) + Lambda (Python 3.11) |
| Database | DynamoDB (On-Demand, Single-Table) |
| Storage | S3 (Private, AES256 encrypted) |
| AI | Google Gemini API (gemini-3.6-flash) via Secrets Manager |
| IaC | Terraform (remote state in S3) |
| Hosting / CD | S3 + CloudFront (HTTPS), `aws s3 sync` |

---

## Team

Built by Connect360 team for academic project review.
