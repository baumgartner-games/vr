import type { PlateTile } from '../shared/plateField';
import { PIT_BOXES, PIT_LANE } from '../kart/kartCourse';

/**
 * **Welche Platte auf welche Kachel gehört** — reine Rechnung, ohne three.js
 * (`floorPlate.test.ts`). Was eine Platte auf der Grafikkarte ist, steht in
 * `shared/plateFloor.ts`; wo die Kacheln liegen, rechnet
 * `shared/plateField.floorPlateSpots`; **welche** dort liegt, steht hier.
 *
 * Seit die Sandbox leer ist (Oktober 2026) bleibt davon eine Regel: Überall
 * liegt der Prototyp-Boden, außer wo eine Zone ihren Boden selbst mitbringt
 * (`OWN_FLOORS`). Küche, Stachelfeld und Steinboden des Podests sind mit
 * ihren Zonen gegangen.
 */

/**
 * **Der Prototyp-Boden** — `prototype-bits/Floor_Prototype.glb`.
 *
 * Vier Kandidaten liegen in demselben Paket, alle vier 4 × 4 Quelleinheiten
 * groß und alle vier auf demselben Atlas. Nachgemessen an den Dateien:
 *
 * | Datei             | Höhe  | Dreiecke | was darauf ist                    |
 * | ----------------- | ----- | -------- | --------------------------------- |
 * | `Primitive_Floor` | 1,000 | **12**   | ein nackter Würfel                |
 * | `Floor_Prototype` | 0,500 | **20**   | eine umlaufend gefaste Oberkante  |
 * | `Floor`           | 0,500 | **52**   | dieselbe Fase, dazu ein Innenfeld |
 * | `Floor_Dirt`      | 0,530 | **120**  | Erde und Geröll obenauf           |
 *
 * `Primitive_Floor` ist der billigste und zugleich der nutzloseste: ein Würfel
 * ohne jede Kante sieht aus wie das, was hier ersetzt werden soll — eine
 * Fläche mit einem Muster darauf. `Floor_Dirt` bringt Geröll mit, und Geröll
 * zerlegt das Raster, um das es geht; sechsmal so viele Dreiecke kosten es
 * obendrein. `Floor` legt in dieselbe Platte noch zwei eingelassene Rahmen —
 * hübsch für einen Raum, und bei 34 553 Platten der Unterschied zwischen
 * 691 000 und 1,8 Millionen Dreiecken je Bild, für ein Muster, das ab zwanzig
 * Metern niemand mehr auseinanderhält.
 *
 * Bleibt `Floor_Prototype`. Ihre Fase ist nachgemessen: Die Oberseite liegt
 * 0,1 Quelleinheiten über dem Rand und steht an jeder Seite 0,1 nach innen —
 * bei einer Platte von einem Meter also eine Schräge von 2,5 cm, in 45° rings
 * um jede Fuge. Genau die macht aus einem gemusterten Rechteck eine Platte,
 * und sie kostet acht Dreiecke. Es ist auch die, die bestellt wurde.
 */
export const PLATE_PROTOTYPE = 'prototype-bits/Floor_Prototype.glb';

/**
 * **Wo schon ein Boden liegt, kommt kein zweiter hin** — die Boxengasse samt
 * Buchten der Test Rennstrecke (`kart/kartPit.ts`): Asphalt, zwei Zentimeter
 * über null (`TARMAC_TOP`).
 *
 * Gemeldet war: _„bei einigen Böden ein Z-Buffer-Fight … wenn dort ein Boden
 * liegt, braucht es keinen Prototype-Floor."_ Zwei Böden übereinander kann man
 * nicht so weit auseinanderlegen, dass sie aus jeder Entfernung sauber
 * bleiben; einen weglassen kann man.
 */
const OWN_FLOORS: readonly { x: number; z: number; w: number; d: number }[] = [PIT_LANE, PIT_BOXES];

/** Ob auf dieser Kachel schon ein eigener Boden liegt (`OWN_FLOORS`). */
export function ownsFloor(col: number, row: number): boolean {
  return OWN_FLOORS.some(
    (rect) => col >= rect.x && col < rect.x + rect.w && row >= rect.z && row < rect.z + rect.d,
  );
}

/** **Die Entscheidung** — eine Kachel hinein, eine Adresse aus dem Regal oder `null` heraus. */
export function floorPlate(tile: PlateTile): string | null {
  return ownsFloor(tile.col, tile.row) ? null : PLATE_PROTOTYPE;
}
