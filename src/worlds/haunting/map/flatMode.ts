import './flat.css';
import { MONSTERS, repairsFor, type MonsterKind } from '../mission';
import { viewModesFor, type ViewMode } from '../registry/viewModes';
import './mapModes.register';
import {
  FlatRound,
  MONSTER_ID,
  PLAYER_ID,
  TOOL_LABELS,
  type FlatEvent,
  type FlatOptions,
  type FlatRole,
} from './flatRound';
import { Joystick } from './joystick';
import { FlatScene, scaleForWidth } from './flatScene';
import { MapView } from './mapView';
import { PuzzleOverlay, el } from './puzzleOverlay';
import { Rng } from '../rng';
import { clockText } from '../rules/roundRules';
import { TechnicianBot } from '../rules/technicianBot';
import { MonsterSession } from '../monster/monsterSession';
import { HauntingAudio, levelLabel } from '../audio';

/**
 * **Die 2D-Welt** — die Station als gezeichnete Szene, gespielt mit dem Daumen.
 *
 * Links der Stock, rechts unten ein großer Knopf „Benutzen" und darüber zwei
 * kleine: Werkzeug benutzen, Werkzeug wechseln. Die Szene (`flatScene.ts`)
 * folgt dem Spieler, lässt sich ziehen und mit zwei Fingern zoomen; ein
 * Knopf holt sie zurück. Oben links der Kasten mit dem Balken „Aufgaben
 * erledigt", der Aufgabenliste, Sauerstoffuhr und Anzug-Leben; oben rechts
 * Zahnrad und Karte. Die Karte ist die alte `MapView` als Overlay — die
 * Übersicht bleibt erreichbar, sie ist nur nicht mehr das Spielbild. Rätsel
 * liegen als Overlay über der Szene; das Optionsmenü hat genau zwei Modi
 * (`registry/viewModes.ts`, Publikum `flat`).
 *
 * Drei Rollen (`FlatRole`): der Techniker am Stock, das Monster
 * (`monster/monsterSession.ts`) — und die **Bot-Runde**, in der niemand
 * spielt: Der Techniker aus Zahlen (`rules/technicianBot.ts`) läuft seine
 * Runde gegen das Monster, die Karte folgt ihm, Stock und Knöpfe sind weg.
 * Das ist das 2D-Gegenstück zu „Bot-Runde ansehen" im Van.
 *
 * Kein three.js hier drin: Das aktive Werkzeug als 3D-Bild zeichnet die Welt
 * in das Loch, das `viewport()` beschreibt (`flatStage.ts`). Deshalb läuft
 * dieses Bauteil headless in jsdom, und deshalb kann es die Runde auch
 * dann rechnen, wenn gar kein WebGL da ist.
 */
export interface FlatModeHost {
  /** Die 2D-Welt verlassen — zurück zur Rollenwahl. */
  exit(): void;
  /** Eine Zeile an den Chat oder das Menü, wenn die Welt eine hat. */
  notify?(text: string): void;
}

/** Wie lange eine Meldung stehen bleibt, in Sekunden. */
const TOAST_SECONDS = 3.2;

/** Die drei Rollen im Optionsmenü, in der Reihenfolge des Durchschaltens. */
const ROLE_LABELS: Record<FlatRole, string> = {
  technician: 'Als Techniker spielen',
  monster: 'Als Monster spielen (Techniker: Bot)',
  bot: 'Bot-Runde zusehen',
};

export class FlatMode {
  readonly element = el('div', 'flat');
  round: FlatRound;
  /** Das Spielbild: die gezeichnete Szene. */
  readonly scene: FlatScene;
  /** Die Kartenübersicht im Overlay — die alte Karte, auf Knopfdruck. */
  readonly map: MapView;
  private readonly mapOverlay = el('div', 'flat__map');
  private readonly stick = new Joystick();
  private readonly hud = el('div', 'flat__hud');
  private readonly barFill = el('div', 'flat__bar-fill');
  private readonly vitals = el('div', 'flat__vitals');
  private readonly tasks = el('div', 'flat__tasks');
  private readonly tab = el('button', 'flat__tab', 'Aufgaben');
  private readonly toast = el('div', 'flat__toast');
  private readonly buttons = el('div', 'flat__buttons');
  private readonly cycleKey = el('button', 'flat__key flat__key--cycle');
  private readonly useKey = el('button', 'flat__key flat__key--use');
  private readonly actKey = el('button', 'flat__key flat__key--act');
  private readonly centreKey = el('button', 'flat__corner flat__centre', 'Zum Spieler');
  private readonly optionsKey = el('button', 'flat__corner flat__options', '⚙');
  private readonly mapKey = el('button', 'flat__corner flat__mapkey', '🗺');
  private readonly options = el('div', 'flat__panel');
  private readonly ending = el('div', 'flat__ending');
  private readonly hole = el('div', 'flat__item');
  private puzzle: PuzzleOverlay;
  /** Wenn der Spieler das Monster spielt: Steuer, Techniker-Bot und Ansicht (`monster/`). */
  private session: MonsterSession | null = null;
  /** In der Bot-Runde: der Techniker aus Zahlen am Stock statt des Spielers. */
  private bot: TechnicianBot | null = null;
  private toastLeft = 0;
  private mode: ViewMode;
  private seed: number;
  private readonly options_: FlatOptions;
  private readonly dice = new Rng(Date.now() >>> 0);
  /** Schritte, Monster und Herzschlag auf dem Hörmodell der Karte (Paket Audio). */
  private readonly audio = new HauntingAudio();

  constructor(
    seed: number,
    options: FlatOptions,
    private readonly host: FlatModeHost,
  ) {
    this.seed = seed;
    this.options_ = options;
    const modes = viewModesFor('flat');
    this.mode = modes.find((m) => m.visibility === (options.mode ?? 'realistic')) ?? modes[0]!;
    this.round = new FlatRound(seed, { ...options, mode: this.mode.visibility });
    this.puzzle = new PuzzleOverlay(this.round);
    const onRoomClick = (id: string): void =>
      this.say(`${this.round.snapshot().rooms.find((r) => r.id === id)?.name ?? id}`);
    const onEntityClick = (id: string): void =>
      this.say(this.round.entities().find((e) => e.id === id)?.label ?? id);
    const onItemClick = (id: string): void =>
      this.say(this.round.items().find((i) => i.id === id)?.label ?? id);
    this.scene = new FlatScene({
      mode: this.mode.visibility,
      onRoomClick,
      onEntityClick,
      onItemClick,
    });
    this.scene.element.classList.add('flat__scene');
    this.scene.setScale(scaleForWidth(typeof window === 'undefined' ? 1024 : window.innerWidth));
    this.scene.follow(PLAYER_ID);
    this.map = new MapView({
      layers: this.mode.layers,
      markers: this.mode.markers,
      mode: this.mode.visibility,
      minScale: 6,
      maxScale: 60,
      onRoomClick,
      onEntityClick,
      onItemClick,
    });
    this.map.follow(PLAYER_ID);
    this.map.setView({ scale: 22 });
    this.map.follow(PLAYER_ID);
    const mapClose = el('button', 'flat__map-close', 'Schließen');
    mapClose.addEventListener('click', () => this.showMap(false));
    this.mapOverlay.append(this.map.element, mapClose);
    this.mapOverlay.hidden = true;
    this.mapKey.addEventListener('click', () => this.showMap(this.mapOverlay.hidden));
    this.mapKey.setAttribute('aria-label', 'Karte');
    this.optionsKey.setAttribute('aria-label', 'Optionen');
    // Der Kasten oben links: Balken, Uhr und Anzug, Aufgabenliste, Reiter zum Einklappen.
    const bar = el('div', 'flat__bar');
    bar.append(this.barFill, el('span', 'flat__bar-label', 'Aufgaben erledigt'));
    this.hud.append(bar, this.vitals, this.tasks, this.tab);
    this.tab.addEventListener('click', () => this.hud.classList.toggle('is-collapsed'));

    this.cycleKey.dataset['action'] = 'cycle';
    this.useKey.dataset['action'] = 'use';
    this.actKey.dataset['action'] = 'interact';
    this.buttons.append(this.cycleKey, this.useKey, this.actKey);
    this.buttons.addEventListener('click', (event) => {
      const key = (event.target as HTMLElement | null)?.closest('button');
      const action = key?.dataset['action'];
      if (action === 'cycle' || action === 'use' || action === 'interact') {
        this.round.act(action);
        this.refreshKeys();
      }
    });
    this.centreKey.addEventListener('click', () => {
      this.scene.follow(PLAYER_ID);
      this.map.follow(PLAYER_ID);
    });
    this.optionsKey.addEventListener('click', () => {
      this.options.hidden = !this.options.hidden;
      if (!this.options.hidden) this.renderOptions();
    });
    this.options.hidden = true;
    this.options.addEventListener('click', (event) => this.optionClick(event));
    this.ending.hidden = true;
    this.ending.addEventListener('click', (event) => this.optionClick(event));
    this.hole.className = 'flat__item';
    this.element.append(
      this.scene.element,
      this.hud,
      this.toast,
      this.stick.element,
      this.buttons,
      this.hole,
      this.centreKey,
      this.mapKey,
      this.optionsKey,
      this.mapOverlay,
      this.puzzle.element,
      this.options,
      this.ending,
    );
    this.element.dataset['mode'] = this.mode.visibility;
    this.playRole(options.role ?? 'technician');
    this.refreshKeys();
    this.renderHud();
  }

  /**
   * Techniker, Monster oder Bot: Wer das Monster spielt, bekommt dessen
   * Ansicht statt Stock und Knöpfen; wer dem Bot zusieht, behält die Szene
   * und den Knopf, der sie zurück zum Techniker holt.
   */
  private playRole(role: FlatRole): void {
    this.session?.dispose();
    this.session = null;
    this.bot = null;
    if (role === 'monster') {
      this.session = new MonsterSession(
        this.round,
        (text) => this.say(text),
        this.options_.tuning?.technician,
      );
      this.element.insertBefore(this.session.element, this.hud);
    } else if (role === 'bot') {
      this.bot = new TechnicianBot(this.round, this.options_.tuning?.technician, () =>
        this.dice.next(),
      );
    }
    for (const node of [this.scene.element, this.centreKey, this.mapKey])
      node.hidden = role === 'monster';
    if (role === 'monster') this.showMap(false);
    for (const node of [this.stick.element, this.buttons, this.hole])
      node.hidden = role !== 'technician';
    this.element.dataset['role'] = role;
  }

  /** Wer gerade spielt — für Tests und die Anzeige. */
  get role(): FlatRole {
    return this.session ? 'monster' : this.bot ? 'bot' : 'technician';
  }

  /** Der Modus, den die Karte gerade zeigt. */
  get visibilityMode(): ViewMode['visibility'] {
    return this.mode.visibility;
  }

  get activeTool(): string {
    return this.round.activeTool;
  }

  /** Wo das 3D-Bild des Werkzeugs hingehört, in CSS-Punkten vom linken oberen Rand. */
  viewport(): { x: number; y: number; w: number; h: number } | null {
    if (this.round.phase !== 'running' || !this.round.activeTool || this.hole.hidden) return null;
    const rect = this.hole.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) return null;
    return { x: rect.left, y: rect.top, w: rect.width, h: rect.height };
  }

  /** Ein Bild: Stock lesen, Runde rechnen, Karte und Anzeigen nachführen. */
  update(dt: number): void {
    if (this.session) this.session.update(dt);
    else if (this.bot) this.bot.step(dt);
    else {
      const stick = this.stick.value;
      this.round.step(dt, { x: stick.x, z: stick.z, sprint: stick.sprint });
    }
    for (const event of this.round.drain()) this.show(event);
    this.audio.update(dt, {
      snapshot: this.round.snapshot(),
      // Wer das Monster spielt, hört mit dessen Ohren.
      listener: this.session ? MONSTER_ID : PLAYER_ID,
      kind: this.monsterKind,
      active: this.round.state().monsterOn,
    });
    this.toastLeft = Math.max(0, this.toastLeft - dt);
    if (this.toastLeft <= 0 && this.toast.textContent) {
      this.toast.textContent = '';
      this.toast.className = 'flat__toast';
    }
    if (!this.session) {
      this.scene.setSnapshot(this.round.snapshot());
      this.scene.setVisibility(this.round.field);
      this.scene.draw();
      if (!this.mapOverlay.hidden) {
        this.map.setSnapshot(this.round.snapshot());
        this.map.setVisibility(this.round.field);
        this.map.draw();
      }
      this.puzzle.sync();
      this.refreshKeys();
    }
    this.renderHud();
    if (this.round.phase !== 'running' && this.ending.hidden) this.renderEnding();
  }

  /** Die Kartenübersicht ein- oder ausblenden — sie zeichnet nur, solange sie offen ist. */
  showMap(open: boolean): void {
    this.mapOverlay.hidden = !open;
    this.mapKey.classList.toggle('is-active', open);
    if (open) {
      this.map.fit();
      this.map.setSnapshot(this.round.snapshot());
      this.map.setVisibility(this.round.field);
      this.map.draw();
    }
  }

  /** Nur für Tests: ob die Kartenübersicht offen ist. */
  get mapOpen(): boolean {
    return !this.mapOverlay.hidden;
  }

  private say(text: string): void {
    this.show({ kind: 'info', text });
  }

  private show(event: FlatEvent): void {
    this.toast.textContent = event.text;
    this.toast.className = `flat__toast is-${event.kind}`;
    this.toastLeft = TOAST_SECONDS;
    if (event.kind === 'good' || event.kind === 'bad') this.host.notify?.(event.text);
  }

  private refreshKeys(): void {
    const tool = this.round.activeTool;
    this.cycleKey.textContent = '';
    this.cycleKey.append(el('small', '', 'Wechseln'), el('strong', '', TOOL_LABELS[tool] ?? tool));
    this.cycleKey.disabled = this.round.tools.length < 2;
    this.useKey.textContent = '';
    const use =
      tool === 'flashlight'
        ? this.round.torch
          ? 'Lampe aus'
          : 'Lampe an'
        : tool === 'medkit'
          ? 'Heilen'
          : tool === 'radar'
            ? 'Orten'
            : tool === 'xray'
              ? 'Durchleuchten'
              : 'Benutzen';
    this.useKey.append(el('small', '', 'Werkzeug'), el('strong', '', use));
    const target = this.round.target;
    this.actKey.textContent = '';
    this.actKey.append(el('strong', '', 'Benutzen'), el('small', '', target?.label ?? ''));
    this.actKey.classList.toggle('is-ready', !!target);
  }

  /**
   * Der Kasten oben links, wie in der Vorlage: der grüne Balken zählt die
   * erledigten Reparaturen, darunter Uhr und Anzug, darunter die Aufgaben —
   * erledigte grün, mit `(n/2)`, weil jede Reparatur zwei Schritte hat:
   * das Teil aus der Fracht holen, dann die Konsole lösen. Gebaut wird nur,
   * wenn sich der Text ändert; die Uhr allein schreibt keine neue Liste.
   */
  private renderHud(): void {
    const state = this.round.state();
    const crew = state.crew;
    const monster = MONSTERS.find((m) => m.id === crew.options.monster)?.name ?? '';
    const round = this.round.round();
    const hp = '●'.repeat(round.suit) + '○'.repeat(Math.max(0, round.suitMax - round.suit));
    const who = this.bot ? 'Bot-Runde · ' : '';
    const cabins = round.cabinsDestroyed.length
      ? ` · ${round.cabinsDestroyed.length} Kabinen hin`
      : '';
    const line = `${who}${state.monsterOn ? monster : 'Test ohne Monster'} · ${this.mode.label}${cabins}`;
    const status = crew.hidden ? 'versteckt' : this.round.radarActive ? 'Radar' : '';
    const rooms = this.round.snapshot().rooms;
    const lines = repairsFor(this.round.house).map((repair) => {
      const done = state.done.includes(repair.itemId);
      const carried =
        done || crew.inventory.includes(repair.itemId) || state.taken.includes(repair.itemId);
      const room = rooms.find((r) => r.id === repair.roomId)?.name ?? repair.roomId;
      return {
        text: `${room}: ${repair.title} (${done ? 2 : carried ? 1 : 0}/2)`,
        done,
        partial: carried && !done,
      };
    });
    const key = [hp, clockText(round.oxygen), status, line, ...lines.map((l) => l.text)].join('|');
    if (this.hud.dataset['text'] === key) return;
    this.hud.dataset['text'] = key;
    this.barFill.style.width = `${Math.round((Math.min(3, state.done.length) / 3) * 100)}%`;
    this.vitals.replaceChildren(
      el('strong', 'flat__oxygen', `O₂ ${clockText(round.oxygen)}`),
      el('strong', 'flat__suit', hp),
      el('span', '', [status, line].filter(Boolean).join(' · ')),
    );
    this.vitals.classList.toggle('is-low', round.oxygen < 60);
    this.tasks.replaceChildren(
      ...lines.map((l) => {
        const node = el('div', 'flat__task', l.text);
        node.classList.toggle('is-done', l.done);
        node.classList.toggle('is-partial', l.partial);
        return node;
      }),
    );
  }

  private renderOptions(): void {
    const parts: HTMLElement[] = [el('strong', '', 'Ansicht')];
    for (const mode of viewModesFor('flat')) {
      const key = el('button', 'flat__option');
      key.dataset['mode'] = mode.id;
      key.classList.toggle('is-active', mode.id === this.mode.id);
      key.append(el('strong', '', mode.label), el('small', '', mode.description));
      parts.push(key);
    }
    parts.push(el('strong', '', 'Runde'));
    const restart = el('button', 'flat__option', 'Neue Runde');
    restart.dataset['restart'] = '';
    const monster = el('button', 'flat__option');
    monster.dataset['monster'] = '';
    monster.append(
      el('strong', '', this.round.state().monsterOn ? 'Mit Monster' : 'Ohne Monster (Test)'),
      el('small', '', 'Gilt für die nächste Runde'),
    );
    const role = el('button', 'flat__option');
    role.dataset['role'] = '';
    role.append(
      el('strong', '', ROLE_LABELS[this.options_.role ?? 'technician']),
      el('small', '', 'Gilt für die nächste Runde · antippen wechselt'),
    );
    // Ton: zwei Regler mit drei Stufen (Paket Audio, `audio/settings.ts`).
    parts.push(el('strong', '', 'Ton'));
    for (const which of ['effects', 'ambient'] as const) {
      const key = el('button', 'flat__option');
      key.dataset['audio'] = which;
      key.append(
        el(
          'strong',
          '',
          `${which === 'effects' ? 'Effekte' : 'Ambiente'}: ${levelLabel(this.audio.levels[which])}`,
        ),
        el(
          'small',
          '',
          which === 'effects'
            ? 'Schritte, Monster, Herzschlag'
            : 'Brummen der Station, Dunkelheit, Knarren',
        ),
      );
      parts.push(key);
    }
    const leave = el('button', 'flat__option flat__option--leave', '2D-Welt verlassen');
    leave.dataset['leave'] = '';
    const close = el('button', 'flat__option', 'Zurück');
    close.dataset['closeOptions'] = '';
    parts.push(restart, monster, role, leave, close);
    this.options.replaceChildren(...parts);
  }

  private renderEnding(): void {
    const won = this.round.phase === 'won';
    this.ending.hidden = false;
    const again = el('button', 'flat__option', 'Neue Runde');
    again.dataset['restart'] = '';
    const leave = el('button', 'flat__option flat__option--leave', '2D-Welt verlassen');
    leave.dataset['leave'] = '';
    const ending = this.round.round().ending;
    const headline = this.session
      ? won
        ? 'DER TECHNIKER ENTKOMMT'
        : 'DAS MONSTER GEWINNT'
      : this.bot
        ? won
          ? 'BOT-RUNDE: DER TECHNIKER GEWINNT'
          : 'BOT-RUNDE: DAS MONSTER GEWINNT'
        : won
          ? 'MISSION ERFÜLLT'
          : 'MISSION GESCHEITERT';
    this.ending.replaceChildren(
      el('strong', '', headline),
      el(
        'span',
        '',
        won
          ? 'Alle Systeme online, Crew zurück in der Zentrale.'
          : ending === 'oxygen'
            ? 'Der Sauerstoff ist aufgebraucht. Noch einmal?'
            : 'Anzug zerstört. Noch einmal?',
      ),
      again,
      leave,
    );
  }

  private optionClick(event: Event): void {
    const key = (event.target as HTMLElement | null)?.closest('button');
    if (!key) return;
    const data = key.dataset;
    if (data['mode']) {
      const mode = viewModesFor('flat').find((m) => m.id === data['mode']);
      if (mode) this.setMode(mode);
      this.renderOptions();
    } else if (data['restart'] !== undefined) {
      this.restart({ ...this.options_, test: !this.round.state().monsterOn });
    } else if (data['monster'] !== undefined) {
      this.options_.test = this.round.state().monsterOn;
      this.renderOptions();
    } else if (data['role'] !== undefined) {
      const roles = Object.keys(ROLE_LABELS) as FlatRole[];
      this.options_.role =
        roles[(roles.indexOf(this.options_.role ?? 'technician') + 1) % roles.length]!;
      this.renderOptions();
    } else if (data['leave'] !== undefined) {
      this.host.exit();
    } else if (data['audio'] === 'effects' || data['audio'] === 'ambient') {
      this.audio.cycle(data['audio']);
      this.renderOptions();
    } else if (data['closeOptions'] !== undefined) {
      this.options.hidden = true;
    }
  }

  setMode(mode: ViewMode): void {
    this.mode = mode;
    this.round.setMode(mode.visibility);
    this.map.setLayers(mode.layers);
    this.map.setMarkers(mode.markers);
    this.element.dataset['mode'] = mode.visibility;
  }

  /** Eine neue Runde mit neuem Samen — Werkzeuge und Karte von vorn. */
  restart(options: FlatOptions = this.options_): void {
    this.seed = this.dice.int(0x7fffffff);
    this.round = new FlatRound(this.seed, { ...options, mode: this.mode.visibility });
    this.puzzle.element.remove();
    this.puzzle = new PuzzleOverlay(this.round);
    this.element.insertBefore(this.puzzle.element, this.options);
    this.ending.hidden = true;
    this.options.hidden = true;
    this.showMap(false);
    this.scene.follow(PLAYER_ID);
    this.map.fit();
    this.map.follow(PLAYER_ID);
    this.playRole(options.role ?? 'technician');
    this.refreshKeys();
  }

  /** Nur für Tests: die Erscheinung des Monsters der laufenden Runde. */
  get monsterKind(): MonsterKind {
    return this.round.state().crew.options.monster;
  }

  dispose(): void {
    this.session?.dispose();
    this.audio.dispose();
    this.stick.dispose();
    this.scene.dispose();
    this.map.dispose();
    this.element.remove();
  }
}
