import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'You are offline',
  robots: { index: false },
};

export default function OfflinePage() {
  return (
    <section className="container-page flex min-h-[70dvh] flex-col items-center justify-center py-24 text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-2xl">📡</span>
      <h1 className="display-title mt-5 text-2xl text-foreground sm:text-3xl">You are offline</h1>
      <p className="mt-3 max-w-sm text-sm text-muted">
        Check your internet and try again. Pages you opened before may still work.
      </p>
      <Link href="/" className="btn-primary mt-6">
        Try again
      </Link>
    </section>
  );
}
