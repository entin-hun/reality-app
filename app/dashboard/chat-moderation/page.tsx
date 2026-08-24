'use client';

/**
 * Chat moderáció — list recent chat messages and toggle chat status / hide.
 *
 * The chat itself lives on /watch; this dashboard view is just the
 * moderation surface for Producers + Rendszeradminisztrátor.
 */

import { useCallback, useEffect, useState } from 'react';

interface ChatMessage {
  id: string;
  email: string;
  userName: string;
  userRole: string;
  text: string;
  createdAt: number;
  hidden?: boolean;
  voteOption?: { voteId: string; optionId: string; label: string };
}

interface ChatSnapshot {
  ok: true;
  enabled: boolean;
  messages: ChatMessage[];
  vote: unknown;
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleString();
}

const ROLE_LABEL: Record<string, string> = {
  Rendszeradminisztrator: 'Admin',
  Producer: 'Producer',
  'Reality szerkeszto': 'Reality',
  Tartalomkeszito: 'Tartalom',
  Marketing: 'Marketing',
  Moderator: 'Moderator',
};

export default function ChatModerationPage() {
  const [snapshot, setSnapshot] = useState<ChatSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/chat', { cache: 'no-store' });
      if (!res.ok) {
        setError('snapshot-failed');
        return;
      }
      setSnapshot(await res.json());
    } catch {
      setError('network');
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(refresh, 6_000);
    return () => clearInterval(id);
  }, [refresh]);

  const toggleStatus = useCallback(async () => {
    if (!snapshot) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/chat/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle',
          enabled: !snapshot.enabled,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.reason || 'toggle-failed');
        return;
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [snapshot, refresh]);

  const hide = useCallback(
    async (msgId: string, hidden: boolean) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch('/api/admin/chat/moderate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'hide', messageId: msgId, hidden }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data?.reason || 'hide-failed');
          return;
        }
        await refresh();
      } finally {
        setBusy(false);
      }
    },
    [refresh]
  );

  if (!snapshot) {
    return (
      <div className="p-6 text-white/60 text-sm">Betöltés…</div>
    );
  }

  const messages = [...snapshot.messages].sort(
    (a, b) => b.createdAt - a.createdAt
  );

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Chat moderáció</h1>
          <p className="text-sm text-white/60">
            A /watch oldalon futó élő chat felügyelete.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-xs px-2 py-1 rounded ${
              snapshot.enabled
                ? 'bg-emerald-600/20 text-emerald-300'
                : 'bg-red-600/20 text-red-300'
            }`}
          >
            {snapshot.enabled ? 'Chat aktív' : 'Chat zárva'}
          </span>
          <button
            onClick={toggleStatus}
            disabled={busy}
            className="text-xs bg-white/10 hover:bg-white/20 disabled:opacity-50 rounded px-3 py-1.5"
          >
            {snapshot.enabled ? 'Chat zárása' : 'Chat megnyitása'}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-300 mb-3" role="alert">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {messages.length === 0 && (
          <div className="text-white/40 italic text-sm py-6 text-center">
            Még nincs chat üzenet.
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded border p-3 text-sm ${
              m.hidden
                ? 'border-red-700/40 bg-red-950/30 opacity-60'
                : 'border-white/10 bg-white/5'
            }`}
          >
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 text-xs text-white/60">
                <span className="bg-white/10 px-1.5 py-0.5 rounded">
                  {ROLE_LABEL[m.userRole] ?? m.userRole}
                </span>
                <span className="font-semibold text-white/80">
                  {m.userName}
                </span>
                <span>{m.email}</span>
                <span aria-hidden>·</span>
                <span>{formatTime(m.createdAt)}</span>
                {m.voteOption && (
                  <span className="bg-amber-500 text-black px-1.5 py-0.5 rounded text-[9px] font-bold">
                    🗳 Szavazás
                  </span>
                )}
                {m.hidden && (
                  <span className="bg-red-600 text-white px-1.5 py-0.5 rounded text-[9px] font-bold">
                    REJTETT
                  </span>
                )}
              </div>
              <button
                onClick={() => hide(m.id, !m.hidden)}
                disabled={busy}
                className="text-xs text-white/60 hover:text-white"
              >
                {m.hidden ? 'Visszaállítás' : 'Elrejtés'}
              </button>
            </div>
            <div className="whitespace-pre-wrap break-words">{m.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
