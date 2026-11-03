import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type {
  CandidateInput,
  ShortlistEntryInput,
  ShortlistInput,
} from '@dealo/shared';

import { AuditLogService } from '../common/audit-log.service';
import { normalizeEmail } from '../common/normalize-email';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CandidatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  listCandidates() {
    return this.prisma.candidate.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
  }

  async ensureCandidateForUser(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  }) {
    const linked = await this.prisma.candidate.findUnique({
      where: { userId: user.id },
    });
    if (linked) return linked;

    const email = normalizeEmail(user.email);
    const fullName = `${user.firstName} ${user.lastName}`.trim() || email;
    const unlinked = await this.prisma.candidate.findFirst({
      where: { email, userId: null },
      orderBy: { createdAt: 'asc' },
    });

    if (unlinked) {
      return this.prisma.candidate.update({
        where: { id: unlinked.id },
        data: {
          userId: user.id,
          fullName: unlinked.fullName || fullName,
        },
      });
    }

    return this.prisma.candidate.create({
      data: {
        fullName,
        email,
        userId: user.id,
        screenStatus: 'NEW',
      },
    });
  }

  async createCandidate(input: CandidateInput, actorId?: string) {
    const email = normalizeEmail(input.email);
    const talentUser = await this.prisma.user.findFirst({
      where: {
        email,
        roles: { some: { role: { code: UserRole.TALENT } } },
        candidate: null,
      },
      select: { id: true },
    });

    const candidate = await this.prisma.candidate.create({
      data: {
        fullName: input.fullName,
        email,
        phone: emptyToNull(input.phone),
        roleTitle: emptyToNull(input.roleTitle),
        location: emptyToNull(input.location),
        notes: emptyToNull(input.notes),
        screenStatus: input.screenStatus,
        userId: talentUser?.id,
      },
    });

    await this.auditLog.record({
      action: 'CANDIDATE_CREATED',
      entityType: 'Candidate',
      entityId: candidate.id,
      actorId,
      metadata: talentUser ? { linkedUserId: talentUser.id } : undefined,
    });

    return candidate;
  }

  async updateCandidate(id: string, input: CandidateInput, actorId?: string) {
    await this.requireCandidate(id);
    const candidate = await this.prisma.candidate.update({
      where: { id },
      data: {
        fullName: input.fullName,
        email: normalizeEmail(input.email),
        phone: emptyToNull(input.phone),
        roleTitle: emptyToNull(input.roleTitle),
        location: emptyToNull(input.location),
        notes: emptyToNull(input.notes),
        screenStatus: input.screenStatus,
      },
    });

    await this.auditLog.record({
      action: 'CANDIDATE_UPDATED',
      entityType: 'Candidate',
      entityId: candidate.id,
      actorId,
      metadata: { screenStatus: candidate.screenStatus },
    });

    return candidate;
  }

  listShortlists() {
    return this.prisma.shortlist.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 100,
      include: {
        hireInquiry: {
          select: {
            id: true,
            companyName: true,
            roleTitle: true,
            status: true,
          },
        },
        entries: {
          orderBy: { rank: 'asc' },
          include: { candidate: true },
        },
      },
    });
  }

  async createShortlist(input: ShortlistInput, actorId?: string) {
    const inquiry = await this.prisma.hireInquiry.findUnique({
      where: { id: input.hireInquiryId },
    });
    if (!inquiry) throw new NotFoundException('Hire inquiry not found');

    const shortlist = await this.prisma.shortlist.create({
      data: {
        hireInquiryId: input.hireInquiryId,
        title: input.title,
        notes: emptyToNull(input.notes),
      },
    });

    await this.auditLog.record({
      action: 'SHORTLIST_CREATED',
      entityType: 'Shortlist',
      entityId: shortlist.id,
      actorId,
      metadata: { hireInquiryId: input.hireInquiryId },
    });

    return shortlist;
  }

  async addEntry(shortlistId: string, input: ShortlistEntryInput, actorId?: string) {
    await this.requireShortlist(shortlistId);
    await this.requireCandidate(input.candidateId);

    const entry = await this.prisma.shortlistEntry.upsert({
      where: {
        shortlistId_candidateId: {
          shortlistId,
          candidateId: input.candidateId,
        },
      },
      create: {
        shortlistId,
        candidateId: input.candidateId,
        rank: input.rank,
        notes: emptyToNull(input.notes),
      },
      update: {
        rank: input.rank,
        notes: emptyToNull(input.notes),
      },
      include: { candidate: true },
    });

    await this.auditLog.record({
      action: 'SHORTLIST_ENTRY_UPSERTED',
      entityType: 'ShortlistEntry',
      entityId: entry.id,
      actorId,
    });

    return entry;
  }

  async removeEntry(shortlistId: string, entryId: string, actorId?: string) {
    const entry = await this.prisma.shortlistEntry.findFirst({
      where: { id: entryId, shortlistId },
    });
    if (!entry) throw new NotFoundException('Shortlist entry not found');
    await this.prisma.shortlistEntry.delete({ where: { id: entryId } });
    await this.auditLog.record({
      action: 'SHORTLIST_ENTRY_REMOVED',
      entityType: 'ShortlistEntry',
      entityId: entryId,
      actorId,
    });
    return { ok: true };
  }

  private async requireCandidate(id: string) {
    const candidate = await this.prisma.candidate.findUnique({ where: { id } });
    if (!candidate) throw new NotFoundException('Candidate not found');
    return candidate;
  }

  private async requireShortlist(id: string) {
    const shortlist = await this.prisma.shortlist.findUnique({ where: { id } });
    if (!shortlist) throw new NotFoundException('Shortlist not found');
    return shortlist;
  }
}

function emptyToNull(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}
