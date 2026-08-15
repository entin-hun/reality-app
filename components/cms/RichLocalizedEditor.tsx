'use client';

/**
 * RichLocalizedEditor — HU/EN tabbed rich text editor for CMS localized content.
 *
 * Wraps two RichTextEditor instances behind a tab switcher.
 * Stores content as { hu: string, en: string } where each value is HTML.
 */

import { useState } from 'react';
import { RichTextEditor } from './RichTextEditor';
import type { LocalizedString } from '@/lib/cms/types';

interface RichLocalizedEditorProps {
  label: string;
  value: LocalizedString;
  onChange: (locale: 'hu' | 'en', html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function RichLocalizedEditor({
  label,
  value,
  onChange,
  placeholder,
  minHeight = '160px',
}: RichLocalizedEditorProps) {
  const [activeLocale, setActiveLocale] = useState<'hu' | 'en'>('hu');

  return (
    <div className="space-y-1">
      {/* Label + locale tabs */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        <div className="flex rounded-md overflow-hidden border border-gray-300 text-xs">
          <button
            type="button"
            onClick={() => setActiveLocale('hu')}
            className={`px-3 py-1 transition-colors ${
              activeLocale === 'hu'
                ? 'bg-red-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            🇭🇺 HU
          </button>
          <button
            type="button"
            onClick={() => setActiveLocale('en')}
            className={`px-3 py-1 transition-colors ${
              activeLocale === 'en'
                ? 'bg-red-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            🇬🇧 EN
          </button>
        </div>
      </div>

      {/* Rich editor for active locale */}
      <RichTextEditor
        content={value[activeLocale] || ''}
        onChange={(html) => onChange(activeLocale, html)}
        placeholder={placeholder || (activeLocale === 'hu' ? 'Írj ide magyarul...' : 'Write in English...')}
        minHeight={minHeight}
      />

      {/* Preview hint for the other locale */}
      {value[activeLocale === 'hu' ? 'en' : 'hu'] && (
        <div className="text-xs text-gray-400 mt-1">
          {activeLocale === 'hu' ? '🇬🇧' : '🇭'}{' '}
          {activeLocale === 'hu' ? 'EN' : 'HU'}:{' '}
          <span className="italic">
            {stripHtml(value[activeLocale === 'hu' ? 'en' : 'hu'] || '').slice(0, 80)}
            {stripHtml(value[activeLocale === 'hu' ? 'en' : 'hu'] || '').length > 80 ? '…' : ''}
          </span>
        </div>
      )}
    </div>
  );
}

/** Strip HTML tags for preview snippet */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}
