import { LANE, PARTITION, POSE_ROOM, POSE_ROOM_WIDTH, TARGET, swapTargets } from './lane';

describe('lane', () => {
  it('hält die Scheiben im Gang', () => {
    expect(TARGET.z).toBeLessThan(LANE.length);
    // Die Scheiben hängen in der Mitte, also zählt die schmalere Seite.
    expect(TARGET.radius).toBeLessThan(Math.min(LANE.left, LANE.right));
    expect(TARGET.y).toBeLessThan(LANE.height);
  });

  it('ist rechts breiter als links — dort liegt der Poseraum', () => {
    expect(LANE.right).toBeGreaterThan(LANE.left);
  });
});

describe('die Trennwand', () => {
  it('lässt die Knöpfe stehen, wo die alte Wand stand', () => {
    // Ihre Gangseite liegt exakt auf −LANE.left: die Knöpfe hängen ein paar
    // Zentimeter davor und wandern damit keinen Millimeter.
    expect(PARTITION.x + PARTITION.thickness / 2).toBeCloseTo(-LANE.left, 6);
  });

  it('hat eine Tür, die in den Gang passt und breit genug ist', () => {
    expect(PARTITION.doorFrom).toBeGreaterThan(0);
    expect(PARTITION.doorTo).toBeLessThan(LANE.length);
    // Schulterbreit plus Luft — eine Tür, durch die man nicht zielen muss.
    expect(PARTITION.doorTo - PARTITION.doorFrom).toBeGreaterThan(1);
    expect(PARTITION.doorHeight).toBeLessThan(LANE.height);
  });
});

describe('der Poseraum', () => {
  it('liegt zwischen Trennwand und rechter Wand', () => {
    expect(POSE_ROOM.far).toBeLessThan(POSE_ROOM.near);
    expect(POSE_ROOM.x).toBeLessThan(POSE_ROOM.near);
    expect(POSE_ROOM.x).toBeGreaterThan(POSE_ROOM.far);
  });

  it('ist breit genug für den Kasten und für den, der davorsteht', () => {
    expect(POSE_ROOM_WIDTH).toBeGreaterThan(POSE_ROOM.box + 0.8);
  });

  it('hängt den Kasten auf Arbeitshöhe unter die Decke', () => {
    expect(POSE_ROOM.height - POSE_ROOM.box / 2).toBeGreaterThan(0.6);
    expect(POSE_ROOM.height + POSE_ROOM.box / 2).toBeLessThan(LANE.height);
  });

  it('stellt ihn auf Höhe der Tür in der Trennwand', () => {
    // Man geht hindurch und steht davor — nicht daneben.
    expect(POSE_ROOM.z).toBeGreaterThan(PARTITION.doorFrom);
    expect(POSE_ROOM.z).toBeLessThan(PARTITION.doorTo);
  });
});

describe('swapTargets', () => {
  it('lässt jeden Stand auf seiner eigenen Scheibe, wenn beide passen', () => {
    expect(swapTargets(-0.65, 0.85, -0.65, 0.85)).toBe(false);
  });

  it('tauscht, wenn die Stände die Seiten gewechselt haben', () => {
    expect(swapTargets(0.85, -0.65, -0.65, 0.85)).toBe(true);
  });

  it('bleibt bei kleinen Verschiebungen ruhig', () => {
    // Beide ein Stück zur Mitte gezogen: die Reihenfolge stimmt noch.
    expect(swapTargets(-0.2, 0.3, -0.65, 0.85)).toBe(false);
  });

  it('entscheidet auch, wenn beide Stände auf derselben Seite stehen', () => {
    // Beide links von beiden Scheiben: der Gesamtweg wäre für beide
    // Zuordnungen gleich lang, die Reihenfolge ist trotzdem eindeutig.
    expect(swapTargets(-1.2, -0.9, -0.65, 0.85)).toBe(false);
    expect(swapTargets(-0.9, -1.2, -0.65, 0.85)).toBe(true);
  });

  it('lässt zwei Stände an derselben Stelle in Ruhe', () => {
    expect(swapTargets(0.4, 0.4, -0.65, 0.85)).toBe(false);
  });

  it('ist symmetrisch: einmal tauschen genügt', () => {
    const a = 0.85;
    const b = -0.65;
    expect(swapTargets(a, b, -0.65, 0.85)).toBe(true);
    // Nach dem Tausch stimmt die Zuordnung, also kein zweiter.
    expect(swapTargets(a, b, 0.85, -0.65)).toBe(false);
  });

  it('bleibt bei gleichem Abstand beim Geradeaus', () => {
    expect(swapTargets(0, 0, -0.65, 0.85)).toBe(false);
  });
});
