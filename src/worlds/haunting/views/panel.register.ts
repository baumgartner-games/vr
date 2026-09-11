import './views.css';
import { registerRole } from '../registry/roles';
import { mountPanelView } from './panelRole';

/**
 * **Die Schalttafel meldet sich an** — aus ihrer eigenen Datei, wie
 * `BOUNDARIES.md` es will: Keine zentrale Rollenliste wird angefasst,
 * `registry/discover.ts` sammelt diese Datei mit dem Glob ein, und
 * `stationUi.ts` baut die Seite aus der Registry.
 */
export const PANEL_ROLE = registerRole({
  id: 'hack',
  order: 20,
  label: 'Schalttafel',
  tagline: 'Türen und Lampen — auf der Karte und auf der Tafel',
  sees: 'die Station als Grundriss und alle freigegebenen Schalter mit ihrer Beschriftung — aber niemanden, der sich darin bewegt',
  surface: 'map',
  mount: (host) => mountPanelView(host),
});
