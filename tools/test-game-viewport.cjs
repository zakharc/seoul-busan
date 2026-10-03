const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const source = readFileSync(resolve(__dirname, '../novartis-game.js'), 'utf8');
const layoutStart = source.indexOf('  function layout() {');
const layoutEnd = source.indexOf('\n  function weighted(', layoutStart);
assert.ok(layoutStart > 0 && layoutEnd > layoutStart);
const layoutCode = source.slice(layoutStart, layoutEnd);
const worldHeight = Number(source.match(/\bVH\s*=\s*(\d+(?:\.\d+)?)/)?.[1]);
assert.ok(Number.isFinite(worldHeight) && worldHeight > 0);

function layout(width, height, monitor, pixelRatio = 1) {
  const result = {};
  const context = vm.createContext({
    result, innerWidth: width, innerHeight: height, devicePixelRatio: pixelRatio,
    dlg: { clientWidth: width, clientHeight: height }, cv: {},
    matchMedia: query => ({ matches: query === '(hover: hover) and (pointer: fine)' && monitor }),
    clamp: (x, min, max) => Math.max(min, Math.min(max, x)),
  });
  vm.runInContext(`let W=0,H=0,dpr=1,VW=720,S=1,TOP=0,PX=300,VK=1,ZOOM=1,TS=1;
    const VH=${worldHeight};
    ${layoutCode}
    layout();Object.assign(result,{W,H,VW,S,TOP,PX,VK,ZOOM,TS,width:cv.width,height:cv.height});`, context);
  return result;
}

test('monitor character scale is another 40% smaller than the first v4 framing', () => {
  for (const [width, height, oldZoom] of [[1440, 900, 2], [1920, 1080, 2], [1000, 700, 1.5]]) {
    const result = layout(width, height, true);
    const oldWidth = Math.max(720, Math.min(1200, worldHeight * width / height)) * oldZoom;
    const oldScale = width / oldWidth;
    assert.ok(Math.abs(result.S / oldScale - .6) < 1e-12);
    assert.ok(Math.abs(result.PX * result.S / width - .45) < 1e-12);
    assert.ok(result.TS >= 1 && result.TS <= 1.8);
  }
});

test('phone and touch-tablet framing is unchanged', () => {
  for (const [width, height, zoom] of [[320, 740, 1], [390, 844, 1], [1024, 768, 1.5], [1280, 800, 2]]) {
    const result = layout(width, height, false);
    const base = Math.max(width > height ? 720 : 500, Math.min(1200, worldHeight * width / height));
    assert.equal(result.ZOOM, zoom);
    assert.equal(result.S, width / (base * zoom));
  }
});

test('large high-DPI backing stores remain within the 2.6 MP budget', () => {
  for (const [width, height] of [[1440, 900], [1920, 1080], [3840, 2160]]) {
    const result = layout(width, height, true, 3);
    assert.ok(result.width * result.height <= 2.605e6);
    assert.ok(Object.values(result).every(Number.isFinite));
  }
});

test('wider worlds preserve the distinct day and night cloud palettes', () => {
  const start = source.indexOf('  function clouds(');
  const end = source.indexOf('\n  /* level props', start);
  assert.ok(start > 0 && end > start);
  const cloudsCode = source.slice(start, end);
  function draw(night, width) {
    const fills = [], canvas = {
      fillStyle: '', beginPath() {}, ellipse() {},
      fill() { fills.push(this.fillStyle); },
    };
    const context = vm.createContext({
      canvas, night, width,
      hash: () => .25,
      lerp: (a, b, t) => a + (b - a) * t,
      rgb: (color, alpha) => `rgba(${color.join(',')},${alpha})`,
    });
    vm.runInContext(`${cloudsCode}
      clouds(canvas,width,0,0,{n:night,sky:[[0,0,0],[0,0,0],[255,240,220]]});`, context);
    return fills.filter((_, index) => index % 2 === 0);
  }
  for (const width of [720, 2400, 4000]) {
    const day = draw(0, width), night = draw(1, width);
    assert.ok(day.length >= 7 && day.length <= 17);
    assert.equal(day.length, night.length);
    assert.ok(day.every(color => color.startsWith('rgba(255,')));
    assert.ok(night.every(color => color.startsWith('rgba(120,110,170,')));
  }
});
