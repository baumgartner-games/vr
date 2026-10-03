import * as THREE from 'three';
import { LAYER_EYE } from './viewLayers';

/**
 * **Das Gradnetz im Kalibrier-Helm** — farbige Linien in festen Winkeln vor
 * dem Auge, damit man in der Brille ablesen kann, wie weit man sieht.
 *
 * Gewünscht: _„damit du die kamera sauber positionieren kannst, sollten wir
 * einen hut immersive anlegen zum kalibrieren der ansicht. Dabei sollen
 * verschiedene horizontale und vertikale linien in unterschiedlichen farben
 * dargestellt werden. Ich nenne dir dann bis wohin ich in der quest 3 sehen
 * kann."_ Getragen wird es mit dem Hut _Kalibrier-Helm · Immersiv_
 * (`figureParts.CALIBRATION_HAT`): derselbe Helm wie der immersive des Space
 * Rangers, dazu dieses Netz (`core/selfHelmet.ts`).
 *
 * - **Senkrechte Linien** stehen links und rechts der Mitte alle 10° (`STEPS`),
 *   **waagerechte** darüber und darunter; die Mitte selbst ist grün.
 * - **Jede Zehnerstufe hat ihre Farbe** (`STEP_COLORS`), links wie rechts und
 *   oben wie unten dieselbe, und trägt ihr Schild: `←30°`, `30°→`, `↑20°`,
 *   `↓20°`. Man sagt also „rechts bis Orange, oben bis Gelb" — oder die Zahl.
 * - Alles liegt auf einer Kugel um das Auge (`RADIUS`), hängt an der Kamera
 *   und wird **ohne Tiefe** über alles gezeichnet, auch über den Helm: So
 *   sieht man, bei welchem Winkel die Schale anfängt. Nur das Menü bleibt
 *   darüber (`ORDER` unter `XRMenu.PANEL_ORDER`).
 * - Die Linien sind schmale Bänder und keine `THREE.Line`: Eine Linie ist in
 *   WebGL einen Bildpunkt breit, und das flimmert in der Brille.
 */

/** Wie weit das Netz vor dem Auge liegt, in Metern. */
export const RADIUS = 1;
/** Die Stufen in Grad, von der Mitte aus. */
export const STEPS = [10, 20, 30, 40, 50, 60, 70, 80] as const;
/** Die Farbe je Stufe — dieselbe Reihenfolge wie `STEPS`. */
export const STEP_COLORS = [
  0xffffff, // 10 weiß
  0xffe14a, // 20 gelb
  0xff9a3c, // 30 orange
  0xff4a4a, // 40 rot
  0xff4ad8, // 50 pink
  0x9a6bff, // 60 lila
  0x4aa8ff, // 70 blau
  0x4af0e0, // 80 türkis
] as const;
/** Die Mitte. */
const CENTRE_COLOR = 0x5ee0a0;
/** Wie hoch hinauf und hinab es höchstens geht — weiter sieht keine Brille. */
const MAX_ELEVATION = 70;
const MAX_AZIMUTH = 90;
/** Wie breit ein Band ist, in Metern auf der Kugel (rund ein Viertelgrad). */
const BAND = 0.004;
/** Wie hoch ein Schild ist, in Metern auf der Kugel (rund drei Grad). */
const LABEL_H = 0.05;
/** Über Glas und Beschlag (8, 9), unter dem Menü (10). */
export const ORDER = 9.5;

const DEG = Math.PI / 180;

/** Ein Punkt auf der Kugel: `azimuth` nach rechts, `elevation` nach oben, in Grad. */
export function onSphere(azimuth: number, elevation: number, radius = RADIUS): THREE.Vector3 {
  const a = azimuth * DEG;
  const e = elevation * DEG;
  return new THREE.Vector3(
    Math.sin(a) * Math.cos(e) * radius,
    Math.sin(e) * radius,
    -Math.cos(a) * Math.cos(e) * radius,
  );
}

/** Die Linien des Netzes als reine Zahlen — was der Test prüft. */
export interface CalibrationLine {
  readonly kind: 'vertical' | 'horizontal';
  /** Winkel von der Mitte: negativ links bzw. unten. */
  readonly angle: number;
  readonly color: number;
  readonly label: string;
}

export function calibrationLines(): CalibrationLine[] {
  const lines: CalibrationLine[] = [
    { kind: 'vertical', angle: 0, color: CENTRE_COLOR, label: '0°' },
    { kind: 'horizontal', angle: 0, color: CENTRE_COLOR, label: '0°' },
  ];
  STEPS.forEach((step, index) => {
    const color = STEP_COLORS[index]!;
    lines.push(
      { kind: 'vertical', angle: -step, color, label: `←${step}°` },
      { kind: 'vertical', angle: step, color, label: `${step}°→` },
    );
    if (step <= MAX_ELEVATION) {
      lines.push(
        { kind: 'horizontal', angle: step, color, label: `↑${step}°` },
        { kind: 'horizontal', angle: -step, color, label: `↓${step}°` },
      );
    }
  });
  return lines;
}

/** **Das Netz bauen** — eine Gruppe für die Kamera. */
export function viewCalibration(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'view-calibration';
  for (const line of calibrationLines()) {
    const points: THREE.Vector3[] = [];
    if (line.kind === 'vertical') {
      for (let e = -MAX_ELEVATION; e <= MAX_ELEVATION; e += 2) points.push(onSphere(line.angle, e));
    } else {
      for (let a = -MAX_AZIMUTH; a <= MAX_AZIMUTH; a += 2) points.push(onSphere(a, line.angle));
    }
    group.add(band(points, line.color));
    // Die Schilder: senkrechte knapp über und deutlich unter dem Horizont,
    // waagerechte knapp rechts und links der Mitte — so steht jede Zahl auch
    // dann im Bild, wenn nur ein Teil der Linie zu sehen ist.
    const spots: [number, number][] =
      line.kind === 'vertical'
        ? [
            [line.angle, 3],
            [line.angle, -35],
          ]
        : [
            [4, line.angle],
            [-25, line.angle],
          ];
    for (const [a, e] of spots) group.add(label(line.label, line.color, onSphere(a, e)));
  }
  group.traverse((object) => {
    object.layers.set(LAYER_EYE);
    object.frustumCulled = false;
    object.renderOrder = ORDER;
  });
  return group;
}

/** Ein schmales Band entlang der Punkte, zur Mitte der Kugel gedreht. */
function band(points: readonly THREE.Vector3[], color: number): THREE.Mesh {
  const positions: number[] = [];
  const index: number[] = [];
  const tangent = new THREE.Vector3();
  const side = new THREE.Vector3();
  points.forEach((point, i) => {
    const before = points[Math.max(0, i - 1)]!;
    const after = points[Math.min(points.length - 1, i + 1)]!;
    tangent.subVectors(after, before).normalize();
    side
      .crossVectors(tangent, point)
      .normalize()
      .multiplyScalar(BAND / 2);
    positions.push(point.x + side.x, point.y + side.y, point.z + side.z);
    positions.push(point.x - side.x, point.y - side.y, point.z - side.z);
    if (i > 0) {
      const a = (i - 1) * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  const material = new THREE.MeshBasicMaterial({
    color,
    side: THREE.DoubleSide,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  return new THREE.Mesh(geometry, material);
}

/** Ein Schild mit der Gradzahl, als Sprite (immer zum Auge gedreht). */
function label(text: string, color: number, at: THREE.Vector3): THREE.Object3D {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ depthTest: false, depthWrite: false, toneMapped: false }),
  );
  sprite.position.copy(at);
  sprite.scale.set(LABEL_H * 2, LABEL_H, 1);
  if (typeof document === 'undefined') return sprite;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const g = canvas.getContext('2d');
  if (!g) return sprite;
  g.fillStyle = 'rgba(6, 10, 20, 0.7)';
  g.beginPath();
  g.roundRect(8, 16, 240, 96, 24);
  g.fill();
  g.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
  g.font = '700 64px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 128, 66);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  sprite.material.map = texture;
  sprite.material.needsUpdate = true;
  return sprite;
}

/** Alles wieder freigeben. */
export function disposeCalibration(group: THREE.Object3D): void {
  group.removeFromParent();
  group.traverse((object) => {
    const mesh = object as THREE.Mesh | THREE.Sprite;
    if (!(mesh as THREE.Mesh).isMesh && !(mesh as THREE.Sprite).isSprite) return;
    // Sprites teilen sich eine Geometrie in three.js — die bleibt.
    if ((mesh as THREE.Mesh).isMesh) mesh.geometry.dispose();
    const material = mesh.material as THREE.MeshBasicMaterial | THREE.SpriteMaterial;
    material.map?.dispose();
    material.dispose();
  });
}
