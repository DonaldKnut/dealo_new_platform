import { Injectable } from '@nestjs/common';
import { HireInquiryStatus, UserRole } from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { normalizeEmail } from '../common/normalize-email';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthUser) {
    const manageRoles: UserRole[] = [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.RECRUITER,
      UserRole.OPERATIONS,
    ];
    const canManageAll = user.roles.some((role) => manageRoles.includes(role));

    const where = canManageAll ? {} : { email: normalizeEmail(user.email) };

    const [inquiries, openCount, contactedCount, convertedCount] = await Promise.all([
      this.prisma.hireInquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      this.prisma.hireInquiry.count({
        where: { ...where, status: HireInquiryStatus.NEW },
      }),
      this.prisma.hireInquiry.count({
        where: {
          ...where,
          status: { in: [HireInquiryStatus.CONTACTED, HireInquiryStatus.QUALIFIED] },
        },
      }),
      this.prisma.hireInquiry.count({
        where: { ...where, status: HireInquiryStatus.CONVERTED },
      }),
    ]);

    const total = await this.prisma.hireInquiry.count({ where });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
      },
      stats: {
        totalRequests: total,
        openRequests: openCount,
        inProgress: contactedCount,
        converted: convertedCount,
      },
      recentRequests: inquiries.map((item) => ({
        id: item.id,
        companyName: item.companyName,
        roleTitle: item.roleTitle,
        serviceType: item.serviceType,
        status: item.status,
        numberOfProfessionals: item.numberOfProfessionals,
        createdAt: item.createdAt,
      })),
    };
  }

  async requests(user: AuthUser) {
    const manageRoles: UserRole[] = [
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.RECRUITER,
      UserRole.OPERATIONS,
    ];
    const canManageAll = user.roles.some((role) => manageRoles.includes(role));

    const where = canManageAll ? {} : { email: normalizeEmail(user.email) };

    return this.prisma.hireInquiry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
