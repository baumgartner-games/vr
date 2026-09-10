import './flat.css';
import { MARKS, type HouseRoom } from '../house';
import { MONSTERS, lockerCode, repairsFor, type MonsterKind } from '../mission';
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
import { INK, MapView, type MapGoal, type MapRoute } from './mapView';
import { PuzzleOverlay, el } from './puzzleOverlay';
import { Rng } from '../rng';
import { clockText } from '../rules/roundRules';
import {
  defaultSetup,
  flatRoleOf,
  powersOf,
  presetFor,
  saveSetup,
  type RoundSetup,
  type SoloPowers,
} from '../rules/roundSetup';
import { SetupPanel } from '../roundSetupPanel';
import { TechnicianBot } from '../rules/technicianBot';
import { MonsterSession } from '../monster/monsterSession';
import { HauntingAudio, levelLabel } from '../audio';
import type { MapPoint } from './mapSnapshot';
import type { ToolIconSource } from './toolIcons';

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
 * **Wer allein spielt, bekommt die Zentrale dazu** (`rules/roundSetup.ts`):
 * Jeder Platz, an dem ein Bot sitzt, gibt dem Techniker die Auskunft dieses
 * Platzes auf sein eigenes Bild — die Peilung des Spähers als roter Punkt
 * alle paar Sekunden, die Schalttafel als Tipp auf Tür oder Lampe in der
 * Kartenübersicht, die Akte des Archivars als Tipp auf ein Zimmer. Ein
 * Mensch am Platz nimmt sie ihm wieder ab; dann sagt es ihm der Mitspieler,
 * oder niemand. Ziele stehen als gelbe Dreiecke am Rand der Szene, und
 * „Zielpfade" legt die Wege von Techniker und Monster darüber.
 *
 * Kein three.js hier drin — auch nicht mehr für das Werkzeug in der Hand:
 * Dessen Bild ist ein **gepuffertes Icon**, das einmal aus dem 3D-Modell
 * gerendert wurde (`toolIcons.ts`) und der Ansicht als fertiges Canvas
 * gereicht wird (`setToolIcons`). Vorher schnitt die 2D-Welt dafür ein Loch
 * in ihre Oberfläche, durch das die 3D-Welt rendern sollte — und das war
 * unsichtbar, weil die 2D-Welt über dem WebGL-Canvas liegt. Deshalb läuft
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
/** Wie oft der Späher eine neue Peilung des Monsters bekommt, in Sekunden. */
export const SCOUT_PERIOD = 3.5;
/** Wie blass die alte Peilung wird, bevor die nächste kommt. */
const SCOUT_FLOOR = 0.25;
/** Wie viele Punkte unter dem HUD der Seite die Randdreiecke bleiben. */
const EDGE_TOP = 118;

const NO_POWERS: SoloPowers = { scout: false, panel: false, archive: false };

/** Die drei Rollen im Optionsmenü, in der Reihenfolge des Durchschaltens. */
const ROLE_LABELS: Record<FlatRole, string> = {
  technician: 'Als Techniker spielen',
  monster: 'Als Monster spielen (Techniker: Bot)',
  bot: 'Bot-Runde zusehen',
};

/** Ohne Tafel: die Verteilung, die Rolle und Test der alten Optionen meinen. */
function setupFromOptions(options: FlatOptions): RoundSetup {
  const role = options.role ?? 'technician';
  return {
    ...defaultSetup(),
    technician: role === 'technician' ? 'human' : 'bot',
    monster: options.test ? 'off' : role === 'monster' ? 'human' : 'bot',
  };
}

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
  private readonly sheet = el('div', 'flat__panel flat__sheet');
  private readonly ending = el('div', 'flat__ending');
  /** Das gepufferte Comic-Bild des aktiven Werkzeugs (`toolIcons.ts`). */
  private readonly icon = el('canvas', 'flat__icon');
  private icons: ToolIconSource | null = null;
  private iconTool = '\u0000';
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
  /** Die Verteilung der Runde und was der Techniker daraus bekommt. */
  private setup: RoundSetup;
  private powers: SoloPowers;
  private routes: boolean;
  private setupPanel: SetupPanel | null = null;
  /** Die letzte Peilung des Spähers: wo, wann — und ob sie überhaupt gilt. */
  private ping: { at: MapPoint; time: number } | null = null;
  private pingClock = 0;

  constructor(
    seed: number,
    options: FlatOptions,
    private readonly host: FlatModeHost,
  ) {
    this.seed = seed;
    this.options_ = options;
    this.setup = options.setup ?? setupFromOptions(options);
    this.powers = options.powers ?? (options.setup ? powersOf(options.setup) : NO_POWERS);
    this.routes = options.routes ?? false;
    const modes = viewModesFor('flat');
    this.mode = modes.find((m) => m.visibility === (options.mode ?? 'realistic')) ?? modes[0]!;
    this.round = new FlatRound(seed, { ...options, mode: this.mode.visibility });
    this.puzzle = new PuzzleOverlay(this.round);
    const onRoomClick = (id: string): void => this.tapRoom(id);
    const onEntityClick = (id: string): void =>
      this.say(this.round.entities().find((e) => e.id === id)?.label ?? id);
    const onItemClick = (id: string): void => this.tapItem(id);
    this.scene = new FlatScene({
      mode: this.mode.visibility,
      onRoomClick,
      onEntityClick,
      onItemClick,
      overlay: (ctx) => this.drawSceneOverlay(ctx),
    });
    this.scene.element.classList.add('flat__scene');
    this.scene.setScale(scaleForWidth(typeof window === 'undefined' ? 1024 : window.innerWidth));
    this.scene.follow(PLAYER_ID);
    this.map = new MapView({
      layers: this.mode.layers,
      markers: this.mode.markers,
      mode: this.mode.visibility,
      viewerId: PLAYER_ID,
      minScale: 6,
      maxScale: 60,
      edge: { top: 24, bottom: 24, left: 18, right: 18 },
      routes: () => this.routeLines(),
      objectives: () => (this.session ? [] : this.round.objectives()),
      overlay: (ctx) => this.drawPing(ctx, this.map),
      onRoomClick,
      onEntityClick,
      onItemClick,
      onDoorClick: (id) => this.tapDoor(id),
      onLightClick: (id) => this.tapLight(id),
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
      this.sheet.hidden = true;
      if (!this.options.hidden) this.renderOptions();
    });
    this.options.hidden = true;
    this.options.addEventListener('click', (event) => this.optionClick(event));
    this.sheet.hidden = true;
    this.sheet.addEventListener('click', (event) => this.optionClick(event));
    this.ending.hidden = true;
    this.ending.addEventListener('click', (event) => this.optionClick(event));
    this.icon.hidden = true;
    this.element.append(
      this.scene.element,
      this.hud,
      this.toast,
      this.stick.element,
      this.buttons,
      this.centreKey,
      this.mapKey,
      this.optionsKey,
      this.mapOverlay,
      this.puzzle.element,
      this.sheet,
      this.options,
      this.ending,
    );
    this.element.dataset['mode'] = this.mode.visibility;
    this.applyLayers();
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
    for (const node of [this.stick.element, this.buttons]) node.hidden = role !== 'technician';
    this.element.dataset['role'] = role;
    this.ping = null;
    this.pingClock = 0;
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

  /** Was der Techniker aus den Bot-Plätzen bekommt — für Tests und die Anzeige. */
  get soloPowers(): Readonly<SoloPowers> {
    return this.powers;
  }

  /** Ob die Wege auf Szene und Karte liegen. */
  get routesShown(): boolean {
    return this.routes;
  }

  /**
   * **Die gepufferten Werkzeugbilder nachreichen.** Die 2D-Welt selbst lädt
   * kein three.js; wer sie öffnet (`HauntingWorld`), rendert die Modelle
   * einmal und gibt den Puffer hier herein. Ohne Puffer bleibt der Knopf beim
   * Namen des Werkzeugs — kein zweites, von Hand gemaltes Bild.
   */
  setToolIcons(icons: ToolIconSource | null): void {
    this.icons = icons;
    this.iconTool = '\u0000';
    this.refreshIcon();
  }

  /** Das Icon im Wechseln-Knopf nachziehen, wenn sich das Werkzeug geändert hat. */
  private refreshIcon(): void {
    const tool = this.round.activeTool;
    if (tool === this.iconTool) return;
    this.iconTool = tool;
    const image = tool ? (this.icons?.icon(tool) ?? null) : null;
    const ctx = image ? this.icon.getContext('2d') : null;
    if (!image || !ctx) {
      this.icon.hidden = true;
      return;
    }
    const size = Number((image as HTMLCanvasElement).width) || 64;
    this.icon.width = size;
    this.icon.height = size;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(image, 0, 0, size, size);
    this.icon.hidden = false;
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
      this.stepPing(dt);
      this.scene.setSnapshot(this.round.snapshot());
      this.scene.setVisibility(this.round.field);
      this.scene.draw();
      if (!this.mapOverlay.hidden) {
        this.map.setSnapshot(this.round.snapshot());
        this.map.setVisibility(this.round.field);
        this.map.draw();
      }
      // Ein offenes Rätsel liegt über allem: Optionsmenü und Akte gehen dabei zu.
      if (this.round.puzzle && !this.options.hidden) this.options.hidden = true;
      if (this.round.puzzle && !this.sheet.hidden) this.sheet.hidden = true;
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

  // --- Die Zentrale auf dem eigenen Bild -----------------------------------------

  /**
   * **Die Peilung des Spähers**: alle `SCOUT_PERIOD` Sekunden die Stelle des
   * Monsters, dazwischen verblasst der Punkt — keine Bewegung dazwischen, das
   * wäre Hellsicht. Nur mit der Fähigkeit, und nur, wenn ein Monster da ist.
   */
  private stepPing(dt: number): void {
    if (!this.powers.scout || !this.round.state().monsterOn) {
      this.ping = null;
      return;
    }
    this.pingClock -= dt;
    if (this.pingClock <= 0) {
      this.pingClock = SCOUT_PERIOD;
      const monster = this.round.monster;
      this.ping = { at: { x: monster.x, z: monster.z }, time: this.round.state().time };
    }
  }

  /** Die letzte Peilung — für Tests. */
  get scoutPing(): Readonly<{ at: MapPoint; time: number }> | null {
    return this.ping;
  }

  /** Die Peilung als roter Punkt, der bis zur nächsten verblasst — auf Szene und Karte. */
  private drawPing(
    ctx: CanvasRenderingContext2D,
    view: { toScreen(x: number, z: number): { x: number; y: number } },
  ): void {
    if (!this.ping || this.session) return;
    // Im Modus „Alles sehen" läuft das Monster ohnehin über das Bild.
    if (this.mode.visibility === 'omniscient') return;
    const age = this.round.state().time - this.ping.time;
    const fade = Math.max(SCOUT_FLOOR, 1 - age / SCOUT_PERIOD);
    const p = view.toScreen(this.ping.at.x, this.ping.at.z);
    const r = 9;
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.fillStyle = INK.monster;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = INK.monster;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * (1.6 + (1 - fade) * 1.2), 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PEILUNG', p.x, p.y - r * 2.1 - 6);
    ctx.restore();
  }

  /**
   * Was über der Szene liegt: die Wege (wenn gewollt), die Ziele als Ring
   * am Ort und gelbes Dreieck am Rand des Bildes, und die Peilung.
   */
  private drawSceneOverlay(ctx: CanvasRenderingContext2D): void {
    if (this.session) return;
    const scene = this.scene;
    const { width: w, height: h } = scene.canvas.getBoundingClientRect();
    const width = w || 320,
      height = h || 320;
    for (const route of this.routeLines()) {
      ctx.strokeStyle = route.color;
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      route.points.forEach((point, i) => {
        const p = scene.toScreen(point.x, point.z);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }
    const inset = { top: EDGE_TOP, right: 18, bottom: 130, left: 18 };
    const t = Date.now() / 1000;
    for (const goal of this.round.objectives())
      this.drawGoal(ctx, scene, goal, width, height, inset, t);
    this.drawPing(ctx, scene);
  }

  private drawGoal(
    ctx: CanvasRenderingContext2D,
    scene: FlatScene,
    goal: MapGoal,
    w: number,
    h: number,
    inset: { top: number; right: number; bottom: number; left: number },
    t: number,
  ): void {
    const p = scene.toScreen(goal.at.x, goal.at.z);
    const inside =
      p.x >= inset.left && p.x <= w - inset.right && p.y >= inset.top && p.y <= h - inset.bottom;
    ctx.fillStyle = goal.next ? INK.goal : INK.goalDim;
    ctx.strokeStyle = goal.next ? INK.goal : INK.goalDim;
    if (inside) {
      const pulse = goal.next ? 1 + 0.15 * Math.sin(t * 4) : 1;
      const r = 14 * pulse;
      ctx.lineWidth = goal.next ? 3 : 1.5;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, r * 1.3, r * 0.7, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (goal.next) {
        const y = p.y - 44 - 4 * Math.sin(t * 4);
        ctx.beginPath();
        ctx.moveTo(p.x, y + 14);
        ctx.lineTo(p.x - 9, y);
        ctx.lineTo(p.x + 9, y);
        ctx.closePath();
        ctx.fill();
      }
      return;
    }
    const cx = (inset.left + w - inset.right) / 2,
      cy = (inset.top + h - inset.bottom) / 2;
    const dx = p.x - cx,
      dy = p.y - cy;
    const hw = (w - inset.left - inset.right) / 2,
      hh = (h - inset.top - inset.bottom) / 2;
    const k = Math.min(hw / Math.max(1e-6, Math.abs(dx)), hh / Math.max(1e-6, Math.abs(dy)));
    const ex = cx + dx * k,
      ey = cy + dy * k;
    const angle = Math.atan2(dy, dx);
    const size = goal.next ? 14 : 10;
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size * 0.7, -size * 0.7);
    ctx.lineTo(-size * 0.35, 0);
    ctx.lineTo(-size * 0.7, size * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1d2126';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
    if (goal.next) {
      const metres = Math.round(
        Math.hypot(goal.at.x - this.round.player.x, goal.at.z - this.round.player.z),
      );
      const lx = ex - Math.cos(angle) * 26,
        ly = ey - Math.sin(angle) * 26;
      ctx.font = '700 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillText(`${metres} m`, lx + 1, ly + 1);
      ctx.fillStyle = INK.goal;
      ctx.fillText(`${metres} m`, lx, ly);
    }
  }

  /** Die Wege, wenn sie gewollt sind: das Monster rot, der Techniker cyan. */
  private routeLines(): MapRoute[] {
    if (!this.routes || this.session) return [];
    const out: MapRoute[] = [];
    if (this.mode.visibility === 'omniscient' || this.powers.scout) {
      const monster = this.round.monsterRoute();
      if (monster.length > 1)
        out.push({ id: 'monster', points: monster, color: INK.monster, goal: true });
    }
    const player = this.round.playerRoute();
    if (player.length > 1) out.push({ id: 'player', points: player, color: INK.player });
    return out;
  }

  /** Ein Tipp auf eine Tür: mit der Schalttafel sperren oder freigeben, sonst nur benennen. */
  private tapDoor(id: string): void {
    if (!this.powers.panel || this.session) {
      const door = this.round.snapshot().doors.find((d) => d.id === id);
      this.say(door ? (door.locked ? 'Tür gesperrt.' : 'Tür offen.') : id);
      return;
    }
    const text = this.round.lockDoor(id);
    if (text) this.say(`Schalttafel: ${text}`);
  }

  /** Ein Tipp auf eine Lampe: mit der Schalttafel schalten. */
  private tapLight(id: string): void {
    if (!this.powers.panel || this.session) {
      this.say(this.round.state().lit.includes(id) ? 'Licht an.' : 'Licht aus.');
      return;
    }
    const text = this.round.switchLight(id);
    if (text) this.say(`Schalttafel: ${text}`);
  }

  private tapItem(id: string): void {
    const item = this.round.items().find((i) => i.id === id);
    if (!item) return;
    if (this.powers.archive && item.roomId && item.kind !== 'van') this.openSheet(item.roomId);
    else this.say(item.label);
  }

  /** Ein Tipp auf ein Zimmer: mit dem Archiv die Akte, sonst nur den Namen. */
  private tapRoom(id: string): void {
    if (this.powers.archive && !this.session) this.openSheet(id);
    else this.say(this.round.snapshot().rooms.find((r) => r.id === id)?.name ?? id);
  }

  /**
   * **Die Akte des Archivars**, aufgeschlagen für ein Zimmer: was darin
   * steht, der Schutzschrank-Code, die Fracht und die Konsole mit dem, was
   * ihr Rätsel braucht — dieselben Fakten wie am Telefon des Archivars
   * (`stationUi.ts`), nur eben auf dem eigenen Bild.
   */
  openSheet(roomId: string): void {
    const spec = this.round.house;
    const snapshot = this.round.snapshot();
    const room = snapshot.rooms.find((r) => r.id === roomId);
    if (!room) return;
    const house: HouseRoom | undefined = spec.rooms.find((r) => r.id === roomId);
    const parts: HTMLElement[] = [el('strong', '', `Akte · ${room.name}`)];
    const line = (key: string, value: string, warn = false) => {
      const row = el('div', `flat__fact${warn ? ' is-warn' : ''}`);
      row.append(el('span', '', key), el('b', '', value));
      parts.push(row);
    };
    if (house) {
      line('Darin steht', MARKS[house.signature]);
      line('Schutzschrank-Code', lockerCode(spec.seed, house.id));
    } else line('Bereich', room.circulation ? 'Gang' : room.safe ? 'sicher' : '');
    const doors = snapshot.doors.filter((d) => d.a === roomId || d.b === roomId);
    const locked = doors.filter((d) => d.locked).length;
    line(
      'Türen',
      `${doors.length}${doors.some((d) => d.material === 'metal') ? ' · eine aus Stahl' : ''}${locked ? ` · ${locked} gesperrt` : ''}`,
      locked > 0,
    );
    line('Licht', room.lit ? 'an' : 'aus', !room.lit);
    for (const item of snapshot.items.filter((i) => i.roomId === roomId)) {
      if (item.kind === 'cargo') {
        const task = spec.tasks.find((t) => t.label === item.label);
        line(
          'Fracht',
          `${item.label} · ${item.state === 'taken' ? 'mitgenommen' : item.state === 'open' ? 'geöffnet' : 'verschlossen'}`,
        );
        if (task && item.state !== 'taken') line('Fundhinweis', task.hint);
      } else if (item.kind === 'console') {
        const repair = repairsFor(spec).find((r) => r.title === item.label);
        line('Konsole', `${item.label} · ${item.state === 'solved' ? 'repariert' : 'defekt'}`);
        if (repair && item.state !== 'solved') {
          line('Benötigt', repair.item);
          line(
            repair.puzzle === 'wires'
              ? 'Kabelplan'
              : repair.puzzle === 'sequence'
                ? 'Freigabefolge'
                : 'Zielfrequenzen',
            repair.puzzle === 'wires'
              ? 'Stecker an die Buchse mit gleichem Symbol'
              : repair.code.split('').join(' '),
          );
        }
      } else if (item.kind === 'locker')
        line(
          'Schutzschrank',
          item.state === 'destroyed' ? 'zerstört' : 'benutzbar',
          item.state === 'destroyed',
        );
      else if (item.kind === 'vent') {
        const links = (snapshot.ventLinks ?? []).filter((l) => l.a === item.id || l.b === item.id);
        const targets = links.map((l) => {
          const other = snapshot.items.find((i) => i.id === (l.a === item.id ? l.b : l.a));
          return snapshot.rooms.find((r) => r.id === other?.roomId)?.name ?? '?';
        });
        line('Schacht', targets.length ? `nach ${targets.join(', ')}` : 'ohne Anschluss');
      }
    }
    parts.push(
      el(
        'small',
        'flat__hint',
        'Archivscan · nur dieser Raum · keine Personen oder Live-Positionen',
      ),
    );
    const close = el('button', 'flat__option', 'Zurück');
    close.dataset['closeSheet'] = '';
    parts.push(close);
    this.sheet.replaceChildren(...parts);
    this.sheet.hidden = false;
    this.options.hidden = true;
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
    this.cycleKey.replaceChildren(
      el('small', '', 'Wechseln'),
      this.icon,
      el('strong', '', TOOL_LABELS[tool] ?? tool),
    );
    this.cycleKey.disabled = this.round.tools.length < 2;
    this.refreshIcon();
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
    const powers = [
      this.powers.scout ? 'Späher' : '',
      this.powers.panel ? 'Tafel' : '',
      this.powers.archive ? 'Archiv' : '',
    ].filter(Boolean);
    const line = `${who}${state.monsterOn ? monster : 'Test ohne Monster'} · ${this.mode.label}${cabins}${powers.length && !this.session ? ` · ${powers.join('+')}` : ''}`;
    const status = crew.hidden ? 'versteckt' : this.round.radarActive ? 'Radar' : '';
    const next = this.session ? null : this.round.objectives()[0];
    const goal = next ? `Ziel: ${next.label}` : '';
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
    const key = [hp, clockText(round.oxygen), status, line, goal, ...lines.map((l) => l.text)].join(
      '|',
    );
    if (this.hud.dataset['text'] === key) return;
    this.hud.dataset['text'] = key;
    this.barFill.style.width = `${Math.round((Math.min(3, state.done.length) / 3) * 100)}%`;
    this.vitals.replaceChildren(
      el('strong', 'flat__oxygen', `O₂ ${clockText(round.oxygen)}`),
      el('strong', 'flat__suit', hp),
      el('span', '', [status, line].filter(Boolean).join(' · ')),
      ...(goal ? [el('em', 'flat__goal', goal)] : []),
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
    const routes = el('button', 'flat__option');
    routes.dataset['routes'] = '';
    routes.classList.toggle('is-active', this.routes);
    routes.append(
      el('strong', '', `Zielpfade: ${this.routes ? 'an' : 'aus'}`),
      el('small', '', 'Der Weg des Technikers zum nächsten Ziel · der des Monsters in Rot'),
    );
    parts.push(routes);
    parts.push(el('strong', '', 'Runde'));
    const restart = el('button', 'flat__option', 'Neue Runde');
    restart.dataset['restart'] = '';
    const monster = el('button', 'flat__option');
    monster.dataset['monster'] = '';
    monster.append(
      el('strong', '', this.setup.monster !== 'off' ? 'Mit Monster' : 'Ohne Monster (Test)'),
      el('small', '', 'Gilt für die nächste Runde'),
    );
    const role = el('button', 'flat__option');
    role.dataset['role'] = '';
    role.append(
      el('strong', '', ROLE_LABELS[flatRoleOf(this.setup)]),
      el('small', '', 'Gilt für die nächste Runde · antippen wechselt'),
    );
    parts.push(restart, monster, role);
    // Die Tafel: Techniker, Monster, Plätze — dieselbe wie im Van.
    parts.push(el('strong', '', 'Verteilung der nächsten Runde'));
    this.setupPanel ??= new SetupPanel({
      setup: () => this.setup,
      onChange: (setup) => {
        this.setup = setup;
        this.renderOptions();
      },
      humanMonster: true,
    });
    this.setupPanel.render();
    parts.push(this.setupPanel.element);
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
    parts.push(leave, close);
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
    } else if (data['routes'] !== undefined) {
      this.routes = !this.routes;
      this.renderOptions();
    } else if (data['restart'] !== undefined) {
      this.restart();
    } else if (data['monster'] !== undefined) {
      this.setup = { ...this.setup, monster: this.setup.monster === 'off' ? 'bot' : 'off' };
      saveSetup(this.setup);
      this.renderOptions();
    } else if (data['role'] !== undefined) {
      const roles = Object.keys(ROLE_LABELS) as FlatRole[];
      const next = roles[(roles.indexOf(flatRoleOf(this.setup)) + 1) % roles.length]!;
      this.setup = {
        ...this.setup,
        technician: next === 'technician' ? 'human' : 'bot',
        monster:
          next === 'monster'
            ? 'human'
            : this.setup.monster === 'human'
              ? 'bot'
              : this.setup.monster,
      };
      saveSetup(this.setup);
      this.renderOptions();
    } else if (data['leave'] !== undefined) {
      this.host.exit();
    } else if (data['audio'] === 'effects' || data['audio'] === 'ambient') {
      this.audio.cycle(data['audio']);
      this.renderOptions();
    } else if (data['closeOptions'] !== undefined) {
      this.options.hidden = true;
    } else if (data['closeSheet'] !== undefined) {
      this.sheet.hidden = true;
    }
  }

  setMode(mode: ViewMode): void {
    this.mode = mode;
    this.round.setMode(mode.visibility);
    this.map.setLayers(mode.layers);
    this.map.setMarkers(mode.markers);
    this.element.dataset['mode'] = mode.visibility;
    this.applyLayers();
  }

  /** Schächte liegen auf der Karte, wenn man alles sieht — der Techniker fährt nicht damit. */
  private applyLayers(): void {
    this.map.setLayers({ vents: this.mode.visibility === 'omniscient' });
  }

  /**
   * Eine neue Runde mit neuem Samen — Werkzeuge und Karte von vorn, mit der
   * Verteilung, wie sie jetzt auf der Tafel steht.
   */
  restart(options?: FlatOptions): void {
    const setup = options?.setup ?? this.setup;
    const next: FlatOptions = {
      ...this.options_,
      ...options,
      setup,
      test: setup.monster === 'off',
      role: flatRoleOf(setup),
      powers: powersOf(setup),
      routes: this.routes,
    };
    this.setup = setup;
    this.powers = next.powers!;
    this.seed = this.dice.int(0x7fffffff);
    this.round = new FlatRound(this.seed, { ...next, mode: this.mode.visibility });
    this.puzzle.element.remove();
    this.puzzle = new PuzzleOverlay(this.round);
    this.element.insertBefore(this.puzzle.element, this.sheet);
    this.ending.hidden = true;
    this.options.hidden = true;
    this.sheet.hidden = true;
    this.showMap(false);
    this.scene.follow(PLAYER_ID);
    this.map.fit();
    this.map.follow(PLAYER_ID);
    this.playRole(next.role ?? 'technician');
    this.refreshKeys();
  }

  /** Die drei Kacheln aus dem Van, hier als Voreinstellung für die nächste Runde. */
  preset(kind: 'bot' | 'mission' | 'test'): void {
    this.setup = presetFor(kind, this.setup);
    saveSetup(this.setup);
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
