import type { KaykitIndex } from './kaykitIndex';
import {
  FULL_ORDER,
  RATE_MIN_SAMPLES,
  Throughput,
  etaSeconds,
  etaText,
  fullHint,
  fullLabel,
  fullPlan,
  fullShare,
  fullWarning,
  haveBytes,
  mayStartFull,
  mb,
  pendingItems,
  retryDelay,
  steadyEta,
  worthRetry,
  type OfflineList,
} from './fullDownload';

/**
 * **Alles herunterladen**, nachgerechnet — und zwar genau die vier Dinge, die
 * man einem Balken im Browser **nicht** ansieht:
 *
 * 1. **Ob an der richtigen Adresse gezogen wird.** Ein `?v=` zu viel oder zu
 *    wenig ist für einen Speicher ein anderer Name: Der Download läuft dann
 *    sauber durch, und im Funkloch fehlt trotzdem alles.
 * 2. **Ob die Summe stimmt.** Ein Balken, der bei 80 % fertig ist, ist keine
 *    Kleinigkeit — er ist der Grund, warum niemand mehr hinsieht.
 * 3. **Ob die Restzeit steht.** Eine Zahl, die springt, ist schlimmer als eine
 *    grobe; nachprüfen lässt sich das nur mit einer Uhr, die man selbst stellt.
 * 4. **Ob ein zweiter Druck fortsetzt** statt noch einmal anzufangen.
 */

const BASE = 'https://example.test/vr/';
const BUILD = 'abc123';

/**
 * **Das Verzeichnis der Prüfsummen** (`vite.config.ts`, `assetHashes`) — und
 * zugleich die ganze Regel, welche Adresse ein `?v=` bekommt: Was darin steht,
 * bekommt eins, was nicht darin steht, keines. Sie stand einmal ein zweites
 * Mal in `stamped()` daneben; zwei Lesarten derselben Regel sind eine, die
 * beim nächsten Umbau auseinanderläuft.
 */
const HASHES = {
  'audio/kitchen/chop-board-0.ogg': 'Zz-11abc',
  'models/diner.glb': 'Ab9_2cQ4',
};

const LIST: OfflineList = {
  version: 1,
  build: BUILD,
  bundle: [
    ['assets/main-Bd7x1a2b.js', 1000],
    ['assets/rapier-C3aB9x2Q.js', 2000],
    ['index.html', 100],
  ],
  files: [
    ['audio/kitchen/chop-board-0.ogg', 10],
    ['controllers/profilesList.json', 20],
    ['icon-192.png', 30],
    ['manifest.webmanifest', 40],
    ['models/diner.glb', 50],
    ['models/kaykit/dungeon/textures/dungeon.webp', 60],
    ['models/kaykit/index.json', 70],
  ],
};

const INDEX: KaykitIndex = {
  version: 1,
  root: {
    name: 'kaykit',
    dirs: [
      {
        name: 'dungeon',
        label: 'Dungeon',
        files: [{ name: 'barrel.glb', bytes: 300 }],
        dirs: [{ name: 'characters', files: [{ name: 'knight.glb', bytes: 400 }] }],
      },
    ],
    files: [],
  },
};

const PLAN = fullPlan(LIST, INDEX, BASE, HASHES);

describe('welche Adresse eine Prüfsumme trägt', () => {
  /**
   * Gestempelt wird, was im Verzeichnis steht, und sonst gar nichts. Das ist
   * der Punkt, an dem dieses Feature stillschweigend nutzlos werden könnte:
   * Was unter einem anderen Namen im Speicher liegt, ist im Funkloch nicht da.
   */
  it('stempelt Töne und die gebündelten Kataloge', () => {
    const urls = PLAN.items.map((item) => item.url);
    expect(urls).toContain(`${BASE}audio/kitchen/chop-board-0.ogg?v=Zz-11abc`);
    expect(urls).toContain(`${BASE}models/diner.glb?v=Ab9_2cQ4`);
  });

  /**
   * **Auch den Index nicht, und das ist eine Korrektur.** Er trug die Nummer,
   * weil er erzeugt ist — und war damit die einzige Datei des Regals, die nach
   * jedem Deploy wieder über die Leitung musste. Das Regal macht erst auf,
   * wenn er da ist; auf einer schlechten Leitung waren das 215 kB Wartezeit
   * vor einem Regal, das vollständig im Gerät liegt
   * (`core/kaykitModel.ts`, `INDEX_URL`).
   */
  it('stempelt das Regal nicht — auch seinen Index nicht', () => {
    const urls = PLAN.items.map((item) => item.url);
    expect(urls).toContain(`${BASE}models/kaykit/dungeon/barrel.glb`);
    expect(urls).toContain(`${BASE}models/kaykit/dungeon/textures/dungeon.webp`);
    expect(urls).toContain(`${BASE}models/kaykit/index.json`);
  });

  it('lässt Controller-Profile und alles, was der Browser selbst holt, in Ruhe', () => {
    const urls = PLAN.items.map((item) => item.url);
    expect(urls).toContain(`${BASE}controllers/profilesList.json`);
    expect(urls).toContain(`${BASE}manifest.webmanifest`);
    expect(urls).toContain(`${BASE}icon-192.png`);
  });

  /**
   * **Und dieselbe Datei bekommt in zwei Builds dieselbe Adresse**, solange
   * sie sich nicht ändert. Genau das ist der Unterschied zur Build-Nummer, die
   * hier einmal stand: Sie machte aus 3,7 MB Tönen und Modellen nach jedem
   * Deploy 3,7 MB, die noch einmal über die Leitung gingen.
   */
  it('bleibt über einen Deploy hinweg dieselbe', () => {
    const zweiter = fullPlan(LIST, INDEX, BASE, { ...HASHES });
    expect(zweiter.items.map((item) => item.url)).toEqual(PLAN.items.map((item) => item.url));
  });
});

describe('der Plan', () => {
  it('rechnet beide Listen zu einer Summe zusammen', () => {
    // 3100 Programm + 150 Medien + 130 Regaldateien + 700 Modelle.
    expect(PLAN.totalBytes).toBe(4080);
    expect(PLAN.groupBytes).toEqual({ programm: 3100, medien: 150, regal: 830 });
    expect(PLAN.items).toHaveLength(12);
  });

  it('hängt die Prüfsumme genau dort an, wo sie hingehört', () => {
    const urls = PLAN.items.map((item) => item.url);
    expect(urls).toContain(`${BASE}audio/kitchen/chop-board-0.ogg?v=Zz-11abc`);
    // Das ganze Regal ohne Nummer, der Index eingeschlossen — er ist die
    // Datei, auf die das Menü wartet.
    expect(urls).toContain(`${BASE}models/kaykit/index.json`);
    expect(urls).toContain(`${BASE}models/kaykit/dungeon/barrel.glb`);
    expect(urls).toContain(`${BASE}controllers/profilesList.json`);
    // Namen mit Hash brauchen keine: Sie *sind* ihre Version.
    expect(urls).toContain(`${BASE}assets/rapier-C3aB9x2Q.js`);
  });

  /**
   * Die Reihenfolge ist eine Aussage darüber, **ab wann man ohne Netz spielen
   * kann**, und nicht darüber, was groß ist: erst das Programm, dann die
   * Medien, zuletzt die neun Zehntel, die das Regal ausmacht.
   */
  it('hält die Reihenfolge der drei Abschnitte ein', () => {
    const groups = [...new Set(PLAN.items.map((item) => item.group))];
    expect(groups).toEqual([...FULL_ORDER]);
  });

  /** Innerhalb des Regals: Index, Texturen, dann die Modelle. */
  it('holt die Texturen vor den Modellen', () => {
    const shelf = PLAN.items.filter((item) => item.group === 'regal').map((item) => item.url);
    expect(shelf[0]).toBe(`${BASE}models/kaykit/index.json`);
    expect(shelf[1]).toBe(`${BASE}models/kaykit/dungeon/textures/dungeon.webp`);
    expect(shelf.slice(2)).toEqual([
      `${BASE}models/kaykit/dungeon/barrel.glb`,
      `${BASE}models/kaykit/dungeon/characters/knight.glb`,
    ]);
  });

  /**
   * Ein Checkout ohne die gekauften Pakete ist ein normaler Zustand und kein
   * Fehler (`docs/agents/assetregal.md`): Dann besteht der Plan eben aus
   * Programm und Medien, und der Knopf sagt eine kleinere Zahl.
   */
  it('kommt ohne Regal aus', () => {
    const plain = fullPlan(LIST, null, BASE, HASHES);
    expect(plain.groupBytes.regal).toBe(130);
    expect(plain.items.some((item) => item.url.endsWith('barrel.glb'))).toBe(false);
  });

  /** Ohne Verzeichnis (Jest, `vite dev`) wird nichts gestempelt. */
  it('hängt ohne Verzeichnis nichts an', () => {
    const plain = fullPlan(LIST, null, BASE, {});
    expect(plain.items.map((item) => item.url)).toContain(`${BASE}audio/kitchen/chop-board-0.ogg`);
  });
});

describe('ein zweiter Druck setzt fort', () => {
  it('überspringt, was schon im Speicher liegt', () => {
    const have = new Set([
      `${BASE}assets/main-Bd7x1a2b.js`,
      `${BASE}models/kaykit/dungeon/barrel.glb`,
    ]);
    expect(haveBytes(PLAN, have)).toBe(1300);
    const todo = pendingItems(PLAN, have);
    expect(todo).toHaveLength(10);
    expect(todo.some((item) => item.url.endsWith('barrel.glb'))).toBe(false);
  });

  it('findet nach einem vollen Lauf nichts mehr zu tun', () => {
    const have = new Set(PLAN.items.map((item) => item.url));
    expect(pendingItems(PLAN, have)).toHaveLength(0);
    expect(haveBytes(PLAN, have)).toBe(PLAN.totalBytes);
  });
});

describe('eine Datei, die nicht kommt', () => {
  it('wird noch einmal versucht, wenn es sich lohnt', () => {
    expect(worthRetry(null)).toBe(true);
    expect(worthRetry(503)).toBe(true);
  });

  /** Ein `404` wird beim dritten Mal auch keine Datei. */
  it('und nicht, wenn es sie nicht gibt', () => {
    expect(worthRetry(404)).toBe(false);
    expect(worthRetry(403)).toBe(false);
  });

  it('wartet dazwischen kurz, aber länger', () => {
    expect(retryDelay(0)).toBe(400);
    expect(retryDelay(1)).toBe(800);
  });
});

describe('die Restzeit', () => {
  /**
   * **Vor drei Sekunden wird nicht geschätzt.** Die erste Sekunde eines Laufs
   * ist die schnellste, die er je hat — der HTTP-Cache hat noch etwas, die
   * Verbindung ist frisch —, und eine Schätzung daraus verspricht eine Minute,
   * wo es zehn werden.
   */
  it('schweigt, solange zu wenig gemessen ist', () => {
    const rate = new Throughput(1000);
    for (let i = 0; i < RATE_MIN_SAMPLES; i++) rate.add(1000 + i * 100, 50_000);
    // Genug Marken, aber erst eine halbe Sekunde Strecke.
    expect(rate.rate(1500)).toBeNull();
    expect(etaText(etaSeconds(1_000_000, rate.rate(1500)))).toBe('Dauer wird noch geschätzt');
  });

  /**
   * **Die Strecke ist die Zeit seit dem Start**, nicht der Abstand der Marken.
   * Der Unterschied ist genau der Fehler, der im Browser als „noch etwa 10
   * Minuten" dastand, während es zwei waren: Sechs große Dateien sind
   * gleichzeitig unterwegs, und zwei Marken kurz hintereinander sagen nichts
   * über die fünf Sekunden davor.
   */
  it('rechnet den ehrlichen Schnitt, solange das Fenster nicht voll ist', () => {
    const rate = new Throughput(0);
    // Fünf Sekunden lang nichts (sechs große Dateien unterwegs), dann kommen
    // sie fast gleichzeitig an: 6 × 500 kB in fünf Sekunden sind 600 kB/s.
    for (let i = 0; i < 6; i++) rate.add(5000 + i * 10, 500_000);
    expect(rate.rate(5000)).toBeCloseTo(600_000, 0);
    // Die alte Rechnung (Bytes zwischen erster und letzter Marke) hätte hier
    // 50 MB/s behauptet oder gar nichts.
  });

  it('rechnet danach aus dem Fenster der letzten Sekunden', () => {
    const rate = new Throughput(0);
    for (let i = 1; i <= 20; i++) rate.add(i * 1000, 100_000);
    // Im Fenster liegen die letzten acht Sekunden — neun Marken, denn die am
    // Rand zählt noch mit: 900 kB in 8 s.
    expect(rate.rate(20_000)).toBeCloseTo(112_500, 0);
    expect(etaSeconds(1_000_000, rate.rate(20_000))).toBeCloseTo(8.9, 1);
  });

  /**
   * Das Fenster vergisst: Wer zehn Sekunden schnell lädt und dann in ein
   * Funkloch gerät, soll die schnellen zehn Sekunden **nicht** mitrechnen.
   */
  it('vergisst, was älter ist als das Fenster', () => {
    const rate = new Throughput(0);
    for (let i = 0; i < 20; i++) rate.add(i * 100, 1_000_000);
    for (let i = 0; i < 10; i++) rate.add(20_000 + i * 1000, 10_000);
    const now = 29_000;
    expect(rate.rate(now)!).toBeLessThan(200_000);
  });

  it('sagt grobe Zahlen und keine tickenden', () => {
    expect(etaText(4)).toBe('noch ein paar Sekunden');
    expect(etaText(32)).toBe('noch etwa 30 Sekunden');
    expect(etaText(128)).toBe('noch etwa 2 Minuten');
    expect(etaText(14 * 60)).toBe('noch etwa 15 Minuten');
    expect(etaText(90 * 60)).toBe('noch über eine Stunde');
  });

  /** Kleiner darf sie sofort werden, größer nur mit Anlauf. */
  it('springt nicht bei jedem Schluckauf nach oben', () => {
    expect(steadyEta(120, 100)).toBe(100);
    expect(steadyEta(120, 130)).toBe(120);
    expect(steadyEta(120, 400)).toBe(400);
    expect(steadyEta(120, null)).toBe(120);
    expect(steadyEta(null, 120)).toBe(120);
  });
});

describe('was der Knopf sagt', () => {
  it('nennt im Leerlauf die ganze Zahl — und später nur den Rest', () => {
    const leer = { kind: 'offen', have: 0, total: 62_914_560 } as const;
    expect(fullHint(leer)).toBe('60,0 MB für Spiel und Regal — danach läuft alles ohne Netz.');
    const halb = { kind: 'offen', have: 31_457_280, total: 62_914_560 } as const;
    expect(fullHint(halb)).toBe('30,0 MB von 60,0 MB liegen schon im Gerät.');
  });

  /**
   * **Beitreten sagt, woran es gerade ist** — und heißt sonst, wie es immer
   * heißt. Einen eigenen Download-Knopf gibt es nicht mehr.
   */
  it('beschriftet Beitreten nur beim Prüfen und beim Laden um', () => {
    expect(fullLabel({ kind: 'prüft' })).toBe('Wird geprüft …');
    expect(
      fullLabel({ kind: 'läuft', have: 10_485_760, total: 62_914_560, eta: null, missing: 0 }),
    ).toBe('Lädt … 16\u00a0%');
    expect(fullLabel({ kind: 'unbekannt' })).toBeNull();
    expect(fullLabel({ kind: 'offen', have: 0, total: 1 })).toBeNull();
    expect(fullLabel({ kind: 'fertig', total: 1 })).toBeNull();
    expect(fullLabel({ kind: 'angehalten', have: 0, total: 1 })).toBeNull();
  });

  it('sagt vor der ersten Prüfung nichts', () => {
    expect(fullHint({ kind: 'unbekannt' })).toBe('');
  });

  it('zeigt im Lauf beide Zahlen und die Restzeit', () => {
    const läuft = {
      kind: 'läuft',
      have: 10_485_760,
      total: 62_914_560,
      eta: 128,
      missing: 0,
    } as const;
    expect(fullHint(läuft)).toBe('10,0 MB von 60,0 MB · noch etwa 2 Minuten');
    expect(fullShare(läuft)).toBeCloseTo(1 / 6, 3);
  });

  /**
   * **Ein Balken, der steht, braucht eine Erklärung daneben.** Bricht
   * unterwegs das Netz weg, läuft der Download weiter und gibt Datei für Datei
   * auf — sichtbar wäre davon sonst nur ein Balken, der nicht mehr wächst,
   * während die Restzeit ihre letzte Zahl behält. Gemessen ist genau das
   * passiert, als der Bremsproxy des Rauchtests abstürzte.
   */
  it('sagt Fehlschläge schon im Lauf und nicht erst am Ende', () => {
    expect(
      fullHint({ kind: 'läuft', have: 10_485_760, total: 62_914_560, eta: 128, missing: 12 }),
    ).toBe('10,0 MB von 60,0 MB · noch etwa 2 Minuten · 12 Dateien kamen nicht an');
  });

  it('sagt am Ende, dass alles da ist', () => {
    const fertig = { kind: 'fertig', total: 62_914_560 } as const;
    expect(fullHint(fertig)).toContain('Alles da');
    expect(fullShare(fertig)).toBe(1);
  });

  it('sagt, was übersprungen wurde — und dass es bleibt', () => {
    const halt = { kind: 'angehalten', have: 10_485_760, total: 62_914_560 } as const;
    expect(fullHint(halt)).toContain('Das Geholte bleibt');
    expect(fullHint(halt)).toContain('nächsten Start');
  });

  it('zählt Lücken einzeln und in der Mehrzahl', () => {
    expect(fullHint({ kind: 'lückenhaft', have: 1, total: 2, missing: 1 })).toContain(
      'eine Datei kam nicht an',
    );
    expect(fullHint({ kind: 'lückenhaft', have: 1, total: 2, missing: 7 })).toContain(
      '7 Dateien kamen nicht an',
    );
  });

  /**
   * **Ein Knopf, der nicht kann, sagt warum.** Im Entwicklungsbetrieb läuft
   * kein Service Worker (`core/pwa.ts`), und dann landet ein `fetch` im
   * HTTP-Cache statt im Speicher — sichtbar wäre davon nichts, außer einem
   * Balken, der durchläuft und nichts bewirkt.
   */
  it('erklärt die beiden Absagen, statt stumm zu bleiben', () => {
    expect(fullHint({ kind: 'kein-speicher', reason: 'sw' })).toContain('Service Worker');
    expect(fullHint({ kind: 'kein-speicher', reason: 'cache' })).toContain('Cache API');
    expect(fullHint({ kind: 'keine-liste' })).toContain('nicht erreichbar');
  });

  it('schreibt Megabyte mit Komma', () => {
    expect(mb(1_572_864)).toBe('1,5 MB');
  });
});

describe('die Rücksichten', () => {
  /**
   * Das Gegenteil des Vorwärmens: Hier hat jemand **gefragt**. `saveData` und
   * eine schmale Leitung werden deshalb gesagt und nicht befolgt.
   */
  it('warnt vor der Leitung, statt sich zu weigern', () => {
    expect(fullWarning({ saveData: true })).toContain('Daten sparen');
    expect(fullWarning({ effectiveType: '2g' })).toContain('schmal');
    expect(fullWarning({ effectiveType: '3g' })).toContain('Minuten');
    expect(fullWarning({ effectiveType: '4g' })).toBe('');
    expect(fullWarning({})).toBe('');
  });

  it('fängt ohne Speicher und im Hintergrund gar nicht erst an', () => {
    expect(mayStartFull({ hasCache: true, controlled: true, hidden: false })).toBe(true);
    expect(mayStartFull({ hasCache: false, controlled: true, hidden: false })).toBe(false);
    expect(mayStartFull({ hasCache: true, controlled: false, hidden: false })).toBe(false);
    expect(mayStartFull({ hasCache: true, controlled: true, hidden: true })).toBe(false);
  });
});
