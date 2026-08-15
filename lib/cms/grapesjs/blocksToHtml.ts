/**
 * blocksToHtml — converts CMS Block[] into an HTML string so the GrapesJS
 * visual editor can load existing page content. Also extracts raw HTML
 * stored by the GrapesJS editor back into a CMS block list.
 */

import type { Block } from '@/lib/cms/types';

function loc(v: any, locale?: string): string {
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (locale && v[locale]) return v[locale];
  return v.hu || v.en || Object.values(v)[0] || '';
}

function esc(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Convert a single CMS block to an HTML snippet for a given locale. */
export function blockToHtml(block: Block, locale?: string): string {
  const c = block.content || {};
  switch (block.type) {
    case 'hero': {
      const title = esc(loc(c.title, locale));
      const subtitle = esc(loc(c.subtitle, locale));
      const ctaText = loc(c.ctaText || c.ctaPrimary?.text, locale);
      const ctaLink = loc(c.ctaLink || c.ctaPrimary?.link, locale) || '#';
      const bg = c.backgroundImage
        ? `background:url('${c.backgroundImage}') center/cover no-repeat;`
        : `background:${block.settings?.backgroundColor || '#111827'};`;
      return `<section class="efu-hero" style="${bg}color:#fff;text-align:center;padding:72px 32px;">
  <h1 style="font-size:40px;font-weight:700;margin:0;">${title}</h1>
  ${subtitle ? `<p style="font-size:18px;opacity:.85;margin-top:12px;">${subtitle}</p>` : ''}
  ${ctaText ? `<a href="${ctaLink}" style="display:inline-block;margin-top:20px;padding:12px 32px;background:#DC2626;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">${esc(ctaText)}</a>` : ''}
</section>`;
    }
    case 'text': {
      const html = loc(c.content || c.body, locale);
      // If it already contains tags, use as-is; otherwise wrap in <p>
      const body = /<[a-z][\s\S]*>/i.test(html) ? html : `<p>${esc(html)}</p>`;
      return `<div class="efu-text" style="max-width:760px;margin:0 auto;padding:16px;">${body}</div>`;
    }
    case 'image': {
      const src = c.src || '';
      const alt = esc(loc(c.alt, locale));
      const caption = esc(loc(c.caption, locale));
      return `<figure style="margin:16px auto;text-align:center;">
  <img src="${src}" alt="${alt}" style="max-width:100%;border-radius:8px;" />
  ${caption ? `<figcaption style="font-size:13px;color:#6b7280;margin-top:6px;">${caption}</figcaption>` : ''}
</figure>`;
    }
    case 'video': {
      const url = c.url || '';
      return `<div style="margin:16px auto;max-width:860px;">
  <iframe src="${url}" style="width:100%;aspect-ratio:16/9;border:0;border-radius:8px;" allowfullscreen></iframe>
</div>`;
    }
    case 'gallery': {
      const images: any[] = c.images || [];
      const items = images
        .map(
          (img) =>
            `<img src="${img.src || ''}" alt="${esc(loc(img.alt))}" style="width:100%;border-radius:8px;" />`,
        )
        .join('');
      return `<div class="efu-gallery" style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:16px auto;">${items}</div>`;
    }
    case 'cta': {
      const text = esc(loc(c.text, locale));
      const link = c.link || '#';
      return `<div style="text-align:center;padding:24px;">
  <a href="${link}" style="display:inline-block;padding:12px 32px;background:#DC2626;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">${text}</a>
</div>`;
    }
    case 'divider':
      return `<hr style="border:none;border-top:2px solid #e5e7eb;margin:24px 0;" />`;
    case 'spacer': {
      const hMap: Record<string, string> = { small: '16px', medium: '40px', large: '80px' };
      const h = hMap[c.height] || '40px';
      return `<div style="height:${h};"></div>`;
    }
    default:
      return '';
  }
}

/** Convert a full CMS block list into a complete HTML document body for a locale. */
export function blocksToHtml(blocks: Block[], locale?: string): string {
  return blocks
    .filter((b) => b.visible)
    .filter((b) => {
      // For html blocks, only include the one matching the current locale
      if (b.type === ('html' as any) && b.content?._locale) {
        return b.content._locale === (locale || 'hu');
      }
      // Non-html blocks are always included (they get locale-resolved)
      return b.type !== ('html' as any);
    })
    .sort((a, b) => a.order - b.order)
    .map((b) => blockToHtml(b, locale))
    .join('\n');
}

/**
 * Wrap the GrapesJS-edited HTML into CMS blocks, preserving other locales.
 * Each locale's HTML is stored as a separate `html` block with `_locale` tag.
 */
export function htmlToCmsBlocks(
  html: string,
  existing: Block[],
  locale: string = 'hu',
): Block[] {
  // Keep html blocks for OTHER locales untouched
  const otherLocaleBlocks = existing.filter(
    (b) => b.type === ('html' as any) && b.content?._locale && b.content._locale !== locale,
  );

  // Find or create the html block for THIS locale
  const existingHtml = existing.find(
    (b) => b.type === ('html' as any) && (b.content?._locale === locale || (!b.content?._locale && locale === 'hu')),
  );

  const thisLocaleBlock: Block = {
    id: existingHtml?.id || `block-html-${locale}-${Date.now()}`,
    type: 'html' as any,
    layout: 'full',
    content: { html, _locale: locale },
    settings: { padding: 'none' },
    order: 0,
    visible: true,
  };

  return [thisLocaleBlock, ...otherLocaleBlocks];
}
