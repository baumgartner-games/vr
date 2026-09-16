import * as THREE from 'three';
import { canLoadModels } from '../../../core/chefFit';
import { kitchenPiece } from '../../../core/kitchenFit';
import { TILE } from '../../nav/navTile';

/**
 * **Das Förderband** — eine Kachel Ausgabetheke, auf der die Dinge von selbst
 * weiterwandern.
 *
 * Bei _PlateUp_ ist das Band das erste Möbel, das einem die Wege abnimmt: Man
 * legt etwas darauf und geht weiter, statt es zu tragen. Dafür muss man auf
 * einen Blick sehen, **wohin** es schiebt — und genau das ist der Grund, warum
 * Pfeile darauf laufen und nicht bloß daraufgemalt sind. Ein stehender Pfeil
 * ist eine Beschriftung, ein laufender ist die Maschine selbst.
 *
 * **Dieses Möbel steckt nicht in `public/models/kitchen.glb`.** Der gekaufte
 * Katalog hat dreizehn Stücke und kein Band (`core/kitchenFit.KITCHEN_PIECES`);
 * der Eintrag `belt` trägt deshalb `built: true` — es wird gebaut, hier, aus
 * Kästen und einer Leinwand. Dieselbe Entscheidung wie beim Zutatensatz
 * nebenan (`kitchenProps.FoodKit`) und aus demselben Grund: Eine zweite
 * Quelldatei aufzunehmen, mit Lizenz, Aufbereitung und Eintrag in
 * `public/models/CREDITS.md`, wäre viel Aufwand für drei Quader.
 *
 * **Drei Teile, und nur der mittlere kennt three.js.** Wie lange etwas
 * unterwegs ist (`advanceBelt`) und wohin ein gedrehtes Band schiebt
 * (`beltStep`) sind reine Zahlen — dieselbe Trennung wie zwischen
 * `kitchenClock.ts` und `kitchenGauge.ts`. Was die Küche mit dem
 * weitergereichten Ding anstellt, entscheidet sie selbst (`kitchen.ts`); hier
 * steht nur, wann es so weit ist.
 */

// --- die reine Rechnung -------------------------------------------------------

/**
 * **Wie lange ein Ding über eine Kachel Band braucht**, in Sekunden.
 *
 * Zwei, also ein halber Meter je Sekunde. Das ist **absichtlich langsamer als
 * Laufen**: Die Figur geht 2,6 m/s (`core/PlayerRig.moveSpeed`) und wäre über
 * dieselbe Kachel in knapp vier Zehntelsekunden. Ein Band, das schneller wäre
 * als der Koch, machte das Tragen sinnlos — man würfe alles aufs Band und
 * liefe hinterher.
 *
 * Ein Band kauft keine **Zeit**, es kauft **Hände**: Wer die Tomate aufs Band
 * legt, hat sie unterwegs und kann inzwischen etwas anderes holen. Genau dafür
 * darf es gemächlich sein — und zwei Sekunden sind gut zu sehen, ohne dass man
 * davorsteht und wartet (zum Vergleich: ein Patty brät vier Sekunden,
 * `kitchenClock.FRY_SECONDS`).
 */
export const BELT_SECONDS = 2;

/** Wie weit ein Ding auf dem Band schon gewandert ist. */
export interface BeltState {
  /** Sekunden auf dieser Kachel. */
  readonly time: number;
}

/** Ein Band, auf dem nichts liegt. */
export const BELT_EMPTY: BeltState = { time: 0 };

/** Was ein Bild auf dem Band geändert hat. */
export interface BeltTick {
  readonly state: BeltState;
  /** Ob das Ding in **diesem** Bild die Kachel verlassen hat — genau einmal. */
  readonly handOver: boolean;
}

/**
 * **Ein Bild auf dem Band** — `handOver` heißt: weiterreichen an die nächste
 * Station (`beltStep` sagt, an welche).
 *
 * `loaded` ist die Frage, ob überhaupt etwas daraufliegt. Ein **leeres Band
 * bleibt bei null**, und es fällt auch nichts langsam zurück wie beim Löschen
 * (`kitchenSpray.advanceDouse`): Dort ist der Fortschritt ein halb erledigter
 * Handgriff, hier ist er ein **Ort** — was heruntergenommen wurde, liegt
 * nirgendwo mehr auf der Strecke, und wer es wieder auflegt, legt es vorn auf.
 *
 * **Der Rest läuft nicht über.** Anders als beim Braten
 * (`kitchenClock.advanceStove`, wo eine Phase in die nächste überläuft) gibt es
 * hier keine nächste Phase, die den Rest gebrauchen könnte: Ob die Nachbarkachel
 * ein zweites Band, eine Ablage oder eine Wand ist, weiß dieses Modul nicht.
 * Der Übertrag gehört der Küche, und die legt das Ding beim Weiterreichen frisch
 * auf — mit `BELT_EMPTY`.
 */
export function advanceBelt(state: BeltState, dt: number, loaded: boolean): BeltTick {
  // Nichts darauf: Der Zustand steht auf null, und wenn er es schon tut,
  // entsteht dafür kein neues Objekt — das ist der Fall für jedes leere Band
  // in jedem Bild.
  if (!loaded) return { state: state.time === 0 ? state : BELT_EMPTY, handOver: false };

  // `NaN` käme aus einer Uhr, die noch nie gelaufen ist; ein Band, dessen Zeit
  // einmal keine Zahl ist, reicht nie wieder etwas weiter.
  const step = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  const time = state.time + step;
  if (time < BELT_SECONDS) return { state: { time }, handOver: false };
  return { state: BELT_EMPTY, handOver: true };
}

/** Der Anteil 0…1 — wie weit über die Kachel, für das Ding und für den Balken. */
export function beltProgress(state: BeltState): number {
  if (!Number.isFinite(state.time)) return 0;
  return Math.min(1, Math.max(0, state.time / BELT_SECONDS));
}

/**
 * **Wohin dieses Band schiebt**, als Kachelversatz — aus der Drehung des
 * Möbels und aus nichts sonst.
 *
 * Bei `turn: 0` ist **vorn Norden** (`kitchenPlan.Spot.turn`), und die Zone
 * dreht ein Möbel mit `rotation.y = turn · 90°` (`kitchen.ts`, `place`). Eine
 * solche Drehung bildet das eigene −z auf (−sin, −cos) ab: 0 nach Norden
 * (`dz = -1`), 1 nach Westen, 2 nach Süden, 3 nach Osten — dieselbe Reihenfolge,
 * die in `Spot.turn` steht.
 *
 * **Genau dorthin zeigt auch der Pfeil** (`BeltKit`, die Sparren laufen im
 * eigenen Raum des Möbels nach −z). Das ist der ganze Trick an dieser Zeile:
 * Wer ein Band dreht, dreht sein Netz **und** seine Wirkung mit, ohne dass
 * irgendwo eine zweite Tabelle nachgeführt werden müsste. Ein Band, dessen
 * Pfeil nach Norden zeigt und das nach Süden schiebt, wäre der Fehler, den man
 * zehn Minuten lang für einen Fehler im Grundriss hält.
 */
export function beltStep(turn: 0 | 1 | 2 | 3): { dx: number; dz: number } {
  return BELT_STEPS[turn] ?? BELT_STEPS[0]!;
}

/**
 * Die vier Richtungen, eingefroren: Wer den zurückgegebenen Versatz
 * weiterreicht, soll ihn nicht aus Versehen für alle Bänder umschreiben.
 */
const BELT_STEPS: readonly Readonly<{ dx: number; dz: number }>[] = [
  Object.freeze({ dx: 0, dz: -1 }),
  Object.freeze({ dx: -1, dz: 0 }),
  Object.freeze({ dx: 0, dz: 1 }),
  Object.freeze({ dx: 1, dz: 0 }),
];

// --- und wie es aussieht ------------------------------------------------------

/**
 * **Wie hoch das Band ist**, in Metern — aus dem Katalog und nicht daneben
 * aufgeschrieben.
 *
 * Dieselbe Zeile wie bei `kitchenPlan.passTop()`: Der Katalog beschreibt das
 * Möbel (`core/kitchenFit.KITCHEN_PIECES`, `belt`), und was hier gebaut wird,
 * muss **genau** so hoch werden — sonst steht auf der Arbeitsplatte, die die
 * Küche für dieses Möbel annimmt (`core/kitchenFit.kitchenDeck`), das Essen in
 * der Luft oder im Blech. Die Ersatzzahl gilt nur, solange der Eintrag noch
 * nicht da ist, und ist dieselbe wie die der Ausgabetheke: 0,53 m.
 */
export const BELT_HEIGHT = kitchenPiece('belt')?.height ?? 0.53;

/**
 * **Wie das Band aufgebaut ist**, von unten nach oben, in Metern.
 *
 * Drei Schichten wie bei der Ausgabetheke, nur eine Kachel breit: ein dunkler
 * **Korpus**, darauf eine helle **Platte** mit einer Handbreit Überstand, und
 * darin ein dunkler **Trog**, in dem das Laufband liegt. Die Platte steht
 * ringsum 2 cm über den Korpus über — das ist die Kante, die man bei einer
 * Theke sieht und an der man erkennt, dass oben etwas anderes ist als unten.
 *
 * Die Höhen sind nicht geraten, sondern **gerechnet**: Was unten steht, ist
 * die Gesamthöhe minus dem, was darüberliegt. So bleibt die Oberkante des
 * Laufbands auf `BELT_HEIGHT`, egal was im Katalog steht.
 */
const TOP_THICK = 0.05;
const BAND_THICK = 0.022;
/** Wie weit die Pfeilebene über dem Trog schwebt — gegen das Flimmern. */
const BAND_LIFT = 0.003;
const BODY_HEIGHT = Math.max(0.1, BELT_HEIGHT - TOP_THICK - BAND_THICK - BAND_LIFT);

/**
 * **Die Grundflächen**, in Metern.
 *
 * Der Korpus bleibt 2 cm hinter der Kachel zurück, damit zwischen zwei Bändern
 * eine Fuge steht und nicht eine durchgehende Wand; die Platte nimmt die
 * Kachel voll ein, damit zwei Platten sich berühren. Das Laufband ist 72 cm
 * breit — schmal genug, dass links und rechts sichtbar Platte bleibt, breit
 * genug für einen Teller (75 cm Durchmesser, `kitchenProps.PLATE_RADIUS`), der
 * ihn also gerade überdeckt. Und **über die volle Kachel lang**, damit zwei
 * Bänder hintereinander ein Band ergeben und keine zwei Bänder.
 */
const BODY_SIDE = TILE - 0.04;
const TOP_SIDE = TILE;
const BAND_WIDE = 0.72;
const BAND_LONG = TILE;

/**
 * **Die Farben.**
 *
 * Aus dem Modell abzulesen waren sie **nicht**, und das ist nachgesehen und
 * nicht vermutet: `public/models/kitchen.glb` hat genau drei Materialien
 * (`Kitchen_Cabins`, `Kitchen_Cabins_Double`, `Kitchen_Utensils`), und alle
 * drei tragen ihre Farbe in einer WebP-Textur — es gibt schlicht keine Zahl,
 * die man abschreiben könnte (`core/kitchenModel.ts` lädt sie unverändert).
 *
 * Also gewählt, und zwar nach dem, was das Band leisten muss: Es wird **von
 * oben** gelesen, aus 16 m Entfernung (`core/topDownPose.ts`). Ein dunkler
 * Korpus verschwindet dort im Schatten der Nachbarn und stört nicht; die helle
 * Platte ist die Kante, an der man das Möbel überhaupt erkennt; der Trog ist
 * fast schwarz, damit die hellen Sparren darauf den größten Kontrast der
 * ganzen Küche haben. Das Hellblau der Sparren ist dasselbe, in dem auch der
 * Schneidebalken leuchtet (`kitchenGauge.TONE_COLOR.chop`, `0xe8f3ff`) — die
 * Farbe, die in dieser Küche „hier passiert gerade etwas von selbst" heißt.
 */
const BODY_COLOR = 0x39414d;
const TOP_COLOR = 0xdfe4e9;
const BAND_COLOR = 0x171b21;
const ARROW_COLOR = '#e8f3ff';

/**
 * **Wie viele Sparren auf eine Kachel passen** und wie groß die Leinwand für
 * einen davon ist.
 *
 * Zwei je Meter: Einer allein wäre auf einer 1-m-Kachel ein großes Dreieck,
 * das man für ein Muster hält; vier wären aus 16 m Höhe ein Streifenmuster,
 * dem man die Richtung nicht mehr ansieht. Zwei sind aus jeder Zoomstufe zwei
 * Pfeile.
 *
 * 64 Pixel je Sparren reichen: Die Textur wird nie größer als eine Kachel im
 * Bild, und ein weicher Rand am Pfeil ist hier eher hilfreich als störend.
 */
const CHEVRONS = 2;
const CHEVRON_PIXELS = 64;

/**
 * **Der Bausatz für die Bänder einer Küche** — geteilte Formen, geteilte
 * Farben, eine Textur, ein `dispose`.
 *
 * Einer je Zone, wie der Zutatensatz (`kitchenProps.FoodKit`) und die Anzeigen
 * (`kitchenGauge.KitchenGauges`) daneben. Acht Bänder in einer Küche teilen
 * sich damit vier Formen und vier Farben — und **eine** Textur.
 *
 * **Und deshalb laufen alle Bänder im Gleichschritt.** Das ist keine
 * Einsparung, die man in Kauf nimmt, sondern das Richtige: Der Versatz steckt
 * in der geteilten Textur, also bewegen sich alle Sparren gleich schnell und
 * gleich weit — und genau das sagt die Küche damit auch aus. Zwei Bänder, die
 * verschieden schnell blinken, sähen aus wie zwei verschiedene Geräte
 * (derselbe Gedanke wie beim gemeinsamen Puls der Warndreiecke,
 * `kitchenGauge.update`).
 *
 * **Ohne `document` wird keine Textur gebaut.** In Jest gibt es keine Leinwand
 * (`core/chefFit.canLoadModels`), und ein Bausatz, der es dort trotzdem
 * versucht, bringt den Testlauf zum Stehen. Dann bleibt das Laufband einfarbig
 * dunkel: kein Pfeil, aber ein Band — und alles, was man an einem Band prüfen
 * kann, ohne es zu sehen, lässt sich weiter prüfen.
 */
export class BeltKit {
  private readonly shapes = new Map<string, THREE.BufferGeometry>();
  private readonly skins = new Map<string, THREE.MeshStandardMaterial>();

  /** Die Sparren — `null` ohne Leinwand, und dann bleibt das Band einfarbig. */
  private readonly arrows: THREE.CanvasTexture | null;

  /**
   * Wie weit die Sparren schon gelaufen sind, in **Texturlängen** (0…1). Eine
   * eigene Zahl und nicht `texture.offset.y` selbst: So bleibt der Versatz auch
   * ohne Leinwand richtig, und `update` rechnet nicht auf einem Feld herum, das
   * es vielleicht gar nicht gibt.
   */
  private run = 0;

  constructor() {
    this.arrows = chevronTexture();
  }

  /**
   * **Ein Band**, Ursprung **auf dem Boden in seiner Mitte** — wie jedes
   * Küchenmöbel (`core/kitchenModel.kitchenModel`, `tools/kitchen-model.mjs`).
   *
   * Es kommt ungedreht heraus, und das ist Absicht: Gedreht wird es dort, wo
   * auch jedes geladene Möbel gedreht wird (`kitchen.ts`, `place`), und der
   * Pfeil zeigt im eigenen Raum nach −z. Wer das Band um 90° dreht, dreht
   * beides mit — siehe `beltStep`.
   */
  piece(): THREE.Object3D {
    const group = new THREE.Group();
    group.name = 'kitchen-belt';

    const body = new THREE.Mesh(
      this.shape('body', () => new THREE.BoxGeometry(BODY_SIDE, BODY_HEIGHT, BODY_SIDE)),
      this.skin('body', BODY_COLOR, 0.85),
    );
    body.position.y = BODY_HEIGHT / 2;

    const top = new THREE.Mesh(
      this.shape('top', () => new THREE.BoxGeometry(TOP_SIDE, TOP_THICK, TOP_SIDE)),
      this.skin('top', TOP_COLOR, 0.55),
    );
    top.position.y = BODY_HEIGHT + TOP_THICK / 2;

    const band = new THREE.Mesh(
      this.shape('band', () => new THREE.BoxGeometry(BAND_WIDE, BAND_THICK, BAND_LONG)),
      this.skin('band', BAND_COLOR, 0.95),
    );
    band.position.y = BODY_HEIGHT + TOP_THICK + BAND_THICK / 2;

    for (const mesh of [body, top, band]) mesh.castShadow = true;
    group.add(body, top, band);

    // Die Pfeile liegen als eigene Ebene **auf** dem Trog und nicht als Textur
    // am Kasten: Ein Quader legt dieselbe Textur auf alle sechs Seiten, und
    // dann liefen die Sparren auch an den Stirnflächen mit.
    const arrows = new THREE.Mesh(
      // Eine Ebene, flach gelegt: Danach zeigt ihr v nach −z, also genau
      // dorthin, wohin das Band schiebt. Der Sparren auf der Leinwand zeigt
      // nach oben, und „oben" ist bei `flipY` (der Voreinstellung) v = 1.
      this.shape('arrows', () =>
        new THREE.PlaneGeometry(BAND_WIDE, BAND_LONG).rotateX(-Math.PI / 2),
      ),
      this.skin('arrows', this.arrows ? 0xffffff : BAND_COLOR, 0.95, this.arrows),
    );
    arrows.position.y = BELT_HEIGHT;
    // Aufgemalt und nicht gebaut: Ein Pfeil wirft keinen Schatten und hält
    // keinen Strahl auf (`core/usable.ts` zielt auf Möbel, nicht auf Farbe).
    arrows.castShadow = false;
    arrows.receiveShadow = false;
    arrows.raycast = () => {};
    group.add(arrows);

    return group;
  }

  /**
   * **Ein Bild weiter: die Pfeile wandern.**
   *
   * Eine Zahl, und zwar wirklich nur eine — nichts wird neu gezeichnet, keine
   * Textur hochgeladen, kein Netz angefasst (`texture.offset`, `RepeatWrapping`).
   * Ein Band, das je Bild seine Leinwand neu malte, wäre eine Textur von 128
   * Pixeln, die 60-mal in der Sekunde über den Bus geht, mal acht Bänder.
   *
   * Der Versatz läuft **rückwärts**: `uv · repeat + offset` verschiebt das
   * Muster gegen den Versatz, und gewollt ist, dass die Sparren nach +v laufen,
   * also nach −z. Nach jeder Texturlänge fängt er von vorn an — sonst wächst
   * die Zahl über eine lange Runde so weit, dass ihr die Nachkommastellen
   * ausgehen und die Pfeile ruckeln.
   */
  update(dt: number): void {
    if (!this.arrows) return;
    const step = Number.isFinite(dt) ? Math.max(0, dt) : 0;
    if (step === 0) return;
    // Eine Kachel je `BELT_SECONDS`, und eine Kachel sind `CHEVRONS`
    // Wiederholungen der Textur — die Sparren laufen also genau so schnell wie
    // das, was auf dem Band liegt.
    this.run = (this.run + (step / BELT_SECONDS) * CHEVRONS) % 1;
    this.arrows.offset.y = -this.run;
  }

  /**
   * **Alles weg** — einmal je Zone, nicht je Band.
   *
   * Zweimal zu rufen ist kein Fehler: Danach ist der Bausatz leer und ließe
   * sich wieder füllen (dieselbe Zusage wie bei `kitchenGauge.KitchenGauges`).
   */
  dispose(): void {
    for (const shape of this.shapes.values()) shape.dispose();
    for (const skin of this.skins.values()) skin.dispose();
    this.shapes.clear();
    this.skins.clear();
    this.arrows?.dispose();
    this.run = 0;
  }

  // --- geteilte Formen und Farben ---------------------------------------------

  private shape(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
    let shape = this.shapes.get(key);
    if (!shape) {
      shape = make();
      this.shapes.set(key, shape);
    }
    return shape;
  }

  /**
   * Eine Farbe, geteilt. **`MeshStandardMaterial`** und nicht `MeshBasic` wie
   * bei den Anzeigen: Ein Band ist ein Möbel und steht zwischen Möbeln, die
   * Licht und Schatten bekommen (`core/kitchenModel.ts`). Eines, das in jedem
   * Licht gleich hell wäre, klebte wie ein Aufkleber zwischen ihnen.
   */
  private skin(
    key: string,
    color: number,
    roughness: number,
    map: THREE.Texture | null = null,
  ): THREE.MeshStandardMaterial {
    let skin = this.skins.get(key);
    if (!skin) {
      skin = new THREE.MeshStandardMaterial({ color, roughness, map });
      this.skins.set(key, skin);
    }
    return skin;
  }
}

/**
 * **Ein Sparren auf einer Leinwand** — oder `null`, wo es keine gibt.
 *
 * Gemalt wird **einer**, und `RepeatWrapping` macht daraus so viele, wie das
 * Band lang ist. Er zeigt nach oben, und weil three.js eine Leinwand von Haus
 * aus umdreht (`texture.flipY`), ist oben auf der Leinwand v = 1 — und v = 1
 * liegt nach dem Flachlegen der Ebene bei −z. So zeigt der Pfeil im eigenen
 * Raum des Möbels nach Norden, genau wie `beltStep(0)`.
 */
function chevronTexture(): THREE.CanvasTexture | null {
  if (!canLoadModels()) return null;

  const size = CHEVRON_PIXELS;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Der Grund ist die Farbe des Trogs darunter: Die Textur ist deckend, damit
  // kein zweiter durchsichtiger Durchgang für ein paar Pfeile nötig wird.
  ctx.fillStyle = `#${BAND_COLOR.toString(16).padStart(6, '0')}`;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = ARROW_COLOR;
  // Ein Achtel der Kachel dick, mit runden Enden: Aus 16 m Höhe ist ein dünner
  // Strich ein Flimmern, ein dicker ein Pfeil.
  ctx.lineWidth = size / 8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  // Die Spitze sitzt auf einem Drittel der Höhe und nicht in der Mitte: So
  // bleibt zwischen zwei Sparren sichtbar Luft, und die Reihe liest sich als
  // Folge von Pfeilen statt als Zickzack.
  ctx.moveTo(size * 0.12, size * 0.68);
  ctx.lineTo(size * 0.5, size * 0.3);
  ctx.lineTo(size * 0.88, size * 0.68);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, CHEVRONS);
  return texture;
}
