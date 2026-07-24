# EFU - Elite Fight Universe

MMA reality show és harcművészeti események weboldala.

## 🚀 Technológiák

- **Framework**: Next.js 14.2.3 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 3.4.1
- **i18n**: next-intl (9 nyelv: hu, en, de, fr, es, it, pt, ru, zh)
- **Storage**: JSON file-based CMS
- **Auth**: Cookie-based role system

## 📦 Telepítés

```bash
# Függőségek telepítése
npm install

# Fejlesztői szerver indítása (port 3000)
npm run dev

# Production build
npm run build

# Production szerver indítása
npm start
```

## 🗂️ Projekt struktúra

```
mma-stream/
├── app/                    # Next.js App Router oldalak
│   ├── [locale]/          # i18n oldalak (hu, en, stb.)
│   ├── admin/             # Admin felület
│   │   ├── cms/pages/     # CMS oldal szerkesztő
│   │   ├── fighters/      # Harcosok kezelése
│   │   └── users/         # Felhasználó kezelés
│   ├── harcosok/          # Publikus harcos lista
│   ├── reality/           # Reality show oldal
│   └── rolunk/            # Rólunk oldal
├── components/            # React komponensek
│   ├── logos/            # SVG logo komponensek
│   └── ui/               # UI komponensek (Badge, Skeleton, stb.)
├── data/cms/             # JSON adatbázis
│   ├── pages/            # Oldalak tartalma
│   └── media/            # Média fájlok
├── lib/                  # Utility függvények
│   ├── fighters.ts       # Harcosok kezelése
│   └── i18n.ts           # Nemzetköziesítés
├── messages/             # Fordítások (9 nyelv)
└── public/logos/         # SVG logo fájlok
```

## 👥 Felhasználói szerepkörök

A rendszer 6 különböző szerepkört támogat:

1. **Rendszeradminisztrator** - Teljes hozzáférés mindenhez
2. **Producer** - Fight Night és Reality tartalmak szerkesztése
3. **Reality szerkeszto** - Csak Reality tartalmak
4. **Tartalomkeszito** - Általános tartalom szerkesztés
5. **Marketing** - Marketing anyagok kezelése
6. **Moderator** - Felhasználók és hozzászólások moderálása

### Felhasználók hozzáadása

1. Lépj az `/admin/users` oldalra (rendszergazdaként)
2. Válaszd ki a kívánt szerepkört
3. Másold ki az aktiváló parancsot
4. A felhasználó nyissa meg a böngésző F12 konzolját
5. Illessze be és futtassa le a parancsot
6. Frissítse az oldalt (F5)

## 📝 Tartalom kezelése

### Oldalak szerkesztése

1. Lépj az `/admin/cms/pages` oldalra
2. Válaszd ki a szerkeszteni kívánt oldalt
3. Szerkeszd a tartalmat (szöveg, képek, videók)
4. Mentsd el a változtatásokat

### Harcosok kezelése

1. Lépj az `/admin/fighters` oldalra
2. Kattints az "Új harcos" gombra
3. Töltsd ki az adatokat (név, becenév, statisztika, kép)
4. Töltsd fel a harcos képét
5. Mentsd el

### Képek feltöltése

- Támogatott formátumok: JPG, PNG, WebP, SVG
- Maximális méret: 5MB
- A képek automatikusan optimalizálódnak

## 🌍 Nemzetköziesítés (i18n)

A weboldal 9 nyelvet támogat:
- Magyar (hu) - alapértelmezett
- Angol (en) - fallback
- Német (de)
- Francia (fr)
- Spanyol (es)
- Olasz (it)
- Portugál (pt)
- Orosz (ru)
- Kínai (zh)

### Fordítások szerkesztése

A fordítások a `messages/[locale]/application.json` fájlokban találhatók.

## 🎨 Design rendszer

### Színek

- **Primary Red**: `#DC2626` (brand-red)
- **Gold**: `#F59E0B` (brand-gold)
- **Dark**: `#0A0A0A` (brand-dark)
- **Dark Muted**: `#1A1A1A` (brand-dark-muted)

### Tipográfia

- **Főcímek**: Impact, Arial Black
- **Szöveg**: Inter, system-ui
- **Kód**: JetBrains Mono

### Animációk

- Scroll reveal animációk (Intersection Observer)
- Hover effektek
- Loading skeleton komponensek
- Reduced motion támogatás

## 🔧 Fejlesztés

### Új oldal hozzáadása

1. Hozd létre az oldalt az `app/[locale]/` mappában
2. Add hozzá a navigációhoz a `components/Navbar.tsx` fájlban
3. Frissítsd a `sitemap.ts` fájlt
4. Add hozzá a fordításokat a `messages/` mappába

### Új komponens létrehozása

1. Hozd létre a komponenst a `components/` mappában
2. Használj TypeScript típusokat
3. Implementáld a responsive design-t (mobile-first)
4. Add hozzá az accessibility attribútumokat (aria-*, role)

### SVG logók

Az SVG logók a `components/logos/` mappában találhatók:
- `FightNightLogo.tsx`
- `RealityLogo.tsx`
- `EliteFightUniverseLogo.tsx`
- `FightTVLogo.tsx`

Használat:
```tsx
import { FightNightLogo } from '@/components/logos';

<FightNightLogo width={250} height={125} />
```

## 🚢 Deployment

### Vercel (ajánlott)

1. Pushold a kódot GitHub-ra
2. Importáld a projektet Vercel-re
3. Állítsd be a környezeti változókat
4. Deploy

### Saját szerver

```bash
# Build létrehozása
npm run build

# Production szerver indítása
npm start -p 3000 -H 0.0.0.0
```

### Környezeti változók

Hozz létre egy `.env.local` fájlt:

```env
# Opcionális: Stripe fizetés
STRIPE_SECRET_KEY=your-stripe-secret-key-here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key-here

# Opcionális: Analytics
ANALYTICS_ENABLED=true
```

## 📊 SEO

A projekt automatikusan generálja:
- `robots.txt` - Keresőrobotok irányítása
- `sitemap.xml` - Oldalak listája keresőmotoroknak
- Open Graph meta tagek - Social media megosztás

## 🔒 Biztonság

- Cookie-based authentication
- Role-based access control
- CORS védelem
- Rate limiting (API végpontokon)

## 📱 Responsive design

A weboldal mobile-first elven készült:
- **Mobile**: 360px+
- **Tablet**: 768px+
- **Desktop**: 1024px+
- **Large**: 1280px+

## 🐛 Hibaelhárítás

### CSS nem tölt be
- Hard refresh: `Ctrl + Shift + R` (Windows/Linux) vagy `Cmd + Shift + R` (Mac)
- Töröld a böngésző gyorsítótárát
- Indítsd újra a dev szervert: `npm run dev`

### Build hiba
- Töröld a `.next` mappát: `rm -rf .next`
- Töröld a `node_modules`-t: `rm -rf node_modules`
- Telepítsd újra a függőségeket: `npm install`
- Futtasd újra a buildet: `npm run build`

### Harcosok nem jelennek meg
- Ellenőrizd a `data/cms/fighters/` mappát
- Győződj meg róla, hogy a JSON fájlok érvényesek
- Ellenőrizd a konzol hibákat (F12)

## 📞 Támogatás

Ha problémád van:
1. Ellenőrizd a konzol hibákat (F12)
2. Nézd meg a `data/cms/` mappában az adatokat
3. Ellenőrizd a build logokat

## 📄 Licensz

Private project - All rights reserved

---

**Verzió**: 1.0.0  
**Utolsó frissítés**: 2026-07-12

