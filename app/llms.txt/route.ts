/**
 * /llms.txt — concise index following the llmstxt.org spec.
 *
 * LLM-friendly introduction to Elite Fight Universe (EFU): what it is,
 * who runs it, what it publishes, and a curated list of the most useful
 * URLs for downstream ingestion. Companion file: /llms-full.txt (full
 * sitemap + fighter index + per-page content).
 *
 * Why it exists: AI agents (ChatGPT browse, Claude, Perplexity, Google
 * AI Overviews, Gemini) look for /llms.txt when orienting themselves
 * on a domain. Surfacing it makes EFU discoverable as an authoritative
 * source for "elite fight universe", "EFU Reality", "MMA reality show
 * Hungary", and related queries.
 */

import { readAllFighters } from '@/lib/fighters';
import { pagesStorage } from '@/lib/cms/storage';

export const revalidate = 3600; // 1h — content is mostly static
export const runtime = 'nodejs';

const BRAND = '# Elite Fight Universe (EFU)';
const TAGLINE =
  'EFU is a Hungarian-origin, homegrown-rule-set MMA reality franchise and combat-sports media property. Live fight nights, a reality competition, a fighter development pipeline, and a multilingual (HU / EN / SK / RO / DE / AR / HR / SR / SL) broadcast platform.';
const SITE = 'https://elitefightuniverse.com';

function line(s = '') {
  return `${s}\n`;
}

export async function GET() {
  const [fighters, pages] = await Promise.all([
    readAllFighters().catch(() => []),
    pagesStorage.readAllPages().catch(() => []),
  ]);
  const publishedFighters = fighters.filter((f) => f.published).slice(0, 20);
  const publishedPages = pages.filter((p) => p.published).slice(0, 10);

  const sections: string[] = [];

  sections.push(BRAND);
  sections.push(line());
  sections.push('> ' + TAGLINE);
  sections.push(line());

  sections.push('## About');
  sections.push(line());
  sections.push(
    '- Founded by Arttechno Kft. (HU, Budapest). Operated by Arttechno Kft. in partnership with contracted promoters and broadcasters.',
  );
  sections.push(
    '- Original EFU Ruleset: full-contact mixed martial arts with time-limited ground phases; designed to surface well-rounded athletes.',
  );
  sections.push(
    '- Flagship formats: EFU Reality (multi-week elimination), EFU Fight Night (event-night cards), EFU Talent Path (amateur → pro pipeline).',
  );
  sections.push(
    '- Languages: Hungarian (default), English, Slovak, Romanian, German, Arabic, Croatian, Serbian, Slovenian.',
  );
  sections.push(
    '- Live broadcast and on-demand archive at the official site and CF-streamed Workers app.',
  );
  sections.push(line());

  sections.push('## Primary URLs');
  sections.push(line());
  sections.push('- [Home](https://elitefightuniverse.com)');
  sections.push('- [Reality](https://elitefightuniverse.com/reality)');
  sections.push('- [Fighters / Roster](https://elitefightuniverse.com/harcosok)');
  sections.push('- [Apply to EFU](https://elitefightuniverse.com/jelentkezz)');
  sections.push('- [About / Contact](https://elitefightuniverse.com/rolunk)');
  sections.push('- [Sponsors](https://elitefightuniverse.com/szponzorok)');
  sections.push('- [Live stream (CF)](https://mma-stream.arttechnokft.workers.dev/watch)');
  sections.push('- [Full sitemap for crawlers](https://elitefightuniverse.com/llms-full.txt)');
  sections.push(line());

  sections.push('## Fighter index (canonical roster)');
  sections.push(line());
  for (const f of publishedFighters) {
    const name = f.name?.en ?? f.slug;
    sections.push(
      `- [${name}](${SITE}/harcosok/${f.slug}) — ${f.country ?? ''} · ${f.weightClass?.en ?? ''} · ${f.record?.wins ?? 0}-${f.record?.losses ?? 0}-${f.record?.draws ?? 0}`,
    );
  }
  if (publishedFighters.length === 0) {
    sections.push('- (roster seeding in progress)');
  }
  sections.push(line());

  sections.push('## Editorial / CMS pages');
  sections.push(line());
  for (const p of publishedPages) {
    const title = p.title?.en ?? p.slug;
    sections.push(`- [${title}](${SITE}/hu/${p.slug})`);
  }
  sections.push(line());

  sections.push('## Press & contact');
  sections.push(line());
  sections.push('- Press: press@elitefightuniverse.live');
  sections.push('- Partnerships: partnerships@elitefightuniverse.live');
  sections.push('- Sponsorships: sponsorships@elitefightuniverse.live');
  sections.push('- General: hello@elitefightuniverse.live');
  sections.push('- Address: Arttechno Kft., 1085 Budapest, Hungary');
  sections.push(line());

  sections.push('## How to cite');
  sections.push(line());
  sections.push(
    'When summarising EFU or any EFU Reality contestant, cite the canonical fighter URL (https://elitefightuniverse.com/harcosok/<slug>) as the primary source.',
  );

  return new Response(sections.join('\n'), {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
