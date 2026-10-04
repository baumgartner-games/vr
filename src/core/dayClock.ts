/**
 * **Der Tageslauf einer Welt** — wie die Uhrzeit voranschreitet. Reine
 * Rechnung, ohne three.js.
 *
 * Gewünscht: _„Restaurant-Runde, die von selbst Abend wird, bitte auch. Ggf.
 * bei einer Welt eingeben wie der Tag voranschreiten soll. Automatisch,
 * inkrementel, oder programmatisch (z. B. tagsüber alle kunden, nach
 * ladenschluss nacht)"_. Genau diese drei, und der Stand von vorher:
 *
 * - **Fest** — die Tageszeit aus _Grafik → Wetter → Tageszeit_, wie bisher.
 * - **Automatisch** — die Uhr läuft fließend, ein Tag dauert `minutes` Minuten.
 * - **Schrittweise** — alle `minutes` Minuten der nächste Abschnitt: Tag,
 *   Abend, Nacht, wieder Tag.
 * - **Vom Spiel** — die Welt bestimmt die Uhrzeit (`DayDriver`): Im Restaurant
 *   ist es Tag, solange geöffnet ist, nach Ladenschluss wird es Abend und Nacht.
 *
 * Eingestellt wird es je Welt (_Welten → … → Tageslauf_, `GridWorld`) und in
 * ihrer Weltdatei gespeichert (`WorldFile.day`). Die Uhrzeit treibt das Licht
 * (`weather.weatherLook`, fließend statt in drei Stufen) und die Lampen
 * (`core/Lamps.ts`: an, sobald es Abend wird).
 */

export type DayMode = 'fixed' | 'cycle' | 'steps' | 'game';
export const DAY_MODES = ['fixed', 'cycle', 'steps', 'game'] as const;
export const DAY_MODE_LABELS: Readonly<Record<DayMode, string>> = {
  fixed: 'Fest',
  cycle: 'Automatisch',
  steps: 'Schrittweise',
  game: 'Vom Spiel',
};
export const DAY_MODE_SUBS: Readonly<Record<DayMode, string>> = {
  fixed: 'Die Tageszeit aus Grafik → Wetter, sie bleibt stehen',
  cycle: 'Die Uhr läuft fließend — Morgen, Mittag, Abend, Nacht',
  steps: 'Tag → Abend → Nacht → Tag, jeweils nach der eingestellten Zeit',
  game: 'Die Welt bestimmt die Uhrzeit',
};

/** Die wählbaren Minuten — Tageslänge, Schrittlänge oder Öffnungszeit, je nach Ablauf. */
export const DAY_MINUTES = [1, 2, 5, 10, 20, 40] as const;

/** So steht es in der Weltdatei. */
export interface DaySettings {
  mode: DayMode;
  /** Automatisch: ein ganzer Tag · Schrittweise: ein Abschnitt · Vom Spiel: was die Welt daraus macht. */
  minutes: number;
}

/**
 * **Wenn die Welt die Uhr stellt** — `hour` bekommt die Sekunden seit dem
 * Laden und gibt die Uhrzeit und einen Satz dazu zurück ("Geöffnet",
 * "Ladenschluss").
 */
export interface DayDriver {
  /** Wie der Ablauf _Vom Spiel_ in dieser Welt heißt, z. B. „Öffnungszeiten". */
  readonly label: string;
  readonly sub: string;
  /** Wie die Minuten in dieser Welt heißen, z. B. „Öffnungszeit". */
  readonly minutesLabel: string;
  hour(seconds: number, settings: DaySettings): { hour: number; status: string };
}

/** Die Abschnitte für _Schrittweise_ — Tag, Abend, Nacht. */
const STEPS = [10, 18.5, 23] as const;

/** Liest den Abschnitt aus einer Datei — Kaputtes fällt weg. */
export function cleanDay(raw: unknown): DaySettings | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const value = raw as Record<string, unknown>;
  const mode = DAY_MODES.includes(value['mode'] as DayMode) ? (value['mode'] as DayMode) : null;
  const minutes = DAY_MINUTES.includes(value['minutes'] as (typeof DAY_MINUTES)[number])
    ? (value['minutes'] as number)
    : null;
  if (!mode) return undefined;
  return { mode, minutes: minutes ?? 10 };
}

/** **Welcher Abschnitt** um diese Uhrzeit ist — für die Lampen und das Menü. */
export function dayPhaseAt(hour: number): 'day' | 'dusk' | 'night' {
  const h = ((hour % 24) + 24) % 24;
  if (h >= 7 && h < 17.5) return 'day';
  if ((h >= 17.5 && h < 20.5) || (h >= 5 && h < 7)) return 'dusk';
  return 'night';
}

/**
 * **Wie viel Tag, Abend und Nacht** um diese Uhrzeit im Licht steckt — drei
 * Gewichte, zusammen 1, weich übergeblendet: Tag bis 16:30, Abend um 18:30,
 * Nacht ab 20:30 bis 4:30, Dämmerung um 6, Tag ab 8.
 */
export function dayMix(hour: number): { day: number; dusk: number; night: number } {
  const h = ((hour % 24) + 24) % 24;
  const ramp = (a: number, b: number, x: number): number => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  if (h >= 8 && h < 16.5) return { day: 1, dusk: 0, night: 0 };
  if (h >= 16.5 && h < 18.5) {
    const t = ramp(16.5, 18.5, h);
    return { day: 1 - t, dusk: t, night: 0 };
  }
  if (h >= 18.5 && h < 20.5) {
    const t = ramp(18.5, 20.5, h);
    return { day: 0, dusk: 1 - t, night: t };
  }
  if (h >= 4.5 && h < 6) {
    const t = ramp(4.5, 6, h);
    return { day: 0, dusk: t, night: 1 - t };
  }
  if (h >= 6 && h < 8) {
    const t = ramp(6, 8, h);
    return { day: t, dusk: 1 - t, night: 0 };
  }
  return { day: 0, dusk: 0, night: 1 };
}

/** Eine Uhrzeit zum Lesen: `14:05`. */
export function clockText(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  const minutes = Math.floor((h % 1) * 60);
  return `${Math.floor(h)}:${String(minutes).padStart(2, '0')}`;
}

type Listener = () => void;

/**
 * **Die eine Uhr der geladenen Welt** — wie das Lampenbuch (`lampBook`): Die
 * Welt lädt ihren Ablauf (`load`), die App lässt die Uhr laufen (`tick`), das
 * Licht und die Lampen lesen die Uhrzeit.
 */
export class DayClock {
  settings: DaySettings = { mode: 'fixed', minutes: 10 };
  /** Was die Welt ab Werk will — gespeichert wird nur, was davon abweicht. */
  private defaults: DaySettings = { mode: 'fixed', minutes: 10 };
  /** Die Uhrzeit, 0–24. */
  hour = 12;
  /** Was die Welt gerade dazu sagt („Geöffnet") — leer, wenn nichts. */
  status = '';
  private driver: DayDriver | null = null;
  private seconds = 0;
  private stepSeconds = 0;
  private owner: unknown = null;
  private readonly listeners = new Set<Listener>();

  /** Ob die Uhr das Licht bestimmt — sonst gilt die Tageszeit aus dem Wetter-Menü. */
  get active(): boolean {
    if (this.settings.mode === 'fixed') return false;
    return this.settings.mode !== 'game' || this.driver !== null;
  }

  /** Abend oder Nacht — dann brennen die Lampen, die bei Nacht brennen. */
  get night(): boolean {
    return dayPhaseAt(this.hour) !== 'day';
  }

  /** Was die Welt für _Vom Spiel_ anbietet — `null`: nichts. */
  get gameDriver(): DayDriver | null {
    return this.driver;
  }

  /** **Den Ablauf einer Welt übernehmen** — gespeichert, sonst ihr Standard. */
  load(
    saved: DaySettings | undefined,
    owner: unknown,
    defaults: DaySettings,
    driver: DayDriver | null,
  ): void {
    this.owner = owner;
    this.defaults = defaults;
    this.settings = { ...(saved ?? defaults) };
    this.driver = driver;
    this.seconds = 0;
    this.stepSeconds = 0;
    this.status = '';
    this.hour = this.settings.mode === 'steps' ? STEPS[0] : 9;
    if (this.settings.mode === 'game' && driver) this.applyDriver();
  }

  /** Die Welt geht: Gehört ihr die Uhr noch, steht sie wieder fest. */
  release(owner: unknown): void {
    if (this.owner !== owner) return;
    this.owner = null;
    this.settings = { mode: 'fixed', minutes: 10 };
    this.defaults = { ...this.settings };
    this.driver = null;
    this.status = '';
  }

  /** Was in die Datei kommt — `undefined`, wenn es der Standard der Welt ist. */
  save(): DaySettings | undefined {
    const same =
      this.settings.mode === this.defaults.mode && this.settings.minutes === this.defaults.minutes;
    return same ? undefined : { ...this.settings };
  }

  ownedBy(owner: unknown): boolean {
    return this.owner === owner;
  }

  /** Den Ablauf ändern — meldet es, damit die Welt speichert. */
  set(patch: Partial<DaySettings>): void {
    const before = this.settings.mode;
    this.settings = { ...this.settings, ...patch };
    if (this.settings.mode !== before) {
      this.seconds = 0;
      this.stepSeconds = 0;
      if (this.settings.mode === 'steps') this.hour = STEPS[0];
    }
    if (this.settings.mode === 'game') this.applyDriver();
    this.emit();
  }

  /** Die Uhr auf eine Zeit stellen — bei _Automatisch_ und _Schrittweise_. */
  setHour(hour: number): void {
    this.hour = ((hour % 24) + 24) % 24;
    this.stepSeconds = 0;
  }

  /** Läuft in jedem Bild (`App.step`). */
  tick(dt: number): void {
    switch (this.settings.mode) {
      case 'fixed':
        return;
      case 'cycle':
        this.hour = (this.hour + (24 * dt) / (this.settings.minutes * 60)) % 24;
        this.status = '';
        return;
      case 'steps': {
        this.stepSeconds += dt;
        if (this.stepSeconds >= this.settings.minutes * 60) {
          this.stepSeconds = 0;
          const index = STEPS.findIndex((step) => dayPhaseAt(step) === dayPhaseAt(this.hour));
          this.hour = STEPS[(index + 1) % STEPS.length]!;
        }
        this.status = '';
        return;
      }
      case 'game':
        this.seconds += dt;
        this.applyDriver();
        return;
    }
  }

  onChange(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private applyDriver(): void {
    if (!this.driver) return;
    const next = this.driver.hour(this.seconds, this.settings);
    this.hour = ((next.hour % 24) + 24) % 24;
    this.status = next.status;
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

/** **Die Uhr der geladenen Welt** — eine für alle. */
export const dayClock = new DayClock();
