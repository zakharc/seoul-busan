const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const html = readFileSync(resolve(__dirname, '../index.html'), 'utf8');
const start = html.indexOf('let placeSearchSeq=0, placeSearchController=null;');
const end = html.indexOf('function openComposer(', start);
assert.ok(start > 0 && end > start);

function helpers(fetch, extra = {}) {
  const place = {
    title: 'Blue Coffee', name: 'Blue Coffee', ko: '블루커피',
    lat: 37.5445, lng: 127.0555, landmark: 'shop:cafe',
  };
  const context = vm.createContext({
    URLSearchParams, fetch, console, AbortController, setTimeout, clearTimeout,
    chgEl: { open: true, addEventListener() {} },
    DAYS: [
      { city: 'Seoul', items: [{ id: 's1', t: '10:00', title: 'Blue Coffee', options: [place, { ...place }] }] },
      { city: 'Busan', items: [{ ...place, id: 'b1', title: 'Busan Coffee' }] },
    ],
    XP: [{ ...place, city: 'Seoul' }, { title: 'Gamcheon', name: 'Gamcheon', lat: 35.097, lng: 129.010, city: 'Busan' }],
    TYPE_EMOJI: { add: '➕', replace: '🔁', move: '🕒', drop: '✖', note: '📝' },
    CAT_EMOJI: { sight: '📍', food: '🍜', cafe: '☕', nature: '🌿' },
    placeOf: it => it.options ? it.options[0] : it,
    locateItem: id => id === 's1' ? [0, 0] : id === 'b1' ? [1, 0] : null,
    optionsOf: it => it.options || null,
    resolve: p => p,
    esc: value => String(value ?? '').replace(/[&<>"]/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
    })[c]),
    placeUrl: p => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p.name) + (p.pid ? '&query_place_id=' + p.pid : ''),
    naverUrl: p => 'https://map.naver.com/p/search/' + encodeURIComponent(p.ko || p.name),
    kakaoUrl: p => 'https://map.kakao.com/link/search/' + encodeURIComponent(p.ko || p.name),
    store: (k, def) => def,
    saveK() {},
    ...extra,
  });

  vm.runInContext(html.slice(start, end), context);
  return context;
}

test('an old search cannot overwrite a newer one or a closed composer', async () => {
  const finishers = [];
  const draft = { day: 0, spotCity: 'Seoul' };
  const h = helpers(() => new Promise(resolve => finishers.push(resolve)), { chgDraft: draft });
  const calls = [];
  const handlers = tag => ({
    loading: () => calls.push(tag + ':loading'),
    success: r => calls.push(tag + ':success:' + r.map(x => x.title).join('|')),
    error: m => calls.push(tag + ':error:' + m),
    complete: () => calls.push(tag + ':complete'),
  });
  const reply = [{ name: 'Fresh', display_name: 'Fresh, Seoul', lat: '37.5', lon: '127', type: 'cafe', osm_type: 'node', osm_id: 2 }];
  const first = h.performPlaceSearch(draft, 'Slow', handlers('old'));
  const second = h.performPlaceSearch(draft, 'Blue', handlers('new'));
  finishers[0]({ ok: true, json: async () => [{ name: 'Stale', display_name: 'Stale', lat: '37.5', lon: '127', osm_type: 'node', osm_id: 1 }] });
  finishers[1]({ ok: true, json: async () => reply });
  await Promise.all([first, second]);
  assert.deepEqual(calls, ['old:loading', 'new:loading', 'new:success:Blue Coffee|Fresh', 'new:complete']);

  calls.length = 0;
  const closed = h.performPlaceSearch(draft, 'Later', handlers('closed'));
  h.cancelPlaceSearch();
  h.chgDraft = { day: 1 };
  finishers[2]({ ok: true, json: async () => reply });
  await closed;
  assert.deepEqual(calls, ['closed:loading']);
});

test('spotlight: empty query offers Explore ideas and a way to change a stop', () => {
  const h = helpers();
  const rows = h.spotlightSuggestions('', { day: 0, spotCity: 'Seoul', spotTask: 'any', itemId: null });
  assert.equal(rows[0].kind, 'place');
  assert.equal(rows.at(-1).kind, 'target');
  assert.ok(!rows.some(r => r.kind === 'remote'));
});

test('spotlight: typing suggests local places, map search and a manual place', () => {
  const h = helpers();
  const rows = h.spotlightSuggestions('blue', { day: 0, spotCity: 'Seoul', spotTask: 'any' });
  assert.deepEqual([...rows.map(r => r.kind)], ['place', 'remote', 'manual']);
  assert.equal(rows[0].label, 'Blue Coffee');
  assert.ok(h.spotlightSuggestions('https://naver.me/x', { day: 0, spotCity: 'Seoul', spotTask: 'any' })
    .some(r => r.kind === 'manual' && /link/.test(r.label)));
});

test('spotlight: commands find stops across days with the right action', () => {
  const h = helpers();
  const draft = { day: 0, spotCity: 'Seoul', spotTask: 'any' };
  const remove = h.spotlightSuggestions('remove busan', draft);
  assert.equal(remove.length, 1);
  assert.equal(remove[0].action, 'drop');
  assert.equal(remove[0].itemId, 'b1');
  assert.ok(remove[0].sub.startsWith('Day 2 · Busan'));
  assert.equal(h.spotlightSuggestions('swap', draft).every(r => r.action === 'replace'), true);
  assert.equal(h.spotlightSuggestions('move day 1', draft)[0].itemId, 's1');
  const target = h.spotlightSuggestions('', { ...draft, spotTask: 'target', type: 'note' });
  assert.equal(target.length, 2);
  assert.ok(target.every(r => r.action === 'note'));
});

test('spotlight: opened from a stop shows its actions first; map results replace local ones', () => {
  const h = helpers();
  const fromStop = h.spotlightSuggestions('', { day: 0, spotCity: 'Seoul', spotTask: 'any', itemId: 's1' });
  assert.deepEqual([...fromStop.slice(0, 4).map(r => r.action)], ['replace', 'move', 'drop', 'note']);
  const remote = [{ title: 'Map Cafe', lat: 37.5, lng: 127, cat: 'cafe', address: 'Seoul' }];
  const rows = h.spotlightSuggestions('blue', { day: 0, spotCity: 'Seoul', spotTask: 'any', spotRemote: { query: 'blue', city: 'Seoul', places: remote } });
  assert.equal(rows[0].label, 'Map Cafe');
  assert.equal(rows.filter(r => r.kind === 'place').length, 1);
});

test('local suggestions deduplicate and filter by city; Korean names work', () => {
  const h = helpers();
  const english = h.localPlaceResults('Blue', 'Seoul');
  assert.equal(english.length, 1);
  assert.equal(english[0].cat, 'cafe');
  assert.equal(h.localPlaceResults('블루', 'Seoul').length, 1);
  assert.equal(h.localPlaceResults('Busan', 'Seoul').length, 0);
  assert.equal(h.localPlaceResults('B', 'Seoul').length, 0);
});

test('research links encode input and include the chosen city', () => {
  const h = helpers();
  const links = h.researchLinks('tea & cake "한옥"', 'Busan');
  assert.ok(links.includes(encodeURIComponent('tea & cake "한옥" Busan Korea')));
  assert.ok(links.includes('https://www.google.com/search?q='));
  assert.ok(links.includes('https://map.naver.com/p/search/'));
  assert.ok(!links.includes('q=tea &'));
});

test('remote result keeps exact coordinates and Korean name; ignores invalid locations', async () => {
  let request;
  const h = helpers(async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      json: async () => [
        {
          name: 'Old label', display_name: 'Blue Coffee, Seoul, South Korea',
          lat: '37.5445', lon: '127.0555', type: 'cafe',
          osm_type: 'node', osm_id: 123,
          namedetails: { 'name:en': 'Blue Coffee', 'name:ko': '블루커피' },
        },
        { lat: 'invalid', lon: '127', name: 'Invalid' },
        { lat: '48.8', lon: '2.3', name: 'Outside Korea' },
      ],
    };
  });
  const signal = new AbortController().signal;
  const results = await h.osmSearch('Blue Coffee', 'Busan', signal);
  assert.equal(results.length, 1);
  assert.equal(results[0].title, 'Blue Coffee');
  assert.equal(results[0].ko, '블루커피');
  assert.equal(results[0].lat, 37.5445);
  assert.equal(results[0].lng, 127.0555);
  assert.equal(results[0].sourceUrl, 'https://www.openstreetmap.org/node/123');
  assert.equal(results[0].cat, 'cafe');
  const params = new URL(request.url).searchParams;
  assert.equal(params.get('q'), 'Blue Coffee');
  assert.equal(params.get('viewbox'), '128.7,35.5,129.4,34.8');
  assert.equal(params.get('countrycodes'), 'kr');
  assert.equal(request.options.signal, signal);
});

test('busy, failed and malformed search responses are explicit errors', async () => {
  await assert.rejects(
    helpers(async () => ({ ok: false, status: 429 })).osmSearch('Coffee', 'Seoul'),
    /busy/,
  );
  await assert.rejects(
    helpers(async () => ({ ok: false, status: 503 })).osmSearch('Coffee', 'Seoul'),
    /HTTP 503/,
  );
  await assert.rejects(
    helpers(async () => ({ ok: true, json: async () => ({ error: 'bad' }) }))
      .osmSearch('Coffee', 'Seoul'),
    /unexpected response/,
  );
});

test('scout parses prices, closing times and closed days from trip notes', () => {
  const h = helpers();
  assert.equal(h.scoutPrice('Free to wander'), 0);
  assert.equal(h.scoutPrice('₩3,000'), 3000);
  assert.equal(h.scoutPrice('≈₩10–15k per person'), 10000);
  assert.equal(h.scoutPrice('Reserved entry · ≈₩1,000–3,000'), 1000);
  assert.equal(h.scoutPrice(''), null);
  assert.equal(h.scoutTier(0), 'Free');
  assert.equal(h.scoutClose('09:00–21:00 · closed Mondays'), 21 * 60);
  assert.equal(h.scoutClose('18:00–02:00'), 26 * 60);
  assert.equal(h.scoutClose('Open 24 h'), 1440);
  assert.deepEqual([...h.scoutClosedDays({ hours: '09:00–21:00 · closed Mondays' })], [1]);
  assert.deepEqual([...h.scoutClosedDays({ closed: 'Tuesdays' })], [2]);
  assert.deepEqual([...h.scoutClosedDays({ hours: '10:00–18:00' })], []);
  assert.equal(h.scoutWeekday('2026-10-28'), 3);
});

test('scout classifies places and builds honest summary chips', () => {
  const h = helpers();
  assert.equal(h.scoutKind({ landmark: 'hotel' }), 'logistics');
  assert.equal(h.scoutKind({ landmark: 'shop:cafe' }), 'cafe');
  assert.equal(h.scoutKind({ landmark: 'shop:noodle' }), 'food');
  assert.equal(h.scoutKind({ landmark: 'palace' }), 'sight');
  assert.equal(h.scoutIndoor({ landmark: 'palace' }), false);
  assert.equal(h.scoutIndoor({ type: 'Museum' }), true);
  const chips = h.scoutTraits({ title: 'Hanok', landmark: 'hanok', price: 'Free', need: '1 h', hours: '09:00–21:00 · closed Mondays', about: 'Quiet courtyards at golden hour.' }, null);
  const labels = chips.map(c => c.label);
  assert.ok(labels.includes('Free') && labels.includes('1 h') && labels.includes('Outdoors') && labels.includes('Best at sunset') && labels.includes('Closed Mon'), labels.join());
  assert.ok(!labels.some(l => /★|rating/i.test(l)), 'never invents ratings');
});

test('rating links go to the real sites and use the Google place id when known', () => {
  const h = helpers();
  const html = h.scoutRatingLinks({ name: 'Inwangsan', ko: '인왕산', pid: 'ChIJabc' }, 'sight', 'Seoul');
  assert.ok(html.includes('query_place_id=ChIJabc'));
  assert.ok(html.includes('https://www.tripadvisor.com/Search?q=Inwangsan%20Seoul'));
  assert.ok(html.includes('https://map.naver.com/p/search/' + encodeURIComponent('인왕산')));
  assert.ok(html.includes('https://map.kakao.com/link/search/'));
  assert.ok(!html.includes('Michelin'));
  assert.ok(h.scoutRatingLinks({ name: 'Noodles' }, 'food', 'Busan').includes('Michelin'));
});

test('scout parses OpenStreetMap surroundings and never lists the place as its own alternative', () => {
  const h = helpers();
  const place = { name: 'Namsangol Hanok Village', ko: '남산골한옥마을', lat: 37.5594, lng: 126.9943 };
  const data = { elements: [
    { type: 'node', lat: 37.5610, lon: 126.9940, tags: { railway: 'station', station: 'subway', name: '충무로', 'name:en': 'Chungmuro' } },
    { type: 'node', lat: 37.5700, lon: 126.9940, tags: { railway: 'station', station: 'subway', name: 'Far' } },
    { type: 'node', lat: 37.5596, lon: 126.9945, tags: { amenity: 'toilets' } },
    { type: 'node', lat: 37.5598, lon: 126.9946, tags: { shop: 'convenience', brand: 'GS25' } },
    { type: 'count', tags: { total: '25' } },
    { type: 'count', tags: { total: '544' } },
    { type: 'node', lat: 37.5600, lon: 126.9950, tags: { amenity: 'restaurant', name: 'Mandu House', cuisine: 'korean;dumpling' } },
    { type: 'way', center: { lat: 37.5595, lon: 126.9944 }, tags: { tourism: 'attraction', name: '남산골한옥마을', 'name:en': 'Namsangol Hanok Village', website: 'https://www.hanokmaeul.or.kr/', wheelchair: 'limited' } },
    { type: 'node', lat: 48.8, lon: 2.3, tags: { amenity: 'cafe', name: 'Paris' } },
  ] };
  const r = h.scoutParse(data, place);
  assert.equal(r.near.subway.name, 'Chungmuro');
  assert.ok(r.near.subway.km < 0.3);
  assert.equal(r.near.conv.name, 'GS25');
  assert.ok(r.near.toilet);
  assert.equal(r.count.cafe, 25);
  assert.equal(r.count.food, 544);
  assert.equal(r.self.website, 'https://www.hanokmaeul.or.kr/');
  assert.equal(r.self.wheelchair, 'limited');
  assert.deepEqual([...r.pois.map(p => p.title)], ['Mandu House']);
  assert.equal(r.pois[0].type, 'korean, dumpling');
  assert.equal(h.scoutDist(0.2), '3 min walk');
});

test('swap ideas explain why, skip places closed that day and stay in the same kind', () => {
  const h = helpers();
  const cur = { title: 'Palace', name: 'Palace', landmark: 'palace', price: '₩3,000', hours: '09:00–18:00', lat: 37.58, lng: 126.977, about: 'Joseon royal palace' };
  const pool = [
    { title: 'Free Hanok', name: 'Free Hanok', landmark: 'hanok', price: 'Free', lat: 37.582, lng: 126.985, about: 'Joseon houses' },
    { title: 'Museum', name: 'Museum', type: 'Museum', price: '₩5,000', hours: '10:00–21:00', lat: 37.579, lng: 126.98 },
    { title: 'Closed Wed', name: 'Closed Wed', landmark: 'temple', price: 'Free', closed: 'Wednesdays', lat: 37.58, lng: 126.978 },
    { title: 'Noodles', name: 'Noodles', landmark: 'shop:noodle', price: '₩9,000', lat: 37.58, lng: 126.977 },
    { title: 'Faraway', name: 'Faraway', landmark: 'park', price: 'Free', lat: 35.1, lng: 129.0 },
  ];
  const alts = h.scoutAlternatives(cur, null, '2026-10-28', pool, []);
  const titles = alts.map(a => a.title);
  assert.ok(titles.includes('Free Hanok') && titles.includes('Museum'), titles.join());
  assert.ok(!titles.includes('Closed Wed') && !titles.includes('Noodles') && !titles.includes('Faraway'));
  const hanok = alts.find(a => a.title === 'Free Hanok');
  assert.ok(hanok.reasons.some(r => r.k === 'cheaper') && hanok.reasons.some(r => r.k === 'vibe') && hanok.reasons.some(r => r.k === 'near'));
  const museum = alts.find(a => a.title === 'Museum');
  assert.ok(museum.reasons.some(r => r.k === 'indoor') && museum.reasons.some(r => r.k === 'later'));
  assert.equal(h.scoutAlternatives({ ...cur, landmark: 'hotel' }, null, '2026-10-28', pool, []).length, 0);
  const clean = h.scoutClean({ ...hanok, score: 9, km: 1 });
  assert.equal(clean.score, undefined);
  assert.equal(clean.cat, 'sight');
});

test('scout keeps logistics plain, matches dishes for food, and only values late hours in the evening', () => {
  const h = helpers();
  const hotel = h.scoutTraits({ title: 'Check in', landmark: 'hotel', about: 'Rooftop bar with night views, near the market' }, { kind: 'stay' });
  assert.equal(hotel.length, 0);
  assert.equal(h.scoutNeed('3 min ride · queue 20–60 min'), '3 min ride');
  assert.equal(h.scoutNeed('Book with the outbound'), '');
  const soup = { title: 'Gukbap A', name: 'Gukbap A', landmark: 'shop:soup', type: 'Busan · pork & rice soup', price: '₩10,000', hours: '09:00–21:00', lat: 35.15, lng: 129.11 };
  const pool = [
    { title: 'Gukbap B', name: 'Gukbap B', landmark: 'shop:soup', type: 'Busan · pork & rice soup', price: '₩9,000', hours: '00:00–24:00', lat: 35.151, lng: 129.111 },
    { title: 'Noodle C', name: 'Noodle C', landmark: 'shop:noodle', type: 'Busan · wheat cold noodles', price: '₩12,000', hours: '10:00–23:00', lat: 35.152, lng: 129.112 },
  ];
  const lunch = h.scoutAlternatives(soup, { t: '12:30', kind: 'food' }, '2026-11-03', pool, []);
  const b = lunch.find(a => a.title === 'Gukbap B');
  assert.ok(b.reasons.some(r => r.t === '✨ Similar dish'));
  assert.ok(!lunch.some(a => a.reasons.some(r => r.k === 'later')), 'no late-hours reason at lunch');
  const dinner = h.scoutAlternatives(soup, { t: '19:00', kind: 'food' }, '2026-11-03', pool, []);
  assert.ok(dinner.find(a => a.title === 'Noodle C').reasons.some(r => r.k === 'later'));
  assert.ok(!dinner.find(a => a.title === 'Noodle C').reasons.some(r => r.t === '✨ Similar dish'));
});
