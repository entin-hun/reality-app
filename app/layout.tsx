import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { pickLocale, isRtl, LOCALES, type Locale } from '@/lib/i18n';
import { CookieConsent } from '@/components/legal/CookieConsent';
import { LegalFooter } from '@/components/legal/LegalFooter';
import { MailerLiteScripts } from '@/components/MailerLiteScripts';

// ---------------------------------------------------------------------------
// Brand constants — referenced from JSON-LD + OG + Twitter.
// ---------------------------------------------------------------------------

export const SITE_URL = 'https://elitefightuniverse.com';
export const BRAND_NAME = 'Elite Fight Universe';
export const BRAND_SHORT = 'EFU';
export const BRAND_TAGLINE_HU =
  'Az Elite Fight Universe (EFU) egy harcművészeti és szórakoztatóipari ökoszisztéma, amely saját versenyrendszerre épülő küzdősport eseményeket, tehetségkutató formátumokat és digitális közvetítéseket foglal magába.';
export const BRAND_TAGLINE_EN =
  'Elite Fight Universe (EFU) is a martial-arts and entertainment ecosystem built on a homegrown rule set: live fight nights, a reality competition, and a multilingual broadcast platform.';
export const BRAND_FOUNDED = '2024';
export const BRAND_FOUNDER = 'Arttechno Kft.';
export const BRAND_COUNTRY = 'HU';

// ---------------------------------------------------------------------------
// Metadata — set metadataBase so all relative OG/canonical URLs resolve,
// add hreflang alternates for the 9 locales, declare Twitter/OG properly,
// and reference the AI-crawler endpoints.
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'EFU | Elite Fight Universe – MMA Reality & Live Fight Nights',
    template: '%s | Elite Fight Universe',
  },
  description: BRAND_TAGLINE_EN,
  applicationName: BRAND_NAME,
  keywords: [
    'Elite Fight Universe',
    'EFU',
    'MMA',
    'martial arts',
    'fight night',
    'reality show',
    'fighter',
    'K-1',
    'kickboxing',
    'Hungary',
    'Central Europe',
    'combat sports',
    'EFU Reality',
    'EFU Fight Night',
    'talent path',
  ],
  authors: [{ name: BRAND_FOUNDER, url: 'https://arttechno.hu' }],
  creator: BRAND_FOUNDER,
  publisher: BRAND_FOUNDER,
  alternates: {
    canonical: '/',
    languages: Object.fromEntries(
      LOCALES.map((l: Locale) => [l, `/${l}`])
    ),
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: LOCALES.filter((l) => l !== 'en'),
    siteName: BRAND_NAME,
    title: 'EFU | Elite Fight Universe – MMA Reality',
    description: BRAND_TAGLINE_EN,
    url: SITE_URL,
    images: [
      { url: '/og-image.jpg', width: 1200, height: 630, alt: BRAND_NAME },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@elitefightuniverse',
    creator: '@elitefightuniverse',
    title: 'EFU | Elite Fight Universe',
    description: BRAND_TAGLINE_EN,
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
};

// ---------------------------------------------------------------------------
// JSON-LD — GEO surface.
//   Organization + SportsOrganization + WebSite + BroadcastService + TVSeries
//   gives crawlers (Google, Bing, Apple, GPTBot, ClaudeBot, PerplexityBot,
//   Google-Extended, Meta-ExternalAgent) enough structured data to
//   confidently surface EFU for "elite fight universe", "EFU Reality",
//   "MMA reality Hungary", etc., and to render rich results.
// ---------------------------------------------------------------------------

function buildJsonLd(locale: Locale) {
  const inEnglish = locale === 'en';
  const tagline = inEnglish ? BRAND_TAGLINE_EN : BRAND_TAGLINE_HU;

  const org = {
    '@type': ['Organization', 'SportsOrganization'],
    '@id': `${SITE_URL}#org`,
    name: BRAND_NAME,
    alternateName: ['EFU', 'Elite Fight Universe (EFU)'],
    legalName: 'Arttechno Kft.',
    url: SITE_URL,
    logo: `${SITE_URL}/EfuLogo.png`,
    image: `${SITE_URL}/og-image.jpg`,
    description: tagline,
    foundingDate: BRAND_FOUNDED,
    founder: {
      '@type': 'Organization',
      name: BRAND_FOUNDER,
      url: 'https://arttechno.hu',
    },
    address: {
      '@type': 'PostalAddress',
      addressCountry: BRAND_COUNTRY,
      addressLocality: 'Budapest',
      postalCode: '1085',
    },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'press',
        email: 'press@elitefightuniverse.live',
        availableLanguage: [...LOCALES, 'en'],
      },
      {
        '@type': 'ContactPoint',
        contactType: 'partnerships',
        email: 'partnerships@elitefightuniverse.live',
        availableLanguage: ['en', 'hu'],
      },
      {
        '@type': 'ContactPoint',
        contactType: 'sponsorship',
        email: 'sponsorships@elitefightuniverse.live',
        availableLanguage: ['en', 'hu'],
      },
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: 'hello@elitefightuniverse.live',
        availableLanguage: [...LOCALES, 'en'],
      },
    ],
    sameAs: [
      'https://www.facebook.com/elitefightuniverse',
      'https://www.instagram.com/elitefightuniverse',
      'https://www.youtube.com/@elitefightuniverse',
      'https://www.tiktok.com/@elitefightuniverse',
      'https://twitter.com/elitefightuniverse',
    ],
    sport: 'Mixed Martial Arts',
    areaServed: [
      { '@type': 'Country', name: 'Hungary' },
      { '@type': 'Country', name: 'Slovakia' },
      { '@type': 'Country', name: 'Romania' },
      { '@type': 'Country', name: 'Germany' },
      { '@type': 'Country', name: 'Austria' },
      { '@type': 'Country', name: 'Croatia' },
      { '@type': 'Country', name: 'Serbia' },
      { '@type': 'Country', name: 'Slovenia' },
      { '@type': 'Country', name: 'Czechia' },
    ],
  };

  const website = {
    '@type': 'WebSite',
    '@id': `${SITE_URL}#site`,
    url: SITE_URL,
    name: BRAND_NAME,
    inLanguage: LOCALES,
    publisher: { '@id': `${SITE_URL}#org` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/harcosok?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  const broadcast = {
    '@type': 'BroadcastService',
    '@id': `${SITE_URL}#broadcast`,
    name: `${BRAND_NAME} Live`,
    broadcastServiceTier: 'free',
    inLanguage: LOCALES,
    broadcaster: { '@id': `${SITE_URL}#org` },
    liveUrl: `${SITE_URL}/watch`,
    videoFormat: 'HLS / LL-HLS',
    areaServed: org.areaServed,
  };

  const tvSeries = {
    '@type': 'TVSeries',
    '@id': `${SITE_URL}#series-reality`,
    name: 'EFU Reality',
    alternateName: ['Elite Fight Universe Reality'],
    description:
      'Multi-week elimination reality competition where amateur and professional martial artists compete under the homegrown EFU Ruleset for a contract to fight on EFU Fight Night cards.',
    genre: ['Sports', 'Reality'],
    inLanguage: LOCALES,
    numberOfSeasons: 2,
    productionCompany: { '@id': `${SITE_URL}#org` },
    trailer: { '@type': 'VideoObject', url: `${SITE_URL}/reality` },
    url: `${SITE_URL}/reality`,
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [org, website, broadcast, tvSeries],
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const locale = pickLocale({
    cookieLocale: cookieStore.get('NEXT_LOCALE')?.value,
    acceptLanguage: headerStore.get('accept-language') ?? undefined,
  });
  const dir = isRtl(locale) ? 'rtl' : 'ltr';
  const jsonLd = buildJsonLd(locale);
  return (
    <html lang={locale} dir={dir}>
      <head>
        <link rel="alternate" type="text/plain" href="/llms.txt" title="LLM short index" />
        <link rel="alternate" type="text/plain" href="/llms-full.txt" title="LLM full content" />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-brand-dark text-white antialiased min-h-screen">
        {/* MailerLite loader — mounted here (not in <head>) so it can be
            a client component that gates off /admin* / /dashboard* etc.
            See components/MailerLiteScripts.tsx for details. */}
        <MailerLiteScripts />
        <Navbar />
        {children}
        <LegalFooter />
        <CookieConsent />
      </body>
    </html>
  );
}
