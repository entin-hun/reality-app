/**
 * Payload coercion + validation for admin fighter saves.
 *
 * The admin form posts a multipart-ish FormData; we never trust client
 * JSON, so this module turns the raw form fields into a `Fighter` and
 * surfaces field-level errors as a flat map the form can render.
 *
 * Per-fighter localized fields are encoded as textareas in the format:
 *   hu: ...
 *   en: ...
 *   sk: ...
 *   (one locale per line, blank lines ignored, unknown locales ignored).
 *
 * Videos are encoded as one per line: `provider|url|title-hu=title-en`
 * (titles default to "" if missing).
 *
 * EFU path entries: one per line `date|stage|hu-title|en-title|hu-desc|en-desc`.
 *
 * The validation runs server-side; once L1-DB ships we move the same
 * shape to a zod schema and reuse this module's parsers.
 */

import type {
  Fighter,
  FighterVideo,
  EfuPathStage,
  EfuPathEntry,
  Locale,
  LocalizedString,
  LocalizedRichText,
} from '@/lib/fighters';
import { LOCALES } from '@/lib/i18n';
import { slugify } from '@/lib/fighters';

export interface FighterFormErrors {
  [field: string]: string;
}

export interface ParsedFighter {
  fighter: Fighter;
  errors: FighterFormErrors;
  ok: boolean;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Localized text parser
 * ──────────────────────────────────────────────────────────────────────────*/

export function parseLocalized(text: string | undefined): LocalizedString {
  const out: LocalizedString = {};
  if (!text) return out;
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf(':');
    if (idx < 0) continue;
    const locale = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if ((LOCALES as readonly string[]).includes(locale) && value) {
      out[locale as Locale] = value;
    }
  }
  return out;
}

export function parseLocalizedRich(
  text: string | undefined,
): LocalizedRichText {
  return parseLocalized(text) as LocalizedRichText;
}

export function serializeLocalized(value: LocalizedString | undefined): string {
  if (!value) return '';
  return LOCALES.map((l) =>
    value[l] ? `${l}: ${value[l]}` : '',
  )
    .filter(Boolean)
    .join('\n');
}

/* ──────────────────────────────────────────────────────────────────────────
 * Video parser
 * ──────────────────────────────────────────────────────────────────────────*/

export function parseVideos(text: string | undefined): FighterVideo[] {
  const out: FighterVideo[] = [];
  if (!text) return out;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    // Format: provider | url | hu=title | en=title | sk=title ...
    const parts = line.split('|').map((p) => p.trim());
    const providerRaw = parts[0];
    if (
      providerRaw !== 'youtube' &&
      providerRaw !== 'mp4' &&
      providerRaw !== 'uploaded_mp4'
    ) {
      continue;
    }
    const provider: 'youtube' | 'mp4' =
      providerRaw === 'uploaded_mp4' ? 'mp4' : providerRaw;
    const url = parts[1];
    if (!url) continue;
    const title: LocalizedString = {};
    for (const t of parts.slice(2)) {
      const idx = t.indexOf('=');
      if (idx < 0) continue;
      const k = t.slice(0, idx).trim();
      const v = t.slice(idx + 1).trim();
      if ((LOCALES as readonly string[]).includes(k) && v) {
        title[k as Locale] = v;
      }
    }
    out.push({ provider, url, title });
  }
  return out;
}

/* ──────────────────────────────────────────────────────────────────────────
 * EFU path parser
 * ──────────────────────────────────────────────────────────────────────────*/

const STAGES: ReadonlySet<EfuPathStage> = new Set([
  'reality',
  'fight_night',
  'pro',
]);

export function parseEfuPath(text: string | undefined): EfuPathEntry[] {
  const out: EfuPathEntry[] = [];
  if (!text) return out;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    // date | stage | hu-title | en-title | hu-desc | en-desc ...
    const parts = line.split('|').map((p) => p.trim());
    const date = parts[0];
    const stageRaw = parts[1];
    if (!date || !STAGES.has(stageRaw as EfuPathStage)) continue;
    const stage = stageRaw as EfuPathStage;
    const rest = parts.slice(2);
    const title: LocalizedString = {};
    const description: LocalizedRichText = {};
    // Pair up: hu=title, en=title, hu=desc <not how it should be> ... use a richer encoding
    // Re-encode: alternating title-loc=title, desc-loc=desc pairs? Simplify:
    //   After date|stage: hu-title | hu-desc-text | en-title | en-desc-text ...
    for (let i = 0; i < rest.length; i += 2) {
      const k = rest[i];
      const v = rest[i + 1];
      if (!k || !v) continue;
      if ((LOCALES as readonly string[]).includes(k)) {
        title[k as Locale] = v;
      }
    }
    // Pull descriptions from a parallel textarea (kept simple for v1):
    // We accept an optional `description` payload via separated encoding:
    //   date | stage | hu-title<br>hu-desc | en-title<br>en-desc ...
    // Instead, simpler: split each "loc-string" on the literal "<br>" marker
    // for description separation.
    for (const loc of LOCALES) {
      const k = `${loc}-`;
      const idx = rest.findIndex((r) => r.startsWith(k));
      if (idx < 0) continue;
      const composite = rest[idx].slice(k.length);
      const sep = composite.indexOf(' || ');
      if (sep >= 0) {
        title[loc] = composite.slice(0, sep).trim();
        description[loc] = composite.slice(sep + 4).trim();
      } else {
        title[loc] = composite.trim();
      }
    }
    out.push({ stage, date, title, description });
  }
  return out;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Top-level parser
 * ──────────────────────────────────────────────────────────────────────────*/

function intOrZero(value: string | undefined): number {
  if (!value) return 0;
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function optInt(value: string | undefined): number | undefined {
  if (!value || value === '') return undefined;
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export interface RawFighterForm {
  slug?: string;
  name?: string;
  nickname?: string;
  country?: string;
  intro?: string;
  story?: string;
  weightClass?: string;
  hometown?: string;
  gym?: string;
  dob?: string;
  heightCm?: string;
  reachCm?: string;
  stance?: string;
  photo?: string;
  recordWins?: string;
  recordLosses?: string;
  recordDraws?: string;
  recordKos?: string;
  recordSubmissions?: string;
  efuPath?: string;
  videos?: string;
  published?: string;
  sortOrder?: string;
  /** When editing, the original slug — used to detect rename collisions. */
  originalSlug?: string;

  // ApplicationForm fields (admin mode, optional)
  age?: string;
  city?: string;
  testSuly?: string;
  sportMult?: string;
  motivation?: string;
  videoOrSocialUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  youtubeUrl?: string;
  facebookUrl?: string;
  email?: string;
  phone?: string;
}

export function parseFighterForm(
  form: RawFighterForm,
  existing: Fighter[] = [],
): ParsedFighter {
  const errors: FighterFormErrors = {};

  const slugInput = (form.slug ?? '').trim();
  const computedSlug = slugInput || slugify(form.name ?? '');
  if (!computedSlug) errors.slug = 'A slug megadása kötelező.';
  if (
    computedSlug &&
    existing.some(
      (f) =>
        f.slug === computedSlug && (form.originalSlug ?? '') !== f.slug,
    )
  ) {
    errors.slug = 'Ez a slug már foglalt.';
  }

  if (!(form.name ?? '').trim()) errors.name = 'A név megadása kötelező.';
  if (!(form.country ?? '').trim())
    errors.country = 'Az ország megadása kötelező.';

  const heightCm = optInt(form.heightCm);
  const reachCm = optInt(form.reachCm);
  const stanceRaw = (form.stance ?? '').trim().toLowerCase();
  if (
    stanceRaw &&
    stanceRaw !== 'orthodox' &&
    stanceRaw !== 'southpaw' &&
    stanceRaw !== 'switch'
  ) {
    errors.stance = 'Érvénytelen állás.';
  }

  const photo = (form.photo ?? '').trim();
  if (!photo) errors.photo = 'A fénykép megadása kötelező.';

  const published = form.published === 'on' || form.published === 'true';
  const sortOrder = intOrZero(form.sortOrder);

  // Parse ApplicationForm fields (all optional)
  const age = optInt(form.age);
  const city = (form.city ?? '').trim() || undefined;
  const testSuly = (form.testSuly ?? '').trim() || undefined;
  const sportMult = (form.sportMult ?? '').trim() || undefined;
  const motivation = (form.motivation ?? '').trim() || undefined;
  const videoOrSocialUrl = (form.videoOrSocialUrl ?? '').trim() || undefined;
  const instagramUrl = (form.instagramUrl ?? '').trim() || undefined;
  const tiktokUrl = (form.tiktokUrl ?? '').trim() || undefined;
  const youtubeUrl = (form.youtubeUrl ?? '').trim() || undefined;
  const facebookUrl = (form.facebookUrl ?? '').trim() || undefined;
  const email = (form.email ?? '').trim() || undefined;
  const phone = (form.phone ?? '').trim() || undefined;

  const fighter: Fighter = {
    slug: computedSlug || 'harcos',
    name: parseLocalized(form.name ?? ''),
    intro: parseLocalizedRich(form.intro ?? ''),
    story: parseLocalizedRich(form.story ?? ''),
    nickname: parseLocalized(form.nickname ?? ''),
    country: (form.country ?? '').trim(),
    weightClass: parseLocalized(form.weightClass ?? ''),
    hometown: parseLocalized(form.hometown ?? ''),
    gym: parseLocalized(form.gym ?? ''),
    dob: (form.dob ?? '').trim(),
    heightCm,
    reachCm,
    stance: stanceRaw
      ? (stanceRaw as 'orthodox' | 'southpaw' | 'switch')
      : undefined,
    photo,
    record: {
      wins: intOrZero(form.recordWins),
      losses: intOrZero(form.recordLosses),
      draws: intOrZero(form.recordDraws),
      kos: intOrZero(form.recordKos),
      submissions: intOrZero(form.recordSubmissions),
    },
    fightHistory: [],
    efuPath: parseEfuPath(form.efuPath ?? ''),
    videos: parseVideos(form.videos ?? ''),
    published,
    sortOrder,
    updatedAt: new Date().toISOString(),
    // ApplicationForm fields
    age,
    city,
    testSuly,
    sportMult,
    motivation,
    videoOrSocialUrl,
    instagramUrl,
    tiktokUrl,
    youtubeUrl,
    facebookUrl,
    email,
    phone,
  };

  return { fighter, errors, ok: Object.keys(errors).length === 0 };
}
