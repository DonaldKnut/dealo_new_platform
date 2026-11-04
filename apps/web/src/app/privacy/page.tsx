import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Dealo Talent Network collects, uses, stores, and protects personal data.',
  alternates: { canonical: '/privacy' },
};

const updated = '30 October 2026';

export default function PrivacyPage() {
  return (
    <article className="container-page max-w-3xl pt-24 pb-20">
      <p className="eyebrow">Legal</p>
      <h1 className="display-title mt-3 text-4xl sm:text-5xl">Privacy Policy</h1>
      <p className="mt-4 text-sm text-muted">Last updated: {updated}</p>
      <p className="mt-6 text-base leading-relaxed text-muted">
        This Privacy Policy explains how Dealo Talent Network (“Dealo”, “we”, “us”, or “our”)
        collects, uses, discloses, stores, and protects personal information when you use our
        websites, applications, dashboards, and related services (the “Services”). By accessing or
        using the Services, you acknowledge this Policy. If you do not agree, do not use the
        Services.
      </p>

      <Section title="1. Who we are">
        <p>
          Dealo operates a professional recruitment, managed staffing, and talent operations
          platform focused on connecting employers/organizations with professionals. For privacy
          questions, contact us through the{' '}
          <Link href="/contact" className="font-semibold text-brand">
            contact form
          </Link>{' '}
          or the email address published on the Services.
        </p>
      </Section>

      <Section title="2. Information we collect">
        <p>We may collect:</p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            <strong className="text-foreground">Account data:</strong> name, email, phone, password
            credentials (hashed), role (employer/talent/staff), organization details, and
            authentication provider identifiers (e.g. Google account ID).
          </li>
          <li>
            <strong className="text-foreground">Hiring and staffing data:</strong> company name,
            contact details, role briefs, requirements, compensation ranges, locations, work
            arrangements, interview notes, shortlists, and related commercial correspondence.
          </li>
          <li>
            <strong className="text-foreground">Talent profile data:</strong> professional history,
            skills, documents you upload, availability, and application activity.
          </li>
          <li>
            <strong className="text-foreground">Usage and device data:</strong> IP address,
            browser/device type, pages viewed, referring URLs, approximate location, cookies, and
            similar technologies.
          </li>
          <li>
            <strong className="text-foreground">Communications:</strong> messages you send via
            contact forms, support channels, and transactional emails.
          </li>
        </ul>
      </Section>

      <Section title="3. How we use information">
        <p>We use personal data to:</p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>create and manage accounts, authenticate users, and secure the Services;</li>
          <li>process hiring requests, sourcing, screening, shortlisting, interviews, and placement workflows;</li>
          <li>operate managed staffing arrangements and related commercial follow-through;</li>
          <li>communicate service updates, security notices, and (where permitted) product information;</li>
          <li>improve, monitor, and protect the platform against fraud, abuse, and security incidents;</li>
          <li>comply with legal obligations and enforce our Terms of Service.</li>
        </ul>
      </Section>

      <Section title="4. Legal bases (where applicable)">
        <p>
          Depending on applicable law, we process data based on contract performance, legitimate
          interests (operating a recruitment/staffing platform, security, and product improvement),
          consent (where required), and legal compliance. You may withdraw consent where processing
          is consent-based, without affecting prior lawful processing.
        </p>
      </Section>

      <Section title="5. Sharing and disclosure">
        <p>We do not sell personal data. We may share information with:</p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            <strong className="text-foreground">Employers / organizations</strong> when you apply,
            are shortlisted, or are considered for a role or staffing engagement;
          </li>
          <li>
            <strong className="text-foreground">Service providers</strong> (hosting, email,
            analytics, authentication, payments) under confidentiality and processing terms;
          </li>
          <li>
            <strong className="text-foreground">Professional advisers</strong> and authorities when
            required by law, court order, or to protect rights, safety, and security;
          </li>
          <li>
            <strong className="text-foreground">Business transfers</strong> in connection with a
            merger, acquisition, financing, or sale of assets, subject to appropriate safeguards.
          </li>
        </ul>
      </Section>

      <Section title="6. International transfers">
        <p>
          Your information may be processed in Nigeria and other countries where we or our
          providers operate. Where required, we use appropriate safeguards for cross-border
          transfers.
        </p>
      </Section>

      <Section title="7. Retention">
        <p>
          We retain personal data only as long as needed for the purposes described, including
          account lifecycle, recruitment/staffing records, dispute resolution, security, and legal
          retention requirements. When no longer needed, we delete or anonymize data where
          practicable.
        </p>
      </Section>

      <Section title="8. Security">
        <p>
          We implement administrative, technical, and organizational measures designed to protect
          personal data (including access controls, encrypted transport where applicable, and
          hashed passwords). No method of transmission or storage is 100% secure; you use the
          Services at your own residual risk.
        </p>
      </Section>

      <Section title="9. Your rights">
        <p>
          Subject to applicable law, you may request access, correction, deletion, restriction,
          portability, or objection to certain processing. You may also lodge a complaint with a
          relevant data protection authority. To exercise rights, contact us via the Services. We
          may need to verify your identity before responding.
        </p>
      </Section>

      <Section title="10. Cookies and similar technologies">
        <p>
          We use essential cookies for authentication and security, and may use analytics cookies to
          understand usage. You can control cookies through browser settings; disabling some cookies
          may limit functionality.
        </p>
      </Section>

      <Section title="11. Children’s privacy">
        <p>
          The Services are not directed to individuals under 18. We do not knowingly collect
          personal data from children. If you believe a child has provided data, contact us to
          request deletion.
        </p>
      </Section>

      <Section title="12. Third-party links and OAuth">
        <p>
          If you sign in with Google or other providers, those providers process data under their
          own policies. The Services may link to third-party sites we do not control; their privacy
          practices are their responsibility.
        </p>
      </Section>

      <Section title="13. Changes">
        <p>
          We may update this Policy from time to time. Material changes will be indicated by
          updating the “Last updated” date and, where appropriate, additional notice in the
          Services. Continued use after changes means you accept the updated Policy.
        </p>
      </Section>

      <Section title="14. Contact">
        <p>
          For privacy requests, use the{' '}
          <Link href="/contact" className="font-semibold text-brand">
            contact form
          </Link>{' '}
          or the support email listed on the Services. See also our{' '}
          <Link href="/terms" className="font-semibold text-brand">
            Terms of Service
          </Link>
          .
        </p>
      </Section>

      <p className="mt-10 rounded-2xl border border-border bg-surface/60 p-4 text-xs leading-relaxed text-muted">
        This Policy is provided for transparency and operational clarity. It does not constitute
        legal advice. Dealo may update these terms as the business, products, and applicable laws
        evolve. For jurisdiction-specific requirements, obtain local legal counsel.
      </p>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 border-t border-border pt-8">
      <h2 className="font-display text-xl text-foreground sm:text-2xl">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted sm:text-base">{children}</div>
    </section>
  );
}
