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
  type FixtureSpot,
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
 * **Und die Tafel dreht sich zum Spieler.** Sie stand nach der Richtung, in
 * der sie gesetzt wurde, und das ist genau die falsche Regel für die Ansicht,
 * in der hier gespielt wird: Von schräg oben ist eine Tafel, die nach Süden
 * schaut, ein Strich. Jetzt schaut sie dorthin, wo der Kopf ist
 * (`FixtureView.face`) — der Pfosten bleibt, wo er steht.
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
  /** Wo die Tafel in der Welt hängt — sie dreht sich um diesen Punkt. */
  at: THREE.Vector3;
  /** Wie weit ihre Gruppe schon gedreht ist; die Tafel dreht dagegen. */
  yaw: number;
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
    });
    const lift = POST_H + BOARD_W * 0.21;
    board.position.set(0, lift, edge + 0.05);
    group.add(board);

    ctx.group.add(group);
    const at = new THREE.Vector3(ctx.at.x, ctx.at.y + lift, ctx.at.z);
    // Die Tafel hängt am Pfosten und nicht in der Kachelmitte; ohne diesen
    // Versatz drehte sie sich um einen Punkt, an dem sie gar nicht steht.
    at.x += Math.sin(yaw) * edge;
    at.z += Math.cos(yaw) * edge;
    const view: SignView = {
      object: group,
      board,
      at,
      yaw,
      face: (head: FixtureSpot) => faceViewer(board, at, yaw, head),
      dispose: () => board.dispose(),
    };
    return view;
  },

  /**
   * **Nichts.** Ein Schild hat kein Bild, das sich mit seinem Zustand ändert:
   * Was es sagt, sagt es beim Lesen, und das ist ein Ereignis (`step`). Die
   * eine Bewegung, die es macht, ist die Drehung zum Betrachter, und die hängt
   * am Kopf des Spielers und nicht am Zustand (`FixtureView.face`).
   */
  apply(): void {},
};

/**
 * **Die Tafel dreht sich zum Kopf** — um die Hochachse und sonst nirgendwohin.
 *
 * Nur um y: Eine Tafel, die sich auch nach oben neigt, kippt von oben gesehen
 * flach auf den Boden, und das ist genau die Ansicht, für die das hier gemacht
 * ist. Gerechnet wird gegen die Drehung ihrer Gruppe, damit ein Schild an der
 * Ostwand nicht um neunzig Grad danebensteht.
 */
function faceViewer(
  board: THREE.Object3D,
  at: THREE.Vector3,
  yaw: number,
  head: FixtureSpot,
): void {
  const dx = head.x - at.x;
  const dz = head.z - at.z;
  if (dx === 0 && dz === 0) return;
  board.rotation.y = Math.atan2(dx, dz) - yaw;
}
