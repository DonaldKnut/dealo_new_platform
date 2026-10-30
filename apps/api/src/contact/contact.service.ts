import { Injectable } from '@nestjs/common';
import type { ContactInput } from '@dealo/shared';

import { AuditLogService } from '../common/audit-log.service';
import { normalizeEmail } from '../common/normalize-email';
import { EmailService } from '../email/email.service';
import { contactAckEmail } from '../email/email.templates';

@Injectable()
export class ContactService {
  constructor(
    private readonly auditLog: AuditLogService,
    private readonly emailService: EmailService,
  ) {}

  async create(input: ContactInput) {
    const email = normalizeEmail(input.email);

    await this.auditLog.record({
      action: 'CONTACT_MESSAGE_RECEIVED',
      entityType: 'Contact',
      metadata: {
        name: input.name,
        email,
        company: input.company,
        subject: input.subject,
      },
    });

    await this.emailService.send(
      contactAckEmail({
        to: email,
        name: input.name,
        subject: input.subject,
      }),
    );

    return {
      success: true,
      message: 'Your message has been sent. We will get back to you shortly.',
    };
  }
}
