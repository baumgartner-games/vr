import {
  type GraphicsMode,
  DEFAULT_GRAPHICS,
  GRAPHICS_MODES,
  clampGraphics,
  clearGraphics,
  graphics,
  graphicsProfile,
  graphicsSummary,
  nextGraphicsMode,
  onGraphicsChange,
  saveGraphics,
} from './graphicsSettings';

describe('Grafikeinstellungen', () => {
  it('liefert das Bild von vorher aus', () => {
    expect(DEFAULT_GRAPHICS).toEqual({ mode: 'simple', textures: false });
  });

  it('kennt drei Stufen und keine vierte', () => {
    expect([...GRAPHICS_MODES]).toEqual(['simple', 'fancy', 'comic']);
  });

  it('macht aus Unsinn den Auslieferungszustand', () => {
    expect(clampGraphics(undefined)).toEqual(DEFAULT_GRAPHICS);
    expect(clampGraphics({ mode: 'hübsch' as never })).toEqual(DEFAULT_GRAPHICS);
    expect(clampGraphics({ textures: 'ja' as never }).textures).toBe(false);
  });

  it('nimmt nur ein ausdrückliches Ja für die Texturen', () => {
    // Jeder gespeicherte Stand von gestern kennt das Feld nicht — und wer
    // nichts gesagt hat, will es aus haben.
    expect(clampGraphics({ mode: 'fancy' })).toEqual({ mode: 'fancy', textures: false });
    expect(clampGraphics({ mode: 'fancy', textures: true }).textures).toBe(true);
  });

  it('schaltet eine Stufe weiter und fängt oben wieder an', () => {
    let mode: GraphicsMode = GRAPHICS_MODES[0];
    for (const expected of [...GRAPHICS_MODES.slice(1), GRAPHICS_MODES[0]]) {
      mode = nextGraphicsMode(mode);
      expect(mode).toBe(expected);
    }
  });

  it('kostet in der einfachen Stufe nichts', () => {
    // Der ganze Sinn der unteren Stufe: Sie ist das Bild, das dieses Projekt
    // immer hatte. Jede Zahl hier ist der Wert, den `App` ohnehin setzt.
    const profile = graphicsProfile({ mode: 'simple', textures: false });
    expect(profile.shadows).toBe(false);
    expect(profile.environment).toBe(false);
    expect(profile.environmentIntensity).toBe(0);
    expect(profile.framebufferScale).toBe(1);
    expect(profile.foveation).toBe(1);
    expect(profile.detail).toBe(false);
  });

  it('zeichnet im Comic Konturen und Stufen, aber keine Spiegelungen', () => {
    const profile = graphicsProfile({ mode: 'comic', textures: false });
    expect(profile.outlines).toBe(true);
    expect(profile.toonBands).toBeGreaterThan(1);
    expect(profile.outlineWidth).toBeGreaterThan(0);
    // Eine Spiegelung ist genau das, was ein gezeichnetes Bild nicht hat.
    expect(profile.environment).toBe(false);
    // Schatten schon: Ohne sie schwebt in einer Zeichnung alles.
    expect(profile.shadows).toBe(true);
  });

  it('lässt Konturen und Stufen aus den anderen beiden Stufen heraus', () => {
    for (const mode of ['simple', 'fancy'] as const) {
      const profile = graphicsProfile({ mode, textures: false });
      expect(profile.outlines).toBe(false);
      expect(profile.toonBands).toBe(0);
    }
  });

  it('schaltet in der schönen Stufe alles an', () => {
    const profile = graphicsProfile({ mode: 'fancy', textures: false });
    expect(profile.shadows).toBe(true);
    expect(profile.environment).toBe(true);
    expect(profile.environmentIntensity).toBeGreaterThan(0);
    expect(profile.framebufferScale).toBeGreaterThan(1);
    expect(profile.foveation).toBeLessThan(1);
    // Die Schattenkarte muss den Spieler umgeben und dabei vor die Sonne
    // passen — sonst steht er außerhalb seines eigenen Schattens.
    expect(profile.shadowDistance).toBeGreaterThan(profile.shadowRange);
  });

  it('hält die Texturen von der Stufe getrennt', () => {
    // Zwei Zeilen im Menü, zwei Fragen: Körnung gibt es auch einfach, und
    // schön geht auch ohne.
    expect(graphicsProfile({ mode: 'simple', textures: true }).detail).toBe(true);
    expect(graphicsProfile({ mode: 'simple', textures: true }).shadows).toBe(false);
    expect(graphicsProfile({ mode: 'fancy', textures: false }).detail).toBe(false);
  });

  it('schreibt beides in eine Zeile', () => {
    expect(graphicsSummary({ mode: 'fancy', textures: true })).toBe('Schön · Texturen an');
    expect(graphicsSummary({ mode: 'simple', textures: false })).toBe('Einfach · Texturen aus');
  });

  it('überlebt einen Speicher, den es nicht gibt', () => {
    // Kein localStorage im Node-Testlauf: gelesen wird trotzdem, gespeichert
    // auch, und zurück kommt, was angekommen wäre.
    expect(graphics()).toEqual(DEFAULT_GRAPHICS);
    expect(saveGraphics({ mode: 'fancy' })).toEqual({ mode: 'fancy', textures: false });
    expect(clearGraphics()).toEqual(DEFAULT_GRAPHICS);
  });

  it('sagt Bescheid, wenn sich etwas ändert', () => {
    // Daran hängt alles Sichtbare: Der Renderer stellt sich erst um, wenn er
    // von der Änderung erfährt.
    const seen: number[] = [];
    const stop = onGraphicsChange(() => seen.push(1));
    saveGraphics({ textures: true });
    saveGraphics({ textures: false });
    stop();
    saveGraphics({ textures: true });
    expect(seen).toHaveLength(2);
  });
});
