import { z } from 'zod';

export const assistantMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  text: z.string().trim().min(1).max(1500),
});

export type AssistantMessage = z.infer<typeof assistantMessageSchema>;

export const assistantChatSchema = z.object({
  /** The conversation so far, oldest first; the last item is the user's new question. */
  messages: z.array(assistantMessageSchema).min(1).max(16),
  /** The page the chat was opened on, so answers can point to the right place. */
  page: z.string().trim().max(200).optional(),
});

export type AssistantChatInput = z.infer<typeof assistantChatSchema>;

export type AssistantLink = { label: string; href: string };

export type AssistantReply = {
  reply: string;
  suggestions: string[];
  links: AssistantLink[];
  /** True when a person should take over (billing problems, bugs, anything the guide cannot answer). */
  handoff: boolean;
  source: 'ai' | 'guide';
};

/** A guest asking for a person. Signed-in users open a normal support ticket instead. */
export const assistantHandoffSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  message: z.string().trim().min(4).max(2000),
  transcript: z.array(assistantMessageSchema).max(16).default([]),
  page: z.string().trim().max(200).optional(),
});

export type AssistantHandoffInput = z.infer<typeof assistantHandoffSchema>;
