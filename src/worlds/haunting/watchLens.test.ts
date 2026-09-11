import {
  defaultLens,
  homedLens,
  pannedLens,
  PAN_LIMIT,
  throughEyes,
  ZOOM_MAX,
  ZOOM_MIN,
  zoomedLens,
} from './watchLens';

/**
 * **Fliegen und Zoomen des Zuschauers** — reine Rechnung ohne DOM
 * (`watchLens.ts`): Zwei Finger und das Rad zoomen begrenzt, der Stock
 * verschiebt herangezoomt langsamer, und „Zurück über das Deck" vergisst
 * beides.
 */
describe('Die Linse des Zuschauers', () => {
  it('fängt ungezoomt über dem Deck an, ohne Flug und nicht durch fremde Augen', () => {
    expect(defaultLens()).toEqual({
      seat: 'deck',
      follow: 'free',
      insight: false,
      eyes: false,
      zoom: 1,
      pan: { x: 0, z: 0 },
    });
  });

  it('zoomt um einen Faktor und bleibt zwischen Deck und Zimmer', () => {
    const lens = defaultLens();
    expect(zoomedLens(lens, 2).zoom).toBe(2);
    expect(zoomedLens(zoomedLens(lens, 2), 1.5).zoom).toBe(3);
    expect(zoomedLens(lens, 100).zoom).toBe(ZOOM_MAX);
    expect(zoomedLens(lens, 0.1).zoom).toBe(ZOOM_MIN);
    // Ein Faktor, der nichts ändert, gibt dieselbe Linse zurück — nichts wird neu gezeichnet.
    expect(zoomedLens(lens, 1)).toBe(lens);
    expect(zoomedLens(lens, 0)).toBe(lens);
    expect(zoomedLens(lens, Number.NaN)).toBe(lens);
  });

  it('fliegt in Metern, herangezoomt langsamer, und endet am Rand', () => {
    const lens = defaultLens();
    expect(pannedLens(lens, 3, -2).pan).toEqual({ x: 3, z: -2 });
    expect(pannedLens(zoomedLens(lens, 4), 4, 8).pan).toEqual({ x: 1, z: 2 });
    expect(pannedLens(lens, 1000, -1000).pan).toEqual({ x: PAN_LIMIT, z: -PAN_LIMIT });
    expect(pannedLens(lens, 0, 0)).toBe(lens);
  });

  it('findet nach Hause und vergisst Zoom und Flug, sonst nichts', () => {
    const flown = pannedLens(
      zoomedLens({ ...defaultLens(), follow: 'monster', insight: true }, 3),
      5,
      5,
    );
    expect(homedLens(flown)).toEqual({ ...defaultLens(), follow: 'monster', insight: true });
  });

  it('sieht nur durch die Augen des Technikers, dem es folgt', () => {
    expect(throughEyes({ seat: 'deck', follow: 'technician', eyes: true })).toBe(true);
    expect(throughEyes({ seat: 'deck', follow: 'technician', eyes: false })).toBe(false);
    expect(throughEyes({ seat: 'deck', follow: 'free', eyes: true })).toBe(false);
    expect(throughEyes({ seat: 'archive', follow: 'technician', eyes: true })).toBe(false);
  });
});
