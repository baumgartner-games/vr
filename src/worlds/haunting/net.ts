import { STATION_PROTOCOL, freshCrew, readCrew, type CrewState } from './mission';
import { freshSpook, type Spook } from './haunt';
import type { RoomNote, Sighting } from './monster/monsterMemory';
import type { DroppedPart } from './rules/archiveGoals';
import { readDrops, type Drop } from './rules/blood';
import { freshLocks, type DoorLocks } from './rules/doorLocks';
import { freshLamps, type Lamps } from './rules/lamps';
import { freshGhosts, type Ghost, type Ghosts } from './rules/ghosts';
import type { MapPoint, MonsterInsight } from './map/mapSnapshot';
import { MODE_LABELS, type MonsterMode } from './monsterRoutine';
import { isStation, type Claim, type StationId } from './stations';
import type { VentPhase } from './vents/ventTravel';
import { readSetup, type RoundSetup } from './rules/roundSetup';
import type { Intent } from './rules/lobby';
import { normalizeRoomCode } from '../../net/room';

/**
 * **Was zwischen Einsatzzentrale und Haus über die Leitung geht** — und wie wenig das ist.
 *
 * Weil jeder Client das Haus aus demselben Samen selbst baut, muss weder
 * Geometrie noch Bild fließen: Die Karte jeder Rolle ist die *eigene* Kopie
 * der Welt von oben. Übrig bleiben ein paar Dutzend Bytes je Sekunde — Same,
 * Monster, Türen, Licht, Aufgaben.
 *
 * **Fünf Sorten Nachricht, und jede hat genau einen Absender:**
 *
 * - `state` — der Gastgeber an alle. Er rechnet das Monster und hält den
 *   Stand; alle anderen lesen. Wer rechnet, entscheidet `pickGameHost`.
 * - `handover` — der **alte** Gastgeber an den neuen, genau einmal. Der Stand
 *   im Takt reicht dafür nicht: Die halbe Runde liegt gar nicht auf der
 *   Leitung (Riegel, Lampenbudget, Spuk, Blutbuchführung, das Gedächtnis des
 *   Monsters), und ohne sie fängt der Nachfolger mit einem vergesslichen Vieh
 *   und offenen Türen an. Deshalb eine eigene Nachricht (`handoverMessage`)
 *   und nicht ein größeres `state`: Sie geht einmal beim Wechsel und nicht
 *   viermal je Sekunde an alle.
 * - `claim` — jeder über sich: an welchem Gerät er sitzt und seit wann.
 * - `flip` — die Schalttafel an den Gastgeber: leg diesen Schalter um.
 * - `monster` — wer an der Station `monster` sitzt, an den Gastgeber: Stock
 *   und Knöpfe. Der Gastgeber rechnet weiter das Monster; er führt nur aus,
 *   was das Telefon will (`monster/netMonsterControl.ts`). Die Knöpfe gehen
 *   als **Zähler** über die Leitung und nicht als Flanke: Bei zehn Ansagen
 *   je Sekunde ginge ein einzelnes `true` verloren oder käme doppelt an —
 *   eine Differenz im Zähler ist genau ein Druck, egal wie oft er ankommt.
 * - `setup` — irgendein Gerät im Raum an den Gastgeber: **so soll die Tafel
 *   stehen** (`rules/roundSetup.RoundSetup`). Die Tafel lag bis hierher nur
 *   im Browser jedes Geräts, und der Gastgeber las nur seine eigene: Was ein
 *   Telefon in der Lobby einstellte, sah die Brille nie — und wer in der
 *   Brille steckt, stellt an einem Handgelenk-Menü nichts ein. Jetzt schickt
 *   jeder Tipp die ganze Tafel hinüber, der Gastgeber übernimmt sie, und mit
 *   dem nächsten Stand steht sie auf allen Geräten gleich (`stateMessage`
 *   trägt sie als optionales Feld `setup` mit — ohne Protokollsprung, denn
 *   ein Gerät ohne das Feld behält einfach seine eigene Tafel wie bisher).
 * - `start` — irgendein Gerät im Raum an den Gastgeber: **fang an**, mit
 *   dieser Absicht und dieser Tafel. Der Gastgeber ist der Techniker, und
 *   wer im Anzug steckt, soll nicht am Handgelenk nach dem Startknopf suchen
 *   müssen, während drei Leute in der Zentrale warten. Eine laufende Runde
 *   bricht die Nachricht **nicht** ab — sie zählt nur, solange keine läuft.
 *
 * **Alles, was hereinkommt, ist fremder Text.** Jede Nachricht geht deshalb
 * durch einen Leser, der `null` zurückgibt, statt einem halb gefüllten Objekt
 * zu vertrauen — dieselbe Vorsicht, mit der der Chat seine Zeilen putzt.
 */
export const HAUNT_CHANNEL = 'haunting';

/** Der Raum, in dem diese Runde stattfindet — für alle derselbe, mit Absicht. */
export const HAUNT_ROOM = 'haunting';

/**
 * **Welcher Raum gemeint ist**, aus der Adresse: `?room=euer-gruppenname` für
 * eine eigene Gruppe, sonst der gemeinsame. Die Startseite (`main.ts`) und die
 * Welt (`HauntingWorld.joinTable`) lesen dieselbe Zeile — zwei Leser mit
 * eigener Rechnung wären zwei Räume, in denen dann jeder allein steht.
 */
export function hauntRoomFrom(search: string): string {
  return normalizeRoomCode(new URLSearchParams(search).get('room') ?? '') || HAUNT_ROOM;
}

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
   * **Die Türen, die gerade abkühlen** (`rules/doorLocks.ts`) — Kennung und
   * die Rundenzeit, ab der sie wieder gesperrt werden dürfen.
   *
   * Die Buchführung der Riegel (`DoorLocks`) bleibt beim Gastgeber, wie eh
   * und je. Diese eine Liste daraus muss aber hinaus: Vierzig Sekunden sind
   * lang, und ein Schalter, der vierzig Sekunden lang nichts tut und nicht
   * sagt warum, ist für den Hacker ein kaputter Schalter. Er soll die
   * Restzeit sehen — auf der Tafel, auf der Karte, in der Szene.
   *
   * **Optional und ohne Protokollsprung** (`STATION_PROTOCOL` bleibt 8), aus
   * demselben Grund wie bei `blood` und `dropped`: Auf der Empfängerseite
   * hängt daran **keine Regel**. Gesperrt wird beim Gastgeber, und der prüft
   * die Abkühlung in seiner eigenen Buchführung (`mayLock`); wer die Liste
   * nicht bekommt, sieht keine Uhr und drückt einmal umsonst — das ist eine
   * fehlende Anzeige, kein Auseinanderlaufen.
   */
  cooling?: Array<{ id: string; until: number }>;
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
  /**
   * **Was das Monster glaubt und vorhat** (`MonsterInsight`, aus
   * `RoutineOutput.insight`) — nur der Gastgeber weiß es, weil nur er das
   * Monster rechnet. Ohne dieses Feld sah der Zuschauer das KI-Overlay nur,
   * wenn sein Gerät zufällig selbst der Gastgeber war; alle anderen bekamen
   * `null` und die Runde ohne den Kopf des Gegners.
   *
   * Optional und ohne Protokollsprung (`STATION_PROTOCOL` bleibt 8): Wer es
   * nicht kennt, zeichnet kein Overlay — es hängt keine Regel daran. Klein
   * gehalten: nur nennenswerte Anteile des Glaubensbilds, eine kurze
   * Polyline, eine Tür.
   */
  insight?: MonsterInsight;
}

/**
 * **Das Gedächtnis des Monsters, klein genug für eine Nachricht**
 * (`monster/monsterMemory.ts`).
 *
 * Die volle Buchführung ist eine Wahrscheinlichkeitsverteilung über vierzehn
 * Räume plus vier Zeitstempel je Raum. Sie zu verschicken wäre möglich und
 * wäre falsch: Die Verteilung zerfließt ohnehin je Sekunde (`DRIFT`), sie ist
 * also nach einem Wimpernschlag beim Nachfolger dieselbe, egal ob sie mitkam.
 * Was **nicht** von selbst wiederkommt, sind die zwei Dinge, an denen das
 * Verhalten hängt:
 *
 * - **die Spur der letzten Sichtungen** — aus ihr rechnet die Abfangrechnung
 *   Richtung und Tempo (`monster/monsterIntercept.ts`); ohne sie steht das
 *   Monster nach der Übergabe da, als hätte es den Techniker nie gesehen;
 * - **die abgesuchten Räume** — ohne sie fängt die Patrouille von vorn an und
 *   rennt in genau die Kammer, in der es eben schon war.
 *
 * Beides wird beim Nachfolger über die gewöhnlichen Eingänge nachgespielt
 * (`loadMemory`) und nicht in die Innereien geschrieben: Ein zweiter Weg in
 * das Gedächtnis hinein wäre ein zweites Gedächtnis.
 */
export interface MonsterBook {
  /** Die letzten Sichtungen, die älteste zuerst (`MonsterMemory.track`). */
  sightings: Array<{ x: number; z: number; time: number; sprinting: boolean }>;
  /** Die Räume, die es schon abgesucht hat, mit dem Zeitpunkt. */
  searched: Array<{ id: string; time: number }>;
}

/**
 * **Was die Blutspur führt, außer den Tropfen** (`rules/blood.ts`): bis wann
 * die Wunde offen ist, wo zuletzt gemessen wurde und wie viel Weg seit dem
 * letzten Tropfen zusammenkam. Die Tropfen selbst reisen im Stand
 * (`HauntState.blood`); das hier weiß nur der, der die Runde rechnet — und
 * ohne es hörte eine offene Wunde beim Wechsel des Gastgebers auf zu bluten.
 */
export interface TrailBook {
  /** Rundenzeit, bis zu der die Wunde blutet; `-Infinity` heißt: niemand blutet. */
  until: number;
  from: { x: number; z: number } | null;
  walked: number;
}

/**
 * **Die Buchführung, die sonst nie über die Leitung geht.**
 *
 * `HauntState` sagt, *was* ist: welche Türen zu sind, welche Räume hell. Wer
 * die Runde rechnet, führt daneben, *warum* und *wie lange noch* — und genau
 * das fehlte dem Nachfolger bisher. Er erbte eine Tür, die zu ist und nie
 * wieder aufgeht, eine Lampe ohne Restzeit und ein Monster ohne Gedächtnis.
 */
export interface HauntBooks {
  /** Wer welche Tür gesperrt hat, wie lange sie hält, und was noch abkühlt. */
  locks: DoorLocks;
  /** Welche Lampen die Tafel angemacht hat und wann sie ausgehen. */
  lamps: Lamps;
  /** Wo das Monster wie lange steht und wann es wieder etwas anstellen darf. */
  spook: Spook;
  /** Die offene Wunde des Technikers. */
  trail: TrailBook;
  /** Und was das Monster sich gemerkt hat. */
  memory: MonsterBook;
}

/**
 * **Die Übergabe.** Der alte Gastgeber an den neuen, genau einmal: der ganze
 * Stand und die Buchführung dazu.
 *
 * `to` steht dabei, damit sie nur der annimmt, für den sie gedacht ist. Ohne
 * das Feld nähme sie jeder — auch ein Telefon, das gar nichts rechnet — und
 * überschriebe sich seinen frisch empfangenen Stand mit einem, der schon eine
 * Viertelsekunde alt ist.
 */
export interface HauntHandover {
  to: string;
  state: HauntState;
  books: HauntBooks;
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

/** Ein Anwärter auf den Gastgeber: seine Kennung, seine Standzeit — und ob er der Techniker ist. */
export interface GameHostCandidate {
  id: string;
  seniority: number;
  /**
   * Ob dieses Gerät gerade den Techniker spielt — **gleich, in welcher
   * Ansicht**: in der Brille, am Desktop im Schiff oder auf der Karte von
   * oben. Fehlt die Angabe, ist es keiner.
   */
  technician?: boolean;
}

/**
 * **Gastgeber ist, wer Techniker ist** — und erst wenn keiner spielt, der
 * Älteste.
 *
 * Die reine Standzeit-Regel (`net/host.ts`) reicht hier nicht. Ein Web-Spieler,
 * der zufällig länger im Raum ist, würde sonst das Monster rechnen — und wenn
 * er den Laptop zuklappt, nimmt er die Runde mit. Im Haus steht genau einer,
 * und der geht so schnell nicht weg.
 *
 * **Warum die Regel jetzt „Techniker" heißt und nicht mehr „VR".** Sie meinte
 * von Anfang an den Techniker; „VR" stand nur dafür, weil es ihn lange nur
 * dort gab. Inzwischen spielt ihn auch der Desktop und die Karte von oben, und
 * seit der Techniker **mitten in der Runde** zwischen seinen zwei Ansichten
 * wechseln darf (`HauntingWorld.switchView`), wäre ein Gastgeber, der an der
 * Ansicht hängt, ein Gastgeber, der beim Umschalten wegfällt. Er hängt an der
 * Rolle: Wer den Techniker spielt, rechnet die Runde — und wechselt die Rolle,
 * **übergibt** der alte Gastgeber (`handoverMessage`).
 *
 * Spielen zwei den Techniker (zwei Fenster, ein Raum), entscheidet unter ihnen
 * wieder die Standzeit: Irgendetwas muss entscheiden, und es muss auf jedem
 * Gerät dasselbe sein.
 */
export function pickGameHost(candidates: ReadonlyArray<Claim | GameHostCandidate>): string {
  const playing = candidates.filter((one) => 'technician' in one && one.technician);
  const field = playing.length > 0 ? playing : candidates;
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
/** Ein Punkt in Metern vom Netz — oder `null`, wenn er keiner ist. */
function point(value: unknown): MapPoint | null {
  const it = bag(value);
  if (!it || typeof it['x'] !== 'number' || typeof it['z'] !== 'number') return null;
  return { x: metres(it['x']), z: metres(it['z']) };
}

/**
 * **Die Absichten des Monsters vom Netz** — zurechtgestutzt wie alles andere:
 * eine bekannte Haltung, begrenzte Listen, Meter statt beliebiger Zahlen.
 * Ein halbes Bild ist ein ganzes ohne die fehlenden Teile; nur eine
 * unbekannte Haltung macht das Ganze zu nichts.
 */
function readInsight(value: unknown): MonsterInsight | undefined {
  const it = bag(value);
  if (!it || typeof it['mode'] !== 'string' || !(it['mode'] in MODE_LABELS)) return undefined;
  const mode = it['mode'] as MonsterMode;
  const belief = Array.isArray(it['belief'])
    ? it['belief']
        .map((one) => bag(one))
        .filter((one): one is Bag => !!one && typeof one['roomId'] === 'string')
        .slice(0, 32)
        .map((one) => ({
          roomId: one['roomId'] as string,
          p: Math.max(0, Math.min(1, num(one['p']))),
        }))
    : [];
  const prediction = bag(it['prediction']);
  const path =
    prediction && Array.isArray(prediction['path'])
      ? prediction['path']
          .map(point)
          .filter((one): one is MapPoint => !!one)
          .slice(0, 8)
      : [];
  const eta =
    prediction && Array.isArray(prediction['eta'])
      ? prediction['eta'].map((one) => Math.max(0, num(one))).slice(0, 8)
      : [];
  const intercept = bag(it['intercept']);
  const at = intercept ? point(intercept['at']) : null;
  return {
    mode,
    label: typeof it['label'] === 'string' ? it['label'].slice(0, 40) : MODE_LABELS[mode],
    goal: point(it['goal']),
    belief,
    prediction: path.length ? { path, eta } : null,
    intercept:
      intercept && at && typeof intercept['door'] === 'string'
        ? {
            door: intercept['door'],
            at,
            etaMonster: Math.max(0, num(intercept['etaMonster'])),
            etaPlayer: Math.max(0, num(intercept['etaPlayer'])),
          }
        : null,
  };
}

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

/**
 * Die abkühlenden Türen aus fremdem Text — Kennung und Zeitstempel, nach oben
 * begrenzt wie jede andere Liste hier.
 */
function coolings(value: unknown): Array<{ id: string; until: number }> {
  if (!Array.isArray(value)) return [];
  const out: Array<{ id: string; until: number }> = [];
  for (const one of value.slice(0, 64)) {
    const it = bag(one);
    if (!it || typeof it['id'] !== 'string') continue;
    out.push({ id: it['id'].slice(0, 16), until: num(it['until']) });
  }
  return out;
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
    // Und die abkühlenden Türen (`rules/doorLocks.ts`): fehlen sie, zeigt die
    // Tafel eben keine Uhr.
    cooling: coolings(it['cooling']),
    // Und die Tropfen (`rules/blood.ts`): fehlen sie, blutet eben niemand.
    blood: readDrops(it['blood']),
    dropped: droppedParts(it['dropped']),
    // Und die Absichten des Monsters: fehlen sie, gibt es eben kein Overlay.
    ...(readInsight(it['insight']) ? { insight: readInsight(it['insight']) } : {}),
  };
}

/**
 * **Die Tafel, die der Gastgeber im Stand mitschickt** (`stateMessage`), oder
 * `null`, wenn der Stand keine trägt — ein älteres Gerät oder gar kein Stand.
 * Gelesen mit demselben Leser wie der Browser-Speicher (`readSetup`): fremder
 * Text ist fremder Text, ob er über die Leitung kam oder von gestern ist.
 */
export function readSharedSetup(data: unknown): RoundSetup | null {
  const it = bag(data);
  if (!it || it['kind'] !== 'state' || it['version'] !== STATION_PROTOCOL) return null;
  const setup = bag(it['setup']);
  if (!setup || !bag(setup['seats'])) return null;
  return readSetup(setup);
}

/** **Ein Wunsch an die Tafel** vom Netz — die ganze Tafel, oder `null`. */
export function readSetupMessage(data: unknown): RoundSetup | null {
  const it = bag(data);
  if (!it || it['kind'] !== 'setup' || !bag(it['seats'])) return null;
  return readSetup(it);
}

/** **Ein Startwunsch** vom Netz: die Absicht und die Tafel dazu, oder `null`. */
export function readStart(data: unknown): { intent: Intent; setup: RoundSetup } | null {
  const it = bag(data);
  if (!it || it['kind'] !== 'start' || !bag(it['seats'])) return null;
  const intent = it['intent'];
  if (intent !== 'play' && intent !== 'watch' && intent !== 'train') return null;
  return { intent, setup: readSetup(it) };
}

/**
 * **Ein Stoppwunsch** vom Netz: Die laufende Runde soll zurück in den Test —
 * hell, ohne Uhr, ohne Treffer (`HauntingWorld.stopRound`). Wie der Start
 * darf ihn jeder im Raum schicken; angewendet wird er beim Gastgeber.
 */
export function readStop(data: unknown): boolean {
  const it = bag(data);
  return !!it && it['kind'] === 'stop';
}

export function readClaim(data: unknown, from: string): Claim | null {
  const it = bag(data);
  if (!it || it['kind'] !== 'claim' || !isStation(it['station'])) return null;
  return { id: from, station: it['station'], seniority: Math.max(0, num(it['seniority'])) };
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

/**
 * **Eine Übergabe vom Netz.** Sie wird genauso misstrauisch gelesen wie alles
 * andere: Jede Zahl wird begrenzt, jede Liste gekappt, und was nicht passt,
 * fällt auf den Anfangswert zurück. Eine halb gelesene Buchführung wäre
 * schlimmer als gar keine — sie behauptete, eine Tür sei bis Sekunde `NaN`
 * gesperrt, und die ginge nie wieder auf.
 *
 * `null` heißt: keine Übergabe. Der Stand darin geht durch denselben Leser wie
 * jeder andere (`readState`), also gilt auch hier die Versionsprüfung.
 */
export function readHandover(data: unknown): HauntHandover | null {
  const it = bag(data);
  if (!it || it['kind'] !== 'handover' || typeof it['to'] !== 'string') return null;
  const state = readState(it['state']);
  if (!state) return null;
  const books = bag(it['books']) ?? {};
  return { to: it['to'].slice(0, 64), state, books: readBooks(books) };
}

/** Die Buchführung aus fremdem Text — jedes Stück für sich, jedes mit Anfangswert. */
function readBooks(it: Bag): HauntBooks {
  return {
    locks: readLocks(it['locks']),
    lamps: readLamps(it['lamps']),
    spook: readSpook(it['spook']),
    trail: readTrailBook(it['trail']),
    memory: readMemoryBook(it['memory']),
  };
}

/** Eine Tür-Id, wie der Bauplan sie schreibt (`d7`) — kurz gehalten. */
function doorId(value: unknown): string {
  return typeof value === 'string' ? value.slice(0, 40) : '';
}

/** Eine Rundenzeit in Sekunden — nie unendlich, nie über eine Runde hinaus. */
function seconds(value: unknown): number {
  return Math.max(0, Math.min(1e6, num(value)));
}

/**
 * Eine Liste `{ id, until }` — Sperren und Abkühlungen sehen gleich aus. Nach
 * oben gekappt: Mehr Einträge als Türen im Haus ist keine Buchführung mehr.
 */
function untilList(value: unknown): Array<{ id: string; until: number }> {
  if (!Array.isArray(value)) return [];
  return value
    .map((one) => bag(one))
    .filter((it): it is Bag => !!it && typeof it['id'] === 'string')
    .slice(0, 64)
    .map((it) => ({ id: doorId(it['id']), until: seconds(it['until']) }));
}

function readLocks(value: unknown): DoorLocks {
  const it = bag(value);
  if (!it) return freshLocks();
  const pries = Array.isArray(it['pries']) ? it['pries'] : [];
  return {
    chosen: doorId(it['chosen']),
    until: seconds(it['until']),
    slams: untilList(it['slams']),
    pries: pries
      .map((one) => bag(one))
      .filter((one): one is Bag => !!one && typeof one['id'] === 'string')
      .slice(0, 64)
      .map((one) => ({
        id: doorId(one['id']),
        tries: count(one['tries'], 1000),
        last: seconds(one['last']),
      })),
    cooling: untilList(it['cooling']),
  };
}

function readLamps(value: unknown): Lamps {
  const it = bag(value);
  if (!it || !Array.isArray(it['on'])) return freshLamps();
  return {
    on: it['on']
      .map((one) => bag(one))
      .filter((one): one is Bag => !!one && typeof one['id'] === 'string')
      .slice(0, 64)
      .map((one) => ({
        id: doorId(one['id']),
        until: seconds(one['until']),
        warned: one['warned'] === true,
      })),
  };
}

function readSpook(value: unknown): Spook {
  const it = bag(value);
  if (!it) return freshSpook();
  return { room: doorId(it['room']), since: seconds(it['since']), rest: seconds(it['rest']) };
}

/**
 * Die Wunde. `until` ist der einzige Wert im ganzen Protokoll, der
 * **`-Infinity`** sein darf und muss: „niemand blutet". Über JSON kommt daraus
 * `null`, und genau das ist hier der Anfangswert — ein `0` an dieser Stelle
 * hieße „blutete bis Sekunde null", was in einer laufenden Runde dasselbe
 * bedeutet, aber in Sekunde 0 einer neuen Runde eine offene Wunde wäre.
 */
function readTrailBook(value: unknown): TrailBook {
  const it = bag(value);
  if (!it) return { until: -Infinity, from: null, walked: 0 };
  const from = bag(it['from']);
  return {
    until:
      typeof it['until'] === 'number' && Number.isFinite(it['until']) ? it['until'] : -Infinity,
    from: from ? { x: metres(from['x']), z: metres(from['z']) } : null,
    walked: Math.max(0, Math.min(1e6, num(it['walked']))),
  };
}

function readMemoryBook(value: unknown): MonsterBook {
  const it = bag(value);
  if (!it) return { sightings: [], searched: [] };
  const sightings = Array.isArray(it['sightings']) ? it['sightings'] : [];
  const searched = Array.isArray(it['searched']) ? it['searched'] : [];
  return {
    // Länger als die Spur selbst (`TRACK_LENGTH` = 6) braucht sie nie zu sein;
    // ein Dutzend ist reichlich Luft und immer noch eine Nachricht.
    sightings: sightings
      .map((one) => bag(one))
      .filter((one): one is Bag => !!one)
      .slice(0, 12)
      .map((one) => ({
        x: metres(one['x']),
        z: metres(one['z']),
        time: seconds(one['time']),
        sprinting: one['sprinting'] === true,
      })),
    searched: searched
      .map((one) => bag(one))
      .filter((one): one is Bag => !!one && typeof one['id'] === 'string')
      .slice(0, 64)
      .map((one) => ({ id: doorId(one['id']), time: seconds(one['time']) })),
  };
}

// --- Das Gedächtnis ein- und auspacken ---------------------------------------

/**
 * **Was ein Gedächtnis lesbar hergibt** — strukturell und nicht als Klasse
 * beschrieben, damit dieses Modul `monster/` nicht einbinden muss (und die
 * Tests hier ohne es auskommen).
 */
export interface MemoryReader {
  track: { readonly sightings: readonly Sighting[] };
  note(room: string): RoomNote;
}

/** Und die Gegenseite: die zwei Eingänge, über die es wieder hineingeht. */
export interface MemoryWriter {
  seen(room: string, at: { x: number; z: number }, time: number, sprinting?: boolean): void;
  visited(room: string, time: number): void;
}

/**
 * **Das Gedächtnis einpacken** (`MonsterBook`): die Spur und die abgesuchten
 * Räume. `spaces` sind die Räume in der Reihenfolge der Welt — dieselbe Liste,
 * mit der das Gedächtnis gebaut wurde.
 */
export function packMemory(memory: MemoryReader, spaces: readonly string[]): MonsterBook {
  const searched: Array<{ id: string; time: number }> = [];
  for (const id of spaces) {
    const when = memory.note(id).searched;
    if (Number.isFinite(when)) searched.push({ id, time: when });
  }
  return {
    sightings: memory.track.sightings.map((one) => ({
      x: one.at.x,
      z: one.at.z,
      time: one.time,
      sprinting: !!one.sprinting,
    })),
    searched,
  };
}

/**
 * **Und wieder auspacken** — in dieser Reihenfolge, und die ist die ganze
 * Regel: erst die abgesuchten Räume (das Ältere), dann die Sichtungen (das
 * Jüngere). Andersherum hätte ein „hier war niemand" die letzte Sichtung
 * wieder gelöscht, und das Monster stünde nach der Übergabe ratlos da, wo es
 * eben noch jemanden gesehen hat.
 *
 * `roomOf` sagt, in welchem Raum ein Punkt liegt (`StationGraph.spaceAt`);
 * eine Sichtung, zu der sich kein Raum finden lässt, fällt weg.
 */
export function loadMemory(
  memory: MemoryWriter,
  book: MonsterBook,
  roomOf: (at: { x: number; z: number }) => string,
): void {
  for (const { id, time } of [...book.searched].sort((a, b) => a.time - b.time))
    memory.visited(id, time);
  for (const one of book.sightings) {
    const room = roomOf(one);
    if (room) memory.seen(room, { x: one.x, z: one.z }, one.time, one.sprinting);
  }
}

// --- Schreiben --------------------------------------------------------------

/**
 * **Der ganze Stand als Nachricht.** Die Felder gehen ausgebreitet mit, damit
 * ein neues Feld im `HauntState` nicht an zwei Stellen nachgetragen werden
 * muss — dafür ist die **Version** die Absprache: Wer ein Feld hinzufügt, von
 * dem die Gegenseite abhängt (zuletzt `ghosts`), zählt `STATION_PROTOCOL`
 * hoch, sonst läse ein altes Gerät die Nachricht und übersähe die Hälfte.
 */
export function stateMessage(state: HauntState, setup?: RoundSetup): unknown {
  return {
    kind: 'state',
    version: STATION_PROTOCOL,
    ...state,
    // Die Tafel des Gastgebers — optional, siehe oben: Wer sie nicht kennt,
    // behält seine eigene.
    ...(setup ? { setup: { seats: setup.seats } } : {}),
  };
}

/** Die ganze Tafel an den Gastgeber: so soll sie stehen. */
export function setupMessage(setup: RoundSetup): unknown {
  return { kind: 'setup', seats: setup.seats };
}

/** Der Startwunsch an den Gastgeber: fang mit dieser Absicht und dieser Tafel an. */
export function startMessage(intent: Intent, setup: RoundSetup): unknown {
  return { kind: 'start', intent, seats: setup.seats };
}

export function stopMessage(): unknown {
  return { kind: 'stop' };
}

export function claimMessage(station: StationId, seniority: number): unknown {
  return { kind: 'claim', station, seniority };
}

export function flipMessage(id: string, on: boolean): unknown {
  return { kind: 'flip', id, on };
}

export function monsterMessage(input: MonsterNetInput): unknown {
  return { kind: 'monster', ...input };
}

/**
 * **Die Übergabe als Nachricht.** Der Stand geht als fertige `state`-Nachricht
 * mit — samt Version, damit der Nachfolger ihn durch denselben Leser schickt
 * wie jeden anderen und eine Übergabe aus einer fremden Version genauso
 * abweist wie einen fremden Stand.
 */
export function handoverMessage(to: string, state: HauntState, books: HauntBooks): unknown {
  return { kind: 'handover', to, state: stateMessage(state), books };
}
