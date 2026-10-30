# API documentation

Base path: `/api/v1`  
Swagger UI: `/api/docs`

## Phase 1 endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | Public | API + DB ping |
| POST | `/auth/register` | Public | Register employer/talent |
| POST | `/auth/login` | Public | Login, sets cookies |
| POST | `/auth/logout` | Auth | Clears cookies |
| GET | `/auth/me` | Auth | Current user |
| POST | `/auth/verify-email` | Public | Verify email token |
| POST | `/auth/forgot-password` | Public | Request reset |
| POST | `/auth/reset-password` | Public | Reset password |
| POST | `/hire-inquiries` | Public | Submit hire request |
| GET | `/hire-inquiries` | Admin roles | List inquiries |
