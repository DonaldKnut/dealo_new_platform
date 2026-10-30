'use client';

import Link from 'next/link';
import { ArrowUpRight, Mail } from 'lucide-react';

import { BrandLogo } from '@/components/brand-logo';
import { useModal } from '@/components/modals/modal-context';

export function SiteFooter() {
  const { open } = useModal();

  return (
    <footer className="relative overflow-hidden border-t border-border">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--hero-glow),transparent_55%)]" />

      <div className="container-page relative py-10 min-[340px]:py-16">
        <div className="grid gap-6 rounded-[1.25rem] border border-border bg-surface/80 p-4 backdrop-blur min-[340px]:gap-10 min-[340px]:rounded-[2rem] min-[340px]:p-8 sm:p-10 lg:grid-cols-[1.4fr_0.9fr]">
          <div>
            <BrandLogo />
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted min-[340px]:mt-4 min-[340px]:text-base">
              Professional recruitment, managed staffing, and talent operations for businesses that
              need clarity, speed, and accountable placement outcomes.
            </p>
            <div className="mt-5 flex flex-col gap-2.5 min-[340px]:mt-8 min-[400px]:flex-row min-[400px]:flex-wrap min-[400px]:gap-3">
              <button type="button" className="btn-primary" onClick={() => open('hire')}>
                Request talent
              </button>
              <button type="button" className="btn-secondary" onClick={() => open('contact')}>
                <Mail className="h-4 w-4" />
                Contact
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 min-[280px]:grid-cols-2 min-[340px]:gap-8 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
            <FooterColumn title="Product">
              <Link href="/services" className="footer-link">
                Services
              </Link>
              <Link href="/how-it-works" className="footer-link">
                How it works
              </Link>
              <button type="button" className="footer-link text-left" onClick={() => open('hire')}>
                Hiring request
              </button>
            </FooterColumn>
            <FooterColumn title="Audiences">
              <Link href="/for-employers" className="footer-link">
                Employers
              </Link>
              <Link href="/for-professionals" className="footer-link">
                Professionals
              </Link>
              <Link href="/auth/register" className="footer-link">
                Create account
              </Link>
            </FooterColumn>
            <FooterColumn title="Company">
              <Link href="/about" className="footer-link">
                About
              </Link>
              <button type="button" className="footer-link text-left" onClick={() => open('contact')}>
                Contact
              </button>
              <Link href="/privacy" className="footer-link">
                Privacy
              </Link>
              <Link href="/terms" className="footer-link">
                Terms
              </Link>
            </FooterColumn>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-border pt-5 min-[340px]:mt-8 min-[340px]:gap-4 min-[340px]:pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted min-[340px]:text-sm">
            © {new Date().getFullYear()} Dealo. All rights reserved.
          </p>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 text-xs font-semibold text-foreground transition hover:text-brand min-[340px]:text-sm"
          >
            Sign in to workspace
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 text-sm">
      <p className="text-xs font-semibold tracking-[0.16em] uppercase text-brand">{title}</p>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}
