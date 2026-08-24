'use client';

/**
 * EFU Contact Form (Kapcsolat page).
 *
 * Self-contained: client validation, honeypot, optional Turnstile widget,
 * submit -> /api/contact. Locale passed in from the page; field labels +
 * messages come from the `contact` namespace messages object.
 *
 * Mirrors the structure of `ApplicationForm.tsx` on purpose — same UX,
 * same Turnstile wiring, same SubmitState shape, same success card — so
 * future workers (i18n, admin triage, L0 spam-tweak) see one consistent
 * pattern across both public-facing forms.
 */

import { useState, useRef, FormEvent } from 'react';
import { sendGAEvent } from './GoogleAnalytics';
import {
  validateContact,
  CONTACT_SUBJECTS,
  isContactEmail,
  isContactSubject,
  type ContactFormInput,
  type ContactValidationError,
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
  fieldErrors?: Partial<Record<keyof ContactFormInput, string>>;
}

export function ContactForm({ locale, messages, turnstileSiteKey }: Props) {
  const t = (key: string): string => messages[key] ?? key;
  const turnstileRef = useRef<TurnstileHandle | null>(null);

  const [submitState, setSubmitState] = useState<SubmitState>({ status: 'idle' });
  const [gdprAccepted, setGdprAccepted] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);

    const payload: ContactFormInput & { turnstileToken?: string | null } = {
      name: String(fd.get('name') ?? ''),
      email: String(fd.get('email') ?? ''),
      subject: String(fd.get('subject') ?? ''),
      message: String(fd.get('message') ?? ''),
      gdprConsent: gdprAccepted,
      hp_company: String(fd.get('hp_company') ?? ''),
      turnstileToken: turnstileRef.current?.getToken() ?? null,
    };

    // Client-side guard: bypass server round-trip for obvious problems.
    const errors: ContactValidationError[] = validateContact(payload);
    if (errors.length > 0) {
      const fieldErrors: Partial<Record<keyof ContactFormInput, string>> = {};
      for (const err of errors) {
        fieldErrors[err.field] = t(`error.${err.message}`);
      }
      setSubmitState({ status: 'error', message: t('error.summary'), fieldErrors });
      return;
    }

    setSubmitState({ status: 'submitting' });

    try {
      const resp = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, locale }),
      });
      const data = (await resp.json()) as {
        ok: boolean;
        id?: string;
        errors?: ContactValidationError[];
        message?: string;
      };

      if (!resp.ok || !data.ok) {
        const fieldErrors: Partial<Record<keyof ContactFormInput, string>> = {};
        for (const err of data.errors ?? []) {
          fieldErrors[err.field] = t(`error.${err.message}`);
        }
        setSubmitState({
          status: 'error',
          message: data.message ?? t('error.summary'),
          fieldErrors,
        });
        turnstileRef.current?.reset();
        return;
      }

      setSubmitState({ status: 'success', message: data.id });
      sendGAEvent('contact_submit', { submission_id: data.id, locale });
      form.reset();
      setGdprAccepted(false);
    } catch {
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
        <div className="text-6xl mb-4">✉️</div>
        <h3
          className="text-3xl font-black text-white mb-3"
          style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
        >
          {t('success.title')}
        </h3>
        <p className="text-gray-300 max-w-md mx-auto mb-3">{t('success.body')}</p>
        {submitState.message && (
          <p className="text-xs text-gray-500 mb-6">
            {t('success.reference')} <span className="font-mono text-gray-400">{submitState.message}</span>
          </p>
        )}
        <a
          href="/kapcsolat"
          className="btn-primary inline-flex"
          onClick={() => setSubmitState({ status: 'idle' })}
        >
          {t('success.another')}
        </a>
      </div>
    );
  }

  const fe = submitState.fieldErrors ?? {};
  const feAny = (k: keyof ContactFormInput): string | undefined => fe[k];

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

        <Field label={t('field.email.label')} error={feAny('email')} required>
          <input
            id="email"
            name="email"
            type="email"
            maxLength={120}
            required
            autoComplete="email"
            className="form-input"
            onBlur={(e) => {
              if (e.target.value && !isContactEmail(e.target.value)) {
                e.target.setCustomValidity(t('error.email.invalid'));
              } else {
                e.target.setCustomValidity('');
              }
            }}
          />
        </Field>
      </div>

      <Field label={t('field.subject.label')} error={feAny('subject')} required>
        <select
          id="subject"
          name="subject"
          required
          className="form-input"
          defaultValue=""
        >
          <option value="" disabled>
            {t('field.subject.placeholder')}
          </option>
          {CONTACT_SUBJECTS.map((s) => (
            <option key={s} value={s}>
              {t(`field.subject.option.${s}`)}
            </option>
          ))}
        </select>
      </Field>

      <Field label={t('field.message.label')} error={feAny('message')} required>
        <textarea
          id="message"
          name="message"
          rows={6}
          minLength={20}
          maxLength={2000}
          placeholder={t('field.message.placeholder')}
          required
          className="form-input resize-y min-h-[140px]"
        />
      </Field>

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