import * as THREE from 'three';
import { TILE } from '../../nav/navTile';
import {
  fixtureYaw,
  propFlag,
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
 * **Der Hebel** — der Schalter, der *rastet*.
 *
 * Der Unterschied zum Knopf ist kein Aussehen, sondern eine Zusage: Ein Knopf
 * löst aus und kommt zurück, ein Hebel **bleibt liegen**. Man sieht ihm über
 * den halben Platz hinweg an, ob das Licht an ist und ob die Flügeltür offen
 * steht, und genau das ist der Grund, warum es beide gibt. Im Labor steht
 * derselbe Hebel neben der Drehtür; hier ist er zusätzlich der Kippschalter an
 * der Straße, denn ein Kippschalter *ist* ein kleiner Hebel.
 *
 * **Seine Stellung ist der Zustand, nicht das Bild.** `apply` legt den Bügel
 * dorthin, wo `state.on` ihn haben will — wer die Stellung im Bild führte,
 * hätte nach dem ersten Umbau der Welt einen Hebel, der oben steht und eine
 * Tür, die zu ist.
 */

export interface LeverState {
  /** Umgelegt oder nicht. */
  on: boolean;
}

/** Wie weit der Bügel in beide Richtungen kippt. */
const TILT = 0.55;

/** Wie hoch er steht — klein und rund, damit er von oben ein Punkt und kein Möbel ist. */
const COLUMN_H = 0.9;

/** Wie weit der Sockel von der Kante weg in die Kachel hineinrückt. */
const STANDOFF = 0.55;

interface LeverView extends FixtureView {
  arm: THREE.Group;
}

export const LEVER: FixtureKind<LeverState> = {
  kind: 'lever',
  label: 'Hebel',
  accent: 0xff5a4a,
  // An eine Kante: Ein Kippschalter gehört an eine Wand, und ein Hebel vor
  // eine Tür — beides ist eine Kante und keine Kachelmitte.
  edge: true,

  init(place: FixturePlacement): LeverState {
    return { on: propFlag(place.props, 'on', false) };
  },

  solid(): boolean {
    return false;
  },

  step(state: LeverState, place: FixturePlacement, input: FixtureInput): FixtureEvent[] {
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

    // Gebaut nach Norden, wie jeder Einbau: Der Sockel steht nahe der Kante,
    // der Bügel kippt in den Raum davor. Eine halbe Armlänge Abstand zur Kante,
    // und nicht weniger — vor einer Tür ist die Kante der Türrahmen, und ein
    // Hebel, der darin klemmt, sieht aus wie ein Fehler.
    const edge = -TILE / 2 + STANDOFF;
    const steel = ctx.material('steel');

    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.17, COLUMN_H, 16), steel);
    column.position.set(0, COLUMN_H / 2, edge);
    group.add(column);

    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.14, 18), steel);
    head.position.set(0, COLUMN_H + 0.07, edge);
    group.add(head);

    // Der Bügel hängt in einer eigenen Gruppe über dem Kopf: Kippen ist dann
    // eine Drehung und keine Rechnerei mit Sinus je Bild.
    const arm = new THREE.Group();
    arm.position.set(0, COLUMN_H + 0.1, edge);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.42, 10), steel);
    bar.position.y = 0.21;
    arm.add(bar);
    // Ein beleuchtetes Material und kein leuchtendes: Den schwarzen Umriss
    // (`core/outlineShell.ts`) bekommt nur, was Licht annimmt, und ohne ihn ist
    // der Knauf von oben ein roter Fleck auf grauem Grund.
    const paint = new THREE.MeshStandardMaterial({ color: 0xff5a4a, roughness: 0.4 });
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), paint);
    knob.position.y = 0.42;
    arm.add(knob);
    group.add(arm);

    ctx.group.add(group);

    const view: LeverView = {
      object: group,
      arm,
      // **Angefasst wird der Sockel und nicht der Knauf.** Der Knauf wandert
      // beim Umlegen zwanzig Zentimeter durch die Gegend, und ein Ziel, das
      // sich mit seinem eigenen Zustand verschiebt, ist eines, das man nach dem
      // ersten Umlegen nicht mehr erwischt. Der Sockel steht.
      handle: column,
      // Großzügig zu bedienen, knapp zu treffen: Der Sockel steht am Rand der
      // Kachel, und wer mitten darauf steht, soll ihn erreichen.
      use: { radius: 0.7, shot: 0.25, half: 0.8 },
      dispose: () => paint.dispose(),
    };
    return view;
  },

  apply(view: FixtureView, state: LeverState): void {
    (view as LeverView).arm.rotation.x = state.on ? TILT : -TILT;
  },
};
