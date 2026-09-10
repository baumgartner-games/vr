import type { RoutineWorld } from '../monsterRoutine';
import type { FloorPoint } from '../stationLayout';

/**
 * **Was das Monster über die Station weiß** — und was es nur glaubt.
 *
 * Bisher hatte es beides nicht. Die Routine (`monsterRoutine.ts`) merkte sich
 * genau einen Raum (`trail`) und zwei Zähler, und nach einem Sichtverlust
 * **riet** sie den Nachbarraum. Das Ergebnis war ein Vieh ohne Gedächtnis: Es
 * suchte denselben Raum dreimal hintereinander ab, ließ die halbe Station
 * unberührt, und ein Geräusch am anderen Ende sagte ihm nichts, weil es
 * nirgends etwas hinschreiben konnte.
 *
 * Hier steht deshalb das Gegenstück: eine **Wahrscheinlichkeitsverteilung über
 * die Räume** — für jeden Raum eine Zahl, zusammen immer 1 — plus ein
 * Notizzettel je Raum (wann zuletzt hier gewesen, abgesucht, gesehen, gehört)
 * und eine **Spur** der letzten Sichtungen, aus der sich Richtung und Tempo
 * des Spielers schätzen lassen.
 *
 * Vier Ereignisse ändern das Bild, und alle vier sind eine Zeile Rechnung:
 *
 * - **Gesehen** (`seen`) — die ganze Masse in einen Raum. Sicherer geht nicht.
 * - **Gehört** (`heard`) — ein Geräusch macht die Räume in seiner Nähe
 *   wahrscheinlicher und die dahinter unwahrscheinlicher; nah heißt nicht in
 *   Metern durch die Wand, sondern in **gedämpfter Hörweite** über die Türen
 *   (`StationGraph.earshot`), sonst hört das Monster quer durch die Station.
 * - **Nachgesehen** (`visited`) — es steht im Raum und sieht niemanden. Der
 *   Raum behält einen Rest (`FLOOR`), nicht null: Ein Monster, das einen Raum
 *   für **immer** ausschließt, läuft an einem Spieler vorbei, der hinter ihm
 *   wieder hineingegangen ist.
 * - **Zeit** (`step`) — die Masse zerfließt entlang der Türen (`DRIFT`), und
 *   nach `FORGET` Sekunden ohne eine neue Spur ist alles wieder gleich
 *   wahrscheinlich. Das ist die Bremse gegen Hellsichtigkeit: Ein Bild, das
 *   nicht verfällt, macht aus einer alten Sichtung für den Rest der Runde
 *   einen Wegweiser.
 *
 * **Gesperrte Türen halten den Glauben auf.** Was das Monster selbst
 * zugeschlagen oder der Techniker verriegelt hat (`HauntState.shut`, siehe
 * `rules/doorLocks.ts`), lässt keine Masse durch — wer hinter einem Riegel
 * war, ist noch dort. Für den Schall gilt das **nicht**: Ein Riegel dämpft,
 * aber er ist nicht schalldicht, und `earshot` rechnet die Dämpfung ohnehin
 * schon ein.
 *
 * **Hier steht keine Physik, kein three.js, kein DOM und kein Zufall.**
 * Dieselben Aufrufe in derselben Reihenfolge geben dasselbe Bild — deshalb
 * kann das Training (`roundSim.ts`) es hunderte Runden lang mitlaufen lassen,
 * und deshalb kann ein Test es nachrechnen.
 *
 * **Angeschlossen ist es in `monsterRoutine.ts`** (Paket M2). Dort wird es
 * auch gefüttert: Die Routine sieht Sichtung, Geräusch und den eigenen Raum
 * ohnehin, und ein Gedächtnis, das in 3D, 2D und Simulation von drei
 * verschiedenen Stellen beschrieben wird, ist nach der ersten Änderung drei
 * verschiedene Gedächtnisse. Die Welt besitzt es, meldet ihm, was die Routine
 * nicht sehen kann (`disturbed`), und liest es aus.
 */

/**
 * Welchen Teil ihres Unterschieds zwei benachbarte Räume je Sekunde
 * ausgleichen. Es fließt der **Unterschied** und nicht die Masse: Schüttet
 * jeder Raum je Tür gleich viel aus, verliert der Raum mit vier Türen
 * viermal so schnell wie die Sackgasse, und nach einer Minute glaubt das
 * Monster, der Spieler stecke immer in der hintersten Kammer. Der Ausgleich
 * dagegen läuft dorthin, wo es nichts weiß — auf Gleichverteilung.
 */
export const DRIFT = 0.15;
/** Nach so vielen Sekunden ohne Sichtung oder Geräusch weiß es wieder nichts. */
export const FORGET = 45;
/** Was einem abgesuchten Raum bleibt — nie null, damit er wieder infrage kommt. */
export const FLOOR = 0.01;
/** Wie viele Sichtungen die Spur hält; mehr sagt über die Richtung nichts mehr. */
export const TRACK_LENGTH = 6;
/** Ab diesem Anteil taucht ein Raum im `snapshot` für die Zuschauer auf. */
export const SNAPSHOT_MIN = 0.02;

/**
 * Der größte Zeitschritt, den eine Diffusion am Stück macht. Explizites Euler
 * mit `DRIFT` je Tür schwingt ins Negative, sobald ein Schritt mehr Masse
 * ausschüttet, als im Raum liegt; ein Bild mit negativen Wahrscheinlichkeiten
 * ist kein Bild mehr. Ein hängengebliebenes Einzelbild wird deshalb gekappt,
 * nicht durchgerechnet.
 */
const MAX_STEP = 0.25;
/**
 * Wie schnell die Masse unter den eigenen Füßen schwindet, je Sekunde. Das
 * Monster **steht** in dem Raum: Auch ohne ausdrückliches `visited` wird der
 * Raum, in dem es gerade herumläuft, mit jeder Sekunde unwahrscheinlicher.
 */
const PRESENCE = 0.6;
/** Über wie viele gedämpfte Meter ein Geräusch der Lautstärke 1 etwas aussagt. */
const CARRY = 14;
/** Die kleinste Likelihood eines Geräuschs — kein Raum fällt an einem Knall ganz aus. */
const WHISPER = 0.02;
/**
 * Was eine Tür im Ersatzrechner an Hörweite schluckt (`roomGraph.DOOR_LOSS`
 * ist dieselbe Zahl). Gebraucht wird sie nur, wenn die Welt keine `earshot`
 * mitbringt — der echte `StationGraph` tut es, ein Testaufbau aus fünf
 * Zimmern nicht.
 */
const MUFFLE = 9;
/** Wie stark eine ältere Sichtung in der geglätteten Geschwindigkeit nachwiegt. */
const FADE = 0.5;

export interface Sighting {
  at: FloorPoint;
  time: number;
  sprinting?: boolean;
}

export interface Track {
  /** Höchstens `TRACK_LENGTH` Einträge, die jüngste zuletzt. */
  readonly sightings: readonly Sighting[];
  /**
   * Richtung (Einheitsvektor) und Tempo in m/s, über die letzten Sichtungen
   * geglättet — `null`, solange es weniger als zwei brauchbare gibt.
   */
  velocity(): { dir: FloorPoint; speed: number } | null;
}

/** Wann zuletzt — Rundenzeit in Sekunden, `-Infinity`, wenn nie. */
export interface RoomNote {
  /** Wann das Monster zuletzt selbst darin stand. */
  visited: number;
  /** Wann es ihn zuletzt abgesucht und niemanden gefunden hat. */
  searched: number;
  /** Wann es den Spieler zuletzt darin gesehen hat. */
  seen: number;
  /** Wann es zuletzt ein Geräusch daraus hörte. */
  heard: number;
}

/**
 * Eine Tür, wie das Gedächtnis sie benennt: die beiden Räume, sortiert. Der
 * Bauplan nennt seine Türen `d0`, `d1`, … (`house.ts`); wer diese Liste in
 * `shut` hineinreicht, übersetzt sie über `spec.doors`. Die umgekehrte
 * Reihenfolge wird beim Prüfen mitgenommen — gesperrt ist gesperrt.
 */
export function doorKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/**
 * **Aus Türkennungen Raumpaare machen** — die Übersetzung, die der Konstruktor
 * für `shut` verlangt.
 *
 * `HauntState.shut` führt die Türen so, wie der Bauplan sie nennt (`d7`); das
 * Gedächtnis kennt eine Tür nur als das Paar der Räume, die sie verbindet.
 * Die Haustür hat keinen zweiten Raum — dahinter liegt die Einsatzzentrale,
 * und die heißt in der Karte `command` (`roomGraph.COMMAND`, hier als
 * Vorgabe, damit dieses Modul die Karte nicht importieren muss).
 */
export function shutPairs(
  doors: ReadonlyArray<{ id: string; a: string; b: string | null }>,
  shut: readonly string[],
  outside = 'command',
): string[] {
  if (!shut.length) return [];
  const closed = new Set(shut);
  return doors
    .filter((door) => closed.has(door.id))
    .map((door) => doorKey(door.a, door.b ?? outside));
}

/** Die gedämpfte Hörweite, wie der `StationGraph` sie mitbringt. */
interface Muffled {
  earshot(a: string, b: string): number;
}

function hasEarshot(world: RoutineWorld): world is RoutineWorld & Muffled {
  return typeof (world as Partial<Muffled>).earshot === 'function';
}

function blank(): RoomNote {
  return { visited: -Infinity, searched: -Infinity, seen: -Infinity, heard: -Infinity };
}

export class MonsterMemory {
  private readonly world: RoutineWorld;
  private readonly shut: () => readonly string[];
  private readonly spaces: readonly string[];
  /** Der Glaube je Raum, Summe 1. */
  private readonly mass = new Map<string, number>();
  private readonly notes = new Map<string, RoomNote>();
  private readonly sightings: Sighting[] = [];
  /** Wann zuletzt etwas vom Spieler kam — davon hängt das Vergessen ab. */
  private trace = -Infinity;

  readonly track: Track;

  constructor(world: RoutineWorld, shut: () => readonly string[] = () => []) {
    this.world = world;
    this.shut = shut;
    this.spaces = [...world.spaces];
    for (const id of this.spaces) this.notes.set(id, blank());
    this.spread();
    const sightings = this.sightings;
    this.track = {
      get sightings(): readonly Sighting[] {
        return sightings;
      },
      velocity: () => this.velocity(),
    };
  }

  /**
   * **Gesehen.** Die ganze Masse in diesen Raum — und die Stelle in die Spur,
   * denn aus zwei Stellen wird eine Richtung. Ist der Raum unbekannt (ein
   * Aufrufer, der ihn anders nennt), rettet `spaceAt` den Punkt.
   */
  seen(room: string, at: FloorPoint, time: number, sprinting?: boolean): void {
    const where = this.mass.has(room) ? room : (this.world.spaceAt?.(at) ?? '');
    this.sightings.push({ at: { x: at.x, z: at.z }, time, sprinting });
    while (this.sightings.length > TRACK_LENGTH) this.sightings.shift();
    this.trace = time;
    const note = this.notes.get(where);
    if (note) note.seen = time;
    if (!this.mass.has(where)) return;
    for (const id of this.spaces) this.mass.set(id, id === where ? 1 : 0);
  }

  /**
   * **Da drüben ist gerade etwas passiert.** Die ganze Masse in diesen Raum —
   * wie bei einer Sichtung, aber ohne Eintrag in der Spur.
   *
   * Gemeint ist ein Ereignis, das die Station selbst macht und nicht der
   * Körper des Technikers: eine fertige Reparatur. Die Konsole fährt hoch, die
   * Sicherung fällt, im Modul flackert das Licht — das ist über die halbe
   * Station zu hören und zu sehen, und dass jemand daneben gestanden haben
   * muss, ist keine Hellsichtigkeit, sondern ein Schluss, den jedes Tier zieht.
   *
   * **Warum nicht einfach `seen`.** Weil eine Sichtung zwei Dinge behauptet:
   * *wo* jemand ist und *wohin* er läuft. Das Zweite steckt in der Spur
   * (`track`), aus der die Abfangrechnung Richtung und Tempo zieht
   * (`monster/monsterIntercept.ts`). Ein Aufruhr sagt über die Richtung
   * nichts. Als `seen` gebucht, hätte er eine erfundene Sichtung an einen Ort
   * gesetzt, an dem der Techniker im nächsten Moment schon nicht mehr steht —
   * und die Prognose hätte daraus eine Fahrtrichtung gerechnet, die es nie
   * gab. Deshalb steht das Ereignis im Notizzettel unter `heard`, wo die
   * Wahrheit steht: gemerkt, nicht gesehen.
   */
  disturbed(room: string, at: FloorPoint, time: number): void {
    const where = this.mass.has(room) ? room : (this.world.spaceAt?.(at) ?? '');
    if (!this.mass.has(where)) return;
    this.trace = time;
    const note = this.notes.get(where);
    if (note) note.heard = time;
    for (const id of this.spaces) this.mass.set(id, id === where ? 1 : 0);
  }

  /**
   * **Gehört.** Je Raum eine Likelihood aus der gedämpften Hörweite zum
   * Krachort, multiplikativ auf den Glauben, danach neu normiert.
   *
   * Die Lautstärke steuert die **Schärfe**, nicht die Richtung: Ein lauter
   * Sprint ist gut zu orten und drückt die Masse dicht um den Krachort
   * zusammen; ein Scharren am anderen Ende ist ein Gerücht und verschiebt
   * kaum etwas. Ohne `spaceAt` weiß das Gedächtnis nicht, wo es geknallt hat
   * — dann bleibt das Bild, wie es war.
   */
  heard(at: FloorPoint, loudness: number, time: number): void {
    const where = this.world.spaceAt?.(at) ?? '';
    if (!this.mass.has(where)) return;
    const reach = CARRY / Math.max(0.05, Math.min(1, loudness));
    let total = 0;
    const next = new Map<string, number>();
    for (const id of this.spaces) {
      const far = this.muffled(where, id);
      const like = Math.max(WHISPER, Number.isFinite(far) ? Math.exp(-far / reach) : 0);
      const p = this.mass.get(id)! * like;
      next.set(id, p);
      total += p;
    }
    const note = this.notes.get(where);
    if (note) note.heard = time;
    this.trace = time;
    // Ein Geräusch, das jeden Raum ausschließt, ist ein Rechenfehler und kein
    // Wissen: Dann bleibt das alte Bild stehen.
    if (!(total > 0)) return;
    for (const [id, p] of next) this.mass.set(id, p / total);
  }

  /**
   * **Nachgesehen und niemanden gefunden.** Der Raum fällt auf `FLOOR`, der
   * Rest wird neu normiert. Lag die ganze Masse hier, gibt es nichts zu
   * normieren — sonst käme durch das Teilen durch fast null genau die
   * Gewissheit wieder heraus, die gerade widerlegt wurde. Dann ist der
   * Spieler eben irgendwo **sonst**: `FLOOR` bleibt hier liegen, der Rest
   * verteilt sich gleichmäßig auf die anderen Räume.
   */
  visited(room: string, time: number): void {
    const note = this.notes.get(room);
    if (!note) return;
    note.visited = time;
    note.searched = time;
    const rest = 1 - this.mass.get(room)!;
    if (rest < FLOOR) {
      const others = this.spaces.length - 1;
      if (others < 1) return;
      for (const id of this.spaces) this.mass.set(id, id === room ? FLOOR : (1 - FLOOR) / others);
      return;
    }
    this.mass.set(room, FLOOR);
    this.normalize();
  }

  /**
   * **Ein Zeitschritt.** Erst zerfließen (oder vergessen), dann die Masse
   * unter den eigenen Füßen abtragen. `here` darf leer sein — dann steht das
   * Monster nirgends, was in der Simulation vorkommt.
   */
  step(dt: number, here: string, time: number): void {
    const slice = Math.max(0, Math.min(MAX_STEP, dt));
    if (time - this.trace >= FORGET) this.spread();
    else if (slice > 0) this.diffuse(slice);
    const note = this.notes.get(here);
    if (!note) return;
    note.visited = time;
    if (slice <= 0) return;
    this.mass.set(here, this.mass.get(here)! * Math.max(0, 1 - PRESENCE * slice));
    this.normalize();
  }

  /** Wie wahrscheinlich der Spieler in diesem Raum ist; 0 für alles Unbekannte. */
  belief(room: string): number {
    return this.mass.get(room) ?? 0;
  }

  /** Der wahrscheinlichste Raum; bei Gleichstand der erste aus `world.spaces`. */
  mostLikely(): string {
    let best = this.spaces[0] ?? '';
    let top = -Infinity;
    for (const id of this.spaces) {
      const p = this.mass.get(id)!;
      if (p > top) {
        top = p;
        best = id;
      }
    }
    return best;
  }

  /** Der mit dem Glauben gewichtete Mittelpunkt — der Schwerpunkt der Vermutung. */
  expected(): FloorPoint {
    let x = 0;
    let z = 0;
    for (const id of this.spaces) {
      const p = this.mass.get(id)!;
      const c = this.world.centre(id);
      x += p * c.x;
      z += p * c.z;
    }
    return { x, z };
  }

  /**
   * **Wie sicher sich das Monster ist**, 0 bis 1: die auf die Raumzahl
   * normierte Entropie, umgedreht. 1 heißt „genau dort", 0 heißt „keine
   * Ahnung" — und genau daran hängt später, ob es verfolgt oder erst sucht.
   */
  certainty(): number {
    const most = Math.log(this.spaces.length);
    if (!(most > 0)) return 1;
    let entropy = 0;
    for (const id of this.spaces) {
      const p = this.mass.get(id)!;
      if (p > 0) entropy -= p * Math.log(p);
    }
    return Math.max(0, Math.min(1, 1 - entropy / most));
  }

  /**
   * **Die Türen dieses Raums mit dem Anteil des Zuflusses**, absteigend. Jeder
   * erreichbare Raum wird der Tür zugerechnet, über die er von `room` aus
   * zuerst erreicht wird; die Anteile summieren zu 1. Das ist die Frage vor
   * dem Auflauern: Wo kommt er wahrscheinlich herein — und mit `belief(room)`
   * dazu: Wo kommt er wahrscheinlich **heraus**.
   *
   * Gesperrte Türen stehen nicht in der Liste: Durch einen Riegel fließt
   * nichts, und lauern kann man dort auch nicht.
   */
  exits(room: string): Array<{ door: string; share: number }> {
    if (!this.mass.has(room)) return [];
    const closed = this.closed();
    const open = this.open(room, closed);
    if (!open.length) return [];
    // Breitensuche von `room` aus: Jeder Raum gehört der Tür, über die er
    // zuerst erreicht wird. Die Reihenfolge von `neighbours` entscheidet die
    // Gleichstände — damit ist auch das Ergebnis wieder deterministisch.
    const owner = new Map<string, string>();
    const queue: string[] = [];
    for (const door of open) {
      if (owner.has(door)) continue;
      owner.set(door, door);
      queue.push(door);
    }
    for (let i = 0; i < queue.length; i++) {
      const id = queue[i]!;
      for (const next of this.open(id, closed)) {
        if (next === room || owner.has(next)) continue;
        owner.set(next, owner.get(id)!);
        queue.push(next);
      }
    }
    const shares = new Map<string, number>(open.map((id) => [id, 0]));
    let total = 0;
    for (const [id, door] of owner) {
      const p = this.mass.get(id)!;
      shares.set(door, (shares.get(door) ?? 0) + p);
      total += p;
    }
    return open
      .map((id, index) => ({
        door: doorKey(room, id),
        share: total > 0 ? shares.get(id)! / total : 1 / open.length,
        index,
      }))
      .sort((a, b) => (b.share === a.share ? a.index - b.index : b.share - a.share))
      .map(({ door, share }) => ({ door, share }));
  }

  /**
   * **Die `n` Räume, in denen es am längsten nicht war** — die Liste für die
   * Patrouille und den Seitenwechsel. Nie betretene Räume stehen vorn.
   */
  leastRecentlyVisited(n: number): string[] {
    return this.spaces
      .map((id, index) => ({ id, index, when: this.notes.get(id)!.visited }))
      .sort((a, b) => (a.when === b.when ? a.index - b.index : a.when < b.when ? -1 : 1))
      .slice(0, Math.max(0, Math.trunc(n)))
      .map(({ id }) => id);
  }

  /** Der Notizzettel eines Raums — eine Kopie, damit niemand von außen hineinschreibt. */
  note(room: string): RoomNote {
    return { ...(this.notes.get(room) ?? blank()) };
  }

  /** Was die Zuschauer sehen sollen: die Räume, in denen nennenswert Glaube liegt. */
  snapshot(): Array<{ roomId: string; p: number }> {
    return this.spaces
      .map((roomId, index) => ({ roomId, p: this.mass.get(roomId)!, index }))
      .filter(({ p }) => p > SNAPSHOT_MIN)
      .sort((a, b) => (b.p === a.p ? a.index - b.index : b.p - a.p))
      .map(({ roomId, p }) => ({ roomId, p }));
  }

  /** Gleichverteilung: der Zustand, in dem es nichts weiß. */
  private spread(): void {
    const share = this.spaces.length ? 1 / this.spaces.length : 0;
    for (const id of this.spaces) this.mass.set(id, share);
  }

  private normalize(): void {
    let total = 0;
    for (const id of this.spaces) total += this.mass.get(id)!;
    if (!(total > 0)) {
      this.spread();
      return;
    }
    for (const id of this.spaces) this.mass.set(id, this.mass.get(id)! / total);
  }

  /** Die gesperrten Türen dieses Augenblicks, als Menge von Türschlüsseln. */
  private closed(): ReadonlySet<string> {
    return new Set(this.shut());
  }

  /** Die Nachbarn hinter offenen Türen, in der Reihenfolge der Welt. */
  private open(room: string, closed: ReadonlySet<string>): string[] {
    return this.world
      .neighbours(room)
      .filter(
        (id) => this.mass.has(id) && !closed.has(`${room}|${id}`) && !closed.has(`${id}|${room}`),
      );
  }

  /** Jede offene Tür einmal, als Paar in der Reihenfolge der Welt. */
  private doors(closed: ReadonlySet<string>): Array<[string, string]> {
    const seen = new Set<string>();
    const out: Array<[string, string]> = [];
    for (const id of this.spaces)
      for (const other of this.open(id, closed)) {
        const key = doorKey(id, other);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push([id, other]);
      }
    return out;
  }

  private diffuse(dt: number): void {
    const closed = this.closed();
    const next = new Map<string, number>(this.spaces.map((id) => [id, this.mass.get(id)!]));
    // Jede Tür genau einmal: Wer beide Richtungen rechnet, tauscht doppelt so
    // schnell aus, wie `DRIFT` verspricht.
    for (const [from, to] of this.doors(closed)) {
      const flow = (this.mass.get(from)! - this.mass.get(to)!) * DRIFT * dt;
      next.set(from, next.get(from)! - flow);
      next.set(to, next.get(to)! + flow);
    }
    for (const [id, p] of next) this.mass.set(id, Math.max(0, p));
    this.normalize();
  }

  /**
   * Die gedämpfte Hörweite zwischen zwei Räumen. Der `StationGraph` bringt sie
   * fertig mit (Floyd–Warshall, einmal je Station); für eine Welt ohne sie
   * rechnet Dijkstra über höchstens ein paar Dutzend Knoten dasselbe nach.
   */
  private muffled(from: string, to: string): number {
    if (hasEarshot(this.world)) return this.world.earshot(from, to);
    if (from === to) return 0;
    const open = new Set(this.spaces);
    const cost = new Map<string, number>(this.spaces.map((id) => [id, Infinity]));
    cost.set(from, 0);
    while (open.size) {
      let id = '';
      let best = Infinity;
      for (const candidate of open) {
        const c = cost.get(candidate)!;
        if (c < best) {
          best = c;
          id = candidate;
        }
      }
      if (!id) break;
      if (id === to) return best;
      open.delete(id);
      const a = this.world.centre(id);
      for (const other of this.world.neighbours(id)) {
        if (!open.has(other)) continue;
        const b = this.world.centre(other);
        const step = best + Math.hypot(a.x - b.x, a.z - b.z) + MUFFLE;
        if (step < cost.get(other)!) cost.set(other, step);
      }
    }
    return cost.get(to) ?? Infinity;
  }

  /**
   * Richtung und Tempo aus der Spur. Jüngere Abschnitte wiegen doppelt so
   * schwer wie ihre Vorgänger (`FADE`): Aus zwei Sichtungen kommt genau der
   * Vektor zwischen ihnen heraus, aus sechs eine geglättete Fahrtrichtung, in
   * der ein einzelner Haken nicht die ganze Prognose umwirft.
   */
  private velocity(): { dir: FloorPoint; speed: number } | null {
    const list = this.sightings;
    if (list.length < 2) return null;
    let x = 0;
    let z = 0;
    let weight = 0;
    let w = 1;
    for (let i = list.length - 1; i > 0; i--) {
      const from = list[i - 1]!;
      const to = list[i]!;
      const span = to.time - from.time;
      if (span > 0) {
        x += (w * (to.at.x - from.at.x)) / span;
        z += (w * (to.at.z - from.at.z)) / span;
        weight += w;
      }
      w *= FADE;
    }
    if (!(weight > 0)) return null;
    x /= weight;
    z /= weight;
    const speed = Math.hypot(x, z);
    return { dir: speed > 0 ? { x: x / speed, z: z / speed } : { x: 0, z: 0 }, speed };
  }
}
