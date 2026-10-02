const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');

const motion = import('../scene-motion.js');

test('cinematic easing has bounded, motionless endpoints', async () => {
  const { smootherstep } = await motion;
  assert.equal(smootherstep(-1), 0);
  assert.equal(smootherstep(2), 1);
  assert.equal(smootherstep(.5), .5);
  assert.ok(smootherstep(.001) < 1e-7);
  assert.ok(1 - smootherstep(.999) < 1e-7);
  for (let i = 1; i <= 100; i++) {
    assert.ok(smootherstep(i / 100) >= smootherstep((i - 1) / 100));
  }
});

test('camera springs settle identically at 30, 60 and 120 fps without overshoot', async () => {
  const { springStep } = await motion;
  const results = [30, 60, 120].map(fps => {
    let position = 80, velocity = 0;
    for (let i = 0; i < fps * 3; i++) {
      [position, velocity] = springStep(position, velocity, 12, 3.4, 1 / fps);
      assert.ok(position >= 12 && position <= 80);
      assert.ok(Number.isFinite(velocity));
    }
    assert.ok(Math.abs(position - 12) < .03, 'Camera settles within .03 world units in 3s');
    return position;
  });
  assert.ok(Math.max(...results) - Math.min(...results) < 1e-10);
});

test('interrupted camera movement preserves position and velocity', async () => {
  const { springStep } = await motion;
  const [position, velocity] = springStep(80, 0, 12, 3.4, .3);
  assert.deepEqual(springStep(position, velocity, -20, 3.4, 0), [position, velocity]);
  const next = springStep(position, velocity, -20, 3.4, 1 / 60);
  assert.ok(Math.abs(next[0] - position) < 2);
  assert.ok(next.every(Number.isFinite));
});

test('travel dissolves out before dissolving in and remains clamped', async () => {
  const { travelEnvelope } = await motion;
  assert.deepEqual(travelEnvelope(0), { departure: 1, arrival: 0 });
  assert.deepEqual(travelEnvelope(.5), { departure: 0, arrival: 0 });
  assert.deepEqual(travelEnvelope(1), { departure: 0, arrival: 1 });
  for (let i = -10; i <= 110; i++) {
    const { departure, arrival } = travelEnvelope(i / 100);
    assert.ok(departure >= 0 && departure <= 1);
    assert.ok(arrival >= 0 && arrival <= 1);
    assert.ok(departure + arrival <= 1);
  }
});

test('scene reveal is frame-independent, interruptible and finishes exactly', async () => {
  const { sceneReveal } = await motion;
  const results = [30, 60, 120].map(fps => {
    let weight = 0;
    for (let i = 0; i < fps / 2; i++) weight = sceneReveal(weight, 1, 1 / fps);
    return weight;
  });
  assert.ok(Math.max(...results) - Math.min(...results) < 1e-12);
  assert.ok(results[0] > .93 && results[0] < .94);
  let weight = results[0];
  for (let i = 0; i < 120; i++) weight = sceneReveal(weight, 0, 1 / 60);
  assert.equal(weight, 0, 'Departed scenes can be disposed rather than leaking');
  for (let i = 0; i < 120; i++) weight = sceneReveal(weight, 1, 1 / 60);
  assert.equal(weight, 1, 'Generic-world visibility switches only after a complete reveal');
});

test('reduced motion bypasses scene interpolation', async () => {
  const { sceneReveal, damping } = await motion;
  assert.equal(sceneReveal(.6, 0, 1 / 60, true), 0);
  assert.equal(sceneReveal(.1, 1, 1 / 60, true), 1);
  assert.equal(damping(5, 0), 0);
  assert.equal(damping(5, -1), 0);
});

test('scene dissolve isolates shared materials and preserves their existing shaders', () => {
  const html = readFileSync(new URL('../index.html', `file://${__filename}`), 'utf8');
  const start = html.indexOf('function prepareCinema(g){');
  assert.ok(start > 0);
  const code = html.slice(start, html.indexOf('\nA.isSceneStop=', start));
  const sharedTexture = {};
  const source = {
    userData: { shared: true },
    map: sharedTexture,
    clone() { return { userData: { ...this.userData }, map: this.map }; },
    onBeforeCompile(shader) { shader.fragmentShader = '/* terrain */\n' + shader.fragmentShader; },
    customProgramCacheKey: () => 'terrain',
  };
  const owned = { ...source, userData: {} };
  const objects = [{ material: source }, { material: [source, owned] }];
  const group = { userData: {}, traverse: fn => objects.forEach(fn) };
  const context = vm.createContext({ group });
  vm.runInContext(code + '\nprepareCinema(group);', context);
  const isolated = objects[0].material;
  assert.notEqual(isolated, source);
  assert.equal(source.userData.shared, true, 'Another world must retain its palette material');
  assert.equal(isolated.userData.shared, undefined);
  assert.equal(isolated.userData.sharedTexture, true);
  assert.equal(isolated.map, sharedTexture, 'Dissolving must not allocate duplicate textures');
  assert.equal(objects[1].material[0], isolated, 'Repeated material references share one clone per world');
  assert.equal(objects[1].material[1], owned);
  const shader = { uniforms: {}, fragmentShader: 'void main() { gl_FragColor=vec4(1.); }' };
  isolated.onBeforeCompile(shader, {});
  assert.equal(shader.uniforms.uSceneReveal, group.userData.cinema.reveal);
  assert.ok(shader.fragmentShader.includes('/* terrain */'));
  assert.ok(shader.fragmentShader.includes('discard;'));
  assert.equal(isolated.customProgramCacheKey(), 'terrain-scene-dissolve');
});
