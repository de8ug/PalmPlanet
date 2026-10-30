import seeds from './content/city-guides.json';
import { distanceKm } from './geo';
import type { Place } from './types';
export interface Landmark extends Place { summary: string; url: string }
export interface CityGuide { cityId?: number; name: string; lat: number; lon: number; summary: string; url: string; checkedAt?: string; landmarks: Landmark[]; online?: boolean }
export const cityGuides: CityGuide[] = seeds;
export function offlineGuide(city: Place): CityGuide | undefined {
  // Match the GeoNames identity, never a same-named city in a different country.
  return cityGuides.find(g => g.cityId === city.id);
}
export function safeWikiURL(value: unknown): string | undefined {
  if (typeof value !== 'string') return;
  try { const url = new URL(value); if (url.protocol === 'https:' && /^(zh|en)\.wikipedia\.org$/.test(url.hostname) && url.pathname.startsWith('/wiki/')) return url.href; } catch { /* Untrusted source URL. */ }
}
export function parseNearby(raw: any, place: Place, language: 'zh' | 'en'): Landmark[] {
  if (raw?.error || !raw?.query?.pages) throw new Error('百科资料暂不可用');
  return Object.values(raw.query.pages).flatMap((p: any): Landmark[] => {
    const coordinate = p.coordinates?.[0];
    const url = safeWikiURL(p.fullurl);
    if (!coordinate || !Number.isFinite(coordinate.lat) || !Number.isFinite(coordinate.lon) || Math.abs(coordinate.lat) > 90 || Math.abs(coordinate.lon) > 180 || !url || typeof p.title !== 'string') return [];
    const point = { name: p.title.slice(0, 150), lat: coordinate.lat, lon: coordinate.lon };
    if (distanceKm(place, point) > 10.5) return [];
    return [{ ...point, url, summary: typeof p.extract === 'string' && p.extract.trim() ? p.extract.slice(0, 360) : (language === 'zh' ? '该条目没有简短介绍，可以查看来源。' : 'No short introduction available. Open the source to read more.') }];
  }).sort((a, b) => distanceKm(place, a) - distanceKm(place, b)).slice(0, 6);
}
export async function nearbyArticles(place: Place, signal: AbortSignal): Promise<Landmark[]> {
  for (const language of ['zh', 'en'] as const) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    try {
      const params = new URLSearchParams({ action: 'query', generator: 'geosearch', ggscoord: `${place.lat.toFixed(3)}|${place.lon.toFixed(3)}`, ggsradius: '10000', ggslimit: '8', ggsnamespace: '0', prop: 'extracts|coordinates|info', exintro: '1', explaintext: '1', exchars: '360', inprop: 'url', format: 'json', origin: '*' });
      const response = await fetch(`https://${language}.wikipedia.org/w/api.php?${params}`, { signal: AbortSignal.any([signal, AbortSignal.timeout(6500)]) });
      if (!response.ok) throw new Error('百科服务未响应');
      const points = parseNearby(await response.json(), place, language);
      if (points.length) return points;
    } catch (error) { if (signal.aborted) throw error; }
  }
  return [];
}
