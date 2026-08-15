'use client';

import { useState } from 'react';

interface Props {
  slug: string;
  /** Controlled photo URL — kept in sync with the form's `photo` field. */
  value: string;
  onChange: (next: string) => void;
}

/**
 * Photo uploader used in the fighter form. Uploads multipart to
 * /api/dashboard/fighters/upload and writes the resulting URL into the
 * parent's hidden field.
 *
 * Standalone client island so the rest of the form (a server component
 * concept) can hand over the controlled state.
 */
export function FighterPhotoUploader({ slug, value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onUpload = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (slug) fd.append('slug', slug);
      const res = await fetch('/api/dashboard/fighters/upload', {
        method: 'POST',
        body: fd,
      });
      const body = (await res.json()) as
        | { ok: true; url: string }
        | { ok: false; error?: string };
      if (!res.ok || !('url' in body)) {
        const err = 'error' in body ? body.error : undefined;
        throw new Error(err ?? `HTTP ${res.status}`);
      }
      onChange(body.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hiba a feltöltésnél');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative w-40 h-52 overflow-hidden rounded-lg border border-brand-dark-border bg-brand-dark-muted">
        {value ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={value}
            alt="fighter preview"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
            nincs fotó
          </div>
        )}
      </div>
      <label className="block">
        <span className="text-xs uppercase tracking-widest text-gray-500 mb-1 block">
          Új fénykép feltöltése (JPG/PNG/WebP, max 4MB)
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
          }}
          className="block w-full text-xs text-gray-400 file:text-xs file:font-bold file:uppercase file:tracking-widest file:border-0 file:bg-brand-red file:text-white file:px-3 file:py-2 file:rounded file:cursor-pointer file:mr-3"
        />
      </label>
      {uploading && <p className="text-xs text-gray-500">Feltöltés...</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
      <p className="text-[10px] text-gray-600">
        Fotó URL-t közvetlenül lentebb írhatod. A feltöltött fájl a
        <code className="text-gray-500">/uploads/fighters/</code> mappába kerül.
      </p>
    </div>
  );
}
