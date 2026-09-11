import { MapView, PANEL_LAYERS } from '../map/mapView';
import type { RoleHost, RoleView } from '../registry/roles';
import { Toast, el, roomName } from './roleShell';

/**
 * **Die Schalttafel** — die Station als Grundriss, und **keine Wesen darin**.
 *
 * Sie hat lange aus einer Liste beschrifteter Kippschalter bestanden, deren
 * Beschriftungen nie logen und immer zu wenig sagten. Das war ein gutes Rätsel
 * und ein schlechtes Spiel: Wer „Tür 3" umlegt, hört nichts, sieht nichts und
 * erfährt erst durch einen Zuruf, ob er gerade dem Techniker den Rückweg
 * zugemacht hat. Jetzt liegt derselbe Stromlaufplan auf der Karte: **Tür
 * antippen** sperrt oder gibt frei, **Lampe antippen** schaltet Licht,
 * **Zimmer antippen** wirft den Schallköder an.
 *
 * **Was die Karte nicht zeigt, ist der Punkt**: `layers.entities = false`, und
 * zwar hart. Die Schalttafel sieht die Station, aber niemanden darin — weder
 * den Techniker noch das Monster. Wer eine Tür zuwirft, weiß deshalb nach wie
 * vor nicht, wen er einsperrt, und muss fragen. Das ist die Rolle.
 *
 * **Die halbe Tafel bleibt tot, bis jemand den Sicherungskasten findet**
 * (`panel.ts`): Für jede Tür, jede Lampe und jeden Köder gibt es einen
 * Schalter, und die Hälfte davon liegt hinter der Sicherung. Ein Tipp auf
 * etwas ohne Schalter sagt genau das — er ist keine stille Fehlbedienung.
 */
export function mountPanelView(host: RoleHost): PanelRoleView {
  return new PanelView(host);
}

export interface PanelRoleView extends RoleView {
  /** Die Karte selbst — für Tests und für den, der wissen will, was sie zeigt. */
  readonly map: MapView;
}

class PanelView implements PanelRoleView {
  readonly element = el('div', 'role role--panel');
  readonly map: MapView;
  private readonly toast = new Toast();
  private readonly hud = el('div', 'role__hud');
  private hudText = '';

  constructor(private readonly host: RoleHost) {
    this.map = new MapView({
      // Der Grundriss mit allem, was Strom hat — und nichts, was atmet.
      layers: { ...PANEL_LAYERS, entities: false, items: false },
      markers: 'none',
      mode: 'omniscient',
      minScale: 5,
      maxScale: 40,
      onDoorClick: (id) => this.act(this.host.door(id), 'Für diese Tür gibt es keinen Schalter.'),
      onLightClick: (id) =>
        this.act(this.host.light(id), 'Für diese Lampe gibt es keinen Schalter.'),
      onRoomClick: (id) => this.tapRoom(id),
    });
    this.map.element.classList.add('role__map');
    this.element.append(this.map.element, this.hud, this.toast.element);
  }

  update(dt: number): void {
    const snapshot = this.host.snapshot();
    this.map.setSnapshot(snapshot);
    this.map.draw();
    this.toast.step(dt);
    this.renderHud();
  }

  /**
   * **Ein Zimmer ist der Schalter seines Radios.** Der Köder hat keinen Ort im
   * Bild — er ist ein Lautsprecher irgendwo an der Decke —, und ein eigenes
   * Symbol dafür wäre ein zweites Ding, das man treffen muss. Wer nichts
   * anderes trifft, trifft den Raum, und das ist genau der Griff, den die
   * Tafel dafür braucht.
   */
  private tapRoom(id: string): void {
    const text = this.host.lure(id);
    this.toast.say(text || `${roomName(this.host.snapshot(), id)} · kein Schallköder.`);
  }

  private act(text: string, missing: string): void {
    this.toast.say(text || missing);
  }

  private renderHud(): void {
    const snapshot = this.host.snapshot();
    const shut = snapshot.doors.filter((door) => door.locked).length;
    const lit = snapshot.rooms.filter((room) => room.lit).length;
    const text = `${shut} gesperrt · ${lit} erleuchtet`;
    if (text === this.hudText) return;
    this.hudText = text;
    this.hud.replaceChildren(
      el('strong', '', 'SCHALTTAFEL'),
      el('span', '', text),
      el('span', '', 'Tür, Lampe oder Zimmer antippen'),
    );
  }

  dispose(): void {
    this.map.dispose();
    this.element.remove();
  }
}
