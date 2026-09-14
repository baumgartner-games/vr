import * as THREE from 'three';
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
 * **Die Lampe** — ein Punktlicht und ein Leuchtkörper, und ein `trigger`
 * schaltet sie um.
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

interface LampView extends FixtureView {
  light: THREE.PointLight;
  glass: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  colour: number;
}

/** Wie hoch diese Lampe hängt. */
export function lampHeight(place: FixturePlacement): number {
  return Math.max(0.5, propNumber(place.props, 'height', HEIGHT));
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
    const steel = ctx.material('steel');

    // Der Mast steht am Rand der Kachel und der Ausleger trägt die Leuchte in
    // die Mitte: Ein Mast mitten auf der Kachel stünde genau dort, wo man
    // stehen will.
    const foot = -TILE / 2 + 0.35;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, height, 14), steel);
    mast.position.set(0, height / 2, foot);
    group.add(mast);

    const reach = Math.abs(foot) + 0.1;
    const boom = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, reach), steel);
    boom.position.set(0, height - 0.05, foot / 2 + 0.05);
    group.add(boom);

    const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.17, 0.16, 18), steel);
    hood.position.set(0, height - 0.06, 0);
    group.add(hood);

    const bulb = new THREE.MeshBasicMaterial({ color: colour, toneMapped: false });
    const glass = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 18, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
      bulb,
    );
    glass.position.set(0, height - 0.14, 0);
    group.add(glass);

    const light = new THREE.PointLight(colour, POWER, RANGE, 2);
    light.position.set(0, height - 0.2, 0);
    group.add(light);

    ctx.group.add(group);

    const view: LampView = {
      object: group,
      light,
      glass,
      colour,
      // Angefasst wird der Mast am Boden — die Leuchte hängt drei Meter hoch,
      // und dorthin reicht von unten keine Hand.
      handle: mast,
      use: { radius: 0.6, shot: 0 },
      dispose: () => bulb.dispose(),
    };
    return view;
  },

  apply(view: FixtureView, state: LampState): void {
    const one = view as LampView;
    one.light.intensity = state.on ? POWER : 0;
    one.glass.material.color.setHex(state.on ? one.colour : GLASS_OFF);
  },
};
