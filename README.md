# Dealo 2.0 Platform

Greenfield TypeScript monorepo for Dealo — professional recruitment, managed staffing, and talent management.

## Stack

- **Web:** Next.js App Router, Tailwind CSS, light/dark theme
- **API:** NestJS REST (`/api/v1`), Swagger at `/api/docs`
- **Database:** MongoDB via Prisma
- **Email:** Resend (primary) with Nodemailer SMTP fallback
- **Packages:** pnpm workspaces (`apps/*`, `packages/*`)

## Quick start

1. Copy env files:
   - `apps/api/.env.example` → `apps/api/.env`
   - `apps/web/.env.example` → `apps/web/.env.local`
2. Paste your MongoDB connection string into `apps/api/.env` as `DATABASE_URL`.
3. Install and run:

```bash
pnpm install
pnpm --filter @dealo/shared build
pnpm --filter @dealo/api prisma:generate
pnpm --filter @dealo/api prisma:push
pnpm --filter @dealo/api seed
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:4000/api/v1/health
- Swagger: http://localhost:4000/api/docs
- Hire form: http://localhost:3000/hire

## Phase status

- **Phase 1 (in progress):** monorepo, auth foundation, MongoDB schema (identity + hire inquiries), email abstraction, public site shell + theme, hire inquiry form API.
- Phases 2–5: see `docs/PRODUCT_REQUIREMENTS.md` and `docs/DECISIONS.md`.

## Important

This repository is independent of the legacy Dealo application. Do not connect it to the old database, auth, or APIs.
