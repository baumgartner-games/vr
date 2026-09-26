import { DIR_E, DIR_N, DIR_W, type Dir } from '../../nav/navTile';

/**
 * **Das Lüftungsnetz der Station — als Daten.**
 *
 * Eine Klappe sitzt in einer Wand eines Raums: `roomId` ist der Raum aus
 * `house.ts` (fester Skeld-Grundriss, `r0`…`r13`), `x`/`z` die Kachel **im
 * Raum**, an deren Wand in Richtung `dir` die Klappe hängt. Die Verbindungen
 * sind Paare von Klappen-Kennungen; wer hier eine Zeile ändert, ändert das
 * Netz — nirgends sonst steht, welche Klappe wohin führt.
 *
 * **Nicht jede Klappe ist mit jeder verbunden.** Vier getrennte Netze wie
 * auf der Vorlage: Reaktor mit den beiden Triebwerken, Sicherheit mit
 * MedBay und Elektrik, Cafeteria mit Admin, Lager mit Kommunikation,
 * Waffen mit Navigation und Schilden. Wer von der Cafeteria zur Navigation
 * will, muss laufen.
 *
 * Die Klappen hängen an **Innenwänden** (zu Gängen und Nachbarräumen) und
 * nie in einer Türöffnung — seit die Türen zwei Kacheln breit sind
 * (`house.STATION_DOOR_SPAN`), eine Kachel weiter von der Tür weg als vorher; `vents/ventGraph.ts` prüft beides beim Laden, und
 * `ventGraph.test.ts` beim Bauen. Die Hüllenfenster werden je Runde
 * gewürfelt (`house.stationWindows`) und liegen nur in Außenwänden — deshalb
 * kommen sie einer Klappe nicht in die Quere.
 */
export interface VentFlapData {
  id: string;
  roomId: string;
  x: number;
  z: number;
  dir: Dir;
}

export interface VentNetData {
  flaps: readonly VentFlapData[];
  /** Paare von Klappen-Kennungen; die Fahrt geht in beide Richtungen. */
  links: ReadonlyArray<readonly [string, string]>;
}

export const STATION_VENTS: VentNetData = {
  flaps: [
    { id: 'vent-cafeteria', roomId: 'r0', x: -8, z: -41, dir: DIR_W },
    { id: 'vent-upper-engine', roomId: 'r1', x: -24, z: -48, dir: DIR_N },
    { id: 'vent-reactor', roomId: 'r2', x: -31, z: -41, dir: DIR_N },
    { id: 'vent-security', roomId: 'r3', x: -17, z: -37, dir: DIR_E },
    { id: 'vent-medbay', roomId: 'r4', x: -15, z: -41, dir: DIR_W },
    { id: 'vent-lower-engine', roomId: 'r5', x: -28, z: -27, dir: DIR_W },
    { id: 'vent-electrical', roomId: 'r6', x: -13, z: -32, dir: DIR_N },
    { id: 'vent-storage', roomId: 'r7', x: -6, z: -26, dir: DIR_W },
    { id: 'vent-weapons', roomId: 'r8', x: 14, z: -49, dir: DIR_N },
    { id: 'vent-o2', roomId: 'r9', x: 9, z: -36, dir: DIR_W },
    { id: 'vent-navigation', roomId: 'r10', x: 30, z: -36, dir: DIR_E },
    { id: 'vent-admin', roomId: 'r11', x: 6, z: -33, dir: DIR_N },
    { id: 'vent-shields', roomId: 'r12', x: 19, z: -25, dir: DIR_E },
    { id: 'vent-communications', roomId: 'r13', x: 10, z: -21, dir: DIR_E },
  ],
  links: [
    ['vent-reactor', 'vent-upper-engine'],
    ['vent-reactor', 'vent-lower-engine'],
    ['vent-security', 'vent-medbay'],
    ['vent-security', 'vent-electrical'],
    ['vent-cafeteria', 'vent-admin'],
    ['vent-storage', 'vent-communications'],
    ['vent-weapons', 'vent-navigation'],
    ['vent-navigation', 'vent-shields'],
    ['vent-o2', 'vent-weapons'],
  ],
};
