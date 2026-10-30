import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cityGuides, offlineGuide, parseNearby, safeWikiURL, nearbyArticles } from '../src/city-guides.ts';
import { distanceKm } from '../src/geo.ts';
test('starter guides link real landmarks near the referenced city and carry provenance', () => {
  assert.equal(cityGuides.length, 6);
  for (const guide of cityGuides) {
    assert.equal(offlineGuide({ ...guide, id: guide.cityId }), guide);
    assert.ok(guide.checkedAt && safeWikiURL(guide.url));
    assert.ok(guide.landmarks.length > 0);
    for (const spot of guide.landmarks) { assert.ok(safeWikiURL(spot.url)); assert.ok(distanceKm({ ...guide, name: guide.name }, spot) < 30); }
  }
  assert.equal(offlineGuide({ name: 'Paris', lat: 33.66, lon: -95.55, id: 4717560 }), undefined);
});
test('nearby parsing rejects missing or invalid coordinates, unsafe URLs and distant articles', () => {
  const page = { title: '<script>test</script>', fullurl: 'https://en.wikipedia.org/wiki/Paris', coordinates: [{ lat: 48.85, lon: 2.35 }], extract: 'Original text' };
  const result = parseNearby({ query: { pages: { a: page, b: { ...page, fullurl: 'javascript:bad' }, c: { ...page, coordinates: [{lat: 0, lon: 0}] }, d: { ...page, coordinates: [{lat: 100, lon: 2}] } } } }, { name: 'Paris', lat: 48.85, lon: 2.35 }, 'en');
  assert.equal(result.length, 1); assert.equal(result[0].summary, 'Original text');
  assert.equal(safeWikiURL('https://en.wikipedia.org.evil.example/wiki/A'), undefined);
});
test('unavailable encyclopedia returns an empty result rather than fabricated content', async () => {
  const previous = globalThis.fetch; globalThis.fetch = async () => { throw new Error('offline'); };
  try { assert.deepEqual(await nearbyArticles({ name: 'test', lat: 0, lon: 0 }, new AbortController().signal), []); }
  finally { globalThis.fetch = previous; }
});
test('cancelled place requests do not continue to another encyclopedia', async () => {
  const controller = new AbortController(); controller.abort();
  await assert.rejects(nearbyArticles({ name: 'test', lat: 0, lon: 0 }, controller.signal), { name: 'AbortError' });
});
