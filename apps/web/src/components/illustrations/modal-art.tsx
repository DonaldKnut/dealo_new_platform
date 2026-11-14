'use client';

import { PromoFlyer } from '@/components/illustrations/promo-flyer';
import { CONTACT_PROMO_IMAGES } from '@/lib/promo-images';

export function HireIllustration() {
  return (
    <div className="relative h-full min-h-full w-full overflow-hidden">
      <PromoFlyer sizes="(max-width: 1024px) 0px, 480px" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#071f14]/70 to-transparent" />
    </div>
  );
}

export function AuthIllustration() {
  return (
    <div className="relative h-full min-h-full w-full overflow-hidden">
      <PromoFlyer sizes="(max-width: 1024px) 0px, 480px" intervalMs={4800} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#071f14]/75 to-transparent" />
    </div>
  );
}

/** Contact modal promo — auto-rotating office + trades team photos. */
export function ContactIllustration() {
  return (
    <div className="relative h-full min-h-full w-full overflow-hidden">
      <PromoFlyer
        images={CONTACT_PROMO_IMAGES}
        intervalMs={4500}
        objectPosition="center 30%"
        sizes="(max-width: 1024px) 0px, 480px"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#071f14]/70 to-transparent" />
    </div>
  );
}
