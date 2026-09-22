import {
  CHEF_HAT_LOBES,
  CHEF_HAT_SEAT,
  CHEF_HAT_SEGMENTS,
  chefHatProfile,
  chefHatVertices,
} from './chefHat';
import { HEAD_SPREAD } from './avatarLook';

/**
 * **Was an der Kochmütze rechnerisch stimmen muss** — alles andere entscheidet
 * das Auge am Musterbogen (`npm run avatar`).
 *
 * Die Zahlen hier sind die vier Sätze aus der Beschreibung der Vorlage: Sie
 * ist so hoch wie der Kopf, die Haube kragt über das Band, nichts rutscht über
 * die Augen, und es bleibt Low-Poly. Jeder dieser Sätze ist beim Bauen schon
 * einmal verloren gegangen.
 */

/** Wie die Mütze wirklich gebaut wird (`core/headgear.ts`): mit `HEAD_SPREAD`. */
function hat(): ReturnType<typeof chefHatVertices> {
  return chefHatVertices({ spread: HEAD_SPREAD });
}

/** Die Ecken als Punkte — die Form aller Prüfungen hier. */
function corners(mesh: ReturnType<typeof chefHatVertices>): Array<[number, number, number]> {
  const out: Array<[number, number, number]> = [];
  for (let i = 0; i < mesh.positions.length; i += 3) {
    out.push([mesh.positions[i]!, mesh.positions[i + 1]!, mesh.positions[i + 2]!]);
  }
  return out;
}

describe('die Kochmütze als Netz', () => {
  it('ist ungefähr so hoch wie der Kopf', () => {
    const points = corners(hat());
    const low = Math.min(...points.map((p) => p[1]));
    const high = Math.max(...points.map((p) => p[1]));
    // Gerechnet wird in Kopfhalbmessern, ein Kopf ist also 2 hoch. Die Mütze
    // darf ein Stück darüber liegen — eine Kochmütze ist hoch —, aber sie ist
    // keine Zipfelmütze und kein Käppchen.
    expect(high - low).toBeGreaterThan(1.8);
    expect(high - low).toBeLessThan(2.3);
  });

  it('lässt nichts über die Augen rutschen', () => {
    // Die Regel des ganzen Hutregals (`core/headgear.ts`): 0,45 Halbmesser
    // über der Kopfmitte ist unten.
    for (const [, y] of corners(hat())) expect(y).toBeGreaterThanOrEqual(CHEF_HAT_SEAT - 1e-9);
  });

  it('lässt die Haube über das Band kragen', () => {
    const profile = chefHatProfile();
    const band = Math.max(...profile.filter((ring) => ring.band).map((ring) => ring.radius));
    const hood = Math.max(...profile.filter((ring) => !ring.band).map((ring) => ring.radius));
    // Der Überhang mit seinem Schatten darunter ist das, woran man eine
    // Kochmütze auch als Scherenschnitt erkennt.
    expect(hood / band).toBeGreaterThan(1.12);
    // Und das Band liegt vollständig unter der Haube.
    const top = Math.max(...profile.filter((ring) => ring.band).map((ring) => ring.y));
    for (const ring of profile) {
      if (!ring.band) expect(ring.y).toBeGreaterThanOrEqual(top);
    }
  });

  it('steht links wie rechts gleich', () => {
    const points = corners(hat());
    // Gespiegelt an der Mittelebene muss jede Ecke wieder auf einer liegen —
    // sonst hängt die Mütze zu einer Seite. Gesucht wird mit einer Toleranz
    // und nicht über eine Zeichenkette: `sin(2π − θ)` ist nur auf die letzten
    // Bits genau `−sin(θ)`, und daran scheitert jeder Vergleich auf Gleichheit.
    const mirrored = points.every(([x, y, z]) =>
      points.some(
        (q) => Math.abs(q[0] + x) < 1e-9 && Math.abs(q[1] - y) < 1e-9 && Math.abs(q[2] - z) < 1e-9,
      ),
    );
    expect(mirrored).toBe(true);
  });

  it('lehnt sich nach hinten und lässt das Band stehen', () => {
    const profile = chefHatProfile();
    for (const ring of profile) {
      // −z ist vorn: Wer sich zurücklehnt, wandert nach +z.
      if (ring.band) expect(ring.lean).toBe(0);
      else expect(ring.lean).toBeGreaterThan(0);
    }
    const top = profile[profile.length - 1]!;
    expect(top.lean).toBeGreaterThan(0.2);
    // Ohne Schräglage steht sie gerade — dieselbe Rechnung, eine Zahl anders.
    for (const ring of chefHatProfile(0)) expect(ring.lean).toBe(0);
  });

  it('bleibt Low-Poly', () => {
    const mesh = hat();
    // Wand, Deckel und Kuppelfächer — und alles zusammen unter der Grenze,
    // ab der aus einem Stück Stoff ein Modell wird.
    const rings = chefHatProfile().length;
    expect(mesh.triangles).toBe((rings - 1) * CHEF_HAT_SEGMENTS * 2 + CHEF_HAT_SEGMENTS * 2);
    expect(mesh.triangles).toBeLessThan(700);
    expect(mesh.positions.length).toBe(mesh.triangles * 9);
    expect(mesh.band.length).toBe(mesh.triangles);
  });

  it('teilt sich in dunkles Band und weiße Haube', () => {
    const mesh = hat();
    const bandTop = Math.max(
      ...chefHatProfile()
        .filter((r) => r.band)
        .map((r) => r.y),
    );
    for (let i = 0; i < mesh.triangles; i++) {
      if (!mesh.band[i]) continue;
      // Jedes Dreieck des Bandes liegt unter der Oberkante des Bandes: Was
      // darüber liegt, ist Haube und weiß.
      for (let c = 0; c < 3; c++) {
        expect(mesh.positions[i * 9 + c * 3 + 1]!).toBeLessThanOrEqual(bandTop + 1e-9);
      }
    }
    // Und es ist wirklich beides da.
    expect(mesh.band.filter(Boolean).length).toBeGreaterThan(0);
    expect(mesh.band.filter((b) => !b).length).toBeGreaterThan(mesh.band.filter(Boolean).length);
  });

  it('legt auf jede Falte und jeden Wulst eine Ecke', () => {
    // Vier Ecken je Falte: sonst wird aus den weichen Lappen ein Zackenkranz.
    expect(CHEF_HAT_SEGMENTS % (2 * CHEF_HAT_LOBES)).toBe(0);
    const mesh = chefHatVertices({ spread: 1 });
    const widest = chefHatProfile().reduce((a, b) => (a.radius > b.radius ? a : b));
    const onRing = corners(mesh).filter((p) => Math.abs(p[1] - widest.y) < 0.03);
    const radii = onRing.map((p) => Math.hypot(p[0], p[2] - widest.lean));
    // Die Kerbe sitzt genau `fold` tiefer als der Wulst — und beide liegen auf
    // einer Ecke, nicht zwischen zweien.
    expect(Math.max(...radii)).toBeCloseTo(widest.radius, 6);
    expect(Math.min(...radii)).toBeCloseTo(widest.radius * (1 - widest.fold), 6);
  });
});
