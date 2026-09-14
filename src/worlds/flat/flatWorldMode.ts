import './flatWorld.css';
import { HUMAN_PROFILE } from '../nav/navProfile';
import { findPath, pullString, type PathPoint } from '../nav/navPath';
import { NO_TILE } from '../nav/navTile';
import { isTyping } from '../../core/textEntry';
import type { FloorModel, FloorPoint } from './flatFloor';
import { freshFigure, stepFigure, type FlatFigure, type FlatInput, IDLE_INPUT } from './flatFigure';
import type { FlatEntity, FlatSnapshot } from './flatSnapshot';
import { Joystick } from './joystick';
import { LevelMap } from './levelMap';

/**
 * **Die flache Welt** — jede Welt von oben, auf dem Telefon und im Browser.
 *
 * Ein DOM-Bildschirm über der 3D-Szene: die Ebenen-Karte (`levelMap.ts`),
 * darauf die eigene Figur, die der Stock (Daumen) oder die Tastatur (WASD,
 * Umschalt rennt, Strg duckt) über das Bodenmodell der Welt bewegt
 * (`flatFloor.ts`) — mit Kollision, Türen und Treppen aus demselben Graphen,
 * den auch die NPCs laufen. Ein Tipp auf die Karte lässt die Figur dorthin
 * gehen, über die Wegsuche des Graphen (`nav/navPath.ts`); der Knopf
 * „Benutzen" öffnet die Tür in Reichweite.
 *
 * Die Welt dahinter liefert nur den Boden, das Bild und die anderen Figuren
 * (`FlatWorldHost`) und erfährt, wo man steht, wenn man zurück in 3D geht.
 */
export interface FlatWorldHost {
  title: string;
  floor(): FloorModel;
  /** Das Bild der Welt — ohne Figuren, die kommen aus `entities`. */
  snapshot(): FlatSnapshot;
  entities(): FlatEntity[];
  /** Wo man anfängt und wohin man schaut. */
  start: FloorPoint & { yaw: number };
  /** Eine Tür umlegen — `false`, wenn die Welt sie nicht schaltet. */
  door?(id: string, open: boolean): boolean;
  /** Zurück in die 3D-Welt — fehlt, wo es keine gibt (Telefon). */
  leave?(figure: FlatFigure): void;
  notify(text: string): void;
}

/** Wie nah eine Tür sein muss, damit der Knopf sie meint. */
export const USE_REACH = 1.6;
/** Wie nah man einem Wegpunkt kommen muss, um ihn hinter sich zu lassen. */
const WAYPOINT_REACH = 0.35;

export class FlatWorldMode {
  readonly element = document.createElement('div');
  readonly map: LevelMap;
  readonly figure: FlatFigure;
  private readonly stick = new Joystick();
  private readonly head = document.createElement('div');
  private readonly levelLine = document.createElement('div');
  private readonly hint = document.createElement('span');
  private readonly useKey = document.createElement('button');
  private readonly leaveKey = document.createElement('button');
  private readonly toast = document.createElement('div');
  private toastTimer = 0;
  private readonly keys = new Set<string>();
  private route: PathPoint[] = [];
  private snapshot: FlatSnapshot | null = null;
  private snapshotVersion = -1;
  private readonly disposers: Array<() => void> = [];
  private disposed = false;

  constructor(private readonly host: FlatWorldHost) {
    this.figure = freshFigure(host.start, host.start.yaw);
    this.element.className = 'flat flat--world';
    this.map = new LevelMap({
      viewerId: 'player',
      minScale: 5,
      maxScale: 60,
      onTap: (at, level) => {
        this.walkTo({ x: at.x, z: at.z, level });
      },
    });
    this.map.element.setAttribute('aria-label', `${host.title} von oben`);

    this.head.className = 'flat__head';
    const title = document.createElement('strong');
    title.textContent = host.title;
    this.levelLine.className = 'flat__level';
    this.hint.textContent = 'Stock oder WASD · Tipp auf die Karte geht dorthin';
    this.head.append(title, this.levelLine, this.hint);

    this.leaveKey.className = 'flat__leave';
    this.leaveKey.type = 'button';
    this.leaveKey.textContent = 'Zurück in 3D';
    this.leaveKey.hidden = !host.leave;
    this.leaveKey.addEventListener('click', () => this.leave());

    const buttons = document.createElement('div');
    buttons.className = 'flat__buttons';
    this.useKey.className = 'flat__key flat__key--act';
    this.useKey.type = 'button';
    this.useKey.dataset['action'] = 'use';
    this.useKey.innerHTML = '<strong>Benutzen</strong><small>Tür in Reichweite</small>';
    this.useKey.addEventListener('click', () => this.use());
    buttons.append(this.useKey);

    this.toast.className = 'flat__toast';
    this.element.append(
      this.map.element,
      this.head,
      this.leaveKey,
      this.stick.element,
      buttons,
      this.toast,
    );
    this.listenKeys();
  }

  /** Ein Bild: Stock lesen, Figur bewegen, Karte zeichnen. */
  update(dt: number): void {
    if (this.disposed) return;
    const floor = this.host.floor();
    const input = this.input();
    if (input) this.route = [];
    stepFigure(floor, this.figure, input ?? this.follow() ?? IDLE_INPUT, dt);
    this.refreshSnapshot();
    if (this.snapshot) {
      this.snapshot.entities = [this.playerEntity(), ...this.host.entities()];
      this.map.setSnapshot(this.snapshot);
    }
    this.map.draw();
    const y = floor.height(this.figure);
    const count = floor.levels.length;
    this.levelLine.textContent =
      count > 1
        ? `Ebene ${this.figure.level + 1} von ${count} · ${y.toFixed(1)} m`
        : `${y.toFixed(1)} m`;
    const door = floor.nearestDoor(this.figure, USE_REACH);
    this.useKey.classList.toggle('is-ready', !!door && !!this.host.door);
    this.useKey.disabled = !door || !this.host.door;
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toast.classList.remove('is-live');
    }
  }

  private refreshSnapshot(): void {
    const fresh = this.host.snapshot();
    if (fresh !== this.snapshot || fresh.version !== this.snapshotVersion) {
      this.snapshot = fresh;
      this.snapshotVersion = fresh.version;
    }
  }

  private playerEntity(): FlatEntity {
    return {
      id: 'player',
      x: this.figure.x,
      z: this.figure.z,
      level: this.figure.level,
      yaw: this.figure.yaw,
      kind: 'player',
      moving: this.figure.moving,
    };
  }

  /** Was Stock oder Tasten wollen — `null`, wenn nichts. */
  private input(): FlatInput | null {
    const stick = this.stick.value;
    let x = stick.x,
      z = stick.z,
      sprint = stick.sprint;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) z -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) z += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) sprint = true;
    const crouch = this.keys.has('ControlLeft') || this.keys.has('ControlRight');
    const magnitude = Math.hypot(x, z);
    if (magnitude < 1e-3) return null;
    if (magnitude > 1) {
      x /= magnitude;
      z /= magnitude;
    }
    return { x, z, sprint, crouch };
  }

  /** Den angetippten Weg ablaufen: zum nächsten Punkt, bis keiner mehr da ist. */
  private follow(): FlatInput | null {
    while (this.route.length) {
      const next = this.route[0]!;
      const dx = next.x - this.figure.x,
        dz = next.z - this.figure.z;
      const gap = Math.hypot(dx, dz);
      if (gap < WAYPOINT_REACH) {
        this.route.shift();
        continue;
      }
      return { x: dx / gap, z: dz / gap, sprint: false };
    }
    return null;
  }

  /** Ein Tipp auf die Karte: den Weg über den Graphen suchen und losgehen. */
  walkTo(goal: FloorPoint): boolean {
    const floor = this.host.floor();
    const graph = floor.graph;
    const from = floor.nearestTile(this.figure);
    const to = graph.nearest(goal.x, goal.z, graph.levelY(goal.level) + 0.1);
    if (from === NO_TILE || to === NO_TILE) {
      this.say('Dorthin führt kein Weg.');
      return false;
    }
    const options = { profile: HUMAN_PROFILE, radius: this.figure.radius };
    const path = findPath(graph, from, to, options);
    if (path.tiles.length < 1) {
      this.say('Dorthin führt kein Weg.');
      return false;
    }
    const points = pullString(graph, path.tiles, options);
    // Der letzte Punkt ist die angetippte Stelle selbst, wenn sie begehbar ist.
    this.route = points.slice(1);
    if (path.complete && floor.walkable(goal, this.figure.radius))
      this.route.push({ tile: to, x: goal.x, z: goal.z, tight: false });
    if (!path.complete) this.say('So weit es geht.');
    return true;
  }

  /** Die Tür in Reichweite umlegen. */
  use(): void {
    const floor = this.host.floor();
    const door = floor.nearestDoor(this.figure, USE_REACH);
    if (!door || !this.host.door) return;
    const facts = floor.graph.door(door.id);
    if (!facts) return;
    if (facts.barred) {
      this.say('Die Tür ist verriegelt.');
      return;
    }
    if (!this.host.door(door.id, !facts.open)) this.say('Die Tür rührt sich nicht.');
  }

  leave(): void {
    if (!this.host.leave) return;
    this.host.leave(this.figure);
  }

  private say(text: string): void {
    this.toast.textContent = text;
    this.toast.classList.add('is-live');
    this.toastTimer = 2.2;
  }

  private listenKeys(): void {
    const down = (event: KeyboardEvent): void => {
      if (isTyping()) return;
      this.keys.add(event.code);
      if (event.code === 'KeyE' || event.code === 'Space') {
        this.use();
        event.preventDefault();
      }
      if (event.code === 'KeyF') this.map.fit();
    };
    const up = (event: KeyboardEvent): void => {
      this.keys.delete(event.code);
    };
    const blur = (): void => this.keys.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    this.disposers.push(() => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    });
  }

  dispose(): void {
    this.disposed = true;
    for (const off of this.disposers) off();
    this.disposers.length = 0;
    this.stick.dispose();
    this.map.dispose();
    this.element.remove();
  }
}
