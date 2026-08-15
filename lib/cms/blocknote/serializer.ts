/**
 * Serializer: CMS Block[] ↔ BlockNote document (PartialBlock[])
 *
 * Converts between the EFU CMS block format and BlockNote's internal
 * document representation so the existing save/PUT API and Block/Page
 * types remain fully backward-compatible.
 */

import type { Block, BlockType, LocalizedString } from '@/lib/cms/types';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BlockNoteInlineContent {
  type: string;
  text?: string;
  styles?: Record<string, any>;
  href?: string;
  [key: string]: any;
}

interface BlockNoteBlock {
  id?: string;
  type: string;
  props?: Record<string, any>;
  content?: BlockNoteInlineContent[];
  children?: BlockNoteBlock[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function locToStr(v: LocalizedString | undefined): string {
  if (!v) return '';
  return v.hu || v.en || Object.values(v)[0] || '';
}

function strToLoc(s: string): LocalizedString {
  return { hu: s, en: s };
}

function htmlToInlineContent(html: string): BlockNoteInlineContent[] {
  if (!html || !html.trim()) return [{ type: 'text', text: '' }];

  // Strip HTML tags for a basic text extraction.
  // A full HTML→inline parser would be complex; we do a best-effort
  // conversion that preserves visible text and links.
  const parts: BlockNoteInlineContent[] = [];
  const tmp = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n');

  // Extract links
  const linkRegex = /<a[^>]+href="([^"]*)"[^>]*>(.*?)<\/a>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const stripped = tmp.replace(/<[^>]+>/g, '');

  // Simple approach: just extract plain text
  const text = stripped.replace(/\n{3,}/g, '\n\n').trim();
  if (text) {
    parts.push({ type: 'text', text });
  } else {
    parts.push({ type: 'text', text: '' });
  }

  return parts;
}

function inlineContentToHtml(content: BlockNoteInlineContent[]): string {
  if (!content || content.length === 0) return '';
  return content
    .map((c) => {
      if (c.type === 'text') return c.text || '';
      if (c.type === 'link') {
        const inner = (c.content || [])
          .map((ic: any) => ic.text || '')
          .join('');
        return `<a href="${c.href || '#'}">${inner}</a>`;
      }
      return c.text || '';
    })
    .join('');
}

function inlineContentToText(content: BlockNoteInlineContent[]): string {
  if (!content || content.length === 0) return '';
  return content
    .map((c) => c.text || '')
    .join('');
}

/* ------------------------------------------------------------------ */
/*  CMS → BlockNote                                                    */
/* ------------------------------------------------------------------ */

export function cmsBlocksToBlockNote(blocks: Block[]): BlockNoteBlock[] {
  const result: BlockNoteBlock[] = [];

  for (const block of blocks) {
    if (!block.visible) continue;

    switch (block.type) {
      case 'hero': {
        // Only put the TITLE in inline content — subtitle goes in props
        // to prevent the round-trip duplication bug.
        const titleText = locToStr(block.content.title);
        result.push({
          id: block.id,
          type: 'hero',
          props: {
            textAlignment: 'center',
            textColor: '#ffffff',
            backgroundColor: block.settings.backgroundColor || '#111827',
            backgroundImage: block.content.backgroundImage || '',
            overlayOpacity: 'medium',
            padding: block.settings.padding === 'large' ? 'xlarge' : 'large',
            ctaText: locToStr(block.content.ctaText || block.content.ctaPrimary?.text),
            ctaLink: locToStr(block.content.ctaLink || block.content.ctaPrimary?.link),
            ctaVariant: 'primary',
            subtitle: locToStr(block.content.subtitle),
          },
          content: htmlToInlineContent(titleText),
        });
        break;
      }

      case 'text': {
        // Restore columns blocks that were serialized with _blocknoteColumns marker
        if (block.content._blocknoteColumns) {
          const cp = block.content._blocknoteColumns;
          result.push({
            id: block.id,
            type: 'columns',
            props: {
              columnCount: cp.columnCount || '2',
              ratio: cp.ratio || 'equal',
              customRatios: cp.customRatios || '',
              col1: cp.col1 || '',
              col2: cp.col2 || '',
              col3: cp.col3 || '',
              col4: cp.col4 || '',
              gap: cp.gap || 'medium',
              verticalAlign: cp.verticalAlign || 'stretch',
              columnPadding: cp.columnPadding || 'medium',
              columnBg: cp.columnBg || '',
              bordered: cp.bordered !== false,
              rounded: cp.rounded !== false,
              minHeight: cp.minHeight || 'auto',
            },
          });
          break;
        }
        const html = locToStr(block.content.content || block.content.body);
        // Split into paragraphs for better editing
        const paragraphs = html
          .split(/\n\n|<\/p>/)
          .map((p) => p.replace(/<[^>]+>/g, '').trim())
          .filter(Boolean);

        if (paragraphs.length === 0) {
          result.push({
            id: block.id,
            type: 'paragraph',
            content: [{ type: 'text', text: '' }],
          });
        } else {
          paragraphs.forEach((p, i) => {
            result.push({
              id: i === 0 ? block.id : `${block.id}-p${i}`,
              type: 'paragraph',
              content: [{ type: 'text', text: p }],
            });
          });
        }
        break;
      }

      case 'image': {
        result.push({
          id: block.id,
          type: 'image',
          props: {
            url: block.content.src || '',
            caption: locToStr(block.content.caption),
            width: 100,
          },
        });
        break;
      }

      case 'video': {
        result.push({
          id: block.id,
          type: 'video',
          props: {
            url: block.content.url || '',
          },
        });
        break;
      }

      case 'gallery': {
        const images = block.content.images || [];
        images.forEach((img: any, i: number) => {
          result.push({
            id: i === 0 ? block.id : `${block.id}-img${i}`,
            type: 'image',
            props: {
              url: img.src || '',
              caption: locToStr(img.alt),
              width: 100,
            },
          });
        });
        if (images.length === 0) {
          result.push({
            id: block.id,
            type: 'paragraph',
            content: [{ type: 'text', text: '[Empty gallery]' }],
          });
        }
        break;
      }

      case 'cta': {
        result.push({
          id: block.id,
          type: 'ctaButton',
          props: {
            textAlignment: 'center',
            buttonText: locToStr(block.content.text),
            buttonLink: block.content.link || '#',
            variant: block.content.variant || 'primary',
            size: 'large',
            fullWidth: false,
          },
        });
        break;
      }

      case 'divider': {
        result.push({
          id: block.id,
          type: 'divider',
        });
        break;
      }

      case 'spacer': {
        result.push({
          id: block.id,
          type: 'spacer',
          props: {
            height: block.content.height || 'medium',
          },
        });
        break;
      }

      default: {
        // Unknown block type → paragraph with a note
        result.push({
          id: block.id,
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: `[${block.type} block — not yet supported in structure editor]`,
            },
          ],
        });
      }
    }
  }

  return result;
}

/* ------------------------------------------------------------------ */
/*  BlockNote → CMS                                                    */
/* ------------------------------------------------------------------ */

export function blockNoteToCmsBlocks(
  bnBlocks: BlockNoteBlock[],
  existingBlocks: Block[],
): Block[] {
  const result: Block[] = [];
  const existingMap = new Map(existingBlocks.map((b) => [b.id, b]));

  let order = 0;

  for (const bn of bnBlocks) {
    const existing = bn.id ? existingMap.get(bn.id) : undefined;
    const baseSettings = existing?.settings || { padding: 'medium' as const };

    switch (bn.type) {
      case 'hero': {
        const text = inlineContentToText(bn.content || []);
        const props = bn.props || {};
        result.push({
          id: bn.id || `block-${Date.now()}-${order}`,
          type: 'hero',
          layout: 'full',
          content: {
            title: strToLoc(text),
            // Read subtitle from BlockNote props (not from inline content)
            // to prevent the round-trip duplication bug.
            subtitle: props.subtitle
              ? strToLoc(props.subtitle)
              : (existing?.content?.subtitle || {}),
            ctaText: strToLoc(props.ctaText || ''),
            ctaLink: strToLoc(props.ctaLink || ''),
            ctaPrimary: {
              text: strToLoc(props.ctaText || ''),
              link: strToLoc(props.ctaLink || ''),
            },
            backgroundImage: props.backgroundImage || '',
          },
          settings: {
            ...baseSettings,
            backgroundColor: props.backgroundColor,
            padding: props.padding === 'xlarge' ? 'large' : (props.padding as any) || 'large',
          },
          order: order++,
          visible: true,
        });
        break;
      }

      case 'paragraph':
      case 'heading': {
        const text = inlineContentToText(bn.content || []);
        // Try to merge consecutive paragraphs back into a single text block
        const prev = result[result.length - 1];
        if (
          prev &&
          prev.type === 'text' &&
          bn.id &&
          bn.id.startsWith(prev.id + '-p')
        ) {
          // Append to previous text block
          const prevContent = locToStr(prev.content.content);
          prev.content.content = strToLoc(
            (prevContent ? prevContent + '\n\n' : '') + text,
          );
          break;
        }

        result.push({
          id: bn.id || `block-${Date.now()}-${order}`,
          type: 'text',
          layout: existing?.layout || 'narrow',
          content: {
            content: strToLoc(text),
          },
          settings: baseSettings,
          order: order++,
          visible: true,
        });
        break;
      }

      case 'image': {
        const props = bn.props || {};
        result.push({
          id: bn.id || `block-${Date.now()}-${order}`,
          type: 'image',
          layout: existing?.layout || 'wide',
          content: {
            src: props.url || '',
            alt: strToLoc(props.caption || ''),
            caption: strToLoc(props.caption || ''),
          },
          settings: baseSettings,
          order: order++,
          visible: true,
        });
        break;
      }

      case 'video': {
        const props = bn.props || {};
        result.push({
          id: bn.id || `block-${Date.now()}-${order}`,
          type: 'video',
          layout: existing?.layout || 'wide',
          content: {
            url: props.url || '',
          },
          settings: baseSettings,
          order: order++,
          visible: true,
        });
        break;
      }

      case 'ctaButton': {
        const props = bn.props || {};
        result.push({
          id: bn.id || `block-${Date.now()}-${order}`,
          type: 'cta',
          layout: 'full',
          content: {
            text: strToLoc(props.buttonText || ''),
            link: props.buttonLink || '#',
            variant: props.variant || 'primary',
          },
          settings: baseSettings,
          order: order++,
          visible: true,
        });
        break;
      }

      case 'divider': {
        result.push({
          id: bn.id || `block-${Date.now()}-${order}`,
          type: 'divider',
          layout: 'full',
          content: {},
          settings: baseSettings,
          order: order++,
          visible: true,
        });
        break;
      }

      case 'spacer': {
        const props = bn.props || {};
        result.push({
          id: bn.id || `block-${Date.now()}-${order}`,
          type: 'spacer',
          layout: 'full',
          content: {
            height: props.height || 'medium',
          },
          settings: baseSettings,
          order: order++,
          visible: true,
        });
        break;
      }

      case 'columns': {
        // Columns don't map to a single CMS block type yet.
        // Store as a text block with a marker so data isn't lost.
        const props = bn.props || {};
        const count = parseInt(props.columnCount) || 2;
        const colTexts = [props.col1, props.col2, props.col3, props.col4]
          .slice(0, count)
          .map((c: string, i: number) => `Oszlop ${i + 1}: ${c || '(üres)'}`)
          .join('\n');
        result.push({
          id: bn.id || `block-${Date.now()}-${order}`,
          type: 'text',
          layout: 'full',
          content: {
            content: strToLoc(
              `[columns ${count} oszlop, arány=${props.ratio || 'equal'}]` +
              `\n${colTexts}`,
            ),
            _blocknoteColumns: props,
          },
          settings: baseSettings,
          order: order++,
          visible: true,
        });
        break;
      }

      case 'sectionHeader': {
        const text = inlineContentToText(bn.content || []);
        result.push({
          id: bn.id || `block-${Date.now()}-${order}`,
          type: 'text',
          layout: 'full',
          content: {
            content: strToLoc(`## ${text}`),
            _blocknoteSectionHeader: bn.props,
          },
          settings: baseSettings,
          order: order++,
          visible: true,
        });
        break;
      }

      default: {
        // Unknown BlockNote block → text block
        const text = inlineContentToText(bn.content || []);
        result.push({
          id: bn.id || `block-${Date.now()}-${order}`,
          type: 'text',
          layout: 'narrow',
          content: {
            content: strToLoc(text || `[${bn.type}]`),
          },
          settings: baseSettings,
          order: order++,
          visible: true,
        });
      }
    }
  }

  return result;
}
