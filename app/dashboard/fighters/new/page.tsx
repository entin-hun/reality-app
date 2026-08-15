import Link from 'next/link';
import { Forbidden } from '../../components/Forbidden';
import { requireFighterAdmin } from '@/lib/auth/admin';
import { FighterEditor } from '../FighterEditor';

export const dynamic = 'force-dynamic';

export default async function NewFighterPage() {
  const guard = await requireFighterAdmin();
  if (!guard.ok) {
    return <Forbidden />;
  }
  return (
    <main className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <p className="text-brand-red text-sm uppercase tracking-widest font-semibold mb-1">
            Admin · Új harcos
          </p>
          <h1
            className="text-3xl sm:text-4xl font-black text-white uppercase"
            style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
          >
            Új harcos létrehozása
          </h1>
        </header>

        <FighterEditor
          mode="create"
          initial={{
            slug: '',
            name: '',
            nickname: '',
            country: '🇭🇺 HU',
            intro: '',
            story: '',
            weightClass: '',
            hometown: '',
            gym: '',
            dob: '',
            heightCm: '',
            reachCm: '',
            stance: '',
            photo: '/fighters/placeholder.svg',
            recordWins: '0',
            recordLosses: '0',
            recordDraws: '0',
            recordKos: '0',
            recordSubmissions: '0',
            efuPath: '',
            videos: '',
            published: 'on',
            sortOrder: '99',
            age: '',
            city: '',
            testSuly: '',
            sportMult: '',
            motivation: '',
            videoOrSocialUrl: '',
            instagramUrl: '',
            tiktokUrl: '',
            youtubeUrl: '',
            facebookUrl: '',
            email: '',
            phone: '',
          }}
        />

        <p className="text-gray-600 text-xs mt-8">
          <Link href="/dashboard/fighters" className="hover:text-white">
            ← Vissza a harcosok listájához
          </Link>
        </p>
      </div>
    </main>
  );
}
