/**
 * **Das Sprungkissen** — der Boden, auf dem eine Route endet, und der einzige
 * hier, der einen nicht sofort anhält.
 *
 * Oben auf den Podesten steht man sechseinhalb Meter über der Matte, und der
 * kurze Weg zurück ist der, den jeder nimmt: springen. Bis hierher endete er
 * an einer Bodenplatte, und zwar **in einem einzigen Bild** — der Kopf fällt
 * mit zehn Metern in der Sekunde, und im nächsten Bild steht er still. In der
 * Brille ist das kein Aufkommen, sondern ein Schlag ins Innenohr: Das Auge
 * meldet eine Vollbremsung, die der Gleichgewichtssinn nicht mitbekommen hat,
 * und genau diese Lücke ist es, aus der Übelkeit entsteht. Ein Fall lässt sich
 * in VR nicht abschaffen — sein **Ende** schon.
 *
 * Also steht dort jetzt, was in einer echten Halle auch dort steht: ein
 * **großes Kissen**, 1,40 m dick, in das man einsinkt. Es ist kein Quader mit
 * einer weichen Farbe, sondern wirklich weich — eine **Feder mit Dämpfer**, und
 * seine Oberfläche ist der Boden, auf dem der Spieler steht. Wer daraufspringt,
 * drückt sie hinunter; der Blick fährt mit, wird langsamer, kehrt um und wird
 * wieder herausgeschoben. Aus dem einen Bild werden gut acht Zehntelsekunden,
 * und keines davon ist ein Ruck.
 *
 * **Warum die Zahlen hier stehen und nicht in `ClimbWorld`.** Alles unten ist
 * reine Rechnung: eine Feder, ein Rechteck und ein paar Schwellen, ohne
 * three.js und ohne Rapier. Ob ein Sturz aus 6,50 m das Kissen wirklich
 * abfängt, statt es durchzuschlagen, und wie lange der Blick dabei in Bewegung
 * bleibt, ist damit eine Frage an einen Test und nicht an eine Sitzung mit der
 * Brille auf (`crashPad.test.ts`).
 *
 * **Die Feder ist mit Absicht weich.** Wie lange ein Einsinken dauert, hängt
 * bei einer Feder nicht davon ab, wie hart man ankommt — die Zeit bis zum
 * tiefsten Punkt ist ihre Viertelperiode und damit für den Stolperer wie für
 * den Sprung aus sechs Metern dieselbe. Sie hängt allein an der
 * **Kreisfrequenz**, und die ist deshalb die eine Zahl, um die es geht: `7`
 * heißt gut anderthalb Zehntelsekunden nach unten. Weicher ginge, aber dann
 * schlüge ein Sprung von oben unten durch; genau dafür steht darunter der
 * feste Kern (`PAD_CORE`), und davor die **progressive Härte**: Ein Kissen,
 * das schon halb zusammengedrückt ist, wehrt sich stärker als eines im
 * Ruhezustand — bei Luft in einem Sack ist das keine Erfindung, sondern
 * Physik, und hier ist es das, was den tiefen Sturz auffängt, ohne den
 * flachen hart zu machen.
 */

/** Wie dick ein Kissen im Ruhezustand ist. */
export const PAD_HEIGHT = 1.4;

/**
 * Wie tief es unter einem **stehenden** Menschen einsinkt — die Ruhelage,
 * solange jemand darauf steht.
 */
export const PAD_REST = 0.22;

/** Der feste Kern unten, den auch der härteste Sprung nicht mehr zusammendrückt. */
export const PAD_CORE = 0.25;

/** Und damit der ganze Weg, den die Oberfläche nach unten hat. */
export const PAD_MAX_SINK = PAD_HEIGHT - PAD_CORE;

/**
 * **Die Kreisfrequenz der Feder**, in 1/s — die Zahl, an der die ganze Sache
 * hängt.
 *
 * Sie allein bestimmt, wie lange der Blick nach unten fährt: eine
 * Viertelperiode, also `(π/2)/ω` ≈ 0,22 s, gedämpft etwas weniger. Und sie
 * bestimmt, wie tief: Eine Feder ohne Dämpfung sinkt um `v/ω` ein, aus
 * 10 m/s also einen guten Meter. Beides zusammen ist der Grund für 7 und
 * nicht für 12 (zu hart, 0,08 s) und nicht für 4 (zu weich, das Kissen
 * schlägt durch).
 */
export const PAD_OMEGA = 7;

/**
 * Die Dämpfung als Bruchteil der kritischen: knapp darunter, damit das Kissen
 * einen Rest Rückstoß behält und einen wieder herausschiebt, statt einen im
 * Loch liegen zu lassen. Der Überschwinger nach oben bleibt dabei unter
 * sieben Zentimetern — spürbar als Federung, nicht als Trampolin.
 */
export const PAD_DAMPING = 0.65;

/**
 * **Wie viel härter das Kissen wird, wenn es zusammengedrückt ist** — beim
 * Anschlag das Fünffache seiner Ruhesteifigkeit.
 *
 * Der hohe Exponent ist der Punkt: Bis zur halben Einsinktiefe merkt man
 * davon nichts (0,5⁶ ≈ 1,6 %), erst auf dem letzten Viertel geht es steil
 * hoch. Ein Kissen, das von Anfang an progressiv wäre, wäre schlicht ein
 * härteres.
 */
export const PAD_BOTTOM = 4;
const PAD_BOTTOM_EXP = 6;

/** Feste Schrittweite der Feder, damit sie bei 45 Hz dasselbe tut wie bei 120. */
const PAD_SUBSTEP = 1 / 240;

/** Ab welchem Tempo ein Aufkommen ein **Sturz** ist und nicht ein Schritt. */
export const PAD_CATCH_SPEED = 1.6;

/** Der Vorhalt, mit dem das Kissen zupackt: eine Handbreit über seiner Fläche. */
export const PAD_LIP = 0.06;

/** Und wie weit über ihr man noch als „steht darauf“ zählt. */
export const PAD_LOAD_GAP = 0.3;

/**
 * Wie hart der Körper der Oberfläche folgt, in 1/s — der Anteil der Rechnung,
 * der einen Rest Abstand aufholt. Die eigentliche Geschwindigkeit kommt aus
 * der Oberfläche selbst; das hier ist nur die Korrektur.
 */
export const PAD_FOLLOW = 14;

/** Schneller als so wird der Körper nie geführt. */
export const PAD_DRIVE_MAX = 16;

/**
 * Wie schnell die **waagerechte** Bewegung im Kissen ausläuft, in 1/s. Wer
 * schräg hineinspringt, rutscht ein Stück weiter und bleibt dann liegen —
 * ein Kissen, das die Seitwärtsbewegung sofort abschneidet, wäre wieder
 * genau der Ruck, um den es hier geht.
 */
export const PAD_SLIDE = 5;

/**
 * Die Notbremse: So lange darf das Kissen den Körper höchstens führen. Sie
 * greift nie — die Umkehr kommt nach gut anderthalb Zehntelsekunden —, aber
 * ein Zustand, aus dem es keinen Ausgang gibt, ist in einer Welt mit Portalen,
 * Menüs und Netzsitzung keine theoretische Sorge.
 */
export const PAD_MAX_DRIVE_TIME = 0.7;

/** Wie dick die Rampe ist, über die man auf ein Kissen hinaufkommt. */
export const RAMP_THICK = 0.5;

/** Ein Kissen von oben gesehen: sein Rechteck auf dem Hallenboden, in Metern. */
export interface PadRect {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
}

/**
 * Wie weit das Kissen gerade zusammengedrückt ist (`sink`, in Metern nach
 * unten) und wie schnell (`rate`, positiv heißt: sinkt weiter ein).
 */
export interface PadSpring {
  readonly sink: number;
  readonly rate: number;
}

/** Ein unbelastetes Kissen: volle Höhe, in Ruhe. */
export function padAtRest(): PadSpring {
  return { sink: 0, rate: 0 };
}

/** Wo seine Oberfläche gerade liegt, über dem Hallenboden. */
export function padTop(spring: PadSpring): number {
  return PAD_HEIGHT - spring.sink;
}

/** Und wie schnell sie sich bewegt — nach oben positiv, wie jede Geschwindigkeit. */
export function padRise(spring: PadSpring): number {
  return -spring.rate;
}

/** Steht dieser Punkt über dem Kissen? `margin` weitet das Rechteck. */
export function overPad(rect: PadRect, x: number, z: number, margin = 0): boolean {
  return (
    x >= rect.minX - margin &&
    x <= rect.maxX + margin &&
    z >= rect.minZ - margin &&
    z <= rect.maxZ + margin
  );
}

/**
 * **Ein Bild Feder.**
 *
 * `target` ist die Ruhelage, auf die sie zustrebt: `PAD_REST`, solange jemand
 * darauf steht, und 0, sobald niemand mehr darauf steht — dann kommt das
 * Kissen von selbst wieder hoch.
 *
 * Gerechnet wird in festen Teilschritten und nicht im Bild: Eine Feder, die
 * bei 45 Hz anders schwingt als bei 120, ist keine Federung, sondern eine
 * Eigenschaft der Grafikkarte.
 */
export function stepPad(spring: PadSpring, target: number, dt: number): PadSpring {
  if (!(dt > 0)) return spring;
  let { sink, rate } = spring;
  let left = Math.min(dt, 0.25);

  while (left > 0) {
    const h = Math.min(PAD_SUBSTEP, left);
    left -= h;

    // Progressiv: erst auf dem letzten Viertel des Weges wird das Kissen hart.
    const packed = Math.max(0, sink) / PAD_MAX_SINK;
    const stiffness = PAD_OMEGA * PAD_OMEGA * (1 + PAD_BOTTOM * packed ** PAD_BOTTOM_EXP);

    rate += (-stiffness * (sink - target) - 2 * PAD_DAMPING * PAD_OMEGA * rate) * h;
    sink += rate * h;

    // Ganz oben ist Schluss, und ganz unten sitzt der feste Kern.
    if (sink < 0) {
      sink = 0;
      if (rate < 0) rate = 0;
    } else if (sink > PAD_MAX_SINK) {
      sink = PAD_MAX_SINK;
      if (rate > 0) rate = 0;
    }
  }

  return { sink, rate };
}

/**
 * Der Einschlag: Das Kissen übernimmt das Tempo dessen, der darauf fällt.
 * Wer langsamer kommt als das Kissen ohnehin schon einsinkt, ändert nichts —
 * `Math.max` statt einer Zuweisung, damit ein zweiter Fuß den ersten nicht
 * ausbremst.
 */
export function padHit(spring: PadSpring, speed: number): PadSpring {
  return { sink: spring.sink, rate: Math.max(spring.rate, speed) };
}

/**
 * **Packt das Kissen jetzt zu?**
 *
 * `gap` ist der Abstand der Füße über seiner Oberfläche, `speed` das Tempo
 * nach unten. Gerechnet wird mit einem Bild Vorhalt: Wer im nächsten Bild
 * ohnehin darin stünde, wird jetzt gefangen — sonst käme das Kissen genau
 * ein Bild zu spät, und dieses eine Bild ist der Ruck, den es abschaffen soll.
 */
export function padCatches(gap: number, speed: number, dt: number): boolean {
  return speed >= PAD_CATCH_SPEED && gap <= PAD_LIP + Math.max(0, speed) * Math.max(0, dt);
}

/**
 * **Wann das Kissen den Körper wieder loslässt**: am tiefsten Punkt.
 *
 * Danach steigt seine Oberfläche wieder, und ab da braucht es keine Führung
 * mehr — eine Fläche, die von unten kommt, hebt den Körper von selbst an, und
 * zwar über dieselbe Physik, die auch jede Stufe anhebt. Am Umkehrpunkt steht
 * der Körper still: ein besserer Moment, ihn der Schwerkraft zurückzugeben,
 * ist nicht zu haben.
 */
export function padTurned(spring: PadSpring): boolean {
  return spring.rate <= 0;
}

/**
 * Mit welcher senkrechten Geschwindigkeit der Körper geführt wird: dem Kissen
 * hinterher, plus der Korrektur für den Rest Abstand.
 */
export function padDrive(gap: number, rise: number): number {
  const wanted = rise - gap * PAD_FOLLOW;
  return Math.max(-PAD_DRIVE_MAX, Math.min(PAD_DRIVE_MAX, wanted));
}

/** Was von der waagerechten Bewegung nach `dt` noch übrig ist. */
export function padSlide(dt: number): number {
  return Math.exp(-PAD_SLIDE * Math.max(0, dt));
}

/**
 * **Die Rampe auf ein Kissen**, als Quader gerechnet.
 *
 * Ohne sie käme niemand wieder hinauf: Der Körper steigt Stufen bis 32 cm
 * (`PhysicsLocomotion`, Autostep), ein Kissen ist 1,40 m hoch. Ein Keil wäre
 * die ehrlichere Form, ein flach gekippter **Quader** ist ein Bauteil statt
 * vier — sein unteres Ende steckt dafür in der Bodenplatte, und von oben
 * sieht man den Unterschied nicht.
 *
 * Gerechnet wird von der **Oberseite** aus und nicht vom Mittelpunkt: Sie ist
 * die Fläche, auf der gelaufen wird, sie muss oben genau an der Kissenkante
 * und unten genau auf dem Boden ankommen. Der Quader hängt um seine halbe
 * Dicke darunter — quer zu sich selbst, deshalb die beiden Winkelfunktionen.
 *
 * @param edgeZ Die Kissenkante, an der die Rampe oben anschließt
 * @param footZ Und wo sie unten auf dem Boden ankommt — weiter im Süden
 */
export function rampBox(
  edgeZ: number,
  footZ: number,
): { slope: number; length: number; centreY: number; centreZ: number } {
  const run = footZ - edgeZ;
  const slope = Math.atan2(PAD_HEIGHT, run);
  return {
    slope,
    length: Math.hypot(run, PAD_HEIGHT),
    centreY: PAD_HEIGHT / 2 - (RAMP_THICK / 2) * Math.cos(slope),
    centreZ: (edgeZ + footZ) / 2 - (RAMP_THICK / 2) * Math.sin(slope),
  };
}
