import { z } from 'zod';

import { UserRole } from '../enums';

export const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Za-z]/, 'Password must include a letter')
    .regex(/[0-9]/, 'Password must include a number'),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  role: z.enum([UserRole.EMPLOYER, UserRole.TALENT]),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/** Finishes a first Google/LinkedIn sign-in: the provider gives us an email, not a role. */
export const onboardingSchema = z
  .object({
    role: z.enum([UserRole.EMPLOYER, UserRole.TALENT]),
    firstName: z.string().trim().min(1, 'Enter your first name').max(100),
    lastName: z.string().trim().min(1, 'Enter your last name').max(100),
    phone: z.union([z.string().trim().min(7, 'Enter a real phone number').max(30), z.literal('')]).optional(),
    companyName: z.string().trim().max(120).optional(),
    roleTitle: z.string().trim().max(120).optional(),
    location: z.string().trim().max(120).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.role === UserRole.EMPLOYER && (value.companyName ?? '').length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['companyName'], message: 'Enter your company name' });
    }
  });

export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
  rememberMe: z.boolean().optional().default(false),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email().max(255),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Za-z]/, 'Password must include a letter')
    .regex(/[0-9]/, 'Password must include a number'),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
