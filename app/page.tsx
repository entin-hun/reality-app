'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { LostTimerCountdown } from '@/components/LostTimerCountdown';
import { PricingCard } from '@/components/PricingCard';
import { FightCard } from '@/components/FightCard';
import { EfuPillars } from '@/components/EfuPillars';
import { EfuRuleset } from '@/components/EfuRuleset';
import { EliteFightUniverseLogo } from '@/components/logos';
import { LiveBadge } from '@/components/LiveBadge';
import { MitNyerhetsz } from '@/components/MitNyerhetsz';
import { HeroSocialRow } from '@/components/HeroSocialRow';
import { HeroYouTubeEmbed } from '@/components/HeroYouTubeEmbed';
import { FightNightLogo } from '@/components/logos';

// Countdown target: Aug 25, 2026 at 8:00 PM CEST (UTC+2)
const FIGHT_DATE = new Date('2026-08-25T20:00:00+02:00');
// Set to false to hide countdown, true to show
const SHOW_COUNTDOWN = false;

export default function HomePage() {
  const [hasPurchased, setHasPurchased] = useState(false);
  
  // Scroll reveal animációk a szekciókhoz
  const miAzEfuRef = useRef<HTMLDivElement>(null);
  const rulesetRef = useRef<HTMLDivElement>(null);
  const fightCardRef = useRef<HTMLDivElement>(null);
  const mitNyerhetszRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);
  const kuldetesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHasPurchased(localStorage.getItem('cw_access') === 'granted');
  }, []);

  // Intersection Observer a scroll reveal animációkhoz
  useEffect(() => {
    const refs = [miAzEfuRef, rulesetRef, fightCardRef, mitNyerhetszRef, pricingRef, kuldetesRef];
    const observers: IntersectionObserver[] = [];

    refs.forEach((ref) => {
      const element = ref.current;
      if (!element) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            element.classList.add('visible');
            observer.unobserve(element);
          }
        },
        { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
      );

      observer.observe(element);
      observers.push(observer);
    });

    return () => {
      observers.forEach((obs) => obs.disconnect());
    };
  }, []);

  return (
    <>
      <main className="flex flex-col">
        {/* Hero Section — Főoldal hero (L2-HERO card t_77fa2e1f)
            Acceptance criteria:
            - animated EFU logo (CSS) via <EfuLogo /> + Tailwind keyframes
            - hero video/trailer background fallback gradient + YouTube embed ready
            - 10–15s LCP target: hero content fits one viewport on 360px
            - event countdown to next EFU event (FIGHT_DATE)
            - 4 CTAs (Nézd élőben / Ismerd meg az EFU Realityt /
              Jelentkezz harcosnak / Következő Fight Night)
            - social-media row (YouTube, Twitch, Kick, TikTok, Facebook, Instagram, X, DAZN)
            - mobile-first 360px viewport
            - 9-locale i18n keys (hu default, en fallback) via useHeroMessages */}
        <section
          id="hero"
          className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden px-4 pt-24 pb-12"
          aria-labelledby="hero-heading"
        >
          {/* Background: gradient + hex grid fallback (no hero video assets yet) */}
          <div className="absolute inset-0 z-0" aria-hidden="true">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  radial-gradient(ellipse at 20% 50%, rgba(220,38,38,0.18) 0%, transparent 60%),
                  radial-gradient(ellipse at 80% 50%, rgba(245,158,11,0.08) 0%, transparent 60%),
                  linear-gradient(180deg, #0A0A0A 0%, #0D0000 50%, #0A0A0A 100%)
                `,
              }}
            />
            {/* Hexagon grid overlay */}
            <div
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23DC2626' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />
            {/* Subtle moving spotlight — animated via reduced-motion-safe CSS */}
            <div
              className="absolute inset-0 opacity-30 animate-efu-spotlight motion-reduce:animate-none"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 50% 30%, rgba(220,38,38,0.35) 0%, transparent 45%)',
              }}
            />
          </div>

          <div className="relative z-10 flex flex-col items-center text-center max-w-5xl mx-auto w-full">
            {/* Event badge row */}
            <div className="flex items-center gap-3 mb-6 flex-wrap justify-center">
              <LiveBadge live={false} />
              <span className="text-brand-gold text-xs sm:text-sm font-semibold uppercase tracking-widest">
                EFU Reality · 2026 szezon
              </span>
            </div>

            {/* EFU logo — LCP candidate (webp) */}
            <h1
              id="hero-heading"
              className="mb-3 flex justify-center"
            >
              <EliteFightUniverseLogo width={480} height={240} priority />
            </h1>

            {/* Sub-line: venue + date/time */}
            <p className="text-base sm:text-lg text-gray-300 font-medium mb-1">
              Budapest
            </p>
            <p className="text-gray-500 mb-5 text-xs sm:text-sm uppercase tracking-widest">
              2026. augusztus 3. · 10:00
            </p>

            {/* Hero eyebrow — narrative hook */}
            <p className="text-gray-300 max-w-3xl mb-7 text-sm sm:text-base leading-relaxed italic px-1">
              Új lehetőség a harcosoknak, új szint a nézőknek — élőben és visszanézhetően.
            </p>

            {/* Lost-stílusú countdown */}
            {SHOW_COUNTDOWN && <LostTimerCountdown targetDate={FIGHT_DATE} />}

            {/* CTAs — simplified for pre-launch */}
            <div className="mt-9 sm:mt-10 flex flex-col items-center gap-3 w-full">
              {/* Primary CTA — Jelentkezz */}
              <Link
                href="/jelentkezz"
                className="btn-primary text-base sm:text-lg px-8 sm:px-10 py-4 sm:py-5 inline-flex items-center gap-2 w-full sm:w-auto justify-center"
                data-cta="apply"
              >
                <span aria-hidden="true">🥊</span>
                Jelentkezz harcosnak
              </Link>

              {/* Secondary CTA — Rólunk */}
              <Link
                href="/rolunk"
                className="border border-brand-dark-border hover:border-gray-400 text-gray-200 hover:text-white font-semibold py-3.5 px-4 sm:px-5 rounded-lg transition-all duration-200 text-sm sm:text-base inline-flex items-center justify-center gap-2 w-full sm:w-auto"
                data-cta="about"
              >
                <span aria-hidden="true">ℹ️</span>
                Rólunk
              </Link>
            </div>

            {/* YouTube embed — temporarily hidden */}
            {/* <div className="mt-10 w-full max-w-3xl">
              <HeroYouTubeEmbed
                liveUrl="https://www.youtube.com/@EliteFightUniverse/live"
                channelHandle={t('homeHero.channelHandle')}
                ariaLabel={t('homeHero.ctaWatchAria')}
                hint={t('homeHero.playLiveHint')}
                liveLabel={t('homeHero.liveLabel')}
              />
            </div> */}

            {/* Social row — temporarily hidden */}
            {/* <HeroSocialRow locale={locale} /> */}
          </div>

          {/* Scroll indicator */}
          <a
            href="#mi-az-efu"
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 opacity-50 hover:opacity-90 transition-opacity motion-reduce:hidden"
            aria-label="Görgess lejjebb"
          >
            <span className="flex flex-col items-center gap-1 text-gray-400 text-[10px] uppercase tracking-widest">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
              Görgess
            </span>
          </a>
        </section>

        {/* Mi az EFU? — Intro teaser → full page on /rolunk */}
        <section id="mi-az-efu" ref={miAzEfuRef} className="reveal py-16 px-4 max-w-5xl mx-auto w-full scroll-mt-16">
          <div className="text-center mb-10">
            <p className="text-brand-red text-sm uppercase tracking-widest font-semibold mb-2">
              A koncepció
            </p>
            <h2
              className="text-4xl sm:text-5xl font-black uppercase text-white mb-4"
              style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
            >
              Mi az EFU?
            </h2>
            <p className="text-gray-300 max-w-3xl mx-auto text-sm sm:text-base leading-relaxed mb-6">
              Az Elite Fight Universe (EFU) egy harcművészeti és szórakoztatóipari ökoszisztéma,
              amely saját versenyrendszerre épülő küzdősport eseményeket, tehetségkutató formátumokat
              és digitális közvetítéseket foglal magában. Az univerzum három pillérre — a Reality-re,
              a Fight Night-ra és az EFU TV-re — épül.
            </p>
            <p className="text-gray-400 max-w-3xl mx-auto text-sm sm:text-base leading-relaxed mb-6">
              Célunk egy teljesen új megközelítés a küzdősportok világában: nem csupán versenyeket
              szervezünk, hanem egy teljes élményt teremtünk a harcosok és a közönség számára egyaránt.
              A hagyományos MMA gáláktól eltérően az EFU egy folyamatosan fejlődő történetet mesél el,
              ahol a harcosok nem csak egy-egy mérkőzésre készülnek, hanem egy teljes szezonon át
              építik a karrierjüket.
            </p>
            <Link
              href="/rolunk"
              className="inline-flex items-center gap-2 text-brand-red hover:text-red-400 font-semibold text-sm sm:text-base transition-colors"
            >
              <span>Tudj meg többet az EFU-ról</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          {/* Three pillars — full version lives at /rolunk */}
          <EfuPillars />
        </section>

        {/* EFU Ruleset teaser — full breakdown on /rolunk */}
        <section id="efu-ruleset" ref={rulesetRef} className="reveal py-16 px-4 max-w-5xl mx-auto w-full scroll-mt-16">
          <div className="text-center mb-10">
            <p className="text-brand-red text-sm uppercase tracking-widest font-semibold mb-2">
              Hogyan működik?
            </p>
            <h2
              className="text-4xl sm:text-5xl font-black uppercase text-white mb-4"
              style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
            >
              EFU Ruleset
            </h2>
            <p className="text-gray-300 max-w-3xl mx-auto text-sm sm:text-base leading-relaxed mb-6">
              Az EFU saját szabályrendszere a folyamatos akciót és a látványos küzdelmeket helyezi előtérbe.
              Két formátum — az EFU Stand-Up (csak állóharc) és az EFU Hybrid (korlátozott földharc) —
              mindkettő MMA kesztyűben, 3×3 perces menetekkel.
            </p>
            <Link
              href="/rolunk#ruleset"
              className="inline-flex items-center gap-2 text-brand-red hover:text-red-400 font-semibold text-sm sm:text-base transition-colors"
            >
              <span>Részletes szabályok</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          <EfuRuleset />
        </section>

        {/* EFU Fight Night (was: Meccskártya) */}
        <section id="fight-card" ref={fightCardRef} className="reveal py-16 px-4 max-w-5xl mx-auto w-full scroll-mt-16">
          <div className="text-center mb-10">
            <p className="text-brand-red text-sm uppercase tracking-widest font-semibold mb-2">
              Hamarosan
            </p>
            <h2
              className="text-4xl sm:text-5xl font-black uppercase text-white mb-4"
              style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
            >
              EFU Fight Night
            </h2>
            <div className="flex justify-center mb-6">
              <FightNightLogo width={200} height={100} />
            </div>
            <p className="text-gray-300 max-w-3xl mx-auto text-sm sm:text-base leading-relaxed mb-6">
              Az EFU Fight Night-ok a szervezet prémium küzdősport eseményei, ahol a legjobb
              harcosok mérkőznek meg egymással. A harcok formátuma az EFU saját szabályrendszerén
              alapul, amely a folyamatos akciót és a látványos küzdelmeket garantálja.
            </p>
            <p className="text-gray-400 max-w-2xl mx-auto text-sm leading-relaxed mb-8">
              A harcosok névsora és a meccsbeosztás jelenleg előkészítés alatt áll.
              Hamarosan bemutatjuk azokat a harcosokat, akik az EFU történetének első
              szezonjában ringbe szállnak a dicsőségért.
            </p>
          </div>
          <FightCard />
        </section>

        {/* Mit nyerhetsz? — Rewards Section — temporarily hidden */}
        {/* <section id="mit-nyerhetsz" ref={mitNyerhetszRef} className="reveal py-16 px-4 max-w-5xl mx-auto w-full scroll-mt-16">
          <MitNyerhetsz />
        </section> */}

        {/* Pricing Section — temporarily hidden */}
        {/* <section id="pricing" ref={pricingRef} className="reveal py-16 px-4 max-w-5xl mx-auto w-full scroll-mt-16">
          <div className="text-center mb-10">
            <p className="text-brand-red text-sm uppercase tracking-widest font-semibold mb-2">
              Egyszeri fizetés
            </p>
            <h2
              className="text-4xl sm:text-5xl font-black uppercase text-white mb-3"
              style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
            >
              Szezonbérlet
            </h2>
            <p className="text-gray-400 max-w-md mx-auto">
              Teljes hozzáférés minden 2026-os meccshez. Nézd élőben vagy visszanézve.
              Egyszer fizetsz, egész évben nézed.
            </p>
          </div>
          <PricingCard />
        </section> */}

        {/* Mi várható? — Coming soon section */}
        <section id="mi-varhato" className="reveal py-16 px-4 max-w-5xl mx-auto w-full scroll-mt-16">
          <div className="text-center mb-10">
            <p className="text-brand-gold text-sm uppercase tracking-widest font-semibold mb-2">
              Mi várható?
            </p>
            <h2
              className="text-4xl sm:text-5xl font-black uppercase text-white mb-6"
              style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
            >
              Építkezés alatt
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card-dark rounded-2xl p-6 text-center">
              <div className="text-4xl mb-4">🎬</div>
              <h3 className="text-xl font-bold text-white mb-3" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
                EFU Reality
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Egy reality show, ahol a harcosok a ringen kívül is megmutatják, kik ők.
                Edzések, felkészülés, személyes történetek — mindez a kamera előtt.
                <span className="block mt-2 text-brand-gold font-semibold text-xs">Hamarosan bemutatkoznak a szereplők.</span>
              </p>
            </div>
            <div className="card-dark rounded-2xl p-6 text-center">
              <div className="text-4xl mb-4">🥊</div>
              <h3 className="text-xl font-bold text-white mb-3" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
                EFU Fight Night
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                A prémium küzdősport események, ahol a legjobb harcosok mérkőznek meg.
                Saját szabályrendszer, folyamatos akció, látványos küzdelmek.
                <span className="block mt-2 text-brand-gold font-semibold text-xs">A harcosok névsora előkészítés alatt.</span>
              </p>
            </div>
            <div className="card-dark rounded-2xl p-6 text-center">
              <div className="text-4xl mb-4">📺</div>
              <h3 className="text-xl font-bold text-white mb-3" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
                EFU TV
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                A digitális közvetítési platform, ahol élőben és visszanézve is követheted
                az összes eseményt. Egy bérlettel, egész évben.
                <span className="block mt-2 text-brand-gold font-semibold text-xs">A platform fejlesztés alatt áll.</span>
              </p>
            </div>
          </div>
        </section>

        {/* Küldetésünk — closing mission block */}
        <section id="kuldetesunk" ref={kuldetesRef} className="reveal py-8 px-4 max-w-4xl mx-auto w-full scroll-mt-16">
          <div
            className="card-dark rounded-2xl p-8 sm:p-12 text-center relative overflow-hidden"
            style={{
              backgroundImage:
                'radial-gradient(ellipse at center, rgba(220,38,38,0.12) 0%, transparent 70%)',
            }}
          >
            <p className="text-brand-red text-sm uppercase tracking-widest font-semibold mb-3">
              Küldetésünk
            </p>
            <h2
              className="text-3xl sm:text-4xl md:text-5xl font-black uppercase text-white mb-6"
              style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
            >
              Egy közösség, amely összeköt
            </h2>
            <p className="text-gray-300 max-w-3xl mx-auto text-base sm:text-lg leading-relaxed mb-4">
              Az EFU célja egy olyan közép-európai harcművészeti közösség felépítése, amely összeköti
              a harcosokat, a szurkolókat és a partnereket, miközben új szintre emeli a küzdősportok
              és a digitális szórakoztatás kapcsolatát.
            </p>
            <p className="text-gray-400 max-w-3xl mx-auto text-sm sm:text-base leading-relaxed">
              Jelenleg az alapokon dolgozunk: a szabályrendszer véglegesítése, a harcosok
              kiválasztása és a platform fejlesztése zajlik. Tarts velünk az úton, és légy
              részese az EFU történetének már az első szezontól kezdve.
            </p>
            <Link
              href="/rolunk#mission"
              className="inline-flex items-center gap-2 mt-6 text-brand-red hover:text-red-400 font-semibold text-sm sm:text-base transition-colors"
            >
              <span>Teljes küldetésünk</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-brand-dark-border py-8 px-4 text-center text-gray-600 text-sm">
          <p>© 2026 Elite Fight Universe. Minden jog fenntartva.</p>
          <p className="mt-1 flex items-center justify-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-brand-red/10 border border-brand-red/30 text-brand-red text-xs font-bold uppercase tracking-wider">
              📺 EFU TV
            </span>
            <span>Stream: Cloudflare</span>
            <span aria-hidden="true">·</span>
            <span>Fizetés: Stripe</span>
          </p>
        </footer>
      </main>
    </>
  );
}