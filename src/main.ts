import './style.css';
import { App } from './core/App';
import { detectFlatRole, detectXRSupport } from './core/device';
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

const params = new URLSearchParams(window.location.search);
const requested = window.location.hash.slice(1) || params.get('world') || DEFAULT_WORLD;
const startWorld = findWorld(requested)?.id ?? DEFAULT_WORLD;

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
    if (presenting) hideLanding();
  },
});

void app.goTo(startWorld);

// Handy for debugging from the browser console.
(window as unknown as { bgvr: App }).bgvr = app;

// Optional: several tabs (or devices on the same browser profile) share a room.
const room = params.get('room');
if (room) void app.connectLocalNetwork(room);

void detectXRSupport().then((support) => {
  enterVrButton.textContent = 'Enter VR';
  enterVrButton.disabled = !support.immersiveVR;
  statusLine.textContent = support.immersiveVR
    ? 'VR-Gerät erkannt.'
    : (support.reason ?? 'Kein VR-Gerät gefunden.');
});

enterVrButton.addEventListener('click', async () => {
  enterVrButton.disabled = true;
  try {
    await app.enterVR();
  } catch (error) {
    statusLine.textContent = `VR-Start fehlgeschlagen: ${(error as Error).message}`;
    statusLine.classList.add('is-error');
    enterVrButton.disabled = false;
  }
});

enterFlatButton.addEventListener('click', () => {
  hideLanding();
  hud.hidden = false;
  touch.hidden = detectFlatRole() !== 'handheld';
});

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
