/**
 * **Wie eine fremde Pistole auf den Halterzylinder kommt** — die Rechnung
 * dahinter, ohne Netz und ohne Brille.
 *
 * Die Absage in der Doku hieß „Kandidat da, **Griff fehlt**", und alles, was
 * sie einlöst, steht in `pistolFit.ts`: Wo an einem Netz der Griff aufhört,
 * wie groß die Waffe dadurch wird und wohin sie im Werkzeug kommt. Das Messen
 * selbst braucht three.js und steht daneben (`pistolModel.ts`); was hier
 * geprüft wird, sind die Profile und die Umrechnung — genau die Teile, die man
 * in der Brille nicht ansieht, sondern nur glaubt.
 *
 * Die Profile unten sind **von Hand gestellt** und keine Ausgabe des Messers:
 * Ein Test, der das Netz noch einmal misst, prüft die Messung mit sich selbst.
 * Sie sind der Form von `Gun_Pistol.glb` nachempfunden — Griff hinten,
 * Abzugsbügel als Lücke, Vordermagazin —, aber mit runden Zahlen.
 */
import {
  FRAME_FLARE,
  LOBE_LEVEL,
  frameFlare,
  gripScale,
  gunAt,
  gunPoint,
  lobeEnd,
} from './pistolFit';

const UP = Number.POSITIVE_INFINITY;

describe('Der hintere Lappen hört am Abzugsbügel auf', () => {
  // Zehn Scheiben über eine Waffe von einem Meter: die ersten vier hängen
  // tief herunter (der Griff), dann kommt der Bügel, dann das Magazin vorn.
  const floors = [-0.2, -0.24, -0.24, -0.22, -0.05, -0.04, -0.2, -0.2, -0.2, 0.1];

  it('schneidet dort, wo der Boden zum ersten Mal hochkommt', () => {
    // Vier von zehn Scheiben, also bei 0,4 der Länge — und eben nicht beim
    // Magazin, das genauso tief hängt, aber nicht mehr zum Griff gehört.
    expect(lobeEnd(floors, 0, 1, -0.1)).toBeCloseTo(0.4, 9);
  });

  it('nimmt eine leere Scheibe als Ende', () => {
    // Wo kein Netz ist, ist die Waffe zu Ende. Eine Lücke *im* Griff gibt es
    // längs nicht: Ein Griff ist ein Klotz, keine Kette.
    expect(lobeEnd([-0.2, -0.2, UP, -0.2], 0, 1, -0.1)).toBeCloseTo(0.5, 9);
  });

  it('gibt die ganze Waffe heraus, wenn nichts hochkommt', () => {
    // Ein Netz ohne Abzugsbügel. Dann ist der „Griff" die ganze Waffe, der
    // Maßstab wird winzig — und am Ende bleibt die gebaute Pistole stehen,
    // weil so ein Netz keine Pistole ist.
    expect(lobeEnd([-0.2, -0.2, -0.2], -1, 2, -0.1)).toBe(2);
  });

  it('rechnet die Schwelle auf halbem Weg zwischen Knauf und Mitte', () => {
    // Die Zahl steht nicht in der Rechnung, sondern kommt aus der Box des
    // Netzes — hier einmal nachgestellt, damit der Anteil festliegt.
    const low = -0.24;
    const high = 0.3;
    const level = low + ((low + high) / 2 - low) * LOBE_LEVEL;
    expect(level).toBeCloseTo(-0.105, 4);
  });
});

describe('Der Griff hört auf, wo der Rahmen ausladet', () => {
  // Von unten nach oben: sechsmal die Breite des Knaufs, dann der Rahmen.
  const widths = [0.058, 0.058, 0.055, 0.058, 0.052, 0.058, 0.084, 0.12, 0.135];

  it('findet den Sprung und nicht die Steigung', () => {
    expect(frameFlare(widths, -0.17, 0.01, widths[0]!)).toBeCloseTo(-0.05, 9);
  });

  it('lässt sich von einer Lücke im Griff nicht abschneiden', () => {
    // Das ist der Grund, warum hier die **unterste** Ausladung gesucht wird
    // und nicht das Ende eines Laufs: Ein Netz ist eine Hülle, und eine dünne
    // Scheibe trifft davon manchmal nur Kanten. Ein Lauf, der an der Lücke
    // abbräche, hätte den Griff nach Laune des Rasters halbiert.
    const gapped = [0.058, Number.NaN, 0.058, Number.NaN, 0.058, 0.058, 0.084, 0.12];
    expect(frameFlare(gapped, 0, 0.8, 0.058)).toBeCloseTo(0.6, 9);
  });

  it('nimmt eine Fase im Griff nicht für den Rahmen', () => {
    // Eine einzelne Scheibe ein paar Millimeter breiter ist eine abgerundete
    // Kante und kein Gehäuse — dafür steht der Spielraum.
    expect(FRAME_FLARE).toBeGreaterThan(1);
    const chamfered = [0.058, 0.058, 0.07, 0.058, 0.084];
    expect(frameFlare(chamfered, 0, 1, 0.058)).toBeCloseTo(0.8, 9);
  });

  it('gibt die Oberkante des Lappens heraus, wenn nichts ausladet', () => {
    expect(frameFlare([0.058, 0.058], -0.17, 0.01, 0.058)).toBe(0.01);
  });
});

describe('Der Maßstab kommt aus dem Griff', () => {
  it('bringt den gemessenen Griff auf die Länge des Halterzylinders', () => {
    // Die Zahlen von `Gun_Pistol.glb`: 16,6 cm Griff im Maßstab seines Pakets
    // auf 10 cm Faustbreite — Faktor 0,60, und die Waffe wird darüber aus 61
    // cm rund 37 cm lang. Fast doppelt so lang wie die gebaute Pistole, und
    // genau das ist der Preis dafür, dass der Griff in die Faust passt.
    const scale = gripScale(0.1661, 0.1);
    expect(scale).toBeCloseTo(0.602, 3);
    expect(0.6119 * scale).toBeCloseTo(0.368, 3);
  });

  it('lässt ein unmögliches Maß, wie es ist', () => {
    expect(gripScale(0, 0.1)).toBe(1);
    expect(gripScale(0.16, 0)).toBe(1);
    expect(gripScale(Number.NaN, 0.1)).toBe(1);
  });
});

describe('Die Waffe wird um ihren Griff gehängt', () => {
  const centre = { x: 0, y: -0.0878, z: -0.0593 };
  const target = { x: 0, y: -0.055, z: 0.01 };
  const scale = 0.602;

  it('legt die Mitte des Griffs genau auf die Mitte des Zylinders', () => {
    // Das ist die ganze Einpassung, und sie ist eine Umkehrung: Der Zylinder
    // steht fest (`gripFit.STANDARD_GRIP`), das Werkzeug folgt ihm.
    const at = gunAt(centre, scale, target);
    const back = gunPoint(centre, scale, at);
    expect(back.x).toBeCloseTo(target.x, 9);
    expect(back.y).toBeCloseTo(target.y, 9);
    expect(back.z).toBeCloseTo(target.z, 9);
  });

  it('dreht den Lauf nach vorn — sonst schösse sie nach hinten', () => {
    // `Gun_Pistol.glb` zeigt in seiner Datei nach +z, die gebaute Pistole nach
    // −z, und dorthin schießt sie auch (`PistolTool.fire` nimmt `(0, 0, −1)`).
    // Also muss die Mündung des Modells im Werkzeug **vor** dem Griff liegen.
    const at = gunAt(centre, scale, target);
    const muzzle = gunPoint({ x: 0, y: 0.1075, z: 0.4954 }, scale, at);
    expect(muzzle.z).toBeLessThan(target.z);
    expect(muzzle.z).toBeCloseTo(-0.3241, 3);
  });

  it('dreht um die Hochachse und lässt den Griff nach hinten lehnen', () => {
    // Eine halbe Drehung um die Hochachse dreht den Lauf um und lässt oben
    // oben: Der Knauf bleibt hinter der Oberkante des Griffs, die Waffe steht
    // nicht auf dem Kopf. Eine Drehung um die Querachse täte beides falsch.
    const at = gunAt(centre, scale, target);
    const butt = gunPoint({ x: 0, y: -0.1709, z: -0.1165 }, scale, at);
    const web = gunPoint({ x: 0, y: -0.0047, z: -0.0021 }, scale, at);
    expect(butt.y).toBeLessThan(web.y);
    expect(butt.z).toBeGreaterThan(web.z);
  });

  it('spiegelt auch die Querachse mit', () => {
    // Eine halbe Drehung um die Hochachse ist keine Spiegelung, sondern eine
    // Drehung: Was links war, ist rechts, und was rechts war, ist links.
    const at = gunAt(centre, scale, target);
    const left = gunPoint({ x: -0.1, y: 0, z: 0 }, scale, at);
    const right = gunPoint({ x: 0.1, y: 0, z: 0 }, scale, at);
    expect(left.x).toBeGreaterThan(right.x);
    expect(left.x - at.x).toBeCloseTo(-(right.x - at.x), 9);
  });
});
