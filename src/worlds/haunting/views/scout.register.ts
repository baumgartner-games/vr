import { registerRole } from '../registry/roles';
import { stationFacts } from '../stations';
import { ScoutRole } from './scout';

const facts = stationFacts('scout');

export const SCOUT_ROLE = registerRole({
  id: facts.id,
  order: 30,
  label: facts.label,
  tagline: facts.tagline,
  sees: facts.sees,
  surface: 'map',
  mount: (host) => new ScoutRole(host),
});
