'use client';

/**
 * MailerLite Universal loader — gated to public marketing pages only.
 *
 * Mounts the script + delayed `ml('show', 'CTHNsg')` popup trigger EXCEPT
 * on:
 *   - /admin*       (admin shell + subpages)
 *   - /admin-login  (login)
 *   - /dashboard*  (backoffice)
 *   - /cms-preview (preview iframe)
 *
 * Why: showing a newsletter popup while someone is editing the admin is
 * hostile UX. Cost of loading the library on public pages is one ~30 KB
 * script; on admin pages we want zero overhead and zero noise.
 *
 * Loader wires `ml('account', id)` only — it does NOT display forms. The
 * delayed `ml('show', CTHNsg)` after ~2.5s asks the library to surface
 * form CTHNsg as a popup (it'll silently no-op if CTHNsg is configured as
 * embedded-only in the MailerLite dashboard). Frequency gating is handled
 * by MailerLite's own `mailerlite_forms_shown_*` cookie per the popup's
 * dashboard config.
 */

import { usePathname } from 'next/navigation';
import Script from 'next/script';

const MAILERLITE_INLINE = `(function(w,d,e,u,f,l,n){w[f]=w[f]||function(){(w[f].q=w[f].q||[]).push(arguments);},l=d.createElement(e),l.async=1,l.src=u,n=d.getElementsByTagName(e)[0],n.parentNode.insertBefore(l,n);})(window,document,'script','https://assets.mailerlite.com/js/universal.js','ml');ml('account','2580476');setTimeout(function(){try{window.ml&&window.ml('show','CTHNsg');}catch(e){}},2500);`;

const ADMIN_PREFIXES = ['/admin', '/admin-login', '/dashboard', '/cms-preview'];

function isAdminPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return ADMIN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function MailerLiteScripts() {
  const pathname = usePathname();
  if (isAdminPath(pathname)) return null;
  return (
    <Script id="mailerlite-init" strategy="afterInteractive">
      {MAILERLITE_INLINE}
    </Script>
  );
}
