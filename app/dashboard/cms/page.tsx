/**
 * /dashboard/cms — landing page for the CMS section.
 * Redirects to the only existing sub-route (pages).
 */

import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function CmsLandingPage() {
  redirect('/dashboard/cms/pages');
}
