import { registerRole } from '../registry/roles';
import { stationFacts } from '../stations';
import { ArchiveRole } from './archive';

const facts = stationFacts('archive');

export const ARCHIVE_ROLE = registerRole({
  id: facts.id,
  order: 10,
  label: facts.label,
  tagline: facts.tagline,
  sees: facts.sees,
  surface: 'map',
  mount: (host) => new ArchiveRole(host),
});
