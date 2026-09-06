import {
  HOVER_MAX,
  HOVER_MIN,
  NEAR_GAP,
  SCALE_MAX,
  SCALE_MIN,
  bringNear,
  clampModel,
  grabOne,
  grabTwo,
  midpoint,
  newModel,
  planToWorld,
  recentre,
  worldToPlan,
  type Model,
  type Spot,
} from './miniature';

const CENTRE = { x: 10, z: -4 };

function at(x: number, y: number, z: number): Spot {
  return { x, y, z };
}

function close(a: Spot, b: Spot, digits = 6): void {
  expect(a.x).toBeCloseTo(b.x, digits);
  expect(a.y).toBeCloseTo(b.y, digits);
  expect(a.z).toBeCloseTo(b.z, digits);
}

describe('Plan und Welt', () => {
  it('legt die Mitte des Plans auf den Standort des Modells', () => {
    const model: Model = { at: at(1, 1.4, -2), yaw: 0.7, scale: 1 / 20 };
    close(planToWorld(model, CENTRE, at(CENTRE.x, 0, CENTRE.z)), model.at);
  });

  it('ist in beide Richtungen dieselbe Rechnung', () => {
    // Der Prüfstein: Wer hin und zurück rechnet, muss dort landen, wo er
    // losgegangen ist. Sonst wandert das, worauf man zeigt, mit jedem Bild ein
    // Stück — und man sucht den Fehler beim Zeiger.
    const model: Model = { at: at(-3, 1.1, 2), yaw: -1.9, scale: 1 / 33 };
    for (const point of [at(0, 0, 0), at(25, 2.8, -12), at(-40, -1, 7)]) {
      close(worldToPlan(model, CENTRE, planToWorld(model, CENTRE, point)), point, 4);
    }
  });

  it('macht aus einer Kachel im Plan eine Handbreit im Raum', () => {
    const model: Model = { at: at(0, 1, 0), yaw: 0, scale: 1 / 25 };
    const a = planToWorld(model, CENTRE, at(CENTRE.x, 0, CENTRE.z));
    const b = planToWorld(model, CENTRE, at(CENTRE.x + 2.5, 0, CENTRE.z));
    expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeCloseTo(0.1);
  });

  it('dreht den Norden des Plans nach vorn, wenn das Modell wie der Kopf schaut', () => {
    // Blick nach −Z (yaw 0): Der Norden des Plans (kleineres z) muss dann
    // **weiter weg** liegen, also auch nach −Z. Das ist das Vorzeichen, das man
    // in der Brille nur bemerkt und nie nachvollzieht.
    const model: Model = { at: at(0, 1, 0), yaw: 0, scale: 1 / 20 };
    const north = planToWorld(model, CENTRE, at(CENTRE.x, 0, CENTRE.z - 10));
    expect(north.z).toBeLessThan(0);
  });
});

describe('Mit einer Hand', () => {
  it('schiebt das Modell um genau das, was die Hand gewandert ist', () => {
    const start: Model = { at: at(0, 1.2, -1), yaw: 0.4, scale: 1 / 20 };
    const next = grabOne(start, at(0, 1.2, -1), at(0.3, 1.35, -0.8));
    close(next.at, at(0.3, 1.35, -0.8));
    // Und dreht dabei nichts: Ein Grundriss, der sich beim Hinschieben
    // mitdreht, ist einer, den man danach wieder geradeziehen muss.
    expect(next.yaw).toBeCloseTo(start.yaw);
    expect(next.scale).toBeCloseTo(start.scale);
  });

  it('lässt es nicht in den Boden und nicht an die Decke', () => {
    const start: Model = { at: at(0, 1, 0), yaw: 0, scale: 1 / 20 };
    expect(grabOne(start, at(0, 1, 0), at(0, -5, 0)).at.y).toBeCloseTo(HOVER_MIN);
    expect(grabOne(start, at(0, 1, 0), at(0, 9, 0)).at.y).toBeCloseTo(HOVER_MAX);
  });
});

describe('Mit zwei Händen', () => {
  const start: Model = { at: at(0, 1.2, -1), yaw: 0, scale: 1 / 20 };
  const left = at(-0.2, 1.2, -1);
  const right = at(0.2, 1.2, -1);

  it('zieht am Handabstand den Maßstab', () => {
    // Hände doppelt so weit auseinander: Modell doppelt so groß.
    const next = grabTwo(start, CENTRE, left, right, at(-0.4, 1.2, -1), at(0.4, 1.2, -1));
    expect(next.scale).toBeCloseTo(start.scale * 2);
  });

  it('dreht das Modell mit den Händen mit', () => {
    // Eine Vierteldrehung der Handverbindung ist eine Vierteldrehung des
    // Modells — und der Maßstab bleibt, denn der Abstand blieb.
    const next = grabTwo(start, CENTRE, left, right, at(0, 1.2, -1.2), at(0, 1.2, -0.8));
    expect(Math.abs(next.yaw)).toBeCloseTo(Math.PI / 2);
    expect(next.scale).toBeCloseTo(start.scale);
  });

  it('lässt den Punkt zwischen den Fingern liegen', () => {
    // **Die Regel, ohne die sich jede Karte falsch anfühlt.** Was man angefasst
    // hat, bleibt unter der Hand, während sich alles andere darum herum ändert.
    const held = midpoint(left, right);
    const anchor = worldToPlan(start, CENTRE, held);
    const toA = at(-0.1, 1.4, -0.6);
    const toB = at(0.5, 1.4, -0.9);
    const next = grabTwo(start, CENTRE, left, right, toA, toB);
    close(planToWorld(next, CENTRE, anchor), midpoint(toA, toB), 4);
  });

  it('bleibt in den Grenzen des Maßstabs', () => {
    const tiny = grabTwo(start, CENTRE, left, right, at(-0.001, 1.2, -1), at(0.001, 1.2, -1));
    expect(tiny.scale).toBeGreaterThanOrEqual(SCALE_MIN);
    const huge = grabTwo(start, CENTRE, left, right, at(-9, 1.2, -1), at(9, 1.2, -1));
    expect(huge.scale).toBeCloseTo(SCALE_MAX);
  });

  it('macht aus einer verschluckten Handspanne keinen Sprung', () => {
    // Zwei Hände, die aufeinanderliegen, sind kein Maßstab von null, sondern
    // ein Tracking-Aussetzer — und der darf das Modell nicht verschlucken.
    const next = grabTwo(start, CENTRE, left, right, at(0, 1.2, -1), at(0, 1.2, -1));
    expect(next.scale).toBeCloseTo(start.scale);
  });
});

describe('Zu mir holen', () => {
  it('stellt es vor den Kopf, auf Brusthöhe', () => {
    const head = at(2, 1.6, 3);
    const model = bringNear(head, 0, 15);
    // Vor dem Kopf heißt bei Blick nach −Z: kleineres z.
    expect(model.at.z).toBeCloseTo(head.z - NEAR_GAP);
    expect(model.at.x).toBeCloseTo(head.x);
    expect(model.at.y).toBeLessThan(head.y);
    expect(model.at.y).toBeGreaterThanOrEqual(HOVER_MIN);
  });

  it('passt den Maßstab an, damit ein großer Grundriss in die Arme passt', () => {
    // Ein Zimmer von zehn Metern darf groß kommen, ein Feld von zweihundert
    // nicht — sonst steht man beim Heranholen mittendrin.
    const head = at(0, 1.6, 0);
    const small = bringNear(head, 0, 4);
    const big = bringNear(head, 0, 200);
    expect(small.scale).toBeCloseTo(SCALE_MAX);
    expect(big.scale).toBeLessThan(small.scale);
    expect(big.scale).toBeGreaterThanOrEqual(SCALE_MIN);
  });

  it('legt den Norden des Plans auf die Blickrichtung', () => {
    // Ein Kopf mit yaw = 90° schaut nach −X. Dann muss der **Norden** des
    // Plans (kleineres z) von ihm weg liegen, also ebenfalls nach −X, und der
    // Osten nach rechts. Genau das heißt „links im Modell ist links im
    // Zimmer": Wer im Modell nach links zeigt, zeigt im Raum nach links.
    const head = at(0, 1.6, 0);
    const model = bringNear(head, Math.PI / 2, 10);
    const north = planToWorld(model, CENTRE, at(CENTRE.x, 0, CENTRE.z - 10));
    expect(north.x).toBeLessThan(model.at.x);
    const east = planToWorld(model, CENTRE, at(CENTRE.x + 10, 0, CENTRE.z));
    expect(east.z).toBeLessThan(model.at.z);
  });
});

describe('Wenn der Plan wächst', () => {
  it('lässt das Gebaute stehen, wo es stand', () => {
    // Wer eine Kachel an den Rand baut, verschiebt die Mitte seines
    // Grundrisses. Ohne diese Rechnung spränge das ganze Modell bei jedem
    // Druck ein Stück zur Seite — und man baute ihm hinterher.
    const model: Model = { at: at(0.4, 1.3, -0.9), yaw: 0.8, scale: 1 / 18 };
    const from = { x: 0, z: 0 };
    const to = { x: 1.25, z: -1.25 };
    const corner = at(-5, 0, 5);
    const before = planToWorld(model, from, corner);
    const after = planToWorld(recentre(model, from, to), to, corner);
    close(before, after, 6);
  });
});

describe('Die Grenzen', () => {
  it('holt ein frisches Modell in jeden erlaubten Bereich', () => {
    const model = clampModel(newModel());
    expect(model.scale).toBeGreaterThanOrEqual(SCALE_MIN);
    expect(model.scale).toBeLessThanOrEqual(SCALE_MAX);
    expect(model.at.y).toBeGreaterThanOrEqual(HOVER_MIN);
  });
});
