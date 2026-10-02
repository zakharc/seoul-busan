# roameo · Seoul ⇄ Busan

*Two leaves. One shared adventure.* A single-file trip companion that opens on the roameo brand splash and hands off to the Seoul ⇄ Busan trail.

**Version 1.12** — Trip map convenience pass: time check (leave-by, time at each stop, tight-connection warnings), Today view with Next up, KakaoMap links and a 🚕 driver card in Hangul, find, ▶ Play the day, smoother sheet and transitions, layered Esc; fixes Esc not closing the map after a popup.

**Version 1.11** — Chronicles of Novartis v2: five levels with their own scenery and songs, comic splashes, combos, phone-notification gags, its own music/SFX toggle; smoother 120 Hz physics.

**Version 1.10** — Integrated cinematic miniature worlds: 40 distinct atmospheres, soft-edged architecture, sculpted terrain, continuous scene transitions and frame-rate-independent camera/pose motion. Preserves Spotlight/Scout, the comfort interface, trip map and mini-game.

**Version 1.9.1** — Trip map returns instantly after a suggestion closes (no gap where another pop-up could slip in).

**Version 1.9** — Trip map (`trip-map.js`): a keyless street/satellite map of the plan with day routes, options, Explore ideas and open suggestions; swap, move, add or remove a stop straight from the map (through the usual agree-together flow).

**Version 1.8** — Chronicles of Novartis mini-game (`novartis-game.js`): a two-minute runner from ⋯ or an occasional invite; the 3D scene pauses while it's open.

**Version 1.7** — Apple-inspired comfort layer (`experience.css` / `experience.js`): trip overview with all days, top-bar search, glass surfaces, system typography, visible focus, 44px touch targets, **Back to the scene** on the phone sheet; integrated with Spotlight search and Scout report.

**Version 1.6** — Spotlight-style change search (⌘K / ⋯ → Search places): one field with live suggestions, commands (`move`, `remove`, `swap`, `note`), ↑↓/↵ and a short review step. New **Scout report** on every stop: generated at-a-glance summary, live surroundings from OpenStreetMap, one-tap rating links (Google, Tripadvisor, Naver, Kakao, Michelin, blogs) and **Swap ideas** with reasons (nearby, cheaper, rain plan, open later, similar dish/vibe, our pick) that turn into a suggestion in one tap.

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

- **Trip overview:** the day capsule at the top opens all eleven days, with dates, cities and stop counts. Choose a day to open its timeline directly. Search, shared picks and bookings are also one tap away in the overview; sound remains in More.
- **Quick research:** the search icon in the top bar opens the Spotlight place search. On a keyboard, use **Cmd/Ctrl+K**.
- **Comfortable controls:** quieter glass surfaces, system UI typography, visible keyboard focus, 44px primary touch targets and an explicit **Back to the scene** button on the phone's place sheet. Hidden trail panels are excluded from keyboard navigation; arrow keys inside a dialog no longer move the trail behind it. Reduced-motion preferences remove UI delays and looping decoration; scene motion remains managed by the 3D layer.
- On narrow phones the day capsule keeps the day number visible alongside Search, Map, Picks and More; its accessible label still includes the city. Map search returns focus to the map after choosing a result, and **Show the driver** keeps keyboard focus inside its card until Done or Escape.
- Phone flow is staged: pick a character → the 3D scene fills the screen with a **Start the day** pill → the couple walks → an arrival pill pulls up the info sheet. Swipe the sheet down (big handle) or tap the scene to put it away; tap the pill or the title in the bottom bar to bring it back. `?debug=1` shows an on-screen diagnostics overlay.
- Android (Samsung Internet / Chrome): open the link → menu → **Add to Home screen** — the page ships a web manifest and icons, so it installs as a standalone app with its own icon. iPhone: Share → **Add to Home Screen**.
- **Trip map:** the map icon in the top bar (also **See it on the map** in the trip overview, **Map** on each day card and ⋯ → **Trip map**) shows the plan on a street map. The day list sits in a bottom sheet that follows your finger: drag or flick its handle, or tap it. Swipe the day title left or right, or use ‹ ›, to change the day. Tap a stop to fly to it with its actions in the list, or tap a pin for a card. Long-press anywhere on the map to suggest that spot. 🔍 finds any stop, option, idea or hotel.
- **Chronicles of Novartis** (`novartis-game.js`, self-contained): a two-minute satirical 2D runner in five levels. Her figurine (a 2D port of the 3D one, same palette) runs from Innsbruck to München, where Mykola waits.
- Game sound, pause and close controls have 44px touch targets. Level ribbons fit narrow phones; reduced-motion mode fades timed messages without shortening their reading time.
- Regression checks use Node's built-in test runner; browser QA also walks the app in a phone-emulated browser (360×780 Galaxy profile) and checks framing, overflow, touch targets and console errors.

## Editing

- Content lives in `data/meta.json`, `data/days-a.json`, `data/days-b.json`. After changing stops/options run `python3 tools/commutes.py` (OSRM routing, cached) and then deploy.
- UI/3D code is in `index.html`. `tools/build.py` injects the data and stamps the build; `deploy.sh` runs it for you.
- The additive interface layer lives in `experience.css` and `experience.js`, loaded by two tags at the end of the document head. It uses the existing app/navigation handlers, leaves 3D geometry and camera framing untouched, and does not run in `?visual-preview=1`. `tools/build.py` versions both tags (`?v=` content hash), like `place-scenes.js`, so phones never keep a stale copy.
- The trip map lives in `trip-map.js`, loaded by one `defer` tag after `experience.js` and versioned the same way. It injects its own styles. It loads Leaflet, MapLibre GL and the Leaflet–MapLibre bridge from unpkg (pinned versions with SRI) only the first time the map opens. It reads `APP.days`, `APP.placeOf`, the trip-data commutes and Explore ideas, and the `sbtrip-props-v1` cache; it never writes them. Every change goes through `APP.openComposer`. It does not run in `?visual-preview=1`.
- Street scenery (ginkgo trees, hanok lamps, lantern wires, gates, Hangul signs, benches, flowers) is generated per day in `buildStreet()`; the Hangul sign words live in the `hangulTex` atlas next to it. Counts scale down automatically on phones (`lowEnd`).
- Local preview: `python3 -m http.server 8765` → http://127.0.0.1:8765/index.html · add `?debug=1` for the on-screen diagnostics overlay.

## Cinematic visual revision

The revision developed on `visual/cinematic-scenes` is integrated into `main`: **cinematic miniature worlds** with softened architectural edges, bevelled terrain, textured surfaces, slower coastal water, distinct sky/light/haze palettes and a named atmosphere for each visit. The itinerary and couple stay intact, alongside the comfort interface, Spotlight/Scout, map and mini-game.

Travel now connects scenes with continuous world reveals, lighting handoffs and frame-rate-independent camera/pose springs instead of blank-canvas fades at every stop. Phone sheet framing, interactive camera controls and reduced-motion support are preserved.

Open `/visual-review/` for the 40-place comparison gallery, or `/index.html?motion-preview=1` for the real trail and controls without live sync. See [VISUAL-SCENES.md](./VISUAL-SCENES.md) for visual direction, motion behavior and validation commands. Integration and local validation do not deploy the site; publishing remains a separate step.

## Live sync

In the app: ⋯ → **Sync between phones** → follow the 4 steps (free Firebase project, Firestore, rules, paste `firebaseConfig`). Then **Copy her link** and send it.

### Finale

After the last stop (→ at the airport, the ✨ pill, or ♥ → *Roll the credits*) the camera returns to the autumn hill from the welcome screen: golden hour slides into a starry night while the couple plays through their gestures, lanterns rise, a heart blooms, fireworks go up over Seoul, and the words build up to **An amazing trip is coming.**

### Changes to the plan (her research, his research)

Either of you can propose a change from any stop (**💡 Suggest a change** in the sheet), from the **＋** on a day card, from the summary, or from an Explore card (**＋ Plan**): **replace** a stop with another place, **add** a place anywhere in a day (search Korea on OpenStreetMap, paste a link, say why, optionally pull photo/blurb from Wikipedia), **move** a stop to another day/time, **drop** it, or just leave a **note**. The other one gets a badge in ⋯ and a toast, can reply, and taps **💞 Agree** or **Not this one**. Agreed changes are written into both phones' plan (`props` in Firestore, applied at boot): added places become real stops on the 3D trail with their own stage, moment, quiz-less sheet, route links, itinerary entry and My Maps placemark; dropped stops are struck through and skipped by →; replaced stops get the new option pre-selected. A change that lands while the app is open shows a *Reload to see it* pill.

**⋯ → Search places** (or ⌘K / Ctrl+K on a computer) opens a Spotlight-style panel: one search field, suggestions update while typing (trip places and Explore ideas, matched by English or Korean name), ↑↓ to select, ↵ to choose, Esc to close. Typing a command finds stops across all days: `move …`, `remove …` / `drop …`, `swap …` / `replace …`, `note …` (e.g. `remove day 2`). Opened from a stop, the first rows are that stop's actions, followed by 💡 swap ideas. **Search more places** queries OpenStreetMap (Nominatim) across Korea for the chosen city; **Use "…" as a new place** accepts a name or a research link. Choosing a row opens a short review (who/where/when, a mini scout report and rating links, optional place details) and **Send suggestion**: nothing in the plan changes until the other one agrees.

### Scout report & swap ideas

Every stop sheet has a **Scout report**:
- **At a glance** chips generated from the trip notes: cost tier (Free / ₩ / ₩₩ / ₩₩₩), time needed, rain-proof or outdoors, best at sunset / after dark, some climbing, book ahead, vibe, and closing days. A warning appears if the place is usually closed on that day of the week.
- **Around you**, live from OpenStreetMap (Overpass API, cached 14 days per place, loaded only when the card scrolls into view): nearest subway station, cafés and eateries within 500 m, nearest toilet, convenience store and ATM, step-free access, the map's listed opening hours and the official website when OSM has them. Walk times are estimates.
- **Ratings & reviews — check on**: one-tap links to the exact Google Maps place (using the stored place ID when available), Tripadvisor, Naver Map, Kakao Map, Michelin (food) and Naver blog reviews. The app does not show star ratings itself: Tripadvisor has no open API and Google ratings need a paid Places API key, so the links open the live scores on those sites instead of showing copied or invented numbers.
- **Swap ideas**: up to six alternatives of the same kind (sight ↔ sight, food ↔ food, café ↔ café) from Explore, unused options on other days and nearby OpenStreetMap places, each tagged with why it's suggested: 📍 walking distance, 💸 cheaper/free, ☔ rain plan, 🌙 open later (evening stops), ✨ similar dish / same vibe, 💎 our pick. Places closed that weekday are skipped. **Swap in** or **＋** opens the suggestion with the reason pre-filled; 🎲 **Surprise me** picks one at random.

Hotels, stations and transfers get only the practical parts (cost, time, around you, links).

Search, Spotlight and Scout regression tests: `node --test tools/test-place-search.cjs`.

### Trip map

A Google-Maps-style view of the itinerary for checking a day at a glance and reworking it together. No API key: the street map is [OpenFreeMap](https://openfreemap.org) (vector OpenStreetMap data, labels in Latin and Hangul, a dark style when the app is dark). The satellite view is Esri World Imagery. Without WebGL, or if the vector style can't load, the map falls back to standard OpenStreetMap tiles. If nothing can load, the day list still works and every stop opens in Google Maps.

- **See the plan:** day chips (or **All days**, with Seoul ⇄ Busan and the KTX) colour each day's route. The numbered pins follow the chosen options and agreed changes. Dotted lines are walks, solid lines are taxi rides. The walk or taxi verdict, minutes, distance and fare come from the same OSRM table as the stop sheet, with estimates (marked *est.*) for places added later. Each day shows its total walking and taxi time, and flags hops over 30 minutes.
- **Compare:** layers (top right) show the unchosen options (A/B rings joined to the current pick), Explore ideas (◇), open suggestions (💡, dashed lines to the stop they would replace), other days' stops (faded), and a satellite view. **📍** shows your own position once you are in Korea.
- **Time check:** every leg shows when to **leave by** (the next stop's time minus the ride and 5 minutes), and every stop shows how long you have there. When a change leaves too little time for a stop's usual visit length, or no time at all, the stop and the day get a ⏱ **tight connection** warning.
- **Today:** during the trip (on Korea time) the map opens on today, marks the chip **Today**, and shows a **Next up** card: the next stop, when to leave and how many minutes are left. One tap flies to it.
- **Getting around in Korea:** Google Maps has no walking or driving directions in Korea, so each stop and leg also links to **KakaoMap**. Walking legs open Kakao's walking route, and the others offer transit, car or taxi. **🚕 Show the driver** turns the screen into a large card with the Korean name and "이곳으로 가 주세요" (please take me here), plus **Copy Korean name**.
- **▶ Play the day:** a dot travels the day stop by stop while the camera and the list follow, with how you get there and when you arrive. Touching the map, pressing Esc or tapping **■ Stop** ends it.
- **Rework:** every stop has **Open in trip**, **KakaoMap**, **Google Maps**, **🔁 Swap**, **🕒 Move**, **✖ Remove** and **📝 Note**. **💎 Ideas near this day** lists up to five Explore places within 4 km, and **＋ Add** suggests one right after the stop it is closest to. Tapping a faded stop from another day offers **Move to Day N**. On a computer, drag a stop (⠿) onto another stop or onto a day chip. Right-click or long-press the map to name that spot (OpenStreetMap reverse lookup) and suggest it. All of these open the usual suggestion review with day, slot, place and a short "📍 x km from …" note filled in. Nothing changes until you both agree, and the map comes back after you send or cancel.
- **Take it along:** **Day in Google Maps** opens the whole day as a multi-stop route. **Google My Maps (KML)** on the All-days view exports the chosen plan, like the summary does.
- **Smooth by default:** the map opens and closes with a short animation, flies between days and stops, slides the list when the day changes, and highlights the pin under the row you point at (and the reverse). Reopening it on the same day within 15 minutes keeps your place. The map libraries are fetched quietly in idle time after the splash (not on Save-Data or 2G) and loaded the moment you point at or touch a map button, so it usually opens instantly. With *reduce motion* switched on, the animations become instant cuts.
- **Keys** (computer, while the map is open): **[** and **]** change the day, **A** shows all days, **/** searches, **P** plays the day, **F** fits the map, the arrow keys pan. **Esc** closes whatever is on top: the open card, the driver screen, search, layers, the tour, and then the map.

Map model tests: `node --test tools/test-trip-map.cjs`.

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
