import './tools.css';
import { TOOL_IDS, createTool } from '../worlds/portal/tools';
import { drawMenuIcon } from '../ui/menu';
import { TOOL_GRIPS } from '../core/handPose';
import { ToolViewer, type HandMode } from './viewer';

/**
 * **Die Werkzeugseite** — alles, was man in die Hand nehmen kann, im Browser.
 *
 * Sie ist kein Spiel und will keines sein: kein WebXR, keine Physik, keine Welt.
 * Wozu sie da ist, sieht man am Telefon — eine Liste, auf der man ein Werkzeug
 * antippt, es mit dem Finger dreht und dabei die Boxhand daran ein- und
 * ausschaltet. Das geht in der Brille nur, indem man in den Eingaberaum läuft
 * und einen Stand bedient, und für „wie sieht das eigentlich aus" ist das ein
 * weiter Weg.
 *
 * Zwei Zustände, ein Kopf: die Übersicht trägt links das Burger-Symbol, ein
 * einzelnes Werkzeug den Pfeil zurück. Welcher gilt, steht im **Hash** und
 * nicht in einer Variablen — damit tut der Zurück-Knopf des Browsers dasselbe
 * wie der im Kopf, und ein Link auf ein einzelnes Werkzeug ist ein Link.
 *
 * Gebaut werden die Modelle mit demselben `createTool` wie im Spiel. Eine Seite
 * mit eigenen, hübscheren Kopien zeigt irgendwann etwas anderes als das Spiel,
 * und dann ist sie schlimmer als keine.
 */

const nav = document.querySelector<HTMLButtonElement>('#nav')!;
const back = document.querySelector<HTMLButtonElement>('#back')!;
const title = document.querySelector<HTMLElement>('#title')!;
const hands = document.querySelector<HTMLElement>('#hands')!;
const drawer = document.querySelector<HTMLElement>('#drawer')!;
const grid = document.querySelector<HTMLElement>('#grid')!;
const detail = document.querySelector<HTMLElement>('#detail')!;
const stage = document.querySelector<HTMLCanvasElement>('#stage')!;
const hint = document.querySelector<HTMLElement>('#hint')!;

const HAND_STORE = 'bgvr.toolPageHand';
const viewer = new ToolViewer(stage);

/** Was auf einer Kachel steht — einmal aus dem Werkzeug selbst gelesen. */
interface Entry {
  id: string;
  label: string;
  hint: string;
  icon: Parameters<typeof drawMenuIcon>[1];
  accent: number;
}

/**
 * Die Liste, aus dem Spiel gelesen statt hier gepflegt.
 *
 * Jedes Werkzeug wird einmal gebaut, nach Name, Symbol und Farbe gefragt und
 * gleich wieder weggeworfen. Das ist ein paar Millisekunden teurer als eine
 * getippte Tabelle und dafür nie veraltet: ein neues Werkzeug steht hier, sobald
 * es in `TOOL_IDS` steht.
 */
function readEntries(): Entry[] {
  const entries: Entry[] = [];
  for (const id of TOOL_IDS) {
    const tool = createTool(id);
    if (!tool) continue;
    entries.push({
      id,
      label: tool.label,
      hint: tool.hint || gripLine(id),
      icon: tool.icon,
      accent: tool.accent,
    });
    tool.disposeTool();
  }
  return entries;
}

/** Ein Satz für ein Werkzeug, das selbst keinen Hinweis mitbringt. */
function gripLine(id: string): string {
  const kind = TOOL_GRIPS[id];
  if (kind === 'pistol') return 'Standardgriff, wie eine Pistole gehalten';
  if (kind === 'rod') return 'Standardgriff, wie ein Stab gehalten';
  return 'In die Hand nehmen und ausprobieren';
}

const entries = readEntries();
const byId = new Map(entries.map((entry) => [entry.id, entry]));

// --- die Übersicht -----------------------------------------------------------

for (const entry of entries) {
  const item = document.createElement('li');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tile';
  button.append(
    iconCanvas(entry),
    line('tile__label', entry.label),
    line('tile__hint', entry.hint),
  );
  button.addEventListener('click', () => {
    window.location.hash = entry.id;
  });
  item.append(button);
  grid.append(item);
}

function line(className: string, text: string): HTMLElement {
  const element = document.createElement('span');
  element.className = className;
  element.textContent = text;
  return element;
}

/**
 * Das Symbol einer Kachel — gezeichnet von demselben `drawMenuIcon`, das es
 * auch im Handgelenk-Menü zeichnet.
 *
 * Ein `<canvas>` und kein SVG, genau deswegen: die Zeichnungen liegen in
 * `ui/menu.ts` als Canvas-Befehle, und sie zweimal zu pflegen wäre die Sorte
 * Abweichung, die man erst bemerkt, wenn ein Symbol auf zwei Wegen zwei
 * verschiedene Dinge bedeutet.
 */
function iconCanvas(entry: Entry): HTMLCanvasElement {
  const size = 44;
  const ratio = Math.min(window.devicePixelRatio || 1, 3);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(size * ratio);
  canvas.height = Math.round(size * ratio);
  const context = canvas.getContext('2d');
  if (context) {
    context.scale(ratio, ratio);
    drawMenuIcon(context, entry.icon, size / 2, size / 2, size * 0.72, colorOf(entry.accent));
  }
  return canvas;
}

function colorOf(value: number): string {
  return `#${(value & 0xffffff).toString(16).padStart(6, '0')}`;
}

// --- Kopf und Schublade ------------------------------------------------------

nav.addEventListener('click', () => setDrawer(drawer.hidden));
back.addEventListener('click', () => {
  window.location.hash = '';
});
document.addEventListener('click', (event) => {
  if (drawer.hidden) return;
  const target = event.target as Node;
  if (!drawer.contains(target) && !nav.contains(target)) setDrawer(false);
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (!drawer.hidden) setDrawer(false);
  else if (window.location.hash) window.location.hash = '';
});

function setDrawer(open: boolean): void {
  drawer.hidden = !open;
  nav.setAttribute('aria-expanded', String(open));
}

// --- der Umschalter für die Boxhand -----------------------------------------

let mode: HandMode = readMode();

for (const button of hands.querySelectorAll<HTMLButtonElement>('button')) {
  button.addEventListener('click', () => setMode(button.dataset['hand'] as HandMode));
}

function readMode(): HandMode {
  try {
    const stored = globalThis.localStorage?.getItem(HAND_STORE);
    if (stored === 'off' || stored === 'grip' || stored === 'tool') return stored;
  } catch {
    /* Privater Modus, kein Speicher — kein Grund für einen Absturz. */
  }
  return 'grip';
}

function setMode(next: HandMode): void {
  mode = next;
  try {
    globalThis.localStorage?.setItem(HAND_STORE, next);
  } catch {
    /* siehe oben */
  }
  viewer.setHandMode(next);
  showMode();
}

function showMode(): void {
  for (const button of hands.querySelectorAll<HTMLButtonElement>('button')) {
    button.classList.toggle('is-active', button.dataset['hand'] === mode);
  }
}

// --- welcher Zustand gilt ----------------------------------------------------

window.addEventListener('hashchange', route);
route();

function route(): void {
  setDrawer(false);
  const id = window.location.hash.slice(1);
  const entry = id ? byId.get(id) : undefined;

  if (!entry) {
    // Auch für einen Hash, den es nicht gibt: eine Übersicht ist die einzige
    // Antwort, die nicht in einer leeren Seite endet.
    if (id) window.history.replaceState(null, '', window.location.pathname);
    viewer.stop();
    viewer.show(null);
    detail.hidden = true;
    grid.hidden = false;
    hands.hidden = true;
    back.hidden = true;
    nav.hidden = false;
    title.textContent = 'Werkzeuge';
    document.title = 'Werkzeuge — Baumgartner VR';
    return;
  }

  grid.hidden = true;
  detail.hidden = false;
  hands.hidden = false;
  back.hidden = false;
  nav.hidden = true;
  title.textContent = entry.label;
  document.title = `${entry.label} — Baumgartner VR`;
  hint.textContent = entry.hint;
  showMode();
  viewer.setHandMode(mode);
  viewer.show(entry.id);
  viewer.start();
}
