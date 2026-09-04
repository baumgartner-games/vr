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
    // Zwei Seiten: die Spielwiese selbst und die Werkzeugseite. Ohne diese
    // Liste baut Vite nur `index.html`, und `tools.html` läge im Netz als
    // Datei, die auf ein `src/`-Modul zeigt, das es dort nicht gibt.
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        tools: resolve(__dirname, 'tools.html'),
      },
    },
  },
  server: {
    host: true,
    // WebXR requires a secure context. `vite dev` on localhost counts as one;
    // for testing on a headset in the LAN use `npm run dev -- --https` or a tunnel.
  },
});
