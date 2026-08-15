# EFU Komponensjegyzék

**Dátum:** 2026. augusztus 12.
**Verzió:** 1.0
**Melléklet:** 1. számú melléklet 12.1. szakasz

---

## Összefoglaló

A jelen dokumentum a projektben használt összes harmadik féltől származó és nyílt forráskódú komponenst tartalmazza. Minden komponens ismert licencű, nem korlátozza a Megrendelő tervezett felhasználását.

**Összes komponens:** 40
**Közvetlen függőségek:** 40
**Közvetett függőségek:** ~200+ (npm transitive dependencies)

---

## Közvetlen függőségek (production)

| Komponens | Verzió | Forrás | Licenc | Felhasználási cél | Típus | Közzétételi kötelezettség |
|-----------|--------|--------|--------|-------------------|-------|---------------------------|
| @ariakit/react-core | 0.4.25 | npm | MIT | BlockNote UI komponensek | Közvetlen | Nincs (MIT megengedő) |
| @blocknote/ariakit | 0.52.1 | npm | MIT | BlockNote Ariakit integráció | Közvetlen | Nincs |
| @blocknote/core | 0.52.1 | npm | MIT | Struktúra-alapú szerkesztő motor | Közvetlen | Nincs |
| @blocknote/react | 0.52.1 | npm | MIT | BlockNote React komponensek | Közvetlen | Nincs |
| @grapesjs/studio-sdk | 1.1.1 | npm | BSD-3 | Vizuális WYSIWYG szerkesztő | Közvetlen | Nincs |
| @tiptap/extension-character-count | 3.29.0 | npm | MIT | TipTap karakterszámláló | Közvetlen | Nincs |
| @tiptap/extension-color | 3.29.0 | npm | MIT | TipTap színkezelés | Közvetlen | Nincs |
| @tiptap/extension-highlight | 3.29.0 | npm | MIT | TipTap kiemelés | Közvetlen | Nincs |
| @tiptap/extension-image | 3.29.0 | npm | MIT | TipTap kép beágyazás | Közvetlen | Nincs |
| @tiptap/extension-link | 3.29.0 | npm | MIT | TipTap link kezelés | Közvetlen | Nincs |
| @tiptap/extension-placeholder | 3.29.0 | npm | MIT | TipTap helyőrző szöveg | Közvetlen | Nincs |
| @tiptap/extension-text-align | 3.29.0 | npm | MIT | TipTap szöveg igazítás | Közvetlen | Nincs |
| @tiptap/extension-text-style | 3.29.0 | npm | MIT | TipTap szöveg stílus | Közvetlen | Nincs |
| @tiptap/extension-underline | 3.29.0 | npm | MIT | TipTap aláhúzás | Közvetlen | Nincs |
| @tiptap/extension-youtube | 3.29.0 | npm | MIT | TipTap YouTube beágyazás | Közvetlen | Nincs |
| @tiptap/pm | 3.29.0 | npm | MIT | TipTap ProseMirror motor | Közvetlen | Nincs |
| @tiptap/react | 3.29.0 | npm | MIT | TipTap React integráció | Közvetlen | Nincs |
| @tiptap/starter-kit | 3.29.0 | npm | MIT | TipTap alap csomag | Közvetlen | Nincs |
| clsx | 2.1.1 | npm | MIT | CSS osztály kombinálás | Közvetlen | Nincs |
| hls.js | 1.6.16 | npm | Apache-2.0 | HLS videó stream lejátszás | Közvetlen | Nincs |
| lucide-react | 0.379.0 | npm | ISC | Ikon könyvtár | Közvetlen | Nincs |
| next | 14.2.3 | npm | MIT | React keretrendszer (SSR/SSG) | Közvetlen | Nincs |
| next-intl | 3.26.0 | npm | MIT | Nemzetköziesítés (i18n) | Közvetlen | Nincs |
| qrcode.react | 3.2.0 | npm | ISC | QR kód generálás | Közvetlen | Nincs |
| react | 18.3.1 | npm | MIT | UI könyvtár | Közvetlen | Nincs |
| react-dom | 18.3.1 | npm | MIT | React DOM renderelés | Közvetlen | Nincs |
| tailwind-merge | 3.6.0 | npm | MIT | Tailwind osztály ütközés kezelés | Közvetlen | Nincs |
| uuid | 14.0.1 | npm | MIT | Egyedi azonosítók | Közvetlen | Nincs |

---

## Közvetlen függőségek (development)

| Komponens | Verzió | Forrás | Licenc | Felhasználási cél | Típus | Közzétételi kötelezettség |
|-----------|--------|--------|--------|-------------------|-------|---------------------------|
| @types/node | 20.19.41 | npm | MIT | Node.js típusdefiníciók | Dev | Nincs |
| @types/react | 18.3.29 | npm | MIT | React típusdefiníciók | Dev | Nincs |
| @types/react-dom | 18.3.7 | npm | MIT | React DOM típusdefiníciók | Dev | Nincs |
| @types/uuid | 10.0.0 | npm | MIT | UUID típusdefiníciók | Dev | Nincs |
| autoprefixer | 10.5.0 | npm | MIT | CSS vendor prefix automatika | Dev | Nincs |
| eslint | 8.57.1 | npm | MIT | Kód minőség ellenőrzés | Dev | Nincs |
| eslint-config-next | 14.2.3 | npm | MIT | Next.js ESLint szabályok | Dev | Nincs |
| postcss | 8.5.15 | npm | MIT | CSS transzformáció | Dev | Nincs |
| sharp | 0.35.3 | npm | Apache-2.0 | Képfeldolgozás (build-time) | Dev | Nincs |
| svgo | 4.0.2 | npm | MIT | SVG optimalizálás | Dev | Nincs |
| tailwindcss | 3.4.19 | npm | MIT | Utility-first CSS framework | Dev | Nincs |
| typescript | 5.9.3 | npm | Apache-2.0 | Típusbiztos JavaScript | Dev | Nincs |

---

## Licenc típusok eloszlása

| Licenc | Darabszám | Megengedőség |
|--------|-----------|--------------|
| MIT | 35 | Magas — szabad felhasználás, módosítás, terjesztés |
| Apache-2.0 | 4 | Magas — szabad felhasználás, kifejezett szabadalom-engedély |
| ISC | 2 | Magas — hasonló a MIT-hez |
| BSD-3 | 1 | Magas — szabad felhasználás, 3 feltétellel |

**Összegzés:** Minden komponens megengedő licencű, nem tartalmaz copyleft (GPL, AGPL) vagy korlátozó licencet. A Megrendelő tervezett felhasználását (kereskedelmi, zárt forráskódú) egyik komponens sem korlátozza.

---

## Külső szolgáltatások (SaaS)

| Szolgáltatás | Szolgáltató | Helyszín | Adatkezelés | Megjegyzés |
|--------------|-------------|----------|-------------|------------|
| Stripe | Stripe Inc. | USA | PCI DSS Level 1 | Fizetési feldolgozás, bankkártya-adatok nem érintik a saját szervert |
| Google Fonts | Google LLC | USA | GDPR-kompatibilis | Betűtípusok (Oswald, Inter) — opcionális, saját szerverre is telepíthető |

**Megjegyzés:** A stream szolgáltató, e-mail szolgáltató, tárhely és CDN kiválasztása a Megrendelő feladata.

---

## Saját fejlesztésű komponensek

| Komponens | Típus | Licenc | Megjegyzés |
|-----------|-------|--------|------------|
| JSON-alapú CMS | Saját fejlesztés | Megrendelő tulajdona | Tartalomkezelő rendszer |
| BlockRenderer | Saját fejlesztés | Megrendelő tulajdona | CMS blokkok renderelése |
| BlockNoteEditor | Saját fejlesztés | Megrendelő tulajdona | Struktúra-alapú szerkesztő wrapper |
| GrapesJSEditor | Saját fejlesztés | Megrendelő tulajdona | Vizuális szerkesztő wrapper |
| blocksToHtml / htmlToCmsBlocks | Saját fejlesztés | Megrendelő tulajdona | GrapesJS <-> CMS konverzió |
| Auth rendszer | Saját fejlesztés | Megrendelő tulajdona | Felhasználói hitelesítés |
| Analytics rendszer | Saját fejlesztés | Megrendő tulajdona | Látogatottsági statisztikák |
| Fighter alkalmazási rendszer | Saját fejlesztés | Megrendelő tulajdona | Harcos jelentkezések kezelése |

---

## Ismeretlen vagy rendezetlen licencű komponensek

**Nincs.** Minden komponens licenc típusa ismert és megengedő.

---

## GPL vagy copyleft licencű komponensek

**Nincs.** A projekt nem tartalmaz GPL, AGPL vagy más copyleft licencű komponenst.

---

## Frissítési politika

- A függőségek rendszeres frissítése ajánlott (havonta vagy negyedévente)
- Biztonsági frissítéseket azonnal alkalmazni kell
- Major verzióváltások előtt kompatibilitási tesztelés szükséges

---

**Dokumentum vége**
