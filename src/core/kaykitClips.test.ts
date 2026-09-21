import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  KAYKIT_CLIP_FILES,
  KAYKIT_LARGE_RIG,
  clipLabel,
  clipList,
  kaykitClipFiles,
  kaykitRigOf,
} from './kaykitClips';

/**
 * **Die Bewegungen der Figuren** (`core/kaykitClips.ts`).
 *
 * Zwei Dinge können hier still schiefgehen, und beide sieht man erst im
 * offenen Auswahlfeld: ein Pfad, der sich verschreibt (dann ist das Feld
 * leer), und eine Figur, der das falsche Skelett zugeordnet wird (dann
 * zappelt sie). Also wird beides nachgerechnet — der Pfad gegen die
 * wirklichen Dateien, die Zuordnung gegen die gemessenen Höhen.
 */
describe('Welches Skelett eine Figur hat', () => {
  it('entscheidet an der Höhe und nicht am Namen', () => {
    // Gemessen in der Sammlung, in den Maßen der Quelle: Mannequin_Medium
    // 2,20 · Ritter 2,54 · Skelett-Krieger 2,59.
    expect(kaykitRigOf(2.2)).toBe('medium');
    expect(kaykitRigOf(2.543)).toBe('medium');
    // Und das große: Mannequin_Large 3,98 · Barbar 4,14 · Skelett-Golem 4,23 ·
    // Frostgolem 4,16. Die beiden letzten tragen kein `_Large` im Namen —
    // genau deshalb entscheidet hier die Höhe.
    expect(kaykitRigOf(3.98)).toBe('large');
    expect(kaykitRigOf(4.228)).toBe('large');
    expect(kaykitRigOf(4.16)).toBe('large');
  });

  it('legt die Grenze in die Lücke zwischen beiden', () => {
    expect(KAYKIT_LARGE_RIG).toBeGreaterThan(2.6);
    expect(KAYKIT_LARGE_RIG).toBeLessThan(3.98);
  });

  it('nimmt für Unsinn das kleine Skelett', () => {
    expect(kaykitRigOf(Number.NaN)).toBe('medium');
    expect(kaykitRigOf(0)).toBe('medium');
  });

  it('gibt zu jeder Höhe Dateien her', () => {
    expect(kaykitClipFiles(2.5)).toBe(KAYKIT_CLIP_FILES.medium);
    expect(kaykitClipFiles(4.2)).toBe(KAYKIT_CLIP_FILES.large);
  });
});

/**
 * **Die Tabelle gegen die Platte.** Ein Pfad, der nicht stimmt, fällt sonst
 * nirgends auf: Der Lader holt ins Leere, fängt den Fehlschlag ab (so soll er
 * es), und das Auswahlfeld bleibt leer. Fehlen die gekauften Pakete ganz, ist
 * das kein Fehler, sondern ein gewöhnlicher Checkout — dieselbe Regel wie beim
 * Maßstab (`kaykitFit.test.ts`).
 */
describe('Die Dateien mit den Bewegungen', () => {
  it('liegen wirklich im Regal — und bringen Idle und Running mit', () => {
    for (const [rig, files] of Object.entries(KAYKIT_CLIP_FILES)) {
      expect(files.length).toBeGreaterThan(0);
      const names: string[] = [];
      for (const file of files) {
        const glb = readGlb(file);
        if (!glb) return; // Kein Regal auf dieser Platte: nichts zu prüfen.
        names.push(...(glb.animations ?? []).map((clip) => clip.name ?? ''));
      }
      // Wonach gefragt wurde: „Idle, Running, was diese eben noch so anbieten".
      expect(names.some((name) => name.startsWith('Idle'))).toBe(true);
      expect(names.some((name) => name.startsWith('Running'))).toBe(true);
      expect(clipList(names).length).toBeGreaterThan(4);
      expect(rig === 'medium' || rig === 'large').toBe(true);
    }
  });
});

describe('Wie eine Bewegung im Feld heißt', () => {
  it('macht aus Unterstrichen Leerzeichen und lässt den Rest stehen', () => {
    expect(clipLabel('Idle_A')).toBe('Idle A');
    expect(clipLabel('Melee_1H_Slash')).toBe('Melee 1H Slash');
    // Der Bindestrich bleibt: `T Pose` wäre eine Korrektur, um die niemand
    // gebeten hat.
    expect(clipLabel('T-Pose')).toBe('T-Pose');
    expect(clipLabel('')).toBe('');
  });
});

describe('Die Liste fürs Auswahlfeld', () => {
  it('wirft Leeres und Doppeltes weg und sortiert nach Namen', () => {
    expect(clipList(['Running_A', 'Idle_B', 'Idle_A', 'Idle_A', '  ', 'T-Pose'])).toEqual([
      'Idle_A',
      'Idle_B',
      'Running_A',
      'T-Pose',
    ]);
  });

  it('zählt Zahlen als Zahlen', () => {
    expect(clipList(['Idle_10', 'Idle_2'])).toEqual(['Idle_2', 'Idle_10']);
  });

  it('kommt mit nichts zurecht', () => {
    expect(clipList([])).toEqual([]);
  });
});

/** Der JSON-Teil einer `.glb` — oder `null`, wenn die Datei nicht da ist. */
function readGlb(path: string): { animations?: { name?: string }[] } | null {
  try {
    const file = join(process.cwd(), 'public', 'models', 'kaykit', path);
    const buffer = readFileSync(file);
    // glTF-Binär: zwölf Byte Kopf, dann je Stück vier Byte Länge und vier Byte
    // Art. Das erste Stück ist immer der JSON-Teil.
    const length = buffer.readUInt32LE(12);
    return JSON.parse(buffer.subarray(20, 20 + length).toString('utf8')) as {
      animations?: { name?: string }[];
    };
  } catch {
    return null;
  }
}
