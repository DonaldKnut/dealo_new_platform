import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Join as talent — Office & skilled trades roles in Nigeria',
  description:
    'Build a checked profile and get matched to office and skilled trades jobs with Dealo across Nigeria and Africa.',
  openGraph: {
    title: 'Join Dealo as a professional',
    description: 'Matched roles for office talent and skilled trades across Nigeria and Africa.',
  },
};

export default function ForProfessionalsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
