import * as THREE from 'three';
import { findEffect } from '../../effects/effectKinds';
import {
  EFFECT_LIFT,
  effect,
  fixtureYaw,
  propFlag,
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
 * **Die Effektquelle** — Rauch, Feuer, Funken und Wasser auf einer Kachel.
 *
 * Das Effektlabor (`worlds/effects/`) hat das alles schon: sieben Effekte als
 * Zahlen (`effectKinds.ts`), eine Wolke als Punkthaufen (`Burst.ts`), einen
 * Schieber für die Größe. Was ihm fehlte, war ein Platz in einer Welt, in der
 * man läuft — dort steht der rote Knopf auf einer Bühne, und die Wolke kommt
 * immer an derselben Stelle heraus. Ein Einbau ist genau das: dieselben Zahlen,
 * aber auf einer Kachel, mit einem Knopf davor, den jemand drückt.
 *
 * **Keine neuen Zahlen.** Die Effekte werden importiert und nicht
 * abgeschrieben. Zwei Sorten Rauch in einem Programm sind eine zu viel — man
 * merkt es erst, wenn die eine heller wird und die andere nicht.
 *
 * **Und die Wolke baut er nicht selbst.** `step` meldet ein `effect`-Ereignis,
 * und `GridWorld` lässt es laufen (wie `sound` an `core/Audio` geht). Damit
 * bleibt die ganze Logik hier prüfbar — kein three.js, kein Weltkontext —, und
 * es gibt genau eine Stelle, die weiß, wie viele Wolken gleichzeitig noch
 * vertretbar sind. Vier Emitter in einer Ecke schaffen es sonst schnell, aus
 * Effekten Nebel zu machen.
 *
 * **Zwei Betriebsarten, eine Eigenschaft.** Mit `burst` ist die Quelle ein
 * Einmalschuss: Ein Auslöser, eine Wolke. Ohne ist sie ein Dauerläufer, und der
 * Auslöser **schaltet um** — an, aus, an. Ein Knopf, der eine Nebelmaschine
 * anwirft, und einer, der einmal pafft, sind derselbe Einbau mit einem Haken
 * Unterschied; zwei Arten daraus zu machen hieße, die halbe Datei zu kopieren.
 */

export interface EmitterState {
  /** Ob sie gerade läuft (nur im Dauerbetrieb). */
  on: boolean;
  /** Sekunden bis zur nächsten Wolke. */
  wait: number;
  /** Wie viele Wolken bisher — der Vergleich fürs Bild (`apply`). */
  shots: number;
}

/** Welcher Effekt hier herauskommt (`effects/effectKinds.ts`). */
export function emitterEffect(place: FixturePlacement): string {
  return findEffect(propText(place.props, 'effect', 'smoke')).id;
}

/** Wie groß — derselbe Faktor wie der Schieber im Effektlabor. */
export function emitterSize(place: FixturePlacement): number {
  return propNumber(place.props, 'size', 1);
}

/** Ob ein Auslöser eine einzelne Wolke macht statt an- und auszuschalten. */
export function emitterOnce(place: FixturePlacement): boolean {
  return propFlag(place.props, 'burst', false);
}

/**
 * **Wie oft eine laufende Quelle pufft**, in Sekunden.
 *
 * Aus der Lebensdauer des Effekts und nicht aus einer eigenen Zahl: Rauch
 * steht dreieinhalb Sekunden und braucht keinen Nachschub im Halbsekundentakt,
 * Funken sind nach einer Sekunde weg und sähen bei demselben Takt aus wie ein
 * Wackelkontakt. Die halbe Lebensdauer heißt: Es ist immer eine Wolke da, und
 * nie mehr als zwei.
 */
export function emitterPeriod(place: FixturePlacement): number {
  return Math.max(0.4, findEffect(emitterEffect(place)).life * 0.5);
}

/** Das Bild: Sockel, Düse und ein Auge in der Farbe des Effekts. */
interface EmitterView extends FixtureView {
  eye: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  /** Wie viele Wolken schon im Bild waren — für das Aufblitzen beim Schuss. */
  shown: number;
  /** Wie hell das Auge gerade ist; es fällt nach jedem Schuss zurück. */
  glow: number;
}

/** Wie breit der Sockel ist und wie hoch die Düse steht. */
const BASE_R = 0.34;
const BASE_H = 0.22;
const EYE_R = 0.11;

export const EMITTER: FixtureKind<EmitterState> = {
  kind: 'emitter',
  label: 'Effektquelle',
  accent: 0xff8a2f,
  // Sie steht frei auf der Kachel und nicht an einer Kante: Eine Fontäne an
  // der Wand ist ein Rohrbruch.
  edge: false,
  cost: 1,

  init(place: FixturePlacement): EmitterState {
    // `wait: 0` heißt: Wer mit `on` anfängt, pufft im ersten Bild und nicht
    // erst nach einer Wartezeit, die niemand angefordert hat.
    return { on: propFlag(place.props, 'on', false), wait: 0, shots: 0 };
  },

  step(
    state: EmitterState,
    place: FixturePlacement,
    input: FixtureInput,
    dt: number,
  ): FixtureEvent[] {
    const out: FixtureEvent[] = [];
    const poked = input.used || input.hit || input.triggered;
    let fire = false;
    if (poked) {
      if (emitterOnce(place)) {
        fire = true;
        out.push(sound('pop'));
      } else {
        state.on = !state.on;
        fire = state.on;
        out.push(sound(state.on ? 'switch-on' : 'switch-off'));
      }
    }
    if (state.on) {
      state.wait -= dt;
      if (state.wait <= 0) fire = true;
    }
    if (!fire) return out;
    state.shots++;
    state.wait = emitterPeriod(place);
    out.push(effect(emitterEffect(place), emitterSize(place)));
    return out;
  },

  // Eine Düse im Boden hält niemanden auf — man läuft darüber, und das soll
  // man auch: Der Effekt ist der Punkt, nicht das Hindernis.
  solid(): boolean {
    return false;
  },

  build(place: FixturePlacement, ctx: FixtureBuild): FixtureView {
    const group = new THREE.Group();
    group.name = `fixture:${place.id}`;
    group.position.set(ctx.at.x, ctx.at.y, ctx.at.z);
    group.rotation.y = fixtureYaw(place.dir);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(BASE_R, BASE_R + 0.06, BASE_H, 12),
      ctx.material('steel'),
    );
    base.position.y = BASE_H / 2;
    group.add(base);

    const pipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.16, EFFECT_LIFT - BASE_H, 10),
      ctx.material('steel'),
    );
    pipe.position.y = (EFFECT_LIFT + BASE_H) / 2;
    group.add(pipe);

    // **Das Auge trägt die Farbe seines Effekts.** Vier gleiche Düsen in einer
    // Ecke sind vier Rätsel; vier verschiedenfarbige sagen von oben auf einen
    // Blick, welche die Wasserfontäne ist. Die Farbe kommt aus derselben
    // Liste wie die Wolke (`effectKinds.from`) und nicht aus einer zweiten.
    const tone = findEffect(emitterEffect(place)).from;
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(EYE_R, 12, 8),
      new THREE.MeshBasicMaterial({ color: tone, toneMapped: false }),
    );
    eye.position.y = EFFECT_LIFT;
    group.add(eye);

    ctx.group.add(group);
    const view: EmitterView = {
      object: group,
      eye,
      shown: 0,
      glow: 0,
      dispose: () => {
        eye.material.dispose();
      },
    };
    return view;
  },

  /**
   * **Jede Wolke lässt das Auge kurz aufgehen.**
   *
   * Ohne das stünde bei einer Quelle, die gerade nicht pufft, nichts zu sehen
   * — und wer den Knopf drückt und nichts blinken sieht, drückt ein zweites
   * Mal. Abgeklungen wird hier und nicht im Zustand: Das ist Bild und keine
   * Logik, und ein Test soll darüber nicht stolpern.
   */
  apply(view: FixtureView, state: EmitterState): void {
    const one = view as EmitterView;
    if (one.shown !== state.shots) {
      one.shown = state.shots;
      one.glow = 1;
    }
    one.glow = Math.max(state.on ? 0.45 : 0, one.glow - 0.06);
    const scale = 0.7 + one.glow * 0.8;
    one.eye.scale.setScalar(scale);
    one.eye.material.opacity = 0.35 + one.glow * 0.65;
    one.eye.material.transparent = true;
  },
};
