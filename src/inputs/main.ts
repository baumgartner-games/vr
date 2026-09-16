import './inputs.css';
import { padDiagram, showPressedSlots, showSticks } from './padDiagram';
import {
  PAD_KIND_LABELS,
  connectedPads,
  describePad,
  padEdges,
  padKind,
  padSnapshot,
  pressedMask,
  type PadEdge,
  type PadLike,
  type PadSnapshot,
} from '../core/gamepadReport';
import { readGamepad } from '../core/gamepad';
import {
  fullscreenActive,
  fullscreenSupported,
  onFullscreenChange,
  toggleFullscreen,
} from '../core/fullscreen';

/**
 * **Die Eingabeseite** (`/inputs.html`) — was der Browser dieses Geräts vom
 * Eingabegerät sieht, Bild für Bild.
 *
 * Sie ist für die Geräte gebaut, an denen man genau das nicht nachsehen kann:
 * den Browser einer PS5, einen Fernseher, ein Telefon. Dort gibt es keine
 * Entwicklerwerkzeuge und keine Konsole, in die man `navigator.getGamepads()`
 * tippen könnte — und damit gibt es, wenn ein Knopf im Spiel nichts tut, keine
 * Möglichkeit herauszufinden, ob er im Browser fehlt oder nur nicht belegt ist.
 * Diese Seite trennt die beiden: Oben steht, **was ankommt**, unten steht, **was
 * die Spielwiese daraus macht** (`core/gamepad.readGamepad` — dieselbe
 * Funktion, die im Spiel läuft, nicht eine zweite).
 *
 * **Wo die Arbeit steckt, steckt sie nicht hier.** Welche Nummer welche Taste
 * ist und wie sie auf welchem Gerät heißt, steht in `core/gamepadReport.ts`,
 * nachgerechnet von einem Test; das Bild steht in `padDiagram.ts`, ebenso.
 * Hier bleibt das, was ohne Browser ohnehin nichts wäre: die Schleife, die
 * Knöpfe, und die Regel, nur zu schreiben, was sich geändert hat.
 *
 * Denn die läuft mit 60 Bildern in der Sekunde. Achtzehn Knöpfe, vier Achsen
 * und sieben Zeilen darunter jedes Bild neu zu setzen heißt, dem Browser
 * siebzigmal pro Bild Arbeit zu machen, die niemand sieht — auf einem
 * Konsolenbrowser ist das der Unterschied zwischen einer flüssigen Seite und
 * einer, die beim Knopfdruck hakt. Also merkt sich jede Zelle ihren letzten
 * Text und schweigt, solange er stimmt.
 */

const statusLine = el<HTMLElement>('#pad-status');
const padHint = el<HTMLElement>('#pad-hint');
const padSeg = el<HTMLElement>('#pads');
const diagramHost = el<HTMLElement>('#diagram');
const diagramNote = el<HTMLElement>('#diagram-note');
const codeIcon = el<HTMLElement>('#code-icon');
const codeApi = el<HTMLElement>('#code-api');
const codeLabel = el<HTMLElement>('#code-label');
const codeValue = el<HTMLElement>('#code-value');
const codeIndex = el<HTMLElement>('#code-index');
const logList = el<HTMLUListElement>('#log');
const buttonList = el<HTMLUListElement>('#buttons');
const axisList = el<HTMLUListElement>('#axes');
const envList = el<HTMLElement>('#env');
const fullButton = el<HTMLButtonElement>('#full');
const navButton = el<HTMLButtonElement>('#nav');
const drawer = el<HTMLElement>('#drawer');
const copyButton = el<HTMLButtonElement>('#copy');
const copyNote = el<HTMLElement>('#copy-note');
const rumbleButton = el<HTMLButtonElement>('#rumble');

function el<T extends Element>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`[inputs] ${selector} fehlt in inputs.html`);
  return found;
}

/** Wie viele Drücke im Protokoll stehen, bevor die ältesten gehen. */
const LOG_LENGTH = 12;

// --- Das Menü in der Ecke ----------------------------------------------------

navButton.addEventListener('click', () => {
  drawer.hidden = !drawer.hidden;
  navButton.setAttribute('aria-expanded', drawer.hidden ? 'false' : 'true');
});

// --- Vollbild ----------------------------------------------------------------

/**
 * **Der Vollbildknopf** — und der Grund, warum er sich nicht einfach selbst
 * umbeschriftet: `Esc` beendet das Vollbild, die Systemtaste eines Fernsehers
 * auch, und beide fragen niemanden. Also hört der Knopf auf das Ereignis und
 * liest den Stand, statt ihn sich zu merken (`core/fullscreen.ts`).
 */
const canFullscreen = fullscreenSupported(document, document.documentElement);
fullButton.hidden = !canFullscreen;
if (canFullscreen) {
  const showFullscreen = (): void => {
    const on = fullscreenActive(document);
    fullButton.setAttribute('aria-pressed', on ? 'true' : 'false');
    fullButton.setAttribute('aria-label', on ? 'Vollbild beenden' : 'Vollbild');
  };
  fullButton.addEventListener('click', () => {
    void toggleFullscreen(document, document.documentElement).then(showFullscreen);
  });
  onFullscreenChange(document, showFullscreen);
  showFullscreen();
}

// --- Das Pad, auf das die Seite gerade sieht ---------------------------------

/**
 * Welchen Platz aus `navigator.getGamepads()` die Seite zeigt. Zwei Pads am
 * selben Gerät sind genau die Lage, in der man sich fragt, welches von beiden
 * das Spiel hört — nämlich das erste; deshalb ist das hier eine Wahl und keine
 * Annahme.
 */
let watched: number | null = null;

/**
 * **Woran die gebauten Teile hängen: Marke und Anzahl der Knöpfe.**
 *
 * Nicht nur die Anzahl: Zwei Pads mit achtzehn Knöpfen können verschiedene
 * Marken sein, und dann stünde auf dem Bild `✕` und in der Liste `A` — die
 * Aufschrift des Pads, das nicht mehr angeschlossen ist.
 */
let builtDiagram = '';
let builtKeys = '';
/** Der Stand vom Bild davor — für die Flanken im Protokoll. */
let before: boolean[] = [];

padSeg.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
  const slot = Number(button?.dataset['slot']);
  if (!Number.isInteger(slot)) return;
  watched = slot;
});

/** Alle Pads, die der Browser gerade meldet. */
function pads(): { slot: number; pad: PadLike }[] {
  // `navigator.getGamepads` gibt es in alten WebKit-Fassungen nur mit Präfix.
  const nav = navigator as Navigator & { webkitGetGamepads?: () => (Gamepad | null)[] };
  const list =
    typeof nav.getGamepads === 'function'
      ? nav.getGamepads()
      : typeof nav.webkitGetGamepads === 'function'
        ? nav.webkitGetGamepads()
        : null;
  return connectedPads(list);
}

/** Das Pad, das gezeigt wird: das gewählte, sonst das erste, das da ist. */
function watchedPad(found: { slot: number; pad: PadLike }[]): PadLike | null {
  const picked = found.find((entry) => entry.slot === watched);
  return picked?.pad ?? found[0]?.pad ?? null;
}

// --- Ein Bild ----------------------------------------------------------------

function frame(): void {
  const found = pads();
  const pad = watchedPad(found);
  showPadChoice(found);

  const snapshot = padSnapshot(pad);
  showStatus(pad, found.length);
  showDiagram(snapshot, pad);
  showButtons(snapshot);
  showAxes(snapshot);
  showCode(snapshot);
  showGameReading(pad);
  showRumble(pad);

  const edges = padEdges(before, snapshot);
  if (edges.length) logEdges(edges);
  before = pressedMask(snapshot);

  requestAnimationFrame(frame);
}

/**
 * **Die Statuszeile** — und die eine Erklärung, die hier niemand errät.
 *
 * Ein Browser meldet ein angestecktes Pad erst, wenn daran einmal ein Knopf
 * gedrückt wurde: Die Liste der angeschlossenen Geräte wäre sonst ein
 * Fingerabdruck für jede Werbeseite. „Kein Pad gefunden" heißt hier also fast
 * immer „drück mal was" und fast nie „das Kabel ist kaputt", und das muss
 * dastehen, bevor jemand sein Kabel prüft.
 */
function showStatus(pad: PadLike | null, count: number): void {
  const text = pad
    ? `${describePad(pad)}${count > 1 ? ` · ${count} Pads angeschlossen` : ''}`
    : 'Kein Pad gefunden.';
  write(statusLine, text);
  statusLine.classList.toggle('is-online', Boolean(pad));
  padHint.hidden = Boolean(pad);
}

/** Die Wahl zwischen mehreren Pads — sie steht nur da, wenn es eine gibt. */
function showPadChoice(found: { slot: number; pad: PadLike }[]): void {
  padSeg.hidden = found.length < 2;
  if (found.length < 2) return;
  const wanted = found.map((entry) => `${entry.slot}`).join(',');
  if (padSeg.dataset['built'] !== wanted) {
    padSeg.dataset['built'] = wanted;
    padSeg.replaceChildren(
      ...found.map((entry) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset['slot'] = `${entry.slot}`;
        // Fremder Text: die Kennung kommt vom Treiber, also `textContent`.
        button.textContent = `Platz ${entry.slot} · ${PAD_KIND_LABELS[padKind(entry.pad.id)]}`;
        return button;
      }),
    );
  }
  const active = watchedPad(found);
  for (const button of padSeg.querySelectorAll<HTMLButtonElement>('button')) {
    const slot = Number(button.dataset['slot']);
    button.classList.toggle('is-active', found.find((e) => e.slot === slot)?.pad === active);
  }
}

/**
 * Das Bild — neu gebaut nur, wenn die Marke wechselt oder das Pad geht. Ein
 * `innerHTML` je Bild wäre sechzig Zeichnungen pro Sekunde für ein Bild, das
 * sich nicht ändert.
 */
function showDiagram(snapshot: PadSnapshot, pad: PadLike | null): void {
  const wanted = pad ? `${snapshot.kind}:${snapshot.buttons.length}` : 'leer';
  if (builtDiagram !== wanted) {
    builtDiagram = wanted;
    // Nichts von außen in der Vorlage: Jede eingesetzte Stelle kommt aus der
    // Tabelle in `core/gamepadReport.ts`, keine aus `pad.id` (siehe dort).
    diagramHost.innerHTML = padDiagram(snapshot.kind);
    diagramNote.textContent = pad
      ? `Standard-Layout mit der Aufschrift: ${PAD_KIND_LABELS[snapshot.kind]}.`
      : 'Noch kein Pad — die Zeichnung zeigt das Standard-Layout.';
  }
  const svg = diagramHost.firstElementChild;
  if (!svg) return;
  showPressedSlots(
    svg,
    snapshot.pressed.map((button) => button.slot),
  );
  showSticks(
    svg,
    { x: snapshot.axes[0]?.value ?? 0, y: snapshot.axes[1]?.value ?? 0 },
    { x: snapshot.axes[2]?.value ?? 0, y: snapshot.axes[3]?.value ?? 0 },
  );
}

/** Die Zellen der Knopfliste, nach Nummer — gebaut, sobald es sie gibt. */
const keyCells = new Map<number, { row: HTMLElement; value: HTMLElement }>();

/**
 * **Alle Knöpfe, auch die, die nichts tun.** Vollständigkeit ist hier die
 * Ware: Wer wissen will, ob sein Knopf ankommt, will die Liste sehen, in der
 * er *nicht* aufleuchtet, und nicht eine Liste der belegten.
 */
function showButtons(snapshot: PadSnapshot): void {
  const wanted = `${snapshot.kind}:${snapshot.buttons.length}`;
  if (builtKeys !== wanted) {
    builtKeys = wanted;
    keyCells.clear();
    buttonList.replaceChildren(
      ...snapshot.buttons.map((button) => {
        const row = document.createElement('li');
        row.className = 'key';
        const icon = document.createElement('span');
        icon.className = 'key__icon';
        icon.textContent = button.icon;
        const name = document.createElement('span');
        name.className = 'key__name';
        name.textContent = button.label;
        const code = document.createElement('code');
        code.className = 'key__code';
        code.textContent = button.code;
        const value = document.createElement('span');
        value.className = 'key__value';
        row.append(icon, name, code, value);
        keyCells.set(button.index, { row, value });
        return row;
      }),
    );
  }
  for (const button of snapshot.buttons) {
    const cell = keyCells.get(button.index);
    if (!cell) continue;
    cell.row.classList.toggle('is-down', button.pressed);
    cell.row.classList.toggle('is-touched', button.touched && !button.pressed);
    // Nur analoge Knöpfe bekommen eine Zahl: An einem Schalter wäre „100 %"
    // eine Zahl, die nichts sagt, und sie stünde achtzehnmal da.
    write(cell.value, button.analog ? `${Math.round(button.value * 100)} %` : '');
  }
}

/** Die Achsen: Balken und Zahl, beides ungerechnet. */
const axisCells = new Map<number, { fill: HTMLElement; value: HTMLElement }>();

function showAxes(snapshot: PadSnapshot): void {
  if (axisCells.size !== snapshot.axes.length) {
    axisCells.clear();
    axisList.replaceChildren(
      ...snapshot.axes.map((axis) => {
        const row = document.createElement('li');
        row.className = 'axis';
        const name = document.createElement('span');
        name.className = 'axis__name';
        name.textContent = axis.label;
        const code = document.createElement('code');
        code.className = 'axis__code';
        code.textContent = axis.code;
        const bar = document.createElement('span');
        bar.className = 'axis__bar';
        const fill = document.createElement('span');
        fill.className = 'axis__fill';
        bar.append(fill);
        const value = document.createElement('span');
        value.className = 'axis__value';
        row.append(name, code, bar, value);
        axisCells.set(axis.index, { fill, value });
        return row;
      }),
    );
  }
  for (const axis of snapshot.axes) {
    const cell = axisCells.get(axis.index);
    if (!cell) continue;
    // Der Balken wächst aus der Mitte nach links oder rechts — eine Achse hat
    // ein Vorzeichen, und ein Balken, der bei null anfängt, verschweigt es.
    const clamped = Math.max(-1, Math.min(1, axis.value));
    const width = Math.abs(clamped) * 50;
    cell.fill.style.left = clamped < 0 ? `${50 - width}%` : '50%';
    cell.fill.style.width = `${width}%`;
    write(cell.value, axis.value.toFixed(3));
  }
}

/**
 * **Das Panel mit dem Code.** Es zeigt den Knopf mit der höchsten Nummer, der
 * gerade anliegt — nicht den zuletzt gedrückten: Wer `R2` hält und dabei `✕`
 * antippt, soll sehen, dass beide anliegen, und nicht ein Panel, das zwischen
 * ihnen flackert. Wie viele es sind, steht daneben.
 */
function showCode(snapshot: PadSnapshot): void {
  const button = snapshot.pressed[snapshot.pressed.length - 1];
  if (!button) {
    write(codeIndex, '—');
    write(codeApi, 'buttons[?]');
    write(codeLabel, 'Noch nichts gedrückt');
    write(codeValue, '');
    write(codeIcon, '–');
    return;
  }
  write(codeIndex, `${button.index}`);
  write(codeApi, `gamepad.${button.code}`);
  write(codeLabel, button.label);
  write(codeIcon, button.icon);
  const more = snapshot.pressed.length - 1;
  const value = button.analog ? `Zug ${Math.round(button.value * 100)} %` : 'gedrückt';
  write(codeValue, more > 0 ? `${value} · und ${more} weitere` : value);
}

/** Jede Flanke eine Zeile — oben die neueste, hinten fallen sie heraus. */
function logEdges(edges: readonly PadEdge[]): void {
  const stamp = new Date().toLocaleTimeString('de-DE');
  for (const edge of edges) {
    const row = document.createElement('li');
    row.className = edge.down ? 'log__row is-down' : 'log__row';
    const icon = document.createElement('span');
    icon.className = 'log__icon';
    icon.textContent = edge.icon;
    const text = document.createElement('span');
    text.className = 'log__text';
    text.textContent = `${edge.down ? 'gedrückt' : 'los'} · ${edge.label}`;
    const code = document.createElement('code');
    code.className = 'log__code';
    code.textContent = edge.code;
    const time = document.createElement('span');
    time.className = 'log__time';
    time.textContent = stamp;
    row.append(icon, text, code, time);
    logList.prepend(row);
  }
  while (logList.childElementCount > LOG_LENGTH) logList.lastElementChild?.remove();
}

/**
 * **Und was das Spiel daraus macht** — mit derselben Funktion, die im Spiel
 * läuft (`core/gamepad.readGamepad`). Eine zweite Deutung hier wäre eine, die
 * beim nächsten Umbau der Belegung stehen bleibt und dann das Falsche zeigt.
 */
function showGameReading(pad: PadLike | null): void {
  const reading = readGamepad(pad);
  const stick = (s: { x: number; y: number }): string =>
    s.x === 0 && s.y === 0 ? 'ruht' : `${s.x.toFixed(2)} / ${s.y.toFixed(2)}`;
  const flag = (on: boolean): string => (on ? 'ja' : '—');
  const values: Record<string, string> = {
    move: stick(reading.move),
    aim: stick(reading.aim),
    use: flag(reading.use),
    fire: reading.trigger > 0 ? `${Math.round(reading.trigger * 100)} %` : flag(reading.fire),
    sprint: flag(reading.sprint),
    zoom: reading.zoomIn ? 'heran' : reading.zoomOut ? 'zurück' : '—',
    tools: flag(reading.tools),
  };
  for (const cell of document.querySelectorAll<HTMLElement>('[data-game]')) {
    const key = cell.dataset['game'] ?? '';
    write(cell, values[key] ?? '—');
    cell.classList.toggle('is-on', Boolean(values[key]) && values[key] !== '—');
  }
}

/**
 * Schreiben, aber nur bei einer Änderung. Sechzig gleiche Zuweisungen pro
 * Sekunde und Zelle kostet auf einem Konsolenbrowser genau das, was diese
 * Seite messen soll.
 */
function write(cell: HTMLElement, text: string): void {
  if (cell.textContent !== text) cell.textContent = text;
}

// --- Tastatur und Zeiger -----------------------------------------------------

/**
 * Dieselbe Frage für die Tastatur: `event.code` ist dasselbe Rätsel wie
 * `buttons[3]`, und eine Fernbedienung am Fernseher schickt Tasten, die auf
 * keiner Tastatur stehen.
 */
const keyCode = el<HTMLElement>('#key-code');
const keyKey = el<HTMLElement>('#key-key');
const keyWhich = el<HTMLElement>('#key-which');
const pointerCell = el<HTMLElement>('#pointer');

window.addEventListener('keydown', (event) => {
  write(keyCode, event.code || '(leer)');
  write(keyKey, event.key === ' ' ? '(Leertaste)' : event.key);
  write(keyWhich, `${event.keyCode}`);
  // Auf einem Konsolenbrowser blättert das Steuerkreuz sonst die Seite,
  // während man prüfen will, was es meldet. Die Pfeile gehören hier der Seite.
  if (event.code.startsWith('Arrow') || event.code === 'Space') event.preventDefault();
});

function onPointer(event: PointerEvent): void {
  const what = event.type === 'pointermove' ? 'bewegt' : event.type.slice('pointer'.length);
  write(
    pointerCell,
    `${event.pointerType} · ${what} · Knopf ${event.button} · ${Math.round(event.clientX)}/${Math.round(event.clientY)}`,
  );
}
window.addEventListener('pointerdown', onPointer);
window.addEventListener('pointerup', onPointer);
window.addEventListener('pointermove', onPointer);

// --- Gerät, Browser, Bericht -------------------------------------------------

/**
 * Was in einen Fehlerbericht gehört. Die Browserkennung steht ungekürzt da:
 * Sie ist auf einer Konsole die einzige Auskunft darüber, *welcher* Browser
 * das eigentlich ist, und gekürzt wäre sie keine.
 */
function showEnvironment(): void {
  const gamepads = typeof navigator.getGamepads === 'function';
  const rows: [string, string][] = [
    ['Gamepad-API', gamepads ? 'vorhanden' : 'fehlt in diesem Browser'],
    ['Vollbild', canFullscreen ? 'möglich' : 'nicht erlaubt'],
    ['WebXR', navigator.xr ? 'vorhanden' : 'nicht vorhanden'],
    ['Sicherer Kontext', window.isSecureContext ? 'ja (HTTPS)' : 'nein — WebXR bleibt aus'],
    ['Zeiger', window.matchMedia('(pointer: coarse)').matches ? 'grob (Touch/TV)' : 'fein'],
    ['Fenster', `${window.innerWidth} × ${window.innerHeight} @ ${window.devicePixelRatio}×`],
    ['Browser', navigator.userAgent],
  ];
  envList.replaceChildren(
    ...rows.map(([name, value]) => {
      const row = document.createElement('div');
      row.className = 'game__row';
      const key = document.createElement('dt');
      key.textContent = name;
      const cell = document.createElement('dd');
      cell.textContent = value;
      row.append(key, cell);
      return row;
    }),
  );
}
showEnvironment();
window.addEventListener('resize', showEnvironment);

/**
 * **Der Bericht.** Von einer Konsole aus ist Abtippen die Alternative, deshalb
 * gibt es diesen Knopf. Wo die Zwischenablage gesperrt ist — und auf einer
 * Konsole ist sie es oft —, wird der Text stattdessen ausgeklappt, damit man
 * ihn markieren kann; still scheitern darf er nicht.
 */
copyButton.addEventListener('click', () => {
  const pad = watchedPad(pads());
  const snapshot = padSnapshot(pad);
  const lines = [
    '# Eingaben — Bericht',
    `Zeit: ${new Date().toISOString()}`,
    `Pad: ${describePad(pad)}`,
    `Gedrückt: ${snapshot.pressed.map((b) => `${b.code} (${b.label})`).join(', ') || 'nichts'}`,
    `Achsen: ${snapshot.axes.map((a) => `${a.code}=${a.value.toFixed(3)}`).join(' ') || 'keine'}`,
    `Browser: ${navigator.userAgent}`,
    `Fenster: ${window.innerWidth}×${window.innerHeight} @ ${window.devicePixelRatio}`,
    `Sicherer Kontext: ${window.isSecureContext}`,
  ];
  const text = lines.join('\n');
  const clipboard = navigator.clipboard;
  if (!clipboard?.writeText) {
    showReport(text);
    return;
  }
  void clipboard
    .writeText(text)
    .then(() => {
      copyNote.textContent = 'Bericht liegt in der Zwischenablage.';
    })
    .catch(() => showReport(text));
});

/** Der Ausweg ohne Zwischenablage: hinschreiben, damit man markieren kann. */
function showReport(text: string): void {
  copyNote.textContent = '';
  const box = document.createElement('pre');
  box.className = 'report';
  box.textContent = text;
  copyNote.replaceChildren(box);
}

/**
 * **Rütteln** — der eine Weg, der von der Seite zum Gerät führt und nicht
 * umgekehrt. Er gehört dazu: Ein Pad, dessen Knöpfe ankommen, das aber nicht
 * rüttelt, ist ein halb angeschlossenes Pad, und das sieht man sonst nirgends.
 * Den Knopf gibt es nur, wo es den Motor gibt.
 */
interface RumblePad {
  vibrationActuator?: {
    playEffect?: (type: string, options: Record<string, number>) => Promise<unknown>;
  };
}

function showRumble(pad: PadLike | null): void {
  const motor = (pad as (PadLike & RumblePad) | null)?.vibrationActuator;
  rumbleButton.hidden = typeof motor?.playEffect !== 'function';
}

rumbleButton.addEventListener('click', () => {
  const pad = watchedPad(pads()) as (PadLike & RumblePad) | null;
  void pad?.vibrationActuator?.playEffect?.('dual-rumble', {
    duration: 300,
    strongMagnitude: 1,
    weakMagnitude: 1,
  });
});

// --- Und los -----------------------------------------------------------------

/**
 * `gamepadconnected` ist hier keine Bedingung, sondern nur eine Nachricht: Die
 * Schleife läuft von der ersten Sekunde an und fragt jedes Bild neu. Ein Pad,
 * das schon vor dem Laden der Seite gedrückt wurde, meldet das Ereignis nie —
 * wer darauf wartet, sieht bei genau diesem Pad nichts.
 */
requestAnimationFrame(frame);
