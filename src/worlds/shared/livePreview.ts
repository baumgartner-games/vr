import type * as THREE from 'three';
import type { NavLayer, NavLayerState } from '../nav/navLayers';
import type { NavSwitch, NavSwitchState } from '../nav/navSwitches';
import type { BarMode } from '../npc/NpcBody';

/**
 * **Eine Vorschau, die läuft** — die Welt auf der Werkzeugseite, nicht als
 * Bild, sondern in Betrieb.
 *
 * Die stille Vorschau (`WorldPreview`) ist eine Kulisse: gebaut mit denselben
 * Zeilen wie im Spiel, aber mit einer Attrappe statt einer Physik, damit man
 * sie ansehen kann, ohne sie zu betreten. Das reicht für „wie ist diese Welt
 * angelegt" und für nichts sonst — ein Navigationslabor, dessen acht Knöpfe
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
 *   seine Attrappe: Man tippt auf den Boden, und er läuft dorthin. Sie kann
 *   **weggehen** (`setHere`) — dann steht niemand in der Welt und alles bleibt
 *   stehen —, und sie kann statt zu springen zu Fuß **hingehen**
 *   (`walkTarget`), über dasselbe Gitter wie ein NPC.
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

  /**
   * **Lässt sie dorthin gehen**, statt sie zu versetzen — über dieselbe
   * Wegsuche, die auch die NPCs benutzen (`shared/previewWalk.ts`).
   *
   * Der Unterschied ist der zwischen einem Ziel und einem Spieler: Ein Ziel
   * setzt man hin und sieht, welchen Weg die anderen dorthin nehmen; ein
   * Spieler geht, und was zwischen ihm und der anderen Ecke liegt, merkt er
   * dabei. Vor einer verriegelten Tür bleibt sie stehen — das ist keine Panne,
   * sondern die Auskunft.
   */
  walkTarget(at: THREE.Vector3): void;

  /**
   * **Ob die Figur überhaupt in der Welt steht.**
   *
   * Ausgeschaltet ist sie nicht bloß unsichtbar: Für alles, was den Spieler
   * sucht, ist dann **keiner da** — die Zombies bleiben stehen, die Wegsuche
   * hat kein Ziel. Genau das will man, wenn man eine Welt ansehen möchte, ohne
   * in ihr zu stehen.
   */
  here(): boolean;
  setHere(on: boolean): void;

  /**
   * **Wie weit die Figur langt**, in Metern.
   *
   * Der Halbmesser des Kreises, in dem etwas „in Reichweite" ist —
   * **doppelt** so groß wie der, in dem eine Spielerhand von selbst zugreift
   * (`portal/grabReach.ts`, `DEFAULT_NEAR_RADIUS`). Doppelt, weil hier niemand
   * eine Hand ausstreckt: Man zeigt von oben auf eine Stelle und will wissen,
   * was dort steht, und ein Kreis von einem Meter auf einer Karte von hundert
   * ist ein Punkt.
   */
  readonly reach: number;

  /**
   * **Den Kreis dorthin legen** — oder wegnehmen (`null`).
   *
   * Er ist die andere Hälfte von „was steht hier": Die Liste unter dem Bild
   * sagt, *was* in Reichweite ist, der Kreis sagt, *wo* das ist. Ohne ihn
   * verschwindet die Hälfte der Knöpfe aus der Liste, und niemand weiß, warum.
   */
  probe(at: THREE.Vector3 | null): void;

  /** Welche Debug-Ebenen gerade an sind. */
  layers(): Readonly<NavLayerState>;
  setLayer(layer: NavLayer, on: boolean): void;

  /**
   * Was von der Navigation gerade **gilt** (`nav/navSwitches.ts`).
   *
   * Die zweite Reihe unter dem Bild, und sie tut etwas anderes als die erste:
   * Die Ebenen zeigen, diese Schalter wirken. „Hindernisse aus" heißt nicht,
   * dass die Kiste verschwindet — es heißt, dass die Wegsuche sie nicht mehr
   * beachtet und der Zombie dagegenrennt.
   */
  switches(): Readonly<NavSwitchState>;
  setSwitch(id: NavSwitch, on: boolean): void;

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
   * Labors schaltet dieselben Ebenen, für die die Seite eigene Schalter
   * hat. Antippen soll man sie trotzdem können — was in der Welt steht, soll
   * auch gehen —, aber zweimal dieselben sechs Zeilen sind sechs zu viel.
   */
  quiet?: boolean;
  press(): void;
}
