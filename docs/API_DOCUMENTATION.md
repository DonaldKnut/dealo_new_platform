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
| GET | `/api/v1/api-keys` | Admin JWT | List keys (masked) |
| GET | `/api/v1/api-keys/:id/usage` | Admin JWT | Usage metrics (`days` 1–90) |
| PATCH | `/api/v1/api-keys/:id` | Admin JWT | Update key |
| DELETE | `/api/v1/api-keys/:id` | Admin JWT | Revoke key |

## Commercial notes

- API access is sold with support (sandbox → partner → enterprise plans on the key record).  
- Stripe metering and self-serve signup are Phase 2.  
- Do not expose admin mail, audit, or support queues via API keys.
