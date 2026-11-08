export interface EmailAttachment {
  filename: string;
  content: string;
  contentType?: string;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
  /** Extra mail headers, e.g. List-Unsubscribe for bulk mail. */
  headers?: Record<string, string>;
}

export interface EmailProvider {
  readonly name: string;
  send(input: SendEmailInput): Promise<void>;
}
