'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const ROLES = [
  { id: 'Rendszeradminisztrator', name: 'Rendszeradminisztrátor', color: 'red', icon: '👑' },
  { id: 'Producer', name: 'Producer', color: 'gold', icon: '🎬' },
  { id: 'Reality_szerkeszto', name: 'Reality szerkesztő', color: 'blue', icon: '📺' },
  { id: 'Tartalomkeszito', name: 'Tartalomkészítő', color: 'green', icon: '✍️' },
  { id: 'Marketing', name: 'Marketing', color: 'purple', icon: '📢' },
  { id: 'Moderator', name: 'Moderátor', color: 'gray', icon: '🛡️' },
];

type AuthStatus =
  | { status: 'loading' }
  | { status: 'authenticated'; email: string | null; role: string; mappedRole: string | null }
  | { status: 'cf_authed_no_role'; email: string | null; mappedRole: string | null }
  | { status: 'unauthenticated' };

export default function AdminLoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [auth, setAuth] = useState<AuthStatus>({ status: 'loading' });

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) {
          setAuth({ status: 'authenticated', email: data.email, role: data.role, mappedRole: data.mappedRole });
          router.push('/admin');
        } else if (data.reason === 'no_role') {
          // If the sysadmin mapped this email in cf-roles.json, auto-set cookie & redirect
          if (data.mappedRole) {
            document.cookie = `efu_role=${data.mappedRole}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
            router.push('/admin');
            return;
          }
          setAuth({ status: 'cf_authed_no_role', email: data.email, mappedRole: data.mappedRole });
        } else {
          setAuth({ status: 'unauthenticated' });
        }
      })
      .catch(() => setAuth({ status: 'unauthenticated' }));
  }, [router]);

  const handleLogin = () => {
    if (!selectedRole) return;
    document.cookie = `efu_role=${selectedRole}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    router.push('/admin');
  };

  const getCookieCommand = (roleId: string) => {
    return `document.cookie = "efu_role=${roleId}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax"`;
  };

  if (auth.status === 'loading') {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-brand-red border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Ellenőrzés...</p>
        </div>
      </div>
    );
  }

  if (auth.status === 'authenticated') {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-brand-red border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Bejelentkezve, átirányítás...</p>
          {auth.email && <p className="text-gray-500 text-sm mt-2">{auth.email} — {auth.role}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-black uppercase text-white mb-3" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
            Admin Belépés
          </h1>
          {auth.status === 'cf_authed_no_role' ? (
            <p className="text-gray-400 text-sm">
              Cloudflare hitelesítés sikeres <span className="text-green-400">✓</span>
              {auth.email && <span className="block text-xs text-gray-500 mt-1">{auth.email}</span>}
              <br />Válassz szerepkört a belépéshez
            </p>
          ) : (
            <p className="text-gray-400 text-sm sm:text-base">
              Válaszd ki a szerepkörödet a belépéshez
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {ROLES.map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role.id)}
              className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                selectedRole === role.id
                  ? 'border-brand-red bg-brand-red/10'
                  : 'border-brand-dark-border bg-brand-dark-muted hover:border-gray-600'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl">{role.icon}</span>
                <div className="flex-1">
                  <h3 className="text-white font-bold text-lg mb-1">{role.name}</h3>
                  <p className="text-gray-500 text-xs">
                    {role.id === 'Rendszeradminisztrator' && 'Teljes hozzáférés'}
                    {role.id === 'Producer' && 'Fight Night + Reality'}
                    {role.id === 'Reality_szerkeszto' && 'Csak Reality tartalmak'}
                    {role.id === 'Tartalomkeszito' && 'Általános tartalom'}
                    {role.id === 'Marketing' && 'Marketing anyagok'}
                    {role.id === 'Moderator' && 'Felhasználók moderálása'}
                  </p>
                </div>
                {selectedRole === role.id && (
                  <span className="text-brand-red text-2xl">✓</span>
                )}
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleLogin}
          disabled={!selectedRole}
          className={`w-full py-4 rounded-xl font-bold text-lg uppercase tracking-wider transition-all duration-200 ${
            selectedRole
              ? 'bg-brand-red hover:bg-red-700 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          Belépés
        </button>

        <div className="mt-8 text-center">
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="text-gray-400 hover:text-white text-sm underline transition-colors"
          >
            {showInstructions ? 'Bezárás' : 'Manuális belépés (F12 konzol)'}
          </button>

          {showInstructions && (
            <div className="mt-4 p-4 bg-brand-dark-muted rounded-xl border border-brand-dark-border text-left">
              <p className="text-gray-300 text-sm mb-3">
                Ha a fenti gomb nem működik, nyisd meg a böngésző konzolját (F12) és futtasd le ezt a parancsot:
              </p>
              <div className="space-y-3">
                {ROLES.map((role) => (
                  <div key={role.id} className="flex flex-col gap-1">
                    <span className="text-gray-400 text-xs font-semibold">{role.name}:</span>
                    <code className="block p-2 bg-black/50 rounded text-xs text-brand-gold font-mono break-all">
                      {getCookieCommand(role.id)}
                    </code>
                  </div>
                ))}
              </div>
              <p className="text-gray-500 text-xs mt-3">
                A parancs futtatása után frissítsd az oldalt (F5).
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <a href="/" className="text-gray-400 hover:text-white text-sm transition-colors">
            ← Vissza a főoldalra
          </a>
        </div>
      </div>
    </div>
  );
}
