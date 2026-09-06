/**
 * Die Aufnahme im Eingaberaum: dass eine gleichmäßige Bewegung *keine*
 * Beschleunigung ist, dass ein Ruck eine ist, und dass eine Marke den Wert
 * festhält, den sie in dem Moment vorfindet.
 */
import {
  AccelMeter,
  AccelRecording,
  G,
  MARKS_SHOWN,
  formatAccel,
  recordLines,
} from './accelRecord';

const FRAME = 1 / 72;

/** Eine Hand, die `seconds` lang mit `speed` m/s geradeaus fährt. */
function glide(meter: AccelMeter, speed: number, seconds: number, from = 0): number {
  let z = from;
  for (let i = 0; i < Math.round(seconds / FRAME); i++) {
    z -= speed * FRAME;
    meter.feed({ x: 0, y: 0, z }, FRAME, 0);
  }
  return z;
}

describe('das Messwerk', () => {
  it('zählt eine gleichmäßige Bewegung nicht als Beschleunigung', () => {
    const meter = new AccelMeter();
    glide(meter, 2, 1);
    expect(meter.now).toBeLessThan(0.5);
    expect(meter.peak).toBeLessThan(2);
  });

  it('misst den Ruck, wenn aus Stillstand ein Tempo wird', () => {
    const meter = new AccelMeter();
    // Eine halbe Sekunde stehen, dann 4 m/s: das ist ein kräftiger Ruck.
    for (let i = 0; i < 36; i++) meter.feed({ x: 0, y: 0, z: 0 }, FRAME, 0);
    glide(meter, 4, 0.5);
    expect(meter.peak).toBeGreaterThan(10);
    // Und nach dem Ruck fällt der laufende Wert wieder auf die Ruhe zurück.
    expect(meter.now).toBeLessThan(meter.peak);
  });

  it('merkt sich, wann der Gipfel war', () => {
    const meter = new AccelMeter();
    for (let i = 0; i < 10; i++) meter.feed({ x: 0, y: 0, z: 0 }, FRAME, i * FRAME);
    let z = 0;
    for (let i = 0; i < 30; i++) {
      z -= 5 * FRAME;
      meter.feed({ x: 0, y: 0, z }, FRAME, 3 + i * FRAME);
    }
    expect(meter.peakAt).toBeGreaterThanOrEqual(3);
  });

  it('fängt nach einem Reset bei null an', () => {
    const meter = new AccelMeter();
    glide(meter, 6, 0.5);
    meter.reset();
    expect(meter.peak).toBe(0);
    expect(meter.now).toBe(0);
  });
});

describe('die Aufnahme', () => {
  function record(): AccelRecording {
    return new AccelRecording();
  }

  it('hält eine Marke mit dem Wert fest, den die Hand gerade misst', () => {
    const recording = record();
    let z = 0;
    for (let i = 0; i < 40; i++) {
      recording.tick(FRAME);
      z -= 5 * FRAME;
      recording.feed('right', { x: 0, y: 0, z }, FRAME);
      recording.feed('left', null, FRAME);
    }
    const mark = recording.mark('right');
    expect(mark.index).toBe(1);
    expect(mark.hand).toBe('right');
    expect(mark.value).toBeCloseTo(recording.meter('right').now, 9);
    expect(mark.at).toBeCloseTo(recording.elapsed, 9);
  });

  it('nennt die Hand, in der der größte Wert stand', () => {
    const recording = record();
    let z = 0;
    for (let i = 0; i < 60; i++) {
      recording.tick(FRAME);
      recording.feed('right', { x: 0, y: 0, z: 0 }, FRAME);
      z -= 7 * FRAME;
      recording.feed('left', { x: 0, y: 0, z }, FRAME);
    }
    const peak = recording.peak();
    expect(peak.hand).toBe('left');
    expect(peak.value).toBeGreaterThan(recording.meter('right').peak);
  });

  it('vergisst eine Hand, die aus dem Tracking fällt', () => {
    const recording = record();
    let z = 0;
    for (let i = 0; i < 30; i++) {
      recording.tick(FRAME);
      z -= 4 * FRAME;
      recording.feed('right', { x: 0, y: 0, z }, FRAME);
    }
    recording.feed('right', null, FRAME);
    expect(recording.meter('right').peak).toBe(0);
  });
});

describe('was auf der Tafel steht', () => {
  it('erklärt den Knopf, solange nichts aufgenommen wurde', () => {
    const text = recordLines(null, null);
    expect(text).toContain('Start');
    expect(text).toContain('Marke');
  });

  it('schreibt Zahlen in m/s² und in g', () => {
    expect(formatAccel(2 * G)).toBe('19.6 m/s² · 2.0 g');
  });

  it('zeigt höchstens die jüngsten Marken, die jüngste zuerst', () => {
    const recording = new AccelRecording();
    for (let i = 0; i < MARKS_SHOWN + 2; i++) {
      recording.tick(1);
      recording.mark('right');
    }
    const lines = recordLines(recording, null).split('\n');
    const marks = lines.filter((line) => line.startsWith('Marke'));
    expect(marks).toHaveLength(MARKS_SHOWN);
    expect(marks[0]).toContain(`Marke ${MARKS_SHOWN + 2}`);
    // Läuft sie noch, steht der laufende Wert dabei; danach nicht mehr.
    expect(lines[0]).toContain('läuft');
    expect(recordLines(null, recording).split('\n')[0]).toContain('beendet');
  });

  it('bleibt bei kurzen Zeilen — die Tafel ist schmal', () => {
    const recording = new AccelRecording();
    recording.tick(12.345);
    recording.feed('right', { x: 0, y: 0, z: 0 }, FRAME);
    recording.feed('right', { x: 0, y: 0, z: -0.1 }, FRAME);
    recording.mark('right');
    for (const line of recordLines(recording, null).split('\n')) {
      expect(line.length).toBeLessThanOrEqual(44);
    }
  });
});
