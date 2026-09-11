/**
 * **Wer Licht macht, wie viel davon gleichzeitig brennt, und wie es ausgeht.**
 *
 * `HauntState.lit` sagt nur, *welche* Räume hell sind — nicht, wer sie hell
 * gemacht hat und wie lange das noch gilt. Für die Schalttafel ist das
 * derselbe Unterschied wie bei den Türen (`rules/doorLocks.ts`): Wer alle
 * Lampen auf einmal anmachen kann, macht alle an, und aus einer Station im
 * Dunkeln wird ein beleuchteter Flur, in dem niemand mehr eine Taschenlampe
 * braucht. Deshalb gelten hier drei Regeln, und alle drei sind reine Rechnung
 * ohne three.js und ohne Netz:
 *
 * - **Gleichzeitig brennen höchstens `LAMP_BUDGET` Lampen.** Wer die dritte
 *   anmacht, macht damit die älteste aus. Die Tafel ist also kein Lichtschalter
 *   für die Station, sondern zwei Lampen, die man klug setzen muss — dieselbe
 *   Entscheidung wie bei dem einen Riegel nebenan.
 * - **Keine Lampe brennt ewig.** Was jemand anmacht, hält `LAMP_RANGE`
 *   Sekunden, leicht gewürfelt, damit niemand mitzählen kann. Die letzten
 *   `LAMP_FLICKER` Sekunden davon **flackert** sie (`lampGlow`), und das ist
 *   die Vorwarnung, die man auch aus dem Nebenraum sieht: gleich ist es hier
 *   wieder dunkel. Dazu gehört ein Geräusch, damit es auch merkt, wer gerade
 *   woanders hinsieht.
 * - **Was das Monster ausmacht, zählt genauso** (`lampOut`): Der Spuk löscht
 *   die Lampe des Raums, in dem es steht, und die Buchführung hier vergisst
 *   sie dabei. Für den Hacker sieht eine Lampe, die das Monster ausgemacht
 *   hat, aus wie eine, deren Zeit um war — genau so soll es sein, denn er
 *   sieht nicht, wo es steht.
 *
 * Die Buchführung (`Lamps`) liegt beim Gastgeber und geht nicht über die
 * Leitung: Alle anderen sehen nur die Liste der hellen Räume, und die bleibt,
 * was sie war.
 *
 * **Was hier nicht mitgezählt wird**, ist Licht, das schon brannte, bevor
 * jemand einen Schalter angefasst hat — der helle Test, die Bot-Runde, die
 * gezeichnete 2D-Station. Wie die Riegel führt diese Buchführung nur, was sie
 * selbst gesetzt hat; alles andere lässt sie in Ruhe.
 */

/** Wie viele Lampen der Schalttafel gleichzeitig brennen dürfen. */
export const LAMP_BUDGET = 2;
/**
 * Wie lange eine angemachte Lampe hält, in Sekunden: mindestens, höchstens.
 *
 * **„Nach ein paar Sekunden geht das Licht aus."** Eine Minute ist das nicht
 * — in einer Minute ist der Techniker zwei Räume weiter und hat die Lampe
 * längst vergessen; sie brannte dann nicht für ihn, sondern nur noch für das
 * Monster. Fünf Sekunden sind es auch nicht: Ein Licht, das ausgeht, bevor
 * man den Raum durchquert hat, ist kein Licht, sondern ein Fehler. Fünf
 * Sekunden davon flackern ohnehin schon (`LAMP_FLICKER`), also bleibt eine
 * halbe Minute, gewürfelt, damit niemand mitzählt.
 */
export const LAMP_RANGE: readonly [number, number] = [25, 35];
/** Wie viele Sekunden vor dem Ende eine Lampe flackert. */
export const LAMP_FLICKER = 3;

/** Eine brennende Lampe: welcher Raum, wann sie ausgeht, und ob das Flackern schon angesagt ist. */
export interface LitLamp {
  id: string;
  /** Wann sie von selbst ausgeht (Rundenzeit). */
  until: number;
  /** Ob das Flackern schon einmal gemeldet wurde — ein Geräusch je Lampe, nicht je Bild. */
  warned: boolean;
}

export interface Lamps {
  /** Die angemachten Lampen, älteste zuerst. */
  on: LitLamp[];
}

export function freshLamps(): Lamps {
  return { on: [] };
}

/** Ob diese Lampe von der Tafel angemacht wurde (und nicht einfach hell ist). */
export function isSwitched(lamps: Lamps, id: string): boolean {
  return lamps.on.some((lamp) => lamp.id === id);
}

/** Wann diese Lampe von selbst ausgeht — `null`, wenn sie niemand angemacht hat. */
export function lampUntil(lamps: Lamps, id: string): number | null {
  return lamps.on.find((lamp) => lamp.id === id)?.until ?? null;
}

/**
 * **Wie hell diese Lampe gerade brennt**, 0…1 — die Zahl für die Punktleuchte
 * in 3D und für das Leuchtfeld auf der Karte.
 *
 * Eine Lampe, deren Zeit noch reicht, brennt voll (`1`). In den letzten
 * `LAMP_FLICKER` Sekunden zuckt sie, und zwar aus zwei Sinusschwingungen, die
 * nicht zueinander passen: Das sieht aus wie ein Leuchtstoffrohr am Ende und
 * nicht wie ein Blinker. Gerechnet wird aus der Uhr und nicht aus dem Zufall,
 * damit jedes Gerät dasselbe Zucken sieht, ohne dass es jemand ansagt — genau
 * wie das Flackern des Spuks (`haunt.ts`).
 */
export function lampGlow(lamps: Lamps, id: string, time: number): number {
  const until = lampUntil(lamps, id);
  if (until === null) return 1;
  const left = until - time;
  if (left >= LAMP_FLICKER) return 1;
  if (left <= 0) return 0;
  const urge = 1 - left / LAMP_FLICKER;
  const buzz = Math.sin(time * 37) * Math.sin(time * 11.3);
  return Math.min(1, Math.max(0, 1 - urge * (0.5 + 0.5 * buzz)));
}

export interface LampSwitch {
  /** Die neue Liste der hellen Räume. */
  lit: string[];
  /** Ob danach Licht brennt. */
  on: boolean;
  /** Die Lampe, die dafür ausgehen musste — `''`, wenn keine. */
  dropped: string;
}

/**
 * **Das Licht eines Raums umlegen.** War es an, geht es aus. War es aus, geht
 * es an — und wenn dadurch mehr als `LAMP_BUDGET` Lampen brennen würden, geht
 * dabei die älteste aus. Das ist die eine Entscheidung, die der Hacker
 * wirklich trifft: nicht *ob* Licht, sondern *wo*.
 */
export function switchLamp(
  lamps: Lamps,
  lit: readonly string[],
  id: string,
  time = 0,
  roll: () => number = Math.random,
): LampSwitch {
  if (lit.includes(id)) return { lit: lampOut(lamps, lit, id), on: false, dropped: '' };
  const next = [...lit, id];
  lamps.on.push({
    id,
    until: time + LAMP_RANGE[0] + roll() * (LAMP_RANGE[1] - LAMP_RANGE[0]),
    warned: false,
  });
  let dropped = '';
  if (lamps.on.length > LAMP_BUDGET) {
    dropped = lamps.on[0]!.id;
    lamps.on.shift();
  }
  return { lit: next.filter((room) => room !== dropped), on: true, dropped };
}

/**
 * **Eine Lampe geht aus** — von Hand, durch den Spuk oder weil ein Raum
 * repariert wurde. Für die Buchführung ist das alles dasselbe.
 */
export function lampOut(lamps: Lamps, lit: readonly string[], id: string): string[] {
  lamps.on = lamps.on.filter((lamp) => lamp.id !== id);
  return lit.filter((room) => room !== id);
}

export interface LampStep {
  /** Die neue Liste der hellen Räume. */
  lit: string[];
  /** Die Lampen, die gerade von selbst ausgegangen sind. */
  out: string[];
  /** Die Lampen, die gerade angefangen haben zu flackern — je Lampe genau einmal. */
  flicker: string[];
}

/**
 * **Ein Schritt der Uhr**: Lampen, deren Zeit um ist, gehen aus; Lampen, deren
 * letzte Sekunden angebrochen sind, melden sich einmal (`flicker`) — daran
 * hängen das Geräusch und der Satz für den Hacker. Buchführung über Räume, die
 * inzwischen anders dunkel geworden sind (der Spuk, ein alter Stand vom Netz),
 * wird weggeräumt.
 */
export function stepLamps(lamps: Lamps, lit: readonly string[], time: number): LampStep {
  const out: string[] = [];
  const flicker: string[] = [];
  lamps.on = lamps.on.filter((lamp) => {
    if (!lit.includes(lamp.id)) return false;
    if (lamp.until <= time) {
      out.push(lamp.id);
      return false;
    }
    if (!lamp.warned && lamp.until - time <= LAMP_FLICKER) {
      lamp.warned = true;
      flicker.push(lamp.id);
    }
    return true;
  });
  return { lit: lit.filter((room) => !out.includes(room)), out, flicker };
}
