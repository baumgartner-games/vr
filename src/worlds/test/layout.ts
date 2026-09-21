import type { NavRect } from '../nav/navBuild';
import { TILE } from '../nav/navTile';

/**
 * **Wo in der Testwelt was liegt** — nichts als Zahlen.
 *
 * Eine eigene Datei neben dem Grundriss (`testPlan.ts`), und der Grund ist ein
 * **Kreis**: Der Grundriss ruft die Zonen auf (`zones/`), und jede Zone will
 * wissen, wo ihr Rechteck liegt. Stünden die Rechtecke im Grundriss, importierte
 * jede Zone ihn und er jede Zone — und beim Laden wäre die Hälfte der
 * Konstanten noch `undefined`. Das ist kein Stilfehler, das ist ein Absturz
 * beim ersten Import.
 *
 * Also liegen die Zahlen hier, ganz unten, und importieren selbst nichts außer
 * der Kachelgröße.
 */

// --- das Gelände ------------------------------------------------------------

/**
 * **Die Etagen**: Erdgeschoss und ein Obergeschoss auf 2,80 m.
 *
 * Die Zahl aus dem Plan des Umbaus, und dieselbe, mit der eine Wand gebaut
 * wird (`PLAN_WALL_H`): Ein Podest, das tiefer läge als die Wand daneben hoch
 * ist, hätte über sich eine Handbreit Wand und darüber Himmel.
 */
export const STOREY = 2.8;
export const LEVELS: readonly number[] = [0, STOREY];

/**
 * **Der Boden unter allem** — ein einziges Kachelrechteck.
 *
 * Er wird als **eine** Masse gebaut und nicht als zweitausend Kacheln, und das
 * ist keine Bequemlichkeit: Jede Portalfläche bekommt eine eigene
 * Kollisionsgruppe, und davon gibt es zehn (`PhysicsWorld.ts`). Zweitausend
 * portalfähige Bodenkacheln hießen, dass ein Bodenportal nebenbei die Wand
 * gegenüber aufmacht. Also genau eine Fläche je Welt, und das ist diese.
 */
export const FIELD: NavRect = { x: -27, z: -59, w: 77, d: 105 };

/**
 * **Die Farben des Bodens draußen** — grau und weiß im Wechsel, ein Meter je
 * Feld (`shared/environment.createGround`, `TestWorld.horizonColor`).
 *
 * Die drei Zahlen standen in drei Methodenrümpfen der Welt, und dort kam
 * niemand an sie heran, der sie braucht. Gebraucht werden sie seit dem
 * **Küchenboden**: Der ist ebenfalls kariert (`zones/kitchenFloor.ts`), er
 * grenzt unmittelbar an diesen hier, und genau deshalb muss er sich von ihm
 * abheben — feinere Felder, wärmere und dunklere Töne. Ein Test rechnet das
 * nach, und dafür muss er beide Böden in die Hand bekommen.
 */
export const HORIZON_COLORS = {
  ground: 0x9aa0a8,
  checker: 0xe8ebef,
  line: 0x6c727a,
} as const;

/** Die Mitte des Startplatzes — der Anker der Zone `start`. */
export const SPAWN = { x: 0, z: 0 } as const;

/**
 * **Die Zonen und ihre Kachelrechtecke.**
 *
 * Eine Tabelle und keine neun Konstanten verstreut über neun Dateien: Wer
 * wissen will, ob zwei Zonen ineinanderstehen, will sie nebeneinander sehen —
 * und der Test rechnet genau das nach.
 */
export const START: NavRect = { x: -4, z: -4, w: 9, d: 9 };
export const INTERACT: NavRect = { x: -22, z: -18, w: 11, d: 9 };
export const EFFECTS: NavRect = { x: -6, z: -16, w: 13, d: 7 };
export const PODIUM: NavRect = { x: 12, z: -18, w: 11, d: 9 };
export const NAVIGATION: NavRect = { x: -24, z: -3, w: 17, d: 7 };
export const RANGE: NavRect = { x: 6, z: -3, w: 6, d: 7 };
/**
 * Die Kletterzone — **ohne** die Kachelreihe, auf der ihre Wand steht.
 *
 * Die Wand ist eine acht Meter hohe Masse (`zones/climb.ts`), und eine Masse
 * auf einer begehbaren Kachel wäre ein Weg im Graphen, den man in Wirklichkeit
 * nicht gehen kann. Also liegt die Wandreihe **nördlich** dieses Rechtecks, und
 * hereingekommen wird von Westen.
 */
export const CLIMB: NavRect = { x: 24, z: 9, w: 10, d: 9 };

/**
 * **Die Küche** — ganz im Norden, hinter dem Podest.
 *
 * Sie ist die jüngste Zone und der Grund, warum das Gelände nach Norden
 * gewachsen ist (`FIELD`): Die Möbel aus dem Katalog sind **groß** — eine
 * Spüle misst 4 × 3 m, ein Herd 3 × 3 (`core/kitchenFit.ts`) —, und in eine
 * Lücke zwischen zwei bestehenden Zonen passt davon keine Reihe.
 *
 * **Zwölf Kacheln sind die Küche selbst** — drei Bänder: Geräte an der Wand,
 * eine Insel, die Ausgabe. **Acht weitere sind die Werkhalle**
 * (`zones/kitchenPlan.PIPELINE`): Mit Kombinierer, Mixer und Filterband lässt
 * sich eine Straße bauen, die einen Burger ohne Läufer zusammensetzt — nur
 * passte sie nirgends hin, denn die Küche war bis auf verstreute Einzelkacheln
 * voll, und eine Bandstraße braucht **Spalten am Stück**. Sie fängt deshalb
 * dort an, wo die Küche aufhört, und neben der Straße ist noch Platz für eine
 * eigene.
 *
 * **Hinter der Halle lag einmal ein Schauraum**, in dem jedes Möbel des
 * Katalogs einzeln stand und beschriftet war — siebzehn Kacheln Breite nur
 * dafür. Den Katalog gibt es jetzt am Rechner (`shared/construct.ts`): Wer vor
 * dem Computer-Tisch `A` drückt, steht mitten in ihm und hat jedes Stück in
 * Reichweite, statt daran vorbeizulaufen. Die Zone ist damit wieder auf
 * zwanzig Kacheln geschrumpft.
 *
 * Hinter dem Podest und nicht neben dem Schießstand: Dessen Bahnen laufen
 * quer über den ganzen Osten bis zum Kugelfang (`zones/range.ts`, `BERM`), und
 * eine Küche in der Schusslinie ist eine Küche mit Löchern.
 */
export const KITCHEN: NavRect = { x: 12, z: -31, w: 20, d: 11 };

/**
 * **Wo man in der Küche ankommt** — die Mitte des Gangs zwischen Insel und
 * Ausgabe, dort, wo ein Koch steht.
 *
 * Es ist der Anker der Zone im Sprungmenü (`ZONE_TILES`), in der Adresse
 * (`spawnAt.ts`, `?at=kitchen`) — **und seit die Seite mit der Testwelt
 * aufmacht, der Startplatz der ganzen Welt** (`TestWorld.spawnPoint`,
 * `worlds/index.DEFAULT_WORLD`). Drei Wege, eine Kachel: Wer die Küche
 * verschiebt, verschiebt alle drei zusammen.
 *
 * Der **Startplatz** im Süden (`SPAWN`) bleibt davon unberührt. Er ist weiter
 * der Anker seiner Zone und der Ort, an dem das Tor zum Hub steht
 * (`zones/start.ts`); er ist nur nicht mehr der erste Ort, den man sieht.
 */
export const KITCHEN_SPAWN = { x: KITCHEN.x + 1, z: KITCHEN.z + 7 } as const;

/*
 * **Hier lag die zweite Küche** — ein Restaurant aus dem zweiten Möbelkatalog
 * (`DINER`, 24 × 24 Kacheln bei x = −24, z = −56, ganz oben im Norden über der
 * ersten). Sie ist weg, samt ihrer Zone (`zones/diner.ts`, `zones/dinerPlan.ts`)
 * und ihrem Eintrag im Sprungmenü.
 *
 * **Der Katalog bleibt** (`core/dinerFit.ts`, `core/dinerModel.ts`,
 * `public/models/diner.glb`): Aus ihm kommen die Zutaten der ersten Küche —
 * Brötchen, Patty, Salat, Tomate, Teller, Kisten (`zones/kitchenProps.ts`) —,
 * und im Konstrukt-Raum steht er als Möbelkatalog zum Durchblättern
 * (`shared/construct.ts`). Ein zweiter eingerichteter Raum dafür war es, was
 * nicht mehr gebraucht wurde, nicht der Baukasten selbst.
 *
 * Das Gelände (`FIELD`) behält seine Ausdehnung nach Norden: Es wächst mit
 * dem, was darin steht, und einen Plan zu beschneiden, weil gerade nichts
 * darauf steht, verschiebt jede Zahl darunter ein zweites Mal.
 */

/**
 * **Die Gänge zwischen den Zonen**, drei Kacheln breit, wo es geht.
 *
 * Drei, weil zwei heißt „aneinander vorbei geht es gerade so" und einer heißt
 * „hier steht gleich eine Kiste im Weg" — das ist ein Versuchsaufbau der
 * Navigationszone und nicht der Normalfall des Geländes.
 *
 * Zwei davon sind länger, als eine gerade Linie es verlangte, und beide aus
 * demselben Grund: Die Kartbahn liegt mit ihrem Asphalt quer über den ganzen
 * Süden. Wer von der Mitte zur Boxengasse will, geht deshalb **westlich um sie
 * herum** (durch die Navigation), und wer zur Kletterwand will, östlich —
 * quer über die Strecke liefe man dem ersten Kart vor die Nase.
 */
export const PATHS: readonly NavRect[] = [
  // Mitte → Effekte (Norden).
  { x: -1, z: -9, w: 3, d: 5 },
  // Effekte → Interaktionen (Nordwesten).
  { x: -11, z: -15, w: 5, d: 3 },
  // Effekte → Treppe und Podest (Nordosten).
  { x: 7, z: -15, w: 5, d: 3 },
  // Mitte → Navigation (Westen).
  { x: -7, z: -1, w: 3, d: 3 },
  // Mitte → Schießstand (Osten). Eine Kachel breit: dahinter wird geschossen,
  // und ein breiter Eingang wäre eine breite Einladung, von der Seite in die
  // Bahn zu treten.
  { x: 5, z: -2, w: 1, d: 5 },
  // Navigation → Boxengasse (Südwesten, außen um die Strecke herum). Eine
  // Kachel breit, und zwar genau die, in der die Mauer der Gasse ihre Lücke
  // hat (`kart/kartPit.ts`): Ein breiter Gang endete vor einer Brüstung.
  { x: -20, z: 4, w: 1, d: 15 },
  // Mitte → Kletterwand (Südosten, außen um die Strecke herum).
  { x: 2, z: 5, w: 25, d: 3 },
  // Und das letzte Stück zur Kletterwand: von Westen herein, denn im Norden
  // steht ihre Wand.
  { x: 21, z: 8, w: 3, d: 2 },
  // Podest → Küche (ganz im Norden). **Westlich am Podest vorbei**: Über
  // dessen Mitte stünde man unter dem Deck, und von oben verschwindet dann
  // genau das Stück Weg, das man gerade geht (`core/cutaway.ts`).
  { x: 12, z: -21, w: 3, d: 4 },
  // Und der Gang an der Westwand der ersten Küche entlang nach Süden, unten
  // herum in ihren eigenen Gang. Er führte einmal weiter nach Norden in die
  // zweite Küche; die ist weg, und was bleibt, ist der zweite Zugang zur
  // ersten — um ihre Wand herum und nicht durch sie, denn eine Tür in eine
  // fremde Zone zu schlagen hieße, ihren Grundriss von hier aus zu ändern.
  { x: 9, z: -33, w: 3, d: 13 },
  { x: 9, z: -20, w: 6, d: 3 },
];

/**
 * **Eine Kachel je Zone** — der Anker, an dem der Test die Erreichbarkeit misst.
 *
 * Eine Kachel und nicht das ganze Rechteck: Der Test läuft ohnehin über jede
 * einzelne Kachel des Plans; diese Liste sagt, welche davon zu welcher Zone
 * gehört, damit eine Fehlermeldung „die Kletterwand hängt in der Luft" lautet
 * und nicht „Kachel 24,12 hat keinen Anschluss".
 *
 * **Und seit es den Sprung im Menü gibt, ist es zugleich die Liste der Ziele**
 * (`TestWorld.menu`): Dieselbe Kachel, an der ein Test misst, ob man hinkommt,
 * ist die, auf die man gesetzt wird. Eine zweite Liste daneben wäre die, die
 * beim nächsten Verschieben einer Zone stehen bleibt.
 */
export const ZONE_TILES: Readonly<Record<string, { x: number; z: number; level: number }>> = {
  start: { x: SPAWN.x, z: SPAWN.z, level: 0 },
  interact: { x: INTERACT.x + 5, z: INTERACT.z + 4, level: 0 },
  effects: { x: 0, z: EFFECTS.z + 2, level: 0 },
  podium: { x: PODIUM.x + 6, z: PODIUM.z + 2, level: 1 },
  navigation: { x: NAVIGATION.x + 2, z: NAVIGATION.z + 3, level: 0 },
  range: { x: RANGE.x + 3, z: 0, level: 0 },
  kart: { x: -20, z: 22, level: 0 },
  climb: { x: CLIMB.x + 5, z: CLIMB.z + 4, level: 0 },
  kitchen: { ...KITCHEN_SPAWN, level: 0 },
};

/**
 * **Wie die Zonen heißen** — für das Menü, und nur dafür.
 *
 * Die Kennungen oben sind Schlüssel für Tests und Code; im Menü steht, was
 * jemand sucht, der das Gelände zum ersten Mal sieht. Beide Listen tragen
 * dieselben Namen, und ein Test daneben hält das fest: Wer eine Zone dazutut,
 * soll sie nicht im Menü vergessen.
 */
export const ZONE_LABELS: Readonly<Record<string, string>> = {
  start: 'Startplatz',
  interact: 'Interaktionen',
  effects: 'Effekte',
  podium: 'Podest',
  navigation: 'Navigation',
  range: 'Schießstand',
  kart: 'Boxengasse',
  climb: 'Kletterwand',
  kitchen: 'Küche',
};

/** Die Mitte einer Kachel in Weltmetern — Zonen rechnen damit ihre Requisiten aus. */
export function centre(tile: number): number {
  return (tile + 0.5) * TILE;
}
