import Link from 'next/link';
import { Forbidden } from '../../components/Forbidden';
import { requireFighterAdmin } from '@/lib/auth/admin';
import { FighterEditor } from '../FighterEditor';
import { store } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface NewFighterPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Approximate DOB from an age integer. We only use it as a starting hint
 * inside the editor — admin can correct it before saving.
 */
function ageToDob(ageStr: string | undefined): string {
  const age = Number(ageStr);
  if (!Number.isFinite(age) || age <= 0 || age > 120) return '';
  const year = new Date().getFullYear() - Math.floor(age);
  return `${year}-01-01`;
}

/**
 * Approximate `weightClass` from a testSuly bucket string. We just preserve
 * the string — admins rewrite before publishing.
 */
function weightClassHint(suly: string | undefined): string {
  if (!suly) return '';
  return suly.length > 60 ? suly.slice(0, 60) : suly;
}

export default async function NewFighterPage({ searchParams }: NewFighterPageProps) {
  const guard = await requireFighterAdmin();
  if (!guard.ok) {
    return <Forbidden />;
  }

  const sp = await searchParams;
  const fromId = typeof sp.from === 'string' ? sp.from : undefined;

  // Load application source for richer prefill (notes, videoOrSocialUrl
  // typed correctly, etc.). Falls back to query params if the application
  // was deleted in the meantime.
  let applicant: Awaited<ReturnType<typeof store.get>> | null = null;
  if (fromId) {
    try {
      applicant = await store.get(fromId);
    } catch {
      applicant = null;
    }
  }

  const pickStr = (k: string) =>
    typeof sp[k] === 'string' ? (sp[k] as string) : '';

  const initial = {
    slug: pickStr('slug'),
    name: applicant?.name ?? pickStr('name'),
    nickname: '',
    country: '🇭🇺 HU',
    intro: pickStr('intro'),
    story: pickStr('story'),
    weightClass: weightClassHint(
      applicant?.testSuly ?? pickStr('weightClass')
    ),
    hometown: applicant?.city ?? pickStr('city'),
    gym: '',
    dob: ageToDob(
      applicant?.age ? String(applicant.age) : pickStr('age')
    ),
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
    videos: applicant?.videoOrSocialUrl ?? pickStr('videoUrl'),
    published: 'on',
    sortOrder: '99',
    age: applicant?.age ? String(applicant.age) : pickStr('age'),
    city: applicant?.city ?? pickStr('city'),
    testSuly: applicant?.testSuly ?? pickStr('weightClass'),
    sportMult: applicant?.sportMult ?? '',
    motivation: applicant?.motivation ?? '',
    videoOrSocialUrl: applicant?.videoOrSocialUrl ?? pickStr('videoUrl'),
    instagramUrl: '',
    tiktokUrl: '',
    youtubeUrl: '',
    facebookUrl: '',
    email: applicant?.email ?? pickStr('email'),
    phone: applicant?.phone ?? pickStr('phone'),
  };

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
            {applicant ? `Új harcos: ${applicant.name}` : 'Új harcos létrehozása'}
          </h1>
          {applicant && (
            <p className="text-xs text-emerald-400 mt-2">
              ✓ Előleg kitöltve a(z) <code>{applicant.id}</code> jelentkezés
              alapján. Ellenőrizd és egészítsd ki a többi mezőt mentés előtt.
            </p>
          )}
        </header>

        <FighterEditor mode="create" initial={initial} />

        <p className="text-gray-600 text-xs mt-8 flex gap-4">
          <Link href="/dashboard/fighter-profiles" className="hover:text-white">
            ← Vissza a harcos profilokhoz
          </Link>
          <Link href="/dashboard/fighters" className="hover:text-white">
            Harcos lista
          </Link>
        </p>
      </div>
    </main>
  );
}
