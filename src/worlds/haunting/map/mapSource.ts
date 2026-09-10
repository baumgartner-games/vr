import type { HouseSpec } from '../house';
import type { HauntState, DroneState } from '../net';
import type { MapEntity, MapItem, MapLight, MapRound, MapSnapshot } from './mapSnapshot';

/**
 * **Was die Extraktion von der 3D-Seite liest** — und sonst nichts.
 *
 * `HauntingWorld` ist die Sammeldatei, an der jedes Paket andocken will. Die
 * Karte dockt deshalb an einer **Schnittstelle** an und nicht an der Klasse:
 * Die Welt gibt einmal ein `MapSource` heraus (eine Handvoll Getter, alle
 * lesend), und alles Weitere passiert in `map/extract.ts`. Wer die Welt
 * umbaut, muss nur diese Getter am Leben halten.
 *
 * Alles hier ist **lesend**. Die Karte schreibt nie in die 3D-Welt zurück;
 * was der Spieler auf ihr tut, geht über die Handler der `MapView` an die
 * Rollenansicht, und die ruft dieselben Aktionen wie bisher (`flip`, `flyTo`).
 */
export interface MapSource {
  spec(): HouseSpec;
  state(): HauntState;
  drone(): DroneState | null;
  /**
   * Die Lampen der Räume, wie sie gebaut wurden: Kennung ist die Raum-Id,
   * Position in Metern. Ob eine an ist, steht in `state().lit` und im Flackern.
   */
  lamps(): ReadonlyArray<{ id: string; x: number; z: number; color?: string; intensity: number }>;
  /** Ob das Türblatt gerade offen steht — getrennt von der Sperre in `state().shut`. */
  doorOpen(id: string): boolean;
  /** Die Wesen, die die Welt kennt — Spieler, Bot, Monster, Mitspieler. */
  entities(): readonly MapEntity[];
  /** Fracht, Konsolen, Schränke, Werkzeuge — mit ihrem Zustand. */
  items(): readonly MapItem[];
  /** Gerichtete Lichter, die nicht an einem Raum hängen: Taschenlampe, Drohne. */
  carriedLights(): readonly MapLight[];
  /** Der Stand der Rundenregeln (Paket Rundenregeln), wenn die Quelle sie führt. */
  round?(): MapRound;
  /** Die Verbindungen des Lüftungsnetzes (Paket Lüftungssystem), wenn es eines gibt. */
  ventLinks?(): MapSnapshot['ventLinks'];
  /** Die Geräusche der letzten Sekunden (`MapNoise`), wenn die Quelle sie führt. */
  noises?(): MapSnapshot['noises'];
}

/**
 * Baut den Snapshot aus der laufenden Welt. Reiner Lesezugriff; das Ergebnis
 * ist ein frisches Objekt, das der Aufrufer behalten darf.
 *
 * **Phase 1 (`feat/map-core`).** Bis dahin liefert die Funktion den leeren
 * Snapshot; Signatur und Rückgabetyp bleiben.
 */
export type ExtractMapSnapshot = (source: MapSource) => MapSnapshot;
