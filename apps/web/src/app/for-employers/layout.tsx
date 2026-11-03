import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hire talent in Nigeria — Office staff & skilled trades',
  description:
    'Recruit office staff in Lagos and skilled trades across Nigeria and Africa. Dealo delivers checked shortlists for employers and inbound global hiring.',
  keywords: [
    'hire talent Nigeria',
    'recruit office staff Lagos',
    'skilled trades staffing Africa',
    'managed staffing Nigeria',
  ],
  openGraph: {
    title: 'Hire talent in Nigeria with Dealo',
    description:
      'Office hiring and skilled trades staffing for Nigerian businesses and global teams.',
  },
};

export default function ForEmployersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
