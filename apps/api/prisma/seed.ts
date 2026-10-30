import { PermissionCode, UserRole } from '@dealo/shared';
import { PrismaClient, UserRole as PrismaUserRole } from '@prisma/client';
import * as argon2 from 'argon2';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnvFile(): void {
  const envPath = resolve(__dirname, '../.env');
  if (!existsSync(envPath)) {
    return;
  }

  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const separator = trimmed.indexOf('=');
    if (separator === -1) {
      continue;
    }
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();
console.log('Seeding Dealo database...');

const prisma = new PrismaClient();

const ROLE_DEFINITIONS: Array<{
  code: PrismaUserRole;
  name: string;
  description: string;
  permissions: string[];
}> = [
  {
    code: UserRole.SUPER_ADMIN,
    name: 'Super Admin',
    description: 'Full platform control',
    permissions: Object.values(PermissionCode),
  },
  {
    code: UserRole.ADMIN,
    name: 'Admin',
    description: 'Operational administration',
    permissions: [
      PermissionCode.SYSTEM_SETTINGS_MANAGE,
      PermissionCode.USERS_MANAGE,
      PermissionCode.ORGANIZATIONS_MANAGE,
      PermissionCode.CATEGORIES_MANAGE,
      PermissionCode.PRICING_MANAGE,
      PermissionCode.RECRUITMENT_REQUEST_REVIEW,
      PermissionCode.RECRUITMENT_REQUEST_ASSIGN,
      PermissionCode.TALENT_SEARCH,
      PermissionCode.CANDIDATE_SCREEN,
      PermissionCode.CANDIDATE_VERIFY,
      PermissionCode.SHORTLIST_MANAGE,
      PermissionCode.INTERVIEW_MANAGE,
      PermissionCode.OFFER_MANAGE,
      PermissionCode.PLACEMENT_MANAGE,
      PermissionCode.CONTRACT_MANAGE,
      PermissionCode.INVOICE_MANAGE,
      PermissionCode.PAYMENT_MANAGE,
      PermissionCode.FINANCE_REPORT_VIEW,
      PermissionCode.AUDIT_VIEW,
      PermissionCode.HIRE_INQUIRY_MANAGE,
    ],
  },
  {
    code: UserRole.RECRUITER,
    name: 'Recruiter',
    description: 'Recruitment operations',
    permissions: [
      PermissionCode.RECRUITMENT_REQUEST_REVIEW,
      PermissionCode.TALENT_SEARCH,
      PermissionCode.CANDIDATE_SCREEN,
      PermissionCode.CANDIDATE_VERIFY,
      PermissionCode.SHORTLIST_MANAGE,
      PermissionCode.INTERVIEW_MANAGE,
      PermissionCode.OFFER_MANAGE,
      PermissionCode.PLACEMENT_MANAGE,
      PermissionCode.HIRE_INQUIRY_MANAGE,
    ],
  },
  {
    code: UserRole.FINANCE,
    name: 'Finance',
    description: 'Billing and payments',
    permissions: [
      PermissionCode.INVOICE_MANAGE,
      PermissionCode.PAYMENT_MANAGE,
      PermissionCode.FINANCE_REPORT_VIEW,
      PermissionCode.CONTRACT_MANAGE,
    ],
  },
  {
    code: UserRole.OPERATIONS,
    name: 'Operations',
    description: 'Client and staffing operations',
    permissions: [
      PermissionCode.RECRUITMENT_REQUEST_REVIEW,
      PermissionCode.PLACEMENT_MANAGE,
      PermissionCode.CONTRACT_MANAGE,
      PermissionCode.HIRE_INQUIRY_MANAGE,
    ],
  },
  {
    code: UserRole.EMPLOYER,
    name: 'Employer',
    description: 'Employer organization user',
    permissions: [],
  },
  {
    code: UserRole.TALENT,
    name: 'Talent',
    description: 'Professional / candidate user',
    permissions: [],
  },
];

async function main(): Promise<void> {
  console.log('Upserting permissions...');
  for (const permissionCode of Object.values(PermissionCode)) {
    await prisma.permission.upsert({
      where: { code: permissionCode },
      update: { name: permissionCode },
      create: {
        code: permissionCode,
        name: permissionCode,
        description: permissionCode,
      },
    });
  }

  console.log('Upserting roles and role permissions...');
  for (const roleDef of ROLE_DEFINITIONS) {
    const role = await prisma.role.upsert({
      where: { code: roleDef.code },
      update: {
        name: roleDef.name,
        description: roleDef.description,
      },
      create: {
        code: roleDef.code,
        name: roleDef.name,
        description: roleDef.description,
      },
    });

    for (const permissionCode of roleDef.permissions) {
      const permission = await prisma.permission.findUniqueOrThrow({
        where: { code: permissionCode },
      });

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }

  const adminEmail = process.env.SUPER_ADMIN_EMAIL;
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD;

  if (adminEmail && adminPassword) {
    const superAdminRole = await prisma.role.findUniqueOrThrow({
      where: { code: UserRole.SUPER_ADMIN },
    });

    const existing = await prisma.user.findUnique({
      where: { email: adminEmail.toLowerCase() },
    });

    if (!existing) {
      const passwordHash = await argon2.hash(adminPassword);
      await prisma.user.create({
        data: {
          email: adminEmail.toLowerCase(),
          passwordHash,
          firstName: 'Super',
          lastName: 'Admin',
          isEmailVerified: true,
          roles: {
            create: [{ roleId: superAdminRole.id }],
          },
        },
      });
      console.log(`Seeded SUPER_ADMIN user: ${adminEmail}`);
    }
  }

  console.log('Seed completed');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
