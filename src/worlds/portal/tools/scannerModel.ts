import * as THREE from 'three';

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
  for (const [w, h, x, y] of [
    [SCANNER_WIDTH + bar * 2, bar, 0, SCANNER_HEIGHT / 2 + bar / 2],
    [SCANNER_WIDTH + bar * 2, bar, 0, -SCANNER_HEIGHT / 2 - bar / 2],
    [bar, SCANNER_HEIGHT, -SCANNER_WIDTH / 2 - bar / 2, 0],
    [bar, SCANNER_HEIGHT, SCANNER_WIDTH / 2 + bar / 2, 0],
  ] as const) {
    const piece = new THREE.Mesh(roundedHousing(w, h), shell);
    piece.position.set(x, y, 0);
    frame.add(piece);
  }
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.1, 0.003), glow);
    rail.position.set(side * (SCANNER_WIDTH / 2 + 0.012), 0, 0.015);
    frame.add(rail);
    for (const top of [-1, 1]) {
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.004, 8), trim);
      screw.rotation.x = Math.PI / 2;
      screw.position.set(
        side * (SCANNER_WIDTH / 2 + 0.01),
        top * (SCANNER_HEIGHT / 2 + 0.012),
        0.014,
      );
      frame.add(screw);
    }
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
