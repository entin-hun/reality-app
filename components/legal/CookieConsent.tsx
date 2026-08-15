'use client';

import { useEffect, useState } from 'react';

type Choice = { analytics: boolean; marketing: boolean };
const key = 'efu_cookie_consent';
function persist(choice: Choice) {
  document.cookie = `${key}=${encodeURIComponent(JSON.stringify({ ...choice, updatedAt: new Date().toISOString() }))}; path=/; max-age=31536000; samesite=lax`;
}

export function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  const [choice, setChoice] = useState<Choice>({ analytics: false, marketing: false });
  useEffect(() => {
    setOpen(!document.cookie.split('; ').some((c) => c.startsWith(`${key}=`)));
    const reopen = () => { setSettings(true); setOpen(true); };
    window.addEventListener('efu:cookie-settings', reopen);
    return () => window.removeEventListener('efu:cookie-settings', reopen);
  }, []);
  if (!open) return null;
  const save = (next: Choice) => { persist(next); setOpen(false); };
  return <aside className="fixed inset-x-4 bottom-4 z-[60] mx-auto max-w-2xl rounded-2xl border border-brand-dark-border bg-brand-dark-card p-5 shadow-2xl shadow-black/60" role="dialog" aria-label="Cookie settings">
    <p className="font-bold text-white">Cookie-beállítások</p>
    <p className="mt-2 text-sm leading-relaxed text-gray-300">A szükséges cookie-k az oldal működéséhez kellenek. Statisztikai és marketing cookie-t csak az Ön választása után használunk.</p>
    {settings && <div className="mt-4 space-y-3 rounded-lg bg-black/20 p-3 text-sm"><label className="flex justify-between gap-4 text-gray-300">Szükséges <input checked disabled type="checkbox" /></label><label className="flex justify-between gap-4 text-gray-300">Statisztikai <input checked={choice.analytics} onChange={(e) => setChoice({ ...choice, analytics: e.target.checked })} type="checkbox" /></label><label className="flex justify-between gap-4 text-gray-300">Marketing <input checked={choice.marketing} onChange={(e) => setChoice({ ...choice, marketing: e.target.checked })} type="checkbox" /></label></div>}
    <div className="mt-4 flex flex-wrap gap-2"><button onClick={() => save({ analytics: false, marketing: false })} className="rounded-lg border border-gray-600 px-3 py-2 text-sm text-white">Elutasítás</button><button onClick={() => setSettings(!settings)} className="rounded-lg border border-gray-600 px-3 py-2 text-sm text-white">Beállítások</button><button onClick={() => save(settings ? choice : { analytics: true, marketing: true })} className="rounded-lg bg-brand-red px-3 py-2 text-sm font-bold text-white">{settings ? 'Mentés' : 'Összes elfogadása'}</button></div>
  </aside>;
}
