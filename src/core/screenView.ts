import type { PlayerRole } from './types';

/**
 * **2D oder 3D am Bildschirm** — die Frage der Startseite an alle, die keine
 * Brille aufsetzen.
 *
 * Ein Telefon ist ein Gerät für die Karte von oben: 390 Punkte Breite sind
 * keine Einladung in ein Schiff, und der Daumen ist kein Stick. Ein
 * Schreibtisch ist das Gegenteil. Deshalb steht die Wahl **einmal** auf der
 * Startseite, mit einer Voreinstellung nach Gerät — **Handy: 2D, alles andere:
 * 3D** —, und wer es anders will, tippt einmal daneben. Gemerkt wird sie im
 * Browser, wie die Haltung (`posture.ts`), und die Startseite der Runde liest
 * sie, um den Weg in Haunting zu wählen (`rules/lobby.arriveAs`).
 *
 * _Von oben_ gibt es in **jeder** Welt: Es ist dieselbe Szene aus einer festen
 * Kamera darüber (`core/TopDownCamera.ts`) und keine zweite Welt. Nur Haunting
 * bringt seine eigene Runde von oben mit (`World.ownsFlat`) und richtet sich
 * selbst danach.
 *
 * Reine Daten und ein bisschen Speicher, kein DOM, kein three.js.
 */

export type ScreenView = '2d' | '3d';

/**
 * **Wie die beiden Ansichten heißen** — an einer Stelle, für Startseite und
 * Menü.
 *
 * Die **Kennungen** bleiben `'2d'` und `'3d'`: Im Speicher jedes Browsers, der
 * hier schon einmal offen war, steht genau das, und eine Umbenennung hätte
 * jedem seine Wahl genommen. Die **Wörter** sind neu, weil die Sache es ist:
 * „2D" hieß einmal eine eigene, gemalte Kachelwelt. Jetzt ist es dieselbe
 * Welt aus einer festen Kamera darüber (`core/TopDownCamera.ts`) — und dafür
 * ist _Von oben_ der ehrliche Name, mit _Aus den Augen_ als Gegenstück.
 */
export const SCREEN_VIEW_LABELS: Record<ScreenView, string> = {
  '2d': 'Von oben',
  '3d': 'Aus den Augen',
};

/** Die Zeile darunter — dieselbe Erklärung, wo immer die Wahl steht. */
export const SCREEN_VIEW_SUBS: Record<ScreenView, string> = {
  '2d': 'Dieselbe Welt, schräg von oben — die eigene Figur läuft nach Norden, Süden, Osten, Westen.',
  '3d': 'Die Welt durch die eigenen Augen — Tastatur und Maus oder Stock.',
};

const KEY = 'bgvr.screenView';

type Listener = () => void;

const listeners = new Set<Listener>();

/** Wird nach jeder Änderung gerufen — die Knöpfe der Startseite ziehen nach. */
export function onScreenViewChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Womit ein Gerät anfängt, solange niemand gewählt hat: Handy 2D, sonst 3D. */
export function defaultScreenView(role: PlayerRole): ScreenView {
  return role === 'handheld' ? '2d' : '3d';
}

/** Aus fremdem Text (Speicher) eine gültige Wahl — oder die Voreinstellung. */
export function readScreenView(raw: unknown, role: PlayerRole): ScreenView {
  return raw === '2d' || raw === '3d' ? raw : defaultScreenView(role);
}

/** Was gewählt ist — oder die Voreinstellung für dieses Gerät. */
export function screenView(role: PlayerRole): ScreenView {
  return readScreenView(storedScreenView(), role);
}

/** Nur, was wirklich gewählt wurde; `null`, solange die Startseite noch fragt. */
export function storedScreenView(): ScreenView | null {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    return raw === '2d' || raw === '3d' ? raw : null;
  } catch {
    return null;
  }
}

export function saveScreenView(view: ScreenView): void {
  try {
    globalThis.localStorage?.setItem(KEY, view);
  } catch {
    // Privater Modus, kein Speicher: dann gilt die Wahl für diese Sitzung.
  }
  for (const listener of listeners) listener();
}

/**
 * **Was die Startseite fragt — und was auf ihrem einen Knopf steht.**
 *
 * Zwei Fragen und ein Knopf, und welche der beiden Fragen überhaupt gestellt
 * wird, hängt an genau einer Eigenschaft des Geräts: ob dieser Browser eine
 * immersive Sitzung starten kann.
 *
 * - **Mit Brille** ist „2D oder 3D am Bildschirm" gar keine Frage — in der
 *   Brille gibt es nur die eine Ansicht. Gefragt wird dort nach der **Haltung**,
 *   und zwar als einzige: Sie ist das eine, was kein Headset selbst messen kann
 *   (`core/posture.ts`).
 * - **Ohne Brille** ist es umgekehrt. Sitzen oder Stehen ändert am Bildschirm
 *   nichts — die Sicht sitzt ohnehin, wo die Maus sie hindreht —, die Wahl der
 *   Ansicht dagegen alles.
 *
 * Und der Knopf ist **einer**, weil es auch nur einen Weg gibt: mit Brille
 * hinein („Enter VR"), sonst an den Bildschirm („Beitreten") — dort in die
 * Ansicht, die eine Zeile darüber steht. Zwei Knöpfe nebeneinander, von denen
 * einer auf jedem Gerät der falsche ist, waren genau die Frage, die sich
 * niemand stellen wollte.
 */
export interface StartOptions {
  /** Ob nach 2D oder 3D gefragt wird — nur ohne Brille. */
  askView: boolean;
  /** Ob nach Sitzen oder Stehen gefragt wird — nur mit Brille. */
  askPosture: boolean;
  /** Was auf dem einen Knopf steht. */
  label: string;
  /** Wohin er führt: in die Brille, oder an den Bildschirm in diese Ansicht. */
  way: 'vr' | ScreenView;
}

export function startOptions(headset: boolean, view: ScreenView): StartOptions {
  if (headset) return { askView: false, askPosture: true, label: 'Enter VR', way: 'vr' };
  return { askView: true, askPosture: false, label: 'Beitreten', way: view };
}
