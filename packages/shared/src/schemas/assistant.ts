import { z } from 'zod';

export const ASSISTANT_NAME = 'Dealo AI';

export const assistantMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  text: z.string().trim().min(1).max(6000),
});

export type AssistantMessage = z.infer<typeof assistantMessageSchema>;

export const assistantChatSchema = z
  .object({
    /** The conversation so far, oldest first; the last item is the user's new question. */
    messages: z.array(assistantMessageSchema).min(1).max(24),
    /** The page the chat was opened on, so answers can point to the right place. */
    page: z.string().trim().max(200).optional(),
    /** UI language from the site header (en, fr, zh, ko). Reply in this language when set. */
    locale: z.enum(['en', 'fr', 'zh', 'ko']).optional(),
  })
  .refine((v) => v.messages[v.messages.length - 1]?.role === 'user', { message: 'The last message must be a question' })
  .refine((v) => (v.messages[v.messages.length - 1]?.text.length ?? 0) <= 2000, { message: 'Keep your question under 2,000 characters' });

export type AssistantChatInput = z.infer<typeof assistantChatSchema>;

export type AssistantLink = { label: string; href: string };

export type AssistantReply = {
  /** Stable id for feedback on this answer. */
  id: string;
  reply: string;
  suggestions: string[];
  links: AssistantLink[];
  /** True when a person should take over (billing problems, bugs, anything the assistant cannot settle). */
  handoff: boolean;
  source: 'ai' | 'guide';
};

/** Server-sent events from `POST /assistant/stream`. */
export type AssistantStreamEvent =
  | { type: 'start'; id: string; source: AssistantReply['source'] }
  | { type: 'delta'; text: string }
  | { type: 'done'; reply: AssistantReply }
  | { type: 'error'; message: string };

export type AssistantWelcome = {
  /** e.g. "Good afternoon, Ada" */
  greeting: string;
  intro: string;
  suggestions: string[];
  aiEnabled: boolean;
};

export const assistantFeedbackSchema = z.object({
  messageId: z.string().trim().min(1).max(64),
  rating: z.enum(['up', 'down']),
  question: z.string().trim().max(2000).default(''),
  answer: z.string().trim().max(6000).default(''),
  comment: z.string().trim().max(500).optional(),
  page: z.string().trim().max(200).optional(),
});

export type AssistantFeedbackInput = z.infer<typeof assistantFeedbackSchema>;

/** A guest asking for a person. Signed-in users open a normal support ticket instead. */
export const assistantHandoffSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  message: z.string().trim().min(4).max(2000),
  transcript: z.array(assistantMessageSchema).max(24).default([]),
  page: z.string().trim().max(200).optional(),
});

export type AssistantHandoffInput = z.infer<typeof assistantHandoffSchema>;
