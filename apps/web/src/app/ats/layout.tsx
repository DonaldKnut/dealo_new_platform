import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dealo ATS — hiring software with AI built in',
  description:
    'Post jobs, track every candidate on one board, and let AI do the first screen. Built and used by Dealo recruiters. Early access for businesses.',
  alternates: { canonical: '/ats' },
  openGraph: {
    title: 'Dealo ATS — hiring software with AI built in',
    description: 'One board for every candidate. AI screening that a person always checks.',
  },
};

export default function AtsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
