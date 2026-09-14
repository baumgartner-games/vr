import * as THREE from 'three';
import { TILE } from '../../nav/navTile';
import { buildRedButton, type RedButton } from '../../shared/redButton';
import {
  effect,
  fixtureYaw,
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
 * **Der große rote Knopf** — derselbe wie im Effektlabor und im
 * Interaktionslabor (`shared/redButton.ts`), jetzt auf einer Kachel.
 *
 * Er ist das ehrlichste Bedienelement, das eine Welt hat: Er steht da, man
 * sieht ihn von weitem, man drückt ihn, und es passiert genau eine Sache — er
 * schaltet, worauf sein `target` zeigt. Was das ist, weiß er nicht; er meldet
 * `trigger`, und `GridWorld` stellt zu. Genau deshalb passt derselbe Knopf vor
 * eine Schiebetür, vor eine Effektquelle und vor ein Tor.
 *
 * **Zwei Wege hinein, und beide zählen gleich** (Portal-Regel): `used` ist die
 * Figur, die davorsteht und `A` drückt — in der Brille die Hand —, `hit` ist
 * die Kugel. Was man drücken kann, kann man auch treffen; im Labor steht die
 * Vorlage dafür, hier steht die Wiederholung, und beide gehen durch dieselbe
 * Zeile.
 *
 * **Der Nachlauf ist kein Schmuck.** Solange der Knopf unten ist, nimmt er
 * nichts an. Ohne das drückte ein Dauerfeuer ihn sechzigmal in der Sekunde,
 * eine rastende Tür stünde danach auf einer zufälligen Seite, und niemand
 * verstünde, warum sie mal aufgeht und mal nicht.
 */

export interface ButtonState {
  /** Sekunden, die er noch unten ist. `0` heißt: bereit. */
  press: number;
}

/** Wie lange er unten bleibt, wenn nichts anderes eingestellt ist. */
const PRESS = 0.35;

/** Und wie tief er dabei eintaucht. */
const DEPTH = 0.035;

/**
 * Wie weit die Säule von der Kante weg in die Kachel hineinrückt.
 *
 * 0,3 m auf einer Kachel von einem Meter: Der Teller der Säule misst 0,6 m,
 * damit steht sie mit ihrer Rückseite genau auf der Kante und ragt nicht
 * darüber hinaus. Weiter herein gerückt stünde sie in der Kachelmitte — also
 * genau dort, wo der steht, der sie drückt.
 */
const STANDOFF = 0.3;

/** Der Nachlauf dieses Knopfes, in Sekunden. */
export function buttonHold(place: FixturePlacement): number {
  return Math.max(0.05, propNumber(place.props, 'hold', PRESS));
}

interface ButtonView extends FixtureView {
  button: RedButton;
  /** Wo die Kuppel liegt, wenn niemand drückt. */
  rest: number;
  hold: number;
}

export const BUTTON: FixtureKind<ButtonState> = {
  kind: 'button',
  label: 'Knopf',
  accent: 0xff3b2f,
  // An eine Kante, und das hat einen sehr handfesten Grund: Ein Knopf in der
  // Kachelmitte ist einer, in dem die Figur **steht**, wenn sie ihn drückt —
  // die Kachel hat einen Meter, und ihre Mitte ist genau der Platz, auf den
  // die Figur tritt. An der Kante steht er *vor* ihr, dort, wo ein Knopf
  // hingehört.
  edge: true,

  init(): ButtonState {
    return { press: 0 };
  },

  // Die Säule steht an der Kante und lässt die halbe Kachel frei: Wer hier
  // einen Quader hinstellte, hätte einen Knopf, um den ein NPC einen Bogen
  // macht und vor den man sich nicht mehr stellen kann.
  solid(): boolean {
    return false;
  },

  step(
    state: ButtonState,
    place: FixturePlacement,
    input: FixtureInput,
    dt: number,
  ): FixtureEvent[] {
    if (state.press > 0) {
      state.press = Math.max(0, state.press - Math.max(0, dt));
      return [];
    }
    if (!input.used && !input.hit && !input.triggered) return [];
    state.press = buttonHold(place);
    const out: FixtureEvent[] = [sound('switch-on')];
    // **Funken, wenn eine Kugel ihn erwischt** — und nur dann: Eine Hand, die
    // einen Knopf drückt, schlägt keine. Die Zahlen dafür stehen in
    // `effects/effectKinds.ts` und nicht hier.
    if (input.hit) out.push(effect('sparks', 0.4));
    const target = propText(place.props, 'target');
    if (target) out.push(trigger(target));
    return out;
  },

  build(place: FixturePlacement, ctx: FixtureBuild): FixtureView {
    const button = buildRedButton({
      title: propText(place.props, 'label', 'Knopf'),
      ...(propText(place.props, 'text') ? { body: propText(place.props, 'text') } : {}),
    });
    const group = new THREE.Group();
    group.name = `fixture:${place.id}`;
    group.position.set(ctx.at.x, ctx.at.y, ctx.at.z);
    // Das Schild des Knopfes steht auf `+z`, und `+z` ist nach dem Drehen die
    // Seite, von der man kommt — dieselbe Regel wie beim Schild.
    group.rotation.y = fixtureYaw(place.dir);
    // Und die Säule steht an der Kante statt in der Mitte: eine Armlänge vor
    // dem, der auf der Kachel steht.
    button.group.position.z = -TILE / 2 + STANDOFF;
    group.add(button.group);
    ctx.group.add(group);

    const view: ButtonView = {
      object: group,
      button,
      rest: button.dome.position.y,
      hold: buttonHold(place),
      // **Angefasst und getroffen wird die Kuppel**, nicht die Gruppe: Ein
      // Halbmesser über den ganzen Knopf samt Schild verschluckte jede Kugel,
      // die in seine Nähe kommt, und zeigte von oben auf die Säule statt auf
      // den roten Punkt darauf.
      handle: button.dome,
      dispose: () => button.dispose(),
    };
    return view;
  },

  /**
   * Die Kuppel steht dort, wo der Zustand sie hinstellt — und nicht dort, wo
   * eine eigene kleine Uhr im Bild sie gerade hätte. Zwei Uhren für dieselbe
   * Bewegung sind eine zu viel.
   */
  apply(view: FixtureView, state: ButtonState): void {
    const one = view as ButtonView;
    one.button.dome.position.y = one.rest - DEPTH * Math.min(1, state.press / one.hold);
  },
};
