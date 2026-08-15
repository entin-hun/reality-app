'use client';

/**
 * Custom BlockNote block specs for the EFU CMS.
 *
 * These extend the default BlockNote schema with CMS-specific structural
 * blocks: CTA buttons, multi-column layouts, hero sections, and spacers.
 *
 * BlockNote 0.52 custom blocks support content: "inline" | "none" only,
 * so columns store their per-column data in props (not nested editors).
 */

import { defaultProps } from '@blocknote/core';
import { createReactBlockSpec } from '@blocknote/react';

/* ------------------------------------------------------------------ */
/*  CTA Button block                                                   */
/* ------------------------------------------------------------------ */

export const CtaButtonBlock = createReactBlockSpec(
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
      const { block, editor } = props;
      const p = block.props;

      const variantClasses: Record<string, string> = {
        primary:
          'background:#DC2626;color:#fff;border:2px solid #DC2626;',
        secondary:
          'background:#F59E0B;color:#fff;border:2px solid #F59E0B;',
        outline:
          'background:transparent;color:#DC2626;border:2px solid #DC2626;',
        ghost:
          'background:transparent;color:#374151;border:2px solid transparent;text-decoration:underline;',
      };

      const sizeStyles: Record<string, string> = {
        small: 'padding:6px 16px;font-size:13px;',
        medium: 'padding:10px 28px;font-size:15px;',
        large: 'padding:14px 40px;font-size:18px;',
      };

      const align =
        p.textAlignment === 'center'
          ? 'justify-content:center;'
          : p.textAlignment === 'right'
            ? 'justify-content:flex-end;'
            : 'justify-content:flex-start;';

      return (
        <div
          style={{
            display: 'flex',
            [align.replace('justify-content:', 'justifyContent') as any]:
              undefined,
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
              transition: 'opacity .15s',
              ...(variantClasses[p.variant] || variantClasses.primary).split(
                ';',
              ).reduce(
                (acc: Record<string, string>, pair: string) => {
                  const [k, v] = pair.split(':');
                  if (k && v) acc[k.trim()] = v.trim();
                  return acc;
                },
                {} as Record<string, string>,
              ),
              ...(sizeStyles[p.size] || sizeStyles.medium)
                .split(';')
                .reduce(
                  (acc: Record<string, string>, pair: string) => {
                    const [k, v] = pair.split(':');
                    if (k && v) acc[k.trim()] = v.trim();
                    return acc;
                  },
                  {} as Record<string, string>,
                ),
            }}
          >
            {p.buttonText || 'Button'}
          </a>
        </div>
      );
    },
  },
);

/* ------------------------------------------------------------------ */
/*  Columns block                                                      */
/* ------------------------------------------------------------------ */

export const ColumnsBlock = createReactBlockSpec(
  {
    type: 'columns' as const,
    propSchema: {
      layout: {
        default: '50-50',
        values: [
          '50-50',
          '33-67',
          '67-33',
          '25-75',
          '75-25',
          '33-33-33',
          '25-50-25',
        ] as const,
      },
      col1: { default: '', type: 'string' as const },
      col2: { default: '', type: 'string' as const },
      col3: { default: '', type: 'string' as const },
      gap: {
        default: 'medium',
        values: ['none', 'small', 'medium', 'large'] as const,
      },
      verticalAlign: {
        default: 'top',
        values: ['top', 'center', 'bottom'] as const,
      },
    },
    content: 'none',
  },
  {
    render: (props) => {
      const { block, editor } = props;
      const p = block.props;

      const layoutMap: Record<string, string> = {
        '50-50': '1fr 1fr',
        '33-67': '1fr 2fr',
        '67-33': '2fr 1fr',
        '25-75': '1fr 3fr',
        '75-25': '3fr 1fr',
        '33-33-33': '1fr 1fr 1fr',
        '25-50-25': '1fr 2fr 1fr',
      };

      const gapMap: Record<string, string> = {
        none: '0px',
        small: '8px',
        medium: '16px',
        large: '32px',
      };

      const alignMap: Record<string, string> = {
        top: 'flex-start',
        center: 'center',
        bottom: 'flex-end',
      };

      const cols = layoutMap[p.layout] || '1fr 1fr';
      const colCount = cols.split(' ').length;

      const columnData = [p.col1, p.col2, p.col3].slice(0, colCount);

      return (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: cols,
            gap: gapMap[p.gap] || '16px',
            alignItems: alignMap[p.verticalAlign] || 'flex-start',
            padding: '8px 0',
            minHeight: '60px',
          }}
        >
          {columnData.map((content, i) => (
            <div
              key={i}
              style={{
                border: '1px dashed #d1d5db',
                borderRadius: '8px',
                padding: '12px',
                minHeight: '48px',
                background: '#f9fafb',
                fontSize: '14px',
                color: content ? '#1f2937' : '#9ca3af',
              }}
              dangerouslySetInnerHTML={
                content
                  ? { __html: content }
                  : undefined
              }
            >
              {content ? undefined : `Column ${i + 1} — click to edit`}
            </div>
          ))}
        </div>
      );
    },
  },
);

/* ------------------------------------------------------------------ */
/*  Hero block                                                         */
/* ------------------------------------------------------------------ */

export const HeroBlock = createReactBlockSpec(
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
      const { block, contentRef, editor } = props;
      const p = block.props;

      const paddingMap: Record<string, string> = {
        small: '24px 16px',
        medium: '48px 24px',
        large: '72px 32px',
        xlarge: '120px 40px',
      };

      const overlayMap: Record<string, number> = {
        none: 0,
        light: 0.2,
        medium: 0.45,
        heavy: 0.7,
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
                position: 'absolute',
                inset: 0,
                background: `rgba(0,0,0,${overlay})`,
              }}
            />
          )}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div
              ref={contentRef}
              style={{
                fontSize: '28px',
                fontWeight: 700,
                lineHeight: 1.2,
                minHeight: '1.2em',
              }}
            />
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
                      p.ctaVariant === 'outline'
                        ? 'transparent'
                        : p.ctaVariant === 'secondary'
                          ? '#F59E0B'
                          : '#DC2626',
                    color:
                      p.ctaVariant === 'outline' ? '#fff' : '#fff',
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

/* ------------------------------------------------------------------ */
/*  Spacer block                                                       */
/* ------------------------------------------------------------------ */

export const SpacerBlock = createReactBlockSpec(
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
        small: '16px',
        medium: '40px',
        large: '80px',
        xlarge: '140px',
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

/* ------------------------------------------------------------------ */
/*  Section header block (full-width banner-style heading)             */
/* ------------------------------------------------------------------ */

export const SectionHeaderBlock = createReactBlockSpec(
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
      const { block, contentRef, editor } = props;
      const p = block.props;
      const Tag = (p.level || 'h2') as 'h1' | 'h2' | 'h3';
      const sizes: Record<string, string> = {
        h1: '32px',
        h2: '26px',
        h3: '20px',
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
