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
export const GHOST_FADE = 12;

/**
 * **Und wann sie ganz weg ist.** 25 Sekunden sind etwa die Zeit, in der
 * jemand die halbe Station durchquert: Danach sagt der Punkt nichts mehr,
 * und ein Punkt, der nichts mehr sagt, lügt.
 */
export const GHOST_TTL = 25;

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
