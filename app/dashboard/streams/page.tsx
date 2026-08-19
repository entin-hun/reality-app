/**
 * /dashboard/streams — admin control for Cloudflare Stream live inputs.
 *
 * Auth gate: Rendszeradminisztrator + Producer (per ADMIN_SECTIONS entry).
 * Anyone else gets the standard Forbidden card (rendered inline so the
 * role-gated path stays inside the dashboard layout chrome).
 *
 * The UI is a single client component: list existing inputs with their
 * ingest status (ready / live / offline), open a modal to mint a new
 * input (creates a CF live_input + returns the RTMPS URL + stream key
 * EXACTLY ONCE for copy-paste), and flip the "current" pointer that
 * /watch reads. Stream key is never re-fetched after creation.
 *
 * Both ingest paths the operator might use work with the same output:
 *   - Direct: paste the URL + key into OBS.
 *   - Via Restream: paste the URL + key into Restream's CF Stream
 *     destination; OBS points at Restream. The CF Stream end-point
 *     is identical either way.
 */

import { currentRole } from '@/lib/auth/dev-role';
import { StreamsAdmin } from '@/components/dashboard/StreamsAdmin';

export const metadata = {
  title: 'Élő közvetítés · EFU Admin',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const ALLOWED: ReadonlyArray<string> = ['Rendszeradminisztrator', 'Producer'];

export default async function DashboardStreamsPage() {
  const role = await currentRole();
  if (!ALLOWED.includes(role)) {
    return (
      <main className="min-h-screen pt-24 pb-16 px-4">
        <div className="max-w-3xl mx-auto card-dark rounded-2xl p-8 text-center">
          <div className="text-5xl mb-3">🔒</div>
          <h1
            className="text-2xl font-black text-white uppercase mb-2"
            style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
          >
            Hozzáférés megtagadva
          </h1>
          <p className="text-gray-400">
            Az élő közvetítés kezeléséhez Producer vagy Rendszeradminisztrátor
            szerepkör szükséges.
          </p>
        </div>
      </main>
    );
  }
  return <StreamsAdmin />;
}
