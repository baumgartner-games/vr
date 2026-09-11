import { STATION_PROTOCOL, freshCrew, readCrew, type CrewState } from './mission';
import type { DroppedPart } from './rules/archiveGoals';
import { readDrops, type Drop } from './rules/blood';
import { freshGhosts, type Ghost, type Ghosts } from './rules/ghosts';
import { isStation, type Claim, type StationId } from './stations';
import type { VentPhase } from './vents/ventTravel';

/**
 * **Was zwischen Einsatzzentrale und Haus über die Leitung geht** — und wie wenig das ist.
 *
 * Weil jeder Client das Haus aus demselben Samen selbst baut, muss weder
 * Geometrie noch Bild fließen: Die Drohnenkamera ist eine Kamera in der
 * *eigenen* Kopie der Welt, und die Karte des Archivars ist dieselbe Kopie von
 * oben. Übrig bleiben ein paar Dutzend Bytes je Sekunde — Same, Monster,
 * Türen, Licht, Aufgaben.
 *
 * **Fünf Sorten Nachricht, und jede hat genau einen Absender:**
 *
 * - `state` — der Gastgeber an alle. Er rechnet das Monster und hält den
 *   Stand; alle anderen lesen. Wer rechnet, entscheidet `pickGameHost`.
 * - `claim` — jeder über sich: an welchem Gerät er sitzt und seit wann.
 * - `drone` — der Pilot über die Drohne. Wer sie fliegt, besitzt sie; das ist
 *   dieselbe Regel wie „wer anfasst, besitzt" bei den Kisten im Portal Labor.
 * - `flip` — der Hacker an den Gastgeber: leg diesen Schalter um.
 * - `monster` — wer an der Station `monster` sitzt, an den Gastgeber: Stock
 *   und Knöpfe. Der Gastgeber rechnet weiter das Monster; er führt nur aus,
 *   was das Telefon will (`monster/netMonsterControl.ts`). Die Knöpfe gehen
 *   als **Zähler** über die Leitung und nicht als Flanke: Bei zehn Ansagen
 *   je Sekunde ginge ein einzelnes `true` verloren oder käme doppelt an —
 *   eine Differenz im Zähler ist genau ein Druck, egal wie oft er ankommt.
 *
 * **Alles, was hereinkommt, ist fremder Text.** Jede Nachricht geht deshalb
 * durch einen Leser, der `null` zurückgibt, statt einem halb gefüllten Objekt
 * zu vertrauen — dieselbe Vorsicht, mit der der Chat seine Zeilen putzt.
 */
export const HAUNT_CHANNEL = 'haunting';

/** Der Raum, in dem diese Runde stattfindet — für alle derselbe, mit Absicht. */
export const HAUNT_ROOM = 'haunting';

export type RoundPhase = 'briefing' | 'running' | 'won' | 'lost';

export interface HauntState {
  crew: CrewState;
  seed: number;
  phase: RoundPhase;
  /** Sekunden seit Rundenbeginn. */
  time: number;
  /** Ob überhaupt ein Monster im Haus ist — der VR-Spieler entscheidet das. */
  monsterOn: boolean;
  /** Wo es steht, in Metern. `null` heißt: es gibt keins. */
  monster: { x: number; z: number } | null;
  /** Die Türen, die gerade **zu** sind. */
  shut: string[];
  /** Die Zimmer, in denen Licht brennt. */
  lit: string[];
  /** Die Zimmer, in denen ein Radio läuft. */
  loud: string[];
  /** Ob der Sicherungskasten umgelegt ist. */
  fuse: boolean;
  /** Aufgaben, die der VR-Spieler schon aufgesammelt hat. */
  taken: string[];
  /** Und die, die in der Einsatzzentrale liegen. */
  done: string[];
  /**
   * **Die Kabinen, die das Monster aufgerissen hat** — Raum-Ids, in der
   * Reihenfolge der Zerstörung (`rules/roundRules.ts`).
   *
   * Steht im Stand und nicht nur beim Gastgeber, weil jedes Gerät sie
   * braucht: Die Karte in der Einsatzzentrale zeichnet sie als Wrack, der
   * Mitspieler im Haus darf sie nicht mehr betreten, und der Zuschauer soll
   * sehen, dass ein Ausweg weniger übrig ist. Seit `STATION_PROTOCOL` 6.
   */
  destroyed: string[];
  /**
   * **Wo der Techniker steht, wenn er die 2D-Welt spielt** — in Metern, mit
   * Blick und ob er gerade geht. `null`, wenn der Techniker im Headset oder
   * am Desktop spielt: Dann kommt seine Pose wie bisher über das Rig.
   *
   * Ein 2D-Spieler hat kein Rig und keine Pose; ohne dieses Feld sähe die
   * Monster-Station einen Techniker, der nie irgendwo steht. `moving` steht
   * dabei, weil das Monster ihn sonst nie **hören** könnte — die Ansicht
   * zeichnet Geräuschringe nur um Wesen, die sich bewegen. Seit
   * `STATION_PROTOCOL` 7.
   */
  technician: { x: number; z: number; yaw: number; moving: boolean } | null;
  /**
   * **Wo das Monster in seiner Schachtfahrt steht** (`vents/ventTravel.ts`).
   * `crew.venting` sagt den anderen Geräten nur, *dass* es verborgen ist;
   * die Monster-Station braucht die Phase, damit ihr Knopf „Aussteigen"
   * genau dann erscheint, wenn die Fahrt angekommen ist. Seit
   * `STATION_PROTOCOL` 7.
   */
  ride: VentPhase;
  /**
   * **Wo jede Seite die andere zuletzt gesehen hat** (`rules/ghosts.ts`).
   *
   * Steht im Stand und nicht bei dem, der gerade hinsieht, weil beide Marker
   * überall gebraucht werden: Der Techniker zeichnet den des Monsters in
   * seine 2D-Szene und in die Brille, das Telefon an der Monster-Station den
   * des Technikers auf seine Karte, und der Zuschauer sieht beide blass neben
   * den echten Figuren. Gerechnet werden sie dort, wo der Sichtkontakt
   * ohnehin schon feststeht — beim Gastgeber, aus derselben Prüfung, aus der
   * auch die Alarmleiter kommt. Seit `STATION_PROTOCOL` 8.
   */
  ghosts: Ghosts;
  /**
   * **Die Blutspur des Technikers** (`rules/blood.ts`) — die Tropfen, in der
   * Reihenfolge, in der sie gefallen sind. Ort und Zeit, mehr nicht: Wie
   * lange die Wunde noch offen ist, geht niemanden etwas an außer den, der
   * die Runde rechnet.
   *
   * **Und warum das Feld optional ist, obwohl `ghosts` es nicht war.** Die
   * Version steigt für ein Feld, von dem die Gegenseite **abhängt**. Bei den
   * Ghost-Markern war das so: Sie werden dort gerechnet, wo der Sichtkontakt
   * feststeht — beim Gastgeber —, und ein Gerät ohne sie zeichnete einen
   * Marker, den es nie bekommt, oder verlöre ihn bei jedem Stand. Die
   * Blutspur ist anders: An ihr hängt **keine Regel** auf der Empfängerseite.
   * Der Gastgeber sucht die Fährte in seiner eigenen Spur und entscheidet
   * daraus das Verhalten des Monsters; alle anderen **malen** sie nur. Ein
   * Gerät der Version 8 ohne das Feld sieht keine Tropfen und spielt
   * ansonsten dieselbe Runde — das ist ein fehlendes Bild, kein Auseinander-
   * laufen. Also bleibt `STATION_PROTOCOL` auf 8, und wer nichts schickt,
   * schickt eben eine leere Spur.
   */
  blood?: Drop[];
  /**
   * **Die Ersatzteile, die im Gang liegen** (`rules/archiveGoals.ts`).
   *
   * Der Techniker trägt höchstens eines und kann es fallen lassen; wo es dann
   * liegt, ist die Auskunft, die der Archivar geben soll — aber **erst**,
   * wenn es länger als `DROPPED_SEEN` dort liegt. Deshalb steht die Zeit
   * dabei und nicht nur der Ort: Die Schwelle rechnet jedes Gerät selbst aus
   * `state.time`, und alle kommen damit zur selben Sekunde zum selben Schluss.
   *
   * **Optional und ohne Protokollsprung** (`STATION_PROTOCOL` bleibt 8): Ein
   * Stand ohne das Feld ist einer, in dem nichts liegt — das ist die
   * Wahrheit, die ein älteres Gerät ohnehin annimmt, und kein Grund, es
   * auszusperren.
   */
  dropped?: DroppedPart[];
}

/**
 * **Was das Telefon an der Station `monster` sagt** — der Stock in [-1, 1],
 * ob es rennt, zwei Zähler für die Knöpfe und die gewählte Klappen-Zielnummer.
 */
export interface MonsterNetInput {
  x: number;
  z: number;
  sprint: boolean;
  /** Wie oft „Angreifen" seit dem Hinsetzen gedrückt wurde. */
  attack: number;
  /** Und „Interagieren". */
  interact: number;
  /** Welches Ziel die nächste Fahrt nimmt, wenn eine Klappe mehrere hat. */
  vent: number;
}

/** Die fünf Phasen der Fahrt — als Liste, damit der Leser fremden Text prüfen kann. */
const RIDE_PHASES: readonly VentPhase[] = ['out', 'entering', 'riding', 'arrived', 'exiting'];

export interface DroneState {
  x: number;
  z: number;
  /**
   * **Wohin ihr Rumpf zeigt** — und warum das über die Leitung geht.
   *
   * Eine Weile wurde der Winkel bei den Zuschauern aus dem Weg zwischen zwei
   * Ansagen gerechnet, und solange sie nur flog, stimmte er auch. Sobald der
   * Pilot aber im Stehen wischt, bewegt sich nichts, aus dem sich eine Drehung
   * ableiten ließe: Sein Bild schwenkte, der Scheinwerfer im Haus blieb stur
   * geradeaus stehen — und genau der ist das Einzige, was der Pilot dem
   * VR-Spieler wirklich geben kann. Also steht der Winkel jetzt in der
   * Nachricht; das Ruckeln bei zehn Ansagen je Sekunde nimmt ihm der weiche
   * Nachlauf beim Empfänger (`HauntingWorld.turnDroneBody`).
   */
  yaw: number;
  /**
   * **Und wie weit ihr Kopf dabei nach oben oder unten sieht**, in Bogenmaß,
   * positiv nach oben.
   *
   * Aus demselben Grund in der Nachricht wie der Gierwinkel: Der Kegel des
   * Scheinwerfers hängt daran, und ein Licht, das beim Piloten an die Decke
   * zeigt und im Haus auf den Boden, ist keine Hilfe, sondern ein zweiter
   * Streit am Tisch.
   */
  pitch: number;
  /** Wohin sie gerade fliegt — die Zimmerkennung, oder `''`. */
  target: string;
  /**
   * **Wie viele Sekunden noch kein Zimmerwechsel geht.**
   *
   * Geht mit über die Leitung, obwohl nur der Pilot sie herunterzählt — sonst
   * wäre der Platzwechsel am Gerät ein Schlupfloch: Wer die Sperre abwarten
   * müsste, steht auf, jemand anders setzt sich hin und fliegt sofort weiter.
   * Eine Regel, die man durch Stühlerücken umgeht, ist keine.
   */
  hop: number;
  /** Was in der Ladung des Scheinwerfers noch steckt, von 1 bis 0. */
  lamp: number;
  /**
   * **Ob ihr Scheinwerfer an ist** — und warum das über die Leitung geht.
   *
   * Das Licht der Drohne ist das Einzige, was der Pilot im *Haus* anrichten
   * kann: Es leuchtet nicht nur sein eigenes Kamerabild aus, sondern auch das
   * Zimmer, in dem der VR-Spieler steht. Ein Licht, das nur der Pilot sähe,
   * wäre eine Helligkeitseinstellung; eines, das alle sehen, ist eine Hilfe,
   * die man sich zurufen muss — und ein Verräter, wenn das Monster kommt.
   */
  light: boolean;
}

/**
 * Wer die Runde rechnet: **der VR-Spieler**, und erst wenn keiner da ist, der
 * Älteste.
 *
 * Die reine Standzeit-Regel (`net/host.ts`) reicht hier nicht. Ein Web-Spieler,
 * der zufällig länger im Raum ist, würde sonst das Monster rechnen — und wenn
 * er den Laptop zuklappt, nimmt er die Runde mit. Im Haus steht genau einer,
 * und der geht so schnell nicht weg.
 */
export function pickGameHost(
  candidates: ReadonlyArray<Claim | { id: string; seniority: number; vr?: boolean }>,
): string {
  const inVr = candidates.filter((one) => 'vr' in one && one.vr);
  const field = inVr.length > 0 ? inVr : candidates;
  let best: { id: string; seniority: number } | null = null;
  for (const one of field) {
    if (!best || senior(one, best)) best = one;
  }
  return best?.id ?? '';
}

function senior(
  a: { id: string; seniority: number },
  b: { id: string; seniority: number },
): boolean {
  const difference = Math.round((a.seniority - b.seniority) * 10);
  if (difference !== 0) return difference > 0;
  return a.id < b.id;
}

// --- Lesen, was hereinkommt -------------------------------------------------

type Bag = Record<string, unknown>;

function bag(data: unknown): Bag | null {
  return typeof data === 'object' && data !== null ? (data as Bag) : null;
}

function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** Ein Stockwert: begrenzt auf [-1, 1]. */
function unit(value: unknown): number {
  return Math.max(-1, Math.min(1, num(value)));
}

/** Ein Zähler: ganzzahlig, nie negativ, und nach oben so begrenzt, dass er ganz bleibt. */
function count(value: unknown, ceiling = 1e9): number {
  return Math.min(ceiling, Math.max(0, Math.floor(num(value))));
}

/** Ein Maß in Metern — die Station ist keine hundert Meter groß. */
function metres(value: unknown): number {
  return Math.max(-1000, Math.min(1000, num(value)));
}

/**
 * **Ein Ghost-Marker vom Netz** (`rules/ghosts.ts`): Meter, ein Winkel, eine
 * Zeit — oder `null`. Ein halb gefüllter Marker wäre schlimmer als keiner:
 * Er stünde in der Station herum und behauptete, jemand sei dort gewesen.
 */
function ghost(value: unknown): Ghost | null {
  const it = bag(value);
  if (!it) return null;
  return { x: metres(it['x']), z: metres(it['z']), yaw: num(it['yaw']), since: num(it['since']) };
}

/**
 * **Ein liegengelassenes Ersatzteil vom Netz**: eine Kennung, Meter, eine
 * Zeit. Alles andere fällt weg — ein halber Eintrag wäre ein Teil, das
 * nirgends liegt, und der Archivar schickte den Techniker dorthin.
 */
function droppedParts(value: unknown): DroppedPart[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((one) => bag(one))
    .filter((it): it is Bag => !!it && typeof it['id'] === 'string')
    .slice(0, 8)
    .map((it) => ({
      id: (it['id'] as string).slice(0, 16),
      x: metres(it['x']),
      z: metres(it['z']),
      since: num(it['since']),
    }));
}

function ids(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  // Nach oben begrenzt: Eine Liste mit hunderttausend Einträgen ist keine
  // Nachricht mehr, sondern ein Angriff auf die Bildrate.
  return value.filter((one): one is string => typeof one === 'string').slice(0, 64);
}

export function readState(data: unknown): HauntState | null {
  const it = bag(data);
  if (
    !it ||
    it['kind'] !== 'state' ||
    typeof it['seed'] !== 'number' ||
    !Number.isFinite(it['seed']) ||
    it['version'] !== STATION_PROTOCOL
  )
    return null;
  const phase = it['phase'];
  const monster = bag(it['monster']);
  const technician = bag(it['technician']);
  const ride = it['ride'];
  const ghosts = bag(it['ghosts']);
  return {
    seed: it['seed'] >>> 0,
    crew: it['crew'] ? readCrew(it['crew']) : freshCrew(),
    phase:
      phase === 'briefing' || phase === 'running' || phase === 'won' || phase === 'lost'
        ? phase
        : 'briefing',
    time: num(it['time']),
    monsterOn: it['monsterOn'] === true,
    monster: monster ? { x: num(monster['x']), z: num(monster['z']) } : null,
    shut: ids(it['shut']),
    lit: ids(it['lit']),
    loud: ids(it['loud']),
    fuse: it['fuse'] === true,
    taken: ids(it['taken']),
    done: ids(it['done']),
    destroyed: ids(it['destroyed']),
    technician: technician
      ? {
          x: metres(technician['x']),
          z: metres(technician['z']),
          yaw: num(technician['yaw']),
          moving: technician['moving'] === true,
        }
      : null,
    ride: RIDE_PHASES.find((one) => one === ride) ?? 'out',
    // Ein Stand ohne Marker ist ein Stand, in dem sich noch niemand gesehen
    // hat — nicht einer, dem etwas fehlt.
    ghosts: ghosts
      ? { monster: ghost(ghosts['monster']), technician: ghost(ghosts['technician']) }
      : freshGhosts(),
    // Und die Tropfen (`rules/blood.ts`): fehlen sie, blutet eben niemand.
    blood: readDrops(it['blood']),
    dropped: droppedParts(it['dropped']),
  };
}

export function readClaim(data: unknown, from: string): Claim | null {
  const it = bag(data);
  if (!it || it['kind'] !== 'claim' || !isStation(it['station'])) return null;
  return { id: from, station: it['station'], seniority: Math.max(0, num(it['seniority'])) };
}

export function readDrone(data: unknown): DroneState | null {
  const it = bag(data);
  if (!it || it['kind'] !== 'drone') return null;
  return {
    x: num(it['x']),
    z: num(it['z']),
    yaw: num(it['yaw']),
    pitch: num(it['pitch']),
    target: typeof it['target'] === 'string' ? it['target'].slice(0, 16) : '',
    hop: Math.min(600, Math.max(0, num(it['hop']))),
    lamp: Math.min(1, Math.max(0, num(it['lamp'], 1))),
    light: it['light'] === true,
  };
}

export function readFlip(data: unknown): { id: string; on: boolean } | null {
  const it = bag(data);
  if (!it || it['kind'] !== 'flip' || typeof it['id'] !== 'string') return null;
  return { id: it['id'].slice(0, 40), on: it['on'] === true };
}

export function readMonsterInput(data: unknown): MonsterNetInput | null {
  const it = bag(data);
  if (!it || it['kind'] !== 'monster') return null;
  return {
    x: unit(it['x']),
    z: unit(it['z']),
    sprint: it['sprint'] === true,
    attack: count(it['attack']),
    interact: count(it['interact']),
    // Mehr Ziele hat keine Klappe (`vents/ventNet.data.ts`); der Gastgeber
    // schneidet ohnehin auf die Liste zu (`VentTravel.enter`).
    vent: count(it['vent'], 15),
  };
}

// --- Schreiben --------------------------------------------------------------

/**
 * **Der ganze Stand als Nachricht.** Die Felder gehen ausgebreitet mit, damit
 * ein neues Feld im `HauntState` nicht an zwei Stellen nachgetragen werden
 * muss — dafür ist die **Version** die Absprache: Wer ein Feld hinzufügt, von
 * dem die Gegenseite abhängt (zuletzt `ghosts`), zählt `STATION_PROTOCOL`
 * hoch, sonst läse ein altes Gerät die Nachricht und übersähe die Hälfte.
 */
export function stateMessage(state: HauntState): unknown {
  return { kind: 'state', version: STATION_PROTOCOL, ...state };
}

export function claimMessage(station: StationId, seniority: number): unknown {
  return { kind: 'claim', station, seniority };
}

export function droneMessage(drone: DroneState): unknown {
  return { kind: 'drone', ...drone };
}

export function flipMessage(id: string, on: boolean): unknown {
  return { kind: 'flip', id, on };
}

export function monsterMessage(input: MonsterNetInput): unknown {
  return { kind: 'monster', ...input };
}
