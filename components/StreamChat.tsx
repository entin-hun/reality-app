'use client';

/**
 * StreamChat — overlay chat panel next to the /watch stream.
 *
 * Responsibilities:
 *   - Poll /api/chat every 4s for new messages + the active vote.
 *   - Render the message list with role-coloured badges.
 *   - Render the active vote (if any) at the top with a Cast button
 *     per option.
 *   - Show an admin-only "Jelölés szavazásra" button next to each
 *     message when a vote is open.
 *   - Collapsible on mobile; expanded by default on desktop.
 *   - Hidden entirely when the chat feature flag is disabled (so the
 *     panel can be toggled off without a deploy).
 *
 * Auth model:
 *   - Logged-out visitors see a login CTA instead of the composer.
 *   - Logged-in staff (any of the 6 contract roles) can post.
 *   - Rendszeradminisztrator / Producer can mark messages + open/close
 *     votes from the panel itself (single-click controls).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Turnstile,
  type TurnstileHandle,
} from '@/components/Turnstile';

interface ChatMessage {
  id: string;
  email: string;
  userName: string;
  userRole: string;
  text: string;
  createdAt: number;
  hidden?: boolean;
  voteOption?: {
    voteId: string;
    optionId: string;
    label: string;
  };
}

interface VoteOption {
  id: string;
  label: string;
  messageId?: string;
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

interface ChatSnapshot {
  ok: true;
  enabled: boolean;
  messages: ChatMessage[];
  vote: Vote | null;
}

interface MeResponse {
  authenticated: boolean;
  email?: string;
  role?: string;
  reason?: string;
}

const POLL_MS = 4_000;

function formatTime(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, '0')}`;
}

const ROLE_BADGE: Record<string, { label: string; color: string }> = {
  Rendszeradminisztrator: { label: 'Admin', color: 'bg-red-600' },
  Producer: { label: 'Producer', color: 'bg-amber-500' },
  'Reality szerkeszto': { label: 'Reality', color: 'bg-fuchsia-600' },
  Tartalomkeszito: { label: 'Tartalom', color: 'bg-blue-600' },
  Marketing: { label: 'Marketing', color: 'bg-emerald-600' },
  Moderator: { label: 'Moderator', color: 'bg-slate-600' },
};

function roleBadge(role: string): { label: string; color: string } {
  return (
    ROLE_BADGE[role] ?? { label: role || 'Staff', color: 'bg-zinc-700' }
  );
}

interface StreamChatProps {
  /** Logged-in flag from the parent page (faster initial render). */
  initialAuthenticated?: boolean;
  /** Turnstile site key — if undefined, the widget is omitted (dev/CI). */
  turnstileSiteKey?: string;
}

export function StreamChat({
  initialAuthenticated,
  turnstileSiteKey,
}: StreamChatProps) {
  const [snapshot, setSnapshot] = useState<ChatSnapshot | null>(null);
  const [me, setMe] = useState<MeResponse>({
    authenticated: !!initialAuthenticated,
  });
  // Start collapsed on small screens so the player stays usable; expanded
  // by default on desktop.
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(min-width: 768px)');
    if (mql.matches) setOpen(true);
    const onChange = (e: MediaQueryListEvent) => setOpen(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const turnstileRef = useRef<TurnstileHandle>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isAdmin = me.authenticated &&
    (me.role === 'Rendszeradminisztrator' || me.role === 'Producer');

  // Poll the snapshot.
  const refresh = useCallback(async () => {
    try {
      const [chatRes, meRes] = await Promise.all([
        fetch('/api/chat', { cache: 'no-store' }),
        fetch('/api/auth/me', { cache: 'no-store' }),
      ]);
      if (chatRes.ok) {
        const data = (await chatRes.json()) as ChatSnapshot;
        setSnapshot(data);
      }
      if (meRes.ok) {
        const data = (await meRes.json()) as MeResponse;
        setMe(data);
      }
    } catch {
      // network blip; ignore
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => {
      void refresh();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  // Tick once per second while a vote is open to drive the countdown.
  useEffect(() => {
    const vote = snapshot?.vote;
    if (!vote || vote.status !== 'open') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [snapshot?.vote]);

  // Auto-scroll to the latest message (only when the user is at the
  // bottom — otherwise the panel feels jumpy while they're reading).
  useEffect(() => {
    const el = messagesEndRef.current;
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;
    const slack = 80;
    const atBottom =
      parent.scrollHeight - parent.scrollTop - parent.clientHeight < slack;
    if (atBottom) {
      el.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [snapshot?.messages?.length]);

  const submit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const text = draft.trim();
      if (!text) return;
      setError(null);
      setSending(true);
      try {
        const turnstileToken =
          turnstileRef.current?.getToken() ?? null;
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, turnstileToken }),
        });
        const data = await res.json();
        if (!res.ok || !data?.ok) {
          setError(data?.reason || 'send-failed');
          turnstileRef.current?.reset();
          return;
        }
        setDraft('');
        turnstileRef.current?.reset();
        await refresh();
      } catch {
        setError('network');
      } finally {
        setSending(false);
      }
    },
    [draft, refresh]
  );

  const markForVote = useCallback(
    async (messageId: string) => {
      try {
        const res = await fetch('/api/admin/chat/mark-for-vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data?.reason || 'mark-failed');
          return;
        }
        await refresh();
      } catch {
        setError('network');
      }
    },
    [refresh]
  );

  const castVote = useCallback(
    async (voteId: string, optionId: string) => {
      try {
        const res = await fetch('/api/vote/cast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voteId, optionId }),
        });
        const data = await res.json();
        if (!res.ok || !data?.ok) {
          setError(data?.reason || 'cast-failed');
          return;
        }
        await refresh();
      } catch {
        setError('network');
      }
    },
    [refresh]
  );

  const openVote = useCallback(
    async (question: string, durationSec: number) => {
      try {
        const res = await fetch('/api/admin/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'open',
            question,
            durationSec,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data?.ok) {
          setError(data?.reason || 'open-failed');
          return;
        }
        await refresh();
      } catch {
        setError('network');
      }
    },
    [refresh]
  );

  const closeVote = useCallback(
    async (voteId: string) => {
      try {
        const res = await fetch('/api/admin/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'close', voteId }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data?.reason || 'close-failed');
          return;
        }
        await refresh();
      } catch {
        setError('network');
      }
    },
    [refresh]
  );

  // Build a lookup from optionId → tally once a vote is closed (results
  // are snapshotted onto the vote record).
  const closedTally = useMemo(() => {
    const v = snapshot?.vote;
    if (!v || v.status !== 'closed' || !v.results) return null;
    const map: Record<string, number> = {};
    for (const r of v.results) map[r.optionId] = r.count;
    return map;
  }, [snapshot?.vote]);

  if (snapshot && snapshot.enabled === false) {
    // Chat is admin-disabled — show nothing.
    return null;
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-3 right-3 z-40 bg-black/70 hover:bg-black/90 text-white text-xs px-3 py-2 rounded-md backdrop-blur-sm border border-white/15"
        aria-label="Chat megnyitása"
      >
        💬 Chat
      </button>
    );
  }

  const vote = snapshot?.vote ?? null;
  const messages = snapshot?.messages ?? [];
  const voteIsOpen = vote?.status === 'open';
  const voteIsClosed = vote?.status === 'closed';

  return (
    <div
      className="fixed top-3 right-3 bottom-3 z-40 w-[min(360px,calc(100vw-1.5rem))] flex flex-col bg-black/85 backdrop-blur-md rounded-lg border border-white/10 text-white shadow-2xl"
      data-testid="stream-chat"
      role="region"
      aria-label="Élő chat"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span aria-hidden>💬</span>
          <span className="text-xs uppercase tracking-widest font-semibold">
            Élő chat
          </span>
          {me.authenticated && me.role && (
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded ${roleBadge(me.role).color}`}
            >
              {roleBadge(me.role).label}
            </span>
          )}
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-white/60 hover:text-white text-xs"
          aria-label="Chat összecsukása"
        >
          ✕
        </button>
      </div>

      {/* Active vote banner */}
      {vote && (
        <VoteBanner
          vote={vote}
          now={now}
          isAdmin={!!isAdmin}
          closedTally={closedTally}
          onCast={(optionId) => castVote(vote.id, optionId)}
          onClose={() => closeVote(vote.id)}
        />
      )}

      {/* Admin: open a new vote (only when no vote exists at all) */}
      {isAdmin && !vote && (
        <AdminOpenVote onOpen={(q, d) => openVote(q, d)} />
      )}

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-3 py-2 space-y-2 text-sm"
        data-testid="chat-messages"
      >
        {messages.length === 0 && (
          <div className="text-white/40 text-xs italic text-center py-6">
            Még nincs üzenet. Légy te az első!
          </div>
        )}
        {messages.map((m) => (
          <MessageRow
            key={m.id}
            message={m}
            voteIsOpen={!!voteIsOpen}
            isAdmin={!!isAdmin}
            onMark={() => markForVote(m.id)}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer / login CTA */}
      <div className="border-t border-white/10 px-3 py-2">
        {!me.authenticated ? (
          <a
            href="/admin-login"
            className="block text-center text-xs bg-white/10 hover:bg-white/20 rounded-md py-2"
          >
            Jelentkezz be az élő chathez →
          </a>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-1.5">
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Üzenet… (Enter = küldés, Shift+Enter = új sor)"
                rows={1}
                maxLength={280}
                className="flex-1 resize-none bg-white/10 border border-white/15 rounded-md px-2 py-1.5 text-sm placeholder-white/40 focus:outline-none focus:border-white/40"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void submit();
                  }
                }}
                disabled={sending}
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="bg-red-600 hover:bg-red-700 disabled:bg-red-900 disabled:text-white/50 text-white text-xs px-3 py-2 rounded-md font-semibold"
              >
                {sending ? '…' : 'Küld'}
              </button>
            </div>
            <div className="flex items-center justify-between text-[10px] text-white/40">
              <span>{draft.length}/280</span>
              {error && (
                <span className="text-red-400" role="alert">
                  {errorMessage(error)}
                </span>
              )}
            </div>
            <Turnstile
              ref={turnstileRef}
              siteKey={turnstileSiteKey}
            />
          </form>
        )}
      </div>
    </div>
  );
}

function MessageRow({
  message,
  voteIsOpen,
  isAdmin,
  onMark,
}: {
  message: ChatMessage;
  voteIsOpen: boolean;
  isAdmin: boolean;
  onMark: () => void;
}) {
  const badge = roleBadge(message.userRole);
  return (
    <div
      className="flex flex-col gap-0.5 leading-snug"
      data-testid="chat-message"
    >
      <div className="flex items-baseline gap-1.5 text-[10px] text-white/60">
        <span
          className={`px-1.5 py-0.5 rounded ${badge.color} text-white text-[9px] uppercase tracking-wide font-bold`}
        >
          {badge.label}
        </span>
        <span className="font-semibold text-white/80">
          {message.userName}
        </span>
        <span aria-hidden>·</span>
        <span>{formatTime(message.createdAt)}</span>
        {message.voteOption && (
          <span
            className="ml-auto px-1.5 py-0.5 rounded bg-amber-500 text-black text-[9px] font-bold"
            title="Ez az üzenet szavazási opció"
          >
            🗳 Szavazás
          </span>
        )}
      </div>
      <div className="text-white/95 whitespace-pre-wrap break-words">
        {message.text}
      </div>
      {isAdmin && voteIsOpen && !message.voteOption && (
        <button
          onClick={onMark}
          className="self-start text-[10px] text-amber-300 hover:text-amber-200 mt-0.5"
          title="Megjelölés szavazási opciónak"
        >
          + Jelölés szavazásra
        </button>
      )}
    </div>
  );
}

function VoteBanner({
  vote,
  now,
  isAdmin,
  closedTally,
  onCast,
  onClose,
}: {
  vote: Vote;
  now: number;
  isAdmin: boolean;
  closedTally: Record<string, number> | null;
  onCast: (optionId: string) => void;
  onClose: () => void;
}) {
  if (vote.status === 'open') {
    const remaining = vote.closesAt - now;
    return (
      <div
        className="border-b border-amber-500/30 bg-amber-500/10 px-3 py-2"
        data-testid="vote-banner"
      >
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="text-[10px] uppercase tracking-widest text-amber-300 font-bold">
            🗳 Szavazás · {formatCountdown(remaining)}
          </div>
          {isAdmin && (
            <button
              onClick={onClose}
              className="text-[10px] text-amber-200 hover:text-white"
            >
              Lezárás
            </button>
          )}
        </div>
        <div className="text-sm font-semibold mb-2">{vote.question}</div>
        <div className="space-y-1.5">
          {vote.options.length === 0 && (
            <div className="text-[11px] text-white/50 italic">
              Még nincs opció. Az adminok chat-üzenetekből jelölhetnek.
            </div>
          )}
          {vote.options.map((o) => (
            <button
              key={o.id}
              onClick={() => onCast(o.id)}
              className="w-full text-left text-xs bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded px-2 py-1.5"
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Closed
  const total = closedTally
    ? Object.values(closedTally).reduce((a, b) => a + b, 0)
    : 0;
  const winnerCount = closedTally
    ? Math.max(0, ...Object.values(closedTally))
    : 0;
  return (
    <div
      className="border-b border-white/10 bg-white/5 px-3 py-2"
      data-testid="vote-banner-closed"
    >
      <div className="text-[10px] uppercase tracking-widest text-white/50 font-bold mb-0.5">
        Szavazás lezárva · {total} szavazat
      </div>
      <div className="text-sm font-semibold mb-2">{vote.question}</div>
      <div className="space-y-1.5">
        {vote.options.map((o) => {
          const count = closedTally?.[o.id] ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const isWinner = count > 0 && count === winnerCount;
          return (
            <div
              key={o.id}
              className="text-xs bg-black/40 border border-white/10 rounded px-2 py-1.5"
            >
              <div className="flex items-baseline justify-between">
                <span className={isWinner ? 'font-bold text-amber-300' : ''}>
                  {o.label}
                </span>
                <span className="text-white/60 tabular-nums">
                  {count} · {pct}%
                </span>
              </div>
              <div className="mt-1 h-1 bg-white/10 rounded overflow-hidden">
                <div
                  className={`h-full ${isWinner ? 'bg-amber-400' : 'bg-white/40'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdminOpenVote({
  onOpen,
}: {
  onOpen: (question: string, durationSec: number) => void;
}) {
  const [question, setQuestion] = useState('');
  const [duration, setDuration] = useState(120);
  const [busy, setBusy] = useState(false);
  return (
    <details className="border-b border-white/10 px-3 py-2">
      <summary className="text-[10px] uppercase tracking-widest text-white/50 cursor-pointer hover:text-white">
        + Új szavazás indítása (admin)
      </summary>
      <form
        className="mt-2 flex flex-col gap-1.5"
        onSubmit={async (e) => {
          e.preventDefault();
          const q = question.trim();
          if (!q) return;
          setBusy(true);
          try {
            await onOpen(q, duration);
            setQuestion('');
          } finally {
            setBusy(false);
          }
        }}
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Kérdés…"
          maxLength={200}
          className="bg-white/10 border border-white/15 rounded px-2 py-1.5 text-sm placeholder-white/40 focus:outline-none focus:border-white/40"
        />
        <div className="flex items-center gap-2 text-xs text-white/70">
          <label>Hossz:</label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="bg-white/10 border border-white/15 rounded px-1 py-0.5"
          >
            <option value={30}>30s</option>
            <option value={60}>1p</option>
            <option value={120}>2p</option>
            <option value={300}>5p</option>
            <option value={900}>15p</option>
          </select>
          <button
            type="submit"
            disabled={busy || !question.trim()}
            className="ml-auto bg-amber-500 hover:bg-amber-600 disabled:bg-amber-900 disabled:text-white/50 text-black text-xs px-3 py-1 rounded font-bold"
          >
            {busy ? '…' : 'Indít'}
          </button>
        </div>
      </form>
    </details>
  );
}

function errorMessage(reason: string): string {
  switch (reason) {
    case 'empty':
      return 'Üres üzenet';
    case 'too-long':
      return 'Túl hosszú (max 280)';
    case 'rate-limit':
      return 'Várj 5 másodpercet';
    case 'chat-disabled':
      return 'A chat jelenleg zárva';
    case 'turnstile-failed':
      return 'Bot-ellenőrzés sikertelen';
    case 'duplicate':
    case 'already-voted':
      return 'Már szavaztál';
    case 'closed':
      return 'A szavazás lezárult';
    case 'unknown-option':
      return 'Ismeretlen opció';
    case 'no-vote':
      return 'Nincs aktív szavazás';
    case 'no-active-vote':
      return 'Nincs aktív szavazás';
    case 'network':
      return 'Hálózati hiba';
    case 'forbidden':
      return 'Nincs jogosultság';
    case 'unauthenticated':
      return 'Jelentkezz be';
    default:
      return reason;
  }
}
