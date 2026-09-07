/**
 * **Die drei Schalter der Navigation** — nicht was man *sieht*, sondern was
 * *gilt*.
 *
 * Daneben gibt es die Ebenen (`navLayers.ts`), und die beiden werden gern
 * verwechselt: Eine Ebene macht etwas **sichtbar**, ein Schalter macht es
 * **wirksam**. „Hindernisse aus" heißt nicht, dass man die Kiste nicht mehr
 * sieht — es heißt, dass die Wegsuche sie nicht mehr beachtet, der Zombie
 * mitten hindurchplant und dagegenrennt. Genau dafür sind sie da: Im Labor
 * fragt man nicht „wie sieht das aus", sondern „woran hängt das".
 *
 * Drei Stück, und es sind dieselben drei, die eine Unity-Navmesh ausmacht:
 *
 * - **Fläche** (*NavMesh Surface*) — das Gitter selbst. Aus heißt: niemand
 *   sucht mehr einen Weg, die Hirne laufen stur geradeaus. Der einzige
 *   Schalter, an dem man sieht, was die Wegsuche überhaupt leistet.
 * - **Hindernisse** (*NavMesh Obstacle*) — was zur Laufzeit im Weg steht
 *   (`NavGraph.setBlocked`): die Kiste, die jemand abstellt.
 * - **Verbindungen** (*Off-Mesh Links*) — Treppe, Absprung, Leiter, Portal.
 *   Aus heißt: nur noch Nachbarkacheln, und der kurze Weg ist auf einmal der
 *   lange.
 *
 * Reine Daten und ein Zustand aus drei Wahrheitswerten — kein three.js, damit
 * Beschriftung, Voreinstellung und Umschalten geprüft sind, bevor jemand einen
 * Knopf dafür an die Wand schraubt.
 */

export type NavSwitch = 'surface' | 'obstacles' | 'links';

export interface NavSwitchSpec {
  id: NavSwitch;
  label: string;
  /** Was passiert, wenn man ihn ausmacht — in einem Satz. */
  sub: string;
  /** Die Farbe der Ebene, die dasselbe zeigt (`navLayers.ts`). */
  color: number;
}

export const NAV_SWITCHES: readonly NavSwitchSpec[] = [
  {
    id: 'surface',
    label: 'Fläche',
    sub: 'Nav-Mesh-Surface — aus: keiner sucht mehr einen Weg',
    color: 0x3b7dff,
  },
  {
    id: 'obstacles',
    label: 'Hindernisse',
    sub: 'Nav-Mesh-Obstacle — aus: die Kiste zählt nicht mehr',
    color: 0xff3bd0,
  },
  {
    id: 'links',
    label: 'Verbindungen',
    sub: 'Off-Mesh-Links — aus: keine Treppe, kein Sprung, kein Portal',
    color: 0x9d7bff,
  },
];

export const NAV_SWITCH_IDS: readonly NavSwitch[] = NAV_SWITCHES.map((one) => one.id);

export function switchSpec(id: string | undefined): NavSwitchSpec {
  return NAV_SWITCHES.find((one) => one.id === id) ?? NAV_SWITCHES[0]!;
}

export type NavSwitchState = Record<NavSwitch, boolean>;

/**
 * Die Voreinstellung: **alles an**.
 *
 * Und zwar in jeder Welt, nicht nur im Labor. Ein Schalter, der irgendwo aus
 * anfängt, ist kein Werkzeug mehr, sondern eine Falle — man sucht den Fehler
 * dann in der Wegsuche und findet ihn in einer Einstellung.
 */
export function allOn(): NavSwitchState {
  return { surface: true, obstacles: true, links: true };
}

export function toggleSwitch(state: NavSwitchState, id: NavSwitch): boolean {
  state[id] = !state[id];
  return state[id];
}

/** Ob gerade alles gilt, was gelten kann. */
export function allSwitchesOn(state: Readonly<NavSwitchState>): boolean {
  return NAV_SWITCH_IDS.every((id) => state[id]);
}

/**
 * Was gerade **nicht** gilt, als Zeile.
 *
 * Andersherum als bei den Ebenen, und das ist Absicht: Bei den Ebenen ist „an"
 * die Ausnahme und wird aufgezählt; hier ist „aus" die Ausnahme. „Vollständig"
 * ist die kürzeste Art zu sagen, dass nichts fehlt — eine Liste aller drei
 * sagte dasselbe und würde trotzdem gelesen.
 */
export function switchSummary(state: Readonly<NavSwitchState>): string {
  const off = NAV_SWITCHES.filter((one) => !state[one.id]).map((one) => one.label);
  return off.length === 0 ? 'Vollständig' : `Aus: ${off.join(' · ')}`;
}
