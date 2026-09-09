import { DIR_E, DIR_N, DIR_S, TILE, type Dir } from '../nav/navTile';
import { roomAt, spacesOf, type HouseDoor, type HouseSpec } from './house';

/**
 * **Was das Monster mit dem Haus macht, während es darin herumläuft.**
 *
 * Bis hierher war es ein Verfolger und sonst nichts: Es lief einem hinterher,
 * und das Haus stand still darum herum. Damit hatte der Hacker im Van vier
 * Schalter und niemanden, der etwas kaputt macht — er legte einmal Licht an,
 * einmal eine Tür zu, und danach war seine Tafel ein Zustand und kein Spiel.
 *
 * **Jetzt richtet das Monster etwas an, und zwar nur in seiner Nähe.** Wo es
 * steht, zuckt die Lampe und geht aus; wo es an einer Tür vorbeikommt, fällt
 * sie zu. Das ist keine Kulisse, sondern die Arbeit, die den Hacker braucht:
 * Alles, was das Monster anstellt, kann genau eine Rolle rückgängig machen —
 * die, die an der Tafel sitzt und nicht sieht, wo ihre Schalter hingehen.
 *
 * **Drei Regeln, und alle drei aus demselben Grund** — der Spuk soll drängen
 * und nicht blockieren:
 *
 * - **Das Flackern ist ehrlich.** Eine Lampe zuckt genau dann, wenn das
 *   Monster in ihrem Zimmer steht — für den VR-Spieler die eine Warnung, die
 *   er ohne Van bekommt, und für den Hacker das, was er *nicht* sieht und sich
 *   zurufen lassen muss. Weil sie nur an der Monsterposition hängt, rechnet
 *   sie jedes Gerät selbst; über die Leitung geht dafür kein einziges Byte.
 * - **Niemand wird eingesperrt.** Eine Tür fällt nur zu, wenn danach noch
 *   jedes Zimmer von der Haustür aus erreichbar ist, und die Haustür selbst
 *   fällt nie zu. Ein Monster, das einen in einer Kammer einmauert, deren
 *   Schalter hinter dem Sicherungskasten liegt, beendet die Runde ohne
 *   Gegenspiel — und das ist keine Spannung, sondern ein Abbruch.
 * - **Nach jedem Streich ist Ruhe** (`HAUNT_REST`). Ohne die Pause wäre die
 *   Tafel ein Wettrennen gegen einen, der schneller klickt als ein Mensch, und
 *   der Hacker hörte auf, es zu versuchen.
 *
 * Alles hier ist **reine Rechnung ohne three.js**: Die Welt gibt ihren Stand
 * hinein und bekommt heraus, was jetzt passiert. Der Gastgeber wendet das an,
 * alle anderen werfen es weg und behalten nur das Flackern — dieselbe
 * Zustandsmaschine läuft überall, und deshalb sieht jeder dasselbe Zucken,
 * ohne dass jemand es ansagen müsste.
 */

/** Wie lange das Monster in einem Zimmer sein muss, bis es dort etwas anstellt. */
export const HAUNT_WAIT = 2.4;

/**
 * Und wie lange es danach nichts anstellt.
 *
 * Lang genug, dass der Hacker den Schalter findet, den er suchen muss: Die
 * Tafel ist eine Wand aus Beschriftungen, und wer dort in zwei Sekunden das
 * Richtige treffen soll, klickt am Ende alles um.
 */
export const HAUNT_REST = 7;

/**
 * **Wie nah eine Tür sein muss, damit sie zufällt** — in Kacheln, von der
 * Mitte der Türkante aus gemessen.
 *
 * Eineinhalb Kacheln: die Tür des Zimmers, in dem es steht, und zwar die, an
 * der es gerade vorbeigeht. Weiter gefasst schlüge ein Monster im Nachbarraum
 * Türen zu, die niemand mit ihm in Verbindung bringt — und ein Spuk, den man
 * nicht verorten kann, ist ein Fehler und kein Schreck.
 */
export const SLAM_REACH = 1.5;

/** Was das Monster gerade treibt — der ganze Zustand des Spuks. */
export interface Spook {
  /** Das Zimmer, in dem es steht. `''`, solange es in keinem steht. */
  room: string;
  /** Wie lange es schon darin steht, in Sekunden. */
  since: number;
  /** Wie lange es noch nichts anstellt. */
  rest: number;
}

/** Was der Spuk in diesem Bild anrichtet — beim Gastgeber, sonst nirgends. */
export interface Spooked {
  spook: Spook;
  /** Das Zimmer, dessen Licht jetzt ausgeht — `''` für keines. */
  lightOut: string;
  /** Die Tür, die jetzt zufällt — `''` für keine. */
  doorShut: string;
}

/** Was die Zustandsmaschine vom Haus wissen muss. */
export interface HauntSight {
  spec: HouseSpec;
  /** Wo das Monster steht, in Metern — `null`, wenn es keines gibt. */
  monster: { x: number; z: number } | null;
  /** Die Zimmer, in denen Licht brennt. */
  lit: readonly string[];
  /** Die Türen, die schon zu sind. */
  shut: readonly string[];
}

/** Ein Haus ohne Spuk — der Anfang jeder Runde. */
export function freshSpook(): Spook {
  return { room: '', since: 0, rest: HAUNT_REST };
}

/**
 * **Ein Bild Spuk.**
 *
 * Die Reihenfolge ist die Regel: erst das Licht, dann die Tür. Ein Monster,
 * das im hellen Zimmer zuerst die Tür zuwirft, verrät sich zweimal — der
 * Schlag *und* das Licht, das noch brennt. Erst das Licht heißt: Zuerst wird
 * es dunkel, und **dann** hört man etwas, das man nicht mehr sieht.
 */
export function stepHaunt(spook: Spook, sight: HauntSight, dt: number): Spooked {
  const rest = Math.max(0, spook.rest - dt);
  const at = sight.monster;
  const here = at ? roomAt(sight.spec, tileOf(at.x), tileOf(at.z)) : null;
  if (!at || !here) {
    // Draußen, oder gar kein Monster: Der Zähler fängt von vorn an, sonst
    // stellt es in dem Moment etwas an, in dem es wieder hereinkommt.
    return { spook: { room: '', since: 0, rest }, lightOut: '', doorShut: '' };
  }

  const same = here.id === spook.room;
  const since = same ? spook.since + dt : 0;
  const waiting = { spook: { room: here.id, since, rest }, lightOut: '', doorShut: '' };
  if (rest > 0 || since < HAUNT_WAIT) return waiting;

  if (sight.lit.includes(here.id)) {
    return {
      spook: { room: here.id, since: 0, rest: HAUNT_REST },
      lightOut: here.id,
      doorShut: '',
    };
  }

  const door = slammable(sight, at, here.id);
  if (!door) return waiting;
  return { spook: { room: here.id, since: 0, rest: HAUNT_REST }, lightOut: '', doorShut: door.id };
}

/**
 * **Wie hell eine flackernde Lampe gerade ist**, als Anteil ihrer vollen
 * Stärke.
 *
 * Eine reine Funktion der Zeit und sonst nichts: Jedes Gerät rechnet sie
 * selbst, und weil sie nur davon abhängt, wie lange das Monster schon im
 * Zimmer steht, kommen alle auf dasselbe Zucken, ohne dass es jemand ansagt.
 *
 * **Sie zuckt tiefer, je näher das Aus kommt.** Am Anfang ein kaum sichtbares
 * Zittern, kurz vor Schluss ein Blinken, das die halbe Zeit dunkel ist — daran,
 * und nur daran, merkt der VR-Spieler, dass ihm gleich das Licht ausgeht. Es
 * ist die einzige Warnung, die er bekommt, **bevor** etwas passiert; alles
 * andere hört er erst, wenn es schon zugefallen ist.
 *
 * Zwei Sinus übereinander und kein Zufall: Ein `Math.random()` je Bild
 * flimmerte auf einem 120-Hz-Gerät anders als auf einem mit 72, und zwei
 * ungerade Frequenzen sehen unruhiger aus als eine.
 */
export function flickerLevel(since: number): number {
  if (since <= 0) return 1;
  const urge = Math.min(1, since / HAUNT_WAIT);
  const buzz = Math.sin(since * 37) * Math.sin(since * 11.3);
  return Math.min(1, Math.max(0, 1 - urge * (0.5 + 0.5 * buzz)));
}

/**
 * Die Tür, die jetzt zufällt — die **nächstgelegene**, die niemanden
 * aussperrt.
 *
 * Die nächstgelegene und keine gewürfelte: Ein Schlag, den man hört, gehört zu
 * der Tür, neben der das Monster gerade steht. Alles andere wäre ein Geräusch
 * aus dem Nichts, und der VR-Spieler kann daraus nichts machen, was er
 * weitersagen könnte.
 */
function slammable(
  sight: HauntSight,
  at: { x: number; z: number },
  room: string,
): HouseDoor | null {
  const shut = new Set(sight.shut);
  let best: HouseDoor | null = null;
  let bestGap = SLAM_REACH;
  for (const door of sight.spec.doors) {
    // Die Haustür bleibt in Ruhe: Sie ist der Weg hinaus, und was durch sie
    // hinausgetragen wird, ist die ganze Aufgabe.
    if (door.b === null || shut.has(door.id)) continue;
    if (door.a !== room && door.b !== room) continue;
    const edge = doorCentre(door);
    const gap = Math.hypot(edge.x - at.x / TILE, edge.z - at.z / TILE);
    if (gap > bestGap) continue;
    if (sealsOff(sight.spec, shut, door.id)) continue;
    best = door;
    bestGap = gap;
  }
  return best;
}

/**
 * **Ob diese Tür jemanden aussperrt.**
 *
 * Gefragt wird nicht „hat das Zimmer noch eine offene Tür", sondern: **Kommt
 * man von der Haustür aus noch überall hin?** Der Unterschied ist zwei Zimmer,
 * die nur noch aneinander hängen — beide hätten eine offene Tür, und trotzdem
 * wäre der halbe Grundriss abgeschnitten.
 *
 * Ein Rundgang über höchstens sieben Zimmer und ein Dutzend Türen: Das kostet
 * nichts, und es passiert ohnehin nur alle paar Sekunden einmal.
 */
function sealsOff(spec: HouseSpec, shut: ReadonlySet<string>, closing: string): boolean {
  const open = spec.doors.filter(
    (door) => door.b !== null && door.id !== closing && !shut.has(door.id),
  );
  const seen = new Set([spec.entryRoom]);
  const queue = [spec.entryRoom];
  while (queue.length > 0) {
    const room = queue.shift()!;
    for (const door of open) {
      const next = door.a === room ? door.b! : door.b === room ? door.a : null;
      if (!next || seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return spacesOf(spec).some((room) => !seen.has(room.id));
}

/**
 * Die Mitte einer Türkante, in Kacheln.
 *
 * Auf der Kante und nicht auf der Kachel: Der Bauplan sagt „an dieser Kachel,
 * in dieser Richtung", die Tür sitzt aber auf der Kante dazwischen. Eine halbe
 * Kachel ist gut ein Meter, und um so viel danebengegriffen schlüge das
 * Monster Türen zu, an denen es gar nicht vorbeigekommen ist.
 */
function doorCentre(door: { x: number; z: number; dir: Dir }): { x: number; z: number } {
  const alongX = door.dir === DIR_N || door.dir === DIR_S;
  return {
    x: door.x + (alongX ? 0.5 : door.dir === DIR_E ? 1 : 0),
    z: door.z + (alongX ? (door.dir === DIR_S ? 1 : 0) : 0.5),
  };
}

/** Aus Metern eine Kachel — dieselbe Rechnung wie `droneRoute.tileAt`. */
function tileOf(metres: number): number {
  return Math.floor(metres / TILE);
}
