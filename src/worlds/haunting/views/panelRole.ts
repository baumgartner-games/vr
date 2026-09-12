import type { MapSnapshot } from '../map/mapSnapshot';
import { MapView, PANEL_LAYERS } from '../map/mapView';
import type { RoleHost, RoleView } from '../registry/roles';
import { Toast, el } from './roleShell';

/**
 * **Die Schalttafel** — die Station als Grundriss, und **keine Wesen darin**.
 *
 * Sie hat lange aus einer Liste beschrifteter Kippschalter bestanden, deren
 * Beschriftungen nie logen und immer zu wenig sagten. Das war ein gutes Rätsel
 * und ein schlechtes Spiel: Wer „Tür 3" umlegt, hört nichts, sieht nichts und
 * erfährt erst durch einen Zuruf, ob er gerade dem Techniker den Rückweg
 * zugemacht hat. Jetzt liegt derselbe Stromlaufplan auf der Karte: **Tür
 * antippen** sperrt oder gibt frei, **Lampe antippen** schaltet Licht. Die
 * Lampe ist ein Kreis in der Zimmermitte, gelb ausgefüllt, wenn sie brennt
 * (`map/mapView.ts`).
 *
 * **Die Schalterliste ist weg.** Eine Weile lag sie als Blatt über der Karte
 * („Tafel" oben rechts), damit „Tür 3" eine Sprache bleibt. Der Besitzer
 * wollte sie nicht: Wer die Fähigkeit Schalttafel hat, tippt Türen und Lampen
 * direkt auf der Karte an — nichts zum Aufklappen, nichts zum Abhaken. Was
 * die Liste konnte, kann die Karte auch: Ein Schott, das noch warm ist, sagt
 * es beim Tipp (`rules/doorLocks.ts`), und ein Ding ohne Schalter sagt das
 * ebenfalls, statt still nichts zu tun.
 *
 * **Was die Karte nicht zeigt, ist der Punkt**: `layers.entities = false`, und
 * zwar hart. Die Schalttafel sieht die Station, aber niemanden darin — weder
 * den Techniker noch das Monster. Wer eine Tür zuwirft, weiß deshalb nach wie
 * vor nicht, wen er einsperrt, und muss fragen. Das ist die Rolle.
 *
 * **Jede Tür und jede Lampe hat einen Schalter, und keiner versteckt sich**
 * (`panel.ts`): Die Hälfte lag einmal hinter dem Sicherungskasten, und wer
 * die Fähigkeit hielt, bekam für das Licht im Upper Engine „dafür gibt es
 * keinen Schalter" — der Besitzer wollte das nicht. Ein Tipp auf etwas, das
 * wirklich keinen Schalter hat, sagt es weiterhin, statt still nichts zu tun.
 */
/**
 * @param shared eine Karte, die schon jemand hält (`seatRole.ts`): Dann baut
 *   die Schalttafel keine eigene und zeichnet sie nicht; Türen und Lampen
 *   reicht ihr Wirt herein (`tapDoor`, `tapLight`).
 */
export function mountPanelView(host: RoleHost, shared?: MapView): PanelRoleView {
  return new PanelView(host, shared);
}

export interface PanelRoleView extends RoleView {
  /** Die Karte selbst — für Tests und für den, der wissen will, was sie zeigt. */
  readonly map: MapView;
  /** Eine Zeile für die gemeinsame Kopfzeile eines Stuhls. */
  readonly status: string;
  /** Ein Tipp auf eine Tür oder eine Lampe der Karte — dieselben zwei Griffe. */
  tapDoor(doorId: string): void;
  tapLight(roomId: string): void;
}

class PanelView implements PanelRoleView {
  readonly element = el('div', 'role role--panel');
  readonly map: MapView;
  private readonly toast = new Toast();
  private readonly hud = el('div', 'role__hud');
  private hudText = '';

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
        // Der Grundriss mit allem, was Strom hat — und nichts, was atmet.
        layers: { ...PANEL_LAYERS, entities: false, items: false },
        markers: 'none',
        mode: 'omniscient',
        minScale: 5,
        maxScale: 40,
        onDoorClick: (id) => this.tapDoor(id),
        onLightClick: (id) => this.tapLight(id),
      });
    if (!shared) {
      this.map.element.classList.add('role__map');
      this.element.append(this.map.element);
    }
    this.hud.hidden = this.shared;
    this.element.append(this.hud, this.toast.element);
  }

  get status(): string {
    const snapshot = this.host.snapshot();
    const shut = snapshot.doors.filter((door) => door.locked).length;
    const lit = snapshot.rooms.filter((room) => room.lit).length;
    return `${shut} gesperrt · ${lit} hell`;
  }

  update(dt: number): void {
    const snapshot = this.host.snapshot();
    if (!this.shared) {
      this.map.setSnapshot(snapshot);
      this.map.draw();
    }
    this.toast.step(dt);
    this.renderHud(snapshot);
  }

  tapDoor(doorId: string): void {
    this.act(this.host.door(doorId), 'Für diese Tür gibt es keinen Schalter.');
  }

  tapLight(roomId: string): void {
    this.act(this.host.light(roomId), 'Für diese Lampe gibt es keinen Schalter.');
  }

  private act(text: string, missing: string): void {
    this.toast.say(text || missing);
  }

  private renderHud(snapshot: MapSnapshot): void {
    const shut = snapshot.doors.filter((door) => door.locked).length;
    const lit = snapshot.rooms.filter((room) => room.lit).length;
    const text = `${shut} gesperrt · ${lit} erleuchtet`;
    if (text === this.hudText) return;
    this.hudText = text;
    this.hud.replaceChildren(
      el('strong', '', 'SCHALTTAFEL'),
      el('span', '', text),
      el('span', '', 'Tür oder Lampe antippen'),
    );
  }

  dispose(): void {
    if (!this.shared) this.map.dispose();
    this.element.remove();
  }
}
