import { ABILITIES, ABILITY_LABELS, type Ability } from '../rules/roundSetup';
import { MapView, PANEL_LAYERS } from '../map/mapView';
import type { RoleHost, RoleView } from '../registry/roles';
import { mountArchiveView, type ArchiveRoleView } from './archiveRole';
import { mountPanelView, type PanelRoleView } from './panelRole';
import { mountScoutView, type ScoutRoleView } from './scoutRole';
import { Toast, el, roomName } from './roleShell';

/**
 * **Ein Stuhl, eine Karte — mit allem darauf, was der Stuhl kann.**
 *
 * Rot mit Späher, Schalttafel und Archiv hatte drei Karten und eine Zeile zum
 * Blättern. Der Besitzer wollte das nicht: „Die Fähigkeits-Ansichten sollen
 * nicht wechselbar sein, sondern direkt auf der Karte sein, als wenn ich alle
 * drei aktiv hätte." Also liegt hier **eine** `MapView`, und die drei Rollen
 * aus der Registry zeichnen und hören darauf gemeinsam: Der Späher malt seine
 * Peilung, der Archivar seine Linien und Beschriftungen, die Schalttafel hört
 * auf Türen und Lampen, der Archivar auf Zimmer und Fracht.
 *
 * Die drei Ansichten bleiben, was sie sind (`scoutRole.ts`, `panelRole.ts`,
 * `archiveRole.ts`) — jede kann weiterhin allein stehen, mit eigener Karte.
 * Hier bekommen sie die Karte **gereicht** statt sie zu bauen, zeichnen sie
 * nicht selbst (das tut diese Ansicht, einmal je Bild) und verstecken ihr
 * eigenes Kästchen oben links: Statt drei Panels steht **eine Zeile** oben,
 * die sagt, was der Stuhl kann und was jede Fähigkeit gerade zu melden hat.
 * Ihre Blätter — Raumakte, Tafel — bleiben ihre eigenen und liegen wie bisher
 * ganzseitig über der Karte (`views.css`, `.role--seat`).
 *
 * **Was die Karte zeigt, ist die Vereinigung**: Lampen nur mit Schalttafel,
 * Fracht und Linien nur mit Archiv — und **niemanden, der sich bewegt**, nie:
 * Ein heller Raum ist zu sehen, aber nicht, ob das Monster darin steht. Das
 * ist die Regel aller drei Rollen, und sie bleibt auch zusammen.
 */
export function mountSeatView(host: RoleHost, abilities: Iterable<Ability>): SeatRoleView {
  return new SeatView(host, abilities);
}

export interface SeatRoleView extends RoleView {
  /** Die eine Karte — für Tests und für den, der wissen will, was sie zeigt. */
  readonly map: MapView;
  /** Was der Stuhl hält, in der Reihenfolge der Tafel. */
  readonly abilities: readonly Ability[];
  readonly scout: ScoutRoleView | null;
  readonly panel: PanelRoleView | null;
  readonly archive: ArchiveRoleView | null;
  /** Ob gerade ein Blatt — Raumakte oder Tafel — über der Karte liegt. */
  readonly sheetOpen: boolean;
  viewport(): { x: number; y: number; w: number; h: number } | null;
}

class SeatView implements SeatRoleView {
  readonly element = el('div', 'role role--seat');
  readonly map: MapView;
  readonly abilities: readonly Ability[];
  readonly scout: ScoutRoleView | null;
  readonly panel: PanelRoleView | null;
  readonly archive: ArchiveRoleView | null;
  private readonly bar = el('div', 'role__bar');
  private readonly toast = new Toast();
  private barText = '';

  constructor(
    private readonly host: RoleHost,
    abilities: Iterable<Ability>,
  ) {
    const held = new Set(abilities);
    this.abilities = ABILITIES.filter((ability) => held.has(ability));
    const has = (ability: Ability): boolean => held.has(ability);
    this.map = new MapView({
      // Der Grundriss mit Türen und Möbeln; Lampen mit Schalttafel, Fracht
      // mit Archiv — und nichts, was atmet.
      layers: {
        ...PANEL_LAYERS,
        lights: has('panel'),
        items: has('archive'),
        routes: has('archive'),
        entities: false,
        visibility: false,
        objectives: false,
      },
      markers: 'none',
      mode: 'omniscient',
      minScale: 5,
      maxScale: 40,
      routes: () => this.archive?.supplyLines() ?? [],
      overlay: (ctx, view) => {
        this.archive?.paintTargets(ctx, view);
        this.scout?.paint(ctx, view);
      },
      // **Wer nichts schalten kann, erfährt es** — statt einer Tür, die auf
      // den Tipp nicht antwortet. Und ein Zimmer öffnet die Akte, wenn es eine
      // gibt; sonst sagt die Karte nur seinen Namen, wie beim Späher.
      onDoorClick: (id) =>
        this.panel ? this.panel.tapDoor(id) : this.toast.say('Türen schaltet nur die Schalttafel.'),
      onLightClick: (id) =>
        this.panel
          ? this.panel.tapLight(id)
          : this.toast.say('Lampen schaltet nur die Schalttafel.'),
      onRoomClick: (id) =>
        this.archive ? this.archive.open(id) : this.toast.say(roomName(this.host.snapshot(), id)),
      // **Kein eigener Griff für Fracht** — mit Absicht. Die Karte prüft
      // Fracht vor Türen (`MapView.tap`), und an vielen Türen steht eine Kiste
      // im Fangradius: Der Tipp auf die Tür öffnete dann die Akte statt zu
      // sperren. Ohne den Griff fällt der Tipp durch — Tür, Lampe, sonst das
      // Zimmer, und dessen Akte ist genau das, was der Tipp auf die Kiste
      // aufgeschlagen hätte (`archiveRole.openItem`).
    });
    this.map.element.classList.add('role__map');
    this.scout = has('scout') ? mountScoutView(host, this.map) : null;
    this.panel = has('panel') ? mountPanelView(host, this.map) : null;
    this.archive = has('archive') ? mountArchiveView(host, this.map) : null;
    this.element.classList.toggle('has-corner', !!this.panel);
    this.element.append(this.map.element, this.bar, this.toast.element);
    for (const part of [this.scout, this.panel, this.archive])
      if (part) this.element.append(part.element);
    this.renderBar();
  }

  get sheetOpen(): boolean {
    return !!this.panel?.sheetOpen || !!this.archive?.opened;
  }

  update(dt: number): void {
    const snapshot = this.host.snapshot();
    this.map.setSnapshot(snapshot);
    // Liegt ein Blatt darüber, wird die Karte darunter nicht gezeichnet: eine
    // Leinwand, die niemand sieht, ist je Bild ein ganzer Grundriss umsonst.
    if (!this.sheetOpen) this.map.draw();
    this.scout?.update(dt);
    this.panel?.update(dt);
    this.archive?.update(dt);
    this.toast.step(dt);
    this.renderBar();
  }

  /** Das Loch für die 3D-Welt gehört dem Archivar — solange seine Akte offen ist. */
  viewport(): { x: number; y: number; w: number; h: number } | null {
    return this.archive?.viewport() ?? null;
  }

  /**
   * **Die eine Zeile oben**: je Fähigkeit ihr Name und dahinter, was sie
   * gerade zu sagen hat — die nächste Peilung, gesperrt und hell, die
   * Systeme. Neu geschrieben nur bei Änderung; sie steht je Bild an.
   */
  private renderBar(): void {
    const parts: Array<[string, string]> = [];
    if (this.scout) parts.push([ABILITY_LABELS.scout, this.scout.status]);
    if (this.panel) parts.push([ABILITY_LABELS.panel, this.panel.status]);
    if (this.archive) parts.push([ABILITY_LABELS.archive, this.archive.status]);
    const text = parts.map(([label, status]) => `${label}:${status}`).join('|');
    if (text === this.barText) return;
    this.barText = text;
    this.bar.replaceChildren(
      ...parts.map(([label, status]) => {
        const cell = el('span', 'role__bar-cell');
        cell.append(el('strong', '', label.toUpperCase()), el('span', '', status));
        return cell;
      }),
    );
  }

  dispose(): void {
    this.scout?.dispose();
    this.panel?.dispose();
    this.archive?.dispose();
    this.map.dispose();
    this.element.remove();
  }
}
