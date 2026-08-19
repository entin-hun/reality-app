/**
 * /admin-login layout — sets the page title so the browser tab is
 * identifiable ("EFU Admin — Bejelentkezés") instead of inheriting the
 * public-site title.
 */

export const metadata = {
  title: 'EFU Admin — Bejelentkezés',
  robots: { index: false, follow: false },
};

export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
