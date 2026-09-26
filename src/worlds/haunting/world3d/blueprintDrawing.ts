import { roomOutline, spacesOf, type HouseSpec } from '../house';
import { wallSegments } from '../map/geometry';
import { BLUEPRINT } from './blueprint';

/**
 * **Die Grundriss-Vorlage, aus dem gebauten Grundriss gerechnet.**
 *
 * Bis September 2026 war `public/haunting/station-outline.png` aus der
 * Zeichnung des Besitzers gepaust (`docs/orbital/station-vorlage.webp`). Seit
 * die Gänge den Regeln aus `stationRules.ts` folgen (vier Felder breit), passt
 * die Zeichnung nicht mehr: Am Boden lagen breite grüne Gänge unter schmalen
 * Wänden. Jetzt entsteht das Bild aus demselben Grundriss wie die Station —
 * Räume und Gänge aus `roomOutline`, Wände samt Türlücken und Fenstern aus
 * `map/geometry.wallSegments` — und wird mit `node tools/station-outline.mjs`
 * neu gerechnet, wann immer `stationMap.ts` sich ändert.
 *
 * Hier steht nur das SVG als Text, ohne Browser: Gerastert wird es im
 * Werkzeug mit Chromium (wie `tools/icons.mjs`). Maßstab und Lage bleiben die
 * von `BLUEPRINT`, damit `blueprintArt.ts` nichts davon merkt.
 */

/** Die Farben der Vorlage — dieselben wie im alten, gepausten Bild. */
export const BLUEPRINT_COLOURS = {
  wall: '#ffd54a',
  window: '#9fe8ff',
  room: 'rgba(170, 225, 245, 0.38)',
  passage: 'rgba(170, 245, 205, 0.30)',
} as const;

/** Wie dick eine Wandlinie gezeichnet wird, in Pixeln (20 Pixel = 1 m). */
export const BLUEPRINT_WALL_PX = 4;

export interface BlueprintDrawingOptions {
  /** Hintergrund hinter allem (Vorschaubild); ohne ist das Bild durchsichtig. */
  background?: string;
}

/** Ein Punkt der Station (Meter) als Pixel der Vorlage. */
export function blueprintPixel(x: number, z: number): { px: number; py: number } {
  const { anchor, pxPerMetre } = BLUEPRINT;
  return {
    px: anchor.px + (x - anchor.x) * pxPerMetre,
    py: anchor.py + (z - anchor.z) * pxPerMetre,
  };
}

const round = (value: number): string => String(Math.round(value * 10) / 10);

/**
 * Das SVG der Vorlage: `BLUEPRINT.width` × `BLUEPRINT.height` Pixel, Räume
 * blau und Gänge grün getönt, Wände gelb mit Lücken für die Türen, Fenster
 * hellblau.
 */
export function blueprintSvg(spec: HouseSpec, options: BlueprintDrawingOptions = {}): string {
  const { width, height } = BLUEPRINT;
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
  ];
  if (options.background)
    parts.push(`<rect width="${width}" height="${height}" fill="${options.background}"/>`);
  for (const space of spacesOf(spec)) {
    const points = roomOutline(space)
      .map((corner) => {
        const { px, py } = blueprintPixel(corner.x, corner.z);
        return `${round(px)},${round(py)}`;
      })
      .join(' ');
    const fill = space.circulation ? BLUEPRINT_COLOURS.passage : BLUEPRINT_COLOURS.room;
    parts.push(`<polygon points="${points}" fill="${fill}"/>`);
  }
  const line = (kind: 'wall' | 'window', width: number, colour: string): void => {
    const d = wallSegments(spec)
      .filter((segment) => segment.kind === kind)
      .map((segment) => {
        const a = blueprintPixel(segment.a.x, segment.a.z);
        const b = blueprintPixel(segment.b.x, segment.b.z);
        return `M${round(a.px)} ${round(a.py)}L${round(b.px)} ${round(b.py)}`;
      })
      .join('');
    if (d)
      parts.push(
        `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${width}" stroke-linecap="square"/>`,
      );
  };
  line('window', BLUEPRINT_WALL_PX / 2, BLUEPRINT_COLOURS.window);
  line('wall', BLUEPRINT_WALL_PX, BLUEPRINT_COLOURS.wall);
  parts.push('</svg>');
  return parts.join('\n');
}
