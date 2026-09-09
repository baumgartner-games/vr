import { stationFacts } from '../stations';
import { registerRole } from './roles';

/**
 * **Der Fernseher, angemeldet wie die anderen.**
 *
 * Von den vier Altrollen ist das die eine, deren Ansicht noch in
 * `stationUi.ts` steht: Sie ist kein Gerät, sondern das ganze Haus von schräg
 * oben, gezeichnet von der 3D-Welt (`HauntingWorld.render`) — dafür gibt es
 * keine Karte zu bauen. Die drei Geräte (Archiv, Schalttafel, Späher) melden
 * sich aus `views/` an, jede aus ihrer eigenen Datei; die Drohne ist
 * gestrichen.
 */
const watch = stationFacts('watch');

registerRole({
  id: watch.id,
  order: 90,
  label: watch.label,
  tagline: watch.tagline,
  sees: watch.sees,
  shared: watch.shared,
  surface: '3d',
  mount: () => {
    const element = document.createElement('div');
    element.className = 'role--legacy';
    return { element, update: () => {}, dispose: () => element.remove() };
  },
});
