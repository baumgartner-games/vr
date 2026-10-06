import type { FurnitureFolder, GameElement } from './elementCatalog';

/**
 * **Der Weltraum im Katalog** — alle 69 Teile aus _Space Base Bits_ als
 * Spielelemente. Gewünscht (Oktober 2026): _„beim Katalog eine weiteren Ordner
 * anlegen: Weltraum und darin die Space base Teile einbauen, prüfe auch für
 * jeden eben die Größe wie viel Platz die verbrauchen werden."_
 *
 * **Der Maßstab: 2 m je Einheit der Quelle** (`SPACE_SCALE` auf das Regal).
 * Das Paket ist ein Aufbauspiel im Kleinen: Ein Basismodul ist in der Quelle
 * zwei Einheiten breit und **eine** hoch, ein Rover einen halben. Mit dem
 * Maßstab des Regals (0,5, `core/kaykitFit.KAYKIT_SCALE`) stünde neben einer
 * Figur von 1,80 m ein Haus von 50 cm und eine Frachtkiste von 25 cm. Bei 2 m
 * je Einheit ist die Frachtkiste einen Meter groß — genau eine Kachel —, ein
 * Modul zwei Meter hoch und das Landungsschiff sechs Meter lang. Ein Maßstab
 * für alles, damit die Teile untereinander zusammenpassen, wie das Paket sie
 * gebaut hat (Dachmodule auf Modulen, Tunnel zwischen ihnen).
 *
 * **Die Grundfläche ist nachgemessen**: die Hülle jeder Datei aus ihren
 * Knoten, mal 2, und je Seite auf ganze Kacheln aufgerundet — wobei bis zu
 * gut 10 cm Überstand noch in die kleinere Zahl passen (die Kiste mit 1,04 m
 * bleibt auf einer Kachel). Hinter jeder Zeile steht, was gemessen wurde:
 * Breite × Höhe × Tiefe in Metern. Alles sperrt seine ganze Grundfläche und
 * hat keinen Zweck (`kind: null`) — es steht da und ist im Weg.
 */

/** **Meter je Einheit der Quelle, geteilt durch den Maßstab des Regals** (0,5). */
export const SPACE_SCALE = 4;

/** Eine Adresse aus _Space Base Bits_. */
export function spaceBits(name: string): string {
  return `space-base-bits/${name}.glb`;
}

/** So hoch ist der Körper — wie bei jedem Möbel: Darüber springt niemand. */
const BODY = 1.4;

/** Ein Teil des Pakets, im Maßstab des Weltraums, auf seinen Kacheln. */
function space(
  id: string,
  label: string,
  file: string,
  tiles: readonly [number, number],
): GameElement {
  return {
    id,
    label,
    tiles,
    height: BODY,
    kind: null,
    parts: [{ model: spaceBits(file), scale: SPACE_SCALE }],
  };
}

/**
 * **Der Schutzschrank aus _Haunting_** — der Spind, in dem man sich
 * versteckt (`haunting/world3d/stationProps.LOCKER_MODEL`). Gewünscht:
 * _„aus haunting den locker (schrank) in welchem man sich verstecken kann
 * bitte auch in katalog bekommen (gerne auch unter weltall)"_. `A` steigt
 * hinein, noch einmal `A` wieder heraus (`GameElement.opens`, `'hide'`).
 * Zwei Meter hoch wie in der Station; darüber springt niemand.
 */
export const SPACE_LOCKER: GameElement = {
  id: 'space-locker',
  label: 'Schutzschrank',
  aka: ['Locker', 'Spind', 'Schrank', 'Verstecken', 'Haunting'],
  tiles: [1, 1],
  height: 2,
  kind: null,
  opens: 'hide',
  parts: [{ model: 'prototype-bits/Locker.glb', height: 2 }],
};

/** Der Space Ranger — der Anzug des Technikers in _Haunting_ (`ShipExperience`). */
const SPACE_RANGER_DIR = 'mystery-monthly-4/7-january-2024-space-ranger';
const SPACE_RANGER_FIGURE = `${SPACE_RANGER_DIR}/character/SpaceRanger.glb`;
/** Der Pfosten aus dem Dungeon — Stange und Füße des Ständers, wie bei der Garderobe. */
const STAND_POST = 'dungeon/post.glb';

/**
 * **Der Anzugständer** — der Anzug des Technikers zum Anziehen. Gewünscht
 * (Oktober 2026): _„Der techniker muss den techniker anzug ausrüsten der als
 * interaktion item rumsteht, ähnlich wie die computer bildschirme."_ In
 * _Haunting_ steht er in der Einsatzzentrale (`haunting/world3d/commandRoom.ts`),
 * und `A` daran zieht den Anzug an oder wieder aus; anderswo steht er da.
 *
 * Gebaut wie die Garderobe (`coatRack.ts`) aus einem Pfosten: Stange und
 * Kreuzfuß. Darauf hängt, was der Techniker trägt — Rumpf und Beine des Space
 * Ranger, sein Raumhelm und der Rucksack hinten. Eine Kachel, zwei Meter hoch.
 */
export const SPACE_SUIT_STAND: GameElement = {
  id: 'space-suit-stand',
  label: 'Techniker-Anzug',
  aka: ['Anzug', 'Raumanzug', 'Anzugständer', 'Space Ranger', 'Haunting'],
  tiles: [1, 1],
  height: 2,
  kind: null,
  lit: true,
  parts: [
    // Die Stange, und der Kreuzfuß aus zwei flachen Balken.
    { model: STAND_POST, size: [0.06, 1.2, 0.06], pose: { at: [0, 0.04, 0] } },
    { model: STAND_POST, size: [0.62, 0.05, 0.08], pose: { at: [0, 0, 0] } },
    { model: STAND_POST, size: [0.08, 0.05, 0.62], pose: { at: [0, 0, 0] } },
    // Die Beine, dann der Rumpf darüber, der Rucksack hinten am Rücken.
    {
      model: SPACE_RANGER_FIGURE,
      node: 'SpaceRanger_LegLeft',
      height: 0.5,
      pose: { at: [0.09, 0.42, 0] },
    },
    {
      model: SPACE_RANGER_FIGURE,
      node: 'SpaceRanger_LegRight',
      height: 0.5,
      pose: { at: [-0.09, 0.42, 0] },
    },
    {
      model: SPACE_RANGER_FIGURE,
      node: 'SpaceRanger_Body',
      height: 0.5,
      pose: { at: [0, 0.9, 0] },
    },
    {
      model: `${SPACE_RANGER_DIR}/SpaceRanger_Jetpack.glb`,
      height: 0.48,
      pose: { at: [0, 0.95, -0.2] },
    },
    // Der Helm obenauf.
    { model: `${SPACE_RANGER_DIR}/SpaceRanger_Helmet.glb`, fit: 0.42, pose: { at: [0, 1.38, 0] } },
  ],
};

/**
 * **Der Rechner _Verbindung_** — ein Schreibtisch mit Bildschirm, Tastatur
 * und Maus. In _Haunting_ steht er an der Nordwand der Einsatzzentrale, unter
 * dem Schild _Verbindung_, und `A` öffnet dort das Menü _Verbindung_
 * (Raum-Code, Name, wer da ist). Gewünscht: _„Es gibt zu dem an der oberen
 * wand einen Computer wo an der wand steht Verbindung. Damit interagiert mit
 * dem pc kommt das menü wo die alles mit verbindung etc. einstellen
 * können."_ Zwei Kacheln breit, eine tief, wie der Schreibtisch.
 */
export const SPACE_LINK_TERMINAL: GameElement = {
  id: 'space-link-terminal',
  label: 'Rechner Verbindung',
  aka: ['Computer', 'Terminal', 'Verbindung', 'Netzwerk', 'Haunting'],
  tiles: [2, 1],
  height: BODY,
  kind: null,
  lit: true,
  parts: [
    { model: 'furniture-bits/desk.glb' },
    { model: 'furniture-bits/monitor.glb', stack: true, at: [0, -0.1] },
    { model: 'furniture-bits/keyboard.glb', on: 0, at: [-0.1, 0.12] },
    { model: 'furniture-bits/mouse.glb', on: 0, at: [0.32, 0.12] },
  ],
};

/**
 * **Die Elemente des Weltraums** — im Katalog unter _Weltraum_
 * (`SPACE_FOLDER`), nach Art: Module, Versorgung, Fracht, Fahrzeuge, Tunnel,
 * Gelände. Gemessen bei 2 m je Einheit: Breite × Höhe × Tiefe.
 */
export const SPACE_ELEMENTS: readonly GameElement[] = [
  // Module
  space('space-basemodule-a', 'Basismodul A', 'basemodule_A', [5, 5]), // 4,50 × 2,00 × 4,35
  space('space-basemodule-b', 'Basismodul B', 'basemodule_B', [5, 5]), // 4,16 × 2,00 × 4,63
  space('space-basemodule-c', 'Basismodul C', 'basemodule_C', [4, 5]), // 4,00 × 2,00 × 4,41
  space('space-basemodule-d', 'Basismodul D', 'basemodule_D', [5, 5]), // 4,89 × 2,00 × 4,29
  space('space-basemodule-e', 'Basismodul E, zweistöckig', 'basemodule_E', [5, 5]), // 4,44 × 3,30 × 4,56
  space('space-basemodule-garage', 'Garagenmodul', 'basemodule_garage', [4, 5]), // 4,00 × 2,00 × 4,75
  space('space-dome', 'Kuppel', 'dome', [4, 4]), // 3,80 × 2,00 × 3,80
  space('space-eco-module', 'Ökomodul', 'eco_module', [4, 4]), // 4,00 × 4,00 × 4,00
  space('space-cargodepot-a', 'Frachtdepot A', 'cargodepot_A', [5, 5]), // 4,14 × 2,24 × 4,16
  space('space-cargodepot-b', 'Frachtdepot B', 'cargodepot_B', [5, 5]), // 4,17 × 2,04 × 4,36
  space('space-cargodepot-c', 'Frachtdepot C', 'cargodepot_C', [5, 5]), // 4,15 × 2,04 × 4,19
  space('space-structure-low', 'Gerüst, niedrig', 'structure_low', [4, 4]), // 3,50 × 2,00 × 3,50
  space('space-structure-tall', 'Gerüst, hoch', 'structure_tall', [4, 4]), // 3,50 × 4,00 × 3,50
  space('space-drill-structure', 'Bohrturm', 'drill_structure', [4, 4]), // 3,50 × 4,00 × 3,50
  space('space-roofmodule-base', 'Dachmodul', 'roofmodule_base', [3, 3]), // 2,79 × 0,40 × 2,79
  space('space-roofmodule-cargo-a', 'Dachmodul mit Fracht A', 'roofmodule_cargo_A', [3, 3]), // 2,79 × 1,44 × 2,79
  space('space-roofmodule-cargo-b', 'Dachmodul mit Fracht B', 'roofmodule_cargo_B', [3, 3]), // 2,79 × 2,44 × 2,79
  space('space-roofmodule-cargo-c', 'Dachmodul mit Fracht C', 'roofmodule_cargo_C', [3, 3]), // 2,79 × 2,44 × 2,79
  space(
    'space-roofmodule-solarpanels',
    'Dachmodul mit Solarzellen',
    'roofmodule_solarpanels',
    [3, 3],
  ), // 2,79 × 1,14 × 2,79
  // Versorgung
  space('space-water-storage', 'Wassertank', 'water_storage', [4, 4]), // 4,00 × 2,10 × 4,10
  space('space-farm-small', 'Hydroponik, klein', 'space_farm_small', [3, 3]), // 2,79 × 1,88 × 2,79
  space('space-farm-large', 'Hydroponik, groß', 'space_farm_large', [4, 4]), // 4,00 × 0,60 × 4,00
  space(
    'space-farm-large-sprinkler',
    'Hydroponik mit Sprinkler',
    'space_farm_large_sprinkler',
    [4, 4],
  ), // 4,00 × 1,00 × 4,00
  space('space-solarpanel', 'Solarpaneel', 'solarpanel', [2, 1]), // 1,80 × 0,74 × 0,90
  space('space-windturbine-low', 'Windrad, niedrig', 'windturbine_low', [3, 3]), // 2,29 × 2,93 × 2,58
  space('space-windturbine-tall', 'Windrad, hoch', 'windturbine_tall', [4, 2]), // 3,33 × 6,00 × 2,00
  space('space-lights', 'Lichtmast', 'lights', [2, 2]), // 1,36 × 2,00 × 1,36
  // Fracht
  space('space-cargo-a', 'Frachtkiste A', 'cargo_A', [1, 1]), // 1,00 × 1,04 × 1,04
  space('space-cargo-a-packed', 'Frachtkiste A, gepackt', 'cargo_A_packed', [1, 1]), // 1,04 × 1,06 × 1,04
  space('space-cargo-a-stacked', 'Frachtstapel A', 'cargo_A_stacked', [2, 2]), // 2,04 × 2,04 × 2,04
  space('space-cargo-b', 'Frachtkiste B', 'cargo_B', [1, 1]), // 1,00 × 1,04 × 1,04
  space('space-cargo-b-packed', 'Frachtkiste B, gepackt', 'cargo_B_packed', [1, 1]), // 1,04 × 1,06 × 1,04
  space('space-cargo-b-stacked', 'Frachtstapel B', 'cargo_B_stacked', [2, 2]), // 2,04 × 2,04 × 2,04
  space('space-containers-a', 'Behälter A', 'containers_A', [1, 1]), // 1,00 × 0,40 × 1,00
  space('space-containers-b', 'Behälter B', 'containers_B', [1, 1]), // 1,00 × 0,40 × 1,00
  space('space-containers-c', 'Behälter C', 'containers_C', [1, 1]), // 1,00 × 0,40 × 1,00
  space('space-containers-d', 'Behälter D', 'containers_D', [1, 1]), // 1,00 × 0,40 × 1,00
  // Fahrzeuge
  space('space-dropship', 'Landungsschiff', 'dropship', [6, 5]), // 6,00 × 2,60 × 4,60
  space('space-dropship-packed', 'Landungsschiff, beladen', 'dropship_packed', [5, 5]), // 4,46 × 4,45 × 4,60
  space('space-lander-a', 'Landefähre A', 'lander_A', [3, 3]), // 2,74 × 2,38 × 2,84
  space('space-lander-b', 'Landefähre B', 'lander_B', [3, 3]), // 2,74 × 2,19 × 2,84
  space('space-lander-base', 'Landesockel', 'lander_base', [3, 3]), // 2,69 × 1,00 × 2,69
  space('space-landingpad-small', 'Landeplatz, klein', 'landingpad_small', [4, 4]), // 3,80 × 1,00 × 3,80
  space('space-landingpad-large', 'Landeplatz, groß', 'landingpad_large', [5, 5]), // 5,00 × 1,00 × 5,00
  space('space-mobile-base-frame', 'Mobile Basis: Rahmen', 'mobile_base_frame', [4, 4]), // 3,99 × 1,00 × 4,08
  space('space-mobile-base-carriage', 'Mobile Basis: Fahrwerk', 'mobile_base_carriage', [5, 5]), // 4,29 × 2,60 × 4,42
  space('space-mobile-base-command', 'Mobile Basis: Kommando', 'mobile_base_command', [5, 5]), // 4,29 × 2,60 × 4,21
  space('space-mobile-base-cargo', 'Mobile Basis: Fracht', 'mobile_base_cargo', [4, 4]), // 3,60 × 2,62 × 4,04
  space('space-spacetruck', 'Rover', 'spacetruck', [1, 2]), // 0,98 × 1,13 × 1,79
  space('space-spacetruck-large', 'Rover, groß', 'spacetruck_large', [1, 2]), // 1,01 × 1,37 × 2,06
  space('space-spacetruck-trailer', 'Roveranhänger', 'spacetruck_trailer', [1, 2]), // 0,96 × 0,68 × 2,00
  // Tunnel
  space('space-tunnel-straight-a', 'Tunnel gerade A', 'tunnel_straight_A', [4, 2]), // 4,00 × 1,20 × 1,86
  space('space-tunnel-straight-b', 'Tunnel gerade B', 'tunnel_straight_B', [4, 2]), // 4,00 × 1,20 × 1,60
  space(
    'space-tunnel-diagonal-short-a',
    'Tunnel schräg, kurz A',
    'tunnel_diagonal_short_A',
    [2, 2],
  ), // 1,88 × 1,20 × 1,88
  space(
    'space-tunnel-diagonal-short-b',
    'Tunnel schräg, kurz B',
    'tunnel_diagonal_short_B',
    [2, 2],
  ), // 1,88 × 1,20 × 1,88
  space('space-tunnel-diagonal-long-a', 'Tunnel schräg, lang A', 'tunnel_diagonal_long_A', [6, 6]), // 5,88 × 1,20 × 5,88
  space('space-tunnel-diagonal-long-b', 'Tunnel schräg, lang B', 'tunnel_diagonal_long_B', [6, 6]), // 5,88 × 1,20 × 5,88
  // Gelände
  space('space-terrain-low', 'Gelände, niedrig', 'terrain_low', [4, 4]), // 4,00 × 2,00 × 4,00
  space('space-terrain-low-curved', 'Gelände, niedrig gerundet', 'terrain_low_curved', [4, 4]), // 4,00 × 2,00 × 4,00
  space('space-terrain-tall', 'Gelände, hoch', 'terrain_tall', [4, 4]), // 4,00 × 4,00 × 4,00
  space('space-terrain-tall-curved', 'Gelände, hoch gerundet', 'terrain_tall_curved', [4, 4]), // 4,00 × 4,00 × 4,00
  space('space-terrain-slope', 'Hang', 'terrain_slope', [4, 4]), // 4,00 × 4,00 × 4,00
  space(
    'space-terrain-slope-inner-corner',
    'Hang, Innenecke',
    'terrain_slope_inner_corner',
    [4, 4],
  ), // 4,00 × 4,00 × 4,00
  space(
    'space-terrain-slope-outer-corner',
    'Hang, Außenecke',
    'terrain_slope_outer_corner',
    [4, 4],
  ), // 4,00 × 4,00 × 4,00
  space('space-terrain-mining', 'Abbaustelle', 'terrain_mining', [4, 4]), // 4,00 × 4,15 × 4,00
  space('space-rock-a', 'Mondstein A', 'rock_A', [1, 1]), // 1,07 × 0,50 × 1,00
  space('space-rock-b', 'Mondstein B', 'rock_B', [2, 2]), // 1,39 × 0,80 × 1,61
  space('space-rocks-a', 'Mondsteine A', 'rocks_A', [3, 4]), // 2,63 × 0,71 × 3,29
  space('space-rocks-b', 'Mondsteine B', 'rocks_B', [4, 4]), // 3,76 × 2,13 × 3,48
  SPACE_LOCKER,
  SPACE_SUIT_STAND,
  SPACE_LINK_TERMINAL,
];

/** Die Ids in der Reihenfolge des Katalogs. */
export const SPACE_CATALOGUE: readonly string[] = SPACE_ELEMENTS.map((one) => one.id);

/** Welche Ids in welchem Unterordner stehen. */
const SPACE_GROUPS: Readonly<Record<string, readonly string[]>> = {
  modules: [
    'space-basemodule-a',
    'space-basemodule-b',
    'space-basemodule-c',
    'space-basemodule-d',
    'space-basemodule-e',
    'space-basemodule-garage',
    'space-dome',
    'space-eco-module',
    'space-cargodepot-a',
    'space-cargodepot-b',
    'space-cargodepot-c',
    'space-structure-low',
    'space-structure-tall',
    'space-drill-structure',
    'space-roofmodule-base',
    'space-roofmodule-cargo-a',
    'space-roofmodule-cargo-b',
    'space-roofmodule-cargo-c',
    'space-roofmodule-solarpanels',
  ],
  supply: [
    'space-locker',
    'space-suit-stand',
    'space-link-terminal',
    'space-water-storage',
    'space-farm-small',
    'space-farm-large',
    'space-farm-large-sprinkler',
    'space-solarpanel',
    'space-windturbine-low',
    'space-windturbine-tall',
    'space-lights',
  ],
  cargo: [
    'space-cargo-a',
    'space-cargo-a-packed',
    'space-cargo-a-stacked',
    'space-cargo-b',
    'space-cargo-b-packed',
    'space-cargo-b-stacked',
    'space-containers-a',
    'space-containers-b',
    'space-containers-c',
    'space-containers-d',
  ],
  vehicles: [
    'space-dropship',
    'space-dropship-packed',
    'space-lander-a',
    'space-lander-b',
    'space-lander-base',
    'space-landingpad-small',
    'space-landingpad-large',
    'space-mobile-base-frame',
    'space-mobile-base-carriage',
    'space-mobile-base-command',
    'space-mobile-base-cargo',
    'space-spacetruck',
    'space-spacetruck-large',
    'space-spacetruck-trailer',
  ],
  tunnels: [
    'space-tunnel-straight-a',
    'space-tunnel-straight-b',
    'space-tunnel-diagonal-short-a',
    'space-tunnel-diagonal-short-b',
    'space-tunnel-diagonal-long-a',
    'space-tunnel-diagonal-long-b',
  ],
  terrain: [
    'space-terrain-low',
    'space-terrain-low-curved',
    'space-terrain-tall',
    'space-terrain-tall-curved',
    'space-terrain-slope',
    'space-terrain-slope-inner-corner',
    'space-terrain-slope-outer-corner',
    'space-terrain-mining',
    'space-rock-a',
    'space-rock-b',
    'space-rocks-a',
    'space-rocks-b',
  ],
};

/**
 * **Der Ordner _Weltraum_** — neben _Haus_, _Restaurant_ und _Natur_, darin
 * nach Art und zuletzt _Alles_.
 */
export const SPACE_FOLDER: FurnitureFolder = {
  id: 'space',
  label: 'Weltraum',
  elements: [],
  cover: { element: 'space-basemodule-a' },
  folders: [
    {
      id: 'space-modules',
      label: 'Module',
      elements: SPACE_GROUPS['modules']!,
      cover: { element: 'space-basemodule-a' },
    },
    {
      id: 'space-supply',
      label: 'Versorgung',
      elements: SPACE_GROUPS['supply']!,
      cover: { element: 'space-water-storage' },
    },
    {
      id: 'space-cargo',
      label: 'Fracht',
      elements: SPACE_GROUPS['cargo']!,
      cover: { element: 'space-cargo-a-stacked' },
    },
    {
      id: 'space-vehicles',
      label: 'Fahrzeuge',
      elements: SPACE_GROUPS['vehicles']!,
      cover: { element: 'space-dropship' },
    },
    {
      id: 'space-tunnels',
      label: 'Tunnel',
      elements: SPACE_GROUPS['tunnels']!,
      cover: { element: 'space-tunnel-straight-a' },
    },
    {
      id: 'space-terrain',
      label: 'Gelände',
      elements: SPACE_GROUPS['terrain']!,
      cover: { element: 'space-rocks-b' },
    },
    { id: 'space-all', label: 'Alles', elements: SPACE_CATALOGUE },
  ],
};
