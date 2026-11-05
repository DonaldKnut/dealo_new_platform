import { Injectable } from '@nestjs/common';
import {
  CandidateScreenStatus,
  HireInquiryStatus,
  UserRole,
} from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { normalizeEmail } from '../common/normalize-email';
import { PrismaService } from '../prisma/prisma.service';

const MANAGE_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.RECRUITER,
  UserRole.OPERATIONS,
];

type RoleGroup = 'admin' | 'employer' | 'talent';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private canManageAll(user: AuthUser) {
    return user.roles.some((role) => MANAGE_ROLES.includes(role));
  }

  private roleGroup(user: AuthUser): RoleGroup {
    if (this.canManageAll(user)) return 'admin';
    if (user.roles.includes(UserRole.TALENT) && !user.roles.includes(UserRole.EMPLOYER)) {
      return 'talent';
    }
    return 'employer';
  }

  async overview(user: AuthUser) {
    const roleGroup = this.roleGroup(user);
    const base = {
      roleGroup,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
      },
    };

    if (roleGroup === 'admin') {
      return { ...base, workspace: await this.adminWorkspace() };
    }
    if (roleGroup === 'talent') {
      return { ...base, workspace: await this.talentWorkspace(user) };
    }
    return { ...base, workspace: await this.employerWorkspace(user) };
  }

  private async adminWorkspace() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalRequests,
      newCount,
      contactedCount,
      qualifiedCount,
      convertedCount,
      closedCount,
      totalUsers,
      employers,
      talent,
      staff,
      candidatesTotal,
      candidatesScreening,
      candidatesScreened,
      shortlists,
      publishedPosts,
      draftPosts,
      newsletterSent,
      recentRequests,
      recentUsers,
      newThisWeek,
      convertedThisWeek,
    ] = await Promise.all([
      this.prisma.hireInquiry.count(),
      this.prisma.hireInquiry.count({ where: { status: HireInquiryStatus.NEW } }),
      this.prisma.hireInquiry.count({ where: { status: HireInquiryStatus.CONTACTED } }),
      this.prisma.hireInquiry.count({ where: { status: HireInquiryStatus.QUALIFIED } }),
      this.prisma.hireInquiry.count({ where: { status: HireInquiryStatus.CONVERTED } }),
      this.prisma.hireInquiry.count({ where: { status: HireInquiryStatus.CLOSED } }),
      this.prisma.user.count(),
      this.prisma.user.count({
        where: { roles: { some: { role: { code: UserRole.EMPLOYER } } } },
      }),
      this.prisma.user.count({
        where: { roles: { some: { role: { code: UserRole.TALENT } } } },
      }),
      this.prisma.user.count({
        where: {
          roles: {
            some: {
              role: {
                code: {
                  in: [
                    UserRole.SUPER_ADMIN,
                    UserRole.ADMIN,
                    UserRole.RECRUITER,
                    UserRole.FINANCE,
                    UserRole.OPERATIONS,
                  ],
                },
              },
            },
          },
        },
      }),
      this.prisma.candidate.count(),
      this.prisma.candidate.count({
        where: {
          screenStatus: {
            in: [CandidateScreenStatus.NEW, CandidateScreenStatus.SCREENING],
          },
        },
      }),
      this.prisma.candidate.count({
        where: { screenStatus: CandidateScreenStatus.SCREENED },
      }),
      this.prisma.shortlist.count(),
      this.prisma.blogPost.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.blogPost.count({ where: { status: 'DRAFT' } }),
      this.prisma.newsletterCampaign.count({ where: { status: 'SENT' } }),
      this.prisma.hireInquiry.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { roles: { include: { role: true } } },
      }),
      this.prisma.hireInquiry.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.hireInquiry.count({
        where: { status: HireInquiryStatus.CONVERTED, updatedAt: { gte: sevenDaysAgo } },
      }),
    ]);

    const conversionRate =
      totalRequests === 0 ? 0 : Math.round((convertedCount / totalRequests) * 100);

    const attention: Array<{ label: string; href: string; tone: 'urgent' | 'watch' }> = [];
    if (newCount > 0) {
      attention.push({
        label: `${newCount} new hire request${newCount === 1 ? '' : 's'} need triage`,
        href: '/dashboard/requests',
        tone: 'urgent',
      });
    }
    if (candidatesScreening > 0) {
      attention.push({
        label: `${candidatesScreening} candidate${candidatesScreening === 1 ? '' : 's'} in screening`,
        href: '/dashboard/talent',
        tone: 'watch',
      });
    }
    if (draftPosts > 0) {
      attention.push({
        label: `${draftPosts} draft blog post${draftPosts === 1 ? '' : 's'} waiting`,
        href: '/dashboard/blog',
        tone: 'watch',
      });
    }

    return {
      kind: 'admin' as const,
      headline: 'Operations command center',
      subcopy:
        'Pipeline, people, and content across Dealo hiring for Nigeria, Africa, and inbound US/global teams.',
      kpis: {
        openPipeline: newCount + contactedCount + qualifiedCount,
        conversionRate,
        newThisWeek,
        convertedThisWeek,
        activeTalentPool: candidatesScreened,
      },
      pipeline: {
        new: newCount,
        contacted: contactedCount,
        qualified: qualifiedCount,
        converted: convertedCount,
        closed: closedCount,
        total: totalRequests,
      },
      users: { total: totalUsers, employers, talent, staff },
      talentOps: {
        candidates: candidatesTotal,
        inScreening: candidatesScreening,
        screened: candidatesScreened,
        shortlists,
      },
      content: {
        publishedPosts,
        draftPosts,
        newsletterSent,
      },
      attention,
      recentRequests: recentRequests.map((item) => this.mapRequest(item)),
      recentUsers: recentUsers.map((row) => ({
        id: row.id,
        email: row.email,
        firstName: row.firstName,
        lastName: row.lastName,
        roles: row.roles.map((a) => a.role.code),
        createdAt: row.createdAt,
      })),
      // backward-compatible aliases for older clients
      stats: {
        totalRequests,
        openRequests: newCount,
        inProgress: contactedCount + qualifiedCount,
        converted: convertedCount,
      },
      userStats: { totalUsers, employers, talent, staff },
    };
  }

  private async employerWorkspace(user: AuthUser) {
    const email = normalizeEmail(user.email);
    const where = { email };

    const [
      total,
      openCount,
      inProgress,
      converted,
      closed,
      recentRequests,
      orgs,
      shortlists,
    ] = await Promise.all([
      this.prisma.hireInquiry.count({ where }),
      this.prisma.hireInquiry.count({ where: { ...where, status: HireInquiryStatus.NEW } }),
      this.prisma.hireInquiry.count({
        where: {
          ...where,
          status: { in: [HireInquiryStatus.CONTACTED, HireInquiryStatus.QUALIFIED] },
        },
      }),
      this.prisma.hireInquiry.count({
        where: { ...where, status: HireInquiryStatus.CONVERTED },
      }),
      this.prisma.hireInquiry.count({
        where: { ...where, status: HireInquiryStatus.CLOSED },
      }),
      this.prisma.hireInquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      this.organization(user),
      this.prisma.shortlist.findMany({
        where: { hireInquiry: { email } },
        orderBy: { updatedAt: 'desc' },
        take: 6,
        include: {
          hireInquiry: {
            select: { id: true, companyName: true, roleTitle: true, status: true },
          },
          _count: { select: { entries: true } },
        },
      }),
    ]);

    const headcountRequested = recentRequests.reduce(
      (sum, item) => sum + item.numberOfProfessionals,
      0,
    );

    const nextActions: Array<{ label: string; href: string }> = [];
    if (total === 0) {
      nextActions.push({ label: 'Submit your first hire request', href: '/hire' });
    } else if (openCount > 0) {
      nextActions.push({
        label: 'Dealo is reviewing your newest requests',
        href: '/dashboard/requests',
      });
    }
    if (shortlists.length > 0) {
      nextActions.push({ label: 'Review candidate shortlists', href: '/dashboard/talent' });
    }
    if (orgs.length === 0) {
      nextActions.push({
        label: 'Organization setup unlocks team invites next',
        href: '/dashboard/organization',
      });
    }

    return {
      kind: 'employer' as const,
      headline: 'Hiring workspace',
      subcopy:
        'Track US-ready and Africa-based office talent and skilled trades from request to shortlist.',
      kpis: {
        activeRequests: openCount + inProgress,
        filled: converted,
        rolesInFlight: recentRequests.filter((r) =>
          ['NEW', 'CONTACTED', 'QUALIFIED'].includes(r.status),
        ).length,
        peopleRequested: headcountRequested,
      },
      stats: {
        totalRequests: total,
        openRequests: openCount,
        inProgress,
        converted,
        closed,
      },
      organizations: orgs,
      shortlists: shortlists.map((list) => ({
        id: list.id,
        title: list.title,
        candidateCount: list._count.entries,
        hireInquiry: list.hireInquiry,
        updatedAt: list.updatedAt,
      })),
      nextActions,
      recentRequests: recentRequests.map((item) => this.mapRequest(item)),
      userStats: null,
    };
  }

  private async talentWorkspace(user: AuthUser) {
    let candidate = await this.prisma.candidate.findUnique({
      where: { userId: user.id },
    });

    if (!candidate) {
      const email = normalizeEmail(user.email);
      const unlinked = await this.prisma.candidate.findFirst({
        where: { email, userId: null },
      });
      if (unlinked) {
        candidate = await this.prisma.candidate.update({
          where: { id: unlinked.id },
          data: { userId: user.id },
        });
      } else {
        candidate = await this.prisma.candidate.create({
          data: {
            fullName: `${user.firstName} ${user.lastName}`.trim() || email,
            email,
            userId: user.id,
          },
        });
      }
    }

    const [documentCount, matchEntries, hasCv] = await Promise.all([
      this.prisma.candidateDocument.count({ where: { candidateId: candidate.id } }),
      this.prisma.shortlistEntry.findMany({
        where: { candidateId: candidate.id },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        include: {
          shortlist: {
            include: {
              hireInquiry: {
                select: {
                  companyName: true,
                  roleTitle: true,
                  status: true,
                  location: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.candidateDocument.count({
        where: { candidateId: candidate.id, kind: 'CV' },
      }),
    ]);

    const checklist = [
      {
        id: 'profile',
        label: 'Profile linked',
        done: Boolean(candidate.userId),
      },
      {
        id: 'role',
        label: 'Role title set',
        done: Boolean(candidate.roleTitle?.trim()),
      },
      {
        id: 'location',
        label: 'Location set',
        done: Boolean(candidate.location?.trim()),
      },
      {
        id: 'cv',
        label: 'CV uploaded',
        done: hasCv > 0,
      },
      {
        id: 'docs',
        label: 'At least one document',
        done: documentCount > 0,
      },
    ];
    const readiness = Math.round(
      (checklist.filter((item) => item.done).length / checklist.length) * 100,
    );

    return {
      kind: 'talent' as const,
      headline: 'Career console',
      subcopy:
        'Stay shortlist-ready for office and skilled trades roles across Nigeria, Africa, and inbound global hiring.',
      candidate: {
        id: candidate.id,
        fullName: candidate.fullName,
        email: candidate.email,
        phone: candidate.phone,
        roleTitle: candidate.roleTitle,
        location: candidate.location,
        screenStatus: candidate.screenStatus,
      },
      kpis: {
        readiness,
        matches: matchEntries.length,
        documents: documentCount,
        screenStatus: candidate.screenStatus,
      },
      checklist,
      recentMatches: matchEntries.map((entry) => ({
        id: entry.id,
        rank: entry.rank,
        shortlistTitle: entry.shortlist.title,
        companyName: entry.shortlist.hireInquiry.companyName,
        roleTitle: entry.shortlist.hireInquiry.roleTitle,
        status: entry.shortlist.hireInquiry.status,
        location: entry.shortlist.hireInquiry.location,
      })),
      stats: {
        totalRequests: matchEntries.length,
        openRequests: matchEntries.filter((e) =>
          ['NEW', 'CONTACTED', 'QUALIFIED'].includes(e.shortlist.hireInquiry.status),
        ).length,
        inProgress: 0,
        converted: matchEntries.filter((e) => e.shortlist.hireInquiry.status === 'CONVERTED')
          .length,
      },
      recentRequests: [],
      userStats: null,
    };
  }

  async requests(user: AuthUser) {
    const canManageAll = this.canManageAll(user);
    const where = canManageAll ? {} : { email: normalizeEmail(user.email) };

    return this.prisma.hireInquiry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async users(user: AuthUser) {
    if (!this.canManageAll(user)) {
      return [];
    }

    const rows = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        roles: { include: { role: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      isActive: row.isActive,
      isEmailVerified: row.isEmailVerified,
      lastLoginAt: row.lastLoginAt,
      createdAt: row.createdAt,
      premiumUntil: row.premiumUntil && row.premiumUntil > new Date() ? row.premiumUntil : null,
      roles: row.roles.map((assignment) => assignment.role.code),
    }));
  }

  async organization(user: AuthUser) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId: user.id },
      include: {
        organization: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return memberships.map((membership) => ({
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      isOwner: membership.isOwner,
      title: membership.title,
      members: membership.organization.members.map((member) => ({
        id: member.user.id,
        email: member.user.email,
        firstName: member.user.firstName,
        lastName: member.user.lastName,
        title: member.title,
        isOwner: member.isOwner,
      })),
    }));
  }

  private mapRequest(item: {
    id: string;
    companyName: string;
    roleTitle: string;
    serviceType: string;
    status: string;
    numberOfProfessionals: number;
    createdAt: Date;
    location?: string;
  }) {
    return {
      id: item.id,
      companyName: item.companyName,
      roleTitle: item.roleTitle,
      serviceType: item.serviceType,
      status: item.status,
      numberOfProfessionals: item.numberOfProfessionals,
      createdAt: item.createdAt,
      location: item.location,
    };
  }
}
