import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { legalDocumentIds, getLegalDocument, legalLabel, type LegalDocumentId } from '@/lib/legal/content';
import { pickLocale } from '@/lib/i18n';

export function generateStaticParams() { return legalDocumentIds.map((document) => ({ document })); }
export default async function LegalDocumentPage({ params }: { params: Promise<{ document: string }> }) {
  const { document } = await params;
  if (!legalDocumentIds.includes(document as LegalDocumentId)) notFound();
  const cookieStore = await cookies();
  const headerStore = await headers();
  const locale = pickLocale({ cookieLocale: cookieStore.get('NEXT_LOCALE')?.value, acceptLanguage: headerStore.get('accept-language') ?? undefined });
  const id = document as LegalDocumentId;
  const doc = getLegalDocument(id, locale);
  return <main className="min-h-screen bg-brand-dark px-4 pb-16 pt-28 text-white"><article className="mx-auto max-w-4xl"><nav className="mb-8 flex flex-wrap gap-2" aria-label="Jogi dokumentumok">{legalDocumentIds.map((item) => <Link key={item} href={`/legal/${item}`} className={`rounded-full px-3 py-1.5 text-sm ${item === id ? 'bg-brand-red text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}>{legalLabel(item, locale)}</Link>)}</nav><p className="text-xs font-bold uppercase tracking-widest text-brand-red">Jogi dokumentum · tervezet</p><h1 className="mt-3 text-4xl font-black uppercase sm:text-5xl" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>{doc.title}</h1><p className="mt-3 text-sm text-gray-400">Hatálybalépés / utolsó felülvizsgálat: {doc.effectiveDate}</p><div className="mt-7 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-100">{doc.reviewNotice}</div><div className="mt-10 space-y-9 leading-relaxed text-gray-300">{doc.sections.map((section) => <section key={section.heading}><h2 className="mb-3 text-2xl font-bold text-white">{section.heading}</h2>{section.paragraphs?.map((p) => <p key={p} className="mb-3">{p}</p>)}{section.bullets && <ul className="list-disc space-y-2 pl-6">{section.bullets.map((b) => <li key={b}>{b}</li>)}</ul>}</section>)}</div></article></main>;
}
