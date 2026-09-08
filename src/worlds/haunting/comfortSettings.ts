export const COMFORT_TURNS = ['snap30', 'snap45', 'smooth45', 'smooth60', 'smooth90'] as const;
export type ComfortTurn = (typeof COMFORT_TURNS)[number];
export type ComfortVignette = 'off' | 'soft' | 'strong';

export interface ComfortSettings {
  turn: ComfortTurn;
  vignette: ComfortVignette;
  haptics: boolean;
}

export const DEFAULT_COMFORT: Readonly<ComfortSettings> = {
  turn: 'snap30',
  vignette: 'soft',
  haptics: true,
};

export const COMFORT_TURN_LABELS: Record<ComfortTurn, string> = {
  snap30: 'Schrittweise · 30°',
  snap45: 'Schrittweise · 45°',
  smooth45: 'Fließend · 45°/s',
  smooth60: 'Fließend · 60°/s',
  smooth90: 'Fließend · 90°/s',
};

export function comfortSettings(value: unknown): ComfortSettings {
  const data = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    turn: COMFORT_TURNS.includes(data.turn as ComfortTurn)
      ? (data.turn as ComfortTurn)
      : DEFAULT_COMFORT.turn,
    vignette:
      data.vignette === 'off' || data.vignette === 'soft' || data.vignette === 'strong'
        ? data.vignette
        : DEFAULT_COMFORT.vignette,
    haptics: typeof data.haptics === 'boolean' ? data.haptics : DEFAULT_COMFORT.haptics,
  };
}

/** The artificial-motion border leaves the central view completely clear. */
export function comfortVignetteTarget(
  mode: ComfortVignette,
  speed: number,
  turning: boolean,
): number {
  if (mode === 'off') return 0;
  const motion = Math.max(turning ? 0.8 : 0, Math.max(0, Number.isFinite(speed) ? speed : 0) / 2.6);
  return Math.min(1, motion) * (mode === 'strong' ? 0.86 : 0.52);
}

/** Fast onset, gentle release, independent of 72/90/120 Hz headset timing. */
export function stepComfortVignette(current: number, target: number, dt: number): number {
  const value = Number.isFinite(current) ? Math.min(1, Math.max(0, current)) : 0;
  const goal = Number.isFinite(target) ? Math.min(1, Math.max(0, target)) : 0;
  const time = Number.isFinite(dt) ? Math.min(0.1, Math.max(0, dt)) : 0;
  return value + (goal - value) * (1 - Math.exp(-(goal > value ? 14 : 6) * time));
}

export type ComfortCue = 'interact' | 'door' | 'tool' | 'error' | 'success';

/** Deliberately short pulses: feedback belongs to a completed action. */
export const COMFORT_HAPTICS: Readonly<
  Record<ComfortCue, { intensity: number; milliseconds: number }>
> = {
  interact: { intensity: 0.16, milliseconds: 18 },
  door: { intensity: 0.28, milliseconds: 32 },
  tool: { intensity: 0.3, milliseconds: 25 },
  error: { intensity: 0.38, milliseconds: 45 },
  success: { intensity: 0.45, milliseconds: 70 },
};
