import './style.css';
import { detectFlatRole, detectXRSupport } from './core/device';
import { emulateQuest, emulationRequested } from './core/xrEmulator';
import { normalizeRoomCode } from './net/room';
import type { App } from './core/App';
import type { NetPanel } from './ui/NetPanel';
import { playerPosture, savePlayerPosture, type Posture } from './core/posture';
import {
  SCREEN_VIEW_LABELS,
  SCREEN_VIEW_SUBS,
  onScreenViewChange,
  saveScreenView,
  screenView,
  startOptions,
  type ScreenView,
} from './core/screenView';
import { DEFAULT_WORLD, WORLDS, WORLD_FOLDERS, findWorld } from './worlds';
import { markWorldCard, renderWorldCards, worldCards, type WorldCard } from './ui/landingWorlds';
import { isStaleModuleError, shouldReload } from './core/staleBuild';
import {
  fullscreenActive,
  fullscreenSupported,
  onFullscreenChange,
  toggleFullscreen,
} from './core/fullscreen';
import { showScreenPads } from './core/screenPads';
import { INSTALL_TEXT } from './core/install';
import { registerServiceWorker, watchInstall } from './core/pwa';
import { armAudioUnlock, unlockAudio } from './core/audioUnlock';
import { graphics, onGraphicsChange } from './core/graphicsSettings';
import { firstGamepad } from './core/gamepad';
import {
  nextWarmStep,
  startButton,
  type WarmSignals,
  type WarmStep,
  type WorldPhase,
} from './core/warmStart';
import { APP_VERSION, versionLine } from './core/appVersion';
import { ASSET_HASHES } from './core/assetVersion';
import { readBuildId } from './core/buildId';
import { UpdateWatch } from './core/updateCheck';
import { UpdatePrompt } from './ui/UpdatePrompt';
import {
  SHELF_INDEX,
  Throughput,
  etaSeconds,
  fullHint,
  fullLabel,
  fullPlan,
  fullShare,
  fullWarning,
  haveBytes,
  mayStartFull,
  pendingItems,
  steadyEta,
  type FullPlan,
  type FullState,
  type OfflineList,
} from './core/fullDownload';
import { autoStarts, fullBlocks } from './core/fullAuto';
import {
  cachedUrls,
  hasCacheStorage,
  loadOfflineList,
  runFull,
  swControls,
} from './core/fullDownloadRun';
import type { KaykitIndex } from './core/kaykitIndex';
import { trackViewport } from './ui/safeArea';
import { padNav } from './ui/padNav';

/**
 * **Wie groß der Schirm wirklich ist**, als Erstes und vor allem anderen: Die
 * Leinwand hängt an `--app-height` (`style.css`, `#scene`), und die steht
 * nirgends, bis hier einmal gemessen wurde. Zwei Zeilen weiter unten holt
 * `App` aus denselben beiden Zahlen seinen Bildpuffer — dass beide dasselbe
 * Fenster meinen, ist der ganze Punkt (`ui/safeArea.ts`).
 */
trackViewport();

const canvas = document.querySelector<HTMLCanvasElement>('#scene')!;
const landing = document.querySelector<HTMLElement>('#landing')!;
const enterButton = document.querySelector<HTMLButtonElement>('#enter')!;
const enterLabel = document.querySelector<HTMLElement>('#enter-label');
const enterSub = document.querySelector<HTMLElement>('#enter-sub');
const worldCardsEl = document.querySelector<HTMLElement>('#world-cards');
/**
 * **Der Ladebalken des Starts** (`index.html`, `#boot`) — der Kasten und die
 * Zeile darin. Beide stehen **im HTML** und nicht hier: Sie werden genau in
 * der Zeit gebraucht, in der dieses Skript noch unterwegs ist. Was von hier
 * kommt, ist nur das Ende — siehe `showStartNote`.
 */
const bootBox = document.querySelector<HTMLElement>('#boot')!;
const startNote = document.querySelector<HTMLElement>('#start-note')!;
const statusLine = document.querySelector<HTMLElement>('#xr-status')!;
const hud = document.querySelector<HTMLElement>('#hud')!;
const hudWorld = document.querySelector<HTMLElement>('#hud-world')!;
const hudMenu = document.querySelector<HTMLButtonElement>('#hud-menu')!;
const hudVr = document.querySelector<HTMLButtonElement>('#hud-vr')!;
const landingMenu = document.querySelector<HTMLButtonElement>('#landing-menu')!;
/**
 * Die beiden Vollbildknöpfe — auf der Startseite und im Spiel, derselbe Knopf
 * an zwei Stellen, so wie es das Menü auch schon ist (`#landing-menu`,
 * `#hud-menu`). Siehe `showFullscreen` weiter unten.
 */
const fullButtons = [
  document.querySelector<HTMLButtonElement>('#landing-full')!,
  document.querySelector<HTMLButtonElement>('#hud-full')!,
];
const touch = document.querySelector<HTMLElement>('#touch')!;
/**
 * Die vier Zeigerflächen auf dem Glas (`core/FlatControls.TouchPads`): links
 * der Stock zum Laufen, rechts Zielstock und die Knöpfe `A`/`B`. Die rechte
 * Hälfte gehört der Ansicht von oben und blendet sich selbst ein und aus.
 *
 * Dazu die beiden **echten** Knöpfe, Werkzeug und Menü: Sie werden hier nicht
 * gedrückt, sie werden ausgespart — zwei Finger zoomen nur, solange keiner
 * von ihnen auf einem Knopf liegt.
 */
const pads = {
  stick: document.querySelector<HTMLElement>('#touch-stick'),
  aim: document.querySelector<HTMLElement>('#touch-aim'),
  use: document.querySelector<HTMLElement>('#touch-a'),
  fire: document.querySelector<HTMLElement>('#touch-b'),
  right: document.querySelector<HTMLElement>('#touch-right'),
  turnLeft: document.querySelector<HTMLElement>('#touch-turn-left'),
  turnRight: document.querySelector<HTMLElement>('#touch-turn-right'),
  tool: document.querySelector<HTMLElement>('#hud-tool'),
  menu: document.querySelector<HTMLElement>('#hud-menu'),
};
const postureSeg = document.querySelector<HTMLElement>('#posture')!;
const postureField = document.querySelector<HTMLElement>('#posture-field')!;
const screenSeg = document.querySelector<HTMLElement>('#screen-view')!;
const screenField = document.querySelector<HTMLElement>('#screen-view-field')!;
const screenHint = document.querySelector<HTMLElement>('#screen-view-hint')!;
/** Wofür zuletzt gegen einen alten Build neu geladen wurde. */
const RELOADED_FOR = 'bgvr:stale-reload';

const params = new URLSearchParams(window.location.search);
const requested = window.location.hash.slice(1) || params.get('world') || DEFAULT_WORLD;
/**
 * **Die Welt, in die _Spielen_ führt.** Sie steht in der Adresse oder ist die
 * Standardwelt — und seit der Weltauswahl auf der Startseite
 * (`ui/landingWorlds.ts`) kann sie sich ändern, bevor jemand drückt
 * (`pickWorld`). Deshalb `let`.
 */
let startWorld = findWorld(requested)?.id ?? DEFAULT_WORLD;

/**
 * **Wann die Stöcke auf dem Glas liegen** — die drei Stellen, die es einmal
 * waren, ziehen jetzt an einem Strang (`core/screenPads.ts`).
 *
 * Dreimal stand hier dieselbe Zeile: beim Betreten, beim Auf- und Absetzen der
 * Brille, und wenn eine Welt den Stock zurückgab. Jede kannte nur ihre eigene
 * Hälfte der Lage — wer die Brille absetzte, bekam die Stöcke auch dann zurück,
 * wenn die Welt gerade ihre eigene Steuerung zeigte. Also gibt es hier nur noch
 * **einen** Merker je Zustand und **eine** Funktion, die nach jeder Änderung
 * läuft. Was daraus folgt, rechnet das Modul; hier steht nur, was der Browser
 * gerade meldet.
 */
let inSession = false;
/** Ob die laufende Welt den Bordstock der Seite überhaupt will. */
let worldWantsStick = true;

/**
 * **Ob gerade ein Gamepad angesteckt ist.** Gefragt wird die API und nicht ein
 * gemerkter Zustand: `gamepadconnected` kommt in manchen Browsern erst, wenn
 * am Pad ein Knopf gedrückt wurde, und ein Pad, das beim Neuladen der Seite
 * schon steckte, meldet sich gar nicht erst. Die Liste dagegen stimmt immer.
 */
function padPresent(): boolean {
  const list =
    typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function'
      ? navigator.getGamepads()
      : null;
  return firstGamepad(list) !== null;
}

function showPads(): void {
  touch.hidden = !showScreenPads({
    setting: graphics().screenPads,
    role: detectFlatRole(),
    gamepad: padPresent(),
    presenting: inSession,
    worldWantsStick,
  });
}

// Angesteckt und abgezogen wird jederzeit, und die Einstellung dazu steht im
// Menü — beides zieht die Stöcke sofort nach, ohne dass jemand neu laden muss.
for (const event of ['gamepadconnected', 'gamepaddisconnected'])
  window.addEventListener(event, showPads);
onGraphicsChange(showPads);

/**
 * **Die App kommt nicht mehr mit der Seite** — sie wird geholt, wenn sie
 * gebraucht wird.
 *
 * `core/App.ts` zieht three.js mit (gemessen 755 kB im Bündel, rund 202 kB
 * gezippt), `ui/NetPanel.ts` die Verbindungsbibliothek, und beide hingen
 * **fest** an `main.ts`. Damit lagen sie auf dem Weg zwischen dem ersten Bild
 * und dem Augenblick, in dem die Startseite überhaupt auf eine Frage
 * antwortet — für eine Seite, die zuerst nur einen Knopf und zwei Umschalter
 * zeigt, ist das die falsche Reihenfolge. Der gemessene Befund stand schon im
 * Kapitel [Die Seite selbst](../docs/agents/seite.md): „Das aufzulösen hieße,
 * `App` und `ui/NetPanel` dynamisch zu laden, und das ist ein eigener Umbau."
 * Das hier ist der Umbau.
 *
 * **Geholt wird sie von zwei Seiten**, und beide bekommen dieselbe:
 *
 * - **im Leerlauf nach dem Start** (`bootApp`), damit sie in aller Regel
 *   längst dasteht, bevor jemand drückt;
 * - **sofort bei der ersten Geste**, die sie braucht — jeder Knopf, jedes
 *   Menü, jede Welt in der Adresse ruft `ensureApp`.
 *
 * `null` heißt „kein 3D auf diesem Gerät": Dann steht die Erklärung auf der
 * Seite und jeder Knopf ist stumpf — dieselbe Behandlung wie vorher, nur
 * eben ein paar hundert Millisekunden später.
 */
let app: App | null = null;
let netPanel: NetPanel | null = null;
let appPending: Promise<App | null> | null = null;
/**
 * Ob dieses Gerät kein 3D hergibt. Dann steht die Erklärung auf der Seite,
 * jeder Knopf ist stumpf — und bleibt es auch, wenn sonst jemand malt.
 */
let noGraphics = false;
/**
 * **Wie weit „Alles herunterladen" ist** (`core/fullDownload.FullState`). Es
 * steht hier oben und nicht unten beim Download, weil _Beitreten_ daran hängt
 * und schon im Modulrumpf gemalt wird — ein `let` weiter unten wäre in diesem
 * Augenblick noch nicht angelegt.
 */
let fullState: FullState = { kind: 'unbekannt' };

function ensureApp(): Promise<App | null> {
  appPending ??= startApp();
  return appPending;
}

/** Für alles, was die App braucht, aber nicht auf sie warten kann. */
function withApp(use: (app: App) => void): void {
  void ensureApp().then((ready) => {
    if (ready) use(ready);
  });
}

async function startApp(): Promise<App | null> {
  // Beide zusammen: Sie hängen ohnehin aneinander (`NetPanel` bekommt die
  // App), und zwei Ladungen hintereinander wären eine Laufzeit zu viel.
  const [{ App }, { NetPanel }] = await Promise.all([
    import('./core/App'),
    import('./ui/NetPanel'),
  ]);
  try {
    app = new App(canvas, pads, {
      onWorldChanged: (id, title) => {
        hudWorld.textContent = title;
        // Im Menü der Startseite eine andere Welt gewählt: Karte und Knopf
        // ziehen nach, sonst sagte _Spielen_ noch die alte.
        if (!landing.hidden && id !== startWorld) {
          startWorld = id;
          if (worldCardsEl) markWorldCard(worldCardsEl, id);
          paintEnterLabel();
        }
        if (window.location.hash.slice(1) !== id) {
          window.history.replaceState(null, '', `#${id}`);
        }
      },
      onSessionChanged: (presenting) => {
        hud.hidden = presenting;
        inSession = presenting;
        showPads();
        paintHudVr(presenting);
        if (presenting) {
          netPanel?.toggle(false);
          hideLanding();
        }
      },
      // Der Knopf oben links sagt, ob das Menü dahinter offen ist — auf der
      // Startseite und im Spiel derselbe Knopf, dasselbe Menü.
      onMenuChanged: (open) => {
        for (const button of [hudMenu, landingMenu])
          button.setAttribute('aria-expanded', open ? 'true' : 'false');
      },
      // Eine Welt mit eigener Steuerung nimmt den Bordstock weg; `true` heißt,
      // dass wieder die Seite entscheidet (`WorldContext.touchStick`) — also
      // genau das, was `showPads` ausrechnet.
      onTouchStick: (on) => {
        worldWantsStick = on;
        showPads();
      },
      onNetChanged: () => {
        netPanel?.refresh();
      },
      onWorldFailed: (id, error) => {
        // Eine Welt, die nicht kam, darf noch einmal angefordert werden:
        // `App.goTo` wirft nicht, also wüsste `ensureWorld` sonst nie davon
        // und hielte für den Rest der Sitzung eine erfüllte Promise auf eine
        // Welt, die es nicht gibt. Meistens lädt die Seite gleich darauf
        // ohnehin neu (`recoverFromStaleBuild`) — aber eben nur meistens.
        if (id === startWorld) {
          worldPending = null;
          // Und der Knopf wird wieder frei — mit einer Zeile, die sagt, was
          // war. Ein Knopf, der stumpf bleibt, weil eine Datei nicht kam, ist
          // ein Deadlock: Das Einzige, was hier noch helfen könnte, ist genau
          // der Druck, den er nicht mehr zulässt.
          worldPhase = 'fehlt';
          paintStart();
        }
        recoverFromStaleBuild(id, error);
      },
    });
    app.setXrReady(headset);
  } catch (error) {
    const webgl = /webgl|graphics context/i.test(String(error));
    setXrStatus(
      webgl
        ? '3D ist in diesem Browser nicht verfügbar. Bitte WebGL bzw. Grafikbeschleunigung aktivieren oder einen Browser mit WebGL-Unterstützung verwenden und die Seite neu laden.'
        : 'Das Spiel konnte nicht gestartet werden. Bitte die Seite neu laden.',
      true,
    );
    statusLine.setAttribute('role', 'alert');
    enterButton.textContent = '3D-Start nicht verfügbar';
    for (const button of landing.querySelectorAll<HTMLButtonElement>('button'))
      button.disabled = true;
    // **Und niemand malt das wieder weg.** `paintStart` rechnet aus dem Stand
    // der Welt und kennt diesen Fall nicht; ohne diesen Merker gäbe schon der
    // nächste Wechsel aus dem Hintergrund den Knopf wieder frei — für ein 3D,
    // das es auf diesem Gerät nicht gibt.
    noGraphics = true;
    // Der Balken hört auf zu laufen: Es kommt nichts mehr.
    showStartNote('');
    console.error('[start] 3D ließ sich nicht einrichten', error);
    return null;
  }

  app.preferLocal = params.get('net') === 'local';

  netPanel = new NetPanel(app, {
    local: app.preferLocal,
    // Joining a room from the landing page also starts the game — the two
    // buttons there say which way. Ob die Welt dabei flach oder räumlich
    // aussieht, sagt die Ansicht und nicht dieser Knopf. Derselbe Weg wie beim
    // großen Knopf (`enterPlayground`): Die Welt kommt seit dem fortschreitenden
    // Start nicht mehr von allein, also wird sie hier angefordert.
    onStart: (mode) => void enterPlayground(mode === 'vr'),
  });

  // `?room=` prefills the code (a shared link), so only one tap is left to join.
  const room = normalizeRoomCode(params.get('room') ?? '');
  if (room) {
    netPanel.setRoom(room);
    document.querySelector<HTMLDetailsElement>('#net-setup')?.setAttribute('open', '');
  } else {
    netPanel.restoreLastRoom();
  }

  // Handy for debugging from the browser console.
  (window as unknown as { bgvr: App }).bgvr = app;
  return app;
}

/**
 * **Ob dieses Gerät eine Brille ist** — die eine Eigenschaft, an der die ganze
 * Startseite hängt (`core/screenView.startOptions`).
 *
 * Bis `detectXRSupport` geantwortet hat, gilt „keine Brille". Das ist die
 * Antwort für fast jedes Gerät, und sie kostet niemanden etwas: Der Knopf steht
 * sofort da und heißt „Beitreten", die Brille schreibt sich Millisekunden
 * später selbst hinein. Andersherum — erst „VR wird geprüft …" und ein toter
 * Knopf — wartet jeder Schreibtisch auf eine Antwort, die ihn nichts angeht.
 */
let headset = false;

// **`?xr=sim`**: erst die nachgestellte Quest einsetzen, dann fragen — dann
// meldet sich eine Brille, und alles läuft wie mit einer (`core/xrEmulator.ts`).
void (
  emulationRequested(window.location.search)
    ? emulateQuest().catch((error: unknown) => console.warn('[xr] Emulator fehlt', error))
    : Promise.resolve()
)
  .then(() => detectXRSupport())
  .then((support) => {
    headset = support.immersiveVR;
    app?.setXrReady(headset);
    paintHudVr(app?.renderer.xr.isPresenting ?? false);
    showStart();
    setXrStatus(
      support.immersiveVR ? 'VR-Gerät erkannt.' : (support.reason ?? 'Kein VR-Gerät gefunden.'),
    );
  });

/** Dieselbe Zeile unter beiden Gesichtern der Seite. */
function setXrStatus(text: string, error = false): void {
  statusLine.textContent = text;
  statusLine.classList.toggle('is-error', error);
}

/**
 * Sitting or standing, asked before the headset goes on.
 *
 * WebXR reports the head above the floor of the room and nothing else, so a
 * player on a chair is indistinguishable from a very short one — and every
 * counter, kart and horizon then belongs to somebody taller. The answer only
 * has to be given once; `PlayerRig` turns "sitting" into a lift back to
 * standing eye height, and the same switch sits in the wrist menu under
 * *Bewegung → Haltung*.
 */
function showPosture(posture: Posture): void {
  for (const button of postureSeg.querySelectorAll<HTMLButtonElement>('button')) {
    button.classList.toggle('is-active', button.dataset['posture'] === posture);
  }
}

showPosture(playerPosture());
postureSeg.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
  const picked = button?.dataset['posture'];
  if (picked !== 'sit' && picked !== 'stand') return;
  savePlayerPosture(picked);
  // Steht die App noch nicht, genügt der Speicher: `PlayerRig` liest die
  // Haltung beim Aufbau von dort (`core/posture.ts`).
  if (app) app.rig.posture = picked;
  showPosture(picked);
});

/**
 * _Von oben_ oder _Aus den Augen_ — gefragt, wo keine Brille ist, und
 * vorbelegt nach Gerät (Handy: von oben; `core/screenView.ts`).
 *
 * Die Zeile darunter sagt **vorher**, wohin „Beitreten" damit führt. Die
 * Kennungen `2d`/`3d` bleiben im Speicher und in der Auszeichnung stehen
 * (`data-view`), die **Wörter** stehen an einer Stelle
 * (`SCREEN_VIEW_LABELS`) — sonst hieße dieselbe Ansicht auf der Startseite
 * anders als im Menü.
 */
function showScreenView(view: ScreenView): void {
  for (const button of screenSeg.querySelectorAll<HTMLButtonElement>('button')) {
    const id = button.dataset['view'];
    if (id === '2d' || id === '3d') button.textContent = SCREEN_VIEW_LABELS[id];
    button.classList.toggle('is-active', id === view);
  }
  screenHint.textContent =
    view === '2d'
      ? `${SCREEN_VIEW_SUBS['2d']} Umschalten geht auch im Spiel: Menü → Spielen → Ansicht.`
      : SCREEN_VIEW_SUBS['3d'];
}

/**
 * **Was die Startseite zeigt: eine Frage und einen Knopf.**
 *
 * Welche der beiden Fragen überhaupt dasteht, entscheidet das Gerät
 * (`core/screenView.startOptions`, mit Test): In der Brille ist „2D oder 3D"
 * keine Frage, am Bildschirm ist es die Haltung nicht. Übrig bleibt ein Knopf,
 * der sagt, wohin er führt — und eine Zeile, die es ausschreibt.
 *
 * Läuft bei jeder Änderung: wenn die XR-Antwort kommt, und bei jedem Tipp auf
 * 2D oder 3D.
 */
function showStart(): void {
  const view = screenView(detectFlatRole());
  const options = startOptions(headset, view);
  postureField.hidden = !options.askPosture;
  screenField.hidden = !options.askView;
  paintEnterLabel();
  showPosture(playerPosture());
  showScreenView(view);
}

/**
 * **Was auf dem einen Knopf steht** — auf beiden Gesichtern der Seite. Solange
 * der Download prüft oder lädt, sagt er das (`fullLabel`), sonst, wohin er
 * führt (`startOptions`). Ohne 3D steht dort schon das Endgültige.
 */
function paintEnterLabel(): void {
  if (noGraphics) return;
  const options = startOptions(headset, screenView(detectFlatRole()));
  const busy = fullLabel(fullState);
  // **Der Knopf sagt „Spielen" — und darunter, wohin.** Ohne die beiden
  // Zeilen im HTML (ein altes Bild aus dem Speicher) steht wie früher nur ein
  // Wort da.
  const where = findWorld(startWorld)?.title ?? '';
  const how = options.way === 'vr' ? 'mit Brille' : SCREEN_VIEW_LABELS[options.way];
  const label = busy ?? (options.way === 'vr' ? 'In VR spielen' : 'Spielen');
  if (enterLabel && enterSub) {
    enterLabel.textContent = label;
    enterSub.textContent = busy ? '' : [where, how].filter(Boolean).join(' · ');
  } else enterButton.textContent = label;
}

showStart();
onScreenViewChange(showStart);

/**
 * **Eine Karte der Weltauswahl wurde getippt** (`ui/landingWorlds.ts`).
 *
 * Gewählt heißt: Die Adresse sagt es (`#hub` — ein Neuladen landet wieder
 * dort), der Knopf sagt es, und die Welt wird **sofort** angefordert. Wer eine
 * Karte tippt, will gleich hinein; die Sekunden bis zum Druck auf _Spielen_
 * sind genau die, die das Laden braucht. Das Vorwärmen der Standardwelt tritt
 * dafür zurück (`stopWarming`) — eine Welt, die niemand mehr will, bekommt
 * keine Leitung mehr.
 *
 * **Auch Haunting ist eine Karte wie jede andere.** Bis Oktober 2026 schlug sie
 * eine eigene Startseite auf (Name, Raum-Code, Verbinden, Lobby); gewünscht
 * war: _„Beim start screen wo ich mich eigentlich anmelden soll will ich gar
 * nicht erst hin, sondern ich will lieber, dass das menü in der spielwelt
 * ist."_ Die Verbindung stellt man jetzt in der Station ein, am Rechner
 * _Verbindung_ der Einsatzzentrale.
 */
function pickWorld(card: WorldCard): void {
  if (card.id === startWorld) return;
  startWorld = card.id;
  window.history.replaceState(null, '', `#${card.id}`);
  if (worldCardsEl) markWorldCard(worldCardsEl, card.id);
  paintEnterLabel();
  stopWarming();
  worldPending = null;
  worldPhase = 'ruht';
  void ensureWorld();
}

if (worldCardsEl) {
  renderWorldCards(
    worldCardsEl,
    worldCards(WORLDS, import.meta.env.BASE_URL, WORLD_FOLDERS),
    startWorld,
    pickWorld,
  );
}
screenSeg.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
  const picked = button?.dataset['view'];
  if (picked !== '2d' && picked !== '3d') return;
  // Die App schaltet die laufende Welt um — solange es keine gibt, genügt der
  // Speicher, und `App` liest ihn beim Aufbau. Deshalb steht hier beides:
  // `saveScreenView` für den frühen Fall, `setScreenView` für den späten.
  if (app) app.setScreenView(picked);
  else saveScreenView(picked);
});

// --- Die Welt: angefordert oder vorgewärmt, aber nie im Modulrumpf ----------

/**
 * **Die Standardwelt, einmal und nur einmal.**
 *
 * Zwei können sie wollen, und beide sollen dieselbe bekommen: das Vorwärmen,
 * wenn der Browser Luft hat, und der Spieler, wenn er drückt. Wer zuerst kommt,
 * startet die Ladung; der Zweite hängt sich an dieselbe Promise, statt eine
 * zweite loszuschicken. `App.goTo` wirft nie — es meldet einen Fehlschlag über
 * `onWorldFailed` —, deshalb steht hier kein `catch`.
 */
let worldPending: Promise<void> | null = null;
/**
 * **Wie weit die Standardwelt ist**, so genau, wie der Knopf es wissen muss
 * (`core/warmStart.WorldPhase`). Daran hängt die ganze Anzeige: `paintStart`
 * rechnet daraus und aus den Signalen des Browsers, ob _Beitreten_ stumpf ist
 * und was darunter steht.
 */
let worldPhase: WorldPhase = 'ruht';
/**
 * **Ob in dieser Sitzung schon eine Welt stand** — dann wird _Beitreten_ beim
 * Wechsel der Welt nicht noch einmal stumpf (`warmStart.startButton`, `once`).
 */
let worldStoodOnce = false;

/**
 * **Der Deckel: zwanzig Sekunden.**
 *
 * Er ist keine gemessene Dauer, sondern eine Grenze, und sie steht dort, wo
 * jede vernünftige Ladung längst durch ist: Gemessen steht die Welt nach gut
 * fünf Sekunden (1,5 Mbit/s, 150 ms Laufzeit), und ihre Modelle kamen in
 * diesem Container noch dreieinhalb bis viereinhalb Sekunden später. Neun
 * Sekunden ist also der gemessene schlechte Fall; zwanzig lässt einer noch
 * schlechteren Leitung das Doppelte und greift trotzdem, bevor jemand glaubt,
 * die Seite sei kaputt.
 *
 * Und er greift **nicht** gegen langsame Leitungen, sondern gegen stumme: Eine
 * Datei, die weder ankommt noch scheitert, meldet sich bei keinem Lade-Manager
 * wieder ab (`core/assetGate.ts`). Was danach doch noch kommt, kommt nach —
 * der Knopf wartet nur nicht mehr darauf.
 */
const ASSET_CAP_MS = 20000;

function ensureWorld(): Promise<void> {
  worldPending ??= loadWorld();
  return worldPending;
}

/**
 * **Die Standardwelt, und „geladen" ehrlich gemeint.**
 *
 * `App.goTo` kommt zurück, sobald `World.init` gebaut hat — die Modelle der
 * Welt kommen **danach**: Die Küche holt ihre Möbel mit `void import(…)`, der
 * Koch und die Wundertüte ebenso, und keiner davon wird von `init` abgewartet.
 * Deshalb wartet hier noch ein zweiter Schritt: bis der Lade-Manager von
 * three.js eine Weile nichts mehr zu tun hatte (`App.assetsSettled`,
 * `core/assetGate.ts`). Erst dann heißt „die Welt steht" wirklich, dass sie
 * steht.
 *
 * `App.goTo` wirft nie — es meldet einen Fehlschlag über `onWorldFailed`, und
 * der räumt `worldPending` ab. Genau daran wird unten erkannt, dass hier
 * nichts mehr zu melden ist: Sonst schriebe diese Funktion „steht" über eine
 * Welt, die es nicht gibt.
 */
async function loadWorld(): Promise<void> {
  // Welche Welt diese Ladung meint — wählt jemand auf der Startseite
  // inzwischen eine andere (`pickWorld`), hat sie nichts mehr zu melden.
  const target = startWorld;
  worldPhase = 'lädt';
  paintStart();
  const ready = await ensureApp();
  // Kein 3D auf diesem Gerät: Die Erklärung steht schon auf der Seite, und
  // jeder Knopf ist stumpf (`startApp`). Hier ist nichts mehr zu malen.
  if (!ready) return;
  if (target !== startWorld) return;
  await ready.goTo(target);
  if (worldPending === null || target !== startWorld) return;
  const settled = await ready.assetsSettled(ASSET_CAP_MS);
  if (worldPending === null || target !== startWorld) return;
  worldPhase = settled ? 'steht' : 'dauert';
  worldStoodOnce = true;
  paintStart();
  // Der Deckel hat den Knopf freigegeben, die Ladung läuft weiter — und wenn
  // sie dann doch ankommt, verschwindet auch die Zeile darüber. Ohne dieses
  // Nachfassen bliebe „lädt noch" stehen, bis jemand die Seite neu lädt.
  if (!settled) void watchLateAssets(ready);
}

/** Der zweite Blick nach dem Deckel — großzügig, aber auch nicht endlos. */
async function watchLateAssets(ready: App): Promise<void> {
  const late = await ready.assetsSettled(5 * 60000);
  if (!late || worldPhase !== 'dauert') return;
  worldPhase = 'steht';
  paintStart();
}

/**
 * **Vorwärmen: was nach dem Start nachkommt** — die Ausführung zu der
 * Entscheidung in `core/warmStart.ts`.
 *
 * Hier steht nur das Drumherum: der richtige Augenblick (wenn der Browser
 * nichts zu tun hat), das Lesen der Signale beim Browser, und das Anhalten,
 * sobald der Spieler selbst etwas will. **Was** gewärmt wird und **in welcher
 * Reihenfolge**, steht drüben, als reine Rechnung mit Test.
 */
const warmed: WarmStep[] = [];
/** Ob der Spieler schon selbst etwas angefordert hat — dann nichts nebenher. */
let playerAsked = false;
/**
 * Ob gerade **alles** heruntergeladen wird (weiter unten, `#offline`). Das ist
 * dasselbe `busy` aus einem anderen Grund: Der große Download hat die Leitung,
 * und was das Vorwärmen daneben holte, nähme sie ihm weg. Anders als
 * `playerAsked` geht es hinterher wieder auf `false` — dann ist das Vorwärmen
 * wieder dran, falls es überhaupt noch etwas zu wärmen gibt.
 */
let fullRunning = false;
/** Womit ein laufender Vorrats-Abruf abgebrochen wird. */
let warmAbort: AbortController | null = null;

/**
 * **Das Vorwärmen tritt zurück.** Aufgerufen von allem, was der Spieler selbst
 * auslöst: der Knopf, das Menü, eine Welt in der Adresse. Ein laufender
 * Vorrats-Abruf wird dabei wirklich abgebrochen und nicht nur nicht mehr
 * abgewartet — sonst nähme er der angeforderten Ladung weiter die Leitung weg.
 */
function stopWarming(): void {
  playerAsked = true;
  warmAbort?.abort();
  warmAbort = null;
}

/** Was der Browser gerade über sich sagt. Die Netzwerk-API ist optional. */
function warmSignals(): WarmSignals {
  const connection = (navigator as { connection?: { saveData?: boolean; effectiveType?: string } })
    .connection;
  return {
    hidden: document.hidden,
    busy: playerAsked || fullRunning,
    saveData: connection?.saveData,
    effectiveType: connection?.effectiveType,
  };
}

/**
 * **Die Basis der Seite, absolut** (`https://…/vr/`). Der Speicher führt seine
 * Einträge unter absoluten Adressen, und ob etwas schon da ist, entscheidet
 * ein Zeichenvergleich — eine relative Basis wäre hier eine Einladung.
 */
const PAGE_BASE = new URL(import.meta.env.BASE_URL, window.location.href).href;

/**
 * **Die Kennung dieses Builds**, gelesen aus dem `<meta>` der Seite. Warum sie
 * dort steht und nicht in einem Modul, steht in `core/buildId.ts`: Eine
 * Zeichenkette, die sich bei jedem Deploy ändert, benennt sonst das halbe
 * Bündel um.
 */
const BUILD_ID = readBuildId(document);

/** Der Index des Regals — dieselbe Adresse, die auch `core/kaykitModel.ts` anfragt. */
const SHELF_INDEX_URL = `${PAGE_BASE}${SHELF_INDEX}`;

/**
 * **Der Index des KayKit-Regals**, und ausdrücklich nur er (31 kB gezippt).
 * Dieselbe Adresse, die `core/kaykitModel.ts` später anfragt — **blank**, ohne
 * irgendetwas in der Query. Hier stand einmal `versioned(…)`, und das war ein
 * stiller Fehler: Der Lader fragt ohne, gewärmt wurde mit, also lagen 215 kB
 * unter einem Namen im Speicher, den nie jemand anfragte — und nach jedem
 * Deploy noch einmal dieselben 215 kB unter einem neuen. Wer zwei Adressen für
 * eine Datei hat, wärmt nichts vor, sondern füllt einen Speicher.
 *
 * `priority: 'low'` kennt heute nur Chromium; wo es fehlt, ist es ein
 * unbekanntes Feld in einem Objekt und damit wirkungslos — kein Grund für eine
 * Fallunterscheidung.
 */
async function warmShelfIndex(signal: AbortSignal): Promise<void> {
  try {
    await fetch(SHELF_INDEX_URL, { signal, priority: 'low' } as RequestInit);
  } catch {
    // Ein Vorrat, der nicht kommt, ist kein Fehler: Das Regal holt ihn sich
    // beim Aufklappen selbst.
  }
}

/**
 * Schritt für Schritt, und **vor jedem** noch einmal gefragt: `busy` und
 * `hidden` schlagen mitten im Wärmen um, und dann soll der nächste Schritt
 * nicht mehr losgehen.
 */
async function warmUp(): Promise<void> {
  for (;;) {
    const step = nextWarmStep(warmed, warmSignals());
    if (step === null) return;
    warmed.push(step);
    if (step === 'welt') await ensureWorld();
    else {
      warmAbort = new AbortController();
      await warmShelfIndex(warmAbort.signal);
      warmAbort = null;
    }
  }
}

/**
 * **Wenn der Browser Luft hat** — `requestIdleCallback` mit Frist, und ein
 * Zeitgeber dort, wo es die Funktion nicht gibt: **Safari kennt sie bis
 * heute nicht**, und das sind genau die Geräte (iPhone, iPad, jede dorthin
 * installierte App), auf denen ein warmer Speicher am meisten wert ist.
 */
function whenIdle(run: () => void): void {
  const idle = (
    window as {
      requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number;
    }
  ).requestIdleCallback;
  if (idle) idle.call(window, run, { timeout: 1500 });
  else window.setTimeout(run, 1200);
}

// Kommt der Tab aus dem Hintergrund zurück, ist ein übersprungener Schritt
// wieder dran — `nextWarmStep` merkt sich nur, was gelaufen ist, nicht, was
// abgelehnt wurde.
document.addEventListener('visibilitychange', () => {
  if (document.hidden || playerAsked) return;
  // **Und der Knopf weiß es sofort**, nicht erst im Leerlauf: Wer zurückkommt,
  // sieht sonst eine Sekunde lang „wird beim Beitreten geladen" und danach
  // einen Knopf, der ihm unter der Hand stumpf wird.
  paintStart();
  whenIdle(() => void warmUp());
});

/**
 * **Was unter dem Knopf steht, solange die Welt unterwegs ist.**
 *
 * Eine Seite, die erkennbar dasteht und dann stumm arbeitet, ist schlimmer als
 * eine, die „lädt" sagt. Also sagt sie es: der Knopf verliert seine
 * Beschriftung nicht, sondern seine Bedienbarkeit, und darunter steht, worauf
 * gewartet wird. Steht die Welt schon — der Normalfall, denn das Vorwärmen
 * hatte die Sekunden davor —, ist hier nichts zu sagen.
 */
function showStartNote(text: string, running = text !== ''): void {
  startNote.textContent = text;
  // Der Balken **ist** die Zeile: Er läuft, solange etwas zu sagen ist, und
  // geht mit ihr weg. Angefangen hat er im HTML, lange bevor dieses Skript da
  // war — das ist sein ganzer Zweck.
  bootBox.hidden = text === '';
  // **Eine Ausnahme davon gibt es seit dem stumpfen Knopf**: Wo gar nicht
  // vorgewärmt wird (Daten sparen, schmale Leitung), steht unter dem Knopf,
  // dass die Welt erst beim Druck kommt — und dann ist etwas zu _sagen_, aber
  // nichts zu _zeigen_. Ein Streifen, der dabei liefe, behauptete eine Arbeit,
  // die niemand tut, und das ist schlimmer als keiner (`style.css`,
  // `.boot--still`).
  bootBox.classList.toggle('boot--still', !running);
}

/**
 * **Der Knopf und seine Zeile, aus dem Stand der Welt.** Gerechnet wird
 * nebenan (`core/warmStart.startButton`, mit Test); hier steht nur, welches
 * Element was davon ist.
 *
 * Gemalt wird nach jeder Änderung, die daran etwas ändert: beim ersten Lauf
 * des Skripts, wenn die Ladung anfängt, wenn sie steht, wenn sie scheitert,
 * und wenn der Tab aus dem Hintergrund zurückkommt.
 */
function paintStart(): void {
  // Kein 3D auf diesem Gerät: Was dann dasteht, hat `startApp` geschrieben,
  // und es ist endgültig (`noGraphics`).
  if (noGraphics) return;
  const state = startButton(warmSignals(), worldPhase, worldStoodOnce);
  // **Und der Download hält ihn genauso auf** (`core/fullAuto.fullBlocks`):
  // Solange geprüft oder geladen wird, sagt der Knopf das selbst, und der
  // Balken darunter zeigt, wie weit. Die Zeile der Welt schweigt dann — zwei
  // Balken, die beide „lädt" sagen, sagen nichts mehr.
  const waiting = fullBlocks(fullState);
  enterButton.disabled = state.disabled || waiting;
  showStartNote(waiting ? '' : state.note, state.busy);
}

/**
 * **Und einmal sofort**, im Modulrumpf und vor allem, was wartet.
 *
 * `#enter` steht im HTML **stumpf** da (`index.html`, `disabled`), denn in der
 * Sekunde davor ist die Welt mit Sicherheit nicht geladen — ein Knopf, der
 * dort bedienbar aussieht, verspricht etwas, das erst dieses Skript einlösen
 * kann. Der Preis dafür ist ein toter Knopf, wenn das Bündel gar nicht kommt;
 * dann ist die Seite allerdings ohnehin nur ein Bild, und ein grauer Knopf ist
 * die ehrlichere Hälfte davon.
 *
 * Diese Zeile ist die Gegenrechnung: Sie läuft, sobald das Bündel ausgewertet
 * wird, und gibt den Knopf in genau den Fällen wieder frei, in denen niemand
 * vorwärmt (Daten sparen, `2g`, Tab im Hintergrund, Lobby).
 */
paintStart();

/**
 * **Der eine Knopf der Spielwiese.** Wohin er führt, steht eine Zeile darüber:
 * in die Brille — oder an den Bildschirm, in die Welt.
 *
 * Ob man sie von oben oder aus den Augen sieht, entscheidet nicht dieser
 * Knopf, sondern die Ansicht (`App.setScreenView`): **Jede** Welt kann von
 * oben (`core/TopDownCamera.ts` — dieselbe Szene, eine Kamera darüber), und
 * die Wahl gilt für die, in der man steht. Vorher führte „2D" hier nach
 * Haunting, weil es die Karte von oben nur dort gab — ein Umweg, den es jetzt
 * nicht mehr braucht.
 *
 * **Die XR-Sitzung wird zuerst angefragt, die Welt läuft daneben** — dieselbe
 * Reihenfolge wie früher in der Lobby von Haunting, und aus demselben Grund: Ein Browser
 * gibt eine immersive Sitzung nur auf eine frische Geste, und die wäre nach
 * dem Warten auf einen Chunk verbraucht.
 */
async function enterPlayground(vr: boolean): Promise<void> {
  // Was der Spieler will, hat Vorrang vor allem, was wir ihm vorschlagen.
  stopWarming();
  const session = vr ? startVR() : null;
  // Und der Knopf sagt es von selbst: `ensureWorld` setzt den Stand, und
  // `paintStart` malt ihn — dieselben zwei Zeilen wie beim Vorwärmen. Hier
  // stand einmal beides noch einmal von Hand, und das war die Fassung, in der
  // der Knopf **erst nach** dem Klick stumpf wurde.
  await ensureWorld();
  if (!vr) startFlat();
  if (session) await session;
}

// **Die erste Berührung der Startseite holt die App**, noch bevor klar ist,
// wohin sie führen soll: Wer die Seite anfasst, will gleich hinein, und ein
// Chunk, der in dieser Sekunde losgeht, ist eine Sekunde früher da. Einmal
// und dann nie wieder (`once`) — `ensureApp` ist ohnehin idempotent, aber ein
// Ereignis, das niemand mehr braucht, wird abgemeldet.
for (const event of ['pointerdown', 'keydown'] as const) {
  landing.addEventListener(event, () => void ensureApp(), { once: true, passive: true });
}

enterButton.addEventListener('click', () => {
  // **Hier und nicht später** wird der Ton aufgeschlossen: WebKit lässt einen
  // `AudioContext` nur **im** Ereignis laufen, und alles danach — das Modul
  // der Welt, das Modell, die Aufnahmen — dauert Sekunden
  // (`core/audioUnlock.ts`). `armAudioUnlock` unten fängt jede weitere Geste
  // ab, aber die erste ist diese.
  unlockAudio();
  void enterPlayground(startOptions(headset, screenView(detectFlatRole())).way === 'vr');
});

// Dasselbe Menü wie im Spiel, schon auf der Startseite: Welten, Bewegung,
// Aussehen, Grafik — als Seite (`ui/PageMenu.ts`), weil hier keine Brille auf ist.
landingMenu.addEventListener('click', () => withApp((ready) => ready.toggleMenu()));

// **Die Seite am Gamepad** (`ui/padNav.ts`): ☰ macht überall das Menü auf —
// auf der Startseite wie im Spiel —, und die Startseite selbst ist mit
// Steuerkreuz und `A` bedienbar. Angemeldet wird nur ihr Rahmen und nicht
// jeder Knopf: Was darin steht, findet der Fokus selbst.
padNav.onMenu = () => withApp((ready) => ready.toggleMenu());
padNav.addScope({
  priority: 0,
  active: () => !landing.hidden && !landing.classList.contains('is-hiding'),
  root: () => landing,
  // Der Fokus fängt auf _Beitreten_ an — dafür ist man hier.
  initial: () => (enterButton.disabled ? null : enterButton),
});
padNav.start();

async function startVR(button: HTMLButtonElement = enterButton): Promise<void> {
  button.disabled = true;
  try {
    const ready = await ensureApp();
    if (!ready) return;
    await ready.enterVR();
  } catch (error) {
    setXrStatus(`VR-Start fehlgeschlagen: ${(error as Error).message}`, true);
    button.disabled = false;
  }
}

function startFlat(): void {
  hideLanding();
  hud.hidden = false;
  showPads();
}

hudMenu.addEventListener('click', () => withApp((ready) => ready.toggleMenu()));

// `void (async () => …)()` statt eines `async`-Handlers: Ein Klick-Handler, der
// eine Promise zurückgibt, wird von niemandem abgewartet — was darin schiefgeht,
// fällt sonst still auf den Boden.
/**
 * **Der Knopf oben rechts** — mit Brille _VR_ (und _VR beenden_), ohne sagt er
 * die Sicht, in der man gerade ist, und öffnet das Menü _Spiel-Sicht_
 * (`App.openViewMenu`): VR, aus den Augen, von oben. Gewünscht: _„der VR
 * button oben rechts im web lieber zu einem "von oben" und "aus den
 * augen" button zu wechseln, wenn der browser/gerät kein VR unterstützt"_.
 */
function paintHudVr(presenting: boolean): void {
  hudVr.textContent = presenting
    ? 'VR beenden'
    : headset
      ? 'VR'
      : SCREEN_VIEW_LABELS[screenView(detectFlatRole())];
}
onScreenViewChange(() => paintHudVr(app?.renderer.xr.isPresenting ?? false));
paintHudVr(false);

hudVr.addEventListener('click', () => {
  void (async () => {
    const ready = await ensureApp();
    if (!ready) return;
    if (!headset && !ready.renderer.xr.isPresenting) {
      ready.openViewMenu();
      return;
    }
    if (ready.renderer.xr.isPresenting) {
      await ready.endVR();
      return;
    }
    try {
      await ready.enterVR();
    } catch (error) {
      console.warn('[xr] Sitzung konnte nicht gestartet werden', error);
    }
  })();
});

/**
 * **Vollbild, wo keine Brille ist** (`core/fullscreen.ts`, `#landing-full`,
 * `#hud-full`).
 *
 * In der Brille stellt sich die Frage nicht: Eine XR-Sitzung _ist_ Vollbild,
 * und der Streifen mit dem Knopf ist dort ohnehin weg (`onSessionChanged`). Am
 * Bildschirm ist es die einzige Antwort auf eine ganze Klasse von Geräten —
 * der Browser einer Konsole, ein Fernseher, ein Telefon im Querformat: Dort
 * kostet die Adresszeile ein Fünftel der Fläche, und das Spiel läuft im Rest.
 *
 * **Warum der Knopf verschwindet, statt grau zu werden.** Wo der Browser
 * Vollbild nicht erlaubt — in einem `<iframe>` ohne `allow="fullscreen"`, auf
 * Geräten, die es nicht können —, ist ein Knopf, der nichts tut, schlimmer als
 * keiner: Er behauptet eine Fähigkeit und nimmt Platz weg. Gefragt wird
 * deshalb einmal, und die Antwort entscheidet, ob es ihn gibt.
 *
 * Beschriftet wird nach dem **Stand** und nicht nach dem Klick: `Esc` beendet
 * das Vollbild, die Systemtaste eines Fernsehers auch, und beide fragen
 * niemanden. Deshalb hängt das Umbeschriften am Ereignis.
 */
const canFullscreen = fullscreenSupported(document, document.documentElement);
for (const button of fullButtons) button.hidden = !canFullscreen;
if (canFullscreen) {
  const showFullscreen = (): void => {
    const on = fullscreenActive(document);
    for (const button of fullButtons) {
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
      button.setAttribute('aria-label', on ? 'Vollbild beenden' : 'Vollbild');
    }
  };
  for (const button of fullButtons) {
    button.addEventListener('click', () => {
      void toggleFullscreen(document, document.documentElement).then(showFullscreen);
    });
  }
  onFullscreenChange(document, showFullscreen);
  showFullscreen();
}

/**
 * **Die Spielwiese als App ablegen** — der Block unter den Verweisen.
 *
 * Er gehört neben das Vollbild darüber, denn es ist dieselbe Frage von der
 * anderen Seite: Auf dem iPhone gibt es Vollbild *nur* so. Was angezeigt
 * wird, rechnet `core/install.ts`; hier steht nur, welches Element das dann
 * ist. Der Knopf verschwindet, sobald installiert wurde — ein zweites Mal
 * annehmen lässt sich ein Angebot nicht.
 */
const installBox = document.querySelector<HTMLElement>('#install')!;
const installButton = document.querySelector<HTMLButtonElement>('#install-btn')!;
const installHint = document.querySelector<HTMLElement>('#install-hint')!;
const installOffer = watchInstall((state) => {
  installBox.hidden = state === 'installed' || state === 'none';
  installButton.hidden = state !== 'prompt';
  installHint.textContent = INSTALL_TEXT[state];
});
installButton.addEventListener('click', () => {
  void installOffer.install().then((done) => {
    if (!done) return;
    // Der Block hat sich mit dem angenommenen Angebot selbst abgemeldet
    // (nichts mehr anzubieten) — für diesen einen Satz kommt er zurück, sonst
    // stünde die Antwort auf den Klick in einem versteckten Absatz.
    installHint.textContent = 'Fertig — die Spielwiese liegt jetzt auf dem Startbildschirm.';
    installBox.hidden = false;
  });
});

/**
 * **Alles herunterladen** — der Block unter dem Installieren, und die zweite
 * Hälfte derselben Sache: Installieren macht aus der Seite eine App, und das
 * hier macht sie funklochfest.
 *
 * Gerechnet wird nebenan (`core/fullDownload.ts`, mit Test): was in den Plan
 * gehört, in welcher Reihenfolge, wie weit der Balken steht, wie lange es noch
 * dauert und was in jedem Zustand dasteht. Geholt wird in
 * `core/fullDownloadRun.ts`. **Hier steht nur, welches Element was anzeigt** —
 * und der eine Zustandsautomat dazwischen.
 *
 * **Einen eigenen Knopf gibt es nicht mehr.** Nachgesehen wird beim Start
 * von selbst, und was fehlt, wird geholt — ohne Haken und ohne Nachfrage,
 * denn gespielt wird mit allem, was dazugehört (`core/fullAuto.ts`). Solange
 * das läuft, sagt _Beitreten_ „Wird geprüft …" bzw. „Lädt … 17 %",
 * und der Balken steht direkt darunter. „Überspringen" hält den Lauf für diese
 * Sitzung an; beim nächsten Start geht es weiter.
 */
/**
 * **Die Version, ganz unten auf der Startseite.** `0.<Build>.<Patch>` aus
 * `package.json`, dahinter der Commit dieses Builds — gerechnet wird das
 * nebenan (`core/appVersion.ts`, mit Test), hier steht nur, wo es hingehört.
 */
const versionEl = document.querySelector<HTMLElement>('#app-version');
if (versionEl) versionEl.textContent = versionLine(APP_VERSION, BUILD_ID);

const offlineBar = document.querySelector<HTMLProgressElement>('#offline-bar')!;
const offlineHint = document.querySelector<HTMLElement>('#offline-hint')!;
const offlineStop = document.querySelector<HTMLButtonElement>('#offline-stop')!;

/** Die erzeugte Liste, einmal geholt und dann behalten. */
let fullList: OfflineList | null = null;
/** Der Index des Regals, ebenso — `null` heißt „kein Regal im Checkout". */
let fullShelf: KaykitIndex | null = null;
/** Der Plan aus beiden. */
let fullPlanned: FullPlan | null = null;
/** Was der Speicher davon schon hat. */
let fullHave: ReadonlySet<string> = new Set<string>();
/** Womit ein laufender Download angehalten wird. */
let fullAbort: AbortController | null = null;

function setFull(state: FullState): void {
  fullState = state;
  paintFull();
}

/**
 * **Malen, und sonst nichts.** Balken, Zeile, Überspringen — und der eine
 * Knopf, der jetzt beides ist: _Beitreten_ und der Download davor.
 *
 * Der Balken steht nur da, wenn er etwas zu zeigen hat. Beim Prüfen läuft er
 * unbestimmt (ohne `value`): Wie viel fehlt, weiß in dieser Sekunde niemand.
 */
function paintFull(): void {
  const warning = fullState.kind === 'offen' ? fullWarning(connectionInfo()) : '';
  offlineHint.textContent = `${fullHint(fullState)}${warning ? ` ${warning}` : ''}`;
  offlineBar.hidden = !(
    fullState.kind === 'prüft' ||
    fullState.kind === 'läuft' ||
    fullState.kind === 'angehalten' ||
    fullState.kind === 'lückenhaft'
  );
  if (fullState.kind === 'prüft') offlineBar.removeAttribute('value');
  else offlineBar.value = fullShare(fullState);
  offlineStop.hidden = fullState.kind !== 'läuft';
  paintEnterLabel();
  paintStart();
}

/** Was der Browser über die Leitung sagt. Die API ist optional (Safari). */
function connectionInfo(): { saveData?: boolean | undefined; effectiveType?: string | undefined } {
  const connection = (navigator as { connection?: { saveData?: boolean; effectiveType?: string } })
    .connection;
  return { saveData: connection?.saveData, effectiveType: connection?.effectiveType };
}

/** Der Index des Regals, einmal — ohne ihn fehlen im Plan die 4470 Modelle. */
async function fullShelfIndex(): Promise<KaykitIndex | null> {
  if (fullShelf) return fullShelf;
  try {
    const response = await fetch(SHELF_INDEX_URL);
    if (!response.ok) return null;
    fullShelf = (await response.json()) as KaykitIndex;
  } catch {
    // Kein Regal ist kein Fehler — siehe `docs/agents/assetregal.md`.
    return null;
  }
  return fullShelf;
}

/**
 * **Nachsehen, wo wir stehen**: Liste holen, Plan rechnen, Speicher auslesen.
 * Das ist zugleich das _Nochmal prüfen_ des fertigen Zustands — es kostet eine
 * kleine Datei und einen Blick in den Speicher, aber keine 60 MB.
 */
async function refreshFull(): Promise<void> {
  if (!hasCacheStorage()) return setFull({ kind: 'kein-speicher', reason: 'cache' });
  if (!swControls()) return setFull({ kind: 'kein-speicher', reason: 'sw' });
  setFull({ kind: 'prüft' });
  fullList ??= await loadOfflineList(PAGE_BASE, BUILD_ID);
  if (!fullList) return setFull({ kind: 'keine-liste' });
  fullPlanned = fullPlan(fullList, await fullShelfIndex(), PAGE_BASE, ASSET_HASHES);
  fullHave = await cachedUrls();
  settleFull();
}

/** Was nach einem Blick in den Speicher dasteht: fertig, offen — oder lückenhaft. */
function settleFull(stopped = false, missing = 0): void {
  const plan = fullPlanned;
  if (!plan) return setFull({ kind: 'keine-liste' });
  const have = haveBytes(plan, fullHave);
  const open = pendingItems(plan, fullHave).length;
  if (stopped) return setFull({ kind: 'angehalten', have, total: plan.totalBytes });
  if (missing > 0) return setFull({ kind: 'lückenhaft', have, total: plan.totalBytes, missing });
  if (open === 0) return setFull({ kind: 'fertig', total: plan.totalBytes });
  setFull({ kind: 'offen', have, total: plan.totalBytes });
}

/**
 * **Der Lauf.** Der Balken wird höchstens viermal je Sekunde neu geschrieben —
 * bei sechs gleichzeitigen Dateien kämen sonst hunderte Anstriche je Sekunde
 * zusammen, und das Einzige, was daran schneller würde, wäre der Akku.
 *
 * Die Restzeit kommt aus dem Durchsatz der letzten acht Sekunden und wird
 * geglättet (`steadyEta`): kleiner sofort, größer nur mit Anlauf.
 */
async function runFullDownload(): Promise<void> {
  const plan = fullPlanned;
  if (!plan) return;
  if (
    !mayStartFull({
      hasCache: hasCacheStorage(),
      controlled: swControls(),
      hidden: document.hidden,
    })
  ) {
    return;
  }
  const todo = pendingItems(plan, fullHave);
  if (todo.length === 0) return settleFull();

  const rate = new Throughput(performance.now());
  let eta: number | null = null;
  let painted = 0;
  fullRunning = true;
  fullAbort = new AbortController();
  setFull({
    kind: 'läuft',
    have: haveBytes(plan, fullHave),
    total: plan.totalBytes,
    eta: null,
    missing: 0,
  });

  const result = await runFull(todo, haveBytes(plan, fullHave), fullAbort.signal, (tick) => {
    const now = performance.now();
    if (tick.justNow > 0) rate.add(now, tick.justNow);
    eta = steadyEta(eta, etaSeconds(plan.totalBytes - tick.have, rate.rate(now)));
    if (now - painted < 250) return;
    painted = now;
    setFull({
      kind: 'läuft',
      have: tick.have,
      total: plan.totalBytes,
      eta,
      missing: tick.missing,
    });
  });

  fullRunning = false;
  fullAbort = null;
  // Nachgezählt wird am Speicher und nicht an der eigenen Buchführung: Was der
  // Service Worker wirklich abgelegt hat, ist die einzige Zahl, die im Funkloch
  // zählt.
  fullHave = await cachedUrls();
  settleFull(result.stopped, result.missing);
  // Und das Vorwärmen darf wieder — falls überhaupt noch etwas offen ist.
  if (!playerAsked) whenIdle(() => void warmUp());
}

offlineStop.addEventListener('click', () => {
  fullAbort?.abort();
});

/**
 * **Nachsehen, ohne dass jemand drückt** — einmal je Start.
 *
 * Die Startseite holte hier lange ungefragt gar nichts, und das war richtig,
 * solange der Knopf die einzige Frage war. Jetzt ist die Frage eine andere:
 * „Fehlt mir etwas?" ist genau das, was man **vor** dem Funkloch wissen will
 * und nicht darin. Sie kostet zwei erzeugte Listen (`offline.json`, den Index
 * des Regals) und einen Blick in den Speicher — der Index ist ohnehin das,
 * was das Vorwärmen als Nächstes holt (`core/warmStart.ts`).
 *
 * **Erst wenn ein Service Worker antwortet.** Ohne ihn ist die Antwort immer
 * „kein Speicher", und beim allerersten Besuch übernimmt er erst nach dem
 * Anmelden. Dann wartet die Prüfung eben auf `controllerchange` — oder auf den
 * nächsten Start.
 */
let fullLookedOnce = false;

function watchFullState(): void {
  if (!hasCacheStorage()) return;
  const look = (): void => {
    if (!swControls() || fullLookedOnce) return;
    fullLookedOnce = true;
    whenIdle(() => void lookAtFull());
  };
  look();
  navigator.serviceWorker?.addEventListener('controllerchange', look);
}

async function lookAtFull(): Promise<void> {
  if (fullRunning || fullState.kind === 'läuft') return;
  await refreshFull();
  if (!autoStarts(fullState)) return;
  await runFullDownload();
}

// Wer den Tab weggeschaltet hatte, bevor der Lauf anfing (`mayStartFull`),
// bekommt ihn beim Zurückkommen — der Haken dafür ist nicht mehr abzuwählen.
document.addEventListener('visibilitychange', () => {
  if (document.hidden || fullRunning || !autoStarts(fullState)) return;
  void runFullDownload();
});

paintFull();

/**
 * Und der Service Worker dahinter (`src/sw.ts`): Er macht aus der Seite die
 * App, die auch ohne Netz startet — und er ist die Bedingung dafür, dass ein
 * Browser das Installieren überhaupt anbietet. Angemeldet wird erst, wenn die
 * Seite steht: Beim Start ist jedes Byte für die Hülle da und nicht für den
 * Speicher von übermorgen.
 *
 * **Und danach, wenn der Browser Luft hat, wird vorgewärmt** — in dieser
 * Reihenfolge und nicht andersherum: Was das Vorwärmen holt, soll durch den
 * Service Worker laufen und im Speicher liegenbleiben, sonst ist es beim
 * nächsten Start wieder weg.
 */
window.addEventListener('load', () => {
  registerServiceWorker();
  whenIdle(() => void bootApp());
  // Und, sobald der Service Worker antwortet: nachsehen, ob noch etwas fehlt.
  watchFullState();
  watchUpdates();
});

/** Wie oft nachgesehen wird, solange die App vorn liegt — halbstündlich. */
const UPDATE_EVERY_MS = 30 * 60_000;

/**
 * **Gibt es eine neue Version?** (`core/updateCheck.ts`) — beim Start, bei
 * jedem Zurückkommen in den Vordergrund und halbstündlich, solange die App
 * vorn liegt. Gefunden heißt **gefragt**, nicht neu geladen: Die Karte
 * (`ui/UpdatePrompt.ts`) bietet _Jetzt neu laden_ und _Später_, und bis dahin
 * läuft alles weiter. Wer _Später_ sagt, wird beim nächsten Zurückkommen
 * wieder gefragt. Nebenbei holt der Browser den neuen Service Worker schon
 * (`registration.update`), damit das Neuladen schnell geht.
 */
function watchUpdates(): void {
  if (!import.meta.env.PROD || !BUILD_ID) return;
  let prompt: UpdatePrompt | null = null;
  const ask = (): void => {
    prompt ??= new UpdatePrompt(() => window.location.reload());
    prompt.show();
  };
  const watch = new UpdateWatch({
    current: BUILD_ID,
    url: `${PAGE_BASE}index.html`,
    fetch: (url, init) => fetch(url, init),
    onNewer: () => {
      void navigator.serviceWorker
        ?.getRegistration()
        .then((registration) => registration?.update())
        .catch(() => undefined);
      app?.notify('Neue Version verfügbar');
      ask();
    },
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    if (watch.newer) ask();
    void watch.check();
  });
  setInterval(() => {
    if (!document.hidden) void watch.check();
  }, UPDATE_EVERY_MS);
  void watch.check(true);
}

/**
 * **Was nach dem ersten Bild kommt, und in welcher Reihenfolge.**
 *
 * Erst die App (three.js, der Renderer, das Menü), dann — und nur dann — das
 * Vorwärmen der Welt. Andersherum ginge es nicht: Vorwärmen _ist_ ein
 * `App.goTo`. Der Balken unter dem Knopf erzählt beides mit, und er hört auf,
 * sobald es nichts mehr zu erzählen gibt: hinter einer Lobby sofort, sonst
 * wenn die Welt steht — oder gleich, wenn gar nicht gewärmt wird (Daten
 * sparen, schmale Leitung, Tab im Hintergrund).
 */
async function bootApp(): Promise<void> {
  const ready = await ensureApp();
  if (!ready) return;
  await warmUp();
  // Was das Wärmen an der Welt geändert hat, hat `ensureWorld` schon gemalt.
  // Diese Zeile ist für den anderen Fall: Es wurde gar nicht gewärmt, und dann
  // soll unter dem Knopf nicht länger „die Spielwiese wird geladen" stehen —
  // die Hülle ist ja da.
  paintStart();
}

/**
 * **Und jede Geste schließt den Ton auf**, bis er wirklich läuft
 * (`core/audioUnlock.ts`).
 *
 * Der Druck auf _Starten_ tut es oben schon, und im Normalfall reicht das.
 * Diese Zeile ist für alles daneben: den Weg über das Menü, einen Start per
 * Adresse (`#kitchen`), eine Brille, die aus dem Ruhezustand zurückkommt und
 * den Kontext dabei angehalten hat. Sie kostet nichts — sobald der Kontext
 * läuft, meldet sie sich selbst wieder ab.
 */
armAudioUnlock();

window.addEventListener('hashchange', () => {
  const id = window.location.hash.slice(1);
  if (!findWorld(id)) return;
  // Eine Welt in der Adresse ist eine Anforderung des Spielers: Das Vorwärmen
  // tritt zurück, statt ihr die Leitung streitig zu machen.
  stopWarming();
  withApp((ready) => void ready.goTo(id));
});

/**
 * **Eine Welt kam nicht — weil die Seite aus einem alten Build läuft.**
 *
 * Warum das passiert und woran man es erkennt, steht in `core/staleBuild.ts`.
 * Hier steht nur, was daraufhin zu tun ist, und das kann keine Welt und keine
 * App: die gewünschte Welt in die Adresse schreiben und **einmal** neu laden.
 * Danach ist die Seite frisch, der Chunk liegt wieder da, wo sein Name sagt,
 * und man steht dort, wo man hinwollte, statt dort, wo man war.
 *
 * Gezählt wird im `sessionStorage`, denn das Gedächtnis muss das Neuladen
 * überleben — und ohne dieses Gedächtnis wird lieber gar nicht neu geladen:
 * Eine Seite, die sich in einer Schleife selbst neu lädt, ist schlimmer als
 * eine, die einmal eine Welt nicht öffnet.
 */
function recoverFromStaleBuild(id: string, error: unknown): void {
  if (!isStaleModuleError(error)) return;

  let store: Storage;
  try {
    store = window.sessionStorage;
    if (!shouldReload(id, store.getItem(RELOADED_FOR))) return;
    store.setItem(RELOADED_FOR, id);
  } catch {
    return;
  }

  window.history.replaceState(null, '', `#${id}`);
  window.location.reload();
}

function hideLanding(): void {
  if (landing.hidden) return;
  landing.classList.add('is-hiding');
  window.setTimeout(() => {
    landing.hidden = true;
    landing.classList.remove('is-hiding');
  }, 400);
}
