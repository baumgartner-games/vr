import * as THREE from 'three';
import { PLAN_DOOR_H, PLAN_DOOR_W } from '../../editor/levelPlan';
import { PLAN_LEAF_T } from '../../editor/levelBuild';
import {
  newDoor,
  passable,
  slideOffset,
  stepDoor,
  swingAngle,
  triggerDoor,
  type DoorParams,
  type DoorState,
} from '../../interact/doorMotion';
import { DIR_N, DIR_S, TILE, dirX, dirZ } from '../../nav/navTile';
import { slab, type PlanSolid } from '../solids';
import {
  effect,
  fixtureYaw,
  propNumber,
  propText,
  sound,
  type FixtureBuild,
  type FixtureEvent,
  type FixtureInput,
  type FixtureKind,
  type FixturePlacement,
  type FixtureView,
} from './index';

/**
 * **Die Tür auf dem Kachelgitter** — dieselben drei aus dem Interaktionslabor,
 * nur auf einer Kachelkante statt in Metern.
 *
 * Sie ist der Einbau, wegen dem die Registry überhaupt eine Türkante kennt
 * (`kind.door`, `gridPlan.fitDoor`): Eine Tür, die bloß ein Quader wäre, der
 * verschwindet, hätte niemanden, der von ihr weiß, bevor er losläuft — für
 * jeden NPC wäre sie eine Wand, und für eine Meinung über sie
 * (`nav/navBelief.ts`) gäbe es gar nichts.
 *
 * **Gerechnet wird nicht hier.** Wie weit eine Tür offen ist, wann sie zufällt
 * und wie weich sie anfährt, steht seit dem Labor in `interact/doorMotion.ts`
 * und wird von dort **importiert**. Eine zweite Türmathematik neben der ersten
 * ist eine, die nach dem dritten Umbau anders aussieht als die, an der man sie
 * eingestellt hat — und die Lampe über der Tür zeigte dann hier etwas anderes
 * als im Labor.
 *
 * **Drei Betriebsarten, eine Datei** (`props.mode`):
 *
 * - `slide` — ein Blatt fährt zur Seite. Vorgabe **mit Nachlauf**: Der Knopf
 *   öffnet, nach sechs Sekunden fällt sie von selbst zu.
 * - `swing` — zwei Flügel schwingen um ihre Scharniere am Rahmen. Vorgabe
 *   **rastend** (`hold: 0`): Der Hebel schaltet um, auf bleibt auf.
 * - `plate` — wie `slide`, nur mit kurzem Nachlauf. Die Druckplatte löst in
 *   *jedem* Bild neu aus, in dem etwas auf ihr steht; deshalb fällt die Tür
 *   anderthalb Sekunden nach dem Verlassen zu und nicht unter dem, der in ihr
 *   steht.
 *
 * **Das Blatt zeichnet diese Art selbst, den Rahmen nicht.** Pfosten und Sturz
 * kommen aus dem Grundriss, wie bei jeder anderen Türkante auch
 * (`editor/levelBuild.doorParts`) — sie stehen ja und bewegen sich nie. Das
 * Blatt dagegen fährt, und ein zweites, starres daneben wäre eine Tür, die
 * aufgeht und trotzdem zu bleibt; `GridWorld` lässt es für Einbau-Türen
 * deshalb weg. Der Quader, der aufhält, solange sie zu ist, steht trotzdem in
 * `solids` — er ist unsichtbar und nur Körper, und genau dafür trägt er den
 * Namen der Tür.
 */

/** Wie eine Tür aufgeht. */
export type DoorMode = 'slide' | 'swing' | 'plate';

/** Wie lange eine Art von Tür offen bleibt, wenn nichts anderes eingestellt ist. */
const HOLD: Readonly<Record<DoorMode, number>> = { slide: 6, swing: 0, plate: 1.6 };

/** Wie lange sie von zu bis offen braucht, wenn nichts anderes eingestellt ist. */
const TIME = 1.2;

/** Wie weit ein Drehflügel aufschwingt. */
const SWING_MAX = (100 * Math.PI) / 180;

/**
 * Und wie weit ein Schiebeflügel fährt: seine halbe Öffnung und ein Fingerbreit
 * mehr, damit der Durchgang wirklich frei ist.
 */
const SLIDE_TRAVEL = (PLAN_DOOR_W / 2) * 1.04;

/** Die Lampe über der Tür: aus, gelb in Bewegung, grün offen — wie im Labor. */
const LAMP_OFF = 0x39414f;
const LAMP_MOVING = 0xffc857;
const LAMP_ON = 0x5ee0a0;

/** Was für eine Tür das ist — alles außer `swing` und `plate` ist eine Schiebetür. */
export function doorMode(place: FixturePlacement): DoorMode {
  const mode = propText(place.props, 'mode', 'slide');
  return mode === 'swing' || mode === 'plate' ? mode : 'slide';
}

/**
 * Ihre Zeiten. Die Betriebsart gibt den Nachlauf vor, und die Welt darf ihn
 * überschreiben: Eine Flügeltür, die rastet, ist der Normalfall — und eine, die
 * nach zwei Sekunden zufällt, ist eine, die jemand ausdrücklich so wollte.
 */
export function doorParams(place: FixturePlacement): DoorParams {
  const mode = doorMode(place);
  return {
    time: Math.max(0.05, propNumber(place.props, 'time', TIME)),
    hold: Math.max(0, propNumber(place.props, 'hold', HOLD[mode])),
  };
}

/** Ein Flügel im Bild: sein Brett, wo es zu hängt, und wohin es geht. */
interface DoorLeaf {
  mesh: THREE.Mesh;
  /** Schiebetür: die Ruhelage in x. */
  home: number;
  /** In welche Richtung er fährt beziehungsweise schwingt. */
  side: number;
  /** Drehtür: die Gruppe am Scharnier, um die gedreht wird. */
  pivot?: THREE.Group;
}

interface DoorView extends FixtureView {
  leaves: DoorLeaf[];
  lamp: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
}

export const DOOR: FixtureKind<DoorState> = {
  kind: 'door',
  label: 'Tür',
  accent: 0x6fa8dc,
  // An eine Kante, und an nichts anderes: Eine Tür mitten auf einer Kachel
  // trennt nichts, und der Graph hätte keine Kante, an die er sie hängt.
  edge: true,
  door: true,

  init(): DoorState {
    return newDoor();
  },

  open(state: DoorState): boolean {
    return passable(state);
  },

  solid(state: DoorState): boolean {
    return !passable(state);
  },

  /**
   * Ein Bild Tür.
   *
   * `used` und `triggered` sind dabei dasselbe: Der Knopf davor ist eine
   * Fernbedienung und kein Schloss, und eine Tür, vor der man steht, geht auf
   * `E` auf — wie jede Tür.
   */
  step(state: DoorState, place: FixturePlacement, input: FixtureInput, dt: number): FixtureEvent[] {
    const params = doorParams(place);
    const before = state.open;
    if (input.used || input.triggered) Object.assign(state, triggerDoor(state, params));
    Object.assign(state, stepDoor(state, dt, params));
    // Genau zweimal je Türgang ein Geräusch und nicht in jedem Bild dazwischen:
    // beim Losfahren und beim Zufallen. Dazu je eine kleine Staubwolke — die
    // Zahlen dafür kommen aus `effects/effectKinds.ts` und werden hier nicht
    // neu erfunden (`GridWorld` baut sie, die Tür meldet sie nur).
    if (before <= 0 && state.open > 0) return [sound('switch-on'), effect('dust', 0.5)];
    if (before > 0 && state.open <= 0) return [sound('slam'), effect('dust', 0.5)];
    return [];
  },

  build(place: FixturePlacement, ctx: FixtureBuild): FixtureView {
    const group = new THREE.Group();
    group.name = `fixture:${place.id}`;
    group.position.set(ctx.at.x, ctx.at.y, ctx.at.z);
    group.rotation.y = fixtureYaw(place.dir);

    // Gebaut wird nach Norden: Die Kante liegt bei `-TILE/2`, der Raum davor
    // ist `+z`. Gedreht wird danach, einmal, mit `fixtureYaw` — vier Fälle
    // einzeln sind irgendwann drei richtige und einer, bei dem die Tür im
    // Rahmen steckt.
    const edge = -TILE / 2;
    const mode = doorMode(place);
    const board = new THREE.MeshStandardMaterial({
      color: 0x4c6a8f,
      roughness: 0.5,
      metalness: 0.25,
    });
    const glass = new THREE.MeshBasicMaterial({ color: LAMP_OFF, toneMapped: false });

    const leaves: DoorLeaf[] = [];
    if (mode === 'swing') {
      const half = PLAN_DOOR_W / 2;
      for (const side of [-1, 1]) {
        // Ein Scharnier ist eine Gruppe am Rahmen und keine Rechnung im Bild:
        // Wer den Flügel um seine eigene Mitte drehte und danach zurückschöbe,
        // schriebe dieselbe Verschiebung ein zweites Mal auf.
        const pivot = new THREE.Group();
        pivot.position.set(side * half, 0, edge);
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(half, PLAN_DOOR_H, PLAN_LEAF_T), board);
        mesh.position.set((-side * half) / 2, PLAN_DOOR_H / 2, 0);
        pivot.add(mesh);
        group.add(pivot);
        leaves.push({ mesh, home: mesh.position.x, side, pivot });
      }
    } else {
      // **Zwei Halbflügel, die zur Seite auseinanderfahren**, und nicht ein
      // ganzer, der nach links verschwindet. Der Grund ist eine Kachel breit:
      // Ein ganzes Blatt (1,2 m) müsste 1,2 m zur Seite, träte damit über die
      // Kachelkante und stünde in der **Nachbartür** — und in einer Wand mit
      // drei Türen nebeneinander ist die Nachbartür genau das, was daneben
      // liegt. Zwei Halbe fahren je 0,62 m und bleiben beide im Pfosten ihrer
      // eigenen Kachel.
      const half = PLAN_DOOR_W / 2;
      for (const side of [-1, 1]) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(half, PLAN_DOOR_H, PLAN_LEAF_T), board);
        mesh.position.set((side * half) / 2, PLAN_DOOR_H / 2, edge);
        group.add(mesh);
        leaves.push({ mesh, home: mesh.position.x, side });
      }

      // Die Schiene über der Öffnung — ohne sie schweben die Blätter.
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(TILE - 0.1, 0.09, 0.14),
        ctx.material('steel'),
      );
      rail.position.set(0, PLAN_DOOR_H + 0.07, edge);
      group.add(rail);
    }

    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 10), glass);
    lamp.position.set(0, PLAN_DOOR_H + 0.3, edge + 0.2);
    group.add(lamp);

    ctx.group.add(group);

    const view: DoorView = {
      object: group,
      leaves,
      lamp,
      solids: [blocker(place, ctx)],
      // Anfassen ja, anschießen nein: Eine Kugel, die an einer Tür hängen
      // bliebe, wäre eine, die den Knopf daneben nie erreicht.
      use: { radius: 1, shot: 0 },
      dispose: () => {
        board.dispose();
        glass.dispose();
      },
    };
    return view;
  },

  apply(view: FixtureView, state: DoorState): void {
    const one = view as DoorView;
    const open = state.open;
    for (const leaf of one.leaves) {
      if (leaf.pivot) leaf.pivot.rotation.y = leaf.side * swingAngle(open, SWING_MAX);
      else leaf.mesh.position.x = leaf.home + leaf.side * slideOffset(open, SLIDE_TRAVEL);
    }
    const moving = open > 0.001 && open < 0.999;
    one.lamp.material.color.setHex(moving ? LAMP_MOVING : passable(state) ? LAMP_ON : LAMP_OFF);
  },
};

/**
 * **Der Quader, der aufhält, solange sie zu ist** — in Weltmetern, denn so
 * werden Quader gebaut (`GridWorld.setFixtureSolid`).
 *
 * Er liegt genau dort, wo das geschlossene Blatt steht, und trägt den Namen der
 * Tür: Daran erkennt die Welt, dass sein Bild woandersher kommt, und baut ihn
 * unsichtbar. Sichtbar stünde er zweimal da — einmal starr, einmal fahrend.
 */
function blocker(place: FixturePlacement, ctx: FixtureBuild): PlanSolid {
  const alongX = place.dir === DIR_N || place.dir === DIR_S;
  const solid = slab(
    ctx.at.x + dirX(place.dir) * (TILE / 2),
    ctx.at.y + PLAN_DOOR_H / 2,
    ctx.at.z + dirZ(place.dir) * (TILE / 2),
    alongX,
    PLAN_DOOR_W,
    PLAN_DOOR_H,
    PLAN_LEAF_T,
    'door',
  );
  solid.door = place.id;
  return solid;
}
