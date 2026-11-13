import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

import type { AppEnv } from '../config/env.validation';
import type { EmailProvider, SendEmailInput } from './email.types';

@Injectable()
export class ResendEmailProvider implements EmailProvider {
  readonly name = 'resend';
  private readonly logger = new Logger(ResendEmailProvider.name);
  private readonly client: Resend | null;
  private readonly from: string;

  constructor(config: ConfigService<AppEnv, true>) {
    const apiKey = config.get('RESEND_API_KEY', { infer: true });
    this.from = config.get('EMAIL_FROM', { infer: true });
    this.client = apiKey ? new Resend(apiKey) : null;
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async send(input: SendEmailInput): Promise<void> {
    if (!this.client) {
      throw new Error('Resend is not configured');
    }

    const result = await this.client.emails.send({
      from: this.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      ...(input.headers ? { headers: input.headers } : {}),
      attachments: input.attachments?.map((file) => ({
        filename: file.filename,
        content: (Buffer.isBuffer(file.content) ? file.content : Buffer.from(file.content)).toString('base64'),
        contentType: file.contentType,
      })),
    });

    if (result.error) {
      this.logger.error(`Resend failed: ${result.error.message}`);
      throw new Error(result.error.message);
    }
  }
}
