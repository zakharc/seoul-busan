/* roameo trip map: the itinerary on an interactive map, with one-tap rework through the shared Changes flow. */
(() => {
  "use strict";

  /* ---------- pure model (tested in node: tools/test-trip-map.cjs) ---------- */
  const DAY_COLORS = ["#4f5fe6", "#e8557a", "#d59a17", "#16a34a", "#9333ea", "#0e9aa7",
    "#ea580c", "#0284c7", "#c026d3", "#65a30d", "#7c3aed", "#dc2626"];
  const dayColor = i => DAY_COLORS[((i % DAY_COLORS.length) + DAY_COLORS.length) % DAY_COLORS.length];
  const validLL = p => !!p && p.lat !== "" && p.lng !== "" && p.lat != null && p.lng != null &&
    Number.isFinite(+p.lat) && Number.isFinite(+p.lng) && +p.lat >= 33 && +p.lat <= 39 && +p.lng >= 124 && +p.lng <= 132;
  const distKm = (a, b) => {
    const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(h));
  };
  const round1 = n => Math.round(n * 10) / 10;
  const fareText = f => "≈₩" + (f >= 1000 ? (f / 1000).toLocaleString("en-GB", {maximumFractionDigits: 1}) + "k" : f);
  const enc = encodeURIComponent;
  const coord = p => (+p.lat).toFixed(6) + "," + (+p.lng).toFixed(6);

  // Mirrors commuteFor() in index.html so the map and the stop sheet agree on walk vs taxi.
  function legBetween(from, to, item, comm) {
    if (!from || !to) return null;
    const km = validLL(from) && validLL(to) ? distKm(from, to) : null;
    if ((item && item.long) || to.long) return {mode: "train", km: km == null ? null : round1(km), min: null};
    const fixed = (item && item.fixed) || to.fixed;
    if (fixed) {
      const taxi = /\btaxi\b|limousine|bus\b/i.test(fixed) && !/^Walk/i.test(fixed) && !/You're already/i.test(fixed);
      return {mode: taxi ? "taxi" : "walk", km: km == null ? null : round1(km), min: null, fixed: true};
    }
    const c = comm && comm[(from.id || "") + ">" + (to.id || "")];
    if (c && c.same) return {mode: "same", km: 0, min: 0};
    if (c) {
      const walk = c.w <= 22 || (c.t >= c.w - 2 && c.w <= 40);
      return {mode: walk ? "walk" : "taxi", min: walk ? c.w : c.t, walkMin: c.w, taxiMin: c.t, fare: c.f,
        km: walk ? c.wd : c.km, long: walk ? c.w > 30 : c.t > 30};
    }
    if (km == null) return {mode: "walk", km: null, min: null, est: true};
    if (km < 0.05) return {mode: "same", km: 0, min: 0};
    if (km > 60) return {mode: "train", km: round1(km), min: null, est: true};
    const w = Math.max(1, Math.round(km * 1.3 / 4.6 * 60)), t = Math.round(km * 1.35 / 20 * 60 + 5);
    const walk = w <= 22;
    return {mode: walk ? "walk" : "taxi", min: walk ? w : t, walkMin: w, taxiMin: t,
      km: round1(km * (walk ? 1.3 : 1.35)), est: true, long: !walk && t > 30};
  }

  function buildDay(days, hotels, comm, placeOf, i) {
    const d = days[i], color = dayColor(i);
    const prevBase = i > 0 ? days[i - 1].base : null;
    const start = prevBase && hotels[prevBase] ? Object.assign({id: prevBase}, hotels[prevBase]) : null;
    const stops = [];
    let n = 0;
    d.items.forEach((item, k) => {
      const place = placeOf(item) || {};
      const removed = !!item.removed;
      stops.push({day: i, k, id: item.id, item, place, t: item.t || "", kind: item.kind || "", removed,
        n: removed ? null : ++n, pinned: validLL(place), title: place.title || item.title || "Stop", color,
        added: !!item.added, moved: !!item.moved, changed: !!item.changed, hasOptions: !!(item.options && item.options.length > 1)});
    });
    const legs = [];
    let prev = start, prevK = start ? "hotel" : null, walkMin = 0, rideMin = 0, km = 0, longLegs = 0;
    for (const s of stops) {
      if (s.removed) continue;
      const leg = legBetween(prev, s.place, s.item, comm);
      if (leg) {
        Object.assign(leg, {from: prevK, to: s.k, fromPlace: prev, toPlace: s.place});
        legs.push(leg);
        if (leg.min && leg.mode === "walk") walkMin += leg.min;
        if (leg.min && leg.mode === "taxi") rideMin += leg.min;
        if (leg.km && leg.mode !== "train") km += +leg.km;
        if (leg.long) longLegs++;
      }
      prev = s.place;
      prevK = s.k;
    }
    return {index: i, date: d.date, city: d.city, title: d.title, base: d.base, color, start, stops, legs,
      stats: {stops: n, walkMin, rideMin, km: round1(km), longLegs}};
  }

  const sameOption = (a, b) => (a.id && b.id ? a.id === b.id : (a.title || a.name) === (b.title || b.name));
  function alternativesOf(dayModel, resolve) {
    const out = [];
    for (const s of dayModel.stops) {
      if (s.removed || !s.item.options || s.item.options.length < 2) continue;
      s.item.options.forEach((raw, index) => {
        const opt = resolve ? resolve(raw) : raw;
        if (!opt || sameOption(opt, s.place) || !validLL(opt)) return;
        out.push({day: dayModel.index, k: s.k, index, letter: String.fromCharCode(65 + index), opt, stop: s});
      });
    }
    return out;
  }

  function plannedIdeaIds(explore, dayModels) {
    const stops = dayModels.flatMap(dm => dm.stops.filter(s => !s.removed));
    const ids = new Set();
    for (const idea of explore || []) {
      const t = String(idea.title || "").toLowerCase();
      if (stops.some(s => String(s.title).toLowerCase() === t || (validLL(idea) && s.pinned && distKm(idea, s.place) < 0.12))) ids.add(idea.id);
    }
    return ids;
  }

  function nearestStop(dayModel, point) {
    let best = null;
    for (const s of dayModel.stops) {
      if (s.removed || !s.pinned) continue;
      const km = distKm(point, s.place);
      if (!best || km < best.km) best = {stop: s, km: round1(km)};
    }
    return best;
  }

  function nearbyIdeas(explore, dayModel, planned, opts = {}) {
    const maxKm = opts.maxKm || 4, limit = opts.limit || 5;
    return (explore || [])
      .filter(idea => idea.city === dayModel.city && validLL(idea) && !(planned && planned.has(idea.id)))
      .map(idea => Object.assign({idea}, nearestStop(dayModel, idea) || {stop: null, km: Infinity}))
      .filter(r => r.km <= maxKm)
      .sort((a, b) => a.km - b.km)
      .slice(0, limit);
  }

  function openProposals(props, locate) {
    return Object.values(props || {})
      .filter(p => p && p.status === "open")
      .map(p => Object.assign({}, p, {loc: p.itemId && locate ? locate(p.itemId) : null}))
      .sort((a, b) => (b.ts || 0) - (a.ts || 0));
  }
  const proposalDays = p => {
    const s = new Set();
    if (p.loc) s.add(p.loc[0]);
    if (p.day != null && p.day >= 0) s.add(p.day);
    if (p.toDay != null && p.toDay >= 0) s.add(p.toDay);
    return s;
  };

  const placeUrl = p => "https://www.google.com/maps/search/?api=1&query=" +
    (p.name || p.title ? enc(p.name || p.title) : validLL(p) ? coord(p) : "") + (p.pid ? "&query_place_id=" + p.pid : "");
  function legUrl(from, to, mode) {
    const end = (p, key) => p.pid ? key + "=" + enc(p.name || p.title) + "&" + key + "_place_id=" + p.pid
      : key + "=" + (validLL(p) ? coord(p) : enc(p.name || p.title || ""));
    return "https://www.google.com/maps/dir/?api=1&" + end(from, "origin") + "&" + end(to, "destination") +
      "&travelmode=" + (mode === "walk" ? "walking" : "transit");
  }
  // The path form keeps every stop of the day (the api=1 form allows only 3 waypoints on phones).
  function dayRouteUrl(dayModel) {
    const pts = [];
    if (dayModel.start && validLL(dayModel.start)) pts.push(dayModel.start);
    for (const s of dayModel.stops) if (!s.removed && s.pinned) pts.push(s.place);
    const uniq = pts.filter((p, i) => i === 0 || coord(p) !== coord(pts[i - 1])).slice(0, 10);
    if (!uniq.length) return null;
    return "https://www.google.com/maps/dir/" + uniq.map(coord).join("/");
  }

  /* ---------- time check (leave-by, time at each stop, tight connections) ---------- */
  const toMin = t => { const m = /^(\d{1,2}):(\d\d)$/.exec(String(t || "").trim()); return m ? +m[1] * 60 + +m[2] : null; };
  const fmtMin = m => { const v = ((Math.round(m) % 1440) + 1440) % 1440; return String(Math.floor(v / 60)).padStart(2, "0") + ":" + String(v % 60).padStart(2, "0"); };
  // Lower bound of a free-text duration ("1.5–2 h", "45 min–1 h", "≈35 min"); null for deadlines like "1 h before boarding".
  function needMin(need) {
    const s = String(need || "");
    if (/before|ahead|book|leave/i.test(s)) return null;
    const m = /^\s*≈?\s*(\d+(?:\.\d+)?)\s*(?:[–-]\s*\d+(?:\.\d+)?\s*)?(h|min)\b/.exec(s);
    return m ? Math.round(+m[1] * (m[2] === "h" ? 60 : 1)) : null;
  }
  const TIMED_KINDS = new Set(["sight", "food", "activity", "show", ""]);
  function schedule(dayModel, buffer = 5) {
    const live = dayModel.stops.filter(s => !s.removed);
    return live.map((s, i) => {
      const legIn = dayModel.legs.find(l => l.to === s.k), next = live[i + 1];
      const legOut = next ? dayModel.legs.find(l => l.to === next.k) : null;
      const t = toMin(s.t), tn = next ? toMin(next.t) : null;
      const leaveBy = t != null && legIn && legIn.min ? t - legIn.min - buffer : null;
      const stayMin = t != null && tn != null ? tn - (legOut && legOut.min ? legOut.min + buffer : 0) - t : null;
      const need = needMin(s.place.need);
      const tight = stayMin != null && TIMED_KINDS.has(s.kind) && (stayMin < 0 || (need ? stayMin < need - 10 : stayMin < 15));
      return {k: s.k, t, leaveBy, stayMin, need, tight};
    });
  }
  // The trip runs on Korea time wherever the phone is.
  function seoulNow(now = new Date()) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23"})
      .formatToParts(now).map(p => [p.type, p.value]));
    return {date: `${parts.year}-${parts.month}-${parts.day}`, min: +parts.hour * 60 + +parts.minute};
  }
  const tripDayIndex = (days, now) => days.findIndex(d => d.date === seoulNow(now).date);
  function nextUp(sched, nowMin) {
    const next = sched.find(s => s.t != null && s.t > nowMin);
    if (!next) return null;
    return {k: next.k, at: next.t, leaveBy: next.leaveBy, leaveIn: next.leaveBy != null ? next.leaveBy - nowMin : next.t - nowMin};
  }

  /* ---------- Korean navigation (Google Maps has no walking/driving directions in Korea) ---------- */
  const kName = p => String(p.ko || p.name || p.title || "").replace(/[,/]/g, " ").trim();
  const kPt = p => `${enc(kName(p))},${(+p.lat).toFixed(6)},${(+p.lng).toFixed(6)}`;
  const kakaoTo = p => `https://map.kakao.com/link/to/${kPt(p)}`;
  // Walking legs open Kakao's walking route; other legs open from/to so Kakao offers transit, car or taxi.
  const kakaoRoute = (a, b, mode) => mode === "walk" ? `https://map.kakao.com/link/by/walk/${kPt(a)}/${kPt(b)}` : `https://map.kakao.com/link/from/${kPt(a)}/to/${kPt(b)}`;

  /* ---------- discover around a stop: parse several open sources, merge, score "worth visiting" ---------- */
  const fold = v => String(v || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const HANGUL = /[\uac00-\ud7a3]/;
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const DISC_KINDS = {
    heritage: ["🏯", "Heritage"], museum: ["🏛️", "Museum"], gallery: ["🎨", "Gallery"], view: ["🌇", "Viewpoint"],
    sight: ["✨", "Sight"], nature: ["🌿", "Park"], area: ["🏘️", "Neighbourhood"], market: ["🛍️", "Market"],
    culture: ["🎭", "Stage"], food: ["🍜", "Food"], cafe: ["☕", "Café"], night: ["🍻", "Night out"]
  };
  const DISC_FILTERS = {
    all: null,
    sights: new Set(["heritage", "museum", "gallery", "sight", "area", "culture", "market"]),
    food: new Set(["food", "cafe", "market"]),
    outdoors: new Set(["view", "nature"]),
    night: new Set(["night"])
  };
  const LOCAL_FOOD = /korean|noodle|soup|bbq|barbecue|dumpling|seafood|fish|tteok|bibimbap|kimchi|bunsik|gukbap|naengmyeon|kalguksu|samgyetang|hanjeongsik|tea|bakery/i;
  const SIGHTLIKE = new Set(["heritage", "museum", "gallery", "view", "sight", "nature", "area", "market", "culture"]);
  function osmKind(t) {
    if (t.tourism === "museum") return "museum";
    if (t.tourism === "gallery" || t.amenity === "arts_centre") return "gallery";
    if (t.tourism === "viewpoint") return "view";
    if (t.historic || t.heritage || t.amenity === "place_of_worship") return "heritage";
    if (t.tourism) return "sight";
    if (t.leisure === "park" || t.leisure === "garden") return "nature";
    if (t.amenity === "marketplace") return "market";
    if (t.amenity === "theatre" || t.amenity === "cinema") return "culture";
    if (t.amenity === "cafe") return "cafe";
    if (t.amenity === "bar" || t.amenity === "pub") return "night";
    if (t.amenity === "restaurant") return "food";
    // Other amenities only count when they are something to visit (not a university, post office or bank).
    return t.wikidata && /^(fountain|library|clock|public_bookcase)$/.test(t.amenity || "") ? "sight" : null;
  }
  const PLACE_DESC = /palace|temple|shrine|gate|fortress|wall|tomb|park|garden|forest|museum|gallery|market|village|neighbo|street|alley|square|plaza|stream|river|lake|mountain|hill|peak|island|beach|bridge|tower|observatory|lighthouse|cathedral|church|hall|theat|library|monument|statue|memorial|landmark|building in|district|area in|attraction|viewpoint|skywalk/i;
  const NOT_PLACE = /dynasty|murder|assassinat|rule\b|war\b|battle|incident|massacre|protest|movement|era\b|period|election|treaty|company|corporation|court|ministry|government|agency|school|university|hospital|station|line\b|embassy|^\d{3,4}\s*[–-]\s*\d{2,4}/i;
  const KO_PLACE = /(궁|문|사|공원|시장|박물관|미술관|마을|거리|길|산|탑|다리|교|해수욕장|전망대|성|천|광장|정원|숲|섬|대|각|루|정)$/;
  function wikiKind(desc, title) {
    const s = `${desc || ""} ${title || ""}`;
    if (/palace|temple|shrine|gate|fortress|tomb|royal|wall|pavilion|throne|\bhall in \w+gung|gung\b/i.test(s) || /(궁|문|사|성|루|정|각|단|묘)$/.test(title || "")) return "heritage";
    if (/museum/i.test(s) || /박물관$/.test(title || "")) return "museum";
    if (/gallery|art cent/i.test(s) || /미술관$/.test(title || "")) return "gallery";
    if (/tower|observatory|skywalk|viewpoint|lookout/i.test(s) || /전망대$/.test(title || "")) return "view";
    if (/park|garden|forest|mountain|hill|island|beach|lake|stream|river/i.test(s) || /(공원|산|숲|섬|천|해수욕장)$/.test(title || "")) return "nature";
    if (/market/i.test(s) || /시장$/.test(title || "")) return "market";
    if (/village|neighbo|street|alley|district|area/i.test(s) || /(마을|거리|길)$/.test(title || "")) return "area";
    if (/theat|concert hall|performance|opera/i.test(s)) return "culture";
    return "sight";
  }
  const llOf = e => e.center ? {lat: e.center.lat, lng: e.center.lon} : {lat: e.lat, lng: e.lon};
  function fromOverpass(json) {
    const out = [];
    for (const e of (json && json.elements) || []) {
      const t = e.tags || {}, p = llOf(e), kind = osmKind(t);
      if (!kind || !t.name || !validLL(p)) continue;
      const enName = t["name:en"] && !/[;)]/.test(t["name:en"]) ? t["name:en"] : "";
      out.push({id: `o${e.type[0]}${e.id}`, osm: `${e.type}/${e.id}`, title: enName || t.name, ko: t["name:ko"] || (HANGUL.test(t.name) ? t.name : ""),
        lat: p.lat, lng: p.lng, kind, wd: /^Q\d+$/.test(t.wikidata || "") ? t.wikidata : "", en: !!enName,
        hours: t.opening_hours || "", web: t.website || t["contact:website"] || "", cuisine: t.cuisine || "", brand: !!t.brand,
        heritage: !!t.heritage, historic: !!t.historic, src: ["osm"]});
    }
    return out;
  }
  function fromWiki(json, lang) {
    const out = [];
    for (const pg of (json && json.query && json.query.pages) || []) {
      const c = pg.coordinates && pg.coordinates[0];
      if (!c || !validLL({lat: c.lat, lng: c.lon})) continue;
      const views = Object.values(pg.pageviews || {}).reduce((a, v) => a + (v || 0), 0);
      const wd = pg.pageprops && pg.pageprops.wikibase_item || "";
      const placeLike = lang === "en" ? PLACE_DESC.test(pg.description || "") && !NOT_PLACE.test(pg.description || "") && !/station$/i.test(pg.title)
        : KO_PLACE.test(pg.title) && !/역$/.test(pg.title);
      out.push({id: wd ? `w${wd}` : `p${lang}${pg.pageid}`, title: pg.title, ko: lang === "ko" ? pg.title : "", lat: c.lat, lng: c.lon,
        kind: wikiKind(pg.description, pg.title), wd, desc: pg.description || "", img: pg.thumbnail ? pg.thumbnail.source : "",
        wiki: {[lang]: pg.title}, views: {[lang]: views}, placeLike, en: lang === "en", src: [lang === "en" ? "wpen" : "wpko"]});
    }
    return out;
  }
  function wdSignals(json) {
    const out = {};
    for (const [q, e] of Object.entries((json && json.entities) || {})) {
      if (!e || e.missing !== undefined) continue;
      const claims = e.claims || {};
      const label = e.labels || {};
      out[q] = {sitelinks: Object.keys(e.sitelinks || {}).length, heritage: !!(claims.P1435 && claims.P1435.length),
        en: (e.sitelinks && e.sitelinks.enwiki && e.sitelinks.enwiki.title) || (label.en && label.en.value) || "", ko: (label.ko && label.ko.value) || ""};
    }
    return out;
  }
  // Heritage status (Wikidata P1435) arrives separately from a light SPARQL query.
  function applyHeritage(wd, ids) {
    const out = Object.assign({}, wd);
    for (const q of ids || []) out[q] = Object.assign({sitelinks: 0, en: "", ko: ""}, out[q], {heritage: true});
    return out;
  }
  // Group the same place across sources: same Wikidata item, or same name within 150 m, or a Wikipedia page within 60 m of an OSM place of a similar name.
  function mergeCandidates(lists, wd = {}) {
    const all = [].concat(...lists);
    const groups = [];
    const byWd = new Map();
    const sameName = (a, b) => { const x = fold(a), y = fold(b); return x && y && (x === y || (x.length > 4 && y.length > 4 && (x.includes(y) || y.includes(x)))); };
    for (const c of all) {
      let g = c.wd && byWd.get(c.wd);
      if (!g) g = groups.find(o => distKm(o, c) < 0.15 && (sameName(o.title, c.title) || (c.ko && sameName(o.ko, c.ko)) || sameName(o.ko, c.title) || sameName(o.title, c.ko)));
      if (!g) { g = Object.assign({}, c, {src: [...c.src], wiki: Object.assign({}, c.wiki), views: Object.assign({}, c.views)}); groups.push(g); if (c.wd) byWd.set(c.wd, g); continue; }
      for (const s of c.src) if (!g.src.includes(s)) g.src.push(s);
      if (c.osm && !g.osm) Object.assign(g, {id: g.wd ? g.id : c.id, osm: c.osm, lat: c.lat, lng: c.lng, kind: c.kind, hours: c.hours, web: c.web, cuisine: c.cuisine, brand: c.brand, heritage: g.heritage || c.heritage, historic: c.historic});
      if (c.en && !g.en) { g.title = c.title; g.en = true; }
      if (!g.wd && c.wd) { g.wd = c.wd; g.id = `w${c.wd}`; byWd.set(c.wd, g); }
      if (c.src.includes("wpen") && !g.en && !g.osm) g.title = c.title;
      g.ko = g.ko || c.ko;
      g.img = g.img || c.img;
      g.desc = g.desc || c.desc;
      g.placeLike = g.placeLike || c.placeLike;
      Object.assign(g.wiki, c.wiki || {});
      for (const [l, v] of Object.entries(c.views || {})) g.views[l] = Math.max(g.views[l] || 0, v);
    }
    // Wikipedia-only pages that don't look like a place (a dynasty, an event, a station) are dropped.
    return groups.filter(g => g.osm || g.placeLike || g.src.includes("ours")).map(g => {
      const s = g.wd && wd[g.wd];
      if (s) {
        g.sitelinks = s.sitelinks;
        g.heritage = g.heritage || s.heritage;
        if (!g.en && s.en && !HANGUL.test(s.en)) { g.ko = g.ko || g.title; g.title = s.en; g.en = true; }
        g.ko = g.ko || s.ko;
        if (!g.src.includes("wd")) g.src.push("wd");
      }
      if (!g.wd && !g.osm && g.id[0] !== "p" && g.id[0] !== "x") g.id = savedKey(g);
      return g;
    });
  }
  function curatedNear(center, km, pool) {
    return pool.filter(p => validLL(p) && distKm(center, p) <= km).map(p => ({id: p.id || savedKey(p), title: p.title, ko: p.ko || "", lat: +p.lat, lng: +p.lng,
      kind: p.kind || wikiKind(`${p.type || ""} ${p.about || p.cool || ""}`, p.title), wd: "", ours: p.ours, desc: p.cool || p.about || "", src: ["ours"], placeLike: true, wiki: {}, views: {}}));
  }
  const walkMinutes = km => Math.max(1, Math.round(km * 1.3 / 4.6 * 60));
  const fmtK = n => n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "") + "k" : String(n);
  const TIERS = [[70, "Must see", "gold"], [55, "Worth the detour", "teal"], [40, "Nice if nearby", "slate"], [0, "If passing by", "grey"]];
  const tierOf = score => TIERS.find(t => score >= t[0]);
  // 0–100 from open signals only: how known (Wikipedia views, languages), protected heritage, our own research, listing detail, and the walk.
  function worthScore(c, center) {
    const views = (c.views && ((c.views.en || 0) + (c.views.ko || 0) * 0.6)) || 0;
    const f1 = clamp01(Math.log10(views + 1) / 4.3), f2 = clamp01(Math.log10((c.sitelinks || 0) + 1) / Math.log10(61));
    const fame = Math.round(35 * (c.sitelinks ? 0.65 * f1 + 0.35 * f2 : f1));
    const heritage = c.heritage ? 12 : c.historic ? 6 : 0;
    const research = c.ours ? (c.ours.kind === "idea" ? 20 : 16) : 0;
    // Food has no open fame signal, so it is judged on how local and how well documented it is (ratings stay one tap away).
    const sightlike = SIGHTLIKE.has(c.kind), local = LOCAL_FOOD.test(c.cuisine || "");
    const detail = sightlike
      ? Math.max(0, Math.min(13, 5 + (c.en ? 2 : 0) + (c.hours ? 2 : 0) + (c.web ? 2 : 0) + (c.img ? 2 : 0) - (c.brand ? 6 : 0)))
      : Math.max(0, Math.min(25, (local ? 7 : c.cuisine ? 3 : 0) + (c.en ? 5 : 0) + (c.hours ? 5 : 0) + (c.web ? 4 : 0) + (c.img ? 2 : 0) + (c.wd ? 4 : 0) - (c.brand ? 8 : 0)));
    const km = center ? distKm(center, c) : 0, walk = walkMinutes(km);
    const near = Math.round(20 * clamp01(1 - (walk - 4) / 26));
    const score = Math.max(0, Math.min(100, fame + heritage + research + detail + near));
    const why = [];
    if (c.ours) why.push(["💎", c.ours.kind === "idea" ? "Our Explore pick" : `Our ${c.ours.label || "alternative"}`, research]);
    if (c.heritage) why.push(["🏯", "Protected heritage", heritage]); else if (c.historic) why.push(["🏯", "Historic site", heritage]);
    if (views >= 50) why.push(["📈", `${fmtK(Math.round(views))} Wikipedia views/month`, fame]);
    if ((c.sitelinks || 0) >= 5) why.push(["🌐", `On ${c.sitelinks} language wikis`, Math.round(fame / 2)]);
    if (c.brand) why.push(["⛓️", "A chain", sightlike ? -6 : -8]);
    if (!sightlike && local) why.push(["🥢", "Local Korean food", 7]);
    if (!sightlike && c.en) why.push(["🔤", "English name listed", 5]);
    if (c.hours) why.push(["🕒", "Opening hours listed", sightlike ? 2 : 5]);
    why.push(["🚶", walk <= 1 ? "Right here" : `${walk} min walk`, near]);
    why.sort((a, b) => b[2] - a[2]);
    return {score, tier: tierOf(score), walk, km: Math.round(km * 100) / 100, parts: {fame, heritage, research, detail, near}, why,
      sources: new Set(c.src.map(s => s === "wpko" ? "wpen" : s)).size};
  }
  // Every key a place can be known by; saves match on any of them.
  function placeKeys(p) {
    const out = [];
    if (p.wd) out.push(`w${p.wd}`);
    if (p.osm) out.push(`o${p.osm[0]}${p.osm.split("/")[1]}`);
    if (!out.length || p.title) out.push(hashKey(p));
    return [...new Set(out)];
  }
  function hashKey(p) {
    let h = 0;
    const s = `${fold(p.title || p.name)}|${(+p.lat).toFixed(4)}|${(+p.lng).toFixed(4)}`;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return `g${h.toString(36)}`;
  }
  // Stable keys for saved places (valid Firestore field names).
  function savedKey(p) {
    if (p.wd) return `w${p.wd}`;
    if (p.osm) return `o${p.osm[0]}${p.osm.split("/")[1]}`;
    return hashKey(p);
  }
  function discover(sources, center, radiusKm, opts = {}) {
    const lists = [sources.osm || [], sources.en || [], sources.ko || [], sources.ours || []];
    const planned = opts.planned || [];
    return mergeCandidates(lists, sources.wd || {})
      .filter(c => distKm(center, c) <= radiusKm && !planned.some(p => distKm(p, c) < 0.08 || (fold(p.title) && fold(p.title) === fold(c.title))))
      .map(c => Object.assign(c, {worth: worthScore(c, center)}))
      .sort((a, b) => b.worth.score - a.worth.score || a.worth.km - b.worth.km);
  }
  const savedEntry = (c, ctx = {}) => ({t: String(c.title).slice(0, 80), ko: String(c.ko || "").slice(0, 60), lat: +(+c.lat).toFixed(6), lng: +(+c.lng).toFixed(6),
    cat: c.kind, score: c.worth ? c.worth.score : 0, why: c.worth ? c.worth.why.filter(w => w[2] > 0).slice(0, 3).map(w => `${w[0]} ${w[1]}`) : [],
    src: [...new Set(c.src || [])].slice(0, 5), wp: c.wiki && (c.wiki.en ? `en:${c.wiki.en}` : c.wiki.ko ? `ko:${c.wiki.ko}` : "") || "",
    city: ctx.city || "", near: String(ctx.near || "").slice(0, 80), day: ctx.day != null ? ctx.day : null, at: ctx.at || Date.now()});

  const MODEL = {DAY_COLORS, dayColor, validLL, distKm, fareText, legBetween, buildDay, alternativesOf,
    plannedIdeaIds, nearestStop, nearbyIdeas, openProposals, proposalDays, placeUrl, legUrl, dayRouteUrl,
    toMin, fmtMin, needMin, schedule, seoulNow, tripDayIndex, nextUp, kakaoTo, kakaoRoute,
    fold, DISC_KINDS, DISC_FILTERS, osmKind, fromOverpass, fromWiki, wdSignals, applyHeritage, mergeCandidates, curatedNear, walkMinutes,
    worthScore, tierOf, savedKey, placeKeys, discover, savedEntry};
  if (typeof module === "object" && module.exports) { module.exports = MODEL; return; }
  if (typeof window === "undefined" || !window.APP) return;
  if (new URLSearchParams(location.search).has("visual-preview")) return;

  /* ---------- styles ---------- */
  const CSS = `
#tripmap{background:transparent}
#tripmap .tmap:focus,#tripmap .tmap:focus-visible{outline:none}
#tripmap::backdrop{background:rgba(17,22,40,.45);backdrop-filter:blur(4px)}
.tmap{position:absolute;inset:0;display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:auto auto minmax(0,1fr);background:var(--bg);color:var(--ink);overflow:hidden;font-family:var(--body)}
.tm-head{display:flex;align-items:center;gap:12px;padding:calc(var(--sat) + 12px) 16px 6px}
.tm-head .tm-ttl{flex:1;min-width:0}
.tm-head p{margin:0;color:var(--muted);font-size:12px;letter-spacing:.02em}
.tm-head h2{margin:0;font:700 20px/1.2 var(--display);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tm-ib{width:44px;height:44px;flex:0 0 44px;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;background:var(--surface);border:1px solid var(--line);color:var(--ink);cursor:pointer}
.tm-ib svg{width:19px;height:19px}
.tm-days{display:flex;gap:6px;overflow-x:auto;padding:4px 16px 10px;scrollbar-width:none;touch-action:pan-x}
.tm-days::-webkit-scrollbar{display:none}
.tm-chip{flex:0 0 auto;min-height:44px;border-radius:14px;padding:5px 12px;border:1px solid var(--line);background:var(--surface);display:flex;flex-direction:column;justify-content:center;align-items:flex-start;line-height:1.2;cursor:pointer;color:var(--ink)}
.tm-chip b{font-size:13px;display:flex;align-items:center;gap:6px}
.tm-chip b i{width:9px;height:9px;border-radius:50%;background:var(--dc,var(--ink))}
.tm-chip small{font-size:11px;color:var(--muted)}
.tm-chip[aria-pressed="true"]{border-color:var(--dc,var(--ink));box-shadow:inset 0 0 0 1px var(--dc,var(--ink));background:var(--soft)}
.tm-chip.drop-ok{border-style:dashed;border-color:var(--dc)}
.tm-chip.drop-over{background:var(--dc);color:#fff}.tm-chip.drop-over small{color:#fff}
.tm-body{position:relative;min-height:0;display:grid}
.tm-map{position:relative;min-height:0;background:#e9ecef;touch-action:none;outline:none}
.tm-map:focus-visible{outline:3px solid var(--seoul);outline-offset:-3px}
:root[data-theme="dark"] .tm-map{background:#1b1f2a}
.tm-mapmsg{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:24px;text-align:center;color:var(--muted);z-index:500}
.tm-ctl{position:absolute;top:12px;right:12px;z-index:800;display:flex;flex-direction:column;gap:8px}
.tm-ctl .tm-ib{background:var(--glass,var(--surface));box-shadow:0 8px 24px -12px rgba(17,22,40,.4)}
.tm-ctl .tm-ib[aria-pressed="true"]{color:var(--seoul);border-color:var(--seoul)}
.tm-layers{position:absolute;top:12px;right:64px;z-index:801;background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:16px;padding:8px;box-shadow:0 16px 40px -18px rgba(17,22,40,.5);min-width:220px}
.tm-layers[hidden]{display:none}
.tm-layers label{display:flex;align-items:center;gap:10px;min-height:40px;padding:0 8px;border-radius:10px;font-size:14px;cursor:pointer}
.tm-layers label:hover{background:var(--soft)}
.tm-layers input{width:18px;height:18px;accent-color:var(--seoul)}
.tm-panel{background:var(--surface);color:var(--ink);overflow:auto;touch-action:pan-y;overscroll-behavior:contain;scrollbar-width:thin}
.tm-pbody{padding:16px 16px calc(var(--sab) + 20px)}
.tm-grab{display:none}
.tm-dhead{border-bottom:1px solid var(--line);padding-bottom:14px;margin-bottom:6px}
.tm-eyebrow{margin:0;display:flex;align-items:center;gap:6px;color:var(--muted);font-size:12px;font-weight:600}
.tm-eyebrow i{width:10px;height:10px;border-radius:50%;background:var(--dc)}
.tm-dhead h3{margin:4px 0 2px;font:700 20px/1.2 var(--display)}
.tm-stats{margin:0;color:var(--muted);font-size:13px}
.tm-acts,.tm-dacts{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:10px}
.tm-btn{display:inline-flex;align-items:center;gap:6px;height:40px;padding:0 12px;border-radius:12px;border:1px solid var(--line);background:var(--soft);color:var(--ink);font:600 13px/1 var(--body);text-decoration:none;cursor:pointer;white-space:nowrap}
.tm-btn svg{width:16px;height:16px}
.tm-btn.pri{background:var(--ink);color:var(--surface);border-color:var(--ink)}
.tm-btn.warn{color:var(--rose)}
.tm-warn{margin:10px 0 4px;padding:10px 12px;border-radius:12px;background:rgba(213,154,23,.12);color:var(--ink);font-size:13px;line-height:1.45}
.tm-list{list-style:none;margin:0;padding:0}
.tm-stop{position:relative;border-radius:14px}
.tm-stop.drop-over{box-shadow:inset 0 -3px 0 var(--dc)}
.tm-stop.dragging{opacity:.4}
.tm-row{width:100%;display:flex;align-items:flex-start;gap:12px;padding:10px 8px;border-radius:14px;text-align:left;color:var(--ink);cursor:pointer;background:none;border:0;font:inherit}
.tm-row:hover{background:var(--soft)}
.tm-stop.is-sel .tm-row{background:var(--soft);box-shadow:inset 0 0 0 1px var(--dc)}
.tm-n{flex:0 0 28px;height:28px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:var(--dc);color:#fff;font:700 13px/1 var(--body);box-shadow:0 0 0 2px var(--surface)}
.tm-n.hotel{background:#2a2f45}
.tm-copy{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.tm-copy small{color:var(--muted);font-size:12px;display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center}
.tm-copy b{font-size:15px;line-height:1.3}
.tm-copy em{font-style:normal;color:var(--muted);font-size:12px}
.tm-badge{display:inline-flex;align-items:center;padding:1px 7px;border-radius:999px;font-size:11px;font-weight:700;background:var(--soft);border:1px solid var(--line);color:var(--ink)}
.tm-badge.prop{background:rgba(213,154,23,.16);border-color:rgba(213,154,23,.4)}
.tm-badge.new{background:rgba(22,163,74,.14);border-color:rgba(22,163,74,.35)}
.tm-stop.is-removed .tm-copy b{text-decoration:line-through;color:var(--muted)}
.tm-stop .tm-acts{display:none;padding:0 8px 12px 48px;margin-top:0}
.tm-stop.is-sel .tm-acts{display:flex}
.tm-drag{flex:0 0 auto;align-self:center;color:var(--muted);cursor:grab;font-size:16px;line-height:1;padding:4px}
.tm-leg{display:flex;align-items:center;gap:8px;margin-left:21px;padding:4px 0 4px 18px;border-left:2px dotted var(--line);font-size:12px;color:var(--muted)}
.tm-leg.taxi,.tm-leg.train{border-left-style:solid}
.tm-leg.is-long{color:#b7791f;font-weight:600}
.tm-leg a{margin-left:auto;color:var(--muted);font-size:12px;padding:6px 4px}
.tm-sec{margin-top:18px;padding-top:14px;border-top:1px solid var(--line)}
.tm-sec h4{margin:0 0 8px;font:700 14px/1.3 var(--display)}
.tm-sec p.sub{margin:-4px 0 8px;color:var(--muted);font-size:12px}
.tm-irow{display:flex;align-items:center;gap:8px}
.tm-irow .tm-row{flex:1}
.tm-ico{flex:0 0 28px;height:28px;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;background:rgba(232,85,122,.14);font-size:15px}
.tm-help{margin:18px 0 0;color:var(--muted);font-size:12px;line-height:1.5}
.tm-dayrow .tm-n{border-radius:10px}
.tm-total{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}
.tm-total div{background:var(--soft);border-radius:12px;padding:8px 10px;font-size:12px;color:var(--muted)}
.tm-total b{display:block;color:var(--ink);font-size:16px}
/* markers */
.tm-pin{position:relative;width:30px;height:30px;border-radius:50% 50% 50% 4px;transform:rotate(-45deg);background:var(--dc);border:2px solid #fff;box-shadow:0 4px 10px -2px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;transition:transform .2s}
.tm-pin span{transform:rotate(45deg);color:#fff;font:800 13px/1 -apple-system,system-ui,sans-serif}
.tm-pin.sm{width:24px;height:24px}.tm-pin.sm span{font-size:11px}
.tm-pin.hotel{background:#2a2f45}
.tm-pin.is-sel{transform:rotate(-45deg) scale(1.3);box-shadow:0 0 0 4px rgba(255,255,255,.75),0 6px 16px -2px rgba(0,0,0,.5)}
.tm-alt{width:22px;height:22px;border-radius:50%;background:#fff;border:2px dashed var(--dc);color:var(--dc);display:flex;align-items:center;justify-content:center;font:800 11px/1 -apple-system,system-ui,sans-serif;box-shadow:0 2px 6px rgba(0,0,0,.25)}
.tm-idea{width:24px;height:24px;transform:rotate(45deg);border-radius:6px;background:#fff;border:2px solid var(--rose);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.25)}
.tm-idea span{transform:rotate(-45deg);font-size:12px;line-height:1}
.tm-prop{width:28px;height:28px;border-radius:50%;background:#fff8e6;border:2px dashed var(--gold);display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,.3)}
.tm-me{width:18px;height:18px;border-radius:50%;background:#1a73e8;border:3px solid #fff;box-shadow:0 0 0 6px rgba(26,115,232,.25)}
.tmap .leaflet-container{font:inherit;background:transparent}
.tmap .leaflet-popup-content-wrapper{border-radius:16px;background:var(--surface);color:var(--ink);box-shadow:0 16px 40px -16px rgba(0,0,0,.5)}
.tmap .leaflet-popup-tip{background:var(--surface)}
.tmap .leaflet-popup-content{margin:14px 16px;min-width:220px;max-width:280px;font-size:13px;line-height:1.45}
.tmap .leaflet-popup-content h5{margin:2px 0 4px;font:700 15px/1.3 var(--display)}
.tmap .leaflet-popup-content p{margin:4px 0}
.tmap .leaflet-popup-content .tm-btn{height:36px;padding:0 10px;font-size:12px}
.tmap .leaflet-container a.tm-btn{color:var(--ink)}
.tmap .leaflet-container a.tm-btn.pri{color:var(--surface)}
.tmap .leaflet-popup-close-button{width:32px;height:32px;font-size:22px;color:var(--muted)}
.tmap .leaflet-tooltip{border-radius:8px;font-size:12px;font-weight:600}
.tmap .leaflet-control-attribution{font-size:10px;background:rgba(255,255,255,.75)}
:root[data-theme="dark"] .tmap .leaflet-control-attribution{background:rgba(23,28,46,.8);color:#b1bad2}
:root[data-theme="dark"] .tmap .leaflet-control-attribution a{color:#cfd6ea}
.tm-mi-ic{color:var(--seoul)}
.comfort-map{grid-column:1/-1;display:flex;align-items:center;gap:12px;margin-top:8px;padding:12px 14px;border-radius:16px;border:1px solid var(--line);background:var(--soft);color:var(--ink);text-align:left;cursor:pointer;min-height:56px}
.comfort-map svg{width:22px;height:22px;color:var(--seoul);flex:0 0 auto}
.comfort-map b{display:block;font-size:14px}.comfort-map small{color:var(--muted);font-size:12px}
.tm-daymap{display:inline-flex;align-items:center;gap:4px;min-height:32px;padding:0 10px;border-radius:999px;border:1px solid var(--line);background:var(--soft);color:var(--ink);font:600 12px/1 var(--body);cursor:pointer}
.tm-daymap svg{width:14px;height:14px}
@media (min-width:900px){
  .tmap{inset:20px;border-radius:24px;border:1px solid var(--line);box-shadow:0 30px 80px -30px rgba(0,0,0,.5)}
  .tm-head{padding-top:14px}
  .tm-body{grid-template-columns:400px minmax(0,1fr)}
  .tm-panel{grid-column:1;grid-row:1;border-right:1px solid var(--line)}
  .tm-map{grid-column:2;grid-row:1}
}
@media (max-width:899px){
  .tm-head h2{font-size:18px}
  .tm-map{position:absolute;inset:0}
  .tm-panel{position:absolute;left:0;right:0;bottom:0;height:var(--tm-ph,44%);border-radius:22px 22px 0 0;box-shadow:0 -12px 40px -18px rgba(17,22,40,.45);transition:height .35s cubic-bezier(.2,.8,.2,1);z-index:900}
  .tm-panel[data-size="min"]{--tm-ph:118px}
  .tm-panel[data-size="peek"]{--tm-ph:44%}
  .tm-panel[data-size="full"]{--tm-ph:calc(100% - 8px)}
  .tm-grab{display:flex;position:sticky;top:0;z-index:2;width:100%;height:30px;align-items:center;justify-content:center;background:var(--surface);border:0;cursor:grab;touch-action:none}
  .tm-grab i{width:44px;height:5px;border-radius:5px;background:var(--line);box-shadow:inset 0 0 0 9px rgba(17,22,40,.18)}
  .tm-pbody{padding-top:4px}
  .tm-ctl{top:10px;right:10px}
  .tm-layers{right:62px;top:10px}
}
/* motion */
#tripmap[open] .tmap{animation:tm-in .32s cubic-bezier(.2,.8,.2,1)}
#tripmap[open]::backdrop{animation:tm-fade .32s ease}
#tripmap.tm-closing .tmap{animation:tm-out .2s ease forwards}
#tripmap.tm-closing::backdrop{animation:tm-fade-out .2s ease forwards}
@keyframes tm-in{from{opacity:0;transform:translateY(18px) scale(.985)}}
@keyframes tm-out{to{opacity:0;transform:translateY(14px) scale(.985)}}
@keyframes tm-fade{from{opacity:0}}
@keyframes tm-fade-out{to{opacity:0}}
.tm-pbody.tm-swap{animation:tm-fade .24s ease}
.tm-pbody.tm-swap-l{animation:tm-slide-l .3s cubic-bezier(.2,.8,.2,1)}
.tm-pbody.tm-swap-r{animation:tm-slide-r .3s cubic-bezier(.2,.8,.2,1)}
@keyframes tm-slide-l{from{opacity:0;transform:translateX(-28px)}}
@keyframes tm-slide-r{from{opacity:0;transform:translateX(28px)}}
.tm-pin{transition:transform .22s cubic-bezier(.2,.8,.2,1),box-shadow .22s}
.tm-pin.is-hover{transform:rotate(-45deg) scale(1.18)}
.tm-stop.is-hover>.tm-row{background:var(--soft)}
.tm-panel.dragging{transition:none}
/* day header */
.tm-dnav{display:flex;align-items:center;gap:8px;margin:-4px 0 2px}
.tm-dnav .tm-eyebrow{flex:1;min-width:0}
.tm-step{width:36px;height:36px;flex:0 0 36px;border-radius:12px;font:500 22px/1 var(--body)}
.tm-step:disabled{opacity:.3;cursor:default}
.tm-today{color:var(--rose)}
.tm-now{display:flex;align-items:center;gap:12px;width:100%;margin:12px 0 2px;padding:12px 14px;border-radius:16px;border:1px solid var(--dc);background:var(--soft);background:color-mix(in srgb,var(--dc) 10%,var(--surface));color:var(--ink);text-align:left;cursor:pointer;font:inherit}
p.tm-now{cursor:default}
.tm-now>span:last-child{display:flex;flex-direction:column;min-width:0}
.tm-now small{font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--dc)}
.tm-now b{font-size:15px;line-height:1.3}
.tm-now em{font-style:normal;font-size:13px;color:var(--muted)}
.tm-pulse{width:12px;height:12px;border-radius:50%;background:var(--dc);flex:0 0 12px;animation:tm-pulse 1.8s ease-out infinite}
@keyframes tm-pulse{0%{box-shadow:0 0 0 0 var(--dc)}70%,100%{box-shadow:0 0 0 10px transparent}}
.tm-badge.now{background:var(--dc,var(--rose));color:#fff;border-color:transparent}
.tm-stop.is-next .tm-n{box-shadow:0 0 0 3px var(--surface),0 0 0 5px var(--dc)}
.tm-copy em.tm-tight{color:#b7791f;font-weight:600}
:root[data-theme="dark"] .tm-copy em.tm-tight{color:#f0c060}
.tm-legtxt{flex:1;min-width:0}
.tm-leave{font-weight:600;color:var(--ink);white-space:nowrap}
.tm-pbody.touring .tm-stop.is-sel .tm-acts{display:none}
.tm-leglinks{display:inline-flex;gap:2px;flex:0 0 auto}
.tm-leg .tm-leglinks a{margin-left:0;padding:6px;border-radius:8px;text-decoration:none}
.tm-leg .tm-leglinks a:hover{background:var(--soft);color:var(--ink)}
/* search */
.tm-search{position:relative;flex:0 1 320px;display:flex;align-items:center}
.tm-search input{width:100%;height:44px;border-radius:14px;border:1px solid var(--line);background:var(--surface);color:var(--ink);padding:0 12px 0 38px;font:500 14px/1 var(--body);outline:none;-webkit-appearance:none;appearance:none}
.tm-search input:focus{border-color:var(--seoul);box-shadow:0 0 0 3px rgba(79,95,230,.2)}
.tm-sicon{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--muted);display:flex;pointer-events:none}
.tm-sicon svg{width:17px;height:17px}
.tm-results{position:absolute;top:50px;left:0;right:0;z-index:1200;list-style:none;margin:0;padding:6px;background:var(--surface);border:1px solid var(--line);border-radius:16px;box-shadow:0 20px 50px -20px rgba(17,22,40,.5);max-height:min(60vh,420px);overflow:auto;overscroll-behavior:contain;touch-action:pan-y}
.tm-results[hidden]{display:none}
.tm-results li{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;cursor:pointer;min-height:44px}
.tm-results li[aria-selected="true"],.tm-results li:hover{background:var(--soft)}
.tm-results li>i{width:10px;height:10px;border-radius:50%;background:var(--dc);flex:0 0 10px}
.tm-results li>span{display:flex;flex-direction:column;min-width:0}
.tm-results li b{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tm-results li small{font-size:12px;color:var(--muted)}
.tm-results li.empty{color:var(--muted);cursor:default}
.tm-sbtn{display:none}
/* tour */
.tm-caption{position:absolute;left:50%;top:14px;transform:translateX(-50%);z-index:850;width:max-content;max-width:min(92%,460px);padding:10px 16px;border-radius:16px;background:var(--surface);color:var(--ink);box-shadow:0 14px 40px -16px rgba(17,22,40,.5);border:1px solid var(--line);font-size:13px;text-align:center;pointer-events:none;animation:tm-fade .25s ease}
.tm-caption[hidden]{display:none}
.tm-caption small{display:block;color:var(--muted)}
.tm-caption b{display:block;font-size:15px}
.tm-tourdot{width:18px;height:18px;border-radius:50%;background:#fff;border:4px solid var(--dc);box-shadow:0 0 0 6px rgba(255,255,255,.55),0 4px 10px rgba(0,0,0,.35)}
/* show the driver */
.tm-driver{position:absolute;inset:0;z-index:2000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:calc(var(--sat) + 24px) 24px calc(var(--sab) + 24px);background:#fffdf7;color:#111;text-align:center;animation:tm-fade .2s ease;border-radius:inherit}
.tm-driver[hidden]{display:none}
.tm-driver .k-say{margin:0;font-size:clamp(18px,5vw,24px);color:#444}
.tm-driver .k-ko{margin:0;font:800 clamp(40px,11vw,84px)/1.12 "Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif;word-break:keep-all;letter-spacing:-.01em}
.tm-driver .k-en{margin:0;font-size:16px;color:#555}
.tm-driver .k-hint{margin:6px 0 0;font-size:13px;color:#777}
.tm-driver .tm-acts{justify-content:center}
.tm-driver .tm-btn{min-height:44px;background:#f1efe8;color:#111;border-color:#e2dfd4}
.tm-driver .tm-btn.pri{background:#111;color:#fff;border-color:#111}
.tm-toast{position:absolute;left:50%;bottom:28px;transform:translateX(-50%);z-index:2100;max-width:min(92%,420px);padding:10px 16px;border-radius:14px;background:var(--ink);color:var(--surface);font-size:13px;font-weight:600;box-shadow:0 14px 40px -16px rgba(0,0,0,.5);animation:tm-fade .2s ease;pointer-events:none}
.tm-toast[hidden]{display:none}
@media (min-width:900px){
  .tm-caption,.tm-toast{left:calc(400px + (100% - 400px) / 2)}
}
@media (max-width:899px){
  .tm-sbtn{display:inline-flex}
  .tm-search{display:none;position:absolute;left:12px;right:12px;top:calc(var(--sat) + 10px);z-index:1300;flex:none}
  .tmap.searching .tm-search{display:flex}
  .tmap.searching .tm-ttl,.tmap.searching .tm-sbtn,.tmap.searching #tm-close{visibility:hidden}
  .tm-caption{top:48px;left:12px;right:64px;transform:none;width:auto;max-width:none}
  .tm-toast{bottom:auto;top:calc(var(--sat) + 118px)}
  .tm-dhead{touch-action:pan-y}
  .tm-grab{height:34px}
}
/* smoothness: reveal, unfold, popups, selection */
.tm-map>.leaflet-pane,.tm-map>.leaflet-control-container{transition:opacity .5s cubic-bezier(.2,.8,.2,1)}
.tm-map.tm-veil>.leaflet-pane,.tm-map.tm-veil>.leaflet-control-container{opacity:0}
.tm-map.tm-veil{background:linear-gradient(110deg,var(--soft) 30%,color-mix(in srgb,var(--soft) 30%,var(--surface)) 50%,var(--soft) 70%);background-size:250% 100%;animation:tm-shimmer 1.4s linear infinite}
.tm-loading{gap:12px}
.tm-loadmap{width:52px;height:52px;border-radius:18px;display:flex;align-items:center;justify-content:center;background:var(--surface);color:var(--seoul);box-shadow:0 10px 30px -14px rgba(17,22,40,.45);animation:tm-breathe 1.6s ease-in-out infinite}
.tm-loadmap svg{width:26px;height:26px}
@keyframes tm-breathe{50%{transform:translateY(-4px) scale(1.05)}}
.tm-pin.drop{animation:tm-drop .55s cubic-bezier(.2,1.5,.45,1) both;animation-delay:calc(var(--i,0) * 70ms + 120ms)}
@keyframes tm-drop{from{opacity:0;transform:translateY(-26px) rotate(-45deg) scale(.4)}60%{opacity:1}}
.tmap path.tm-draw{stroke-dasharray:1.01;stroke-dashoffset:1.01;animation:tm-draw .6s cubic-bezier(.4,0,.2,1) forwards;animation-delay:calc(var(--i,0) * 110ms + 60ms)}
@keyframes tm-draw{to{stroke-dashoffset:0}}
.tmap path.tm-fadein{animation:tm-fade .5s ease both;animation-delay:calc(var(--i,0) * 110ms + 60ms)}
.tmap .leaflet-popup-content-wrapper,.tmap .leaflet-popup-tip-container{transform-origin:50% 100%;animation:tm-popin .26s cubic-bezier(.2,1.25,.4,1) both}
@keyframes tm-popin{from{opacity:0;transform:translateY(8px) scale(.92)}}
.tm-pin.is-sel::after{content:"";position:absolute;inset:-7px;border-radius:50% 50% 50% 8px;border:2px solid var(--dc);opacity:0;animation:tm-halo 1.8s ease-out infinite;pointer-events:none}
@keyframes tm-halo{0%{opacity:.75;transform:scale(.8)}100%{opacity:0;transform:scale(1.55)}}
.tm-stop.is-sel .tm-acts,.tm-drow.is-sel .tm-acts{animation:tm-expand .32s cubic-bezier(.2,.8,.2,1) both;overflow:hidden}
@keyframes tm-expand{from{max-height:0;opacity:0;transform:translateY(-4px)}to{max-height:260px;opacity:1}}
.tm-chip.tm-pop{animation:tm-chippop .4s cubic-bezier(.2,1.6,.4,1)}
@keyframes tm-chippop{40%{transform:scale(1.07)}}
.tm-chip{transition:background .25s,border-color .25s,box-shadow .25s,transform .2s}
.tm-chip:active,.tm-btn:active,.tm-ib:active{transform:scale(.96)}
.tm-btn,.tm-ib{transition:transform .15s,background .2s,border-color .2s,color .2s}
.tm-row{transition:background .2s}
/* discover around: shadow marks with scores, radar, saved hearts */
@property --p{syntax:"<number>";inherits:true;initial-value:0}
.tmap{--t-gold:#d59a17;--t-teal:#0e9aa7;--t-slate:#6b7392;--t-grey:#a3a9bb;--her:#e8557a;--me:#4f5fe6}
.tm-sh{--tc:var(--t-grey);--p:0;position:relative;width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  background:conic-gradient(var(--tc) calc(var(--p) * 1%),rgba(255,255,255,.55) 0);box-shadow:0 6px 16px -6px rgba(17,22,40,.55),0 0 0 6px color-mix(in srgb,var(--tc) 16%,transparent);
  opacity:.9;transition:--p .9s cubic-bezier(.2,.8,.2,1),transform .25s cubic-bezier(.2,1.4,.4,1),opacity .25s,box-shadow .25s;animation:tm-pop .5s cubic-bezier(.2,1.5,.4,1) both;animation-delay:calc(var(--i,0) * 38ms);cursor:pointer}
.tm-sh::before{content:"";position:absolute;inset:4px;border-radius:50%;background:var(--surface,#fff)}
.tm-sh b{position:relative;font:800 13px/1 -apple-system,system-ui,sans-serif;color:var(--ink,#111628);font-variant-numeric:tabular-nums}
.tm-sh i{position:absolute;right:-5px;bottom:-5px;width:18px;height:18px;border-radius:50%;background:var(--surface,#fff);display:flex;align-items:center;justify-content:center;font-size:11px;font-style:normal;box-shadow:0 1px 4px rgba(0,0,0,.25)}
.tm-sh.t-gold{--tc:var(--t-gold)}.tm-sh.t-teal{--tc:var(--t-teal)}.tm-sh.t-slate{--tc:var(--t-slate)}
.tm-sh.is-hover,.tm-sh.is-sel{transform:scale(1.22);opacity:1;z-index:5}
.tm-sh.is-sel{box-shadow:0 8px 22px -6px rgba(17,22,40,.6),0 0 0 7px color-mix(in srgb,var(--tc) 35%,transparent)}
.tm-sh.out{animation:tm-shout .22s ease forwards}
.tm-sh.bump{animation:tm-bump .5s cubic-bezier(.2,1.5,.4,1)}
.tm-sh .tm-hearts{position:absolute;left:-6px;top:-7px;display:flex;font-size:13px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.3));animation:tm-pop .45s cubic-bezier(.2,1.6,.4,1) both}
.tm-sh.saved{opacity:1}
.tm-sh.saved.only{transform:scale(.88);opacity:.82}
.tm-sh.burst::after{content:"";position:absolute;inset:-6px;border-radius:50%;border:3px solid var(--her);animation:tm-burst .7s ease-out forwards;pointer-events:none}
.tm-dim .tm-sh:not(.is-sel):not(.is-hover){opacity:.42}
@keyframes tm-pop{from{transform:scale(.2) translateY(10px);opacity:0}}
@keyframes tm-shout{to{transform:scale(.3);opacity:0}}
@keyframes tm-bump{40%{transform:scale(1.3)}}
@keyframes tm-burst{from{transform:scale(.7);opacity:1}to{transform:scale(1.9);opacity:0}}
.tm-radar{position:relative;pointer-events:none}
.tm-radar>span{position:absolute;left:50%;top:50%;width:var(--d);height:var(--d);margin:calc(var(--d) / -2) 0 0 calc(var(--d) / -2);border-radius:50%}
.tm-radar .sweep{background:conic-gradient(from 0deg,color-mix(in srgb,var(--dc) 38%,transparent),transparent 28%);animation:tm-spin 1.6s linear infinite;opacity:.9;transition:opacity .6s}
.tm-radar .ring{border:2px solid var(--dc);opacity:0;animation:tm-ring 2s ease-out infinite}
.tm-radar .ring.r2{animation-delay:.65s}.tm-radar .ring.r3{animation-delay:1.3s}
.tm-radar.done .sweep,.tm-radar.done .ring{animation:none;opacity:0}
@keyframes tm-spin{to{transform:rotate(360deg)}}
@keyframes tm-ring{from{transform:scale(.08);opacity:.85}to{transform:scale(1);opacity:0}}
.tm-radius{animation:tm-dash 30s linear infinite}
@keyframes tm-dash{to{stroke-dashoffset:-400}}
/* panel */
.tm-disc{margin:6px 0 14px;padding:14px;border-radius:18px;border:1px solid color-mix(in srgb,var(--dc,var(--seoul)) 35%,var(--line));background:color-mix(in srgb,var(--dc,var(--seoul)) 6%,var(--surface));animation:tm-fade .3s ease}
.tm-disc-h{display:flex;align-items:center;gap:8px}
.tm-disc-h h4{flex:1;margin:0;font:700 15px/1.3 var(--display)}
.tm-disc-h .tm-ib{width:36px;height:36px;flex:0 0 36px;border-radius:11px}
.tm-src{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 2px}
.tm-src span{display:inline-flex;align-items:center;gap:5px;height:26px;padding:0 9px;border-radius:999px;background:var(--surface);border:1px solid var(--line);font-size:11px;font-weight:600;color:var(--muted);transition:color .3s,border-color .3s,background .3s}
.tm-src span.ok{color:var(--ink);border-color:color-mix(in srgb,var(--t-teal) 55%,var(--line))}
.tm-src span.err{color:#b7791f}
.tm-src span.load::before{content:"";width:9px;height:9px;border-radius:50%;border:2px solid var(--muted);border-right-color:transparent;animation:tm-spin .8s linear infinite}
.tm-src span.ok::before{content:"✓";color:var(--t-teal);font-weight:800}
.tm-seg{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
.tm-seg button{height:34px;padding:0 11px;border-radius:11px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font:600 12px/1 var(--body);cursor:pointer;transition:background .2s,color .2s,border-color .2s}
.tm-seg button[aria-pressed="true"]{background:var(--ink);color:var(--surface);border-color:var(--ink)}
.tm-follow{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:12px;color:var(--muted);cursor:pointer}
.tm-follow input{width:16px;height:16px;accent-color:var(--seoul)}
.tm-dsum{margin:10px 0 4px;font-size:12px;color:var(--muted)}
.tm-dlist{list-style:none;margin:6px 0 0;padding:0}
.tm-drow{display:flex;align-items:center;gap:4px;border-radius:14px;animation:tm-rowin .4s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--i,0) * 30ms)}
@keyframes tm-rowin{from{opacity:0;transform:translateY(8px)}}
.tm-drow>.tm-row{flex:1;min-width:0;padding:8px 6px}
.tm-drow.is-sel{background:var(--surface);box-shadow:inset 0 0 0 1px var(--tc,var(--line))}
.tm-drow.is-hover>.tm-row{background:var(--soft)}
.tm-ring{--tc:var(--t-grey);--p:0;position:relative;flex:0 0 40px;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:conic-gradient(var(--tc) calc(var(--p) * 1%),var(--line) 0);transition:--p .9s cubic-bezier(.2,.8,.2,1)}
.tm-ring::before{content:"";position:absolute;inset:4px;border-radius:50%;background:var(--surface)}
.tm-ring b{position:relative;font:800 13px/1 var(--body);font-variant-numeric:tabular-nums}
.t-gold{--tc:var(--t-gold)}.t-teal{--tc:var(--t-teal)}.t-slate{--tc:var(--t-slate)}
.tm-tier{font-weight:700;color:var(--tc)}
.tm-chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:3px}
.tm-chips span{font-size:11px;padding:1px 7px;border-radius:999px;background:var(--soft);border:1px solid var(--line);color:var(--ink);white-space:nowrap}
.tm-heart{flex:0 0 44px;width:44px;height:44px;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:20px;line-height:1;background:none;border:0;cursor:pointer;color:var(--muted);transition:transform .2s cubic-bezier(.2,1.6,.4,1)}
.tm-heart[aria-pressed="true"]{color:var(--her)}
.tm-heart:active{transform:scale(.85)}
.tm-heart.pop{animation:tm-heart .55s cubic-bezier(.2,1.6,.4,1)}
@keyframes tm-heart{30%{transform:scale(1.45)}60%{transform:scale(.9)}}
.tm-drow .tm-acts{display:none}
.tm-drow.is-sel{flex-wrap:wrap}
.tm-drow.is-sel .tm-acts{display:flex;flex-basis:100%;padding:0 8px 10px 52px;margin-top:0}
.tm-who{font-size:11px;font-weight:700}
.tm-who.her{color:var(--her)}.tm-who.me{color:var(--me)}
.tm-dempty{padding:14px 6px;color:var(--muted);font-size:13px}
.tm-skel{height:52px;border-radius:14px;margin:6px 0;background:linear-gradient(90deg,var(--soft) 25%,color-mix(in srgb,var(--soft) 40%,var(--surface)) 50%,var(--soft) 75%);background-size:300% 100%;animation:tm-shimmer 1.2s linear infinite}
@keyframes tm-shimmer{from{background-position:100% 0}to{background-position:-200% 0}}
/* popup breakdown */
.tm-bd{display:grid;grid-template-columns:auto 1fr auto;gap:4px 8px;align-items:center;margin:8px 0 6px;font-size:12px}
.tm-bd span{color:var(--muted)}
.tm-bd i{height:6px;border-radius:6px;background:var(--line);overflow:hidden;position:relative}
.tm-bd i::after{content:"";position:absolute;inset:0;width:calc(var(--w) * 1%);background:var(--tc,var(--t-teal));border-radius:6px;transform-origin:left;animation:tm-grow .7s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--j) * 70ms)}
@keyframes tm-grow{from{transform:scaleX(0)}}
.tm-bd b{font-variant-numeric:tabular-nums;font-size:12px}
.tm-ph{display:flex;align-items:center;gap:12px}
.tm-ph .tm-ring{flex:0 0 52px;width:52px;height:52px}
.tm-ph .tm-ring b{font-size:16px}
.tm-srcs{font-size:11px;color:var(--muted);margin:6px 0 0}
.tm-srcs a{color:inherit}
@media (prefers-reduced-motion:reduce){
  .tm-panel,.tm-pin{transition:none}
  #tripmap .tmap,#tripmap::backdrop,.tm-pbody,.tm-driver,.tm-caption{animation:none!important}
  .tm-pulse{animation:none}
  .tm-sh,.tm-sh.out,.tm-sh.bump,.tm-drow,.tm-heart.pop,.tm-sh .tm-hearts,.tm-bd i::after,.tm-disc,.tm-radius,.tm-skel{animation:none!important}
  .tm-radar{display:none}
  .tm-map.tm-veil,.tm-loadmap,.tm-pin.drop,.tmap path.tm-draw,.tmap path.tm-fadein,.tmap .leaflet-popup-content-wrapper,.tmap .leaflet-popup-tip-container,.tm-pin.is-sel::after,.tm-stop.is-sel .tm-acts,.tm-drow.is-sel .tm-acts,.tm-chip.tm-pop{animation:none!important}
  .tm-map>.leaflet-pane,.tm-map>.leaflet-control-container{transition:none}
  .tm-sh,.tm-ring{transition:none}
}
`;

  /* ---------- setup ---------- */
  const app = window.APP;
  const byId = id => document.getElementById(id);
  const PHONE = matchMedia("(max-width: 899px)").matches;
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const svg = paths => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  const IC = {
    map: svg('<path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5L9 4Z"/><path d="M9 4v13.5M15 6.5V20"/>'),
    close: svg('<path d="m6 6 12 12M18 6 6 18"/>'),
    layers: svg('<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>'),
    fit: svg('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
    me: svg('<circle cx="12" cy="12" r="3.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="8"/>'),
    route: svg('<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5"/>'),
    plus: svg('<path d="M12 5v14M5 12h14"/>'),
    play: svg('<path d="m8 5 11 7-11 7V5Z"/>'),
    ext: svg('<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'),
    dl: svg('<path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 20h14"/>'),
    search: svg('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>'),
    copy: svg('<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>')
  };
  const KIND = {sight: "Sight", food: "Food", activity: "Activity", show: "Evening", stay: "Hotel", transit: "Transfer"};
  const MODE_ICON = {walk: "🚶", taxi: "🚕", train: "🚄", same: "📍"};
  const EFFORT = {easy: "Easy add-on", half: "Half day", day: "Day trip"};
  const CITY_VIEW = {Seoul: [[37.50, 126.92], [37.60, 127.10]], Busan: [[35.05, 128.98], [35.20, 129.20]]};
  const LIBS = {
    leafletJs: ["https://unpkg.com/leaflet@1.9.4/dist/leaflet.js", "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="],
    leafletCss: ["https://unpkg.com/leaflet@1.9.4/dist/leaflet.css", "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="],
    glJs: ["https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.js", "sha256-RamwepGJzlYFTGIKlHzPQeKR5YyV6bYVM7dAqqZe5cs="],
    glCss: ["https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.css", "sha256-qx5w1Z7EBGW65+cDDaLzzPKBM/1QLmK9WY7vut/XpzI="],
    glLeaflet: ["https://unpkg.com/@maplibre/maplibre-gl-leaflet@0.1.4/leaflet-maplibre-gl.js", "sha256-Hmz4yz61/ZCYeaob82o4P7UGyaWy27+rq85lopTdH8s="]
  };
  // Keyless bases: OpenFreeMap vector styles label places in Latin and Hangul; OSM raster is the no-WebGL fallback.
  const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';
  const BASES = {
    light: {style: "https://tiles.openfreemap.org/styles/liberty", attribution: '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> ' + OSM_ATTR},
    dark: {style: "https://tiles.openfreemap.org/styles/dark", attribution: '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> ' + OSM_ATTR},
    sat: {url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attribution: "Imagery &copy; Esri, Maxar, Earthstar Geographics"},
    osm: {url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: OSM_ATTR}
  };
  const PREFS_KEY = "sbtrip-map-v1";
  const loadPrefs = () => {
    const base = {route: true, alts: true, ideas: true, props: true, others: true, sat: false, found: true, saved: true};
    try { return Object.assign(base, JSON.parse(localStorage.getItem(PREFS_KEY) || "{}")); }
    catch (e) { return base; }
  };
  const state = {day: -1, sel: null, layers: loadPrefs(), size: "peek", returnAfterComposer: false, drag: null};
  const savePrefs = () => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(state.layers)); } catch (e) {} };
  // While the modal map is open the app's own toast sits underneath it, so the map shows its own.
  let toastTimer = 0;
  const toast = msg => {
    const el = document.getElementById("tm-toast");
    if (!el || !document.getElementById("tripmap")?.open) { app.toast ? app.toast(msg) : console.info(msg); return; }
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 3200);
  };
  const RM = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  // QA hook: set window.__tripMapNow to an ISO time to preview the "Today / next up" card before the trip.
  const now = () => new Date(window.__tripMapNow || Date.now());
  let tour = null;
  const tripData = (() => { try { return JSON.parse(byId("trip-data").textContent); } catch (e) { return {}; } })();
  const COMM = tripData.commutes || {};
  const EXPLORE = tripData.explore || [];
  const readProps = () => { try { return JSON.parse(localStorage.getItem("sbtrip-props-v1") || "{}") || {}; } catch (e) { return {}; } };
  const myRole = () => { try { return JSON.parse(localStorage.getItem("sbtrip-role") || "null"); } catch (e) { return null; } };
  const locate = id => {
    for (let i = 0; i < app.days.length; i++) {
      const k = app.days[i].items.findIndex(it => it.id === id);
      if (k >= 0) return [i, k];
    }
    return null;
  };
  const dateShort = d => new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", {weekday: "short", day: "numeric", month: "short", timeZone: "UTC"});
  const mins = m => m >= 60 ? `${Math.floor(m / 60)} h ${m % 60 ? (m % 60) + " min" : ""}`.trim() : `${m} min`;

  let model = [], planned = new Set(), proposals = [];
  const rebuild = () => {
    model = app.days.map((_, i) => MODEL.buildDay(app.days, app.hotels, COMM, app.placeOf, i));
    planned = MODEL.plannedIdeaIds(EXPLORE, model);
    proposals = MODEL.openProposals(readProps(), locate);
  };

  /* ---------- dialog shell ---------- */
  const style = document.createElement("style");
  style.id = "trip-map-style";
  style.textContent = CSS;
  document.head.append(style);

  const dlg = document.createElement("dialog");
  dlg.id = "tripmap";
  dlg.setAttribute("aria-labelledby", "tm-title");
  dlg.innerHTML = `<div class="tmap" tabindex="-1">
    <header class="tm-head">
      <div class="tm-ttl"><p id="tm-sub">Trip map</p><h2 id="tm-title">All days</h2></div>
      <div class="tm-search" id="tm-search" role="search">
        <span class="tm-sicon" aria-hidden="true">${IC.search}</span>
        <input id="tm-q" type="search" placeholder="Find a stop, idea or hotel" autocomplete="off" spellcheck="false" aria-label="Find on the map" aria-controls="tm-results" aria-expanded="false" role="combobox" aria-autocomplete="list">
        <ul class="tm-results" id="tm-results" role="listbox" hidden></ul>
      </div>
      <button type="button" class="tm-ib tm-sbtn" id="tm-sbtn" aria-label="Find on the map" aria-controls="tm-search">${IC.search}</button>
      <button type="button" class="tm-ib" id="tm-close" aria-label="Close the map">${IC.close}</button>
    </header>
    <nav class="tm-days" id="tm-days" aria-label="Show day on the map"></nav>
    <div class="tm-body">
      <div class="tm-map" id="tm-map" tabindex="0" role="application" aria-label="Interactive map of the itinerary"></div>
      <div class="tm-ctl">
        <button type="button" class="tm-ib" id="tm-layers-btn" aria-label="Map layers" aria-expanded="false" aria-controls="tm-layers">${IC.layers}</button>
        <button type="button" class="tm-ib" id="tm-fit" aria-label="Fit the day on screen">${IC.fit}</button>
        <button type="button" class="tm-ib" id="tm-me" aria-label="Show where I am" aria-pressed="false">${IC.me}</button>
      </div>
      <div class="tm-layers" id="tm-layers" hidden role="group" aria-label="Map layers">
        <label><input type="checkbox" data-layer="route"> Route between stops</label>
        <label><input type="checkbox" data-layer="alts"> Other options (A/B)</label>
        <label><input type="checkbox" data-layer="ideas"> Explore ideas 찜</label>
        <label><input type="checkbox" data-layer="props"> Open suggestions 💡</label>
        <label><input type="checkbox" data-layer="found"> Discover results (scores)</label>
        <label><input type="checkbox" data-layer="saved"> Saved places ♥</label>
        <label><input type="checkbox" data-layer="others"> Other days, faded</label>
        <label><input type="checkbox" data-layer="sat"> Satellite view</label>
      </div>
      <div class="tm-caption" id="tm-caption" aria-live="polite" hidden></div>
      <aside class="tm-panel" id="tm-panel" data-size="peek" aria-label="Day plan">
        <button type="button" class="tm-grab" id="tm-grab" aria-label="Resize the list"><i></i></button>
        <div class="tm-pbody" id="tm-pbody"></div>
      </aside>
    </div>
    <div class="tm-toast" id="tm-toast" role="status" hidden></div>
    <div class="tm-driver" id="tm-driver" hidden role="dialog" aria-modal="true" aria-labelledby="tm-drv-ko"></div>
  </div>`;
  document.body.append(dlg);
  const mapEl = byId("tm-map"), panel = byId("tm-panel"), pbody = byId("tm-pbody"), daysEl = byId("tm-days");
  const layersEl = byId("tm-layers"), layersBtn = byId("tm-layers-btn");

  let libsPromise = null, Lf = null, hasGL = false;
  const addCss = ([href, integrity]) => {
    const css = document.createElement("link");
    Object.assign(css, {rel: "stylesheet", href, integrity, crossOrigin: ""});
    document.head.insertBefore(css, style);
  };
  const addJs = ([src, integrity]) => new Promise((resolve, reject) => {
    const js = document.createElement("script");
    Object.assign(js, {src, integrity, crossOrigin: ""});
    js.onload = resolve;
    js.onerror = () => { js.remove(); reject(new Error("Could not load " + src)); };
    document.head.append(js);
  });
  const webglOK = () => {
    try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); }
    catch (e) { return false; }
  };
  function loadLeaflet() {
    if (Lf) return Promise.resolve(Lf);
    if (!libsPromise) libsPromise = (async () => {
      const previous = window.L;
      addCss(LIBS.leafletCss);
      await addJs(LIBS.leafletJs);
      const L = window.L;
      if (webglOK()) {
        try {
          addCss(LIBS.glCss);
          await addJs(LIBS.glJs);
          await addJs(LIBS.glLeaflet);
          hasGL = typeof L.maplibreGL === "function";
        } catch (e) { hasGL = false; }
      }
      if (previous !== undefined) window.L = previous;
      Lf = L;
      return L;
    })().catch(e => { libsPromise = null; throw e; });
    return libsPromise;
  }

  /* ---------- panel ---------- */
  let lastChipDay = null;
  function renderChips() {
    const todayIdx = MODEL.tripDayIndex(app.days, now());
    const chips = [`<button type="button" class="tm-chip" data-act="day" data-day="-1" aria-pressed="${state.day === -1}" style="--dc:var(--ink)"><b>All days</b><small>${app.days.length} days</small></button>`];
    model.forEach(dm => chips.push(`<button type="button" class="tm-chip" data-act="day" data-day="${dm.index}" aria-pressed="${state.day === dm.index}" style="--dc:${dm.color}">` +
      `<b><i></i>Day ${dm.index + 1}</b><small>${dm.index === todayIdx ? "Today" : esc(dateShort(dm.date))} · ${esc(dm.city)}</small></button>`));
    daysEl.innerHTML = chips.join("");
    if (lastChipDay !== state.day && !RM()) daysEl.querySelector('[aria-pressed="true"]')?.classList.add("tm-pop");
    lastChipDay = state.day;
    daysEl.querySelector('[aria-pressed="true"]')?.scrollIntoView({block: "nearest", inline: "center", behavior: RM() || lastChipDay === null ? "auto" : "smooth"});
  }

  function propLine(p) {
    const who = p.by && p.by === myRole() ? "You" : "Your partner";
    const title = p.place && p.place.title ? `<b>${esc(p.place.title)}</b>` : "";
    const target = p.loc ? `<b>${esc(model[p.loc[0]]?.stops[p.loc[1]]?.title || "a stop")}</b>` : "";
    switch (p.type) {
      case "add": return `${who} suggest${who === "You" ? "" : "s"} adding ${title}`;
      case "replace": return `${who} suggest${who === "You" ? "" : "s"} ${title} instead of ${target}`;
      case "move": return `${who} want${who === "You" ? "" : "s"} to move ${target} to Day ${(p.toDay != null ? p.toDay : p.day) + 1}`;
      case "drop": return `${who} suggest${who === "You" ? "" : "s"} dropping ${target}`;
      default: return `${who} left a note on ${target || "the plan"}`;
    }
  }
  const proposalsHtml = list => !list.length ? "" : `<section class="tm-sec"><h4>💡 Waiting for an answer (${list.length})</h4>
    <p class="sub">Nothing changes until you both agree.</p>
    ${list.map(p => `<div class="tm-irow"><div class="tm-row" style="cursor:default"><span class="tm-ico" style="background:rgba(213,154,23,.16)">💡</span><span class="tm-copy"><b style="font-weight:500;font-size:14px">${propLine(p)}</b>${p.note ? `<em>“${esc(String(p.note).slice(0, 90))}”</em>` : ""}</span></div></div>`).join("")}
    <div class="tm-acts"><button type="button" class="tm-btn" data-act="review">Review suggestions</button></div></section>`;

  const canRoute = leg => leg && leg.fromPlace && leg.toPlace && MODEL.validLL(leg.fromPlace) && MODEL.validLL(leg.toPlace) && !leg.fixed && leg.mode !== "train" && leg.mode !== "same";
  function legHtml(leg, dm, row) {
    if (!leg || leg.mode === "same") return "";
    let text;
    if (leg.mode === "train") text = `Train${leg.km ? ` · ${Math.round(leg.km)} km` : ""}`;
    else if (leg.fixed) text = leg.mode === "taxi" ? "Bus or taxi, see the stop notes" : "Short walk, see the stop notes";
    else if (leg.min == null) text = "Route not pinned yet";
    else if (leg.mode === "walk") text = `Walk ${leg.min} min${leg.km ? ` · ${leg.km} km` : ""}`;
    else text = `Taxi ≈${leg.min} min${leg.fare ? ` · ${MODEL.fareText(leg.fare)}` : ""}`;
    if (leg.est && leg.min != null) text += " (est.)";
    if (leg.long) text += " · long hop";
    const leave = row && row.leaveBy != null ? `<b class="tm-leave">leave by ${MODEL.fmtMin(row.leaveBy)}</b>` : "";
    const links = canRoute(leg) ? `<span class="tm-leglinks"><a href="${esc(MODEL.kakaoRoute(leg.fromPlace, leg.toPlace, leg.mode))}" target="_blank" rel="noopener" aria-label="Route in KakaoMap">Kakao ↗</a><a href="${esc(MODEL.legUrl(leg.fromPlace, leg.toPlace, leg.mode))}" target="_blank" rel="noopener" aria-label="Route in Google Maps">Google ↗</a></span>` : "";
    return `<li class="tm-leg ${leg.mode}${leg.long ? " is-long" : ""}" style="--dc:${dm.color}"><span aria-hidden="true">${MODE_ICON[leg.mode] || "•"}</span><span class="tm-legtxt">${text}${leave ? " · " + leave : ""}</span>${links}</li>`;
  }

  function stopActions(s, dm) {
    const fixedKind = s.kind === "stay" || s.kind === "transit";
    const leg = dm.legs.find(l => l.to === s.k);
    const a = [`<button type="button" class="tm-btn pri" data-act="go" data-day="${s.day}" data-k="${s.k}">${IC.play} Open in trip</button>`];
    if (s.pinned && !s.removed) a.push(`<button type="button" class="tm-btn" data-act="disc-start" data-day="${s.day}" data-k="${s.k}">✨ Discover around</button>`);
    if (s.place.ko) a.push(`<button type="button" class="tm-btn" data-act="driver" data-day="${s.day}" data-k="${s.k}">🚕 Show the driver</button>`);
    if (s.pinned) a.push(`<a class="tm-btn" href="${esc(canRoute(leg) ? MODEL.kakaoRoute(leg.fromPlace, s.place, leg.mode) : MODEL.kakaoTo(s.place))}" target="_blank" rel="noopener">KakaoMap ↗</a>`);
    a.push(`<a class="tm-btn" href="${esc(MODEL.placeUrl(s.place))}" target="_blank" rel="noopener">Google Maps ↗</a>`);
    if (s.removed) return a.join("");
    if (!fixedKind) a.push(`<button type="button" class="tm-btn" data-act="chg" data-type="replace" data-day="${s.day}" data-k="${s.k}">🔁 Swap</button>`);
    if (!fixedKind) a.push(`<button type="button" class="tm-btn" data-act="chg" data-type="move" data-day="${s.day}" data-k="${s.k}">🕒 Move</button>`);
    if (!fixedKind) a.push(`<button type="button" class="tm-btn warn" data-act="chg" data-type="drop" data-day="${s.day}" data-k="${s.k}">✖ Remove</button>`);
    a.push(`<button type="button" class="tm-btn" data-act="chg" data-type="note" data-day="${s.day}" data-k="${s.k}">📝 Note</button>`);
    return a.join("");
  }

  function stopRow(s, dm, row, isNext) {
    const sel = state.sel && state.sel.day === s.day && state.sel.k === s.k;
    const pend = proposals.filter(p => p.loc && p.loc[0] === s.day && p.loc[1] === s.k).length;
    const badges = [
      s.added ? '<span class="tm-badge new">Added</span>' : "",
      s.moved ? '<span class="tm-badge">Moved</span>' : "",
      s.changed ? '<span class="tm-badge">Swapped</span>' : "",
      s.removed ? '<span class="tm-badge">Dropped</span>' : "",
      pend ? `<span class="tm-badge prop">💡 ${pend}</span>` : "",
      !s.pinned && !s.removed ? '<span class="tm-badge">Not on the map</span>' : "",
      isNext ? '<span class="tm-badge now">Next</span>' : ""
    ].join("");
    const timing = !row || row.stayMin == null || s.removed ? "" : row.tight
      ? `<em class="tm-tight">⚠ ${row.stayMin < 0 ? "No time here: the next stop starts before you can get there" : `Only ${mins(row.stayMin)} here${row.need ? `, it needs about ${mins(row.need)}` : ""}`}</em>`
      : `<em>⏱ ≈${mins(row.stayMin)} here before you leave</em>`;
    const opts = s.hasOptions ? `<em>${s.item.options.length} options · ${esc(s.item.title)}</em>` : "";
    const draggable = !PHONE && !s.removed && s.kind !== "stay" && s.kind !== "transit";
    return `<li class="tm-stop${sel ? " is-sel" : ""}${s.removed ? " is-removed" : ""}${isNext ? " is-next" : ""}${row && row.tight ? " is-tight" : ""}" data-day="${s.day}" data-k="${s.k}" style="--dc:${dm.color}"${draggable ? ' draggable="true"' : ""}>
      <button type="button" class="tm-row" data-act="focus" data-day="${s.day}" data-k="${s.k}" aria-expanded="${!!sel}">
        <span class="tm-n${s.kind === "stay" ? " hotel" : ""}">${s.removed ? "–" : s.kind === "stay" ? "🛏" : s.n}</span>
        <span class="tm-copy"><small>${esc(s.t)}${s.t ? " · " : ""}${esc(KIND[s.kind] || "Stop")} ${badges}</small><b>${esc(s.title)}</b>${opts}${timing}</span>
        ${draggable ? '<span class="tm-drag" aria-hidden="true" title="Drag onto a day or another stop">⠿</span>' : ""}
      </button>
      <div class="tm-acts">${stopActions(s, dm)}</div>
    </li>`;
  }

  function dayPanel(dm) {
    const st = dm.stats;
    const statBits = [`${st.stops} stop${st.stops === 1 ? "" : "s"}`];
    if (st.walkMin) statBits.push(`🚶 ${mins(st.walkMin)}`);
    if (st.rideMin) statBits.push(`🚕 ${mins(st.rideMin)}`);
    if (st.km) statBits.push(`${st.km} km between stops`);
    const routeUrl = MODEL.dayRouteUrl(dm);
    const sched = MODEL.schedule(dm), byK = new Map(sched.map(r => [r.k, r]));
    const today = MODEL.tripDayIndex(app.days, now()) === dm.index;
    const up = today ? MODEL.nextUp(sched, MODEL.seoulNow(now()).min) : null;
    const tight = sched.filter(r => r.tight).length;
    const rows = [];
    if (dm.start) rows.push(`<li class="tm-stop tm-from" data-day="${dm.index}" data-k="start" style="--dc:${dm.color}"><div class="tm-row" style="cursor:default"><span class="tm-n hotel">🛏</span><span class="tm-copy"><small>Morning</small><b>From ${esc(dm.start.title)}</b></span></div></li>`);
    for (const s of dm.stops) {
      const leg = dm.legs.find(l => l.to === s.k);
      if (leg) rows.push(legHtml(leg, dm, byK.get(s.k)));
      rows.push(stopRow(s, dm, byK.get(s.k), up && up.k === s.k));
    }
    const ideas = MODEL.nearbyIdeas(EXPLORE, dm, planned, {maxKm: 4, limit: 5});
    const ideasHtml = !ideas.length ? "" : `<section class="tm-sec"><h4>💎 Ideas near this day</h4><p class="sub">From Explore and not in the plan yet. Each one fits after the stop it's closest to.</p>
      ${ideas.map(r => `<div class="tm-irow"><button type="button" class="tm-row" data-act="idea" data-id="${esc(r.idea.id)}"><span class="tm-ico">${esc(r.idea.icon || "✨")}</span><span class="tm-copy"><b>${esc(r.idea.title)}</b><small>${r.km} km from ${esc(r.stop ? r.stop.title : "the route")} · ${esc(EFFORT[r.idea.effort] || "")}</small></span></button>
        <button type="button" class="tm-btn" data-act="add-idea" data-id="${esc(r.idea.id)}" data-day="${dm.index}" aria-label="Suggest ${esc(r.idea.title)} for Day ${dm.index + 1}">${IC.plus} Add</button></div>`).join("")}</section>`;
    const props = proposals.filter(p => MODEL.proposalDays(p).has(dm.index));
    const upStop = up && dm.stops[up.k];
    const timed = sched.some(r => r.t != null);
    const nowCard = !today || !timed ? "" : upStop
      ? `<button type="button" class="tm-now" data-act="focus" data-day="${dm.index}" data-k="${up.k}"><span class="tm-pulse" aria-hidden="true"></span><span><small>Today · next up</small><b>${esc(upStop.t)} ${esc(upStop.title)}</b><em>${up.leaveIn <= 0 ? "Time to go" : up.leaveBy != null ? `Leave by ${MODEL.fmtMin(up.leaveBy)} · in ${mins(up.leaveIn)}` : `In ${mins(up.leaveIn)}`}</em></span></button>`
      : `<p class="tm-now"><span><small>Today</small><b>That was the last stop today. Sleep well 🌙</b></span></p>`;
    return `<header class="tm-dhead" style="--dc:${dm.color}">
        <div class="tm-dnav">
          <button type="button" class="tm-ib tm-step" data-act="step" data-dir="-1" aria-label="Previous day"${dm.index === 0 ? " disabled" : ""}>‹</button>
          <p class="tm-eyebrow"><i></i>Day ${dm.index + 1} · ${esc(dateShort(dm.date))} · ${esc(dm.city)}${today ? ' · <b class="tm-today">Today</b>' : ""}</p>
          <button type="button" class="tm-ib tm-step" data-act="step" data-dir="1" aria-label="Next day"${dm.index === model.length - 1 ? " disabled" : ""}>›</button>
        </div>
        <h3>${esc(dm.title)}</h3>
        <p class="tm-stats">${statBits.join(" · ")}</p>
        ${nowCard}
        <div class="tm-dacts">
          <button type="button" class="tm-btn pri" data-act="play" data-day="${dm.index}" aria-pressed="${!!tour}">${tour ? "■ Stop the tour" : "▶ Play the day"}</button>
          ${routeUrl ? `<a class="tm-btn" href="${esc(routeUrl)}" target="_blank" rel="noopener">${IC.route} Day in Google Maps ↗</a>` : ""}
          <button type="button" class="tm-btn" data-act="disc-day" data-day="${dm.index}" aria-pressed="${disc.on && disc.anchor && disc.anchor.day === dm.index}">✨ Discover nearby</button>
          <button type="button" class="tm-btn" data-act="add" data-day="${dm.index}">${IC.plus} Add a place</button>
          <button type="button" class="tm-btn" data-act="go" data-day="${dm.index}" data-k="-1">${IC.play} Open day</button>
        </div>
      </header>
      ${discSectionHtml(dm)}
      ${st.longLegs ? `<p class="tm-warn">⚠ ${st.longLegs} long hop${st.longLegs > 1 ? "s" : ""} today (over 30 min). A nearer swap or a different order may give you more time at the stops.</p>` : ""}
      ${tight ? `<p class="tm-warn">⏱ ${tight} tight connection${tight > 1 ? "s" : ""}: there isn't enough time at ${tight > 1 ? "those stops" : "that stop"} to get to the next one on time. Moving a time or swapping a stop fixes it.</p>` : ""}
      <ol class="tm-list" id="tm-list">${rows.join("")}</ol>
      ${ideasHtml}
      ${savedSectionHtml(dm.city, dm.index)}
      ${proposalsHtml(props)}
      <p class="tm-help">${PHONE ? "Tap a pin or a stop for its actions. Long-press anywhere on the map to suggest that spot." : "Click a pin or a stop for its actions. Drag a stop (⠿) onto another stop or a day chip to suggest a move. Right-click the map to suggest any spot. Keys: [ and ] change the day, A shows all days, / searches, D discovers around the stop, P plays the day, F fits the map."} Suggestions go to the other phone first, and nothing changes until you both agree.</p>`;
  }

  function allPanel() {
    const todayIdx = MODEL.tripDayIndex(app.days, now());
    const t = model.reduce((a, dm) => ({stops: a.stops + dm.stats.stops, walk: a.walk + dm.stats.walkMin, ride: a.ride + dm.stats.rideMin}), {stops: 0, walk: 0, ride: 0});
    const rows = model.map(dm => `<li><button type="button" class="tm-row tm-dayrow" data-act="day" data-day="${dm.index}" style="--dc:${dm.color}">
        <span class="tm-n">${dm.index + 1}</span>
        <span class="tm-copy"><small>${esc(dateShort(dm.date))} · ${esc(dm.city)}${dm.index === todayIdx ? ' <span class="tm-badge now">Today</span>' : ""}${dm.stats.longLegs ? ` <span class="tm-badge prop">⚠ ${dm.stats.longLegs} long hop${dm.stats.longLegs > 1 ? "s" : ""}</span>` : ""}${proposals.some(p => MODEL.proposalDays(p).has(dm.index)) ? ' <span class="tm-badge prop">💡</span>' : ""}</small>
        <b>${esc(dm.title)}</b><em>${dm.stats.stops} stops${dm.stats.walkMin ? ` · 🚶 ${mins(dm.stats.walkMin)}` : ""}${dm.stats.rideMin ? ` · 🚕 ${mins(dm.stats.rideMin)}` : ""}</em></span></button></li>`).join("");
    return `<header class="tm-dhead" style="--dc:var(--ink)">
        <p class="tm-eyebrow">Seoul ⇄ Busan · ${esc(dateShort(model[0].date))} – ${esc(dateShort(model[model.length - 1].date))}</p>
        <h3>The whole trip</h3>
        <div class="tm-total"><div><b>${t.stops}</b>stops</div><div><b>${mins(t.walk)}</b>walking</div><div><b>${mins(t.ride)}</b>by taxi</div></div>
        <div class="tm-dacts">
          <button type="button" class="tm-btn" data-act="city" data-city="Seoul">Zoom to Seoul</button>
          <button type="button" class="tm-btn" data-act="city" data-city="Busan">Zoom to Busan</button>
          <button type="button" class="tm-btn" data-act="kml">${IC.dl} Google My Maps (KML)</button>
        </div>
      </header>
      <ol class="tm-list">${rows}</ol>
      ${savedSectionHtml(null, -1)}
      ${proposalsHtml(proposals)}
      <p class="tm-help">Pick a day to see its route, the walk or taxi between stops, other options and ideas nearby. The KML file opens in Google My Maps: Create → Import.</p>`;
  }

  function renderPanel(anim) {
    pbody.innerHTML = state.day < 0 ? allPanel() : dayPanel(model[state.day]);
    if (anim && !RM()) { pbody.classList.remove("tm-swap", "tm-swap-l", "tm-swap-r"); void pbody.offsetWidth; pbody.classList.add(anim === -1 ? "tm-swap-l" : anim === 1 ? "tm-swap-r" : "tm-swap"); }
    const dm = model[state.day];
    byId("tm-sub").textContent = dm ? `Day ${dm.index + 1} · ${dateShort(dm.date)} · ${dm.city}` : "Trip map · Seoul ⇄ Busan";
    byId("tm-title").textContent = dm ? dm.title : "All days";
    pbody.querySelector(".tm-stop.is-sel")?.scrollIntoView({block: "nearest", behavior: RM() ? "auto" : "smooth"});
    animateRings(pbody);
  }

  /* ---------- map ---------- */
  let map = null, base = null, baseKind = null, group = null, meLayer = null, markers = new Map(), mapFailed = false;
  const isDark = () => document.documentElement.getAttribute("data-theme") === "dark";
  const panelInset = () => PHONE ? Math.round(panel.getBoundingClientRect().height) : 0;
  const ll = p => [+p.lat, +p.lng];

  function setTiles() {
    if (!map) return;
    const kind = state.layers.sat ? "sat" : hasGL ? (isDark() ? "dark" : "light") : "osm";
    if (base && baseKind === kind) return;
    if (base) map.removeLayer(base);
    const b = BASES[kind];
    const layer = b.style
      ? Lf.maplibreGL({style: b.style, attribution: b.attribution, interactive: false})
      : Lf.tileLayer(b.url, {attribution: b.attribution, maxZoom: 19, maxNativeZoom: kind === "sat" ? 18 : 19});
    base = layer;
    baseKind = kind;
    if (b.style) layer.once("add", () => {
      // If the vector style can't load (offline, blocked), fall back to the raster map.
      const gl = layer.getMaplibreMap();
      let ready = false;
      gl.once("load", () => { ready = true; });
      gl.on("error", () => { if (ready || base !== layer || gl.isStyleLoaded()) return; hasGL = false; setTiles(); });
    });
    layer.addTo(map);
  }

  let ensuring = null;
  function ensureMap() {
    if (map || mapFailed) return Promise.resolve(map);
    return ensuring || (ensuring = createMap().finally(() => { ensuring = null; }));
  }
  async function createMap() {
    mapEl.innerHTML = `<div class="tm-mapmsg tm-loading" role="status"><span class="tm-loadmap" aria-hidden="true">${IC.map}</span><span>Loading the map…</span></div>`;
    try { await loadLeaflet(); }
    catch (e) {
      mapFailed = true;
      mapEl.innerHTML = `<div class="tm-mapmsg"><b>The map needs a connection.</b><span>The day list still works, and every stop opens in Google Maps.</span><button type="button" class="tm-btn" data-act="retry">Try again</button></div>`;
      return null;
    }
    mapEl.innerHTML = "";
    map = Lf.map(mapEl, {zoomControl: !PHONE, attributionControl: true, keyboard: true, tap: true, worldCopyJump: false,
      maxBounds: [[32, 123], [40, 133]], minZoom: 6});
    if (!PHONE) map.zoomControl.setPosition("bottomright");
    map.attributionControl.setPrefix(false);
    if (PHONE) map.attributionControl.setPosition("topleft");
    setTiles();
    group = Lf.layerGroup().addTo(map);
    map.createPane("tmRadar").style.zIndex = 420;
    map.createPane("tmShadow").style.zIndex = 590;
    savedGroup = Lf.layerGroup().addTo(map);
    discGroup = Lf.layerGroup().addTo(map);
    map.on("contextmenu", e => pinPopup(e.latlng));
    map.on("popupopen", e => { const el = e.popup.getElement(); if (el) animateRings(el); });
    map.on("zoomend", () => { if (disc.on) paintDiscMarks(); });
    map.on("click", closeLayers);
    return map;
  }

  const divIcon = (html, size, anchor) => Lf.divIcon({className: "", html, iconSize: size, iconAnchor: anchor || [size[0] / 2, size[1] / 2], popupAnchor: [0, -(anchor ? anchor[1] : size[1] / 2) + 2]});
  const pinIcon = (s, small) => {
    const z = small ? 24 : 30;
    return divIcon(`<div class="tm-pin${small ? " sm" : ""}${s.kind === "stay" ? " hotel" : ""}" style="--dc:${s.color}"><span>${s.kind === "stay" ? "🛏" : s.n}</span></div>`, [z, z], [z / 2 - z * 0.2, z * 1.05]);
  };
  const popupOpts = () => ({maxWidth: 300, autoPanPaddingTopLeft: [16, PHONE ? 40 : 16], autoPanPaddingBottomRight: [16, panelInset() + 16], closeButton: true});

  function stopPopup(s, dm) {
    const p = s.place, bits = [];
    if (p.type) bits.push(esc(p.type));
    if (p.price) bits.push(esc(p.price));
    if (p.need) bits.push("⏱ " + esc(p.need));
    const about = String(p.about || p.cool || "").slice(0, 170);
    return `<p class="tm-eyebrow" style="--dc:${dm.color}"><i></i>Day ${dm.index + 1} · ${esc(s.t)} · ${esc(KIND[s.kind] || "Stop")}</p>
      <h5>${s.removed ? "<s>" : ""}${esc(s.title)}${s.removed ? "</s>" : ""}</h5>${bits.length ? `<p style="color:var(--muted)">${bits.join(" · ")}</p>` : ""}
      ${about ? `<p>${esc(about)}${(p.about || p.cool || "").length > 170 ? "…" : ""}</p>` : ""}${p.closed ? `<p style="color:var(--rose)">Closed: ${esc(p.closed)}</p>` : ""}
      <div class="tm-acts">${stopActions(s, dm)}</div>`;
  }

  function ideaPopup(idea) {
    const target = state.day >= 0 && model[state.day].city === idea.city ? state.day : app.days.findIndex(d => d.city === idea.city);
    const inPlan = planned.has(idea.id);
    return `<p class="tm-eyebrow">${esc(idea.icon || "✨")} Explore idea · ${esc(idea.city)}${idea.effort ? " · " + esc(EFFORT[idea.effort] || "") : ""}</p>
      <h5>${esc(idea.title)}</h5><p>${esc(String(idea.cool || "").slice(0, 160))}…</p>
      ${idea.catch ? `<p style="color:var(--muted)"><b>The catch:</b> ${esc(String(idea.catch).slice(0, 120))}</p>` : ""}
      <div class="tm-acts">${inPlan ? '<span class="tm-badge new">Already in the plan</span>' : `<button type="button" class="tm-btn pri" data-act="add-idea" data-id="${esc(idea.id)}" data-day="${target}">${IC.plus} Suggest for Day ${target + 1}</button>`}
      <a class="tm-btn" href="${esc(MODEL.placeUrl(idea))}" target="_blank" rel="noopener">Google Maps ↗</a></div>`;
  }

  // Set before a draw that should "unfold" the day (first reveal, day change); ordinary redraws stay still.
  let unfoldNext = false;
  function draw(fit) {
    if (!map) return;
    const unfold = unfoldNext && !RM();
    unfoldNext = false;
    let legI = 0;
    group.clearLayers();
    markers = new Map();
    const L = state.layers, all = state.day < 0;
    const days = all ? model : [model[state.day]];
    const bounds = [];

    if (!all && L.others) {
      for (const dm of model) {
        if (dm.index === state.day) continue;
        for (const s of dm.stops) {
          if (s.removed || !s.pinned) continue;
          const c = Lf.circleMarker(ll(s.place), {radius: 6, color: "#fff", weight: 1.5, fillColor: dm.color, fillOpacity: .55}).addTo(group);
          c.bindTooltip(`Day ${dm.index + 1} · ${esc(s.title)}`, {direction: "top"});
          const canMove = s.kind !== "stay" && s.kind !== "transit" && dm.city === model[state.day].city;
          c.bindPopup(`<p class="tm-eyebrow" style="--dc:${dm.color}"><i></i>Day ${dm.index + 1} · ${esc(s.t)}</p><h5>${esc(s.title)}</h5>
            <div class="tm-acts"><button type="button" class="tm-btn" data-act="day" data-day="${dm.index}" data-k="${s.k}">Show Day ${dm.index + 1}</button>
            ${canMove ? `<button type="button" class="tm-btn pri" data-act="move-here" data-day="${dm.index}" data-k="${s.k}">🕒 Move to Day ${state.day + 1}</button>` : ""}</div>`, popupOpts());
        }
      }
    }

    for (const dm of days) {
      if (L.route) for (const leg of dm.legs) {
        if (!leg.fromPlace || !leg.toPlace || !MODEL.validLL(leg.fromPlace) || !MODEL.validLL(leg.toPlace) || leg.mode === "same") continue;
        const style = leg.mode === "walk" ? {dashArray: "2 9", weight: all ? 4 : 5} : leg.mode === "train" ? {dashArray: "12 10", weight: 3} : {weight: all ? 3 : 4};
        const line = Lf.polyline([ll(leg.fromPlace), ll(leg.toPlace)], Object.assign({color: dm.color, opacity: all ? .75 : .9, lineCap: "round"}, style)).addTo(group);
        if (unfold) unfoldLine(line, legI++, !style.dashArray);
        if (leg.min != null || leg.mode === "train") line.bindTooltip(`${MODE_ICON[leg.mode]} ${leg.mode === "train" ? "KTX" : (leg.mode === "walk" ? "Walk " : "Taxi ≈") + leg.min + " min"}${leg.long ? " · long hop" : ""}`, {sticky: true});
      }
      if (!all && L.alts) for (const a of MODEL.alternativesOf(dm, app.resolve)) {
        const s = a.stop;
        if (s.pinned) Lf.polyline([ll(s.place), ll(a.opt)], {color: dm.color, weight: 1.5, opacity: .6, dashArray: "3 5"}).addTo(group);
        const m = Lf.marker(ll(a.opt), {icon: divIcon(`<div class="tm-alt" style="--dc:${dm.color}">${a.letter}</div>`, [22, 22]), zIndexOffset: 100, keyboard: true, title: `Option ${a.letter}: ${a.opt.title}`}).addTo(group);
        markers.set(`alt:${dm.index}:${s.k}:${a.index}`, m);
        m.bindPopup(`<p class="tm-eyebrow" style="--dc:${dm.color}"><i></i>Option ${a.letter} for stop ${s.n} · ${esc(s.item.title)}</p><h5>${esc(a.opt.title)}</h5>
          ${a.opt.about ? `<p>${esc(String(a.opt.about).slice(0, 150))}…</p>` : ""}
          <p style="color:var(--muted)">${s.pinned ? `${MODEL.distKm(s.place, a.opt).toFixed(1)} km from the current pick, ${esc(s.title)}.` : ""} Pick it with your ♥ on the stop.</p>
          <div class="tm-acts"><button type="button" class="tm-btn pri" data-act="go" data-day="${dm.index}" data-k="${s.k}">${IC.play} Open the stop</button><a class="tm-btn" href="${esc(MODEL.placeUrl(a.opt))}" target="_blank" rel="noopener">Google Maps ↗</a></div>`, popupOpts());
      }
      for (const s of dm.stops) {
        if (s.removed || !s.pinned) continue;
        const m = Lf.marker(ll(s.place), {icon: pinIcon(s, all), zIndexOffset: 500 + (s.n || 0), keyboard: true, title: `${s.n ? s.n + ". " : ""}${s.title}`, riseOnHover: true}).addTo(group);
        if (unfold) { const pin = m.getElement()?.querySelector(".tm-pin"); if (pin) { pin.style.setProperty("--i", all ? dm.index : s.n || 0); pin.classList.add("drop"); pin.addEventListener("animationend", () => pin.classList.remove("drop"), {once: true}); } }
        m.bindPopup(stopPopup(s, dm), popupOpts());
        m.on("click", () => select(s.day, s.k, {pan: false, popup: false, fromMap: true}));
        m.on("mouseover", () => rowOf(s.day, s.k)?.classList.add("is-hover"));
        m.on("mouseout", () => rowOf(s.day, s.k)?.classList.remove("is-hover"));
        markers.set(`${s.day}:${s.k}`, m);
        bounds.push(ll(s.place));
      }
      if (dm.start && MODEL.validLL(dm.start)) bounds.push(ll(dm.start));
    }

    const hotelIds = new Set(all ? Object.keys(app.hotels) : [model[state.day].base, model[state.day].start && model[state.day].start.id].filter(Boolean));
    for (const id of hotelIds) {
      const h = app.hotels[id];
      if (!MODEL.validLL(h)) continue;
      Lf.marker(ll(h), {icon: divIcon('<div class="tm-pin sm hotel"><span>🛏</span></div>', [24, 24], [7, 25]), zIndexOffset: 50, title: h.title}).addTo(group)
        .bindPopup(`<p class="tm-eyebrow">🛏 Hotel · ${esc(h.city)} · ${esc(h.nights || "")}</p><h5>${esc(h.title)}</h5>${h.hours ? `<p style="color:var(--muted)">${esc(h.hours)}</p>` : ""}
          <div class="tm-acts"><a class="tm-btn" href="${esc(MODEL.placeUrl(h))}" target="_blank" rel="noopener">Google Maps ↗</a></div>`, popupOpts());
    }

    if (L.ideas) {
      const city = all ? null : model[state.day].city;
      for (const idea of EXPLORE) {
        if (!MODEL.validLL(idea) || (city && idea.city !== city) || planned.has(idea.id)) continue;
        const m = Lf.marker(ll(idea), {icon: divIcon(`<div class="tm-idea"><span>${esc(idea.icon || "✨")}</span></div>`, [24, 24]), zIndexOffset: 80, title: idea.title}).addTo(group);
        m.bindPopup(ideaPopup(idea), popupOpts());
        markers.set("idea:" + idea.id, m);
      }
    }

    if (L.props) for (const p of proposals) {
      if (!all && !MODEL.proposalDays(p).has(state.day)) continue;
      if ((p.type === "add" || p.type === "replace") && p.place && MODEL.validLL(p.place)) {
        Lf.marker(ll(p.place), {icon: divIcon('<div class="tm-prop">💡</div>', [28, 28]), zIndexOffset: 900, title: p.place.title}).addTo(group)
          .bindPopup(`<p class="tm-eyebrow">💡 Open suggestion</p><h5>${esc(p.place.title || "Suggested place")}</h5><p>${propLine(p)}</p>${p.note ? `<p style="color:var(--muted)">“${esc(String(p.note).slice(0, 140))}”</p>` : ""}
            <div class="tm-acts"><button type="button" class="tm-btn pri" data-act="review">Review</button></div>`, popupOpts());
        if (p.type === "replace" && p.loc) {
          const s = model[p.loc[0]]?.stops[p.loc[1]];
          if (s && s.pinned) Lf.polyline([ll(s.place), ll(p.place)], {color: "#d59a17", weight: 2, dashArray: "4 6"}).addTo(group);
        }
      }
    }

    if (meLayer) meLayer.addTo(map);
    paintSaved();
    if (fit) fitTo(bounds, fit === "fly");
  }

  // Solid legs draw themselves along their length; dotted legs (walks, the train) fade in. Either way leg by leg.
  function unfoldLine(line, i, solid) {
    const el = line.getElement && line.getElement();
    if (!el) return;
    el.style.setProperty("--i", i);
    if (solid) {
      el.setAttribute("pathLength", "1");
      el.classList.add("tm-draw");
    } else el.classList.add("tm-fadein");
    el.addEventListener("animationend", () => { el.classList.remove("tm-draw", "tm-fadein"); el.removeAttribute("pathLength"); }, {once: true});
  }
  function fitTo(bounds, fly) {
    if (!map) return;
    const pad = {paddingTopLeft: [40, 40], paddingBottomRight: [40, panelInset() + 30], maxZoom: 15};
    const b = bounds && bounds.length > 1 ? bounds : bounds && bounds.length === 1 ? null : CITY_VIEW[(model[state.day] || {}).city || "Seoul"];
    const smooth = fly && !RM();
    if (b) smooth ? map.flyToBounds(b, Object.assign({duration: .8, easeLinearity: .2}, pad)) : map.fitBounds(b, Object.assign({animate: false}, pad));
    else smooth ? map.flyTo(bounds[0], 15, {duration: .8}) : map.setView(bounds[0], 15, {animate: false});
  }
  const currentBounds = () => {
    const days = state.day < 0 ? model : [model[state.day]];
    const b = [];
    for (const dm of days) {
      if (dm.start && MODEL.validLL(dm.start)) b.push(ll(dm.start));
      for (const s of dm.stops) if (!s.removed && s.pinned) b.push(ll(s.place));
    }
    return b;
  };

  function flyToPoint(latlng, zoom) {
    const z = Math.max(map.getZoom(), zoom || 15);
    const offset = PHONE ? panelInset() / 2 : 0;
    const pt = map.project(latlng, z).add([0, offset]);
    if (RM()) map.setView(map.unproject(pt, z), z, {animate: false});
    else map.flyTo(map.unproject(pt, z), z, {duration: .6});
  }

  function highlight(day, k) {
    for (const [key, m] of markers) m.getElement()?.querySelector(".tm-pin")?.classList.toggle("is-sel", key === `${day}:${k}`);
  }

  function select(day, k, opts = {}) {
    if (disc.on && disc.follow && !tour && disc.anchor && (disc.anchor.day !== day || disc.anchor.k !== k)) {
      clearTimeout(followTimer);
      followTimer = setTimeout(() => { const a = anchorFor(day, k); if (a && disc.on && dlg.open) startDiscover(a, {quiet: true}); }, 380);
    }
    if (state.day === -1 && opts.fromMap) { highlight(day, k); return; }
    state.sel = {day, k};
    if (state.day !== day) { state.day = day; render(true); } else renderPanel();
    highlight(day, k);
    const m = markers.get(`${day}:${k}`);
    if (map && m && opts.pan !== false) {
      flyToPoint(m.getLatLng(), 15);
      if (opts.popup !== false) setTimeout(() => { if (dlg.open) m.openPopup(); }, PHONE ? 650 : 450);
    }
  }

  /* ---------- actions ---------- */
  let opener = null, pendingPin = null;
  const chgEl = byId("chgdlg");

  function suggest(ctx) {
    if (typeof app.openComposer !== "function") return;
    state.returnAfterComposer = true;
    app.openComposer(ctx);
    if (!chgEl || !chgEl.open) state.returnAfterComposer = false;
  }
  // Reopen from a MutationObserver: it runs as a microtask right after close(), before any timer, so there is never a
  // moment without an open dialog (the game invite treats that as a quiet moment). A composer that re-opened itself is open again by then.
  if (chgEl) new MutationObserver(() => {
    if (!state.returnAfterComposer || chgEl.open) return;
    state.returnAfterComposer = false;
    if (!document.querySelector("dialog[open], .doc.show, .xp.show")) openMap({restore: true});
  }).observe(chgEl, {attributes: true, attributeFilter: ["open"]});

  const ideaPlace = idea => ({title: idea.title, ko: idea.ko, name: idea.name || idea.title, lat: idea.lat, lng: idea.lng, cool: idea.cool,
    price: idea.price, need: idea.need, url: MODEL.placeUrl(idea), wiki: idea.wiki, cat: "sight"});
  const nearNote = near => near ? `📍 On the map it's ${near.km} km from ${near.stop.title}.` : "";
  const lastItemId = day => { const items = app.days[day].items; return items.length ? items[items.length - 1].id : "start"; };

  function goTo(day, k) {
    closeMap();
    if (k >= 0 && typeof app.go === "function") { app.go(day, k); return; }
    const chip = byId("rail")?.querySelector(`[data-i="${day}"]`);
    if (chip) { chip.click(); byId("daycard")?.classList.add("show"); }
    else if (typeof app.go === "function") app.go(day, -1);
  }

  function bestDayFor(point) {
    if (state.day >= 0) return state.day;
    let best = 0, bestKm = Infinity;
    for (const dm of model) { const n = MODEL.nearestStop(dm, point); if (n && n.km < bestKm) { bestKm = n.km; best = dm.index; } }
    return best;
  }

  const revCache = new Map();
  async function reverse(p) {
    const key = p.lat.toFixed(4) + "," + p.lng.toFixed(4);
    if (revCache.has(key)) return revCache.get(key);
    const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 6000);
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${p.lat}&lon=${p.lng}&zoom=18&namedetails=1&accept-language=en`, {signal: ctrl.signal, headers: {Accept: "application/json"}});
      const j = await r.json(), nd = j.namedetails || {}, parts = String(j.display_name || "").split(",").map(s => s.trim());
      const out = {name: j.name || nd["name:en"] || parts[0] || "", ko: nd["name:ko"] || nd.name || "", address: parts.slice(0, 3).join(", ")};
      revCache.set(key, out);
      return out;
    } catch (e) { return {name: "", ko: "", address: ""}; }
    finally { clearTimeout(timer); }
  }

  async function pinPopup(latlng) {
    const place = {lat: +latlng.lat.toFixed(6), lng: +latlng.lng.toFixed(6), cat: "sight"};
    if (!MODEL.validLL(place)) return;
    const day = bestDayFor(place), near = MODEL.nearestStop(model[day], place);
    const pop = Lf.popup(popupOpts()).setLatLng(latlng)
      .setContent(`<p class="tm-eyebrow">📍 This spot</p><h5>Looking up the name…</h5>`).openOn(map);
    const info = await reverse(place);
    if (!pop.isOpen()) return;
    place.title = info.name || (near ? `Spot near ${near.stop.title}` : "Pinned spot");
    place.name = info.name || `${place.lat},${place.lng}`;
    if (info.ko) place.ko = info.ko;
    if (info.address) place.address = info.address;
    place.url = MODEL.placeUrl(place);
    pendingPin = {place, day, near};
    pop.setContent(`<p class="tm-eyebrow">📍 This spot${near ? ` · ${near.km} km from ${esc(near.stop.title)}` : ""}</p><h5>${esc(place.title)}</h5>
      ${info.address ? `<p style="color:var(--muted)">${esc(info.address)}</p>` : ""}
      <div class="tm-acts"><button type="button" class="tm-btn pri" data-act="pin-add">${IC.plus} Suggest for Day ${day + 1}</button>
      <a class="tm-btn" href="${esc(MODEL.placeUrl(place))}" target="_blank" rel="noopener">Google Maps ↗</a></div>`);
  }

  async function downloadKml() {
    if (typeof app.xpKml !== "function") return;
    const name = "seoul-busan-for-two.kml";
    const file = new File([app.xpKml()], name, {type: "application/vnd.google-earth.kml+xml"});
    if (PHONE && navigator.canShare && navigator.canShare({files: [file]})) {
      try { await navigator.share({files: [file], title: "Seoul ⇄ Busan map"}); toast("Open mymaps.google.com → Create → Import, and pick this file"); return; }
      catch (e) { if (e.name === "AbortError") return; }
    }
    const url = URL.createObjectURL(file), a = document.createElement("a");
    a.href = url; a.download = name; document.body.append(a); a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 4000);
    toast("KML saved. In Google My Maps: Create → Import, and pick this file");
  }

  function focusIdea(id) {
    const idea = EXPLORE.find(x => x.id === id);
    if (!idea || !map) return;
    flyToPoint(ll(idea), 15);
    const m = markers.get("idea:" + id);
    setTimeout(() => {
      if (!dlg.open) return;
      if (m) m.openPopup(); else Lf.popup(popupOpts()).setLatLng(ll(idea)).setContent(ideaPopup(idea)).openOn(map);
    }, PHONE ? 650 : 450);
  }

  function switchDay(day, dir = 0, k = null) {
    map?.closePopup();
    if (disc.on && disc.anchor && disc.anchor.day !== day) stopDiscover();
    const from = state.day;
    state.day = day;
    state.sel = null;
    panel.scrollTop = 0;
    renderChips();
    renderPanel(from === day ? 0 : dir || "fade");
    unfoldNext = from !== day;
    draw(map && map._loaded ? "fly" : true);
    if (k != null && day >= 0) select(day, k);
    if (PHONE && state.size === "min") setSize("peek");
  }

  function act(d) {
    const day = d.day != null ? +d.day : null, k = d.k != null && d.k !== "" ? +d.k : null;
    if (tour && d.act !== "play" && d.act !== "copy-ko") stopTour();
    switch (d.act) {
      case "day": switchDay(day, day > state.day ? 1 : -1, k); break;
      case "step": {
        const to = state.day + +d.dir;
        if (state.day >= 0 && to >= 0 && to < model.length) switchDay(to, +d.dir);
        break;
      }
      case "play": tour ? stopTour() : playTour(day); break;
      case "driver": showDriver(day, k); break;
      case "disc-start": startDiscover(anchorFor(day, k)); break;
      case "disc-day":
        if (disc.on && disc.anchor && disc.anchor.day === day) stopDiscover();
        else startDiscover(defaultAnchor(day));
        break;
      case "disc-close": stopDiscover(); break;
      case "disc-focus": focusFound(d.id); break;
      case "disc-radius": disc.radius = +d.km; disc.more = false; resizeRadius(); paintDiscMarks(); paintDiscList(); paintSaved();
        pbody.querySelectorAll('[data-act="disc-radius"]').forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.km === disc.radius)));
        if (disc.center) fitTo([[disc.center.lat - disc.radius / 111, disc.center.lng], [disc.center.lat + disc.radius / 111, disc.center.lng], [disc.center.lat, disc.center.lng - disc.radius / 88], [disc.center.lat, disc.center.lng + disc.radius / 88]], true);
        break;
      case "disc-filter": disc.filter = d.f; disc.more = false; disc.sel = null; map?.closePopup(); paintDiscMarks(); paintDiscList(); paintSaved();
        pbody.querySelectorAll('[data-act="disc-filter"]').forEach(b => b.setAttribute("aria-pressed", String(b.dataset.f === disc.filter)));
        break;
      case "disc-more": disc.more = true; paintDiscMarks(); paintDiscList(); break;
      case "disc-save": {
        const c = found(d.id);
        if (!c) break;
        const on = toggleSave(c);
        const btn = pbody.querySelector(`.tm-drow[data-id="${cssEsc(d.id)}"] .tm-heart`);
        if (btn && on && !RM()) { btn.classList.remove("pop"); void btn.offsetWidth; btn.classList.add("pop"); }
        if (disc.sel === d.id && mapEl.querySelector(".leaflet-popup")) focusFound(d.id, {fromMap: true});
        break;
      }
      case "disc-add": case "disc-swap": {
        const c = found(d.id), a = disc.anchor;
        if (!c || !a) break;
        const note = `${scoreNote(c)} ${c.worth.walk} min walk from ${a.title}.`;
        if (d.act === "disc-add") suggest({day: a.day, type: "add", toAfter: a.id, place: placeFor(c), note});
        else suggest({day: a.day, stop: a.k, type: "replace", place: placeFor(c), note});
        break;
      }
      case "disc-driver": {
        const c = found(d.id);
        if (c) showDriverFor({title: c.title, ko: c.ko, name: c.title, lat: c.lat, lng: c.lng});
        break;
      }
      case "saved-focus": case "saved-toggle": case "saved-add": case "saved-discover": {
        const e = savedList().find(x => x.key === d.key);
        if (!e) break;
        if (d.act === "saved-toggle") {
          toggleSavedKey(d.key);
          map?.closePopup();
        } else if (d.act === "saved-add") {
          const dayN = state.day >= 0 ? state.day : app.days.findIndex(x => x.city === e.city);
          const near = MODEL.nearestStop(model[dayN], e);
          suggest({day: dayN, type: "add", toAfter: near ? near.stop.id : lastItemId(dayN),
            place: {title: e.t, ko: e.ko, name: e.t, lat: e.lat, lng: e.lng, cool: e.why.join(" · "), url: MODEL.placeUrl({name: e.t, lat: e.lat, lng: e.lng}), cat: CAT_OF[e.cat] || "sight"},
            note: `♥ Saved by ${e.who.map(w => names()[w]).join(" & ")} · worth-visiting score ${e.score}.${near ? ` 📍 ${near.km} km from ${near.stop.title}.` : ""}`});
        } else if (d.act === "saved-discover") {
          const dayN = state.day >= 0 && model[state.day].city === e.city ? state.day : app.days.findIndex(x => x.city === e.city);
          map?.closePopup();
          startDiscover({day: dayN, k: -1, id: lastItemId(dayN), title: e.t, place: {title: e.t, ko: e.ko, lat: e.lat, lng: e.lng}, swappable: false});
        } else if (map) {
          flyToPoint([e.lat, e.lng], Math.max(map.getZoom(), 16));
          const m = savedMarks.get(d.key);
          setTimeout(() => { if (!dlg.open) return; if (m) m.openPopup(); else Lf.popup(popupOpts()).setLatLng([e.lat, e.lng]).setContent(savedPopup(d.key)).openOn(map); }, PHONE ? 650 : 450);
        }
        break;
      }
      case "driver-close": hideDriver(); break;
      case "copy-ko":
        navigator.clipboard?.writeText(d.text).then(() => toast("Korean name copied"), () => toast("Couldn't copy here, so please show the screen instead"));
        break;
      case "focus":
        if (state.sel && state.sel.day === day && state.sel.k === k) { state.sel = null; renderPanel(); highlight(-1, -1); map?.closePopup(); break; }
        if (PHONE && state.size === "full") setSize("peek");
        // On phones the actions open in the list, so the pin isn't covered by a popup.
        select(day, k, {pan: true, popup: !PHONE});
        break;
      case "idea": if (PHONE && state.size === "full") setSize("peek"); focusIdea(d.id); break;
      case "go": goTo(day, k); break;
      case "add": suggest({day, type: "add"}); break;
      case "chg": suggest({day, stop: k, type: d.type}); break;
      case "add-idea": {
        const idea = EXPLORE.find(x => x.id === d.id);
        if (!idea) break;
        const near = MODEL.nearestStop(model[day], idea);
        suggest({day, type: "add", toAfter: near ? near.stop.id : lastItemId(day), place: ideaPlace(idea), note: nearNote(near)});
        break;
      }
      case "pin-add": {
        if (!pendingPin) break;
        const {place, day: pd, near} = pendingPin;
        suggest({day: pd, type: "add", toAfter: near ? near.stop.id : lastItemId(pd), place, note: nearNote(near)});
        break;
      }
      case "move-here": {
        const s = model[day].stops[k], near = s && s.pinned ? MODEL.nearestStop(model[state.day], s.place) : null;
        suggest({day, stop: k, type: "move", toDay: state.day, toAfter: near ? near.stop.id : lastItemId(state.day), note: nearNote(near)});
        break;
      }
      case "review": closeMap(); byId("btn-chg")?.click(); break;
      case "city": {
        const b = [];
        for (const dm of model) if (dm.city === d.city) for (const s of dm.stops) if (!s.removed && s.pinned) b.push(ll(s.place));
        fitTo(b);
        break;
      }
      case "kml": downloadKml(); break;
      case "retry":
        mapFailed = false;
        ensureMap().then(m => { if (m) { m.invalidateSize(); draw(true); } });
        break;
    }
  }

  // Capture phase: Leaflet keeps clicks inside popups away from the map, but they must still reach these actions.
  dlg.addEventListener("click", e => {
    if (e.target === dlg) { closeMap(); return; }
    const t = e.target.closest("[data-act]");
    if (t && dlg.contains(t)) { e.preventDefault(); act(t.dataset); }
  }, true);

  /* ---------- drag a stop onto another stop or a day (desktop) ---------- */
  const clearDrag = () => {
    state.drag = null;
    dlg.querySelectorAll(".dragging, .drop-over, .drop-ok").forEach(el => el.classList.remove("dragging", "drop-over", "drop-ok"));
  };
  pbody.addEventListener("dragstart", e => {
    const li = e.target.closest(".tm-stop[draggable]");
    if (!li) return;
    state.drag = {day: +li.dataset.day, k: +li.dataset.k};
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", li.dataset.day + ":" + li.dataset.k);
    li.classList.add("dragging");
    daysEl.querySelectorAll(".tm-chip").forEach(c => { if (+c.dataset.day >= 0 && +c.dataset.day !== state.drag.day) c.classList.add("drop-ok"); });
  });
  dlg.addEventListener("dragend", clearDrag);
  const dropTarget = e => {
    if (!state.drag) return null;
    const chip = e.target.closest(".tm-chip");
    if (chip && +chip.dataset.day >= 0 && +chip.dataset.day !== state.drag.day) return chip;
    const li = e.target.closest(".tm-stop");
    if (li && pbody.contains(li) && !li.classList.contains("dragging") && !li.classList.contains("is-removed")) return li;
    return null;
  };
  dlg.addEventListener("dragover", e => {
    const t = dropTarget(e);
    if (!t) return;
    e.preventDefault();
    dlg.querySelectorAll(".drop-over").forEach(el => el !== t && el.classList.remove("drop-over"));
    t.classList.add("drop-over");
  });
  dlg.addEventListener("dragleave", e => { const t = dropTarget(e); if (t && !t.contains(e.relatedTarget)) t.classList.remove("drop-over"); });
  dlg.addEventListener("drop", e => {
    const t = dropTarget(e), src = state.drag;
    clearDrag();
    if (!t || !src) return;
    e.preventDefault();
    const srcStop = model[src.day].stops[src.k];
    if (t.classList.contains("tm-chip")) {
      const toDay = +t.dataset.day, near = srcStop.pinned ? MODEL.nearestStop(model[toDay], srcStop.place) : null;
      suggest({day: src.day, stop: src.k, type: "move", toDay, toAfter: near ? near.stop.id : lastItemId(toDay), note: nearNote(near)});
      return;
    }
    const toAfter = t.dataset.k === "start" ? "start" : app.days[src.day].items[+t.dataset.k].id;
    const before = src.k > 0 ? app.days[src.day].items[src.k - 1].id : "start";
    if (toAfter === before) { toast("It's already there"); return; }
    suggest({day: src.day, stop: src.k, type: "move", toDay: src.day, toAfter});
  });

  /* ---------- controls ---------- */
  function setSize(size) {
    state.size = size;
    panel.style.height = "";
    panel.dataset.size = size;
    byId("tm-grab").setAttribute("aria-label", size === "full" ? "Show more map" : "Show more of the list");
  }
  {
    // The sheet follows the finger and snaps to the nearest size, thrown in the direction of a fast flick.
    const grab = byId("tm-grab");
    let drag = null;
    const snaps = () => {
      const H = panel.parentElement.getBoundingClientRect().height;
      return {min: 118, peek: Math.round(H * .44), full: Math.round(H - 8)};
    };
    grab.addEventListener("pointerdown", e => {
      if (!PHONE) return;
      grab.setPointerCapture?.(e.pointerId);
      const h = panel.getBoundingClientRect().height;
      drag = {y0: e.clientY, h0: h, y: e.clientY, t: performance.now(), v: 0, moved: false};
    });
    grab.addEventListener("pointermove", e => {
      if (!drag) return;
      const dy = e.clientY - drag.y0;
      if (!drag.moved && Math.abs(dy) < 4) return;
      if (!drag.moved) { drag.moved = true; panel.classList.add("dragging"); }
      const t = performance.now(), sn = snaps();
      drag.v = (e.clientY - drag.y) / Math.max(1, t - drag.t);
      drag.y = e.clientY;
      drag.t = t;
      panel.style.height = Math.max(sn.min - 30, Math.min(sn.full, drag.h0 - dy)) + "px";
    });
    const end = () => {
      if (!drag) return;
      const d = drag;
      drag = null;
      if (!d.moved) { setSize(state.size === "full" ? "peek" : "full"); return; }
      const sn = snaps(), h = panel.getBoundingClientRect().height, aim = h - d.v * 220;
      const size = Object.keys(sn).reduce((best, key) => Math.abs(sn[key] - aim) < Math.abs(sn[best] - aim) ? key : best, "peek");
      panel.classList.remove("dragging");
      requestAnimationFrame(() => { panel.style.height = ""; setSize(size); });
    };
    grab.addEventListener("pointerup", end);
    grab.addEventListener("pointercancel", end);
    grab.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSize(state.size === "full" ? "peek" : "full"); } });
  }

  const syncLayerInputs = () => layersEl.querySelectorAll("input").forEach(i => { i.checked = !!state.layers[i.dataset.layer]; });
  const closeLayers = () => { layersEl.hidden = true; layersBtn.setAttribute("aria-expanded", "false"); };
  layersBtn.onclick = () => { const show = layersEl.hidden; layersEl.hidden = !show; layersBtn.setAttribute("aria-expanded", String(show)); };
  layersEl.addEventListener("change", e => {
    const key = e.target.dataset.layer;
    if (!key) return;
    state.layers[key] = e.target.checked;
    savePrefs();
    if (key === "sat") setTiles();
    draw(false);
    if (key === "found") paintDiscMarks();
  });
  byId("tm-fit").onclick = () => { map?.closePopup(); fitTo(currentBounds()); };
  byId("tm-close").onclick = () => closeMap();
  mapEl.addEventListener("pointerdown", () => { if (!layersEl.hidden) closeLayers(); });

  byId("tm-me").onclick = () => {
    const btn = byId("tm-me");
    if (!navigator.geolocation || !map) { toast("Location isn't available here"); return; }
    btn.setAttribute("aria-pressed", "true");
    navigator.geolocation.getCurrentPosition(pos => {
      const p = {lat: pos.coords.latitude, lng: pos.coords.longitude};
      if (meLayer) meLayer.remove();
      if (!MODEL.validLL(p)) { meLayer = null; btn.setAttribute("aria-pressed", "false"); toast("You're not in Korea yet. Your blue dot appears here once you are."); return; }
      meLayer = Lf.layerGroup([
        Lf.circle([p.lat, p.lng], {radius: Math.min(pos.coords.accuracy || 50, 400), color: "#1a73e8", weight: 1, fillOpacity: .08}),
        Lf.marker([p.lat, p.lng], {icon: divIcon('<div class="tm-me"></div>', [18, 18]), zIndexOffset: 1200, title: "You are here"})
      ]).addTo(map);
      flyToPoint([p.lat, p.lng], 15);
    }, () => { btn.setAttribute("aria-pressed", "false"); toast("Couldn't get your location. Check the location permission."); },
    {enableHighAccuracy: true, timeout: 10000, maximumAge: 60000});
  };

  // experience.js stops arrow keys at the document while a dialog is open, so the map pans itself from the window capture phase.
  window.addEventListener("keydown", e => {
    if (!dlg.open || !map || !mapEl.contains(document.activeElement) || e.altKey || e.metaKey || e.ctrlKey) return;
    if (e.key === "Escape") {
      // Leaflet swallows Esc (preventDefault) even when its last popup is already closed, which blocks the dialog's cancel.
      // Let it through only to close an open popup; otherwise Esc reaches the dialog.
      if (!mapEl.querySelector(".leaflet-popup")) e.stopPropagation();
      return;
    }
    const d = {ArrowLeft: [-100, 0], ArrowRight: [100, 0], ArrowUp: [0, -100], ArrowDown: [0, 100]}[e.key];
    if (!d) return;
    e.preventDefault();
    e.stopPropagation();
    map.panBy(d);
  }, true);
  dlg.addEventListener("cancel", e => {
    e.preventDefault();
    if (!byId("tm-driver").hidden) hideDriver();
    else if (dlg.querySelector(".tmap").classList.contains("searching") || !resEl.hidden) { exitSearch(); }
    else if (!layersEl.hidden) { closeLayers(); layersBtn.focus(); }
    else if (tour) stopTour();
    else if (map && mapEl.querySelector(".leaflet-popup")) map.closePopup();
    else if (disc.on && disc.sel) focusFound(disc.sel);
    else if (disc.on) stopDiscover();
    else closeMap();
  });

  /* ---------- hover sync (desktop): list row ⇄ pin ---------- */
  const rowOf = (day, k) => pbody.querySelector(`.tm-stop[data-day="${day}"][data-k="${k}"]`);
  let hoverKey = null;
  const hoverPin = key => {
    if (hoverKey === key) return;
    markers.get(hoverKey)?.getElement()?.querySelector(".tm-pin")?.classList.remove("is-hover");
    hoverKey = key;
    markers.get(key)?.getElement()?.querySelector(".tm-pin")?.classList.add("is-hover");
  };
  pbody.addEventListener("pointerover", e => {
    if (e.pointerType !== "mouse") return;
    const li = e.target.closest(".tm-stop[data-k]");
    hoverPin(li && li.dataset.k !== "start" ? `${li.dataset.day}:${li.dataset.k}` : null);
  });
  pbody.addEventListener("pointerleave", () => hoverPin(null));

  /* ---------- swipe the day header (phone) ---------- */
  {
    let sw = null;
    pbody.addEventListener("pointerdown", e => {
      sw = PHONE && state.day >= 0 && e.target.closest(".tm-dhead") && !e.target.closest("button, a, input") ? {x: e.clientX, y: e.clientY, t: performance.now()} : null;
    });
    pbody.addEventListener("pointerup", e => {
      if (!sw) return;
      const dx = e.clientX - sw.x, dy = e.clientY - sw.y, quick = performance.now() - sw.t < 700;
      sw = null;
      if (quick && Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.6) act({act: "step", dir: dx < 0 ? 1 : -1});
    });
    pbody.addEventListener("pointercancel", () => { sw = null; });
  }

  /* ---------- play the day: a dot travels stop to stop, the camera and the list follow ---------- */
  const caption = byId("tm-caption");
  function stopTour() {
    if (!tour) return;
    tour.cancelled = true;
    tour.dot?.remove();
    tour = null;
    pbody.classList.remove("touring");
    caption.hidden = true;
    if (dlg.open) renderPanel();
  }
  const wait = ms => new Promise(r => setTimeout(r, ms));
  function animateDot(t, from, to, dur) {
    return new Promise(done => {
      if (!dur) { t.dot.setLatLng(to); done(); return; }
      const t0 = performance.now();
      const step = ts => {
        if (t.cancelled) { done(); return; }
        const p = Math.min(1, (ts - t0) / dur), e = p < .5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
        t.dot.setLatLng([from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e]);
        if (p < 1) requestAnimationFrame(step); else done();
      };
      requestAnimationFrame(step);
    });
  }
  async function playTour(day) {
    if (!map || day == null || !model[day]) return;
    const dm = model[day];
    const pts = [];
    if (dm.start && MODEL.validLL(dm.start)) pts.push({place: dm.start, title: `From ${dm.start.title}`, k: null});
    for (const s of dm.stops) if (!s.removed && s.pinned) pts.push({place: s.place, title: s.title, k: s.k, t: s.t, leg: dm.legs.find(l => l.to === s.k)});
    if (pts.length < 2) { toast("There's nothing to play on this day yet"); return; }
    const t = tour = {cancelled: false, day};
    pbody.classList.add("touring");
    map.closePopup();
    renderPanel();
    if (PHONE && state.size === "full") setSize("peek");
    const say = (small, big) => { caption.hidden = false; caption.innerHTML = `<small>${esc(small)}</small><b>${esc(big)}</b>`; };
    t.dot = Lf.marker(ll(pts[0].place), {icon: divIcon(`<div class="tm-tourdot" style="--dc:${dm.color}"></div>`, [18, 18]), zIndexOffset: 3000, interactive: false, keyboard: false}).addTo(map);
    say(`Day ${day + 1} · ${dm.title}`, pts[0].title);
    fitTo([ll(pts[0].place), ll(pts[1].place)], true);
    await wait(RM() ? 900 : 1100);
    for (let i = 1; i < pts.length && !t.cancelled; i++) {
      const a = pts[i - 1], b = pts[i], leg = b.leg;
      const how = !leg || leg.mode === "same" ? "Next" : leg.mode === "train" ? "🚄 By train" : leg.min == null ? (leg.mode === "walk" ? "🚶 A short walk" : "🚕 By taxi or bus")
        : leg.mode === "walk" ? `🚶 Walk ${leg.min} min` : `🚕 Taxi ≈${leg.min} min`;
      say(how, `${b.t ? b.t + " · " : ""}${b.title}`);
      if (!RM()) {
        map.flyToBounds([ll(a.place), ll(b.place)], {paddingTopLeft: [70, 90], paddingBottomRight: [70, panelInset() + 70], maxZoom: 16, duration: .7});
        await wait(760);
      }
      if (t.cancelled) break;
      await animateDot(t, ll(a.place), ll(b.place), RM() ? 0 : Math.max(900, Math.min(2400, (leg && leg.min ? leg.min : 10) * 90)));
      if (t.cancelled) break;
      if (b.k != null) { state.sel = {day, k: b.k}; renderPanel(); highlight(day, b.k); }
      await wait(RM() ? 1500 : 1000);
    }
    if (!t.cancelled) {
      say("That's the day ✨", `${dm.stats.stops} stops${dm.stats.walkMin ? ` · 🚶 ${mins(dm.stats.walkMin)}` : ""}${dm.stats.rideMin ? ` · 🚕 ${mins(dm.stats.rideMin)}` : ""}`);
      await wait(1800);
    }
    if (tour === t) stopTour();
  }
  // Any hands-on move of the map ends the tour.
  mapEl.addEventListener("pointerdown", () => { if (tour) stopTour(); });
  mapEl.addEventListener("wheel", () => { if (tour) stopTour(); }, {passive: true});

  /* ---------- show the driver: the Korean name, big ---------- */
  const driverEl = byId("tm-driver");
  let driverReturn = null;
  const driverBackground = [...dlg.querySelectorAll(".tm-head, .tm-days, .tm-body")];
  function showDriver(day, k) {
    const s = model[day] && model[day].stops[k];
    if (s) showDriverFor(Object.assign({title: s.title, pinned: s.pinned}, s.place));
  }
  function showDriverFor(place) {
    const s = {title: place.title, pinned: MODEL.validLL(place), place};
    if (!s.place.ko) return;
    driverReturn = document.activeElement;
    const en = [s.title, s.place.name && s.place.name !== s.title && !/[\uac00-\ud7a3]/.test(s.place.name) ? s.place.name : ""].filter(Boolean).join(" · ");
    driverEl.innerHTML = `<p class="k-say" lang="ko">이곳으로 가 주세요</p>
      <p class="k-ko" id="tm-drv-ko" lang="ko">${esc(s.place.ko)}</p>
      <p class="k-en">${esc(en)}</p>
      <div class="tm-acts">
        <button type="button" class="tm-btn" data-act="copy-ko" data-text="${esc(s.place.ko)}">${IC.copy} Copy Korean name</button>
        ${s.pinned ? `<a class="tm-btn" href="${esc(MODEL.kakaoTo(s.place))}" target="_blank" rel="noopener">KakaoMap ↗</a>` : ""}
        <button type="button" class="tm-btn pri" data-act="driver-close">Done</button>
      </div>
      <p class="k-hint">“Please take me here.” Turn the screen toward the driver.</p>`;
    driverEl.hidden = false;
    driverBackground.forEach(el => { el.inert = true; });
    driverEl.querySelector('[data-act="driver-close"]').focus({preventScroll: true});
  }
  function hideDriver(silent) {
    if (driverEl.hidden) return;
    driverEl.hidden = true;
    driverEl.innerHTML = "";
    driverBackground.forEach(el => { el.inert = false; });
    if (!silent && driverReturn && document.contains(driverReturn)) driverReturn.focus({preventScroll: true});
  }
  driverEl.addEventListener("keydown", e => {
    if (e.key !== "Tab") return;
    const controls = [...driverEl.querySelectorAll("button, a[href]")];
    const index = controls.indexOf(document.activeElement);
    e.preventDefault();
    controls[(index + (e.shiftKey ? -1 : 1) + controls.length) % controls.length].focus();
  });

  /* ---------- quick search: stops, other options, ideas, hotels ---------- */
  const tmapEl = dlg.querySelector(".tmap"), qEl = byId("tm-q"), resEl = byId("tm-results");
  let results = [], ri = -1;
  function searchIndex() {
    const out = [];
    for (const dm of model) {
      for (const s of dm.stops) {
        if (s.removed) continue;
        out.push({kind: "stop", day: dm.index, k: s.k, title: s.title, sub: `Day ${dm.index + 1} · ${s.t || ""} · ${dm.city}`, color: dm.color,
          hay: fold([s.title, s.place.ko, s.place.name, s.item.title, s.place.type].join(" "))});
      }
      for (const a of MODEL.alternativesOf(dm, app.resolve)) out.push({kind: "alt", day: dm.index, k: a.k, index: a.index, title: a.opt.title,
        sub: `Option ${a.letter} for Day ${dm.index + 1} · ${a.stop.item.title}`, color: dm.color, hay: fold([a.opt.title, a.opt.ko, a.opt.name, a.opt.type].join(" "))});
    }
    for (const idea of EXPLORE) if (MODEL.validLL(idea)) out.push({kind: "idea", id: idea.id, title: idea.title, sub: `Explore idea · ${idea.city}`, color: "var(--rose)",
      hay: fold([idea.title, idea.ko, idea.name].join(" "))});
    for (const [id, h] of Object.entries(app.hotels)) if (MODEL.validLL(h)) out.push({kind: "hotel", id, title: h.title, sub: `Hotel · ${h.city} · ${h.nights || ""}`, color: "#2a2f45",
      hay: fold([h.title, h.ko, h.name].join(" "))});
    return out;
  }
  function runSearch() {
    const q = fold(qEl.value.trim());
    if (!q) { resEl.hidden = true; qEl.setAttribute("aria-expanded", "false"); qEl.removeAttribute("aria-activedescendant"); results = []; return; }
    const words = q.split(/\s+/);
    results = searchIndex().filter(r => words.every(w => r.hay.includes(w)))
      .sort((a, b) => (fold(b.title).startsWith(q) - fold(a.title).startsWith(q)) || (a.kind === "stop" ? -1 : 0) - (b.kind === "stop" ? -1 : 0))
      .slice(0, 12);
    ri = results.length ? 0 : -1;
    paintResults();
  }
  function paintResults() {
    resEl.innerHTML = results.length ? results.map((r, i) => `<li role="option" id="tm-r${i}" data-i="${i}" aria-selected="${i === ri}" style="--dc:${r.color}"><i></i><span><b>${esc(r.title)}</b><small>${esc(r.sub)}</small></span></li>`).join("")
      : '<li class="empty" role="option" aria-disabled="true">Nothing in the plan matches. Try “Search places” in ⋯ for new places.</li>';
    resEl.hidden = false;
    qEl.setAttribute("aria-expanded", "true");
    if (ri >= 0) { qEl.setAttribute("aria-activedescendant", "tm-r" + ri); resEl.querySelector(`#tm-r${ri}`)?.scrollIntoView({block: "nearest"}); }
    else qEl.removeAttribute("aria-activedescendant");
  }
  function exitSearch() {
    resEl.hidden = true;
    qEl.setAttribute("aria-expanded", "false");
    qEl.removeAttribute("aria-activedescendant");
    qEl.value = "";
    results = [];
    if (tmapEl.classList.contains("searching")) { tmapEl.classList.remove("searching"); if (dlg.open) byId("tm-sbtn").focus({preventScroll: true}); }
  }
  function choose(r) {
    if (!r) return;
    exitSearch();
    // Keep focus inside the dialog (on the map) so the shortcuts and arrow keys keep working.
    (PHONE ? tmapEl : mapEl).focus({preventScroll: true});
    if (r.kind === "stop" || r.kind === "alt") {
      if (state.day !== r.day) switchDay(r.day, r.day > state.day ? 1 : -1);
      if (r.kind === "stop") { select(r.day, r.k, {pan: true, popup: !PHONE}); return; }
      state.sel = {day: r.day, k: r.k};
      renderPanel();
      const m = markers.get(`alt:${r.day}:${r.k}:${r.index}`);
      if (m) { flyToPoint(m.getLatLng(), 15); setTimeout(() => dlg.open && m.openPopup(), 650); }
      else select(r.day, r.k, {pan: true, popup: false});
    } else if (r.kind === "idea") {
      const idea = EXPLORE.find(x => x.id === r.id);
      if (state.day >= 0 && model[state.day].city !== idea.city) switchDay(app.days.findIndex(d => d.city === idea.city), 1);
      setTimeout(() => focusIdea(r.id), 250);
    } else if (r.kind === "hotel" && map) {
      const h = app.hotels[r.id];
      flyToPoint(ll(h), 15);
      setTimeout(() => dlg.open && Lf.popup(popupOpts()).setLatLng(ll(h)).setContent(`<p class="tm-eyebrow">🛏 Hotel · ${esc(h.city)} · ${esc(h.nights || "")}</p><h5>${esc(h.title)}</h5>
        <div class="tm-acts"><a class="tm-btn" href="${esc(MODEL.kakaoTo(Object.assign({}, h, {ko: h.ko || h.name})))}" target="_blank" rel="noopener">KakaoMap ↗</a><a class="tm-btn" href="${esc(MODEL.placeUrl(h))}" target="_blank" rel="noopener">Google Maps ↗</a></div>`).openOn(map), 650);
    }
  }
  qEl.addEventListener("input", runSearch);
  qEl.addEventListener("focus", () => { if (qEl.value.trim()) runSearch(); });
  qEl.addEventListener("keydown", e => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!results.length) return;
      ri = (ri + (e.key === "ArrowDown" ? 1 : -1) + results.length) % results.length;
      paintResults();
    } else if (e.key === "Enter") { e.preventDefault(); choose(results[ri]); }
  });
  resEl.addEventListener("pointerdown", e => e.preventDefault());
  resEl.addEventListener("click", e => { const li = e.target.closest("li[data-i]"); if (li) choose(results[+li.dataset.i]); });
  byId("tm-search").addEventListener("focusout", e => {
    if (byId("tm-search").contains(e.relatedTarget)) return;
    resEl.hidden = true;
    qEl.setAttribute("aria-expanded", "false");
    qEl.removeAttribute("aria-activedescendant");
    if (!qEl.value.trim() && tmapEl.classList.contains("searching")) tmapEl.classList.remove("searching");
  });
  byId("tm-sbtn").onclick = () => { tmapEl.classList.add("searching"); qEl.focus(); };

  /* ---------- keys while the map is open (nothing global) ---------- */
  dlg.addEventListener("keydown", e => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest("input, textarea, select, [contenteditable]") || !driverEl.hidden) return;
    const key = e.key;
    if (key === "/") { e.preventDefault(); if (PHONE) tmapEl.classList.add("searching"); qEl.focus(); }
    else if (key === "[" || key === "]") { e.preventDefault(); act({act: "step", dir: key === "]" ? 1 : -1}); }
    else if (key === "a" || key === "A" || key === "0") { e.preventDefault(); if (state.day !== -1) act({act: "day", day: -1}); }
    else if ((key === "p" || key === "P") && state.day >= 0) { e.preventDefault(); act({act: "play", day: state.day}); }
    else if ((key === "d" || key === "D") && state.day >= 0) { e.preventDefault(); act({act: "disc-day", day: state.day}); }
    else if (key === "f" || key === "F") { e.preventDefault(); map?.closePopup(); fitTo(currentBounds(), true); }
  });

  /* ---------- warm up: fetch the map libraries in idle time, load them on intent ---------- */
  let warm = () => {};
  const warmOn = el => { if (el) ["pointerenter", "touchstart", "focus"].forEach(ev => el.addEventListener(ev, () => warm(), {passive: true, once: true})); };
  {
    const slow = () => navigator.connection && (navigator.connection.saveData || /(^|-)2g$/.test(navigator.connection.effectiveType || ""));
    const prefetch = () => {
      if (slow() || Lf) return;
      const urls = [LIBS.leafletJs, LIBS.leafletCss, LIBS.glJs, LIBS.glCss, LIBS.glLeaflet].map(x => x[0]).concat(BASES[isDark() ? "dark" : "light"].style);
      for (const href of urls) {
        const link = document.createElement("link");
        Object.assign(link, {rel: "prefetch", href, crossOrigin: "anonymous"});
        document.head.append(link);
      }
    };
    const idle = cb => (window.requestIdleCallback ? requestIdleCallback(cb, {timeout: 5000}) : setTimeout(cb, 1500));
    const later = () => setTimeout(() => idle(prefetch), 6000);
    const brand = byId("brand");
    if (!brand || brand.hidden) later();
    else new MutationObserver((_, obs) => { if (brand.hidden) { obs.disconnect(); later(); } }).observe(brand, {attributes: true, attributeFilter: ["hidden"]});
    warm = () => { if (!slow() && !Lf) loadLeaflet().catch(() => {}); };
  }

  /* ---------- discover around the active stop: several open sources, a worth-visiting score, shadow marks ---------- */
  const DISC_FETCH_KM = 1.6, DISC_TTL = 7 * 864e5, DISC_CACHE = "sbtrip-disc-v1", SAVED_KEY = "sbtrip-saved-v1";
  const RADII = [[5, 0.4], [10, 0.8], [20, 1.6]];
  const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://lz4.overpass-api.de/api/interpreter", "https://z.overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter"];
  const SRC_NAMES = [["osm", "OpenStreetMap"], ["en", "Wikipedia"], ["ko", "위키백과"], ["wd", "Wikidata"], ["her", "Heritage"], ["ours", "Our research"]];
  const FILTERS = [["all", "All"], ["sights", "Sights"], ["food", "Food & cafés"], ["outdoors", "Views & parks"], ["night", "Night"], ["saved", "♥ Saved"]];
  const CAT_OF = {heritage: "sight", museum: "culture", gallery: "culture", view: "view", sight: "sight", nature: "nature", area: "sight", market: "shop", culture: "culture", food: "food", cafe: "cafe", night: "night"};
  const disc = {on: false, token: 0, ctrl: null, filter: "all", radius: 0.8, follow: true, more: false, sel: null, list: [], src: {}, status: {}, center: null, anchor: null, city: "", shown: new Map(), ids: new Map()};
  let discGroup = null, savedGroup = null, radar = null, radarCircle = null, discMarks = new Map(), savedMarks = new Map(), followTimer = 0;
  const names = () => { try { return Object.assign({me: "Mykola", her: "Киця"}, JSON.parse(localStorage.getItem("sbtrip-names-v1") || "{}")); } catch (e) { return {me: "Mykola", her: "Киця"}; } };
  const tierCls = w => "t-" + w.tier[2];
  // `CSS` is the stylesheet text in this file, so use the browser's escaper explicitly.
  const cssEsc = v => window.CSS && window.CSS.escape ? window.CSS.escape(v) : String(v).replace(/["\\]/g, "\\$&");
  const kindIcon = k => (MODEL.DISC_KINDS[k] || ["📍"])[0];
  const kindName = k => (MODEL.DISC_KINDS[k] || ["", "Place"])[1];

  // --- source fetchers (keyless, CORS-friendly, each with its own timeout)
  async function getJSON(url, init, ms, signal) {
    const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), ms);
    const stop = () => ctrl.abort();
    signal && signal.addEventListener("abort", stop);
    try {
      const r = await fetch(url, Object.assign({}, init, {signal: ctrl.signal}));
      if (!r.ok) throw new Error("HTTP " + r.status);
      return JSON.parse(await r.text());
    } finally { clearTimeout(t); signal && signal.removeEventListener("abort", stop); }
  }
  const overpassQ = c => {
    const A = `(around:${Math.round(DISC_FETCH_KM * 1000)},${c.lat.toFixed(6)},${c.lng.toFixed(6)})`;
    const sights = t => `${t}${A}[name][tourism~"^(attraction|museum|gallery|viewpoint|artwork|theme_park|zoo|aquarium)$"];${t}${A}[name][historic];${t}${A}[name][leisure~"^(park|garden)$"];${t}${A}[name][amenity~"^(marketplace|theatre|arts_centre)$"];${t}${A}[name][amenity][wikidata];`;
    // Overpass fills a capped output nodes-first, so areas (palaces, parks, big museums) and points get separate caps.
    return `[out:json][timeout:25];(${sights("wr")});out tags center 250;(${sights("node")});out tags center 150;nwr${A}[amenity~"^(restaurant|cafe|bar|pub)$"]["name:en"];out tags center 90;`;
  };
  async function fetchOsm(c, signal) {
    let last;
    // Overpass allows a couple of queries per visitor at a time; if every server is busy, wait a moment and ask the main one again.
    for (const ep of [...OVERPASS, "retry"]) {
      try {
        if (ep === "retry") await new Promise((ok, no) => { const t = setTimeout(ok, 3000); signal.addEventListener("abort", () => { clearTimeout(t); no(new Error("aborted")); }); });
        return MODEL.fromOverpass(await getJSON(ep === "retry" ? OVERPASS[0] : ep, {method: "POST", body: "data=" + enc(overpassQ(c)), headers: {"Content-Type": "application/x-www-form-urlencoded"}}, 20000, signal));
      } catch (e) { last = e; if (signal.aborted) throw e; }
    }
    throw last;
  }
  const fetchWiki = (c, lang, signal) => getJSON(`https://${lang}.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&origin=*&generator=geosearch&ggscoord=${c.lat.toFixed(6)}%7C${c.lng.toFixed(6)}&ggsradius=${DISC_FETCH_KM * 1000}&ggslimit=50&prop=pageviews%7Cpageprops%7Cdescription%7Ccoordinates%7Cpageimages&pvipdays=30&ppprop=wikibase_item&piprop=thumbnail&pithumbsize=160&colimit=50`, {}, 12000, signal).then(j => { if (j.error) throw new Error(j.error.code || "wiki"); return MODEL.fromWiki(j, lang); });
  async function fetchWd(ids, signal) {
    const out = {};
    for (let i = 0; i < ids.length; i += 50) Object.assign(out, MODEL.wdSignals(await getJSON(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&origin=*&ids=${ids.slice(i, i + 50).join("%7C")}&props=sitelinks%7Clabels&languages=en%7Cko`, {}, 12000, signal)));
    return out;
  }
  async function fetchHeritage(ids, signal) {
    const q = `SELECT DISTINCT ?item WHERE { VALUES ?item { ${ids.map(i => "wd:" + i).join(" ")} } ?item wdt:P1435 [] }`;
    const j = await getJSON("https://query.wikidata.org/sparql?format=json&query=" + enc(q), {headers: {Accept: "application/sparql-results+json"}}, 15000, signal);
    return ((j.results && j.results.bindings) || []).map(b => b.item.value.split("/").pop());
  }
  // --- cache per ~100 m cell, so going back to a stop is instant
  const cellKey = c => `${c.lat.toFixed(3)},${c.lng.toFixed(3)}`;
  const readCache = () => { try { return JSON.parse(localStorage.getItem(DISC_CACHE) || "{}") || {}; } catch (e) { return {}; } };
  function writeCache(c, src) {
    try {
      const all = readCache();
      all[cellKey(c)] = {at: Date.now(), osm: src.osm, en: src.en, ko: src.ko, wd: src.wd || {}, her: src.her || []};
      const keys = Object.keys(all).sort((a, b) => all[b].at - all[a].at);
      for (const k of keys.slice(16)) delete all[k];
      localStorage.setItem(DISC_CACHE, JSON.stringify(all));
    } catch (e) { /* storage full: the scan still works, it just isn't remembered */ }
  }
  // --- our own research nearby: Explore ideas and unchosen options
  function oursPool(city) {
    const out = [];
    for (const x of EXPLORE) if (x.city === city) out.push(Object.assign({}, x, {ours: {kind: "idea"}}));
    app.days.forEach((d, di) => {
      if (d.city !== city) return;
      d.items.forEach(it => (it.options || []).forEach(o => {
        const p = app.resolve ? app.resolve(o) : o;
        if (p && !model[di].stops.some(s => s.item === it && s.place.title === p.title)) out.push(Object.assign({}, p, {ours: {kind: "alt", label: `Day ${di + 1} option`}}));
      }));
    });
    return out;
  }
  const plannedPlaces = () => model.flatMap(dm => dm.stops.filter(s => !s.removed && s.pinned).map(s => s.place)).concat(Object.values(app.hotels).filter(MODEL.validLL));

  // --- saved places (synced as saved.<key>.<her|me> in the trip doc)
  const cleanEntry = e => e && typeof e === "object" && MODEL.validLL(e) ? {t: String(e.t || "Saved place").slice(0, 80), ko: String(e.ko || "").slice(0, 60), lat: +e.lat, lng: +e.lng,
    cat: MODEL.DISC_KINDS[e.cat] ? e.cat : "sight", score: Math.max(0, Math.min(100, Math.round(+e.score) || 0)), why: Array.isArray(e.why) ? e.why.slice(0, 3).map(w => String(w).slice(0, 60)) : [],
    src: Array.isArray(e.src) ? e.src.slice(0, 5).map(String) : [], wp: String(e.wp || "").slice(0, 120), city: String(e.city || ""), near: String(e.near || "").slice(0, 80),
    day: Number.isInteger(e.day) ? e.day : null, at: +e.at || 0} : null;
  function cleanSaved(raw) {
    const out = {};
    for (const [k, v] of Object.entries(raw || {})) {
      if (!/^[a-zA-Z0-9_-]{2,40}$/.test(k) || !v || typeof v !== "object") continue;
      for (const who of ["her", "me"]) { const e = cleanEntry(v[who]); if (e) (out[k] = out[k] || {})[who] = e; }
    }
    return out;
  }
  let saved = (() => { try { return cleanSaved(JSON.parse(localStorage.getItem(SAVED_KEY) || "{}")); } catch (e) { return {}; } })();
  let savedSynced = false;
  const persistSaved = () => { try { localStorage.setItem(SAVED_KEY, JSON.stringify(saved)); } catch (e) {} };
  // Unsaves made before sync is connected (syncSet can't send yet) are remembered and sent with the first snapshot.
  const PENDING_DEL = "sbtrip-saved-del-v1";
  const pendingDel = () => { try { return JSON.parse(localStorage.getItem(PENDING_DEL) || "[]") || []; } catch (e) { return []; } };
  const setPendingDel = list => { try { list.length ? localStorage.setItem(PENDING_DEL, JSON.stringify(list.slice(-200))) : localStorage.removeItem(PENDING_DEL); } catch (e) {} };
  const unsaveSync = (k, role) => {
    app.syncSet?.(["saved", k, role], null);
    if (!savedSynced) setPendingDel([...new Set([...pendingDel(), `${k}|${role}`])]);
  };
  const saveSync = (k, role, entry) => {
    app.syncSet?.(["saved", k, role], entry);
    if (!savedSynced) setPendingDel(pendingDel().filter(x => x !== `${k}|${role}`));
  };
  const savedOne = k => saved[k] && (saved[k].me || saved[k].her);
  // A place's saved key: whichever of its identities is already saved, else the preferred one.
  const keyOf = c => MODEL.placeKeys(c).find(k => saved[k]) || MODEL.savedKey(c);
  const savedWho = k => saved[k] ? ["her", "me"].filter(w => saved[k][w]) : [];
  const heartsHtml = k => savedWho(k).map(w => `<span class="tm-who ${w}" title="${esc(names()[w])}">♥</span>`).join("");
  function savedList(city) {
    return Object.entries(saved).map(([k, v]) => Object.assign({key: k, who: Object.keys(v)}, v.me || v.her))
      .filter(e => !city || !e.city || e.city === city).sort((a, b) => b.score - a.score || b.at - a.at);
  }
  app.on?.("remote", data => {
    try {
      const role = myRole(), prev = saved, first = !savedSynced;
      let next = cleanSaved(data && data.saved);
      if (!first && JSON.stringify(next) === JSON.stringify(prev)) return;
      if (first) {
        savedSynced = true;
        // Saves made while offline or before sync was set up are sent once, like the app does for suggestions.
        for (const [k, v] of Object.entries(prev)) if (role && v[role] && !(next[k] && next[k][role]) && app.syncSet) {
          app.syncSet(["saved", k, role], v[role]);
          (next[k] = next[k] || {})[role] = v[role];
        }
        for (const pk of pendingDel()) {
          const [k, who] = pk.split("|");
          if (who !== role || !app.syncSet) continue;
          app.syncSet(["saved", k, who], null);
          if (next[k]) { delete next[k][who]; if (!Object.keys(next[k]).length) delete next[k]; }
        }
        setPendingDel([]);
      }
      saved = next;
      persistSaved();
      const other = role === "her" ? "me" : role === "me" ? "her" : null;
      const arrived = other ? Object.keys(saved).filter(k => saved[k][other] && !(prev[k] && prev[k][other])) : [];
      if (dlg.open) {
        paintSaved();
        if (disc.on) { paintDiscMarks(); paintDiscList(); }
        // Refresh the saved list too, unless someone is in the middle of using the panel.
        else if (!pbody.contains(document.activeElement)) renderPanel();
        if (arrived.length && !first) {
          const e = saved[arrived[0]][other];
          toast(`💗 ${names()[other]} saved ${e.t}${arrived.length > 1 ? ` and ${arrived.length - 1} more` : ""} · ${e.score}`);
          arrived.forEach(k => burstMark(k));
        }
      }
    } catch (e) { console.warn("trip map: saved sync", e); }
  });
  function toggleSavedKey(k) {
    const role = myRole(), v = saved[k];
    if (!role) { toast("First choose who you are (⋯ → More), then save"); return; }
    if (!v) return;
    if (v[role]) {
      delete v[role];
      if (!Object.keys(v).length) delete saved[k];
      unsaveSync(k, role);
    } else {
      v[role] = Object.assign({}, v.me || v.her, {at: Date.now()});
      saveSync(k, role, v[role]);
    }
    persistSaved();
    paintSaved();
    if (disc.on) { paintDiscMarks(); paintDiscList(); }
    if (dlg.open) renderPanel();
    if (v[role]) burstMark(k);
    toast(v[role] ? "♥ Saved for you too" : "Removed from your saved");
  }
  function toggleSave(c) {
    const role = myRole();
    if (!role) { toast("First choose who you are (⋯ → More), then save"); return null; }
    const k = keyOf(c);
    const mine = saved[k] && saved[k][role];
    if (mine) {
      delete saved[k][role];
      if (!Object.keys(saved[k]).length) delete saved[k];
      unsaveSync(k, role);
    } else {
      const entry = cleanEntry(MODEL.savedEntry(c, {city: disc.city || (model[state.day] || {}).city || "", near: disc.anchor ? disc.anchor.title : "", day: disc.anchor ? disc.anchor.day : state.day >= 0 ? state.day : null}));
      (saved[k] = saved[k] || {})[role] = entry;
      saveSync(k, role, entry);
    }
    persistSaved();
    paintSaved();
    if (disc.on) { paintDiscMarks(); paintDiscList(); }
    if (!mine) burstMark(k);
    toast(mine ? "Removed from saved" : `♥ Saved${app.syncStatus && app.syncStatus() === "live" ? ", and on both phones" : ""}`);
    return !mine;
  }

  // --- score ring count-up
  function countUp(el, to) {
    const from = +el.dataset.v || 0;
    el.dataset.v = to;
    if (RM() || from === to) { el.textContent = to; return; }
    const t0 = performance.now(), d = 700;
    const step = t => { const p = Math.min(1, (t - t0) / d); el.textContent = Math.round(from + (to - from) * (1 - (1 - p) ** 3)); if (p < 1 && el.isConnected) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  // Rings start from the score shown last time, so new evidence visibly lifts (or lowers) a place.
  const ringHtml = (w, id) => {
    const from = id && disc.shown.has(id) ? disc.shown.get(id) : RM() ? w.score : 0;
    return `<span class="tm-ring ${tierCls(w)}" style="--p:${from}" aria-hidden="true"${id ? ` data-id="${esc(id)}"` : ""} data-to="${w.score}"><b data-v="${from}">${from}</b></span>`;
  };
  function animateRings(root) {
    root.querySelectorAll(".tm-ring[data-to]").forEach(r => {
      const to = +r.dataset.to;
      if (r.dataset.id) disc.shown.set(r.dataset.id, to);
      countUp(r.querySelector("b"), to);
      if (RM()) r.style.setProperty("--p", to);
      else requestAnimationFrame(() => requestAnimationFrame(() => r.style.setProperty("--p", to)));
    });
  }

  // --- radar while scanning
  function startRadar(c, color) {
    stopRadar(true);
    if (!map) return;
    const km = disc.radius;
    radarCircle = Lf.circle([c.lat, c.lng], {radius: km * 1000, color, weight: 1.5, opacity: .7, fillColor: color, fillOpacity: .05, dashArray: "6 8", className: "tm-radius", interactive: false}).addTo(map);
    if (RM()) return;
    const px = () => Math.round(2 * km * 1000 / (40075016.686 * Math.cos(c.lat * Math.PI / 180) / 2 ** (map.getZoom() + 8)));
    const html = d => `<div class="tm-radar" style="--dc:${color};--d:${d}px"><span class="sweep"></span><span class="ring"></span><span class="ring r2"></span><span class="ring r3"></span></div>`;
    radar = Lf.marker([c.lat, c.lng], {icon: Lf.divIcon({className: "", html: html(px()), iconSize: [0, 0]}), pane: "tmRadar", interactive: false, keyboard: false}).addTo(map);
    radar._zoom = () => radar.setIcon(Lf.divIcon({className: "", html: html(px()).replace('class="tm-radar"', `class="tm-radar${disc.loading ? "" : " done"}"`), iconSize: [0, 0]}));
    map.on("zoomend", radar._zoom);
  }
  function radarDone() { radar && radar.getElement()?.querySelector(".tm-radar")?.classList.add("done"); }
  function stopRadar(all) {
    if (radar) { map && map.off("zoomend", radar._zoom); radar.remove(); radar = null; }
    if (all && radarCircle) { radarCircle.remove(); radarCircle = null; }
  }
  function resizeRadius() { if (radarCircle) radarCircle.setRadius(disc.radius * 1000); if (radar) radar._zoom(); }

  // --- results → what's shown
  function visibleFound() {
    if (disc.filter === "saved") return [];
    const set = MODEL.DISC_FILTERS[disc.filter];
    return disc.list.filter(c => c.worth.km <= disc.radius && (!set || set.has(c.kind)));
  }
  function recompute() {
    const src = disc.src;
    const wd = MODEL.applyHeritage(src.wd || {}, src.her || []);
    disc.list = MODEL.discover({osm: src.osm, en: src.en, ko: src.ko, wd, ours: src.ours}, disc.center, DISC_FETCH_KM, {planned: plannedPlaces()});
    for (const c of disc.list) {
      const keys = MODEL.placeKeys(c);
      const id = keys.map(k => disc.ids.get(k)).find(Boolean) || keys[0];
      keys.forEach(k => disc.ids.set(k, id));
      c.id = id;
    }
  }
  const found = id => disc.list.find(c => c.id === id);

  // --- shadow marks on the map
  const shHtml = (c, i, extra = "") => {
    const k = keyOf(c), hearts = heartsHtml(k);
    return `<div class="tm-sh ${tierCls(c.worth)}${hearts ? " saved" : ""}${disc.sel === c.id ? " is-sel" : ""}${extra}" style="--p:${c.worth.score};--i:${i}" data-id="${esc(c.id)}"><b>${c.worth.score}</b><i>${kindIcon(c.kind)}</i>${hearts ? `<span class="tm-hearts">${hearts}</span>` : ""}</div>`;
  };
  // Lower-scored places that would sit on top of a better one are left off at this zoom (they stay in the list).
  function declutter(list) {
    const z = map.getZoom(), placed = [], out = [];
    const sel = list.find(c => c.id === disc.sel);
    for (const c of sel ? [sel, ...list.filter(x => x !== sel)] : list) {
      const pt = map.project([c.lat, c.lng], z);
      if (placed.some(q => Math.abs(q.x - pt.x) < 30 && Math.abs(q.y - pt.y) < 30)) continue;
      placed.push(pt);
      out.push(c);
    }
    return out;
  }
  function paintDiscMarks() {
    if (!map || !discGroup) return;
    const show = disc.on && state.layers.found ? declutter(visibleFound()).slice(0, disc.more ? 80 : 30) : [];
    const keep = new Set(show.map(c => c.id));
    for (const [id, m] of discMarks) {
      if (keep.has(id)) continue;
      const el = m.getElement()?.querySelector(".tm-sh");
      discMarks.delete(id);
      if (el && !RM()) { el.classList.add("out"); setTimeout(() => discGroup.removeLayer(m), 230); } else discGroup.removeLayer(m);
    }
    show.forEach((c, i) => {
      const m = discMarks.get(c.id);
      if (m) {
        const el = m.getElement()?.querySelector(".tm-sh");
        if (!el) return;
        const was = +el.style.getPropertyValue("--p");
        el.className = `tm-sh ${tierCls(c.worth)}${savedWho(keyOf(c)).length ? " saved" : ""}${disc.sel === c.id ? " is-sel" : ""}`;
        el.style.setProperty("--p", c.worth.score);
        el.style.animation = "none";
        const hearts = heartsHtml(keyOf(c)), h = el.querySelector(".tm-hearts");
        if (hearts && !h) el.insertAdjacentHTML("beforeend", `<span class="tm-hearts">${hearts}</span>`); else if (h) { if (hearts) h.innerHTML = hearts; else h.remove(); }
        if (was !== c.worth.score) { countUp(el.querySelector("b"), c.worth.score); if (!RM()) { el.classList.add("bump"); setTimeout(() => el.classList.remove("bump"), 520); } }
        m.setZIndexOffset(300 + c.worth.score);
        return;
      }
      const mk = Lf.marker([c.lat, c.lng], {icon: Lf.divIcon({className: "", html: shHtml(c, i), iconSize: [38, 38], iconAnchor: [19, 19], popupAnchor: [0, -18]}),
        pane: "tmShadow", zIndexOffset: 300 + c.worth.score, keyboard: true, title: `${c.title}: ${c.worth.score} · ${c.worth.tier[1]}`, riseOnHover: true});
      mk.on("click", () => focusFound(c.id, {fromMap: true}));
      mk.on("mouseover", () => discRow(c.id)?.classList.add("is-hover"));
      mk.on("mouseout", () => discRow(c.id)?.classList.remove("is-hover"));
      mk.addTo(discGroup);
      discMarks.set(c.id, mk);
      const b = mk.getElement()?.querySelector("b");
      if (b) { b.dataset.v = 0; countUp(b, c.worth.score); }
    });
    mapEl.classList.toggle("tm-dim", !!disc.sel);
  }
  // Saved marks are updated in place (not rebuilt), so an open card survives sync heartbeats and zooming.
  function paintSaved() {
    if (!map || !savedGroup) return;
    const city = state.day >= 0 ? model[state.day].city : null;
    const covered = new Set(disc.on && state.layers.found ? visibleFound().map(c => keyOf(c)) : []);
    const want = new Map(state.layers.saved ? savedList(city).filter(e => !covered.has(e.key)).map(e => [e.key, e]) : []);
    for (const [k, m] of savedMarks) if (!want.has(k)) { savedGroup.removeLayer(m); savedMarks.delete(k); }
    for (const [k, e] of want) {
      const tier = MODEL.tierOf(e.score), sig = `${e.score}|${e.cat}|${e.who.join("+")}`;
      const html = `<div class="tm-sh t-${tier[2]} saved only" style="--p:${e.score};--i:0"><b>${e.score}</b><i>${kindIcon(e.cat)}</i><span class="tm-hearts">${heartsHtml(k)}</span></div>`;
      const icon = Lf.divIcon({className: "", html, iconSize: [38, 38], iconAnchor: [19, 19], popupAnchor: [0, -18]});
      const m = savedMarks.get(k);
      if (m) {
        if (m._sig !== sig) { m.setIcon(icon); m._sig = sig; if (m.isPopupOpen()) m.getPopup().setContent(savedPopup(k)); }
        continue;
      }
      const mk = Lf.marker([e.lat, e.lng], {icon, pane: "tmShadow", zIndexOffset: 200 + e.score, title: `Saved: ${e.t} · ${e.score}`});
      mk._sig = sig;
      mk.bindPopup(() => savedPopup(k), popupOpts());
      mk.addTo(savedGroup);
      savedMarks.set(k, mk);
    }
  }
  function burstMark(k) {
    if (RM()) return;
    const c = disc.list.find(x => keyOf(x) === k);
    const m = (c && discMarks.get(c.id)) || savedMarks.get(k);
    const el = m && m.getElement()?.querySelector(".tm-sh");
    if (!el) return;
    el.classList.remove("burst");
    void el.offsetWidth;
    el.classList.add("burst");
    setTimeout(() => el.classList.remove("burst"), 750);
  }

  // --- panel section
  const discRow = id => pbody.querySelector(`.tm-drow[data-id="${cssEsc(id)}"]`);
  function foundActions(c) {
    const k = keyOf(c), mine = !!(saved[k] && saved[k][myRole()]);
    const a = disc.anchor;
    const out = [`<button type="button" class="tm-btn pri" data-act="disc-save" data-id="${esc(c.id)}" aria-pressed="${mine}">${mine ? "♥ Saved" : "♡ Save"}</button>`];
    if (a) out.push(`<button type="button" class="tm-btn" data-act="disc-add" data-id="${esc(c.id)}">${IC.plus} Add after ${esc(a.title.length > 22 ? a.title.slice(0, 21) + "…" : a.title)}</button>`);
    if (a && a.swappable) out.push(`<button type="button" class="tm-btn" data-act="disc-swap" data-id="${esc(c.id)}">🔁 Swap it in</button>`);
    if (c.ko) out.push(`<button type="button" class="tm-btn" data-act="disc-driver" data-id="${esc(c.id)}">🚕 Show the driver</button>`);
    out.push(`<a class="tm-btn" href="${esc(a && a.place ? MODEL.kakaoRoute(a.place, c, c.worth.walk <= 25 ? "walk" : "taxi") : MODEL.kakaoTo(c))}" target="_blank" rel="noopener">KakaoMap ↗</a>`);
    out.push(`<a class="tm-btn" href="${esc(MODEL.placeUrl({name: c.title, lat: c.lat, lng: c.lng}))}" target="_blank" rel="noopener">Google Maps ↗</a>`);
    return out.join("");
  }
  function discRowHtml(c, i) {
    const w = c.worth, k = keyOf(c), mine = !!(saved[k] && saved[k][myRole()]);
    const chips = w.why.filter(x => x[2] > 0 && x[0] !== "🚶").slice(0, 2).map(x => `<span>${x[0]} ${esc(x[1])}</span>`).join("");
    return `<li class="tm-drow ${tierCls(w)}${disc.sel === c.id ? " is-sel" : ""}" data-id="${esc(c.id)}" style="--i:${Math.min(i, 12)}">
      <button type="button" class="tm-row" data-act="disc-focus" data-id="${esc(c.id)}" aria-expanded="${disc.sel === c.id}">
        ${ringHtml(w, c.id)}
        <span class="tm-copy"><small>${kindIcon(c.kind)} ${esc(kindName(c.kind))} · ${w.walk <= 1 ? "right here" : `${w.walk} min walk`} · <span class="tm-tier">${esc(w.tier[1])}</span> ${heartsHtml(k)}</small><b>${esc(c.title)}</b>${chips ? `<span class="tm-chips">${chips}</span>` : ""}</span>
      </button>
      <button type="button" class="tm-heart" data-act="disc-save" data-id="${esc(c.id)}" aria-pressed="${mine}" aria-label="${mine ? "Unsave" : "Save"} ${esc(c.title)}">${mine ? "♥" : "♡"}</button>
      <div class="tm-acts">${foundActions(c)}</div>
    </li>`;
  }
  function savedRowHtml(e, i) {
    const tier = MODEL.tierOf(e.score), w = {score: e.score, tier};
    const nm = names();
    const near = state.day >= 0 ? MODEL.nearestStop(model[state.day], e) : null;
    return `<li class="tm-drow t-${tier[2]}" data-saved="${esc(e.key)}" style="--i:${Math.min(i, 12)}">
      <button type="button" class="tm-row" data-act="saved-focus" data-key="${esc(e.key)}">
        ${ringHtml(w, "s:" + e.key)}
        <span class="tm-copy"><small>${kindIcon(e.cat)} ${esc(kindName(e.cat))} · ${e.who.map(x => `<span class="tm-who ${x}">♥ ${esc(nm[x])}</span>`).join(" ")}</small><b>${esc(e.t)}</b>
        <em>${near ? `${near.km} km from ${esc(near.stop.title)}` : e.near ? `found near ${esc(e.near)}` : ""}</em>${e.why.length ? `<span class="tm-chips">${e.why.slice(0, 2).map(x => `<span>${esc(x)}</span>`).join("")}</span>` : ""}</span>
      </button>
      ${state.day >= 0 ? `<button type="button" class="tm-btn" data-act="saved-add" data-key="${esc(e.key)}" aria-label="Suggest ${esc(e.t)} for Day ${state.day + 1}">${IC.plus} Add</button>` : ""}
    </li>`;
  }
  function discListHtml() {
    if (disc.filter === "saved") {
      const list = savedList(disc.city);
      return list.length ? list.map(savedRowHtml).join("") : `<li class="tm-dempty">Nothing saved in ${esc(disc.city)} yet. Tap ♡ on any place.</li>`;
    }
    const vis = visibleFound();
    if (!vis.length && disc.loading) return '<li class="tm-skel"></li><li class="tm-skel"></li><li class="tm-skel"></li>';
    if (!vis.length) return `<li class="tm-dempty">${Object.values(disc.status).some(s => s === "err") && !disc.list.length ? "The sources didn't answer. Check the connection and try again." : "Nothing here for this filter. Try a longer walk or another filter."}</li>`;
    const n = disc.more ? 40 : 12;
    return vis.slice(0, n).map(discRowHtml).join("") + (vis.length > n ? `<li><button type="button" class="tm-btn" data-act="disc-more" style="margin:8px 0 0 48px">Show all ${vis.length}</button></li>` : "");
  }
  function srcHtml() {
    return SRC_NAMES.map(([k, label]) => {
      const st = disc.status[k] || "wait", n = k === "her" ? (disc.src.her || []).length : k === "wd" ? Object.keys(disc.src.wd || {}).length : (disc.src[k] || []).length;
      return `<span class="${st}" title="${esc(label)}: ${st === "ok" ? n + " found" : st === "err" ? "didn't answer" : st === "load" ? "searching…" : "waiting"}">${esc(label)}${st === "ok" ? ` ${n}` : ""}</span>`;
    }).join("");
  }
  function discSummary() {
    const vis = visibleFound(), top = vis.filter(c => c.worth.score >= 55).length;
    if (disc.loading && !disc.list.length) return "Scanning the neighbourhood…";
    return `${vis.length} place${vis.length === 1 ? "" : "s"} within ${RADII.find(r => r[1] === disc.radius)[0]} min walk${top ? ` · ${top} worth the detour` : ""}${disc.loading ? " · still checking sources…" : ""}`;
  }
  function discSectionHtml(dm) {
    if (!disc.on || !disc.anchor || disc.anchor.day !== dm.index) return "";
    return `<section class="tm-disc" id="tm-disc" style="--dc:${dm.color}" aria-label="Places around ${esc(disc.anchor.title)}">
      <div class="tm-disc-h"><h4>✨ Around ${esc(disc.anchor.title)}</h4><button type="button" class="tm-ib" data-act="disc-close" aria-label="Close discover">${IC.close}</button></div>
      <div class="tm-src" id="tm-src" aria-hidden="true">${srcHtml()}</div>
      <div class="tm-seg" role="group" aria-label="How far to walk">${RADII.map(([m, km]) => `<button type="button" data-act="disc-radius" data-km="${km}" aria-pressed="${disc.radius === km}">🚶 ${m} min</button>`).join("")}</div>
      <div class="tm-seg" role="group" aria-label="What to show">${FILTERS.map(([f, l]) => `<button type="button" data-act="disc-filter" data-f="${f}" aria-pressed="${disc.filter === f}">${esc(l)}</button>`).join("")}</div>
      <label class="tm-follow"><input type="checkbox" id="tm-follow"${disc.follow ? " checked" : ""}> Follow the stop I pick</label>
      <p class="tm-dsum" id="tm-dsum" role="status" aria-live="polite">${esc(discSummary())}</p>
      <ol class="tm-dlist" id="tm-dlist">${discListHtml()}</ol>
      <p class="tm-help">Scores (0–100) combine open data: OpenStreetMap listings, how much Wikipedia readers look at a place, how many language wikis cover it, protected-heritage status in Wikidata, our own Explore research, and the walk from here. Food has no open ratings, so it is judged on local cuisine and listing detail; check reviews with the links.</p>
    </section>`;
  }
  function paintDiscList() {
    const list = byId("tm-dlist");
    if (!list) return;
    const focusId = document.activeElement && pbody.contains(document.activeElement) && document.activeElement.closest(".tm-drow")?.dataset.id;
    const act = document.activeElement && document.activeElement.dataset.act;
    list.innerHTML = discListHtml();
    byId("tm-src").innerHTML = srcHtml();
    byId("tm-dsum").textContent = discSummary();
    // Only rows that are new slide in; the rest just update their numbers.
    list.querySelectorAll(".tm-drow[data-id]").forEach(r => { if (disc.shown.has(r.dataset.id)) r.style.animation = "none"; });
    animateRings(list);
    if (focusId) list.querySelector(`.tm-drow[data-id="${cssEsc(focusId)}"] [data-act="${act}"]`)?.focus({preventScroll: true});
  }
  function savedSectionHtml(city, day) {
    const list = savedList(city);
    if (!list.length || (disc.on && disc.filter === "saved")) return "";
    return `<section class="tm-sec"><h4>♥ Saved places${city ? ` in ${esc(city)}` : ""} (${list.length})</h4><p class="sub">Found with Discover and saved by either of you. They sync between both phones and stay on the map as shadow marks.</p>
      <ol class="tm-dlist">${list.slice(0, 12).map(savedRowHtml).join("")}</ol></section>`;
  }

  // --- popups
  function foundPopup(c) {
    const w = c.worth, P = w.parts;
    const rows = [["Known", P.fame, 35], ["Heritage", P.heritage, 12], ["Our research", P.research, 20], [SIGHT_KINDS.has(c.kind) ? "Listing" : "Local & listed", P.detail, SIGHT_KINDS.has(c.kind) ? 13 : 25], ["Walk", P.near, 20]];
    const links = [];
    if (c.osm) links.push(`<a href="https://www.openstreetmap.org/${esc(c.osm)}" target="_blank" rel="noopener">OpenStreetMap</a>`);
    for (const [l, t] of Object.entries(c.wiki || {})) links.push(`<a href="https://${l}.wikipedia.org/wiki/${enc(String(t).replace(/ /g, "_"))}" target="_blank" rel="noopener">${l === "en" ? "Wikipedia" : "위키백과"}</a>`);
    if (c.wd) links.push(`<a href="https://www.wikidata.org/wiki/${esc(c.wd)}" target="_blank" rel="noopener">Wikidata</a>`);
    if (c.src.includes("ours")) links.push("our Explore research");
    return `<div class="${tierCls(w)}"><p class="tm-eyebrow">${kindIcon(c.kind)} ${esc(kindName(c.kind))} · ${w.walk <= 1 ? "right here" : `${w.walk} min walk`}${disc.anchor ? ` from ${esc(disc.anchor.title)}` : ""}</p>
      <div class="tm-ph">${ringHtml(w)}<div><h5>${esc(c.title)}</h5><p style="margin:0"><span class="tm-tier">${esc(w.tier[1])}</span>${c.ko && c.ko !== c.title ? ` · <span lang="ko">${esc(c.ko)}</span>` : ""} ${heartsHtml(keyOf(c))}</p></div></div>
      ${c.desc ? `<p style="color:var(--muted)">${esc(String(c.desc).slice(0, 140))}</p>` : ""}
      <div class="tm-bd">${rows.map(([l, v, mx], j) => `<span>${l}</span><i style="--w:${Math.round(100 * Math.max(0, v) / mx)};--j:${j}"></i><b>${v}</b>`).join("")}</div>
      <div class="tm-chips">${w.why.filter(x => x[2] !== 0).slice(0, 4).map(x => `<span>${x[0]} ${esc(x[1])}</span>`).join("")}</div>
      <p class="tm-srcs">From ${w.sources} source${w.sources > 1 ? "s" : ""}: ${links.join(" · ")}</p>
      <div class="tm-acts">${foundActions(c)}</div></div>`;
  }
  const SIGHT_KINDS = new Set(["heritage", "museum", "gallery", "view", "sight", "nature", "area", "market", "culture"]);
  function savedPopup(k) {
    const e = savedList().find(x => x.key === k);
    if (!e) return "";
    const tier = MODEL.tierOf(e.score), nm = names(), mine = !!(saved[k] && saved[k][myRole()]);
    const wp = /^(en|ko):(.+)$/.exec(e.wp || "");
    return `<div class="t-${tier[2]}"><p class="tm-eyebrow">♥ Saved · ${kindIcon(e.cat)} ${esc(kindName(e.cat))}${e.near ? ` · found near ${esc(e.near)}` : ""}</p>
      <div class="tm-ph">${ringHtml({score: e.score, tier})}<div><h5>${esc(e.t)}</h5><p style="margin:0"><span class="tm-tier">${esc(tier[1])}</span> · ${e.who.map(x => `<span class="tm-who ${x}">♥ ${esc(nm[x])}</span>`).join(" ")}</p></div></div>
      ${e.why.length ? `<div class="tm-chips">${e.why.map(x => `<span>${esc(x)}</span>`).join("")}</div>` : ""}
      ${wp ? `<p class="tm-srcs"><a href="https://${wp[1]}.wikipedia.org/wiki/${enc(wp[2].replace(/ /g, "_"))}" target="_blank" rel="noopener">${wp[1] === "en" ? "Wikipedia" : "위키백과"}</a></p>` : ""}
      <div class="tm-acts">
        <button type="button" class="tm-btn pri" data-act="saved-toggle" data-key="${esc(k)}" aria-pressed="${mine}">${mine ? "♥ Saved" : "♡ Save too"}</button>
        ${state.day >= 0 ? `<button type="button" class="tm-btn" data-act="saved-add" data-key="${esc(k)}">${IC.plus} Add to Day ${state.day + 1}</button>` : ""}
        <button type="button" class="tm-btn" data-act="saved-discover" data-key="${esc(k)}">✨ Discover around</button>
        <a class="tm-btn" href="${esc(MODEL.kakaoTo({ko: e.ko, name: e.t, lat: e.lat, lng: e.lng}))}" target="_blank" rel="noopener">KakaoMap ↗</a>
        <a class="tm-btn" href="${esc(MODEL.placeUrl({name: e.t, lat: e.lat, lng: e.lng}))}" target="_blank" rel="noopener">Google Maps ↗</a>
      </div></div>`;
  }

  // --- run a scan
  function anchorFor(day, k) {
    const dm = model[day], s = dm && dm.stops[k];
    if (!s || s.removed || !s.pinned) return null;
    return {day, k, id: s.id, title: s.title, place: s.place, swappable: s.kind !== "stay" && s.kind !== "transit"};
  }
  function defaultAnchor(day) {
    const dm = model[day];
    if (!dm) return null;
    if (state.sel && state.sel.day === day) { const a = anchorFor(day, state.sel.k); if (a) return a; }
    if (MODEL.tripDayIndex(app.days, now()) === day) {
      const up = MODEL.nextUp(MODEL.schedule(dm), MODEL.seoulNow(now()).min);
      if (up) { const a = anchorFor(day, up.k); if (a) return a; }
    }
    const first = dm.stops.find(s => !s.removed && s.pinned && s.kind !== "stay" && s.kind !== "transit") || dm.stops.find(s => !s.removed && s.pinned);
    return first ? anchorFor(day, first.k) : null;
  }
  async function startDiscover(anchor, opts = {}) {
    if (!anchor) { toast("Pick a stop on the map first"); return; }
    if (tour) stopTour();
    disc.ctrl && disc.ctrl.abort();
    const token = ++disc.token, ctrl = disc.ctrl = new AbortController();
    const center = {lat: +anchor.place.lat, lng: +anchor.place.lng}, dm = model[anchor.day];
    Object.assign(disc, {on: true, anchor, center, city: dm.city, sel: null, more: false, list: [], loading: true, shown: new Map(), ids: new Map(),
      src: {ours: MODEL.curatedNear(center, DISC_FETCH_KM, oursPool(dm.city))}, status: {osm: "load", en: "load", ko: "load", wd: "wait", her: "wait", ours: "ok"}});
    if (disc.filter === "saved") disc.filter = "all";
    state.layers.found = true;
    syncLayerInputs();
    for (const m of discMarks.values()) discGroup && discGroup.removeLayer(m);
    discMarks = new Map();
    if (state.day !== anchor.day) switchDay(anchor.day, anchor.day > state.day ? 1 : -1);
    renderPanel();
    if (!opts.quiet) byId("tm-disc")?.scrollIntoView({block: "start", behavior: RM() ? "auto" : "smooth"});
    if (PHONE && state.size === "min") setSize("peek");
    if (map) {
      map.closePopup();
      startRadar(center, dm.color);
      fitTo([[center.lat - disc.radius / 111, center.lng], [center.lat + disc.radius / 111, center.lng], [center.lat, center.lng - disc.radius / 88], [center.lat, center.lng + disc.radius / 88]], true);
    }
    const live = () => token === disc.token && disc.on;
    const update = () => { if (!live()) return; recompute(); paintDiscMarks(); paintDiscList(); paintSaved(); };
    update();
    const cached = readCache()[cellKey(center)];
    if (cached && Date.now() - cached.at < DISC_TTL) {
      Object.assign(disc.src, {osm: cached.osm || [], en: cached.en || [], ko: cached.ko || [], wd: cached.wd || {}, her: cached.her || []});
      disc.status = {osm: "ok", en: "ok", ko: "ok", wd: "ok", her: "ok", ours: "ok"};
      disc.loading = false;
      // A short sweep even from cache, so the change of place reads clearly.
      setTimeout(() => { if (!live()) return; update(); radarDone(); }, RM() ? 0 : 650);
      return;
    }
    const one = (key, p) => p.then(v => { if (!live()) return; disc.src[key] = v; disc.status[key] = "ok"; update(); })
      .catch(() => { if (!live()) return; disc.status[key] = "err"; update(); });
    await Promise.all([one("osm", fetchOsm(center, ctrl.signal)), one("en", fetchWiki(center, "en", ctrl.signal)), one("ko", fetchWiki(center, "ko", ctrl.signal))]);
    if (!live()) return;
    const ids = [...new Set([...(disc.src.osm || []), ...(disc.src.en || []), ...(disc.src.ko || [])].map(c => c.wd).filter(Boolean))].slice(0, 150);
    disc.status.wd = ids.length ? "load" : "ok";
    disc.status.her = ids.length ? "load" : "ok";
    update();
    if (ids.length) await Promise.all([one("wd", fetchWd(ids, ctrl.signal)), one("her", fetchHeritage(ids, ctrl.signal))]);
    if (!live()) return;
    disc.loading = false;
    update();
    radarDone();
    // Only a complete answer is remembered, so a source that failed is asked again next time.
    if (["osm", "en", "ko", "wd", "her"].every(k => disc.status[k] === "ok")) writeCache(center, disc.src);
  }
  function stopDiscover() {
    if (!disc.on) return;
    disc.ctrl && disc.ctrl.abort();
    disc.on = false;
    disc.token++;
    disc.sel = null;
    clearTimeout(followTimer);
    stopRadar(true);
    for (const m of discMarks.values()) discGroup && discGroup.removeLayer(m);
    discMarks = new Map();
    mapEl.classList.remove("tm-dim");
    map && map.closePopup();
    if (dlg.open) { renderPanel(); paintSaved(); }
  }
  function focusFound(id, opts = {}) {
    const c = found(id);
    if (!c) {
      disc.sel = null;
      mapEl.classList.remove("tm-dim");
      discMarks.forEach(m => m.getElement()?.querySelector(".tm-sh")?.classList.remove("is-sel"));
      return;
    }
    const again = disc.sel === id && !opts.fromMap;
    disc.sel = again ? null : id;
    discMarks.forEach((m, mid) => m.getElement()?.querySelector(".tm-sh")?.classList.toggle("is-sel", mid === disc.sel));
    mapEl.classList.toggle("tm-dim", !!disc.sel);
    pbody.querySelectorAll(".tm-drow[data-id]").forEach(r => {
      const on = r.dataset.id === disc.sel;
      r.classList.toggle("is-sel", on);
      r.querySelector(".tm-row")?.setAttribute("aria-expanded", String(on));
    });
    if (again) { map && map.closePopup(); return; }
    discRow(id)?.scrollIntoView({block: "nearest", behavior: RM() ? "auto" : "smooth"});
    if (!map) return;
    if (!opts.fromMap) flyToPoint([c.lat, c.lng], Math.max(map.getZoom(), 16));
    if (!PHONE || opts.fromMap) {
      const open = () => { if (!dlg.open || disc.sel !== id) return; Lf.popup(popupOpts()).setLatLng([c.lat, c.lng]).setContent(foundPopup(c)).openOn(map); };
      if (opts.fromMap) open();
      else { let done = false; const once = () => { if (done) return; done = true; open(); }; map.once("moveend", once); setTimeout(once, 900); }
    }
  }
  const placeFor = c => ({title: c.title, ko: c.ko, name: c.title, lat: c.lat, lng: c.lng, cool: c.desc || c.worth.why.filter(w => w[2] > 0).map(w => w[1]).join(" · "),
    url: MODEL.placeUrl({name: c.title, lat: c.lat, lng: c.lng}), wiki: c.wiki && (c.wiki.en || c.wiki.ko) || "", img: c.img || "", cat: CAT_OF[c.kind] || "sight"});
  const scoreNote = c => `✨ Worth-visiting score ${c.worth.score} (${c.worth.tier[1]}): ${c.worth.why.filter(w => w[2] > 0).slice(0, 3).map(w => w[1]).join(", ")}.`;

  pbody.addEventListener("change", e => {
    if (e.target.id !== "tm-follow") return;
    disc.follow = e.target.checked;
    if (!disc.follow) clearTimeout(followTimer);
  });

  /* ---------- the 3D world rests while the map covers it (same switch the mini-game uses) ---------- */
  let pausedByMap = false;
  function pause3d() {
    if (pausedByMap || app.renderPaused || app.state.mode === "travel") return;
    app.renderPaused = true;
    pausedByMap = true;
  }
  function resume3d() {
    if (!pausedByMap) return;
    pausedByMap = false;
    // If something else opened over us (the mini-game closes the map and pauses 3D itself), leave its pause in place.
    if (document.querySelector("dialog[open]:not(#tripmap)")) return;
    app.renderPaused = false;
  }

  // Resolves when the base map has drawn its first picture (or after a short wait, so the map never stays hidden).
  function baseReady(ms = 1600) {
    return new Promise(done => {
      let t = setTimeout(done, ms);
      const finish = () => { clearTimeout(t); done(); };
      const gl = base && base.getMaplibreMap && base.getMaplibreMap();
      if (gl) { if (gl.loaded && gl.loaded()) finish(); else gl.once("idle", finish); }
      else if (base && base.once) { if (base._loading === false) finish(); else base.once("load", finish); }
      else finish();
    });
  }

  /* ---------- open / close ---------- */
  function render(fit) { renderChips(); renderPanel(); draw(fit); }

  let openGen = 0;
  async function openMap(opts = {}) {
    if (dlg.open && !dlg.classList.contains("tm-closing")) return;
    const gen = ++openGen, live = () => gen === openGen && dlg.open;
    dlg.classList.remove("tm-closing");
    if (dlg.open) dlg.close();
    rebuild();
    let restore = !!opts.restore;
    if (!restore) {
      const s = app.state, today = MODEL.tripDayIndex(app.days, now());
      const day = opts.day != null ? opts.day : (s.day >= 0 && s.day < model.length ? s.day : today >= 0 ? today : -1);
      const atStop = s.mode === "stop" && s.day === day && s.stop >= 0 ? {day, k: s.stop} : null;
      const last = state.last;
      // Reopening soon after on the same day keeps the view and selection where they were.
      if (last && last.day === day && state.view && Date.now() - last.at < 15 * 60e3 && (!atStop || (last.sel && last.sel.k === atStop.k))) {
        state.day = day;
        state.sel = last.sel;
        restore = true;
      } else {
        state.day = day;
        state.sel = atStop;
        state.view = null;
        setSize("peek");
        stopDiscover();
      }
      opener = opts.opener || document.activeElement;
    } else if (state.day >= model.length) state.day = -1;
    document.querySelectorAll("dialog[open]").forEach(d => d.close());
    closeLayers();
    syncLayerInputs();
    dlg.showModal();
    pause3d();
    // showModal() focuses the first control (the search field); start on the map so keys and shortcuts work.
    (PHONE ? dlg.querySelector(".tmap") : mapEl).focus({preventScroll: true});
    renderChips();
    renderPanel(restore ? 0 : "fade");
    const first = !map;
    if (first) {
      // Building the map is the heaviest step, so let the open animation play first, then fade the map in.
      mapEl.classList.add("tm-veil");
      if (!RM()) await new Promise(r => setTimeout(r, 300));
      if (!live()) return;
    }
    const m = await ensureMap();
    if (!live()) return;
    if (!m) { mapEl.classList.remove("tm-veil"); return; }
    setTiles();
    // Layout is synchronous after showModal(), so draw now rather than waiting on a frame (paused in background tabs).
    map.invalidateSize();
    if (first) {
      if (!restore || !state.view) fitTo(currentBounds());
      await baseReady();
      if (!live()) return;
      unfoldNext = true;
      mapEl.classList.remove("tm-veil");
      draw(false);
      if (state.sel) select(state.sel.day, state.sel.k, {pan: true, popup: !PHONE});
      return;
    }
    if (restore && state.view) {
      map.setView(state.view.c, state.view.z, {animate: false});
      draw(false);
      highlight(state.sel?.day, state.sel?.k);
      if (disc.on) { if (!radarCircle && disc.center) { startRadar(disc.center, model[disc.anchor.day].color); if (!disc.loading) radarDone(); } paintDiscMarks(); }
    }
    else {
      unfoldNext = true;
      draw(true);
      if (state.sel) select(state.sel.day, state.sel.k, {pan: true, popup: !PHONE});
    }
  }

  function closeMap() {
    if (!dlg.open || dlg.classList.contains("tm-closing")) return;
    if (map) state.view = {c: map.getCenter(), z: map.getZoom()};
    // The 3D world keeps resting during the short fade (it shows its last frame); the close handler wakes it,
    // so the fade's timer isn't starved by the frame loop restarting.
    if (RM()) { dlg.close(); return; }
    dlg.classList.add("tm-closing");
    setTimeout(() => { if (!dlg.classList.contains("tm-closing")) return; dlg.classList.remove("tm-closing"); if (dlg.open) dlg.close(); }, 190);
  }
  dlg.addEventListener("close", () => {
    // A close event queued before a quick reopen must not reset the reopened map.
    if (dlg.open) return;
    resume3d();
    mapEl.classList.remove("tm-veil");
    dlg.classList.remove("tm-closing");
    stopTour();
    hideDriver(true);
    exitSearch();
    state.last = {day: state.day, sel: state.sel, at: Date.now()};
    closeLayers();
    clearDrag();
    map?.closePopup();
    if (map) state.view = {c: map.getCenter(), z: map.getZoom()};
    if (!state.returnAfterComposer && opener && document.contains(opener) && !document.querySelector("dialog[open]")) opener.focus?.({preventScroll: true});
  });

  app.on?.("choice", () => { if (dlg.open) { rebuild(); render(false); } });
  app.on?.("theme", () => { if (map && dlg.open) setTiles(); });
  addEventListener("storage", e => { if (e.key === "sbtrip-props-v1" && dlg.open) { rebuild(); render(false); } });
  addEventListener("resize", () => { if (map && dlg.open) map.invalidateSize(); });

  /* ---------- entry points ---------- */
  {
    const top = document.createElement("button");
    top.type = "button";
    top.className = "ibtn tm-open";
    top.id = "btn-map";
    top.title = "Trip map";
    top.setAttribute("aria-label", "Open the trip map");
    top.setAttribute("aria-haspopup", "dialog");
    top.setAttribute("aria-controls", "tripmap");
    top.innerHTML = IC.map;
    top.onclick = () => openMap({opener: top});
    warmOn(top);
    const after = byId("comfort-search");
    if (after) after.after(top); else document.querySelector(".top .tools")?.prepend(top);

    const menuRow = document.createElement("button");
    menuRow.className = "mi";
    menuRow.id = "btn-map-menu";
    menuRow.innerHTML = `<span class="ic">${IC.map}</span><span><b>Trip map</b><small>Every day on a map: route, walk or taxi, ideas nearby</small></span><span class="st">↗</span>`;
    menuRow.onclick = () => { byId("moredlg")?.close(); openMap({opener: byId("btn-more")}); };
    warmOn(menuRow);
    byId("btn-place-search")?.before(menuRow);

    const overview = byId("trip-overview");
    const actions = overview?.querySelector(".comfort-actions");
    if (actions) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "comfort-map";
      card.innerHTML = `${IC.map}<span><b>See it on the map</b><small>Routes, walk or taxi times, other options and ideas nearby</small></span>`;
      card.onclick = () => { overview.close(); openMap({opener: document.querySelector(".comfort-trip")}); };
      warmOn(card);
      actions.after(card);
    }

    const daycard = byId("daycard");
    const addDayButton = () => {
      const row = daycard?.querySelector(".k");
      if (!row || row.querySelector(".tm-daymap")) return;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tm-daymap";
      b.innerHTML = `${IC.map}<span>Map</span>`;
      b.setAttribute("aria-label", "See this day on the map");
      b.onclick = e => { e.stopPropagation(); openMap({day: app.state.day >= 0 ? app.state.day : -1, opener: b}); };
      warmOn(b);
      row.append(b);
    };
    if (daycard) { new MutationObserver(addDayButton).observe(daycard, {childList: true}); addDayButton(); }
  }

  app.openMap = (day, k) => openMap({day: day != null ? day : undefined}).then(() => { if (day != null && k != null && k >= 0) select(day, k); });
})();
