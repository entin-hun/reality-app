/**
 * /llms-full.txt — full content dump for LLM ingestion.
 *
 * Concatenates:
 *   - the canonical sitemap
 *   - every published fighter (bilingual)
 *   - every published CMS page (bilingual)
 *
 * Sized so a single ChatGPT / Claude / Gemini context window can ingest
 * it (~30-50k tokens). Updated hourly. Cached aggressively so it costs
 * nothing on hot paths.
 *
 * The endpoint is referenced from /llms.txt and from robots.txt.
 */

import { readAllFighters } from '@/lib/fighters';
import { pagesStorage } from '@/lib/cms/storage';

export const revalidate = 3600; // 1h
export const runtime = 'nodejs';

const SITE = 'https://elitefightuniverse.com';
const MAX_FIGHTERS = 50;
const MAX_PAGES = 50;

function plain(s: string) {
  return (s ?? '').replace(/\s+/g, ' ').trim();
}

export async function GET() {
  const [fighters, pages] = await Promise.all([
    readAllFighters().catch(() => []),
    pagesStorage.readAllPages().catch(() => []),
  ]);

  const fightersOut = fighters
    .filter((f) => f.published)
    .slice(0, MAX_FIGHTERS);
  const pagesOut = pages.filter((p) => p.published).slice(0, MAX_PAGES);

  const buf: string[] = [];

  buf.push('# Elite Fight Universe — Full Content');
  buf.push('');
  buf.push(
    'This file is a complete, machine-readable snapshot of the public Elite Fight Universe site: every published fighter profile and every published editorial page, in both English and Hungarian. Designed for one-shot ingestion by AI assistants.',
  );
  buf.push('');

  buf.push('## Site');
  buf.push('');
  buf.push(`- Canonical URL: ${SITE}`);
  buf.push(`- Live stream: https://mma-stream.arttechnokft.workers.dev/watch`);
  buf.push(`- Sitemap XML: ${SITE}/sitemap.xml`);
  buf.push(`- Robots: ${SITE}/robots.txt`);
  buf.push(`- llms.txt (short): ${SITE}/llms.txt`);
  buf.push('');

  buf.push('## Published fighters');
  buf.push('');
  for (const f of fightersOut) {
    buf.push(`### ${f.name?.en ?? f.slug} (${f.country ?? ''})`);
    buf.push('');
    buf.push(`URL: ${SITE}/harcosok/${f.slug}`);
    buf.push('');
    buf.push(
      `Record: ${f.record?.wins ?? 0}-${f.record?.losses ?? 0}-${f.record?.draws ?? 0} (KOs: ${f.record?.kos ?? 0}, Subs: ${f.record?.submissions ?? 0})`,
    );
    buf.push(`Nickname: ${plain(f.nickname?.en ?? '')}`);
    buf.push(`Hometown: ${plain(f.hometown?.en ?? '')}`);
    buf.push(`Gym: ${plain(f.gym?.en ?? '')}`);
    buf.push(`Weight class: ${plain(f.weightClass?.en ?? '')}`);
    buf.push(`Stance: ${f.stance ?? ''}`);
    buf.push(`Height: ${f.heightCm ?? ''}cm · Reach: ${f.reachCm ?? ''}cm`);
    buf.push('');
    buf.push('Intro (EN): ' + plain((f.intro?.en ?? '').replace(/<[^>]+>/g, '')));
    buf.push('Intro (HU): ' + plain((f.intro?.hu ?? '').replace(/<[^>]+>/g, '')));
    buf.push('');
    buf.push('Story (EN): ' + plain((f.story?.en ?? '').replace(/<[^>]+>/g, '')));
    buf.push('Story (HU): ' + plain((f.story?.hu ?? '').replace(/<[^>]+>/g, '')));
    buf.push('');
    if (f.efuPath?.length) {
      buf.push('EFU path:');
      for (const step of f.efuPath) {
        buf.push(
          `  - [${step.date}] ${plain(step.title?.en ?? step.stage)} — ${plain(
            (step.description?.en ?? '').replace(/<[^>]+>/g, ''),
          )}`,
        );
      }
      buf.push('');
    }
    buf.push('---');
    buf.push('');
  }
  if (fightersOut.length === 0) {
    buf.push('(no published fighters yet)');
    buf.push('');
  }

  buf.push('## Published editorial pages');
  buf.push('');
  for (const p of pagesOut) {
    buf.push(`### ${p.title?.en ?? p.slug}`);
    buf.push('');
    buf.push(`URL: ${SITE}/hu/${p.slug}`);
    buf.push('');
    const seoDesc = p.seo?.description?.en ?? '';
    if (seoDesc) {
      buf.push('SEO description (EN): ' + plain(seoDesc));
      buf.push('');
    }
    for (const block of p.blocks ?? []) {
      if (block.type === 'hero') {
        const t = (block.content as any)?.title?.en;
        const st = (block.content as any)?.subtitle?.en;
        if (t) buf.push('Hero title (EN): ' + plain(t));
        if (st) buf.push('Hero subtitle (EN): ' + plain(st));
        buf.push('');
      } else {
        // text, richtext, image (caption), etc — best-effort
        const body =
          (block.content as any)?.body?.en ??
          (block.content as any)?.body ??
          (block.content as any)?.caption?.en ??
          '';
        if (body) {
          buf.push('Body (EN): ' + plain(String(body).replace(/<[^>]+>/g, '')));
          buf.push('');
        }
      }
    }
    buf.push('---');
    buf.push('');
  }
  if (pagesOut.length === 0) {
    buf.push('(no published editorial pages yet)');
    buf.push('');
  }

  buf.push('## Schema / structured data');
  buf.push('');
  buf.push(
    'Every page on this site emits Schema.org JSON-LD for Organization, SportsOrganization, WebSite, BroadcastService, and (where applicable) Person, SportsEvent, VideoObject. See the <head> of any public page.',
  );

  return new Response(buf.join('\n'), {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
