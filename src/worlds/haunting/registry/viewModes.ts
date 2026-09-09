import type { MapLayers, MarkerPolicy } from '../map/mapView';
import type { VisibilityMode } from '../map/visibility';
import { Registry, type Registered } from './registry';

/**
 * **Ansichtsmodi** — wie die Karte gerade schaut.
 *
 * Ein Modus ist ein Bündel aus Layern, Markerpolitik und Sichtbarkeitsmodus,
 * mit Namen. Die 2D-Welt bietet ihre zwei („Alles sehen", „Realitätsnah",
 * `map/mapModes.register.ts`); eine Rollenansicht darf eigene anmelden
 * (etwa „Späher: nur Kontur") und sie im Optionsmenü anbieten, ohne dass
 * jemand die Liste des anderen anfasst.
 */
export interface ViewMode extends Registered {
  readonly id: string;
  label: string;
  description: string;
  layers: Partial<MapLayers>;
  markers: MarkerPolicy;
  visibility: VisibilityMode;
  /**
   * Für wen der Modus gedacht ist: Rollen-Kennungen aus `roles.ts`, oder
   * `'flat'` für die 2D-Welt. Leer heißt überall anbieten.
   */
  audience?: string[];
}

export const viewModes = new Registry<ViewMode>('viewModes');

export function registerViewMode(mode: ViewMode): ViewMode {
  return viewModes.register(mode);
}

/** Die Modi für eine Rolle oder die 2D-Welt, in Menüreihenfolge. */
export function viewModesFor(audience: string): ViewMode[] {
  return viewModes.list().filter((mode) => !mode.audience || mode.audience.includes(audience));
}
