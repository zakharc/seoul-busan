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

  const KEY = { best: "sbtrip-novartis-best-v1", invite: "sbtrip-novartis-invite-v1", played: "sbtrip-novartis-played-v1" };
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
#nvx-game .nvx-ib{pointer-events:auto;width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.78);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:0 4px 16px rgba(17,22,40,.12);color:#111628;border:0;cursor:pointer}
#nvx-game .nvx-ib svg{width:16px;height:16px}
#nvx-game .nvx-fx{grid-column:1/-1;display:flex;gap:6px;justify-content:center;min-height:30px}
#nvx-game .nvx-chip{display:flex;align-items:center;gap:6px;height:28px;padding:0 10px 0 8px;border-radius:999px;background:rgba(255,255,255,.85);font:700 12px var(--body,system-ui);box-shadow:0 3px 10px rgba(17,22,40,.12);animation:nvx-chip .4s cubic-bezier(.34,1.56,.64,1)}
#nvx-game .nvx-chip b{display:block;width:34px;height:4px;border-radius:9px;background:rgba(17,22,40,.1);overflow:hidden}
#nvx-game .nvx-chip b i{display:block;height:100%;background:var(--k,#e8557a)}
@keyframes nvx-chip{from{transform:scale(.6);opacity:0}to{transform:none;opacity:1}}
#nvx-game .nvx-quip{position:absolute;left:50%;top:calc(env(safe-area-inset-top,0px) + 96px);max-width:min(88vw,520px);transform:translate(-50%,-8px);opacity:0;padding:10px 16px;border-radius:16px;background:rgba(17,22,40,.86);color:#fff;font:600 14px/1.35 var(--body,system-ui);text-align:center;pointer-events:none;box-shadow:0 10px 30px rgba(17,22,40,.25)}
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
@media (max-width:600px){ #nvx-game .nvx-legend{grid-template-columns:1fr} #nvx-game .nvx-route span{display:none} #nvx-game .nvx-card{padding:18px 16px 14px} }
@media (max-height:520px){ #nvx-game .nvx-legend{display:none} #nvx-game .nvx-quip{top:62px} }

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
  function drawHer(c, ph, mode, t) {
    const run = mode === "run", air = mode === "air", sw = run ? Math.sin(ph) : 0;
    const bob = run ? -Math.abs(Math.cos(ph)) * 3.2 : mode === "idle" || mode === "hug" ? Math.sin(t * 2.4) * .8 : 0;
    c.save(); c.translate(0, bob);
    if (mode === "fall") { c.translate(-6, 0); c.rotate(-.42); }
    if (mode === "hurt") c.rotate(-.16);
    // long straight hair down her back, streaming behind while she runs
    const flow = run ? 7 + Math.sin(ph * 2) * 2.5 : air ? 10 : mode === "fall" ? 2 : 1.5;
    const lift = air ? -10 : run ? -2 : 0;
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

  /* ---------- scenery ---------- */
  const ridge = (x, s) => Math.sin(x * .0042 + s) * .5 + Math.sin(x * .0113 + s * 2.1) * .3 + Math.sin(x * .027 + s * .7) * .2;
  function sky(c, W, H, p) {
    const top = [lerp(118, 112, p), lerp(190, 150, p), lerp(238, 214, p)], bot = [lerp(226, 255, p), lerp(243, 214, p), lerp(252, 178, p)];
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, `rgb(${top.map(Math.round)})`); g.addColorStop(.75, `rgb(${bot.map(Math.round)})`); g.addColorStop(1, `rgb(${bot.map(Math.round)})`);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  function mountains(c, VW, GY, d, p) {
    const alps = 1 - .8 * smooth(.32, .86, p);
    const layer = (f, base, amp, s, col, snow) => {
      const off = d * f, pts = [];
      for (let x = -20; x <= VW + 20; x += 8) pts.push([x, GY - (base + amp * ridge(x + off, s)) * alps - 10]);
      c.beginPath(); c.moveTo(-20, GY + 4); pts.forEach(([x, y]) => c.lineTo(x, y)); c.lineTo(VW + 20, GY + 4); c.closePath(); c.fillStyle = col; c.fill();
      if (snow && alps > .45) {
        // caps hug the ridge: at most ~30 units deep, ending on a ragged line around the snow line
        const line = GY - snow; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
        for (let i = pts.length - 1; i >= 0; i--) { const [x, y] = pts[i], wx = x + off; c.lineTo(x, Math.max(y, Math.min(line + 9 * Math.sin(wx * .09) + 5 * Math.sin(wx * .23), y + 30))); }
        c.closePath(); c.fillStyle = `rgba(255,255,255,${.92 * smooth(.45, .8, alps)})`; c.fill();
      }
    };
    layer(.06, 150, 80, 1.3, `rgb(${Math.round(lerp(168, 196, p))},${Math.round(lerp(186, 176, p))},${Math.round(lerp(214, 200, p))})`, 168);
    layer(.12, 96, 52, 4.1, `rgb(${Math.round(lerp(128, 170, p))},${Math.round(lerp(152, 160, p))},${Math.round(lerp(186, 170, p))})`, 132);
  }
  function hills(c, VW, GY, d, p) {
    const off = d * .3; c.beginPath(); c.moveTo(-20, GY + 4);
    for (let x = -20; x <= VW + 20; x += 10) c.lineTo(x, GY - 34 - 18 * ridge(x + off, 7.7));
    c.lineTo(VW + 20, GY + 4); c.closePath(); c.fillStyle = p < .5 ? "#93c47d" : `rgb(${Math.round(lerp(147, 170, (p - .5) * 2))},${Math.round(lerp(196, 190, (p - .5) * 2))},${Math.round(lerp(125, 110, (p - .5) * 2))})`; c.fill();
    const f = .55, sp = 74, o = d * f, first = Math.floor((o - 60) / sp);
    for (let i = first; i < first + VW / sp + 3; i++) {
      if (hash(i) < .35) continue;
      const x = i * sp - o + hash(i + 3) * 40, s = .7 + hash(i + 7) * .6, conifer = hash(i + 11) > p * .85;
      c.save(); c.translate(x, GY - 6); c.scale(s, s);
      c.fillStyle = "#7a5b40"; c.fillRect(-2, -10, 4, 10);
      if (conifer) { c.fillStyle = "#3f7d5a"; [[0, 18], [10, 14], [19, 10]].forEach(([y, r]) => { c.beginPath(); c.moveTo(-r, -8 - y); c.lineTo(r, -8 - y); c.lineTo(0, -8 - y - r * 1.5); c.fill(); }); }
      else { c.fillStyle = "#5fa564"; c.beginPath(); c.arc(0, -24, 14, 0, Math.PI * 2); c.arc(-8, -18, 9, 0, Math.PI * 2); c.arc(8, -18, 9, 0, Math.PI * 2); c.fill(); }
      c.restore();
    }
  }
  function clouds(c, VW, d, t) {
    for (let i = 0; i < 6; i++) {
      const span = VW + 320, x = ((i * 241 - d * .05 - t * 6) % span + span) % span - 160, y = 40 + hash(i) * 90, s = .7 + hash(i + 2) * .7;
      c.fillStyle = "rgba(255,255,255,.85)"; c.beginPath(); c.ellipse(x, y, 38 * s, 12 * s, 0, 0, Math.PI * 2); c.ellipse(x - 16 * s, y - 6 * s, 18 * s, 13 * s, 0, 0, Math.PI * 2); c.ellipse(x + 12 * s, y - 9 * s, 20 * s, 15 * s, 0, 0, Math.PI * 2); c.fill();
    }
  }
  function ground(c, VW, GY, d, p) {
    c.fillStyle = p < .5 ? "#86bf72" : "#93c26f"; c.fillRect(-20, GY, VW + 40, 900);
    c.fillStyle = "#e9dcbf"; c.fillRect(-20, GY - 2, VW + 40, 18);
    c.fillStyle = "#d6c49e"; c.fillRect(-20, GY + 14, VW + 40, 3);
    c.fillStyle = "rgba(255,255,255,.75)"; const o = d % 46; for (let x = -o; x < VW + 20; x += 46) c.fillRect(x, GY + 6, 22, 2.4);
    c.fillStyle = "#6fae5f"; const o2 = d % 31; for (let x = -o2; x < VW + 20; x += 31) { const k = hash(Math.floor((x + d) / 31)); c.beginPath(); c.moveTo(x, GY + 30 + k * 30); c.lineTo(x + 3, GY + 22 + k * 30); c.lineTo(x + 6, GY + 30 + k * 30); c.fill(); }
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
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const ICON = {
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/></svg>',
    game: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="4.5" r="2"/><path d="m7 21 3-6 3 2v5M6 11l3-3 4 1 3 3 3 1M10 15l2-6"/></svg>'
  };

  let AC = null;
  function tone(f1, f2, dur, type = "sine", vol = .07, delay = 0) {
    if (localStorage.getItem("sbtrip-sound") !== "1") return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume();
      const t0 = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
      o.type = type; o.frequency.setValueAtTime(f1, t0); o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
      g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
      o.connect(g).connect(AC.destination); o.start(t0); o.stop(t0 + dur + .02);
    } catch (e) { /* audio is a nice-to-have */ }
  }
  const SFX = {
    jump: () => tone(420, 760, .16, "triangle", .05), dbl: () => tone(620, 1100, .16, "triangle", .05),
    coin: () => tone(1180, 1760, .1, "sine", .05), hit: () => tone(220, 70, .35, "sawtooth", .06),
    bonus: () => { tone(660, 990, .14, "triangle", .06); tone(990, 1320, .18, "triangle", .05, .1); },
    smash: () => tone(160, 60, .25, "square", .05),
    win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, f * 1.01, .3, "triangle", .06, i * .14)),
    over: () => [392, 330, 262].forEach((f, i) => tone(f, f * .98, .3, "triangle", .06, i * .18))
  };

  let G = null, cv, ctx, W = 0, H = 0, dpr = 1, VW = 720, S = 1, TOP = 0, PX = 300, VK = 1, raf = 0, last = 0;
  const bag = [];
  function reset() {
    G = { state: "title", t: 0, dist: 0, lives: 3, score: 0, y: 0, vy: 0, jumps: 0, buffer: 0, inv: 0, shake: 0, v: 0,
      fx: { massage: 0, yog: 0, wine: 0 }, slow: 1, giant: 1, shrink: 1, ph: 0, obs: [], bon: [], parts: [], pops: [],
      nextObs: 560, nextBonus: 1500, lastType: "", seen: {}, endT: 0, hug: 0, cleared: 0, smashed: 0, picked: 0, best: read(KEY.best, 0), newBest: false, cardShown: false };
    bag.length = 0;
  }
  const progress = () => clamp(G.dist / TOTAL, 0, 1);

  function layout() {
    W = dlg.clientWidth || innerWidth; H = dlg.clientHeight || innerHeight; dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    VW = clamp(VH * W / H, W > H ? 720 : 500, 1200); S = W / VW; TOP = (H - VH * S) * .6; PX = VW * (W > H ? .45 : .34);
    VK = clamp((VW - PX) / 396, .8, 1); // narrow screens see less road ahead: run a little slower so reaction time stays the same
  }

  function weighted(list) { const sum = list.reduce((a, [, d]) => a + d.wt, 0); let r = Math.random() * sum; for (const [k, d] of list) { r -= d.wt; if (r <= 0) return k; } return list[0][0]; }
  function spawnObstacle(p, v) {
    const type = weighted(Object.entries(OBST).filter(([k, d]) => p >= d.min && !(k === "truck" && G.lastType === "truck")));
    const d = OBST[type], o = { type, x: VW + 40, w: d.w, h: d.h, v: pick(d.vars), seed: Math.random(), k: G.shrink };
    if (!G.seen[type]) { G.seen[type] = 1; o.label = d.label; }
    G.obs.push(o); G.lastType = type;
    if (!o.label && Math.random() < .45) [[-34, 26], [d.w / 2, 46], [d.w + 34, 26]].forEach(([dx, dy]) => G.bon.push({ type: "heart", x: o.x + dx, h: d.h * G.shrink + dy, seed: Math.random() }));
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

  function burst(x, y, n, cols, kind = "dot", spread = 1) {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, sp = rand(60, 260) * spread;
      G.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, life: rand(.5, 1.1), max: 1.1, col: pick(cols), size: rand(2, 5), kind }); }
  }
  function popText(txt, x, y, col = "#111628") { G.pops.push({ txt, x, y, life: 1.1, col }); }
  function addScore(n, label, x, y, col) { G.score += n * (G.fx.wine > 0 ? 2 : 1); if (label) popText(label, x, y, col); }

  function press() {
    if (!G) return;
    if (G.state === "title") { start(); return; }
    if (G.state === "pause") { resume(); return; }
    if (G.state === "run") G.buffer = .14;
  }
  function tryJump() {
    if (G.buffer <= 0) return;
    if (G.y <= 0) { G.vy = JUMP; G.jumps = 1; G.buffer = 0; SFX.jump(); burst(PX, GY, 6, ["#d6c49e", "#e9dcbf"], "dot", .4); }
    else if (G.jumps < 2) { G.vy = DJUMP; G.jumps = 2; G.buffer = 0; SFX.dbl(); burst(PX, GY - G.y, 10, ["#fff", "#ffd1dc"], "dot", .5); }
  }
  function hurt(o) {
    o.hit = true; G.lives--; G.inv = 1.6; G.shake = .35; SFX.hit(); updateLives();
    if (navigator.vibrate) try { navigator.vibrate(60); } catch (e) { /* ignore */ }
    burst(PX + 10, GY - G.y - 60, 14, ["#e23b4e", "#ffb3c1", "#fff"]);
    if (G.lives <= 0) gameOver(); else quip(pick(OBST[o.type].hit));
  }
  function smash(o) {
    o.smashed = true; G.smashed++; G.shake = .18; SFX.smash();
    burst(o.x + o.w / 2, GY - o.h / 2, 26, o.type === "truck" ? ["#3b62d8", "#fff", "#1d2133"] : o.type === "paper" ? ["#f2c14e", "#7fb3e6", "#fff", "#f19a8f"] : ["#e23b4e", "#fff", "#f2a25c"], "dot", 1.4);
    addScore(50, "SMASH +50", o.x + o.w / 2, GY - o.h - 10, "#4f8fe6");
  }
  function collect(b) {
    b.taken = true;
    if (b.type === "heart") { SFX.coin(); addScore(10, "+10", b.x, GY - b.h - 14, "#e8557a"); burst(b.x, GY - b.h, 6, ["#e8557a", "#ffd1dc"]); return; }
    G.picked++; SFX.bonus(); burst(b.x, GY - b.h, 30, ["#fff", "#ffd1dc", "#ffe08a", "#c9b4f0"], "dot", 1.2);
    if (b.type === "cake") { if (G.lives < 5) { G.lives++; updateLives(); addScore(100, "+1 ❤️", b.x, GY - b.h - 20, "#e8557a"); } else addScore(300, "+300", b.x, GY - b.h - 20, "#d59a17"); }
    else { G.fx[b.type] = FX_LIFE[b.type]; addScore(100, "+100", b.x, GY - b.h - 20, "#d59a17"); updateFx(true); }
    quip(BONUS[b.type].quip, true);
  }
  function start() {
    const best = G.best; reset(); G.best = best; G.state = "run"; hideCard(); dlg.focus({ preventScroll: true });
    quip(touchFirst() ? "Go! Tap to jump — tap again in the air for a double jump" : "Go! Space to jump — press again in the air for a double jump", true);
    updateLives(); updateFx(true);
  }
  function pause() { if (G.state !== "run") return; G.state = "pause"; showCard("pause"); }
  function resume() { if (G.state !== "pause") return; G.state = "run"; hideCard(); dlg.focus({ preventScroll: true }); last = performance.now(); }
  function saveBest() { const s = Math.round(G.score); if (s > G.best) { G.best = s; G.newBest = true; write(KEY.best, s); refreshMenu(); } }
  function gameOver() { G.state = "over"; G.endT = 0; saveBest(); SFX.over(); }
  function finish() {
    G.state = "finish"; G.endT = 0; G.vy = Math.max(G.vy, 0);
    addScore(500 + G.lives * 100, `München! +${500 + G.lives * 100}`, PX + 40, GY - 150, "#e8557a"); saveBest(); SFX.win();
  }

  function update(dt) {
    G.t += dt;
    if (G.state === "pause" || G.state === "title") return;
    const p = progress();
    for (const k in G.fx) G.fx[k] = Math.max(0, G.fx[k] - dt);
    const e4 = 1 - Math.exp(-dt * 4);
    G.slow = lerp(G.slow, G.fx.massage > 0 ? .55 : 1, e4);
    G.giant = lerp(G.giant, G.fx.yog > 0 ? 1.45 : 1, 1 - Math.exp(-dt * 6));
    G.shrink = lerp(G.shrink, G.fx.wine > 0 ? .58 : 1, e4);
    G.inv = Math.max(0, G.inv - dt); G.shake = Math.max(0, G.shake - dt); G.buffer = Math.max(0, G.buffer - dt);
    let v = 0;
    if (G.state === "run") { v = (300 + 170 * p) * VK * G.slow; const rem = TOTAL - G.dist; if (rem < 560) v = Math.min(v, 28 + rem * .85); }
    else if (G.state === "over") v = G.v * Math.max(0, 1 - G.endT * 2.4);
    G.v = v; const dx = v * dt; G.dist = Math.min(TOTAL, G.dist + dx);
    G.ph += dt * (v > 0 ? 9 + v / 300 * 5 : 0);
    if (G.state === "run") tryJump();
    G.vy -= GRAV * dt; G.y += G.vy * dt;
    if (G.y <= 0) { if (G.vy < -500 && G.state === "run") burst(PX, GY, 5, ["#d6c49e", "#e9dcbf"], "dot", .35); G.y = 0; G.vy = 0; G.jumps = 0; }
    if (G.state === "run") {
      if (G.dist >= G.nextObs && G.dist < TOTAL - 1400) spawnObstacle(p, v / G.slow);
      if (G.dist >= G.nextBonus && G.dist < TOTAL - 1400) spawnBonus();
    }
    G.obs.forEach(o => { o.x -= dx; o.k = G.shrink; }); G.bon.forEach(b => { b.x -= dx; });
    G.parts.forEach(q => { q.x -= dx * .9; });
    G.obs = G.obs.filter(o => o.x + o.w > -160); G.bon = G.bon.filter(b => !b.taken && b.x > -80);
    if (G.state === "run") {
      const gs = G.giant, pl = PX - 12 * gs, pr = PX + 12 * gs, pb = G.y, cy = G.y + 55 * gs;
      for (const o of G.obs) {
        if (o.hit || o.smashed) continue;
        const cx = o.x + o.w / 2, hw = o.w * o.k / 2 - 7, top = o.h * o.k - 5;
        if (pr > cx - hw && pl < cx + hw && pb < top) { if (G.fx.yog > 0) smash(o); else if (G.inv <= 0) hurt(o); if (G.state !== "run") break; continue; }
        if (!o.cleared && cx + hw < pl) { o.cleared = true; G.cleared++; const nth = G.seen[o.type] = (G.seen[o.type] || 1) + 1; addScore(25, nth <= 3 ? `+25 ${pick(OBST[o.type].ok)}` : "+25", cx, GY - o.h * o.k - 24, "#2f9b8f"); }
      }
      for (const b of G.bon) { if (b.taken) continue; const r = 34 * gs + (b.type === "heart" ? 10 : 20); if (Math.hypot(b.x - PX, b.h - cy) < r) collect(b); }
      G.score += dx * .02 * (G.fx.wine > 0 ? 2 : 1);
      if (TOTAL - G.dist < 1) { G.dist = TOTAL; finish(); }
    }
    if (G.state === "finish" || G.state === "over") G.endT += dt;
    if (G.state === "finish") { G.hug = Math.min(1, G.hug + dt * .9); if (Math.random() < dt * 6) burst(PX + 52, GY - 120, 1, ["#e8557a", "#ff8fab"], "heart", .35); if (G.endT > 2.4 && !G.cardShown) showCard("win"); }
    if (G.state === "over" && G.endT > 1 && !G.cardShown) showCard("over");
    G.parts.forEach(q => { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += (q.kind === "heart" ? -40 : 520) * dt; q.life -= dt; });
    G.parts = G.parts.filter(q => q.life > 0);
    G.pops.forEach(q => { q.y -= 40 * dt; q.life -= dt; }); G.pops = G.pops.filter(q => q.life > 0);
    updateHud();
  }

  function draw() {
    const c = ctx, p = progress(), t = G.t;
    c.setTransform(dpr * S, 0, 0, dpr * S, 0, TOP * dpr);
    const yTop = -TOP / S - 4, yBot = (H - TOP) / S + 4;
    c.save();
    if (G.shake > 0) c.translate(rand(-1, 1) * 16 * G.shake, rand(-1, 1) * 10 * G.shake);
    const wineK = smooth(.98, .6, G.shrink);
    if (wineK > .01 && !reduced()) { c.translate(VW / 2, GY); c.rotate(Math.sin(t * 1.7) * .012 * wineK); c.translate(-VW / 2, -GY); }
    c.save(); c.translate(-30, yTop); sky(c, VW + 60, GY - yTop + 4, p); c.restore();
    c.fillStyle = `rgba(255,${Math.round(lerp(236, 190, p))},${Math.round(lerp(160, 120, p))},.9)`; c.beginPath(); c.arc(VW * .82, lerp(70, 150, p), 26, 0, Math.PI * 2); c.fill();
    clouds(c, VW, G.dist, t); mountains(c, VW, GY, G.dist, p); hills(c, VW, GY, G.dist, p);
    const lmX = l => PX + (l.p * TOTAL - G.dist) * l.f + l.off;
    LANDMARKS.forEach(l => { if (l.f >= 1) return; const x = lmX(l); if (x < -320 || x > VW + 320) return; c.save(); c.translate(x, GY - 8); l.draw(c, t); c.restore(); });
    ground(c, VW, GY, G.dist, p);
    c.fillStyle = "#86bf72"; c.fillRect(-20, yBot - 2, VW + 40, 4);
    LANDMARKS.forEach(l => { if (l.f < 1) return; const x = lmX(l); if (x < -120 || x > VW + 120) return; c.save(); c.translate(x, GY - 1); l.draw(c, t); c.restore(); });
    G.obs.forEach(o => {
      if (o.smashed) return;
      c.save(); c.translate(o.x + o.w / 2, GY + 1); c.scale(o.k, o.k); c.translate(-o.w / 2, 0); if (o.hit) c.globalAlpha = .55; drawObstacle(c, o, t); c.restore();
      if (o.label && o.x < VW) { const lx = o.x + o.w / 2, ly = GY - o.h * o.k - 30; c.font = "800 11px Outfit, Manrope, system-ui"; const tw = c.measureText(o.label).width + 18;
        c.fillStyle = "rgba(17,22,40,.86)"; rr(c, lx - tw / 2, ly - 11, tw, 22, 11); c.fill(); text(c, o.label, lx, ly, 11, "#fff", 800); }
    });
    G.bon.forEach(b => { const by = GY - b.h + Math.sin(t * 3 + b.seed * 6) * 4; c.save(); c.translate(b.x, by); drawBonus(c, b, t); c.restore();
      if (b.label) { c.font = "800 11px Outfit, Manrope, system-ui"; const tw = c.measureText(b.label).width + 18; c.fillStyle = "rgba(232,85,122,.92)"; rr(c, b.x - tw / 2, by - 50, tw, 22, 11); c.fill(); text(c, b.label, b.x, by - 39, 11, "#fff", 800); } });
    const hx = PX + (TOTAL - G.dist) + 74;
    if (hx < VW + 80) { c.save(); c.translate(hx, GY); c.fillStyle = "rgba(17,22,40,.12)"; c.beginPath(); c.ellipse(0, 1, 18, 4, 0, 0, Math.PI * 2); c.fill(); drawHim(c, t, G.state === "finish" && G.hug > .85 ? "hug" : "wave"); c.restore(); }
    // her
    const gs = G.giant, ox = G.state === "finish" ? G.hug * 34 : 0;
    c.fillStyle = "rgba(17,22,40,.14)"; c.beginPath(); c.ellipse(PX + ox, GY + 1, 16 * gs * (1 - Math.min(.6, G.y / 300)), 4, 0, 0, Math.PI * 2); c.fill();
    c.save(); c.translate(PX + ox, GY - G.y); c.scale(gs, gs);
    if (G.fx.yog > 0) { const g = c.createRadialGradient(0, -60, 10, 0, -60, 80); g.addColorStop(0, "rgba(150,200,255,.55)"); g.addColorStop(1, "rgba(150,200,255,0)"); c.fillStyle = g; c.beginPath(); c.arc(0, -60, 80, 0, Math.PI * 2); c.fill(); }
    if (G.inv > 0 && G.state === "run" && Math.floor(t * 14) % 2) c.globalAlpha = .4;
    let mode = "idle";
    if (G.state === "run") mode = G.y > 0 ? "air" : G.inv > 1.25 ? "hurt" : "run";
    else if (G.state === "over") mode = "fall";
    else if (G.state === "finish") mode = G.hug < .95 ? "run" : "hug";
    else if (G.state === "pause") mode = G.y > 0 ? "air" : "run";
    drawHer(c, G.ph, mode, t); c.restore();
    G.parts.forEach(q => { c.globalAlpha = clamp(q.life / q.max * 1.4, 0, 1); c.fillStyle = q.col; if (q.kind === "heart") { heart(c, q.x, q.y, q.size * 2.2); c.fill(); } else { c.beginPath(); c.arc(q.x, q.y, q.size, 0, Math.PI * 2); c.fill(); } });
    c.globalAlpha = 1;
    G.pops.forEach(q => { c.globalAlpha = clamp(q.life * 1.6, 0, 1); c.font = "900 14px Outfit, Manrope, system-ui"; c.lineWidth = 4; c.strokeStyle = "rgba(255,255,255,.9)"; c.textAlign = "center"; c.strokeText(q.txt, q.x, q.y); text(c, q.txt, q.x, q.y, 14, q.col, 900); });
    c.globalAlpha = 1; c.restore();
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const calm = smooth(1, .6, G.slow);
    if (calm > .01) { c.fillStyle = `rgba(160,130,230,${.16 * calm})`; c.fillRect(0, 0, W, H); }
    if (wineK > .01) { const g = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .3, W / 2, H / 2, Math.max(W, H) * .75); g.addColorStop(0, "rgba(200,40,90,0)"); g.addColorStop(1, `rgba(200,40,90,${.3 * wineK})`); c.fillStyle = g; c.fillRect(0, 0, W, H); }
    if (G.state === "run" && G.t < 9 && touchFirst()) { c.globalAlpha = smooth(9, 6, G.t) * .75; text(c, "Tap anywhere to jump", W / 2, (TOP + (GY + 70) * S + H) / 2, 15, "#2f6b3a", 800); text(c, "tap again in the air for a double jump", W / 2, (TOP + (GY + 70) * S + H) / 2 + 22, 12, "#2f6b3a", 600); c.globalAlpha = 1; }
  }

  function loop(now) {
    if (!dlg.open) { raf = 0; return; }
    raf = requestAnimationFrame(loop);
    const dt = Math.min(.034, Math.max(0, (now - last) / 1000)); last = now;
    update(dt); draw();
  }

  /* ---------- dialog, HUD, cards ---------- */
  const dlg = document.createElement("dialog");
  dlg.id = "nvx-game"; dlg.tabIndex = -1; dlg.setAttribute("aria-label", "Chronicles of Novartis");
  dlg.innerHTML = `<canvas aria-hidden="true"></canvas>
<div class="nvx-hud">
  <div class="nvx-pill nvx-lives" role="img" aria-label="Lives"></div>
  <div class="nvx-route" aria-hidden="true"><span>Innsbruck</span><div class="nvx-track"><i class="nvx-fill"></i><b class="nvx-me"></b></div><span>München</span></div>
  <div class="nvx-right"><div class="nvx-pill nvx-score">★ 0</div><button type="button" class="nvx-ib" data-a="pause" aria-label="Pause">${ICON.pause}</button><button type="button" class="nvx-ib" data-a="close" aria-label="Close the game">${ICON.x}</button></div>
  <div class="nvx-fx"></div>
</div>
<div class="nvx-quip" role="status" aria-live="polite"></div>
<div class="nvx-card" hidden></div>`;
  document.body.appendChild(dlg);
  cv = dlg.querySelector("canvas"); ctx = cv.getContext("2d");
  const $g = sel => dlg.querySelector(sel);
  const hud = { lives: $g(".nvx-lives"), score: $g(".nvx-score"), fill: $g(".nvx-fill"), me: $g(".nvx-me"), fx: $g(".nvx-fx"), quip: $g(".nvx-quip"), card: $g(".nvx-card") };

  function updateLives() {
    const n = Math.max(3, G.lives); let h = "";
    for (let i = 0; i < n; i++) h += `<i class="${i < G.lives ? "" : "off"}">❤️</i>`;
    hud.lives.innerHTML = h; hud.lives.setAttribute("aria-label", `${G.lives} lives`);
  }
  let fxKey = "", hudScore = -1, hudP = -1;
  function updateFx(force) {
    const on = Object.keys(G.fx).filter(k => G.fx[k] > 0), key = on.join();
    if (force || key !== fxKey) { fxKey = key; hud.fx.innerHTML = on.map(k => `<span class="nvx-chip" style="--k:${FX_ICON[k][1]}" data-k="${k}">${FX_ICON[k][0]}<b><i></i></b></span>`).join(""); }
    hud.fx.querySelectorAll(".nvx-chip").forEach(ch => { ch.querySelector("i").style.width = (G.fx[ch.dataset.k] / FX_LIFE[ch.dataset.k] * 100).toFixed(1) + "%"; });
  }
  function updateHud() {
    const s = Math.round(G.score), p = Math.round(progress() * 1000) / 10;
    if (s !== hudScore) { hudScore = s; hud.score.textContent = `★ ${s}`; }
    if (p !== hudP) { hudP = p; hud.fill.style.width = p + "%"; hud.me.style.left = p + "%"; }
    updateFx(false);
  }
  let quipTimer = 0;
  function quip(msg, good) {
    const q = hud.quip; q.textContent = msg; q.classList.toggle("good", !!good); q.classList.remove("show"); void q.offsetWidth; q.classList.add("show");
    clearTimeout(quipTimer); quipTimer = setTimeout(() => q.classList.remove("show"), 2700);
  }
  const stat = (label, value) => `<span><b>${value}</b>${label}</span>`;
  function showCard(kind) {
    const n = names(), her = esc(n.her), me = esc(n.me), km = Math.round(progress() * KM), score = Math.round(G.score);
    let h = "";
    if (kind === "title") {
      h = `<p class="nvx-eyebrow">A satirical runner · Episode 1</p><h2>Chronicles of Novartis</h2>
<p class="nvx-sub">${her} has to get from <b>Innsbruck</b> to <b>München</b> — ${me} is waiting there. Jump over the QA life, grab the good stuff.</p>
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
<p class="nvx-keys">${touchFirst() ? "Tap anywhere to jump · tap again in the air for a double jump" : "<kbd>Space</kbd> to jump · press again in the air for a double jump · <kbd>P</kbd> pause"}</p>
<div class="nvx-actions"><button type="button" class="nvx-btn go" data-a="start">Start running ▸</button></div>
${G.best ? `<p class="nvx-keys">Best so far: ★ ${G.best}</p>` : ""}`;
    } else if (kind === "pause") {
      h = `<p class="nvx-eyebrow">Coffee break ☕</p><h2>Paused</h2><p class="nvx-sub">The escalations will wait. Probably.</p>
<div class="nvx-actions"><button type="button" class="nvx-btn ghost" data-a="close">Back to the trip</button><button type="button" class="nvx-btn go" data-a="resume">Resume ▸</button></div>`;
    } else if (kind === "over") {
      h = `<p class="nvx-eyebrow">Out of office</p><h2>${pick(["Escalated. Again.", "Ticket closed: won't fix", "Batch on hold", "Too many CCs"])}</h2>
<p class="nvx-sub">${her} made it ${km} km of ${KM} — ${me} is still waiting in München. Have a slice of cheesecake and try again.</p>
<div class="nvx-stats">${stat("score", "★ " + score)}${stat("km run", km)}${stat(G.newBest ? "new best!" : "best", "★ " + G.best)}</div>
<div class="nvx-actions"><button type="button" class="nvx-btn ghost" data-a="close">Back to the trip</button><button type="button" class="nvx-btn go" data-a="start">Run again ▸</button></div>`;
    } else if (kind === "win") {
      h = `<p class="nvx-eyebrow">Willkommen in München</p><h2>Made it to ${me} 💗</h2>
<p class="nvx-sub">${G.cleared} problems jumped, ${G.smashed} smashed, ${G.picked} treats grabbed. The weekend is officially escalation-free.</p>
<div class="nvx-stats">${stat("score", "★ " + score)}${stat("lives left", "❤️ " + G.lives)}${stat(G.newBest ? "new best!" : "best", "★ " + G.best)}</div>
<div class="nvx-actions"><button type="button" class="nvx-btn ghost" data-a="close">Back to the trip</button><button type="button" class="nvx-btn go" data-a="start">Run again ▸</button></div>`;
    }
    G.cardShown = true; hud.card.innerHTML = h; hud.card.hidden = false; hud.card.classList.remove("in"); void hud.card.offsetWidth; hud.card.classList.add("in");
    const btn = hud.card.querySelector(".nvx-btn.go"); if (btn && kind !== "title") setTimeout(() => btn.focus({ preventScroll: true }), 350);
  }
  function hideCard() { hud.card.hidden = true; G.cardShown = false; }

  dlg.addEventListener("click", e => {
    const a = e.target.closest("[data-a]")?.dataset.a; if (!a) return;
    if (a === "start") start(); else if (a === "resume") resume(); else if (a === "pause") { if (G.state === "run") pause(); else if (G.state === "pause") resume(); }
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
  }, true);
  addEventListener("keyup", e => { if (dlg.open && (e.code === "Space" || e.key === " ") && !(e.target.closest && e.target.closest("button"))) e.preventDefault(); }, true);
  dlg.addEventListener("cancel", e => { if (G && G.state === "run") { e.preventDefault(); pause(); } });
  dlg.addEventListener("close", () => { cancelAnimationFrame(raf); raf = 0; if (window.APP) window.APP.renderPaused = false; if (G && (G.state === "run" || G.state === "pause")) saveBest(); });
  addEventListener("resize", () => { if (dlg.open) layout(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && dlg.open && G && G.state === "run") pause(); });

  function openGame() {
    if (dlg.open) return;
    closeInvite(false);
    document.querySelectorAll("dialog[open]").forEach(d => { if (d !== dlg) d.close(); });
    try { dlg.showModal(); } catch (e) { dlg.setAttribute("open", ""); }
    if (window.APP) window.APP.renderPaused = true;
    write(KEY.played, Date.now());
    reset(); layout(); updateLives(); updateFx(true); hudScore = hudP = -1; updateHud(); showCard("title");
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
  window.NovartisGame = { open: openGame, invite: showInvite, _debug: { get G() { return G; }, press, get PX() { return PX; }, TOTAL, sess: () => ({ ...sess, allowed: autoAllowed(), quiet: quietMoment(), hidden: document.hidden }) } };
})();
