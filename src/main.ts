import './style.css';
import { App } from './core/App';
import { NetPanel } from './ui/NetPanel';
import { detectFlatRole, detectXRSupport } from './core/device';
import { normalizeRoomCode } from './net/room';
import { playerPosture, savePlayerPosture, type Posture } from './core/posture';
import { DEFAULT_WORLD, findWorld } from './worlds';

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

const params = new URLSearchParams(window.location.search);
const requested = window.location.hash.slice(1) || params.get('world') || DEFAULT_WORLD;
const startWorld = findWorld(requested)?.id ?? DEFAULT_WORLD;

let netPanel: NetPanel | null = null;

const app = new App(canvas, stick, {
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
});

netPanel = new NetPanel(app, {
  local: params.get('net') === 'local',
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

hudMenu.addEventListener('click', () => app.toggleMenu());

hudVr.addEventListener('click', async () => {
  if (app.renderer.xr.isPresenting) {
    await app.endVR();
    return;
  }
  try {
    await app.enterVR();
  } catch (error) {
    console.warn('[xr] Sitzung konnte nicht gestartet werden', error);
  }
});

window.addEventListener('hashchange', () => {
  const id = window.location.hash.slice(1);
  if (findWorld(id)) void app.goTo(id);
});

function hideLanding(): void {
  if (landing.hidden) return;
  landing.classList.add('is-hiding');
  window.setTimeout(() => {
    landing.hidden = true;
    landing.classList.remove('is-hiding');
  }, 400);
}
