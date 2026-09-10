import { MapView, type MapRoute } from '../map/mapView';
import { emptySnapshot, type MapItem, type MapSnapshot } from '../map/mapSnapshot';
import { MARKS, namesakes, roomCode, roomOf } from '../house';
import { lockerCode, repairsFor, type Repair } from '../mission';
import { atHome } from '../archiveView';
import type { RoleHost, RoleView } from '../registry/roles';
import { el, key } from './dom';
import { extrasOf, type ViewExtras } from './extras';
import { MapOverlay, tag } from './mapOverlay';

/**
 * **Der Archivar** — die ganze Karte, und je Zimmer eine Akte.
 *
 * Auf der Karte sieht er, **wo die Fracht liegt** und **wohin sie muss**: Von
 * jeder noch nicht geholten Fracht führt eine gestrichelte Linie zu der
 * Konsole, an der sie gebraucht wird, und am Ziel steht der Raumname ohnehin.
 * Trägt der Techniker sie schon, steht am Ziel nur noch „hierher". Wer sich
 * bewegt, ist nicht zu sehen — kein Techniker, kein Monster: Sein Blatt ist
 * ein Grundriss und keine Überwachung.
 *
 * Ein Tipp auf ein Zimmer schlägt dessen **Akte** auf: das Zimmer von oben
 * (in der 3D-Welt gezeichnet von der Welt in ein Loch, `viewport()`; in der
 * 2D-Welt eine herangezoomte Karte), darüber die **Codes, groß**, darunter
 * die Fakten. Eine Missionsliste gibt es nicht mehr — was zu tun ist, steht
 * auf der Karte, und die Codes stehen dort, wo sie hingehören: beim Zimmer.
 */
const ROUTE_COLOR = '#f0b64a';
const CARRIED_COLOR = '#8ff0b0';

type Mode = 'map' | 'room';

/** Wie weit ein Finger wandern darf und trotzdem ein Tipp bleibt, in Punkten. */
const TAP_SLOP = 8;
/** Wie weit zwei Finger mindestens auseinanderliegen müssen, damit gezoomt wird. */
const PINCH_MIN = 12;
/** Wie stark das Mausrad zoomt, je Punkt Raddrehung. */
const WHEEL_RATE = 0.0016;

export class ArchiveRole implements RoleView {
  readonly element = el('div', 'role role--archive');
  readonly map: MapView;
  /** Die herangezoomte Karte des aufgeschlagenen Zimmers — nur in der 2D-Welt. */
  readonly roomMap: MapView;
  private readonly overlay: MapOverlay;
  private readonly mapPage = el('div', 'role__page');
  private readonly roomPage = el('div', 'role__page role-archive__room');
  private readonly title = el('h2', 'role-archive__title');
  private readonly scan = el('div', 'role-archive__scan');
  private readonly scanTools = el('div', 'role-archive__scan-tools');
  private readonly homeKey = key('role__key role__key--icon', '⤢', { home: '' });
  private readonly codes = el('div', 'role-archive__codes');
  private readonly sheet = el('div', 'haunt__sheet role-archive__sheet');
  private readonly foot = el('p', 'role__foot');
  private readonly extras: ViewExtras | null;
  private snapshot: MapSnapshot = emptySnapshot();
  private mode: Mode = 'map';
  private room = '';
  private written = '';
  private footText = '';
  private fitted = '';
  private readonly touches = new Map<number, { x: number; y: number }>();
  private grab: { id: number; x: number; y: number; far: number } | null = null;
  private span = 0;

  constructor(private readonly host: RoleHost) {
    this.extras = extrasOf(host);
    this.map = new MapView({
      layers: { entities: false, visibility: false },
      markers: 'none',
      mode: 'omniscient',
      routes: () => this.routes(),
      onRoomClick: (id) => this.open(id),
      onItemClick: (id) => {
        const item = this.snapshot.items.find((one) => one.id === id);
        if (item) this.open(item.roomId);
      },
    });
    this.overlay = new MapOverlay(this.map);
    this.roomMap = new MapView({
      layers: { entities: false, visibility: false, routes: false },
      markers: 'none',
      mode: 'omniscient',
      minScale: 8,
      maxScale: 120,
      view: { centreX: 0, centreZ: 0, scale: 20, rotation: 0 },
    });

    const box = el('div', 'role__map');
    box.append(this.map.element);
    const tools = el('div', 'role__tools');
    tools.append(key('role__key', 'Ganze Station', { fit: '' }));
    this.mapPage.append(
      el(
        'p',
        'role__lead',
        'Fracht und wohin sie muss. Ein Zimmer antippen öffnet seine Akte mit den Codes.',
      ),
      box,
      tools,
      this.foot,
    );

    const head = el('div', 'role-archive__head');
    head.append(key('role__key', '← Karte', { back: '' }), this.title);
    this.scan.tabIndex = 0;
    this.scan.setAttribute('aria-label', 'Raumansicht von oben');
    const zoomOut = key('role__key role__key--icon', '−', { zoom: 'out' });
    zoomOut.setAttribute('aria-label', 'Raumansicht verkleinern');
    const zoomIn = key('role__key role__key--icon', '+', { zoom: 'in' });
    zoomIn.setAttribute('aria-label', 'Raumansicht vergrößern');
    this.scanTools.append(zoomOut, zoomIn, this.homeKey);
    this.homeKey.setAttribute('aria-label', 'Wieder das ganze Zimmer zeigen');
    this.scan.append(this.scanTools);
    this.roomPage.append(head, this.scan, this.codes, this.sheet);
    this.roomPage.hidden = true;
    this.element.append(this.mapPage, this.roomPage);

    this.element.addEventListener('click', (event) => this.click(event));
    this.scan.addEventListener('keydown', (event) => this.keys(event));
    this.watchDrag();
  }

  /** Welche Akte aufgeschlagen ist — `''` heißt: die Karte. */
  get selected(): string {
    return this.mode === 'room' ? this.room : '';
  }

  /** In der 3D-Welt: wohin die Welt das Zimmer zeichnen soll. Sonst `null`. */
  viewport(): { x: number; y: number; w: number; h: number } | null {
    if (this.mode !== 'room' || this.snapshot.source !== '3d') return null;
    const box = this.scan.getBoundingClientRect();
    if (box.width < 8 || box.height < 8) return null;
    return { x: box.left, y: box.top, w: box.width, h: box.height };
  }

  update(_dt: number): void {
    this.snapshot = this.host.snapshot();
    if (this.mode === 'map') {
      this.map.setSnapshot(this.snapshot);
      this.map.draw();
      this.overlay.draw((ctx, map) => this.paint(ctx, map));
      const open = this.jobs().filter((job) => job.status !== 'done').length;
      const text = open
        ? `${open} Teil${open === 1 ? '' : 'e'} noch zu holen oder zu bringen`
        : 'Alles geliefert · Techniker zurück zur Zentrale';
      if (text !== this.footText) {
        this.footText = text;
        this.foot.textContent = text;
      }
      return;
    }
    if (this.snapshot.source === 'flat') {
      this.roomMap.setSnapshot(this.snapshot);
      this.fitRoom();
      this.roomMap.draw();
    }
    this.homeKey.hidden =
      this.snapshot.source !== '3d' ||
      !this.extras?.archiveView ||
      atHome(this.extras.archiveView());
    this.writeRoom();
  }

  // --- die Karte -------------------------------------------------------------

  /** Die Aufgaben, wie die Karte sie braucht: Fracht, Konsole, Stand. */
  private jobs(): Array<{
    repair: Repair;
    cargo: MapItem | null;
    console: MapItem | null;
    status: 'waiting' | 'carried' | 'done';
  }> {
    const spec = this.extras?.spec();
    const state = this.extras?.state();
    if (!spec || !state) return [];
    return repairsFor(spec).map((repair) => {
      const task = spec.tasks.find((one) => one.id === repair.itemId);
      const cargo =
        this.snapshot.items.find((one) => one.kind === 'cargo' && one.roomId === task?.roomId) ??
        null;
      const console =
        this.snapshot.items.find((one) => one.kind === 'console' && one.roomId === repair.roomId) ??
        null;
      const status = state.done.includes(repair.itemId)
        ? 'done'
        : state.taken.includes(repair.itemId) || cargo?.state === 'taken'
          ? 'carried'
          : 'waiting';
      return { repair, cargo, console, status };
    });
  }

  /** Von der Fracht zur Konsole — gestrichelt, mit Zielring (`MapView`-Layer `routes`). */
  routes(): MapRoute[] {
    const out: MapRoute[] = [];
    for (const job of this.jobs()) {
      const goal =
        job.console?.at ?? this.snapshot.rooms.find((r) => r.id === job.repair.roomId)?.centre;
      if (!goal) continue;
      if (job.status === 'waiting' && job.cargo)
        out.push({
          id: job.repair.id,
          points: [job.cargo.at, goal],
          color: ROUTE_COLOR,
          goal: true,
        });
      else if (job.status === 'carried')
        out.push({ id: job.repair.id, points: [goal, goal], color: CARRIED_COLOR, goal: true });
    }
    return out;
  }

  private paint(ctx: CanvasRenderingContext2D, map: MapView): void {
    for (const job of this.jobs()) {
      const target = this.snapshot.rooms.find((room) => room.id === job.repair.roomId);
      if (job.status === 'waiting' && job.cargo && target) {
        const p = map.toScreen(job.cargo.at.x, job.cargo.at.z);
        tag(ctx, p, `${job.repair.item} → ${target.name}`, ROUTE_COLOR);
      } else if (job.status === 'carried') {
        const at = job.console?.at ?? target?.centre;
        if (!at) continue;
        const p = map.toScreen(at.x, at.z);
        tag(ctx, p, `${job.repair.item} hierher`, CARRIED_COLOR);
      }
    }
  }

  // --- die Akte --------------------------------------------------------------

  open(roomId: string): void {
    if (!this.snapshot.rooms.some((room) => room.id === roomId)) return;
    this.room = roomId;
    this.mode = 'room';
    this.fitted = '';
    this.written = '';
    this.mapPage.hidden = true;
    this.roomPage.hidden = false;
    this.extras?.archiveHome?.();
    this.extras?.showRoom?.(roomId);
  }

  close(): void {
    this.mode = 'map';
    this.roomPage.hidden = true;
    this.mapPage.hidden = false;
    this.extras?.showRoom?.('');
  }

  /** Die 2D-Akte: das Zimmer ins Loch einpassen — einmal je Zimmer. */
  private fitRoom(): void {
    const room = this.snapshot.rooms.find((one) => one.id === this.room);
    if (!room || this.fitted === room.id) return;
    const rect = this.scan.getBoundingClientRect();
    const w = rect.width || 320,
      h = rect.height || 240;
    let minX = Infinity,
      minZ = Infinity,
      maxX = -Infinity,
      maxZ = -Infinity;
    for (const p of room.polygon) {
      minX = Math.min(minX, p.x);
      minZ = Math.min(minZ, p.z);
      maxX = Math.max(maxX, p.x);
      maxZ = Math.max(maxZ, p.z);
    }
    const scale = Math.min(w / (maxX - minX + 2), h / (maxZ - minZ + 2));
    this.roomMap.setView({ centreX: room.centre.x, centreZ: room.centre.z, scale, rotation: 0 });
    this.fitted = room.id;
  }

  private writeRoom(): void {
    const spec = this.extras?.spec();
    const state = this.extras?.state();
    const room = this.snapshot.rooms.find((one) => one.id === this.room);
    if (!room) return;
    const flat = this.snapshot.source === 'flat';
    if (flat && !this.roomMap.element.parentElement) this.scan.prepend(this.roomMap.element);
    if (!flat && this.roomMap.element.parentElement) this.roomMap.element.remove();
    this.scan.classList.toggle('is-hole', !flat);
    const sign = [
      this.snapshot.seed,
      room.id,
      flat,
      this.snapshot.doors.map((door) => `${door.id}:${door.locked}`).join(','),
      room.lit,
      state?.done.join(','),
      state?.taken.join(','),
    ].join('/');
    if (sign === this.written) return;
    this.written = sign;

    const house = spec ? roomOf(spec, room.id) : null;
    const twin = spec && house && namesakes(spec, house) > 1 ? ` · ${roomCode(room.id)}` : '';
    this.title.textContent = `${room.name}${twin}`;

    this.codes.replaceChildren();
    if (house && spec?.rooms.includes(house)) {
      this.codes.append(code('Schutzschrank', lockerCode(this.snapshot.seed, room.id)));
    }
    const repairs = spec ? repairsFor(spec).filter((repair) => repair.roomId === room.id) : [];
    for (const repair of repairs) {
      this.codes.append(
        repair.puzzle === 'wires'
          ? code('Kabelplan', 'gleiche Symbole verbinden', true)
          : code(repair.puzzle === 'sequence' ? 'Freigabefolge' : 'Zielfrequenzen', repair.code),
      );
    }
    if (!this.codes.childElementCount)
      this.codes.append(code('Codes', 'keine in diesem Raum', true));

    this.sheet.replaceChildren();
    if (house && spec) {
      if (house.marks.length)
        this.sheet.append(fact('Darin steht', house.marks.map((m) => MARKS[m.id]).join(', ')));
      this.sheet.append(
        fact(
          'Licht',
          house.lamp ? (room.lit ? 'Lampe brennt.' : 'Lampe aus.') : 'Keine. Bleibt dunkel.',
        ),
      );
    }
    const doors = this.snapshot.doors.filter((door) => door.a === room.id || door.b === room.id);
    const closed = doors.filter((door) => door.locked).length;
    this.sheet.append(
      fact(
        doors.length === 1 ? 'Tür' : 'Türen',
        `${doors.length}${doors.some((door) => door.material === 'metal') ? ', eine davon aus Stahl' : ''}${
          closed === 0 ? ' · alle freigegeben' : ` · ${closed} gesperrt`
        }`,
      ),
    );
    if (spec && state) {
      for (const task of spec.tasks.filter((one) => one.roomId === room.id)) {
        const repair = repairsFor(spec).find((one) => one.itemId === task.id);
        const where = state.done.includes(task.id)
          ? 'geliefert'
          : state.taken.includes(task.id)
            ? 'beim Techniker'
            : 'liegt hier';
        this.sheet.append(fact('Fracht', `${task.label} · ${task.hint} · ${where}`, true));
        if (repair)
          this.sheet.append(
            fact(
              'Bringen nach',
              `${roomOf(spec, repair.roomId)?.name ?? repair.roomId} (${repair.title})`,
            ),
          );
      }
      for (const repair of repairs) {
        this.sheet.append(fact('Wartungskasten', repair.title, true));
        this.sheet.append(fact('Braucht', repair.item));
        this.sheet.append(fact('Hinweis', repair.hint));
      }
    }
    this.sheet.append(
      el(
        'p',
        'role__foot',
        'Archivakte · nur dieses Zimmer · keine Personen. Codes und Hinweise dem Techniker zurufen.',
      ),
    );
    this.scan.setAttribute(
      'aria-label',
      `Raumansicht von oben: ${room.name}. Ziehen verschiebt, Mausrad oder zwei Finger zoomen.`,
    );
  }

  // --- Eingaben --------------------------------------------------------------

  private click(event: Event): void {
    const hit = (event.target as HTMLElement | null)?.closest<HTMLElement>(
      '[data-fit],[data-back],[data-zoom],[data-home]',
    );
    if (!hit) return;
    const data = hit.dataset;
    if (data['fit'] !== undefined) this.map.fit();
    else if (data['back'] !== undefined) this.close();
    else if (data['zoom']) this.zoom(data['zoom'] === 'in' ? 1.4 : 1 / 1.4);
    else if (data['home'] !== undefined) this.home();
  }

  private zoom(factor: number): void {
    if (this.snapshot.source === 'flat') {
      const rect = this.scan.getBoundingClientRect();
      this.roomMap.zoomAt(factor, (rect.width || 320) / 2, (rect.height || 240) / 2);
    } else this.extras?.archiveZoom?.(factor);
  }

  private home(): void {
    if (this.snapshot.source === 'flat') {
      this.fitted = '';
      this.fitRoom();
    } else this.extras?.archiveHome?.();
  }

  private keys(event: KeyboardEvent): void {
    if (this.mode !== 'room') return;
    if (event.key === '+' || event.key === '=') this.zoom(1.4);
    else if (event.key === '-') this.zoom(1 / 1.4);
    else if (event.key === 'Home') this.home();
    else if (event.key === 'ArrowLeft') this.pan(0.1, 0);
    else if (event.key === 'ArrowRight') this.pan(-0.1, 0);
    else if (event.key === 'ArrowUp') this.pan(0, 0.1);
    else if (event.key === 'ArrowDown') this.pan(0, -0.1);
    else return;
    event.preventDefault();
  }

  /** In Anteilen des Bildes — die 2D-Karte hat ihre eigenen Gesten und braucht das nur von der Tastatur. */
  private pan(dx: number, dz: number): void {
    if (this.snapshot.source === 'flat') {
      const rect = this.scan.getBoundingClientRect();
      this.roomMap.panBy(dx * (rect.width || 320), dz * (rect.height || 240));
    } else this.extras?.archivePan?.(dx, dz);
  }

  /**
   * **Ein Finger über dem Loch: Wisch oder Zange.** Nur in der 3D-Welt — dort
   * zeichnet die Welt und kennt keine Finger; die 2D-Karte im Loch hat ihre
   * eigenen (`MapView`).
   */
  private watchDrag(): void {
    const node = this.scan;
    node.addEventListener('pointerdown', (event: PointerEvent) => {
      if (this.snapshot.source !== '3d') return;
      if ((event.target as Element | null)?.closest('button')) return;
      node.setPointerCapture?.(event.pointerId);
      event.preventDefault();
      this.touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (this.touches.size > 1) {
        this.grab = null;
        this.span = this.pinchSpan();
        return;
      }
      this.grab = { id: event.pointerId, x: event.clientX, y: event.clientY, far: 0 };
    });
    node.addEventListener('pointermove', (event: PointerEvent) => {
      const touch = this.touches.get(event.pointerId);
      if (!touch) return;
      const dx = event.clientX - touch.x,
        dy = event.clientY - touch.y;
      touch.x = event.clientX;
      touch.y = event.clientY;
      if (this.touches.size > 1) {
        const span = this.pinchSpan();
        if (this.span > PINCH_MIN && span > PINCH_MIN) this.extras?.archiveZoom?.(span / this.span);
        this.span = span;
        return;
      }
      const grab = this.grab;
      if (!grab || grab.id !== event.pointerId) return;
      grab.far = Math.max(grab.far, Math.hypot(event.clientX - grab.x, event.clientY - grab.y));
      const box = node.getBoundingClientRect();
      this.extras?.archivePan?.(dx / Math.max(1, box.width), dy / Math.max(1, box.height));
    });
    const drop = (event: PointerEvent): void => {
      if (node.hasPointerCapture?.(event.pointerId)) node.releasePointerCapture?.(event.pointerId);
      const pinched = this.touches.size > 1;
      this.touches.delete(event.pointerId);
      if (pinched) {
        this.span = 0;
        const [id, spot] = [...this.touches.entries()][0] ?? [];
        this.grab =
          id === undefined || !spot ? null : { id, x: spot.x, y: spot.y, far: TAP_SLOP + 1 };
        return;
      }
      if (this.grab?.id === event.pointerId) this.grab = null;
    };
    node.addEventListener('pointerup', drop);
    node.addEventListener('pointercancel', drop);
    node.addEventListener(
      'wheel',
      (event: WheelEvent) => {
        if (this.mode !== 'room') return;
        event.preventDefault();
        const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1;
        this.zoom(Math.exp(-event.deltaY * unit * WHEEL_RATE));
      },
      { passive: false },
    );
  }

  private pinchSpan(): number {
    const [a, b] = [...this.touches.values()];
    if (!a || !b) return 0;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  dispose(): void {
    this.extras?.showRoom?.('');
    this.overlay.dispose();
    this.map.dispose();
    this.roomMap.dispose();
    this.element.remove();
  }
}

/** Ein Code, groß — das, weswegen man die Akte aufschlägt. */
function code(label: string, value: string, soft = false): HTMLElement {
  const node = el('div', `role-archive__code${soft ? ' is-soft' : ''}`);
  node.append(el('small', '', label), el('strong', '', value));
  return node;
}

/** Eine Zeile im Aktenblatt: Begriff links, Auskunft rechts. */
function fact(label: string, value: string, warn = false): HTMLElement {
  const row = el('div', `haunt__fact${warn ? ' is-warn' : ''}`);
  row.append(el('span', 'haunt__fact-key', label), el('span', 'haunt__fact-value', value));
  return row;
}
