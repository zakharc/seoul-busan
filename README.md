# roameo · Seoul ⇄ Busan

*Two leaves. One shared adventure.* A single-file trip companion that opens on the roameo brand splash and hands off to the Seoul ⇄ Busan trail.

**Version 1.5** — 40 place-specific scene designs, sheet-aware framing, cache-versioned visuals, fast intro transition fixes and an expanded Before/After gallery. Search and shared itinerary changes are preserved.

**Version 1.4** — Changes to the plan: propose add / replace / move / drop / note from any stop, day or Explore card; search places, Wikipedia photo lookup; agree together; agreed changes become part of the trail on both phones.

**Version 1.3** — polish round from her first test: no ground flicker (depth offsets on stacked ground layers, tighter near plane), landmarks no longer pop up/down on arrival, nothing stands between camera and couple (street trees/poles and stage props keep out of the camera corridor, neighbouring landmarks in the corridor are hidden, Namsan pines removed, lanterns rise behind the landmark), tall buildings sit off-axis.

**Version 1.2** — roameo branding: animated splash (two-leaf logo, Nunito wordmark, motto, Start button) before the welcome hill; roameo app icons, manifest, OG card.

**Version 1.1** — twenty authored place scenes (external visual patch) merged: fade in/out on arrival, phone-aware framing that keeps the couple readable, clouds/stage handled, review gallery kept offline from live sync.

**Version 1.0** — shared with Киця 💗. Set-dressing keeps a clear corridor between camera and couple (no more props in front of their faces), Common Ground sign fixed, umbrella held above both heads, shared data reset for a fresh start.

**Version 0.3** — Explore more places (찜): 20 extra Seoul + 5 Busan ideas with the catch, fit, cost and route; auto-shown once per session when each city's trail is done; marks sync between phones and appear in the summary, itinerary and My Maps export.

**Version 0.2** — visual direction pass: per-entry scene overrides (127), painted horizon backdrops with day/night cross-fade, neighbourhood kits (Myeongdong neon, Seongsu brick, hanok lanes, Gamcheon/Ihwa hill houses), real Hangul venue signs, the chosen dish at every meal, low three-quarter arrival camera, autumn welcome hill.

**Version 0.1** — first complete release (Oct 2026): full 11-day trail, character pick, per-stop stages and moments, quiz, live two-phone sync, Busan interlude, finale.

A single-file trip companion (`index.html`) with a 3D trail, choice cards with ♥ picks for two people, live sync (Firebase), Google My Maps export and an illustrated itinerary.

## Deploy / redeploy (one command)

```bash
./deploy.sh                 # build → check → commit → push → wait until live
./deploy.sh "Added day 3"   # same, with your own commit message
./deploy.sh --check         # build + syntax check only
```

The first run logs you into GitHub in the browser, creates the public repo `seoul-busan` and switches GitHub Pages on. Every later run just pushes your changes and prints the live URL once the new build is served.

Site: `https://<your-github-user>.github.io/seoul-busan/` · her link adds `?as=her` (copy it from ⋯ → Sync inside the app so it carries the sync key).

## On the phone

- Phone flow is staged: pick a character → the 3D scene fills the screen with a **Start the day** pill → the couple walks → an arrival pill pulls up the info sheet. Swipe the sheet down (big handle) or tap the scene to put it away; tap the pill or the title in the bottom bar to bring it back. `?debug=1` shows an on-screen diagnostics overlay.
- Android (Samsung Internet / Chrome): open the link → menu → **Add to Home screen** — the page ships a web manifest and icons, so it installs as a standalone app with its own icon. iPhone: Share → **Add to Home Screen**.
- Regression checks use Node's built-in test runner; browser QA also walks the app in a phone-emulated browser (360×780 Galaxy profile) and checks framing, overflow, touch targets and console errors.

## Editing

- Content lives in `data/meta.json`, `data/days-a.json`, `data/days-b.json`. After changing stops/options run `python3 tools/commutes.py` (OSRM routing, cached) and then deploy.
- UI/3D code is in `index.html`. `tools/build.py` injects the data and stamps the build; `deploy.sh` runs it for you.
- Street scenery (ginkgo trees, hanok lamps, lantern wires, gates, Hangul signs, benches, flowers) is generated per day in `buildStreet()`; the Hangul sign words live in the `hangulTex` atlas next to it. Counts scale down automatically on phones (`lowEnd`).
- Local preview: `python3 -m http.server 8765` → http://127.0.0.1:8765/index.html · add `?debug=1` for the on-screen diagnostics overlay.

## Cinematic visual revision

The separate `visual/cinematic-scenes` branch explores **cinematic miniature worlds**: softened architectural edges, bevelled terrain, textured surfaces, slower coastal water, distinct sky/light/haze palettes and a named atmosphere for each visit. The itinerary and couple stay intact.

Travel now connects scenes with continuous world reveals, lighting handoffs and frame-rate-independent camera/pose springs instead of blank-canvas fades at every stop. Phone sheet framing, interactive camera controls and reduced-motion support are preserved.

Open `/visual-review/` for the 40-place comparison gallery, or `/index.html?motion-preview=1` for the real trail and controls without live sync. See [VISUAL-SCENES.md](./VISUAL-SCENES.md) for visual direction, motion behavior and validation commands. This revision is not yet merged or deployed.

## Live sync

In the app: ⋯ → **Sync between phones** → follow the 4 steps (free Firebase project, Firestore, rules, paste `firebaseConfig`). Then **Copy her link** and send it.

### Finale

After the last stop (→ at the airport, the ✨ pill, or ♥ → *Roll the credits*) the camera returns to the autumn hill from the welcome screen: golden hour slides into a starry night while the couple plays through their gestures, lanterns rise, a heart blooms, fireworks go up over Seoul, and the words build up to **An amazing trip is coming.**

### Changes to the plan (her research, his research)

Either of you can propose a change from any stop (**💡 Suggest a change** in the sheet), from the **＋** on a day card, from the summary, or from an Explore card (**＋ Plan**): **replace** a stop with another place, **add** a place anywhere in a day (search Korea on OpenStreetMap, paste a link, say why, optionally pull photo/blurb from Wikipedia), **move** a stop to another day/time, **drop** it, or just leave a **note**. The other one gets a badge in ⋯ and a toast, can reply, and taps **💞 Agree** or **Not this one**. Agreed changes are written into both phones' plan (`props` in Firestore, applied at boot): added places become real stops on the 3D trail with their own stage, moment, quiz-less sheet, route links, itinerary entry and My Maps placemark; dropped stops are struck through and skipped by →; replaced stops get the new option pre-selected. A change that lands while the app is open shows a *Reload to see it* pill.

**⋯ → Search places** opens a search-first composer. Typing searches the existing trip and Explore suggestions locally; press **Search** or Enter for OpenStreetMap results across Korea, biased towards the selected day's city. Results show their address, provider and a map link. Selecting a result carries its coordinates and Korean name into the proposal; selecting another clears the previous place's photo, price and description. Choose **Add a place**, **Replace with…** (then select the existing stop), or **Drop this stop**. Google Search, Google Maps and Naver links open in another tab for independent research; this is not a Google Places API integration and needs no Google API key. Online searches run only on submission, not as remote autocomplete. If the search is unavailable, the error is shown and manual entry/research links remain available.

Search helper regression tests: `node --test tools/test-place-search.cjs`.

### Explore more places (찜)

`data/explore.json` holds 20 extra Seoul places and 5 extra Busan places that are **not** in the plan — each with why it's great, the catch, where it could fit, time, cost and how to get there. The page opens by itself once per session after the last Seoul stop before the KTX (Sun 1 Nov) and after the last Busan stop (Wed 4 Nov), and any time from ⋯ → **Explore more places** or the summary page. Tap **찜** (or double-tap a photo) to mark a place; marks sync like hearts (`review/x-…/her|me`), show on the summary, in the illustrated itinerary and in the My Maps export. After editing places run `python3 tools/explore.py` (taxi/walk from the nearest hotel, OSRM, cached) and deploy.

### Hello, Busan (interlude)

The first time the trail reaches a Busan place (the KTX on day 6) the app cuts to a camellia cliff above Gwangalli: the sea shader slides from azure to gold, the Gwangan bridge cycles its lamp colours, gulls and sailboats drift by, and **Hello, Busan.** builds up word by word. *Step off the train →* carries on to the stop you were heading for. It plays once per session; the 🌊 button on any Busan day card replays it.

### Place scenes

Forty scene designs serve 41 selectable visits with place-specific Three.js environments (`place-scenes.js`, described and tested in `VISUAL-SCENES.md`). They now include the cable cars, Gwanghwamun, Jogyesa, Gyeonghuigung, Seonyudo, Café Onion, coastal paths, lighthouses, Spa Land, book and food markets, and the glasshouse alongside the original twenty. When the couple arrives, the generic world fades out and the authored scene takes over with its own sky and light. The phone framing keeps the figurines above the half-height information sheet. The Before/After gallery is at `/visual-review/`; `?visual-before=1` retains generic models in the normal trip. Scene imports are content-versioned during the build.

### Stages

Each of the 127 selectable entries has a scene override in `SCENE` (`index.html`): a painted horizon backdrop (Bugaksan ridge, Namsan forest, Seoul/Busan skylines, Han River bridges, Gwangan bridge over the sea, Gamcheon hill houses, Jagalchi harbour, Seongsu brick), a neighbourhood kit, and — for every meal — the actual dish on a table beside the couple (cutlet, kalguksu, gukbap, dumplings, BBQ, skewers, chimaek, clams, grilled fish, eomuk, tteokbokki, bindaetteok, yukhoe…). Restaurants and shops carry their real Hangul sign. Backdrops cross-fade between day and night versions.

Every stop gets its own little environment (`STAGE_KIT` in `index.html`): a themed ground (flagstones, grass, sand, rock, boardwalk, market tiles, café brick, city paving — canvas textures, three variants each) and a ring of set dressing chosen by the place type — stone lanterns, onggi jars and pines at palaces and temples; picnic blankets, flower beds, a kite, butterflies by day and fireflies after dark in parks; umbrellas, buoys, a sandcastle and gulls on beaches; railings, a life ring, bunting and bobbing boats on waterfronts; food carts with steam and string lights at markets; café tables with people and a cat at restaurants. Only the current stop's stage (plus the one you are walking from) is built and animated.

### Moments

Every special place has a little scene (`MOMENTS` in `index.html`, keyed by option id, with fall-backs per landmark type): the figurines act it out in 3D (lock on the fence, coin into the stream, lantern release, leaf storm, selfie, a toast…) and a small caption tells something nice about the place itself. It starts about a second after arrival, repeats quietly every half-minute or so while you stand there, and can be triggered by tapping the couple. The places marked `r:1` get a slightly warmer gesture set and a soft sparkle instead of hearts.

### When you're both online

- A dock under the day chips shows where the other one is (**Join** jumps there) and a 💌 tray to send a kiss / wave / hug / lantern / fireworks — the figurines act it out on both phones, with sparkles and sound.
- Standing at the same stop triggers a "You're both here 💞" moment; taps on the scene are mirrored.
- Hearted different options at the same stop? A **가위바위보** (rock-paper-scissors) card appears — winner's pick becomes the plan once the other taps along.
- Pokes sent while the other phone was closed are delivered on the next open ("…while you were away").
- `?trip=some-id` points the app at a separate Firestore doc (handy for testing without touching the real plan).
