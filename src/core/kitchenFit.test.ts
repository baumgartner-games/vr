import {
  KITCHEN_NAMES,
  KITCHEN_PIECES,
  KITCHEN_SCALE,
  PAN_BOWL,
  kitchenDeck,
  kitchenPiece,
  kitchenWorkHeight,
} from './kitchenFit';

/**
 * **Die Maße der Quelldatei**, in Metern und ungeteilt — abgelesen aus
 * `public/models/kitchen.glb` (Breite, Höhe, Tiefe je Knoten).
 *
 * Sie stehen hier, damit die Halbierung nachrechenbar bleibt: Der Katalog
 * nennt die **fertigen** Maße, und ohne diese Liste daneben wäre nicht mehr zu
 * sehen, woher sie kommen. Wer die Quelle austauscht, trägt hier die neuen ein
 * und sieht am fehlschlagenden Test, was im Katalog nachzuziehen ist.
 *
 * **Ein gebautes Stück steht nicht darin, und genau das ist die Probe.** Der
 * Katalog führt seit dem Förderband auch Möbel, die es in
 * `public/models/kitchen.glb` gar nicht gibt (`KitchenPiece.built`) — für die
 * ist hier nichts nachzumessen. Wer ein Möbel vergisst einzutragen, bekommt
 * deshalb keine stille Lücke: Er muss es entweder hier nennen oder im Katalog
 * als `built` kennzeichnen.
 */
const SOURCE: Readonly<Record<string, readonly [number, number, number]>> = {
  'plate-counter': [2, 1.12, 2.12],
  extinguisher: [2, 2.5, 2],
  sink: [4, 2.3, 2.12],
  bin: [2, 0.9, 2],
  table: [2, 1, 2],
  'serve-counter': [2, 0.91, 2],
  board: [2, 1.15, 2],
  'plate-rack': [4, 1.13, 1.93],
  pass: [4, 1.05, 2.02],
  counter: [2, 1, 2.12],
  stove: [2, 1.1, 2.13],
  'stove-pot': [2, 1.73, 2.13],
  'stove-pan': [2, 1.35, 2.44],
};

/**
 * Am Katalog gibt es nichts zu rechnen — er ist eine Liste. Drei Sachen an ihm
 * fielen trotzdem schon auf, und alle drei kosten eine Zeile: dass ein Name
 * doppelt vorkommt, dass ein Möbel keine Grundfläche hat, und dass ein
 * fremder Name aus dem Netz eine Ausnahme wirft, statt `undefined` zu geben.
 */
describe('der Möbelkatalog', () => {
  it('hat lauter eigene Namen und Beschriftungen', () => {
    expect(new Set(KITCHEN_NAMES).size).toBe(KITCHEN_PIECES.length);
    for (const piece of KITCHEN_PIECES) {
      expect(piece.label.length).toBeGreaterThan(2);
      expect(piece.name).toMatch(/^[a-z][a-z-]*$/);
    }
  });

  it('gibt jedem Möbel eine Grundfläche und eine Höhe', () => {
    for (const piece of KITCHEN_PIECES) {
      const [x, z] = piece.tiles;
      // Ganze Kacheln, mindestens eine — das Raster ist ein Meter
      // (`worlds/nav/navTile.TILE`), und ein halbes Möbel passt darauf nicht.
      expect(Number.isInteger(x)).toBe(true);
      expect(Number.isInteger(z)).toBe(true);
      expect(x).toBeGreaterThanOrEqual(1);
      expect(z).toBeGreaterThanOrEqual(1);
      expect(piece.height).toBeGreaterThan(0.1);
      // Nichts ist höher als ein Raum hoch ist.
      expect(piece.height).toBeLessThan(4);
    }
  });

  it('findet ein Möbel nach Namen und verschluckt sich nicht an Fremdtext', () => {
    expect(kitchenPiece('sink')?.label).toBe('Spüle');
    // Die Namen kommen über das Netz in einem Plan an — was dort steht, hat
    // niemand geprüft.
    expect(kitchenPiece('../../etc/passwd')).toBeUndefined();
    expect(kitchenPiece('')).toBeUndefined();
  });

  /**
   * **Die Quelle ist doppelt so groß, wie eine Küche sein darf**, und der
   * Katalog nennt die halbierten Maße. Das ist die Zahl, an der die ganze
   * Küche hängt: Neben einem Koch von 1,60 m reichte ein Tresen ungeteilt bis
   * über die Augen.
   */
  it('nennt die Maße der Quelle halbiert', () => {
    expect(KITCHEN_SCALE).toBe(0.5);
    for (const piece of KITCHEN_PIECES) {
      const source = SOURCE[piece.name];
      // Aus der Datei kommt es oder es wird gebaut — ein drittes gibt es
      // nicht, und ein Möbel, das in keiner der beiden Listen steht, ist ein
      // vergessener Eintrag und kein Sonderfall.
      expect({ name: piece.name, known: source !== undefined || piece.built === true }).toEqual({
        name: piece.name,
        known: true,
      });
      if (!source) continue;
      const [w, h, d] = source;
      // Auf den halben Zentimeter genau und nicht genauer: Der Katalog rundet
      // auf zwei Stellen, und ein Test, der auf die zwölfte prüft, prüft
      // Fließkomma statt Möbel.
      const off = Math.abs(piece.height - h * KITCHEN_SCALE);
      expect({ name: piece.name, fits: off <= 0.005 + 1e-9 }).toEqual({
        name: piece.name,
        fits: true,
      });
      // Gerundet und nicht aufgerundet: Ein Schrank von 1,06 m Tiefe auf zwei
      // Kacheln stellt eine ganze Zeile mit einem Meter Luft dazwischen auf.
      expect({ name: piece.name, tiles: piece.tiles }).toEqual({
        name: piece.name,
        tiles: [
          Math.max(1, Math.round(w * KITCHEN_SCALE)),
          Math.max(1, Math.round(d * KITCHEN_SCALE)),
        ],
      });
    }
  });

  /**
   * **In dieser Fassung der Quelle hängt keines.** Der Katalog führte das
   * Ausgaberegal einmal als hängendes Stück von 3,52 m; die Datei sagt etwas
   * anderes — es fängt wie jedes andere Möbel bei y = 0 an. Das war kein
   * Schönheitsfehler: Ein hängendes Stück bekommt weder Körper noch
   * Wegaufschlag, und man lief mitten durch das Regal hindurch.
   */
  it('lässt kein Möbel hängen, solange keines hängt', () => {
    expect(KITCHEN_PIECES.filter((piece) => piece.hanging)).toEqual([]);
  });

  /**
   * **Ohne Knoten in der Quelle darf nur auskommen, wer sich als gebaut
   * ausweist** (`KitchenPiece.built`).
   *
   * Das ist die eine Regel, die das neue Feld überhaupt trägt: Ein `null` aus
   * `core/kitchenModel.kitchenModel` heißt bei einem gebauten Stück „die Zone
   * ist dran" und bei jedem anderen „der Name ist falsch geschrieben". Ohne
   * diesen Test wäre ein Tippfehler im Katalog ein Möbel, das still zum
   * Ersatzbaustein wird — und niemand sähe den Unterschied zum Förderband,
   * das genauso wenig in der Datei steht.
   */
  it('lässt nur gebaute Möbel ohne Knoten in der Quelle durchgehen', () => {
    const built = KITCHEN_PIECES.filter((piece) => piece.built);
    expect(built.map((piece) => piece.name)).toEqual(['belt', 'belt-pull']);
    for (const piece of KITCHEN_PIECES) {
      const inSource = SOURCE[piece.name] !== undefined;
      expect({ name: piece.name, inSource }).toEqual({
        name: piece.name,
        inSource: piece.built !== true,
      });
    }
    // Und ein gebautes Stück bleibt ein vollwertiges Möbel: Wer es nur halb
    // einträgt, stellt eine Kachel ohne Höhe auf.
    for (const piece of built) {
      expect(piece.height).toBeGreaterThan(0.1);
      expect(piece.tiles).toEqual([1, 1]);
    }
  });

  /**
   * **Das Förderband ist so hoch wie die Ausgabetheke**, und zwar auf den
   * Zentimeter — es ist deren Verlängerung, und zwei Flächen, auf denen
   * dasselbe Gericht steht, dürfen keine Stufe bilden.
   *
   * Eine Kachel breit statt zwei ist der ganze Unterschied: Drei Bänder in
   * einer Reihe sind eine Strecke, drei Theken wären ein Tresen.
   */
  it('lässt das Förderband auf der Höhe der Ausgabetheke laufen', () => {
    const belt = kitchenPiece('belt')!;
    const pass = kitchenPiece('pass')!;
    expect(belt.height).toBe(pass.height);
    expect(belt.tiles).toEqual([1, 1]);
    expect(pass.tiles).toEqual([2, 1]);
    // Eine Arbeitsfläche ist es auch: Was man nicht ablegen kann, fährt auch
    // nirgendwohin (`worlds/test/zones/kitchenPlan.stationKind`).
    expect(belt.worktop).toBe(true);
    expect(kitchenDeck(belt)).toBe(belt.height);
  });

  /**
   * **Und das Zugband ist in jedem Maß dasselbe Möbel.**
   *
   * Es zieht sich zusätzlich von der Kachel hinter sich, was dort liegt
   * (`worlds/test/zones/kitchenBelt.ts`) — an Grundfläche, Höhe und
   * Arbeitsfläche ändert das nichts, und genau darauf kommt es an: Die beiden
   * stehen in einer Bahn hintereinander, und ein Zentimeter Unterschied wäre
   * darin eine Stufe.
   */
  it('baut das Zugband in denselben Maßen wie das Förderband', () => {
    const belt = kitchenPiece('belt')!;
    const pull = kitchenPiece('belt-pull')!;
    expect(pull.height).toBe(belt.height);
    expect(pull.tiles).toEqual(belt.tiles);
    expect(pull.worktop).toBe(true);
    expect(kitchenDeck(pull)).toBe(kitchenDeck(belt));
    // Zwei Möbel und nicht eines mit einem Schalter: Im Baumodus trägt man ein
    // Katalogstück in der Hand, und man soll ihm ansehen, welches.
    expect(pull.label).not.toBe(belt.label);
  });

  /**
   * **Die Arbeitsfläche liegt nie über dem Möbel.** `deck` steht nur dort, wo
   * es von `height` abweicht — und es weicht immer nach **unten** ab: `height`
   * ist beim Herd mit dem Topf die Oberkante des Topfes, `deck` die der
   * Platte. Andersherum wäre ein Brötchen, das über dem Deckel schwebt.
   */
  it('legt jede Arbeitsfläche auf oder unter die Oberkante', () => {
    for (const piece of KITCHEN_PIECES) {
      const deck = kitchenDeck(piece);
      expect({ name: piece.name, ok: deck > 0.1 && deck <= piece.height + 1e-9 }).toEqual({
        name: piece.name,
        ok: true,
      });
    }
    // Ohne eigenen Eintrag ist die Oberkante die Arbeitsfläche.
    expect(kitchenDeck(kitchenPiece('counter')!)).toBe(kitchenPiece('counter')!.height);
    // Und mit: der Herd, nicht der Topfdeckel.
    expect(kitchenDeck(kitchenPiece('stove-pot')!)).toBe(0.55);
  });

  /**
   * **Was einen Topf trägt, ist eine Ablage und hat eine eigene Höhe.** Ohne
   * beides läge der Topf nach dem ersten Abstellen in der Luft — oder gar
   * nicht, weil das Möbel keine Fläche hat, auf die er darf.
   */
  it('gibt jedem Möbel mit losem Gerät eine Fläche darunter', () => {
    const holding = KITCHEN_PIECES.filter((piece) => piece.holds);
    expect(holding.map((piece) => piece.name)).toEqual(['extinguisher', 'stove-pot', 'stove-pan']);
    for (const piece of holding) {
      expect({ name: piece.name, worktop: piece.worktop === true }).toEqual({
        name: piece.name,
        worktop: true,
      });
      expect(kitchenDeck(piece)).toBeLessThan(piece.height);
    }
  });

  /**
   * **Der Versatz bleibt in der Kachel.** Er gleicht einen überstehenden Griff
   * aus (`KitchenPiece.align`, der Pfannenstiel) oder ein Möbel, das flacher
   * ist als seine Nachbarn (das Schneidebrett), und ist damit ein paar
   * Zentimeter — wer hier einen halben Meter einträgt, stellt ein Möbel auf
   * die Nachbarkachel, ohne dass der Grundriss davon wüsste.
   */
  it('rückt kein Möbel weiter als eine halbe Kachel aus der Mitte', () => {
    const shifted = KITCHEN_PIECES.filter((piece) => piece.align);
    expect(shifted.map((piece) => piece.name)).toEqual(['board', 'stove-pan']);
    for (const piece of KITCHEN_PIECES) {
      const [x, z] = piece.align ?? [0, 0];
      expect(Math.max(Math.abs(x), Math.abs(z))).toBeLessThan(0.5);
    }
    // Gemessen an der Datei: Der Korpus reicht von z = −0,610 bis z = +0,453,
    // seine Mitte liegt also bei −0,078 — genau so weit rückt er zurück.
    expect(kitchenPiece('stove-pan')!.align).toEqual([0, 0.078]);
  });

  /**
   * **Die Vorderkante des Schneidebretts fluchtet mit der Küchenzeile.**
   *
   * Es ist flacher als sie — 2,00 m gegen 2,12 m in der Quelle —, und
   * mittig auf derselben Kachelmitte sprang es vorn wie hinten drei
   * Zentimeter zurück. Sichtbar ist davon nur die **Vorderkante**: Dort steht
   * die Figur, dort greift sie zu. Der Versatz ist deshalb der **ganze**
   * halbe Tiefenunterschied nach Süden und nicht die Hälfte davon — hinten
   * wird die Lücke dafür doppelt so groß, und die zeigt zur Wand.
   *
   * Gerechnet aus `SOURCE` und nicht abgeschrieben: Wer die Quelle
   * austauscht, sieht hier, dass der Versatz nachzumessen ist.
   */
  it('stellt das Schneidebrett vorn bündig zur Küchenzeile', () => {
    const board = kitchenPiece('board')!;
    const counter = kitchenPiece('counter')!;
    const front = (name: string) => (SOURCE[name]![2] * KITCHEN_SCALE) / 2;
    const [ax, az] = board.align!;
    expect(ax).toBe(0);
    // Nach Süden, also auf die Seite, an der die Figur steht.
    expect(az).toBeGreaterThan(0);
    // Auf den halben Zentimeter genau wie überall in diesem Katalog: Die
    // Quellmaße daneben sind auf zwei Stellen gerundet.
    expect(Math.abs(front('board') + az - front('counter'))).toBeLessThanOrEqual(0.005 + 1e-9);
    // Und hinten bleibt genau die doppelte Lücke stehen — kein Versehen,
    // sondern der Preis für die bündige Vorderkante.
    const gap = front('counter') - front('board') + az;
    expect(gap).toBeCloseTo(2 * az, 2);
    expect(board.tiles).toEqual(counter.tiles);
  });

  /**
   * **Auf dem Schneidebrett liegt das Essen auf dem Brett und nicht auf dem
   * Messer.**
   *
   * `height` ist hier die Spitze des Hackmessers (Quelle 1,148 → 0,574 m);
   * ohne eigenen `deck`-Eintrag wurde genau dorthin abgelegt, und ein
   * Salatkopf schwebte 3,7 cm über dem Brett. Die drei Höhen des Möbels stehen
   * in der Quelle und sind hier nachgerechnet:
   *
   * - Korpus bis 1,000 → **0,500 m**, und das ist auf den Millimeter die
   *   Oberkante der Küchenzeile daneben — die Möbel fluchten also bereits.
   * - Brett darauf bis 1,065 → **0,5326 m**, gerundet die 0,533 des Katalogs.
   * - Messer bis 1,148 → 0,574 m.
   */
  it('legt aufs Schneidebrett und nicht aufs Messer', () => {
    const board = kitchenPiece('board')!;
    const counter = kitchenPiece('counter')!;
    // Das Brett liegt auf dem Korpus, also über ihm — und um genau seine
    // eigene Dicke (0,067 in der Quelle, halbiert 3,3 cm). Gemessen wird ab
    // **Fuß** des Möbels; wo die Fläche im Raum liegt, steht eine Prüfung
    // weiter unten.
    expect(kitchenDeck(board) - counter.height).toBeCloseTo(0.033, 2);
    // Und deutlich unter der Messerspitze, die `height` ist.
    expect(kitchenDeck(board)).toBeLessThan(board.height);
    expect(board.height - kitchenDeck(board)).toBeCloseTo(0.041, 2);
    // Die Korpusse selbst sind gleich hoch — beide 1,000 in der Quelle.
    expect(SOURCE['board']![1] * KITCHEN_SCALE).toBeCloseTo(0.575, 3);
    expect(SOURCE['counter']![1] * KITCHEN_SCALE).toBe(counter.height);
  });

  /**
   * **Die Arbeitsflächen der Zeilenmöbel liegen auf einer Höhe** — und das ist
   * die Zusage, die dreimal gebrochen wurde.
   *
   * Zweimal stand an dieser Stelle eine Begründung dafür, dass das
   * Schneidebrett 3,3 cm höher arbeitet als die Küchenzeile: Die 3,3 cm *seien*
   * das Brett, ein Brett liege nun einmal auf der Platte. Im Bild ist es
   * trotzdem eine **Stufe** in einer Reihe aus Zeile, Brett, Zeile, und
   * verlangt war eine durchgehende Platte. Sie kommt nicht daher, dass am Maß
   * des Bretts gedreht wird (das ist gemessen), sondern daher, dass das **Möbel**
   * um die Brettdicke tiefer steht (`KitchenPiece.bury`).
   *
   * Geprüft wird deshalb `kitchenWorkHeight` und nicht `kitchenDeck`: Das eine
   * misst über dem Boden, das andere über dem Fuß des Möbels — und genau dieser
   * Unterschied ist der ganze Umbau.
   */
  it('legt die Arbeitsflächen der Zeilenmöbel auf eine Höhe', () => {
    const line = kitchenWorkHeight(kitchenPiece('counter')!);
    // Die Küchenzeile ist das Maß: Korpus 1,000 in der Quelle, halbiert.
    expect(line).toBeCloseTo(1 * KITCHEN_SCALE, 6);
    // Die Möbel, die in dieser Küche in einer Reihe stehen — welche das sind,
    // steht im Aufbau und wird dort auch geprüft
    // (`worlds/test/zones/kitchenPlan.test.ts`).
    for (const name of ['counter', 'board', 'table', 'plate-counter', 'extinguisher']) {
      const piece = kitchenPiece(name)!;
      expect({ name, top: kitchenWorkHeight(piece).toFixed(3) }).toEqual({
        name,
        top: line.toFixed(3),
      });
    }
    // Der Herd ist die begründete Ausnahme: Sein **Blech** liegt bei 1,000 in
    // der Quelle, also bündig mit der Zeile; die 5 cm darüber sind die
    // Kochstelle, und darauf steht ein Topf.
    for (const name of ['stove', 'stove-pot', 'stove-pan']) {
      expect({ name, top: kitchenWorkHeight(kitchenPiece(name)!) }).toEqual({ name, top: 0.55 });
    }
    expect(SOURCE['stove']![1] - 1).toBeCloseTo(0.1, 6);
  });

  /**
   * **Im Boden steckt nur, was dort niemand vermisst.** `bury` ist ein
   * Ausgleich von Zentimetern und keine Grube: Ein Möbel, das um einen halben
   * Meter versenkt würde, wäre ein Loch im Fußboden mit einer Platte darüber —
   * und seine Schubladen, seine Griffe und beim Schneidebrett das Brett selbst
   * wären weg. Deshalb bleibt es unter einem Zehntelmeter und unter der eigenen
   * Ablagehöhe.
   */
  it('versenkt kein Möbel weiter als seine Sockelleiste', () => {
    const sunk = KITCHEN_PIECES.filter((piece) => piece.bury);
    expect(sunk.map((piece) => piece.name)).toEqual(['board']);
    for (const piece of KITCHEN_PIECES) {
      const bury = piece.bury ?? 0;
      expect({ name: piece.name, ok: bury >= 0 && bury < 0.1 }).toEqual({
        name: piece.name,
        ok: true,
      });
      // Was oben herausragt, bleibt sichtbar — beim Brett 0,57 − 0,033 =
      // 0,537 m bis zur Messerspitze, mit der Brettoberfläche bei 0,50 m.
      expect(kitchenWorkHeight(piece)).toBeGreaterThan(0.1);
      expect(piece.height - bury).toBeGreaterThan(kitchenWorkHeight(piece) - 1e-9);
    }
  });

  /**
   * **Die Mulde der Pfanne liegt nicht in der Mitte der Pfanne.**
   *
   * Der Stiel zieht die Hülle zur Seite, und der Ursprung der abgenommenen
   * Pfanne sitzt in der Mitte dieser Hülle (`core/kitchenModel.takeUtensil`).
   * `PAN_BOWL` ist der gemessene Abstand von dort zur Mulde — siehe die
   * Rechnung an der Konstanten.
   */
  it('setzt den Belag der Pfanne in die Mulde und nicht auf den Stiel', () => {
    const [x, z] = PAN_BOWL;
    // Der Stiel steht mittig in x — dort ist nichts auszugleichen.
    expect(x).toBe(0);
    // Und er zeigt nach Süden, der Ausgleich also nach Norden.
    expect(z).toBeLessThan(0);
    // (1,2198 + (−0,9372)) / 2 = +0,1413 ist die Mitte der Hülle,
    // −0,9372 + 1,2560 / 2 = −0,3092 die der Mulde; halbiert bleiben −0,225 m.
    const hull = (1.2198 + -0.9372) / 2;
    const bowl = -0.9372 + 1.256 / 2;
    expect(z).toBeCloseTo((bowl - hull) * KITCHEN_SCALE, 3);
    // Und der Versatz bleibt innerhalb der Pfanne: Ihr Halbmesser ist
    // 1,256 / 2 halbiert, also 0,314 m.
    expect(Math.abs(z)).toBeLessThan((1.256 / 2) * KITCHEN_SCALE);
  });

  /**
   * **Der Feuerlöscher steht auf einem Hocker, und der Hocker ist die
   * Ablage.** In der Datei ist `extinguisher` zweigeteilt wie ein Herd mit
   * Topf: ein Korpus bis 1,00 m (Quellmaß) und darüber ein eigenes Netz aus
   * `Kitchen_Utensils` bis 2,50 m. `height` ist die Oberkante des Löschers,
   * `deck` die des Hockers — wer beides verwechselt, stellt den Löscher beim
   * Zurückstellen auf seine eigene Kappe.
   */
  it('nimmt den Feuerlöscher vom Hocker und legt ihn auf den Hocker zurück', () => {
    const piece = kitchenPiece('extinguisher')!;
    expect(piece.holds).toBe('extinguisher');
    // Ohne Ablage meldet sich die Stelle nicht, und dann wird auch nichts
    // abgenommen (`worlds/test/zones/kitchen.ts`, `addStations`).
    expect(piece.worktop).toBe(true);
    // Der Hocker: halbe Höhe des Korpus aus der Quelle (1,00 m).
    expect(kitchenDeck(piece)).toBeCloseTo(1 * KITCHEN_SCALE, 2);
    // Der Löscher darüber: gut drei Viertel Meter hoch.
    expect(piece.height - kitchenDeck(piece)).toBeCloseTo(0.75, 2);
  });
});
