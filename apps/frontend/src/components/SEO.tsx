import { Helmet } from "react-helmet-async";

type StructuredData = Record<string, unknown>;

type SEOProps = {
  title?: string;
  description?: string;
  canonical?: string;
  image?: string;
  pathname?: string;
  jsonLd?: StructuredData | StructuredData[];
  noindex?: boolean;
  keywords?: string;
};

const FALLBACK_BASE_URL = "https://checkout-77d99.web.app";

const getSiteUrl = () => {
  const envUrl = import.meta.env.VITE_SITE_URL as string | undefined;
  if (envUrl) {
    return envUrl.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin.replace(/\/+$/, "");
  }
  return FALLBACK_BASE_URL;
};

const SITE_URL = getSiteUrl();
const SITE_NAME = "Checkout POS";
const DEFAULT_TITLE = `${SITE_NAME} | Fast POS & Retail Management Software`;
const DEFAULT_DESCRIPTION =
  "Checkout POS is the modern point-of-sale platform for pharmacies, supermarkets, restaurants, and retailers that need lightning-fast checkout, real-time inventory, and actionable analytics.";
const DEFAULT_IMAGE = `${SITE_URL}/checkout-icon-512.png`;

const defaultStructuredData: StructuredData[] = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: DEFAULT_IMAGE,
    sameAs: [
      "https://twitter.com/checkoutpos",
      "https://www.linkedin.com/company/checkout-pos",
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "sales",
        email: "sales@checkoutpos.com",
        areaServed: "NG",
        availableLanguage: ["English"],
      },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  },
];

const toAbsoluteUrl = (value?: string) => {
  if (!value) return SITE_URL;
  if (/^https?:\/\//i.test(value)) return value;
  return `${SITE_URL}${value.startsWith("/") ? value : `/${value}`}`;
};

export function SEO({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  canonical,
  image,
  pathname,
  jsonLd,
  noindex = false,
  keywords,
}: SEOProps) {
  const url = toAbsoluteUrl(canonical ?? pathname ?? "/");
  const openGraphImage = toAbsoluteUrl(image ?? "/checkout-icon-512.png");

  const extraSchemas = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];
  const structuredDataList = [...defaultStructuredData, ...extraSchemas];

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={url} />
      <meta name="og:locale" content="en_NG" />

      {/* Robots */}
      <meta
        name="robots"
        content={
          noindex ? "noindex,nofollow" : "index,follow,max-image-preview:large"
        }
      />

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={openGraphImage} />
      <meta property="og:site_name" content={SITE_NAME} />

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
