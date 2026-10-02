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

  const MODEL = {DAY_COLORS, dayColor, validLL, distKm, fareText, legBetween, buildDay, alternativesOf,
    plannedIdeaIds, nearestStop, nearbyIdeas, openProposals, proposalDays, placeUrl, legUrl, dayRouteUrl,
    toMin, fmtMin, needMin, schedule, seoulNow, tripDayIndex, nextUp, kakaoTo, kakaoRoute};
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
.tm-pin{width:30px;height:30px;border-radius:50% 50% 50% 4px;transform:rotate(-45deg);background:var(--dc);border:2px solid #fff;box-shadow:0 4px 10px -2px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;transition:transform .2s}
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
.tm-driver .tm-btn{background:#f1efe8;color:#111;border-color:#e2dfd4}
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
@media (prefers-reduced-motion:reduce){
  .tm-panel,.tm-pin{transition:none}
  #tripmap .tmap,#tripmap::backdrop,.tm-pbody,.tm-driver,.tm-caption{animation:none!important}
  .tm-pulse{animation:none}
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
    try { return Object.assign({route: true, alts: true, ideas: true, props: true, others: true, sat: false}, JSON.parse(localStorage.getItem(PREFS_KEY) || "{}")); }
    catch (e) { return {route: true, alts: true, ideas: true, props: true, others: true, sat: false}; }
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
  function renderChips() {
    const todayIdx = MODEL.tripDayIndex(app.days, now());
    const chips = [`<button type="button" class="tm-chip" data-act="day" data-day="-1" aria-pressed="${state.day === -1}" style="--dc:var(--ink)"><b>All days</b><small>${app.days.length} days</small></button>`];
    model.forEach(dm => chips.push(`<button type="button" class="tm-chip" data-act="day" data-day="${dm.index}" aria-pressed="${state.day === dm.index}" style="--dc:${dm.color}">` +
      `<b><i></i>Day ${dm.index + 1}</b><small>${dm.index === todayIdx ? "Today" : esc(dateShort(dm.date))} · ${esc(dm.city)}</small></button>`));
    daysEl.innerHTML = chips.join("");
    daysEl.querySelector('[aria-pressed="true"]')?.scrollIntoView({block: "nearest", inline: "center"});
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
          <button type="button" class="tm-btn" data-act="add" data-day="${dm.index}">${IC.plus} Add a place</button>
          <button type="button" class="tm-btn" data-act="go" data-day="${dm.index}" data-k="-1">${IC.play} Open day</button>
        </div>
      </header>
      ${st.longLegs ? `<p class="tm-warn">⚠ ${st.longLegs} long hop${st.longLegs > 1 ? "s" : ""} today (over 30 min). A nearer swap or a different order may give you more time at the stops.</p>` : ""}
      ${tight ? `<p class="tm-warn">⏱ ${tight} tight connection${tight > 1 ? "s" : ""}: there isn't enough time at ${tight > 1 ? "those stops" : "that stop"} to get to the next one on time. Moving a time or swapping a stop fixes it.</p>` : ""}
      <ol class="tm-list" id="tm-list">${rows.join("")}</ol>
      ${ideasHtml}
      ${proposalsHtml(props)}
      <p class="tm-help">${PHONE ? "Tap a pin or a stop for its actions. Long-press anywhere on the map to suggest that spot." : "Click a pin or a stop for its actions. Drag a stop (⠿) onto another stop or a day chip to suggest a move. Right-click the map to suggest any spot. Keys: [ and ] change the day, A shows all days, / searches, P plays the day, F fits the map."} Suggestions go to the other phone first, and nothing changes until you both agree.</p>`;
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
    mapEl.innerHTML = '<div class="tm-mapmsg">Loading the map…</div>';
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
    map.on("contextmenu", e => pinPopup(e.latlng));
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

  function draw(fit) {
    if (!map) return;
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
    if (fit) fitTo(bounds, fit === "fly");
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
    const from = state.day;
    state.day = day;
    state.sel = null;
    panel.scrollTop = 0;
    renderChips();
    renderPanel(from === day ? 0 : dir || "fade");
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
  function showDriver(day, k) {
    const s = model[day] && model[day].stops[k];
    if (!s || !s.place.ko) return;
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
    driverEl.querySelector('[data-act="driver-close"]').focus({preventScroll: true});
  }
  function hideDriver(silent) {
    if (driverEl.hidden) return;
    driverEl.hidden = true;
    driverEl.innerHTML = "";
    if (!silent && driverReturn && document.contains(driverReturn)) driverReturn.focus({preventScroll: true});
  }

  /* ---------- quick search: stops, other options, ideas, hotels ---------- */
  const tmapEl = dlg.querySelector(".tmap"), qEl = byId("tm-q"), resEl = byId("tm-results");
  const fold = v => String(v || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
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
    if (!q) { resEl.hidden = true; qEl.setAttribute("aria-expanded", "false"); results = []; return; }
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
    qEl.value = "";
    results = [];
    if (tmapEl.classList.contains("searching")) { tmapEl.classList.remove("searching"); if (dlg.open) byId("tm-sbtn").focus({preventScroll: true}); }
  }
  function choose(r) {
    if (!r) return;
    exitSearch();
    // Keep focus inside the dialog (on the map) so the shortcuts and arrow keys keep working.
    if (document.activeElement === qEl || !dlg.contains(document.activeElement)) (PHONE ? tmapEl : mapEl).focus({preventScroll: true});
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

  /* ---------- open / close ---------- */
  function render(fit) { renderChips(); renderPanel(); draw(fit); }

  async function openMap(opts = {}) {
    if (dlg.open && !dlg.classList.contains("tm-closing")) return;
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
      }
      opener = opts.opener || document.activeElement;
    } else if (state.day >= model.length) state.day = -1;
    document.querySelectorAll("dialog[open]").forEach(d => d.close());
    closeLayers();
    syncLayerInputs();
    dlg.showModal();
    // showModal() focuses the first control (the search field); start on the map so keys and shortcuts work.
    (PHONE ? dlg.querySelector(".tmap") : mapEl).focus({preventScroll: true});
    renderChips();
    renderPanel();
    const m = await ensureMap();
    if (!m || !dlg.open) return;
    setTiles();
    // Layout is synchronous after showModal(), so draw now rather than waiting on a frame (paused in background tabs).
    map.invalidateSize();
    if (restore && state.view) { map.setView(state.view.c, state.view.z, {animate: false}); draw(false); highlight(state.sel?.day, state.sel?.k); }
    else {
      draw(true);
      if (state.sel) select(state.sel.day, state.sel.k, {pan: true, popup: !PHONE});
    }
  }

  function closeMap() {
    if (!dlg.open || dlg.classList.contains("tm-closing")) return;
    if (map) state.view = {c: map.getCenter(), z: map.getZoom()};
    if (RM()) { dlg.close(); return; }
    dlg.classList.add("tm-closing");
    setTimeout(() => { if (!dlg.classList.contains("tm-closing")) return; dlg.classList.remove("tm-closing"); if (dlg.open) dlg.close(); }, 190);
  }
  dlg.addEventListener("close", () => {
    // A close event queued before a quick reopen must not reset the reopened map.
    if (dlg.open) return;
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
