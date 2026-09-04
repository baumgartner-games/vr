/**
 * Every number the pistol runs on, in one place.
 *
 * The menu used to step through a handful of fixed notches and that was the
 * whole story — you could pick "stark" but never find out what "stark" was,
 * and never ask for anything in between. So the notches stay (they are quick,
 * and they are good starting points) but the raw value is shown next to them
 * and can be typed in directly. Anything the field descriptors below allow is
 * a legal setting, notch or not.
 *
 * Pure numbers and labels: no three.js, so the clamping and the stepping are
 * tested rather than hoped for.
 */

/** How the trigger behaves. */
export type FireMode = 'single' | 'burst' | 'auto';

/** What leaves the barrel. */
export type AmmoKind = 'normal' | 'tracer';

/** What can sit on top of the gun. `none` is the "take everything off" cell. */
export type SightKind = 'none' | 'reddot' | 'irons' | 'trace' | 'xray' | 'scope';

/** The aiming aids that are real attachments, in the order they are stored. */
export const SIGHT_KINDS: readonly SightKind[] = ['reddot', 'irons', 'trace', 'xray', 'scope'];

export interface WeaponSettings {
  /** Kilograms per round — the punch is mass times speed. */
  mass: number;
  /** Muzzle velocity in m/s. */
  speed: number;
  /** Rounds per second. */
  rate: number;
  /** Rounds in a full magazine. */
  magazine: number;
  /** Seconds a reload takes. */
  reload: number;
  /** Rounds a burst fires. */
  burst: number;
  mode: FireMode;
  ammo: AmmoKind;
  /** What the telescopic sight magnifies by; 1 is the naked eye. */
  zoom: number;
  /**
   * Everything clipped onto the rail at once — a red dot *and* the trajectory
   * line is a perfectly sensible thing to want, and each one carries its own
   * pose, so they never fight over the same spot.
   */
  sights: SightKind[];
}

export const DEFAULT_WEAPON: WeaponSettings = {
  mass: 0.06,
  speed: 26,
  rate: 5,
  magazine: 12,
  reload: 1.15,
  burst: 3,
  mode: 'single',
  ammo: 'normal',
  zoom: 16,
  sights: [],
};

/** The notches the menu steps through, each with the name it goes by. */
export const POWER_STEPS = [
  { label: 'leicht', mass: 0.03 },
  { label: 'normal', mass: 0.06 },
  { label: 'stark', mass: 0.14 },
  { label: 'brutal', mass: 0.3 },
] as const;

export const SPEED_STEPS = [14, 26, 45, 70, 120] as const;
/** Rounds per second. */
export const RATE_STEPS = [2, 5, 9, 14, 20] as const;
/** Magazine sizes, from a revolver's worth to a belt. */
export const MAGAZINE_STEPS = [6, 12, 17, 30, 60, 100] as const;
export const RELOAD_STEPS = [0.4, 0.8, 1.15, 2] as const;
export const BURST_STEPS = [2, 3, 5] as const;
/**
 * The notches on the scope's ring.
 *
 * They start where a rifle scope is actually useful and not where a pair of
 * opera glasses is: in the headset a 4× scope looks like a magnifying glass
 * held at arm's length, because the picture in the tube is already a metre
 * away and the eye has the whole room for comparison. 16× is the setting that
 * reads as "scope" in VR, so it is the one the gun comes with, and the ring
 * goes up from there in the four-times steps a real turret is engraved with.
 */
export const ZOOM_STEPS = [16, 20, 24, 28, 32, 36] as const;

export const FIRE_MODES: readonly FireMode[] = ['single', 'burst', 'auto'];

export const FIRE_MODE_LABELS: Record<FireMode, string> = {
  single: 'Einzelfeuer',
  burst: 'Dreifachschuss',
  auto: 'Automatik',
};

export const AMMO_LABELS: Record<AmmoKind, string> = {
  normal: 'Normal',
  tracer: 'Leuchtspur',
};

export const AMMO_KINDS: readonly AmmoKind[] = ['normal', 'tracer'];

/** What the aiming-aid grid offers, in the order it shows them. */
export const SIGHTS: ReadonlyArray<{
  id: SightKind;
  label: string;
  /** The line that appears over the menu while the cell is looked at. */
  caption: string;
}> = [
  { id: 'none', label: 'Alles ab', caption: 'Nimmt jede Zielhilfe von der Waffe' },
  { id: 'reddot', label: 'Rotpunkt', caption: 'Roter Punkt, schwebt über der Waffe' },
  { id: 'irons', label: 'Kimme & Korn', caption: 'Kimme hinten, Korn vorn — klassisch' },
  { id: 'trace', label: 'Flugbahn', caption: 'Zeigt die Bahn der Kugel voraus' },
  { id: 'xray', label: 'Röntgen', caption: 'Röntgengerät auf der Waffe: sieht durch Wände' },
  { id: 'scope', label: 'Fernrohr', caption: 'Zielfernrohr mit echtem Zoom — Stufe unter „Zoom“' },
];

/** One value the player may type in, with the range that still makes sense. */
export interface WeaponField {
  key: keyof WeaponSettings;
  label: string;
  unit: string;
  min: number;
  max: number;
  /** Decimals the display and the keypad keep. */
  decimals: number;
  /** What the number does, one line. */
  sub: string;
}

export const WEAPON_FIELDS: readonly WeaponField[] = [
  {
    key: 'mass',
    label: 'Stärke',
    unit: 'kg',
    min: 0.001,
    max: 5,
    decimals: 3,
    sub: 'Masse der Kugel — wie hart sie zuschlägt',
  },
  { key: 'speed', label: 'Tempo', unit: 'm/s', min: 1, max: 400, decimals: 1, sub: 'Mündungsgeschwindigkeit' },
  { key: 'rate', label: 'Feuerrate', unit: '/s', min: 0.2, max: 40, decimals: 1, sub: 'Schuss pro Sekunde' },
  { key: 'magazine', label: 'Magazin', unit: 'Schuss', min: 1, max: 300, decimals: 0, sub: 'Rundenanzahl bis zum Nachladen' },
  { key: 'reload', label: 'Nachladezeit', unit: 's', min: 0.05, max: 10, decimals: 2, sub: 'Wie lange das Magazin braucht' },
  { key: 'burst', label: 'Salve', unit: 'Schuss', min: 1, max: 20, decimals: 0, sub: 'Wie viele der Dreifachschuss abgibt' },
  {
    key: 'zoom',
    label: 'Zoom',
    unit: '×',
    min: 1,
    max: 60,
    decimals: 1,
    sub: 'Vergrößerung des Fernrohrs',
  },
];

/** Every value inside its range, and the names spelled correctly. */
export function clampWeapon(
  settings: Partial<WeaponSettings> & { sight?: SightKind },
): WeaponSettings {
  const next: WeaponSettings = { ...DEFAULT_WEAPON, ...settings };
  for (const field of WEAPON_FIELDS) {
    next[field.key] = clampField(field, next[field.key] as number) as never;
  }
  if (!FIRE_MODES.includes(next.mode)) next.mode = DEFAULT_WEAPON.mode;
  if (!AMMO_KINDS.includes(next.ammo)) next.ammo = DEFAULT_WEAPON.ammo;
  // A single `sight` is how one aiming aid used to be stored; a browser that
  // still holds one of those must not lose it.
  next.sights = normalizeSights(settings.sights ?? (settings.sight ? [settings.sight] : next.sights));
  return next;
}

/** Known aids, each at most once, in the order the grid lists them. */
export function normalizeSights(sights: readonly SightKind[] | undefined): SightKind[] {
  if (!Array.isArray(sights)) return [];
  return SIGHT_KINDS.filter((kind) => sights.includes(kind));
}

/** The same list with one aid switched on or off; `none` clears the lot. */
export function toggleSight(sights: readonly SightKind[], kind: SightKind): SightKind[] {
  if (kind === 'none') return [];
  return normalizeSights(
    sights.includes(kind) ? sights.filter((entry) => entry !== kind) : [...sights, kind],
  );
}

/** What the menu writes next to "Zielhilfen". */
export function sightsLabel(sights: readonly SightKind[]): string {
  if (sights.length === 0) return 'keine';
  return sights
    .map((kind) => SIGHTS.find((sight) => sight.id === kind)?.label ?? kind)
    .join(' + ');
}

/** One value inside its range and rounded to the decimals it is shown with. */
export function clampField(field: WeaponField, value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_WEAPON[field.key] as number;
  const factor = 10 ** field.decimals;
  return Math.round(Math.min(field.max, Math.max(field.min, value)) * factor) / factor;
}

/**
 * The next notch above the value the gun is set to, wrapping around at the top.
 *
 * A value typed in by hand rarely sits on a notch, and "the next one up" is
 * what a player pressing the row expects — not "the notch after the one that
 * happens to be nearest".
 */
export function nextStep(steps: readonly number[], value: number): number {
  return steps.find((step) => step > value + 1e-9) ?? steps[0]!;
}

/** How the magnification reads: "4×", and 2.5 stays 2.5×. */
export function zoomLabel(zoom: number): string {
  return `${Number.isInteger(zoom) ? zoom : zoom.toFixed(1)}×`;
}

/** The name of the notch a mass is at, or the raw figure when it is between. */
export function powerLabel(mass: number): string {
  const step = POWER_STEPS.find((entry) => Math.abs(entry.mass - mass) < 1e-9);
  return step ? step.label : `${mass} kg`;
}

/** The mass of the notch after the current one. */
export function nextPower(mass: number): number {
  return nextStep(
    POWER_STEPS.map((step) => step.mass),
    mass,
  );
}

/** Steps a list of names round by one. */
export function nextIn<T>(values: readonly T[], value: T): T {
  const index = values.indexOf(value);
  return values[(index + 1) % values.length]!;
}
