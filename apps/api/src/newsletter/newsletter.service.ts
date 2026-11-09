import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NewsletterCampaignStatus, NewsletterSendStatus, UserRole } from '@prisma/client';
import { renderEmailHtml, type NewsletterCampaignInput, type NewsletterSubscribeInput, type NewsletterTestInput } from '@dealo/shared';

import type { AuthUser } from '../auth/auth.types';
import { AuditLogService } from '../common/audit-log.service';
import { normalizeEmail } from '../common/normalize-email';
import type { AppEnv } from '../config/env.validation';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailPreferencesService } from './email-preferences.service';

@Injectable()
export class NewsletterService {
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

  /** One recipient's copy: their own unsubscribe link in the footer and in the mail headers. */
  private message(to: string, subject: string, bodyHtml: string, bodyText?: string | null, campaignId?: string) {
    const links = this.preferences.linksFor(to);
    const page = campaignId ? `${links.page}&c=${campaignId}` : links.page;
    return {
      to,
      subject,
      html: renderEmailHtml(bodyHtml, { siteUrl: this.siteUrl, preheader: stripHtml(bodyHtml).slice(0, 140), unsubscribeUrl: page }),
      text: `${bodyText ?? stripHtml(bodyHtml)}\n\nUnsubscribe: ${page}`,
      headers: this.preferences.headersFor(to),
    };
  }

  async sendTest(input: NewsletterTestInput, user: AuthUser) {
    const account = await this.prisma.user.findUnique({ where: { id: user.id }, select: { email: true } });
    if (!account) throw new NotFoundException('Account not found');
    await this.emailService.send(this.message(account.email, `[Test] ${input.subject}`, input.bodyHtml));
    return { ok: true, email: account.email };
  }

  async stats() {
    const [subscribers, optedOut] = await Promise.all([this.prisma.newsletterSubscriber.count({ where: { isActive: true } }), this.preferences.count()]);
    return { subscribers, optedOut };
  }

  listCampaigns() {
    return this.prisma.newsletterCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        _count: { select: { sends: true } },
      },
    });
  }

  async createCampaign(input: NewsletterCampaignInput, user: AuthUser) {
    const campaign = await this.prisma.newsletterCampaign.create({
      data: {
        subject: input.subject,
        bodyHtml: input.bodyHtml,
        bodyText: emptyToNull(input.bodyText),
        segment: input.segment,
        createdById: user.id,
      },
    });

    await this.auditLog.record({
      action: 'NEWSLETTER_CAMPAIGN_CREATED',
      entityType: 'NewsletterCampaign',
      entityId: campaign.id,
      actorId: user.id,
    });

    return campaign;
  }

  async sendCampaign(id: string, user: AuthUser) {
    const campaign = await this.prisma.newsletterCampaign.findUnique({
      where: { id },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');

    const everyone = await this.resolveRecipients(campaign.segment);
    const recipients = await this.preferences.withoutOptOuts(everyone);
    const results: Array<{ email: string; ok: boolean }> = [];

    for (const email of recipients) {
      try {
        await this.emailService.send(this.message(email, campaign.subject, campaign.bodyHtml, campaign.bodyText, campaign.id));
        await this.prisma.newsletterSend.create({
          data: {
            campaignId: campaign.id,
            email,
            status: NewsletterSendStatus.SENT,
            sentAt: new Date(),
          },
        });
        results.push({ email, ok: true });
      } catch (error) {
        await this.prisma.newsletterSend.create({
          data: {
            campaignId: campaign.id,
            email,
            status: NewsletterSendStatus.FAILED,
            error: error instanceof Error ? error.message : 'send failed',
          },
        });
        results.push({ email, ok: false });
      }
    }

    const updated = await this.prisma.newsletterCampaign.update({
      where: { id },
      data: {
        status: NewsletterCampaignStatus.SENT,
        sentAt: new Date(),
      },
    });

    await this.auditLog.record({
      action: 'NEWSLETTER_CAMPAIGN_SENT',
      entityType: 'NewsletterCampaign',
      entityId: id,
      actorId: user.id,
      metadata: {
        recipientCount: recipients.length,
        skippedOptedOut: everyone.length - recipients.length,
        sent: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok).length,
      },
    });

    const delivered = results.filter((r) => r.ok).length;
    await this.notifications.notify([user.id], {
      type: 'newsletter.sent',
      title: `Campaign sent: ${campaign.subject}`,
      body: `${delivered} delivered, ${results.length - delivered} failed, ${everyone.length - recipients.length} opted out.`,
      link: '/dashboard/newsletter',
    });

    return {
      campaign: updated,
      recipientCount: recipients.length,
      skippedOptedOut: everyone.length - recipients.length,
      sent: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
    };
  }

  async subscribe(input: NewsletterSubscribeInput) {
    const email = normalizeEmail(input.email);
    const subscriber = await this.prisma.newsletterSubscriber.upsert({
      where: { email },
      create: {
        email,
        firstName: emptyToNull(input.firstName),
        roleSegment: input.roleSegment,
        isActive: true,
      },
      update: {
        firstName: emptyToNull(input.firstName) ?? undefined,
        roleSegment: input.roleSegment,
        isActive: true,
      },
    });
    // Signing up again is fresh consent, so an earlier opt-out no longer applies.
    await this.prisma.emailOptOut.deleteMany({ where: { email } });
    return { ok: true, id: subscriber.id };
  }

  listSubscribers() {
    return this.prisma.newsletterSubscriber.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  private async resolveRecipients(segment: string): Promise<string[]> {
    const emails = new Set<string>();

    const subscribers = await this.prisma.newsletterSubscriber.findMany({
      where: {
        isActive: true,
        ...(segment === 'ALL' ? {} : { roleSegment: { in: [segment, 'ALL'] } }),
      },
    });
    for (const sub of subscribers) emails.add(sub.email);

    if (segment === 'ALL' || segment === 'EMPLOYER' || segment === 'TALENT') {
      const roleFilter =
        segment === 'ALL'
          ? [UserRole.EMPLOYER, UserRole.TALENT]
          : segment === 'EMPLOYER'
            ? [UserRole.EMPLOYER]
            : [UserRole.TALENT];

      const users = await this.prisma.user.findMany({
        where: {
          isActive: true,
          isEmailVerified: true,
          roles: { some: { role: { code: { in: roleFilter } } } },
        },
        select: { email: true },
        take: 1000,
      });
      for (const user of users) emails.add(user.email);
    }

    return [...emails];
  }
}

function emptyToNull(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
