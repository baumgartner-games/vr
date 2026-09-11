import type { FloorPoint } from '../stationLayout';

/**
 * **Wer blutet, wird verfolgt** — die Spur, die ein Getroffener hinter sich
 * herzieht.
 *
 * Bis hierher war ein Treffer ein Strich auf dem Anzug und sonst nichts: Drei
 * Sekunden Unverwundbarkeit, anderthalb Sekunden Schub (`mission.HIT_BURST`),
 * und danach stand der Techniker wieder genau so unbeschrieben da wie vorher.
 * Wer einmal entkommen war, war entkommen — die Jagd fing bei null an, obwohl
 * das Monster ihn eben noch in den Klauen hatte.
 *
 * Eine **Wunde** ändert das. Sie ist für `BLEED_TIME` offen, und solange sie
 * offen ist, fällt alle `DROP_SPACING` Meter ein Tropfen auf den Boden. Danach
 * steht in der Station, was sonst nur der Verfolgte wusste: **wo er war und
 * wohin er gelaufen ist.** Das ist die eigentliche Auskunft — ein Tropfen
 * allein sagt „hier war jemand", zwei aufeinanderfolgende sagen „und dorthin
 * ist er gegangen" (`sniff`).
 *
 * **Nach Strecke und nicht nach Zeit.** Wer in einer Ecke steht und wartet,
 * blutet keinen Teppich unter sich; wer rennt, zieht einen langen Faden. Das
 * ist nicht nur hübscher, es ist auch die Regel, die das Verstecken retten
 * würde: Stillhalten hinterlässt fast nichts.
 *
 * **Kein Hellsehen.** Die Spur ist kein zweiter Sichtkegel. Das Monster
 * findet sie nur, wenn es **darüberläuft** — im selben Raum und in
 * `SNIFF_RANGE` Metern (`sniff`); quer über die Station riecht niemand etwas.
 * Und was sie ihm sagt, ist eine **Vermutung mit Ablaufdatum**: Ein frischer
 * Tropfen zieht den Glauben des Monsters kräftig in die Richtung, in die die
 * Spur zeigt, ein alter kaum noch (`Scent.trust`, `SCENT_TRUST`).
 *
 * Reine Rechnung: kein three.js, kein DOM, kein Netz. Über die Leitung gehen
 * nur die Tropfen (`HauntState.blood` — Ort und Zeit, mehr nicht), auf die
 * Karte kommen sie als `MapSnapshot.blood`.
 */

/**
 * **Wie lange eine Wunde blutet**, in Sekunden.
 *
 * Der Besitzer sagt „einige Minuten"; zwei sind es geworden, und die Zahl
 * hängt an der Runde und nicht am Gefühl: Eine Runde dauert höchstens sieben
 * Minuten (`roundSim` mit `limit` 420), der Anzug hält drei Treffer. Bei zwei
 * Minuten je Wunde kostet ein Treffer den Techniker rund ein Viertel der
 * Runde — lang genug, dass die Flucht danach eine andere ist als die davor,
 * kurz genug, dass ein früher Treffer die Runde nicht schon entschieden hat.
 * Ein zweiter Treffer verlängert die laufende Wunde, er summiert nicht: Zwei
 * Wunden bluten nicht doppelt.
 */
export const BLEED_TIME = 120;

/**
 * **Wie viele Meter zwischen zwei Tropfen liegen.**
 *
 * Anderthalb Meter sind etwa zwei Schritte. Dichter gesetzt wäre die Spur
 * eine durchgezogene Linie — und aus einer Linie liest man dasselbe wie aus
 * einer Perlenkette, sie kostet nur mehr Tropfen. Weiter auseinander, und ein
 * durchquerter Raum bekäme unter Umständen gar keinen ab.
 */
export const DROP_SPACING = 1.5;

/**
 * **Wie lange ein Tropfen zu sehen ist**, in Sekunden, vom Fallen bis zum
 * Verschwinden.
 *
 * Er muss länger halten als der Ghost-Marker (`ghosts.GHOST_TTL`, 25 s),
 * sonst wäre die Spur nur eine zweite, umständlichere Erinnerung an dieselbe
 * Sichtung. Vierzig Sekunden sind gut anderthalbmal so lang: Das Monster darf
 * einen Raum verlassen und wiederkommen und findet die Spur noch — aber nicht
 * die halbe Runde später, wo sie nur noch behaupten würde, jemand sei „hier
 * irgendwann einmal" gewesen.
 */
export const DROP_FADE = 40;

/**
 * **Wie viele Tropfen höchstens liegen.**
 *
 * Ohne diese Grenze wächst die Liste eine ganze Runde lang, geht Bild für
 * Bild über die Leitung und wird Bild für Bild gezeichnet. 48 Tropfen sind
 * `48 × DROP_SPACING` = 72 Meter Spur — mehr, als die Station breit ist, und
 * bei `DROP_FADE` Sekunden Lebenszeit ohnehin nur beim Sprinten erreichbar.
 * Fällt der 49., verschwindet der älteste, egal wie frisch er noch wäre.
 */
export const DROP_LIMIT = 48;

/**
 * **Wie nah das Monster an einem Tropfen sein muss, um ihn zu finden**, in
 * Metern.
 *
 * Die Spur ist eine Fährte und kein Leuchtturm: Wer sie finden will, muss
 * darüberlaufen. Ohne diese Grenze fände ein Monster, das eine Halle betritt,
 * sofort jeden Tropfen darin — und aus dem Aufspüren würde ein Radar.
 *
 * Drei Meter sind zwei Schritte neben den eigenen Füßen, und die Zahl hängt an
 * `SNIFF_EVERY`: Ein jagendes Monster macht in einer halben Sekunde gut zwei
 * Meter (`mission.MONSTER_HUNT_SPEED`). Wäre die Reichweite kleiner als dieser
 * Weg, spränge es zwischen zwei Nasen über die eigene Fährte hinweg — und
 * ausgerechnet der Rennende, dem die Spur gelten soll, bliebe unbemerkt.
 */
export const SNIFF_RANGE = 3;

/**
 * **Wie sehr eine ganz frische Spur den Glauben des Monsters zieht**, von 0
 * bis 1 (`MonsterMemory.tracked`).
 *
 * Nicht 1: Blut sagt, wo jemand **war**, nie, wo er **ist**. Bei 1 wäre ein
 * Tropfen so viel wert wie eine Sichtung, und ein einziger Treffer schenkte
 * dem Monster den Rest der Runde. Bei 0,55 verschiebt eine frische Fährte den
 * Glauben spürbar in die Laufrichtung, ohne alles andere auszulöschen — und
 * ein alter Tropfen fast nichts mehr, denn `trust` fällt mit dem Alter.
 */
export const SCENT_TRUST = 0.55;

/**
 * **Wie oft geschnüffelt wird**, in Sekunden.
 *
 * Eine Fährte ist keine Nachricht, die sechzigmal je Sekunde neu eintrifft:
 * Sie liegt da. Zweimal je Sekunde reicht, um sie zu finden, sobald das
 * Monster darüberläuft — und spart in der Trainingssimulation, die eine ganze
 * Runde in Millisekunden ausspielt, den Löwenanteil der Rechnung. Wer
 * häufiger schnüffelt, bekommt dasselbe Verhalten für mehr Geld.
 */
export const SNIFF_EVERY = 0.5;

/** Ein Tropfen: wo er liegt und wann er fiel (Rundenzeit in Sekunden). */
export interface Drop {
  x: number;
  z: number;
  /** Rundenzeit des Falls (`HauntState.time`), in Sekunden. */
  since: number;
}

/**
 * **Die Spur eines Technikers.** Die Tropfen in der Reihenfolge, in der sie
 * gefallen sind — der jüngste zuletzt —, dazu das, was niemand außer dem
 * Rechner der Runde braucht: bis wann die Wunde blutet, wo zuletzt gemessen
 * wurde und wie viel Weg seit dem letzten Tropfen zusammengekommen ist.
 */
export interface Trail {
  drops: Drop[];
  /** Bis zu dieser Rundenzeit ist die Wunde offen. */
  until: number;
  /** Die letzte gemessene Stelle — `null`, solange nichts blutet. */
  from: FloorPoint | null;
  /** Weg seit dem letzten Tropfen, in Metern. */
  walked: number;
}

/** Eine Runde ohne einen Tropfen — der Anfangswert. */
export function freshTrail(): Trail {
  return { drops: [], until: -Infinity, from: null, walked: 0 };
}

/**
 * **Ein Treffer reißt die Wunde auf.**
 *
 * Sie läuft ab `now` für `BLEED_TIME` Sekunden. Ein zweiter Treffer setzt die
 * Frist neu, er addiert sie nicht: Wer zweimal getroffen wurde, blutet nicht
 * doppelt lange, sondern wieder von vorn — sonst hätte der dritte Treffer
 * eine Wunde geöffnet, die länger hält als die ganze Runde.
 *
 * Der Weg wird dabei zurückgesetzt, damit der erste Tropfen dort fällt, wo
 * der Schlag saß, und nicht anderthalb Meter später.
 */
export function wound(trail: Trail, now: number): void {
  trail.until = now + BLEED_TIME;
  trail.from = null;
  trail.walked = DROP_SPACING;
}

/** Ob die Wunde zu dieser Rundenzeit noch offen ist. */
export function bleeding(trail: Trail, now: number): boolean {
  return now < trail.until;
}

/**
 * **Ein Schritt der Spur** — und heraus kommt, ob in diesem Bild ein Tropfen
 * gefallen ist.
 *
 * Gemessen wird der **Weg**, nicht die Zeit: Zwischen zwei Aufrufen kommt die
 * Strecke von der letzten Stelle hierher dazu, und sobald `DROP_SPACING`
 * zusammen sind, fällt ein Tropfen. Wer steht, sammelt nichts.
 *
 * **Verblassen und Vergessen stehen hier und nicht beim Zeichner.** Ein
 * Tropfen, der älter als `DROP_FADE` ist, wird weggeräumt, und über
 * `DROP_LIMIT` hinaus fällt der älteste heraus. Ein Aufrufer, der die Liste
 * selbst putzte, hätte sie in 2D anders geputzt als in 3D — und dann sähe das
 * Monster in der einen Welt eine Spur, die es in der anderen nicht gibt.
 *
 * Aufgerufen wird das in **jedem** Bild, auch wenn nichts blutet: Nur so
 * verschwinden die alten Tropfen einer längst geschlossenen Wunde.
 */
export function stepTrail(trail: Trail, at: FloorPoint, now: number): boolean {
  while (trail.drops.length && now - trail.drops[0]!.since >= DROP_FADE) trail.drops.shift();
  if (!bleeding(trail, now)) {
    trail.from = null;
    return false;
  }
  const from = trail.from;
  trail.from = { x: at.x, z: at.z };
  // Der allererste Aufruf nach dem Treffer hat noch keine Vorgängerstelle —
  // und soll trotzdem tropfen: `wound` hat den Weg dafür schon vollgemacht,
  // damit der erste Tropfen dort liegt, wo der Schlag saß, und nicht
  // anderthalb Meter weiter.
  if (from) trail.walked += Math.hypot(at.x - from.x, at.z - from.z);
  if (trail.walked < DROP_SPACING) return false;
  trail.walked = 0;
  trail.drops.push({ x: at.x, z: at.z, since: now });
  while (trail.drops.length > DROP_LIMIT) trail.drops.shift();
  return true;
}

/** Wie kräftig ein Tropfen noch gezeichnet wird, von 1 bis 0 — linear über `DROP_FADE`. */
export function dropAlpha(drop: Drop, now: number): number {
  const age = Math.max(0, now - drop.since);
  if (age >= DROP_FADE) return 0;
  return 1 - age / DROP_FADE;
}

/**
 * **Was eine gefundene Fährte aussagt**: die Stelle, ihr Alter, die Richtung,
 * in die sie weiterführt, und wie sehr man ihr glauben darf.
 */
export interface Scent {
  /** Der jüngste Tropfen, den das Monster hier gefunden hat. */
  at: Drop;
  /** Wie alt er ist, in Sekunden. */
  age: number;
  /**
   * **Wohin die Spur zeigt**, als Einheitsvektor — aus dem vorletzten und dem
   * letzten Tropfen derselben Umgebung. `null`, wenn nur einer da ist: Ein
   * einzelner Tropfen sagt „hier war jemand" und sonst nichts.
   */
  dir: FloorPoint | null;
  /** Wie stark das Gedächtnis dieser Fährte folgen darf, von 0 bis `SCENT_TRUST`. */
  trust: number;
}

/**
 * **Darüberlaufen und schnüffeln.**
 *
 * Gesucht wird der jüngste Tropfen, der nah genug bei `at` liegt
 * (`SNIFF_RANGE`) **und** die Prüfung `inside` besteht — die der Aufrufer
 * mitbringt und die in der Regel heißt: „liegt im selben Raum wie das
 * Monster". Beide Bedingungen zusammen sind die Regel gegen das Hellsehen:
 * Ohne die Reichweite fände das Monster eine Fährte am anderen Ende der
 * Halle, ohne den Raum eine hinter der Wand.
 *
 * Die Richtung kommt aus dem **vorletzten** Tropfen derselben Auswahl: Zwei
 * Punkte, die beide hier liegen, zeigen zusammen dorthin, wo der Verfolgte
 * hingelaufen ist — hinaus aus dem Raum, wenn er hinausgelaufen ist. Ein
 * Punkt von hier und einer von dort wäre dagegen wieder Hellsehen durch die
 * Hintertür.
 */
export function sniff(
  trail: Trail,
  at: FloorPoint,
  now: number,
  inside: (drop: Drop) => boolean,
): Scent | null {
  let last: Drop | null = null;
  let before: Drop | null = null;
  // Erst rechnen, dann fragen: Der Abstand im Quadrat kostet zwei
  // Multiplikationen, `inside` je nach Aufrufer eine Suche über alle Räume.
  const reach = SNIFF_RANGE * SNIFF_RANGE;
  for (let i = trail.drops.length - 1; i >= 0; i--) {
    const drop = trail.drops[i]!;
    const dx = drop.x - at.x;
    const dz = drop.z - at.z;
    if (dx * dx + dz * dz > reach || now - drop.since >= DROP_FADE) continue;
    if (!inside(drop)) continue;
    if (!last) last = drop;
    else {
      before = drop;
      break;
    }
  }
  if (!last) return null;
  const age = Math.max(0, now - last.since);
  let dir: FloorPoint | null = null;
  if (before) {
    const dx = last.x - before.x;
    const dz = last.z - before.z;
    const span = Math.hypot(dx, dz);
    if (span > 0) dir = { x: dx / span, z: dz / span };
  }
  return { at: last, age, dir, trust: SCENT_TRUST * dropAlpha(last, now) };
}

/**
 * **Was vom Stand kommt, ist fremder Text** (`net.ts`): Tropfen mit Zahlen,
 * die endlich sind, in Metern, und höchstens `DROP_LIMIT` Stück. Ein Stand
 * ohne Spur ist einer, in dem niemand blutet — kein Fehler.
 */
export function readDrops(value: unknown): Drop[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, DROP_LIMIT).map((one) => {
    const it = typeof one === 'object' && one !== null ? (one as Record<string, unknown>) : {};
    return { x: metres(it['x']), z: metres(it['z']), since: number(it['since']) };
  });
}

function number(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** Ein Maß in Metern — die Station ist keine hundert Meter groß (wie `net.metres`). */
function metres(value: unknown): number {
  return Math.max(-1000, Math.min(1000, number(value)));
}
