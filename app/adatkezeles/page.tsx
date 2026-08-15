import { redirect } from 'next/navigation';

/** @deprecated The reviewed legal notice is maintained at /legal/privacy. */
export default function AdatkezelesPage() {
  redirect('/legal/privacy');
  /* Legacy markup intentionally retained below until the next content cleanup. */
  return (
    <div className="min-h-screen bg-brand-dark text-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-black mb-8 text-center uppercase" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
          Adatkezelési Tájékoztató
        </h1>

        <div className="space-y-8 text-gray-300 leading-relaxed">
          {/* 1. Fejezet */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Az adatkezelés célja és jogalapja</h2>
            <p className="mb-4">
              Az Elite Fight Union (a továbbiakban: &quot;Adatkezelő&quot;) elkötelezett az Ön személyes adatainak védelme iránt. 
              Ez az adatkezelési tájékoztató tájékoztatást nyújt arról, hogy hogyan gyűjtjük, kezeljük és védjük személyes adatait, 
              amikor látogatja weboldalunkat (elitefightclub.eu), regisztrál eseményeinkre, vagy felvesz velünk a kapcsolatot.
            </p>
            <p>
              Az adatkezelés jogalapja az Európai Unió Általános Adatvédelmi Rendelete (GDPR) 6. cikk (1) bekezdésének a) pontja 
              (beleegyezés), b) pontja (szerződés teljesítés), és f) pontja ( jogosult érdek).
            </p>
          </section>

          {/* 2. Fejezet */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Személyes adatok gyűjtése</h2>
            <p className="mb-4">Személyes adatokat kizárólag önkéntes hozzájárulása alapján gyűjtünk. Az alábbi esetekben kérünk adatmegadásra:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
<li><strong className="text-white">Regisztráció eseményekre:</strong> Név, e-mail cím, telefonszám, testtömeg az jegyzés és belépés érdekében.</li>
              <li><strong className="text-white">Hírlevél feliratkozás:</strong> E-mail cím a hírlevelek küldése érdekében.</li>
              <li><strong className="text-white">Kapcsolatfelvétel:</strong> Név, e-mail cím, telefon, üzenet tartalma.</li>
              <li><strong className="text-white">Jegyvásárlás:</strong> Név, e-mail cím, telefonszám, fizetési adatok (ezeket közvetlen fizetési szolgáltatók kezelik).</li>
              <li><strong className="text-white">Versenyforgalmazás:</strong> Sportoló adatai (név, súlycsoport, eredmények, fotók/videók).</li>
            </ul>
          </section>

          {/* 3. Fejezet */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Az adatok kezelése és kezelése</h2>
            <p className="mb-4">
              Az Adatkezelő kötelezettséget vállal arra, hogy az Ön személyes adatait a legmagasabb szabványoknak megfelelően kezeli, 
              védi és titokban tartja. Az adatkezelés főbb elemei:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Az adatok kizárólag meghatározott célra történő felhasználása.</li>
              <li>Az adatok harmadik féllel csak kifejezett hozzájárulásával vagy jogszabályi kötelezettség alapján kerülnek megosztásra.</li>
              <li>Az adatok biztonságos tárolása technikai és szervezési intézkedésekkel védett rendszerekben.</li>
              <li>Az adatok kizárólag jogosult személyek számára hozzáférhetők.</li>
            </ul>
          </section>

          {/* 4. Fejezet */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Az adatok forrása</h2>
            <p className="mb-4">
              Személyes adatait kizárólag önállóan gyűjtjük az alábbi csatornákon keresztül:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Weboldalunkon elérhető űrlapok (regisztráció, kapcsolatfelvétel, hírlevél)</li>
              <li>Eseményeinken történő személyes regisztráció</li>
              <li>E-mailben vagy telefonon közölt adatok</li>
              <li>Szociális média felületeken történő kommunikáció</li>
            </ul>
            <p>
              Az Adatkezelő kizárólag saját adatait dolgozza fel. Harmadik féltől származó adatokat kizárólag abban az esetben 
              kezel, ha azt az érintett kifejezetten jóváhagyta, vagy azt jogszabály írja elő.
            </p>
          </section>

          {/* 5. Fejezet */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Az adatok tárolása</h2>
            <p className="mb-4">
              Az Ön személyes adatait kizárólag addig tároljuk, amíg az szükséges a fenti célok eléréséhez, vagy amíg azt 
              jogszabály előírja. A tárolás időtartama:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong className="text-white">Regisztrációs adatok:</strong> Az esemény után 5 év (adózási törvényi előírás)</li>
              <li><strong className="text-white">Hírlevél feliratkozások:</strong> Amíg a feliratkozás nem vonódik vissza</li>
              <li><strong className="text-white">Kapcsolatfelvételi adatok:</strong> 3 év a kapcsolatfelvétel után</li>
              <li><strong className="text-white">Fizetési adatok:</strong> A tranzakció után 7 év (adózási törvényi előírás)</li>
            </ul>
          </section>

          {/* 6. Fejezet */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Az adatok továbbítása és megosztása</h2>
            <p className="mb-4">
              Az Adatkezelő kötelezettséget vállal arra, hogy az Ön személyes adatait harmadik féllel kizárólag az alábbi 
              esetekben osztja meg:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong className="text-white">Fizetési szolgáltatók:</strong> Jegyvásárlás esetén a fizetési adatokat közvetlenül a fizetési szolgáltató (pl. Stripe) kezeli, az Adatkezelő nem fér hozzá.</li>
              <li><strong className="text-white">Logisztikai partnerek:</strong> Ajándékcsomag küldése esetén a címadatok kizárólag a szállítási szolgáltatás érdekében használhatók.</li>
              <li><strong className="text-white">Hatóságok:</strong> Kizárólag jogszabályi kötelezettség vagy hatósági felszólítás esetén.</li>
              <li><strong className="text-white">Média partnerek:</strong> Fotók/videók kizárólag akkor kerülnek nyilvánosságra, ha az érintett írásbeli beleegyezését adta.</li>
            </ul>
          </section>

          {/* 7. Fejezet */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Az érintett jogai</h2>
            <p className="mb-4">Az alábbi jogokkal rendelkezik a személyes adatai vonatkozásában:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong className="text-white">Tájékoztatáshoz való jog:</strong> Kérheti személyes adatai kezelésének részleteit.</li>
              <li><strong className="text-white">Helyesbítési jog:</strong> Kérheti helytelen vagy pontatlan adatai javítását.</li>
              <li><strong className="text-white">Törléshez való jog:</strong> Kérheti adatai törlését, ha azok kezelése nem szükséges.</li>
              <li><strong className="text-white">Korlátozáshoz való jog:</strong> Kérheti adatai kezelésének korlátozását.</li>
              <li><strong className="text-white">Hordozhatósági jog:</strong> Kérheti adatai strukturált, géppel olvasható formátumban történő átadását.</li>
              <li><strong className="text-white">Ellenzési jog:</strong> Kérheti adatai kezelése elleni tiltakozást, különösen közvetlen üzletszerzés esetén.</li>
              <li><strong className="text-white">Beleegyezés visszavonása:</strong> Bármikor visszavonhatja hozzájárulását, anélkül, hogy ez befolyásolná a hozzájárulás előtt végzett adatkezelés jogszerűségét.</li>
            </ul>
          </section>

          {/* 8. Fejezet */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. Automatikus döntéshozatal</h2>
            <p>
              Az Adatkezelő nem alkalmaz automatizált döntéshozatalt vagy profilkészítést az Ön személyes adatai alapján.
            </p>
          </section>

          {/* 9. Fejezet */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. Cookie-k és követési technikák</h2>
            <p className="mb-4">
              Weboldalunk cookie-kat és hasonló technológiákat használ a felhasználói élmény optimalizálása érdekében. 
              A cookie-k használatához kifejezett hozzájárulást kérünk. A cookie-kkal kapcsolatos részletes információkért 
              kérjük, tekintse meg a Cookie Szabályzatot.
            </p>
            <p>
              Használhatunk analitikai cookie-kat a weboldal-használat statisztikai elemzésére, valamint marketing cookie-kat 
              a személyre szabott hirdetések megjelenítésére.
            </p>
          </section>

          {/* 10. Fejezet */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">10. Biztonsági intézkedések</h2>
            <p className="mb-4">
              Az Adatkezelő a személyes adatok védelme érdekében minden tőle elvárható intézkedést megtesz, beleértve:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Technikai biztonsági intézkedések (titkosítás, tűzfalak, rendszeres biztonsági frissítések)</li>
              <li>Szervezési intézkedések (tisztviselői kiképzés, hozzáférés-kezelés, munkavállalói titoktartási szerződések)</li>
              <li>Folyamatos felügyelet és auditálás</li>
            </ul>
          </section>

          {/* 11. Fejezet */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">11. Panaszkezelés</h2>
            <p className="mb-4">
              Amennyiben panasa van az Adatkezelő tevékenységével kapcsolatban, az alábbi módon fordulhat hozzánk:
            </p>
            <p className="mb-4">
              <strong className="text-white">E-mail:</strong> privacy@elitefightclub.eu<br />
              <strong className="text-white">Postai cím:</strong> Elite Fight Union, Budapest, Magyarország
            </p>
            <p>
              Panasz esetén lehetőség van az Nemzeti Adatvédelmi és Információszabadság Hatóság (NAIH) felé is fordulásra:
            </p>
            <p>
              <a href="https://www.naih.hu" target="_blank" rel="noopener noreferrer" className="text-brand-red hover:underline">
                https://www.naih.hu
              </a>
            </p>
          </section>

          {/* 12. Fejezet */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">12. Záró rendelkezések</h2>
            <p className="mb-4">
              Jelen adatkezelési tájékoztató az Európai Unió Általános Adatvédelmi Rendelete (GDPR), valamint a 
              Magyarország vonatkozó adatvédelmi törvényei alapján készült.
            </p>
            <p>
              Az Adatkezelő fenntartja a jogot, hogy jelen adatkezelési tájékoztatót módosítsa. A módosításról az 
              érintetteket e-mailben vagy a weboldalon történő közzététellel értesíti.
            </p>
          </section>

          {/* Frissítés dátuma */}
          <div className="mt-12 pt-8 border-t border-gray-700 text-sm text-gray-500">
            <p>Utolsó frissítés: {new Date().toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
