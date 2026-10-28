import { readFile, stat, writeFile } from 'node:fs/promises';
const root = new URL('../public/', import.meta.url);
const files = ['data/cities.json', 'data/land.geojson', 'data/earthquakes-snapshot.geojson', 'models/hand_landmarker.task'];
const times = await Promise.all(files.map(async file => (await stat(new URL(file, root))).mtime.toISOString()));
const cities = JSON.parse(await readFile(new URL(files[0], root), 'utf8'));
const earthquakes = JSON.parse(await readFile(new URL(files[2], root), 'utf8'));
const manifest = { preparedAt: new Date().toISOString(), sources: [
  { id: 'cities', name: 'GeoNames cities15000', url: 'https://download.geonames.org/export/dump/cities15000.zip', license: 'CC BY 4.0', count: cities.length, retrievedAt: times[0] },
  { id: 'land', name: 'Natural Earth 1:50m land', url: 'https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_land.geojson', blobSha: 'c412c52b5286ba727dcb7047ecd6080bcbeb8298', license: 'Public domain', retrievedAt: times[1] },
  { id: 'earthquakes', name: 'USGS M2.5+ past 7 days snapshot', url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson', license: 'USGS public domain; see event contributors', count: earthquakes.features.length, generatedAt: new Date(earthquakes.metadata.generated).toISOString(), retrievedAt: times[2] },
  { id: 'hands', name: 'MediaPipe Hand Landmarker float16 v1', url: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task', license: 'Apache-2.0', retrievedAt: times[3] }
] };
await writeFile(new URL('data/manifest.json', root), JSON.stringify(manifest, null, 2));
console.log(`Manifest: ${cities.length} cities, ${earthquakes.features.length} earthquakes, all source timestamps recorded.`);
