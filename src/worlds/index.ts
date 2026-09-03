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
];

export const DEFAULT_WORLD = 'hub';

export function findWorld(id: string): WorldDefinition | undefined {
  return WORLDS.find((world) => world.id === id);
}
