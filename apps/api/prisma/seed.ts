import { PermissionCode, UserRole } from '@dealo/shared';
import { PrismaClient, UserRole as PrismaUserRole } from '@prisma/client';
import * as argon2 from 'argon2';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

import { BLOG_ARTICLES } from './blog-articles';

function loadEnvFile(): void {
  const candidates = [
    resolve(__dirname, '../.env'),
    resolve(__dirname, '../.env.txt'),
  ];

  for (const envPath of candidates) {
    if (!existsSync(envPath)) {
      continue;
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
      // Later files (e.g. .env.txt) may refresh local secrets intentionally.
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
      PermissionCode.BLOG_MANAGE,
      PermissionCode.NEWSLETTER_MANAGE,
      PermissionCode.SUPPORT_MANAGE,
      PermissionCode.USERS_MAIL,
      PermissionCode.API_KEYS_MANAGE,
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

  console.log('Ensuring API plan configs (existing admin edits are kept)...');
  const API_PLAN_DEFAULTS = [
    {
      plan: 'SANDBOX',
      name: 'Sandbox',
      description: 'Free test keys for building and evaluating an integration.',
      priceMinor: 0,
      rateLimitPerMin: 30,
      monthlyQuota: 1_000,
      maxLiveKeys: 0,
      isPurchasable: false,
    },
    {
      plan: 'PARTNER',
      name: 'Partner',
      description: 'Production access for a single integration.',
      priceMinor: 5_000_000,
      rateLimitPerMin: 120,
      monthlyQuota: 50_000,
      maxLiveKeys: 3,
      isPurchasable: true,
    },
    {
      plan: 'ENTERPRISE',
      name: 'Enterprise',
      description: 'High-volume production access with priority support.',
      priceMinor: 25_000_000,
      rateLimitPerMin: 600,
      monthlyQuota: 500_000,
      maxLiveKeys: 10,
      isPurchasable: true,
    },
  ] as const;
  for (const config of API_PLAN_DEFAULTS) {
    await prisma.apiPlanConfig.upsert({
      where: { plan: config.plan },
      update: {},
      create: { ...config, currency: 'NGN', periodDays: 30 },
    });
  }

  console.log('Adding starter blog articles (existing posts are never changed)...');
  for (const article of BLOG_ARTICLES) {
    const exists = await prisma.blogPost.findUnique({ where: { slug: article.slug } });
    if (exists) continue;
    const { daysAgo, ...data } = article;
    await prisma.blogPost.create({
      data: {
        ...data,
        content: data.content.trim(),
        status: 'PUBLISHED',
        publishedAt: new Date(Date.now() - daysAgo * 86_400_000),
      },
    });
  }

  console.log('Repairing professional names saved as emails...');
  const misnamed = await prisma.candidate.findMany({
    where: { userId: { not: null } },
    select: { id: true, fullName: true, email: true, user: { select: { firstName: true, lastName: true } } },
  });
  for (const candidate of misnamed) {
    const realName = `${candidate.user?.firstName ?? ''} ${candidate.user?.lastName ?? ''}`.trim();
    if (realName && candidate.fullName === candidate.email) {
      await prisma.candidate.update({ where: { id: candidate.id }, data: { fullName: realName } });
    }
  }

  const adminEmail = process.env.SUPER_ADMIN_EMAIL;
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD;

  if (adminEmail && adminPassword) {
    const superAdminRole = await prisma.role.findUniqueOrThrow({
      where: { code: UserRole.SUPER_ADMIN },
    });

    const email = adminEmail.toLowerCase();
    const passwordHash = await argon2.hash(adminPassword);

    const existingByEmail = await prisma.user.findUnique({
      where: { email },
      include: { roles: true },
    });

    const existingSuperAdminAssignment = await prisma.userRoleAssignment.findFirst({
      where: { roleId: superAdminRole.id },
      include: { user: true },
    });

    if (existingByEmail) {
      await prisma.user.update({
        where: { email },
        data: {
          passwordHash,
          firstName: existingByEmail.firstName || 'Ibrahim',
          lastName: existingByEmail.lastName || 'Openiyi',
          isEmailVerified: true,
          isActive: true,
          authProvider: 'local',
        },
      });

      const hasSuperAdmin = existingByEmail.roles.some(
        (assignment) => assignment.roleId === superAdminRole.id,
      );
      if (!hasSuperAdmin) {
        await prisma.userRoleAssignment.create({
          data: {
            userId: existingByEmail.id,
            roleId: superAdminRole.id,
          },
        });
      }

      console.log(`Updated SUPER_ADMIN user: ${email}`);
    } else if (existingSuperAdminAssignment) {
      // Mongo unique on optional googleId can block a second null googleId user,
      // so migrate the existing SUPER_ADMIN identity to the configured email.
      await prisma.user.update({
        where: { id: existingSuperAdminAssignment.userId },
        data: {
          email,
          passwordHash,
          firstName: 'Ibrahim',
          lastName: 'Openiyi',
          isEmailVerified: true,
          isActive: true,
          authProvider: 'local',
        },
      });
      console.log(
        `Migrated SUPER_ADMIN ${existingSuperAdminAssignment.user.email} → ${email}`,
      );
    } else {
      await prisma.user.create({
        data: {
          email,
          passwordHash,
          firstName: 'Ibrahim',
          lastName: 'Openiyi',
          isEmailVerified: true,
          authProvider: 'local',
          roles: {
            create: [{ roleId: superAdminRole.id }],
          },
        },
      });
      console.log(`Seeded SUPER_ADMIN user: ${email}`);
    }
  } else {
    console.warn('SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD not set — skipped admin seed');
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
