/**
 * **Der dritte Katalog: die Wundertüte** — was es gibt, wie groß es ist und
 * wie es heißt. Ohne three.js, ohne Vite, ohne Datei.
 *
 * Dieselbe Teilung wie bei den beiden anderen (`core/kitchenFit.ts`,
 * `core/dinerFit.ts`) und aus demselben Grund: Der Lader braucht `GLTFLoader`
 * und `import.meta`, und beides gibt es in Jest nicht. Was ein Grundriss über
 * ein Stück wissen muss — Name, Beschriftung, Grundfläche, Höhe —, sind
 * Zahlen, und die stehen hier.
 *
 * **Geschrieben wird die Liste von `tools/mixedbag-model.mjs --list`**, und
 * zwar vollständig: Wer die Quelle austauscht, lässt
 * `node tools/mixedbag-model.mjs --in=… --list --fit=src/core/mixedbagFit.ts`
 * laufen und bekommt genau diesen Block ersetzt. Von Hand gepflegt wird hier
 * nichts.
 *
 * ## Was eine Wundertüte von einem Baukasten unterscheidet
 *
 * Der zweite Katalog (`core/dinerFit.ts`) ist ein Restaurant in Einzelteilen:
 * 156 Stücke, alle auf einem Raster, und jedes hat seinen Platz in einer
 * Küche. Diese Quelle hat kein Thema — sie ist eine Sammlung von Wünschen, die
 * ein Zeichner vor Publikum erfüllt hat: ein Fahrrad, vier Regenschirme, drei
 * Slush-Maschinen, ein Zirkuszelt, ein Feuerlöscher.
 *
 * Für den Katalog heißt das **nur eines**: Es gibt kein Sieb. Sonst ist er
 * derselbe — die Ursprünge bleiben, wo der Zeichner sie hingelegt hat, und
 * `foot`, `at` und `span` sagen, wo das Stück um seinen Ursprung herum liegt.
 * Gebraucht wird die Datei bisher für **ein** Stück: Der Feuerlöscher der
 * ersten Küche kommt seit dem Austausch von hier
 * (`core/kitchenFit.ts`, `extinguisher`).
 */

/**
 * **Auch diese Quelle ist doppelt so groß gebaut, wie sie sein soll** — also
 * halbiert, wie die beiden anderen (`core/kitchenFit.KITCHEN_SCALE`,
 * `core/dinerFit.DINER_SCALE`).
 *
 * Nachgemessen an der Quelle: Der Feuerlöscher ist dort 1,205 hoch, der
 * Hydrant 1,210, die Gitarre 1,883 lang, das Skateboard 1,825, der Holzofen
 * 2,60. Halbiert sind das 60 cm Löscher, 60 cm Hydrant, 94 cm Gitarre, 91 cm
 * Brett und 1,30 m Ofen — Maße, die neben einem Koch von 1,60 m
 * (`core/chefFit.ts`) stimmen. Ungeteilt reichte der Feuerlöscher einem
 * Menschen bis über die Brust, und das Skateboard wäre ein Surfbrett.
 *
 * Drei Quellen, drei Zeichner, derselbe Faktor: Alle drei sind in
 * „Blender-Metern" gebaut, in denen eine Kachel zwei sind.
 *
 * Der Faktor sitzt am **Lader** (`core/mixedbagModel.ts`) und nicht in der
 * Quelldatei: Die ist fremde Arbeit und wird nicht angefasst. Die Maße in
 * diesem Katalog sind die **fertigen** — was hier steht, ist, wie groß ein
 * Stück im Spiel ist.
 */
export const MIXEDBAG_SCALE = 0.5;

/** Ein Stück im Katalog der Wundertüte. */
export interface MixedBagPiece {
  /** Der Name des Knotens in `public/models/mixedbag.glb`. */
  readonly name: string;
  /** Wie es auf einer Tafel und im Menü heißt. */
  readonly label: string;
  /**
   * Wie viele Kacheln es belegt (`worlds/nav/navTile.TILE` = 1 m) — die
   * **gerundete** Grundfläche aus `span` und nicht die aufgerundete, dieselbe
   * Entscheidung wie in den beiden anderen Katalogen. Kleiner als eine Kachel
   * wird die Zahl nie: Ein Kettenglied belegt keine halbe.
   */
  readonly tiles: readonly [x: number, z: number];
  /**
   * **Die Oberkante über dem Ursprung**, in Metern — für Kopffreiheit, Sicht
   * und die Tafel daneben.
   *
   * Über dem **Ursprung** und nicht über dem Fußboden: Bei der Hängekette ist
   * das 0,02 m, weil sie unter ihrem Aufhängepunkt hängt. Wo das Stück
   * anfängt, sagt `foot`; wie hoch es wirklich ist, ist `height − foot`.
   */
  readonly height: number;
  /**
   * **Die Unterkante über dem Ursprung**, in Metern — steht nur dort, wo sie
   * nicht null ist.
   *
   * Negativ heißt **es hängt unter seinem Ursprung**: die beiden Hängeketten,
   * die Gitarre (deren Ursprung am Wirbel sitzt, nicht am Korpus), der
   * Regenschirm. Wer so ein Stück frei hinstellt, hebt es um `−foot` an — das
   * rechnet `mixedbagStand`.
   */
  readonly foot?: number;
  /**
   * **Wo die Mitte der Hülle liegt**, in Metern (x, z) gegen den Ursprung —
   * steht nur dort, wo sie nicht in ihm liegt.
   *
   * Dasselbe Feld wie im zweiten Katalog (`core/dinerFit.DinerPiece.at`) und
   * mit derselben Lesart: Es **verschiebt** nichts, es **beschreibt** nur, wo
   * das Stück um seinen unangetasteten Ursprung herum liegt. Wer ein Stück
   * mittig auf eine Kachel stellen will, zieht `at` ab.
   */
  readonly at?: readonly [x: number, z: number];
  /**
   * **Wie breit und wie tief das Stück wirklich ist**, in Metern — das
   * ungerundete Maß, aus dem `tiles` gerundet wurde.
   */
  readonly span: readonly [x: number, z: number];
}

export const MIXEDBAG_PIECES: readonly MixedBagPiece[] = [
  {
    name: 'arcademachine_A',
    label: 'Spielautomat A',
    tiles: [1, 1],
    height: 1.2618,
    at: [0, 0.1138],
    span: [0.6782, 0.7696],
  },
  {
    name: 'arcademachine_B',
    label: 'Spielautomat B',
    tiles: [1, 1],
    height: 1.2618,
    at: [0, 0.1138],
    span: [0.6782, 0.7696],
  },
  {
    name: 'bicycle',
    label: 'Fahrrad',
    tiles: [1, 1],
    height: 0.4014,
    foot: -0.2525,
    at: [0, 0.0332],
    span: [0.553, 0.9357],
  },
  { name: 'chain_anchor', label: 'Kettenanker', tiles: [1, 1], height: 0.1081, span: [0.15, 0.15] },
  {
    name: 'chain_hanging_A',
    label: 'Hängekette A',
    tiles: [1, 1],
    height: 0,
    foot: -0.9386,
    span: [0.15, 0.15],
  },
  {
    name: 'chain_hanging_B',
    label: 'Hängekette B',
    tiles: [1, 1],
    height: 0,
    foot: -0.8106,
    span: [1.25, 0.15],
  },
  {
    name: 'chain_shackle',
    label: 'Schäkel',
    tiles: [1, 1],
    height: 0.0375,
    foot: -0.0375,
    span: [0.2333, 0.2907],
  },
  {
    name: 'chainlink',
    label: 'Kettenglied',
    tiles: [1, 1],
    height: 0.0831,
    foot: -0.0831,
    span: [0.1221, 0.0357],
  },
  {
    name: 'chainlinks',
    label: 'Kettenglieder',
    tiles: [1, 1],
    height: 0.1831,
    foot: -0.0831,
    span: [0.1221, 0.1221],
  },
  {
    name: 'chicken_plushie_A',
    label: 'Plüschhuhn A',
    tiles: [1, 1],
    height: 0.4562,
    at: [0, -0.0051],
    span: [0.4127, 0.4593],
  },
  {
    name: 'chicken_plushie_B',
    label: 'Plüschhuhn B',
    tiles: [1, 1],
    height: 0.4562,
    at: [0, -0.0108],
    span: [0.4127, 0.4481],
  },
  {
    name: 'circus_tent',
    label: 'Zirkuszelt',
    tiles: [2, 2],
    height: 1.2143,
    foot: -0.03,
    span: [1.738, 1.738],
  },
  {
    name: 'comicbook_A',
    label: 'Comicheft A',
    tiles: [1, 1],
    height: 0.1723,
    foot: -0.1723,
    span: [0.2564, 0.0183],
  },
  {
    name: 'comicbooks_stacked',
    label: 'Comichefte, gestapelt',
    tiles: [1, 1],
    height: 0.0557,
    span: [0.4203, 0.4281],
  },
  {
    name: 'comicbox_closed',
    label: 'Comickiste, zu',
    tiles: [1, 1],
    height: 0.373,
    span: [0.3594, 0.432],
  },
  {
    name: 'comicbox_filled',
    label: 'Comickiste, gefüllt',
    tiles: [1, 1],
    height: 0.4385,
    span: [0.3178, 0.4],
  },
  {
    name: 'comicbox_open',
    label: 'Comickiste, offen',
    tiles: [1, 1],
    height: 0.373,
    span: [0.3594, 0.432],
  },
  {
    name: 'comicbox_open_B',
    label: 'Comicheft, Umschlag',
    tiles: [1, 1],
    height: 0.1723,
    foot: -0.1723,
    span: [0.2564, 0.0183],
  },
  { name: 'cup', label: 'Becher', tiles: [1, 1], height: 0.2691, span: [0.1561, 0.1561] },
  {
    name: 'cups_stacked',
    label: 'Becher, gestapelt',
    tiles: [1, 1],
    height: 0.5541,
    span: [0.1561, 0.1561],
  },
  {
    name: 'fire_extinguisher',
    label: 'Feuerlöscher',
    tiles: [1, 1],
    height: 0.6025,
    at: [-0.0157, 0],
    span: [0.4434, 0.2121],
  },
  {
    name: 'fire_hydrant',
    label: 'Hydrant',
    tiles: [1, 1],
    height: 0.6049,
    at: [0, 0.0095],
    span: [0.3227, 0.3372],
  },
  {
    name: 'flax_flower_A',
    label: 'Leinblume A',
    tiles: [1, 1],
    height: 0.4805,
    foot: -0.0124,
    at: [-0.0305, 0.0152],
    span: [0.2497, 0.1673],
  },
  {
    name: 'flax_flower_B',
    label: 'Leinblume B',
    tiles: [1, 1],
    height: 0.4355,
    foot: -0.0124,
    at: [0.0301, 0.0282],
    span: [0.1841, 0.1921],
  },
  {
    name: 'guitar_A',
    label: 'Gitarre A',
    tiles: [1, 1],
    height: 0.2668,
    foot: -0.6747,
    span: [0.4239, 0.0852],
  },
  {
    name: 'guitar_B',
    label: 'Gitarre B',
    tiles: [1, 1],
    height: 0.2668,
    foot: -0.6747,
    span: [0.4239, 0.0852],
  },
  {
    name: 'gumball_machine',
    label: 'Kaugummiautomat',
    tiles: [1, 1],
    height: 0.6594,
    span: [0.3515, 0.3515],
  },
  {
    name: 'idol_A',
    label: 'Götzenfigur A',
    tiles: [1, 1],
    height: 0.4225,
    at: [0, -0.0098],
    span: [0.1948, 0.1839],
  },
  {
    name: 'idol_B',
    label: 'Götzenfigur B',
    tiles: [1, 1],
    height: 0.3667,
    at: [0.0185, 0.004],
    span: [0.1916, 0.1752],
  },
  {
    name: 'instantcamera',
    label: 'Sofortbildkamera',
    tiles: [1, 1],
    height: 0.2788,
    at: [0, 0.0194],
    span: [0.3004, 0.2872],
  },
  {
    name: 'instantcamera_green',
    label: 'Sofortbildkamera, grün',
    tiles: [1, 1],
    height: 0.2788,
    at: [0, 0.0194],
    span: [0.3004, 0.2872],
  },
  {
    name: 'instantcamera_picture_A',
    label: 'Sofortbild A',
    tiles: [1, 1],
    height: 0.1001,
    foot: -0.1136,
    span: [0.1709, 0.0142],
  },
  {
    name: 'instantcamera_picture_B',
    label: 'Sofortbild B',
    tiles: [1, 1],
    height: 0.1001,
    foot: -0.1136,
    span: [0.1709, 0.0142],
  },
  {
    name: 'mining_helmet',
    label: 'Grubenhelm',
    tiles: [1, 1],
    height: 0.3791,
    at: [0, 0.0259],
    span: [0.6042, 0.6572],
  },
  {
    name: 'puzzlecube_center',
    label: 'Zauberwürfel, zerlegt',
    tiles: [1, 1],
    height: 0.1062,
    foot: -0.1062,
    span: [0.2124, 0.2124],
  },
  {
    name: 'puzzlecube_complete',
    label: 'Zauberwürfel, gelöst',
    tiles: [1, 1],
    height: 0.1062,
    foot: -0.1062,
    span: [0.2124, 0.2124],
  },
  {
    name: 'puzzlecube_incomplete',
    label: 'Zauberwürfel, ungelöst',
    tiles: [1, 1],
    height: 0.1062,
    foot: -0.1062,
    span: [0.2124, 0.2124],
  },
  {
    name: 'rollerskate_A',
    label: 'Rollschuh A',
    tiles: [1, 1],
    height: 0.1056,
    at: [0, 0.0247],
    span: [0.135, 0.2493],
  },
  {
    name: 'rollerskate_B',
    label: 'Rollschuh B',
    tiles: [1, 1],
    height: 0.1905,
    at: [0, 0.0247],
    span: [0.135, 0.2493],
  },
  {
    name: 'rollerskate_pair',
    label: 'Rollschuhpaar',
    tiles: [1, 1],
    height: 0.1957,
    span: [0.278, 0.2987],
  },
  {
    name: 'sandcastle',
    label: 'Sandburg',
    tiles: [1, 1],
    height: 0.565,
    at: [0, 0.022],
    span: [0.3999, 0.45],
  },
  {
    name: 'skateboard_A',
    label: 'Skateboard A',
    tiles: [1, 1],
    height: 0.0662,
    foot: -0.1095,
    span: [0.3152, 0.9125],
  },
  {
    name: 'skateboard_B',
    label: 'Skateboard B',
    tiles: [1, 1],
    height: 0.0662,
    foot: -0.1095,
    span: [0.3152, 0.9125],
  },
  {
    name: 'slushy_blue',
    label: 'Slush-Becher, blau',
    tiles: [1, 1],
    height: 0.3738,
    span: [0.164, 0.1561],
  },
  {
    name: 'slushy_machine_blue',
    label: 'Slush-Maschine, blau',
    tiles: [1, 1],
    height: 0.9588,
    at: [0, 0.0631],
    span: [0.4089, 0.6298],
  },
  {
    name: 'slushy_machine_pink',
    label: 'Slush-Maschine, pink',
    tiles: [1, 1],
    height: 0.9588,
    at: [0, 0.0631],
    span: [0.4089, 0.6298],
  },
  {
    name: 'slushy_machine_yellow',
    label: 'Slush-Maschine, gelb',
    tiles: [1, 1],
    height: 0.9588,
    at: [0, 0.0631],
    span: [0.4089, 0.6298],
  },
  {
    name: 'slushy_pink',
    label: 'Slush-Becher, pink',
    tiles: [1, 1],
    height: 0.3738,
    span: [0.164, 0.1561],
  },
  {
    name: 'slushy_yellow',
    label: 'Slush-Becher, gelb',
    tiles: [1, 1],
    height: 0.3738,
    span: [0.164, 0.1561],
  },
  {
    name: 'taco',
    label: 'Taco',
    tiles: [1, 1],
    height: 0.2478,
    foot: -0.006,
    span: [0.2268, 0.5107],
  },
  {
    name: 'toolcart',
    label: 'Werkzeugwagen',
    tiles: [1, 1],
    height: 0.5607,
    at: [0.0485, 0.0156],
    span: [0.722, 0.4688],
  },
  {
    name: 'toolcart_tall',
    label: 'Werkzeugwagen, hoch',
    tiles: [1, 1],
    height: 0.6544,
    at: [0.0485, 0.0156],
    span: [0.722, 0.4688],
  },
  {
    name: 'umbrella_blue',
    label: 'Regenschirm, blau',
    tiles: [1, 1],
    height: 0.7919,
    foot: -0.1369,
    span: [0.8858, 0.8399],
  },
  {
    name: 'umbrella_green',
    label: 'Regenschirm, grün',
    tiles: [1, 1],
    height: 0.7919,
    foot: -0.1369,
    span: [0.8858, 0.8399],
  },
  {
    name: 'umbrella_pink',
    label: 'Regenschirm, pink',
    tiles: [1, 1],
    height: 0.7919,
    foot: -0.1369,
    span: [0.8858, 0.8399],
  },
  {
    name: 'umbrella_yellow',
    label: 'Regenschirm, gelb',
    tiles: [1, 1],
    height: 0.7919,
    foot: -0.1369,
    span: [0.8858, 0.8399],
  },
  {
    name: 'waterbottle_A',
    label: 'Wasserflasche A',
    tiles: [1, 1],
    height: 0.4077,
    span: [0.1647, 0.1647],
  },
  {
    name: 'waterbottle_B',
    label: 'Wasserflasche B',
    tiles: [1, 1],
    height: 0.4077,
    span: [0.1647, 0.1647],
  },
  { name: 'woodstove', label: 'Holzofen', tiles: [1, 1], height: 1.3, span: [0.6007, 0.6089] },
];

/** Die Namen aller Stücke, in der Reihenfolge des Katalogs. */
export const MIXEDBAG_NAMES: readonly string[] = MIXEDBAG_PIECES.map((piece) => piece.name);

/** Ein Stück nach Namen — `undefined`, wenn es den Namen nicht gibt. */
export function mixedbagPiece(name: string): MixedBagPiece | undefined {
  return MIXEDBAG_PIECES.find((piece) => piece.name === name);
}

/**
 * **Wie hoch ein Stück angehoben werden muss, damit es auf dem Boden steht** —
 * null für alles, was auf seinem Ursprung steht, und `−foot` für das, was
 * darunter hängt.
 *
 * Dieselbe Rechnung wie `core/dinerFit.dinerStand`, und sie steht hier noch
 * einmal statt geteilt zu werden: Zwei Kataloge, die einander importieren, sind
 * der Anfang davon, dass der eine ohne den anderen nicht mehr zu lesen ist.
 */
export function mixedbagStand(piece: MixedBagPiece): number {
  return Math.max(0, -(piece.foot ?? 0));
}

/** **Wie hoch die Oberkante über dem Boden liegt**, wenn es so dasteht. */
export function mixedbagTop(piece: MixedBagPiece): number {
  return piece.height + mixedbagStand(piece);
}

/** **Wie hoch das Stück selbst ist** — von seiner Unter- bis zu seiner Oberkante. */
export function mixedbagHeight(piece: MixedBagPiece): number {
  return piece.height - (piece.foot ?? 0);
}
