# Environment variables

## API (`apps/api`)

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | MongoDB connection string |
| `APP_URL` | Yes | Web origin, used in email links |
| `API_URL` | Yes | Public API base URL |
| `CORS_ORIGIN` | Yes | Comma-separated allowed origins |
| `JWT_ACCESS_SECRET` | Yes | Min 32 chars |
| `JWT_REFRESH_SECRET` | Yes | Min 32 chars |
| `EMAIL_FROM` | Yes | From address |
| `EMAIL_PROVIDER` | No | `auto` \| `resend` \| `nodemailer` |
| `RESEND_API_KEY` | For Resend | |
| `SMTP_*` | For Nodemailer fallback | host/port/user/pass/secure |
| `SUPER_ADMIN_EMAIL` | Optional | Seed bootstrap admin |
| `SUPER_ADMIN_PASSWORD` | Optional | Seed bootstrap admin |

## Web (`apps/web`)

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Yes | Site URL |
| `NEXT_PUBLIC_API_URL` | Yes | API base including `/api/v1` |
