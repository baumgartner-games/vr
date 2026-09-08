import './haunting.css';
import { MARKS, namesakes, roomOf, type HouseRoom, type HouseSpec } from './house';
import { visibleSwitches } from './panel';
import { seating, shoved, stationFacts, STATIONS, type Claim, type StationId } from './stations';
import type { DroneState, HauntState } from './net';

/**
 * **Der Van, wie er auf einem Telefon aussieht.**
 *
 * Zuerst für das Handy gebaut und auf dem Laptop breiter gezogen, nicht
 * andersherum: Ein Handy-Layout, das man aufzieht, ist immer benutzbar; ein
 * Laptop-Layout, das man zusammenschiebt, nie. Deshalb ist hier alles eine
 * Spalte, alles daumengroß und nichts zum Zielen.
 *
 * **Vier Stationen, vier Sprachen** (`stations.ts`) — und die Oberfläche ist
 * die Stelle, an der die Trennung wirklich durchgesetzt wird:
 *
 * - Das **Archiv** bekommt ein Bild der Welt, aber ohne alles Lebendige (die
 *   Welt blendet es beim Zeichnen aus). Namen ja, Bewegung nein.
 * - Der **Späher** bekommt gar kein Bild der Welt, sondern gezeichnete
 *   Konturen: Wände und einen Punkt. Keine Möbel, keine Namen, kein
 *   Mitspieler. Das ist keine Sparmaßnahme — es *ist* seine Rolle.
 * - Die **Drohne** sieht ein Zimmer vollständig, aber nur eins, und der Pilot
 *   navigiert auf der Karte statt im Bild.
 * - Die **Schalttafel** sieht vom Haus überhaupt nichts.
 *
 * Wer hier eine dieser Grenzen aufweicht, weil es „praktischer" wäre, macht
 * aus vier Rollen eine: Sobald eine Station Monster *und* Mitspieler
 * gleichzeitig sieht, lotst sie allein, und die anderen drei sind Deko.
 */
export interface StationHost {
  spec(): HouseSpec;
  state(): HauntState;
  drone(): DroneState;
  claims(): Claim[];
  me(): string;
  nameOf(peer: string): string;
  /** An welchem Gerät ich wirklich sitze — `null`, wenn weggeschubst. */
  seat(): StationId | null;
  /** Und wohin ich unterwegs bin. */
  wanted(): StationId | null;
  /** Wie viele Sekunden das Hinlaufen noch dauert. */
  arriving(): number;
  sit(station: StationId): void;
  flip(id: string, on: boolean): void;
  flyTo(roomId: string): void;
}

/** Ein Bildschirm voller Text ist auf einem Handy kein Bildschirm. */
const SCOUT_SIZE = 260;

export class StationUi {
  private readonly root = document.createElement('div');
  private readonly bar = document.createElement('header');
  private readonly view = document.createElement('div');
  private readonly body = document.createElement('div');
  private readonly scout = document.createElement('canvas');

  /** Ob gerade die Geräteübersicht offen ist statt der eigenen Station. */
  private vanOpen = true;
  /** Welches Zimmer der Archivar aufgeschlagen hat. */
  selected = '';
  /** Woran erkannt wird, dass die Seite neu geschrieben werden muss. */
  private drawn = '';

  constructor(private readonly host: StationHost) {
    this.root.className = 'haunt';
    this.bar.className = 'haunt__bar';
    this.view.className = 'haunt__view';
    this.body.className = 'haunt__body';
    this.scout.className = 'haunt__scout';
    this.scout.width = SCOUT_SIZE;
    this.scout.height = SCOUT_SIZE;
    this.root.append(this.bar, this.view, this.body);
    document.body.append(this.root);
    document.body.classList.add('haunt-on');

    this.root.addEventListener('click', (event) => this.onClick(event));
  }

  dispose(): void {
    this.root.remove();
    document.body.classList.remove('haunt-on');
  }

  /** Welche Station gerade zu sehen ist — `null` heißt: die Übersicht im Van. */
  get station(): StationId | null {
    if (this.vanOpen) return null;
    const seat = this.host.seat();
    return seat && this.host.arriving() <= 0 ? seat : null;
  }

  /**
   * Wohin die Welt ihr Bild zeichnen soll, in CSS-Pixeln — oder `null`, wenn
   * diese Station keines hat.
   */
  viewport(): { x: number; y: number; w: number; h: number } | null {
    const station = this.station;
    if (station !== 'archive' && station !== 'drone') return null;
    const box = this.view.getBoundingClientRect();
    if (box.width < 8 || box.height < 8) return null;
    return { x: box.left, y: box.top, w: box.width, h: box.height };
  }

  refresh(): void {
    const state = this.host.state();
    const spec = this.host.spec();
    if (!this.selected) this.selected = spec.rooms[0]?.id ?? '';

    const station = this.station;
    const sign = [
      spec.seed,
      station ?? 'van',
      this.selected,
      state.phase,
      state.fuse,
      state.monsterOn,
      state.done.length,
      state.taken.length,
      state.lit.join('|'),
      state.loud.join('|'),
      state.shut.join('|'),
      Math.ceil(this.host.arriving()),
      this.host
        .claims()
        .map((claim) => `${claim.id}:${claim.station}`)
        .sort()
        .join('|'),
      Math.round(this.host.drone().battery * 40),
      this.host.drone().target,
    ].join('/');

    if (sign !== this.drawn) {
      this.drawn = sign;
      this.write();
    }
    // Der Punkt des Spähers wandert zwischen zwei Neuschriften weiter — er ist
    // das Einzige, was sich ohne Knopfdruck ändert.
    if (station === 'scout') this.drawScout();
    this.view.hidden = station !== 'archive' && station !== 'drone';
  }

  // --- schreiben -------------------------------------------------------------

  private write(): void {
    const state = this.host.state();
    const spec = this.host.spec();
    const station = this.station;
    const facts = station ? stationFacts(station) : null;

    this.bar.replaceChildren(
      el('span', 'haunt__where', facts ? facts.label : 'Van'),
      el(
        'span',
        'haunt__task',
        `${state.done.length}/${spec.tasks.length}${state.monsterOn ? ' · Monster an' : ' · Monster aus'}`,
      ),
      button('haunt__jump', this.vanOpen ? 'Zur Station' : 'Van', 'van'),
    );

    this.body.replaceChildren(...this.page(station));
  }

  private page(station: StationId | null): HTMLElement[] {
    if (station === null) return this.vanPage();
    if (station === 'archive') return this.archivePage();
    if (station === 'scout') return this.scoutPage();
    if (station === 'drone') return this.dronePage();
    return this.hackPage();
  }

  /**
   * **Die Geräteübersicht.** Wer wo sitzt, und was frei ist.
   *
   * Hier steht auch, was eine Station ausdrücklich *nicht* sieht. Das ist
   * keine Hilfe für Anfänger, sondern die halbe Spielregel: Wer nicht weiß,
   * was er nicht sieht, hält seine Lücke für die Wahrheit und meldet sie als
   * solche.
   */
  private vanPage(): HTMLElement[] {
    const claims = this.host.claims();
    const me = this.host.me();
    const seats = seating(claims);
    const out: HTMLElement[] = [];

    if (shoved(claims, me)) {
      out.push(el('p', 'haunt__note haunt__note--warn', 'Weggeschubst. Nimm ein anderes Gerät.'));
    }
    const travel = this.host.arriving();
    if (travel > 0 && this.host.wanted()) {
      out.push(
        el(
          'p',
          'haunt__note',
          `Unterwegs zu ${stationFacts(this.host.wanted()!).label} … ${travel.toFixed(1)} s`,
        ),
      );
    }

    for (const station of STATIONS) {
      const owner = seats.get(station.id);
      const tile = el('button', 'haunt__tile');
      tile.dataset['sit'] = station.id;
      if (owner === me) tile.classList.add('is-mine');
      else if (owner) tile.classList.add('is-taken');
      tile.append(
        el('strong', '', station.label),
        el('span', 'haunt__tag', station.tagline),
        el('span', 'haunt__blind', `Sieht nicht: ${station.sees}`),
        el('span', 'haunt__who', owner ? (owner === me ? 'du' : this.host.nameOf(owner)) : 'frei'),
      );
      out.push(tile);
    }
    return out;
  }

  /** Der Archivar: eine Akte, in der man **ein** Zimmer aufschlägt. */
  private archivePage(): HTMLElement[] {
    const spec = this.host.spec();
    const room = roomOf(spec, this.selected) ?? spec.rooms[0];
    const out: HTMLElement[] = [];

    out.push(el('h2', 'haunt__h', 'Auftrag'));
    for (const task of spec.tasks) {
      const done = this.host.state().done.includes(task.id);
      out.push(el('p', `haunt__task-row${done ? ' is-done' : ''}`, `${task.label} — ${task.hint}`));
    }

    out.push(el('h2', 'haunt__h', 'Akte'));
    const list = el('div', 'haunt__rooms');
    for (const one of spec.rooms) {
      const entry = el('button', 'haunt__room');
      entry.dataset['room'] = one.id;
      if (one.id === room?.id) entry.classList.add('is-open');
      entry.append(el('span', '', one.name));
      if (namesakes(spec, one) > 1) entry.append(el('span', 'haunt__twin', 'zweimal im Haus'));
      list.append(entry);
    }
    out.push(list);

    if (room) {
      out.push(el('h2', 'haunt__h', `${room.name} · aufgeschlagen`));
      out.push(
        el('p', 'haunt__note', `Darin steht: ${room.marks.map((m) => MARKS[m.id]).join(', ')}`),
      );
      out.push(
        el(
          'p',
          'haunt__note',
          room.lamp ? 'Eine Lampe unter der Decke.' : 'Keine Lampe. Dieses Zimmer bleibt dunkel.',
        ),
      );
      const doors = spec.doors.filter((door) => door.a === room.id || door.b === room.id);
      out.push(
        el(
          'p',
          'haunt__note',
          `${doors.length} ${doors.length === 1 ? 'Tür' : 'Türen'}${
            doors.some((door) => door.material === 'metal') ? ', eine davon aus Stahl' : ''
          }.`,
        ),
      );
      if (spec.fuse.roomId === room.id) {
        out.push(el('p', 'haunt__note haunt__note--warn', 'Hier hängt der Sicherungskasten.'));
      }
    }
    return out;
  }

  /** Der Späher: Konturen und ein Punkt. Sonst nichts, mit Absicht. */
  private scoutPage(): HTMLElement[] {
    const state = this.host.state();
    const out: HTMLElement[] = [this.scout];
    out.push(
      el(
        'p',
        'haunt__note',
        state.monsterOn
          ? 'Es bewegt sich. Beschreib die Form — Namen hast du keine.'
          : 'Nichts im Haus. Der VR-Spieler hat das Monster ausgeschaltet.',
      ),
    );
    return out;
  }

  /** Der Pilot: links das Bild, darunter die Karte, auf die er tippt. */
  private dronePage(): HTMLElement[] {
    const spec = this.host.spec();
    const drone = this.host.drone();
    const out: HTMLElement[] = [];
    const bar = el('div', 'haunt__battery');
    const fill = el('span', '');
    fill.style.width = `${Math.round(drone.battery * 100)}%`;
    bar.append(fill);
    out.push(el('h2', 'haunt__h', `Akku ${Math.round(drone.battery * 100)} %`), bar);

    out.push(el('h2', 'haunt__h', 'Wohin?'));
    const grid = el('div', 'haunt__map');
    for (const room of spec.rooms) {
      const cell = el('button', 'haunt__cell');
      cell.dataset['fly'] = room.id;
      if (drone.target === room.id) cell.classList.add('is-target');
      if (this.roomOfDrone()?.id === room.id) cell.classList.add('is-here');
      cell.append(el('span', '', room.name), el('span', 'haunt__tag', shapeOf(room)));
      grid.append(cell);
    }
    out.push(grid);
    out.push(
      el('p', 'haunt__note', 'Sie macht keine Tür auf. Wo sie nicht hinkommt, war jemand vor dir.'),
    );
    return out;
  }

  /** Der Hacker: Schalter, und keiner sagt, wo er hingeht. */
  private hackPage(): HTMLElement[] {
    const spec = this.host.spec();
    const state = this.host.state();
    const list = visibleSwitches(spec.switches, state.fuse);
    const out: HTMLElement[] = [];

    out.push(
      el(
        'p',
        'haunt__note',
        state.fuse
          ? 'Sicherungskasten ist an. Das ist die ganze Tafel.'
          : 'Halbe Tafel. Der Rest hängt am Sicherungskasten im Haus.',
      ),
    );

    const grid = el('div', 'haunt__switches');
    for (const entry of list) {
      const on =
        entry.kind === 'door'
          ? !state.shut.includes(entry.target)
          : entry.kind === 'light'
            ? state.lit.includes(entry.target)
            : state.loud.includes(entry.target);
      const key = el('button', `haunt__switch${on ? ' is-on' : ''}`);
      key.dataset['flip'] = entry.id;
      key.dataset['on'] = on ? '1' : '0';
      key.append(el('span', '', entry.label), el('span', 'haunt__tag', on ? 'an' : 'aus'));
      grid.append(key);
    }
    out.push(grid);
    return out;
  }

  // --- der Späherschirm -------------------------------------------------------

  /**
   * **Wände und ein Punkt.**
   *
   * Gezeichnet wird nur, was in der Nähe des Monsters liegt: sein Zimmer hell,
   * die angrenzenden schwach. Der Späher kann das Haus damit nicht absuchen —
   * er wird herumgeschleift und kann nur beschreiben, was er gerade sieht.
   * Genau deshalb muss ihm jemand zurufen, ob das der eigene Raum ist.
   */
  private drawScout(): void {
    const ctx = this.scout.getContext('2d');
    const spec = this.host.spec();
    const state = this.host.state();
    if (!ctx) return;

    ctx.clearRect(0, 0, SCOUT_SIZE, SCOUT_SIZE);
    ctx.fillStyle = '#070a10';
    ctx.fillRect(0, 0, SCOUT_SIZE, SCOUT_SIZE);
    if (!state.monster) return;

    const here = roomAtMetres(spec, state.monster.x, state.monster.z);
    if (!here) return;
    const near = spec.rooms.filter((room) => room.id === here.id || touches(room, here));

    // Der Ausschnitt folgt dem Monster und nicht dem Haus: eine feste Karte
    // wäre wieder ein Grundriss, und den hat der Archivar.
    const span = 5;
    const scale = SCOUT_SIZE / (span * 2.5);
    const cx = state.monster.x;
    const cz = state.monster.z;
    const px = (x: number): number => SCOUT_SIZE / 2 + (x - cx) * scale;
    const pz = (z: number): number => SCOUT_SIZE / 2 + (z - cz) * scale;

    for (const room of near) {
      const own = room.id === here.id;
      ctx.strokeStyle = own ? '#8fb7ff' : '#2b3547';
      ctx.lineWidth = own ? 2 : 1;
      const x = px(room.rect.x * 2.5);
      const z = pz(room.rect.z * 2.5);
      ctx.strokeRect(x, z, room.rect.w * 2.5 * scale, room.rect.d * 2.5 * scale);
    }

    // Die Türen als Lücken andeuten — die Form eines Zimmers ist auch, wo man
    // hineinkommt.
    for (const door of spec.doors) {
      if (!near.some((room) => room.id === door.a || room.id === door.b)) continue;
      ctx.fillStyle = '#586880';
      ctx.fillRect(px((door.x + 0.5) * 2.5) - 3, pz((door.z + 0.5) * 2.5) - 3, 6, 6);
    }

    ctx.beginPath();
    ctx.fillStyle = '#ff5a5a';
    ctx.arc(px(cx), pz(cz), 6, 0, Math.PI * 2);
    ctx.fill();
  }

  private roomOfDrone(): HouseRoom | null {
    const drone = this.host.drone();
    return roomAtMetres(this.host.spec(), drone.x, drone.z);
  }

  // --- Eingaben ---------------------------------------------------------------

  private onClick(event: Event): void {
    const target = event.target as HTMLElement | null;
    const hit = target?.closest<HTMLElement>(
      '[data-sit],[data-room],[data-fly],[data-flip],[data-van]',
    );
    if (!hit) return;

    if (hit.dataset['van'] !== undefined) {
      this.vanOpen = !this.vanOpen;
    } else if (hit.dataset['sit']) {
      this.host.sit(hit.dataset['sit'] as StationId);
      this.vanOpen = false;
    } else if (hit.dataset['room']) {
      this.selected = hit.dataset['room'];
    } else if (hit.dataset['fly']) {
      this.host.flyTo(hit.dataset['fly']);
    } else if (hit.dataset['flip']) {
      this.host.flip(hit.dataset['flip'], hit.dataset['on'] !== '1');
    }
    this.drawn = '';
    this.refresh();
  }
}

// --- Kleinkram ---------------------------------------------------------------

function el(tag: string, className: string, text = ''): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  // `textContent` und nie `innerHTML`: Durch hier gehen Spielernamen, und die
  // hat sich niemand ausgesucht.
  if (text) node.textContent = text;
  return node;
}

function button(className: string, text: string, flag: string): HTMLElement {
  const node = el('button', className, text);
  node.dataset[flag] = '';
  return node;
}

/** Die Form eines Zimmers, wie man sie einem Späher zurufen würde. */
function shapeOf(room: HouseRoom): string {
  const { w, d } = room.rect;
  if (w === d) return `${w}×${d}, quadratisch`;
  return `${w}×${d}, ${w > d ? 'quer' : 'hoch'}`;
}

function roomAtMetres(spec: HouseSpec, x: number, z: number): HouseRoom | null {
  const tx = Math.floor(x / 2.5);
  const tz = Math.floor(z / 2.5);
  return (
    spec.rooms.find(
      (room) =>
        tx >= room.rect.x &&
        tx < room.rect.x + room.rect.w &&
        tz >= room.rect.z &&
        tz < room.rect.z + room.rect.d,
    ) ?? null
  );
}

/** Ob zwei Zimmer aneinandergrenzen — für „und was liegt daneben". */
function touches(a: HouseRoom, b: HouseRoom): boolean {
  const overlapX = a.rect.x < b.rect.x + b.rect.w && b.rect.x < a.rect.x + a.rect.w;
  const overlapZ = a.rect.z < b.rect.z + b.rect.d && b.rect.z < a.rect.z + a.rect.d;
  const sideBySide = a.rect.x + a.rect.w === b.rect.x || b.rect.x + b.rect.w === a.rect.x;
  const stacked = a.rect.z + a.rect.d === b.rect.z || b.rect.z + b.rect.d === a.rect.z;
  return (sideBySide && overlapZ) || (stacked && overlapX);
}
