import { repairsFor } from './mission';
import './haunting.css';
import './stationDashboard.css';
import {
  describeSetup,
  isColour,
  isWatcher,
  MY_ROLE_LABELS,
  NO_ROLE_HINT,
  roleName,
  seatAbilities,
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
import { mountSeatView } from './views/seatRole';
import { roleTabKey, roleTabs } from './views/roleTabs';
import { defaultLens, seatStation, type WatchLens } from './watchLens';
import type { ArchiveDesk } from './views/archiveDesk';
import type { HouseSpec } from './house';
import { seating, shoved, type Claim, type StationId } from './stations';
import type { HauntState } from './net';
import type { MapRound, MapSnapshot } from './map/mapSnapshot';
import { cabinsText, endingText, lowOxygen, roundHud } from './rules/roundHud';
import { FLAT_CHECK, startLabel, type LobbyChoice, type View } from './rules/lobby';
import { SHIP_OCCUPIED } from './rules/worldMenu';
import type { MonsterPort } from './monster/monsterDriver';

/**
 * **Die Einsatzzentrale auf dem Telefon** — zwei Seiten, ein Kopf.
 *
 * Diese Datei hat lange **jede** Rolle selbst gezeichnet: Radarschirm,
 * Aktenblatt, Schalterliste, Cockpit, jeweils in einer eigenen Methode, und
 * ein `if (station === …)` verteilte darauf. Das ist vorbei. Was hier steht,
 * ist der Rahmen: wer was hält, was gestartet wird, wie die Runde ausgeht —
 * und ein Platz, in den die Rolle aus der **Registry** gehängt wird
 * (`registry/roles.ts`). Eine neue Rolle braucht in dieser Datei keine Zeile
 * mehr; sie legt eine `*.register.ts` an, und der Reiter steht da.
 *
 * **Der Ablauf, den der Besitzer wollte:** Man tritt der Lobby bei, stellt
 * im **Aufbau** die Rollen ein — wer Mensch, Bot oder aus ist, wer welche
 * Fähigkeit hält — und drückt unten **„Rollen testen"**. Dann kommt die
 * **Karte**, und darüber genau **ein Kopf**: die Rollen als Reiter zum
 * Wechseln, das Zahnrad, und darunter die Leiste mit Uhr, Aufträgen und
 * Anzug-Leben — dieselbe Zeile wie beim Techniker in der 2D-Welt
 * (`map/flatMode.ts`). Solange niemand die Mission gestartet hat, ist das ein
 * **Test**: hell, ohne Uhr, ohne Treffer, und jeder darf jede Rolle. Im
 * Zahnrad stehen „Mission starten" / „Mission stoppen" und „Zurück zu den
 * Rollen"; dorthin sind auch Menü, Verbindung und VR gezogen.
 *
 * **Ein „Ich" gibt es nicht mehr.** Auf dem Aufbau stand es zuletzt als Knopf
 * je Zeile, oben standen dieselben Rollen als Reiter — dieselbe Frage zweimal.
 * Jetzt beantwortet sie nur der Reiter, und der steht nur dort, wo er etwas
 * zeigt: über der Karte. Der Aufbau sagt, **wer** die Plätze hält und **was**
 * jeder darf, und sonst nichts.
 *
 * **Und die Zentrale besteht aus Fähigkeiten, nicht aus Plätzen**
 * (`rules/roundSetup.ts`): Wer sich Späher *und* Schalttafel nimmt, sitzt in
 * der Einsatzkontrolle; wer Akte und Radar hält, klärt auf. Mitten in der
 * Mission entscheidet `switchRights`, wer überhaupt wechseln darf.
 *
 * Die Rollen selbst zeichnen dieselbe `MapView` wie die 2D-Welt, jede mit
 * eigenen Schichten (`views/`): der Archivar alles, was liegt, die Schalttafel
 * die Station ohne Wesen — Türen und Lampen schaltet sie mit dem Tipp auf die
 * Karte —, der Späher zwei Punkte alle dreieinhalb Sekunden. Der Fernseher
 * ist die Ausnahme: Sein Bild ist die 3D-Welt, gezeichnet in das Rechteck,
 * das seine Ansicht meldet (`RoleView.viewport`).
 */
export interface StationHost {
  spec(): HouseSpec;
  state(): HauntState;
  claims(): Claim[];
  me(): string;
  /**
   * Der Stand der Leitung — und **wer im Anzug steckt**, als Name: ich
   * selbst (Brille oder Techniker am Bildschirm) oder der Mitspieler mit
   * Brille oder frischem Herzschlag. `null`, wenn der Anzug niemandem gehört.
   */
  link(): { peers: number; vr: boolean; room: string; technician?: string | null };
  /**
   * **Dieses Gerät an den Stock setzen** — der Reiter „Techniker". Auf der
   * Karte von oben öffnet die Welt dafür die 2D-Welt im Test-Zustand
   * (`HauntingWorld.takeStick`), im Schiff wird es der Desktop-Techniker.
   */
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
   * Die Wahl des Aufbaus (`rules/lobby.ts`): die Ansicht — 2D von oben oder
   * 3D im Schiff, als Häkchen „2D-Welt" — und der eigene Platz (`me`).
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
  /**
   * **Die Runde stoppen** — zurück in den Test auf derselben Station
   * (`HauntingWorld.stopRound`): hell, ohne Uhr, ohne Treffer.
   */
  stopRound?(): void;
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
 * **Die zwei Seiten des Telefons**: der Aufbau — Tafel, Häkchen, Knöpfe —
 * und die Karte, auf der man eine Rolle hält (`MyRole`). Über der Karte
 * stehen die Rollen als Reiter; sie sind die Antwort auf „wer bin ich"
 * (`rules/lobby.LobbyChoice.me`), die eine Stelle, an der dieses Gerät sich
 * einen Platz nimmt.
 */
type PhoneTab = 'setup' | MyRole;

/** Welches Gerät zu einer Wahl gehört — `null` für den Techniker, der kein Gerät hat. */
function stationFor(me: MyRole): StationId | null {
  if (me === 'technician') return null;
  if (isWatcher(me)) return 'watch';
  return me;
}

/** Was in der Leiste steht, wenn keine Uhr läuft. */
const IDLE_LABEL = 'Test · keine Runde';
const OVER_LABEL = 'Runde vorbei';

export class StationUi {
  private readonly root = document.createElement('div');
  private readonly bar = document.createElement('header');
  private readonly quest = document.createElement('div');
  /**
   * **Die Zeile, in der die Welt dem Telefon antwortet** (`say`). Sie steht
   * zwischen Auftragsstreifen und Seite und nicht in der rollenden Liste: Eine
   * Antwort, die man erst suchen muss, ist keine.
   */
  private readonly says = document.createElement('div');
  private readonly body = document.createElement('div');
  /**
   * **Das Zahnrad-Menü über der Karte** — Mission starten und stoppen, zurück
   * zu den Rollen, Menü, Verbindung, VR. Es liegt über der Rolle und nicht
   * in ihr, weil es für jede Rolle dasselbe ist.
   */
  private readonly menu = document.createElement('div');

  /** Welche Seite zu sehen ist — der Anfang ist der Aufbau. */
  private tab: PhoneTab = 'setup';
  /** Ob das Zahnrad-Menü offen ist. */
  private menuOpen = false;
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
    this.says.className = 'haunt__say';
    this.says.hidden = true;
    // Nur `aria-live` und kein `role="status"`: Die Endkarte der Runde ist die
    // Statusmeldung dieser Seite (`roundResult`), und zwei davon übereinander
    // wären für einen Vorleser zwei gleich wichtige Stimmen.
    this.says.setAttribute('aria-live', 'polite');
    this.body.className = 'haunt__body';
    this.menu.className = 'haunt__menu';
    this.menu.hidden = true;
    this.menu.setAttribute('role', 'dialog');
    this.menu.setAttribute('aria-label', 'Optionen');
    this.root.append(this.bar, this.quest, this.says, this.body, this.menu);
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

  /** Ob gerade der Aufbau zu sehen ist — für Tests. */
  get inSetup(): boolean {
    return this.tab === 'setup';
  }

  /** Ob das Zahnrad-Menü offen ist — für Tests. */
  get optionsOpen(): boolean {
    return this.menuOpen;
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
   * **Welche Karte für die Welt zählt** — auf einem Farbplatz liegen alle
   * Fähigkeiten auf einer Karte (`views/seatRole.ts`); die Welt fragt nur,
   * ob ein Archiv dabei ist (sein Loch für die Raumakte), sonst die erste.
   * `null` ohne Fähigkeit.
   */
  private get leadAbility(): Ability | null {
    const held = this.held;
    if (held.has('archive')) return 'archive';
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
    const ability = this.leadAbility;
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

  /**
   * **Ein Wort, das man auch sieht.**
   *
   * Die Welt antwortet sonst über `ctx.notify`, und das schreibt in die
   * Statuszeile des Handgelenk-Menüs — ein Panel in der 3D-Szene, über dem
   * diese Seite liegt (`haunting.css`, `body.haunt-on #hud`). Wer im Aufbau
   * auf „Mission starten" drückte und abgewiesen wurde, bekam die Begründung
   * also hinter sein eigenes Telefon geschrieben: ein Knopf, der scheinbar
   * nichts tut. Hier steht sie, bis der nächste Tipp sie ablöst.
   */
  say(text: string): void {
    this.says.textContent = text;
    this.says.hidden = !text;
  }

  /**
   * **Zurück in den Aufbau** — von der Welt gerufen, wenn die 2D-Welt mit
   * „Zurück zu den Rollen" zugeht: Das Telefon soll dann dort stehen, wo
   * Tafel und Knöpfe sind, und nicht auf der Karte einer Rolle von eben.
   */
  goSetup(): void {
    this.tab = 'setup';
    this.menuOpen = false;
    this.drawn = '';
    this.refresh();
  }

  refresh(): void {
    const state = this.host.state();
    const station = this.station;
    const round = this.host.round?.() ?? null;
    const sign = [
      this.host.spec().seed,
      this.tab,
      this.menuOpen,
      station ?? 'van',
      this.me,
      // Von der Runde nur, was selten kippt: Leben, Kabinen, die Warnschwelle,
      // das Ende. Die Uhr selbst läuft unten in die Anzeige, ohne Neuschrift.
      round
        ? `${round.phase}/${round.suit}/${round.cabinsDestroyed.length}/${lowOxygen(round.oxygen)}`
        : '',
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
    if (round && round.phase === 'running') {
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
    const setup = this.tab === 'setup';

    // Die Farbe der Station hängt am Wurzelelement und nicht an jeder Kachel
    // einzeln: Von hier aus färbt sie Kopfzeile, Rand und Knöpfe über eine
    // einzige Variable, und eine weitere Rolle bekommt eine Zeile im CSS.
    this.root.dataset['station'] = station ?? 'van';
    this.root.dataset['page'] = setup ? 'setup' : 'live';
    // Eine Rolle mit Karte bekommt die ganze Fläche unter der Leiste; der
    // Fernseher bekommt eine rollende Liste, weil sein Bild darin steht.
    this.root.classList.toggle('is-view', role?.surface === 'map');

    this.writeBar();
    // **Uhr und Anzug gehören zur Karte, nicht zum Aufbau.** Im Aufbau sagen
    // sie nichts — dort läuft noch nichts —, und der Besitzer wollte sie dort
    // ausdrücklich nicht sehen.
    this.quest.hidden = setup;
    this.writeQuest(state);
    // Das Zahnrad-Menü gibt es nur über der Karte.
    this.menu.hidden = setup || !this.menuOpen;
    if (!this.menu.hidden) this.writeMenu(state);

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
   * **Der eine Kopf.** Im Aufbau eine Überschrift und rechts drei kleine
   * Knöpfe für Spielmenü, Verbindung und VR; über der Karte **die Rollen als
   * Reiter** — Techniker, die drei Stühle, das Monster, die zwei Zuschauer —
   * und am Ende das Zahnrad. Wer einen Reiter antippt, **nimmt** die Rolle;
   * mitten in der Mission allerdings nur, wenn er darf
   * (`roundSetup.switchRights`).
   */
  private writeBar(): void {
    const tools = el('span', 'haunt__tools');
    const tool = (key: string, label: string, title: string): void => {
      const node = el('button', 'haunt__tool', label);
      node.dataset[key] = '';
      node.setAttribute('aria-label', title);
      tools.append(node);
    };
    if (this.tab === 'setup') {
      const title = el('span', 'haunt__title', 'Aufbau · Rollen');
      // Menü, Verbindung und VR hängen an der Seite (`main.ts`); die Kopfzeile
      // der Seite ist hier ausgeblendet, also drückt das Telefon sie
      // stellvertretend — im Aufbau als kleine Knöpfe, über der Karte im
      // Zahnrad.
      tool('gameMenu', '☰', 'Spielmenü öffnen');
      tool('pageNet', '⇄', 'Verbindung der Seite öffnen');
      tool('pageVr', 'VR', 'VR starten oder beenden');
      this.bar.replaceChildren(title, tools);
      return;
    }

    const setup = this.host.setup?.() ?? null;
    const me = this.me;
    // **Dieselben sieben Reiter wie im Kopf der 2D-Welt** (`views/roleTabs.ts`,
    // `views/roleStrip.ts`): Techniker, die drei Stühle, das Monster, die zwei
    // Zuschauer — in dieser Reihenfolge, immer alle, als Knöpfe in einem
    // Panel. Ein Stuhl trägt klein darunter, was er hält („Rot / Archiv");
    // einer ohne Fähigkeit steht trotzdem da, mit dem Hinweis, dass die Tafel
    // ihm eine geben muss. Ein Reiter, der bei jeder Runde woanders sitzt, ist
    // einer, den man jedes Mal sucht.
    const nav = el('nav', 'haunt__roles role-strip');
    nav.setAttribute('aria-label', 'Rolle');
    for (const entry of roleTabs(setup)) {
      const key = roleTabKey(entry, { mine: me === entry.id, open: this.tab === entry.id });
      key.dataset['me'] = entry.id;
      nav.append(key);
    }

    tool('options', '⚙', 'Optionen: Mission starten oder stoppen, zurück zu den Rollen');
    tools.firstElementChild?.setAttribute('aria-pressed', this.menuOpen ? 'true' : 'false');
    this.bar.replaceChildren(nav, tools);
  }

  /**
   * **Die Leiste unter den Reitern** — dieselbe Zeile wie beim Techniker in
   * der 2D-Welt: Systeme als Kreise, Anzug als Leben, und die Uhr. **Die Uhr
   * läuft nur in der Mission**: Solange getestet wird, steht an ihrer Stelle
   * „Test · keine Runde" — eine Uhr, die herunterzählt, bevor jemand
   * gestartet hat, war der Befund des Besitzers.
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
    const phase = round?.phase ?? state.phase;
    const live = phase === 'running';
    const suit = round ? round.suit : state.crew.hp;
    const suitMax = round ? round.suitMax : 3;
    const lives = el('span', 'haunt__pips haunt__pips--suit');
    for (let i = 0; i < suitMax; i++)
      lives.append(el('i', `haunt__pip haunt__pip--suit${i < suit ? ' is-alive' : ''}`));
    const hud = round && live ? roundHud(round) : null;
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
    } else if (!live) {
      const idle = el('span', 'haunt__quest-idle', phase === 'briefing' ? IDLE_LABEL : OVER_LABEL);
      idle.dataset['idle'] = '';
      parts.push(idle);
    }
    parts.push(el('span', 'haunt__quest-count', `${state.done.length}/3`));
    this.quest.replaceChildren(...parts);
    this.quest.classList.toggle('is-low', !!hud?.low);
    this.quest.setAttribute(
      'aria-label',
      `${state.done.length} von 3 Systemen repariert; ` +
        (hud ? hud.label : `Anzug ${suit} von ${suitMax}`) +
        (live ? '' : `; ${phase === 'briefing' ? IDLE_LABEL : OVER_LABEL}`),
    );
  }

  /**
   * **Das Zahnrad-Menü** — nur, was sich über der Karte ändert: die Runde
   * starten oder stoppen, zurück zu den Rollen, und die drei Knöpfe der
   * Seite. Dieselben Worte wie im Optionsmenü der 2D-Welt
   * (`map/optionsMenu.ts`), damit der Techniker und die Zentrale vom selben
   * Menü reden.
   */
  private writeMenu(state: HauntState): void {
    const setup = this.host.setup?.() ?? null;
    const items: HTMLElement[] = [];
    const option = (
      key: string,
      label: string,
      sub: string,
      more: { tone?: 'go' | 'leave'; disabled?: boolean } = {},
    ): HTMLElement => {
      const node = el('button', `haunt__option${more.tone ? ` haunt__option--${more.tone}` : ''}`);
      node.dataset[key] = '';
      node.append(el('strong', '', label));
      if (sub) node.append(el('small', '', sub));
      node.toggleAttribute('disabled', !!more.disabled);
      return node;
    };
    items.push(el('strong', 'haunt__menu-head', 'Runde'));
    if (state.phase === 'running') {
      items.push(
        option(
          'stopRound',
          'Mission stoppen',
          'Zurück in den Test: hell, ohne Uhr, ohne Treffer — dieselbe Station',
          { tone: 'leave' },
        ),
      );
    } else if (setup && this.host.startSetup) {
      const busy = this.shipBusy();
      items.push(
        option(
          'startSetup',
          startLabel(setup),
          busy ? 'Ein Techniker spielt bereits im Schiff.' : describeSetup(setup),
          { tone: 'go', disabled: busy },
        ),
      );
    }
    items.push(el('strong', 'haunt__menu-head', 'Aufmachen'));
    items.push(
      option('setup', 'Zurück zu den Rollen', 'Aufbau: Tafel, Häkchen, Hilfe'),
      option('gameMenu', 'Menü', 'Das Spielmenü der Seite: Welten, Bewegung, Grafik'),
      option('pageNet', 'Verbindung', 'Raum-Code, Mitspieler, Sprache und Chat'),
      option('pageVr', 'VR', 'VR starten oder beenden'),
    );
    items.push(option('closeOptions', 'Weiterspielen', ''));
    this.menu.replaceChildren(...items);
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
    // **Der Techniker hat kein Gerät in der Zentrale.** Sein Reiter setzt ihn
    // an den Stock (`StationHost.technician`): Auf der Karte von oben öffnet
    // sich dafür die 2D-Welt über dieser Seite, im Schiff wird er der
    // Techniker am Bildschirm. Was hier steht, sieht er nur, wenn beides nicht
    // ging — dann sagt der Satz, warum, und der Knopf versucht es noch einmal.
    if (this.tab === 'technician') {
      this.dropView();
      const flat = (this.host.lobby?.().view ?? '2d') === '2d';
      const vr = this.host.vr?.() ?? this.host.link().vr;
      const again = el('button', 'haunt__tile', 'An den Stock');
      again.dataset['technician'] = '';
      again.toggleAttribute('disabled', vr);
      return [
        note(
          vr ? 'warn' : 'live',
          'Du bist der Techniker',
          vr
            ? `Der Anzug ist vergeben: ${this.host.link().technician ?? 'jemand'} trägt ihn. Nimm einen anderen Reiter.`
            : flat
              ? 'Die Karte von oben öffnet sich — dort läufst du los. Mission starten: im Zahnrad.'
              : 'Du stehst im Schiff am Bildschirm. Mission starten: im Zahnrad oder aus der Zentrale.',
        ),
        again,
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
          'Dieser Platz hält keine Karte. Im Aufbau Späher, Schalttafel oder Archiv zuweisen — Zahnrad, „Zurück zu den Rollen".',
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
    // **Ein Stuhl, eine Karte.** Was Rot hält, liegt zusammen auf einer
    // Karte (`views/seatRole.ts`) — keine Zeile zum Blättern mehr: Der
    // Besitzer wollte die Fähigkeiten nicht wechseln, sondern haben.
    if (isColour(this.me)) {
      const key = `seat:${[...this.held].sort().join('+')}`;
      if (this.viewId !== key) {
        this.dropView();
        this.view = mountSeatView(this.roleHost(), this.held);
        this.viewId = key;
      }
      return [this.view!.element];
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
            ? { seat: 'deck', follow: 'technician', eyes: true }
            : { seat: 'deck', follow: 'free', eyes: false },
        );
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
      // Die ganze Tafel: Jede Tür, jede Lampe hat ihren Schalter, und keiner
      // liegt mehr hinter dem Sicherungskasten (`panel.ts`).
      switches: () => host.spec().switches,
      notify: (text) => host.notify?.(text),
      extra: { monster: host.monsterPort?.() ?? null, archive: host.archiveDesk?.() ?? null },
    };
  }

  /**
   * **Der Aufbau** — eine Seite, ein Häkchen, eine Verteilung, zwei Knöpfe.
   *
   * - **Ein Häkchen.** „2D-Welt von oben" ist die Ansicht (`LobbyChoice.view`);
   *   ohne Monster spielt man, indem der Platz Monster auf „Aus" steht.
   * - **Die Verteilung** (`roundSetupPanel.ts`): Techniker (VR, wenn eine
   *   Brille im Raum ist), Monster, und die drei Fähigkeiten mit Bot/Mensch/Aus
   *   — **ohne „Ich"**: Wer man ist, wählt man über die Reiter der Karte.
   * - **„Rollen testen"**: auf die Karte, ohne dass etwas losgeht — hell, ohne
   *   Uhr, ohne Treffer. Dort werden die Rollen über die Reiter genommen.
   * - **Der Startknopf**, ohne Ansicht in Klammern (`lobby.startLabel`) — für
   *   den, der nicht erst testen will. Derselbe Knopf steht über der Karte im
   *   Zahnrad.
   * - **Und die Hilfe, wer was sieht** — aus der Registry (`RoleFacts.sees`).
   *
   * „Zuschauen" wird hier nicht mehr gewählt: Es ist nichts, was man *aufbaut*,
   * sondern ein Reiter über der Karte.
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

    if (setup && choice && this.host.setSetup && this.host.setLobby) {
      const checks = el('div', 'lobby__checks');
      checks.append(
        check('view', FLAT_CHECK, 'Die Karte von oben statt des Schiffs', choice.view === '2d'),
      );
      out.push(checks);

      this.setupPanel ??= new SetupPanel({
        setup: () => this.host.setup!(),
        onChange: (next) => this.host.setSetup!(next),
        humanMonster: () => (this.host.lobby?.().view ?? '2d') === '2d',
        vr: () => this.host.vr?.() ?? this.host.link().vr,
        holder: (seat) => this.holderOf(seat),
        me: () => this.me,
        technician: () => this.host.link().technician ?? null,
      });
      this.setupPanel.render();
      out.push(this.setupPanel.element);

      // **Rollen testen** — der Weg auf die Karte, ohne dass eine Runde
      // losgeht. Die Rolle nimmt man dort über die Reiter; bis dahin gilt die
      // gemerkte (`LobbyChoice.me`), und die steht als Zeile unter dem Knopf.
      // **Läuft im Raum schon eine Mission**, ist derselbe Knopf der Einstieg
      // in sie: Wer die Seite mitten in der Runde neu geladen hat, steht hier
      // wieder im Aufbau — und fand bisher nur einen Start, den der Gastgeber
      // mit „läuft schon" abwies, und ein „Testen", das nicht stimmte.
      const running = this.host.state().phase === 'running';
      const test = el('button', 'lobby__start lobby__start--test');
      test.dataset['testRoles'] = '';
      if (running) test.dataset['join'] = '';
      test.append(
        el('strong', '', running ? 'Zur laufenden Runde' : 'Rollen testen'),
        el(
          'span',
          'haunt__tag',
          running
            ? `Die Mission läuft schon — auf die Karte als ${MY_ROLE_LABELS[this.me]}; die Rolle wechselst du dort über die Reiter.`
            : `Auf die Karte — hell, ohne Uhr, ohne Treffer. Rolle über die Reiter wählen · zuletzt: ${MY_ROLE_LABELS[this.me]}`,
        ),
      );
      out.push(test);

      if (this.host.startSetup) {
        // **Eine 2D-Runde ist lokal**: Sie stört keinen Techniker im Schiff,
        // deshalb sperrt ein spielender Techniker sie auch nicht. Im Schiff
        // gibt es dagegen einen Techniker je Raum — **aber die Runde startet
        // die Zentrale für ihn**: Solange dort noch keine läuft, geht der
        // Tipp als Wunsch an die Brille (`HauntingWorld.startRound`). Gesperrt
        // ist der Knopf nur, während seine Runde wirklich läuft.
        const busy = this.shipBusy();
        const start = el('button', 'lobby__start');
        start.dataset['startSetup'] = '';
        start.append(
          el('strong', '', startLabel(setup)),
          el(
            'span',
            'haunt__tag',
            busy
              ? 'Ein Techniker spielt bereits im Schiff.'
              : link.vr && choice.view === '3d'
                ? `Startet bei der Brille im Schiff · ${describeSetup(setup)}`
                : `Uhr, Dunkelheit, Monster — sofort · ${describeSetup(setup)}`,
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
      note(
        'calm',
        'Test und Mission',
        'Nach „Rollen testen" ist die Station hell, keine Uhr läuft und niemand wird getroffen — jeder darf jede Rolle. ' +
          'Erst „Mission starten" (Zahnrad oder hier) macht das Licht aus und die Uhr an; „Mission stoppen" führt zurück in den Test.',
      ),
      ...listRoles().map((role) => note('calm', role.label, `Sieht: ${role.sees}`)),
    );
    out.push(help);
    return out;
  }

  /**
   * **Ob der Start im Schiff gerade vergeben ist**: eine Brille im Raum, die
   * Ansicht auf dem Schiff — und dort läuft schon eine Runde. Vorher reichte
   * die Brille allein, und genau das war der tote Knopf: Wer in der Zentrale
   * saß, konnte die Runde des Technikers nicht anwerfen, und der Techniker
   * suchte sie am Handgelenk.
   */
  private shipBusy(): boolean {
    const link = this.host.link();
    const view = this.host.lobby?.().view ?? (this.host.flatWanted?.() ? '2d' : '3d');
    return link.vr && view === '3d' && this.host.state().phase === 'running';
  }

  /**
   * **Einen Platz nehmen** — der eine Tipp, der „wer bin ich" beantwortet.
   *
   * Er tut drei Dinge auf einmal, weil sie eines sind: Er merkt die Wahl in
   * der Lobby (`LobbyChoice.me`), er schreibt den Platz in der Verteilung auf
   * „Mensch" (ein Stuhl, auf dem jemand sitzt, ist kein Bot), und er setzt
   * dieses Gerät an das Gerät, das dazugehört (`stationFor`) — beim Techniker
   * an den Stock (`StationHost.technician`). Der vorige Platz fällt zurück an
   * das, was die Tafel dafür vorsieht — an einen Bot, wenn er einer war,
   * sonst bleibt er, wie er ist: Ein Mensch, der nach dem Umsetzen an zwei
   * Stellen als „Mensch" stünde, wäre eine Verteilung, die für drei Leute
   * reicht und von einem gespielt wird.
   *
   * Mitten in einer Mission entscheidet `roundSetup.switchRights`, ob er darf:
   * Im Test jeder alles; sonst jeder, der nicht im Schiff den Anzug trägt —
   * der Techniker am Bildschirm (Ansicht 3D) bleibt, wo er ist, und den
   * Techniker in der Brille rührt niemand an.
   */
  private choose(me: MyRole): void {
    const was = this.me;
    const running = this.host.state().phase === 'running';
    if (running && was !== me) {
      const rights = switchRights({
        test: this.host.state().crew.options.test,
        inShip: was === 'technician' && (this.host.lobby?.().view ?? '2d') === '3d',
        vrTechnician: this.host.link().vr,
      });
      const allowed = me === 'technician' ? rights.technician : rights.abilities;
      if (!allowed) {
        this.host.notify?.(rights.why);
        this.say(rights.why);
        return;
      }
    }
    this.tab = me;
    this.menuOpen = false;
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
            ? { seat: 'deck', follow: 'technician', eyes: true }
            : { seat: 'deck', follow: 'free', eyes: false },
        );
    }
    // **„Ich bin der Techniker" heißt: an den Stock** — die Welt entscheidet,
    // ob das die Karte von oben ist oder das Schiff.
    if (me === 'technician') this.host.technician();
    else this.host.leaveTechnician?.();
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
    if (this.host.stopRound) {
      const stop = el('button', 'haunt__chart-key', 'Zurück in den Test');
      stop.dataset['stopRound'] = '';
      box.append(stop);
    }
    return [box];
  }

  // --- Eingaben ---------------------------------------------------------------

  private onClick(event: Event): void {
    const target = event.target as HTMLElement | null;
    const hit = target?.closest<HTMLElement>(
      '[data-me],[data-check],[data-technician],[data-game-menu],[data-page-net],[data-page-vr],' +
        '[data-restart],[data-start-setup],[data-stop-round],[data-test-roles],[data-setup],' +
        '[data-options],[data-close-options]',
    );
    if (!hit || hit.hasAttribute('disabled')) return;
    // Der nächste Tipp löst die letzte Antwort ab: Ein Satz, der zu einem
    // Knopf von vorhin gehört, steht sonst noch da, wenn der nächste antwortet.
    this.say('');
    const data = hit.dataset;

    if (data['options'] !== undefined) {
      this.menuOpen = !this.menuOpen;
    } else if (data['closeOptions'] !== undefined) {
      this.menuOpen = false;
    } else if (data['setup'] !== undefined) {
      // Zurück zu den Rollen: die Karte weg, die Tafel da. Der Platz bleibt.
      this.tab = 'setup';
      this.menuOpen = false;
    } else if (data['testRoles'] !== undefined) {
      // **Rollen testen**: auf die Karte, mit dem gemerkten Platz — derselbe
      // Weg wie ein Tipp auf dessen Reiter (`choose`), also auch derselbe
      // Sitzplatz und beim Techniker der Stock.
      this.choose(this.me);
    } else if (data['gameMenu'] !== undefined) {
      this.menuOpen = false;
      this.host.menu?.();
    } else if (data['pageNet'] !== undefined || data['pageVr'] !== undefined) {
      // **Die Kopfzeile der Seite ist ausgeblendet, nicht abgebaut.**
      // Verbindung und VR hängen an ihr (`main.ts`, `#hud`), nicht an dieser
      // Welt; das Telefon drückt sie stellvertretend. Fehlt sie (Tests, eine
      // eingebettete Seite), passiert nichts — und nichts ist hier richtig.
      this.menuOpen = false;
      document.getElementById(data['pageNet'] !== undefined ? 'hud-net' : 'hud-vr')?.click();
    } else if (data['startSetup'] !== undefined) {
      // Im Schiff gibt es einen Techniker je Raum; die Karte von oben stört
      // ihn nicht, und eine Runde, die noch nicht läuft, startet die Zentrale
      // bei ihm. Und wo es nicht geht, steht ab jetzt auch, warum.
      this.menuOpen = false;
      if (!this.shipBusy()) this.host.startSetup?.();
      else this.say(SHIP_OCCUPIED);
    } else if (data['stopRound'] !== undefined) {
      this.menuOpen = false;
      this.host.stopRound?.();
    } else if (data['restart'] !== undefined) {
      this.host.restart?.();
    } else if (data['technician'] !== undefined) {
      this.host.technician();
    } else if (data['check'] !== undefined) {
      this.toggleCheck(data['check'] as 'view');
    } else if (data['me']) {
      this.choose(data['me'] as MyRole);
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
