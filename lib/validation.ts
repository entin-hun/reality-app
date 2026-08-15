/**
 * Validation — shared between client (form) and server (API route).
 * The source of truth for shape, lengths, and the GDPR-consent hard rule.
 */

export interface ApplicationFormInput {
  name: string;
  age: number | string; // accept string from form, normalize
  city: string;
  testSuly: string;
  sportMult: string;
  motivation: string;
  videoOrSocialUrl: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  youtubeUrl?: string;
  facebookUrl?: string;
  email: string;
  phone: string;
  gdprConsent: boolean;
  hp_company?: string; // honeypot
}

export interface ValidationError {
  field: keyof ApplicationFormInput;
  code:
    | 'required'
    | 'too_long'
    | 'too_short'
    | 'invalid_number'
    | 'out_of_range'
    | 'invalid_url'
    | 'invalid_contact'
    | 'consent_required'
    | 'invalid_video_url'
    | 'honeypot';
  message: string;
}

const VIDEO_DOMAINS = [
  'youtube.com',
  'youtu.be',
  'instagram.com',
  'tiktok.com',
  'facebook.com',
  'fb.watch',
  'x.com',
  'twitter.com',
  'vimeo.com',
];

export const TEXT_LIMITS = {
  name: { min: 2, max: 80 },
  city: { min: 2, max: 80 },
  sportMult: { max: 500 },
  motivation: { min: 20, max: 1500 },
  email: { min: 5, max: 120 },
  phone: { min: 7, max: 20 },
  videoOrSocialUrl: { max: 500 },
  instagramUrl: { max: 500 },
  tiktokUrl: { max: 500 },
  youtubeUrl: { max: 500 },
  facebookUrl: { max: 500 },
};

export function isVideoOrSocialUrl(url: string): boolean {
  if (!url) return false;
  let host = '';
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return false;
  }
  return VIDEO_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Permissive phone: +, digits, spaces, dashes, parens. 7..20 chars after trim.
const PHONE_RE = /^\+?[0-9 ()-]{7,20}$/;

export function isContact(input: string): { ok: boolean; kind: 'email' | 'phone' | 'unknown' } {
  const v = input.trim();
  if (EMAIL_RE.test(v)) return { ok: true, kind: 'email' };
  if (PHONE_RE.test(v)) return { ok: true, kind: 'phone' };
  return { ok: false, kind: 'unknown' };
}

export function validate(input: ApplicationFormInput): ValidationError[] {
  const errors: ValidationError[] = [];

  // Honeypot — must be empty. A bot fills every field including hidden ones.
  if (input.hp_company && input.hp_company.trim() !== '') {
    errors.push({
      field: 'hp_company',
      code: 'honeypot',
      message: 'honeypot',
    });
  }

  if (!input.name || input.name.trim().length < TEXT_LIMITS.name.min) {
    errors.push({ field: 'name', code: 'too_short', message: 'name.too_short' });
  } else if (input.name.length > TEXT_LIMITS.name.max) {
    errors.push({ field: 'name', code: 'too_long', message: 'name.too_long' });
  }

  const ageNum = typeof input.age === 'string' ? Number(input.age) : input.age;
  if (!Number.isFinite(ageNum)) {
    errors.push({ field: 'age', code: 'invalid_number', message: 'age.invalid_number' });
  } else if (ageNum < 16 || ageNum > 60) {
    errors.push({ field: 'age', code: 'out_of_range', message: 'age.out_of_range' });
  }

  if (!input.city || input.city.trim().length < TEXT_LIMITS.city.min) {
    errors.push({ field: 'city', code: 'too_short', message: 'city.too_short' });
  } else if (input.city.length > TEXT_LIMITS.city.max) {
    errors.push({ field: 'city', code: 'too_long', message: 'city.too_long' });
  }

  if (!input.testSuly || input.testSuly.trim().length === 0) {
    errors.push({ field: 'testSuly', code: 'required', message: 'testSuly.required' });
  }

  if (!input.sportMult || input.sportMult.trim().length === 0) {
    errors.push({ field: 'sportMult', code: 'required', message: 'sportMult.required' });
  } else if (input.sportMult.length > TEXT_LIMITS.sportMult.max) {
    errors.push({ field: 'sportMult', code: 'too_long', message: 'sportMult.too_long' });
  }

  if (!input.motivation || input.motivation.trim().length < TEXT_LIMITS.motivation.min) {
    errors.push({ field: 'motivation', code: 'too_short', message: 'motivation.too_short' });
  } else if (input.motivation.length > TEXT_LIMITS.motivation.max) {
    errors.push({ field: 'motivation', code: 'too_long', message: 'motivation.too_long' });
  }

  if (!input.videoOrSocialUrl || input.videoOrSocialUrl.trim().length === 0) {
    errors.push({ field: 'videoOrSocialUrl', code: 'required', message: 'videoOrSocialUrl.required' });
  } else if (input.videoOrSocialUrl.length > TEXT_LIMITS.videoOrSocialUrl.max) {
    errors.push({ field: 'videoOrSocialUrl', code: 'too_long', message: 'videoOrSocialUrl.too_long' });
  } else if (!isVideoOrSocialUrl(input.videoOrSocialUrl)) {
    errors.push({
      field: 'videoOrSocialUrl',
      code: 'invalid_video_url',
      message: 'videoOrSocialUrl.invalid',
    });
  }

  // Optional social media links - validate only if provided
  if (input.instagramUrl && input.instagramUrl.length > TEXT_LIMITS.instagramUrl.max) {
    errors.push({ field: 'instagramUrl', code: 'too_long', message: 'instagramUrl.too_long' });
  }
  if (input.tiktokUrl && input.tiktokUrl.length > TEXT_LIMITS.tiktokUrl.max) {
    errors.push({ field: 'tiktokUrl', code: 'too_long', message: 'tiktokUrl.too_long' });
  }
  if (input.youtubeUrl && input.youtubeUrl.length > TEXT_LIMITS.youtubeUrl.max) {
    errors.push({ field: 'youtubeUrl', code: 'too_long', message: 'youtubeUrl.too_long' });
  }
  if (input.facebookUrl && input.facebookUrl.length > TEXT_LIMITS.facebookUrl.max) {
    errors.push({ field: 'facebookUrl', code: 'too_long', message: 'facebookUrl.too_long' });
  }

  // Email — required, must be valid email format
  if (!input.email || input.email.trim().length === 0) {
    errors.push({ field: 'email', code: 'required', message: 'email.required' });
  } else if (!EMAIL_RE.test(input.email.trim())) {
    errors.push({ field: 'email', code: 'invalid_contact', message: 'email.invalid' });
  } else if (input.email.length > TEXT_LIMITS.email.max) {
    errors.push({ field: 'email', code: 'too_long', message: 'email.too_long' });
  }

  // Phone — required, must be valid phone format
  if (!input.phone || input.phone.trim().length === 0) {
    errors.push({ field: 'phone', code: 'required', message: 'phone.required' });
  } else if (!PHONE_RE.test(input.phone.trim())) {
    errors.push({ field: 'phone', code: 'invalid_contact', message: 'phone.invalid' });
  } else if (input.phone.length > TEXT_LIMITS.phone.max) {
    errors.push({ field: 'phone', code: 'too_long', message: 'phone.too_long' });
  }

  if (input.gdprConsent !== true) {
    errors.push({
      field: 'gdprConsent',
      code: 'consent_required',
      message: 'gdprConsent.required',
    });
  }

  return errors;
}

export function isOk(errors: ValidationError[]): errors is [] {
  return errors.length === 0;
}

/* -------------------------------------------------------------------------
 * Contact form (Kapcsolat page) — separate from the fighter application
 * because the shape, length limits, and validation rules differ.
 * Subject is a fixed enum so we can route inquiries to the right inbox
 * once an admin/L6 triage view exists.
 * ------------------------------------------------------------------------- */

export const CONTACT_SUBJECTS = [
  'general',
  'partnership',
  'press',
  'support',
  'other',
] as const;
export type ContactSubject = (typeof CONTACT_SUBJECTS)[number];

export interface ContactFormInput {
  name: string;
  email: string;
  subject: ContactSubject | string; // accept string from form, normalize
  message: string;
  gdprConsent: boolean;
  hp_company?: string; // honeypot
}

export interface ContactValidationError {
  field: keyof ContactFormInput;
  code:
    | 'required'
    | 'too_long'
    | 'too_short'
    | 'invalid_email'
    | 'invalid_subject'
    | 'consent_required'
    | 'honeypot';
  message: string;
}

export const CONTACT_LIMITS = {
  name: { min: 2, max: 80 },
  email: { max: 120 },
  message: { min: 20, max: 2000 },
};

// Reuse the same email regex used elsewhere in the form layer.
const CONTACT_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isContactEmail(input: string): boolean {
  return CONTACT_EMAIL_RE.test(input.trim());
}

export function isContactSubject(input: string): input is ContactSubject {
  return (CONTACT_SUBJECTS as readonly string[]).includes(input);
}

export function validateContact(input: ContactFormInput): ContactValidationError[] {
  const errors: ContactValidationError[] = [];

  // Honeypot — must be empty. Bots fill every field including hidden ones.
  if (input.hp_company && input.hp_company.trim() !== '') {
    errors.push({
      field: 'hp_company',
      code: 'honeypot',
      message: 'honeypot',
    });
  }

  if (!input.name || input.name.trim().length < CONTACT_LIMITS.name.min) {
    errors.push({ field: 'name', code: 'too_short', message: 'name.too_short' });
  } else if (input.name.length > CONTACT_LIMITS.name.max) {
    errors.push({ field: 'name', code: 'too_long', message: 'name.too_long' });
  }

  if (!input.email || input.email.trim().length === 0) {
    errors.push({ field: 'email', code: 'required', message: 'email.required' });
  } else if (input.email.length > CONTACT_LIMITS.email.max) {
    errors.push({ field: 'email', code: 'too_long', message: 'email.too_long' });
  } else if (!isContactEmail(input.email)) {
    errors.push({ field: 'email', code: 'invalid_email', message: 'email.invalid' });
  }

  if (!input.subject || String(input.subject).trim().length === 0) {
    errors.push({ field: 'subject', code: 'required', message: 'subject.required' });
  } else if (!isContactSubject(String(input.subject))) {
    errors.push({
      field: 'subject',
      code: 'invalid_subject',
      message: 'subject.invalid',
    });
  }

  if (!input.message || input.message.trim().length < CONTACT_LIMITS.message.min) {
    errors.push({ field: 'message', code: 'too_short', message: 'message.too_short' });
  } else if (input.message.length > CONTACT_LIMITS.message.max) {
    errors.push({ field: 'message', code: 'too_long', message: 'message.too_long' });
  }

  if (input.gdprConsent !== true) {
    errors.push({
      field: 'gdprConsent',
      code: 'consent_required',
      message: 'gdprConsent.required',
    });
  }

  return errors;
}

export function isContactOk(errors: ContactValidationError[]): errors is [] {
  return errors.length === 0;
}
