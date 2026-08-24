'use client';

/**
 * Client-side admin UI for live audience votes.
 *
 * Three blocks:
 *   1) Open new vote   -- pick question + options + duration, POST /open
 *   2) Current vote    -- close / extend (currently close-only), show options
 *   3) History         -- every archived vote, with result bars + delete
 *
 * On any mutation we re-fetch the whole list so the operator never has
 * to reload manually.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { sendGAEvent } from '@/components/GoogleAnalytics';

interface VoteOption {
  id: string;
  label: string;
}

interface Vote {
  id: string;
  question: string;
  options: VoteOption[];
  openedAt: number;
  closesAt: number;
  status: 'open' | 'closed';
  results?: Array<{ optionId: string; count: number }>;
}

interface ApiResponse {
  ok: true;
  current: Vote | null;
  history: Vote[];
}

const QUESTION_MAX = 200;
const LABEL_MAX = 140;
const DEFAULT_DURATION_SEC = 120;
const MAX_DURATION_SEC = 60 * 60;
const MIN_DURATION_SEC = 15;

function fmtTime(ms: number): string {
  return new Date(ms).toLocaleString('hu-HU');
}

function durationRemaining(vote: Vote): string {
  const ms = vote.closesAt - Date.now();
  if (ms <= 0) return 'lejart';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function VotesAdmin({ role }: { role: string }) {
  const [current, setCurrent] = useState<Vote | null>(null);
  const [history, setHistory] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [question, setQuestion] = useState('');
  const [duration, setDuration] = useState<number>(DEFAULT_DURATION_SEC);
  const [labels, setLabels] = useState<string[]>(['', '']);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/vote', { cache: 'no-store' });
      const body = (await res.json()) as ApiResponse | { ok: false; reason: string };
      if (!res.ok || !('ok' in body) || !body.ok) {
        setError(
          (body as { reason?: string }).reason ?? `HTTP ${res.status}`
        );
      } else {
        setCurrent(body.current);
        setHistory(body.history);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ismeretlen hiba');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Tick every 1s so the countdown updates while a vote is open.
  useEffect(() => {
    if (!current || current.status !== 'open') return;
    const t = setInterval(() => {
      // Force re-render -- we don't change state, but useState with a fresh
      // object would also work. The cleanest is to just bump a counter.
      setCurrent((v) => (v ? { ...v } : v));
    }, 1000);
    return () => clearInterval(t);
  }, [current?.id, current?.status]);

  const call = useCallback(
    async (action: 'open' | 'close' | 'delete', extra: Record<string, unknown> = {}) => {
      setBusy(action);
      setError(null);
      try {
        const res = await fetch('/api/admin/vote', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action, ...extra }),
        });
        const body = (await res.json()) as { ok: boolean; reason?: string };
        if (!res.ok || !body.ok) {
          setError(body.reason ?? `HTTP ${res.status}`);
        } else {
          await refresh();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ismeretlen hiba');
      } finally {
        setBusy(null);
      }
    },
    [refresh]
  );

  const totalVotes = useMemo(() => {
    if (!current?.results) return 0;
    return current.results.reduce((s, r) => s + r.count, 0);
  }, [current]);

  function onOpen(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = question.trim();
    if (!q) {
      setError('Adj meg kerdest.');
      return;
    }
    if (q.length > QUESTION_MAX) {
      setError(`A kerdes tul hosszu (max ${QUESTION_MAX} karakter).`);
      return;
    }
    const opts = labels
      .map((l) => l.trim().slice(0, LABEL_MAX))
      .filter(Boolean)
      .map((label) => ({ label }));
    if (opts.length === 0) {
      setError('Adj meg legalabb egy opciot.');
      return;
    }
    if (opts.length > 16) {
      setError('Maximum 16 opcio.');
      return;
    }
    const dur = Math.max(
      MIN_DURATION_SEC,
      Math.min(MAX_DURATION_SEC, Math.floor(duration || DEFAULT_DURATION_SEC))
    );
    sendGAEvent('vote_cast', { vote_action: 'open' });
    call('open', { question: q, options: opts, durationSec: dur }).then(() => {
      setQuestion('');
      setLabels(['', '']);
    });
  }

  function onCloseVote(id?: string) {
    if (!confirm('Biztos lezarod ezt a szavazast?')) return;
    sendGAEvent('vote_cast', { vote_action: 'close' });
    call('close', id ? { voteId: id } : {});
  }

  function onDelete(v: Vote) {
    if (!confirm(`Torlod a(z) "${v.question}" szavazast a historybol?`)) return;
    call('delete', { voteId: v.id });
  }

  return (
    <main className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        <header>
          <p className="text-brand-red text-sm uppercase tracking-widest font-semibold mb-1">
            Admin - Szavazasok
          </p>
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <h1
              className="text-3xl sm:text-4xl font-black text-white uppercase"
              style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
            >
              Kozonsegszavazasok
            </h1>
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="text-xs uppercase tracking-widest font-bold text-gray-300 hover:text-white border border-brand-dark-border hover:border-gray-500 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-40"
            >
              {loading ? 'Frissites...' : '? Frissites'}
            </button>
          </div>
          <p className="text-gray-500 text-xs mt-1">
            Bejelentkezve mint: {role} - {history.length} szavazas a historyban
          </p>
        </header>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-200 rounded-lg px-4 py-3 text-sm">
            ?? {error}
          </div>
        )}

        {/* ?? Open new vote ???????????????????????????????????????? */}
        <section className="card-dark rounded-2xl p-6">
          <h2 className="text-white font-bold text-sm uppercase tracking-widest mb-4">
            ??? Uj szavazas inditasa
          </h2>
          <form onSubmit={onOpen} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-400 mb-1">
                Kerdes
              </label>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                maxLength={QUESTION_MAX}
                required
                placeholder="Pl. Ki nyeri a fomeccset?"
                className="w-full bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:border-brand-red focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2">
                Opciok (2-16)
              </label>
              <div className="space-y-2">
                {labels.map((label, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={label}
                      onChange={(e) => {
                        const next = [...labels];
                        next[idx] = e.target.value;
                        setLabels(next);
                      }}
                      maxLength={LABEL_MAX}
                      placeholder={`Opcio ${idx + 1}`}
                      className="flex-1 bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:border-brand-red focus:outline-none"
                    />
                    {labels.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setLabels(labels.filter((_, i) => i !== idx))}
                        className="text-xs text-gray-400 hover:text-red-400 border border-brand-dark-border rounded-lg px-3"
                      >
                        ?
                      </button>
                    )}
                  </div>
                ))}
                {labels.length < 16 && (
                  <button
                    type="button"
                    onClick={() => setLabels([...labels, ''])}
                    className="text-xs uppercase tracking-widest text-gray-400 hover:text-white border border-dashed border-brand-dark-border rounded-lg px-3 py-1.5"
                  >
                    + Uj opcio
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-400 mb-1">
                  Idotartam (mp)
                </label>
                <input
                  type="number"
                  min={MIN_DURATION_SEC}
                  max={MAX_DURATION_SEC}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-32 bg-brand-dark border border-brand-dark-border rounded-lg px-3 py-2 text-white focus:border-brand-red focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={busy !== null}
                className="gradient-red text-white text-xs font-bold uppercase tracking-widest px-5 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {busy === 'open' ? 'Inditas...' : 'Szavazas inditasa'}
              </button>
            </div>
          </form>
        </section>

        {/* ?? Current vote ????????????????????????????????????????? */}
        <section className="card-dark rounded-2xl p-6">
          <h2 className="text-white font-bold text-sm uppercase tracking-widest mb-4">
            ?? Jelenlegi szavazas
          </h2>
          {!current ? (
            <p className="text-gray-500 text-sm">
              Jelenleg nincs aktiv szavazas.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-baseline justify-between flex-wrap gap-2">
                <p className="font-bold text-white">{current.question}</p>
                <span
                  className={`text-xs uppercase tracking-widest px-2 py-1 rounded ${
                    current.status === 'open'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  {current.status === 'open'
                    ? `Elo - ${durationRemaining(current)}`
                    : 'Lezart'}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {fmtTime(current.openedAt)} ? {fmtTime(current.closesAt)}
              </p>
              <ul className="space-y-1 mt-2">
                {current.options.map((opt) => {
                  const result = current.results?.find(
                    (r) => r.optionId === opt.id
                  );
                  const count = result?.count ?? 0;
                  const pct =
                    totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                  return (
                    <li
                      key={opt.id}
                      className="bg-brand-dark rounded-lg px-3 py-2 text-sm text-white"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span>{opt.label}</span>
                        <span className="text-xs text-gray-400">
                          {count} szavazat - {pct}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-brand-dark-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-red"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="flex gap-2 pt-3 border-t border-brand-dark-border">
                {current.status === 'open' && (
                  <button
                    type="button"
                    onClick={() => onCloseVote(current.id)}
                    disabled={busy !== null}
                    className="text-xs uppercase tracking-widest font-bold text-white bg-brand-red hover:opacity-90 rounded-lg px-4 py-2 disabled:opacity-40"
                  >
                    {busy === 'close' ? 'Lezaras...' : 'Lezaras'}
                  </button>
                )}
                <p className="text-xs text-gray-500 self-center">
                  Osszesen {totalVotes} szavazat
                </p>
              </div>
            </div>
          )}
        </section>

        {/* ?? History ??????????????????????????????????????????????? */}
        <section>
          <h2 className="text-white font-bold text-sm uppercase tracking-widest mb-3">
            ?? Szavazas history ({history.length})
          </h2>
          {history.length === 0 ? (
            <div className="card-dark rounded-2xl p-8 text-center text-gray-500 text-sm">
              Meg nincs lezart szavazas.
            </div>
          ) : (
            <ul className="space-y-3">
              {history.map((v) => {
                const total =
                  v.results?.reduce((s, r) => s + r.count, 0) ?? 0;
                return (
                  <li key={v.id} className="card-dark rounded-xl p-4">
                    <div className="flex items-baseline justify-between flex-wrap gap-2">
                      <p className="font-bold text-white">{v.question}</p>
                      <span
                        className={`text-[11px] uppercase tracking-widest px-2 py-0.5 rounded ${
                          v.status === 'open'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-700 text-gray-300'
                        }`}
                      >
                        {v.status === 'open' ? 'Elo' : 'Lezart'}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {fmtTime(v.openedAt)} ? {fmtTime(v.closesAt)} -{' '}
                      {v.options.length} opcio - {total} szavazat
                    </p>
                    <details className="mt-2">
                      <summary className="text-xs text-gray-400 cursor-pointer hover:text-white">
                        Eredmenyek megjelenitese
                      </summary>
                      <ul className="mt-2 space-y-1">
                        {v.options.map((opt) => {
                          const count =
                            v.results?.find((r) => r.optionId === opt.id)
                              ?.count ?? 0;
                          const pct =
                            total > 0
                              ? Math.round((count / total) * 100)
                              : 0;
                          return (
                            <li
                              key={opt.id}
                              className="bg-brand-dark rounded px-3 py-1.5 text-xs text-white flex justify-between"
                            >
                              <span>{opt.label}</span>
                              <span className="text-gray-400">
                                {count} - {pct}%
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </details>
                    {v.status === 'closed' && v.id !== current?.id && (
                      <div className="mt-3 text-right">
                        <button
                          type="button"
                          onClick={() => onDelete(v)}
                          disabled={busy !== null}
                          className="text-[11px] uppercase tracking-widest text-red-300 hover:text-red-200 border border-red-900 hover:border-red-700 rounded px-3 py-1 disabled:opacity-40"
                        >
                          Torles a historybol
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}