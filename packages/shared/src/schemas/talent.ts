import { z } from 'zod';

export const candidateDocumentKindSchema = z.enum(['CV', 'CERTIFICATE', 'OTHER']);

export type CandidateDocumentKind = z.infer<typeof candidateDocumentKindSchema>;
