import './views.css';
import { registerRole } from '../registry/roles';
import { mountWatchView } from './watchRole';

/**
 * **Der Fernseher meldet sich an.** `surface: '3d'`, als einzige Rolle: Sein
 * Bild ist die Station in three.js und keine Karte. `shared`, ebenfalls als
 * einzige — wer nur zusieht, nimmt niemandem etwas weg.
 */
export const WATCH_ROLE = registerRole({
  id: 'watch',
  order: 40,
  label: 'Zuschauer',
  tagline: 'Die ganze Station, beleuchtet',
  sees: 'alles — und darf deshalb nichts sagen',
  surface: '3d',
  shared: true,
  mount: (host) => mountWatchView(host),
});
