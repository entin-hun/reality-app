import { headers } from 'next/headers';
import Link from 'next/link';
import { store, type ApplicationRecord, type ApplicationStatus } from '@/lib/db';
import { email } from '@/lib/email';
import { currentRole } from '@/lib/auth/dev-role';

export const dynamic = 'force-dynamic'; // always render fresh from disk

const STATUS_LABEL_HU: Record<ApplicationStatus, string> = {
  new: 'Új',
  contacted: 'Kapcsolatfelvétel',
  approved: 'Jóváhagyott',
  rejected: 'Elutasított',
};

const STATUS_COLOR: Record<ApplicationStatus, string> = {
  new: 'bg-brand-red text-white',
  contacted: 'bg-brand-gold text-black',
  approved: 'bg-emerald-500 text-black',
  rejected: 'bg-gray-700 text-gray-200',
};

interface PageProps {
  searchParams: Promise<{ status?: string; id?: string }>;
}

/**
 * Admin triage queue for Applications. Today a basic read-only list with
 * "view detail" + "mark status" form actions. L6 (admin CRUD) will
 * consolidate this view into a richer UI; the data shape stays the same.
 */
export default async function AdminApplicationsPage({ searchParams }: PageProps) {
  const role = await currentRole();
  if (
    role !== 'Rendszeradminisztrator' &&
    role !== 'Producer' &&
    role !== 'Reality szerkeszto'
  ) {
    return <Forbidden />;
  }

  const sp = await searchParams;
  const selectedStatus =
    sp.status && ['new', 'contacted', 'approved', 'rejected'].includes(sp.status)
      ? (sp.status as ApplicationStatus)
      : undefined;
  const selectedId = sp.id;

  const items = await store.list(selectedStatus ? { status: selectedStatus } : undefined);
  const selected = selectedId ? await store.get(selectedId) : null;
  const recentEmails = await email.recent(10);

  return (
    <main className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex items-baseline justify-between flex-wrap gap-4">
          <div>
            <p className="text-brand-red text-sm uppercase tracking-widest font-semibold mb-1">
              Admin
            </p>
            <h1
              className="text-3xl sm:text-4xl font-black text-white uppercase"
              style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
            >
              Harcos-jelentkezések
            </h1>
            <p className="text-gray-500 text-xs mt-1">
              Bejelentkezve mint: {role} · {items.length} db megjelenítve
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <FilterChip status={undefined} current={selectedStatus} label="Mind" />
            <FilterChip status="new" current={selectedStatus} label="Újak" />
            <FilterChip status="contacted" current={selectedStatus} label="Kapcsolat" />
            <FilterChip status="approved" current={selectedStatus} label="Jóváhagyott" />
            <FilterChip status="rejected" current={selectedStatus} label="Elutasított" />
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-1 space-y-3 max-h-[80vh] overflow-y-auto pr-1">
            {items.length === 0 && (
              <p className="text-gray-500 text-sm">Nincs megjeleníthető jelentkezés.</p>
            )}
            {items.map((it) => (
              <ApplicationRow
                key={it.id}
                item={it}
                active={selectedId === it.id}
              />
            ))}
          </section>

          <section className="lg:col-span-2">
            {selected ? (
              <ApplicationDetail item={selected} />
            ) : (
              <div className="card-dark rounded-2xl p-8 text-center text-gray-500 text-sm">
                Válassz egy jelentkezést a bal oldali listából.
              </div>
            )}

            <div className="card-dark rounded-2xl p-6 mt-6">
              <h2 className="text-white font-bold text-sm uppercase tracking-widest mb-4">
                Utolsó 10 kimenő email
              </h2>
              {recentEmails.length === 0 ? (
                <p className="text-gray-500 text-xs">Még nem ment ki email.</p>
              ) : (
                <ul className="text-xs space-y-2">
                  {recentEmails.map((e) => (
                    <li
                      key={e.id}
                      className="border-b border-brand-dark-border pb-2 last:border-b-0"
                    >
                      <p className="text-gray-400">
                        <span className="text-brand-gold">[{e.category}]</span> {e.subject}
                      </p>
                      <p className="text-gray-500 mt-0.5">
                        {e.to} · {new Date(e.sentAt).toLocaleString('hu-HU')}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function FilterChip({
  status,
  current,
  label,
}: {
  status: ApplicationStatus | undefined;
  current: ApplicationStatus | undefined;
  label: string;
}) {
  const isActive = status === current;
  const href = status ? `/dashboard/applications?status=${status}` : `/dashboard/applications`;
  return (
    <Link
      href={href}
      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
        isActive
          ? 'bg-brand-red border-brand-red text-white'
          : 'bg-brand-dark-card border-brand-dark-border text-gray-400 hover:text-white'
      }`}
    >
      {label}
    </Link>
  );
}

function ApplicationRow({
  item,
  active,
}: {
  item: ApplicationRecord;
  active: boolean;
}) {
  return (
    <Link
      href={`/dashboard/applications?id=${item.id}`}
      className={`block card-dark rounded-xl px-4 py-3 transition-colors ${
        active ? 'border-brand-red' : 'hover:border-gray-600'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-white truncate">{item.name}</p>
          <p className="text-xs text-gray-500">
            {item.city} · {item.age} éves · {item.testSuly}
          </p>
          <p className="text-xs text-gray-600 mt-0.5">
            {new Date(item.createdAt).toLocaleString('hu-HU')}
          </p>
        </div>
        <span
          className={`shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
            STATUS_COLOR[item.status]
          }`}
        >
          {STATUS_LABEL_HU[item.status]}
        </span>
      </div>
    </Link>
  );
}

function ApplicationDetail({ item }: { item: ApplicationRecord }) {
  return (
    <article className="card-dark rounded-2xl p-6">
      <header className="border-b border-brand-dark-border pb-4 mb-4">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <h2 className="text-xl font-bold text-white">{item.name}</h2>
          <span
            className={`text-xs font-bold uppercase px-2.5 py-1 rounded ${STATUS_COLOR[item.status]}`}
          >
            {STATUS_LABEL_HU[item.status]}
          </span>
        </div>
        <p className="text-gray-500 text-xs mt-1">
          #{item.id} · {new Date(item.createdAt).toLocaleString('hu-HU')}
        </p>
      </header>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <Item label="Kor" value={String(item.age)} />
        <Item label="Város" value={item.city} />
        <Item label="Testsúly" value={item.testSuly} />
        <Item label="E-mail" value={item.email || '—'} />
        <Item label="Telefon" value={item.phone || '—'} />
        <Item label="Locale" value={item.locale} />
        <Item label="GDPR consent" value={new Date(item.gdprConsentAt).toLocaleString('hu-HU')} />
        <Item label="IP-hash" value={item.ipHash ?? '—'} />
        <Item label="Bot guard" value={item.honeypotTriggered ? 'honeypot!' : 'ok'} />
      </dl>

      <section className="mt-4">
        <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-1">Sportmúlt</h3>
        <p className="text-gray-200 text-sm whitespace-pre-wrap">{item.sportMult}</p>
      </section>

      <section className="mt-4">
        <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-1">Motiváció</h3>
        <p className="text-gray-200 text-sm whitespace-pre-wrap">{item.motivation}</p>
      </section>

      <section className="mt-4">
        <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-1">Videó / social</h3>
        <a
          href={item.videoOrSocialUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="text-brand-gold text-sm break-all hover:underline"
        >
          {item.videoOrSocialUrl}
        </a>
      </section>

      <section className="mt-6 pt-4 border-t border-brand-dark-border">
        <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-2">Státusz váltás</h3>
        <div className="flex flex-wrap gap-2">
          {(['contacted', 'approved', 'rejected', 'new'] as ApplicationStatus[]).map((s) => (
            <form
              key={s}
              action={`/dashboard/applications/${item.id}/status`}
              method="post"
              className="contents"
            >
              <input type="hidden" name="status" value={s} />
              <button
                type="submit"
                disabled={item.status === s}
                className={`text-xs uppercase px-3 py-1.5 rounded transition-colors disabled:opacity-40 ${
                  STATUS_COLOR[s]
                } hover:opacity-90`}
              >
                {STATUS_LABEL_HU[s]}
              </button>
            </form>
          ))}
        </div>
      </section>
    </article>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-gray-500 text-xs uppercase tracking-widest">{label}</dt>
      <dd className="text-gray-200 break-words">{value}</dd>
    </div>
  );
}

function Forbidden() {
  return (
    <main className="min-h-screen pt-24 px-4">
      <div className="max-w-md mx-auto text-center">
        <p className="text-brand-red text-sm uppercase tracking-widest font-semibold mb-2">
          403 · Tiltott
        </p>
        <h1
          className="text-3xl font-black text-white mb-2"
          style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
        >
          Nincs hozzáférésed
        </h1>
        <p className="text-gray-400 text-sm">
          Az EFU Reality adminisztrációs felületéhez bejelentkezés szükséges. A
          fejlesztői környezetben a hozzáférést az <code>efu_role</code> süti
          határozza meg (L1-AUTH-RBAC).
        </p>
        <p className="text-gray-600 text-xs mt-6">
          Bejelentkezés szimulálása fejlesztéshez: böngésző konzolban{' '}
          <code className="text-brand-gold">
            document.cookie = "efu_role=Rendszeradminisztrator"
          </code>
        </p>
      </div>
    </main>
  );
}
