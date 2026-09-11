import {
  CARGO_BAND_COLORS,
  CARGO_SIZE,
  CONSOLE_SIZE,
  LOCKER_SIZE,
  MARK_COLORS,
  markHeight,
} from '../fixtureDimensions';
import type { MarkId } from '../house';
import type { MapEntityKind, MapFixture, MapItem } from './mapSnapshot';

/**
 * **Die gezeichneten Figuren und Requisiten der 2D-Welt** — Vektorbilder in
 * Canvas 2D, im flachen Comic-Stil mit dunkler Kontur.
 *
 * Nichts hier weiß von Kamera, Snapshot oder Sichtbarkeit: Jede Funktion
 * bekommt einen Kontext, einen Fußpunkt in Bildpunkten und den Maßstab
 * (Bildpunkte je Meter) und zeichnet dorthin. Die Szene (`flatScene.ts`)
 * sortiert und ruft; diese Datei malt. So sind die Sprites ohne Browser
 * prüfbar: Ein gefälschter Kontext zählt die Aufrufe, und der Test sieht,
 * ob gespiegelt wurde und welches Bein oben ist.
 *
 * **Maße in Metern der Station.** Eine Figur ist `SPRITE_H` hoch und steht
 * mit den Füßen auf ihrem Punkt; alles Aufrechte wächst auf dem Bild nach
 * oben (nach Norden), so wie in der Vorlage die Wände ihre Vorderseite nach
 * Süden zeigen. Die Zahlen sind gewählt, damit die Figur bei etwa 80
 * Bildpunkten je Meter rund 100 Bildpunkte groß ist.
 */

/** Wie hoch eine Figur auf dem Bild ist, in Metern der Station. */
export const SPRITE_H = 1.2;
/** Und wie breit — für Trefferflächen beim Tippen. */
export const SPRITE_W = 0.8;

/** Die Farben der Crew, wie man sie kennt; die erste ist die des Spielers. */
export const CREW_COLORS: ReadonlyArray<readonly [name: string, fill: string, shade: string]> = [
  ['green', '#3fbd45', '#1f7a2b'],
  ['red', '#c8232c', '#7a1018'],
  ['blue', '#2a4bd8', '#172a86'],
  ['yellow', '#f0d541', '#a88f14'],
  ['orange', '#ef7f1c', '#9c4d0c'],
  ['pink', '#e85fbf', '#963577'],
  ['cyan', '#4fe0d8', '#248f8a'],
  ['purple', '#7a3fc8', '#46217a'],
  ['white', '#dfe6ee', '#8a96a4'],
  ['lime', '#8ff05a', '#4f9a2a'],
];

/** Kontur- und Grundfarben, die alle Zeichnungen teilen. */
export const ART = {
  ink: '#0e1116',
  visor: '#9fd2ea',
  visorShade: '#4f8fb3',
  glint: '#e6f6ff',
  shadow: 'rgba(0, 0, 0, 0.35)',
  metal: '#5c6773',
  metalDark: '#343c46',
  metalLight: '#8b97a4',
  screenOff: '#1d2630',
  screenOn: '#59e2ff',
  screenBad: '#ff6b5c',
  screenGood: '#6cf58a',
  amber: '#ffb347',
  ember: '#ff7a1f',
  lampOn: '#ffe9b0',
  lampOff: '#3a3f48',
  monster: '#160b12',
  monsterEdge: '#3a1a28',
  eye: '#ff3b3b',
  /** Dasselbe Gelb wie das Randdreieck und der Kompass (`map/mapView.INK.goal`). */
  goal: '#ffd84a',
  bandInk: '#141a20',
};

/** Eine Farbstufe eines Verlaufs: Position in [0, 1] und Farbe. */
export type Stop = readonly [offset: number, color: string];

/**
 * Ein linearer Verlauf — oder die erste Farbe, wenn der Kontext keinen
 * liefert. Die gefälschten Kontexte der jsdom-Tests geben für jede Methode
 * `undefined` zurück; der Zeichner soll daran nicht scheitern, sondern flach malen.
 */
export function linearGradient(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  stops: readonly Stop[],
): string | CanvasGradient {
  const gradient = ctx.createLinearGradient(x0, y0, x1, y1) as CanvasGradient | undefined;
  if (!gradient || typeof gradient.addColorStop !== 'function') return stops[0]?.[1] ?? '#000';
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  return gradient;
}

/** Dasselbe für einen radialen Verlauf um `(x, y)` bis Radius `r`. */
export function radialGradient(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  stops: readonly Stop[],
): string | CanvasGradient {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, r) as CanvasGradient | undefined;
  if (!gradient || typeof gradient.addColorStop !== 'function') return stops[0]?.[1] ?? '#000';
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  return gradient;
}

/** Die Farbe eines Wesens — der Spieler grün, alle anderen stabil je Kennung. */
export function crewColor(id: string, kind: MapEntityKind): (typeof CREW_COLORS)[number] {
  if (kind === 'player') return CREW_COLORS[0]!;
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  // Nie die Spielerfarbe: die anderen teilen sich den Rest der Palette.
  return CREW_COLORS[1 + (hash % (CREW_COLORS.length - 1))]!;
}

/**
 * Wohin die Figur schaut, als Vorzeichen: `1` nach rechts (Osten), `-1` nach
 * links. Wer genau nach Norden oder Süden läuft, behält die letzte Seite —
 * sonst flackerte das Sprite bei jedem Wackeln des Stocks.
 */
export function facingOf(yaw: number, previous: 1 | -1 = 1): 1 | -1 {
  const dx = -Math.sin(yaw);
  if (dx > 0.2) return 1;
  if (dx < -0.2) return -1;
  return previous;
}

/** Schritte je Sekunde beim Gehen und beim Rennen. */
const WALK_HZ = 2.4;
const SPRINT_HZ = 3.6;

/** Die Phase der Gehanimation in [0, 1): steht die Figur, ist sie 0 (beide Beine unten). */
export function walkPhase(time: number, moving: boolean, sprinting = false): number {
  if (!moving) return 0;
  const cycles = time * (sprinting ? SPRINT_HZ : WALK_HZ);
  return cycles - Math.floor(cycles);
}

/** Wie hoch die Beine gerade sind, in Anteilen der Schrittweite — abwechselnd. */
export function legLift(phase: number): { left: number; right: number } {
  const swing = Math.sin(phase * Math.PI * 2);
  return { left: Math.max(0, swing), right: Math.max(0, -swing) };
}

export interface CrewmateLook {
  /** Bildpunkte je Meter. */
  scale: number;
  fill: string;
  shade: string;
  facing: 1 | -1;
  /** Phase der Gehanimation, siehe `walkPhase`. */
  phase: number;
  /** Im Schrank oder im Schacht: nur ein blasser Umriss. */
  concealed?: boolean;
}

/**
 * Ein Crewmate: runder Körper, Visier, Rucksack, zwei Beine. `x`/`y` ist der
 * Fußpunkt in Bildpunkten. Gezeichnet wird immer nach rechts schauend; der
 * Kontext wird für den Blick nach links gespiegelt.
 */
export function drawCrewmate(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  look: CrewmateLook,
): void {
  const u = look.scale;
  const legs = legLift(look.phase);
  ctx.save();
  ctx.translate(x, y);
  if (look.facing < 0) ctx.scale(-1, 1);
  if (look.concealed) ctx.globalAlpha = 0.35;
  ctx.lineWidth = Math.max(1.5, u * 0.045);
  ctx.strokeStyle = ART.ink;
  ctx.lineJoin = 'round';

  // Schatten unter den Füßen.
  ctx.fillStyle = ART.shadow;
  ctx.beginPath();
  ctx.ellipse(0, u * 0.03, u * 0.42, u * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Rucksack, hinten (links, weil die Figur nach rechts schaut).
  ctx.fillStyle = look.shade;
  ctx.beginPath();
  ctx.roundRect(-u * 0.56, -u * 0.86, u * 0.26, u * 0.5, u * 0.09);
  ctx.fill();
  ctx.stroke();

  // Beine: das gehobene ist kürzer und ein Stück nach oben verschoben.
  for (const [side, lift] of [
    [-0.3, legs.left],
    [0.02, legs.right],
  ] as const) {
    const raise = lift * u * 0.12;
    ctx.fillStyle = look.fill;
    ctx.beginPath();
    ctx.roundRect(side * u, -u * 0.34 - raise, u * 0.28, u * 0.34, u * 0.08);
    ctx.fill();
    ctx.stroke();
  }

  // Körper: oben rund, unten gerade — die Bohne.
  ctx.fillStyle = look.fill;
  ctx.beginPath();
  ctx.moveTo(-u * 0.4, -u * 0.3);
  ctx.lineTo(-u * 0.4, -u * 0.8);
  ctx.quadraticCurveTo(-u * 0.4, -u * 1.2, u * 0.02, -u * 1.2);
  ctx.quadraticCurveTo(u * 0.42, -u * 1.2, u * 0.42, -u * 0.82);
  ctx.lineTo(u * 0.42, -u * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Ein Schatten auf der Rückseite, damit der Körper rund wirkt.
  ctx.fillStyle = look.shade;
  ctx.beginPath();
  ctx.roundRect(-u * 0.34, -u * 0.72, u * 0.12, u * 0.36, u * 0.06);
  ctx.fill();

  // Visier, nach vorn, mit Glanz.
  ctx.fillStyle = ART.visor;
  ctx.beginPath();
  ctx.roundRect(u * 0.02, -u * 1.06, u * 0.5, u * 0.3, u * 0.14);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = ART.visorShade;
  ctx.beginPath();
  ctx.roundRect(u * 0.1, -u * 0.9, u * 0.36, u * 0.1, u * 0.05);
  ctx.fill();
  ctx.fillStyle = ART.glint;
  ctx.beginPath();
  ctx.roundRect(u * 0.12, -u * 1.01, u * 0.2, u * 0.07, u * 0.035);
  ctx.fill();
  ctx.restore();
}

export interface MonsterLook {
  scale: number;
  /** Die Sorte (`MonsterKind`) — entscheidet über die Silhouette. */
  kind: string;
  facing: 1 | -1;
  phase: number;
  /** Sekunden, für das Glühen der Augen. */
  time: number;
}

/** Wie hoch das Monster je Sorte steht, in Metern — der Crawler kriecht. */
export function monsterHeight(kind: string): number {
  return kind === 'crawler' ? 0.7 : kind === 'sentinel' ? 1.45 : 1.3;
}

/**
 * Das Monster: eine dunkle, gezackte Silhouette mit glühenden Augen. Der
 * Verlorene (`stalker`) ist ein schiefer Anzug, der Crawler ein flaches Tier,
 * der Wächter (`sentinel`) ein breiter Block. Auch hier nach rechts gezeichnet.
 */
export function drawMonster(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  look: MonsterLook,
): void {
  const u = look.scale;
  const h = monsterHeight(look.kind) * u;
  const bob = Math.sin(look.phase * Math.PI * 2) * u * 0.04;
  ctx.save();
  ctx.translate(x, y);
  if (look.facing < 0) ctx.scale(-1, 1);
  ctx.lineWidth = Math.max(1.5, u * 0.05);
  ctx.strokeStyle = ART.monsterEdge;
  ctx.lineJoin = 'round';
  ctx.fillStyle = ART.shadow;
  ctx.beginPath();
  ctx.ellipse(0, u * 0.04, u * 0.5, u * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = ART.monster;
  monsterSilhouette(ctx, u, look.kind, bob);
  ctx.fill();
  ctx.stroke();

  // Augen: zwei Glutpunkte, die atmen.
  const glow = 0.7 + 0.3 * Math.sin(look.time * 5);
  const eyeY = look.kind === 'crawler' ? -h * 0.45 : -h * 0.78 - bob;
  for (const ex of [0.12, 0.3]) {
    ctx.fillStyle = `rgba(255, 60, 60, ${0.25 * glow})`;
    ctx.beginPath();
    ctx.arc(u * ex, eyeY, u * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ART.eye;
    ctx.beginPath();
    ctx.arc(u * ex, eyeY, u * 0.045, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * **Die Möbel der Station, in derselben Handschrift** — Tische, Werkbänke,
 * Kryokapseln, Kisten: was in 3D im Raum steht (`stationLayout.ts`), steht
 * hier auch.
 *
 * Es gibt genau **eine** Spielwelt, und die 2D-Ansicht ist eine Ansicht davon
 * und keine zweite Möblierung: Maß, Platz, Drehung und Farbe kommen aus dem
 * Snapshot und aus `fixtureDimensions.ts` — derselben Datei, aus der die
 * 3D-Klötze ihre Farbe nehmen. Wer in 3D einen Tisch verrückt, verrückt ihn
 * hier mit.
 *
 * Gezeichnet wird wie alles Aufrechte der Szene: die Grundfläche liegt auf
 * dem Boden, der Körper wächst auf dem Bild nach **oben** (nach Norden), und
 * obendrauf liegt die hellere Deckfläche. `x`/`y` ist die Mitte der
 * Grundfläche in Bildpunkten, `scale` sind Bildpunkte je Meter.
 */
export function drawFixture(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  fixture: Pick<MapFixture, 'kind' | 'mark' | 'yaw' | 'width' | 'depth'>,
): void {
  const u = scale;
  const height = fixtureHeight(fixture) * u;
  const [fill, top] = fixtureColors(fixture);
  // Die vier Ecken der Grundfläche, gedreht wie im Schiff. `yaw` dreht wie in
  // three.js gegen den Uhrzeigersinn von oben — auf dem Bild also so.
  const cos = Math.cos(-fixture.yaw),
    sin = Math.sin(-fixture.yaw);
  const hw = (fixture.width * u) / 2,
    hd = (fixture.depth * u) / 2;
  const foot: Array<[number, number]> = [
    [-hw, -hd],
    [hw, -hd],
    [hw, hd],
    [-hw, hd],
  ].map(([lx, lz]) => [lx * cos - lz * sin, lx * sin + lz * cos]);

  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = Math.max(1.2, u * 0.035);
  ctx.strokeStyle = ART.ink;
  ctx.lineJoin = 'round';

  // Der Schatten auf dem Boden, damit der Klotz nicht schwebt.
  ctx.fillStyle = ART.shadow;
  polygon(ctx, foot);
  ctx.fill();

  // Der Körper: die Silhouette aus Grundfläche und der um `height` nach Norden
  // geschobenen Deckfläche — ihre konvexe Hülle ist genau der Umriss.
  const lid = foot.map(([px, pz]): [number, number] => [px, pz - height]);
  ctx.fillStyle = fill;
  polygon(ctx, hull([...foot, ...lid]));
  ctx.fill();
  ctx.stroke();

  // Die Deckfläche darüber, heller — daran sieht man die Höhe.
  ctx.fillStyle = top;
  polygon(ctx, lid);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/**
 * Wie hoch ein Möbel ist, in Metern — **die Höhe seines Bausteins**, also
 * genau die des 3D-Klotzes (`fixtureDimensions.markHeight`). Die Maße aus
 * `FIXTURE_CATALOG` sind die Hülle für die Aufstellung, nicht das Möbel: Ein
 * Esstisch stünde damit 1,6 m hoch auf dem Bild und sähe aus wie ein Schrank.
 */
export function fixtureHeight(fixture: Pick<MapFixture, 'kind' | 'mark'>): number {
  if (fixture.kind === 'cargo') return CARGO_SIZE.height;
  if (fixture.kind === 'locker') return LOCKER_SIZE.height;
  if (fixture.kind === 'console') return CONSOLE_SIZE.height;
  const mark = fixture.mark as MarkId | undefined;
  return mark ? markHeight(mark) : 1;
}

/** Vorderseite und Deckfläche eines Möbels als CSS-Farben. */
function fixtureColors(fixture: Pick<MapFixture, 'kind' | 'mark'>): [string, string] {
  const base =
    fixture.kind === 'cargo'
      ? 0xb9803a
      : fixture.kind === 'locker'
        ? 0x53628f
        : fixture.kind === 'console'
          ? 0x3a6f5e
          : (MARK_COLORS[fixture.mark as MarkId] ?? 0x5c6773);
  return [shade(base, 0.72), shade(base, 1.08)];
}

/** Eine Farbe heller oder dunkler, als `#rrggbb`. */
function shade(color: number, factor: number): string {
  const part = (shift: number): number =>
    Math.max(0, Math.min(255, Math.round(((color >> shift) & 0xff) * factor)));
  return `#${((part(16) << 16) | (part(8) << 8) | part(0)).toString(16).padStart(6, '0')}`;
}

/** Einen Pfad aus Punkten legen — ohne zu zeichnen. */
function polygon(
  ctx: CanvasRenderingContext2D,
  points: ReadonlyArray<readonly [number, number]>,
): void {
  ctx.beginPath();
  points.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.closePath();
}

/**
 * Die konvexe Hülle nach Andrew — acht Punkte, kein Grund für mehr Aufwand.
 * Sie ist der Umriss des Klotzes: Grundfläche plus verschobene Deckfläche.
 */
export function hull(points: ReadonlyArray<readonly [number, number]>): Array<[number, number]> {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (sorted.length < 3) return sorted.map(([px, py]) => [px, py]);
  const cross = (
    o: readonly [number, number],
    a: readonly [number, number],
    b: readonly [number, number],
  ): number => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const build = (list: ReadonlyArray<readonly [number, number]>): Array<[number, number]> => {
    const out: Array<[number, number]> = [];
    for (const point of list) {
      while (out.length >= 2 && cross(out[out.length - 2]!, out[out.length - 1]!, point) <= 0)
        out.pop();
      out.push([point[0], point[1]]);
    }
    out.pop();
    return out;
  };
  return [...build(sorted), ...build([...sorted].reverse())];
}

/** Die Grundfläche einer Requisite für das Tippen, in Metern: Breite und Höhe auf dem Bild. */
export function propFootprint(kind: MapItem['kind']): { w: number; h: number } {
  switch (kind) {
    case 'locker':
      return { w: 0.7, h: 1.5 };
    case 'console':
      return { w: 1.1, h: 1.0 };
    case 'cargo':
      return { w: 1.0, h: 0.9 };
    case 'vent':
      return { w: 1.0, h: 0.7 };
    case 'van':
      return { w: 1.6, h: 1.2 };
    default:
      return { w: 0.7, h: 0.8 };
  }
}

/**
 * Eine Requisite aus dem Snapshot: Frachtschrank, Konsole, Schutzschrank,
 * Klappe, Sicherungskasten, Einsatzzentrale — je nach `kind` und `state`.
 * `x`/`y` ist der Fußpunkt (die Mitte der Grundfläche) in Bildpunkten.
 */
export function drawProp(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  item: Pick<MapItem, 'kind' | 'state' | 'interactive' | 'mark' | 'goal'>,
  time = 0,
): void {
  const u = scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = Math.max(1.5, u * 0.045);
  ctx.strokeStyle = ART.ink;
  ctx.lineJoin = 'round';
  switch (item.kind) {
    case 'cargo':
      drawCargo(ctx, u, item, time);
      break;
    case 'console':
      drawConsole(ctx, u, item.state, item.interactive, time);
      break;
    case 'locker':
      drawLocker(ctx, u, item.state, time);
      break;
    case 'vent':
      drawVent(ctx, u, item.state === 'open');
      break;
    case 'fuse':
      drawFuse(ctx, u);
      break;
    case 'van':
      drawAirlock(ctx, u, item.state === 'ready', time);
      break;
    default:
      drawCrate(ctx, u, item.kind);
  }
  ctx.restore();
}

/**
 * **Frachtkiste: Kasten, Deckel, Kennzeichen — und wenn sie das Ziel ist,
 * leuchtet sie selbst.**
 *
 * Das **Kennzeichen** (Farbband und Nummer) steht immer daran, auch ohne Ziel:
 * Der Archivar sagt „Kiste 2, blaues Band", und wer das hört, muss es auf dem
 * Bild wiederfinden können. Früher stand hier stattdessen der Inhalt — und
 * damit hatte der Archivar nichts mehr zu sagen.
 *
 * **Das Ziel ist die Kiste und kein Ring daneben.** Ein Ring am Ort war eine
 * zweite Marke neben der Sache, um die es geht; hier ist es dieselbe: ein
 * Schein darunter (Muster `drawLamp`), ein Umriss darum und ein Puls
 * (Muster `drawConsole`). Steht ein Mensch am Archiv, kommt `goal` nie an —
 * dann leuchtet keine Kiste, und der Raum ist die ganze Auskunft
 * (`map/flatScene.ts`).
 */
function drawCargo(
  ctx: CanvasRenderingContext2D,
  u: number,
  item: Pick<MapItem, 'state' | 'mark' | 'goal'>,
  time: number,
): void {
  const state = item.state;
  const taken = state === 'taken';
  // Der Umriss der ganzen Kiste, aus Fuß und Deckel — dieselben Ecken, die
  // unten gezeichnet werden, damit Saum und Kasten zueinander passen.
  const foot: Array<[number, number]> = [
    [-u * 0.5, u * 0.06],
    [u * 0.5, u * 0.06],
  ];
  const lid: Array<[number, number]> = [
    [-u * 0.56, -u * 0.78],
    [u * 0.56, -u * 0.78],
  ];
  if (item.goal && !taken) {
    const pulse = 0.75 + 0.25 * Math.sin(time * 9);
    ctx.fillStyle = radialGradient(ctx, 0, -u * 0.35, u * 1.2, [
      [0, `rgba(255, 216, 74, ${(0.34 * pulse).toFixed(3)})`],
      [1, 'rgba(255, 216, 74, 0)'],
    ]);
    ctx.beginPath();
    ctx.arc(0, -u * 0.35, u * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = ART.shadow;
  ctx.beginPath();
  ctx.ellipse(0, u * 0.04, u * 0.55, u * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = taken ? ART.metalDark : '#b9803a';
  ctx.beginPath();
  ctx.roundRect(-u * 0.48, -u * 0.62, u * 0.96, u * 0.62, u * 0.05);
  ctx.fill();
  ctx.stroke();
  // Spannbänder.
  ctx.fillStyle = taken ? ART.metal : '#7e5322';
  ctx.fillRect(-u * 0.3, -u * 0.62, u * 0.1, u * 0.62);
  ctx.fillRect(u * 0.2, -u * 0.62, u * 0.1, u * 0.62);
  if (state === 'closed') {
    ctx.fillStyle = '#d19a4e';
    ctx.beginPath();
    ctx.roundRect(-u * 0.52, -u * 0.74, u * 1.04, u * 0.16, u * 0.04);
    ctx.fill();
    ctx.stroke();
  } else {
    // Deckel hochgeklappt: ein schmaler Streifen hinter dem Kasten, dunkles Innere davor.
    ctx.fillStyle = taken ? ART.metal : '#d19a4e';
    ctx.beginPath();
    ctx.roundRect(-u * 0.5, -u * 1.08, u * 1.0, u * 0.42, u * 0.04);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1a1410';
    ctx.fillRect(-u * 0.42, -u * 0.66, u * 0.84, u * 0.1);
  }
  drawCargoMark(ctx, u, item.mark, taken);
  if (item.goal && !taken) {
    const pulse = 0.75 + 0.25 * Math.sin(time * 9);
    const shape = hull([...foot, ...lid]);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = ART.goal;
    ctx.lineWidth = Math.max(2, u * 0.07);
    ctx.beginPath();
    shape.forEach(([px, py], index) => (index ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = ART.ink;
  }
}

/** Farbband und Nummer, quer über die Kiste — das, worüber gesprochen wird. */
function drawCargoMark(
  ctx: CanvasRenderingContext2D,
  u: number,
  mark: MapItem['mark'],
  taken: boolean,
): void {
  if (!mark) return;
  const colour = `#${CARGO_BAND_COLORS[mark.colour].toString(16).padStart(6, '0')}`;
  ctx.save();
  // Eine geleerte Kiste bleibt kenntlich, tritt aber zurück: Sie ist erledigt,
  // und ein leuchtendes Band an ihr wäre eine Einladung, noch einmal hinzugehen.
  ctx.globalAlpha = taken ? 0.45 : 1;
  ctx.fillStyle = colour;
  ctx.fillRect(-u * 0.48, -u * 0.44, u * 0.96, u * 0.16);
  ctx.strokeStyle = ART.ink;
  ctx.lineWidth = Math.max(1, u * 0.02);
  ctx.strokeRect(-u * 0.48, -u * 0.44, u * 0.96, u * 0.16);
  ctx.fillStyle = ART.bandInk;
  ctx.font = `700 ${Math.max(7, u * 0.16).toFixed(1)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(mark.number), 0, -u * 0.35);
  ctx.restore();
}

/** Konsole: ein Pult mit schrägem Bildschirm — leuchtet, solange sie etwas will. */
function drawConsole(
  ctx: CanvasRenderingContext2D,
  u: number,
  state: string,
  interactive: boolean,
  time: number,
): void {
  ctx.fillStyle = ART.shadow;
  ctx.beginPath();
  ctx.ellipse(0, u * 0.04, u * 0.6, u * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  // Sockel.
  ctx.fillStyle = ART.metalDark;
  ctx.beginPath();
  ctx.roundRect(-u * 0.4, -u * 0.5, u * 0.8, u * 0.5, u * 0.05);
  ctx.fill();
  ctx.stroke();
  // Pult.
  ctx.fillStyle = ART.metal;
  ctx.beginPath();
  ctx.moveTo(-u * 0.55, -u * 0.5);
  ctx.lineTo(-u * 0.45, -u * 0.78);
  ctx.lineTo(u * 0.45, -u * 0.78);
  ctx.lineTo(u * 0.55, -u * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Bildschirm: rot flackernd, wenn kaputt; grün, wenn gelöst; sonst aus.
  const flicker = 0.75 + 0.25 * Math.sin(time * 9);
  ctx.fillStyle = state === 'solved' ? ART.screenGood : interactive ? ART.screenBad : ART.screenOff;
  if (interactive && state !== 'solved') ctx.globalAlpha = flicker;
  ctx.beginPath();
  ctx.roundRect(-u * 0.36, -u * 0.74, u * 0.72, u * 0.2, u * 0.03);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.stroke();
  // Tasten.
  ctx.fillStyle = ART.metalLight;
  for (let i = -2; i <= 2; i++) ctx.fillRect(u * (i * 0.13 - 0.04), -u * 0.44, u * 0.08, u * 0.06);
}

/** Schutzschrank: ein schmaler Spind; offen mit Spalt, zerstört als Wrack mit Glut. */
function drawLocker(ctx: CanvasRenderingContext2D, u: number, state: string, time: number): void {
  ctx.fillStyle = ART.shadow;
  ctx.beginPath();
  ctx.ellipse(0, u * 0.04, u * 0.42, u * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  if (state === 'destroyed') {
    // Aufgerissen: die Tür hängt schief, dahinter glimmt es.
    const glow = 0.5 + 0.5 * Math.sin(time * 6);
    ctx.fillStyle = ART.metalDark;
    ctx.beginPath();
    ctx.moveTo(-u * 0.32, 0);
    ctx.lineTo(-u * 0.36, -u * 1.3);
    ctx.lineTo(-u * 0.1, -u * 1.42);
    ctx.lineTo(u * 0.3, -u * 1.2);
    ctx.lineTo(u * 0.34, -u * 0.5);
    ctx.lineTo(u * 0.2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = `rgba(255, 122, 31, ${0.35 + 0.4 * glow})`;
    ctx.beginPath();
    ctx.moveTo(-u * 0.2, -u * 0.3);
    ctx.lineTo(-u * 0.05, -u * 1.1);
    ctx.lineTo(u * 0.18, -u * 0.9);
    ctx.lineTo(u * 0.12, -u * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = ART.metal;
    ctx.beginPath();
    ctx.moveTo(u * 0.05, -u * 0.95);
    ctx.lineTo(u * 0.5, -u * 0.6);
    ctx.lineTo(u * 0.45, -u * 0.05);
    ctx.lineTo(u * 0.22, -u * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Funken.
    ctx.fillStyle = ART.amber;
    for (let i = 0; i < 3; i++) {
      const t = (time * 2 + i * 0.37) % 1;
      ctx.fillRect(u * (-0.1 + i * 0.12 + t * 0.08), -u * (0.6 + t * 0.5), u * 0.04, u * 0.04);
    }
    return;
  }
  ctx.fillStyle = ART.metal;
  ctx.beginPath();
  ctx.roundRect(-u * 0.32, -u * 1.4, u * 0.64, u * 1.4, u * 0.05);
  ctx.fill();
  ctx.stroke();
  // Tür mit Lüftungsschlitzen; offen ein dunkler Spalt.
  ctx.fillStyle = state === 'open' ? '#151a20' : ART.metalLight;
  ctx.beginPath();
  ctx.roundRect(-u * 0.24, -u * 1.32, u * 0.48, u * 1.24, u * 0.03);
  ctx.fill();
  ctx.stroke();
  if (state !== 'open') {
    ctx.fillStyle = ART.metalDark;
    for (let i = 0; i < 3; i++) ctx.fillRect(-u * 0.14, -u * (1.2 - i * 0.12), u * 0.28, u * 0.04);
    ctx.fillRect(u * 0.1, -u * 0.72, u * 0.06, u * 0.16);
  }
}

/** Klappe: ein Gitter am Boden; offen sind die Lamellen gekippt und die Kante leuchtet. */
function drawVent(ctx: CanvasRenderingContext2D, u: number, open: boolean): void {
  ctx.fillStyle = open ? '#1a1206' : ART.metalDark;
  ctx.beginPath();
  ctx.roundRect(-u * 0.48, -u * 0.34, u * 0.96, u * 0.62, u * 0.05);
  ctx.fill();
  ctx.strokeStyle = open ? ART.amber : ART.ink;
  ctx.stroke();
  ctx.fillStyle = ART.metal;
  for (let i = 0; i < 4; i++) {
    const top = -u * (0.26 - i * 0.14);
    ctx.beginPath();
    if (open) {
      // Gekippt: ein Parallelogramm je Lamelle.
      ctx.moveTo(-u * 0.38, top);
      ctx.lineTo(u * 0.38, top);
      ctx.lineTo(u * 0.3, top + u * 0.06);
      ctx.lineTo(-u * 0.46, top + u * 0.06);
    } else ctx.rect(-u * 0.38, top, u * 0.76, u * 0.07);
    ctx.closePath();
    ctx.fill();
  }
}

/** Sicherungskasten: ein Kasten mit Blitz. */
function drawFuse(ctx: CanvasRenderingContext2D, u: number): void {
  ctx.fillStyle = '#6b6f3a';
  ctx.beginPath();
  ctx.roundRect(-u * 0.25, -u * 0.8, u * 0.5, u * 0.7, u * 0.04);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = ART.amber;
  ctx.beginPath();
  ctx.moveTo(u * 0.06, -u * 0.72);
  ctx.lineTo(-u * 0.1, -u * 0.45);
  ctx.lineTo(u * 0.02, -u * 0.45);
  ctx.lineTo(-u * 0.06, -u * 0.18);
  ctx.lineTo(u * 0.1, -u * 0.5);
  ctx.lineTo(-u * 0.02, -u * 0.5);
  ctx.closePath();
  ctx.fill();
}

/** Die Einsatzzentrale: eine Schleuse als Ring am Boden, die blinkt, wenn die Crew heim darf. */
function drawAirlock(ctx: CanvasRenderingContext2D, u: number, ready: boolean, time: number): void {
  ctx.fillStyle = ART.metalDark;
  ctx.beginPath();
  ctx.ellipse(0, 0, u * 0.8, u * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = ready ? `rgba(108, 245, 138, ${0.5 + 0.5 * Math.sin(time * 4)})` : ART.metal;
  ctx.lineWidth = Math.max(2, u * 0.08);
  ctx.beginPath();
  ctx.ellipse(0, 0, u * 0.55, u * 0.32, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = ART.metal;
  ctx.beginPath();
  ctx.ellipse(0, 0, u * 0.2, u * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Alles Übrige: eine kleine Kiste, Medkit mit Kreuz, Werkzeug mit Griff. */
function drawCrate(ctx: CanvasRenderingContext2D, u: number, kind: MapItem['kind']): void {
  ctx.fillStyle = kind === 'medkit' ? '#e8eef0' : kind === 'mark' ? '#7a4f9a' : ART.metal;
  ctx.beginPath();
  ctx.roundRect(-u * 0.28, -u * 0.44, u * 0.56, u * 0.44, u * 0.05);
  ctx.fill();
  ctx.stroke();
  if (kind === 'medkit') {
    ctx.fillStyle = ART.screenBad;
    ctx.fillRect(-u * 0.04, -u * 0.36, u * 0.08, u * 0.28);
    ctx.fillRect(-u * 0.14, -u * 0.26, u * 0.28, u * 0.08);
  } else {
    ctx.fillStyle = ART.metalLight;
    ctx.fillRect(-u * 0.2, -u * 0.26, u * 0.4, u * 0.06);
  }
}

/** Eine Deckenleuchte als Symbol: Fassung, Schirm, Schein wenn sie brennt. */
export function drawLamp(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  on: boolean,
  color = ART.lampOn,
): void {
  const u = scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = Math.max(1.5, u * 0.04);
  ctx.strokeStyle = ART.ink;
  if (on) {
    ctx.fillStyle = radialGradient(ctx, 0, 0, u * 0.9, [
      [0, 'rgba(255, 233, 176, 0.35)'],
      [1, 'rgba(255, 233, 176, 0)'],
    ]);
    ctx.beginPath();
    ctx.arc(0, 0, u * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = ART.metalDark;
  ctx.beginPath();
  ctx.ellipse(0, 0, u * 0.3, u * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = on ? color : ART.lampOff;
  ctx.beginPath();
  ctx.ellipse(0, 0, u * 0.18, u * 0.11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Ein Name über einer Figur: weiß mit dunklem Rand, wie in der Vorlage. */
export function drawName(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  size = 14,
): void {
  ctx.save();
  ctx.font = `600 ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, size * 0.25);
  ctx.strokeStyle = ART.ink;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, x, y);
  ctx.restore();
}

/**
 * **Der Umriss des Monsters als reiner Pfad** — gemeinsame Sache von
 * `drawMonster` und `drawGhost`.
 *
 * Zwei Umrisse für dasselbe Vieh wären zwei Viecher: Wer die gestrichelte
 * Erinnerung anders zeichnet als das Original, lässt den Spieler raten, ob er
 * dieselbe Sorte vor sich hat. Der Pfad wird nur gebaut, gefüllt und gestrichen
 * wird beim Aufrufer.
 */
function monsterSilhouette(
  ctx: CanvasRenderingContext2D,
  u: number,
  kind: string,
  bob: number,
): void {
  const h = monsterHeight(kind) * u;
  ctx.beginPath();
  if (kind === 'crawler') {
    // Flach und lang, mit Zacken auf dem Rücken.
    ctx.moveTo(-u * 0.6, 0);
    ctx.lineTo(-u * 0.55, -h * 0.5);
    ctx.lineTo(-u * 0.35, -h * 0.75);
    ctx.lineTo(-u * 0.2, -h * 0.5);
    ctx.lineTo(-u * 0.05, -h);
    ctx.lineTo(u * 0.1, -h * 0.55);
    ctx.lineTo(u * 0.3, -h * 0.9);
    ctx.lineTo(u * 0.45, -h * 0.5);
    ctx.lineTo(u * 0.65, -h * 0.6);
    ctx.lineTo(u * 0.6, 0);
  } else {
    // Aufrecht: schmaler Rumpf, gezackte Schultern, schiefer Kopf.
    const w = kind === 'sentinel' ? 0.55 : 0.42;
    ctx.moveTo(-u * w, 0);
    ctx.lineTo(-u * (w + 0.08), -h * 0.45);
    ctx.lineTo(-u * (w + 0.18), -h * 0.75);
    ctx.lineTo(-u * (w - 0.1), -h * 0.7);
    ctx.lineTo(-u * 0.15, -h * 0.98 - bob);
    ctx.lineTo(u * 0.08, -h * 0.82 - bob);
    ctx.lineTo(u * 0.3, -h - bob);
    ctx.lineTo(u * (w - 0.05), -h * 0.72);
    ctx.lineTo(u * (w + 0.15), -h * 0.8);
    ctx.lineTo(u * (w + 0.05), -h * 0.4);
    ctx.lineTo(u * w, 0);
  }
  ctx.closePath();
}

/** Und derselbe Umriss für einen Crewmate: Bohne, Rucksackbuckel, zwei Beine. */
function crewSilhouette(ctx: CanvasRenderingContext2D, u: number): void {
  ctx.beginPath();
  ctx.moveTo(-u * 0.4, 0);
  ctx.lineTo(-u * 0.4, -u * 0.8);
  ctx.quadraticCurveTo(-u * 0.4, -u * 1.2, u * 0.02, -u * 1.2);
  ctx.quadraticCurveTo(u * 0.42, -u * 1.2, u * 0.42, -u * 0.82);
  ctx.lineTo(u * 0.42, 0);
  ctx.closePath();
}

/** Die Farben der gestrichelten Erinnerung: der Techniker kalt, das Monster rot. */
export const GHOST_INK: Readonly<Record<'crew' | 'monster', string>> = {
  crew: '#9fd2ea',
  monster: '#ff6b6b',
};

export interface GhostLook {
  /** Bildpunkte je Meter. */
  scale: number;
  /** `'crew'` für den Techniker, sonst die Monstersorte (`MonsterKind`). */
  kind: string;
  facing: 1 | -1;
  /** Deckkraft aus `rules/ghosts.ghostAlpha`. */
  alpha: number;
}

/**
 * **„Hier war er zuletzt"** — die gestrichelte Silhouette
 * (`rules/ghosts.ts`, Paket M3b).
 *
 * Kein Körper, sondern eine Kontur: Ein gefüllter Ghost wäre auf einen Blick
 * nicht von der echten Figur zu unterscheiden, und genau das darf er nicht
 * sein. Gestrichelt, halbdurchsichtig, ohne Beine und ohne Augen — was fehlt,
 * sagt mehr als was da ist.
 *
 * Wie kräftig er steht, entscheidet nicht diese Datei, sondern `ghostAlpha`:
 * Vier Zeichner mit vier Meinungen über das Verblassen wären vier
 * verschiedene Spiele.
 */
export function drawGhost(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  look: GhostLook,
): void {
  const u = look.scale;
  ctx.save();
  ctx.translate(x, y);
  if (look.facing < 0) ctx.scale(-1, 1);
  ctx.globalAlpha = Math.max(0, Math.min(1, look.alpha));
  ctx.setLineDash([Math.max(3, u * 0.09), Math.max(3, u * 0.07)]);
  ctx.lineWidth = Math.max(1.5, u * 0.05);
  ctx.lineJoin = 'round';
  if (look.kind === 'crew') {
    ctx.strokeStyle = GHOST_INK.crew;
    crewSilhouette(ctx, u);
  } else {
    ctx.strokeStyle = GHOST_INK.monster;
    monsterSilhouette(ctx, u, look.kind, 0);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

/** Dunkles Blut auf Stationsblech, frisch und getrocknet. */
export const BLOOD_INK = { fresh: '#7a0f16', dry: '#3d0a10' };

/**
 * **Ein Tropfen Blut auf dem Boden** (`rules/blood.ts`).
 *
 * Er liegt **flach**, anders als alles andere in dieser Datei: Kein Körper,
 * der nach Norden wächst, sondern ein Fleck auf der Platte, also eine
 * gedrückte Ellipse genau auf ihrem Punkt. `alpha` kommt aus `dropAlpha` —
 * frisch ist er fast schwarzrot, alt nur noch ein Schatten.
 *
 * Die kleine Nase daneben macht aus dem Kreis einen Spritzer; ihre Richtung
 * hängt am Zeitstempel und nicht am Zufall, damit jedes Gerät denselben
 * Boden malt.
 */
export function drawBloodDrop(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  drop: { since: number },
  alpha: number,
): void {
  const u = scale;
  const wobble = Math.abs(Math.sin(drop.since * 12.9898));
  const r = u * (0.07 + 0.05 * wobble);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.fillStyle = alpha > 0.6 ? BLOOD_INK.fresh : BLOOD_INK.dry;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();
  const angle = drop.since * 2.4;
  ctx.beginPath();
  ctx.ellipse(
    x + Math.cos(angle) * r * 1.5,
    y + Math.sin(angle) * r * 0.9,
    r * 0.4,
    r * 0.26,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();
}
