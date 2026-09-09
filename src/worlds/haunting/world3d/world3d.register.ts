import { registerAsset } from '../registry/assets';
import { generateHouse } from '../house';
import { buildSpaceBackdrop } from './spaceBackdrop';

/**
 * **Was das Paket 3D-Welt mitbringt** — angemeldet, wie `BOUNDARIES.md` es
 * verlangt, in einer eigenen `*.register.ts`, die `registry/discover.ts`
 * per Glob einsammelt.
 *
 * Heute ist das der Weltraum um die Station. Die Hülle baut ihn selbst ein
 * (`shipArt.buildShip`), weil noch niemand Modelle aus der Registry
 * abholt; der Eintrag macht ihn nachschlagbar, sobald jemand es tut. Die
 * Wegweiser stehen nicht hier: Sie sind kein Asset, sondern eine Ableitung
 * aus dem Grundriss (`signposts.ts`).
 */
export const SPACE_BACKDROP = registerAsset({
  id: 'world3d:space-backdrop',
  kind: 'model',
  owner: 'world3d',
  // Ohne Bauplan gefragt: die feste Station, wie sie jede Runde hat.
  load: () => buildSpaceBackdrop(generateHouse(1, 14)),
});
