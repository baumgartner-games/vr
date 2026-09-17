import * as THREE from 'three';
import { denyShadow } from '../../../core/graphicsScene';
import { kitchenDeck, kitchenPiece } from '../../../core/kitchenFit';
import { TILE } from '../../nav/navTile';

/**
 * **Die sichere Kochstelle** — eine Platte, die brät und dann aufhört.
 *
 * Sie ist das Möbel, ohne das eine Bandstraße keinen Burger liefern kann, und
 * zwar aus zwei Gründen, die beide am **Herd** liegen:
 *
 * - **In eine Pfanne legt kein Band etwas hinein.** Auf dem Herd steht die
 *   Pfanne, die Kachel ist damit belegt, und eine belegte Kachel nimmt nichts
 *   an (`kitchenBelt.advanceBelts`). Hier steht nichts: Das rohe Patty liegt
 *   unmittelbar auf der Platte, so wie ein Salatkopf auf dem Schneidebrett
 *   liegt — und damit kann ein Band es hinschieben und ein anderes es wieder
 *   abholen.
 * - **Und ein Herd, den niemand bewacht, brennt.** Gebraten, verbrannt, Feuer
 *   — das ist die Folge am Herd (`kitchenClock.ts`), und sie ist dort der
 *   ganze Reiz: Man muss zurückkommen. Eine Straße kommt nicht zurück. Diese
 *   Platte geht deshalb **die eine Stufe** und bleibt dann stehen
 *   (`kitchenWork.workStage` für `'fry'`): aus roh wird gebraten, und aus
 *   gebraten wird hier nichts mehr.
 *
 * **Sie ist damit für das Braten, was der Mixer für das Schneiden ist**, und
 * das ist keine Ähnlichkeit, sondern dieselbe Uhr: `kitchenWork.advanceWork`
 * mit `WORK_ALONE` — läuft, ohne dass jemand danebensteht. Der Preis ist
 * derselbe: eine Sekunde mehr je Stufe (`WORK_SECONDS.fry`), damit die Pfanne
 * das schnellere Gerät bleibt.
 *
 * **Und deshalb ist auch diese Datei nur das Aussehen.** Die Rechnung steht
 * vollständig in `kitchenWork.ts`; eine eigene Uhr hier wäre die zweite, die
 * beim nächsten Rezept anders tickt als die erste.
 */

/** Wie hoch sie ist, in Metern — die Platte selbst, denn darauf steht nichts. */
export const GRIDDLE_HEIGHT = kitchenPiece('griddle')?.height ?? 0.55;

/**
 * **Und wo darauf etwas liegt** — dieselbe Höhe, aus dem Katalog gelesen.
 *
 * `kitchenDeck` gibt für ein Möbel ohne eigenen Eintrag die Gesamthöhe zurück
 * (`core/kitchenFit.ts`), und genau so ist es gemeint: Hier gibt es keine
 * Pfanne und keinen Topf, unter dem die Ablage tiefer läge. Gelesen und nicht
 * abgeschrieben, damit ein Eintrag im Katalog auch hier ankommt.
 */
export const GRIDDLE_DECK = (() => {
  const piece = kitchenPiece('griddle');
  return piece ? kitchenDeck(piece) : GRIDDLE_HEIGHT;
})();

/**
 * **Der Unterbau**, von unten nach oben, in Metern — dreischichtig wie Band,
 * Mixer und Kombinierer: dunkler Korpus, helle Platte mit Überstand, darauf
 * ein fast schwarzer Spiegel.
 *
 * Dieselben drei Schichten und dieselbe Begründung: In einer Reihe aus Bändern
 * soll eine Kochstelle wie ein Glied der Reihe aussehen und nicht wie eine
 * Lücke. Die helle Platte bleibt als **Kante** aus Augenhöhe sichtbar, von
 * oben liegt der Spiegel darüber — und auf dem Spiegel liegt das, worauf es
 * ankommt: die Kochplatte.
 */
const TOP_THICK = 0.05;
const DECK_THICK = 0.022;
const BODY_HEIGHT = Math.max(0.1, GRIDDLE_DECK - TOP_THICK - DECK_THICK);
const BODY_SIDE = TILE - 0.04;
const TOP_SIDE = TILE;

/**
 * **Die Kochplatte** — drei Ringe um eine Mitte, wie eine Elektrokochplatte
 * von oben.
 *
 * Und genau darum geht es: Sie wird **von oben** gelesen
 * (`core/topDownPose.ts`), und aus 16 m Höhe ist eine volle rote Scheibe ein
 * roter Fleck, während drei Ringe sofort eine Kochplatte sind. Es ist dieselbe
 * Form, die jeder Elektroherd hat, und sie sagt ohne ein Wort, was hier
 * geschieht.
 *
 * **72 cm außen**, also genau so breit wie die Sparren eines Bandes
 * (`kitchenBelt`, `ARROW_WIDE`): Was über die Bahn fährt, deckt die Platte
 * beim Ankommen zu, und die Reihe bleibt aus einem Guss. Innen bleibt ein
 * Kern von 8 cm stehen — ohne ihn wäre der innerste Ring so klein, dass er aus
 * der Ferne zu einem Punkt verschmilzt und das Bild unruhig macht.
 */
const PLATE_OUTER = 0.36;
const PLATE_CORE = 0.08;
const PLATE_RINGS = 3;
/** Wie breit ein Ring ist — die Hälfte des Abstands, also bleibt Lücke dazwischen. */
const RING_WIDE = ((PLATE_OUTER - PLATE_CORE) / PLATE_RINGS) * 0.5;
/** In wie viele Seiten ein Ring zerlegt wird — wie überall hier. */
const RING_FACES = 48;
/** Wie weit die Platte über dem Spiegel liegt — gegen das Flimmern. */
const PLATE_LIFT = 0.003;

/**
 * **Die Farben** — Korpus und Platte wie beim Band, die Kochplatte im Rot der
 * Herde.
 *
 * `#ff5a3c` ist absichtlich **kein** Bandton: Blau schiebt, Orange zieht,
 * Violett wählt aus, Grün legt zusammen (`kitchenBelt.BELT_COLORS`,
 * `kitchenCombiner.COMBINER_COLOR`) — und dieses Rot gehört zu keiner von
 * ihnen, sondern zu den **Herden** aus dem Möbelmodell, die in dieser Küche
 * die einzigen roten Möbel sind. Wer von oben über die Halle sieht, findet
 * damit die Stelle, an der gebraten wird, ohne die Beschriftung zu lesen.
 *
 * Es ist auch weit genug vom Orange des Zugbands entfernt, um daneben nicht zu
 * verschwimmen: `#ff9f45` ist gelblich, dieses hier rötlich, und beide liegen
 * nie auf derselben Kachel.
 */
const BODY_COLOR = 0x39414d;
const TOP_COLOR = 0xdfe4e9;
const DECK_COLOR = 0x171b21;
export const GRIDDLE_COLOR = '#ff5a3c';

/**
 * **Der Bausatz für die Kochstellen einer Küche** — geteilte Formen, geteilte
 * Farben, ein `dispose`.
 *
 * Einer je Zone wie die drei daneben, und wie sie ohne Leinwand: alles Quader,
 * Ring und Scheibe. Eine Kochstelle steht in Jest genauso da wie im Browser,
 * und ein Test kann ihre Maße gegen den Katalog rechnen.
 */
export class GriddleKit {
  private readonly shapes = new Map<string, THREE.BufferGeometry>();
  private readonly skins = new Map<string, THREE.MeshStandardMaterial>();

  /**
   * **Eine Kochstelle**, Ursprung auf dem Boden in ihrer Mitte — wie jedes
   * Küchenmöbel, und ungedreht wie jedes gebaute.
   *
   * Sie hat **keine Vorderseite**, und das ist der einzige Unterschied zu den
   * Möbeln daneben: Ein Band darf von jeder Seite hereinschieben und von jeder
   * abholen, und die Platte liegt rund in der Mitte. Wer sie dreht, dreht
   * nichts — und genau das soll man ihr ansehen.
   */
  piece(): THREE.Object3D {
    const group = new THREE.Group();
    group.name = 'kitchen-griddle';

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

    // **Ein Möbel wirft einen Schatten und nicht drei** — die Platte ist die
    // breiteste Schicht und enthält die Umrisse der beiden anderen schon
    // (`core/graphicsScene.denyShadow`, dieselbe Rechnung wie beim Band).
    top.castShadow = true;
    denyShadow(body);
    denyShadow(deck);
    group.add(body, top, deck);

    // Die Kochplatte: der Kern und darum die Ringe, alle in einer Farbe und
    // alle flach auf dem Spiegel. Gerechnet und nicht je Ring aufgeschrieben —
    // wer `PLATE_RINGS` ändert, bekommt eine Platte, die wieder aufgeht.
    const heat = this.skin('heat', new THREE.Color(GRIDDLE_COLOR).getHex(), 0.45);
    const core = new THREE.Mesh(
      this.shape('core', () =>
        new THREE.CircleGeometry(PLATE_CORE, RING_FACES).rotateX(-Math.PI / 2),
      ),
      heat,
    );
    core.position.y = GRIDDLE_DECK + PLATE_LIFT;
    this.flat(core);
    group.add(core);

    const step = (PLATE_OUTER - PLATE_CORE) / PLATE_RINGS;
    for (let i = 0; i < PLATE_RINGS; i++) {
      const outer = PLATE_CORE + step * (i + 1);
      const ring = new THREE.Mesh(
        this.shape(`ring:${i}`, () =>
          new THREE.RingGeometry(outer - RING_WIDE, outer, RING_FACES).rotateX(-Math.PI / 2),
        ),
        heat,
      );
      ring.position.y = GRIDDLE_DECK + PLATE_LIFT;
      this.flat(ring);
      group.add(ring);
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
