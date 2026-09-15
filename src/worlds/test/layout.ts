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
export const FIELD: NavRect = { x: -27, z: -22, w: 64, d: 68 };

/** Wo man ankommt: die Mitte des Startplatzes. */
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
];

/**
 * **Eine Kachel je Zone** — der Anker, an dem der Test die Erreichbarkeit misst.
 *
 * Eine Kachel und nicht das ganze Rechteck: Der Test läuft ohnehin über jede
 * einzelne Kachel des Plans; diese Liste sagt, welche davon zu welcher Zone
 * gehört, damit eine Fehlermeldung „die Kletterwand hängt in der Luft" lautet
 * und nicht „Kachel 24,12 hat keinen Anschluss".
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
};

/** Die Mitte einer Kachel in Weltmetern — Zonen rechnen damit ihre Requisiten aus. */
export function centre(tile: number): number {
  return (tile + 0.5) * TILE;
}
