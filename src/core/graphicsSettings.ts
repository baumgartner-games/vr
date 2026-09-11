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
 * - **Comic** — dieselbe Welt als Zeichnung: eine **schwarze Kontur** um jedes
 *   Ding (`outlineShell.ts`), Licht, das in **Stufen** auf den Flächen liegt
 *   statt in einem Verlauf, und Schatten von der Sonne. Kein Umgebungsbild —
 *   eine Spiegelung ist genau das, was ein gezeichnetes Bild nicht hat.
 *
 * **Es waren einmal drei.** Dazwischen stand *Schön*: Schatten, ein
 * Umgebungsbild aus dem Himmel der Welt und ein schärferes Bild in der Brille;
 * daneben ein zweiter Schalter für **prozedurale Texturen** — ein Rauschen im
 * Shader, das jeder Oberfläche Körnung gab. Beides ist wieder heraus, und zwar
 * vollständig: die Stufe, der Schalter, das Umgebungsbild und der ganze
 * Shader-Umbau dahinter. Was bleibt, ist die Frage, für die es diese Datei
 * gibt — flach oder gezeichnet.
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

/** Die beiden Stufen. `simple` ist das Bild, das dieses Projekt immer hatte. */
export type GraphicsMode = 'simple' | 'comic';

export const GRAPHICS_MODES = ['simple', 'comic'] as const;

export interface GraphicsSettings {
  mode: GraphicsMode;
  /**
   * **Wie groß die Brille ihr Bild rechnet**, als Anteil dessen, was sie
   * selbst vorschlägt (`XRWebGLLayer.framebufferScaleFactor`): 1 ist der
   * Vorschlag, 0,85 rechnet gut ein Viertel weniger Bildpunkte, 0,7 die
   * Hälfte. Das ist der eine Regler, der auf einer Quest **immer** zieht —
   * eine dunkle Station voller Lichter ist am Füllen der Bildpunkte am
   * teuersten, und ein Bild, das weicher ist, aber steht, ist in der Brille
   * das bessere. Gilt nur dort; am Bildschirm ändert er nichts. Und er gilt
   * **ab der nächsten Sitzung**: Die Brille nimmt die Puffergröße nur beim
   * Aufsetzen entgegen (`GraphicsQuality.applyRenderer`).
   */
  xrScale: XrScale;
}

/** Die drei Rasten des Reglers, von scharf nach flüssig. */
export type XrScale = 1 | 0.85 | 0.7;
export const XR_SCALES: readonly XrScale[] = [1, 0.85, 0.7];

export const XR_SCALE_LABELS: Readonly<Record<XrScale, string>> = {
  1: 'Voll',
  0.85: 'Mittel',
  0.7: 'Flüssig',
};

export const XR_SCALE_SUBS: Readonly<Record<XrScale, string>> = {
  1: 'So groß, wie die Brille es vorschlägt · schärfstes Bild',
  0.85: 'Ein Viertel weniger Bildpunkte · kaum weicher, spürbar flüssiger',
  0.7: 'Die Hälfte der Bildpunkte · weicher, aber die Bildrate steht',
};

/** Was ausgeliefert wird: das Bild von vorher, ohne alles Neue. */
export const DEFAULT_GRAPHICS: GraphicsSettings = { mode: 'simple', xrScale: 1 };

export const GRAPHICS_MODE_LABELS: Record<GraphicsMode, string> = {
  simple: 'Einfach',
  comic: 'Comic',
};

export const GRAPHICS_MODE_SUBS: Record<GraphicsMode, string> = {
  simple: 'Wie bisher · flache Farben, keine Schatten',
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
  /**
   * Womit Hemisphären- und Umgebungslicht multipliziert werden.
   *
   * Der unscheinbarste Wert hier und der wichtigste: Ein Schatten ist nur so
   * dunkel, wie das Licht daneben hell ist, und diese Welten leuchten ihr
   * Grundlicht mit 1,5 aus. Auf voller Stärke war der schönste Schatten ein
   * Hauch — man sah ihn erst, wenn man das Grundlicht herunterdrehte.
   */
  ambientScale: number;
  /**
   * Womit die Brille ihren Bildpuffer multipliziert. Über 1 heißt: größer
   * rechnen als anzeigen, also weniger Treppen an den Kanten.
   */
  framebufferScale: number;
  /** 0 ist scharf bis zum Rand, 1 ist am billigsten (`XR.setFoveation`). */
  foveation: number;
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
  const comic = settings.mode === 'comic';
  return {
    // Schatten hat der Comic: Ein gezeichnetes Bild ohne sie sieht aus, als
    // schwebte alles einen Zentimeter über dem Boden — und in Stufen gerechnet
    // wird aus dem weichen Rand ohnehin eine harte Fläche.
    shadows: comic,
    shadowMapSize: 2048,
    shadowRange: 14,
    shadowDistance: 24,
    // Der Comic dämpft das Grundlicht nur mäßig: Zwei Stufen brauchen
    // Mitteltöne zwischen sich.
    ambientScale: comic ? 0.7 : 1,
    // Der Comic will ein schärferes Bild, der Regler ein flüssigeres — beides
    // multipliziert sich, damit „Flüssig" auch im Comic flüssig ist.
    framebufferScale: (comic ? 1.2 : 1) * settings.xrScale,
    // Eine Kontur von zwei Pixeln verträgt keine verwaschenen Bildränder.
    foveation: comic ? 0.3 : 1,
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
  // Ein gespeicherter Stand von gestern kann `fancy` sagen — die Stufe gibt es
  // nicht mehr, und aus etwas, das es nicht gibt, wird der Auslieferungszustand.
  const mode = GRAPHICS_MODES.includes(raw.mode as GraphicsMode)
    ? (raw.mode as GraphicsMode)
    : DEFAULT_GRAPHICS.mode;
  const xrScale = XR_SCALES.includes(raw.xrScale as XrScale)
    ? (raw.xrScale as XrScale)
    : DEFAULT_GRAPHICS.xrScale;
  return { mode, xrScale };
}

/** Ein Druck auf die Zeile: die nächste Stufe, oben wieder von vorn. */
export function nextGraphicsMode(mode: GraphicsMode): GraphicsMode {
  const index = GRAPHICS_MODES.indexOf(mode);
  return GRAPHICS_MODES[(index + 1) % GRAPHICS_MODES.length]!;
}

/** Ein Druck auf den Regler: die nächste Raste, von scharf nach flüssig und wieder von vorn. */
export function nextXrScale(scale: XrScale): XrScale {
  const index = XR_SCALES.indexOf(scale);
  return XR_SCALES[(index + 1) % XR_SCALES.length]!;
}

/** Wie die Seite im Menü unter ihrer Überschrift steht. */
export function graphicsSummary(settings: GraphicsSettings): string {
  const scale = settings.xrScale === 1 ? '' : ` · Brille ${XR_SCALE_LABELS[settings.xrScale]}`;
  return `${GRAPHICS_MODE_LABELS[settings.mode]}${scale}`;
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
