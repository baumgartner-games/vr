import './style.css';
import { App } from './core/App';
import { NetPanel } from './ui/NetPanel';
import { detectFlatRole, detectXRSupport } from './core/device';
import { normalizeRoomCode, rememberName, rememberedName } from './net/room';
import { HAUNT_ROOM, hauntRoomFrom } from './worlds/haunting/net';
import { arriveAs, loadLobby, saveLobby, type Entry } from './worlds/haunting/rules/lobby';
import { playerPosture, savePlayerPosture, type Posture } from './core/posture';
import {
  SCREEN_VIEW_LABELS,
  SCREEN_VIEW_SUBS,
  onScreenViewChange,
  screenView,
  startOptions,
  type ScreenView,
} from './core/screenView';
import { DEFAULT_WORLD, findWorld } from './worlds';
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
import { graphics, onGraphicsChange } from './core/graphicsSettings';
import { firstGamepad } from './core/gamepad';

const canvas = document.querySelector<HTMLCanvasElement>('#scene')!;
const landing = document.querySelector<HTMLElement>('#landing')!;
const landingTitle = document.querySelector<HTMLElement>('#landing-title')!;
const enterButton = document.querySelector<HTMLButtonElement>('#enter')!;
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
  tool: document.querySelector<HTMLElement>('#hud-tool'),
  menu: document.querySelector<HTMLElement>('#hud-menu'),
};
const postureSeg = document.querySelector<HTMLElement>('#posture')!;
const postureField = document.querySelector<HTMLElement>('#posture-field')!;
const screenSeg = document.querySelector<HTMLElement>('#screen-view')!;
const screenField = document.querySelector<HTMLElement>('#screen-view-field')!;
const screenHint = document.querySelector<HTMLElement>('#screen-view-hint')!;
const hauntName = document.querySelector<HTMLInputElement>('#haunt-name')!;
const hauntRoom = document.querySelector<HTMLInputElement>('#haunt-room')!;
const hauntConnect = document.querySelector<HTMLButtonElement>('#haunt-connect')!;
const hauntStatus = document.querySelector<HTMLElement>('#haunt-status')!;
const hauntEnter = document.querySelector<HTMLButtonElement>('#haunt-enter')!;
const hauntEnterHint = document.querySelector<HTMLElement>('#haunt-enter-hint')!;
const hauntXrStatus = document.querySelector<HTMLElement>('#haunt-xr-status')!;
const hauntLobby = document.querySelector<HTMLElement>('#haunt-lobby')!;
const hauntPeers = document.querySelector<HTMLElement>('#haunt-peers')!;

/** Wofür zuletzt gegen einen alten Build neu geladen wurde. */
const RELOADED_FOR = 'bgvr:stale-reload';

const params = new URLSearchParams(window.location.search);
const requested = window.location.hash.slice(1) || params.get('world') || DEFAULT_WORLD;
const startWorld = findWorld(requested)?.id ?? DEFAULT_WORLD;

/**
 * **Die Startseite einer Runde statt der Spielwiese.** Wer `#haunting` öffnet,
 * wurde eingeladen und will in zwei Schritten hinein: erst in die **Lobby**
 * (Name, Raum-Code der Gruppe, Verbinden — und sehen, wer schon da ist), dann
 * mit **einem Knopf** hinein. Wohin der führt, sagt das Gerät und die Wahl
 * darüber: mit Brille hinein, sonst an den Bildschirm — und dort in die 2D
 * Einsatzzentrale oder als Techniker ins Schiff. Alles andere auf der Seite ist
 * für ihn Rauschen und wird versteckt (`style.css`, `only-generic`).
 */
const hauntLanding = startWorld === 'haunting';
if (hauntLanding) {
  landing.dataset['landing'] = 'haunting';
  landingTitle.textContent = 'Haunting / Orbital';
}
/** Ob gerade von dieser Seite aus verbunden wird — dann wartet jeder Knopf. */
let hauntBusy = false;
/** Was der letzte Versuch zu verbinden zu sagen hatte, wenn er scheiterte. */
let hauntError = '';

let netPanel: NetPanel | null = null;

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

const app = (() => {
  try {
    return new App(canvas, pads, {
      onWorldChanged: (id, title) => {
        hudWorld.textContent = title;
        if (window.location.hash.slice(1) !== id) {
          window.history.replaceState(null, '', `#${id}`);
        }
      },
      onSessionChanged: (presenting) => {
        hud.hidden = presenting;
        inSession = presenting;
        showPads();
        hudVr.textContent = presenting ? 'VR beenden' : 'VR';
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
        refreshHaunt();
      },
      onWorldFailed: (id, error) => recoverFromStaleBuild(id, error),
    });
  } catch (error) {
    const webgl = /webgl|graphics context/i.test(String(error));
    setXrStatus(
      webgl
        ? '3D ist in diesem Browser nicht verfügbar. Bitte WebGL bzw. Grafikbeschleunigung aktivieren oder einen Browser mit WebGL-Unterstützung verwenden und die Seite neu laden.'
        : 'Das Spiel konnte nicht gestartet werden. Bitte die Seite neu laden.',
      true,
    );
    for (const line of [statusLine, hauntXrStatus]) line.setAttribute('role', 'alert');
    for (const button of [enterButton, hauntEnter]) button.textContent = '3D-Start nicht verfügbar';
    for (const button of landing.querySelectorAll<HTMLButtonElement>('button'))
      button.disabled = true;
    throw error;
  }
})();

app.preferLocal = params.get('net') === 'local';

netPanel = new NetPanel(app, {
  local: app.preferLocal,
  // Joining a room from the landing page also starts the game — the two
  // buttons there say which way. Ob die Welt dabei flach oder räumlich
  // aussieht, sagt die Ansicht und nicht dieser Knopf.
  onStart: (mode) => {
    if (mode === 'vr') void startVR();
    else startFlat();
  },
});

// **Haunting lädt erst, wenn jemand hineinwill.** Die Welt holt sich beim
// Betreten selbst einen Raum, wenn sie in keinem ist (`joinTable`) — und die
// Startseite fragt genau das erst noch ab. Wer die Welt schon jetzt lüde, hätte
// zwei, die gleichzeitig verbinden wollen. Sichtbar ist ohnehin nur die
// Startseite; die Welt kommt mit dem Knopf (`startHaunting`).
if (!hauntLanding) void app.goTo(startWorld);

// Handy for debugging from the browser console.
(window as unknown as { bgvr: App }).bgvr = app;

// `?room=` prefills the code (a shared link), so only one tap is left to join.
const room = normalizeRoomCode(params.get('room') ?? '');
if (room) {
  netPanel.setRoom(room);
  document.querySelector<HTMLDetailsElement>('#net-setup')?.setAttribute('open', '');
} else {
  netPanel.restoreLastRoom();
}

hauntName.value = rememberedName();
hauntRoom.value = hauntRoomFrom(window.location.search);
refreshHaunt();

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

void detectXRSupport().then((support) => {
  headset = support.immersiveVR;
  showStart();
  setXrStatus(
    support.immersiveVR ? 'VR-Gerät erkannt.' : (support.reason ?? 'Kein VR-Gerät gefunden.'),
  );
});

/** Dieselbe Zeile unter beiden Gesichtern der Seite. */
function setXrStatus(text: string, error = false): void {
  for (const line of [statusLine, hauntXrStatus]) {
    line.textContent = text;
    line.classList.toggle('is-error', error);
  }
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
  app.rig.posture = picked;
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
  screenHint.textContent = hauntLanding
    ? ENTRY_HINTS[view]
    : view === '2d'
      ? `${SCREEN_VIEW_SUBS['2d']} Umschalten geht auch im Spiel: Menü → Ansicht.`
      : SCREEN_VIEW_SUBS['3d'];
}

/** Was auf den einen Knopf folgt, in einer Zeile — je nachdem, wohin er führt. */
const ENTRY_HINTS: Record<'vr' | ScreenView, string> = {
  vr: 'Die Brille: der Techniker im Anzug, draußen im Schiff.',
  '2d': 'Am Handy oder Laptop: Archiv, Schalttafel, Späher, Zuschauer oder Monster — die Karte von oben.',
  '3d': 'Techniker am Bildschirm, im Schiff — Tastatur und Maus oder Stock.',
};

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
  for (const button of [enterButton, hauntEnter]) button.textContent = options.label;
  hauntEnterHint.textContent = ENTRY_HINTS[options.way];
  showPosture(playerPosture());
  showScreenView(view);
}

showStart();
onScreenViewChange(showStart);
screenSeg.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
  const picked = button?.dataset['view'];
  if (picked !== '2d' && picked !== '3d') return;
  // Die App merkt sich die Wahl selbst und schaltet die laufende Welt um; die
  // Startseite liegt ja nur davor. `setScreenView` schreibt sie auch in den
  // Speicher, deshalb hier kein zweites `saveScreenView`.
  app.setScreenView(picked);
});

/**
 * **Der eine Knopf der Spielwiese.** Wohin er führt, steht eine Zeile darüber:
 * in die Brille — oder an den Bildschirm, in die Welt, die ohnehin schon
 * geladen ist.
 *
 * Ob man sie von oben oder aus den Augen sieht, entscheidet nicht dieser
 * Knopf, sondern die Ansicht (`App.setScreenView`): **Jede** Welt kann von
 * oben (`core/TopDownCamera.ts` — dieselbe Szene, eine Kamera darüber), und
 * die Wahl gilt für die, in der man steht. Vorher führte „2D" hier nach
 * Haunting, weil es die Karte von oben nur dort gab — ein Umweg, den es jetzt
 * nicht mehr braucht.
 */
enterButton.addEventListener('click', () => {
  if (startOptions(headset, screenView(detectFlatRole())).way === 'vr') void startVR();
  else startFlat();
});

// Dasselbe Menü wie im Spiel, schon auf der Startseite: Welten, Bewegung,
// Aussehen, Grafik — als Seite (`ui/PageMenu.ts`), weil hier keine Brille auf ist.
landingMenu.addEventListener('click', () => app.toggleMenu());

async function startVR(button: HTMLButtonElement = enterButton): Promise<void> {
  button.disabled = true;
  try {
    await app.enterVR();
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

// --- Haunting: Name, Raum-Code, drei Wege in denselben Raum -------------------

/** Wie die Geräte in der Lobby heißen — nach dem, was sie sind. */
const DEVICE_LABELS: Record<string, string> = {
  vr: 'Brille',
  desktop: 'Bildschirm',
  handheld: 'Handy',
};

/**
 * Die Statuszeile, die Lobby und die Knöpfe der Runden-Startseite, aus dem
 * Stand der Verbindung — gezeichnet bei jedem `onNetChanged`, also auch dann,
 * wenn in den Raum noch jemand kommt, während man die Seite offen hat. **Die
 * drei Wege gibt es erst in der Lobby**: Wer noch nicht verbunden ist, sieht
 * nur Name, Code und Verbinden — so kommen erst alle zusammen, und dann geht
 * jeder seinen Weg in denselben Raum.
 */
function refreshHaunt(): void {
  if (!hauntLanding) return;
  const net = app.net;
  let text: string;
  if (hauntBusy) text = 'Verbinde …';
  else if (hauntError) text = `Verbindung fehlgeschlagen: ${hauntError}`;
  else if (net.connected) {
    const others = net.peers.size;
    text =
      `Lobby „${net.room}" · ` +
      (others === 0
        ? 'noch niemand sonst da'
        : others === 1
          ? 'ein weiteres Gerät'
          : `${others} weitere Geräte`);
  } else text = 'Noch nicht verbunden — Name und Raum-Code eintragen.';
  hauntStatus.textContent = text;
  hauntStatus.classList.toggle('is-error', Boolean(hauntError) && !hauntBusy);
  hauntStatus.classList.toggle('is-online', !hauntError && !hauntBusy && net.connected);
  hauntConnect.textContent = hauntBusy ? '…' : net.connected ? 'Neu verbinden' : 'Verbinden';
  for (const button of [hauntConnect, hauntEnter]) button.disabled = hauntBusy;
  hauntLobby.hidden = !net.connected;
  if (net.connected) renderHauntPeers();
}

/** Die Liste der Lobby: ich zuerst, dann alle anderen im Raum. */
function renderHauntPeers(): void {
  const net = app.net;
  const row = (name: string, role: string, note: string, me: boolean): HTMLElement => {
    const item = document.createElement('li');
    const dot = document.createElement('span');
    dot.className = 'haunt-peers__dot';
    dot.style.color = me ? '#4aa8ff' : '#7fe0a8';
    const who = document.createElement('strong');
    // `textContent`, nie `innerHTML`: fremde Namen sind fremder Text.
    who.textContent = name;
    const what = document.createElement('span');
    what.className = 'haunt-peers__role';
    what.textContent = note
      ? `${DEVICE_LABELS[role] ?? role} · ${note}`
      : (DEVICE_LABELS[role] ?? role);
    item.append(dot, who, what);
    if (me) {
      const tag = document.createElement('span');
      tag.className = 'haunt-peers__me';
      tag.textContent = 'du';
      item.append(tag);
    }
    return item;
  };
  const rows = [row(net.name, net.role, '', true)];
  for (const peer of net.peers.values())
    rows.push(row(peer.name, peer.role, peer.world === 'haunting' ? 'schon drin' : '', false));
  hauntPeers.replaceChildren(...rows);
}

/**
 * **In den Raum, der in den Feldern steht** — mit dem Namen daneben.
 *
 * Steht man schon in genau diesem Raum, wird höchstens der Name nachgetragen;
 * steht man in einem anderen, wird umgezogen. Ohne Code gilt der gemeinsame
 * Raum `haunting`, und ein eigener Code wandert als `?room=` in die Adresse,
 * damit ein Neuladen ihn behält und der Link sich weitergeben lässt — genau
 * die Zeile, die die Welt selbst liest (`hauntRoomFrom`).
 *
 * @returns ob man danach im Raum steht.
 */
async function joinHaunting(): Promise<boolean> {
  const wanted = normalizeRoomCode(hauntRoom.value) || HAUNT_ROOM;
  const name = hauntName.value.trim();
  rememberName(name);
  if (app.net.connected && app.net.room === wanted) {
    if (name && name !== app.net.name) app.setPlayerName(name);
    refreshHaunt();
    return true;
  }
  if (hauntBusy) return false;
  hauntBusy = true;
  hauntError = '';
  refreshHaunt();
  try {
    if (app.net.connected) app.disconnect();
    await app.connect({ room: wanted, name, local: app.preferLocal });
    writeRoomToAddress(wanted);
    return true;
  } catch (error) {
    hauntError = (error as Error).message;
    return false;
  } finally {
    hauntBusy = false;
    refreshHaunt();
  }
}

function writeRoomToAddress(code: string): void {
  const url = new URL(window.location.href);
  if (code === HAUNT_ROOM) url.searchParams.delete('room');
  else url.searchParams.set('room', code);
  window.history.replaceState(null, '', url);
}

/**
 * **Einer der drei Wege aus der Lobby hinein** — alle bleiben im Raum, und
 * welcher es ist, hat der eine Knopf schon entschieden
 * (`core/screenView.startOptions`).
 *
 * - `vr`: die Brille. Die XR-Sitzung wird **zuerst** angefragt, noch aus dem
 *   Klick heraus: Ein Browser gibt eine immersive Sitzung nur auf eine frische
 *   Geste, und die wäre nach einem Verbinden verbraucht. Der Rest läuft daneben.
 * - `technician`: Web 3D, der Techniker am Bildschirm; `centre`: die 2D
 *   Einsatzzentrale. Beide sagen der Lobby, was dieses Gerät ist und wie es
 *   sieht (`arriveAs`), **bevor** die Welt geladen wird — sie liest die Wahl
 *   beim Aufbau aus dem Speicher.
 *
 * Der Knopf steht nur in der Lobby, man ist also verbunden; `joinHaunting`
 * läuft trotzdem noch einmal — wer den Code nach dem Verbinden geändert hat,
 * zieht damit um. Scheitert das, geht es trotzdem hinein: Die Welt versucht
 * es beim Betreten noch einmal (`joinTable`) und sagt dort, woran es hängt.
 */
async function startHaunting(way: 'vr' | Entry): Promise<void> {
  const session = way === 'vr' ? startVR(hauntEnter) : null;
  if (way !== 'vr') saveLobby(arriveAs(loadLobby(undefined, detectFlatRole()), way));
  await joinHaunting();
  if (way !== 'vr') startFlat();
  await app.goTo('haunting');
  if (session) await session;
}

hauntConnect.addEventListener('click', () => void joinHaunting());
for (const input of [hauntName, hauntRoom]) {
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') void joinHaunting();
  });
}
// **Ein Knopf, drei Wege.** Welcher, sagt das Gerät und die Wahl darüber —
// dieselbe Rechnung wie auf der Spielwiese (`core/screenView.startOptions`).
hauntEnter.addEventListener('click', () => {
  const way = startOptions(headset, screenView(detectFlatRole())).way;
  void startHaunting(way === 'vr' ? 'vr' : way === '2d' ? 'centre' : 'technician');
});

hudMenu.addEventListener('click', () => app.toggleMenu());

// `void (async () => …)()` statt eines `async`-Handlers: Ein Klick-Handler, der
// eine Promise zurückgibt, wird von niemandem abgewartet — was darin schiefgeht,
// fällt sonst still auf den Boden.
hudVr.addEventListener('click', () => {
  void (async () => {
    if (app.renderer.xr.isPresenting) {
      await app.endVR();
      return;
    }
    try {
      await app.enterVR();
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
 * Und der Service Worker dahinter (`src/sw.ts`): Er macht aus der Seite die
 * App, die auch ohne Netz startet — und er ist die Bedingung dafür, dass ein
 * Browser das Installieren überhaupt anbietet. Angemeldet wird erst, wenn die
 * Seite steht: Beim Start ist jedes Byte für die Welt da und nicht für den
 * Speicher von übermorgen.
 */
window.addEventListener('load', registerServiceWorker);

window.addEventListener('hashchange', () => {
  const id = window.location.hash.slice(1);
  if (findWorld(id)) void app.goTo(id);
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
