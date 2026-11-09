import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { renderEmailHtml, type MailAllUsersInput, type MailOneUserInput } from '@dealo/shared';

import type { AuthUser } from '../auth/auth.types';
import { AuditLogService } from '../common/audit-log.service';
import { normalizeEmail } from '../common/normalize-email';
import type { AppEnv } from '../config/env.validation';
import { EmailService } from '../email/email.service';
import { EmailPreferencesService } from '../newsletter/email-preferences.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MailService {
  private readonly siteUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly auditLog: AuditLogService,
    private readonly preferences: EmailPreferencesService,
    private readonly notifications: NotificationsService,
    config: ConfigService<AppEnv, true>,
  ) {
    this.siteUrl = config.get('APP_URL', { infer: true });
  }

  private html(bodyHtml: string) {
    return renderEmailHtml(bodyHtml, { siteUrl: this.siteUrl, preheader: stripHtml(bodyHtml).slice(0, 140) });
  }

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
      html: this.html(input.bodyHtml),
      text: input.bodyText ?? stripHtml(input.bodyHtml),
    });

    await this.auditLog.record({
      action: 'ADMIN_MAIL_ONE',
      entityType: 'User',
      entityId: userId,
      actorId: actor.id,
      metadata: { email, subject: input.subject },
    });

    await this.notifications.notify([userId], {
      type: 'mail.message',
      title: input.subject,
      body: `Dealo sent you an email. ${(input.bodyText ?? stripHtml(input.bodyHtml)).slice(0, 160)}`,
    });

    return { ok: true, email };
  }

  async mailAll(input: MailAllUsersInput, actor: AuthUser) {
    // Team-only mail is internal; every other broadcast respects opt-outs and carries an unsubscribe link.
    const internal = input.roleFilter === 'STAFF';
    const everyone = await this.resolveRecipients(input.roleFilter);
    const recipients = internal ? everyone : await this.preferences.withoutOptOuts(everyone);
    const results: Array<{ email: string; ok: boolean }> = [];

    for (const email of recipients) {
      try {
        const links = internal ? null : this.preferences.linksFor(email);
        await this.emailService.send({
          to: email,
          subject: input.subject,
          html: renderEmailHtml(input.bodyHtml, { siteUrl: this.siteUrl, preheader: stripHtml(input.bodyHtml).slice(0, 140), unsubscribeUrl: links?.page }),
          text: `${input.bodyText ?? stripHtml(input.bodyHtml)}${links ? `\n\nUnsubscribe: ${links.page}` : ''}`,
          ...(internal ? {} : { headers: this.preferences.headersFor(email) }),
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
        skippedOptedOut: everyone.length - recipients.length,
        sent: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok).length,
      },
    });

    const sent = results.filter((r) => r.ok);
    await this.notifications.notifyEmails(
      sent.map((r) => r.email),
      { type: 'mail.broadcast', title: input.subject, body: (input.bodyText ?? stripHtml(input.bodyHtml)).slice(0, 200) },
    );
    await this.notifications.notify([actor.id], {
      type: 'mail.broadcast_sent',
      title: `Broadcast sent: ${input.subject}`,
      body: `${sent.length} delivered, ${results.length - sent.length} failed, ${everyone.length - recipients.length} opted out.`,
      link: '/dashboard/mail',
    });

    return {
      recipientCount: recipients.length,
      skippedOptedOut: everyone.length - recipients.length,
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
