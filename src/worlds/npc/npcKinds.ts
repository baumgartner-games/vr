import { KAYKIT_ACCENT, humanLabel, kaykitPathOf } from '../../core/kaykitIndex';
import type { FigureGait } from '../../core/kaykitFigureFit';
import type { MenuIcon } from '../../ui/menu';
import type { BrainId } from './npcBrains';

/**
 * **Die Haut** — wie ein NPC aussieht und was sein Körper aushält.
 *
 * Ein NPC besteht aus zwei Hälften, und sie sind mit Absicht getrennt: die
 * **Haut** (hier) sagt, wie er aussieht, wie groß er ist und wie viel er
 * einsteckt; das **Hirn** (`npcBrains.ts`) sagt, was er tut. Beides wird am
 * Hirn-Werkzeug einzeln ausgesucht, und darum darf eine Übungspuppe einem
 * hinterherlaufen und ein Zombie stumpf herumstehen. Wer die beiden Listen
 * zusammenwürfe, hätte statt zwei mal drei Zeilen sechs Sorten NPC — und beim
 * nächsten Modell zwölf.
 *
 * Reine Daten, kein three.js: das Modell dazu baut `NpcBody.ts`. Wer nur
 * wissen will, wie etwas heißt oder wie schnell es läuft — das Menü, die
 * Werkzeugseite, der Konfig-Speicher —, soll dafür keine Geometrie bauen
 * müssen. Dieselbe Aufteilung wie beim Beutel (`props.ts`, `PROP_LABELS`).
 */

/** Die drei Häute, die dieses Spiel selbst mitbringt. */
export type BuiltinNpcKind = 'zombie' | 'dummy' | 'hamster';

/**
 * **Eine Sorte NPC ist entweder eine der drei — oder eine Adresse im Regal.**
 *
 * `kaykit:adventurers/characters/Knight.glb` ist eine gültige Sorte, und zwar
 * überall dort, wo bisher `'zombie'` stand: im Menü, im Speicher der
 * Ausrüstung (`npcSettings.ts`), in einem gespeicherten Charakter
 * (`characterStore.ts`). Eine Aufzählung wäre hier die falsche Form gewesen —
 * es sind fünfundachtzig Figuren im Regal, und morgen sind es mehr; eine Liste
 * davon pflegt niemand, und sie stünde in vier Dateien noch einmal.
 *
 * Die **Vorgaben** bleiben trotzdem eine Liste (`NPC_SKINS`): Sie sind das,
 * was das Menü als Zeilen zeigt und was `clampNpc` kennt, ohne das Regal
 * geladen zu haben.
 */
export type NpcKind = BuiltinNpcKind | `kaykit:${string}`;

/** Woraus ein Körper gebaut wird, und was er aushält. */
export interface NpcSkin {
  id: NpcKind;
  label: string;
  icon: MenuIcon;
  accent: number;
  /** Eine Zeile darüber, wer das ist. */
  sub: string;
  /** Kopf bis Fuß, in Metern. */
  height: number;
  /** Der Radius des Körpers, in Metern — auch der seines Colliders. */
  radius: number;
  /** Kilogramm. Ein NPC ist ein physikalischer Körper wie jeder andere. */
  mass: number;
  /** Wie viel er einsteckt, bevor er umfällt. */
  health: number;
  /** Wie schnell er läuft, in m/s — das Hirn nimmt es als sein Tempo. */
  speed: number;
  /** Das Hirn, mit dem er aus dem Menü kommt, wenn niemand etwas anderes sagt. */
  brain: BrainId;
  /**
   * Wie er die Karte liest (`worlds/nav/navProfile.ts`).
   *
   * Die eine Zeile, an der hängt, dass ein Zombie in die Stachelgrube läuft
   * und eine Übungspuppe darum herum — und dass der eine Türen aufmacht und
   * der andere davorsteht. Sie gehört zur **Haut** und nicht zum Hirn: Was
   * einem wehtut, hängt daran, was man ist, und nicht daran, was man vorhat.
   */
  profile: string;
  /**
   * **Wie viele halbe Kacheln er je Seite belegt** (`nav/cellGrid.ts`) —
   * fehlt die Zahl, sind es 2, ein Block von 2 × 2. Auf diesem Block steht er
   * logisch, darauf plant er seinen Weg, und von ihm aus wird getroffen;
   * gezeichnet wird er dazwischen.
   */
  cells?: number;
  /** Die drei Farben des Modells: Haut, Kleidung, Augen. */
  palette: { skin: number; cloth: number; eye: number };
  /**
   * Wie die Arme hängen: **vor** dem Körper wie bei einem Zombie oder
   * **neben** ihm wie bei allem anderen. Das ist die eine Silhouette, an der
   * man auf dreißig Meter erkennt, was da kommt.
   *
   * Sie gilt für den **gebauten** Körper aus Klötzen. Trägt die Haut eine
   * `figure`, macht die Silhouette danach die Bewegung (`gaits`) — die Zahl
   * bleibt trotzdem stehen, denn der gebaute Körper ist weiterhin das, was
   * sofort dasteht und was die Tests messen.
   */
  arms: 'out' | 'down';
  /**
   * **Die Figur aus dem Regal, die über die Klötze kommt** — eine Adresse wie
   * in `core/kaykitModel.ts`, ohne `models/kaykit/` davor.
   *
   * Sie ist ein **Ersatz und keine Bedingung**: Gebaut wird immer der Körper
   * aus Klötzen (`NpcBody.ts`), und erst wenn die Datei da ist, wird er
   * unsichtbar und die Figur hängt an seiner Stelle. Ohne WebGL (Jest), ohne
   * die gekauften Pakete, ohne Leitung bleibt es bei den Klötzen — und ein
   * NPC, der läuft, kommt in allen drei Fällen heraus.
   */
  figure?: string;
  /**
   * **Welche Spur dieser Haut welcher Gang ist** — nur, wo sie es anders will
   * als alle anderen (`core/kaykitFigureFit.GAIT_CLIPS`).
   *
   * Die Sammlung hat keine Zombie-Figur und keine Zombie-Bewegung; was einen
   * Zombie ausmacht, ist die **Haltung**, und die steckt in der Wahl der Spur.
   * Fehlt hier ein Gang, gilt die allgemeine Liste; fehlt der gewünschte Name
   * auf dem Skelett, nimmt `pickClip` den nächsten.
   */
  gaits?: Partial<Record<FigureGait, readonly string[]>>;
}

/**
 * **Die Figur, die der Zombie wurde** — das mittlere Mannequin.
 *
 * Es ist die namenlose Figur der Sammlung: kein Gesicht, keine Rüstung, kein
 * Beruf, nur ein Körper auf dem mittleren Skelett (Quelle 2,20). Genau das
 * macht es zum Zombie — was ihn ausmacht, ist die **Haltung**, und die kommt
 * aus der Bewegung (`ZOMBIE_GAITS`) und nicht aus einer Textur.
 */
const MANNEQUIN = 'character-animations/mannequin-character/characters/Mannequin_Medium.glb';

/**
 * **Die Gänge des Zombies** — die Spuren, die ihn von einem Spaziergänger
 * unterscheiden.
 *
 * Im Stand ist es `Melee_Unarmed_Idle`: die **Kampfhaltung mit erhobenen
 * Fäusten** — die Hände stehen 44 cm über der Hüfte und 11 cm davor, bei
 * `Idle_A` sind es 20 und 5. Das ist die Zombie-Silhouette der Klötze
 * (`arms: 'out'`), nur eben als Bewegung. Beim Gehen ist es
 * `Walking_C`, und zwar wegen dessen, was es **nicht** tut: Nachgemessen am
 * laufenden Mischer (rechte Hand gegen die Hüfte, Mittel und Höchstwert über
 * einen Zyklus) schwingt `Walking_A` die Arme weit mit — die Hand kommt bis
 * 23 cm vor die Hüfte —, `Walking_C` gar nicht: Sie bleibt über den ganzen
 * Schritt dahinter. Ein Zombie schlurft, er spaziert nicht.
 *
 * | Spur | Hand vor der Hüfte (Mittel / höchstens) | über der Hüfte |
 * | ---- | --------------------------------------- | -------------- |
 * | `Idle_A` | 0,05 / 0,05 m | 0,20 m |
 * | `Melee_Unarmed_Idle` | 0,11 / 0,12 m | 0,44 m |
 * | `Walking_A` | 0,04 / 0,23 m | 0,42 m |
 * | `Walking_B` | −0,07 / 0,09 m | 0,27 m |
 * | `Walking_C` | −0,04 / 0,00 m | 0,27 m |
 *
 * Hinter jedem Wunsch steht die allgemeine Liste als Auffang: Das **große**
 * Skelett hat überhaupt nur eine Gehspur (`Walking_A`, nachgesehen in
 * `Rig_Large_MovementBasic.glb`), und `pickClip` nimmt dort eben die. Die
 * Kampfhaltung kennt es dagegen auch — ein großer Zombie steht also ebenfalls
 * mit erhobenen Fäusten da.
 */
const ZOMBIE_GAITS: Partial<Record<FigureGait, readonly string[]>> = {
  idle: ['Melee_Unarmed_Idle', 'Idle_A'],
  walk: ['Walking_C', 'Walking_B', 'Walking_A'],
  run: ['Running_B', 'Running_A', 'Walking_C'],
};

/**
 * Alles, was es an Häuten gibt, in der Reihenfolge, in der das Menü sie zeigt.
 *
 * Drei sind es, und keine davon ist Zierde. Die **Übungspuppe** ist derselbe
 * Körper ohne Absicht — ohne sie sähe man der Aufteilung in Haut und Hirn nie
 * an, dass sie eine ist. Der **Hamster** ist derselbe Körper mit einem anderen
 * Knochenbau: klein, leicht und mit zwanzig Leben, und damit ist er die dritte
 * Antwort auf dieselbe Dachkante (`worlds/nav/navProfile.ts`,
 * `CRITTER_PROFILE`). Wer eine vierte hinzufügt, schreibt sie hier hin und
 * nirgends sonst; Menü, Werkzeugseite und Hirn-Werkzeug lesen diese Liste.
 *
 * **Zwei von dreien tragen jetzt eine Figur aus dem Regal** (`figure`), und
 * das war der Auftrag: „Ich möchte alle berechneten Modelle (wie Zombie)
 * ersetzen durch die Assets aus KayKit. Zombie durch Mannequin." Die Höhen
 * bleiben dabei **die erklärten** — 1,78 m und 1,70 m —, denn an ihnen hängen
 * Collider und Trefferzonen (`npcHit.bodyShape`); der Lader bringt die Figur
 * auf diese Höhe und nicht umgekehrt (`core/kaykitFigure.ts`).
 */
export const NPC_SKINS: readonly NpcSkin[] = [
  {
    id: 'zombie',
    label: 'Zombie',
    icon: 'zombie',
    accent: 0x7fbf5a,
    sub: 'Läuft auf dich zu und schlägt zu',
    height: 1.78,
    radius: 0.29,
    mass: 70,
    health: 100,
    speed: 1.5,
    brain: 'chase',
    profile: 'zombie',
    palette: { skin: 0x7fa062, cloth: 0x3d4a3a, eye: 0xffe36e },
    arms: 'out',
    figure: MANNEQUIN,
    gaits: ZOMBIE_GAITS,
  },
  {
    id: 'dummy',
    label: 'Übungspuppe',
    icon: 'npc',
    accent: 0xd9b271,
    sub: 'Sackleinen und Holz — steht, bis ein Hirn sie schickt',
    height: 1.7,
    radius: 0.28,
    mass: 45,
    health: 160,
    speed: 1.1,
    brain: 'idle',
    profile: 'human',
    palette: { skin: 0xd9b271, cloth: 0x8a6b3f, eye: 0x2a2a2a },
    arms: 'down',
    // Die **Übungspuppe** des Regals heißt dort auch so: ein hölzerner Dummy
    // aus den Prototyp-Bausteinen, 2,40 in den Maßen der Quelle und damit auf
    // dem mittleren Skelett (`core/kaykitClips.kaykitRigOf`).
    figure: 'prototype-bits/character/Dummy.glb',
  },
  {
    id: 'hamster',
    label: 'Hamster',
    // Kein eigenes Zeichen für ihn: Eine Kugel im Raster ist etwas Kleines,
    // Rundes — und ein eigenes Modell wäre eine eigene Datei für eine Sorte,
    // deren ganze Aussage in zwei Zahlen steht (Höhe und Leben).
    icon: 'marble',
    accent: 0xe0a24a,
    sub: 'Klein und leicht — eine Dachkante überlebt er nicht',
    height: 0.6,
    radius: 0.22,
    mass: 4,
    /**
     * **Zwanzig Leben, und das ist die ganze Bucht.** Daraus macht
     * `nav/navFall.safeFall` zwei Meter, und damit ist das 2,4 m hohe Dach für
     * ihn kein Weg nach unten mehr. Ein Zombie mit hundert Leben springt
     * dieselbe Kante hinunter, ohne nachzudenken.
     */
    health: 20,
    speed: 1.8,
    brain: 'chase',
    profile: 'critter',
    palette: { skin: 0xc98b3f, cloth: 0x7a4f22, eye: 0x1a1a1a },
    arms: 'down',
    // **Und er bleibt gebaut**: Im ganzen Regal steht kein Nager. Die
    // Sammlung kennt Ritter, Skelette, Roboter und Mannequins — alle auf
    // zwei menschlichen Skeletten —, und ein Mensch, der auf 60 cm
    // heruntergerechnet wird, ist kein Hamster, sondern ein Zwerg auf zwei
    // Beinen. Zwei Zahlen und ein Profil sind hier die ehrlichere Antwort.
  },
];

/**
 * Die Sorten der **Vorgaben** — die drei Zeilen des Menüs und die Runde, die
 * das Hirn-Werkzeug durchschaltet. Eine Figur aus dem Regal steht nicht darin;
 * sie wird gesetzt und nicht durchgeschaltet.
 */
export const NPC_KINDS: readonly BuiltinNpcKind[] = NPC_SKINS.map(
  (skin) => skin.id as BuiltinNpcKind,
);

/**
 * **Die Sorte zu einer Adresse im Regal** — `kaykit:<pfad>`, dieselbe Id, die
 * auch das Regalmenü für diese Datei vergibt (`core/kaykitIndex.ts`).
 *
 * Eine Id und keine zweite Tabelle: Wer sie liest, weiß sofort, welche Datei
 * gemeint ist, und die Vorschau im Menü kann dieselbe Zeichenkette nehmen,
 * ohne irgendetwas zu übersetzen.
 */
export function shelfKind(path: string): NpcKind {
  return `kaykit:${path}`;
}

/**
 * **Die Adresse hinter einer Sorte** — oder `null`, wenn das keine aus dem
 * Regal ist.
 *
 * Geprüft wird dreierlei, und jedes davon hat einen Grund: das Vorzeichen
 * `kaykit:` (sonst ist es eine der Vorgaben oder Unsinn), **kein `#`** (das
 * sind die Fächer des Regalmenüs, `kaykit:<ordner>#60` — ein Fach ist keine
 * Datei) und die Endung `.glb` (ein Ordner ist keine Figur). Ein Speicher aus
 * einer alten Sitzung darf alles Mögliche enthalten, und daraus soll kein NPC
 * ohne Modell werden, sondern der Zombie.
 */
export function shelfPath(kind: string | undefined): string | null {
  if (typeof kind !== 'string') return null;
  const path = kaykitPathOf(kind);
  return path !== null && /\.glb$/i.test(path) ? path : null;
}

/** Wie hoch eine gesetzte Figur aus dem Regal steht, in Metern. */
export const SHELF_HEIGHT = 1.75;
/** Und wie hoch eine auf dem großen Skelett (`shelfHeight`). */
export const SHELF_LARGE_HEIGHT = 2.8;

/**
 * **Wie hoch eine Figur aus dem Regal als NPC steht** — 1,75 m, und 2,80 m,
 * wenn sie auf dem großen Skelett steht.
 *
 * Die Höhe ist **erklärt und nicht gemessen**, und das ist keine Bequemlichkeit:
 * Der Collider, die Trefferzonen und die Stelle, an der einer gesetzt wird,
 * stehen fest, **bevor** irgendeine Datei geladen ist — die Figur richtet sich
 * danach (`core/kaykitFigure.loadKaykitFigure`). Eine gemessene Höhe hieße,
 * dass ein NPC seine Hülle erst eine halbe Sekunde nach seinem Auftritt
 * bekäme.
 *
 * 1,75 m ist die Mitte zwischen Zombie (1,78) und Übungspuppe (1,70). Die
 * **großen** dürfen groß bleiben: Der Barbar, die Golems und `Mannequin_Large`
 * stehen mit dem Paketmaßstab bei 2,79 m (`docs/agents/assetregal.md`), und
 * ein Golem, der auf Menschengröße gestaucht wird, ist ein Missverständnis und
 * kein Golem.
 *
 * **Erkannt wird am Namen und nicht an der Höhe**, obwohl die Höhe die
 * sauberere Frage wäre (`core/kaykitClips.kaykitRigOf`): Die steht erst am
 * geladenen Modell fest, und hier wird sie vorher gebraucht. `_Large` und
 * `Golem` sind die beiden Muster, mit denen die Sammlung ihre großen Figuren
 * benennt — daneben gibt es `Barbarian_Large`, `Skeleton_Golem`, `FrostGolem`.
 * Wer eine große Figur setzt, die keines von beiden im Namen trägt, bekommt
 * sie in Menschengröße: falsch, aber sichtbar und ohne Folgen für die Physik.
 */
export function shelfHeight(path: string): number {
  return /(_large|golem)/i.test(path) ? SHELF_LARGE_HEIGHT : SHELF_HEIGHT;
}

/**
 * **Die abgeleitete Haut zu einer Figur des Regals** — reine Rechnung aus
 * einer Adresse.
 *
 * Fünfundachtzig Figuren, und keine davon hat jemand von Hand eingetragen: Was
 * eine Haut braucht, steht entweder im Dateinamen (die Beschriftung,
 * `core/kaykitIndex.humanLabel`) oder ist für alle dasselbe. Sie bekommt
 * deshalb die Zahlen eines gewöhnlichen Menschen — Radius 29 cm wie der
 * Zombie, 70 kg, 100 Leben, 1,5 m/s, das Kostenprofil `human` — und das Hirn
 * *Verfolgen*: Wer sich eine Figur in die Welt stellt, will sehen, dass sie
 * läuft, und ein Ritter, der wartet, sieht aus wie einer, der nicht geht.
 *
 * Die Arme hängen (`arms: 'down'`): Der gebaute Körper darunter ist nur das,
 * was in der halben Sekunde bis zur Datei dasteht, und dafür ist die
 * Zombie-Haltung die falsche Aussage.
 */
export function shelfSkin(path: string): NpcSkin {
  return {
    id: shelfKind(path),
    label: humanLabel(path.slice(path.lastIndexOf('/') + 1)),
    icon: 'npc',
    accent: KAYKIT_ACCENT,
    sub: 'Figur aus dem Regal',
    height: shelfHeight(path),
    radius: 0.29,
    mass: 70,
    health: 100,
    speed: 1.5,
    brain: 'chase',
    profile: 'human',
    palette: { skin: 0xd9b271, cloth: 0x8a6b3f, eye: 0x2a2a2a },
    arms: 'down',
    figure: path,
  };
}

/**
 * **Die abgeleiteten Häute, einmal gerechnet.**
 *
 * `npcSkin` wird im Menü je Zeile und in der Brille je Bild gefragt, und eine
 * Haut ist ein Objekt mit einer Palette darin: Ohne diese Karte entstünde bei
 * jedem Aufruf ein neues, und zwei Häute derselben Figur wären nicht mehr
 * dasselbe Objekt — woran sich sonst niemand stört, außer jedem Vergleich mit
 * `===`.
 */
const shelfSkins = new Map<string, NpcSkin>();

/**
 * Die Haut zu einer Sorte — eine der Vorgaben, eine abgeleitete aus dem Regal,
 * oder die erste der Liste, wenn die Sorte Unsinn ist.
 */
export function npcSkin(kind: string | undefined): NpcSkin {
  const builtin = NPC_SKINS.find((skin) => skin.id === kind);
  if (builtin) return builtin;
  const path = shelfPath(kind);
  if (path === null) return NPC_SKINS[0]!;
  let derived = shelfSkins.get(path);
  if (!derived) {
    derived = shelfSkin(path);
    shelfSkins.set(path, derived);
  }
  return derived;
}

/** Wie eine Sorte heißt, ohne dass dafür eine gebaut werden muss. */
export function npcLabel(kind: string | undefined): string {
  return npcSkin(kind).label;
}
