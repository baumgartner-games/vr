import { NavGraph } from '../nav/navGraph';
import { TILE, tileIndexAt, tileKey } from '../nav/navTile';

/**
 * **Ein Gelände als Raster.**
 *
 * Die Welten aus Quadern tastet `nav/navBake.ts` ab; ein Höhenfeld wie die
 * Alpen ist kein Quader — als einer genommen wäre es ein Klotz bis zum
 * Gipfel, und „Boden" läge überall auf dessen Deckel. Hier wird das Gelände
 * stattdessen **abgetastet, wie es ist**: eine Kachel je 2,5 m mit der
 * Höhe ihrer Mitte als Feinhöhe (`rise`) auf einer einzigen Etage. Was
 * daraus folgt, entscheidet das Bodenmodell (`flatFloor.ts`): Ein Hang, der
 * je Kachel mehr als `step` steigt, ist eine Kante, die man nicht nimmt —
 * und die Höhe unter den Füßen kommt aus dem Höhenfeld selbst (`heightAt`),
 * nicht aus der Kachelmitte.
 */
export interface Terrain {
  heightAt(x: number, z: number): number;
  bounds: { minX: number; minZ: number; maxX: number; maxZ: number };
  /** Bis zu welchem Anstieg je Kachel man den Hang hinaufkommt, in Metern. */
  step?: number;
}

/** Ein Hang von gut 30° auf einer Kachel — was ein Mensch noch geht. */
export const TERRAIN_STEP = 1.5;

export function terrainGraph(terrain: Terrain): NavGraph {
  const graph = new NavGraph([0]);
  // Die Grenzen sind ein Rechteck in Metern, die obere Kante gehört nicht mehr dazu.
  const x0 = tileIndexAt(terrain.bounds.minX),
    x1 = tileIndexAt(terrain.bounds.maxX - 1e-6);
  const z0 = tileIndexAt(terrain.bounds.minZ),
    z1 = tileIndexAt(terrain.bounds.maxZ - 1e-6);
  for (let tx = x0; tx <= x1; tx++)
    for (let tz = z0; tz <= z1; tz++) {
      const rise = terrain.heightAt((tx + 0.5) * TILE, (tz + 0.5) * TILE);
      if (!Number.isFinite(rise)) continue;
      graph.setTile(tileKey(tx, tz, 0), { rise });
    }
  return graph;
}
