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
  it('liefert das Bild von vorher aus — mit Schatten', () => {
    expect(DEFAULT_GRAPHICS).toEqual({
      mode: 'simple',
      xrScale: 1,
      showFps: false,
      gridLines: false,
      hitBoxes: false,
      showHandles: false,
      shadows: true,
      // Die Stöcke auf dem Glas entscheiden sich nach Gerät — nachgerechnet
      // wird das in `screenPads.test.ts`.
      screenPads: 'auto',
    });
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
    expect(clampGraphics({ xrScale: 0.85 })).toEqual({
      ...DEFAULT_GRAPHICS,
      xrScale: 0.85,
    });
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

  it('zeichnet in der einfachen Stufe weder Konturen noch Stufen', () => {
    // Der Sinn der unteren Stufe: flache Farben ohne Zeichnung. Was sie nicht
    // mehr ist, ist „das Bild von vorher" — Schatten gibt es jetzt auch hier,
    // und die haben ihren eigenen Schalter.
    const profile = graphicsProfile({ mode: 'simple', xrScale: 1, shadows: false });
    expect(profile.shadows).toBe(false);
    expect(profile.framebufferScale).toBe(1);
    expect(profile.foveation).toBe(1);
    expect(profile.ambientScale).toBe(1);
    expect(profile.outlines).toBe(false);
    expect(profile.toonBands).toBe(0);
  });

  /**
   * **Schatten sind ein eigener Schalter, keine Eigenschaft der Stufe.**
   *
   * Vorher hingen sie am Comic: Wer nur Schatten wollte, bekam schwarze
   * Konturen dazu, und wer die Konturen nicht wollte, bekam eine Welt, in der
   * alles einen Zentimeter über dem Boden schwebt.
   */
  it('wirft Schatten ab Werk, auch ohne Comic — und dämpft dafür das Grundlicht', () => {
    const plain = graphicsProfile({ mode: 'simple', xrScale: 1 });
    expect(plain.shadows).toBe(true);
    expect(plain.outlines).toBe(false);
    // Ein Schatten ist nur so dunkel, wie das Licht daneben hell ist.
    expect(plain.ambientScale).toBeLessThan(1);
    // Und ohne Schatten bleibt das Grundlicht, wo es war.
    expect(graphicsProfile({ mode: 'simple', xrScale: 1, shadows: false }).ambientScale).toBe(1);
    // Auch der Comic darf sie loswerden, wenn die Bildrate klemmt.
    expect(graphicsProfile({ mode: 'comic', xrScale: 1, shadows: false }).shadows).toBe(false);
  });

  /**
   * Ein gespeicherter Stand von gestern kennt das Feld nicht — und bekommt
   * Schatten, nicht das Gegenteil. Deshalb steht in `clampGraphics` an dieser
   * einen Stelle kein `=== true`.
   */
  it('gibt einem alten Speicher ohne den Schlüssel die Schatten', () => {
    expect(clampGraphics({ mode: 'simple' }).shadows).toBe(true);
    expect(clampGraphics({ shadows: false }).shadows).toBe(false);
    expect(graphicsSummary({ mode: 'simple', xrScale: 1, shadows: false })).toBe(
      'Einfach · ohne Schatten',
    );
    expect(graphicsSummary({ mode: 'simple', xrScale: 1, shadows: true })).toBe('Einfach');
  });

  it('zeichnet im Comic Konturen, Stufen und Schatten', () => {
    const profile = graphicsProfile({ mode: 'comic', xrScale: 1 });
    expect(profile.outlines).toBe(true);
    expect(profile.toonBands).toBeGreaterThan(1);
    expect(profile.outlineWidth).toBeGreaterThan(0);
    // Ohne Schatten schwebt in einer Zeichnung alles — der Schalter daneben
    // ist ab Werk an.
    expect(profile.shadows).toBe(true);
    expect(profile.framebufferScale).toBeGreaterThan(1);
    expect(profile.foveation).toBeLessThan(1);
    // Die Schattenkarte muss den Spieler umgeben und dabei vor die Sonne
    // passen — sonst steht er außerhalb seines eigenen Schattens.
    expect(profile.shadowDistance).toBeGreaterThan(profile.shadowRange);
  });

  it('merkt sich die Bildrate im Bild nur als echtes Ja', () => {
    // Das Häkchen ist ab Werk aus, und aus einem alten Speicher ohne den
    // Schlüssel wird kein Feld, das plötzlich jedem im Bild steht.
    expect(clampGraphics({ showFps: true })).toEqual({ ...DEFAULT_GRAPHICS, showFps: true });
    expect(clampGraphics({ showFps: 'ja' as never })).toEqual(DEFAULT_GRAPHICS);
  });

  it('schreibt die Stufe in eine Zeile', () => {
    expect(graphicsSummary({ mode: 'comic', xrScale: 1 })).toBe('Comic');
    expect(graphicsSummary({ mode: 'simple', xrScale: 1 })).toBe('Einfach');
  });

  /**
   * **Die Gitterlinien stehen in der Zeile nur, wenn sie an sind.**
   *
   * Eine Überschrift, die aufzählt, was alles *nicht* an ist, sagt niemandem
   * etwas — und die Zeile hat Platz für das, was vom Auslieferungszustand
   * abweicht.
   */
  it('merkt sich die Gitterlinien nur als echtes Ja und nennt sie nur, wenn sie an sind', () => {
    expect(DEFAULT_GRAPHICS.gridLines).toBe(false);
    expect(clampGraphics({ gridLines: true })).toEqual({ ...DEFAULT_GRAPHICS, gridLines: true });
    expect(clampGraphics({ gridLines: 'ja' as never })).toEqual(DEFAULT_GRAPHICS);
    expect(graphicsSummary({ mode: 'simple', xrScale: 1, gridLines: false })).toBe('Einfach');
    expect(graphicsSummary({ mode: 'simple', xrScale: 1, gridLines: true })).toBe(
      'Einfach · Gitterlinien',
    );
    expect(graphicsSummary({ mode: 'comic', xrScale: 0.7, gridLines: true })).toBe(
      'Comic · Brille Flüssig · Gitterlinien',
    );
  });

  /**
   * **Die Hitboxen sind eine Werkstattansicht.** Ab Werk aus, wie die
   * Gitterlinien, und genannt werden sie in der Überschrift nur, wenn sie an
   * sind — wer ein Drahtgitter über der Welt hat, soll in der Zeile darüber
   * lesen, woran das liegt.
   */
  it('merkt sich die Hitboxen nur als echtes Ja und nennt sie nur, wenn sie an sind', () => {
    expect(DEFAULT_GRAPHICS.hitBoxes).toBe(false);
    expect(clampGraphics({ hitBoxes: true })).toEqual({ ...DEFAULT_GRAPHICS, hitBoxes: true });
    expect(clampGraphics({ hitBoxes: 'ja' as never })).toEqual(DEFAULT_GRAPHICS);
    expect(graphicsSummary({ mode: 'simple', xrScale: 1, hitBoxes: false })).toBe('Einfach');
    expect(graphicsSummary({ mode: 'simple', xrScale: 1, hitBoxes: true })).toBe(
      'Einfach · Hitboxen',
    );
    expect(graphicsSummary({ mode: 'simple', xrScale: 1, gridLines: true, hitBoxes: true })).toBe(
      'Einfach · Gitterlinien · Hitboxen',
    );
  });

  /**
   * **Die Griffe sind dieselbe Sorte Werkstattansicht** — ab Werk aus, und in
   * der Überschrift steht nur, wer sie angemacht hat. Ein Achsenkreuz am
   * Pfannenstiel ist ein Maßband und kein Bühnenbild (`core/handleView.ts`).
   */
  it('merkt sich die Griffe nur als echtes Ja und nennt sie nur, wenn sie an sind', () => {
    expect(DEFAULT_GRAPHICS.showHandles).toBe(false);
    expect(clampGraphics({ showHandles: true })).toEqual({
      ...DEFAULT_GRAPHICS,
      showHandles: true,
    });
    expect(clampGraphics({ showHandles: 'ja' as never })).toEqual(DEFAULT_GRAPHICS);
    expect(graphicsSummary({ mode: 'simple', xrScale: 1, showHandles: false })).toBe('Einfach');
    expect(graphicsSummary({ mode: 'simple', xrScale: 1, showHandles: true })).toBe(
      'Einfach · Griffe',
    );
    expect(graphicsSummary({ mode: 'simple', xrScale: 1, hitBoxes: true, showHandles: true })).toBe(
      'Einfach · Hitboxen · Griffe',
    );
  });

  it('überlebt einen Speicher, den es nicht gibt', () => {
    // Kein localStorage im Node-Testlauf: gelesen wird trotzdem, gespeichert
    // auch, und zurück kommt, was angekommen wäre.
    expect(graphics()).toEqual(DEFAULT_GRAPHICS);
    expect(saveGraphics({ mode: 'comic' })).toEqual({ ...DEFAULT_GRAPHICS, mode: 'comic' });
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
