import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { pickLocale, isRtl } from '@/lib/i18n';
import { CookieConsent } from '@/components/legal/CookieConsent';
import { LegalFooter } from '@/components/legal/LegalFooter';

export const metadata: Metadata = {
  title: 'EFU | Elite Fight Universe – MMA Reality',
  description:
    'Az Elite Fight Universe (EFU) egy harcművészeti és szórakoztatóipari ökoszisztéma, amely saját versenyrendszerre épülő küzdősport eseményeket, tehetségkutató formátumokat és digitális közvetítéseket foglal magába. Az EFU célja egy közép-európai harcművészeti közösség felépítése.',
  openGraph: {
    title: 'EFU | Elite Fight Universe – MMA Reality',
    description:
      'Az Elite Fight Universe (EFU) egy harcművészeti és szórakoztatóipari ökoszisztéma. Élő közvetítések, EFU Reality és EFU Fight Night események — mindez egy bérlettel.',
    images: ['/og-image.jpg'],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const locale = pickLocale({
    cookieLocale: cookieStore.get('NEXT_LOCALE')?.value,
    acceptLanguage: headerStore.get('accept-language') ?? undefined,
  });
  const dir = isRtl(locale) ? 'rtl' : 'ltr';
  return (
    <html lang={locale} dir={dir}>
      <body className="bg-brand-dark text-white antialiased min-h-screen">
        <Navbar />
        {children}
        <LegalFooter />
        <CookieConsent />
      </body>
    </html>
  );
}
