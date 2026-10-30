'use client';

import { FileSignature, Headphones, Layers3 } from 'lucide-react';

import { CtaBanner } from '@/components/marketing/cta-banner';
import { FeatureAdGrid } from '@/components/marketing/feature-ad-grid';
import { PageHero } from '@/components/marketing/page-hero';
import { useModal } from '@/components/modals/modal-context';

export default function ManagedStaffingPage() {
  const { open } = useModal();

  return (
    <div>
      <PageHero
        eyebrow="Managed staffing"
        title="Staffing arrangements with operational clarity"
        description="Dealo uses its administrative platform to take care of hiring needs — agreed commercial terms and operational follow-through, so less sits on the client."
        actions={
          <button type="button" className="btn-primary" onClick={() => open('hire')}>
            Request managed staffing
          </button>
        }
      />
      <FeatureAdGrid
        eyebrow="How it works"
        title="Dealo runs the staffing operations"
        description="You agree the arrangement. Dealo carries sourcing, screening, and placement workflow."
        items={[
          {
            icon: FileSignature,
            title: 'Clear commercial terms',
            body: 'Engagement scope, duration notes, and billing structure stay explicit.',
          },
          {
            icon: Layers3,
            title: 'Platform-led hiring',
            body: 'Dealo’s operating process handles the hiring load end to end.',
          },
          {
            icon: Headphones,
            title: 'Ongoing follow-through',
            body: 'Not a one-off introduction — staffing arrangements stay operationally owned.',
          },
        ]}
      />
      <CtaBanner />
    </div>
  );
}
