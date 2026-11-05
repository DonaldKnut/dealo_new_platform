import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  BulkEmailInput,
  EmailTemplateInput,
  PlacementFromApplicationInput,
  WorkspaceWebhookInput,
} from '@dealo/shared';
import { ApplicationStatus, JobStatus, OfferStatus, WorkspaceRole } from '@prisma/client';

import { ApiKeysService } from '../api-keys/api-keys.service';
import type { AuthUser } from '../auth/auth.types';
import { EmailService } from '../email/email.service';
import { OpsService } from '../ops/ops.service';
import { PrismaService } from '../prisma/prisma.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { ApplicationsService } from './applications.service';
import { AtsAccessService, isObjectId } from './ats-access.service';

const DAY = 86_400_000;

export const BUILT_IN_TEMPLATES = [
  {
    id: 'builtin-next-steps',
    name: 'Next steps',
    subject: 'Next steps for {{jobTitle}} at {{company}}',
    body: 'Hi {{firstName}},\n\nThank you for applying for {{jobTitle}}. We liked your application and would like to move you to the next step. We will contact you soon with details.\n\nBest wishes,\n{{company}}',
  },
  {
    id: 'builtin-documents',
    name: 'Request documents',
    subject: 'Documents needed — {{jobTitle}}',
    body: 'Hi {{firstName}},\n\nTo continue with your application for {{jobTitle}}, please reply to this email with:\n- A valid ID\n- Copies of your certificates or licences\n- Two references\n\nThank you,\n{{company}}',
  },
  {
    id: 'builtin-on-hold',
    name: 'Application on hold',
    subject: 'Update on your application — {{jobTitle}}',
    body: 'Hi {{firstName}},\n\nThank you for your patience. We are still reviewing applications for {{jobTitle}} and will update you as soon as we can.\n\nKind regards,\n{{company}}',
  },
];

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

function render(text: string, vars: Record<string, string>) {
  return text.replace(/\{\{\s*(firstName|name|jobTitle|company)\s*\}\}/g, (_, key: string) => vars[key] ?? '');
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

@Injectable()
export class AtsToolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AtsAccessService,
    private readonly applications: ApplicationsService,
    private readonly email: EmailService,
    private readonly ops: OpsService,
    private readonly apiKeys: ApiKeysService,
    private readonly webhooks: WebhooksService,
  ) {}

  // ------------------------------------------------------------------ reports

  async reports(orgId: string, user: AuthUser, days = 90) {
    const access = await this.access.require(orgId, user, WorkspaceRole.RECRUITER);
    const window = Math.min(Math.max(days, 7), 365);
    const since = new Date(Date.now() - window * DAY);

    const [apps, jobs] = await Promise.all([
      this.prisma.application.findMany({
        where: { organizationId: orgId, createdAt: { gte: since } },
        select: { id: true, jobId: true, source: true, status: true, stage: true, createdAt: true, stageChangedAt: true, aiScore: true },
      }),
      this.prisma.job.findMany({ where: { organizationId: orgId }, select: { id: true, title: true, status: true, stages: true, publishedAt: true, createdAt: true } }),
    ]);
    const ids = apps.map((a) => a.id);
    const [interviews, offers] = await Promise.all([
      this.prisma.interview.findMany({ where: { applicationId: { in: ids }, status: { not: 'CANCELLED' } }, select: { applicationId: true } }),
      this.prisma.offer.findMany({
        where: { applicationId: { in: ids }, status: { in: [OfferStatus.SENT, OfferStatus.ACCEPTED, OfferStatus.DECLINED] } },
        select: { applicationId: true, status: true },
      }),
    ]);
    const interviewed = new Set(interviews.map((i) => i.applicationId));
    const offered = new Set(offers.map((o) => o.applicationId));
    const jobById = new Map(jobs.map((j) => [j.id, j]));
    const movedOn = apps.filter((a) => {
      const stages = jobById.get(a.jobId)?.stages ?? [];
      return stages.indexOf(a.stage) > 0 || interviewed.has(a.id) || offered.has(a.id);
    });
    const hired = apps.filter((a) => a.status === ApplicationStatus.HIRED);
    const hireDays = hired.map((a) => (a.stageChangedAt.getTime() - a.createdAt.getTime()) / DAY);

    const sources = new Map<string, { applied: number; hired: number }>();
    for (const app of apps) {
      const entry = sources.get(app.source) ?? { applied: 0, hired: 0 };
      entry.applied += 1;
      if (app.status === ApplicationStatus.HIRED) entry.hired += 1;
      sources.set(app.source, entry);
    }

    const weeks = Math.min(12, Math.ceil(window / 7));
    const weekly = Array.from({ length: weeks }, (_, i) => {
      const end = Date.now() - (weeks - 1 - i) * 7 * DAY;
      const start = end - 7 * DAY;
      return {
        weekStart: new Date(start).toISOString().slice(0, 10),
        applications: apps.filter((a) => a.createdAt.getTime() >= start && a.createdAt.getTime() < end).length,
      };
    });

    const scored = apps.filter((a) => a.aiScore !== null);
    const byJob = jobs
      .filter((j) => j.status === JobStatus.OPEN || apps.some((a) => a.jobId === j.id))
      .map((j) => {
        const list = apps.filter((a) => a.jobId === j.id);
        return {
          id: j.id,
          title: j.title,
          status: j.status,
          applications: list.length,
          inProgress: list.filter((a) => a.status === ApplicationStatus.ACTIVE).length,
          hired: list.filter((a) => a.status === ApplicationStatus.HIRED).length,
          daysOpen: j.publishedAt ? Math.floor((Date.now() - j.publishedAt.getTime()) / DAY) : null,
        };
      })
      .sort((a, b) => b.applications - a.applications);

    return {
      days: window,
      totals: {
        applications: apps.length,
        inProgress: apps.filter((a) => a.status === ApplicationStatus.ACTIVE).length,
        hired: hired.length,
        rejected: apps.filter((a) => a.status === ApplicationStatus.REJECTED).length,
        openJobs: jobs.filter((j) => j.status === JobStatus.OPEN).length,
        avgAiScore: scored.length ? Math.round(scored.reduce((s, a) => s + (a.aiScore ?? 0), 0) / scored.length) : null,
      },
      funnel: [
        { step: 'Applied', count: apps.length },
        { step: 'Moved past first step', count: movedOn.length },
        { step: 'Interviewed', count: interviewed.size },
        { step: 'Offered', count: offered.size },
        { step: 'Hired', count: hired.length },
      ],
      timeToHire: {
        averageDays: hireDays.length ? Math.round((hireDays.reduce((s, d) => s + d, 0) / hireDays.length) * 10) / 10 : null,
        medianDays: hireDays.length ? Math.round((median(hireDays) ?? 0) * 10) / 10 : null,
      },
      offers: {
        sent: offers.length,
        accepted: offers.filter((o) => o.status === OfferStatus.ACCEPTED).length,
      },
      sources: [...sources.entries()].map(([source, v]) => ({ source, ...v })).sort((a, b) => b.applied - a.applied),
      weekly,
      jobs: byJob,
      limits: { openJobs: jobs.filter((j) => j.status === JobStatus.OPEN).length, maxOpenJobs: access.organization.maxOpenJobs, plan: access.organization.plan },
    };
  }

  // ---------------------------------------------------------- email templates

  async templates(orgId: string, user: AuthUser) {
    await this.access.require(orgId, user, WorkspaceRole.RECRUITER);
    const custom = await this.prisma.atsEmailTemplate.findMany({ where: { organizationId: orgId }, orderBy: { name: 'asc' } });
    return [...custom.map((t) => ({ ...t, builtIn: false })), ...BUILT_IN_TEMPLATES.map((t) => ({ ...t, builtIn: true }))];
  }

  async createTemplate(orgId: string, input: EmailTemplateInput, user: AuthUser) {
    await this.access.require(orgId, user, WorkspaceRole.RECRUITER);
    const count = await this.prisma.atsEmailTemplate.count({ where: { organizationId: orgId } });
    if (count >= 50) throw new BadRequestException('A workspace can keep 50 templates');
    return this.prisma.atsEmailTemplate.create({ data: { ...input, organizationId: orgId, createdById: user.id } });
  }

  async updateTemplate(orgId: string, id: string, input: EmailTemplateInput, user: AuthUser) {
    await this.access.require(orgId, user, WorkspaceRole.RECRUITER);
    await this.requireTemplate(orgId, id);
    return this.prisma.atsEmailTemplate.update({ where: { id }, data: input });
  }

  async deleteTemplate(orgId: string, id: string, user: AuthUser) {
    await this.access.require(orgId, user, WorkspaceRole.RECRUITER);
    await this.requireTemplate(orgId, id);
    await this.prisma.atsEmailTemplate.delete({ where: { id } });
    return { ok: true };
  }

  private async requireTemplate(orgId: string, id: string) {
    if (!isObjectId(id)) throw new NotFoundException('Template not found');
    const template = await this.prisma.atsEmailTemplate.findFirst({ where: { id, organizationId: orgId } });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  /** Sends one personal email per applicant; each send is recorded on their timeline. */
  async bulkEmail(orgId: string, input: BulkEmailInput, user: AuthUser) {
    const access = await this.access.require(orgId, user, WorkspaceRole.RECRUITER);
    const apps = await this.prisma.application.findMany({
      where: { id: { in: input.applicationIds.filter(isObjectId) }, organizationId: orgId },
      include: { job: { select: { title: true } } },
    });
    if (!apps.length) throw new NotFoundException('No applicants found');
    for (const app of apps) {
      const vars = { firstName: app.name.split(/\s+/)[0], name: app.name, jobTitle: app.job.title, company: access.organization.name };
      const subject = render(input.subject, vars);
      const body = render(input.body, vars);
      void this.email
        .send({
          to: app.email,
          subject,
          text: body,
          html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#0b1f1e;line-height:1.6">${escapeHtml(body)
            .split(/\n{2,}/)
            .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
            .join('')}<p style="color:#5b6f6e;font-size:12px;margin-top:32px">Sent with Dealo ATS</p></div>`,
        })
        .catch(() => undefined);
      await this.applications.event(app, 'EMAIL_SENT', access, { body: subject });
    }
    return { sent: apps.length };
  }

  // --------------------------------------------------------- hired → Workforce

  async placeHire(orgId: string, applicationId: string, input: PlacementFromApplicationInput, user: AuthUser) {
    const { access, application } = await this.applications.requireApplication(orgId, applicationId, user, WorkspaceRole.RECRUITER);
    if (application.status !== ApplicationStatus.HIRED) throw new BadRequestException('Mark this person as hired first');

    const byUser = application.userId ? await this.prisma.candidate.findUnique({ where: { userId: application.userId } }) : null;
    const candidate =
      byUser ??
      (await this.prisma.candidate.findFirst({ where: { email: application.email } })) ??
      (await this.prisma.candidate.create({
        data: {
          fullName: application.name,
          email: application.email,
          phone: application.phone,
          location: application.location,
          roleTitle: application.job.title,
          roleFamily: application.job.roleFamily,
          notes: `Hired through Dealo ATS (${access.organization.name})`,
        },
      }));

    const placement = await this.ops.addPlacement(
      input.siteId,
      { candidateId: candidate.id, roleTitle: input.roleTitle ?? application.job.title, isStandby: input.isStandby, startDate: input.startDate },
      user,
    );
    await this.applications.event(application, 'PLACED', access, { body: `Added to a Workforce site${input.isStandby ? ' as standby' : ''}`, meta: { placementId: placement.id, siteId: input.siteId } });
    return { placementId: placement.id, candidateId: candidate.id };
  }

  // ------------------------------------------------------------- integrations

  async integrations(orgId: string, user: AuthUser) {
    await this.access.require(orgId, user, WorkspaceRole.ADMIN);
    const [keys, webhooks] = await Promise.all([this.apiKeys.listWorkspaceKeys(orgId), this.webhooks.listForWorkspace(orgId)]);
    return { keys, webhooks };
  }

  async createKey(orgId: string, name: string, user: AuthUser) {
    const access = await this.access.require(orgId, user, WorkspaceRole.ADMIN);
    if (access.support) throw new BadRequestException('Support access cannot create keys');
    return this.apiKeys.createWorkspaceKey(orgId, name, user.id);
  }

  async revokeKey(orgId: string, id: string, user: AuthUser) {
    await this.access.require(orgId, user, WorkspaceRole.ADMIN);
    if (!isObjectId(id)) throw new NotFoundException('API key not found');
    return this.apiKeys.revokeWorkspaceKey(orgId, id);
  }

  async createWebhook(orgId: string, input: WorkspaceWebhookInput, user: AuthUser) {
    await this.access.require(orgId, user, WorkspaceRole.ADMIN);
    return this.webhooks.createForWorkspace(orgId, input, user.id);
  }

  async removeWebhook(orgId: string, id: string, user: AuthUser) {
    await this.access.require(orgId, user, WorkspaceRole.ADMIN);
    if (!isObjectId(id)) throw new NotFoundException('Webhook not found');
    return this.webhooks.removeForWorkspace(orgId, id);
  }

  async testWebhook(orgId: string, id: string, user: AuthUser) {
    await this.access.require(orgId, user, WorkspaceRole.ADMIN);
    if (!isObjectId(id)) throw new NotFoundException('Webhook not found');
    return this.webhooks.testForWorkspace(orgId, id);
  }
}
