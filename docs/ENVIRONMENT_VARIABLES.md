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
| `CLOUDINARY_*` | For uploads | Talent documents and blog cover images |
| `GEMINI_API_KEY` | Optional | Turns on Gemini for the AI agents. Without it they use built-in rules; blog drafting needs it |
| `GEMINI_MODEL` | Optional | Defaults to `gemini-2.5-flash` |
| `PAYSTACK_SECRET_KEY` | For paid API plans | Enables checkout; also verifies webhook signatures. Set webhook URL in Paystack to `<API_URL>/api/v1/billing/paystack/webhook` |
| `PAYSTACK_PUBLIC_KEY` | Optional | Reserved for inline checkout |

## Web (`apps/web`)

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Yes | Site URL |
| `NEXT_PUBLIC_API_URL` | Yes | API base including `/api/v1` |
