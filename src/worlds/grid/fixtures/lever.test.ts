import * as THREE from 'three';
import { DIR_E, DIR_N } from '../../nav/navTile';
import { usableShows } from '../../../core/usable';
import type { FixtureBuild, FixtureInput, FixturePlacement, Props } from './index';
import { COLUMN_H, LEVER, dressLever, leverFit, type LeverState, type LeverView } from './lever';

function bar(props: Props = { target: 'tuer-2' }): FixturePlacement {
  return { id: 'hebel-1', kind: 'lever', x: 0, z: 0, dir: DIR_E, level: 0, props };
}

const NOTHING: FixtureInput = {
  used: false,
  hit: false,
  weightOn: 0,
  playerOn: false,
  triggered: false,
};

describe('Der Hebel', () => {
  /**
   * **Er rastet** — das ist der ganze Unterschied zum Knopf. Auf bleibt auf,
   * und man sieht es ihm über den halben Platz hinweg an.
   */
  it('bleibt liegen, wo man ihn hinlegt', () => {
    const at = bar();
    const state: LeverState = LEVER.init(at);
    expect(state.on).toBe(false);

    expect(LEVER.step(state, at, { ...NOTHING, used: true }, 0.016)).toEqual([
      { type: 'sound', name: 'switch-on' },
      { type: 'trigger', target: 'tuer-2' },
    ]);
    expect(state.on).toBe(true);

    // Zwanzig ruhige Bilder später steht er immer noch so.
    for (let i = 0; i < 20; i++) expect(LEVER.step(state, at, NOTHING, 0.016)).toEqual([]);
    expect(state.on).toBe(true);

    expect(LEVER.step(state, at, { ...NOTHING, used: true }, 0.016)).toEqual([
      { type: 'sound', name: 'switch-off' },
      { type: 'trigger', target: 'tuer-2' },
    ]);
    expect(state.on).toBe(false);
  });

  it('lässt sich auch aus der Ferne schalten — ein Hebel am Hebel', () => {
    const at = bar();
    const state = LEVER.init(at);
    LEVER.step(state, at, { ...NOTHING, triggered: true }, 0.016);
    expect(state.on).toBe(true);
  });

  it('fängt dort an, wo die Welt ihn hinstellt', () => {
    expect(LEVER.init(bar({ on: true })).on).toBe(true);
    expect(LEVER.init(bar()).on).toBe(false);
  });

  it('steht an einer Kante und hält niemanden auf', () => {
    expect(LEVER.edge).toBe(true);
    expect(LEVER.solid(LEVER.init(bar()))).toBe(false);
  });
});

/**
 * **Der Maßstab des Regalmodells** — das Einzige am neuen Bild, das eine reine
 * Rechnung ist und deshalb hier geprüft werden kann.
 *
 * Alles Übrige am Modell (wo das Gelenk liegt, wie weit der Sockel an die
 * Kante rückt) wird am **geladenen** Netz gemessen, und ein Netz gibt es in
 * Jest nicht: `canLoadModels` sagt dort nein, und `fillLever` kommt gar nicht
 * erst bis zum Lader. Was bleibt, ist die Umrechnung Quellhöhe → Faktor — und
 * genau die ist als Funktion herausgezogen, damit sie nachgerechnet wird.
 */
describe('Der Hebel aus dem Regal', () => {
  /**
   * Nachgemessen an `platformer/red/lever_floor_base_red.glb`: 1,7285
   * Quelleinheiten hoch, mit `KAYKIT_SCALE` (0,5) also 0,8642 m. Diese Höhe
   * bringt das Modell mit — der Faktor macht daraus die Höhe des Hebels.
   */
  const MEASURED = 1.72847 * 0.5;

  it('streckt das gemessene Modell auf die Höhe des Hebels', () => {
    expect(MEASURED * leverFit(MEASURED)).toBeCloseTo(COLUMN_H, 9);
  });

  it('muss dafür kaum etwas tun — und das ist der Grund für dieses Modell', () => {
    // Vier Prozent: Wäre es ein Drittel, stünde hier ein anderes Modell.
    expect(leverFit(MEASURED)).toBeGreaterThan(1);
    expect(leverFit(MEASURED)).toBeLessThan(1.05);
  });

  it('ist ein Maßstab und kein Zuschlag', () => {
    // Jede Höhe landet auf derselben: Der Faktor teilt, er addiert nicht.
    for (const height of [0.4, 0.8642, 1.5, 2.4]) {
      expect(height * leverFit(height)).toBeCloseTo(COLUMN_H, 9);
    }
  });

  it('lässt eine Datei ohne Höhe in Ruhe', () => {
    // Ein Modell ohne Netz hat keine Höhe — es wird nicht ins Unendliche
    // gestreckt, sondern bleibt, wie es ist.
    expect(leverFit(0)).toBe(1);
    expect(leverFit(-1)).toBe(1);
  });
});

/**
 * **Was angemeldet ist, muss man sehen können** — die Regression, die diesen
 * Test hat entstehen lassen.
 *
 * Als der Hebel sein Bild aus dem Regal bekam, behielt er die gerechnete
 * Säule als Griff und knipste sie aus. Angemeldet war damit ein unsichtbarer
 * Zylinder: `PortalWorld.collectUsables` übergeht so etwas (zu Recht), `A`
 * fand den Hebel nicht mehr, und weil der gelbe Saum auf demselben Knoten
 * liegt, leuchtete auch nichts. Gemeldet wurde es als „die Lever funktionieren
 * nicht".
 *
 * Ohne WebGL gibt es hier kein geladenes Modell — aber ein Modell ist am Ende
 * ein Baum aus Knoten, und den legt dieser Test von Hand hin. Geprüft wird
 * genau der Augenblick, in dem der Fehler entstand: das Eintreffen der Datei
 * (`dressLever`).
 */
describe('Der Hebel, wenn sein Modell eintrifft', () => {
  /**
   * **Die Buchführung der Welt, so klein wie möglich** — eine Liste von
   * angemeldeten Knoten.
   *
   * Sie ist hier, weil der halbe Fehler in ihr steckt: `GridWorld` meldet
   * einen Einbau unter **einem** Knoten an und unter demselben wieder ab. Wer
   * den Griff austauscht, ohne beides zu schreiben, lässt bei jedem Umbau
   * einen Eintrag liegen — im Baumodus Dutzende je Minute. Dieselben vier
   * Zeilen stehen in `GridWorld.rehandle`; hier stehen sie, damit sich
   * nachsehen lässt, dass am Ende genau ein Eintrag übrig ist.
   */
  function stage(): {
    ctx: FixtureBuild;
    group: THREE.Group;
    usables: THREE.Object3D[];
  } {
    const group = new THREE.Group();
    const steel = new THREE.MeshStandardMaterial();
    const usables: THREE.Object3D[] = [];
    const ctx: FixtureBuild = {
      group,
      at: { x: 4.5, y: 0, z: 2.5 },
      material: () => steel,
      notify: () => {},
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
   * **Das Modell, nachgebaut in Quelleinheiten** — dieselben Maße, die in
   * `lever.ts` an der Datei abgemessen stehen: Grundplatte 0,8 × 0,4 × 1,2 mit
   * der Unterkante auf null, Bügel von 0,057 bis 1,729, und der Maßstab des
   * Pakets (0,5) auf der Wurzel, so wie `core/kaykitModel.copyOf` ihn abgibt.
   *
   * Der Sockel ist **namenlos**, denn in der Datei ist er es auch — gesucht
   * wird er als „der Knoten neben dem Bügel", und genau das soll geprüft sein.
   */
  function fakeModel(): THREE.Object3D {
    const model = new THREE.Group();
    model.scale.setScalar(0.5);
    const stem = new THREE.Object3D();
    stem.name = 'lever_floor_base_red';
    model.add(stem);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.487, 1.672, 0.487));
    arm.name = 'lever_floor_red';
    arm.position.y = 0.893;
    stem.add(arm);

    const base = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 1.2));
    base.position.y = 0.2;
    stem.add(base);
    return model;
  }

  function place(): FixturePlacement {
    return { id: 'hebel-1', kind: 'lever', x: 4, z: 2, dir: DIR_N, level: 0, props: {} };
  }

  it('meldet einen sichtbaren Sockel an und nicht eine ausgeknipste Säule', () => {
    const { ctx, group, usables } = stage();
    const view = LEVER.build(place(), ctx) as LeverView;
    // Was `GridWorld.attachUsable` direkt nach dem Bauen tut — der Griff der
    // gerechneten Form, und der ist sichtbar.
    usables.push(view.handle ?? view.object!);
    expect(usableShows(usables[0]!)).toBe(true);

    expect(dressLever(view, fakeModel(), ctx, group.children[0] as THREE.Group, -0.25)).toBe(true);

    // **Ein Eintrag, nicht zwei**: abgemeldet und angemeldet, und `view.handle`
    // zeigt auf denselben Knoten — sonst meldet der nächste Umbau den falschen
    // ab.
    expect(usables).toHaveLength(1);
    expect(view.handle).toBe(usables[0]);
    // Und das Entscheidende: Es ist ein Netz, und man sieht es.
    expect(usableShows(view.handle!)).toBe(true);
    expect((view.handle as THREE.Mesh).isMesh).toBe(true);

    view.dispose?.();
  });

  /**
   * **Die gerechnete Form geht weg und bleibt nicht unsichtbar stehen.**
   *
   * Das ist dieselbe Regel von der anderen Seite: Ein ausgeknipster Zylinder
   * an der Stelle des Hebels ist genau das, woran die Anmeldung hängenblieb.
   * Abgehängt kann sie niemandem mehr als Griff untergeschoben werden.
   */
  it('hängt die gerechnete Säule ab, statt sie auszuknipsen', () => {
    const { ctx, group } = stage();
    const view = LEVER.build(place(), ctx) as LeverView;
    const fixture = group.children[0] as THREE.Group;
    expect(view.column.parent).toBe(fixture);

    dressLever(view, fakeModel(), ctx, fixture, -0.25);

    for (const spare of [view.column, view.head, view.arm]) {
      expect(spare.parent).toBe(null);
    }
    expect(view.handle!.parent).not.toBe(null);
    view.dispose?.();
  });

  /**
   * **Der Griff steht, wo der Hebel steht.**
   *
   * `core/usable.pickUsable` rechnet waagerecht: Was zählt, sind x und z. Der
   * Sockel des Modells rückt an die Kachelkante, so weit er darf (`STANDOFF`,
   * und nie über die Kante hinaus) — nachgerechnet sind das 0,19 m vor der
   * Mitte gegen die 0,25 m der gerechneten Säule. Sechs Zentimeter, und der
   * Halbmesser fürs Zielen ist 0,7 m: Wer den Hebel vorher erreicht hat,
   * erreicht ihn nachher.
   */
  it('lässt den Griff dort, wo er war — waagerecht gerechnet', () => {
    const { ctx, group } = stage();
    const view = LEVER.build(place(), ctx) as LeverView;
    const fixture = group.children[0] as THREE.Group;
    fixture.updateMatrixWorld(true);
    const before = view.column.getWorldPosition(new THREE.Vector3());

    dressLever(view, fakeModel(), ctx, fixture, -0.25);
    fixture.updateMatrixWorld(true);
    const after = view.handle!.getWorldPosition(new THREE.Vector3());

    expect(after.x).toBeCloseTo(before.x, 6);
    expect(Math.abs(after.z - before.z)).toBeLessThan(0.1);
    // Auf der eigenen Kachel, und die ist einen Meter breit.
    expect(Math.abs(after.x - ctx.at.x)).toBeLessThan(0.5);
    expect(Math.abs(after.z - ctx.at.z)).toBeLessThan(0.5);
    // Und von der Kachelmitte aus in Reichweite (`use.radius`).
    expect(Math.hypot(after.x - ctx.at.x, after.z - ctx.at.z)).toBeLessThan(0.7);

    view.dispose?.();
  });

  it('bleibt bei der gerechneten Form, wenn die Datei keinen Bügel mitbringt', () => {
    const { ctx, group, usables } = stage();
    const view = LEVER.build(place(), ctx) as LeverView;
    usables.push(view.handle ?? view.object!);
    const fixture = group.children[0] as THREE.Group;

    // Ein Modell ohne `lever_floor_red` wäre ein Hebel, der sich nicht umlegen
    // lässt — dann wird gar nichts getauscht, und die Säule steht weiter da.
    const stranger = new THREE.Group();
    stranger.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)));
    expect(dressLever(view, stranger, ctx, fixture, -0.25)).toBe(false);

    expect(view.column.parent).toBe(fixture);
    expect(view.handle).toBe(view.column);
    expect(usables).toEqual([view.column]);
    expect(usableShows(view.column)).toBe(true);
    view.dispose?.();
  });
});
