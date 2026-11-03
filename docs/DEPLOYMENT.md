# Deployment

Dealo is a **monorepo with two apps**:

| App | Package | What it is | Typical host |
|-----|---------|------------|--------------|
| Web | `@dealo/web` | Next.js frontend | [Vercel](https://vercel.com) |
| API | `@dealo/api` | NestJS backend | [Railway](https://railway.app), [Render](https://render.com), or a VPS |
| Shared | `@dealo/shared` | Zod schemas / enums used by both | Built with either app |

They are **not** one deploy. Next.js goes to a frontend host; NestJS goes to a Node host.

## Prerequisites

- MongoDB Atlas
- Node 20+
- Resend and/or SMTP credentials
- Env vars from `docs/ENVIRONMENT_VARIABLES.md`

---

## 1) Frontend on Vercel (Next.js)

### Project settings (important)

Use the **repo root** as the Vercel project root (do **not** set Root Directory to `apps/web` unless you also override install/build as below).

This repo includes a root `vercel.json` that:

1. Installs the whole pnpm workspace
2. Builds `@dealo/shared`
3. Builds `@dealo/web`

### Environment variables (Vercel → Settings → Environment Variables)

- `NEXT_PUBLIC_APP_URL` — your Vercel URL, e.g. `https://your-app.vercel.app`
- `NEXT_PUBLIC_API_URL` — your Nest API public URL, e.g. `https://api.yourdomain.com`

### If you already set Root Directory to `apps/web`

Change settings to:

- **Install Command:** `cd ../.. && pnpm install`
- **Build Command:** `cd ../.. && pnpm --filter @dealo/shared build && pnpm --filter @dealo/web build`
- **Output:** leave Next.js default

### Why the previous build failed

```
Module not found: Can't resolve '@dealo/shared'
```

Vercel installed the workspace link, but `@dealo/shared` publishes compiled files under `dist/`. If that package is not built before `next build`, webpack cannot resolve it. The build command now builds shared first.

---

## 2) Backend on Railway / Render (NestJS)

Create a **separate** service from the same GitHub repo.

### Build / start (Render)

- **Root directory:** leave blank (repo root)
- **Build Command:**

```bash
npm install -g pnpm@12.16.1 && pnpm install --frozen-lockfile && pnpm --filter @dealo/shared build && pnpm --filter @dealo/api prisma:generate && pnpm --filter @dealo/api build
```

- **Start Command:** `node apps/api/dist/main.js`
- **Node version:** set env `NODE_VERSION=20` (do not use `corepack enable` on Render — it fails on a read-only filesystem)

### Environment variables (API)

Copy from `apps/api/.env.example` — never commit real `.env` files.

Typical keys: `DATABASE_URL`, `JWT_*`, `COOKIE_*`, `CORS_ORIGIN` (your Vercel URL), Google OAuth, email providers.

After deploy, point Vercel `NEXT_PUBLIC_API_URL` at this API URL, and set API `CORS_ORIGIN` / cookie domain to match the web URL.

### Database

```bash
pnpm --filter @dealo/api prisma:generate
pnpm --filter @dealo/api prisma:push
pnpm --filter @dealo/api seed
```

Run these against production Mongo once (CI job or one-off shell on the host).

---

## Local production check

```bash
pnpm --filter @dealo/shared build
pnpm --filter @dealo/api build
pnpm --filter @dealo/web build
```

---

## Quick mental model

```
Browser  →  Vercel (Next.js @dealo/web)
                ↓  NEXT_PUBLIC_API_URL
            Railway/Render (NestJS @dealo/api)
                ↓
            MongoDB Atlas
```

Domain/DNS, HTTPS, backups, and monitoring are required before a real production launch.
