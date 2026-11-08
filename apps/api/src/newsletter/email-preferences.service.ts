import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

import { AuditLogService } from '../common/audit-log.service';
import { normalizeEmail } from '../common/normalize-email';
import type { AppEnv } from '../config/env.validation';
import { PrismaService } from '../prisma/prisma.service';

export type OptOutSource = 'link' | 'one_click' | 'preferences' | 'admin';

const b64url = (value: Buffer | string) => Buffer.from(value).toString('base64url');

/**
 * Unsubscribe without signing in. Each email gets a signed token (the address plus an HMAC),
 * so a link can only change the preferences of the address it was sent to.
 */
@Injectable()
export class EmailPreferencesService {
  private readonly key: Buffer;
  private readonly appUrl: string;
  private readonly apiUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    config: ConfigService<AppEnv, true>,
  ) {
    this.key = createHmac('sha256', config.get('JWT_ACCESS_SECRET', { infer: true })).update('dealo-email-preferences-v1').digest();
    this.appUrl = config.get('APP_URL', { infer: true }).replace(/\/$/, '');
    this.apiUrl = config.get('API_URL', { infer: true }).replace(/\/$/, '');
  }

  private sign(email: string) {
    return createHmac('sha256', this.key).update(email).digest().subarray(0, 18);
  }

  tokenFor(email: string) {
    const normalized = normalizeEmail(email);
    return `${b64url(normalized)}.${b64url(this.sign(normalized))}`;
  }

  /** The email a token belongs to; throws for anything forged or garbled. */
  emailFromToken(token: string) {
    const [encoded, mac] = token.split('.');
    if (!encoded || !mac) throw new BadRequestException('This link is not valid. Use the link from your latest email.');
    const email = Buffer.from(encoded, 'base64url').toString('utf8');
    const presented = Buffer.from(mac, 'base64url');
    const expected = this.sign(email);
    if (presented.length !== expected.length || !timingSafeEqual(presented, expected) || !email.includes('@')) {
      throw new BadRequestException('This link is not valid. Use the link from your latest email.');
    }
    return email;
  }

  /** Footer link for people, and the RFC 8058 one-click endpoint for mail apps. */
  linksFor(email: string) {
    const token = this.tokenFor(email);
    return {
      page: `${this.appUrl}/unsubscribe?t=${encodeURIComponent(token)}`,
      oneClick: `${this.apiUrl}/api/v1/newsletter/one-click?t=${encodeURIComponent(token)}`,
    };
  }

  /** Headers Gmail and Yahoo expect on bulk mail; they show an "Unsubscribe" button. */
  headersFor(email: string) {
    const { oneClick } = this.linksFor(email);
    return { 'List-Unsubscribe': `<${oneClick}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' };
  }

  async status(token: string) {
    const email = this.emailFromToken(token);
    const optOut = await this.prisma.emailOptOut.findUnique({ where: { email } });
    return { email: mask(email), subscribed: !optOut, since: optOut?.createdAt ?? null };
  }

  async unsubscribe(token: string, source: OptOutSource, reason?: string, campaignId?: string) {
    const email = this.emailFromToken(token);
    await this.optOut(email, source, reason, campaignId);
    return { email: mask(email), subscribed: false };
  }

  async optOut(email: string, source: OptOutSource, reason?: string, campaignId?: string) {
    const normalized = normalizeEmail(email);
    await this.prisma.emailOptOut.upsert({
      where: { email: normalized },
      create: { email: normalized, source, reason: reason?.slice(0, 300) ?? null, campaignId: campaignId && /^[a-f0-9]{24}$/i.test(campaignId) ? campaignId : null },
      update: reason ? { reason: reason.slice(0, 300) } : {},
    });
    await this.prisma.newsletterSubscriber.updateMany({ where: { email: normalized }, data: { isActive: false } });
    await this.audit.record({ action: 'EMAIL_OPT_OUT', entityType: 'EmailOptOut', metadata: { email: normalized, source, reason } });
  }

  async resubscribe(token: string) {
    const email = this.emailFromToken(token);
    await this.prisma.emailOptOut.deleteMany({ where: { email } });
    await this.prisma.newsletterSubscriber.updateMany({ where: { email }, data: { isActive: true } });
    await this.audit.record({ action: 'EMAIL_OPT_IN', entityType: 'EmailOptOut', metadata: { email } });
    return { email: mask(email), subscribed: true };
  }

  /** Drops everyone who opted out from a recipient list. */
  async withoutOptOuts(emails: string[]) {
    if (!emails.length) return emails;
    const out = new Set(
      (await this.prisma.emailOptOut.findMany({ where: { email: { in: emails.map(normalizeEmail) } }, select: { email: true } })).map((r) => r.email),
    );
    return emails.filter((e) => !out.has(normalizeEmail(e)));
  }

  count() {
    return this.prisma.emailOptOut.count();
  }
}

/** "ad***@gmail.com": enough to recognise, not enough to harvest from a shared link. */
function mask(email: string) {
  const [user, domain] = email.split('@');
  return `${user!.slice(0, 2)}${'*'.repeat(Math.max(1, Math.min(6, user!.length - 2)))}@${domain}`;
}
