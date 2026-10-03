/**
 * **Das Menü als Bildschirm** — wo auf dem Panel in der Brille was sitzt.
 *
 * Gewünscht: _„das menü fliegt nicht mehr an dem handgelenk […] Stattdessen
 * fliegt das menü dann vor ihm (etwa 2 meter entfernt). Dabei kann das menü
 * ruhig breiter sein wie z. B. im 16:9 format wie bei einem pc bildschirm. Das
 * menü kann dann genauso gerendert werden wie im web: Tab leisten oben, oben
 * rechts der close button."_ — und: _„Bei den tabs oben sollten wir ganz links
 * zwei buttons (pfeil links, pfeil rechts) einbauen, um durch die tabs zu
 * wechseln."_
 *
 * Also hat das Panel denselben Kopf wie die Seite am Schirm
 * (`PageMenu`, `.pmenu__top`): in der ersten Zeile ◀ ▶, die Reiter und rechts
 * ✕; darunter _Zurück_, die Brotkrumen mit dem Titel und rechts das Haus
 * (_Von vorne_). _Zurück_ und _Von vorne_ sind damit **Knöpfe im Kopf** wie
 * am Schirm und keine angehefteten Zeilen mehr, die eine Kachelreihe kosten.
 *
 * Kein DOM, kein three.js: Die Rechnung steht hier, damit ein Test sie ohne
 * Browser prüfen kann (`screenLayout.test.ts`); gezeichnet wird in
 * `UIPanel.ts`.
 */

/** Die Leinwand des Panels in Bildpunkten — 16:9. */
export const SCREEN_W = 1600;
export const SCREEN_H = 900;

/** Rand rundum. */
export const SCREEN_PAD = 28;
/** Ein runder Knopf im Kopf (◀ ▶ ✕ ← ⌂), Breite gleich Höhe. */
const BUTTON = 80;
const GAP = 10;
/** Die erste Zeile: ◀ ▶, Reiter, ✕. */
const TOP_Y = 20;
/** Die zweite Zeile: Zurück, Weg und Titel, Haus. */
const LINE_Y = TOP_Y + BUTTON + 14;
/** Ein Reiter wird nicht breiter als das — wie am Schirm stehen sie links. */
const TAB_MAX_W = 250;
/** Wo die Liste anfängt. */
export const SCREEN_BODY_TOP = LINE_Y + BUTTON + 16;
/** Die Fußzeile mit Hinweis oder Meldung. */
export const SCREEN_FOOTER_H = 58;
/** Wie breit eine Kachel mindestens ist, bevor eine Spalte wegfällt. */
const MIN_CELL_W = 210;
const CELL_GAP = 16;
/**
 * **Die Spalte rechts neben der Liste** — die Figur im Inventar mit Name und
 * _Aussehen anpassen_, wie am Schirm (`.pmenu__aside`, `ui/PlayerCard.ts`).
 * Sie gehört zum Bildschirm und steht nicht als eigene Tafel daneben.
 */
export const SCREEN_ASIDE_W = 380;
const ASIDE_GAP = 20;
const ASIDE_BUTTON_H = 76;

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Ein Knopf im Kopf — oder ein Reiter mit seiner Stelle in der Reihe. */
export type ScreenControl =
  | { readonly kind: 'prev' | 'next' | 'close' | 'back' | 'home' | 'aside' }
  | { readonly kind: 'tab'; readonly index: number };

export interface ScreenHead {
  readonly prev: Rect | null;
  readonly next: Rect | null;
  readonly tabs: readonly Rect[];
  readonly close: Rect;
  readonly back: Rect | null;
  readonly home: Rect | null;
  /**
   * Die Spalte rechts (`SCREEN_ASIDE_W`): die Karte im Ganzen, die Fläche,
   * vor der die Figur steht, die Zeilen für Name und Aussehen und der Knopf.
   */
  readonly aside: {
    readonly card: Rect;
    readonly figure: Rect;
    readonly titleY: number;
    readonly subY: number;
    readonly button: Rect;
  } | null;
  /** Wie breit die Liste ist — schmaler, wenn die Spalte daneben steht. */
  readonly bodyW: number;
  /** Wo Brotkrumen und Titel stehen: links bündig ab `x`, so breit wie `w`. */
  readonly text: {
    readonly x: number;
    readonly w: number;
    readonly crumbY: number;
    readonly titleY: number;
  };
}

/**
 * Der Kopf des Panels für so viele Reiter und mit diesen Knöpfen.
 *
 * Ohne Reiter fehlen auch ◀ ▶ — es gäbe nichts, wodurch sie blättern.
 */
export function screenHead(
  tabCount: number,
  options: { back: boolean; home: boolean; aside?: boolean },
  width = SCREEN_W,
): ScreenHead {
  const close: Rect = { x: width - SCREEN_PAD - BUTTON, y: TOP_Y, w: BUTTON, h: BUTTON };
  let prev: Rect | null = null;
  let next: Rect | null = null;
  const tabs: Rect[] = [];
  if (tabCount > 0) {
    prev = { x: SCREEN_PAD, y: TOP_Y, w: BUTTON, h: BUTTON };
    next = { x: SCREEN_PAD + BUTTON + GAP, y: TOP_Y, w: BUTTON, h: BUTTON };
    const left = next.x + BUTTON + GAP * 2;
    const room = close.x - GAP * 2 - left;
    const tabW = Math.min(TAB_MAX_W, room / tabCount);
    for (let index = 0; index < tabCount; index++) {
      tabs.push({ x: left + index * tabW, y: TOP_Y, w: tabW, h: BUTTON });
    }
  }
  const back = options.back ? { x: SCREEN_PAD, y: LINE_Y, w: BUTTON, h: BUTTON } : null;
  const home = options.home
    ? { x: width - SCREEN_PAD - BUTTON, y: LINE_Y, w: BUTTON, h: BUTTON }
    : null;
  const textX = back ? back.x + BUTTON + GAP * 2 : SCREEN_PAD + 6;
  const textRight = home ? home.x - GAP * 2 : width - SCREEN_PAD;
  let aside: ScreenHead['aside'] = null;
  const inner = width - SCREEN_PAD * 2;
  if (options.aside) {
    const x = width - SCREEN_PAD - SCREEN_ASIDE_W;
    const card = {
      x,
      y: SCREEN_BODY_TOP,
      w: SCREEN_ASIDE_W,
      h: SCREEN_H - SCREEN_BODY_TOP - SCREEN_FOOTER_H,
    };
    const pad = 20;
    const button = {
      x: x + pad,
      y: card.y + card.h - pad - ASIDE_BUTTON_H,
      w: SCREEN_ASIDE_W - pad * 2,
      h: ASIDE_BUTTON_H,
    };
    const subY = button.y - 22;
    const titleY = subY - 38;
    const figure = {
      x: x + pad,
      y: card.y + pad,
      w: SCREEN_ASIDE_W - pad * 2,
      h: titleY - 46 - card.y - pad,
    };
    aside = { card, figure, titleY, subY, button };
  }
  return {
    prev,
    next,
    tabs,
    close,
    back,
    home,
    aside,
    bodyW: aside ? inner - SCREEN_ASIDE_W - ASIDE_GAP : inner,
    text: { x: textX, w: textRight - textX, crumbY: LINE_Y + 28, titleY: LINE_Y + 70 },
  };
}

/** Welcher Knopf oder Reiter an dieser Stelle der Leinwand sitzt — oder `null`. */
export function controlAt(head: ScreenHead, x: number, y: number): ScreenControl | null {
  const inside = (rect: Rect | null): boolean =>
    rect !== null && x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  if (inside(head.close)) return { kind: 'close' };
  if (inside(head.prev)) return { kind: 'prev' };
  if (inside(head.next)) return { kind: 'next' };
  if (inside(head.back)) return { kind: 'back' };
  if (inside(head.home)) return { kind: 'home' };
  if (inside(head.aside?.button ?? null)) return { kind: 'aside' };
  const index = head.tabs.findIndex((rect) => inside(rect));
  return index >= 0 ? { kind: 'tab', index } : null;
}

/** Zwei Knöpfe sind derselbe, wenn Art und Reiter stimmen. */
export function sameControl(a: ScreenControl | null, b: ScreenControl | null): boolean {
  if (a === null || b === null) return a === b;
  if (a.kind !== b.kind) return false;
  return a.kind !== 'tab' || a.index === (b as { index: number }).index;
}

/**
 * **Wie viele Spalten die Liste hat** — so viele, wie bei der Breite passen,
 * wie am Schirm (`.pmenu__list--grid`, `auto-fill`).
 *
 * Eine Seite, die selbst mehr will (`MenuEntry.cols`), bekommt mehr; weniger
 * nicht — eine Zahl, die für das schmale Panel am Handgelenk gedacht war (zwei
 * Spalten im Modellregal), ließe auf einem Bildschirm drei Viertel leer.
 * Zeilen stehen in zwei Spalten: eine Zeile über 1,8 m Breite liest niemand.
 */
export function screenCols(grid: boolean, requested?: number, width = SCREEN_W): number {
  if (!grid) return 2;
  const inner = width - SCREEN_PAD * 2;
  const fit = Math.max(1, Math.floor((inner + CELL_GAP) / (MIN_CELL_W + CELL_GAP)));
  return Math.max(fit, Math.floor(requested ?? 0));
}
