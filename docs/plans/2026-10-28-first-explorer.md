# PalmPlanet First Explorer Implementation Plan

> Execute this plan task by task in the authorized current session.

**Goal:** Deliver a browser globe driven by public geographic and earthquake data, with distance, antipode and optional local hand tracking.

**Architecture:** A standalone Vite/TypeScript application uses Cesium for the globe. Versioned public datasets provide city search, overview imagery, land classification and an explicitly dated earthquake fallback. Network layers and the earthquake feed load on demand; camera frames remain on device.

**Tech Stack:** TypeScript, Vite, CesiumJS, GeographicLib geodesics, MediaPipe Hand Landmarker, Node test runner.

---

### Task 1: Geographic data and calculations
- Create `scripts/prepare-data.mjs`, `src/geo.ts`, `src/types.ts`, `tests/geo.test.ts`.
- Download attributed GeoNames cities and Natural Earth land polygons; retain source URLs and retrieval dates.
- Test geodesic distance using published/known reference distances, identical points, antipodal and dateline cases; test antipode involution and sea/land classification.
- Commit a verified geographic foundation.

### Task 2: Globe and exploration UI
- Create `index.html`, `src/main.ts`, `src/globe.ts`, `src/style.css`, `src/data.ts` and Vite/TypeScript configuration.
- Provide globe picking, multilingual city search, two-point geodesic routes, antipode markers and camera reset.
- Supply a local overview basemap, and opt-in detailed streets and dated satellite observations with visible attribution.
- Fetch recent earthquakes with timeouts and abort handling; fall back to a labeled downloaded snapshot, never fabricated events.

### Task 3: Camera gestures
- Create `src/gestures.ts` and `src/gesture-math.ts`, with behavioral tests in `tests/gestures.test.ts`.
- Explicit camera opt-in; use same-origin model and WASM; single pinch drag, short pinch selection, dual pinch zoom.
- Freeze on tracking loss, avoid jumps at gesture transitions, stop media tracks on exit/error, retain mouse access.

### Task 4: Verification and delivery
- Run unit tests and production build; inspect the page in a real browser.
- Verify search, distance, antipode, quake selection, layer switching, responsive UI and failure messages.
- Document data licenses, dates, accuracy, network requirements and camera verification limits in `README.md` and `DATA_SOURCES.md`.
- Push tested code to the user-selected GitHub repository. Preserve all earlier experiments and do not deploy a public site.
