import type * as THREE from 'three';
import { ModelBatch, type BatchItem } from './modelBatch';

/**
 * **Deko, die nur dasteht, als Bündel** — Wände, Tische, Stühle, Lampen und
 * Pflanzen, die eine Welt selbst aus dem Regal holt und nie wieder anfasst
 * (`hub/HubWorld.furnish`, `plateup/PlateUpWorld.furnish`, die Möbel der
 * Sitzecke).
 *
 * Dieselbe Rechnung wie für die Wände der Station (`modelBatch.ts`): gleiche
 * Geometrie und gleiches Aussehen in einem Feld sind **eine** `InstancedMesh`
 * und damit ein Zeichenaufruf je Durchgang statt einer je Stück. Die Stücke
 * bleiben stehen und werden nur unsichtbar — Strahlen, Kästen, Körper arbeiten
 * an ihnen weiter —, und ihre Matrizen werden stillgelegt, solange sie im
 * Bündel stehen.
 *
 * Was hier anders ist als bei den Stücken einer Portalwelt: **Nichts davon
 * steht je einzeln** (niemand greift es, nichts leuchtet auf), und **nichts
 * davon wird von oben durchsichtig** — das Ghosting (`grid/modelGhost.ts`)
 * kennt nur die Stücke, die ein Spieler hingestellt hat. Also wird auch von
 * oben gebündelt. Wer ein Stück doch einmal durchsichtig macht (die Südwand
 * des Burgerladens), gibt es hier gar nicht erst hinein.
 *
 * Kommt ein Stück dazu, wartet das Bündel, bis eine halbe Sekunde lang nichts
 * mehr dazukam (`ModelBatch.settle`) — die Deko kommt beim Laden Stück für
 * Stück an, und bis dahin steht alles einzeln, wie vorher.
 */
export class StaticDecor {
  private readonly items: BatchItem[] = [];
  private readonly batch: ModelBatch;

  /** @param parent wo die Stücke hängen — die Bündel hängen daneben */
  constructor(parent: THREE.Object3D, cell = 16) {
    this.batch = new ModelBatch(parent, cell);
    // Unter eigenem Namen, damit die Messstrecke (`tools/perf-worlds.mjs
    // --ab`) die Bündel findet und zum Vergleich abschalten kann.
    this.batch.group.name = 'static-decor';
    this.batch.group.userData.staticDecor = this;
  }

  /** Ein Stück, das ab jetzt nur noch dasteht. Es muss schon an `parent` hängen. */
  add(object: THREE.Object3D): void {
    this.items.push({ object, removed: false });
  }

  /** Wie viele Stücke dabei sind. */
  get size(): number {
    return this.items.length;
  }

  /** Wie viele Bündel es gerade gibt — die Zeichenaufrufe je Durchgang. */
  get bundleCount(): number {
    return this.batch.bundleCount;
  }

  /** Ob gerade die Bündel zu sehen sind. */
  get batched(): boolean {
    return this.batch.batched;
  }

  /** Einmal je Bild. */
  step(dt: number): void {
    if (!this.items.length && !this.batch.bundleCount) return;
    // Ein Stück, das niemand mehr hält (die Welt hat neu eingerichtet), fällt
    // heraus — das Bündel merkt es und baut neu.
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i]!;
      if (item.object.parent) continue;
      item.removed = true;
      this.items.splice(i, 1);
    }
    this.batch.step(dt, true, this.items, never);
  }

  /** Die Bündel weg, die Stücke wieder einzeln — sie selbst räumt der Besitzer. */
  dispose(): void {
    this.batch.dispose();
    this.items.length = 0;
  }
}

const never = (): boolean => false;
