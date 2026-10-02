import {
  drawMenuIcon,
  type DetailTweak,
  type DetailTweakSpec,
  type MenuDetail,
  type MenuEntry,
  type MenuFact,
  type MenuMark,
} from './menu';
import { COPY_FALLBACK, copyText } from './clipboard';
import { findMenuPath } from './menuGroups';
import { MenuNav, findStep } from './menuNav';
import { clampColumns, fitColumns, readColumns, stepColumns, writeColumns } from './pageCols';
import { keepSafe, setSafeEdge } from './safeArea';
import { clipLabel } from '../core/kaykitClips';
import type { DetailFacts, DetailOptions, DetailView, PagePreviewLayer } from './previewGrid';
import './pageMenu.css';

/**
 * **Dasselbe Menü als Seite** — für alle, die keine Handgelenke im Bild haben.
 *
 * In der Brille hängt das Menü am Arm (`WristMenu.ts`): ein Panel aus
 * Leinwand und Dreiecken, mit dem Strahl der anderen Hand bedient. Im
 * Browserfenster gab es bisher **dasselbe Panel**, frei vor die Kamera
 * gehängt — und am Telefon war das ein Bild von einem Menü, kein Menü: winzig,
 * mit dem Daumen kaum zu treffen, und hinter jeder 2D-Welt verschwunden, die
 * den Bildschirm für sich brauchte. Der Besitzer wollte es anders: **im Web
 * ein Knopf oben links, und dahinter ein Menü, das auf dem Handy zuerst
 * funktioniert** — eine Komponente für die Startseite und für jede Welt im
 * Browser, mobile first.
 *
 * Hier steht sie. Sie zeichnet **denselben Baum** (`MenuEntry`), den auch die
 * Handgelenke bekommen, mit denselben Ikonen (`drawMenuIcon`) und auf
 * **demselben Weg** (`MenuNav`): Wer im Browser drei Ebenen tief in den
 * Einstellungen steht, die Brille aufsetzt und dort das Menü öffnet, steht
 * auf derselben Seite. Was eine Zeile tut, weiß sie nicht — sie ruft `run`
 * und zeichnet neu, wie das Panel am Arm.
 *
 * Auf dem Telefon ist sie ein **Blatt von unten**, so breit wie der
 * Bildschirm, mit Zeilen, die ein Daumen trifft; ab 640 Punkten Breite ein
 * Kasten unter dem Knopf oben links (`pageMenu.css`). Zurück geht es über
 * den Pfeil im Kopf, nicht über eine Zeile in der Liste: Eine Webseite lässt
 * ihren Kopf auch stehen.
 *
 * Welche der beiden Fassungen gerade gilt, entscheidet `WristMenus`: mit
 * aufgesetzter Brille die Handgelenke, sonst diese Seite. Kein three.js — nur
 * DOM, damit ein Test sie ohne Browser aufschlagen kann (`pageMenu.test.ts`).
 *
 * **Auch die Modelle in den Kacheln nicht.** Eine Kachel des Asset-Regals zeigt
 * nicht ihre Ikone, sondern das Ding selbst (`MenuEntry.preview`) — und das
 * ist three.js. Die Seite hält dafür nur den Platz frei: ein Quadrat je
 * Kachel (`.pmenu__prev`) und den **scrollenden Kasten**, in den eine
 * Vorschauschicht ihre Leinwand hängen darf (`previewGrid.ts`,
 * `PagePreviewLayer`). Gezeichnet wird dahinter (`PagePreviews.ts`); kommt
 * niemand, bleibt im Quadrat die Ikone stehen, die dort ohnehin stünde.
 */

interface Page {
  title: string;
  entries: MenuEntry[];
  grid: boolean;
  /** Spalten im Raster, wenn die Seite eigene will (`MenuEntry.cols`). */
  cols?: number;
  /** Diese Seite nimmt den ganzen Bildschirm (`MenuEntry.full`). */
  full: boolean;
  /** Antippen **nimmt** die Zeile (Werkzeugregal); der Pfeil öffnet ihre Seite. */
  take: boolean;
  /** Das Suchfeld dieser Seite (`MenuEntry.find`). */
  find?: (query: string) => MenuEntry[];
  /** Hier fängt ein Katalog an (`MenuEntry.home`). */
  home: boolean;
  /**
   * **Diese Seite zeigt ein Ding und keine Liste** (`MenuEntry.detail`):
   * oben groß das Modell, darunter Schalter und Steckbrief.
   */
  detail?: MenuDetail;
  /** Id des Eintrags, zu dem die Seite gehört. */
  id: string;
}

/**
 * **Wie viele Zeilen auf einmal ins DOM kommen** — und wie viele beim
 * Scrollen dazu.
 *
 * Das Regal hatte dafür **Fächer**: Ein Ordner mit 1588 Modellen zerfiel in
 * Seiten zu je sechzig, weil 1588 echte Knöpfe kein Menü mehr sind. In der
 * Brille ist das die richtige Antwort und bleibt es (dort blättert ein Stick);
 * am Schirm wurde sie als das gemeldet, was sie dort ist: ein Klick, der
 * nichts erklärt. „Ich denke diese Gruppierung 1–60, 61–120 brauche ich
 * nicht, dafür kann dann einfach Lazy Loading die Elemente nachgeladen
 * werden beim Scrollen."
 *
 * Also stehen die Fächer am Schirm offen (`MenuEntry.flatten`), und die Liste
 * wächst stattdessen: sechzig Kacheln beim Aufschlagen, sechzig mehr, sobald
 * das Ende in Sicht kommt. Dieselbe Zahl wie die eines Fachs
 * (`core/kaykitIndex.KAYKIT_CHUNK`) — was dort eine Seite füllte, füllt hier
 * einen Schwung.
 */
const PAGE_WINDOW = 60;

/**
 * **Wie nah am Ende nachgeladen wird**, in Bildpunkten.
 *
 * Anderthalb Fensterhöhen wären zu viel Vorrat (dann lädt alles auf einmal),
 * null Punkte wären zu spät (dann sieht man das Ende, bevor der Nachschub
 * kommt). 600 Punkte sind gut eine Telefonhöhe: Was der Daumen in einem
 * Schwung schafft, steht schon da.
 */
const GROW_EDGE = 600;

/**
 * **Wie lange eine Bestätigung unter dem Steckbrief stehenbleibt**, in
 * Millisekunden — dieselben vier Sekunden wie im Netzpanel.
 */
const NOTE_MS = 4000;

export interface PageMenuOptions {
  title?: string;
  /** Der geteilte Weg durch den Baum — derselbe wie an den Handgelenken. */
  nav?: MenuNav;
  /** Woran das Menü hängt; ohne Angabe `document.body`. */
  host?: HTMLElement;
  /** Auf- oder zugegangen — für den Knopf, der es öffnet (`aria-expanded`). */
  onToggle?: (open: boolean) => void;
  /**
   * **Die Einträge der Wurzel sind Reiter** — wie oben in _Die Sims_: eine
   * Reihe Knöpfe über der Seite, und die Wurzel selbst schlägt niemand auf.
   * Gebraucht vom Inventar hinter `Tab` (`App.inventoryRoot`): Inventar,
   * Katalog, Welten, Einstellungen. Jeder Reiter merkt sich, wie tief man in
   * ihm stand.
   */
  tabs?: boolean;
  /** Was neben einer Seite steht (`PageAside`) — die Figur im Inventar. */
  aside?: PageAside;
}

/**
 * **Eine Spalte neben der Liste** — für genau eine Seite.
 *
 * Am Schreibtisch rechts neben den Kacheln, am Telefon als Streifen darüber
 * (`pageMenu.css`, `.pmenu--aside`). Was darin steht, weiß die Seite nicht;
 * sie sagt nur, wann es zu sehen ist (`show`) — die Figur im Inventar
 * zeichnet mit einem eigenen Renderer und soll das nur tun, solange man sie
 * sieht (`ui/PlayerCard.ts`).
 */
export interface PageAside {
  /** Die Id der Seite, neben der es steht. */
  readonly page: string;
  readonly element: HTMLElement;
  show(on: boolean): void;
  /**
   * **Steht es auch neben dieser Seite?** — die Figur bleibt auf den Seiten
   * unter _Aussehen_ stehen (`ui/outfitMenu.ts`). Ohne Angabe nur auf `page`.
   */
  covers?(page: string): boolean;
  /** Welche Seite gerade daneben offen ist — nach jedem Zeichnen, solange es zu sehen ist. */
  onPage?(page: string): void;
}

/** Wie groß eine Ikone gezeichnet wird, in Bildpunkten der Leinwand. */
const ICON_PX = 64;

export class PageMenu {
  /** Das Ganze: Hintergrund zum Wegtippen und das Blatt darauf. */
  readonly element: HTMLElement;
  private readonly sheet: HTMLElement;
  private readonly backButton: HTMLButtonElement;
  /** Der Knopf zurück an den Anfang des Katalogs (`MenuEntry.home`). */
  private readonly homeButton: HTMLButtonElement;
  /** Die Kopfzeile mit Titel und Brotkrumen (mit Reitern unter der Suche). */
  private readonly headEl: HTMLElement;
  private readonly titleEl: HTMLElement;
  /**
   * **Die Brotkrumen über dem Titel** — wo man steht, und jede Stufe davor ein
   * Sprung dorthin. Seit es Hauptbereiche gibt (`menuGroups.ts`), ist der Weg
   * zu jeder Einstellung eine Ebene länger, und ein Titel allein sagt nicht
   * mehr, unter welchem Bereich _Grafik_ gerade steht.
   */
  private readonly crumbsEl: HTMLElement;
  private readonly statusEl: HTMLElement;
  /**
   * Der scrollende Kasten. Er trägt zweierlei: die Liste mit den Zeilen und
   * die Leinwand der Vorschau — **beide** im selben Inhalt, damit sie beim
   * Scrollen zusammenbleiben (`PagePreviews.ts`).
   */
  private readonly stage: HTMLElement;
  private readonly list: HTMLElement;
  private readonly footEl: HTMLElement;
  /** Die Reiter über der Seite (`PageMenuOptions.tabs`) — sonst leer und versteckt. */
  private readonly tabsEl: HTMLElement;
  private readonly tabs: boolean;
  /** Wie tief man in jedem Reiter stand, nach seiner Id. */
  private readonly tabPaths = new Map<string, readonly string[]>();
  private readonly aside: PageAside | null;
  private asideShown = false;
  /** Die Leiste über der Liste: Suchfeld und die beiden Spaltenknöpfe. */
  private readonly toolsEl: HTMLElement;
  private readonly searchEl: HTMLInputElement;
  private readonly colsEl: HTMLElement;
  private readonly colsValue: HTMLElement;

  private readonly nav: MenuNav;
  private readonly offNav: () => void;
  private readonly onToggle: ((open: boolean) => void) | null;

  private root: MenuEntry[] = [];
  private rootTitle: string;
  private stack: Page[] = [];
  private open = false;
  /** Wie weit jede Seite geblättert war, in Bildpunkten, nach Id. */
  private readonly scrolls = new Map<string, number>();
  /**
   * Welche Seite mit welcher Suche gerade in der Liste steht — `''`, wenn sie
   * neu gebaut werden muss. Die Suche gehört mit hinein: Dieselbe Seite mit
   * einem anderen Suchbegriff ist eine andere Liste und fängt oben an.
   */
  private renderedPage = '';
  /** Wie viele Einträge der offenen Seite gerade im DOM stehen (`PAGE_WINDOW`). */
  private window = PAGE_WINDOW;
  /** Was im Suchfeld steht — leer heißt „nicht gesucht". */
  private query = '';
  /** Die Treffer dazu, einmal gerechnet und nicht bei jedem Neuzeichnen. */
  private results: MenuEntry[] | null = null;
  /**
   * Die gewählte Spaltenzahl, oder `null` — dann rechnet sie die Seite aus
   * ihrer Breite (`ui/pageCols.ts`).
   */
  private cols: number | null = readColumns();
  /** Wer die kleinen Modelle zeichnet, wenn es jemanden gibt. */
  private previews: PagePreviewLayer | null = null;
  /** Ob die Brille auf ist — dann zeichnet das Handgelenk und nicht die Seite. */
  private presenting = false;
  /**
   * Ob die Schicht gerade laufen soll. Sie wird nur bei **Änderung** gesagt:
   * `render` kommt zweimal die Sekunde, und eine Schleife, der man sechzigmal
   * sagt, dass sie laufen soll, wäre sechzig Meldungen für nichts.
   */
  private previewsOn = false;

  // --- die Detailseite ------------------------------------------------------
  /** Das Blatt der Detailseite: oben das Modell, darunter Schalter und Zahlen. */
  private readonly detailEl: HTMLElement;
  /** Der Kasten, in den die Vorschau ihre große Leinwand hängt. */
  private readonly viewEl: HTMLElement;
  private readonly optsEl: HTMLElement;
  private readonly floorButton: HTMLButtonElement;
  private readonly boundsButton: HTMLButtonElement;
  /** _Spieler anzeigen_: die Spielfigur daneben, zum Größenvergleich. */
  private readonly playerButton: HTMLButtonElement;
  /** Der Knopf, der auf einer Detailseite etwas **tut** (`MenuDetail.action`). */
  private readonly deedButton: HTMLButtonElement;
  /** Was er gerade tut — und woran man merkt, dass er neu beschriftet gehört. */
  private deed: MenuDetail['action'] | null = null;
  private deedLine = '';
  /**
   * **Anpassen eines Spielelements** (`MenuDetail.tweak`): verschieben,
   * Zellen umtippen, speichern, alles kopieren. `tweak` ist, was die Seite
   * anbietet, `tweakDraft` der Stand auf dem Schirm, `tweakSaved` der im
   * Speicher — weichen die beiden ab, ist etwas nicht gespeichert.
   */
  private tweak: DetailTweakSpec | null = null;
  private tweakDraft: DetailTweak | null = null;
  private tweakSaved: DetailTweak | null = null;
  private moveOn = false;
  private cellsOn = false;
  private readonly moveButton: HTMLButtonElement;
  private readonly moveEl: HTMLElement;
  private readonly moveValues: readonly [HTMLElement, HTMLElement];
  private readonly cellsButton: HTMLButtonElement;
  private readonly tweakEl: HTMLElement;
  private readonly tweakLine: HTMLElement;
  private readonly saveButton: HTMLButtonElement;
  private readonly resetButton: HTMLButtonElement;
  private readonly exportButton: HTMLButtonElement;
  private readonly clipsEl: HTMLElement;
  private readonly clipsSelect: HTMLSelectElement;
  private readonly factsEl: HTMLElement;
  /**
   * **Woran der Steckbrief merkt, dass er neu gebaut gehört** — und woran,
   * dass er nur neu beschriftet gehört.
   *
   * `factsShape` sind die Beschriftungen samt der Auskunft, welche Zeile
   * mitgenommen werden darf; `factsLine` sind die Werte. Warum zweierlei und
   * nicht eine Zeichenkette wie vorher: Diese Seite wird zweimal die Sekunde
   * gezeichnet, und die **Werte ändern sich dabei wirklich** — Maße, Dreiecke
   * und die Zahl der Bewegungen kommen erst, wenn das Modell geladen ist. Ein
   * Steckbrief, der dabei seine Kinder austauscht, wirft den Knopf *Kopieren*
   * weg, auf dem gerade der Finger liegt. Bleibt die **Form** gleich, werden
   * deshalb nur die Wörter ersetzt, und der Knopf bleibt stehen.
   */
  private factsShape = '';
  private factsLine = '';
  /** Die Kästchen mit den Werten, in derselben Reihenfolge wie die Zeilen. */
  private factValues: HTMLElement[] = [];
  /** Die kleine Zeile unter dem Steckbrief: „Adresse kopiert." */
  private readonly noteEl: HTMLElement;
  private noteText = '';
  private noteTimer = 0;
  /** Die offene große Vorschau — oder `null`, wenn keine Seite eine will. */
  private detailView: DetailView | null = null;
  /** Welches Modell darin steht; `''`, solange keines darin steht. */
  private detailId = '';
  /**
   * **Die Schalter überleben den Wechsel des Modells**, die Bewegung nicht:
   * Wer den Gitterboden anschaltet, will ihn beim nächsten Stück wiedersehen —
   * ein `Running_A`, das auf einem Fass weiterliefe, gibt es dagegen nicht.
   */
  private detailOpts: DetailOptions = { floor: false, bounds: false, clip: null };
  /** Was am Modell gemessen wurde, sobald es da ist. */
  private detailFacts: DetailFacts | null = null;
  /** Welche Bewegungen im Feld stehen — damit es nicht bei jedem Bild neu baut. */
  private detailClips = '';
  /**
   * **Wohin die Liste noch springen will**, in Bildpunkten — oder `null`.
   *
   * Eine Seite wird mit sechzig Kacheln aufgeschlagen und wächst erst beim
   * Scrollen. Wer das Regal bei Punkt 1700 zumacht und wieder aufmacht, bekäme
   * deshalb eine Liste, die nur 900 Punkte hoch ist: `scrollTop` landet am
   * Ende, und die gemerkte Stelle ist weg. Also bleibt sie hier stehen, bis
   * genug Kacheln da sind, um wirklich dorthin zu kommen (`fill`).
   */
  private want: number | null = null;
  /**
   * **Die Zeile, aus der man zuletzt zurückkam** (`padStart`) — gleich, auf
   * welchem Weg: `B`, Rücktaste, `Esc`, der Pfeil im Kopf, eine Brotkrume,
   * das Haus oder `B`/`Y` in der Brille. Gerechnet wird sie deshalb nicht an
   * jedem Knopf, sondern einmal aus dem Weg selbst (`applyNav`): Wird er
   * kürzer, war die erste weggefallene Stufe die Zeile, auf der man stand.
   */
  private left = '';
  /** Der Weg beim letzten `applyNav` — woran `left` gemessen wird. */
  private lastPath: readonly string[] = [];

  constructor(options: PageMenuOptions = {}) {
    this.rootTitle = options.title ?? 'Menü';
    this.nav = options.nav ?? new MenuNav();
    this.onToggle = options.onToggle ?? null;
    this.tabs = options.tabs ?? false;
    this.aside = options.aside ?? null;

    this.element = el('div', 'pmenu');
    if (this.tabs) this.element.classList.add('pmenu--tabs');
    this.element.hidden = true;
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-modal', 'true');
    this.element.setAttribute('aria-label', this.rootTitle);

    this.sheet = el('div', 'pmenu__sheet');
    this.sheet.tabIndex = -1;
    // **Die Ränder des Geräts bleiben frei** (`ui/safeArea.ts`). Unten der
    // Strich zum Wegschieben, seitlich die Kerbe im Querformat — der obere
    // Rand kommt erst dazu, wenn die Seite wirklich bis dorthin reicht
    // (`render`, `MenuEntry.full`): Ein Blatt, das von unten aufzieht,
    // berührt ihn gar nicht.
    keepSafe(this.sheet, 'bottom', 'left', 'right');

    const head = el('header', 'pmenu__head');
    this.headEl = head;
    this.backButton = iconButton('pmenu__nav pmenu__back', 'Zurück', 'M14 6l-6 6 6 6');
    this.backButton.hidden = true;
    this.titleEl = el('h2', 'pmenu__title');
    this.crumbsEl = el('nav', 'pmenu__crumbs');
    this.crumbsEl.setAttribute('aria-label', 'Weg durchs Menü');
    this.crumbsEl.hidden = true;
    const heading = el('div', 'pmenu__heading');
    heading.append(this.crumbsEl, this.titleEl);
    // Das Haus: zurück an den Anfang des Katalogs, ohne achtmal *Zurück*.
    this.homeButton = iconButton(
      'pmenu__nav pmenu__home',
      'Von vorne durch den Katalog',
      'M4 10.5l8-6 8 6V20H4z',
    );
    this.homeButton.hidden = true;
    const close = iconButton('pmenu__nav pmenu__close', 'Schließen', 'M6 6l12 12M18 6L6 18');
    head.append(this.backButton, heading, this.homeButton, close);

    // **Die Leiste über der Liste.** Sie steht im Kopf und nicht in der Liste,
    // und das ist der ganze Grund, warum das Tippen im Suchfeld nicht abreißt:
    // Ein Neuzeichnen tauscht die Kinder der Liste aus — ein Feld darin hätte
    // bei jedem Buchstaben den Fokus verloren.
    this.toolsEl = el('div', 'pmenu__tools');
    this.searchEl = document.createElement('input');
    this.searchEl.className = 'pmenu__search';
    this.searchEl.type = 'search';
    this.searchEl.placeholder = 'Suchen …';
    this.searchEl.setAttribute('aria-label', 'Im Katalog suchen');
    this.colsEl = el('div', 'pmenu__cols');
    const fewer = iconButton('pmenu__step', 'Weniger Spalten', 'M6 12h12');
    const more = iconButton('pmenu__step', 'Mehr Spalten', 'M12 6v12M6 12h12');
    this.colsValue = el('span', 'pmenu__colsnum');
    this.colsValue.title = 'Spalten';
    this.colsEl.append(fewer, this.colsValue, more);
    this.toolsEl.append(this.searchEl, this.colsEl);

    this.statusEl = el('p', 'pmenu__status');
    this.statusEl.setAttribute('aria-live', 'polite');
    this.list = el('div', 'pmenu__list');
    // Gescrollt wird der Kasten, nicht die Liste: Die Leinwand der Vorschau
    // liegt als zweites Kind darin und wird damit von derselben Hand bewegt
    // wie die Kacheln (`PagePreviews.ts`). Ein Neubau der Liste tauscht nur
    // deren Kinder aus und lässt die Leinwand deshalb stehen.
    this.stage = el('div', 'pmenu__stage');

    // **Die Detailseite liegt im selben scrollenden Kasten wie die Liste** —
    // und genau deshalb kann man an ihr herunterscrollen, während oben das
    // Modell stehen bleibt: „seitlich sollte etwas Platz sein, da ich
    // runterscrollen möchte in dem Menü, um darunter weitere Infos zu sehen."
    this.viewEl = el('div', 'pmenu__view');
    this.optsEl = el('div', 'pmenu__opts');
    this.floorButton = switchRow('Gitterboden', 'Ein Raster auf Höhe des tiefsten Punktes');
    this.boundsButton = switchRow('Bounding Box', 'Die Hülle, mit der das Ding anfasst');
    // Gewünscht: _„eine checkbox für Spieler anzeigen, dass ich einen Spieler
    // darin sehen kann"_ — wie groß ist das Ding neben dem, der davorsteht?
    this.playerButton = switchRow(
      'Spieler anzeigen',
      'Die Spielfigur daneben, so groß wie in der Welt',
    );
    // Ohne Wippe: Er ist keine Einstellung, sondern eine Tat, und er steht nur
    // da, wenn die Seite eine anzubieten hat.
    this.deedButton = el('button', 'pmenu__row pmenu__deed');
    this.deedButton.type = 'button';
    this.deedButton.hidden = true;
    this.deedButton.append(el('span', 'pmenu__text'));
    // **Anpassen** — nur auf der Seite eines Spielelements (`MenuDetail.tweak`).
    this.moveButton = switchRow('Modell verschieben', 'Je Druck eine halbe Kachel (0,5 m)');
    this.moveEl = el('div', 'pmenu__move');
    const axis = (label: string, index: 0 | 1): HTMLElement => {
      const line = el('div', 'pmenu__axis');
      const less = iconButton('pmenu__step', `${label} −`, 'M6 12h12');
      const more = iconButton('pmenu__step', `${label} +`, 'M12 6v12M6 12h12');
      less.dataset['axis'] = String(index);
      less.dataset['dir'] = '-1';
      more.dataset['axis'] = String(index);
      more.dataset['dir'] = '1';
      const value = el('span', 'pmenu__axisval');
      line.append(el('span', 'pmenu__axislabel', label), less, value, more);
      return line;
    };
    const lineX = axis('X (West/Ost)', 0);
    const lineZ = axis('Y (hinten/vorn)', 1);
    this.moveValues = [
      lineX.querySelector<HTMLElement>('.pmenu__axisval')!,
      lineZ.querySelector<HTMLElement>('.pmenu__axisval')!,
    ];
    this.moveEl.append(lineX, lineZ);
    this.cellsButton = switchRow(
      'Belegte Zellen anpassen',
      'Von oben, das Ding als Geist — Zellen antippen zum Sperren',
    );
    this.tweakEl = el('div', 'pmenu__tweak');
    this.tweakLine = el('span', 'pmenu__tweakline');
    this.saveButton = el('button', 'pmenu__btn pmenu__btn--main', 'Speichern');
    this.saveButton.type = 'button';
    this.resetButton = el('button', 'pmenu__btn', 'Zurücksetzen');
    this.resetButton.type = 'button';
    this.resetButton.title = 'Wie im Katalog — gespeichert wird erst mit Speichern';
    this.tweakEl.append(this.tweakLine, this.resetButton, this.saveButton);
    this.exportButton = el('button', 'pmenu__row pmenu__deed pmenu__export');
    this.exportButton.type = 'button';
    this.exportButton.append(el('span', 'pmenu__text'));
    this.optsEl.append(
      this.floorButton,
      this.boundsButton,
      this.playerButton,
      this.moveButton,
      this.moveEl,
      this.cellsButton,
      this.tweakEl,
      this.deedButton,
    );
    this.clipsEl = el('div', 'pmenu__clips');
    const clipsLabel = el('label', 'pmenu__cliplabel', 'Animation');
    this.clipsSelect = document.createElement('select');
    this.clipsSelect.className = 'pmenu__clipsel';
    clipsLabel.htmlFor = 'pmenu-clip';
    this.clipsSelect.id = 'pmenu-clip';
    this.clipsEl.append(clipsLabel, this.clipsSelect);
    this.factsEl = el('dl', 'pmenu__facts');
    // **Die Rückmeldung steht unter dem Steckbrief und nicht im Kopf.** Der
    // Kopf hat schon eine Zeile (`setStatus`), aber die gehört der Welt
    // draußen — wer sie hier überschriebe, löschte, was eine Welt gerade
    // gemeldet hat. Und sie steht **nicht** im Steckbrief selbst: Der wird
    // neu geschrieben, sobald das Modell seine Maße nachreicht, und eine
    // Meldung darin wäre nach einer Sekunde weg.
    this.noteEl = el('p', 'pmenu__note');
    this.noteEl.setAttribute('aria-live', 'polite');
    const about = el('div', 'pmenu__about');
    about.append(this.optsEl, this.clipsEl, this.factsEl, this.exportButton, this.noteEl);
    this.detailEl = el('div', 'pmenu__detail');
    this.detailEl.hidden = true;
    this.detailEl.append(this.viewEl, about);

    this.stage.append(this.list, this.detailEl);
    this.footEl = el('p', 'pmenu__foot');

    // **Die Reiter** stehen unter dem Kopf und über allem anderen — dort, wo
    // man sie in _Die Sims_ sucht. Ohne `tabs` bleibt die Leiste leer und weg.
    this.tabsEl = el('nav', 'pmenu__tabs');
    this.tabsEl.setAttribute('role', 'tablist');
    this.tabsEl.hidden = !this.tabs;
    this.tabsEl.addEventListener('click', (event) => {
      const tab = (event.target as HTMLElement).closest<HTMLElement>('[data-tab]');
      if (tab) this.showTab(tab.dataset['tab']!);
    });

    // Liste und Seitenspalte nebeneinander (am Telefon untereinander).
    const body = el('div', 'pmenu__body');
    body.append(this.stage);
    if (this.aside) {
      this.aside.element.classList.add('pmenu__aside');
      this.aside.element.hidden = true;
      body.append(this.aside.element);
    }

    if (this.tabs) {
      // **Mit Reitern stehen die Reiter ganz oben**, Schließen rechts daneben;
      // darunter *Zurück* und rechts davon die Suche. Über den Reitern war der
      // Pfeil nicht zu finden: „bin aber blind, da der zurück pfeil über den
      // tabs ist." Titel und Brotkrumen rutschen in eine eigene Zeile darunter.
      const top = el('div', 'pmenu__top');
      top.append(this.tabsEl, close);
      this.toolsEl.prepend(this.backButton);
      this.toolsEl.append(this.homeButton);
      this.sheet.append(top, this.toolsEl, head, this.statusEl, body, this.footEl);
    } else {
      this.sheet.append(head, this.tabsEl, this.toolsEl, this.statusEl, body, this.footEl);
    }
    this.element.append(this.sheet);
    (options.host ?? document.body).append(this.element);

    // Neben das Blatt tippen macht es zu — auf dem Telefon der einzige Weg,
    // der ohne Zielen geht.
    this.element.addEventListener('click', (event) => {
      if (event.target === this.element) this.toggle(false);
    });
    close.addEventListener('click', () => this.toggle(false));
    this.backButton.addEventListener('click', () => {
      this.keepScroll();
      this.nav.pop();
    });
    this.homeButton.addEventListener('click', () => this.goHome());
    this.crumbsEl.addEventListener('click', (event) => {
      const step = (event.target as HTMLElement).closest<HTMLElement>('[data-depth]');
      if (!step) return;
      this.keepScroll();
      // `stack[depth]` gehört zu `nav.path[depth - 1]` — wie bei `goHome`.
      this.nav.goTo(this.nav.path.slice(0, Number(step.dataset['depth'])));
    });
    this.list.addEventListener('click', (event) => this.onListClick(event));
    // Ein Zuhörer am Steckbrief und keiner je Knopf: Die Zeilen werden neu
    // gebaut, sobald eine andere Sache davorsteht, und ein Zuhörer, der mit
    // seinem Knopf weggeworfen wird, ist einer, den man nicht vergessen darf
    // wegzunehmen. Dieselbe Bauweise wie bei der Liste darüber.
    this.factsEl.addEventListener('click', (event) => this.onFactsClick(event));
    this.searchEl.addEventListener('input', () => this.onSearch());
    fewer.addEventListener('click', () => this.stepCols(-1));
    more.addEventListener('click', () => this.stepCols(1));
    this.floorButton.addEventListener('click', () =>
      this.stepDetail({ floor: !this.detailOpts.floor }),
    );
    this.boundsButton.addEventListener('click', () =>
      this.stepDetail({ bounds: !this.detailOpts.bounds }),
    );
    this.playerButton.addEventListener('click', () =>
      this.stepDetail({ player: !this.detailOpts.player }),
    );
    this.clipsSelect.addEventListener('change', () =>
      this.stepDetail({ clip: this.clipsSelect.value || null }),
    );
    this.moveButton.addEventListener('click', () => {
      this.moveOn = !this.moveOn;
      this.pushTweak();
    });
    this.moveEl.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-axis]');
      if (button) this.nudge(Number(button.dataset['axis']), Number(button.dataset['dir']));
    });
    this.cellsButton.addEventListener('click', () => {
      this.cellsOn = !this.cellsOn;
      this.pushTweak();
    });
    this.saveButton.addEventListener('click', () => this.saveTweak());
    this.resetButton.addEventListener('click', () => {
      if (!this.tweak) return;
      this.tweakDraft = this.tweak.preset();
      this.pushTweak();
    });
    this.exportButton.addEventListener('click', () => void this.exportTweaks());
    this.deedButton.addEventListener('click', () => {
      this.deed?.run();
      // Die Tat wirkt außerhalb dieser Seite (das Aussehen, der Avatar, das
      // Netz); hier bleibt nur, den Steckbrief neu zu schreiben — der Knopf
      // kann danach anders heißen.
      if (this.open) this.render();
    });
    // **Nachgeladen wird beim Scrollen** (`PAGE_WINDOW`). Das `scroll`-Ereignis
    // ist dafür gut genug: Es kommt zwar aus dem Hauptstrang und damit zu spät
    // für eine Leinwand (siehe `PagePreviews.ts`), aber nicht zu spät für
    // sechzig Knöpfe, die 600 Punkte vor dem Ende bestellt werden.
    this.stage.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);

    this.offNav = this.nav.onChange(() => this.applyNav());
    this.applyNav();
  }

  get isOpen(): boolean {
    return this.open;
  }

  /**
   * Einen Baum aufs Blatt legen, **ohne den Spieler zu bewegen** — dieselbe
   * Zusage wie am Handgelenk: Der Baum wird bei jeder Änderung neu gebaut, und
   * die Seite, auf der man war, wird danach wieder aufgeschlagen (`menuNav`).
   */
  setRoot(entries: MenuEntry[], title = this.rootTitle): void {
    this.root = entries;
    this.rootTitle = title;
    this.nav.prune(entries);
    this.applyNav();
  }

  /** Ein Untermenü nach seiner Id aufschlagen — wo es auch steht — und das Menü dazu öffnen. */
  openSubmenu(id: string): void {
    // Die Seite kann eine Ebene tiefer liegen — unter ihrem Hauptbereich
    // (`ui/menuGroups.ts`). Wer sie aufruft, nennt nur ihre Id.
    const path = findMenuPath(this.root, id);
    if (!path) return;
    this.keepScroll();
    this.nav.goTo(path);
    this.toggle(true);
  }

  /**
   * **Einen Reiter aufschlagen und das Menü dazu öffnen** — dort, wo man in
   * ihm zuletzt stand (`PageMenuOptions.tabs`).
   */
  openTab(id: string): void {
    this.showTab(id);
    this.toggle(true);
  }

  /**
   * **Einen Reiter weiter oder zurück** — LB/RB am Pad (`ui/padNav.ts`),
   * am Ende wieder vorn. `false`, wenn es keine Reiter gibt.
   */
  stepTab(step: -1 | 1): boolean {
    if (!this.tabs || !this.open || this.root.length === 0) return false;
    const at = this.root.findIndex((entry) => entry.id === this.nav.path[0]);
    const next = this.root[(at + step + this.root.length) % this.root.length]!;
    this.showTab(next.id);
    return true;
  }

  setStatus(status: string): void {
    this.statusEl.textContent = status;
  }

  /**
   * Wer die kleinen Modelle zeichnet — oder `null`, dann zeichnet sie niemand.
   *
   * Gesetzt wird das von `WristMenus`, wenn eine Welt ihre Modellfabrik
   * abgibt, und beim Verlassen wieder weggenommen. Die Seite selbst weiß
   * nichts über three.js und will es auch nicht wissen: Sie reicht ihren
   * Rahmen und ihre Liste hinüber und sagt Bescheid, wenn sie auf- oder
   * zugeht.
   */
  setPreviews(layer: PagePreviewLayer | null): void {
    if (layer === this.previews) return;
    this.closeDetail();
    this.previews?.dispose();
    this.previews = layer;
    this.previewsOn = false;
    if (!layer) {
      // Ohne Vorschau steht in den Quadraten wieder die Ikone — aber nur,
      // wenn gerade jemand hinsieht.
      if (this.open) this.render();
      return;
    }
    layer.mount(this.stage, this.onPreviewReady);
    layer.setPresenting(this.presenting);
    if (!this.open) return;
    // Erst die Kacheln, dann die Schleife: Der Beobachter bekommt sonst eine
    // leere Liste und lädt nichts — `render` sagt es am Ende selbst.
    this.render();
  }

  /**
   * Brille auf oder ab. In der Brille ist die Seite ohnehin zu (`WristMenus`);
   * gesagt wird es der Vorschau trotzdem, denn eine zweite Zeichenschleife
   * neben einer XR-Sitzung ist genau das, was dort fehlt.
   */
  setPresenting(on: boolean): void {
    this.presenting = on;
    this.previews?.setPresenting(on);
  }

  toggle(force?: boolean): void {
    const next = force ?? !this.open;
    if (next === this.open) return;
    // **Zuerst merken, dann verstecken.** Ein `hidden` ist für den Browser ein
    // `display: none`, und ein Kasten, der nicht angezeigt wird, hat keine
    // Blätterstellung mehr: `scrollTop` steht danach auf null. Hier stand das
    // Merken hinter dem Verstecken und merkte sich deshalb jedes Mal die Null
    // — wer im Katalog weit unten war und das Menü zumachte, fing beim
    // nächsten Öffnen wieder ganz oben an. In jsdom fällt das nicht auf, weil
    // `scrollTop` dort eine gewöhnliche Zahl ist; im Browser sofort.
    if (!next) this.keepScroll();
    this.open = next;
    this.element.hidden = !next;
    if (!next) this.showAside(false);
    if (next) {
      this.window = PAGE_WINDOW;
      this.render();
      this.sheet.focus({ preventScroll: true });
    } else {
      // Eine zugeklappte Seite zeichnet nichts — auch keine große Vorschau.
      // Sie entsteht beim nächsten Aufschlagen wieder, und bis dahin liegt
      // kein zweiter WebGL-Kontext herum.
      this.closeDetail();
      this.syncPreviews();
      // Eine versteckte Liste vergisst ihre Blätterstellung; beim nächsten
      // Öffnen wird sie neu gebaut und dort aufgeschlagen, wo sie verlassen wurde.
      this.renderedPage = '';
    }
    this.onToggle?.(next);
  }

  /**
   * **Eine Seite zurück** — `B` am Pad und die Rücktaste (`ui/padNav.ts`),
   * dieselbe Treppe wie `Esc` (`back`) und der Pfeil im Kopf: erst ein
   * Suchbegriff, dann eine Seite nach der anderen. `false`, wenn man schon
   * ganz oben steht und nichts gesucht wird: Dann macht der Aufrufer zu,
   * statt dass nichts passiert.
   */
  goBack(): boolean {
    if (!this.open || (this.query === '' && this.stack.length <= this.floor)) return false;
    this.back();
    return true;
  }

  /**
   * **Welche Seite gerade aufgeschlagen ist** — für den Fahrer am Pad
   * (`PadScope.page`): Wechselt sie, fängt der Fokus neu an (`padStart`)
   * und sucht nicht nach einem Knopf der alten Seite, der zufällig gleich
   * heißt.
   */
  get pageId(): string {
    return this.nav.path.join('/');
  }

  /**
   * **Wo der Fokus am Pad anfängt** — auf der Zeile, aus der man gerade
   * zurückkam, sonst auf der gewählten, sonst auf der ersten. Nicht im Kopf:
   * _Schließen_ ist der erste Knopf im DOM, aber niemand öffnet ein Menü, um
   * es zu schließen.
   */
  padStart(): HTMLElement | null {
    const rows = [...this.list.querySelectorAll<HTMLElement>('[data-index]')];
    const back = this.left ? rows.find((node) => node.dataset['id'] === this.left) : undefined;
    return (
      back ??
      rows.find((node) => node.classList.contains('is-selected')) ??
      rows[0] ??
      (this.detailEl.hidden ? null : this.optsEl.querySelector<HTMLElement>('button'))
    );
  }

  /** Das Blatt, in dem die Knöpfe stehen — für den Fokus am Pad. */
  get sheetElement(): HTMLElement {
    return this.sheet;
  }

  /** Die offene Seite neu zeichnen — eine Zeile, deren Text sich änderte. */
  refresh(): void {
    if (this.open) this.render();
  }

  dispose(): void {
    this.offNav();
    this.showAside(false);
    this.closeDetail();
    // Auch dann, wenn gar kein Steckbrief offen war: Ein Zeitgeber, der ein
    // abgeräumtes Menü anspricht, ist der Fehler, den niemand mehr zuordnet.
    window.clearTimeout(this.noteTimer);
    this.previews?.dispose();
    this.previews = null;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('resize', this.onResize);
    this.element.remove();
  }

  // --- Seiten -------------------------------------------------------------

  private get page(): Page {
    return this.stack[this.stack.length - 1]!;
  }

  /**
   * **Wie viele Seiten der Stapel mindestens hat** — darunter geht kein
   * _Zurück_. Mit Reitern ist das die Seite des Reiters: Die Wurzel ist nur
   * die Reihe darüber und keine Seite, auf die man zurückkäme.
   */
  private get floor(): number {
    return this.tabs ? 2 : 1;
  }

  /** Zu einem Reiter wechseln — und dort weitermachen, wo man ihn verließ. */
  private showTab(id: string): void {
    if (!this.root.some((entry) => entry.id === id)) return;
    const path = this.nav.path;
    if (path[0] === id && this.open) {
      // Ein Druck auf den Reiter, in dem man schon steht: an seinen Anfang.
      if (path.length > 1) {
        this.keepScroll();
        this.nav.goTo([id]);
      }
      return;
    }
    if (path.length > 0) this.tabPaths.set(path[0]!, path);
    this.keepScroll();
    this.nav.goTo(this.tabPaths.get(id) ?? [id]);
  }

  /** Die Reihe der Reiter — neu gebaut nur, wenn sich daran etwas ändert. */
  private paintTabs(): void {
    if (!this.tabs) return;
    const current = this.nav.path[0] ?? '';
    const key = this.root.map((entry) => `${entry.id}:${entry.label}`).join('|') + `#${current}`;
    if (this.tabsEl.dataset['key'] === key) return;
    this.tabsEl.dataset['key'] = key;
    this.tabsEl.replaceChildren(
      ...this.root.map((entry, at) => {
        const tab = el('button', 'pmenu__tab');
        tab.type = 'button';
        tab.dataset['tab'] = entry.id;
        tab.setAttribute('role', 'tab');
        const on = entry.id === current;
        tab.setAttribute('aria-selected', on ? 'true' : 'false');
        if (on) tab.classList.add('is-on');
        tab.title = `${entry.label} · ${at + 1}`;
        tab.style.setProperty('--accent', cssColor(entry.accent));
        tab.append(icon(entry, cssColor(entry.accent)), el('span', '', entry.label));
        return tab;
      }),
    );
    // Am Telefon passen nicht alle Reiter nebeneinander: der offene rollt ins Bild.
    this.tabsEl.querySelector<HTMLElement>('.is-on')?.scrollIntoView?.({
      block: 'nearest',
      inline: 'nearest',
    });
  }

  /** Die Seitenspalte zeigen oder wegnehmen — gesagt wird es nur bei Änderung. */
  private showAside(on: boolean): void {
    const aside = this.aside;
    if (!aside || on === this.asideShown) return;
    this.asideShown = on;
    aside.element.hidden = !on;
    this.element.classList.toggle('pmenu--aside', on);
    aside.show(on);
  }

  /** Der Weg aus dem geteilten Merkzettel, als Stapel von Seiten. */
  private applyNav(): void {
    const before = this.stack.length > 0 ? this.page.id : '';
    const path = this.nav.path;
    const prev = this.lastPath;
    const same = path.length === prev.length && path.every((id, at) => prev[at] === id);
    if (!same) {
      const up = path.length < prev.length && path.every((id, at) => prev[at] === id);
      this.left = up ? prev[path.length]! : '';
      this.lastPath = [...path];
    }
    this.stack = [
      {
        title: this.rootTitle,
        entries: spread(this.root),
        grid: false,
        full: false,
        take: false,
        home: false,
        id: 'root',
      },
    ];
    let level: MenuEntry[] = this.root;
    for (const id of this.nav.path) {
      const entry = findStep(this.root, level, id);
      if (!entry) break;
      // **Eine Detailseite hat keine Kinder** und ist trotzdem eine Seite
      // (`MenuEntry.detail`): Sie zeigt ein Modell, also endet der Weg auf ihr
      // — dieselbe Regel wie in `menuNav.walkPath`.
      if (!entry.children) {
        if (entry.detail) this.stack.push(pageOf(entry));
        break;
      }
      this.stack.push(pageOf(entry));
      level = entry.children;
    }
    // **Mit Reitern wird die Wurzel nie aufgeschlagen** — wer dort ankäme
    // (beim ersten Öffnen, nach dem Wegfall eines Reiters), steht im ersten.
    if (this.tabs && this.stack.length < 2 && this.root.length > 0) {
      const first = this.root[0]!.id;
      this.nav.goTo(this.tabPaths.get(first) ?? [first]);
      return;
    }
    // **Eine andere Seite fängt ohne Suchbegriff an.** Ein Feld, das beim
    // Hineingehen stehen bliebe, filterte die neue Seite nach dem, was jemand
    // auf der alten gesucht hat — und niemand sähe, warum sie fast leer ist.
    if (this.page.id !== before) this.clearSearch();
    // Dieselbe Seite mit neuem Baum: die Treffer neu — ein Schalter darunter
    // zeigte sonst noch, wie er vor dem Tipp stand.
    else if (this.query && this.page.find) this.results = this.page.find(this.query);
    if (this.open) this.render();
  }

  /**
   * **Wie tief im Stapel der Anfang des Katalogs liegt** — oder `-1`, wenn es
   * keinen gibt oder man schon auf ihm steht.
   *
   * Gesucht wird von unten: Läge je ein Katalog in einem Katalog, führte der
   * Knopf an den **nächstgelegenen** Anfang und nicht an den äußersten.
   */
  private homeDepth(): number {
    for (let depth = this.stack.length - 2; depth > 0; depth--) {
      if (this.stack[depth]!.home) return depth;
    }
    return -1;
  }

  /** Zurück an den Anfang des Katalogs — ein Sprung, kein Stapel Rückschritte. */
  private goHome(): void {
    const depth = this.homeDepth();
    if (depth < 0) return;
    this.keepScroll();
    // `stack[depth]` gehört zu `nav.path[depth - 1]`: Die Wurzel steht im
    // Stapel, aber nicht im Weg.
    this.nav.goTo(this.nav.path.slice(0, depth));
  }

  /**
   * Die Stufen **vor** der aktuellen Seite, jede ein Knopf. Nur neu gebaut,
   * wenn sich der Weg geändert hat — `render` läuft zweimal die Sekunde.
   */
  private paintCrumbs(): void {
    // Mit Reitern fängt der Weg beim Reiter an: Die Wurzel steht als Reihe
    // darüber und braucht keine Brotkrume.
    const base = this.floor - 1;
    const steps = this.stack.slice(base, -1).map((page) => page.title);
    const key = steps.join('\u0000');
    if (this.crumbsEl.dataset['key'] === key) return;
    this.crumbsEl.dataset['key'] = key;
    this.crumbsEl.hidden = steps.length === 0;
    this.crumbsEl.replaceChildren(
      ...steps.flatMap((label, at) => {
        const step = el('button', 'pmenu__crumb');
        step.type = 'button';
        step.dataset['depth'] = String(base + at);
        step.textContent = label;
        return at === 0 ? [step] : [el('span', 'pmenu__crumbsep'), step];
      }),
    );
  }

  /** Seite **und** Suchbegriff: Dieselbe Seite gefiltert ist eine andere Liste. */
  private get pageKey(): string {
    return `${this.page.id}|${this.query}`;
  }

  private keepScroll(): void {
    this.scrolls.set(this.pageKey, this.stage.scrollTop);
  }

  /** Die Einträge, die gerade gelten — die der Seite, oder die der Suche. */
  private get source(): MenuEntry[] {
    return this.results ?? this.page.entries;
  }

  private clearSearch(): void {
    this.query = '';
    this.results = null;
    this.window = PAGE_WINDOW;
    if (this.searchEl.value !== '') this.searchEl.value = '';
  }

  /**
   * Die Seite zeichnen — **und dabei stehen lassen, was schon steht.**
   *
   * Der Baum wird ständig neu gebaut: die Bildraten-Zeile zweimal die Sekunde,
   * jede Zeile bei jedem Druck, die Peer-Liste bei jedem Kommen und Gehen.
   * Am Handgelenk ist das ein neues Bild auf derselben Leinwand; im DOM wäre
   * es ein neuer Knopf unter dem Finger — und ein Tipp, der auf dem alten
   * anfängt und auf dem neuen endet, ist kein Klick. Also werden die frischen
   * Zeilen mit den stehenden verglichen, und nur eine, die sich wirklich
   * geändert hat, wird getauscht. Die Blätterstellung bleibt dabei, wo sie
   * ist; nur eine **andere** Seite fängt dort an, wo sie verlassen wurde.
   */
  private render(): void {
    const page = this.page;
    this.titleEl.textContent = page.title;
    this.backButton.hidden = this.stack.length <= this.floor;
    this.paintTabs();
    const aside = this.aside;
    this.showAside(
      this.open && aside !== null && (page.id === aside.page || (aside.covers?.(page.id) ?? false)),
    );
    if (this.asideShown) aside?.onPage?.(page.id);
    this.paintCrumbs();
    // Der Weg an den Anfang des Katalogs steht nur da, wenn er auch woanders
    // hinführt als *Zurück* (`MenuEntry.home`).
    this.homeButton.hidden = this.homeDepth() < 0;
    // **Der Katalog nimmt den ganzen Schirm** (`MenuEntry.full`) — und damit
    // auch die Knöpfe darunter. Genau so war es gewünscht: „die Höhe des
    // Katalogmenüs kann meinetwegen auch gerne die gesamte Höhe des
    // Bildschirm einnehmen, sodass dann der Menü-Button verdeckt ist."
    // **Das Inventar ist immer Vollbild** (`tabs`), welcher Reiter auch offen
    // ist: „so ein Menü im PC/Handy kann ruhig […] immer im Vollbildmodus
    // sein" — wie der Katalog.
    const full = page.full || this.tabs;
    this.element.classList.toggle('pmenu--full', full);
    // **Eine Detailseite zeigt ein Ding und keine Liste.** Beide liegen im
    // selben scrollenden Kasten; hier wird nur entschieden, welche dasteht.
    const detail = page.detail ?? null;
    this.list.hidden = detail !== null;
    this.detailEl.hidden = detail === null;
    if (detail) this.showDetail(detail);
    else this.closeDetail();
    // Erst hier steht der Kopf unter der Uhr: Gemeldet war ein Katalog, in
    // dessen Titel „20:36" stand und in dessen Schließen-Knopf die Batterie.
    setSafeEdge(this.sheet, 'top', full);
    this.list.classList.toggle('pmenu__list--grid', page.grid);
    // Karten mit Bild (`MenuEntry.image`) wollen breitere Spalten als Ikonen.
    this.list.classList.toggle(
      'pmenu__list--cards',
      page.grid && this.source.some((entry) => entry.image),
    );
    const columns = page.full && page.grid ? this.columns() : (page.cols ?? 3);
    // Die Spaltenzahl steht als CSS-Variable am Raster und nicht als Klasse:
    // So kann eine Seite zwei Spalten wollen (das Asset-Regal), ohne dass für
    // jede denkbare Zahl eine Regel im Stylesheet steht.
    this.list.style.setProperty('--pmenu-cols', String(columns));
    this.searchEl.hidden = !page.find;
    this.colsEl.hidden = !(page.full && page.grid);
    this.toolsEl.hidden =
      this.searchEl.hidden &&
      this.colsEl.hidden &&
      (!this.tabs || (this.backButton.hidden && this.homeButton.hidden));
    // Mit Reitern sagt der Reiter schon, wo man steht — Titel und Brotkrumen
    // braucht es erst eine Stufe tiefer.
    if (this.tabs) this.headEl.hidden = this.stack.length <= this.floor;
    this.colsValue.textContent = String(columns);
    const source = this.source;
    const shown = source.slice(0, this.window);
    this.footEl.textContent = this.footLine(page, source.length, shown.length);
    const ready = this.hasModel;
    const fresh = shown.map((entry, index) =>
      page.grid ? tile(entry, index, ready) : row(entry, index, page.take, ready),
    );
    const standing = [...this.list.children] as HTMLElement[];
    const key = this.pageKey;
    const sameRows =
      this.renderedPage === key &&
      standing.length === fresh.length &&
      standing.every((node, index) => node.dataset['key'] === fresh[index]!.dataset['key']);
    if (sameRows) {
      standing.forEach((node, index) => {
        const next = fresh[index]!;
        if (node.outerHTML !== next.outerHTML) node.replaceWith(next);
      });
    } else {
      // **Nur eine andere Liste fängt oben an.** Ein Nachschub beim Scrollen
      // hängt sechzig Kacheln unten an, und die Blätterstellung dabei
      // zurückzusetzen hieße, dem Daumen die Liste unter dem Finger
      // wegzuziehen.
      const turned = this.renderedPage !== key;
      this.list.replaceChildren(...fresh);
      if (turned) {
        const back = this.scrolls.get(key) ?? 0;
        this.stage.scrollTop = back;
        // Nachlegen, bis die Stelle wirklich erreichbar ist — und nicht
        // scheinbar, weil die Liste kürzer ist als die Erinnerung.
        this.want = back > 0 ? back : null;
      }
    }
    this.renderedPage = key;
    // Zum Schluss, und immer: Welche Quadrate jetzt dastehen, weiß nur, wer
    // gerade neu gezeichnet hat.
    this.previews?.observe(key, [...this.list.querySelectorAll<HTMLElement>('[data-preview]')]);
    this.syncPreviews();
    this.fill();
  }

  // --- die Detailseite ------------------------------------------------------

  /**
   * **Die Schleife der Kacheln läuft nicht neben der großen Vorschau.**
   *
   * Zwei Zeichenschleifen auf zwei WebGL-Kontexten für dieselbe Seite wären
   * einer zu viel — auf einem Telefon ist ein Kontext knapp, und die Kacheln
   * stehen währenddessen ohnehin nicht im Bild. Dieselbe Disziplin wie beim
   * Zumachen des Menüs und beim Aufsetzen der Brille.
   */
  private syncPreviews(): void {
    const on = this.open && this.stack.length > 0 && this.page.detail === undefined;
    if (on === this.previewsOn) return;
    this.previewsOn = on;
    this.previews?.setOpen(on);
  }

  /**
   * **Den Steckbrief aufschlagen** — und die große Vorschau dazu bestellen.
   *
   * Gerufen bei **jedem** Neuzeichnen, also zweimal die Sekunde: Gebaut wird
   * deshalb nur, was sich geändert hat. Steht schon dasselbe Modell da, bleibt
   * die Leinwand stehen — ein Modell, das bei jedem Bild neu geladen würde,
   * drehte sich nie.
   */
  private showDetail(detail: MenuDetail): void {
    if (detail.preview !== this.detailId) {
      this.closeDetail();
      // **Erst das Raster anhalten, dann die große Leinwand bauen.** Zwei
      // WebGL-Kontexte gleichzeitig aufzumachen ist auf einem Telefon genau
      // einer zu viel — und der zweite bekäme dann keinen.
      this.syncPreviews();
      this.detailId = detail.preview;
      // Eine andere Sache bewegt sich nicht so wie die vorige.
      this.detailOpts = { ...this.detailOpts, clip: null };
      // Und hat ihre eigenen Anpassungen — beide Schalter fangen aus an.
      this.tweak = detail.tweak ?? null;
      this.tweakSaved = this.tweak?.load() ?? null;
      this.tweakDraft = this.tweakSaved;
      this.moveOn = false;
      this.cellsOn = false;
      this.detailOpts = { ...this.detailOpts, ...this.tweakOptions() };
      this.detailView =
        this.previews?.detail({
          host: this.viewEl,
          id: detail.preview,
          onFacts: this.onDetailFacts,
          onCell: this.onDetailCell,
        }) ?? null;
      this.detailView?.set(this.detailOpts);
    }
    this.paintDetail(detail);
  }

  /** Leinwand, Mischer, Gitter, Hülle: weg. Und der Steckbrief fängt neu an. */
  private closeDetail(): void {
    if (!this.detailView && this.detailId === '') return;
    this.detailView?.dispose();
    this.detailView = null;
    this.detailId = '';
    this.detailFacts = null;
    this.detailClips = '';
    this.clipsSelect.replaceChildren();
    // Eine andere Sache hat einen anderen Steckbrief — und die Meldung zur
    // vorigen Adresse ginge hier als Bestätigung für die neue durch.
    this.factsShape = '';
    this.factsLine = '';
    this.factValues = [];
    this.factsEl.replaceChildren();
    this.setNote('', false);
    this.deed = null;
    this.deedLine = '';
    this.deedButton.hidden = true;
    this.tweak = null;
    this.tweakDraft = null;
    this.tweakSaved = null;
    this.moveOn = false;
    this.cellsOn = false;
  }

  // --- Anpassen eines Spielelements -------------------------------------------

  /** Was die Vorschau vom Stand der Anpassung wissen muss. */
  private tweakOptions(): Pick<DetailOptions, 'shift' | 'cells'> {
    const tweak = this.tweak;
    const draft = this.tweakDraft;
    if (!tweak || !draft) return { shift: [0, 0], cells: null };
    return {
      shift: draft.shift,
      cells: { cols: tweak.cols, rows: tweak.rows, blocked: draft.cells, edit: this.cellsOn },
    };
  }

  /** Den Stand an die Vorschau und auf den Schirm. */
  private pushTweak(): void {
    this.stepDetail(this.tweakOptions());
  }

  /** Um einen Schritt verschieben — `axis` 0 ist x (Osten), 1 ist z (vorn). */
  private nudge(axis: number, dir: number): void {
    const tweak = this.tweak;
    const draft = this.tweakDraft;
    if (!tweak || !draft || !(axis === 0 || axis === 1) || !Number.isFinite(dir)) return;
    const shift: [number, number] = [draft.shift[0], draft.shift[1]];
    shift[axis] = Math.round((shift[axis] + dir * tweak.step) * 1000) / 1000;
    this.tweakDraft = { ...draft, shift };
    this.pushTweak();
  }

  /** Eine Zelle wurde von oben angetippt: gesperrt ↔ frei. */
  private readonly onDetailCell = (key: string): void => {
    const draft = this.tweakDraft;
    if (!draft || !this.cellsOn) return;
    const cells = draft.cells.includes(key)
      ? draft.cells.filter((one) => one !== key)
      : [...draft.cells, key];
    this.tweakDraft = { ...draft, cells };
    this.pushTweak();
  };

  private saveTweak(): void {
    const tweak = this.tweak;
    if (!tweak || !this.tweakDraft) return;
    tweak.save(this.tweakDraft);
    this.tweakSaved = tweak.load();
    this.tweakDraft = this.tweakSaved;
    this.setNote('Anpassung gespeichert.', false);
    this.pushTweak();
  }

  /** Alle gespeicherten Anpassungen in die Zwischenablage — zum Weitergeben. */
  private async exportTweaks(): Promise<void> {
    const tweak = this.tweak;
    if (!tweak) return;
    const count = tweak.count();
    if (count === 0) {
      this.setNote('Noch nichts gespeichert — erst anpassen und speichern.', true);
      return;
    }
    if (await copyText(tweak.exportAll())) {
      this.setNote(`${count} ${count === 1 ? 'Anpassung' : 'Anpassungen'} kopiert.`, false);
    } else this.setNote(COPY_FALLBACK, true);
  }

  /** Schalter, Werte und Knöpfe des Anpassens — nur, was sich geändert hat. */
  private paintTweak(): void {
    const tweak = this.tweak;
    const draft = this.tweakDraft;
    const on = tweak !== null && draft !== null;
    this.moveButton.hidden = !on;
    this.cellsButton.hidden = !on;
    this.tweakEl.hidden = !on;
    this.exportButton.hidden = !on;
    this.moveEl.hidden = !on || !this.moveOn;
    if (!tweak || !draft) return;
    setSwitch(this.moveButton, this.moveOn);
    setSwitch(this.cellsButton, this.cellsOn);
    this.moveValues.forEach((box, index) => {
      const text = metresSigned(draft.shift[index]!);
      if (box.textContent !== text) box.textContent = text;
    });
    const saved = this.tweakSaved ?? tweak.preset();
    const dirty = !sameDraft(draft, saved);
    const line = dirty
      ? 'Nicht gespeichert'
      : sameDraft(saved, tweak.preset())
        ? 'Wie im Katalog'
        : 'Gespeichert — weicht vom Katalog ab';
    if (this.tweakLine.textContent !== line) this.tweakLine.textContent = line;
    this.tweakLine.classList.toggle('is-dirty', dirty);
    this.saveButton.disabled = !dirty;
    this.resetButton.disabled = sameDraft(draft, tweak.preset());
    const count = tweak.count();
    const label = `Alle Anpassungen kopieren (${count})`;
    const text = this.exportButton.querySelector('.pmenu__text')!;
    if (text.firstChild?.textContent !== label) {
      text.replaceChildren(
        el('strong', '', label),
        el('small', '', 'Als JSON in die Zwischenablage — zum Weitergeben'),
      );
    }
  }

  /** Ein Schalter wurde gedrückt — der Stand liegt hier, die Wirkung dort. */
  private stepDetail(change: Partial<DetailOptions>): void {
    this.detailOpts = { ...this.detailOpts, ...change };
    this.detailView?.set(this.detailOpts);
    if (this.open) this.render();
  }

  /** Das Modell ist da (oder seine Bewegungen sind es): neu zeichnen. */
  private readonly onDetailFacts = (facts: DetailFacts): void => {
    this.detailFacts = facts;
    if (this.open) this.render();
  };

  /**
   * **Was unter dem Modell steht** — Schalter, Bewegungen, Steckbrief.
   *
   * Geschrieben wird nur, was sich geändert hat: Diese Seite wird zweimal die
   * Sekunde gezeichnet, und ein `<select>`, das dabei neu gebaut würde, wäre
   * beim Aufklappen jedes Mal wieder zu.
   */
  private paintDetail(detail: MenuDetail): void {
    // **Kein Gitterboden, wo die Zellen schon liegen** — ein Spielelement
    // bringt sein Raster mit (`MenuDetail.tweak`). Gemeldet: _„Die Option mit
    // dem Gitterboden verstehe ich nicht. Es ist bereits ein gitterboden
    // angezeigt."_
    this.floorButton.hidden = detail.tweak !== undefined;
    this.paintTweak();
    setSwitch(this.floorButton, this.detailOpts.floor);
    setSwitch(this.boundsButton, this.detailOpts.bounds);
    setSwitch(this.playerButton, this.detailOpts.player ?? false);

    // Der Tat-Knopf: neu beschriftet wird er nur, wenn wirklich etwas anderes
    // daraufstehen soll — diese Seite wird zweimal die Sekunde gezeichnet.
    const deed = detail.action ?? null;
    this.deed = deed;
    this.deedButton.hidden = deed === null;
    const deedLine = deed ? `${deed.label}\u0000${deed.sub}` : '';
    if (deedLine !== this.deedLine) {
      this.deedLine = deedLine;
      this.deedButton.title = deed?.sub ?? '';
      this.deedButton
        .querySelector('.pmenu__text')
        ?.replaceChildren(el('strong', '', deed?.label ?? ''), el('small', '', deed?.sub ?? ''));
    }

    const clips = this.detailFacts?.clips ?? [];
    const key = clips.join('|');
    if (key !== this.detailClips) {
      this.detailClips = key;
      const options = [option('', 'keine'), ...clips.map((name) => option(name, clipLabel(name)))];
      this.clipsSelect.replaceChildren(...options);
    }
    if (this.clipsSelect.value !== (this.detailOpts.clip ?? '')) {
      this.clipsSelect.value = this.detailOpts.clip ?? '';
    }
    // Ohne Bewegungen keine Zeile: Ein Fass, dem man „keine" auswählen darf,
    // beantwortet eine Frage, die niemand gestellt hat.
    this.clipsEl.hidden = clips.length === 0;

    const facts: MenuFact[] = [...detail.facts, ...measured(this.detailFacts)];
    const shape = facts.map((fact) => `${fact.label}\u0000${fact.copy ? '+' : ''}`).join('\u0001');
    const line = facts.map((fact) => fact.value).join('\u0001');
    if (shape === this.factsShape) {
      // Dieselben Zeilen, andere Wörter: nur die Wörter. Der Knopf *Kopieren*
      // daneben bleibt derselbe Knopf, mit demselben Fokus.
      if (line === this.factsLine) return;
      this.factsLine = line;
      facts.forEach((fact, index) => {
        const box = this.factValues[index];
        if (box) box.textContent = fact.value;
      });
      return;
    }
    this.factsShape = shape;
    this.factsLine = line;
    this.factValues = facts.map(() => el('span', 'pmenu__factval'));
    this.factsEl.replaceChildren(
      ...facts.flatMap((fact, index) => {
        const box = this.factValues[index]!;
        box.textContent = fact.value;
        const value = el('dd');
        value.append(box);
        // **Der Knopf hängt an der Zeile und nicht an ihrer Beschriftung**
        // (`MenuFact.copy`): Was mitgenommen werden darf, sagt der, der den
        // Steckbrief schreibt — die Seite sucht nicht nach dem Wort
        // „Adresse".
        if (fact.copy) {
          const copy = el('button', 'pmenu__copy', 'Kopieren');
          copy.type = 'button';
          copy.dataset['copy'] = fact.label;
          copy.title = `${fact.label} in die Zwischenablage`;
          value.append(copy);
        }
        return [el('dt', '', fact.label), value];
      }),
    );
  }

  /**
   * **Eine Zeile des Steckbriefs mitnehmen.**
   *
   * Gewünscht war sie als das, was sie ist: „damit wir über die genau gleichen
   * Elemente sprechen." Zwei Modelle waren als „block b" und „block column"
   * bestellt worden, und beide Namen gibt es in der Sammlung nicht — es kostete
   * eine Rückfrage mit vier Vorschlägen, `block-bits/bricks_B.glb` und
   * `dungeon/column.glb` daraus zu machen.
   *
   * Kopiert wird, was **dasteht**, und nicht eine zweite Fassung davon: Der
   * Knopf holt sich den Text aus dem Kästchen neben sich. Damit kann gar nicht
   * etwas anderes in der Zwischenablage landen, als der Leser gelesen hat.
   */
  private onFactsClick(event: Event): void {
    const button = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-copy]');
    if (!button) return;
    const text = button.parentElement?.querySelector('.pmenu__factval')?.textContent ?? '';
    if (!text) return;
    void this.copyFact(button.dataset['copy'] ?? 'Zeile', text);
  }

  /** Mitgenommen — oder wenigstens markiert (`ui/clipboard.ts`). */
  private async copyFact(label: string, text: string): Promise<void> {
    if (await copyText(text)) this.setNote(`${label} kopiert: ${text}`, false);
    else this.setNote(COPY_FALLBACK, true);
  }

  /**
   * **Die Meldung unter dem Steckbrief** — und sie geht von selbst wieder weg.
   *
   * Eine Bestätigung, die stehenbleibt, ist nach dem zweiten Blick keine mehr,
   * sondern Möblierung: Wer sie dann liest, weiß nicht, ob sie von eben ist
   * oder von vorhin. Dieselbe Frist wie im Netzpanel (`ui/NetPanel.setMessage`).
   */
  private setNote(text: string, isError: boolean): void {
    this.noteText = text;
    this.noteEl.textContent = text;
    this.noteEl.classList.toggle('is-error', isError);
    window.clearTimeout(this.noteTimer);
    if (!text) return;
    this.noteTimer = window.setTimeout(() => {
      if (this.noteText !== text) return;
      this.setNote('', false);
    }, NOTE_MS);
  }

  /**
   * **Was unter der Liste steht** — der Hinweis zum Nehmen, und wie viel von
   * ihr schon dasteht.
   *
   * Ohne die Zahl sähe ein Ordner mit 1588 Modellen aus wie einer mit sechzig:
   * Die Liste wächst erst beim Scrollen, und was man nicht sieht, ist für
   * einen Leser nicht da.
   */
  private footLine(page: Page, total: number, shown: number): string {
    const parts: string[] = [];
    if (page.take) parts.push('Antippen nimmt es in die Hand · der Pfeil öffnet die Einstellungen');
    if (this.query && total === 0) parts.push('Nichts gefunden');
    else if (shown < total) parts.push(`${shown} von ${total}`);
    else if (this.query) parts.push(total === 1 ? '1 Treffer' : `${total} Treffer`);
    return parts.join(' · ');
  }

  /** Die Spalten dieser Seite: die gewählte, oder die, die ins Fenster passen. */
  private columns(): number {
    if (this.cols !== null) return clampColumns(this.cols);
    const width = this.stage.clientWidth || window.innerWidth || 0;
    return fitColumns(width);
  }

  /**
   * **Steht nach dem Zeichnen noch Platz frei, kommt mehr dazu.**
   *
   * Nötig, weil das `scroll`-Ereignis nie kommt, wenn gar nicht gescrollt
   * werden kann: Auf einem breiten Schirm mit acht Spalten füllen sechzig
   * Kacheln keine Seite, und ohne diese Zeile stünde das Regal nach dem
   * Aufschlagen mit acht Zeilen da und rührte sich nicht mehr.
   *
   * **Ohne gemessene Höhe passiert nichts.** In jsdom ist jede Höhe null —
   * dort wäre „es ist noch Platz" immer wahr, und die Schleife liefe bis zum
   * letzten der 1588 Einträge.
   */
  private fill(): void {
    if (!this.open) return;
    const box = this.stage.clientHeight;
    if (box <= 0) return;
    // So viel Inhalt muss dastehen: eine Fensterhöhe — und wenn eine
    // Blätterstellung wiederkommen soll, auch alles darüber.
    const need = (this.want ?? 0) + box;
    if (this.stage.scrollHeight <= need && this.window < this.source.length) {
      this.window += PAGE_WINDOW;
      this.render();
      return;
    }
    if (this.want !== null) {
      this.stage.scrollTop = this.want;
      this.want = null;
    }
  }

  /** Beim Scrollen: Kommt das Ende in Sicht, wird nachgelegt. */
  private readonly onScroll = (): void => {
    if (!this.open) return;
    const rest = this.stage.scrollHeight - this.stage.scrollTop - this.stage.clientHeight;
    if (rest > GROW_EDGE) return;
    if (this.window >= this.source.length) return;
    this.window += PAGE_WINDOW;
    this.render();
  };

  /** Ein anderes Fenster heißt andere Spalten — solange niemand sie gewählt hat. */
  private readonly onResize = (): void => {
    if (this.open && this.cols === null) this.render();
  };

  private onSearch(): void {
    const query = this.searchEl.value.trim();
    if (query === this.query) return;
    this.keepScroll();
    this.query = query;
    const find = this.page.find;
    this.results = query && find ? find(query) : null;
    this.window = PAGE_WINDOW;
    this.render();
  }

  private stepCols(by: number): void {
    const next = stepColumns(this.columns(), by);
    if (next === this.cols) return;
    this.cols = next;
    writeColumns(next);
    this.render();
  }

  /** Ob zu dieser Vorschau-Id schon ein Modell steht — dann bleibt die Ikone weg. */
  private readonly hasModel = (id: string): boolean => this.previews?.has(id) ?? false;

  /** Ein Modell ist angekommen: die Kachel darunter noch einmal zeichnen. */
  private readonly onPreviewReady = (): void => {
    if (this.open) this.render();
  };

  // --- Bedienung ----------------------------------------------------------

  private onListClick(event: Event): void {
    const target = event.target as HTMLElement;
    // Die Marke als Knopf nimmt die Vorratskiste (`MenuEntry.markRun`).
    const corner = target.closest<HTMLElement>('[data-mark]');
    if (corner && this.list.contains(corner)) {
      this.source[Number(corner.dataset['mark'])]?.markRun?.(null);
      this.render();
      return;
    }
    const more = target.closest<HTMLElement>('[data-more]');
    const hit = more ?? target.closest<HTMLElement>('[data-index]');
    if (!hit || !this.list.contains(hit)) return;
    const index = Number(more ? more.dataset['more'] : hit.dataset['index']);
    // **Die Liste, die dasteht** — und das ist bei laufender Suche nicht die
    // der Seite (`source`). Hier stand `page.entries`, und dann traf ein Druck
    // auf den ersten Treffer den ersten Eintrag der **ungefilterten** Seite:
    // Wer im Regal `crate buns` suchte und zugriff, bekam die erste Figur der
    // Sammlung. Der Index gehört dem, was gezeichnet wurde.
    const entry = this.source[index];
    if (!entry) return;
    // Der Pfeil einer Nimm-Zeile geht in ihre Einstellungen, das ⓘ einer
    // Kachel in ihren Steckbrief; die Zeile selbst nimmt. Überall sonst öffnet
    // die Zeile ihre Seite, wenn sie eine hat. **Eine Detailseite erreicht man
    // nur über den Knopf**: Antippen soll weiter nehmen und nicht auf einmal
    // etwas aufschlagen.
    const opens = Boolean(entry.children) || (more !== null && Boolean(entry.detail));
    const descend = opens && (more !== null || !(this.page.take && entry.run));
    if (descend) {
      this.keepScroll();
      // **Bevor** der Weg umgestellt wird: Wer erst beim Aufschlagen etwas
      // laden will, soll es beim ersten Bild der neuen Seite schon getan
      // haben (`MenuEntry.onOpen`).
      entry.onOpen?.();
      // **Ein Treffer der Suche liegt irgendwo im Reiter** (`menuTabs.searchTab`)
      // und nicht unter dieser Seite: Er öffnet sich an seiner Stelle im Baum.
      const deep = this.results ? pathTo(this.root, entry.id) : null;
      if (deep) this.nav.goTo(deep);
      else this.nav.push(entry.id);
      return;
    }
    entry.run?.(null);
    this.render();
  }

  /**
   * **`Esc` geht eine Ebene zurück** — und erst ganz oben macht es zu.
   *
   * Vorher schloss `Esc` das ganze Menü, egal wie tief man stand, und wer
   * danach wieder aufmachte, stand zwar auf derselben Seite (`menuNav`), aber
   * eben immer noch drei Ebenen tief. Jetzt ist es dieselbe Treppe wie der
   * Pfeil im Kopf: ein Suchbegriff zuerst, dann eine Seite nach der anderen,
   * dann zu.
   */
  back(): void {
    if (!this.open) return;
    if (this.query !== '') {
      this.clearSearch();
      this.render();
      return;
    }
    if (this.stack.length > this.floor) {
      this.keepScroll();
      this.nav.pop();
      return;
    }
    this.toggle(false);
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (!this.open) return;
    // **Die Ziffern wählen den Reiter** — `1` Inventar, `2` Katalog … wie die
    // Leiste in Minecraft. Nicht im Suchfeld: Dort ist eine Ziffer ein Wort.
    if (this.tabs && /^[1-9]$/.test(event.key) && !event.altKey && !event.ctrlKey) {
      if ((event.target as HTMLElement | null)?.closest?.('input, select, textarea')) return;
      const entry = this.root[Number(event.key) - 1];
      if (!entry) return;
      event.preventDefault();
      this.showTab(entry.id);
      return;
    }
    if (event.key !== 'Escape') return;
    event.preventDefault();
    this.back();
  };
}

// --- Bausteine --------------------------------------------------------------

/** Der Weg zu einem Eintrag mit Kindern, wo immer er im Baum steht — oder `null`. */
function pathTo(entries: readonly MenuEntry[], id: string, top = true): string[] | null {
  for (const entry of entries) {
    if (!entry.children) continue;
    if (entry.id === id) return [entry.id];
    // Die Reiter selbst tragen die Suche; darunter wird nicht in Seiten mit
    // eigener Suche gestiegen — genau wie `menuTabs.searchTab`.
    if (!top && (entry.find || entry.flatten)) continue;
    const below = pathTo(entry.children, id, false);
    if (below) return [entry.id, ...below];
  }
  return null;
}

/** Eine Menüseite aus dem Eintrag, der sie öffnet — wie am Handgelenk. */
function pageOf(entry: MenuEntry): Page {
  const grid = entry.grid ?? false;
  return {
    title: entry.label,
    entries: spread(entry.children ?? []),
    grid,
    ...(entry.cols === undefined ? {} : { cols: entry.cols }),
    full: entry.full ?? false,
    ...(entry.find ? { find: entry.find.bind(entry) } : {}),
    take: entry.take ?? grid,
    home: entry.home ?? false,
    ...(entry.detail ? { detail: entry.detail } : {}),
    id: entry.id,
  };
}

/**
 * **Die Fächer des Regals stehen am Schirm offen** (`MenuEntry.flatten`).
 *
 * Ein Eintrag, der nur eine Zwischenseite ist — „1–60", „61–120" —, gibt hier
 * seine Kinder an seiner Stelle ab. In der Brille bleibt er, was er ist; dort
 * blättert ein Stick, und vierhundert Seiten blättert niemand. Die **Ids
 * bleiben dabei die der Modelle**, also merkt sich der Weg durchs Menü
 * (`menuNav.ts`) weiter dasselbe, und die Vorschau muss nichts übersetzen.
 */
function spread(all: readonly MenuEntry[]): MenuEntry[] {
  // Eine versteckte Seite ist keine Zeile (`MenuEntry.hidden`).
  const entries = all.filter((entry) => !entry.hidden);
  if (!entries.some((entry) => entry.flatten && entry.children)) return entries;
  const out: MenuEntry[] = [];
  for (const entry of entries) {
    if (entry.flatten && entry.children) out.push(...entry.children);
    else out.push(entry);
  }
  return out;
}

function row(
  entry: MenuEntry,
  index: number,
  take: boolean,
  ready: (id: string) => boolean,
): HTMLElement {
  const accent = cssColor(entry.accent);
  const node = el('button', 'pmenu__row');
  node.type = 'button';
  node.dataset['index'] = String(index);
  node.dataset['id'] = entry.id;
  node.dataset['key'] = `row:${entry.id}`;
  node.style.setProperty('--accent', accent);
  if (entry.selected) node.classList.add('is-selected');
  if (entry.checked !== undefined) {
    node.setAttribute('role', 'switch');
    node.setAttribute('aria-checked', entry.checked ? 'true' : 'false');
  }
  if (entry.caption) node.title = entry.caption;

  node.append(face(entry, accent, ready));

  const text = el('span', 'pmenu__text');
  text.append(el('strong', '', entry.label));
  if (entry.sub) text.append(el('small', '', entry.sub));
  node.append(text);

  if (entry.badge) node.append(el('span', 'pmenu__badge', entry.badge));

  if (entry.checked !== undefined) {
    const toggle = el('span', 'pmenu__switch');
    if (entry.checked) toggle.classList.add('is-on');
    node.append(toggle);
  } else if (entry.children) {
    if (take && entry.run) {
      // Zwei Ziele in einer Zeile: Die Zeile nimmt, der Pfeil steigt ab. Ein
      // Knopf im Knopf ist kein gültiges DOM, also liegt der Pfeil daneben —
      // die Zeile wird dafür schmaler (`pmenu__row--split`).
      node.classList.add('pmenu__row--split');
      const wrap = el('div', 'pmenu__pair');
      wrap.dataset['key'] = `pair:${entry.id}`;
      const more = iconButton('pmenu__more', `${entry.label}: Einstellungen`, 'M9 6l6 6-6 6');
      more.dataset['more'] = String(index);
      more.style.setProperty('--accent', accent);
      wrap.append(node, more);
      return wrap;
    }
    node.append(chevron());
  } else if (entry.selected) {
    node.append(el('span', 'pmenu__dot'));
  }
  return node;
}

function tile(entry: MenuEntry, index: number, ready: (id: string) => boolean): HTMLElement {
  const accent = cssColor(entry.accent);
  const node = el('button', 'pmenu__tile');
  node.type = 'button';
  node.dataset['index'] = String(index);
  node.dataset['id'] = entry.id;
  node.dataset['key'] = `tile:${entry.id}`;
  node.style.setProperty('--accent', accent);
  if (entry.selected) node.classList.add('is-selected');
  if (entry.caption) node.title = entry.caption;
  if (entry.image) {
    // **Eine Karte wie auf der Startseite**: oben das Bild mit dem Schildchen
    // darauf, darunter Name und Zeile (`.wcard`, `ui/landingWorlds.ts`).
    node.classList.add('pmenu__tile--card');
    const art = el('span', 'pmenu__art');
    const img = document.createElement('img');
    img.src = entry.image;
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    art.append(img);
    if (entry.badge) art.append(el('span', 'pmenu__badge', entry.badge));
    node.append(art, el('strong', '', entry.label));
    if (entry.sub) node.append(el('small', '', entry.sub));
    return node;
  }
  const art = face(entry, accent, ready);
  node.append(art, el('strong', '', entry.label));
  if (entry.caption) node.append(el('small', '', entry.caption));
  if (entry.badge) node.append(el('span', 'pmenu__badge', entry.badge));
  // **Das Verbotszeichen steht mitten auf dem Bild** — gewünscht: _„Das icon
  // disallowed bei wand abreißen kann ruhig mittig über der kachel drauf"_.
  // Es sagt, was die Kachel tut, und gehört deshalb aufs Modell, nicht in die
  // Ecke, in der die Vorratskiste nur sagt, was das Ding ist.
  if (entry.mark === 'forbidden' && !entry.markRun) art.append(mark(entry.mark));
  else if (entry.mark && !entry.markRun) node.append(mark(entry.mark));
  if (!entry.detail && !(entry.mark && entry.markRun)) return node;
  // **Zwei Ziele in einer Kachel** — und ein Knopf im Knopf ist kein gültiges
  // DOM. Also liegt das ⓘ **neben** der Kachel in einem Rahmen, der beide
  // übereinanderlegt (`.pmenu__card`): Die Kachel nimmt wie bisher, der Knopf
  // in der Ecke schlägt den Steckbrief auf. Dieselbe Bauweise wie beim Pfeil
  // einer Nimm-Zeile (`.pmenu__pair`), nur über Eck statt nebeneinander.
  const wrap = el('div', 'pmenu__card');
  wrap.dataset['key'] = `card:${entry.id}`;
  wrap.append(node);
  // **Die Marke als Knopf** (`MenuEntry.markRun`) — gebaut wie das ⓘ, nur
  // oben links: neben der Kachel, über sie gelegt.
  if (entry.mark && entry.markRun) {
    const { label, path } = MARKS[entry.mark];
    const run = iconButton('pmenu__mark pmenu__mark--button', `${entry.label}: ${label}`, path);
    run.title = label;
    run.dataset['mark'] = String(index);
    run.style.setProperty('--accent', accent);
    wrap.append(run);
  }
  if (entry.detail) {
    const info = iconButton(
      'pmenu__info',
      `${entry.label}: Mehr anzeigen`,
      'M12 4a8 8 0 100 16 8 8 0 000-16zM12 11v5M12 8.2v.1',
    );
    info.dataset['more'] = String(index);
    info.style.setProperty('--accent', accent);
    wrap.append(info);
  }
  return wrap;
}

/**
 * **Was links (oder oben) in der Zeile steht** — und das ist zweierlei.
 *
 * Ohne `preview` die Ikone wie bisher. Mit `preview` ein **Quadrat**, in das
 * eine Vorschauschicht ihr Modell zeichnet (`PagePreviews.ts`).
 * Das Quadrat steht auch dann da, wenn niemand zeichnet — es hält den Platz,
 * damit im Raster kein Loch entsteht —, und solange kein Modell angekommen
 * ist, steht die Ikone darin. Erst wenn eines steht, geht sie weg: zwei
 * Bilder übereinander wären nur Unruhe, und genau so hält es auch das Panel
 * am Handgelenk.
 */
function face(entry: MenuEntry, accent: string, ready: (id: string) => boolean): HTMLElement {
  const id = entry.preview;
  if (!id) return icon(entry, accent);
  const box = el('span', 'pmenu__prev');
  box.dataset['preview'] = id;
  if (!ready(id)) box.append(icon(entry, accent));
  return box;
}

/**
 * Die Ikone der Zeile, gezeichnet mit demselben Stift wie am Handgelenk.
 * Ohne Ikone bleibt ein farbiger Punkt — und ohne Leinwand (jsdom) bleibt
 * die Fläche leer, was einem Test egal ist.
 */
function icon(entry: MenuEntry, accent: string): HTMLElement {
  if (!entry.icon) {
    const dot = el('span', 'pmenu__icon pmenu__icon--blank');
    dot.style.setProperty('--accent', accent);
    return dot;
  }
  const canvas = document.createElement('canvas');
  canvas.className = 'pmenu__icon';
  canvas.width = ICON_PX;
  canvas.height = ICON_PX;
  const ctx = canvas.getContext('2d');
  if (ctx) drawMenuIcon(ctx, entry.icon, ICON_PX / 2, ICON_PX / 2, ICON_PX * 0.68, accent);
  return canvas;
}

/**
 * **Ein Schalter als Zeile** — dieselbe Zeile wie im Menü, nur ohne Eintrag
 * dahinter: Text links, Wippe rechts (`.pmenu__switch`).
 */
function switchRow(label: string, hint: string): HTMLButtonElement {
  const node = el('button', 'pmenu__row');
  node.type = 'button';
  node.setAttribute('role', 'switch');
  node.setAttribute('aria-checked', 'false');
  node.title = hint;
  const text = el('span', 'pmenu__text');
  text.append(el('strong', '', label), el('small', '', hint));
  node.append(text, el('span', 'pmenu__switch'));
  return node;
}

/** Die Wippe einer Schalterzeile umlegen — ohne sie neu zu bauen. */
function setSwitch(node: HTMLButtonElement, on: boolean): void {
  node.setAttribute('aria-checked', on ? 'true' : 'false');
  node.querySelector('.pmenu__switch')?.classList.toggle('is-on', on);
}

/** Eine Verschiebung, wie man sie liest: mit Vorzeichen und Komma. */
function metresSigned(value: number): string {
  const text = Math.abs(value).toFixed(2).replace('.', ',');
  return `${value > 0 ? '+' : value < 0 ? '−' : '±'}${text} m`;
}

/** Ob zwei Stände der Anpassung dasselbe sagen — die Zellen in beliebiger Reihenfolge. */
function sameDraft(a: DetailTweak, b: DetailTweak): boolean {
  return (
    a.shift[0] === b.shift[0] &&
    a.shift[1] === b.shift[1] &&
    [...a.cells].sort().join(' ') === [...b.cells].sort().join(' ')
  );
}

function option(value: string, label: string): HTMLOptionElement {
  const node = document.createElement('option');
  node.value = value;
  node.textContent = label;
  return node;
}

/**
 * **Was am Modell gemessen wurde**, als Zeilen des Steckbriefs — oder nichts,
 * solange es noch lädt.
 *
 * Die Maße stehen in **Metern**, also so, wie das Ding in der Welt steht und
 * nicht wie es in der Datei liegt: Der Maßstab des Pakets
 * (`core/kaykitFit.ts`) ist schon darin, und genau diese Zahl beantwortet die
 * Frage, für die jemand nachsieht.
 */
function measured(facts: DetailFacts | null): MenuFact[] {
  if (!facts) return [];
  const out: MenuFact[] = [];
  const size = facts.size;
  if (size)
    out.push({
      label: 'Maße',
      value: `${metres(size[0])} × ${metres(size[1])} × ${metres(size[2])}`,
    });
  if (facts.triangles !== undefined) {
    out.push({ label: 'Dreiecke', value: facts.triangles.toLocaleString('de-DE') });
  }
  const clips = facts.clips?.length ?? 0;
  if (facts.loading) out.push({ label: 'Animationen', value: 'lädt …' });
  else if (clips > 0) out.push({ label: 'Animationen', value: clips === 1 ? '1' : String(clips) });
  return out;
}

/** Ein Maß, wie man es liest: zwei Nachkommastellen und ein Komma. */
function metres(value: number): string {
  return `${value.toFixed(2).replace('.', ',')} m`;
}

function chevron(): HTMLElement {
  const node = el('span', 'pmenu__chevron');
  node.setAttribute('aria-hidden', 'true');
  node.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg>';
  return node;
}

/** Ein runder Knopf mit einem Strich darauf — Zurück, Schließen, der Pfeil. */
/**
 * **Die Marken oben links auf einer Kachel** (`MenuEntry.mark`): Name zum
 * Vorlesen und Überfahren, und ein Strichbild im selben Stift wie das ⓘ.
 */
const MARKS: Readonly<Record<MenuMark, { label: string; path: string }>> = {
  // Eine Kiste von vorn: Deckelkante, Rahmen, zwei Latten.
  crate: { label: 'Vorratskiste', path: 'M4 8h16v11H4zM3 5h18v3H3zM4 12h16M9 12v7M15 12v7' },
  // Das Verbotszeichen: ein Kreis mit Schrägstrich — die Wand, die abreißt.
  forbidden: { label: 'Abreißen', path: 'M12 3a9 9 0 100 18 9 9 0 000-18zM5.6 5.6l12.8 12.8' },
};

function mark(which: MenuMark): HTMLElement {
  const { label, path } = MARKS[which];
  const node = el('span', `pmenu__mark pmenu__mark--${which}`);
  node.title = label;
  node.setAttribute('aria-label', label);
  node.setAttribute('role', 'img');
  // Feste Zeichenkette, kein fremder Text: `path` steht oben in dieser Datei.
  node.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}" /></svg>`;
  return node;
}

function iconButton(className: string, label: string, path: string): HTMLButtonElement {
  const node = el('button', className);
  node.type = 'button';
  node.setAttribute('aria-label', label);
  node.title = label;
  // Feste Zeichenkette, kein fremder Text: `path` kommt aus dieser Datei.
  node.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}" /></svg>`;
  return node;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  // `textContent`, nie `innerHTML`: Beschriftungen kommen auch von Mitspielern.
  if (text) node.textContent = text;
  return node;
}

/** Aus der Zahl des Eintrags (`0x4aa8ff`) die Farbe, die CSS versteht. */
export function cssColor(accent: number | undefined): string {
  return `#${(accent ?? 0x4aa8ff).toString(16).padStart(6, '0')}`;
}
