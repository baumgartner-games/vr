import { INK, MapView, PANEL_LAYERS } from '../map/mapView';
import type { MapPoint, MapSnapshot } from '../map/mapSnapshot';
import type { RoleHost, RoleView } from '../registry/roles';
import { Toast, el } from './roleShell';

/**
 * **Der Späher** — zwei Punkte auf der Karte, und dazwischen wartet man.
 *
 * Er hatte einmal einen Radarschirm mit einem Punkt, der lief. Ein Punkt, der
 * läuft, ist eine Verfolgung: Wer ihn ansieht, weiß jederzeit, wo das Monster
 * steht, und kann es ansagen, während es geht. Damit ist Verstecken keine
 * Möglichkeit mehr, sondern ein Umweg.
 *
 * Was er stattdessen bekommt, ist eine **Peilung**: alle `PING_PERIOD`
 * Sekunden je ein Punkt für den Techniker (grün) und für das Monster (rot),
 * genau dort, wo sie in diesem Moment waren. Danach verblasst der Punkt und
 * bleibt liegen. **Nicht interpoliert**, mit Absicht: Ein Punkt, der zwischen
 * zwei Peilungen weiterwandert, behauptet einen Weg, den niemand gemessen hat
 * — und der Späher sagt ihn an, als hätte er ihn gesehen. Was zwischen zwei
 * Peilungen passiert, ist genau das, worüber am Tisch geraten und gestritten
 * wird.
 *
 * Die Karte selbst ist der Grundriss ohne Wesen (`layers.entities = false`):
 * Die zwei Punkte malt die Rolle selbst, aus ihren eigenen Proben, und niemand
 * sonst kommt darauf.
 */

/** Wie oft eine neue Peilung kommt, in Sekunden. */
export const PING_PERIOD = 3.5;

/** Eine Probe: wo jemand war, als zuletzt gemessen wurde. */
interface Ping {
  at: MapPoint;
  color: string;
  label: string;
}

/**
 * @param shared eine Karte, die schon jemand hält (`seatRole.ts`): Dann baut
 *   der Späher keine eigene, zeichnet sie nicht und malt seine Peilung nur,
 *   wenn ihr Wirt ihn ruft (`paint`).
 */
export function mountScoutView(host: RoleHost, shared?: MapView): ScoutRoleView {
  return new ScoutView(host, shared);
}

export interface ScoutRoleView extends RoleView {
  /** Die Karte selbst — für Tests. */
  readonly map: MapView;
  /** Die letzte Peilung: je ein Punkt, so wie er gemessen wurde. */
  readonly pings: readonly { at: MapPoint; label: string }[];
  /** Wie viele Sekunden bis zur nächsten. */
  readonly nextPing: number;
  /** Eine Zeile für die gemeinsame Kopfzeile eines Stuhls. */
  readonly status: string;
  /** Die Peilung auf eine fremde Karte malen (`MapViewOptions.overlay`). */
  paint(ctx: CanvasRenderingContext2D, view: MapView): void;
}

class ScoutView implements ScoutRoleView {
  readonly element = el('div', 'role role--scout');
  readonly map: MapView;
  private readonly toast = new Toast();
  private readonly hud = el('div', 'role__hud');
  private hudText = '';
  private sample: Ping[] = [];
  /** Wie lange die laufende Peilung schon steht, in Sekunden. */
  private age = PING_PERIOD;

  /** Ob die Karte jemand anderem gehört — dann zeichnet er sie auch. */
  private readonly shared: boolean;

  constructor(
    private readonly host: RoleHost,
    shared?: MapView,
  ) {
    this.shared = !!shared;
    this.map =
      shared ??
      new MapView({
        // Konturen, Türen, Räume — und sonst nichts: keine Fracht, keine
        // Konsolen, keine Möbel. Der Späher beschreibt Formen, nicht Inhalte.
        layers: { ...PANEL_LAYERS, entities: false, items: false, fixtures: false, lights: false },
        markers: 'none',
        mode: 'omniscient',
        minScale: 5,
        maxScale: 40,
        overlay: (ctx, view) => this.paint(ctx, view),
        onRoomClick: (id) =>
          this.toast.say(this.host.snapshot().rooms.find((room) => room.id === id)?.name ?? id),
      });
    if (!shared) {
      this.map.element.classList.add('role__map');
      this.element.append(this.map.element);
    }
    // Auf einer geteilten Karte steht das Kästchen nicht: Dort sagt die eine
    // Zeile des Stuhls, was der Späher meldet (`status`).
    this.hud.hidden = this.shared;
    this.element.append(this.hud, this.toast.element);
    this.take(this.host.snapshot());
    this.age = 0;
  }

  get pings(): readonly { at: MapPoint; label: string }[] {
    return this.sample;
  }

  get nextPing(): number {
    return Math.max(0, PING_PERIOD - this.age);
  }

  get status(): string {
    return this.sample.length ? `Peilung in ${Math.ceil(this.nextPing)} s` : 'Kein Signal';
  }

  update(dt: number): void {
    const snapshot = this.host.snapshot();
    this.age += Math.max(0, dt);
    if (this.age >= PING_PERIOD) {
      this.age = 0;
      this.take(snapshot);
    }
    if (!this.shared) {
      this.map.setSnapshot(snapshot);
      this.map.draw();
    }
    this.toast.step(dt);
    this.renderHud();
  }

  /**
   * **Eine Probe, und zwar eine Kopie.** Der Punkt gehört danach nicht mehr
   * dem Wesen, sondern der Peilung: Wer die Stelle als Referenz behielte,
   * bekäme genau den wandernden Punkt zurück, den es hier nicht geben soll.
   */
  private take(snapshot: MapSnapshot): void {
    const out: Ping[] = [];
    const technician = snapshot.entities.find(
      (entity) => entity.kind === 'player' || entity.kind === 'bot',
    );
    if (technician) out.push({ at: { ...technician.at }, color: INK.bot, label: 'Techniker' });
    const monster = snapshot.entities.find((entity) => entity.kind === 'monster');
    if (monster) out.push({ at: { ...monster.at }, color: INK.monster, label: 'Monster' });
    this.sample = out;
  }

  /** Zwei Punkte mit Hof, deren Deckkraft mit dem Alter der Peilung fällt. */
  paint(ctx: CanvasRenderingContext2D, view: MapView): void {
    // Nie ganz weg: Der letzte Rest sagt „dort war er", und ein Bild ohne
    // jeden Punkt sähe aus wie ein Gerät ohne Empfang.
    const fade = Math.max(0.12, 1 - this.age / PING_PERIOD);
    for (const ping of this.sample) {
      const p = view.toScreen(ping.at.x, ping.at.z);
      ctx.save();
      ctx.globalAlpha = fade;
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 22);
      glow.addColorStop(0, ping.color);
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.globalAlpha = fade * 0.4;
      ctx.fillStyle = glow;
      ctx.fillRect(p.x - 22, p.y - 22, 44, 44);
      ctx.globalAlpha = fade;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = ping.color;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = INK.frame;
      ctx.stroke();
      ctx.restore();
    }
  }

  private renderHud(): void {
    const text = this.sample.length
      ? `Nächste Peilung in ${Math.ceil(this.nextPing)} s`
      : 'Kein Signal';
    if (text === this.hudText) return;
    this.hudText = text;
    this.hud.replaceChildren(
      el('strong', '', 'SPÄHER'),
      el('span', '', text),
      el('span', '', 'Grün: Techniker · Rot: Monster'),
    );
  }

  dispose(): void {
    if (!this.shared) this.map.dispose();
    this.element.remove();
  }
}
