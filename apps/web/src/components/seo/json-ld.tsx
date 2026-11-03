const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export function OrganizationJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${APP_URL}/#organization`,
        name: 'Dealo',
        url: APP_URL,
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
          availableLanguage: ['en'],
          url: `${APP_URL}/contact`,
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${APP_URL}/#website`,
        url: APP_URL,
        name: 'Dealo',
        publisher: { '@id': `${APP_URL}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: `${APP_URL}/blog?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
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
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
