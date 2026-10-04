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
    id: 'sandbox',
    title: 'Sandbox',
    tagline: 'Leer — zum Aufbauen und Ausprobieren',
    description:
      'Eine leere Fläche aus Prototyp-Platten. Hier wird gebaut und getestet: Möbel aus dem Katalog hinstellen, Wände ziehen, Böden legen. Was du baust, bleibt im Browser; „Original wiederherstellen" macht sie wieder leer.',
    accent: 0x5ee0a0,
    preview: 'worlds/sandbox.webp',
    // Die ganze Fläche von oben, Rand bis Rand.
    topDownSpan: 42,
    roles: ['vr', 'desktop', 'handheld'],
    test: true,
    load: async () => new (await import('./test/SandboxWorld')).SandboxWorld(),
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
    id: 'test-kart',
    title: 'Test Rennstrecke',
    tagline: 'Kartbahn mit Boxengasse',
    description:
      'Eine Kartbahn mit zwei Karts in der Box: einsteigen mit A, Gas, Bremse, Lenkung per Stick oder mit dem Lenkrad in der Hand, Rundenzeit und Klemmbrett im Kart. B stellt die Karts zurück in die Box.',
    accent: 0xff7a59,
    preview: 'worlds/test-kart.webp',
    roles: ['vr', 'desktop', 'handheld'],
    test: true,
    folder: 'test',
    load: async () => new (await import('./test/KartTestWorld')).KartTestWorld(),
  },
  {
    id: 'test-climb',
    title: 'Test Kletterwand',
    tagline: 'Griffe, Ausdauer, Sprungkissen',
    description:
      'Acht Meter Wand mit Griffen aller Arten — gute halten, schlechte kosten Ausdauer. Davor ein Sprungkissen und eine Rampe. Greifen hält dich an der Wand.',
    accent: 0x7cd67c,
    preview: 'worlds/test-climb.webp',
    roles: ['vr', 'desktop', 'handheld'],
    test: true,
    folder: 'test',
    load: async () => new (await import('./test/ClimbTestWorld')).ClimbTestWorld(),
  },
  {
    id: 'test-range',
    title: 'Test Schießstand',
    tagline: 'Drei Bahnen, Scheiben auf 5, 10 und 20 m',
    description:
      'Ein Schießstand ohne Dach: drei Bahnen, Scheiben, die zerspringen, eine Stahlplatte und die Tafel mit den Punkten. Die Pistole hängt am Gürtel, B stellt die Scheiben wieder auf.',
    accent: 0xe0c050,
    preview: 'worlds/test-range.webp',
    roles: ['vr', 'desktop', 'handheld'],
    test: true,
    folder: 'test',
    load: async () => new (await import('./test/RangeTestWorld')).RangeTestWorld(),
  },
  {
    id: 'test-effects',
    title: 'Test Effekte',
    tagline: 'Rauch, Feuer, Funken, Wasser',
    description:
      'Vier Effektquellen in einer Reihe, vor jeder ein Knopf: A löst die Düse dahinter aus.',
    accent: 0x59c8ff,
    preview: 'worlds/test-effects.webp',
    roles: ['vr', 'desktop', 'handheld'],
    test: true,
    folder: 'test',
    load: async () => new (await import('./test/EffectsTestWorld')).EffectsTestWorld(),
  },
  {
    id: 'test-city',
    title: 'Stadt',
    tagline: 'Straßen, Ampeln und Häuser aus dem Katalog',
    description:
      'Eine Stadt nur aus dem Katalogordner „Stadt“: fünf Straßen von West nach Ost, dazwischen Blöcke von 19 bis 84 m Breite mit Häusern Rücken an Rücken, in der Mitte hoch, am Rand niedrig, ein Stadtpark, Café und Markt, Verkehr und Wiese rundherum; die Querstraßen enden versetzt als Einmündungen, damit es kein Schachbrett ist. Mit einer Straße aus dem Katalog zieht man neue Straßen wie in Cities: Skylines — auf das Raster von 12 m oder frei, Kreuzungen und Laternen setzen sich selbst.',
    accent: 0x8fb7d9,
    preview: 'worlds/test-city.webp',
    // Die ganze Stadt von oben, Rand bis Rand.
    topDownSpan: 200,
    roles: ['vr', 'desktop', 'handheld'],
    test: true,
    folder: 'test',
    load: async () => new (await import('./city/CityTestWorld')).CityTestWorld(),
  },
  {
    id: 'hausbau',
    title: 'Hausbau',
    tagline: 'Wände bauen, tapezieren, Böden legen',
    description:
      'Ein kleines Haus aus den Wänden des Katalogs: zwei Zimmer, Innentür, Haustür, zwei Fenster. Davor je sechs Tapeten- und Bodenkisten — Tapete nehmen, im Raum auf eine Wand zeigen, und die Seiten, die sie bekäme, leuchten; A klebt sie an. Ein Bodenbelag legt sich auf die Kacheln des Zimmers, in dem man steht. Im Baukasten zieht man neue Wände wie in Die Sims.',
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
 * 2026 _Testwelt_, `WORLD_ALIASES`).
 *
 * Hier stand der Hub, bis in der Sandbox die Küche lag, in der monatelang
 * gebaut und geprüft wurde. Die Küche ist seit Oktober 2026 weg und die
 * Sandbox leer — sie ist der Ort, an dem etwas aufgebaut und ausprobiert wird
 * (`test/SandboxWorld.ts`). `#hub` in der Adresse führt weiter in den Hub.
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
