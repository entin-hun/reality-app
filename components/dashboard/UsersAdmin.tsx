'use client';

/**
 * Client component for /dashboard/users — add/change-role/remove
 * members of the email→role map.
 *
 * Calls the JSON endpoints under /api/admin/users. Reload the router
 * (revalidatePath in the route handlers) so the server list reflects
 * changes immediately.
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { RoleId } from '@/lib/db/kv-roles';

interface UserRow {
  email: string;
  role: RoleId;
}

interface RoleOption {
  id: RoleId;
  label: string;
  color: string;
}

interface Props {
  users: UserRow[];
  roles: RoleOption[];
  currentUserEmail: string | null;
}

export function UsersAdmin({ users, roles, currentUserEmail }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<RoleId>('Tartalomkeszito');
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // email being acted on

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!newEmail.includes('@')) {
      setFormError('Adj meg egy érvényes email címet.');
      return;
    }
    setBusy('__add__');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: newEmail, role: newRole }),
      });
      const data = (await res.json()) as { ok: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setFormError(
          data.message === 'invalid_email'
            ? 'Érvénytelen email cím.'
            : data.message === 'invalid_role'
              ? 'Érvénytelen szerepkör.'
              : 'Mentés sikertelen.'
        );
        return;
      }
      setNewEmail('');
      setNewRole('Tartalomkeszito');
      startTransition(() => router.refresh());
    } finally {
      setBusy(null);
    }
  }

  async function handleRoleChange(email: string, role: RoleId) {
    setBusy(email);
    try {
      const res = await fetch(
        `/api/admin/users/${encodeURIComponent(email)}`,
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ role }),
        }
      );
      const data = (await res.json()) as { ok: boolean; message?: string };
      if (!res.ok || !data.ok) {
        alert(
          data.message === 'last_admin_protected'
            ? 'Az utolsó Rendszeradminisztrátort nem lehet leváltani.'
            : 'Módosítás sikertelen.'
        );
      }
      startTransition(() => router.refresh());
    } finally {
      setBusy(null);
    }
  }

  async function handleRemove(email: string) {
    if (
      !window.confirm(
        `Biztosan törlöd ${email} hozzáférését? A felhasználó ki lesz jelentkeztetve.`
      )
    ) {
      return;
    }
    setBusy(email);
    try {
      const res = await fetch(
        `/api/admin/users/${encodeURIComponent(email)}`,
        { method: 'DELETE' }
      );
      const data = (await res.json()) as { ok: boolean; message?: string };
      if (!res.ok || !data.ok) {
        alert(
          data.message === 'last_admin_protected'
            ? 'Az utolsó Rendszeradminisztrátort nem lehet törölni.'
            : 'Törlés sikertelen.'
        );
      }
      startTransition(() => router.refresh());
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Add form */}
      <section className="card-dark rounded-2xl p-6">
        <h2 className="text-sm uppercase tracking-widest text-gray-500 font-bold mb-4">
          Új felhasználó hozzáadása
        </h2>
        <form
          onSubmit={handleAdd}
          className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3"
        >
          <input
            type="email"
            required
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="kolléga@példa.hu"
            className="rounded-lg border border-brand-dark-border bg-brand-dark-muted px-4 py-2.5 text-white placeholder:text-gray-600 focus:border-brand-red focus:outline-none transition-colors"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as RoleId)}
            className="rounded-lg border border-brand-dark-border bg-brand-dark-muted px-3 py-2.5 text-white focus:border-brand-red focus:outline-none transition-colors"
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={busy === '__add__'}
            className="rounded-lg bg-brand-red hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-500 px-5 py-2.5 font-bold uppercase tracking-wider text-white transition-colors"
          >
            {busy === '__add__' ? 'Hozzáadás…' : 'Hozzáadás'}
          </button>
        </form>
        {formError && (
          <p className="mt-3 text-sm text-brand-red">{formError}</p>
        )}
        <p className="mt-3 text-xs text-gray-500">
          A felhasználó a következő belépéskor emailben kap egy 15 perces
          belépési linket.
        </p>
      </section>

      {/* User list */}
      <section className="card-dark rounded-2xl p-6">
        <h2 className="text-sm uppercase tracking-widest text-gray-500 font-bold mb-4">
          Jelenlegi felhasználók ({users.length})
        </h2>
        {users.length === 0 ? (
          <p className="text-sm text-gray-500">
            Még nincs felhasználó a rendszerben. Adj hozzá valakit fent.
          </p>
        ) : (
          <ul className="divide-y divide-brand-dark-border">
            {users.map((u) => {
              const role = roles.find((r) => r.id === u.role);
              const isSelf = u.email === currentUserEmail;
              return (
                <li
                  key={u.email}
                  className="py-3 flex flex-wrap items-center gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`${role?.color ?? 'bg-gray-500'} w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0`}
                    >
                      {u.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-semibold truncate">
                        {u.email}
                        {isSelf && (
                          <span className="ms-2 text-[10px] uppercase tracking-widest text-brand-gold">
                            te
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">{role?.label}</p>
                    </div>
                  </div>

                  <select
                    value={u.role}
                    onChange={(e) =>
                      handleRoleChange(u.email, e.target.value as RoleId)
                    }
                    disabled={busy === u.email}
                    className="rounded-lg border border-brand-dark-border bg-brand-dark-muted px-2.5 py-1.5 text-xs text-white focus:border-brand-red focus:outline-none"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => handleRemove(u.email)}
                    disabled={busy === u.email}
                    title="Eltávolítás"
                    className="rounded-lg border border-brand-dark-border hover:border-brand-red hover:text-brand-red text-gray-400 px-2.5 py-1.5 text-xs transition-colors disabled:opacity-50"
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {pending && (
        <p className="text-[10px] uppercase tracking-widest text-gray-600 text-center">
          Frissítés…
        </p>
      )}
    </div>
  );
}
