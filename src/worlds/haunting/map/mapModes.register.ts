import { registerViewMode } from '../registry/viewModes';
import { ALL_LAYERS } from './mapView';

/**
 * Die zwei Modi der 2D-Welt — genau zwei, und das Optionsmenü zeigt genau
 * diese Liste (`viewModesFor('flat')`).
 */
export const FLAT_OMNISCIENT = registerViewMode({
  id: 'flat:omniscient',
  order: 10,
  label: 'Alles sehen',
  description:
    'Geräuschradien, Sichtkegel, volle Helligkeit; dunkle Bereiche nur leicht grau statt schwarz.',
  layers: { ...ALL_LAYERS },
  markers: 'live',
  visibility: 'omniscient',
  audience: ['flat'],
});

export const FLAT_REALISTIC = registerViewMode({
  id: 'flat:realistic',
  order: 20,
  label: 'Realitätsnah',
  description: 'Nur Kartenlicht und Taschenlampe; ohne beides bleiben anderthalb Meter um dich.',
  layers: { ...ALL_LAYERS },
  markers: 'live',
  visibility: 'realistic',
  audience: ['flat'],
});
