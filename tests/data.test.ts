import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseQuakes, loadQuakes } from '../src/data.ts';
const raw = JSON.parse(readFileSync(new URL('../public/data/earthquakes-snapshot.geojson', import.meta.url), 'utf8'));
test('bundled snapshot preserves real dates, ids and valid geographic coordinates', () => {
  const parsed = parseQuakes(raw, true);
  assert.equal(parsed.snapshot, true);
  assert.equal(parsed.generated, raw.metadata.generated);
  assert.ok(parsed.events.length > 0);
  assert.ok(parsed.events.every(q => Number.isFinite(q.depth) && Math.abs(q.lat) <= 90 && Math.abs(q.lon) <= 180));
  assert.ok(parsed.events.every((q, i) => i === 0 || q.time <= parsed.events[i - 1].time));
});
test('invalid feeds fail, missing magnitudes stay unknown and unsafe links are rejected', () => {
  assert.throws(() => parseQuakes({ features: [] }, false));
  const feature = { id: 'test', geometry: { type: 'Point', coordinates: [12, 30, 10] }, properties: { time: 100, mag: null, place: '<b>test</b>', url: 'javascript:alert(1)' } };
  const parsed = parseQuakes({ metadata: { generated: 100 }, features: [feature, { ...feature, geometry: { type: 'Point', coordinates: [0, 95, 1] } }] }, false);
  assert.equal(parsed.events.length, 1);
  assert.equal(parsed.events[0].magnitude, null);
  assert.equal(parsed.events[0].url, 'https://earthquake.usgs.gov/');
});
test('failed live request falls back to the real snapshot with explicit snapshot state', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    if (calls === 1) throw new Error('simulated offline');
    return new Response(JSON.stringify(raw), { status: 200 });
  };
  // Both responses are controlled here; the second response is the actual bundled snapshot.
  try {
    const result = await loadQuakes();
    assert.equal(result.snapshot, true);
    assert.equal(result.generated, raw.metadata.generated);
    assert.equal(calls, 2);
  } finally { globalThis.fetch = original; }
});
