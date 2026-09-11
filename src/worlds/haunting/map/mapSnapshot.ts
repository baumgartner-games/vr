import type { RoomKind } from '../house';
import type { MonsterMode } from '../monsterRoutine';
import type { MarkColour } from '../rules/cargo';
import type { Drop } from '../rules/blood';
import type { Ghosts } from '../rules/ghosts';

/**
 * **Der Grundriss als Daten** — der Vertrag zwischen der 3D-Welt und allem,
 * was sie von oben zeigt.
 *
 * Ein `MapSnapshot` ist ein **serialisierbarer** Top-Down-Zustand der Station:
 * Raumpolygone, Türen, Lichter, Wesen, Gegenstände. Er kommt aus der
 * laufenden 3D-Welt (`extract.ts`, reiner Lesezugriff) oder aus der reinen
 * 2D-Simulation, und er wird von der `MapView` gezeichnet, von den
 * Rollenansichten gefiltert und vom Sichtbarkeitsmodell (`visibility.ts`)
 * beschnitten. Wer ihn hat, braucht three.js nicht.
 *
 * **Koordinaten:** Meter, Weltachsen. `x` wächst nach **Osten**, `z` nach
 * **Süden** — Norden ist `-z` (`nav/navTile.ts`, `DIR_N`). Eine Karte zeichnet
 * `x` nach rechts und `z` nach unten, dann liegt Norden oben, wie auf dem
 * Blatt des Archivars und der Karte in der Hand (`portal/tools/mapPlot.ts`).
 * Kacheln sind `TILE` = 2,5 m; im Snapshot stehen **keine** Kacheln mehr.
 *
 * **Blickrichtung** (`yaw`) ist der Winkel in Bogenmaß um die Hochachse, so
 * wie three.js ihn an `Object3D.rotation.y` hält: 0 schaut nach `-z`
 * (Norden), positiv dreht **gegen** den Uhrzeigersinn von oben gesehen, also
 * nach Westen. Wer einen Richtungsvektor braucht:
 * `dx = -sin(yaw)`, `dz = -cos(yaw)`.
 *
 * Nur einfache Werte, keine Klassen, keine `Set`s: Der Snapshot geht durch
 * `structuredClone` und `JSON.stringify` unverändert hindurch — er darf
 * gespeichert, verglichen und über die Leitung geschickt werden.
 */

/** Ein Punkt in Metern auf dem Boden. */
export interface MapPoint {
  x: number;
  z: number;
}

/** Ein achsenparalleles Rechteck in Metern. */
export interface MapBounds {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

/** Ein Wandstück von `a` nach `b` — für Sichtlinien und das Zeichnen. */
export interface MapSegment {
  a: MapPoint;
  b: MapPoint;
  /** Woran es hängt, wenn es zu einem Raum gehört; leer für Außenhülle. */
  roomId?: string;
  /** Was die Wand ist. Ein Fenster hält Personen auf, aber kein Licht. */
  kind: 'wall' | 'window' | 'glass';
}

export interface MapRoom {
  id: string;
  /** Der Name im Dossier; Zwillinge teilen ihn — mit Absicht (`house.ts`). */
  name: string;
  kind?: RoomKind;
  /**
   * Die Kontur, gegen den Uhrzeigersinn von oben gesehen, ohne Wiederholung
   * des ersten Punkts. Aus den Bounding-Boxen der 3D-Welt: für ein Zimmer auf
   * dem Kachelgitter vier Punkte, für einen Gang mit Nische mehr.
   */
  polygon: MapPoint[];
  centre: MapPoint;
  /** Ob das ein Gang ist — Architektur und Licht, aber keine Aufgabe. */
  circulation: boolean;
  /** Ob im Raum Licht brennt (`HauntState.lit`). Die Lampen stehen einzeln in `lights`. */
  lit: boolean;
  /** Ob das die Einsatzzentrale ist — dort ist es immer hell und sicher. */
  safe: boolean;
}

export interface MapDoor {
  id: string;
  /** Die Räume zu beiden Seiten; `b` ist `null` an der Außenhülle. */
  a: string;
  b: string | null;
  /** Die Mitte der Türöffnung, in der Wand. */
  at: MapPoint;
  /** Entlang welcher Achse die Öffnung liegt — `x` bei einer Nord-/Südwand. */
  axis: 'x' | 'z';
  /** Wie breit die Öffnung ist, in Metern. */
  width: number;
  /** Ob das Blatt gerade offen steht (`ShipExperience.doorOpen`). */
  open: boolean;
  /** Ob sie gesperrt ist (`HauntState.shut`) — offen und gesperrt schließt sich gerade. */
  locked: boolean;
  /**
   * Wie lange die Sperre noch hält, in Sekunden, und wie lange sie insgesamt
   * hielt — daraus wird der Balken über der Tür (`rules/doorLocks.ts`). Keine
   * Sperre hält ewig; fehlt die Angabe, führt die Quelle keine Uhr.
   */
  hold?: { left: number; total: number };
  /**
   * **Und wie lange sie noch abkühlt** (`rules/doorLocks.ts`) — dasselbe Paar
   * Zahlen, nur für den anderen Fall: Die Tür ist **offen**, und sie darf für
   * diese Sekunden nicht wieder gesperrt werden.
   *
   * Zwei Felder und nicht eines mit einem Schalter daneben, weil es zwei
   * verschiedene Auskünfte sind: `hold` sagt „verlass dich noch so lange
   * darauf", `cooling` sagt „warte noch so lange". Gezeichnet werden sie als
   * derselbe Balken über der Tür, rot das eine, grün das andere; beide sind
   * nie gleichzeitig gesetzt.
   */
  cooling?: { left: number; total: number };
  material: 'wood' | 'metal';
}

export interface MapLight {
  id: string;
  roomId: string;
  at: MapPoint;
  on: boolean;
  /** Wie weit sie leuchtet, in Metern, wenn sie an ist. */
  radius: number;
  /** Was für eine Leuchte: Deckenlampe, Drehleuchte im Gang, Scheinwerfer der Drohne, Taschenlampe. */
  kind: 'lamp' | 'beacon' | 'drone' | 'torch' | 'command';
  /** Farbe als `#rrggbb`, sonst warmweiß. */
  color?: string;
  /**
   * Nur bei gerichtetem Licht (Taschenlampe, Drohne): wohin es zeigt und wie
   * breit der Kegel ist, in Bogenmaß.
   */
  yaw?: number;
  fov?: number;
}

export type MapEntityKind = 'player' | 'bot' | 'monster' | 'drone' | 'peer';

export interface MapEntity {
  id: string;
  kind: MapEntityKind;
  /** Der Name, wie er am Marker steht — beim Monster seine Erscheinung. */
  label: string;
  at: MapPoint;
  yaw: number;
  /** In welchem Raum es steht, oder `''` außerhalb der Station. */
  roomId: string;
  /** Ob es gerade durch einen Schacht verschwunden oder im Schrank versteckt ist. */
  concealed: boolean;
  /** Ob es sich bewegt — für Geräusch und Markerform. */
  moving: boolean;
  /** Ob es gerade rennt — Sprint macht Lärm (`perception.ts`). */
  sprinting: boolean;
  /**
   * Was der Spieler in der Hand hält, als Werkzeug-Kennung (`ShipExperience`:
   * `flashlight`, `radar`, `xray`, `medkit`) oder `''`.
   */
  held: string;
  /**
   * Womit es wahrnimmt, wenn es wahrnimmt: Sichtkegel (ganz, Bogenmaß),
   * Sichtweite und Hörweite in Metern. Fehlt bei Drohne und Mitspielern.
   */
  sense?: { fov: number; range: number; hearing: number };
}

export type MapItemKind =
  'cargo' | 'console' | 'locker' | 'task' | 'fuse' | 'vent' | 'tool' | 'medkit' | 'van' | 'mark';

export interface MapItem {
  id: string;
  kind: MapItemKind;
  label: string;
  roomId: string;
  at: MapPoint;
  /**
   * Der Zustand in einem Wort, damit Ansichten nicht raten:
   * Fracht `closed`/`open`/`taken`, Konsole `broken`/`solved`, Schrank
   * `locked`/`open`/`destroyed` (Paket Rundenregeln), Aufgabe
   * `waiting`/`carried`/`done`, Schacht `''`.
   */
  state: string;
  /** Ob man damit etwas tun kann, wenn man davorsteht. */
  interactive: boolean;
  /**
   * **Das Kennzeichen einer Kiste** (`rules/cargo.ts`): Farbband und Nummer,
   * beides je Raum eindeutig. Es steht **immer** dabei, auch ohne Ziel — der
   * Archivar sagt „Kiste 2, blaues Band", und wer das hört, muss es
   * wiederfinden können. Nur Fracht hat eines.
   */
  mark?: { colour: MarkColour; number: number };
  /**
   * **Ob das gerade das Ziel des Technikers ist.** Gesetzt nur dort, wo die
   * Kiste verraten werden darf (`rules/roundSetup.goalPrecision` ist
   * `'crate'`). Sitzt ein Mensch am Archiv, trägt kein Gegenstand diese Marke
   * — und keiner sein Label, denn ein Teilename im Snapshot wäre dasselbe
   * Leck durch die Hintertür.
   */
  goal?: boolean;
}

/**
 * **Der Stand der Runde nach den Rundenregeln** (`rules/roundRules.ts`):
 * Sauerstoff, Anzug, Kabinen. Sauerstoff und Rundenlimit sind eine Uhr.
 */
export interface MapRound {
  phase: 'briefing' | 'running' | 'won' | 'lost';
  /** Sekunden Sauerstoff, die noch bleiben — bei 0 ist die Runde verloren. */
  oxygen: number;
  /** Womit die Runde anfing, in Sekunden. */
  limit: number;
  /** Leben des Anzugs, und wie viele es höchstens sind. */
  suit: number;
  suitMax: number;
  /** Die Räume, deren Kabine für den Rest der Runde hin ist. */
  cabinsDestroyed: string[];
  /** Woran die Runde geendet hat; `''`, solange sie läuft. */
  ending: '' | 'oxygen' | 'suit' | 'escaped';
}

/**
 * **Ein Möbel auf dem Boden** — Kryokapsel, Tisch, Werkbank, aber auch der
 * Kasten der Fracht, der Schutzschrank und die Konsole als Klotz. Was in der
 * 3D-Welt steht, steht auch hier (`stationLayout.ts`): dieselben Maße,
 * derselbe Platz. Die Karte zeichnet ihn als Möbel; was man damit tun kann,
 * steht getrennt davon in `items`.
 */
export interface MapFixture {
  id: string;
  kind: 'fixture' | 'cargo' | 'locker' | 'console';
  /** Die Sorte aus `marks.ts` (`bett`, `esstisch`, …) — nur bei `fixture`. */
  mark?: string;
  roomId: string;
  /** Die Mitte, in Metern. */
  at: MapPoint;
  /** Drehung um die Hochachse wie `yaw`; Breite und Tiefe sind lokale Maße. */
  yaw: number;
  width: number;
  depth: number;
}

export type MapNoiseCause =
  'walk' | 'sprint' | 'interact' | 'door' | 'slam' | 'vent' | 'monster' | 'call';

/**
 * **Ein Geräusch, das gerade eben war** — als Welle, die über den Boden
 * läuft. Wer es gemacht hat, wo, wie weit es trägt, und wann: Die Karte
 * zeichnet daraus einen Ring, der über die Kacheln nach außen wandert und
 * verblasst. Die Quelle führt die Liste ein paar Sekunden und räumt sie dann.
 */
export interface MapNoise {
  id: string;
  /** Wer es gemacht hat — die Kennung des `MapEntity`, oder `''` für das Haus (eine Tür fällt zu). */
  by: string;
  at: MapPoint;
  /** Wie weit es zu hören ist, in Metern. */
  radius: number;
  cause: MapNoiseCause;
  /** Wann es war, in Sekunden Rundenzeit (`MapSnapshot.time`). */
  since: number;
}

/**
 * **Was das Monster gerade denkt** — die Zuschauersicht auf seinen Kopf
 * (Vertrag 4.7).
 *
 * Bisher konnte man einem Monster nur ansehen, *wohin* es läuft, und daraus
 * ist nie hervorgegangen, ob es einen Plan hatte oder gerade würfelte. Genau
 * das ist der Unterschied zwischen einem Gegner, den man lesen lernt, und
 * einem, der einfach passiert: Wer zusieht — im Späherblick, in „Alles sehen",
 * in der Bot-Runde —, soll das Glaubensbild sehen, den vermuteten Weg des
 * Technikers und die Tür, an der es ihn abfangen will.
 *
 * **Nur Zahlen, keine Klassen.** Das Ding geht denselben Weg wie der Rest des
 * Snapshots: durch `structuredClone`, durch `JSON.stringify`, über die
 * Leitung.
 *
 * Gefüllt wird es von `monsterRoutine.ts` (`RoutineOutput.insight`);
 * **gezeichnet** wird es noch nicht — das ist ein eigenes Paket.
 */
export interface MonsterInsight {
  mode: MonsterMode;
  /** Wie die Haltung heißt (`MODE_LABELS`). */
  label: string;
  /** Wohin es gerade will — `null`, wenn es steht. */
  goal: MapPoint | null;
  /** Das Glaubensbild über die Räume, absteigend, nur nennenswerte Anteile. */
  belief: Array<{ roomId: string; p: number }>;
  /** Der vermutete Weg des Technikers mit Ankunftszeiten in Sekunden. */
  prediction: { path: MapPoint[]; eta: number[] } | null;
  /** Die Tür, an der es ihn abfangen will, mit beiden Ankunftszeiten. */
  intercept: { door: string; at: MapPoint; etaMonster: number; etaPlayer: number } | null;
}

export interface MapSnapshot {
  /** Der Same der Station — dieselbe Zahl, dieselben Räume. */
  seed: number;
  /** Sekunden seit Rundenbeginn (`HauntState.time`). */
  time: number;
  /** Aus welcher Quelle: laufende 3D-Welt oder reine 2D-Simulation. */
  source: '3d' | 'flat';
  bounds: MapBounds;
  rooms: MapRoom[];
  doors: MapDoor[];
  /** Alle Wände, für Sichtlinien: aus den Bounding-Boxen, an Türen unterbrochen. */
  walls: MapSegment[];
  lights: MapLight[];
  entities: MapEntity[];
  items: MapItem[];
  /** Ob Strom auf dem Deck ist (`HauntState.fuse` umgelegt heißt: keiner). */
  power: boolean;
  /** Die Rundenregeln, wenn die Quelle sie führt (Paket Rundenregeln). */
  round?: MapRound;
  /**
   * Der Vent-Graph (Paket Lüftungssystem): Paare von `MapItem`-Kennungen der
   * Sorte `vent`, zwischen denen ein Schacht läuft. Die Klappen selbst stehen
   * in `items`, mit Zustand `closed` oder `open` (jemand steigt ein oder aus).
   */
  ventLinks?: Array<{ a: string; b: string }>;
  /** Die Möbel — was im Raum steht, mit Maß und Drehung. */
  fixtures?: MapFixture[];
  /** Die Geräusche der letzten Sekunden, als Wellen über den Boden. */
  noises?: MapNoise[];
  /**
   * **Wo jede Seite die andere zuletzt gesehen hat** (`rules/ghosts.ts`,
   * `HauntState.ghosts`). Steht neben `entities` und nicht darin: Ein Ghost
   * ist kein Wesen, sondern eine Erinnerung — er bewegt sich nicht, macht
   * keinen Lärm, und das Sichtbarkeitsmodell darf ihn nicht wegschneiden,
   * denn genau das, was man *nicht* mehr sieht, ist er ja.
   */
  ghosts?: Ghosts;
  /**
   * **Die Blutspur des Technikers** (`rules/blood.ts`, `HauntState.blood`) —
   * Tropfen mit Ort und Zeit. Wie die Ghost-Marker steht sie neben den
   * `entities` und nicht darin: Ein Tropfen ist kein Wesen, er bewegt sich
   * nicht und macht keinen Lärm. Und wie sie wird er vom Sichtbarkeitsmodell
   * **nicht** weggeschnitten — was auf dem Boden liegt, liegt auch im Dunkeln
   * da; ob eine Ansicht es zeigt, entscheidet sie selbst.
   */
  blood?: Drop[];
  /**
   * **Was das Monster glaubt und vorhat** (`HauntState.insight`) — für das
   * Overlay des Zuschauers. Reist mit dem Stand, damit auch ein Gerät, das
   * das Monster nicht rechnet, den Kopf des Gegners sehen kann.
   */
  insight?: MonsterInsight;
}

/** Ein Snapshot ohne Station — der Anfangswert jeder Ansicht. */
export function emptySnapshot(): MapSnapshot {
  return {
    seed: 0,
    time: 0,
    source: 'flat',
    bounds: { minX: 0, minZ: 0, maxX: 0, maxZ: 0 },
    rooms: [],
    doors: [],
    walls: [],
    lights: [],
    entities: [],
    items: [],
    power: true,
  };
}

/** In welchem Raum des Snapshots ein Punkt liegt — `null` außerhalb. */
export function roomAtPoint(snapshot: MapSnapshot, at: MapPoint): MapRoom | null {
  for (const room of snapshot.rooms) if (pointInPolygon(at, room.polygon)) return room;
  return null;
}

/** Punkt-in-Polygon nach der Strahlmethode; Kanten zählen als innen. */
export function pointInPolygon(at: MapPoint, polygon: readonly MapPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!,
      b = polygon[j]!;
    if (onSegment(at, a, b)) return true;
    const crosses = a.z > at.z !== b.z > at.z;
    if (crosses && at.x < ((b.x - a.x) * (at.z - a.z)) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}

function onSegment(p: MapPoint, a: MapPoint, b: MapPoint): boolean {
  const cross = (b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x);
  if (Math.abs(cross) > 1e-9) return false;
  return (
    p.x >= Math.min(a.x, b.x) - 1e-9 &&
    p.x <= Math.max(a.x, b.x) + 1e-9 &&
    p.z >= Math.min(a.z, b.z) - 1e-9 &&
    p.z <= Math.max(a.z, b.z) + 1e-9
  );
}

/** Der Richtungsvektor zu einem `yaw` — siehe Kopf der Datei. */
export function headingOf(yaw: number): MapPoint {
  return { x: -Math.sin(yaw), z: -Math.cos(yaw) };
}
