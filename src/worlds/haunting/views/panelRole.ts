import type { MapSnapshot } from '../map/mapSnapshot';
import { MapView, PANEL_LAYERS } from '../map/mapView';
import type { PanelSwitch } from '../panel';
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
 * antippen** sperrt oder gibt frei, **Lampe antippen** schaltet Licht.
 *
 * **Und die Tafel gibt es trotzdem noch** — als Blatt über der Karte, das der
 * Knopf oben rechts aufschlägt. Beides zusammen und nicht eines statt des
 * anderen, weil beide etwas können, was das andere nicht kann: Die Karte weiß,
 * *wo* eine Tür ist, und sie kennt nur die Türen, die man sieht. Die Tafel
 * kennt **alle** Schalter, die der Sicherungskasten freigegeben hat — auch die
 * in Zimmern, die auf dem Bildschirm gerade nicht zu sehen sind —, und sie sagt
 * dazu, wie sie beschriftet sind. „Tür 3" ist die halbe Sprache dieser Rolle;
 * ohne die Liste redet die Schalttafel nur noch über Orte, und dann ist sie
 * der Archivar mit Schaltern.
 *
 * **Als Blatt und nicht als Streifen unter der Karte**: Zwölf Schalter unter
 * einem Grundriss sind auf einem Telefon hochkant entweder ein Grundriss von
 * drei Zentimetern Höhe oder eine Liste, die man nicht zu Ende rollt. Das
 * Blatt ist dieselbe Form wie die Raumakte des Archivars (`role__sheet`) —
 * wer die Rolle wechselt, sucht dieselbe Geste nicht zweimal.
 *
 * **Was die Karte nicht zeigt, ist der Punkt**: `layers.entities = false`, und
 * zwar hart. Die Schalttafel sieht die Station, aber niemanden darin — weder
 * den Techniker noch das Monster. Wer eine Tür zuwirft, weiß deshalb nach wie
 * vor nicht, wen er einsperrt, und muss fragen. Das ist die Rolle.
 *
 * **Die halbe Tafel bleibt tot, bis jemand den Sicherungskasten findet**
 * (`panel.ts`): Für jede Tür und jede Lampe gibt es einen Schalter, und die
 * Hälfte davon liegt hinter der Sicherung. Ein Tipp auf etwas ohne Schalter
 * sagt genau das — er ist keine stille Fehlbedienung.
 */
export function mountPanelView(host: RoleHost): PanelRoleView {
  return new PanelView(host);
}

export interface PanelRoleView extends RoleView {
  /** Die Karte selbst — für Tests und für den, der wissen will, was sie zeigt. */
  readonly map: MapView;
  /** Ob gerade die Schalterliste über der Karte liegt. */
  readonly sheetOpen: boolean;
}

class PanelView implements PanelRoleView {
  readonly element = el('div', 'role role--panel');
  readonly map: MapView;
  private readonly toast = new Toast();
  private readonly hud = el('div', 'role__hud');
  private readonly sheetKey = el('button', 'role__corner');
  private readonly sheet = el('div', 'role__sheet');
  private hudText = '';
  private sheetSign = '';
  private open = false;

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
    });
    this.map.element.classList.add('role__map');
    this.sheet.hidden = true;
    this.sheetKey.dataset['panelSheet'] = '';
    this.sheetKey.addEventListener('click', () => this.toggleSheet());
    this.sheet.addEventListener('click', (event) => this.sheetClick(event));
    this.element.append(this.map.element, this.hud, this.sheetKey, this.toast.element, this.sheet);
  }

  get sheetOpen(): boolean {
    return this.open;
  }

  update(dt: number): void {
    const snapshot = this.host.snapshot();
    this.map.setSnapshot(snapshot);
    // Liegt das Blatt darüber, wird die Karte darunter nicht gezeichnet: eine
    // Leinwand, die niemand sieht, ist je Bild ein ganzer Grundriss umsonst.
    if (!this.open) this.map.draw();
    this.toast.step(dt);
    this.renderHud(snapshot);
    if (this.open) this.writeSheet(snapshot);
  }

  private act(text: string, missing: string): void {
    this.toast.say(text || missing);
  }

  private toggleSheet(): void {
    this.open = !this.open;
    this.sheet.hidden = !this.open;
    // **Blatt auf heißt Karte weg** (`views.css`, `is-sheet`) — dieselbe Form
    // wie bei der Raumakte des Archivars: Eine Liste über einem Grundriss, der
    // darunter weiterleuchtet, liest niemand zu Ende.
    this.element.classList.toggle('is-sheet', this.open);
    this.sheetSign = '';
    this.hudText = '';
    if (this.open) this.writeSheet(this.host.snapshot());
    this.renderHud(this.host.snapshot());
  }

  private renderHud(snapshot: MapSnapshot): void {
    const shut = snapshot.doors.filter((door) => door.locked).length;
    const lit = snapshot.rooms.filter((room) => room.lit).length;
    const text = `${shut} gesperrt · ${lit} erleuchtet`;
    const count = this.host.switches().length;
    const key = `${text}/${count}/${this.open}`;
    if (key === this.hudText) return;
    this.hudText = key;
    this.hud.replaceChildren(
      el('strong', '', 'SCHALTTAFEL'),
      el('span', '', text),
      el('span', '', this.open ? 'Schalter umlegen' : 'Tür oder Lampe antippen'),
    );
    this.sheetKey.replaceChildren(
      el('strong', '', this.open ? 'Karte' : 'Tafel'),
      el('small', '', this.open ? 'zurück zum Grundriss' : `${count} Schalter`),
    );
    this.sheetKey.setAttribute('aria-pressed', this.open ? 'true' : 'false');
  }

  /**
   * **Die Schalterliste.** Eine Zeile je Schalter, mit der Beschriftung, die
   * auf ihm steht — und nichts darüber hinaus: „Tür 3" ist wirklich eine Tür,
   * aber wo sie hängt, sagt niemand (`panel.ts`).
   *
   * Neu geschrieben wird nur bei wirklicher Änderung: Ein Blatt, das je Bild
   * neu entsteht, verliert bei jedem Bild den Scrollstand — und zwölf
   * Schalter auf einem Telefon sind zwei Bildschirme.
   */
  private writeSheet(snapshot: MapSnapshot): void {
    const list = this.host.switches();
    const rows = list.map((entry) => ({ entry, ...this.readSwitch(snapshot, entry) }));
    const sign = rows
      .map(({ entry, on, warm }) => `${entry.id}:${on ? 1 : 0}:${Math.ceil(warm)}`)
      .join('|');
    if (sign === this.sheetSign) return;
    this.sheetSign = sign;

    const head = el('div', 'role__sheet-head');
    const back = el('button', 'role__key', 'Karte');
    back.dataset['close'] = '';
    head.append(el('strong', '', `Tafel · ${list.length} Schalter`), back);
    const top = el('div', 'role__card');
    top.append(
      head,
      el(
        'small',
        'role__hint',
        'Die Beschriftungen lügen nie — sie sind nur unvollständig. Die halbe Tafel liegt hinter dem Sicherungskasten.',
      ),
    );

    const grid = el('div', 'role__switches');
    for (const { entry, on, warm } of rows) grid.append(this.switchKey(entry, on, warm));
    const bottom = el('div', 'role__card');
    bottom.append(
      grid,
      el(
        'small',
        'role__hint',
        'Ein Riegel, der eben gefallen ist, bleibt vierzig Sekunden offen: grün, aufgesperrt, und der Schalter zählt herunter. Wer sich durchgezogen hat, soll auch hindurchkommen.',
      ),
    );
    this.sheet.replaceChildren(top, bottom);
  }

  /** Ob dieser Schalter an ist — und wie viele Sekunden sein Schott noch warm ist. */
  private readSwitch(snapshot: MapSnapshot, entry: PanelSwitch): { on: boolean; warm: number } {
    if (entry.kind === 'light')
      return { on: snapshot.rooms.some((room) => room.id === entry.target && room.lit), warm: 0 };
    const door = snapshot.doors.find((one) => one.id === entry.target);
    // **Ein Schott kühlt ab** (`rules/doorLocks.ts`): Es ist offen, es ist
    // grün, und es lässt sich vierzig Sekunden lang nicht wieder verriegeln.
    // Gelesen wird die Restzeit aus dem Stand und nicht aus einer eigenen
    // Buchführung — die führt der Gastgeber, das Blatt hängt an jedem Gerät.
    return { on: !door?.locked, warm: door?.locked ? 0 : (door?.cooling?.left ?? 0) };
  }

  /**
   * Ein Kippschalter. Eine **abkühlende** Tür steht grün und lässt sich nicht
   * drücken: Ein Schalter, der vierzig Sekunden lang wortlos nichts tut, ist
   * für den Hacker ein kaputter Schalter — und ab da traut er der ganzen
   * Tafel nicht mehr. Also steht die Restzeit darauf.
   */
  private switchKey(entry: PanelSwitch, on: boolean, warm: number): HTMLElement {
    const key = el('button', `role__switch${on ? ' is-on' : ''}${warm > 0 ? ' is-warm' : ''}`);
    key.dataset['switch'] = entry.id;
    key.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (warm > 0) {
      key.disabled = true;
      key.title = 'Der Riegel ist noch warm.';
    }
    const label = el('span', 'role__switch-label');
    label.append(el('strong', '', entry.label));
    if (warm > 0) label.append(el('small', '', `noch warm · ${Math.ceil(warm)} s`));
    const knob = el('span', 'role__knob');
    knob.append(el('i', ''));
    key.append(label, knob);
    return key;
  }

  private sheetClick(event: Event): void {
    const key = (event.target as HTMLElement | null)?.closest('button');
    if (!key || key.disabled) return;
    if (key.dataset['close'] !== undefined) {
      this.toggleSheet();
      return;
    }
    const id = key.dataset['switch'];
    const entry = this.host.switches().find((one) => one.id === id);
    if (!entry) return;
    // Geschaltet wird über dieselben zwei Griffe wie auf der Karte: Die Tafel
    // ist eine zweite Sicht auf denselben Schalter und kein zweiter Weg an
    // der Buchführung des Wirts vorbei.
    this.act(
      entry.kind === 'door' ? this.host.door(entry.target) : this.host.light(entry.target),
      'Dieser Schalter hängt an nichts mehr.',
    );
    this.sheetSign = '';
    this.writeSheet(this.host.snapshot());
  }

  dispose(): void {
    this.map.dispose();
    this.element.remove();
  }
}
