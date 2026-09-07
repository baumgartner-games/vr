import {
  HOVER_MAX,
  HOVER_MIN,
  NEAR_GAP,
  SCALE_MAX,
  SCALE_MIN,
  averageTurn,
  bringNear,
  clampModel,
  grabOne,
  grabTwo,
  midpoint,
  newModel,
  planToWorld,
  recentre,
  turnBetween,
  twistAbout,
  worldToPlan,
  yawTurn,
  type Hold,
  type Model,
  type Spot,
} from './miniature';
import { rotateVec, type Quat, type Vec3 } from '../portal/tools/aim';

const CENTRE = { x: 10, z: -4 };

function at(x: number, y: number, z: number): Spot {
  return { x, y, z };
}

/** Eine Hand, die gerade steht — für alles, wo die Lage nicht die Frage ist. */
function hand(x: number, y: number, z: number, turn: Quat = yawTurn(0)): Hold {
  return { at: at(x, y, z), turn };
}

/** Eine Drehung um eine beliebige Achse, als Quaternion. */
function turnAround(axis: Vec3, angle: number): Quat {
  const length = Math.hypot(axis.x, axis.y, axis.z);
  const s = Math.sin(angle / 2) / length;
  return { x: axis.x * s, y: axis.y * s, z: axis.z * s, w: Math.cos(angle / 2) };
}

function close(a: Spot, b: Spot, digits = 6): void {
  expect(a.x).toBeCloseTo(b.x, digits);
  expect(a.y).toBeCloseTo(b.y, digits);
  expect(a.z).toBeCloseTo(b.z, digits);
}

/** Wohin ein Modell seine drei Achsen legt — die Drehung, ohne Winkel zu lesen. */
function axis(model: Model, v: Vec3): Vec3 {
  return rotateVec(v, model.turn, { x: 0, y: 0, z: 0 });
}

describe('Plan und Welt', () => {
  it('legt die Mitte des Plans auf den Standort des Modells', () => {
    const model: Model = { at: at(1, 1.4, -2), turn: yawTurn(0.7), scale: 1 / 20 };
    close(planToWorld(model, CENTRE, at(CENTRE.x, 0, CENTRE.z)), model.at);
  });

  it('ist in beide Richtungen dieselbe Rechnung', () => {
    // Der Prüfstein: Wer hin und zurück rechnet, muss dort landen, wo er
    // losgegangen ist. Sonst wandert das, worauf man zeigt, mit jedem Bild ein
    // Stück — und man sucht den Fehler beim Zeiger.
    const model: Model = { at: at(-3, 1.1, 2), turn: yawTurn(-1.9), scale: 1 / 33 };
    for (const point of [at(0, 0, 0), at(25, 2.8, -12), at(-40, -1, 7)]) {
      close(worldToPlan(model, CENTRE, planToWorld(model, CENTRE, point)), point, 4);
    }
  });

  it('rechnet auch ein gekipptes Modell in beide Richtungen', () => {
    // Seit das Modell in der Hand liegt, steht es nicht mehr zwangsläufig
    // waagerecht — und dann muss der Zeiger trotzdem die Kachel treffen, auf
    // die er zeigt.
    const model: Model = {
      at: at(0.4, 1.3, -0.7),
      turn: turnAround({ x: 1, y: 0.3, z: 0 }, 0.9),
      scale: 1 / 20,
    };
    for (const point of [at(0, 0, 0), at(12, 1.5, 8)]) {
      close(worldToPlan(model, CENTRE, planToWorld(model, CENTRE, point)), point, 4);
    }
  });

  it('macht aus einer Kachel im Plan eine Handbreit im Raum', () => {
    const model: Model = { at: at(0, 1, 0), turn: yawTurn(0), scale: 1 / 25 };
    const a = planToWorld(model, CENTRE, at(CENTRE.x, 0, CENTRE.z));
    const b = planToWorld(model, CENTRE, at(CENTRE.x + 2.5, 0, CENTRE.z));
    expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeCloseTo(0.1);
  });

  it('dreht den Norden des Plans nach vorn, wenn das Modell wie der Kopf schaut', () => {
    // Blick nach −Z (yaw 0): Der Norden des Plans (kleineres z) muss dann
    // **weiter weg** liegen, also auch nach −Z. Das ist das Vorzeichen, das man
    // in der Brille nur bemerkt und nie nachvollzieht.
    const model: Model = { at: at(0, 1, 0), turn: yawTurn(0), scale: 1 / 20 };
    const north = planToWorld(model, CENTRE, at(CENTRE.x, 0, CENTRE.z - 10));
    expect(north.z).toBeLessThan(0);
  });
});

describe('Mit einer Hand', () => {
  it('trägt das Modell um genau das, was die Hand gewandert ist', () => {
    const start: Model = { at: at(0, 1.2, -1), turn: yawTurn(0.4), scale: 1 / 20 };
    const next = grabOne(start, hand(0, 1.2, -1), hand(0.3, 1.35, -0.8));
    close(next.at, at(0.3, 1.35, -0.8));
    expect(next.scale).toBeCloseTo(start.scale);
  });

  it('dreht es mit dem Handgelenk mit — es liegt in der Hand', () => {
    // Der Unterschied zur ersten Fassung: Damals blieb der Grundriss stur
    // waagerecht stehen, und das fühlte sich an, als klebte er in der Luft.
    const start: Model = { at: at(0, 1.2, -1), turn: yawTurn(0), scale: 1 / 20 };
    const grip = hand(0, 1.2, -1);
    const rolled = { at: grip.at, turn: turnAround({ x: 0, y: 0, z: 1 }, Math.PI / 2) };
    const next = grabOne(start, grip, rolled);
    // Die Hand hat um Z gedreht: Was im Modell nach +X zeigte, zeigt jetzt nach +Y.
    const x = axis(next, { x: 1, y: 0, z: 0 });
    expect(x.y).toBeCloseTo(1, 5);
  });

  it('lässt den angefassten Punkt unter der Hand liegen, auch beim Drehen', () => {
    // Ein Ding, das beim Drehen der Hand wegwandert, ist keines, das man hält.
    const start: Model = { at: at(0.2, 1.2, -0.9), turn: yawTurn(0.3), scale: 1 / 20 };
    const grip = hand(0.1, 1.15, -0.8);
    const anchor = worldToPlan(start, CENTRE, grip.at);
    const moved: Hold = {
      at: at(-0.3, 1.5, -0.6),
      turn: turnAround({ x: 0.3, y: 1, z: 0.2 }, 1.2),
    };
    const next = grabOne(start, grip, moved);
    close(planToWorld(next, CENTRE, anchor), moved.at, 4);
  });

  it('lässt es nicht in den Boden und nicht an die Decke', () => {
    const start: Model = { at: at(0, 1, 0), turn: yawTurn(0), scale: 1 / 20 };
    expect(grabOne(start, hand(0, 1, 0), hand(0, -5, 0)).at.y).toBeCloseTo(HOVER_MIN);
    expect(grabOne(start, hand(0, 1, 0), hand(0, 9, 0)).at.y).toBeCloseTo(HOVER_MAX);
  });
});

describe('Mit zwei Händen', () => {
  const start: Model = { at: at(0, 1.2, -1), turn: yawTurn(0), scale: 1 / 20 };
  const left = hand(-0.2, 1.2, -1);
  const right = hand(0.2, 1.2, -1);

  it('zieht am Handabstand den Maßstab', () => {
    // Hände doppelt so weit auseinander: Modell doppelt so groß.
    const next = grabTwo(start, CENTRE, left, right, hand(-0.4, 1.2, -1), hand(0.4, 1.2, -1));
    expect(next.scale).toBeCloseTo(start.scale * 2);
  });

  it('dreht das Modell mit den Händen mit', () => {
    // Eine Vierteldrehung der Handverbindung ist eine Vierteldrehung des
    // Modells — und der Maßstab bleibt, denn der Abstand blieb.
    const next = grabTwo(start, CENTRE, left, right, hand(0, 1.2, -1.2), hand(0, 1.2, -0.8));
    // Was vorher nach +X zeigte, zeigt jetzt die Handverbindung entlang, also
    // nach +Z oder −Z — eine Vierteldrehung, in welche Richtung sagt das
    // Vorzeichen der Hände.
    const x = axis(next, { x: 1, y: 0, z: 0 });
    expect(Math.abs(x.z)).toBeCloseTo(1, 5);
    expect(next.scale).toBeCloseTo(start.scale);
  });

  it('kippt es, wenn die Hände die Linie zwischen sich kippen', () => {
    // **Das, wofür es die zweite Fassung gibt.** Vorher wurde nur der Anteil in
    // der Waagerechten gelesen, und ein Grundriss ließ sich nicht ansehen,
    // sondern nur drehen.
    const next = grabTwo(start, CENTRE, left, right, hand(-0.2, 1.0, -1), hand(0.2, 1.4, -1));
    const x = axis(next, { x: 1, y: 0, z: 0 });
    expect(x.y).toBeGreaterThan(0.6);
  });

  it('rollt es, wenn beide Hände in den Fingern rollen', () => {
    // Zwei Hände an einer Stange, die sie drehen, ohne sie zu schwenken: Die
    // Linie zwischen ihnen bleibt gleich, das Modell dreht sich trotzdem.
    const roll = turnAround({ x: 1, y: 0, z: 0 }, Math.PI / 2);
    const next = grabTwo(
      start,
      CENTRE,
      left,
      right,
      { at: left.at, turn: roll },
      { at: right.at, turn: roll },
    );
    // Gerollt wird um die Handachse (+X, von der linken zur rechten Hand): Was
    // nach oben zeigte, zeigt danach nach +Z — auf den Bauch des Spielers zu.
    const up = axis(next, { x: 0, y: 1, z: 0 });
    expect(up.z).toBeCloseTo(1, 5);
  });

  it('lässt den Punkt zwischen den Fingern liegen', () => {
    // **Die Regel, ohne die sich jede Karte falsch anfühlt.** Was man angefasst
    // hat, bleibt unter der Hand, während sich alles andere darum herum ändert.
    const held = midpoint(left.at, right.at);
    const anchor = worldToPlan(start, CENTRE, held);
    const toA = hand(-0.1, 1.4, -0.6, turnAround({ x: 0, y: 1, z: 0 }, 0.4));
    const toB = hand(0.5, 1.4, -0.9, turnAround({ x: 0, y: 1, z: 0 }, 0.4));
    const next = grabTwo(start, CENTRE, left, right, toA, toB);
    close(planToWorld(next, CENTRE, anchor), midpoint(toA.at, toB.at), 4);
  });

  it('bleibt in den Grenzen des Maßstabs', () => {
    const tiny = grabTwo(start, CENTRE, left, right, hand(-0.001, 1.2, -1), hand(0.001, 1.2, -1));
    expect(tiny.scale).toBeGreaterThanOrEqual(SCALE_MIN);
    const huge = grabTwo(start, CENTRE, left, right, hand(-9, 1.2, -1), hand(9, 1.2, -1));
    expect(huge.scale).toBeCloseTo(SCALE_MAX);
  });

  it('macht aus einer verschluckten Handspanne keinen Sprung', () => {
    // Zwei Hände, die aufeinanderliegen, sind kein Maßstab von null, sondern
    // ein Tracking-Aussetzer — und der darf das Modell nicht verschlucken.
    const next = grabTwo(start, CENTRE, left, right, hand(0, 1.2, -1), hand(0, 1.2, -1));
    expect(next.scale).toBeCloseTo(start.scale);
    expect(next.turn.w).toBeCloseTo(start.turn.w);
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

  it('legt ein verdrehtes Modell wieder flach — die Wasserwaage', () => {
    // Der Preis dafür, dass man kippen darf: Man muss es auch wieder
    // geradebekommen, und zwar mit einem Griff.
    const model = bringNear(at(0, 1.6, 0), 0.6, 10);
    const up = rotateVec({ x: 0, y: 1, z: 0 }, model.turn, { x: 0, y: 0, z: 0 });
    expect(up.y).toBeCloseTo(1, 6);
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
    const model: Model = { at: at(0.4, 1.3, -0.9), turn: yawTurn(0.8), scale: 1 / 18 };
    const from = { x: 0, z: 0 };
    const to = { x: 1.25, z: -1.25 };
    const corner = at(-5, 0, 5);
    const before = planToWorld(model, from, corner);
    const after = planToWorld(recentre(model, from, to), to, corner);
    close(before, after, 6);
  });
});

describe('Die Drehungen selbst', () => {
  it('legt eine Richtung auf die andere', () => {
    const turn = turnBetween({ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 });
    const moved = rotateVec({ x: 1, y: 0, z: 0 }, turn, { x: 0, y: 0, z: 0 });
    expect(moved.y).toBeCloseTo(1, 6);
  });

  it('dreht eine Richtung auf ihr genaues Gegenteil um eine Achse, die quer steht', () => {
    // Der Sonderfall, den man vergisst — und dann steht die Drehung auf null,
    // weil es „keine kürzeste" gibt.
    const turn = turnBetween({ x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 });
    const moved = rotateVec({ x: 0, y: 1, z: 0 }, turn, { x: 0, y: 0, z: 0 });
    expect(moved.y).toBeCloseTo(-1, 6);
  });

  it('nimmt aus einer Drehung nur das heraus, was um die Achse geht', () => {
    // Eine Drehung quer zur Achse ist kein Rollen: Sie muss verschwinden.
    expect(twistAbout(yawTurn(1.1), { x: 1, y: 0, z: 0 }).w).toBeCloseTo(1, 6);
    // Und eine um die Achse bleibt ganz stehen.
    const roll = twistAbout(yawTurn(1.1), { x: 0, y: 1, z: 0 });
    expect(roll.y).toBeCloseTo(Math.sin(0.55), 6);
  });

  it('mittelt zwei Drehungen auch dann, wenn sie mit anderem Vorzeichen kommen', () => {
    // `q` und `−q` sind dieselbe Drehung; ihre Summe wäre null.
    const a = yawTurn(0.8);
    const b = { x: -a.x, y: -a.y, z: -a.z, w: -a.w };
    const mid = averageTurn(a, b);
    expect(Math.abs(mid.y)).toBeCloseTo(Math.abs(a.y), 6);
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
