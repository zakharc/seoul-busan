# Korea place scenes — 40 cinematic miniature worlds

Place-specific scene builders live in `place-scenes.js`, keyed by itinerary place/option IDs. The main trip uses these scenes by default; other stops keep their existing models. Trip data, Firebase configuration, hearts, exports, welcome and finale remain intact. The cinematic revision was developed separately on `visual/cinematic-scenes` and is now integrated into `main` together with the comfort interface, Spotlight/Scout, trip map and mini-game. Integration does not deploy the site.

## Visual direction

The architecture is now a soft-edged miniature rather than a collection of sharp blocks. Broad outdoor floors have rounded, bevelled foundations and fine procedural surface patina. Ground-level autumn details are instanced; coastal water carries slower layered swells and narrow glints rather than a uniform sparkle grid.

Every visit has a named atmosphere, authored sky colours, key/fill balance, sun direction and depth haze: **Porcelain and gold** at Gyeongbokgung, **A cathedral of ginkgo** in Seoul Forest, **Candy-colour coast** on the capsule route, **Gold in the midnight marina** at The Bay 101 and **An amber sanctuary** at Spa Land. Thin horizon cloud ribbons, restrained dust/light motes, warm pools of light and extra peripheral planting complete the worlds without obstructing the couple. Large falling leaves are reserved for the groves, gardens and ridges, rather than appearing in every coastal or indoor scene.

ACES filmic tone mapping keeps bright lights and warm architecture within a softer range. The original-model comparison retains the untone-mapped renderer. Phone scenes use 28 atmospheric motes, desktop scenes 64; reduced-motion scenes have none.

## Motion and handoffs

`scene-motion.js` contains the shared, tested quintic easing, exponential damping and analytic critically damped spring. Camera and pose springs preserve velocity when their target changes and settle consistently at 30, 60 and 120 fps. Travel has zero velocity and acceleration at its endpoints. Authored cameras gently drift while standing; drag, pinch, zoom, sheet-aware framing and quiz composition remain available.

Ordinary walks no longer fade the entire canvas to blank at departure or arrival. The departing world dissolves into the trail, and the destination's architecture, camera, fog and lighting emerge together near the end of the ride. Opaque materials use a shader dissolve, so there is no second render target or full-scene transparency sorting. Replaced scenes remain alive until their reveal reaches exactly zero, then release owned materials and geometry. Far jumps and chapter changes still use the existing guarded canvas fade to conceal camera cuts.

Reduced motion disables authored camera drift, bypasses the camera/reveal springs and caps trail travel at 300 ms. Water, cloud ribbons and the existing reduced-aware effects stay still.

There are 40 scene designs serving 41 selectable visits: Café Onion reuses its scene on both days 4 and 5. The third batch covers Namsan Cable Car, Gwanghwamun Square, Ssamziegil, Jogyesa, Gyeonghuigung, Seonyudo, Café Onion, Olympic Park's lone tree, the KTX, Igidae, Daritdol, Cheongsapo harbour, Dongbaekseom, The Bay 101, Busan Cinema Center, Bosu Book Alley, Songdo Cable Car, Spa Land, Gwangjang Market and Changgyeonggung's glasshouse. The patch's outdated Deoksugung scene was adapted to Gyeonghuigung, matching the current itinerary instead of restoring a removed place.

Open `/visual-review/` for the redesigned Before/After gallery. It starts with all 40 places and displays each selected world's atmosphere. Review mode hides trip controls and disables live sync and Wikipedia image fetching. Its option changes are held in memory. The `?visual-before=1` query on the normal trip keeps the original landmark models for comparison.

Open `/index.html?motion-preview=1` to exercise the full trail, controls and phone sheets with the actual travel choreography, without Firebase sync or Wikipedia fetching. This preview does not hide the controls or force immediate arrivals. It still uses local browser preferences, so use a fresh browser profile for independent QA.

The scenes use procedural Three.js geometry and the existing animated couple. They are stylised interpretations, not architectural surveys. Shared geometry and materials are reused; scene-owned materials are disposed when a day is evicted. Mobile counts and reduced-motion settings are respected by the new effects.

Only the active authored environment is shown when settled; a departing or replaced world can remain briefly during a dissolve. The phone camera accounts for the information sheet's actual top edge to keep both figurines visible; full-height sheets intentionally cover the scene. Hidden landmarks stop animating. The 600 coloured book spines use instanced batches rather than individual draws.

Serve the repository with a local static server for review. The existing Three.js CDN and web-font dependencies need an internet connection. `tools/build.py` continues to inject trip data into `index.html`; it does not overwrite the scene module.

The build hashes both `place-scenes.js` and `scene-motion.js` into their import URLs, retains content-hashed versions of the comfort, game and map assets, and versions the review iframe with the app build stamp to avoid mixing cached modules with newer HTML.

Validation:

```sh
node --test tools/test-place-search.cjs tools/test-scene-transitions.cjs tools/test-scene-motion.cjs tools/test-trip-map.cjs
curl --fail https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js -o /tmp/roameo-three-r160.mjs
node tools/test-place-scenes.mjs /tmp/roameo-three-r160.mjs
./deploy.sh --check
```

The scene test builds, animates and disposes all entries in mobile, desktop and reduced-motion modes, checks finite geometry/camera data, unique atmosphere names, fog limits, particle budgets, the 900-mesh mobile ceiling and gallery/itinerary IDs. Motion tests measure frame-rate independence, endpoint smoothness, interruption continuity, exact reveal completion and reduced-motion behavior.

Browser QA for the cinematic revision covers 28 representative desktop/mobile/reduced-motion compositions, both figurines' sightlines, phone sheet framing and uninterrupted walk transitions. It additionally exercises fast choice changes and Before/After switching. Headless/browser profiles are not physical-phone performance benchmarks. If jsDelivr is unavailable, the same public Three.js r160 module can be downloaded from `https://unpkg.com/three@0.160.0/build/three.module.js` for tests; the deployed app still uses its original CDN.

Final integrated QA also covers the comfort overview and hidden-panel focus behavior, Spotlight commands and keyboard isolation, Scout-to-suggestion handoffs, quizzes retaining their authored world, and the map returning in the composer-close microtask. Real Leaflet routes and pins are checked with the vector-library failure/raster fallback path; a separate blocked-Leaflet run checks the explicit offline error and usable day list. The game is checked for double jumps and freezing/resuming the cinematic camera. These checks run on desktop, phone and reduced-motion profiles without contacting Firebase sync or Wikipedia. Live third-party tile availability is not guaranteed by these local checks.
