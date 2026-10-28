import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { antipode, distanceKm, routePoints, isLand, searchCities, nearestCity } from '../src/geo.ts';
import type { Land } from '../src/geo.ts';
import type { CityRow } from '../src/types.ts';
const p = (lat: number, lon: number) => ({ name: 'test', lat, lon });
test('WGS84 equatorial and meridional degree distances', () => {
  assert.ok(Math.abs(distanceKm(p(0, 0), p(0, 1)) - 111.319490793) < 1e-6);
  assert.ok(Math.abs(distanceKm(p(0, 0), p(1, 0)) - 110.574388558) < 1e-6);
});
test('identical, antipodal, polar and dateline points remain finite', () => {
  assert.equal(distanceKm(p(30, 120), p(30, 120)), 0);
  assert.ok(Math.abs(distanceKm(p(0, 0), p(0, 180)) - 20003.931458625) < 1e-5);
  assert.ok(distanceKm(p(0, 179.9), p(0, -179.9)) < 23);
  assert.ok(Number.isFinite(distanceKm(p(90, 0), p(-90, 30))));
  assert.ok(routePoints(p(0, 0), p(0, 180)).every(x => Number.isFinite(x.lat) && Number.isFinite(x.lon)));
});
test('antipode twice returns starting coordinate, including dateline', () => {
  for (const point of [p(31, 121), p(-45, -90), p(0, -180)]) {
    const result = antipode(antipode(point));
    assert.equal(result.lat || 0, point.lat || 0);
    assert.equal(result.lon, point.lon);
  }
});
test('actual bundled land polygons distinguish inland and ocean points', () => {
  const land = JSON.parse(readFileSync(new URL('../public/data/land.geojson', import.meta.url), 'utf8')) as Land;
  assert.equal(isLand(p(48.85, 2.35), land), true);
  assert.equal(isLand(p(0, -140), land), false);
  assert.equal(isLand(p(-85, 0), land), true);
});
test('bundled city search supports Chinese and Latin names, and nearest city uses actual coordinates', () => {
  const cities = JSON.parse(readFileSync(new URL('../public/data/cities.json', import.meta.url), 'utf8')) as CityRow[];
  const beijing = searchCities(cities, '北京')[0];
  assert.ok(beijing && Math.abs(beijing[4] - 39.9) < 0.2);
  assert.equal(searchCities(cities, 'Beijing')[0][0], beijing[0]);
  assert.equal(nearestCity(p(beijing[4], beijing[5]), cities)!.km, 0);
  assert.deepEqual(searchCities(cities, ''), []);
});
