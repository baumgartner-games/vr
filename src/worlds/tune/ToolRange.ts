import * as THREE from 'three';
import { GRAB_GLOW, GRAB_TINT } from '../../core/colors';
import { StandFrame } from './StandFrame';
import { DEFAULT_RANGE, clampRange, type RangeSettings } from './rangeSettings';

/** Wie nah ein Werkzeug an den Halter muss, damit es einrastet. */
export const MOUNT_REACH = 0.3;

/** Wie weit der Ausleger mit den Griffen zur Seite steht — von der Mitte weg. */
const BOOM = -0.55;

/** Wie weit der Kreis auf dem Boden reicht, in Metern. */
export const ZONE_RADIUS = 0.95;

const _world = new THREE.Vector3();

/** Was eine Hand hier anfassen kann. */
export type RangeGrip = 'height' | 'place';

/**
 * Der **erste** Justierstand im Schießgang: wie halte ich das Werkzeug?
 *
 * Für ein Werkzeug reicht ein Tisch nicht: eine Pistole liegt nicht richtig
 * oder falsch, sie **zeigt** richtig oder falsch. Und wohin sie zeigt, sieht
 * man an nichts so gut wie an einer Zielscheibe am Ende eines Gangs. Die
 * Aufnahme, die Scheibe und die Linie dazwischen kommen deshalb von
 * `StandFrame` — beide Stände haben sie, weil beide nach vorn zielen.
 *
 * Was danach gemessen wird, ist ausschließlich die **Hand**; der Rest steht
 * schon fest.
 *
 * Der Stand selbst ist dabei im Weg, und zwar immer. Also ist er leer
 * **durchsichtig** — gerade sichtbar genug, um zu wissen, wohin man das
 * Werkzeug hält — und mit Werkzeug darin **ganz weg**. Übrig bleibt die Linie
 * bis in die Scheibe.
 *
 * Und auf dem Boden liegt ein **Kreis**. Er ist die einzige Stelle im Spiel,
 * an der ein Schritt etwas schaltet: wer hineintritt, macht die Welt
 * durchsichtig und seine **virtuelle Hand unsichtbar**. Damit sieht man in
 * einer AR-Sitzung die **echte** Hand am virtuellen Werkzeug und kann sie
 * daran legen, statt zu raten, wo eine Boxhand aufhört und die eigene anfängt.
 * Ein Knopf dafür gab es schon; nur drückt man ihn genau dann, wenn beide
 * Hände voll sind.
 */
export class ToolRange extends StandFrame {
  private readonly cradle: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  /** Der Kreis auf dem Boden und sein Material — er leuchtet, wenn er wirkt. */
  private readonly zone: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private occupied = false;
  private settings: RangeSettings = clampRange({});

  constructor() {
    super('tool-range', BOOM, DEFAULT_RANGE.x / 100);

    this.cradle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.3), this.standMaterial);
    this.cradle.position.y = -0.03;
    this.station.add(this.cradle);
    this.beam.visible = false;

    // Ein Ring und keine Scheibe: eine gefüllte Fläche auf dem Boden sieht in
    // AR aus wie ein Loch, ein Ring wie eine Markierung.
    this.zone = new THREE.Mesh(
      new THREE.RingGeometry(ZONE_RADIUS - 0.06, ZONE_RADIUS, 48),
      new THREE.MeshBasicMaterial({
        color: GRAB_TINT,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    this.own(this.zone.material);
    this.zone.rotation.x = -Math.PI / 2;
    this.zone.position.y = 0.012;
    this.add(this.zone);

    this.apply(this.settings);
  }

  /** Wo der Stand steht und wie hoch — der eine Weg dorthin. */
  apply(settings: RangeSettings): void {
    this.settings = settings;
    this.place(settings.height / 100, settings.x / 100, settings.z / 100);
    // Der Kreis liegt unter dem Stand, nicht unter seiner Scheibe: er markiert,
    // wo man sich hinstellt.
    this.zone.position.set(settings.x / 100, 0.012, settings.z / 100);
  }

  /**
   * Ein Werkzeug sitzt drin — oder nicht.
   *
   * Voll ist der Stand **ganz weg**: was man dann ansieht, ist die Hand am
   * Werkzeug, und ein Möbelstück mitten darin macht genau die Beurteilung
   * unmöglich, für die man hergekommen ist. Leer bleibt er durchsichtig
   * stehen, sonst wüsste niemand, wohin das Werkzeug soll.
   */
  setOccupied(occupied: boolean): void {
    if (occupied === this.occupied) return;
    this.occupied = occupied;
    this.cradle.visible = !occupied;
    this.setColumnVisible(!occupied);
    this.beam.visible = occupied;
  }

  /** Wie weit ein Punkt waagerecht von der Mitte des Kreises weg ist. */
  zoneDistance(worldPoint: THREE.Vector3): number {
    this.zone.updateWorldMatrix(true, false);
    this.zone.getWorldPosition(_world);
    return Math.hypot(worldPoint.x - _world.x, worldPoint.z - _world.z);
  }

  /** Der Kreis leuchtet, solange er wirkt. */
  setZoneActive(active: boolean): void {
    this.zone.material.color.setHex(active ? GRAB_GLOW : GRAB_TINT);
    this.zone.material.opacity = active ? 0.85 : 0.45;
  }

  override setGlow(what: RangeGrip | 'mount' | null): void {
    if (what === this.lit) return;
    super.setGlow(what);
    this.setStandGlow(what === 'mount');
  }

  dispose(): void {
    this.disposeFrame();
  }
}
