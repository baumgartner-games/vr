import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { buildSync } from 'esbuild';
import { defineConfig, type Plugin } from 'vite';
import type { OutputBundle } from 'rollup';
import { BUILD_META } from './src/core/buildId';

// On GitHub Pages the app is served from https://<user>.github.io/<repo>/,
// so the asset base path has to match the repository name. The deploy
// workflow passes it in via BASE_PATH; locally we serve from the root.
const base = process.env['BASE_PATH'] ?? '/';

/**
 * **Die Kennung dieses Builds** — sie steht im Namen des Speichers, in dem der
 * Service Worker die **drei HTML-Seiten** hält (`src/sw.ts`), und sie steht
 * auf der Startseite. In der CI ist es der Commit, lokal die Uhrzeit: Was
 * zählt, ist nur, dass zwei Builds nicht dieselbe Nummer tragen.
 *
 * **An einer Datei hängt sie nicht mehr.** Das tat sie einmal — jede Adresse
 * unter `public/` bekam `?v=<buildId>` —, und es kostete bei jedem Deploy
 * 4 MB Töne und Modelle, die sich nicht geändert hatten. Was an einer Adresse
 * hängt, ist seither die **Prüfsumme des Inhalts** (`ASSET_HASHES` weiter
 * unten): Sie bleibt gleich, solange die Datei gleich bleibt.
 *
 * Und sie steht mit Absicht in **keinem** Modul: Rollup rechnet den Hash eines
 * Chunks über die Namen seiner Importe mit, also machte eine 175 Bytes große
 * `assetVersion.js` mit der Build-Nummer darin aus jedem Deploy 22 neue
 * Dateinamen und 2,2 MB. Die Seite bekommt sie als `<meta>` mit
 * (`buildTagPlugin`), und `src/core/buildId.ts` liest sie dort.
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
 * **Alle Dateien dieses Builds mit Hash im Namen** — die Hülle, die Welten,
 * die Physik-Engine, der Stil. Nicht die drei Seiten (feste Namen) und nicht
 * der Service Worker selbst.
 *
 * Der Service Worker braucht diese Liste zum **Aufräumen**: Sein Speicher
 * `bgvr-assets` überlebt den Build, und ohne eine Liste dessen, was es noch
 * gibt, wüchse er mit jedem Deploy um die Chunks, die niemand mehr anfragt.
 * Was darin steht, bleibt; was nicht darin steht, fliegt beim Aktivieren
 * hinaus (`src/sw.ts`, `pruneAssets`).
 */
function bundleList(bundle: OutputBundle): string[] {
  return Object.keys(bundle)
    .filter((name) => name !== 'sw.js' && !name.endsWith('.map') && HASHED_NAME.test(name))
    .sort();
}

/**
 * Dieselbe Lesart wie `HASHED` in `src/core/swRoutes.ts`: unterhalb von
 * `assets/`, und dort ein Hash am Ende des Namens.
 */
const HASHED_NAME = /(^|\/)assets\/.*-[A-Za-z0-9_-]{8,}\.[a-z0-9]+$/;

/**
 * **Der Service Worker, gebaut für sich allein** — eine Datei, kein Import.
 *
 * Er stand einmal als vierter Eingang in `rollupOptions.input`, und das ging
 * gut, solange er mit der Seite kein Modul teilte. Seit er
 * `core/assetVersion.ts` braucht (Prüfsumme statt Build-Nummer), zog Rollup
 * dieses Modul in einen gemeinsamen Chunk, und `sw.js` begann mit
 * `import … from "./assets/assetVersion-….js"`. Angemeldet wird er aber als
 * klassisches Skript (`core/pwa.ts`) — und ein klassisches Skript mit `import`
 * scheitert beim Auswerten: „ServiceWorker script evaluation failed". Der
 * Build war grün, die Seite lief, nur **kein** Service Worker mehr: kein
 * Speicher, kein Start ohne Netz, und „Alles herunterladen" lief nie an.
 *
 * `type: 'module'` beim Anmelden hätte Chromium gereicht, Safari aber erst ab
 * 16.4 — und iPhone und iPad sind die Geräte, auf denen die App am meisten
 * zählt. Also baut esbuild ihn hier als eine geschlossene Datei (`iife`), mit
 * denselben `define`s wie der Rest, und kein geteiltes Modul kann ihn je
 * wieder aufspalten.
 */
function buildServiceWorker(defines: Record<string, string>): { code: string; map: string } {
  const result = buildSync({
    entryPoints: [resolve(__dirname, 'src/sw.ts')],
    bundle: true,
    format: 'iife',
    target: 'es2022',
    minify: true,
    sourcemap: 'external',
    write: false,
    outfile: 'sw.js',
    define: defines,
  });
  const code = result.outputFiles.find((file) => file.path.endsWith('sw.js'));
  const map = result.outputFiles.find((file) => file.path.endsWith('sw.js.map'));
  if (!code || !map) throw new Error('esbuild hat keinen Service Worker geschrieben.');
  return { code: `${code.text}//# sourceMappingURL=sw.js.map\n`, map: map.text };
}

/**
 * Baut den Service Worker und setzt die beiden Listen ein — die **Hülle**, die
 * er beim Einrichten holt, und **alles mit Hash**, an dem er hinterher
 * erkennt, was noch gilt. Das geht erst hier, nach dem Bündeln: Vorher gibt es
 * die Dateinamen nicht.
 */
function precachePlugin(defines: Record<string, string>): Plugin {
  return {
    name: 'bgvr:sw-precache',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const sw = buildServiceWorker(defines);
      let code = sw.code;
      for (const [name, list] of [
        ['__PRECACHE__', precacheList(bundle)],
        ['__BUNDLE__', bundleList(bundle)],
      ] as const) {
        // Anführungszeichen beider Sorten: Welche der Minifizierer stehen
        // lässt, ist seine Sache und nicht unsere.
        const placeholder = new RegExp(`["']${name}["']`);
        if (!placeholder.test(code)) {
          this.error(`Der Platzhalter ${name} steht nicht mehr im Service Worker.`);
        }
        code = code.replace(placeholder, JSON.stringify(list));
      }
      // **Und nie wieder ein `import`** — siehe oben. Ein Service Worker, der
      // nicht startet, fällt sonst niemandem auf außer dem Telefon im Funkloch.
      if (/(^|[;}\s])(import|export)\s*[{*\w]/.test(code.slice(0, 200))) {
        this.error('sw.js beginnt mit import/export — als klassisches Skript startet er so nicht.');
      }
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: code });
      this.emitFile({ type: 'asset', fileName: 'sw.js.map', source: sw.map });
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
 * **Die Build-Nummer in die drei Seiten schreiben.**
 *
 * Sie steht dort und in keinem Modul, und der Grund steht ausführlich in
 * `src/core/buildId.ts`: Rollup rechnet den Hash eines Chunks über die Namen
 * seiner Importe mit, also benannte eine Zeichenkette, die sich bei jedem
 * Deploy ändert, das halbe Bündel um. Eine HTML-Seite ist die einzige Datei
 * mit festem Namen, die sich ohnehin bei jedem Deploy ändert — und die einzige,
 * die der Service Worker erst aus dem Netz holt.
 */
function buildTagPlugin(): Plugin {
  return {
    name: 'bgvr:build-tag',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: { name: BUILD_META, content: buildId },
          injectTo: 'head',
        },
      ];
    },
  };
}

/**
 * **Welche Datei aus `public/` eine Prüfsumme in die Adresse bekommt** — und
 * damit die einzige Stelle im Projekt, an der diese Frage beantwortet wird.
 *
 * Sie stand früher zweimal: einmal in `core/fullDownload.stamped` und einmal
 * in jedem Lader. Zwei Lesarten derselben Regel sind eine, die beim nächsten
 * Umbau auseinanderläuft — und das ist hier der teuerste Fehler überhaupt:
 * Eine Adresse mit `?v=` ist für einen Speicher ein **anderer Name**. Wer
 * falsch stempelt, lädt 71 MB herunter und findet sie im Funkloch trotzdem
 * nicht wieder. Seither steht die Regel hier, und die Anwendung liest nur noch
 * das Verzeichnis, das dabei herauskommt.
 *
 * Drei Ausnahmen, und jede ist anderswo schon begründet:
 *
 * - **Das Regal** (`models/kaykit/`) — 4470 gekaufte Dateien, die sich nie
 *   ändern, und ihr Index, auf den das Menü wartet
 *   (`docs/agents/assetregal.md`, _Keine Build-Nummer_).
 * - **Die Controller-Profile** — three.js hängt diese Adressen selbst
 *   zusammen und kennt unsere Prüfsummen nicht
 *   (`core/ControllerModels.ts`).
 * - **Alles Übrige** — Manifest, Symbole, Banner: Die fragt der Browser
 *   selbst an, und der hängt nichts an.
 */
function isStamped(path: string): boolean {
  if (path.startsWith('models/kaykit/')) return false;
  if (path.startsWith('controllers/')) return false;
  return path.startsWith('audio/') || path.startsWith('models/');
}

/**
 * **Die Prüfsumme des Inhalts, je Datei** — `{'models/kitchen.glb': 'x7Kp2Qa1'}`.
 *
 * Das ist der Ersatz für die Build-Nummer an einer Adresse, und der ganze
 * Unterschied steht in einem Satz: **Eine Prüfsumme ändert sich, wenn sich die
 * Datei ändert, und eine Build-Nummer ändert sich immer.** Vorher holte jedes
 * Telefon nach jedem Deploy 3,7 MB Töne und Modelle neu, die Byte für Byte
 * dieselben waren; jetzt fragt der neue Build unter derselben Adresse wie der
 * alte, und der Service Worker beantwortet sie aus dem Speicher.
 *
 * Acht Stellen Base64 aus SHA-256 — dieselbe Länge, die Vite an einen
 * Chunk-Namen hängt, und aus demselben Grund: Ein Zusammenstoß ist bei 54
 * Dateien kein Thema, und eine lange Zahl in jeder Adresse liest sich nur
 * schlechter.
 */
function assetHashes(publicDir: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [path] of publicFiles(publicDir, publicDir, [])) {
    if (!isStamped(path)) continue;
    out[path] = createHash('sha256')
      .update(readFileSync(resolve(publicDir, path)))
      .digest('base64url')
      .slice(0, 8);
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

/**
 * **Gekaufte Bibliotheken bekommen ihren eigenen Chunk** — und der Grund ist
 * ein gemessener: Rollup legte three.js zusammen mit **49 eigenen Modulen** in
 * eine Datei von 741 kB. Ein Komma in einem dieser 49 Module benannte die
 * Datei um, und jedes Telefon holte three.js noch einmal. Getrennt bleibt der
 * Name von three.js gleich, solange `package-lock.json` gleich bleibt — und
 * das ist er zwischen zwei Deploys praktisch immer.
 *
 * Genannt wird nur, was groß **und** eindeutig ist:
 *
 * - `three/build/…` — der Kern. Die Beiwerke unter `examples/jsm/`
 *   (`GLTFLoader`, 45 kB) bleiben mit Absicht draußen: Sie werden einzeln
 *   nachgeladen, und ein Chunk, der sie mitzieht, machte den ersten Start
 *   teurer.
 * - `@dimforge/rapier3d-compat` — die Physik-Engine mit ihren 2,8 MB. Sie lag
 *   schon vorher allein; hier steht es jetzt, statt sich darauf zu verlassen.
 *
 * **Und trystero steht nicht hier.** Seine drei Chunks enthalten ohnehin
 * nichts als gekauften Code und tragen über Deploys hinweg denselben Namen
 * (nachgemessen); sie zu einem zusammenzuziehen hieße, die Verbindungsart, die
 * gerade nicht benutzt wird, mitzuladen.
 */
function manualChunks(id: string): string | undefined {
  if (id.includes('/node_modules/three/build/')) return 'three';
  if (id.includes('/node_modules/@dimforge/')) return 'rapier';
  return undefined;
}

/**
 * Was beim Bauen fest eingesetzt wird — für die Seite und, dieselbe Tabelle,
 * für den Service Worker (`buildServiceWorker`).
 */
const defines: Record<string, string> = {
  __BUILD_ID__: JSON.stringify(buildId),
  __APP_VERSION__: JSON.stringify(appVersion ?? ''),
  __ASSET_HASHES__: JSON.stringify(assetHashes(resolve(__dirname, 'public'))),
  // Die Platzhalter bleiben Platzhalter: Die echten Listen setzt
  // `precachePlugin` ein, sobald die Dateinamen feststehen. `define` macht
  // daraus vorher einen gültigen Ausdruck, damit der Code bündelbar ist.
  __PRECACHE__: '"__PRECACHE__"',
  __BUNDLE__: '"__BUNDLE__"',
};

export default defineConfig({
  base,
  plugins: [
    buildTagPlugin(),
    precachePlugin(defines),
    offlineListPlugin(resolve(__dirname, 'public')),
  ],
  define: defines,
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
    // Drei Seiten: die Spielwiese selbst, die Werkzeugseite und die
    // Eingabeseite. Ohne diese Liste baut Vite nur `index.html`, und die
    // anderen lägen im Netz als Dateien, die auf ein `src/`-Modul zeigen, das
    // es dort nicht gibt.
    //
    // Der **Service Worker** steht nicht hier: Er ist kein Modul der Seite,
    // sondern ein eigenes Programm unter einer festen Adresse (`sw.js`, sein
    // Geltungsbereich ist das Verzeichnis, in dem er liegt), und er darf mit
    // der Seite kein Modul teilen. Gebaut wird er in `precachePlugin`.
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        tools: resolve(__dirname, 'tools.html'),
        inputs: resolve(__dirname, 'inputs.html'),
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        manualChunks,
      },
    },
  },
  server: {
    host: true,
    // WebXR requires a secure context. `vite dev` on localhost counts as one;
    // for testing on a headset in the LAN use `npm run dev -- --https` or a tunnel.
  },
});
