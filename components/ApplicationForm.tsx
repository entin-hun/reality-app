'use client';

/**
 * EFU Fighter Application Form.
 *
 * Self-contained: client validation, honeypot, optional Turnstile widget,
 * submit -> /api/applications. Locale passed in from the page; field
 * labels + messages come from the `application` namespace messages object.
 */

import { useState, useRef, FormEvent } from 'react';
import {
  isVideoOrSocialUrl,
  isContact,
  validate,
  type ApplicationFormInput,
  type ValidationError,
} from '@/lib/validation';
import { Turnstile, type TurnstileHandle } from './Turnstile';

interface Props {
  locale: string;
  messages: Record<string, string>; // flat dotted keys
  turnstileSiteKey?: string;
}

interface SubmitState {
  status: 'idle' | 'submitting' | 'success' | 'error';
  message?: string;
  fieldErrors?: Partial<Record<keyof ApplicationFormInput, string>>;
}

export function ApplicationForm({ locale, messages, turnstileSiteKey }: Props) {
  const t = (key: string): string => messages[key] ?? key;
  const turnstileRef = useRef<TurnstileHandle | null>(null);

  const [submitState, setSubmitState] = useState<SubmitState>({ status: 'idle' });
  const [gdprAccepted, setGdprAccepted] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);

    const scrollToFirstError = (fieldErrors: Partial<Record<keyof ApplicationFormInput, string>>) => {
      const firstField = Object.keys(fieldErrors)[0];
      if (firstField) {
        setTimeout(() => {
          const el = document.querySelector(`[name="${firstField}"]`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (el instanceof HTMLElement) el.focus({ preventScroll: true });
          } else {
            // Fallback to top of form
            form.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 50);
      } else {
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    const payload: ApplicationFormInput & { turnstileToken?: string | null } = {
      name: String(fd.get('name') ?? ''),
      age: String(fd.get('age') ?? ''),
      city: String(fd.get('city') ?? ''),
      testSuly: String(fd.get('testSuly') ?? ''),
      sportMult: String(fd.get('sportMult') ?? ''),
      motivation: String(fd.get('motivation') ?? ''),
      videoOrSocialUrl: String(fd.get('videoOrSocialUrl') ?? ''),
      instagramUrl: String(fd.get('instagramUrl') ?? ''),
      tiktokUrl: String(fd.get('tiktokUrl') ?? ''),
      youtubeUrl: String(fd.get('youtubeUrl') ?? ''),
      facebookUrl: String(fd.get('facebookUrl') ?? ''),
      email: String(fd.get('email') ?? ''),
      phone: String(fd.get('phone') ?? ''),
      gdprConsent: gdprAccepted,
      hp_company: String(fd.get('hp_company') ?? ''),
      turnstileToken: turnstileRef.current?.getToken() ?? null,
    };

    // Client-side guard: bypass server round-trip for obvious problems.
    const errors: ValidationError[] = validate(payload);
    if (errors.length > 0) {
      const fieldErrors: Partial<Record<keyof ApplicationFormInput, string>> = {};
      for (const err of errors) {
        fieldErrors[err.field] = t(`error.${err.message}`);
      }
      setSubmitState({ status: 'error', message: t('error.summary'), fieldErrors });
      scrollToFirstError(fieldErrors);
      return;
    }

    setSubmitState({ status: 'submitting' });

    try {
      const resp = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, locale }),
      });
      const data = (await resp.json()) as {
        ok: boolean;
        id?: string;
        errors?: ValidationError[];
        message?: string;
        detail?: string;
      };

      if (!resp.ok || !data.ok) {
        const fieldErrors: Partial<Record<keyof ApplicationFormInput, string>> = {};
        for (const err of data.errors ?? []) {
          fieldErrors[err.field] = t(`error.${err.message}`);
        }
        
        let errorMessage = data.message ?? t('error.summary');
        // Külön hibakezelés, ha a szerver részleteket is ad (pl. persistence_failed)
        if (data.detail) {
          errorMessage += ` (${data.detail})`;
        }
        
        setSubmitState({
          status: 'error',
          message: errorMessage,
          fieldErrors,
        });
        scrollToFirstError(fieldErrors);
        turnstileRef.current?.reset();
        return;
      }

      setSubmitState({ status: 'success', message: data.id });
      form.reset();
      setGdprAccepted(false);
    } catch (err) {
      setSubmitState({
        status: 'error',
        message: t('error.network'),
      });
    }
  }

  if (submitState.status === 'success') {
    return (
      <div
        className="card-dark rounded-2xl p-8 sm:p-10 text-center animate-fade-in"
        role="status"
        aria-live="polite"
      >
        <div className="text-6xl mb-4">🥊</div>
        <h3
          className="text-3xl font-black text-white mb-3"
          style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
        >
          {t('success.title')}
        </h3>
        <p className="text-gray-300 max-w-md mx-auto mb-6">{t('success.body')}</p>
        <a
          href="/jelentkezz"
          className="btn-primary inline-flex"
          onClick={() => setSubmitState({ status: 'idle' })}
        >
          {t('success.another')}
        </a>
      </div>
    );
  }

  const fe = submitState.fieldErrors ?? {};
  const feAny = (k: keyof ApplicationFormInput): string | undefined => fe[k];

  return (
    <form
      onSubmit={handleSubmit}
      className="card-dark rounded-2xl p-6 sm:p-8 flex flex-col gap-5 animate-fade-in"
      noValidate
    >
      {/* Honeypot: hidden from humans via tabindex=-1 and off-screen positioning. */}
      <div className="absolute opacity-0 pointer-events-none -left-[9999px]" aria-hidden="true">
        <label htmlFor="hp_company">Company</label>
        <input
          id="hp_company"
          name="hp_company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {submitState.message && submitState.status === 'error' && (
        <div
          className="bg-red-950/40 border border-brand-red text-red-200 rounded-lg px-4 py-3 text-sm"
          role="alert"
        >
          {submitState.message}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label={t('field.name.label')} error={feAny('name')} required>
          <input
            id="name"
            name="name"
            type="text"
            minLength={2}
            maxLength={80}
            required
            autoComplete="name"
            className="form-input"
          />
        </Field>

        <Field label={t('field.age.label')} error={feAny('age')} required>
          <input
            id="age"
            name="age"
            type="number"
            min={16}
            max={60}
            required
            className="form-input"
          />
        </Field>

        <Field label={t('field.city.label')} error={feAny('city')} required>
          <input
            id="city"
            name="city"
            type="text"
            minLength={2}
            maxLength={80}
            required
            autoComplete="address-level2"
            className="form-input"
          />
        </Field>

        <Field label={t('field.testSuly.label')} error={feAny('testSuly')} required>
          <select id="testSuly" name="testSuly" required className="form-input" defaultValue="">
            <option value="" disabled>
              {t('field.testSuly.placeholder')}
            </option>
            <option value="lightweight">≤ 70 kg</option>
            <option value="welterweight">71–77 kg</option>
            <option value="middleweight">78–84 kg</option>
            <option value="lightheavy">85–93 kg</option>
            <option value="heavyweight">94+ kg</option>
          </select>
        </Field>
      </div>

      <Field label={t('field.sportMult.label')} error={feAny('sportMult')} required>
        <input
          id="sportMult"
          name="sportMult"
          type="text"
          maxLength={500}
          placeholder={t('field.sportMult.placeholder')}
          required
          className="form-input"
        />
      </Field>

      <Field label={t('field.motivation.label')} error={feAny('motivation')} required>
        <textarea
          id="motivation"
          name="motivation"
          rows={5}
          minLength={20}
          maxLength={1500}
          placeholder={t('field.motivation.placeholder')}
          required
          className="form-input resize-y min-h-[120px]"
        />
      </Field>

      <Field
        label={t('field.videoOrSocialUrl.label')}
        error={feAny('videoOrSocialUrl')}
        required
        hint={t('field.videoOrSocialUrl.hint')}
      >
        <input
          id="videoOrSocialUrl"
          name="videoOrSocialUrl"
          type="url"
          maxLength={500}
          placeholder="https://www.youtube.com/watch?v=…"
          required
          className="form-input"
          onBlur={(e) => {
            if (e.target.value && !isVideoOrSocialUrl(e.target.value)) {
              e.target.setCustomValidity(t('error.videoOrSocialUrl.invalid'));
            } else {
              e.target.setCustomValidity('');
            }
          }}
        />
      </Field>

      {/* Additional social media links for reality show personality assessment */}
      <div className="border-t border-brand-dark-border pt-5 mt-2">
        <p className="text-sm text-gray-400 mb-4 font-semibold">{t('field.socialLinks.sectionLabel')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label={t('field.instagramUrl.label')} error={feAny('instagramUrl')} hint={t('field.instagramUrl.hint')}>
            <input
              id="instagramUrl"
              name="instagramUrl"
              type="url"
              maxLength={500}
              placeholder="https://instagram.com/username"
              className="form-input"
            />
          </Field>

          <Field label={t('field.tiktokUrl.label')} error={feAny('tiktokUrl')} hint={t('field.tiktokUrl.hint')}>
            <input
              id="tiktokUrl"
              name="tiktokUrl"
              type="url"
              maxLength={500}
              placeholder="https://tiktok.com/@username"
              className="form-input"
            />
          </Field>

          <Field label={t('field.youtubeUrl.label')} error={feAny('youtubeUrl')} hint={t('field.youtubeUrl.hint')}>
            <input
              id="youtubeUrl"
              name="youtubeUrl"
              type="url"
              maxLength={500}
              placeholder="https://youtube.com/@channel"
              className="form-input"
            />
          </Field>

          <Field label={t('field.facebookUrl.label')} error={feAny('facebookUrl')} hint={t('field.facebookUrl.hint')}>
            <input
              id="facebookUrl"
              name="facebookUrl"
              type="url"
              maxLength={500}
              placeholder="https://facebook.com/username"
              className="form-input"
            />
          </Field>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field
          label={t('field.email.label')}
          error={feAny('email')}
          required
          hint={t('field.email.hint')}
        >
          <input
            id="email"
            name="email"
            type="email"
            minLength={5}
            maxLength={120}
            placeholder={t('field.email.placeholder')}
            required
            autoComplete="email"
            className="form-input"
            onBlur={(e) => {
              if (e.target.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value)) {
                e.target.setCustomValidity(t('error.email.invalid'));
              } else {
                e.target.setCustomValidity('');
              }
            }}
          />
        </Field>

        <Field
          label={t('field.phone.label')}
          error={feAny('phone')}
          required
          hint={t('field.phone.hint')}
        >
          <input
            id="phone"
            name="phone"
            type="tel"
            minLength={7}
            maxLength={20}
            placeholder={t('field.phone.placeholder')}
            required
            autoComplete="tel"
            className="form-input"
            onBlur={(e) => {
              if (e.target.value && !/^\+?[0-9 ()-]{7,20}$/.test(e.target.value)) {
                e.target.setCustomValidity(t('error.phone.invalid'));
              } else {
                e.target.setCustomValidity('');
              }
            }}
          />
        </Field>
      </div>

      {/* GDPR consent — gate the submit button. */}
      <div className="border border-brand-dark-border rounded-xl px-4 py-3 bg-brand-dark/40">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="gdprConsent"
            checked={gdprAccepted}
            onChange={(e) => setGdprAccepted(e.target.checked)}
            className="mt-1 w-5 h-5 accent-brand-red"
            required
          />
          <span className="text-sm text-gray-300 leading-snug">
            {t('gdpr.consent')}
            {gdprAccepted && (
              <span className="block text-xs text-brand-gold mt-1">{t('gdpr.acceptedAt')}</span>
            )}
          </span>
        </label>
        {feAny('gdprConsent') && (
          <p className="text-xs text-brand-red mt-2 ml-8">{feAny('gdprConsent')}</p>
        )}
      </div>

      {/* Cloudflare Turnstile — silently renders nothing when no site key. */}
      <Turnstile ref={turnstileRef} siteKey={turnstileSiteKey} />

      <button
        type="submit"
        disabled={submitState.status === 'submitting' || !gdprAccepted}
        className="btn-primary w-full text-lg py-5 flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {submitState.status === 'submitting' ? (
          <>
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" />
            </svg>
            {t('submit.sending')}
          </>
        ) : (
          t('submit.label')
        )}
      </button>
    </form>
  );
}

function Field({
  label,
  error,
  required,
  hint,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-gray-300">
        {label}
        {required && <span className="text-brand-red ml-1">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      {error && (
        <p className="text-xs text-brand-red" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
