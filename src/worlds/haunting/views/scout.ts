import { MapView } from '../map/mapView';
import { emptySnapshot, type MapEntity, type MapPoint, type MapSnapshot } from '../map/mapSnapshot';
import type { RoleHost, RoleView } from '../registry/roles';
import { el, key } from './dom';
import { MapOverlay, dot } from './mapOverlay';

/**
 * **Der Späher** — die Karte, und darauf zwei Punkte, die springen.
 *
 * Ein grüner für den Techniker, ein roter für das Monster. Sie zeigen die
 * Stelle **nicht** laufend: Alle `SCOUT_PERIOD` Sekunden kommt eine neue
 * Peilung, der Punkt springt dorthin und leuchtet hell auf, und danach
 * verblasst er, bis die nächste Peilung ihn wieder aufleuchten lässt.
 * Dazwischen wird nichts geschätzt und nichts interpoliert — ein Punkt, der
 * wandert, wäre ein Live-Bild, und das hat in diesem Van niemand.
 *
 * Fracht, Konsolen, Schalter: nichts davon. Der Späher sagt „im Reaktor,
 * Richtung Norden", und wo der Reaktor ist, wissen die anderen.
 */

/** Wie viele Sekunden zwischen zwei Peilungen liegen. */
export const SCOUT_PERIOD = 3.5;
/** Wie blass ein Punkt am Ende wird — nicht unsichtbar: Die letzte Stelle bleibt lesbar. */
export const SCOUT_FLOOR = 0.2;

export const PLAYER_COLOR = '#5ee0a0';
export const MONSTER_COLOR = '#ff4d55';

export interface ScoutMarker {
  id: string;
  kind: 'player' | 'monster';
  label: string;
  at: MapPoint;
  /** 1 im Augenblick der Peilung, 0 kurz vor der nächsten. */
  glow: number;
}

export class ScoutRole implements RoleView {
  readonly element = el('div', 'role role--scout');
  readonly map: MapView;
  private readonly overlay: MapOverlay;
  private readonly foot = el('p', 'role__foot');
  private snapshot: MapSnapshot = emptySnapshot();
  private samples: Array<Omit<ScoutMarker, 'glow'>> = [];
  /** Sekunden seit der letzten Peilung — beginnt fällig, damit die erste sofort kommt. */
  private since = SCOUT_PERIOD;
  private footText = '';

  constructor(private readonly host: RoleHost) {
    this.map = new MapView({
      layers: { items: false, entities: false, visibility: false, routes: false },
      markers: 'none',
      mode: 'omniscient',
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
        `Grün ist der Techniker, rot das Monster. Eine neue Peilung alle ${SCOUT_PERIOD.toLocaleString('de-DE')} s — dazwischen bleibt der Punkt stehen und verblasst.`,
      ),
      box,
      tools,
      this.foot,
    );
  }

  /** Die Punkte, wie sie gerade gezeichnet werden — für Tests und Anzeigen. */
  markers(): ScoutMarker[] {
    const glow = Math.max(0, 1 - this.since / SCOUT_PERIOD);
    return this.samples.map((sample) => ({ ...sample, at: { ...sample.at }, glow }));
  }

  /** Sekunden bis zur nächsten Peilung. */
  get countdown(): number {
    return Math.max(0, SCOUT_PERIOD - this.since);
  }

  update(dt: number): void {
    this.snapshot = this.host.snapshot();
    this.since += Math.max(0, dt);
    if (this.since >= SCOUT_PERIOD) {
      this.since = 0;
      this.samples = this.snapshot.entities.filter(isTracked).map((entity) => ({
        id: entity.id,
        kind: entity.kind === 'monster' ? 'monster' : 'player',
        label: entity.label,
        at: { x: entity.at.x, z: entity.at.z },
      }));
    }
    this.map.setSnapshot(this.snapshot);
    this.map.draw();
    this.overlay.draw((ctx, map) => this.paint(ctx, map));
    const monster = this.samples.some((sample) => sample.kind === 'monster');
    const text = `${monster ? 'Kontakt' : this.snapshot.entities.some((e) => e.kind === 'monster') ? 'Peilung läuft' : 'Kein Monster aktiv'} · nächste Peilung in ${Math.ceil(this.countdown)} s`;
    if (text !== this.footText) {
      this.footText = text;
      this.foot.textContent = text;
    }
  }

  private paint(ctx: CanvasRenderingContext2D, map: MapView): void {
    const scale = map.getView().scale;
    const radius = Math.max(6, scale * 0.4);
    for (const marker of this.markers()) {
      const p = map.toScreen(marker.at.x, marker.at.z);
      const color = marker.kind === 'monster' ? MONSTER_COLOR : PLAYER_COLOR;
      dot(ctx, p, radius, color, SCOUT_FLOOR + (1 - SCOUT_FLOOR) * marker.glow, marker.glow);
    }
  }

  dispose(): void {
    this.overlay.dispose();
    this.map.dispose();
    this.element.remove();
  }
}

/** Wer einen Punkt bekommt: der Techniker (auch als Bot oder Mitspieler) und das Monster. */
function isTracked(entity: MapEntity): boolean {
  return (
    entity.kind === 'player' ||
    entity.kind === 'bot' ||
    entity.kind === 'peer' ||
    entity.kind === 'monster'
  );
}
