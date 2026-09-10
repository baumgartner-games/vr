import type { MapItem, MapSnapshot } from '../map/mapSnapshot';
import { MONSTER_ID } from '../map/flatRound';
import { monsterMessage, type HauntState } from '../net';
import { VENT_REACH } from '../vents/ventGraph';
import { VENTING_CEILING } from '../vents/npcVentRide';
import type {
  MonsterAction,
  MonsterInput,
  MonsterPort,
  MonsterStatus,
  MonsterTarget,
} from './monsterDriver';
import { CABIN_REACH, DOOR_REACH, monsterLabel } from './monsterHelm';

/**
 * **Das Steuer auf dem Telefon** — die Seite der Monster-Rolle, die nichts
 * rechnet, sondern nur sagt, was sie will.
 *
 * Die Ansicht (`monsterView.ts`) kennt nur einen `MonsterPort`; in der
 * 2D-Welt steckt dahinter die Runde selbst (`flatMonsterControl.ts`), in der
 * Einsatzzentrale dieser Port. Er sammelt Stock und Knöpfe und gibt sie als
 * `monster`-Nachricht heraus (`net.ts`), zehnmal je Sekunde, solange man die
 * Station besitzt. Die Knöpfe sind **Zähler**: Jeder Druck zählt hoch, und
 * der Gastgeber (`netMonsterControl.ts`) führt jede Differenz genau einmal
 * aus — ein Druck geht bei zehn Ansagen je Sekunde weder verloren noch
 * wirkt er doppelt.
 *
 * Alles, was der Port für die Anzeige weiß — Klappenziele, ob die Fahrt
 * angekommen ist, welche Tür vor einem steht —, liest er aus dem Snapshot
 * und dem Stand des Gastgebers. Er kann sich irren (der Stand ist eine
 * Viertelsekunde alt); entschieden wird beim Gastgeber, hier steht nur die
 * Beschriftung.
 */
export interface NetMonsterHost {
  snapshot(): MapSnapshot;
  state(): HauntState;
  /** Ob ich die Station `monster` gerade besitze (`stations.seatOf`). */
  owned(): boolean;
}

/**
 * Wie nah das Monster an einer Klappe stehen muss, damit das Telefon ihre
 * Ziele anbietet — gemessen an der Klappe selbst, denn der Standplatz davor
 * steht nicht im Snapshot (`vents/ventPlacement.ts`: 0,85 m vor der Wand).
 */
const FLAP_HINT_REACH = VENT_REACH + 0.85;

export class NetMonsterPort implements MonsterPort {
  private held = false;
  private stick: MonsterInput = { x: 0, z: 0, sprint: false };
  private interact = 0;
  private vent = 0;

  constructor(private readonly host: NetMonsterHost) {}

  claim(): boolean {
    if (!this.host.owned()) return false;
    this.held = true;
    return true;
  }

  release(): void {
    this.held = false;
    this.stick = { x: 0, z: 0, sprint: false };
  }

  claimed(): boolean {
    return this.held && this.host.owned();
  }

  input(stick: MonsterInput): void {
    this.stick = {
      x: Math.max(-1, Math.min(1, stick.x)),
      z: Math.max(-1, Math.min(1, stick.z)),
      sprint: stick.sprint,
    };
  }

  act(action: MonsterAction): string {
    if (action !== 'interact' || !this.claimed() || this.host.state().phase !== 'running')
      return '';
    this.interact++;
    // Die Antwort ist die Absicht, nicht das Ergebnis — das kennt nur der
    // Gastgeber. Dieselben Zeilen wie am lokalen Steuer (`monsterHelm.ts`).
    const target = this.target();
    if (!target) return 'Hier ist nichts.';
    if (target.kind === 'ride')
      return target.label === 'Aussteigen' ? 'Aussteigen …' : 'Doch nicht.';
    if (target.kind === 'vent') {
      const targets = this.targets();
      const to = targets[Math.min(this.vent, targets.length - 1)];
      this.vent = 0;
      return to ? `Einsteigen · nach ${to.label}.` : 'Einsteigen …';
    }
    if (target.kind === 'cabin') return 'Die Kabine wird aufgerissen.';
    return target.label === 'Tür aufbrechen' ? 'Holz splittert.' : 'Am Riegel ziehen …';
  }

  /**
   * **Das nächste Ding in Reichweite**, aus dem Snapshot geschätzt — dieselbe
   * Reihenfolge wie beim Gastgeber (`monsterHelm.nearestTarget`), nur mit den
   * Daten, die über die Leitung kommen. Es kann sich irren; entschieden wird
   * drüben, hier steht nur, was die Ansicht hervorhebt.
   */
  target(): MonsterTarget | null {
    const state = this.host.state();
    const me = this.me();
    if (!me || state.phase !== 'running') return null;
    if (state.ride === 'arrived') return { kind: 'ride', id: '', at: me, label: 'Aussteigen' };
    if (state.ride === 'entering') return { kind: 'ride', id: '', at: me, label: 'Abbrechen' };
    if (state.ride !== 'out') return null;
    const near: Array<MonsterTarget & { gap: number }> = [];
    const flap = this.targets().length ? this.flap() : null;
    if (flap)
      near.push({
        kind: 'vent',
        id: flap.id,
        at: flap.at,
        label: 'Einsteigen',
        gap: Math.hypot(flap.at.x - me.x, flap.at.z - me.z),
      });
    for (const item of this.host.snapshot().items) {
      if (item.kind !== 'locker' || item.state === 'destroyed') continue;
      const gap = Math.hypot(item.at.x - me.x, item.at.z - me.z);
      if (gap < CABIN_REACH)
        near.push({ kind: 'cabin', id: item.roomId, at: item.at, label: 'Kabine aufreißen', gap });
    }
    for (const door of this.host.snapshot().doors) {
      if (!state.shut.includes(door.id)) continue;
      const gap = Math.hypot(door.at.x - me.x, door.at.z - me.z);
      if (gap < DOOR_REACH)
        near.push({
          kind: 'door',
          id: door.id,
          at: door.at,
          label: door.material === 'wood' ? 'Tür aufbrechen' : 'Tür aufziehen',
          gap,
        });
    }
    near.sort((a, b) => a.gap - b.gap);
    const best = near[0];
    return best ? { kind: best.kind, id: best.id, at: best.at, label: best.label } : null;
  }

  ventTargets(): ReadonlyArray<{ index: number; label: string }> {
    const targets = this.targets();
    return targets.length < 2 ? [] : targets;
  }

  chooseVent(index: number): void {
    this.vent = Math.max(0, Math.floor(index));
  }

  status(): MonsterStatus {
    const state = this.host.state();
    const ride = state.ride;
    // Wie weit die Fahrt ist, steht nicht im Stand; `crew.venting` läuft
    // während der Fahrt von drei auf null (`vents/npcVentRide.ts`) und reicht
    // für einen Balken, der sich bewegt.
    const progress =
      ride === 'riding'
        ? Math.max(0, Math.min(1, 1 - state.crew.venting / VENTING_CEILING))
        : ride === 'out'
          ? 1
          : 0.5;
    return { ride, progress, prompt: this.prompt(), label: monsterLabel(state) };
  }

  /** Die nächste Nachricht an den Gastgeber — `null`, wenn ich nicht am Steuer sitze. */
  message(): unknown {
    if (!this.claimed()) return null;
    return monsterMessage({
      x: this.stick.x,
      z: this.stick.z,
      sprint: this.stick.sprint,
      // Der Zähler bleibt im Protokoll, damit ein alter Gastgeber die
      // Nachricht noch versteht; gedrückt wird er nicht mehr.
      attack: 0,
      interact: this.interact,
      vent: this.vent,
    });
  }

  /** Die Zähler, wie sie in der nächsten Nachricht stehen — für Tests. */
  get counters(): { attack: number; interact: number } {
    return { attack: 0, interact: this.interact };
  }

  // --- aus dem Snapshot ------------------------------------------------------

  private me(): { x: number; z: number } | null {
    const entity = this.host.snapshot().entities.find((one) => one.id === MONSTER_ID);
    return entity ? entity.at : null;
  }

  /** Die Klappe, vor der das Monster steht, oder `null`. */
  private flap(): MapItem | null {
    const me = this.me();
    if (!me) return null;
    let best: MapItem | null = null;
    let near = FLAP_HINT_REACH;
    for (const item of this.host.snapshot().items) {
      if (item.kind !== 'vent') continue;
      const d = Math.hypot(item.at.x - me.x, item.at.z - me.z);
      if (d < near) {
        near = d;
        best = item;
      }
    }
    return best;
  }

  /**
   * Wohin der Schacht vor dem Monster führt — in der Reihenfolge der
   * Verbindungen im Snapshot, denn das ist die Reihenfolge, in der der
   * Gastgeber die Ziele zählt (`VentNet.linked`, Datenreihenfolge).
   */
  private targets(): Array<{ index: number; label: string }> {
    if (this.host.state().ride !== 'out') return [];
    const flap = this.flap();
    if (!flap) return [];
    const snapshot = this.host.snapshot();
    const items = new Map(snapshot.items.map((item) => [item.id, item]));
    const out: Array<{ index: number; label: string }> = [];
    for (const link of snapshot.ventLinks ?? []) {
      const other = link.a === flap.id ? link.b : link.b === flap.id ? link.a : null;
      if (other === null) continue;
      const roomId = items.get(other)?.roomId ?? '';
      const label = snapshot.rooms.find((room) => room.id === roomId)?.name ?? roomId;
      out.push({ index: out.length, label });
    }
    return out;
  }

  private prompt(): string {
    return this.target()?.label ?? '';
  }
}
