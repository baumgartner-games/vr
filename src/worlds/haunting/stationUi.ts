import './haunting.css';
import { MARKS, namesakes, roomOf, type HouseRoom, type HouseSpec } from './house';
import { visibleSwitches } from './panel';
import {
  MOVE_TIME,
  seating,
  shoved,
  stationFacts,
  STATIONS,
  type Claim,
  type StationId,
} from './stations';
import { droneSeconds, type DroneStatus } from './droneRoute';
import type { DroneState, HauntState } from './net';

/**
 * **Der Van, wie er auf einem Telefon aussieht.**
 *
 * Zuerst fürs Handy gebaut und auf dem Laptop breiter gezogen, nicht
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
 *
 * **Jede Station hat eine Farbe, und es ist ihre.** Sie steht an der Kachel im
 * Van, am Punkt neben dem Namen in der Kopfzeile und am Rand der eigenen
 * Seite — dieselben vier Töne, die im Haus auf den Monitoren des Vans leuchten
 * (`HauntingWorld.buildVan`). Am Tisch wird zugerufen und nicht gelesen; „ich
 * hab den grünen" ist eine Ansage, „ich hab die dritte Kachel von oben" nicht.
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
  /** Was die Wegsuche der Drohne gerade sagt (`droneRoute.ts`). */
  droneStatus(): DroneStatus;
  /** Und in welchen Zimmern sie schon war — das Einzige, was sie behält. */
  droneSeen(): ReadonlySet<string>;
  /** Ihren Scheinwerfer umlegen. */
  droneLight(): void;
}

/**
 * Wie groß der Späherschirm gezeichnet wird, in Gerätepunkten.
 *
 * Er wird beim Zeichnen an die wirkliche Breite **und** an die Pixeldichte
 * angepasst; die Zahl hier ist nur der Anfangswert, bevor das Element einmal
 * im Layout stand. Eine feste Leinwand auf einem Telefon mit dreifacher Dichte
 * ist ein verwaschenes Bild, und ausgerechnet der Späher hat nichts als
 * Konturen.
 */
const SCOUT_SIZE = 320;

export class StationUi {
  private readonly root = document.createElement('div');
  private readonly bar = document.createElement('header');
  private readonly quest = document.createElement('div');
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
    this.quest.className = 'haunt__quest';
    this.view.className = 'haunt__view';
    this.body.className = 'haunt__body';
    this.scout.className = 'haunt__scout';
    this.scout.width = SCOUT_SIZE;
    this.scout.height = SCOUT_SIZE;
    this.root.append(this.bar, this.quest, this.view, this.body);
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
    const drone = this.host.drone();
    const status = this.host.droneStatus();
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
      Math.round(drone.battery * 40),
      drone.target,
      drone.light,
      status.kind,
      status.here,
      // Nur auf ganze Meter: Eine Anzeige, die zwanzigmal je Sekunde eine
      // Nachkommastelle ändert, schriebe die Seite zwanzigmal je Sekunde neu.
      Math.round(status.metres),
      this.host.droneSeen().size,
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

    // Die Farbe der Station hängt am Wurzelelement und nicht an jeder Kachel
    // einzeln: Von hier aus färbt sie Kopfzeile, Rand und Knöpfe über eine
    // einzige Variable, und eine fünfte Station bekommt eine Zeile im CSS.
    this.root.dataset['station'] = station ?? 'van';

    const back = el('button', 'haunt__back');
    back.dataset['van'] = '';
    back.append(
      el('span', 'haunt__back-icon', this.vanOpen ? '▸' : '◂'),
      el('span', '', this.vanOpen ? 'Station' : 'Van'),
    );
    back.setAttribute(
      'aria-label',
      this.vanOpen ? 'Zurück zur eigenen Station' : 'Zur Geräteübersicht im Van',
    );

    const where = el('span', 'haunt__where');
    where.append(
      el('strong', '', facts ? facts.label : 'Van'),
      el('small', '', facts ? facts.tagline : 'Vier Geräte, und nie genug Leute'),
    );

    this.bar.replaceChildren(
      where,
      el(
        'span',
        `haunt__state${state.monsterOn ? ' is-hot' : ''}`,
        state.monsterOn ? 'Monster an' : 'Monster aus',
      ),
      back,
    );

    this.writeQuest(state, spec);
    this.body.replaceChildren(...this.page(station));
    this.body.scrollTop = 0;
  }

  /**
   * **Der Auftragsstreifen** — ein Feld je Sache, und drei Zustände.
   *
   * `0/3` sagt, wie viele es sind; es sagt nicht, dass eine davon gerade in der
   * Hand des VR-Spielers liegt und noch nicht im Van. Genau dieser Unterschied
   * ist am Tisch die Frage, die gestellt wird („hast du sie schon abgelegt?"),
   * und drei Kästchen beantworten sie ohne ein Wort.
   */
  private writeQuest(state: HauntState, spec: HouseSpec): void {
    const pips = spec.tasks.map((task) => {
      const done = state.done.includes(task.id);
      const held = !done && state.taken.includes(task.id);
      const pip = el('i', `haunt__pip${done ? ' is-done' : held ? ' is-held' : ''}`);
      pip.title = `${task.label} — ${done ? 'im Van' : held ? 'in der Hand' : 'noch im Haus'}`;
      return pip;
    });
    const held = spec.tasks.filter(
      (task) => state.taken.includes(task.id) && !state.done.includes(task.id),
    ).length;

    const strip = el('span', 'haunt__pips');
    strip.append(...pips);
    this.quest.replaceChildren(
      el('span', 'haunt__quest-label', 'Auftrag'),
      strip,
      el(
        'span',
        'haunt__quest-count',
        `${state.done.length}/${spec.tasks.length}${held > 0 ? ` · ${held} unterwegs` : ''}`,
      ),
    );
    this.quest.setAttribute(
      'aria-label',
      `${state.done.length} von ${spec.tasks.length} Sachen im Van`,
    );
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
    const wanted = this.host.wanted();
    const travel = this.host.arriving();
    const out: HTMLElement[] = [];

    if (shoved(claims, me)) {
      out.push(
        note(
          'warn',
          'Weggeschubst',
          'Jemand saß länger an dem Gerät. Nimm ein anderes — du verlierst Zeit, aber nichts, was du schon weißt.',
        ),
      );
    }

    for (const station of STATIONS) {
      const owner = seats.get(station.id);
      const mine = owner === me;
      const coming = wanted === station.id && travel > 0;
      const tile = el('button', 'haunt__tile');
      tile.dataset['sit'] = station.id;
      tile.dataset['accent'] = station.id;
      tile.setAttribute('aria-pressed', mine ? 'true' : 'false');
      if (mine) tile.classList.add('is-mine');
      else if (owner) tile.classList.add('is-taken');
      if (coming) tile.classList.add('is-coming');

      const head = el('span', 'haunt__tile-head');
      head.append(
        el('strong', '', station.label),
        el(
          'span',
          `haunt__seat${mine ? ' is-mine' : owner ? ' is-taken' : ''}`,
          mine ? 'du sitzt hier' : owner ? this.host.nameOf(owner) : 'frei',
        ),
      );
      tile.append(head, el('span', 'haunt__tag', station.tagline));
      tile.append(el('span', 'haunt__blind', `Sieht nicht: ${station.sees}`));

      if (coming) {
        const rail = el('span', 'haunt__rail');
        const fill = el('i', '');
        // Von leer auf voll, damit man den Balken *ankommen* sieht.
        fill.style.width = `${Math.round((1 - travel / MOVE_TIME) * 100)}%`;
        rail.append(fill);
        tile.append(rail, el('span', 'haunt__tag', `Unterwegs … ${travel.toFixed(1)} s`));
      }
      out.push(tile);
    }
    return out;
  }

  /** Der Archivar: eine Akte, in der man **ein** Zimmer aufschlägt. */
  private archivePage(): HTMLElement[] {
    const spec = this.host.spec();
    const state = this.host.state();
    const room = roomOf(spec, this.selected) ?? spec.rooms[0];
    const out: HTMLElement[] = [];

    out.push(head('Auftrag'));
    const tasks = el('div', 'haunt__tasks');
    for (const task of spec.tasks) {
      const done = state.done.includes(task.id);
      const held = !done && state.taken.includes(task.id);
      const row = el('p', `haunt__task-row${done ? ' is-done' : held ? ' is-held' : ''}`);
      row.append(el('strong', '', task.label), el('span', '', ` ${task.hint}`));
      // Nur was vom Normalfall abweicht, bekommt ein Schild. Drei Zeilen mit
      // dreimal „noch im Haus" sind drei Schilder, die nichts unterscheiden —
      // und dann sieht man das eine nicht mehr, das etwas sagt.
      if (done || held) {
        row.append(el('span', 'haunt__chip', done ? 'im Van' : 'in der Hand'));
      }
      tasks.append(row);
    }
    out.push(tasks);

    out.push(head('Akte', `${spec.rooms.length} Zimmer`));
    const list = el('div', 'haunt__rooms');
    for (const one of spec.rooms) {
      const entry = el('button', 'haunt__room');
      entry.dataset['room'] = one.id;
      const open = one.id === room?.id;
      entry.setAttribute('aria-pressed', open ? 'true' : 'false');
      if (open) entry.classList.add('is-open');
      entry.append(el('span', '', one.name));
      if (namesakes(spec, one) > 1) entry.append(el('span', 'haunt__twin', 'zweimal im Haus'));
      list.append(entry);
    }
    out.push(list);

    if (room) {
      out.push(head(room.name, 'aufgeschlagen'));
      const sheet = el('div', 'haunt__sheet');
      sheet.append(
        fact('Darin steht', room.marks.map((m) => MARKS[m.id]).join(', ')),
        fact('Licht', room.lamp ? 'Eine Lampe unter der Decke.' : 'Keine. Bleibt dunkel.'),
      );
      const doors = spec.doors.filter((door) => door.a === room.id || door.b === room.id);
      sheet.append(
        fact(
          doors.length === 1 ? 'Tür' : 'Türen',
          `${doors.length}${doors.some((door) => door.material === 'metal') ? ', eine davon aus Stahl' : ''}`,
        ),
      );
      if (spec.fuse.roomId === room.id) {
        sheet.append(fact('Achtung', 'Hier hängt der Sicherungskasten.', true));
      }
      out.push(sheet);
    }
    return out;
  }

  /** Der Späher: Konturen und ein Punkt. Sonst nichts, mit Absicht. */
  private scoutPage(): HTMLElement[] {
    const state = this.host.state();
    const frame = el('div', `haunt__radar${state.monster ? '' : ' is-empty'}`);
    frame.append(this.scout);
    if (!state.monster) {
      frame.append(
        el('span', 'haunt__radar-empty', state.monsterOn ? 'Kein Signal' : 'Schirm leer'),
      );
    }
    return [
      frame,
      note(
        state.monsterOn ? 'live' : 'calm',
        state.monsterOn ? 'Es bewegt sich' : 'Nichts im Haus',
        state.monsterOn
          ? 'Beschreib die Form — Namen hast du keine. Wände, Türlücken und ein Punkt, mehr gibt der Schirm nicht her.'
          : 'Der VR-Spieler hat das Monster ausgeschaltet. Solange er es lässt, bleibt dein Schirm dunkel.',
      ),
    ];
  }

  /**
   * **Der Pilot**: oben das Bild, darunter Akku, Licht und die Karte.
   *
   * Drei Sachen kann er, und sie stehen in der Reihenfolge, in der man sie
   * braucht: sehen (Scheinwerfer), wissen, wie lange noch (Akku), und
   * hinfliegen (Karte). Die Karte ist keine Karte, sondern eine Liste — der
   * Grundriss gehört dem Archivar, und ein Pilot mit Grundriss lotste allein.
   */
  private dronePage(): HTMLElement[] {
    const spec = this.host.spec();
    const drone = this.host.drone();
    const status = this.host.droneStatus();
    const seen = this.host.droneSeen();
    const out: HTMLElement[] = [];

    // --- Akku: der Balken und die Zeit, die er noch hergibt.
    const left = Math.round(droneSeconds(drone.battery, drone.light));
    const level = drone.battery > 0.4 ? 'good' : drone.battery > 0.15 ? 'low' : 'flat';
    const gauge = el('div', `haunt__gauge is-${level}`);
    const rail = el('span', 'haunt__rail');
    const fill = el('i', '');
    fill.style.width = `${Math.round(drone.battery * 100)}%`;
    rail.append(fill);
    gauge.append(
      el('span', 'haunt__gauge-num', `${Math.round(drone.battery * 100)} %`),
      rail,
      el(
        'span',
        'haunt__tag',
        drone.battery > 0
          ? `noch ~${Math.max(0, left)} s${drone.light ? ' · mit Licht' : ''}`
          : 'leer — sie liegt, wo sie liegt',
      ),
    );

    // --- Der Scheinwerfer.
    const lamp = el('button', `haunt__lamp${drone.light ? ' is-on' : ''}`);
    lamp.dataset['lamp'] = '';
    if (drone.battery <= 0) lamp.setAttribute('disabled', '');
    lamp.setAttribute('aria-pressed', drone.light ? 'true' : 'false');
    lamp.append(
      el('span', 'haunt__lamp-bulb', drone.light ? '☀' : '☾'),
      el('span', 'haunt__lamp-text', drone.light ? 'Scheinwerfer an' : 'Scheinwerfer aus'),
      el(
        'span',
        'haunt__tag',
        drone.light
          ? 'Der Kegel leuchtet nach vorn — auch für den im Haus. Und er frisst Akku.'
          : 'Ein Kegel nach vorn. Er hilft dem VR-Spieler mehr als dir.',
      ),
    );

    const cockpit = el('div', 'haunt__cockpit');
    cockpit.append(gauge, lamp);
    out.push(cockpit);

    // --- Wo sie ist und was die Wegsuche dazu sagt.
    out.push(this.droneNote(status, drone));

    // --- Die Zimmerliste.
    out.push(head('Wohin?', 'noch einmal antippen bricht ab'));
    const grid = el('div', 'haunt__map');
    for (const room of spec.rooms) {
      const cell = el('button', 'haunt__cell');
      cell.dataset['fly'] = room.id;
      const target = drone.target === room.id;
      const here = status.here === room.id;
      cell.setAttribute('aria-pressed', target ? 'true' : 'false');
      if (target) cell.classList.add('is-target');
      if (here) cell.classList.add('is-here');
      const line = el('span', 'haunt__cell-head');
      line.append(el('span', '', room.name));
      if (here) line.append(el('span', 'haunt__chip haunt__chip--here', 'hier'));
      else if (target) line.append(el('span', 'haunt__chip haunt__chip--go', 'Ziel'));
      else if (seen.has(room.id)) line.append(el('span', 'haunt__chip', 'gesehen'));
      cell.append(line, el('span', 'haunt__tag', shapeOf(room)));
      // Zwillinge heißen gleich, und auf einer Liste sind zwei gleiche Zeilen
      // ein Zufallsknopf. Die Nummer sagt nicht, welches welches ist — sie sagt
      // nur, dass es zwei sind, und das ist genau die Auskunft, die der Pilot
      // dem Archivar zurufen muss.
      if (namesakes(spec, room) > 1) {
        cell.append(el('span', 'haunt__twin', `Namensvetter · ${roomNumber(spec, room)}`));
      }
      grid.append(cell);
    }
    out.push(grid);
    return out;
  }

  /** Die eine Zeile, in der die Wegsuche zum Piloten spricht. */
  private droneNote(status: DroneStatus, drone: DroneState): HTMLElement {
    const spec = this.host.spec();
    const where = roomOf(spec, status.here)?.name ?? 'zwischen zwei Zimmern';
    const goal = roomOf(spec, drone.target)?.name ?? '';
    const far = `${Math.max(1, Math.round(status.metres))} m`;

    if (status.kind === 'flat') {
      return note('warn', 'Akku leer', `Sie liegt in ${where}. Von hier fliegt sie nicht mehr.`);
    }
    if (status.kind === 'blocked') {
      return note(
        'warn',
        'Kein Weg',
        `Sie steht in ${where}. Zwischen hier und ${goal} ist etwas zu — sie macht keine Tür auf. Ruf es in den Van.`,
      );
    }
    if (status.kind === 'flying') {
      return note(
        'live',
        `Unterwegs nach ${goal}`,
        `Noch ${far} auf ihrer Bahn. Sie fliegt nicht die Luftlinie, sondern sucht sich einen Weg.`,
      );
    }
    return note(
      'calm',
      `Sie schwebt in ${where}`,
      'Tipp ein Zimmer an, dann sucht sie sich einen Weg dorthin.',
    );
  }

  /** Der Hacker: Schalter, und keiner sagt, wo er hingeht. */
  private hackPage(): HTMLElement[] {
    const spec = this.host.spec();
    const state = this.host.state();
    const list = visibleSwitches(spec.switches, state.fuse);
    const out: HTMLElement[] = [];

    out.push(
      note(
        state.fuse ? 'live' : 'calm',
        state.fuse ? 'Volle Tafel' : 'Halbe Tafel',
        state.fuse
          ? 'Der Sicherungskasten ist umgelegt. Mehr Schalter als das hier gibt es nicht.'
          : 'Der Rest hängt am Sicherungskasten im Haus. Der Archivar weiß, in welchem Zimmer er hängt.',
      ),
    );

    out.push(head('Tafel', `${list.length} Schalter`));
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
      key.setAttribute('aria-pressed', on ? 'true' : 'false');
      const knob = el('span', 'haunt__knob');
      knob.append(el('i', ''));
      key.append(el('span', 'haunt__switch-label', entry.label), knob);
      grid.append(key);
    }
    out.push(grid);
    out.push(
      note(
        'calm',
        'Die Beschriftungen lügen nie',
        'Sie sind nur unvollständig. „Tür 3" ist wirklich eine Tür — wo, sagt niemand.',
      ),
    );
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
   *
   * **Die Leinwand hängt an der Pixeldichte** und nicht an einer festen Zahl.
   * Auf einem Telefon mit dreifacher Dichte war ein 260er Bild auf 320 Punkte
   * gezogen, und ausgerechnet der Späher hat nichts als Konturen — ein
   * verwaschener Strich ist bei ihm kein Schönheitsfehler, sondern die
   * Auskunft.
   */
  private drawScout(): void {
    const ctx = this.scout.getContext('2d');
    const spec = this.host.spec();
    const state = this.host.state();
    if (!ctx) return;

    const box = this.scout.getBoundingClientRect();
    const dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
    const size = Math.max(120, Math.round(Math.min(box.width || SCOUT_SIZE, 420) * dpr));
    if (this.scout.width !== size) {
      this.scout.width = size;
      this.scout.height = size;
    }

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#070a10';
    ctx.fillRect(0, 0, size, size);

    // Ein Fadenkreuz, damit ein leerer Schirm nach *Schirm* aussieht und nicht
    // nach kaputtem Bild. Es sagt nichts über das Haus — es sagt nur, dass das
    // Gerät läuft.
    ctx.strokeStyle = 'rgba(90, 130, 190, 0.16)';
    ctx.lineWidth = Math.max(1, dpr * 0.5);
    for (const ring of [0.22, 0.44, 0.66]) {
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size * ring, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(size / 2, 0);
    ctx.lineTo(size / 2, size);
    ctx.moveTo(0, size / 2);
    ctx.lineTo(size, size / 2);
    ctx.stroke();
    if (!state.monster) return;

    const here = roomAtMetres(spec, state.monster.x, state.monster.z);
    if (!here) return;
    const near = spec.rooms.filter((room) => room.id === here.id || touches(room, here));

    // Der Ausschnitt folgt dem Monster und nicht dem Haus: eine feste Karte
    // wäre wieder ein Grundriss, und den hat der Archivar.
    const span = 5;
    const scale = size / (span * 2.5);
    const cx = state.monster.x;
    const cz = state.monster.z;
    const px = (x: number): number => size / 2 + (x - cx) * scale;
    const pz = (z: number): number => size / 2 + (z - cz) * scale;

    for (const room of near) {
      const own = room.id === here.id;
      ctx.strokeStyle = own ? '#8fb7ff' : '#2b3547';
      ctx.lineWidth = (own ? 2 : 1) * dpr;
      const x = px(room.rect.x * 2.5);
      const z = pz(room.rect.z * 2.5);
      ctx.strokeRect(x, z, room.rect.w * 2.5 * scale, room.rect.d * 2.5 * scale);
    }

    // Die Türen als Lücken andeuten — die Form eines Zimmers ist auch, wo man
    // hineinkommt.
    for (const door of spec.doors) {
      if (!near.some((room) => room.id === door.a || room.id === door.b)) continue;
      ctx.fillStyle = '#586880';
      const r = 3 * dpr;
      ctx.fillRect(px((door.x + 0.5) * 2.5) - r, pz((door.z + 0.5) * 2.5) - r, r * 2, r * 2);
    }

    // Der Punkt bekommt einen Hof: Auf einem hellen Telefon im Sonnenlicht ist
    // ein sechs Punkt großer Kreis auf schwarzem Grund schlicht nicht da.
    const glow = ctx.createRadialGradient(px(cx), pz(cz), 0, px(cx), pz(cz), 18 * dpr);
    glow.addColorStop(0, 'rgba(255, 90, 90, 0.55)');
    glow.addColorStop(1, 'rgba(255, 90, 90, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(px(cx) - 18 * dpr, pz(cz) - 18 * dpr, 36 * dpr, 36 * dpr);
    ctx.beginPath();
    ctx.fillStyle = '#ff5a5a';
    ctx.arc(px(cx), pz(cz), 5 * dpr, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Eingaben ---------------------------------------------------------------

  private onClick(event: Event): void {
    const target = event.target as HTMLElement | null;
    const hit = target?.closest<HTMLElement>(
      '[data-sit],[data-room],[data-fly],[data-flip],[data-van],[data-lamp]',
    );
    if (!hit) return;

    if (hit.dataset['van'] !== undefined) {
      this.vanOpen = !this.vanOpen;
    } else if (hit.dataset['lamp'] !== undefined) {
      this.host.droneLight();
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

/** Eine Zwischenüberschrift mit einer kleinen Beisage rechts. */
function head(title: string, aside = ''): HTMLElement {
  const node = el('h2', 'haunt__h');
  node.append(el('span', '', title));
  if (aside) node.append(el('span', 'haunt__h-aside', aside));
  return node;
}

/**
 * Eine Kachel mit Ton: `warn` gelb, `live` in der Farbe der Station, `calm`
 * grau. Drei Töne und nicht fünf — eine Oberfläche, in der jede zweite Zeile
 * leuchtet, hat keine Betonung mehr.
 */
function note(tone: 'warn' | 'live' | 'calm', title: string, text: string): HTMLElement {
  const node = el('div', `haunt__note is-${tone}`);
  node.append(el('strong', '', title), el('span', '', text));
  return node;
}

/** Eine Zeile im Aktenblatt: Begriff links, Auskunft rechts. */
function fact(label: string, value: string, warn = false): HTMLElement {
  const row = el('div', `haunt__fact${warn ? ' is-warn' : ''}`);
  row.append(el('span', 'haunt__fact-key', label), el('span', 'haunt__fact-value', value));
  return row;
}

/** Die Form eines Zimmers, wie man sie einem Späher zurufen würde. */
function shapeOf(room: HouseRoom): string {
  const { w, d } = room.rect;
  if (w === d) return `${w}×${d}, quadratisch`;
  return `${w}×${d}, ${w > d ? 'quer' : 'hoch'}`;
}

/** Das wievielte Zimmer dieses Namens es in der Liste ist — 1, 2, … */
function roomNumber(spec: HouseSpec, room: HouseRoom): number {
  return spec.rooms.filter((one) => one.name === room.name).indexOf(room) + 1;
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
