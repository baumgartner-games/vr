import * as THREE from 'three';
import { GRAB_TINT, GRAB_TINT_EMISSIVE } from '../../core/colors';
import { TextPlane } from '../../ui/TextPlane';

/**
 * **Das Tablett des Tisch-Modus** — ein Werkzeug, das in der Luft schwebt.
 *
 * Gewünscht: _„Ich denke, es wäre gut, ein ‚Werkzeug' in der Luft schweben zu
 * haben mit einem erkennbaren Griff in Griff-Farbe, mit dem ich das bewegen
 * kann. Auf diesem Tablett sind die nächsten Tiles als Stapel angelegt (da
 * soll man nur Hexagons sehen, mit einer einheitlichen Unterseite, also nicht
 * dass man sieht, was als Nächstes kommt) mit der Anzahl, wie viele Tiles noch
 * und auch Tiles für die Missionen. Wenn eine neue Mission gezogen oder ein
 * normales Tile gezogen werden soll, wird der entsprechende Stapel
 * gehighlightet. Vor den Stapeln ist noch eine Zahl."_
 *
 * Hier steht nur, wie es aussieht und wo man es anfasst; was ein Griff tut,
 * entscheidet `HexlandWorld` (`updateTable`). Alle Maße in Metern, das
 * Tablett liegt in der xz-Ebene, **+z zeigt zum Spieler**.
 */
export class HexTray {
  readonly root = new THREE.Group();
  /** Der Griff in Griff-Farbe an der Vorderkante — dort wird das Tablett getragen. */
  readonly handle: THREE.Mesh;
  readonly place: TextPlane;
  readonly turnLeft: TextPlane;
  readonly turnRight: TextPlane;
  /** Über dem Stapel, wenn die letzte Kachel liegt: _Beenden_ legt sie wirklich. */
  readonly finish: TextPlane;
  readonly info: TextPlane;
  /** Wo man in die Stapel greift — die Mitte ihrer Oberseite, im Tablett. */
  readonly stackAt: Record<StackKind, THREE.Vector3> = {
    normal: new THREE.Vector3(-STACK_X, 0, STACK_Z),
    quest: new THREE.Vector3(STACK_X, 0, STACK_Z),
  };
  private readonly stacks: Record<StackKind, THREE.InstancedMesh>;
  private readonly counts: Record<StackKind, TextPlane>;
  private readonly marks: Record<StackKind, THREE.Mesh>;
  private readonly materials: THREE.Material[] = [];
  private readonly geometries: THREE.BufferGeometry[] = [];
  private next: StackKind | null = null;
  private clock = 0;

  constructor() {
    this.root.name = 'hexland-tray';
    const plate = this.mesh(
      new THREE.BoxGeometry(0.44, 0.016, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x3a3550, roughness: 0.8 }),
    );
    plate.position.y = -0.008;
    this.root.add(plate);
    const rim = this.mesh(
      new THREE.BoxGeometry(0.46, 0.01, 0.32),
      new THREE.MeshStandardMaterial({ color: 0x24203a, roughness: 0.9 }),
    );
    rim.position.y = -0.016;
    this.root.add(rim);

    // **Der Griff**: eine Stange vor der Vorderkante, wie an einem Tablett.
    this.handle = this.mesh(
      new THREE.CylinderGeometry(0.014, 0.014, 0.28, 12),
      new THREE.MeshStandardMaterial({
        color: GRAB_TINT,
        roughness: 0.6,
        emissive: new THREE.Color(GRAB_TINT).multiplyScalar(GRAB_TINT_EMISSIVE),
      }),
    );
    this.handle.rotation.z = Math.PI / 2;
    this.handle.position.set(0, 0.012, 0.19);
    this.root.add(this.handle);
    for (const x of [-0.12, 0.12]) {
      const post = this.mesh(
        new THREE.BoxGeometry(0.014, 0.012, 0.05),
        this.handle.material as THREE.Material,
      );
      post.position.set(x, 0.004, 0.165);
      this.root.add(post);
    }

    // **Die Stapel**: lauter gleiche Sechsecke, Unterseite nach oben — man
    // sieht, wie viele es sind, aber nicht, was kommt.
    const disc = new THREE.CylinderGeometry(TILE_R, TILE_R, TILE_H, 6);
    this.geometries.push(disc);
    const backs: Record<StackKind, number> = { normal: 0xd8c39a, quest: 0xc79ad8 };
    const markGeometry = new THREE.RingGeometry(TILE_R * 1.12, TILE_R * 1.6, 6);
    this.geometries.push(markGeometry);
    const make = (kind: StackKind): [THREE.InstancedMesh, TextPlane, THREE.Mesh] => {
      const material = new THREE.MeshStandardMaterial({ color: backs[kind], roughness: 0.85 });
      this.materials.push(material);
      const stack = new THREE.InstancedMesh(disc, material, MAX_SHOWN);
      stack.position.copy(this.stackAt[kind]);
      stack.count = 0;
      this.root.add(stack);
      const count = new TextPlane({
        width: 0.07,
        height: 0.05,
        title: '0',
        accent: backs[kind],
        align: 'center',
      });
      count.position.set(this.stackAt[kind].x, 0.03, STACK_Z + 0.085);
      count.rotation.x = -0.6;
      this.root.add(count);
      const markMaterial = new THREE.MeshBasicMaterial({
        color: 0xffd84a,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      this.materials.push(markMaterial);
      const mark = new THREE.Mesh(markGeometry, markMaterial);
      mark.rotation.x = -Math.PI / 2;
      mark.position.set(this.stackAt[kind].x, 0.002, STACK_Z);
      mark.visible = false;
      this.root.add(mark);
      return [stack, count, mark];
    };
    const [normal, normalCount, normalMark] = make('normal');
    const [quest, questCount, questMark] = make('quest');
    this.stacks = { normal, quest };
    this.counts = { normal: normalCount, quest: questCount };
    this.marks = { normal: normalMark, quest: questMark };

    // **Die Knöpfe** vorn, schräg zum Spieler: ↺ · ✓ Legen · ↻.
    const arrowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffd84a,
      transparent: true,
      side: THREE.DoubleSide,
    });
    this.materials.push(arrowMaterial);
    const button = (title: string, width: number, x: number, background: string): TextPlane => {
      const plane = new TextPlane({
        width,
        height: 0.06,
        title,
        accent: 0xffd84a,
        background,
        align: 'center',
      });
      plane.position.set(x, 0.022, 0.105);
      plane.rotation.x = -0.9;
      this.root.add(plane);
      return plane;
    };
    this.place = button('✓ Legen', 0.16, 0, 'rgba(36, 120, 64, 0.95)');
    const turn = (clockwise: boolean, x: number): TextPlane => {
      const plane = button('', 0.06, x, 'rgba(40, 46, 66, 0.95)');
      for (const part of curvedArrow(
        0.016,
        0.006,
        clockwise ? 2.4 : 0.75,
        4,
        clockwise,
        arrowMaterial,
      )) {
        part.position.z = 0.002;
        plane.add(part);
      }
      return plane;
    };
    this.turnLeft = turn(false, -0.135);
    this.turnRight = turn(true, 0.135);
    this.finish = new TextPlane({
      width: 0.13,
      height: 0.05,
      title: '■ Beenden',
      accent: 0xffd84a,
      background: 'rgba(120, 60, 30, 0.95)',
      align: 'center',
    });
    this.finish.position.set(-STACK_X, 0.2, STACK_Z);
    this.finish.visible = false;
    this.root.add(this.finish);
    this.info = new TextPlane({ width: 0.32, height: 0.08, title: '', align: 'center' });
    this.info.position.set(0, 0.07, -0.17);
    this.info.rotation.x = -0.25;
    this.root.add(this.info);
  }

  /**
   * **Was auf dem Tablett zu sehen ist**: wie viele Kacheln in jedem Stapel
   * liegen, von welchem als Nächstes gezogen wird (der leuchtet), und ob
   * über dem Stapel _Beenden_ steht.
   */
  show(normal: number, quest: number, next: StackKind | null, last: boolean): void {
    this.fill('normal', normal);
    this.fill('quest', quest);
    this.next = next;
    this.marks.normal.visible = next === 'normal';
    this.marks.quest.visible = next === 'quest';
    this.finish.visible = last;
  }

  /** Die Oberseite eines Stapels in der Welt — dort greift die Hand hinein. */
  stackTop(kind: StackKind, out: THREE.Vector3): THREE.Vector3 {
    const top = Math.min(this.stacks[kind].count, MAX_SHOWN) * (TILE_H + GAP);
    out.copy(this.stackAt[kind]).setY(top + 0.01);
    return this.root.localToWorld(out);
  }

  /** Der leuchtende Ring unter dem Stapel, von dem gezogen wird, pulsiert. */
  update(dt: number): void {
    this.clock += dt;
    const pulse = 0.5 + 0.5 * Math.sin(this.clock * 4);
    for (const kind of ['normal', 'quest'] as const) {
      // Der Stapel selbst glüht mit, nicht nur der Ring darunter.
      const glow = (this.stacks[kind].material as THREE.MeshStandardMaterial).emissive;
      if (kind === this.next) glow.setHex(0xffd84a).multiplyScalar(0.15 + 0.35 * pulse);
      else glow.setHex(0x000000);
    }
    if (!this.next) return;
    const material = this.marks[this.next].material as THREE.MeshBasicMaterial;
    material.opacity = 0.55 + 0.45 * pulse;
  }

  dispose(): void {
    for (const material of this.materials) material.dispose();
    for (const geometry of this.geometries) geometry.dispose();
    for (const plane of [this.place, this.turnLeft, this.turnRight, this.finish, this.info])
      plane.dispose();
    this.counts.normal.dispose();
    this.counts.quest.dispose();
    this.stacks.normal.dispose();
    this.stacks.quest.dispose();
  }

  private fill(kind: StackKind, count: number): void {
    const stack = this.stacks[kind];
    const shown = Math.min(count, MAX_SHOWN);
    if (stack.count !== shown) {
      for (let i = 0; i < shown; i++) {
        _matrix.makeTranslation(0, TILE_H / 2 + i * (TILE_H + GAP), 0);
        stack.setMatrixAt(i, _matrix);
      }
      stack.count = shown;
      stack.instanceMatrix.needsUpdate = true;
      stack.computeBoundingSphere();
    }
    this.counts[kind].setText(Number.isFinite(count) ? `${count}` : '∞');
  }

  private mesh(geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
    this.geometries.push(geometry);
    if (!this.materials.includes(material)) this.materials.push(material);
    return new THREE.Mesh(geometry, material);
  }
}

export type StackKind = 'normal' | 'quest';

/** Halber Abstand der beiden Stapel, und wie weit hinten sie stehen. */
const STACK_X = 0.09;
const STACK_Z = -0.03;
/** Eine Kachel im Stapel: Umkreis und Dicke. */
const TILE_R = 0.045;
const TILE_H = 0.0026;
const GAP = 0.0006;
/** Mehr zeigt der Stapel nicht — die Zahl davor sagt den Rest. */
const MAX_SHOWN = 24;
const _matrix = new THREE.Matrix4();

/**
 * **Ein gebogener Pfeil** in der xy-Ebene: ein Bogen von `start` über `sweep`
 * (Bogenmaß, gegen den Uhrzeiger gezählt) und eine Spitze an dem Ende, zu dem
 * er läuft — im Uhrzeigersinn am Anfang, sonst am Ende.
 */
export function curvedArrow(
  radius: number,
  width: number,
  start: number,
  sweep: number,
  clockwise: boolean,
  material: THREE.Material,
): THREE.Mesh[] {
  const head = (width * 1.4) / radius;
  const arcStart = clockwise ? start + head * 0.55 : start;
  const arc = new THREE.Mesh(
    new THREE.RingGeometry(
      radius - width / 2,
      radius + width / 2,
      24,
      1,
      arcStart,
      sweep - head * 0.55,
    ),
    material,
  );
  const at = (r: number, a: number): [number, number] => [Math.cos(a) * r, Math.sin(a) * r];
  const base = clockwise ? start + head * 0.6 : start + sweep - head * 0.6;
  const tipAt = clockwise ? start - head * 0.6 : start + sweep + head * 0.6;
  const shape = new THREE.Shape();
  shape.moveTo(...at(radius - width * 1.6, base));
  shape.lineTo(...at(radius + width * 1.6, base));
  shape.lineTo(...at(radius, tipAt));
  shape.closePath();
  return [arc, new THREE.Mesh(new THREE.ShapeGeometry(shape), material)];
}
