import { Helmet } from 'react-helmet-async';

type StructuredData = Record<string, any>;

type SEOProps = {
  title?: string;
  description?: string;
  canonical?: string;
  image?: string;
  pathname?: string;
  jsonLd?: StructuredData | StructuredData[];
};

const DEFAULT_TITLE = 'Checkout POS | Fast POS & Retail Management Software';
const DEFAULT_DESCRIPTION =
  'Checkout POS is the modern point-of-sale platform for pharmacies, supermarkets, restaurants, and retailers that need lightning-fast checkout, real-time inventory, and actionable analytics.';
const BASE_URL = 'https://checkout-77d99.web.app';
const DEFAULT_IMAGE = `${BASE_URL}/checkout-icon-512.png`;

export function SEO({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  canonical,
  image,
  pathname,
  jsonLd,
}: SEOProps) {
  const url = canonical ?? (pathname ? `${BASE_URL}${pathname}` : BASE_URL);
  const openGraphImage = image ?? DEFAULT_IMAGE;
  const defaultStructuredData: StructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Checkout POS',
    url: BASE_URL,
    logo: DEFAULT_IMAGE,
    sameAs: ['https://twitter.com/checkoutpos', 'https://www.linkedin.com/company/checkout-pos'],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'sales',
        email: 'sales@checkoutpos.com',
      },
    ],
  };
  const resolvedJsonLd = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];
  const structuredDataList = [defaultStructuredData, ...resolvedJsonLd];

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={openGraphImage} />
      <meta property="og:site_name" content="Checkout POS" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={openGraphImage} />
      {structuredDataList.map((schema, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}
