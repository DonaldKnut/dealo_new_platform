export interface EmailAttachment {
  filename: string;
  /** Text, or raw bytes for binary files such as PDFs. */
  content: string | Buffer;
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
