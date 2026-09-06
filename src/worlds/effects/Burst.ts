import * as THREE from 'three';
import { cloudFade, seedCloud, stepCloud, type Cloud } from './effectBurst';
import type { EffectKind } from './effectKinds';

/**
 * **Eine Wolke, wie man sie sieht** — die Zahlen aus `effectBurst.ts` als
 * Punkthaufen.
 *
 * Punkte und keine Kugeln: vierhundert Kugeln je Knall wären ein Einbruch der
 * Bildrate für etwas, das eine Sekunde dauert. Ein `THREE.Points` geht in
 * *einem* Zeichenaufruf durch, und die Farbe steckt in den Punkten selbst, weil
 * jeder eine andere aus dem Verlauf des Effekts bekommt.
 *
 * Was leuchtet, wird **additiv** gemischt und schreibt keine Tiefe: Feuer und
 * Funken addieren sich zu hellen Stellen, wo viele übereinanderliegen. Rauch
 * und Staub tun das nicht — sie verdecken, und genau das ist der Unterschied
 * zwischen einer Rauchwolke und einer Wolke aus Licht.
 */
export class Burst extends THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> {
  private readonly cloud: Cloud;
  private readonly kind: EffectKind;
  /** Der Blitz im ersten Augenblick — nur bei dem, was von selbst leuchtet. */
  private readonly light: THREE.PointLight | null;
  private readonly flash: number;
  /** Auf welcher Höhe die Partikel liegenbleiben. */
  private readonly floor: number;

  constructor(kind: EffectKind, origin: THREE.Vector3, floor = 0) {
    const cloud = seedCloud(kind, origin);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(cloud.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(cloud.colors, 3));
    super(
      geometry,
      new THREE.PointsMaterial({
        size: kind.size,
        // Ohne Bild ist ein Punkt ein **Quadrat**, und eine Rauchwolke aus
        // Quadraten sieht aus wie ein Bildfehler. Der weiche Fleck kostet eine
        // 64er-Textur, einmal für alle Wolken.
        map: puffTexture(),
        vertexColors: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
        blending: kind.glow ? THREE.AdditiveBlending : THREE.NormalBlending,
      }),
    );
    this.name = `burst:${kind.id}`;
    this.frustumCulled = false;
    this.cloud = cloud;
    this.kind = kind;
    this.floor = floor;
    this.flash = kind.flash;

    if (kind.flash > 0) {
      this.light = new THREE.PointLight(kind.from, kind.flash, kind.size * 60, 2);
      this.light.position.copy(origin);
      this.add(this.light);
    } else {
      this.light = null;
    }
  }

  /** Ein Bild weiter. Falsch, sobald die Wolke durch ist. */
  update(dt: number): boolean {
    const alive = stepCloud(this.cloud, this.kind, dt, this.floor);
    const fade = cloudFade(this.cloud);
    this.geometry.attributes['position']!.needsUpdate = true;
    this.material.opacity = fade;
    // Das Licht ist ein Blitz und kein Scheinwerfer: es ist nach einem Fünftel
    // der Lebenszeit weg, auch wenn die Glut noch fliegt.
    if (this.light) {
      const t = Math.min(1, this.cloud.age / Math.max(0.001, this.cloud.life * 0.2));
      this.light.intensity = this.flash * (1 - t);
    }
    return alive;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.removeFromParent();
  }
}

/** Der weiche Fleck, aus dem jedes Partikel besteht — einmal gebaut, für alle. */
let puff: THREE.CanvasTexture | null = null;

function puffTexture(): THREE.CanvasTexture {
  if (puff) return puff;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  // Innen voll, außen nichts — und dazwischen nicht linear: ein linearer
  // Verlauf sieht aus wie eine Scheibe mit weichem Rand, dieser wie ein Puff.
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.75)');
  gradient.addColorStop(0.7, 'rgba(255,255,255,0.2)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  puff = new THREE.CanvasTexture(canvas);
  puff.colorSpace = THREE.SRGBColorSpace;
  return puff;
}
