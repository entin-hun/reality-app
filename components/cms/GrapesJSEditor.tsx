'use client';

/**
 * GrapesJSEditor — full drag-and-drop visual page builder for the EFU CMS.
 *
 * Features:
 * - Locale switching (HU/EN) — each locale stores its own HTML
 * - Live site CSS/fonts injected into canvas iframe for WYSIWYG
 * - Block library, style manager, layers, device preview
 *
 * MUST be loaded with next/dynamic ssr:false — GrapesJS needs the DOM.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import grapesjs, { type Editor } from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';

import type { Block, Page } from '@/lib/cms/types';
import { blocksToHtml, htmlToCmsBlocks } from '@/lib/cms/grapesjs/blocksToHtml';

/** Google Fonts URL — injected as <link> (works reliably in iframes) */
const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap';

/** CSS that mirrors the live site's look inside the GrapesJS canvas */
const CANVAS_CSS = `
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #1f2937;
    background: #ffffff;
    margin: 0;
    line-height: 1.6;
  }
  h1, h2, h3, h4, h5, h6 {
    font-family: 'Oswald', 'Impact', 'Arial Black', sans-serif;
    font-weight: 700;
    line-height: 1.2;
    margin: 0 0 0.5em 0;
  }
  h1 { font-size: 48px; }
  h2 { font-size: 36px; }
  h3 { font-size: 28px; }
  p { margin: 0 0 1em 0; }
  a { color: #DC2626; text-decoration: none; }
  a:hover { text-decoration: underline; }
  img { max-width: 100%; height: auto; }
  .efu-hero {
    font-family: 'Oswald', 'Impact', 'Arial Black', sans-serif;
  }
  .efu-hero h1 {
    font-size: 48px;
    letter-spacing: -0.02em;
    text-transform: uppercase;
  }
  .efu-hero p {
    font-family: 'Inter', sans-serif;
    font-size: 18px;
  }
  .efu-text {
    font-family: 'Inter', sans-serif;
    font-size: 16px;
    line-height: 1.7;
  }
  .efu-gallery {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
`;

interface GrapesJSEditorProps {
  page: Page;
  onChange: (blocks: Block[]) => void;
}

export default function GrapesJSEditor({ page, onChange }: GrapesJSEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const pageBlocksRef = useRef(page.blocks);
  pageBlocksRef.current = page.blocks;

  const [locale, setLocale] = useState<'hu' | 'en'>('hu');
  const localeRef = useRef(locale);

  // Cache HTML per locale so switching doesn't lose edits
  const htmlCacheRef = useRef<Record<string, string>>({});

  const handleUpdate = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const html = editor.getHtml();
    const css = editor.getCss();
    const fullHtml = css ? `<style>${css}</style>\n${html}` : html;
    // Cache current locale HTML
    htmlCacheRef.current[localeRef.current] = fullHtml;
    const blocks = htmlToCmsBlocks(fullHtml, pageBlocksRef.current, localeRef.current);
    onChangeRef.current(blocks);
  }, []);

  /** Switch locale: save current, load target */
  const switchLocale = useCallback((newLocale: 'hu' | 'en') => {
    const editor = editorRef.current;
    if (!editor || newLocale === localeRef.current) return;

    // Save current locale's HTML to cache
    const currentHtml = editor.getHtml();
    const currentCss = editor.getCss();
    htmlCacheRef.current[localeRef.current] = currentCss
      ? `<style>${currentCss}</style>\n${currentHtml}`
      : currentHtml;

    // Also persist to page state
    const currentBlocks = htmlToCmsBlocks(
      htmlCacheRef.current[localeRef.current],
      pageBlocksRef.current,
      localeRef.current,
    );
    onChangeRef.current(currentBlocks);

    // Switch
    localeRef.current = newLocale;
    setLocale(newLocale);

    // Load target locale's HTML (from cache or from blocks)
    const targetHtml =
      htmlCacheRef.current[newLocale] ||
      blocksToHtml(pageBlocksRef.current, newLocale) ||
      '<section style="padding:60px 20px;text-align:center;"><h1>New page</h1><p>Drag blocks from the left panel.</p></section>';

    editor.setComponents(targetHtml);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // Destroy previous editor if any
    if (editorRef.current) {
      editorRef.current.destroy();
      editorRef.current = null;
    }

    const editor = grapesjs.init({
      container: containerRef.current,
      height: '600px',
      width: 'auto',
      fromElement: false,
      storageManager: false,
      panels: { defaults: [] },
      canvas: {
        styles: [],
      },
      blockManager: {
        appendTo: '#gjs-blocks',
        blocks: [
          {
            id: 'section',
            label: '<div style="font-size:24px;text-align:center;">▦</div><div style="text-align:center;font-size:11px;">Szekció</div>',
            category: 'Elrendezés',
            content: '<section style="padding:40px 20px;"><div style="max-width:1100px;margin:0 auto;">Szekció tartalom</div></section>',
          },
          {
            id: 'columns-2',
            label: '<div style="font-size:24px;text-align:center;">▥</div><div style="text-align:center;font-size:11px;">2 Oszlop</div>',
            category: 'Elrendezés',
            content: `<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;padding:20px;">
  <div style="border:1px dashed #ccc;padding:16px;min-height:60px;">Oszlop 1</div>
  <div style="border:1px dashed #ccc;padding:16px;min-height:60px;">Oszlop 2</div>
</div>`,
          },
          {
            id: 'columns-3',
            label: '<div style="font-size:24px;text-align:center;">▤</div><div style="text-align:center;font-size:11px;">3 Oszlop</div>',
            category: 'Elrendezés',
            content: `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;padding:20px;">
  <div style="border:1px dashed #ccc;padding:16px;min-height:60px;">Oszlop 1</div>
  <div style="border:1px dashed #ccc;padding:16px;min-height:60px;">Oszlop 2</div>
  <div style="border:1px dashed #ccc;padding:16px;min-height:60px;">Oszlop 3</div>
</div>`,
          },
          {
            id: 'sidebar-left',
            label: '<div style="font-size:24px;text-align:center;">▧</div><div style="text-align:center;font-size:11px;">Oldalsáv + Tartalom</div>',
            category: 'Elrendezés',
            content: `<div style="display:grid;grid-template-columns:280px 1fr;gap:20px;padding:20px;">
  <div style="border:1px dashed #ccc;padding:16px;min-height:60px;">Oldalsáv</div>
  <div style="border:1px dashed #ccc;padding:16px;min-height:60px;">Fő tartalom</div>
</div>`,
          },
          {
            id: 'heading',
            label: '<div style="font-size:24px;text-align:center;">H</div><div style="text-align:center;font-size:11px;">Címsor</div>',
            category: 'Alap',
            content: '<h2 style="font-size:28px;font-weight:700;">Címsor</h2>',
          },
          {
            id: 'paragraph',
            label: '<div style="font-size:24px;text-align:center;">¶</div><div style="text-align:center;font-size:11px;">Szöveg</div>',
            category: 'Alap',
            content: '<p style="font-size:16px;line-height:1.6;">Szöveg helye...</p>',
          },
          {
            id: 'image',
            label: '<div style="font-size:24px;text-align:center;">🖼</div><div style="text-align:center;font-size:11px;">Kép</div>',
            category: 'Alap',
            content: '<img src="https://placehold.co/600x400/e5e7eb/6b7280?text=Kép" style="max-width:100%;border-radius:8px;" />',
          },
          {
            id: 'video',
            label: '<div style="font-size:24px;text-align:center;">▶</div><div style="text-align:center;font-size:11px;">Videó</div>',
            category: 'Alap',
            content: '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" style="width:100%;aspect-ratio:16/9;border:0;border-radius:8px;" allowfullscreen></iframe>',
          },
          {
            id: 'button',
            label: '<div style="font-size:24px;text-align:center;">🔘</div><div style="text-align:center;font-size:11px;">Gomb</div>',
            category: 'Alap',
            content: '<a href="#" style="display:inline-block;padding:12px 32px;background:#DC2626;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">Gomb</a>',
          },
          {
            id: 'hero',
            label: '<div style="font-size:24px;text-align:center;">🎯</div><div style="text-align:center;font-size:11px;">Hős szekció</div>',
            category: 'CMS',
            content: `<section style="background:#111827;color:#fff;text-align:center;padding:72px 32px;">
  <h1 style="font-size:40px;font-weight:700;margin:0;">Cím</h1>
  <p style="font-size:18px;opacity:.85;margin-top:12px;">Alcím szövege</p>
  <a href="#" style="display:inline-block;margin-top:20px;padding:12px 32px;background:#DC2626;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">CTA gomb</a>
</section>`,
          },
          {
            id: 'spacer',
            label: '<div style="font-size:24px;text-align:center;">↕</div><div style="text-align:center;font-size:11px;">Térköz</div>',
            category: 'CMS',
            content: '<div style="height:40px;"></div>',
          },
          {
            id: 'divider',
            label: '<div style="font-size:24px;text-align:center;">—</div><div style="text-align:center;font-size:11px;">Elválasztó</div>',
            category: 'CMS',
            content: '<hr style="border:none;border-top:2px solid #e5e7eb;margin:24px 0;" />',
          },
        ],
      },
      styleManager: {
        appendTo: '#gjs-styles',
        sectors: [
          {
            name: 'Általános',
            open: true,
            properties: [
              { property: 'display' },
              { property: 'width' },
              { property: 'height' },
              { property: 'max-width' },
              { property: 'min-height' },
              { property: 'margin' },
              { property: 'padding' },
            ],
          },
          {
            name: 'Színek',
            open: true,
            properties: [
              { property: 'background-color' },
              { property: 'color' },
              { property: 'background' },
            ],
          },
          {
            name: 'Tipográfia',
            open: true,
            properties: [
              { property: 'font-size' },
              { property: 'font-weight' },
              { property: 'font-family' },
              { property: 'text-align' },
              { property: 'line-height' },
              { property: 'letter-spacing' },
            ],
          },
          {
            name: 'Elrendezés',
            open: false,
            properties: [
              { property: 'grid-template-columns' },
              { property: 'gap' },
              { property: 'align-items' },
              { property: 'justify-content' },
              { property: 'flex-direction' },
            ],
          },
          {
            name: 'Keret',
            open: false,
            properties: [
              { property: 'border' },
              { property: 'border-radius' },
              { property: 'box-shadow' },
            ],
          },
        ],
      },
      traitManager: {
        appendTo: '#gjs-traits',
      },
      selectorManager: {
        appendTo: '#gjs-selectors',
      },
      layerManager: {
        appendTo: '#gjs-layers',
      },
      deviceManager: {
        devices: [
          { name: 'Asztali', width: '' },
          { name: 'Tablet', width: '768px', widthMedia: '992px' },
          { name: 'Mobil', width: '375px', widthMedia: '480px' },
        ],
      },
    });

    // Add default panels
    editor.Panels.addPanel({
      id: 'panel-devices',
      el: '.panel-devices',
      buttons: [
        { id: 'device-desktop', command: 'set-device-desktop', active: true, label: '<span style="font-size:18px;">🖥</span>' },
        { id: 'device-tablet', command: 'set-device-tablet', label: '<span style="font-size:18px;">📱</span>' },
        { id: 'device-mobile', command: 'set-device-mobile', label: '<span style="font-size:18px;">📲</span>' },
      ],
    });

    editor.Panels.addPanel({
      id: 'panel-switcher',
      el: '.panel-switcher',
      buttons: [
        { id: 'show-blocks', active: true, command: 'show-blocks', label: '<span style="font-size:16px;">▦</span>' },
        { id: 'show-style', command: 'show-style', label: '<span style="font-size:16px;">🎨</span>' },
        { id: 'show-layers', command: 'show-layers', label: '<span style="font-size:16px;">☰</span>' },
      ],
    });

    editor.Panels.addPanel({
      id: 'panel-actions',
      el: '.panel-actions',
      buttons: [
        { id: 'undo', command: 'core:undo', label: '↩' },
        { id: 'redo', command: 'core:redo', label: '↪' },
        { id: 'clear', command: 'clear-all', label: '🗑' },
      ],
    });

    // Commands
    editor.Commands.add('set-device-desktop', { run: (e) => e.setDevice('Asztali') });
    editor.Commands.add('set-device-tablet', { run: (e) => e.setDevice('Tablet') });
    editor.Commands.add('set-device-mobile', { run: (e) => e.setDevice('Mobil') });
    editor.Commands.add('show-blocks', {
      run: () => {
        document.getElementById('gjs-blocks')!.style.display = '';
        document.getElementById('gjs-styles')!.style.display = 'none';
        document.getElementById('gjs-traits')!.style.display = 'none';
        document.getElementById('gjs-layers')!.style.display = 'none';
        document.getElementById('gjs-selectors')!.style.display = 'none';
      },
    });
    editor.Commands.add('show-style', {
      run: () => {
        document.getElementById('gjs-blocks')!.style.display = 'none';
        document.getElementById('gjs-styles')!.style.display = '';
        document.getElementById('gjs-traits')!.style.display = '';
        document.getElementById('gjs-selectors')!.style.display = '';
        document.getElementById('gjs-layers')!.style.display = 'none';
      },
    });
    editor.Commands.add('show-layers', {
      run: () => {
        document.getElementById('gjs-blocks')!.style.display = 'none';
        document.getElementById('gjs-styles')!.style.display = 'none';
        document.getElementById('gjs-traits')!.style.display = 'none';
        document.getElementById('gjs-selectors')!.style.display = 'none';
        document.getElementById('gjs-layers')!.style.display = '';
      },
    });
    editor.Commands.add('clear-all', {
      run: (e) => {
        if (confirm('Biztosan törlöd az összes tartalmat?')) {
          e.DomComponents.clear();
          handleUpdate();
        }
      },
    });

    // Load initial content for default locale
    const initHtml = blocksToHtml(page.blocks, 'hu');
    if (initHtml.trim()) {
      editor.setComponents(initHtml);
    } else {
      editor.setComponents('<section style="padding:60px 20px;text-align:center;"><h1>Új oldal</h1><p>Húzz ide blokkokat a bal oldali panelből.</p></section>');
    }

    /** Inject fonts + CSS into the canvas iframe */
    const injectCanvasStyles = () => {
      const iframe = editor.Canvas.getFrameEl();
      if (!iframe) return;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc || !doc.head) return;
      if (doc.querySelector('[data-efu-canvas]')) return; // already injected
      // Google Fonts via <link> (reliable in iframes, unlike @import in <style>)
      const link = doc.createElement('link');
      link.rel = 'stylesheet';
      link.href = FONTS_URL;
      link.setAttribute('data-efu-canvas', 'true');
      doc.head.appendChild(link);
      // EFU theme CSS
      const style = doc.createElement('style');
      style.setAttribute('data-efu-canvas', 'true');
      style.textContent = CANVAS_CSS;
      doc.head.appendChild(style);
    };

    // Inject on load and on every canvas refresh (device switch, etc.)
    editor.on('load', () => setTimeout(injectCanvasStyles, 50));
    editor.on('canvas:refresh', () => setTimeout(injectCanvasStyles, 150));

    // Debounced change handler
    let debounceTimer: ReturnType<typeof setTimeout>;
    editor.on('component:updated', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(handleUpdate, 800);
    });
    editor.on('component:add', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(handleUpdate, 800);
    });
    editor.on('component:remove', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(handleUpdate, 800);
    });

    editorRef.current = editor;

    return () => {
      clearTimeout(debounceTimer);
      editor.destroy();
      editorRef.current = null;
    };
    // Only init once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header with locale switcher */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🍇</span>
          <span className="font-semibold text-gray-800 text-sm">
            Vizuális szerkesztő (GrapesJS)
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Locale switcher */}
          <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => switchLocale('hu')}
              className={`px-3 py-1 text-xs font-semibold transition ${
                locale === 'hu'
                  ? 'bg-red-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              🇭🇺 HU
            </button>
            <button
              onClick={() => switchLocale('en')}
              className={`px-3 py-1 text-xs font-semibold transition ${
                locale === 'en'
                  ? 'bg-red-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              🇬🇧 EN
            </button>
          </div>
          <span className="text-xs text-gray-500">
            Húzd a blokkokat a bal panelből a vászonra
          </span>
        </div>
      </div>

      {/* GrapesJS panel containers */}
      <div className="flex" style={{ minHeight: '600px' }}>
        {/* Left sidebar */}
        <div className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col" style={{ minWidth: '240px' }}>
          {/* Panel switcher buttons */}
          <div className="panel-switcher flex border-b border-gray-200" />
          {/* Block manager */}
          <div id="gjs-blocks" className="flex-1 overflow-y-auto p-2" />
          {/* Style manager */}
          <div id="gjs-selectors" className="p-2 border-b border-gray-100" style={{ display: 'none' }} />
          <div id="gjs-styles" className="flex-1 overflow-y-auto p-2" style={{ display: 'none' }} />
          {/* Trait manager */}
          <div id="gjs-traits" className="p-2 border-t border-gray-100" style={{ display: 'none' }} />
          {/* Layer manager */}
          <div id="gjs-layers" className="flex-1 overflow-y-auto p-2" style={{ display: 'none' }} />
        </div>

        {/* Canvas */}
        <div className="flex-1 flex flex-col">
          {/* Top toolbar */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-200">
            <div className="panel-devices flex gap-1" />
            <div className="panel-actions flex gap-1" />
          </div>
          {/* Editor canvas */}
          <div ref={containerRef} className="flex-1" />
        </div>
      </div>

      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-400">
        💡 Tipp: Váltogasd a <strong>HU / EN</strong> nyelveket a fejlécben — minden nyelv saját tartalmat kap.
        Kattints duplán egy elemre a szöveg szerkesztéséhez.
      </div>
    </div>
  );
}
