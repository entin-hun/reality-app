/**
 * CMS Page Editor
 * 
 * Ez a komponens lehetővé teszi egy CMS oldal szerkesztését:
 * - Blokkok hozzáadása, szerkesztése, törlése
 * - Blokkok sorrendjének módosítása
 * - SEO beállítások
 * - Publikálás/piszkozat állapot
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { Page, Block, BlockType, LocalizedString } from '@/lib/cms/types';
import { RichLocalizedEditor } from '@/components/cms/RichLocalizedEditor';

/** BlockNote structural editor — loaded client-side only (needs DOM) */
const BlockNoteEditor = dynamic(
  () => import('@/components/cms/BlockNoteEditor'),
  {
    ssr: false,
    loading: () => (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
        <div className="animate-pulse text-2xl mb-2">🧱</div>
        Struktúra szerkesztő betöltése...
      </div>
    ),
  },
);

/** GrapesJS visual editor — loaded client-side only (needs DOM) */
const GrapesJSEditor = dynamic(
  () => import('@/components/cms/GrapesJSEditor'),
  {
    ssr: false,
    loading: () => (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
        <div className="animate-pulse text-2xl mb-2">🍇</div>
        Vizuális szerkesztő betöltése...
      </div>
    ),
  },
);

/** Field keys that should use the rich text editor (long-form content) */
const RICH_TEXT_FIELDS = new Set([
  'body', 'body2', 'body3', 'subtitle', 'description', 'content',
  'text', 'paragraph', 'intro', 'summary', 'details',
]);

const BLOCK_TYPES: { type: BlockType; label: string; icon: string }[] = [
  { type: 'hero', label: 'Hero', icon: '🎯' },
  { type: 'text', label: 'Szöveg', icon: '📝' },
  { type: 'image', label: 'Kép', icon: '️' },
  { type: 'video', label: 'Videó', icon: '🎬' },
  { type: 'gallery', label: 'Galéria', icon: '' },
  { type: 'cta', label: 'CTA', icon: '' },
  { type: 'divider', label: 'Elválasztó', icon: '➖' },
  { type: 'spacer', label: 'Térköz', icon: '↕️' },
];

export default function CmsPageEditor() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [editorMode, setEditorMode] = useState<'fields' | 'structure' | 'visual'>('fields');

  useEffect(() => {
    loadPage();
  }, [slug]);

  async function loadPage() {
    try {
      setLoading(true);
      const response = await fetch(`/api/cms/pages/${slug}`);
      const data = await response.json();

      if (response.ok) {
        setPage(data.page);
      } else {
        setError(data.error || 'Failed to load page');
      }
    } catch (err) {
      setError('Failed to load page');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!page) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/cms/pages/${slug}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(page),
      });

      if (response.ok) {
        const data = await response.json();
        setPage(data.page);
        setError(null);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save page');
      }
    } catch (err) {
      setError('Failed to save page');
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePublish() {
    if (!page) return;

    const updatedPage = {
      ...page,
      published: !page.published,
    };

    setPage(updatedPage);

    try {
      const response = await fetch(`/api/cms/pages/${slug}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedPage),
      });

      if (!response.ok) {
        setError('Failed to update publish status');
        await loadPage();
      }
    } catch (err) {
      setError('Failed to update publish status');
      await loadPage();
    }
  }

  function handleAddBlock(type: BlockType) {
    if (!page) return;

    const newBlock: Block = {
      id: `block-${Date.now()}`,
      type,
      layout: 'full',
      content: getDefaultContent(type),
      settings: {
        padding: 'medium',
      },
      order: page.blocks.length,
      visible: true,
    };

    setPage({
      ...page,
      blocks: [...page.blocks, newBlock],
    });
    setShowAddBlock(false);
  }

  function handleDeleteBlock(blockId: string) {
    if (!page) return;

    setPage({
      ...page,
      blocks: page.blocks
        .filter((b) => b.id !== blockId)
        .map((b, index) => ({ ...b, order: index })),
    });
  }

  function handleMoveBlock(blockId: string, direction: 'up' | 'down') {
    if (!page) return;

    const blockIndex = page.blocks.findIndex((b) => b.id === blockId);
    if (blockIndex === -1) return;

    const newIndex = direction === 'up' ? blockIndex - 1 : blockIndex + 1;
    if (newIndex < 0 || newIndex >= page.blocks.length) return;

    const newBlocks = [...page.blocks];
    const temp = newBlocks[blockIndex];
    newBlocks[blockIndex] = newBlocks[newIndex];
    newBlocks[newIndex] = temp;

    setPage({
      ...page,
      blocks: newBlocks.map((b, index) => ({ ...b, order: index })),
    });
  }

  function handleUpdateBlock(blockId: string, updates: Partial<Block>) {
    if (!page) return;

    setPage({
      ...page,
      blocks: page.blocks.map((b) =>
        b.id === blockId ? { ...b, ...updates } : b
      ),
    });
  }

  function handleUpdateTitle(locale: 'hu' | 'en', value: string) {
    if (!page) return;

    setPage({
      ...page,
      title: {
        ...page.title,
        [locale]: value,
      },
    });
  }

  function handleUpdateSeo(field: 'title' | 'description', locale: 'hu' | 'en', value: string) {
    if (!page) return;
    setPage({
      ...page,
      seo: {
        ...page.seo,
        [field]: {
          ...page.seo[field],
          [locale]: value,
        },
      },
    });
  }

  function handleRegenerateSeo() {
    if (!page) return;
    // Auto-generate SEO from page title and first text content
    const firstText = page.blocks.find((b) => b.type === 'text' || b.type === 'hero');
    const descHu = firstText?.content?.subtitle?.hu || firstText?.content?.content?.hu || '';
    const descEn = firstText?.content?.subtitle?.en || firstText?.content?.content?.en || '';
    const plainHu = descHu.replace(/<[^>]*>/g, '').slice(0, 160);
    const plainEn = descEn.replace(/<[^>]*>/g, '').slice(0, 160);
    setPage({
      ...page,
      seo: {
        ...page.seo,
        title: { ...page.title },
        description: {
          hu: plainHu || page.title.hu || '',
          en: plainEn || page.title.en || '',
        },
      },
    });
  }

  function getDefaultContent(type: BlockType): Record<string, any> {
    switch (type) {
      case 'hero':
        return {
          title: { hu: '', en: '' },
          subtitle: { hu: '', en: '' },
          ctaText: { hu: '', en: '' },
          ctaLink: '',
        };
      case 'text':
        return {
          content: { hu: '', en: '' },
        };
      case 'image':
        return {
          src: '',
          alt: { hu: '', en: '' },
          caption: { hu: '', en: '' },
        };
      case 'video':
        return {
          url: '',
          autoplay: false,
          loop: false,
        };
      case 'gallery':
        return {
          images: [],
        };
      case 'cta':
        return {
          text: { hu: '', en: '' },
          link: '',
          variant: 'primary',
        };
      case 'divider':
        return {};
      case 'spacer':
        return {
          height: 'medium',
        };
      default:
        return {};
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">Betöltés...</div>
      </div>
    );
  }

  if (error && !page) {
    return (
      <div className="p-8">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={() => router.push('/dashboard/cms/pages')}
          className="px-4 py-2 bg-brand-red text-white rounded hover:bg-red-700"
        >
          Vissza
        </button>
      </div>
    );
  }

  if (!page) {
    return null;
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <button
            onClick={() => router.push('/dashboard/cms/pages')}
            className="text-sm text-gray-600 hover:text-gray-900 mb-2"
          >
            ← Vissza az oldalakhoz
          </button>
          <h1 className="text-3xl font-bold">Oldal szerkesztése: {slug}</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleTogglePublish}
            className={`px-4 py-2 rounded ${
              page.published
                ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            {page.published ? 'Piszkozat' : 'Publikálás'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-brand-red text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? 'Mentés...' : 'Mentés'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Page Title — hidden in visual mode (shown inside visual editor section) */}
      {editorMode !== 'visual' && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Oldal cím</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Magyar
              </label>
              <input
                type="text"
                value={page.title.hu || ''}
                onChange={(e) => handleUpdateTitle('hu', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-red"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                English
              </label>
              <input
                type="text"
                value={page.title.en || ''}
                onChange={(e) => handleUpdateTitle('en', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-red"
              />
            </div>
          </div>
        </div>
      )}

      {/* Blocks */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">Tartalmi blokkok</h2>
            {/* Editor mode toggle */}
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                onClick={() => setEditorMode('fields')}
                className={`px-3 py-1.5 text-sm font-medium transition ${
                  editorMode === 'fields'
                    ? 'bg-brand-red text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                📋 Mező
              </button>
              <button
                onClick={() => setEditorMode('structure')}
                className={`px-3 py-1.5 text-sm font-medium transition ${
                  editorMode === 'structure'
                    ? 'bg-brand-red text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                🧱 Struktúra
              </button>
              <button
                onClick={() => setEditorMode('visual')}
                className={`px-3 py-1.5 text-sm font-medium transition ${
                  editorMode === 'visual'
                    ? 'bg-brand-red text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                🍇 Vizuális
              </button>
            </div>
          </div>
          {editorMode === 'fields' && (
            <button
              onClick={() => setShowAddBlock(true)}
              className="px-4 py-2 bg-brand-red text-white rounded hover:bg-red-700"
            >
              + Blokk hozzáadása
            </button>
          )}
        </div>

        {editorMode === 'structure' ? (
          /* ---- BlockNote structural editor ---- */
          <BlockNoteEditor
            page={page}
            onChange={(blocks) => {
              setPage((prev) => (prev ? { ...prev, blocks } : prev));
            }}
          />
        ) : editorMode === 'visual' ? (
          /* ---- GrapesJS visual editor with page-level fields ---- */
          <div className="space-y-4">
            {/* Page Settings — title + SEO above the visual editor */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                ⚙️ Oldal beállítások
              </h2>
              {/* Page title */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Oldal cím — Magyar
                  </label>
                  <input
                    type="text"
                    value={page.title.hu || ''}
                    onChange={(e) => handleUpdateTitle('hu', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-red"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Oldal cím — English
                  </label>
                  <input
                    type="text"
                    value={page.title.en || ''}
                    onChange={(e) => handleUpdateTitle('en', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-red"
                  />
                </div>
              </div>
              {/* SEO title */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SEO cím — Magyar
                  </label>
                  <input
                    type="text"
                    value={page.seo?.title?.hu || ''}
                    onChange={(e) => handleUpdateSeo('title', 'hu', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-red text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SEO cím — English
                  </label>
                  <input
                    type="text"
                    value={page.seo?.title?.en || ''}
                    onChange={(e) => handleUpdateSeo('title', 'en', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-red text-sm"
                  />
                </div>
              </div>
              {/* SEO description */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SEO leírás — Magyar
                  </label>
                  <textarea
                    rows={2}
                    value={page.seo?.description?.hu || ''}
                    onChange={(e) => handleUpdateSeo('description', 'hu', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-red text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SEO leírás — English
                  </label>
                  <textarea
                    rows={2}
                    value={page.seo?.description?.en || ''}
                    onChange={(e) => handleUpdateSeo('description', 'en', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-red text-sm"
                  />
                </div>
              </div>
              <button
                onClick={handleRegenerateSeo}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 border border-gray-300"
              >
                🔄 SEO metaadatok újragenerálása
              </button>
            </div>

            {/* GrapesJS visual editor */}
            <GrapesJSEditor
              page={page}
              onChange={(blocks) => {
                setPage((prev) => (prev ? { ...prev, blocks } : prev));
              }}
            />
          </div>
        ) : (
          /* ---- Legacy field/block editor ---- */
          <>
            {page.blocks.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                Még nincsenek blokkok. Kattints a "Blokk hozzáadása" gombra.
              </div>
            ) : (
              page.blocks.map((block, index) => (
                <BlockEditor
                  key={block.id}
                  block={block}
                  index={index}
                  total={page.blocks.length}
                  onUpdate={(updates) => handleUpdateBlock(block.id, updates)}
                  onDelete={() => handleDeleteBlock(block.id)}
                  onMove={(direction) => handleMoveBlock(block.id, direction)}
                />
              ))
            )}
          </>
        )}
      </div>

      {/* Add Block Modal */}
      {showAddBlock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Blokk típus kiválasztása</h3>
            <div className="grid grid-cols-2 gap-4">
              {BLOCK_TYPES.map((bt) => (
                <button
                  key={bt.type}
                  onClick={() => handleAddBlock(bt.type)}
                  className="flex items-center gap-3 p-4 border border-gray-300 rounded hover:border-brand-red hover:bg-red-50 transition"
                >
                  <span className="text-2xl">{bt.icon}</span>
                  <span className="font-medium">{bt.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAddBlock(false)}
              className="mt-4 w-full px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Mégse
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Block Editor Component */
function BlockEditor({
  block,
  index,
  total,
  onUpdate,
  onDelete,
  onMove,
}: {
  block: Block;
  index: number;
  total: number;
  onUpdate: (updates: Partial<Block>) => void;
  onDelete: () => void;
  onMove: (direction: 'up' | 'down') => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const blockType = BLOCK_TYPES.find((bt) => bt.type === block.type);

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{blockType?.icon}</span>
          <div>
            <div className="font-medium">{blockType?.label}</div>
            <div className="text-sm text-gray-500">
              #{index + 1} • {block.layout}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onMove('up')}
            disabled={index === 0}
            className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-30"
            title="Mozgatás felfelé"
          >
            ↑
          </button>
          <button
            onClick={() => onMove('down')}
            disabled={index === total - 1}
            className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-30"
            title="Mozgatás lefelé"
          >
            ↓
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 text-gray-600 hover:text-gray-900"
            title={expanded ? 'Összecsukás' : 'Kibontás'}
          >
            {expanded ? '−' : '+'}
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-600 hover:text-red-900"
            title="Törlés"
          >
            🗑
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Layout */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Elrendezés
            </label>
            <select
              value={block.layout}
              onChange={(e) => onUpdate({ layout: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-red"
            >
              <option value="full">Teljes szélesség</option>
              <option value="wide">Széles</option>
              <option value="narrow">Keskeny</option>
              <option value="split">Osztott</option>
            </select>
          </div>

          {/* Block-specific content editor */}
          <BlockContentEditor block={block} onUpdate={onUpdate} />

          {/* Settings */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Háttérszín
            </label>
            <input
              type="color"
              value={block.settings.backgroundColor || '#ffffff'}
              onChange={(e) =>
                onUpdate({
                  settings: { ...block.settings, backgroundColor: e.target.value },
                })
              }
              className="w-full h-10 border border-gray-300 rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Padding
            </label>
            <select
              value={block.settings.padding || 'medium'}
              onChange={(e) =>
                onUpdate({
                  settings: { ...block.settings, padding: e.target.value as any },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-red"
            >
              <option value="none">Nincs</option>
              <option value="small">Kicsi</option>
              <option value="medium">Közepes</option>
              <option value="large">Nagy</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`visible-${block.id}`}
              checked={block.visible}
              onChange={(e) => onUpdate({ visible: e.target.checked })}
              className="rounded border-gray-300 text-brand-red focus:ring-brand-red"
            />
            <label htmlFor={`visible-${block.id}`} className="text-sm text-gray-700">
              Látható
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

/** Dynamic Block Content Editor - automatically renders all fields from block.content */
function BlockContentEditor({
  block,
  onUpdate,
}: {
  block: Block;
  onUpdate: (updates: Partial<Block>) => void;
}) {
  const updateContent = (key: string, value: any) => {
    onUpdate({
      content: { ...block.content, [key]: value },
    });
  };

  const updateLocalized = (key: string, locale: 'hu' | 'en', value: string) => {
    onUpdate({
      content: {
        ...block.content,
        [key]: { ...(block.content[key] || {}), [locale]: value },
      },
    });
  };

  // Helper to check if a value is a localized string object {hu?, en?}
  // Only needs at least one of hu/en to be considered localized
  const isLocalizedString = (value: any): value is LocalizedString => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const keys = Object.keys(value);
    // Must have at least one key, and all keys must be locale codes
    const localeKeys = ['hu', 'en', 'sk', 'ro', 'de', 'ar', 'hr', 'sr', 'sl'];
    return keys.length > 0 && keys.every(k => localeKeys.includes(k)) && keys.some(k => typeof value[k] === 'string');
  };

  // Helper to check if a value is a nested object (not array, not localized string)
  const isNestedObject = (value: any): boolean => {
    return value && typeof value === 'object' && !Array.isArray(value) && !isLocalizedString(value);
  };

  // Render a single field based on its type
  const renderField = (key: string, value: any, depth: number = 0) => {
    const indent = depth > 0 ? 'ml-4 border-l-2 border-gray-200 pl-4' : '';
    
    // Skip internal fields
    if (key.startsWith('_')) return null;

    // Localized string {hu, en}
    if (isLocalizedString(value)) {
      // Use rich text editor for long-form content fields
      const fieldName = key.split('.').pop() || key;
      const isRich = RICH_TEXT_FIELDS.has(fieldName) ||
        (typeof value.hu === 'string' && value.hu.length > 120) ||
        (typeof value.en === 'string' && value.en.length > 120);

      if (isRich) {
        return (
          <div key={key} className={indent}>
            <RichLocalizedEditor
              label={formatLabel(key)}
              value={value}
              onChange={(locale, val) => updateLocalized(key, locale, val)}
            />
          </div>
        );
      }

      return (
        <div key={key} className={indent}>
          <LocalizedInput
            label={formatLabel(key)}
            value={value}
            onChange={(locale, val) => updateLocalized(key, locale, val)}
          />
        </div>
      );
    }

    // Nested object (e.g., ctaPrimary: {text, link})
    if (isNestedObject(value)) {
      return (
        <div key={key} className={`${indent} space-y-3`}>
          <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
            {formatLabel(key)}
          </div>
          {Object.entries(value).map(([subKey, subValue]) => 
            renderField(`${key}.${subKey}`, subValue, depth + 1)
          )}
        </div>
      );
    }

    // Array (e.g., pillars, rules, items)
    if (Array.isArray(value)) {
      return (
        <div key={key} className={`${indent} space-y-3`}>
          <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
            {formatLabel(key)} ({value.length} elem)
          </div>
          <div className="text-xs text-gray-500 italic">
            Tömb szerkesztés: JSON szerkesztőben módosítható
          </div>
          <textarea
            value={JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                updateContent(key, parsed);
              } catch {
                // Invalid JSON, ignore
              }
            }}
            rows={Math.min(value.length * 3, 20)}
            className="w-full px-3 py-2 border border-gray-300 rounded font-mono text-xs focus:outline-none focus:ring-2 focus:ring-brand-red"
          />
        </div>
      );
    }

    // Boolean
    if (typeof value === 'boolean') {
      return (
        <div key={key} className={`${indent} flex items-center gap-2`}>
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => updateContent(key, e.target.checked)}
            className="rounded border-gray-300 text-brand-red focus:ring-brand-red"
          />
          <label className="text-sm text-gray-700">{formatLabel(key)}</label>
        </div>
      );
    }

    // Number
    if (typeof value === 'number') {
      return (
        <div key={key} className={indent}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {formatLabel(key)}
          </label>
          <input
            type="number"
            value={value}
            onChange={(e) => updateContent(key, Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-red"
          />
        </div>
      );
    }

    // String (default)
    return (
      <div key={key} className={indent}>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {formatLabel(key)}
        </label>
        <input
          type="text"
          value={value || ''}
          onChange={(e) => updateContent(key, e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-red"
        />
      </div>
    );
  };

  // Format camelCase key to readable label
  const formatLabel = (key: string): string => {
    // Remove dots and format
    const cleanKey = key.replace(/\./g, ' › ');
    // Convert camelCase to spaces
    return cleanKey
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  // Render all content fields dynamically
  const contentEntries = Object.entries(block.content || {});
  
  if (contentEntries.length === 0) {
    return (
      <div className="text-gray-500 text-sm italic">
        Ez a blokk nem tartalmaz szerkeszthető tartalmat.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {contentEntries.map(([key, value]) => renderField(key, value))}
    </div>
  );
}

/** Localized Input Component */
function LocalizedInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: LocalizedString;
  onChange: (locale: 'hu' | 'en', value: string) => void;
}) {
  // Always show both HU and EN inputs for consistency
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} (HU)
        </label>
        <input
          type="text"
          value={value.hu || ''}
          onChange={(e) => onChange('hu', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-red"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} (EN)
        </label>
        <input
          type="text"
          value={value.en || ''}
          onChange={(e) => onChange('en', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-red"
        />
      </div>
    </div>
  );
}

/** Localized Textarea Component */
function LocalizedTextarea({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  value: LocalizedString;
  onChange: (locale: 'hu' | 'en', value: string) => void;
  rows?: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} (HU)
        </label>
        <textarea
          value={value.hu || ''}
          onChange={(e) => onChange('hu', e.target.value)}
          rows={rows}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-red"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} (EN)
        </label>
        <textarea
          value={value.en || ''}
          onChange={(e) => onChange('en', e.target.value)}
          rows={rows}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-red"
        />
      </div>
    </div>
  );
}
