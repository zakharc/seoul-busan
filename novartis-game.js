/* Chronicles of Novartis — a tiny satirical runner hidden in the trip app.
   Self-contained: injects its own styles, a full-screen game dialog, a "More" menu entry
   and an occasional invite. Only reads the app's localStorage keys (names, role, sound). */
(() => {
  "use strict";
  // the app strips ?as=/?fb= (and everything else but ?trip=) from the address bar before deferred scripts run
  const navUrl = (performance.getEntriesByType && performance.getEntriesByType("navigation")[0] || {}).name || location.href;
  const qs = new URLSearchParams(location.search + "&" + (new URL(navUrl, location.href).search.slice(1)));
  if (qs.has("visual-preview") || window.__novartisGame) return;
  window.__novartisGame = true;

  const KEY = { sound: "sbtrip-novartis-sound-v1", best: "sbtrip-novartis-best-v1", invite: "sbtrip-novartis-invite-v1", played: "sbtrip-novartis-played-v1" };
  const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? d : v; } catch (e) { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } };
  const names = () => Object.assign({ me: "Mykola", her: "Киця" }, read("sbtrip-names-v1", {}));
  const touchFirst = () => matchMedia("(pointer: coarse)").matches;
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const smooth = (a, b, v) => { const k = clamp((v - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
  const hash = i => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  /* the figurine's palette (same values as the 3D couple in index.html) */
  const P = { skin: "#f4dcc8", skinB: "#e7c6ae", dress: "#d8a7a7", dressB: "#c18d8f", hair: "#2b1f1d", eye: "#3b2a22",
    blush: "rgba(238,164,164,.8)", lip: "#c9646f", shoe: "#7a4b55", belt: "#b98b5e", collar: "#fafbff", gold: "#d59a17",
    lanyard: "#3b62d8", manTop: "#4a5370", manTopB: "#3c4460", manLegs: "#2f3650", hairM: "#8a6744", eyeM: "#4d6a48" };

  /* ---------- styles ---------- */
  const css = `
dialog#nvx-game{background:#cfe9f7;color:#111628;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
dialog#nvx-game[open]{animation:nvx-open .45s var(--ease,cubic-bezier(.2,.8,.2,1))}
dialog#nvx-game::backdrop{background:rgba(15,19,32,.55)}
@keyframes nvx-open{from{opacity:0;transform:scale(1.04)}to{opacity:1;transform:none}}
#nvx-game canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
#nvx-game .nvx-hud{position:absolute;left:0;right:0;top:0;padding:calc(env(safe-area-inset-top,0px) + 10px) 12px 0;display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;pointer-events:none;font-family:var(--body,system-ui)}
#nvx-game .nvx-pill{pointer-events:auto;display:flex;align-items:center;gap:6px;height:38px;padding:0 12px;border-radius:999px;background:rgba(255,255,255,.78);backdrop-filter:blur(14px) saturate(1.4);-webkit-backdrop-filter:blur(14px) saturate(1.4);box-shadow:0 4px 16px rgba(17,22,40,.12);font:700 14px var(--display,system-ui);white-space:nowrap}
#nvx-game .nvx-lives{letter-spacing:1px;font-size:15px}
#nvx-game .nvx-lives i{font-style:normal;transition:transform .3s,opacity .3s}
#nvx-game .nvx-lives i.off{opacity:.22;filter:grayscale(1)}
#nvx-game .nvx-route{justify-self:center;width:min(440px,100%);display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;font:700 11px var(--body,system-ui);color:#3b4260;text-shadow:0 1px 0 rgba(255,255,255,.7)}
#nvx-game .nvx-track{grid-column:2;position:relative;height:8px;border-radius:99px;background:rgba(255,255,255,.7);box-shadow:inset 0 1px 2px rgba(17,22,40,.15)}
#nvx-game .nvx-fill{position:absolute;left:0;top:0;bottom:0;border-radius:99px;background:linear-gradient(90deg,#e8557a,#d59a17)}
#nvx-game .nvx-me{position:absolute;top:50%;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:#2b1f1d;border:2px solid #fff;box-shadow:0 2px 6px rgba(17,22,40,.25);display:grid;place-items:center;font-size:11px}
#nvx-game .nvx-right{display:flex;gap:8px;align-items:center}
#nvx-game .nvx-ib{pointer-events:auto;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.78);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:0 4px 16px rgba(17,22,40,.12);color:#111628;border:0;cursor:pointer}
#nvx-game .nvx-ib svg{width:16px;height:16px}
#nvx-game .nvx-fx{grid-column:1/-1;display:flex;gap:6px;justify-content:center;min-height:30px}
#nvx-game .nvx-chip{display:flex;align-items:center;gap:6px;height:28px;padding:0 10px 0 8px;border-radius:999px;background:rgba(255,255,255,.85);font:700 12px var(--body,system-ui);box-shadow:0 3px 10px rgba(17,22,40,.12);animation:nvx-chip .4s cubic-bezier(.34,1.56,.64,1)}
#nvx-game .nvx-chip b{display:block;width:34px;height:4px;border-radius:9px;background:rgba(17,22,40,.1);overflow:hidden}
#nvx-game .nvx-chip b i{display:block;height:100%;background:var(--k,#e8557a)}
@keyframes nvx-chip{from{transform:scale(.6);opacity:0}to{transform:none;opacity:1}}
#nvx-game .nvx-quip{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 22px);max-width:min(88vw,520px);transform:translate(-50%,-8px);opacity:0;padding:10px 16px;border-radius:16px;background:rgba(17,22,40,.86);color:#fff;font:600 14px/1.35 var(--body,system-ui);text-align:center;pointer-events:none;box-shadow:0 10px 30px rgba(17,22,40,.25)}
#nvx-game .nvx-quip.show{animation:nvx-quip 2.6s var(--ease,ease) forwards}
#nvx-game .nvx-quip.good{background:linear-gradient(135deg,#e8557a,#d59a17)}
@keyframes nvx-quip{0%{opacity:0;transform:translate(-50%,-8px) scale(.94)}10%,78%{opacity:1;transform:translate(-50%,0) scale(1)}100%{opacity:0;transform:translate(-50%,-6px)}}
#nvx-game .nvx-card{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(460px,calc(100vw - 28px));max-height:calc(100dvh - 120px);overflow:auto;padding:22px 22px 18px;border-radius:26px;background:rgba(255,255,255,.9);backdrop-filter:blur(22px) saturate(1.5);-webkit-backdrop-filter:blur(22px) saturate(1.5);box-shadow:0 24px 70px rgba(17,22,40,.28);font-family:var(--body,system-ui);text-align:center;touch-action:auto}
#nvx-game .nvx-card[hidden]{display:none}
#nvx-game .nvx-card.in{animation:nvx-card .55s cubic-bezier(.34,1.56,.64,1)}
@keyframes nvx-card{from{opacity:0;transform:translate(-50%,-44%) scale(.94)}to{opacity:1;transform:translate(-50%,-50%)}}
#nvx-game .nvx-eyebrow{margin:0 0 6px;font:800 11px var(--body,system-ui);letter-spacing:.14em;text-transform:uppercase;color:#e8557a}
#nvx-game h2{margin:0;font:800 clamp(24px,6vw,32px)/1.05 var(--display,system-ui);letter-spacing:-.02em;background:linear-gradient(100deg,#111628 20%,#e8557a 50%,#111628 80%);background-size:250% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:nvx-shine 5s linear infinite}
@keyframes nvx-shine{from{background-position:100% 0}to{background-position:-150% 0}}
#nvx-game .nvx-sub{margin:10px auto 0;max-width:380px;color:#4b5270;font-size:14px;line-height:1.45}
#nvx-game .nvx-legend{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0 4px;text-align:left}
#nvx-game .nvx-legend h3{margin:0 0 6px;font:800 11px var(--body,system-ui);letter-spacing:.12em;text-transform:uppercase;color:#6b7392}
#nvx-game .nvx-legend ul{list-style:none;margin:0;padding:10px;border-radius:16px;background:#f3f4f8;display:grid;gap:7px}
#nvx-game .nvx-legend li{display:grid;grid-template-columns:22px 1fr;gap:6px;font-size:12.5px;line-height:1.25;color:#2a3048}
#nvx-game .nvx-legend li small{display:block;color:#6b7392;font-size:11px}
#nvx-game .nvx-keys{margin:12px 0 0;font:600 12.5px var(--body,system-ui);color:#6b7392}
#nvx-game kbd{display:inline-block;padding:1px 7px;border-radius:6px;background:#fff;border:1px solid rgba(17,22,40,.15);border-bottom-width:2px;font:700 11px var(--body,system-ui);color:#111628}
#nvx-game .nvx-stats{display:flex;justify-content:center;gap:8px;margin:16px 0 2px;flex-wrap:wrap}
#nvx-game .nvx-stats span{padding:8px 12px;border-radius:14px;background:#f3f4f8;font:600 12px var(--body,system-ui);color:#6b7392}
#nvx-game .nvx-stats b{display:block;font:800 18px var(--display,system-ui);color:#111628}
#nvx-game .nvx-actions{display:flex;gap:10px;justify-content:center;margin-top:16px;flex-wrap:wrap}
.nvx-btn{appearance:none;border:0;cursor:pointer;height:46px;padding:0 20px;border-radius:999px;font:700 15px var(--display,system-ui);display:inline-flex;align-items:center;gap:8px;transition:transform .15s}
.nvx-btn:active{transform:scale(.96)}
.nvx-btn.go{color:#fff;background:linear-gradient(135deg,#e8557a,#f2a25c);box-shadow:0 8px 22px rgba(232,85,122,.35)}
.nvx-btn.ghost{color:var(--ink,#111628);background:var(--soft,#f0f2f8)}
#nvx-game .nvx-btn.ghost{color:#111628;background:#eef0f6}
.nvx-btn:focus-visible,#nvx-game .nvx-ib:focus-visible{outline:3px solid rgba(232,85,122,.5);outline-offset:2px}
@media (max-width:600px){
  #nvx-game .nvx-legend{grid-template-columns:1fr}
  #nvx-game .nvx-route span{display:none}
  #nvx-game .nvx-card{padding:18px 16px 14px}
  #nvx-game .nvx-hud{grid-template-columns:minmax(0,1fr) repeat(3,44px);row-gap:6px}
  #nvx-game .nvx-right{display:contents}
  #nvx-game .nvx-lives{grid-column:1;grid-row:1;justify-self:start;gap:4px;letter-spacing:0;padding-inline:10px}
  #nvx-game .nvx-right .nvx-ib{grid-row:1}
  #nvx-game .nvx-snd{grid-column:2}
  #nvx-game .nvx-right [data-a="pause"]{grid-column:3}
  #nvx-game .nvx-right [data-a="close"]{grid-column:4}
  #nvx-game .nvx-score{grid-column:1;grid-row:2;justify-self:start}
  #nvx-game .nvx-route{grid-column:2/-1;grid-row:2;width:100%;padding:0 4px}
}
@media (max-height:520px){ #nvx-game .nvx-legend,#nvx-game .nvx-levels{display:none} #nvx-game .nvx-quip{bottom:10px} #nvx-game .nvx-note{top:58px} }

#nvx-game .nvx-route{position:relative}
#nvx-game .nvx-track u{position:absolute;top:-2px;bottom:-2px;width:2px;margin-left:-1px;background:rgba(255,255,255,.95);border-radius:2px;box-shadow:0 0 0 1px rgba(17,22,40,.08)}
#nvx-game .nvx-lvlname{grid-column:1/-1;text-align:center;font:800 10.5px var(--body,system-ui);font-style:normal;letter-spacing:.08em;text-transform:uppercase;color:#2a3048;text-shadow:0 1px 0 rgba(255,255,255,.8);margin-top:-2px}
#nvx-game .nvx-lives i.gain{display:inline-block;animation:nvx-pop .5s cubic-bezier(.34,1.8,.64,1)}
#nvx-game .nvx-lives i.lost{display:inline-block;animation:nvx-lost .7s ease-in}
@keyframes nvx-pop{0%{transform:scale(1.7)}100%{transform:none}}
@keyframes nvx-lost{0%{transform:scale(1.4) rotate(0)}30%{transform:translateX(-3px) rotate(-14deg)}60%{transform:translateX(3px) rotate(10deg)}100%{transform:none}}
#nvx-game .nvx-score.bump{animation:nvx-pop .35s cubic-bezier(.34,1.8,.64,1)}
#nvx-game .nvx-fx{align-items:center}
#nvx-game .nvx-chips{display:flex;gap:6px}
#nvx-game .nvx-combo{display:flex;align-items:center;height:28px;padding:0 11px;border-radius:999px;background:linear-gradient(135deg,#ff7a45,#e8557a);color:#fff;font:900 12.5px var(--display,system-ui);box-shadow:0 4px 14px rgba(232,85,122,.35);white-space:nowrap}
#nvx-game .nvx-combo[hidden]{display:none}
#nvx-game .nvx-combo.pop{animation:nvx-pop .45s cubic-bezier(.34,1.8,.64,1)}
#nvx-game .nvx-level{position:absolute;left:0;right:0;top:34%;display:grid;place-items:center;pointer-events:none;overflow:hidden;padding:20px 0}
#nvx-game .nvx-level .rib{position:relative;width:min(560px,84vw);min-width:0;padding:12px 24px 14px;border-radius:8px;text-align:center;color:#fff;background:linear-gradient(100deg,#e8557a,var(--a,#4f5fe6) 72%);box-shadow:0 18px 50px rgba(17,22,40,.3);transform:skewX(-10deg) translateX(-130vw);overflow:hidden;overflow-wrap:anywhere}
#nvx-game .nvx-level .rib::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(-45deg,rgba(255,255,255,.14) 0 12px,transparent 12px 24px);animation:nvx-stripes 1s linear infinite}
#nvx-game .nvx-level .rib>*{position:relative;display:block;transform:skewX(10deg);text-shadow:0 2px 0 rgba(17,22,40,.25)}
#nvx-game .nvx-level small{font:900 11px var(--body,system-ui);letter-spacing:.24em;text-transform:uppercase;opacity:.92}
#nvx-game .nvx-level b{font:900 clamp(24px,6.2vw,42px)/1.05 var(--display,system-ui);letter-spacing:-.01em;margin:2px 0 4px}
#nvx-game .nvx-level span{font:700 13px/1.3 var(--body,system-ui);opacity:.95}
#nvx-game .nvx-level.show .rib{animation:nvx-rib 3.2s cubic-bezier(.2,.9,.2,1) forwards}
@keyframes nvx-rib{0%{transform:skewX(-10deg) translateX(-130vw)}13%{transform:skewX(-10deg) translateX(4vw)}19%,80%{transform:skewX(-10deg) translateX(0)}100%{transform:skewX(-10deg) translateX(130vw)}}
@keyframes nvx-stripes{to{background-position:34px 0}}
#nvx-game .nvx-note{position:absolute;left:50%;top:calc(env(safe-area-inset-top,0px) + 104px);width:min(380px,calc(100vw - 24px));display:grid;grid-template-columns:40px 1fr;gap:10px;align-items:center;padding:10px 12px;border-radius:18px;background:rgba(255,255,255,.9);backdrop-filter:blur(18px) saturate(1.6);-webkit-backdrop-filter:blur(18px) saturate(1.6);box-shadow:0 14px 36px rgba(17,22,40,.24);transform:translate(-50%,-220%);opacity:0;pointer-events:none;font-family:var(--body,system-ui);color:#111628}
#nvx-game .nvx-note.show{animation:nvx-note 3.9s cubic-bezier(.34,1.35,.64,1) forwards}
@keyframes nvx-note{0%{transform:translate(-50%,-220%);opacity:0}11%,86%{transform:translate(-50%,0);opacity:1}100%{transform:translate(-50%,-220%);opacity:0}}
#nvx-game .nvx-note>i{width:40px;height:40px;border-radius:11px;display:grid;place-items:center;font-style:normal;font-size:21px;background:linear-gradient(135deg,#eef0f6,#fff);box-shadow:inset 0 0 0 1px rgba(17,22,40,.07)}
#nvx-game .nvx-note .h{display:flex;justify-content:space-between;font:800 10.5px var(--body,system-ui);color:#6b7392;text-transform:uppercase;letter-spacing:.06em}
#nvx-game .nvx-note b{display:block;font:800 13.5px/1.25 var(--display,system-ui)}
#nvx-game .nvx-note p{margin:1px 0 0;font:500 12.5px/1.35 var(--body,system-ui);color:#3b4260}
#nvx-game .nvx-levels{display:flex;gap:5px;justify-content:center;flex-wrap:wrap;margin:14px 0 0}
#nvx-game .nvx-levels span{display:flex;align-items:center;gap:5px;padding:4px 9px 4px 4px;border-radius:999px;background:linear-gradient(135deg,var(--a),color-mix(in srgb,var(--a) 68%,#111628));color:#fff;font:800 11px var(--body,system-ui);text-shadow:0 1px 1px rgba(17,22,40,.3);box-shadow:0 3px 8px rgba(17,22,40,.12)}
#nvx-game .nvx-levels b{display:grid;place-items:center;width:18px;height:18px;border-radius:50%;background:rgba(255,255,255,.9);color:#111628;font:900 10px var(--display,system-ui);text-shadow:none}
#nvx-game .nvx-stamp{position:absolute;right:16px;top:16px;padding:5px 11px;border:3px solid currentColor;border-radius:8px;font:900 15px var(--display,system-ui);font-style:normal;letter-spacing:.1em;opacity:0;transform:rotate(14deg);animation:nvx-stamp .5s .5s cubic-bezier(.2,1.6,.4,1) forwards}
#nvx-game .nvx-card:has(.nvx-stamp) .nvx-eyebrow{padding:0 88px}
#nvx-game .nvx-stamp.no{color:#d7263d}
#nvx-game .nvx-stamp.ok{color:#1f9a5a}
@keyframes nvx-stamp{from{opacity:0;transform:scale(2.6) rotate(-6deg)}to{opacity:.9;transform:rotate(14deg)}}
@media (max-width:600px){ #nvx-game .nvx-note{top:calc(env(safe-area-inset-top,0px) + 136px)} #nvx-game .nvx-card:has(.nvx-stamp) .nvx-eyebrow{padding:0;margin-top:30px} }
@keyframes nvx-ribfade{0%,100%{opacity:0;transform:skewX(-10deg)}10%,85%{opacity:1;transform:skewX(-10deg)}}
@keyframes nvx-notefade{0%,100%{opacity:0;transform:translate(-50%,0)}11%,86%{opacity:1;transform:translate(-50%,0)}}
@keyframes nvx-quipfade{0%,100%{opacity:0;transform:translate(-50%,0)}10%,78%{opacity:1;transform:translate(-50%,0)}}
/* These durations are reading time, not decorative motion; retain them over the app's reduced-motion reset. */
@media (prefers-reduced-motion: reduce){
  #nvx-game .nvx-level.show .rib{animation:nvx-ribfade 3.2s linear forwards;animation-duration:3.2s!important}
  #nvx-game .nvx-note.show{animation:nvx-notefade 3.9s linear forwards;animation-duration:3.9s!important}
  #nvx-game .nvx-quip.show{animation:nvx-quipfade 2.6s linear forwards;animation-duration:2.6s!important}
  #nvx-game .nvx-level .rib::before{animation:none}
}

.nvx-invite{position:fixed;z-index:80;left:12px;right:12px;bottom:calc(var(--bar-h,68px) + var(--sab,0px) + 12px);display:grid;grid-template-columns:92px 1fr;gap:12px 14px;align-items:center;padding:14px;border-radius:26px;background:color-mix(in srgb,var(--surface,#fff) 90%,transparent);backdrop-filter:blur(22px) saturate(1.5);-webkit-backdrop-filter:blur(22px) saturate(1.5);border:1px solid var(--line,rgba(17,22,40,.08));box-shadow:0 22px 60px rgba(17,22,40,.25);color:var(--ink,#111628);font-family:var(--body,system-ui);overflow:hidden;opacity:0;transform:translateY(calc(100% + 40px)) scale(.94)}
.nvx-invite.in{animation:nvx-inv-in .8s cubic-bezier(.34,1.56,.64,1) forwards}
.nvx-invite.out{animation:nvx-inv-out .38s ease-in forwards}
@keyframes nvx-inv-in{0%{opacity:0;transform:translateY(calc(100% + 40px)) scale(.94)}60%{opacity:1}100%{opacity:1;transform:none}}
@keyframes nvx-inv-out{from{opacity:1;transform:none}to{opacity:0;transform:translateY(30px) scale(.96)}}
.nvx-invite::before{content:"";position:absolute;inset:-1px;border-radius:inherit;padding:1.5px;background:conic-gradient(from var(--nvx-a,0deg),transparent 0 55%,#e8557a 70%,#d59a17 82%,transparent 95%);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:nvx-spin 3.2s linear infinite;pointer-events:none}
@property --nvx-a{syntax:"<angle>";inherits:false;initial-value:0deg}
@keyframes nvx-spin{to{--nvx-a:360deg}}
.nvx-inv-art{position:relative;width:92px;height:92px;border-radius:22px;overflow:visible;grid-row:span 2}
.nvx-inv-art canvas{width:92px;height:92px;border-radius:22px;display:block;box-shadow:inset 0 0 0 1px rgba(17,22,40,.06)}
.nvx-inv-art .orb{position:absolute;left:50%;top:50%;font-size:18px;line-height:1;margin:-9px 0 0 -9px;animation:nvx-orbit 6s linear infinite;animation-delay:calc(var(--i) * -1.5s);filter:drop-shadow(0 2px 3px rgba(17,22,40,.2))}
@keyframes nvx-orbit{from{transform:rotate(0deg) translateX(54px) rotate(0deg) scale(.9)}50%{transform:rotate(180deg) translateX(54px) rotate(-180deg) scale(1.1)}to{transform:rotate(360deg) translateX(54px) rotate(-360deg) scale(.9)}}
.nvx-inv-copy p{margin:0}
.nvx-inv-copy .nvx-eyebrow{font:800 10.5px var(--body,system-ui);letter-spacing:.14em;text-transform:uppercase;color:#e8557a;margin-bottom:3px}
.nvx-inv-copy h3{margin:0 0 4px;font:800 19px/1.1 var(--display,system-ui);letter-spacing:-.01em}
.nvx-inv-copy .t{font-size:13px;line-height:1.4;color:var(--muted,#6b7392)}
.nvx-inv-actions{grid-column:2;display:flex;gap:8px;justify-content:flex-end}
.nvx-inv-actions .nvx-btn{height:40px;padding:0 16px;font-size:14px}
.nvx-inv-x{position:absolute;top:8px;right:8px;width:30px;height:30px;border-radius:50%;border:0;background:transparent;color:var(--muted,#6b7392);cursor:pointer;display:grid;place-items:center}
.nvx-inv-x svg{width:14px;height:14px}
.nvx-inv-time{position:absolute;left:0;bottom:0;height:3px;width:100%;background:linear-gradient(90deg,#e8557a,#d59a17);transform-origin:left;animation:nvx-time var(--life,30s) linear forwards;opacity:.7}
@keyframes nvx-time{to{transform:scaleX(0)}}
@media (min-width:900px){ .nvx-invite{left:auto;right:24px;width:430px;bottom:calc(var(--bar-h,68px) + 36px)} }
@media (prefers-reduced-motion: reduce){ .nvx-invite.in{animation-duration:.01s} .nvx-inv-art .orb,.nvx-invite::before,#nvx-game h2{animation:none} }
`;
  const style = document.createElement("style");
  style.id = "nvx-style";
  style.textContent = css;
  document.head.appendChild(style);

  /* ---------- drawing helpers ---------- */
  function rr(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function heart(c, x, y, s) {
    c.beginPath(); c.moveTo(x, y + s * .35);
    c.bezierCurveTo(x - s * .9, y - s * .35, x - s * .45, y - s * 1.05, x, y - s * .5);
    c.bezierCurveTo(x + s * .45, y - s * 1.05, x + s * .9, y - s * .35, x, y + s * .35); c.closePath();
  }
  function limb(c, x, y, a1, l1, a2, l2, w1, w2, col1, col2) {
    const kx = x + Math.sin(a1) * l1, ky = y + Math.cos(a1) * l1;
    const ex = kx + Math.sin(a2) * l2, ey = ky + Math.cos(a2) * l2;
    c.lineCap = "round";
    c.strokeStyle = col2; c.lineWidth = w2; c.beginPath(); c.moveTo(kx, ky); c.lineTo(ex, ey); c.stroke();
    c.strokeStyle = col1; c.lineWidth = w1; c.beginPath(); c.moveTo(x, y); c.lineTo(kx, ky); c.stroke();
    return [ex, ey, a2];
  }
  function text(c, s, x, y, size, col, weight = 800, align = "center") {
    c.font = `${weight} ${size}px Outfit, Manrope, system-ui, sans-serif`; c.textAlign = align; c.textBaseline = "middle";
    c.fillStyle = col; c.fillText(s, x, y);
  }

  /* ---------- the figurine, in 2D: origin at the feet, facing right, ~118 units tall ----------
     mode: run | idle | air | hurt | fall | hug | wave */
  function drawHer(c, ph, mode, t, o) {
    const run = mode === "run", air = mode === "air", sw = run ? Math.sin(ph) : 0;
    const bob = run ? -Math.abs(Math.cos(ph)) * 3.2 : mode === "idle" || mode === "hug" ? Math.sin(t * 2.4) * .8 : 0;
    c.save(); c.translate(0, bob);
    if (mode === "fall") { c.translate(-6, 0); c.rotate(-.42); }
    if (mode === "hurt") c.rotate(-.16);
    // long straight hair down her back, streaming behind while she runs
    const flow = (o && o.flow != null ? o.flow : run ? 7 : air ? 10 : mode === "fall" ? 2 : 1.5) + (run ? Math.sin(ph * 2) * 2.5 : 0);
    const lift = o && o.lift != null ? o.lift : air ? -10 : run ? -2 : 0;
    c.fillStyle = P.hair; c.beginPath(); c.moveTo(-2, -117);
    c.bezierCurveTo(-24, -114, -27, -96, -24 - flow * .4, -80);
    c.bezierCurveTo(-23 - flow * .8, -70 + lift * .4, -22 - flow * 1.3, -60 + lift, -20 - flow * 1.6, -50 + lift);
    c.lineTo(-11 - flow * .8, -52 + lift * .6); c.bezierCurveTo(-8, -64, -6, -74, -4, -80); c.closePath(); c.fill();
    // back arm + back leg
    let aB = run ? .95 * sw : air ? 2.3 : mode === "fall" ? 2.6 : mode === "hug" ? 1.45 : mode === "wave" ? .2 : .12;
    limb(c, -1, -71, aB, 11, aB + (run ? 1.1 : air ? .3 : mode === "hug" ? .25 : .1), 11, 6.4, 5, P.dressB, P.skinB);
    const legs = (side) => {
      const phase = ph + (side ? 0 : Math.PI), s = Math.sin(phase);
      let a1, a2;
      if (run) { a1 = .78 * s; a2 = a1 - (.18 + .95 * Math.max(0, Math.cos(phase))); }
      else if (air) { a1 = side ? .95 : -.35; a2 = side ? -.15 : -1.35; }
      else if (mode === "fall") { a1 = side ? 1.3 : 1.1; a2 = side ? 1.2 : .9; }
      else { a1 = side ? .06 : -.06; a2 = a1; }
      const [fx, fy, fa] = limb(c, side ? 2 : -2, -34, a1, 17, a2, 17, 7.4, 6.6, side ? P.skin : P.skinB, side ? P.skin : P.skinB);
      c.save(); c.translate(fx, fy); c.rotate(-fa * .6); c.fillStyle = P.shoe; c.beginPath(); c.ellipse(3.2, 0, 6.2, 3.4, 0, 0, Math.PI * 2); c.fill(); c.restore();
    };
    legs(false); legs(true);
    // skirt
    const fl = run ? -2 - sw * 2.2 : air ? -3 : 0, wide = air ? 3 : run ? 1 : 0;
    c.fillStyle = P.dress; c.beginPath(); c.moveTo(-11.5, -58); c.lineTo(11.5, -58);
    c.quadraticCurveTo(16 + wide, -46, 19 + wide + fl, -31); c.quadraticCurveTo(0 + fl, -27.5, -19 - wide + fl, -31);
    c.quadraticCurveTo(-16 - wide, -46, -11.5, -58); c.fill();
    c.strokeStyle = P.dressB; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-19 - wide + fl, -31); c.quadraticCurveTo(fl, -27.5, 19 + wide + fl, -31); c.stroke();
    c.beginPath(); c.moveTo(-4, -56); c.lineTo(-7 + fl * .6, -33); c.moveTo(5, -56); c.lineTo(8 + fl * .6, -33); c.strokeStyle = "rgba(160,110,112,.35)"; c.stroke();
    // torso, belt, collar, neck
    c.fillStyle = P.dress; rr(c, -11, -77, 22, 21, 8); c.fill();
    c.fillStyle = P.belt; rr(c, -11.6, -59.5, 23.2, 3.2, 1.4); c.fill();
    c.fillStyle = P.skin; c.fillRect(-3, -80, 7, 5);
    c.fillStyle = P.collar; c.beginPath(); c.ellipse(1, -76, 7.5, 2.6, 0, 0, Math.PI * 2); c.fill();
    // QA badge on a lanyard — of course
    c.strokeStyle = P.lanyard; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-3.5, -75); c.lineTo(3, -66); c.lineTo(7, -75); c.stroke();
    c.save(); c.translate(3, -62); c.rotate(run ? sw * .25 : 0); c.fillStyle = "#fff"; rr(c, -3.6, -4, 7.2, 9, 1.5); c.fill();
    c.fillStyle = "#e8557a"; c.fillRect(-3.6, -4, 7.2, 2.4); text(c, "QA", 0, 1.6, 3.4, "#111628", 900); c.restore();
    // head
    c.fillStyle = P.skin; c.beginPath(); c.arc(3, -96, 21, 0, Math.PI * 2); c.fill();
    // face (three-quarter view to the right)
    const blink = (t % 3.4) < .12 && mode !== "fall";
    [[8, 0], [18, 1]].forEach(([ex], i) => {
      if (blink) { c.strokeStyle = P.eye; c.lineWidth = 1.3; c.beginPath(); c.moveTo(ex - 2.6, -94); c.lineTo(ex + 2.6, -94); c.stroke(); return; }
      if (mode === "fall" || mode === "hurt") { c.strokeStyle = P.eye; c.lineWidth = 1.4; c.beginPath(); c.moveTo(ex - 2.4, -96.5); c.lineTo(ex + 2.4, -92); c.moveTo(ex + 2.4, -96.5); c.lineTo(ex - 2.4, -92); c.stroke(); return; }
      c.fillStyle = P.eye; c.beginPath(); c.ellipse(ex, -94.5, 2.7 - i * .2, 3.5, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#fff"; c.beginPath(); c.arc(ex - .9, -95.8, 1, 0, Math.PI * 2); c.fill();
      c.strokeStyle = P.hair; c.lineWidth = 1; c.beginPath(); c.moveTo(ex + 2, -97.5); c.lineTo(ex + 3.6, -99.2); c.stroke();
    });
    c.strokeStyle = P.hair; c.lineWidth = 1.2; c.beginPath(); c.moveTo(5, -101.5); c.quadraticCurveTo(8, -103.5, 11, -102); c.moveTo(15.5, -102); c.quadraticCurveTo(18.5, -103.5, 21, -101.5); c.stroke();
    c.fillStyle = P.blush; c.beginPath(); c.ellipse(6, -88.5, 3.4, 1.9, 0, 0, Math.PI * 2); c.ellipse(20.5, -88.5, 2.6, 1.8, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = P.lip; c.lineWidth = 1.5; c.beginPath();
    if (mode === "fall" || mode === "hurt") { c.fillStyle = P.lip; c.ellipse(14, -84.5, 1.8, 2.2, 0, 0, Math.PI * 2); c.fill(); }
    else if (air || mode === "hug" || mode === "wave") { c.fillStyle = P.lip; c.arc(14, -86, 3, 0, Math.PI); c.fill(); }
    else { c.arc(14, -87.5, 3, .2 * Math.PI, .8 * Math.PI); c.stroke(); }
    // hair cap + side-parted fringe
    c.fillStyle = P.hair; c.beginPath(); c.moveTo(-17, -80);
    c.bezierCurveTo(-26, -100, -14, -120, 4, -119.5); c.bezierCurveTo(18, -119, 27, -109, 24.5, -97);
    c.bezierCurveTo(21, -104, 13, -107.5, 4, -104.5); c.bezierCurveTo(-2, -102, -6, -96, -8, -88);
    c.bezierCurveTo(-10, -84, -13, -80, -17, -80); c.fill();
    c.fillStyle = "rgba(255,255,255,.14)"; c.beginPath(); c.ellipse(-4, -112, 9, 3, -.35, 0, Math.PI * 2); c.fill();
    // ear + gold earring
    c.fillStyle = P.skin; c.beginPath(); c.ellipse(-7.5, -91, 2.6, 3.8, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = P.gold; c.beginPath(); c.arc(-7.5, -85.6, 1.7, 0, Math.PI * 2); c.fill();
    // front arm
    let aF = run ? -.95 * sw : air ? 2.65 : mode === "fall" ? 2.9 : mode === "hug" ? 1.6 : mode === "wave" ? 2.7 + Math.sin(t * 9) * .3 : -.12;
    const [hx, hy] = limb(c, 3, -71, aF, 11, aF + (run ? 1.15 : air ? .25 : mode === "hug" ? .2 : .1), 11, 6.6, 5.2, P.dress, P.skin);
    c.fillStyle = P.skin; c.beginPath(); c.arc(hx, hy, 3.1, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  /* Mykola, waiting in München: same proportions, facing left */
  function drawHim(c, t, mode) {
    c.save(); c.scale(-1.07, 1.07); const b = Math.sin(t * 2.2) * .8; c.translate(0, b);
    [-1, 1].forEach(s => {
      const [fx, fy] = limb(c, s * 3, -36, s * .05, 18, s * .05, 18, 8.4, 8, P.manLegs, P.manLegs);
      c.fillStyle = "#262a3a"; c.beginPath(); c.ellipse(fx + 3, fy, 6.6, 3.4, 0, 0, Math.PI * 2); c.fill();
    });
    const wave = mode === "wave" ? Math.sin(t * 8) * .35 : 0, open = mode === "hug" ? 1.55 : 2.5 + wave;
    limb(c, -2, -74, mode === "hug" ? 1.4 : .5, 12, mode === "hug" ? 1.6 : .9, 12, 7.4, 6, P.manTopB, P.skinB);
    c.fillStyle = P.manTop; rr(c, -13, -80, 26, 46, 10); c.fill();
    c.fillStyle = P.manLegs; c.fillRect(-13, -40, 26, 5);
    c.strokeStyle = "#3b4360"; c.lineWidth = 2; c.beginPath(); c.moveTo(-1, -78); c.lineTo(4, -62); c.moveTo(7, -78); c.lineTo(4, -62); c.stroke();
    c.fillStyle = P.skin; c.fillRect(-3, -84, 8, 6);
    c.beginPath(); c.arc(3, -100, 22, 0, Math.PI * 2); c.fill();
    [[8], [18.5]].forEach(([ex]) => { c.fillStyle = P.eyeM; c.beginPath(); c.ellipse(ex, -99, 2.4, 3, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = "#fff"; c.beginPath(); c.arc(ex - .8, -100, .9, 0, Math.PI * 2); c.fill(); });
    c.strokeStyle = "#6a4c30"; c.lineWidth = 1.8; c.beginPath(); c.moveTo(5, -105.5); c.lineTo(11, -105.5); c.moveTo(15.5, -105.5); c.lineTo(21, -105.5); c.stroke();
    c.strokeStyle = "#9a6358"; c.lineWidth = 1.6; c.beginPath(); c.arc(14, -92, 3.2, .15 * Math.PI, .85 * Math.PI); c.stroke();
    c.fillStyle = "rgba(238,164,164,.55)"; c.beginPath(); c.ellipse(6, -93, 3, 1.6, 0, 0, Math.PI * 2); c.ellipse(20.5, -93, 2.4, 1.5, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = P.hairM; c.beginPath(); c.moveTo(-18, -94); c.bezierCurveTo(-24, -116, -6, -127, 8, -124);
    c.bezierCurveTo(22, -122, 28, -112, 25, -103); c.bezierCurveTo(18, -110, 6, -112, -4, -108); c.bezierCurveTo(-8, -104, -11, -98, -12, -92); c.closePath(); c.fill();
    c.fillStyle = P.skin; c.beginPath(); c.ellipse(-8, -96, 2.8, 4, 0, 0, Math.PI * 2); c.fill();
    const [hx, hy] = limb(c, 4, -74, open, 12, open + (mode === "hug" ? .1 : .4), 12, 7.6, 6, P.manTop, P.skin);
    c.fillStyle = P.skin; c.beginPath(); c.arc(hx, hy, 3.3, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  /* ---------- obstacles: origin at the left of the ground footprint ---------- */
  const OBST = {
    esc: { w: 52, h: 60, min: 0, wt: 3.2, label: "Escalation!", vars: ["P1!", "URGENT", "CAPA", "AUDIT", "RE: RE:", "DEVIATION"],
      hit: ["Escalated to your manager's manager. Of course.", "“Can we hop on a quick call?” — 2 hours ago", "Reply-all storm. 47 people now CC'd.", "Root cause: Friday 16:55."],
      ok: ["Escalation dodged", "Deferred to next quarter", "Marked as read"] },
    paper: { w: 58, h: 94, min: .04, wt: 2.1, label: "Parents' legal paperwork", vars: ["Vollmacht", "Notar", "Form 27B", "Apostille", "Grundbuch"],
      hit: ["Please bring the original. And a copy. And a copy of the copy.", "The notary is open Tuesdays, 9:00–9:15.", "Wrong form. You need form 27B/6.", "Stamp missing. Start again."],
      ok: ["Paperwork filed", "Signed in triplicate", "Stamp acquired"] },
    friends: { w: 118, h: 64, min: .08, wt: 2, label: "Friends coming for the weekend", vars: [""],
      hit: ["Surprise! We're staying till Monday 🎉", "Who's cooking? …you are.", "They brought three more friends."],
      ok: ["Guests settled on the sofa", "Weekend survived"] },
    truck: { w: 184, h: 90, min: .16, wt: 1.35, label: "Truck waiting for QA sign-off", vars: ["4711", "0815", "1312", "2207"],
      hit: ["The driver has been waiting since 6:00.", "No signature — no release!", "Batch on hold. Driver honks politely."],
      ok: ["Batch released ✍️", "Truck signed off", "QA approved — off you go"] }
  };
  function drawObstacle(c, o, t) {
    const w = o.w;
    if (o.type === "esc") {
      for (let i = 0; i < 3; i++) { c.fillStyle = i % 2 ? "#eef1f8" : "#fff"; rr(c, 3 + (i % 2 ? 3 : 0), -12 - i * 7, w - 9, 12, 2); c.fill(); c.strokeStyle = "rgba(17,22,40,.12)"; c.lineWidth = 1; c.stroke(); }
      c.fillStyle = "#fff"; rr(c, 1, -46, w - 2, 32, 4); c.fill(); c.strokeStyle = "rgba(17,22,40,.15)"; c.stroke();
      c.fillStyle = "#e23b4e"; rr(c, 1, -46, w - 2, 10, 4); c.fill(); c.fillRect(1, -40, w - 2, 4);
      text(c, o.v, w / 2, -27, o.v.length > 6 ? 7.2 : 9, "#e23b4e", 900);
      c.fillStyle = "rgba(17,22,40,.18)"; c.fillRect(8, -20, w - 16, 1.6);
      const on = Math.floor(t * 5 + o.seed * 9) % 2 === 0;
      if (on) { const g = c.createRadialGradient(w / 2, -52, 2, w / 2, -52, 34); g.addColorStop(0, "rgba(255,70,90,.55)"); g.addColorStop(1, "rgba(255,70,90,0)"); c.fillStyle = g; c.fillRect(w / 2 - 34, -86, 68, 68); }
      c.fillStyle = "#2a2f45"; rr(c, w / 2 - 11, -51, 22, 6, 2); c.fill();
      c.fillStyle = on ? "#ff4b5c" : "#b8283a"; c.beginPath(); c.arc(w / 2, -51, 9.5, Math.PI, 0); c.fill();
      c.fillStyle = "rgba(255,255,255,.6)"; c.beginPath(); c.ellipse(w / 2 - 3, -56, 2.4, 3.4, -.4, 0, Math.PI * 2); c.fill();
    } else if (o.type === "paper") {
      const cols = ["#f2c14e", "#7fb3e6", "#f19a8f", "#b9d98a", "#fbfbfd", "#c9b4f0", "#f2c14e", "#7fb3e6", "#fbfbfd"];
      cols.forEach((col, i) => { const jx = (hash(i + o.seed * 10) - .5) * 7; c.fillStyle = col; rr(c, 3 + jx, -10 - i * 9, w - 6, 9.5, 2); c.fill(); c.strokeStyle = "rgba(17,22,40,.14)"; c.lineWidth = 1; c.stroke(); });
      c.save(); c.translate(w / 2 + 2, -46); c.rotate(-.08); c.fillStyle = "#fffbe0"; rr(c, -22, -8, 44, 16, 2); c.fill(); text(c, o.v, 0, 0, o.v.length > 8 ? 6.6 : 7.6, "#3b2a22", 800); c.restore();
      c.fillStyle = "#c7283b"; c.beginPath(); c.arc(w / 2, -88, 7, 0, Math.PI * 2); c.fill(); text(c, "§", w / 2, -87.5, 9, "#fff", 900);
      const fly = (t * 1.3 + o.seed) % 1; c.save(); c.globalAlpha = 1 - fly; c.translate(w / 2 + 14 + fly * 20, -96 - fly * 24); c.rotate(fly * 3); c.fillStyle = "#fff"; c.fillRect(-5, -6, 10, 12); c.restore();
    } else if (o.type === "friends") {
      const tops = ["#3fb3a9", "#f2a25c", "#8a7be0"], hairs = ["#6b4a33", "#e4c27a", "#2b1f1d"];
      c.fillStyle = "#e8557a"; rr(c, 10, -64, w - 20, 13, 3); c.fill(); text(c, "WEEKEND! 🎉", w / 2, -57.5, 8.5, "#fff", 900);
      [0, 1, 2].forEach(i => {
        const x = 20 + i * 39, j = Math.sin(t * 6 + i * 2) * 1.5;
        c.fillStyle = ["#5a6dd8", "#e8557a", "#2f9b8f"][i]; rr(c, x + 9, -22, 15, 20, 3); c.fill(); c.fillStyle = "rgba(0,0,0,.25)"; c.fillRect(x + 14, -26, 5, 4);
        c.fillStyle = "#2f3650"; c.fillRect(x - 4, -14, 3.5, 14); c.fillRect(x + 1.5, -14, 3.5, 14);
        c.fillStyle = tops[i]; rr(c, x - 6, -32 + j, 13, 19, 5); c.fill();
        c.fillStyle = P.skin; c.beginPath(); c.arc(x + .5, -39 + j, 8, 0, Math.PI * 2); c.fill();
        c.fillStyle = hairs[i]; c.beginPath(); c.arc(x + .5, -41 + j, 8.4, Math.PI * 1.05, Math.PI * 1.95); c.fill();
        c.fillStyle = "#2b1f1d"; c.beginPath(); c.arc(x - 2, -39 + j, 1.1, 0, Math.PI * 2); c.arc(x + 3, -39 + j, 1.1, 0, Math.PI * 2); c.fill();
        c.strokeStyle = "#c9646f"; c.lineWidth = 1.1; c.beginPath(); c.arc(x + .5, -36.5 + j, 2.2, .1 * Math.PI, .9 * Math.PI); c.stroke();
        c.strokeStyle = P.skin; c.lineWidth = 3; c.lineCap = "round"; c.beginPath(); c.moveTo(x - 5, -29 + j); c.lineTo(x - 10, -47 + Math.sin(t * 10 + i) * 4); c.stroke();
      });
    } else if (o.type === "truck") {
      c.fillStyle = "rgba(17,22,40,.12)"; c.beginPath(); c.ellipse(w / 2, 0, w / 2, 4, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#fbfcff"; rr(c, 0, -90, 132, 72, 5); c.fill(); c.strokeStyle = "rgba(17,22,40,.18)"; c.lineWidth = 1.2; c.stroke();
      c.fillStyle = "#3b62d8"; c.fillRect(0, -33, 132, 6);
      text(c, "BATCH #" + o.v, 66, -72, 12, "#111628", 900);
      text(c, "waiting for QA sign-off", 66, -58, 7.6, "#4b5270", 700);
      text(c, "since 06:00 ⏱", 66, -47, 7.2, "#e8557a", 800);
      c.fillStyle = "#3b62d8"; rr(c, 135, -70, 48, 54, 8); c.fill();
      c.fillStyle = "#cfe6ff"; rr(c, 158, -64, 20, 18, 4); c.fill();
      c.fillStyle = "#2a2f45"; c.fillRect(135, -20, 49, 6);
      c.fillStyle = "#ffd25a"; c.fillRect(180, -30, 4, 6);
      [22, 52, 160].forEach(x => { c.fillStyle = "#1d2133"; c.beginPath(); c.arc(x, -9, 9.5, 0, Math.PI * 2); c.fill(); c.fillStyle = "#9aa1b8"; c.beginPath(); c.arc(x, -9, 3.6, 0, Math.PI * 2); c.fill(); });
      const pop = .5 + .5 * Math.sin(t * 3 + o.seed * 5);
      c.save(); c.translate(150, -84 - pop * 3); c.fillStyle = "#fff"; rr(c, -24, -11, 50, 20, 8); c.fill(); c.beginPath(); c.moveTo(-2, 8); c.lineTo(6, 8); c.lineTo(4, 15); c.fill();
      text(c, "Sign pls? ✍️", 1, -1, 7.6, "#111628", 800); c.restore();
      for (let i = 0; i < 3; i++) { const k = (t * .8 + i / 3) % 1; c.fillStyle = `rgba(160,166,186,${.5 * (1 - k)})`; c.beginPath(); c.arc(140 - k * 18, -72 - k * 26, 3 + k * 6, 0, Math.PI * 2); c.fill(); }
    }
  }

  /* ---------- bonuses (centred) ---------- */
  const BONUS = {
    cake: { col: "255,214,140", label: "Homemade cheesecake", quip: "Homemade cheesecake: +1 ❤️ and morale fully restored", wt: 1.1 },
    massage: { col: "190,160,255", label: "Massage", quip: "Massage booked. The world slows down… shoulders unlocked 💆‍♀️", wt: 1 },
    yog: { col: "150,200,255", label: "Giant yoghurt", quip: "GIANT YOGHURT! Protein-powered QA — nothing can stop her 💪", wt: .9 },
    wine: { col: "240,120,160", label: "The wine box", quip: "Wine box opened 🍷 Problems look smaller · points ×2", wt: 1 }
  };
  function drawBonus(c, b, t) {
    if (b.type === "heart") { c.fillStyle = "#e8557a"; heart(c, 0, 2, 9); c.fill(); c.fillStyle = "rgba(255,255,255,.55)"; c.beginPath(); c.arc(-3, -2, 1.8, 0, Math.PI * 2); c.fill(); return; }
    const pulse = .75 + .25 * Math.sin(t * 5 + b.seed * 6), g = c.createRadialGradient(0, 0, 4, 0, 0, 34 * pulse);
    g.addColorStop(0, `rgba(${BONUS[b.type].col},.75)`); g.addColorStop(1, `rgba(${BONUS[b.type].col},0)`); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 36, 0, Math.PI * 2); c.fill();
    c.save(); c.rotate(Math.sin(t * 2.4 + b.seed) * .08);
    if (b.type === "cake") {
      c.fillStyle = "#c58b4b"; c.beginPath(); c.moveTo(-18, 10); c.lineTo(18, 10); c.lineTo(18, 5); c.lineTo(-18, 6.5); c.fill();
      c.fillStyle = "#fbe7bd"; c.beginPath(); c.moveTo(-18, 6.5); c.lineTo(18, 5); c.lineTo(18, -9); c.lineTo(-18, 0); c.fill();
      c.fillStyle = "#d8344f"; c.beginPath(); c.moveTo(-18, 0); c.lineTo(18, -9); c.lineTo(13, -14); c.lineTo(-21, -3); c.closePath(); c.fill();
      c.fillStyle = "#e23b4e"; c.beginPath(); c.arc(9, -15, 5, 0, Math.PI * 2); c.fill(); c.fillStyle = "#4caf50"; c.beginPath(); c.ellipse(9, -20, 3.4, 1.6, .3, 0, Math.PI * 2); c.fill();
      c.fillStyle = "rgba(255,255,255,.7)"; c.fillRect(-10, 2, 14, 1.5);
    } else if (b.type === "massage") {
      [["#7d8499", 0, 9, 17, 5.5], ["#9aa1b5", 1, 0, 13.5, 4.6], ["#b7bccc", -1, -8, 10, 4]].forEach(([col, x, y, rx, ry]) => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); });
      c.fillStyle = "#f19ac0"; [-.6, 0, .6].forEach(a => { c.save(); c.translate(0, -12); c.rotate(a); c.beginPath(); c.ellipse(0, -6, 3.2, 7, 0, 0, Math.PI * 2); c.fill(); c.restore(); });
      c.strokeStyle = "rgba(255,255,255,.85)"; c.lineWidth = 1.6; c.lineCap = "round";
      [-9, 9].forEach((x, i) => { const k = (t * .9 + i * .5) % 1; c.globalAlpha = 1 - k; c.beginPath(); c.moveTo(x, -16 - k * 10); c.quadraticCurveTo(x + 4, -21 - k * 10, x, -26 - k * 10); c.stroke(); }); c.globalAlpha = 1;
    } else if (b.type === "yog") {
      c.fillStyle = "#fff"; c.beginPath(); c.moveTo(-17, -15); c.lineTo(17, -15); c.lineTo(12.5, 19); c.lineTo(-12.5, 19); c.closePath(); c.fill(); c.strokeStyle = "rgba(17,22,40,.15)"; c.lineWidth = 1; c.stroke();
      c.fillStyle = "#4f8fe6"; c.beginPath(); c.moveTo(-15.6, -4); c.lineTo(15.6, -4); c.lineTo(14.2, 7); c.lineTo(-14.2, 7); c.fill();
      text(c, "XXL", 0, 1.6, 8.5, "#fff", 900);
      c.fillStyle = "#cfd5e3"; c.beginPath(); c.ellipse(0, -15, 17.5, 4, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#fdf8ee"; c.beginPath(); c.ellipse(0, -15.5, 15, 3, 0, 0, Math.PI * 2); c.fill();
      c.save(); c.translate(8, -18); c.rotate(.5); c.fillStyle = "#c9ced9"; rr(c, -1.6, -18, 3.2, 18, 1.6); c.fill(); c.beginPath(); c.ellipse(0, -19, 3.6, 5, 0, 0, Math.PI * 2); c.fill(); c.restore();
    } else if (b.type === "wine") {
      c.fillStyle = "#6e1a33"; c.beginPath(); c.moveTo(14, -12); c.lineTo(20, -17); c.lineTo(20, 9); c.lineTo(14, 14); c.fill();
      c.fillStyle = "#8c2442"; rr(c, -16, -12, 30, 26, 3); c.fill();
      c.fillStyle = "#a83357"; c.beginPath(); c.moveTo(-16, -12); c.lineTo(-10, -17); c.lineTo(20, -17); c.lineTo(14, -12); c.fill();
      c.fillStyle = "#3a0d1b"; rr(c, -4, -16, 12, 2.6, 1.3); c.fill();
      c.fillStyle = "#fff"; c.fillRect(-14, -1, 26, 7); text(c, "VINO", -1, 2.6, 6.4, "#8c2442", 900);
      c.fillStyle = "#b07ad8"; [[-8, -7], [-4, -7], [0, -7], [-6, -4], [-2, -4], [-4, -1.5]].forEach(([x, y]) => { c.beginPath(); c.arc(x + 3, y, 2.1, 0, Math.PI * 2); c.fill(); });
      c.fillStyle = "#1d2133"; c.fillRect(4, 14, 5, 4); c.fillRect(5.5, 18, 2, 3);
    }
    c.restore();
  }

  /* ---------- levels: each stretch of road has its own light, props, ambience, music and jokes ---------- */
  const LEVELS = [
    { at: 0, tag: "Level 1", name: "Monday in Innsbruck", sub: "Inbox: 214 unread · Coffee: not enough",
      sky: ["#4fa6ec", "#9fd3f4", "#eaf6fc"], far: "#a9bcd8", near: "#7f99bd", hill: "#93cf7a", hill2: "#64ad58", ground: "#86c072", path: "#efe3c6", sun: "#fff3c4",
      props: ["fir", "fir", "birch", "chalet"], amb: "snow", gag: "glider", weights: { esc: 3.4, paper: 1.4, friends: 1, truck: .5 } },
    { at: .2, tag: "Level 2", name: "Audit Week", sub: "The auditor would like to see the logbook. From 2019.",
      sky: ["#3f8fd0", "#94cbe6", "#e0f3f1"], far: "#9fb3cc", near: "#7189ab", hill: "#7fc28e", hill2: "#58a370", ground: "#78b879", path: "#e4ddcb", sun: "#f4fbff",
      props: ["tank", "fir", "pipe", "round"], amb: "motes", gag: "blimp", weights: { esc: 4.2, paper: 1.6, friends: .7, truck: 1.4 } },
    { at: .4, tag: "Level 3", name: "Kufstein Golden Hour", sub: "The truck is still waiting. The driver made friends with the forklift.",
      sky: ["#6a86dc", "#f2a988", "#ffdca6"], far: "#c3a3bd", near: "#9a7fa6", hill: "#bcc26a", hill2: "#94a24f", ground: "#a6bd62", path: "#f2dcb0", sun: "#ffcf73",
      props: ["autumn", "autumn", "fir", "round"], amb: "leaves", gag: "balloon", weights: { esc: 2, paper: 1.3, friends: 1.4, truck: 2.4 } },
    { at: .6, tag: "Level 4", name: "Bavarian Weekend", sub: "Friends arriving in 3… 2… 1… (they brought Kevin)",
      sky: ["#3796e8", "#9ad0f6", "#fbf1cf"], far: "#bfcbe0", near: "#9fb2d0", hill: "#b6d85e", hill2: "#8fbd45", ground: "#9fcd5b", path: "#f1e3bd", sun: "#fff6c8",
      props: ["cow", "maypole", "round", "sunflower", "chapel", "cow"], amb: "petals", gag: "plane", weights: { esc: 1.4, paper: 1.3, friends: 3.4, truck: 1 } },
    { at: .8, tag: "Final level", name: "München by Night", sub: "Mama called. Bring the Vollmacht. The ORIGINAL.", fade: .05,
      sky: ["#10163f", "#33296a", "#9c5389"], far: "#3a3b6a", near: "#2b2d58", hill: "#2c5658", hill2: "#22464a", ground: "#35624e", path: "#8a8198", sun: "#fff6d8", night: 1,
      props: ["lamp", "building", "lamp", "building", "round"], amb: "fireflies", gag: "banner", weights: { esc: 1.6, paper: 3.2, friends: 1.3, truck: 1.2 } }
  ];
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const PKEYS = ["far", "near", "hill", "hill2", "ground", "path", "sun"];
  LEVELS.forEach(L => { L.rgb = { sky: L.sky.map(hex) }; PKEYS.forEach(k => { L.rgb[k] = hex(L[k]); }); });
  const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const levelAt = p => { let i = 0; while (i < LEVELS.length - 1 && p >= LEVELS[i + 1].at) i++; return i; };
  function palette(p) {
    const o = { sky: LEVELS[0].rgb.sky.map(c => c.slice()), n: 0 };
    PKEYS.forEach(k => { o[k] = LEVELS[0].rgb[k].slice(); });
    for (let j = 1; j < LEVELS.length; j++) {
      const L = LEVELS[j], w = L.fade || .02, k = smooth(L.at - w, L.at + w, p); if (k <= 0) break;
      o.sky.forEach((c, i) => c.forEach((v, m) => { c[m] = lerp(v, L.rgb.sky[i][m], k); }));
      PKEYS.forEach(key => o[key].forEach((v, m) => { o[key][m] = lerp(v, L.rgb[key][m], k); }));
      o.n = lerp(o.n, L.night || 0, k);
    }
    return o;
  }

  /* ---------- scenery ---------- */
  const ridge = (x, s) => Math.sin(x * .0042 + s) * .5 + Math.sin(x * .0113 + s * 2.1) * .3 + Math.sin(x * .027 + s * .7) * .2;
  function sky(c, x0, y0, w, h, pal, t, VWv) {
    const g = c.createLinearGradient(0, y0, 0, y0 + h); g.addColorStop(0, rgb(pal.sky[0])); g.addColorStop(.55, rgb(pal.sky[1])); g.addColorStop(1, rgb(pal.sky[2]));
    c.fillStyle = g; c.fillRect(x0, y0, w, h);
    if (pal.n > .02) {
      for (let i = 0; i < 60; i++) { const x = hash(i * 3.1) * VWv, y = y0 + 20 + hash(i * 7.3) * (h * .55), tw = .5 + .5 * Math.sin(t * (1.5 + hash(i) * 3) + i), s = 1.6 + hash(i * 5) * 1.4;
        c.fillStyle = `rgba(255,255,240,${pal.n * (.35 + .65 * tw)})`; c.fillRect(x, y, s, s); }
    }
  }
  function sunMoon(c, VWv, p, pal, t) {
    const sx = VWv * .8, sy = lerp(62, 150, smooth(.28, .58, p)) - 30 * smooth(.58, .7, p), day = 1 - pal.n;
    if (day > .02) {
      c.save(); c.globalCompositeOperation = "lighter";
      const glow = c.createRadialGradient(sx, sy, 10, sx, sy, 150); glow.addColorStop(0, rgb(pal.sun, .55 * day)); glow.addColorStop(1, rgb(pal.sun, 0)); c.fillStyle = glow; c.fillRect(sx - 150, sy - 150, 300, 300);
      if (!reduced()) for (let i = 0; i < 9; i++) { const a = t * .05 + i * Math.PI * 2 / 9; c.fillStyle = rgb(pal.sun, .022 * day); c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + Math.cos(a - .07) * 520, sy + Math.sin(a - .07) * 520); c.lineTo(sx + Math.cos(a + .07) * 520, sy + Math.sin(a + .07) * 520); c.fill(); }
      c.restore();
      c.fillStyle = rgb(pal.sun, day); c.beginPath(); c.arc(sx, sy, 26, 0, Math.PI * 2); c.fill();
    }
    if (pal.n > .02) {
      const mx = VWv * .2, my = 70; c.save(); c.globalAlpha = pal.n;
      const mg = c.createRadialGradient(mx, my, 8, mx, my, 90); mg.addColorStop(0, "rgba(255,245,210,.35)"); mg.addColorStop(1, "rgba(255,245,210,0)"); c.fillStyle = mg; c.fillRect(mx - 90, my - 90, 180, 180);
      c.fillStyle = "#fff6d8"; c.beginPath(); c.arc(mx, my, 20, 0, Math.PI * 2); c.fill(); c.fillStyle = "rgba(200,190,160,.45)"; [[-6, -5, 4], [6, 4, 5], [-3, 8, 3], [8, -8, 2.4]].forEach(([dx, dy, r]) => { c.beginPath(); c.arc(mx + dx, my + dy, r, 0, Math.PI * 2); c.fill(); }); c.restore();
    }
  }
  function mountains(c, VWv, GYv, d, p, pal) {
    pal = pal || palette(p);
    const alps = 1 - .8 * smooth(.32, .86, p);
    const layer = (f, base, amp, s, col, snow) => {
      const off = d * f, pts = [];
      for (let x = -40; x <= VWv + 40; x += 8) pts.push([x, GYv - (base + amp * ridge(x + off, s)) * alps - 10]);
      const g = c.createLinearGradient(0, GYv - base - amp, 0, GYv); g.addColorStop(0, rgb(col)); g.addColorStop(1, rgb(col.map((v, i) => lerp(v, pal.sky[2][i], .35))));
      c.beginPath(); c.moveTo(-40, GYv + 4); pts.forEach(([x, y]) => c.lineTo(x, y)); c.lineTo(VWv + 40, GYv + 4); c.closePath(); c.fillStyle = g; c.fill();
      if (snow && alps > .45) {
        const line = GYv - snow; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
        for (let i = pts.length - 1; i >= 0; i--) { const [x, y] = pts[i], wx = x + off; c.lineTo(x, Math.max(y, Math.min(line + 9 * Math.sin(wx * .09) + 5 * Math.sin(wx * .23), y + 30))); }
        c.closePath(); c.fillStyle = `rgba(255,255,255,${.92 * smooth(.45, .8, alps) * (1 - pal.n * .6)})`; c.fill();
      }
    };
    layer(.06, 150, 80, 1.3, pal.far, 168);
    const hz = c.createLinearGradient(0, GYv - 120, 0, GYv); hz.addColorStop(0, rgb(pal.sky[2], 0)); hz.addColorStop(1, rgb(pal.sky[2], .55)); c.fillStyle = hz; c.fillRect(-40, GYv - 120, VWv + 80, 124);
    layer(.12, 96, 52, 4.1, pal.near, 132);
    const hz2 = c.createLinearGradient(0, GYv - 60, 0, GYv); hz2.addColorStop(0, rgb(pal.sky[2], 0)); hz2.addColorStop(1, rgb(pal.sky[2], .3)); c.fillStyle = hz2; c.fillRect(-40, GYv - 60, VWv + 80, 64);
  }
  function clouds(c, VWv, d, t, pal) {
    const n = pal ? pal.n : 0, warm = pal ? pal.sky[2] : [255, 255, 255];
    for (let i = 0; i < 7; i++) {
      const span = VWv + 360, x = ((i * 241 - d * .05 - t * (5 + i)) % span + span) % span - 180, y = 34 + hash(i) * 100, s = .65 + hash(i + 2) * .8;
      c.fillStyle = n > .5 ? `rgba(120,110,170,${.35 + .2 * hash(i)})` : rgb([255, 255, 255].map((v, k) => lerp(v, warm[k], .25)), .9);
      c.beginPath(); c.ellipse(x, y, 40 * s, 12 * s, 0, 0, Math.PI * 2); c.ellipse(x - 17 * s, y - 6 * s, 19 * s, 14 * s, 0, 0, Math.PI * 2); c.ellipse(x + 13 * s, y - 10 * s, 21 * s, 16 * s, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = "rgba(255,255,255,.35)"; c.beginPath(); c.ellipse(x + 8 * s, y - 16 * s, 12 * s, 5 * s, 0, 0, Math.PI * 2); c.fill();
    }
  }

  /* level props on the hill line; light sources are collected so they can glow above the night tint */
  function prop(c, type, i, t, lights, x, y) {
    const k = hash(i + 19);
    if (type === "fir") {
      c.fillStyle = "#6d4f39"; c.fillRect(-2, -10, 4, 10); c.fillStyle = "#3a7a57";
      [[0, 18], [10, 14], [19, 10]].forEach(([yy, r]) => { c.beginPath(); c.moveTo(-r, -8 - yy); c.lineTo(r, -8 - yy); c.lineTo(0, -8 - yy - r * 1.5); c.fill(); });
      c.fillStyle = "rgba(255,255,255,.85)"; c.beginPath(); c.moveTo(-4, -37); c.lineTo(4, -37); c.lineTo(0, -44); c.fill();
    } else if (type === "birch") {
      c.fillStyle = "#f2efe6"; c.fillRect(-2.5, -34, 5, 34); c.fillStyle = "#2b2b2b"; for (let j = 0; j < 4; j++) c.fillRect(-2.5 + (j % 2) * 2, -30 + j * 7, 3, 1.4);
      c.fillStyle = "#9bd06a"; c.beginPath(); c.ellipse(0, -40, 12, 16, 0, 0, Math.PI * 2); c.fill();
    } else if (type === "chalet") {
      c.fillStyle = "#f4efe4"; c.fillRect(-20, -18, 40, 18); c.fillStyle = "#9a6238"; c.fillRect(-20, -34, 40, 16);
      c.fillStyle = "#6e4426"; c.beginPath(); c.moveTo(-26, -34); c.lineTo(0, -48); c.lineTo(26, -34); c.fill();
      c.fillStyle = "#e8557a"; for (let j = 0; j < 5; j++) { c.beginPath(); c.arc(-16 + j * 8, -19, 2.2, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = "#5a7aa8"; c.fillRect(-12, -30, 7, 7); c.fillRect(5, -30, 7, 7);
    } else if (type === "tank") {
      c.fillStyle = "#c9d2de"; c.fillRect(-16, -40, 32, 40); c.beginPath(); c.ellipse(0, -40, 16, 6, 0, Math.PI, 0); c.fill();
      c.fillStyle = "#3b62d8"; c.fillRect(-16, -26, 32, 5); text(c, "QA", 0, -12, 9, "#3b62d8", 900);
      c.strokeStyle = "#8d96a8"; c.lineWidth = 1.2; c.beginPath(); for (let j = 0; j < 7; j++) { c.moveTo(12, -4 - j * 5); c.lineTo(15, -4 - j * 5); } c.stroke();
      const pf = (t * .5 + k) % 1; c.fillStyle = `rgba(255,255,255,${.7 * (1 - pf)})`; c.beginPath(); c.arc(-4 + pf * 8, -50 - pf * 30, 5 + pf * 9, 0, Math.PI * 2); c.fill();
    } else if (type === "pipe") {
      c.fillStyle = "#8d96a8"; [-26, 0, 26].forEach(xx => c.fillRect(xx - 1.5, -22, 3, 22));
      c.strokeStyle = "#aab4c4"; c.lineWidth = 6; c.lineCap = "butt"; c.beginPath(); c.moveTo(-36, -24); c.lineTo(36, -24); c.stroke(); c.strokeStyle = "#c9d2de"; c.lineWidth = 2; c.beginPath(); c.moveTo(-36, -26); c.lineTo(36, -26); c.stroke();
      c.fillStyle = "#e8557a"; c.beginPath(); c.arc(10, -24, 5, 0, Math.PI * 2); c.fill(); c.fillStyle = "#fff"; c.fillRect(8, -26, 4, 4);
    } else if (type === "round" || type === "autumn") {
      c.fillStyle = "#6d4f39"; c.fillRect(-2, -12, 4, 12);
      const cols = type === "autumn" ? [["#e9823a", "#d9572f"], ["#f2b33d", "#e08a2a"], ["#c9483a", "#a83a30"]][Math.floor(k * 3)] : ["#62ab66", "#4f945a"];
      c.fillStyle = cols[1]; c.beginPath(); c.arc(-8, -18, 9, 0, Math.PI * 2); c.arc(8, -18, 9, 0, Math.PI * 2); c.fill();
      c.fillStyle = cols[0]; c.beginPath(); c.arc(0, -25, 14, 0, Math.PI * 2); c.fill(); c.fillStyle = "rgba(255,255,255,.18)"; c.beginPath(); c.arc(-4, -30, 6, 0, Math.PI * 2); c.fill();
    } else if (type === "cow") {
      const chew = Math.sin(t * 3 + i) * 1.2;
      c.fillStyle = "#fbfbf6"; rr(c, -16, -22, 30, 15, 6); c.fill();
      c.fillStyle = "#2b2b2b"; c.beginPath(); c.ellipse(-6, -17, 5, 4, .3, 0, Math.PI * 2); c.ellipse(7, -14, 4, 3, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#3a3a3a"; [-13, -7, 6, 11].forEach(xx => c.fillRect(xx - 1.2, -8, 2.6, 8));
      c.save(); c.translate(15, -18 + chew); c.fillStyle = "#fbfbf6"; rr(c, -2, -4, 11, 10, 4); c.fill(); c.fillStyle = "#f1a7b0"; rr(c, 4, 1, 6, 5, 2); c.fill();
      c.fillStyle = "#c9b28a"; c.fillRect(-1, -7, 2, 4); c.fillRect(5, -7, 2, 4); c.fillStyle = "#2b2b2b"; c.fillRect(3, -2, 1.6, 1.6); c.restore();
      if (i % 4 === 0) { c.strokeStyle = P.lanyard; c.lineWidth = 1; c.beginPath(); c.moveTo(13, -18); c.lineTo(16, -11); c.stroke(); c.fillStyle = "#fff"; c.fillRect(14, -11, 5, 6); }
      const say = (t * .35 + k * 3) % 3;
      if (say < 1.3) { const msg = i % 4 === 0 ? "QA approved 🐄" : k > .5 ? "Muuh?" : "Muuuh!"; c.font = "800 8px Outfit, Manrope, system-ui"; const w = c.measureText(msg).width + 12;
        c.fillStyle = "rgba(255,255,255,.95)"; rr(c, 10, -46, w, 15, 7); c.fill(); c.beginPath(); c.moveTo(16, -32); c.lineTo(22, -32); c.lineTo(16, -26); c.fill(); text(c, msg, 10 + w / 2, -38.5, 8, "#111628", 800); }
    } else if (type === "maypole") {
      c.fillStyle = "#fff"; c.fillRect(-2.5, -96, 5, 96); c.fillStyle = "#3a78d0"; for (let j = 0; j < 12; j++) { c.save(); c.translate(0, -8 - j * 7.6); c.rotate(-.5); c.fillRect(-4, -1.6, 8, 3.2); c.restore(); }
      c.strokeStyle = "#3a8a4c"; c.lineWidth = 3; c.beginPath(); c.ellipse(0, -84, 14, 4, 0, 0, Math.PI * 2); c.stroke();
      c.fillStyle = "#3a8a4c"; c.beginPath(); c.moveTo(-6, -96); c.lineTo(0, -112); c.lineTo(6, -96); c.fill();
      [[-1, -64, "🍺"], [1, -48, "🥨"]].forEach(([sd, yy, e]) => { c.fillStyle = "#fff"; rr(c, sd > 0 ? 3 : -17, yy - 6, 14, 12, 2); c.fill(); text(c, e, sd > 0 ? 10 : -10, yy, 8, "#111628", 400); });
    } else if (type === "sunflower") {
      c.strokeStyle = "#4f8a3a"; c.lineWidth = 2.4; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -34); c.stroke();
      c.save(); c.translate(0, -36); c.rotate(Math.sin(t * 1.5 + i) * .12); c.fillStyle = "#ffcd2e"; for (let j = 0; j < 10; j++) { c.rotate(Math.PI / 5); c.beginPath(); c.ellipse(0, -7, 2.6, 5, 0, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = "#7a4b2a"; c.beginPath(); c.arc(0, 0, 4.4, 0, Math.PI * 2); c.fill(); c.restore();
    } else if (type === "chapel") {
      c.fillStyle = "#fbf7ee"; c.fillRect(-16, -26, 26, 26); c.fillRect(10, -44, 10, 44); c.fillStyle = "#b5674d"; c.beginPath(); c.moveTo(-19, -26); c.lineTo(-3, -38); c.lineTo(13, -26); c.fill();
      c.fillStyle = "#6f9f88"; c.beginPath(); c.ellipse(15, -46, 7, 8, 0, Math.PI, 0); c.fill(); c.beginPath(); c.ellipse(15, -53, 4, 5, 0, Math.PI, 0); c.fill(); c.fillRect(14.4, -62, 1.4, 5);
    } else if (type === "lamp") {
      c.fillStyle = "#3a3f5c"; c.fillRect(-1.6, -58, 3.2, 58); c.beginPath(); c.moveTo(-1.6, -58); c.quadraticCurveTo(0, -66, 10, -64); c.lineTo(10, -61); c.quadraticCurveTo(2, -62, 1.6, -56); c.fill();
      c.fillStyle = "#ffe9a8"; c.beginPath(); c.ellipse(10, -60, 4, 2.4, 0, 0, Math.PI * 2); c.fill(); lights.push([x + 10, y - 58, 34, "255,220,140"]);
    } else if (type === "building") {
      const h = 46 + k * 40, w = 34 + hash(i + 4) * 16;
      c.fillStyle = ["#e6cdb4", "#d8b9a4", "#cfd6e2", "#e9d8b6"][Math.floor(k * 4)]; c.fillRect(-w / 2, -h, w, h); c.fillStyle = "#9c5a44"; c.fillRect(-w / 2 - 2, -h - 5, w + 4, 5);
      for (let r = 0; r < Math.floor(h / 14); r++) for (let q = 0; q < Math.floor(w / 11); q++) { const lit = hash(i * 13 + r * 7 + q) > .45, wx = -w / 2 + 4 + q * 11, wy = -h + 6 + r * 14;
        c.fillStyle = lit ? "#ffd97a" : "rgba(60,70,100,.45)"; c.fillRect(wx, wy, 6, 8); if (lit) lights.push([x + wx + 3, y + wy + 4, 7, "255,210,120"]); }
    }
  }
  function hills(c, VWv, GYv, d, p, pal, t = 0) {
    pal = pal || palette(p);
    const off = d * .3; c.beginPath(); c.moveTo(-40, GYv + 4);
    for (let x = -40; x <= VWv + 40; x += 10) c.lineTo(x, GYv - 34 - 18 * ridge(x + off, 7.7));
    c.lineTo(VWv + 40, GYv + 4); c.closePath();
    const g = c.createLinearGradient(0, GYv - 60, 0, GYv); g.addColorStop(0, rgb(pal.hill)); g.addColorStop(1, rgb(pal.hill2)); c.fillStyle = g; c.fill();
    const lights = [], f = .55, sp = 72, o = d * f, first = Math.floor((o - 80) / sp);
    for (let i = first; i < first + VWv / sp + 4; i++) {
      if (hash(i) < .3) continue;
      // which level this prop belongs to: the progress at which it passes her
      const x = i * sp - o + hash(i + 3) * 36, pAt = clamp((i * sp - PX) / f / TOTAL, 0, 1), L = LEVELS[levelAt(pAt)];
      const type = L.props[Math.floor(hash(i + 5) * L.props.length)], s = .75 + hash(i + 7) * .5;
      c.save(); c.translate(x, GYv - 4); c.scale(s, s); prop(c, type, i, t, lights, x, GYv - 4); c.restore();
    }
    return lights;
  }
  function ground(c, VWv, GYv, d, p, pal, yBot = 900) {
    pal = pal || palette(p);
    const g = c.createLinearGradient(0, GYv, 0, GYv + 200); g.addColorStop(0, rgb(pal.ground)); g.addColorStop(1, rgb(pal.ground.map(v => v * .82))); c.fillStyle = g; c.fillRect(-60, GYv, VWv + 120, yBot - GYv + 200);
    c.fillStyle = rgb(pal.path); c.fillRect(-60, GYv - 2, VWv + 120, 18);
    c.fillStyle = "rgba(255,255,255,.35)"; c.fillRect(-60, GYv - 2, VWv + 120, 2);
    c.fillStyle = rgb(pal.path.map(v => v * .86)); c.fillRect(-60, GYv + 14, VWv + 120, 3);
    c.fillStyle = "rgba(255,255,255,.75)"; const o = d % 46; for (let x = -o - 46; x < VWv + 60; x += 46) c.fillRect(x, GYv + 6, 22, 2.4);
    c.fillStyle = rgb(pal.ground.map(v => v * .85)); const o2 = d % 31; for (let x = -o2 - 31; x < VWv + 60; x += 31) { const k = hash(Math.floor((x + d) / 31)); c.beginPath(); c.moveTo(x, GYv + 30 + k * 30); c.lineTo(x + 3, GYv + 22 + k * 30); c.lineTo(x + 6, GYv + 30 + k * 30); c.fill(); }
    const o3 = d % 157; for (let x = -o3 - 157; x < VWv + 160; x += 157) { const k = hash(Math.floor((x + d) / 157) + 50); if (k < .5) continue; c.fillStyle = ["#ff8fab", "#ffd166", "#ffffff", "#b39cff"][Math.floor(k * 8) % 4]; for (let j = 0; j < 3; j++) { c.beginPath(); c.arc(x + j * 6, GYv + 40 + k * 26 + (j % 2) * 3, 2.2, 0, Math.PI * 2); c.fill(); } }
  }

  /* one sky gag per level, drifting across while that level plays */
  function skyGag(c, kind, x, t, her) {
    c.save(); c.translate(x, 0);
    if (kind === "glider") {
      const y = 92 + Math.sin(t * .8) * 8; c.fillStyle = "#e8557a"; c.beginPath(); c.ellipse(0, y - 24, 30, 9, 0, Math.PI, 0); c.fill(); c.fillStyle = "#ffd166"; c.beginPath(); c.ellipse(0, y - 24, 30, 9, 0, Math.PI * 1.35, Math.PI * 1.65); c.fill();
      c.strokeStyle = "rgba(40,46,70,.6)"; c.lineWidth = .8; c.beginPath(); c.moveTo(-28, y - 24); c.lineTo(0, y); c.lineTo(28, y - 24); c.stroke(); c.fillStyle = "#2f3650"; c.beginPath(); c.arc(0, y + 2, 3, 0, Math.PI * 2); c.fill();
      c.strokeStyle = "rgba(40,46,70,.5)"; c.beginPath(); c.moveTo(0, y + 4); c.lineTo(-18, y + 10); c.stroke(); c.fillStyle = "#fff"; rr(c, -118, y + 3, 100, 15, 3); c.fill(); text(c, "OUT OF OFFICE ✈︎", -68, y + 10.5, 8, "#e8557a", 900);
    } else if (kind === "blimp") {
      const y = 70 + Math.sin(t * .6) * 5; c.fillStyle = "#c9d2de"; c.beginPath(); c.ellipse(0, y, 62, 20, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = "#3b62d8"; c.beginPath(); c.moveTo(52, y); c.lineTo(72, y - 16); c.lineTo(72, y + 16); c.fill();
      c.fillStyle = "#2f3650"; rr(c, -12, y + 18, 24, 7, 3); c.fill(); text(c, "AUDITOR ON SITE", 0, y, 9, "#3b62d8", 900);
      c.strokeStyle = "rgba(40,46,70,.5)"; c.beginPath(); c.moveTo(72, y); c.lineTo(96, y + 6); c.stroke(); c.fillStyle = "#fff"; rr(c, 96, y - 3, 150, 17, 3); c.fill(); text(c, "WHERE IS THE LOGBOOK?", 171, y + 5.5, 8, "#e23b4e", 900);
    } else if (kind === "balloon") {
      const y = 96 + Math.sin(t * .7) * 10; ["#e8557a", "#ffd166", "#e8557a", "#ffd166", "#e8557a"].forEach((col, j) => { c.fillStyle = col; c.beginPath(); c.ellipse(0, y - 30, 26 - j * 5.2, 30, 0, 0, Math.PI * 2); c.fill(); });
      c.strokeStyle = "rgba(60,40,30,.6)"; c.lineWidth = .8; c.beginPath(); c.moveTo(-14, y - 4); c.lineTo(-6, y + 12); c.moveTo(14, y - 4); c.lineTo(6, y + 12); c.stroke(); c.fillStyle = "#8a5a3c"; c.fillRect(-7, y + 12, 14, 10);
      c.fillStyle = "#fff"; rr(c, -40, y + 26, 80, 14, 3); c.fill(); text(c, "TRUCK STILL WAITING", 0, y + 33, 6.6, "#111628", 900);
    } else if (kind === "plane" || kind === "banner") {
      const night = kind === "banner", y = 64 + Math.sin(t * 1.1) * 4, blink = Math.floor(t * 2) % 2;
      c.fillStyle = night ? "#c9cde0" : "#f7f7fb"; rr(c, -22, y - 5, 44, 10, 5); c.fill(); c.fillStyle = night ? "#9aa0bc" : "#e8557a"; c.fillRect(-2, y - 14, 6, 28); c.fillRect(-20, y - 10, 4, 8);
      if (night) { c.fillStyle = blink ? "#ff4b5c" : "#4bff8a"; c.beginPath(); c.arc(1, y - 14, 2, 0, Math.PI * 2); c.fill(); }
      const pr = Math.abs(Math.sin(t * 40)) * 7 + 1; c.fillStyle = "#2f3650"; c.fillRect(23, y - pr, 2, pr * 2);
      c.strokeStyle = night ? "rgba(255,255,255,.4)" : "rgba(40,46,70,.45)"; c.lineWidth = .8; c.beginPath(); c.moveTo(-22, y); c.lineTo(-44, y); c.stroke();
      const msg = night ? `${her} ♥ MÜNCHEN` : "KEVIN IS COMING TOO 🎉", w = night ? 170 : 176;
      c.fillStyle = night ? "rgba(255,245,250,.95)" : "#fff"; rr(c, -44 - w, y - 8, w, 16, 3); c.fill(); text(c, msg, -44 - w / 2, y, 8.6, night ? "#e8557a" : "#2f6b3a", 900);
    }
    c.restore();
  }

  /* landmarks along the way: x = PX + (p·TOTAL − dist)·f + off */
  function post(c, h) { c.fillStyle = "#8d93a6"; c.fillRect(-2, -h, 4, h); }
  function signBoard(c, w, h, y, bg, border, lines) {
    c.fillStyle = bg; rr(c, -w / 2, y, w, h, 4); c.fill(); c.strokeStyle = border; c.lineWidth = 2.4; rr(c, -w / 2 + 3, y + 3, w - 6, h - 6, 3); c.stroke();
    lines.forEach(([s, dy, sz, col]) => text(c, s, 0, y + dy, sz, col, 800));
  }
  const LANDMARKS = [
    { p: 0, f: .45, off: -40, draw(c) {
      [["#f3d9a6", -110, 70], ["#e7b9a8", -74, 80], ["#efe2c8", -30, 92], ["#cfe0c3", 18, 74], ["#f0c9a1", 52, 66]].forEach(([col, x, h]) => { c.fillStyle = col; c.fillRect(x, -h, 36, h); c.fillStyle = "#a35b44"; c.beginPath(); c.moveTo(x - 3, -h); c.lineTo(x + 18, -h - 14); c.lineTo(x + 39, -h); c.fill(); c.fillStyle = "rgba(60,70,100,.35)"; for (let r = 0; r < 3; r++) for (let k = 0; k < 2; k++) c.fillRect(x + 6 + k * 16, -h + 12 + r * 20, 8, 10); });
      c.fillStyle = "#e6d3ae"; c.fillRect(-25, -66, 26, 34); c.fillStyle = "#8a5a3c"; c.fillRect(-25, -50, 26, 3); c.fillStyle = "rgba(60,70,100,.4)"; c.fillRect(-20, -62, 6, 9); c.fillRect(-10, -62, 6, 9); c.fillRect(-20, -44, 6, 9); c.fillRect(-10, -44, 6, 9);
      c.fillStyle = "#e0a826"; c.beginPath(); c.moveTo(-29, -66); c.lineTo(-19, -86); c.lineTo(-5, -86); c.lineTo(5, -66); c.closePath(); c.fill();
      c.strokeStyle = "#b9831a"; c.lineWidth = 1; for (let i = 1; i < 4; i++) { const y = -66 - i * 5, k = i * 5 / 20 * 10; c.beginPath(); c.moveTo(-29 + k, y); c.lineTo(5 - k, y); c.stroke(); }
      c.fillStyle = "rgba(255,240,170,.8)"; c.fillRect(-17, -84, 3, 16);
      text(c, "Goldenes Dachl", -12, -100, 9, "rgba(40,46,70,.7)", 700); } },
    { p: 0, f: 1, off: -120, draw(c) { post(c, 56); signBoard(c, 92, 34, -86, "#fff", "#d7263d", [["INNSBRUCK", 13, 11, "#d7263d"], ["start · Tirol", 25, 7, "#4b5270"]]); } },
    { p: .1, f: .45, off: 0, draw(c, t) {
      c.fillStyle = "#e9edf5"; c.fillRect(-90, -64, 180, 64); c.fillStyle = "#3b62d8"; c.fillRect(-90, -20, 180, 5);
      c.fillStyle = "rgba(80,110,170,.45)"; for (let r = 0; r < 2; r++) for (let k = 0; k < 9; k++) c.fillRect(-82 + k * 19, -56 + r * 18, 12, 10);
      c.fillStyle = "#d5dbe8"; c.fillRect(54, -104, 14, 40);
      for (let i = 0; i < 3; i++) { const k = (t * .4 + i / 3) % 1; c.fillStyle = `rgba(255,255,255,${.8 * (1 - k)})`; c.beginPath(); c.arc(61 + k * 14, -110 - k * 40, 6 + k * 10, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = "#fff"; rr(c, -58, -88, 94, 22, 6); c.fill(); text(c, "🧪 QA · Release", -11, -77, 10, "#3b62d8", 900);
      text(c, "open Mon–Sun (apparently)", 0, 10, 8, "rgba(40,46,70,.7)", 700); } },
    { p: .27, f: 1, off: 0, draw(c) { post(c, 60); c.fillStyle = "#8d93a6"; c.fillRect(-40, -60, 4, 60); signBoard(c, 104, 36, -96, "#2457c5", "#fff", [["München", 15, 12, "#fff"], ["120 km", 27, 9, "#fff"]]); } },
    { p: .35, f: .4, off: 0, draw(c) {
      c.fillStyle = "#7cb56b"; c.beginPath(); c.ellipse(0, 0, 130, 70, 0, Math.PI, 0); c.fill();
      c.fillStyle = "#e7e1d2"; c.fillRect(-60, -86, 120, 22); c.fillRect(-14, -118, 30, 54); c.beginPath(); c.arc(1, -118, 15, Math.PI, 0); c.fill();
      c.fillStyle = "#b9b2a0"; for (let i = 0; i < 8; i++) c.fillRect(-60 + i * 16, -92, 8, 6);
      text(c, "Festung Kufstein", 0, -136, 9, "rgba(40,46,70,.7)", 700); } },
    { p: .5, f: 1, off: 0, draw(c) {
      post(c, 58); c.fillStyle = "#1f49b6"; rr(c, -46, -102, 92, 46, 5); c.fill();
      c.fillStyle = "#ffcc00"; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; c.beginPath(); c.arc(Math.cos(a) * 11, -86 + Math.sin(a) * 11, 1.6, 0, Math.PI * 2); c.fill(); }
      text(c, "DEUTSCHLAND", 0, -66, 9, "#fff", 900); text(c, "Freistaat Bayern", 0, -48, 7, "#2f3650", 700); } },
    { p: .64, f: 1, off: 0, draw(c) { post(c, 60); c.fillStyle = "#8d93a6"; c.fillRect(-40, -60, 4, 60); signBoard(c, 104, 36, -96, "#2457c5", "#fff", [["München", 15, 12, "#fff"], ["60 km", 27, 9, "#fff"]]); } },
    { p: .73, f: 1, off: 0, draw(c) { post(c, 50); signBoard(c, 98, 34, -84, "#ffd400", "#111628", [["Rosenheim", 14, 11.5, "#111628"], ["Landkreis Rosenheim", 25, 6, "#111628"]]); } },
    { p: .9, f: 1, off: 0, draw(c) { post(c, 60); c.fillStyle = "#8d93a6"; c.fillRect(-40, -60, 4, 60); signBoard(c, 104, 36, -96, "#2457c5", "#fff", [["München", 15, 12, "#fff"], ["16 km", 27, 9, "#fff"]]); } },
    { p: 1, f: .45, off: 170, draw(c) {
      [["#e7cfb6", -150, 54], ["#efe2c8", -110, 64], ["#e2c3a8", 80, 58], ["#f3d9a6", 116, 48]].forEach(([col, x, h]) => { c.fillStyle = col; c.fillRect(x, -h, 38, h); c.fillStyle = "#b5674d"; c.fillRect(x - 2, -h - 6, 42, 6); });
      c.fillStyle = "#b5674d"; c.fillRect(-70, -70, 140, 70); c.beginPath(); c.moveTo(-74, -70); c.lineTo(0, -112); c.lineTo(74, -70); c.fill();
      [-38, 38].forEach(x => { c.fillStyle = "#c27358"; c.fillRect(x - 15, -170, 30, 170); c.fillStyle = "#6f9f88"; c.beginPath(); c.ellipse(x, -172, 17, 20, 0, Math.PI, 0); c.fill(); c.beginPath(); c.ellipse(x, -186, 10, 14, 0, Math.PI, 0); c.fill(); c.fillRect(x - 1, -206, 2, 10);
        c.fillStyle = "rgba(60,30,20,.35)"; c.fillRect(x - 5, -150, 10, 18); c.fillRect(x - 5, -110, 10, 18); });
      text(c, "Frauenkirche", 0, -222, 9, "rgba(40,46,70,.7)", 700); } },
    { p: 1, f: 1, off: -60, draw(c) { post(c, 50); signBoard(c, 98, 34, -84, "#ffd400", "#111628", [["München", 15, 12.5, "#111628"], ["Landeshauptstadt", 25, 6, "#111628"]]); } }
  ];

  /* ---------- the game ---------- */
  const TOTAL = 34000, KM = 165, GRAV = 2300, JUMP = 780, DJUMP = 690, VH = 380, GY = 300;
  const FX_LIFE = { massage: 6, yog: 6.5, wine: 8 };
  const FX_ICON = { massage: ["💆‍♀️", "#8a7be0"], yog: ["🥛", "#4f8fe6"], wine: ["🍷", "#e8557a"] };
  const HIT_WORD = { esc: ["ESCALATED!", "P1!!", "RE: RE: RE:"], paper: ["FORM 27B?!", "WRONG STAMP!", "NOTARY!"], friends: ["SURPRISE!!", "KEVIN?!", "SLEEPOVER!"], truck: ["HOOONK!", "SIGN IT!", "BEEP BEEP!"] };
  const SMASH_WORD = ["POW!", "KABOOM!", "BONK!", "YEET!", "SMASH!", "DELETED!"];
  const BONUS_FX = {
    cake: { txt: "CHEESECAKE!", col: "#ffd166", flash: "255,214,140" }, massage: { txt: "AHHHHH…", col: "#c9b4f0", flash: "200,180,255" },
    yog: { txt: "YOGHURT POWER!", col: "#7cc4ff", flash: "150,200,255" }, wine: { txt: "PROST! 🍷", col: "#ff7aa2", flash: "255,140,180" }
  };
  const COMBO_WORDS = { 5: "COMBO ×2!", 10: "×3 · ON FIRE!", 15: "×4 · QA LEGEND!", 25: "UNSTOPPABLE!", 40: "CEO MATERIAL!" };
  const NOTES = [
    { p: .05, ic: "📧", app: "Outlook", title: "RE: RE: RE: FW: URGENT", text: "Please see below. And below that. And below that." },
    { p: .13, ic: "💬", app: "Teams", title: "Boss: “got a sec?”", text: "Status automatically set to: 🏃‍♀️ Running away" },
    { p: .245, ic: "📋", app: "Audit", title: "Auditor on site", text: "Could you print the logbook from 2019? In colour, please." },
    { p: .33, ic: "🤖", app: "Outlook", title: "Automatic reply", text: "I'm running to München. For escalations, please contact the void." },
    { p: .445, ic: "🚚", app: "Hans (truck)", title: "Still here 🙂", text: "Brought sandwiches. Made friends with the forklift." },
    { p: .535, ic: "🥨", app: "Bayern", title: "Willkommen in Bayern!", text: "Weißwurst must be eaten before noon. It's the law (probably)." },
    { p: .645, ic: "🎉", app: "WhatsApp", title: "WEEKEND!!! (47 new)", text: "Can we bring the dog? And Kevin? Kevin is coming." },
    { p: .725, ic: "🍰", app: "Reminders", title: "Cheesecake for 12", text: "Due: tomorrow. Status: optimistic." },
    { p: .835, ic: "📞", app: "Mama", title: "Missed calls (3)", text: "Did you bring the Vollmacht? The ORIGINAL?" },
    { p: .925, ic: "💗", app: "{me}", title: "I can see you on the map 👀", text: "Wine is chilled. Run, {her}, run!" }
  ];
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const ICON = {
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/></svg>',
    snd: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>',
    mute: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="m16 9 6 6M22 9l-6 6"/></svg>',
    game: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="4.5" r="2"/><path d="m7 21 3-6 3 2v5M6 11l3-3 4 1 3 3 3 1M10 15l2-6"/></svg>'
  };
  /* ---------- sound: a tiny look-ahead sequencer (one song per level) + layered effects ---------- */
  const SND = { on: read(KEY.sound, true), ctx: null, master: null, music: null, sfx: null, noise: null, timer: 0, step: 0, next: 0, song: 0, pending: -1, playing: false };
  const midi = m => 440 * Math.pow(2, (m - 69) / 12);
  function audio() {
    if (!SND.on) return null;
    try {
      if (!SND.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
        const a = SND.ctx = new AC(), comp = a.createDynamicsCompressor();
        comp.threshold.value = -16; comp.ratio.value = 3.5; comp.connect(a.destination);
        SND.master = a.createGain(); SND.master.gain.value = .9; SND.master.connect(comp);
        SND.music = a.createGain(); SND.music.gain.value = .3; SND.music.connect(SND.master);
        SND.sfx = a.createGain(); SND.sfx.gain.value = .75; SND.sfx.connect(SND.master);
        const buf = a.createBuffer(1, a.sampleRate, a.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        SND.noise = buf;
      }
      if (SND.ctx.state === "suspended") SND.ctx.resume();
      return SND.ctx;
    } catch (e) { return null; }
  }
  function note(f, t0, dur, o = {}) {
    const a = SND.ctx, osc = a.createOscillator(), g = a.createGain(), vol = o.vol == null ? .08 : o.vol;
    osc.type = o.type || "triangle"; osc.frequency.setValueAtTime(f, t0); if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t0 + (o.glide || dur));
    if (o.detune) osc.detune.value = o.detune;
    if (o.vib) { const l = a.createOscillator(), lg = a.createGain(); l.frequency.value = o.vibRate || 6; lg.gain.value = o.vib; l.connect(lg).connect(osc.frequency); l.start(t0); l.stop(t0 + dur + .1); }
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + (o.attack || .005)); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    let n = osc; if (o.lp) { const fl = a.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = o.lp; fl.Q.value = o.q || .8; osc.connect(fl); n = fl; }
    n.connect(g).connect(o.bus || SND.sfx); osc.start(t0); osc.stop(t0 + dur + .05);
  }
  function hiss(t0, dur, o = {}) {
    const a = SND.ctx, s = a.createBufferSource(), g = a.createGain(); s.buffer = SND.noise; let n = s;
    if (o.hp) { const f = a.createBiquadFilter(); f.type = "highpass"; f.frequency.value = o.hp; n.connect(f); n = f; }
    if (o.lp) { const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = o.lp; n.connect(f); n = f; }
    if (o.bp) { const f = a.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = o.bp; f.Q.value = o.q || 1; n.connect(f); n = f; }
    g.gain.setValueAtTime(o.vol || .1, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur); n.connect(g).connect(o.bus || SND.sfx);
    s.start(t0, Math.random() * .4); s.stop(t0 + dur + .02);
  }
  const play = fn => { const a = audio(); if (a) try { fn(a.currentTime + .005); } catch (e) { /* sound is optional */ } };

  /* songs: chords as MIDI notes, 4 bars each; style picks the groove */
  const SONGS = [
    { bpm: 116, style: "pop", prog: [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]], lead: [72, 74, 76, 79, 81] },
    { bpm: 126, style: "drive", prog: [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]], lead: [69, 72, 74, 76, 79] },
    { bpm: 120, style: "pop", prog: [[62, 66, 69], [57, 61, 64], [59, 62, 66], [55, 59, 62]], lead: [74, 76, 78, 81, 83] },
    { bpm: 138, style: "oompah", prog: [[53, 57, 60], [60, 64, 67], [60, 64, 67], [53, 57, 60]], lead: [77, 79, 81, 84, 86] },
    { bpm: 88, style: "lofi", prog: [[63, 67, 70, 74], [60, 63, 67, 70], [56, 60, 63, 67], [58, 62, 65, 68]], lead: [75, 77, 79, 82, 84] }
  ];
  const M = () => ({ bus: SND.music });
  function kick(t, v = .5) { note(150, t, .22, { ...M(), type: "sine", f2: 42, glide: .14, vol: v }); }
  function snare(t, v = .14) { hiss(t, .16, { ...M(), hp: 1400, vol: v }); note(190, t, .08, { ...M(), type: "triangle", vol: v * .6 }); }
  function hat(t, v = .05, len = .04) { hiss(t, len, { ...M(), hp: 7000, vol: v }); }
  function playStep(song, step, t, spb) {
    const bar = Math.floor(step / 16), s = step % 16, ch = song.prog[bar % song.prog.length], root = ch[0] - 24;
    const leadRnd = hash(bar * 31 + s * 7 + SND.song * 101);
    if (song.style === "pop") {
      if (s === 0 || s === 8 || (s === 10 && bar % 2)) kick(t);
      if (s === 4 || s === 12) snare(t);
      if (s % 2 === 0) hat(t, s % 4 ? .035 : .05);
      if ([0, 3, 6, 8, 11, 14].includes(s)) note(midi(root), t, spb * 2.2, { ...M(), type: "triangle", vol: .16, lp: 900 });
      if (s % 2 === 0) note(midi(ch[(s / 2) % ch.length] + 12), t, spb * 1.6, { ...M(), type: "square", vol: .022, lp: 2600 });
      if ([0, 3, 6, 10, 12].includes(s) && leadRnd > .35) note(midi(song.lead[Math.floor(leadRnd * 5)]), t, spb * 2.6, { ...M(), type: "triangle", vol: .06, vib: 3 });
    } else if (song.style === "drive") {
      if (s % 4 === 0) kick(t, .55);
      if (s === 4 || s === 12) snare(t, .12);
      if (s % 4 === 2) hat(t, .07, .09);
      if (s % 2 === 0) note(midi(root + (s % 4 ? 12 : 0)), t, spb * 1.5, { ...M(), type: "sawtooth", vol: .07, lp: 700 + 300 * Math.sin(bar) });
      note(midi(ch[s % ch.length] + 12), t, spb * .9, { ...M(), type: "sawtooth", vol: .018, lp: 1800 });
      if ((s === 0 || s === 6 || s === 12) && leadRnd > .4) note(midi(song.lead[Math.floor(leadRnd * 5)]), t, spb * 3, { ...M(), type: "square", vol: .035, lp: 2200 });
    } else if (song.style === "oompah") {
      if (s === 0 || s === 8) { kick(t, .35); note(midi(s ? ch[2] - 24 : root), t, spb * 3, { ...M(), type: "triangle", vol: .22, lp: 600 }); }
      if (s === 4 || s === 12) { snare(t, .08); ch.forEach(n => note(midi(n), t, spb * 1.2, { ...M(), type: "square", vol: .03, lp: 2000 })); }
      if (s % 2 === 0 && leadRnd > .3) note(midi(song.lead[Math.floor(leadRnd * 5)]), t, spb * 1.8, { ...M(), type: "square", vol: .04, lp: 3000, detune: 8 });
      if (s % 2 === 0 && leadRnd > .3) note(midi(song.lead[Math.floor(leadRnd * 5)]), t, spb * 1.8, { ...M(), type: "square", vol: .03, lp: 3000, detune: -8 });
    } else if (song.style === "lofi") {
      if (s === 0 || s === 10) kick(t, .4);
      if (s === 8) snare(t, .07);
      if (s % 2 === 0) hat(t, .025, .05);
      if (s === 0) ch.forEach((n, i) => note(midi(n), t + i * .02, spb * 15, { ...M(), type: "sine", vol: .045, attack: .08 }));
      if (s === 0 || s === 8) note(midi(root + 12), t, spb * 6, { ...M(), type: "sine", vol: .16 });
      if ([2, 5, 9, 13].includes(s) && leadRnd > .45) note(midi(song.lead[Math.floor(leadRnd * 5)]), t, spb * 4, { ...M(), type: "sine", vol: .05, vib: 4 });
    }
  }
  function musicTick() {
    const a = SND.ctx; if (!a || !SND.playing) return;
    while (SND.next < a.currentTime + .14) {
      if (SND.step % 16 === 0 && SND.pending >= 0) { SND.song = SND.pending; SND.pending = -1; SND.step = 0; hiss(SND.next, 1.4, { ...M(), hp: 3000, vol: .07 }); }
      const song = SONGS[SND.song], spb = 60 / song.bpm / 4, swing = song.style === "lofi" ? (SND.step % 2 ? .8 : 1.2) : 1;
      try { playStep(song, SND.step, SND.next, spb); } catch (e) { /* ignore */ }
      SND.next += spb * swing; SND.step++;
    }
  }
  function musicStart(level) {
    const a = audio(); if (!a) return;
    SND.song = level; SND.pending = -1; SND.step = 0; SND.next = a.currentTime + .08; SND.playing = true;
    SND.music.gain.cancelScheduledValues(a.currentTime); SND.music.gain.setTargetAtTime(.3, a.currentTime, .3);
    clearInterval(SND.timer); SND.timer = setInterval(musicTick, 25);
  }
  function musicLevel(level) { if (SND.playing && level !== SND.song) SND.pending = level; }
  function musicDuck(on) { if (SND.ctx && SND.music) SND.music.gain.setTargetAtTime(on ? .07 : .3, SND.ctx.currentTime, .15); }
  function musicStop(fade = .4) { SND.playing = false; clearInterval(SND.timer); if (SND.ctx && SND.music) SND.music.gain.setTargetAtTime(0, SND.ctx.currentTime, fade / 3); }
  function setSound(on) {
    SND.on = on; write(KEY.sound, on);
    if (!on) { musicStop(.1); if (SND.master) SND.master.gain.setTargetAtTime(0, SND.ctx.currentTime, .05); }
    else { audio(); if (SND.master) SND.master.gain.setTargetAtTime(.9, SND.ctx.currentTime, .05); if (G && (G.state === "run" || G.state === "finish")) musicStart(G.level); }
  }

  const SFX = {
    jump: () => play(t => { const p = 1 + Math.random() * .08; note(520 * p, t, .16, { type: "square", f2: 900 * p, vol: .045, lp: 2600 }); }),
    dbl: () => play(t => { [76, 79, 84].forEach((m, i) => note(midi(m), t + i * .045, .14, { type: "triangle", vol: .05 })); hiss(t, .18, { hp: 2500, vol: .05 }); }),
    land: () => play(t => { note(110, t, .12, { type: "sine", f2: 50, vol: .12 }); hiss(t, .08, { lp: 500, vol: .06 }); }),
    coin: n => play(t => { const b = 84 + [0, 2, 4, 7, 9, 12, 14, 16][Math.min(7, n)]; note(midi(b), t, .08, { type: "square", vol: .03, lp: 4000 }); note(midi(b + 7), t + .06, .14, { type: "square", vol: .03, lp: 4000 }); }),
    clear: n => play(t => note(midi(72 + [0, 2, 4, 7, 9, 12][n % 6]), t, .12, { type: "triangle", vol: .05 })),
    close: () => play(t => { hiss(t, .3, { bp: 1800, q: 2, vol: .12 }); note(1760, t + .05, .25, { type: "sine", vol: .05 }); }),
    hit: () => play(t => { hiss(t, .3, { lp: 1400, vol: .22 }); note(320, t, .4, { type: "sawtooth", f2: 60, vol: .1, lp: 1200 }); note(90, t, .2, { type: "sine", vol: .2 }); }),
    smash: () => play(t => { note(130, t, .3, { type: "sine", f2: 35, vol: .3 }); hiss(t, .4, { lp: 2400, vol: .2 }); note(240, t, .12, { type: "square", f2: 80, vol: .06, lp: 900 }); }),
    cake: () => play(t => [72, 76, 79, 84, 88].forEach((m, i) => { note(midi(m), t + i * .07, .5, { type: "sine", vol: .07 }); note(midi(m + 12), t + i * .07, .25, { type: "triangle", vol: .02 }); })),
    massage: () => play(t => { hiss(t, 1, { lp: 900, vol: .08 }); [79, 84, 88].forEach((m, i) => note(midi(m), t + .15 + i * .18, 1.2, { type: "sine", vol: .05, vib: 5, attack: .05 })); }),
    yog: () => play(t => { note(180, t, .55, { type: "sawtooth", f2: 1300, vol: .07, lp: 2400 }); [60, 64, 67, 72, 76, 79].forEach((m, i) => note(midi(m + 12), t + .25 + i * .05, .12, { type: "square", vol: .03, lp: 3000 })); }),
    wine: () => play(t => { [0, .12, .24].forEach(d => note(420, t + d, .1, { type: "sine", f2: 190, vol: .1 })); note(2600, t + .45, .5, { type: "sine", vol: .05 }); note(3400, t + .46, .4, { type: "sine", vol: .035 }); }),
    combo: () => play(t => [67, 72, 76, 79].forEach((m, i) => note(midi(m), t + i * .06, .22, { type: "triangle", vol: .06 }))),
    level: () => play(t => { hiss(t, 1.2, { hp: 3000, vol: .08 }); [[60, 64, 67], [65, 69, 72], [67, 71, 74, 79]].forEach((ch, i) => ch.forEach(m => note(midi(m), t + i * .14, .4 + (i === 2 ? .5 : 0), { type: "sawtooth", vol: .025, lp: 2200 }))); }),
    ding: () => play(t => { note(1568, t, .25, { type: "sine", vol: .05 }); note(2093, t + .11, .35, { type: "sine", vol: .05 }); }),
    over: () => play(t => [[62, .32], [61, .32], [60, .32], [59, 1.3]].reduce((at, [m, d], i) => { note(midi(m - 12), at, d, { type: "sawtooth", vol: .1, lp: 900, vib: i === 3 ? 7 : 0, vibRate: 5, attack: .03 }); return at + d * (i === 3 ? 1 : .95); }, t)),
    win: () => play(t => { hiss(t, 1.6, { hp: 2500, vol: .1 }); [[60, 0], [64, .12], [67, .24], [72, .36], [67, .6], [72, .72]].forEach(([m, d]) => { note(midi(m), t + d, .5, { type: "sawtooth", vol: .045, lp: 2600 }); note(midi(m + 12), t + d, .3, { type: "square", vol: .02, lp: 3000 }); }); }),
    pop: () => play(t => { hiss(t, .35, { hp: 500, vol: .14 }); for (let i = 0; i < 5; i++) hiss(t + .1 + Math.random() * .3, .04, { hp: 3000, vol: .05 }); }),
    tap: () => play(t => note(1200, t, .04, { type: "sine", vol: .03 }))
  };
  let G = null, cv, ctx, W = 0, H = 0, dpr = 1, VW = 720, S = 1, TOP = 0, PX = 300, VK = 1, raf = 0, last = 0;
  const bag = [];
  function reset() {
    G = { state: "title", t: 0, dist: 0, lives: 3, score: 0, y: 0, vy: 0, jumps: 0, buffer: 0, inv: 0, shake: 0, v: 0, v0: 0,
      fx: { massage: 0, yog: 0, wine: 0 }, slow: 1, giant: 1, shrink: 1, ph: 0, obs: [], bon: [], parts: [], pops: [], spl: [], lines: [], rockets: [], amb: [],
      nextObs: 560, nextBonus: 1500, lastType: "", seen: {}, endT: 0, hug: 0, cleared: 0, smashed: 0, picked: 0, closeCalls: 0,
      combo: 0, bestCombo: 0, level: 0, levelT: 0, noteIdx: 0, coinN: 0, coinT: -9, freeze: 0, flash: 0, flashCol: "255,255,255",
      sq: 1, sqv: 0, lean: 0, hair: 2, hlift: 0, camY: 0, zoom: 1, punch: 0, fwT: 0, her: names().her, me: names().me,
      best: read(KEY.best, 0), newBest: false, cardShown: false };
    bag.length = 0;
  }
  const progress = () => clamp(G.dist / TOTAL, 0, 1);
  const mult = () => 1 + Math.min(3, Math.floor(G.combo / 5));

  function layout() {
    W = dlg.clientWidth || innerWidth; H = dlg.clientHeight || innerHeight; dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    VW = clamp(VH * W / H, W > H ? 720 : 500, 1200); S = W / VW; TOP = (H - VH * S) * .6; PX = VW * (W > H ? .45 : .34);
    VK = clamp((VW - PX) / 396, .8, 1); // narrow screens see less road ahead: run a little slower so reaction time stays the same
  }

  function weighted(list) { const sum = list.reduce((a, [, w]) => a + w, 0); let r = Math.random() * sum; for (const [k, w] of list) { r -= w; if (r <= 0) return k; } return list[0][0]; }
  function spawnObstacle(p, v) {
    const wts = LEVELS[G.level].weights;
    const type = weighted(Object.keys(OBST).filter(k => p >= OBST[k].min && !(k === "truck" && G.lastType === "truck")).map(k => [k, wts[k]]));
    const d = OBST[type], o = { type, x: VW + 40, w: d.w, h: d.h, v: pick(d.vars), seed: Math.random(), k: G.shrink, gap: 999 };
    if (!G.seen[type]) { G.seen[type] = 1; o.label = d.label; }
    G.obs.push(o); G.lastType = type;
    if (!o.label && Math.random() < .5) [[-34, 26], [d.w / 2, 46], [d.w + 34, 26]].forEach(([dx, dy]) => G.bon.push({ type: "heart", x: o.x + dx, h: d.h * G.shrink + dy, seed: Math.random() }));
    G.nextObs = G.dist + d.w + v * rand(1.12, 1.95) * (1 - .18 * p) + (type === "truck" ? v * .35 : 0);
  }
  function spawnBonus() {
    if (!bag.length) bag.push(...["cake", "massage", "yog", "wine"].sort(() => Math.random() - .5));
    const type = bag.pop(); let x = VW + 60;
    while (G.obs.some(o => x > o.x - 90 && x < o.x + o.w + 90)) x += 120;
    const b = { type, x, h: rand(118, 170), seed: Math.random() };
    if (!G.seen[type]) { G.seen[type] = 1; b.label = BONUS[type].label; }
    G.bon.push(b); G.nextBonus = G.dist + rand(2500, 3900);
  }

  /* ---------- juice: particles, splashes, flashes ---------- */
  function burst(x, y, n, cols, kind = "dot", spread = 1) {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, sp = rand(60, 260) * spread;
      G.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, life: rand(.5, 1.1), max: 1.1, col: pick(cols), size: rand(2, 5), kind, rot: rand(0, 6), vr: rand(-10, 10) }); }
    if (G.parts.length > 420) G.parts.splice(0, G.parts.length - 420);
  }
  const confetti = (x, y, n) => burst(x, y, n, ["#e8557a", "#ffd166", "#7cc4ff", "#8be38b", "#c9b4f0", "#fff"], "conf", 1.3);
  function popText(txt, x, y, col = "#111628") { G.pops.push({ txt, x, y, life: 1.1, col }); }
  function addScore(n, label, x, y, col) { G.score += n * (G.fx.wine > 0 ? 2 : 1); if (label) popText(label, x, y, col); }
  function splash(txt, x, y, o = {}) {
    if (G.spl.length > 5) G.spl.shift();
    G.spl.push({ txt, x, y, t: 0, life: o.life || .95, size: o.size || 20, col: o.col || "#ffd23f", ink: o.ink || "#1d2133", fg: o.fg || "#fff",
      rot: o.rot != null ? o.rot : rand(-.16, .16), spikes: o.spikes || 11, rays: !!o.rays, vy: o.vy == null ? -20 : o.vy });
  }
  const easeBack = k => 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2);
  function drawSplash(c, s) {
    const k = s.t / s.life, a = clamp(k > .72 ? 1 - (k - .72) / .28 : 1, 0, 1), sc = easeBack(Math.min(1, s.t / .22)) * (1 + Math.max(0, k - .72) * .5);
    c.save(); c.globalAlpha = a; c.translate(s.x, s.y + s.vy * s.t); c.rotate(s.rot); c.scale(sc, sc);
    c.font = `italic 900 ${s.size}px Outfit, Manrope, system-ui, sans-serif`; c.textAlign = "center"; c.textBaseline = "middle";
    const R = Math.max(c.measureText(s.txt).width * .66, s.size * 1.3);
    if (s.rays) { c.save(); c.rotate(s.t * .9); for (let i = 0; i < 16; i++) { c.rotate(Math.PI / 8); c.globalAlpha = a * .17; c.fillStyle = i % 2 ? s.col : "#fff"; c.beginPath(); c.moveTo(0, 0); c.lineTo(R * 1.9, -R * .26); c.lineTo(R * 1.9, R * .26); c.fill(); } c.restore(); c.globalAlpha = a; }
    c.beginPath(); for (let i = 0; i < s.spikes * 2; i++) { const an = i / (s.spikes * 2) * Math.PI * 2, r = i % 2 ? R * .74 : R * (1.04 + .08 * Math.sin(i * 2.3)); c.lineTo(Math.cos(an) * r, Math.sin(an) * r * .6); }
    c.closePath(); c.fillStyle = s.col; c.fill(); c.lineWidth = 3; c.lineJoin = "round"; c.strokeStyle = s.ink; c.stroke();
    c.fillStyle = "rgba(255,255,255,.35)"; c.beginPath(); c.ellipse(-R * .2, -R * .2, R * .45, R * .13, -.2, 0, Math.PI * 2); c.fill();
    c.lineWidth = s.size * .24; c.strokeStyle = s.ink; c.strokeText(s.txt, 0, 1); c.fillStyle = s.fg; c.fillText(s.txt, 0, 1);
    c.restore();
  }
  function flash(col, a) { if (reduced()) return; G.flash = Math.max(G.flash, a); G.flashCol = col; }
  function shake(a) { if (!reduced()) G.shake = Math.max(G.shake, a); }
  function vibrate(p) { if (navigator.vibrate) try { navigator.vibrate(p); } catch (e) { /* ignore */ } }

  /* ---------- actions ---------- */
  function press() {
    if (!G) return;
    if (G.state === "title") { start(); return; }
    if (G.state === "pause") { resume(); return; }
    if (G.state === "run") G.buffer = .14;
  }
  function tryJump() {
    if (G.buffer <= 0) return;
    if (G.y <= 0) { G.vy = JUMP; G.jumps = 1; G.buffer = 0; G.sq = 1.24; G.sqv = 0; SFX.jump(); burst(PX, GY, 7, ["#d6c49e", "#e9dcbf", "#fff"], "dot", .4); }
    else if (G.jumps < 2) {
      G.vy = DJUMP; G.jumps = 2; G.buffer = 0; G.sq = 1.28; G.sqv = 0; SFX.dbl();
      for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; G.parts.push({ x: PX, y: GY - G.y, vx: Math.cos(a) * 180, vy: Math.sin(a) * 60, life: .45, max: .45, col: "#fff", size: 2.6, kind: "dot" }); }
      if (Math.random() < .3) splash(pick(["WHEE!", "BOING!", "HOP!"]), PX - 40, GY - G.y - 70, { size: 14, col: "#7cc4ff", life: .7 });
    }
  }
  function land(vy) {
    G.sq = clamp(.9 + vy / 6000, .72, .92); G.sqv = 0; if (vy < -600) SFX.land();
    burst(PX, GY, 6, ["#d6c49e", "#e9dcbf"], "dot", .35);
  }
  function clearObstacle(o, cx, hw) {
    o.cleared = true; G.cleared++; G.combo++; G.bestCombo = Math.max(G.bestCombo, G.combo);
    const m = mult(), nth = G.seen[o.type] = (G.seen[o.type] || 1) + 1;
    addScore(25 * m, nth <= 3 ? `+${25 * m} ${pick(OBST[o.type].ok)}` : `+${25 * m}`, cx, GY - o.h * o.k - 24, "#2f9b8f");
    SFX.clear(G.combo);
    if (o.gap < 14) { G.closeCalls++; addScore(15, null); splash(pick(["CLOSE ONE!", "PHEW!", "NAILED IT!"]), cx, GY - o.h * o.k - 70, { size: 15, col: "#8be38b", life: .8 }); SFX.close(); }
    const word = COMBO_WORDS[G.combo];
    if (word) { splash(word, PX + 140, GY - 200, { size: 22, col: "#ff9f43", rays: true, life: 1.2 }); SFX.combo(); comboPop(); confetti(PX + 140, GY - 200, 24); }
    updateCombo();
  }
  function hurt(o) {
    o.hit = true; G.lives--; G.inv = 1.6; G.freeze = .09; shake(.4); flash("255,60,80", .28); SFX.hit(); vibrate(70); updateLives(-1);
    splash(pick(HIT_WORD[o.type]), PX + 10, GY - G.y - 150, { size: 20, col: "#ff5a6e", life: 1 });
    burst(PX + 10, GY - G.y - 60, 16, ["#e23b4e", "#ffb3c1", "#fff"]);
    const lost = G.combo >= 5; G.combo = 0; updateCombo();
    if (G.lives <= 0) gameOver(); else quip(lost ? `${pick(OBST[o.type].hit)} (combo lost 💔)` : pick(OBST[o.type].hit));
  }
  function smash(o) {
    o.smashed = true; G.smashed++; G.freeze = .05; shake(.25); G.punch = .05; SFX.smash(); vibrate(30);
    burst(o.x + o.w / 2, GY - o.h / 2, 30, o.type === "truck" ? ["#3b62d8", "#fff", "#1d2133"] : o.type === "paper" ? ["#f2c14e", "#7fb3e6", "#fff", "#f19a8f"] : ["#e23b4e", "#fff", "#f2a25c"], "conf", 1.5);
    splash(pick(SMASH_WORD), o.x + o.w / 2, GY - o.h - 30, { size: 22, col: "#7cc4ff", life: .8 });
    addScore(50, "+50", o.x + o.w / 2, GY - o.h - 10, "#4f8fe6");
  }
  function collect(b) {
    b.taken = true;
    if (b.type === "heart") {
      G.coinN = G.t - G.coinT < 1.2 ? G.coinN + 1 : 0; G.coinT = G.t; SFX.coin(G.coinN);
      addScore(10, "+10", b.x, GY - b.h - 14, "#e8557a"); burst(b.x, GY - b.h, 8, ["#e8557a", "#ffd1dc", "#fff"], "spark", .5); return;
    }
    const f = BONUS_FX[b.type]; G.picked++; SFX[b.type](); vibrate([15, 30, 15]); G.punch = .06; flash(f.flash, .4);
    splash(f.txt, Math.min(VW - 120, PX + 190), 92, { size: 28, col: f.col, rays: true, life: 1.4, vy: -6, rot: rand(-.06, .06) });
    confetti(b.x, GY - b.h, 40);
    if (b.type === "cake") { if (G.lives < 5) { G.lives++; updateLives(1); addScore(100, "+1 ❤️", b.x, GY - b.h - 20, "#e8557a"); } else addScore(300, "+300", b.x, GY - b.h - 20, "#d59a17"); }
    else { G.fx[b.type] = FX_LIFE[b.type]; addScore(100, "+100", b.x, GY - b.h - 20, "#d59a17"); updateFx(true); }
    quip(BONUS[b.type].quip, true);
  }
  function enterLevel(li) {
    G.level = li; G.levelT = 0; musicLevel(li); levelBanner(li);
    if (li > 0) { SFX.level(); flash("255,255,255", .45); G.punch = .04; confetti(PX, GY - 140, 30); }
  }
  function start() {
    const best = G.best; reset(); G.best = best; G.state = "run"; hideCard(); dlg.focus({ preventScroll: true });
    musicStart(0); enterLevel(0); updateLives(0); updateFx(true); updateCombo();
  }
  function pause() { if (G.state !== "run") return; G.state = "pause"; musicDuck(true); showCard("pause"); }
  function resume() { if (G.state !== "pause") return; G.state = "run"; musicDuck(false); hideCard(); dlg.focus({ preventScroll: true }); last = performance.now(); }
  function saveBest() { const s = Math.round(G.score); if (s > G.best) { G.best = s; G.newBest = true; write(KEY.best, s); refreshMenu(); } }
  function gameOver() { G.state = "over"; G.endT = 0; G.v0 = G.v; saveBest(); musicStop(.3); setTimeout(() => SFX.over(), 250); }
  function finish() {
    G.state = "finish"; G.endT = 0; G.vy = Math.max(G.vy, 0); G.combo = 0; updateCombo();
    addScore(500 + G.lives * 100, null); splash("MÜNCHEN!", PX + 40, GY - 210, { size: 30, col: "#ffd166", rays: true, life: 1.6, vy: -4 });
    saveBest(); SFX.win(); flash("255,240,200", .5); musicDuck(true);
  }

  /* ---------- simulation (fixed 120 Hz steps) ---------- */
  function step(h) {
    const p = progress();
    for (const k in G.fx) G.fx[k] = Math.max(0, G.fx[k] - h);
    const e4 = 1 - Math.exp(-h * 4);
    G.slow = lerp(G.slow, G.fx.massage > 0 ? .55 : 1, e4);
    G.giant = lerp(G.giant, G.fx.yog > 0 ? 1.45 : 1, 1 - Math.exp(-h * 6));
    G.shrink = lerp(G.shrink, G.fx.wine > 0 ? .58 : 1, e4);
    G.inv = Math.max(0, G.inv - h); G.buffer = Math.max(0, G.buffer - h);
    let v = 0;
    if (G.state === "run") { v = (300 + 170 * p) * VK * G.slow; const rem = TOTAL - G.dist; if (rem < 560) v = Math.min(v, 28 + rem * .85); }
    else if (G.state === "over") v = G.v0 * Math.max(0, 1 - G.endT * 2.4);
    G.v = v; const dx = v * h; G.dist = Math.min(TOTAL, G.dist + dx);
    G.ph += h * (v > 0 ? 9 + v / 300 * 5 : 0);
    if (G.state === "run") tryJump();
    const wasAir = G.y > 0, vyBefore = G.vy;
    G.vy -= GRAV * h; G.y += G.vy * h;
    if (G.y <= 0) { if (wasAir && G.state !== "over") land(vyBefore); G.y = 0; G.vy = 0; G.jumps = 0; }
    if (G.state === "run") {
      if (G.dist >= G.nextObs && G.dist < TOTAL - 1400) spawnObstacle(p, v / G.slow);
      if (G.dist >= G.nextBonus && G.dist < TOTAL - 1400) spawnBonus();
      const li = levelAt(p); if (li !== G.level) enterLevel(li);
      while (G.noteIdx < NOTES.length && p >= NOTES[G.noteIdx].p) showNote(NOTES[G.noteIdx++]);
    }
    G.obs.forEach(o => { o.x -= dx; o.k = G.shrink; }); G.bon.forEach(b => { b.x -= dx; });
    G.parts.forEach(q => { q.x -= dx * .9; }); G.lines.forEach(l => { l.x -= dx * 2.2; });
    G.obs = G.obs.filter(o => o.x + o.w > -160); G.bon = G.bon.filter(b => !b.taken && b.x > -80);
    if (G.state === "run") {
      const gs = G.giant, pl = PX - 12 * gs, pr = PX + 12 * gs, pb = G.y, cy = G.y + 55 * gs;
      for (const o of G.obs) {
        if (o.hit || o.smashed) continue;
        const cx = o.x + o.w / 2, hw = o.w * o.k / 2 - 7, top = o.h * o.k - 5;
        if (pr > cx - hw && pl < cx + hw) {
          if (pb < top) { if (G.fx.yog > 0) smash(o); else if (G.inv <= 0) hurt(o); if (G.state !== "run") break; continue; }
          o.gap = Math.min(o.gap, pb - top);
        }
        if (!o.cleared && cx + hw < pl) clearObstacle(o, cx, hw);
      }
      for (const b of G.bon) { if (b.taken) continue; const r = 34 * gs + (b.type === "heart" ? 10 : 20); if (Math.hypot(b.x - PX, b.h - cy) < r) collect(b); }
      G.score += dx * .02 * (G.fx.wine > 0 ? 2 : 1);
      if ((v > 400 || G.fx.yog > 0) && Math.random() < h * 30) G.lines.push({ x: VW + 20, y: rand(GY - 230, GY - 8), len: rand(40, 110), a: rand(.25, .5) });
      if (TOTAL - G.dist < 1) { G.dist = TOTAL; finish(); }
    }
    G.lines = G.lines.filter(l => l.x + l.len > -20);
    if (G.state === "finish" || G.state === "over") G.endT += h;
    if (G.state === "finish") G.hug = Math.min(1, G.hug + h * .9);
  }

  /* ---------- per-frame visuals ---------- */
  function ambType() { return LEVELS[G.level].amb; }
  function ambSpawn(q, init) {
    const type = ambType(), yTop = -TOP / S; q.type = type; q.ph = rand(0, 6); q.life = rand(4, 9);
    q.x = rand(-20, VW + 60);
    if (type === "fireflies") { q.y = rand(GY - 150, GY - 10); q.vx = rand(-20, 10); q.vy = rand(-8, 8); q.s = rand(1.4, 2.6); q.col = "255,230,120"; }
    else if (type === "motes") { q.y = init ? rand(yTop, GY) : GY + 10; q.vx = rand(-40, -10); q.vy = rand(-14, -6); q.s = rand(1, 2.2); q.col = "255,255,255"; }
    else { q.y = init ? rand(yTop, GY) : yTop - 10; q.vx = type === "snow" ? rand(-30, -8) : rand(-70, -30); q.vy = type === "snow" ? rand(16, 36) : rand(24, 48); q.s = type === "snow" ? rand(1.4, 3) : rand(2.4, 4);
      q.col = type === "snow" ? "255,255,255" : type === "leaves" ? pick(["233,130,58", "217,87,47", "242,179,61", "201,72,58"]) : pick(["255,170,200", "255,255,255", "255,214,232"]); }
  }
  function visuals(dt) {
    const run = G.state === "run";
    G.sqv += ((1 - G.sq) * 260 - G.sqv * 16) * dt; G.sq += G.sqv * dt;
    const leanT = G.state === "over" ? 0 : G.y > 0 ? clamp(.08 - G.vy / 6000, -.08, .22) : run ? .04 + (G.v - 300) / 5000 : 0;
    G.lean = lerp(G.lean, leanT, 1 - Math.exp(-dt * 8));
    G.hair = lerp(G.hair, G.y > 0 ? 10 : run ? 5 + G.v / 110 : 1.5, 1 - Math.exp(-dt * 5));
    G.hlift = lerp(G.hlift, G.y > 0 ? clamp(G.vy / 60, -12, 4) : run ? -2 : 0, 1 - Math.exp(-dt * 7));
    G.camY = lerp(G.camY, clamp(G.y * .22, 0, 60), 1 - Math.exp(-dt * 6));
    G.zoom = lerp(G.zoom, G.state === "finish" ? 1.28 : 1, 1 - Math.exp(-dt * (G.state === "finish" ? 1.4 : 5)));
    G.punch = Math.max(0, G.punch - dt * .25); G.flash = Math.max(0, G.flash - dt * 2.6); G.shake = Math.max(0, G.shake - dt);
    if (run) G.levelT += dt;
    if (G.amb.length < (W < 600 ? 22 : 36)) { const q = {}; ambSpawn(q, true); G.amb.push(q); }
    const yTop = -TOP / S - 20;
    G.amb.forEach(q => {
      q.ph += dt; q.life -= dt;
      q.x += (q.vx + Math.sin(q.ph * 1.7) * 14) * dt - G.v * dt * .25; q.y += (q.vy + (q.type === "fireflies" ? Math.sin(q.ph * 2.3) * 12 : 0)) * dt;
      if (q.x < -30 || q.y > GY + 60 || q.y < yTop - 20 || (q.type === "fireflies" && q.life < 0) || (q.type !== ambType() && Math.random() < dt * .8)) ambSpawn(q, false);
    });
    G.spl.forEach(s => { s.t += dt; }); G.spl = G.spl.filter(s => s.t < s.life);
    G.parts.forEach(q => { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += (q.kind === "heart" ? -40 : q.kind === "spark" ? 140 : q.kind === "conf" ? 260 : 520) * dt; if (q.kind === "conf") { q.vx *= 1 - dt * 1.6; q.rot += q.vr * dt; } else if (q.kind === "spark") { q.vx *= 1 - dt * 1.5; q.vy *= 1 - dt * 1.2; } q.life -= dt; });
    G.parts = G.parts.filter(q => q.life > 0);
    G.pops.forEach(q => { q.y -= 40 * dt; q.life -= dt; }); G.pops = G.pops.filter(q => q.life > 0);
    if (G.state === "finish") {
      if (Math.random() < dt * 6) burst(PX + 52, GY - 120, 1, ["#e8557a", "#ff8fab"], "heart", .35);
      G.fwT -= dt; if (G.fwT <= 0 && G.endT > .4) { G.fwT = rand(.35, .7); G.rockets.push({ x: rand(VW * .2, VW * .95), y: GY, vy: -rand(330, 420), tgt: rand(40, 150), col: pick(["#ff6b9a", "#ffd166", "#7cc4ff", "#8be38b", "#c9b4f0", "#fff"]) }); }
      if (G.endT > 2.6 && !G.cardShown) showCard("win");
    }
    G.rockets.forEach(r => { r.y += r.vy * dt; if (r.y <= r.tgt) { r.done = true; SFX.pop(); for (let i = 0; i < 44; i++) { const a = i / 44 * Math.PI * 2, sp = rand(90, 170); G.parts.push({ x: r.x, y: r.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(1, 1.6), max: 1.6, col: r.col, size: rand(1.6, 2.6), kind: "spark" }); } } });
    G.rockets = G.rockets.filter(r => !r.done);
    if (G.state === "over" && G.endT > 1 && !G.cardShown) showCard("over");
  }

  function update(dt) {
    G.t += dt; visuals(dt);
    if (G.state === "title" || G.state === "pause") return;
    if (G.freeze > 0) { G.freeze -= dt; return; }
    let acc = dt; while (acc > 1e-6) { const h = Math.min(acc, 1 / 120); step(h); acc -= h; }
    updateHud();
  }

  /* ---------- rendering ---------- */
  function draw() {
    const c = ctx, p = progress(), t = G.t, pal = palette(p);
    c.setTransform(dpr * S, 0, 0, dpr * S, 0, TOP * dpr);
    const yTop = -TOP / S - 4, yBot = (H - TOP) / S + 4;
    c.save();
    if (G.shake > 0) c.translate(rand(-1, 1) * 16 * G.shake, rand(-1, 1) * 10 * G.shake);
    c.translate(0, G.camY);
    const z = G.zoom + G.punch, fx = G.state === "finish" ? PX + 40 : PX, fy = G.state === "finish" ? GY - 70 : GY - 60;
    if (Math.abs(z - 1) > .001) { c.translate(fx, fy); c.scale(z, z); c.translate(-fx, -fy); }
    const wineK = smooth(.98, .6, G.shrink);
    if (wineK > .01 && !reduced()) { c.translate(VW / 2, GY); c.rotate(Math.sin(t * 1.7) * .012 * wineK); c.translate(-VW / 2, -GY); }
    sky(c, -80, yTop - 140, VW + 160, GY - yTop + 144, pal, t, VW);
    sunMoon(c, VW, p, pal, t);
    const L = LEVELS[G.level], gx = G.state === "title" ? VW + 200 - (t * 30) % (VW + 700) : VW + 140 - G.levelT * 44;
    if (gx > -420) skyGag(c, L.gag, gx, t, G.her);
    clouds(c, VW, G.dist, t, pal);
    mountains(c, VW, GY, G.dist, p, pal);
    const lights = hills(c, VW, GY, G.dist, p, pal, t);
    const lmX = l => PX + (l.p * TOTAL - G.dist) * l.f + l.off, covers = [];
    LANDMARKS.forEach(l => { if (l.f >= 1) return; const x = lmX(l); if (x < -320 || x > VW + 320) return; covers.push(x); c.save(); c.translate(x, GY - 8); l.draw(c, t); c.restore(); });
    if (pal.n > .01) {
      c.fillStyle = `rgba(12,14,44,${.34 * pal.n})`; c.fillRect(-80, yTop - 140, VW + 160, GY - yTop + 150);
      c.save(); c.globalCompositeOperation = "lighter";
      lights.forEach(([x, y, r, col]) => { if (covers.some(cx => Math.abs(x - cx) < 160)) return; const g = c.createRadialGradient(x, y, 1, x, y, r); g.addColorStop(0, `rgba(${col},${.38 * pal.n})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); });
      c.restore();
    }
    G.rockets.forEach(r => { c.fillStyle = r.col; c.fillRect(r.x - 1.2, r.y, 2.4, 9); c.fillStyle = "rgba(255,220,160,.5)"; c.fillRect(r.x - .6, r.y + 9, 1.2, 14); });
    ground(c, VW, GY, G.dist, p, pal, yBot + 80);
    LANDMARKS.forEach(l => { if (l.f < 1) return; const x = lmX(l); if (x < -120 || x > VW + 120) return; c.save(); c.translate(x, GY - 1); l.draw(c, t); c.restore(); });
    G.lines.forEach(l => { const g = c.createLinearGradient(l.x, 0, l.x + l.len, 0); g.addColorStop(0, `rgba(255,255,255,${l.a * (1 - .6 * pal.n)})`); g.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = g; c.fillRect(l.x, l.y, l.len, 1.6); });
    G.obs.forEach(o => {
      if (o.smashed) return;
      c.save(); c.translate(o.x + o.w / 2, GY + 1); c.scale(o.k, o.k * (1 + Math.sin(t * 6 + o.seed * 9) * .015)); c.translate(-o.w / 2, 0); if (o.hit) c.globalAlpha = .55; drawObstacle(c, o, t); c.restore();
      if (o.label && o.x < VW) { const lx = o.x + o.w / 2, ly = GY - o.h * o.k - 30 + Math.sin(t * 4) * 2; c.font = "800 11px Outfit, Manrope, system-ui"; const tw = c.measureText(o.label).width + 18;
        c.fillStyle = "rgba(17,22,40,.88)"; rr(c, lx - tw / 2, ly - 11, tw, 22, 11); c.fill(); text(c, o.label, lx, ly, 11, "#fff", 800); }
    });
    G.bon.forEach(b => {
      const by = GY - b.h + Math.sin(t * 3 + b.seed * 6) * 4; c.save(); c.translate(b.x, by); if (b.type !== "heart") c.scale(1 + Math.sin(t * 5 + b.seed) * .05, 1 + Math.sin(t * 5 + b.seed) * .05); drawBonus(c, b, t); c.restore();
      if (b.type !== "heart") for (let i = 0; i < 3; i++) { const a = t * 2 + i * 2.1 + b.seed * 6, r = 26 + Math.sin(t * 3 + i) * 4, tw = .5 + .5 * Math.sin(t * 7 + i * 3); c.fillStyle = `rgba(255,255,255,${.9 * tw})`; c.save(); c.translate(b.x + Math.cos(a) * r, by + Math.sin(a) * r); c.rotate(Math.PI / 4); c.fillRect(-1.6, -1.6, 3.2, 3.2); c.restore(); }
      if (b.label) { c.font = "800 11px Outfit, Manrope, system-ui"; const tw = c.measureText(b.label).width + 18; c.fillStyle = "rgba(232,85,122,.94)"; rr(c, b.x - tw / 2, by - 52, tw, 22, 11); c.fill(); text(c, b.label, b.x, by - 41, 11, "#fff", 800); }
    });
    const hx = PX + (TOTAL - G.dist) + 74;
    if (hx < VW + 80) { c.save(); c.translate(hx, GY); c.fillStyle = "rgba(17,22,40,.14)"; c.beginPath(); c.ellipse(0, 1, 18, 4, 0, 0, Math.PI * 2); c.fill(); drawHim(c, t, G.state === "finish" && G.hug > .85 ? "hug" : "wave"); c.restore(); }
    // her
    const gs = G.giant, ox = G.state === "finish" ? G.hug * 34 : 0, sy = G.sq, sx = 1 + (1 - G.sq) * .7;
    c.fillStyle = "rgba(17,22,40,.16)"; c.beginPath(); c.ellipse(PX + ox, GY + 1, 16 * gs * (1 - Math.min(.6, G.y / 300)) * sx, 4, 0, 0, Math.PI * 2); c.fill();
    c.save(); c.translate(PX + ox, GY - G.y); c.rotate(G.lean); c.scale(gs * sx, gs * sy);
    if (G.fx.yog > 0) { const g = c.createRadialGradient(0, -60, 10, 0, -60, 84); g.addColorStop(0, "rgba(150,200,255,.6)"); g.addColorStop(1, "rgba(150,200,255,0)"); c.fillStyle = g; c.beginPath(); c.arc(0, -60, 84, 0, Math.PI * 2); c.fill(); }
    if (G.inv > 0 && G.state === "run" && Math.floor(t * 14) % 2) c.globalAlpha = .4;
    let mode = "idle";
    if (G.state === "run" || G.state === "pause") mode = G.y > 0 ? "air" : G.inv > 1.25 ? "hurt" : "run";
    else if (G.state === "over") mode = "fall";
    else if (G.state === "finish") mode = G.hug < .95 ? "run" : "hug";
    else if (G.state === "title") mode = t % 5 < 1.4 ? "wave" : "idle";
    drawHer(c, G.ph, mode, t, { flow: G.hair, lift: G.hlift }); c.restore();
    // ambience, particles, pops, splashes
    c.save(); c.globalCompositeOperation = "source-over";
    G.amb.forEach(q => {
      if (q.type === "fireflies") { const b = .5 + .5 * Math.sin(q.ph * 4); c.save(); c.globalCompositeOperation = "lighter"; const g = c.createRadialGradient(q.x, q.y, 0, q.x, q.y, 9); g.addColorStop(0, `rgba(${q.col},${.85 * b})`); g.addColorStop(1, `rgba(${q.col},0)`); c.fillStyle = g; c.fillRect(q.x - 9, q.y - 9, 18, 18); c.restore(); }
      else if (q.type === "leaves" || q.type === "petals") { c.save(); c.translate(q.x, q.y); c.rotate(q.ph * 2.2); c.fillStyle = `rgba(${q.col},.9)`; c.beginPath(); c.ellipse(0, 0, q.s, q.s * .5, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
      else { c.fillStyle = `rgba(${q.col},${q.type === "motes" ? .45 : .85})`; c.beginPath(); c.arc(q.x, q.y, q.s, 0, Math.PI * 2); c.fill(); }
    });
    c.restore();
    G.parts.forEach(q => {
      const a = clamp(q.life / q.max * 1.4, 0, 1); c.globalAlpha = a; c.fillStyle = q.col;
      if (q.kind === "heart") { heart(c, q.x, q.y, q.size * 2.2); c.fill(); }
      else if (q.kind === "conf") { c.save(); c.translate(q.x, q.y); c.rotate(q.rot); c.fillRect(-q.size, -q.size * .5, q.size * 2, q.size); c.restore(); }
      else if (q.kind === "spark") { c.save(); c.globalCompositeOperation = "lighter"; c.strokeStyle = q.col; c.lineCap = "round"; c.lineWidth = q.size; c.beginPath(); c.moveTo(q.x, q.y); c.lineTo(q.x - q.vx * .06, q.y - q.vy * .06); c.stroke(); c.globalAlpha = a * .3; c.beginPath(); c.arc(q.x, q.y, q.size * 2.2, 0, Math.PI * 2); c.fill(); c.restore(); }
      else { c.beginPath(); c.arc(q.x, q.y, q.size, 0, Math.PI * 2); c.fill(); }
    });
    c.globalAlpha = 1;
    G.pops.forEach(q => { c.globalAlpha = clamp(q.life * 1.6, 0, 1); c.font = "900 14px Outfit, Manrope, system-ui"; c.lineWidth = 4; c.strokeStyle = "rgba(255,255,255,.9)"; c.textAlign = "center"; c.strokeText(q.txt, q.x, q.y); text(c, q.txt, q.x, q.y, 14, q.col, 900); });
    c.globalAlpha = 1;
    G.spl.forEach(s => drawSplash(c, s));
    c.restore();
    // screen-space overlays
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const calm = smooth(1, .6, G.slow);
    if (calm > .01) { c.fillStyle = `rgba(160,130,230,${.16 * calm})`; c.fillRect(0, 0, W, H); }
    if (wineK > .01) { const g = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .3, W / 2, H / 2, Math.max(W, H) * .75); g.addColorStop(0, "rgba(200,40,90,0)"); g.addColorStop(1, `rgba(200,40,90,${.3 * wineK})`); c.fillStyle = g; c.fillRect(0, 0, W, H); }
    const vg = c.createRadialGradient(W / 2, H * .55, Math.min(W, H) * .45, W / 2, H * .55, Math.max(W, H) * .8); vg.addColorStop(0, "rgba(10,12,30,0)"); vg.addColorStop(1, `rgba(10,12,30,${.16 + .14 * pal.n})`); c.fillStyle = vg; c.fillRect(0, 0, W, H);
    if (G.flash > .01) { c.fillStyle = `rgba(${G.flashCol},${G.flash})`; c.fillRect(0, 0, W, H); }
    if (G.state === "run" && G.t < 9 && touchFirst()) { const yy = (TOP + (GY + 70) * S + H) / 2; c.globalAlpha = smooth(9, 6, G.t) * .8; const hc = pal.n > .5 ? "#f4f1ff" : "#1f4d2a"; text(c, "Tap anywhere to jump", W / 2, yy, 15, hc, 800); text(c, "tap again in the air for a double jump", W / 2, yy + 22, 12, hc, 600); c.globalAlpha = 1; }
  }

  function loop(now) {
    if (!dlg.open) { raf = 0; return; }
    raf = requestAnimationFrame(loop);
    const dt = Math.min(.1, Math.max(0, (now - last) / 1000)); last = now;
    update(dt); draw();
  }

  /* ---------- dialog, HUD, cards ---------- */
  const dlg = document.createElement("dialog");
  dlg.id = "nvx-game"; dlg.tabIndex = -1; dlg.setAttribute("aria-label", "Chronicles of Novartis");
  dlg.innerHTML = `<canvas aria-hidden="true"></canvas>
<div class="nvx-hud">
  <div class="nvx-pill nvx-lives" role="img" aria-label="Lives"></div>
  <div class="nvx-route" aria-hidden="true"><span>Innsbruck</span><div class="nvx-track"><i class="nvx-fill"></i>${[20, 40, 60, 80].map(x => `<u style="left:${x}%"></u>`).join("")}<b class="nvx-me"></b></div><span>München</span><em class="nvx-lvlname"></em></div>
  <div class="nvx-right"><div class="nvx-pill nvx-score">★ 0</div><button type="button" class="nvx-ib nvx-snd" data-a="sound" aria-label="Sound" aria-pressed="true"></button><button type="button" class="nvx-ib" data-a="pause" aria-label="Pause">${ICON.pause}</button><button type="button" class="nvx-ib" data-a="close" aria-label="Close the game">${ICON.x}</button></div>
  <div class="nvx-fx"><span class="nvx-combo" hidden></span><span class="nvx-chips"></span></div>
</div>
<div class="nvx-level" aria-hidden="true"><div class="rib"><small></small><b></b><span></span></div></div>
<div class="nvx-note" role="status" aria-live="polite"></div>
<div class="nvx-quip" role="status" aria-live="polite"></div>
<div class="nvx-card" hidden></div>`;
  document.body.appendChild(dlg);
  cv = dlg.querySelector("canvas"); ctx = cv.getContext("2d");
  const $g = sel => dlg.querySelector(sel);
  const hud = { lives: $g(".nvx-lives"), score: $g(".nvx-score"), fill: $g(".nvx-fill"), me: $g(".nvx-me"), chips: $g(".nvx-chips"), combo: $g(".nvx-combo"), lvl: $g(".nvx-lvlname"),
    quip: $g(".nvx-quip"), card: $g(".nvx-card"), level: $g(".nvx-level"), note: $g(".nvx-note"), snd: $g(".nvx-snd") };
  const restart = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

  function paintSound() { hud.snd.innerHTML = SND.on ? ICON.snd : ICON.mute; hud.snd.setAttribute("aria-pressed", String(SND.on)); hud.snd.title = SND.on ? "Sound on" : "Sound off"; }
  function updateLives(change) {
    const n = Math.max(3, G.lives); let h = "";
    for (let i = 0; i < n; i++) h += `<i class="${i < G.lives ? "" : "off"}">❤️</i>`;
    hud.lives.innerHTML = h; hud.lives.setAttribute("aria-label", `${G.lives} lives`);
    const icons = hud.lives.querySelectorAll("i");
    if (change > 0 && icons[G.lives - 1]) icons[G.lives - 1].classList.add("gain");
    if (change < 0 && icons[G.lives]) icons[G.lives].classList.add("lost");
  }
  function updateCombo() {
    const on = G.combo >= 2; hud.combo.hidden = !on;
    if (on) hud.combo.textContent = `🔥 ${G.combo} · ×${mult()}`;
  }
  function comboPop() { restart(hud.combo, "pop"); }
  let fxKey = "", hudScore = -1, hudShown = 0, hudP = -1, lvlShown = -1;
  function updateFx(force) {
    const on = Object.keys(G.fx).filter(k => G.fx[k] > 0), key = on.join();
    if (force || key !== fxKey) { fxKey = key; hud.chips.innerHTML = on.map(k => `<span class="nvx-chip" style="--k:${FX_ICON[k][1]}" data-k="${k}">${FX_ICON[k][0]}<b><i></i></b></span>`).join(""); }
    hud.chips.querySelectorAll(".nvx-chip").forEach(ch => { ch.querySelector("i").style.width = (G.fx[ch.dataset.k] / FX_LIFE[ch.dataset.k] * 100).toFixed(1) + "%"; });
  }
  function updateHud() {
    const s = Math.round(G.score); if (s !== hudScore) { if (s - hudScore >= 25 && hudScore >= 0) restart(hud.score, "bump"); hudScore = s; }
    hudShown = Math.abs(hudShown - s) < 1 ? s : hudShown + (s - hudShown) * .25; hud.score.textContent = `★ ${Math.round(hudShown)}`;
    const p = Math.round(progress() * 1000) / 10; if (p !== hudP) { hudP = p; hud.fill.style.width = p + "%"; hud.me.style.left = p + "%"; }
    if (lvlShown !== G.level) { lvlShown = G.level; hud.lvl.textContent = `${LEVELS[G.level].tag} · ${LEVELS[G.level].name}`; }
    updateFx(false);
  }
  let quipTimer = 0;
  function quip(msg, good) {
    const q = hud.quip; q.textContent = msg; q.classList.toggle("good", !!good); restart(q, "show");
    clearTimeout(quipTimer); quipTimer = setTimeout(() => q.classList.remove("show"), 2700);
  }
  function levelBanner(li) {
    const L = LEVELS[li], el = hud.level; el.style.setProperty("--a", L.sky[0]); el.style.setProperty("--b", L.sky[1]); el.style.setProperty("--c", L.sun);
    el.querySelector("small").textContent = L.tag; el.querySelector("b").textContent = L.name; el.querySelector("span").textContent = L.sub;
    restart(el, "show");
  }
  const noteQueue = []; let noteBusy = false;
  function showNote(n) { if (noteBusy) noteQueue.length = 0; noteQueue.push(n); if (!noteBusy) nextNote(); }
  function nextNote() {
    const n = noteQueue.shift(); if (!n) { noteBusy = false; return; } noteBusy = true;
    const fill = s => esc(s.replace("{me}", G.me).replace("{her}", G.her));
    hud.note.innerHTML = `<i>${n.ic}</i><div><div class="h"><span>${fill(n.app)}</span><span>now</span></div><b>${fill(n.title)}</b><p>${fill(n.text)}</p></div>`;
    restart(hud.note, "show"); SFX.ding(); setTimeout(nextNote, 4000);
  }
  const stat = (label, value) => `<span><b>${value}</b>${label}</span>`;
  const levelStrip = () => `<div class="nvx-levels">${LEVELS.map((L, i) => `<span style="--a:${L.sky[0]};--b:${L.sky[2]}"><b>${i + 1}</b>${esc(L.name.replace("Kufstein ", "").replace(" in Innsbruck", ""))}</span>`).join("")}</div>`;
  function showCard(kind) {
    const her = esc(G.her), me = esc(G.me), km = Math.round(progress() * KM), score = Math.round(G.score);
    let h = "";
    if (kind === "title") {
      h = `<p class="nvx-eyebrow">A satirical runner in five levels</p><h2>Chronicles of Novartis</h2>
<p class="nvx-sub">${her} has to get from <b>Innsbruck</b> to <b>München</b> — ${me} is waiting there. Jump over the QA life, grab the good stuff, keep the combo alive.</p>
${levelStrip()}
<div class="nvx-legend"><div><h3>Jump over</h3><ul>
<li><span>🚨</span><span>Escalations<small>P1, CAPA, audits, RE: RE:</small></span></li>
<li><span>🚚</span><span>Truck waiting for sign-off<small>A big one — jump twice</small></span></li>
<li><span>🧳</span><span>Friends for the weekend<small>…staying till Monday</small></span></li>
<li><span>📑</span><span>Parents' legal paperwork<small>Bring the original. And a copy.</small></span></li></ul></div>
<div><h3>Grab</h3><ul>
<li><span>🍰</span><span>Her cheesecake<small>+1 ❤️ morale</small></span></li>
<li><span>💆‍♀️</span><span>Massage<small>The world slows down</small></span></li>
<li><span>🥛</span><span>Giant yoghurt<small>Strength — smash everything</small></span></li>
<li><span>🍷</span><span>The wine box<small>Problems shrink · points ×2</small></span></li></ul></div></div>
<p class="nvx-keys">${touchFirst() ? "Tap anywhere to jump · tap again in the air for a double jump" : "<kbd>Space</kbd> to jump · again in the air for a double jump · <kbd>P</kbd> pause · <kbd>M</kbd> sound"}</p>
<div class="nvx-actions"><button type="button" class="nvx-btn go" data-a="start">Start running ▸</button></div>
${G.best ? `<p class="nvx-keys">Best so far: ★ ${G.best}</p>` : ""}`;
    } else if (kind === "pause") {
      h = `<p class="nvx-eyebrow">Coffee break ☕</p><h2>Paused</h2><p class="nvx-sub">${pick(["The escalations will wait. Probably.", "Hans the truck driver is fine. He has sandwiches.", "Out of office: 5 minutes. Maybe 6."])}</p>
<div class="nvx-actions"><button type="button" class="nvx-btn ghost" data-a="close">Back to the trip</button><button type="button" class="nvx-btn go" data-a="resume">Resume ▸</button></div>`;
    } else if (kind === "over") {
      h = `<i class="nvx-stamp no">REJECTED</i><p class="nvx-eyebrow">Out of office · ${esc(LEVELS[G.level].name)}</p><h2>${pick(["Escalated. Again.", "Ticket closed: won't fix", "Batch on hold", "Too many CCs", "Deviation #4711"])}</h2>
<p class="nvx-sub">${her} made it ${km} km of ${KM} — ${me} is still waiting in München. Have a slice of cheesecake and try again.</p>
<div class="nvx-stats">${stat("score", "★ " + score)}${stat("km run", km)}${stat("best combo", "🔥 " + G.bestCombo)}${stat(G.newBest ? "new best!" : "best", "★ " + G.best)}</div>
<div class="nvx-actions"><button type="button" class="nvx-btn ghost" data-a="close">Back to the trip</button><button type="button" class="nvx-btn go" data-a="start">Run again ▸</button></div>`;
    } else if (kind === "win") {
      h = `<i class="nvx-stamp ok">RELEASED ✓</i><p class="nvx-eyebrow">Willkommen in München</p><h2>Made it to ${me} 💗</h2>
<p class="nvx-sub">Batch “Weekend” approved by QA. ${G.cleared} problems jumped, ${G.smashed} smashed, ${G.closeCalls} close call${G.closeCalls === 1 ? "" : "s"}, ${G.picked} treats grabbed.</p>
<div class="nvx-stats">${stat("score", "★ " + score)}${stat("lives left", "❤️ " + G.lives)}${stat("best combo", "🔥 " + G.bestCombo)}${stat(G.newBest ? "new best!" : "best", "★ " + G.best)}</div>
<div class="nvx-actions"><button type="button" class="nvx-btn ghost" data-a="close">Back to the trip</button><button type="button" class="nvx-btn go" data-a="start">Run again ▸</button></div>`;
    }
    G.cardShown = true; hud.card.innerHTML = h; hud.card.hidden = false; restart(hud.card, "in");
    const btn = hud.card.querySelector(".nvx-btn.go"); if (btn && kind !== "title") setTimeout(() => btn.focus({ preventScroll: true }), 350);
  }
  function hideCard() { hud.card.hidden = true; G.cardShown = false; }

  dlg.addEventListener("click", e => {
    const a = e.target.closest("[data-a]")?.dataset.a; if (!a) return;
    if (a !== "sound") SFX.tap();
    if (a === "start") start(); else if (a === "resume") resume(); else if (a === "pause") { if (G.state === "run") pause(); else if (G.state === "pause") resume(); }
    else if (a === "sound") { setSound(!SND.on); paintSound(); dlg.focus({ preventScroll: true }); }
    else if (a === "close") dlg.close();
  });
  cv.addEventListener("pointerdown", e => { e.preventDefault(); press(); });
  addEventListener("keydown", e => {
    if (!dlg.open) return;
    e.stopPropagation();
    const jumpKey = e.code === "Space" || e.key === " " || e.code === "ArrowUp" || e.code === "KeyW";
    if (jumpKey && e.target.closest && e.target.closest("button") && G.state !== "run") return;
    if (jumpKey) { e.preventDefault(); if (!e.repeat) press(); return; }
    if (e.code === "KeyP") { e.preventDefault(); if (G.state === "run") pause(); else if (G.state === "pause") resume(); }
    if (e.code === "KeyM") { e.preventDefault(); setSound(!SND.on); paintSound(); }
  }, true);
  addEventListener("keyup", e => { if (dlg.open && (e.code === "Space" || e.key === " ") && !(e.target.closest && e.target.closest("button"))) e.preventDefault(); }, true);
  dlg.addEventListener("cancel", e => { if (G && G.state === "run") { e.preventDefault(); pause(); } });
  dlg.addEventListener("close", () => {
    cancelAnimationFrame(raf); raf = 0; musicStop(.2); noteQueue.length = 0; noteBusy = false;
    if (window.APP) window.APP.renderPaused = false;
    if (G && (G.state === "run" || G.state === "pause")) saveBest();
  });
  addEventListener("resize", () => { if (dlg.open) layout(); });
  document.addEventListener("visibilitychange", () => {
    if (!dlg.open || !G) return;
    if (document.hidden) { if (G.state === "run") pause(); if (SND.ctx) SND.ctx.suspend(); } else if (SND.ctx && SND.on) SND.ctx.resume();
  });

  function openGame() {
    if (dlg.open) return;
    closeInvite(false);
    document.querySelectorAll("dialog[open]").forEach(d => { if (d !== dlg) d.close(); });
    try { dlg.showModal(); } catch (e) { dlg.setAttribute("open", ""); }
    if (window.APP) window.APP.renderPaused = true;
    write(KEY.played, Date.now());
    reset(); layout(); updateLives(0); updateFx(true); updateCombo(); paintSound(); hudScore = hudP = lvlShown = -1; hudShown = 0; updateHud(); showCard("title");
    dlg.focus({ preventScroll: true });
    last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }

  /* ---------- the occasional invite ---------- */
  const INVITE = { first: 150, repeat: 900, perSession: 2, cooldown: 30 * 60e3, afterPlay: 2 * 3600e3, life: 28 };
  const INV_TITLES = ["Chill for two minutes?", "Escalation-free break?", "A tiny run to München?"];
  const INV_LINES = [
    "the escalations can wait. Run from Innsbruck to München — cheesecake and a wine box on the way.",
    "the truck can wait a bit longer for its signature. Fancy a quick run to {me}?",
    "dodge some paperwork, grab a giant yoghurt and find {me} in München. Two minutes, promise."
  ];
  let inv = null, invRaf = 0, invTimer = 0, lastInput = 0;
  addEventListener("pointerdown", () => { lastInput = Date.now(); }, { capture: true, passive: true });
  addEventListener("keydown", () => { lastInput = Date.now(); }, { capture: true, passive: true });

  function closeInvite(later) {
    if (!inv) return;
    const el = inv; inv = null; clearTimeout(invTimer); cancelAnimationFrame(invRaf);
    el.classList.remove("in"); el.classList.add("out"); setTimeout(() => el.remove(), 420);
    if (later) sess.next = Math.max(sess.next, sess.active + INVITE.repeat);
  }
  function showInvite() {
    if (inv || dlg.open) return;
    const n = names();
    inv = document.createElement("div"); inv.className = "nvx-invite"; inv.setAttribute("role", "dialog"); inv.setAttribute("aria-labelledby", "nvx-inv-h");
    inv.style.setProperty("--life", INVITE.life + "s");
    inv.innerHTML = `<div class="nvx-inv-art" aria-hidden="true"><canvas width="184" height="184"></canvas>${["🍰", "🍷", "💆‍♀️", "🥛"].map((e, i) => `<span class="orb" style="--i:${i}">${e}</span>`).join("")}</div>
<div class="nvx-inv-copy"><p class="nvx-eyebrow">Chronicles of Novartis</p><h3 id="nvx-inv-h">${pick(INV_TITLES)}</h3><p class="t">${esc(n.her)}, ${esc(pick(INV_LINES).replace("{me}", n.me))}</p></div>
<div class="nvx-inv-actions"><button type="button" class="nvx-btn ghost" data-a="later">Maybe later</button><button type="button" class="nvx-btn go" data-a="play">Let's play ▸</button></div>
<button type="button" class="nvx-inv-x" data-a="later" aria-label="Close">${ICON.x}</button><i class="nvx-inv-time"></i>`;
    inv.addEventListener("click", e => { const a = e.target.closest("[data-a]")?.dataset.a; if (a === "play") openGame(); else if (a === "later") closeInvite(true); });
    inv.addEventListener("keydown", e => { if (e.key === "Escape") closeInvite(true); });
    document.body.appendChild(inv);
    requestAnimationFrame(() => inv && inv.classList.add("in"));
    write(KEY.invite, Date.now());
    invTimer = setTimeout(() => closeInvite(true), INVITE.life * 1000);
    // a looping mini-scene: she runs in place and hops over an escalation
    const c = inv.querySelector("canvas").getContext("2d"), t0 = performance.now(), PXm = 96, T = 2.4;
    const fake = { type: "esc", w: 52, h: 60, v: "P1!", seed: .3 };
    const frame = now => {
      if (!inv) return; invRaf = requestAnimationFrame(frame);
      const t = (now - t0) / 1000, k = 184 / 240, cyc = (t % T) / T, ox = 300 - cyc * 400, cx = ox + 26;
      c.setTransform(k, 0, 0, k, 0, 0);
      const g = c.createLinearGradient(0, 0, 0, 240); g.addColorStop(0, "#9fd0f2"); g.addColorStop(1, "#fde4d0"); c.fillStyle = g; c.fillRect(0, 0, 240, 240);
      mountains(c, 240, 196, t * 60, .1); hills(c, 240, 196, t * 120, .1); ground(c, 240, 196, t * 240, .1);
      c.save(); c.translate(ox, 197); drawObstacle(c, fake, t); c.restore();
      const s = clamp((PXm + 80 - cx) / 160, 0, 1), y = s > 0 && s < 1 ? Math.sin(s * Math.PI) * 92 : 0;
      c.fillStyle = "rgba(17,22,40,.14)"; c.beginPath(); c.ellipse(PXm, 197, 15, 3.5, 0, 0, Math.PI * 2); c.fill();
      c.save(); c.translate(PXm, 196 - y); drawHer(c, t * 12, reduced() ? "idle" : y > 0 ? "air" : "run", t); c.restore();
      if (reduced()) cancelAnimationFrame(invRaf);
    };
    invRaf = requestAnimationFrame(frame);
  }

  const sess = { active: 0, next: INVITE.first, shown: 0 };
  const brandUp = () => { const b = document.getElementById("brand"); return !!(b && !b.hidden); };
  function autoAllowed() {
    const now = Date.now();
    return read("sbtrip-role", null) !== "me" && now - read(KEY.invite, 0) >= INVITE.cooldown && now - read(KEY.played, 0) >= INVITE.afterPlay;
  }
  function quietMoment() {
    const a = document.activeElement, mode = window.APP && window.APP.state && window.APP.state.mode;
    if (document.querySelector("dialog[open]")) return false;
    // full-screen overlays of the trip app: quiz, explore, interlude/finale, itinerary document
    if (["quiz", "xp", "inter", "finale", "pick"].some(id => { const el = document.getElementById(id); return el && !el.hidden; }) || document.querySelector("#doc.show")) return false;
    if (window.APP && window.APP.state && window.APP.state.quiz) return false;
    if (a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) return false;
    if (mode === "start" || mode === "pick") return false;
    return Date.now() - lastInput > 2500;
  }
  setInterval(() => {
    if (document.hidden || brandUp()) return;
    sess.active++;
    if (sess.active < sess.next || sess.shown >= INVITE.perSession || inv || dlg.open) return;
    if (!autoAllowed()) { sess.next = sess.active + 60; return; }
    if (!quietMoment()) return;
    sess.shown++; sess.next = sess.active + INVITE.repeat; showInvite();
  }, 1000);

  /* ---------- More menu entry + deep links ---------- */
  let menuBtn = null;
  function refreshMenu() { const st = menuBtn && menuBtn.querySelector(".st"); if (st) { const b = read(KEY.best, 0); st.textContent = b ? `★ ${b}` : "Play"; } }
  const menu = document.querySelector("#moredlg .menu");
  if (menu) {
    menuBtn = document.createElement("button"); menuBtn.type = "button"; menuBtn.className = "mi"; menuBtn.id = "btn-novartis";
    menuBtn.innerHTML = `<span class="ic">${ICON.game}</span><span><b>Chronicles of Novartis</b><small>A two-minute satirical runner · Innsbruck → München</small></span><span class="st">Play</span>`;
    menuBtn.addEventListener("click", openGame); menu.appendChild(menuBtn); refreshMenu();
  }
  if (qs.has("game")) setTimeout(openGame, 400);
  if (qs.has("game-invite")) { const w = setInterval(() => { if (!brandUp() && !document.querySelector("dialog[open]")) { clearInterval(w); setTimeout(showInvite, 1200); } }, 500); }
  window.NovartisGame = { open: openGame, invite: showInvite, _debug: { get G() { return G; }, SND, press, get PX() { return PX; }, TOTAL, sess: () => ({ ...sess, allowed: autoAllowed(), quiet: quietMoment(), hidden: document.hidden }) } };
})();
