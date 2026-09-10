import './views.css';
import { registerRole } from '../registry/roles';
import { mountScoutView, PING_PERIOD } from './scoutRole';

/** **Der Späher meldet sich an** — eine Datei, eine Rolle. */
export const SCOUT_ROLE = registerRole({
  id: 'scout',
  order: 30,
  label: 'Späher',
  tagline: `Zwei Punkte auf der Karte, alle ${PING_PERIOD} s neu`,
  sees: 'je eine Peilung von Techniker und Monster — dazwischen nichts, und nie, was dazwischenliegt',
  surface: 'map',
  mount: (host) => mountScoutView(host),
});
