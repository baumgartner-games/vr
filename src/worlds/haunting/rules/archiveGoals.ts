/**
 * **Was der Archivar wissen darf — und ab wann.**
 *
 * Sein Blatt kannte bis eben die ganze Runde auf einmal: Kiste, Konsole, Code,
 * alles ab der ersten Sekunde. Damit war der Archivar ein Vorleser. Der
 * Besitzer wollte es andersherum, und das ist die Regel, die hier steht:
 *
 * - **Die Kiste sieht er immer.** Was gesammelt werden muss und wo es liegt,
 *   ist seine Auskunft — ohne sie hätte niemand einen Grund, ihn anzurufen.
 * - **Die Konsole erst, wenn der Techniker das Teil in der Hand hat.** Wohin
 *   damit, ist die zweite Hälfte der Runde, und sie geht ihn erst etwas an,
 *   wenn die erste vorbei ist. Vorher stünde beides nebeneinander auf dem
 *   Blatt, und das Gespräch wäre eine einzige lange Ansage.
 * - **Ein liegengelassenes Teil sieht er erst, wenn es liegen *bleibt***
 *   (`DROPPED_SEEN`). Wer es im Laufen aus der Hand verliert und wieder
 *   aufhebt, hat es nicht verloren; wer es ablegt und weggeht, schon.
 *
 * **Was „in der Hand" heißt, steht an einer Stelle.** `HauntState.taken` sagt
 * nur, dass ein Teil einmal aus der Kiste kam — es wird nie wieder entfernt.
 * Getragen wird, was in `crew.inventory` steht; genau das nimmt die 2D-Runde
 * beim Ablegen wieder heraus, und seit dem Ablegen tut es die 3D-Welt auch.
 * Und weil ein Techniker **höchstens ein** Missionsteil tragen darf, ist das
 * hier zugleich die Regel, die eine zweite Kiste zubehält (`carriedPart`).
 *
 * Reine Rechnung — kein three.js, kein DOM. Jest rechnet sie nach.
 */
import { roomAt, roomOf, type HouseSpec } from '../house';
import { TILE } from '../../nav/navTile';
import { repairsFor, type Repair } from '../mission';
import { cargoOf, type CargoSlot } from './cargo';
import type { TaskStep } from './roundHud';

/**
 * **Wie lange ein abgelegtes Teil liegen muss, bis es auf dem Blatt steht** —
 * in Sekunden.
 *
 * Fünf Sekunden sind lang genug, dass ein Griffwechsel („kurz ablegen, Tür
 * aufmachen, wieder aufnehmen") den Archivar nicht erreicht, und kurz genug,
 * dass ein wirklich vergessenes Teil gefunden wird, bevor der Sauerstoff
 * knapp ist. Die Zahl kommt vom Besitzer; alles andere hier hängt an ihr.
 */
export const DROPPED_SEEN = 5;

/** Ein Teil, das im Gang liegt (`HauntState.dropped`). */
export interface DroppedPart {
  /** Die Kennung des Ersatzteils (`HouseTask.id`). */
  id: string;
  /** Wo es liegt, in Metern. */
  x: number;
  z: number;
  /** Seit wann — Sekunden seit Rundenbeginn (`HauntState.time`). */
  since: number;
}

/** Was diese Regel vom Stand braucht — mehr nicht, damit ein Test ihn tippen kann. */
export interface ArchiveState {
  /** Sekunden seit Rundenbeginn. */
  time: number;
  /** Was schon aus der Fracht heraus ist. */
  taken: readonly string[];
  /** Was erledigt ist — die 3D-Welt schreibt `Repair.id`, die 2D-Welt `Repair.itemId`. */
  done: readonly string[];
  /** Und was der Techniker gerade wirklich trägt. */
  crew: { inventory: readonly string[] };
  /** Die Teile, die im Gang liegen. Fehlt in alten Ständen. */
  dropped?: readonly DroppedPart[];
}

/** Wo ein abgelegtes Teil liegt — so, wie der Archivar es vorliest. */
export interface DroppedSighting {
  x: number;
  z: number;
  roomId: string;
  roomName: string;
  /** Wie lange es dort schon liegt, in Sekunden. */
  seconds: number;
}

/** Ein Auftrag, wie das Blatt des Archivars ihn zeigt. */
export interface ArchiveOrder {
  /** Die Kennung der Reparatur (`engine`). */
  id: string;
  /** Die des Ersatzteils (`t0`) — so heißt es in `taken` und `inventory`. */
  itemId: string;
  title: string;
  /** Wie das Ersatzteil heißt: „Filterpatrone". */
  item: string;
  /** Wie im HUD: 0 noch in der Kiste, 1 heraus, 2 erledigt. */
  step: TaskStep;
  /** Ob der Techniker es **jetzt** trägt — daran hängt die Konsole. */
  carried: boolean;
  /**
   * **Die Kiste — immer.** Was gesammelt werden muss und wo es liegt, ist die
   * Auskunft, für die es den Archivar gibt.
   */
  crate: { id: string; roomId: string; roomName: string; clue: string };
  /**
   * **Die Konsole — erst, wenn das Teil in der Hand ist** (oder der Auftrag
   * schon erledigt war). Vorher `null`, und die Anzeige zeigt dann gar nichts
   * statt einer ausgegrauten Zeile: Ein Feld, das man lesen kann, wenn man
   * die Augen zusammenkneift, ist kein verschwiegenes Feld.
   */
  console: {
    roomId: string;
    roomName: string;
    hint: string;
    code: string;
    puzzle: Repair['puzzle'];
  } | null;
  /** Wo das Teil liegt, wenn es lange genug liegt — sonst `null`. */
  dropped: DroppedSighting | null;
}

/**
 * **Das Missionsteil, das der Techniker gerade trägt** — oder `''`.
 *
 * Es ist immer höchstens eines: Wer ein Ersatzteil in der Hand hat, hat keine
 * Hand für das zweite, und eine Runde, in der man alle drei einsammelt und
 * danach in Ruhe drei Konsolen abklappert, ist eine Sammelrunde und kein Weg
 * durch ein Schiff. Werkzeuge (Radar, Röntgen, Medkit) zählen nicht mit — die
 * stecken am Gürtel.
 */
export function carriedPart(spec: HouseSpec, state: ArchiveState): string {
  return spec.tasks.find((task) => state.crew.inventory.includes(task.id))?.id ?? '';
}

/** Ob noch ein Missionsteil in die Hand passt. */
export function canCarryPart(spec: HouseSpec, state: ArchiveState): boolean {
  return !carriedPart(spec, state);
}

/**
 * Der Satz, mit dem eine zweite Kiste zubleibt. Er nennt das Teil, das im Weg
 * ist, und nicht nur „geht nicht" — sonst sucht der Spieler den Fehler bei
 * der Kiste.
 */
export function fullHandsText(spec: HouseSpec, state: ArchiveState): string {
  const held = carriedPart(spec, state);
  const label = spec.tasks.find((task) => task.id === held)?.label ?? 'Ersatzteil';
  return `Beide Hände voll: ${label} zuerst abliefern oder ablegen.`;
}

/** Ob dieser Auftrag erledigt ist — beide Schreibweisen von `done` zählen. */
export function orderDone(state: ArchiveState, repair: Pick<Repair, 'id' | 'itemId'>): boolean {
  return state.done.includes(repair.id) || state.done.includes(repair.itemId);
}

/**
 * Wo ein Teil liegt, wenn es **lange genug** liegt — sonst `null`.
 *
 * Die Zeit läuft in der Runde und nicht an der Wanduhr: Ein Stand vom Netz
 * bringt seine eigene mit, und ein Archivar auf einem zweiten Gerät soll das
 * Teil im selben Moment sehen wie der auf dem ersten.
 */
export function droppedSighting(
  spec: HouseSpec,
  state: ArchiveState,
  itemId: string,
): DroppedSighting | null {
  const part = state.dropped?.find((one) => one.id === itemId);
  if (!part) return null;
  const seconds = state.time - part.since;
  if (!(seconds >= DROPPED_SEEN)) return null;
  const room = roomAt(spec, Math.floor(part.x / TILE), Math.floor(part.z / TILE));
  return {
    x: part.x,
    z: part.z,
    roomId: room?.id ?? '',
    roomName: room?.name ?? 'unbekannter Bereich',
    seconds,
  };
}

/**
 * **Das ganze Blatt**: je Reparatur die Kiste, die Konsole, wenn sie ihm
 * zusteht, und ein liegengelassenes Teil, wenn es lange genug liegt.
 *
 * Die Reihenfolge ist die der Reparaturen (`repairsFor`) und damit dieselbe
 * wie im HUD des Technikers und auf dem Kompass — zwei Listen, die dieselben
 * drei Aufträge in verschiedener Reihenfolge zeigen, sind am Telefon zwei
 * Listen zu viel.
 */
export function archiveGoals(spec: HouseSpec, state: ArchiveState): ArchiveOrder[] {
  const crates = cargoOf(spec);
  const name = (roomId: string): string => roomOf(spec, roomId)?.name ?? roomId;
  return repairsFor(spec).map((repair) => {
    const done = orderDone(state, repair);
    const carried = state.crew.inventory.includes(repair.itemId);
    const out = state.taken.includes(repair.itemId);
    const step: TaskStep = done ? 2 : carried || out ? 1 : 0;
    const crate = partCrate(crates, repair.itemId);
    // **Ohne Kiste bleibt der Raum.** `cargoOf` legt ein Teil nur dort ab, wo
    // der Packer wirklich eine Kiste gestellt hat; in einem Raum, der keine
    // trägt, gäbe es sonst eine leere Zeile statt einer Auskunft.
    const crateRoom = crate?.roomId ?? spec.tasks.find((t) => t.id === repair.itemId)?.roomId ?? '';
    return {
      id: repair.id,
      itemId: repair.itemId,
      title: repair.title,
      item: repair.item,
      step,
      carried,
      crate: {
        id: crate?.id ?? '',
        roomId: crateRoom,
        roomName: crateRoom ? name(crateRoom) : 'unbekannter Bereich',
        clue: crate?.clue ?? 'keine Kiste — im Raum suchen',
      },
      console:
        carried || done
          ? {
              roomId: repair.roomId,
              roomName: name(repair.roomId),
              hint: repair.hint,
              code: repair.code,
              puzzle: repair.puzzle,
            }
          : null,
      dropped: done ? null : droppedSighting(spec, state, repair.itemId),
    };
  });
}

/** Die Kiste, in der dieses Teil liegt — `null`, wenn der Raum keine trägt. */
function partCrate(crates: readonly CargoSlot[], itemId: string): CargoSlot | null {
  return crates.find((slot) => slot.loot.kind === 'part' && slot.loot.taskId === itemId) ?? null;
}
