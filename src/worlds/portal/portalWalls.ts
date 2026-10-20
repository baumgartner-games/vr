import * as THREE from 'three';
import type { PhysicsBody, PhysicsWorld } from '../../physics/PhysicsWorld';
import type { PortalKey } from './PortalSync';

/**
 * **Portale auf Wänden aus dem Katalog.**
 *
 * Gewünscht (Oktober 2026): _„Ich würde gerne wieder die Portal Waffe nutzen
 * können, um auf Wände aus dem Katalog Portale zum teleportieren zu nutzen."_
 * Portalfähig waren bis dahin nur die gebauten Quader (`PortalWorld.slab`) und
 * die Fläche bis zum Horizont. Seit die Welten aus dem Regal gebaut werden
 * (`grid/shelfWalls.ts`), steht dort aber keine gebaute Wand mehr, sondern
 * ein Modell mit einem Körper — und der Schuss ging durch sie hindurch.
 *
 * Getroffen wird deshalb der **Körper** der Wand und nicht ihr Bild: je Wand
 * ein unsichtbarer Kasten in der Größe ihres Colliders (`proxies`, nie in der
 * Szene). Das Bild wird gebündelt gezeichnet (`shared/modelBatch.ts`) und
 * taugte ohnehin nicht zum Zielen; der Kasten ist eben, genau so groß wie das,
 * wogegen man läuft, und `PortalWorld.castSurface`, `fits` und der Trichter
 * (`portalFunnel.ts`) behandeln ihn wie jede andere Fläche.
 *
 * Damit man durch die Wand auch **hindurchgeht**, bekommt jede Wand, die der
 * Trichter eines Portals durchstößt, solange das Portal dort sitzt, ein
 * Portalbit als Mitgliedschaft (`claim`) — dasselbe Spiel wie bei den Quadern.
 * Für den Spieler steht eine Wand auf dem Gitter nur im Zellgitter
 * (`PhysicsBody.gridWall`); dort lässt die Ebene ihn im Trichter durch
 * (`PhysicsLocomotion.planeGate`). Wird die Wand weggenommen oder verschoben,
 * schließt das Portal (`stale`).
 */

/** Höher als so viel (halbe Höhe, Meter) — eine Wand und kein Möbel. */
const MIN_HALF_HEIGHT = 0.6;
/** Dünner als so viel (halbe Dicke, Meter). */
const MAX_HALF_THICK = 0.3;
/** Wie weit sich eine Wand bewegen darf, ehe das Portal auf ihr schließt. */
const MOVED = 0.01;

const _position = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _box = new THREE.BoxGeometry(1, 1, 1);
const _material = new THREE.MeshBasicMaterial();

/** Ob dieser Körper als Wand ein Portal halten kann: ein Kasten, hoch und dünn. */
export function holdsPortal(entry: PhysicsBody): boolean {
  if (entry.removed || entry.carried || entry.shape.kind !== 'box') return false;
  const half = entry.halfExtents;
  return half.y >= MIN_HALF_HEIGHT && Math.min(half.x, half.z) <= MAX_HALF_THICK;
}

interface Claim {
  readonly bodies: PhysicsBody[];
  /** Wo jede Wand stand, als das Portal kam. */
  readonly at: THREE.Vector3[];
}

export class PortalWalls {
  /** Je Wand ein Kasten zum Zielen — die Liste, die `castSurface` mitbekommt. */
  readonly proxies: THREE.Mesh[] = [];
  private readonly proxyOf = new Map<PhysicsBody, THREE.Mesh>();
  private readonly bodyOf = new Map<THREE.Object3D, PhysicsBody>();
  /** Die Wände, durch die ein Portal gerade geht. */
  private readonly claims = new Map<PortalKey, Claim>();
  /** Die Mitgliedschaft, die eine Wand vor dem ersten Portal hatte. */
  private readonly home = new Map<PhysicsBody, number>();

  /** Das Portalbit der Katalogwände (`PortalWorld.wallGroup`). */
  constructor(readonly group: number) {}

  /**
   * **Die Kästen nachziehen** — einer je Wand in `walls`, in der Lage ihres
   * Körpers. Wände, die es nicht mehr gibt, fallen heraus.
   */
  sync(walls: readonly PhysicsBody[]): readonly THREE.Mesh[] {
    const keep = new Set<PhysicsBody>();
    for (const entry of walls) {
      if (!holdsPortal(entry)) continue;
      keep.add(entry);
      let proxy = this.proxyOf.get(entry);
      if (!proxy) {
        proxy = new THREE.Mesh(_box, _material);
        proxy.name = 'surface:catalog-wall';
        proxy.matrixAutoUpdate = false;
        proxy.matrixWorldAutoUpdate = false;
        this.proxyOf.set(entry, proxy);
        this.bodyOf.set(proxy, entry);
      }
      const t = entry.body.translation();
      const r = entry.body.rotation();
      _position.set(t.x, t.y, t.z);
      _quaternion.set(r.x, r.y, r.z, r.w);
      _scale.copy(entry.halfExtents).multiplyScalar(2);
      proxy.matrixWorld.compose(_position, _quaternion, _scale);
      proxy.matrix.copy(proxy.matrixWorld);
    }
    for (const [entry, proxy] of this.proxyOf) {
      if (keep.has(entry)) continue;
      this.proxyOf.delete(entry);
      this.bodyOf.delete(proxy);
    }
    this.proxies.length = 0;
    for (const proxy of this.proxyOf.values()) this.proxies.push(proxy);
    return this.proxies;
  }

  /** Die Wand hinter einem Kasten — `null` für jede andere Fläche. */
  wallOf(object: THREE.Object3D): PhysicsBody | null {
    return this.bodyOf.get(object) ?? null;
  }

  /**
   * **Ein Portal geht jetzt durch diese Wände** — sie bekommen das Portalbit
   * als Mitgliedschaft, und was im Trichter steht, darf hindurch. Die Wände
   * eines früheren Platzes desselben Portals werden vorher freigegeben.
   */
  claim(key: PortalKey, bodies: readonly PhysicsBody[], physics: PhysicsWorld): void {
    this.release(key, physics);
    if (bodies.length === 0) return;
    const claim: Claim = { bodies: [...bodies], at: [] };
    for (const entry of bodies) {
      if (!this.home.has(entry)) this.home.set(entry, entry.membership);
      const t = entry.body.translation();
      claim.at.push(new THREE.Vector3(t.x, t.y, t.z));
      physics.setMembership(entry, this.group);
    }
    this.claims.set(key, claim);
  }

  /** Das Portal ist weg oder woanders: seine Wände werden wieder, was sie waren. */
  release(key: PortalKey, physics: PhysicsWorld): void {
    const claim = this.claims.get(key);
    if (!claim) return;
    this.claims.delete(key);
    for (const entry of claim.bodies) {
      if (this.claimed(entry)) continue;
      const home = this.home.get(entry);
      this.home.delete(entry);
      if (home !== undefined && !entry.removed) physics.setMembership(entry, home);
    }
  }

  /** Ob ein Portal auf Katalogwänden sitzt. */
  holds(key: PortalKey): boolean {
    return this.claims.has(key);
  }

  /**
   * **Ob die Wand unter einem Portal weg ist** — weggenommen, getragen oder
   * verschoben. Dann schließt das Portal, statt in der Luft zu hängen.
   */
  stale(key: PortalKey): boolean {
    const claim = this.claims.get(key);
    if (!claim) return false;
    for (let i = 0; i < claim.bodies.length; i++) {
      const entry = claim.bodies[i]!;
      if (entry.removed || entry.carried) return true;
      const t = entry.body.translation();
      if (claim.at[i]!.distanceToSquared(_position.set(t.x, t.y, t.z)) > MOVED * MOVED) return true;
    }
    return false;
  }

  private claimed(entry: PhysicsBody): boolean {
    for (const claim of this.claims.values()) if (claim.bodies.includes(entry)) return true;
    return false;
  }
}
