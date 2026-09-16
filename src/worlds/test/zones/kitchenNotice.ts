import type * as THREE from 'three';
import { PLAN_WALL_H, PLAN_WALL_T } from '../../editor/levelPlan';
import { SIGN_BACK_DEPTH, SignBoard } from '../../signs/SignBoard';
import { DEFAULT_SIGN } from '../../signs/signSettings';
import { KITCHEN, centre } from '../layout';

/**
 * **Der Aushang an der Küchenwand** — die eine große Tafel, auf der Markdown
 * wirklich gesetzt wird, und zwar in der Welt und nicht im Menü.
 *
 * **Warum es sie gibt.** Markdown auf einem Schild gab es hier schon, aber nur
 * zum Aufschlagen: Das Schild am Pfosten (`grid/fixtures/sign.ts`) trägt seine
 * erste Zeile, und wer `A` drückt, bekommt den Rest als Seite im Menü. Eine
 * Seite im Menü ist ein Blatt vor dem Gesicht — sie hält das Spiel an, sie
 * gehört einem allein, und ein zweiter Spieler daneben sieht nichts davon.
 * Der Satz aus `worlds/signs/` kann längst mehr (`signMarkup.ts` →
 * `signLayout.ts` → `SignBoard.ts`): Überschriften, Aufzählungen, Zitat,
 * Trennlinie, Code — gezeichnet auf eine Leinwand, die als Textur an einer
 * Fläche hängt. Hier hängt sie an der Wand, und alle lesen dasselbe Stück
 * Wand.
 *
 * **Und sie dreht sich nicht mit.** Das ist der Unterschied zum Schild am
 * Pfosten, und er ist Absicht: Alles, was frei im Raum steht und Auskunft
 * gibt, sieht die Kamera an (`ui/billboard.ts`) — ein Text an einer Wand
 * dagegen ist ein Gemälde. Er hängt, wo er hängt, er wirft seinen Schatten wie
 * die Wand, und von schräg oben liest man ihn verkürzt, so wie man ein Bild in
 * einem Flur verkürzt sieht. Eine Tafel, die sich von der Wand löste, um dem
 * Auge zu folgen, wäre kein Aushang mehr, sondern ein Schild, das an einer
 * Wand klebt.
 *
 * **Deshalb die Nordwand.** Die Ansicht von oben schaut aus dem Süden auf die
 * Szene (`core/topDownPose.ts`); die Nordwand ist die einzige Wand dieser
 * Küche, deren Innenseite dieser Kamera zugewandt ist. An der Westwand hinge
 * derselbe Aushang für den Blick von oben hochkant — richtig aufgehängt, und
 * trotzdem unlesbar. Ein Gemälde muss nicht mitdrehen; hängen muss es
 * trotzdem dort, wo jemand davorsteht.
 */

/** Maße der Tafel in Metern — die größten, die es gibt (`signSettings.ts`). */
export const NOTICE_WIDTH = 2.4;
export const NOTICE_HEIGHT = 1.8;

/**
 * Zeilenhöhe in Zentimetern **auf der Tafel** (`signSettings.fontCm`).
 *
 * Sechs und nicht die üblichen vier: Diese Tafel wird nicht aus einem Meter
 * gelesen wie eine, die man selbst hingestellt hat, sondern quer durch die
 * Küche und aus der Ansicht von oben. Die nächste Raste (8 cm) ist die eine zu
 * viel — damit passt der Aushang nicht mehr auf die Tafel, und ein Aushang,
 * der rollen müsste, den niemand rollen kann, ist ein abgeschnittener Aushang.
 * Nachgerechnet wird beides im Test daneben.
 */
export const NOTICE_FONT_CM = 6;

/**
 * **Über welcher Kachelspalte die Tafel hängt** — acht Kacheln östlich der
 * Westwand, also über Schneidebrett und Zeile.
 *
 * Nicht über der Spüle und nicht über den Herden: Über einem Herd hängt in
 * einer Küche eine Haube und kein Papier, und über der Spüle stünde sie genau
 * dort, wo die zwei Kacheln breite Lücke der Zeile ist.
 */
export const NOTICE_TILE = 8;

/** Luft zwischen Oberkante und Wandkrone, in Metern. */
const AIR = 0.05;
/** Und wie weit die Rückseite vor der Wand bleibt — gegen das Flackern. */
const CLEAR = 0.01;

/**
 * **Wo die Tafel hängt**, in Weltmetern — gerechnet und nicht abgelesen.
 *
 * Die Wand steht auf der Nordkante der Zone, ist `PLAN_WALL_T` dick und damit
 * mittig auf dieser Kante; ihre **Innenseite** liegt eine halbe Wanddicke
 * südlich davon. Davor kommt, was die Tafel nach hinten baut
 * (`SIGN_BACK_DEPTH`), und dann noch ein Zentimeter Luft: Eine Rückwand, die
 * in der Wand steckt, flackert in jedem zweiten Bild.
 */
export function noticePose(): { x: number; y: number; z: number } {
  return {
    x: centre(KITCHEN.x + NOTICE_TILE),
    y: PLAN_WALL_H - AIR - NOTICE_HEIGHT / 2,
    z: KITCHEN.z + PLAN_WALL_T / 2 + SIGN_BACK_DEPTH + CLEAR,
  };
}

/**
 * **Was auf ihr steht** — kurz, weil eine Wandtafel gelesen wird, während man
 * kocht, und nicht danach.
 *
 * Es ist zugleich die Probe auf den Satz: Überschrift, kursive Zeile,
 * Aufzählung mit Fettem darin, Trennlinie, Zitat und Code in der Zeile — jedes
 * dieser Zeichen geht einen anderen Weg durch `signMarkup.ts`. Wer am Satz
 * etwas ändert, sieht es hier, ohne ein Schild aufstellen und beschriften zu
 * müssen.
 *
 * Der lange Aushang zur Küche steht weiterhin am Schild neben dem Eingang und
 * wird dort aufgeschlagen (`zones/kitchenPlan.fitKitchen`) — zwei Tafeln mit
 * demselben Text wären eine zu viel.
 */
export const NOTICE_TEXT = [
  '# Küchendienst',
  '',
  '*Dieser Aushang hängt an der Wand — er dreht sich nicht mit.*',
  '',
  '- **Patty** in die Pfanne. Der Balken darüber zählt mit: gebraten,',
  '  verbrannt, Feuer.',
  '- **Salat** und **Tomate** aufs Brett; es schneidet, solange jemand',
  '  davorsteht.',
  '- Serviert wird **nur mit Teller**, über die Ausgabetheke.',
  '- Dreckiges Geschirr an die Rückgabe, von dort in die Spüle.',
  '',
  '## Wenn es brennt',
  '',
  '- Der **Feuerlöscher** steht neben dem Herd: nehmen und halten.',
  '- Verbranntes kommt in den **Mülleimer**.',
  '',
  '---',
  '',
  '> Umbauen? Der rote Knopf am Eingang. Danach hebt `A` ein Möbel auf.',
].join('\n');

/**
 * **Hängt sie auf.**
 *
 * `null` ohne DOM: In Jest gibt es keine Leinwand, und eine Küche, die ohne
 * Browser nicht mehr gebaut werden kann, ist eine Küche, die kein Test mehr
 * anfasst (dieselbe Frage wie beim roten Knopf, `kitchen.addBuildButton`).
 *
 * Gedreht wird nichts: Eine Tafel schaut auf +Z, die Innenseite der Nordwand
 * schaut nach Süden, und Süden ist +Z. Gerollt wird auch nichts — der Text
 * passt, und ein Aushang an der Wand hat keinen Daumenstick.
 */
export function buildKitchenNotice(root: THREE.Object3D): SignBoard | null {
  if (typeof document === 'undefined') return null;
  const board = new SignBoard({
    text: NOTICE_TEXT,
    mount: 'wall',
    // Angeschraubt und nicht abzunehmen: keine Traggriffe.
    handles: false,
    settings: {
      ...DEFAULT_SIGN,
      fontCm: NOTICE_FONT_CM,
      width: NOTICE_WIDTH,
      height: NOTICE_HEIGHT,
      autoScroll: 0,
      manualScroll: false,
    },
  });
  board.name = 'kitchen-notice';
  const at = noticePose();
  board.position.set(at.x, at.y, at.z);
  root.add(board);
  return board;
}
