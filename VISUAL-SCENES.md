# Korea place scenes — 40 stops

Place-specific scene builders live in `place-scenes.js`, keyed by itinerary place/option IDs. The main trip uses these scenes by default; other stops keep their existing models. Existing trip data, Firebase configuration, hearts, exports, travel choreography, welcome and finale are preserved.

There are 40 scene designs serving 41 selectable visits: Café Onion reuses its scene on both days 4 and 5. The third batch covers Namsan Cable Car, Gwanghwamun Square, Ssamziegil, Jogyesa, Gyeonghuigung, Seonyudo, Café Onion, Olympic Park's lone tree, the KTX, Igidae, Daritdol, Cheongsapo harbour, Dongbaekseom, The Bay 101, Busan Cinema Center, Bosu Book Alley, Songdo Cable Car, Spa Land, Gwangjang Market and Changgyeonggung's glasshouse. The patch's outdated Deoksugung scene was adapted to Gyeonghuigung, matching the current itinerary instead of restoring a removed place.

Open `/visual-review/` for the Before/After gallery. Review mode hides trip controls and disables live sync and Wikipedia image fetching. Its option changes are held in memory. The `?visual-before=1` query on the normal trip keeps the original landmark models for comparison.

The scenes use procedural Three.js geometry and the existing animated couple. They are stylised interpretations, not architectural surveys. Shared geometry and materials are reused; scene-owned materials are disposed when a day is evicted. Mobile counts and reduced-motion settings are respected by the new effects.

Only the active authored environment is shown. The phone camera accounts for the information sheet's actual top edge to keep both figurines visible; full-height sheets intentionally cover the scene. Hidden landmarks stop animating. The 600 coloured book spines use instanced batches rather than individual draws.

Serve the repository with a local static server for review. The existing Three.js CDN and web-font dependencies need an internet connection. `tools/build.py` continues to inject trip data into `index.html`; it does not overwrite the scene module.

The build hashes `place-scenes.js` into its import URL and versions the review iframe with the app build stamp to avoid mixing cached modules with newer HTML.

Validation:

```sh
node --test tools/test-place-search.cjs tools/test-scene-transitions.cjs
curl --fail https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js -o /tmp/roameo-three-r160.mjs
node tools/test-place-scenes.mjs /tmp/roameo-three-r160.mjs
./deploy.sh --check
```

The scene test builds, animates and disposes all entries in mobile, desktop and reduced-motion modes, checks finite geometry/camera data, and checks gallery/itinerary IDs. Browser QA additionally checks both figurines' sightlines and framing, sheet controls, choice switching, quizzes, search and fast intro continuation. Headless/browser profiles are not physical-phone performance benchmarks.
