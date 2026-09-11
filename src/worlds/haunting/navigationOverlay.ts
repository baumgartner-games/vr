import * as THREE from 'three';
import { TILE, tileCentreX, tileCentreZ } from '../nav/navTile';
import type { HouseSpec } from './house';
import { label } from './shipArt';
import type { MonsterInsight } from './map/mapSnapshot';
// **Tief importiert und nicht über `map/index.ts`.** Die Tür des Kartenpakets
// exportiert auch `FlatMode` und `MapView`; wer sie hier aufmacht, zieht die
// ganze 2D-Welt in den 3D-Pfad, den `HauntingWorld` mit Absicht erst auf
// Wunsch nachlädt. Gebraucht werden zwei reine Funktionen, sonst nichts.
import { beliefAlpha, BELIEF_MIN, interceptLabel } from './map/insightOverlay';

interface View extends Point {
  yaw: number;
  range: number;
  fov: number;
  targetY?: number;
}

interface Point {
  y?: number;
  x: number;
  z: number;
}
export interface NavigationTrace {
  at: Point;
  points: readonly Point[];
  goal: Point | null;
}

/**
 * Wie hoch die Absichten über dem Boden liegen, in Metern — knapp über den
 * Hörfeld-Kacheln, damit beides nebeneinander lesbar bleibt.
 */
const INSIGHT_Y = 0.09;

/** Observes the routes the actors actually consume; never runs a second search. */
export class NavigationOverlay {
  readonly root = new THREE.Group();
  private readonly labels: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
  private readonly actors = [0x42e8ff, 0xff5064, 0xffd95a].map((color) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(8192 * 3), 3));
    const material = new THREE.LineBasicMaterial({ color, depthTest: false, depthWrite: false });
    const line = new THREE.Line(geometry, material);
    line.frustumCulled = false;
    line.renderOrder = 100;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.7, 24),
      new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.renderOrder = 101;
    this.root.add(line, ring);
    return { line, ring };
  });

  private readonly views = [0x42e8ff, 0xff5064].map((color) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(48 * 9), 3));
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
        depthWrite: false,
        depthTest: false,
      }),
    );
    mesh.frustumCulled = false;
    mesh.renderOrder = 98;
    this.root.add(mesh);
    return mesh;
  });
  private readonly sound = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(TILE * 0.94, TILE * 0.94),
    new THREE.MeshBasicMaterial({
      color: 0xffb347,
      transparent: true,
      opacity: 0.2,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    1024,
  );

  /**
   * **Was das Monster glaubt und vorhat, als Weltgeometrie** (Paket M4).
   *
   * Alles darin liegt flach auf dem Boden und ist damit auch in der Brille
   * richtig herum — ein Overlay, das an der Kamera hinge, wäre dort ein
   * Aufkleber auf der Scheibe. Die Kacheln je Raum sind dieselbe Handschrift
   * wie das Hörfeld darüber; wer beides sieht, liest „hier hört es hin" und
   * „hier vermutet es ihn" als zwei Schichten derselben Karte.
   */
  private readonly insightRoot = new THREE.Group();
  /** Je Raum eine Fläche; ihre Deckkraft ist der Glaube an diesen Raum. */
  private readonly beliefTiles = new Map<
    string,
    THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  >();
  private readonly predictionLine: THREE.Line<THREE.BufferGeometry, THREE.LineDashedMaterial>;
  private readonly interceptRing: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  /** Die zwei Beschriftungen: Ankunftszeiten an der Tür, Haltung am Ziel. */
  private interceptSign: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | null = null;
  private interceptText = '';
  private modeSign: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | null = null;
  private modeText = '';

  constructor() {
    this.root.name = 'ai-navigation-goals';
    this.sound.count = 0;
    this.sound.renderOrder = 97;
    this.sound.frustumCulled = false;
    this.root.add(this.sound);
    this.root.visible = false;
    this.root.add(new THREE.HemisphereLight(0xffffff, 0x8198af, 2.5));

    this.insightRoot.name = 'ai-insight';
    this.insightRoot.visible = false;
    this.root.add(this.insightRoot);
    const path = new THREE.BufferGeometry();
    path.setAttribute('position', new THREE.BufferAttribute(new Float32Array(256 * 3), 3));
    this.predictionLine = new THREE.Line(
      path,
      new THREE.LineDashedMaterial({
        color: 0x7fe0ff,
        dashSize: 0.55,
        gapSize: 0.4,
        depthTest: false,
        depthWrite: false,
      }),
    );
    this.predictionLine.frustumCulled = false;
    this.predictionLine.renderOrder = 104;
    this.interceptRing = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.85, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffd84a,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false,
      }),
    );
    this.interceptRing.rotation.x = -Math.PI / 2;
    this.interceptRing.renderOrder = 105;
    this.insightRoot.add(this.predictionLine, this.interceptRing);
  }

  setRooms(spec: HouseSpec): void {
    for (const [, tile] of this.beliefTiles) {
      tile.geometry.dispose();
      tile.material.dispose();
      tile.removeFromParent();
    }
    this.beliefTiles.clear();
    for (const room of spec.rooms) {
      // Eine Fläche je Raum, im Maß des Raums: Das Glaubensbild ist eine
      // Verteilung über **Räume** und nicht über Kacheln — es kachelig zu
      // malen, hieße eine Genauigkeit zu behaupten, die das Monster nicht hat.
      const tile = new THREE.Mesh(
        new THREE.PlaneGeometry(room.rect.w * TILE - 0.2, room.rect.d * TILE - 0.2),
        new THREE.MeshBasicMaterial({
          color: 0xff4d55,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          depthTest: false,
          depthWrite: false,
        }),
      );
      tile.rotation.x = -Math.PI / 2;
      tile.position.set(
        (room.rect.x + room.rect.w / 2) * TILE,
        INSIGHT_Y - 0.02,
        (room.rect.z + room.rect.d / 2) * TILE,
      );
      tile.renderOrder = 103;
      tile.name = `belief:${room.id}`;
      tile.visible = false;
      this.beliefTiles.set(room.id, tile);
      this.insightRoot.add(tile);
    }
    for (const room of spec.rooms) {
      const sign = label(room.name.toUpperCase(), Math.min(9, room.rect.w * TILE - 1), 1.4);
      sign.rotation.x = -Math.PI / 2;
      sign.position.set((room.rect.x + room.rect.w / 2) * TILE, 0.4, room.rect.z * TILE + 1.1);
      sign.material.depthTest = false;
      sign.material.depthWrite = false;
      sign.renderOrder = 102;
      this.labels.push(sign);
      this.root.add(sign);
    }
  }

  update(active: boolean, traces: Array<NavigationTrace | null>): void {
    this.root.visible = active;
    if (!active) return;
    this.actors.forEach(({ line, ring }, i) => {
      const trace = traces[i];
      const valid = !!trace && Number.isFinite(trace.at.x) && Number.isFinite(trace.at.z);
      line.visible = valid;
      ring.visible = valid && !!trace.goal;
      if (!valid || !trace) return;
      const position = line.geometry.getAttribute('position') as THREE.BufferAttribute;
      position.setXYZ(0, trace.at.x, 0.25, trace.at.z);
      const count = Math.min(trace.points.length, position.count - 1);
      for (let j = 0; j < count; j++)
        position.setXYZ(j + 1, trace.points[j]!.x, 0.25, trace.points[j]!.z);
      position.needsUpdate = true;
      line.geometry.setDrawRange(0, count + 1);
      if (trace.goal) ring.position.set(trace.goal.x, 0.28, trace.goal.z);
    });
  }

  /**
   * **Die Absichten des Monsters auf den Boden legen** (Paket M4): Raumtönung
   * nach dem Glaubensbild, die gestrichelte Prognose des Technikerwegs, der
   * Abfangring mit beiden Ankunftszeiten und der Name der Haltung.
   *
   * `null` heißt: nichts davon. Das ist der Normalfall — nur wer am Fernseher
   * sitzt und den Schalter umgelegt hat, bekommt es zu sehen; für einen
   * Spieler wäre es der halbe Sieg.
   */
  insight(insight: MonsterInsight | null): void {
    this.insightRoot.visible = !!insight;
    if (!insight) return;
    const believed = new Map(insight.belief.map((entry) => [entry.roomId, entry.p]));
    for (const [id, tile] of this.beliefTiles) {
      const p = believed.get(id) ?? 0;
      tile.visible = p >= BELIEF_MIN;
      tile.material.opacity = beliefAlpha(p);
    }
    const path = insight.prediction?.path ?? [];
    this.predictionLine.visible = path.length > 1;
    if (path.length > 1) {
      const position = this.predictionLine.geometry.getAttribute(
        'position',
      ) as THREE.BufferAttribute;
      const count = Math.min(path.length, position.count);
      for (let i = 0; i < count; i++) position.setXYZ(i, path[i]!.x, INSIGHT_Y, path[i]!.z);
      position.needsUpdate = true;
      this.predictionLine.geometry.setDrawRange(0, count);
      // Ohne die Streckenlängen zeichnet three.js eine durchgezogene Linie —
      // und genau das Gestrichelte sagt hier „geraten, nicht gesehen".
      this.predictionLine.computeLineDistances();
    }
    const intercept = insight.intercept;
    this.interceptRing.visible = !!intercept;
    if (intercept) this.interceptRing.position.set(intercept.at.x, INSIGHT_Y, intercept.at.z);
    this.interceptSign = this.sign(
      this.interceptSign,
      intercept ? interceptLabel(intercept) : '',
      'interceptText',
      intercept ? { x: intercept.at.x, z: intercept.at.z + 1.5 } : null,
      4.4,
      0xffd84a,
    );
    this.modeSign = this.sign(
      this.modeSign,
      insight.goal ? insight.label : '',
      'modeText',
      insight.goal,
      3.6,
      0xff8a8f,
    );
  }

  /**
   * Eine der beiden Beschriftungen setzen. Die Textur wird **nur bei
   * geändertem Text** neu gebaut: Ein Canvas je Bild kostet mehr als das
   * ganze Overlay, und „Lauern" steht sekundenlang still.
   */
  private sign(
    current: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | null,
    text: string,
    slot: 'interceptText' | 'modeText',
    at: { x: number; z: number } | null,
    width: number,
    color: number,
  ): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | null {
    if (!text || !at) {
      if (current) current.visible = false;
      return current;
    }
    let sign = current;
    if (!sign || this[slot] !== text) {
      if (sign) {
        sign.geometry.dispose();
        sign.material.map?.dispose();
        sign.material.dispose();
        sign.removeFromParent();
      }
      sign = label(text, width, width / 4.4, color);
      sign.rotation.x = -Math.PI / 2;
      sign.material.depthTest = false;
      sign.material.depthWrite = false;
      sign.renderOrder = 106;
      this.insightRoot.add(sign);
      this[slot] = text;
    }
    sign.visible = true;
    sign.position.set(at.x, INSIGHT_Y + 0.02, at.z);
    return sign;
  }

  /** The same fixed-collider sight test as the actors clips cones at real walls. */
  perception(
    bot: View | null,
    monster: View | null,
    hearing: ReadonlyMap<number, number>,
    visible: (a: Point, b: Point) => boolean,
  ): void {
    [bot, monster].forEach((view, i) => {
      const mesh = this.views[i]!;
      mesh.visible = !!view;
      if (!view) return;
      const positions = mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
      const edge = (angle: number): Point => {
        let low = 0,
          high = view.range;
        const point = (distance: number) => ({
          x: view.x - Math.sin(angle) * distance,
          z: view.z - Math.cos(angle) * distance,
          y: view.targetY ?? 1.65,
        });
        if (visible(view, point(high))) return point(high);
        for (let n = 0; n < 8; n++) {
          const mid = (low + high) / 2;
          if (visible(view, point(mid))) low = mid;
          else high = mid;
        }
        return point(low);
      };
      let previous = edge(view.yaw - view.fov / 2);
      for (let n = 0; n < 48; n++) {
        const next = edge(view.yaw - view.fov / 2 + (view.fov * (n + 1)) / 48);
        positions.setXYZ(n * 3, view.x, 0.12, view.z);
        positions.setXYZ(n * 3 + 1, previous.x, 0.12, previous.z);
        positions.setXYZ(n * 3 + 2, next.x, 0.12, next.z);
        previous = next;
      }
      positions.needsUpdate = true;
    });
    const matrix = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
    let count = 0;
    for (const [key] of hearing) {
      if (count >= 1024) break;
      matrix.setPosition(tileCentreX(key), 0.07, tileCentreZ(key));
      this.sound.setMatrixAt(count++, matrix);
    }
    this.sound.count = monster ? count : 0;
    this.sound.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.root.removeFromParent();
    for (const sign of [this.interceptSign, this.modeSign]) {
      if (!sign) continue;
      sign.geometry.dispose();
      sign.material.map?.dispose();
      sign.material.dispose();
    }
    this.interceptSign = null;
    this.modeSign = null;
    this.predictionLine.geometry.dispose();
    this.predictionLine.material.dispose();
    this.interceptRing.geometry.dispose();
    this.interceptRing.material.dispose();
    for (const [, tile] of this.beliefTiles) {
      tile.geometry.dispose();
      tile.material.dispose();
    }
    this.beliefTiles.clear();
    for (const mesh of [...this.views, this.sound]) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    for (const sign of this.labels) {
      sign.geometry.dispose();
      sign.material.map?.dispose();
      sign.material.dispose();
    }
    this.labels.length = 0;
    for (const { line, ring } of this.actors) {
      line.geometry.dispose();
      line.material.dispose();
      ring.geometry.dispose();
      ring.material.dispose();
    }
  }
}
