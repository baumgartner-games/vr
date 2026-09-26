/**
 * **Die Vorlagen** — fertig eingerichtete Zimmer für den Bauplatz
 * (_Bauen & Gestalten → Baukasten-Werkzeuge → Vorlagen_): das _Wohnzimmer_
 * (der erste Beispielraum) und das _Kleine Café_ (`SAMPLE_ROOMS`).
 *
 * Gewünscht war ein Raum, **der zeigt, was geht**: Boden und Wände
 * gestaltet (`surfaceDecor.ts`), Kleinkram auf Tischen und Regalbrettern,
 * Bilder an der Wand, ein Möbel schräg in 45°. Die Liste sagt nur, **wo
 * ungefähr** etwas hinkommt — Höhe, Wand und Unterlage findet dieselbe
 * Rechnung wie beim Setzen aus der Hand (`PortalWorld.placeModelAt` mit
 * `snap`). Die Tasse steht also auf dem Tisch, weil dort ein Tisch ist, und
 * nicht, weil hier eine Höhe steht.
 *
 * Alle Punkte sind relativ zur Mitte des Zimmers, in das der Raum gehört
 * (`PortalWorld.sampleRoomOrigin`) — im Bauplatz das Startzimmer
 * (`editor/starterGrid.ts`): acht mal acht Kacheln, Küchenzeile im
 * Nordwesten, Tisch in der Mitte, Tür im Süden, das Tor zum Hub im Osten.
 * Die Reihenfolge zählt: erst der Tisch, dann die Tasse darauf.
 */

/** Boden oder Wand belegen: Werkzeug, Muster (`FLOOR_STYLES`/`WALL_STYLES`) und die Stelle. */
export interface SampleSurface {
  readonly tool: 'floor' | 'wall';
  readonly style: number;
  readonly x: number;
  readonly z: number;
}

/** Ein Stück aus dem Regal: Adresse, ungefähre Stelle, Drehung in Bogenmaß. */
export interface SampleItem {
  readonly path: string;
  readonly x: number;
  readonly z: number;
  readonly yaw: number;
}

const HALF = Math.PI;
const EIGHTH = Math.PI / 4;

export const SAMPLE_SURFACES: readonly SampleSurface[] = [
  // Helle Dielen im ganzen Zimmer.
  { tool: 'floor', style: 0, x: 1.5, z: 1.5 },
  // Fliesen hinter der Küchenzeile, an der Nordwand.
  { tool: 'wall', style: 0, x: -1.5, z: -3.4 },
  // Eine Putzwand im Osten, hinter dem Bett.
  { tool: 'wall', style: 2, x: 3.4, z: -2.5 },
];

export const SAMPLE_ITEMS: readonly SampleItem[] = [
  // Küche: Topf und Kaktus auf der Zeile, ein Teller auf dem Tisch, zwei Stühle.
  { path: 'restaurant-bits/pot_A.glb', x: -3.5, z: -3.5, yaw: 0 },
  { path: 'furniture-bits/cactus_small_A.glb', x: -1.5, z: -3.5, yaw: 0 },
  { path: 'restaurant-bits/plate.glb', x: -0.5, z: -0.5, yaw: 0 },
  { path: 'furniture-bits/chair_A_wood.glb', x: -0.5, z: 0.5, yaw: HALF },
  { path: 'furniture-bits/chair_A_wood.glb', x: 0.5, z: -0.5, yaw: -HALF / 2 },
  // Wohnecke im Südwesten: Teppich, Sofa, Couchtisch mit Tasse, Stehlampe,
  // ein Sessel schräg in der Ecke und zwei Bilder.
  { path: 'furniture-bits/rug_rectangle_stripes_A.glb', x: -2, z: 2, yaw: 0 },
  { path: 'furniture-bits/couch_pillows.glb', x: -2, z: 3.4, yaw: HALF },
  { path: 'furniture-bits/table_low.glb', x: -2, z: 2, yaw: 0 },
  { path: 'furniture-bits/mug_B.glb', x: -2, z: 2, yaw: 0 },
  { path: 'furniture-bits/armchair_pillows.glb', x: -3.5, z: 0.5, yaw: EIGHTH },
  { path: 'furniture-bits/lamp_standing.glb', x: -3.5, z: 3.5, yaw: 0 },
  { path: 'furniture-bits/pictureframe_large_A.glb', x: -3.6, z: 2, yaw: 0 },
  { path: 'furniture-bits/pictureframe_small_B.glb', x: -2, z: 3.7, yaw: 0 },
  // Schlafecke im Nordosten vor der Putzwand: Bett, Nachttisch mit Lampe,
  // Teppich, ein Bild und ein Wandbrett mit Büchern.
  { path: 'furniture-bits/bed_double_A.glb', x: 2, z: -2.8, yaw: 0 },
  { path: 'furniture-bits/cabinet_small.glb', x: 3.5, z: -3.5, yaw: 0 },
  { path: 'furniture-bits/lamp_table.glb', x: 3.5, z: -3.5, yaw: 0 },
  { path: 'furniture-bits/rug_oval_A.glb', x: 2, z: -0.8, yaw: 0 },
  { path: 'furniture-bits/pictureframe_medium.glb', x: 3.6, z: -1.8, yaw: 0 },
  { path: 'furniture-bits/shelf_A_big.glb', x: 3.6, z: -0.3, yaw: 0 },
  { path: 'furniture-bits/book_single.glb', x: 3.75, z: -0.5, yaw: 0 },
  // Ein Kaktus neben der Tür.
  { path: 'furniture-bits/cactus_medium_A.glb', x: 1.5, z: 3.5, yaw: 0 },
];

/**
 * **Das kleine Café** — die zweite Vorlage, mit den Restaurantmöbeln von
 * KayKit: Küchenfliesen, dunkle Fliesen hinter der Theke (der Küchenzeile
 * des Startzimmers), Hocker davor, Eis und Menükarte auf der Theke, drei
 * runde Tische mit Stühlen und etwas darauf, Bilder und ein Kaktus.
 */
export const CAFE_SURFACES: readonly SampleSurface[] = [
  // Küchenfliesen im ganzen Raum.
  { tool: 'floor', style: 2, x: 1.5, z: 1.5 },
  // Dunkle Fliesen hinter der Theke, an der Nordwand.
  { tool: 'wall', style: 1, x: -1.5, z: -3.4 },
];

export const CAFE_ITEMS: readonly SampleItem[] = [
  // Die Theke: Menükarte, Eisbecher und ein Glas; drei Hocker davor.
  { path: 'restaurant-bits/menu.glb', x: -3.5, z: -3.5, yaw: 0 },
  { path: 'restaurant-bits/icecream_bowl_decorated_A.glb', x: -2.5, z: -3.5, yaw: 0 },
  { path: 'restaurant-bits/jar_B_medium.glb', x: -1.5, z: -3.5, yaw: 0 },
  { path: 'restaurant-bits/chair_stool.glb', x: -3.5, z: -2.5, yaw: 0 },
  { path: 'restaurant-bits/chair_stool.glb', x: -2.5, z: -2.5, yaw: 0 },
  { path: 'restaurant-bits/chair_stool.glb', x: -1.5, z: -2.5, yaw: 0 },
  // Ein Tisch mit rotem Tischtuch im Nordosten, zwei Stühle, Burger auf dem Teller.
  { path: 'restaurant-bits/table_round_B_tablecloth_red.glb', x: 2.5, z: -2.5, yaw: 0 },
  { path: 'restaurant-bits/chair_A.glb', x: 1.5, z: -2.5, yaw: -HALF / 2 },
  { path: 'restaurant-bits/chair_A.glb', x: 3.5, z: -2.5, yaw: HALF / 2 },
  { path: 'restaurant-bits/plate.glb', x: 2.5, z: -2.5, yaw: 0 },
  { path: 'restaurant-bits/food_burger.glb', x: 2.5, z: -2.5, yaw: 0 },
  // Zwei kleine runde Tische im Süden, je zwei Stühle, Eisbecher und Eintopf.
  { path: 'restaurant-bits/table_round_A_small.glb', x: -2.5, z: 2, yaw: 0 },
  { path: 'restaurant-bits/chair_B.glb', x: -3.5, z: 2, yaw: HALF / 2 },
  { path: 'restaurant-bits/chair_B.glb', x: -1.5, z: 2, yaw: -HALF / 2 },
  { path: 'restaurant-bits/icecream_bowl_decorated_B.glb', x: -2.5, z: 2, yaw: 0 },
  { path: 'restaurant-bits/table_round_A_small.glb', x: 2.5, z: 2.8, yaw: 0 },
  { path: 'restaurant-bits/chair_B.glb', x: 1.5, z: 2.8, yaw: -HALF / 2 },
  { path: 'restaurant-bits/chair_B.glb', x: 3.5, z: 2.8, yaw: HALF / 2 },
  { path: 'restaurant-bits/stew_bowl.glb', x: 2.5, z: 2.8, yaw: 0 },
  // Bilder an West- und Südwand, ein Kaktus neben der Tür.
  { path: 'furniture-bits/pictureframe_large_B.glb', x: -3.6, z: 1, yaw: 0 },
  { path: 'furniture-bits/pictureframe_small_A.glb', x: -2.5, z: 3.7, yaw: 0 },
  { path: 'furniture-bits/cactus_medium_A.glb', x: 1.5, z: 3.5, yaw: 0 },
];

/** Eine Vorlage im Untermenü _Vorlagen_: Name, Zeile darunter, Boden/Wände und Stücke. */
export interface SampleRoom {
  readonly id: string;
  readonly label: string;
  readonly sub: string;
  readonly surfaces: readonly SampleSurface[];
  readonly items: readonly SampleItem[];
}

/** **Die Vorlagen** — in dieser Reihenfolge im Untermenü _Vorlagen_. */
export const SAMPLE_ROOMS: readonly SampleRoom[] = [
  {
    id: 'living',
    label: 'Wohnzimmer',
    sub: 'Küche, Wohnecke, Schlafecke · Dielen, Fliesen, Putzwand',
    surfaces: SAMPLE_SURFACES,
    items: SAMPLE_ITEMS,
  },
  {
    id: 'cafe',
    label: 'Kleines Café',
    sub: 'Theke mit Hockern, runde Tische · Küchenfliesen',
    surfaces: CAFE_SURFACES,
    items: CAFE_ITEMS,
  },
];
