import { lapDelta } from './kartTrack';

/**
 * Wer wo liegt, und wie lange er dafür gebraucht hat.
 *
 * Bis eben fuhr jeder für sich: vier Karts standen auf dem Start, aber jeder
 * Spieler bewegte nur seine eigenen — auf dem Schirm des anderen stand
 * dasselbe Kart weiter in der Box. Zwei Leute konnten also nebeneinander
 * herfahren, ohne voneinander etwas zu sehen. Das ist bei einer Rennstrecke
 * ungefähr das Gegenteil dessen, wofür sie gebaut ist.
 *
 * Hier steht die Buchführung dazu, und nur die: die Runden eines Fahrers, die
 * Reihenfolge, in der die Fahrer liegen, und die Zeilen, die daraus auf der
 * Tafel stehen. Kein three.js, kein Netz — beides kommt in `KartWorld` dazu.
 * Die Vorzeichen einer Rundenzählung merkt man sonst erst, wenn jemand
 * rückwärts über die Ziellinie rollt und dabei eine Runde gewinnt.
 */

/** Der Rundenstand eines einzelnen Fahrers. */
export interface LapState {
  /** Wo auf der Strecke er zuletzt war, in Metern ab Start. */
  along: number;
  /** Wie weit er in der laufenden Runde gekommen ist, in Metern. */
  progress: number;
  /** Wie lange die laufende Runde schon dauert, in Sekunden. */
  time: number;
  /** Vollendete Runden. */
  laps: number;
  lastLap: number | null;
  bestLap: number | null;
}

/** Frisch eingestiegen: die Runde beginnt dort, wo das Kart steht. */
export function startLap(along: number): LapState {
  return { along, progress: 0, time: 0, laps: 0, lastLap: null, bestLap: null };
}

export interface LapStep {
  state: LapState;
  /** In diesem Schritt ist eine Runde voll geworden. */
  completed: boolean;
  /** Und sie war die schnellste bisher. */
  record: boolean;
}

/**
 * Ein Bild weiter: wo das Kart jetzt steht, und was das für die Runde heißt.
 *
 * Gezählt wird **zurückgelegter Weg** und nicht das Überfahren einer Linie.
 * Der Unterschied ist der ganze Punkt: Wer kurz vor dem Ziel wendet, ein
 * Stück zurückfährt und wieder vorwärts, hat keine Runde gemacht — sein
 * Fortschritt geht dabei zurück, weil `lapDelta` das Vorzeichen kennt. Eine
 * Ziellinie allein zählte dabei zweimal.
 */
export function stepLap(state: LapState, along: number, lapLength: number, dt: number): LapStep {
  const next: LapState = {
    ...state,
    along,
    time: state.time + dt,
    progress: state.progress + lapDelta(state.along, along, lapLength),
  };
  if (next.progress < lapLength) return { state: next, completed: false, record: false };

  next.progress -= lapLength;
  next.laps += 1;
  next.lastLap = next.time;
  next.time = 0;
  const record = state.bestLap === null || next.lastLap < state.bestLap;
  if (record) next.bestLap = next.lastLap;
  return { state: next, completed: true, record };
}

/** Ein Fahrer, wie ihn die Tafel und die Reihenfolge sehen. */
export interface Racer {
  /** Peer-Id — im eigenen Fall die eigene. */
  id: string;
  name: string;
  /** Das Kart, in dem er sitzt. `null` heißt: steht daneben. */
  kart: number | null;
  laps: number;
  /** Meter in der laufenden Runde — der Rest der Reihenfolge. */
  progress: number;
  lastLap: number | null;
  bestLap: number | null;
}

/**
 * Die Reihenfolge: mehr Runden zuerst, bei gleichen Runden der weiter
 * gekommene.
 *
 * Wer gar nicht fährt, steht am Ende — sonst führte jemand das Feld an, der
 * neben der Strecke steht und noch keinen Meter gefahren ist. Bei exakt
 * gleichem Stand entscheidet die Id: irgendetwas muss entscheiden, und es muss
 * auf beiden Rechnern dasselbe sein.
 */
export function standings(racers: readonly Racer[]): Racer[] {
  return [...racers].sort((a, b) => {
    const drivingA = a.kart !== null ? 0 : 1;
    const drivingB = b.kart !== null ? 0 : 1;
    if (drivingA !== drivingB) return drivingA - drivingB;
    if (a.laps !== b.laps) return b.laps - a.laps;
    if (a.progress !== b.progress) return b.progress - a.progress;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/** Minuten:Sekunden mit zwei Nachkommastellen — „1:04.20". */
export function formatLap(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds - minutes * 60;
  return `${minutes}:${rest.toFixed(2).padStart(5, '0')}`;
}

/**
 * Was auf der Tafel steht, Zeile für Zeile.
 *
 * Die eigene Zeile trägt einen Pfeil. In der Brille ist die Frage nie „wer
 * führt", sondern „wo stehe *ich* darin" — und einen Namen zu suchen, während
 * man in eine Kurve fährt, ist keine Antwort.
 */
export function raceLines(racers: readonly Racer[], localId: string): string[] {
  return standings(racers).map((racer, index) => {
    const mark = racer.id === localId ? '▸' : ' ';
    const best = racer.bestLap === null ? '—' : formatLap(racer.bestLap);
    const laps = racer.kart === null ? 'daneben' : `${racer.laps} Rd`;
    return `${mark}${index + 1}. ${racer.name} · ${laps} · ${best}`;
  });
}
