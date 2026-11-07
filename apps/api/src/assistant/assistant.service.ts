import { Injectable, Logger } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { AssistantChatInput, AssistantHandoffInput, AssistantMessage, AssistantReply } from '@dealo/shared';
import { z } from 'zod';

import { GeminiClient } from '../ai/gemini.client';
import { AuditLogService } from '../common/audit-log.service';
import { normalizeEmail } from '../common/normalize-email';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { ALLOWED_HREFS, knowledgeText, matchTopic } from './knowledge';

const aiReplySchema = z.object({
  reply: z.string().min(1).max(1500),
  suggestions: z.array(z.string().min(1).max(80)).max(4).default([]),
  links: z.array(z.object({ label: z.string().min(1).max(60), href: z.string().min(1).max(200) })).max(3).default([]),
  handoff: z.boolean().default(false),
});

const SYSTEM = `You are the Dealo help assistant on a hiring platform in Nigeria (CV builder, job board, ATS for employers, Hiring Agents, recruitment services).
Answer in plain, friendly, simple English in at most 4 short sentences. Only state facts found in the KNOWLEDGE below; if the answer is not there, say you are not sure and set handoff to true.
Never ask for passwords, card numbers or one-time codes. Never promise refunds, discounts or dates. Set handoff to true for payment problems, account deletion, bugs or when the user asks for a person.
Only use links whose href appears in the KNOWLEDGE. Suggestions are up to 3 short follow-up questions the user might tap.
Reply as JSON: {"reply": string, "suggestions": string[], "links": [{"label": string, "href": string}], "handoff": boolean}.`;

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}

function transcriptText(messages: AssistantMessage[]) {
  return messages.map((m) => `${m.role === 'user' ? 'Visitor' : 'Assistant'}: ${m.text}`).join('\n');
}

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(
    private readonly gemini: GeminiClient,
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly audit: AuditLogService,
  ) {}

  async chat(input: AssistantChatInput): Promise<AssistantReply> {
    const question = [...input.messages].reverse().find((m) => m.role === 'user')?.text ?? '';
    const guide = matchTopic(question);

    if (this.gemini.isConfigured) {
      try {
        const prompt = `KNOWLEDGE:\n${knowledgeText()}\n\nPAGE: ${input.page ?? 'unknown'}\n\nCONVERSATION:\n${transcriptText(input.messages.slice(-10))}\n\nWrite the assistant's next reply.`;
        const ai = await this.gemini.json(SYSTEM, prompt, aiReplySchema);
        return {
          reply: ai.reply.trim(),
          suggestions: (ai.suggestions ?? []).slice(0, 3),
          links: (ai.links ?? []).filter((l) => ALLOWED_HREFS.has(l.href)),
          handoff: Boolean(ai.handoff) || guide.handoff,
          source: 'ai',
        };
      } catch (err) {
        this.logger.warn(`Assistant AI failed, using the guide: ${err instanceof Error ? err.message : err}`);
      }
    }

    return { reply: guide.answer, suggestions: guide.suggestions, links: guide.links, handoff: guide.handoff, source: 'guide' };
  }

  /** A guest wants a person: email the team with the chat so they can reply, and confirm to the guest. */
  async handoff(input: AssistantHandoffInput) {
    const email = normalizeEmail(input.email);
    const transcript = transcriptText(input.transcript);

    await this.audit.record({
      action: 'ASSISTANT_HANDOFF',
      entityType: 'Contact',
      metadata: { name: input.name, email, page: input.page, messages: input.transcript.length },
    });

    const admins = await this.prisma.userRoleAssignment.findMany({
      where: { role: { code: { in: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.OPERATIONS] } } },
      include: { user: { select: { email: true } } },
      take: 40,
    });
    const recipients = [...new Set(admins.map((a) => a.user.email).filter((e): e is string => Boolean(e)))];

    const html = `<p><strong>${escapeHtml(input.name)}</strong> (${escapeHtml(email)}) asked for a person from the help chat${input.page ? ` on <code>${escapeHtml(input.page)}</code>` : ''}.</p>
<p><strong>Message:</strong><br/>${escapeHtml(input.message).replace(/\n/g, '<br/>')}</p>
${transcript ? `<p><strong>Chat so far:</strong></p><pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(transcript)}</pre>` : ''}
<p>Answer them at <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>.</p>`;

    await Promise.all(
      recipients.map((to) =>
        this.email
          .send({
            to,
            subject: `[Dealo Chat] ${input.name}: ${input.message.slice(0, 60)}`,
            html,
            text: `${input.name} (${email}) asked for a person.\n\n${input.message}\n\n${transcript}`,
          })
          .catch((err: unknown) => this.logger.warn(`Handoff email to staff failed: ${err instanceof Error ? err.message : err}`)),
      ),
    );

    await this.email
      .send({
        to: email,
        subject: 'We got your message — Dealo',
        html: `<p>Hi ${escapeHtml(input.name)},</p><p>Thanks for reaching out. A person from the Dealo team will reply to this email soon.</p><p><em>Your message:</em> ${escapeHtml(input.message)}</p>`,
        text: `Hi ${input.name}, thanks for reaching out. A person from the Dealo team will reply to this email soon. Your message: ${input.message}`,
      })
      .catch((err: unknown) => this.logger.warn(`Handoff acknowledgement failed: ${err instanceof Error ? err.message : err}`));

    return { success: true, message: 'Thanks! A person from our team will reply by email soon.' };
  }
}
