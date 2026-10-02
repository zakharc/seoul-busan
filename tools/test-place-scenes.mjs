import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createPlaceScenes } from '../place-scenes.js';

assert.ok(process.argv[2], 'Pass the path to a local Three.js r160 module.');
const T = await import(pathToFileURL(process.argv[2]).href);
assert.equal(T.REVISION, '160');

const labels = [];
const context = new Proxy({
  fillText: text => labels.push(text),
  measureText: text => ({ width: text.length * 20 }),
  createLinearGradient: () => ({ addColorStop() {} }),
  createRadialGradient: () => ({ addColorStop() {} }),
}, { get: (target, key) => target[key] || (() => {}) });
globalThis.document = { createElement: () => ({
  width: 512, height: 128, getContext: () => context,
}) };

const box = (w, h, d, m, x = 0, y = 0, z = 0) => {
  const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y + h / 2, z);
  return mesh;
};
const cyl = (rt, rb, h, m, x = 0, y = 0, z = 0, segments = 16) => {
  const mesh = new T.Mesh(new T.CylinderGeometry(rt, rb, h, segments), m);
  mesh.position.set(x, y + h / 2, z);
  return mesh;
};
const reg = (g, fn) => (g.userData.anim ||= []).push(fn);
const days = [
  ...JSON.parse(readFileSync(new URL('../data/days-a.json', import.meta.url))),
  ...JSON.parse(readFileSync(new URL('../data/days-b.json', import.meta.url))),
];
const entries = new Map(days.flatMap(d => d.items.flatMap(it =>
  (it.options || [it]).map(p => [p.id, p]))));
const gallery = readFileSync(new URL('../visual-review/index.html', import.meta.url), 'utf8');
const galleryCode = gallery.slice(gallery.indexOf('const places=') + 'const places='.length,
  gallery.indexOf('\nlet selected='));
const places = Function('"use strict"; return (' + galleryCode.replace(/;\s*$/, '') + ')')();
assert.equal(places.length, 40);
assert.equal(new Set(places.map(p => p.id)).size, 40);

const reports = [];
for (const [lowEnd, reduced] of [[true, false], [false, false], [true, true]]) {
  const scenes = createPlaceScenes(T, { box, cyl, reg, lowEnd, reduced });
  assert.equal(Object.keys(scenes).length, 41, '40 unique scenes plus the repeated Onion visit');
  for (const id of Object.keys(scenes)) {
    assert.ok(entries.has(id), `${id} is missing from the current itinerary`);
    const g = new T.Group();
    scenes[id](g);
    const visual = g.userData.visual;
    assert.equal(visual.id, id);
    assert.ok(visual.camera.every(Number.isFinite));
    assert.ok(visual.target.every(Number.isFinite));
    for (const t of [0, 1, 10, 30]) {
      for (const animate of g.userData.anim || []) animate(1 / 60, t);
    }
    g.updateMatrixWorld(true);
    let meshes = 0;
    g.traverse(o => {
      assert.ok(o.position.toArray().every(Number.isFinite), `${id}: invalid position`);
      if (!o.isMesh) return;
      meshes++;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const b = o.geometry.boundingBox;
      assert.ok(b.min.toArray().concat(b.max.toArray()).every(Number.isFinite),
        `${id}: invalid geometry`);
    });
    const bounds = new T.Box3().setFromObject(g);
    assert.ok(!bounds.isEmpty());
    if (id === 'd8s1b') {
      let books = 0;
      g.traverse(o => {
        if (o.isInstancedMesh && o.geometry.type === 'BoxGeometry') books += o.count;
      });
      assert.equal(books, 600, 'Book batching preserves every spine');
      assert.ok(meshes < 250, 'Book alley stays within the batched mesh budget');
    }
    if (lowEnd && !reduced) reports.push({ id, meshes });
    for (const o of g.userData.anim || []) assert.equal(typeof o, 'function');
    g.userData.dispose();
    g.traverse(o => {
      if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
    });
  }
  assert.ok(places.every(p => scenes[p.id]), 'Gallery references a missing scene');
}
assert.ok(labels.includes('경희궁 · 숭정전'));
assert.ok(!labels.includes('덕수궁 돌담길'), 'Removed palace must not return through the patch');
console.log('PASS: 41 entries built, animated and disposed in mobile, desktop and reduced-motion modes.');
console.log('PASS: all 40 gallery entries match the current itinerary and scene builders.');
console.log('Mobile geometry counts:', JSON.stringify(reports));
