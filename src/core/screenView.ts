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
 * Bisher gibt es die Karte von oben nur in Haunting / Orbital; jede andere
 * Welt läuft am Bildschirm in 3D. Die Wahl ist trotzdem nicht an Haunting
 * gebunden, sondern an das Gerät: Sie sagt, wie jemand am Bildschirm spielen
 * **will**, und eine Welt, die beides kann, richtet sich danach.
 *
 * Reine Daten und ein bisschen Speicher, kein DOM, kein three.js.
 */

export type ScreenView = '2d' | '3d';

export const SCREEN_VIEWS: readonly ScreenView[] = ['2d', '3d'];

export const SCREEN_VIEW_LABELS: Readonly<Record<ScreenView, string>> = {
  '2d': '2D',
  '3d': '3D',
};

export const SCREEN_VIEW_SUBS: Readonly<Record<ScreenView, string>> = {
  '2d': 'Die Karte von oben — fürs Handy gemacht',
  '3d': 'Die Welt am Bildschirm — Tastatur und Maus oder Stock',
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
