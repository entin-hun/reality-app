/**
 * /dashboard/system-settings — diagnostic dashboard for environment
 * bindings and infra health. Does NOT expose secrets. Safe for any
 * staff role to view.
 *
 *   - KV bindings: AUTH_KV, APPLICATIONS_KV (presence only)
 *   - GA4 wiring: NEXT_PUBLIC_GA_MEASUREMENT_ID
 *   - Stripe wiring: STRIPE_SECRET_KEY (truncated), NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
 *   - Cloudflare Turnstile keys (truncated)
 *   - Build SHA / commit (read from BUILD_ID or header)
 */

import { currentRole } from '@/lib/auth/dev-role';
import { Forbidden } from '../components/Forbidden';
import { isKvAvailable } from '@/lib/db/kv';

export const dynamic = 'force-dynamic';

interface ConfigRow {
  label: string;
  value: string;
  status?: 'ok' | 'warn' | 'missing';
}

function truncate(s: string, head = 6, tail = 4): string {
  if (s.length <= head + tail + 3) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

function statusFor(value: string | undefined): 'ok' | 'warn' | 'missing' {
  if (!value) return 'missing';
  if (value.startsWith('****')) return 'warn';
  return 'ok';
}

const STATUS_STYLES: Record<'ok' | 'warn' | 'missing', string> = {
  ok: 'bg-emerald-900/30 text-emerald-300 border-emerald-800',
  warn: 'bg-amber-900/30 text-amber-300 border-amber-800',
  missing: 'bg-red-900/30 text-red-300 border-red-800',
};

const STATUS_LABELS: Record<'ok' | 'warn' | 'missing', string> = {
  ok: 'rendben',
  warn: 'figyelem',
  missing: 'hiányzik',
};

export default async function SystemSettingsPage() {
  const role = await currentRole();
  if (role === 'guest') {
    return (
      <Forbidden message="A rendszerbeállítások megtekintéséhez staff bejelentkezés szükséges." />
    );
  }

  // We only show truncated values — never full secrets.
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? '';
  const stripeSecret = process.env.STRIPE_SECRET_KEY ?? '';
  const stripePub = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY ?? '';
  const turnstileSite = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';
  const authSecret = process.env.AUTH_SECRET ?? '';

  const kvAuthBound = !!process.env.AUTH_KV || !!(globalThis as { __env__?: { AUTH_KV?: unknown } }).__env__?.AUTH_KV;
  const kvAppsBound = isKvAvailable();

  const sections: Array<{ title: string; icon: string; rows: ConfigRow[] }> = [
    {
      title: 'Cloudflare kötések',
      icon: '🌀',
      rows: [
        { label: 'AUTH_KV (kv-roles.ts)', value: kvAuthBound ? '✓ bound' : '✗ hiányzik', status: kvAuthBound ? 'ok' : 'missing' },
        { label: 'APPLICATIONS_KV (cms / applications / audit)', value: kvAppsBound ? '✓ bound' : '✗ hiányzik', status: kvAppsBound ? 'ok' : 'missing' },
      ],
    },
    {
      title: 'Google Analytics 4',
      icon: '📊',
      rows: [
        { label: 'NEXT_PUBLIC_GA_MEASUREMENT_ID', value: gaId || '—', status: statusFor(gaId) },
      ],
    },
    {
      title: 'Stripe fizetés',
      icon: '💳',
      rows: [
        { label: 'STRIPE_SECRET_KEY', value: stripeSecret ? truncate(stripeSecret) : '—', status: statusFor(stripeSecret) },
        { label: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', value: stripePub ? truncate(stripePub) : '—', status: statusFor(stripePub) },
      ],
    },
    {
      title: 'Cloudflare Turnstile',
      icon: '🛡️',
      rows: [
        { label: 'TURNSTILE_SECRET_KEY', value: turnstileSecret ? truncate(turnstileSecret) : '—', status: statusFor(turnstileSecret) },
        { label: 'NEXT_PUBLIC_TURNSTILE_SITE_KEY', value: turnstileSite ? truncate(turnstileSite) : '—', status: statusFor(turnstileSite) },
      ],
    },
    {
      title: 'Auth',
      icon: '🔑',
      rows: [
        { label: 'AUTH_SECRET', value: authSecret ? `len=${authSecret.length}` : '—', status: statusFor(authSecret) },
      ],
    },
  ];

  return (
    <main className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <header>
          <p className="text-brand-red text-sm uppercase tracking-widest font-semibold mb-1">
            Admin
          </p>
          <h1
            className="text-3xl sm:text-4xl font-black text-white uppercase"
            style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
          >
            ⚙️ Rendszerbeállítások
          </h1>
          <p className="text-gray-500 text-xs mt-1">
            Diagnosztikai áttekintés · titkok maszkolva · read-only
          </p>
        </header>

        {sections.map((s) => (
          <section key={s.title} className="card-dark rounded-2xl p-5">
            <h2 className="text-white font-bold text-base mb-3">
              {s.icon} {s.title}
            </h2>
            <table className="w-full text-sm">
              <tbody>
                {s.rows.map((row) => {
                  const st = row.status ?? 'ok';
                  return (
                    <tr key={row.label} className="border-t border-brand-dark-border">
                      <td className="py-2 pr-4 text-gray-400 font-mono text-xs align-top w-1/2">
                        {row.label}
                      </td>
                      <td className="py-2 pr-3 text-white break-all align-top">{row.value}</td>
                      <td className="py-2 text-right align-top">
                        <span
                          className={`text-[10px] uppercase tracking-widest font-bold border rounded-md px-2 py-0.5 ${STATUS_STYLES[st]}`}
                        >
                          {STATUS_LABELS[st]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        ))}

        <p className="text-gray-500 text-xs">
          A titkok csonkítva jelennek meg (első 6 + utolsó 4 karakter). Teljes
          értékek kiolvasása kizárólag Cloudflare Dashboard → Workers → Secrets
          felületen lehetséges.
        </p>
      </div>
    </main>
  );
}
