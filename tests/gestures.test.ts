import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GestureEngine } from '../src/gesture-math.ts';
const h = (x = 0.5, pinch = 0.2) => ({ x, y: 0.5, pinch });
test('a brief deliberate pinch and release selects once', () => {
  const engine = new GestureEngine();
  assert.deepEqual(engine.step([h()], 0), []);
  assert.equal(engine.step([h(0.5, 0.9)], 200)[0]?.type, 'click');
  assert.deepEqual(engine.step([h(0.5, 0.9)], 250), []);
});
test('tracking loss freezes and cannot click or jump on re-acquisition', () => {
  const engine = new GestureEngine(); engine.step([h(0.2)], 0);
  assert.deepEqual(engine.step([], 100), []);
  assert.deepEqual(engine.step([h(0.8)], 150), []);
});
test('two hands take priority; switching back to one has no jump', () => {
  const engine = new GestureEngine(); engine.step([h(0.3), h(0.7)], 0);
  const zoom = engine.step([h(0.2), h(0.8)], 100);
  assert.equal(zoom[0]?.type, 'zoom');
  assert.deepEqual(engine.step([h(0.8)], 150), []);
  assert.deepEqual(engine.step([h(0.8, 0.9)], 200), []);
});
test('dragging does not accidentally select on release', () => {
  const engine = new GestureEngine(); engine.step([h(0.3)], 0);
  engine.step([h(0.4)], 100); engine.step([h(0.5)], 150);
  assert.deepEqual(engine.step([h(0.5, 0.9)], 200), []);
});
