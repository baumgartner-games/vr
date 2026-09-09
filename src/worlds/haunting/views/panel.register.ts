import { registerRole } from '../registry/roles';
import { stationFacts } from '../stations';
import { PanelRole } from './panel';

const facts = stationFacts('hack');

/** Die Schalttafel — Kennung `hack` aus der Zeit, als sie der Hacker war. */
export const PANEL_ROLE = registerRole({
  id: facts.id,
  order: 20,
  label: facts.label,
  tagline: facts.tagline,
  sees: facts.sees,
  surface: 'map',
  mount: (host) => new PanelRole(host),
});
