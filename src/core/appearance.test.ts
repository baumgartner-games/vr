import {
  DEFAULT_APPEARANCE,
  appearance,
  appearanceSummary,
  clampAppearance,
  onAppearanceChange,
  saveAppearance,
} from './appearance';
import { HEADGEAR_KINDS, HEADGEAR_LABELS, asHeadgear, nextHeadgear } from './headgear';
import {
  FIGURE_CHEF,
  FIGURE_KINDS,
  FIGURE_MAX_HEIGHT,
  FIGURE_MIN_HEIGHT,
  asFigure,
  figureHeadRadius,
  figureLabel,
  figureLift,
} from './avatarFigures';
import { CHEF_EYE, CHEF_HEIGHT } from './chefFit';

describe('wie man aussieht', () => {
  it('liefert als barhäuptigen Koch in Weiß aus', () => {
    expect(DEFAULT_APPEARANCE).toEqual({
      hat: 'none',
      head: 'round',
      body: 'white',
      figure: 'chef',
    });
  });

  it('macht aus Unsinn die Vorgabe', () => {
    // Das Aussehen kommt auch über das Netz herein (`net/NetSession.ts`), und
    // was von dort kommt, ist fremder Text.
    expect(clampAppearance(undefined)).toEqual(DEFAULT_APPEARANCE);
    expect(clampAppearance({ hat: 'sombrero' as never })).toEqual(DEFAULT_APPEARANCE);
    expect(clampAppearance({ head: 'schnabel' as never, body: 'frack' as never })).toEqual(
      DEFAULT_APPEARANCE,
    );
    expect(asHeadgear(42)).toBe('none');
    expect(asHeadgear('helmet')).toBe('helmet');
  });

  it('lässt jedes Stück einzeln stehen', () => {
    expect(clampAppearance({ hat: 'chef', head: 'beard', body: 'striped' })).toEqual({
      hat: 'chef',
      head: 'beard',
      body: 'striped',
      figure: 'chef',
    });
  });

  it('kennt jede Kopfbedeckung mit Namen', () => {
    for (const kind of HEADGEAR_KINDS) expect(HEADGEAR_LABELS[kind]).toBeTruthy();
  });

  it('schaltet die Kopfbedeckungen im Kreis weiter', () => {
    let kind = HEADGEAR_KINDS[0]!;
    for (let i = 0; i < HEADGEAR_KINDS.length; i++) kind = nextHeadgear(kind);
    expect(kind).toBe(HEADGEAR_KINDS[0]);
  });

  it('kennt die Kochmütze — sie ist das Vorbild', () => {
    expect(HEADGEAR_KINDS).toContain('chef');
    expect(asHeadgear('chef')).toBe('chef');
  });

  it('schreibt alle drei Stücke in eine Zeile', () => {
    expect(appearanceSummary(DEFAULT_APPEARANCE)).toBe('Rund · ohne Hut · Kochjacke weiß');
    expect(
      appearanceSummary({ ...DEFAULT_APPEARANCE, hat: 'chef', head: 'beard', body: 'red' }),
    ).toBe('Vollbart · Kochmütze · Kochjacke rot');
  });

  it('überlebt einen Speicher, den es nicht gibt', () => {
    expect(appearance()).toEqual(DEFAULT_APPEARANCE);
    expect(saveAppearance({ hat: 'crown' })).toEqual({ ...DEFAULT_APPEARANCE, hat: 'crown' });
  });

  it('sagt Bescheid, wenn sich etwas ändert', () => {
    // Daran hängen zwei Dinge: der eigene Körper und die Ansage an alle im
    // Raum. Ohne die Meldung säße der Hut erst nach dem nächsten Weltwechsel.
    const seen: number[] = [];
    const stop = onAppearanceChange(() => seen.push(1));
    saveAppearance({ hat: 'cap' });
    saveAppearance({ head: 'freckles' });
    stop();
    saveAppearance({ body: 'green' });
    expect(seen).toHaveLength(2);
  });
});

/**
 * **Die vierte Zeile: die Figur** (`core/avatarFigures.ts`).
 *
 * Drei Dinge kann man daran falsch machen, und keines davon sieht man vor dem
 * Spiegel: eine Adresse durchlassen, die aus dem Modellordner hinausführt;
 * eine Figur so groß machen, dass ihr Kopf nicht mehr dort steht, wo alle
 * Anker ihn vermuten; und eine Liste, deren Einträge es gar nicht gibt.
 */
describe('als was man herumläuft', () => {
  it('nimmt eine Regaladresse an und wirft alles andere weg', () => {
    expect(asFigure('adventurers/characters/Knight.glb')).toBe('adventurers/characters/Knight.glb');
    expect(asFigure(FIGURE_CHEF)).toBe(FIGURE_CHEF);

    // Was hereinkommt, wird zur Adresse einer Datei — die Prüfung ist deshalb
    // keine Formsache.
    for (const bad of [
      42,
      null,
      undefined,
      { path: 'x' },
      '',
      '../../etc/passwd.glb',
      'adventurers/../../secret.glb',
      '/adventurers/characters/Knight.glb',
      'adventurers/characters/Knight.glb#frag',
      'adventurers/characters/Knight.glb?v=3',
      ' adventurers/characters/Knight.glb ',
      'adventurers/characters/Knight.gltf',
      'Knight.glb',
      `a/${'b'.repeat(400)}.glb`,
    ]) {
      expect([bad, asFigure(bad)]).toEqual([bad, FIGURE_CHEF]);
    }
  });

  it('kennt jede kuratierte Figur mit Namen und lässt sie durch die Prüfung', () => {
    expect(FIGURE_KINDS[0]!.path).toBe(FIGURE_CHEF);
    expect(FIGURE_KINDS.length).toBeGreaterThanOrEqual(10);
    for (const kind of FIGURE_KINDS) {
      expect([kind.path, asFigure(kind.path)]).toEqual([kind.path, kind.path]);
      expect(kind.label).toBeTruthy();
      expect(kind.sub).toBeTruthy();
      expect(kind.height).toBeGreaterThan(0.5);
    }
    // Nichts doppelt: Zwei Zeilen mit derselben Figur wären eine, die nichts tut.
    expect(new Set(FIGURE_KINDS.map((kind) => kind.path)).size).toBe(FIGURE_KINDS.length);
  });

  it('nennt auch eine Figur beim Namen, die nicht in der Liste steht', () => {
    // Sie kommt über die Detailseite des Regals herein, und dort heißt jede
    // Datei so, wie das Regal sie nennt (`humanLabel`).
    expect(figureLabel('adventurers/characters/Knight.glb')).toBe('Ritter');
    expect(figureLabel('mystery-monthly-5/4-october-2024-vampire/characters/Vampire.glb')).toBe(
      'Vampire',
    );
  });

  it('stellt den Kopf dorthin, wo der des Kochs steht', () => {
    // Die Höhenregel. Gemessen am Mannequin: Quelle 2,2037, mit dem
    // Paketmaßstab 0,7 steht es auf 1,5426 m, und sein Kopfknochen liegt dabei
    // auf 0,869 m. Bestellt wird es mit 1,70 m — also steht der Knochen vor
    // der Regel auf 0,869 · 1,70 / 1,5426.
    const height = 1.7;
    const headY = (0.869 * height) / 1.5426;
    const lift = figureLift(headY, height);
    expect(headY * lift).toBeCloseTo(CHEF_EYE, 6);
    // Und was dabei herauskommt, ist eine Figur in der Größe des Kochs: Die
    // KayKit-Figuren sind genauso chibi wie er.
    expect(height * lift).toBeCloseTo(1.62, 2);
  });

  it('lässt keine Figur zum Zwerg oder zum Turm werden', () => {
    // Ein Golem trägt seinen Kopf ganz oben; sein Kopfknochen auf Kochhöhe
    // wäre eine Figur von gut einem Meter.
    const golem = figureLift(2.24 * (1.7 / 2.79), 1.7);
    expect(1.7 * golem).toBeCloseTo(FIGURE_MIN_HEIGHT, 6);
    // Und andersherum genauso.
    expect(1.7 * figureLift(0.05, 1.7)).toBeCloseTo(FIGURE_MAX_HEIGHT, 6);
  });

  it('gibt bei Unsinn eine Figur her, die man ansehen kann', () => {
    // `NaN` wäre eine Figur, die aus dem Bild verschwindet — 1 ist eine, die
    // falsch dasteht und sich melden lässt.
    expect(figureLift(Number.NaN, Number.NaN)).toBe(1);
    expect(figureLift(0.9, 0)).toBe(1);
    // Ohne Kopfknochen entscheidet die Höhe.
    expect(2 * figureLift(0, 2)).toBeCloseTo(CHEF_HEIGHT, 6);
  });

  it('misst den Kopf am Kopfknochen und nicht an der Hülle', () => {
    // Der Magier hat einen Spitzhut, der Ritter einen Helmkamm — ihre Hüllen
    // sind verschieden hoch, ihr Kopf ist derselbe. Deshalb hängt der
    // Halbmesser am Knochen.
    const mage = figureHeadRadius('adventurers/characters/Mage.glb', CHEF_EYE);
    const knight = figureHeadRadius('adventurers/characters/Knight.glb', CHEF_EYE);
    expect(mage).toBeCloseTo(knight, 6);
    expect(mage).toBeGreaterThan(0.2);
    expect(mage).toBeLessThan(0.45);
    // Ohne Knochen kein Hut.
    expect(figureHeadRadius('adventurers/characters/Mage.glb', 0)).toBe(0);
  });
});
