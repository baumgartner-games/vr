import './style.css';
import { App } from './core/App';
import { NetPanel } from './ui/NetPanel';
import { detectFlatRole, detectXRSupport } from './core/device';
import { normalizeRoomCode, rememberName, rememberedName } from './net/room';
import { HAUNT_ROOM } from './worlds/haunting/net';
import { playerPosture, savePlayerPosture, type Posture } from './core/posture';
import { DEFAULT_WORLD, findWorld } from './worlds';
import { isStaleModuleError, shouldReload } from './core/staleBuild';

const canvas = document.querySelector<HTMLCanvasElement>('#scene')!;
const landing = document.querySelector<HTMLElement>('#landing')!;
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
const hauntJoin = document.querySelector<HTMLButtonElement>('#haunt-join')!;
const hauntStatus = document.querySelector<HTMLElement>('#haunt-status')!;

/** Wofür zuletzt gegen einen alten Build neu geladen wurde. */
const RELOADED_FOR = 'bgvr:stale-reload';

const params = new URLSearchParams(window.location.search);
const requested = window.location.hash.slice(1) || params.get('world') || DEFAULT_WORLD;
const startWorld = findWorld(requested)?.id ?? DEFAULT_WORLD;

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
      onNetChanged: () => netPanel?.refresh(),
      onWorldFailed: (id, error) => recoverFromStaleBuild(id, error),
    });
  } catch (error) {
    const webgl = /webgl|graphics context/i.test(String(error));
    statusLine.textContent = webgl
      ? '3D ist in diesem Browser nicht verfügbar. Bitte WebGL bzw. Grafikbeschleunigung aktivieren oder einen Browser mit WebGL-Unterstützung verwenden und die Seite neu laden.'
      : 'Das Spiel konnte nicht gestartet werden. Bitte die Seite neu laden.';
    statusLine.classList.add('is-error');
    statusLine.setAttribute('role', 'alert');
    enterVrButton.textContent = '3D-Start nicht verfügbar';
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

void app.goTo(startWorld);

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

// Wer die Seite mit `#haunting` öffnet, ist eingeladen worden und sucht genau
// einen Knopf. Der steht unter *Zusammen spielen* — also klappt der Abschnitt
// gleich auf, statt dass jemand ihn suchen muss.
if (startWorld === 'haunting') {
  document.querySelector<HTMLDetailsElement>('#net-setup')?.setAttribute('open', '');
}

hauntName.value = rememberedName();

void detectXRSupport().then((support) => {
  enterVrButton.textContent = 'Enter VR';
  enterVrButton.disabled = !support.immersiveVR;
  statusLine.textContent = support.immersiveVR
    ? 'VR-Gerät erkannt.'
    : (support.reason ?? 'Kein VR-Gerät gefunden.');
});

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

async function startVR(): Promise<void> {
  enterVrButton.disabled = true;
  try {
    await app.enterVR();
  } catch (error) {
    statusLine.textContent = `VR-Start fehlgeschlagen: ${(error as Error).message}`;
    statusLine.classList.add('is-error');
    enterVrButton.disabled = false;
  }
}

function startFlat(): void {
  hideLanding();
  hud.hidden = false;
  touch.hidden = detectFlatRole() !== 'handheld';
}

/**
 * **Haunting: nur der Name, kein Code.**
 *
 * Alle spielen im Raum `haunting` (`worlds/haunting/net.ts`) — der VR-Spieler,
 * weil die Welt ihn beim Betreten dorthin holt, und die Web-Spieler über
 * diesen Knopf. Ein Raum-Code wäre hier eine Zeile Arbeit für jeden am Tisch,
 * und zwar dieselbe.
 */
hauntJoin.addEventListener('click', () => {
  void (async () => {
    const name = hauntName.value.trim();
    hauntStatus.classList.remove('is-error');
    hauntStatus.textContent = 'Verbinde …';
    try {
      if (!app.net.connected) {
        await app.connect({
          room:
            normalizeRoomCode(new URLSearchParams(location.search).get('room') || '') || HAUNT_ROOM,
          name,
          local: app.preferLocal,
        });
      }
      rememberName(name);
      hauntStatus.textContent = `Im Raum ${app.net.room}. Willkommen in der Einsatzzentrale.`;
      startFlat();
      await app.goTo('haunting');
    } catch (error) {
      hauntStatus.textContent = `Verbindung fehlgeschlagen: ${(error as Error).message}`;
      hauntStatus.classList.add('is-error');
    }
  })();
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
