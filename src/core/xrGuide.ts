import type { HintItem, HintZone } from './controlHints';
import type { IntroTip } from './worldIntro';

/**
 * **Der Weg ins Spiel, in der Brille** — die Rechnung hinter Abblenden,
 * Ladetafel, Willkommens-Tafel und der Beschriftung am Controller
 * (`ui/XRGuide.ts` zeichnet).
 *
 * Am Schirm gibt es dafür DOM: den Ladebildschirm (`ui/WorldLoader.ts`), die
 * Willkommens-Karte (`ui/WorldWelcome.ts`) und die Tastenhilfe
 * (`ui/ControlHints.ts`). In der Brille gibt es kein DOM im Bild, und dort
 * war ein Weltwechsel ein harter Schnitt — die alte Welt stand still, bis die
 * neue fertig war, und dann stand man ohne Übergang woanders. Dasselbe gilt
 * jetzt dort, mit denselben Texten und denselben Zahlen, nur **im Raum**:
 *
 * - **Abblenden** statt Schnitt (`fadeStep`): in `XR_FADE_IN` Sekunden auf
 *   eine dunkle Farbe der Zielwelt, halten, bis sie geladen ist (mindestens
 *   `LOADER_MIN_MS`, wie am Schirm), dann in `XR_FADE_OUT` wieder auf.
 * - **Eine Tafel steht vor dem Spieler, nicht vor dem Kopf** (`followYaw`):
 *   Sie bleibt, wo sie hingestellt wurde, und rückt erst nach, wenn man sich
 *   weit weggedreht hat — weich, nicht ruckartig. Eine Tafel, die am Kopf
 *   klebt, ruckelt mit jedem ausgelassenen Bild mit, und ein Weltwechsel ist
 *   genau der Augenblick, in dem Bilder ausfallen.
 * - **Die Knöpfe heißen wie in der Hand** (`xrIntroKeys`, `xrHints`): Stock,
 *   `A`, Trigger, Griff, ☰ — nicht `E` und `WASD`.
 *
 * Reine Rechnung, kein three.js, mit Test.
 */

// --- Abblenden ------------------------------------------------------------------

/** Sekunden bis ganz dunkel — kurz genug, dass der Klick im Menü „wirkt". */
export const XR_FADE_IN = 0.25;
/** Sekunden bis ganz hell — etwas länger: Die neue Welt soll auftauchen. */
export const XR_FADE_OUT = 0.45;

export type FadePhase = 'idle' | 'in' | 'hold' | 'out';

export interface FadeState {
  readonly phase: FadePhase;
  /** 0 = man sieht die Welt, 1 = ganz dunkel. */
  readonly alpha: number;
  /** Sekunden seit dem Anfang des Wechsels (für die Mindestzeit). */
  readonly age: number;
  /** Ist die neue Welt fertig — darf es wieder hell werden? */
  readonly ready: boolean;
}

export const FADE_IDLE: FadeState = { phase: 'idle', alpha: 0, age: 0, ready: false };

/**
 * **Ein Wechsel fängt an.** Wer mitten im Aufblenden schon wieder wechselt,
 * blendet von dort aus ab, wo er gerade ist — kein Sprung auf hell und zurück.
 */
export function fadeBegin(state: FadeState): FadeState {
  return { phase: 'in', alpha: state.alpha, age: 0, ready: false };
}

/** Die neue Welt steht — sobald die Mindestzeit um ist, wird es hell. */
export function fadeReady(state: FadeState): FadeState {
  if (state.phase === 'idle' || state.phase === 'out') return state;
  return { ...state, ready: true };
}

/** Sofort weg — die Brille ist ab, oder die Ladung ist gescheitert. */
export function fadeCancel(): FadeState {
  return FADE_IDLE;
}

/**
 * **Ein Bild.** `minHold` ist die Mindestzeit ab dem Anfang, in Sekunden —
 * dieselbe wie am Schirm, damit eine Welt aus dem Speicher nicht als Blitz
 * vorbeizieht.
 */
export function fadeStep(state: FadeState, dt: number, minHold: number): FadeState {
  const step = Math.max(0, dt);
  const age = state.age + step;
  switch (state.phase) {
    case 'idle':
      return state;
    case 'in': {
      const alpha = Math.min(1, state.alpha + step / XR_FADE_IN);
      if (alpha < 1) return { ...state, alpha, age };
      return { ...state, phase: 'hold', alpha: 1, age };
    }
    case 'hold':
      if (state.ready && age >= minHold) return { ...state, phase: 'out', age };
      return { ...state, age };
    case 'out': {
      const alpha = Math.max(0, state.alpha - step / XR_FADE_OUT);
      if (alpha > 0) return { ...state, alpha, age };
      return FADE_IDLE;
    }
  }
}

/** Ob die Ladetafel steht: vom ersten Bild des Abblendens bis ganz hell. */
export function fadeActive(state: FadeState): boolean {
  return state.phase !== 'idle';
}

/**
 * **Wie dunkel, und in welcher Farbe** — die Akzentfarbe der Zielwelt, aber
 * so weit abgedunkelt, dass es nach „Augen zu" aussieht und nicht nach einer
 * bunten Wand: 12 % Farbe auf Schwarz.
 */
export function fadeColor(accent: number, share = 0.12): number {
  const r = Math.round(((accent >> 16) & 0xff) * share);
  const g = Math.round(((accent >> 8) & 0xff) * share);
  const b = Math.round((accent & 0xff) * share);
  return (r << 16) | (g << 8) | b;
}

// --- Die Tafel steht vor dem Spieler ---------------------------------------------

/**
 * Wie weit man sich wegdrehen darf, bevor die Tafel nachrückt (Bogenmaß, 40°):
 * weit genug, dass ein Blick zur Seite sie nicht mitzieht, eng genug, dass sie
 * nicht hinter einem verloren geht.
 */
export const FOLLOW_DEAD_ZONE = (40 * Math.PI) / 180;
/** Bis wie nah an die Blickrichtung sie dann rückt (5°) — dann steht sie wieder. */
export const FOLLOW_SETTLE = (5 * Math.PI) / 180;

export interface FollowState {
  readonly yaw: number;
  /** Rückt sie gerade nach? (Dazwischen steht sie still.) */
  readonly moving: boolean;
}

/** Der kürzeste Winkel von `from` nach `to`, in (-π, π]. */
export function angleDelta(from: number, to: number): number {
  let delta = (to - from) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta <= -Math.PI) delta += Math.PI * 2;
  return delta;
}

/**
 * **Die Tafel folgt dem Blick weich.** Sie steht still, solange der Kopf
 * innerhalb von `FOLLOW_DEAD_ZONE` bleibt; dreht er weiter, rückt sie
 * exponentiell nach (`rate` = Anteil des Rests je Sekunde) und hört erst auf,
 * wenn sie wieder fast geradeaus steht — mit Abstand zwischen Anfangen und
 * Aufhören, damit sie am Rand nicht zittert.
 */
export function followYaw(state: FollowState, headYaw: number, dt: number, rate = 4): FollowState {
  const delta = angleDelta(state.yaw, headYaw);
  const moving = state.moving
    ? Math.abs(delta) > FOLLOW_SETTLE
    : Math.abs(delta) > FOLLOW_DEAD_ZONE;
  if (!moving) return { yaw: state.yaw, moving: false };
  const share = 1 - Math.exp(-rate * Math.max(0, dt));
  return { yaw: state.yaw + delta * share, moving: true };
}

// --- Die Knöpfe in der Hand ---------------------------------------------------------

/**
 * **Die Tipps der Willkommens-Karte mit den Knöpfen der Brille.**
 *
 * Dieselben Tipps wie am Schirm (`WORLD_INTROS`), nur mit dem, was man in der
 * Hand hält: Gehen ist der linke Stock, Benutzen und Springen ist `A` rechts
 * (`PlayerRig`: mit etwas in Reichweite benutzt es, sonst springt es), das
 * Menü ☰ am linken Controller. _Werkzeug_ hat in der Brille keinen Knopf —
 * man nimmt es mit dem **Griff** aus dem Regal am Handgelenk, also steht dort
 * der Griff. _Ansicht_ gibt es in der Brille nicht (man steht in der Welt).
 *
 * Dazu kommt, wo es etwas zu nehmen gibt, der Griff selbst: In der Brille
 * greift man mit der Hand, und das sagt einem sonst niemand.
 */
export function xrIntroKeys(tips: readonly IntroTip[]): HintItem[] {
  const out: HintItem[] = [];
  let grab = false;
  for (const tip of tips) {
    const key = xrIntroKey(tip.action);
    if (!key) continue;
    if (key === 'Griff') grab = true;
    out.push({ key, label: tip.label });
  }
  if (!grab && tips.some((tip) => tip.action === 'use')) {
    // Vor das Menü: erst was man tut, zuletzt wie man herauskommt.
    const menu = out.findIndex((item) => item.key === XR_KEYS.menu);
    const item = { key: 'Griff', label: 'Greifen' };
    if (menu < 0) out.push(item);
    else out.splice(menu, 0, item);
  }
  return out;
}

/** Wie die Knöpfe der Brille auf Tafeln heißen — kurz, wie auf dem Controller. */
export const XR_KEYS = {
  move: 'Stock L',
  use: 'A',
  grab: 'Griff',
  trigger: 'Trigger',
  menu: '☰',
  back: 'B/Y',
} as const;

function xrIntroKey(action: IntroTip['action']): string | null {
  switch (action) {
    case 'move':
      return XR_KEYS.move;
    case 'use':
    case 'jump':
      return XR_KEYS.use;
    case 'tools':
      return XR_KEYS.grab;
    case 'menu':
      return XR_KEYS.menu;
    case 'view':
      return null;
  }
}

/** Wie viele Einträge die Beschriftung am Controller höchstens hat. */
export const XR_HINT_MAX = 3;

export interface XRHintContext {
  /** Steht etwas in Reichweite (`PlayerRig.useCandidate`)? */
  readonly useCandidate: boolean;
  /** Trägt die Figur etwas (`PlayerRig.carrying`)? */
  readonly carrying: boolean;
  /** Hält die Hand ein Werkzeug mit Auslöser (`PlayerRig.armed`)? */
  readonly armed: boolean;
}

export interface XRHintLabel {
  /** Das Schildchen oben: der Name der Zone — oder leer. */
  readonly title: string;
  /** Höchstens `XR_HINT_MAX` Knöpfe, das Wichtigste zuerst. */
  readonly items: readonly HintItem[];
}

/**
 * **Die Beschriftung am Controller** — die zwei, drei Knöpfe, die in dieser
 * Zone zählen (`World.hintZone`), mit den Namen der Brille.
 *
 * Kürzer als die Zeile am Schirm, und mit Absicht: Sie hängt an der Hand und
 * wird im Vorbeischauen gelesen. Das Menü steht nicht darauf — ☰ sitzt auf
 * dem Controller selbst, gleich daneben.
 *
 * `null` heißt: nichts zeigen. Ohne Zone sagt sie nur, was gerade gilt
 * (Benutzen oder Springen, Greifen, und mit einem Werkzeug der Trigger).
 */
export function xrHints(zone: HintZone | null, ctx: XRHintContext): XRHintLabel | null {
  const items: HintItem[] = [];
  const add = (key: string, label: string): void => {
    if (items.length < XR_HINT_MAX) items.push({ key, label });
  };
  if (!zone) {
    add(XR_KEYS.use, ctx.useCandidate ? 'Benutzen' : 'Springen');
    if (ctx.armed) add(XR_KEYS.trigger, 'Auslösen');
    add(XR_KEYS.grab, ctx.carrying ? 'Loslassen: Ablegen' : 'Greifen');
    return { title: '', items };
  }
  switch (zone.kind) {
    case 'kart':
      add('Trigger R', 'Gas');
      add('Trigger L', 'Bremse');
      add(`${XR_KEYS.use} halten`, 'Aussteigen');
      return { title: 'Kart', items };
    case 'burger':
      // In der Brille nimmt die Hand, nicht `A` (`docs/agents/burgerladen.md`).
      if (zone.closed) add(XR_KEYS.grab, 'Glocke läuten');
      else if (zone.holding) add('Loslassen', 'an Platte/Tisch: Ablegen');
      else add(XR_KEYS.grab, ctx.useCandidate ? 'Nehmen' : 'an der Kiste: Nehmen');
      add(XR_KEYS.move, 'Gehen');
      return { title: 'Burgerladen', items };
    case 'build':
      // Der Kran ist eine Ansicht am Schirm; in der Brille gibt es ihn nicht.
      return null;
    case 'haunting':
      if (zone.role === 'map' || zone.role === 'watch') return null;
      if (zone.role === 'monster') {
        add(XR_KEYS.move, 'Jagen');
        add(XR_KEYS.use, 'Klappe/Tür');
        return { title: 'Station: Monster', items };
      }
      add(XR_KEYS.use, ctx.useCandidate ? 'Benutzen' : 'Springen');
      add(XR_KEYS.grab, 'Greifen');
      if (ctx.armed) add(XR_KEYS.trigger, 'Auslösen');
      return { title: 'Station: Techniker', items };
  }
}

/** Die Beschriftung als Text — zum Vergleichen, ob neu gezeichnet werden muss. */
export function xrHintText(label: XRHintLabel | null): string {
  if (!label) return '';
  return [label.title, ...label.items.map((item) => `${item.key} ${item.label}`)]
    .filter(Boolean)
    .join(' · ');
}

// --- Wann was steht ---------------------------------------------------------------------

/** Was in der Brille gerade vor dem Spiel liegt. */
export interface XRGuideGate {
  /** Ist die Brille auf (oder die Vorschau am Schirm an)? */
  readonly presenting: boolean;
  /** Blendet gerade ein Weltwechsel? */
  readonly transit: boolean;
  /** Ist das Handgelenkmenü offen? */
  readonly menu: boolean;
  /** Steht eine Welt? */
  readonly world: boolean;
}

/**
 * **Ob die Welt zu sehen ist** — die Bedingung für die Willkommens-Tafel.
 * Unter dem Abblenden, hinter dem Menü und ohne Brille nicht.
 */
export function xrWorldVisible(gate: XRGuideGate): boolean {
  return gate.presenting && gate.world && !gate.transit && !gate.menu;
}

/**
 * **Ob die Beschriftung am Controller steht.** Wie die Tastenhilfe am
 * Schirm: abschaltbar (`on`), nicht unter dem Abblenden, nicht im offenen
 * Menü (dort hat das Panel seine eigene Fußzeile) — und nicht, solange die
 * Willkommens-Tafel dieselben Knöpfe schon sagt.
 */
export function xrHintsVisible(gate: XRGuideGate, on: boolean, welcome: boolean): boolean {
  return on && xrWorldVisible(gate) && !welcome;
}

/** So lange steht die Willkommens-Tafel, wenn niemand etwas tut (Sekunden). */
export const XR_WELCOME_SECONDS = 12;
