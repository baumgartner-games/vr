import * as THREE from 'three';
import { TextPlane } from '../../../ui/TextPlane';
import { TILE } from '../../nav/navTile';
import { signSummary } from '../../signs/signMarkup';
import {
  fixtureYaw,
  propFlag,
  propText,
  read,
  sound,
  type FixtureBuild,
  type FixtureEvent,
  type FixtureInput,
  type FixtureKind,
  type FixturePlacement,
  type FixtureView,
} from './index';

/**
 * **Das Schild** — der erste Einbau, und lange der kleinste.
 *
 * Es hält Text an einer Wand, und wer davorsteht und `A` drückt, **schlägt ihn
 * auf**: als Seite im Menü, mit Markdown, so lange man will (`signRows.ts`,
 * `GridWorld.readAloud`). Das ist die eine Sache, die sich hier geändert hat,
 * und sie kam als Beschwerde: Bis dahin war die Zeile eine **Meldung** am
 * Handgelenk — vier Sekunden, dann weg. Damit passte auf ein Schild genau ein
 * Satz, und ein Wegweiser mit drei Zielen, eine Hausordnung oder die Regeln
 * eines Spiels passten gar nicht.
 *
 * **Und die Tafel sieht die Kamera an**, aus der gerade gezeichnet wird
 * (`ui/billboard.faceCamera`) — der Pfosten bleibt, wo er steht. Sie stand
 * zuerst nach der Richtung, in der sie gesetzt wurde, und das ist genau die
 * falsche Regel für die Ansicht, in der hier gespielt wird: Von schräg oben
 * ist eine Tafel, die nach Süden schaut, ein Strich. Danach drehte sie sich
 * zum **Kopf des Spielers**, und das war nur fast richtig: In der Ansicht von
 * oben steht die Kamera woanders als der Kopf, also drehte sich jedes Schild
 * mit der Figur mit statt zum Bild — wer sich einmal um sich selbst drehte,
 * sah seinen Wegweiser einmal um sich selbst kippen. Ausgerichtet wird
 * deshalb beim **Zeichnen**, je Kamera: von oben zur Kamera von oben, samt
 * ihrer Neigung, in der Brille zum Auge.
 *
 * Seine ganze Logik sind weiterhin zwei Zeilen: Wer es benutzt, hat es einmal
 * mehr gelesen. Dass daraus eine Seite wird, passiert im Bild (`apply`) und
 * nicht im Zustand — ein Aufruf ins Menü aus `step` heraus wäre genau die
 * Verdrahtung mit der Welt, die den Rest hier unprüfbar machte.
 */

export interface SignState {
  /** Wie oft es gelesen wurde. Eine Zahl und kein Schalter: Zweimal lesen ist zweimal lesen. */
  reads: number;
}

/** Was auf dem Schild steht. */
export function signText(place: FixturePlacement): string {
  return propText(place.props, 'text', 'Schild');
}

/**
 * Ob sein Text als Markdown gelesen wird.
 *
 * An, solange niemand widerspricht: Ein Schild mit einer Zeile sieht so aus
 * wie vorher, und eines mit einer Überschrift bekommt eine. Wer eine Liste von
 * Namen mit `*` davor aufschreibt, will Sternchen und setzt `markdown` auf
 * `false` (dieselbe Frage wie in `worlds/signs/signSettings.ts`).
 */
export function signMarkdown(place: FixturePlacement): boolean {
  return propFlag(place.props, 'markdown', true);
}

/** Das Bild dazu — ein Pfosten, ein Brett, und das Brett kann Text. */
interface SignView extends FixtureView {
  board: TextPlane;
}

/** Wie hoch das Brett hängt und wie breit es ist. */
const POST_H = 1.35;
// Fast die ganze Kachel breit: Auf 2,5 m waren 62 % davon ein stattliches
// Brett, auf einem Meter wären dieselben 62 % ein Schildchen, das man nicht
// mehr liest.
const BOARD_W = TILE * 0.9;

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

  /**
   * Benutzt heißt gelesen — und gelesen heißt: Der Aushang geht auf.
   *
   * Beide Ereignisse zusammen, und beide aus reiner Rechnung: Was auf dem
   * Schild steht, steht in seinen Eigenschaften, und wie daraus eine Seite
   * wird, ist die Sache dessen, der sie aufschlägt (`GridWorld.readAloud`).
   */
  step(state: SignState, place: FixturePlacement, input: FixtureInput): FixtureEvent[] {
    if (!input.used && !input.triggered) return [];
    state.reads++;
    const text = signText(place);
    return [sound('pick'), read(signSummary(text, 48) || 'Schild', text, signMarkdown(place))];
  },

  // Ein Schild hält niemanden auf — es hängt an der Wand, die das schon tut.
  solid(): boolean {
    return false;
  },

  build(place: FixturePlacement, ctx: FixtureBuild): FixtureView {
    const group = new THREE.Group();
    group.name = `fixture:${place.id}`;
    group.position.set(ctx.at.x, ctx.at.y, ctx.at.z);
    const yaw = fixtureYaw(place.dir);
    group.rotation.y = yaw;

    // Gebaut wird nach Norden: Der Pfosten steht an der Nordkante, das Brett
    // schaut nach Süden in den Raum.
    const edge = -TILE / 2 + 0.16;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, POST_H, 0.08), ctx.material('steel'));
    post.position.set(0, POST_H / 2, edge);
    group.add(post);

    // **Auf der Tafel steht die erste Zeile**, nicht der ganze Aushang: Sie ist
    // ein Wegweiser und keine Wand voller Text — was mehr ist als eine Zeile,
    // liest man aufgeschlagen (`signRows.ts`).
    const text = signText(place);
    const board = new TextPlane({
      width: BOARD_W,
      height: BOARD_W * 0.42,
      title: signSummary(text, 48) || 'Schild',
      align: 'center',
      accent: SIGN.accent,
      // Die eine Zeile, die aus dem Pfosten einen Wegweiser macht: Die Tafel
      // sieht die Kamera an, aus der gezeichnet wird — von oben also die
      // Kamera von oben, und weil sie sich dabei auch zurücklehnt, liest man
      // sie dort ganz statt als Strich.
      face: true,
    });
    const lift = POST_H + BOARD_W * 0.21;
    board.position.set(0, lift, edge + 0.05);
    group.add(board);

    ctx.group.add(group);
    const view: SignView = {
      object: group,
      board,
      dispose: () => board.dispose(),
    };
    return view;
  },

  /**
   * **Nichts.** Ein Schild hat kein Bild, das sich mit seinem Zustand ändert:
   * Was es sagt, sagt es beim Lesen, und das ist ein Ereignis (`step`). Die
   * eine Bewegung, die es macht, ist die Drehung zur Kamera, und die hängt an
   * der Tafel selbst und nicht am Zustand (`ui/billboard.faceCamera`).
   */
  apply(): void {},
};
