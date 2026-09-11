import type { MapPoint, MapSnapshot, MonsterInsight } from './mapSnapshot';

/**
 * **Was das Monster glaubt und vorhat, als Bild** — die eine Zeichenroutine,
 * die Szene und Karte sich teilen (Paket M4).
 *
 * `monsterRoutine.ts` legt seinen letzten Beschluss als `MonsterInsight` ab:
 * das Glaubensbild über die Räume, den vermuteten Weg des Technikers mit
 * Ankunftszeiten und die Tür, an der es ihn abfangen will. Gezeichnet wurde
 * das bisher nirgends — man sah dem Monster an, *wohin* es läuft, und nie, ob
 * es einen Plan hatte oder gerade würfelte.
 *
 * **Das hier ist Zuschauerwissen und nichts anderes.** Wer mitspielt, darf es
 * nie sehen: Ein Techniker, der das Glaubensbild vor sich hat, weiß, welche
 * Zimmer gerade sicher sind, und die halbe Runde ist vorbei. Die Aufrufer
 * prüfen deshalb den Modus (`omniscient`, „Alles sehen") — hier steht keine
 * Prüfung, weil eine zweite Wahrheit an zwei Stellen die erste ist, die
 * auseinanderläuft.
 *
 * Kein DOM außer dem Kontext, kein three.js: Dieselben Zahlen malt
 * `navigationOverlay.ts` als Bodenkacheln in die 3D-Welt.
 */

/** Ab welchem Anteil ein Raum überhaupt eingefärbt wird. */
export const BELIEF_MIN = 0.02;

/** Wie satt der wahrscheinlichste Raum höchstens wird. */
export const BELIEF_ALPHA = 0.38;

/** Die Farben des Overlays — rot für den Glauben, cyan für die Prognose. */
export const INSIGHT_INK = {
  belief: '255, 77, 85',
  prediction: '#7fe0ff',
  intercept: '#ffd84a',
  text: '#f2f6ff',
  shadow: 'rgba(0, 0, 0, 0.72)',
};

/** Wie groß der Abfangring gezeichnet wird, in Bildpunkten. */
const INTERCEPT_RADIUS = 13;

/**
 * Wie stark ein Raum getönt wird. Nicht linear: Ein Glaubensbild ist meist auf
 * zwei, drei Zimmer verteilt, und bei linearer Deckkraft wäre alles außer dem
 * Spitzenreiter unsichtbar. Die Wurzel hebt die schwachen Anteile so weit an,
 * dass man sie noch als „da könnte er auch sein" liest.
 */
export function beliefAlpha(p: number): number {
  if (!(p > 0)) return 0;
  return Math.min(BELIEF_ALPHA, BELIEF_ALPHA * Math.sqrt(Math.min(1, p)));
}

/** Eine Sekundenzahl, wie sie hier steht: eine Nachkommastelle, Komma, „s". */
export function seconds(value: number): string {
  return `${(Math.round(value * 10) / 10).toFixed(1).replace('.', ',')} s`;
}

/**
 * **Die zwei Zahlen am Abfangring**: „M 3,2 s / T 4,0 s" — wann das Monster
 * dort ist und wann der Techniker. Wer zusieht, liest daran ab, ob der Plan
 * aufgeht, bevor er aufgeht; genau das ist der Reiz am Zusehen.
 */
export function interceptLabel(intercept: NonNullable<MonsterInsight['intercept']>): string {
  return `M ${seconds(intercept.etaMonster)} / T ${seconds(intercept.etaPlayer)}`;
}

/** Wie Weltmeter zu Bildpunkten werden — Szene und Karte können beide das. */
export type InsightPen = (x: number, z: number) => { x: number; y: number };

export interface InsightOptions {
  /** Ob Haltung und Zeiten dabeistehen; auf der kleinen Karte stören sie. */
  labels?: boolean;
}

/**
 * Das ganze Overlay in ein Canvas malen: Raumtönung, gestrichelte Prognose,
 * Abfangring mit beiden Zeiten, Name der Haltung. Der Aufrufer hat den
 * Kontext schon dort, wo er ihn haben will; hier wird nichts verschoben.
 */
export function drawInsight(
  ctx: CanvasRenderingContext2D,
  insight: MonsterInsight,
  snapshot: MapSnapshot,
  pen: InsightPen,
  options: InsightOptions = {},
): void {
  ctx.save();
  drawBelief(ctx, insight, snapshot, pen);
  drawPrediction(ctx, insight, pen);
  drawIntercept(ctx, insight, pen, options.labels !== false);
  if (options.labels !== false) drawMode(ctx, insight, pen);
  ctx.restore();
}

/** Die Raumtönung: je wahrscheinlicher, desto satter das Rot. */
function drawBelief(
  ctx: CanvasRenderingContext2D,
  insight: MonsterInsight,
  snapshot: MapSnapshot,
  pen: InsightPen,
): void {
  for (const entry of insight.belief) {
    if (entry.p < BELIEF_MIN) continue;
    const room = snapshot.rooms.find((one) => one.id === entry.roomId);
    if (!room || room.polygon.length < 3) continue;
    ctx.fillStyle = `rgba(${INSIGHT_INK.belief}, ${beliefAlpha(entry.p).toFixed(3)})`;
    ctx.beginPath();
    room.polygon.forEach((point, i) => {
      const p = pen(point.x, point.z);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.fill();
  }
}

/** Der vermutete Weg des Technikers — gestrichelt, weil er geraten ist. */
function drawPrediction(
  ctx: CanvasRenderingContext2D,
  insight: MonsterInsight,
  pen: InsightPen,
): void {
  const path = insight.prediction?.path ?? [];
  if (path.length < 2) return;
  ctx.strokeStyle = INSIGHT_INK.prediction;
  ctx.lineWidth = 2.5;
  ctx.setLineDash([7, 6]);
  ctx.beginPath();
  path.forEach((point, i) => {
    const p = pen(point.x, point.z);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();
  ctx.setLineDash([]);
}

/** Die Abfangtür: ein Ring und die beiden Ankunftszeiten daneben. */
function drawIntercept(
  ctx: CanvasRenderingContext2D,
  insight: MonsterInsight,
  pen: InsightPen,
  labels: boolean,
): void {
  const intercept = insight.intercept;
  if (!intercept) return;
  const p = pen(intercept.at.x, intercept.at.z);
  ctx.strokeStyle = INSIGHT_INK.intercept;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(p.x, p.y, INTERCEPT_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(p.x, p.y, INTERCEPT_RADIUS * 0.45, 0, Math.PI * 2);
  ctx.stroke();
  if (labels) text(ctx, interceptLabel(intercept), p.x, p.y - INTERCEPT_RADIUS - 10);
}

/**
 * Der Name der Haltung, dort, wo das Monster hinwill. Steht kein Ziel fest,
 * bleibt er weg: Eine Beschriftung ohne Ort ist eine Zeile, die wandert.
 */
function drawMode(ctx: CanvasRenderingContext2D, insight: MonsterInsight, pen: InsightPen): void {
  const goal: MapPoint | null = insight.goal;
  if (!goal) return;
  const p = pen(goal.x, goal.z);
  text(ctx, insight.label, p.x, p.y - 20);
}

/** Beschriftung mit Schatten — auf hellem Boden bliebe sie sonst weg. */
function text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number): void {
  ctx.font = '700 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = INSIGHT_INK.shadow;
  ctx.fillText(value, x + 1, y + 1);
  ctx.fillStyle = INSIGHT_INK.text;
  ctx.fillText(value, x, y);
}
