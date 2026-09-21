import * as THREE from 'three';
import { deniesShadow } from '../../../core/graphicsScene';
import {
  COPIER_DECK,
  COPIER_HEIGHT,
  COPIER_PLATE,
  COPIER_ZONE,
  COMPUTER_HIGH,
  DESK_HEIGHT,
  DESK_TOP,
  DeskKit,
  copierField,
  copierSpot,
  pieceSide,
  type PieceSide,
} from './kitchenDesk';
import { kitchenPiece } from '../../../core/kitchenFit';
import type { Turn } from './kitchenPlan';

/**
 * **Was Computer-Tisch und Kopierer versprechen** (`kitchenDesk.ts`).
 *
 * Drei Versprechen, und das erste ist das, an dem ein Möbel scheitert, ohne dass
 * es jemandem auffällt: dass „vorn" bei **allen vier** Drehungen dieselbe Seite
 * meint — die, in die das Möbel schaut. Dazu, dass die beiden Felder des
 * Kopierers nach jeder Drehung noch eine Kachel auseinanderliegen und **gleich
 * hoch** sind; und dass beide Möbel mit dem Ursprung auf dem Boden in ihrer
 * Mitte herauskommen und in ihre Grundfläche passen.
 *
 * Alles davon ist reine Rechnung oder ein Haufen Quader: Es braucht weder
 * `document` noch WebGL (`core/chefFit.canLoadModels`) und läuft deshalb in
 * jedem Testlauf mit.
 */

const TURNS: readonly Turn[] = [0, 1, 2, 3];

/** Die acht Himmelsrichtungen als Vektor vom Möbel zur Figur. */
const COMPASS: readonly { name: string; dx: number; dz: number; side: PieceSide }[] = [
  { name: 'Norden', dx: 0, dz: -1, side: 'front' },
  { name: 'Nordosten', dx: 1, dz: -1, side: 'front' },
  { name: 'Osten', dx: 1, dz: 0, side: 'side' },
  { name: 'Südosten', dx: 1, dz: 1, side: 'back' },
  { name: 'Süden', dx: 0, dz: 1, side: 'back' },
  { name: 'Südwesten', dx: -1, dz: 1, side: 'back' },
  { name: 'Westen', dx: -1, dz: 0, side: 'side' },
  { name: 'Nordwesten', dx: -1, dz: -1, side: 'front' },
];

/** Eine Richtung, um `deg` neben der Vorderseite eines ungedrehten Möbels. */
function beside(deg: number): { dx: number; dz: number } {
  const rad = (deg * Math.PI) / 180;
  return { dx: Math.sin(rad), dz: -Math.cos(rad) };
}

describe('pieceSide — von welcher Seite jemand vor einem Möbel steht', () => {
  it('nennt die Richtung, in die das Möbel schaut, seine Vorderseite', () => {
    // Bei `turn: 0` ist vorn Norden (`kitchenPlan.Spot.turn`), eine Drehung
    // weiter Westen, und so fort — dieselbe Reihenfolge wie `beltStep`.
    expect(pieceSide(0, 0, -1)).toBe('front');
    expect(pieceSide(1, -1, 0)).toBe('front');
    expect(pieceSide(2, 0, 1)).toBe('front');
    expect(pieceSide(3, 1, 0)).toBe('front');
    // Und genau gegenüber liegt die Rückseite.
    expect(pieceSide(0, 0, 1)).toBe('back');
    expect(pieceSide(1, 1, 0)).toBe('back');
    expect(pieceSide(2, 0, -1)).toBe('back');
    expect(pieceSide(3, -1, 0)).toBe('back');
  });

  it('antwortet auf allen acht Himmelsrichtungen und in allen vier Drehungen gleich', () => {
    // Die Probe darauf, dass sich die Seiten **mit** dem Möbel drehen: Die
    // Richtung wird um dieselbe Vierteldrehung gedreht wie das Möbel, also muss
    // dieselbe Antwort herauskommen. Käme sie es nicht, hinge die Vorderseite
    // an der Welt statt am Möbel.
    for (const turn of TURNS) {
      for (const point of COMPASS) {
        const spun = copierSpot([point.dx, point.dz], turn);
        expect(`${turn}:${point.name}:${pieceSide(turn, spun.x, spun.z)}`).toBe(
          `${turn}:${point.name}:${point.side}`,
        );
      }
    }
  });

  it('lässt die Vorderseite 120° spannen — schräg davor ist noch davor', () => {
    // Die vier Diagonalen liegen 45° neben der Blickrichtung und gehören
    // deshalb noch zur Vorderseite: Wer schräg an den Tisch herantritt, meint
    // den Tisch. Bei vier gleichen Vierteln (90°) wäre genau das schon die
    // Flanke.
    expect(pieceSide(0, 1, -1)).toBe('front');
    expect(pieceSide(0, -1, -1)).toBe('front');
    // Und die Flanken sind das, was von 360° übrig bleibt: zweimal 60°.
    expect(pieceSide(0, 1, 0)).toBe('side');
    expect(pieceSide(0, -1, 0)).toBe('side');
  });

  it('zieht die Grenzen bei 60° und 120° und zählt sie zur großen Seite', () => {
    for (const turn of TURNS) {
      for (const sign of [1, -1]) {
        const at = (deg: number): PieceSide => {
          const flat = beside(deg * sign);
          const spun = copierSpot([flat.dx, flat.dz], turn);
          return pieceSide(turn, spun.x, spun.z);
        };
        // Genau auf der Grenze gewinnt die Vorderseite und die Rückseite: Über
        // „vorn" oder „seitlich" soll nicht das letzte Bit einer Wurzel
        // entscheiden (`SIDE_EDGE`).
        expect(at(59)).toBe('front');
        expect(at(60)).toBe('front');
        expect(at(61)).toBe('side');
        expect(at(119)).toBe('side');
        expect(at(120)).toBe('back');
        expect(at(121)).toBe('back');
      }
    }
  });

  it('hält eine Figur, die auf dem Möbel steht, für eine davor', () => {
    // Der sichere Vorgabefall: Vorn wird das Möbel benutzt, hinten wird es
    // weggetragen. Wer im Gedränge in die Ecke des Tisches läuft, will an den
    // Rechner.
    for (const turn of TURNS) {
      expect(pieceSide(turn, 0, 0)).toBe('front');
      expect(pieceSide(turn, 1e-9, -1e-9)).toBe('front');
      // Und eine kaputte Zahl rutscht nicht in die Rückseite durch.
      expect(pieceSide(turn, Number.NaN, 0)).toBe('front');
      expect(pieceSide(turn, 0, Number.NaN)).toBe('front');
    }
  });

  it('kümmert sich nicht um die Entfernung, nur um die Richtung', () => {
    expect(pieceSide(0, 0, -0.01)).toBe('front');
    expect(pieceSide(0, 0, -40)).toBe('front');
    expect(pieceSide(2, 0, -0.01)).toBe('back');
    expect(pieceSide(2, 0, -40)).toBe('back');
  });
});

describe('copierSpot — wo die beiden Felder nach dem Drehen liegen', () => {
  it('lässt ein ungedrehtes Möbel, wo es ist', () => {
    expect(copierSpot(COPIER_PLATE, 0)).toEqual({ x: -0.5, z: 0 });
    expect(copierSpot(COPIER_ZONE, 0)).toEqual({ x: 0.5, z: 0 });
  });

  it('dreht in allen vier Vierteln so, wie die Zone das Netz dreht', () => {
    // Die Probe auf `kitchen.standAt`: Dort bekommt ein Möbel
    // `rotation.y = turn · 90°`, und sein Versatz wird mit derselben Drehung
    // mitgeführt. Beides muss dasselbe ergeben, sonst liegt die Kopie-Zone bei
    // einem gedrehten Kopierer neben dem Gerät.
    for (const turn of TURNS) {
      for (const offset of [COPIER_PLATE, COPIER_ZONE]) {
        const spun = new THREE.Vector3(offset[0], 0, offset[1]).applyAxisAngle(
          new THREE.Vector3(0, 1, 0),
          (turn * Math.PI) / 2,
        );
        const spot = copierSpot(offset, turn);
        expect(spot.x).toBeCloseTo(spun.x, 10);
        expect(spot.z).toBeCloseTo(spun.z, 10);
      }
    }
  });

  it('rechnet die Vierteldrehungen exakt und nicht fast', () => {
    // Ganze Zahlen statt `Math.cos(Math.PI / 2)`: Eine Feldmitte, die um
    // 6·10⁻¹⁷ danebenläge, wäre harmlos — eine, die es durch jede weitere
    // Rechnung mitschleppt, irgendwann nicht mehr. Abgelesen wird als Text,
    // weil genau das den Staub sichtbar machte: `3.06e-17` liest sich anders
    // als `0`.
    const at = (offset: readonly [number, number], turn: Turn): string => {
      const spot = copierSpot(offset, turn);
      return `${spot.x} / ${spot.z}`;
    };
    expect(at(COPIER_PLATE, 1)).toBe('0 / 0.5');
    expect(at(COPIER_ZONE, 1)).toBe('0 / -0.5');
    expect(at(COPIER_PLATE, 2)).toBe('0.5 / 0');
    expect(at(COPIER_ZONE, 2)).toBe('-0.5 / 0');
    expect(at(COPIER_PLATE, 3)).toBe('0 / -0.5');
    expect(at(COPIER_ZONE, 3)).toBe('0 / 0.5');
  });

  it('hält die beiden Felder in jeder Drehung eine Kachel auseinander', () => {
    for (const turn of TURNS) {
      const plate = copierSpot(COPIER_PLATE, turn);
      const zone = copierSpot(COPIER_ZONE, turn);
      expect(Math.hypot(zone.x - plate.x, zone.z - plate.z)).toBeCloseTo(1, 10);
      // Und sie bleiben in der Grundfläche des Möbels: zwei Kacheln lang, eine
      // breit (`tiles: [2, 1]`), also nie weiter als einen halben Meter von der
      // Mitte weg.
      for (const spot of [plate, zone]) {
        expect(Math.abs(spot.x)).toBeLessThanOrEqual(0.5 + 1e-9);
        expect(Math.abs(spot.z)).toBeLessThanOrEqual(0.5 + 1e-9);
      }
    }
  });

  it('dreht die Mitte des Möbels nicht von der Stelle', () => {
    for (const turn of TURNS) {
      const spot = copierSpot([0, 0], turn);
      expect(`${spot.x} / ${spot.z}`).toBe('0 / 0');
    }
  });
});

describe('Die Maße aus dem Katalog', () => {
  it('nennt für den Tisch eine Hülle über der Ablage', () => {
    // `height` ist die Hülle, `deck` die Ablage (`core/kitchenFit.KitchenPiece`):
    // Wer etwas auf diesen Tisch legt, legt es auf die Platte und nicht auf den
    // Rechner.
    expect(DESK_TOP).toBeCloseTo(0.75, 10);
    expect(COMPUTER_HIGH).toBeCloseTo(0.46, 10);
    expect(DESK_HEIGHT).toBeCloseTo(1.21, 10);
    expect(DESK_HEIGHT).toBeCloseTo(DESK_TOP + COMPUTER_HIGH, 10);
    expect(DESK_HEIGHT).toBeGreaterThan(DESK_TOP);
    // Und der Rechner passt auf die Kachel, auf der der Tisch steht — er ist
    // so breit wie hoch (`block-bits/computer.glb`).
    expect(COMPUTER_HIGH).toBeLessThan(1);
  });

  it('legt beide Felder des Kopierers auf dieselbe Höhe', () => {
    // Eine Zahl für beide Felder, und deshalb ist das hier keine Prüfung auf
    // Gleichheit zweier Konstanten, sondern die Zusage, dass es nur **eine**
    // gibt: Läge die Kopie höher als die Vorlage, wäre die erste Frage nicht
    // mehr „wie kommt sie da hin?", sondern „warum ist sie größer?".
    expect(COPIER_DECK).toBeCloseTo(0.5, 10);
    expect(COPIER_HEIGHT).toBeCloseTo(0.8, 10);
    expect(COPIER_HEIGHT).toBeGreaterThan(COPIER_DECK);
  });

  it('setzt die beiden Feldmitten eine Kachel auseinander, quer zur Tiefe', () => {
    expect(COPIER_PLATE).toEqual([-0.5, 0]);
    expect(COPIER_ZONE).toEqual([0.5, 0]);
    expect(COPIER_ZONE[0] - COPIER_PLATE[0]).toBeCloseTo(1, 10);
    // Beide liegen in der Mitte ihrer Kachel und damit auf derselben Linie: Ein
    // Feld, das tiefer läge als das andere, wäre ein Gerät, das man schräg
    // bedient.
    expect(COPIER_PLATE[1]).toBe(COPIER_ZONE[1]);
  });
});

describe('DeskKit — der Bausatz ohne Leinwand', () => {
  it('lässt sich ohne `document` und ohne WebGL bauen', () => {
    expect(typeof document).toBe('undefined');
    const kit = new DeskKit();
    expect(() => kit.deskPiece()).not.toThrow();
    expect(() => kit.copierPiece()).not.toThrow();
    kit.dispose();
  });

  it('baut einen Tisch, der auf dem Boden steht und in seine Kachel passt', () => {
    const kit = new DeskKit();
    const desk = kit.deskPiece();
    expect(desk.name).toBe('kitchen-desk');
    desk.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(desk);

    // Ursprung **auf dem Boden in seiner Mitte**, wie jedes Küchenmöbel.
    expect(box.min.y).toBeCloseTo(0, 6);
    // **Bis zur Platte und nicht bis zur Hülle**: Der Rechner darauf ist ein
    // geladenes Modell (`COMPUTER_MODEL`), und ohne WebGL wird hier nichts
    // geholt. Die Hülle steht trotzdem fest — sie ist gerechnet (`DESK_HEIGHT`)
    // und nicht gemessen, und der Katalog schreibt sie ab.
    expect(box.max.y).toBeCloseTo(DESK_TOP, 6);
    expect((box.min.x + box.max.x) / 2).toBeCloseTo(0, 6);
    expect((box.min.z + box.max.z) / 2).toBeCloseTo(0, 6);
    // Eine Kachel und nicht mehr (`core/kitchenFit`, `tiles: [1, 1]`).
    expect(box.max.x - box.min.x).toBeLessThanOrEqual(1 + 1e-6);
    expect(box.max.z - box.min.z).toBeLessThanOrEqual(1 + 1e-6);
    kit.dispose();
  });

  /**
   * **Der Rechner bekommt seinen Anker, auch ohne Datei.**
   *
   * Er hängt auf der Platte und schaut nach vorn (−z), also um 180° gedreht
   * gegen die Datei. Ein Anker, der erst mit dem Modell entstünde, wäre einer,
   * den der Umbau nicht mehr findet — und die Drehung wäre dann eine Zeile in
   * einem Rückruf statt eine am Möbel.
   */
  it('hängt den Anker des Rechners auf die Platte und dreht ihn nach vorn', () => {
    const kit = new DeskKit();
    const desk = kit.deskPiece();
    const holder = desk.getObjectByName('kitchen-desk-computer');
    expect(holder).toBeDefined();
    expect(holder!.position.y).toBeCloseTo(DESK_TOP, 10);
    expect(holder!.position.x).toBeCloseTo(0, 10);
    expect(holder!.rotation.y).toBeCloseTo(Math.PI, 10);
    // Ohne WebGL hängt nichts darin — geholt wird erst mit `canLoadModels`.
    expect(holder!.children).toHaveLength(0);
    kit.dispose();
  });

  it('baut einen Kopierer über zwei Kacheln, mit zwei gleich hohen Feldern', () => {
    const kit = new DeskKit();
    const copier = kit.copierPiece();
    expect(copier.name).toBe('kitchen-copier');
    copier.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(copier);

    expect(box.min.y).toBeCloseTo(0, 6);
    expect(box.max.y).toBeCloseTo(COPIER_HEIGHT, 6);
    expect((box.min.x + box.max.x) / 2).toBeCloseTo(0, 6);
    expect((box.min.z + box.max.z) / 2).toBeCloseTo(0, 6);
    // Zwei Kacheln lang, eine tief (`tiles: [2, 1]`).
    expect(box.max.x - box.min.x).toBeLessThanOrEqual(2 + 1e-6);
    expect(box.max.z - box.min.z).toBeLessThanOrEqual(1 + 1e-6);

    // **Die eigentliche Zusage**: Über beiden Feldmitten liegt die oberste
    // waagerechte Fläche auf derselben Höhe — dem Glas links entspricht rechts
    // der Boden der Wiege. Die Pfosten zählen nicht mit, sie stehen an den
    // Ecken und nicht über der Mitte.
    expect(deckOver(copier, COPIER_PLATE)).toBeCloseTo(COPIER_DECK, 6);
    expect(deckOver(copier, COPIER_ZONE)).toBeCloseTo(COPIER_DECK, 6);
    kit.dispose();
  });

  it('teilt Formen und Farben über alle Möbel und gibt jede genau einmal frei', () => {
    const kit = new DeskKit();
    const shapes = new Set<THREE.BufferGeometry>();
    const skins = new Set<THREE.Material>();
    const collect = (model: THREE.Object3D): void => {
      model.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        shapes.add(mesh.geometry);
        skins.add(mesh.material as THREE.Material);
      });
    };

    for (let i = 0; i < 20; i++) collect(kit.deskPiece());
    // Platte und Wange — **zwei** Formen für zwanzig Tische, und die beiden
    // Wangen teilen sich eine. Es waren acht, solange der Rechner aus Kästen
    // bestand; jetzt ist er ein geladenes Modell und bringt seine Geometrie
    // selbst mit (`COMPUTER_MODEL`, geteilt über `core/kaykitModel.copyOf`).
    expect(shapes.size).toBe(2);
    expect(skins.size).toBe(2);

    for (let i = 0; i < 20; i++) collect(kit.copierPiece());
    // Sockel, Fuge, Glas, Wiege, Pfosten — fünf für die festen Teile, die vier
    // Pfosten teilen sich eine. Dazu **sechs verschmolzene**: eine für alles in
    // der Akzentfarbe (Bühne und Zielrahmen zusammen) und eine je Spitzenfarbe
    // der Spur (`kitchenMerge.ts`). Die Formen der einzelnen Zeichen stehen
    // nicht mehr im Modell — sie waren der Zwischenschritt dorthin.
    expect(shapes.size).toBe(13);
    // Und neun Farben mehr: Fuge, Glas, Akzent und fünf Spitzen — je Spitze
    // eine, denn durch sie läuft das Licht (`DeskKit.update`). Der Korpus ist
    // derselbe wie am Tisch.
    expect(skins.size).toBe(10);

    const shapeGone = jest.spyOn(THREE.BufferGeometry.prototype, 'dispose');
    const skinGone = jest.spyOn(THREE.Material.prototype, 'dispose');
    kit.dispose();
    expect(shapeGone).toHaveBeenCalledTimes(13);
    expect(skinGone).toHaveBeenCalledTimes(10);
    shapeGone.mockRestore();
    skinGone.mockRestore();
  });

  it('lässt das Licht der Spur von der Kopierfläche zur Kopie-Zone laufen', () => {
    const kit = new DeskKit();
    const copier = kit.copierPiece();
    // **Die Spur wird an ihren Farben gesucht und nicht an Netzstellen.** Seit
    // die beiden Spitzen einer Stelle zu einem Netz verschmolzen sind
    // (`kitchenMerge.ts`), sitzt jedes Netz auf dem Ursprung und trägt seine
    // Stelle in der Geometrie. Die Zusage ist dieselbe geblieben: fünf
    // Stellen, je eine eigene Farbe, je auf beiden Längsseiten.
    const marks = new Map<number, THREE.MeshStandardMaterial>();
    const lane: THREE.Mesh[] = [];
    copier.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const skin = mesh.material as THREE.MeshStandardMaterial;
      if (!skin.emissive || !/^lane:/.test(skin.name || '')) return;
      const hull = new THREE.Box3().setFromObject(mesh);
      if (hull.max.y >= COPIER_DECK) return;
      lane.push(mesh);
      marks.set(Math.round(((hull.min.x + hull.max.x) / 2) * 1000), skin);
    });
    // Fünf Stellen, von der Mitte der Kopierfläche bis zur Mitte der Zone —
    // die Spur fängt an, wo man hinlegt, und hört auf, wo man abholt.
    const at = [...marks.keys()].sort((a, b) => a - b);
    expect(at.length).toBe(5);
    expect(at[0] / 1000).toBeCloseTo(COPIER_PLATE[0], 6);
    expect(at[at.length - 1] / 1000).toBeCloseTo(COPIER_ZONE[0], 6);
    // Und die Spur liegt auf **beiden** Längsseiten: Das Netz einer Stelle
    // reicht von der einen über die Mitte zur anderen. Wer von hinten
    // davorsteht, liest dieselbe Richtung wie der, der vorn steht — und sieht
    // sie im selben Takt blinken, denn es ist dieselbe Farbe.
    expect(lane.length).toBe(5);
    for (const mesh of lane) {
      const hull = new THREE.Box3().setFromObject(mesh);
      expect(hull.min.z).toBeLessThan(-0.3);
      expect(hull.max.z).toBeGreaterThan(0.3);
    }

    // Das Licht steht zuerst auf der Spitze über der Kopierfläche …
    const brightest = (): number => {
      let best = at[0];
      for (const x of at) {
        if (marks.get(x)!.emissiveIntensity > marks.get(best)!.emissiveIntensity) best = x;
      }
      return best;
    };
    kit.update(0.001);
    expect(brightest()).toBe(at[0]);
    // … und wandert von dort zur Kopie-Zone, Spitze für Spitze.
    const seen: number[] = [];
    for (let i = 1; i < 5; i++) {
      kit.update(1.2 / 5);
      seen.push(brightest());
    }
    expect(seen).toEqual(at.slice(1));

    // Ein Bild ohne Zeit verstellt nichts, und Unsinn erst recht nicht.
    const before = at.map((x) => marks.get(x)!.emissiveIntensity);
    kit.update(0);
    kit.update(Number.NaN);
    expect(at.map((x) => marks.get(x)!.emissiveIntensity)).toEqual(before);
    kit.dispose();
  });

  it('ist nach `dispose` leer und lässt sich wieder füllen', () => {
    const kit = new DeskKit();
    const first = firstShape(kit.deskPiece());
    // Zweimal gebaut ist einmal gerechnet: Der zweite Tisch bekommt dieselbe
    // Form und nicht eine zweite gleich aussehende.
    expect(firstShape(kit.deskPiece())).toBe(first);

    kit.dispose();
    // Danach ist der Satz leer — die nächste Form ist eine neue und keine
    // freigegebene, die noch in der Karte hängt.
    expect(firstShape(kit.deskPiece())).not.toBe(first);
    // Und zweimal wegräumen ist kein Fehler.
    expect(() => {
      kit.dispose();
      kit.dispose();
    }).not.toThrow();
  });
});

/**
 * **Welche Hälfte des Kopierers gemeint ist** (`copierField`).
 *
 * Die Rechnung ist drei Zeilen lang und trotzdem die, bei der ein Umbau still
 * die Kopie auf die Vorlage legt: Sie hängt an der Drehung, und eine Drehung
 * prüft niemand im Kopf nach.
 */
describe('copierField — vor welchem Feld jemand steht', () => {
  const TURNS: readonly Turn[] = [0, 1, 2, 3];

  it('nennt die Hälfte, auf deren Feldmitte man zugeht', () => {
    for (const turn of TURNS) {
      const plate = copierSpot(COPIER_PLATE, turn);
      const zone = copierSpot(COPIER_ZONE, turn);
      expect(copierField(turn, plate.x, plate.z)).toBe('plate');
      expect(copierField(turn, zone.x, zone.z)).toBe('zone');
    }
  });

  /**
   * Der Fall, den man von Hand falsch abschreibt: Man steht **vor** dem Gerät
   * (also auf seiner Blickseite) und einen halben Meter zur Seite versetzt.
   */
  it('entscheidet auch von vorn und aus einem Schritt Abstand richtig', () => {
    for (const turn of TURNS) {
      const plate = copierSpot(COPIER_PLATE, turn);
      const zone = copierSpot(COPIER_ZONE, turn);
      // Einen Meter in Blickrichtung des Möbels vor die jeweilige Feldmitte.
      const ahead = copierSpot([0, -1], turn);
      expect(copierField(turn, plate.x + ahead.x, plate.z + ahead.z)).toBe('plate');
      expect(copierField(turn, zone.x + ahead.x, zone.z + ahead.z)).toBe('zone');
    }
  });

  it('gibt der Kopierfläche die Mitte, weil dort jede Benutzung anfängt', () => {
    for (const turn of TURNS) expect(copierField(turn, 0, 0)).toBe('plate');
  });

  it('kümmert sich nicht um die Entfernung, nur um die Seite', () => {
    for (const turn of TURNS) {
      const far = copierSpot(COPIER_ZONE, turn);
      expect(copierField(turn, far.x * 20, far.z * 20)).toBe('zone');
    }
  });
});

/**
 * **Der Katalog schreibt die Maße dieses Netzes ab** (`core/kitchenFit.ts`).
 *
 * Er muss es: Er kommt ohne three.js aus, und ein `import` von hier holte die
 * halbe Zone in einen Test, der nur Zahlen nachschlägt. Abgeschriebene Zahlen
 * laufen auseinander — also rechnet dieser Test sie einmal gegeneinander, an
 * der einen Stelle, an der beide Dateien ohnehin zusammenliegen.
 */
describe('was im Katalog über die beiden steht', () => {
  it('nennt für den Computer-Tisch dieselbe Höhe und dieselbe Platte', () => {
    const piece = kitchenPiece('desk');
    expect(piece).toBeDefined();
    expect(piece!.height).toBeCloseTo(DESK_HEIGHT, 6);
    expect(piece!.deck).toBeCloseTo(DESK_TOP, 6);
    expect(piece!.tiles).toEqual([1, 1]);
    expect(piece!.built).toBe(true);
    // Keine Ablage: Ohne `worktop` bekommt er keine Station, und genau das ist
    // gemeint — der Tisch hat eine Wirkung, und die sitzt am Bildschirm.
    expect(piece!.worktop).toBeUndefined();
  });

  it('nennt für den Kopierer dieselbe Höhe und dieselbe Feldhöhe', () => {
    const piece = kitchenPiece('copier');
    expect(piece).toBeDefined();
    expect(piece!.height).toBeCloseTo(COPIER_HEIGHT, 6);
    expect(piece!.deck).toBeCloseTo(COPIER_DECK, 6);
    expect(piece!.tiles).toEqual([2, 1]);
    expect(piece!.built).toBe(true);
    expect(piece!.worktop).toBeUndefined();
  });
});

/**
 * Die höchste waagerechte Fläche über einem Punkt des ungedrehten Möbels.
 *
 * **Aufgemaltes zählt nicht mit.** Zielrahmen, Bühnenleisten und die Spitzen
 * der Spur sind Zeichen auf dem Gerät und keine Fläche, auf die man etwas
 * legt — sie sagen das selbst (`denyShadow`, `kitchenDesk.copierPiece`). Seit
 * sie je Farbe zu einem Netz verschmolzen sind, umschließt ihre Hülle auch die
 * Mitte des Feldes, um das sie herumliegen; ohne diese Zeile meldete der Test
 * einen Millimeter Zielrahmen als Ablagefläche.
 */
function deckOver(model: THREE.Object3D, [x, z]: readonly [number, number]): number {
  let deck = 0;
  model.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || deniesShadow(mesh)) return;
    const box = new THREE.Box3().setFromObject(mesh);
    if (x < box.min.x || x > box.max.x || z < box.min.z || z > box.max.z) return;
    deck = Math.max(deck, box.max.y);
  });
  return deck;
}

/** Die Form des ersten Netzes eines Möbels — für die Frage, ob geteilt wird. */
function firstShape(model: THREE.Object3D): THREE.BufferGeometry {
  return (model.children[0] as THREE.Mesh).geometry;
}
