# Dealo API documentation

Base path: `/api/v1`  
Swagger UI: `/api/docs`  
OpenAPI JSON: `/api/openapi.json`  
Root metadata: `/`  
Health: `/health`

## Authentication

### Dashboard users (cookie JWT)
1. `POST /api/v1/auth/login` with email/password  
2. Browser stores HTTP-only `access_token` cookie  
3. Subsequent requests send credentials (`credentials: 'include'`)

### Partners (API keys)
1. A Dealo admin creates a key in **Dashboard → API keys**  
2. Copy the plaintext once (`dk_test_…` or `dk_live_…`)  
3. Call:

```http
Authorization: Bearer dk_test_xxxxxxxx
```

Keys are stored hashed (SHA-256). Revoked or inactive keys are rejected.

### Self-serve sandbox keys
Employers can create their own test keys in **Dashboard → Developer API** (`POST /api/v1/api-keys/sandbox`).

- Always `dk_test_…`, plan `SANDBOX`, 30 requests/min, max 2 active keys per user
- Scopes: `hire-inquiries:write`, `hire-inquiries:read`, `blog:read`, `health:read`
- Hire inquiries created with a test key are flagged `isTest: true` and **no confirmation email is sent**
- Live (`dk_live_`) keys are issued by Dealo admins only

### OAuth2 client credentials
For server-to-server integrations that prefer short-lived tokens, an admin can create an OAuth client on any API key (**Dashboard → API keys → OAuth**). The client inherits that key's scopes, plan, rate limit, data visibility and usage metering.

```bash
curl -s -X POST "$DEALO_API/api/v1/oauth/token" \
  -u "$CLIENT_ID:$CLIENT_SECRET" \
  -d grant_type=client_credentials \
  -d scope="hire-inquiries:read"
# => { "access_token": "eyJ…", "token_type": "Bearer", "expires_in": 3600, "scope": "hire-inquiries:read" }

curl -s "$DEALO_API/api/v1/hire-inquiries" -H "Authorization: Bearer $ACCESS_TOKEN"
```

- Client auth via HTTP Basic (preferred) or `client_id` / `client_secret` in the form/JSON body
- `scope` is optional (space-separated); it can only narrow the key's scopes
- Errors follow RFC 6749: `400 unsupported_grant_type | invalid_scope`, `401 invalid_client`
- Revoking the client or deactivating the key invalidates outstanding tokens immediately

### Data visibility
Requests made with an API key only see hire inquiries created by that key (or by the key's organization). Staff JWTs see everything.

## Scopes

| Scope | Access |
|---|---|
| `hire-inquiries:write` | Create hire inquiries (also available publicly without a key) |
| `hire-inquiries:read` | List hire inquiries |
| `candidates:read` | Reserved for partner candidate reads |
| `blog:read` | Authenticated partner blog pulls (public list still works anonymously) |
| `health:read` | Reserved for authenticated health checks |
| `jobs:read` | Dealo ATS: list a workspace's jobs |
| `applications:read` | Dealo ATS: list and read a workspace's applicants |
| `applications:write` | Dealo ATS: add applicants and move them between steps |

Routes that declare `@RequireScopes` accept **either** a staff JWT with the usual roles/permissions **or** an API key that includes those scopes.

## Quickstart (partner)

```bash
export DEALO_API=https://dealo-api.onrender.com
export DEALO_KEY=dk_test_your_key_here

# Health
curl -s "$DEALO_API/health" | jq

# Create hire inquiry
curl -s -X POST "$DEALO_API/api/v1/hire-inquiries" \
  -H "Authorization: Bearer $DEALO_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Acme Nigeria",
    "contactName": "Ada Okonkwo",
    "email": "ada@acme.example",
    "phone": "+2348012345678",
    "roleFamily": "OFFICE_PROFESSIONAL",
    "serviceType": "DIRECT_RECRUITMENT",
    "roleTitle": "Operations Lead",
    "numberOfProfessionals": 2,
    "location": "Lagos",
    "workArrangement": "HYBRID"
  }' | jq

# List inquiries (requires hire-inquiries:read)
curl -s "$DEALO_API/api/v1/hire-inquiries" \
  -H "Authorization: Bearer $DEALO_KEY" | jq
```

## Error shapes

NestJS default:

```json
{ "statusCode": 401, "message": "Authentication required", "error": "Unauthorized" }
```

Missing scopes:

```json
{ "statusCode": 403, "message": "Missing API scopes: hire-inquiries:read", "error": "Forbidden" }
```

Per-key rate limit exceeded:

```json
{ "statusCode": 429, "message": "API key rate limit exceeded (60/min). Retry in 12s.", "error": "Too Many Requests" }
```

## Webhooks

Register endpoints in **Dashboard → Developer API** (or `POST /api/v1/webhooks`). The signing secret (`whsec_…`) is shown once; rotate it with `POST /api/v1/webhooks/:id/rotate-secret`.

| Event | When |
|---|---|
| `hire_inquiry.created` | A hire inquiry is created by your API key / organization |
| `hire_inquiry.status_updated` | Dealo moves one of those inquiries to a new status (`data.previousStatus` included) |
| `ping` | You press **Send test** |

Admin endpoints marked **global** receive events for every inquiry.

Each delivery is a `POST` with JSON body:

```json
{
  "id": "evt_5c1f…",
  "type": "hire_inquiry.status_updated",
  "livemode": true,
  "createdAt": "2026-11-03T21:00:00.000Z",
  "data": {
    "hireInquiry": { "id": "…", "status": "SHORTLISTING", "companyName": "Acme", "roleTitle": "Operations Lead", "isTest": false },
    "previousStatus": "NEW"
  }
}
```

Headers: `X-Dealo-Event`, `X-Dealo-Delivery` (unique per delivery, use for idempotency), and `X-Dealo-Signature: t=<unix seconds>,v1=<hex>` where `v1 = HMAC_SHA256(secret, "<t>.<raw body>")`. Reject signatures older than 5 minutes.

```js
const [t, v1] = req.headers['x-dealo-signature'].split(',').map((p) => p.split('=')[1]);
const expected = crypto.createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex');
const ok = crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(expected));
```

Respond with any `2xx` within 10 seconds. Otherwise Dealo retries after 30s, 2m, 10m and 1h (5 attempts total). Endpoints are disabled automatically after 50 consecutive failed deliveries. In production, URLs must be `https` and publicly reachable.

## Rate limits and metering

- Every API key has a `rateLimitPerMin` (sliding 60-second window). Exceeding it returns `429`.
- Every call made with an API key is recorded (method, path, status, latency) for usage reporting and billing.
- Admins see 24h call counts per key and a usage breakdown (`GET /api/v1/api-keys/:id/usage?days=7`).

## Phase 1 endpoint map

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Public | Service metadata |
| GET | `/health` | Public | API + DB ping |
| GET | `/api/docs` | Public | Swagger UI |
| GET | `/api/openapi.json` | Public | Raw OpenAPI |
| POST | `/api/v1/auth/register` | Public | Register employer/talent |
| POST | `/api/v1/auth/login` | Public | Login, sets cookies |
| GET | `/api/v1/auth/me` | JWT | Current user |
| POST | `/api/v1/hire-inquiries` | Public / API key | Submit hire request |
| GET | `/api/v1/hire-inquiries` | Staff JWT or `hire-inquiries:read` | List inquiries |
| GET | `/api/v1/blog` | Public / `blog:read` | Published posts |
| POST | `/api/v1/api-keys` | Admin JWT | Create API key |
| POST | `/api/v1/api-keys/sandbox` | Employer/staff JWT | Self-serve sandbox key |
| GET | `/api/v1/api-keys/mine` | Employer/staff JWT | Keys you created |
| DELETE | `/api/v1/api-keys/mine/:id` | Employer/staff JWT | Revoke your key |
| POST | `/api/v1/oauth/token` | Client credentials | OAuth2 access token (1h) |
| GET/POST | `/api/v1/api-keys/:id/oauth-clients` | Admin JWT | List / create OAuth clients |
| DELETE | `/api/v1/oauth-clients/:id` | Admin JWT | Revoke OAuth client |
| GET/POST | `/api/v1/webhooks` | Employer/staff JWT | List / register endpoints |
| PATCH/DELETE | `/api/v1/webhooks/:id` | Owner or admin | Update / delete endpoint |
| POST | `/api/v1/webhooks/:id/test` | Owner or admin | Send signed ping |
| POST | `/api/v1/webhooks/:id/rotate-secret` | Owner or admin | New signing secret |
| GET | `/api/v1/webhooks/:id/deliveries` | Owner or admin | Last 50 deliveries |
| POST | `/api/v1/webhooks/deliveries/:id/redeliver` | Owner or admin | Retry now |
| GET | `/api/v1/api-keys` | Admin JWT | List keys (masked) |
| GET | `/api/v1/api-keys/:id/usage` | Admin JWT | Usage metrics (`days` 1–90) |
| PATCH | `/api/v1/api-keys/:id` | Admin JWT | Update key |
| DELETE | `/api/v1/api-keys/:id` | Admin JWT | Revoke key |

## Dealo ATS API (workspace keys)

A workspace owner or admin creates keys in **Dashboard → Hiring (ATS) → Careers page → API and webhooks**. A workspace key carries only the three ATS scopes, sees only that workspace, acts as a recruiter, and stops working if the person who made it leaves the workspace. Up to 3 active keys per workspace.

| Method | Path | Scope | Purpose |
|---|---|---|---|
| GET | `/api/v1/ats-api/jobs` | `jobs:read` | Jobs with pipeline counts per step |
| GET | `/api/v1/ats-api/jobs/:jobId/applications?status=ACTIVE` | `applications:read` | Applicants for a job (`ACTIVE`, `HIRED`, `REJECTED`) |
| GET | `/api/v1/ats-api/applications/:id` | `applications:read` | One applicant with timeline, interviews, scorecards, offers |
| POST | `/api/v1/ats-api/jobs/:jobId/applications` | `applications:write` | Add an applicant (`name`, `email`, optional `phone`, `location`, `coverNote`, `source`) |
| POST | `/api/v1/ats-api/applications/:id/stage` | `applications:write` | Move to a step (`{ "stage": "Interview" }`); the last step marks them hired |

Workspace webhooks (same signing as above) can subscribe to `application.created`, `application.stage_changed` and `offer.accepted`. ATS events go only to that workspace's own webhooks.

Public, no-login ATS routes: `GET /api/v1/careers/:orgSlug`, `GET /api/v1/careers/:orgSlug/:jobSlug`, `POST /api/v1/careers/:orgSlug/:jobSlug/apply` (multipart, CV in the `cv` field), `GET|POST /api/v1/book/:token` (interview self-booking), `GET /api/v1/offer/:token` and `POST /api/v1/offer/:token/respond`.

## CV builder (signed-in users, cookie JWT)

PDFs are made in the browser; the API stores the CV data. Free accounts keep 1 CV; premium (`User.premiumUntil`) keeps 20 CVs and 20 cover letters and unlocks the AI routes.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/resumes/plan` | Free or premium, limits, usage, AI provider |
| GET / POST | `/api/v1/resumes` | List (with data for thumbnails) / save a CV or cover letter |
| GET / PATCH / DELETE | `/api/v1/resumes/:id` | One document (owner only) |
| POST | `/api/v1/resumes/:id/duplicate` | Copy (counts towards the limit) |
| POST | `/api/v1/resumes/:id/downloaded` | Download counter |
| POST | `/api/v1/resumes/:id/share-profile` | Job seekers: copy CV details into their Dealo profile |
| POST | `/api/v1/resumes/ai/bullets`, `ai/summary`, `ai/tailor`, `ai/cover-letter` | Premium AI writing (Gemini or built-in rules; contact details are never sent) |
| POST | `/api/v1/resumes/admin/premium` | Admins: add days of premium (`days: 0` removes it) |

## Plans and billing (Paystack)

| Plan | Default price / 30 days | Rate limit | Monthly quota per key | Live keys |
|---|---|---|---|---|
| Sandbox | Free | 30/min | 1,000 | 0 (test only) |
| Partner | ₦50,000 | 120/min | 50,000 | 3 |
| Enterprise | ₦250,000 | 600/min | 500,000 | 10 |

Defaults are seeded once; admins edit prices and limits in **Dashboard → API keys → API plans & revenue** (`PATCH /api/v1/billing/api-plans/:plan`). Amounts are stored as integer minor units (kobo).

Flow:
1. Employer clicks **Upgrade with Paystack** in Dashboard → Developer API (`POST /api/v1/billing/api/checkout`) and pays on Paystack.
2. Paystack redirects back; the dashboard calls `POST /api/v1/billing/api/verify`. Paystack also calls `POST /api/v1/billing/paystack/webhook` (HMAC-SHA512 signed). Both paths re-verify the transaction with Paystack, check amount and currency, and are idempotent per reference.
3. The plan activates for `periodDays`; paying again while active extends the period. The user can then create `dk_live_` keys (`POST /api/v1/api-keys/live`) up to the plan's limit.
4. When a period lapses, live keys fall back to Sandbox limits until the next payment.

Monthly quota exhaustion returns `429` with a "Monthly quota … is used up" message.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/billing/api-plans` | Public | Plan catalogue |
| GET | `/api/v1/billing/api/me` | Employer/staff JWT | Your plan, usage, invoices |
| POST | `/api/v1/billing/api/checkout` | Employer/staff JWT | Start Paystack checkout |
| POST | `/api/v1/billing/api/verify` | Employer/staff JWT | Confirm after redirect |
| POST | `/api/v1/api-keys/live` | Paid plan | Self-serve live key |
| GET | `/api/v1/billing/api/admin` | Admin/finance JWT | Revenue, subscriptions, invoices |
| PATCH | `/api/v1/billing/api-plans/:plan` | Admin JWT (`pricing.manage`) | Edit plan |

## Commercial notes

- API access is sold with support (sandbox → partner → enterprise plans).
- Do not expose admin mail, audit, or support queues via API keys.
