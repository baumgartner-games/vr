/**
 * **Wie die Station ausgeleuchtet ist — als Schalttafel und nicht als Zufall.**
 *
 * In der Bot-Runde schaut man zu, und Zuschauen heißt: Man will dieselbe
 * Szene einmal hell sehen, um zu verstehen, was passiert, und einmal dunkel,
 * um zu sehen, wie sie sich anfühlt. Bis eben ging das nur über „Testlicht
 * an/aus", also über einen Schalter mit zwei Stellungen.
 *
 * Hier stehen vier: Deckenlampen, Notlicht, Alarm und die Grundhelligkeit.
 * Der Alarm ist dabei kein Farbfilter, sondern **Leuchten**: rote Drehspiegel
 * in den Gängen, jeder mit eigenem Versatz, dazu ein langsames Pulsen. Wer
 * einmal in einem Gang stand, während sich so ein Ding dreht, weiß, warum
 * dieser Schalter existiert.
 */

export interface BotLighting {
  /** Die Deckenlampen der Räume. */
  lamps: boolean;
  /** Die roten Drehleuchten in den Gängen. */
  alarm: boolean;
  /** Notlicht statt voller Beleuchtung: dunkler, kälter, überall gleich. */
  emergency: boolean;
  /** Grundhelligkeit von 0 bis 1. */
  ambient: number;
}

export const DEFAULT_LIGHTING: BotLighting = {
  lamps: true,
  alarm: false,
  emergency: false,
  ambient: 0.55,
};

export interface LightingPreset {
  id: string;
  label: string;
  lighting: BotLighting;
}

/** Vier Stellungen, die man auf einer Schaltfläche wiedererkennt. */
export const LIGHTING_PRESETS: readonly LightingPreset[] = [
  {
    id: 'bright',
    label: 'Volle Beleuchtung',
    lighting: { lamps: true, alarm: false, emergency: false, ambient: 0.75 },
  },
  {
    id: 'watch',
    label: 'Wachbetrieb',
    lighting: { lamps: true, alarm: false, emergency: false, ambient: 0.4 },
  },
  {
    id: 'alarm',
    label: 'Alarmbeleuchtung',
    lighting: { lamps: true, alarm: true, emergency: true, ambient: 0.28 },
  },
  {
    id: 'blackout',
    label: 'Notstrom / dunkel',
    lighting: { lamps: false, alarm: true, emergency: true, ambient: 0.06 },
  },
];

export function clampLighting(value: unknown): BotLighting {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const ambient =
    typeof raw.ambient === 'number' && Number.isFinite(raw.ambient)
      ? raw.ambient
      : DEFAULT_LIGHTING.ambient;
  return {
    lamps: raw.lamps === undefined ? DEFAULT_LIGHTING.lamps : raw.lamps === true,
    alarm: raw.alarm === true,
    emergency: raw.emergency === true,
    ambient: Math.min(1, Math.max(0, ambient)),
  };
}

/** Die Stellung, die zu diesen Werten passt — für die Beschriftung. */
export function lightingPreset(lighting: BotLighting): LightingPreset {
  return (
    LIGHTING_PRESETS.find(
      (preset) =>
        preset.lighting.lamps === lighting.lamps &&
        preset.lighting.alarm === lighting.alarm &&
        preset.lighting.emergency === lighting.emergency &&
        Math.abs(preset.lighting.ambient - lighting.ambient) < 0.02,
    ) ?? { id: 'custom', label: 'Eigene Beleuchtung', lighting }
  );
}

/** Die nächste Stellung im Kreis. */
export function nextLighting(lighting: BotLighting): BotLighting {
  const at = LIGHTING_PRESETS.findIndex((preset) => preset.id === lightingPreset(lighting).id);
  return { ...LIGHTING_PRESETS[(at + 1) % LIGHTING_PRESETS.length]!.lighting };
}

/** Wie schnell sich eine Drehleuchte dreht, in Umdrehungen je Sekunde. */
export const BEACON_TURNS = 0.42;

/**
 * Der Winkel eines Drehspiegels, in Radiant.
 *
 * Er läuft **im Kreis** und wächst nicht weiter: Ein Winkel, der nach einer
 * Stunde bei zehntausend steht, verliert in `float`-Genauigkeit sein Ruckeln
 * nicht mehr, und dann steht der Spiegel plötzlich still.
 */
export function beaconAngle(time: number, offset = 0): number {
  const turns = (time * BEACON_TURNS + offset) % 1;
  return (turns < 0 ? turns + 1 : turns) * Math.PI * 2;
}

/**
 * Wie hell eine blinkende Warnleuchte gerade ist, von 0 bis 1.
 *
 * Langsam und weich, nicht als Blitz: Ein hartes An/Aus im Gang liest das
 * Auge als Fehler in der Anzeige; ein Aufglühen und Verlöschen liest es als
 * Alarm.
 */
export function alarmPulse(time: number, offset = 0): number {
  const phase = Math.sin((time * 0.8 + offset) * Math.PI * 2);
  return Math.max(0, phase) ** 1.6;
}
