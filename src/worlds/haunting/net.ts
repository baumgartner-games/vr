import { isStation, type Claim, type StationId } from './stations';

/**
 * **Was zwischen Van und Haus über die Leitung geht** — und wie wenig das ist.
 *
 * Weil jeder Client das Haus aus demselben Samen selbst baut, muss weder
 * Geometrie noch Bild fließen: Die Drohnenkamera ist eine Kamera in der
 * *eigenen* Kopie der Welt, und die Karte des Archivars ist dieselbe Kopie von
 * oben. Übrig bleiben ein paar Dutzend Bytes je Sekunde — Same, Monster,
 * Türen, Licht, Aufgaben.
 *
 * **Vier Sorten Nachricht, und jede hat genau einen Absender:**
 *
 * - `state` — der Gastgeber an alle. Er rechnet das Monster und hält den
 *   Stand; alle anderen lesen. Wer rechnet, entscheidet `pickGameHost`.
 * - `claim` — jeder über sich: an welchem Gerät er sitzt und seit wann.
 * - `drone` — der Pilot über die Drohne. Wer sie fliegt, besitzt sie; das ist
 *   dieselbe Regel wie „wer anfasst, besitzt" bei den Kisten im Portal Labor.
 * - `flip` — der Hacker an den Gastgeber: leg diesen Schalter um.
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
  /** Und die, die im Van liegen. */
  done: string[];
}

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

function ids(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  // Nach oben begrenzt: Eine Liste mit hunderttausend Einträgen ist keine
  // Nachricht mehr, sondern ein Angriff auf die Bildrate.
  return value.filter((one): one is string => typeof one === 'string').slice(0, 64);
}

export function readState(data: unknown): HauntState | null {
  const it = bag(data);
  if (!it || it['kind'] !== 'state' || typeof it['seed'] !== 'number') return null;
  const phase = it['phase'];
  const monster = bag(it['monster']);
  return {
    seed: it['seed'] >>> 0,
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

// --- Schreiben --------------------------------------------------------------

export function stateMessage(state: HauntState): unknown {
  return { kind: 'state', ...state };
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
