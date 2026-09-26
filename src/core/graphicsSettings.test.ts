import {
  type GraphicsMode,
  type SquishScale,
  type SquishSpeed,
  DEFAULT_GRAPHICS,
  GRAPHICS_MODES,
  SQUISH_SCALES,
  SQUISH_SPEEDS,
  XR_SCALES,
  animationSummary,
  clampGraphics,
  clearGraphics,
  graphics,
  graphicsProfile,
  graphicsSummary,
  nextMovePad,
  nextGraphicsMode,
  nextShadowMode,
  readShadowMode,
  nextSquishScale,
  nextSquishSpeed,
  nextXrScale,
  onGraphicsChange,
  saveGraphics,
  squishAmount,
  squishTempo,
  idleSquishAmount,
  idleSquishTempo,
} from './graphicsSettings';

describe('Grafikeinstellungen', () => {
  it('liefert das Bild von vorher aus — mit Schatten', () => {
    expect(DEFAULT_GRAPHICS).toEqual({
      mode: 'simple',
      xrScale: 1,
      showFps: false,
      gridLines: false,
      // Die belegten Felder der Figuren sind eine Werkstattansicht: ab Werk aus.
      cellFootprints: false,
      showPosition: false,
      hitBoxes: false,
      gridHitBoxes: false,
      ghostBoxes: false,
      showHandles: false,
      // Quest-3-Blickfeld und Mensch als Boxen: Werkstattansichten, ab Werk aus.
      showVrFrustum: false,
      showBodyModel: false,
      // Ab Werk der weiche Kreis unter den Figuren, keine Schattenkarte.
      shadows: 'simple',
      // Die Animationen sind ab Werk aus — nachgerechnet wird die Kurve
      // dahinter in `squish.test.ts`.
      squish: false,
      squishScale: 1,
      // Und das Tempo ab Werk halb: ein Federn auf zwei Schritte.
      squishSpeed: 0.5,
      // Das Atmen im Stehen ebenso aus — und sein Tempo ab Werk ganz: Der
      // Atem läuft gegen kein Watscheln an, drei Sekunden sind schon ruhig.
      idleSquish: false,
      idleSquishScale: 1,
      idleSquishSpeed: 1,
      // Die Stöcke auf dem Glas entscheiden sich nach Gerät — nachgerechnet
      // wird das in `screenPads.test.ts`.
      screenPads: 'auto',
      // Links unten der Stock — das Steuerkreuz ist die Wahl im Menü.
      movePad: 'stick',
    });
  });

  it('merkt sich Stock oder Steuerkreuz und liest Unbekanntes als Stock', () => {
    expect(clampGraphics({ movePad: 'dpad' }).movePad).toBe('dpad');
    expect(clampGraphics({ movePad: 'kreuz' as never }).movePad).toBe('stick');
    expect(nextMovePad('stick')).toBe('dpad');
    expect(nextMovePad('dpad')).toBe('stick');
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
    const profile = graphicsProfile({ mode: 'simple', xrScale: 1, shadows: 'off' });
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
  it('legt ab Werk einen Kreis unter die Figuren statt einer Schattenkarte', () => {
    const plain = graphicsProfile({ mode: 'simple', xrScale: 1 });
    expect(plain.shadows).toBe(false);
    expect(plain.blobShadows).toBe(true);
    // Die Taschenlampe behält ihre Karte — sie ist der Horror der Station.
    expect(plain.lightShadows).toBe(true);
    expect(plain.outlines).toBe(false);
    // Ohne Sonnenschatten bleibt das Grundlicht, wo es war.
    expect(plain.ambientScale).toBe(1);
    // Aus ist ganz aus: kein Kreis, keine Karte, auch nicht an der Lampe.
    const off = graphicsProfile({ mode: 'simple', xrScale: 1, shadows: 'off' });
    expect([off.shadows, off.blobShadows, off.lightShadows]).toEqual([false, false, false]);
  });

  it('zeichnet im Modus Voll die Schattenkarte der Sonne — und dämpft dafür das Grundlicht', () => {
    const full = graphicsProfile({ mode: 'simple', xrScale: 1, shadows: 'full' });
    expect(full.shadows).toBe(true);
    expect(full.lightShadows).toBe(true);
    // Kein Kreis unter einer Figur, die schon einen echten Schatten wirft.
    expect(full.blobShadows).toBe(false);
    // Ein Schatten ist nur so dunkel, wie das Licht daneben hell ist.
    expect(full.ambientScale).toBeLessThan(1);
  });

  it('liest den alten Schalter als Modus und wechselt im Menü nur zwischen Aus und Kreis', () => {
    expect(readShadowMode(false)).toBe('off');
    expect(readShadowMode(true)).toBe('simple');
    expect(readShadowMode(undefined)).toBe('simple');
    expect(readShadowMode('full')).toBe('full');
    expect(readShadowMode('schön')).toBe('simple');
    expect(nextShadowMode('off')).toBe('simple');
    expect(nextShadowMode('simple')).toBe('off');
    expect(nextShadowMode('full')).toBe('off');
  });

  /**
   * Ein gespeicherter Stand von gestern kennt das Feld nicht — und bekommt
   * Schatten, nicht das Gegenteil. Deshalb steht in `clampGraphics` an dieser
   * einen Stelle kein `=== true`.
   */
  it('gibt einem alten Speicher den Kreis — und wer sie aus hatte, behält aus', () => {
    expect(clampGraphics({ mode: 'simple' }).shadows).toBe('simple');
    expect(clampGraphics({ shadows: false } as never).shadows).toBe('off');
    expect(clampGraphics({ shadows: true } as never).shadows).toBe('simple');
    expect(graphicsSummary({ mode: 'simple', xrScale: 1, shadows: 'off' })).toBe(
      'Einfach · ohne Schatten',
    );
    expect(graphicsSummary({ mode: 'simple', xrScale: 1, shadows: 'simple' })).toBe('Einfach');
    expect(graphicsSummary({ mode: 'simple', xrScale: 1, shadows: 'full' })).toBe(
      'Einfach · Schatten voll',
    );
  });

  it('zeichnet im Comic Konturen, Stufen und Schatten', () => {
    const profile = graphicsProfile({ mode: 'comic', xrScale: 1 });
    expect(profile.outlines).toBe(true);
    expect(profile.toonBands).toBeGreaterThan(1);
    expect(profile.outlineWidth).toBeGreaterThan(0);
    // Ohne Schatten schwebt in einer Zeichnung alles — ab Werk liegt der
    // Kreis darunter.
    expect(profile.blobShadows).toBe(true);
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
  it('schaltet die Hitboxen des Gitters einzeln — 2D neben 3D', () => {
    expect(DEFAULT_GRAPHICS.gridHitBoxes).toBe(false);
    expect(clampGraphics({ gridHitBoxes: true })).toEqual({
      ...DEFAULT_GRAPHICS,
      gridHitBoxes: true,
    });
    expect(clampGraphics({ gridHitBoxes: 1 as never })).toEqual(DEFAULT_GRAPHICS);
    expect(
      graphicsSummary({ mode: 'simple', xrScale: 1, hitBoxes: true, gridHitBoxes: true }),
    ).toBe('Einfach · Hitboxen 3D · Hitboxen 2D');
  });

  it('merkt sich die Hitboxen nur als echtes Ja und nennt sie nur, wenn sie an sind', () => {
    expect(DEFAULT_GRAPHICS.hitBoxes).toBe(false);
    expect(clampGraphics({ hitBoxes: true })).toEqual({ ...DEFAULT_GRAPHICS, hitBoxes: true });
    expect(clampGraphics({ hitBoxes: 'ja' as never })).toEqual(DEFAULT_GRAPHICS);
    expect(graphicsSummary({ mode: 'simple', xrScale: 1, hitBoxes: false })).toBe('Einfach');
    expect(graphicsSummary({ mode: 'simple', xrScale: 1, hitBoxes: true })).toBe(
      'Einfach · Hitboxen 3D',
    );
    expect(graphicsSummary({ mode: 'simple', xrScale: 1, gridLines: true, hitBoxes: true })).toBe(
      'Einfach · Gitterlinien · Hitboxen 3D',
    );
  });

  it('merkt sich die Positionsanzeige nur als echtes Ja', () => {
    expect(DEFAULT_GRAPHICS.showPosition).toBe(false);
    expect(clampGraphics({ showPosition: true })).toEqual({
      ...DEFAULT_GRAPHICS,
      showPosition: true,
    });
    expect(clampGraphics({ showPosition: 'ja' as never })).toEqual(DEFAULT_GRAPHICS);
  });

  /**
   * **Was das Ghosting sieht, ebenso** — ab Werk aus, nur ein echtes Ja, und
   * in der Überschrift nur, wenn es an ist.
   */
  it('merkt sich das Ghosting-Gitter nur als echtes Ja und nennt es nur, wenn es an ist', () => {
    expect(DEFAULT_GRAPHICS.ghostBoxes).toBe(false);
    expect(clampGraphics({ ghostBoxes: true })).toEqual({ ...DEFAULT_GRAPHICS, ghostBoxes: true });
    expect(clampGraphics({ ghostBoxes: 1 as never })).toEqual(DEFAULT_GRAPHICS);
    expect(graphicsSummary({ mode: 'simple', xrScale: 1, hitBoxes: true, ghostBoxes: true })).toBe(
      'Einfach · Hitboxen 3D · Ghosting',
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
      'Einfach · Hitboxen 3D · Griffe',
    );
  });

  /**
   * **Squishy Movement** — ab Werk aus, und der Faktor daneben hat ohne den
   * Schalter keine Wirkung. Beides steht hier, weil beides einzeln schiefgehen
   * kann: ein Faktor, der aus einem alten Speicher als `3` hereinkommt, und
   * eine Figur, die federt, obwohl das Häkchen aus ist.
   */
  it('federt nur auf ausdrückliches Ja — und kennt acht Stärken', () => {
    expect(DEFAULT_GRAPHICS.squish).toBe(false);
    // Viertelschritte von ×0,25 bis ×2, und dieselbe Leiter gilt für das
    // Tempo und für beide Bewegungen: vier Regler, eine Leiter.
    expect([...SQUISH_SCALES]).toEqual([0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]);
    expect(clampGraphics({ squish: true })).toEqual({ ...DEFAULT_GRAPHICS, squish: true });
    expect(clampGraphics({ squish: 'ja' as never })).toEqual(DEFAULT_GRAPHICS);
    expect(clampGraphics({ squishScale: 3 as never })).toEqual(DEFAULT_GRAPHICS);
    expect(clampGraphics({ squishScale: 2 })).toEqual({ ...DEFAULT_GRAPHICS, squishScale: 2 });

    // Die unterste Raste ist nachgereicht: Für ein Federn, das man nur
    // bemerkt, wenn es fehlt, war selbst ×0,5 noch zu viel.
    expect(clampGraphics({ squishScale: 0.25 })).toEqual({
      ...DEFAULT_GRAPHICS,
      squishScale: 0.25,
    });

    // Der Kreis: ×0,25 → … → ×2 → wieder von vorn.
    let scale: SquishScale = SQUISH_SCALES[0]!;
    for (const expected of [...SQUISH_SCALES.slice(1), SQUISH_SCALES[0]!]) {
      scale = nextSquishScale(scale);
      expect(scale).toBe(expected);
    }

    // Die eine Zahl, die die Figur bekommt: ohne Häkchen glatt 0, auch mit
    // ×2 daneben.
    expect(squishAmount({ squish: false, squishScale: 2 })).toBe(0);
    expect(squishAmount({ squish: true, squishScale: 1.5 })).toBe(1.5);
    expect(squishAmount({ squish: true })).toBe(DEFAULT_GRAPHICS.squishScale);
  });

  /**
   * **Das Tempo ist ab Werk das halbe**, und das ist eine Korrektur: Ein
   * Federn je Schritt war zu schnell — der Takt des Watschelns ist schon
   * zweimal je Doppelschritt. Ein gespeicherter Stand von gestern kennt das
   * Feld nicht und bekommt deshalb die Vorgabe und keine 0: Mit 0 fröre die
   * Figur in einer Haltung ein.
   */
  it('federt ab Werk im halben Tempo und geht dieselbe Leiter wie die Stärke', () => {
    expect(DEFAULT_GRAPHICS.squishSpeed).toBe(0.5);
    expect([...SQUISH_SPEEDS]).toEqual([...SQUISH_SCALES]);
    expect(clampGraphics({ squishSpeed: 1 })).toEqual({ ...DEFAULT_GRAPHICS, squishSpeed: 1 });
    // Nach oben ist jetzt bei ×2 Schluss und nicht mehr bei ×1 — dazwischen
    // liegt nichts Krummes, und alles darüber fällt auf die Vorgabe zurück.
    expect(clampGraphics({ squishSpeed: 2 })).toEqual({ ...DEFAULT_GRAPHICS, squishSpeed: 2 });
    expect(clampGraphics({ squishSpeed: 2.5 as never })).toEqual(DEFAULT_GRAPHICS);
    expect(clampGraphics({ squishSpeed: 'schnell' as never })).toEqual(DEFAULT_GRAPHICS);
    expect(squishTempo({})).toBe(0.5);
    expect(squishTempo({ squishSpeed: 0.25 })).toBe(0.25);

    let speed: SquishSpeed = SQUISH_SPEEDS[0]!;
    for (const expected of [...SQUISH_SPEEDS.slice(1), SQUISH_SPEEDS[0]!]) {
      speed = nextSquishSpeed(speed);
      expect(speed).toBe(expected);
    }
  });

  it('nennt die Stauchung in beiden Zeilen nur, wenn sie an ist', () => {
    expect(graphicsSummary({ mode: 'simple', xrScale: 1, squish: false, squishScale: 2 })).toBe(
      'Einfach',
    );
    expect(graphicsSummary({ mode: 'simple', xrScale: 1, squish: true, squishScale: 2 })).toBe(
      'Einfach · Squishy ×2',
    );
    // Und das Atmen daneben, nach derselben Regel.
    expect(
      graphicsSummary({ mode: 'simple', xrScale: 1, idleSquish: true, idleSquishScale: 1.5 }),
    ).toBe('Einfach · Atmen ×1,5');
    expect(animationSummary({ squish: false, squishScale: 2 })).toBe(
      'Nichts Besonderes · die Figur läuft, wie sie immer lief',
    );
    // Auf der Seite stehen je Bewegung zwei Regler, also nennt ihre
    // Überschrift beide — auch den, der auf der Vorgabe steht.
    expect(animationSummary({ squish: true, squishScale: 0.5 })).toBe('Laufen ×0,5 im Tempo ×0,5');
    expect(animationSummary({ squish: true, squishScale: 0.25, squishSpeed: 1 })).toBe(
      'Laufen ×0,25 im Tempo ×1',
    );
    // Das Atmen allein — und beide nebeneinander, denn seit es zwei
    // Bewegungen gibt, ist „Squishy an" keine Antwort mehr auf die Frage,
    // was die Figur tut.
    expect(animationSummary({ idleSquish: true, idleSquishScale: 2, idleSquishSpeed: 0.25 })).toBe(
      'Atmen ×2 im Tempo ×0,25',
    );
    expect(animationSummary({ squish: true, idleSquish: true })).toBe(
      'Laufen ×1 im Tempo ×0,5 · Atmen ×1 im Tempo ×1',
    );
  });

  /**
   * **Das Atmen im Stehen** — dieselben drei Fragen wie beim Laufen, und
   * deshalb dieselben drei Prüfungen: Ohne Häkchen ist die Stärke glatt 0,
   * eine Raste, die es nicht gibt, fällt auf die Vorgabe zurück, und ein
   * gespeicherter Stand von gestern kennt keines der drei Felder.
   */
  it('atmet nur auf ausdrückliches Ja — mit denselben Rasten wie das Laufen', () => {
    expect(DEFAULT_GRAPHICS.idleSquish).toBe(false);
    expect(DEFAULT_GRAPHICS.idleSquishSpeed).toBe(1);
    expect(clampGraphics({ idleSquish: true })).toEqual({ ...DEFAULT_GRAPHICS, idleSquish: true });
    expect(clampGraphics({ idleSquish: 'ja' as never })).toEqual(DEFAULT_GRAPHICS);
    expect(clampGraphics({ idleSquishScale: 1.75 })).toEqual({
      ...DEFAULT_GRAPHICS,
      idleSquishScale: 1.75,
    });
    expect(clampGraphics({ idleSquishScale: 3 as never })).toEqual(DEFAULT_GRAPHICS);
    expect(clampGraphics({ idleSquishSpeed: 0.75 })).toEqual({
      ...DEFAULT_GRAPHICS,
      idleSquishSpeed: 0.75,
    });
    expect(clampGraphics({ idleSquishSpeed: 0 as never })).toEqual(DEFAULT_GRAPHICS);

    // Die eine Zahl, die die Figur bekommt: ohne Häkchen glatt 0, auch mit
    // ×2 daneben — und das Tempo nie 0, denn 0 wäre eine eingefrorene Figur.
    expect(idleSquishAmount({ idleSquish: false, idleSquishScale: 2 })).toBe(0);
    expect(idleSquishAmount({ idleSquish: true, idleSquishScale: 1.25 })).toBe(1.25);
    expect(idleSquishAmount({ idleSquish: true })).toBe(DEFAULT_GRAPHICS.idleSquishScale);
    expect(idleSquishTempo({})).toBe(1);
    expect(idleSquishTempo({ idleSquishSpeed: 0.25 })).toBe(0.25);
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
