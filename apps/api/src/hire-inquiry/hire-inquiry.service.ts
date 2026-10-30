import { Injectable } from '@nestjs/common';
import type { HireInquiryInput } from '@dealo/shared';
import { PermissionCode } from '@dealo/shared';

import { AuditLogService } from '../common/audit-log.service';
import { normalizeEmail } from '../common/normalize-email';
import { EmailService } from '../email/email.service';
import { hireInquiryAckEmail } from '../email/email.templates';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HireInquiryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly emailService: EmailService,
  ) {}

  async create(input: HireInquiryInput) {
    const email = normalizeEmail(input.email);

    const inquiry = await this.prisma.hireInquiry.create({
      data: {
        companyName: input.companyName,
        contactName: input.contactName,
        email,
        phone: input.phone,
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
      },
    });

    await this.auditLog.record({
      action: 'HIRE_INQUIRY_CREATED',
      entityType: 'HireInquiry',
      entityId: inquiry.id,
      metadata: {
        companyName: inquiry.companyName,
        serviceType: inquiry.serviceType,
        roleTitle: inquiry.roleTitle,
      },
    });

    await this.emailService.send(
      hireInquiryAckEmail({
        to: inquiry.email,
        contactName: inquiry.contactName,
        roleTitle: inquiry.roleTitle,
      }),
    );

    return {
      id: inquiry.id,
      status: inquiry.status,
      message: 'Your hiring request has been submitted successfully.',
    };
  }

  async list() {
    return this.prisma.hireInquiry.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  static readonly managePermission = PermissionCode.HIRE_INQUIRY_MANAGE;
}
