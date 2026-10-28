import { defineConfig } from 'vite';
import { cpSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

// Same-origin assets: the globe and camera do not depend on third-party CDNs.
export default defineConfig({
  base: './',
  define: { CESIUM_BASE_URL: JSON.stringify('./vendor/cesium/') },
  plugins: [{
    name: 'local-science-assets',
    buildStart() {
      mkdirSync('public/vendor/cesium', { recursive: true });
      for (const folder of ['Assets', 'Workers', 'ThirdParty', 'Widgets']) {
        cpSync(resolve('node_modules/cesium/Build/Cesium', folder), resolve('public/vendor/cesium', folder), { recursive: true });
      }
      cpSync(resolve('node_modules/@mediapipe/tasks-vision/wasm'), resolve('public/vendor/mediapipe'), { recursive: true });
    }
  }],
  build: { chunkSizeWarningLimit: 5000, rollupOptions: { output: { manualChunks(id) {
    if (id.includes('/node_modules/cesium/') || id.includes('/node_modules/@cesium/')) return 'cesium';
    if (id.includes('/node_modules/@mediapipe/')) return 'hands';
  } } } }
});
