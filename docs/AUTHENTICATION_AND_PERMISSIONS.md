# Authentication and permissions

## Auth

- Register / login / logout / me
- Email verification token
- Password reset (hashed single-use token)
- HTTP-only cookies: `access_token`, `refresh_token`
- Argon2 password hashing
- Login rate limiting via Nest Throttler

## Roles

`SUPER_ADMIN`, `ADMIN`, `RECRUITER`, `FINANCE`, `OPERATIONS`, `EMPLOYER`, `TALENT`

## Permissions

Permission codes live in `@dealo/shared` (`PermissionCode`). Roles are seeded in `apps/api/prisma/seed.ts`.

## Guards

- `JwtAuthGuard` (global, `@Public()` opt-out)
- `RolesGuard`
- `PermissionsGuard` (`SUPER_ADMIN` bypasses permission checks)
