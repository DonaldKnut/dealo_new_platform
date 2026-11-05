import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CreateWorkspaceInput, InviteMemberInput, UpdateWorkspaceInput } from '@dealo/shared';
import { JobStatus, WorkspaceRole } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';

import type { AuthUser } from '../auth/auth.types';
import { AuditLogService } from '../common/audit-log.service';
import { normalizeEmail } from '../common/normalize-email';
import type { AppEnv } from '../config/env.validation';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { AtsAccessService } from './ats-access.service';
import { workspaceInviteEmail } from './ats-emails';

const INVITE_TTL_MS = 7 * 24 * 3_600_000;
const MAX_OWNED_WORKSPACES = 3;
const RESERVED_SLUGS = new Set(['admin', 'api', 'dealo-support', 'careers', 'jobs', 'www', 'app', 'dashboard']);
/** In MongoDB an optional field that was never set is missing, not null. */
const NOT_ACCEPTED = { OR: [{ acceptedAt: null }, { acceptedAt: { isSet: false } }] };

const hash = (token: string) => createHash('sha256').update(token).digest('hex');

@Injectable()
export class WorkspacesService {
  private readonly appUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AtsAccessService,
    private readonly email: EmailService,
    private readonly audit: AuditLogService,
    config: ConfigService<AppEnv, true>,
  ) {
    this.appUrl = config.get('APP_URL', { infer: true }).replace(/\/$/, '');
  }

  async slugAvailable(slug: string) {
    const clean = slug.trim().toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(clean) || RESERVED_SLUGS.has(clean)) return { slug: clean, available: false };
    const taken = await this.prisma.organization.findUnique({ where: { slug: clean }, select: { id: true } });
    return { slug: clean, available: !taken };
  }

  async create(input: CreateWorkspaceInput, user: AuthUser) {
    if (user.authType === 'api_key') throw new ForbiddenException('Sign in to create a workspace');
    const { available } = await this.slugAvailable(input.slug);
    if (!available) throw new ConflictException('That web address is taken. Try another.');

    const owned = await this.prisma.organizationMember.count({ where: { userId: user.id, role: WorkspaceRole.OWNER } });
    if (owned >= MAX_OWNED_WORKSPACES) {
      throw new BadRequestException(`You can own up to ${MAX_OWNED_WORKSPACES} workspaces during early access.`);
    }

    const organization = await this.prisma.organization.create({
      data: {
        name: input.name,
        slug: input.slug.toLowerCase(),
        website: input.website,
        logoUrl: input.logoUrl,
        members: { create: { userId: user.id, role: WorkspaceRole.OWNER, isOwner: true } },
      },
    });
    await this.audit.record({
      action: 'ATS_WORKSPACE_CREATED',
      entityType: 'Organization',
      entityId: organization.id,
      actorId: user.id,
      metadata: { slug: organization.slug },
    });
    return organization;
  }

  async mine(user: AuthUser) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId: user.id, organization: { isActive: true } },
      include: { organization: true },
      orderBy: { createdAt: 'asc' },
    });
    return memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      logoUrl: m.organization.logoUrl,
      plan: m.organization.plan,
      role: m.role,
    }));
  }

  async detail(orgId: string, user: AuthUser) {
    const access = await this.access.require(orgId, user);
    const [members, invites, openJobs, applications] = await Promise.all([
      this.prisma.organizationMember.findMany({
        where: { organizationId: orgId },
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      AtsAccessService.rank(access.role) >= AtsAccessService.rank(WorkspaceRole.ADMIN)
        ? this.prisma.workspaceInvite.findMany({
            where: { organizationId: orgId, ...NOT_ACCEPTED, expiresAt: { gt: new Date() } },
            orderBy: { createdAt: 'desc' },
            select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
          })
        : Promise.resolve([]),
      this.prisma.job.count({ where: { organizationId: orgId, status: JobStatus.OPEN } }),
      this.prisma.application.count({ where: { organizationId: orgId } }),
    ]);

    return {
      workspace: access.organization,
      myRole: access.role,
      support: access.support,
      members: members.map((m) => ({
        id: m.id,
        userId: m.user.id,
        name: `${m.user.firstName} ${m.user.lastName}`.trim() || m.user.email,
        email: m.user.email,
        role: m.role,
        title: m.title,
      })),
      invites,
      usage: {
        openJobs,
        maxOpenJobs: access.organization.maxOpenJobs,
        seats: members.length + invites.length,
        maxSeats: access.organization.maxSeats,
        applications,
      },
    };
  }

  async update(orgId: string, input: UpdateWorkspaceInput, user: AuthUser) {
    await this.access.require(orgId, user, WorkspaceRole.ADMIN);
    return this.prisma.organization.update({ where: { id: orgId }, data: input });
  }

  async invite(orgId: string, input: InviteMemberInput, user: AuthUser) {
    const access = await this.access.require(orgId, user, WorkspaceRole.ADMIN);
    const email = normalizeEmail(input.email);

    const [members, pending, existingUser] = await Promise.all([
      this.prisma.organizationMember.count({ where: { organizationId: orgId } }),
      this.prisma.workspaceInvite.count({ where: { organizationId: orgId, ...NOT_ACCEPTED, expiresAt: { gt: new Date() } } }),
      this.prisma.user.findUnique({ where: { email }, select: { id: true } }),
    ]);
    if (members + pending >= access.organization.maxSeats) {
      throw new BadRequestException(`Your plan allows ${access.organization.maxSeats} team members.`);
    }
    if (existingUser) {
      const already = await this.prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId: orgId, userId: existingUser.id } },
      });
      if (already) throw new ConflictException('This person is already in the workspace');
    }

    await this.prisma.workspaceInvite.deleteMany({ where: { organizationId: orgId, email, ...NOT_ACCEPTED } });
    const token = randomBytes(24).toString('base64url');
    const invite = await this.prisma.workspaceInvite.create({
      data: {
        organizationId: orgId,
        email,
        role: input.role as WorkspaceRole,
        tokenHash: hash(token),
        invitedById: user.id,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
      select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
    });

    const link = `${this.appUrl}/ats/invite/${token}`;
    await this.email
      .send(workspaceInviteEmail({ to: email, orgName: access.organization.name, inviterName: access.userName, role: invite.role, link }))
      .catch(() => undefined);
    // The link is also returned so an admin can share it directly (e.g. on WhatsApp).
    return { ...invite, link };
  }

  async revokeInvite(orgId: string, inviteId: string, user: AuthUser) {
    await this.access.require(orgId, user, WorkspaceRole.ADMIN);
    await this.prisma.workspaceInvite.deleteMany({ where: { id: inviteId, organizationId: orgId } });
    return { ok: true };
  }

  async previewInvite(token: string) {
    const invite = await this.prisma.workspaceInvite.findUnique({
      where: { tokenHash: hash(token) },
      include: { organization: { select: { name: true, logoUrl: true } } },
    });
    if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
      throw new NotFoundException('This invite has expired or was already used');
    }
    const [local, domain] = invite.email.split('@');
    return {
      organization: invite.organization,
      role: invite.role,
      email: `${local.slice(0, 2)}***@${domain}`,
    };
  }

  async acceptInvite(token: string, user: AuthUser) {
    const invite = await this.prisma.workspaceInvite.findUnique({ where: { tokenHash: hash(token) } });
    if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
      throw new NotFoundException('This invite has expired or was already used');
    }
    const account = await this.prisma.user.findUnique({ where: { id: user.id }, select: { email: true } });
    if (!account || normalizeEmail(account.email) !== invite.email) {
      throw new ForbiddenException(`Sign in with ${invite.email} to accept this invite`);
    }

    await this.prisma.organizationMember.upsert({
      where: { organizationId_userId: { organizationId: invite.organizationId, userId: user.id } },
      update: { role: invite.role },
      create: { organizationId: invite.organizationId, userId: user.id, role: invite.role },
    });
    await this.prisma.workspaceInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
    return { organizationId: invite.organizationId };
  }

  async changeRole(orgId: string, memberId: string, role: WorkspaceRole, user: AuthUser) {
    await this.access.require(orgId, user, WorkspaceRole.ADMIN);
    const member = await this.prisma.organizationMember.findFirst({ where: { id: memberId, organizationId: orgId } });
    if (!member) throw new NotFoundException('Member not found');
    if (member.role === WorkspaceRole.OWNER) throw new ForbiddenException('The owner’s role cannot be changed');
    return this.prisma.organizationMember.update({ where: { id: memberId }, data: { role } });
  }

  async removeMember(orgId: string, memberId: string, user: AuthUser) {
    await this.access.require(orgId, user, WorkspaceRole.ADMIN);
    const member = await this.prisma.organizationMember.findFirst({ where: { id: memberId, organizationId: orgId } });
    if (!member) throw new NotFoundException('Member not found');
    if (member.role === WorkspaceRole.OWNER) throw new ForbiddenException('The owner cannot be removed');
    await this.prisma.organizationMember.delete({ where: { id: memberId } });
    return { ok: true };
  }
}
