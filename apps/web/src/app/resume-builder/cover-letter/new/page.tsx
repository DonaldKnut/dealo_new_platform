import type { Metadata } from 'next';

import { ResumeBuilder } from '@/components/resume/resume-builder';

export const metadata: Metadata = {
  title: 'Write a cover letter',
  robots: { index: false, follow: true },
};

export default function NewCoverLetterPage() {
  return <ResumeBuilder kind="COVER_LETTER" />;
}
