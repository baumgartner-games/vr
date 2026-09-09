import { MapView, PANEL_LAYERS } from '../map/mapView';
import { emptySnapshot, type MapSnapshot } from '../map/mapSnapshot';
import type { RoleHost, RoleView } from '../registry/roles';
import { el, key } from './dom';
import { extrasOf, type ViewExtras } from './extras';
import { MapOverlay, tag } from './mapOverlay';
import { doorSwitch, lightSwitch, radioSwitch } from './switchState';

/**
 * **Die Schalttafel** — die Station als Karte, und jede Tür und jede Lampe
 * darauf ist ein Schalter.
 *
 * Vorher war sie eine Liste von Kippschaltern mit halb wahren Beschriftungen
 * („Tür 3", „X"). Jetzt sieht man, was man schaltet: Eine rote Tür ist
 * gesperrt, eine gelbe Lampe brennt, ein Tipp darauf legt den Schalter um.
 * Wer sich bewegt, ist **nicht** zu sehen (`PANEL_LAYERS`): Wo der
 * Techniker steht und wo das Monster, weiß der Späher — und dafür muss am
 * Tisch geredet werden.
 *
 * Die Radios (Schallköder) haben auf der Karte keine Form; sie hängen am
 * Zimmer: Ein Tipp auf ein Zimmer mit Radio schaltet es, und ein Notenzeichen
 * am Zimmernamen sagt, ob es läuft.
 */
export const RADIO_COLOR = '#ffc857';

export class PanelRole implements RoleView {
  readonly element = el('div', 'role role--panel');
  readonly map: MapView;
  private readonly overlay: MapOverlay;
  private readonly foot = el('p', 'role__foot');
  private readonly extras: ViewExtras | null;
  private snapshot: MapSnapshot = emptySnapshot();
  private footText = '';

  constructor(private readonly host: RoleHost) {
    this.extras = extrasOf(host);
    this.map = new MapView({
      layers: { ...PANEL_LAYERS, labels: true },
      markers: 'none',
      mode: 'omniscient',
      onDoorClick: (id) => this.door(id),
      onLightClick: (id) => this.light(id),
      onRoomClick: (id) => this.room(id),
    });
    this.overlay = new MapOverlay(this.map);
    const box = el('div', 'role__map');
    box.append(this.map.element);
    const tools = el('div', 'role__tools');
    tools.append(key('role__key', 'Ganze Station', { fit: '' }));
    tools.addEventListener('click', (event) => {
      const hit = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-fit]');
      if (hit) this.map.fit();
    });
    this.element.append(
      el(
        'p',
        'role__lead',
        'Rot ist gesperrt, gelb brennt. Tür oder Lampe antippen schaltet um; ein Zimmer mit ♪ hat ein Radio.',
      ),
      box,
      tools,
      this.foot,
    );
  }

  update(_dt: number): void {
    this.snapshot = this.host.snapshot();
    this.map.setSnapshot(this.snapshot);
    this.map.draw();
    this.overlay.draw((ctx, map) => this.paint(ctx, map));
    const locked = this.snapshot.doors.filter((door) => door.locked).length;
    const lit = this.snapshot.lights.filter((light) => light.kind === 'lamp' && light.on).length;
    const lamps = this.snapshot.lights.filter((light) => light.kind === 'lamp').length;
    const loud = this.extras?.state().loud.length ?? 0;
    const text = `${locked} Tür${locked === 1 ? '' : 'en'} gesperrt · ${lit} von ${lamps} Lampen an${
      loud ? ` · ${loud} Radio${loud === 1 ? '' : 's'} läuft` : ''
    }`;
    if (text !== this.footText) {
      this.footText = text;
      this.foot.textContent = text;
    }
  }

  /** Die Radios: ein Notenzeichen am Zimmer, hell, wenn es läuft. */
  private paint(ctx: CanvasRenderingContext2D, map: MapView): void {
    const spec = this.extras?.spec();
    const state = this.extras?.state();
    if (!spec || !state) return;
    for (const room of this.snapshot.rooms) {
      if (!radioSwitch(spec, room.id)) continue;
      const p = map.toScreen(room.centre.x, room.centre.z);
      const on = state.loud.includes(room.id);
      tag(
        ctx,
        { x: p.x, y: p.y + 24 },
        on ? '♪ Radio läuft' : '♪ Radio',
        on ? RADIO_COLOR : '#6b7690',
      );
    }
  }

  private door(id: string): void {
    const door = this.snapshot.doors.find((one) => one.id === id);
    const entry = this.extras && door ? doorSwitch(this.extras.spec(), id) : null;
    if (!door || !entry) {
      this.host.notify('Diese Tür hat keinen Schalter auf der Tafel.');
      return;
    }
    // `on` heißt offen: Eine gesperrte Tür wird freigegeben und umgekehrt.
    this.host.flip(entry.id, door.locked);
  }

  private light(id: string): void {
    const light = this.snapshot.lights.find((one) => one.id === id);
    const entry = this.extras && light ? lightSwitch(this.extras.spec(), light.roomId) : null;
    if (!light || !entry) {
      this.host.notify('Diese Lampe hängt an keinem Schalter.');
      return;
    }
    this.host.flip(entry.id, !light.on);
  }

  private room(id: string): void {
    const room = this.snapshot.rooms.find((one) => one.id === id);
    const entry = this.extras ? radioSwitch(this.extras.spec(), id) : null;
    if (!room) return;
    if (!entry) {
      this.host.notify(`${room.name}: kein Radio. Tür oder Lampe antippen.`);
      return;
    }
    const on = this.extras!.state().loud.includes(id);
    this.host.flip(entry.id, !on);
  }

  dispose(): void {
    this.overlay.dispose();
    this.map.dispose();
    this.element.remove();
  }
}
