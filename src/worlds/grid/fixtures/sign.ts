import * as THREE from 'three';
import { TextPlane } from '../../../ui/TextPlane';
import { TILE } from '../../nav/navTile';
import {
  fixtureYaw,
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
 * **Das Schild** — der erste Einbau, und mit Absicht der kleinste.
 *
 * Es hält eine Zeile Text an einer Wand, und wer davor steht und `A` drückt,
 * liest sie am Handgelenk. Mehr tut es nicht, und das ist der Zweck: Es ist
 * der Beweis, dass die Schleife rund läuft — Palette, Kachel, Datei, Bau,
 * `use`, Meldung —, bevor Türen, Knöpfe und Tore darauf gesetzt werden (P4,
 * P6, P7). Eine Registry, deren erstes Kind schon fünf Zustände hat, ist eine,
 * bei der man beim ersten Fehler nicht weiß, ob die Art oder die Registry
 * schuld ist.
 *
 * Seine ganze Logik sind zwei Zeilen: Wer es benutzt, hat es einmal mehr
 * gelesen. Dass daraus eine Meldung wird, passiert im Bild (`apply`) und nicht
 * im Zustand — ein `notify` in `step` wäre genau die Verdrahtung mit der Welt,
 * die den Rest hier unprüfbar machte.
 */

export interface SignState {
  /** Wie oft es gelesen wurde. Eine Zahl und kein Schalter: Zweimal lesen ist zweimal lesen. */
  reads: number;
}

/** Was auf dem Schild steht. */
export function signText(place: FixturePlacement): string {
  return propText(place.props, 'text', 'Schild');
}

/** Das Bild dazu — ein Pfosten, ein Brett, und das Brett kann Text. */
interface SignView extends FixtureView {
  board: TextPlane;
  notify(message: string): void;
  text: string;
  /** Wie oft die Meldung schon draußen war — der Vergleich mit `reads`. */
  shown: number;
}

/** Wie hoch das Brett hängt und wie breit es ist. */
const POST_H = 1.35;
const BOARD_W = TILE * 0.62;

export const SIGN: FixtureKind<SignState> = {
  kind: 'sign',
  label: 'Schild',
  accent: 0xe4c56a,
  // An die Kante, wie ein Regal: Ein Schild mitten auf einer Kachel ist ein
  // Schild, um das man herumläuft.
  edge: true,
  cost: 1,

  init(): SignState {
    return { reads: 0 };
  },

  step(state: SignState, _place: FixturePlacement, input: FixtureInput): FixtureEvent[] {
    if (!input.used && !input.triggered) return [];
    state.reads++;
    return [sound('pick')];
  },

  // Ein Schild hält niemanden auf — es hängt an der Wand, die das schon tut.
  solid(): boolean {
    return false;
  },

  build(place: FixturePlacement, ctx: FixtureBuild): FixtureView {
    const group = new THREE.Group();
    group.name = `fixture:${place.id}`;
    group.position.set(ctx.at.x, ctx.at.y, ctx.at.z);
    group.rotation.y = fixtureYaw(place.dir);

    // Gebaut wird nach Norden: Der Pfosten steht an der Nordkante, das Brett
    // schaut nach Süden in den Raum.
    const edge = -TILE / 2 + 0.16;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, POST_H, 0.08), ctx.material('steel'));
    post.position.set(0, POST_H / 2, edge);
    group.add(post);

    const text = signText(place);
    const board = new TextPlane({
      width: BOARD_W,
      height: BOARD_W * 0.42,
      title: text,
      align: 'center',
      accent: SIGN.accent,
    });
    board.position.set(0, POST_H + BOARD_W * 0.21, edge + 0.05);
    group.add(board);

    ctx.group.add(group);
    const view: SignView = {
      object: group,
      board,
      text,
      shown: 0,
      notify: (message: string) => ctx.notify(message),
      dispose: () => board.dispose(),
    };
    return view;
  },

  apply(view: FixtureView, state: SignState): void {
    const one = view as SignView;
    if (one.shown === state.reads) return;
    one.shown = state.reads;
    one.notify(one.text);
  },
};
