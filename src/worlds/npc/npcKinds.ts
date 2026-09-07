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
export type NpcKind = 'zombie' | 'dummy' | 'hamster';

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
  /** Die drei Farben des Modells: Haut, Kleidung, Augen. */
  palette: { skin: number; cloth: number; eye: number };
  /**
   * Wie die Arme hängen: **vor** dem Körper wie bei einem Zombie oder
   * **neben** ihm wie bei allem anderen. Das ist die eine Silhouette, an der
   * man auf dreißig Meter erkennt, was da kommt.
   */
  arms: 'out' | 'down';
}

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
  },
];

export const NPC_KINDS: readonly NpcKind[] = NPC_SKINS.map((skin) => skin.id);

/** Die Haut zu einer Sorte — die erste der Liste, wenn die Sorte Unsinn ist. */
export function npcSkin(kind: string | undefined): NpcSkin {
  return NPC_SKINS.find((skin) => skin.id === kind) ?? NPC_SKINS[0]!;
}

/** Wie eine Sorte heißt, ohne dass dafür eine gebaut werden muss. */
export function npcLabel(kind: string | undefined): string {
  return npcSkin(kind).label;
}
