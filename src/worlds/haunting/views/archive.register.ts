import './views.css';
import { registerRole } from '../registry/roles';
import { mountArchiveView } from './archiveRole';

/** **Der Archivar meldet sich an** — eine Datei, eine Rolle. */
export const ARCHIVE_ROLE = registerRole({
  id: 'archive',
  order: 10,
  label: 'Archiv',
  tagline: 'Fracht, Zielräume und Freigabecodes',
  sees: 'die ganze Station mit Fracht und Zielen, dazu jede Raumakte — aber niemanden, der sich bewegt',
  surface: 'map',
  mount: (host) => mountArchiveView(host),
});
