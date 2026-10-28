import * as C from 'cesium';
import type { Place, Quake } from './types';
import { routePoints } from './geo';
import { dataUrl } from './data';

export type Layer = 'earth' | 'streets' | 'satellite';
export class Globe {
  viewer: C.Viewer;
  private marks = new C.CustomDataSource('exploration');
  private quakes = new C.CustomDataSource('earthquakes');
  private overlay?: C.ImageryLayer;
  private layerGeneration = 0;
  private onPick: (place: Place, quakeId?: string) => void;
  constructor(container: string, onPick: (place: Place, quakeId?: string) => void) {
    this.onPick = onPick;
    this.viewer = new C.Viewer(container, {
      animation: false, timeline: false, baseLayerPicker: false, geocoder: false,
      homeButton: false, sceneModePicker: false, navigationHelpButton: false,
      fullscreenButton: false, infoBox: false, selectionIndicator: false,
      baseLayer: false, skyBox: false, scene3DOnly: true,
      contextOptions: { webgl: { alpha: true } },
    });
    this.viewer.scene.backgroundColor = C.Color.TRANSPARENT;
    this.viewer.scene.globe.baseColor = C.Color.fromCssColorString('#153d50');
    this.viewer.scene.globe.showGroundAtmosphere = true;
    this.viewer.scene.globe.enableLighting = false;
    this.viewer.scene.screenSpaceCameraController.minimumZoomDistance = 150;
    this.viewer.scene.screenSpaceCameraController.maximumZoomDistance = 50_000_000;
    this.viewer.scene.postProcessStages.fxaa.enabled = true;
    this.viewer.resolutionScale = Math.min(window.devicePixelRatio, 1.6);
    this.viewer.dataSources.add(this.marks);
    this.viewer.dataSources.add(this.quakes);
    // Avoid the default double-click zoom competing with point selection.
    this.viewer.screenSpaceEventHandler.removeInputAction(C.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
    this.viewer.screenSpaceEventHandler.setInputAction((event: { position: C.Cartesian2 }) => this.pick(event.position.x, event.position.y), C.ScreenSpaceEventType.LEFT_CLICK);
    this.home(0);
  }
  async initialize() {
    const provider = await C.TileMapServiceImageryProvider.fromUrl(dataUrl('vendor/cesium/Assets/Textures/NaturalEarthII'), {
      credit: new C.Credit('Natural Earth II · public domain'), maximumLevel: 2,
    });
    this.viewer.imageryLayers.addImageryProvider(provider);
  }
  home(duration = 1.4) {
    this.viewer.camera.flyTo({ destination: C.Cartesian3.fromDegrees(108, 23, 12_800_000), duration });
  }
  fly(place: Place, height = 3_000_000, duration = 1.5) {
    this.viewer.camera.flyTo({ destination: C.Cartesian3.fromDegrees(place.lon, place.lat, height), duration });
  }
  marker(place: Place, label: string, color = '#f7b267') {
    this.marks.entities.add({
      position: C.Cartesian3.fromDegrees(place.lon, place.lat, 250),
      point: { pixelSize: 11, color: C.Color.fromCssColorString(color), outlineColor: C.Color.WHITE, outlineWidth: 2, disableDepthTestDistance: 0 },
      label: { text: label, font: '15px "Avenir Next", "PingFang SC", sans-serif', fillColor: C.Color.WHITE,
        outlineColor: C.Color.fromCssColorString('#132d3a'), outlineWidth: 5, style: C.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new C.Cartesian2(0, -27), verticalOrigin: C.VerticalOrigin.BOTTOM,
        distanceDisplayCondition: new C.DistanceDisplayCondition(0, 40_000_000) },
    });
  }
  showPlaces(places: Place[], kind: 'selection' | 'distance' | 'antipode' = 'selection') {
    this.marks.entities.removeAll();
    places.forEach((place, i) => this.marker(place, kind === 'distance' ? `${i ? 'B' : 'A'} · ${place.name}` : place.name, i ? '#78d9c4' : '#f7b267'));
    if (places.length === 2 && kind === 'distance') {
      const samples = routePoints(places[0], places[1]);
      this.marks.entities.add({ polyline: {
        positions: samples.map(p => C.Cartesian3.fromDegrees(p.lon, p.lat, 5000)),
        width: 3, material: new C.PolylineGlowMaterialProperty({ glowPower: 0.18, color: C.Color.fromCssColorString('#f7c389') }), arcType: C.ArcType.NONE,
      } });
    }
  }
  fitPlaces(places: Place[]) {
    if (places.length < 2) return;
    const sphere = C.BoundingSphere.fromPoints(places.map(p => C.Cartesian3.fromDegrees(p.lon, p.lat)));
    this.viewer.camera.flyToBoundingSphere(sphere, {
      duration: 1.5, offset: new C.HeadingPitchRange(0, -Math.PI / 2, Math.max(sphere.radius * 3, 800_000)),
    });
  }
  showQuakes(events: Quake[], visible: boolean) {
    this.quakes.entities.removeAll();
    this.quakes.show = visible;
    for (const q of events) {
      this.quakes.entities.add({ id: `quake:${q.id}`, position: C.Cartesian3.fromDegrees(q.lon, q.lat, 1000),
        point: { pixelSize: Math.min(20, 4 + Math.max(0, q.magnitude ?? 0) * 1.6),
          color: C.Color.fromCssColorString((q.magnitude ?? 0) >= 5 ? '#ff886d' : '#f9c379').withAlpha(0.85),
          outlineColor: C.Color.fromCssColorString('#fff1d6').withAlpha(0.55), outlineWidth: 1,
        } });
    }
  }
  setQuakesVisible(visible: boolean) { this.quakes.show = visible; }
  async setLayer(layer: Layer, date: string, onError: () => void) {
    const generation = ++this.layerGeneration;
    if (this.overlay) { this.viewer.imageryLayers.remove(this.overlay); this.overlay = undefined; }
    if (layer === 'earth') return;
    let provider: C.ImageryProvider;
    if (layer === 'streets') {
      provider = new C.OpenStreetMapImageryProvider({ url: 'https://tile.openstreetmap.org/', maximumLevel: 19,
        credit: new C.Credit('<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors · ODbL</a>') });
    } else {
      provider = new C.UrlTemplateImageryProvider({
        url: `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${date}/250m/{z}/{y}/{x}.jpg`,
        tilingScheme: new C.GeographicTilingScheme(), maximumLevel: 8,
        rectangle: C.Rectangle.fromDegrees(-180, -85, 180, 85),
        credit: new C.Credit(`NASA GIBS · MODIS Terra · ${date}`),
      });
    }
    let reported = false;
    provider.errorEvent.addEventListener(() => { if (!reported && generation === this.layerGeneration) { reported = true; onError(); } });
    if (generation === this.layerGeneration) this.overlay = this.viewer.imageryLayers.addImageryProvider(provider);
  }
  pick(x: number, y: number) {
    const pixel = new C.Cartesian2(x, y);
    const entity = this.viewer.scene.pick(pixel)?.id;
    const point = this.viewer.camera.pickEllipsoid(pixel, this.viewer.scene.globe.ellipsoid);
    if (!point) return;
    const cartographic = C.Cartographic.fromCartesian(point);
    this.onPick({ name: '选中的位置', lat: C.Math.toDegrees(cartographic.latitude), lon: C.Math.toDegrees(cartographic.longitude) },
      typeof entity?.id === 'string' && entity.id.startsWith('quake:') ? entity.id.slice(6) : undefined);
  }
  rotate(dx: number, dy: number) {
    this.viewer.camera.cancelFlight();
    const sensitivity = Math.min(1, Math.max(0.015, this.viewer.camera.positionCartographic.height / 12_000_000));
    this.viewer.camera.rotateLeft(dx * 2.8 * sensitivity);
    this.viewer.camera.rotateUp(dy * 2.2 * sensitivity);
  }
  zoom(factor: number) {
    this.viewer.camera.cancelFlight();
    const height = this.viewer.camera.positionCartographic.height;
    this.viewer.camera.zoomIn(height * Math.max(-0.2, Math.min(0.2, factor)));
  }
  get height() { return this.viewer.camera.positionCartographic.height; }
  get canvas() { return this.viewer.canvas; }
  resize() { this.viewer.resize(); }
}
