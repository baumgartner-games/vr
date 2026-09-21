/**
 * **Squishy Movement** — die Figur staucht und streckt sich, während sie läuft.
 *
 * Der Anlass ist eine Lücke: Diese Figuren haben **keine
 * Auf-und-ab-Bewegung**, die man ihnen abnimmt. Der Kopf darf nicht wippen
 * (er sitzt in der Brille am Menschen davor, und am Schirm ist ein nickendes
 * Bild Übelkeit), und Beine, die abwechselnd aufsetzen, gibt es gar nicht —
 * unter dem Jackensaum sitzt eine geschlossene Kuppel
 * (`core/avatarLook.ts`). Bleibt genau ein Weg, aus dem Rutschen ein Gehen zu
 * machen, und es ist derselbe, den die Zeichentrickfilme seit achtzig Jahren
 * gehen: **squash and stretch**. Wer aufsetzt, wird für einen Moment breit und
 * flach; wer sich abstößt, wird schmal und lang.
 *
 * **Warum eine Hermite-Kurve und kein Sinus.** Ein Sinus ist symmetrisch, und
 * genau das ist an dieser Bewegung falsch: Das Stauchen beim Aufsetzen geht
 * schnell, das Zurückfedern langsam, und oben in der Schwebe passiert fast
 * nichts. Eine kubische Hermite-Kurve bekommt zu jedem Stützpunkt **eine
 * Steigung dazu** — damit lässt sich genau das hinschreiben: ein schneller
 * Ausschlag nach oben, ein langes Absinken, und an der Naht zwischen zwei
 * Schritten weder ein Knick noch ein Sprung. Vier Stützpunkte, und die Kurve
 * dazwischen ist gerechnet und nicht aus einer Tabelle abgelesen.
 *
 * **Und im Stehen atmet sie.** Das ist die zweite Bewegung dieser Datei, und
 * sie beantwortet die Lücke, die die erste offen ließ: Eine Figur, die beim
 * Laufen federt und im Stand zur Statue wird, sieht in dem Moment tot aus, in
 * dem man sie am längsten ansieht — vor dem Tresen, im Menü, beim Warten auf
 * die anderen. Das Atmen ist dasselbe Squash and Stretch, nur **langsamer und
 * flacher** (`IDLE_AMPLITUDE`, `IDLE_PERIOD`) — und es blendet sich mit dem
 * Laufen über `stride` aus, statt neben ihm zu laufen: Wer geht, federt; wer
 * steht, atmet; dazwischen liegt eine Überblendung und kein Umschalter.
 *
 * Diese Datei ist **reine Rechnung** — kein three.js, keine Einstellung, kein
 * Speicher. Wer sie anwendet, ist `core/AvatarBody.ts`; ob überhaupt und wie
 * stark, steht unter _Grafik → Animationen_ (`core/graphicsSettings.ts`).
 */

/**
 * **Wie weit die Figur bei voller Stärke ausschlägt**, als Anteil ihrer Höhe.
 *
 * Neun Prozent auf 1,6 m sind knapp fünfzehn Zentimeter zwischen der
 * flachsten und der längsten Haltung — aus 16 m Höhe (`core/topDownPose.ts`)
 * ist das zu sehen, ohne dass die Figur zum Flummi wird. Wer mehr will,
 * stellt den Faktor daneben hoch; er multipliziert genau diese Zahl.
 */
export const SQUISH_AMPLITUDE = 0.09;

/** Ein Stützpunkt der Kurve: Stelle im Schritt, Wert und Steigung dort. */
interface Key {
  /** Wo im Schritt, von 0 (Aufsetzen) bis 1 (nächstes Aufsetzen). */
  readonly at: number;
  /** −1 ist am flachsten, +1 am längsten. */
  readonly value: number;
  /** Die Steigung an dieser Stelle, in Wert je ganzem Schritt. */
  readonly slope: number;
}

/**
 * **Die vier Stützpunkte eines Schrittes.**
 *
 * Gelesen wird das von links nach rechts wie eine Bewegung: Beim **Aufsetzen**
 * ist die Figur am flachsten und verharrt dort einen Moment (Steigung 0, also
 * ein weicher Boden statt einer Spitze). Beim **Abstoßen** ist sie am
 * längsten, und weil sie dorthin in einem knappen Drittel des Schrittes kommt,
 * ist das der schnelle Teil. Danach **sinkt** sie zurück — der dritte Punkt
 * liegt kaum noch über der Mitte und hat eine deutlich negative Steigung, und
 * genau die macht aus dem Rest des Schrittes ein Fallen statt eines
 * Ausschwingens. Der letzte Punkt ist wieder der erste: gleicher Wert,
 * gleiche Steigung, also läuft die Kurve über die Naht hinweg rund weiter.
 */
const CURVE: readonly Key[] = [
  { at: 0, value: -1, slope: 0 },
  { at: 0.28, value: 0.9, slope: 0 },
  { at: 0.62, value: 0.1, slope: -1.6 },
  { at: 1, value: -1, slope: 0 },
];

/**
 * Ein Stück kubische Hermite-Kurve zwischen zwei Stützpunkten.
 *
 * `t` läuft von 0 bis 1 über das Stück; die Steigungen sind in Wert je ganzem
 * Schritt angegeben und werden deshalb mit der Länge des Stücks multipliziert
 * — sonst hinge die Form der Kurve daran, wie eng die Punkte stehen.
 */
function hermite(t: number, from: Key, to: Key): number {
  const span = to.at - from.at;
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * from.value +
    (t3 - 2 * t2 + t) * span * from.slope +
    (-2 * t3 + 3 * t2) * to.value +
    (t3 - t2) * span * to.slope
  );
}

/**
 * **Der Ausschlag an der Stelle `u` des Schrittes** — −1 flach, +1 lang.
 *
 * `u` darf alles sein: Was über 1 hinausgeht, fängt wieder von vorn an. Ein
 * Schritt ist ein Durchlauf, nicht ein ganzer Doppelschritt — eine Figur ohne
 * Beine setzt zweimal je Takt auf, und genauso rechnet auch das Watscheln
 * daneben (`BodyShape.setStride`).
 */
export function squishCurve(u: number): number {
  const x = u - Math.floor(u);
  for (let i = 1; i < CURVE.length; i++) {
    const to = CURVE[i]!;
    if (x > to.at) continue;
    const from = CURVE[i - 1]!;
    const span = to.at - from.at;
    return hermite(span > 0 ? (x - from.at) / span : 0, from, to);
  }
  return CURVE[CURVE.length - 1]!.value;
}

/**
 * **Wie flach die Figur im Stehen atmet**, als Anteil ihrer Höhe.
 *
 * Ein Drittel des Laufwertes und keine zweite Zahl aus demselben Topf: Drei
 * Prozent sind auf 1,6 m knapp fünf Zentimeter, und genau so viel will man im
 * Stand haben — man soll sehen, dass die Figur lebt, und nicht, dass sie
 * pumpt. Wer mehr will, stellt die Stärke daneben hoch; sie multipliziert
 * genau diese Zahl, und bei ×2 ist das Atmen immer noch flacher als ein
 * Schritt bei ×1.
 */
export const IDLE_AMPLITUDE = 0.03;

/**
 * **Wie lange ein Atemzug bei Tempo ×1 dauert**, in Sekunden.
 *
 * Drei Sekunden sind der ruhige Atem eines Menschen, der nichts tut — und sie
 * sind der Grund, warum das Tempo des Atmens eine eigene Uhr hat und nicht die
 * Taktphase des Laufens: Die steht im Stand still, und eine Figur, deren Atem
 * daran hinge, hielte beim Warten die Luft an. Der Regler im Menü streckt
 * diese Sekunden: ×0,25 ist ein Atemzug auf zwölf Sekunden, ×2 einer auf
 * anderthalb.
 */
export const IDLE_PERIOD = 3;

/**
 * **Der Ausschlag des Atmens an der Stelle `u`** — −1 ausgeatmet, +1
 * eingeatmet, und `u` zählt die Atemzüge.
 *
 * **Und hier ist der Sinus genau richtig**, derselbe, der für den Schritt
 * falsch war. Ein Schritt ist ein Stoß mit einem Aufprall darin, also
 * unsymmetrisch; ein Atemzug ist ein Hin und Her ohne Ereignis — ein und aus
 * dauern gleich lang, es gibt keinen Moment, in dem etwas aufsetzt. Wer ihm
 * die Hermite-Kurve des Schrittes gäbe, bekäme eine Figur, die im Stehen
 * hechelt.
 *
 * Bei `u = 0` steht die Figur in ihrer **natürlichen** Höhe und nicht am
 * flachsten (dort fängt der Schritt an): Ein Atem, der eingeschaltet wird,
 * soll die Figur nicht in demselben Bild um fünf Zentimeter kürzer machen.
 */
export function breathCurve(u: number): number {
  return Math.sin(2 * Math.PI * u);
}

/** Höhe und Breite als Vielfaches — 1 und 1 heißt: unverändert. */
export interface SquishPose {
  height: number;
  width: number;
}

/**
 * **Alles, was ein Bild über die Stauchung einer Figur weiß.**
 *
 * Ein Objekt und keine sieben Stellen in einer Klammer, und das ist eine
 * Lehre aus der zweiten Bewegung: Aus `(phase, stride, amount, tempo)` wurden
 * beim Atmen sieben Zahlen, und eine Aufrufstelle, in der `1, 0.5, 0, 1`
 * steht, sagt niemandem mehr, welche davon die Stärke war. Die Felder haben
 * Namen; wer eines wegdenkt, bekommt die Vorgabe.
 */
export interface SquishDrive {
  /** Die Taktphase des Laufens im Bogenmaß (`AvatarBody.walkPhase`). */
  readonly phase: number;
  /** 0 im Stand, 1 im vollen Lauf — dazwischen wird übergeblendet. */
  readonly stride: number;
  /**
   * **Die Uhr des Atmens**, in Sekunden — sie läuft auch im Stehen weiter.
   *
   * Absichtlich nicht die Phase darüber: Die steht still, sobald die Figur
   * steht, und genau dann soll das Atmen anfangen.
   */
  readonly clock?: number;
  /** Die Stärke beim Laufen; 0 heißt: keine Stauchung. */
  readonly amount?: number;
  /** Das Tempo beim Laufen; 1 ist ein Federn je Schritt. */
  readonly tempo?: number;
  /** Die Stärke im Stehen; 0 heißt: kein Atmen. */
  readonly idleAmount?: number;
  /** Das Tempo des Atmens; 1 ist ein Atemzug je `IDLE_PERIOD`. */
  readonly idleTempo?: number;
}

/**
 * **Wie hoch und wie breit die Figur in diesem Bild steht.**
 *
 * @param drive was die Figur gerade tut und was das Menü dazu sagt
 * @param out   ein Objekt zum Hineinschreiben, damit kein Bild etwas wegwirft
 *
 * **Breite mal Breite mal Höhe bleibt konstant**: Die Breite ist der Kehrwert
 * der Wurzel aus der Höhe, und damit behält die Figur ihr Volumen. Eine, die
 * beim Strecken nur länger wird, sieht aus, als zöge man sie am Kopf hoch;
 * eine, die dabei schmaler wird, federt.
 *
 * **Und das Tempo ist ausdrücklich nicht an den Schritt gebunden.** Ein Federn
 * je Schritt (`tempo` 1) war die erste Fassung, und es war zu schnell: Der
 * Takt des Watschelns ist schon zweimal je Doppelschritt, und eine Figur, die
 * dabei auch noch zweimal die Höhe wechselt, flimmert eher, als dass sie
 * federt. Bei 0,5 — der Vorgabe — zieht sich ein Federn über zwei Schritte,
 * und damit liegt eine ruhige Welle über dem schnelleren Watscheln, statt mit
 * ihm um dieselbe Frequenz zu streiten. Gerechnet wird das als Faktor auf die
 * **Phase**, nicht auf den Ausschlag: Wie weit die Figur federt, sagt
 * `amount`, und die beiden Fragen sollen sich nicht gegenseitig verstellen.
 *
 * **Laufen und Atmen werden überblendet und nicht addiert.** `stride` wiegt
 * das eine hoch und das andere herunter: Im Stand ist die Figur ganz beim
 * Atem, im vollen Lauf ganz beim Schritt, und dazwischen liegt genau die
 * Mischung, die man auch sieht — wer losgeht, hört nicht auf zu atmen, er
 * fängt an zu federn. Zwei Wellen, die sich übereinanderlegten, gäben
 * stattdessen eine dritte, die keiner von beiden gehört.
 */
export function squishPose(
  drive: SquishDrive,
  out: SquishPose = { height: 1, width: 1 },
): SquishPose {
  const stride = Math.min(Math.max(drive.stride, 0), 1);
  const amount = drive.amount ?? 0;
  const tempo = drive.tempo ?? 1;
  const idleAmount = drive.idleAmount ?? 0;
  const idleTempo = drive.idleTempo ?? 1;

  let swing = 0;
  // Das Laufen: nur, solange die Figur auch läuft, und mit `stride` als
  // Gewicht — im Schlendern federt niemand wie im Rennen.
  if (amount > 0 && tempo > 0 && stride > 0) {
    swing += SQUISH_AMPLITUDE * amount * stride * squishCurve((drive.phase * tempo) / Math.PI);
  }
  // Und das Atmen: das Gegenstück dazu, `1 − stride`, damit die Summe der
  // beiden Gewichte immer eins ist und beim Losgehen nichts aufblitzt.
  if (idleAmount > 0 && idleTempo > 0 && stride < 1) {
    swing +=
      IDLE_AMPLITUDE *
      idleAmount *
      (1 - stride) *
      breathCurve(((drive.clock ?? 0) * idleTempo) / IDLE_PERIOD);
  }
  // Der Boden ist Vorsicht und keine Gestaltung: Kein Faktor aus dem Menü
  // kommt ihm nahe, aber eine Figur mit der Höhe 0 wäre ein Strich und ihre
  // Breite eine Division durch null.
  out.height = Math.max(1 + swing, 0.2);
  out.width = 1 / Math.sqrt(out.height);
  return out;
}
