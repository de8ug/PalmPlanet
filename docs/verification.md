# First-version verification — 2026-10-28

## Automated

- `npm test`: 12 tests pass.
- `npm run build`: TypeScript check and production Vite build pass.
- Tests cover WGS84 equatorial and meridional reference distances, identical/antipodal/polar/dateline points, antipode involution, actual bundled land classification, Chinese/Latin city search, nearest-city lookup, real earthquake snapshot parsing and ordering, invalid coordinates/unsafe event URLs, failed-network fallback, pinch selection, drag release, tracking loss and transitions between one and two hands.

## Browser observations

Validated in the Codex in-app browser, with both a 1280 × 720 desktop viewport and a narrower portrait viewport:

- Local Natural Earth globe renders in WebGL; city search becomes available after geography loads.
- Searching 北京 selects GeoNames coordinates approximately 39.91°N, 116.40°E.
- Beijing to Shanghai displays approximately 1,067 km along the WGS84 ellipsoid and draws a route between the selected city points.
- Beijing's antipode displays approximately 39.91°S, 63.60°W; Natural Earth identifies land, and the reveal control flies to the Argentine location.
- USGS live request succeeds; the page displays source generation time, record count and event details.
- OpenStreetMap streets load when explicitly selected and zooming to Beijing.
- NASA MODIS Terra imagery for 2026-10-27 loads and aligns with Asian landforms after switching to the official GoogleMapsCompatible grid. Clouds and actual missing observation strips remain visible; they are not filled with invented imagery.
- The production build is served separately and renders its globe, bundled geography and local imagery with no initial browser warning/error logs.
- Same-origin MediaPipe WASM and the bundled Hand Landmarker model load successfully in the diagnostic page. GPU inference on a generated blank image returns zero hands as expected, and the model is released afterward. No camera is opened by this check.
- The data refresh script successfully reuses static datasets/model and fetches a new actual USGS snapshot.

## Limits and next checks

- Automated gesture tests check the interaction state machine. Actual webcam hand tracking, hand sizes, lighting, pinch thresholds and comfortable seated control need a parent/child device trial. No webcam footage was captured during implementation.
- NASA satellite tiles are an optional network layer; one verified date does not prove every tile/date is available. Missing imagery is identified in the interface and the local globe remains available.
- Network failure fallback is verified by a controlled fetch failure against the actual bundled snapshot. It is not a promise of online service availability.
- First version uses an ellipsoid, not a 3D elevation model. Land classification is generalized and the nearest city result is limited to the bundled city collection.

## Repeatable model check

Run the dev server and open `/tests/browser/hand-model.html`. The explicit check button loads the local WASM and model, runs inference on a generated blank image, and releases the model. It never asks for a webcam. This page is a developer diagnostic and is not an entry point in the production build.

# City guides and camera layouts — 2026-10-30

- `npm test`: 18 tests pass, including identity-based city matching, nearby article validation, encyclopedia network failure/cancellation, single-stream camera presentation/cleanup, and pointer mapping through object-fit cover cropping.
- `npm run build`: TypeScript and production build pass.
- Browser: Beijing city introduction, Forbidden City and Temple of Heaven cards display with source links; selecting Forbidden City flies to its coordinates and enables OSM streets.
- Browser: a developer-only synthetic canvas video (no webcam) is attached to an iframe of the real application using `tests/browser/camera-layout.html`. Background mode displays the synthetic figure behind the translucent globe; switching to window mode hides the backdrop, and stopping the synthetic stream clears the background. Human camera frames were neither captured nor saved.
- Real seated camera use still needs parent/child trial. This feature composites video and globe; it does not perform person segmentation or VR spatial tracking.
- Six cities have bundled introductory guides. Other cities require the explicit nearby encyclopedia query and remain subject to Wikipedia availability. Nearby encyclopedia entries are not a popularity ranking or a comprehensive attraction directory.
- Additional production-browser checks: Shanghai introduction and Oriental Pearl landmark selection work. Oslo's explicit nearby lookup successfully returns English Wikipedia articles with source links (including Stortorvet and Oslo Cathedral); changing the selection to Shanghai replaces the nearby results with its local guide. Background-mode UI was also checked in the real application iframe using generated video only, then switched back to window mode and cleared.
