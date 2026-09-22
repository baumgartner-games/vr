import * as THREE from 'three';
import { DIR_N } from '../../nav/navTile';
import { usableShows } from '../../../core/usable';
import type { FixtureBuild, FixtureInput, FixturePlacement, Props } from './index';
import { KAYKIT_SCALE } from '../../../core/kaykitFit';
import { LAMP, dressLamp, lampFit, lampHeight, type LampState, type LampView } from './lamp';

function light(props: Props = {}): FixturePlacement {
  return { id: 'lampe-1', kind: 'lamp', x: 2, z: 2, dir: DIR_N, level: 0, props };
}

const NOTHING: FixtureInput = {
  used: false,
  hit: false,
  weightOn: 0,
  playerOn: false,
  triggered: false,
};

describe('Die Lampe', () => {
  it('brennt, bis jemand sie ausmacht', () => {
    const at = light();
    const state: LampState = LAMP.init(at);
    expect(state.on).toBe(true);

    expect(LAMP.step(state, at, { ...NOTHING, triggered: true }, 0.016)).toEqual([
      { type: 'sound', name: 'switch-off' },
    ]);
    expect(state.on).toBe(false);

    LAMP.step(state, at, { ...NOTHING, triggered: true }, 0.016);
    expect(state.on).toBe(true);
  });

  it('fängt aus an, wenn die Welt es so will', () => {
    expect(LAMP.init(light({ on: false })).on).toBe(false);
  });

  it('hängt so hoch, wie es dasteht — und nie unter dem Boden', () => {
    expect(lampHeight(light({ height: 3.4 }))).toBeCloseTo(3.4);
    expect(lampHeight(light({ height: -2 }))).toBeGreaterThan(0);
    expect(lampHeight(light())).toBeGreaterThan(2);
  });

  it('gibt weiter, worauf sie zeigt — eine Lampe darf einen Schalter haben', () => {
    const at = light({ target: 'lampe-2' });
    expect(LAMP.step(LAMP.init(at), at, { ...NOTHING, used: true }, 0.016)).toEqual([
      { type: 'sound', name: 'switch-off' },
      { type: 'trigger', target: 'lampe-2' },
    ]);
  });

  it('steht frei auf der Kachel und hält niemanden auf', () => {
    expect(LAMP.edge).toBe(false);
    expect(LAMP.solid(LAMP.init(light()))).toBe(false);
  });

  /**
   * **Die Umrechnung auf die Zielhöhe** — der einzige Teil des Regal-Einbaus,
   * der sich ohne WebGL prüfen lässt, und deshalb der einzige, der als eigene
   * Funktion dasteht (`lampFit`).
   *
   * Gerechnet wird hier mit der Zahl, die am Modell **gemessen** wird, und
   * nicht mit einer, die in der Lampe steht: Der Test schreibt sie einmal auf
   * (`holiday-bits/lantern.glb` ist 3,938 Quelleinheiten hoch), damit die
   * Division an einem bekannten Fall nachvollziehbar ist — im Betrieb kommt
   * sie aus `THREE.Box3`.
   */
  describe('wird auf ihre Höhe gebracht', () => {
    /** Die Höhe der Laterne aus dem Regal, in Metern (Quelle × Paketmaßstab). */
    const LANTERN = 3.938 * KAYKIT_SCALE;

    it('macht aus 1,97 m genau die Höhe, die dasteht', () => {
      expect(LANTERN * lampFit(LANTERN, 2.8)).toBeCloseTo(2.8);
      expect(LANTERN * lampFit(LANTERN, 3.2)).toBeCloseTo(3.2);
      // Und die Vorgabe der beiden Lampen in der Testwelt: 3,2 m auf 1,969 m
      // ist gut das Anderthalbfache — die Laterne wächst, sie schrumpft nicht.
      expect(lampFit(LANTERN, 3.2)).toBeGreaterThan(1);
    });

    it('lässt ein Modell in Ruhe, das gar keine Höhe hat', () => {
      // Eine Datei, aus der kein Netz kam: `Box3` ist leer, und eine Division
      // durch null wäre eine Laterne von unendlicher Größe.
      expect(lampFit(0, 2.8)).toBe(1);
      expect(lampFit(-1, 2.8)).toBe(1);
      expect(lampFit(LANTERN, 0)).toBe(1);
    });
  });
});

/**
 * **Was angemeldet ist, muss man sehen können** — dieselbe Regel wie beim
 * Hebel (`lever.test.ts`), hier in ihrer leiseren Form.
 *
 * Die Lampe war nie unbenutzbar: Ihr Griff ist ein **leerer** Knoten am
 * Mastfuß, und der ist sichtbar. Nur hat ein leerer Knoten kein Netz, und
 * `core/highlight.ts` baut seine Hülle aus Netzen — nachgesehen und
 * bestätigt: Findet es keines, legt es statt dessen einen Ring auf den Boden
 * (`Highlight.showRing`), und zwar einen von Mindestmaß, denn ein Punkt hat
 * keine Ausdehnung. Die Auskunft war also da, aber sie war die schwächere:
 * „hier ungefähr" statt „diese Laterne".
 *
 * Sobald die Datei da ist, zieht der Griff deshalb auf die Laterne um. Ohne
 * WebGL gibt es keine Datei — ein Baum aus Knoten tut es auch.
 */
describe('Die Lampe, wenn ihre Laterne eintrifft', () => {
  function stage(): { ctx: FixtureBuild; group: THREE.Group; usables: THREE.Object3D[] } {
    const group = new THREE.Group();
    const skin = new THREE.MeshStandardMaterial();
    const usables: THREE.Object3D[] = [];
    const ctx: FixtureBuild = {
      group,
      at: { x: 2.5, y: 0, z: 2.5 },
      material: () => skin,
      notify: () => {},
      // Dieselben vier Zeilen wie in `GridWorld.rehandle`: abmelden, anmelden,
      // `view.handle` mitschreiben — sonst bleibt bei jedem Umbau ein Eintrag
      // in der Liste der Welt liegen.
      rehandle: (view, object) => {
        if (!object) return;
        const old = view.handle ?? view.object;
        const seat = old ? usables.indexOf(old) : -1;
        if (seat >= 0) usables.splice(seat, 1);
        view.handle = object;
        usables.push(object);
      },
    };
    return { ctx, group, usables };
  }

  /**
   * **Die Laterne, nachgebaut in Quelleinheiten** — 0,991 × 3,938 × 0,905, der
   * Maßstab des Pakets (0,5) auf der Wurzel, und der Leuchtkasten oben als
   * eigenes Netz mit dem Material, das die Datei `holiday_glow` nennt.
   */
  function fakeLantern(): THREE.Object3D {
    const model = new THREE.Group();
    model.scale.setScalar(KAYKIT_SCALE);
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.991, 3.938, 0.905),
      new THREE.MeshStandardMaterial({ name: 'holiday' }),
    );
    body.name = 'lantern';
    body.position.y = 1.969;
    model.add(body);
    const glow = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.342, 0.6),
      new THREE.MeshStandardMaterial({ name: 'holiday_glow' }),
    );
    glow.position.y = 3.336;
    model.add(glow);
    return model;
  }

  it('reicht den Griff nach — und es ist ein sichtbares Netz', () => {
    const { ctx, group, usables } = stage();
    const view = LAMP.build(light(), ctx) as LampView;
    const fixture = group.children[0] as THREE.Group;
    // Was `GridWorld.attachUsable` direkt nach dem Bauen anmeldet: der leere
    // Stellvertreter. Er ist sichtbar — aber er hat kein Netz.
    const empty = view.handle!;
    usables.push(empty);
    expect(usableShows(empty)).toBe(true);
    expect(empty.children).toHaveLength(0);

    dressLamp(view, fakeLantern(), ctx, fixture, lampHeight(light()), empty.position.z);

    expect(usables).toHaveLength(1);
    expect(view.handle).toBe(usables[0]);
    expect(view.handle).not.toBe(empty);
    expect(usableShows(view.handle!)).toBe(true);
    // Und diesmal ist etwas da, um das sich ein Saum legen kann.
    let meshes = 0;
    view.handle!.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) meshes++;
    });
    expect(meshes).toBeGreaterThan(0);

    view.dispose?.();
  });

  it('stellt die Laterne dorthin, wo der Stellvertreter stand', () => {
    const { ctx, group } = stage();
    const view = LAMP.build(light(), ctx) as LampView;
    const fixture = group.children[0] as THREE.Group;
    const empty = view.handle!;
    fixture.updateMatrixWorld(true);
    const before = empty.getWorldPosition(new THREE.Vector3());

    dressLamp(view, fakeLantern(), ctx, fixture, lampHeight(light()), empty.position.z);
    fixture.updateMatrixWorld(true);
    const after = view.handle!.getWorldPosition(new THREE.Vector3());

    // Waagerecht derselbe Punkt: `core/usable.pickUsable` liest nur x und z,
    // und die Reichweite bleibt damit dieselbe wie vorher.
    expect(after.x).toBeCloseTo(before.x, 6);
    expect(after.z).toBeCloseTo(before.z, 6);

    view.dispose?.();
  });

  /**
   * **Das Licht sitzt im Kasten der Laterne**, nicht an der Mastspitze — die
   * zweite Sache, die `dressLamp` am geladenen Netz misst. Geprüft wird nicht
   * die Zahl, sondern die Aussage: Es rückt dorthin, wo `holiday_glow` liegt,
   * und das ist oben, aber unter der Spitze.
   */
  it('setzt das Licht in den Leuchtkasten', () => {
    const { ctx, group } = stage();
    const at = light({ height: 2.8 });
    const view = LAMP.build(at, ctx) as LampView;
    const fixture = group.children[0] as THREE.Group;
    const foot = view.handle!.position.z;

    dressLamp(view, fakeLantern(), ctx, fixture, lampHeight(at), foot);

    expect(view.light.position.y).toBeGreaterThan(2);
    expect(view.light.position.y).toBeLessThan(2.8);
    expect(view.light.position.z).toBeCloseTo(foot, 9);
    expect(view.glow.length).toBeGreaterThan(0);

    view.dispose?.();
  });
});
