import {
  DOOR_COST,
  wallState,
  type NavGraph,
  type NavLink,
  type WallFacts,
  type WallState,
} from './navGraph';
import type { TileKey } from './navTile';

/**
 * **Was ein NPC zu wissen glaubt** — und wo er sich irrt.
 *
 * Der Weltgraph sagt, wie es *ist*. Diese Liste sagt, was **dieser eine** NPC
 * zuletzt gesehen hat, und sie enthält ausdrücklich nur die **Abweichungen**:
 * wo nichts eingetragen ist, nimmt er die Welt, wie sie ist. Das ist der
 * Unterschied zwischen fünfzig NPCs, die je eine halbe Karte mit sich
 * herumtragen, und fünfzig NPCs, die je drei Türen im Kopf haben.
 *
 * Der Zweck ist nicht Sparsamkeit, sondern Verhalten. Ein Bot, der jede
 * Änderung der Welt sofort kennt, ist hellsichtig, und Hellsicht sieht man ihm
 * an: Er dreht ab, bevor die Tür ins Schloss fällt. Ein Bot mit dieser Liste
 * läuft gegen die Tür, merkt es dort und plant dort neu — und **das ist kein
 * Fehler, sondern das Ziel**. Wer diese Datei später „repariert", indem er die
 * Meinung mit der Wahrheit abgleicht, hat die Hellsicht wieder eingebaut.
 *
 * Drei Sorten Meinung gibt es, und alle drei haben dieselbe Form:
 *
 * - **Türen** — „Tür 7 war offen, Stand t=120 s".
 * - **Verbindungen** — „das Portal kenne ich nicht" ist auch eine Meinung, und
 *   zwar die, mit der ein frisch aufgestelltes Portal für alle beginnt außer
 *   für den, der dabei war.
 * - **Kacheln** — „da stand eine Kiste".
 *
 * **Was hier steht, gilt nur fürs Planen.** Sehen und Hören laufen immer über
 * die Wahrheit (`navSight.ts`): Man sieht nicht durch eine Tür, nur weil man
 * sie für offen hält. Ein NPC darf sich über den Weg irren, nicht über seine
 * Sinne.
 */

/** Eine Meinung über eine Tür. */
export interface DoorOpinion {
  /** `false` heißt „diese Tür gibt es für mich nicht" — also eine Wand. */
  known: boolean;
  open: boolean;
  barred: boolean;
  /** Weltzeit der Beobachtung, in Sekunden. */
  at: number;
}

/** Eine Meinung über eine Verbindung. */
export interface LinkOpinion {
  known: boolean;
  open: boolean;
  at: number;
}

/** Eine Meinung darüber, ob auf einer Kachel etwas steht. */
export interface TileOpinion {
  /** `false` heißt „von dieser Kachel weiß ich nichts" — er plant nicht darüber. */
  known: boolean;
  blocked: boolean;
  at: number;
}

export class NavBelief {
  /**
   * Steigt bei jeder Änderung der Meinung.
   *
   * **Dies** ist das Signal zum Umplanen, nicht `NavGraph.version`: Ein NPC
   * plant neu, wenn *er* etwas erfahren hat, und nicht, wenn irgendwo auf der
   * Karte etwas passiert ist.
   */
  version = 0;

  private readonly doors = new Map<string, DoorOpinion>();
  private readonly linkBeliefs = new Map<string, LinkOpinion>();
  private readonly tiles = new Map<TileKey, TileOpinion>();

  /** Wie viele Abweichungen er mit sich herumträgt — für die Debug-Ansicht. */
  get size(): number {
    return this.doors.size + this.linkBeliefs.size + this.tiles.size;
  }

  // --- Türen --------------------------------------------------------------

  /** Er hat hingeschaut: die Wahrheit wird zu seiner Meinung. */
  seeDoor(id: string, truth: { open: boolean; barred: boolean }, now: number): void {
    this.doors.set(id, { known: true, open: truth.open, barred: truth.barred, at: now });
    this.version++;
  }

  /**
   * Er glaubt etwas, das nicht stimmen muss.
   *
   * Für Szenarien und für den Fall, dass ein NPC mit einem Vorwissen
   * anfangen soll („der Wächter weiß, dass die Hintertür immer offen ist").
   */
  assumeDoor(id: string, state: { open: boolean; barred?: boolean }, now: number): void {
    this.doors.set(id, {
      known: true,
      open: state.open,
      barred: state.barred ?? false,
      at: now,
    });
    this.version++;
  }

  /** Diese Tür gibt es für ihn nicht — er plant nicht durch sie hindurch. */
  hideDoor(id: string, now: number): void {
    this.doors.set(id, { known: false, open: false, barred: true, at: now });
    this.version++;
  }

  /** Zurück zur Wahrheit: er hat keine eigene Meinung mehr dazu. */
  forgetDoor(id: string): boolean {
    if (!this.doors.delete(id)) return false;
    this.version++;
    return true;
  }

  doorOpinion(id: string): DoorOpinion | undefined {
    return this.doors.get(id);
  }

  doorOpinions(): IterableIterator<[string, DoorOpinion]> {
    return this.doors.entries();
  }

  // --- Verbindungen -------------------------------------------------------

  seeLink(id: string, open: boolean, now: number): void {
    this.linkBeliefs.set(id, { known: true, open, at: now });
    this.version++;
  }

  /**
   * Er kennt diese Verbindung nicht.
   *
   * Das ist der Eintrag für ein neu aufgestelltes Portal: der Regisseur setzt
   * ihn bei allen, die nicht dabei waren, und wer später hinsieht, ersetzt ihn
   * durch `seeLink`. Ohne diesen Eintrag wüsste jeder NPC sofort von jedem
   * Portal — und ein Portal, das alle sofort kennen, ist kein Portal, sondern
   * eine Abkürzung.
   */
  hideLink(id: string, now: number): void {
    this.linkBeliefs.set(id, { known: false, open: false, at: now });
    this.version++;
  }

  forgetLink(id: string): boolean {
    if (!this.linkBeliefs.delete(id)) return false;
    this.version++;
    return true;
  }

  linkOpinion(id: string): LinkOpinion | undefined {
    return this.linkBeliefs.get(id);
  }

  linkOpinions(): IterableIterator<[string, LinkOpinion]> {
    return this.linkBeliefs.entries();
  }

  // --- Kacheln ------------------------------------------------------------

  seeTile(key: TileKey, blocked: boolean, now: number): void {
    this.tiles.set(key, { known: true, blocked, at: now });
    this.version++;
  }

  hideTile(key: TileKey, now: number): void {
    this.tiles.set(key, { known: false, blocked: true, at: now });
    this.version++;
  }

  forgetTile(key: TileKey): boolean {
    if (!this.tiles.delete(key)) return false;
    this.version++;
    return true;
  }

  tileOpinion(key: TileKey): TileOpinion | undefined {
    return this.tiles.get(key);
  }

  tileOpinions(): IterableIterator<[TileKey, TileOpinion]> {
    return this.tiles.entries();
  }

  // --- Vergessen ----------------------------------------------------------

  /**
   * Alles vergessen, was älter ist als dieser Zeitpunkt.
   *
   * Vergessen heißt hier **zurück zur Wahrheit** und nicht „zu einer Wand
   * werden": Wer lange genug nicht hingeschaut hat, nimmt wieder an, dass die
   * Welt so ist, wie sie gebaut wurde. Das ist die freundlichere von beiden
   * Annahmen — die andere („was ich nicht weiß, gibt es nicht") lässt NPCs
   * nach einer Minute in einer Ecke stehen.
   */
  forgetBefore(cutoff: number): number {
    let dropped = 0;
    for (const [id, opinion] of this.doors) {
      if (opinion.at < cutoff && this.doors.delete(id)) dropped++;
    }
    for (const [id, opinion] of this.linkBeliefs) {
      if (opinion.at < cutoff && this.linkBeliefs.delete(id)) dropped++;
    }
    for (const [key, opinion] of this.tiles) {
      if (opinion.at < cutoff && this.tiles.delete(key)) dropped++;
    }
    if (dropped > 0) this.version++;
    return dropped;
  }

  clear(): void {
    if (this.size === 0) return;
    this.doors.clear();
    this.linkBeliefs.clear();
    this.tiles.clear();
    this.version++;
  }
}

// --- Was daraus für die Wegsuche folgt ------------------------------------

/**
 * Der Zustand einer Wand, so wie **dieser** NPC ihn sich vorstellt.
 *
 * `see` und `hear` kommen dabei immer aus der Wahrheit und werden nie von der
 * Meinung überschrieben — siehe oben: irren darf er sich über den Weg, nicht
 * über seine Sinne.
 */
export function believedWallState(
  belief: NavBelief | null,
  facts: WallFacts | undefined,
  canOpen: boolean,
  out?: WallState,
): WallState {
  const state = wallState(facts, canOpen, out);
  if (!belief || !facts || facts.kind !== 'door' || !facts.id) return state;
  const opinion = belief.doorOpinion(facts.id);
  if (!opinion) return state;

  if (!opinion.known) {
    state.walk = false;
    state.cost = 0;
    return state;
  }
  if (opinion.open) {
    state.walk = true;
    state.cost = 0;
    return state;
  }
  if (opinion.barred || !canOpen) {
    state.walk = false;
    state.cost = 0;
    return state;
  }
  state.walk = true;
  state.cost = DOOR_COST;
  return state;
}

/** Ob er glaubt, diese Verbindung benutzen zu können. */
export function believedLinkOpen(belief: NavBelief | null, link: NavLink): boolean {
  const opinion = belief?.linkOpinion(link.id);
  if (!opinion) return link.open;
  return opinion.known && opinion.open;
}

/** Ob er glaubt, dass diese Kachel begehbar ist. */
export function believedWalkable(belief: NavBelief | null, graph: NavGraph, key: TileKey): boolean {
  if (!graph.has(key)) return false;
  const opinion = belief?.tileOpinion(key);
  if (!opinion) return !graph.isBlocked(key);
  return opinion.known && !opinion.blocked;
}
