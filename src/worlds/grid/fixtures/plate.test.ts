import * as THREE from 'three';
import { DIR_N } from '../../nav/navTile';
import type { FixtureBuild, FixtureInput, FixturePlacement, Props } from './index';
import { PLATE, type PlateState } from './plate';

function pad(props: Props = { target: 'tuer-3' }): FixturePlacement {
  return { id: 'platte-1', kind: 'plate', x: 3, z: 5, dir: DIR_N, level: 0, props };
}

const NOTHING: FixtureInput = {
  used: false,
  hit: false,
  weightOn: 0,
  playerOn: false,
  triggered: false,
};

describe('Die Druckplatte', () => {
  /**
   * **Sie löst in jedem Bild neu aus**, in dem etwas auf ihr steht — nicht nur
   * beim Betreten. Nur so setzt die Tür dahinter ihre Uhr zurück und fällt
   * anderthalb Sekunden nach dem *Verlassen* zu statt unter dem, der in ihr
   * steht.
   */
  it('drückt, solange Gewicht darauf liegt', () => {
    const at = pad();
    const state: PlateState = PLATE.init(at);
    expect(state.down).toBe(false);
    expect(PLATE.step(state, at, NOTHING, 0.016)).toEqual([]);

    expect(PLATE.step(state, at, { ...NOTHING, weightOn: 1 }, 0.016)).toEqual([
      { type: 'sound', name: 'pop' },
      { type: 'trigger', target: 'tuer-3' },
    ]);
    expect(state.down).toBe(true);

    // Danach: kein zweites Geräusch, aber jedes Bild ein Auslösen.
    expect(PLATE.step(state, at, { ...NOTHING, weightOn: 1 }, 0.016)).toEqual([
      { type: 'trigger', target: 'tuer-3' },
    ]);
  });

  /**
   * Eine **Zahl** und kein Schalter: Zwei Kisten darauf sind zwei, und wer eine
   * davon wegnimmt, hat immer noch eine.
   */
  it('bleibt gedrückt, solange noch etwas darauf steht', () => {
    const at = pad();
    const state = PLATE.init(at);
    PLATE.step(state, at, { ...NOTHING, weightOn: 2 }, 0.016);
    PLATE.step(state, at, { ...NOTHING, weightOn: 1 }, 0.016);
    expect(state.down).toBe(true);

    expect(PLATE.step(state, at, NOTHING, 0.016)).toEqual([{ type: 'sound', name: 'switch-off' }]);
    expect(state.down).toBe(false);
  });

  it('kümmert sich nicht darum, ob jemand sie benutzt', () => {
    const at = pad();
    const state = PLATE.init(at);
    expect(PLATE.step(state, at, { ...NOTHING, used: true, hit: true }, 0.016)).toEqual([]);
    expect(state.down).toBe(false);
  });

  it('liegt im Boden und hält niemanden auf — sonst wäre sie keine Platte', () => {
    expect(PLATE.solid(PLATE.init(pad()))).toBe(false);
    expect(PLATE.edge).toBe(false);
  });

  /**
   * **Die gerechnete Platte steht sofort da** — und sie steht auch dann da,
   * wenn es das KayKit-Regal gar nicht gibt.
   *
   * Seit die Platte ihr Bild aus dem Regal holen darf
   * (`plate.PLATE_MODEL`), hängt an ihr eine Datei, die über die Leitung
   * kommt. Genau das ist die Stelle, an der ein Auslöser still kaputtgehen
   * kann: Ein Bild, das erst mit dem Modell entsteht, fehlt in einem Checkout
   * ohne die gekauften Pakete für immer — und eine Tür, die an einer Platte
   * hängt, die niemand sieht, ist eine Tür ohne Grund.
   *
   * In Jest gibt es kein WebGL (`core/chefFit.canLoadModels`), also wird hier
   * nichts geladen; geprüft wird deshalb genau der Ausgang, den auch der
   * leere Checkout nimmt — Ring und Scheibe sind da, sie sind sichtbar, und
   * die Scheibe taucht beim Drücken ein.
   */
  it('zeigt die gebaute Scheibe, solange kein Modell da ist', () => {
    const group = new THREE.Group();
    const skin = new THREE.MeshStandardMaterial();
    const ctx: FixtureBuild = {
      group,
      at: { x: 3.5, y: 0, z: 5.5 },
      material: () => skin,
      notify: () => {},
      // **Die Platte reicht keinen Griff nach**, und sie braucht es auch
      // nicht: Angemeldet ist ihre Gruppe, und in der steht immer ein
      // sichtbares Netz — erst die gebaute Scheibe, später das Modell
      // (`core/usable.usableShows`).
      rehandle: () => {},
    };
    const view = PLATE.build(pad(), ctx);
    const plate = view.object!;
    const discs = plate.children.filter(
      (child): child is THREE.Mesh => (child as THREE.Mesh).isMesh,
    );
    expect(discs).toHaveLength(2);
    expect(discs.every((mesh) => mesh.visible)).toBe(true);

    // Die tiefste der beiden ist der Ring, die höhere die Scheibe: nur sie
    // bewegt sich.
    const disc = discs.reduce((a, b) => (a.position.y > b.position.y ? a : b));
    const rest = disc.position.y;
    PLATE.apply(view, { down: true });
    expect(disc.position.y).toBeLessThan(rest);
    PLATE.apply(view, { down: false });
    expect(disc.position.y).toBeCloseTo(rest);

    view.dispose?.();
  });
});
