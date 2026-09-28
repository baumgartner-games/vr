import type { WorldDefinition, WorldFolder } from '../core/types';

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
    // Die ganze Lobby von oben, Wand bis Wand (11 m) und eine Handbreit dazu.
    topDownSpan: 11.5,
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
    id: 'sandbox',
    title: 'Sandbox',
    tagline: 'Neun Zonen, ein Gelände',
    description:
      'Der Sandkasten: Türen in drei Betriebsarten, vier Effektquellen, eine Treppe auf ein Podest, Wegsuche mit Kiste und Stacheln, ein Schießstand ohne Dach, eine Kartbahn mit zwei Karts in der Box, eine Kletterwand mit Sprungkissen und drei Portaltafeln. A benutzt alles, B stellt alles zurück — und gebaut werden darf hier auch.',
    accent: 0x5ee0a0,
    preview: 'worlds/sandbox.webp',
    roles: ['vr', 'desktop', 'handheld'],
    test: true,
    load: async () => new (await import('./test/TestWorld')).TestWorld(),
  },
  {
    id: 'test-navigation',
    title: 'Test Navigation',
    tagline: 'Einem NPC beim Wegfinden zusehen',
    description:
      'Sechs Kammern mit Fensterwänden, vor jeder ein roter Knopf: ein schräger Gang zwischen zwei 45°-Wänden, eine Treppe aufs Podest, eine Treppe mit Lava oben, um die er links herum muss, und der schräge Gang noch zweimal enger, zuletzt nur eine Kachelreihe breit — und ein gerader Weg, auf den unterwegs eine Arbeitsplatte fällt. Grün ist der Start, blau das Ziel, und der berechnete Weg steht als Linie im Bild. Durch das Tor jeder Kammer kommt nur der Spieler.',
    accent: 0xb58cff,
    preview: 'worlds/test-navigation.webp',
    // Alle sechs Kammern von oben, Rand bis Rand.
    topDownSpan: 60,
    roles: ['vr', 'desktop', 'handheld'],
    test: true,
    folder: 'test',
    load: async () => new (await import('./testnav/NavTestWorld')).NavTestWorld(),
  },
  {
    id: 'test-restaurant',
    title: 'Test Restaurant',
    tagline: 'Leer — bereit für den Neuaufbau aus dem Modellregal',
    description:
      'Eine leere Fläche aus Prototyp-Boden. Hier entsteht das Test Restaurant neu, Stück für Stück aus Spielelementen des Modellregals: Kisten, Brett, Herd mit Topf, Spüle, Förderband — jedes sperrt seine Kacheln und tut auf A, was es in der Küche tut.',
    accent: 0xf2a33a,
    preview: 'worlds/test-restaurant.webp',
    // Der ganze Boden von oben, Rand bis Rand.
    topDownSpan: 40,
    roles: ['vr', 'desktop', 'handheld'],
    test: true,
    folder: 'test',
    load: async () =>
      new (await import('./testrestaurant/TestRestaurantWorld')).TestRestaurantWorld(),
  },
  {
    id: 'hausbau',
    title: 'Hausbau',
    tagline: 'Wände bauen und tapezieren',
    description:
      'Ein kleines Haus aus den Wänden des Katalogs: zwei Zimmer, Innentür, Haustür, zwei Fenster. Davor sechs Tapetenkisten — Tapete nehmen, im Raum auf eine Wand zeigen, und die Seiten, die sie bekäme, leuchten; A klebt sie an. Im Baukasten zieht man neue Wände wie in Die Sims.',
    accent: 0xc98f4f,
    preview: 'worlds/hausbau.webp',
    // Das Haus mit den Kisten davor, Rand bis Rand.
    topDownSpan: 22,
    roles: ['vr', 'desktop', 'handheld'],
    test: true,
    folder: 'test',
    load: async () => new (await import('./house/HausbauWorld')).HausbauWorld(),
  },
  {
    id: 'plateup',
    title: 'Restaurant',
    tagline: 'Küche und Gastraum, neu aus dem Möbelkatalog',
    description:
      'Küche mit Fliesen, Gastraum mit Dielen, ringsum Wände — alles Spielelemente aus dem Möbelkatalog. In der Küche Vorratskisten, Brett, Herde, Spüle, Teller und die Eisecke; jedes Möbel sperrt seine Kachel und tut auf A, was es in der Küche tut. Tische, Stühle und Gäste kommen, sobald sie als Möbel eingerichtet sind.',
    accent: 0xf2a33a,
    preview: 'worlds/plateup.webp',
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
 * **Wo man landet, wenn die Adresse nichts sagt** — die Sandbox (bis September
 * 2026 _Testwelt_, `WORLD_ALIASES`), und dort die
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
export const DEFAULT_WORLD = 'sandbox';

/**
 * **Die Ordner** (`WorldDefinition.folder`). _Test_ hält die Prüfstände, an
 * denen man einer Sache beim Arbeiten zusieht — gewünscht: _„eine Test Ordner
 * Welt …, wenn ich drauf drücke habe ich Auswahl eine erste und einzige Welt:
 * Test Navigation Welt"_.
 */
export const WORLD_FOLDERS: readonly WorldFolder[] = [
  { id: 'test', title: 'Test', tagline: 'Prüfstände zum Zuschauen', accent: 0xb58cff },
];

/**
 * **Alte Namen von Welten** — damit ein Lesezeichen, ein Link und ein Stand im
 * Browser, die unter dem alten Namen stehen, weiter ankommen.
 *
 * Die Testwelt heißt seit September 2026 _Sandbox_ (gewünscht: _„die „Test"
 * Welt sollte in sandbox Welt umbenannt werden"_) — _Test_ ist seitdem der
 * Ordner mit den Prüfständen (`WORLD_FOLDERS`). `#test` in der Adresse führt
 * weiter in die Sandbox, und ihr gespeicherter Umbau zieht beim ersten Laden
 * um (`grid/worldStore.storedWorld`).
 */
export const WORLD_ALIASES: Readonly<Record<string, string>> = { test: 'sandbox' };

export function findWorld(id: string): WorldDefinition | undefined {
  const wanted = WORLD_ALIASES[id] ?? id;
  return WORLDS.find((world) => world.id === wanted);
}
