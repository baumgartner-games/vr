import { STATIONS } from '../stations';
import { registerRole, type RoleHost, type RoleView } from './roles';

/**
 * **Die vier Altrollen, angemeldet wie neue.**
 *
 * Damit die Registry vom ersten Tag an vollständig ist und eine Rollenwahl
 * daraus gebaut werden kann. Ihr `mount` bleibt vorerst bei `stationUi.ts`
 * (Grenzfall-Datei des Pakets Rollenansichten); was hier steht, ist ein
 * Platzhalter, der die Rolle als **noch in der alten Oberfläche** ausweist.
 * Das Paket Rollenansichten ersetzt ihn, indem es diese Datei umschreibt —
 * sie gehört ihm (`BOUNDARIES.md`).
 */
const SURFACES: Record<string, 'dom' | 'map' | '3d'> = {
  archive: '3d',
  scout: 'map',
  drone: '3d',
  watch: '3d',
};

function legacy(): (host: RoleHost) => RoleView {
  return () => {
    const element = document.createElement('div');
    element.className = 'role--legacy';
    return { element, update: () => {}, dispose: () => element.remove() };
  };
}

STATIONS.forEach((station, index) =>
  registerRole({
    id: station.id,
    order: index,
    label: station.label,
    tagline: station.tagline,
    sees: station.sees,
    shared: station.shared,
    surface: SURFACES[station.id] ?? 'dom',
    mount: legacy(),
  }),
);

registerRole({
  id: 'hack',
  order: 99,
  label: 'Einsatzkontrolle',
  tagline: 'Altname der Einsatzkontrolle',
  sees: 'wie scout',
  surface: 'map',
  hidden: true,
  mount: legacy(),
});
