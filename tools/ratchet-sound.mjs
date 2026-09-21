/**
 * **Die Ratsche der Wasserpumpenzange** — gerechnet und nicht gesammelt.
 *
 *   node tools/ratchet-sound.mjs > /tmp/ratchet.wav
 *   ffmpeg -i /tmp/ratchet.wav -ac 1 -ar 44100 -c:a libvorbis -q:a 3 \
 *     public/audio/kitchen/ratchet.ogg
 *
 * Jede andere Aufnahme dieser Küche ist gefunden: CC0 von OpenGameArt oder
 * von Kenney, nachgeschnitten und in der `CREDITS.md` daneben genannt. Diese
 * eine ist **gebaut**, und das hat einen Grund: Eine Knarre klingt nach
 * nichts als einer Folge sehr kurzer metallischer Anschläge, und genau das
 * ist leichter zu rechnen als zu finden — in den CC0-Sammlungen, aus denen
 * der Rest kommt, liegt keine.
 *
 * Wie sie gebaut ist, steht unten in den Zahlen; was sie sein soll, steht
 * hier: **zwei Gruppen zu je sechs Zähnen und dazwischen die Pause, in der
 * die Hand zurückgeht.** Das ist der Takt, an dem man eine Ratsche erkennt,
 * und er ist der Grund, warum die Datei 1,24 s lang ist und nicht 0,2 —
 * abgespielt wird sie als Schleife, solange repariert wird
 * (`kitchenSound.KITCHEN_CUES.ratchet`), und eine Schleife aus einem
 * einzelnen Klick wäre ein Wecker.
 *
 * **Die Datei gehört ins Repository.** Dieses Werkzeug ist ihre Quelle und
 * nicht ihr Bauschritt: Ein Build, der einen Tonsynthesizer braucht, ist ein
 * Build, der irgendwann anders klingt.
 */

const SR = 44100;
/** Wie lang die Schleife ist, in Sekunden — zwei Gruppen und zwei Pausen. */
const LOOP = 1.24;
/** Wo die beiden Gruppen anfangen. */
const GROUPS = [0.02, 0.64];
/** Und wo darin die sechs Zähne sitzen — rund 30 ms auseinander. */
const TEETH = [0.0, 0.034, 0.066, 0.099, 0.131, 0.164];
/**
 * Die vier Teiltöne eines Zahns: Frequenz, Anteil, Abklingzeit in Sekunden.
 * Gemessen an nichts — gehört: ein Sperrklinke auf Blech ist hell, kurz und
 * hat keinen Grundton, den man singen könnte.
 */
const PARTIALS = [
  [2180, 1.0, 0.0045],
  [3310, 0.7, 0.0038],
  [5170, 0.45, 0.0028],
  [7430, 0.28, 0.002],
];
/** Spitzenpegel der fertigen Datei, in dBFS — wie bei jeder anderen Schleife. */
const PEAK_DB = -3.5;

/**
 * **Ein fester Würfel.** Die Datei liegt im Repository, also muss zweimal
 * dasselbe herauskommen: Ein Lauf, der jedes Mal anders klingt, ist kein
 * Werkzeug, sondern eine Überraschung.
 */
function dice(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** Ein Zahn: ein Rauschstoß von gut einer Millisekunde und sein Nachklang. */
function tooth(random, pitch, level, seconds = 0.03) {
  const count = Math.round(SR * seconds);
  const out = new Float64Array(count);
  const burst = Math.round(SR * 0.0012);
  let last = 0;
  for (let i = 0; i < count; i++) {
    const t = i / SR;
    let value = 0;
    for (const [frequency, weight, decay] of PARTIALS) {
      value += weight * Math.sin(2 * Math.PI * frequency * pitch * t) * Math.exp(-t / decay);
    }
    if (i < burst) {
      // Das Rauschen wird **differenziert** und damit hochpassig: Ein
      // Anschlag auf Blech hat keinen Bass, und ohne diesen Schritt klingt
      // der Stoß nach einem Schlag auf Pappe.
      const noise = random() * 2 - 1;
      value += 0.9 * (noise - last) * Math.exp(-t / 0.0008);
      last = noise;
    }
    out[i] = value * level;
  }
  return out;
}

function build() {
  const random = dice(20260921);
  const buffer = new Float64Array(Math.round(SR * LOOP));
  for (const base of GROUPS) {
    for (let k = 0; k < TEETH.length; k++) {
      // Jeder Zahn sitzt ein wenig anders und klingt ein wenig anders — sechs
      // exakt gleiche Klicks klingen nach Maschine und nicht nach Hand.
      const jitter = (random() - 0.5) * 0.008;
      const pitch = 1 + (random() - 0.5) * 0.1;
      const level = (0.85 + 0.15 * random()) * (k === 0 ? 1.15 : 1);
      const part = tooth(random, pitch, level);
      const start = Math.round((base + TEETH[k] + jitter) * SR);
      for (let i = 0; i < part.length; i++) {
        const at = start + i;
        if (at >= 0 && at < buffer.length) buffer[at] += part[i];
      }
    }
  }
  let peak = 0;
  for (const value of buffer) peak = Math.max(peak, Math.abs(value));
  const gain = (10 ** (PEAK_DB / 20) / (peak || 1)) * 32767;
  return buffer.map((value) => Math.max(-32767, Math.min(32767, Math.round(value * gain))));
}

/** Mono, 16 bit, 44,1 kHz — den Rest macht ffmpeg (siehe oben). */
function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) data.writeInt16LE(samples[i], i * 2);
  const head = Buffer.alloc(44);
  head.write('RIFF', 0);
  head.writeUInt32LE(36 + data.length, 4);
  head.write('WAVE', 8);
  head.write('fmt ', 12);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(1, 22);
  head.writeUInt32LE(SR, 24);
  head.writeUInt32LE(SR * 2, 28);
  head.writeUInt16LE(2, 32);
  head.writeUInt16LE(16, 34);
  head.write('data', 36);
  head.writeUInt32LE(data.length, 40);
  return Buffer.concat([head, data]);
}

process.stdout.write(wav(build()));
