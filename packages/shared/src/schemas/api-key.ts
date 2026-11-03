import { z } from 'zod';

import { ApiKeyEnvironment, ApiKeyPlan, ApiScope } from '../enums';

const apiScopeEnum = z.enum([
  ApiScope.HIRE_INQUIRIES_READ,
  ApiScope.HIRE_INQUIRIES_WRITE,
  ApiScope.CANDIDATES_READ,
  ApiScope.BLOG_READ,
  ApiScope.HEALTH_READ,
]);

export const createApiKeySchema = z.object({
  name: z.string().trim().min(2).max(120),
  environment: z
    .enum([ApiKeyEnvironment.LIVE, ApiKeyEnvironment.TEST])
    .default(ApiKeyEnvironment.TEST),
  plan: z
    .enum([ApiKeyPlan.SANDBOX, ApiKeyPlan.PARTNER, ApiKeyPlan.ENTERPRISE])
    .default(ApiKeyPlan.SANDBOX),
  scopes: z.array(apiScopeEnum).min(1).max(20),
  rateLimitPerMin: z.number().int().min(1).max(10_000).default(60),
  expiresAt: z.string().datetime().optional().nullable(),
  organizationId: z.string().trim().min(1).optional().nullable(),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;

export const updateApiKeySchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  plan: z.enum([ApiKeyPlan.SANDBOX, ApiKeyPlan.PARTNER, ApiKeyPlan.ENTERPRISE]).optional(),
  scopes: z.array(apiScopeEnum).min(1).max(20).optional(),
  rateLimitPerMin: z.number().int().min(1).max(10_000).optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime().optional().nullable(),
});

export type UpdateApiKeyInput = z.infer<typeof updateApiKeySchema>;

/** Fixed policy for self-serve sandbox keys (TEST environment only). */
export const SANDBOX_KEY_POLICY = {
  maxActiveKeys: 2,
  rateLimitPerMin: 30,
  scopes: [
    ApiScope.HIRE_INQUIRIES_WRITE,
    ApiScope.HIRE_INQUIRIES_READ,
    ApiScope.BLOG_READ,
    ApiScope.HEALTH_READ,
  ],
} as const;

export const createSandboxApiKeySchema = z.object({
  name: z.string().trim().min(2).max(120),
});

export type CreateSandboxApiKeyInput = z.infer<typeof createSandboxApiKeySchema>;

export const createOAuthClientSchema = z.object({
  name: z.string().trim().min(2).max(120),
});

export type CreateOAuthClientInput = z.infer<typeof createOAuthClientSchema>;
