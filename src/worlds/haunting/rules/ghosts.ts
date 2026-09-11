import type { FloorPoint } from '../stationLayout';

/**
 * **Wo der andere zuletzt stand** — der Ghost-Marker, und warum er ein
 * eigenes Datum ist und keine Rechnung im Bild.
 *
 * Beide Seiten spielen gegen jemanden, den sie fast nie sehen. Bis hierher
 * hieß das: Wer aus dem Sichtkegel verschwindet, ist weg — kein Anhaltspunkt,
 * keine Erinnerung, nur Raten. Das Monster hatte immerhin `threat.ts` mit
 * seiner erinnerten Stelle; der Techniker hatte gar nichts, und beides stand
 * nirgends, wo man es hätte zeichnen können.
 *
 * Ein Ghost ist deshalb genau das, was ein Mensch sich merkt: **eine Stelle,
 * ein Blick, ein Zeitpunkt.** Er wird bei Sichtkontakt gesetzt und bleibt
 * danach stehen, bis der nächste Sichtkontakt ihn versetzt — er läuft nicht
 * mit, er rät nicht weiter, er wird nur älter. Genau daran hängt der Bluff:
 * Wer weiß, dass sein Verfolger einen alten Punkt hat, läuft woanders hin.
 *
 * **Warum die Zahlen hier stehen und nicht im Zeichenmodul.** Der Marker wird
 * an vier Stellen gezeichnet — 2D-Szene, 2D-Karte, Monster-Ansicht, 3D-Welt.
 * Vier Meinungen darüber, ab wann eine Erinnerung verblasst, sind vier
 * verschiedene Spiele; deshalb gibt es `GHOST_FADE` und `GHOST_TTL` einmal,
 * und `ghostAlpha` rechnet für alle dieselbe Deckkraft.
 *
 * Reine Rechnung: kein three.js, kein DOM, kein Netz. Über die Leitung geht
 * der Zustand als `HauntState.ghosts` (`net.ts`, `STATION_PROTOCOL` 8), auf
 * die Karte als `MapSnapshot.ghosts`.
 */

/**
 * **Wie lange das Ausblenden dauert**, in Sekunden — die letzten `GHOST_FADE`
 * Sekunden vor dem Verfall. Vorher steht der Marker satt da: Eine Erinnerung,
 * die sofort zu blassen anfängt, sieht aus wie ein Anzeigefehler.
 */
export const GHOST_FADE = 4;

/**
 * **Und wann sie ganz weg ist**: zehn Sekunden nach der letzten Sichtung.
 *
 * Es waren einmal fünfundzwanzig — die Zeit, in der jemand die halbe Station
 * durchquert. Genau das war zu lang: Wer den Punkt so lange stehen lässt,
 * zeichnet einen Gegner an eine Stelle, an der schon zwei Zimmer lang keiner
 * mehr ist, und gewöhnt sich an, ihm zu glauben. Zehn Sekunden sind ungefähr
 * ein Zimmer weit; wird die Sichtung erneuert, fängt die Uhr von vorn an.
 */
export const GHOST_TTL = 10;

/**
 * **Ab wann eine Erinnerung eine Erinnerung ist**, in Sekunden.
 *
 * Ein Marker, der gerade eben gesetzt wurde, steht auf demselben Fleck wie
 * die Figur, die man ansieht — er ist keine Erinnerung, sondern ein zweiter,
 * doppelt gezeichneter Gegner. Eine halbe Sekunde ist die Grenze: Die
 * Sichtprüfung läuft in 3D nur zehnmal je Sekunde (`HauntingWorld.sightTimer`),
 * also darf „gerade eben" nicht enger gefasst sein, als diese Uhr auflöst.
 */
export const GHOST_LIVE = 0.5;

/** Eine gemerkte Stelle: wo, wohin er sah, und wann das war (Rundenzeit). */
export interface Ghost {
  x: number;
  z: number;
  /** Der Blick zu diesem Zeitpunkt, wie `MapEntity.yaw` — 0 schaut nach Norden. */
  yaw: number;
  /** Rundenzeit des Sichtkontakts (`HauntState.time`), in Sekunden. */
  since: number;
}

/** Was jede Seite vom anderen weiß — beides `null`, solange niemand jemanden gesehen hat. */
export interface Ghosts {
  /** Wo der Techniker das Monster zuletzt gesehen hat. */
  monster: Ghost | null;
  /** Und wo das Monster den Techniker zuletzt gesehen hat. */
  technician: Ghost | null;
}

/** Ein Stand ohne jede Erinnerung — der Anfangswert jeder Runde. */
export function freshGhosts(): Ghosts {
  return { monster: null, technician: null };
}

/**
 * **Einen Marker fortschreiben.** Bei Sichtkontakt steht er neu; ohne
 * Sichtkontakt bleibt er, was er war — auch wenn er längst alt ist.
 *
 * Das Vergessen steckt **nicht** hier, sondern in `ghostAlpha`: Ein Marker,
 * der von selbst verschwände, wäre für den Zeichner ein Flackern zwischen
 * „da" und „weg", und die Anzeige könnte nicht mehr sagen, *wie* alt die
 * Erinnerung ist. Wer alt ist, wird blass; gelöscht wird nichts.
 */
export function markGhost(
  prev: Ghost | null,
  seen: boolean,
  at: FloorPoint,
  yaw: number,
  now: number,
): Ghost | null {
  if (!seen) return prev;
  return { x: at.x, z: at.z, yaw, since: now };
}

/** Wie alt diese Erinnerung ist, in Sekunden — nie negativ. */
export function ghostAge(ghost: Ghost, now: number): number {
  return Math.max(0, now - ghost.since);
}

/**
 * **Wie kräftig der Marker noch gezeichnet wird**, von 1 bis 0.
 *
 * Voll, solange noch mehr als `GHOST_FADE` Sekunden bis zum Verfall bleiben;
 * danach linear hinunter, und ab `GHOST_TTL` ist er 0. Die Zahl gilt für
 * jede Darstellung gleich — wer sie mit einer eigenen Kurve überschreibt,
 * nimmt dem Spiel wieder die eine Wahrheit.
 */
export function ghostAlpha(ghost: Ghost, now: number): number {
  const age = ghostAge(ghost, now);
  if (age >= GHOST_TTL) return 0;
  const start = GHOST_TTL - GHOST_FADE;
  if (age <= start) return 1;
  return (GHOST_TTL - age) / GHOST_FADE;
}

/** Wessen Marker das ist: der des Monsters oder der des Technikers. */
export type GhostKind = 'monster' | 'technician';

/** Ein Marker, wie eine Ansicht ihn zeichnet: welcher, wo, wie kräftig. */
export interface DrawnGhost {
  kind: GhostKind;
  ghost: Ghost;
  /** Die Deckkraft für diese Ansicht — `ghostAlpha`, beim Zuschauer gedämpft. */
  alpha: number;
}

/**
 * **Wie blass ein Marker beim Zuschauer steht.**
 *
 * „Alles sehen" zeigt beide Marker **neben** den echten Figuren. Stünden sie
 * gleich kräftig da, hätte der Zuschauer vier Wesen auf der Karte und müsste
 * raten, welche zwei davon es wirklich gibt. Ein Drittel Deckkraft macht den
 * Unterschied auf einen Blick.
 */
export const GHOST_WATCH = 0.35;

/**
 * **Welche Marker eine Ansicht zeichnet** — die eine Stelle, an der die Regel
 * aus dem Umbauplan steht, damit sie nicht in vier Zeichnern viermal
 * verschieden ausfällt.
 *
 * - **Realitätsnah** heißt: Man sieht nur den Marker des **anderen**, und nur
 *   solange man den anderen nicht wirklich sieht. Ein Marker neben der
 *   leibhaftigen Figur ist keine Erinnerung, sondern ein zweiter Gegner —
 *   und er verrät obendrein, wie alt die Sichtung ist, die man gerade selbst
 *   hat.
 * - **Alles sehen** heißt: beide, blass, neben den echten Figuren. Der
 *   Zuschauer soll ja gerade sehen, *was die beiden voneinander glauben* —
 *   das ist die halbe Spannung, und ohne beide Marker nebeneinander sieht man
 *   sie nicht.
 *
 * Verfallene Marker (`ghostAlpha` 0) fallen heraus; wer nichts zurückbekommt,
 * zeichnet nichts.
 */
export function ghostsToDraw(
  ghosts: Ghosts | undefined,
  now: number,
  view: {
    /** Ob die Ansicht alles zeigt („Alles sehen"). */
    omniscient: boolean;
    /** Wer hinsieht — beim Zuschauer egal. */
    viewer: GhostKind;
    /** Ob die Figur dieser Sorte gerade wirklich zu sehen ist. */
    visible?: (kind: GhostKind) => boolean;
  },
): DrawnGhost[] {
  if (!ghosts) return [];
  const out: DrawnGhost[] = [];
  const wanted: GhostKind[] = view.omniscient
    ? ['monster', 'technician']
    : [view.viewer === 'monster' ? 'technician' : 'monster'];
  for (const kind of wanted) {
    const ghost = ghosts[kind];
    if (!ghost) continue;
    if (!view.omniscient && view.visible?.(kind)) continue;
    const alpha = ghostAlpha(ghost, now) * (view.omniscient ? GHOST_WATCH : 1);
    if (alpha <= 0) continue;
    out.push({ kind, ghost, alpha });
  }
  return out;
}

/**
 * **„vor 6 s"** — wie alt eine Erinnerung im Funk und auf der Schalttafel
 * heißt. Sekunden, solange es Sekunden sind; darüber Minuten, denn „vor 94 s"
 * liest niemand mehr als Zeitangabe.
 */
export function ghostAgeText(ghost: Ghost, now: number): string {
  const age = Math.round(ghostAge(ghost, now));
  if (age < 60) return `vor ${age} s`;
  return `vor ${Math.round(age / 60)} min`;
}
