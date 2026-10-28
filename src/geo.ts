import GeographicLib from 'geographiclib-geodesic';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import type { CityRow, Place } from './types';

export type Land = FeatureCollection<Polygon | MultiPolygon>;
const { Geodesic } = GeographicLib;
const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
export const normalizeLongitude = (lon: number) => ((lon + 180) % 360 + 360) % 360 - 180;
export function antipode(p: Place): Place {
  return { name: `${p.name}的地球对面`, lat: -p.lat, lon: normalizeLongitude(p.lon + 180) };
}
export function distanceKm(a: Place, b: Place): number {
  return Geodesic.WGS84.Inverse(a.lat, a.lon, b.lat, b.lon).s12! / 1000;
}
export function routePoints(a: Place, b: Place, segments = 160): Place[] {
  if (distanceKm(a, b) < 0.000001) return [a, b];
  const line = Geodesic.WGS84.InverseLine(a.lat, a.lon, b.lat, b.lon);
  return Array.from({ length: segments + 1 }, (_, i) => {
    const point = line.Position(line.s13 * i / segments);
    return { name: '', lat: point.lat2!, lon: point.lon2! };
  });
}
export function isLand(p: Place, land: Land): boolean {
  return land.features.some(feature => booleanPointInPolygon([normalizeLongitude(p.lon), p.lat], feature));
}
export function cityPlace(row: CityRow): Place {
  const chinese = row[3].split('|').find(s => s && !/[ぁ-ゟ゠-ヿ]/.test(s));
  return { id: row[0], name: chinese || row[1], lat: row[4], lon: row[5], country: row[6] };
}
export function searchCities(rows: CityRow[], query: string, limit = 8): CityRow[] {
  const q = normalize(query);
  if (!q) return [];
  return rows.map(row => {
    const names = [row[1], row[2], ...row[3].split('|')].map(normalize);
    const score = names.some(n => n === q) ? 3 : names.some(n => n.startsWith(q)) ? 2 : names.some(n => n.includes(q)) ? 1 : 0;
    return { row, score };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score || b.row[7] - a.row[7]).slice(0, limit).map(x => x.row);
}
// Spherical screening only; the final displayed distance uses WGS84 geodesics.
export function nearestCity(p: Place, rows: CityRow[]): { place: Place; km: number } | null {
  const rad = Math.PI / 180;
  const candidates = rows.map(row => {
    const dLat = (row[4] - p.lat) * rad, dLon = (row[5] - p.lon) * rad;
    const score = Math.sin(dLat / 2) ** 2 + Math.cos(p.lat * rad) * Math.cos(row[4] * rad) * Math.sin(dLon / 2) ** 2;
    return { row, score };
  }).sort((a, b) => a.score - b.score).slice(0, 12);
  return candidates.map(({ row }) => { const place = cityPlace(row); return { place, km: distanceKm(p, place) }; }).sort((a, b) => a.km - b.km)[0] ?? null;
}
export function coordinates(p: Place): string {
  return `${Math.abs(p.lat).toFixed(2)}°${p.lat < 0 ? 'S' : 'N'} · ${Math.abs(p.lon).toFixed(2)}°${p.lon < 0 ? 'W' : 'E'}`;
}
export function formatKm(km: number): string {
  return km.toLocaleString('zh-CN', { maximumFractionDigits: km < 100 ? 1 : 0 });
}
