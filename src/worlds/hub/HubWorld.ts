import * as THREE from 'three';
import type { WorldContext, WorldDefinition, WorldPreview } from '../../core/types';
import { WORLDS } from '../index';
import { TextPlane } from '../../ui/TextPlane';
import { createSky } from '../shared/environment';
import { GridWorld } from '../grid/GridWorld';
import type { GridPlan } from '../grid/gridPlan';
import type { PlanSolidKind } from '../grid/solids';
import type { Props } from '../grid/fixtures/index';
import type { Handedness } from '../../core/XRInput';
import { TILE, dirX, dirZ, tileCentreX, tileCentreZ, tileKey } from '../nav/navTile';
import { gatesIn, spinGate } from './gate';
import { CORRIDOR_WIDTH, HALL_HALF, hubGrid, type HubCorridor } from './hubGrid';

/**
 * **Der Hub: hell, ruhig, und jede andere Welt ist ein Tor weit weg.**
 *
 * Er steht seit P4 auf dem **Kachelgitter** (`grid/GridWorld.ts`) wie das
 * Dunkelhaus, der Schießstand und Dust. Vorher war er eine Welt aus
 * handgerechneten Metern, die ihre Halle, ihre Gänge und ihre Tore selbst
 * baute — und die Tore waren Zeigerziele, die es nur hier gab. Der Umzug
 * bringt drei Sachen, die vorher nicht zu haben waren:
 *
 * - **Dieselbe Halle für alle.** Wer in der Brille steht und wer _von oben_
 *   spielt, stehen im selben Raum; die Kamera ist ein Blickwinkel und keine
 *   zweite Welt (E1).
 * - **Ein Tor ist ein Einbau** (`grid/fixtures/gate.ts`) und kein Möbel. Man
 *   geht hindurch, statt darauf zu zeigen — und jede andere Gitterwelt setzt
 *   sich mit **einer Zeile** ein Rücktor neben ihren Startpunkt.
 * - **Wände, Boden und Navigationskarte kommen aus dem Grundriss**
 *   (`hubGrid.ts`, mit Test). Ein Gang, den man nicht betreten kann, fällt in
 *   einer Millisekunde auf statt nach dem Aufsetzen.
 *
 * **Die Tore kommen beim Bau aus `WORLDS`** und nicht aus einer gespeicherten
 * Datei (E7). Deshalb ist der Hub auch die eine Gitterwelt, an der **nicht**
 * gebaut wird (`editable()` bleibt falsch): Ein gespeicherter Hub wäre einer,
 * in dem die Tore von letzter Woche stehen, und die neue Welt in der Registry
 * hätte keines.
 *
 * Was von Hand bleibt, ist die **Ausstattung**: Himmel, Nebel, der Ring auf
 * dem Hallenboden, die Lichtbänder in den Gängen und die beiden Tafeln. Das
 * ist der Teil, der eine Halle von einem Grundriss unterscheidet.
 */
export class HubWorld extends GridWorld {
  /** Die Welten hinter den Toren — dieselbe Liste, aus der `layout()` baut. */
  private readonly targets: WorldDefinition[] = hubTargets();
  /** Die beiden Tafeln in der Halle: eigene Textur, also eigenes Aufräumen. */
  private readonly panels: TextPlane[] = [];

  protected override worldId(): string {
    return 'hub';
  }

  protected override editorTitle(): string {
    return 'Hub';
  }

  protected override layout(): GridPlan {
    return hubGrid(this.targets.length, (index) => this.gateProps(index)).plan;
  }

  /**
   * Was an einem Tor eingestellt ist: die Welt dahinter, ihr Name, ihre Farbe.
   *
   * Flach und aus drei Feldern, damit `Props` bleibt, was es ist — was in eine
   * Datei passt. Die Farbe ist eine **Zahl** und kein `#rrggbb`: Sie kommt aus
   * der Registry als Zahl, und eine Übersetzung hin und zurück wäre zwei
   * Stellen, an denen sie schiefgehen kann.
   */
  private gateProps(index: number): Props {
    const world = this.targets[index]!;
    return {
      world: world.id,
      label: world.title,
      accent: world.accent,
      // Die Zeile unter dem Namen, wie sie schon immer am Tor stand.
      note: world.description,
    };
  }

  protected override skyColor(): number {
    return 0x0a1020;
  }

  protected override lightIntensity(): number {
    return 1.15;
  }

  protected override welcome(): string {
    return 'Wähle eine Welt — auf ein Tor im Gang stellen, oder der Button an deiner Hand';
  }

  /**
   * **Leere Hände.** Der Hub ist der Ort, an dem man ankommt, und nicht der,
   * an dem man schießt; die Werkzeuge hängen in den Welten dahinter.
   */
  protected override beltLoadout(): ReadonlyArray<readonly [string, Handedness]> {
    return [];
  }

  /** Im Hub steht nichts herum, was umfallen könnte. */
  protected override buildProps(): void {}

  /** Die Töne von früher: blaue Halle, dunkle Wände, helle Kanten. */
  protected override tint(): Partial<Record<PlanSolidKind, number>> {
    return {
      floor: 0x3a4666,
      wall: 0x2f3b5e,
      steel: 0x9aa6bd,
      glow: 0x9ec4ff,
    };
  }

  protected override horizonColor(): number {
    return 0x1d2740;
  }

  protected override horizonLine(): number {
    return 0x4aa8ff;
  }

  protected override spawnPoint(): THREE.Vector3 {
    // Die Mittelkachel der Halle — nie eine Torkachel, dafür sorgt der
    // Grundriss (`hubGrid.ts`, mit Test).
    return hallCentre();
  }

  protected override spawnYaw(): number {
    // Nach Norden, also in den ersten Gang hinein: Was man beim Ankommen sieht,
    // sind vier Schilder.
    return 0;
  }

  protected override buildEnvironment(): void {
    super.buildEnvironment();

    this.root.add(createSky(0x1b3358, 0x05070d));

    const hub = hubGrid(this.targets.length);
    const middle = hallCentre();
    this.root.add(buildHallRing(middle));
    for (const corridor of hub.corridors) this.root.add(buildCorridorLights(corridor, middle));
    this.root.add(this.buildSigns(middle));
  }

  override async init(ctx: WorldContext): Promise<void> {
    await super.init(ctx);
    // Tiefe frisst Farbe: Ohne Nebel liegt der letzte Gang so klar da wie die
    // Halle, und die Anlage sieht nach Plan aus statt nach Raum.
    ctx.scene.fog = new THREE.Fog(0x0a1020, 40, 260);
  }

  override dispose(ctx: WorldContext): void {
    ctx.scene.fog = null;
    for (const panel of this.panels) panel.dispose();
    this.panels.length = 0;
    super.dispose(ctx);
  }

  /**
   * **Der Hub zum Ansehen** — dieselbe Halle, dieselben Gänge, dieselben Tore,
   * nur ohne Spieler (`tools.html`).
   *
   * Gebaut wird er von `PortalWorld.preview()` mit **denselben Zeilen** wie im
   * Spiel; was hier dazukommt, ist die Bewegung. Die Tore finden sich dabei
   * über ihren eigenen Baum (`gatesIn`) und nicht über die Einbauten: Die
   * Vorschau hat keinen `update`-Takt, und eine Welt, die ihre Registry für ein
   * Bild anwirft, ist eine, die in der Vorschau anders läuft als im Spiel.
   */
  override preview(): WorldPreview {
    const view = super.preview();
    const gates = gatesIn(this.root);
    return {
      ...view,
      animate: (time) => gates.forEach((gate, index) => spinGate(gate, time, index)),
      // **Tafeln zuerst.** Die Vorschau räumt sonst nur Formen und Materialien
      // weg (`disposeTree`); eine Tafel hat darüber hinaus eine Leinwand und
      // eine Textur, und davon gibt es hier eine je Tor.
      dispose: () => {
        this.root.traverse((one) => {
          if (one instanceof TextPlane) one.dispose();
        });
        this.panels.length = 0;
        view.dispose?.();
      },
    };
  }

  /** Die Überschrift über dem ersten Gang und der Hinweis an der Wand. */
  private buildSigns(middle: THREE.Vector3): THREE.Group {
    const group = new THREE.Group();
    group.name = 'hub-signs';

    const title = new TextPlane({
      width: 4.4,
      height: 1.3,
      title: 'Baumgartner VR',
      body: 'Wähle eine Welt – auf ein Tor im Gang stellen oder über den Button an deiner Hand.',
      align: 'center',
      accent: 0x4aa8ff,
    });
    // Über der Mündung des ersten Gangs: hoch genug, um über den Toren zu
    // stehen, tief genug, um beim Blick geradeaus im Bild zu sein.
    title.position.set(middle.x, 3.6, middle.z - (HALL_HALF + 0.5) * TILE + 0.2);
    group.add(title);

    const hint = new TextPlane({
      width: 2.4,
      height: 0.78,
      title: 'Steuerung',
      body: 'Beide Hände: Menü-Button. Zielen + Trigger wählt. Stick: gehen, rechts: drehen.',
      accent: 0x9d7bff,
    });
    hint.position.set(middle.x - (HALL_HALF - 0.6) * TILE, 1.6, middle.z + HALL_HALF * TILE);
    hint.rotation.y = Math.PI / 4.5;
    group.add(hint);

    this.panels.push(title, hint);
    return group;
  }
}

/**
 * **Die Mitte der Halle in Metern.**
 *
 * Über den Kachelschlüssel und nicht über die Kachelzahl: `tileCentreX` nimmt
 * einen **Schlüssel** (`nav/navTile.ts`), und wer ihm die blanke 0 gibt,
 * bekommt die Kachel −1024 — also den Rand des Gitters, 2,5 km weit weg. Das
 * ist keine krumme Zahl, die man sähe, sondern ein Spieler, der beim Start ins
 * Leere fällt.
 */
function hallCentre(): THREE.Vector3 {
  const middle = tileKey(0, 0, 0);
  return new THREE.Vector3(tileCentreX(middle), 0, tileCentreZ(middle));
}

/** Jede Welt außer dem Hub selbst, in der Reihenfolge der Registry. */
export function hubTargets(): WorldDefinition[] {
  return WORLDS.filter((world) => world.id !== 'hub');
}

/**
 * Der leuchtende Ring auf dem Hallenboden.
 *
 * Das Einzige, was vom alten runden Saal übrig ist — und das Einzige, was von
 * ihm gebraucht wird: Er sagt, wo die Halle aufhört und ein Gang anfängt, und
 * er tut es in einem Bild statt in einer Zeile.
 */
function buildHallRing(middle: THREE.Vector3): THREE.Mesh {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry((HALL_HALF + 0.5) * TILE - 0.6, 0.06, 8, 96),
    new THREE.MeshBasicMaterial({ color: 0x4aa8ff, toneMapped: false }),
  );
  ring.name = 'hall-ring';
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(middle.x, 0.04, middle.z);
  return ring;
}

/**
 * **Licht in einem Gang**: zwei Bänder an den Wänden und zwei Lampen dazwischen.
 *
 * Ein Gang ohne eigenes Licht ist ein schwarzes Loch, in das niemand
 * hineingeht — und seit er ein Dach hat, gilt das doppelt.
 */
function buildCorridorLights(corridor: HubCorridor, middle: THREE.Vector3): THREE.Group {
  const group = new THREE.Group();
  group.name = 'corridor-lights';

  const ahead = new THREE.Vector3(dirX(corridor.dir), 0, dirZ(corridor.dir));
  const side = new THREE.Vector3(-ahead.z, 0, ahead.x);
  const from = (corridor.from - 0.5) * TILE;
  const to = (corridor.to + 0.5) * TILE;
  const run = to - from;
  const across = (CORRIDOR_WIDTH / 2) * TILE;
  const at = (along: number, offset: number): THREE.Vector3 =>
    new THREE.Vector3(
      middle.x + ahead.x * along + side.x * offset,
      0,
      middle.z + ahead.z * along + side.z * offset,
    );

  for (const sign of [-1, 1] as const) {
    const strip = new THREE.Mesh(
      // Gebaut entlang der Gangachse: `run` in die Länge, ein Handbreit in die
      // Quere — was quer liegt, ist ein Streifen an der Decke und kein Band.
      new THREE.BoxGeometry(Math.abs(ahead.x) * run + 0.06, 0.06, Math.abs(ahead.z) * run + 0.06),
      new THREE.MeshBasicMaterial({ color: 0x9ec4ff, toneMapped: false }),
    );
    const place = at(from + run / 2, sign * (across - 0.08));
    strip.position.set(place.x, 2.45, place.z);
    group.add(strip);
  }

  for (const part of [0.3, 0.75]) {
    const lamp = new THREE.PointLight(0xbcd8ff, 26, CORRIDOR_WIDTH * TILE * 2, 2);
    const place = at(from + run * part, 0);
    lamp.position.set(place.x, 2.3, place.z);
    group.add(lamp);
  }

  return group;
}
