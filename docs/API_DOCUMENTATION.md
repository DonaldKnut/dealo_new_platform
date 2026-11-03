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

## Commercial notes

- API access is sold with support (sandbox → partner → enterprise plans on the key record).  
- Stripe metering and self-serve signup are Phase 2.  
- Do not expose admin mail, audit, or support queues via API keys.
