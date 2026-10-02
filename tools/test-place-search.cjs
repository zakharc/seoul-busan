const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const html = readFileSync(resolve(__dirname, '../index.html'), 'utf8');
const start = html.indexOf('let placeSearchSeq=0, placeSearchController=null;');
const end = html.indexOf('async function wikiLookup(', start);
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
      { city: 'Seoul', items: [{ options: [place, { ...place }] }] },
      { city: 'Busan', items: [{ ...place, title: 'Busan Coffee' }] },
    ],
    XP: [{ ...place, city: 'Seoul' }],
    optionsOf: it => it.options || null,
    resolve: p => p,
    esc: value => String(value ?? '').replace(/[&<>"]/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
    })[c]),
    placeUrl: p => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p.name),
    ...extra,
  });

  vm.runInContext(html.slice(start, end), context);
  return context;
}

test('an old request cannot overwrite a new query or a reopened composer', async () => {
    const nodes = Object.fromEntries(['c-q', 'c-res', 'c-search', 'c-research'].map(id => [id, {
      value: '', innerHTML: '', disabled: false, attributes: {},
      setAttribute(k, v) { this.attributes[k] = v; },
      querySelectorAll() { return []; },
    }]));
    let finish;
    let requestCount = 0;
    const draft = { day: 0 };
    const h = helpers(() => new Promise(resolve => { requestCount++; finish = resolve; }), {
      $: id => nodes[id],
      chgDraft: draft,
      toast() { throw new Error('Stale request must not notify'); },
    });
    h.bindPlaceSearch(draft);
    nodes['c-q'].value = 'Slow query';
    const pending = nodes['c-search'].onclick();
    await nodes['c-search'].onclick();
    assert.equal(requestCount, 1);
    nodes['c-q'].value = 'Blue';
    nodes['c-q'].oninput();
    const currentResults = nodes['c-res'].innerHTML;
    assert.ok(currentResults.includes('Blue Coffee'));
    assert.equal(nodes['c-res'].attributes['aria-busy'], 'false');
    finish({ ok: true, json: async () => [{
      name: 'Stale', display_name: 'Stale, Korea', lat: '37.5', lon: '127',
      type: 'cafe', osm_type: 'node', osm_id: 1,
    }] });
    await pending;
    assert.equal(nodes['c-res'].innerHTML, currentResults);
    assert.equal(nodes['c-search'].disabled, false);

    nodes['c-q'].value = 'Second slow query';
    const closedRequest = nodes['c-search'].onclick();
    h.cancelPlaceSearch();
    h.chgDraft = { day: 1 };
    nodes['c-res'].innerHTML = '';
    finish({ ok: true, json: async () => [] });
    await closedRequest;
    assert.equal(nodes['c-res'].innerHTML, '');
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
