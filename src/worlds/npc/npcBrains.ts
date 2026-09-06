import type { MenuIcon } from '../../ui/menu';

/**
 * **Das Hirn** — was ein NPC tut, unabhängig davon, wie er aussieht.
 *
 * Die andere Hälfte der Aufteilung aus `npcKinds.ts`: dort steht die Haut,
 * hier die Logik. Ein Hirn ist dabei nichts weiter als ein **Name plus vier
 * Zahlen**; wie aus diesen Zahlen eine Bewegung wird, steht in `npcBrain.ts`
 * und ist reine Mathematik, die ohne Browser läuft und darum geprüft ist.
 *
 * Drei gibt es, und sie sind die drei Antworten auf „was macht der da?":
 *
 * - **Stehen** — gar nichts. Der Blick folgt dem Spieler, wenn er nahe kommt,
 *   sonst passiert nichts. Das ist die Zielscheibe, die zurückschaut.
 * - **Schlendern** — läuft einen Kurs, bis der Kurs abgelaufen ist, dann einen
 *   neuen. Er sieht den Spieler nicht und will ihn auch nicht.
 * - **Verfolgen** — der Zombie: sobald der Spieler in Sichtweite ist, geht es
 *   auf ihn zu, und in Reichweite wird zugeschlagen. Aus der Sicht heraus
 *   bleibt er stehen.
 *
 * Wer ein viertes hinzufügt, schreibt es hier hin und gibt ihm in
 * `npcBrain.ts` einen Zweig. Das Werkzeug, das Menü und die Werkzeugseite
 * lesen diese Liste.
 */
export type BrainId = 'idle' | 'wander' | 'chase';

/** Die vier Zahlen, mit denen ein Hirn seine Welt vermisst. */
export interface BrainTuning {
  /** Wie schnell es den Körper schiebt, in m/s. */
  speed: number;
  /** Wie schnell es ihn dreht, in Grad je Sekunde. */
  turn: number;
  /** Wie weit es den Spieler bemerkt, in Metern. 0 = gar nicht. */
  sense: number;
  /** Wie nah es heran muss, um zu treffen, in Metern. 0 = schlägt nie zu. */
  reach: number;
  /** Sekunden zwischen zwei Schlägen. */
  cooldown: number;
  /** Wie hart ein Schlag den Getroffenen schiebt, in m/s. */
  punch: number;
}

export interface Brain {
  id: BrainId;
  label: string;
  icon: MenuIcon;
  accent: number;
  /** Was es tut, in einer Zeile. */
  sub: string;
  tuning: BrainTuning;
}

export const BRAINS: readonly Brain[] = [
  {
    id: 'idle',
    label: 'Stehen',
    icon: 'npc',
    accent: 0x9ad9ff,
    sub: 'Bleibt stehen und schaut dir nach',
    tuning: { speed: 0, turn: 90, sense: 8, reach: 0, cooldown: 0, punch: 0 },
  },
  {
    id: 'wander',
    label: 'Schlendern',
    icon: 'teleport',
    accent: 0xffc857,
    sub: 'Läuft einen Kurs, bis ihm ein anderer einfällt',
    tuning: { speed: 0.7, turn: 100, sense: 0, reach: 0, cooldown: 0, punch: 0 },
  },
  {
    id: 'chase',
    label: 'Verfolgen',
    icon: 'zombie',
    accent: 0xff6b6b,
    sub: 'Kommt auf dich zu und schlägt in Reichweite zu',
    tuning: { speed: 1.5, turn: 130, sense: 22, reach: 1.15, cooldown: 1.1, punch: 3.4 },
  },
];

export const BRAIN_IDS: readonly BrainId[] = BRAINS.map((brain) => brain.id);

/** Das Hirn zu einer Id — das erste der Liste, wenn die Id Unsinn ist. */
export function brainOf(id: string | undefined): Brain {
  return BRAINS.find((brain) => brain.id === id) ?? BRAINS[0]!;
}

export function brainLabel(id: string | undefined): string {
  return brainOf(id).label;
}
