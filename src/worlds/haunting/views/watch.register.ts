import './views.css';
import { registerRole } from '../registry/roles';
import { mountWatchView } from './watchRole';

/**
 * **Der Fernseher meldet sich an.** `surface: '3d'`, als einzige Rolle: Sein
 * Bild ist die Station in three.js und keine Karte — und er schlägt auf Wunsch
 * die Ansicht jeder anderen Rolle auf, lesend (`watchLens.ts`). `shared`,
 * ebenfalls als einzige: Wer nur zusieht, nimmt niemandem etwas weg.
 */
export const WATCH_ROLE = registerRole({
  id: 'watch',
  order: 40,
  label: 'Zuschauer',
  tagline: 'Das ganze Deck — oder der Blick eines Mitspielers',
  sees: 'alles: das Deck ohne Decke, jede fremde Rollenansicht und die Absichten des Monsters — und darf deshalb nichts sagen',
  surface: '3d',
  shared: true,
  mount: (host) => mountWatchView(host),
});
