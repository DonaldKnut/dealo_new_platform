import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppEnv } from '../config/env.validation';
import type { SendEmailInput } from './email.types';
import { NodemailerEmailProvider } from './nodemailer.provider';
import { ResendEmailProvider } from './resend.provider';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly config: ConfigService<AppEnv, true>,
    private readonly resendProvider: ResendEmailProvider,
    private readonly nodemailerProvider: NodemailerEmailProvider,
  ) {}

  async send(input: SendEmailInput): Promise<void> {
    const preference = this.config.get('EMAIL_PROVIDER', { infer: true });

    if (preference === 'resend') {
      await this.resendProvider.send(input);
      return;
    }

    if (preference === 'nodemailer') {
      await this.nodemailerProvider.send(input);
      return;
    }

    // auto: prefer Resend, fall back to Nodemailer
    if (this.resendProvider.isConfigured()) {
      try {
        await this.resendProvider.send(input);
        return;
      } catch (error) {
        this.logger.warn(
          `Resend failed, falling back to Nodemailer: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      }
    }

    if (this.nodemailerProvider.isConfigured()) {
      await this.nodemailerProvider.send(input);
      return;
    }

    this.logger.warn(
      `No email provider available. Queued message subject="${input.subject}" to=${input.to}`,
    );
  }
}
