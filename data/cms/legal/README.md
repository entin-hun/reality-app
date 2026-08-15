# EFU jogi dokumentumok — szerkesztési és jóváhagyási napló

Az oldalon megjelenő jogi tervezetek forrása jelenleg:

- `lib/legal/content.ts`
- `/legal/terms`
- `/legal/privacy`
- `/legal/cookies`
- `/legal/imprint`

## Kötelező jogi felülvizsgálat közzététel előtt

1. A szolgáltató megadott adatai már szerepelnek a dokumentumokban; a közzététel előtt cégkivonattal, valamint a Cloudflare-szerződéssel ellenőrizze őket, és töltse ki az összes megmaradt `[szögletes zárójelben]` lévő mezőt.
2. Ellenőrizze a tényleges értékesítési modellt (egyszeri szezonbérlet, előfizetés, jegy, területi korlátozás), az elállási folyamatot és a Stripe Checkoutban használt nyilatkozatokat.
3. Állítsa össze az adatfeldolgozók és önálló adatkezelők végleges listáját; rögzítse a tárhely-, e-mail-, Cloudflare-, Stripe-, analitikai és videószolgáltatók szerepét, országát és adattovábbítási garanciáját.
4. Élesítés előtt cookie-szkenneléssel egészítse ki a cookie-tájékoztatót minden ténylegesen letöltődő harmadik fél cookie-jával.
5. Fordíttassa és jogilag ellenőriztesse a nem magyar nyelvű teljes szöveget. Addig az alkalmazás egyértelműen jelzi, hogy a magyar munkaverzió az irányadó.

## Verziónapló

- 2026-08-15 — Első jogi munkatervezet: ÁSZF, adatkezelés, cookie-tájékoztató, impresszum; technikai cookie-hozzájárulási felület beépítve.
