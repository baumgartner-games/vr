import type { Handedness } from '../../core/XRInput';

/**
 * Der Tisch im Eingaberaum, und was darauf liegt.
 *
 * Eine Handhaltung im Leeren einzustellen ist Raten: man hält die Hand
 * irgendwo in der Luft, dreht sie ein bisschen und hat hinterher keine
 * Ahnung, ob es an der Haltung lag oder daran, dass der Arm anders stand.
 * Ein **Tisch** löst das, weil er eine Wahrheit hat, die man anfassen kann:
 * die echte Hand liegt auf der echten Tischplatte, die Geisterhand liegt auf
 * der virtuellen, und was dazwischen nicht passt, ist genau die Zahl, die
 * verstellt gehört.
 *
 * Deshalb ist die **Höhe in Zentimetern** die wichtigste Einstellung hier:
 * sie muss auf den Tisch passen, an dem man tatsächlich sitzt, und einen
 * Tisch schätzt man nicht, den misst man. Der Rest sagt, *was* daraufliegt —
 * eine Hand oder ein Controller, links oder rechts — und wie es liegt.
 *
 * Reine Zahlen und ein bisschen Speicher, kein three.js: was daraus für ein
 * Möbelstück wird, steht in `GhostTable.ts`.
 */

/** Was auf dem Tisch liegt. */
export type GhostKind = 'hand' | 'controller';

export interface TableSettings {
  /** Höhe der Tischplatte über dem Boden, in Zentimetern. */
  height: number;
  kind: GhostKind;
  /** Welche der beiden dort liegt. */
  side: Handedness;
  /** Wie das Ding auf der Platte liegt, in Grad. */
  pitch: number;
  yaw: number;
  roll: number;
  /** Wo auf der Platte es liegt, in Zentimetern von der Mitte. */
  x: number;
  z: number;
}

export const DEFAULT_TABLE: TableSettings = {
  height: 74,
  kind: 'hand',
  side: 'right',
  // Flach auf der Platte, Finger vom Betrachter weg.
  pitch: -90,
  yaw: 0,
  roll: 0,
  x: 0,
  z: 0,
};

/** Eine Zahl, die im Raum verstellt wird, samt dem Bereich, der Sinn ergibt. */
export interface TableField {
  key: 'height' | 'pitch' | 'yaw' | 'roll' | 'x' | 'z';
  label: string;
  unit: string;
  min: number;
  max: number;
  sub: string;
}

export const TABLE_FIELDS: readonly TableField[] = [
  {
    key: 'height',
    label: 'Tischhöhe',
    unit: 'cm',
    min: 20,
    max: 140,
    sub: 'So hoch wie der Tisch, an dem du sitzt',
  },
  { key: 'pitch', label: 'Neigung', unit: '°', min: -180, max: 180, sub: 'Kippen nach vorn' },
  { key: 'yaw', label: 'Drehung', unit: '°', min: -180, max: 180, sub: 'Um die Senkrechte' },
  { key: 'roll', label: 'Rollen', unit: '°', min: -180, max: 180, sub: 'Um die eigene Achse' },
  { key: 'x', label: 'Quer', unit: 'cm', min: -40, max: 40, sub: 'Nach links und rechts' },
  { key: 'z', label: 'Längs', unit: 'cm', min: -30, max: 30, sub: 'Nach vorn und hinten' },
];

/** Ein Einstellungsobjekt, bei dem jeder Wert erlaubt ist. */
export function clampTable(settings: Partial<TableSettings> | undefined): TableSettings {
  const next = { ...DEFAULT_TABLE, ...settings };
  for (const field of TABLE_FIELDS) {
    const value = next[field.key];
    next[field.key] = Number.isFinite(value)
      ? Math.round(Math.min(field.max, Math.max(field.min, value)) * 10) / 10
      : DEFAULT_TABLE[field.key];
  }
  if (next.kind !== 'hand' && next.kind !== 'controller') next.kind = DEFAULT_TABLE.kind;
  if (next.side !== 'left' && next.side !== 'right') next.side = DEFAULT_TABLE.side;
  return next;
}

// --- der Speicher ----------------------------------------------------------

const KEY = 'bgvr.tuneTable';

type Listener = () => void;

const listeners = new Set<Listener>();

/** Wird nach jeder Änderung gerufen, damit der Raum sich nachzieht. */
export function onTableChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function tableSettings(): TableSettings {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    return clampTable(raw ? (JSON.parse(raw) as Partial<TableSettings>) : {});
  } catch {
    // Privater Modus, kein Speicher, kaputtes JSON — nichts davon ist einen
    // Absturz wert.
    return clampTable({});
  }
}

/** Ändert, was übergeben wird, und lässt den Rest stehen. */
export function saveTableSettings(settings: Partial<TableSettings>): TableSettings {
  const next = clampTable({ ...tableSettings(), ...settings });
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(next));
  } catch {
    /* siehe oben */
  }
  for (const listener of listeners) listener();
  return next;
}

export function clearTableSettings(): TableSettings {
  return saveTableSettings({ ...DEFAULT_TABLE });
}

/** Wie eine Zahl auf einem Schild steht. */
export function tableFieldLabel(field: TableField, value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} ${field.unit}`;
}
