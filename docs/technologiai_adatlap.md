# EFU Technológiai Adatlap

**Dátum:** 2026. augusztus 12.
**Verzió:** 1.0
**Projekt:** Elite Fight Universe digitális platform

---

## 1. Frontend keretrendszer

| Termék | Verzió | Licenc | Üzemeltetés | Cserélhetőség |
|--------|--------|--------|-------------|---------------|
| Next.js | 14.2.3 | MIT | Saját szerver / Vercel | Magas — bármely React-alapú SSR keretre cserélhető |
| React | 18.x | MIT | Frontend bundle | Magas — standard React API |
| TypeScript | 5.x | Apache-2.0 | Build-time | Magas — JavaScript-re visszafejthető |
| Tailwind CSS | 3.4.1 | MIT | Frontend bundle | Közepes — más CSS framework-re átírható |

## 2. Backend / API

| Termék | Verzió | Licenc | Üzemeltetés | Cserélhetőség |
|--------|--------|--------|-------------|---------------|
| Next.js API Routes | 14.2.3 | MIT | Saját szerver | Magas — bármely Node.js szerverre átírható |
| next-intl | 3.26.0 | MIT | Frontend + backend | Közepes — más i18n megoldásra cserélhető |

## 3. Adattárolás

| Termék | Verzió | Licenc | Üzemeltetés | Cserélhetőség |
|--------|--------|--------|-------------|---------------|
| JSON fájl-alapú CMS | — | Saját fejlesztés | Saját szerver (fájlrendszer) | Magas — bármely adatbázisra cserélhető (PostgreSQL, MongoDB, stb.) |

**Megjegyzés:** A jelenlegi JSON-alapú tároló az I. fázis gyors indulását szolgálja. A skálázhatóság érdekében a II. fázisban vagy azt követően ajánlott relációs vagy dokumentum-adatbázisra váltani.

## 4. CMS / Tartalomszerkesztő

| Termék | Verzió | Licenc | Felhasználási cél | Függőség |
|--------|--------|--------|-------------------|----------|
| BlockNote | 0.52.1 | MIT | Struktúra-alapú tartalomszerkesztő | Közvetlen |
| TipTap | 3.29.0 | MIT | BlockNote szerkesztő motorja | Közvetlen (BlockNote függvény) |
| Ariakit | 0.4.25 | MIT | BlockNote UI komponensek | Közvetlen (BlockNote függvény) |
| GrapesJS (open-source) | 0.22.16 | BSD-3 | Vizuális WYSIWYG szerkesztő | Közvetlen |

## 5. Videó / Streaming

| Termék | Verzió | Licenc | Felhasználási cél | Függőség |
|--------|--------|--------|-------------------|----------|
| hls.js | 1.5.13 | Apache-2.0 | HLS stream lejátszás | Közvetlen |

**Megjegyzés:** A stream szolgáltató (Wowza, Cloudflare Stream, MUX, stb.) kiválasztása a Megrendelő feladata. A hls.js standard HLS protokollt támogat, bármely HLS-kompatibilis szolgáltatóval működik.

## 6. Fizetés / Előfizetés

| Termék | Verzió | Licenc | Üzemeltetés | Külső díj |
|--------|--------|--------|-------------|-----------|
| Stripe Checkout | — | Proprietárius | Stripe Inc. (USA) | Tranzakciónkénti díj Stripe szerint |
| Stripe Webhooks | — | Proprietárius | Stripe Inc. (USA) | — |

**Megjegyzés:** A Stripe fiók létrehozása és a díjak megfizetése a Megrendelő feladata. A bankkártya-adatok soha nem érintik a saját szervert.

## 7. Ikonok / UI

| Termék | Verzió | Licenc | Felhasználási cél | Függőség |
|--------|--------|--------|-------------------|----------|
| lucide-react | 0.379.0 | ISC | Ikonok | Közvetlen |
| clsx | 2.1.1 | MIT | CSS osztály kombinálás | Közvetlen |
| tailwind-merge | 3.6.0 | MIT | Tailwind osztály ütközés kezelés | Közvetlen |

## 8. Egyéb

| Termék | Verzió | Licenc | Felhasználási cél | Függőség |
|--------|--------|--------|-------------------|----------|
| uuid | 14.0.1 | MIT | Egyedi azonosítók | Közvetlen |
| qrcode.react | 3.1.0 | ISC | QR kód generálás | Közvetlen |
| sharp | 0.35.3 | Apache-2.0 | Képfeldolgozás (build-time) | Közvetlen (devDependency) |

## 9. Infrastruktúra

| Szolgáltatás | Szolgáltató | Helyszín | Megjegyzés |
|--------------|-------------|----------|------------|
| Szerver / tárhely | TBD (Megrendelő dönt) | EU/EGT ajánlott | A Megrendelő biztosítja |
| Domain | TBD | — | elitefightuniverse.com |
| CDN | TBD | — | Opcionális, ajánlott a stream miatt |
| E-mail | TBD | EU/EGT ajánlott | Értesítések, jelszó-helyreállítás |
| Analitika | TBD | — | Alap mérőszámok bekötése |

## 10. Fejlesztői környezet

| Eszköz | Verzió | Megjegyzés |
|--------|--------|------------|
| Node.js | 20.x LTS | Futtató környezet |
| npm | 10.x | Csomagkezelő |
| Git | — | Verziókezelés |
| VS Code | — | Fejlesztői szerkesztő |

---

**Jelmagyarázat:**
- **TBD** = To Be Decided (Megrendelő döntése alapján)
- **EU/EGT** = Európai Unió / Európai Gazdasági Térség (adatvédelmi szempontból preferált)
