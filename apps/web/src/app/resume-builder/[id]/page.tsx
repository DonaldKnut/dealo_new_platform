import type { Metadata } from 'next';

import { ResumeBuilder } from '@/components/resume/resume-builder';

export const metadata: Metadata = {
  title: 'Edit your CV',
  robots: { index: false, follow: false },
};

export default async function EditResumePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ResumeBuilder id={id} />;
}
