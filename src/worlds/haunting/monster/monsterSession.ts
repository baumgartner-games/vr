import { DEFAULT_TUNING, type TechnicianTuning } from '../botTuning';
import type { FlatRound } from '../map/flatRound';
import type { RoleHost, RoleView } from '../registry/roles';
import { Rng } from '../rng';
import { TechnicianBot } from '../rules/technicianBot';
import { visibleSwitches } from '../panel';
import { FlatMonsterControl } from './flatMonsterControl';
import { mountMonsterView } from './monsterView';

/**
 * **Als Monster in der 2D-Welt** — das Bündel, das `FlatMode` einhängt, wenn
 * der Spieler die Rolle wechselt.
 *
 * Drei Teile, alle aus diesem Paket: das Steuer (`FlatMonsterControl`, hängt
 * sich als `driver` in die Runde), der Techniker aus Zahlen
 * (`rules/technicianBot.ts`, spielt die andere Seite mit Stock und Knöpfen)
 * und die Rollenansicht (`monsterView.ts`), gebaut über denselben `RoleHost`
 * wie in der Einsatzzentrale — nur dass `snapshot()` hier aus der laufenden 2D-Runde kommt
 * und `extra.monster` das Steuer ist.
 */
export class MonsterSession {
  readonly element: HTMLElement;
  private readonly control: FlatMonsterControl;
  private readonly bot: TechnicianBot;
  private readonly view: RoleView;

  constructor(
    round: FlatRound,
    notify: (text: string) => void = () => {},
    tuning: TechnicianTuning = DEFAULT_TUNING.technician,
  ) {
    this.control = new FlatMonsterControl(round);
    const dice = new Rng((round.house.seed ^ 0x6d6f6e73) >>> 0);
    this.bot = new TechnicianBot(round, tuning, () => dice.next());
    const host: RoleHost = {
      snapshot: () => round.snapshot(),
      spec: () => round.house,
      ledger: () => round.state(),
      me: () => 'local',
      nameOf: () => 'Techniker',
      door: (id) => round.lockDoor(id),
      light: (id) => round.switchLight(id),
      switches: () => visibleSwitches(round.house.switches, round.state().fuse),
      notify,
      extra: { monster: this.control },
    };
    this.view = mountMonsterView(host);
    this.element = this.view.element;
  }

  /** Ein Bild: der Techniker spielt seinen Zug, dann zeichnet die Monster-Ansicht. */
  update(dt: number): void {
    this.bot.step(dt);
    this.view.update(dt);
  }

  dispose(): void {
    this.view.dispose();
    this.control.detach();
  }
}
