import Link from 'next/link';
import { notFound } from 'next/navigation';
import { readFighter, pickLocalized } from '@/lib/fighters';
import { DEFAULT_LOCALE } from '@/lib/i18n';
import { Forbidden } from '../../components/Forbidden';
import { requireFighterAdmin } from '@/lib/auth/admin';
import { FighterEditor } from '../FighterEditor';

export const dynamic = 'force-dynamic';

export default async function EditFighterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guard = await requireFighterAdmin();
  if (!guard.ok) {
    return <Forbidden />;
  }

  const fighter = await readFighter(slug);
  if (!fighter) {
    notFound();
  }

  // Pre-render localized fields into textarea format used by the form.
  const serialize = (v: Record<string, string | undefined>) =>
    Object.entries(v)
      .filter(([, val]) => !!val)
      .map(([k, val]) => `${k}: ${val}`)
      .join('\n');

  const initial = {
    slug: fighter.slug,
    name: serialize(fighter.name),
    nickname: serialize(fighter.nickname),
    country: fighter.country,
    intro: serialize(fighter.intro),
    story: serialize(fighter.story),
    weightClass: serialize(fighter.weightClass),
    hometown: serialize(fighter.hometown),
    gym: serialize(fighter.gym),
    dob: fighter.dob,
    heightCm: fighter.heightCm?.toString() ?? '',
    reachCm: fighter.reachCm?.toString() ?? '',
    stance: fighter.stance ?? '',
    photo: fighter.photo,
    recordWins: fighter.record.wins.toString(),
    recordLosses: fighter.record.losses.toString(),
    recordDraws: fighter.record.draws.toString(),
    recordKos: fighter.record.kos.toString(),
    recordSubmissions: fighter.record.submissions.toString(),
    efuPath: fighter.efuPath
      .map((e) => {
        const firstLocale = (Object.keys(e.title)[0] ?? 'hu') as keyof typeof e.title;
        const tPart = `${firstLocale}-${e.title[firstLocale] ?? ''}`;
        const dPart = e.description[firstLocale]
          ? ` || ${e.description[firstLocale]}`
          : '';
        return `${e.date}|${e.stage}|${tPart}${dPart}`;
      })
      .join('\n'),
    videos: fighter.videos
      .map((v) => {
        const titleParts = Object.entries(v.title)
          .filter(([, t]) => !!t)
          .map(([k, t]) => `${k}=${t}`)
          .join(' | ');
        return `${v.provider}|${v.url}${titleParts ? '|' + titleParts : ''}`;
      })
      .join('\n'),
    published: fighter.published ? 'on' : '',
    sortOrder: fighter.sortOrder.toString(),
    // ApplicationForm fields (from fighter data if available)
    age: fighter.age?.toString() ?? '',
    city: fighter.city ?? '',
    testSuly: fighter.testSuly ?? '',
    sportMult: fighter.sportMult ?? '',
    motivation: fighter.motivation ?? '',
    videoOrSocialUrl: fighter.videoOrSocialUrl ?? '',
    instagramUrl: fighter.instagramUrl ?? '',
    tiktokUrl: fighter.tiktokUrl ?? '',
    youtubeUrl: fighter.youtubeUrl ?? '',
    facebookUrl: fighter.facebookUrl ?? '',
    email: fighter.email ?? '',
    phone: fighter.phone ?? '',
  };

  return (
    <main className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <p className="text-brand-red text-sm uppercase tracking-widest font-semibold mb-1">
            Admin · Harcos szerkesztése
          </p>
          <h1
            className="text-3xl sm:text-4xl font-black text-white uppercase"
            style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
          >
            {pickLocalized(fighter.name, DEFAULT_LOCALE)}
          </h1>
          <p className="text-gray-500 text-xs mt-1">
            /{fighter.slug} · frissítve: {fighter.updatedAt}
          </p>
        </header>

        <FighterEditor mode="edit" initial={initial} />

        <p className="text-gray-600 text-xs mt-8">
          <Link href="/dashboard/fighters" className="hover:text-white">
            ← Vissza a harcosok listájához
          </Link>
        </p>
      </div>
    </main>
  );
}
