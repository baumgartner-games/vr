/**
 * **Der Möbelkatalog der zweiten Küche** — was es gibt, wie groß es ist und
 * wie es heißt. Ohne three.js, ohne Vite, ohne Datei.
 *
 * Dieselbe Teilung wie bei der ersten Küche (`core/kitchenFit.ts` neben
 * `core/kitchenModel.ts`) und aus demselben Grund: Der Lader braucht
 * `GLTFLoader` und `import.meta`, und beides gibt es in Jest nicht. Was ein
 * Grundriss über ein Möbel wissen muss — Name, Beschriftung, Grundfläche,
 * Höhe —, sind Zahlen, und die stehen hier.
 *
 * **Geschrieben wird die Liste von `tools/diner-model.mjs --list`**, und zwar
 * vollständig: Wer die Quelle austauscht, lässt
 * `node tools/diner-model.mjs --in=… --list --fit=src/core/dinerFit.ts` laufen
 * und bekommt genau diesen Block ersetzt. Von Hand gepflegt wird hier nichts
 * — 156 nachgemessene Hüllen sind keine Liste, die jemand pflegt, ohne sich
 * zu vertun.
 *
 * ## Warum dieser Katalog anders aussieht als der der ersten Küche
 *
 * Die erste Küche kommt aus einer **Schauraum-Szene**: ein aufgebautes Bild in
 * vier Netzen, aus dem `tools/kitchen-model.mjs` dreizehn Möbel herausschneidet
 * und dabei jedes in seiner Hülle zentriert. Eine Hülle ist aber nicht der
 * Korpus, und deshalb steht dort hinter jedem fünften Möbel ein nachgemessener
 * Versatz (`KitchenPiece.align`) — der Türgriff der Küchenzeile allein
 * verschiebt sie um 3,07 cm.
 *
 * Diese Quelle ist **auf einem Raster gebaut**. Jedes der 156 Stücke steht in
 * einer Zelle von 2 × 2 m (im Spiel: einer Kachel), und sein Ursprung ist der
 * Punkt, an dem es in dieser Zelle hängt: Ein Hängeschrank fängt bei y = 1 an,
 * eine Wand steht am hinteren Rand ihrer Zelle, eine Tür im Türsturz. Das
 * Werkzeug lässt diesen Ursprung deshalb **stehen** und misst nur nach, was um
 * ihn herum liegt. `align` gibt es hier nicht; es gibt `foot`, `at` und `span`,
 * und die sind gemessen und nicht geraten.
 */

/**
 * **Die Möbel kommen doppelt so groß, wie sie sein sollen** — also halbiert,
 * genau wie bei der ersten Küche (`core/kitchenFit.KITCHEN_SCALE`).
 *
 * Nachgemessen an der Quelle: Eine Küchenzeile ist dort 2 × 2,04 m groß und
 * 1 m hoch, eine Wand 4 m breit und 4 m hoch, ein Kühlschrank 2 × 2,24 m bei
 * 2,50 m Höhe. Halbiert belegt die Zeile **eine** Kachel
 * (`worlds/nav/navTile.TILE` = 1 m) und ist einen halben Meter hoch — und das
 * ist auf den Zentimeter das Maß, mit dem die Küchenzeile der ersten Küche
 * schon dasteht (`KITCHEN_PIECES`, `counter`, `height: 0.5`). Zwei Quellen,
 * zwei Zeichner, derselbe Faktor: Beide sind in „Blender-Metern" gebaut, in
 * denen eine Kachel zwei sind.
 *
 * Der Faktor sitzt am **Lader** (`core/dinerModel.ts`) und nicht in der
 * Quelldatei: Die ist fremde Arbeit und wird nicht angefasst. Die Maße in
 * diesem Katalog sind die **fertigen** — was hier steht, ist, wie groß ein
 * Möbel im Spiel ist.
 */
export const DINER_SCALE = 0.5;

/** Ein Stück im Katalog der zweiten Küche. */
export interface DinerPiece {
  /** Der Name des Knotens in `public/models/diner.glb`. */
  readonly name: string;
  /** Wie es im Schauraum und im Menü heißt. */
  readonly label: string;
  /**
   * Wie viele Kacheln es belegt (`worlds/nav/navTile.TILE` = 1 m) — die
   * **gerundete** Grundfläche aus `span` und nicht die aufgerundete.
   *
   * Dieselbe Entscheidung wie im ersten Katalog: Eine Küchenzeile ist 1 m
   * breit und 1,02 m tief, und wer daraus zwei Kacheln macht, stellt eine
   * ganze Zeile davon mit einem Meter Luft dazwischen auf. Ein Möbel darf ein
   * paar Zentimeter über seine Kachel hinausragen; eine Küche mit Lücken darin
   * ist keine Küche. Kleiner als eine Kachel wird die Zahl nie — ein Messer
   * belegt keine halbe.
   */
  readonly tiles: readonly [x: number, z: number];
  /**
   * **Die Oberkante über dem Ursprung**, in Metern — für Kopffreiheit, Sicht
   * und die Tafel im Schauraum.
   *
   * Über dem **Ursprung** und nicht über dem Fußboden: Bei einem Hängeschrank
   * ist das die Oberkante an der Wand (2,00 m), bei einer Bodenplatte ist es
   * 0,00 m, weil die Platte unter ihrem Ursprung liegt. Wo das Stück anfängt,
   * sagt `foot`; wie hoch es wirklich ist, ist `height − foot`.
   */
  readonly height: number;
  /**
   * **Die Unterkante über dem Ursprung**, in Metern — steht nur dort, wo sie
   * nicht null ist.
   *
   * Positiv heißt **es hängt**: Der Hängeschrank fängt bei 1,00 m an, die
   * Dunstabzugshaube ebenso, die Wandfliesen bei 0,50 m. Darunter läuft man
   * durch, und eine Kachel, die es teuer machte, wäre eine Kachel, um die ein
   * NPC grundlos herumginge (`worlds/test/zones/dinerPlan.ts`).
   *
   * Negativ heißt **es steckt unter seinem Ursprung**: Die Bodenplatten
   * reichen 25 cm nach unten (ihr Ursprung ist ihre Oberfläche), der
   * Rollenhalter hängt 45 cm unter seinem Wandanschluss. Wer so ein Stück frei
   * hinstellt, hebt es um `−foot` an — das rechnet `dinerStand`.
   */
  readonly foot?: number;
  /**
   * **Wo die Mitte der Hülle liegt**, in Metern (x, z) gegen den Ursprung —
   * steht nur dort, wo sie nicht in ihm liegt.
   *
   * Das ist das Gegenstück zu `KitchenPiece.align` und zugleich sein
   * Gegenteil: Dort **verschiebt** eine Zahl das Möbel, weil das Werkzeug den
   * Ursprung verlegt hat; hier **beschreibt** sie nur, wo das Möbel um seinen
   * unangetasteten Ursprung herum liegt. Eine Wand sitzt am hinteren Rand
   * ihrer Kachel (`at: [0, -0.125]`), eine Tür an deren Seite
   * (`at: [0.4, 0]`) — genau so, wie man sie an eine Wand baut. Wer ein Stück
   * mittig auf eine Kachel stellen will, zieht `at` ab.
   */
  readonly at?: readonly [x: number, z: number];
  /**
   * **Wie breit und wie tief das Stück wirklich ist**, in Metern — das
   * ungerundete Maß, aus dem `tiles` gerundet wurde.
   *
   * Gebraucht wird es an zwei Stellen: auf der Tafel im Schauraum (dort steht
   * das Maß und nicht die Kachelzahl) und beim Abstand zwischen zwei
   * Schaustücken, der sich nach dem breiteren richtet und nicht nach dem
   * gerundeten.
   */
  readonly span: readonly [x: number, z: number];
}

export const DINER_PIECES: readonly DinerPiece[] = [
  { name: 'bowl', label: 'Schüssel', tiles: [1, 1], height: 0.15, span: [0.475, 0.475] },
  {
    name: 'bowl_dirty',
    label: 'Schüssel, benutzt',
    tiles: [1, 1],
    height: 0.15,
    span: [0.475, 0.475],
  },
  {
    name: 'bowl_small',
    label: 'Schüssel, klein',
    tiles: [1, 1],
    height: 0.15,
    span: [0.375, 0.375],
  },
  {
    name: 'chair_A',
    label: 'Stuhl A',
    tiles: [1, 1],
    height: 0.604,
    at: [0, -0.0116],
    span: [0.375, 0.3981],
  },
  {
    name: 'chair_B',
    label: 'Stuhl B',
    tiles: [1, 1],
    height: 0.604,
    at: [0, -0.0116],
    span: [0.375, 0.3981],
  },
  { name: 'chair_stool', label: 'Hocker', tiles: [1, 1], height: 0.25, span: [0.375, 0.375] },
  { name: 'crate', label: 'Kiste', tiles: [1, 1], height: 0.4, span: [1, 1] },
  { name: 'crate_buns', label: 'Kiste Brötchen', tiles: [1, 1], height: 0.4012, span: [1, 1] },
  { name: 'crate_carrots', label: 'Kiste Möhren', tiles: [1, 1], height: 0.4716, span: [1, 1] },
  { name: 'crate_cheese', label: 'Kiste Käse', tiles: [1, 1], height: 0.473, span: [1, 1] },
  { name: 'crate_dough', label: 'Kiste Teig', tiles: [1, 1], height: 0.4662, span: [1, 1] },
  { name: 'crate_ham', label: 'Kiste Schinken', tiles: [1, 1], height: 0.4468, span: [1, 1] },
  { name: 'crate_lettuce', label: 'Kiste Salat', tiles: [1, 1], height: 0.499, span: [1, 1] },
  { name: 'crate_lid', label: 'Kistendeckel', tiles: [1, 1], height: 0.1, span: [1, 1] },
  { name: 'crate_mushrooms', label: 'Kiste Pilze', tiles: [1, 1], height: 0.459, span: [1, 1] },
  { name: 'crate_onions', label: 'Kiste Zwiebeln', tiles: [1, 1], height: 0.4617, span: [1, 1] },
  { name: 'crate_pepperoni', label: 'Kiste Salami', tiles: [1, 1], height: 0.4676, span: [1, 1] },
  {
    name: 'crate_potatoes',
    label: 'Kiste Kartoffeln',
    tiles: [1, 1],
    height: 0.4829,
    span: [1, 1],
  },
  { name: 'crate_steak', label: 'Kiste Steaks', tiles: [1, 1], height: 0.4385, span: [1, 1] },
  { name: 'crate_tomatoes', label: 'Kiste Tomaten', tiles: [1, 1], height: 0.4617, span: [1, 1] },
  { name: 'cuttingboard', label: 'Schneidebrett', tiles: [1, 1], height: 0.075, span: [0.75, 0.5] },
  { name: 'dishrack', label: 'Abtropfgitter', tiles: [1, 1], height: 0.3, span: [0.6, 0.6] },
  {
    name: 'dishrack_plates',
    label: 'Abtropfgitter mit Tellern',
    tiles: [1, 1],
    height: 0.5476,
    span: [0.6, 0.6],
  },
  { name: 'door_A', label: 'Tür A', tiles: [1, 1], height: 1.4, at: [0.4, 0], span: [0.8, 0.3857] },
  { name: 'door_B', label: 'Tür B', tiles: [1, 1], height: 1.4, at: [0.4, 0], span: [0.8, 0.3857] },
  {
    name: 'extractorhood',
    label: 'Dunstabzugshaube',
    tiles: [1, 1],
    height: 2,
    foot: 1,
    at: [0, 0.4022],
    span: [1, 0.8044],
  },
  {
    name: 'floor_kitchen',
    label: 'Bodenplatte, groß',
    tiles: [2, 2],
    height: 0,
    foot: -0.25,
    span: [2, 2],
  },
  {
    name: 'floor_kitchen_small',
    label: 'Bodenplatte',
    tiles: [1, 1],
    height: 0,
    foot: -0.25,
    span: [1, 1],
  },
  {
    name: 'floor_kitchen_small_styleB',
    label: 'Bodenplatte, Muster B',
    tiles: [1, 1],
    height: 0,
    foot: -0.25,
    span: [1, 1],
  },
  {
    name: 'floor_kitchen_styleB',
    label: 'Bodenplatte groß, Muster B',
    tiles: [2, 2],
    height: 0,
    foot: -0.25,
    span: [2, 2],
  },
  {
    name: 'food_ingredient_bun',
    label: 'Brötchen',
    tiles: [1, 1],
    height: 0.2536,
    span: [0.35, 0.35],
  },
  {
    name: 'food_ingredient_bun_bottom',
    label: 'Brötchen, Unterteil',
    tiles: [1, 1],
    height: 0.1,
    span: [0.3469, 0.3469],
  },
  {
    name: 'food_ingredient_bun_top',
    label: 'Brötchen, Deckel',
    tiles: [1, 1],
    height: 0.1536,
    span: [0.35, 0.35],
  },
  {
    name: 'food_ingredient_burger_cooked',
    label: 'Patty, gebraten',
    tiles: [1, 1],
    height: 0.1,
    span: [0.35, 0.35],
  },
  {
    name: 'food_ingredient_burger_trash',
    label: 'Patty, verbrannt',
    tiles: [1, 1],
    height: 0.1,
    span: [0.35, 0.35],
  },
  {
    name: 'food_ingredient_burger_uncooked',
    label: 'Patty, roh',
    tiles: [1, 1],
    height: 0.1,
    span: [0.35, 0.35],
  },
  {
    name: 'food_ingredient_lettuce',
    label: 'Salatkopf',
    tiles: [1, 1],
    height: 0.4052,
    foot: -0.0051,
    at: [0, -0.0259],
    span: [0.5523, 0.5667],
  },
  {
    name: 'food_ingredient_lettuce_slice',
    label: 'Salat, geschnitten',
    tiles: [1, 1],
    height: 0.0271,
    foot: -0.017,
    span: [0.4034, 0.4034],
  },
  {
    name: 'food_ingredient_tomato',
    label: 'Tomate',
    tiles: [1, 1],
    height: 0.35,
    span: [0.375, 0.375],
  },
  {
    name: 'food_ingredient_tomato_slices',
    label: 'Tomate, geschnitten',
    tiles: [1, 1],
    height: 0.15,
    at: [0.0125, 0],
    span: [0.38, 0.325],
  },
  {
    name: 'fridge_A',
    label: 'Kühlschrank A',
    tiles: [1, 1],
    height: 1.25,
    at: [0, 0.06],
    span: [1, 1.12],
  },
  {
    name: 'fridge_A_decorated',
    label: 'Kühlschrank A, behängt',
    tiles: [1, 1],
    height: 1.25,
    at: [0, 0.06],
    span: [1, 1.12],
  },
  {
    name: 'fridge_B',
    label: 'Kühlschrank B',
    tiles: [1, 1],
    height: 1.25,
    at: [0, 0.06],
    span: [1, 1.12],
  },
  {
    name: 'icecream_machine',
    label: 'Softeismaschine',
    tiles: [1, 1],
    height: 1.2019,
    at: [0, -0.0075],
    span: [1, 1.015],
  },
  {
    name: 'jar_A_large',
    label: 'Vorratsglas A, groß',
    tiles: [1, 1],
    height: 0.375,
    span: [0.25, 0.25],
  },
  {
    name: 'jar_A_medium',
    label: 'Vorratsglas A, mittel',
    tiles: [1, 1],
    height: 0.325,
    span: [0.25, 0.25],
  },
  {
    name: 'jar_A_small',
    label: 'Vorratsglas A, klein',
    tiles: [1, 1],
    height: 0.275,
    span: [0.283, 0.283],
  },
  {
    name: 'jar_B_large',
    label: 'Vorratsglas B, groß',
    tiles: [1, 1],
    height: 0.375,
    span: [0.25, 0.25],
  },
  {
    name: 'jar_B_medium',
    label: 'Vorratsglas B, mittel',
    tiles: [1, 1],
    height: 0.325,
    span: [0.25, 0.25],
  },
  {
    name: 'jar_B_small',
    label: 'Vorratsglas B, klein',
    tiles: [1, 1],
    height: 0.275,
    span: [0.283, 0.283],
  },
  {
    name: 'jar_C_large',
    label: 'Vorratsglas C, groß',
    tiles: [1, 1],
    height: 0.375,
    span: [0.25, 0.25],
  },
  {
    name: 'jar_C_medium',
    label: 'Vorratsglas C, mittel',
    tiles: [1, 1],
    height: 0.325,
    span: [0.25, 0.25],
  },
  {
    name: 'jar_C_small',
    label: 'Vorratsglas C, klein',
    tiles: [1, 1],
    height: 0.275,
    span: [0.283, 0.283],
  },
  {
    name: 'jar_D_large',
    label: 'Vorratsglas D, groß',
    tiles: [1, 1],
    height: 0.375,
    span: [0.25, 0.25],
  },
  {
    name: 'jar_D_medium',
    label: 'Vorratsglas D, mittel',
    tiles: [1, 1],
    height: 0.325,
    span: [0.25, 0.25],
  },
  {
    name: 'jar_D_small',
    label: 'Vorratsglas D, klein',
    tiles: [1, 1],
    height: 0.275,
    span: [0.283, 0.283],
  },
  { name: 'ketchup', label: 'Ketchupflasche', tiles: [1, 1], height: 0.3893, span: [0.15, 0.15] },
  {
    name: 'kitchencabinet',
    label: 'Hängeschrank',
    tiles: [1, 1],
    height: 2,
    foot: 1,
    at: [0, 0.2605],
    span: [1, 0.521],
  },
  {
    name: 'kitchencabinet_corner',
    label: 'Hängeschrank, Ecke',
    tiles: [1, 1],
    height: 2,
    foot: 1,
    at: [0, 0.5],
    span: [1, 1],
  },
  {
    name: 'kitchencabinet_corner_half',
    label: 'Hängeschrank Ecke, halbhoch',
    tiles: [1, 1],
    height: 2,
    foot: 1.5,
    at: [0, 0.5],
    span: [1, 1],
  },
  {
    name: 'kitchencabinet_corner_half_styleB',
    label: 'Hängeschrank Ecke halbhoch, Muster B',
    tiles: [1, 1],
    height: 2,
    foot: 1.5,
    at: [0, 0.5],
    span: [1, 1],
  },
  {
    name: 'kitchencabinet_corner_styleB',
    label: 'Hängeschrank Ecke, Muster B',
    tiles: [1, 1],
    height: 2,
    foot: 1,
    at: [0, 0.5],
    span: [1, 1],
  },
  {
    name: 'kitchencabinet_half',
    label: 'Hängeschrank, halbhoch',
    tiles: [1, 1],
    height: 2,
    foot: 1.5,
    at: [0, 0.2605],
    span: [1, 0.521],
  },
  {
    name: 'kitchencabinet_half_styleB',
    label: 'Hängeschrank halbhoch, Muster B',
    tiles: [1, 1],
    height: 2,
    foot: 1.5,
    at: [0, 0.2605],
    span: [1, 0.521],
  },
  {
    name: 'kitchencabinet_styleB',
    label: 'Hängeschrank, Muster B',
    tiles: [1, 1],
    height: 2,
    foot: 1,
    at: [0, 0.2605],
    span: [1, 0.521],
  },
  {
    name: 'kitchencounter_innercorner',
    label: 'Küchenzeile, Innenecke',
    tiles: [1, 1],
    height: 0.5,
    span: [1, 1],
  },
  {
    name: 'kitchencounter_innercorner_backsplash',
    label: 'Küchenzeile Innenecke, mit Rückwand',
    tiles: [1, 1],
    height: 0.6,
    span: [1, 1],
  },
  {
    name: 'kitchencounter_innercorner_backsplash_styleB',
    label: 'Küchenzeile Innenecke mit Rückwand, Muster B',
    tiles: [1, 1],
    height: 0.6,
    span: [1, 1],
  },
  {
    name: 'kitchencounter_innercorner_styleB',
    label: 'Küchenzeile Innenecke, Muster B',
    tiles: [1, 1],
    height: 0.5,
    span: [1, 1],
  },
  {
    name: 'kitchencounter_outercorner',
    label: 'Küchenzeile, Außenecke',
    tiles: [1, 1],
    height: 0.5,
    span: [1, 1],
  },
  {
    name: 'kitchencounter_outercorner_backsplash',
    label: 'Küchenzeile Außenecke, mit Rückwand',
    tiles: [1, 1],
    height: 0.6,
    span: [1, 1],
  },
  {
    name: 'kitchencounter_outercorner_backsplash_styleB',
    label: 'Küchenzeile Außenecke mit Rückwand, Muster B',
    tiles: [1, 1],
    height: 0.6,
    span: [1, 1],
  },
  {
    name: 'kitchencounter_outercorner_styleB',
    label: 'Küchenzeile Außenecke, Muster B',
    tiles: [1, 1],
    height: 0.5,
    span: [1, 1],
  },
  {
    name: 'kitchencounter_sink',
    label: 'Küchenzeile mit Spüle',
    tiles: [1, 1],
    height: 0.9008,
    at: [0, 0.0105],
    span: [1, 1.021],
  },
  {
    name: 'kitchencounter_sink_backsplash',
    label: 'Küchenzeile mit Spüle, mit Rückwand',
    tiles: [1, 1],
    height: 0.9008,
    at: [0, 0.0105],
    span: [1, 1.021],
  },
  {
    name: 'kitchencounter_sink_backsplash_styleB',
    label: 'Küchenzeile mit Spüle und Rückwand, Muster B',
    tiles: [1, 1],
    height: 0.9008,
    at: [0, 0.0105],
    span: [1, 1.021],
  },
  {
    name: 'kitchencounter_sink_styleB',
    label: 'Küchenzeile mit Spüle, Muster B',
    tiles: [1, 1],
    height: 0.9008,
    at: [0, 0.0105],
    span: [1, 1.021],
  },
  {
    name: 'kitchencounter_straight_A',
    label: 'Küchenzeile A',
    tiles: [1, 1],
    height: 0.5,
    at: [0, 0.0105],
    span: [1, 1.021],
  },
  {
    name: 'kitchencounter_straight_A_backsplash',
    label: 'Küchenzeile A, mit Rückwand',
    tiles: [1, 1],
    height: 0.6,
    at: [0, 0.0105],
    span: [1, 1.021],
  },
  {
    name: 'kitchencounter_straight_A_backsplash_styleB',
    label: 'Küchenzeile A mit Rückwand, Muster B',
    tiles: [1, 1],
    height: 0.6,
    at: [0, 0.0105],
    span: [1, 1.021],
  },
  {
    name: 'kitchencounter_straight_A_decorated',
    label: 'Küchenzeile A, bestückt',
    tiles: [1, 1],
    height: 1.0476,
    at: [0.0014, 0.0659],
    span: [1.0029, 1.1317],
  },
  {
    name: 'kitchencounter_straight_A_decorated_styleB',
    label: 'Küchenzeile A bestückt, Muster B',
    tiles: [1, 1],
    height: 1.0476,
    at: [0.0014, 0.0659],
    span: [1.0029, 1.1317],
  },
  {
    name: 'kitchencounter_straight_A_styleB',
    label: 'Küchenzeile A, Muster B',
    tiles: [1, 1],
    height: 0.5,
    at: [0, 0.0105],
    span: [1, 1.021],
  },
  {
    name: 'kitchencounter_straight_B',
    label: 'Küchenzeile B',
    tiles: [1, 1],
    height: 0.5,
    at: [0, 0.0105],
    span: [1, 1.021],
  },
  {
    name: 'kitchencounter_straight_B_backsplash',
    label: 'Küchenzeile B, mit Rückwand',
    tiles: [1, 1],
    height: 0.6,
    at: [0, 0.0105],
    span: [1, 1.021],
  },
  {
    name: 'kitchencounter_straight_B_backsplash_styleB',
    label: 'Küchenzeile B mit Rückwand, Muster B',
    tiles: [1, 1],
    height: 0.6,
    at: [0, 0.0105],
    span: [1, 1.021],
  },
  {
    name: 'kitchencounter_straight_B_styleB',
    label: 'Küchenzeile B, Muster B',
    tiles: [1, 1],
    height: 0.5,
    at: [0, 0.0105],
    span: [1, 1.021],
  },
  {
    name: 'kitchencounter_straight_decorated',
    label: 'Küchenzeile, bestückt',
    tiles: [1, 1],
    height: 0.9569,
    at: [0, 0.0105],
    span: [1, 1.021],
  },
  {
    name: 'kitchencounter_straight_decorated_styleB',
    label: 'Küchenzeile bestückt, Muster B',
    tiles: [1, 1],
    height: 0.9569,
    at: [0, 0.0105],
    span: [1, 1.021],
  },
  { name: 'kitchentable_A', label: 'Arbeitstisch A', tiles: [1, 1], height: 0.5, span: [1, 1] },
  {
    name: 'kitchentable_A_large',
    label: 'Arbeitstisch A, lang',
    tiles: [2, 1],
    height: 0.5,
    span: [1.5, 1],
  },
  {
    name: 'kitchentable_A_large_decorated_A',
    label: 'Arbeitstisch A lang, bestückt A',
    tiles: [2, 1],
    height: 0.9621,
    span: [1.5, 1],
  },
  {
    name: 'kitchentable_A_large_decorated_B',
    label: 'Arbeitstisch A lang, bestückt B',
    tiles: [2, 1],
    height: 0.7867,
    span: [1.5, 1],
  },
  {
    name: 'kitchentable_A_large_decorated_C',
    label: 'Arbeitstisch A lang, bestückt C',
    tiles: [2, 1],
    height: 1.0276,
    at: [0.0031, -0.0123],
    span: [1.5063, 1.0246],
  },
  { name: 'kitchentable_B', label: 'Arbeitstisch B', tiles: [1, 1], height: 0.5, span: [1, 1] },
  {
    name: 'kitchentable_B_decorated',
    label: 'Arbeitstisch B, bestückt',
    tiles: [1, 1],
    height: 0.9749,
    span: [1, 1],
  },
  {
    name: 'kitchentable_B_large',
    label: 'Arbeitstisch B, lang',
    tiles: [2, 1],
    height: 0.5,
    span: [1.5, 1],
  },
  { name: 'kitchentable_sink', label: 'Spültisch', tiles: [1, 1], height: 0.9008, span: [1, 1] },
  {
    name: 'kitchentable_sink_large',
    label: 'Spültisch, lang',
    tiles: [2, 1],
    height: 0.9008,
    span: [1.5, 1],
  },
  {
    name: 'kitchentable_sink_large_decorated',
    label: 'Spültisch lang, bestückt',
    tiles: [2, 1],
    height: 0.9734,
    span: [1.5, 1],
  },
  {
    name: 'knife',
    label: 'Messer',
    tiles: [1, 1],
    height: 0.4696,
    foot: -0.1054,
    at: [-0.0375, 0],
    span: [0.125, 0.05],
  },
  { name: 'lid_A', label: 'Deckel A', tiles: [1, 1], height: 0.1002, span: [0.5, 0.5] },
  { name: 'lid_B', label: 'Deckel B', tiles: [1, 1], height: 0.1002, span: [0.5, 0.5] },
  { name: 'lid_large', label: 'Deckel, groß', tiles: [1, 1], height: 0.15, span: [0.75, 0.6] },
  { name: 'menu', label: 'Speisekarte', tiles: [1, 1], height: 0.4, span: [0.25, 0.15] },
  { name: 'mustard', label: 'Senfflasche', tiles: [1, 1], height: 0.3893, span: [0.15, 0.15] },
  {
    name: 'oven',
    label: 'Backofen',
    tiles: [1, 1],
    height: 1.01,
    at: [0, 0.072],
    span: [1, 1.1739],
  },
  {
    name: 'pan_006',
    label: 'Pfanne, flach',
    tiles: [1, 1],
    height: 0.175,
    at: [0, 0.1313],
    span: [0.375, 0.6375],
  },
  {
    name: 'pan_A',
    label: 'Pfanne A',
    tiles: [1, 1],
    height: 0.125,
    at: [0, 0.125],
    span: [0.5, 0.75],
  },
  {
    name: 'pan_B',
    label: 'Pfanne B',
    tiles: [1, 1],
    height: 0.125,
    at: [0, 0.125],
    span: [0.5, 0.75],
  },
  { name: 'papertowel', label: 'Küchenrolle', tiles: [1, 1], height: 0.4569, span: [0.25, 0.25] },
  { name: 'pillar_A', label: 'Säule A', tiles: [1, 1], height: 2.05, span: [0.3, 0.3] },
  { name: 'pillar_B', label: 'Säule B', tiles: [1, 1], height: 2.05, span: [0.5, 0.5] },
  {
    name: 'pizza_oven',
    label: 'Pizzaofen',
    tiles: [2, 1],
    height: 1.0363,
    at: [0, 0.072],
    span: [1.5, 1.1739],
  },
  {
    name: 'pizzabox_closed',
    label: 'Pizzakarton, zu',
    tiles: [1, 1],
    height: 0.15,
    at: [0, 0.0125],
    span: [1, 1.025],
  },
  {
    name: 'pizzabox_open',
    label: 'Pizzakarton, offen',
    tiles: [1, 1],
    height: 0.15,
    at: [0, 0.0125],
    span: [1, 1.025],
  },
  {
    name: 'pizzabox_stacked',
    label: 'Pizzakartons, gestapelt',
    tiles: [1, 1],
    height: 0.6,
    at: [0.0009, 0.0114],
    span: [1.1385, 1.1595],
  },
  { name: 'plate', label: 'Teller', tiles: [1, 1], height: 0.05, span: [0.475, 0.475] },
  {
    name: 'plate_dirty',
    label: 'Teller, benutzt',
    tiles: [1, 1],
    height: 0.05,
    span: [0.475, 0.475],
  },
  {
    name: 'plate_small',
    label: 'Teller, klein',
    tiles: [1, 1],
    height: 0.05,
    span: [0.375, 0.375],
  },
  { name: 'pot_A', label: 'Topf A', tiles: [1, 1], height: 0.25, span: [0.7, 0.5] },
  {
    name: 'pot_A_stew',
    label: 'Topf A mit Eintopf',
    tiles: [1, 1],
    height: 0.258,
    span: [0.7, 0.5],
  },
  { name: 'pot_B', label: 'Topf B', tiles: [1, 1], height: 0.25, span: [0.7, 0.5] },
  {
    name: 'pot_B_stew',
    label: 'Topf B mit Eintopf',
    tiles: [1, 1],
    height: 0.258,
    span: [0.7, 0.5],
  },
  { name: 'pot_large', label: 'Topf, groß', tiles: [1, 1], height: 0.375, span: [1, 0.6] },
  {
    name: 'rollingpin',
    label: 'Nudelholz',
    tiles: [1, 1],
    height: 0.1075,
    foot: -0.1075,
    span: [0.7385, 0.215],
  },
  {
    name: 'shelf_papertowel',
    label: 'Rollenhalter',
    tiles: [1, 1],
    height: 0.075,
    foot: -0.4548,
    at: [0, 0.15],
    span: [1, 0.3],
  },
  {
    name: 'shelf_papertowel_decorated',
    label: 'Rollenhalter, bestückt',
    tiles: [1, 1],
    height: 0.4,
    foot: -0.4548,
    at: [0, 0.1566],
    span: [1, 0.3132],
  },
  {
    name: 'spoon',
    label: 'Kelle',
    tiles: [1, 1],
    height: 0.3342,
    foot: -0.1155,
    at: [0, -0.0151],
    span: [0.1637, 0.0949],
  },
  {
    name: 'stove_multi',
    label: 'Herd, vierflammig',
    tiles: [1, 1],
    height: 0.6,
    at: [0, 0.057],
    span: [1, 1.1439],
  },
  {
    name: 'stove_multi_countertop',
    label: 'Kochfeld, vierflammig',
    tiles: [1, 1],
    height: 0.6,
    foot: 0.465,
    span: [0.873, 0.873],
  },
  {
    name: 'stove_multi_decorated',
    label: 'Herd vierflammig, bestückt',
    tiles: [1, 1],
    height: 0.858,
    at: [0.05, 0.057],
    span: [1.1, 1.1439],
  },
  {
    name: 'stove_single',
    label: 'Herd, einflammig',
    tiles: [1, 1],
    height: 0.6038,
    at: [0, 0.057],
    span: [1, 1.1439],
  },
  {
    name: 'stove_single_countertop',
    label: 'Kochfeld, einflammig',
    tiles: [1, 1],
    height: 0.6038,
    foot: 0.465,
    span: [0.873, 0.873],
  },
  { name: 'table_round_A', label: 'Gasttisch A', tiles: [2, 2], height: 0.5, span: [1.5, 1.5] },
  {
    name: 'table_round_A_decorated',
    label: 'Gasttisch A, gedeckt',
    tiles: [2, 2],
    height: 0.9286,
    span: [1.5, 1.5],
  },
  {
    name: 'table_round_A_small',
    label: 'Gasttisch A, klein',
    tiles: [1, 1],
    height: 0.5,
    span: [0.75, 0.75],
  },
  {
    name: 'table_round_A_small_decorated',
    label: 'Gasttisch A klein, gedeckt',
    tiles: [1, 1],
    height: 0.9,
    span: [0.75, 0.75],
  },
  { name: 'table_round_B', label: 'Gasttisch B', tiles: [2, 2], height: 0.5, span: [1.5, 1.5] },
  {
    name: 'table_round_B_tablecloth_green',
    label: 'Gasttisch B, grüne Decke',
    tiles: [2, 2],
    height: 0.5,
    span: [1.5, 1.5],
  },
  {
    name: 'table_round_B_tablecloth_red',
    label: 'Gasttisch B, rote Decke',
    tiles: [2, 2],
    height: 0.5,
    span: [1.5, 1.5],
  },
  {
    name: 'table_round_B_tablecloth_red_decorated',
    label: 'Gasttisch B rote Decke, gedeckt',
    tiles: [2, 2],
    height: 0.65,
    span: [1.5, 1.5],
  },
  {
    name: 'towelrail',
    label: 'Handtuchhalter',
    tiles: [1, 1],
    height: 0.4317,
    foot: 0.1403,
    at: [0, 0.5159],
    span: [0.8, 0.2317],
  },
  { name: 'wall', label: 'Wand', tiles: [2, 1], height: 2, span: [2, 0.25] },
  {
    name: 'wall_decorated',
    label: 'Wand, behängt',
    tiles: [2, 1],
    height: 2,
    at: [-0.0014, 0.6029],
    span: [2.0027, 1.4558],
  },
  {
    name: 'wall_decorated_styleB',
    label: 'Wand behängt, Muster B',
    tiles: [2, 1],
    height: 2,
    at: [-0.0014, 0.6029],
    span: [2.0027, 1.4558],
  },
  { name: 'wall_doorway', label: 'Wand mit Durchgang', tiles: [2, 1], height: 2, span: [2, 0.25] },
  {
    name: 'wall_half',
    label: 'Wand, halb',
    tiles: [1, 1],
    height: 2,
    at: [0.5, 0],
    span: [1, 0.25],
  },
  {
    name: 'wall_orderwindow',
    label: 'Wand mit Durchreiche',
    tiles: [2, 1],
    height: 2,
    span: [2, 0.45],
  },
  {
    name: 'wall_orderwindow_decorated',
    label: 'Wand mit Durchreiche, behängt',
    tiles: [2, 1],
    height: 2,
    span: [2, 0.45],
  },
  {
    name: 'wall_tiles_A',
    label: 'Wandfliesen A',
    tiles: [1, 1],
    height: 1,
    foot: 0.5,
    at: [0, -0.4625],
    span: [1, 0.075],
  },
  {
    name: 'wall_tiles_B',
    label: 'Wandfliesen B',
    tiles: [1, 1],
    height: 1,
    foot: 0.5,
    at: [0, -0.4625],
    span: [1, 0.075],
  },
  {
    name: 'wall_window_closed',
    label: 'Wand mit Fenster, zu',
    tiles: [2, 1],
    height: 2,
    span: [2, 0.25],
  },
  {
    name: 'wall_window_closed_curtains_green',
    label: 'Wand mit Fenster, grüne Gardinen',
    tiles: [2, 1],
    height: 2,
    span: [2, 0.45],
  },
  {
    name: 'wall_window_closed_curtains_red',
    label: 'Wand mit Fenster, rote Gardinen',
    tiles: [2, 1],
    height: 2,
    span: [2, 0.45],
  },
  {
    name: 'wall_window_open',
    label: 'Wand mit Fenster, offen',
    tiles: [2, 1],
    height: 2,
    span: [2, 0.25],
  },
];

/** Die Namen allein — für Listen, die keine Maße brauchen. */
export const DINER_NAMES: readonly string[] = DINER_PIECES.map((piece) => piece.name);

/** Ein Stück nach Namen, oder `undefined` — Fremdtext kommt über das Netz. */
export function dinerPiece(name: string): DinerPiece | undefined {
  return DINER_PIECES.find((piece) => piece.name === name);
}

/**
 * **Wie hoch ein Stück angehoben werden muss, damit es auf dem Boden steht.**
 *
 * Null für fast alles — die Quelle ist auf einem Raster gebaut, und darauf
 * steht das meiste bei y = 0. Die Ausnahme sind die Stücke, die unter ihrem
 * Ursprung liegen (`foot < 0`): die vier Bodenplatten, deren Ursprung ihre
 * Oberfläche ist, und die Wandstücke, die an ihrem Anschluss hängen. Frei
 * hingestellt stünden sie sonst bis zur Hälfte im Estrich.
 *
 * **Ein hängendes Stück wird nicht abgesenkt** (`foot > 0`): Ein
 * Hängeschrank, den man auf den Boden stellt, ist kein Hängeschrank mehr. Im
 * Schauraum hängt er in der Luft, und genau das soll man dort sehen.
 */
export function dinerStand(piece: DinerPiece): number {
  return Math.max(0, -(piece.foot ?? 0));
}

/**
 * **Wie hoch ein frei hingestelltes Stück über dem Boden endet**, in Metern —
 * die Zahl, über der die Tafel im Schauraum schwebt und unter der der
 * Körper endet (`worlds/test/zones/diner.ts`).
 *
 * `height` allein tut es nicht: Bei einer Bodenplatte ist das null, und eine
 * Tafel auf null Metern steckt im Fußboden; beim Hängeschrank ist es 2,00 m,
 * und die stimmen nur, weil er oben hängt. `dinerStand` gleicht beides aus.
 */
export function dinerTop(piece: DinerPiece): number {
  return piece.height + dinerStand(piece);
}

/**
 * **Wie hoch das Stück selbst ist**, in Metern — von seiner Unter- bis zu
 * seiner Oberkante, ohne die Luft darunter.
 *
 * Das ist die Zahl, die auf die Tafel im Schauraum gehört: Ein Hängeschrank
 * ist einen Meter hoch und hängt auf einem Meter; wer dort seine 2,00 m
 * hinschriebe, beschriebe die Wand und nicht den Schrank.
 */
export function dinerHeight(piece: DinerPiece): number {
  return piece.height - (piece.foot ?? 0);
}
