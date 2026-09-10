import * as THREE from 'three';
import { TILE } from '../../nav/navTile';
import { missionExtent, type HouseSpec } from '../house';

/**
 * **Der Weltraum um die Station — als Geometrie, nicht als Löschfarbe.**
 *
 * Bis hierher war „draußen" nur `scene.background`, eine Farbe, mit der
 * three.js den Puffer löscht. Das trägt in einer `immersive-vr`-Sitzung und
 * am Schreibtisch, aber nicht in der Sitzung, die `App.enterVR` **zuerst**
 * anfragt: `immersive-ar`. Dort meldet die Brille `environmentBlendMode:
 * 'alpha-blend'`, und `WebGLBackground` löscht dann grundsätzlich auf
 * durchsichtig — eine Hintergrundfarbe wird ausdrücklich übergangen, damit
 * das Kamerabild durchkommt. Durch jedes Hüllenfenster sah man deshalb das
 * eigene Wohnzimmer.
 *
 * Die Welt kann sich die Sitzungsart nicht aussuchen (sie läuft, wenn die
 * Welt geladen wird, und sie wird zwischen Welten nicht gewechselt). Was sie
 * kann: den Weltraum **zeichnen**. Eine Kugel von innen, dunkelblau, und
 * darin Sterne als Punkte mit fester Pixelgröße — zwei Draw-Calls, die in
 * jeder Sitzungsart dasselbe Bild ergeben. Die alten 960 Punkte mit 16 cm
 * Durchmesser in 100 m Entfernung waren kleiner als ein Pixel und deshalb
 * nie zu sehen.
 *
 * Beide Teile werden **nach** der Hülle gezeichnet (`renderOrder`): Was
 * hinter einer Wand liegt, verwirft der Tiefentest, bevor ein Fragment
 * gerechnet wird. Vorher gezeichnet würde die Kugel jedes Bild einmal ganz
 * übermalt.
 */

/** Dieselbe Farbe wie `HauntingWorld.skyColor` — ein Abend, keine Nacht. */
export const SPACE_COLOR = 0x020711;

/** Wie weit die Kugel reicht — jenseits der Lehrzimmer, diesseits von `camera.far`. */
export const SPACE_RADIUS = 320;

/** Wie viele Sterne, und wie groß sie auf der Brille sind (Pixel). */
export const STAR_COUNT = 1400;
export const STAR_SIZE = 2.2;

/** Ein kleiner, fester Zufall: derselbe Himmel bei jedem Laden. */
function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Wo die Kugel steht: über der Mitte der Mission samt Zentrale. */
export function backdropCentre(spec: HouseSpec): { x: number; z: number } {
  const extent = missionExtent(spec);
  return { x: (extent.x + extent.w / 2) * TILE, z: (extent.z + extent.d / 2) * TILE };
}

export function buildSpaceBackdrop(spec: HouseSpec): THREE.Group {
  const group = new THREE.Group();
  group.name = 'station-space';
  const centre = backdropCentre(spec);
  group.position.set(centre.x, 0, centre.z);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(SPACE_RADIUS, 24, 12),
    new THREE.MeshBasicMaterial({
      color: SPACE_COLOR,
      side: THREE.BackSide,
      fog: false,
      toneMapped: false,
    }),
  );
  dome.name = 'station-space-dome';
  dome.renderOrder = 1;
  group.add(dome);

  const random = mulberry(spec.seed || 1);
  const positions = new Float32Array(STAR_COUNT * 3);
  const colors = new Float32Array(STAR_COUNT * 3);
  const tint = new THREE.Color();
  for (let i = 0; i < STAR_COUNT; i++) {
    // Gleichverteilt auf der Kugel, nicht an den Polen gehäuft.
    const y = 1 - random() * 2;
    const r = Math.sqrt(1 - y * y);
    const angle = random() * Math.PI * 2;
    const distance = SPACE_RADIUS * 0.94;
    positions[i * 3] = Math.cos(angle) * r * distance;
    positions[i * 3 + 1] = y * distance;
    positions[i * 3 + 2] = Math.sin(angle) * r * distance;
    // Die meisten Sterne blass, ein paar hell, ein paar leicht warm.
    const bright = random();
    const glow = 0.35 + bright * bright * 0.65;
    tint.setRGB(glow, glow * (0.96 + random() * 0.04), glow * (0.92 + random() * 0.1));
    colors[i * 3] = tint.r;
    colors[i * 3 + 1] = tint.g;
    colors[i * 3 + 2] = tint.b;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const stars = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: STAR_SIZE,
      sizeAttenuation: false,
      vertexColors: true,
      fog: false,
      toneMapped: false,
    }),
  );
  stars.name = 'station-starfield';
  stars.renderOrder = 2;
  group.add(stars);
  return group;
}
