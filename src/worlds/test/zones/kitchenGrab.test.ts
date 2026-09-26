import {
  grabsByHitbox,
  holdFor,
  nearestHandle,
  type GrabHandle,
  type GrabPose,
} from '../../../core/grabHandles';
import { rotateVec } from '../../portal/tools/aim';
import {
  KITCHEN_PIECES,
  kitchenDeck,
  kitchenPiece,
  type KitchenPiece,
} from '../../../core/kitchenFit';
import { interactionGrab, resolveInteraction, vrInputs } from '../../../core/interaction';
import { GRIP_TO_RAY, STANDARD_GRIP } from '../../portal/tools/gripFit';
import {
  HAND_FOOD_SCALE,
  KITCHEN_REACH,
  KITCHEN_STATION_GRAB,
  PLATE_RIM_HANDLES,
  RIM_GRIP_IN,
  kitchenCarryTurn,
  kitchenGrab,
  kitchenHandScale,
  kitchenHandles,
  kitchenPieceGrab,
  pieceHandles,
} from './kitchenGrab';
import { dish, kitchenDeed, kitchenGivesUp, kitchenInteractionSpec } from './kitchenCarry';
import { PLATE_RADIUS } from './kitchenProps';
import type { KitchenItem } from './kitchenRecipes';

/**
 * **Die Hülle der Pfanne, am Modell nachgemessen** — nicht geschätzt und nicht
 * gerundet, weil an ihr die Winkel hängen, die weiter unten geprüft werden.
 *
 * Gemessen an `public/models/kitchen.glb`, Netz `stove-pan`, Material
 * `Kitchen_Utensils`, und zwar an genau derselben Hülle, die auch das Spiel
 * misst: Ursprung unten in der Mitte, halber Küchenmaßstab
 * (`core/kitchenModel.takeUtensil`, `kitchen.markHandles`). Hier stand einmal
 * eine Höhe von 0,18 m; gemessen sind es 0,128 m, und mit der falschen Höhe
 * wäre jede Aussage über die Steigung des Stiels um ein Drittel daneben.
 */
const PAN_SIZE = { width: 0.628, depth: 1.0785, height: 0.1278 };
const POT_SIZE = { width: 0.86, depth: 0.63, height: 0.31 };
/**
 * Und die des Feuerlöschers, aus `public/models/mixedbag.glb` — seit dem
 * Modelltausch eine andere: schmaler, flacher und eine Handbreit niedriger als
 * der alte aus `kitchen.glb` (0,62 × 0,39 × 0,75). Dieselbe Hülle steht in
 * `kitchenSpray.EXTINGUISHER_HULL`, wo der Nebel sie braucht.
 */
const TANK_SIZE = { width: 0.4434, depth: 0.2121, height: 0.6025 };

/**
 * **Die gemessene Achse des Stiels**, Anteil der halben Tiefe → Anteil der
 * Höhe: die Mitten von Scheiben quer zu z, aus denselben Scheitelpunkten wie
 * oben. Von 0,20 (dort wächst das Rohr aus der Mulde) bis 0,775 (dort endet es
 * und die flache Fahne beginnt), dazu deren Mitte bei 1,00.
 */
const PAN_STALK_AXIS: readonly (readonly [number, number])[] = [
  [0.2, 0.34],
  [0.3, 0.39],
  [0.5, 0.505],
  [0.7, 0.627],
  [0.775, 0.654],
  [1.0, 0.818],
];

/** Wie weit der Standardgriff **jedes** Werkzeug nach vorn neigt, im Bogenmaß. */
const GRIP_PITCH = -2 * Math.atan2(STANDARD_GRIP.rotation.x, STANDARD_GRIP.rotation.w);

function dot(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/** Wohin die Faustachse (+Y) dieses Griffs im Raum des Dings zeigt, gerundet. */
function axisOf(spot: GrabHandle): number[] {
  return round(rotateVec({ x: 0, y: 1, z: 0 }, spot.pose.rotation, { x: 0, y: 0, z: 0 }));
}

/** Und wohin sein Vorne (-Z) zeigt — dorthin, wohin der Zeigefinger zeigt. */
function frontOf(spot: GrabHandle): number[] {
  return round(rotateVec({ x: 0, y: 0, z: -1 }, spot.pose.rotation, { x: 0, y: 0, z: 0 }));
}

/** Auf zwei Stellen: Ein Ohr, das 9° schräg steht, soll nicht am Vergleich scheitern. */
function round(v: { x: number; y: number; z: number }): number[] {
  return [v.x, v.y, v.z].map((one) => Math.round(one * 100) / 100 + 0);
}

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

  /**
   * **Die Pfanne am Stiel** — und zwar an der ganzen Stange, nicht an einem
   * Punkt darauf.
   */
  it('legt den Griff der Pfanne auf den Stiel', () => {
    const handles = kitchenHandles('pan', PAN_SIZE);
    expect(handles).toHaveLength(1);
    const [stalk] = handles;
    expect(stalk!.id).toBe('stiel');
    // Auf der Seite des Stiels, also **hinter** der Mulde (`kitchenFit.PAN_BOWL`
    // rückt sie nach -z), und oben am Rand statt auf halber Höhe.
    expect(stalk!.pose.position.z).toBeGreaterThan(0.3);
    expect(stalk!.pose.position.z).toBeLessThan(PAN_SIZE.depth / 2);
    expect(stalk!.pose.position.y).toBeGreaterThan(PAN_SIZE.height / 2);
    expect(stalk!.pose.position.x).toBe(0);
    // Die Stange liegt längs des Stiels und bleibt in der Hülle.
    expect(Math.abs(stalk!.hold!.along.z)).toBeGreaterThan(0.95);
    expect(stalk!.hold!.length).toBeGreaterThan(PAN_SIZE.depth * 0.3);
    expect(stalk!.hold!.length).toBeLessThan(PAN_SIZE.depth);
  });

  /**
   * **Und sie steckt wirklich im Stiel** — das ist die Frage, die der
   * Prüfstand als Bild beantwortet (`preview/handlesPreview.ts`, Ansicht
   * `pan-roh`), hier als Zahl.
   *
   * Geprüft wird gegen die **gemessene Achse** des Rohrs (`PAN_STALK_AXIS`):
   * An keiner Stelle darf die Stange weiter als vier Millimeter daneben
   * liegen, und das ist weniger als ein Zehntel ihres Halbmessers. Eine
   * Stange, die man von Hand um 20° drehte, fiele hier mit acht Zentimetern
   * durch — genau dafür steht der Test hier.
   */
  it('hält die Stange über ihre ganze Länge in der gemessenen Stielachse', () => {
    const [stalk] = kitchenHandles('pan', PAN_SIZE);
    const half = PAN_SIZE.depth / 2;
    const bar = stalk!.hold!;
    // Die Gerade der Stange, als Höhe über einem Anteil der halben Tiefe.
    const rise = bar.along.y / bar.along.z;
    const heightAt = (along: number): number =>
      stalk!.pose.position.y + (along * half - stalk!.pose.position.z) * rise;
    for (const [along, lift] of PAN_STALK_AXIS) {
      const off = Math.abs(heightAt(along) - lift * PAN_SIZE.height);
      expect([along, off < 0.004]).toEqual([along, true]);
      expect([along, off < bar.radius]).toEqual([along, true]);
    }
  });

  /**
   * **Wie steil der Stiel ansteigt** — 8,1°, und das ist eine Eigenschaft des
   * Modells und keine Einstellung.
   *
   * Gemessen steigt die Achse des Rohrs um 7,4°; mit der flachen Fahne am Ende
   * (`lift` 0,82 bei `along` 1,00), auf der die Spitze der Stange sitzt, sind
   * es 8,1°. Hier stand einmal 8,7° — derselbe Stiel, nur der Fuß der Stange
   * saß drei Zentimeter zu weit hinten.
   */
  it('lässt den Stiel um die gemessenen 8,1° ansteigen', () => {
    const [stalk] = kitchenHandles('pan', PAN_SIZE);
    const bar = stalk!.hold!;
    const rise = (Math.atan2(Math.abs(bar.along.y), Math.abs(bar.along.z)) * 180) / Math.PI;
    expect(rise).toBeCloseTo(8.1, 1);
  });

  /**
   * **Und sie liegt waagerecht in der Faust, mit der Mulde vorn.** Das ist der
   * gemeldete Fehler als Zusicherung: Vorher stand der Stiel in der
   * Faustachse, also hing die Pfanne hochkant und hinter der Hand.
   *
   * Die Faustachse steht dabei **nicht mehr auf der Senkrechten der Pfanne**,
   * sondern um 20,7° nach vorn gekippt — die zweite Rückmeldung aus der
   * Brille („der Zylinder-Halter muss weiter nach vorne gekippt werden, so 20°
   * mehr"), und zwar als gerechnete Zahl: die 8,1° des Stiels plus die 12,6°,
   * mit denen der Standardgriff jedes Werkzeug neigt. Das Vorne zeigt weiter
   * zur Mulde.
   */
  it('kippt die Faust um die 20,7° nach vorn, die aus der Brille gemeldet wurden', () => {
    const [stalk] = kitchenHandles('pan', PAN_SIZE);
    const axis = axisOf(stalk!);
    const front = frontOf(stalk!);
    expect(axis).toEqual([0, 0.94, -0.35]);
    expect(front).toEqual([0, -0.35, -0.94]);
    // Dieselbe Drehung in Grad, und woraus sie besteht — ungerundet, denn eine
    // Achse auf zwei Stellen wäre hier schon ein Drittelgrad daneben.
    const raw = rotateVec({ x: 0, y: 1, z: 0 }, stalk!.pose.rotation, { x: 0, y: 0, z: 0 });
    const tilt = Math.atan2(-raw.z, raw.y);
    const bar = stalk!.hold!;
    const rise = Math.atan2(Math.abs(bar.along.y), Math.abs(bar.along.z));
    expect((tilt * 180) / Math.PI).toBeCloseTo(20.7, 1);
    expect(tilt - rise).toBeCloseTo(GRIP_PITCH, 6);
    expect(GRIP_PITCH).toBeCloseTo(0.22, 10);
  });

  /**
   * **Wofür die 20,7° gut sind**: Der Stiel liegt in der Hand **waagerecht**.
   *
   * Das ist die Rückmeldung selbst, als Rechnung — und die einzige Stelle, an
   * der sie überhaupt nachprüfbar ist: Im Raum der Pfanne war der Zylinder
   * schon vorher richtig, schräg lag er erst in der Faust. Vorher stieg er
   * dort um 21,3° an; jetzt steht er senkrecht auf der Welt-Senkrechten, also
   * waagerecht.
   *
   * Die Pfanne selbst lehnt sich dabei um die 8,1° des Stiels **nach hinten**,
   * mit der Mulde zum Träger — die Richtung, in der nichts herausrutscht.
   */
  it('legt den Stiel in der Faust waagerecht und die Mulde zum Träger', () => {
    const [stalk] = kitchenHandles('pan', PAN_SIZE);
    const hold = holdFor(stalk!);
    const zero = { x: 0, y: 0, z: 0 };
    // Welt-Senkrechte und Zielrichtung im Griffraum (`gripFit.GRIP_TO_RAY`).
    const up = rotateVec({ x: 0, y: 1, z: 0 }, GRIP_TO_RAY, { ...zero });
    const ray = rotateVec({ x: 0, y: 0, z: -1 }, GRIP_TO_RAY, { ...zero });
    const bar = rotateVec(stalk!.hold!.along, hold.rotation, { ...zero });
    const pan = rotateVec({ x: 0, y: 1, z: 0 }, hold.rotation, { ...zero });
    // Die Stange steht senkrecht auf der Welt-Senkrechten: waagerecht.
    expect(dot(bar, up)).toBeCloseTo(0, 10);
    // Und die Pfanne lehnt um die Steigung des Stiels zurück, nicht nach vorn.
    expect((Math.acos(dot(pan, up)) * 180) / Math.PI).toBeCloseTo(8.1, 1);
    expect(dot(pan, ray)).toBeLessThan(0);
  });

  /**
   * **Der Topf hat zwei Ohren und keinen Stiel** — er trug bis eben den Griff
   * der Pfanne, und der lag mitten in der Suppe.
   */
  it('gibt dem Topf beide Ohren, gegenüberliegend', () => {
    const handles = kitchenHandles('pot', POT_SIZE);
    expect(handles).toHaveLength(2);
    expect(handles.map((one) => one.id)).toEqual(['ohr+x', 'ohr-x']);
    const [right, left] = handles;
    // Außen an der Hülle, oben am Rand, und punktgespiegelt um die Mitte.
    expect(right!.pose.position.x).toBeGreaterThan(POT_SIZE.width * 0.4);
    expect(right!.pose.position.y).toBeGreaterThan(POT_SIZE.height * 0.7);
    expect(left!.pose.position.x).toBeCloseTo(-right!.pose.position.x, 10);
    expect(left!.pose.position.z).toBeCloseTo(-right!.pose.position.z, 10);
    // Jedes Ohr ist eine Stange quer zum Radius, also im Wesentlichen entlang z.
    for (const ear of handles) {
      expect(Math.abs(ear.hold!.along.z)).toBeGreaterThan(0.9);
      expect(ear.hold!.length).toBeGreaterThan(0.1);
    }
  });

  it('hält den Topf oben offen und seinen Bauch vorn', () => {
    const [right, left] = kitchenHandles('pot', POT_SIZE);
    for (const ear of [right!, left!]) {
      expect(axisOf(ear)).toEqual([0, 1, 0]);
      // Nach vorn liegt die Mitte des Topfes, also zum Ohr hin gespiegelt.
      expect(Math.sign(frontOf(ear)[0]!)).toBe(-Math.sign(ear.pose.position.x));
    }
  });

  /**
   * **Der Feuerlöscher hängt am Tragebügel und zielt nach vorn.**
   *
   * Die Vierteldrehung nach links aus dem Auftrag, als Zusicherung: Die Düse
   * zeigt am Modell nach +x, und genau dorthin zeigt jetzt das Vorne des
   * Griffs — vorher war es -z, also quer zur Hand.
   *
   * **Das +x hat den Modelltausch überlebt**, und diese Zeile ist die Probe
   * darauf: Der neue Löscher kommt spiegelverkehrt aus seinem Baukasten und
   * wird im Katalog um π gedreht (`core/kitchenFit.ts`, `extinguisher.over`).
   * Wer die Drehung dort herausnimmt, bekommt hier nichts Rotes — aber einen
   * Löscher, der im Regal falsch herum steht.
   */
  it('hängt den Feuerlöscher an den Bügel und lässt ihn nach vorn zielen', () => {
    const handles = kitchenHandles('extinguisher', TANK_SIZE);
    expect(handles).toHaveLength(1);
    const [grip] = handles;
    expect(grip!.id).toBe('buegel');
    // Oben am Ventil, wo Bügel und Hebel sitzen — nicht auf halber Höhe am
    // Bauch. Gemessen sind es 0,86 der Höhe (`kitchenGrab.NOZZLE_BAR`).
    expect(grip!.pose.position.y).toBeGreaterThan(TANK_SIZE.height * 0.8);
    // Die Stange liegt quer, entlang x.
    expect(Math.abs(grip!.hold!.along.x)).toBeGreaterThan(0.95);
    expect(axisOf(grip!)).toEqual([0, 1, 0]);
    expect(frontOf(grip!)).toEqual([1, 0, 0]);
  });

  /**
   * **Und vor dem Bauch zielt er ebenfalls nach vorn** — die zweite Hälfte
   * derselben Aussage.
   *
   * In der Brille dreht ihn sein Griff richtig herum; von oben und am Schirm
   * gibt es keinen Griff, und dort hing er ungedreht am Gestell. Die Düse zeigt
   * im Netz nach +x, also zeigte sie quer zur Figur, während der Strahl
   * geradeaus ging — ein Löscher, den man seitlich hält und mit dem man nach
   * vorn löscht. Eine Vierteldrehung stellt das gerade, und sie gilt nur für
   * ihn: Ein Teller hat keine Vorderseite.
   */
  it('dreht den Feuerlöscher vor dem Bauch mit der Düse nach vorn', () => {
    const turn = kitchenCarryTurn('extinguisher');
    // Die Düse (+x im Netz) muss nach vorn zeigen, und vorn ist -z. Um die
    // Gierachse gedreht wird aus `(1, 0, 0)` das Paar `(cos, -sin)` — dieselbe
    // Rechnung, die `Object3D.rotation.y` im Spiel macht.
    expect(Math.cos(turn)).toBeCloseTo(0, 6);
    expect(-Math.sin(turn)).toBeCloseTo(-1, 6);
    // Eine Vierteldrehung und nicht irgendeine.
    expect(Math.abs(turn)).toBeCloseTo(Math.PI / 2, 6);
    for (const item of ['plate', 'bun', 'pan', 'pot', 'patty-cooked'] as const) {
      expect(kitchenCarryTurn(item)).toBe(0);
    }
  });

  /**
   * **Essen liegt in der Brille halb so groß in der Hand** — sonst versperrt
   * der Burger die Sicht. Geräte bleiben, wie sie sind.
   */
  it('verkleinert Essen und Geschirr in der Hand, aber kein Gerät', () => {
    expect(HAND_FOOD_SCALE).toBe(0.5);
    for (const item of [
      'bun',
      'patty',
      'patty-cooked',
      'lettuce',
      'lettuce-cut',
      'tomato',
      'tomato-cut',
      'plate',
      'plate-dirty',
    ] as const) {
      expect(kitchenHandScale(item)).toBe(HAND_FOOD_SCALE);
    }
    for (const item of ['pan', 'pot', 'extinguisher', 'pliers'] as const) {
      expect(kitchenHandScale(item)).toBe(1);
    }
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
   * die sechs gehören in der Brille der Greif-Taste **und dem Trigger**. Die
   * **Berührung** bleibt draußen — wer mit dem Topf an der Arbeitsplatte
   * vorbeikommt, stellt ihn nicht ab.
   */
  it('gibt jede Tat, die etwas aus der Hand gibt, Greif-Taste und Trigger', () => {
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
      expect(vrInputs(spec)).toEqual(['grip', 'aimTrigger']);
      expect(resolveInteraction(spec, 'vr').press).toBe('hold');
    }
  });

  it('lässt das Abdichten eine Berührung bleiben — es nimmt der Hand nichts weg', () => {
    // Hier stand bis September 2026 das **Löschen** mit demselben Satz. Die
    // Tat gibt es nicht mehr (`kitchenCarry.EXTINGUISHER_REST`); die Zange am
    // spritzenden Becken ist die andere, die nur eine Uhr anwirft und der Hand
    // nichts wegnimmt.
    const deed = kitchenDeed(dish('pliers'), { kind: 'sink', leaking: true });
    expect(deed.do).toBe('repair');
    expect(kitchenGivesUp(deed)).toBe(false);
    expect(vrInputs(kitchenInteractionSpec(deed))).toEqual(['handTouch', 'aimTrigger']);
  });

  /**
   * **Ein vergebener Trigger wird nicht zweimal vergeben.**
   *
   * Er spritzt den Feuerlöscher und wendet ein getragenes Möbel
   * (`kitchen.spray`, `kitchen.buildTurn`). Bekäme er daneben das Ablegen,
   * drückte man ihn zum Löschen und stellte den Löscher dabei auf die
   * Arbeitsplatte. Die Greif-Taste bleibt in beiden Fällen, und von oben
   * ändert sich wie immer nichts.
   */
  it('nimmt den Trigger zurück, solange die Hand ihn schon benutzt', () => {
    const place = kitchenDeed(dish('extinguisher'), { kind: 'top' });
    expect(place.do).toBe('place');
    expect(vrInputs(kitchenInteractionSpec(place, KITCHEN_STATION_GRAB, false))).toEqual(['grip']);
    expect(
      resolveInteraction(kitchenInteractionSpec(place, KITCHEN_STATION_GRAB, false), 'vr').press,
    ).toBe('hold');
    // Und ebenso, wo sonst der Trigger allein zuständig wäre: Berühren bleibt.
    // Der Fall dazu ist die **belegte** Arbeitsplatte — der Löscher legt sich
    // auf nichts drauf, die Station sagt es, und der Trigger ist dabei
    // weiterhin mit dem Löscher beschäftigt.
    const refused = kitchenDeed(dish('extinguisher'), { kind: 'top', on: dish('plate') });
    expect(refused.do).toBe('refuse');
    expect(vrInputs(kitchenInteractionSpec(refused, undefined, false))).toEqual(['handTouch']);
    // Von oben unverändert — dort gilt die Ableitung der Tabelle.
    expect(
      resolveInteraction(kitchenInteractionSpec(place, KITCHEN_STATION_GRAB, false), 'topDown')
        .inputs,
    ).toEqual(['useButton', 'useKey', 'pointer']);
  });

  /**
   * **Von oben ändert die Ausnahme nichts.** `A`, `E` und die linke Maustaste
   * tun, was die Tabelle sagt — die Ausnahme gilt nur für die Ansicht `vr`.
   */
  it('lässt `A` von oben und am Schreibtisch unberührt', () => {
    const deed = kitchenDeed(dish('plate'), { kind: 'top' });
    const spec = kitchenInteractionSpec(deed, KITCHEN_STATION_GRAB);
    expect(resolveInteraction(spec, 'topDown').inputs).toEqual(['useButton', 'useKey', 'pointer']);
    expect(resolveInteraction(spec, 'topDown').press).toBe('tap');
    expect(resolveInteraction(spec, 'firstPerson').inputs).toEqual(['pointer', 'useKey']);
  });

  it('gibt einer Station ohne Angebot weiter gar nichts', () => {
    const spec = kitchenInteractionSpec(kitchenDeed(null, { kind: 'top' }));
    expect(spec.kind).toBe('none');
    expect(resolveInteraction(spec, 'vr').interactive).toBe(false);
  });
});

/**
 * **Die vier Rand-Griffe der Möbel** — und vor allem: dass es sie **ohne
 * Tabelle** gibt.
 *
 * Das ist die Zusicherung, um die der Auftrag ausdrücklich gebeten hat: „diese
 * können allgemein platziert sein, sodass es nicht für Mülleimer,
 * Arbeitsplatte individuell gesetzt werden müssten." Ein Test, der jedes Möbel
 * einzeln nachschlüge, prüfte das Gegenteil — also läuft er über den **ganzen
 * Katalog** und verlangt von jedem Stück dasselbe. Wer morgen ein sechzehntes
 * Möbel einträgt, bekommt seine vier Griffe geschenkt oder diesen Test rot.
 */
describe('Wie ein Küchenmöbel gegriffen werden will', () => {
  it('gibt jedem Möbel des Katalogs vier Griffe — aus einer Regel', () => {
    for (const piece of KITCHEN_PIECES) {
      const handles = pieceHandles(piece);
      expect(handles.map((one) => one.id)).toEqual(['+x', '-x', '+z', '-z']);
    }
  });

  /**
   * **Mülleimer und Arbeitsplatte sind die beiden, die der Auftrag beim Namen
   * nennt.** Sie stehen hier nicht, weil sie etwas Besonderes wären, sondern
   * weil sie es ausdrücklich **nicht** sein dürfen: Sie bekommen Zeile für
   * Zeile dieselben Griffe wie jedes andere Möbel derselben Grundfläche, und
   * der einzige Unterschied ist die Höhe, die im Katalog steht.
   */
  it('braucht für Mülleimer und Arbeitsplatte keinen eigenen Eintrag', () => {
    const bin = kitchenPiece('bin');
    const table = kitchenPiece('table');
    expect(bin && table).toBeTruthy();
    if (!bin || !table) return;
    // Dieselbe Grundfläche, also dieselben vier Stellen in x und z …
    const rim = (piece: KitchenPiece) =>
      pieceHandles(piece).map((one) => [one.pose.position.x, one.pose.position.z]);
    expect(rim(bin)).toEqual(rim(table));
    // … und dieselben vier Achsen.
    expect(pieceHandles(bin).map((one) => one.pose.rotation)).toEqual(
      pieceHandles(table).map((one) => one.pose.rotation),
    );
    // Nur die Höhe unterscheidet sie, und die steht im Katalog und nicht hier.
    expect(pieceHandles(bin)[0].pose.position.y).toBeCloseTo(kitchenDeck(bin), 6);
    expect(pieceHandles(table)[0].pose.position.y).toBeCloseTo(kitchenDeck(table), 6);
    expect(pieceHandles(bin)[0].pose.position.y).not.toBeCloseTo(
      pieceHandles(table)[0].pose.position.y,
      3,
    );
  });

  /**
   * **Die Höhe ist die Arbeitsfläche und nicht die Oberkante.** Die drei
   * Möbel, an denen das auseinanderfällt, sind zugleich die drei, an denen
   * eine Griffhöhe aus `height` sichtbar falsch wäre: am Wasserhahn, an der
   * Kappe des Feuerlöschers und auf dem Topfdeckel.
   */
  it('setzt die Griffe auf die Arbeitsfläche und nicht auf den Wasserhahn', () => {
    for (const name of ['sink-basin', 'extinguisher', 'stove-pot']) {
      const piece = kitchenPiece(name);
      expect(piece).toBeTruthy();
      if (!piece) continue;
      const y = pieceHandles(piece)[0].pose.position.y;
      expect(y).toBeCloseTo(kitchenDeck(piece), 6);
      expect(y).toBeLessThan(piece.height);
    }
  });

  /**
   * **Hüft- bis Brusthöhe, über den ganzen Katalog** — die Begründung der
   * Entscheidung, als Zahl. Ein Koch ist 1,60 m groß (`core/chefFit.ts`);
   * alles zwischen einem knappen halben Meter und drei Vierteln ist die Höhe,
   * auf der ein Mensch ein Möbel anfasst, um es zu schieben.
   *
   * **Die obere Grenze war 0,60 m**, und sie ist nicht gestiegen, weil die
   * Regel nachgegeben hätte: Der Computer-Tisch hat seine Platte auf 0,75 m,
   * weil man daran steht und nicht darauf schneidet. Sein Griff ist
   * mitgewandert, ohne dass jemand eine Zeile dafür geschrieben hätte — genau
   * dafür wird die Höhe abgeleitet und nicht eingetragen.
   *
   * **Die untere Grenze ist einschließend**, und das ist keine Aufweichung,
   * sondern die Bauart der Kisten: Eine Kiste ist genau 0,40 m hoch
   * (`dinerPiece('crate')`), und ihre Oberkante **ist** ihre Ablage. Die vier
   * Vorratskisten liegen mit ihrem Inhalt ein paar Millimeter darüber
   * (0,4012 bis 0,499) und kamen deshalb durch; die Tellerkiste, deren Teller
   * unter dem Rand bleiben, landet auf dem Rand selbst. Ein Möbel an der
   * Grenze abzulehnen, während sein Nachbar 1,2 mm höher durchgeht, prüfte
   * eine Rundung und keine Regel.
   */
  it('landet damit bei jedem Möbel zwischen 0,40 m und 0,80 m', () => {
    for (const piece of KITCHEN_PIECES) {
      const y = pieceHandles(piece)[0].pose.position.y;
      expect([piece.name, y >= 0.4 && y < 0.8]).toEqual([piece.name, true]);
    }
  });

  /**
   * **Die Griffe liegen auf der Grundfläche, ein halbe Faust nach innen** —
   * und beim breiten Möbel entsprechend weiter außen, ohne dass jemand es
   * einträgt. Die Ausgabetheke belegt zwei Kacheln, der Arbeitstisch eine.
   */
  it('nimmt die Kachelzahl als Grundfläche und rückt eine halbe Faust hinein', () => {
    const pass = kitchenPiece('pass');
    const table = kitchenPiece('table');
    expect(pass && table).toBeTruthy();
    if (!pass || !table) return;
    expect(pass.tiles).toEqual([2, 1]);
    const wide = pieceHandles(pass);
    expect(wide[0].pose.position.x).toBeCloseTo(1 - RIM_GRIP_IN, 6);
    expect(wide[1].pose.position.x).toBeCloseTo(-(1 - RIM_GRIP_IN), 6);
    expect(wide[2].pose.position.z).toBeCloseTo(0.5 - RIM_GRIP_IN, 6);
    const square = pieceHandles(table);
    expect(square[0].pose.position.x).toBeCloseTo(0.5 - RIM_GRIP_IN, 6);
    expect(square[2].pose.position.z).toBeCloseTo(0.5 - RIM_GRIP_IN, 6);
  });

  /**
   * **Und ein Möbel greift nur im Meter**, wie alles in dieser Küche: Eine
   * Küchenzeile, die aus drei Metern in die Hände flöge, wäre der sichtbarste
   * Fall von Ferngreifen, den dieser Grundriss hergibt.
   */
  it('greift ein Möbel nur in der Moore-Nachbarschaft', () => {
    const stove = kitchenPiece('stove');
    expect(stove).toBeTruthy();
    if (!stove) return;
    expect(kitchenPieceGrab(stove).reach).toBe(KITCHEN_REACH);
    expect(kitchenPieceGrab(stove).reach).toBe('moore');
    expect(grabsByHitbox(kitchenPieceGrab(stove))).toBe(false);
  });

  /**
   * **Welche Kante die Hand meint, entscheidet der Abstand** — dieselbe
   * Rechnung wie beim Teller (`grabHandles.nearestHandle`). Der Test steht
   * hier und nicht bei den Möbeln, weil erst die beiden zusammen die Frage
   * beantworten: Wer östlich vor dem Herd steht, packt seine Ostkante.
   */
  it('wählt die Kante, die der Hand am nächsten liegt', () => {
    const stove = kitchenPiece('stove');
    expect(stove).toBeTruthy();
    if (!stove) return;
    const handles = pieceHandles(stove);
    const spot = at(10, 0, 4);
    expect(nearestHandle(handles, spot, { x: 10.6, y: 0.5, z: 4 })?.handle.id).toBe('+x');
    expect(nearestHandle(handles, spot, { x: 9.4, y: 0.5, z: 4 })?.handle.id).toBe('-x');
    expect(nearestHandle(handles, spot, { x: 10, y: 0.5, z: 4.6 })?.handle.id).toBe('+z');
    expect(nearestHandle(handles, spot, { x: 10, y: 0.5, z: 3.4 })?.handle.id).toBe('-z');
  });
});
