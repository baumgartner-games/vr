import * as THREE from 'three';
import { denyShadow } from '../../../core/graphicsScene';
import { kitchenDeck, kitchenPiece } from '../../../core/kitchenFit';
import { TILE } from '../../nav/navTile';

/**
 * **Der Mixer** — ein Arbeitstisch mit einer Schüssel darauf, und er hackt von
 * selbst.
 *
 * Er ist das Gegenstück zum Schneidebrett und unterscheidet sich von ihm in
 * genau einer Zeile: `kitchenWork.WORK_ALONE`. Am Brett **ist** das
 * Danebenstehen die Arbeit — wer weggeht, hat abgebrochen; der Mixer läuft
 * weiter. Alles andere ist Wort für Wort dasselbe: dieselbe Uhr
 * (`kitchenWork.advanceWork`), dieselbe Stufenfolge (`kitchenRecipes.CHOPS`),
 * derselbe Balken darüber (`kitchenGauge`), dasselbe Liegenbleiben des
 * Fertigen.
 *
 * **Und daraus folgt der Satz aus dem Auftrag**: „Tomaten werden nicht zu
 * Tomatensuppe, sondern müssen zweimal durch den Mixer." Eine Stufe je
 * Auflegen, hier wie dort — aus der Tomate wird eine Scheibe, und erst wer die
 * Scheibe ein zweites Mal hineinlegt (oder hineinlegen lässt), bekommt Suppe.
 * Die Regel steht nicht hier, sondern in `kitchenRecipes.CHOPS`, und genau das
 * ist der Punkt: Es gibt sie einmal, nicht einmal für das Messer und einmal
 * für den Motor.
 *
 * **Warum das Möbel überhaupt gebaut und nicht geladen wird.** Der gekaufte
 * Katalog hat dreizehn Stücke und keinen Mixer (`core/kitchenFit`); dieselbe
 * Entscheidung wie beim Förderband und aus demselben Grund — eine zweite
 * Quelldatei mit Lizenz, Aufbereitung und Eintrag in
 * `public/models/CREDITS.md` wäre viel Aufwand für einen Kasten, einen Ring
 * und ein Kreuz.
 *
 * **Diese Datei ist deshalb nur das Aussehen**, und sie hat keine zweite
 * Hälfte mit einer Rechnung darin: Die steht vollständig in `kitchenWork.ts`.
 * Ein Mixer mit einer eigenen Uhr wäre die zweite Uhr, die beim nächsten
 * Rezept anders tickt als die erste.
 */

/** Wie hoch der Mixer ist, in Metern — die Oberkante des Motorblocks. */
export const MIXER_HEIGHT = kitchenPiece('mixer')?.height ?? 0.92;

/**
 * **Und wo darin etwas liegt** — der Boden der Schüssel, also die Tischplatte.
 *
 * Aus dem Katalog gelesen und nicht neben ihm aufgeschrieben
 * (`core/kitchenFit.kitchenDeck`): Genau auf dieser Höhe setzt die Zone ab,
 * was jemand hineinlegt, und ein Ring, der woanders anfinge, hätte das
 * Geschnittene entweder in der Luft oder im Blech.
 */
export const MIXER_DECK = (() => {
  const piece = kitchenPiece('mixer');
  return piece ? kitchenDeck(piece) : 0.5;
})();

/**
 * **Der Tisch darunter**, von unten nach oben, in Metern — dreischichtig wie
 * das Band (`kitchenBelt.ts`): dunkler Korpus, helle Platte mit Überstand,
 * darauf ein fast schwarzer Spiegel.
 *
 * **Die dritte Schicht ist eine Korrektur**, und dieselbe wie beim
 * Kombinierer: Ohne sie war die Tischplatte von oben eine **weiße Kachel**
 * zwischen lauter dunklen Bändern, und eine Bandstraße las sich als Folge von
 * Lücken statt als Bahn. Sichtbar bleibt die helle Platte als **Kante** aus
 * Augenhöhe — genau die Rolle, die sie am Band auch hat.
 *
 * Die Höhe des Korpus ist **gerechnet** und nicht geraten: Was unten steht,
 * ist die Ablage minus dem, was darüberliegt. So bleibt die Tischplatte auf
 * `MIXER_DECK`, egal was im Katalog steht.
 */
const TOP_THICK = 0.05;
const DECK_THICK = 0.022;
const BODY_HEIGHT = Math.max(0.1, MIXER_DECK - TOP_THICK - DECK_THICK);
const BODY_SIDE = TILE - 0.04;
const TOP_SIDE = TILE;

/**
 * **Die Schüssel** — 66 cm weit, 8,5 cm hoher Rand.
 *
 * Beide Zahlen sind gegen das gewählt, was hineinkommt. **66 cm** sind knapp
 * weiter als das Breiteste, was in dieser Küche gehackt wird (ein Salatkopf
 * misst 60 cm, `kitchenProps.BUN_RADIUS` zum Vergleich 30 cm Halbmesser), und
 * bleiben zugleich unter der Kachel: Zwischen zwei Mixern nebeneinander steht
 * eine sichtbare Fuge statt einer durchgehenden Wanne.
 *
 * **8,5 cm** sind absichtlich **niedriger als jede Zutat**. Ein Mixerkrug in
 * Originalhöhe wäre von oben — und von oben wird diese Küche gespielt
 * (`core/topDownPose.ts`) — ein undurchsichtiger Becher, in dem etwas
 * verschwindet. Was hier steht, ist ein Rand: Er sagt „hier hinein", und man
 * sieht trotzdem, was darin liegt.
 */
const BOWL_RADIUS = 0.33;
const BOWL_WALL = 0.085;
/** In wie viele Seiten Rand und Boden zerlegt werden — wie beim Teller nebenan. */
const BOWL_FACES = 48;

/**
 * **Das Messerkreuz am Boden** — zwei flache Balken über Kreuz.
 *
 * Es liegt 4 mm über der Ablage und damit **unter** allem, was hineinkommt:
 * Ein Salatkopf deckt es zu, und genau so soll es aussehen. Sichtbar ist es am
 * leeren Mixer, und dort beantwortet es die Frage, die ein bloßer Ring offen
 * ließe — ob das eine Schüssel ist oder ein Möbel, das etwas damit tut.
 *
 * **Es dreht sich nicht.** Der naheliegende Einfall wäre ein Kreuz, das läuft,
 * solange gehackt wird; nur sagt das nichts, was nicht schon dasteht: Über
 * jeder arbeitenden Station schwebt ein Balken (`kitchenGauge`), und der sagt
 * obendrein, wie weit sie ist. Ein zweites, ungenaueres Zeichen daneben wäre
 * die Sorte Zierrat, die man je Bild bezahlt.
 */
const BLADE_LONG = BOWL_RADIUS * 1.7;
const BLADE_WIDE = 0.045;
const BLADE_THICK = 0.006;
const BLADE_LIFT = 0.004;

/**
 * **Der Motorblock an der Vorderkante** — 34 cm breit, 14 cm tief, und er
 * reicht von der Tischplatte bis `MIXER_HEIGHT`.
 *
 * Er steht im **Norden** der Kachel, also auf der Seite, die bei `turn: 0`
 * vorn ist (`kitchenPlan.Spot.turn`). Damit steht er einer Bandbahn, die von
 * Süden hereinkommt, nie im Weg, und von oben liest sich die Kachel als
 * „Gerät hinten, Arbeit vorn" — dieselbe Leserichtung wie beim Herd mit seiner
 * Knopfblende.
 *
 * Die 14 cm Tiefe sind gegen die Schüssel gerechnet: Sie reicht bis
 * z = −0,33, der Block fängt bei z = −0,35 an. Zwei Zentimeter Luft, damit
 * sich Rand und Block nicht durchdringen — ein Schnitt zweier Netze ist von
 * oben eine Kante, die aussieht, als sei etwas kaputt.
 */
const MOTOR_WIDE = 0.34;
const MOTOR_DEEP = 0.14;
const MOTOR_BACK = 0.49;

/**
 * **Die Farben** — Korpus und Platte wie beim Band, Schüssel und Messer im Ton
 * des Schneidebalkens.
 *
 * `#e8f3ff` ist das Fast-Weiß, mit dem einmal die Sparren der Bänder gemalt
 * waren, bevor diese ihre eigenen Farben bekamen (`kitchenBelt.BELT_COLORS`).
 * Es ist damit die einzige Farbe dieser Küche, die **keine** Bandsorte meint —
 * und genau deshalb ist sie hier richtig: Ein Mixer ist kein Band, er ist ein
 * Schneidebrett mit Motor, und er trägt die Farbe der Klinge.
 */
const BODY_COLOR = 0x39414d;
const TOP_COLOR = 0xdfe4e9;
const DECK_COLOR = 0x171b21;
const BOWL_COLOR = 0x252b34;
export const MIXER_COLOR = '#e8f3ff';

/**
 * **Der Bausatz für die Mixer einer Küche** — geteilte Formen, geteilte Farben,
 * ein `dispose`.
 *
 * Einer je Zone, wie der Bandbausatz und der des Kombinierers. Und wie dort
 * ohne Leinwand: Alles hier ist Quader, Ring und Scheibe, also steht ein Mixer
 * in Jest genauso da wie im Browser.
 */
export class MixerKit {
  private readonly shapes = new Map<string, THREE.BufferGeometry>();
  private readonly skins = new Map<string, THREE.MeshStandardMaterial>();

  /**
   * **Ein Mixer**, Ursprung auf dem Boden in seiner Mitte — wie jedes
   * Küchenmöbel, und ungedreht wie jedes gebaute.
   */
  piece(): THREE.Object3D {
    const group = new THREE.Group();
    group.name = 'kitchen-mixer';

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

    const deck = new THREE.Mesh(
      this.shape('deck', () => new THREE.BoxGeometry(TOP_SIDE, DECK_THICK, TOP_SIDE)),
      this.skin('deck', DECK_COLOR, 0.95),
    );
    deck.position.y = BODY_HEIGHT + TOP_THICK + DECK_THICK / 2;

    const motor = new THREE.Mesh(
      this.shape(
        'motor',
        () => new THREE.BoxGeometry(MOTOR_WIDE, MIXER_HEIGHT - MIXER_DECK, MOTOR_DEEP),
      ),
      this.skin('motor', BODY_COLOR, 0.7),
    );
    motor.position.set(0, (MIXER_HEIGHT + MIXER_DECK) / 2, MOTOR_DEEP / 2 - MOTOR_BACK);

    // **Zwei Werfer und nicht vier**: Die Platte ist die breiteste Fläche und
    // enthält den Umriss des Korpus schon; der Motorblock steht darüber hinaus
    // und wirft deshalb seinen eigenen (`core/graphicsScene.denyShadow`,
    // dieselbe Rechnung wie beim Band).
    top.castShadow = true;
    motor.castShadow = true;
    denyShadow(body);
    denyShadow(deck);
    group.add(body, top, deck, motor);

    // Der Boden der Schüssel: eine dunkle Scheibe genau auf der Ablage. Sie
    // liegt **über** der Platte und nicht darin — ein Loch in einem Quader
    // wäre eine eigene Form für eine Fläche, die ohnehin nur von oben zu sehen
    // ist.
    const floor = new THREE.Mesh(
      this.shape('floor', () =>
        new THREE.CircleGeometry(BOWL_RADIUS, BOWL_FACES).rotateX(-Math.PI / 2),
      ),
      this.skin('bowl', BOWL_COLOR, 0.5),
    );
    floor.position.y = MIXER_DECK + 0.001;
    this.flat(floor);

    // Und der Rand darum: ein offener Zylinder, beidseitig sichtbar — von
    // außen sieht man die Wand, von oben durch sie hindurch in die Schüssel.
    const wall = new THREE.Mesh(
      this.shape(
        'wall',
        () => new THREE.CylinderGeometry(BOWL_RADIUS, BOWL_RADIUS, BOWL_WALL, BOWL_FACES, 1, true),
      ),
      this.skin('rim', new THREE.Color(MIXER_COLOR).getHex(), 0.4),
    );
    wall.position.y = MIXER_DECK + BOWL_WALL / 2;
    denyShadow(wall);
    wall.receiveShadow = false;
    group.add(floor, wall);

    const blade = this.skin('blade', new THREE.Color(MIXER_COLOR).getHex(), 0.3);
    for (const turn of [0, Math.PI / 2]) {
      const bar = new THREE.Mesh(
        this.shape('blade', () => new THREE.BoxGeometry(BLADE_WIDE, BLADE_THICK, BLADE_LONG)),
        blade,
      );
      bar.position.y = MIXER_DECK + BLADE_LIFT;
      bar.rotation.y = turn;
      this.flat(bar);
      group.add(bar);
    }

    return group;
  }

  /** Alles weg — einmal je Zone. Zweimal zu rufen ist kein Fehler. */
  dispose(): void {
    for (const shape of this.shapes.values()) shape.dispose();
    for (const skin of this.skins.values()) skin.dispose();
    this.shapes.clear();
    this.skins.clear();
  }

  // --- geteilte Formen und Farben ---------------------------------------------

  /** Aufgemalt und nicht gebaut — siehe `kitchenCombiner.CombinerKit.flat`. */
  private flat(mesh: THREE.Mesh): void {
    denyShadow(mesh);
    mesh.receiveShadow = false;
    mesh.raycast = () => {};
  }

  private shape(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
    let shape = this.shapes.get(key);
    if (!shape) {
      shape = make();
      this.shapes.set(key, shape);
    }
    return shape;
  }

  private skin(key: string, color: number, roughness: number): THREE.MeshStandardMaterial {
    let skin = this.skins.get(key);
    if (!skin) {
      skin = new THREE.MeshStandardMaterial({ color, roughness, side: THREE.DoubleSide });
      this.skins.set(key, skin);
    }
    return skin;
  }
}
