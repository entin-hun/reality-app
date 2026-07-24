import { promises as fs } from 'fs';
import path from 'path';
import Link from 'next/link';
import type { Page, Block } from '@/lib/cms/types';

/**
 * CMS Preview oldal
 * Ez az oldal a data/cms/pages/ könyvtárból olvassa be az oldalakat
 * és megjeleníti a tartalmukat, hogy tesztelni lehessen a CMS szerkesztést.
 * A megjelenés azonos az eredeti oldalakkal (hexagon háttér, EFU logo, stb.)
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

const hu = (val: any): string => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  return val.hu || val.en || '';
};

/* ═══════════════════════════════════════════════════════════
   EFU Logo — inline SVG (az eredeti EfuLogo komponens alapján)
   ═══════════════════════════════════════════════════════════ */
function EfuLogoPreview() {
  return (
    <div className="flex items-center gap-3 sm:gap-4 justify-center">
      <div
        className="relative w-20 h-20 sm:w-24 sm:h-24 text-2xl sm:text-3xl flex items-center justify-center font-black text-white animate-efu-mark"
        style={{
          fontFamily: 'Impact, Arial Black, sans-serif',
          background: 'linear-gradient(135deg, #DC2626 0%, #7F1D1D 100%)',
          clipPath: 'polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0% 50%)',
          letterSpacing: '-0.04em',
          textShadow: '0 0 12px rgba(220,38,38,0.6)',
        }}
        aria-hidden="true"
      >
        <span className="relative z-10">EFU</span>
        <span
          className="absolute inset-0 animate-efu-pulse"
          style={{
            clipPath: 'polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0% 50%)',
            boxShadow: 'inset 0 0 0 1px rgba(245,158,11,0.5)',
          }}
        />
      </div>
      <div className="flex flex-col leading-none">
        <span
          className="text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight animate-efu-wordmark"
          style={{ fontFamily: 'Impact, Arial Black, sans-serif', letterSpacing: '-0.02em' }}
        >
          <span className="text-white">ELITE FIGHT</span>
          <span className="text-brand-red"> UNIVERSE</span>
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Hero háttér — hexagon grid + spotlight + gradient
   ═══════════════════════════════════════════════════════════ */
function HeroBackground() {
  return (
    <div className="absolute inset-0 z-0" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(ellipse at 20% 50%, rgba(220,38,38,0.18) 0%, transparent 60%),
            radial-gradient(ellipse at 80% 50%, rgba(245,158,11,0.08) 0%, transparent 60%),
            linear-gradient(180deg, #0A0A0A 0%, #0D0000 50%, #0A0A0A 100%)
          `,
        }}
      />
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23DC2626' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      <div
        className="absolute inset-0 opacity-30 animate-efu-spotlight motion-reduce:animate-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 50% 30%, rgba(220,38,38,0.35) 0%, transparent 45%)',
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Pillar ikonok — SVG (az eredeti EfuPillars komponens alapján)
   ═══════════════════════════════════════════════════════════ */
function PillarIcon({ icon }: { icon: string }) {
  // Ha emoji, jelenítsd meg ahogy van
  if (icon.length <= 2) {
    return <div className="text-4xl mb-4">{icon}</div>;
  }
  // Egyébként próbáljuk SVG-ként (nem használt jelenleg)
  return <div className="text-4xl mb-4">{icon}</div>;
}

/* ═══════════════════════════════════════════════════════════
   BlockRenderer — az összes blokk típus megjelenítése
   ═══════════════════════════════════════════════════════════ */
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

  const c = block.content || {};

  // HERO block — gazdag megjelenés, hexagon háttérrel
  if (block.type === 'hero') {
    return (
      <section className={`${paddingClass} relative overflow-hidden min-h-[90vh] flex flex-col items-center justify-center px-4 pt-24 pb-12`} style={bgStyle}>
        <HeroBackground />
        <div className="relative z-10 flex flex-col items-center text-center max-w-5xl mx-auto w-full">
          {/* Event badge row */}
          {c.badge && (
            <div className="flex items-center gap-3 mb-6 flex-wrap justify-center">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-red/10 border border-brand-red/40 text-brand-red text-xs font-bold uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-brand-red animate-pulse" />
                LIVE
              </span>
              <span className="text-brand-gold text-xs sm:text-sm font-semibold uppercase tracking-widest">
                {hu(c.badge)}
              </span>
            </div>
          )}

          {/* EFU Logo */}
          {c.title && (
            <h1 className="mb-3 flex justify-center">
              <EfuLogoPreview />
            </h1>
          )}

          {/* Location + date */}
          {c.location && (
            <p className="text-base sm:text-lg text-gray-300 font-medium mb-1">{hu(c.location)}</p>
          )}
          {c.date && (
            <p className="text-gray-500 mb-5 text-xs sm:text-sm uppercase tracking-widest">{hu(c.date)}</p>
          )}

          {/* Subtitle */}
          {c.subtitle && (
            <p className="text-gray-300 max-w-3xl mb-7 text-sm sm:text-base leading-relaxed italic px-1">
              {hu(c.subtitle)}
            </p>
          )}

          {/* Status badge */}
          {c.statusBadge && (
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/40 text-brand-gold text-[11px] sm:text-xs font-bold uppercase tracking-widest mb-4">
              {hu(c.statusBadge)}
            </span>
          )}

          {/* CTAs */}
          {c.ctaPrimary && (
            <div className="mt-9 sm:mt-10 flex flex-col items-center gap-3 w-full">
              <a
                href={hu(c.ctaPrimary.link)}
                className="btn-primary text-base sm:text-lg px-8 sm:px-10 py-4 sm:py-5 inline-flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                {hu(c.ctaPrimary.text)}
              </a>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full sm:max-w-2xl">
                {c.ctaSecondary1 && (
                  <a
                    href={hu(c.ctaSecondary1.link)}
                    className="border border-brand-dark-border hover:border-brand-red text-gray-200 hover:text-white font-semibold py-3.5 px-4 sm:px-5 rounded-lg transition-all duration-200 text-sm sm:text-base inline-flex items-center justify-center gap-2"
                  >
                    {hu(c.ctaSecondary1.text)}
                  </a>
                )}
                {c.ctaSecondary2 && (
                  <a
                    href={hu(c.ctaSecondary2.link)}
                    className="border border-brand-dark-border hover:border-gray-400 text-gray-200 hover:text-white font-semibold py-3.5 px-4 sm:px-5 rounded-lg transition-all duration-200 text-sm sm:text-base inline-flex items-center justify-center gap-2"
                  >
                    {hu(c.ctaSecondary2.text)}
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Scroll indicator */}
        <a
          href="#mi-az-efu"
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 opacity-50 hover:opacity-90 transition-opacity motion-reduce:hidden"
          aria-label="Görgess lejjebb"
        >
          <span className="flex flex-col items-center gap-1 text-gray-400 text-[10px] uppercase tracking-widest">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M6 9l6 6 6-6" />
            </svg>
            Görgess
          </span>
        </a>
      </section>
    );
  }

  // TEXT block (generic — handles all text-based sections)
  if (block.type === 'text') {
    const hasPillars = Array.isArray(c.pillars);
    const hasCards = Array.isArray(c.cards);
    const hasRules = Array.isArray(c.rules);
    const hasBadges = Array.isArray(c.badges);

    // Pillars layout — EfuPillars stílus
    if (hasPillars) {
      return (
        <section className={`${paddingClass} px-4 max-w-5xl mx-auto w-full scroll-mt-16`} style={bgStyle}>
          {c.eyebrow && <p className="text-brand-red text-sm uppercase tracking-widest font-semibold mb-2 text-center">{hu(c.eyebrow)}</p>}
          {c.title && <h2 className="text-4xl sm:text-5xl font-black uppercase text-white mb-10 text-center" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>{hu(c.title)}</h2>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {c.pillars.map((p: any, i: number) => (
              <div key={i} className="card-dark rounded-xl p-6 hover:border-brand-dark-muted transition-colors group text-center">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-brand-red group-hover:text-red-400 transition-colors">
                    <PillarIcon icon={p.icon} />
                  </div>
                  {p.label && <span className="text-[10px] uppercase tracking-widest font-bold text-gray-500">{hu(p.label)}</span>}
                </div>
                {p.title && <h3 className="text-2xl font-black uppercase text-white mb-3" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>{hu(p.title)}</h3>}
                {p.body && <p className="text-gray-400 text-sm leading-relaxed">{hu(p.body)}</p>}
              </div>
            ))}
          </div>
        </section>
      );
    }

    // Cards layout (mi várható) — card-hover effekttel
    if (hasCards) {
      return (
        <section className={`${paddingClass} px-4 max-w-5xl mx-auto w-full scroll-mt-16`} style={bgStyle}>
          {c.eyebrow && <p className="text-brand-gold text-sm uppercase tracking-widest font-semibold mb-2 text-center">{hu(c.eyebrow)}</p>}
          {c.title && <h2 className="text-4xl sm:text-5xl font-black uppercase text-white mb-6 text-center" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>{hu(c.title)}</h2>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {c.cards.map((card: any, i: number) => (
              <div key={i} className="card-dark rounded-2xl p-6 text-center card-hover">
                {card.icon && <div className="text-4xl mb-4">{card.icon}</div>}
                {card.title && <h3 className="text-xl font-bold text-white mb-3" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>{hu(card.title)}</h3>}
                {card.body && <p className="text-gray-400 text-sm leading-relaxed">{hu(card.body)}</p>}
                {card.badge && <span className="block mt-2 text-brand-gold font-semibold text-xs">{hu(card.badge)}</span>}
              </div>
            ))}
          </div>
        </section>
      );
    }

    // Rules layout — EfuRuleset stílus
    if (hasRules) {
      return (
        <section className={`${paddingClass} px-4 max-w-5xl mx-auto w-full scroll-mt-16`} style={bgStyle}>
          {c.eyebrow && <p className="text-brand-red text-sm uppercase tracking-widest font-semibold mb-2 text-center">{hu(c.eyebrow)}</p>}
          {c.title && <h2 className="text-4xl sm:text-5xl font-black uppercase text-white mb-4 text-center" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>{hu(c.title)}</h2>}
          {c.body && <p className="text-gray-300 max-w-3xl mx-auto text-sm sm:text-base leading-relaxed mb-6 text-center">{hu(c.body)}</p>}
          {c.ctaText && c.ctaLink && (
            <div className="text-center mb-10">
              <a href={hu(c.ctaLink)} className="inline-flex items-center gap-2 text-brand-red hover:text-red-400 font-semibold text-sm sm:text-base transition-colors">
                {hu(c.ctaText)} <span aria-hidden="true">→</span>
              </a>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {c.rules.map((rule: any, i: number) => (
              <div key={i} className="card-dark rounded-xl p-6 hover:border-brand-dark-muted transition-colors">
                <div className="flex items-baseline justify-between mb-4 gap-3 flex-wrap">
                  {rule.title && <h3 className="text-2xl font-black uppercase text-white" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>{hu(rule.title)}</h3>}
                  {rule.subtitle && <span className="text-[10px] uppercase tracking-widest font-bold text-brand-red">{hu(rule.subtitle)}</span>}
                </div>
                {rule.items && (
                  <ul className="space-y-2">
                    {rule.items.map((item: any, j: number) => (
                      <li key={j} className="flex items-start gap-3 text-sm text-gray-300">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-red shrink-0" aria-hidden />
                        <span>{hu(item)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      );
    }

    // Footer layout
    if (hasBadges) {
      return (
        <footer className={`border-t border-brand-dark-border ${paddingClass} px-4 text-center text-gray-600 text-sm`} style={bgStyle}>
          {c.title && <p>{hu(c.title)}</p>}
          {c.badges && (
            <p className="mt-1 flex items-center justify-center gap-2 flex-wrap">
              {c.badges.map((b: any, i: number) => (
                <span key={i} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-brand-red/10 border border-brand-red/30 text-brand-red text-xs font-bold uppercase tracking-wider">
                  {hu(b)}
                </span>
              ))}
            </p>
          )}
        </footer>
      );
    }

    // Default text layout (mi-az-efu, fight-night, kuldetesunk)
    return (
      <section className={`${paddingClass} px-4 max-w-5xl mx-auto w-full scroll-mt-16`} style={bgStyle}>
        <div className="text-center mb-10">
          {c.eyebrow && <p className="text-brand-red text-sm uppercase tracking-widest font-semibold mb-2">{hu(c.eyebrow)}</p>}
          {c.title && <h2 className="text-4xl sm:text-5xl font-black uppercase text-white mb-4" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>{hu(c.title)}</h2>}
          {c.body && <p className="text-gray-300 max-w-3xl mx-auto text-sm sm:text-base leading-relaxed mb-6">{hu(c.body)}</p>}
          {c.body2 && <p className="text-gray-400 max-w-3xl mx-auto text-sm sm:text-base leading-relaxed mb-6">{hu(c.body2)}</p>}
          {c.ctaText && c.ctaLink && (
            <a href={hu(c.ctaLink)} className="inline-flex items-center gap-2 text-brand-red hover:text-red-400 font-semibold text-sm sm:text-base transition-colors">
              {hu(c.ctaText)} <span aria-hidden="true">→</span>
            </a>
          )}
        </div>
      </section>
    );
  }

  // Unknown block type — show raw JSON
  return (
    <section className={paddingClass} style={bgStyle}>
      <div className="container mx-auto px-4">
        <div className="border border-dashed border-gray-600 rounded-lg p-6">
          <p className="text-gray-500 text-sm mb-2">
            Ismeretlen blokk típus: <code className="text-brand-gold">{block.type}</code>
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
            <Link href="/cms-preview?slug=rolunk" className="text-gray-300 hover:text-white">
              Rólunk
            </Link>
            <Link href="/cms-preview?slug=reality" className="text-gray-300 hover:text-white">
              Reality
            </Link>
            <Link href="/cms-preview?slug=szponzorok" className="text-gray-300 hover:text-white">
              Szponzorok
            </Link>
            <Link href="/" className="text-gray-300 hover:text-white">
              ← Vissza a főoldalra
            </Link>
            <a
              href="https://shiny-sunflower-ee1f5e.netlify.app/admin/index.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-gold hover:text-yellow-400"
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
            Keresett slug: <code className="text-brand-gold">{slug}</code>
          </p>
        </div>
      ) : (
        <>
          {/* Page metadata */}
          <div className="bg-gray-900 border-b border-gray-800 px-4 py-3">
            <div className="container mx-auto flex flex-wrap items-center gap-4 text-sm text-gray-400">
              <span><strong className="text-white">Slug:</strong> {page.slug}</span>
              <span><strong className="text-white">Cím:</strong> {page.title.hu || page.title.en}</span>
              <span><strong className="text-white">Publikált:</strong> {page.published ? '✅ Igen' : '❌ Nem'}</span>
              <span><strong className="text-white">Blokkok:</strong> {page.blocks.length}</span>
              <span><strong className="text-white">Frissítve:</strong> {new Date(page.updatedAt).toLocaleString('hu-HU')}</span>
            </div>
          </div>

          {/* Render blocks */}
          {page.blocks.length === 0 ? (
            <div className="container mx-auto px-4 py-20 text-center">
              <p className="text-gray-400">Ezen az oldalon nincs tartalom.</p>
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
