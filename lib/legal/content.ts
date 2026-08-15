import type { Locale } from '@/lib/i18n';

export type LegalDocumentId = 'terms' | 'privacy' | 'cookies' | 'imprint';

export type LegalSection = { heading: string; paragraphs?: string[]; bullets?: string[] };
export type LegalDocument = {
  title: string;
  effectiveDate: string;
  reviewNotice: string;
  sections: LegalSection[];
};

/**
 * Working legal copy. The bracketed values must be verified and completed by
 * the controller's legal adviser before publication as a final policy.
 * Keeping it in source control makes the text reviewable and CMS-editable.
 */
const hu: Record<LegalDocumentId, LegalDocument> = {
  terms: {
    title: 'Általános Szerződési Feltételek',
    effectiveDate: '[hatálybalépés dátuma]',
    reviewNotice: 'JOGI FELÜLVIZSGÁLATRA VÁRÓ TERVEZET. A szögletes zárójelben szereplő adatokat a Szolgáltató és jogi képviselője köteles kitölteni és jóváhagyni a közzététel előtt.',
    sections: [
      { heading: '1. Szolgáltató és a feltételek hatálya', paragraphs: ['A szolgáltató és kiadó neve: Elite Fight Club Kft.; székhelye: 1071 Budapest, Damjanich utca 39. 4. em. 3. ajtó; cégjegyzékszáma: 01 09 456986; adószáma: 33060329-2-42; képviseletre jogosult/aláíró: Essam Fathy Hassan Aslam; e-mail: elitefightclubkft@gmail.com; telefonszám: +36 20 395 1687 (a továbbiakban: Szolgáltató).', 'A feltételek az Elite Fight Universe weboldalán, digitális közvetítéseinek, szezonbérleteinek és egyéb, a megrendelési felületen megjelölt digitális szolgáltatásainak igénybevételére irányadóak. Fogyasztó az önálló foglalkozásán és gazdasági tevékenységén kívül eljáró természetes személy.'] },
      { heading: '2. Szerződéskötés és a szolgáltatás', paragraphs: ['A megrendelő a rendelési felületen megadott lépések elvégzésével, a fizetési kötelezettséggel járó megrendelés jóváhagyásával tesz ajánlatot. A szerződés a Szolgáltató elektronikus visszaigazolásával jön létre. A rendelés előtt a megrendelő javíthatja az adatbeviteli hibákat.', 'A szolgáltatás pontos tartalmát, időtartamát, technikai feltételeit, árát és az esetleges hozzáférési korlátait a megrendelési oldal és a visszaigazolás rögzíti. A közvetítések időpontja vagy programja indokolt esetben változhat; erről a Szolgáltató észszerű időben tájékoztat.'] },
      { heading: '3. Díj, fizetés és számla', paragraphs: ['Az árak a megrendelési oldalon magyar forintban, az alkalmazandó adókkal együtt szerepelnek. A fizetés a Szolgáltató által megjelölt fizetési szolgáltatón, jelenleg Stripe-on keresztül történhet. A bankkártya-adatokat a Szolgáltató nem kezeli.', 'A Szolgáltató a számlát a vonatkozó számviteli és adójogi szabályok szerint állítja ki. A bérlet vagy digitális hozzáférés csak a sikeres fizetés után aktiválható.'] },
      { heading: '4. Elállás digitális szolgáltatás esetén', paragraphs: ['Fogyasztói szerződésnél a fogyasztót főszabály szerint 14 napos elállási/felmondási jog illeti meg. Nem tárgyi adathordozón nyújtott digitális tartalom vagy digitális szolgáltatás esetén a jog elveszhet, ha a teljesítés a fogyasztó kifejezett előzetes beleegyezésével kezdődött meg, és a fogyasztó tudomásul vette a jog elvesztését. A megrendelési folyamatnak ezt külön, nem előre bejelölt nyilatkozattal kell rögzítenie.', 'A joggyakorlás módját, címzettjét és a mintanyilatkozatot a Szolgáltató a megrendelés előtt és tartós adathordozón a visszaigazolásban is rendelkezésre bocsátja. A jogi tanácsadó feladata annak ellenőrzése, hogy az adott értékesítési modellre mely kivétel alkalmazható.'] },
      { heading: '5. Felhasználói fiók és megengedett használat', bullets: ['A hozzáférés személyes; jelszó, belépési adat vagy közvetítés jogosulatlan megosztása tilos.', 'Tilos a szolgáltatás technikai védelmének megkerülése, a közvetítés jogosulatlan rögzítése, továbbközvetítése vagy kereskedelmi felhasználása.', 'A Szolgáltató biztonsági okból ideiglenesen korlátozhatja a hozzáférést, és arányos intézkedést alkalmazhat visszaélés esetén.'] },
      { heading: '6. Kellékszavatosság, panasz és vitarendezés', paragraphs: ['A fogyasztót a kötelező jogszabályi kellékszavatossági és digitális tartalomra/digitális szolgáltatásra vonatkozó jogok megilletik. Panasz az elitefightclubkft@gmail.com e-mail-címen, illetve postai úton a 1071 Budapest, Damjanich utca 39. 4. em. 3. ajtó címen nyújtható be. A Szolgáltató a panaszt a jogszabály szerinti határidőben válaszolja meg.', 'A fogyasztó lakóhelye szerinti békéltető testülethez, fogyasztóvédelmi hatósághoz vagy bírósághoz fordulhat. A konkrét békéltető testületi adatok és az esetleges online vitarendezési kötelezettségek közzétételét jogász ellenőrizze.'] },
      { heading: '7. Felelősség és záró rendelkezések', paragraphs: ['A Szolgáltató a kötelező fogyasztóvédelmi rendelkezéseket nem korlátozza. Nem felel olyan üzemzavarért, amely az ésszerű ellenőrzési körén kívül esik, de annak elhárításán és a tájékoztatáson észszerűen dolgozik.', 'A jelen feltételekre a magyar jog irányadó, a fogyasztók kötelező jogszabályi védelmének sérelme nélkül. A Szolgáltató a feltételek módosítását előre közzéteszi; a már létrejött szerződésekre a szerződéskötéskor hatályos feltételek irányadóak, kivéve ha jogszabály vagy a fogyasztó számára kedvezőbb módosítás másként rendelkezik.'] },
    ],
  },
  privacy: {
    title: 'Adatkezelési tájékoztató', effectiveDate: '[hatálybalépés dátuma]', reviewNotice: 'JOGI FELÜLVIZSGÁLATRA VÁRÓ TERVEZET. A címzetteket, a tényleges adatáramlást és a megőrzési időket DPO/jogi tanácsadó ellenőrizze.',
    sections: [
      { heading: '1. Adatkezelő és kapcsolat', paragraphs: ['Adatkezelő: Elite Fight Club Kft. Székhely: 1071 Budapest, Damjanich utca 39. 4. em. 3. ajtó. Cégjegyzékszám: 01 09 456986. Adószám: 33060329-2-42. Képviseletre jogosult/aláíró: Essam Fathy Hassan Aslam. Kapcsolat: elitefightclubkft@gmail.com, +36 20 395 1687. Az Adatkezelő adatvédelmi tisztviselőt nem jelölt ki; adatvédelmi kapcsolattartó: Essam Fathy Hassan Aslam, elitefightclubkft@gmail.com.'] },
      { heading: '2. Kezelt adatok, célok és jogalapok', bullets: ['Kapcsolatfelvétel: név, e-mail, üzenet és az ügy intézéséhez szükséges további adat; jogalap: GDPR 6. cikk (1) bekezdés f) pont, jogos érdek a megkeresések megválaszolásához.', 'Megrendelés és digitális hozzáférés: név, e-mail, rendelési és hozzáférési adatok; jogalap: GDPR 6. cikk (1) bekezdés b) pont, szerződés teljesítése.', 'Számlázás és jogi kötelezettségek: számlázási adatok, tranzakciós adatok; jogalap: GDPR 6. cikk (1) bekezdés c) pont.', 'Hírlevél vagy marketing: e-mail és hozzájárulási napló; jogalap: GDPR 6. cikk (1) bekezdés a) pont. A hozzájárulás bármikor visszavonható.', 'Nem szükséges cookie-k: az adott cookie-kategória adatai; jogalap: hozzájárulás.'] },
      { heading: '3. Címzettek és adattovábbítás', paragraphs: ['Az adatokhoz a feladatukhoz szükséges mértékben az Adatkezelő erre jogosult munkatársai és szerződéses szolgáltatói férhetnek hozzá. Az alkalmazás futtatásához és hálózati kiszolgálásához igénybe vett infrastruktúraszolgáltató: Cloudflare, Inc., 101 Townsend Street, San Francisco, CA 94107, USA (Cloudflare Workers). További tipikus címzettek: e-mail-szolgáltató, fizetési szolgáltató (Stripe), számlázó, ügyfélszolgálati és informatikai szolgáltató. A végleges listát, szerepkört (adatfeldolgozó/önálló adatkezelő), országot és szerződéses garanciát a közzététel előtt ki kell tölteni.', 'EU/EGT-n kívüli továbbítás csak megfelelő GDPR-garanciával történhet; ilyen lehet az Európai Bizottság megfelelőségi határozata vagy a standard szerződéses kikötések.'] },
      { heading: '4. Megőrzési idők', bullets: ['Kapcsolatfelvételi ügyek: [megőrzési idő/jogosérdek-mérlegelés] lejártáig.', 'Szerződéses és számlázási iratok: az alkalmazandó számviteli, adó- és elévülési szabályok szerinti időtartamig.', 'Hozzájáruláson alapuló marketing: visszavonásig vagy [időszakos felülvizsgálati idő] elteltéig.', 'Rendszer- és biztonsági naplók: főszabály szerint 90 napig, kivéve ha incidensvizsgálat vagy jogi igény hosszabb megőrzést indokol.'] },
      { heading: '5. Az érintett jogai és jogorvoslat', paragraphs: ['Az érintett kérheti a hozzáférést, helyesbítést, törlést, az adatkezelés korlátozását, adathordozhatóságot, és jogos érdeken alapuló kezelés ellen tiltakozhat. A hozzájárulás visszavonása nem érinti a visszavonás előtti kezelés jogszerűségét. Kérését a fenti kapcsolattartási címen nyújthatja be.', 'Panasz tehető a Nemzeti Adatvédelmi és Információszabadság Hatóságnál (1055 Budapest, Falk Miksa utca 9–11.; naih.hu), valamint az érintett bírósághoz fordulhat.'] },
      { heading: '6. Biztonság, incidens és automatizált döntés', paragraphs: ['Az Adatkezelő megfelelő technikai és szervezési intézkedéseket alkalmaz. Személyesadat-incidens esetén a vonatkozó eljárásrend szerint jár el; a fejlesztési megállapodás szerinti technikai incidensjelzés 12 órán belül történik az illetékes felek felé. Az adatfeldolgozói körből való törlés a szerződésben rögzített 90 napos határidő szerint történhet, ha jogszabály más megőrzést nem követel.', 'A jelenlegi tervezet szerint nincs kizárólag automatizált döntéshozatal vagy profilalkotás, amely az érintettre nézve joghatással járna. Ezt a tényleges rendszerek fényében felül kell vizsgálni.'] },
    ],
  },
  cookies: {
    title: 'Cookie-tájékoztató', effectiveDate: '[hatálybalépés dátuma]', reviewNotice: 'JOGI FELÜLVIZSGÁLATRA VÁRÓ TERVEZET. A közzétételkor a tényleges cookie-kat cookie-szkenneléssel össze kell vetni ezzel a táblázattal.',
    sections: [
      { heading: '1. Mi a cookie?', paragraphs: ['A cookie kis adatfájl, amelyet a böngésző tárol. Egyes cookie-k a weboldal működéséhez szükségesek, mások statisztikai vagy marketingcélokat szolgálhatnak.'] },
      { heading: '2. Kategóriák és jogalap', bullets: ['Szükséges cookie-k: a weboldal alapvető működését, például a nyelvi beállítást vagy a hozzájárulási döntés megjegyzését biztosítják. Ezekhez nem kérünk hozzájárulást.', 'Statisztikai cookie-k: a használat összesített mérését szolgálják; csak hozzájárulás után aktiválhatók.', 'Marketing cookie-k: személyre szabott hirdetést vagy közösségi/marketingmérést támogatnak; csak hozzájárulás után aktiválhatók.'] },
      { heading: '3. Jelenleg használt technológiák', paragraphs: ['A jelenlegi alkalmazás a NEXT_LOCALE cookie-val a választott nyelvet, az efu_cookie_consent cookie-val a cookie-döntést tárolja. Ezek szükséges beállítási cookie-k. Az élesítés előtt minden harmadik félhez (különösen Stripe, Cloudflare, videó- és analitikai szolgáltató) tartozó cookie nevét, szolgáltatóját, célját, lejáratát és országát ellenőrizni kell.', 'A nem szükséges kategóriákhoz tartozó szkriptek nem tölthetők be a felhasználó előzetes hozzájárulása előtt. A hozzájárulás elutasítása nem akadályozhatja a szükséges cookie-k működését.'] },
      { heading: '4. Beállítások és visszavonás', paragraphs: ['A látogató a cookie-sávon keresztül elfogadhatja, elutasíthatja vagy kategóriánként beállíthatja a nem szükséges cookie-kat. Döntése bármikor módosítható a weboldal láblécében található „Cookie-beállítások” hivatkozással. A böngészőben is törölhetők vagy letilthatók a cookie-k, ami egyes funkciók működését érintheti.'] },
    ],
  },
  imprint: {
    title: 'Impresszum', effectiveDate: '[közzététel dátuma]', reviewNotice: 'JOGI FELÜLVIZSGÁLATRA VÁRÓ TERVEZET. A megadott cég- és infrastruktúraszolgáltatói adatokat közzététel előtt a vonatkozó szerződéssel és cégadatokkal ellenőrizni kell.',
    sections: [
      { heading: 'Szolgáltató és kiadó adatai', bullets: ['Név: Elite Fight Club Kft.', 'Székhely és levelezési cím: 1071 Budapest, Damjanich utca 39. 4. em. 3. ajtó', 'Cégjegyzékszám: 01 09 456986', 'Adószám: 33060329-2-42', 'Képviseletre jogosult/aláíró: Essam Fathy Hassan Aslam', 'E-mail: elitefightclubkft@gmail.com', 'Telefon: +36 20 395 1687'] },
      { heading: 'Infrastruktúraszolgáltató', paragraphs: ['Az alkalmazás Cloudflare Workers infrastruktúrán fut. Szolgáltató: Cloudflare, Inc., 101 Townsend Street, San Francisco, CA 94107, USA; weboldal: cloudflare.com.'] },
      { heading: 'Panaszkezelés és fogyasztóvédelem', paragraphs: ['Panasz benyújtása: elitefightclubkft@gmail.com vagy 1071 Budapest, Damjanich utca 39. 4. em. 3. ajtó. A fogyasztó a lakóhelye vagy tartózkodási helye szerint illetékes békéltető testülethez, a fogyasztóvédelmi hatósághoz vagy bírósághoz fordulhat. Az itt megjelölt szervek, kapcsolatok és esetleges szakmai felügyelet adatait a Szolgáltató jogi helyzetének megfelelően ki kell tölteni.'] },
      { heading: 'Szerzői jog', paragraphs: ['A weboldal tartalma – eltérő jelölés hiányában – a Szolgáltató vagy jogosultjai tulajdona. Engedély nélküli másolása, terjesztése vagy nyilvános közlése tilos.'] },
    ],
  },
};

const labels: Record<Locale, Record<LegalDocumentId, string>> = {
  hu: { terms: 'Általános Szerződési Feltételek', privacy: 'Adatkezelési tájékoztató', cookies: 'Cookie-tájékoztató', imprint: 'Impresszum' },
  en: { terms: 'Terms and Conditions', privacy: 'Privacy Notice', cookies: 'Cookie Notice', imprint: 'Imprint' }, de: { terms: 'Allgemeine Geschäftsbedingungen', privacy: 'Datenschutzhinweis', cookies: 'Cookie-Hinweis', imprint: 'Impressum' }, ar: { terms: 'الشروط والأحكام', privacy: 'إشعار الخصوصية', cookies: 'إشعار ملفات تعريف الارتباط', imprint: 'البيانات القانونية' }, sk: { terms: 'Všeobecné obchodné podmienky', privacy: 'Oznámenie o ochrane súkromia', cookies: 'Informácie o súboroch cookie', imprint: 'Tiráž' }, ro: { terms: 'Termeni și condiții', privacy: 'Informare privind confidențialitatea', cookies: 'Informare privind cookie-urile', imprint: 'Impressum' }, hr: { terms: 'Uvjeti korištenja', privacy: 'Obavijest o privatnosti', cookies: 'Obavijest o kolačićima', imprint: 'Impresum' }, sr: { terms: 'Uslovi korišćenja', privacy: 'Obaveštenje o privatnosti', cookies: 'Obaveštenje o kolačićima', imprint: 'Impresum' }, sl: { terms: 'Splošni pogoji', privacy: 'Obvestilo o zasebnosti', cookies: 'Obvestilo o piškotkih', imprint: 'Impresum' },
};

export const legalDocumentIds: LegalDocumentId[] = ['terms', 'privacy', 'cookies', 'imprint'];
export function getLegalDocument(id: LegalDocumentId, locale: Locale): LegalDocument {
  const document = hu[id];
  if (locale === 'hu') return document;
  return { ...document, title: labels[locale][id], reviewNotice: `${labels[locale][id]} — the Hungarian text below is the controlling working draft. A reviewed translation must be published before relying on this document in this language.` };
}
export function legalLabel(id: LegalDocumentId, locale: Locale) { return labels[locale][id]; }
