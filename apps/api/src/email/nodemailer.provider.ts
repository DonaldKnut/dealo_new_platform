import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

import type { AppEnv } from '../config/env.validation';
import type { EmailProvider, SendEmailInput } from './email.types';

@Injectable()
export class NodemailerEmailProvider implements EmailProvider {
  readonly name = 'nodemailer';
  private readonly logger = new Logger(NodemailerEmailProvider.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor(config: ConfigService<AppEnv, true>) {
    this.from = config.get('EMAIL_FROM', { infer: true });
    const host = config.get('SMTP_HOST', { infer: true });
    const port = config.get('SMTP_PORT', { infer: true });
    const user = config.get('SMTP_USER', { infer: true });
    const pass = config.get('SMTP_PASS', { infer: true });
    const secure = config.get('SMTP_SECURE', { infer: true }) ?? false;

    if (host && port) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: user && pass ? { user, pass } : undefined,
      });
    } else {
      this.transporter = null;
    }
  }

  isConfigured(): boolean {
    return this.transporter !== null;
  }

  async send(input: SendEmailInput): Promise<void> {
    if (!this.transporter) {
      throw new Error('Nodemailer SMTP is not configured');
    }

    await this.transporter.sendMail({
      from: this.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    this.logger.debug(`Email sent via SMTP to ${input.to}`);
  }
}
