import './tools.css';
import type * as THREE from 'three';
import { TOOL_IDS, createTool, disposeToolTree } from '../worlds/portal/tools';
import { BAG_ITEMS, createPropShape } from '../worlds/portal/props';
import { NPC_SKINS } from '../worlds/npc/npcKinds';
import { NPC_BAR_MODES } from '../worlds/npc/NpcBody';
import { NAV_LAYERS } from '../worlds/nav/navLayers';
import { BRAINS } from '../worlds/npc/npcBrains';
import { NpcBody } from '../worlds/npc/NpcBody';
import { createBrainShape } from '../worlds/npc/brainShape';
import { WORLDS } from '../worlds';
import { buildGate } from '../worlds/hub/HubWorld';
import { drawMenuIcon, type MenuIcon } from '../ui/menu';
import {
  GRIP_POSE_ID,
  HELD_BUTTONS,
  STANDARD_GRIP_TOOLS,
  clonePose,
  type FingerButtons,
  type HandPose,
} from '../core/handPose';
import { handLook, handLookLabel, nextHandLook, saveHandLook } from '../core/handLook';
import {
  clearHandPoses,
  clearHoldHandPose,
  clearIdleHandPose,
  handPoseCount,
  holdHandPose,
  idleHandPose,
  saveHoldHandPose,
  saveIdleHandPose,
} from '../core/handPoseStore';
import { clearPose, clearPoses, savePose, storedPoseCount } from '../worlds/portal/tools/poseStore';
import { poseFromReadout, readPose } from '../worlds/portal/tools/toolPose';
import { holdFromGrip, poseOfHand, toolInGrip, type Pose } from '../worlds/tune/handGrip';
import { fromRealHand, inRealHand } from './handFrame';
import type { Handedness } from '../core/XRInput';
import { gearCode, toolGearCode } from '../worlds/portal/tools/gearConfig';
import {
  EDIT_AXES,
  EDIT_TARGETS,
  axisSpec,
  clampAxis,
  clampPose,
  formatAxes,
  formatAxis,
  nudgeAxis,
  readAxis,
  withAxis,
  type EditAxis,
  type EditTarget,
} from './poseEdit';
import { alignHandToLine, handAboutPivot, turnHandTo } from './alignHand';
import { ToolViewer, type HandMode, type StagePick } from './viewer';
import { TOOL_HOME } from './handStage';
import { LiveHand, LiveLink } from './liveHand';
import { rememberedName, rememberedRoom } from '../net/room';
import type { HandShare } from '../worlds/tune/handShare';
import type { NetStatus } from '../net/types';
import type { Vec3 } from '../worlds/portal/tools/aim';
import type { PoseReadout } from '../worlds/portal/tools/toolPose';
import type { WorldDefinition } from '../core/types';
import type { LivePreview, PreviewButton } from '../worlds/shared/livePreview';

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
 * Vier Regale, eine Schublade: **Werkzeuge**, **Welten**, der **magische
 * Beutel** und die **NPCs**. Eine Welt zeigt sich selbst — ihre Kulisse,
 * gebaut mit ihrem eigenen Code, ganz drauf und schräg von oben —, dazu einen
 * Knopf hinein; ein Beutel-Objekt zeigt sich selbst, mit Masse und Maßen; ein
 * NPC geht auf der Stelle, und sein Hirn liegt als eigene Kachel daneben.
 * Alle vier Listen kommen aus dem Spiel
 * (`TOOL_IDS`, `WORLDS`, `BAG_ITEMS`, `NPC_SKINS`/`BRAINS`): eine Seite mit
 * eigenen, hübscheren Kopien zeigt irgendwann etwas anderes als das Spiel, und
 * dann ist sie schlimmer als keine.
 *
 * Zwei Zustände je Regal, ein Kopf: die Übersicht trägt links das
 * Burger-Symbol, ein einzelnes Ding den Pfeil zurück. Welcher gilt, steht im
 * **Hash** und nicht in einer Variablen — damit tut der Zurück-Knopf des
 * Browsers dasselbe wie der im Kopf, und ein Link auf ein einzelnes Werkzeug
 * ist ein Link: `#hammer` wie eh und je, `#welt/alps`, `#objekt/cube`,
 * `#npc/zombie` und `#hirn/chase` für die anderen Regale, `#welten`,
 * `#beutel` und `#npcs` für ihre Übersichten.
 *
 * **Und sie schaut nicht nur.** Der Knopf *Bearbeiten* oben rechts macht aus
 * der Ansicht einen Justierstand: eine Achse oben, ein Regler unten,
 * dazwischen das Bild. Was sich bewegt, sagt die Ansicht im Kopf — in *Hand in
 * VR* die gezeichnete Hand am stehenden Werkzeug, in *Hand in echt* das
 * Werkzeug in der stehenden eigenen Hand. **Der Rahmen ist beide Male
 * derselbe: die echte Hand** (`handFrame.ts`), also der Griffpunkt als
 * Nullpunkt und der Zeigestrahl als -Z. „X ein Stück weiter" heißt damit
 * immer dasselbe — nach rechts, von der eigenen Hand aus —, und nicht je nach
 * Ansicht und Werkzeug etwas anderes. Gespeichert wird eine Drehung später,
 * zurück im Griffraum: in die Lage des Werkzeugs im Griff oder in die
 * Griffhaltung der Hand, in dieselben Speicher wie in der Brille (`poseStore`,
 * `handPoseStore`) und damit auch in den **Konfig-Code**, der unter dem Regler
 * steht — die Seite ist eine zweite Bedienung derselben Einstellung und kein
 * eigener kleiner Zustand daneben. Die Achsen dazu stehen in `poseEdit.ts`
 * (mit Test).
 */

/** Ein Regal mit Kacheln — die vier, die eine Übersicht und Einzelseiten haben. */
type Shelf = 'tools' | 'worlds' | 'bag' | 'npc';

/**
 * Und alles, was die Schublade anbietet: die drei Regale und der
 * **Zuschauerplatz**. `live` ist kein Regal — es gibt dort nichts anzutippen,
 * sondern eine Leitung, eine Hand und einen Code (`liveHand.ts`).
 */
type Section = Shelf | 'live';

const nav = document.querySelector<HTMLButtonElement>('#nav')!;
const back = document.querySelector<HTMLButtonElement>('#back')!;
const title = document.querySelector<HTMLElement>('#title')!;
const hands = document.querySelector<HTMLElement>('#hands')!;
const fingers = document.querySelector<HTMLElement>('#fingers')!;
const sides = document.querySelector<HTMLElement>('#sides')!;
const drawer = document.querySelector<HTMLElement>('#drawer')!;
const grids: Record<Shelf, HTMLElement> = {
  tools: document.querySelector<HTMLElement>('#grid-tools')!,
  worlds: document.querySelector<HTMLElement>('#grid-worlds')!,
  bag: document.querySelector<HTMLElement>('#grid-bag')!,
  npc: document.querySelector<HTMLElement>('#grid-npc')!,
};
const detail = document.querySelector<HTMLElement>('#detail')!;
const stage = document.querySelector<HTMLCanvasElement>('#stage')!;
const foot = document.querySelector<HTMLElement>('#foot')!;
const hint = document.querySelector<HTMLElement>('#hint')!;
const note = document.querySelector<HTMLElement>('#note')!;
const enter = document.querySelector<HTMLAnchorElement>('#enter')!;
const edit = document.querySelector<HTMLButtonElement>('#edit')!;
const editLabel = document.querySelector<HTMLElement>('#edit-label')!;
const fly = document.querySelector<HTMLButtonElement>('#fly')!;
const flyLabel = document.querySelector<HTMLElement>('#fly-label')!;
const pad = document.querySelector<HTMLElement>('#pad')!;
const help = document.querySelector<HTMLElement>('#help')!;
const axesBar = document.querySelector<HTMLElement>('#axes')!;
const editor = document.querySelector<HTMLElement>('#editor')!;
const asReal = document.querySelector<HTMLButtonElement>('#asreal')!;
asReal.addEventListener('click', takeRealHand);
const align = document.querySelector<HTMLButtonElement>('#align')!;
const aimAt = document.querySelector<HTMLButtonElement>('#aim')!;
const revert = document.querySelector<HTMLButtonElement>('#revert')!;
const slider = document.querySelector<HTMLInputElement>('#slider')!;
const reading = document.querySelector<HTMLElement>('#reading')!;
const values = document.querySelector<HTMLElement>('#values')!;
const codeTool = document.querySelector<HTMLButtonElement>('#code-tool')!;
const codeAll = document.querySelector<HTMLButtonElement>('#code-all')!;
const lede = document.querySelector<HTMLElement>('#lede')!;
const wipe = document.querySelector<HTMLButtonElement>('#wipe')!;
const look = document.querySelector<HTMLButtonElement>('#look')!;
const wipeNote = document.querySelector<HTMLElement>('#wipe-note')!;
const labPanel = document.querySelector<HTMLElement>('#lab')!;
const labRun = document.querySelector<HTMLButtonElement>('#lab-run')!;
const labTop = document.querySelector<HTMLButtonElement>('#lab-top')!;
const labLede = document.querySelector<HTMLElement>('#lab-lede')!;
const labSay = document.querySelector<HTMLElement>('#lab-say')!;
const labKeys = document.querySelector<HTMLElement>('#lab-keys')!;
const labShow = document.querySelector<HTMLElement>('#lab-show')!;
const livePanel = document.querySelector<HTMLElement>('#live')!;
const liveOut = document.querySelector<HTMLElement>('#live-out')!;
const liveRoom = document.querySelector<HTMLInputElement>('#live-room')!;
const liveName = document.querySelector<HTMLInputElement>('#live-name')!;
const liveConnect = document.querySelector<HTMLButtonElement>('#live-connect')!;
const liveStatus = document.querySelector<HTMLElement>('#live-status')!;
const liveWhat = document.querySelector<HTMLElement>('#live-what')!;
const liveCode = document.querySelector<HTMLTextAreaElement>('#live-code')!;
const liveCopy = document.querySelector<HTMLButtonElement>('#live-copy')!;

const HAND_STORE = 'bgvr.toolPageHand';
const BUTTONS_STORE = 'bgvr.toolPageButtons';
const SIDE_STORE = 'bgvr.toolPageSide';
const viewer = new ToolViewer(stage);

const SECTION_TITLES: Record<Section, string> = {
  tools: 'Werkzeuge',
  worlds: 'Welten',
  bag: 'Magischer Beutel',
  npc: 'NPCs',
  live: 'Verbinden',
};

/** Die Übersicht eines Regals, als Hash. */
const SECTION_HASH: Record<Section, string> = {
  tools: 'werkzeuge',
  worlds: 'welten',
  bag: 'beutel',
  npc: 'npcs',
  live: 'verbinden',
};

/** Was auf einer Kachel steht — einmal aus dem Spiel gelesen. */
interface Entry {
  /** Kacheln gibt es nur in Regalen; der Zuschauerplatz hat keine. */
  section: Shelf;
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
  if (STANDARD_GRIP_TOOLS.has(id)) return 'Halterzylinder, wie eine Pistole gehalten';
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
 * selbst auf (`World.preview()`, mit demselben Code wie im Spiel) und liegt
 * da wie ein Ding im Regal: ganz drauf, schräg von oben, zum Drehen.
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
      // Und wenn diese Welt sich auch **starten** lässt, steht der Knopf dafür
      // unter dem Bild. Angeboten wird er hier und nicht in der Registry: Ob
      // eine Welt laufen kann, weiß sie selbst (`World.previewLive`), und eine
      // zweite Liste daneben wäre eine, die irgendwann nicht mehr stimmt.
      offerLab(world.previewLive ? definition : null);
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
  hull: 'Hülle',
};

/**
 * **Das NPC-Regal**: die Häute und die Hirne, getrennt.
 *
 * Getrennt, weil sie es im Spiel auch sind — eine Haut sagt, wie einer
 * aussieht, ein Hirn, was er tut (`worlds/npc/`). Auf dem Telefon ist genau
 * das die Frage, die man hier stellt: *Wie sieht ein Zombie eigentlich aus*,
 * und *was macht „Verfolgen" eigentlich*. Eine Liste aus sechs Kombinationen
 * beantwortete keine von beiden.
 *
 * Eine Haut steht da und **geht auf der Stelle** — ein NPC, der still steht,
 * ist ein Kleiderständer, und das Einzige, was man an ihm ansehen will, ist
 * sein Gang. Ein Hirn ist ein Hirn; es dreht sich langsam, damit man es von
 * allen Seiten sieht.
 */
function readNpcs(): Entry[] {
  const skins: Entry[] = NPC_SKINS.map((skin) => ({
    section: 'npc' as const,
    id: skin.id,
    hash: `npc/${skin.id}`,
    label: skin.label,
    hint: skin.sub,
    note: `${Math.round(skin.height * 100)} cm · ${skin.mass} kg · ${skin.health} Leben · ${skin.speed} m/s · Hirn: ${brainOfLabel(skin.brain)}`,
    icon: skin.icon,
    accent: skin.accent,
    show: () => {
      const body = new NpcBody(skin.id);
      // Ein NPC schaut nach -Z, die Bühne steht um `TOOL_HOME.yaw` gedreht vor
      // der Kamera: ungedreht sähe man ihn von hinten. Gedreht steht er im
      // **Dreiviertelprofil** — Gesicht *und* Silhouette, und die Silhouette
      // ist bei einem Zombie die Auskunft (die Arme zeigen nach vorn; genau auf
      // die Kamera zu sind sie zwei Stummel).
      body.rotation.y = Math.PI - TOOL_HOME.yaw + 0.7;
      let last = 0;
      viewer.showObject(body, {
        // Auf der Stelle: der Betrachter bewegt nichts, also bekommt der Gang
        // sein Tempo aus der Uhr und nicht aus einer Strecke.
        animate: (time) => {
          const dt = Math.min(0.1, Math.max(0, time - last));
          last = time;
          body.update(dt, skin.speed, false);
        },
        dispose: () => body.dispose(),
      });
    },
  }));

  const brains: Entry[] = BRAINS.map((brain) => ({
    section: 'npc' as const,
    id: brain.id,
    hash: `hirn/${brain.id}`,
    label: `Hirn: ${brain.label}`,
    hint: brain.sub,
    note: brainNumbers(brain.tuning),
    icon: 'brain' as MenuIcon,
    accent: brain.accent,
    show: () => {
      const shape = createBrainShape({ radius: 0.06, color: brain.accent });
      viewer.showObject(shape, {
        spin: 0.35,
        dispose: () => disposeToolTree(shape),
      });
    },
  }));

  return [...skins, ...brains];
}

/** Wie das Hirn heißt, das eine Haut von Haus aus mitbringt. */
function brainOfLabel(id: string): string {
  return BRAINS.find((brain) => brain.id === id)?.label ?? id;
}

/** Die Zahlen eines Hirns in einer Zeile — Sicht und Reichweite nur, wo es sie gibt. */
function brainNumbers(tuning: (typeof BRAINS)[number]['tuning']): string {
  const parts = [`${tuning.speed} m/s`, `${tuning.turn}°/s`];
  if (tuning.sense > 0) parts.push(`sieht ${tuning.sense} m`);
  if (tuning.reach > 0) parts.push(`schlägt ab ${tuning.reach} m, alle ${tuning.cooldown} s`);
  return parts.join(' · ');
}

const entries = [...readTools(), ...readWorlds(), ...readBag(), ...readNpcs()];
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
  // Die Meldung unter dem Löschknopf gehört zu *diesem* Öffnen: eine Woche
  // später steht sie sonst noch da und behauptet etwas über den Speicher.
  if (!open) wipeNote.textContent = '';
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

/**
 * Welche Ansicht gilt — und was ein alter Eintrag im Speicher bedeutet.
 *
 * Die beiden hießen einmal `grip` („In der Hand") und `tool` („Am Werkzeug")
 * und waren zwei Rahmen um dasselbe Bild. Jetzt sind es zwei Bilder: `vr`
 * zeigt das Werkzeug mit der Hand daran, `controller` das Gerät in der echten
 * Hand. Wer gestern `grip` gewählt hatte, wollte die Hand am Ding sehen — das
 * ist heute `vr`, und `tool` war ohnehin dasselbe.
 */
function readMode(): HandMode {
  try {
    const stored = globalThis.localStorage?.getItem(HAND_STORE);
    if (stored === 'off' || stored === 'controller' || stored === 'vr') return stored;
    if (stored === 'grip' || stored === 'tool') return 'vr';
  } catch {
    /* Privater Modus, kein Speicher — kein Grund für einen Absturz. */
  }
  return 'vr';
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
  // Die Ansicht sagt, **was** der Regler verschiebt (`editTarget`) — und damit
  // stehen die sechs Zahlen in einem anderen Raum. Ein Entwurf aus der einen
  // Ansicht ist in der anderen eine falsche Zahl.
  forgetDraft();
  showEditor();
}

function showMode(): void {
  for (const button of hands.querySelectorAll<HTMLButtonElement>('button')) {
    button.classList.toggle('is-active', button.dataset['hand'] === mode);
  }
}

// --- links oder rechts -------------------------------------------------------

/**
 * **Welche Hand die Seite zeigt.**
 *
 * Eingemessen ist jede Haltung an *einer* Hand — hier durchweg der rechten —,
 * und die andere rechnet das Werkzeug daraus (`Tool.holdIn`): gespiegelt, oder
 * bei der Stoppuhr um die eigene Hochachse gedreht, weil ein gespiegeltes
 * Zifferblatt rückwärts liefe. Vergleichen kann man das nur, wenn man beide
 * ansehen darf, und dafür steht dieser Schalter im Kopf.
 *
 * Er gilt für die ganze Seite und nicht je Werkzeug: wer wissen will, wie
 * seine Linkshänderei mit dem Regal zurechtkommt, will das bei allen
 * zwanzig sehen und nicht bei einem.
 */
let side: Handedness = readSide();

for (const button of sides.querySelectorAll<HTMLButtonElement>('button')) {
  button.addEventListener('click', () => setSide(button.dataset['side'] as Handedness));
}

function readSide(): Handedness {
  try {
    return globalThis.localStorage?.getItem(SIDE_STORE) === 'left' ? 'left' : 'right';
  } catch {
    /* Privater Modus, kein Speicher — dann eben rechts. */
    return 'right';
  }
}

function setSide(next: Handedness): void {
  side = next;
  try {
    globalThis.localStorage?.setItem(SIDE_STORE, next);
  } catch {
    /* siehe oben */
  }
  viewer.setHandSide(next);
  showSide();
  // Die sechs Zahlen gehören zu der Hand, die man ansieht — ein Entwurf aus
  // der anderen ist dort eine falsche Zahl.
  forgetDraft();
  showEditor();
}

/**
 * Der Schalter zeigt, was gilt — und **welche Hand wirklich zu sehen ist**.
 * Bei den beiden Controllern ist das nicht dasselbe: sie behalten ihre Seite,
 * und der Schalter sagt das, indem er sie und nicht die Wahl markiert und
 * dabei stumpf wird.
 */
function showSide(): void {
  const shown = viewer.toolId ? viewer.handSide : side;
  const locked = shown !== side;
  for (const button of sides.querySelectorAll<HTMLButtonElement>('button')) {
    button.classList.toggle('is-active', button.dataset['side'] === shown);
    button.disabled = locked;
  }
}

// --- Griffknopf und Trigger --------------------------------------------------

/**
 * Was die beiden Knöpfe am Controller gerade tun. Zu sehen ist es an den
 * Fingern (`viewer.setButtons`): gehalten wird mit gedrücktem Griffknopf,
 * und so fängt die Seite auch an — Trigger dazu, und der Zeigefinger zieht
 * ihn, an der Stoppuhr der Daumen die Krone; Griffknopf weg, und die Hand
 * öffnet sich vom Griff.
 */
let buttons: FingerButtons = readButtons();

for (const button of fingers.querySelectorAll<HTMLButtonElement>('button')) {
  button.addEventListener('click', () => {
    const key = button.dataset['button'] as keyof FingerButtons;
    setButtons({ ...buttons, [key]: !buttons[key] });
  });
}

function readButtons(): FingerButtons {
  try {
    const stored = globalThis.localStorage?.getItem(BUTTONS_STORE);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<FingerButtons>;
      return { grab: Boolean(parsed.grab), trigger: Boolean(parsed.trigger) };
    }
  } catch {
    /* Privater Modus, kaputter Eintrag — dann eben die Hand am Griff. */
  }
  return { ...HELD_BUTTONS };
}

function setButtons(next: FingerButtons): void {
  buttons = next;
  try {
    globalThis.localStorage?.setItem(BUTTONS_STORE, JSON.stringify(next));
  } catch {
    /* siehe oben */
  }
  showButtons();
  applyButtons();
}

/**
 * Was die Bühne wirklich zeigt: beim Justieren immer die haltende Hand. Der
 * Regler richtet die Linie des Zeigefingers aus, und ein Finger am Abzug zeigt
 * woandershin als einer am Rahmen — man justierte sonst an einem Finger, der
 * gerade etwas anderes tut.
 */
function shownButtons(): FingerButtons {
  return editing ? HELD_BUTTONS : buttons;
}

function applyButtons(): void {
  viewer.setButtons(shownButtons());
}

/**
 * Die beiden Knöpfe im Kopf auf den Stand bringen — und zwar auf den, den die
 * **Bühne** zeigt, nicht auf den zuletzt gespeicherten.
 *
 * Beim Justieren hält die Hand, komme was wolle; die Knöpfe standen dabei
 * trotzdem so da, wie man sie zuletzt gelassen hatte. Wer *Trigger* eingeschaltet
 * hatte und dann *Bearbeiten* drückte, sah einen leuchtenden Knopf und einen
 * Finger, der nicht zog — und wer ihn drückte, sah gar nichts passieren. Also
 * zeigen sie jetzt den Stand der Bühne und sind so lange **aus dem Betrieb**,
 * wie das Justieren läuft; ihr Titel sagt warum.
 */
function showButtons(): void {
  const shown = shownButtons();
  for (const button of fingers.querySelectorAll<HTMLButtonElement>('button')) {
    const key = button.dataset['button'] as keyof FingerButtons;
    const on = shown[key];
    button.classList.toggle('is-active', on);
    button.setAttribute('aria-pressed', String(on));
    button.disabled = editing;
    button.title = editing
      ? 'Beim Justieren hält die Hand das Werkzeug — der Zeigefinger liegt am Rahmen, damit die Linie stimmt'
      : (ORIGINAL_TITLES.get(button) ?? '');
  }
}

/** Die Titel, wie sie in `tools.html` stehen — der Justierer leiht sie sich. */
const ORIGINAL_TITLES = new Map<HTMLButtonElement, string>(
  [...fingers.querySelectorAll<HTMLButtonElement>('button')].map((button) => [
    button,
    button.title,
  ]),
);

// --- die freie Kamera --------------------------------------------------------

/**
 * **Fliegen statt drehen** — der zweite Modus für eine Welt.
 *
 * Von außen sieht man, wie eine Welt *angelegt* ist: den Grundriss, die Runde,
 * das Tal. Wie sie sich *anfühlt*, sieht man erst von innen — und dafür gibt es
 * hier eine Drohne: die Welt steht still, die Kamera geht darin herum. Kein
 * Spieler, sondern eine Drohne, und das mit Absicht: keine Schwerkraft, keine
 * Wände, kein Boden, denn wer sich eine Kulisse ansieht, will auch über sie
 * hinweg und in sie hinein.
 *
 * Bedient wird sie mit **Knöpfen über dem Bild** (links W A S D, rechts hoch
 * und runter) und mit **denselben Tasten**, wenn eine Tastatur da ist —
 * dazwischen dreht Wischen den Blick. Gehalten wird gedrückt: was hier
 * zusammenkommt, ist eine Menge von Richtungen, und der Betrachter macht daraus
 * Bild für Bild eine Bewegung (`viewer.setFlyInput`, `flyCamera.ts`). Ein Tipp
 * je Schritt wäre ein Ruckeln und kein Flug.
 */
const FLY_KEYS: Record<string, string> = {
  w: 'forward',
  arrowup: 'forward',
  s: 'back',
  arrowdown: 'back',
  a: 'left',
  arrowleft: 'left',
  d: 'right',
  arrowright: 'right',
  ' ': 'up',
  e: 'up',
  pageup: 'up',
  shift: 'down',
  q: 'down',
  pagedown: 'down',
};

/** Die Zeile unter der Bühne — sie sagt, was die Finger dort gerade tun. */
const HELP_VIEW = 'Ziehen dreht · zwei Finger oder Rad zoomen · Doppeltipp stellt zurück';
const HELP_FLY = 'Wischen schaut sich um · Knöpfe oder W A S D fliegen · Doppeltipp stellt zurück';

/** Ob die freie Kamera gerade fliegt. */
let flying = false;

/** Was gerade gedrückt ist — ein Knopf und eine Taste sind dieselbe Richtung. */
const held = new Set<string>();

function pressFly(direction: string, down: boolean): void {
  if (down) held.add(direction);
  else held.delete(direction);
  for (const key of pad.querySelectorAll<HTMLButtonElement>('[data-fly]')) {
    key.classList.toggle('is-down', held.has(key.dataset['fly'] ?? ''));
  }
  viewer.setFlyInput({
    forward: (held.has('forward') ? 1 : 0) - (held.has('back') ? 1 : 0),
    right: (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0),
    up: (held.has('up') ? 1 : 0) - (held.has('down') ? 1 : 0),
  });
}

function releaseFly(): void {
  for (const direction of [...held]) pressFly(direction, false);
}

for (const key of pad.querySelectorAll<HTMLButtonElement>('[data-fly]')) {
  const direction = key.dataset['fly'] ?? '';
  // Zeiger und nicht Klicks: ein Klick kommt erst beim Loslassen, und eine
  // Kamera, die sich erst dann bewegt, fliegt nicht, sondern hüpft. Der
  // Fangring hält den Zeiger auch dann bei diesem Knopf, wenn der Daumen beim
  // Halten verrutscht — sonst bliebe die Richtung hängen.
  key.addEventListener('pointerdown', (event) => {
    key.setPointerCapture(event.pointerId);
    event.preventDefault();
    pressFly(direction, true);
  });
  const stop = (): void => pressFly(direction, false);
  key.addEventListener('pointerup', stop);
  key.addEventListener('pointercancel', stop);
  // Der Fangring endet, wenn das Fenster den Zeiger verliert (ein Anruf, ein
  // Wechsel der Anwendung) — auch dann hört das Fliegen auf.
  key.addEventListener('lostpointercapture', stop);
}

window.addEventListener('keydown', (event) => {
  if (!flying || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
  const direction = FLY_KEYS[event.key.toLowerCase()];
  if (!direction) return;
  // Die Leertaste rollt sonst die Seite, die Pfeiltasten auch.
  event.preventDefault();
  pressFly(direction, true);
});

window.addEventListener('keyup', (event) => {
  const direction = FLY_KEYS[event.key.toLowerCase()];
  if (direction) pressFly(direction, false);
});

// Wer die Seite wegklickt, während er fliegt, käme sonst zu einer Kamera
// zurück, die immer noch in eine Richtung zieht.
window.addEventListener('blur', releaseFly);

fly.addEventListener('click', () => setFlying(!flying));

function setFlying(on: boolean): void {
  flying = on && !fly.hidden;
  releaseFly();
  viewer.setFlying(flying);
  fly.setAttribute('aria-pressed', String(flying));
  // Derselbe Knopf sagt, was ein Tippen jetzt täte — wie *Bearbeiten* und
  // *Fertig* beim Werkzeug.
  flyLabel.textContent = flying ? 'Von außen' : 'Freie Kamera';
  pad.hidden = !flying;
  help.textContent = flying ? HELP_FLY : HELP_VIEW;
}

// --- das Labor ---------------------------------------------------------------

/**
 * **Eine Welt, die läuft** — auf einem Telefon, ohne Brille und ohne die Welt
 * zu betreten (`worlds/shared/livePreview.ts`).
 *
 * Der Grund dafür steht im Navigationslabor: Es besteht aus sechs Knöpfen und
 * dem, was danach passiert, und ein stehendes Bild davon zeigt sechs Kuppeln.
 * Was hier dazukommt, sind drei Sachen, und mehr braucht es nicht:
 *
 * - **Die Knöpfe der Welt als Zeilen.** Dieselben Objekte, dieselben
 *   Handgriffe wie in der Brille — nur mit ihren Namen daneben. Antippen im
 *   Bild geht auch, aber „Stachelgrube · Start" trifft man aus dreißig Metern
 *   Höhe sicherer als eine Kuppel von vier Pixeln.
 * - **Die Debug-Ebenen zum Schalten.** Kacheln, Wände, Verbindungen, Sperren,
 *   Wege — dieselben fünf wie im Handgelenk-Menü und an der Wandkonsole.
 * - **Ein Ziel.** In einer Vorschau steht kein Spieler, und ein Zombie ohne
 *   jemanden bleibt stehen. Ein Tipp auf den Boden setzt die Attrappe, und
 *   von da an läuft alles dorthin — das ist die Ansicht, wegen der es das
 *   Ganze gibt: von oben zusehen, wie das Gitter benutzt wird.
 */
let lab: LivePreview | null = null;
/** Welche Welt der Startknopf gerade anbietet — `null`, wenn keine kann. */
let labWorld: WorldDefinition | null = null;
/** Läuft gerade eine? */
let labRunning = false;
/**
 * Was die Schalter unter dem Bild neu zeichnet.
 *
 * Es gibt die Ebenen an **zwei** Bedienungen — hier und an der Wandkonsole im
 * Bild —, und beide zeigen denselben Zustand. Wer die eine drückt und die
 * andere nicht nachzieht, traut danach keiner von beiden mehr; genau deshalb
 * steht in der Welt derselbe Satz über ihre zwei Konsolen.
 */
const labDraws: (() => void)[] = [];

function offerLab(definition: WorldDefinition | null): void {
  labWorld = definition;
  labPanel.hidden = definition === null;
  labRun.disabled = false;
  labRun.textContent = 'Laufen lassen';
  labRun.setAttribute('aria-pressed', 'false');
  labTop.hidden = true;
  labSay.hidden = true;
  labKeys.hidden = true;
  labShow.hidden = true;
  labLede.hidden = definition === null;
}

/** Beendet, was läuft — beim Blättern, beim Verlassen, beim zweiten Druck. */
function stopLab(): void {
  lab = null;
  labRunning = false;
  labDraws.length = 0;
  detail.classList.remove('is-lab');
  viewer.onTap = null;
  labRun.textContent = 'Laufen lassen';
  labRun.setAttribute('aria-pressed', 'false');
  labTop.hidden = true;
  labSay.hidden = true;
  labSay.textContent = '';
  labKeys.hidden = true;
  labKeys.replaceChildren();
  labShow.hidden = true;
  labShow.replaceChildren();
}

labRun.addEventListener('click', () => {
  const definition = labWorld;
  if (!definition) return;
  if (labRunning) {
    // Zurück auf das stille Bild — und das ist wörtlich zu nehmen: Es wird
    // eine **neue** Welt gebaut, denn die laufende hat ihre Physik beim
    // Abräumen abgegeben.
    stopLab();
    void showWorld(definition);
    return;
  }
  void startLab(definition);
});

labTop.addEventListener('click', () => {
  setFlying(false);
  viewer.lookDown();
});

/**
 * Startet die Welt.
 *
 * Eine **frische** Instanz und nicht die, die als Bild dasteht: Die Vorschau
 * hat eine Attrappe statt einer Physik bekommen (`silentPhysics`), und eine
 * Welt tauscht ihr Fundament nicht im Betrieb aus. Der Betrachter räumt die
 * alte beim Aufstellen der neuen weg.
 */
async function startLab(definition: WorldDefinition): Promise<void> {
  const ticket = ++request;
  labRun.disabled = true;
  labRun.textContent = 'Startet …';
  try {
    const world = await definition.load();
    if (ticket !== request) return;
    const preview = await world.previewLive?.();
    if (!preview) return;
    if (ticket !== request) {
      preview.dispose();
      return;
    }
    viewer.showWorld(preview);
    viewer.start();
    lab = preview.live ?? null;
    labRunning = true;
    labRun.textContent = 'Anhalten';
    labRun.setAttribute('aria-pressed', 'true');
    // Mehr Bild: Unter der Bühne stehen jetzt eine Liste und ein Dutzend
    // Schalter, und die drückten sie auf ihre Mindesthöhe zusammen.
    detail.classList.add('is-lab');
    labTop.hidden = false;
    buildLabKeys();
    buildLabShow();
    lab?.onMessage((message) => {
      labSay.hidden = false;
      labSay.textContent = message;
    });
    viewer.onTap = onLabTap;
    // Von oben, sofort: Das ist die Ansicht, für die man es startet.
    viewer.lookDown();
  } catch (error) {
    console.warn(`Die Welt „${definition.title}" lässt sich nicht starten`, error);
    stopLab();
  } finally {
    labRun.disabled = false;
  }
}

/** Ein Tipp ins Bild: erst die Knöpfe, sonst das Ziel. */
function onLabTap(pick: StagePick | null): void {
  const live = lab;
  if (!live || !pick) return;
  for (const button of live.buttons) {
    if (!belongsTo(pick.object, button.object)) continue;
    button.press();
    flashKey(button.label);
    // Ein Druck im Bild kann eine Ebene umlegen (die Wandkonsole tut genau
    // das) — die Schalter unter dem Bild sagen dann sonst das Gegenteil.
    for (const draw of labDraws) draw();
    return;
  }
  live.moveTarget(pick.point);
}

/** Ob `object` das Ding selbst ist oder darin hängt. */
function belongsTo(object: THREE.Object3D, root: THREE.Object3D): boolean {
  for (let at: THREE.Object3D | null = object; at; at = at.parent) {
    if (at === root) return true;
  }
  return false;
}

/** Lässt die Zeile eines Knopfes kurz aufleuchten, der im Bild gedrückt wurde. */
function flashKey(label: string): void {
  for (const key of labKeys.querySelectorAll<HTMLButtonElement>('.lab__key')) {
    if (key.dataset['label'] !== label) continue;
    key.classList.add('is-hit');
    window.setTimeout(() => key.classList.remove('is-hit'), 220);
  }
}

/** Die Knöpfe der Welt als Liste — nach Buchten gruppiert, in ihrer Farbe. */
function buildLabKeys(): void {
  const live = lab;
  labKeys.replaceChildren();
  if (!live || live.buttons.length === 0) {
    labKeys.hidden = true;
    return;
  }
  const groups = new Map<string, PreviewButton[]>();
  for (const button of live.buttons) {
    if (button.quiet) continue;
    const name = button.group ?? '';
    const list = groups.get(name);
    if (list) list.push(button);
    else groups.set(name, [button]);
  }
  for (const [name, buttons] of groups) {
    const group = document.createElement('div');
    group.className = 'lab__group';
    if (name) {
      const heading = document.createElement('span');
      heading.className = 'lab__name';
      heading.textContent = name;
      group.append(heading);
    }
    const row = document.createElement('div');
    row.className = 'lab__row';
    for (const button of buttons) {
      const key = document.createElement('button');
      key.type = 'button';
      key.className = 'lab__key';
      key.textContent = button.label;
      key.dataset['label'] = button.label;
      if (button.accent !== undefined) key.style.setProperty('--key', hexColor(button.accent));
      key.addEventListener('click', () => {
        button.press();
        flashKey(button.label);
      });
      row.append(key);
    }
    group.append(row);
    labKeys.append(group);
  }
  labKeys.hidden = groups.size === 0;
}

/** Die Debug-Ebenen und die Lebensbalken — was man sehen will, einzeln. */
function buildLabShow(): void {
  const live = lab;
  labShow.replaceChildren();
  if (!live) {
    labShow.hidden = true;
    return;
  }
  labShow.hidden = false;
  labDraws.length = 0;
  for (const layer of NAV_LAYERS) {
    const key = document.createElement('button');
    key.type = 'button';
    key.className = 'lab__layer';
    key.textContent = layer.label;
    key.title = layer.sub;
    key.style.setProperty('--key', hexColor(layer.color));
    const draw = (): void => {
      key.setAttribute('aria-pressed', String(live.layers()[layer.id]));
    };
    key.addEventListener('click', () => {
      live.setLayer(layer.id, !live.layers()[layer.id]);
      draw();
    });
    draw();
    labDraws.push(draw);
    labShow.append(key);
  }

  // Und die Lebensbalken, als eine Zeile mit drei Stellungen: Sie gehören zu
  // dem, was man sehen will, aber nicht zum Gitter.
  const bars = document.createElement('button');
  bars.type = 'button';
  bars.className = 'lab__layer';
  bars.style.setProperty('--key', hexColor(0x5ee0a0));
  const drawBars = (): void => {
    const mode = NPC_BAR_MODES.find((entry) => entry.id === live.bars());
    bars.textContent = `Lebensbalken: ${mode?.label ?? 'aus'}`;
    bars.title = mode?.sub ?? '';
    bars.setAttribute('aria-pressed', String(live.bars() !== 'off'));
  };
  bars.addEventListener('click', () => {
    const at = NPC_BAR_MODES.findIndex((entry) => entry.id === live.bars());
    live.setBars(NPC_BAR_MODES[(at + 1) % NPC_BAR_MODES.length]!.id);
    drawBars();
  });
  drawBars();
  labDraws.push(drawBars);
  labShow.append(bars);
}

/** Eine Farbe aus dem Spiel als CSS-Farbe. */
function hexColor(value: number): string {
  return `#${value.toString(16).padStart(6, '0')}`;
}

// --- der Justierer -----------------------------------------------------------

/**
 * Bearbeiten ist ein **Modus** und kein zweiter Bildschirm: dasselbe Bild,
 * dieselbe Drehung, nur ein Regler dazu. Wer eine Haltung einstellt, will das
 * Ergebnis ja genau in der Ansicht sehen, in der er es vorher betrachtet hat.
 */
let editing = false;
let axis: EditAxis = 'x';
/** Die Ansicht, die vor dem Justieren galt — danach gilt wieder sie. */
let wasMode: HandMode | null = null;
/** Die Lage der Hand am Werkzeug, wie sie gerade eingestellt wird. */
let draft: PoseReadout | null = null;

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

/**
 * **Auf den Zylinder** — die Hand mit einem Tipp dorthin, wo der
 * Halterzylinder sie haben will.
 *
 * Im Bild stehen drei Linien: der weiße Zeigestrahl der Hand, der rosa Pfeil am
 * Halterzylinder und der violette am Ziel des Werkzeugs. Zwei davon zur
 * Deckung zu bringen ist das, worum es beim Justieren geht — und es über sechs
 * Achsen einzeln zu erwürgen ist Arbeit, die eine Zeile Mathematik erledigt
 * (`alignHand.ts`). Dieser Knopf nimmt Richtung **und** Ursprung: die
 * Fingerspitze landet im Mittelpunkt des Zylinders und der Finger auf dem
 * Pfeil.
 *
 * Geschrieben wird das Ergebnis wie jeder andere Wert: in das gewählte Ziel und
 * sofort. Der Knopf ist also nichts Eigenes neben dem Regler, sondern derselbe
 * Weg mit sechs Zahlen auf einmal.
 */
align.addEventListener('click', () => {
  const hand = viewer.handAim();
  const grip = viewer.gripAim();
  if (!hand || !grip) return;
  forgetPivot();
  writePose(readPose(alignHandToLine(hand.hand, hand.finger, grip)));
});

/**
 * **In Zielrichtung** — dieselbe Hand, auf den violetten Pfeil geschwenkt.
 *
 * Nur die **Richtung**, und das ist der Unterschied zum Knopf daneben: ein Ziel
 * ist eine Richtung und kein Ort. Der Nullpunkt eines Werkzeugs ist sein
 * Griffpunkt — dorthin gehört keine Fingerspitze —, also bleibt die Spitze
 * liegen, wo sie ist, und die Faust dreht sich um sie herum, bis der Finger
 * dorthin zeigt, wohin das Werkzeug zielt.
 *
 * Damit sind die beiden Knöpfe ein Weg und keine Alternative: erst *Auf den
 * Zylinder* (das setzt den Ort), dann *In Zielrichtung* (das setzt die Richtung),
 * und danach dreht man mit Roll die Faust um genau diese Linie.
 */
aimAt.addEventListener('click', () => {
  const hand = viewer.handAim();
  const aim = viewer.toolAim();
  if (!hand || !aim) return;
  forgetPivot();
  writePose(readPose(turnHandTo(hand.hand, hand.finger, aim.direction)));
});

revert.addEventListener('click', () => {
  const id = viewer.toolId;
  if (!id) return;
  forgetDraft();
  // Das ganze Ziel und nicht nur die eine Achse: wer zurücksetzt, will die
  // gebaute Haltung wiederhaben, und die besteht aus sechs Zahlen.
  if (editTarget() !== 'hold') {
    clearHoldHandPose(viewer.handSide, id);
    viewer.refresh();
  } else if (id === HAND_TOOL) {
    clearIdleHandPose(viewer.handSide);
    showHandTool();
  } else {
    clearPose(id);
    viewer.setHoldPose(null);
  }
  forgetDraft();
  showEditor();
});

/**
 * **Eigene Einstellungen löschen** — der Weg zurück auf die ausgelieferten
 * Zahlen, für dieses Gerät.
 *
 * Er gehört auf diese Seite, weil hier eingestellt wird: wer eine Haltung
 * verzogen hat und nicht mehr weiß, welche, kommt sonst nur über die
 * Entwicklerwerkzeuge des Browsers wieder heraus. Und er gehört in die
 * Schublade und nicht neben den Regler — der Knopf dort heißt auch
 * *Zurücksetzen* und meint **eine** Haltung; zwei Knöpfe mit demselben Wort und
 * verschiedener Reichweite nebeneinander sind eine Falle.
 *
 * Gelöscht wird **alles, was das Spiel auf diesem Gerät abgelegt hat**, und
 * nicht nur, was diese Seite schreibt: die Handhaltungen und die Werkzeuglagen,
 * aber ebenso Gürtel, Waffenwerte, Drohne und der Rest unter `bgvr.` — sie
 * stehen im selben Speicher derselben Herkunft, und „zurückgesetzt" heißt
 * zurückgesetzt. Der Dialog sagt vorher, worum es geht, denn rückgängig macht
 * das niemand.
 *
 * Die beiden Speicher mit eigenem Zwischenspeicher werden über ihre eigenen
 * Wege geleert (`clearHandPoses`, `clearPoses`) — ein `removeItem` allein ließe
 * die Zahlen im Arbeitsspeicher stehen, und die Seite zeigte weiter das Alte.
 */
wipe.addEventListener('click', () => {
  const poses = handPoseCount() + storedPoseCount();
  const what = poses
    ? `${poses} eigene ${poses === 1 ? 'Haltung' : 'Haltungen'} und alles andere`
    : 'alles';
  // Ohne Rückfrage nur dort, wo es gar keine gibt: ein `confirm`, das fehlt,
  // darf den Knopf nicht stumm ins Leere laufen lassen.
  const sure =
    globalThis.confirm?.(
      `Wirklich ${what} löschen?\n\n` +
        'Handhaltungen, Werkzeuglagen und die Einstellungen des Spiels auf ' +
        'diesem Gerät (Gürtel, Waffenwerte, Drohne …) gehen dabei verloren und ' +
        'stehen wieder auf den ausgelieferten Werten.',
    ) ?? true;
  if (!sure) return;

  clearHandPoses();
  clearPoses();
  for (const key of gameKeys()) {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      /* Ein Speicher, den der Browser sperrt, hat auch nichts zu löschen. */
    }
  }

  forgetDraft();
  viewer.setHoldPose(null);
  viewer.refresh();
  showEditor();
  wipeNote.textContent = 'Gelöscht — alles steht wieder auf den Werkswerten.';
});

/**
 * **Handmodell** — Boxhand oder weißer Handschuh, dieselbe Einstellung wie im
 * Handgelenk-Menü (`core/handLook.ts`). Nach dem Wechsel wird das Werkzeug
 * neu aufgestellt: die Hand auf der Bühne ist gebaut und zieht sich nicht um,
 * und das Boxhand-Werkzeug trägt sein Kleid selbst.
 */
look.addEventListener('click', () => {
  saveHandLook(nextHandLook(handLook()));
  showLook();
  route();
});

function showLook(): void {
  look.textContent = `Handmodell: ${handLookLabel(handLook())}`;
}

showLook();

/** Alle Schlüssel dieses Spiels im Speicher — `bgvr.` ist die Handschrift. */
function gameKeys(): string[] {
  const keys: string[] = [];
  try {
    const store = globalThis.localStorage;
    if (!store) return keys;
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      if (key?.startsWith('bgvr.')) keys.push(key);
    }
  } catch {
    /* siehe oben */
  }
  return keys;
}

codeTool.addEventListener('click', () => {
  const id = viewer.toolId;
  if (id) copy(codeTool, toolGearCode(id, viewer.handSide), 'Werkzeug');
});
codeAll.addEventListener('click', () => copy(codeAll, gearCode(), 'Alles'));

function setEditing(on: boolean): void {
  editing = on && viewer.toolId !== null;
  edit.setAttribute('aria-pressed', String(editing));
  // „Fertig" statt „Bearbeiten", sobald der Modus läuft: derselbe Knopf, und
  // man sieht ihm an, was ein Tippen jetzt täte.
  editLabel.textContent = editing ? 'Fertig' : 'Bearbeiten';
  axesBar.hidden = !editing;
  editor.hidden = !editing;
  // Der Hinweistext weicht: auf einem Telefon ist der Platz unter der Bühne
  // genau einmal da, und der Regler braucht ihn dringender.
  foot.hidden = editing;
  // Eine Haltung, die sich beim Justieren von selbst weiterdreht, justiert
  // niemand.
  if (editing) viewer.setSpinning(false);
  // **Der Umschalter oben bleibt**, und er ist beim Justieren mehr als eine
  // Ansicht: er sagt, was der Regler verschiebt. *Hand in VR* bewegt die
  // gezeichnete Hand am stehenden Werkzeug, *Hand in echt* das Werkzeug in der
  // stehenden Hand — die eigene Hand hält einen Controller, an ihr gibt es
  // nichts einzustellen. Nur *Hand aus* ergibt beim Justieren keinen Sinn: dort
  // steht gar keine Hand, gegen die man etwas ausrichten könnte.
  hands.hidden = viewer.toolId === null;
  fingers.hidden = hands.hidden;
  sides.hidden = hands.hidden;
  applyButtons();
  showButtons();
  // Und die Achsen dazu: sechs Zahlen ohne ein Kreuz daneben sind sechs Zahlen.
  viewer.setEditing(editing);
  if (editing && mode === 'off') {
    wasMode ??= mode;
    setMode('vr');
  } else if (!editing && wasMode) {
    const previous = wasMode;
    wasMode = null;
    setMode(previous);
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

const ZERO: PoseReadout = { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 0 };

/**
 * Die Lage des **Werkzeugs im Griffraum**, als Pose — so, wie es dort wirklich
 * hängt, und damit das, was der Regler in *Hand in echt* schiebt.
 *
 * **Mit** Zielkorrektur, genau wie der Betrachter sie zeichnet: sie kommt sonst
 * aus einem Controller, und im Browser gibt es keinen, also steht sie als Zahl
 * da (`GRIP_TO_RAY`). Ohne sie zöge der Regler an einem Werkzeug, das 30° neben
 * dem gezeichneten steht — und speicherte diese 30° mit ab.
 *
 * Und zwar **dieselbe** Zielkorrektur, mit der der Betrachter zeichnet
 * (`viewer.aimOf`): für Controller, Boxhand und Handschuhe ist das die Ruhe.
 * Eine Weile stand hier `GRIP_TO_RAY` für alle, und der Regler rechnete an
 * den Controllern mit einer Hand, die 30° neben der gezeichneten stand.
 */
function toolInGripNow(): Pose {
  return toolInGrip(poseFromReadout(viewer.holdReadout() ?? ZERO), viewer.aimOf());
}

/** Und die Haltung der **Hand im Griffraum**, als Pose — das, was *Hand in VR* schiebt. */
function handInGripNow(): Pose {
  const id = viewer.toolId;
  return poseOfHand(id ? holdHandPose(viewer.handSide, id) : idleHandPose(viewer.handSide));
}

/**
 * **Was der Regler gerade verschiebt** — und das sagt die Ansicht oben im Kopf,
 * nicht ein zweiter Umschalter darunter.
 *
 * In *Hand in VR* steht das Werkzeug und die gezeichnete Hand wandert daran
 * (`grip`: geschrieben wird ihre Griffhaltung). In *Hand in echt* steht die
 * eigene Hand — an ihr gibt es nichts einzustellen, sie hält einen Controller
 * — und das **Werkzeug** wandert darin (`hold`: geschrieben wird seine Lage im
 * Griff).
 */
function editTarget(): EditTarget {
  return mode === 'controller' ? 'hold' : 'grip';
}

/**
 * Die sechs Zahlen, an denen der Regler gerade zieht — **wo das Ding liegt,
 * das sich bewegt, von der echten Hand aus gesehen**.
 *
 * Der Rahmen ist in beiden Ansichten derselbe (`handFrame.ts`): Nullpunkt der
 * Griffpunkt, -Z die Blickrichtung der Hand. Was wechselt, ist nur, *wessen*
 * Lage darin steht:
 *
 * - *Hand in VR*: die der **Hand** — sie wandert am stehenden Werkzeug.
 * - *Hand in echt*: die des **Werkzeugs** — es wandert in der stehenden Hand.
 *
 * In beiden Fällen ist es das, was sich auf dem Schirm bewegt, und deshalb ist
 * der Regler das, was man sieht, und nicht eine Zahl daneben. Und weil der
 * Rahmen derselbe bleibt, heißt „X ein Stück weiter" in beiden Ansichten
 * dasselbe: nach rechts, von der eigenen Hand aus.
 *
 * Gespeichert wird davon nichts — der Weg dorthin geht durch `writePose`,
 * zurück in den Griffraum und in dieselben Speicher wie in der Brille.
 */
function currentPose(): PoseReadout {
  if (!viewer.toolId) return ZERO;
  // Gehalten, nicht jedes Mal neu aus dem Speicher gerechnet. Der Weg dorthin
  // geht über zwei Verkettungen und eine Rundung auf Zehntel und ganze Grad —
  // einmal ist das nichts, aber ein Regler feuert beim Ziehen hundert Mal, und
  // dann wanderten die fünf Achsen, an denen gerade *niemand* zieht, um je eine
  // halbe Rundung mit. Ein Entwurf, der nur seine eigene Achse ändert, kann das
  // nicht.
  draft ??= readPose(inRealHand(editTarget() === 'hold' ? toolInGripNow() : handInGripNow()));
  return draft;
}

/** Der Entwurf gilt für ein Werkzeug; ein anderes fängt beim Speicher an. */
function forgetDraft(): void {
  draft = null;
  forgetPivot();
}

/**
 * **Der Drehpunkt: die Fingerspitze.**
 *
 * Yaw, Pitch und Roll drehen die Hand um den Punkt, an dem ihre Linie anfängt,
 * und nicht um ihr Handgelenk. Der Unterschied ist der ganze Justiervorgang:
 * um das Handgelenk gedreht wandert die Spitze weg — man hat die Linie eben
 * noch auf den Griff gelegt und dreht sie mit dem ersten Grad Roll wieder
 * herunter. Um die Spitze gedreht bleibt die Linie liegen, und man dreht die
 * Faust *an ihr*, so wie man eine Hand um einen Griff dreht, den man schon hält.
 *
 * Festgehalten wird der Punkt für die ganze Ziehbewegung und nicht Bild für
 * Bild neu genommen: gespeichert wird auf Zehntelzentimeter, und ein Punkt, der
 * sich jedes Mal aus der gerundeten Lage neu ergibt, wandert über zweihundert
 * Regler-Ticks um einige Millimeter davon. Vergessen wird er, sobald etwas
 * anderes die Hand bewegt — ein Versatz, ein Knopf, ein Werkzeugwechsel —, denn
 * dann liegt die Spitze woanders.
 */
let pivot: Vec3 | null = null;

function forgetPivot(): void {
  pivot = null;
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
  // Die neue Lage im Rahmen der echten Hand — das ist es, was der Regler sagt.
  const next = withAxis(currentPose(), axis, clampAxis(axis, value));
  // Ein Winkel dreht um die Fingerspitze; ein Versatz schiebt die Hand und
  // verlegt damit genau den Punkt, um den gedreht würde.
  //
  // Und das gilt nur, solange die **Hand** das ist, was wandert. In *Hand in
  // echt* wandert das Werkzeug: es dreht sich dann um seinen eigenen Nullpunkt
  // und bleibt liegen, wo es liegt. Um die Spitze einer Hand gedreht, die sich
  // gar nicht bewegt, spränge es bei jedem Grad quer durch die Faust.
  const turning = axisSpec(axis).unit === '°';
  if (!turning) forgetPivot();
  writePose(turning && editTarget() === 'grip' ? aboutFingertip(next) : next, syncSlider);
}

/**
 * Dieselbe Drehung, aber um die Fingerspitze statt um das Handgelenk — und die
 * drei Versätze so nachgezogen, dass die Spitze dabei liegen bleibt.
 *
 * Gerechnet wird an der Hand, die wirklich auf der Bühne steht (`handAim`), und
 * nicht am gerundeten Entwurf: die Linie, die liegen bleiben soll, ist die
 * gezeichnete. Sie kommt aus dem Betrachter im **Rahmen der echten Hand** —
 * demselben, in dem der Regler zieht —, also passt hier alles zusammen, ohne
 * dass etwas umgerechnet würde.
 */
function aboutFingertip(next: PoseReadout): PoseReadout {
  const aim = viewer.handAim();
  if (!aim) return next;
  pivot ??= aim.finger.origin;
  return readPose(handAboutPivot(aim.hand, aim.finger, poseFromReadout(next).rotation, pivot));
}

/**
 * Dieselbe Übernahme mit allen sechs Zahlen auf einmal — der Weg des Knopfes
 * *Auf den Zylinder*.
 *
 * Geklemmt wird auch hier, und zwar aus demselben Grund wie am Regler: was
 * gespeichert wird, muss ein Kurzcode tragen können. Ein Griff, der weiter als
 * 30 cm vom Nullpunkt des Werkzeugs weg liegt, bekommt die Hand deshalb bis an
 * die Grenze und nicht darüber hinaus — und die Zahl unter dem Regler sagt
 * dann auch, dass dort die Grenze steht.
 */
function writePose(next: PoseReadout, syncSlider = true): void {
  const id = viewer.toolId;
  if (!id) return;
  draft = clampPose(next);
  // Der eine Schritt aus dem Rahmen der echten Hand zurück in den Griffraum —
  // dort, und nur dort, wird gespeichert.
  const inGrip = fromRealHand(poseFromReadout(draft));

  if (editTarget() === 'hold') {
    // **Das Werkzeug wandert** in der stehenden Hand. Gespeichert wird seine
    // Lage im Griff, also muss die Zielkorrektur wieder heraus, mit der der
    // Betrachter es hineingerechnet hat (`toolInGrip`).
    const hold = holdFromGrip(inGrip, viewer.aimOf());
    if (id === HAND_TOOL) {
      // Die Boxhand ist die Hand selbst; ihre Lage im Griff *ist* die
      // Grundhaltung dieser Hand (siehe oben).
      saveIdleHandPose(viewer.handSide, {
        ...idleHandPose(viewer.handSide),
        ...readPose(hold),
      });
    } else {
      // Die Seite misst immer an derselben Hand, also steht sie auch als
      // Herkunft im Speicher — eine Zahl ohne Seite ist später nicht mehr zu
      // deuten.
      savePose(id, hold, viewer.handSide);
    }
    viewer.setHoldPose(hold);
    showEditor(syncSlider);
    return;
  }

  // **Die Hand wandert**, das Werkzeug bleibt im Griff, wo es ist — und ihre
  // Griffhaltung *ist* ihre Lage im Griffraum. Nur die sechs Zahlen: Finger
  // und Spreizung gehören zur Haltung und werden von einem Regler für Ort und
  // Winkel nicht angefasst.
  const base = holdHandPose(viewer.handSide, id);
  saveHoldHandPose(viewer.handSide, id, { ...base, ...readPose(inGrip) });
  viewer.refresh();
  showEditor(syncSlider);
}

/**
 * **Hand in echt übernehmen** — die Faust, mit der die eigene Hand das Gerät
 * hält, als gezeichnete Haltung dieses Werkzeugs.
 *
 * Der kürzeste Weg zu einer Haltung, die sicher sitzt: „halte es so, wie ich
 * es wirklich halte." Übernommen wird die ganze Haltung samt Fingern —
 * Krümmung und Spreizung gehören dazu, wenn es dieselbe Faust sein soll — und
 * für ein Werkzeug mit Halterzylinder ist das Ergebnis genau die Faust, die es
 * ohnehin erbt. Interessant wird der Knopf bei allem anderen: der Pinsel, der
 * Beutel, die Stoppuhr liegen dann so in der Hand, wie der Controller darin
 * liegt.
 */
function takeRealHand(): void {
  const id = viewer.toolId;
  if (!id || id === HAND_TOOL) return;
  forgetDraft();
  saveHoldHandPose(viewer.handSide, id, clonePose(holdHandPose(viewer.handSide, GRIP_POSE_ID)));
  viewer.refresh();
  showEditor();
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
  if (syncSlider) {
    slider.min = String(spec.min);
    slider.max = String(spec.max);
    slider.step = String(spec.step);
    slider.value = String(value);
  }

  // Alle drei Knöpfe richten die **Hand** aus — es gibt sie also nur dort, wo
  // die Hand das ist, was sich bewegt, und nur, wo es etwas auszurichten gibt:
  // an einem Hammer wäre *Auf den Zylinder* ein Knopf, der nichts tun kann,
  // die Boxhand zielt nirgendwohin, und sie *ist* die Hand.
  const moving = editTarget();
  align.hidden = !viewer.hasGrip || moving === 'hold';
  aimAt.hidden = !viewer.hasAim || moving === 'hold';
  asReal.hidden = moving === 'hold' || viewer.toolId === HAND_TOOL;
  const targetHint = EDIT_TARGETS.find((entry) => entry.key === moving);
  reading.textContent = `${spec.label} ${formatAxis(axis, value)} · ${spec.hint}`;
  // Und wessen Lage da steht — im Rahmen der echten Hand, in beiden Ansichten
  // derselbe. Die Zeile sagt es dazu, denn die sechs Zahlen sind nicht mehr
  // die, die im Speicher stehen: dorthin geht es eine Drehung später.
  values.textContent =
    `${moving === 'hold' ? 'Werkzeug' : 'Hand'} in der echten Hand: ` +
    `${formatAxes(pose)} — ${targetHint?.hint ?? ''}`;

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

// --- der Zuschauerplatz ------------------------------------------------------

/**
 * **Verbinden**: dieselbe Sitzung wie beim Zusammenspielen, nur ohne Spiel.
 *
 * Drüben drückt jemand im Poseraum *Handpose teilen*; von da an schickt seine
 * Brille zwanzigmal je Sekunde die Haltung der Hand, die er gerade misst
 * (`worlds/tune/handShare.ts`). Hier steht sie als Werkzeug mit einer Hand
 * daran — dieselben Modelle wie im Spiel — und darunter ihr Konfig-Code, in
 * einem Feld, aus dem man ihn herauskopiert.
 *
 * Gezeigt wird **eine** Hand und sonst nichts. Das ist der Punkt: wer beim
 * Einstellen zusieht, will die Hand am Ding sehen und nicht einen halben
 * Spieler drumherum.
 */
const live = new LiveHand();
const link = new LiveLink(applyShare, showLiveStatus);

/** Die zuletzt angekommene Haltung — beim Betreten der Seite steht sie sofort da. */
let lastShare: HandShare | null = null;
/** Ob die Bühne gerade dem Zuschauerplatz gehört. */
let liveShowing = false;

liveRoom.value = rememberedRoom();
liveName.value = rememberedName();
liveConnect.addEventListener('click', () => void toggleLive());
liveCopy.addEventListener('click', () => copyLiveCode());

async function toggleLive(): Promise<void> {
  if (link.connecting) return;
  if (link.connected) {
    link.disconnect();
    showLiveStatus('offline', '');
    return;
  }
  liveConnect.disabled = true;
  try {
    liveRoom.value = await link.connect(liveRoom.value, liveName.value);
  } catch (error) {
    showLiveStatus('error', (error as Error).message);
  } finally {
    liveConnect.disabled = false;
    showLiveButton();
  }
}

/** Die Statuszeile — dieselben fünf Zustände, die die Sitzung kennt. */
function showLiveStatus(status: NetStatus, detail: string): void {
  const words: Record<NetStatus, string> = {
    offline: 'Nicht verbunden',
    connecting: 'Verbinde …',
    waiting: 'Verbunden — warte auf die Brille',
    online: 'Verbunden',
    error: 'Fehler',
  };
  liveStatus.textContent = detail ? `${words[status]} · ${detail}` : words[status];
  liveStatus.classList.toggle('is-bad', status === 'error');
  liveStatus.classList.toggle('is-good', status === 'online');
  showLiveButton();
}

function showLiveButton(): void {
  liveConnect.textContent = link.connected ? 'Trennen' : 'Verbinden';
  liveConnect.classList.toggle('is-on', link.connected);
}

/**
 * Eine hereingekommene Haltung: auf die Bühne, in das Feld.
 *
 * Gebaut wird nur, wenn sich Werkzeug oder Seite geändert haben — die
 * Bewegung dazwischen verschiebt die stehende Hand. Und gebaut wird gar
 * nichts, solange die Bühne einem Werkzeug aus dem Regal gehört: der Code
 * steht trotzdem im Feld, denn den will man auch dann.
 */
function applyShare(share: HandShare): void {
  lastShare = share;
  showLiveCode(share);
  if (!liveShowing) return;
  const built = live.update(share);
  if (built) {
    viewer.showObject(built.object, { dispose: () => built.dispose(), pitch: LIVE_PITCH });
    viewer.start();
  }
}

/** Wie schräg von oben man auf eine geteilte Hand sieht. */
const LIVE_PITCH = 0.22;

function showLiveCode(share: HandShare): void {
  const what = share.toolId ? toolLabel(share.toolId) : 'Leere Hand';
  const hand = share.hand === 'left' ? 'Linke Hand' : 'Rechte Hand';
  liveWhat.textContent = share.saved
    ? `${hand} · ${what} — gespeichert ✓`
    : `${hand} · ${what} — live`;
  liveWhat.classList.toggle('is-good', share.saved);
  if (liveCode.value !== share.code) liveCode.value = share.code;
}

/** Wie ein Werkzeug heißt — aus derselben Liste, aus der das Regal liest. */
function toolLabel(id: string): string {
  return byHash.get(id)?.label ?? id;
}

function copyLiveCode(): void {
  const code = liveCode.value;
  if (!code) return;
  const done = (text: string): void => {
    liveCopy.textContent = text;
    window.setTimeout(() => (liveCopy.textContent = 'Code kopieren'), 1400);
  };
  // Ohne Zwischenablage bleibt das Feld: markieren geht immer noch, und genau
  // dafür ist es ein Feld und kein Knopf mit Schrift darauf.
  const clipboard = globalThis.navigator?.clipboard;
  if (!clipboard) {
    liveCode.select();
    done('Markiert — jetzt kopieren');
    return;
  }
  clipboard.writeText(code).then(
    () => done('Kopiert ✓'),
    () => {
      liveCode.select();
      done('Markiert — jetzt kopieren');
    },
  );
}

/**
 * Den Zuschauerplatz auf- oder zuklappen.
 *
 * Die **Leitung bleibt**, wenn man weiterblättert: wer zwischendurch ein
 * Werkzeug nachsieht, soll nicht neu verbinden müssen, und die Codes laufen
 * derweil weiter ins Feld. Nur die Bühne gehört dann jemand anderem.
 */
function showLive(on: boolean): void {
  liveShowing = on;
  livePanel.hidden = !on;
  liveOut.hidden = !on;
  if (!on) return;
  detail.hidden = false;
  hint.textContent = 'Die Hand, die drüben gerade gemessen wird.';
  note.hidden = true;
  enter.hidden = true;
  help.textContent = HELP_VIEW;
  showLiveButton();
  if (lastShare) applyShare(lastShare);
  viewer.start();
}

// --- welcher Zustand gilt ----------------------------------------------------

window.addEventListener('hashchange', route);
route();

/** Welches Regal ein Übersichts-Hash meint — oder keines. */
function sectionOf(hash: string): Section | null {
  if (hash === '' || hash === SECTION_HASH.tools) return 'tools';
  if (hash === SECTION_HASH.worlds) return 'worlds';
  if (hash === SECTION_HASH.bag) return 'bag';
  if (hash === SECTION_HASH.npc) return 'npc';
  if (hash === SECTION_HASH.live) return 'live';
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
  // Ein einzelnes Ding aus einem Regal: der Zuschauerplatz gibt die Bühne ab,
  // die Leitung behält er.
  showLive(false);
  for (const grid of Object.values(grids)) grid.hidden = true;
  lede.hidden = true;
  detail.hidden = false;
  hands.hidden = entry.section !== 'tools';
  fingers.hidden = hands.hidden;
  sides.hidden = hands.hidden;
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
  showButtons();
  // Was hier eben lief, läuft nicht weiter: Eine neue Kachel ist eine neue
  // Bühne, und `entry.show()` bietet gleich an, was diese kann.
  stopLab();
  offerLab(null);
  viewer.setHandMode(mode);
  // Vor `entry.show()`: die Seite steht fest, bevor das Werkzeug aufgestellt
  // wird — sonst baute der Betrachter erst die rechte Hand und drehte gleich
  // darauf auf die linke um.
  viewer.setHandSide(side);
  applyButtons();
  entry.show();
  showSide();
  forgetDraft();
  showHandTool(true);
  viewer.start();
  // Bearbeiten gibt es nur für Werkzeuge: eine Welt und ein Beutel-Objekt
  // liegen in keiner Hand, es gibt dort schlicht nichts zu justieren.
  edit.hidden = entry.section !== 'tools';
  setEditing(editing && entry.section === 'tools');
  // Und die freie Kamera nur für Welten: durch eine Zange fliegt niemand. Jede
  // Welt fängt dabei von außen an — der Überblick ist die Antwort auf „was ist
  // das für eine Welt", und der Flug die auf die zweite Frage.
  fly.hidden = entry.section !== 'worlds';
  setFlying(false);
}

function showOverview(section: Section): void {
  markSection(section);
  stopLab();
  offerLab(null);
  viewer.stop();
  viewer.show(null);
  detail.hidden = true;
  for (const [key, grid] of Object.entries(grids)) grid.hidden = key !== section;
  // Der Wegweiser gehört zum Werkzeugregal und nur zu ihm.
  lede.hidden = section !== 'tools';
  hands.hidden = true;
  fingers.hidden = true;
  sides.hidden = true;
  back.hidden = true;
  nav.hidden = false;
  edit.hidden = true;
  setEditing(false);
  fly.hidden = true;
  setFlying(false);
  title.textContent = SECTION_TITLES[section];
  document.title = `${SECTION_TITLES[section]} — Baumgartner VR`;
  // Der Zuschauerplatz ist kein Regal: er bringt die Bühne mit, aber keine
  // Kacheln — und deshalb steht er hier und nicht in `route`.
  showLive(section === 'live');
}
