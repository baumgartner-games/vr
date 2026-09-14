/**
 * **Die Figur, die man von oben spielt** — der Crewmate aus der 2D-Welt.
 *
 * Sie stand bis hierher bei Haunting (`worlds/haunting/map/flatArt.ts`), weil
 * es dort die einzige Ansicht von oben gab. Jetzt hat **jede** Welt eine
 * (`core/flat/`), und dieselbe Figur läuft durch alle — also steht sie hier,
 * und Haunting liest sie von hier. Zwei gezeichnete Crewmates nebeneinander
 * wären zwei, die nach der dritten Änderung verschieden aussehen.
 *
 * Nichts hier weiß von Kamera, Welt oder Karte: Ein Kontext, ein Fußpunkt in
 * Bildpunkten, ein Maßstab (Bildpunkte je Meter) — und die Funktion malt
 * dorthin. So ist sie ohne Browser prüfbar: Ein gefälschter Kontext zählt die
 * Aufrufe, und der Test sieht, ob gespiegelt wurde und welches Bein oben ist.
 *
 * **Gerechnet wird mit einem Kreis, gezeichnet eine Bohne.** Der Körper, an
 * dem die Welt sich stößt, ist der Zylinder des Spielers
 * (`physics/playerClearance.PLAYER_CAPSULE_RADIUS`) — eine Zahl, die 2D und 3D
 * teilen. Was man sieht, ist dieses Sprite: `SPRITE_H` hoch, mit den Füßen auf
 * seinem Punkt, und alles Aufrechte wächst auf dem Bild nach oben.
 */

/** Wie hoch eine Figur auf dem Bild ist, in Metern der Welt. */
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

/** Kontur, Visier und Schatten — was jede Figur teilt. */
export const CREW_ART = {
  ink: '#0e1116',
  visor: '#9fd2ea',
  visorShade: '#4f8fb3',
  glint: '#e6f6ff',
  shadow: 'rgba(0, 0, 0, 0.35)',
} as const;

/** Die Farbe eines Wesens — der Spieler grün, alle anderen stabil je Kennung. */
export function crewColor(id: string, player = false): (typeof CREW_COLORS)[number] {
  if (player) return CREW_COLORS[0]!;
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
  ctx.strokeStyle = CREW_ART.ink;
  ctx.lineJoin = 'round';

  // Schatten unter den Füßen.
  ctx.fillStyle = CREW_ART.shadow;
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
  ctx.fillStyle = CREW_ART.visor;
  ctx.beginPath();
  ctx.roundRect(u * 0.02, -u * 1.06, u * 0.5, u * 0.3, u * 0.14);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = CREW_ART.visorShade;
  ctx.beginPath();
  ctx.roundRect(u * 0.1, -u * 0.9, u * 0.36, u * 0.1, u * 0.05);
  ctx.fill();
  ctx.fillStyle = CREW_ART.glint;
  ctx.beginPath();
  ctx.roundRect(u * 0.12, -u * 1.01, u * 0.2, u * 0.07, u * 0.035);
  ctx.fill();
  ctx.restore();
}
