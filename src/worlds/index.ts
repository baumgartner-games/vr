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
    id: 'editor',
    title: 'Bauplatz',
    tagline: 'Level bauen, während man darin steht',
    description:
      'Der Grundriss steht als Miniatur vor dir: greifen und schieben, zwei Hände drehen und zoomen. Gedrückt halten malt eine ganze Reihe, zwei Ecken füllen eine Fläche — und alles wächst in Lebensgröße um dich herum. Karte und Palette hängen am Gürtel. Gebaute Welten bleiben im Browser und lassen sich als Datei mitnehmen.',
    accent: 0x39d0ff,
    roles: ['vr', 'desktop'],
    experimental: true,
    load: async () => new (await import('./editor/EditorWorld')).EditorWorld(),
  },
  {
    id: 'haunting',
    title: 'Haunting / Orbital',
    tagline: 'Eine Quest, zwei in der Einsatzzentrale',
    description:
      'Kooperative Raumstationsmission: Systeme reparieren, Codes austauschen, Radar überwachen. Mit sicherem Testlabor.',
    accent: 0x65dce5,
    roles: ['vr', 'desktop', 'handheld'],
    load: async () => new (await import('./haunting/HauntingWorld')).HauntingWorld(),
  },
];

export const DEFAULT_WORLD = 'hub';

export function findWorld(id: string): WorldDefinition | undefined {
  return WORLDS.find((world) => world.id === id);
}
