/**
 * **Wischen, Kneifen, Rad — die Rechnung hinter der großen Vorschau.**
 *
 * Auf der Detailseite eines Modells (`ui/PageDetail.ts`) steht das Ding groß
 * im Bild, und darunter geht die Seite weiter: Maße, Schalter, Animationen.
 * Auf einem Telefon sind das zwei Gesten auf derselben Fläche — **drehen** und
 * **scrollen** —, und ein Finger kann nur eine davon meinen.
 *
 * Also gehört die Fläche nicht ganz dem Modell: Links und rechts bleibt je ein
 * **Saum** (`DETAIL_GUTTER`), in dem ein Wisch die Seite scrollt wie überall
 * sonst. Wer das Modell drehen will, fasst es in der Mitte an; wer
 * weiterlesen will, wischt am Rand. Das ist keine Erfindung: Jede Karte in
 * einer Liste löst es so, und es ist die einzige Lösung, die ohne einen
 * zweiten Knopf auskommt.
 *
 * Reine Zahlen: kein DOM, kein three.js, kein Zeigerereignis — was hier steht,
 * rechnet ein Test nach (`detailDrag.test.ts`), und im Browser bleibt nur das
 * Einsammeln der Ereignisse.
 */

/**
 * **Wie breit der Saum ist**, als Anteil der Breite — links wie rechts.
 *
 * Vierzehn Hundertstel sind auf einem Telefon von 390 Punkten rund 55 Punkte:
 * breit genug für einen Daumen, schmal genug, dass in der Mitte noch 72 % für
 * das Modell bleiben. Weniger wäre ein Saum, den man nicht trifft; mehr wäre
 * ein Modell, das man nicht mehr drehen kann, ohne zu zielen.
 */
export const DETAIL_GUTTER = 0.14;

/** Und was er höchstens sein darf, in Bildpunkten — am Schreibtisch ist die
 * Vorschau 1400 Punkte breit, und 200 Punkte Saum wären dort eine Wüste. */
export const DETAIL_GUTTER_MAX = 90;

/** Wem ein Finger auf der Vorschau gehört. */
export type DetailZone = 'rotate' | 'scroll';

/**
 * **Wie breit der Saum bei dieser Breite wirklich ist**, in Bildpunkten.
 *
 * Eine Stelle für beide, die ihn brauchen: die Frage, wem ein Finger gehört
 * (`detailZone`), und der Kasten im DOM, der die Mitte abdeckt und dort
 * `touch-action: none` trägt (`ui/PageDetail.ts`). Zwei Rechnungen wären zwei
 * Säume, und der Unterschied fiele erst als „manchmal scrollt es nicht" auf.
 */
export function detailGutter(width: number): number {
  if (!(width > 0)) return 0;
  return Math.min(width * DETAIL_GUTTER, DETAIL_GUTTER_MAX);
}

/**
 * **Wer den Finger bekommt** — die Mitte dreht, der Saum scrollt.
 *
 * `x` ist der Abstand vom linken Rand der Vorschau in Bildpunkten. Eine
 * Vorschau ohne Breite gehört dem Scrollen: Ein Kasten, der noch nicht
 * ausgemessen ist, soll die Seite nicht festhalten.
 */
export function detailZone(x: number, width: number): DetailZone {
  if (!(width > 0) || !Number.isFinite(x)) return 'scroll';
  const gutter = detailGutter(width);
  return x < gutter || x > width - gutter ? 'scroll' : 'rotate';
}

/**
 * **Wie weit eine Drehung bei einem Wisch über die ganze Breite geht** — eine
 * ganze Umdrehung und ein bisschen mehr.
 *
 * Gemessen in Radiant je Anteil der Breite: Wer quer über die Vorschau
 * wischt, dreht das Modell einmal herum. Weniger fühlt sich zäh an, mehr macht
 * aus jedem Tippen einen Schleudergang.
 */
export const DETAIL_SPIN = Math.PI * 2;

/** Und dasselbe für die Kippung, über die ganze Höhe. */
export const DETAIL_TILT = Math.PI;

/**
 * **Wie weit gekippt werden darf** — gut achtzig Grad nach oben wie nach
 * unten.
 *
 * Nicht bis neunzig: Genau über dem Modell fällt die Blickrichtung mit der
 * Hochachse zusammen, und dann springt die Ansicht um ihre eigene Achse. Der
 * Rest von zehn Grad kostet nichts und erspart das.
 */
export const DETAIL_TILT_MAX = 1.45;

/** Die Lage der Vorschau: Drehung um die Hochachse, Kippung, Zoom. */
export interface DetailPose {
  readonly yaw: number;
  readonly pitch: number;
  readonly zoom: number;
}

/** Wie das Modell steht, bevor jemand es angefasst hat. */
export const DETAIL_POSE: DetailPose = { yaw: 0.5, pitch: 0.25, zoom: 1 };

/**
 * **Ein Wisch** — waagerecht dreht, senkrecht kippt.
 *
 * `dx`/`dy` sind die Bildpunkte seit dem letzten Ereignis, `width`/`height`
 * die der Vorschau. Gerechnet wird in Anteilen der Fläche und nicht in
 * Bildpunkten: Dieselbe Geste soll am Telefon und am Schreibtisch dasselbe
 * tun.
 */
export function detailDrag(
  pose: DetailPose,
  dx: number,
  dy: number,
  width: number,
  height: number,
): DetailPose {
  const across = width > 0 ? dx / width : 0;
  const along = height > 0 ? dy / height : 0;
  return {
    yaw: wrap(pose.yaw + across * DETAIL_SPIN),
    pitch: clampTilt(pose.pitch + along * DETAIL_TILT),
    zoom: pose.zoom,
  };
}

/** Die Grenzen des Zooms: halb so groß bis dreimal so groß. */
export const DETAIL_ZOOM_MIN = 0.5;
export const DETAIL_ZOOM_MAX = 3;

/**
 * **Zoomen um einen Faktor** — das Kneifen gibt ihn als Verhältnis zweier
 * Fingerabstände, das Rad als Stufe (`core/wheelZoom.ts`).
 *
 * Ein Faktor, der keiner ist (null, negativ, `NaN`), lässt den Zoom stehen:
 * Ein Kneifen, bei dem zwei Finger im selben Punkt liegen, ist keine
 * Entscheidung.
 */
export function detailZoom(pose: DetailPose, factor: number): DetailPose {
  if (!Number.isFinite(factor) || factor <= 0) return pose;
  return { yaw: pose.yaw, pitch: pose.pitch, zoom: clampZoom(pose.zoom * factor) };
}

export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return 1;
  return Math.min(Math.max(zoom, DETAIL_ZOOM_MIN), DETAIL_ZOOM_MAX);
}

export function clampTilt(pitch: number): number {
  if (!Number.isFinite(pitch)) return 0;
  return Math.min(Math.max(pitch, -DETAIL_TILT_MAX), DETAIL_TILT_MAX);
}

/** Die Drehung bleibt in einem Umlauf — sonst wüchse sie mit jedem Wisch. */
function wrap(yaw: number): number {
  if (!Number.isFinite(yaw)) return 0;
  const turn = Math.PI * 2;
  return ((yaw % turn) + turn) % turn;
}
