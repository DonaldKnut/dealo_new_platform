import type { Metadata } from 'next';

import { InterviewBooking } from '@/components/ats/interview-booking';

export const metadata: Metadata = {
  title: 'Pick an interview time',
  robots: { index: false, follow: false },
};

export default async function BookInterviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <InterviewBooking token={token} />;
}
