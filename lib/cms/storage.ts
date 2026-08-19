/**
 * CMS Storage — env-aware, KV-first on Workers / fs-first on Node.
 *
 * Persists CMS pages + media metadata in `APPLICATIONS_KV` (with the
 * `data/cms/{pages,media}/` directory as the local-development fallback).
 * The CmsStorage interface stays identical; only the implementation
 * swaps based on runtime. The public exports `pagesStorage` and
 * `mediaStorage` use the same dispatch pattern as `lib/db/index.ts`.
 *
 * Today: single-key-per-collection (pages:all, media:all) — fits the
 *   volume. Tomorrow (D1): shard by `slug`.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { Page, Media, CmsStorage } from './types';

const CMS_DATA_DIR = path.join(process.cwd(), 'data', 'cms');
const PAGES_DIR = path.join(CMS_DATA_DIR, 'pages');
const MEDIA_DIR = path.join(CMS_DATA_DIR, 'media');

// ---------------------------------------------------------------------------
// Env-aware handle
// ---------------------------------------------------------------------------

interface KvLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

function getKv(): KvLike | null {
  try {
    const { env } = getCloudflareContext();
    if ((env as any)?.APPLICATIONS_KV) return (env as any).APPLICATIONS_KV;
  } catch {}
  if (typeof process !== 'undefined' && (process.env as any)?.APPLICATIONS_KV) {
    return (process.env as any).APPLICATIONS_KV;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).__env__?.APPLICATIONS_KV) {
    return (globalThis as any).__env__.APPLICATIONS_KV;
  }
  return null;
}

export function isKvAvailable(): boolean {
  return getKv() !== null;
}

// ---------------------------------------------------------------------------
// KV layer — each collection is a single JSON array.
// ---------------------------------------------------------------------------

const KV_PAGES_KEY = 'cms:pages:all';
const KV_MEDIA_KEY = 'cms:media:all';

async function readAllFromKv<T>(key: string): Promise<T[] | null> {
  const kv = getKv();
  if (!kv) return null;
  const raw = await kv.get(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : null;
  } catch {
    return null;
  }
}

async function writeAllToKv<T>(key: string, list: T[]): Promise<void> {
  const kv = getKv();
  if (!kv) throw new Error('KV unavailable — writeAllToKv called outside Workers');
  await kv.put(key, JSON.stringify(list));
}

async function migrateFsDirToKv<T>(
  kvKey: string,
  dir: string,
  seed: T[] = []
): Promise<T[]> {
  const kv = getKv();
  if (!kv) return seed;
  const existing = await readAllFromKv<T>(kvKey);
  if (existing && existing.length > 0) return existing;
  let fromFs: T[] = [];
  try {
    const files = await fs.readdir(dir);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const raw = await fs.readFile(path.join(dir, file), 'utf-8');
      try {
        const item = JSON.parse(raw) as T;
        if (item) fromFs.push(item);
      } catch {}
    }
  } catch {
    // dir missing / fs unavailable — use seed
  }
  const seeded = fromFs.length > 0 ? fromFs : seed;
  await writeAllToKv(kvKey, seeded);
  return seeded;
}

// ---------------------------------------------------------------------------
// fs helpers (local dev only)
// ---------------------------------------------------------------------------

async function ensureDirectories(): Promise<void> {
  await fs.mkdir(PAGES_DIR, { recursive: true });
  await fs.mkdir(MEDIA_DIR, { recursive: true });
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ---------------------------------------------------------------------------
// Pages — hybrid (KV on Workers, fs on Node)
// ---------------------------------------------------------------------------

async function pagesReadAll(): Promise<Page[]> {
  if (getKv()) {
    const migrated = await migrateFsDirToKv<Page>(KV_PAGES_KEY, PAGES_DIR, []);
    return migrated.sort((a, b) => a.slug.localeCompare(b.slug));
  }
  await ensureDirectories();
  const files = await fs.readdir(PAGES_DIR);
  const pages: Page[] = [];
  for (const file of files) {
    if (file.endsWith('.json')) {
      const page = await readJsonFile<Page>(path.join(PAGES_DIR, file));
      if (page) pages.push(page);
    }
  }
  return pages.sort((a, b) => a.slug.localeCompare(b.slug));
}

async function pagesReadOne(slug: string): Promise<Page | null> {
  if (getKv()) {
    const all = await pagesReadAll();
    return all.find((p) => p.slug === slug) ?? null;
  }
  await ensureDirectories();
  return readJsonFile<Page>(path.join(PAGES_DIR, `${slug}.json`));
}

async function pagesUpsert(page: Page): Promise<void> {
  if (getKv()) {
    const all = await pagesReadAll();
    const idx = all.findIndex((p) => p.slug === page.slug);
    if (idx >= 0) all[idx] = page;
    else all.push(page);
    await writeAllToKv(KV_PAGES_KEY, all);
    return;
  }
  await ensureDirectories();
  await writeJsonFile(path.join(PAGES_DIR, `${page.slug}.json`), page);
}

async function pagesDelete(slug: string): Promise<void> {
  if (getKv()) {
    const all = await pagesReadAll();
    const next = all.filter((p) => p.slug !== slug);
    await writeAllToKv(KV_PAGES_KEY, next);
    return;
  }
  await ensureDirectories();
  try {
    await fs.unlink(path.join(PAGES_DIR, `${slug}.json`));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

/** Pages storage used by the rest of the app. */
export const pagesStorage: CmsStorage = {
  async readAllPages() {
    return pagesReadAll();
  },
  async readPage(slug: string) {
    return pagesReadOne(slug);
  },
  async readPublishedPages() {
    const all = await pagesReadAll();
    return all.filter((p) => p.published);
  },
  async upsertPage(page: Page) {
    return pagesUpsert(page);
  },
  async deletePage(slug: string) {
    return pagesDelete(slug);
  },
  async readAllMedia() {
    return mediaReadAll();
  },
  async readMedia(id: string) {
    return mediaReadOne(id);
  },
  async upsertMedia(media: Media) {
    return mediaUpsert(media);
  },
  async deleteMedia(id: string) {
    return mediaDelete(id);
  },
};

// ---------------------------------------------------------------------------
// Media — hybrid (KV on Workers, fs on Node)
// ---------------------------------------------------------------------------

async function mediaReadAll(): Promise<Media[]> {
  if (getKv()) {
    const migrated = await migrateFsDirToKv<Media>(KV_MEDIA_KEY, MEDIA_DIR, []);
    return migrated.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  await ensureDirectories();
  const files = await fs.readdir(MEDIA_DIR);
  const media: Media[] = [];
  for (const file of files) {
    if (file.endsWith('.json')) {
      const item = await readJsonFile<Media>(path.join(MEDIA_DIR, file));
      if (item) media.push(item);
    }
  }
  return media.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function mediaReadOne(id: string): Promise<Media | null> {
  if (getKv()) {
    const all = await mediaReadAll();
    return all.find((m) => m.id === id) ?? null;
  }
  await ensureDirectories();
  return readJsonFile<Media>(path.join(MEDIA_DIR, `${id}.json`));
}

async function mediaUpsert(media: Media): Promise<void> {
  if (getKv()) {
    const all = await mediaReadAll();
    const idx = all.findIndex((m) => m.id === media.id);
    if (idx >= 0) all[idx] = media;
    else all.push(media);
    await writeAllToKv(KV_MEDIA_KEY, all);
    return;
  }
  await ensureDirectories();
  await writeJsonFile(path.join(MEDIA_DIR, `${media.id}.json`), media);
}

async function mediaDelete(id: string): Promise<void> {
  if (getKv()) {
    const all = await mediaReadAll();
    const next = all.filter((m) => m.id !== id);
    await writeAllToKv(KV_MEDIA_KEY, next);
    return;
  }
  await ensureDirectories();
  try {
    await fs.unlink(path.join(MEDIA_DIR, `${id}.json`));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}

export const mediaStorage: CmsStorage = {
  async readAllPages() {
    return pagesReadAll();
  },
  async readPage(slug: string) {
    return pagesReadOne(slug);
  },
  async readPublishedPages() {
    const all = await pagesReadAll();
    return all.filter((p) => p.published);
  },
  async upsertPage(page: Page) {
    return pagesUpsert(page);
  },
  async deletePage(slug: string) {
    return pagesDelete(slug);
  },
  async readAllMedia() {
    return mediaReadAll();
  },
  async readMedia(id: string) {
    return mediaReadOne(id);
  },
  async upsertMedia(media: Media) {
    return mediaUpsert(media);
  },
  async deleteMedia(id: string) {
    return mediaDelete(id);
  },
};

// ---------------------------------------------------------------------------
// Seed data — used as last-resort fallback when KV is empty in production
// AND the local fs dir is empty (cold start, fresh deploy).
// ---------------------------------------------------------------------------

export const SEED_PAGES: Page[] = [
  {
    id: 'home',
    slug: 'home',
    title: { hu: 'Főoldal', en: 'Home' },
    blocks: [
      {
        id: 'hero-1',
        type: 'hero',
        layout: 'full',
        content: {
          title: { hu: 'Elite Fight Universe', en: 'Elite Fight Universe' },
          subtitle: { hu: 'A jövő harcművészete', en: 'The future of martial arts' },
          ctaText: { hu: 'Csatlakozz most', en: 'Join now' },
          ctaLink: '/register',
        },
        settings: { backgroundColor: '#0A0A0A', padding: 'large' },
        order: 0,
        visible: true,
      },
    ],
    seo: {
      title: { hu: 'EFU - Elite Fight Universe', en: 'EFU - Elite Fight Universe' },
      description: { hu: 'A jövő harcművészeti univerzuma', en: 'The future martial arts universe' },
    },
    published: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/** Initialize seed data when both KV and the fs dev dir are empty. */
export async function initializeSeedData(): Promise<void> {
  const existing = await pagesStorage.readAllPages();
  if (existing.length > 0) return;
  for (const page of SEED_PAGES) {
    await pagesStorage.upsertPage(page);
  }
}
