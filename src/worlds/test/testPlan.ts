import { keyLevel, keyX, keyZ, wallDir, wallTile, type WallKey } from '../nav/navTile';
import { GridPlan } from '../grid/gridPlan';
import {
  EFFECTS,
  FIELD,
  INTERACT,
  KITCHEN,
  LEVELS,
  NAVIGATION,
  PATHS,
  PODIUM,
  RANGE,
  START,
  CLIMB,
  WALL_LAB,
} from './layout';
import { fitClimb, stampClimb } from './zones/climb';
import { fitEffects, stampEffects } from './zones/effects';
import { fitInteract, stampInteract } from './zones/interact';
import { fitKart, stampKart } from './zones/kart';
import { fitKitchen, stampKitchen } from './zones/kitchen';
import { fitNavigation, stampNavigation } from './zones/navigation';
import { fitPodium, stampPodium } from './zones/podium';
import { fitPortals, stampPortals } from './zones/portals';
import { fitRange, stampRange } from './zones/range';
import { fitStart, stampStart } from './zones/start';
import { fitWallLab } from './zones/wallLab';

/**
 * **Die Testwelt als Grundriss** — ein Gelände, neun Zonen, ein Boden.
 *
 * Sie ist das, was von vierzehn gelöschten Welten übrig geblieben ist: nicht
 * deren Summe, sondern ihr **Prüfstand**. Alles, was diese Engine kann, steht
 * hier auf einem Gelände nebeneinander und ist in einer Minute zu Fuß
 * abzulaufen — Türen, Effekte, eine Treppe, Wegsuche, ein Schießstand, eine
 * Kartbahn, eine Kletterwand und drei Portaltafeln. Wer etwas am Kern ändert,
 * sieht hier in einem Rundgang, was davon kaputtgegangen ist, statt vierzehn
 * Welten der Reihe nach zu laden.
 *
 * **Norden ist oben und die Mitte ist der Startplatz.** Der Grundriss liegt um
 * die Null herum: Vom Startplatz geht es nach Norden zu den Effekten, nach
 * Nordwesten zu den Türen, nach Nordosten auf das Podest, nach Westen in die
 * Navigation, nach Osten auf den Schießstand, nach Süden auf die Kartbahn und
 * nach Südosten an die Kletterwand. Die Himmelsrichtung ist die Wegbeschreibung
 * — wer eine Zone sucht, sucht eine Richtung.
 *
 * **Diese Datei ist die Komponistin.** Sie sagt, *was* zusammenkommt und in
 * welcher Reihenfolge; *wo* eine Zone liegt, steht in `layout.ts`, und *was*
 * darin steht, sagt die Zone selbst (`zones/<name>.ts`). Neun Dateien und nicht
 * eine, weil eine Zone ohne die anderen zu verstehen sein muss — und weil eine
 * Datei mit neun Zonen darin nach dem dritten Umbau eine Datei mit neun halben
 * Zonen ist.
 *
 * **Kein three.js**, wie bei jedem Grundriss auf dem Gitter. Deshalb steht der
 * Test daneben und rechnet in Millisekunden nach, was man sonst nur mit
 * aufgesetzter Brille merkt: dass jede Zone vom Startplatz aus erreichbar ist,
 * dass die Treppe wirklich auf das Podest führt und dass die Welt eine Runde
 * durch eine Datei unverändert übersteht.
 */

/**
 * **Der Grundriss.**
 *
 * Die Reihenfolge ist keine Kosmetik. Erst der Boden unter allem, dann die
 * Kacheln, auf denen gelaufen wird, dann die Zonen — und die Zonen zuletzt,
 * weil jede von ihnen Wände auf Kanten setzt, die es erst geben muss, und weil
 * die Treppe im Nordosten ein Loch in ein Obergeschoss schlägt, das vorher
 * gelegt sein will (`GridPlan.stairs`).
 */
export function testPlan(): GridPlan {
  const plan = new GridPlan(LEVELS);

  // Der Boden des Geländes, **auf null** — genau so hoch wie die Kacheln, auf
  // denen gelaufen wird. Er lag einmal zwei Zentimeter tiefer, damit er sich
  // mit ihnen nicht um jedes Pixel streitet; seit auf beiden Platten aus dem
  // Regal liegen und beide Quader darunter unsichtbar werden
  // (`shared/plateField.ts`), war das nur noch eine Stufe, auf der man stand:
  // _„die boden platten liegen hier nicht alle gleich auf"_. Gewünscht war,
  // dass man direkt auf der Plattenhöhe steht und nicht tiefer fällt — genau
  // das ist diese Masse jetzt: der Boden unter jeder Platte, auf null. Bis die
  // Platten da sind, liegen Masse und Kacheln in einer Ebene; beide tragen
  // dasselbe Material (`GridWorld.materialFor('floor')`), und zwei gleiche
  // Flächen in einer Ebene sehen aus wie eine.
  plan.mass('floor', FIELD, -0.5, 0, { portal: true });

  // Die begehbaren Flächen: die Zonen und die Gänge dazwischen. Was hier nicht
  // steht, ist Gelände — man steht darauf (die Masse trägt), aber es ist kein
  // Weg, den ein NPC kennt.
  for (const rect of [
    START,
    INTERACT,
    EFFECTS,
    PODIUM,
    NAVIGATION,
    RANGE,
    CLIMB,
    KITCHEN,
    WALL_LAB,
    ...PATHS,
  ]) {
    plan.floor(rect);
  }

  stampStart(plan);
  stampInteract(plan);
  stampEffects(plan);
  stampNavigation(plan);
  stampRange(plan);
  stampKart(plan);
  stampClimb(plan);
  stampKitchen(plan);
  // Nach dem Boden des Obergeschosses, und deshalb als vorletzte: Die Treppe
  // schlägt das Loch über sich selbst, und was danach noch Boden legt, legt es
  // wieder zu.
  stampPodium(plan);
  // Und die Portaltafeln zuletzt: Eine davon steht auf dem Podest, das es
  // vorher nicht gab.
  stampPortals(plan);

  // **Keine Planwände** — gewünscht: _„bitte ich dich alle normalen wände
  // komplett zu entfernen. Ich will nur noch mit den kaykit wänden arbeiten."_
  // Die Zonen setzen ihre Wände weiter (so bleiben ihre Stempel lesbar), und
  // hier gehen sie alle wieder weg (`clearPlanWalls`).
  // Nach den Einbauten: Einige setzen hinter ihr Schild noch eine Wand.
  fitTest(plan);
  clearPlanWalls(plan);
  return plan;
}

/**
 * **Alle festen Planwände und Schrägen weg** — Türen und Fenster bleiben.
 *
 * Die Testwelt baut Wände nur noch aus dem Regal (`zones/wallLab.ts`), und
 * eine eingerastete Regalwand ist auf dem Zellgitter eine Wand wie jede
 * andere (`GridWorld.refreshWallSlopes`). Auch ein gespeicherter Stand von
 * vorher verliert sie (`TestWorld.planLoaded`).
 */
export function clearPlanWalls(plan: GridPlan): void {
  const solid: WallKey[] = [];
  for (const [key, wall] of plan.graph.wallEntries()) if (wall.kind === 'solid') solid.push(key);
  for (const key of solid) plan.graph.clearWall(wallTile(key), wallDir(key));
  for (const { tile } of plan.saveSlopes())
    plan.slope(keyX(tile), keyZ(tile), null, keyLevel(tile));
}

/**
 * **Die Einbauten aller Zonen** — Tor, Türen, Auslöser, Düsen, Lampen,
 * Schilder.
 *
 * Getrennt vom Rest des Grundrisses, weil `TestWorld.planLoaded` sie noch
 * einmal aufsetzt, nachdem ein gespeicherter Stand den Plan ersetzt hat
 * (`GridWorld.applyStored`). Das geht nur mit Einbauten: Sie haben eine
 * **Kennung**, und `putFixture` ersetzt nach Kennung. Ein Baustein hat keine —
 * ein zweites Mal gesetzt stünde er zweimal da, und nach dem dritten Besuch
 * wären es drei Bänke auf einer Kachel.
 */
export function fitTest(plan: GridPlan): void {
  fitStart(plan);
  fitInteract(plan);
  fitEffects(plan);
  fitNavigation(plan);
  fitRange(plan);
  fitKart(plan);
  fitClimb(plan);
  fitKitchen(plan);
  fitWallLab(plan);
  fitPodium(plan);
  fitPortals(plan);
}
