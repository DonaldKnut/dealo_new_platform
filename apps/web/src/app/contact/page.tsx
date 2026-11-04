import type { Metadata } from 'next';

import { OpenModalOnMount } from '@/components/open-modal-on-mount';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  path: '/contact',
  title: 'Contact Dealo — talk to our hiring team',
  description: 'Questions about hiring, jobs, the Dealo API or our AI tools? Send a message and a real person will reply.',
});

export default function ContactPage() {
  return (
    <section className="container-page max-w-3xl pt-24 pb-20">
      <OpenModalOnMount modal="contact" />
      <p className="eyebrow">Contact</p>
      <h1 className="display-title mt-3 text-4xl sm:text-5xl">Talk to Dealo</h1>
      <p className="mt-6 text-lg leading-relaxed text-muted">
        Opening the contact form. Company details remain configurable and will be published once
        confirmed.
      </p>
    </section>
  );
}
