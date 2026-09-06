import type * as THREE from 'three';
import type { NavLayer, NavLayerState } from '../nav/navLayers';
import type { BarMode } from '../npc/NpcBody';

/**
 * **Eine Vorschau, die läuft** — die Welt auf der Werkzeugseite, nicht als
 * Bild, sondern in Betrieb.
 *
 * Die stille Vorschau (`WorldPreview`) ist eine Kulisse: gebaut mit denselben
 * Zeilen wie im Spiel, aber mit einer Attrappe statt einer Physik, damit man
 * sie ansehen kann, ohne sie zu betreten. Das reicht für „wie ist diese Welt
 * angelegt" und für nichts sonst — ein Navigationslabor, dessen sechs Knöpfe
 * man nicht drücken kann, zeigt genau das, was an ihm nicht interessant ist.
 *
 * Diese Schnittstelle ist die Antwort darauf, und sie ist absichtlich **klein**:
 * fünf Sachen, die ein Zuschauer braucht.
 *
 * - **Knöpfe** — was in der Welt gedrückt werden kann, mit Namen. Auf einem
 *   Telefon ist das mehr wert als das Antippen im Bild: Man liest „Stachelgrube
 *   · Start" und trifft ihn, statt eine Kuppel aus dreißig Metern Höhe zu
 *   suchen.
 * - **Ein Schritt** — Physik, Hirne, Wege, ein Bild lang.
 * - **Ein Ziel** — wohin die NPCs laufen. In der Vorschau steht kein Spieler,
 *   und ein Zombie ohne jemanden, dem er nachgeht, bleibt stehen. Das Ziel ist
 *   seine Attrappe: Man tippt auf den Boden, und er läuft dorthin.
 * - **Ebenen** — welche Debug-Linien zu sehen sind (`nav/navLayers.ts`), und
 *   wann die Lebensbalken erscheinen (`npc/NpcBody.ts`).
 * - **Meldungen** — was im Spiel am Handgelenk stünde.
 *
 * Was hier **nicht** steht, ist genauso wichtig: kein Spieler, keine Hände,
 * keine Werkzeuge, kein Netz. Wer das will, betritt die Welt.
 */
export interface LivePreview {
  /** Was man in dieser Welt drücken kann. */
  readonly buttons: readonly PreviewButton[];

  /**
   * Ein Bild rechnen.
   *
   * @param dt Sekunden seit dem letzten Bild — der Aufrufer deckelt sie, ein
   *           Tab im Hintergrund liefert sonst Sprünge von Sekunden.
   */
  step(dt: number): void;

  /**
   * **Die Attrappe des Spielers**, an der die Hirne sich orientieren — das
   * Ding, das man von oben herumschiebt.
   */
  readonly target: THREE.Object3D;

  /** Setzt sie auf diesen Punkt (Füße, Weltkoordinaten). */
  moveTarget(at: THREE.Vector3): void;

  /** Welche Debug-Ebenen gerade an sind. */
  layers(): Readonly<NavLayerState>;
  setLayer(layer: NavLayer, on: boolean): void;

  /** Wann die Lebensbalken über den NPCs zu sehen sind. */
  bars(): BarMode;
  setBars(mode: BarMode): void;

  /** Was in dieser Welt gerade gemeldet wurde — eine Zeile, die letzte gilt. */
  onMessage(sink: (message: string) => void): void;
}

/** Ein Knopf in der Welt, den eine Vorschau anbietet. */
export interface PreviewButton {
  /**
   * Das Ding im Bild — daran wird getippt, und daran erkennt die Seite auch,
   * welcher Knopf gemeint war.
   */
  object: THREE.Object3D;
  /** Wie er heißt. */
  label: string;
  /** Wozu er gehört — eine Bucht, eine Konsole. Ordnet die Liste daneben. */
  group?: string;
  /** Die Farbe, in der er im Bild steht — dieselbe trägt seine Zeile. */
  accent?: number;
  /**
   * **Nur im Bild, nicht in der Liste.**
   *
   * Für Knöpfe, die daneben schon anders bedient werden: Die Wandkonsole des
   * Labors schaltet dieselben fünf Ebenen, für die die Seite eigene Schalter
   * hat. Antippen soll man sie trotzdem können — was in der Welt steht, soll
   * auch gehen —, aber zweimal dieselben sechs Zeilen sind sechs zu viel.
   */
  quiet?: boolean;
  press(): void;
}
