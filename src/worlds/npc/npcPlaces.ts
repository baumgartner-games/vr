/**
 * **Plätze** — Stellen, die ein NPC aufsucht, und wer gerade welche hat.
 *
 * Ein Sitzplatz, ein Platz in einer Warteschlange, ein Fleck vor einer Theke:
 * Für ein Verhalten sind das alles dieselben drei Zahlen (wo, und wohin man
 * dort schaut) und eine Frage — **ist er frei?** Die Antwort darf nicht jeder
 * NPC für sich geben. Zwei, die im selben Bild dieselbe freie Bank sehen,
 * laufen beide hin, und dann stehen sie aufeinander; wer das einmal gesehen
 * hat, weiß, dass „Stapeln" das Wort dafür ist.
 *
 * Deshalb wird **reserviert, wenn einer sich entscheidet, und nicht, wenn er
 * ankommt**: Die Bank ist ab dem Moment besetzt, in dem einer losgeht, und
 * der Zweite sucht sich sofort eine andere. Ein NPC hat dabei höchstens einen
 * Platz — wer einen neuen reserviert, gibt den alten ab. Das ist die ganze
 * Buchhaltung, und sie ist absichtlich klein: Welche Bank einer _will_, sagt
 * das Verhalten (`npcBehavior.ts`), nicht die Tafel.
 *
 * **Eine Warteschlange ist eine Reihe von Plätzen mit einer Nummer**
 * (`line`, `order`). Wer sich anstellt, nimmt den vordersten freien; wird
 * vorne einer frei, rücken alle dahinter nach (`advance`). Mehr ist eine
 * Schlange nicht, und genau deshalb steht sie hier und nicht in einer
 * Kundenlogik: Eine Kasse, eine Theke und ein Wartebereich vor der Toilette
 * sind dieselbe Schlange mit anderen Koordinaten.
 *
 * Reine Rechnung ohne three.js, mit Test (`npcPlaces.test.ts`).
 */

export type PlaceKind = 'seat' | 'queue' | 'spot';

export interface Place {
  id: string;
  kind: PlaceKind;
  /** Wo man steht (oder sitzt), in Metern. */
  x: number;
  z: number;
  /** Wohin man dort schaut — derselbe Gierwinkel wie beim NPC (vorne ist −Z). */
  yaw: number;
  /** Zu welcher Schlange ein Platz gehört. */
  line?: string;
  /** Und der wievielte er darin ist — 0 ist vorne. */
  order?: number;
}

interface Point {
  x: number;
  z: number;
}

export class PlaceBoard {
  private readonly places = new Map<string, Place>();
  /** Platz → wer ihn hat. */
  private readonly holders = new Map<string, string>();
  /** Wer → welchen Platz. */
  private readonly held = new Map<string, string>();

  add(place: Place): void {
    this.places.set(place.id, { ...place });
  }

  /** Nimmt einen Platz weg — wer darauf saß, hat danach keinen mehr. */
  remove(id: string): void {
    const who = this.holders.get(id);
    if (who !== undefined) this.held.delete(who);
    this.holders.delete(id);
    this.places.delete(id);
  }

  get(id: string): Place | null {
    return this.places.get(id) ?? null;
  }

  list(kind?: PlaceKind): Place[] {
    const all = [...this.places.values()];
    return kind ? all.filter((place) => place.kind === kind) : all;
  }

  /** Wer den Platz gerade hat, oder `null`. */
  holder(id: string): string | null {
    return this.holders.get(id) ?? null;
  }

  isFree(id: string): boolean {
    return this.places.has(id) && !this.holders.has(id);
  }

  /** Der Platz, den einer gerade hat, oder `null`. */
  placeOf(who: string): Place | null {
    const id = this.held.get(who);
    return id === undefined ? null : (this.places.get(id) ?? null);
  }

  /**
   * **Reservieren.** `false`, wenn der Platz einem anderen gehört oder es ihn
   * nicht gibt. Wer schon einen anderen hat, gibt ihn dabei ab — ein NPC hat
   * nie zwei Plätze, sonst hielte einer die Bank frei, auf der er gar nicht
   * sitzt.
   */
  reserve(id: string, who: string): boolean {
    if (!this.places.has(id)) return false;
    const current = this.holders.get(id);
    if (current !== undefined && current !== who) return false;
    this.release(who);
    this.holders.set(id, who);
    this.held.set(who, id);
    return true;
  }

  /** Gibt den Platz von `who` frei und sagt, welcher es war. */
  release(who: string): Place | null {
    const id = this.held.get(who);
    if (id === undefined) return null;
    this.held.delete(who);
    this.holders.delete(id);
    return this.places.get(id) ?? null;
  }

  /** Wie viele Plätze dieser Sorte frei sind. */
  freeCount(kind: PlaceKind): number {
    return this.list(kind).filter((place) => !this.holders.has(place.id)).length;
  }

  /**
   * Der nächste freie Platz dieser Sorte, von `from` aus gemessen — oder
   * `null`. Bei gleicher Entfernung entscheidet die Kennung, damit dieselbe
   * Frage immer dieselbe Antwort bekommt.
   */
  nearestFree(kind: PlaceKind, from: Point): Place | null {
    let best: Place | null = null;
    let bestDistance = Infinity;
    for (const place of this.list(kind)) {
      if (this.holders.has(place.id)) continue;
      const distance = Math.hypot(place.x - from.x, place.z - from.z);
      if (
        distance < bestDistance - 1e-9 ||
        (Math.abs(distance - bestDistance) <= 1e-9 && best && place.id < best.id)
      ) {
        best = place;
        bestDistance = distance;
      }
    }
    return best;
  }

  /**
   * Ein freier Platz dieser Sorte, ausgewürfelt — damit fünf Besucher nicht
   * alle zur selben (nächsten) Bank wollen und die hinterste nie jemand sieht.
   */
  randomFree(kind: PlaceKind, random: () => number): Place | null {
    const free = this.list(kind).filter((place) => !this.holders.has(place.id));
    if (free.length === 0) return null;
    const index = Math.min(free.length - 1, Math.floor(random() * free.length));
    return free[index]!;
  }

  // --- Warteschlangen --------------------------------------------------------

  /** Die Plätze einer Schlange, von vorn nach hinten. */
  queue(line: string): Place[] {
    return this.list('queue')
      .filter((place) => place.line === line)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  /**
   * **Anstellen**: der vorderste freie Platz der Schlange, reserviert — oder
   * `null`, wenn sie voll ist. Wer schon darin steht, bleibt, wo er ist.
   */
  joinQueue(line: string, who: string): Place | null {
    const mine = this.placeOf(who);
    if (mine && mine.line === line) return mine;
    for (const place of this.queue(line)) {
      if (!this.holders.has(place.id)) {
        this.reserve(place.id, who);
        return place;
      }
    }
    return null;
  }

  /** Wer vorne steht, oder `null`. */
  front(line: string): string | null {
    const first = this.queue(line)[0];
    return first ? this.holder(first.id) : null;
  }

  /** Wievielter einer in seiner Schlange ist (0 = vorne), oder −1. */
  queuePosition(who: string): number {
    const place = this.placeOf(who);
    if (!place || place.kind !== 'queue' || place.line === undefined) return -1;
    return this.queue(place.line).findIndex((one) => one.id === place.id);
  }

  /**
   * **Aufrücken.** Ist vorne ein Platz frei geworden, gehen alle dahinter
   * einen weiter — der Reihe nach, damit keiner einen anderen überholt.
   * Zurück kommt, wer wohin gerückt ist.
   */
  advance(line: string): { who: string; place: Place }[] {
    const moves: { who: string; place: Place }[] = [];
    const slots = this.queue(line);
    let free = 0;
    for (let i = 0; i < slots.length; i++) {
      const who = this.holders.get(slots[i]!.id);
      if (who === undefined) continue;
      // Der erste freie Platz vor ihm — alles davor ist besetzt.
      while (free < i && this.holders.has(slots[free]!.id)) free++;
      if (free < i) {
        this.reserve(slots[free]!.id, who);
        moves.push({ who, place: slots[free]! });
      }
    }
    return moves;
  }
}
