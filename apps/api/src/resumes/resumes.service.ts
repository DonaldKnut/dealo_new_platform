import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  RESUME_LIMITS,
  coverLetterDataSchema,
  resumeDataSchema,
  type ResumeData,
  type SaveResumeInput,
} from '@dealo/shared';
import { Prisma, UserRole } from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { AuditLogService } from '../common/audit-log.service';
import { CandidatesService } from '../candidates/candidates.service';
import { PrismaService } from '../prisma/prisma.service';

const isObjectId = (value: string) => /^[a-f0-9]{24}$/i.test(value);

const LIST_SELECT = {
  id: true,
  kind: true,
  title: true,
  template: true,
  accentColor: true,
  font: true,
  downloadCount: true,
  lastDownloadedAt: true,
  createdAt: true,
  updatedAt: true,
  data: true,
} satisfies Prisma.ResumeSelect;

/** Whole years worked, counting overlapping jobs once is not needed for a profile hint. */
function yearsFromExperience(data: ResumeData) {
  const years = data.experience
    .map((job) => {
      const start = Number(job.start.match(/(19|20)\d{2}/)?.[0]);
      const end = job.current ? new Date().getFullYear() : Number(job.end.match(/(19|20)\d{2}/)?.[0]);
      return start && end && end >= start ? end - start : 0;
    })
    .reduce((sum, value) => sum + value, 0);
  return years ? Math.min(60, years) : null;
}

const validUrl = (value: string) => {
  if (!value) return null;
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    return new URL(withScheme).toString();
  } catch {
    return null;
  }
};

@Injectable()
export class ResumesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly candidates: CandidatesService,
    private readonly audit: AuditLogService,
  ) {}

  async plan(user: AuthUser) {
    const account = await this.prisma.user.findUnique({ where: { id: user.id }, select: { premiumUntil: true } });
    const premium = Boolean(account?.premiumUntil && account.premiumUntil > new Date());
    const [resumes, coverLetters] = await Promise.all([
      this.prisma.resume.count({ where: { userId: user.id, kind: 'RESUME' } }),
      this.prisma.resume.count({ where: { userId: user.id, kind: 'COVER_LETTER' } }),
    ]);
    return {
      premium,
      premiumUntil: premium ? account?.premiumUntil ?? null : null,
      limits: premium ? RESUME_LIMITS.premium : RESUME_LIMITS.free,
      used: { resumes, coverLetters },
      canShareToProfile: user.roles.includes(UserRole.TALENT),
    };
  }

  async requirePremium(user: AuthUser) {
    const { premium } = await this.plan(user);
    if (!premium) throw new ForbiddenException('This is a premium feature');
  }

  list(user: AuthUser) {
    return this.prisma.resume.findMany({ where: { userId: user.id }, orderBy: { updatedAt: 'desc' }, select: LIST_SELECT });
  }

  async get(id: string, user: AuthUser) {
    if (!isObjectId(id)) throw new NotFoundException('CV not found');
    const resume = await this.prisma.resume.findFirst({ where: { id, userId: user.id } });
    if (!resume) throw new NotFoundException('CV not found');
    return resume;
  }

  private normalise(input: SaveResumeInput) {
    const parsed = input.kind === 'COVER_LETTER' ? coverLetterDataSchema.safeParse(input.data) : resumeDataSchema.safeParse(input.data);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues[0]?.message ?? 'Check your CV details');
    return parsed.data as Prisma.InputJsonValue;
  }

  async create(input: SaveResumeInput, user: AuthUser) {
    const plan = await this.plan(user);
    const isLetter = input.kind === 'COVER_LETTER';
    const used = isLetter ? plan.used.coverLetters : plan.used.resumes;
    const limit = isLetter ? plan.limits.coverLetters : plan.limits.resumes;
    if (used >= limit) {
      throw new ForbiddenException(
        isLetter
          ? 'Cover letters are a premium feature'
          : limit === 1
            ? 'Free accounts keep one CV. Edit your saved CV, or go premium to keep more.'
            : `You can keep ${limit} CVs`,
      );
    }
    return this.prisma.resume.create({
      data: {
        userId: user.id,
        kind: input.kind,
        title: input.title,
        template: input.style.template,
        accentColor: input.style.accentColor,
        font: input.style.font,
        data: this.normalise(input),
      },
    });
  }

  async update(id: string, input: SaveResumeInput, user: AuthUser) {
    const existing = await this.get(id, user);
    if (existing.kind !== input.kind) throw new BadRequestException('Cannot change a CV into a cover letter');
    return this.prisma.resume.update({
      where: { id },
      data: {
        title: input.title,
        template: input.style.template,
        accentColor: input.style.accentColor,
        font: input.style.font,
        data: this.normalise(input),
      },
    });
  }

  async duplicate(id: string, user: AuthUser) {
    const existing = await this.get(id, user);
    return this.create(
      {
        kind: existing.kind as 'RESUME' | 'COVER_LETTER',
        title: `${existing.title} (copy)`.slice(0, 120),
        style: { template: existing.template as SaveResumeInput['style']['template'], accentColor: existing.accentColor, font: existing.font as SaveResumeInput['style']['font'] },
        data: existing.data as Record<string, unknown>,
      },
      user,
    );
  }

  async remove(id: string, user: AuthUser) {
    await this.get(id, user);
    await this.prisma.resume.delete({ where: { id } });
    return { ok: true };
  }

  async markDownloaded(id: string, user: AuthUser) {
    await this.get(id, user);
    await this.prisma.resume.update({ where: { id }, data: { downloadCount: { increment: 1 }, lastDownloadedAt: new Date() } });
    return { ok: true };
  }

  /** Copies CV details into the Dealo talent profile so recruiters can find the person. */
  async shareToProfile(id: string, user: AuthUser) {
    if (!user.roles.includes(UserRole.TALENT)) throw new ForbiddenException('Only job seeker accounts have a Dealo profile');
    const resume = await this.get(id, user);
    if (resume.kind !== 'RESUME') throw new BadRequestException('Only CVs can be shared');
    const data = resumeDataSchema.parse(resume.data);
    const candidate = await this.candidates.ensureCandidateForUser(user);
    const roleTitle = data.experience[0]?.role || data.personal.headline;
    const updated = await this.prisma.candidate.update({
      where: { id: candidate.id },
      data: {
        ...(data.personal.fullName ? { fullName: data.personal.fullName } : {}),
        ...(data.personal.phone ? { phone: data.personal.phone } : {}),
        ...(roleTitle ? { roleTitle } : {}),
        ...(data.personal.location ? { location: data.personal.location } : {}),
        ...(data.personal.headline ? { headline: data.personal.headline.slice(0, 160) } : {}),
        ...(data.summary ? { bio: data.summary } : {}),
        ...(data.skills.length ? { skills: [...new Set(data.skills)].slice(0, 20) } : {}),
        ...(yearsFromExperience(data) !== null ? { yearsExperience: yearsFromExperience(data) } : {}),
        ...(validUrl(data.personal.linkedin) ? { linkedinUrl: validUrl(data.personal.linkedin) } : {}),
        ...(validUrl(data.personal.website) ? { portfolioUrl: validUrl(data.personal.website) } : {}),
        profileUpdatedAt: new Date(),
      },
      select: { id: true },
    });
    await this.audit.record({ action: 'RESUME_SHARED_TO_PROFILE', entityType: 'Candidate', entityId: updated.id, actorId: user.id });
    return { candidateId: updated.id };
  }

  // ------------------------------------------------------------------ admin

  async grantPremium(userId: string, days: number, actor: AuthUser) {
    if (!isObjectId(userId)) throw new NotFoundException('User not found');
    const target = await this.prisma.user.findUnique({ where: { id: userId }, select: { premiumUntil: true } });
    if (!target) throw new NotFoundException('User not found');
    const base = target.premiumUntil && target.premiumUntil > new Date() ? target.premiumUntil : new Date();
    const premiumUntil = days === 0 ? null : new Date(base.getTime() + days * 86_400_000);
    await this.prisma.user.update({ where: { id: userId }, data: { premiumUntil } });
    await this.audit.record({ action: days === 0 ? 'PREMIUM_REMOVED' : 'PREMIUM_GRANTED', entityType: 'User', entityId: userId, actorId: actor.id, metadata: { days } });
    return { userId, premiumUntil };
  }
}
