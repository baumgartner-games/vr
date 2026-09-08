import { APRON, MARKS, type HouseSpec, type Rect } from './house';
import { TILE, dirX, dirZ } from '../nav/navTile';
import { stationLayout } from './stationLayout';
import { fitView, type ArchiveView } from './archiveView';

export interface MapProjection {
  scale: number;
  x: number;
  z: number;
  width: number;
  height: number;
}

/** Static chart only: no player, monster or drone positions enter this renderer. */
export interface ArchiveMapInfo {
  selected: string;
  shut: readonly string[];
}

export function archiveBounds(spec: HouseSpec): Rect {
  const rects = [...spec.rooms.map((room) => room.rect), APRON];
  const x = Math.min(...rects.map((r) => r.x));
  const z = Math.min(...rects.map((r) => r.z));
  return {
    x,
    z,
    w: Math.max(...rects.map((r) => r.x + r.w)) - x,
    d: Math.max(...rects.map((r) => r.z + r.d)) - z,
  };
}

/** One transform shared by drawing and tapping, in grid tiles, not world metres. */
export function archiveProjection(
  spec: HouseSpec,
  width: number,
  height: number,
  view: ArchiveView,
): MapProjection {
  const bounds = archiveBounds(spec);
  const fit = fitView(view, bounds.w / 2, bounds.d / 2);
  const scale = Math.max(1, Math.min((width - 28) / bounds.w, (height - 28) / bounds.d)) * fit.zoom;
  return {
    scale,
    x: width / 2 - (bounds.x + bounds.w / 2 + fit.x) * scale,
    z: height / 2 - (bounds.z + bounds.d / 2 + fit.z) * scale,
    width,
    height,
  };
}

export function archiveRoomAt(
  spec: HouseSpec,
  projection: MapProjection,
  px: number,
  py: number,
): string | null {
  if (px < 0 || py < 0 || px > projection.width || py > projection.height) return null;
  const x = (px - projection.x) / projection.scale;
  const z = (py - projection.z) / projection.scale;
  return (
    spec.rooms.find(
      (room) =>
        x >= room.rect.x &&
        z >= room.rect.z &&
        x < room.rect.x + room.rect.w &&
        z < room.rect.z + room.rect.d,
    )?.id ?? null
  );
}

export function paintArchiveMap(
  c: CanvasRenderingContext2D,
  spec: HouseSpec,
  info: ArchiveMapInfo,
  p: MapProjection,
  mini: boolean,
): void {
  const fixtures = mini
    ? []
    : stationLayout(spec).filter((placement) => placement.kind === 'fixture');
  const px = (x: number): number => p.x + x * p.scale;
  const pz = (z: number): number => p.z + z * p.scale;
  c.fillStyle = '#061019';
  c.fillRect(0, 0, p.width, p.height);
  c.save();
  c.beginPath();
  c.rect(0, 0, p.width, p.height);
  c.clip();
  c.lineWidth = 1;
  c.strokeStyle = '#102630';
  const step = Math.max(10, p.scale);
  for (let x = p.x % step; x < p.width; x += step) {
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, p.height);
    c.stroke();
  }
  for (let y = p.z % step; y < p.height; y += step) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(p.width, y);
    c.stroke();
  }
  c.fillStyle = '#16333a';
  c.fillRect(px(APRON.x), pz(APRON.z), APRON.w * p.scale, APRON.d * p.scale);
  c.strokeStyle = '#619090';
  c.lineWidth = 2;
  c.strokeRect(px(APRON.x), pz(APRON.z), APRON.w * p.scale, APRON.d * p.scale);
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = '#9be0ca';
  c.font = '600 12px system-ui';
  c.fillText('EINSATZZENTRALE', px(APRON.x + APRON.w / 2), pz(APRON.z + APRON.d / 2));
  spec.rooms.forEach((room, index) => {
    const selected = room.id === info.selected;
    const r = room.rect;
    const x = px(r.x),
      y = pz(r.z),
      w = r.w * p.scale,
      h = r.d * p.scale;
    c.fillStyle = selected ? '#393722' : '#12232e';
    c.fillRect(x, y, w, h);
    c.strokeStyle = selected ? '#f5ce78' : '#7290a1';
    c.lineWidth = selected ? 3 : 2;
    c.strokeRect(x, y, w, h);
    if (!mini) {
      for (const mark of fixtures.filter((placement) => placement.roomId === room.id)) {
        c.save();
        c.translate(px(mark.x / TILE), pz(mark.z / TILE));
        c.rotate(-mark.yaw);
        c.fillStyle = '#355569';
        const side = Math.min(14, p.scale * 0.34);
        c.fillRect(-side, -side * 0.6, side * 2, side * 1.2);
        c.fillStyle = '#65bec6';
        c.fillRect(-side, side * 0.3, side * 2, Math.max(1.5, side * 0.2));
        c.restore();
      }
    }
    c.fillStyle = selected ? '#ffe6ac' : '#d5e3e9';
    const size = mini ? 11 : Math.min(16, Math.max(11, w / 12));
    c.font = `600 ${size}px system-ui`;
    c.textAlign = 'center';
    if (w < 85 || h < 65) {
      c.fillText(`R${String(index + 1).padStart(2, '0')}`, x + w / 2, y + h / 2);
    } else {
      const lines = wrapLabel(c, room.name, w - 14);
      lines
        .slice(0, 2)
        .forEach((line, lineIndex) =>
          c.fillText(
            line,
            x + w / 2,
            y + h / 2 + (lineIndex - (Math.min(2, lines.length) - 1) / 2) * (size + 3),
          ),
        );
      if (!mini && w > 145 && h > 105) {
        c.font = '12px system-ui';
        c.fillStyle = '#a3b8c3';
        const signature = MARKS[room.signature];
        if (c.measureText(signature).width < w - 18)
          c.fillText(signature, x + w / 2, y + h / 2 + 35);
      }
    }
    if (!mini && w > 70 && h > 65) {
      c.font = '11px ui-monospace, monospace';
      c.textAlign = 'left';
      c.fillStyle = '#a9bac7';
      c.fillText(`R${String(index + 1).padStart(2, '0')}`, x + 8, y + 13);
    }
  });
  for (const door of spec.doors) {
    const x = px(door.x + 0.5 + dirX(door.dir) * 0.5);
    const z = pz(door.z + 0.5 + dirZ(door.dir) * 0.5);
    const dx = dirZ(door.dir) * p.scale * 0.27;
    const dz = dirX(door.dir) * p.scale * 0.27;
    c.strokeStyle = info.shut.includes(door.id) ? '#ff8575' : '#76d4e4';
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(x - dx, z - dz);
    c.lineTo(x + dx, z + dz);
    c.stroke();
  }
  c.restore();
}

function wrapLabel(c: CanvasRenderingContext2D, text: string, width: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && c.measureText(next).width > width) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}
