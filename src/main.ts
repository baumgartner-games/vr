import './style.css';
import { App } from './core/App';
import { NetPanel } from './ui/NetPanel';
import { detectFlatRole, detectXRSupport } from './core/device';
import { normalizeRoomCode, rememberName, rememberedName } from './net/room';
import { HAUNT_ROOM, hauntRoomFrom } from './worlds/haunting/net';
import { arriveAs, loadLobby, saveLobby, type Entry } from './worlds/haunting/rules/lobby';
import { playerPosture, savePlayerPosture, type Posture } from './core/posture';
import { DEFAULT_WORLD, findWorld } from './worlds';
import { isStaleModuleError, shouldReload } from './core/staleBuild';

const canvas = document.querySelector<HTMLCanvasElement>('#scene')!;
const landing = document.querySelector<HTMLElement>('#landing')!;
const landingTitle = document.querySelector<HTMLElement>('#landing-title')!;
const enterVrButton = document.querySelector<HTMLButtonElement>('#enter-vr')!;
const enterFlatButton = document.querySelector<HTMLButtonElement>('#enter-flat')!;
const statusLine = document.querySelector<HTMLElement>('#xr-status')!;
const hud = document.querySelector<HTMLElement>('#hud')!;
const hudWorld = document.querySelector<HTMLElement>('#hud-world')!;
const hudMenu = document.querySelector<HTMLButtonElement>('#hud-menu')!;
const hudVr = document.querySelector<HTMLButtonElement>('#hud-vr')!;
const touch = document.querySelector<HTMLElement>('#touch')!;
const stick = document.querySelector<HTMLElement>('#touch-stick')!;
const postureSeg = document.querySelector<HTMLElement>('#posture')!;
const hauntName = document.querySelector<HTMLInputElement>('#haunt-name')!;
const hauntRoom = document.querySelector<HTMLInputElement>('#haunt-room')!;
const hauntConnect = document.querySelector<HTMLButtonElement>('#haunt-connect')!;
const hauntStatus = document.querySelector<HTMLElement>('#haunt-status')!;
const hauntVr = document.querySelector<HTMLButtonElement>('#haunt-vr')!;
const hauntFlat = document.querySelector<HTMLButtonElement>('#haunt-flat')!;
const hauntCentre = document.querySelector<HTMLButtonElement>('#haunt-centre')!;
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
 * einen von drei Wegen (Brille, Web 3D, 2D Einsatzzentrale). Alles andere auf
 * der Seite ist für ihn Rauschen und wird versteckt (`style.css`,
 * `only-generic`).
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

const app = (() => {
  try {
    return new App(canvas, stick, {
      onWorldChanged: (id, title) => {
        hudWorld.textContent = title;
        if (window.location.hash.slice(1) !== id) {
          window.history.replaceState(null, '', `#${id}`);
        }
      },
      onSessionChanged: (presenting) => {
        hud.hidden = presenting;
        touch.hidden = presenting || detectFlatRole() !== 'handheld';
        hudVr.textContent = presenting ? 'VR beenden' : 'VR';
        if (presenting) {
          netPanel?.toggle(false);
          hideLanding();
        }
      },
      // Eine Welt mit eigener Steuerung nimmt den Bordstock weg; `true` heißt,
      // dass wieder die Seite entscheidet (`WorldContext.touchStick`).
      onTouchStick: (on) => {
        touch.hidden = !on || detectFlatRole() !== 'handheld';
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
    enterVrButton.textContent = '3D-Start nicht verfügbar';
    hauntVr.textContent = '3D-Start nicht verfügbar';
    for (const button of landing.querySelectorAll<HTMLButtonElement>('button'))
      button.disabled = true;
    throw error;
  }
})();

app.preferLocal = params.get('net') === 'local';

netPanel = new NetPanel(app, {
  local: app.preferLocal,
  // Joining a room from the landing page also starts the game — the two
  // buttons there say which way.
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

void detectXRSupport().then((support) => {
  for (const button of [enterVrButton, hauntVr]) {
    button.textContent = 'Enter VR';
    button.disabled = !support.immersiveVR;
  }
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

enterVrButton.addEventListener('click', () => void startVR());

enterFlatButton.addEventListener('click', () => startFlat());

async function startVR(button: HTMLButtonElement = enterVrButton): Promise<void> {
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
  touch.hidden = detectFlatRole() !== 'handheld';
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
  for (const button of [hauntConnect, hauntFlat, hauntCentre]) button.disabled = hauntBusy;
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
 * **Einer der drei Wege aus der Lobby hinein** — alle bleiben im Raum.
 *
 * - `vr`: die Brille. Die XR-Sitzung wird **zuerst** angefragt, noch aus dem
 *   Klick heraus: Ein Browser gibt eine immersive Sitzung nur auf eine frische
 *   Geste, und die wäre nach einem Verbinden verbraucht. Der Rest läuft daneben.
 * - `technician`: Web 3D, der Techniker am Bildschirm; `centre`: die 2D
 *   Einsatzzentrale. Beide sagen der Lobby, was dieses Gerät ist und wie es
 *   sieht (`arriveAs`), **bevor** die Welt geladen wird — sie liest die Wahl
 *   beim Aufbau aus dem Speicher.
 *
 * Die Knöpfe stehen nur in der Lobby, man ist also verbunden; `joinHaunting`
 * läuft trotzdem noch einmal — wer den Code nach dem Verbinden geändert hat,
 * zieht damit um. Scheitert das, geht es trotzdem hinein: Die Welt versucht
 * es beim Betreten noch einmal (`joinTable`) und sagt dort, woran es hängt.
 */
async function startHaunting(way: 'vr' | Entry): Promise<void> {
  const session = way === 'vr' ? startVR(hauntVr) : null;
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
hauntVr.addEventListener('click', () => void startHaunting('vr'));
hauntFlat.addEventListener('click', () => void startHaunting('technician'));
hauntCentre.addEventListener('click', () => void startHaunting('centre'));

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
