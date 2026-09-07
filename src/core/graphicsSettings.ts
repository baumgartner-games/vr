/**
 * Wie schön es aussehen soll.
 *
 * Bis hierher gab es genau ein Bild: flache Farben, ein Himmelsverlauf, drei
 * Lichter und **keine Schatten** — gebaut für eine Brille, die sich ihr Bild
 * zweimal pro Frame verdienen muss. Das ist eine gute Voreinstellung und eine
 * schlechte einzige Möglichkeit: Wer am PC sitzt oder eine Quest 3 aufhat, hat
 * Luft übrig, und ein Sandkasten, der sie liegen lässt, sieht ärmer aus als er
 * müsste.
 *
 * Also zwei Stufen, und die untere ist ausdrücklich **das, was bisher war**:
 *
 * - **Einfach** — Zeile für Zeile derselbe Aufbau wie vorher. Wer nichts
 *   einstellt, merkt von dieser Datei nichts.
 * - **Schön** — Schatten von der Sonne, ein Umgebungsbild aus dem Himmel der
 *   Welt (damit Metall etwas zu spiegeln hat) und ein schärferes Bild in der
 *   Brille.
 * - **Comic** — dieselbe Welt als Zeichnung: eine **schwarze Kontur** um jedes
 *   Ding (`outlineShell.ts`) und Licht, das in **Stufen** auf den Flächen
 *   liegt statt in einem Verlauf. Kein Umgebungsbild — eine Spiegelung ist
 *   genau das, was ein gezeichnetes Bild nicht hat.
 *
 * Daneben steht ein zweiter Schalter, der mit der Stufe nichts zu tun hat:
 * **Texturen**. Die Welten sind absichtlich ohne Bilddateien gebaut — nichts
 * lädt nach, nichts wartet —, und deshalb ist auch die Antwort darauf keine
 * Datei, sondern **Rechnung**: ein Rauschen im Shader, das jeder Oberfläche
 * Körnung, ein bisschen Farbunruhe und eine leichte Unebenheit gibt
 * (`proceduralDetail.ts`). Das kostet kein Byte Ladezeit und ein paar Prozent
 * Bildrate, und es ist der Unterschied zwischen „aus Plastik" und „aus etwas".
 *
 * Diese Datei ist **reine Rechnung und Beschriftung** — kein three.js. Wer die
 * Werte anwendet, ist `GraphicsQuality.ts`; wie sie in der Szene ankommen,
 * steht in `graphicsScene.ts`.
 *
 * Und eines steht hier ausdrücklich **nicht** drin: der Konfig-Code
 * (`configCode.ts`). Was ein Gerät leisten kann, ist keine Einstellung, die man
 * verschickt — ein Code aus einer Brille darf einem PC nicht die Schatten
 * abschalten und ein Code vom PC einer Brille keine aufzwingen.
 */

const KEY = 'bgvr.graphics';

/** Die drei Stufen. `simple` ist das Bild, das dieses Projekt immer hatte. */
export type GraphicsMode = 'simple' | 'fancy' | 'comic';

export const GRAPHICS_MODES = ['simple', 'fancy', 'comic'] as const;

export interface GraphicsSettings {
  mode: GraphicsMode;
  /**
   * Prozedurale Oberflächen: Körnung, Farbunruhe und eine leichte Unebenheit,
   * im Shader gerechnet statt aus einer Bilddatei geladen.
   */
  textures: boolean;
}

/** Was ausgeliefert wird: das Bild von vorher, ohne alles Neue. */
export const DEFAULT_GRAPHICS: GraphicsSettings = { mode: 'simple', textures: false };

export const GRAPHICS_MODE_LABELS: Record<GraphicsMode, string> = {
  simple: 'Einfach',
  fancy: 'Schön',
  comic: 'Comic',
};

export const GRAPHICS_MODE_SUBS: Record<GraphicsMode, string> = {
  simple: 'Wie bisher · flache Farben, keine Schatten',
  fancy: 'Schatten, Spiegelungen, schärferes Bild · kostet Bildrate',
  comic: 'Schwarze Konturen und Licht in Stufen · zeichnet alles zweimal',
};

/**
 * Die Zahlen hinter einer Stufe.
 *
 * Eine Stufe ist im Menü ein Wort und im Renderer ein Dutzend Werte; dazwischen
 * steht dieses Objekt, damit weder das Menü noch der Renderer die Übersetzung
 * kennen muss — und damit sie sich testen lässt.
 */
export interface GraphicsProfile {
  /** Ob die hellste Sonne der Welt Schatten wirft. */
  shadows: boolean;
  /** Kantenlänge der Schattenkarte in Pixeln. */
  shadowMapSize: number;
  /**
   * Halbe Kantenlänge des Kastens, den die Schattenkarte abdeckt, in Metern.
   *
   * Eine einzelne Karte kann nicht die ganze Welt: 500 Meter Boden auf 2048
   * Pixel wären 25 Zentimeter pro Pixel, und ein Schatten mit 25 Zentimeter
   * Auflösung ist ein Fleck. Also deckt sie einen Kasten **um den Spieler**
   * herum ab und wandert mit ihm mit (`aimSun`).
   */
  shadowRange: number;
  /** Wie weit die Sonne für die Schattenrechnung hinter den Spieler rückt. */
  shadowDistance: number;
  /** Ob aus dem Himmel der Welt ein Umgebungsbild gerechnet wird. */
  environment: boolean;
  /** Wie stark dieses Umgebungsbild leuchtet (`Scene.environmentIntensity`). */
  environmentIntensity: number;
  /**
   * Womit Hemisphären- und Umgebungslicht multipliziert werden.
   *
   * Der unscheinbarste Wert hier und der wichtigste: Ein Schatten ist nur so
   * dunkel, wie das Licht daneben hell ist, und diese Welten leuchten ihr
   * Grundlicht mit 1,5 aus. Auf voller Stärke war der schönste Schatten ein
   * Hauch — man sah ihn erst, wenn man das Grundlicht herunterdrehte. Also
   * dreht die schöne Stufe es selbst herunter und ersetzt den Anteil durch das
   * Umgebungsbild, das aus derselben Richtung kommt wie der Himmel darüber.
   */
  ambientScale: number;
  /**
   * Womit die Brille ihren Bildpuffer multipliziert. Über 1 heißt: größer
   * rechnen als anzeigen, also weniger Treppen an den Kanten.
   */
  framebufferScale: number;
  /** 0 ist scharf bis zum Rand, 1 ist am billigsten (`XR.setFoveation`). */
  foveation: number;
  /** Ob die prozeduralen Oberflächen in die Shader eingebaut werden. */
  detail: boolean;
  /**
   * In wie vielen Stufen das Licht liegt; 0 heißt: in keiner, also im Verlauf.
   *
   * Drei ist die Zahl, bei der man die Stufen sieht, ohne dass eine Wand zur
   * Schachbrettfläche wird: hell, halb, Schatten.
   */
  toonBands: number;
  /** Ob jedes Ding eine schwarze Kontur bekommt. */
  outlines: boolean;
  /**
   * Wie breit sie ist — als Anteil der **halben Bildhöhe**, nicht in Metern
   * und nicht in Pixeln.
   *
   * In Metern wäre sie an einer fernen Wand unsichtbar und an einer nahen
   * fingerdick; in Pixeln müsste jemand wissen, wie groß das Bild ist, und in
   * einer Brille weiß das niemand vorher. Ein Anteil der Bildhöhe ist auf
   * jedem Gerät derselbe Strich.
   */
  outlineWidth: number;
  /** Und wie breit sie in Metern höchstens werden darf. */
  outlineMaxGrow: number;
  /** Ihre Farbe. Nicht ganz schwarz — ein Hauch Blau steht der Nacht besser. */
  outlineColor: number;
}

/**
 * Der Bildaufbau zu einer Einstellung.
 *
 * **Einfach ist überall der Auslieferungszustand von three.js bzw. der Wert,
 * den `App` schon immer gesetzt hat** — die Stufe darf nichts kosten und nichts
 * verändern, sonst ist „wie bisher" gelogen.
 */
export function graphicsProfile(settings: GraphicsSettings): GraphicsProfile {
  const fancy = settings.mode === 'fancy';
  const comic = settings.mode === 'comic';
  const plain = !fancy && !comic;
  return {
    // Schatten hat auch der Comic: Ein gezeichnetes Bild ohne sie sieht aus,
    // als schwebte alles einen Zentimeter über dem Boden — und in Stufen
    // gerechnet wird aus dem weichen Rand ohnehin eine harte Fläche.
    shadows: !plain,
    shadowMapSize: 2048,
    shadowRange: 14,
    shadowDistance: 24,
    environment: fancy,
    // Deutlich unter 1: Das Umgebungsbild kommt zusätzlich zu Hemisphären- und
    // Richtungslicht, die schon da sind. Es soll spiegeln, nicht aufhellen.
    environmentIntensity: fancy ? 0.45 : 0,
    // Der Comic dämpft weniger als die schöne Stufe: Was ihm das Grundlicht
    // wegnimmt, ersetzt dort kein Umgebungsbild, und zwei Stufen brauchen
    // Mitteltöne zwischen sich.
    ambientScale: fancy ? 0.45 : comic ? 0.7 : 1,
    framebufferScale: plain ? 1 : 1.2,
    // Eine Kontur von zwei Pixeln verträgt keine verwaschenen Bildränder.
    foveation: plain ? 1 : 0.3,
    detail: settings.textures,
    toonBands: comic ? 3 : 0,
    outlines: comic,
    outlineWidth: 0.006,
    outlineMaxGrow: 0.05,
    outlineColor: 0x101319,
  };
}

/** Ein Einstellungsobjekt, bei dem jeder Wert erlaubt ist. */
export function clampGraphics(settings: Partial<GraphicsSettings> | undefined): GraphicsSettings {
  const raw = settings ?? {};
  const mode = GRAPHICS_MODES.includes(raw.mode as GraphicsMode)
    ? (raw.mode as GraphicsMode)
    : DEFAULT_GRAPHICS.mode;
  // Anders herum als beim Modus: Wer nichts gesagt hat — und jeder gespeicherte
  // Stand von gestern hat nichts gesagt —, will die Oberflächen aus.
  return { mode, textures: raw.textures === true };
}

/** Ein Druck auf die Zeile: die nächste Stufe, oben wieder von vorn. */
export function nextGraphicsMode(mode: GraphicsMode): GraphicsMode {
  const index = GRAPHICS_MODES.indexOf(mode);
  return GRAPHICS_MODES[(index + 1) % GRAPHICS_MODES.length]!;
}

/** Wie die Seite im Menü unter ihrer Überschrift steht. */
export function graphicsSummary(settings: GraphicsSettings): string {
  return `${GRAPHICS_MODE_LABELS[settings.mode]} · Texturen ${settings.textures ? 'an' : 'aus'}`;
}

// --- der Speicher ----------------------------------------------------------

type Listener = () => void;
const listeners = new Set<Listener>();

/** Läuft nach jeder Änderung — der Renderer hört hier zu, das Menü auch. */
export function onGraphicsChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function graphics(): GraphicsSettings {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    return clampGraphics(raw ? (JSON.parse(raw) as Partial<GraphicsSettings>) : {});
  } catch {
    return { ...DEFAULT_GRAPHICS };
  }
}

/** Speichert die Änderung und gibt zurück, was davon angekommen ist. */
export function saveGraphics(settings: Partial<GraphicsSettings>): GraphicsSettings {
  const next = clampGraphics({ ...graphics(), ...settings });
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode; nothing we can do about it */
  }
  for (const listener of listeners) listener();
  return next;
}

/** Zurück auf das Bild von vorher. */
export function clearGraphics(): GraphicsSettings {
  return saveGraphics({ ...DEFAULT_GRAPHICS });
}
