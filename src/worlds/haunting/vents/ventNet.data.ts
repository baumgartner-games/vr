import { DIR_E, DIR_N, DIR_S, DIR_W, type Dir } from '../../nav/navTile';

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
 * nie in einer Türöffnung; `vents/ventGraph.ts` prüft beides beim Laden, und
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
    { id: 'vent-cafeteria', roomId: 'r0', x: 0, z: -15, dir: DIR_S },
    { id: 'vent-upper-engine', roomId: 'r1', x: -15, z: -16, dir: DIR_S },
    { id: 'vent-reactor', roomId: 'r2', x: -17, z: -10, dir: DIR_E },
    { id: 'vent-security', roomId: 'r3', x: -13, z: -12, dir: DIR_W },
    { id: 'vent-medbay', roomId: 'r4', x: -7, z: -13, dir: DIR_N },
    { id: 'vent-lower-engine', roomId: 'r5', x: -15, z: -5, dir: DIR_N },
    { id: 'vent-electrical', roomId: 'r6', x: -8, z: -2, dir: DIR_S },
    { id: 'vent-storage', roomId: 'r7', x: 0, z: -3, dir: DIR_N },
    { id: 'vent-weapons', roomId: 'r8', x: 10, z: -16, dir: DIR_S },
    { id: 'vent-o2', roomId: 'r9', x: 10, z: -11, dir: DIR_E },
    { id: 'vent-navigation', roomId: 'r10', x: 16, z: -11, dir: DIR_W },
    { id: 'vent-admin', roomId: 'r11', x: 5, z: -7, dir: DIR_W },
    { id: 'vent-shields', roomId: 'r12', x: 12, z: -4, dir: DIR_N },
    { id: 'vent-communications', roomId: 'r13', x: 5, z: -1, dir: DIR_N },
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
