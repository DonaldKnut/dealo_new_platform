import { Injectable, NotFoundException } from '@nestjs/common';
import type { HireInquiryInput, HireInquiryStatusUpdate } from '@dealo/shared';
import { PermissionCode, WebhookEvent } from '@dealo/shared';
import type { HireInquiryStatus } from '@prisma/client';

import type { AuthUser } from '../auth/auth.types';
import { AuditLogService } from '../common/audit-log.service';
import { normalizeEmail } from '../common/normalize-email';
import { EmailService } from '../email/email.service';
import { hireInquiryAckEmail } from '../email/email.templates';
import { PrismaService } from '../prisma/prisma.service';
import { WebhooksService } from '../webhooks/webhooks.service';

@Injectable()
export class HireInquiryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly emailService: EmailService,
    private readonly webhooks: WebhooksService,
  ) {}

  async create(input: HireInquiryInput, principal?: AuthUser) {
    const email = normalizeEmail(input.email);
    const viaApiKey = principal?.authType === 'api_key' ? principal : undefined;
    const isTest = viaApiKey?.apiKeyEnvironment === 'TEST';

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
        organizationId: viaApiKey?.organizationId ?? null,
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
    }

    return inquiry;
  }

  static readonly managePermission = PermissionCode.HIRE_INQUIRY_MANAGE;
}
