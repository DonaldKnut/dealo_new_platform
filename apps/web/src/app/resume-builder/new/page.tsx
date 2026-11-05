import type { Metadata } from 'next';

import { ResumeBuilder } from '@/components/resume/resume-builder';

export const metadata: Metadata = {
  title: 'Build your CV',
  robots: { index: false, follow: true },
};

export default function NewResumePage() {
  return <ResumeBuilder kind="RESUME" />;
}
