/**
 * **Hüte und Köpfe aus den Figuren des Regals** — getrennt voneinander
 * anzuziehen, auf jeder Figur.
 *
 * Gewünscht: _„es wäre schön wenn wir von jedem charakter die Hüte und Kopf
 * getrennt voneinander customizen können. Haare müssen es nicht sein, es
 * reicht hier als leichtere auswahl den Kopf direkt zu nehmen"_ — und unter
 * _Hut_ statt der gebauten Grundkörper (Basecap, Zylinder, Krone …) nur noch
 * die Kochmütze und die Kopfbedeckungen der KayKit-Figuren.
 *
 * **Woher die Stücke kommen.** Jede Figur des mittleren Skeletts liegt in
 * Teilen in ihrer Datei: `Knight_Head`, `Knight_Helmet`, `Knight_HelmetVisor`,
 * `Knight_Body` … Ein Teil am Kopf ist entweder **gehäutet**, dann aber ganz
 * und gar an den Knochen `head` gebunden (nachgemessen an Ritter, Magier,
 * Clown, Nekromant und Space Ranger: kein einziges Gewicht auf einem anderen
 * Knochen), oder es hängt **starr** am Knochen `head` (`Clown_Hat`,
 * `Driver_Sunglasses`, `Skeleton_Warrior_Helmet`, der Helm des Space Rangers
 * im Flugmodus). In beiden Fällen ist es also ein starres Stück im Raum des
 * Kopfknochens — und weil alle Figuren des mittleren Skeletts denselben
 * Kopfknochen haben, passt jeder Kopf und jeder Hut auf jede von ihnen, so
 * genau, wie er auf seiner eigenen sitzt (`core/figurePartModels.ts`).
 *
 * Diese Datei ist reine Auskunft — Namen, Dateien, Knoten, kein three.js —,
 * damit Speicher, Netz und Menü sie lesen können, ohne einen Lader zu ziehen.
 */

/** Ein Stück aus einer Figur: welche Datei, welche Knoten darin. */
export interface FigurePart {
  /** Adresse im Regal, wie bei den Figuren (`avatarFigures.ts`). */
  readonly file: string;
  /** Die Knoten, die zusammen das Stück sind — je mit allem darunter. */
  readonly nodes: readonly string[];
}

/** Ein Stück mit Namen und Zeile für das Menü. */
export interface NamedFigurePart extends FigurePart {
  readonly label: string;
  readonly sub: string;
}

const MM4 = 'mystery-monthly-4';
const MM5 = 'mystery-monthly-5';
const MM6 = 'mystery-monthly-6';

const KNIGHT = 'adventurers/characters/Knight.glb';
const BARBARIAN = 'adventurers/characters/Barbarian.glb';
const MAGE = 'adventurers/characters/Mage.glb';
const ROGUE = 'adventurers/characters/Rogue.glb';
const ROGUE_HOODED = 'adventurers/characters/Rogue_Hooded.glb';
const RANGER = 'adventurers/characters/Ranger.glb';
const DRUID = 'adventurers/characters/Druid.glb';
const ENGINEER = 'adventurers/characters/Engineer.glb';
const SKELETON_WARRIOR = 'skeletons/characters/Skeleton_Warrior.glb';
const SKELETON_ROGUE = 'skeletons/characters/Skeleton_Rogue.glb';
const SKELETON_MAGE = 'skeletons/characters/Skeleton_Mage.glb';
const NECROMANCER = 'skeletons/characters/Necromancer.glb';
const DUMMY = 'prototype-bits/character/Dummy.glb';
const DRIVER = `${MM4}/2-august-2023-driver/character/Driver.glb`;
const MONSTER_COSTUME = `${MM4}/3-september-2023-monster-costume/character/MonsterCostume.glb`;
const WEREWOLF_MAN = `${MM4}/4-october-2023-werewolf/characters/Werewolf_Man.glb`;
const ACTION_FIGURE = `${MM4}/6-december-2023-action-figure/character/ActionFigure.glb`;
/** Der Space Ranger im Flugmodus: Er trägt den Helm am Kopfknochen. */
export const SPACE_RANGER_FLIGHT = `${MM4}/7-january-2024-space-ranger/character/SpaceRanger_FlightMode.glb`;
const SPACE_RANGER = `${MM4}/7-january-2024-space-ranger/character/SpaceRanger.glb`;
const NINJA = `${MM4}/8-february-2024-ninja/character/Ninja.glb`;
const SURVIVALIST = `${MM4}/9-march-2024-survivalist/character/Survivalist.glb`;
const PALADIN = `${MM4}/10-april-2024-paladin/characters/Paladin.glb`;
const PALADIN_HELMET = `${MM4}/10-april-2024-paladin/characters/Paladin_with_Helmet.glb`;
const CLOWN = `${MM4}/11-may-2024-clown/characters/Clown.glb`;
const COMBAT_MECH = `${MM5}/1-july-2024-combat-mech/characters/CombatMech.glb`;
const VAMPIRE = `${MM5}/4-october-2024-vampire/characters/Vampire.glb`;
const WITCH = `${MM5}/5-november-2024-witch/characters/Witch.glb`;
const HELPER_A = `${MM5}/6-december-2024-helpers/characters/Helper_A.glb`;
const HELPER_B = `${MM5}/6-december-2024-helpers/characters/Helper_B.glb`;
const CAVEMAN = `${MM5}/8-february-2025-caveman/characters/Caveman.glb`;
const HIKER = `${MM5}/11-may-2025-hiker/characters/Hiker.glb`;
const TIEFLING = `${MM5}/12-june-2025-tiefling/characters/Tiefling.glb`;
const SUPERHERO = `${MM5}/2-august-2024-superhero/characters/Superhero.glb`;
const LOREKEEPER = `${MM6}/1-july-2025-lorekeeper/characters/Lorekeeper.glb`;
const CLERIC = `${MM6}/3-september-2025-cleric/characters/Cleric.glb`;
const TOY_SOLDIER = `${MM6}/6-december-2025-toy-soldier/characters/ToySoldier.glb`;
const MARKSMAN = `${MM6}/10-april-2026-marksman/characters/Marksman.glb`;
const MAGICAL_GIRL = `${MM6}/11-may-2026-magical-girl/characters/MagicalGirl.glb`;
const FARMER_A = `${MM6}/12-june-2026-farmers/characters/Farmer_A.glb`;
const FARMER_B = `${MM6}/12-june-2026-farmers/characters/Farmer_B.glb`;

function part(file: string, nodes: readonly string[], label: string, sub: string): NamedFigurePart {
  return { file, nodes, label, sub };
}

// --- die Hüte -----------------------------------------------------------------

/**
 * **Die Hüte aus dem Regal**, in der Reihenfolge des Menüs.
 *
 * Oben die Liste aus dem Wunsch, darunter, was die übrigen Figuren noch am
 * Kopf tragen. Der **Helm im Flugmodus** steht zweimal da: einmal so, wie ihn
 * alle sehen, und einmal _immersiv_ — dann trägt der Spieler in der Brille
 * denselben Helm zusätzlich **um seinen eigenen Kopf** (`core/selfHelmet.ts`).
 *
 * Die **Augenklappe des Survivalists** fehlt, und nicht aus Versehen: Sie ist
 * kein eigenes Teil, sondern ins Netz und die Textur seines Kopfes gemalt.
 * Wer sie will, nimmt unter _Kopf_ den Survivalist.
 */
export const MODEL_HATS = {
  knightHelmet: part(
    KNIGHT,
    ['Knight_Helmet', 'Knight_HelmetVisor'],
    'Helm des Ritters',
    'Mit Visier — vom Ritter',
  ),
  bearHat: part(BARBARIAN, ['Barbarian_BearHat'], 'Bärenkopf', 'Das Fell des Barbaren'),
  mageHat: part(MAGE, ['Mage_Hat'], 'Magierhut', 'Spitz und breitkrempig — vom Magier'),
  skeletonHelmet: part(
    SKELETON_WARRIOR,
    ['Skeleton_Warrior_Helmet'],
    'Helm des Skelett-Kriegers',
    'Rostig, mit Hörnern',
  ),
  dummyHelmet: part(DUMMY, ['Dummy_Helmet'], 'Dummy-Helm', 'Vom Übungs-Dummy'),
  skeletonHood: part(
    SKELETON_ROGUE,
    ['Skeleton_Rogue_Hood'],
    'Kapuze des Skelett-Schurken',
    'Tief ins Gesicht gezogen',
  ),
  necromancerCrown: part(
    NECROMANCER,
    ['Necromancer_Crown'],
    'Diadem des Nekromanten',
    'Vom Nekromanten',
  ),
  driverShades: part(
    DRIVER,
    ['Driver_Sunglasses'],
    'Brille des Fahrers',
    'Sonnenbrille vom Fahrer',
  ),
  monsterCostume: part(
    MONSTER_COSTUME,
    ['MonsterCostume_Head'],
    'Monsterkostüm',
    'Der Kopf des Kostüms, übergestülpt',
  ),
  actionHeadband: part(
    ACTION_FIGURE,
    ['ActionFigure_Headband'],
    'Stirnband der Actionfigur',
    'Von der Actionfigur',
  ),
  flightHelmet: part(
    SPACE_RANGER_FLIGHT,
    ['SpaceRanger_Helmet'],
    'Helm des Space Rangers',
    'Aus dem Flugmodus, mit Visier',
  ),
  flightHelmetImmersive: part(
    SPACE_RANGER_FLIGHT,
    ['SpaceRanger_Helmet'],
    'Helm des Space Rangers · Immersiv',
    'Derselbe Helm — in der Brille auch um den eigenen Kopf',
  ),
  calibrationImmersive: part(
    SPACE_RANGER_FLIGHT,
    ['SpaceRanger_Helmet'],
    'Kalibrier-Helm · Immersiv',
    'Der immersive Helm mit farbigen Gradlinien im Blick — zum Ausmessen der Brille',
  ),
  paladinHelmet: part(PALADIN_HELMET, ['Paladin_Helmet'], 'Helm des Paladins', 'Vom Paladin'),
  clownHat: part(CLOWN, ['Clown_Hat'], 'Clownshut', 'Vom Clown'),
  mechHead: part(COMBAT_MECH, ['CombatMech_Head'], 'Kopf des Kampfroboters', 'Vom Combat Mech'),
  witchHat: part(WITCH, ['Witch_Hat'], 'Hexenhut', 'Von der Hexe'),
  helperAHat: part(HELPER_A, ['Helper_A_Hat'], 'Hut von Helper A', 'Vom Helfer A'),
  helperBHat: part(HELPER_B, ['Helper_B_Hat'], 'Hut von Helper B', 'Vom Helfer B'),
  skeletonMageHat: part(
    SKELETON_MAGE,
    ['Skeleton_Mage_Hat'],
    'Hut des Skelett-Magiers',
    'Vom Skelett-Magier',
  ),
  hikerHat: part(HIKER, ['Hiker_Hat'], 'Wanderhut', 'Vom Wanderer'),
  farmerAHat: part(FARMER_A, ['Farmer_A_Hat'], 'Hut des Bauern A', 'Vom Bauern A'),
  farmerBHat: part(FARMER_B, ['Farmer_B_Hat'], 'Hut des Bauern B', 'Vom Bauern B'),
  toySoldierHat: part(TOY_SOLDIER, ['ToySoldier_Hat'], 'Hut des Zinnsoldaten', 'Vom Zinnsoldaten'),
  engineerGoggles: part(ENGINEER, ['Engineer_Goggles'], 'Schutzbrille', 'Vom Ingenieur'),
  nightvision: part(
    MARKSMAN,
    ['Marksman_NightvisionGoggles'],
    'Nachtsichtgerät',
    'Vom Scharfschützen',
  ),
  ninjaHeadband: part(NINJA, ['Ninja_Headband'], 'Stirnband des Ninjas', 'Vom Ninja'),
  ninjaMask: part(NINJA, ['Ninja_Mask'], 'Maske des Ninjas', 'Vom Ninja'),
  rogueMask: part(
    ROGUE_HOODED,
    ['RogueHooded_Mask'],
    'Maske des Schurken',
    'Vom Schurken mit Kapuze',
  ),
  witchGlasses: part(WITCH, ['Witch_Glasses'], 'Brille der Hexe', 'Von der Hexe'),
  lorekeeperGlasses: part(
    LOREKEEPER,
    ['Lorekeeper_Glasses'],
    'Brille des Bewahrers',
    'Vom Lorekeeper',
  ),
} as const satisfies Record<string, NamedFigurePart>;

export type ModelHatKind = keyof typeof MODEL_HATS;

/** Die Hüte aus dem Regal, in der Reihenfolge des Menüs. */
export const MODEL_HAT_KINDS = Object.keys(MODEL_HATS) as readonly ModelHatKind[];

/** Ob ein Hut aus dem Regal kommt — und nicht gebaut wird (`headgear.ts`). */
export function isModelHat(kind: string): kind is ModelHatKind {
  return Object.prototype.hasOwnProperty.call(MODEL_HATS, kind);
}

/**
 * **Der Hut, zu dem der Spieler in der Brille den Helm selbst um den Kopf
 * trägt** (`core/selfHelmet.ts`). Für alle anderen ist er der gewöhnliche
 * Helm des Space Rangers.
 */
export const IMMERSIVE_HAT: ModelHatKind = 'flightHelmetImmersive';

/**
 * **Der Helm zum Ausmessen** — derselbe immersive Helm, dazu ein Gradnetz vor
 * dem Auge (`core/viewCalibration.ts`). Für alle anderen wieder der Helm des
 * Space Rangers.
 */
export const CALIBRATION_HAT: ModelHatKind = 'calibrationImmersive';

/** Ob man diesen Hut in der Brille auch um den eigenen Kopf trägt (`core/selfHelmet.ts`). */
export function isImmersiveHat(kind: string): kind is ModelHatKind {
  return kind === IMMERSIVE_HAT || kind === CALIBRATION_HAT;
}

// --- die Köpfe ----------------------------------------------------------------

/**
 * **Die Köpfe**, und zwar ganz: Haar, Gesicht, Ohren in einem Teil, so wie
 * die Figur ihn trägt (gewünscht: _„es reicht hier als leichtere auswahl den
 * Kopf direkt zu nehmen"_). Die Skelette bringen Augen und Kiefer als eigene
 * Teile mit; die gehören zum Kopf.
 */
export const FACE_PARTS = {
  ranger: part(RANGER, ['Ranger_Head'], 'Waldläufer', 'Der Kopf des Rangers'),
  ninja: part(NINJA, ['Ninja_Head'], 'Ninja', 'Schwarzes Haar mit Knoten'),
  spaceRanger: part(SPACE_RANGER, ['SpaceRanger_Head'], 'Space Ranger', 'Der Kopf ohne Helm'),
  werewolf: part(
    WEREWOLF_MAN,
    ['Werewolf_Man_Head'],
    'Werwolf (Mensch)',
    'Der Kopf vor dem Vollmond',
  ),
  survivalist: part(SURVIVALIST, ['Survivalist_Head'], 'Survivalist', 'Mit Augenklappe'),
  paladin: part(PALADIN, ['Paladin_Head'], 'Paladin', 'Der Kopf ohne Helm'),
  clown: part(CLOWN, ['Clown_Head'], 'Clown', 'Der Kopf ohne Hut'),
  vampire: part(VAMPIRE, ['Vampire_Head'], 'Vampir', 'Der Kopf des Vampirs'),
  rogue: part(ROGUE, ['Rogue_Head'], 'Schurke', 'Der Kopf des Schurken'),
  knight: part(KNIGHT, ['Knight_Head'], 'Ritter', 'Ohne Helm'),
  barbarian: part(BARBARIAN, ['Barbarian_Head'], 'Barbar', 'Ohne Bärenfell'),
  mage: part(MAGE, ['Mage_Head'], 'Magier', 'Ohne Hut'),
  druid: part(DRUID, ['Druid_Head'], 'Druide', 'Der Kopf des Druiden'),
  engineer: part(ENGINEER, ['Engineer_Head'], 'Ingenieur', 'Ohne Schutzbrille'),
  driver: part(DRIVER, ['Driver_Head'], 'Fahrer', 'Ohne Brille'),
  actionFigure: part(ACTION_FIGURE, ['ActionFigure_Head'], 'Actionfigur', 'Ohne Stirnband'),
  witch: part(WITCH, ['Witch_Head'], 'Hexe', 'Ohne Hut'),
  caveman: part(CAVEMAN, ['Caveman_Head'], 'Höhlenmensch', 'Der Kopf des Höhlenmenschen'),
  tiefling: part(TIEFLING, ['Tiefling_Head'], 'Tiefling', 'Der Kopf des Tieflings'),
  superhero: part(SUPERHERO, ['Superhero_Head'], 'Superheld', 'Der Kopf des Superhelden'),
  cleric: part(CLERIC, ['Cleric_Head'], 'Kleriker', 'Der Kopf des Klerikers'),
  magicalGirl: part(
    MAGICAL_GIRL,
    ['MagicalGirl_Head'],
    'Magical Girl',
    'Der Kopf des Magical Girls',
  ),
  lorekeeper: part(LOREKEEPER, ['Lorekeeper_Head'], 'Bewahrer', 'Ohne Brille'),
  hiker: part(HIKER, ['Hiker_Head'], 'Wanderer', 'Ohne Hut'),
  skeleton: part(
    SKELETON_WARRIOR,
    ['Skeleton_Warrior_Head', 'Skeleton_Warrior_Eyes', 'Skeleton_Warrior_Jaw'],
    'Skelett',
    'Schädel mit Kiefer',
  ),
} as const satisfies Record<string, NamedFigurePart>;

/** Welcher Kopf: `own` ist der, den die Figur mitbringt — die Auslieferung. */
export type FaceKind = 'own' | keyof typeof FACE_PARTS;

export const FACE_KINDS: readonly FaceKind[] = [
  'own',
  ...(Object.keys(FACE_PARTS) as (keyof typeof FACE_PARTS)[]),
];

export const FACE_LABELS: Readonly<Record<FaceKind, string>> = {
  own: 'Eigener',
  ...(Object.fromEntries(Object.entries(FACE_PARTS).map(([k, p]) => [k, p.label])) as Record<
    keyof typeof FACE_PARTS,
    string
  >),
};

export const FACE_SUBS: Readonly<Record<FaceKind, string>> = {
  own: 'Der Kopf, den die Figur mitbringt',
  ...(Object.fromEntries(Object.entries(FACE_PARTS).map(([k, p]) => [k, p.sub])) as Record<
    keyof typeof FACE_PARTS,
    string
  >),
};

/** Ob eine Zeichenkette einen Kopf benennt — alles andere ist `own`. */
export function asFace(value: unknown): FaceKind {
  return FACE_KINDS.includes(value as FaceKind) ? (value as FaceKind) : 'own';
}

/** Das Stück zu einem Kopf, oder `null` für den eigenen. */
export function facePart(kind: FaceKind): NamedFigurePart | null {
  return kind === 'own' ? null : FACE_PARTS[kind];
}

// --- was an der Trägerin weicht ---------------------------------------------------

/**
 * **Welche Teile einer Figur zum Kopf gehören** — und welche davon ein Hut
 * sind.
 *
 * Wer einen fremden Hut aufsetzt, nimmt den eigenen ab: Ein Ritter mit
 * Magierhut trägt ihn nicht über dem Helm. Wer einen fremden Kopf nimmt,
 * legt mit dem eigenen auch alles ab, was daran hängt — Helm, Brille,
 * Kapuze —, denn das ist auf den eigenen geschnitten. Gelesen wird am
 * **Namen** des Teils, wie ihn die Dateien vergeben (`Knight_Helmet`,
 * `Skeleton_Mage_Skull`); was starr am Kopfknochen hängt, gehört beim
 * Kopfwechsel ebenfalls dazu (`AvatarBody`).
 */
const HEAD_REGION = /_(Head|Skull|Eyes|Jaw)$/;
const HAT_REGION =
  /(Hat|BearHat|Helmet|HelmetVisor|Helmet_Visor|Crown|Hood|Headband|Mask|FaceMask|FaceNet|Glasses|Sunglasses|Goggles|Head_GhillieSuit)$/;

export type PartRegion = 'head' | 'hat' | null;

/** Zu welchem Bereich ein Teil gehört, nach seinem Namen. */
export function partRegion(name: string): PartRegion {
  const clean = name.replace(/_\d+$/, '');
  if (HAT_REGION.test(clean)) return 'hat';
  if (HEAD_REGION.test(clean)) return 'head';
  return null;
}

// --- das Maß des Kopfes -----------------------------------------------------------

/**
 * **Der KayKit-Kopf im Raum seines Knochens**, nachgemessen an Ritter, Space
 * Ranger, Clown und Mannequin: Er steht über dem Knochen, seine Mitte gut
 * einen halben Meter darüber, seine halbe Breite um 0,54 (Einheiten der
 * Datei). Die gebaute Kochmütze und das Regal im Konstrukt brauchen das, um
 * ein Stück vom KayKit-Kopf auf einen anderen Kopf umzurechnen
 * (`headgear.ts`); auf einer Figur aus dem Regal hängt es einfach am Knochen.
 */
export const KAYKIT_HEAD = {
  centerY: 0.5,
  radius: 0.54,
  /** Wo die Augen liegen — hier steht das Auge im eigenen Helm (`selfHelmet`). */
  eyeY: 0.42,
} as const;
