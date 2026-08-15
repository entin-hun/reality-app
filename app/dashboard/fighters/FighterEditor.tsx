'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FighterPhotoUploader } from './FighterForm';

type Initial = {
  slug: string;
  name: string;
  nickname: string;
  country: string;
  intro: string;
  story: string;
  weightClass: string;
  hometown: string;
  gym: string;
  dob: string;
  heightCm: string;
  reachCm: string;
  stance: string;
  photo: string;
  recordWins: string;
  recordLosses: string;
  recordDraws: string;
  recordKos: string;
  recordSubmissions: string;
  efuPath: string;
  videos: string;
  published: string;
  sortOrder: string;
  // ApplicationForm fields (admin mode)
  age: string;
  city: string;
  testSuly: string;
  sportMult: string;
  motivation: string;
  videoOrSocialUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
  facebookUrl: string;
  email: string;
  phone: string;
};

/**
 * Fighter editor form — client component because we need:
 *   - client-side validation feedback
 *   - photo upload (multipart)
 *   - inline success/error banners
 *   - call the corresponding POST /api/dashboard/fighters[/slug] endpoint
 *
 * For the v1 admin (L3-FIGHTERS-PUBLIC) we use plain <input> + <textarea>
 * fields rather than a rich-text editor. The L6 card (admin UI) can swap
 * in TinyMCE / Lexical later — the API surface stays identical.
 */
export function FighterEditor({
  mode,
  initial,
}: {
  mode: 'create' | 'edit';
  initial: Initial;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photo, setPhoto] = useState(initial.photo);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setSuccess(null);
    setErrors({});
    const fd = new FormData(e.currentTarget);

    const url =
      mode === 'create'
        ? '/api/dashboard/fighters'
        : `/api/dashboard/fighters/${encodeURIComponent(initial.slug)}`;

    try {
      const res = await fetch(url, { method: 'POST', body: fd });
      const body = (await res.json()) as
        | { ok: true; slug: string }
        | { ok: false; errors?: Record<string, string>; reason?: string; error?: string };
      if (!res.ok || !('slug' in body)) {
        if (body && 'errors' in body && body.errors) {
          setErrors(body.errors);
        } else {
          setErrors({
            _root:
              body && 'reason' in body && body.reason
                ? body.reason
                : (body && 'error' in body && body.error) || `HTTP ${res.status}`,
          });
        }
      } else {
        setSuccess('Harcos elmentve.');
        if (mode === 'create') {
          router.push(`/dashboard/fighters/${body.slug}`);
        } else {
          router.refresh();
        }
      }
    } catch (err) {
      setErrors({
        _root: err instanceof Error ? err.message : 'Ismeretlen hiba',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="card-dark rounded-2xl p-6 space-y-6"
      encType="multipart/form-data"
    >
      {success && (
        <div className="text-xs text-emerald-400 bg-emerald-900/20 border border-emerald-800 rounded p-3">
          {success}
        </div>
      )}
      {errors._root && (
        <div className="text-xs text-red-400 bg-red-900/20 border border-red-800 rounded p-3">
          {errors._root}
        </div>
      )}

      {/* Photo + slug row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <FighterPhotoUploader
          slug={initial.slug}
          value={photo}
          onChange={setPhoto}
        />
        {/* Hidden mirror field — the form submits `photo` via FormData. */}
        <input type="hidden" name="photo" value={photo} />
        <div className="space-y-2">
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-gray-500">
              URL slug
            </span>
            <input
              type="text"
              name="slug"
              defaultValue={initial.slug}
              readOnly={mode === 'edit'}
              placeholder="pl. kovacs-peter"
              className="block w-full mt-1 px-3 py-2 bg-brand-dark-card border border-brand-dark-border rounded text-white text-sm"
            />
            {errors.slug && (
              <p className="text-xs text-red-400 mt-1">{errors.slug}</p>
            )}
            <p className="text-[10px] text-gray-600 mt-1">
              A slug az URL része (/harcosok/<strong>kovacs-peter</strong>).
              Szerkesztésnél nem módosítható.
            </p>
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-gray-500">
              Ország (pl. 🇭🇺 HU)
            </span>
            <input
              type="text"
              name="country"
              defaultValue={initial.country}
              className="block w-full mt-1 px-3 py-2 bg-brand-dark-card border border-brand-dark-border rounded text-white text-sm"
            />
            {errors.country && (
              <p className="text-xs text-red-400 mt-1">{errors.country}</p>
            )}
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-gray-500">
              Sorrend (kisebb = előbb jelenik meg)
            </span>
            <input
              type="number"
              name="sortOrder"
              defaultValue={initial.sortOrder}
              className="block w-full mt-1 px-3 py-2 bg-brand-dark-card border border-brand-dark-border rounded text-white text-sm"
            />
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="published"
              defaultChecked={initial.published === 'on'}
              className="h-4 w-4"
            />
            <span className="text-xs uppercase tracking-widest text-gray-500">
              Publikálva (megjelenik a nyilvános listán)
            </span>
          </label>
        </div>
      </div>

      {/* Basic contact info (from ApplicationForm) */}
      <Section title="Alapadatok (jelentkezési űrlap)" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField
          name="age"
          label="Életkor"
          type="number"
          defaultValue={initial.age}
        />
        <InputField
          name="city"
          label="Város"
          type="text"
          defaultValue={initial.city}
        />
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-gray-500">
            Testsúly kategória
          </span>
          <select
            name="testSuly"
            defaultValue={initial.testSuly}
            className="block w-full mt-1 px-3 py-2 bg-brand-dark-card border border-brand-dark-border rounded text-white text-sm"
          >
            <option value="">–</option>
            <option value="lightweight">≤ 70 kg</option>
            <option value="welterweight">71–77 kg</option>
            <option value="middleweight">78–84 kg</option>
            <option value="lightheavy">85–93 kg</option>
            <option value="heavyweight">94+ kg</option>
          </select>
          {errors.testSuly && (
            <p className="text-xs text-red-400 mt-1">{errors.testSuly}</p>
          )}
        </label>
        <InputField
          name="sportMult"
          label="Sport múltja"
          type="text"
          defaultValue={initial.sportMult}
        />
      </div>

      <Field label="Motiváció" error={errors.motivation}>
        <textarea
          name="motivation"
          defaultValue={initial.motivation}
          rows={4}
          className="block w-full px-3 py-2 bg-brand-dark-card border border-brand-dark-border rounded text-white text-sm"
        />
      </Field>

      <Field label="Videó / közösségi link" error={errors.videoOrSocialUrl}>
        <input
          type="url"
          name="videoOrSocialUrl"
          defaultValue={initial.videoOrSocialUrl}
          placeholder="https://youtube.com/..."
          className="block w-full px-3 py-2 bg-brand-dark-card border border-brand-dark-border rounded text-white text-sm"
        />
      </Field>

      {/* Social media links */}
      <Section title="Közösségi média" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField
          name="instagramUrl"
          label="Instagram"
          type="url"
          defaultValue={initial.instagramUrl}
          placeholder="https://instagram.com/..."
        />
        <InputField
          name="tiktokUrl"
          label="TikTok"
          type="url"
          defaultValue={initial.tiktokUrl}
          placeholder="https://tiktok.com/@..."
        />
        <InputField
          name="youtubeUrl"
          label="YouTube"
          type="url"
          defaultValue={initial.youtubeUrl}
          placeholder="https://youtube.com/..."
        />
        <InputField
          name="facebookUrl"
          label="Facebook"
          type="url"
          defaultValue={initial.facebookUrl}
          placeholder="https://facebook.com/..."
        />
      </div>

      {/* Contact info */}
      <Section title="Kapcsolat" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField
          name="email"
          label="Email"
          type="email"
          defaultValue={initial.email}
        />
        <InputField
          name="phone"
          label="Telefon"
          type="tel"
          defaultValue={initial.phone}
        />
      </div>

      {/* Localized name/nickname/intro/story/weightClass/hometown/gym */}
      <Section title="Azonosítók + szövegek (soronként: hu: ..., en: ..., sk: ..., stb.)" />
      <FieldGrid
        rows={[
          { name: 'name', label: 'Név', value: initial.name },
          { name: 'nickname', label: 'Becenév', value: initial.nickname },
          { name: 'intro', label: 'Bemutatkozás (rövid, HTML engedélyezett)', value: initial.intro, multiline: true },
          { name: 'story', label: 'Történet (hosszú, HTML)', value: initial.story, multiline: true },
          { name: 'weightClass', label: 'Súlycsoport (profil)', value: initial.weightClass },
          { name: 'hometown', label: 'Szülőváros (profil)', value: initial.hometown },
          { name: 'gym', label: 'Edzőterem (profil)', value: initial.gym },
        ]}
        errors={errors}
      />

      {/* Physical + bio */}
      <Section title="Fizikai / biográfia" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InputField
          name="dob"
          label="Születési dátum"
          type="date"
          defaultValue={initial.dob}
        />
        <InputField
          name="heightCm"
          label="Magasság (cm)"
          type="number"
          defaultValue={initial.heightCm}
        />
        <InputField
          name="reachCm"
          label="Hatótáv (cm)"
          type="number"
          defaultValue={initial.reachCm}
        />
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-gray-500">
            Állás
          </span>
          <select
            name="stance"
            defaultValue={initial.stance}
            className="block w-full mt-1 px-3 py-2 bg-brand-dark-card border border-brand-dark-border rounded text-white text-sm"
          >
            <option value="">–</option>
            <option value="orthodox">Orthodox</option>
            <option value="southpaw">Southpaw</option>
            <option value="switch">Switch</option>
          </select>
          {errors.stance && (
            <p className="text-xs text-red-400 mt-1">{errors.stance}</p>
          )}
        </label>
      </div>

      {/* Record */}
      <Section title="Mérleg" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <InputField
          name="recordWins"
          label="Győzelmek"
          type="number"
          defaultValue={initial.recordWins}
        />
        <InputField
          name="recordLosses"
          label="Vereségek"
          type="number"
          defaultValue={initial.recordLosses}
        />
        <InputField
          name="recordDraws"
          label="Döntetlenek"
          type="number"
          defaultValue={initial.recordDraws}
        />
        <InputField
          name="recordKos"
          label="Kiütések"
          type="number"
          defaultValue={initial.recordKos}
        />
        <InputField
          name="recordSubmissions"
          label="Megadások"
          type="number"
          defaultValue={initial.recordSubmissions}
        />
      </div>

      {/* EFU path */}
      <Section
        title="EFU út (soronként: dátum | stage | hu-cím || hu-leírás | en-cím || en-leírás)"
      />
      <textarea
        name="efuPath"
        defaultValue={initial.efuPath}
        rows={6}
        placeholder={'2026-07-17|reality|hu-EFU Reality 2026 || <p>2026 nyarán csatlakozott.</p>\n2026-09-12|fight_night|en-EFU Fight Night || <p>Első gála.</p>'}
        className="block w-full px-3 py-2 bg-brand-dark-card border border-brand-dark-border rounded text-white text-sm font-mono"
      />

      {/* Videos */}
      <Section
        title="Videók (soronként: youtube|mp4 | URL | hu=cím | en=cím)"
      />
      <textarea
        name="videos"
        defaultValue={initial.videos}
        rows={4}
        placeholder={'youtube|https://youtu.be/abc123xyz|hu=Edzés|en=Training'}
        className="block w-full px-3 py-2 bg-brand-dark-card border border-brand-dark-border rounded text-white text-sm font-mono"
      />

      <div className="flex gap-3 pt-4 border-t border-brand-dark-border">
        <button
          type="submit"
          disabled={busy}
          className="gradient-red text-white font-bold uppercase text-sm px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {busy ? 'Mentés...' : 'Mentés'}
        </button>
        <button
          type="reset"
          disabled={busy}
          className="text-xs uppercase tracking-widest font-bold text-gray-400 hover:text-white border border-brand-dark-border hover:border-gray-500 rounded-lg px-4 py-2.5 transition-colors"
        >
          Visszaállítás
        </button>
      </div>
    </form>
  );
}

function Section({ title }: { title: string }) {
  return (
    <h2
      className="text-xs uppercase tracking-widest text-gray-500 font-bold border-b border-brand-dark-border pb-2"
    >
      {title}
    </h2>
  );
}

function FieldGrid({
  rows,
  errors,
}: {
  rows: Array<{
    name: string;
    label: string;
    value: string;
    multiline?: boolean;
  }>;
  errors: Record<string, string>;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {rows.map((row) =>
        row.multiline ? (
          <label key={row.name} className="block md:col-span-2">
            <span className="text-xs uppercase tracking-widest text-gray-500">
              {row.label}
            </span>
            <textarea
              name={row.name}
              defaultValue={row.value}
              rows={5}
              className="block w-full mt-1 px-3 py-2 bg-brand-dark-card border border-brand-dark-border rounded text-white text-sm font-mono"
            />
            {errors[row.name] && (
              <p className="text-xs text-red-400 mt-1">{errors[row.name]}</p>
            )}
          </label>
        ) : (
          <label key={row.name} className="block">
            <span className="text-xs uppercase tracking-widest text-gray-500">
              {row.label}
            </span>
            <input
              type="text"
              name={row.name}
              defaultValue={row.value}
              className="block w-full mt-1 px-3 py-2 bg-brand-dark-card border border-brand-dark-border rounded text-white text-sm"
            />
            {errors[row.name] && (
              <p className="text-xs text-red-400 mt-1">{errors[row.name]}</p>
            )}
          </label>
        ),
      )}
    </div>
  );
}

function InputField({
  name,
  label,
  type,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  type: string;
  defaultValue: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-gray-500">
        {label}
      </span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="block w-full mt-1 px-3 py-2 bg-brand-dark-card border border-brand-dark-border rounded text-white text-sm"
      />
    </label>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-gray-500">
        {label}
      </span>
      {children}
      {error && (
        <p className="text-xs text-red-400 mt-1">{error}</p>
      )}
    </label>
  );
}
