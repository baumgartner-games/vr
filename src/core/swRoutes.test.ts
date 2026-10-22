import {
  inScope,
  isHashedAsset,
  isPinned,
  isStaleAsset,
  isStaleMedia,
  precacheStore,
  routeFor,
  scopedPath,
  type RouteRequest,
} from './swRoutes';

/** Der Geltungsbereich, wie GitHub Pages ihn meldet — mit Unterverzeichnis. */
const SCOPE = 'https://baumgartner-games.github.io/vr/';

function ask(url: string, extra: Partial<RouteRequest> = {}): ReturnType<typeof routeFor> {
  return routeFor({ method: 'GET', url, navigate: false, ...extra }, SCOPE);
}

describe('inScope', () => {
  it('nimmt, was unter dem Geltungsbereich liegt', () => {
    expect(inScope(`${SCOPE}assets/main-C3aB9x2Q.js`, SCOPE)).toBe(true);
    expect(inScope(SCOPE, SCOPE)).toBe(true);
  });

  it('lässt den Nachbarn auf demselben Server in Ruhe', () => {
    expect(inScope('https://baumgartner-games.github.io/andere/app.js', SCOPE)).toBe(false);
  });

  it('lässt fremde Server in Ruhe — dort liegen die Relays der Verbindung', () => {
    expect(inScope('https://relay.example/ws', SCOPE)).toBe(false);
  });
});

describe('routeFor', () => {
  it('speichert nur Lesezugriffe', () => {
    expect(ask(`${SCOPE}index.html`, { method: 'POST' })).toBe('bypass');
    expect(ask(`${SCOPE}index.html`, { method: 'HEAD' })).toBe('bypass');
  });

  it('geht einer stückweisen Anfrage aus dem Weg', () => {
    // `206 Partial Content` lässt sich nicht ablegen; ein Versuch wirft.
    expect(ask(`${SCOPE}audio/haunting/ambient-hum.ogg`, { range: true })).toBe('bypass');
  });

  it('holt eine ganze Seite erst aus dem Netz', () => {
    expect(ask(SCOPE, { navigate: true })).toBe('page');
    expect(ask(`${SCOPE}tools.html`, { navigate: true })).toBe('page');
    // Auch mit Einladungslink: Der Raum-Code hängt als Query dran.
    expect(ask(`${SCOPE}?room=mond-riff-47`, { navigate: true })).toBe('page');
  });

  it('nimmt eine Datei mit Hash im Namen sofort aus dem Speicher', () => {
    expect(ask(`${SCOPE}assets/main-C3aB9x2Q.js`)).toBe('immutable');
    expect(ask(`${SCOPE}assets/style-Bd7_x-1a.css`)).toBe('immutable');
    // Auch die Welt, die erst beim Betreten nachgeladen wird.
    expect(ask(`${SCOPE}assets/HauntingWorld-9zQ2bK4c.js`)).toBe('immutable');
  });

  it('hält feste Namen frisch, liefert sie aber sofort', () => {
    expect(ask(`${SCOPE}models/chef.glb`)).toBe('revalidate');
    expect(ask(`${SCOPE}audio/haunting/creak-0.ogg`)).toBe('revalidate');
    expect(ask(`${SCOPE}controllers/oculus-touch-v3/left.glb`)).toBe('revalidate');
    expect(ask(`${SCOPE}manifest.webmanifest`)).toBe('revalidate');
    expect(ask(`${SCOPE}icon-192.png`)).toBe('revalidate');
  });

  it('lässt Quellkarten und den Service Worker selbst am Speicher vorbei', () => {
    // Zwei Gründe, ein Weg: Quellkarten sind Megabytes für niemanden, und ein
    // Service Worker, der sich selbst ausliefert, hängt an seinem Vorgänger.
    expect(ask(`${SCOPE}assets/main-C3aB9x2Q.js.map`)).toBe('bypass');
    expect(ask(`${SCOPE}sw.js`)).toBe('bypass');
  });

  it('rührt nichts an, was einem anderen gehört', () => {
    expect(ask('https://relay.example/announce', { navigate: false })).toBe('bypass');
    // Auch eine Seitenanfrage nach draußen bleibt draußen.
    expect(ask('https://example.com/', { navigate: true })).toBe('bypass');
  });

  it('erkennt einen Hash nur, wo wirklich einer steht', () => {
    // Ein Bindestrich allein macht noch keinen Hash: Diese Datei kann sich
    // unter ihrem Namen ändern und darf deshalb nicht ewig gelten.
    expect(ask(`${SCOPE}audio/haunting/monster-run-0.ogg`)).toBe('revalidate');
    expect(ask(`${SCOPE}apple-touch-icon.png`)).toBe('revalidate');
  });
});

/**
 * Das Verzeichnis, wie der Build es schreibt (`vite.config.ts`,
 * `assetHashes`): Pfad unter `public/` → Prüfsumme seines Inhalts.
 */
const HASHES = {
  'models/kitchen.glb': 'x7Kp2Qa1',
  'audio/kitchen/pick-0.ogg': 'Zz-11abc',
};

describe('isPinned', () => {
  // Der Posten, um den es geht: Ohne diese Frage holte ein späterer Start
  // jedes Modell und jeden Ton noch einmal über die Leitung — gemessen 33
  // Anfragen und 1,6 MB —, nur um dieselben Bytes zurückzubekommen.
  it('erkennt die Medien, deren Inhalt zu ihrer Adresse passt', () => {
    expect(isPinned(`${SCOPE}models/kitchen.glb?v=x7Kp2Qa1`, HASHES)).toBe(true);
    expect(isPinned(`${SCOPE}audio/kitchen/pick-0.ogg?v=Zz-11abc`, HASHES)).toBe(true);
  });

  it('lässt eine fremde Prüfsumme nachholen — dort ist wirklich etwas anderes', () => {
    expect(isPinned(`${SCOPE}models/kitchen.glb?v=veraltet`, HASHES)).toBe(false);
  });

  /**
   * **Und der Index des Regals steht mit Absicht in keinem Verzeichnis.** Er
   * trug die Nummer einmal und war damit die einzige Datei des Regals, die
   * nach jedem Deploy wieder über die Leitung musste — vor einem Regal, das
   * vollständig im Gerät liegt (`core/kaykitModel.ts`, `INDEX_URL`).
   */
  it('lässt Dateien ohne Prüfsumme nachholen', () => {
    expect(isPinned(`${SCOPE}controllers/oculus-touch-v3/left.glb`, HASHES)).toBe(false);
    expect(isPinned(`${SCOPE}manifest.webmanifest`, HASHES)).toBe(false);
    expect(isPinned(`${SCOPE}models/kaykit/index.json`, HASHES)).toBe(false);
  });

  // In einem Jest-Lauf ist das Verzeichnis leer (`core/assetVersion.ts`).
  // Ohne diese Bremse gälte dort jede Adresse ohne `v=` als unveränderlich.
  it('kennt ohne Verzeichnis keine Übereinstimmung', () => {
    expect(isPinned(`${SCOPE}models/kitchen.glb`, {})).toBe(false);
    expect(isPinned(`${SCOPE}models/kitchen.glb?v=`, {})).toBe(false);
    expect(isPinned(`${SCOPE}models/kitchen.glb?v=x7Kp2Qa1`, {})).toBe(false);
  });
});

describe('isStaleMedia', () => {
  /**
   * Die Gegenfrage zu `isPinned`, und mit Absicht dieselbe Rechnung: Was beim
   * Aktivieren weggeworfen wird, muss genau das sein, was der Speicher
   * hinterher nicht mehr beantworten würde.
   */
  it('wirft weg, was nicht mehr zu seiner Adresse passt', () => {
    expect(isStaleMedia(`${SCOPE}models/kitchen.glb?v=vorgestern`, HASHES)).toBe(true);
    // `offline.json` trägt die Build-Nummer und steht in keinem Verzeichnis:
    // Sie *gibt* es in jedem Build wirklich neu.
    expect(isStaleMedia(`${SCOPE}offline.json?v=1a2b3c4d5e6f`, HASHES)).toBe(true);
  });

  it('behält, was noch passt', () => {
    expect(isStaleMedia(`${SCOPE}models/kitchen.glb?v=x7Kp2Qa1`, HASHES)).toBe(false);
  });

  /**
   * **Und alles ohne `v=` bleibt** — die Controller-Modelle, die Symbole, das
   * Manifest und die 4470 Dateien des Regals. Das sind 62 MB und der ganze
   * Grund, warum dieser Speicher einen Deploy überlebt.
   */
  it('rührt an, was keine Prüfsumme trägt, gar nicht', () => {
    expect(isStaleMedia(`${SCOPE}controllers/oculus-touch-v3/left.glb`, HASHES)).toBe(false);
    expect(isStaleMedia(`${SCOPE}models/kaykit/dungeon/barrel.glb`, HASHES)).toBe(false);
    expect(isStaleMedia(`${SCOPE}models/kaykit/index.json`, HASHES)).toBe(false);
  });
});

describe('isHashedAsset und precacheStore', () => {
  /** Gefragt wird mit ganzen Adressen wie mit Einträgen der Vorratsliste. */
  it('erkennt einen Hash im Namen, mit und ohne Basis davor', () => {
    expect(isHashedAsset('assets/main-C3aB9x2Q.js')).toBe(true);
    expect(isHashedAsset(`${SCOPE}assets/rapier-Bd7_x-1a.js`)).toBe(true);
    expect(isHashedAsset('index.html')).toBe(false);
    // Ein Bindestrich allein macht noch keinen Hash — und das Symbol muss sich
    // austauschen lassen.
    expect(isHashedAsset('apple-touch-icon.png')).toBe(false);
    expect(isHashedAsset('audio/haunting/monster-run-0.ogg')).toBe(false);
  });

  /**
   * Die Aufteilung, an der die ganze Ersparnis hängt: Was den Hash seines
   * Inhalts im Namen trägt, kommt in einen Speicher **ohne** Build-Nummer und
   * überlebt damit den Deploy. Die drei Seiten nicht — sie nennen die Namen
   * aller anderen Dateien.
   */
  it('legt Dateien mit Hash in den Speicher, der den Deploy überlebt', () => {
    expect(precacheStore('assets/main-C3aB9x2Q.js')).toBe('assets');
    expect(precacheStore('assets/main-DkqRJZhZ.css')).toBe('assets');
    expect(precacheStore('index.html')).toBe('shell');
    expect(precacheStore('tools.html')).toBe('shell');
  });
});

describe('scopedPath und isStaleAsset', () => {
  it('schneidet den Geltungsbereich ab', () => {
    expect(scopedPath(`${SCOPE}assets/main-C3aB9x2Q.js`, SCOPE)).toBe('assets/main-C3aB9x2Q.js');
    expect(scopedPath(`${SCOPE}models/kitchen.glb?v=abc`, SCOPE)).toBe('models/kitchen.glb');
    expect(scopedPath('https://relay.example/ws', SCOPE)).toBeNull();
  });

  /**
   * **Ein Name mit Hash, den dieser Build noch kennt, bleibt liegen.** Das ist
   * der Unterschied zwischen 5,5 MB und 0 MB nach einem Deploy, an dem sich
   * nur die Startseite geändert hat: Vorher hing die Zusage „kein halber alter
   * Build" am Namen des **Speichers** und warf deshalb alles weg; jetzt hängt
   * sie am Namen der **Datei**, und der ist der Hash ihres Inhalts.
   */
  const BUNDLE = new Set(['assets/main-C3aB9x2Q.js', 'assets/rapier-Bd7_x-1a.js']);

  it('behält, was dieser Build noch erzeugt', () => {
    expect(isStaleAsset(`${SCOPE}assets/rapier-Bd7_x-1a.js`, SCOPE, BUNDLE)).toBe(false);
  });

  it('wirft weg, was es nicht mehr gibt', () => {
    expect(isStaleAsset(`${SCOPE}assets/GridWorld-9zQ2bK4c.js`, SCOPE, BUNDLE)).toBe(true);
  });

  /** Was nicht unter `assets/` liegt, geht diesen Speicher nichts an. */
  it('lässt alles ohne Hash im Namen in Ruhe', () => {
    expect(isStaleAsset(`${SCOPE}index.html`, SCOPE, BUNDLE)).toBe(false);
    expect(isStaleAsset(`${SCOPE}models/kitchen.glb`, SCOPE, BUNDLE)).toBe(false);
    expect(isStaleAsset('https://relay.example/ws', SCOPE, BUNDLE)).toBe(false);
  });
});
