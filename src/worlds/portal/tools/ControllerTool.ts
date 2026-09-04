import * as THREE from 'three';
import { Tool } from './Tool';
import { buildControllerShape, controllerShape, ownMaterials } from '../../../core/ControllerModels';
import type { Handedness } from '../../../core/XRInput';

/** Beide Controller, unter den Ids, mit denen sie im Regal stehen. */
export const CONTROLLER_TOOL_IDS = ['controller-left', 'controller-right'] as const;

/** Die Id des Controllers einer Seite — das Regal fragt danach. */
export function controllerToolId(side: Handedness): string {
  return side === 'left' ? 'controller-left' : 'controller-right';
}

/**
 * Der Quest-Controller als **Werkzeug**: einer je Hand, zum Anfassen und
 * Einmessen.
 *
 * Der Eingaberaum zeigt seit langem einen Controller an der Wand, der tut, was
 * der echte tut — das beantwortet „ist der Knopf angekommen?" und sonst
 * nichts. Die andere Frage kommt beim Justieren: **wo sitzt das Gerät
 * eigentlich in meiner Faust?** Der Griffraum, den die Brille meldet, ist
 * nicht der Controller und nicht die Hand, sondern ein Punkt irgendwo dazwischen,
 * und jeder Versatz, den man einem Werkzeug einmisst, wird gegen ihn gemessen.
 *
 * Also liegt der Controller hier im Regal wie eine Pistole: man nimmt ihn in
 * die Hand, legt ihn in den Halter und misst ein, wo er liegen soll. Danach
 * sieht man am eigenen Modell, wie weit Griffraum und Gerät auseinanderliegen —
 * und hat die Zahl, die alles andere erklärt.
 *
 * Zwei Werkzeuge und nicht eines, weil es zwei Geräte sind: die Schalen sind
 * spiegelbildlich, und jede hat ihre eigene gemessene Lage. Gezeigt wird das
 * **echte Modell** aus dem Repository (`core/ControllerModels.ts`), sobald es
 * geladen ist; bis dahin — und auf jedem Gerät, dessen Profil nicht
 * mitgeliefert ist — der selbst gebaute Controller. Ein Werkzeug, das erst
 * nach dem Laden sichtbar wird, wäre ein leerer Griff.
 *
 * Es **zielt nicht**: ein Controller liegt in der Faust, er schießt nicht
 * dorthin, wohin man zeigt. Damit ist seine gemessene Lage genau der Versatz
 * zwischen Griffraum und Gerät und nicht der Versatz plus 30° Zielkorrektur.
 */
export class ControllerTool extends Tool {
  override readonly toolId: string;
  override readonly label: string;

  /** Der selbst gebaute — sofort da, und er tritt zurück, wenn das echte kommt. */
  private readonly built = new THREE.Group();
  /** Das echte Modell, sobald die Datei da ist. */
  private real: THREE.Object3D | null = null;
  private readonly owned: THREE.Material[] = [];
  /** Materialien der Kopie: die geklonten gehören ihr allein. */
  private borrowed: THREE.Material[] = [];

  constructor(readonly side: Handedness) {
    super();
    this.toolId = controllerToolId(side);
    this.label = side === 'left' ? 'Controller links' : 'Controller rechts';
    this.name = `tool-${this.toolId}`;
    this.icon = 'controller';
    this.accent = 0x9aa6bd;
    this.hint = 'Wo das Gerät im Griff sitzt — in den Halter legen';
    this.alignToAim = false;
    // Ab Werk sitzt er genau im Griffraum: die Profile sind darin gezeichnet,
    // und alles, was man später einmisst, ist die Abweichung davon.
    this.holdPosition.set(0, 0, 0);
    this.holdRotation.identity();

    const shell = this.own(
      new THREE.MeshStandardMaterial({ color: 0x1d2331, roughness: 0.6, metalness: 0.15 }),
    );
    const parts = new Map<string, THREE.MeshStandardMaterial>();
    this.built.add(
      buildControllerShape(side, shell, (key, color) => {
        const existing = parts.get(key);
        if (existing) return existing;
        const material = this.own(
          new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.2 }),
        );
        parts.set(key, material);
        return material;
      }).root,
    );
    this.add(this.built);

    // Und daneben das echte Modell. Es hängt an keinem Gerät — das Werkzeug
    // soll auch dann noch aussehen wie ein Controller, wenn man den zweiten
    // gerade weggelegt hat, und gerade dann.
    void controllerShape(side).then((shape) => {
      if (!shape || this.real) return;
      // Die Kopie teilt sich Materialien mit allen anderen; eigene bekommt sie
      // nur hier, damit ein Werkzeug, das umgefärbt wird, nicht den Controller
      // in der Hand mitnimmt.
      this.borrowed = ownMaterials(shape);
      this.real = shape;
      this.add(shape);
      this.built.visible = false;
    });
  }

  override disposeTool(): void {
    // Das echte Modell zuerst aushängen: seine Geometrien liegen in einem
    // Zwischenspeicher, den sich alle Controller teilen — wer sie hier
    // freigibt, nimmt sie dem nächsten weg.
    this.real?.removeFromParent();
    this.real = null;
    this.built.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) mesh.geometry.dispose();
    });
    for (const material of this.owned) material.dispose();
    this.owned.length = 0;
    for (const material of this.borrowed) material.dispose();
    this.borrowed = [];
  }

  private own<T extends THREE.Material>(material: T): T {
    this.owned.push(material);
    return material;
  }
}
