import { promises as fs } from 'fs';
import path from 'path';
import Link from 'next/link';
import type { Page, Block } from '@/lib/cms/types';

/**
 * CMS Preview oldal
 * Ez az oldal a data/cms/pages/ könyvtárból olvassa be az oldalakat
 * és megjeleníti a tartalmukat, hogy tesztelni lehessen a CMS szerkesztést.
 */

async function readPage(slug: string): Promise<Page | null> {
  try {
    const filePath = path.join(process.cwd(), 'data', 'cms', 'pages', `${slug}.json`);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as Page;
  } catch {
    return null;
  }
}

function BlockRenderer({ block }: { block: Block }) {
  if (!block.visible) return null;

  const paddingClass = {
    none: 'p-0',
    small: 'py-4',
    medium: 'py-8',
    large: 'py-16',
  }[block.settings.padding || 'medium'];

  const bgStyle = block.settings.backgroundColor
    ? { backgroundColor: block.settings.backgroundColor }
    : {};

  const hu = (val: any) => (val && typeof val === 'object' ? val.hu : val);

  if (block.type === 'hero') {
    const { title, subtitle, ctaText, ctaLink } = block.content;
    return (
      <section
        className={`${paddingClass} ${block.layout === 'split' ? 'text-center' : ''}`}
        style={bgStyle}
      >
        <div className="container mx-auto px-4">
          {hu(title) && (
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
              {hu(title)}
            </h1>
          )}
          {hu(subtitle) && (
            <p className="text-xl text-gray-300 mb-6">
              {hu(subtitle)}
            </p>
          )}
          {hu(ctaText) && hu(ctaLink) && (
            <a
              href={hu(ctaLink)}
              className="inline-block bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition"
            >
              {hu(ctaText)}
            </a>
          )}
        </div>
      </section>
    );
  }

  if (block.type === 'text') {
    const { title, body } = block.content;
    return (
      <section className={paddingClass} style={bgStyle}>
        <div className="container mx-auto px-4 max-w-4xl">
          {hu(title) && (
            <h2 className="text-3xl font-bold text-white mb-4">{hu(title)}</h2>
          )}
          {hu(body) && (
            <div className="text-gray-300 prose prose-invert">
              {hu(body)}
            </div>
          )}
        </div>
      </section>
    );
  }

  if (block.type === 'cta') {
    const { title, buttonText, buttonLink } = block.content;
    return (
      <section className={paddingClass} style={bgStyle}>
        <div className="container mx-auto px-4 text-center">
          {hu(title) && (
            <h2 className="text-3xl font-bold text-white mb-6">{hu(title)}</h2>
          )}
          {hu(buttonText) && hu(buttonLink) && (
            <a
              href={hu(buttonLink)}
              className="inline-block bg-gold-500 text-black px-8 py-4 rounded-lg font-bold hover:bg-gold-400 transition"
            >
              {hu(buttonText)}
            </a>
          )}
        </div>
      </section>
    );
  }

  // Unknown block type
  return (
    <section className={paddingClass} style={bgStyle}>
      <div className="container mx-auto px-4">
        <div className="border border-dashed border-gray-600 rounded-lg p-6">
          <p className="text-gray-500 text-sm mb-2">
            Ismeretlen blokk típus: <code className="text-gold-500">{block.type}</code>
          </p>
          <pre className="text-xs text-gray-400 overflow-auto">
            {JSON.stringify(block.content, null, 2)}
          </pre>
        </div>
      </div>
    </section>
  );
}

export default async function CmsPreviewPage({
  searchParams,
}: {
  searchParams: { slug?: string };
}) {
  const slug = searchParams.slug || 'home';
  const page = await readPage(slug);

  return (
    <div className="min-h-screen bg-brand-dark">
      {/* CMS Preview Banner */}
      <div className="bg-yellow-500 text-black px-4 py-2 text-center text-sm font-semibold">
        📝 CMS PREVIEW · Ez az oldal a <code className="font-mono">data/cms/pages/{slug}.json</code> fájlból töltődik be
      </div>

      {/* Navigation */}
      <nav className="bg-black/50 border-b border-gray-800 px-4 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <Link href="/cms-preview" className="text-white font-bold">
            ← CMS Preview
          </Link>
          <div className="flex gap-4 text-sm">
            <Link href="/cms-preview?slug=home" className="text-gray-300 hover:text-white">
              Főoldal
            </Link>
            <Link href="/" className="text-gray-300 hover:text-white">
              ← Vissza a főoldalra
            </Link>
            <a
              href="https://shiny-sunflower-ee1f5e.netlify.app/admin/index.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-500 hover:text-gold-400"
            >
              CMS Admin →
            </a>
          </div>
        </div>
      </nav>

      {!page ? (
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl font-bold text-white mb-4">404</h1>
          <p className="text-gray-400 mb-2">A keresett oldal nem található</p>
          <p className="text-gray-500 text-sm">
            Keresett slug: <code className="text-gold-500">{slug}</code>
          </p>
          <p className="text-gray-500 text-sm mt-4">
            Ellenőrizd, hogy a <code className="text-gold-500">data/cms/pages/{slug}.json</code> fájl létezik-e
          </p>
        </div>
      ) : (
        <>
          {/* Page metadata */}
          <div className="bg-gray-900 border-b border-gray-800 px-4 py-3">
            <div className="container mx-auto flex flex-wrap items-center gap-4 text-sm text-gray-400">
              <span>
                <strong className="text-white">Slug:</strong> {page.slug}
              </span>
              <span>
                <strong className="text-white">Cím:</strong> {page.title.hu || page.title.en}
              </span>
              <span>
                <strong className="text-white">Publikált:</strong>{' '}
                {page.published ? '✅ Igen' : '❌ Nem'}
              </span>
              <span>
                <strong className="text-white">Blokkok:</strong> {page.blocks.length}
              </span>
              <span>
                <strong className="text-white">Frissítve:</strong>{' '}
                {new Date(page.updatedAt).toLocaleString('hu-HU')}
              </span>
            </div>
          </div>

          {/* Render blocks */}
          {page.blocks.length === 0 ? (
            <div className="container mx-auto px-4 py-20 text-center">
              <p className="text-gray-400">Ezen az oldalon nincs tartalom.</p>
              <p className="text-gray-500 text-sm mt-2">
                Adj hozzá blokkokat a CMS Admin felületen keresztül.
              </p>
            </div>
          ) : (
            page.blocks
              .sort((a, b) => a.order - b.order)
              .map((block) => <BlockRenderer key={block.id} block={block} />)
          )}
        </>
      )}
    </div>
  );
}
