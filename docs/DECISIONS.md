# Architectural decisions

## ADR-001 — MongoDB instead of PostgreSQL

**Status:** Accepted (product decision)

Use MongoDB with Prisma as the primary datastore. Connection string is provided via `DATABASE_URL`.

**Implications:**
- Prefer Atlas (replica set) for multi-document transactions later.
- Keep financial operations carefully scoped when transactions are introduced.
- Schema uses Prisma MongoDB conventions (`@db.ObjectId`, relation fields).

## ADR-002 — Email: Resend primary, Nodemailer fallback

**Status:** Accepted

`EMAIL_PROVIDER=auto` tries Resend first when `RESEND_API_KEY` is present, then falls back to SMTP via Nodemailer. Explicit `resend` or `nodemailer` forces a single provider.

## ADR-003 — Public hire inquiry form

**Status:** Accepted

Potential employers can submit a hiring request at `/hire` without creating an account first. Records are stored as `HireInquiry` and visible to authorized internal roles.

## ADR-004 — Design system: white / dark turquoise

**Status:** Accepted

- Light mode: white surfaces, deep teal brand.
- Dark mode: dark turquoise-green background (`#042f2e`), teal accents.
- Site-wide theme toggle via `next-themes` (`class` strategy).

## ADR-005 — Modular NestJS monolith

**Status:** Accepted

Single NestJS API with domain modules. No microservices in MVP.

## ADR-006 — Cookie-based auth

**Status:** Accepted

HTTP-only `access_token` / `refresh_token` cookies. Passwords hashed with Argon2. Authorization enforced in NestJS guards.
