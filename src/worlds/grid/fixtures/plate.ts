import * as THREE from 'three';
import { canLoadModels } from '../../../core/chefFit';
import {
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
 * **Die Druckplatte** — gedrückt, solange etwas auf ihr steht.
 *
 * Sie ist der einzige Auslöser hier, den man nicht *bedient*: Man stellt sich
 * darauf, oder man schiebt eine Kiste darauf, und beides zählt gleich. Was auf
 * ihrer Kachel steht, zählt `GridWorld` (`weightOn`) — Rig, NPCs und alles, was
 * einen Körper hat —, und zwar als **Zahl** und nicht als Schalter: Zwei Kisten
 * darauf sind zwei, und wer eine davon wegnimmt, hat immer noch eine.
 *
 * **Sie löst in jedem Bild neu aus, in dem sie gedrückt ist**, und das ist die
 * ganze Feinheit an ihr. Eine Tür mit Nachlauf (`fixtures/door.ts`, `plate`)
 * setzt bei jedem Auslösen ihre Uhr zurück; deshalb fällt sie anderthalb
 * Sekunden nach dem **Verlassen** der Platte zu und nicht unter dem, der gerade
 * in ihr steht. Löste die Platte nur beim Betreten aus, stünde man in einer
 * Tür, die sich schließt, und hielte sie für kaputt.
 */

export interface PlateState {
  /** Ob gerade etwas darauf steht. */
  down: boolean;
}

/**
 * Halbmesser der Scheibe und wie tief sie eintaucht.
 *
 * 0,38 m, damit die Scheibe samt ihrem Ring (11 cm) in eine Kachel von einem
 * Meter passt: Eine Platte, die über ihre Kachel ragt, löst aus, wenn jemand
 * daneben steht.
 */
const PLATE_R = 0.38;
const DROP = 0.035;

/** Wie hoch sie über dem Boden liegt, wenn niemand darauf steht. */
const REST = 0.055;

const DARK = 0x3a2c08;
const HOT = 0x6a5210;

/**
 * **Die Platte aus dem Regal** — und warum ausgerechnet sie die erste ist, die
 * eine gerechnete Form ablöst.
 *
 * Das KayKit-Regal hat unter 4 470 Dateien **einen** Knopf, und zwar diesen:
 * `button_base_<farbe>` aus dem _Platformer_-Paket, in vier Farben, sonst
 * byteweise dieselbe Geometrie. Er ist kein Knopf auf einer Säule — den roten
 * Kuppelknopf (`worlds/shared/redButton.ts`) kann er deshalb nicht ersetzen —,
 * sondern genau das, was hier steht: ein **Bodenknopf**, auf den man tritt.
 *
 * **Er passt ohne Umrechnung.** Nachgemessen an der Datei, in den Einheiten
 * des Pakets und halbiert wie alles aus dieser Werkstatt
 * (`core/kaykitFit.KAYKIT_SCALE`): der Rahmen ist 1,75 × 0,20 × 1,75 → **0,875
 * × 0,10 × 0,875 m**, der Deckel darauf 1,35 × 0,23 × 1,35 → **0,675 × 0,115 ×
 * 0,675 m** und liegt zwischen 0,045 und 0,16 m über dem Boden. Eine Kachel
 * ist einen Meter breit (`nav/navTile.TILE`) — der Rahmen lässt also ringsum
 * gut sechs Zentimeter Luft, und das ist genau die Bedingung, die hier vorher
 * den Halbmesser bestimmt hat („Eine Platte, die über ihre Kachel ragt, löst
 * aus, wenn jemand daneben steht", siehe `PLATE_R`). Sein Ursprung liegt in
 * der Mitte seiner Unterkante, wie bei einem Möbel — er wird an die Gruppe
 * gehängt und muss nicht verschoben werden.
 *
 * **Gelb, weil diese Platte gelb ist** (`0xffc857`). Die vier Farbdateien
 * unterscheiden sich nur in einer verschobenen Textur-Spalte, nicht in einer
 * Ecke.
 */
const PLATE_MODEL = 'platformer/yellow/button_base_yellow.glb';

/**
 * **Wie der drückbare Teil in der Datei heißt.**
 *
 * Das ist die Bedingung, unter der ein Modell hier überhaupt infrage kam: Es
 * muss einen **eigenen** Deckel haben, den man eindrücken kann, und nicht ein
 * Netz sein, das den Rahmen gleich mitbringt. `button_base_yellow.glb` hat
 * zwei Knoten — `button_base_yellow` (der Rahmen im Boden) und
 * `button_yellow` (der Deckel, 0,205 Quelleinheiten darüber) —, und der
 * zweite ist der, der sich bewegt.
 *
 * Gesucht wird beim Namen und nicht beim Index: Ein `children[0]`, das nach
 * dem nächsten Paket-Update auf den Rahmen zeigt, wäre eine Platte, die beim
 * Betreten im Boden versinkt. Findet sich der Name nicht, bleibt die gebaute
 * Scheibe stehen — ein normaler Ausgang und kein Fehler.
 */
const PLATE_MODEL_CAP = 'button_yellow';

interface PlateView extends FixtureView {
  disc: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>;
  /** Der Ring darum — er geht mit der Scheibe, wenn das Modell kommt. */
  ring: THREE.Mesh;
  /** Der Deckel des Regalmodells, sobald er da ist — sonst `null`. */
  cap: THREE.Object3D | null;
  /** Seine Ruhehöhe, gemessen am Modell und nicht abgeschrieben. */
  capRest: number;
  /** `DROP`, umgerechnet in die Einheiten, in denen der Deckel steht. */
  capDrop: number;
  /** Die Materialien des Deckels — sie glühen statt der gebauten Scheibe. */
  capSkins: THREE.MeshStandardMaterial[];
  /**
   * **Alle** Materialien der Kopie — sie gehören ihr allein und müssen weg.
   *
   * Die **Geometrie** einer Regalkopie gehört der Vorlage und allen anderen
   * Kopien und wird nie freigegeben (`worlds/shared/environment.ts`,
   * `sharedAssets`); die Materialien dagegen klont `core/kaykitModel.copyOf`
   * je Kopie, damit ein Pinselstrich nicht in alle Fässer zugleich schreibt.
   * Wer sie liegen ließe, sammelte hier besonders schnell: Die Gitterwelt baut
   * ihre Einbauten bei **jeder** Änderung neu, und das sind im Baumodus
   * Dutzende je Minute.
   */
  modelSkins: THREE.Material[];
  /** Ob der Einbau schon abgeräumt ist, während die Datei noch unterwegs war. */
  gone: boolean;
}

/**
 * **Das Modell holen und die gebaute Platte darunter verstecken** — sofort
 * nichts, später vielleicht etwas.
 *
 * Der Einbau wird **synchron** gebaut, das Modell kommt über die Leitung;
 * dazwischen liegt genau diese Funktion. Bis die Datei da ist — und in einem
 * Checkout ohne die gekauften Pakete für immer — steht die gerechnete Scheibe
 * mit ihrem Ring da und tut, was sie immer tat. Das ist der normale Ausgang
 * und keine Notlösung: Die Platte ist ein Auslöser, und ein Auslöser, der auf
 * eine Datei wartet, ist kaputt.
 *
 * **Ohne WebGL passiert gar nichts** (`core/chefFit.canLoadModels`): In Jest
 * zieht `GLTFLoader` samt `import.meta` den ganzen Lauf mit herein, und was
 * `plate.test.ts` prüft — drücken, auslösen, loslassen —, braucht kein Netz.
 */
function fillPlate(view: PlateView, group: THREE.Group): void {
  if (!canLoadModels()) return;
  void import('../../../core/kaykitModel').then(async (module) => {
    const model = await module.kaykitModel(PLATE_MODEL);
    if (!model) return;
    // Weg ist der Einbau, weil jemand inzwischen umgebaut hat: Dann hängt das
    // Modell an einer Gruppe, die niemand mehr ansieht. Und ein Modell ohne
    // eigenen Deckel wäre eine Platte, die sich nicht bewegt — dann bleibt die
    // gebaute stehen (siehe `PLATE_MODEL_CAP`). Beide Male ist die Kopie schon
    // gebaut, und ihre **Materialien** gehören ihr allein: Sie gehen hier weg
    // und nicht erst, wenn niemand mehr weiß, dass es sie gab.
    const cap = model.getObjectByName(PLATE_MODEL_CAP);
    if (view.gone || !cap) {
      for (const skin of skinsOf(model)) skin.dispose();
      return;
    }
    // **Erst hängen, dann messen.** Der Deckel steht in den Einheiten seiner
    // Datei, und wie viele Meter eine davon ist, sagt der Maßstab auf der
    // Gruppe (`core/kaykitFit.kaykitScale`, dort aufgeschrieben, hier
    // gemessen): `position.y` um `DROP` zu verschieben wäre ein halb so tiefes
    // Eintauchen — das ist genau die Art Zahl, die niemand nachrechnet und die
    // beim nächsten Paket wieder danebenliegt.
    group.add(model);
    model.updateMatrixWorld(true);
    const world = cap.parent?.getWorldScale(new THREE.Vector3()).y ?? 1;
    view.cap = cap;
    view.capRest = cap.position.y;
    view.capDrop = DROP / (world > 1e-6 ? world : 1);
    // Zweimal durchgegangen, und beide Male mit einem anderen Ziel: Der ganze
    // Baum liefert, was am Ende freizugeben ist; der Deckel allein liefert,
    // was glühen soll. Jede Kopie hat eigene Materialien
    // (`core/kaykitModel.copyOf`) — in die des Deckels darf also
    // hineingeschrieben werden, ohne dass alle anderen Platten mitglühen.
    for (const skin of skinsOf(model)) view.modelSkins.push(skin);
    for (const skin of skinsOf(cap)) {
      if ((skin as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
        view.capSkins.push(skin as THREE.MeshStandardMaterial);
      }
    }
    // Erst jetzt, und nicht vorher: Ein Ring, der verschwindet, bevor der
    // Deckel gefunden ist, ist eine Kachel mit einem Loch darin.
    view.disc.visible = false;
    view.ring.visible = false;
  });
}

/** Die Materialien unter einem Knoten, jedes einmal. */
function skinsOf(root: THREE.Object3D): THREE.Material[] {
  const out = new Set<THREE.Material>();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (const skin of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      out.add(skin);
    }
  });
  return [...out];
}

export const PLATE: FixtureKind<PlateState> = {
  kind: 'plate',
  label: 'Platte',
  accent: 0xffc857,
  // Frei auf der Kachel und in der Mitte: Eine Platte an einer Kante wäre eine,
  // die halb unter der Wand liegt.
  edge: false,

  init(): PlateState {
    return { down: false };
  },

  // Sie liegt im Boden. Wer sie fest machte, hätte eine Platte, die man nicht
  // betreten kann — und damit keine Platte.
  solid(): boolean {
    return false;
  },

  step(state: PlateState, place: FixturePlacement, input: FixtureInput): FixtureEvent[] {
    const down = input.weightOn > 0;
    const out: FixtureEvent[] = [];
    if (down !== state.down) {
      state.down = down;
      out.push(sound(down ? 'pop' : 'switch-off'));
    }
    // Jedes Bild neu: siehe oben. Das kostet einen Eintrag in der Liste der
    // Welt und spart die Tür, die unter einem zufällt.
    const target = propText(place.props, 'target');
    if (down && target) out.push(trigger(target));
    return out;
  },

  build(place: FixturePlacement, ctx: FixtureBuild): FixtureView {
    const group = new THREE.Group();
    group.name = `fixture:${place.id}`;
    group.position.set(ctx.at.x, ctx.at.y, ctx.at.z);

    // Der Ring sagt, wo die Platte aufhört — klein und rund, und damit von oben
    // sofort als Platte zu lesen und nicht als Fleck im Boden.
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(PLATE_R + 0.11, PLATE_R + 0.11, 0.045, 28),
      ctx.material('steel'),
    );
    ring.position.y = 0.022;
    group.add(ring);

    const paint = new THREE.MeshStandardMaterial({
      color: 0xffc857,
      roughness: 0.6,
      emissive: new THREE.Color(DARK),
    });
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(PLATE_R, PLATE_R, 0.07, 28), paint);
    disc.position.y = REST;
    group.add(disc);

    ctx.group.add(group);

    const view: PlateView = {
      object: group,
      disc,
      ring,
      cap: null,
      capRest: 0,
      capDrop: DROP,
      capSkins: [],
      modelSkins: [],
      gone: false,
      // Am Boden gibt es nichts zu treffen: Eine Kugel, die auf einer
      // Druckplatte endete, wäre eine, die im Vorbeifliegen die Tür aufmacht.
      use: { radius: PLATE_R, shot: 0 },
      dispose: () => {
        view.gone = true;
        paint.dispose();
        // Die Geometrie der Regalkopie bleibt liegen (sie gehört der Vorlage),
        // ihre Materialien nicht — siehe `modelSkins`.
        for (const skin of view.modelSkins) skin.dispose();
        view.modelSkins.length = 0;
      },
    };
    // **Die Maße bleiben die gerechneten**, auch wenn gleich ein Modell
    // darüberkommt: `PLATE_R` ist der Halbmesser fürs Zeigen, und was auf der
    // Kachel steht, zählt die Welt (`weightOn`) und nicht ein Netz.
    fillPlate(view, group);
    return view;
  },

  apply(view: FixtureView, state: PlateState): void {
    const one = view as PlateView;
    // **Eines von beiden bewegt sich**, nie beides: Solange das Modell nicht
    // da ist, taucht die gebaute Scheibe ein; danach ihr Deckel, und zwar um
    // denselben Weg — `DROP` ist die Tiefe, die man sieht, und die hängt nicht
    // daran, woher das Bild kommt.
    if (one.cap) {
      one.cap.position.y = one.capRest - (state.down ? one.capDrop : 0);
      for (const skin of one.capSkins) skin.emissive.setHex(state.down ? HOT : DARK);
      return;
    }
    one.disc.position.y = REST - (state.down ? DROP : 0);
    one.disc.material.emissive.setHex(state.down ? HOT : DARK);
  },
};
