import { mkdir, writeFile, readFile, mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const sources = [];
const previousManifest = JSON.parse(await readFile(new URL('public/data/manifest.json', root), 'utf8').catch(() => '{"sources":[]}'));
async function download(url) {
  // curl supports standard proxy environment variables and bounded retries.
  return execFileSync('curl', ['--fail', '--location', '--silent', '--show-error', '--max-time', '120', '--retry', '2', url], { maxBuffer: 40 * 1024 * 1024 });
}
await mkdir(new URL('public/data/', root), { recursive: true });
await mkdir(new URL('public/models/', root), { recursive: true });
const temporary = await mkdtemp(join(tmpdir(), 'palmplanet-data-'));
try {
  const cityUrl = 'https://download.geonames.org/export/dump/cities15000.zip';
  const existingCities = new URL('public/data/cities.json', root);
  const cachedCities = await readFile(existingCities, 'utf8').catch(() => null);
  if (cachedCities && process.env.PALMPLANET_REFRESH_CITIES !== '1') {
    sources.push({ id: 'cities', name: 'GeoNames cities15000', url: cityUrl, license: 'CC BY 4.0', count: JSON.parse(cachedCities).length, retrievedAt: (await stat(existingCities)).mtime.toISOString() });
    console.log('Using downloaded city snapshot; set PALMPLANET_REFRESH_CITIES=1 to replace.');
  } else {
  console.log('Downloading GeoNames cities…');
  await writeFile(join(temporary, 'cities.zip'), await download(cityUrl));
  execFileSync('unzip', ['-q', join(temporary, 'cities.zip'), '-d', temporary]);
  const lines = (await readFile(join(temporary, 'cities15000.txt'), 'utf8')).trim().split('\n');
  const cities = lines.map(line => {
    const f = line.split('\t');
    const aliases = [...new Set(f[3].split(',').filter(n => /[\u3400-\u9fff]/.test(n)))].slice(0, 12);
    return [Number(f[0]), f[1], f[2], aliases.join('|'), Number(f[4]), Number(f[5]), f[8], Number(f[14])];
  }).filter(c => Number.isFinite(c[4]) && Number.isFinite(c[5])).sort((a, b) => b[7] - a[7]);
  await writeFile(new URL('public/data/cities.json', root), JSON.stringify(cities));
  sources.push({ id: 'cities', name: 'GeoNames cities15000', url: cityUrl, license: 'CC BY 4.0', count: cities.length, retrievedAt: new Date().toISOString() });
  console.log(`Saved ${cities.length} real city records.`);
  }

  const landUrl = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_land.geojson';
  const existingLand = new URL('public/data/land.geojson', root);
  const cachedLand = await readFile(existingLand, 'utf8').catch(() => null);
  if (cachedLand && process.env.PALMPLANET_REFRESH_LAND !== '1') {
    sources.push(previousManifest.sources.find(s => s.id === 'land') ?? { id: 'land', name: 'Natural Earth 1:50m land', url: landUrl, license: 'Public domain', retrievedAt: (await stat(existingLand)).mtime.toISOString() });
    console.log('Using downloaded Natural Earth snapshot.');
  } else {
  console.log('Downloading Natural Earth land…');
  const land = JSON.parse((await download(landUrl)).toString());
  if (land.type !== 'FeatureCollection') throw new Error('Invalid land dataset');
  await writeFile(new URL('public/data/land.geojson', root), JSON.stringify(land));
  sources.push({ id: 'land', name: 'Natural Earth 1:50m land', url: landUrl, license: 'Public domain', retrievedAt: new Date().toISOString() });
  }

  const quakeUrl = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson';
  console.log('Downloading an actual USGS earthquake snapshot…');
  const quakes = JSON.parse((await download(quakeUrl)).toString());
  if (!quakes.features || !quakes.metadata?.generated) throw new Error('Invalid earthquake feed');
  await writeFile(new URL('public/data/earthquakes-snapshot.geojson', root), JSON.stringify(quakes));
  sources.push({ id: 'earthquakes', name: 'USGS M2.5+ past 7 days snapshot', url: quakeUrl, license: 'USGS public domain; see event contributors', count: quakes.features.length, generatedAt: new Date(quakes.metadata.generated).toISOString(), retrievedAt: new Date().toISOString() });

  const modelUrl = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
  const existingModel = new URL('public/models/hand_landmarker.task', root);
  const cachedModel = await stat(existingModel).catch(() => null);
  if (cachedModel && process.env.PALMPLANET_REFRESH_MODEL !== '1') {
    sources.push(previousManifest.sources.find(s => s.id === 'hands') ?? { id: 'hands', name: 'MediaPipe Hand Landmarker float16 v1', url: modelUrl, license: 'Apache-2.0', retrievedAt: cachedModel.mtime.toISOString() });
    console.log('Using downloaded local hand-landmarker model.');
  } else {
  console.log('Downloading the local hand-landmarker model…');
  await writeFile(new URL('public/models/hand_landmarker.task', root), await download(modelUrl));
  sources.push({ id: 'hands', name: 'MediaPipe Hand Landmarker float16 v1', url: modelUrl, license: 'Apache-2.0', retrievedAt: new Date().toISOString() });
  }
  await writeFile(new URL('public/data/manifest.json', root), JSON.stringify({ preparedAt: new Date().toISOString(), sources }, null, 2));
  console.log('Public datasets and provenance saved.');
} finally {
  await rm(temporary, { recursive: true, force: true });
}
