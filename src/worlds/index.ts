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
    tagline: 'Portal-Gun Prototyp',
    description:
      'Rechte Hand: Trigger schießt das blaue Portal, Grip das orange. Durchgehen erlaubt.',
    accent: 0xff9d3d,
    roles: ['vr', 'desktop'],
    experimental: true,
    load: async () => new (await import('./portal/PortalWorld')).PortalWorld(),
  },
];

export const DEFAULT_WORLD = 'hub';

export function findWorld(id: string): WorldDefinition | undefined {
  return WORLDS.find((world) => world.id === id);
}
