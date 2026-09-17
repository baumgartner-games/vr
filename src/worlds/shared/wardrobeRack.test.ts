import * as THREE from 'three';
import { DEFAULT_APPEARANCE, type Appearance } from '../../core/appearance';
import { BODY_KINDS, BODY_LABELS, HEAD_KINDS, HEAD_LABELS, HEAD_SUBS } from '../../core/avatarLook';
import { HEADGEAR_KINDS, HEADGEAR_LABELS, HEADGEAR_SUBS } from '../../core/headgear';
import { RACK_PIECE_MAX, RACK_PIECE_MIN, WardrobeRack, type RackPiece } from './wardrobeRack';

/**
 * **Das Regal, nachgemessen** (`worlds/shared/wardrobeRack.ts`).
 *
 * Drei Dinge kann man an einem Kleiderständer falsch machen, und alle drei
 * sieht man in der Brille erst, wenn man schon drinsteht: ein Stück, das im
 * Boden steckt oder darüber schwebt; ein Stück, das so groß ist, dass es ins
 * nächste Brett ragt; und ein Regal, das etwas anderes zeigt, als die Figur
 * anhat. Hier sind das drei Rechnungen über einen `Box3` und eine Liste.
 *
 * Kein WebGL und keine Leinwand: Gebaut werden Geometrien und Materialien,
 * gezeichnet wird nichts (`core/chefStyle.chefChecker` kommt ohne `document`
 * aus und liefert dann eine leere Textur).
 */

const OUTFITS: Array<[string, Appearance]> = [
  ['die Auslieferung', DEFAULT_APPEARANCE],
  ['barhäuptig, aber gestreift', { hat: 'none', head: 'moustache', body: 'striped' }],
  ['Krone und Vollbart', { hat: 'crown', head: 'beard', body: 'red' }],
  ['Kochmütze zur blauen Jacke', { hat: 'chef', head: 'freckles', body: 'blue' }],
];

/** Der Kasten um ein Stück, mit aufgefrischten Weltmatrizen. */
function boxOf(piece: RackPiece): THREE.Box3 {
  piece.object.updateWorldMatrix(true, true);
  return new THREE.Box3().setFromObject(piece.object);
}

describe('was auf dem Regal steht', () => {
  it('zeigt jedes Stück genau einmal, in der Reihenfolge des Menüs', () => {
    const rack = new WardrobeRack();
    const pieces = rack.pieces(DEFAULT_APPEARANCE);

    expect(pieces).toHaveLength(HEAD_KINDS.length + HEADGEAR_KINDS.length + BODY_KINDS.length);
    // Gesicht, Hut, Oberteil — abgeschrieben von `ui/wardrobeRows.ts`, und
    // genau deshalb steht es hier noch einmal: Wer die eine Reihenfolge
    // ändert, soll über die andere stolpern.
    expect(pieces.map((piece) => piece.slot)).toEqual([
      ...HEAD_KINDS.map(() => 'head'),
      ...HEADGEAR_KINDS.map(() => 'hat'),
      ...BODY_KINDS.map(() => 'body'),
    ]);
    expect(pieces.map((piece) => piece.value)).toEqual([
      ...HEAD_KINDS,
      ...HEADGEAR_KINDS,
      ...BODY_KINDS,
    ]);

    // Nichts doppelt: Zwei Bretter mit derselben Mütze wären zwei Knöpfe, von
    // denen einer nichts tut.
    const seen = new Set(pieces.map((piece) => `${piece.slot}/${piece.value}`));
    expect(seen.size).toBe(pieces.length);
    rack.dispose();
  });

  it('nimmt Namen und Zeile aus den Katalogen und erfindet keine', () => {
    const rack = new WardrobeRack();
    for (const piece of rack.pieces(DEFAULT_APPEARANCE)) {
      if (piece.slot === 'head') {
        expect(HEAD_KINDS).toContain(piece.value);
        expect(piece.label).toBe(HEAD_LABELS[piece.value as (typeof HEAD_KINDS)[number]]);
        expect(piece.sub).toBe(HEAD_SUBS[piece.value as (typeof HEAD_KINDS)[number]]);
      } else if (piece.slot === 'hat') {
        expect(HEADGEAR_KINDS).toContain(piece.value);
        expect(piece.label).toBe(HEADGEAR_LABELS[piece.value as (typeof HEADGEAR_KINDS)[number]]);
        expect(piece.sub).toBe(HEADGEAR_SUBS[piece.value as (typeof HEADGEAR_KINDS)[number]]);
      } else {
        expect(BODY_KINDS).toContain(piece.value);
        expect(piece.label).toBe(BODY_LABELS[piece.value as (typeof BODY_KINDS)[number]]);
        // Beim Oberteil bleibt die Zeile leer — die Jacke steht ja da.
        expect(piece.sub).toBe('');
      }
    }
    rack.dispose();
  });
});

describe('was die Figur anhat', () => {
  it.each(OUTFITS)('markiert bei %s genau ein Stück je Fach', (_name, look) => {
    const rack = new WardrobeRack();
    const worn = rack.pieces(look).filter((piece) => piece.worn);

    expect(worn).toHaveLength(3);
    expect(worn.map((piece) => [piece.slot, piece.value])).toEqual([
      ['head', look.head],
      ['hat', look.hat],
      ['body', look.body],
    ]);
    rack.dispose();
  });

  it('legt dem Getragenen einen Reif unter und sonst niemandem', () => {
    // `RackPiece.worn` ist die Auskunft für den Aufrufer; der Reif ist die für
    // den Spieler. Beide müssen dasselbe sagen, sonst steht man vor einem
    // Regal und probiert aus, was man schon anhat.
    const rack = new WardrobeRack();
    for (const piece of rack.pieces({ hat: 'tophat', head: 'beard', body: 'green' })) {
      let rings = 0;
      piece.object.traverse((child) => {
        if (child.name === 'rack-worn') rings++;
      });
      expect(rings).toBe(piece.worn ? 1 : 0);
    }
    rack.dispose();
  });

  it('zieht den Reif mit, wenn sich das Aussehen ändert', () => {
    const rack = new WardrobeRack();
    const before = rack.pieces({ hat: 'none', head: 'round', body: 'white' });
    const after = rack.pieces({ hat: 'cap', head: 'round', body: 'white' });
    const hats = (pieces: RackPiece[]): string[] =>
      pieces.filter((piece) => piece.slot === 'hat' && piece.worn).map((piece) => piece.value);
    expect(hats(before)).toEqual(['none']);
    expect(hats(after)).toEqual(['cap']);
    rack.dispose();
  });
});

describe('wie ein Stück auf dem Brett steht', () => {
  it('setzt jedem Stück den Ursprung unten in seine Mitte', () => {
    const rack = new WardrobeRack();
    for (const outfit of OUTFITS) {
      for (const piece of rack.pieces(outfit[1])) {
        const box = boxOf(piece);
        // Der Name steht im erwarteten Wert, damit ein Fehlschlag sagt,
        // **welches** der siebzehn Stücke schief steht.
        const where = `${piece.slot}/${piece.value}`;
        // Auf dem Brett und nicht darin: `construct.ts` setzt die Gruppe auf
        // die Ablage, ohne ein einziges Stück zu kennen.
        expect([where, Math.abs(box.min.y) < 1e-6]).toEqual([where, true]);
        expect([where, Math.abs(box.min.x + box.max.x) < 1e-6]).toEqual([where, true]);
        expect([where, Math.abs(box.min.z + box.max.z) < 1e-6]).toEqual([where, true]);
      }
    }
    rack.dispose();
  });

  it('hält jedes Stück handgroß', () => {
    const rack = new WardrobeRack();
    for (const outfit of OUTFITS) {
      for (const piece of rack.pieces(outfit[1])) {
        const size = boxOf(piece).getSize(new THREE.Vector3());
        const span = Math.max(size.x, size.y, size.z);
        // Ein Gegenstand auf einer Ablage — kein Knopf und kein abgetrenntes
        // Stück Avatar in Lebensgröße.
        const where = `${piece.slot}/${piece.value} misst ${span.toFixed(3)} m`;
        expect([where, span >= RACK_PIECE_MIN, span <= RACK_PIECE_MAX]).toEqual([
          where,
          true,
          true,
        ]);
      }
    }
    rack.dispose();
  });

  it('macht aus „Ohne" ein Ding und kein Loch', () => {
    // `buildHeadgear('none')` gibt `null`. Eine Möglichkeit, die man nicht
    // sieht, kann man auch nicht anfassen — und ausgerechnet die Auslieferung
    // wäre dann das leere Brett, auf dem niemand einen Strahl abstellt.
    const rack = new WardrobeRack();
    const none = rack.pieces(DEFAULT_APPEARANCE).find((piece) => piece.value === 'none')!;
    expect(none.slot).toBe('hat');

    let meshes = 0;
    none.object.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) meshes++;
    });
    // Pfosten, Knauf, Fuß — und weil `none` hier getragen wird, der Reif.
    expect(meshes).toBeGreaterThanOrEqual(3);
    const size = boxOf(none).getSize(new THREE.Vector3());
    expect(Math.max(size.x, size.y, size.z)).toBeGreaterThanOrEqual(RACK_PIECE_MIN);
    rack.dispose();
  });
});

describe('was der Bausatz teilt und wieder hergibt', () => {
  it('gibt bei jedem Aufruf frische Stücke heraus', () => {
    // Das Regal wird nach jedem Anziehen neu gebaut; zwei Aufrufe dürfen sich
    // deshalb kein einziges Netz teilen, sonst hinge dasselbe Ding an zwei
    // Brettern.
    const rack = new WardrobeRack();
    const first = rack.pieces(DEFAULT_APPEARANCE);
    const second = rack.pieces(DEFAULT_APPEARANCE);
    expect(second).toHaveLength(first.length);
    for (let i = 0; i < first.length; i++) {
      expect(second[i]!.value).toBe(first[i]!.value);
      expect(second[i]!.object).not.toBe(first[i]!.object);
    }
    rack.dispose();
  });

  it('dreht den Fuß einmal und stellt alle siebzehn Stücke darauf', () => {
    const rack = new WardrobeRack();
    const feet = new Set<THREE.BufferGeometry>();
    for (let i = 0; i < 3; i++) {
      for (const piece of rack.pieces(DEFAULT_APPEARANCE)) {
        piece.object.traverse((child) => {
          if (child.name === 'rack-foot') feet.add((child as THREE.Mesh).geometry);
        });
      }
    }
    // Eine Scheibe für alle, über alle Aufrufe hinweg.
    expect(feet.size).toBe(1);
    rack.dispose();
  });

  it('gibt seine Formen und Farben frei und füllt sich danach wieder', () => {
    const rack = new WardrobeRack();
    rack.pieces(DEFAULT_APPEARANCE);

    const shapeGone = jest.spyOn(THREE.BufferGeometry.prototype, 'dispose');
    const skinGone = jest.spyOn(THREE.Material.prototype, 'dispose');
    rack.dispose();
    // Vier Formen: Fuß, Reif, Pfosten und Knauf des leeren Ständers.
    expect(shapeGone).toHaveBeenCalledTimes(4);
    // Dreizehn Farben: das dunkle Holz der Füße, der warme Reif, das Holz des
    // Ständers — dazu je Jacke ihr Halstuch (`bodyTrim`) und ihr Fuß
    // (`bodyJacket`), also zweimal fünf.
    expect(skinGone).toHaveBeenCalledTimes(13);

    // Danach ist der Bausatz leer: Der nächste Aufruf baut alles noch einmal,
    // und das zweite `dispose` gibt genauso viel her wie das erste.
    shapeGone.mockClear();
    skinGone.mockClear();
    rack.pieces(DEFAULT_APPEARANCE);
    rack.dispose();
    expect(shapeGone).toHaveBeenCalledTimes(4);
    expect(skinGone).toHaveBeenCalledTimes(13);

    // Und ein drittes, auf dem leeren Bausatz, tut gar nichts.
    shapeGone.mockClear();
    skinGone.mockClear();
    expect(() => rack.dispose()).not.toThrow();
    expect(shapeGone).not.toHaveBeenCalled();
    expect(skinGone).not.toHaveBeenCalled();
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});
