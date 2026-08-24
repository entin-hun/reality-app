'use client';

/**
 * Generic CRUD admin list -- used by every CMS-kind admin page
 * (events, fight-cards, news, videos, photos, sponsors, social-links,
 * results, reality-triggers, audio-library).
 *
 * Each row is editable inline: the operator expands a row, edits the
 * fields, saves (PUT) and the list refreshes. "Új" prepends an empty
 * record that uses POST.
 *
 * Field definitions are passed in by the parent page so the type system
 * stays honest at the call-site.
 */

import { useCallback, useEffect, useState } from 'react';

export interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'url' | 'datetime' | 'select' | 'number' | 'boolean';
  options?: string[]; // for select
  placeholder?: string;
  required?: boolean;
}

interface GenericAdminListProps {
  kind: string;
  title: string;
  icon: string;
  description?: string;
  fields: FieldDef[];
  /** Render the value-cells in the table differently if needed. */
  renderCell?: (key: string, value: unknown, record: Record<string, unknown>) => React.ReactNode;
  /** Optional: a small header showing the count + a "Új" button. */
}

interface ApiList {
  ok: true;
  items: Array<Record<string, unknown>>;
}

export function GenericAdminList({
  kind,
  title,
  icon,
  description,
  fields,
  renderCell,
}: GenericAdminListProps) {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [showNew, setShowNew] = useState(false);
  const [newDraft, setNewDraft] = useState<Record<string, unknown>>({});

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/cms/${kind}`, { cache: 'no-store' });
      const body = (await res.json()) as ApiList | { ok: false; reason: string };
      if (!res.ok || !('ok' in body) || !body.ok) {
        setError(
          (body as { reason?: string }).reason ?? `HTTP ${res.status}`
        );
        setItems([]);
      } else {
        setItems(body.items);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ismeretlen hiba');
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const call = useCallback(
    async (
      method: 'POST' | 'PUT' | 'DELETE',
      body: Record<string, unknown> | null,
      qs?: string
    ) => {
      const url = qs
        ? `/api/admin/cms/${kind}?${qs}`
        : `/api/admin/cms/${kind}`;
      const init: RequestInit = { method };
      if (body) {
        init.headers = { 'content-type': 'application/json' };
        init.body = JSON.stringify(body);
      }
      const res = await fetch(url, init);
      const j = (await res.json()) as { ok: boolean; reason?: string };
      return res.ok && j.ok;
    },
    [kind]
  );

  function startEdit(item: Record<string, unknown>) {
    setEditingId(String(item.id));
    setDraft({ ...item });
    setShowNew(false);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft({});
  }

  async function saveEdit() {
    if (!editingId) return;
    setBusy(editingId);
    setError(null);
    try {
      const ok = await call('PUT', draft, `id=${encodeURIComponent(editingId)}`);
      if (!ok) setError('Mentés sikertelen');
      else await refresh();
    } finally {
      setBusy(null);
      setEditingId(null);
      setDraft({});
    }
  }

  async function deleteItem(item: Record<string, unknown>) {
    if (!confirm('Biztosan törlöd?')) return;
    setBusy(String(item.id));
    try {
      const ok = await call('DELETE', null, `id=${encodeURIComponent(String(item.id))}`);
      if (!ok) setError('Törlés sikertelen');
      else await refresh();
    } finally {
      setBusy(null);
    }
  }

  async function createItem() {
    setBusy('new');
    setError(null);
    try {
      const ok = await call('POST', newDraft);
      if (!ok) {
        setError('Létrehozás sikertelen');
      } else {
        setShowNew(false);
        setNewDraft({});
        await refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <header>
          <p className="text-brand-red text-sm uppercase tracking-widest font-semibold mb-1">
            Admin
          </p>
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <h1
              className="text-3xl sm:text-4xl font-black text-white uppercase"
              style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
            >
              {icon} {title}
            </h1>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={refresh}
                disabled={loading}
                className="text-xs uppercase tracking-widest font-bold text-gray-300 hover:text-white border border-brand-dark-border hover:border-gray-500 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-40"
              >
                {loading ? 'Frissítés…' : '↻ Frissítés'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNew((v) => !v);
                  setEditingId(null);
                }}
                className="gradient-red text-white text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
              >
                + Új
              </button>
            </div>
          </div>
          {description && (
            <p className="text-gray-500 text-xs mt-1">{description}</p>
          )}
          <p className="text-gray-500 text-xs mt-1">
            {items.length} elem a rendszerben
          </p>
        </header>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-200 rounded-lg px-4 py-3 text-sm">
            ⚠️ {error}
          </div>
        )}

        {showNew && (
          <section className="card-dark rounded-2xl p-6 space-y-3">
            <h2 className="text-white font-bold text-sm uppercase tracking-widest">
              Új elem létrehozása
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {fields.map((f) => (
                <FieldEditor
                  key={f.key}
                  field={f}
                  value={newDraft[f.key]}
                  onChange={(v) => setNewDraft({ ...newDraft, [f.key]: v })}
                />
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={createItem}
                disabled={busy === 'new'}
                className="gradient-red text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {busy === 'new' ? 'Létrehozás…' : 'Létrehozás'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNew(false);
                  setNewDraft({});
                }}
                className="text-xs uppercase tracking-widest text-gray-300 hover:text-white border border-brand-dark-border rounded-lg px-4 py-2"
              >
                Mégse
              </button>
            </div>
          </section>
        )}

        {items.length === 0 && !loading ? (
          <div className="card-dark rounded-2xl p-8 text-center text-gray-500 text-sm">
            Még nincs megjeleníthető elem. Kattints a &ldquo;+ Új&rdquo;
            gombra egy létrehozásához.
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => {
              const id = String(item.id);
              const isEditing = editingId === id;
              const rowBusy = busy === id;
              return (
                <li key={id} className="card-dark rounded-xl p-4">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {fields.map((f) => (
                          <FieldEditor
                            key={f.key}
                            field={f}
                            value={draft[f.key]}
                            onChange={(v) => setDraft({ ...draft, [f.key]: v })}
                          />
                        ))}
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={saveEdit}
                          disabled={rowBusy}
                          className="gradient-red text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
                        >
                          {rowBusy ? 'Mentés…' : 'Mentés'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="text-xs uppercase tracking-widest text-gray-300 hover:text-white border border-brand-dark-border rounded-lg px-4 py-2"
                        >
                          Mégse
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                        {fields.map((f) => (
                          <div key={f.key} className="text-sm">
                            <span className="text-[11px] uppercase tracking-widest text-gray-500 mr-2">
                              {f.label}:
                            </span>
                            {renderCell
                              ? renderCell(f.key, item[f.key], item)
                              : defaultCell(f, item[f.key])}
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-3 pt-3 border-t border-brand-dark-border">
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          className="text-xs uppercase tracking-widest font-bold text-gray-300 hover:text-white border border-brand-dark-border hover:border-gray-500 rounded-lg px-3 py-1.5 transition-colors"
                        >
                          Szerkesztés
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteItem(item)}
                          disabled={rowBusy}
                          className="text-xs uppercase tracking-widest text-red-300 hover:text-red-200 border border-red-900 hover:border-red-700 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-40"
                        >
                          {rowBusy ? 'Törlés…' : 'Törlés'}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}

function defaultCell(field: FieldDef, value: unknown): React.ReactNode {
  if (value === undefined || value === null || value === '') {
    return <span className="text-gray-600 italic">--</span>;
  }
  if (field.type === 'boolean') {
    return value ? <span className="text-emerald-400">✓ igen</span> : <span className="text-gray-500">nem</span>;
  }
  if (field.type === 'datetime' && typeof value === 'string') {
    return <span className="text-white">{new Date(value).toLocaleString('hu-HU')}</span>;
  }
  if (field.type === 'url' && typeof value === 'string') {
    return (
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        className="text-brand-gold hover:underline truncate inline-block max-w-[28rem]"
      >
        {value}
      </a>
    );
  }
  const str = String(value);
  return (
    <span className="text-white break-words">
      {str.length > 120 ? str.slice(0, 120) + '…' : str}
    </span>
  );
}

function FieldEditor({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const id = `f-${field.key}`;
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[11px] uppercase tracking-widest text-gray-400 mb-1"
      >
        {field.label}
        {field.required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {field.type === 'textarea' ? (
        <textarea
          id={id}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          placeholder={field.placeholder}
          rows={3}
          className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:border-brand-red focus:outline-none"
        />
      ) : field.type === 'select' ? (
        <select
          id={id}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-white focus:border-brand-red focus:outline-none"
        >
          <option value="">-- válassz --</option>
          {field.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : field.type === 'boolean' ? (
        <select
          id={id}
          value={value === true || value === 'true' ? 'true' : 'false'}
          onChange={(e) => onChange(e.target.value === 'true')}
          className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-white focus:border-brand-red focus:outline-none"
        >
          <option value="false">nem</option>
          <option value="true">igen</option>
        </select>
      ) : (
        <input
          id={id}
          type={field.type}
          value={value === undefined || value === null ? '' : String(value)}
          onChange={(e) =>
            onChange(
              field.type === 'number'
                ? e.target.value === ''
                  ? ''
                  : Number(e.target.value)
                : e.target.value
            )
          }
          required={field.required}
          placeholder={field.placeholder}
          className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:border-brand-red focus:outline-none"
        />
      )}
    </div>
  );
}