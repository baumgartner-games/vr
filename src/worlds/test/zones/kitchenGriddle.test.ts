import * as THREE from 'three';
import { kitchenDeck, kitchenPiece } from '../../../core/kitchenFit';
import { GRIDDLE_DECK, GRIDDLE_HEIGHT, GriddleKit } from './kitchenGriddle';
import { WORK_ALONE, WORK_SECONDS, advanceWork, onWork, workStage } from './kitchenWork';
import { BURN_SECONDS, FRY_SECONDS, advanceStove, onStove } from './kitchenClock';
import { dish, fryStage } from './kitchenRecipes';
import { kitchenDeed, kitchenPrompt } from './kitchenCarry';
import { beltDelivers, beltReleases } from './kitchenBelt';

/**
 * **Was die sichere Kochstelle verspricht** (`kitchenGriddle.ts`).
 *
 * Zwei Sätze, und der zweite ist der, um dessentwillen es das Möbel gibt:
 *
 * - **Sie brät ohne jemanden davor** — wie der Mixer hackt
 *   (`kitchenWork.WORK_ALONE`).
 * - **Und sie hört danach auf.** Am Herd folgt auf das Gebratene das
 *   Verbrannte und darauf das Feuer (`kitchenClock.ts`); hier folgt nichts.
 *   Das ist kein Detail, sondern die Bedingung dafür, dass eine Bandstraße
 *   überhaupt braten darf: Eine Kette kommt nicht zurück, um die Pfanne vom
 *   Feuer zu nehmen.
 *
 * Dazu die Maße gegen den Katalog — das Möbel wird gebaut und nicht geladen,
 * es gibt also keine Datei, die beide Seiten zusammenhält.
 */

describe('die sichere Kochstelle brät allein', () => {
  it('macht aus einem rohen Patty ein gebratenes, ohne dass jemand danebensteht', () => {
    let state = onWork('fry', 'patty');
    expect(state.working).toBe(true);

    // `near: false` ist genau der Fall „die Figur ist drei Kacheln weiter".
    const half = advanceWork(state, WORK_SECONDS.fry / 2, false);
    state = half.state;
    expect(state.working).toBe(true);

    const done = advanceWork(state, WORK_SECONDS.fry, false);
    expect(done.done).toBe('patty-cooked');
    // Und es bleibt liegen, damit ein Filterband es abholen kann.
    expect(done.toHand).toBe(false);
    expect(done.state.item).toBe('patty-cooked');
  });

  it('brät ein zweites Mal nichts mehr — hier verbrennt nichts', () => {
    // **Der ganze Unterschied zum Herd, in drei Zeilen.** Dort ist die nächste
    // Stufe das Verbrannte (`kitchenRecipes.FRIES`), hier gibt es keine.
    expect(fryStage('patty-cooked')).toBe('patty-burnt');
    expect(workStage('fry', 'patty-cooked')).toBeNull();
    expect(onWork('fry', 'patty-cooked').working).toBe(false);

    // Und selbst eine Ewigkeit ändert daran nichts.
    const idle = advanceWork(onWork('fry', 'patty-cooked'), WORK_SECONDS.fry * 100, false);
    expect(idle.done).toBeNull();
  });

  it('ist die Gegenprobe zum Herd, der genau das tut', () => {
    // Damit der Satz oben nicht nur eine Behauptung über diese Datei ist:
    // Derselbe Zeitraum am **Herd** liefert ein verbranntes Patty.
    const cooked = advanceStove(onStove('patty'), FRY_SECONDS);
    expect(cooked.turned).toBe('patty-cooked');
    const burnt = advanceStove(cooked.state, BURN_SECONDS);
    expect(burnt.turned).toBe('patty-burnt');
    // Dieselbe Zeit auf der Kochstelle lässt es gebraten liegen.
    const safe = advanceWork(onWork('fry', 'patty'), FRY_SECONDS + BURN_SECONDS, false);
    expect(safe.done).toBe('patty-cooked');
  });

  it('kostet eine Sekunde mehr als die Pfanne', () => {
    // Der Preis für die Sicherheit — sonst gäbe es keinen Grund mehr, jemals
    // die Pfanne zu benutzen, und die ist das Herzstück dieser Küche.
    expect(WORK_SECONDS.fry).toBeGreaterThan(FRY_SECONDS);
    expect(WORK_ALONE.fry).toBe(true);
  });

  it('nimmt nur, was sich braten lässt', () => {
    for (const item of ['bun', 'lettuce', 'tomato-cut', 'plate', 'patty-cooked'] as const) {
      expect({ item, stage: workStage('fry', item) }).toEqual({ item, stage: null });
    }
    expect(workStage('fry', 'patty')).toBe('patty-cooked');
  });
});

describe('was `A` und die Bänder an der Kochstelle tun', () => {
  it('legt hin und fängt sofort an — ohne zweiten Druck', () => {
    const deed = kitchenDeed(dish('patty'), { kind: 'griddle' });
    expect(deed).toEqual({ do: 'work', kind: 'fry', dish: dish('patty') });
    expect(kitchenPrompt(deed, 'Sichere Kochstelle')).toBe('Rohes Patty braten');
  });

  it('ist sonst eine Ablage wie jede andere', () => {
    expect(kitchenDeed(dish('plate'), { kind: 'griddle' })).toEqual({
      do: 'place',
      dish: dish('plate'),
    });
    expect(kitchenDeed(null, { kind: 'griddle', on: dish('patty-cooked') })).toEqual({
      do: 'take',
      dish: dish('patty-cooked'),
    });
    expect(kitchenDeed(null, { kind: 'griddle' })).toEqual({ do: 'nothing' });
  });

  it('lässt ein Band hinschieben und ein anderes abholen', () => {
    // **Das ist der Grund, warum sie keine Pfanne trägt.** Auf dem Herd steht
    // die Pfanne, die Kachel ist belegt, und ein Band liefert dort nie ab;
    // hier ist die Platte frei. Und heraus darf es auch — anders als vom Herd,
    // wo ein Band sonst die einzige Pfanne der Küche mitnähme.
    expect(beltDelivers('griddle')).toBe(true);
    expect(beltReleases('griddle')).toBe(true);
    expect(beltReleases('stove')).toBe(false);
    // Solange sie brät, gibt sie nichts her — sonst führe ein halb gebratenes
    // Patty auf das Brötchen.
    expect(beltReleases('griddle', true)).toBe(false);
  });
});

describe('GriddleKit — das Möbel', () => {
  it('baut eine Kochstelle ohne Leinwand und räumt sie wieder weg', () => {
    const kit = new GriddleKit();
    const piece = kit.piece();
    expect(piece.name).toBe('kitchen-griddle');
    kit.dispose();
    kit.dispose();
  });

  it('teilt Formen und Farben zwischen zwei Kochstellen', () => {
    const kit = new GriddleKit();
    const seen = (piece: THREE.Object3D): unknown[] => {
      const out: unknown[] = [];
      piece.traverse((node) => {
        if (node instanceof THREE.Mesh) out.push(node.geometry, node.material);
      });
      return out;
    };
    const a = seen(kit.piece());
    const b = seen(kit.piece());
    expect(a.length).toBe(b.length);
    for (let i = 0; i < a.length; i++) expect(a[i]).toBe(b[i]);
    kit.dispose();
  });

  it('hält sich an die Maße des Katalogs', () => {
    const piece = kitchenPiece('griddle')!;
    expect(GRIDDLE_HEIGHT).toBe(piece.height);
    expect(GRIDDLE_DECK).toBe(kitchenDeck(piece));
    // **Auf ihr steht nichts**, also ist die Ablage die Oberkante — anders als
    // beim Herd mit Topf, wo `height` die Oberkante des Topfes ist.
    expect(GRIDDLE_DECK).toBe(GRIDDLE_HEIGHT);
    // Und sie läuft auf der Höhe der Herde, damit eine Reihe eine Reihe bleibt.
    expect(GRIDDLE_HEIGHT).toBe(kitchenPiece('stove')!.height);
  });

  it('bleibt in ihrer Kachel und unter der Ablagehöhe', () => {
    const kit = new GriddleKit();
    const box = new THREE.Box3().setFromObject(kit.piece());
    expect(box.max.x).toBeLessThanOrEqual(0.5 + 1e-6);
    expect(box.min.x).toBeGreaterThanOrEqual(-0.5 - 1e-6);
    expect(box.max.z).toBeLessThanOrEqual(0.5 + 1e-6);
    expect(box.min.z).toBeGreaterThanOrEqual(-0.5 - 1e-6);
    // Die Kochplatte liegt flach: Die Hülle endet knapp über der Ablage und
    // nicht darüber — ein Patty, das darauf kommt, steht nicht in der Luft.
    expect(box.max.y).toBeGreaterThanOrEqual(GRIDDLE_DECK);
    expect(box.max.y).toBeLessThan(GRIDDLE_DECK + 0.01);
    expect(box.min.y).toBeCloseTo(0, 6);
  });
});
