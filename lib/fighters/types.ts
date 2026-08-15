/**
 * EFU fighter domain types.
 *
 * Re-exports the canonical `Locale` from the project's i18n layer so all
 * fighter code uses one locale definition. The `Fighter` shape itself is
 * authoritative for L3-FIGHTERS-PUBLIC: it covers the acceptance-criteria
 * fields (photo, name, intro, story, EFU path timeline, mérleg/record,
 * videos) plus enough admin metadata (published, sortOrder) to drive the
 * listing page.
 *
 * Localized fields (intro / story / nickname / weightClass / hometown /
 * gym / name) are dictionaries keyed by `Locale`, with the resolver
 * handling the fallback chain (locale → hu → en → first available).
 */

import type { Locale } from '@/lib/i18n';

export type { Locale } from '@/lib/i18n';

/** Localized plain text (one entry per supported locale). */
export type LocalizedString = Partial<Record<Locale, string>>;

/** Localized rich text (HTML string per locale). */
export type LocalizedRichText = Partial<Record<Locale, string>>;

/** Career record (mérleg) — numbers are locale-agnostic. */
export interface FighterRecord {
  wins: number;
  losses: number;
  draws: number;
  /** Knockout / TKO wins. */
  kos: number;
  /** Submission wins. */
  submissions: number;
}

/** Stage on the EFU path (Reality → Fight Night → Pro). */
export type EfuPathStage = 'reality' | 'fight_night' | 'pro';

export interface EfuPathEntry {
  stage: EfuPathStage;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** Localized title. */
  title: LocalizedString;
  /** Localized 1-3 sentence description (HTML). */
  description: LocalizedRichText;
}

export type VideoProvider = 'youtube' | 'mp4';

export interface FighterVideo {
  provider: VideoProvider;
  /** YouTube watch URL or HTTPS URL of an uploaded MP4. */
  url: string;
  /** Localized title shown under the player. */
  title: LocalizedString;
  /** Optional poster image URL. */
  poster?: string;
}

export interface FightResult {
  date: string;
  opponent: string;
  outcome: 'win' | 'loss' | 'draw' | 'nc';
  /** e.g. "KO", "TKO", "Submission (RNC)", "Decision (unanimous)". */
  method: string;
  event?: string;
  round?: number;
}

/** The full fighter entity. */
export interface Fighter {
  /** URL slug, lowercase + dash-separated, unique. */
  slug: string;
  /** Display name (typically same across locales, but localizable). */
  name: LocalizedString;
  /** Intro shown under the hero photo (1-2 sentences, HTML). */
  intro: LocalizedRichText;
  /** Long-form story (HTML). */
  story: LocalizedRichText;
  /** Nickname in quotes (e.g. "The Destroyer"). */
  nickname: LocalizedString;
  /** Country flag emoji + ISO code (e.g. "🇭🇺 HU"). */
  country: string;
  /** Localized discipline (e.g. "Súlycsoport: Nehézsúly"). */
  weightClass: LocalizedString;
  /** Localized hometown. */
  hometown: LocalizedString;
  /** Localized gym / team name. */
  gym: LocalizedString;
  /** Date of birth (YYYY-MM-DD). */
  dob: string;
  /** Height in cm. */
  heightCm?: number;
  /** Reach in cm. */
  reachCm?: number;
  /** Stance: orthodox / southpaw / switch. */
  stance?: 'orthodox' | 'southpaw' | 'switch';
  /** Hero photo path (URL or /uploads/.../foo.jpg). */
  photo: string;
  /** Optional gallery photos. */
  gallery?: string[];
  /** Career record. */
  record: FighterRecord;
  /** Per-fight history (most recent first). */
  fightHistory?: FightResult[];
  /** EFU path: ordered list of stages the fighter has passed. */
  efuPath: EfuPathEntry[];
  /** Video list (YouTube or uploaded MP4). */
  videos: FighterVideo[];
  /** Published flag — only published fighters appear on the public listing. */
  published: boolean;
  /** Sort order for the listing (ascending; lower = earlier). */
  sortOrder: number;
  /** ISO timestamp of last update. */
  updatedAt: string;

  // ApplicationForm fields (admin mode, optional)
  /** Age in years. */
  age?: number;
  /** City of residence. */
  city?: string;
  /** Weight category (lightweight, welterweight, middleweight, lightheavy, heavyweight). */
  testSuly?: string;
  /** Sports background / history. */
  sportMult?: string;
  /** Motivation text. */
  motivation?: string;
  /** Video or social media URL. */
  videoOrSocialUrl?: string;
  /** Instagram profile URL. */
  instagramUrl?: string;
  /** TikTok profile URL. */
  tiktokUrl?: string;
  /** YouTube channel/video URL. */
  youtubeUrl?: string;
  /** Facebook profile URL. */
  facebookUrl?: string;
  /** Email address. */
  email?: string;
  /** Phone number. */
  phone?: string;
}

/** Fighter summary used by the public listing — strips heavy fields. */
export interface FighterSummary {
  slug: string;
  name: string;
  nickname: string;
  country: string;
  photo: string;
  weightClass: string;
  hometown: string;
  record: FighterRecord;
  /** First EFU path entry — used as the "EFU path teaser". */
  efuPathTeaser: { stage: EfuPathStage; title: string; date: string } | null;
}
