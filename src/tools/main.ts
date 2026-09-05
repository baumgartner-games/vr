import './tools.css';
import { TOOL_IDS, createTool } from '../worlds/portal/tools';
import { BAG_ITEMS, createPropShape } from '../worlds/portal/props';
import { WORLDS } from '../worlds';
import { buildGate } from '../worlds/hub/HubWorld';
import { drawMenuIcon, type MenuIcon } from '../ui/menu';
import { TOOL_GRIPS } from '../core/handPose';
import { ToolViewer, type HandMode } from './viewer';

/**
 * **Die Werkzeugseite** — alles, was es in der Spielwiese gibt, im Browser.
 *
 * Sie ist kein Spiel und will keines sein: kein WebXR, keine Physik, keine Welt.
 * Wozu sie da ist, sieht man am Telefon — eine Liste, auf der man ein Werkzeug
 * antippt, es mit dem Finger dreht und dabei die Boxhand daran ein- und
 * ausschaltet. Das geht in der Brille nur, indem man in den Eingaberaum läuft
 * und einen Stand bedient, und für „wie sieht das eigentlich aus" ist das ein
 * weiter Weg.
 *
 * Drei Regale, eine Schublade: **Werkzeuge**, **Welten** und der **magische
 * Beutel**. Eine Welt zeigt ihr Tor aus dem Hub — dasselbe Podest, derselbe
 * Ring, dasselbe Schild — und einen Knopf hinein; ein Beutel-Objekt zeigt sich
 * selbst, mit Masse und Maßen. Alle drei Listen kommen aus dem Spiel
 * (`TOOL_IDS`, `WORLDS`, `BAG_ITEMS`): eine Seite mit eigenen, hübscheren
 * Kopien zeigt irgendwann etwas anderes als das Spiel, und dann ist sie
 * schlimmer als keine.
 *
 * Zwei Zustände je Regal, ein Kopf: die Übersicht trägt links das
 * Burger-Symbol, ein einzelnes Ding den Pfeil zurück. Welcher gilt, steht im
 * **Hash** und nicht in einer Variablen — damit tut der Zurück-Knopf des
 * Browsers dasselbe wie der im Kopf, und ein Link auf ein einzelnes Werkzeug
 * ist ein Link: `#hammer` wie eh und je, `#welt/alps` und `#objekt/cube` für
 * die beiden anderen Regale, `#welten` und `#beutel` für ihre Übersichten.
 */

type Section = 'tools' | 'worlds' | 'bag';

const nav = document.querySelector<HTMLButtonElement>('#nav')!;
const back = document.querySelector<HTMLButtonElement>('#back')!;
const title = document.querySelector<HTMLElement>('#title')!;
const hands = document.querySelector<HTMLElement>('#hands')!;
const drawer = document.querySelector<HTMLElement>('#drawer')!;
const grids: Record<Section, HTMLElement> = {
  tools: document.querySelector<HTMLElement>('#grid-tools')!,
  worlds: document.querySelector<HTMLElement>('#grid-worlds')!,
  bag: document.querySelector<HTMLElement>('#grid-bag')!,
};
const detail = document.querySelector<HTMLElement>('#detail')!;
const stage = document.querySelector<HTMLCanvasElement>('#stage')!;
const hint = document.querySelector<HTMLElement>('#hint')!;
const note = document.querySelector<HTMLElement>('#note')!;
const enter = document.querySelector<HTMLAnchorElement>('#enter')!;

const HAND_STORE = 'bgvr.toolPageHand';
const viewer = new ToolViewer(stage);

const SECTION_TITLES: Record<Section, string> = {
  tools: 'Werkzeuge',
  worlds: 'Welten',
  bag: 'Magischer Beutel',
};

/** Die Übersicht eines Regals, als Hash. */
const SECTION_HASH: Record<Section, string> = {
  tools: 'werkzeuge',
  worlds: 'welten',
  bag: 'beutel',
};

/** Was auf einer Kachel steht — einmal aus dem Spiel gelesen. */
interface Entry {
  section: Section;
  id: string;
  /** Der Hash, unter dem das Ding einzeln steht. */
  hash: string;
  label: string;
  hint: string;
  /** Eine zweite Zeile unter dem Bild, wo es eine gibt. */
  note?: string;
  icon: MenuIcon;
  accent: number;
  /** Nur bei Welten: der Link hinein. */
  enter?: string;
  /** Baut das Ding für die Bühne. */
  show(): void;
}

/**
 * Die Werkzeuge, aus dem Spiel gelesen statt hier gepflegt.
 *
 * Jedes wird einmal gebaut, nach Name, Symbol und Farbe gefragt und gleich
 * wieder weggeworfen. Das ist ein paar Millisekunden teurer als eine getippte
 * Tabelle und dafür nie veraltet: ein neues Werkzeug steht hier, sobald es in
 * `TOOL_IDS` steht.
 */
function readTools(): Entry[] {
  const entries: Entry[] = [];
  for (const id of TOOL_IDS) {
    const tool = createTool(id);
    if (!tool) continue;
    entries.push({
      section: 'tools',
      id,
      hash: id,
      label: tool.label,
      hint: tool.hint || gripLine(id),
      icon: tool.icon,
      accent: tool.accent,
      show: () => viewer.show(id),
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

/**
 * Die Welten: ihr Tor aus dem Hub als Bild, und die Beschreibung aus der
 * Registry als Text. Der Hub selbst steht mit dabei — er ist eine Welt.
 */
function readWorlds(): Entry[] {
  return WORLDS.map((world) => ({
    section: 'worlds',
    id: world.id,
    hash: `welt/${world.id}`,
    label: world.title,
    hint: world.description,
    note: [
      world.tagline,
      `Für ${world.roles.map((role) => ROLE_LABELS[role]).join(', ')}`,
      world.experimental ? 'experimentell' : null,
    ]
      .filter((part) => part)
      .join(' · '),
    icon: 'worlds',
    accent: world.accent,
    enter: `./#${world.id}`,
    show: () => {
      const gate = buildGate(world.title, world.description, world.accent);
      viewer.showObject(gate.group, {
        animate: (time) => {
          gate.disc.material.uniforms.uTime!.value = time;
          gate.ring.rotation.z = time * 0.25;
        },
        dispose: () => gate.sign.dispose(),
      });
    },
  }));
}

const ROLE_LABELS: Record<string, string> = {
  vr: 'VR',
  desktop: 'Desktop',
  handheld: 'Handy',
};

/** Der Beutel: jedes Objekt einmal gebaut, gewogen, gemessen, weggeworfen. */
function readBag(): Entry[] {
  return BAG_ITEMS.map(([kind, label, icon]) => {
    const blueprint = createPropShape(kind);
    const size = blueprint.halfExtents.clone().multiplyScalar(200);
    const centimetres = [size.x, size.y, size.z].map((value) => Math.round(value));
    blueprint.mesh.geometry.dispose();
    const material = blueprint.mesh.material;
    if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
    else material.dispose();
    return {
      section: 'bag',
      id: kind,
      hash: `objekt/${kind}`,
      label: blueprint.label || label,
      hint: `${blueprint.mass} kg · ${centimetres.join(' × ')} cm · ${SHAPE_LABELS[blueprint.shape.kind]}`,
      icon,
      accent: 0xffc857,
      show: () => {
        const built = createPropShape(kind);
        viewer.showObject(built.mesh, {
          dispose: () => {
            built.mesh.geometry.dispose();
            const own = built.mesh.material;
            if (Array.isArray(own)) own.forEach((entry) => entry.dispose());
            else own.dispose();
          },
        });
      },
    };
  });
}

const SHAPE_LABELS: Record<string, string> = {
  box: 'Kasten',
  ball: 'Kugel',
  cylinder: 'Zylinder',
  cone: 'Kegel',
};

const entries = [...readTools(), ...readWorlds(), ...readBag()];
const byHash = new Map(entries.map((entry) => [entry.hash, entry]));

// --- die Übersichten -----------------------------------------------------------

for (const entry of entries) {
  const item = document.createElement('li');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tile';
  button.append(
    iconCanvas(entry),
    line('tile__label', entry.label),
    line('tile__hint', entry.section === 'worlds' ? (entry.note ?? '') : entry.hint),
  );
  button.addEventListener('click', () => {
    window.location.hash = entry.hash;
  });
  item.append(button);
  grids[entry.section].append(item);
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
  window.location.hash = SECTION_HASH[current];
});
document.addEventListener('click', (event) => {
  if (drawer.hidden) return;
  const target = event.target as Node;
  if (!drawer.contains(target) && !nav.contains(target)) setDrawer(false);
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (!drawer.hidden) setDrawer(false);
  else if (byHash.has(window.location.hash.slice(1))) window.location.hash = SECTION_HASH[current];
});

function setDrawer(open: boolean): void {
  drawer.hidden = !open;
  nav.setAttribute('aria-expanded', String(open));
}

/** Das Regal, in dem man gerade steht — die Schublade markiert es. */
let current: Section = 'tools';

function markSection(section: Section): void {
  current = section;
  for (const link of drawer.querySelectorAll<HTMLAnchorElement>('[data-section]')) {
    const active = link.dataset['section'] === section;
    link.classList.toggle('is-active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
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

/** Welches Regal ein Übersichts-Hash meint — oder keines. */
function sectionOf(hash: string): Section | null {
  if (hash === '' || hash === SECTION_HASH.tools) return 'tools';
  if (hash === SECTION_HASH.worlds) return 'worlds';
  if (hash === SECTION_HASH.bag) return 'bag';
  return null;
}

function route(): void {
  setDrawer(false);
  const hash = decodeURIComponent(window.location.hash.slice(1));
  const entry = byHash.get(hash);

  if (!entry) {
    // Eine Übersicht — und auch für einen Hash, den es nicht gibt: das ist die
    // einzige Antwort, die nicht in einer leeren Seite endet.
    const section = sectionOf(hash) ?? 'tools';
    if (hash && sectionOf(hash) === null) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    showOverview(section);
    return;
  }

  markSection(entry.section);
  for (const grid of Object.values(grids)) grid.hidden = true;
  detail.hidden = false;
  hands.hidden = entry.section !== 'tools';
  back.hidden = false;
  nav.hidden = true;
  title.textContent = entry.label;
  document.title = `${entry.label} — Baumgartner VR`;
  hint.textContent = entry.hint;
  note.hidden = !entry.note;
  note.textContent = entry.note ?? '';
  enter.hidden = !entry.enter;
  if (entry.enter) enter.href = entry.enter;
  showMode();
  viewer.setHandMode(mode);
  entry.show();
  viewer.start();
}

function showOverview(section: Section): void {
  markSection(section);
  viewer.stop();
  viewer.show(null);
  detail.hidden = true;
  for (const [key, grid] of Object.entries(grids)) grid.hidden = key !== section;
  hands.hidden = true;
  back.hidden = true;
  nav.hidden = false;
  title.textContent = SECTION_TITLES[section];
  document.title = `${SECTION_TITLES[section]} — Baumgartner VR`;
}
