import { registerAsset } from '../registry/assets';
import { buildVentFlaps } from './ventArt';
import { STATION_VENTS } from './ventNet.data';

/**
 * Das Lüftungssystem meldet an, was es mitbringt: das Klappenmodell als
 * Fabrik (ein `HouseSpec` hinein, eine `THREE.Group` heraus) und das Netz
 * als Daten — damit ein Paket, das die Klappen zeichnen oder das Netz lesen
 * will, hier nachschlägt statt in unseren Dateien.
 */
registerAsset({
  id: 'vent-flaps',
  kind: 'model',
  owner: 'gameplay',
  load: () => buildVentFlaps,
});

registerAsset({
  id: 'vent-net',
  kind: 'mapIcon',
  owner: 'gameplay',
  load: () => STATION_VENTS,
});
