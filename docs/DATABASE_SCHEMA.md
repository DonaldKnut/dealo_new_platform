# Database schema (Phase 1)

Provider: **MongoDB** via Prisma.

## Implemented collections

- `User`, `Role`, `Permission`, `RolePermission`, `UserRoleAssignment`
- `RefreshToken`
- `Organization`, `OrganizationMember`
- `HireInquiry`
- `AuditLog`
- `SystemSetting`

## Notes

- IDs are Mongo ObjectIds.
- Money fields use integer minor units (kobo) + `currency`.
- Recruitment, staffing, contracts, and finance collections arrive in Phases 3–4.
