import * as THREE from 'three';
import { KAYKIT_SCALE } from './kaykitFit';
import { kaykitFitHeight, kaykitHeightScale, kaykitSkins } from './kaykitHeight';

/**
 * Die Vorlage, wie sie aus dem Regal kommt: eine Gruppe mit dem Maßstab des
 * Pakets darauf und dem Netz darin (`core/kaykitModel.copyOf`). Die Maße sind
 * die von `dungeon/post.glb`, nachgemessen in der Quelle — 0,400 × 4,000 ×
 * 0,400 Einheiten, Ursprung in der Mitte der Unterkante.
 *
 * `lift` verschiebt den Ursprung: Damit steht in einem der Tests ein Netz da,
 * dessen Fuß **nicht** auf seinem Ursprung liegt — die Bauart, die es unter
 * 4470 fremden Dateien geben darf und auf die sich niemand verlassen soll.
 */
function post(lift = 0): THREE.Group {
  const geometry = new THREE.BoxGeometry(0.4, 4, 0.4);
  geometry.translate(0, 2 + lift, 0);
  const holder = new THREE.Group();
  holder.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial()));
  holder.scale.setScalar(KAYKIT_SCALE);
  return holder;
}

/** Die Maße einer fertigen Gruppe, wie die Welt sie sieht. */
function measure(object: THREE.Object3D): THREE.Box3 {
  object.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(object);
}

describe('Ein Modell aus dem Regal auf Höhe bringen', () => {
  /**
   * Die ganze Rechnung, und zwar an der Zahl, um die es geht: Der Pfosten ist
   * mit dem Maßstab seines Pakets 2,00 m hoch, gewollt sind 1,35 m unter dem
   * Schild der Gitterwelt.
   */
  it('rechnet aus gemessener und gewollter Höhe den Faktor', () => {
    expect(kaykitHeightScale(4 * KAYKIT_SCALE, 1.35)).toBeCloseTo(0.675, 10);
    expect(kaykitHeightScale(1.35, 1.35)).toBe(1);
    expect(kaykitHeightScale(1, 2)).toBe(2);
  });

  /**
   * Und die drei unmöglichen Fälle bleiben, wie sie sind: Ein leeres Netz, ein
   * Ziel von null und eine Zahl, die keine ist, sind kein Grund, ein Modell
   * ins Unendliche zu blasen oder verschwinden zu lassen.
   */
  it('lässt ein Modell in Ruhe, wo sich nichts rechnen lässt', () => {
    expect(kaykitHeightScale(0, 1.35)).toBe(1);
    expect(kaykitHeightScale(-2, 1.35)).toBe(1);
    expect(kaykitHeightScale(2, 0)).toBe(1);
    expect(kaykitHeightScale(Number.NaN, 1.35)).toBe(1);
    expect(kaykitHeightScale(2, Number.NaN)).toBe(1);
  });

  it('stellt den Pfosten auf genau die gewollte Höhe — und dünner wird er mit', () => {
    const box = measure(kaykitFitHeight(post(), 1.35));
    expect(box.max.y - box.min.y).toBeCloseTo(1.35, 10);
    // Der Maßstab ist gleichmäßig: 0,400 Quelleinheiten werden mit dem Paket
    // zu 0,20 m und mit dem Schild zu 0,135 m. Ein Pfosten, der nur in der
    // Höhe gestaucht würde, wäre ein Balken.
    expect(box.max.x - box.min.x).toBeCloseTo(0.4 * KAYKIT_SCALE * 0.675, 6);
  });

  it('setzt seinen Fuß auf den Ursprung der Gruppe', () => {
    expect(measure(kaykitFitHeight(post(), 1.35)).min.y).toBeCloseTo(0, 10);
    // Auch dann, wenn der Ursprung der Datei woanders liegt: Der Maßstab dreht
    // um ihn und nicht um den Fuß, und genau das rechnet der Helfer mit.
    const odd = measure(kaykitFitHeight(post(1.5), 1.35));
    expect(odd.min.y).toBeCloseTo(0, 10);
    expect(odd.max.y - odd.min.y).toBeCloseTo(1.35, 10);
  });

  it('lässt ein leeres Modell unangetastet', () => {
    const empty = new THREE.Group();
    empty.scale.setScalar(KAYKIT_SCALE);
    kaykitFitHeight(empty, 1.35);
    expect(empty.scale.y).toBe(KAYKIT_SCALE);
    expect(empty.position.y).toBe(0);
  });

  /**
   * Was beim Abräumen weg muss, steht genau einmal in der Liste: Zwei Netze
   * mit demselben Material sind ein Material, und `dispose` zweimal auf
   * demselben ist bestenfalls umsonst.
   */
  it('sammelt jedes Material der Kopie einmal', () => {
    const shared = new THREE.MeshStandardMaterial();
    const extra = new THREE.MeshStandardMaterial();
    const root = new THREE.Group();
    root.add(new THREE.Mesh(new THREE.BoxGeometry(), shared));
    root.add(new THREE.Mesh(new THREE.BoxGeometry(), shared));
    const many = new THREE.Mesh(new THREE.BoxGeometry(), [shared, extra]);
    root.add(many);
    expect(new Set(kaykitSkins(root))).toEqual(new Set([shared, extra]));
    expect(kaykitSkins(root)).toHaveLength(2);
    expect(kaykitSkins(new THREE.Group())).toEqual([]);
  });
});
