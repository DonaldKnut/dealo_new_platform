import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebhookEvent, type OfferInput, type ScheduleInterviewInput, type ScorecardInput } from '@dealo/shared';
import {
  ApplicationStatus,
  InterviewStatus,
  OfferStatus,
  Prisma,
  WorkspaceRole,
  type Application,
  type Interview,
  type Job,
} from '@prisma/client';
import { createHash, randomBytes } from 'crypto';

import type { AuthUser } from '../auth/auth.types';
import { assertEmailVerified } from '../auth/verified-email';
import type { AppEnv } from '../config/env.validation';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { ApplicationsService, applicationPayload } from './applications.service';
import { AtsAccessService, isObjectId, type WorkspaceAccess } from './ats-access.service';
import {
  interviewCancelledEmail,
  interviewInviteEmail,
  offerEmail,
  offerResponseEmail,
  teamNoticeEmail,
} from './ats-emails';
import { buildIcs, lagosTime } from './ics';

const hash = (token: string) => createHash('sha256').update(token).digest('hex');
const newToken = () => randomBytes(24).toString('base64url');
const OFFER_TTL_DAYS = 14;

type AppWithJob = Application & { job: Job };

@Injectable()
export class HiringService {
  private readonly appUrl: string;
  private readonly organizerEmail: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AtsAccessService,
    private readonly applications: ApplicationsService,
    private readonly email: EmailService,
    private readonly webhooks: WebhooksService,
    config: ConfigService<AppEnv, true>,
  ) {
    this.appUrl = config.get('APP_URL', { infer: true }).replace(/\/$/, '');
    const from = config.get('EMAIL_FROM', { infer: true });
    this.organizerEmail = from.match(/<([^>]+)>/)?.[1] ?? from;
  }

  private send(input: Parameters<EmailService['send']>[0]) {
    void this.email.send(input).catch(() => undefined);
  }

  private boardLink(app: Pick<Application, 'jobId'>) {
    return `${this.appUrl}/dashboard/ats/jobs/${app.jobId}`;
  }

  private async members(orgId: string, userIds: string[]) {
    if (!userIds.length) return [];
    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId: orgId, userId: { in: userIds } },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });
    return members.map((m) => ({ id: m.user.id, email: m.user.email, name: `${m.user.firstName} ${m.user.lastName}`.trim() || m.user.email }));
  }

  private ics(interview: Interview, app: AppWithJob, orgName: string, people: { name: string; email: string }[], method: 'REQUEST' | 'CANCEL') {
    if (!interview.startsAt) return undefined;
    return buildIcs({
      uid: `interview-${interview.id}@dealo`,
      method,
      start: interview.startsAt,
      durationMin: interview.durationMin,
      summary: `Interview: ${app.name} — ${app.job.title} (${orgName})`,
      description: `${interview.kind === 'PHONE' ? 'Phone call' : interview.kind === 'IN_PERSON' ? 'In person' : 'Video call'} for ${app.job.title}.${interview.location ? ` ${interview.location}` : ''}`,
      location: interview.location,
      organizerEmail: this.organizerEmail,
      attendees: [{ name: app.name, email: app.email }, ...people],
      sequence: Math.floor(interview.updatedAt.getTime() / 1000),
    });
  }

  private async notifyScheduled(interview: Interview, app: AppWithJob, access: { organization: { name: string } }) {
    const people = await this.members(app.organizationId, interview.interviewerIds);
    const ics = this.ics(interview, app, access.organization.name, people, 'REQUEST');
    const whenText = interview.startsAt ? lagosTime(interview.startsAt) : '';
    this.send(
      interviewInviteEmail({
        to: app.email,
        name: app.name,
        jobTitle: app.job.title,
        orgName: access.organization.name,
        whenText,
        kind: interview.kind,
        location: interview.location,
        ics,
      }),
    );
    for (const person of people) {
      this.send(
        teamNoticeEmail({
          to: person.email,
          subject: `Interview: ${app.name} — ${whenText}`,
          title: 'You are interviewing',
          lines: [`${app.name} for ${app.job.title}`, `When: ${whenText}`, interview.location ? `Where: ${interview.location}` : ''].filter(Boolean),
          link: this.boardLink(app),
          ics,
        }),
      );
    }
  }

  // -------------------------------------------------------------- interviews

  async schedule(orgId: string, applicationId: string, input: ScheduleInterviewInput, user: AuthUser) {
    const { access, application } = await this.applications.requireApplication(orgId, applicationId, user, WorkspaceRole.RECRUITER);
    if (application.status !== ApplicationStatus.ACTIVE) throw new BadRequestException('This person is not in the pipeline');
    const interviewerIds = (await this.members(orgId, input.interviewerIds.filter(isObjectId))).map((m) => m.id);

    const now = Date.now();
    const slots = (input.slotOptions ?? []).map((s) => new Date(s)).filter((d) => d.getTime() > now);
    if (!input.startsAt && !slots.length) throw new BadRequestException('Pick at least one time in the future');
    if (input.startsAt && new Date(input.startsAt).getTime() < now - 60_000) throw new BadRequestException('Pick a time in the future');

    const token = input.startsAt ? null : newToken();
    const interview = await this.prisma.interview.create({
      data: {
        organizationId: orgId,
        applicationId,
        kind: input.kind,
        durationMin: input.durationMin,
        location: input.location,
        notes: input.notes,
        interviewerIds,
        createdById: user.id,
        ...(input.startsAt
          ? { status: InterviewStatus.SCHEDULED, startsAt: new Date(input.startsAt) }
          : { status: InterviewStatus.PROPOSED, slotOptions: slots.sort((a, b) => a.getTime() - b.getTime()), bookingTokenHash: hash(token!) }),
      },
    });

    if (token) {
      const link = `${this.appUrl}/book/${token}`;
      this.send(
        interviewInviteEmail({
          to: application.email,
          name: application.name,
          jobTitle: application.job.title,
          orgName: access.organization.name,
          kind: interview.kind,
          bookingLink: link,
        }),
      );
      await this.applications.event(application, 'INTERVIEW_PROPOSED', access, {
        body: `${slots.length} time${slots.length === 1 ? '' : 's'} offered. Waiting for ${application.name} to pick.`,
        meta: { interviewId: interview.id },
      });
      const { bookingTokenHash: _hash, ...safe } = interview;
      return { ...safe, bookingLink: link };
    }

    await this.notifyScheduled(interview, application, access);
    await this.applications.event(application, 'INTERVIEW_SCHEDULED', access, {
      body: `${lagosTime(interview.startsAt!)} · ${interview.kind.replace('_', ' ').toLowerCase()}`,
      meta: { interviewId: interview.id },
    });
    const { bookingTokenHash: _hash, ...safe } = interview;
    return safe;
  }

  async updateInterview(
    orgId: string,
    interviewId: string,
    input: { status?: 'CANCELLED' | 'COMPLETED'; startsAt?: string },
    user: AuthUser,
  ) {
    const access = await this.access.require(orgId, user, WorkspaceRole.RECRUITER);
    if (!isObjectId(interviewId)) throw new NotFoundException('Interview not found');
    const interview = await this.prisma.interview.findFirst({
      where: { id: interviewId, organizationId: orgId },
      include: { application: { include: { job: true } } },
    });
    if (!interview) throw new NotFoundException('Interview not found');
    const app = interview.application;
    if (input.startsAt || input.status === 'CANCELLED') await assertEmailVerified(this.prisma, user);

    if (input.startsAt) {
      const startsAt = new Date(input.startsAt);
      if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() < Date.now()) throw new BadRequestException('Pick a time in the future');
      const updated = await this.prisma.interview.update({
        where: { id: interviewId },
        data: { startsAt, status: InterviewStatus.SCHEDULED, bookingTokenHash: null },
      });
      await this.notifyScheduled(updated, app, access);
      await this.applications.event(app, 'INTERVIEW_SCHEDULED', access, { body: `Moved to ${lagosTime(startsAt)}`, meta: { interviewId } });
      return { ok: true };
    }

    if (input.status === 'CANCELLED') {
      const updated = await this.prisma.interview.update({
        where: { id: interviewId },
        data: { status: InterviewStatus.CANCELLED, bookingTokenHash: null },
      });
      const people = await this.members(orgId, interview.interviewerIds);
      this.send(
        interviewCancelledEmail({
          to: app.email,
          name: app.name,
          jobTitle: app.job.title,
          orgName: access.organization.name,
          ics: this.ics(updated, app, access.organization.name, people, 'CANCEL'),
        }),
      );
      await this.applications.event(app, 'INTERVIEW_CANCELLED', access, { meta: { interviewId } });
      return { ok: true };
    }

    if (input.status === 'COMPLETED') {
      await this.prisma.interview.update({ where: { id: interviewId }, data: { status: InterviewStatus.COMPLETED } });
      await this.applications.event(app, 'INTERVIEW_COMPLETED', access, { body: 'Ask interviewers to add their scorecards.', meta: { interviewId } });
      return { ok: true };
    }
    throw new BadRequestException('Nothing to change');
  }

  /** Upcoming and recent interviews for the workspace Interviews tab. */
  async listInterviews(orgId: string, user: AuthUser) {
    const access = await this.access.require(orgId, user);
    const since = new Date(Date.now() - 7 * 86_400_000);
    const interviews = await this.prisma.interview.findMany({
      where: {
        organizationId: orgId,
        status: { in: [InterviewStatus.SCHEDULED, InterviewStatus.PROPOSED, InterviewStatus.COMPLETED] },
        OR: [{ startsAt: { gte: since } }, { startsAt: { isSet: false } }, { startsAt: null }],
      },
      include: { application: { select: { id: true, name: true, jobId: true, job: { select: { title: true, hiringManagerIds: true } } } } },
      orderBy: { startsAt: 'asc' },
      take: 300,
    });
    const visible =
      access.role === WorkspaceRole.HIRING_MANAGER
        ? interviews.filter((i) => i.interviewerIds.includes(user.id) || i.application.job.hiringManagerIds.includes(user.id))
        : interviews;
    const people = await this.members(orgId, [...new Set(visible.flatMap((i) => i.interviewerIds))]);
    return visible.map(({ bookingTokenHash: _b, application, ...interview }) => ({
      ...interview,
      applicant: { id: application.id, name: application.name, jobId: application.jobId, jobTitle: application.job.title },
      interviewers: people.filter((p) => interview.interviewerIds.includes(p.id)).map((p) => p.name),
      mine: interview.interviewerIds.includes(user.id),
    }));
  }

  // ----------------------------------------------------------- self-booking

  private async interviewByToken(token: string) {
    const interview = await this.prisma.interview.findFirst({
      where: { bookingTokenHash: hash(token) },
      include: { application: { include: { job: true } } },
    });
    if (!interview) throw new NotFoundException('This booking link has expired');
    const organization = await this.prisma.organization.findUnique({ where: { id: interview.organizationId } });
    if (!organization?.isActive) throw new NotFoundException('This booking link has expired');
    return { interview, organization };
  }

  async bookingPreview(token: string) {
    const { interview, organization } = await this.interviewByToken(token);
    const now = Date.now();
    return {
      organization: { name: organization.name, logoUrl: organization.logoUrl, brandColor: organization.brandColor },
      jobTitle: interview.application.job.title,
      firstName: interview.application.name.split(/\s+/)[0],
      kind: interview.kind,
      durationMin: interview.durationMin,
      location: interview.location,
      status: interview.status,
      startsAt: interview.startsAt,
      options: interview.slotOptions.filter((d) => d.getTime() > now),
    };
  }

  async book(token: string, startsAt: string) {
    const { interview, organization } = await this.interviewByToken(token);
    if (interview.status !== InterviewStatus.PROPOSED) throw new ConflictException('This interview is already booked');
    const chosen = interview.slotOptions.find((d) => d.toISOString() === new Date(startsAt).toISOString());
    if (!chosen || chosen.getTime() < Date.now()) throw new BadRequestException('That time is no longer available');

    const updated = await this.prisma.interview.update({
      where: { id: interview.id },
      data: { startsAt: chosen, status: InterviewStatus.SCHEDULED },
    });
    const app = interview.application;
    await this.notifyScheduled(updated, app, { organization });
    await this.applications.event(app, 'INTERVIEW_BOOKED', undefined, { body: `${app.name} picked ${lagosTime(chosen)}`, meta: { interviewId: interview.id } });

    const creator = await this.prisma.user.findUnique({ where: { id: interview.createdById }, select: { email: true } });
    if (creator && !interview.interviewerIds.includes(interview.createdById)) {
      this.send(
        teamNoticeEmail({
          to: creator.email,
          subject: `${app.name} booked an interview — ${lagosTime(chosen)}`,
          title: 'Interview booked',
          lines: [`${app.name} picked ${lagosTime(chosen)} for ${app.job.title}.`],
          link: this.boardLink(app),
        }),
      );
    }
    return { startsAt: chosen, status: updated.status };
  }

  // -------------------------------------------------------------- scorecards

  async submitScorecard(orgId: string, applicationId: string, input: ScorecardInput, user: AuthUser) {
    const { access, application } = await this.applications.requireApplication(orgId, applicationId, user);
    const data = {
      rating: input.rating,
      recommendation: input.recommendation,
      criteria: (input.criteria ?? undefined) as Prisma.InputJsonValue | undefined,
      notes: input.notes,
      reviewerName: access.userName,
    };
    const card = await this.prisma.scorecard.upsert({
      where: { applicationId_reviewerId: { applicationId, reviewerId: user.id } },
      update: data,
      create: { ...data, organizationId: orgId, applicationId, reviewerId: user.id },
    });
    const word = { YES: 'Yes, hire', MAYBE: 'Maybe', NO: 'No' }[input.recommendation];
    await this.applications.event(application, 'SCORECARD', access, { body: `${input.rating}/5 · ${word}` });
    return card;
  }

  // ------------------------------------------------------------------ offers

  async createOffer(orgId: string, applicationId: string, input: OfferInput & { send?: boolean }, user: AuthUser) {
    const { access, application } = await this.applications.requireApplication(orgId, applicationId, user, WorkspaceRole.RECRUITER);
    if (application.status !== ApplicationStatus.ACTIVE) throw new BadRequestException('This person is not in the pipeline');
    const startDate = new Date(input.startDate);
    if (Number.isNaN(startDate.getTime())) throw new BadRequestException('Pick a start date');
    if (input.send) await assertEmailVerified(this.prisma, user);

    await this.prisma.offer.updateMany({
      where: { applicationId, status: { in: [OfferStatus.DRAFT, OfferStatus.SENT] } },
      data: { status: OfferStatus.WITHDRAWN, responseTokenHash: null },
    });
    const offer = await this.prisma.offer.create({
      data: {
        organizationId: orgId,
        applicationId,
        payMinor: input.payMinor,
        currency: input.currency,
        payPeriod: input.payPeriod,
        startDate,
        notes: input.notes,
        createdById: user.id,
      },
    });
    if (input.send) return this.sendOffer(orgId, offer.id, user, { access, application });
    return this.safeOffer(offer);
  }

  async sendOffer(orgId: string, offerId: string, user: AuthUser, ctx?: { access: WorkspaceAccess; application: AppWithJob }) {
    const access = ctx?.access ?? (await this.access.require(orgId, user, WorkspaceRole.RECRUITER));
    const offer = await this.requireOffer(orgId, offerId);
    if (offer.status !== OfferStatus.DRAFT && offer.status !== OfferStatus.SENT) throw new BadRequestException('This offer can no longer be sent');
    const application = ctx?.application ?? (await this.prisma.application.findUniqueOrThrow({ where: { id: offer.applicationId }, include: { job: true } }));

    const token = newToken();
    const sent = await this.prisma.offer.update({
      where: { id: offer.id },
      data: { status: OfferStatus.SENT, sentAt: new Date(), responseTokenHash: hash(token) },
    });
    const offerStage = application.job.stages.find((s) => s.toLowerCase() === 'offer');
    if (offerStage && application.stage !== offerStage) {
      await this.prisma.application.update({ where: { id: application.id }, data: { stage: offerStage, stageChangedAt: new Date() } });
    }
    const link = `${this.appUrl}/offer/${token}`;
    this.send(offerEmail({ to: application.email, name: application.name, jobTitle: application.job.title, orgName: access.organization.name, link }));
    await this.applications.event(application, 'OFFER_SENT', access, {
      body: `${this.money(sent.payMinor, sent.currency)} per ${sent.payPeriod.toLowerCase()} · starts ${sent.startDate.toDateString()}`,
      meta: { offerId: sent.id },
    });
    return { ...this.safeOffer(sent), link };
  }

  async withdrawOffer(orgId: string, offerId: string, user: AuthUser) {
    const access = await this.access.require(orgId, user, WorkspaceRole.RECRUITER);
    const offer = await this.requireOffer(orgId, offerId);
    if (offer.status === OfferStatus.ACCEPTED || offer.status === OfferStatus.DECLINED) throw new BadRequestException('The candidate already replied');
    const updated = await this.prisma.offer.update({ where: { id: offerId }, data: { status: OfferStatus.WITHDRAWN, responseTokenHash: null } });
    const application = await this.prisma.application.findUniqueOrThrow({ where: { id: offer.applicationId } });
    await this.applications.event(application, 'OFFER_WITHDRAWN', access, { meta: { offerId } });
    return this.safeOffer(updated);
  }

  private async offerByToken(token: string) {
    const offer = await this.prisma.offer.findFirst({
      where: { responseTokenHash: hash(token) },
      include: { application: { include: { job: true } } },
    });
    if (!offer) throw new NotFoundException('This offer link is not valid');
    const organization = await this.prisma.organization.findUnique({ where: { id: offer.organizationId } });
    if (!organization?.isActive) throw new NotFoundException('This offer link is not valid');
    const expired = offer.status === OfferStatus.SENT && offer.sentAt && Date.now() - offer.sentAt.getTime() > OFFER_TTL_DAYS * 86_400_000;
    return { offer, organization, expired: Boolean(expired) };
  }

  async offerPreview(token: string) {
    const { offer, organization, expired } = await this.offerByToken(token);
    return {
      organization: { name: organization.name, logoUrl: organization.logoUrl, brandColor: organization.brandColor, website: organization.website },
      jobTitle: offer.application.job.title,
      location: offer.application.job.location,
      firstName: offer.application.name.split(/\s+/)[0],
      payMinor: offer.payMinor,
      currency: offer.currency,
      payPeriod: offer.payPeriod,
      startDate: offer.startDate,
      notes: offer.notes,
      status: expired ? 'EXPIRED' : offer.status,
      respondedAt: offer.respondedAt,
    };
  }

  async respondToOffer(token: string, decision: 'ACCEPTED' | 'DECLINED', note?: string) {
    const { offer, organization, expired } = await this.offerByToken(token);
    if (offer.status !== OfferStatus.SENT) throw new ConflictException('You already replied to this offer');
    if (expired) throw new BadRequestException('This offer has expired. Please contact the company.');

    const updated = await this.prisma.offer.update({
      where: { id: offer.id },
      data: { status: decision === 'ACCEPTED' ? OfferStatus.ACCEPTED : OfferStatus.DECLINED, respondedAt: new Date(), responseNote: note },
    });
    const app = offer.application;
    if (decision === 'ACCEPTED') {
      const hiredStage = app.job.stages[app.job.stages.length - 1];
      const hired = await this.prisma.application.update({
        where: { id: app.id },
        data: { status: ApplicationStatus.HIRED, stage: hiredStage, stageChangedAt: new Date() },
      });
      this.webhooks.dispatchWorkspaceEvent(WebhookEvent.OFFER_ACCEPTED, offer.organizationId, {
        ...applicationPayload(hired, app.job),
        offer: { id: offer.id, payMinor: offer.payMinor, currency: offer.currency, payPeriod: offer.payPeriod, startDate: offer.startDate.toISOString() },
      });
    }
    await this.applications.event(app, decision === 'ACCEPTED' ? 'OFFER_ACCEPTED' : 'OFFER_DECLINED', undefined, {
      body: note ? `“${note}”` : undefined,
      meta: { offerId: offer.id },
    });

    const creator = await this.prisma.user.findUnique({ where: { id: offer.createdById }, select: { email: true } });
    if (creator) this.send(offerResponseEmail({ to: creator.email, candidateName: app.name, jobTitle: app.job.title, decision }));
    return { status: updated.status, organization: organization.name };
  }

  private async requireOffer(orgId: string, offerId: string) {
    if (!isObjectId(offerId)) throw new NotFoundException('Offer not found');
    const offer = await this.prisma.offer.findFirst({ where: { id: offerId, organizationId: orgId } });
    if (!offer) throw new NotFoundException('Offer not found');
    return offer;
  }

  private safeOffer<T extends { responseTokenHash: string | null }>(offer: T) {
    const { responseTokenHash: _r, ...rest } = offer;
    return rest;
  }

  private money(minor: number, currency: string) {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(minor / 100);
  }
}
