import { readFileSync, readdirSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';
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
 * **Die Version, die auf der Startseite steht** — `0.<Build>.<Patch>` aus
 * `package.json`.
 *
 * Sie steht dort und nicht hier, weil eine Zahl, die an zwei Stellen steht,
 * an einer davon falsch ist: `npm version` schreibt sie, die CI prüft sie
 * (`.github/workflows/deploy.yml`), und die Seite liest sie. **Jeder Pull
 * Request erhöht den Patch** — die Regel steht in `AGENTS.md`.
 *
 * Nicht zu verwechseln mit `buildId` darüber: Der sagt, *welcher Build* das
 * ist (der Commit), diese Zahl sagt, *der wievielte*.
 */
const appVersion = (
  JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8')) as { version?: string }
).version;

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

/**
 * **Die Liste für den vollständigen Download** (`offline.json`) — was ein
 * Spieler holt, der auf der Startseite _Alles herunterladen_ drückt.
 *
 * Sie beantwortet die eine Frage, die zur Laufzeit niemand beantworten kann:
 * **Wie viele Bytes sind es?** Ohne Zahl gibt es keinen ehrlichen Balken und
 * erst recht keine Dauer — und die Zahl steht nirgends sonst: Die Chunks
 * heißen erst nach dem Bündeln so, wie sie heißen, und was unter `public/`
 * liegt, weiß nur die Platte. Eine von Hand gepflegte Liste wäre nach dem
 * dritten Paket falsch, und falsch heißt hier: ein Balken, der bei 80 %
 * fertig ist, oder eine App, der offline ein Ton fehlt.
 *
 * Zwei Listen, weil es zwei Sorten Datei sind:
 *
 * - `bundle` — was der Build erzeugt hat: die drei Seiten, jeder Chunk (auch
 *   die Welten und die Physik-Engine, die sonst niemand vorher kennt) und der
 *   Stil. Ihre Namen tragen den Hash ihres Inhalts, also wird nichts daran
 *   gestempelt.
 * - `files` — was unverändert aus `public/` kopiert wird: Modelle, Töne,
 *   Controller-Profile, Symbole. Feste Namen, und deshalb entscheidet
 *   `core/fullDownload.ts`, an welche davon eine Build-Nummer gehört.
 *
 * **Nicht darin stehen die 4470 Modelle des Regals.** Die stehen schon in
 * `models/kaykit/index.json`, mit ihren Größen — zweimal aufgeschrieben wären
 * sie zweimal zu pflegen, und 210 kB doppelt. Ihre **Texturen** stehen dagegen
 * hier, denn im Index stehen nur `.glb` (siehe `core/kaykitIndex.ts`), und
 * ohne Textur ist ein heruntergeladenes Fass im Funkloch ein weißes Fass.
 */
const OFFLINE_MANIFEST = 'offline.json';

/**
 * Was nie angefragt wird, muss auch nicht ins Telefon: Lizenz- und
 * Quellentexte, und die Punktdateien, die nur den Server angehen
 * (`.nojekyll`).
 */
const NOT_ASSETS = /(^|\/)\.|\.(md|txt)$/i;

/** Die Modelle des Regals — sie stehen im Index und nicht hier. */
const IN_SHELF_INDEX = /^models\/kaykit\/.*\.(glb|gltf)$/i;

/** Alle Dateien unter `public/`, rekursiv, mit ihrer Größe in Bytes. */
function publicFiles(dir: string, root: string, out: [string, number][]): [string, number][] {
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      publicFiles(full, root, out);
      continue;
    }
    const path = relative(root, full).split('\\').join('/');
    if (NOT_ASSETS.test(path) || IN_SHELF_INDEX.test(path)) continue;
    out.push([path, statSync(full).size]);
  }
  return out;
}

/**
 * Setzt `offline.json` neben die Seite. Das geht erst nach dem Bündeln: Vorher
 * gibt es die Dateinamen nicht, und ihre Größen schon gar nicht.
 *
 * Draußen bleiben die Quellkarten und der Service Worker selbst — beide
 * beantwortet er mit `bypass` (`core/swRoutes.ts`), sie kämen also gar nicht
 * erst in einen Speicher. Und die Liste selbst steht nicht in sich: Ihre
 * Größe stünde fest, bevor sie geschrieben ist.
 */
function offlineListPlugin(publicDir: string): Plugin {
  return {
    name: 'bgvr:offline-list',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const files = publicFiles(publicDir, publicDir, []);
      const built: [string, number][] = [];
      for (const [name, chunk] of Object.entries(bundle)) {
        if (name === 'sw.js' || name.endsWith('.map') || name === OFFLINE_MANIFEST) continue;
        const source = chunk.type === 'chunk' ? chunk.code : chunk.source;
        built.push([name, typeof source === 'string' ? Buffer.byteLength(source) : source.length]);
      }
      built.sort((a, b) => a[0].localeCompare(b[0]));
      this.emitFile({
        type: 'asset',
        fileName: OFFLINE_MANIFEST,
        source: JSON.stringify({ version: 1, build: buildId, bundle: built, files }),
      });
    },
  };
}

export default defineConfig({
  base,
  plugins: [precachePlugin(), offlineListPlugin(resolve(__dirname, 'public'))],
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
    __APP_VERSION__: JSON.stringify(appVersion ?? ''),
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
