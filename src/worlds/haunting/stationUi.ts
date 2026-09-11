import { repairsFor } from './mission';
import './haunting.css';
import './stationDashboard.css';
import {
  ABILITY_LABELS,
  COLOURS,
  describeSetup,
  isColour,
  isWatcher,
  MY_ROLE_HINTS,
  MY_ROLE_LABELS,
  NO_ROLE_HINT,
  roleName,
  seatAbilities,
  seatTitle,
  switchRights,
  withWho,
  type Ability,
  type MyRole,
  type RoundSetup,
} from './rules/roundSetup';
import { SetupPanel } from './roundSetupPanel';
// **Die Rollen melden sich selbst an**, jede aus ihrer eigenen Datei
// (`BOUNDARIES.md`). Importiert werden sie hier und nicht über
// `registry/discover.ts`: Der Glob dort ist Vite-eigen, und die Einsatzzentrale
// läuft auch in einer Welt, die nie eine 2D-Runde aufmacht.
import './views/archive.register';
import './views/panel.register';
import './views/scout.register';
import './views/watch.register';
import './monster/monster.register';
import { listRoles, roles, type RoleHost, type RoleView } from './registry/roles';
import type { WatchRoleView } from './views/watchRole';
import { defaultLens, seatStation, type WatchLens } from './watchLens';
import type { ArchiveDesk } from './views/archiveDesk';
import type { HouseSpec } from './house';
import { visibleSwitches } from './panel';
import { seating, shoved, type Claim, type StationId } from './stations';
import type { HauntState } from './net';
import type { MapRound, MapSnapshot } from './map/mapSnapshot';
import { cabinsText, endingText, lowOxygen, roundHud } from './rules/roundHud';
import { FLAT_CHECK, startLabel, type LobbyChoice, type View } from './rules/lobby';
import type { MonsterPort } from './monster/monsterDriver';

/**
 * **Die Einsatzzentrale auf dem Telefon** — eine Reiterzeile, ein
 * Auftragsstreifen und darunter die Rolle, die man gerade hält.
 *
 * Diese Datei hat lange **jede** Rolle selbst gezeichnet: Radarschirm,
 * Aktenblatt, Schalterliste, Cockpit, jeweils in einer eigenen Methode, und
 * ein `if (station === …)` verteilte darauf. Das ist vorbei. Was hier steht,
 * ist der Rahmen: wer was hält, was gestartet wird, wie die Runde ausgeht —
 * und ein Platz, in den die Rolle aus der **Registry** gehängt wird
 * (`registry/roles.ts`). Eine neue Rolle braucht in dieser Datei keine Zeile
 * mehr; sie legt eine `*.register.ts` an, und der Reiter steht da.
 *
 * **Ganz oben sind die Reiter die Rollenwahl.** Vorher stand dort „ORBITAL /
 * EINSATZZENTRALE", darunter der Auftragsstreifen mit Uhr und Anzug, und die
 * Rollen lagen zwei Bildschirme tiefer in einer eingeklappten Liste. Der
 * Besitzer wollte beides weghaben: den Titel, weil er auf jedem Telefon
 * dasselbe sagt, und die Kopfzeile der Seite („Haunting · Menü · Verbindung ·
 * VR"), weil zwei Kopfzeilen übereinander ein halber Bildschirm sind. Die
 * Seiten-Kopfzeile blendet `haunting.css` aus (`body.haunt-on #hud`); ihre
 * drei Knöpfe stehen hier klein wieder — **ausgeblendet, nicht abgebaut**,
 * denn Verbindung und VR hängen an der Seite (`main.ts`) und nicht an dieser
 * Welt, und das Telefon drückt sie stellvertretend.
 *
 * **Und die Zentrale besteht aus Fähigkeiten, nicht aus Plätzen**
 * (`rules/roundSetup.ts`): Wer sich Späher *und* Schalttafel nimmt, sitzt in
 * der Einsatzkontrolle; wer Akte und Radar hält, klärt auf. Bei drei Spielern
 * sitzen manchmal nur zwei in der Zentrale, und dann hält einer eben zwei
 * Reiter. Mitten in der Runde entscheidet `switchRights`, wer überhaupt
 * wechseln darf.
 *
 * Die Rollen selbst zeichnen dieselbe `MapView` wie die 2D-Welt, jede mit
 * eigenen Schichten (`views/`): der Archivar alles, was liegt, die Schalttafel
 * die Station ohne Wesen und dazu ihre Schalterliste, der Späher zwei Punkte
 * alle dreieinhalb Sekunden. Der Fernseher ist die Ausnahme — sein Bild ist
 * die 3D-Welt, gezeichnet in das Rechteck, das seine Ansicht meldet
 * (`RoleView.viewport`), und auf Wunsch schlägt er die Ansicht eines
 * Mitspielers auf (`watchLens.ts`).
 */
export interface StationHost {
  spec(): HouseSpec;
  state(): HauntState;
  claims(): Claim[];
  me(): string;
  link(): { peers: number; vr: boolean; room: string };
  /** Diesen Desktop an den Stock des Technikers setzen. */
  technician(): void;
  /**
   * **Und ihn wieder loslassen**: Wer sich am Desktop einen anderen Platz
   * nimmt — das Monster, einen Stuhl, den Fernseher —, ist kein Techniker
   * mehr. Ohne diesen Haken blieb der Desktop nach einem Ausflug an den Stock
   * für immer der Techniker, und ein gewähltes Monster rechnete die Routine.
   */
  leaveTechnician?(): void;
  /** Das globale Spielmenü bleibt aus jeder Telefonrolle erreichbar. */
  menu?(): void;
  /**
   * Ob jemand mit der Brille im Raum ist. Dann ist der Techniker vergeben —
   * die Tafel zeigt „VR" und lässt ihn nicht wegklicken
   * (`rules/roundSetup.technicianLabel`).
   */
  vr?(): boolean;
  /**
   * Ob die nächste Runde lokal in 2D läuft — dann darf sie auch dann starten,
   * wenn im Schiff schon jemand Techniker ist (eine Karte von oben stört ihn
   * nicht).
   */
  flatWanted?(): boolean;
  /**
   * Die Wahl des Aufbaus (`rules/lobby.ts`): die Absicht — sie steht als
   * Häkchen „Testen" auf der Seite — und die Ansicht, 2D von oben oder 3D im
   * Schiff, als Häkchen „2D-Welt".
   */
  lobby?(): LobbyChoice;
  setLobby?(choice: LobbyChoice): void;
  /** **Mitten in der Runde die Ansicht wechseln** — 2D ↔ 3D (`HauntingWorld.switchView`). */
  switchView?(view: View): void;
  /**
   * Die Verteilung der nächsten Runde (`rules/roundSetup.ts`): Techniker,
   * Monster und die drei Fähigkeiten der Zentrale. `startSetup` startet genau
   * damit — was dabei herauskommt, steht auf dem Startknopf
   * (`lobby.startLabel`).
   */
  setup?(): RoundSetup;
  setSetup?(setup: RoundSetup): void;
  startSetup?(): void;
  /** Eine beendete Runde über die autorisierte Weltaktion neu beginnen. */
  restart?(): void;
  /**
   * Der Stand der Runde — Sauerstoff, Anzug, Kabinen, Ende (`rules/`). Er
   * wird aus dem `HauntState` gerechnet, also auf jedem Telefon und nicht nur
   * beim Gastgeber; ohne ihn zeigt die Leiste nur die Systeme und den Anzug.
   */
  round?(): MapRound | null;
  /**
   * Der Stand als Karte (`HauntingWorld.mapSnapshot`) — das, woraus **jede**
   * Rollenansicht ihr Bild baut. Fehlt er, gibt es nichts zu zeichnen, und die
   * Rolle bekommt eine Erklärung statt einer Karte.
   */
  snapshot?(): MapSnapshot;
  /** Das Steuer der Station `monster` übers Netz (`monster/netMonsterPort.ts`). */
  monsterPort?(): MonsterPort | null;
  /** Das Loch des Archivars in die 3D-Welt (`views/archiveDesk.ts`); `null` ohne Kamera. */
  archiveDesk?(): ArchiveDesk | null;
  /** Eine Zeile an den Spieler — was eine Rollenansicht dem Telefon sagt. */
  notify?(text: string): void;
  nameOf(peer: string): string;
  /** An welchem Gerät ich wirklich sitze — `null`, wenn weggeschubst. */
  seat(): StationId | null;
  /** Wie viele Sekunden das Hinlaufen noch dauert. */
  arriving(): number;
  sit(station: StationId): void;
  /**
   * **Die zwei Griffe der Schalttafel** (`views/panelRole.ts`), jeder mit der
   * Zeile, die er dem Spieler sagt — `''` heißt: dafür gibt es keinen Schalter.
   */
  door(doorId: string): string;
  light(roomId: string): string;
}

/** Wie oft eine Rollenansicht nachgezogen wird, in Millisekunden. */
const ROLE_TICK = 50;

/**
 * **Welche Ansicht zu welcher Fähigkeit gehört.**
 *
 * Die drei Karten der Zentrale sind Rollen aus der Registry (`views/`), und
 * sie heißen dort noch wie die Geräte, die sie einmal waren: `scout`, `hack`,
 * `archive`. Die **Geräte** heißen inzwischen Rot, Gelb und Blau
 * (`stations.ts`) — ein Stuhl ist das Gerät, und welche Karten darauf liegen,
 * sagt die Tafel (`rules/roundSetup.Seat.powers`). Diese Tabelle ist der
 * Übergang: Fähigkeit → Karte.
 */
const ABILITY_VIEWS: Readonly<Record<Ability, string>> = {
  scout: 'scout',
  panel: 'hack',
  archive: 'archive',
};

/**
 * **Die Reiter ganz oben**, in dieser Reihenfolge: der Aufbau, der Techniker,
 * die drei Stühle der Zentrale (Rot, Gelb, Blau), das Monster, und die zwei
 * Zuschauer. Sie sind die Antwort auf „wer bin ich" (`rules/lobby.
 * LobbyChoice.me`) — die eine Stelle, an der dieses Gerät sich einen Platz
 * nimmt. Die Spalte „Ich" in der Tafel ist dafür weg.
 */
type PhoneTab = 'setup' | MyRole;

/** Welches Gerät zu einer Wahl gehört — `null` für den Techniker, der kein Gerät hat. */
function stationFor(me: MyRole): StationId | null {
  if (me === 'technician') return null;
  if (isWatcher(me)) return 'watch';
  return me;
}

export class StationUi {
  private readonly root = document.createElement('div');
  private readonly bar = document.createElement('header');
  private readonly quest = document.createElement('div');
  private readonly body = document.createElement('div');

  /** Welcher Reiter oben leuchtet — der Anfang ist der Aufbau. */
  private tab: PhoneTab = 'setup';
  /**
   * **Welche Karte auf einem Farbplatz gerade aufgeschlagen ist.** Ein Stuhl
   * kann zwei oder drei Fähigkeiten halten; dann blättert man zwischen ihren
   * Karten, und das hier merkt sich die Seite. `null` heißt: die erste.
   */
  private sub: Ability | null = null;
  /** Die Tafel der Verteilung — eine für die Lebensdauer der Seite, neu gefüllt bei jedem Schreiben. */
  private setupPanel: SetupPanel | null = null;
  /** Woran erkannt wird, dass die Seite neu geschrieben werden muss. */
  private drawn = '';
  /**
   * Welche Seite zuletzt geschrieben wurde — **wofür der Scrollstand gilt**.
   *
   * Ohne das sprang die Liste bei jedem Knopfdruck nach oben: Die Seite wird
   * neu geschrieben, und eine neu geschriebene Liste fängt oben an.
   */
  private paged = '';
  /**
   * **Die Rollenansicht, an der man gerade sitzt** — gebaut aus der Registry,
   * und sie überlebt ein `write()`.
   *
   * Das ist nicht Bequemlichkeit: Eine Karte, die sich bei jedem Schalter neu
   * aufbaut, nimmt den Daumen vom Stock, springt an ihren Anfangsausschnitt
   * zurück und gäbe beim Monster nebenbei das Steuer frei.
   */
  private view: RoleView | null = null;
  private viewId = '';
  private viewAt = 0;

  constructor(private readonly host: StationHost) {
    this.root.className = 'haunt';
    this.bar.className = 'haunt__bar';
    this.quest.className = 'haunt__quest';
    this.body.className = 'haunt__body';
    this.root.append(this.bar, this.quest, this.body);
    document.body.append(this.root);
    document.body.classList.add('haunt-on');
    this.root.addEventListener('click', (event) => this.onClick(event));
  }

  dispose(): void {
    this.dropView();
    this.root.remove();
    document.body.classList.remove('haunt-on');
  }

  /** Welche Station gerade zu sehen ist — `null` heißt: der Aufbau oder der Techniker. */
  get station(): StationId | null {
    const seat = this.tabStation;
    return seat && this.host.arriving() <= 0 ? seat : null;
  }

  /** Welches Gerät der offene Reiter meint — ohne die Frage, ob ich schon da bin. */
  private get tabStation(): StationId | null {
    if (this.tab === 'setup') return null;
    return stationFor(this.tab);
  }

  /** Was dieses Gerät ist — die Wahl der Lobby, sonst der Anfang: Zuschauer des Technikers. */
  get me(): MyRole {
    return this.host.lobby?.().me ?? 'watch:technician';
  }

  /**
   * **Welche Fähigkeiten dieses Telefon hält** — die seines Farbplatzes, aus
   * der Tafel gelesen. Keine zweite Liste hier: Wer sich auf Rot setzt, hält,
   * was auf Rot liegt, und was auf Rot liegt, steht in der Verteilung.
   */
  get held(): ReadonlySet<Ability> {
    const me = this.me;
    const setup = this.host.setup?.();
    if (!setup || !isColour(me)) return new Set();
    return new Set(seatAbilities(setup, me));
  }

  /** Wie meine Rolle heißt — aus den Fähigkeiten gerechnet, sonst `''`. */
  get roleLabel(): string {
    return roleName(this.held);
  }

  /**
   * **Welche Karte auf meinem Farbplatz offen ist** — die gewählte, sonst die
   * erste, die der Platz hält; `null` ohne Fähigkeit.
   */
  private get subAbility(): Ability | null {
    const held = this.held;
    if (this.sub && held.has(this.sub)) return this.sub;
    return [...held][0] ?? null;
  }

  /**
   * **Was der Zuschauer gerade ansieht** — die Welt richtet ihre Kamera danach
   * aus (`HauntingWorld.render`, `aimShow`) und blendet das KI-Overlay ein.
   * Außerhalb der Station `watch` bedeutet er nichts.
   *
   * Die Linse gehört der Ansicht und nicht dieser Datei: Sie ist eine Wahl des
   * Fernsehers, sie überlebt kein Neuladen, sie geht über kein Netz. Hier
   * steht nur der Durchreicher, weil die Welt die Ansicht nicht kennt.
   */
  get watchLens(): Readonly<WatchLens> {
    const view = this.view as Partial<WatchRoleView> | null;
    return this.station === 'watch' && view?.lens ? view.lens : defaultLens();
  }

  /**
   * **Welche Ansicht hinter dem Bild steckt**, das gerade zu sehen ist — als
   * Kennung der Registry (`registry/roles.ts`): auf einem Farbplatz die Karte
   * der aufgeschlagenen Fähigkeit, beim Zuschauer die, in die er gerade
   * hineinsieht, beim Monster seine eigene. `null` heißt: kein Bild.
   */
  get shownView(): string | null {
    const station = this.station;
    if (!station) return null;
    if (station === 'watch') return seatStation(this.watchLens.seat);
    if (station === 'monster') return 'monster';
    const ability = this.subAbility;
    return ability ? ABILITY_VIEWS[ability] : null;
  }

  /**
   * **Wohin die Welt ihr Bild zeichnen soll**, in CSS-Pixeln — oder `null`.
   *
   * Die Frage beantwortet nicht mehr diese Datei, sondern die Rolle: Der
   * Fernseher will immer ein Bild, der Archivar nur, solange eine Raumakte
   * offen ist, und die anderen nie.
   */
  viewport(): { x: number; y: number; w: number; h: number } | null {
    return this.view?.viewport?.() ?? null;
  }

  /**
   * **Wie viele Punkte des Bildes oben schon vergeben sind.**
   *
   * Kopfzeile und Auftragsstreifen liegen im Fluss über dem Bild und nicht
   * darauf; gemessen wird trotzdem, statt es zu behaupten — eine Zahl im Kopf
   * ist bei der nächsten Schriftgröße wieder falsch.
   */
  headroom(): number {
    const rect = this.viewport();
    if (!rect) return 0;
    const box = this.quest.getBoundingClientRect();
    return Math.max(0, Math.min(rect.h, box.bottom - rect.y));
  }

  refresh(): void {
    const state = this.host.state();
    const station = this.station;
    const round = this.host.round?.() ?? null;
    const sign = [
      this.host.spec().seed,
      this.tab,
      station ?? 'van',
      this.me,
      this.sub ?? '',
      // Von der Runde nur, was selten kippt: Leben, Kabinen, die Warnschwelle,
      // das Ende. Die Uhr selbst läuft unten in die Anzeige, ohne Neuschrift.
      round ? `${round.suit}/${round.cabinsDestroyed.length}/${lowOxygen(round.oxygen)}` : '',
      round?.ending ?? '',
      state.phase,
      state.crew.hp,
      state.crew.options.test,
      state.crew.inventory.length,
      this.host.link().peers,
      this.host.link().vr,
      state.monsterOn,
      state.done.length,
      state.taken.length,
      Math.ceil(this.host.arriving()),
      this.host
        .claims()
        .map((claim) => `${claim.id}:${claim.station}`)
        .sort()
        .join('|'),
      this.host.lobby?.().view ?? '',
      this.host.setup ? describeSetup(this.host.setup()) : '',
    ].join('/');

    if (sign !== this.drawn) {
      this.drawn = sign;
      this.write();
    }
    // Die Sauerstoff-Uhr springt jede Sekunde — und eine Seite, die deshalb
    // jede Sekunde neu geschrieben wird, nähme dem Daumen den Schalter weg.
    if (round) {
      const { oxygen } = roundHud(round);
      for (const slot of this.quest.querySelectorAll('[data-oxygen]'))
        if (slot.textContent !== oxygen) slot.textContent = oxygen;
    }
    this.stepView();
  }

  /**
   * **Die Rolle zeichnet sich selbst** (`RoleView.update`), gedrosselt auf
   * Telefonrate. Das erste Bild kommt sofort: `performance.now()` kann kurz
   * nach dem Start der Seite noch unter der Drossel liegen, und eine Ansicht
   * ohne erstes Bild hätte weder Stock gelesen noch Karte gezeichnet.
   */
  private stepView(): void {
    if (!this.view) return;
    const now = performance.now();
    const first = this.viewAt === 0;
    if (!first && now - this.viewAt <= ROLE_TICK) return;
    const dt = first ? 0 : (now - this.viewAt) / 1000;
    this.viewAt = Math.max(now, Number.MIN_VALUE);
    this.view.update(dt);
  }

  private dropView(): void {
    this.view?.dispose();
    this.view = null;
    this.viewId = '';
    this.viewAt = 0;
  }

  // --- schreiben -------------------------------------------------------------

  private write(): void {
    const state = this.host.state();
    const station = this.station;
    const view = this.shownView;
    const role = view ? roles.get(view) : undefined;

    // Die Farbe der Station hängt am Wurzelelement und nicht an jeder Kachel
    // einzeln: Von hier aus färbt sie Kopfzeile, Rand und Knöpfe über eine
    // einzige Variable, und eine weitere Rolle bekommt eine Zeile im CSS.
    this.root.dataset['station'] = station ?? 'van';
    // Eine Rolle mit Karte bekommt die ganze Fläche unter der Leiste; der
    // Fernseher bekommt eine rollende Liste, weil sein Bild darin steht.
    this.root.classList.toggle('is-view', role?.surface === 'map');

    this.writeBar();
    // **Uhr und Anzug gehören zur Runde, nicht zum Aufbau.** Im Menü sagen sie
    // nichts — dort läuft noch nichts —, und der Besitzer wollte sie dort
    // ausdrücklich nicht sehen.
    this.quest.hidden = this.tab === 'setup';
    this.writeQuest(state);

    // **Der Scrollstand bleibt, solange dieselbe Seite bleibt.** Ein Knopf
    // schreibt die Seite neu, und eine neu geschriebene Liste fängt oben an —
    // wer unten auf einen Schalter tippt, stünde danach wieder oben.
    const page = this.tab;
    const keep = page === this.paged ? this.body.scrollTop : 0;
    this.paged = page;
    this.body.replaceChildren(...this.roundResult(), ...this.page(station));
    this.body.scrollTop = keep;
  }

  /**
   * **Die Kopfzeile ist die Rollenwahl** — und sonst fast nichts: links die
   * Reiter, rechts drei kleine Knöpfe für Spielmenü, Verbindung und VR.
   *
   * Wer eine Fähigkeit antippt, **nimmt** sie damit — mitten in der Runde
   * allerdings nur, wenn er darf (`roundSetup.switchRights`). Die Rollen, die
   * keine Fähigkeit sind, kommen aus der Registry und nicht aus einer Liste
   * hier: Wer eine `*.register.ts` anlegt, bekommt seinen Reiter.
   */
  private writeBar(): void {
    const setup = this.host.setup?.() ?? null;
    const me = this.me;
    const nav = el('nav', 'haunt__roles');
    nav.setAttribute('aria-label', 'Rolle und Ansicht');
    const tab = (id: PhoneTab, label: string, hint: string, mine: boolean): void => {
      const key = el('button', `haunt__role${mine ? ' is-mine' : ''}`, label);
      if (id === 'setup') key.dataset['tab'] = 'setup';
      else key.dataset['me'] = id;
      key.dataset['role'] = id;
      key.setAttribute('aria-pressed', String(this.tab === id));
      key.title = hint;
      nav.append(key);
    };
    tab('setup', 'Aufbau', 'Verteilung, Häkchen und der Startknopf', false);
    // **Die sieben Antworten auf „wer bin ich"** (`rules/roundSetup.MY_ROLES`):
    // Techniker, die drei Stühle, das Monster, die zwei Zuschauer. Ein Stuhl
    // trägt den Namen seiner Fähigkeiten mit („Rot · Leitstand"); einer ohne
    // Fähigkeit steht trotzdem da — mit dem Hinweis, dass die Tafel ihm eine
    // geben muss. Ein Reiter, der bei jeder Runde woanders sitzt, ist einer,
    // den man jedes Mal sucht.
    tab('technician', MY_ROLE_LABELS.technician, MY_ROLE_HINTS.technician, me === 'technician');
    for (const seat of COLOURS) {
      const title = setup ? seatTitle(setup, seat) : MY_ROLE_LABELS[seat];
      const off = setup?.seats[seat].who === 'off';
      const empty = setup ? seatAbilities(setup, seat).length === 0 : false;
      tab(
        seat,
        title,
        off
          ? 'In dieser Runde aus — antippen setzt dich trotzdem hin'
          : empty
            ? 'Ohne Fähigkeit: im Aufbau eine zuweisen'
            : MY_ROLE_HINTS[seat],
        me === seat,
      );
    }
    tab('monster', MY_ROLE_LABELS.monster, MY_ROLE_HINTS.monster, me === 'monster');
    tab(
      'watch:technician',
      MY_ROLE_LABELS['watch:technician'],
      MY_ROLE_HINTS['watch:technician'],
      me === 'watch:technician',
    );
    tab('watch:all', MY_ROLE_LABELS['watch:all'], MY_ROLE_HINTS['watch:all'], me === 'watch:all');

    const tools = el('span', 'haunt__tools');
    const tool = (key: string, label: string, title: string): void => {
      const node = el('button', 'haunt__tool', label);
      node.dataset[key] = '';
      node.setAttribute('aria-label', title);
      tools.append(node);
    };
    tool('gameMenu', '☰', 'Spielmenü öffnen');
    tool('pageNet', '⇄', 'Verbindung der Seite öffnen');
    tool('pageVr', 'VR', 'VR starten oder beenden');
    this.bar.replaceChildren(nav, tools);
  }

  /**
   * **Der Auftragsstreifen** — ein Feld je Sache, und drei Zustände.
   *
   * `0/3` sagt, wie viele es sind; es sagt nicht, dass eine davon gerade in der
   * Hand des VR-Spielers liegt und noch nicht in der Zentrale. Genau dieser
   * Unterschied ist am Tisch die Frage, die gestellt wird.
   */
  private writeQuest(state: HauntState): void {
    const repairs = repairsFor(this.host.spec());
    const strip = el('span', 'haunt__pips');
    for (const repair of repairs) {
      const pip = el('i', `haunt__pip${state.done.includes(repair.id) ? ' is-done' : ''}`);
      pip.title = repair.title;
      strip.append(pip);
    }
    // **Der Anzug sind Leben, keine Zahl.** Wer auf einen Blick sieht, dass
    // einer fehlt, ruft es dem Techniker zu, ohne erst „2/3" lesen zu müssen.
    const round = this.host.round?.() ?? null;
    const suit = round ? round.suit : state.crew.hp;
    const suitMax = round ? round.suitMax : 3;
    const lives = el('span', 'haunt__pips haunt__pips--suit');
    for (let i = 0; i < suitMax; i++)
      lives.append(el('i', `haunt__pip haunt__pip--suit${i < suit ? ' is-alive' : ''}`));
    const hud = round ? roundHud(round) : null;
    const parts: HTMLElement[] = [
      el('span', 'haunt__quest-label', 'SYSTEME'),
      strip,
      el('span', 'haunt__quest-label', 'ANZUG'),
      lives,
    ];
    if (hud) {
      const oxygen = el('span', 'haunt__quest-oxygen', hud.oxygen);
      oxygen.dataset['oxygen'] = '';
      parts.push(oxygen);
      if (hud.cabins > 0) parts.push(el('span', 'haunt__quest-cabins', cabinsText(hud.cabins)));
    }
    parts.push(el('span', 'haunt__quest-count', `${state.done.length}/3`));
    this.quest.replaceChildren(...parts);
    this.quest.classList.toggle('is-low', !!hud?.low);
    this.quest.setAttribute(
      'aria-label',
      `${state.done.length} von 3 Systemen repariert; ` +
        (hud ? hud.label : `Anzug ${suit} von ${suitMax}`),
    );
  }

  /**
   * **Die Seite unter der Leiste**: der Aufbau — oder die Rolle aus der
   * Registry, gebaut über einen `RoleHost`, den alle teilen.
   */
  private page(station: StationId | null): HTMLElement[] {
    if (this.tab === 'setup') {
      this.dropView();
      return this.vanPage();
    }
    // **Der Techniker hat kein Gerät in der Zentrale.** Sein Reiter sagt, was
    // er ist, und schickt ihn zum Startknopf — die Runde selbst spielt er am
    // Stock (2D) oder im Schiff (3D), nicht auf dieser Seite.
    if (this.tab === 'technician') {
      this.dropView();
      return [
        note(
          'live',
          'Du bist der Techniker',
          this.host.lobby?.().view === '2d'
            ? 'Die Runde läuft für dich als Karte von oben — starten im Aufbau.'
            : 'Die Runde läuft für dich im Schiff — starten im Aufbau.',
        ),
        ...this.vanPage(),
      ];
    }
    // **Unterwegs ist eine eigene Seite**, und zwar eine mit nur einem Satz:
    // Wer den Reiter wechselt, läuft in der Zentrale erst einmal hinüber
    // (`stations.MOVE_TIME`), und die alte Seite währenddessen stehen zu
    // lassen hieße, ihm Auskünfte zu zeigen, an denen er nicht mehr sitzt.
    const travel = this.host.arriving();
    if (station === null && travel > 0) {
      this.dropView();
      return [
        note(
          'calm',
          'Unterwegs …',
          `Noch ${travel.toFixed(1)} s bis zum Gerät. Solange sieht das hier niemand.`,
        ),
      ];
    }
    if (station === null) {
      this.dropView();
      return [note('calm', 'Keine Rolle', NO_ROLE_HINT)];
    }
    const view = this.shownView;
    // **Ein Stuhl ohne Fähigkeit ist ein Stuhl ohne Karte.** Das sagt die
    // Seite, statt eine leere Karte zu zeigen: Die Fähigkeit kommt aus der
    // Tafel, und dorthin führt der Satz.
    if (!view) {
      this.dropView();
      return [
        note(
          'warn',
          `${MY_ROLE_LABELS[this.me]}: keine Fähigkeit`,
          'Dieser Platz hält keine Karte. Im Aufbau Späher, Schalttafel oder Archiv zuweisen.',
        ),
      ];
    }
    const role = roles.get(view);
    if (!role) {
      this.dropView();
      return [note('warn', 'Unbekannte Rolle', `Für „${view}" ist keine Ansicht angemeldet.`)];
    }
    if (!this.host.snapshot) {
      this.dropView();
      return [note('warn', 'Keine Karte', 'Diese Welt liefert den Rollen keinen Stand.')];
    }
    if (this.viewId !== role.id) {
      this.dropView();
      this.view = role.mount(this.roleHost());
      this.viewId = role.id;
      // **Der Zuschauer bringt seine Linse mit**: „Zuschauer: Techniker" folgt
      // ihm, „Zuschauer: Alles" sieht das Deck. Die Ansicht selbst darf sie
      // danach umstellen; hier steht nur der Anfang.
      const watch = this.view as Partial<WatchRoleView>;
      if (isWatcher(this.me) && watch.setLens)
        watch.setLens(
          this.me === 'watch:technician'
            ? { seat: 'deck', follow: 'technician' }
            : { seat: 'deck', follow: 'free' },
        );
    }
    // **Mehr als eine Karte auf dem Stuhl: eine Zeile zum Blättern.** Sie
    // steht nur, wenn es etwas zu blättern gibt — ein Streifen mit einem
    // einzigen Knopf ist ein Knopf, der nichts tut.
    const held = [...this.held];
    if (held.length > 1) {
      const strip = el('nav', 'haunt__subs');
      strip.setAttribute('aria-label', 'Karte');
      for (const ability of held) {
        const key = el('button', 'haunt__sub', ABILITY_LABELS[ability]);
        key.dataset['sub'] = ability;
        key.setAttribute('aria-pressed', String(ability === this.subAbility));
        strip.append(key);
      }
      return [strip, this.view!.element];
    }
    return [this.view!.element];
  }

  /** Was jede Rollenansicht von der Zentrale bekommt (`registry/roles.ts`). */
  private roleHost(): RoleHost {
    const host = this.host;
    return {
      snapshot: () => host.snapshot!(),
      spec: () => host.spec(),
      ledger: () => host.state(),
      me: () => host.me(),
      nameOf: (peer) => host.nameOf(peer),
      door: (id) => host.door(id),
      light: (id) => host.light(id),
      // **Der Sicherungskasten entscheidet, was auf der Tafel steht**
      // (`panel.ts`): Vor ihm ist die Hälfte der Schalter nicht da, und diese
      // eine Zeile ist der ganze Grund, aus dem Archivar, Techniker und
      // Schalttafel in dieser Reihenfolge dran sind.
      switches: () => visibleSwitches(host.spec().switches, host.state().fuse),
      notify: (text) => host.notify?.(text),
      extra: { monster: host.monsterPort?.() ?? null, archive: host.archiveDesk?.() ?? null },
    };
  }

  /**
   * **Der Aufbau** — eine Seite, zwei Häkchen, eine Verteilung, ein Startknopf.
   *
   * Vorher standen hier drei Kacheln (Spielen · Zuschauen · Trainieren), ein
   * Segment 2D|3D, eine eingeklappte Geräteliste, ein Startknopf mit „(2D)"
   * in Klammern und eine Hilfe, in der stand, wie eine Dreiercrew aufgeteilt
   * wird. Der Besitzer hat sich das angesehen und gesagt: zu viel. Geblieben
   * ist:
   *
   * - **Zwei Häkchen.** „2D-Welt von oben" ist die Ansicht (`LobbyChoice.view`)
   *   und „Testen" die Absicht `train` — ohne Monster, und in einer Test-Runde
   *   darf jeder jederzeit jede Rolle wechseln (`roundSetup.switchRights`).
   * - **Die Verteilung** (`roundSetupPanel.ts`): Techniker (VR, wenn eine
   *   Brille im Raum ist), Monster, und die drei Fähigkeiten mit Bot/Mensch/Aus.
   * - **Ein Startknopf**, ohne Ansicht in Klammern (`lobby.startLabel`).
   * - **Und die Hilfe, wer was sieht** — aus der Registry (`RoleFacts.sees`)
   *   und nicht aus einer Liste hier: Was eine Rolle ausdrücklich *nicht*
   *   sieht, ist die halbe Spielregel, und eine Rolle, die sich anmeldet,
   *   bringt ihren Satz mit.
   *
   * „Zuschauen" wird hier nicht mehr gewählt: Es ist nichts, was man *aufbaut*,
   * sondern etwas, das man mitten in der Runde anschaltet. Die Geräteliste ist
   * weg, weil die Reiter oben dasselbe können und dabei zeigen, was man ist.
   */
  private vanPage(): HTMLElement[] {
    const claims = this.host.claims();
    const me = this.host.me();
    const link = this.host.link();
    const setup = this.host.setup?.() ?? null;
    const choice = this.host.lobby?.() ?? null;
    // **Der Statuschip statt der Warnzeile.** „Warte auf den VR-Spieler" stand
    // als roter Kasten über allem und war doch nur eine Zählung: Es gibt keinen
    // Grund, auf jemanden zu warten — eine 2D-Runde geht auch allein los.
    const chip = el(
      'div',
      `lobby__link${link.vr ? ' is-live' : ''}`,
      `${link.peers} Gerät(e) · Raum ${link.room || 'verbindet …'}${link.vr ? ' · Techniker im Schiff' : ''}`,
    );
    const out: HTMLElement[] = [chip];

    // **Wer noch nichts ist, liest es hier zuerst.** Der Satz steht auch auf
    // jedem Reiter, den man ohne Fähigkeit öffnet — aber solange die Runde
    // läuft und dieses Telefon nichts hält, gehört er ganz nach oben.
    if (setup && choice && this.host.setSetup && this.host.setLobby) {
      // **Ein Häkchen, nicht zwei.** „Testen" ist weg — auf der Tafel steht
      // „Monster: Aus", und das ist dieselbe Aussage an der Stelle, an die sie
      // gehört.
      const checks = el('div', 'lobby__checks');
      checks.append(
        check('view', FLAT_CHECK, 'Die Karte von oben statt des Schiffs', choice.view === '2d'),
      );
      out.push(checks);
      out.push(
        note(
          'calm',
          `Du bist: ${MY_ROLE_LABELS[this.me]}`,
          MY_ROLE_HINTS[this.me] + ' · Wechseln über die Reiter oben.',
        ),
      );

      this.setupPanel ??= new SetupPanel({
        setup: () => this.host.setup!(),
        onChange: (next) => this.host.setSetup!(next),
        humanMonster: () => (this.host.lobby?.().view ?? '2d') === '2d',
        vr: () => this.host.vr?.() ?? this.host.link().vr,
        holder: (seat) => this.holderOf(seat),
      });
      this.setupPanel.render();
      out.push(this.setupPanel.element);

      if (this.host.startSetup) {
        // **Eine 2D-Runde ist lokal**: Sie stört keinen Techniker im Schiff,
        // deshalb sperrt ein spielender Techniker sie auch nicht. Im Schiff
        // gibt es dagegen einen Techniker je Raum.
        const busy = link.vr && choice.view === '3d';
        const start = el('button', 'lobby__start');
        start.dataset['startSetup'] = '';
        start.append(
          el('strong', '', startLabel(setup)),
          el(
            'span',
            'haunt__tag',
            busy ? 'Ein Techniker spielt bereits im Schiff.' : describeSetup(setup),
          ),
        );
        start.toggleAttribute('disabled', busy);
        out.push(start);
      }
    } else if (!link.vr) {
      // Eine Welt ohne Aufbau-Anschluss (ältere Hosts, Tests): wenigstens der
      // Weg an den Stock bleibt erreichbar.
      const test = el('button', 'haunt__tile', 'Als Techniker am Desktop testen');
      test.dataset['technician'] = '';
      out.push(test);
    }

    if (shoved(claims, me)) {
      out.push(
        note(
          'warn',
          'Weggeschubst',
          'Jemand saß länger an dem Gerät. Nimm ein anderes — du verlierst Zeit, aber nichts, was du schon weißt.',
        ),
      );
    }

    const help = el('details', 'lobby__help');
    help.append(
      el('summary', '', 'Hilfe: Wer sieht was?'),
      note(
        link.vr ? 'live' : 'calm',
        link.vr ? 'Crew verbunden' : 'Noch kein Techniker im Schiff',
        `${link.peers} Gegenstelle(n) · Raum: ${link.room || 'verbindet …'}. Alle Geräte müssen denselben Raum wählen.`,
      ),
      ...listRoles().map((role) => note('calm', role.label, `Sieht: ${role.sees}`)),
    );
    out.push(help);
    return out;
  }

  /**
   * **Einen Platz nehmen** — der eine Tipp, der „wer bin ich" beantwortet.
   *
   * Er tut drei Dinge auf einmal, weil sie eines sind: Er merkt die Wahl in
   * der Lobby (`LobbyChoice.me`), er schreibt den Platz in der Verteilung auf
   * „Mensch" (ein Stuhl, auf dem jemand sitzt, ist kein Bot), und er setzt
   * dieses Gerät an das Gerät, das dazugehört (`stationFor`). Der vorige
   * Platz fällt zurück an das, was die Tafel dafür vorsieht — an einen Bot,
   * wenn er einer war, sonst bleibt er, wie er ist: Ein Mensch, der nach dem
   * Umsetzen an zwei Stellen als „Mensch" stünde, wäre eine Verteilung, die
   * für drei Leute reicht und von einem gespielt wird.
   *
   * Mitten in einer Runde entscheidet `roundSetup.switchRights`, ob er darf:
   * In einer Test-Runde jeder alles; sonst nur, wer in der Zentrale sitzt; den
   * Techniker in der Brille rührt niemand an.
   */
  private choose(me: MyRole): void {
    const was = this.me;
    const running = this.host.state().phase === 'running';
    if (running && was !== me) {
      const rights = switchRights({
        test: this.host.state().crew.options.test,
        inCentre: was !== 'monster' && was !== 'technician',
        vrTechnician: this.host.link().vr,
      });
      const allowed = me === 'technician' ? rights.technician : rights.abilities;
      if (!allowed) {
        this.host.notify?.(rights.why);
        return;
      }
    }
    this.tab = me;
    this.sub = null;
    const choice = this.host.lobby?.();
    if (choice && this.host.setLobby) this.host.setLobby({ ...choice, me });
    const setup = this.host.setup?.();
    if (setup && this.host.setSetup) {
      let next = setup;
      // Der alte Platz fällt zurück: ein Stuhl wird leer, Techniker und
      // Monster gehen an die Zahlen — eine Runde ohne Monster wäre ein Test,
      // den niemand bestellt hat.
      if (!isWatcher(was) && was !== me && setup.seats[was].who === 'human')
        next = withWho(next, was, isColour(was) ? 'off' : 'bot');
      if (!isWatcher(me) && next.seats[me].who !== 'human') next = withWho(next, me, 'human');
      if (next !== setup) this.host.setSetup(next);
    }
    const station = stationFor(me);
    if (station) {
      if (this.host.seat() !== station) this.host.sit(station);
      // **Von einem Zuschauer zum anderen bleibt der Fernseher stehen** — nur
      // die Linse wechselt. Beim ersten Aufschlagen setzt `page()` sie; hier
      // steht der Wechsel, während die Ansicht schon da ist.
      const watch = this.view as Partial<WatchRoleView> | null;
      if (isWatcher(me) && this.viewId === 'watch' && watch?.setLens)
        watch.setLens(
          me === 'watch:technician'
            ? { seat: 'deck', follow: 'technician' }
            : { seat: 'deck', follow: 'free' },
        );
    } else if ((this.host.lobby?.().view ?? '2d') === '3d' && !this.host.link().vr) {
      // Im Schiff heißt „Ich bin der Techniker": diesen Desktop an den Stock.
      this.host.technician();
    }
    if (me !== 'technician') this.host.leaveTechnician?.();
  }

  /**
   * **Das eine Häkchen des Aufbaus.** „2D-Welt von oben" ist die Ansicht —
   * es schreibt dorthin, wo sie hingehört (`rules/lobby.ts`), und startet
   * nichts.
   */
  private toggleCheck(which: 'view'): void {
    const choice = this.host.lobby?.();
    if (!choice || which !== 'view') return;
    this.host.setLobby?.({ ...choice, view: choice.view === '2d' ? '3d' : '2d' });
  }

  /** Wer diesen Platz gerade über das Netz hält — als Name, `null` für niemanden. */
  private holderOf(seat: MyRole): string | null {
    const station = stationFor(seat);
    if (!station || station === 'watch') return null;
    const owner = seating(this.host.claims()).get(station);
    if (!owner) return null;
    return owner === this.host.me() ? 'du' : this.host.nameOf(owner);
  }

  private roundResult(): HTMLElement[] {
    const state = this.host.state();
    const phase = state.phase;
    if (phase !== 'lost' && phase !== 'won') return [];
    // Der Grund kommt aus den Rundenregeln (`MapRound.ending`); ohne sie bleibt
    // die alte Lesart: Ein Anzug ohne Leben ist zerstört, sonst war es die Uhr.
    const ending =
      this.host.round?.()?.ending ||
      (phase === 'won' ? 'escaped' : state.crew.hp <= 0 ? 'suit' : 'oxygen');
    const box = el('section', `haunt__round-result${phase === 'lost' ? ' is-lost' : ''}`);
    box.setAttribute('role', 'status');
    box.setAttribute('aria-live', 'polite');
    box.dataset['ending'] = ending;
    box.append(
      el(
        'strong',
        '',
        phase === 'lost'
          ? ending === 'oxygen'
            ? 'Sauerstoff aufgebraucht'
            : 'Verbindung zum Techniker verloren'
          : 'Mission erfüllt',
      ),
      el(
        'p',
        '',
        phase === 'lost'
          ? `${endingText(ending)} Die Runde ist beendet. Ihr könnt einen neuen Einsatz starten.`
          : endingText(ending),
      ),
    );
    if (this.host.restart) {
      const restart = el('button', 'haunt__chart-key', 'Neue Runde starten');
      restart.dataset['restart'] = '';
      box.append(restart);
    }
    return [box];
  }

  // --- Eingaben ---------------------------------------------------------------

  private onClick(event: Event): void {
    const target = event.target as HTMLElement | null;
    const hit = target?.closest<HTMLElement>(
      '[data-tab],[data-me],[data-sub],[data-check],[data-technician],[data-game-menu],[data-page-net],[data-page-vr],[data-restart],[data-start-setup]',
    );
    if (!hit) return;

    if (hit.dataset['gameMenu'] !== undefined) {
      this.host.menu?.();
      return;
    } else if (hit.dataset['pageNet'] !== undefined || hit.dataset['pageVr'] !== undefined) {
      // **Die Kopfzeile der Seite ist ausgeblendet, nicht abgebaut.**
      // Verbindung und VR hängen an ihr (`main.ts`, `#hud`), nicht an dieser
      // Welt; das Telefon drückt sie stellvertretend. Fehlt sie (Tests, eine
      // eingebettete Seite), passiert nichts — und nichts ist hier richtig.
      document.getElementById(hit.dataset['pageNet'] !== undefined ? 'hud-net' : 'hud-vr')?.click();
      return;
    } else if (hit.dataset['startSetup'] !== undefined) {
      if (!this.host.link().vr || this.host.flatWanted?.()) this.host.startSetup?.();
      return;
    } else if (hit.dataset['restart'] !== undefined) {
      this.host.restart?.();
      return;
    } else if (hit.dataset['technician'] !== undefined) {
      this.host.technician();
      return;
    } else if (hit.dataset['check'] !== undefined) {
      this.toggleCheck(hit.dataset['check'] as 'view');
    } else if (hit.dataset['tab'] !== undefined) {
      this.tab = 'setup';
    } else if (hit.dataset['me']) {
      this.choose(hit.dataset['me'] as MyRole);
    } else if (hit.dataset['sub']) {
      this.sub = hit.dataset['sub'] as Ability;
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

/** Ein Häkchen des Aufbaus: Kästchen links, Name und Zeile rechts. */
function check(id: string, label: string, hint: string, on: boolean): HTMLElement {
  const key = el('button', `lobby__check${on ? ' is-on' : ''}`);
  key.dataset['check'] = id;
  key.setAttribute('aria-pressed', on ? 'true' : 'false');
  key.append(el('span', 'lobby__box', on ? '✓' : ''), el('span', 'lobby__check-text'));
  key.lastElementChild?.append(el('strong', '', label), el('span', 'haunt__tag', hint));
  return key;
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
