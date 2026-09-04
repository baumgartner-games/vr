import type { WorldDefinition } from '../core/types';

/**
 * The world catalogue. Adding a game means adding one entry here plus a module
 * that exports a `World`; everything else (menu, routing, deep links) follows.
 */
export const WORLDS: WorldDefinition[] = [
  {
    id: 'hub',
    title: 'Hub',
    tagline: 'Startpunkt',
    description: 'Ruhige Halle mit Händen, Handgelenk-Menü und Übersicht.',
    accent: 0x4aa8ff,
    roles: ['vr', 'desktop', 'handheld'],
    load: async () => new (await import('./hub/HubWorld')).HubWorld(),
  },
  {
    id: 'portal',
    title: 'Portal Labor',
    tagline: 'Portale, Physik, Companion Cube',
    description:
      'Waffen am Gürtel greifen: links schießt blau, rechts rot. Springen, fallen, werfen.',
    accent: 0xff3b2f,
    roles: ['vr', 'desktop'],
    experimental: true,
    load: async () => new (await import('./portal/PortalWorld')).PortalWorld(),
  },
  {
    id: 'range',
    title: 'Schießstand',
    tagline: 'Ziele auf 10 bis 100 Meter',
    description:
      'Überdachte Schießlinie, Scheiben in der Ferne und Stahlplatten. Pistole im Menü einstellen.',
    accent: 0xffc857,
    roles: ['vr', 'desktop'],
    experimental: true,
    load: async () => new (await import('./range/RangeWorld')).RangeWorld(),
  },
  {
    id: 'kart',
    title: 'Gokart',
    tagline: 'Kleine Strecke, vier Karts',
    description:
      'Lenkrad greifen und einsteigen. Rechter Trigger Gas, linker bremst, Klemmbrett stellt alles ein.',
    accent: 0x5ee0a0,
    roles: ['vr', 'desktop'],
    experimental: true,
    load: async () => new (await import('./kart/KartWorld')).KartWorld(),
  },
  {
    id: 'shop',
    title: 'Pizzeria',
    tagline: 'Kneten, belegen, backen',
    description:
      'Küche, Thresen und Gastraum. Teig mit der Faust flach kneten, Soße, Käse, Ofen — Mülleimer löscht.',
    accent: 0xff8a2f,
    roles: ['vr', 'desktop'],
    experimental: true,
    load: async () => new (await import('./shop/ShopWorld')).ShopWorld(),
  },
  {
    id: 'tune',
    title: 'Eingaberaum',
    tagline: 'Was drückst du gerade?',
    description:
      'Zwei Controller in der Luft, jede Taste leuchtet. Mit bloßen Händen: fünf Finger-Balken und die Gesten. Hier wird nicht gelaufen.',
    accent: 0x9fe3ff,
    roles: ['vr'],
    experimental: true,
    load: async () => new (await import('./tune/TuneWorld')).TuneWorld(),
  },
  {
    id: 'dust',
    title: 'Dust',
    tagline: 'Große Karte, vier Stockwerke',
    description:
      'Zwei Plätze, ein Tunnel und begehbare Häuser. Alle Werkzeuge, Portale haften an den hellen Tafeln.',
    accent: 0xffc857,
    roles: ['vr', 'desktop'],
    experimental: true,
    load: async () => new (await import('./dust/DustWorld')).DustWorld(),
  },
  {
    id: 'dark',
    title: 'Dunkelhaus',
    tagline: 'Licht aus, Taschenlampe an',
    description:
      'Kleines Haus ohne Fenster: Lichtschalter im Startraum, schwebende Taschenlampe, Leuchtkugel, Laterne und Knicklichter.',
    accent: 0xffd88a,
    roles: ['vr', 'desktop'],
    experimental: true,
    load: async () => new (await import('./dark/DarkWorld')).DarkWorld(),
  },
];

export const DEFAULT_WORLD = 'hub';

export function findWorld(id: string): WorldDefinition | undefined {
  return WORLDS.find((world) => world.id === id);
}
