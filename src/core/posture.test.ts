import {
  DEFAULT_EYES,
  EYE_RANGE,
  EYE_SCALE_RANGE,
  KITCHEN_EYE_RANGE,
  clampEyes,
  eyeHeights,
  kitchenEyeScale,
  seatedLift,
} from './posture';

/**
 * Zwei Zahlen und eine Subtraktion — und trotzdem die Stelle, an der ein
 * falsches Vorzeichen den Spieler in den Boden drückt oder einen halben Meter
 * über den Sessel hebt. Ohne Browser prüfbar, also wird sie geprüft.
 */
describe('Augenhöhen', () => {
  it('nimmt an, was ein Mensch misst', () => {
    expect(clampEyes({ stand: 172, sit: 118, kitchen: 135 })).toEqual({
      stand: 172,
      sit: 118,
      kitchen: 135,
    });
  });

  it('holt jede Zahl in den Bereich zurück, in dem sie Sinn ergibt', () => {
    expect(clampEyes({ stand: 900, sit: -20, kitchen: 900 })).toEqual({
      stand: EYE_RANGE.max,
      sit: EYE_RANGE.min,
      kitchen: KITCHEN_EYE_RANGE.max,
    });
  });

  /**
   * Die Küchenhöhe hat einen **engeren** Bereich als die beiden gemessenen:
   * Sie beschreibt keinen Menschen, sondern einen Standpunkt in einem Raum mit
   * Möbeln auf einem halben Meter (`posture.KITCHEN_EYE_RANGE`). 60 cm wären
   * dort kein kleiner Spieler, sondern einer unter der Arbeitsplatte.
   */
  it('gibt der Küchenhöhe ihren eigenen, engeren Bereich', () => {
    expect(KITCHEN_EYE_RANGE.min).toBeGreaterThan(EYE_RANGE.min);
    expect(KITCHEN_EYE_RANGE.max).toBeLessThan(EYE_RANGE.max);
    expect(clampEyes({ kitchen: EYE_RANGE.min }).kitchen).toBe(KITCHEN_EYE_RANGE.min);
    expect(clampEyes({ kitchen: EYE_RANGE.max }).kitchen).toBe(KITCHEN_EYE_RANGE.max);
  });

  it('macht aus einem kaputten Speicher die Auslieferungswerte', () => {
    expect(clampEyes(undefined)).toEqual(DEFAULT_EYES);
    expect(clampEyes({ stand: Number.NaN, sit: undefined })).toEqual(DEFAULT_EYES);
  });

  /**
   * **Der Speicher jedes Spielers, der schon vorher gespielt hat.** Dort steht
   * `{"stand":172,"sit":118}` und sonst nichts — die Küchenhöhe gab es noch
   * nicht. Eine fehlende Zahl darf die beiden gemessenen nicht mitreißen: Wer
   * seine Größe einmal eingestellt hat, findet sie nach dem Update wieder.
   */
  it('ergänzt eine alte Einstellung ohne Küchenhöhe, ohne den Rest zu verlieren', () => {
    expect(clampEyes({ stand: 172, sit: 118 })).toEqual({
      stand: 172,
      sit: 118,
      kitchen: DEFAULT_EYES.kitchen,
    });
  });

  it('rundet auf ganze Zentimeter — feiner misst niemand sich selbst', () => {
    expect(clampEyes({ stand: 171.4, sit: 117.6, kitchen: 139.5 })).toEqual({
      stand: 171,
      sit: 118,
      kitchen: 140,
    });
  });

  /**
   * Die Anhebung ist die Differenz, in Metern — nicht die Sitzhöhe und nicht
   * die Stehhöhe. Bei 172 zu 118 sind das 54 cm, und genau um die liegt der
   * virtuelle Tisch sonst neben dem echten.
   */
  it('hebt den Sitzenden um genau die Differenz an', () => {
    expect(seatedLift({ stand: 172, sit: 118, kitchen: 140 })).toBeCloseTo(0.54, 6);
    expect(seatedLift({ stand: 165, sit: 165, kitchen: 140 })).toBe(0);
  });

  it('drückt niemanden in den Boden, wenn er sitzend höher ist', () => {
    // Barhocker, oder eine der beiden Zahlen daneben: dann lieber nichts tun.
    expect(seatedLift({ stand: 150, sit: 170, kitchen: 140 })).toBe(0);
  });
});

/**
 * **Was die Küche aus einer Augenhöhe macht** (`kitchenEyeScale`).
 *
 * Ein Verhältnis und keine Differenz, und diese Suite ist der Grund, warum:
 * Ein Faktor trifft den Sehr-Großen und den Sehr-Kleinen mit derselben
 * Rechnung, weil beide auf **dieselbe** Höhe sollen — und weil er die Null
 * stehen lässt, bleibt der Boden der Boden.
 */
describe('Die Augenhöhe in der Küche', () => {
  it('bringt den voreingestellten Spieler von 165 auf 150 cm', () => {
    const scale = kitchenEyeScale(DEFAULT_EYES);
    expect(scale).toBeCloseTo(150 / 165, 6);
    expect(DEFAULT_EYES.stand * scale).toBeCloseTo(DEFAULT_EYES.kitchen, 6);
  });

  /**
   * Zwei Spieler, 35 cm auseinander, danach beide auf 1,50 m — das kann eine
   * feste Differenz nicht: Sie hielte den Abstand und verfehlte damit einen
   * von beiden.
   */
  it('setzt Große und Kleine auf dieselbe Höhe', () => {
    for (const stand of [150, 165, 185, 195]) {
      const values = { ...DEFAULT_EYES, stand };
      expect(stand * kitchenEyeScale(values)).toBeCloseTo(DEFAULT_EYES.kitchen, 6);
    }
  });

  it('lässt in Ruhe, wer schon auf der richtigen Höhe schaut', () => {
    expect(kitchenEyeScale({ stand: 140, sit: 110, kitchen: 140 })).toBe(1);
  });

  /**
   * Der Faktor staucht den **Abstand zum Boden**: Aus null wird null. Genau
   * daran hängt das Bücken — eine feste Absenkung von 25 cm zöge einen Kopf
   * auf 20 cm unter den Estrich, ein Faktor macht 17 cm daraus.
   */
  it('lässt den Boden den Boden sein', () => {
    const scale = kitchenEyeScale(DEFAULT_EYES);
    expect(0 * scale).toBe(0);
    expect(0.2 * scale).toBeGreaterThan(0);
    expect(0.2 * scale).toBeLessThan(0.2);
  });

  /**
   * Beide Zahlen dürfen an ihren Rändern stehen, und dann kommt Unsinn heraus:
   * ein Kind von 60 cm Augenhöhe auf 180 cm wäre das Dreifache. Nicht die
   * Eingabe wird verboten, sondern das Ergebnis begrenzt
   * (`EYE_SCALE_RANGE`).
   */
  it('kippt an keinem Ende der beiden Bereiche', () => {
    for (const stand of [EYE_RANGE.min, EYE_RANGE.max]) {
      for (const kitchen of [KITCHEN_EYE_RANGE.min, KITCHEN_EYE_RANGE.max]) {
        const scale = kitchenEyeScale({ stand, sit: 120, kitchen });
        expect(scale).toBeGreaterThanOrEqual(EYE_SCALE_RANGE.min);
        expect(scale).toBeLessThanOrEqual(EYE_SCALE_RANGE.max);
      }
    }
  });

  it('rechnet nicht durch eine Augenhöhe von null', () => {
    expect(kitchenEyeScale({ stand: 0, sit: 0, kitchen: 140 })).toBe(1);
  });
});

/**
 * **Der Speicher** (`bgvr.eyeHeights`) — das eine Stück dieser Datei, das
 * nicht reine Rechnung ist.
 *
 * Geprüft wird, was wirklich darin steht: die alte Fassung ohne Küchenhöhe,
 * kaputtes JSON, und ein Speicher, der beim Lesen wirft (privater Modus).
 * Keiner der drei Fälle ist einen Absturz wert, und keiner darf die beiden
 * gemessenen Zahlen mitnehmen.
 */
describe('Was im Speicher steht', () => {
  const KEY = 'bgvr.eyeHeights';

  function useStorage(store: Pick<Storage, 'getItem' | 'setItem'> | undefined): void {
    Object.defineProperty(globalThis, 'localStorage', {
      value: store,
      configurable: true,
      writable: true,
    });
  }

  function fake(raw: string | null): void {
    useStorage({ getItem: (key) => (key === KEY ? raw : null), setItem: () => {} });
  }

  afterEach(() => useStorage(undefined));

  it('nimmt eine Einstellung von vor der Küchenhöhe an', () => {
    fake(JSON.stringify({ stand: 178, sit: 126 }));
    expect(eyeHeights()).toEqual({ stand: 178, sit: 126, kitchen: DEFAULT_EYES.kitchen });
  });

  /**
   * **Ein neuer Auslieferungswert rührt keine gespeicherte Zahl an.**
   *
   * Die Küchenhöhe ist von 140 auf 150 cm gezogen worden, weil sich 140 in der
   * Brille zu niedrig anfühlte (`DEFAULT_EYES`). Wer vorher am Regler gedreht
   * hat, hat seine Zahl aber aus demselben Grund gewählt: weil sie sich für
   * **ihn** richtig anfühlt. Ein Auslieferungswert, der beim nächsten Start
   * darüberschriebe, nähme ihm genau das wieder weg — und zwar unbemerkt, denn
   * niemand sieht im Menü nach, ob dort noch steht, was er eingestellt hat.
   *
   * Geprüft wird deshalb beides: Eine gespeicherte 140 bleibt eine 140, auch
   * wenn sie zufällig dem **alten** Auslieferungswert gleicht — und ein
   * fehlender Eintrag wird zur neuen 150.
   */
  it('lässt eine eingestellte Küchenhöhe stehen, auch die alte 140', () => {
    fake(JSON.stringify({ stand: 178, sit: 126, kitchen: 140 }));
    expect(eyeHeights()).toEqual({ stand: 178, sit: 126, kitchen: 140 });
    fake(JSON.stringify({ stand: 178, sit: 126, kitchen: 115 }));
    expect(eyeHeights().kitchen).toBe(115);
    fake(JSON.stringify({ stand: 178, sit: 126 }));
    expect(eyeHeights().kitchen).toBe(150);
  });

  it('macht aus Unsinn im Speicher die Auslieferungswerte', () => {
    fake('kein JSON, sondern Text');
    expect(eyeHeights()).toEqual(DEFAULT_EYES);
    fake('[1,2,3]');
    expect(eyeHeights()).toEqual(DEFAULT_EYES);
    fake('null');
    expect(eyeHeights()).toEqual(DEFAULT_EYES);
  });

  it('übersteht einen Speicher, der gar nicht erst antwortet', () => {
    useStorage({
      getItem: () => {
        throw new Error('privater Modus');
      },
      setItem: () => {},
    });
    expect(eyeHeights()).toEqual(DEFAULT_EYES);
    useStorage(undefined);
    expect(eyeHeights()).toEqual(DEFAULT_EYES);
  });
});
