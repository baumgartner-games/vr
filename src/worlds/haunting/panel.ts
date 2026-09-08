import type { Rng } from './rng';
import type { HouseDoor, HouseRoom } from './house';

/**
 * **Die Schalttafel des Hackers** — das Haus als Stromlaufplan.
 *
 * Sie ist die fünfte Sprache am Tisch. Der Archivar redet in Namen, der Späher
 * in Formen, der VR-Spieler in Dingen, die er sieht — und der Hacker in
 * Schaltern, von denen er nicht weiß, wo sie hingehen. Genau deshalb muss er
 * reden.
 *
 * **Beschriftungen lügen nie, sie sind nur unvollständig.** Das ist die eine
 * Regel, an der alles hängt. `Licht Küche` schaltet immer das Licht der Küche;
 * `Wohnzimmer` schaltet *irgendetwas* im Wohnzimmer; `Tür 3` sagt gar nichts
 * über den Ort, aber es ist wirklich eine Tür. Unvollständigkeit lässt sich
 * durch Ausprobieren und Zurufen auflösen — eine Lüge nicht, denn sie macht
 * jede andere Zeile auf der Tafel wertlos, und die halbe Stunde Kartierung
 * gleich mit. (Wenn später einmal ein Verräter mitspielt, ist genau **das**
 * seine Waffe. Bis dahin: keine Lügen.)
 *
 * **Die Hälfte der Tafel ist tot, bis jemand den Sicherungskasten findet.**
 * Vorher hat der Hacker vier Schalter und langweilt sich fast; danach hat er
 * zwölf und ist der wichtigste Mensch im Van. Der Weg dorthin führt über den
 * Archivar (er weiß, in welchem Zimmer der Kasten hängt) und über den
 * VR-Spieler (nur er kann ihn umlegen) — es ist die eine Stelle, an der drei
 * Rollen zwingend nacheinander dran sind.
 */
export interface PanelSwitch {
  id: string;
  /** Was auf der Tafel steht. Wahr, aber vielleicht nicht genug. */
  label: string;
  kind: 'light' | 'door' | 'radio';
  /** Die Zimmer- oder Tür-Kennung, auf die der Schalter wirkt. */
  target: string;
  /** Ob er erst nach dem Sicherungskasten auftaucht. */
  hidden: boolean;
  /** Der Anfangszustand: Licht aus, Türen offen, Radios aus. */
  on: boolean;
}

/** Wie viele Radios ein Haus bekommt — Lärm ist ein Köder, kein Möbelstück. */
const RADIOS = 2;

/**
 * Die Tafel zu einem Haus.
 *
 * Aufgebaut wird sie in einer festen Reihenfolge (Licht, Türen, Radios) und
 * danach **gemischt**: Stünden die Sorten in Blöcken, könnte man aus der
 * Position ablesen, was ein `X` ist, und die halbe Aufgabe wäre weg.
 */
export function buildPanel(
  rng: Rng,
  rooms: readonly HouseRoom[],
  doors: readonly HouseDoor[],
): PanelSwitch[] {
  const out: PanelSwitch[] = [];

  for (const room of rooms) {
    if (!room.lamp) continue;
    out.push({
      id: `s-light-${room.id}`,
      label: '',
      kind: 'light',
      target: room.id,
      hidden: false,
      on: false,
    });
  }

  for (const door of doors) {
    out.push({
      id: `s-door-${door.id}`,
      label: '',
      kind: 'door',
      target: door.id,
      hidden: false,
      // Türen stehen zu Beginn offen: Ein Haus, das man erst aufschließen
      // muss, um es zu betreten, fängt mit Warten an.
      on: true,
    });
  }

  const withRadio = rng.shuffle(rooms).slice(0, RADIOS);
  for (const room of withRadio) {
    out.push({
      id: `s-radio-${room.id}`,
      label: '',
      kind: 'radio',
      target: room.id,
      hidden: false,
      on: false,
    });
  }

  const mixed = rng.shuffle(out);
  label(rng, mixed, rooms, doors);
  hideHalf(rng, mixed);
  return mixed;
}

/**
 * **Vier Sorten Beschriftung**, und jede ist eine andere Art, zu wenig zu
 * sagen.
 *
 * - *genau* — `Licht Küche`. Es muss sie geben, sonst kommt niemand hinein.
 * - *unklarer Umfang* — `Wohnzimmer`. Welches Gerät denn?
 * - *unklare Instanz* — `Tür 2`. Welche denn?
 * - *gar nichts* — `X`. Das Zimmer, in dem alle raten.
 */
function label(
  rng: Rng,
  list: PanelSwitch[],
  rooms: readonly HouseRoom[],
  doors: readonly HouseDoor[],
): void {
  const roomName = new Map(rooms.map((room) => [room.id, room.name]));
  const doorRoom = new Map(doors.map((door) => [door.id, door.a]));
  let doorCount = 0;
  let blankCount = 0;

  for (const entry of list) {
    const room =
      entry.kind === 'door'
        ? roomName.get(doorRoom.get(entry.target) ?? '')
        : roomName.get(entry.target);
    const roll = rng.next();

    if (roll < 0.3 && room) {
      entry.label = `${sortLabel(entry.kind)} ${room}`;
    } else if (roll < 0.6 && room && entry.kind !== 'door') {
      // Der Umfang fehlt: Man weiß das Zimmer und nicht das Gerät.
      entry.label = room;
    } else if (roll < 0.85) {
      // Die Instanz fehlt: Man weiß die Sorte und nicht, welche davon.
      entry.label = `${sortLabel(entry.kind)} ${++doorCount}`;
    } else {
      entry.label = blankCount++ === 0 ? 'X' : `X${blankCount}`;
    }
  }
}

function sortLabel(kind: PanelSwitch['kind']): string {
  return kind === 'light' ? 'Licht' : kind === 'door' ? 'Tür' : 'Radio';
}

/**
 * Etwa die Hälfte liegt hinter dem Sicherungskasten — aber **nie alles
 * Licht**: Eine Tafel, auf der zu Beginn kein einziger Schalter etwas
 * Sichtbares tut, sieht kaputt aus und nicht spannend.
 */
function hideHalf(rng: Rng, list: PanelSwitch[]): void {
  let visibleLights = 0;
  for (const entry of list) {
    if (entry.kind === 'light' && visibleLights < 2) {
      visibleLights++;
      continue;
    }
    entry.hidden = rng.chance(0.5);
  }
}

/** Was der Hacker gerade sehen darf. */
export function visibleSwitches(
  list: readonly PanelSwitch[],
  fuseOn: boolean,
): readonly PanelSwitch[] {
  return fuseOn ? list : list.filter((entry) => !entry.hidden);
}
