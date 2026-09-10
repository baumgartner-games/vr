import { atHome } from '../archiveView';
import { lockerCode, repairsFor } from '../mission';
import type { MapItem, MapPoint, MapSnapshot } from '../map/mapSnapshot';
import { ALL_LAYERS, INK, MapView, type MapRoute } from '../map/mapView';
import type { RoleHost, RoleView } from '../registry/roles';
import { taskCargo } from '../rules/cargo';
import { archiveDeskOf, type ArchiveDesk } from './archiveDesk';
import { Toast, code, el, fact } from './roleShell';

/**
 * **Der Archivar** — die ganze Karte, mit der Fracht und den Zielräumen.
 *
 * Er hatte einen Raumwähler, ein Aktenblatt und eine Missionsliste. Die Liste
 * ist weg: Sie zählte auf, was die Karte zeigt, sobald sie eine ist — und drei
 * Zeilen „Teil aus X in Konsole Y" sind auf einem Telefon dasselbe wie drei
 * Striche auf einem Grundriss, nur ohne den Ort. Jetzt liegt beides
 * übereinander: **eine Linie von jeder Kiste zu der Konsole, in die ihr Teil
 * gehört**, und wo der Techniker das Teil schon trägt, steht am Zielraum
 * „hierher".
 *
 * **Wesen sieht er nicht.** Kein Techniker, kein Monster, keine Live-Position —
 * das war die Rolle, als sie ein Aktenblatt war, und das bleibt sie mit einer
 * Karte. Er weiß, wo etwas **liegt**; wo jemand **ist**, weiß der Späher.
 *
 * **Ein Tipp auf ein Zimmer schlägt die Raumakte auf**, mit den Codes so groß,
 * dass man sie durchs Zimmer ruft — und mit einem Bild des Raums: in der
 * 3D-Welt das Loch, durch das die Welt ihn zeichnet, mit Zoom und Wisch
 * (`archiveDesk.ts`); in der 2D-Welt eine herangezoomte Karte desselben
 * Zimmers. Zwei Bilder, eine Akte.
 */
export function mountArchiveView(host: RoleHost): ArchiveRoleView {
  return new ArchiveView(host);
}

export interface ArchiveRoleView extends RoleView {
  /** Welches Zimmer aufgeschlagen ist — `''` heißt: die ganze Karte. */
  readonly opened: string;
  /** Die Karte selbst — für Tests. */
  readonly map: MapView;
  /** Das Loch für die 3D-Welt, solange eine Akte offen ist — sonst `null`. */
  viewport(): { x: number; y: number; w: number; h: number } | null;
}

/** Wie weit ein Finger wandern darf und trotzdem ein Tipp bleibt, in Punkten. */
const TAP_SLOP = 8;
/** Wie stark das Mausrad zoomt, je Punkt Raddrehung. */
const WHEEL_RATE = 0.0016;
/** Wie weit zwei Finger mindestens auseinanderliegen müssen, damit gezoomt wird. */
const PINCH_MIN = 12;

class ArchiveView implements ArchiveRoleView {
  readonly element = el('div', 'role role--archive');
  readonly map: MapView;
  private readonly toast = new Toast();
  private readonly hud = el('div', 'role__hud');
  private readonly sheet = el('div', 'role__sheet');
  /** Das Loch, durch das die 3D-Welt zeichnet — leer, wo es keine Kamera gibt. */
  private readonly hole = el('div', 'role__hole');
  /** Und die Karte, die in der 2D-Welt an derselben Stelle steht. */
  private closeUp: MapView | null = null;
  private readonly desk: ArchiveDesk | null;
  private room = '';
  private sheetKey = '';
  private hudText = '';
  private readonly touches = new Map<number, { x: number; y: number }>();
  private span = 0;
  private drag: { id: number; x: number; y: number; far: number } | null = null;

  constructor(private readonly host: RoleHost) {
    this.desk = archiveDeskOf(host);
    this.map = new MapView({
      // Alles, was liegt — und nichts, was geht.
      layers: { ...ALL_LAYERS, entities: false, visibility: false, objectives: false },
      markers: 'none',
      mode: 'omniscient',
      minScale: 5,
      maxScale: 40,
      routes: () => this.supplyLines(),
      overlay: (ctx, view) => this.paintTargets(ctx, view),
      onRoomClick: (id) => this.open(id),
      onItemClick: (id) => this.openItem(id),
    });
    this.map.element.classList.add('role__map');
    this.sheet.hidden = true;
    this.sheet.addEventListener('click', (event) => this.sheetClick(event));
    this.watchHole();
    this.element.append(this.map.element, this.hud, this.toast.element, this.sheet);
  }

  get opened(): string {
    return this.room;
  }

  update(dt: number): void {
    const snapshot = this.host.snapshot();
    this.map.setSnapshot(snapshot);
    // Solange das Loch offen ist, liegt die eigene Karte nicht nur unsichtbar
    // darunter — sie wird auch nicht gezeichnet: Eine Leinwand, die niemand
    // sieht, ist je Bild ein ganzer Grundriss umsonst.
    if (!this.holeOpen) this.map.draw();
    if (this.room) this.writeSheet(snapshot);
    if (this.closeUp) {
      this.closeUp.setSnapshot(snapshot);
      this.closeUp.draw();
    }
    this.toast.step(dt);
    this.renderHud(snapshot);
  }

  /**
   * **Ob gerade ein Loch in die 3D-Welt offen steht.**
   *
   * Ein Loch ist nur eines, wenn **nichts** dazwischen liegt: Die Karte der
   * Rolle ist eine deckende Leinwand über der ganzen Seite, und die Seite
   * selbst hat einen Grund. Beides muss für diese Zeit weg — das erledigt die
   * Klasse `is-hole` im CSS (`views.css`), und deshalb steht sie hier und
   * nicht in einer Bedingung im Zeichnen.
   */
  private get holeOpen(): boolean {
    return !!this.desk && !!this.room && !this.sheet.hidden;
  }

  /**
   * **Wohin die 3D-Welt zeichnen soll** — nur, solange eine Akte offen ist und
   * es überhaupt eine Kamera gibt. Sonst `null`: Ein Rechteck, in das niemand
   * zeichnet, ist ein schwarzes Loch in der Seite.
   */
  viewport(): { x: number; y: number; w: number; h: number } | null {
    if (!this.holeOpen) return null;
    const box = this.hole.getBoundingClientRect();
    if (box.width < 8 || box.height < 8) return null;
    return { x: box.left, y: box.top, w: box.width, h: box.height };
  }

  // --- die Karte -------------------------------------------------------------

  /**
   * **Von der Kiste zur Konsole.** Je offener Reparatur eine gestrichelte
   * Linie: Dort liegt das Teil, dorthin gehört es. Ist das Teil schon
   * unterwegs, gibt es nichts mehr zu verbinden — dann bleibt nur das Ziel,
   * und das bekommt seine Beschriftung in `paintTargets`.
   */
  private supplyLines(): MapRoute[] {
    const out: MapRoute[] = [];
    for (const job of this.jobs()) {
      if (!job.cargo || !job.console || job.solved || job.carried) continue;
      out.push({
        id: job.id,
        points: [{ ...job.cargo.at }, { ...job.console.at }],
        color: INK.goal,
        goal: true,
      });
    }
    return out;
  }

  /**
   * Die Beschriftung an den Enden: der Name des Teils an der Kiste, „hierher"
   * an der Konsole, sobald der Techniker es trägt. Selbst gemalt und nicht als
   * `objectives`, weil dort ein Ring mit Entfernung stünde — und eine
   * Entfernung wozu? Der Archivar steht nirgends.
   */
  private paintTargets(ctx: CanvasRenderingContext2D, view: MapView): void {
    ctx.save();
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    for (const job of this.jobs()) {
      if (job.solved) continue;
      if (job.carried && job.console) label(job.console.at, 'hierher', INK.goal);
      else if (job.cargo) label(job.cargo.at, job.cargo.label, INK.cargo);
    }
    ctx.restore();

    function label(at: MapPoint, text: string, colour: string): void {
      const p = view.toScreen(at.x, at.z);
      ctx.strokeStyle = INK.frame;
      ctx.strokeText(text, p.x, p.y - 12);
      ctx.fillStyle = colour;
      ctx.fillText(text, p.x, p.y - 12);
    }
  }

  /**
   * Die offenen Reparaturen, jede mit ihrer Kiste und ihrer Konsole.
   *
   * Gepaart wird über den Grundriss (`repairsFor`, `spec.tasks`) und nicht
   * über die Karte: Auf der Karte heißen beide nur, wie sie beschriftet sind,
   * und welche Kiste zu welcher Konsole gehört, weiß genau diese Rolle.
   */
  private jobs(): Array<{
    id: string;
    cargo: MapItem | null;
    console: MapItem | null;
    carried: boolean;
    solved: boolean;
  }> {
    const spec = this.host.spec();
    const items = this.host.snapshot().items;
    return repairsFor(spec).map((repair) => {
      const task = spec.tasks.find((one) => one.id === repair.itemId);
      const cargo =
        items.find((item) => item.kind === 'cargo' && item.label === task?.label) ?? null;
      const console =
        items.find((item) => item.kind === 'console' && item.label === repair.title) ?? null;
      return {
        id: repair.id,
        cargo,
        console,
        carried: !!cargo && cargo.state === 'taken',
        solved: console?.state === 'solved',
      };
    });
  }

  private renderHud(snapshot: MapSnapshot): void {
    const jobs = this.jobs();
    const done = jobs.filter((job) => job.solved).length;
    const text = `${done} von ${jobs.length} Systemen · ${snapshot.rooms.length} Räume`;
    if (text === this.hudText) return;
    this.hudText = text;
    this.hud.replaceChildren(
      el('strong', '', 'ARCHIV'),
      el('span', '', text),
      el('span', '', 'Zimmer antippen öffnet die Raumakte'),
    );
  }

  // --- die Raumakte ----------------------------------------------------------

  private openItem(id: string): void {
    const item = this.host.snapshot().items.find((one) => one.id === id);
    if (item?.roomId) this.open(item.roomId);
  }

  /** Eine Akte aufschlagen — und die Kamera der 3D-Welt gleich mit. */
  open(roomId: string): void {
    this.room = roomId;
    this.sheetKey = '';
    this.sheet.hidden = false;
    this.desk?.open(roomId);
    this.desk?.home();
    if (!this.desk) this.zoomCloseUp();
    this.writeSheet(this.host.snapshot());
    this.element.classList.toggle('is-hole', this.holeOpen);
  }

  close(): void {
    this.room = '';
    this.sheet.hidden = true;
    this.sheetKey = '';
    this.element.classList.remove('is-hole');
    this.desk?.open('');
    this.closeUp?.dispose();
    this.closeUp = null;
  }

  /**
   * Die Karte in der Akte: dasselbe Bauteil, auf ein Zimmer herangezogen.
   * Ohne Gesten — geschoben wird an der großen Karte darunter; hier soll die
   * Akte lesbar sein und nicht bedienbar.
   */
  private zoomCloseUp(): void {
    this.closeUp?.dispose();
    const snapshot = this.host.snapshot();
    const room = snapshot.rooms.find((one) => one.id === this.room);
    this.closeUp = new MapView({
      layers: { ...ALL_LAYERS, entities: false, visibility: false, objectives: false },
      markers: 'none',
      mode: 'omniscient',
      gestures: false,
      minScale: 4,
      maxScale: 90,
    });
    this.closeUp.element.classList.add('role__closeup');
    this.closeUp.setSnapshot(snapshot);
    if (room) {
      const xs = room.polygon.map((point) => point.x);
      const zs = room.polygon.map((point) => point.z);
      const wide = Math.max(1, Math.max(...xs) - Math.min(...xs));
      const deep = Math.max(1, Math.max(...zs) - Math.min(...zs));
      const box = this.hole.getBoundingClientRect();
      const w = box.width || 320,
        h = box.height || 220;
      this.closeUp.setView({
        centreX: room.centre.x,
        centreZ: room.centre.z,
        scale: Math.min(w / (wide + 1), h / (deep + 1)),
      });
    }
    this.hole.replaceChildren(this.closeUp.element);
  }

  private writeSheet(snapshot: MapSnapshot): void {
    const spec = this.host.spec();
    const room = snapshot.rooms.find((one) => one.id === this.room);
    if (!room) {
      this.close();
      return;
    }
    const items = snapshot.items.filter((item) => item.roomId === room.id);
    const doors = snapshot.doors.filter((door) => door.a === room.id || door.b === room.id);
    const locked = doors.filter((door) => door.locked).length;
    // Neu geschrieben wird nur, wenn sich wirklich etwas geändert hat: Ein
    // Blatt, das je Bild neu entsteht, verliert bei jedem Bild den Scrollstand.
    const key = [
      room.id,
      room.lit,
      locked,
      doors.length,
      items.map((item) => `${item.id}:${item.state}`).join('|'),
      this.desk ? 'hole' : 'map',
    ].join('/');
    if (key === this.sheetKey) return;
    this.sheetKey = key;

    const head = el('div', 'role__sheet-head');
    const back = el('button', 'role__key', 'Karte');
    back.dataset['close'] = '';
    head.append(el('strong', '', room.name), back);

    // **Die Akte hat keinen eigenen Grund** — ihre zwei Karten haben einen,
    // und dazwischen liegt das Bild. Ein durchgehender Kasten wäre eine
    // undurchsichtige Fläche über der Leinwand, und genau dorthin zeichnet
    // die 3D-Welt ihr Zimmer (`role__hole`).
    const parts: HTMLElement[] = [];
    const house = spec.rooms.find((one) => one.id === room.id);
    if (house) parts.push(code('Schutzschrank-Code', lockerCode(spec.seed, house.id)));
    for (const repair of repairsFor(spec).filter((one) => one.roomId === room.id)) {
      const console = items.find((item) => item.kind === 'console' && item.label === repair.title);
      if (console?.state === 'solved') {
        parts.push(fact(repair.title, 'repariert'));
        continue;
      }
      parts.push(
        code(
          repair.puzzle === 'wires'
            ? 'Kabelplan'
            : repair.puzzle === 'sequence'
              ? 'Freigabefolge'
              : 'Zielfrequenzen',
          repair.puzzle === 'wires' ? 'gleiches Symbol' : repair.code.split('').join(' '),
        ),
        fact('Benötigt', repair.item),
      );
    }
    for (const item of items) {
      if (item.kind === 'cargo') {
        const task = spec.tasks.find((one) => one.label === item.label);
        parts.push(
          fact(
            'Fracht',
            `${item.label} · ${item.state === 'taken' ? 'mitgenommen' : item.state === 'open' ? 'geöffnet' : 'verschlossen'}`,
          ),
        );
        if (task && item.state !== 'taken')
          parts.push(fact('Fundhinweis', taskCargo(spec, task.id).clue));
      } else if (item.kind === 'locker')
        parts.push(
          fact(
            'Schutzschrank',
            item.state === 'destroyed' ? 'zerstört' : 'benutzbar',
            item.state === 'destroyed',
          ),
        );
    }
    const facts = parts.splice(0);
    facts.push(
      fact(
        doors.length === 1 ? 'Tür' : 'Türen',
        `${doors.length}${locked ? ` · ${locked} gesperrt` : ' · alle frei'}`,
        locked > 0,
      ),
      fact('Licht', room.lit ? 'an' : 'aus', !room.lit),
      el(
        'small',
        'role__hint',
        'Archivscan · nur dieser Raum · keine Personen oder Live-Positionen',
      ),
    );
    const top = el('div', 'role__card');
    top.append(head);
    const bottom = el('div', 'role__card');
    bottom.append(...facts);
    this.sheet.replaceChildren(top, this.picture(), bottom);
  }

  /**
   * Das Bild in der Akte: das Loch für die 3D-Welt samt seinen Griffen, oder
   * die herangezoomte Karte. Die Knöpfe stehen nur dort, wo sie etwas tun —
   * ein Knopf ohne Wirkung ist einer, den man beim Zielen trifft.
   */
  private picture(): HTMLElement {
    const frame = el('div', 'role__picture');
    frame.append(this.hole);
    if (!this.desk) return frame;
    const tools = el('div', 'role__ptools');
    for (const [key, glyph, label] of [
      ['out', '−', 'Raumansicht verkleinern'],
      ['in', '+', 'Raumansicht vergrößern'],
      ['home', '⤢', 'Wieder das ganze Zimmer zeigen'],
    ] as const) {
      const button = el('button', 'role__key', glyph);
      button.dataset['picture'] = key;
      button.setAttribute('aria-label', label);
      if (key === 'home') button.hidden = atHome(this.desk.view());
      tools.append(button);
    }
    frame.append(tools);
    return frame;
  }

  private sheetClick(event: Event): void {
    const key = (event.target as HTMLElement | null)?.closest('button');
    if (!key) return;
    if (key.dataset['close'] !== undefined) {
      this.close();
      return;
    }
    const picture = key.dataset['picture'];
    if (picture === 'in') this.desk?.zoom(1.4);
    else if (picture === 'out') this.desk?.zoom(1 / 1.4);
    else if (picture === 'home') this.desk?.home();
    this.sheetKey = '';
  }

  // --- Zoom und Wisch über dem Loch -------------------------------------------

  /**
   * **Ziehen schiebt das Zimmer, zwei Finger ziehen es heran.**
   *
   * Gemessen wird in Anteilen des Bildes und nicht in Metern: Wie viele Meter
   * ein Punkt auf dem Schirm ist, hängt am Ausschnitt, und den kennt die Welt
   * (`HauntingWorld.aimArchive`). `setPointerCapture` hält den Finger am
   * Element fest, auch wenn er über den Rand hinauswandert.
   */
  private watchHole(): void {
    const node = this.hole;
    node.style.touchAction = 'none';
    node.addEventListener('pointerdown', (event: PointerEvent) => {
      if (!this.desk) return;
      node.setPointerCapture?.(event.pointerId);
      event.preventDefault();
      this.touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (this.touches.size > 1) {
        this.drag = null;
        this.span = this.pinchSpan();
        return;
      }
      this.drag = { id: event.pointerId, x: event.clientX, y: event.clientY, far: 0 };
    });
    node.addEventListener('pointermove', (event: PointerEvent) => {
      const touch = this.touches.get(event.pointerId);
      if (!touch || !this.desk) return;
      const stepX = event.clientX - touch.x,
        stepY = event.clientY - touch.y;
      touch.x = event.clientX;
      touch.y = event.clientY;
      if (this.touches.size > 1) {
        const span = this.pinchSpan();
        if (this.span > PINCH_MIN && span > PINCH_MIN) this.desk.zoom(span / this.span);
        this.span = span;
        return;
      }
      const drag = this.drag;
      if (!drag || drag.id !== event.pointerId) return;
      drag.far += Math.hypot(stepX, stepY);
      const box = node.getBoundingClientRect();
      this.desk.pan(stepX / Math.max(1, box.width), stepY / Math.max(1, box.height));
      if (drag.far > TAP_SLOP) this.sheetKey = '';
    });
    const drop = (event: PointerEvent): void => {
      if (node.hasPointerCapture?.(event.pointerId)) node.releasePointerCapture(event.pointerId);
      this.touches.delete(event.pointerId);
      if (this.touches.size < 2) this.span = 0;
      if (this.drag?.id === event.pointerId) this.drag = null;
    };
    node.addEventListener('pointerup', drop);
    node.addEventListener('pointercancel', drop);
    node.addEventListener(
      'wheel',
      (event: WheelEvent) => {
        if (!this.desk) return;
        event.preventDefault();
        const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1;
        this.desk.zoom(Math.exp(-event.deltaY * unit * WHEEL_RATE));
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
    this.desk?.open('');
    this.closeUp?.dispose();
    this.closeUp = null;
    this.map.dispose();
    this.element.remove();
  }
}
