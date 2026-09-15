import { wantsEdge } from '../../editor/planPaint';
import { DIR_E, DIR_N, TILE, type Dir } from '../../nav/navTile';
import { fixtureTool } from '../gridTool';
import { solidBounds } from '../solids';
import { knownKind, paletteKinds } from './kinds';
import type { FixtureInput, FixturePlacement, Props } from './index';
import {
  WARDROBE,
  WARDROBE_DEPTH,
  WARDROBE_HEIGHT,
  wardrobeSolids,
  type WardrobeState,
} from './wardrobe';

/**
 * **Der Kleiderschrank** ohne three.js: was er meldet, wann er es meldet, und
 * wie weit sein Korpus in die Kachel hineinragt.
 *
 * Das Bild dazu (Türen, Griffe, Spiegel) prüft hier nichts — das ist Grafik.
 * Geprüft wird das, was daran schiefgehen kann, ohne dass es jemand sieht: ein
 * Schrank, der auf einen Hebel am anderen Ende des Raums die Umkleide
 * aufmacht, und einer, der an einer Ostkante quer statt längs steht.
 */
function at(dir: Dir = DIR_N, props: Props = {}): FixturePlacement {
  return { id: 'schrank-1', kind: 'wardrobe', x: 0, z: 0, dir, level: 0, props };
}

const NOTHING: FixtureInput = {
  used: false,
  hit: false,
  weightOn: 0,
  playerOn: false,
  triggered: false,
};

describe('Der Kleiderschrank', () => {
  it('meldet die Umkleide, wenn jemand ihn benutzt', () => {
    const place = at();
    const state: WardrobeState = WARDROBE.init(place);
    expect(state.opened).toBe(0);

    expect(WARDROBE.step(state, place, { ...NOTHING, used: true }, 0.016)).toEqual([
      { type: 'sound', name: 'pick' },
      { type: 'wardrobe' },
    ]);
    expect(state.opened).toBe(1);

    // Und in ruhigen Bildern passiert nichts.
    for (let i = 0; i < 10; i++) expect(WARDROBE.step(state, place, NOTHING, 0.016)).toEqual([]);
    expect(state.opened).toBe(1);
  });

  /**
   * Ein Hebel darf ein Schild vorlesen, aber niemandem die Umkleide
   * aufklappen: Wer gerade läuft, hätte plötzlich eine Seite vor dem Bild.
   */
  it('lässt sich nicht aus der Ferne auslösen', () => {
    const place = at();
    const state = WARDROBE.init(place);
    expect(WARDROBE.step(state, place, { ...NOTHING, triggered: true }, 0.016)).toEqual([]);
    expect(state.opened).toBe(0);
  });

  it('steht an einer Kante, hält auf und kostet so viel wie ein Regal', () => {
    expect(WARDROBE.edge).toBe(true);
    expect(WARDROBE.solid(WARDROBE.init(at()))).toBe(true);
    expect(WARDROBE.cost).toBe(1.3);
  });

  /** Der Hinweis über der Figur wird daraus: `A · Kleiderschrank`. */
  it('heißt Kleiderschrank', () => {
    expect(WARDROBE.label).toBe('Kleiderschrank');
  });

  /**
   * Er steht **an** der Nordkante und ragt nach Süden in die Kachel: einen
   * halben Meter tief, 2,1 m hoch, eine Kachel breit. Die Rückwand sitzt eine
   * halbe Wandstärke von der Kante weg — sonst steckte sie in der Wand.
   */
  it('füllt an der Nordkante einen halben Meter der Kachel', () => {
    const box = solidBounds(wardrobeSolids(0, 0, 0, at(DIR_N)))!;
    expect(box.maxX - box.minX).toBeCloseTo(TILE, 6);
    expect(box.maxZ - box.minZ).toBeCloseTo(WARDROBE_DEPTH, 6);
    expect(box.minY).toBeCloseTo(0, 6);
    expect(box.maxY).toBeCloseTo(WARDROBE_HEIGHT, 6);
    // Die Rückwand an der Kante, die Front einen halben Meter weiter innen.
    expect(box.minZ).toBeCloseTo(-TILE / 2 + 0.1, 6);
  });

  /** An der Ostkante tauschen Breite und Tiefe — die Zeile, die man vergisst. */
  it('dreht sich mit seiner Kante', () => {
    const box = solidBounds(wardrobeSolids(0, 0, 0, at(DIR_E)))!;
    expect(box.maxX - box.minX).toBeCloseTo(WARDROBE_DEPTH, 6);
    expect(box.maxZ - box.minZ).toBeCloseTo(TILE, 6);
  });

  /** Und er steht dort, wo seine Kachel steht. */
  it('rückt mit seiner Kachel mit', () => {
    const box = solidBounds(wardrobeSolids(7, 2.8, -3, at(DIR_N)))!;
    expect(box.minY).toBeCloseTo(2.8, 6);
    expect((box.minX + box.maxX) / 2).toBeCloseTo(7, 6);
  });
});

/**
 * **In der Palette steht er von selbst.** Der Bauplatz liest die Registry
 * (`WorldEditor`, `paletteKinds`), und dass die Kante an eine Wand gehört,
 * entscheidet dieselbe Marke wie beim Schild und beim Regal — hier steht der
 * Beleg, damit eine neue Art nicht heimlich mitten auf der Kachel landet.
 */
describe('Der Kleiderschrank im Bauplatz', () => {
  it('steht in der Palette', () => {
    expect(knownKind('wardrobe')).toBe(WARDROBE);
    expect(paletteKinds()).toContain(WARDROBE);
  });

  it('will beim Setzen eine Kante', () => {
    expect(wantsEdge(fixtureTool('wardrobe'))).toBe(true);
  });
});
