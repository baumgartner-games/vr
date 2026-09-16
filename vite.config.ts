import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// On GitHub Pages the app is served from https://<user>.github.io/<repo>/,
// so the asset base path has to match the repository name. The deploy
// workflow passes it in via BASE_PATH; locally we serve from the root.
const base = process.env['BASE_PATH'] ?? '/';

export default defineConfig({
  base,
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
    // Drei Seiten: die Spielwiese selbst, die Werkzeugseite und die
    // Eingabeseite. Ohne diese Liste baut Vite nur `index.html`, und die
    // anderen lägen im Netz als Dateien, die auf ein `src/`-Modul zeigen, das
    // es dort nicht gibt.
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        tools: resolve(__dirname, 'tools.html'),
        inputs: resolve(__dirname, 'inputs.html'),
      },
    },
  },
  server: {
    host: true,
    // WebXR requires a secure context. `vite dev` on localhost counts as one;
    // for testing on a headset in the LAN use `npm run dev -- --https` or a tunnel.
  },
});
