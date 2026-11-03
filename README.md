# Dealo Platform

Dealo helps businesses **hire checked office talent and skilled trades** — in Nigeria, across Africa, and for inbound global teams.

We are not a generic job board. Employers submit a hire request; Dealo screens candidates, builds shortlists, and supports either **direct recruitment** (people join the employer’s payroll) or **managed staffing** (Dealo runs hiring with clear pricing and terms).

Focus areas:

- Office professionals (admin, ops, sales support, and similar roles)
- Skilled trades for site and contract work
- Explicitly **out of scope** for the current product: domestic staff, drivers, and “anyone available” listings

---

## What this repo is

Greenfield TypeScript monorepo for the Dealo product:

| Surface | What it does |
| --- | --- |
| Marketing site | Brand, services, how it works, employers/professionals pages, blog, SEO, WhatsApp chat |
| Hire intake | Public hire inquiry form → API → email ack → admin pipeline |
| Auth | Email/password + Google OAuth, JWT cookies, role-based access |
| Admin dashboard | Ops command center: requests, candidates/shortlists, users, blog CMS, newsletter |
| Employer dashboard | Hiring workspace: requests, shortlists, organization |
| Talent dashboard | Career console: matches (shortlist membership), documents, readiness |

This repository is **independent of the legacy Dealo app**. Do not wire it to the old database, auth, or APIs.

---

## Who uses it

| Role | Experience |
| --- | --- |
| **Admin / staff** (`SUPER_ADMIN`, `ADMIN`, `RECRUITER`, `OPERATIONS`, …) | Full ops: triage hire inquiries, screen candidates, shortlist, publish blog, send newsletter |
| **Employer** | Submit and track hire requests, review shortlists, manage company membership |
| **Talent** | Profile linked to a Candidate record, see shortlist matches, upload CV/certificates |

After login, users are routed to the dashboard that matches their role group.

---

## Product capabilities (current)

### Public
- Landing and audience pages (employers, professionals, services, how it works, developers/API surface)
- Hire request flow (office vs skilled trades, direct vs managed)
- Blog index + post pages with SEO metadata
- Sitemap, robots, Organization/Service JSON-LD
- Floating WhatsApp widget (`NEXT_PUBLIC_WHATSAPP_NUMBER`)
- Contact / newsletter subscribe endpoints

### Platform
- Role-aware dashboards with real workspace stats (`GET /dashboard/overview`)
- Hire inquiry status pipeline: `NEW → CONTACTED → QUALIFIED → CONVERTED → CLOSED`
- Candidates + shortlists tied to hire inquiries
- Talent ↔ Candidate linking (on register / Google / email match)
- Talent document upload via Cloudinary (PDF/PNG/JPG/WebP)
- First-party blog CMS and newsletter compose/send via platform email

### Intentionally thin / next
- Interview scheduling UI (stub)
- Full ATS automation, paid API billing, WhatsApp Business bot, advanced BI

---

## Monorepo layout

```
apps/web          Next.js 15 (App Router) marketing + dashboards
apps/api          NestJS REST API under /api/v1
packages/shared   Zod schemas, enums, shared types
```

**Stack**

- **Web:** Next.js, Tailwind CSS v4, Framer Motion, light/dark theme (Fraunces + Manrope)
- **API:** NestJS, Prisma, MongoDB, argon2, JWT cookies, Swagger
- **Email:** Resend primary, Nodemailer SMTP fallback (`EMAIL_PROVIDER=auto`)
- **Uploads:** Cloudinary (optional until credentials are set)
- **Package manager:** pnpm workspaces

---

## Quick start

### Requirements
- Node.js **≥ 20**
- pnpm **12+**
- MongoDB Atlas (or any MongoDB URI)

### 1. Environment

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Set at minimum in `apps/api/.env`:

- `DATABASE_URL` — MongoDB connection string  
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — long random strings (32+)  
- `APP_URL` / `CORS_ORIGIN` — `http://localhost:3000` for local  
- `EMAIL_FROM` — and Resend or SMTP if you want real mail  

Optional but recommended:

- `CLOUDINARY_*` — talent document uploads  
- `GOOGLE_CLIENT_*` — Google sign-in  
- `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` — seed admin account  

In `apps/web/.env.local`:

- `NEXT_PUBLIC_APP_URL=http://localhost:3000`  
- `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1`  
- `NEXT_PUBLIC_WHATSAPP_NUMBER=+234…`  

> The API also loads `.env.txt` if present (useful on some Windows setups). Prefer a real `.env` for secrets.

### 2. Install, schema, seed

```bash
pnpm install
pnpm --filter @dealo/shared build
pnpm --filter @dealo/api prisma:generate
pnpm --filter @dealo/api prisma:push
pnpm --filter @dealo/api seed
```

Seed creates roles/permissions and the super-admin from `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD`.

### 3. Run

```bash
pnpm dev
```

| Service | URL |
| --- | --- |
| Web | http://localhost:3000 |
| API health | http://localhost:4000/api/v1/health |
| Swagger | http://localhost:4000/api/docs |
| Hire form | http://localhost:3000/hire |
| Dashboard | http://localhost:3000/dashboard |

Useful scripts:

```bash
pnpm dev:web
pnpm dev:api
pnpm typecheck
pnpm build
```

---

## Key API areas

Prefix: **`/api/v1`**

| Area | Examples |
| --- | --- |
| Auth | `/auth/login`, `/auth/register`, `/auth/me`, `/auth/logout`, Google OAuth |
| Hire | `POST /hire-inquiries`, staff `PATCH /hire-inquiries/:id/status` |
| Dashboard | `/dashboard/overview` (role-aware), `/dashboard/requests`, `/dashboard/users` |
| Candidates | `/candidates`, `/shortlists` |
| Talent | `/talent/me`, `/talent/matches`, `/talent/documents` |
| Blog | public `/blog`, staff `/blog/admin` |
| Newsletter | `/newsletter/subscribe`, staff campaigns + send |

Auth uses **HTTP-only cookies**. The web app calls the API with `credentials: 'include'`.

---

## Production notes

**Web (e.g. Vercel)** — set:

- `NEXT_PUBLIC_APP_URL` → your live site URL  
- `NEXT_PUBLIC_API_URL` → `https://<api-host>/api/v1` (**not** localhost)  
- `NEXT_PUBLIC_WHATSAPP_NUMBER` → real WhatsApp number  

**API host** — set:

- `APP_URL` / `CORS_ORIGIN` → Vercel origin(s)  
- `COOKIE_SECURE=true` on HTTPS  
- `COOKIE_DOMAIN` if web and API share a parent domain  
- Cloudinary + email provider for uploads and mail  

`apps/web/vercel.json` builds from the monorepo root via pnpm filters.

---

## Docs

| Doc | Topic |
| --- | --- |
| [`docs/PRODUCT_REQUIREMENTS.md`](docs/PRODUCT_REQUIREMENTS.md) | Product requirements |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Architecture decisions |
| [`docs/SYSTEM_ARCHITECTURE.md`](docs/SYSTEM_ARCHITECTURE.md) | System architecture |
| [`docs/AUTHENTICATION_AND_PERMISSIONS.md`](docs/AUTHENTICATION_AND_PERMISSIONS.md) | Auth & RBAC |
| [`docs/RECRUITMENT_WORKFLOW.md`](docs/RECRUITMENT_WORKFLOW.md) | Recruitment workflow |
| [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md) | API notes |
| [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md) | Schema notes |
| [`docs/ENVIRONMENT_VARIABLES.md`](docs/ENVIRONMENT_VARIABLES.md) | Env reference |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Deployment |
| [`docs/TESTING.md`](docs/TESTING.md) | Testing |

---

## Brand promise (short)

**Dealo** = checked shortlists for office talent and skilled trades — for Nigerian employers, African staffing, and teams hiring into the region from abroad. Clear scope. Clear pipeline. Role-aware product surfaces for staff, employers, and professionals.
