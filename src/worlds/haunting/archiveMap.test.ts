import { archiveBounds, archiveProjection, archiveRoomAt, paintArchiveMap } from './archiveMap';
import { homeView } from './archiveView';
import { APRON, generateHouse } from './house';
import { TILE, dirX, dirZ } from '../nav/navTile';
import { stationLayout } from './stationLayout';

/** A phone tap and the chart must agree after zooming, rotating the phone and resizing rooms. */
describe('Archive 2D chart', () => {
  it.each([6, 8, 10, 12])(
    'fits and selects every room in a %i-room station on portrait and landscape screens',
    (count) => {
      for (let seed = 0; seed < 30; seed++) {
        const spec = generateHouse(seed, count);
        for (const [width, height] of [
          [320, 360],
          [950, 340],
        ]) {
          const projection = archiveProjection(spec, width!, height!, homeView());
          for (const room of spec.rooms) {
            const x = projection.x + (room.rect.x + room.rect.w / 2) * projection.scale;
            const y = projection.z + (room.rect.z + room.rect.d / 2) * projection.scale;
            expect(archiveRoomAt(spec, projection, x, y)).toBe(room.id);
          }
        }
      }
    },
  );

  it('keeps a selected room tappable when the user opens its dossier location at close zoom', () => {
    const spec = generateHouse(452, 12);
    const bounds = archiveBounds(spec);
    for (const room of spec.rooms) {
      for (const zoom of [1.4, 2, 4, 6]) {
        const centreX = room.rect.x + room.rect.w / 2;
        const centreZ = room.rect.z + room.rect.d / 2;
        const p = archiveProjection(spec, 370, 530, {
          zoom,
          x: centreX - bounds.x - bounds.w / 2,
          z: centreZ - bounds.z - bounds.d / 2,
        });
        expect(archiveRoomAt(spec, p, p.x + centreX * p.scale, p.z + centreZ * p.scale)).toBe(
          room.id,
        );
      }
    }
  });

  it('includes the command centre but never interprets it or a point outside the viewport as an interior room', () => {
    const spec = generateHouse(123, 8);
    const p = archiveProjection(spec, 360, 450, homeView());
    const bounds = archiveBounds(spec);
    expect(bounds.z + bounds.d).toBeGreaterThanOrEqual(APRON.z + APRON.d);
    expect(
      archiveRoomAt(
        spec,
        p,
        p.x + (APRON.x + APRON.w / 2) * p.scale,
        p.z + (APRON.z + APRON.d / 2) * p.scale,
      ),
    ).toBeNull();
    expect(archiveRoomAt(spec, p, -1, 90)).toBeNull();
    expect(archiveRoomAt(spec, p, 361, 90)).toBeNull();
  });

  it('draws each open/closed door on its real wall edge, including external airlocks', () => {
    const spec = generateHouse(847, 10);
    const shut = spec.doors.filter((_, i) => i % 2 === 0).map((door) => door.id);
    const lines: { color: string; from: number[]; to: number[] }[] = [];
    const labels: string[] = [];
    const fixturePositions: number[][] = [];
    let color = '',
      from: number[] = [],
      to: number[] = [];
    const c = {
      set strokeStyle(value: string) {
        color = value;
      },
      fillRect() {},
      strokeRect() {},
      save() {},
      restore() {},
      rect() {},
      clip() {},
      translate(x: number, z: number) {
        fixturePositions.push([x, z]);
      },
      rotate() {},
      beginPath() {
        from = [];
        to = [];
      },
      moveTo(x: number, y: number) {
        from = [x, y];
      },
      lineTo(x: number, y: number) {
        to = [x, y];
      },
      stroke() {
        lines.push({ color, from, to });
      },
      fillText(text: string) {
        labels.push(text);
      },
      measureText(text: string) {
        return { width: text.length * 7 };
      },
    } as unknown as CanvasRenderingContext2D;
    const p = archiveProjection(spec, 1500, 1000, homeView());
    paintArchiveMap(c, spec, { selected: spec.rooms[0]!.id, shut }, p, false);
    const doors = lines.filter((line) => line.color === '#ff8575' || line.color === '#76d4e4');
    expect(doors).toHaveLength(spec.doors.length);
    spec.doors.forEach((door, index) => {
      const line = doors[index]!;
      expect(line.color).toBe(shut.includes(door.id) ? '#ff8575' : '#76d4e4');
      expect((line.from[0]! + line.to[0]!) / 2).toBeCloseTo(
        p.x + (door.x + 0.5 + dirX(door.dir) * 0.5) * p.scale,
      );
      expect((line.from[1]! + line.to[1]!) / 2).toBeCloseTo(
        p.z + (door.z + 0.5 + dirZ(door.dir) * 0.5) * p.scale,
      );
    });
    for (const placement of stationLayout(spec).filter((item) => item.kind === 'fixture')) {
      expect(fixturePositions).toContainEqual([
        p.x + (placement.x / TILE) * p.scale,
        p.z + (placement.z / TILE) * p.scale,
      ]);
    }
    expect(labels).toContain('EINSATZZENTRALE');
    expect(labels.join(' ')).toContain('Maschinenraum');
  });
});
