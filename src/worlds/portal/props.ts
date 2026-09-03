import * as THREE from 'three';

/** Weighted Companion Cube — canvas texture, no asset download. */
export function createCompanionCube(size = 0.5): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#c9d2e0';
  ctx.fillRect(0, 0, 256, 256);

  // Corner plates
  ctx.fillStyle = '#7f8ea6';
  const plate = 44;
  for (const [x, y] of [
    [0, 0],
    [256 - plate, 0],
    [0, 256 - plate],
    [256 - plate, 256 - plate],
  ] as const) {
    ctx.fillRect(x, y, plate, plate);
  }

  ctx.strokeStyle = '#6b7a92';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 248, 248);

  // Centre disc with a heart
  ctx.beginPath();
  ctx.arc(128, 128, 62, 0, Math.PI * 2);
  ctx.fillStyle = '#eef2f8';
  ctx.fill();
  ctx.lineWidth = 7;
  ctx.strokeStyle = '#7f8ea6';
  ctx.stroke();

  ctx.fillStyle = '#ff6ea3';
  ctx.beginPath();
  ctx.moveTo(128, 168);
  ctx.bezierCurveTo(74, 132, 88, 86, 128, 108);
  ctx.bezierCurveTo(168, 86, 182, 132, 128, 168);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(size, size, size),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.55, metalness: 0.2 }),
  );
  cube.name = 'companion-cube';
  return cube;
}

export const DOMINO_SIZE = new THREE.Vector3(0.09, 0.18, 0.025);

/** A row of dominoes, ready to be knocked over. */
export function createDominoes(count: number, accent: number): THREE.Mesh[] {
  const geometry = new THREE.BoxGeometry(DOMINO_SIZE.x, DOMINO_SIZE.y, DOMINO_SIZE.z);
  const dominoes: THREE.Mesh[] = [];
  for (let i = 0; i < count; i++) {
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(accent).lerp(new THREE.Color(0xffffff), i / count),
      roughness: 0.35,
      metalness: 0.1,
    });
    const domino = new THREE.Mesh(geometry, material);
    domino.name = `domino-${i}`;
    dominoes.push(domino);
  }
  return dominoes;
}
