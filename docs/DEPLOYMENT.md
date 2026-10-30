# Deployment

Frontend and API deploy independently.

## Prerequisites

- MongoDB (Atlas recommended)
- Node 20+
- Resend and/or SMTP credentials
- Environment variables from `docs/ENVIRONMENT_VARIABLES.md`

## API

1. Set production env vars
2. `pnpm --filter @dealo/api prisma:generate`
3. `pnpm --filter @dealo/api prisma:push` (or controlled schema deploy process)
4. `pnpm --filter @dealo/api seed` (bootstrap roles; optional admin)
5. `pnpm --filter @dealo/api build && pnpm --filter @dealo/api start:prod`

## Web

1. Set `NEXT_PUBLIC_*` values
2. `pnpm --filter @dealo/web build && pnpm --filter @dealo/web start`

Domain/DNS, HTTPS, backups, and monitoring are required before production launch.
