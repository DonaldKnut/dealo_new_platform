'use client';

import Link from 'next/link';
import { ArrowUpRight, Mail } from 'lucide-react';

import { BrandLogo } from '@/components/brand-logo';
import { useLocale } from '@/components/i18n/locale-context';
import { useModal } from '@/components/modals/modal-context';

export function SiteFooter() {
  const { open } = useModal();
  const { t } = useLocale();

  return (
    <footer className="relative overflow-hidden border-t border-border">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--hero-glow),transparent_55%)]" />

      <div className="container-page relative py-10 min-[340px]:py-16">
        <div className="grid gap-6 rounded-[1.25rem] border border-border bg-surface/80 p-4 backdrop-blur min-[340px]:gap-10 min-[340px]:rounded-[2rem] min-[340px]:p-8 sm:p-10 lg:grid-cols-[1.4fr_0.9fr]">
          <div>
            <BrandLogo />
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted min-[340px]:mt-4 min-[340px]:text-base">
              {t('footer.blurb')}
            </p>
            <div className="mt-5 flex flex-col gap-2.5 min-[340px]:mt-8 min-[400px]:flex-row min-[400px]:flex-wrap min-[400px]:gap-3">
              <button type="button" className="btn-primary" onClick={() => open('hire')}>
                {t('cta.hire')}
              </button>
              <button type="button" className="btn-secondary" onClick={() => open('contact')}>
                <Mail className="h-4 w-4" />
                {t('cta.contact')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 min-[280px]:grid-cols-2 min-[340px]:gap-8 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
            <FooterColumn title={t('footer.hireWith')}>
              <Link href="/services" className="footer-link">
                {t('footer.services')}
              </Link>
              <Link href="/how-it-works" className="footer-link">
                {t('footer.how')}
              </Link>
              <button type="button" className="footer-link text-left" onClick={() => open('hire')}>
                {t('footer.requestHire')}
              </button>
            </FooterColumn>
            <FooterColumn title={t('footer.whoFor')}>
              <Link href="/for-employers" className="footer-link">
                {t('footer.employers')}
              </Link>
              <Link href="/for-professionals" className="footer-link">
                {t('footer.professionals')}
              </Link>
              <Link href="/resume-builder" className="footer-link">
                {t('footer.cvBuilder')}
              </Link>
              <Link href="/auth/register" className="footer-link">
                {t('footer.createAccount')}
              </Link>
            </FooterColumn>
            <FooterColumn title={t('footer.company')}>
              <Link href="/about" className="footer-link">
                {t('footer.about')}
              </Link>
              <Link href="/developers" className="footer-link">
                {t('footer.developers')}
              </Link>
              <button type="button" className="footer-link text-left" onClick={() => open('contact')}>
                {t('nav.contact')}
              </button>
              <Link href="/privacy" className="footer-link">
                {t('footer.privacy')}
              </Link>
              <Link href="/terms" className="footer-link">
                {t('footer.terms')}
              </Link>
            </FooterColumn>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-border pt-5 min-[340px]:mt-8 min-[340px]:gap-4 min-[340px]:pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted min-[340px]:text-sm">
            © {new Date().getFullYear()} Dealo. {t('footer.rights')}
          </p>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 text-xs font-semibold text-foreground transition hover:text-brand min-[340px]:text-sm"
          >
            {t('cta.signInAccount')}
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
