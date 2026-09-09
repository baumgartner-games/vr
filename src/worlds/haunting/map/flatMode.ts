import './flat.css';
import { MONSTERS, type MonsterKind } from '../mission';
import { viewModesFor, type ViewMode } from '../registry/viewModes';
import './mapModes.register';
import { FlatRound, PLAYER_ID, TOOL_LABELS, type FlatEvent, type FlatOptions } from './flatRound';
import { Joystick } from './joystick';
import { MapView } from './mapView';
import { PuzzleOverlay, el } from './puzzleOverlay';
import { Rng } from '../rng';
import { clockText } from '../rules/roundRules';
import { MonsterSession } from '../monster/monsterSession';

/**
 * **Die 2D-Welt** — die Station von oben, gespielt mit dem Daumen.
 *
 * Links der Stock, rechts drei Knöpfe: Werkzeug wechseln, Werkzeug benutzen,
 * mit dem interagieren, was vor einem liegt. Die Karte in der Mitte lässt
 * sich frei ziehen und mit zwei Fingern zoomen; ein Knopf holt sie wieder
 * zum Spieler zurück. Rätsel liegen als Overlay über der Karte; das
 * Optionsmenü hat genau zwei Modi (`registry/viewModes.ts`, Publikum `flat`).
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

export class FlatMode {
  readonly element = el('div', 'flat');
  round: FlatRound;
  readonly map: MapView;
  private readonly stick = new Joystick();
  private readonly hud = el('div', 'flat__hud');
  private readonly toast = el('div', 'flat__toast');
  private readonly buttons = el('div', 'flat__buttons');
  private readonly cycleKey = el('button', 'flat__key flat__key--cycle');
  private readonly useKey = el('button', 'flat__key flat__key--use');
  private readonly actKey = el('button', 'flat__key flat__key--act');
  private readonly centreKey = el('button', 'flat__corner flat__centre', 'Zum Spieler');
  private readonly optionsKey = el('button', 'flat__corner flat__options', 'Optionen');
  private readonly options = el('div', 'flat__panel');
  private readonly ending = el('div', 'flat__ending');
  private readonly hole = el('div', 'flat__item');
  private puzzle: PuzzleOverlay;
  /** Wenn der Spieler das Monster spielt: Steuer, Techniker-Bot und Ansicht (`monster/`). */
  private session: MonsterSession | null = null;
  private toastLeft = 0;
  private mode: ViewMode;
  private seed: number;
  private readonly options_: FlatOptions;
  private readonly dice = new Rng(Date.now() >>> 0);

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
    this.map = new MapView({
      layers: this.mode.layers,
      markers: this.mode.markers,
      mode: this.mode.visibility,
      minScale: 6,
      maxScale: 60,
      onRoomClick: (id) =>
        this.say(`${this.round.snapshot().rooms.find((r) => r.id === id)?.name ?? id}`),
      onEntityClick: (id) => this.say(this.round.entities().find((e) => e.id === id)?.label ?? id),
      onItemClick: (id) => this.say(this.round.items().find((i) => i.id === id)?.label ?? id),
    });
    this.map.element.classList.add('flat__map');
    this.map.follow(PLAYER_ID);
    this.map.setView({ scale: 22 });
    this.map.follow(PLAYER_ID);

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
    this.centreKey.addEventListener('click', () => this.map.follow(PLAYER_ID));
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
      this.map.element,
      this.hud,
      this.toast,
      this.stick.element,
      this.buttons,
      this.hole,
      this.centreKey,
      this.optionsKey,
      this.puzzle.element,
      this.options,
      this.ending,
    );
    this.element.dataset['mode'] = this.mode.visibility;
    this.playRole(options.role ?? 'technician');
    this.refreshKeys();
    this.renderHud();
  }

  /** Techniker oder Monster: Wer das Monster spielt, bekommt dessen Ansicht statt Stock und Knöpfen. */
  private playRole(role: 'technician' | 'monster'): void {
    this.session?.dispose();
    this.session = null;
    if (role === 'monster') {
      this.session = new MonsterSession(
        this.round,
        (text) => this.say(text),
        this.options_.tuning?.technician,
      );
      this.element.insertBefore(this.session.element, this.hud);
    }
    for (const node of [
      this.map.element,
      this.stick.element,
      this.buttons,
      this.hole,
      this.centreKey,
    ])
      node.hidden = role === 'monster';
    this.element.dataset['role'] = role;
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
    if (this.round.phase !== 'running' || !this.round.activeTool) return null;
    const rect = this.hole.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) return null;
    return { x: rect.left, y: rect.top, w: rect.width, h: rect.height };
  }

  /** Ein Bild: Stock lesen, Runde rechnen, Karte und Anzeigen nachführen. */
  update(dt: number): void {
    if (this.session) this.session.update(dt);
    else {
      const stick = this.stick.value;
      this.round.step(dt, { x: stick.x, z: stick.z, sprint: stick.sprint });
    }
    for (const event of this.round.drain()) this.show(event);
    this.toastLeft = Math.max(0, this.toastLeft - dt);
    if (this.toastLeft <= 0 && this.toast.textContent) {
      this.toast.textContent = '';
      this.toast.className = 'flat__toast';
    }
    if (!this.session) {
      this.map.setSnapshot(this.round.snapshot());
      this.map.setVisibility(this.round.field);
      this.map.draw();
      this.puzzle.sync();
      this.refreshKeys();
    }
    this.renderHud();
    if (this.round.phase !== 'running' && this.ending.hidden) this.renderEnding();
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
    this.useKey.append(el('small', '', 'Benutzen'), el('strong', '', use));
    const target = this.round.target;
    this.actKey.textContent = '';
    this.actKey.append(el('small', '', 'Interagieren'), el('strong', '', target?.label ?? '—'));
    this.actKey.classList.toggle('is-ready', !!target);
  }

  private renderHud(): void {
    const state = this.round.state();
    const crew = state.crew;
    const monster = MONSTERS.find((m) => m.id === crew.options.monster)?.name ?? '';
    const round = this.round.round();
    const hp = '●'.repeat(round.suit) + '○'.repeat(Math.max(0, round.suitMax - round.suit));
    const text = `${hp}  ·  O₂ ${clockText(round.oxygen)}  ·  Reparaturen ${state.done.length}/3  ·  ${
      crew.hidden ? 'versteckt' : this.round.radarActive ? 'Radar' : ''
    }`;
    const cabins = round.cabinsDestroyed.length
      ? ` · ${round.cabinsDestroyed.length} Kabinen hin`
      : '';
    const line = `${state.monsterOn ? monster : 'Test ohne Monster'} · ${this.mode.label}${cabins}`;
    if (this.hud.dataset['text'] !== text + line) {
      this.hud.dataset['text'] = text + line;
      this.hud.replaceChildren(el('strong', '', text.trim()), el('span', '', line));
    }
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
      el(
        'strong',
        '',
        this.options_.role === 'monster' ? 'Als Monster spielen' : 'Als Techniker spielen',
      ),
      el('small', '', 'Gilt für die nächste Runde; der Techniker wird dann vom Bot gespielt'),
    );
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
      this.options_.role = this.options_.role === 'monster' ? 'technician' : 'monster';
      this.renderOptions();
    } else if (data['leave'] !== undefined) {
      this.host.exit();
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
    this.stick.dispose();
    this.map.dispose();
    this.element.remove();
  }
}
