import 'cesium/Build/Cesium/Widgets/widgets.css';
import './style.css';
import { Globe } from './globe';
import type { Layer } from './globe';
import { loadGeography, loadQuakes } from './data';
import { antipode, cityPlace, coordinates, distanceKm, formatKm, isLand, nearestCity, searchCities } from './geo';
import type { Land } from './geo';
import type { CityRow, Manifest, Mode, Place, Quake, QuakeData } from './types';
import { GestureController } from './gestures';

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const escapeHTML = (value: unknown) => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
const countryNames = new Intl.DisplayNames(['zh-CN'], { type: 'region' });
const country = (code?: string) => code ? countryNames.of(code) || code : '';
const dateTime = (time: number | string) => new Date(time).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
const shortDate = (time: string | number) => new Date(time).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
let cities: CityRow[] = [], land: Land | undefined, manifest: Manifest | undefined;
let mode: Mode = 'explore', current: Place | undefined, endpoints: Place[] = [], opposite: Place | undefined;
let earthquakeData: QuakeData | undefined, chosenQuake: Quake | undefined, minMagnitude = 2.5;
let fetchingQuakes = false, quakeFailed = false, globe: Globe | undefined;
let toastTimer = 0, suggestions: CityRow[] = [], searchTimer = 0;
let cameraOn = false;

function toast(message: string) {
  $('#toast').textContent = message; $('#toast').hidden = false;
  window.clearTimeout(toastTimer); toastTimer = window.setTimeout(() => { $('#toast').hidden = true; }, 5500);
}
function placeBox(place: Place, prefix = '') {
  return `<div class="place-box"><span class="place-initial">${prefix || '◎'}</span><div><strong>${escapeHTML(place.name)}</strong><small>${escapeHTML(country(place.country))}${place.country ? ' · ' : ''}${coordinates(place)}</small></div></div>`;
}
function render() {
  const content = $('#panel-content');
  if (mode === 'explore') {
    content.innerHTML = `<div class="section-label"><span>01 / 自由探索</span><span>↗</span></div>${current ? `${placeBox(current)}<div class="fact-card"><span class="tiny-label">你选中的这一点</span><h3>${land ? isLand(current, land) ? '脚下是陆地。' : '这里是一片水域。' : '正在读取海陆数据'}</h3><p>真实经纬度，把世界上的位置连接起来。</p></div><div class="button-row"><button class="primary" data-action="look-opposite">看看它的对面 ↗</button><button class="secondary" data-action="use-start">从这里量距离</button></div><button class="text-button" data-action="fly-close">拉近看看这个位置 ↓</button><p class="accuracy-note">海陆判断来自简化海岸线，近岸和小岛可能有误差。拉近后可切换城市街道。</p>` : `<h3 class="prompt-title">好奇心的第一站，<br>由你来选。</h3><p class="body-copy">搜索一座城市，或者直接点一点地球。每个位置，都能成为一次发现的起点。</p><div class="quick-places"><button data-query="北京">北京 ↗</button><button data-query="东京">东京 ↗</button><button data-query="London">伦敦 ↗</button><button data-query="Sydney">悉尼 ↗</button></div><div class="question-card"><span>今天的小问题</span><p>如果一直往前走，<br>会不会回到出发的地方？</p><small>转一转地球，先想想看。</small></div>`}`;
  } else if (mode === 'distance') {
    content.innerHTML = `<div class="section-label"><span>02 / 量一量世界</span><span>⌁</span></div><h3 class="prompt-title">从这里，到那里。</h3><p class="body-copy">搜索城市或点击地球，依次选择起点 A 和终点 B。</p><div class="endpoints">${endpoints[0] ? placeBox(endpoints[0], 'A') : '<div class="empty-place"><span>A</span>先选一个出发地</div>'}<div class="endpoint-line"></div>${endpoints[1] ? placeBox(endpoints[1], 'B') : '<div class="empty-place"><span>B</span>再选一个目的地</div>'}</div>${endpoints.length === 2 ? `<div class="distance-result"><span class="tiny-label">沿地表的最短距离 · WGS84</span><div><strong>${formatKm(distanceKm(endpoints[0], endpoints[1]))}</strong><span>公里</span></div><p>球面上的路线，看起来是一条弧线。</p></div><div class="button-row"><button class="primary" data-action="fit-route">同时看两点 ↗</button><button class="secondary" data-action="reset-route">重新选点</button></div><p class="accuracy-note">按 WGS84 椭球测地线计算，不是驾车里程，也不计山路起伏。地点坐标代表城市参考点。</p>` : '<div class="tip"><span>试试看</span><p>选两个很远的城市，看看连线怎么绕过地球。</p></div>'}`;
  } else if (mode === 'antipode') {
    const nearest = opposite ? nearestCity(opposite, cities) : null;
    content.innerHTML = `<div class="section-label"><span>03 / 地球另一边</span><span>◐</span></div><h3 class="prompt-title">穿过地心，<br>对面是什么？</h3>${opposite && current && land ? `${placeBox(current, 'A')}<div class="opposite-result"><span class="tiny-label">先猜一下：海洋，还是陆地？</span><h3>${isLand(opposite, land) ? '对面是陆地！' : '对面是水域！'}</h3><p>${coordinates(opposite)}</p></div><div class="button-row"><button class="primary" data-action="reveal-opposite">转过去看看 ↗</button><button class="secondary" data-action="back-origin">回到起点</button></div>${nearest ? `<div class="nearby"><span class="tiny-label">城市库中较近的城市</span><strong>${escapeHTML(nearest.place.name)} · ${escapeHTML(country(nearest.place.country))}</strong><p>距对面点约 ${formatKm(nearest.km)} 公里</p></div>` : ''}<p class="accuracy-note">对跖点按经纬度计算。海陆依据 Natural Earth 1:5000 万简化边界；近岸、小岛及内陆水体可能误判。附近城市只在当前城市库中查找。</p>` : '<p class="body-copy">选一座城市，或者点一下地球。我们找到它正对面的坐标，再把地球转过去。</p><div class="question-card"><span>先来猜一猜</span><p>每座城市的对面，<br>也有一座城市吗？</p><small>从北京或悉尼开始试试。</small></div>'}`;
  } else {
    const events = earthquakeData?.events.filter(q => (q.magnitude ?? -Infinity) >= minMagnitude) || [];
    content.innerHTML = `<div class="section-label"><span>04 / 地球正在发生什么</span><span>ϟ</span></div><h3 class="prompt-title">寻找地球的震动。</h3><p class="body-copy">USGS 最近七天记录。点一下光点，看看震动发生在哪里。</p><div class="quake-controls"><label>震级 <select id="magnitude"><option value="2.5" ${minMagnitude === 2.5 ? 'selected' : ''}>M 2.5+</option><option value="4" ${minMagnitude === 4 ? 'selected' : ''}>M 4.0+</option><option value="5" ${minMagnitude === 5 ? 'selected' : ''}>M 5.0+</option></select></label><button class="text-button" data-action="refresh-quakes" ${fetchingQuakes ? 'disabled' : ''}>${fetchingQuakes ? '更新中…' : '刷新 ↻'}</button></div>${quakeFailed ? '<div class="tip"><p>暂时无法读取地震数据，请稍后重试。</p></div>' : ''}${earthquakeData ? `<div class="feed-state ${earthquakeData.snapshot ? 'snapshot' : ''}"><i></i>${earthquakeData.snapshot ? '离线快照 · 不是当前最新记录' : '已联网获取 · 观测记录可能修订'}<small>数据生成于 ${dateTime(earthquakeData.generated)}（北京时间）</small></div>` : '<div class="tip"><p>正在向 USGS 获取真实地震记录…</p></div>'}${chosenQuake ? `<div class="quake-detail"><span class="tiny-label">观测记录 · ${escapeHTML(chosenQuake.id)}</span><h3>M ${chosenQuake.magnitude?.toFixed(1) ?? '未知'}</h3><strong>${escapeHTML(chosenQuake.name)}</strong><div class="quake-facts"><span>深度 <b>${chosenQuake.depth.toFixed(1)} km</b></span><span>${coordinates(chosenQuake)}</span></div><p>${dateTime(chosenQuake.time)}（北京时间）</p><a href="${escapeHTML(chosenQuake.url)}" target="_blank" rel="noopener noreferrer">查看 USGS 原始记录 ↗</a></div>` : ''}${earthquakeData ? `<div class="quake-list-heading">${events.length} 次记录 <span>按时间排列 · 最新 ${Math.min(events.length, 50)} 条</span></div><div class="quake-list">${events.slice(0, 50).map(q => `<button data-quake="${escapeHTML(q.id)}" class="quake-item ${q.id === chosenQuake?.id ? 'selected' : ''}"><span class="magnitude">${q.magnitude?.toFixed(1) ?? '?'}</span><span><strong>${escapeHTML(q.name)}</strong><small>${dateTime(q.time)} · 深 ${q.depth.toFixed(0)} km</small></span><span>↗</span></button>`).join('') || '<p class="body-copy">这份记录中没有符合筛选条件的地震。</p>'}</div>` : ''}<p class="accuracy-note">地震光点表示位置与震级，大小仅作视觉区分。震级不等于当地破坏程度；数据存在延迟及地区覆盖差异。</p>`;
  }
  $('#data-status').textContent = cities.length ? `${cities.length.toLocaleString('zh-CN')} 座城市 · 真实坐标` : '正在准备真实地理数据…';
}
function syncGlobe() {
  if (!globe) return;
  globe.setQuakesVisible(mode === 'earthquakes');
  if (mode === 'earthquakes') globe.showPlaces(chosenQuake ? [chosenQuake] : []);
  else if (mode === 'distance') globe.showPlaces(endpoints, 'distance');
  else if (mode === 'antipode' && current && opposite) globe.showPlaces([current, opposite], 'antipode');
  else globe.showPlaces(current ? [current] : []);
}
const headings: Record<Mode, [string, string]> = {
  explore: ['一颗星球，无数个为什么', '今天，想探索哪里？'],
  distance: ['把遥远，变成看得见的距离', '世界到底有多大？'],
  antipode: ['从一个坐标，找到另一个世界', '地球另一边，见。'],
  earthquakes: ['真实观测 · USGS EARTHQUAKES', '地球，也在轻轻动。'],
};
function setMode(next: Mode) {
  mode = next;
  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button => { const active = button.dataset.mode === next; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
  $('#mode-eyebrow').textContent = headings[next][0]; $('#world-heading').textContent = headings[next][1];
  $('#search-results').hidden = true;
  $('.explorer').scrollTop = 0;
  if (next === 'antipode' && current) opposite = antipode(current);
  render(); syncGlobe();
  if (next === 'earthquakes' && !chosenQuake) globe?.home();
  if (next === 'earthquakes' && !earthquakeData && !fetchingQuakes) void refreshQuakes();
}
function choosePlace(place: Place, fly = true) {
  if (!land || !globe) return;
  current = place;
  if (mode === 'distance') {
    if (endpoints.length === 2) { endpoints = []; toast('开始一次新的测量，已选好起点 A。'); }
    endpoints.push(place);
  }
  if (mode === 'antipode') opposite = antipode(place);
  chosenQuake = undefined;
  syncGlobe(); render();
  if (mode === 'distance' && endpoints.length === 2) globe.fitPlaces(endpoints);
  else if (fly) globe.fly(place, 2_800_000);
  $('#search-results').hidden = true;
}
function chooseQuake(id: string) {
  const q = earthquakeData?.events.find(event => event.id === id); if (!q || !globe) return;
  chosenQuake = q; current = q; globe.showPlaces([q]); globe.fly(q, 2_400_000); render();
}
async function refreshQuakes() {
  if (fetchingQuakes) return;
  fetchingQuakes = true; quakeFailed = false; render();
  try {
    earthquakeData = await loadQuakes();
    if (chosenQuake) chosenQuake = earthquakeData.events.find(q => q.id === chosenQuake!.id);
    globe?.showQuakes(earthquakeData.events.filter(q => (q.magnitude ?? -Infinity) >= minMagnitude), mode === 'earthquakes');
  } catch { quakeFailed = true; toast('地震数据暂时不可用。地点搜索和测距仍可继续。'); }
  finally { fetchingQuakes = false; render(); }
}
function showSuggestions() {
  suggestions = searchCities(cities, $<HTMLInputElement>('#search').value);
  const results = $('#search-results');
  results.innerHTML = suggestions.map((row, i) => `<button data-city-index="${i}"><span><strong>${escapeHTML(cityPlace(row).name)}</strong><small>${escapeHTML(row[1])} · ${escapeHTML(country(row[6]))}</small></span><span>↗</span></button>`).join('') || '<p>没有找到这座城市。试试其他名称或英文。</p>';
  results.hidden = !$<HTMLInputElement>('#search').value.trim();
}
function renderSources() {
  $('#sources-content').innerHTML = `<p class="body-copy">位置和数值来自公开数据或地理计算。图层会显示来源，离线快照会标出日期。当前城市库与海陆边界可在本地读取。</p><div class="source-row"><span>地名与坐标</span><strong>GeoNames · CC BY 4.0</strong><p>${cities.length.toLocaleString('zh-CN')} 条城市记录，中英文别名；城市坐标是参考点。</p><a href="https://www.geonames.org/export/" target="_blank" rel="noopener noreferrer">查看来源 ↗</a></div><div class="source-row"><span>海陆与概览底图</span><strong>Natural Earth · Public domain</strong><p>海陆判断采用 1:5000 万陆地边界；本地底图来自 Cesium 随附的 Natural Earth II。近岸、小岛、内陆水体可能存在误差；底图明暗是地形晕渲，不是实时光照。</p><a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer">查看来源 ↗</a></div><div class="source-row"><span>地表距离与地球对面</span><strong>WGS84 · GeographicLib</strong><p>距离是椭球测地线长度；对跖点为纬度取反、经度相差 180°。两者都是计算结果。</p><a href="https://geographiclib.sourceforge.io/" target="_blank" rel="noopener noreferrer">查看算法 ↗</a></div><div class="source-row"><span>地震观测</span><strong>USGS · M2.5+ 七天记录</strong><p>在线获取失败时读取真实快照。快照生成：${manifest?.sources.find(s => s.id === 'earthquakes')?.generatedAt ? dateTime(manifest.sources.find(s => s.id === 'earthquakes')!.generatedAt!) : '请查看快照元数据'}（北京时间）。记录存在延迟、修订和覆盖差异。</p><a href="https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php" target="_blank" rel="noopener noreferrer">查看来源 ↗</a></div><div class="source-row"><span>在线街道与卫星图层</span><strong>OpenStreetMap / NASA GIBS</strong><p>街道数据 © OpenStreetMap contributors，采用 ODbL；NASA 卫星图层为所选日期的 MODIS Terra 真彩色观测，可能有云和缺测。均需联网，精度随来源变化。</p><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OSM 授权 ↗</a> · <a href="https://nasa-gibs.github.io/gibs-api-docs/" target="_blank" rel="noopener noreferrer">NASA GIBS ↗</a></div><p class="accuracy-note">数据包准备日期：${manifest ? shortDate(manifest.preparedAt) : '加载中'}。第一版使用椭球表面；山地立体高程、地球剖面和天文图层将在后续版本加入。摄像头画面仅在本机识别，不保存、不上传。</p>`;
}

render();
document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode as Mode)));
$('#search').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = window.setTimeout(showSuggestions, 120); });
$('#search').addEventListener('keydown', event => { if ((event as KeyboardEvent).key === 'Escape') $('#search-results').hidden = true; });
$('#search-form').addEventListener('submit', event => { event.preventDefault(); clearTimeout(searchTimer); showSuggestions(); if (suggestions[0]) choosePlace(cityPlace(suggestions[0])); });
$('#search-results').addEventListener('click', event => { const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-city-index]'); if (button) choosePlace(cityPlace(suggestions[Number(button.dataset.cityIndex)])); });
$('#panel-content').addEventListener('click', event => {
  const button = (event.target as HTMLElement).closest<HTMLElement>('button'); if (!button) return;
  if (button.dataset.query) { $<HTMLInputElement>('#search').value = button.dataset.query; showSuggestions(); if (suggestions[0]) choosePlace(cityPlace(suggestions[0])); }
  if (button.dataset.quake) chooseQuake(button.dataset.quake);
  switch (button.dataset.action) {
    case 'look-opposite': setMode('antipode'); break;
    case 'use-start': if (current) { endpoints = [current]; setMode('distance'); } break;
    case 'fly-close': if (current) globe?.fly(current, 65000); break;
    case 'reset-route': endpoints = []; syncGlobe(); render(); break;
    case 'fit-route': globe?.fitPlaces(endpoints); break;
    case 'reveal-opposite': if (opposite) globe?.fly(opposite, 5_000_000, 2.3); break;
    case 'back-origin': if (current) globe?.fly(current, 4_000_000); break;
    case 'refresh-quakes': void refreshQuakes(); break;
  }
});
$('#panel-content').addEventListener('change', event => { if ((event.target as HTMLElement).id === 'magnitude') { minMagnitude = Number((event.target as HTMLSelectElement).value); globe?.showQuakes(earthquakeData?.events.filter(q => (q.magnitude ?? -Infinity) >= minMagnitude) || [], mode === 'earthquakes'); chosenQuake = undefined; render(); } });
$('#home').addEventListener('click', () => globe?.home());
$('#zoom-in').addEventListener('click', () => globe?.zoom(0.2));
$('#zoom-out').addEventListener('click', () => globe?.zoom(-0.2));
const satelliteDate = $<HTMLInputElement>('#satellite-date');
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
satelliteDate.value = yesterday; satelliteDate.max = yesterday; satelliteDate.min = '2000-02-24';
async function switchLayer() {
  const layer = $<HTMLSelectElement>('#layer').value as Layer;
  satelliteDate.hidden = layer !== 'satellite';
  $('#map-note').textContent = layer === 'earth' ? '本地概览底图 · 拉近后可切换城市街道' : layer === 'streets' ? '在线街道 · OpenStreetMap · 各地详细程度不同' : `NASA 卫星观测 · ${satelliteDate.value} · 可能有云或缺测`;
  try { await globe?.setLayer(layer, satelliteDate.value, () => toast('在线图层暂时未完整加载，可切回本地自然地球继续探索。')); }
  catch { toast('图层加载失败，请切回本地自然地球。'); }
}
$('#layer').addEventListener('change', () => void switchLayer()); satelliteDate.addEventListener('change', () => { if (satelliteDate.validity.valid && satelliteDate.value) void switchLayer(); });
const dialog = $<HTMLDialogElement>('#sources-dialog');
$('#sources-button').addEventListener('click', () => { renderSources(); dialog.showModal(); });
$('#sources-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
const gestures = new GestureController($<HTMLVideoElement>('#camera-video'), action => {
  if (!globe) return;
  if (action.type === 'rotate') globe.rotate(action.dx, action.dy);
  if (action.type === 'zoom') globe.zoom(action.amount);
  if (action.type === 'click') globe.pick(action.x * globe.canvas.clientWidth, action.y * globe.canvas.clientHeight);
}, text => { $('#gesture-status').textContent = text; }, (x, y) => {
  const cursor = $('#hand-cursor'); cursor.hidden = x === undefined || y === undefined;
  if (x !== undefined && y !== undefined && globe) { const r = globe.canvas.getBoundingClientRect(); cursor.style.left = `${r.left + x * r.width}px`; cursor.style.top = `${r.top + y * r.height}px`; }
}, message => { stopCamera(); toast(message); });
function stopCamera() { gestures.stop(); cameraOn = false; $('#camera-panel').hidden = true; $('#camera-button').innerHTML = '<span>✋</span> 开启手势'; $('#camera-button').classList.remove('enabled'); }
$('#camera-button').addEventListener('click', async () => {
  if (cameraOn) { stopCamera(); return; }
  cameraOn = true; $('#camera-panel').hidden = false; $('#camera-button').textContent = '手势已开启'; $('#camera-button').classList.add('enabled');
  try { await gestures.start(); }
  catch (error) { stopCamera(); toast(error instanceof Error ? error.message : '手势未能开启，可以继续用鼠标探索。'); }
});
$('#camera-stop').addEventListener('click', stopCamera); window.addEventListener('pagehide', stopCamera);
async function initialize() {
  try {
    globe = new Globe('globe', (place, quakeId) => { if (quakeId && mode === 'earthquakes') chooseQuake(quakeId); else choosePlace(place, false); });
    const [geography] = await Promise.all([loadGeography(), globe.initialize()]);
    cities = geography.cities; land = geography.land; manifest = geography.manifest;
    $<HTMLInputElement>('#search').disabled = false; $('#globe-loading').hidden = true; render();
    setInterval(() => { if (!globe || document.hidden) return; const km = globe.height / 1000; $('#view-height').textContent = km > 1000 ? `视点高度约 ${formatKm(km)} km` : `视点高度约 ${km.toFixed(1)} km`; }, 700);
  } catch (error) {
    $('#globe-loading').innerHTML = '<div class="error-state"><strong>地球暂时没有准备好</strong><p>请确认浏览器支持 WebGL，并通过本地服务或 HTTPS 打开。</p><button onclick="location.reload()">重新试试</button></div>';
    $('#data-status').textContent = '加载未完成，请重新打开'; console.error(error);
  }
}
void initialize();
