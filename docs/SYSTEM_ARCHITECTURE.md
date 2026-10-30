# System architecture

```text
Browser (Next.js)
  └── REST / cookies ──> NestJS API (/api/v1)
                            ├── Prisma ──> MongoDB
                            ├── Resend / Nodemailer
                            └── (later) R2, Paystack, BullMQ
```

## Apps

- `apps/web` — public site, employer/talent/admin portals (portals expand in later phases)
- `apps/api` — NestJS modular monolith

## Shared

- `packages/shared` — enums, Zod schemas, shared contracts

## AuthZ

JWT access cookie → `JwtAuthGuard` → `RolesGuard` / `PermissionsGuard` → resource checks (org scoping in Phase 2+)
