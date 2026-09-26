/**
 * **Der KayKit-Editor** (`kaykit-editor.html`) — ein Element von oben, auf dem
 * Zellgitter, mit Reglern für Größe und Lage und einem Protokoll, das man
 * Claude schicken kann.
 *
 * Gewünscht: _„einen Spieler-Charakter sehen, alles von oben, und in der Mitte
 * ist das Objekt. Auf dem Boden die Prototype-Floors und dazu die
 * Gitterlinien, und die belegten Grid-Teile in rot … Slider, um die Größe des
 * Objektes zu skalieren, die roten Gitter-Boxen an- und auszuschalten und das
 * Objekt durch Slider in x und y zu verschieben. Alle Änderungen getrackt."_
 *
 * Die Rechnung — Zellen, Protokoll, Ausgabe — steht in `editorModel.ts`; hier
 * steht nur das Bild und die Bedienung. Gemerkt wird im Browser
 * (`localStorage`), sodass ein Neuladen nichts verliert.
 */
import * as THREE from 'three';
import { AvatarBody } from '../core/AvatarBody';
import { loadKaykitIndex } from '../core/kaykitModel';
import { kaykitFiles } from '../core/kaykitIndex';
import { PlateFloor, type PlateSeat } from '../worlds/shared/plateFloor';
import { fitProp } from '../worlds/haunting/world3d/stationProps';
import { CELL } from '../worlds/nav/cellGrid';
import {
  ANCHOR,
  OFFSET_MAX,
  SCALE_MAX,
  SCALE_MIN,
  allElements,
  cellSpan,
  elementById,
  exportState,
  footprintBox,
  gameFootprint,
  isChanged,
  occupiedCells,
  parseState,
  resetTune,
  setTune,
  tuneOf,
  tunedBox,
  type EditorElement,
  type FloorBox,
  type TuneField,
} from './editorModel';

const STORE = 'bgvr.kaykitEditor';
/** So weit liegt Boden, in Kacheln um die Mitte. */
const REACH = 6;
/** Der Kreis, als der der Spieler in der Ebene läuft (`nav/planeMove.PLAYER_PLANE_RADIUS`). */
const PLAYER_RADIUS = 0.35;
/** Wo die Figur steht: zwei Kacheln links vom Element, auf einer Ecke von vier Zellen. */
const PLAYER_AT = { x: ANCHOR.x - 2, z: ANCHOR.z };

function load(): ReturnType<typeof parseState> {
  try {
    return parseState(localStorage.getItem(STORE));
  } catch {
    return parseState(null);
  }
}
const state = load();
function save(): void {
  try {
    localStorage.setItem(STORE, JSON.stringify(state));
  } catch {
    // Ohne Speicher geht es trotzdem — nur nicht über ein Neuladen hinweg.
  }
}

function $<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} fehlt in kaykit-editor.html`);
  return el as T;
}

// ── Bild ────────────────────────────────────────────────────────────────────

const view = $<HTMLDivElement>('view');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x10141f, 1);
view.append(renderer.domElement);

const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xdfeaff, 0x6a6258, 2.2));
const sun = new THREE.DirectionalLight(0xfff4e2, 1.6);
sun.position.set(3, 8, 4);
scene.add(sun);

/** Von oben, ohne Fluchtpunkt: Eine Zelle ist überall gleich groß. Norden oben. */
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
camera.up.set(0, 0, -1);
const look = new THREE.Vector3(ANCHOR.x - 0.75, 0, ANCHOR.z);
let span = 7; // Meter, die in die kürzere Seite passen

function placeCamera(): void {
  const w = view.clientWidth || 1,
    h = view.clientHeight || 1;
  const aspect = w / h;
  const half = span / 2;
  camera.left = -half * Math.max(1, aspect);
  camera.right = half * Math.max(1, aspect);
  camera.top = half / Math.min(1, aspect);
  camera.bottom = -half / Math.min(1, aspect);
  camera.position.set(look.x, 30, look.z);
  camera.lookAt(look);
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}

// Der Boden: Prototyp-Platten, eine je Kachel — dieselbe Datei wie die Testwelt.
const seats: PlateSeat[] = [];
for (let x = -REACH; x < REACH; x++)
  for (let z = -REACH; z < REACH; z++) seats.push({ x: x + 0.5, y: 0, z: z + 0.5 });
new PlateFloor(scene, 'prototype-bits/Floor_Prototype.glb', seats);

// Die Gitterlinien: dünn je Zelle, kräftig je Kachel.
function gridLines(step: number, color: number, opacity: number, y: number): THREE.LineSegments {
  const points: number[] = [];
  for (let v = -REACH; v <= REACH + 1e-6; v += step) {
    points.push(v, y, -REACH, v, y, REACH);
    points.push(-REACH, y, v, REACH, y, v);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  return new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }),
  );
}
const cellLines = gridLines(CELL, 0x0b1426, 0.45, 0.012);
const tileLines = gridLines(1, 0x000000, 1, 0.014);
scene.add(cellLines, tileLines);

// Die belegten Zellen — rot wie _Menü → Grafik → Hitboxen (2D-Gitter)_.
const cellGeometry = new THREE.PlaneGeometry(CELL - 0.06, CELL - 0.06).rotateX(-Math.PI / 2);
const cellMaterial = new THREE.MeshBasicMaterial({
  color: 0xff5a4f,
  transparent: true,
  opacity: 0.55,
  depthWrite: false,
});
const cellGroup = new THREE.Group();
cellGroup.renderOrder = 2;
scene.add(cellGroup);

/**
 * Ein Rahmen auf dem Boden — vier flache Streifen statt einer Linie: Linien
 * sind in WebGL einen Bildpunkt dick und auf den blauen Platten kaum zu sehen.
 */
const edge = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
function frame(color: number, thick: number, order: number): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color, depthTest: false, transparent: true });
  for (let i = 0; i < 4; i++) {
    const bar = new THREE.Mesh(edge, material);
    bar.renderOrder = order;
    group.add(bar);
  }
  group.userData.thick = thick;
  scene.add(group);
  return group;
}
const modelOutline = frame(0xffffff, 0.035, 6);
const gameOutline = frame(0xffd23f, 0.05, 5);

function setOutline(group: THREE.Group, box: FloorBox | null, y: number): void {
  group.visible = !!box;
  if (!box) return;
  const t = group.userData.thick as number;
  const w = box.maxX - box.minX,
    d = box.maxZ - box.minZ;
  const cx = (box.minX + box.maxX) / 2,
    cz = (box.minZ + box.maxZ) / 2;
  const bars = group.children;
  bars[0]!.position.set(cx, y, box.minZ);
  bars[0]!.scale.set(w + t, 1, t);
  bars[1]!.position.set(cx, y, box.maxZ);
  bars[1]!.scale.set(w + t, 1, t);
  bars[2]!.position.set(box.minX, y, cz);
  bars[2]!.scale.set(t, 1, d + t);
  bars[3]!.position.set(box.maxX, y, cz);
  bars[3]!.scale.set(t, 1, d + t);
}

// Die Spielfigur, mit dem Kreis, als der sie in der Ebene läuft.
const player = new THREE.Group();
player.position.set(PLAYER_AT.x, 0, PLAYER_AT.z);
const body = new AvatarBody({ color: 0x3f6fb5, hands: true });
player.add(body);
const ring = new THREE.Mesh(
  new THREE.RingGeometry(PLAYER_RADIUS - 0.03, PLAYER_RADIUS, 40).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0x48e08a, depthTest: false, transparent: true }),
);
ring.position.y = 0.02;
ring.renderOrder = 4;
player.add(ring);
scene.add(player);
const head = { position: new THREE.Vector3(0, 1.62, 0), quaternion: new THREE.Quaternion() };

// Das Element: Halter (Lage, Drehung) → Maßstab → Modell (eingepasst, mittig).
const holder = new THREE.Group();
const scaler = new THREE.Group();
holder.add(scaler);
scene.add(holder);
/** Die Grundfläche des eingepassten Modells bei Faktor 1, in Metern. */
let base: { width: number; depth: number; height: number } | null = null;
let loading = 0;

async function showElement(element: EditorElement): Promise<void> {
  const ticket = ++loading;
  scaler.clear();
  base = null;
  status(`Lade ${element.path} …`);
  update();
  const module = await import('../core/kaykitModel');
  const model = await module.kaykitModel(element.path);
  if (ticket !== loading) return;
  if (!model) {
    status(`Nicht geladen: ${element.path}`);
    return;
  }
  if (element.fit) fitProp(model, element.fit, element.stretch);
  else centre(model);
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  base = {
    width: box.max.x - box.min.x,
    depth: box.max.z - box.min.z,
    height: box.max.y - box.min.y,
  };
  scaler.add(model);
  status('');
  update();
  save();
}

/** Ein Modell ohne Stellfläche: Mitte über den Ursprung, Unterkante auf null. */
function centre(model: THREE.Object3D): void {
  model.position.set(0, 0, 0);
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  model.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
}

// ── Bedienung ───────────────────────────────────────────────────────────────

const select = $<HTMLSelectElement>('element');
const info = $<HTMLDivElement>('info');
const statusLine = $<HTMLDivElement>('status');
const output = $<HTMLTextAreaElement>('output');
const showCells = $<HTMLInputElement>('show-cells');
const showGame = $<HTMLInputElement>('show-game');
const showModel = $<HTMLInputElement>('show-model');
const showPlayer = $<HTMLInputElement>('show-player');
const exportAll = $<HTMLInputElement>('export-all');

function status(text: string): void {
  statusLine.textContent = text;
}

function current(): EditorElement {
  return elementById(state, state.current) ?? allElements(state)[0]!;
}

interface Slider {
  field: TuneField;
  range: HTMLInputElement;
  number: HTMLInputElement;
}
const sliders: Slider[] = (['scale', 'offsetX', 'offsetZ'] as const).map((field) => {
  const range = $<HTMLInputElement>(`${field}-range`);
  const number = $<HTMLInputElement>(`${field}-number`);
  const min = field === 'scale' ? SCALE_MIN : -OFFSET_MAX;
  const max = field === 'scale' ? SCALE_MAX : OFFSET_MAX;
  for (const el of [range, number]) {
    el.min = String(min);
    el.max = String(max);
    el.step = field === 'scale' ? '0.01' : '0.05';
    el.addEventListener('input', () => change(field, Number(el.value)));
  }
  return { field, range, number };
});

function change(field: TuneField, value: number): void {
  if (setTune(state, current().id, field, value)) {
    save();
    update();
  }
}
function nudge(field: TuneField, by: number): void {
  change(field, tuneOf(state, current().id)[field] + by);
}

for (const button of document.querySelectorAll<HTMLButtonElement>('button[data-field]')) {
  button.addEventListener('click', () =>
    nudge(button.dataset['field'] as TuneField, Number(button.dataset['by'])),
  );
}

$<HTMLButtonElement>('reset').addEventListener('click', () => {
  if (resetTune(state, current().id)) {
    save();
    update();
  }
});

function fillSelect(): void {
  select.replaceChildren();
  const station = document.createElement('optgroup');
  station.label = 'Raumstation';
  const own = document.createElement('optgroup');
  own.label = 'Weitere aus dem Regal';
  for (const element of allElements(state)) {
    const option = document.createElement('option');
    option.value = element.id;
    option.textContent = `${isChanged(tuneOf(state, element.id)) ? '● ' : ''}${element.label}`;
    (element.id.startsWith('kaykit:') ? own : station).append(option);
  }
  select.append(station);
  if (own.children.length) select.append(own);
  select.value = state.current;
}

select.addEventListener('change', () => {
  state.current = select.value;
  save();
  void showElement(current());
});

// Ein beliebiges Modell aus dem Regal dazunehmen.
const addPath = $<HTMLInputElement>('add-path');
const addList = $<HTMLDataListElement>('kaykit-files');
let listed = false;
addPath.addEventListener('focus', () => {
  if (listed) return;
  listed = true;
  void loadKaykitIndex().then((index) => {
    if (!index) return;
    for (const file of kaykitFiles(index)) {
      const option = document.createElement('option');
      option.value = file.path;
      addList.append(option);
    }
  });
});
$<HTMLFormElement>('add-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const path = addPath.value.trim().replace(/^\/?models\/kaykit\//, '');
  if (!/\.(glb|gltf)$/i.test(path)) {
    status('Bitte eine Adresse wie „dungeon/barrel_large.glb" angeben.');
    return;
  }
  if (!state.custom.includes(path)) state.custom.push(path);
  state.current = `kaykit:${path}`;
  addPath.value = '';
  save();
  void showElement(current());
  update();
});

for (const box of [showCells, showGame, showModel, showPlayer])
  box.addEventListener('change', () => {
    try {
      localStorage.setItem(`${STORE}.${box.id}`, box.checked ? '1' : '0');
    } catch {
      // egal
    }
    update();
  });
for (const box of [showCells, showGame, showModel, showPlayer]) {
  try {
    const kept = localStorage.getItem(`${STORE}.${box.id}`);
    if (kept !== null) box.checked = kept === '1';
  } catch {
    // egal
  }
}
exportAll.addEventListener('change', () => update());

$<HTMLButtonElement>('copy').addEventListener('click', () => {
  const text = output.value;
  const done = (): void => status('In die Zwischenablage kopiert.');
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(done, () => {
      output.select();
      status('Kopieren ging nicht — der Text ist markiert.');
    });
  } else {
    output.select();
    status('Der Text ist markiert — Strg+C kopiert ihn.');
  }
});
$<HTMLButtonElement>('download').addEventListener('click', () => {
  const blob = new Blob([output.value], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `kaykit-editor-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
$<HTMLButtonElement>('clear-all').addEventListener('click', () => {
  if (!confirm('Alle Einstellungen und das ganze Protokoll löschen?')) return;
  const fresh = parseState(null);
  Object.assign(state, fresh);
  save();
  void showElement(current());
  update();
});

// Pfeiltasten schieben um eine Viertelkachel (mit Umschalt um 5 cm), +/− skaliert.
window.addEventListener('keydown', (event) => {
  const target = event.target as HTMLElement | null;
  if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
  const step = event.shiftKey ? 0.05 : 0.25;
  const keys: Record<string, [TuneField, number]> = {
    ArrowLeft: ['offsetX', -step],
    ArrowRight: ['offsetX', step],
    ArrowUp: ['offsetZ', -step],
    ArrowDown: ['offsetZ', step],
    '+': ['scale', 0.05],
    '-': ['scale', -0.05],
    r: ['yaw', 90],
  };
  const hit = keys[event.key];
  if (!hit) return;
  event.preventDefault();
  nudge(hit[0], hit[1]);
});

// Zoomen mit dem Mausrad, verschieben durch Ziehen.
view.addEventListener(
  'wheel',
  (event) => {
    event.preventDefault();
    span = Math.min(20, Math.max(2, span * Math.exp(event.deltaY * 0.001)));
    placeCamera();
  },
  { passive: false },
);
let drag: { x: number; y: number } | null = null;
view.addEventListener('pointerdown', (event) => {
  drag = { x: event.clientX, y: event.clientY };
  view.setPointerCapture(event.pointerId);
});
view.addEventListener('pointermove', (event) => {
  if (!drag) return;
  const perPixel = (camera.right - camera.left) / (view.clientWidth || 1);
  look.x -= (event.clientX - drag.x) * perPixel;
  look.z -= (event.clientY - drag.y) * perPixel;
  drag = { x: event.clientX, y: event.clientY };
  placeCamera();
});
view.addEventListener('pointerup', () => (drag = null));
view.addEventListener('pointercancel', () => (drag = null));

// ── Stand zeigen ───────────────────────────────────────────────────────────

function fmt(value: number, digits = 2): string {
  return value.toFixed(digits).replace('.', ',');
}
function spanText(s: { x: number; z: number; count: number }): string {
  return `${s.x} × ${s.z} Zellen (${s.count})`;
}

function update(): void {
  const element = current();
  const tune = tuneOf(state, element.id);

  for (const s of sliders) {
    const value = String(tune[s.field]);
    if (document.activeElement !== s.number) s.number.value = value;
    s.range.value = value;
  }
  $<HTMLSpanElement>('yaw-value').textContent = `${tune.yaw}°`;

  holder.position.set(ANCHOR.x + tune.offsetX, 0, ANCHOR.z + tune.offsetZ);
  holder.rotation.y = (-tune.yaw * Math.PI) / 180;
  scaler.scale.setScalar(tune.scale);

  const game = gameFootprint(element);
  const gameBox = game ? footprintBox(game, ANCHOR, tune.yaw) : null;
  setOutline(gameOutline, showGame.checked ? gameBox : null, 0.03);

  let modelBox: FloorBox | null = null;
  if (base) {
    const measured = {
      width: base.width * tune.scale,
      depth: base.depth * tune.scale,
      height: base.height * tune.scale,
    };
    state.measured[element.id] = measured;
    modelBox = tunedBox(measured, tune);
  }
  setOutline(modelOutline, showModel.checked ? modelBox : null, 0.035);

  cellGroup.clear();
  cellGroup.visible = showCells.checked;
  if (modelBox)
    for (const cell of occupiedCells(modelBox)) {
      const mesh = new THREE.Mesh(cellGeometry, cellMaterial);
      mesh.position.set((cell.ix + 0.5) * CELL, 0.02, (cell.iz + 0.5) * CELL);
      mesh.renderOrder = 2;
      cellGroup.add(mesh);
    }
  player.visible = showPlayer.checked;

  const lines: string[] = [`<b>${element.label}</b><br><code>${element.path}</code>`];
  if (base && modelBox) {
    const m = state.measured[element.id]!;
    lines.push(
      `Modell: ${fmt(m.width)} × ${fmt(m.depth)} m, ${fmt(m.height)} m hoch`,
      `<span class="red">Belegt: ${spanText(cellSpan(modelBox))}</span>`,
    );
  }
  if (game && gameBox)
    lines.push(
      `<span class="yellow">Stellfläche im Spiel: ${fmt(game.width)} × ${fmt(game.depth)} m → ${spanText(cellSpan(gameBox))}</span>`,
    );
  lines.push(
    `Verschoben: x ${fmt(tune.offsetX)} m, y ${fmt(tune.offsetZ)} m · Zelle = ${fmt(CELL)} m`,
  );
  info.innerHTML = lines.join('<br>');

  const changed = allElements(state).filter((e) => isChanged(tuneOf(state, e.id))).length;
  $<HTMLSpanElement>('summary').textContent =
    `${changed} Element${changed === 1 ? '' : 'e'} verändert · ${state.log.length} Einträge im Protokoll`;
  output.value = exportState(state, exportAll.checked);
  fillSelect();
}

// ── Los ────────────────────────────────────────────────────────────────────

window.addEventListener('resize', placeCamera);
placeCamera();
fillSelect();
void showElement(current());

renderer.setAnimationLoop(() => {
  body.update(1 / 60, head, null, null);
  renderer.render(scene, camera);
});
