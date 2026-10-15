# Connect360 — Razorpay Payments Setup & Verification (TEST MODE ONLY)

This runbook covers configuring and verifying the Razorpay test-mode payment
integration. **Test mode only — never use live keys or real cards.**

The integration runs on Connect360's existing stack: payment logic lives inside
the bookings Lambda (`payments_handler.py` + `razorpay_provider.py`), backed by
the DynamoDB single table, exposed via API Gateway + Cognito.

---

## 1. Live resource references (dev)

| Thing | Value |
|-------|-------|
| API base URL | `https://uo1qb039gh.execute-api.ap-south-1.amazonaws.com/dev` |
| Webhook URL | `https://uo1qb039gh.execute-api.ap-south-1.amazonaws.com/dev/api/payments/webhook` |
| Frontend (CloudFront) | `https://d16bfx0x2gpl4u.cloudfront.net` |
| Secret (Secrets Manager) | `connect360/razorpay` (ap-south-1) |
| Region | `ap-south-1` |

> The API uses a `dev` stage, so all paths are `/dev/api/...`. The frontend
> axios client appends `/api`, so `VITE_API_URL` must end with `/dev`.

---

## 2. Credentials (never commit these)

Secrets live only in AWS Secrets Manager as JSON:

```json
{ "key_id": "rzp_test_xxx", "key_secret": "xxx", "webhook_secret": "xxx" }
```

Get **test** keys from the Razorpay Dashboard → toggle **Test Mode** →
Account & Settings → API Keys → Generate Test Key. The `webhook_secret` is set
by you when creating the webhook (step 3).

Create / update the secret:

```powershell
# first time
aws secretsmanager create-secret --name connect360/razorpay `
  --secret-string '{\"key_id\":\"rzp_test_...\",\"key_secret\":\"...\",\"webhook_secret\":\"...\"}' `
  --region ap-south-1

# update later (e.g. after adding the webhook secret, or rotating keys)
aws secretsmanager put-secret-value --secret-id connect360/razorpay `
  --secret-string '{\"key_id\":\"rzp_test_...\",\"key_secret\":\"...\",\"webhook_secret\":\"...\"}' `
  --region ap-south-1
```

> After updating the secret, the new value takes effect on the next Lambda cold
> start (credentials are cached per warm container). Force it by redeploying the
> bookings Lambda or waiting a few minutes.

**Safety:** The code refuses to run unless `RAZORPAY_MODE=test` and the key_id
starts with `rzp_test_`. Live keys are rejected by design.

---

## 3. Create the Razorpay webhook

Razorpay Dashboard (Test Mode) → Settings → Webhooks → **Add New Webhook**:

- **Webhook URL:** `https://uo1qb039gh.execute-api.ap-south-1.amazonaws.com/dev/api/payments/webhook`
- **Secret:** choose a strong value and copy it
- **Active events:**
  - `payment.authorized`
  - `payment.captured`
  - `payment.failed`
  - `refund.created`
  - `refund.processed`

Then store that secret in AWS (the `webhook_secret` field) using the
`put-secret-value` command in step 2. Until this is set, the webhook endpoint
returns `400 Invalid webhook signature` for all deliveries (by design).

---

## 4. Deploy (already done for dev, repeat as needed)

```powershell
# backend / infra
python infra/scripts/package_lambda.py
terraform -chdir=infra init
terraform -chdir=infra plan -out=tfplan
terraform -chdir=infra apply tfplan

# frontend
#   frontend/.env must contain:
#     VITE_MOCK_MODE=false
#     VITE_API_URL=https://uo1qb039gh.execute-api.ap-south-1.amazonaws.com/dev
#     VITE_COGNITO_USER_POOL=ap-south-1_TDAcl7aIP
#     VITE_COGNITO_CLIENT_ID=3qa25nkgvqrb1h37996idq7ml2
#     VITE_AWS_REGION=ap-south-1
cd frontend
npm run build
aws s3 sync dist s3://connect360-frontend-11bf985b --delete --region ap-south-1
aws cloudfront create-invalidation --distribution-id E22T4LZFPADERF --paths "/*"
```

---

## 5. Smoke tests (no browser; use PowerShell)

> Windows note: use `Invoke-WebRequest`. `curl.exe` may fail locally with
> `CRYPT_E_NO_REVOCATION_CHECK` (a corporate TLS/proxy issue, not an API issue).
> You cannot test POST routes by pasting the URL in a browser — a browser sends
> GET, which these routes don't define.

**Webhook rejects unsigned requests (expect HTTP 400):**
```powershell
try {
  $r = Invoke-WebRequest -Uri "https://uo1qb039gh.execute-api.ap-south-1.amazonaws.com/dev/api/payments/webhook" -Method POST -ContentType "application/json" -Body "{}"
  "HTTP $($r.StatusCode)"; $r.Content
} catch { "HTTP $($_.Exception.Response.StatusCode.value__)"; $_.ErrorDetails.Message }
# Expect: HTTP 400  {"error": "Invalid webhook signature"}
```

**Authenticated route blocks anonymous calls (expect HTTP 401):**
```powershell
try {
  $r = Invoke-WebRequest -Uri "https://uo1qb039gh.execute-api.ap-south-1.amazonaws.com/dev/api/payments/create-order" -Method POST -ContentType "application/json" -Body "{`"booking_id`":`"x`"}"
  "HTTP $($r.StatusCode)"; $r.Content
} catch { "HTTP $($_.Exception.Response.StatusCode.value__)"; $_.ErrorDetails.Message }
# Expect: HTTP 401  {"message":"Unauthorized"}
```

---

## 6. End-to-end test payment

Prerequisite: a booking owned by your customer account in status
`accepted` / `in_progress` / `completed` with a non-zero amount. (Payment is
blocked on `pending`/`matching` by design — have a worker accept it first.)

1. Open `https://d16bfx0x2gpl4u.cloudfront.net`, log in as the customer.
2. Go to **My Bookings** → the eligible booking shows a **Pay Now** button.
3. Click it → Razorpay Checkout opens with the test order.
4. Pay with a Razorpay **test card**:
   - Card: `4111 1111 1111 1111`
   - Expiry: any future date (e.g. `12/26`)
   - CVV: any 3 digits
   - Name/OTP: any
5. After the backend verifies the signature + confirms capture, the booking
   shows **Paid**.
6. Admin → **Payments** (`/admin/payments`) shows the record with the Razorpay
   order id, amount, and `SUCCESSFUL` status.

### Scenarios worth exercising
| Scenario | Expected |
|----------|----------|
| Successful payment | Status `SUCCESSFUL`, booking status unchanged |
| Cancel Checkout | "Payment cancelled. You can retry anytime." |
| Failed payment (test failure card) | Status `FAILED`, Retry Payment available |
| Retry after failure | New order/attempt, no duplicate charge |
| Duplicate verify call | Idempotent — returns existing status |
| Pay another customer's booking | 403 Forbidden |
| Tamper amount in request body | Ignored — backend uses booking amount |
| Confirmed payment | Booking is NOT auto-completed |

---

## 7. Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| `{"message":"Forbidden"}` | Missing `/dev` stage in the URL, or wrong HTTP method (e.g. GET in a browser). |
| `{"message":"Unauthorized"}` | No/invalid Cognito token on an authed route (expected for anonymous). |
| `503 Payments are not configured` | `RAZORPAY_MODE` not `test` or secret name unset / unreadable. |
| Webhook always `400 Invalid webhook signature` | `webhook_secret` empty or mismatched with the Dashboard value. |
| `curl.exe` TLS error | Local revocation-check issue; use `Invoke-WebRequest` or `curl.exe --ssl-no-revoke`. |

---

## 8. Key rotation

Test keys shared anywhere (chat, screenshots, tickets) should be rotated:
Razorpay Dashboard (Test Mode) → API Keys → Regenerate, then re-run
`put-secret-value` (step 2) with the new `key_id`/`key_secret`.

---

## 9. What is NOT enabled

- **Live mode is disabled by design.** `razorpay_mode` has a Terraform
  validation forcing `"test"`, and the provider rejects any non-`rzp_test_` key.
- Booking completion remains independent of payment success.
- No raw card data is ever stored; only Razorpay order/payment references.
