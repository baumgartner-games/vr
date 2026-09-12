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
 * **Jede Tür und jede Lampe hat einen Schalter, und alle sind von Anfang an
 * da.** Lange lag die Hälfte davon hinter dem Sicherungskasten: erst vier
 * Schalter, nach dem Kasten zwölf. Das war als Verzahnung gedacht — Archivar,
 * Techniker, Tafel nacheinander —, und es war im Spiel ein Fehler: In der
 * 2D-Welt legte nie jemand den Kasten um, im Schiff erst nach der ersten
 * Reparatur, und wer die Fähigkeit Schalttafel hielt, tippte auf das Licht im
 * Upper Engine oder auf das Schott zum Reaktor-Ostgang und bekam „dafür gibt
 * es keinen Schalter". Der Besitzer hat entschieden: Wer schalten darf, darf
 * alles schalten. Was die Tafel knapp hält, sind seither die Regeln der
 * Riegel und Lampen (`rules/doorLocks.ts`, `rules/lamps.ts`) — ein Riegel,
 * zwei Lampen —, nicht eine Liste, die zur Hälfte fehlt.
 */
export interface PanelSwitch {
  id: string;
  /** Was auf der Tafel steht. Wahr, aber vielleicht nicht genug. */
  label: string;
  kind: 'light' | 'door';
  /** Die Zimmer- oder Tür-Kennung, auf die der Schalter wirkt. */
  target: string;
  /** Der Anfangszustand: Licht aus, Türen offen. */
  on: boolean;
}

/**
 * Die Tafel zu einem Haus.
 *
 * Aufgebaut wird sie in einer festen Reihenfolge (Licht, Türen) und danach
 * **gemischt**: Stünden die Sorten in Blöcken, könnte man aus der Position
 * ablesen, was ein `X` ist, und die halbe Aufgabe wäre weg.
 *
 * **Die Schallköder sind weg.** Es gab einmal eine dritte Sorte Schalter —
 * ein Radio je zwei Zimmer, das das Monster anlockte. Sie war der einzige
 * direkte Griff der Tafel an das Monster und genau deshalb falsch: Wer den
 * richtigen Knopf gefunden hatte, parkte das Vieh in einer Ecke der Station
 * und der Rest der Runde fand ohne es statt. Was die Tafel auf das Monster
 * ausrichten darf, ist Licht und ein Riegel — beides Auskunft und keine
 * Fernsteuerung.
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
      on: false,
    });
  }

  for (const door of doors) {
    out.push({
      id: `s-door-${door.id}`,
      label: '',
      kind: 'door',
      target: door.id,
      // Türen stehen zu Beginn offen: Ein Haus, das man erst aufschließen
      // muss, um es zu betreten, fängt mit Warten an.
      on: true,
    });
  }

  const mixed = rng.shuffle(out);
  label(rng, mixed, rooms, doors);
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
  return kind === 'light' ? 'Licht' : 'Tür';
}
