'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Inline delete-confirm + button for an existing fighter row.
 *
 * The button is a tiny client island; the parent server list
 * (`app/dashboard/fighters/page.tsx`) renders one per row.
 */
export function DeleteButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDelete = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/fighters/${encodeURIComponent(slug)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hiba');
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  if (confirming) {
    return (
      <div className="flex gap-2 items-center">
        <button
          type="button"
          disabled={busy}
          onClick={onDelete}
          className="text-xs uppercase tracking-widest font-bold text-white bg-red-600 hover:opacity-90 rounded-lg px-3 py-1.5 transition-opacity disabled:opacity-40"
        >
          {busy ? 'Törlés...' : 'Megerősít'}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-xs uppercase tracking-widest font-bold text-gray-400 hover:text-white border border-brand-dark-border rounded-lg px-3 py-1.5 transition-colors"
        >
          Mégse
        </button>
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="text-xs uppercase tracking-widest font-bold text-red-400 hover:text-red-300 border border-red-900/40 hover:border-red-700 rounded-lg px-3 py-1.5 transition-colors"
    >
      Törlés
    </button>
  );
}
