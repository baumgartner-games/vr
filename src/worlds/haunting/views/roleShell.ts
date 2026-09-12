import type { MapSnapshot } from '../map/mapSnapshot';
import type { RoleHost } from '../registry/roles';
import { Toast as UiToast, fact } from '../ui/widgets';

/**
 * **Das bisschen, das alle drei Nicht-VR-Rollen teilen.**
 *
 * Sie zeichnen dieselbe `MapView` wie die 2D-Welt, jede mit eigenen
 * Schichten — das ist die ganze Verwandtschaft, und sie steckt in der `MapView`
 * selbst. Was hier steht, ist der Rest: die Bausteine aus `ui/` unter dem
 * gewohnten Namen, die Codezeile der Akte und die zwei bis drei Fragen an den
 * Snapshot, die sonst jede Rolle für sich beantworten müsste.
 *
 * Bewusst **keine Basisklasse**: Die drei Rollen sind sich in ihrer Form
 * ähnlich und in ihrer Sache überhaupt nicht — eine gemeinsame Oberklasse
 * hätte am Ende drei `if`-Zweige, und genau die sollten aus `stationUi.ts`
 * verschwinden.
 */

/**
 * Die Bausteine kommen aus `ui/` — hier stehen sie noch einmal, damit die
 * Rollen ihren einen Import behalten: das Element, die Meldung, die Zeile.
 */
export { el } from '../ui/dom';
export { TOAST_SECONDS, fact } from '../ui/widgets';

/** Die Meldung einer Rolle: der Baustein aus `ui/`, an der Stelle, die `views.css` ihr gibt. */
export class Toast extends UiToast {
  constructor(className = 'role__toast') {
    super(className);
  }
}

/** Die Zeile der Raumakte, nur mit dem Wert so groß, dass man ihn durchs Zimmer ruft. */
export function code(key: string, value: string): HTMLElement {
  return fact(key, value, { valueClass: 'role__code' });
}

/** Der Raum unter einem Punkt — für die Karten, die auf Zimmer hören. */
export function roomName(snapshot: MapSnapshot, id: string): string {
  return snapshot.rooms.find((room) => room.id === id)?.name ?? id;
}

/**
 * Ein Wirt, der nichts kann — für Ansichten, die man ohne Welt bauen will
 * (Tests, und die Kachel, die es noch nicht gibt).
 */
export function quietHost(snapshot: () => MapSnapshot, spec: RoleHost['spec']): RoleHost {
  return {
    snapshot,
    spec,
    ledger: () => ({ time: 0, taken: [], done: [], crew: { inventory: [] } }),
    me: () => '',
    nameOf: (peer) => peer,
    door: () => '',
    light: () => '',
    switches: () => [],
    notify: () => {},
  };
}
