'use client';

/**
 * BlockNoteEditor — structural page editor for the EFU CMS.
 *
 * Renders a full BlockNote canvas (from @blocknote/ariakit) with custom
 * CMS blocks (CTA buttons, columns, hero, spacer, section headers).
 *
 * Converts between CMS Block[] ↔ BlockNote document on mount and on
 * every change, so the existing PUT /api/cms/pages/[slug] API and the
 * Block/Page types remain fully backward-compatible.
 *
 * MUST be loaded with next/dynamic ssr:false — BlockNote needs the DOM.
 */

import { useCallback, useMemo, useRef } from 'react';
import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultProps,
} from '@blocknote/core';
import {
  createReactBlockSpec,
  useCreateBlockNote,
} from '@blocknote/react';
import { BlockNoteView } from '@blocknote/ariakit';

import '@blocknote/core/style.css';
import '@blocknote/react/style.css';
import '@blocknote/ariakit/style.css';

import type { Block, Page } from '@/lib/cms/types';
import {
  cmsBlocksToBlockNote,
  blockNoteToCmsBlocks,
} from '@/lib/cms/blocknote/serializer';

/* ------------------------------------------------------------------ */
/*  Custom block specs (inline — avoids separate .tsx import issues)   */
/* ------------------------------------------------------------------ */

const CtaButtonBlock = createReactBlockSpec(
  {
    type: 'ctaButton' as const,
    propSchema: {
      textAlignment: defaultProps.textAlignment,
      textColor: defaultProps.textColor,
      backgroundColor: defaultProps.backgroundColor,
      buttonText: { default: 'Click me', type: 'string' as const },
      buttonLink: { default: '/', type: 'string' as const },
      variant: {
        default: 'primary',
        values: ['primary', 'secondary', 'outline', 'ghost'] as const,
      },
      size: {
        default: 'medium',
        values: ['small', 'medium', 'large'] as const,
      },
      fullWidth: { default: false, type: 'boolean' as const },
    },
    content: 'none',
  },
  {
    render: (props) => {
      const p = props.block.props;
      const variantStyles: Record<string, React.CSSProperties> = {
        primary: {
          background: '#DC2626',
          color: '#fff',
          border: '2px solid #DC2626',
        },
        secondary: {
          background: '#F59E0B',
          color: '#fff',
          border: '2px solid #F59E0B',
        },
        outline: {
          background: 'transparent',
          color: '#DC2626',
          border: '2px solid #DC2626',
        },
        ghost: {
          background: 'transparent',
          color: '#374151',
          border: '2px solid transparent',
          textDecoration: 'underline',
        },
      };
      const sizeStyles: Record<string, React.CSSProperties> = {
        small: { padding: '6px 16px', fontSize: '13px' },
        medium: { padding: '10px 28px', fontSize: '15px' },
        large: { padding: '14px 40px', fontSize: '18px' },
      };
      return (
        <div
          style={{
            display: 'flex',
            justifyContent:
              p.textAlignment === 'center'
                ? 'center'
                : p.textAlignment === 'right'
                  ? 'flex-end'
                  : 'flex-start',
            padding: '8px 0',
          }}
        >
          <a
            href={p.buttonLink || '#'}
            onClick={(e) => e.preventDefault()}
            style={{
              display: p.fullWidth ? 'block' : 'inline-block',
              width: p.fullWidth ? '100%' : 'auto',
              textAlign: 'center',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'none',
              ...(variantStyles[p.variant] || variantStyles.primary),
              ...(sizeStyles[p.size] || sizeStyles.medium),
            }}
          >
            {p.buttonText || 'Button'}
          </a>
        </div>
      );
    },
  },
);

const ColumnsBlock = createReactBlockSpec(
  {
    type: 'columns' as const,
    propSchema: {
      columnCount: {
        default: '2',
        values: ['2', '3', '4'] as const,
      },
      ratio: {
        default: 'equal',
        values: [
          'equal', 'sidebar-left', 'sidebar-right', 'golden',
          'wide-center', 'narrow-center', 'custom',
        ] as const,
      },
      customRatios: { default: '', type: 'string' as const },
      col1: { default: '', type: 'string' as const },
      col2: { default: '', type: 'string' as const },
      col3: { default: '', type: 'string' as const },
      col4: { default: '', type: 'string' as const },
      gap: {
        default: 'medium',
        values: ['none', 'small', 'medium', 'large', 'xlarge'] as const,
      },
      verticalAlign: {
        default: 'top',
        values: ['top', 'center', 'bottom', 'stretch'] as const,
      },
      columnPadding: {
        default: 'medium',
        values: ['none', 'small', 'medium', 'large'] as const,
      },
      columnBg: { default: '', type: 'string' as const },
      bordered: { default: true, type: 'boolean' as const },
      rounded: { default: true, type: 'boolean' as const },
      minHeight: {
        default: 'auto',
        values: ['auto', 'small', 'medium', 'large'] as const,
      },
    },
    content: 'none',
  },
  {
    render: (props) => {
      const p = props.block.props;
      const count = parseInt(p.columnCount) || 2;

      // Ratio presets per column count
      const ratioPresets: Record<string, Record<string, string>> = {
        '2': {
          equal: '1fr 1fr',
          'sidebar-left': '280px 1fr',
          'sidebar-right': '1fr 280px',
          golden: '1.618fr 1fr',
          'wide-center': '1fr 1fr',
          'narrow-center': '1fr 1fr',
        },
        '3': {
          equal: '1fr 1fr 1fr',
          'sidebar-left': '240px 1fr 240px',
          'sidebar-right': '1fr 1fr 240px',
          golden: '1fr 1.618fr 1fr',
          'wide-center': '1fr 2fr 1fr',
          'narrow-center': '2fr 1fr 2fr',
        },
        '4': {
          equal: '1fr 1fr 1fr 1fr',
          'sidebar-left': '200px 1fr 1fr 200px',
          'sidebar-right': '1fr 1fr 1fr 200px',
          golden: '1fr 1fr 1.618fr 1fr',
          'wide-center': '1fr 1.5fr 1.5fr 1fr',
          'narrow-center': '1.5fr 1fr 1fr 1.5fr',
        },
      };

      let cols: string;
      if (p.ratio === 'custom' && p.customRatios.trim()) {
        cols = p.customRatios.trim();
      } else {
        cols = ratioPresets[String(count)]?.[p.ratio] || '1fr '.repeat(count).trim();
      }

      const gapMap: Record<string, string> = {
        none: '0px', small: '8px', medium: '16px', large: '32px', xlarge: '48px',
      };
      const alignMap: Record<string, string> = {
        top: 'start', center: 'center', bottom: 'end', stretch: 'stretch',
      };
      const padMap: Record<string, string> = {
        none: '0px', small: '8px', medium: '16px', large: '24px',
      };
      const heightMap: Record<string, string> = {
        auto: 'auto', small: '80px', medium: '160px', large: '280px',
      };

      const allCols = [p.col1, p.col2, p.col3, p.col4].slice(0, count);

      return (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: cols,
            gap: gapMap[p.gap] || '16px',
            alignItems: alignMap[p.verticalAlign] || 'start',
            padding: '8px 0',
            minHeight: heightMap[p.minHeight] || 'auto',
          }}
        >
          {allCols.map((content, i) => (
            <div
              key={i}
              style={{
                border: p.bordered ? '1px dashed #d1d5db' : 'none',
                borderRadius: p.rounded ? '8px' : '0',
                padding: padMap[p.columnPadding] || '16px',
                minHeight: heightMap[p.minHeight] === 'auto' ? '48px' : undefined,
                background: p.columnBg || '#f9fafb',
                fontSize: '14px',
                color: content ? '#1f2937' : '#9ca3af',
              }}
              dangerouslySetInnerHTML={content ? { __html: content } : undefined}
            >
              {content ? undefined : `Oszlop ${i + 1} — szerkeszd a blokk oldalsávban`}
            </div>
          ))}
        </div>
      );
    },
  },
);

const HeroBlock = createReactBlockSpec(
  {
    type: 'hero' as const,
    propSchema: {
      textAlignment: defaultProps.textAlignment,
      textColor: defaultProps.textColor,
      backgroundColor: defaultProps.backgroundColor,
      backgroundImage: { default: '', type: 'string' as const },
      overlayOpacity: {
        default: 'medium',
        values: ['none', 'light', 'medium', 'heavy'] as const,
      },
      padding: {
        default: 'large',
        values: ['small', 'medium', 'large', 'xlarge'] as const,
      },
      subtitle: { default: '', type: 'string' as const },
      ctaText: { default: '', type: 'string' as const },
      ctaLink: { default: '', type: 'string' as const },
      ctaVariant: {
        default: 'primary',
        values: ['primary', 'secondary', 'outline'] as const,
      },
    },
    content: 'inline',
  },
  {
    render: (props) => {
      const { contentRef } = props;
      const p = props.block.props;
      const paddingMap: Record<string, string> = {
        small: '24px 16px', medium: '48px 24px',
        large: '72px 32px', xlarge: '120px 40px',
      };
      const overlayMap: Record<string, number> = {
        none: 0, light: 0.2, medium: 0.45, heavy: 0.7,
      };
      const hasBg = !!p.backgroundImage;
      const overlay = overlayMap[p.overlayOpacity] ?? 0.45;

      return (
        <div
          style={{
            position: 'relative',
            textAlign: (p.textAlignment as any) || 'center',
            padding: paddingMap[p.padding] || paddingMap.large,
            borderRadius: '12px',
            overflow: 'hidden',
            background: hasBg
              ? `url(${p.backgroundImage}) center/cover no-repeat`
              : p.backgroundColor || '#111827',
            color: hasBg ? '#fff' : p.textColor || '#fff',
            minHeight: '120px',
          }}
        >
          {hasBg && overlay > 0 && (
            <div
              style={{
                position: 'absolute', inset: 0,
                background: `rgba(0,0,0,${overlay})`,
              }}
            />
          )}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div
              ref={contentRef}
              style={{
                fontSize: '28px', fontWeight: 700,
                lineHeight: 1.2, minHeight: '1.2em',
              }}
            />
            {p.subtitle && (
              <p style={{
                fontSize: '18px', marginTop: '12px',
                opacity: 0.85, lineHeight: 1.4,
              }}>
                {p.subtitle}
              </p>
            )}
            {p.ctaText && (
              <div style={{ marginTop: '20px' }}>
                <a
                  href={p.ctaLink || '#'}
                  onClick={(e) => e.preventDefault()}
                  style={{
                    display: 'inline-block',
                    padding: '12px 32px',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '16px',
                    textDecoration: 'none',
                    background:
                      p.ctaVariant === 'outline' ? 'transparent'
                        : p.ctaVariant === 'secondary' ? '#F59E0B'
                        : '#DC2626',
                    color: '#fff',
                    border:
                      p.ctaVariant === 'outline'
                        ? '2px solid #fff'
                        : '2px solid transparent',
                  }}
                >
                  {p.ctaText}
                </a>
              </div>
            )}
          </div>
        </div>
      );
    },
  },
);

const SpacerBlock = createReactBlockSpec(
  {
    type: 'spacer' as const,
    propSchema: {
      height: {
        default: 'medium',
        values: ['small', 'medium', 'large', 'xlarge'] as const,
      },
    },
    content: 'none',
  },
  {
    render: (props) => {
      const heightMap: Record<string, string> = {
        small: '16px', medium: '40px', large: '80px', xlarge: '140px',
      };
      const h = heightMap[props.block.props.height] || '40px';
      return (
        <div
          style={{
            height: h,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#d1d5db',
            fontSize: '12px',
            userSelect: 'none',
          }}
        >
          ↕ spacer ({props.block.props.height})
        </div>
      );
    },
  },
);

const SectionHeaderBlock = createReactBlockSpec(
  {
    type: 'sectionHeader' as const,
    propSchema: {
      textAlignment: defaultProps.textAlignment,
      textColor: defaultProps.textColor,
      backgroundColor: defaultProps.backgroundColor,
      level: {
        default: 'h2',
        values: ['h1', 'h2', 'h3'] as const,
      },
      showDivider: { default: true, type: 'boolean' as const },
    },
    content: 'inline',
  },
  {
    render: (props) => {
      const { contentRef } = props;
      const p = props.block.props;
      const Tag = (p.level || 'h2') as 'h1' | 'h2' | 'h3';
      const sizes: Record<string, string> = {
        h1: '32px', h2: '26px', h3: '20px',
      };
      return (
        <div style={{ padding: '12px 0' }}>
          <Tag
            ref={contentRef as any}
            style={{
              fontSize: sizes[p.level] || '26px',
              fontWeight: 700,
              textAlign: (p.textAlignment as any) || 'left',
              color: p.textColor || '#111827',
              margin: 0,
            }}
          />
          {p.showDivider && (
            <hr
              style={{
                border: 'none',
                borderTop: '2px solid #DC2626',
                marginTop: '8px',
                width: '60px',
              }}
            />
          )}
        </div>
      );
    },
  },
);

/* ------------------------------------------------------------------ */
/*  Schema                                                             */
/* ------------------------------------------------------------------ */

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    ctaButton: CtaButtonBlock(),
    columns: ColumnsBlock(),
    hero: HeroBlock(),
    spacer: SpacerBlock(),
    sectionHeader: SectionHeaderBlock(),
  },
});

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface BlockNoteEditorProps {
  page: Page;
  onChange: (blocks: Block[]) => void;
}

export default function BlockNoteEditor({ page, onChange }: BlockNoteEditorProps) {
  const existingBlocksRef = useRef<Block[]>(page.blocks);
  existingBlocksRef.current = page.blocks;

  const initialContent = useMemo(
    () => cmsBlocksToBlockNote(page.blocks),
    // Only compute once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const editor = useCreateBlockNote({
    schema,
    initialContent: (initialContent.length > 0 ? initialContent : undefined) as any,
  });

  const handleChange = useCallback(() => {
    if (!editor) return;
    const bnDoc = editor.document as any[];
    const cmsBlocks = blockNoteToCmsBlocks(bnDoc, existingBlocksRef.current);
    onChange(cmsBlocks);
  }, [editor, onChange]);

  /** Insert a custom block at the current cursor (or end of doc) */
  const insertBlock = useCallback(
    (type: string, props?: Record<string, any>) => {
      if (!editor) return;
      const block: any = { type, props: props || {} };
      try {
        const cursor = editor.getTextCursorPosition();
        if (cursor?.block) {
          editor.insertBlocks([block], cursor.block, 'after');
        } else {
          editor.insertBlocks([block], editor.document[editor.document.length - 1], 'after');
        }
      } catch {
        // Fallback: append to end
        const lastBlock = editor.document[editor.document.length - 1];
        if (lastBlock) {
          editor.insertBlocks([block], lastBlock, 'after');
        }
      }
      editor.focus();
    },
    [editor],
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🧱</span>
          <span className="font-semibold text-gray-800 text-sm">
            Struktúra szerkesztő (BlockNote)
          </span>
        </div>
        <span className="text-xs text-gray-500">
          {page.blocks.length} blokk · Húzd a blokkokat az átrendezéshez
        </span>
      </div>

      {/* Quick-insert toolbar for custom CMS blocks */}
      <div className="px-4 py-2 bg-white border-b border-gray-100 flex flex-wrap gap-1.5">
        <span className="text-xs text-gray-400 self-center mr-1">+ Blokk:</span>
        {[
          { label: '📐 Oszlopok', type: 'columns', props: { columnCount: '2', ratio: 'equal', col1: '', col2: '', col3: '', col4: '', gap: 'medium', verticalAlign: 'stretch', columnPadding: 'medium', bordered: true, rounded: true, minHeight: 'auto' } },
          { label: '🔘 CTA gomb', type: 'ctaButton', props: { buttonText: 'Kattints ide', buttonLink: '/', variant: 'primary', size: 'medium' } },
          { label: '🎯 Hős', type: 'hero', props: { textAlignment: 'center', backgroundColor: '#111827', padding: 'large' } },
          { label: '📌 Fejléc', type: 'sectionHeader', props: { level: 'h2', showDivider: true } },
          { label: '↕️ Térköz', type: 'spacer', props: { height: 'medium' } },
        ].map((b) => (
          <button
            key={b.type}
            onClick={() => insertBlock(b.type, b.props)}
            className="px-2.5 py-1 text-xs font-medium rounded border border-gray-200 bg-gray-50 text-gray-700 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition"
          >
            {b.label}
          </button>
        ))}
      </div>

      <div className="p-4" style={{ minHeight: '400px' }}>
        <BlockNoteView
          editor={editor}
          onChange={handleChange}
          theme="light"
          sideMenu
          formattingToolbar
          slashMenu
          filePanel
          tableHandles
        />
      </div>
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-400">
        💡 Tipp: Használd a <strong>/</strong> parancsot vagy a fenti gombokat új blokk hozzáadásához.
        Egyedi blokkok: CTA gomb, Oszlopok, Hős szekció, Térköz, Szekció fejléc.
      </div>
    </div>
  );
}
