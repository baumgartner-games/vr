import {
  type GraphicsMode,
  DEFAULT_GRAPHICS,
  GRAPHICS_MODES,
  XR_SCALES,
  clampGraphics,
  clearGraphics,
  graphics,
  graphicsProfile,
  graphicsSummary,
  nextGraphicsMode,
  nextXrScale,
  onGraphicsChange,
  saveGraphics,
} from './graphicsSettings';

describe('Grafikeinstellungen', () => {
  it('liefert das Bild von vorher aus', () => {
    expect(DEFAULT_GRAPHICS).toEqual({ mode: 'simple', xrScale: 1 });
  });

  /**
   * **Der eine Regler für die Brille.** Weniger Bildpunkte sind auf einer Quest
   * das, was immer zieht; der Auslieferungszustand bleibt trotzdem der volle
   * Vorschlag der Brille — wer nichts einstellt, sieht dasselbe Bild.
   */
  it('kennt drei Rasten für die Auflösung der Brille und rechnet sie in den Puffer', () => {
    expect([...XR_SCALES]).toEqual([1, 0.85, 0.7]);
    expect(nextXrScale(1)).toBe(0.85);
    expect(nextXrScale(0.85)).toBe(0.7);
    expect(nextXrScale(0.7)).toBe(1);
    expect(graphicsProfile({ mode: 'simple', xrScale: 0.7 }).framebufferScale).toBeCloseTo(0.7);
    // Auch der Comic wird damit flüssiger — beides multipliziert sich.
    expect(graphicsProfile({ mode: 'comic', xrScale: 0.7 }).framebufferScale).toBeCloseTo(0.84);
    expect(clampGraphics({ xrScale: 0.5 as never })).toEqual(DEFAULT_GRAPHICS);
    expect(clampGraphics({ xrScale: 0.85 })).toEqual({ mode: 'simple', xrScale: 0.85 });
    expect(graphicsSummary({ mode: 'simple', xrScale: 0.85 })).toBe('Einfach · Brille Mittel');
  });

  it('kennt zwei Stufen und keine dritte', () => {
    expect([...GRAPHICS_MODES]).toEqual(['simple', 'comic']);
  });

  it('macht aus Unsinn den Auslieferungszustand', () => {
    expect(clampGraphics(undefined)).toEqual(DEFAULT_GRAPHICS);
    expect(clampGraphics({ mode: 'hübsch' as never })).toEqual(DEFAULT_GRAPHICS);
  });

  it('holt einen gespeicherten Stand aus der abgeschafften Stufe heraus', () => {
    // „Schön" stand einmal zwischen den beiden. Wer sie zuletzt anhatte, hat
    // sie noch im Speicher stehen — und bekommt das Bild von vorher.
    expect(clampGraphics({ mode: 'fancy' as never })).toEqual(DEFAULT_GRAPHICS);
    // Dasselbe für den Schalter daneben, den es auch nicht mehr gibt: Er wird
    // gelesen, aber nicht übernommen.
    expect(clampGraphics({ textures: true } as never)).toEqual(DEFAULT_GRAPHICS);
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
    const profile = graphicsProfile({ mode: 'simple', xrScale: 1 });
    expect(profile.shadows).toBe(false);
    expect(profile.framebufferScale).toBe(1);
    expect(profile.foveation).toBe(1);
    expect(profile.ambientScale).toBe(1);
    expect(profile.outlines).toBe(false);
    expect(profile.toonBands).toBe(0);
  });

  it('zeichnet im Comic Konturen, Stufen und Schatten', () => {
    const profile = graphicsProfile({ mode: 'comic', xrScale: 1 });
    expect(profile.outlines).toBe(true);
    expect(profile.toonBands).toBeGreaterThan(1);
    expect(profile.outlineWidth).toBeGreaterThan(0);
    // Ohne Schatten schwebt in einer Zeichnung alles.
    expect(profile.shadows).toBe(true);
    expect(profile.framebufferScale).toBeGreaterThan(1);
    expect(profile.foveation).toBeLessThan(1);
    // Die Schattenkarte muss den Spieler umgeben und dabei vor die Sonne
    // passen — sonst steht er außerhalb seines eigenen Schattens.
    expect(profile.shadowDistance).toBeGreaterThan(profile.shadowRange);
  });

  it('schreibt die Stufe in eine Zeile', () => {
    expect(graphicsSummary({ mode: 'comic', xrScale: 1 })).toBe('Comic');
    expect(graphicsSummary({ mode: 'simple', xrScale: 1 })).toBe('Einfach');
  });

  it('überlebt einen Speicher, den es nicht gibt', () => {
    // Kein localStorage im Node-Testlauf: gelesen wird trotzdem, gespeichert
    // auch, und zurück kommt, was angekommen wäre.
    expect(graphics()).toEqual(DEFAULT_GRAPHICS);
    expect(saveGraphics({ mode: 'comic' })).toEqual({ mode: 'comic', xrScale: 1 });
    expect(clearGraphics()).toEqual(DEFAULT_GRAPHICS);
  });

  it('sagt Bescheid, wenn sich etwas ändert', () => {
    // Daran hängt alles Sichtbare: Der Renderer stellt sich erst um, wenn er
    // von der Änderung erfährt.
    const seen: number[] = [];
    const stop = onGraphicsChange(() => seen.push(1));
    saveGraphics({ mode: 'comic' });
    saveGraphics({ mode: 'simple' });
    stop();
    saveGraphics({ mode: 'comic' });
    expect(seen).toHaveLength(2);
  });
});
