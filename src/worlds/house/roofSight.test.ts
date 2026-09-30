/**
 * **Draußen hinter dem Haus wird aufgeschnitten** (`roofSight.ts`): Die Decke
 * liegt auf Etage 1 (2,8 m) über den Kacheln x 4…13, z 3…8.
 */
import { roofOverSight } from './roofSight';

const LEVELS = [0, 2.8];
const house = (x: number, z: number, level: number): boolean =>
  level === 1 && x >= 4 && x <= 13 && z >= 3 && z <= 8;
/** Die Kamera von oben: schräg im Süden, gut 30 m hoch. */
const eyeFor = (x: number, z: number) => ({ x, y: 33, z: z + 23 });

describe('Verdeckt eine Decke die Figur?', () => {
  it('ja, direkt hinter dem Haus', () => {
    const feet = { x: 9, y: 0, z: 2.4 };
    expect(roofOverSight(feet, eyeFor(9, 2.4), 0, LEVELS, house)).toBe(true);
  });

  it('nein, vor dem Haus oder weit daneben', () => {
    const front = { x: 9, y: 0, z: 10.6 };
    expect(roofOverSight(front, eyeFor(9, 10.6), 0, LEVELS, house)).toBe(false);
    const aside = { x: 20, y: 0, z: 2.4 };
    expect(roofOverSight(aside, eyeFor(20, 2.4), 0, LEVELS, house)).toBe(false);
  });

  it('nein, weit hinter dem Haus — der Blick geht über die Decke hinweg', () => {
    const far = { x: 9, y: 0, z: -4 };
    expect(roofOverSight(far, eyeFor(9, -4), 0, LEVELS, house)).toBe(false);
  });

  it('nein, wenn es keine Etage darüber gibt', () => {
    const feet = { x: 9, y: 0, z: 2.4 };
    expect(roofOverSight(feet, eyeFor(9, 2.4), 0, [0], house)).toBe(false);
  });
});
