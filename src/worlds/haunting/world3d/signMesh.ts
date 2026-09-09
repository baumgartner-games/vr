import * as THREE from 'three';
import { PLAN_DOOR_H, PLAN_WALL_H } from '../../editor/levelPlan';
import type { Signpost } from './signposts';

/**
 * **Alle Wegweiser eines Raums in einem Mesh** — und alle Texte in einem
 * Atlas.
 *
 * Das Raumschild in `shipArt.label` ist ein eigenes Canvas, eine eigene
 * Textur, ein eigenes Material je Schild: für zwei Schilder je Raum in
 * Ordnung, für siebzig Wegweiser nicht — auf der Brille wären das siebzig
 * Draw-Calls mehr, jeder mit Texturwechsel. Hier werden alle Texte einmal in
 * **ein** Canvas gemalt (eine Zelle je Schild), und die Schilder eines Raums
 * werden zu **einer** Geometrie mit UVs in diese Zellen. Ein Material, eine
 * Textur, ein Draw-Call je sichtbarem Raum — und der Raum-Culler der Welt
 * schaltet sie mit dem Raum ab, weil sie in dessen Gruppe hängen.
 *
 * Das Schild hängt **über** dem Türkopf: Die Statusleuchte der Schiebetür
 * (bis 2,30 m) und das Rohr darüber (2,38 m) bleiben frei; zur Decke bleibt
 * Luft.
 */

/** Zellenmaß im Atlas: breit und flach wie das Schild. */
export const CELL_W = 512;
export const CELL_H = 80;
/** Zellen je Zeile — vier ergeben 2048 Pixel Breite. */
export const COLUMNS = 4;
/** Unterkante und Oberkante des Bandes, in dem Wegweiser hängen. */
export const SIGN_BOTTOM = PLAN_DOOR_H + 0.3;
export const SIGN_TOP = PLAN_WALL_H - 0.06;
/** Höhe eines Schilds aus seiner Breite — das Seitenverhältnis der Zelle. */
export function signHeight(width: number): number {
  return Math.min(SIGN_TOP - SIGN_BOTTOM, (width * CELL_H) / CELL_W);
}

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

/**
 * Die Akzentfarbe eines Schilds — die Farbe des Ziels, nicht des Raums, in
 * dem es hängt. Kommt von außen (`shipArt.roomAccent`), damit diese Datei
 * die Hülle nicht importieren muss, die ihrerseits sie importiert.
 */
export type SignAccent = (sign: Signpost) => number;

/** Malt eine Zelle je Schild und gibt die Textur samt Zellenraster zurück. */
export function buildSignAtlas(
  signs: readonly Signpost[],
  accentOf: SignAccent,
): {
  texture: THREE.CanvasTexture;
  columns: number;
  rows: number;
} {
  const rows = Math.max(1, Math.ceil(signs.length / COLUMNS));
  const canvas = document.createElement('canvas');
  canvas.width = CELL_W * COLUMNS;
  canvas.height = CELL_H * rows;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#101f31';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  signs.forEach((sign, index) => {
    const x0 = (index % COLUMNS) * CELL_W;
    const y0 = Math.floor(index / COLUMNS) * CELL_H;
    const accent = hex(accentOf(sign));
    ctx.fillStyle = accent;
    ctx.fillRect(x0, y0, 7, CELL_H);
    // Ein Pixel Rand zwischen den Zellen, damit die Filterung keine Nachbarn ansaugt.
    ctx.fillStyle = '#101f31';
    ctx.fillRect(x0, y0 + CELL_H - 2, CELL_W, 2);
    const centreX = x0 + 4 + CELL_W / 2;
    const maxWidth = CELL_W - 40;
    if (sign.detail) {
      ctx.font = `800 34px system-ui`;
      ctx.fillStyle = '#f3fbff';
      ctx.fillText(sign.title, centreX, y0 + 24, maxWidth);
      ctx.font = `600 22px system-ui`;
      ctx.fillStyle = accent;
      ctx.fillText(sign.detail, centreX, y0 + 56, maxWidth);
    } else {
      ctx.font = `800 42px system-ui`;
      ctx.fillStyle = '#f3fbff';
      ctx.fillText(sign.title, centreX, y0 + CELL_H / 2, maxWidth);
    }
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  // Schräg von der Seite gelesen — im Gang der Normalfall — bleibt die Schrift scharf.
  texture.anisotropy = 4;
  return { texture, columns: COLUMNS, rows };
}

/**
 * Ein Mesh je Raum (`spaceId`), alle mit demselben Material. Die Geometrie
 * liegt in Weltkoordinaten, weil die Raumgruppen der Hülle das auch tun.
 */
export function buildSignMeshes(
  signs: readonly Signpost[],
  accentOf: SignAccent,
): Map<string, THREE.Mesh> {
  const out = new Map<string, THREE.Mesh>();
  if (signs.length === 0) return out;
  const { texture, columns, rows } = buildSignAtlas(signs, accentOf);
  const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
  const bySpace = new Map<string, number[]>();
  signs.forEach((sign, index) => {
    const list = bySpace.get(sign.spaceId) ?? [];
    list.push(index);
    bySpace.set(sign.spaceId, list);
  });
  const _point = new THREE.Vector3();
  const _at = new THREE.Vector3();
  const _one = new THREE.Vector3(1, 1, 1);
  const _matrix = new THREE.Matrix4();
  const _quaternion = new THREE.Quaternion();
  const _up = new THREE.Vector3(0, 1, 0);
  for (const [spaceId, indices] of bySpace) {
    const positions = new Float32Array(indices.length * 4 * 3);
    const uvs = new Float32Array(indices.length * 4 * 2);
    const index = new Uint16Array(indices.length * 6);
    indices.forEach((at, n) => {
      const sign = signs[at]!;
      const height = signHeight(sign.width);
      const y = (SIGN_BOTTOM + SIGN_TOP) / 2;
      _quaternion.setFromAxisAngle(_up, sign.yaw);
      _matrix.compose(_at.set(sign.x, y, sign.z), _quaternion, _one);
      // Ecken einer `PlaneGeometry(width, height)`: links oben, rechts oben, links unten, rechts unten.
      const corners: Array<[number, number]> = [
        [-sign.width / 2, height / 2],
        [sign.width / 2, height / 2],
        [-sign.width / 2, -height / 2],
        [sign.width / 2, -height / 2],
      ];
      const column = at % columns;
      const row = Math.floor(at / columns);
      // Ein paar Pixel Rand je Zelle, damit an der Kante nichts vom Nachbarn erscheint.
      const u0 = (column * CELL_W + 2) / (CELL_W * columns);
      const u1 = ((column + 1) * CELL_W - 2) / (CELL_W * columns);
      // Canvas zählt von oben, UV von unten.
      const v1 = 1 - (row * CELL_H + 2) / (CELL_H * rows);
      const v0 = 1 - ((row + 1) * CELL_H - 2) / (CELL_H * rows);
      const uvCorners: Array<[number, number]> = [
        [u0, v1],
        [u1, v1],
        [u0, v0],
        [u1, v0],
      ];
      corners.forEach(([cx, cy], k) => {
        _point.set(cx, cy, 0).applyMatrix4(_matrix);
        const vertex = (n * 4 + k) * 3;
        positions[vertex] = _point.x;
        positions[vertex + 1] = _point.y;
        positions[vertex + 2] = _point.z;
        uvs[(n * 4 + k) * 2] = uvCorners[k]![0];
        uvs[(n * 4 + k) * 2 + 1] = uvCorners[k]![1];
      });
      const base = n * 4;
      index.set([base, base + 2, base + 1, base + 2, base + 3, base + 1], n * 6);
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(index, 1));
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'wayfinding-signs';
    mesh.userData.spaceId = spaceId;
    mesh.userData.signs = indices.map((at) => signs[at]!.openingId);
    mesh.userData.surfaceClearance = 0.24;
    out.set(spaceId, mesh);
  }
  return out;
}
