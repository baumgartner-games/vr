import type { HouseDoor, HouseSpec } from '../house';
import { doorCentre } from '../map/geometry';
import { FlatNavigator, type FlatNavigatorOptions } from '../navmesh/flatNavigator';
import type { StationGraph } from '../roomGraph';
import type { FloorPoint } from '../stationLayout';

/**
 * **Wie das Monster läuft — einmal, für beide Welten.**
 *
 * Bis zu diesem Paket ging das Monster zwei Wege: In der 2D-Runde nahm es
 * die Rasterwegsuche mit Umwegabwägung, wartete vor einer gesperrten Tür,
 * splitterte Holz und zog am Stahlriegel (`map/flatRound.ts`); im Headset
 * plante ein zweiter Cursor alle 0,55 s neu, kannte weder Umwegabwägung noch
 * Wartepunkt, und vor einer gesperrten Tür **stand es einfach** — bis zum
 * Rundenende, wenn niemand aufmachte. Eine Runde, die auf dem Telefon
 * ausgespielt wurde, sagte damit nichts über die Brille.
 *
 * Jetzt liegt hier alles, was zwischen dem Beschluss der Routine („dorthin,
 * in diesem Tempo") und dem eigentlichen Schritt steht:
 *
 * - **Kein Ziel in der Einsatzzentrale.** Sie steht nicht in der Karte des
 *   Monsters (`roomGraph.monsterGraph`), also gibt `spaceAt` dort nichts
 *   zurück — und was keinen Raum hat, wird nicht angelaufen.
 * - **Wer sich festläuft, rechnet erst neu; hilft das nicht, geht er kurz zur
 *   Raummitte zurück** (`STALL_AFTER`, `DETOUR`). Wer vor einer Tür wartet
 *   oder am Ende seiner Route steht, steht mit Absicht und gilt nicht als
 *   festgelaufen (`hold`).
 * - **Lieber ziehen als laufen** (`PRY_DETOUR`): Kostet der Umweg um eine
 *   gesperrte Tür mehr als vier Sekunden Laufzeit, führt die Route vor die
 *   Tür (`navmesh/flatNavigator.ts`), und dort wird gearbeitet: Holz
 *   splittert nach `WOOD_DELAY`, an Stahl zieht die KI wie ein Spieler am
 *   Knopf, mit denselben Zahlen (`rules/doorLocks.pryLock`).
 *
 * Was hier **nicht** steht, ist der Schritt selbst: In 2D gleitet die Figur an
 * Wänden (`geometry.slide`), in 3D trägt Rapier den Körper. Beide bekommen
 * denselben nächsten Wegpunkt aus derselben Route — der Unterschied ist die
 * Haut, nicht der Weg.
 */

/**
 * **Ab wann sich das Ziehen mehr lohnt als der Umweg**, in Sekunden Laufzeit.
 *
 * Am Riegel zu ziehen kostet im Mittel gut drei Versuche, also knapp vier
 * Sekunden (`rules/doorLocks.pryChance`). Ein Umweg, der weniger kostet, ist
 * der bessere Weg — dann geht das Monster eben herum. Alles darüber ist die
 * Einladung, die der Besitzer abgeschafft haben wollte: Wer die Tür vor dem
 * Monster schließt, soll dafür einen Riegel verbrauchen und vierzig Sekunden
 * Abkühlung kassieren, nicht ein festgesetztes Vieh bekommen.
 */
export const PRY_DETOUR = 4;
/** Wie lange Holz einen Verfolger aufhält, in Sekunden. */
export const WOOD_DELAY = 2.5;
/** So nah muss das Monster einer gesperrten Tür stehen, um an ihr zu arbeiten, in Metern. */
export const DOOR_REACH = 1.6;
/** Ab so viel Stillstand ohne Absicht wird neu gerechnet, in Sekunden. */
export const STALL_AFTER = 0.6;
/** Und so lange geht der Umweg über die Raummitte, in Sekunden. */
export const DETOUR = 1.2;
/** Unter dieser Strecke je Bild gilt das Monster als stehend, in Metern. */
const STILL = 0.05;

/** Die Riegel der Runde, wie der Läufer sie braucht — beide Welten reichen ihre Buchführung herein. */
export interface WalkDoors {
  /** Die gesperrten Türen (`HauntState.shut`). */
  shut(): readonly string[];
  /** Holz ist durch: Der Riegel fällt (`rules/doorLocks.releaseLock`). */
  release(door: HouseDoor, time: number): void;
  /** Ein Zug am Stahlriegel (`rules/doorLocks.pryLock`): ob gezogen wurde und ob er nachgab. */
  pry(door: HouseDoor, time: number): { tries: boolean; opened: boolean };
}

/** Was an einer Tür geschah — die Welten machen daraus Meldung und Geräusch. */
export type WalkEvent =
  | { kind: 'splinter'; door: HouseDoor }
  | { kind: 'pull'; door: HouseDoor }
  | { kind: 'give'; door: HouseDoor };

export interface WalkStep {
  /** Der nächste Wegpunkt — `null` heißt: stehen bleiben. */
  target: FloorPoint | null;
  /**
   * `route`: `target` ist der erste Wegpunkt der Route, weitere holt `next`.
   * `detour`: `target` ist die Raummitte, ein einziger Schritt.
   * `hold`: kein Schritt — kein Ziel auf der Karte, oder Warten mit Absicht.
   */
  mode: 'route' | 'detour' | 'hold';
  events: WalkEvent[];
}

export interface Walker extends FloorPoint {
  /** In welchem Raum das Monster steht — nach seiner eigenen Karte. */
  space: string;
}

export class MonsterWalk {
  readonly navigator: FlatNavigator;
  /** Wo das Monster zuletzt vorankam — steht es länger, nimmt es einen Umweg über die Raummitte. */
  private stall = { x: NaN, z: NaN, since: 0 };
  private detourUntil = -Infinity;
  /** Die Tür, an der das Monster gerade arbeitet, und seit wann. */
  private blocked: { id: string; since: number } | null = null;

  constructor(
    private readonly spec: HouseSpec,
    /** Die Karte des Monsters — ohne die Einsatzzentrale (`roomGraph.monsterGraph`). */
    private readonly prowl: StationGraph,
    radius: number,
    private readonly doors: WalkDoors,
    options: FlatNavigatorOptions = {},
  ) {
    this.navigator = new FlatNavigator(spec, prowl, radius, options);
  }

  /** Die Wegpunkte, die noch vor dem Monster liegen. */
  get remaining(): readonly FloorPoint[] {
    return this.navigator.remaining;
  }

  /** Für die Wege-Ebene der 3D-Welt (`navigationOverlay.ts`): wo, wohin, welche Punkte. */
  navigation(at: FloorPoint): {
    at: FloorPoint;
    points: readonly FloorPoint[];
    goal: FloorPoint | null;
  } {
    return {
      at: { x: at.x, z: at.z },
      points: this.navigator.remaining,
      goal: this.navigator.target,
    };
  }

  /** Die Tür, an der es gerade arbeitet — für Anzeigen und Tests. */
  get working(): string {
    return this.blocked?.id ?? '';
  }

  /** Ob es gerade den Umweg über die Raummitte geht. */
  detouring(time: number): boolean {
    return time < this.detourUntil;
  }

  /**
   * **Stehen bleiben, ohne als festgelaufen zu gelten.** Wer auf einen Riegel
   * wartet oder kein erreichbares Ziel hat, steht mit Absicht; der Umweg über
   * die Raummitte ist für den gedacht, der sich irgendwo verhakt hat.
   */
  hold(at: FloorPoint, time: number): void {
    this.stall = { x: at.x, z: at.z, since: time };
  }

  /** Beim nächsten Schritt wird auf jeden Fall neu gerechnet. */
  invalidate(): void {
    this.navigator.invalidate();
  }

  /** Die Buchführung an der Tür vergessen — wenn das Monster versetzt wird oder verschwindet. */
  reset(): void {
    this.blocked = null;
    this.stall = { x: NaN, z: NaN, since: 0 };
    this.detourUntil = -Infinity;
    this.navigator.invalidate();
  }

  /**
   * Ein Bild: wo es steht, wohin es will, wie spät es ist und wie schnell es
   * geht — heraus kommt der nächste Wegpunkt und was an der Tür geschah.
   */
  step(at: Walker, goal: FloorPoint, time: number, speed: number): WalkStep {
    const events: WalkEvent[] = [];
    if (speed <= 0) return { target: null, mode: 'hold', events };
    // **Kein Ziel in der Einsatzzentrale.** Das trifft genau einen Fall: die
    // erinnerte Stelle eines Technikers, der heimgelaufen ist.
    if (!this.prowl.spaceAt(goal)) {
      this.hold(at, time);
      return { target: null, mode: 'hold', events };
    }
    // Wer sich festläuft, rechnet erst neu; hilft das nicht, geht er zurück in
    // die Mitte seines Raums und von dort noch einmal los.
    //
    // **Wer vor einer gesperrten Tür wartet, steht mit Absicht** — und zwar
    // auch noch in der Sekunde danach. Die Uhr wird deshalb während des
    // Wartens mitgeführt (`hold`) und nicht nur beim Losgehen abgefragt: Sonst
    // stand das Monster zehn Sekunden am Riegel, bekam die Tür auf und ging
    // als Erstes den Umweg über die Raummitte, weil es sich für festgelaufen
    // hielt.
    //
    // **Und wer am Ende seiner Route steht, steht auch mit Absicht.** Beim
    // Absuchen bleibt das Monster in der Raummitte stehen, bis die Frist um
    // ist; die Route hat dann keinen Wegpunkt mehr vor ihm. Festgelaufen ist
    // nur, wer noch Wegpunkte vor sich hat und trotzdem nicht vorankommt
    // (`rules/monsterStuck.test.ts`).
    const stalled =
      Number.isFinite(this.stall.x) &&
      Math.hypot(at.x - this.stall.x, at.z - this.stall.z) <= STILL;
    if (!stalled) {
      this.stall = { x: at.x, z: at.z, since: time };
    } else if (this.blocked || !this.navigator.remaining.length) {
      this.hold(at, time);
    } else if (time - this.stall.since > STALL_AFTER && time > this.detourUntil) {
      this.detourUntil = time + DETOUR;
      this.stall.since = time;
      this.navigator.invalidate();
    }
    if (time < this.detourUntil) {
      return { target: this.prowl.centre(at.space), mode: 'detour', events };
    }
    // **Lieber ziehen als laufen.** Ist der Umweg länger als `PRY_DETOUR`
    // Sekunden Laufen, stellt es sich vor die Tür und zieht.
    const shut = this.doors.shut();
    const leg = this.navigator.aim(at, goal, shut, time, null, speed * PRY_DETOUR);
    // **Wer vor der Tür steht, arbeitet an ihr.** Der Zähler hängt an der
    // Tür, nicht am Ziel des Moments: Die Alarmleiter (`threat.ts`) lässt die
    // Routine zwischen dem Geräusch hinter der Tür und dem eigenen Raum
    // pendeln, und ein Zähler, der bei jedem Wechsel neu anfinge, ließe
    // Holz nie splittern. Er endet erst, wenn das Monster die Tür verlässt
    // oder sie nicht mehr gesperrt ist.
    const near = (door: HouseDoor): boolean => {
      const centre = doorCentre(door);
      return Math.hypot(centre.x - at.x, centre.z - at.z) < DOOR_REACH;
    };
    const held = this.blocked
      ? (this.spec.doors.find((door) => door.id === this.blocked!.id) ?? null)
      : null;
    const door =
      leg.door && shut.includes(leg.door.id) && near(leg.door)
        ? leg.door
        : held && shut.includes(held.id) && near(held)
          ? held
          : null;
    if (door) {
      if (!this.blocked || this.blocked.id !== door.id) this.blocked = { id: door.id, since: time };
      if (door.material === 'wood') {
        if (time - this.blocked.since > WOOD_DELAY) {
          this.doors.release(door, time);
          events.push({ kind: 'splinter', door });
          this.blocked = null;
        }
      } else {
        // **Stahl hält nicht mehr für immer.** Der Takt steckt in `pryLock`;
        // jedes Bild zu fragen kostet deshalb nichts.
        const out = this.doors.pry(door, time);
        if (out.tries) events.push({ kind: 'pull', door });
        if (out.opened) {
          events.push({ kind: 'give', door });
          this.blocked = null;
        }
      }
    } else this.blocked = null;
    return { target: this.navigator.next(at), mode: 'route', events };
  }

  /** Der Wegpunkt nach dem nächsten — für den, der mehrere je Bild abläuft. */
  next(at: FloorPoint): FloorPoint | null {
    return this.navigator.next(at);
  }
}
