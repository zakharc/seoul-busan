# Korea place scenes — 20 stops

Place-specific scene builders live in `place-scenes.js`, keyed by itinerary place/option IDs. The main trip uses these scenes by default; other stops keep their existing models. Existing trip data, Firebase configuration, hearts, exports, travel choreography, welcome and finale are preserved.

Open `/visual-review/` for the Before/After gallery. Review mode hides trip controls and disables live sync and Wikipedia image fetching. Its option changes are held in memory. The `?visual-before=1` query on the normal trip keeps the original landmark models for comparison.

The scenes use procedural Three.js geometry and the existing animated couple. They are stylised interpretations, not architectural surveys. Shared geometry and materials are reused; scene-owned materials are disposed when a day is evicted. Mobile counts and reduced-motion settings are respected by the new effects.

Serve the repository with a local static server for review. The existing Three.js CDN and web-font dependencies need an internet connection. `tools/build.py` continues to inject trip data into `index.html`; it does not overwrite the scene module.
