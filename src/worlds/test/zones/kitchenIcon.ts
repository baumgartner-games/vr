import * as THREE from 'three';
import { canLoadModels } from '../../../core/chefFit';
import { kitchenPiece, type KitchenPiece } from '../../../core/kitchenFit';
import { TILE } from '../../nav/navTile';

/**
 * **Der Icon-Ofen** — wie aus einem Ding ein Bild wird.
 *
 * Die Zutaten kommen nicht mehr aus gebauten Holzkisten, sondern aus dem
 * **Ausgabe-Möbel** des Katalogs (`serve-counter`, `core/kitchenFit.ts`). Das
 * ist dreizehnmal dasselbe graue Möbel, und vor einer Reihe davon steht man
 * und weiß nicht, welches das Brötchen hergibt. Also klebt ein **Bild der
 * Zutat** daran.
 *
 * **Gerendert und nicht gemalt**, und das ist die Entscheidung dieser Datei.
 * Ein gezeichnetes Icon wäre eine zweite Quelle der Wahrheit: Das Brötchen in
 * `kitchenProps.FoodKit` ist eine gedrückte Kugel mit einem hellen Fuß, und
 * wer daneben ein gemaltes Brötchen in eine Leinwand (`CanvasTexture`, wie
 * `ui/TextPlane.ts`) zeichnete, müsste es jedes Mal mitändern, wenn die Zutat
 * sich ändert — und würde es nicht tun. Hier wird **genau das Ding** abgelichtet,
 * das später in der Hand liegt: derselbe Körper, dieselbe Farbe.
 *
 * **Und das Möbel bringt selbst schon ein Symbol mit.** In der Textur des
 * `serve-counter` steckt ein aufgedruckter Burger — vorn und oben. Unser Icon
 * lag davor, beides war zu sehen, und vor der Salatausgabe stand ein Salat auf
 * einem Burger. Eine Tafel ist deshalb **zwei** Flächen: hinten eine deckend
 * weiße, die den Aufdruck auslöscht, davor das gerenderte Bild
 * (`IconOven.counterSign`, `blankSize`). Die Textur des Möbels wird dabei
 * nicht angefasst — sie ist fremde Arbeit, sie gehört dreizehn Möbeln
 * gemeinsam, und ein zweiter Satz Texturen für ein Symbol wäre teurer als eine
 * Fläche mit einer Farbe darauf.
 *
 * **Einmal und nicht je Bild.** Ein Render in ein `WebGLRenderTarget` ist ein
 * vollständiger zweiter Durchgang durch eine (winzige) Szene — vier Zutaten,
 * vier Durchgänge, einmal beim Aufbau der Zone. Danach ist ein Icon eine
 * Textur wie jede andere, und zwei Möbel mit derselben Zutat teilen sie sich
 * (`bake` über den Schlüssel). Dasselbe Muster wie beim Zutatensatz nebenan,
 * der Formen und Farben zwischen allen Brötchen teilt und einmal freigibt.
 *
 * **Eigenes Licht**, damit ein Icon nicht davon abhängt, wie die Welt gerade
 * beleuchtet ist: Die Küche steht draußen unter der Sonne der Testwelt, aber
 * ein Schild soll im Schatten dasselbe Bild zeigen wie in der Sonne. Der Ofen
 * bringt deshalb seine eigenen Lichter mit — im Ton von
 * `worlds/shared/environment.createLighting`, nur ohne das zweite
 * Richtungslicht von hinten: Bei einem freigestellten Ding von 40 cm ist ein
 * Abendblau von hinten kein Umriss, sondern ein blauer Rand.
 *
 * **Und der Renderer bleibt, wie er war.** Dieser Ofen läuft mitten im Aufbau
 * einer Zone, also möglicherweise zwischen zwei Bildern der Welt: Ziel,
 * Löschfarbe, `autoClear` und `xr.enabled` werden gemerkt und im `finally`
 * zurückgestellt — genau wie beim Spiegel (`worlds/shared/Mirror.ts`), aus
 * demselben Grund.
 */

/** Kantenlänge einer gebackenen Textur in Pixeln — quadratisch. */
export const ICON_SIZE = 256;

/**
 * **Woher der Ofen schaut**, in Grad: 25° zur Seite, 30° von oben.
 *
 * Nicht frontal, denn frontal ist ein Patty eine Scheibe und ein Teller ein
 * Strich. Und nicht von den 55° der Hauptansicht
 * (`core/topDownPose.TOP_DOWN_TILT`), obwohl das Schild dort hängt: Aus 55°
 * sieht man vom Brötchen den Deckel und sonst nichts, und ein Icon soll den
 * **Umriss** zeigen, an dem man die Zutat erkennt. 30° ist der Winkel, unter
 * dem ein gedrücktes Brötchen noch als gedrückt zu sehen ist, und 25° zur
 * Seite machen aus einem Zylinder ein Ding mit Vorder- und Oberseite.
 */
export const ICON_YAW = 25;
export const ICON_PITCH = 30;

/** Öffnungswinkel der Ofenkamera in Grad — dieselbe enge Sicht wie von oben. */
export const ICON_FOV = 30;

/**
 * **Wie viel Luft um das Ding bleibt** — 6 % der Bildkante.
 *
 * Formatfüllend heißt nicht randlos: Eine Tomate, deren Silhouette die
 * Bildkante berührt, wird beim Verkleinern der Textur (Mipmap) an genau dieser
 * Kante abgeschnitten, und der Strunk oben ist ab dann eine Stufe.
 */
export const ICON_PADDING = 1.06;

/** Wo eine Tafel am Möbel sitzt. */
export type SignPlace = 'front' | 'top';

/**
 * **Vorn oder oben — und warum vorn die Vorgabe ist.**
 *
 * Beides ist begründbar, deshalb entscheidet es der Aufrufer. Gerechnet:
 *
 * - **Oben** gewinnt in der Hauptansicht. Sie schaut unter 55° über der
 *   Waagerechten (`core/topDownPose.TOP_DOWN_TILT`), eine liegende Tafel
 *   behält davon `sin 55° = 82 %` ihrer Fläche, eine stehende nur
 *   `cos 55° = 57 %`. Dazu ist oben mehr Platz: Die Ausgabe ist **eine
 *   Kachel** groß (1 m, `worlds/nav/navTile.TILE`) und nur **0,46 m hoch**
 *   (`core/kitchenFit.KITCHEN_PIECES`) — oben passt eine Tafel von 0,62 m,
 *   vorn eine von 0,36 m.
 * - **Vorn** gewinnt trotzdem, und zwar aus zwei Gründen, die schwerer wiegen
 *   als Fläche. Erstens ist die Ausgabe eine **Arbeitsplatte**
 *   (`KitchenPiece.worktop`): Was jemand darauf ablegt, liegt auf 0,46 m —
 *   also genau auf einer liegenden Tafel und darüber. Ein Icon, das unter dem
 *   ersten abgestellten Teller verschwindet, ist keines. Zweitens gibt es
 *   diese Küche auch aus Augenhöhe (in der Brille und aus der Ich-Sicht), und
 *   von dort ist eine liegende Tafel auf Hüfthöhe ein Strich.
 */
export const SIGN_DEFAULT: SignPlace = 'front';

/**
 * Der Rand, der um eine Tafel frei bleibt, in Metern — vorn schmal, oben
 * breit.
 *
 * Vorn sind 5 cm der Rest: 0,46 m Möbelhöhe minus zweimal 5 cm ergeben eine
 * Tafel von 0,36 m, und die Ausgabe hat oben und unten eine Leiste, auf der
 * ein Schild nicht kleben soll. Oben sind es 19 cm, damit die Tafel (0,62 m)
 * sichtbar **auf** der Platte liegt und nicht über ihre Kante steht — bei
 * einer Kachel von einem Meter ist das knapp ein Fünftel je Seite.
 */
const SIGN_MARGIN_FRONT = 0.05;
const SIGN_MARGIN_TOP = 0.19;

/**
 * **Der Rand um die weiße Grundfläche** — schmaler als der um die Tafel, und
 * das ist der ganze Punkt.
 *
 * Das gekaufte Möbel `serve-counter` trägt in seiner Textur ein
 * **aufgedrucktes Burger-Symbol**, vorn wie oben. Unser gerendertes Icon liegt
 * davor, und beides war gleichzeitig zu sehen: hinter dem Salat der Ausgabe
 * ein zweiter, fremder Burger. Ein Aufkleber deckt aber nur, was er bedeckt —
 * also kommt **Farbe** darunter, eine deckend weiße Fläche, groß genug, dass
 * vom Aufdruck nichts mehr herausschaut.
 *
 * **Größer als die Tafel, und zwar in beide Richtungen.** Die Tafel ist
 * quadratisch, weil die Textur es ist (`signSize`) — der Aufdruck ist das
 * nicht, er sitzt in der Breite der ganzen Front. Eine weiße Fläche in
 * Tafelgröße wäre eine Unterlegscheibe: Sie nähme dem Icon den Hintergrund und
 * ließe links und rechts genau das stehen, was sie überdecken soll. Gerechnet
 * am Ausgabe-Möbel (1 Kachel, 0,46 m hoch, `core/kitchenFit.KITCHEN_PIECES`):
 *
 * - **Vorn** wird die Fläche 1,00 − 2 × 0,03 = **0,94 m** breit und
 *   0,46 − 2 × 0,03 = **0,40 m** hoch. Die Tafel davor misst 0,36 m — es
 *   bleiben also 2 cm Weiß über und unter ihr und 29 cm links und rechts.
 * - **Oben** wird sie 1,00 − 2 × 0,06 = **0,88 m** im Quadrat, die Tafel
 *   darauf 0,62 m: 13 cm Weiß ringsum.
 *
 * Warum überhaupt ein Rand bleibt: Die Front läuft oben und unten in eine
 * Leiste aus, und die Kachel hat eine Kante. Eine weiße Fläche, die darüber
 * hinausragt, steht in der Luft und sieht von der Seite aus wie ein
 * abgeknickter Aufkleber. Die 5 cm aus `SIGN_MARGIN_FRONT` sind der Platz, auf
 * dem ein **Schild** nicht kleben soll; Farbe darf dichter heran — 3 cm vorn,
 * und oben 6 cm statt der 19 cm, die eine liegende Tafel sichtbar auf der
 * Platte halten.
 */
const BLANK_MARGIN_FRONT = 0.03;
const BLANK_MARGIN_TOP = 0.06;

/** Wie weit die Tafel vom Möbel absteht, in Metern — gegen Z-Fighting. */
const SIGN_GAP = 0.01;

/**
 * Und wie weit die Icon-Tafel vor der weißen Fläche liegt — 2 mm, aus
 * demselben Grund. Weniger als `SIGN_GAP`, weil die beiden zusammengehören:
 * Sie sind ein Aufkleber aus zwei Lagen und nicht zwei Schilder.
 */
const SIGN_LAYER = 0.002;

/** Was ein Ofen an einem einzelnen Bild anders machen darf. */
export interface IconBakeOptions {
  /** Kantenlänge der Textur in Pixeln (Vorgabe `ICON_SIZE`). */
  readonly size?: number;
  /** Blickrichtung in Grad (Vorgabe `ICON_YAW` / `ICON_PITCH`). */
  readonly yaw?: number;
  readonly pitch?: number;
  /** Luft am Rand als Faktor über 1 (Vorgabe `ICON_PADDING`). */
  readonly padding?: number;
}

/** Wo eine fertige Tafel ans Möbel kommt. */
export interface SignSpot {
  /** Vorn (Vorgabe) oder oben — siehe `SIGN_DEFAULT`. */
  readonly where?: SignPlace;
  /** An welchem Möbel; Vorgabe ist die Ausgabe (`serve-counter`). */
  readonly piece?: KitchenPiece;
}

const DEG = Math.PI / 180;

/** Die Hochachse, und eine Ersatzachse für den Blick senkrecht von oben. */
const UP = new THREE.Vector3(0, 1, 0);
const ASIDE = new THREE.Vector3(0, 0, 1);

const _corner = new THREE.Vector3();
const _centre = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();

/**
 * **Die Blickrichtung des Ofens** als Einheitsvektor — von der Mitte des Dings
 * **zur Kamera**, nicht umgekehrt.
 *
 * `yaw = 0` schaut von vorn (aus +z, der Seite, auf der in dieser Welt der
 * Süden liegt — `core/topDownPose.topDownPosition`), positive Werte wandern
 * nach Osten, `pitch` hebt die Kamera an.
 */
export function iconView(
  yawDeg = ICON_YAW,
  pitchDeg = ICON_PITCH,
  out = new THREE.Vector3(),
): THREE.Vector3 {
  const yaw = yawDeg * DEG;
  const pitch = pitchDeg * DEG;
  const flat = Math.cos(pitch);
  return out.set(Math.sin(yaw) * flat, Math.sin(pitch), Math.cos(yaw) * flat);
}

/**
 * **Wie weit die Kamera weg muss**, damit die ganze Hülle ins Bild passt — in
 * denselben Einheiten wie die Hülle.
 *
 * Gerechnet und nicht geraten, und genau darum steht es als eigene Funktion
 * hier: Die Zutaten sind verschieden groß (ein Brötchen ist 60 cm breit, eine
 * Tomate 38 cm, `kitchenProps.ts`), und eine feste Entfernung machte aus dem
 * einen ein Icon und aus dem anderen einen Punkt in der Mitte.
 *
 * Gerechnet wird über die **acht Ecken** der Hülle und nicht über ihre
 * Umkugel. Die Umkugel wäre zwei Zeilen kürzer und verschenkte bei einem
 * flachen Ding ein Drittel des Bildes: Ein Patty ist eine Scheibe von 50 cm
 * Durchmesser und 9 cm Dicke, seine Umkugel ist 51 cm groß — formatfüllend
 * wäre danach eine Scheibe, die ein Viertel der Höhe belegt.
 *
 * Für jede Ecke gilt: Sie liegt im Bild, wenn ihr Abstand von der Bildachse
 * kleiner ist als ihre Tiefe mal `tan(fov/2)`. Nach der Entfernung aufgelöst
 * ergibt das je Ecke eine Untergrenze, und die größte davon gewinnt.
 */
export function iconDistance(
  box: THREE.Box3,
  view: THREE.Vector3,
  fovDeg = ICON_FOV,
  aspect = 1,
  padding = 1,
): number {
  if (box.isEmpty() || view.lengthSq() < 1e-6) return 1;
  box.getCenter(_centre);

  // Dieselbe Basis, die `Matrix4.lookAt` aufspannt: `view` ist die z-Achse der
  // Kamera, die x-Achse steht senkrecht auf ihr und der Hochachse. Schaut der
  // Ofen einmal **senkrecht von oben**, sind beide parallel und das Kreuz wäre
  // null — dann tut es jede andere Achse, denn ein Bild von oben hat kein Oben.
  const up = Math.abs(view.dot(UP)) > 0.999 ? ASIDE : UP;
  _right.crossVectors(up, view).normalize();
  _up.crossVectors(view, _right).normalize();

  // Die Luft am Rand steckt im Öffnungswinkel: ein engerer Winkel, also eine
  // größere Entfernung — und damit gilt sie für beide Achsen gleich.
  const tanY = Math.tan((fovDeg * DEG) / 2) / Math.max(0.01, padding);
  const tanX = tanY * Math.max(0.01, aspect);

  let distance = 0;
  for (let i = 0; i < 8; i++) {
    _corner
      .set(
        (i & 1) === 0 ? box.min.x : box.max.x,
        (i & 2) === 0 ? box.min.y : box.max.y,
        (i & 4) === 0 ? box.min.z : box.max.z,
      )
      .sub(_centre);
    const depth = _corner.dot(view);
    distance = Math.max(
      distance,
      depth + Math.abs(_corner.dot(_up)) / tanY,
      depth + Math.abs(_corner.dot(_right)) / tanX,
    );
  }
  return distance;
}

/**
 * **Wie groß die Tafel an diesem Möbel ist**, in Metern — quadratisch, weil
 * die Textur es ist.
 *
 * Aus den Maßen des Katalogs gerechnet und nicht je Möbel aufgeschrieben: Wer
 * die Ausgabe dort höher macht, bekommt ein größeres Schild, statt eines zu
 * suchen, das plötzlich über die Kante steht.
 */
export function signSize(piece: KitchenPiece, where: SignPlace = SIGN_DEFAULT): number {
  if (where === 'top') {
    const flat = Math.min(piece.tiles[0], piece.tiles[1]) * TILE;
    return Math.max(0.05, flat - 2 * SIGN_MARGIN_TOP);
  }
  return Math.max(0.05, piece.height - 2 * SIGN_MARGIN_FRONT);
}

/**
 * **Wie groß die weiße Grundfläche unter der Tafel ist**, in Metern — und
 * anders als die Tafel ist sie **nicht** quadratisch (siehe
 * `BLANK_MARGIN_FRONT`).
 *
 * Vorn ist `w` die Breite des Möbels und `h` seine Höhe, oben ist `w` seine
 * Breite und `h` seine Tiefe — in beiden Fällen die Fläche, die man von dieser
 * Seite sieht, abzüglich eines schmalen Rands. Aus dem Katalog gerechnet wie
 * `signSize`: Wer das Möbel dort austauscht, bekommt eine Fläche, die wieder
 * passt, statt einer, die plötzlich über die Kante steht.
 */
export function blankSize(
  piece: KitchenPiece,
  where: SignPlace = SIGN_DEFAULT,
): { w: number; h: number } {
  const wide = piece.tiles[0] * TILE;
  if (where === 'top') {
    const deep = piece.tiles[1] * TILE;
    return {
      w: Math.max(0.05, wide - 2 * BLANK_MARGIN_TOP),
      h: Math.max(0.05, deep - 2 * BLANK_MARGIN_TOP),
    };
  }
  return {
    w: Math.max(0.05, wide - 2 * BLANK_MARGIN_FRONT),
    h: Math.max(0.05, piece.height - 2 * BLANK_MARGIN_FRONT),
  };
}

/**
 * **Der Ofen** — einer je Zone, wie der Zutatensatz nebenan.
 *
 * Er hält die kleine Szene, in der gebacken wird, die fertigen Bilder und
 * alles, was an den Tafeln daraus hängt. Ein `dispose` gibt alles zusammen
 * frei; danach sind auch die ausgegebenen Texturen ungültig.
 */
export class IconOven {
  /** Die Szene des Ofens: zwei Lichter und das Ding, das gerade dran ist. */
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(ICON_FOV, 1, 0.01, 10);

  /** Ein Bild je Schlüssel — zweimal Brötchen ist einmal rendern. */
  private readonly cache = new Map<string, THREE.Texture>();
  private readonly targets: THREE.WebGLRenderTarget[] = [];

  /** Die geteilten Teile der Tafeln: Formen nach Maß, Materialien nach Bild. */
  private readonly boards = new Map<string, THREE.PlaneGeometry>();
  private readonly skins = new Map<THREE.Texture, THREE.MeshBasicMaterial>();
  /** Das Weiß unter allen Tafeln — eines für die ganze Zone. */
  private paint: THREE.MeshBasicMaterial | null = null;

  private readonly box = new THREE.Box3();
  private readonly size = new THREE.Vector3();
  // Ein **eigener** Merkvektor für die Mitte und nicht der des Moduls: Den
  // braucht `iconDistance` gleich danach selbst, und zwei Rechnungen auf
  // demselben Zwischenspeicher sind der Fehler, den niemand mehr sieht.
  private readonly centre = new THREE.Vector3();
  private readonly view = new THREE.Vector3();
  private readonly clear = new THREE.Color();

  constructor(private readonly renderer: THREE.WebGLRenderer) {
    // Der Ton von `worlds/shared/environment.createLighting`, eine Nummer
    // weicher: Das Grundlicht steht dort auf 1,5 und das Hauptlicht auf 1,6 —
    // hier trägt das Grundlicht mehr, weil ein freigestelltes Ding keine
    // Umgebung hat, aus der Licht zurückkäme.
    const sky = new THREE.HemisphereLight(0xbdd7ff, 0x2a3142, 1.8);
    this.scene.add(sky);
    // Von vorn oben und ein Stück von der Seite — dieselbe Ecke, aus der die
    // Kamera schaut, nur höher: So liegt der Schatten auf der abgewandten
    // Seite und der Umriss bleibt hell gegen das Nichts.
    const key = new THREE.DirectionalLight(0xffffff, 1.9);
    key.position.set(3, 6, 5);
    this.scene.add(key);
  }

  /**
   * **Rendert das Objekt einmal in eine Textur** — freigestellt, von schräg
   * vorn, formatfüllend und mittig.
   *
   * `build` wird nur gerufen, wenn wirklich gebacken wird: Der zweite Aufruf
   * mit demselben Schlüssel gibt dieselbe Textur zurück und baut gar nichts.
   *
   * **Was `build` liefert, gehört weiter dem Aufrufer.** Der Ofen hängt es
   * kurz in seine Szene und wieder heraus, gibt aber nichts davon frei — ein
   * Brötchen aus `kitchenProps.FoodKit` teilt sich Form und Farbe mit jedem
   * anderen Brötchen der Zone, und ein `dispose` darauf nähme allen anderen
   * die Geometrie weg.
   *
   * Gibt `null` zurück, wenn gerade nicht gerendert werden kann: ohne WebGL
   * (Jest, `core/chefFit.canLoadModels`) und **in der Brille**. Dort läuft der
   * Renderer im Takt des Bildschirms der Brille, und ein fremder Durchgang
   * mitten in einem Bild kostet dort mehr als ein fehlendes Schild — ein
   * `null` wird deshalb auch nicht gemerkt, ein späterer Aufruf backt es nach.
   */
  bake(
    key: string,
    build: () => THREE.Object3D,
    options: IconBakeOptions = {},
  ): THREE.Texture | null {
    const known = this.cache.get(key);
    if (known) return known;
    if (!canLoadModels()) return null;
    if (this.renderer.xr.isPresenting) return null;

    const pixels = Math.max(16, Math.round(options.size ?? ICON_SIZE));
    const object = build();

    // Ein eigener Träger darüber: Das gebaute Ding steht mit dem Fuß auf y = 0
    // (`FoodKit.item`), gemeint ist aber seine **Mitte** — und die verschiebt
    // der Träger, statt am fremden Objekt zu drehen.
    const pivot = new THREE.Group();
    pivot.add(object);
    this.scene.add(pivot);
    pivot.updateMatrixWorld(true);
    this.box.setFromObject(pivot);
    this.box.getCenter(this.centre);
    pivot.position.copy(this.centre).negate();

    iconView(options.yaw ?? ICON_YAW, options.pitch ?? ICON_PITCH, this.view);
    const distance = iconDistance(
      this.box,
      this.view,
      ICON_FOV,
      1,
      options.padding ?? ICON_PADDING,
    );
    // Die halbe Raumdiagonale ist die Umkugel — sie taugt nicht zum Einpassen
    // (siehe `iconDistance`), wohl aber für die beiden Ebenen: Näher als
    // `distance - radius` und weiter als `distance + radius` liegt nichts.
    const radius = this.box.getSize(this.size).length() / 2;
    this.camera.position.copy(this.view).multiplyScalar(distance);
    this.camera.lookAt(0, 0, 0);
    this.camera.aspect = 1;
    this.camera.near = Math.max(0.01, distance - radius - 0.01);
    this.camera.far = distance + radius + 0.01;
    this.camera.updateProjectionMatrix();

    const target = this.makeTarget(pixels);
    try {
      this.renderOnce(target);
    } catch (error) {
      console.warn('[kitchen] Icon konnte nicht gerendert werden', error);
      target.dispose();
      return null;
    } finally {
      this.scene.remove(pivot);
      pivot.clear();
    }

    this.targets.push(target);
    this.cache.set(key, target.texture);
    return target.texture;
  }

  /**
   * **Eine Tafel mit diesem Bild**, fertig zum Anhängen — eine Fläche, deren
   * Bild nach +z schaut, mit dem Ursprung in ihrer Mitte.
   *
   * **Unbeleuchtet** (`MeshBasicMaterial`), und das ist der Punkt der ganzen
   * Übung: Das Licht steckt schon im Bild. Ein beleuchtetes Schild bekäme es
   * ein zweites Mal — und stünde im Schatten des Ausgaberegals dunkler da als
   * das Schild daneben. Nebenbei hält es sich damit aus den Grafikstufen
   * heraus: `core/graphicsScene.ts` fasst nur Standardmaterialien an, und
   * durchsichtige Flächen bekommen ohnehin weder Saum noch Schlagschatten.
   */
  sign(texture: THREE.Texture, width: number, height: number): THREE.Mesh {
    const sign = new THREE.Mesh(this.board(width, height), this.skin(texture));
    sign.name = 'kitchen-icon-sign';
    sign.castShadow = false;
    sign.receiveShadow = false;
    return sign;
  }

  /**
   * **Die weiße Grundfläche** — deckend, unbeleuchtet, ohne Durchsicht.
   *
   * `MeshBasicMaterial` **ohne** `transparent`, und das ist dieselbe
   * Begründung wie bei der Tafel darüber: Ein beleuchtetes Weiß ist im
   * Schatten des Ausgaberegals grau, und grau überdeckt kein aufgedrucktes
   * Symbol, es lässt es durchscheinen. Unbeleuchtet ist es in der Sonne und im
   * Schatten dasselbe Weiß — und mehr soll es nicht sein: Untergrund, damit
   * das Icon davor das einzige Bild am Möbel ist.
   *
   * Sie schreibt Tiefe (kein `depthWrite: false` wie beim Aufkleber): Was
   * hinter ihr liegt, soll **nicht** mehr gezeichnet werden, das ist ja der
   * Zweck.
   */
  blank(width: number, height: number): THREE.Mesh {
    const blank = new THREE.Mesh(this.board(width, height), this.white());
    blank.name = 'kitchen-icon-blank';
    blank.castShadow = false;
    blank.receiveShadow = false;
    return blank;
  }

  /**
   * **Dieselbe Tafel, schon an ihrem Platz** — im Raum des Möbels, an das sie
   * gehängt wird (`model.add(sign)`).
   *
   * Der Ursprung eines Möbels liegt auf dem Boden in seiner Mitte
   * (`worlds/test/zones/kitchen.ts`, `place`), und **vorn ist −z**: Die
   * Ausgaben an der Theke stehen mit `turn: 2` „zum Gang hin gedreht", und der
   * Gang liegt im Süden (+z). Wer das Möbel anders dreht, dreht die Tafel mit
   * — sie hängt ja daran.
   *
   * **Zwei Flächen und nicht eine**, und deshalb gibt das hier eine Gruppe
   * zurück und kein `Mesh`: hinten die deckend weiße Grundfläche
   * (`blankSize`), die das **aufgedruckte** Symbol des gekauften Möbels
   * auslöscht, und `SIGN_LAYER` davor die Icon-Tafel wie bisher. Ohne die
   * weiße Lage sah man beides gleichzeitig — den Salat, den wir rendern, und
   * den Burger, der in der Textur des Möbels steckt.
   *
   * An der Lage der Gruppe ändert sich dadurch nichts: Sie sitzt genau dort,
   * wo vorher die Tafel saß, mit derselben Drehung.
   */
  counterSign(texture: THREE.Texture, spot: SignSpot = {}): THREE.Object3D {
    const piece = spot.piece ?? kitchenPiece('serve-counter');
    const height = piece?.height ?? 0.46;
    const depth = (piece?.tiles[1] ?? 1) * TILE;
    const where = spot.where ?? SIGN_DEFAULT;
    const edge = piece ? signSize(piece, where) : 0.36;
    const back = piece ? blankSize(piece, where) : { w: 0.94, h: 0.4 };

    const board = new THREE.Group();
    board.name = 'kitchen-icon-board';
    // Die Reihenfolge ist zugleich die Tiefe: erst das Weiß, dann das Bild.
    board.add(this.blank(back.w, back.h));
    const sign = this.sign(texture, edge, edge);
    sign.position.z = SIGN_LAYER;
    board.add(sign);

    if (where === 'top') {
      board.position.set(0, height + SIGN_GAP, 0);
      // Hingelegt: Das Bild schaut nach oben, sein Kopf zeigt nach Norden —
      // also dorthin, wo in der Ansicht von oben der obere Bildrand liegt.
      board.rotation.x = -Math.PI / 2;
      return board;
    }
    board.position.set(0, height / 2, -(depth / 2 + SIGN_GAP));
    board.rotation.y = Math.PI;
    return board;
  }

  /**
   * **Alles weg** — die Rendertargets samt ihrer Texturen, die Formen und
   * Materialien der Tafeln, die Lichter.
   *
   * Danach sind auch die Texturen ungültig, die `bake` ausgegeben hat: Sie
   * gehören den Rendertargets, und ein Schild, das eine davon noch trägt,
   * zeigt nichts mehr. Das ist gewollt — der Ofen lebt so lange wie die Zone,
   * und mit ihr gehen auch die Möbel.
   */
  dispose(): void {
    for (const target of this.targets) target.dispose();
    this.targets.length = 0;
    this.cache.clear();
    for (const board of this.boards.values()) board.dispose();
    this.boards.clear();
    for (const skin of this.skins.values()) skin.dispose();
    this.skins.clear();
    this.paint?.dispose();
    this.paint = null;
    this.scene.clear();
  }

  // --- das Backen selbst ------------------------------------------------------

  /**
   * Der eine Durchgang — und die vier Schalter, die er sich borgt.
   *
   * `autoClear` und die Löschfarbe stehen hier, weil ein freigestelltes Bild
   * genau daran hängt: Gelöscht wird mit **Alpha null**, und was danach an
   * Deckung im Puffer steht, ist der Umriss des Dings. Und `xr.enabled`
   * abzuschalten ist keine Vorsicht, sondern Pflicht: Ein Renderer im
   * XR-Modus zeichnet sonst in die Augenpuffer der Brille statt in das Ziel
   * (dieselbe Zeile wie in `worlds/shared/Mirror.ts`).
   */
  private renderOnce(target: THREE.WebGLRenderTarget): void {
    const renderer = this.renderer;
    const previousTarget = renderer.getRenderTarget();
    const previousXr = renderer.xr.enabled;
    const previousAutoClear = renderer.autoClear;
    const previousAlpha = renderer.getClearAlpha();
    renderer.getClearColor(this.clear);

    try {
      renderer.xr.enabled = false;
      renderer.autoClear = true;
      renderer.setClearColor(0x000000, 0);
      renderer.setRenderTarget(target);
      renderer.render(this.scene, this.camera);
    } finally {
      renderer.setRenderTarget(previousTarget);
      renderer.setClearColor(this.clear, previousAlpha);
      renderer.autoClear = previousAutoClear;
      renderer.xr.enabled = previousXr;
    }
  }

  /**
   * Das Ziel für ein Bild — klein, geglättet und mit Mipmaps.
   *
   * **Halbe Gleitkommazahlen** wie beim Spiegel: In ein Ziel schreibt three
   * **lineare** Werte, gleich welche Farbwelt daran steht (der Renderer nimmt
   * dafür seinen Arbeitsfarbraum), und lineare Werte in acht Bit sind in den
   * dunklen Hälften einer Tomate sichtbare Stufen. Dieselbe Zeile sorgt
   * dafür, dass das Schild später aussieht wie das Ding: Die Textur wird als
   * lineare Textur gelesen, und Tonwertkurve und Ausgabefarbraum legt der
   * Renderer beim Zeichnen der Tafel darüber, genau einmal.
   *
   * **Vierfach geglättet**, weil der Umriss die halbe Miete ist: Ein Brötchen
   * von 256 Pixeln mit Treppenkante sieht auf einem Schild von 36 cm nach
   * Fehler aus, und ein weicher Rand ist zugleich der Alphaverlauf, mit dem
   * das Icon auf dem Möbel aufliegt.
   */
  private makeTarget(pixels: number): THREE.WebGLRenderTarget {
    return new THREE.WebGLRenderTarget(pixels, pixels, {
      type: THREE.HalfFloatType,
      depthBuffer: true,
      stencilBuffer: false,
      samples: 4,
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
      generateMipmaps: true,
    });
  }

  // --- geteilte Teile der Tafeln ----------------------------------------------

  private board(width: number, height: number): THREE.PlaneGeometry {
    const key = `${width}x${height}`;
    let board = this.boards.get(key);
    if (!board) {
      board = new THREE.PlaneGeometry(width, height);
      this.boards.set(key, board);
    }
    return board;
  }

  private skin(texture: THREE.Texture): THREE.MeshBasicMaterial {
    let skin = this.skins.get(texture);
    if (!skin) {
      skin = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        // Ein Aufkleber schreibt keine Tiefe: Er liegt einen Zentimeter vor
        // einer Wand, die schon steht, und was hinter ihm liegt, ist sein
        // eigenes Möbel.
        depthWrite: false,
      });
      this.skins.set(texture, skin);
    }
    return skin;
  }

  /**
   * Ein Weiß für alle Grundflächen dieser Zone — geteilt wie Form und Haut der
   * Tafeln. Acht Ausgaben mit acht gleichen weißen Materialien wären acht
   * Zeichenaufträge, die der Renderer nicht zusammenfassen kann.
   */
  private white(): THREE.MeshBasicMaterial {
    this.paint ??= new THREE.MeshBasicMaterial({ color: 0xffffff });
    return this.paint;
  }
}
