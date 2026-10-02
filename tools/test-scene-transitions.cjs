const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const html = readFileSync(resolve(__dirname, '../index.html'), 'utf8');
const emitMove = html.split('\n').find(line => line.startsWith('function emitMove('));
assert.ok(emitMove);

function harness() {
  const timers = [], moves = [], classes = new Set();
  const context = vm.createContext({
    moveSeq: 1,
    $: () => ({ classList: {
      add: c => classes.add(c),
      remove: c => classes.delete(c),
    } }),
    APP: { emit: (_event, move) => moves.push(move) },
    setTimeout: fn => timers.push(fn),
  });
  vm.runInContext(emitMove, context);
  return { context, timers, moves, classes };
}

test('cancelled scene transition cannot overwrite a newer stop', () => {
  const h = harness();
  h.context.emitMove(true, { kind: 'interlude' });
  assert.ok(h.classes.has('fade'));
  h.context.moveSeq++;
  h.context.emitMove(false, { kind: 'jump', stop: 1 });
  h.timers.shift()();
  assert.equal(h.moves.length, 1);
  assert.equal(h.moves[0].kind, 'jump');
  assert.ok(!h.classes.has('fade'));
});

test('old fade completion cannot reveal the newer transition early', () => {
  const h = harness();
  h.context.emitMove(true, { kind: 'jump', stop: 1 });
  h.timers.shift()();
  const oldFinish = h.timers.shift();
  h.context.moveSeq++;
  h.context.emitMove(true, { kind: 'jump', stop: 2 });
  oldFinish();
  assert.ok(h.classes.has('fade'));
  h.timers.shift()();
  h.timers.shift()();
  assert.equal(h.moves.length, 2);
  assert.ok(!h.classes.has('fade'));
});
