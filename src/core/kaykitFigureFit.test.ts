import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { KAYKIT_CLIP_FILES } from './kaykitClips';
import { KAYKIT_FIGURE_SCALE } from './kaykitFit';
import {
  FIGURE_ACTIONS,
  FIGURE_BONES,
  FIGURE_FACING,
  GAIT_CLIPS,
  GAIT_RUN,
  GAIT_STILL,
  figureBoneName,
  figureScale,
  gaitFor,
  pickClip,
} from './kaykitFigureFit';

/**
 * **Die Rechnung hinter einer laufenden Figur** (`core/kaykitFigureFit.ts`).
 *
 * Zwei Sorten Fehler stecken darin, und beide sieht man nicht im Code, sondern
 * erst in der Brille: eine Schwelle, die die NPCs rennen lässt, obwohl sie
 * gehen — und ein **Name**, den es gar nicht gibt. Das eine wird gegen die
 * wirklichen Tempi dieses Spiels gerechnet, das andere gegen die wirklichen
 * Dateien: Der JSON-Teil einer `.glb` steht unverpackt in der Datei, auch wenn
 * alles andere darin `EXT_meshopt_compression` ist.
 */
describe('Der Gang aus dem Tempo', () => {
  it('lässt die NPCs gehen und die Bots der Station laufen', () => {
    // `worlds/npc/npcKinds.ts`: 1,1 · 1,5 · 1,8 m/s — das sind Fußgänger.
    expect(gaitFor(1.1)).toBe('walk');
    expect(gaitFor(1.5)).toBe('walk');
    expect(gaitFor(1.8)).toBe('walk');
    // `worlds/haunting/mission.ts`: Trab 4,94 × 0,72 = 3,56 m/s, Sprint 4,94.
    expect(gaitFor(3.56)).toBe('run');
    expect(gaitFor(4.94)).toBe('run');
  });

  it('lässt einen Stehenden stehen — auch mit Millimetern aus der Wegsuche', () => {
    expect(gaitFor(0)).toBe('idle');
    expect(gaitFor(0.02)).toBe('idle');
    expect(gaitFor(GAIT_STILL)).toBe('walk');
  });

  it('nimmt den Betrag: rückwärts gehen ist gehen', () => {
    expect(gaitFor(-1.2)).toBe('walk');
    expect(gaitFor(-3.6)).toBe('run');
  });

  it('lässt Unsinn stehen', () => {
    expect(gaitFor(Number.NaN)).toBe('idle');
    expect(gaitFor(Number.POSITIVE_INFINITY)).toBe('idle');
  });

  it('legt die Schwelle zwischen die beiden Tempi dieses Spiels', () => {
    expect(GAIT_RUN).toBeGreaterThan(1.8);
    expect(GAIT_RUN).toBeLessThan(3.56);
  });
});

describe('Der erste Name, den es gibt', () => {
  it('folgt der Wunschliste und nicht dem Vorrat', () => {
    expect(pickClip(['Running_B', 'Running_A'], ['Running_A', 'Running_B'])).toBe('Running_A');
  });

  it('nimmt den nächsten, wenn der erste fehlt', () => {
    expect(pickClip(['Walking_A'], GAIT_CLIPS.run)).toBe('Walking_A');
  });

  it('gibt `null` her, wenn nichts passt', () => {
    expect(pickClip(['T-Pose'], GAIT_CLIPS.walk)).toBeNull();
    expect(pickClip([], GAIT_CLIPS.idle)).toBeNull();
  });
});

describe('Der Maßstab über dem Paketmaßstab', () => {
  it('bringt das Mannequin auf die erklärte Höhe', () => {
    // Nachgemessen im Browser: Quelle 2,2037, mit 0,7 also 1,5426 m.
    const factor = figureScale(2.2037, KAYKIT_FIGURE_SCALE, 1.7);
    expect(2.2037 * KAYKIT_FIGURE_SCALE * factor).toBeCloseTo(1.7, 6);
    expect(factor).toBeCloseTo(1.1021, 3);
  });

  it('lässt eine Figur, die schon stimmt, in Ruhe', () => {
    expect(figureScale(2.2037, KAYKIT_FIGURE_SCALE, 2.2037 * KAYKIT_FIGURE_SCALE)).toBeCloseTo(
      1,
      9,
    );
  });

  it('nimmt für Unsinn die Eins und nicht Unendlich', () => {
    expect(figureScale(0, 0.7, 1.7)).toBe(1);
    expect(figureScale(2.2, 0, 1.7)).toBe(1);
    expect(figureScale(2.2, 0.7, 0)).toBe(1);
    expect(figureScale(Number.NaN, 0.7, 1.7)).toBe(1);
    expect(figureScale(2.2, 0.7, Number.NaN)).toBe(1);
    expect(figureScale(-2.2, 0.7, 1.7)).toBe(1);
  });
});

describe('Wie ein Knochen im Baum heißt', () => {
  it('lässt den Punkt weg, wie es der GLTFLoader tut', () => {
    expect(figureBoneName('handslot.r')).toBe('handslotr');
    expect(figureBoneName('hand.l')).toBe('handl');
    expect(figureBoneName('head')).toBe('head');
  });

  it('macht aus Leerzeichen Unterstriche und nimmt die reservierten Zeichen weg', () => {
    expect(figureBoneName('linke Hand')).toBe('linke_Hand');
    expect(figureBoneName('a[0].b:c/d')).toBe('a0bcd');
  });
});

describe('Die Blickrichtung', () => {
  it('ist eine halbe Umdrehung — KayKit schaut nach +Z, dieses Spiel nach −Z', () => {
    expect(FIGURE_FACING).toBeCloseTo(Math.PI, 9);
  });
});

/**
 * **Die Namen gegen die Platte.** Ein Clipname, der sich verschreibt, fällt
 * sonst nirgends auf: Der Mischer findet ihn nicht, `play` gibt `null` zurück
 * — und die Figur steht mit ausgestreckten Armen im Raum. Fehlen die gekauften
 * Pakete ganz, ist das kein Fehler, sondern ein gewöhnlicher Checkout
 * (dieselbe Regel wie in `kaykitClips.test.ts` und `kaykitFit.test.ts`).
 */
describe('Die Clip- und Knochennamen der beiden Skelette', () => {
  it('geben jedem Gang und jeder Aktion eine Spur — auf beiden Skeletten', () => {
    for (const files of Object.values(KAYKIT_CLIP_FILES)) {
      const rig = readRig(files);
      if (!rig) return; // Kein Regal auf dieser Platte: nichts zu prüfen.
      for (const [gait, wanted] of Object.entries(GAIT_CLIPS)) {
        expect([gait, pickClip(rig.clips, wanted)]).not.toEqual([gait, null]);
      }
      for (const kind of ['attack', 'hit', 'death'] as const) {
        expect([kind, pickClip(rig.clips, FIGURE_ACTIONS[kind])]).not.toEqual([kind, null]);
      }
    }
  });

  it('kennen jeden Namen, der in den Listen steht — keinen Tippfehler', () => {
    const all = new Set<string>();
    for (const files of Object.values(KAYKIT_CLIP_FILES)) {
      const rig = readRig(files);
      if (!rig) return;
      for (const name of rig.clips) all.add(name);
    }
    const listed = [...Object.values(GAIT_CLIPS), ...Object.values(FIGURE_ACTIONS)].flat();
    for (const name of listed) expect([name, all.has(name)]).toEqual([name, true]);
  });

  it('tragen die Knochen, an die etwas gehängt wird', () => {
    for (const files of Object.values(KAYKIT_CLIP_FILES)) {
      const rig = readRig(files);
      if (!rig) return;
      // In der Datei mit Punkt (`handslot.r`), im Baum ohne — geprüft wird
      // beides gegeneinander.
      for (const anchor of Object.values(FIGURE_BONES)) {
        const hit = anchor.find((name) => rig.nodes.has(name));
        expect([anchor[0], hit]).not.toEqual([anchor[0], undefined]);
      }
      expect(rig.nodes.has('handslot.r')).toBe(true);
      expect([...rig.nodes].some((name) => figureBoneName(name) !== name)).toBe(true);
    }
  });

  /**
   * **Und warum hinter `handslot` noch `hand` steht**: Beim Aufbereiten fällt
   * weg, was nichts häutet (`tools/kaykit-model.mjs`), und dem Mannequin
   * fehlen die beiden Griffpunkte deshalb — anderen Figuren nicht.
   */
  it('kommen auch an einer Figur ohne `handslot` noch an eine Hand', () => {
    const nodes = glbNames(
      'character-animations/mannequin-character/characters/Mannequin_Medium.glb',
    );
    if (!nodes) return;
    expect(nodes.has('handslot.r')).toBe(false);
    expect(FIGURE_BONES.handRight.some((name) => nodes.has(name))).toBe(true);
    expect(FIGURE_BONES.handLeft.some((name) => nodes.has(name))).toBe(true);
    expect(FIGURE_BONES.head.some((name) => nodes.has(name))).toBe(true);
  });
});

/** Alle Spur- und Knotennamen eines Skeletts — oder `null` ohne die Pakete. */
function readRig(files: readonly string[]): { clips: Set<string>; nodes: Set<string> } | null {
  const clips = new Set<string>();
  const nodes = new Set<string>();
  for (const file of files) {
    const glb = readGlb(file);
    if (!glb) return null;
    for (const clip of glb.animations ?? []) if (clip.name) clips.add(clip.name);
    for (const node of glb.nodes ?? []) if (node.name) nodes.add(node.name);
  }
  return { clips, nodes };
}

/** Die Knotennamen einer einzelnen Datei — oder `null`, wenn sie fehlt. */
function glbNames(path: string): Set<string> | null {
  const glb = readGlb(path);
  if (!glb) return null;
  const nodes = new Set<string>();
  for (const node of glb.nodes ?? []) if (node.name) nodes.add(node.name);
  return nodes;
}

/**
 * Der JSON-Teil einer `.glb` — oder `null`, wenn die Datei nicht da ist.
 *
 * Dieselben zwanzig Byte wie in `kaykitClips.test.ts`: zwölf Byte Kopf, dann
 * je Stück vier Byte Länge und vier Byte Art; das erste Stück ist der
 * JSON-Teil. Die Netze darin sind gepackt, die **Namen** sind es nicht — und
 * mehr will dieser Test nicht wissen.
 */
function readGlb(
  path: string,
): { animations?: { name?: string }[]; nodes?: { name?: string }[] } | null {
  try {
    const file = join(process.cwd(), 'public', 'models', 'kaykit', path);
    const buffer = readFileSync(file);
    const length = buffer.readUInt32LE(12);
    return JSON.parse(buffer.subarray(20, 20 + length).toString('utf8')) as {
      animations?: { name?: string }[];
      nodes?: { name?: string }[];
    };
  } catch {
    return null;
  }
}
