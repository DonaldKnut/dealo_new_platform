import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole, WorkspaceRole, type Organization } from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';

const RANK: Record<WorkspaceRole, number> = {
  HIRING_MANAGER: 1,
  RECRUITER: 2,
  ADMIN: 3,
  OWNER: 4,
};

export const isObjectId = (value: string) => /^[a-f0-9]{24}$/i.test(value);

export type WorkspaceAccess = {
  organization: Organization;
  role: WorkspaceRole;
  memberId: string | null;
  /** Dealo super admins can open any workspace for support. */
  support: boolean;
  userId: string;
  userName: string;
};

/** Every workspace route goes through here, so no query can cross companies. */
@Injectable()
export class AtsAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async require(orgId: string, user: AuthUser, min: WorkspaceRole = WorkspaceRole.HIRING_MANAGER): Promise<WorkspaceAccess> {
    if (!isObjectId(orgId) || !user.id) {
      throw new NotFoundException('Workspace not found');
    }
    const organization = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!organization || !organization.isActive) throw new NotFoundException('Workspace not found');

    if (user.authType === 'api_key') {
      return this.requireApiKey(organization, user, min);
    }

    const member = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: user.id } },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });

    if (!member) {
      if (user.roles.includes(UserRole.SUPER_ADMIN)) {
        return { organization, role: WorkspaceRole.OWNER, memberId: null, support: true, userId: user.id, userName: 'Dealo support' };
      }
      throw new NotFoundException('Workspace not found');
    }
    if (RANK[member.role] < RANK[min]) {
      throw new ForbiddenException('Your role in this workspace cannot do this');
    }
    const userName = `${member.user.firstName} ${member.user.lastName}`.trim() || member.user.email;
    return { organization, role: member.role, memberId: member.id, support: false, userId: user.id, userName };
  }

  /** Workspace API keys act as a recruiter in their own workspace, and stop working if their creator leaves. */
  private async requireApiKey(organization: Organization, user: AuthUser, min: WorkspaceRole): Promise<WorkspaceAccess> {
    if (!user.apiKeyId || user.organizationId !== organization.id) throw new NotFoundException('Workspace not found');
    const key = await this.prisma.apiKey.findUnique({ where: { id: user.apiKeyId }, select: { createdByUserId: true, name: true } });
    const creator = key
      ? await this.prisma.organizationMember.findUnique({
          where: { organizationId_userId: { organizationId: organization.id, userId: key.createdByUserId } },
        })
      : null;
    if (!key || !creator) throw new NotFoundException('Workspace not found');
    if (RANK[WorkspaceRole.RECRUITER] < RANK[min]) throw new ForbiddenException('API keys cannot do this');
    return {
      organization,
      role: WorkspaceRole.RECRUITER,
      memberId: null,
      support: false,
      userId: key.createdByUserId,
      userName: `API · ${key.name}`,
    };
  }

  static canManage(role: WorkspaceRole) {
    return RANK[role] >= RANK.RECRUITER;
  }

  static rank(role: WorkspaceRole) {
    return RANK[role];
  }
}
