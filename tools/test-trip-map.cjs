const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { test } = require('node:test');
const M = require('../trip-map.js');

const data = file => JSON.parse(readFileSync(resolve(__dirname, '../data', file), 'utf8'));
const meta = data('meta.json');
const DAYS = [...data('days-a.json'), ...data('days-b.json')];
const COMM = data('commutes.json');
const EXPLORE = data('explore.json');
const HOTELS = meta.hotels;
const resolvePlace = o => (o && o.place ? Object.assign({}, HOTELS[o.place], o, { place: undefined }) : o);
const placeOf = it => resolvePlace(it.options ? it.options[0] : it);
const model = DAYS.map((_, i) => M.buildDay(DAYS, HOTELS, COMM, placeOf, i));

test('every day starts from the previous night\'s hotel and numbers its stops', () => {
  assert.equal(model[0].start, null);
  for (let i = 1; i < DAYS.length; i++) assert.equal(model[i].start.id, DAYS[i - 1].base);
  for (const dm of model) {
    assert.deepEqual(dm.stops.map(s => s.n), dm.stops.map((_, k) => k + 1));
    assert.ok(dm.color.startsWith('#'));
  }
});

test('all planned stops sit on the map inside Korea', () => {
  const unpinned = model.flatMap(dm => dm.stops.filter(s => !s.pinned).map(s => `${dm.index + 1}:${s.title}`));
  assert.deepEqual(unpinned, []);
});

test('legs reuse the OSRM commute table with the same walk/taxi verdict as the stop sheet', () => {
  const leg = M.legBetween({ id: 'h1' }, { id: 'd2s1a' }, {}, COMM);
  const c = COMM['h1>d2s1a'];
  const walk = c.w <= 22 || (c.t >= c.w - 2 && c.w <= 40);
  assert.equal(leg.mode, walk ? 'walk' : 'taxi');
  assert.equal(leg.min, walk ? c.w : c.t);
  assert.equal(leg.est, undefined);
  assert.equal(M.legBetween({ id: 'a' }, { id: 'b' }, {}, { 'a>b': { w: 60, wd: 4.5, t: 35, f: 15000, km: 6 } }).long, true);
  assert.equal(M.legBetween({ id: 'a' }, { id: 'b' }, {}, { 'a>b': { same: true } }).mode, 'same');
});

test('legs without a commute row are estimated, and long-distance hops become the train', () => {
  const a = { lat: 37.5665, lng: 126.978 }, b = { lat: 37.5704, lng: 126.992 };
  const near = M.legBetween(a, b, {}, {});
  assert.equal(near.mode, 'walk');
  assert.equal(near.est, true);
  const busan = M.legBetween(a, { lat: 35.1151, lng: 129.0415 }, {}, {});
  assert.equal(busan.mode, 'train');
  assert.equal(M.legBetween(a, b, { long: true }, {}).mode, 'train');
  assert.equal(M.legBetween(a, b, { fixed: 'Taxi from the station' }, {}).mode, 'taxi');
  assert.equal(M.legBetween(null, b, {}, {}), null);
});

test('dropped stops are skipped by the route but stay in the list', () => {
  const days = structuredClone(DAYS);
  days[1].items[1].removed = 'p1';
  const dm = M.buildDay(days, HOTELS, COMM, placeOf, 1);
  assert.equal(dm.stops[1].removed, true);
  assert.equal(dm.stops[1].n, null);
  assert.equal(dm.stops[2].n, 2);
  assert.ok(!dm.legs.some(l => l.to === 1 || l.from === 1));
  assert.equal(dm.legs.find(l => l.to === 2).from, 0);
});

test('day stats add up walking and riding minutes', () => {
  for (const dm of model) {
    const walk = dm.legs.filter(l => l.mode === 'walk' && l.min).reduce((a, l) => a + l.min, 0);
    const ride = dm.legs.filter(l => l.mode === 'taxi' && l.min).reduce((a, l) => a + l.min, 0);
    assert.equal(dm.stats.walkMin, walk);
    assert.equal(dm.stats.rideMin, ride);
    assert.equal(dm.stats.longLegs, dm.legs.filter(l => l.long).length);
  }
});

test('alternatives list only the unchosen, pinned options', () => {
  const dm = model[1];
  const alts = M.alternativesOf(dm, resolvePlace);
  assert.ok(alts.length > 0);
  for (const a of alts) {
    assert.notEqual(a.opt.id, dm.stops[a.k].place.id);
    assert.ok(M.validLL(a.opt));
    assert.equal(a.letter, String.fromCharCode(65 + a.index));
  }
});

test('nearby ideas are in the same city, within range, sorted and not already planned', () => {
  const planned = M.plannedIdeaIds(EXPLORE, model);
  for (const dm of model) {
    const ideas = M.nearbyIdeas(EXPLORE, dm, planned, { maxKm: 4, limit: 5 });
    assert.ok(ideas.length <= 5);
    ideas.forEach((r, i) => {
      assert.equal(r.idea.city, dm.city);
      assert.ok(r.km <= 4);
      assert.ok(!planned.has(r.idea.id));
      if (i) assert.ok(ideas[i - 1].km <= r.km);
    });
  }
  const first = EXPLORE[0];
  const days = structuredClone(DAYS);
  days[1].items.push({ id: 'pX', title: first.title, lat: first.lat, lng: first.lng, kind: 'sight' });
  const withIdea = days.map((_, i) => M.buildDay(days, HOTELS, COMM, placeOf, i));
  assert.ok(M.plannedIdeaIds(EXPLORE, withIdea).has(first.id));
});

test('open proposals are located and mapped to the days they touch', () => {
  const props = {
    a: { id: 'a', type: 'move', status: 'open', itemId: 'd2s3', day: 1, toDay: 4, ts: 2 },
    b: { id: 'b', type: 'add', status: 'agreed', day: 0, ts: 3 },
    c: { id: 'c', type: 'note', status: 'open', itemId: 'nope', day: 2, ts: 1 },
  };
  const locate = id => (id === 'd2s3' ? [1, 2] : null);
  const open = M.openProposals(props, locate);
  assert.deepEqual(open.map(p => p.id), ['a', 'c']);
  assert.deepEqual([...M.proposalDays(open[0])].sort(), [1, 4]);
  assert.deepEqual([...M.proposalDays(open[1])], [2]);
});

test('Google Maps links keep place ids and every stop of the day', () => {
  const pid = M.placeUrl({ name: 'Gyeongbokgung Palace', pid: 'ChIJabc' });
  assert.match(pid, /query=Gyeongbokgung%20Palace&query_place_id=ChIJabc$/);
  assert.match(M.placeUrl({ lat: 37.5, lng: 127 }), /query=37\.500000,127\.000000/);
  const leg = M.legUrl({ lat: 37.5, lng: 127 }, { name: 'X', pid: 'P1' }, 'walk');
  assert.match(leg, /origin=37\.500000,127\.000000&destination=X&destination_place_id=P1&travelmode=walking/);
  assert.match(M.legUrl({ lat: 37.5, lng: 127 }, { lat: 37.6, lng: 127 }, 'taxi'), /travelmode=transit/);
  const dm = model[1];
  const url = M.dayRouteUrl(dm);
  assert.ok(url.startsWith('https://www.google.com/maps/dir/'));
  const pts = url.replace('https://www.google.com/maps/dir/', '').split('/');
  assert.equal(pts.length, Math.min(10, 1 + dm.stops.filter(s => s.pinned).length));
});

test('the coordinate guard accepts Korea only', () => {
  assert.ok(M.validLL({ lat: 37.5, lng: 127 }));
  assert.ok(M.validLL({ lat: '35.1', lng: '129.04' }));
  for (const p of [null, {}, { lat: '', lng: '' }, { lat: 48.1, lng: 11.6 }, { lat: NaN, lng: 127 }]) assert.ok(!M.validLL(p));
});

test('durations parse to their lower bound and deadlines are ignored', () => {
  assert.deepEqual(['1.5–2 h', '45 min–1 h', '≈35 min', '1 h', '35–40 min uphill', '2 h 20 + 35 min'].map(M.needMin), [90, 45, 35, 60, 35, 120]);
  for (const s of ['1 h before boarding', 'Book ≈1 month ahead', 'Leave the hotel 10:30', 'Tour 90 min + palace 1 h', '', null]) assert.equal(M.needMin(s), null);
  assert.equal(M.toMin('09:30'), 570);
  assert.equal(M.toMin('—'), null);
  assert.equal(M.fmtMin(570), '09:30');
  assert.equal(M.fmtMin(-10), '23:50');
});

test('the day schedule gives leave-by times and the time at each stop', () => {
  const dm = model[1];
  const sched = M.schedule(dm);
  assert.equal(sched.length, dm.stops.length);
  for (const row of sched) {
    const leg = dm.legs.find(l => l.to === row.k);
    if (leg && leg.min && row.t != null) assert.equal(row.leaveBy, row.t - leg.min - 5);
  }
  assert.equal(sched[sched.length - 1].stayMin, null);
  assert.ok(model.every(d => M.schedule(d).every(r => !r.tight)), 'the current plan has no tight connections');
});

test('a squeezed stop is flagged as tight', () => {
  const days = structuredClone(DAYS);
  days[1].items[1].t = '09:45';
  const dm = M.buildDay(days, HOTELS, COMM, placeOf, 1);
  const first = M.schedule(dm)[0];
  assert.ok(first.stayMin < 15);
  assert.equal(first.tight, true);
  assert.equal(M.schedule(dm)[0].need, 90);
});

test('today and next-up use Korea time', () => {
  assert.deepEqual(M.seoulNow(new Date('2026-10-29T03:20:00Z')), { date: '2026-10-29', min: 12 * 60 + 20 });
  assert.equal(M.tripDayIndex(DAYS, new Date('2026-10-29T03:20:00Z')), 1);
  assert.equal(M.tripDayIndex(DAYS, new Date('2026-10-27T14:59:00Z')), -1);
  assert.equal(M.tripDayIndex(DAYS, new Date('2026-10-27T15:00:00Z')), 0);
  const sched = M.schedule(model[1]);
  const up = M.nextUp(sched, 12 * 60 + 5);
  assert.equal(model[1].stops[up.k].t, '12:30');
  assert.equal(up.leaveIn, up.leaveBy - (12 * 60 + 5));
  assert.equal(M.nextUp(sched, 23 * 60), null);
});

test('KakaoMap links carry the Korean name and coordinates', () => {
  const a = { ko: '경복궁', lat: 37.579617, lng: 126.977041 }, b = { name: 'Insa-dong, Seoul', lat: 37.5743, lng: 126.9849 };
  assert.equal(M.kakaoTo(a), 'https://map.kakao.com/link/to/' + encodeURIComponent('경복궁') + ',37.579617,126.977041');
  const A = encodeURIComponent('경복궁') + ',37.579617,126.977041', B = encodeURIComponent('Insa-dong  Seoul') + ',37.574300,126.984900';
  assert.equal(M.kakaoRoute(a, b, 'taxi'), 'https://map.kakao.com/link/from/' + A + '/to/' + B);
  assert.equal(M.kakaoRoute(a, b, 'walk'), 'https://map.kakao.com/link/by/walk/' + A + '/' + B);
});

/* ---------- discover around a stop (real snapshot around Gyeongbokgung: OSM, en/ko Wikipedia, Wikidata) ---------- */
const FX = require('./fixtures/discover-gyeongbokgung.json');
const SRC = { osm: M.fromOverpass(FX.overpass), en: M.fromWiki(FX.wikiEn, 'en'), ko: M.fromWiki(FX.wikiKo, 'ko'), wd: M.wdSignals(FX.wikidata) };
const found = M.discover(SRC, FX.center, 1.6, { planned: [] });
const byTitle = t => found.find(c => c.title === t);

test('sources parse into places with coordinates in Korea', () => {
  assert.ok(SRC.osm.length > 30 && SRC.en.length > 10 && SRC.ko.length > 10);
  for (const c of [...SRC.osm, ...SRC.en, ...SRC.ko]) assert.ok(M.validLL(c), c.title);
  assert.ok(SRC.osm.every(c => c.kind && c.id.startsWith('o')));
  assert.equal(SRC.wd.Q482485.sitelinks > 30, true);
  assert.equal(SRC.wd.Q482485.heritage, true);
});

test('Wikipedia pages that are not places are dropped', () => {
  const titles = new Set(found.map(c => c.title));
  for (const t of ['Joseon', 'Korea under Japanese rule', 'Constitutional Court of Korea', 'Gyeongbokgung station', 'Embassy of the United States, Seoul']) assert.ok(!titles.has(t), t);
  assert.ok(titles.has('Gyeongbokgung') && titles.has('Gwanghwamun') && titles.has('Bukchon Hanok Village'));
});

test('the same place from several sources is merged into one candidate', () => {
  const g = byTitle('Gyeongbokgung');
  assert.ok(g.src.includes('wpen') && g.src.includes('wpko') && g.src.includes('wd'));
  assert.ok(g.views.en > 1000 && g.views.ko > 100);
  assert.equal(g.ko, '경복궁');
  const ids = found.map(c => c.id);
  assert.equal(new Set(ids).size, ids.length);
  const bukchon = byTitle('Bukchon Hanok Village');
  assert.ok(bukchon.src.includes('osm') && bukchon.src.includes('wpen'));
  assert.equal(found.filter(c => c.wd === 'Q490981').length, 1);
});

test('worth scores are 0–100, sorted, and explained', () => {
  for (let i = 0; i < found.length; i++) {
    const w = found[i].worth;
    assert.ok(w.score >= 0 && w.score <= 100);
    if (i) assert.ok(found[i - 1].worth.score >= w.score);
    assert.equal(w.score, Math.min(100, Object.values(w.parts).reduce((a, b) => a + b, 0)));
    assert.ok(w.why.length >= 1 && w.why.some(x => x[0] === '🚶'));
  }
  const g = byTitle('Gyeongbokgung').worth;
  assert.equal(g.tier[1], 'Must see');
  assert.ok(g.why.some(x => /Wikipedia views/.test(x[1])) && g.why.some(x => /language wikis/.test(x[1])));
  assert.ok(byTitle('Gyeongbokgung').worth.score > byTitle('Samcheong-dong').worth.score);
});

test('the walk counts: the same place scores lower when it is far away', () => {
  const c = byTitle('Gwanghwamun');
  const near = M.worthScore(c, { lat: c.lat, lng: c.lng }), far = M.worthScore(c, { lat: c.lat + 0.02, lng: c.lng });
  assert.ok(near.score > far.score);
  assert.equal(near.parts.near, 20);
  assert.equal(far.parts.near, 0);
});

test('our research and heritage lift a place; chains drop it', () => {
  const base = { title: 'X', lat: 37.58, lng: 126.98, kind: 'sight', src: ['osm'], views: {}, wiki: {} };
  const s0 = M.worthScore(base, base).score;
  assert.equal(M.worthScore({ ...base, ours: { kind: 'idea' } }, base).score, s0 + 20);
  assert.equal(M.worthScore({ ...base, heritage: true }, base).score, s0 + 12);
  const food = { ...base, kind: 'food', cuisine: 'korean', en: true, hours: 'Mo-Su 11:00-21:00' };
  assert.ok(M.worthScore(food, base).score > M.worthScore({ ...food, brand: true }, base).score);
  assert.ok(M.worthScore(food, base).why.some(w => w[1] === 'Local Korean food'));
});

test('planned stops and places outside the radius are left out', () => {
  const g = byTitle('Gyeongbokgung');
  const without = M.discover(SRC, FX.center, 1.6, { planned: [{ title: 'Gyeongbokgung Palace', lat: g.lat, lng: g.lng }] });
  assert.ok(!without.some(c => c.title === 'Gyeongbokgung'));
  const small = M.discover(SRC, FX.center, 0.4, { planned: [] });
  assert.ok(small.length < found.length && small.every(c => M.distKm(FX.center, c) <= 0.4));
});

test('curated places join the results and are marked as ours', () => {
  const pool = [{ id: 'x-test', title: 'Secret garden café', lat: FX.center.lat + 0.002, lng: FX.center.lng, ours: { kind: 'idea' } }];
  const r = M.discover({ ...SRC, ours: M.curatedNear(FX.center, 1.6, pool) }, FX.center, 1.6, { planned: [] });
  const c = r.find(x => x.title === 'Secret garden café');
  assert.ok(c && c.src.includes('ours'));
  assert.ok(c.worth.why[0][1] === 'Our Explore pick');
});

test('saved keys are stable, Firestore-safe, and entries are compact', () => {
  const g = byTitle('Gyeongbokgung');
  assert.equal(M.savedKey(g), 'wQ482485');
  assert.equal(M.savedKey({ osm: 'node/123' }), 'on123');
  const k = M.savedKey({ title: 'Somewhere', lat: 37.5, lng: 127 });
  assert.match(k, /^g[0-9a-z]+$/);
  assert.equal(k, M.savedKey({ title: 'somewhere!', lat: 37.50001, lng: 127.00001 }));
  const e = M.savedEntry(g, { city: 'Seoul', near: 'Gwanghwamun', day: 1, at: 1 });
  assert.deepEqual(Object.keys(e).sort(), ['at', 'cat', 'city', 'day', 'ko', 'lat', 'lng', 'near', 'score', 'src', 't', 'why', 'wp'].sort());
  assert.equal(e.score, g.worth.score);
  assert.equal(e.wp, 'en:Gyeongbokgung');
  assert.ok(JSON.stringify(e).length < 600);
});

test('heritage from the separate SPARQL query lifts a place, and live labels give English names', () => {
  const light = M.wdSignals({ entities: { Q12583939: { sitelinks: { kowiki: { title: '경회루' }, enwiki: { title: 'Gyeonghoeru' } }, labels: { en: { value: 'Gyeonghoeru' }, ko: { value: '경회루' } } } } });
  assert.equal(light.Q12583939.heritage, false);
  assert.equal(light.Q12583939.en, 'Gyeonghoeru');
  const wd = M.applyHeritage(light, ['Q12583939', 'Q1']);
  assert.equal(wd.Q12583939.heritage, true);
  assert.equal(wd.Q12583939.sitelinks, 2);
  assert.equal(wd.Q1.heritage, true);
  const r = M.discover({ ...SRC, wd }, FX.center, 1.6, { planned: [] });
  const g = r.find(c => c.wd === 'Q12583939');
  assert.equal(g.title, 'Gyeonghoeru');
  assert.equal(g.ko, '경회루');
  assert.ok(g.worth.why.some(w => w[1] === 'Protected heritage'));
});

test('a place keeps every identity, so a save made before Wikipedia answered still matches', () => {
  const osm = M.fromOverpass({ elements: [{ type: 'node', id: 111, lat: 37.5738, lon: 126.9817, tags: { name: '조계사', 'name:en': 'Jogyesa', historic: 'yes' } }] });
  const wiki = M.fromWiki({ query: { pages: [{ pageid: 9, title: 'Jogyesa', description: 'Buddhist temple in Seoul, South Korea', coordinates: [{ lat: 37.5739, lon: 126.9818 }], pageprops: { wikibase_item: 'Q495727' }, pageviews: { a: 100 } }] } }, 'en');
  const before = M.discover({ osm }, { lat: 37.5738, lng: 126.9817 }, 1, { planned: [] })[0];
  const after = M.discover({ osm, en: wiki }, { lat: 37.5738, lng: 126.9817 }, 1, { planned: [] })[0];
  const savedEarly = M.savedKey(before);
  assert.equal(savedEarly, 'on111');
  assert.ok(M.placeKeys(after).includes('wQ495727') && M.placeKeys(after).includes(savedEarly));
  assert.ok(after.worth.score > before.worth.score);
});

test('the Overpass answer may mix areas and points; areas keep their centre', () => {
  const r = M.fromOverpass({ elements: [
    { type: 'way', id: 5, center: { lat: 37.5796, lon: 126.977 }, tags: { name: '경복궁', 'name:en': 'Gyeongbokgung', historic: 'palace', wikidata: 'Q482485' } },
    { type: 'relation', id: 7, center: { lat: 37.58, lon: 126.98 }, tags: { name: '삼청공원', leisure: 'park' } },
  ] });
  assert.deepEqual(r.map(c => [c.id, c.kind, M.savedKey(c)]), [['ow5', 'heritage', 'wQ482485'], ['or7', 'nature', 'or7']]);
});

test('everyday amenities with a Wikidata id are not sights', () => {
  const r = M.fromOverpass({ elements: [
    { type: 'way', id: 1, center: { lat: 37.58, lon: 126.99 }, tags: { name: 'University', amenity: 'university', wikidata: 'Q1' } },
    { type: 'node', id: 2, lat: 37.57, lon: 126.98, tags: { name: 'Post office', amenity: 'post_office', wikidata: 'Q2' } },
    { type: 'node', id: 3, lat: 37.57, lon: 126.98, tags: { name: 'Fountain', amenity: 'fountain', wikidata: 'Q3' } },
    { type: 'way', id: 4, center: { lat: 37.56, lon: 126.97 }, tags: { name: 'Deoksugung', historic: 'castle' } },
  ] });
  assert.deepEqual(r.map(c => c.title), ['Fountain', 'Deoksugung']);
});
