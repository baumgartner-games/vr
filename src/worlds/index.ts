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
    preview: 'worlds/hub.webp',
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
    preview: 'worlds/editor.webp',
    roles: ['vr', 'desktop'],
    experimental: true,
    load: async () => new (await import('./editor/EditorWorld')).EditorWorld(),
  },
  {
    id: 'test',
    title: 'Testwelt',
    tagline: 'Neun Zonen, ein Gelände',
    description:
      'Der Prüfstand: Türen in drei Betriebsarten, vier Effektquellen, eine Treppe auf ein Podest, Wegsuche mit Kiste und Stacheln, ein Schießstand ohne Dach, eine Kartbahn mit zwei Karts in der Box, eine Kletterwand mit Sprungkissen und drei Portaltafeln. A benutzt alles, B stellt alles zurück — und gebaut werden darf hier auch.',
    accent: 0x5ee0a0,
    preview: 'worlds/test.webp',
    roles: ['vr', 'desktop', 'handheld'],
    test: true,
    load: async () => new (await import('./test/TestWorld')).TestWorld(),
  },
  {
    id: 'plateup',
    title: 'Burgerladen',
    tagline: 'Küche, Gastraum und ein Tag voller Gäste',
    description:
      'Eine eingerichtete Spielküche mit Gastraum: Gäste kommen herein, setzen sich und bestellen. Brötchen, Patty von der Grillplatte, Salat vom Brett — auf einen Teller und an den Tisch, bevor die Geduld reißt. Jeden Tag mehr Gäste und eine längere Karte.',
    accent: 0xf2a33a,
    roles: ['vr', 'desktop', 'handheld'],
    load: async () => new (await import('./plateup/PlateUpWorld')).PlateUpWorld(),
  },
  {
    id: 'haunting',
    title: 'Haunting / Orbital',
    tagline: 'Eine Quest, zwei in der Einsatzzentrale',
    description:
      'Kooperative Raumstationsmission: Systeme reparieren, Codes austauschen, Radar überwachen. Mit sicherem Testlabor.',
    accent: 0x65dce5,
    preview: 'worlds/haunting.webp',
    roles: ['vr', 'desktop', 'handheld'],
    load: async () => new (await import('./haunting/HauntingWorld')).HauntingWorld(),
  },
];

/**
 * **Wo man landet, wenn die Adresse nichts sagt** — die Testwelt, und dort die
 * Küche (`test/TestWorld.spawnPoint`).
 *
 * Hier stand der Hub, und das war richtig, solange er der Ort war, an dem
 * etwas passiert: eine ruhige Halle mit einem Menü an der Wand, von der aus
 * man sich eine Welt aussucht. Gearbeitet wird aber seit Monaten in der
 * **Küche** — sie ist die Zone, in der gebaut, geprüft und gespielt wird —,
 * und jeder Start im Hub war derselbe Umweg: Menü auf, Testwelt wählen, laden,
 * und dann noch dreißig Meter nach Norden laufen.
 *
 * Der Hub ist damit nicht weg, sondern nur nicht mehr der Anfang: `#hub` in
 * der Adresse führt weiter dorthin, und das Tor am Startplatz der Testwelt tut
 * es auch (`test/zones/start.ts`).
 */
export const DEFAULT_WORLD = 'test';

export function findWorld(id: string): WorldDefinition | undefined {
  return WORLDS.find((world) => world.id === id);
}
