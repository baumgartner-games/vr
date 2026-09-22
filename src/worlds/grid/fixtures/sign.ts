import * as THREE from 'three';
import { kaykitAtHeight, kaykitSkins } from '../../../core/kaykitHeight';
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
  /**
   * **Die Materialien des Pfostens aus dem Regal** — sie gehören dieser Kopie
   * allein und müssen beim Abräumen weg (`core/kaykitHeight.kaykitSkins`).
   * Seine **Geometrie** gehört der Vorlage und allen anderen Schildern und
   * bleibt liegen.
   */
  postSkins: THREE.Material[];
  /** Ob der Einbau schon abgeräumt ist, während die Datei noch unterwegs war. */
  gone: boolean;
}

/** Wie hoch das Brett hängt und wie breit es ist. */
const POST_H = 1.35;
// Fast die ganze Kachel breit: Auf 2,5 m waren 62 % davon ein stattliches
// Brett, auf einem Meter wären dieselben 62 % ein Schildchen, das man nicht
// mehr liest.
const BOARD_W = TILE * 0.9;

/**
 * **Der Pfosten kommt aus dem Regal** — und der gerechnete Stab ist weg.
 *
 * Hier stand ein `BoxGeometry(0.08, POST_H, 0.08)` aus dem Stahl der Welt: ein
 * Strich, der eine Tafel trägt. Das Regal hat dafür ein Modell, und zwar
 * genau eines, das ein Pfosten ist und kein Balken — `dungeon/post.glb`, ein
 * Knoten, 0,400 × 4,000 × 0,400 Quelleinheiten, Ursprung in der Mitte der
 * Unterkante wie bei einem Möbel. Mit dem Maßstab seines Pakets
 * (`core/kaykitFit.KAYKIT_SCALE` = 0,5) ist er 2,00 m hoch und 0,20 m dick:
 * ein Pfosten für ein Verlies und nicht für dieses Schild.
 *
 * **Also wird er gemessen und eingepasst** (`core/kaykitHeight.kaykitAtHeight`),
 * auf die 1,35 m, die das Brett über dem Boden hängen. Die 0,675, die dabei
 * herauskommen, stehen ausdrücklich nirgends: Eine abgeschriebene Zahl ist
 * die, die nach dem nächsten Paket-Update stehen bleibt, während das Netz
 * daneben wandert (die lange Fassung steht im Helfer und an der Druckplatte,
 * `fixtures/plate.ts`). Dick wird der Pfosten dabei mit: 0,135 m statt 0,08 m
 * — sichtbar mehr Holz, und immer noch eine halbe Kachel von jeder Wand weg.
 *
 * **Und es steht nicht beides da.** Anders als an der Druckplatte, wo die
 * gerechnete Scheibe als Rückfall stehen bleibt, weil ein Auslöser ohne Bild
 * kaputt wäre, ist das Schild sein **Text**: Kommt keine Datei — in Jest, in
 * einem Checkout ohne die gekauften Pakete, auf einer abreißenden Leitung —,
 * hängt die Tafel ohne Pfosten in der Luft, und man liest sie trotzdem. Das
 * ist der ausdrücklich hingenommene Ausgang und keine Notlösung.
 */
const POST_MODEL = 'dungeon/post.glb';

/**
 * **Den Pfosten holen und an die Kante stellen** — sofort nichts, später
 * vielleicht etwas.
 *
 * Der Einbau wird **synchron** gebaut, das Modell kommt über die Leitung;
 * dazwischen liegt diese Funktion. Sie fragt nicht nach WebGL und nicht nach
 * dem Regal — beides tut der Helfer, und „es kommt nichts" ist hier eine
 * Zeile und kein Zweig (`core/kaykitHeight.kaykitAtHeight`).
 *
 * `gone` ist der Fall, den die Gitterwelt besonders oft macht: Sie baut ihre
 * Einbauten bei **jeder** Änderung neu (`GridWorld.rebuildFixtures`), im
 * Baumodus also dutzendfach je Minute. Dann hängt der fertige Pfosten an
 * einer Gruppe, die niemand mehr ansieht — seine Materialien gehen deshalb
 * hier weg und nicht erst, wenn niemand mehr weiß, dass es sie gab.
 */
function fillPost(view: SignView, group: THREE.Group, at: number): void {
  void kaykitAtHeight(POST_MODEL, POST_H).then((post) => {
    if (!post) return;
    if (view.gone) {
      for (const skin of kaykitSkins(post)) skin.dispose();
      return;
    }
    // Sein Fuß steht auf dem Ursprung der Gruppe, die der Helfer zurückgibt —
    // hingestellt wird er damit wie ein Möbel und nicht auf halbe Höhe
    // gerechnet.
    post.position.set(0, 0, at);
    group.add(post);
    for (const skin of kaykitSkins(post)) view.postSkins.push(skin);
  });
}

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
    // schaut nach Süden in den Raum. Der Pfosten selbst kommt erst gleich
    // (`fillPost`) — er hängt an einer Datei, das Brett nicht.
    const edge = -TILE / 2 + 0.16;

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
      postSkins: [],
      gone: false,
      dispose: () => {
        view.gone = true;
        board.dispose();
        // Nur die Materialien: Die Geometrie der Regalkopie gehört der
        // Vorlage, und `disposeShapes` hält an ihr an
        // (`shared/environment.ts`, `userData.sharedAssets`).
        for (const skin of view.postSkins) skin.dispose();
        view.postSkins.length = 0;
      },
    };
    // **Anfassen und Lesen hängen nicht am Pfosten**, und deshalb braucht es
    // hier keinen unsichtbaren Stellvertreter für ihn. Angemeldet wird die
    // **Gruppe** (`GridWorld.attachUsable`), und wie weit sie reicht, misst
    // die Welt einmal beim Anmelden und **waagerecht**
    // (`PortalWorld.objectRadius`: das größere von x und z, halbiert). Das
    // waren schon vorher die 0,45 m des Bretts und nicht die 0,04 m des
    // Stabs; ob der Pfosten gleich kommt oder nie, ändert daran nichts. Und
    // ein Strahl, der ihn trifft, findet das Schild über die Gruppe darüber
    // (`GridWorld.fixtureIdOf`).
    //
    // **Damit braucht es auch kein Nachreichen** (`FixtureBuild.rehandle`):
    // In der Gruppe steht von der ersten Zeile an die Tafel, und sie bleibt
    // stehen, wenn der Pfosten dazukommt — angemeldet ist also durchweg etwas
    // Sichtbares (`core/usable.usableShows`). Der Hebel hat genau hier seinen
    // Fehler gehabt, das Schild hat ihn nie gehabt.
    fillPost(view, group, edge);
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
