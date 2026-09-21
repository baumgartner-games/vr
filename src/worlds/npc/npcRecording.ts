import type { NpcKind } from './npcKinds';

/**
 * **Eine aufgezeichnete Aktion** — was ein Spieler getan hat, während er einen
 * NPC übernommen hatte, so festgehalten, dass der NPC es später allein wieder
 * tun kann.
 *
 * Reine Rechnung, kein three.js: Was hier steht, sind Zahlen und die Regeln,
 * wie man zwischen ihnen liest. Die Welt (`PortalWorld`) füttert den
 * `Recorder` jedes Bild mit der Pose des Spielers und den Dingen in seinen
 * Händen, und beim Abspielen fragt der Regisseur (`NpcDirector`) für eine Zeit
 * `t` nach der Pose dazwischen (`poseAt`, `propPoseAt`). Dass beides ohne
 * Brille prüfbar ist, ist der Grund für die Trennung — eine Aufnahme, die man
 * nur in der Brille ansehen kann, sieht sich niemand an.
 *
 * **Aufgezeichnet werden die Füße, der Gierwinkel, der Kopf und die Hände**,
 * alles in Weltkoordinaten. Absolut und nicht relativ zum Start: Eine Aktion
 * wie „die Heizdecke von der Puppe nehmen" gehört an den Ort, an dem die
 * Decke liegt, und ein Charakter, der an anderer Stelle geladen wird, geht
 * eben erst dorthin — die Füße stehen im ersten Bild, und dort wird er
 * hingestellt.
 *
 * **Und die Dinge in der Hand laufen als eigene Spuren mit** (`PropTrack`).
 * Was während der Aufnahme einmal angefasst wurde, wird von da an bis zum
 * Ende mitgeschrieben — auch nachdem es losgelassen ist, denn wo eine
 * Decke hinfällt, gehört zur Aktion dazu. Jede Spur trägt ihre **Sorte**
 * (`kind`, dieselbe wie im Beutel) und nicht nur ihre Id: Die Id kennt nur
 * diese Sitzung; wer einen alten Charakter lädt, baut aus der Sorte ein neues
 * Ding und stellt es dorthin, wo die Spur beginnt.
 *
 * **Die Abtastrate ist begrenzt** (`RECORD_RATE`, 20 je Sekunde): Ein Bild in
 * der Brille kommt neunzigmal je Sekunde, und eine Minute davon wäre ein
 * halbes Megabyte im Browser-Speicher. Zwanzig reichen für eine Hand, die
 * eine Decke wegzieht — dazwischen wird gerechnet, nicht gesprungen.
 * Gerundet wird auf Millimeter und Zehntausendstel; das ist unter dem, was
 * eine Hand hält, und halbiert die Zeichenkette noch einmal.
 */

/** Abtastungen je Sekunde — mehr kostet Speicher und zeigt nichts. */
export const RECORD_RATE = 20;

/** Länger nimmt der Rekorder nicht auf; danach hält er von selbst an. */
export const RECORD_MAX_SECONDS = 180;

/** Das Dateiformat trägt vom ersten Tag an eine Nummer (siehe `navFile.ts`). */
export const RECORDING_VERSION = 1;

/** Ort und Drehung: x, y, z, qx, qy, qz, qw. */
export type Placement = readonly [number, number, number, number, number, number, number];

/** Ein Bild der Aufnahme: wo der Spieler war und wie er stand. */
export interface PoseFrame {
  /** Sekunden seit Beginn der Aufnahme. */
  readonly t: number;
  /** Die Füße, in der Welt. */
  readonly feet: readonly [number, number, number];
  /** Der Gierwinkel des Körpers, wie ihn das NPC-Modell dreht (`Npc.yaw`). */
  readonly yaw: number;
  readonly head: Placement;
  /** `null`, wo die Hand gerade nicht getrackt war. */
  readonly left: Placement | null;
  readonly right: Placement | null;
}

/** Ein Bild einer Ding-Spur. */
export interface PropFrame {
  readonly t: number;
  readonly pose: Placement;
  /** Ob in diesem Bild eine Hand es hielt — beim Abspielen hebt die Puppe dann den Arm dorthin. */
  readonly held: boolean;
}

/** Die Spur eines Dings, das während der Aufnahme angefasst wurde. */
export interface PropTrack {
  /** Die Id in der Sitzung, in der aufgenommen wurde. */
  readonly id: string;
  /** Die Sorte (`PropKind`) — daraus baut eine neue Sitzung das Ding nach. */
  readonly kind: string;
  readonly frames: PropFrame[];
}

export interface Recording {
  readonly version: number;
  /** Die Haut, mit der aufgenommen wurde. */
  readonly kind: NpcKind;
  readonly duration: number;
  readonly frames: PoseFrame[];
  readonly props: PropTrack[];
}

/** Was die Welt je Bild hineingibt — ohne three.js, nur Zahlen. */
export interface Vec3Like {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface QuatLike extends Vec3Like {
  readonly w: number;
}

export interface PlacementLike {
  readonly position: Vec3Like;
  readonly quaternion: QuatLike;
}

export interface PoseSample {
  readonly feet: Vec3Like;
  readonly yaw: number;
  readonly head: PlacementLike;
  readonly left: PlacementLike | null;
  readonly right: PlacementLike | null;
}

export interface PropSample extends PlacementLike {
  readonly id: string;
  readonly kind: string;
  readonly held: boolean;
}

/** Was `poseAt` zurückgibt: dieselben Felder wie ein Bild, nur dazwischen gerechnet. */
export interface PoseAt {
  feet: [number, number, number];
  yaw: number;
  head: [number, number, number, number, number, number, number];
  left: [number, number, number, number, number, number, number] | null;
  right: [number, number, number, number, number, number, number] | null;
}

export interface PropPoseAt {
  pose: [number, number, number, number, number, number, number];
  held: boolean;
}

/**
 * Nimmt auf. `sample` wird jedes Bild gerufen und schreibt nur, wenn seit dem
 * letzten Bild genug Zeit vergangen ist; `finish` gibt die Aufnahme heraus.
 */
export class Recorder {
  private readonly frames: PoseFrame[] = [];
  private readonly tracks = new Map<string, PropTrack>();
  private lastAt = -Infinity;
  private startedAt: number | null = null;
  private clock = 0;

  constructor(
    readonly kind: NpcKind,
    private readonly rate = RECORD_RATE,
    private readonly maxSeconds = RECORD_MAX_SECONDS,
  ) {}

  /** Sekunden seit Beginn — für die Anzeige am Handgelenk. */
  get elapsed(): number {
    return this.clock;
  }

  get frameCount(): number {
    return this.frames.length;
  }

  /** Wie viele Dinge bisher angefasst wurden. */
  get propCount(): number {
    return this.tracks.size;
  }

  /** Voll ist voll: Danach schreibt `sample` nichts mehr und meldet `false`. */
  get full(): boolean {
    return this.clock >= this.maxSeconds;
  }

  /**
   * Ein Bild. `now` ist eine beliebige Uhr in Sekunden; die erste Probe legt
   * den Nullpunkt. Gibt zurück, ob geschrieben wurde.
   */
  sample(now: number, pose: PoseSample, props: readonly PropSample[]): boolean {
    this.startedAt ??= now;
    this.clock = now - this.startedAt;
    if (this.clock > this.maxSeconds) {
      this.clock = this.maxSeconds;
      return false;
    }
    if (this.clock - this.lastAt < 1 / this.rate - 1e-6) return false;
    this.lastAt = this.clock;
    const t = round(this.clock, 3);
    this.frames.push({
      t,
      feet: [round(pose.feet.x, 3), round(pose.feet.y, 3), round(pose.feet.z, 3)],
      yaw: round(pose.yaw, 4),
      head: placementOf(pose.head),
      left: pose.left ? placementOf(pose.left) : null,
      right: pose.right ? placementOf(pose.right) : null,
    });
    for (const prop of props) {
      let track = this.tracks.get(prop.id);
      if (!track) {
        track = { id: prop.id, kind: prop.kind, frames: [] };
        this.tracks.set(prop.id, track);
      }
      track.frames.push({ t, pose: placementOf(prop), held: prop.held });
    }
    return true;
  }

  finish(): Recording {
    const last = this.frames[this.frames.length - 1];
    return {
      version: RECORDING_VERSION,
      kind: this.kind,
      duration: last ? last.t : 0,
      frames: this.frames,
      props: [...this.tracks.values()],
    };
  }
}

/**
 * Die Pose zur Zeit `t` — zwischen zwei Bildern gerechnet, vor dem ersten das
 * erste, nach dem letzten das letzte. `null` nur bei einer leeren Aufnahme.
 */
export function poseAt(recording: Recording, t: number): PoseAt | null {
  const frames = recording.frames;
  if (frames.length === 0) return null;
  const [a, b, f] = bracket(frames, t);
  return {
    feet: [
      lerp(a.feet[0], b.feet[0], f),
      lerp(a.feet[1], b.feet[1], f),
      lerp(a.feet[2], b.feet[2], f),
    ],
    yaw: lerpAngle(a.yaw, b.yaw, f),
    head: mixPlacement(a.head, b.head, f),
    // Eine Hand, die in einem der beiden Bildern fehlt, fehlt dazwischen auch:
    // zwischen „da" und „nicht da" gibt es keine Mitte.
    left: a.left && b.left ? mixPlacement(a.left, b.left, f) : null,
    right: a.right && b.right ? mixPlacement(a.right, b.right, f) : null,
  };
}

/**
 * Wo ein Ding zur Zeit `t` liegt. Vor seinem ersten Bild liegt es dort, wo es
 * beim ersten Bild lag — es wurde ja noch nicht angefasst.
 */
export function propPoseAt(track: PropTrack, t: number): PropPoseAt | null {
  if (track.frames.length === 0) return null;
  const [a, b, f] = bracket(track.frames, t);
  return { pose: mixPlacement(a.pose, b.pose, f), held: f < 0.5 ? a.held : b.held };
}

/** Ob die Aufnahme etwas enthält, das sich abspielen lässt. */
export function isPlayable(recording: Recording | null | undefined): recording is Recording {
  return !!recording && recording.frames.length >= 2 && recording.duration > 0;
}

/**
 * Prüft, was aus dem Speicher kommt: Ein fremdes Format wird nicht repariert,
 * sondern abgelehnt — lieber „nicht lesbar" als eine Puppe, die ins Nichts
 * fliegt, weil in einer Zahl `null` stand.
 */
export function readRecording(raw: unknown): Recording | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Partial<Recording>;
  if (value.version !== RECORDING_VERSION) return null;
  if (typeof value.kind !== 'string') return null;
  if (!Array.isArray(value.frames) || !Array.isArray(value.props)) return null;
  for (const frame of value.frames) {
    if (!isPoseFrame(frame)) return null;
  }
  for (const track of value.props) {
    if (!isPropTrack(track)) return null;
  }
  const frames = value.frames as PoseFrame[];
  const last = frames[frames.length - 1];
  return {
    version: RECORDING_VERSION,
    kind: value.kind as NpcKind,
    duration: last ? last.t : 0,
    frames,
    props: value.props as PropTrack[],
  };
}

/** Eine Dauer als Text: `0:07`, `1:32`. */
export function formatDuration(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  return `${minutes}:${rest < 10 ? '0' : ''}${rest}`;
}

// --- Rechnung ---------------------------------------------------------------

function isPoseFrame(frame: unknown): frame is PoseFrame {
  if (!frame || typeof frame !== 'object') return false;
  const f = frame as Partial<PoseFrame>;
  return (
    isFinite(f.t) &&
    isNumbers(f.feet, 3) &&
    isFinite(f.yaw) &&
    isNumbers(f.head, 7) &&
    (f.left === null || isNumbers(f.left, 7)) &&
    (f.right === null || isNumbers(f.right, 7))
  );
}

function isPropTrack(track: unknown): track is PropTrack {
  if (!track || typeof track !== 'object') return false;
  const t = track as Partial<PropTrack>;
  if (typeof t.id !== 'string' || typeof t.kind !== 'string' || !Array.isArray(t.frames)) {
    return false;
  }
  return t.frames.every(
    (frame: Partial<PropFrame>) =>
      !!frame &&
      typeof frame === 'object' &&
      isFinite(frame.t) &&
      isNumbers(frame.pose, 7) &&
      typeof frame.held === 'boolean',
  );
}

function isFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNumbers(value: unknown, length: number): boolean {
  return Array.isArray(value) && value.length === length && value.every(isFinite);
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function placementOf(at: PlacementLike): Placement {
  const p = at.position;
  const q = at.quaternion;
  return [
    round(p.x, 3),
    round(p.y, 3),
    round(p.z, 3),
    round(q.x, 4),
    round(q.y, 4),
    round(q.z, 4),
    round(q.w, 4),
  ];
}

/**
 * Die beiden Bilder um `t` und der Anteil dazwischen. Binäre Suche: Eine
 * Aufnahme hat tausend Bilder, und gefragt wird neunzigmal je Sekunde.
 */
function bracket<T extends { readonly t: number }>(
  frames: readonly T[],
  t: number,
): [T, T, number] {
  const first = frames[0]!;
  const last = frames[frames.length - 1]!;
  if (t <= first.t) return [first, first, 0];
  if (t >= last.t) return [last, last, 0];
  let lo = 0;
  let hi = frames.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (frames[mid]!.t <= t) lo = mid;
    else hi = mid;
  }
  const a = frames[lo]!;
  const b = frames[hi]!;
  const span = b.t - a.t;
  return [a, b, span > 1e-9 ? (t - a.t) / span : 0];
}

function lerp(a: number, b: number, f: number): number {
  return a + (b - a) * f;
}

/** Über den kürzeren Bogen, wie das Hirn dreht (`npcBrain.wrapAngle`). */
export function lerpAngle(a: number, b: number, f: number): number {
  let delta = b - a;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return a + delta * f;
}

/**
 * Ort linear, Drehung als normierte Mischung (nlerp) mit Vorzeichenabgleich —
 * bei zwanzig Bildern je Sekunde liegen zwei Drehungen so dicht beieinander,
 * dass der Unterschied zu slerp unter dem Rauschen des Trackings liegt.
 */
function mixPlacement(
  a: Placement,
  b: Placement,
  f: number,
): [number, number, number, number, number, number, number] {
  const sign = a[3] * b[3] + a[4] * b[4] + a[5] * b[5] + a[6] * b[6] < 0 ? -1 : 1;
  let qx = lerp(a[3], b[3] * sign, f);
  let qy = lerp(a[4], b[4] * sign, f);
  let qz = lerp(a[5], b[5] * sign, f);
  let qw = lerp(a[6], b[6] * sign, f);
  const length = Math.hypot(qx, qy, qz, qw);
  if (length > 1e-9) {
    qx /= length;
    qy /= length;
    qz /= length;
    qw /= length;
  } else {
    qx = qy = qz = 0;
    qw = 1;
  }
  return [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f), qx, qy, qz, qw];
}
