import type { GridPlan } from '../../grid/gridPlan';
import type { ElementSpot } from '../../elements/elementPlace';
import { DIR_N, DIR_S, DIR_W } from '../../nav/navTile';
import { findWorld } from '../../index';
import { START } from '../layout';

/**
 * **Start und Tor** — die Mitte des Geländes.
 *
 * Neun mal neun Kacheln, und von hier geht es in jede Himmelsrichtung. Was
 * hier steht, ist mit Absicht wenig: ein Schild, das sagt, wo man ist, die
 * Garderobe vor der Wand daneben und drei Kacheln weiter das Tor zurück in
 * den Hub. Wer ankommt, soll das Gelände sehen und nicht die Möblierung des
 * Startplatzes.
 *
 * **Drei Kacheln und keine eine.** Ein Tor neben dem Startpunkt ist eines, in
 * das man beim ersten Schritt fällt, bevor man die Welt gesehen hat — und der
 * Grundriss darf nicht darauf bauen, dass die Sperre des Tors
 * (`fixtures/gate.ts`, `GATE_ARM`) das jedes Mal auffängt. Drei Kacheln sind
 * ein Schritt zu viel, um sie versehentlich zu machen.
 *
 * **Der Startpunkt liegt nie auf einer Torkachel** — die Regel des Gitters,
 * und der Test daneben rechnet sie nach.
 */

/** Die Kennungen dieser Zone. Vergeben und nicht gewachsen (AGENTS, _Einbauten_). */
export const HUB_GATE = 'tor-hub';
export const START_SIGN = 'schild-start';
/**
 * **Der Kleiderschrank, den es nicht mehr gibt** — ein Einbau, den ältere
 * gespeicherte Grundrisse noch tragen. `fitStart` nimmt ihn heraus; an seiner
 * Stelle steht die Garderobe (`COAT_RACK_SPOT`).
 */
export const OLD_WARDROBE = 'schrank-start';

/**
 * **Die Garderobe** (`elements/coatRack.ts`) — `A` öffnet _Aussehen_.
 *
 * Eine Kachel vor der Nordwand, wo bis Oktober 2026 der Kleiderschrank an der
 * Wand stand, und nicht direkt daran: Hinten hängt der Hexenhut, und der
 * stäke sonst in der Wand. Ein Spielelement und kein Einbau — es sperrt seine
 * vier Zellen selbst (`FurnishedWorld.spots`).
 */
export const COAT_RACK_SPOT: ElementSpot = {
  id: 'garderobe-start',
  element: 'coat-rack',
  x: -3,
  z: START.z + 1,
  face: 'S',
};

/** Wo das Tor steht: drei Kacheln südlich des Startpunkts. */
export const GATE_TILE = { x: 0, z: 3 } as const;

/**
 * **Die Nordwand des Platzes**, mit einer Lücke in der Mitte.
 *
 * Sie ist der Grund, dass Schild und Schrank irgendwo hängen können — und die
 * Lücke ist der Gang nach Norden zu den Effektquellen. Drei Kacheln breit, wie
 * jeder Gang hier.
 */
const WALL_COLUMNS: readonly number[] = [-4, -3, -2, 2, 3, 4];

export function stampStart(plan: GridPlan): void {
  for (const x of WALL_COLUMNS) plan.wall(x, START.z, DIR_N);

  // Ein bisschen Mobiliar, damit der Platz ein Platz ist und kein Feld: eine
  // Bank an der Westkante und ein Tisch daneben.
  plan.put('bench', START.x, 1, DIR_W);
  plan.put('table', START.x + 1, 1, DIR_S);
}

/**
 * **Die Einbauten dieser Zone** — und nur sie.
 *
 * Getrennt vom Rest, weil `TestWorld.planLoaded` sie **nach** einem
 * gespeicherten Umbau noch einmal aufsetzt (`GridWorld.applyStored`): Ein Tor,
 * das nur im ausgelieferten Grundriss stünde, wäre beim ersten Besuch da und ab
 * dem zweiten weg — und dann säße man im selbstgebauten Gelände ohne Ausgang.
 *
 * Ein Einbau lässt sich so aufsetzen, weil er eine **Kennung** hat:
 * `putFixture` ersetzt nach Kennung, also entsteht kein zweites Tor daneben.
 * Wände und Bausteine haben keine — die kommen deshalb hier nicht vor, und wer
 * eine Wand wegbaut, hat sie weggebaut.
 */
export function fitStart(plan: GridPlan): void {
  const north = START.z;

  // **Der Kleiderschrank ist weg** — die Garderobe steht als Spielelement
  // davor (`COAT_RACK_SPOT`). Ein gespeicherter Grundriss von früher trägt
  // ihn noch; dort käme er sonst als unbekannte Art und eine Warnung zurück.
  plan.takeFixture(OLD_WARDROBE);

  // Das Schild an derselben Wand, auf der anderen Seite der Lücke.
  plan.putFixture({
    id: START_SIGN,
    kind: 'sign',
    x: 3,
    z: north,
    dir: DIR_N,
    props: {
      text: 'Sandbox · Norden Effekte · Westen Navigation · Osten Schießstand · Süden Gokart',
    },
  });

  /**
   * **Das Tor zurück in den Hub.**
   *
   * Die Farbe kommt aus der Registry (`worlds/index.ts`) und nicht von hier:
   * Ein Tor, das seine eigene Farbe mitbrächte, sähe nach der nächsten
   * Umfärbung anders aus als dasselbe Tor im Hub gegenüber.
   */
  plan.putFixture({
    id: HUB_GATE,
    kind: 'gate',
    x: GATE_TILE.x,
    z: GATE_TILE.z,
    dir: DIR_N,
    props: {
      world: 'hub',
      label: '→ Hub',
      accent: findWorld('hub')?.accent ?? 0x4aa8ff,
      note: 'Zurück in die Halle',
    },
  });
}
