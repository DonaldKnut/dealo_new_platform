import { APP_URL } from '@/lib/seo';

export function OrganizationJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${APP_URL}/#organization`,
        name: 'Dealo',
        alternateName: 'Dealo Talent Network',
        url: APP_URL,
        logo: {
          '@type': 'ImageObject',
          url: 'https://res.cloudinary.com/dyaetoldv/image/upload/v1793397172/Dealo_Talent_Network_Logo_psqwch.png',
        },
        knowsAbout: ['Recruitment', 'Managed staffing', 'Skilled trades', 'AI-assisted hiring', 'Workforce management'],
        description:
          'Dealo helps businesses hire checked office talent and skilled trades in Nigeria, across Africa, and for inbound global recruitment.',
        areaServed: [
          { '@type': 'Country', name: 'Nigeria' },
          { '@type': 'Place', name: 'Africa' },
          { '@type': 'Place', name: 'Worldwide' },
        ],
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'sales',
          availableLanguage: ['en', 'fr', 'zh', 'ko'],
          url: `${APP_URL}/contact`,
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${APP_URL}/#website`,
        url: APP_URL,
        name: 'Dealo',
        publisher: { '@id': `${APP_URL}/#organization` },
        inLanguage: 'en-NG',
        potentialAction: {
          '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: `${APP_URL}/jobs?q={search_term_string}` },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'EmploymentAgency',
        '@id': `${APP_URL}/#agency`,
        name: 'Dealo',
        url: APP_URL,
        parentOrganization: { '@id': `${APP_URL}/#organization` },
        address: { '@type': 'PostalAddress', addressLocality: 'Lagos', addressCountry: 'NG' },
        areaServed: [
          { '@type': 'City', name: 'Lagos' },
          { '@type': 'City', name: 'Abuja' },
          { '@type': 'Country', name: 'Nigeria' },
        ],
        priceRange: '₦₦',
      },
      {
        '@type': 'Service',
        name: 'Direct recruitment',
        serviceType: 'Recruitment',
        provider: { '@id': `${APP_URL}/#organization` },
        areaServed: ['Nigeria', 'Africa'],
        description:
          'Hire office professionals and skilled trades onto your payroll with Dealo shortlists.',
        url: `${APP_URL}/services/direct-recruitment`,
      },
      {
        '@type': 'Service',
        name: 'Managed staffing',
        serviceType: 'Staffing',
        provider: { '@id': `${APP_URL}/#organization` },
        areaServed: ['Nigeria', 'Africa'],
        description:
          'Managed staffing for office roles and skilled trades with clear pricing and terms.',
        url: `${APP_URL}/services/managed-staffing`,
      },
      {
        '@type': 'Service',
        name: 'Temp and contract cover',
        serviceType: 'Temporary staffing',
        provider: { '@id': `${APP_URL}/#organization` },
        areaServed: ['Nigeria', 'Africa'],
        description:
          'Day-rate cover for skilled trades and short office roles with clear mark-up.',
        url: `${APP_URL}/services/contract-cover`,
      },
      {
        '@type': 'Service',
        name: 'Talent training after hire',
        serviceType: 'Training',
        provider: { '@id': `${APP_URL}/#organization` },
        areaServed: ['Nigeria', 'Africa'],
        description:
          'Employer-paid onboarding and upskilling modules for placed talent.',
        url: `${APP_URL}/services/talent-training`,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
