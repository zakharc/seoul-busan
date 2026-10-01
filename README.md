# Seoul ⇄ Busan · a journey for two

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
- `tools/` has no test runner; QA is done by walking the app in a phone-emulated browser (360×780 Galaxy profile) and checking for overflow, small touch targets and console errors.

## Editing

- Content lives in `data/meta.json`, `data/days-a.json`, `data/days-b.json`. After changing stops/options run `python3 tools/commutes.py` (OSRM routing, cached) and then deploy.
- UI/3D code is in `index.html`. `tools/build.py` injects the data and stamps the build; `deploy.sh` runs it for you.
- Street scenery (ginkgo trees, hanok lamps, lantern wires, gates, Hangul signs, benches, flowers) is generated per day in `buildStreet()`; the Hangul sign words live in the `hangulTex` atlas next to it. Counts scale down automatically on phones (`lowEnd`).
- Local preview: `python3 -m http.server 8765` → http://127.0.0.1:8765/index.html · add `?debug=1` for the on-screen diagnostics overlay.

## Live sync

In the app: ⋯ → **Sync between phones** → follow the 4 steps (free Firebase project, Firestore, rules, paste `firebaseConfig`). Then **Copy her link** and send it.

### Finale

After the last stop (→ at the airport, the ✨ pill, or ♥ → *Roll the credits*) the camera returns to the blossom hill from the welcome screen: golden hour slides into a starry night while the couple plays through their gestures, lanterns rise, a heart blooms, fireworks go up over Seoul, and the words build up to **An amazing trip is coming.**

### Hello, Busan (interlude)

The first time the trail reaches a Busan place (the KTX on day 6) the app cuts to a camellia cliff above Gwangalli: the sea shader slides from azure to gold, the Gwangan bridge cycles its lamp colours, gulls and sailboats drift by, and **Hello, Busan.** builds up word by word. *Step off the train →* carries on to the stop you were heading for. It plays once per session; the 🌊 button on any Busan day card replays it.

### Moments

Every romantic place has a little scene (`MOMENTS` in `index.html`, keyed by option id, with fall-backs per landmark type): the figurines act it out in 3D (lock on the fence, coin into the stream, lantern release, leaf storm, selfie, dance, a toast…), a heart-shaped particle burst rises, and a caption card tells the story. It plays once on arrival, from the 💞 Play / Replay card in the sheet, or by tapping the couple.

### When you're both online

- A dock under the day chips shows where the other one is (**Join** jumps there) and a 💌 tray to send a kiss / wave / hug / lantern / fireworks — the figurines act it out on both phones, with sparkles and sound.
- Standing at the same stop triggers a "You're both here 💞" moment; taps on the scene are mirrored.
- Hearted different options at the same stop? A **가위바위보** (rock-paper-scissors) card appears — winner's pick becomes the plan once the other taps along.
- Pokes sent while the other phone was closed are delivered on the next open ("…while you were away").
- `?trip=some-id` points the app at a separate Firestore doc (handy for testing without touching the real plan).
