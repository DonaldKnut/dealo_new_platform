import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms governing use of the Dealo Talent Network platform and services.',
};

const updated = '30 October 2026';

export default function TermsPage() {
  return (
    <article className="container-page max-w-3xl pt-24 pb-20">
      <p className="eyebrow">Legal</p>
      <h1 className="display-title mt-3 text-4xl sm:text-5xl">Terms of Service</h1>
      <p className="mt-4 text-sm text-muted">Last updated: {updated}</p>
      <p className="mt-6 text-base leading-relaxed text-muted">
        These Terms of Service (“Terms”) govern your access to and use of Dealo Talent Network
        websites, applications, dashboards, APIs, and related offerings (the “Services”) operated by
        Dealo (“Dealo”, “we”, “us”). By creating an account, submitting a hiring request, applying as
        talent, or otherwise using the Services, you agree to these Terms and our{' '}
        <Link href="/privacy" className="font-semibold text-brand">
          Privacy Policy
        </Link>
        . If you do not agree, do not use the Services.
      </p>

      <Section title="1. Eligibility and accounts">
        <p>
          You must be at least 18 years old and able to form a binding contract. You are responsible
          for accurate registration information, safeguarding credentials, and all activity under
          your account. Notify us promptly of unauthorized use. We may suspend or terminate accounts
          that are inaccurate, abusive, fraudulent, or in breach of these Terms.
        </p>
      </Section>

      <Section title="2. Nature of the Services">
        <p>
          Dealo provides technology and operational workflows for recruitment and managed staffing,
          which may include role intake, sourcing, screening, shortlisting, interview coordination,
          placement support, and related communications. Dealo is not a traditional job board
          guarantee of employment. Unless a separate written agreement expressly states otherwise:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>Dealo does not guarantee that any employer will hire any candidate;</li>
          <li>Dealo does not guarantee that any professional will accept an offer or engagement;</li>
          <li>
            timelines, shortlist quality, and outcomes depend on market conditions, brief quality,
            candidate availability, and client cooperation;
          </li>
          <li>
            commercial fees, staffing arrangements, and SLAs (if any) are defined in separate
            proposals, order forms, or contracts.
          </li>
        </ul>
      </Section>

      <Section title="3. Employer and organization responsibilities">
        <p>If you use the Services as an employer or on behalf of an organization, you represent that you:</p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>have authority to bind that organization;</li>
          <li>provide lawful, accurate role briefs and hiring criteria;</li>
          <li>
            comply with employment, labour, anti-discrimination, data protection, and immigration
            laws applicable to your hiring;
          </li>
          <li>
            make your own hiring decisions and are solely responsible for offers, employment terms,
            onboarding, payroll (unless a separate managed arrangement says otherwise), workplace
            safety, and statutory contributions;
          </li>
          <li>
            will not use Dealo data for spam, unlawful screening, or purposes unrelated to evaluating
            candidates for the stated role.
          </li>
        </ul>
      </Section>

      <Section title="4. Professional / talent responsibilities">
        <p>If you join as a professional, you agree to:</p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>provide truthful profile, experience, and document information;</li>
          <li>keep credentials and uploaded documents current and lawful to share;</li>
          <li>
            understand that shortlisting or interviews do not create employment or entitlement to
            placement;
          </li>
          <li>
            not misrepresent identity, qualifications, availability, or right to work.
          </li>
        </ul>
      </Section>

      <Section title="5. No employment agency warranty beyond agreed scope">
        <p>
          Where Dealo provides recruitment or managed staffing support, the precise scope, fees, and
          responsibilities are set out in a separate commercial agreement. Absent such agreement,
          platform use alone does not create an exclusive agency, employer-of-record, or payroll
          relationship. Dealo may introduce or facilitate candidates; the employer remains the hiring
          decision-maker unless expressly agreed otherwise in writing.
        </p>
      </Section>

      <Section title="6. Fees and taxes">
        <p>
          Paid Services are billed according to the applicable order form, invoice, or subscription
          terms. Fees are generally non-refundable except where required by law or expressly stated
          in writing. You are responsible for applicable taxes. Late amounts may incur suspension of
          access and recovery costs where permitted.
        </p>
      </Section>

      <Section title="7. Acceptable use">
        <p>You must not:</p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>scrape, harvest, or reverse engineer the Services except as allowed by law;</li>
          <li>upload malware, unlawful content, or infringing materials;</li>
          <li>impersonate others or attempt unauthorized access;</li>
          <li>interfere with platform integrity, rate limits, or other users;</li>
          <li>use the Services for discriminatory, fraudulent, or illegal hiring practices.</li>
        </ul>
      </Section>

      <Section title="8. Intellectual property">
        <p>
          Dealo and its licensors own the Services, branding, software, and content (excluding your
          user content). You receive a limited, non-exclusive, non-transferable license to use the
          Services as permitted. You retain ownership of content you submit, and grant Dealo a
          worldwide license to host, process, and display it as needed to operate the Services and
          fulfill recruitment/staffing workflows.
        </p>
      </Section>

      <Section title="9. Confidentiality">
        <p>
          Each party should treat non-public business and candidate information received through the
          Services as confidential and use it only for legitimate hiring/staffing purposes, except
          where disclosure is required by law or information is already public through no fault of
          the receiving party.
        </p>
      </Section>

      <Section title="10. Disclaimers">
        <p>
          THE SERVICES ARE PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE MAXIMUM EXTENT PERMITTED BY
          LAW, DEALO DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY,
          FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. DEALO DOES NOT WARRANT
          UNINTERRUPTED OR ERROR-FREE OPERATION, OR THAT CANDIDATE INFORMATION IS COMPLETE OR
          ACCURATE.
        </p>
      </Section>

      <Section title="11. Limitation of liability">
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, DEALO AND ITS AFFILIATES, OFFICERS, EMPLOYEES, AND
          AGENTS WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR
          PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, GOODWILL, OR BUSINESS
          OPPORTUNITY, EVEN IF ADVISED OF THE POSSIBILITY. DEALO’S TOTAL LIABILITY ARISING OUT OF OR
          RELATED TO THE SERVICES WILL NOT EXCEED THE GREATER OF (A) FEES PAID BY YOU TO DEALO FOR
          THE SERVICES GIVING RISE TO THE CLAIM IN THE THREE (3) MONTHS BEFORE THE EVENT, OR (B)
          NGN 50,000. SOME JURISDICTIONS DO NOT ALLOW CERTAIN LIMITATIONS; IN THOSE CASES, LIABILITY
          IS LIMITED TO THE FULLEST EXTENT PERMITTED.
        </p>
      </Section>

      <Section title="12. Indemnity">
        <p>
          You agree to defend, indemnify, and hold harmless Dealo from claims, damages, losses, and
          expenses (including reasonable legal fees) arising from your content, hiring decisions,
          employment practices, misuse of the Services, or breach of these Terms or applicable law.
        </p>
      </Section>

      <Section title="13. Suspension and termination">
        <p>
          You may stop using the Services at any time. We may suspend or terminate access for breach,
          risk, non-payment, legal requirement, or discontinuation of the Services. Provisions that
          by nature should survive (including IP, disclaimers, liability limits, indemnity, and
          dispute terms) survive termination.
        </p>
      </Section>

      <Section title="14. Governing law and disputes">
        <p>
          These Terms are governed by the laws of the Federal Republic of Nigeria, without regard to
          conflict-of-law rules. Courts located in Nigeria shall have exclusive jurisdiction, unless
          mandatory consumer protections require otherwise. You agree to attempt good-faith
          resolution with Dealo before filing a formal claim.
        </p>
      </Section>

      <Section title="15. Changes">
        <p>
          We may modify these Terms by posting an updated version with a new “Last updated” date.
          Continued use after changes constitutes acceptance. If you disagree, stop using the
          Services.
        </p>
      </Section>

      <Section title="16. Contact">
        <p>
          Questions about these Terms: use the{' '}
          <Link href="/contact" className="font-semibold text-brand">
            contact form
          </Link>
          . Related:{' '}
          <Link href="/privacy" className="font-semibold text-brand">
            Privacy Policy
          </Link>
          .
        </p>
      </Section>

      <p className="mt-10 rounded-2xl border border-border bg-surface/60 p-4 text-xs leading-relaxed text-muted">
        These Terms are a protective baseline for platform use and do not replace bespoke commercial
        contracts for recruitment or managed staffing engagements. Have counsel review before
        relying on them for regulated or high-risk transactions.
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
