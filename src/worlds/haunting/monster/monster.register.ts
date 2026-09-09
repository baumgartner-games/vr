import './monster.css';
import { registerRole } from '../registry/roles';
import { registerViewMode } from '../registry/viewModes';
import { ALL_LAYERS } from '../map/mapView';
import { mountMonsterView } from './monsterView';

/**
 * **Die Monster-Rolle meldet sich an** — in ihrer eigenen Datei, wie
 * `BOUNDARIES.md` es will: keine zentrale Rollenliste wird angefasst,
 * `registry/discover.ts` sammelt diese Datei mit dem Glob ein.
 *
 * `surface: 'map'`: Die Rolle braucht die 2D-Karte und keine 3D-Kamera.
 * Sie ist nicht `shared` — ein Monster, nicht mehrere.
 */
export const MONSTER_ROLE = registerRole({
  id: 'monster',
  order: 50,
  label: 'Monster',
  tagline: 'Jagen, lauern, durch die Schächte',
  sees: 'nur, was das Monster sieht und hört — Licht im Sichtkegel, Schritte in Hörweite; keine Fundorte, kein Blick durch Wände',
  surface: 'map',
  mount: (host) => mountMonsterView(host),
});

export const MONSTER_SENSES = registerViewMode({
  id: 'monster:senses',
  order: 30,
  label: 'Monstersinne',
  description: 'Sichtkegel und Hörweite des Monsters; dunkle Räume bleiben dunkel.',
  layers: { ...ALL_LAYERS },
  markers: 'live',
  visibility: 'realistic',
  audience: ['monster'],
});
