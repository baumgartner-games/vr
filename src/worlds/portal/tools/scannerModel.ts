import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const SCANNER_WIDTH = 0.26;
export const SCANNER_HEIGHT = 0.19;

/** The same field instrument housing fits a transparent scanner or radar display. */
export function scannerFrame(accent = 0x7ff0ff): THREE.Group {
  const frame = new THREE.Group();
  frame.name = 'scanner-frame';
  frame.position.y = SCANNER_HEIGHT / 2 + 0.075;
  const shell = new THREE.MeshStandardMaterial({
    color: 0x223445,
    roughness: 0.44,
    metalness: 0.45,
  });
  const trim = new THREE.MeshStandardMaterial({ color: 0xabc5cc, roughness: 0.32, metalness: 0.6 });
  const glow = new THREE.MeshBasicMaterial({ color: accent, toneMapped: false });
  const bar = 0.024;
  // **Ein Netz je Material** statt zehn Teilen: Rahmen, Leuchtleisten und
  // Schrauben sind fest miteinander verbunden, also werden sie zu je einem
  // Netz gebacken. In der Brille zählt jeder Zeichenaufruf doppelt (je Auge),
  // und zwei Geräte auf dem Ausrüstungstisch waren so über 40 davon —
  // gemeldet _„wir sind bei 23 fps ungefähr"_.
  const shells: THREE.BufferGeometry[] = [];
  const rails: THREE.BufferGeometry[] = [];
  const screws: THREE.BufferGeometry[] = [];
  for (const [w, h, x, y] of [
    [SCANNER_WIDTH + bar * 2, bar, 0, SCANNER_HEIGHT / 2 + bar / 2],
    [SCANNER_WIDTH + bar * 2, bar, 0, -SCANNER_HEIGHT / 2 - bar / 2],
    [bar, SCANNER_HEIGHT, -SCANNER_WIDTH / 2 - bar / 2, 0],
    [bar, SCANNER_HEIGHT, SCANNER_WIDTH / 2 + bar / 2, 0],
  ] as const) {
    shells.push(roundedHousing(w, h).translate(x, y, 0));
  }
  for (const side of [-1, 1]) {
    rails.push(
      new THREE.BoxGeometry(0.003, 0.1, 0.003).translate(
        side * (SCANNER_WIDTH / 2 + 0.012),
        0,
        0.015,
      ),
    );
    for (const top of [-1, 1]) {
      screws.push(
        new THREE.CylinderGeometry(0.003, 0.003, 0.004, 8)
          .rotateX(Math.PI / 2)
          .translate(side * (SCANNER_WIDTH / 2 + 0.01), top * (SCANNER_HEIGHT / 2 + 0.012), 0.014),
      );
    }
  }
  for (const [parts, material] of [
    [shells, shell],
    [rails, glow],
    [screws, trim],
  ] as const) {
    frame.add(new THREE.Mesh(bakeParts(parts), material));
  }
  return frame;
}

function roundedHousing(width: number, height: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const w = width / 2 - 0.004,
    h = height / 2 - 0.004;
  shape.moveTo(-w, -h);
  shape.lineTo(w, -h);
  shape.lineTo(w, h);
  shape.lineTo(-w, h);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.018,
    bevelEnabled: true,
    bevelSize: 0.004,
    bevelThickness: 0.004,
    bevelSegments: 2,
    steps: 1,
  });
  geometry.translate(0, 0, -0.009);
  return geometry;
}

/** Die Teile zu einem Netz — ohne Gruppen, die Einzelteile werden freigegeben. */
function bakeParts(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const flat = parts.map((part) => {
    const plain = part.index ? part.toNonIndexed() : part;
    if (plain !== part) part.dispose();
    plain.clearGroups();
    return plain;
  });
  const merged = mergeGeometries(flat, false) ?? flat[0]!;
  for (const part of flat) if (part !== merged) part.dispose();
  return merged;
}
