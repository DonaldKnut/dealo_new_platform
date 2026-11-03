import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { MailAllUsersInput, MailOneUserInput } from '@dealo/shared';

import type { AuthUser } from '../auth/auth.types';
import { AuditLogService } from '../common/audit-log.service';
import { normalizeEmail } from '../common/normalize-email';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MailService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly auditLog: AuditLogService,
  ) {}

  async mailOne(input: MailOneUserInput, actor: AuthUser) {
    let email = input.email ? normalizeEmail(input.email) : null;
    let userId = input.userId;

    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');
      email = user.email;
    } else if (email) {
      const user = await this.prisma.user.findUnique({ where: { email } });
      userId = user?.id;
    }

    if (!email) throw new NotFoundException('Recipient not found');

    await this.emailService.send({
      to: email,
      subject: input.subject,
      html: input.bodyHtml,
      text: input.bodyText ?? stripHtml(input.bodyHtml),
    });

    await this.auditLog.record({
      action: 'ADMIN_MAIL_ONE',
      entityType: 'User',
      entityId: userId,
      actorId: actor.id,
      metadata: { email, subject: input.subject },
    });

    return { ok: true, email };
  }

  async mailAll(input: MailAllUsersInput, actor: AuthUser) {
    const recipients = await this.resolveRecipients(input.roleFilter);
    const results: Array<{ email: string; ok: boolean }> = [];

    for (const email of recipients) {
      try {
        await this.emailService.send({
          to: email,
          subject: input.subject,
          html: input.bodyHtml,
          text: input.bodyText ?? stripHtml(input.bodyHtml),
        });
        results.push({ email, ok: true });
      } catch {
        results.push({ email, ok: false });
      }
    }

    await this.auditLog.record({
      action: 'ADMIN_MAIL_ALL',
      entityType: 'User',
      actorId: actor.id,
      metadata: {
        roleFilter: input.roleFilter,
        subject: input.subject,
        recipientCount: recipients.length,
        sent: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok).length,
      },
    });

    return {
      recipientCount: recipients.length,
      sent: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
    };
  }

  private async resolveRecipients(filter: MailAllUsersInput['roleFilter']) {
    if (filter === 'ALL') {
      const users = await this.prisma.user.findMany({
        where: { isActive: true },
        select: { email: true },
      });
      return users.map((u) => u.email);
    }

    const roleCodes: UserRole[] =
      filter === 'EMPLOYER'
        ? [UserRole.EMPLOYER]
        : filter === 'TALENT'
          ? [UserRole.TALENT]
          : [
              UserRole.SUPER_ADMIN,
              UserRole.ADMIN,
              UserRole.RECRUITER,
              UserRole.FINANCE,
              UserRole.OPERATIONS,
            ];

    const assignments = await this.prisma.userRoleAssignment.findMany({
      where: {
        role: { code: { in: roleCodes } },
        user: { isActive: true },
      },
      include: { user: { select: { email: true } } },
    });

    return [...new Set(assignments.map((row) => row.user.email))];
  }
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
