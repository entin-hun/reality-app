# Live Transcription & Multilingual Captioning — Architecture

> Cost-efficient, near-real-time Hungarian ASR + 9-language live captions + speaker separation
> for the EFU fight-night stream on Cloudflare Stream + Workers.

---

## 1. Requirements

| Requirement | Target | Notes |
|---|---|---|
| Source language | Hungarian (HU) | commentator + ring-side mic |
| Latency (end-to-end) | ≤ 5 s | acceptable for live sports captions |
| Output languages | 9: HU, EN, SK, RO, DE, AR, HR, SR, SL | per viewer preference |
| Speaker separation | ≥ 2 speakers | commentator + corner/co-commentator |
| Per-event budget | ≤ $5 for a 3-h event | must scale to weekly cards |
| Stack fit | Cloudflare-native | no separate VM, leverage existing Workers |

---

## 2. Recommended Stack

| Layer | Provider | Why |
|---|---|---|
| Audio ingest | **Cloudflare Stream** | Already used for RTMP/SRT ingest; pull via `audio.mp4` HLS rendition |
| ASR (Hungarian) + diarization | **Deepgram Nova-3** | Best-in-class Hungarian WER, **built-in `diarize=true`**, streaming WebSocket, $0.0043/min streaming tier |
| Translation | **DeepL API Pro** (free 500k chars/mo) → fallback **Meta NLLB-200-distilled-600M** on Workers AI | DeepL for EN/SK/RO/DE/HR/SR/SL (8 of 9 langs); Workers AI for AR (DeepL no MSA support) |
| Fan-out / WebSocket | **Cloudflare Durable Objects** | one DO per event-night; lowest-latency WebSocket group |
| Caption rendering | **HLS CEA-608/708** via Cloudflare Stream subtitles track OR client-side overlay | CEA-708 path is simpler; client overlay gives multi-language toggle |

> Total **ASR cost: ≈ $0.78 for a 3-hour event** (180 min × $0.0043 ≈ $0.77).
> Translation adds < $0.10 (DeepL Pro free tier).
> **Hard cost ceiling: < $1 / event** for captions + ASR + translation.

---

## 3. Pipeline

```
┌──────────────────┐
│  Camera + mics   │
│  (RTMP / SRT)    │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────┐
│   Cloudflare Stream                  │
│   - Live HLS renditions              │
│   - audio-only rendition published   │
└────────┬─────────────────────────────┘
         │  WebSocket pull (FFmpeg bridge on a Durable Object)
         ▼
┌──────────────────────────────────────┐
│  Deepgram Nova-3 (streaming WS)      │
│  - model: nova-3                      │
│  - language: hu                       │
│  - diarize: true                      │
│  - smart_format: true                │
│  - interim_results: true             │
└────────┬─────────────────────────────┘
         │  {transcript, words[], speaker_id, is_final}
         ▼
┌──────────────────────────────────────┐
│  EFU Transcribe Worker               │
│  - Buffers last 2 finalized segments │
│  - Translates to target langs        │
│     · HU passthrough (no cost)       │
│     · 8 langs → DeepL parallel       │
│     · AR → Workers AI NLLB-200       │
│  - Emits SSE / WebSocket events      │
└────────┬─────────────────────────────┘
         │
   ┌─────┼─────────────┬─────────────┐
   ▼     ▼             ▼             ▼
 HLS  WebSocket    WebSocket     WebSocket
 708  viewer-A    viewer-B      viewer-C
 subs (EN)        (SK)          (AR)
```

### 3.1 Audio bridge (CF Stream → Deepgram)

CF Stream does not natively push raw audio to third-party WebSockets. Two options:

**Option A — Live captions via Cloudflare Stream's auto-captioning** (cheapest, no diarization)

- Enable Stream's auto-generated captions track (English-only) — **does not support HU** as of writing.
- ❌ Rejected for our HU requirements.

**Option B — Audio relay on a Durable Object** (recommended)

- A `CaptionsRelay` Durable Object opens a WebSocket to Deepgram, ingests audio via a CF Stream live-call, demuxes the audio rendition, and forwards PCM frames to Deepgram.
- Cost: 1 DO instance running for the duration of the event (~3 h). Free tier includes 400k GB-seconds/month.

### 3.2 Deepgram configuration

````javascript
// filepath: workers/captions-relay/src/deepgram.ts
const dg = new WebSocket(
  'wss://api.deepgram.com/v1/listen?' + new URLSearchParams({
    model: 'nova-3',
    language: 'hu',
    diarize: 'true',
    smart_format: 'true',
    interim_results: 'true',
    punctuate: 'true',
    encoding: 'linear16',
    sample_rate: '16000',
    channels: '1',
  }),
  { headers: { Authorization: `Token ${env.DEEPGRAM_API_KEY}` } }
);
````

Hungarian WER on Nova-3: ~7-9% on broadcast domain — adequate for sports commentary.

### 3.3 Translation fan-out

````javascript
// filepath: workers/captions-relay/src/translate.ts
const TARGETS = ['en','sk','ro','de','hr','sr','sl'] as const; // DeepL-supported
const ARABIC_TARGET = 'ar' as const;                              // Workers AI only

async function translateBatch(text: string) {
  const deepl = Promise.all(
    TARGETS.map(async (target_lang) => {
      const r = await fetch('https://api-free.deepl.com/v2/translate', {
        method: 'POST',
        headers: { Authorization: `DeepL-Auth-Key ${env.DEEPL_KEY}` },
        body: new URLSearchParams({ text, target_lang: target_lang.toUpperCase() }),
      });
      return [target_lang, (await r.json()).translations[0].text];
    })
  );

  // Workers AI binding (NLLB-200-distilled-600M for Arabic)
  const ar = env.AI.run('@cf/meta/nllb-200-distilled-600m', {
    text,
    target_lang: 'ara_Arab',
    source_lang: 'hun_Latn',
  }).then((res: any) => [ARABIC_TARGET, res.translated_text]);

  return Object.fromEntries(await Promise.all([deepl, ar]));
}
````

**DeepL Pro free tier**: 500k chars/mo — covers ~50 events at ~10k chars/event comfortably.
**Workers AI**: free for first 10k neurons/day; NLLB-200-distilled = ~500k neurons/min. A 3-h event × 1 token/sec ≈ 1M neurons = within free tier for the first event each day.

### 3.4 Speaker labels

Deepgram returns `speaker_id` per word (`0`, `1`, `2`…). Surface these as caption prefixes:

```
[SPEAKER 0]  ...és most jön a második menet...
[SPEAKER 1]  Absolutely — watch the left hand here.
[SPEAKER 0]  ...a bal kéz, igen, pontosan...
```

> Note: Deepgram speaker IDs are arbitrary within a session; map them to a stable
> role ("Commentator A", "Co-commentator") via a brief admin UI that asks the
> producer to assign 2 names per event-night.

### 3.5 Fan-out — one Durable Object per event-night

````typescript
// filepath: workers/captions-relay/src/fanout.ts
export class EventNightRoom {
  sockets = new Set<WebSocket>();
  langSubs = new Map<WebSocket, string>(); // socket → 'en' | 'hu' | …

  constructor(readonly state: DurableObjectState, readonly env: Env) {}

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === '/ws') {
      const pair = new WebSocketPair();
      const lang = url.searchParams.get('lang') ?? 'en';
      this.langSubs.set(pair[0], lang);
      this.sockets.add(pair[0]);
      pair[0].addEventListener('close', () => {
        this.sockets.delete(pair[0]);
        this.langSubs.delete(pair[0]);
      });
      return new Response(null, { status: 101, webSocket: pair[0] });
    }
    return new Response('Not found', { status: 404 });
  }

  broadcast(payload: { hu: string; translations: Record<string,string>; speaker: number; ts: number }) {
    const msg = JSON.stringify(payload);
    for (const ws of this.sockets) {
      const lang = this.langSubs.get(ws) ?? 'en';
      ws.send(JSON.stringify({
        text: lang === 'hu' ? payload.hu : payload.translations[lang] ?? payload.hu,
        speaker: payload.speaker,
        ts: payload.ts,
      }));
    }
  }
}
````

A single `EventNightRoom` instance handles ~10k concurrent WebSockets comfortably on CF infrastructure.

---

## 4. Caption delivery to viewers — two parallel paths

### 4.1 Server-rendered client overlay (recommended; ships immediately)

- Viewer-facing page subscribes to `wss://…/api/captions/{eventId}?lang={xx}`.
- A small `<CaptionsOverlay>` component renders the latest 2 lines, speaker-colored.
- Works on all browsers, no HLS player lock-in.
- ✅ Already possible with existing `watch/` page.

### 4.2 HLS CEA-708 subtitles (future)

- CF Stream supports a server-side "subtitles track" via WebVTT.
- Hook the EFU Transcribe Worker to a CF Stream `subtitles` callback, upload a continuously-growing WebVTT file (rotated every 5 min) per language.
- ✅ Enables native TV-out captions, app captions, etc. — defer until client overlay is validated.

---

## 5. Cost rollup (3-h event)

| Line item | Quantity | Unit cost | Subtotal |
|---|---|---|---|
| Deepgram Nova-3 streaming | 180 min | $0.0043/min | **$0.77** |
| DeepL Pro | ~10k chars | free tier | **$0** |
| Workers AI NLLB-200 (AR) | ~3M neurons | free tier | **$0** |
| Durable Object instance-hours | 3 h | 1 instance | **$0** |
| Workers requests | ~10k | free tier | **$0** |
| **Total per event** | | | **≈ $0.77** |

Weekly (4 events/month) ≈ **$3.08/month.** Scale to 30 events/month: **$23.**

---

## 6. Failure modes & mitigations

| Failure | Impact | Mitigation |
|---|---|---|
| Deepgram 5xx | captions freeze | buffer last N segments on DO; auto-reconnect WS with exponential backoff (250ms→8s) |
| DeepL rate-limit (429) | one language lags | per-language retry queue; fall back to NLLB-200 for that lang (degraded quality) |
| Audio rendition missing from CF Stream | no captions | producer-side check 5 min before event; alert to Discord webhook |
| Speaker IDs reshuffle | wrong role labels | UI for producer to re-assign during first 30 s |
| Durable Object evicts | WebSockets close | `keepAlive` ping every 25 s; clients auto-reconnect |

---

## 7. Roll-out plan (3 sprints)

**Sprint 1 — Minimal vertical slice**

- Audio relay DO → Deepgram WS → console.log of transcripts.
- Single viewer WebSocket that prints EN translation (via DeepL).
- 1 fighter showcase stream; 1 sponsor demo.

**Sprint 2 — Multilingual fan-out**

- Add all 8 DeepL langs + AR via Workers AI.
- Add 2-speaker diarization + speaker-label UI.
- Client overlay component in `components/CaptionsOverlay.tsx`.

**Sprint 3 — Production hardening**

- DO eviction handling, reconnection, alert webhooks.
- Producer control panel for speaker assignment.
- Optional HLS WebVTT track delivery.
- Load test 5k concurrent sockets via `wrk` + custom script.

---

## 8. Open questions

1. **Deepgram enterprise contract?** Volume above 50 h/month unlocks ~30% discount — wait until 12 events/month sustained.
2. **On-prem ASR fallback?** If per-event cost ceiling is < $0.50 in future, evaluate `whisper-large-v3-turbo` on Workers AI (currently slower, higher latency).
3. **Speaker role persistence?** Storing `speaker_id → role` mapping on a per-event basis vs. globally — currently leaning per-event because commentators rotate.
4. **HLS CEA-708 vs. client overlay?** Likely both — overlay for web, 708 for TV/CTV. Decide after Sprint 2.

---

## 9. References

- Deepgram Nova-3 docs: <https://developers.deepgram.com/docs/nova-3>
- Deepgram diarization: <https://developers.deepgram.com/docs/diarization>
- DeepL API: <https://developers.deepl.com/docs/api-reference/translate>
- Cloudflare Durable Objects WebSocket: <https://developers.cloudflare.com/durable-objects/best-practices/websockets/>
- Cloudflare Stream WebVTT: <https://developers.cloudflare.com/stream/webrtc-subtitles/>
- Workers AI NLLB-200: <https://developers.cloudflare.com/workers-ai/models/nllb-200-distilled-600m/>