import type * as THREE from 'three';

/**
 * **Aufschneiden: von oben sieht man das Stockwerk, in dem man steht.**
 *
 * Eine Kamera schräg über der Szene (`core/TopDownCamera.ts`) hat ein Problem,
 * das eine Kamera in der Brille nie hatte: Sie steht **unter** allem, was über
 * dem Spieler liegt. Im Dunkelhaus ist das die Decke, in Dust sind es die
 * Dächer, über dem Podest der Straßenküche ist es der Boden des Obergeschosses
 * — und was man sieht, ist ein Deckel. Overcooked und die Sims lösen das seit
 * jeher gleich: Alles über der Ebene des Spielers wird ausgeblendet, und wer
 * eine Treppe hinaufsteigt, bekommt die nächste Ebene dazu.
 *
 * Hier stehen die drei Zahlen dazu, **ohne three.js-Abhängigkeit im Kern der
 * Rechnung**, damit ein Test sie nachrechnen kann:
 *
 * - `hiddenLevels` — welche Ebenen bei Rig-Ebene *n* unsichtbar sind.
 * - `hidesLevel` — dieselbe Frage für ein einzelnes Objekt.
 * - `levelStep` — welche Ebene das Rig gerade ist, **mit Hysterese**, und
 *   `levelAtHeight` als sein erster Schritt: die Treppe zwischen zwei Etagen.
 *
 * **Warum Hysterese.** Die Ebene kommt aus der Kachel unter den Füßen
 * (`NavGraph.at`, `keyLevel`), und auf einer Treppe wechselt die Kachel
 * schlagartig: eine Kachel Treppe unten, die nächste ist schon das Podest.
 * Ohne Hysterese springt das ganze Stockwerk darüber im Vorbeigehen an und
 * wieder aus, sobald jemand auf der obersten Stufe steht und einen halben
 * Schritt zurücktritt — ein Flackern, das man dem Bild nicht ansieht, sondern
 * anmerkt. Umgeschaltet wird deshalb erst, wenn die Füße die **halbe
 * Stockwerkshöhe** überschritten haben, in beide Richtungen dieselbe Schwelle.
 *
 * **Eine Welt ohne Ebenenmarken bleibt, wie sie ist.** Ausgeblendet wird nur,
 * was eine Marke trägt (`userData.level`, gesetzt von `GridWorld` beim Bau);
 * nach der Höhe zu raten hieße, jedes Hochbett für ein Dach zu halten. Das
 * Portal-Labor und das Interaktionslabor stehen in Metern und nicht auf dem
 * Gitter — sie sehen von oben aus wie vorher, bis jemand ihnen eine Marke gibt.
 */

/** Auf welcher Ebene das Rig steht und wie hoch deren Boden liegt. */
export interface ViewLevel {
  /** Der Index der Etage (`nav/navTile.keyLevel`). */
  level: number;
  /** Ihre Bodenhöhe in Metern (`NavGraph.levelY`) — die Zielhöhe der Kamera. */
  floorY: number;
}

/**
 * **Was ein Objekt über seine Ebene sagt** — `null`, wenn es nichts sagt.
 *
 * Getrennt von `hidesLevel`, weil „keine Marke" und „Ebene 0" nicht dasselbe
 * sind: Das eine bleibt immer stehen, das andere verschwindet, sobald jemand
 * in den Keller steigt.
 */
export function levelOf(object: THREE.Object3D): number | null {
  const level = object.userData['level'];
  return typeof level === 'number' && Number.isFinite(level) ? level : null;
}

/** Ob ein Objekt dieser Ebene bei Rig-Ebene `rig` verschwindet. */
export function hidesLevel(level: number, rig: number): boolean {
  return level > rig;
}

/**
 * **Welche Ebenen bei Rig-Ebene `rig` unsichtbar sind**, aus `count` Etagen.
 *
 * Alles darüber und nichts darunter: Wer im Erdgeschoss steht, sieht den
 * Keller nicht, weil das Erdgeschoss darüberliegt — und genau deshalb steht
 * hier keine Sonderregel für unten. Was tiefer liegt, ist ohnehin verdeckt,
 * und wer es ausblendete, bekäme ein Loch in der Welt statt eines Blicks
 * hinein.
 */
export function hiddenLevels(count: number, rig: number): number[] {
  const out: number[] = [];
  for (let level = Math.max(0, rig + 1); level < count; level++) out.push(level);
  return out;
}

/**
 * **Wer hoch genug über seiner Kachel steht, steht auf einer Treppe.**
 *
 * Die Kachel allein reicht nämlich nicht: Ein Treppenlauf gehört ganz dem
 * unteren Stockwerk (die Kachel darüber ist sein Loch), und wer ihn hinaufgeht,
 * hätte bis zum letzten Schritt das Dach über dem Kopf, das gerade weichen
 * soll. Also zählt ab der **halben Stockwerkshöhe** schon die Etage darüber.
 *
 * Gemessen an den Etagenböden und nicht an dem, was unter den Füßen steht: Wer
 * auf einer Kiste steht, ist keinen Meter zwanzig über dem Boden im nächsten
 * Stock — und eine Welt, deren Geschosse anderthalb Meter hoch sind, hat ein
 * anderes Problem als diese Zeile.
 */
export function levelAtHeight(levels: readonly number[], tileLevel: number, y: number): number {
  let level = Math.max(0, Math.min(tileLevel, levels.length - 1));
  while (
    level + 1 < levels.length &&
    y >= (floorAt(levels, level) + floorAt(levels, level + 1)) / 2
  ) {
    level++;
  }
  return level;
}

/**
 * **Die Ebene des Rigs, einen Schritt weiter.**
 *
 * @param current worauf zuletzt entschieden wurde
 * @param under die Ebene der Kachel unter den Füßen
 * @param y die Höhe der Füße in Metern
 * @param levels die Bodenhöhen der Etagen (`NavGraph.levels`)
 *
 * Zwei Schritte: Erst sagt die Höhe, ob die Kachel noch gilt (`levelAtHeight` —
 * die Treppe), dann hält die Hysterese den Wechsel an derselben Linie fest.
 * Gewechselt wird über der Mitte zwischen beiden Böden — nach oben wie nach
 * unten dieselbe. Eine Treppe ist damit bis zur Hälfte das untere Stockwerk und
 * danach das obere, und sie flackert an keiner Stelle.
 */
export function levelStep(
  current: number,
  under: number,
  y: number,
  levels: readonly number[],
): number {
  const wanted = levels.length > 1 ? levelAtHeight(levels, under, y) : under;
  if (wanted === current) return current;
  const from = floorAt(levels, current);
  const to = floorAt(levels, wanted);
  const middle = (from + to) / 2;
  if (wanted > current) return y >= middle ? wanted : current;
  return y <= middle ? wanted : current;
}

/** Die Bodenhöhe einer Etage, auch wenn der Index danebenliegt. */
export function floorAt(levels: readonly number[], level: number): number {
  if (levels.length === 0) return 0;
  return levels[Math.min(Math.max(level, 0), levels.length - 1)] ?? 0;
}

/**
 * **Alles ausblenden, was über `level` liegt** — und zurückgeben, was dabei
 * angefasst wurde.
 *
 * Zwei Sachen daran sind Absicht:
 *
 * - **Wer ausgeblendet wird, wird nicht durchsucht.** Ein Stockwerk ist eine
 *   Gruppe mit hundert Kindern, und die tragen dieselbe Marke; sie einzeln
 *   umzuschalten wäre hundertmal dieselbe Arbeit für dasselbe Ergebnis.
 * - **Zurückgegeben wird eine Liste und kein Schalter.** Eingeblendet wird
 *   danach genau das, was diese Runde ausgeblendet hat — was aus einem anderen
 *   Grund unsichtbar war (eine aufgefahrene Tür, ein leeres Fach), bleibt es.
 */
export function cutAway(
  root: THREE.Object3D,
  level: number,
  out: THREE.Object3D[] = [],
): THREE.Object3D[] {
  for (const child of root.children) {
    if (!child.visible) continue;
    const mark = levelOf(child);
    if (mark !== null && hidesLevel(mark, level)) {
      child.visible = false;
      out.push(child);
      continue;
    }
    cutAway(child, level, out);
  }
  return out;
}

/** Und wieder her damit — nach dem Zeichnen, in derselben Reihenfolge. */
export function bringBack(hidden: THREE.Object3D[]): void {
  for (const object of hidden) object.visible = true;
  hidden.length = 0;
}
