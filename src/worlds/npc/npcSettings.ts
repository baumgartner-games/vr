import { BRAIN_IDS, brainOf, type BrainId } from './npcBrains';
import { NPC_KINDS, npcSkin, type NpcKind } from './npcKinds';
import { SPAWNER_DEFAULTS } from './npcSpawn';

/**
 * **Was am Hirn eingestellt ist** — die Zahlen und die zwei Listen, aus denen
 * das Werkzeug einen NPC zusammensetzt.
 *
 * Reine Daten und Beschriftungen, kein three.js: dieselbe Aufteilung wie bei
 * der Drohne (`droneSettings.ts`, `DroneTool`). Gespeichert wird es im
 * Browser wie alles andere an der Ausrüstung (`gearStore.ts`), denn wer sich
 * seinen Zombie einmal eingestellt hat, will ihn nach dem Neuladen nicht noch
 * einmal einstellen.
 *
 * **Haut und Hirn sind zwei Zeilen und nicht eine.** Genau das ist der Punkt
 * der ganzen Kategorie: Wer eine Übungspuppe mit einem Verfolger-Hirn setzt,
 * bekommt eine Puppe, die einem hinterherläuft, und wer einen Zombie mit
 * „Stehen" setzt, bekommt eine grüne Zielscheibe.
 *
 * **Tempo und Leben sind absolut**, keine Faktoren: sie stehen so am Menü, wie
 * sie später gelten. Damit sie trotzdem zu dem passen, was man gerade
 * ausgesucht hat, ziehen sie mit — eine neue Haut bringt ihr Leben mit, ein
 * neues Hirn sein Tempo (`withKind`, `withBrain`). Wer danach an einer der
 * beiden Zahlen dreht, hat sie selbst gesetzt, und dann bleibt sie stehen.
 */

/** Was der Trigger des Hirns in der Welt tut. */
export type NpcMode = 'npc' | 'point' | 'cage' | 'clear';

export interface NpcSettings {
  /** Die Haut (`npcKinds.ts`). */
  kind: NpcKind;
  /** Das Hirn (`npcBrains.ts`). */
  brain: BrainId;
  /** Was der Trigger setzt. */
  mode: NpcMode;
  /** Tempo des Gesetzten, in m/s. */
  speed: number;
  /** Leben des Gesetzten. */
  health: number;
  /** Takt eines gesetzten Brutkäfigs, in Sekunden. */
  interval: number;
  /** Wie viele Kinder ein Brutkäfig gleichzeitig am Leben hält. */
  max: number;
}

export const DEFAULT_NPC: NpcSettings = {
  kind: 'zombie',
  brain: 'chase',
  mode: 'npc',
  speed: brainOf('chase').tuning.speed,
  health: npcSkin('zombie').health,
  interval: SPAWNER_DEFAULTS.interval,
  max: SPAWNER_DEFAULTS.max,
};

export const NPC_MODES: ReadonlyArray<{ id: NpcMode; label: string; sub: string }> = [
  { id: 'npc', label: 'NPC', sub: 'Trigger setzt einen dorthin, wo du hinzeigst' },
  { id: 'point', label: 'Spawnpunkt', sub: 'Eine Stelle, an der später welche auftauchen' },
  {
    id: 'cage',
    label: 'Brutkäfig',
    sub: 'Legt von selbst nach — auf den Spawnpunkten, solange du in der Nähe bist',
  },
  { id: 'clear', label: 'Entfernen', sub: 'Trigger nimmt weg, worauf du zeigst' },
];

export const NPC_MODE_IDS: readonly NpcMode[] = NPC_MODES.map((mode) => mode.id);

export function npcModeLabel(mode: NpcMode): string {
  return NPC_MODES.find((entry) => entry.id === mode)?.label ?? mode;
}

/** Eine Zahl, die im Menü verstellt wird, samt dem Bereich, der Sinn ergibt. */
export interface NpcField {
  key: 'speed' | 'health' | 'interval' | 'max';
  label: string;
  unit: string;
  min: number;
  max: number;
  decimals: number;
  sub: string;
  steps: readonly number[];
}

export const NPC_FIELDS: readonly NpcField[] = [
  {
    key: 'speed',
    label: 'Tempo',
    unit: 'm/s',
    min: 0,
    max: 8,
    decimals: 1,
    sub: 'Wie schnell er läuft — 0 heißt: gar nicht',
    steps: [0, 0.7, 1.1, 1.5, 2.2, 3.2, 4.5],
  },
  {
    key: 'health',
    label: 'Leben',
    unit: '',
    min: 1,
    max: 2000,
    decimals: 0,
    sub: 'Was er einsteckt, bevor er umfällt',
    steps: [40, 100, 160, 260, 500],
  },
  {
    key: 'interval',
    label: 'Käfig-Takt',
    unit: 's',
    min: 0.5,
    max: 120,
    decimals: 1,
    sub: 'Sekunden zwischen zwei Kindern eines Käfigs',
    steps: [2, 4, 6, 10, 20],
  },
  {
    key: 'max',
    label: 'Käfig-Grenze',
    unit: '',
    min: 1,
    max: 20,
    decimals: 0,
    sub: 'Wie viele Kinder ein Käfig gleichzeitig hält',
    steps: [1, 2, 3, 5, 8],
  },
];

/**
 * Eine Zahl in ihrem Bereich und auf die Stellen gerundet, mit denen sie
 * gezeigt wird. Was keine Zahl ist, fällt auf den Auslieferungswert zurück und
 * nicht auf das Minimum — ein alter Speicher, der dieses Feld noch gar nicht
 * kannte, soll keinen Zombie ohne Leben ergeben.
 */
export function clampNpcField(field: NpcField, value: number | undefined): number {
  if (!Number.isFinite(value)) return DEFAULT_NPC[field.key];
  const factor = 10 ** field.decimals;
  return Math.round(Math.min(field.max, Math.max(field.min, value as number)) * factor) / factor;
}

/** Die nächste Raste über dem Wert, oben angekommen wieder von vorne. */
export function nextNpcStep(field: NpcField, value: number): number {
  return field.steps.find((step) => step > value + 1e-9) ?? field.steps[0]!;
}

/** Wie die Zahl auf der Zeile steht. */
export function npcFieldLabel(field: NpcField, value: number): string {
  const text = value.toFixed(field.decimals);
  return field.unit ? `${text} ${field.unit}` : text;
}

/** Eine Einstellung, in der jede Zahl und jede Id stimmt. */
export function clampNpc(settings: Partial<NpcSettings> | undefined): NpcSettings {
  const next = { ...DEFAULT_NPC, ...settings };
  if (!NPC_KINDS.includes(next.kind)) next.kind = DEFAULT_NPC.kind;
  if (!BRAIN_IDS.includes(next.brain)) next.brain = DEFAULT_NPC.brain;
  if (!NPC_MODE_IDS.includes(next.mode)) next.mode = DEFAULT_NPC.mode;
  for (const field of NPC_FIELDS) next[field.key] = clampNpcField(field, next[field.key]);
  return next;
}

/** Die nächste Haut, und ihr Leben zieht mit. */
export function withKind(settings: NpcSettings, kind: NpcKind): NpcSettings {
  return clampNpc({ ...settings, kind, health: npcSkin(kind).health });
}

/** Das nächste Hirn, und sein Tempo zieht mit. */
export function withBrain(settings: NpcSettings, brain: BrainId): NpcSettings {
  return clampNpc({ ...settings, brain, speed: brainOf(brain).tuning.speed });
}

/** Der nächste Eintrag einer Liste, hinten angekommen wieder der erste. */
export function nextIn<T>(list: readonly T[], current: T): T {
  const at = list.indexOf(current);
  return list[(at + 1) % list.length]!;
}
