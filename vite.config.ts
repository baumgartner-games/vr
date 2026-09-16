import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import type { OutputBundle } from 'rollup';

// On GitHub Pages the app is served from https://<user>.github.io/<repo>/,
// so the asset base path has to match the repository name. The deploy
// workflow passes it in via BASE_PATH; locally we serve from the root.
const base = process.env['BASE_PATH'] ?? '/';

/**
 * **Die Kennung dieses Builds** — sie steht im Namen des Speichers, den der
 * Service Worker anlegt (`src/sw.ts`). In der CI ist es der Commit, lokal die
 * Uhrzeit: Was zählt, ist nur, dass zwei Builds nicht dieselbe Nummer tragen.
 */
const buildId = process.env['GITHUB_SHA']?.slice(0, 12) ?? String(Date.now());

/**
 * **Was der Service Worker beim Einrichten mitnimmt.**
 *
 * Er kennt seine eigene Welt nicht: Die Dateinamen tragen den Hash ihres
 * Inhalts, und die entstehen erst beim Bauen. Ohne diese Liste wäre die
 * Spielwiese erst beim *zweiten* Besuch ohne Netz benutzbar — beim ersten
 * lädt die Seite ihre Dateien, während der Service Worker gerade erst
 * installiert wird, und er sieht davon nichts.
 *
 * Mitgenommen wird die **Hülle** und nur sie: die drei Seiten, die Chunks, die
 * sie fest importieren, und deren Stil. Nicht mitgenommen wird, was erst beim
 * Betreten einer Welt geladen wird (jede Welt ist ein eigener Chunk, dazu die
 * Physik-Engine, Modelle und Töne): Das sind zweistellige Megabytes, die beim
 * ersten Start niemand angefordert hat — sie kommen in den Speicher, sobald
 * sie das erste Mal wirklich gebraucht werden (`core/swRoutes.ts`).
 */
function precacheList(bundle: OutputBundle): string[] {
  const files = new Set<string>();

  const take = (name: string): void => {
    if (files.has(name)) return;
    const chunk = bundle[name];
    if (!chunk || chunk.type !== 'chunk') return;
    files.add(name);
    // `imports` sind die **festen** Importe; `dynamicImports` bleiben absichtlich
    // draußen — das sind die Welten.
    for (const next of chunk.imports) take(next);
    for (const css of chunk.viteMetadata?.importedCss ?? []) files.add(css);
  };

  for (const [name, chunk] of Object.entries(bundle)) {
    if (name === 'sw.js') continue;
    if (chunk.type === 'chunk' && chunk.isEntry) take(name);
    if (chunk.type === 'asset' && name.endsWith('.html')) files.add(name);
  }
  return [...files].sort();
}

/**
 * Setzt Liste und Build-Nummer in den fertigen Service Worker ein. Das geht
 * erst hier, nach dem Bündeln: Vorher gibt es die Dateinamen nicht.
 */
function precachePlugin(): Plugin {
  return {
    name: 'bgvr:sw-precache',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const sw = bundle['sw.js'];
      if (!sw || sw.type !== 'chunk') {
        this.warn('sw.js liegt nicht im Bündel — der Service Worker bleibt ohne Liste.');
        return;
      }
      // Anführungszeichen beider Sorten: Welche der Minifizierer stehen
      // lässt, ist seine Sache und nicht unsere.
      const placeholder = /["']__PRECACHE__["']/;
      if (!placeholder.test(sw.code)) {
        this.warn('Der Platzhalter __PRECACHE__ steht nicht mehr im Service Worker.');
        return;
      }
      sw.code = sw.code.replace(placeholder, JSON.stringify(precacheList(bundle)));
    },
  };
}

export default defineConfig({
  base,
  plugins: [precachePlugin()],
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
    // Der Platzhalter bleibt ein Platzhalter: Die echte Liste setzt
    // `precachePlugin` ein, sobald die Dateinamen feststehen. `define` macht
    // daraus vorher einen gültigen Ausdruck, damit der Code bündelbar ist.
    __PRECACHE__: '"__PRECACHE__"',
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
    // Drei Seiten: die Spielwiese selbst, die Werkzeugseite und die
    // Eingabeseite. Ohne diese Liste baut Vite nur `index.html`, und die
    // anderen lägen im Netz als Dateien, die auf ein `src/`-Modul zeigen, das
    // es dort nicht gibt.
    //
    // Dazu der **Service Worker**. Er ist kein Modul der Seite, sondern ein
    // eigenes Programm, das der Browser unter einer festen Adresse erwartet:
    // Sein Geltungsbereich ist das Verzeichnis, in dem er liegt, ein
    // `sw-C3aB9x2Q.js` in `assets/` könnte also nur `assets/` beantworten.
    // Deshalb der Sonderfall in `entryFileNames`.
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        tools: resolve(__dirname, 'tools.html'),
        inputs: resolve(__dirname, 'inputs.html'),
        sw: resolve(__dirname, 'src/sw.ts'),
      },
      output: {
        entryFileNames: (chunk) => (chunk.name === 'sw' ? 'sw.js' : 'assets/[name]-[hash].js'),
      },
    },
  },
  server: {
    host: true,
    // WebXR requires a secure context. `vite dev` on localhost counts as one;
    // for testing on a headset in the LAN use `npm run dev -- --https` or a tunnel.
  },
});
