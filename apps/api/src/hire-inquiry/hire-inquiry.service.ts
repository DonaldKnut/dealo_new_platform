import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { HireInquiryInput, HireInquiryStatusUpdate } from '@dealo/shared';
import { PermissionCode, WebhookEvent } from '@dealo/shared';
import { UserRole, type HireInquiry, type HireInquiryStatus } from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { AuditLogService } from '../common/audit-log.service';
import { normalizeEmail } from '../common/normalize-email';
import type { AppEnv } from '../config/env.validation';
import { EmailService } from '../email/email.service';
import { hireInquiryAckEmail, hireInquiryStaffEmail } from '../email/email.templates';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { WebhooksService } from '../webhooks/webhooks.service';

const STATUS_LABEL: Record<HireInquiryStatus, string> = {
  NEW: 'received',
  CONTACTED: 'in progress: we have contacted you',
  QUALIFIED: 'qualified: we are finding people',
  CONVERTED: 'filled',
  CLOSED: 'closed',
};

@Injectable()
export class HireInquiryService {
  private readonly logger = new Logger(HireInquiryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly emailService: EmailService,
    private readonly webhooks: WebhooksService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService<AppEnv, true>,
  ) {}

  async create(input: HireInquiryInput, principal?: AuthUser) {
    const email = normalizeEmail(input.email);
    const viaApiKey = principal?.authType === 'api_key' ? principal : undefined;
    const signedIn = principal?.authType === 'jwt' ? principal : undefined;
    const isTest = viaApiKey?.apiKeyEnvironment === 'TEST';
    // A request sent from the dashboard belongs to the sender's company, so the whole team sees it.
    const membership = signedIn
      ? await this.prisma.organizationMember.findFirst({ where: { userId: signedIn.id }, orderBy: { createdAt: 'asc' }, select: { organizationId: true } })
      : null;

    const inquiry = await this.prisma.hireInquiry.create({
      data: {
        companyName: input.companyName,
        contactName: input.contactName,
        email,
        phone: input.phone,
        roleFamily: input.roleFamily,
        serviceType: input.serviceType,
        roleTitle: input.roleTitle,
        numberOfProfessionals: input.numberOfProfessionals,
        location: input.location,
        workArrangement: input.workArrangement,
        expectedStartDate: input.expectedStartDate,
        compensationMinMinor: input.compensationMinMinor,
        compensationMaxMinor: input.compensationMaxMinor,
        currency: input.currency,
        durationNotes: input.durationNotes,
        requirements: input.requirements,
        additionalNotes: input.additionalNotes,
        apiKeyId: viaApiKey?.apiKeyId ?? null,
        organizationId: viaApiKey?.organizationId ?? membership?.organizationId ?? null,
        isTest,
      },
    });

    await this.auditLog.record({
      action: 'HIRE_INQUIRY_CREATED',
      entityType: 'HireInquiry',
      entityId: inquiry.id,
      metadata: {
        companyName: inquiry.companyName,
        roleFamily: inquiry.roleFamily,
        serviceType: inquiry.serviceType,
        roleTitle: inquiry.roleTitle,
        apiKeyId: inquiry.apiKeyId,
        isTest,
      },
    });

    this.webhooks.dispatchHireInquiryEvent(WebhookEvent.HIRE_INQUIRY_CREATED, inquiry);

    // Sandbox submissions must never email real addresses.
    if (!isTest) {
      await this.emailService.send(
        hireInquiryAckEmail({
          to: inquiry.email,
          contactName: inquiry.contactName,
          roleTitle: inquiry.roleTitle,
        }),
      );
      const people = `${inquiry.numberOfProfessionals} ${inquiry.numberOfProfessionals === 1 ? 'person' : 'people'}`;
      const quote =
        inquiry.serviceType === 'CONTRACT_COVER' || inquiry.serviceType === 'TALENT_TRAINING';
      const serviceLabel =
        inquiry.serviceType === 'CONTRACT_COVER'
          ? 'Temp & contract cover'
          : inquiry.serviceType === 'TALENT_TRAINING'
            ? 'Training after hire'
            : inquiry.serviceType === 'MANAGED_STAFFING'
              ? 'Managed staffing'
              : 'Direct hiring';
      await this.notifications.notifyStaff({
        type: 'hire_request.created',
        title: quote
          ? `Quote request · ${serviceLabel}: ${inquiry.roleTitle}`
          : `New talent request: ${inquiry.roleTitle}`,
        body: quote
          ? `${inquiry.companyName} asked for a ${serviceLabel.toLowerCase()} quote · ${people} · ${inquiry.location}.`
          : `${inquiry.companyName} needs ${people} in ${inquiry.location}.`,
        link: '/dashboard/requests',
      });
      await this.notifications.notifyEmails([inquiry.email], {
        type: 'hire_request.received',
        title: quote
          ? `We got your quote request for ${inquiry.roleTitle}`
          : `We got your request for ${inquiry.roleTitle}`,
        body: quote
          ? 'Dealo will send a clear quote within 48 hours — no public list prices for cover or training.'
          : 'Dealo will contact you within 48 hours with next steps.',
        link: '/dashboard/requests',
      });
      await this.emailStaff(inquiry);
    }

    return {
      id: inquiry.id,
      status: inquiry.status,
      isTest,
      message: isTest
        ? 'Sandbox hiring request recorded (test data, no email sent).'
        : 'Your hiring request has been submitted successfully.',
    };
  }

  async list(principal?: AuthUser) {
    if (principal?.authType === 'api_key') {
      return this.prisma.hireInquiry.findMany({
        where: {
          OR: [
            { apiKeyId: principal.apiKeyId },
            ...(principal.organizationId ? [{ organizationId: principal.organizationId }] : []),
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
    }

    return this.prisma.hireInquiry.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async updateStatus(id: string, input: HireInquiryStatusUpdate, actorId?: string) {
    const existing = await this.prisma.hireInquiry.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Hire inquiry not found');

    const inquiry = await this.prisma.hireInquiry.update({
      where: { id },
      data: { status: input.status as HireInquiryStatus },
    });

    await this.auditLog.record({
      action: 'HIRE_INQUIRY_STATUS_UPDATED',
      entityType: 'HireInquiry',
      entityId: inquiry.id,
      actorId,
      metadata: { from: existing.status, to: inquiry.status },
    });

    if (existing.status !== inquiry.status) {
      this.webhooks.dispatchHireInquiryEvent(WebhookEvent.HIRE_INQUIRY_STATUS_UPDATED, inquiry, {
        previousStatus: existing.status,
      });
      if (!inquiry.isTest) {
        await this.notifications.notifyEmails([inquiry.email], {
          type: 'hire_request.status',
          title: `Your request for ${inquiry.roleTitle} is ${STATUS_LABEL[inquiry.status]}`,
          body: inquiry.companyName,
          link: '/dashboard/requests',
        });
      }
    }

    return inquiry;
  }

  static readonly managePermission = PermissionCode.HIRE_INQUIRY_MANAGE;

  /** Inbox the ops team: full brief by email + dashboard link. */
  private async emailStaff(inquiry: HireInquiry) {
    const appUrl = this.config.get('APP_URL', { infer: true }).replace(/\/$/, '');
    const dashboardUrl = `${appUrl}/dashboard/requests`;
    const rows = await this.prisma.userRoleAssignment
      .findMany({
        where: {
          role: { code: { in: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.RECRUITER, UserRole.OPERATIONS] } },
          user: { isActive: true },
        },
        include: { user: { select: { email: true } } },
        take: 40,
      })
      .catch(() => []);
    const emails = [...new Set(rows.map((r) => r.user.email).filter(Boolean))];
    const fallback = this.config.get('SUPER_ADMIN_EMAIL', { infer: true });
    if (fallback) emails.push(fallback);
    const unique = [...new Set(emails.map(normalizeEmail))];
    if (!unique.length) {
      this.logger.warn(`Talent request ${inquiry.id} has no staff email recipients`);
      return;
    }
    await Promise.all(
      unique.map((to) =>
        this.emailService
          .send(
            hireInquiryStaffEmail({
              to,
              dashboardUrl,
              companyName: inquiry.companyName,
              contactName: inquiry.contactName,
              email: inquiry.email,
              phone: inquiry.phone,
              roleTitle: inquiry.roleTitle,
              roleFamily: inquiry.roleFamily,
              serviceType: inquiry.serviceType,
              numberOfProfessionals: inquiry.numberOfProfessionals,
              location: inquiry.location,
              workArrangement: String(inquiry.workArrangement),
              expectedStartDate: inquiry.expectedStartDate,
              requirements: inquiry.requirements,
              additionalNotes: inquiry.additionalNotes,
              inquiryId: inquiry.id,
            }),
          )
          .catch((error: unknown) =>
            this.logger.warn(`Staff talent-request email failed for ${to}: ${error instanceof Error ? error.message : String(error)}`),
          ),
      ),
    );
  }
}
