import * as THREE from 'three';

/**
 * **Was ein Möbel tut, wenn man `A` drückt** — die kleinen Bewegungen dazu.
 * Gewünscht (Oktober 2026): _„Steh Lampen und Tischlampen ja, Truhen und
 * Fässer in dungeon und Taverne ja. Geschenke ja. Würfel zum würfeln ja. Dann
 * wird der Würfel nur animiert auf dem eigenen Feld hochgeworfen und dreht
 * sich."_
 *
 * Hier steht nur das **Bild**: der Deckel, der aufklappt, der Würfel, der
 * fliegt, das Geschenk, das sich auspackt. Was dabei herauskommt
 * (`GameElement.yields`) und welche Lampe angeht, entscheidet die Welt
 * (`FurnishedWorld.actOn`). Bewegt wird der Anker des Elements und was an ihm
 * hängt (`StationLayer.addOpener`) — nichts davon ist ein Körper der Physik,
 * und keine Zelle ändert sich.
 *
 * Nichts davon wird gespeichert oder übers Netz geschickt: Ein Würfel liegt
 * nach dem Neuladen wieder wie vorher, ein Geschenk ist wieder eingepackt.
 */

/** Wie weit ein Deckel aufgeht, im Bogenmaß — gut hundert Grad, er lehnt sich zurück. */
const LID_OPEN = 1.85;
/** Wie lange er dafür braucht, wie lange er offen bleibt und wie lange das Zuklappen dauert (s). */
const LID_TIMES = [0.35, 3, 0.5] as const;

/** Wie hoch ein Würfel fliegt (m) und wie lange (s). */
const ROLL_HEIGHT = 0.9;
const ROLL_TIME = 1.1;
/** Wie viele ganze Drehungen er in der Luft macht. */
const ROLL_TURNS = 2.5;

/** Wie lange ein Geschenk zum Verschwinden braucht, wie lange es weg ist, wie lange es wiederkommt (s). */
const UNWRAP_TIMES = [0.35, 25, 0.5] as const;
/** Wie lange die Seiten des großen Geschenks offen liegen (s). */
const FOLD_TIMES = [0.6, 25, 0.8] as const;
/** Wie hoch sein Deckel dabei steigt, in Metern der Datei. */
const LID_RISE = 1.2;

/** Eine laufende Bewegung: ein Bild weiter — und ob sie fertig ist. */
type Act = (dt: number) => boolean;

/** Weich hinein und heraus. */
function ease(u: number): number {
  const t = Math.min(1, Math.max(0, u));
  return t * t * (3 - 2 * t);
}

/**
 * **Der Kasten eines Dings in seinem eigenen Raum** — über die Ecken seiner
 * Weltkiste zurückgerechnet. Für Gelenke: Wo ist die Hinterkante des Deckels,
 * die Unterkante einer Seitenwand?
 */
function localBox(object: THREE.Object3D): THREE.Box3 {
  object.updateMatrixWorld(true);
  const world = new THREE.Box3().setFromObject(object);
  const inverse = object.matrixWorld.clone().invert();
  const out = new THREE.Box3();
  const corner = new THREE.Vector3();
  for (let i = 0; i < 8; i++) {
    corner.set(
      i & 1 ? world.max.x : world.min.x,
      i & 2 ? world.max.y : world.min.y,
      i & 4 ? world.max.z : world.min.z,
    );
    out.expandByPoint(corner.applyMatrix4(inverse));
  }
  return out;
}

/**
 * **Ein Gelenk um einen Punkt eines Dings** — eine Gruppe an dieser Stelle,
 * in die das Ding hineingehängt wird, ohne sich zu bewegen. Dreht man danach
 * die Gruppe, dreht sich das Ding um den Punkt. Einmal je Ding gebaut und am
 * Ding gemerkt.
 */
function hinge(object: THREE.Object3D, local: THREE.Vector3): THREE.Group {
  const known = object.userData['bgvrHinge'] as THREE.Group | undefined;
  if (known) return known;
  const parent = object.parent!;
  parent.updateMatrixWorld(true);
  const pivot = new THREE.Group();
  pivot.name = `hinge:${object.name}`;
  object.updateMatrix();
  pivot.position.copy(local.clone().applyMatrix4(object.matrix));
  parent.add(pivot);
  pivot.updateMatrixWorld(true);
  pivot.attach(object);
  object.userData['bgvrHinge'] = pivot;
  return pivot;
}

/** Die Bewegungen der Möbel einer Welt — je Bild weitergeschoben (`step`). */
export class ElementActs {
  private readonly running = new Map<THREE.Object3D, Act>();

  /** Ob an diesem Anker gerade etwas läuft — dann tut ein zweites `A` nichts. */
  busy(anchor: THREE.Object3D): boolean {
    return this.running.has(anchor);
  }

  /**
   * **Den Deckel aufklappen** — den Knoten, dessen Name `lid` enthält, um seine
   * Hinterkante (KayKit: vorn ist +z). Er bleibt ein paar Sekunden offen und
   * klappt dann wieder zu. `false`: Es gibt keinen Deckel (ein Fass).
   */
  lid(anchor: THREE.Object3D): boolean {
    let lid: THREE.Object3D | null = null;
    anchor.traverse((object) => {
      if (!lid && /lid/i.test(object.name) && !object.name.startsWith('hinge:')) lid = object;
    });
    if (!lid) return false;
    if (this.busy(anchor)) return true;
    const found: THREE.Object3D = lid;
    const box = localBox(found);
    const pivot = hinge(
      found,
      new THREE.Vector3((box.min.x + box.max.x) / 2, box.min.y, box.min.z),
    );
    const [open, hold, close] = LID_TIMES;
    let time = 0;
    this.running.set(anchor, (dt) => {
      time += dt;
      const angle =
        time < open
          ? ease(time / open)
          : time < open + hold
            ? 1
            : 1 - ease((time - open - hold) / close);
      pivot.rotation.x = -LID_OPEN * angle;
      return time >= open + hold + close;
    });
    return true;
  }

  /**
   * **Einen Würfel werfen** — er fliegt auf seiner Zelle hoch, dreht sich um
   * seine Mitte und landet. Ein Sechser (`cube`) liegt danach auf einer
   * zufälligen Seite; die anderen landen, wie sie lagen, nur anders gedreht —
   * ein Achtflächner auf einer Vierteldrehung stünde auf einer Kante.
   */
  roll(anchor: THREE.Object3D, cube: boolean, random: () => number = Math.random): void {
    if (this.busy(anchor)) return;
    // **Wo der Würfel ungedreht stünde** — beim ersten Wurf gemerkt: Danach
    // ist der Anker schon um die Mitte des Würfels verschoben.
    const centre = (anchor.userData['bgvrRollCentre'] ??= localBox(anchor).getCenter(
      new THREE.Vector3(),
    ).y) as number;
    const base = (anchor.userData['bgvrRollBase'] ??= anchor.position.clone()) as THREE.Vector3;
    const from = anchor.quaternion.clone();
    const end = from.clone();
    const quarter = (): number => (Math.floor(random() * 4) * Math.PI) / 2;
    if (cube)
      end.multiply(
        new THREE.Quaternion().setFromEuler(new THREE.Euler(quarter(), quarter(), quarter())),
      );
    else
      end.multiply(
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), random() * Math.PI * 2),
      );
    const axis = new THREE.Vector3(random() - 0.5, random() * 0.4, random() - 0.5).normalize();
    const spin = new THREE.Quaternion();
    const up = new THREE.Vector3();
    let time = 0;
    this.running.set(anchor, (dt) => {
      time += dt;
      const u = Math.min(1, time / ROLL_TIME);
      anchor.quaternion.slerpQuaternions(from, end, ease(u));
      spin.setFromAxisAngle(axis, ROLL_TURNS * Math.PI * 2 * u);
      anchor.quaternion.premultiply(spin);
      // Gedreht wird um die Mitte des Würfels und nicht um den Boden: Der Anker
      // sitzt unten, also wandert er so, dass die Mitte stehen bleibt.
      up.set(0, centre, 0).applyQuaternion(anchor.quaternion);
      anchor.position.set(
        base.x - up.x,
        base.y + centre - up.y + ROLL_HEIGHT * 4 * u * (1 - u),
        base.z - up.z,
      );
      if (u < 1) return false;
      anchor.quaternion.copy(end);
      up.set(0, centre, 0).applyQuaternion(end);
      anchor.position.set(base.x - up.x, base.y + centre - up.y, base.z - up.z);
      return true;
    });
  }

  /**
   * **Ein Geschenk auspacken** — es schrumpft weg und kommt nach einer Weile
   * wieder, frisch eingepackt. `false`: Es ist gerade ausgepackt.
   */
  unwrap(anchor: THREE.Object3D): boolean {
    if (this.busy(anchor)) return false;
    if (this.fold(anchor)) return true;
    const [out, away, back] = UNWRAP_TIMES;
    const scale = anchor.scale.clone();
    let time = 0;
    this.running.set(anchor, (dt) => {
      time += dt;
      const shown =
        time < out
          ? 1 - ease(time / out)
          : time < out + away
            ? 0
            : ease((time - out - away) / back);
      anchor.scale.copy(scale).multiplyScalar(Math.max(1e-3, shown));
      anchor.visible = shown > 0.01;
      if (time < out + away + back) return false;
      anchor.scale.copy(scale);
      anchor.visible = true;
      return true;
    });
    return true;
  }

  /**
   * **Das große Geschenk klappt seine Seiten auf** (`Present_Base` aus
   * _Mystery Monthly_ 6, Seiten `Present_Front`, `_Back`, `_Left`, `_Right`,
   * Deckel `_Top`): die vier Wände fallen nach außen um ihre Unterkante, der
   * Deckel fliegt hoch und weg. Nach einer Weile ist es wieder zu.
   */
  private fold(anchor: THREE.Object3D): boolean {
    const sides: THREE.Object3D[] = [];
    let top: THREE.Object3D | null = null;
    anchor.traverse((object) => {
      if (/^Present_(Front|Back|Left|Right)$/.test(object.name)) sides.push(object);
      if (object.name === 'Present_Top') top = object;
    });
    if (sides.length === 0) return false;
    const centre = new THREE.Box3().setFromObject(anchor).getCenter(new THREE.Vector3());
    const hinges = sides.map((side) => {
      const box = localBox(side);
      const mid = box.getCenter(new THREE.Vector3());
      const pivot = hinge(side, new THREE.Vector3(mid.x, box.min.y, mid.z));
      // Nach außen: vom Mittelpunkt des Geschenks weg — gerechnet im Raum des
      // Gelenks, denn um dessen Achsen wird gedreht.
      const out = pivot.worldToLocal(side.localToWorld(mid.clone()));
      const inner = pivot.worldToLocal(centre.clone());
      const dx = out.x - inner.x;
      const dz = out.z - inner.z;
      const alongX = Math.abs(dx) > Math.abs(dz);
      const sign = Math.sign(alongX ? dx : dz) || 1;
      return { pivot, alongX, sign };
    });
    const lid: THREE.Object3D | null = top;
    const lidFrom = lid ? (lid as THREE.Object3D).position.clone() : null;
    const lidScale = lid ? (lid as THREE.Object3D).scale.clone() : null;
    const [open, hold, close] = FOLD_TIMES;
    let time = 0;
    this.running.set(anchor, (dt) => {
      time += dt;
      const a =
        time < open
          ? ease(time / open)
          : time < open + hold
            ? 1
            : 1 - ease((time - open - hold) / close);
      for (const { pivot, alongX, sign } of hinges) {
        if (alongX) pivot.rotation.z = (-sign * Math.PI * a) / 2;
        else pivot.rotation.x = (sign * Math.PI * a) / 2;
      }
      // Der Deckel steigt auf und vergeht dabei — ein Deckel, der drei Meter
      // über dem Geschenk hängen bleibt, sähe von oben aus wie ein zweites.
      if (lid && lidFrom && lidScale) {
        const top = lid as THREE.Object3D;
        top.position.copy(lidFrom).add(new THREE.Vector3(0, LID_RISE * a, 0));
        top.scale.copy(lidScale).multiplyScalar(Math.max(1e-3, 1 - a));
      }
      return time >= open + hold + close;
    });
    return true;
  }

  /** Ein Bild weiter — was fertig ist, fällt heraus. */
  step(dt: number): void {
    for (const [anchor, act] of this.running) if (act(dt)) this.running.delete(anchor);
  }

  /** Alles anhalten — beim Verlassen der Welt. */
  clear(): void {
    this.running.clear();
  }
}
