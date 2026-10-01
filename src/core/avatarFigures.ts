import { CHEF_EYE, CHEF_HEIGHT } from './chefFit';
import { humanLabel } from './kaykitIndex';

/**
 * **Wer man ist** — die vierte Zeile der Umkleide, als reine Rechnung.
 *
 * Bis hierher konnte man am Koch den Kopf, den Hut und die Jacke wechseln; die
 * **Figur** darunter war immer dieselbe. Das Regal hat aber rund 85 fertige
 * Charaktere, die laufen, zuschlagen und umfallen können
 * (`core/kaykitFigure.ts`), und es wäre seltsam, sie als NPC durch die Welt
 * gehen zu lassen und selbst nicht hineinschlüpfen zu dürfen.
 *
 * Also gibt es `Appearance.figure`: entweder `'chef'` — die gebaute Figur samt
 * ihrem Modell, so wie es immer war — oder eine **Adresse im Regal**
 * (`adventurers/characters/Knight.glb`). Eine Adresse und keine Sorte aus einer
 * Aufzählung, und das ist die Entscheidung dieser Datei: Eine Liste von 85
 * Namen wäre eine Liste, die beim nächsten Paket lügt, und ein Regal, das schon
 * jede Datei beim Namen kennt, braucht keine zweite.
 *
 * Was hier steht, ist deshalb dreierlei:
 *
 * - **Die Prüfung** (`asFigure`): Was aus dem Speicher oder über das Netz
 *   hereinkommt, ist fremder Text. Eine Adresse muss aussehen wie eine, sonst
 *   wird daraus wieder der Koch.
 * - **Die kuratierte Liste** (`FIGURE_KINDS`): die Handvoll, die im Menü im
 *   Kreis geschaltet und im Kleiderschrank hingestellt wird. Alle übrigen 85
 *   gehen über die Detailseite des Regals — ein Kleiderschrank mit 85 Ständern
 *   wäre kein Kleiderschrank mehr, sondern das Regal noch einmal.
 * - **Die Höhenregel** (`figureLift`, `figureHeadRadius`): wie groß eine
 *   fremde Figur wird und wo ihr Hut sitzt.
 *
 * Kein three.js, keine Datei, kein Netz — genau wie `core/chefFit.ts` und
 * `core/kaykitFigureFit.ts`, und aus demselben Grund: Der Lader daneben zieht
 * `GLTFLoader` und `import.meta` mit sich, und beides bringt Jest zum Stehen.
 */

/**
 * **Der Koch, gebaut und als Modell** (`core/chefModel.ts`) — die beiden
 * Kugeln. Er ist keine Wahl mehr (gewünscht: _„Ich will den originalen
 * charakter nicht mehr haben (die beiden kugeln)"_), aber er bleibt der
 * Körper, der dasteht, solange eine Figur noch über die Leitung kommt, und
 * der, der ohne WebGL bleibt (Jest). Ein gespeichertes `'chef'` wird zur
 * Auslieferung (`FIGURE_DEFAULT`, `appearance.clampAppearance`).
 */
export const FIGURE_CHEF = 'chef';

/** **Die Auslieferung**: das Mannequin — die Gliederpuppe, an der alle Bewegungen hängen. */
export const FIGURE_DEFAULT =
  'character-animations/mannequin-character/characters/Mannequin_Medium.glb';

/** Ein Eintrag der kuratierten Liste. */
export interface FigureKind {
  /** `'chef'` oder eine Adresse im Regal. */
  readonly path: string;
  /** Wie sie im Menü heißt. */
  readonly label: string;
  /** Die eine Zeile darunter. */
  readonly sub: string;
  /**
   * **Mit welcher Höhe sie bestellt wird**, in Metern
   * (`loadKaykitFigure(path, height)`).
   *
   * Es ist eine **Vorgabe und kein Ergebnis**: Was die Figur am Ende wirklich
   * misst, entscheidet `figureLift` an ihrem Kopfknochen — und weil alle
   * Figuren des mittleren Skeletts denselben Rig haben, kommt für sie alle
   * dieselbe Verkleinerung heraus, egal mit welcher Zahl man anfängt. Sie
   * steht trotzdem hier, weil sie für die eine Figur zählt, die **keinen**
   * Kopfknochen hat: Dann ist sie die Höhe, und ohne sie stünde dort
   * irgendetwas.
   */
  readonly height: number;
  /**
   * **Der Kopfhalbmesser**, als Vielfaches der Höhe des Kopfknochens — oder
   * nichts, dann gilt `FIGURE_HEAD` (siehe dort).
   *
   * Nur für Figuren auf einem **anderen** Skelett: Das große Rig hat andere
   * Verhältnisse, und ein Hut nach der Regel des mittleren säße einem Golem
   * auf der Nase.
   */
  readonly head?: number;
}

/**
 * **Wie hoch eine fremde Figur bestellt wird**, in Metern.
 *
 * Eine Zahl in der Größenordnung eines Menschen, damit die Figur auch dann
 * vernünftig dasteht, wenn an ihr nichts zu messen ist. Für alles mit
 * Kopfknochen rechnet `figureLift` sie ohnehin um.
 */
export const FIGURE_HEIGHT = 1.7;

/**
 * **Der Kopf einer KayKit-Figur ist eine Kugel, die auf ihrem Kopfknochen
 * sitzt** — und dieser Anteil der Kopfknochenhöhe ist ihr Halbmesser _und_ der
 * Abstand ihrer Mitte vom Knochen.
 *
 * Nachgemessen am Regal, und zwar an dem einen Maß, das alle diese Figuren
 * teilen: Das **mittlere Skelett** setzt den Knochen `head` bei jeder einzelnen
 * Figur auf dieselbe Höhe (0,869 m bei Paketmaßstab, bei Mannequin, Ritter,
 * Magier, Roboter und Skelett-Krieger gleichermaßen — nachgesehen mit einem
 * Playwright-Lauf über sieben Dateien). Der Schädel darüber ist damit bei allen
 * derselbe: von 0,869 bis 1,54 hoch und 0,68 breit. Halbmesser und Erhebung
 * sind dieselbe Zahl, weil eine Kugel, die auf einem Punkt aufsitzt, ihre Mitte
 * genau einen Halbmesser darüber hat.
 *
 * **Warum nicht die Hülle messen**: Die Höhe der Hülle sagt beim Magier, wie
 * lang sein Hut ist, und beim Ritter, wie hoch sein Helmkamm steht — über den
 * Kopf darunter sagt sie nichts. Der Knochen sagt es, und er kostet nichts.
 */
export const FIGURE_HEAD = 0.39;

/**
 * **Wie klein und wie groß eine Figur werden darf**, in Metern.
 *
 * Die Kopfregel (`figureLift`) stellt den Kopf dorthin, wo der des Kochs steht,
 * und für alles auf dem mittleren Skelett kommt dabei eine Figur von gut 1,6 m
 * heraus — die Verhältnisse stimmen ja überein. Ein **Golem** auf dem großen
 * Skelett trägt seinen Kopf dagegen ganz oben: Sein Kopfknochen auf 0,91 m
 * hieße eine Figur von 1,14 m, also ein Zwerg mit Riesenschultern. Dann gewinnt
 * die Höhe gegen die Kopfhöhe — lieber ein Kopf eine Handbreit zu hoch als eine
 * Figur, die zusammengestaucht ist.
 */
export const FIGURE_MIN_HEIGHT = 1.3;
export const FIGURE_MAX_HEIGHT = 2.4;

/**
 * **Die kuratierte Liste** — zwölf Figuren, eine davon der Koch.
 *
 * Warum nicht alle 85: Das Menü _Aussehen_ schaltet im Kreis, und eine Zeile,
 * die man 85-mal drücken muss, ist keine Auswahl. Der Kleiderschrank stellt
 * jedes Stück auf eine eigene Kachel, und 85 Ständer sprengen den Ring. Wer
 * eine der übrigen will, nimmt den Weg über die **Detailseite** des Regals
 * (_Als Figur tragen_) — dort steht sie ohnehin schon groß vor einem.
 *
 * Ausgesucht ist nach zwei Regeln: **verschieden** (ein Ritter und ein Roboter
 * sagen mehr als zwei Ritter) und auf dem **mittleren Skelett** (das bringt die
 * meisten Bewegungen mit, `core/kaykitFigureFit.GAIT_CLIPS`). Die `_Large`-Rigs
 * — Golem, Barbarian_Large, Mannequin_Large — stehen absichtlich nicht dabei:
 * Sie haben andere Verhältnisse und gehören in den Nahkampf, nicht in die
 * Küche.
 */
/** Der Space Ranger — die Figur der Raumstation (`worlds/haunting/ShipExperience`). */
export const SPACE_RANGER =
  'mystery-monthly-4/7-january-2024-space-ranger/character/SpaceRanger.glb';

export const FIGURE_KINDS: readonly FigureKind[] = [
  {
    path: FIGURE_DEFAULT,
    label: 'Mannequin',
    sub: 'Die Auslieferung — die Gliederpuppe, an der alle Bewegungen hängen',
    height: FIGURE_HEIGHT,
  },
  {
    path: 'adventurers/characters/Knight.glb',
    label: 'Ritter',
    sub: 'Helm, Umhang, Kettenhemd',
    height: FIGURE_HEIGHT,
  },
  {
    path: 'adventurers/characters/Barbarian.glb',
    label: 'Barbar',
    sub: 'Bärenfell auf dem Kopf',
    height: FIGURE_HEIGHT,
  },
  {
    path: 'adventurers/characters/Mage.glb',
    label: 'Magier',
    sub: 'Spitzhut und Umhang',
    height: FIGURE_HEIGHT,
  },
  {
    path: 'adventurers/characters/Ranger.glb',
    label: 'Waldläufer',
    sub: 'Köcher auf dem Rücken',
    height: FIGURE_HEIGHT,
  },
  {
    path: 'adventurers/characters/Rogue.glb',
    label: 'Schurke',
    sub: 'Leise, dunkel, mit Umhang',
    height: FIGURE_HEIGHT,
  },
  {
    path: 'mystery-monthly-4/12-june-2024-robot/characters/Robot_One.glb',
    label: 'Roboter Eins',
    sub: 'Blechkamerad, rund',
    height: FIGURE_HEIGHT,
  },
  {
    path: 'mystery-monthly-4/12-june-2024-robot/characters/Robot_Two.glb',
    label: 'Roboter Zwei',
    sub: 'Blechkamerad, eckig',
    height: FIGURE_HEIGHT,
  },
  {
    path: 'skeletons/characters/Skeleton_Warrior.glb',
    label: 'Skelett-Krieger',
    sub: 'Knochen, Helm und Umhang',
    height: FIGURE_HEIGHT,
  },
  {
    path: 'mystery-monthly-4/8-february-2024-ninja/character/Ninja.glb',
    label: 'Ninja',
    sub: 'Maske und Stirnband',
    height: FIGURE_HEIGHT,
  },
  {
    path: SPACE_RANGER,
    label: 'Space Ranger',
    sub: 'Raumanzug mit Helm',
    height: FIGURE_HEIGHT,
  },
];

/**
 * **Die Pakete, deren Figuren alle unter _Vorgefertigte_ stehen** — gewünscht:
 * _„die restlichen charaktere noch in die presets hinzufügen: skeletons
 * charakter pack, monthly mystery series 4, 5, 6, charakter animations (der
 * große mannequin), der dummy"_. Die Adressen stehen hier ausgeschrieben, weil
 * das Regal in Jest nicht da ist; dass jede davon eine Figur mit Skelett ist,
 * prüft `avatarFigures.test.ts` an den Dateien.
 *
 * Die großen Skelette (`Mannequin_Large`, `Skeleton_Golem`, `FrostGolem`)
 * stehen jetzt dabei: Die Höhenregel stellt jede Figur mit dem Kopf dorthin,
 * wo der des Kochs stand (`figureLift`), und Bewegungen bringt der Lader für
 * beide Skelette mit (`core/kaykitClips.kaykitRigOf`).
 */
const PACKS: ReadonlyArray<{ sub: string; paths: readonly string[] }> = [
  {
    sub: 'Character Animations',
    paths: ['character-animations/mannequin-character/characters/Mannequin_Large.glb'],
  },
  { sub: 'Prototype Bits', paths: ['prototype-bits/character/Dummy.glb'] },
  {
    sub: 'Skeletons',
    paths: [
      'skeletons/characters/Skeleton_Minion.glb',
      'skeletons/characters/Skeleton_Mage.glb',
      'skeletons/characters/Skeleton_Rogue.glb',
      'skeletons/characters/Skeleton_Golem.glb',
      'skeletons/characters/Necromancer.glb',
    ],
  },
  {
    sub: 'Monthly Mystery 4',
    paths: [
      'mystery-monthly-4/1-july-2023-orc-raider/character/OrcRaider.glb',
      'mystery-monthly-4/2-august-2023-driver/character/Driver.glb',
      'mystery-monthly-4/3-september-2023-monster-costume/character/Monster.glb',
      'mystery-monthly-4/3-september-2023-monster-costume/character/MonsterCostume.glb',
      'mystery-monthly-4/4-october-2023-werewolf/characters/Werewolf_Man.glb',
      'mystery-monthly-4/4-october-2023-werewolf/characters/Werewolf_Wolf.glb',
      'mystery-monthly-4/5-november-2023-animatronic/characters/Animatronic_Normal.glb',
      'mystery-monthly-4/5-november-2023-animatronic/characters/Animatronic_Creepy.glb',
      'mystery-monthly-4/6-december-2023-action-figure/character/ActionFigure.glb',
      'mystery-monthly-4/7-january-2024-space-ranger/character/SpaceRanger_FlightMode.glb',
      'mystery-monthly-4/9-march-2024-survivalist/character/Survivalist.glb',
      'mystery-monthly-4/10-april-2024-paladin/characters/Paladin.glb',
      'mystery-monthly-4/10-april-2024-paladin/characters/Paladin_with_Helmet.glb',
      'mystery-monthly-4/11-may-2024-clown/characters/Clown.glb',
    ],
  },
  {
    sub: 'Monthly Mystery 5',
    paths: [
      'mystery-monthly-5/1-july-2024-combat-mech/characters/CombatMech.glb',
      'mystery-monthly-5/2-august-2024-superhero/characters/Superhero.glb',
      'mystery-monthly-5/3-september-2024-black-knight/characters/BlackKnight.glb',
      'mystery-monthly-5/4-october-2024-vampire/characters/Vampire.glb',
      'mystery-monthly-5/5-november-2024-witch/characters/Witch.glb',
      'mystery-monthly-5/6-december-2024-helpers/characters/Helper_A.glb',
      'mystery-monthly-5/6-december-2024-helpers/characters/Helper_B.glb',
      'mystery-monthly-5/7-january-2025-frostgolem/characters/FrostGolem.glb',
      'mystery-monthly-5/8-february-2025-caveman/characters/Caveman.glb',
      'mystery-monthly-5/9-march-2025-clanker/characters/Clanker.glb',
      'mystery-monthly-5/10-april-2025-protagonists/characters/Protagonist_A.glb',
      'mystery-monthly-5/10-april-2025-protagonists/characters/Protagonist_B.glb',
      'mystery-monthly-5/11-may-2025-hiker/characters/Hiker.glb',
      'mystery-monthly-5/12-june-2025-tiefling/characters/Tiefling.glb',
    ],
  },
  {
    sub: 'Monthly Mystery 6',
    paths: [
      'mystery-monthly-6/1-july-2025-lorekeeper/characters/Lorekeeper.glb',
      'mystery-monthly-6/2-august-2025-orc-brute/characters/OrcBrute.glb',
      'mystery-monthly-6/3-september-2025-cleric/characters/Cleric.glb',
      'mystery-monthly-6/4-october-2025-monstrosity/characters/Monstrosity.glb',
      'mystery-monthly-6/5-november-2025-plant-warrior/characters/PlantWarrior.glb',
      'mystery-monthly-6/6-december-2025-toy-soldier/characters/ToySoldier.glb',
      'mystery-monthly-6/7-january-2026-4gtn/characters/4GTN.glb',
      'mystery-monthly-6/7-january-2026-4gtn/characters/4GTN_Forgotten.glb',
      'mystery-monthly-6/8-february-2026-hoarder/characters/Hoarder.glb',
      'mystery-monthly-6/9-march-2026-avian-swordsman/characters/AvianSwordsman.glb',
      'mystery-monthly-6/10-april-2026-marksman/characters/Marksman.glb',
      'mystery-monthly-6/11-may-2026-magical-girl/characters/MagicalGirl.glb',
      'mystery-monthly-6/12-june-2026-farmers/characters/Farmer_A.glb',
      'mystery-monthly-6/12-june-2026-farmers/characters/Farmer_B.glb',
    ],
  },
];

/**
 * **Alle Figuren unter _Vorgefertigte_** (`ui/outfitMenu.ts`): erst die
 * kuratierten mit ihren deutschen Namen, dann die Pakete in ihrer Reihenfolge,
 * jede mit dem Namen, den das Regal ihr gibt (`humanLabel`).
 *
 * Der Kleiderschrank im Konstrukt nimmt weiter nur `FIGURE_KINDS` — gut
 * fünfzig Ständer sprengten seinen Ring.
 */
export const FIGURE_PRESETS: readonly FigureKind[] = [
  ...FIGURE_KINDS,
  ...PACKS.flatMap((pack) =>
    pack.paths.map((path) => ({
      path,
      label: humanLabel(path.slice(path.lastIndexOf('/') + 1)),
      sub: pack.sub,
      height: FIGURE_HEIGHT,
    })),
  ),
];

/** Dieselbe Liste nur als Adressen — die Zeile im Menü schaltet darüber. */
export const FIGURE_PATHS: readonly string[] = FIGURE_KINDS.map((kind) => kind.path);

/** Den Eintrag zu einer Adresse — oder nichts, wenn sie nicht kuratiert ist. */
export function figureKind(path: string): FigureKind | null {
  return FIGURE_PRESETS.find((kind) => kind.path === path) ?? null;
}

/**
 * **Ob eine Zeichenkette eine Figur benennt** — sonst der Koch.
 *
 * Dieser Wert kommt aus dem Speicher des Browsers und aus der Anmeldung eines
 * Mitspielers (`net/NetSession.ts`), also aus zwei Quellen, denen man nicht
 * glauben darf. Er wird aber als **Adresse einer Datei** benutzt, und damit ist
 * die Prüfung keine Formsache: Ein `../` darin wäre ein Weg aus dem
 * Modellordner heraus, ein `#` oder `?` eine Adresse mit Anhang, und eine
 * Adresse mit Leerzeichen am Rand ist eine, die es nicht gibt, aber jedes Mal
 * über die Leitung geht.
 *
 * Erlaubt ist deshalb genau eine Form: mindestens zwei Abschnitte aus
 * Buchstaben, Ziffern, `.`, `_` und `-`, jeder Abschnitt mit einem Buchstaben
 * oder einer Ziffer beginnend, und am Ende `.glb`. Alles andere wird zum Koch —
 * **nicht** zu `undefined`, dieselbe Regel wie bei `asHeadgear`: Ein Aussehen,
 * das nicht gilt, ist die Auslieferung und kein halb gebauter Körper.
 *
 * Nicht geprüft wird, ob es die Datei **gibt**: Das weiß erst der Lader, und
 * der antwortet mit `null` und lässt die gebaute Figur stehen.
 */
const FIGURE_PATH = /^[A-Za-z0-9][A-Za-z0-9._-]*(?:\/[A-Za-z0-9][A-Za-z0-9._-]*)+\.glb$/;
/** Länger als das ist keine Adresse, sondern jemand, der die Leitung füllt. */
const FIGURE_PATH_MAX = 200;

export function asFigure(value: unknown): string {
  if (typeof value !== 'string') return FIGURE_CHEF;
  if (value === FIGURE_CHEF) return FIGURE_CHEF;
  if (value.length === 0 || value.length > FIGURE_PATH_MAX) return FIGURE_CHEF;
  // `..` steckt in keinem Dateinamen der Sammlung und ist der einzige Weg aus
  // dem Modellordner heraus, den die Form oben sonst durchließe (`a..b`).
  if (value.includes('..')) return FIGURE_CHEF;
  return FIGURE_PATH.test(value) ? value : FIGURE_CHEF;
}

/**
 * **Wie eine Figur heißt.**
 *
 * Die kuratierte Liste hat eigene Namen — _Waldläufer_ statt _Ranger_ —, denn
 * sie stehen im deutschen Menü neben _Kochmütze_ und _Vollbart_. Alles andere
 * bekommt den Namen, den das Regal ohnehin vergibt (`humanLabel`): Der Pfad
 * **ist** dort der Name, und zwei Stellen, die denselben Dateinamen verschieden
 * schreiben, sind eine zu viel.
 */
export function figureLabel(path: string): string {
  const kind = figureKind(path);
  if (kind) return kind.label;
  const cut = path.lastIndexOf('/');
  return humanLabel(cut < 0 ? path : path.slice(cut + 1));
}

/** Die Zeile darunter — für alles Unkuratierte das Paket, in dem es liegt. */
export function figureSub(path: string): string {
  const kind = figureKind(path);
  if (kind) return kind.sub;
  const cut = path.indexOf('/');
  return cut < 0 ? 'Aus dem Regal' : `Aus dem Paket ${humanLabel(path.slice(0, cut))}`;
}

/** Mit welcher Höhe der Lader bestellt wird (siehe `FigureKind.height`). */
export function figureHeight(path: string): number {
  return figureKind(path)?.height ?? FIGURE_HEIGHT;
}

/**
 * **Wie viel größer oder kleiner die geladene Figur noch wird**, damit ihr Kopf
 * dort steht, wo der des Kochs steht.
 *
 * Das ist die Höhenregel, und sie ist die eine Entscheidung dieses Umbaus:
 * **Nicht die Höhe wird angeglichen, sondern der Kopf.** Der Grund steht überall
 * sonst im Code: Am Kopf der Figur hängt alles, was sie tut. Die Hände rechnen
 * ihren Abstand zu ihm (`AvatarBody.update`, `POSE_SCALE`), das Werkzeug in der
 * Bildschirmhand steht in ihrem Raum (`chefFit.CHEF_TOOL`), der Teller vor
 * ihrem Bauch auch (`CHEF_CARRY`), und die Kamera schaut aus 16 m auf genau
 * diesen Punkt. Eine Figur, die dieselbe Höhe hat, aber ihren Kopf woanders
 * trägt, hält ihre Pistole neben dem Ohr.
 *
 * Dass dabei etwas Vernünftiges herauskommt, ist kein Zufall: Die KayKit-Figuren
 * sind **genauso chibi** wie der Koch. Sein Kopf liegt zwischen 0,91 und 1,60 m,
 * ihrer zwischen dem Kopfknochen und dem Scheitel — und das Mannequin steht mit
 * dieser Regel auf 1,62 m. Ein Ritter wird höher, weil sein Helmkamm höher ist,
 * und das ist richtig so.
 *
 * Deckel nach oben und unten (`FIGURE_MIN_HEIGHT`, `FIGURE_MAX_HEIGHT`), siehe
 * dort. Und **Unsinn ergibt 1** statt `NaN`: Eine Figur mit falschem Maßstab
 * steht falsch da und lässt sich ansehen; eine mit `NaN` verschwindet.
 *
 * @param headY Höhe des Kopfknochens über den Sohlen, wie geladen (Meter).
 * @param height Höhe der geladenen Figur (Meter) — die, die bestellt wurde.
 */
export function figureLift(headY: number, height: number): number {
  const tall = Number.isFinite(height) && height > 0 ? height : 0;
  const head = Number.isFinite(headY) && headY > 0 ? headY : 0;
  if (tall <= 0) return 1;
  // Ohne Kopfknochen bleibt nur die Höhe — dann steht die Figur so hoch wie
  // der Koch und ihr Kopf, wo er eben hinfällt.
  const wanted = head > 0 ? CHEF_EYE / head : CHEF_HEIGHT / tall;
  const least = FIGURE_MIN_HEIGHT / tall;
  const most = FIGURE_MAX_HEIGHT / tall;
  return Math.min(Math.max(wanted, least), most);
}

/**
 * **Der Halbmesser des Kopfes**, in Metern — die eine Zahl, die `headgearFor`
 * braucht (`core/headgear.ts`).
 *
 * Gerechnet aus der Höhe des Kopfknochens **nach** der Verkleinerung, siehe
 * `FIGURE_HEAD`. `0` heißt: Es gibt nichts zu messen, also auch keinen Hut.
 */
export function figureHeadRadius(path: string, headY: number): number {
  if (!Number.isFinite(headY) || headY <= 0) return 0;
  return headY * (figureKind(path)?.head ?? FIGURE_HEAD);
}
