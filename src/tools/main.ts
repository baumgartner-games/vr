import './tools.css';
import { TOOL_IDS, createTool } from '../worlds/portal/tools';
import { BAG_ITEMS, createPropShape } from '../worlds/portal/props';
import { WORLDS } from '../worlds';
import { buildGate } from '../worlds/hub/HubWorld';
import { drawMenuIcon, type MenuIcon } from '../ui/menu';
import { TOOL_GRIPS, type HandPose } from '../core/handPose';
import {
  clearHoldHandPose,
  clearIdleHandPose,
  holdHandPose,
  idleHandPose,
  saveHoldHandPose,
  saveIdleHandPose,
} from '../core/handPoseStore';
import { clearPose, savePose } from '../worlds/portal/tools/poseStore';
import { poseFromReadout } from '../worlds/portal/tools/toolPose';
import { gearCode, toolGearCode } from '../worlds/portal/tools/gearConfig';
import {
  EDIT_AXES,
  EDIT_TARGETS,
  axisSpec,
  clampAxis,
  formatAxes,
  formatAxis,
  isEditTarget,
  nudgeAxis,
  readAxis,
  withAxis,
  type EditAxis,
  type EditTarget,
} from './poseEdit';
import { ToolViewer, type HandMode } from './viewer';
import type { PoseReadout } from '../worlds/portal/tools/toolPose';
import type { WorldDefinition } from '../core/types';

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
 * Beutel**. Eine Welt zeigt sich selbst — ihre Kulisse, gebaut mit ihrem
 * eigenen Code, und der Blick steht darin, wo auch ein Spieler anfängt —, dazu
 * einen Knopf hinein; ein Beutel-Objekt zeigt sich selbst, mit Masse und
 * Maßen. Alle drei Listen kommen aus dem Spiel
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
 *
 * **Und sie schaut nicht nur.** Der Stift oben rechts macht aus der Ansicht
 * einen Justierstand: eine Achse oben, ein Regler unten, dazwischen das Bild.
 * Was dabei entsteht, landet in denselben Speichern wie in der Brille
 * (`poseStore`, `handPoseStore`) und damit auch im **Konfig-Code**, der unter
 * dem Regler steht — die Seite ist eine zweite Bedienung derselben Einstellung
 * und kein eigener kleiner Zustand daneben. Die Rechnung dazu steht in
 * `poseEdit.ts` (mit Test).
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
const foot = document.querySelector<HTMLElement>('#foot')!;
const hint = document.querySelector<HTMLElement>('#hint')!;
const note = document.querySelector<HTMLElement>('#note')!;
const enter = document.querySelector<HTMLAnchorElement>('#enter')!;
const edit = document.querySelector<HTMLButtonElement>('#edit')!;
const axesBar = document.querySelector<HTMLElement>('#axes')!;
const editor = document.querySelector<HTMLElement>('#editor')!;
const targets = document.querySelector<HTMLElement>('#targets')!;
const revert = document.querySelector<HTMLButtonElement>('#revert')!;
const slider = document.querySelector<HTMLInputElement>('#slider')!;
const reading = document.querySelector<HTMLElement>('#reading')!;
const values = document.querySelector<HTMLElement>('#values')!;
const codeTool = document.querySelector<HTMLButtonElement>('#code-tool')!;
const codeAll = document.querySelector<HTMLButtonElement>('#code-all')!;
const help = document.querySelector<HTMLElement>('#help')!;

/** Die Zeile unter der Bühne — sie sagt, was die Finger dort tun. */
const HELP_THING = 'Ziehen dreht · zwei Finger oder Rad zoomen · Doppeltipp stellt zurück';
const HELP_WORLD = 'Ziehen sieht sich um · zwei Finger oder Rad zoomen · Doppeltipp stellt zurück';

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
 * Die Welten: die Welt selbst als Bild, und die Beschreibung aus der Registry
 * als Text. Der Hub selbst steht mit dabei — er ist eine Welt.
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
    show: () => void showWorld(world),
  }));
}

/**
 * Eine laufende Nummer für jeden Wechsel der Ansicht.
 *
 * Eine Welt kommt aus einem `import()` und braucht dafür einen Moment. Wer in
 * dieser Zeit weiterblättert, bekäme sonst die alte Welt auf die Bühne
 * geschoben — die Nummer entscheidet, wessen Antwort noch jemand sehen will.
 */
let request = 0;

/**
 * **Die Welt und nicht ihr Tor.**
 *
 * Vorher stand hier das Tor aus dem Hub: hübsch, aber es zeigt von einer Welt
 * genau das, was in jeder Welt gleich aussieht. Jetzt baut die Welt sich
 * selbst auf (`World.preview()`, mit demselben Code wie im Spiel), und der
 * Blick steht darin, wo auch ein Spieler anfängt.
 *
 * Geladen wird sie erst beim Antippen — eine Übersicht mit zehn Welten wäre
 * sonst das ganze Spiel auf einmal. Und wenn eine Welt sich nicht ohne Spiel
 * bauen lässt, steht wieder ihr Tor da: eine leere Bühne wäre die schlechtere
 * Antwort.
 */
async function showWorld(definition: WorldDefinition): Promise<void> {
  const ticket = ++request;
  try {
    const world = await definition.load();
    if (ticket !== request) return;
    const preview = world.preview?.();
    if (preview) {
      viewer.showWorld(preview);
      return;
    }
  } catch (error) {
    if (ticket !== request) return;
    console.warn(`Die Welt „${definition.title}" lässt sich nicht ansehen`, error);
  }
  showGate(definition);
}

/** Der Rückfall: das Tor aus dem Hub, wie es die Seite vorher immer zeigte. */
function showGate(definition: WorldDefinition): void {
  const gate = buildGate(definition.title, definition.description, definition.accent);
  viewer.showObject(gate.group, {
    animate: (time) => {
      gate.disc.material.uniforms.uTime!.value = time;
      gate.ring.rotation.z = time * 0.25;
    },
    dispose: () => gate.sign.dispose(),
  });
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

// --- der Justierer -----------------------------------------------------------

/**
 * Bearbeiten ist ein **Modus** und kein zweiter Bildschirm: dasselbe Bild,
 * dieselbe Drehung, nur ein Regler dazu. Wer eine Haltung einstellt, will das
 * Ergebnis ja genau in der Ansicht sehen, in der er es vorher betrachtet hat.
 */
let editing = false;
let axis: EditAxis = 'x';
let target: EditTarget = 'hold';

for (const spec of EDIT_AXES) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = spec.label;
  button.title = `${spec.label} — ${spec.hint}`;
  button.dataset['axis'] = spec.key;
  button.addEventListener('click', () => {
    axis = spec.key;
    showEditor();
  });
  axesBar.append(button);
}

for (const button of targets.querySelectorAll<HTMLButtonElement>('button')) {
  button.addEventListener('click', () => {
    const key = button.dataset['target'] ?? '';
    if (!isEditTarget(key)) return;
    target = key;
    // Die Ansicht geht mit: „In der Hand" verschiebt das Werkzeug im Griff, und
    // das sieht man nur, wenn die Hand stillsteht. Umgekehrt genauso. Wer doch
    // anders schauen will, hat den Umschalter oben.
    const view = EDIT_TARGETS.find((entry) => entry.key === key)?.view;
    if (view && mode !== view) setMode(view);
    showEditor();
  });
}

edit.addEventListener('click', () => setEditing(!editing));

// Der Regler schreibt sofort mit, nicht erst beim Loslassen — und bekommt
// seinen eigenen Wert dabei **nicht** zurückgeschrieben: ein `value`, das
// mitten in einer Ziehbewegung gesetzt wird, lässt den Knopf unter dem Daumen
// springen.
slider.addEventListener('input', () => writeAxis(Number(slider.value), false));

for (const button of editor.querySelectorAll<HTMLButtonElement>('[data-nudge]')) {
  button.addEventListener('click', () => {
    const steps = Number(button.dataset['nudge']) || 0;
    writeAxis(nudgeAxis(axis, readAxis(currentPose(), axis), steps));
  });
}

revert.addEventListener('click', () => {
  const id = viewer.toolId;
  if (!id) return;
  // Das ganze Ziel und nicht nur die eine Achse: wer zurücksetzt, will die
  // gebaute Haltung wiederhaben, und die besteht aus sechs Zahlen.
  if (target !== 'hold') {
    clearHoldHandPose(viewer.handSide, id);
    viewer.refresh();
  } else if (id === HAND_TOOL) {
    clearIdleHandPose(viewer.handSide);
    showHandTool();
  } else {
    clearPose(id);
    viewer.setHoldPose(null);
  }
  showEditor();
});

codeTool.addEventListener('click', () => {
  const id = viewer.toolId;
  if (id) copy(codeTool, toolGearCode(id, viewer.handSide), 'Werkzeug');
});
codeAll.addEventListener('click', () => copy(codeAll, gearCode(), 'Alles'));

function setEditing(on: boolean): void {
  editing = on && viewer.toolId !== null;
  edit.setAttribute('aria-pressed', String(editing));
  axesBar.hidden = !editing;
  editor.hidden = !editing;
  // Der Hinweistext weicht: auf einem Telefon ist der Platz unter der Bühne
  // genau einmal da, und der Regler braucht ihn dringender.
  foot.hidden = editing;
  // Eine Haltung, die sich beim Justieren von selbst weiterdreht, justiert
  // niemand.
  if (editing) viewer.setSpinning(false);
  if (editing && mode === 'off') {
    setMode(EDIT_TARGETS.find((entry) => entry.key === target)?.view ?? 'grip');
  }
  showEditor();
}

/**
 * Die **Boxhand** ist die Hand selbst, und deshalb ist ihre Lage „in der Hand"
 * die **Grundhaltung** dieser Hand und nicht die Pose eines Werkzeugs
 * (`tools/HandTool.ts`, `storeMeasured`). Wer sie hier verschöbe wie eine
 * Pistole, schriebe in einen Speicher, den das Spiel für dieses eine Werkzeug
 * gar nicht liest — die Einstellung wäre gemacht und in der Brille nicht da.
 */
const HAND_TOOL = 'hand-box';

/** Die sechs Zahlen einer Handhaltung; Finger und Spreizung bleiben dort. */
function sixOf(pose: HandPose): PoseReadout {
  return { x: pose.x, y: pose.y, z: pose.z, pitch: pose.pitch, yaw: pose.yaw, roll: pose.roll };
}

/** Die sechs Zahlen, an denen der Regler gerade zieht. */
function currentPose(): PoseReadout {
  const id = viewer.toolId;
  const zero: PoseReadout = { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 0 };
  if (!id) return zero;
  if (target === 'grip') return sixOf(holdHandPose(viewer.handSide, id));
  if (id === HAND_TOOL) return sixOf(idleHandPose(viewer.handSide));
  return viewer.holdReadout() ?? zero;
}

/**
 * Die Boxhand auf die Bühne stellen, wie sie eingestellt ist.
 *
 * Im Spiel holt sie sich das beim Zugreifen (`HandTool.onTake`) — hier greift
 * niemand zu, also stünde sonst die ausgelieferte Haltung da und der Regler
 * daneben zeigte die gemessene.
 */
function showHandTool(refit = false): void {
  if (viewer.toolId !== HAND_TOOL) return;
  viewer.setHoldPose(poseFromReadout(sixOf(idleHandPose(viewer.handSide))), refit);
}

/**
 * Ein neuer Wert auf der gewählten Achse — in den Speicher, auf die Bühne und
 * zurück auf die Anzeige.
 *
 * Gespeichert wird **sofort** und nicht erst beim Loslassen: der Speicher ist
 * derselbe, den die Brille liest, und ein „Übernehmen"-Knopf, den man vergisst,
 * ist eine Einstellung, die man zweimal macht.
 */
function writeAxis(value: number, syncSlider = true): void {
  const id = viewer.toolId;
  if (!id) return;
  const next = withAxis(currentPose(), axis, clampAxis(axis, value));

  // Überall nur die sechs Zahlen: Finger und Spreizung gehören zur Haltung und
  // werden von einem Regler für Ort und Winkel nicht angefasst.
  if (target === 'grip') {
    saveHoldHandPose(viewer.handSide, id, { ...holdHandPose(viewer.handSide, id), ...next });
    viewer.refresh();
  } else if (id === HAND_TOOL) {
    saveIdleHandPose(viewer.handSide, { ...idleHandPose(viewer.handSide), ...next });
    viewer.setHoldPose(poseFromReadout(next));
  } else {
    const pose = poseFromReadout(next);
    // Die Seite misst immer an derselben Hand, also steht sie auch als
    // Herkunft im Speicher — eine Zahl ohne Seite ist später nicht mehr zu
    // deuten.
    savePose(id, pose, viewer.handSide);
    viewer.setHoldPose(pose);
  }
  showEditor(syncSlider);
}

/** Alles am Justierer auf den Stand bringen, den der Speicher gerade hat. */
function showEditor(syncSlider = true): void {
  if (!editing) return;
  const pose = currentPose();
  const spec = axisSpec(axis);
  const value = clampAxis(axis, readAxis(pose, axis));

  for (const button of axesBar.querySelectorAll<HTMLButtonElement>('button')) {
    button.classList.toggle('is-active', button.dataset['axis'] === axis);
  }
  for (const button of targets.querySelectorAll<HTMLButtonElement>('button')) {
    button.classList.toggle('is-active', button.dataset['target'] === target);
  }

  if (syncSlider) {
    slider.min = String(spec.min);
    slider.max = String(spec.max);
    slider.step = String(spec.step);
    slider.value = String(value);
  }

  const targetHint = EDIT_TARGETS.find((entry) => entry.key === target);
  reading.textContent = `${spec.label} ${formatAxis(axis, value)} · ${spec.hint}`;
  values.textContent = `${formatAxes(pose)} — ${targetHint?.hint ?? ''}`;

  const id = viewer.toolId;
  showCode(codeTool, 'Werkzeug', id ? toolGearCode(id, viewer.handSide) : '');
  showCode(codeAll, 'Alles', gearCode());
}

function showCode(button: HTMLButtonElement, label: string, code: string): void {
  button.textContent = `${label}: ${code}`;
  button.title = code;
  button.dataset['code'] = code;
}

/**
 * Antippen kopiert. Ohne Zwischenablage (ein alter Browser, kein sicherer
 * Kontext) sagt der Knopf das auch — er zeigt den Code ja im Klartext, und
 * markieren geht immer noch.
 */
function copy(button: HTMLButtonElement, code: string, label: string): void {
  const done = (text: string): void => {
    button.textContent = text;
    window.setTimeout(() => showCode(button, label, code), 1400);
  };
  const clipboard = globalThis.navigator?.clipboard;
  if (!clipboard || !code) {
    done(`${label}: zum Kopieren markieren`);
    return;
  }
  clipboard.writeText(code).then(
    () => done(`${label}: kopiert ✓`),
    () => done(`${label}: zum Kopieren markieren`),
  );
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
  // Jeder Wechsel macht eine laufende Welt-Anfrage ungültig — auch der auf ein
  // Werkzeug und der zurück in die Übersicht.
  request++;
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
  // In einer Welt dreht sich der Blick und nicht das Ding — die Zeile darunter
  // sagt es, sonst zieht jemand am Berg und wundert sich.
  help.textContent = entry.section === 'worlds' ? HELP_WORLD : HELP_THING;
  showMode();
  viewer.setHandMode(mode);
  entry.show();
  showHandTool(true);
  viewer.start();
  // Bearbeiten gibt es nur für Werkzeuge: eine Welt und ein Beutel-Objekt
  // liegen in keiner Hand, es gibt dort schlicht nichts zu justieren.
  edit.hidden = entry.section !== 'tools';
  setEditing(editing && entry.section === 'tools');
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
  edit.hidden = true;
  setEditing(false);
  title.textContent = SECTION_TITLES[section];
  document.title = `${SECTION_TITLES[section]} — Baumgartner VR`;
}
