import * as THREE from 'three';
import { canLoadModels } from '../../../core/chefFit';
import { TILE } from '../../nav/navTile';
import {
  fixtureYaw,
  propFlag,
  propNumber,
  propText,
  sound,
  trigger,
  type FixtureBuild,
  type FixtureEvent,
  type FixtureInput,
  type FixtureKind,
  type FixturePlacement,
  type FixtureView,
} from './index';

/**
 * **Die Lampe** — ein Punktlicht und eine Laterne aus dem Regal, und ein
 * `trigger` schaltet sie um.
 *
 * Sie ist der Einbau, an dem man am schnellsten sieht, dass die Kette steht:
 * Hebel drücken, Licht geht an. Kein Umweg über die Welt, kein Sonderfall im
 * `GridWorld` — der Hebel meldet `trigger`, die Registry stellt zu, und hier
 * kippt ein `boolean`.
 *
 * **Ein Mast, kein Deckenanschluss.** Im Labor hängt dasselbe unter der Decke;
 * auf der Straße gibt es keine, also steht die Lampe auf einem Mast. Das ist
 * dieselbe Sache in der Form, die der Ort hergibt — und es ist der Grund,
 * warum die Höhe (`props.height`) eine Eigenschaft ist und keine Konstante:
 * unter einem Vordach will man sie tiefer.
 *
 * **Das Licht hängt am Zustand und nicht am Bild.** Ausgeschaltet wird die
 * Stärke auf null gesetzt und die Lampe nicht aus der Szene genommen: Ein
 * Licht, das beim Ausschalten verschwindet, ist eines, das beim Umbau der Welt
 * nicht wiederkommt.
 *
 * ## Der Mast ist nicht mehr gerechnet
 *
 * Mast, Ausleger, Haube und Glaskugel waren bis eben vier Formen aus der
 * Palette der Welt. Sie sind **weg**: Was man sieht, ist jetzt
 * `holiday-bits/lantern.glb` aus dem Regal (siehe `LAMP_MODEL`), und zwar
 * nicht *neben* der gerechneten Form, sondern an ihrer Stelle. Zwei Laternen
 * auf einer Kachel wären eine zu viel.
 *
 * Was dabei **nicht** verschwunden ist, ist alles, woran Logik hängt: das
 * `PointLight` mit seinem Zustand, der Stellvertreter zum Anfassen
 * (`handle`) und die Unterscheidung zwischen an und aus in `apply`. Das Bild
 * ist austauschbar, der Schalter nicht.
 *
 * **Ohne Modell steht hier nichts.** In Jest gibt es kein WebGL
 * (`core/chefFit.canLoadModels`), in einem Checkout ohne die gekauften Pakete
 * keine Datei — dann brennt ein Licht ohne Lampe. Das ist die ehrliche
 * Auskunft und keine Notlösung: Eine zweite, gerechnete Laterne nur für
 * diesen Fall wäre genau die doppelte Form, die hier gerade weggegangen ist,
 * und zu sehen bekäme sie niemand. Die Druckplatte (`fixtures/plate.ts`)
 * behält ihre gebaute Scheibe aus einem anderen Grund: Sie ist ein
 * **Auslöser**, und auf ihr muss man stehen können, bevor irgendetwas geladen
 * hat.
 */

export interface LampState {
  /** Ob sie brennt. */
  on: boolean;
}

/** Wie hoch der Leuchtkörper hängt, wenn nichts anderes eingestellt ist. */
const HEIGHT = 2.8;

/** Wie hell sie brennt und wie weit sie trägt. */
const POWER = 26;
const RANGE = 11;

const GLASS_ON = 0xfff0cf;
const GLASS_OFF = 0x5a5f6a;

/** Aus heißt aus: Ein Glas, das im Dunkeln noch glimmt, ist nicht aus. */
const GLOW_OFF = 0x000000;

/**
 * **Die Laterne aus dem Regal** — und warum ausgerechnet diese.
 *
 * Unter den 4470 Dateien des Regals steht eine Handvoll, die „Laterne" heißt
 * oder eine ist; nachgemessen in Quelleinheiten und halbiert
 * (`core/kaykitFit.KAYKIT_SCALE`):
 *
 * - `holiday-bits/lantern.glb` — 0,991 × 3,938 × 0,905 → **0,50 × 1,97 ×
 *   0,45 m**, ein Knoten `lantern`, Ursprung in der Mitte der Unterkante.
 * - `halloween-bits/post_lantern.glb` — 3,30 hoch → **1,65 m**, Mast mit
 *   auskragender Laterne.
 * - `halloween-bits/lantern_standing.glb` — 0,925 → **0,46 m**, eine
 *   Standlaterne für den Boden.
 * - `rpg-tools-bits/lantern.glb` — 1,107 → **0,55 m**, eine Handlaterne.
 *
 * Die beiden letzten sind Requisiten und keine Straßenbeleuchtung — sie
 * reichen einem Menschen bis zum Knie. Die Halloween-Laterne hat die Bauart,
 * die hier gerechnet stand (Mast und Ausleger), ist aber eine
 * **Halloween**-Laterne, und die beiden Lampen im Spiel stehen in einem Hof
 * und an einer Treppe: Stil, nicht Maß.
 *
 * Bleibt die erste, und sie ist das Einzige in der Sammlung, das ein
 * Laternen**mast** ist und dazu genau `lantern` heißt. Zwei Dinge geben den
 * Ausschlag: Ihr Ursprung liegt in der Mitte ihrer Unterkante — sie wird an
 * die Gruppe gehängt und steht —, und sie bringt ihr Leuchtteil als
 * **eigenes Material** mit (`LAMP_MODEL_GLOW`), was die Bedingung dafür ist,
 * dass man an und aus überhaupt sehen kann.
 *
 * **Ihre Leuchte sitzt oben auf dem Mast und nicht auf einem Ausleger.** Das
 * ist der eine Unterschied zur gerechneten Lampe, und er kostet etwas: Der
 * Mast steht weiter am Rand der Kachel (siehe `foot` in `build` — „Ein Mast
 * mitten auf der Kachel stünde genau dort, wo man stehen will"), und damit
 * wandert das Licht dreißig Zentimeter mit ihm dorthin. Die Kachel begehbar
 * zu lassen ist der stärkere der beiden Gründe; ein Licht, das eine
 * Handbreit neben der Kachelmitte hängt, merkt niemand.
 */
const LAMP_MODEL = 'holiday-bits/lantern.glb';

/**
 * **Wie das Leuchtteil in der Datei heißt** — und es ist ein *Material*, kein
 * Knoten.
 *
 * `lantern.glb` ist ein einziger Knoten mit zwei Primitiven, und die beiden
 * tragen `holiday` (das Gehäuse) und `holiday_glow` (die Scheiben, 3,165 bis
 * 3,507 von 3,938 Quelleinheiten hoch — genau der Kasten oben). Das zweite
 * bringt aus der Datei `emissiveFactor` und `KHR_materials_emissive_strength`
 * mit; es ist also nicht irgendein Material, sondern das, was KayKit selbst
 * als „das hier leuchtet" markiert hat.
 *
 * Gesucht wird beim Namen und nicht beim Index — dieselbe Begründung wie bei
 * der Druckplatte (`fixtures/plate.ts`, `PLATE_MODEL_CAP`): Ein `children[0]`,
 * das nach dem nächsten Paket-Update auf das Gehäuse zeigt, wäre eine Lampe,
 * deren Mast angeht, während das Glas dunkel bleibt. Findet sich der Name
 * gar nicht, werden **alle** Materialien der Kopie gefärbt — dann leuchtet
 * die ganze Laterne statt nur ihrer Scheiben, und das ist ehrlicher als eine
 * Lampe, der man nicht ansieht, ob sie brennt.
 */
const LAMP_MODEL_GLOW = 'holiday_glow';

interface LampView extends FixtureView {
  light: THREE.PointLight;
  colour: number;
  /**
   * Die Materialien, die zwischen an und aus umgefärbt werden — das
   * Leuchtteil des Modells, sonst alle (siehe `LAMP_MODEL_GLOW`). Leer,
   * solange die Datei unterwegs ist.
   */
  glow: THREE.MeshStandardMaterial[];
  /**
   * **Alle** Materialien der Kopie — sie gehören ihr allein und müssen weg.
   *
   * Die **Geometrie** einer Regalkopie gehört der Vorlage und allen anderen
   * Kopien und wird nie freigegeben (`worlds/shared/environment.ts`,
   * `sharedAssets`); die Materialien dagegen klont `core/kaykitModel.copyOf`
   * je Kopie, damit eine ausgeschaltete Lampe nicht alle anderen mit ausmacht.
   * Wer sie liegen ließe, sammelte hier besonders schnell: Die Gitterwelt baut
   * ihre Einbauten bei **jeder** Änderung neu, und das sind im Baumodus
   * Dutzende je Minute.
   */
  modelSkins: THREE.Material[];
  /** Ob der Einbau schon abgeräumt ist, während die Datei noch unterwegs war. */
  gone: boolean;
}

/** Wie hoch diese Lampe hängt. */
export function lampHeight(place: FixturePlacement): number {
  return Math.max(0.5, propNumber(place.props, 'height', HEIGHT));
}

/**
 * **Um wie viel die Laterne noch wachsen muss**, damit sie so hoch steht wie
 * die Lampe, die sie ersetzt.
 *
 * `measured` ist die Höhe des geladenen Modells **in Metern**, also samt dem
 * Maßstab seines Pakets (`core/kaykitFit.kaykitScale`, hier 0,5); `height`
 * ist, was `lampHeight` für diesen Platz sagt. Heraus kommt der Faktor, mit
 * dem der Maßstab der Kopie noch einmal multipliziert wird.
 *
 * **Gemessen und nicht abgeschrieben** — dieselbe Begründung wie beim Sockel
 * der Kisten (`core/kaykitModel.copyOf`) und beim Deckel der Druckplatte
 * (`fixtures/plate.ts`): Die 3,938 Quelleinheiten dieser Datei sind fremde
 * Arbeit. Eine Zahl, die hier stünde, ist die, die beim nächsten
 * Paket-Update stehen bleibt und dann eine Laterne ergibt, die einen halben
 * Meter zu kurz ist — und niemand rechnet sie nach. `THREE.Box3` rechnet sie
 * bei jeder gebauten Lampe nach.
 *
 * Eigene, exportierte Funktion **ohne** three.js, damit der Test daneben sie
 * anfassen kann: Der Lader braucht WebGL, diese Division nicht. Das ist in
 * diesem Projekt der übliche Schnitt (`core/kaykitFit.ts`, `core/chefFit.ts`).
 *
 * Eine Höhe von null — ein Modell ohne Netz, eine Datei, aus der nichts
 * herauskam — gibt 1 und nicht unendlich: Eine Laterne in ihrer eigenen Größe
 * ist falsch, eine unendlich große ist kaputt.
 */
export function lampFit(measured: number, height: number): number {
  if (!(measured > 1e-4) || !(height > 0)) return 1;
  return height / measured;
}

/**
 * **Das Modell holen und hinstellen** — sofort nichts, gleich darauf eine
 * Laterne.
 *
 * Der Einbau wird **synchron** gebaut, das Modell kommt über die Leitung;
 * dazwischen liegt genau diese Funktion. Bis die Datei da ist, steht auf der
 * Kachel ein Licht und sonst nichts (siehe oben, „Ohne Modell steht hier
 * nichts").
 *
 * **Ohne WebGL passiert gar nichts** (`core/chefFit.canLoadModels`): In Jest
 * zieht `GLTFLoader` samt `import.meta` den ganzen Lauf mit herein, und was
 * `lamp.test.ts` prüft — schalten, weitergeben, rechnen —, braucht kein Netz.
 * Der Import steht deshalb **hinter** der Frage und nicht davor.
 */
function fillLamp(view: LampView, group: THREE.Group, height: number, foot: number): void {
  if (!canLoadModels()) return;
  void import('../../../core/kaykitModel').then(async (module) => {
    const model = await module.kaykitModel(LAMP_MODEL);
    if (!model) return;
    // Weg ist der Einbau, weil jemand inzwischen umgebaut hat: Dann hängt das
    // Modell an einer Gruppe, die niemand mehr ansieht. Die Kopie ist schon
    // gebaut, und ihre **Materialien** gehören ihr allein — sie gehen hier weg
    // und nicht erst, wenn niemand mehr weiß, dass es sie gab.
    if (view.gone) {
      for (const skin of skinsOf([model])) skin.dispose();
      return;
    }

    // **Gemessen wird, solange sie an keiner Gruppe hängt.** Dann ist ihre
    // Weltmatrix ihre eigene, und `Box3` liefert Meter — den Maßstab ihres
    // Pakets trägt die zurückgegebene Gruppe schon (`kaykitScale`). Erst
    // danach wird gerechnet, gehängt und gestellt; andersherum müsste man
    // sich darauf verlassen, dass die Matrizen der halben Welt gerade
    // stimmen.
    const box = new THREE.Box3().setFromObject(model);
    const factor = lampFit(box.max.y - box.min.y, height);

    // **Wo die Leuchte sitzt, sagt das Modell** und nicht `height`: Die
    // Scheiben stehen oben im Kasten und nicht an der Mastspitze, und ein
    // Punktlicht eine Handbreit darüber wäre eine Laterne, die neben sich
    // leuchtet. Gefunden wird der Kasten über sein Material (siehe
    // `LAMP_MODEL_GLOW`); ohne ihn bleibt das Licht, wo es gebaut wurde.
    const lit = glowParts(model);
    if (lit.length > 0) {
      const glow = new THREE.Box3();
      for (const mesh of lit) glow.expandByObject(mesh);
      view.light.position.y = ((glow.min.y + glow.max.y) / 2) * factor;
    }

    model.scale.multiplyScalar(factor);
    // Der Ursprung der Datei liegt in der Mitte ihrer Unterkante — sie steht
    // damit auf dem Boden der Kachel und muss nur noch an den Platz des
    // Mastes.
    model.position.set(0, 0, foot);
    group.add(model);

    for (const skin of skinsOf([model])) view.modelSkins.push(skin);
    // Zweimal durchgegangen, und beide Male mit einem anderen Ziel: Der ganze
    // Baum liefert, was am Ende freizugeben ist; das Leuchtteil liefert, was
    // umgefärbt wird. Ist keines ausgewiesen, ist das der ganze Baum — dann
    // geht die Laterne im Ganzen an und aus.
    for (const skin of skinsOf(lit.length > 0 ? lit : [model])) {
      if ((skin as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
        view.glow.push(skin as THREE.MeshStandardMaterial);
      }
    }
    // Gefärbt wird hier nicht: `apply` läuft in **jedem** Bild
    // (`GridWorld.stepFixtures`) und holt das im nächsten nach. Eine Lampe,
    // die ihren Zustand beim Laden noch einmal selbst herstellte, hätte zwei
    // Stellen, die dasselbe wissen müssen.
  });
}

/**
 * **Die Netze, die leuchten sollen** — leer, wenn die Datei keines ausweist.
 *
 * Gefragt wird das Material und nicht der Knoten: In dieser Datei ist das
 * Leuchtteil ein zweites Primitiv desselben Knotens, und ein Primitiv hat
 * keinen eigenen Namen (siehe `LAMP_MODEL_GLOW`).
 */
function glowParts(model: THREE.Object3D): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  model.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const skins = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    if (skins.some((skin) => skin.name === LAMP_MODEL_GLOW)) out.push(mesh);
  });
  return out;
}

/** Die Materialien unter diesen Knoten, jedes einmal. */
function skinsOf(roots: readonly THREE.Object3D[]): THREE.Material[] {
  const out = new Set<THREE.Material>();
  for (const root of roots) {
    root.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      for (const skin of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        out.add(skin);
      }
    });
  }
  return [...out];
}

export const LAMP: FixtureKind<LampState> = {
  kind: 'lamp',
  label: 'Lampe',
  accent: 0xfff0cf,
  // Frei auf der Kachel: Eine Lampe leuchtet über eine Kachel und nicht über
  // eine Kante.
  edge: false,

  init(place: FixturePlacement): LampState {
    return { on: propFlag(place.props, 'on', true) };
  },

  // Der Mast ist eine Handbreit dick. Wer daran hängenbliebe, bliebe an etwas
  // hängen, das man von oben gar nicht sieht.
  solid(): boolean {
    return false;
  },

  step(state: LampState, place: FixturePlacement, input: FixtureInput): FixtureEvent[] {
    if (!input.used && !input.triggered) return [];
    state.on = !state.on;
    const out: FixtureEvent[] = [sound(state.on ? 'switch-on' : 'switch-off')];
    const target = propText(place.props, 'target');
    if (target) out.push(trigger(target));
    return out;
  },

  build(place: FixturePlacement, ctx: FixtureBuild): FixtureView {
    const group = new THREE.Group();
    group.name = `fixture:${place.id}`;
    group.position.set(ctx.at.x, ctx.at.y, ctx.at.z);
    group.rotation.y = fixtureYaw(place.dir);

    const height = lampHeight(place);
    const colour = Math.round(propNumber(place.props, 'colour', GLASS_ON));

    // Der Mast steht am Rand der Kachel: Ein Mast mitten auf der Kachel stünde
    // genau dort, wo man stehen will.
    const foot = -TILE / 2 + 0.2;

    /**
     * **Der Stellvertreter zum Anfassen** — ein Punkt im Raum, sonst nichts.
     *
     * Die Welt meldet einen Einbau **beim Bauen** als benutzbar an
     * (`GridWorld.attachUsable`) und merkt sich genau dieses Objekt, um es
     * beim Umbau wieder abzumelden. Das Modell ist zu diesem Zeitpunkt noch
     * unterwegs; wer den Griff daran hängte, hätte eine Lampe, die erst eine
     * halbe Sekunde später eine wird — und beim Abräumen ein Objekt, das nie
     * angemeldet war. Also steht hier ein eigenes, leeres Objekt, und es
     * steht von der ersten Zeile an.
     *
     * **Unten am Mast**, und das ist keine Zier: Ausgewählt wird waagerecht
     * (`core/usable.pickUsable` rechnet nur in x und z), und die Leuchte
     * hängt drei Meter hoch — wer sie anfassen will, steht neben ihrem Fuß.
     * Derselbe Ort, an dem bis eben der gerechnete Mast stand, also dieselbe
     * Reichweite wie vorher.
     *
     * Und weil ein leeres Objekt keine Geometrie hat, wird der gelbe Saum zu
     * einem **Ring auf dem Boden** (`core/highlight.ts`, „Wo es keine
     * Geometrie gibt, liegt ein Ring auf dem Boden") — bei einer Laterne, die
     * über einem steht, die bessere Auskunft als eine umrandete Mastspitze.
     */
    const handle = new THREE.Object3D();
    handle.position.set(0, 0, foot);
    group.add(handle);

    const light = new THREE.PointLight(colour, POWER, RANGE, 2);
    // Vorläufig: Sobald das Modell da ist, rückt das Licht dorthin, wo dessen
    // Leuchtteil wirklich sitzt (`fillLamp`).
    light.position.set(0, height - 0.2, foot);
    group.add(light);

    ctx.group.add(group);

    const view: LampView = {
      object: group,
      light,
      colour,
      glow: [],
      modelSkins: [],
      gone: false,
      handle,
      use: { radius: 0.6, shot: 0 },
      dispose: () => {
        view.gone = true;
        // Die Geometrie der Regalkopie bleibt liegen (sie gehört der Vorlage),
        // ihre Materialien nicht — siehe `modelSkins`.
        for (const skin of view.modelSkins) skin.dispose();
        view.modelSkins.length = 0;
        view.glow.length = 0;
      },
    };
    fillLamp(view, group, height, foot);
    return view;
  },

  apply(view: FixtureView, state: LampState): void {
    const one = view as LampView;
    one.light.intensity = state.on ? POWER : 0;
    // **Man muss es auch sehen.** Das Licht allein reicht nicht: Wer bei Tag
    // davorsteht, sähe sonst nur, dass sich nichts tut. Die Grundfarbe
    // multipliziert die Textur des Pakets — mit `colour` bleibt sie, wie sie
    // gemeint ist, mit `GLASS_OFF` wird sie das kalte Grau eines toten Glases.
    // Und das `emissive` aus der Datei geht mit: an leuchtet es in der Farbe
    // der Lampe, aus ist es schwarz.
    for (const skin of one.glow) {
      skin.color.setHex(state.on ? one.colour : GLASS_OFF);
      skin.emissive.setHex(state.on ? one.colour : GLOW_OFF);
    }
  },
};
