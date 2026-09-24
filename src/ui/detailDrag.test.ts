import {
  DETAIL_GUTTER,
  DETAIL_GUTTER_MAX,
  DETAIL_POSE,
  DETAIL_TILT_MAX,
  DETAIL_ZOOM_MAX,
  DETAIL_ZOOM_MIN,
  clampTilt,
  clampZoom,
  detailDrag,
  detailGutter,
  detailZone,
  detailZoom,
} from './detailDrag';

/**
 * **Die Gesten der großen Vorschau** (`ui/detailDrag.ts`).
 *
 * Hier hängt etwas dran, das man sonst erst am Telefon merkt: Ein Wisch über
 * der Vorschau kann zwei Dinge meinen — das Modell drehen oder die Seite
 * weiterlesen —, und wenn die Grenze dazwischen nicht stimmt, kommt man aus
 * der Seite nicht mehr heraus. Genau diese Grenze steht hier als Zahl und wird
 * nachgerechnet.
 */
describe('Wem ein Finger auf der Vorschau gehört', () => {
  it('gibt die Mitte dem Modell und den Saum dem Scrollen', () => {
    // Ein Telefon: 390 Punkte, Saum 54,6 — links und rechts.
    expect(detailZone(10, 390)).toBe('scroll');
    expect(detailZone(195, 390)).toBe('rotate');
    expect(detailZone(380, 390)).toBe('scroll');
  });

  it('legt die Grenze genau dorthin, wo der Saum aufhört', () => {
    const gutter = detailGutter(390);
    expect(gutter).toBeCloseTo(390 * DETAIL_GUTTER, 6);
    expect(detailZone(gutter - 0.01, 390)).toBe('scroll');
    expect(detailZone(gutter + 0.01, 390)).toBe('rotate');
  });

  it('lässt den Saum am Schreibtisch nicht mitwachsen', () => {
    // 1400 Punkte mal 0,14 wären 196 — zweimal fast eine Handbreit für nichts.
    expect(detailGutter(1400)).toBe(DETAIL_GUTTER_MAX);
    expect(detailZone(100, 1400)).toBe('rotate');
  });

  it('gehört einem Kasten ohne Breite dem Scrollen', () => {
    expect(detailZone(0, 0)).toBe('scroll');
    expect(detailZone(Number.NaN, 390)).toBe('scroll');
    expect(detailGutter(0)).toBe(0);
  });

  it('lässt dem Modell immer die Mitte, wie schmal es auch wird', () => {
    // Der Saum ist ein **Anteil** und kann deshalb nie die ganze Fläche
    // auffressen: 28 % gehen weg, 72 % bleiben — auch auf zwanzig Punkten.
    expect(detailZone(10, 20)).toBe('rotate');
    expect(detailGutter(20) * 2).toBeLessThan(20);
  });
});

describe('Ein Wisch über der Vorschau', () => {
  it('dreht waagerecht eine ganze Umdrehung über die Breite', () => {
    const turned = detailDrag({ yaw: 0, pitch: 0, zoom: 1 }, 390, 0, 390, 800);
    // Eine volle Umdrehung landet wieder bei null — gerechnet wird modulo 2π.
    expect(turned.yaw).toBeCloseTo(0, 6);
    const half = detailDrag({ yaw: 0, pitch: 0, zoom: 1 }, 195, 0, 390, 800);
    expect(half.yaw).toBeCloseTo(Math.PI, 6);
  });

  it('dreht das Modell mit dem Finger — die Kamera wandert dafür dagegen', () => {
    // Nach rechts gewischt, wird der Kamerawinkel kleiner: So dreht sich das
    // Modell nach rechts mit. Vorher war es genau andersherum (gemeldet).
    const right = detailDrag({ yaw: 1, pitch: 0, zoom: 1 }, 20, 0, 390, 800);
    expect(right.yaw).toBeLessThan(1);
  });

  it('kippt senkrecht und hält dabei an', () => {
    const up = detailDrag({ yaw: 0, pitch: 0, zoom: 1 }, 0, 4000, 390, 800);
    expect(up.pitch).toBe(DETAIL_TILT_MAX);
    const down = detailDrag({ yaw: 0, pitch: 0, zoom: 1 }, 0, -4000, 390, 800);
    expect(down.pitch).toBe(-DETAIL_TILT_MAX);
    // Nicht bis senkrecht: Dort fiele der Blick mit der Hochachse zusammen.
    expect(DETAIL_TILT_MAX).toBeLessThan(Math.PI / 2);
  });

  it('lässt den Zoom in Ruhe', () => {
    expect(detailDrag(DETAIL_POSE, 50, 50, 390, 800).zoom).toBe(DETAIL_POSE.zoom);
  });

  it('bleibt bei einer Fläche ohne Maß stehen', () => {
    const same = detailDrag(DETAIL_POSE, 30, 30, 0, 0);
    expect(same.yaw).toBeCloseTo(DETAIL_POSE.yaw, 6);
    expect(same.pitch).toBeCloseTo(DETAIL_POSE.pitch, 6);
  });
});

describe('Kneifen und Rad', () => {
  it('zoomt um den gegebenen Faktor', () => {
    expect(detailZoom({ yaw: 0, pitch: 0, zoom: 1 }, 1.5).zoom).toBeCloseTo(1.5, 6);
  });

  it('hält an beiden Enden an', () => {
    expect(detailZoom({ yaw: 0, pitch: 0, zoom: 1 }, 100).zoom).toBe(DETAIL_ZOOM_MAX);
    expect(detailZoom({ yaw: 0, pitch: 0, zoom: 1 }, 0.001).zoom).toBe(DETAIL_ZOOM_MIN);
  });

  it('lässt einen Faktor, der keiner ist, den Zoom stehen', () => {
    const pose = { yaw: 1, pitch: 0.2, zoom: 1.4 };
    expect(detailZoom(pose, 0)).toBe(pose);
    expect(detailZoom(pose, -2)).toBe(pose);
    expect(detailZoom(pose, Number.NaN)).toBe(pose);
  });

  it('fängt kaputte Zahlen ab, statt sie weiterzureichen', () => {
    expect(clampZoom(Number.NaN)).toBe(1);
    expect(clampTilt(Number.NaN)).toBe(0);
  });
});
