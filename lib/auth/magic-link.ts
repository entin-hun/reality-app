/**
 * Magic-link authentication helpers.
 *
 * A "magic link" is a one-time URL containing an opaque token. The user
 * receives it via email, clicks it, and is signed in without a password.
 *
 * Token shape: 32 url-safe base64 chars from crypto.getRandomValues.
 *
 * The token itself carries no information — only an opaque id. The mapping
 * (token → email) lives in AUTH_KV with a 15-minute TTL.
 */

const TOKEN_BYTES = 24;

export function generateToken(): string {
  // Workers expose crypto.getRandomValues via the Web Crypto API.
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

export function base64UrlEncode(bytes: Uint8Array): string {
  // Manual url-safe base64 (no padding) — avoids Buffer dependency on Workers.
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Build a magic-link URL pointing at /api/auth/verify.
 * Honors NEXT_PUBLIC_BASE_URL so links work on both the workers.dev
 * preview and the custom domain (elitfightclub.hu / efutv.eu).
 */
export function buildMagicLinkUrl(token: string, locale: string = 'hu'): string {
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ||
    'https://mma-stream.arttechnokft.workers.dev';
  const url = new URL('/api/auth/verify', base);
  url.searchParams.set('token', token);
  if (locale) url.searchParams.set('locale', locale);
  return url.toString();
}

/** Cookie name used to hold the authenticated role + email. */
export const SESSION_COOKIE = 'efu_session';

/**
 * Build a Set-Cookie value for the session cookie.
 * - httpOnly so client-side JS can't read it
 * - secure in production
 * - sameSite=lax so links from email work
 * - path=/ so the dashboard layout sees it
 * - maxAge 30 days
 */
export function buildSessionCookie(
  email: string,
  role: string,
  opts: { secure?: boolean } = {}
): string {
  const value = encodeURIComponent(JSON.stringify({ email, role, ts: Date.now() }));
  const maxAge = 60 * 60 * 24 * 30;
  const parts = [
    `${SESSION_COOKIE}=${value}`,
    'Path=/',
    `Max-Age=${maxAge}`,
    'SameSite=Lax',
    'HttpOnly',
  ];
  if (opts.secure ?? process.env.NODE_ENV === 'production') parts.push('Secure');
  return parts.join('; ');
}

/** Clear the session cookie. */
export function buildClearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly`;
}

/** Decode the session cookie value. Returns null when missing/invalid. */
export interface SessionData {
  email: string;
  role: string;
  ts: number;
}

export function parseSessionCookie(raw: string | undefined | null): SessionData | null {
  if (!raw) return null;
  try {
    const decoded = JSON.parse(decodeURIComponent(raw)) as SessionData;
    if (
      typeof decoded.email === 'string' &&
      typeof decoded.role === 'string' &&
      typeof decoded.ts === 'number'
    ) {
      return decoded;
    }
    return null;
  } catch {
    return null;
  }
}
