import { OpenModalOnMount } from '@/components/open-modal-on-mount';

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
