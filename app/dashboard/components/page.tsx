/**
 * /dashboard/components — landing page for the component library.
 * Currently a placeholder; renders the shared ComingSoon component.
 */

import { ComingSoon } from '@/app/dashboard/components/ComingSoon';

export const dynamic = 'force-dynamic';

export default function ComponentsLandingPage() {
  return (
    <ComingSoon
      title="Komponenskönyvtár"
      description="A UI komponensek (gombok, kártyák, layoutok) központi kezelése — hamarosan elérhető."
      icon="🧩"
    />
  );
}
