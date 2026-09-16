/**
 * **Das Bild des Controllers, auf dem leuchtet, was gedrückt ist.**
 *
 * Eine Liste aus achtzehn Zeilen beantwortet die Frage „kommt mein Knopf an?"
 * vollständig und trotzdem nicht: Wer `buttons[13]` drückt, sieht eine Zeile
 * aufleuchten und muss selbst nachzählen, ob das nun unten am Steuerkreuz war.
 * Das Bild dreht die Richtung um — man drückt und sieht **an der Stelle**, wo
 * man gedrückt hat, ob es angekommen ist. Damit ist ein falsch belegtes Pad in
 * einer Sekunde erkannt statt in einer Tabelle.
 *
 * **Warum gezeichnet und nicht fotografiert.** Ein Foto wäre ein Pad, und
 * angeschlossen ist irgendeines: DualSense, Xbox, ein Adapter von 2009. Der
 * Umriss hier ist keines davon und passt deshalb auf alle — er trägt nur das,
 * was das Standard-Mapping ohnehin verspricht (zwei Sticks, ein Steuerkreuz,
 * vier Gesichtsknöpfe, vier Schultern, drei in der Mitte). Was mit der Marke
 * wechselt, sind die **Zeichen** darauf: `✕ ○ □ △` oder `A B X Y`
 * (`core/gamepadReport.ts`) — dasselbe Bild, die Aufschrift des Geräts in der
 * Hand.
 *
 * Die Stellen heißen im Bild so wie in der Tabelle (`data-slot`), und keine
 * Koordinate steht zweimal: Wer eine Taste verschiebt, verschiebt sie hier,
 * und die Nummern bleiben, wo das API sie hat.
 */

import { PAD_BUTTONS, type PadKind, type PadSlot } from '../core/gamepadReport';

/** Wie weit ein Stickknopf aus der Mitte wandert, in Bildeinheiten. */
const STICK_TRAVEL = 7;

/** Das Zeichen, das im Bild auf einer Stelle steht. */
function glyph(slot: PadSlot, kind: PadKind): string {
  return PAD_BUTTONS.find((spec) => spec.slot === slot)?.icons[kind] ?? '';
}

/**
 * **Der Controller als SVG**, für die Marke, die gerade in der Hand liegt.
 *
 * Kommt als Zeichenkette zurück und nicht als Baum aus `createElementNS`:
 * Es ist eine Zeichnung, sie besteht aus Koordinaten, und vierzig Aufrufe
 * `setAttribute('cx', …)` machen daraus etwas, das niemand mehr liest. In die
 * Vorlage wandert dabei **nichts von außen** — jede eingesetzte Stelle kommt
 * aus der Tabelle in `core/gamepadReport.ts`, keine aus `gamepad.id`. Darum
 * darf der Aufrufer sie als `innerHTML` setzen.
 */
export function padDiagram(kind: PadKind): string {
  return `<svg class="pad" viewBox="0 0 320 200" role="img"
     aria-label="Controller — was gedrückt ist, leuchtet">
  <!-- Schultern und Trigger liegen hinter dem Gehäuse, wie in Wirklichkeit. -->
  <rect class="pad__key" data-slot="trigger-left" x="46" y="4" width="58" height="17" rx="8" />
  <rect class="pad__key" data-slot="trigger-right" x="216" y="4" width="58" height="17" rx="8" />
  <rect class="pad__key" data-slot="shoulder-left" x="44" y="25" width="62" height="17" rx="8" />
  <rect class="pad__key" data-slot="shoulder-right" x="214" y="25" width="62" height="17" rx="8" />
  <text class="pad__tag" x="75" y="17">${glyph('trigger-left', kind)}</text>
  <text class="pad__tag" x="245" y="17">${glyph('trigger-right', kind)}</text>
  <text class="pad__tag" x="75" y="38">${glyph('shoulder-left', kind)}</text>
  <text class="pad__tag" x="245" y="38">${glyph('shoulder-right', kind)}</text>

  <!-- Das Gehäuse: zwei Griffe und eine Schulterkante, sonst nichts. -->
  <path class="pad__body" d="M56 44 H264 Q294 44 298 76 L304 124 Q310 178 270 186
    Q244 190 228 168 L212 150 H108 L92 168 Q76 190 50 186 Q10 178 16 124 L22 76 Q26 44 56 44 Z" />

  <!-- Steuerkreuz: vier Arme um eine Nabe, die selbst kein Knopf ist. -->
  <rect class="pad__key" data-slot="dpad-up" x="68" y="58" width="16" height="22" rx="4" />
  <rect class="pad__key" data-slot="dpad-down" x="68" y="92" width="16" height="22" rx="4" />
  <rect class="pad__key" data-slot="dpad-left" x="48" y="78" width="22" height="16" rx="4" />
  <rect class="pad__key" data-slot="dpad-right" x="82" y="78" width="22" height="16" rx="4" />
  <circle class="pad__hub" cx="76" cy="86" r="7" />

  <!-- Die vier Gesichtsknöpfe, nach Lage und nicht nach Namen. -->
  <circle class="pad__key" data-slot="face-up" cx="244" cy="63" r="12" />
  <circle class="pad__key" data-slot="face-down" cx="244" cy="109" r="12" />
  <circle class="pad__key" data-slot="face-left" cx="221" cy="86" r="12" />
  <circle class="pad__key" data-slot="face-right" cx="267" cy="86" r="12" />
  <text class="pad__tag" x="244" y="67">${glyph('face-up', kind)}</text>
  <text class="pad__tag" x="244" y="113">${glyph('face-down', kind)}</text>
  <text class="pad__tag" x="221" y="90">${glyph('face-left', kind)}</text>
  <text class="pad__tag" x="267" y="90">${glyph('face-right', kind)}</text>

  <!-- Die Mitte: Fläche, die zwei kleinen Tasten daneben, die Markentaste. -->
  <rect class="pad__key pad__key--pad" data-slot="touchpad" x="132" y="56" width="56" height="34" rx="7" />
  <rect class="pad__key" data-slot="select" x="110" y="60" width="16" height="11" rx="5" />
  <rect class="pad__key" data-slot="start" x="194" y="60" width="16" height="11" rx="5" />
  <circle class="pad__key" data-slot="home" cx="160" cy="110" r="8" />
  <text class="pad__tag pad__tag--small" x="118" y="69">${glyph('select', kind)}</text>
  <text class="pad__tag pad__tag--small" x="202" y="69">${glyph('start', kind)}</text>
  <text class="pad__tag pad__tag--small" x="160" y="113">${glyph('home', kind)}</text>

  <!--
    Die Sticks: eine Pfanne, die steht, und ein Knopf, der wandert. Die Stelle
    trägt der Knopf, denn gedrückt wird er und nicht die Pfanne — und
    geschoben wird die Gruppe darum, damit das Leuchten nicht mitrutscht.
  -->
  <circle class="pad__well" cx="120" cy="120" r="17" />
  <g class="pad__knob" data-stick="left" transform="translate(0 0)">
    <circle class="pad__key pad__key--stick" data-slot="stick-left" cx="120" cy="120" r="10" />
  </g>
  <circle class="pad__well" cx="200" cy="120" r="17" />
  <g class="pad__knob" data-stick="right" transform="translate(0 0)">
    <circle class="pad__key pad__key--stick" data-slot="stick-right" cx="200" cy="120" r="10" />
  </g>
</svg>`;
}

/**
 * **Leuchten lassen, was anliegt.**
 *
 * Es wird über _alle_ Stellen gelaufen und nicht nur über die gedrückten:
 * Sonst bliebe ein Knopf leuchten, den man losgelassen hat, und das ist genau
 * der Fehler, den diese Seite aufdecken soll — nur eben bei ihr selbst.
 */
export function showPressedSlots(svg: Element, slots: Iterable<PadSlot | null>): void {
  const down = new Set<PadSlot | null>(slots);
  for (const key of svg.querySelectorAll<SVGElement>('[data-slot]')) {
    const slot = key.getAttribute('data-slot') as PadSlot | null;
    key.classList.toggle('is-down', down.has(slot));
  }
}

/**
 * **Die Sticks dorthin schieben, wo sie stehen.** `+y` ist unten, so wie das
 * API zählt und wie das Bild gezeichnet ist — hier muss nichts gespiegelt
 * werden, und genau darum steht es hier und nicht im Aufrufer.
 */
export function showSticks(
  svg: Element,
  left: { x: number; y: number },
  right: { x: number; y: number },
): void {
  const place = (side: 'left' | 'right', stick: { x: number; y: number }): void => {
    const knob = svg.querySelector<SVGElement>(`[data-stick="${side}"]`);
    if (!knob) return;
    const x = (clamp(stick.x) * STICK_TRAVEL).toFixed(2);
    const y = (clamp(stick.y) * STICK_TRAVEL).toFixed(2);
    knob.setAttribute('transform', `translate(${x} ${y})`);
  };
  place('left', left);
  place('right', right);
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-1, Math.min(1, value));
}
