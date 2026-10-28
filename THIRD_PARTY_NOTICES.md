# Third-party notices

PalmPlanet includes or uses the following independently licensed software and data. These notices do not change upstream licenses.

- **CesiumJS / Cesium Engine / Widgets** — Apache-2.0. [Source and license](https://github.com/CesiumGS/cesium). Runtime assets are copied unchanged from the installed package during dev/build. Upstream license notices remain in the dependency distribution.
- **MediaPipe Tasks Vision and Hand Landmarker model** — Apache-2.0. [Source and license](https://github.com/google-ai-edge/mediapipe), [model card](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Hand%20Tracking%20%28Lite_Full%29%20with%20Fairness%20Oct%202021.pdf). The versioned public model is bundled for same-origin, on-device inference. Model URL is recorded in the data manifest.
- **GeographicLib JavaScript geodesic** — MIT; Charles Karney and contributors. [Source](https://github.com/geographiclib/geographiclib-js).
- **Turf boolean-point-in-polygon** — MIT; Turf contributors. [Source](https://github.com/Turfjs/turf).
- **GeoNames** — Creative Commons Attribution 4.0. Credit: GeoNames, https://www.geonames.org/. Data adapted from `cities15000.zip`; names/aliases, WGS84 coordinates, country codes and population are retained in a compact tuple format. [License](https://creativecommons.org/licenses/by/4.0/).
- **Natural Earth / Natural Earth II** — Public domain. https://www.naturalearthdata.com/about/terms-of-use/. Land geometry is redistributed; overview imagery is provided with Cesium.
- **USGS Earthquake Hazards Program** — USGS-produced data are generally public domain, subject to identified third-party contributions. Event URLs and original metadata are preserved in the snapshot. [USGS copyright guidance](https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits).
- **OpenStreetMap contributors** — ODbL. https://www.openstreetmap.org/copyright. Online map attribution remains visible when selected; no OSM map tiles are bundled.
- **NASA GIBS / MODIS Terra** — NASA Earth science imagery via https://gibs.earthdata.nasa.gov/. Attribution and selected observation date are shown when the layer is active. No NASA logos or endorsement are implied.

Vite, TypeScript, tsx and Node type declarations are development dependencies. Their licenses are included in their npm distributions and recorded through `package-lock.json`.
