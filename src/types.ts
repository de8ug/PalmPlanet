export interface Place { name: string; lat: number; lon: number; id?: number | string; country?: string }
export type CityRow = [number, string, string, string, number, number, string, number];
export type Mode = 'explore' | 'distance' | 'antipode' | 'earthquakes';
export interface Quake { id: string; name: string; lat: number; lon: number; magnitude: number | null; depth: number; time: number; url: string }
export interface QuakeData { events: Quake[]; generated: number; snapshot: boolean }
export interface Manifest { preparedAt: string; sources: { id: string; name: string; url: string; license: string; count?: number; retrievedAt: string; generatedAt?: string }[] }
