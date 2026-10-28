import type { QuakeData, CityRow, Manifest } from './types';
import type { Land } from './geo';
export const dataUrl = (path: string) => `${import.meta.env?.BASE_URL ?? '/'}${path}`;
export async function readJSON<T>(url: string, timeout = 12000): Promise<T> {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeout) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<T>;
}
export async function loadGeography() {
  const [cities, land, manifest] = await Promise.all([
    readJSON<CityRow[]>(dataUrl('data/cities.json')),
    readJSON<Land>(dataUrl('data/land.geojson')),
    readJSON<Manifest>(dataUrl('data/manifest.json')),
  ]);
  if (!Array.isArray(cities) || !land.features || !manifest.sources) throw new Error('地理数据不完整');
  return { cities, land, manifest };
}
export function parseQuakes(raw: any, snapshot: boolean): QuakeData {
  if (!raw || !Array.isArray(raw.features) || !Number.isFinite(raw.metadata?.generated)) throw new Error('地震数据格式无效');
  return {
    generated: raw.metadata.generated, snapshot,
    events: raw.features.filter((f: any) => f.geometry?.type === 'Point' && Array.isArray(f.geometry.coordinates) && f.geometry.coordinates.length >= 3 && f.geometry.coordinates.every(Number.isFinite) && Math.abs(f.geometry.coordinates[1]) <= 90 && Math.abs(f.geometry.coordinates[0]) <= 180 && Number.isFinite(f.properties?.time)).map((f: any) => ({
      id: String(f.id), name: String(f.properties.place || '未命名地点'),
      lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], depth: f.geometry.coordinates[2],
      magnitude: Number.isFinite(f.properties.mag) ? f.properties.mag : null, time: f.properties.time,
      url: typeof f.properties.url === 'string' && /^https:\/\/earthquake\.usgs\.gov\//.test(f.properties.url) ? f.properties.url : 'https://earthquake.usgs.gov/',
    })).sort((a: any, b: any) => b.time - a.time),
  };
}
export async function loadQuakes(): Promise<QuakeData> {
  try {
    return parseQuakes(await readJSON('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson', 9000), false);
  } catch {
    return parseQuakes(await readJSON(dataUrl('data/earthquakes-snapshot.geojson')), true);
  }
}
