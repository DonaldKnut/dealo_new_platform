import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Recruitment & staffing services in Nigeria and Africa',
  description:
    'Direct recruitment and managed staffing for office professionals and skilled trades — hire talent in Nigeria and staff teams across Africa.',
  openGraph: {
    title: 'Dealo recruitment & staffing services',
    description:
      'Hire office talent and skilled trades with clear pricing across Nigeria and Africa.',
  },
};

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
