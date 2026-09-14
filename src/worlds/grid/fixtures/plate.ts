import * as THREE from 'three';
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

interface PlateView extends FixtureView {
  disc: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>;
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
      // Am Boden gibt es nichts zu treffen: Eine Kugel, die auf einer
      // Druckplatte endete, wäre eine, die im Vorbeifliegen die Tür aufmacht.
      use: { radius: PLATE_R, shot: 0 },
      dispose: () => paint.dispose(),
    };
    return view;
  },

  apply(view: FixtureView, state: PlateState): void {
    const one = view as PlateView;
    one.disc.position.y = REST - (state.down ? DROP : 0);
    one.disc.material.emissive.setHex(state.down ? HOT : DARK);
  },
};
