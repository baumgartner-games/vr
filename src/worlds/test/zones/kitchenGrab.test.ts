import { grabsByHitbox, holdFor, nearestHandle, type GrabPose } from '../../../core/grabHandles';
import { interactionGrab, resolveInteraction, vrInputs } from '../../../core/interaction';
import {
  KITCHEN_REACH,
  KITCHEN_STATION_GRAB,
  PLATE_RIM_HANDLES,
  kitchenGrab,
  kitchenHandles,
} from './kitchenGrab';
import { dish, kitchenDeed, kitchenGivesUp, kitchenInteractionSpec } from './kitchenCarry';
import { PLATE_RADIUS } from './kitchenProps';
import type { KitchenItem } from './kitchenRecipes';

const PAN_SIZE = { width: 0.63, depth: 1.08, height: 0.18 };
const TANK_SIZE = { width: 0.3, depth: 0.3, height: 0.8 };

function at(x: number, y: number, z: number): GrabPose {
  return { position: { x, y, z }, rotation: { x: 0, y: 0, z: 0, w: 1 } };
}

/**
 * **Die Griffe der Küche** — welches Ding welche hat, und was daraus für die
 * Bedienung in der Brille folgt.
 *
 * Drei Fälle stehen im Auftrag, und alle drei stehen hier: keine Griffe für
 * die Zutaten, einer für die Geräte, mehrere für den Teller. Dazu die beiden
 * Zusicherungen, die man sonst nur in der Brille prüfen könnte: dass für
 * Küchendinge **kein** Nah- und Ferngreifen gilt, und dass eine Fläche erst
 * beim Loslassen etwas annimmt.
 */
describe('Wie ein Küchending gegriffen werden will', () => {
  it('gibt den Zutaten keinen Griff — man packt zu, wo man hinfasst', () => {
    const plain: KitchenItem[] = [
      'bun',
      'tomato',
      'tomato-cut',
      'lettuce',
      'lettuce-cut',
      'patty',
      'patty-cooked',
      'patty-burnt',
      'tomato-soup',
    ];
    for (const item of plain) {
      expect(kitchenHandles(item)).toHaveLength(0);
      expect(grabsByHitbox(kitchenGrab(item))).toBe(true);
    }
    // Und ohne Griff sitzt es unverdreht in der Faust.
    expect(holdFor(null).rotation).toEqual({ x: 0, y: 0, z: 0, w: 1 });
  });

  it('gibt Pfanne und Topf genau einen Griff, und der sitzt am Stiel', () => {
    for (const item of ['pan', 'pot'] as const) {
      const handles = kitchenHandles(item, PAN_SIZE);
      expect(handles).toHaveLength(1);
      const [stalk] = handles;
      expect(stalk!.id).toBe('stiel');
      // Auf der Seite des Stiels, also **hinter** der Mulde (`kitchenFit.PAN_BOWL`
      // rückt sie nach -z), und oben am Rand statt auf halber Höhe.
      expect(stalk!.pose.position.z).toBeGreaterThan(0.3);
      expect(stalk!.pose.position.z).toBeLessThan(PAN_SIZE.depth / 2);
      expect(stalk!.pose.position.y).toBeGreaterThan(PAN_SIZE.height / 2);
      expect(stalk!.pose.position.x).toBe(0);
    }
  });

  it('gibt dem Feuerlöscher einen Griff oben, wie der Taschenlampe', () => {
    const handles = kitchenHandles('extinguisher', TANK_SIZE);
    expect(handles).toHaveLength(1);
    expect(handles[0]!.id).toBe('kopf');
    // Oben, dort wo das Ventil sitzt — nicht auf halber Höhe am Bauch.
    expect(handles[0]!.pose.position.y).toBeGreaterThan(TANK_SIZE.height * 0.7);
  });

  it('gibt dem Teller den Rand und die Unterseite', () => {
    for (const item of ['plate', 'plate-dirty'] as const) {
      const handles = kitchenHandles(item);
      expect(handles).toHaveLength(PLATE_RIM_HANDLES + 1);
      expect(handles[0]!.id).toBe('boden');
      // Der Boden liegt in der Mitte unten, der Rand draußen.
      expect(handles[0]!.pose.position).toEqual({ x: 0, y: 0, z: 0 });
      for (const rim of handles.slice(1)) {
        const away = Math.hypot(rim.pose.position.x, rim.pose.position.z);
        expect(away).toBeCloseTo(PLATE_RADIUS * 0.92, 5);
      }
    }
  });

  /**
   * **Welcher der neun es wird, entscheidet die Hand** — genau das ist der
   * Gewinn der Brille: feiner wählen, nicht weiter greifen.
   */
  it('lässt die Hand am Teller den nächsten Griff wählen', () => {
    const handles = kitchenHandles('plate');
    const plate = at(2, 1, 2);
    // Von unten an den Teller: der Boden.
    expect(nearestHandle(handles, plate, { x: 2, y: 0.85, z: 2 })?.handle.id).toBe('boden');
    // Von vorn an den Rand: einer vom Ring, und nicht der Boden.
    const front = nearestHandle(handles, plate, { x: 2, y: 1, z: 2.6 })?.handle.id;
    expect(front).toMatch(/^rand-/);
  });
});

describe('Wie weit in der Küche gegriffen wird', () => {
  /**
   * **Kein Near-Pull, kein Far-Pull** — für die Küchendinge zählt der Meter.
   * Und ebenso wichtig: Alles, was nichts angibt, behält alle drei
   * Reichweiten. Werkzeuge, Waffen und Gürtelplätze sagen nichts an.
   */
  it('setzt für alles in der Küche die Moore-Nachbarschaft', () => {
    expect(KITCHEN_REACH).toBe('moore');
    expect(kitchenGrab('pan').reach).toBe('moore');
    expect(kitchenGrab('bun').reach).toBe('moore');
    expect(KITCHEN_STATION_GRAB.reach).toBe('moore');
    expect(KITCHEN_STATION_GRAB.handles).toHaveLength(0);
  });

  it('lässt alles andere bei allen drei Reichweiten', () => {
    // Ein Werkzeug meldet keine Griffangabe an — und bekommt die Vorgabe.
    expect(interactionGrab('grab').reach).toBe('all');
    expect(interactionGrab({ kind: 'grab' }).reach).toBe('all');
    expect(interactionGrab(undefined).reach).toBe('all');
  });

  it('reicht die Angabe durch die Anmeldung einer Station hindurch', () => {
    const take = kitchenDeed(null, { kind: 'box', gives: 'bun' });
    const spec = kitchenInteractionSpec(take, kitchenGrab('bun'));
    expect(interactionGrab(spec).reach).toBe('moore');
    expect(spec.kind).toBe('grab');
  });
});

describe('Abgelegt wird erst beim Loslassen', () => {
  /**
   * Der gemeldete Fehler, als Regel: Sechs Taten geben etwas aus der Hand, und
   * die sechs gehören in der Brille der Greif-Taste. Wer mit dem Topf an der
   * Arbeitsplatte vorbeikommt, stellt ihn nicht ab.
   */
  it('gibt jede Tat, die etwas aus der Hand gibt, der Greif-Taste', () => {
    const cases = [
      kitchenDeed(dish('plate'), { kind: 'top' }),
      kitchenDeed(dish('lettuce'), { kind: 'board' }),
      kitchenDeed(dish('plate-dirty'), { kind: 'sink' }),
      kitchenDeed(dish('bun'), { kind: 'bin' }),
      kitchenDeed(dish('plate', ['bun', 'patty-cooked']), { kind: 'serve' }),
      kitchenDeed(dish('tomato-cut'), { kind: 'top', on: dish('plate') }),
    ];
    for (const deed of cases) {
      expect(kitchenGivesUp(deed)).toBe(true);
      const spec = kitchenInteractionSpec(deed, KITCHEN_STATION_GRAB);
      expect(vrInputs(spec)).toEqual(['grip']);
      expect(resolveInteraction(spec, 'vr').press).toBe('hold');
    }
  });

  it('lässt das Löschen eine Berührung bleiben — es nimmt der Hand nichts weg', () => {
    const deed = kitchenDeed(dish('extinguisher'), { kind: 'stove', on: dish('pan'), fire: true });
    expect(deed.do).toBe('douse');
    expect(kitchenGivesUp(deed)).toBe(false);
    expect(vrInputs(kitchenInteractionSpec(deed))).toEqual(['handTouch', 'aimTrigger']);
  });

  /**
   * **Von oben ändert sich nichts.** `A` tut, was `A` immer getan hat — die
   * Ausnahme gilt nur für die Ansicht `vr`.
   */
  it('lässt `A` von oben und am Schreibtisch unberührt', () => {
    const deed = kitchenDeed(dish('plate'), { kind: 'top' });
    const spec = kitchenInteractionSpec(deed, KITCHEN_STATION_GRAB);
    expect(resolveInteraction(spec, 'topDown').inputs).toEqual(['useButton', 'useKey']);
    expect(resolveInteraction(spec, 'topDown').press).toBe('tap');
    expect(resolveInteraction(spec, 'firstPerson').inputs).toEqual(['pointer', 'useKey']);
  });

  it('gibt einer Station ohne Angebot weiter gar nichts', () => {
    const spec = kitchenInteractionSpec(kitchenDeed(null, { kind: 'top' }));
    expect(spec.kind).toBe('none');
    expect(resolveInteraction(spec, 'vr').interactive).toBe(false);
  });
});
