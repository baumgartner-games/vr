import * as THREE from 'three';
import { TILE } from '../../nav/navTile';
import {
  GATE_FACES,
  GATE_WIDTH,
  buildGate,
  gateFloorSign,
  layFlatNorthUp,
  spinGate,
  type Gate,
} from '../../hub/gate';
import {
  fixtureYaw,
  goto,
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
 * **Das Tor** — die Kachel, auf der man steht, um woanders zu sein.
 *
 * Es ist der Einbau, wegen dem der Hub auf das Gitter gezogen ist (E7): Vorher
 * war ein Tor ein Möbel in `HubWorld`, an dem ein Zeiger hing, und es gab es
 * genau dort. Jetzt ist es eine Art wie jede andere — eine Kachel, eine
 * Blickrichtung, drei Eigenschaften —, und jede Gitterwelt setzt sich mit
 * **einer Zeile** ein Rücktor neben den Startpunkt:
 *
 * ```ts
 * plan.putFixture({ kind: 'gate', x: 3, z: 8, dir: DIR_S, props: { world: 'hub', label: '→ Hub' } });
 * ```
 *
 * **Es hält niemanden auf** (`solid` ist falsch). Ein Tor, das seine Kachel
 * blockiert, ist eines, gegen das man läuft statt hindurch — und es soll ja
 * genau das Gegenteil sein.
 *
 * **Betreten und nicht benutzen**, und das ist die Entscheidung, die man in
 * der Brille merkt: Wer auf die Kachel tritt und **kurz stehen bleibt**, geht
 * hinüber. Kein Knopf, kein Zielen, keine Hand — das Tor im Hub war immer der
 * Weg für die, die nicht wussten, dass es ein Handgelenkmenü gibt. Benutzt
 * (`A`, P2) oder von einem anderen Einbau ausgelöst geht es trotzdem sofort:
 * Wer davorsteht und drückt, hat sich entschieden.
 *
 * Zwei Zahlen hängen daran, und beide sind gegen denselben Ärger:
 *
 * - **Stehen, nicht vorbeigehen** (`GATE_DWELL`). Ohne die Wartezeit reißt es
 *   einen aus der Welt, weil man im Gang die falsche Linie gelaufen ist.
 * - **Nicht sofort wieder zurück** (`GATE_ARM`). Man kommt in einer Welt an,
 *   neben dem Startpunkt steht ihr Rücktor, und das erste Bild der neuen Welt
 *   schickte einen zurück. Deshalb ist jedes frisch gebaute Tor eine Sekunde
 *   lang taub. Die zweite Hälfte derselben Regel steht im Grundriss: **Der
 *   Startpunkt liegt nie auf einer Torkachel** (`hub/hubGrid.ts`).
 */

/**
 * Wie lange man auf der Kachel stehen muss, in Sekunden.
 *
 * Kurz genug, dass es sich nicht nach Warten anfühlt, lang genug, dass ein
 * Schritt quer über die Kachel nichts auslöst — vier Zehntel sind rund eine
 * Schrittlänge bei normalem Gehtempo.
 */
export const GATE_DWELL = 0.4;

/**
 * Wie lange ein frisch gebautes Tor taub bleibt, in Sekunden.
 *
 * Eine ganze Sekunde, und nicht knapper: Wer in einer Welt ankommt, braucht
 * einen Augenblick, um sich umzusehen, bevor er weggeht — und das Rücktor
 * steht mit Absicht in Sichtweite des Startpunkts.
 */
export const GATE_ARM = 1;

export interface GateState {
  /** Wie lange es noch taub ist. */
  arm: number;
  /** Wie lange schon jemand darauf steht. */
  dwell: number;
  /** Ob es ausgelöst hat — danach ist Schluss, die Welt wechselt ohnehin. */
  fired: boolean;
  /** Seine eigene Uhr, für den Wirbel in der Scheibe. */
  time: number;
}

/** In welche Welt dieses Tor führt (`worlds/index.ts`). */
export function gateWorld(place: FixturePlacement): string {
  return propText(place.props, 'world');
}

/** Was auf seinem Schild steht. */
export function gateLabel(place: FixturePlacement): string {
  return propText(place.props, 'label', 'Tor');
}

/**
 * Das Bild dazu: das Tor selbst, die flache Tafel auf dem Podest — und die
 * Nummer, damit nicht alle Ringe im Gleichschritt drehen.
 */
interface GateView extends FixtureView {
  gate: Gate;
  floor: THREE.Object3D & { dispose(): void };
  index: number;
}

export const GATE: FixtureKind<GateState> = {
  kind: 'gate',
  label: 'Tor',
  accent: 0x4aa8ff,
  // Frei auf der Kachel und nicht an der Kante: Man steht **darauf**, und was
  // an einer Kante klebt, steht zwischen zwei Kacheln.
  edge: false,

  init(): GateState {
    return { arm: GATE_ARM, dwell: 0, fired: false, time: 0 };
  },

  step(state: GateState, place: FixturePlacement, input: FixtureInput, dt: number): FixtureEvent[] {
    state.time += dt;
    if (state.fired) return [];
    if (state.arm > 0) {
      state.arm = Math.max(0, state.arm - dt);
      // Wer beim Ankommen schon daraufsteht, fängt bei null an — sonst wäre
      // die Sperre nur eine Verzögerung und keine.
      state.dwell = 0;
      return [];
    }

    // **Nur der Spieler**, nicht das Gewicht auf der Kachel: Eine Kiste, die
    // jemand auf ein Tor schiebt, soll ihn nicht in eine andere Welt schicken.
    state.dwell = input.playerOn ? state.dwell + dt : 0;
    const now = input.used || input.triggered || state.dwell >= GATE_DWELL;
    if (!now) return [];

    state.fired = true;
    const world = gateWorld(place);
    // Ein Tor ohne Welt ist ein Fehler im Grundriss, und zwar einer, den man
    // hört: einmal, und danach steht es still.
    if (!world) return [sound('empty')];
    return [sound('pop'), goto(world)];
  },

  solid(): boolean {
    return false;
  },

  build(place: FixturePlacement, ctx: FixtureBuild): FixtureView {
    // Eine halbe Umdrehung mehr als die Gitterregel: Ein Tor schaut nach +Z
    // und nicht nach Norden (`hub/gate.ts`). Ohne sie steht jedes Tor mit dem
    // Rücken zu dem, der davorsteht — man sähe Ring und Scheibe und kein
    // einziges Schild.
    const yaw = fixtureYaw(place.dir) + GATE_FACES;
    const accent = propNumber(place.props, 'accent', GATE.accent);
    const label = gateLabel(place);
    const gate = buildGate(label, propText(place.props, 'note'), accent);
    gate.worldId = gateWorld(place);

    const group = gate.group;
    group.name = `fixture:${place.id}`;
    group.position.set(ctx.at.x, ctx.at.y, ctx.at.z);
    group.rotation.y = yaw;
    // **Das Tor ist drei Meter breit, eine Kachel zweieinhalb.** Auf dem
    // Gitter steht es deshalb ein Sechstel kleiner: Sonst ragte sein Sockel in
    // die Nachbarkachel und, im Gang, in die Wand dahinter. Kleiner machen und
    // nicht neu bauen, damit die Werkzeugseite dasselbe Tor zeigt wie das
    // Spiel — dort steht es frei und darf seine volle Größe haben.
    group.scale.setScalar(TILE / GATE_WIDTH);

    // Die flache Tafel liegt vorn auf dem Podest und liest nach Norden oben,
    // egal wohin das Tor schaut — das ist die Ansicht _Von oben_.
    const floor = gateFloorSign(label, accent);
    floor.position.set(0, 0.17, 0.55);
    layFlatNorthUp(floor, yaw);
    group.add(floor);

    ctx.group.add(group);
    const view: GateView = {
      object: group,
      gate,
      floor,
      // Aus der Kachel und nicht aus einem Zähler: Zwei Tore nebeneinander
      // sollen verschieden wirbeln, und dieselbe Welt soll das jedes Mal
      // gleich tun.
      index: Math.abs(place.x + place.z) % 2,
      dispose: () => {
        gate.sign.dispose();
        floor.dispose();
      },
    };
    return view;
  },

  apply(view: FixtureView, state: GateState): void {
    const one = view as GateView;
    spinGate(one.gate, state.time, one.index);
  },
};
