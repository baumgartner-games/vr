import {
  KITCHEN_NAMES,
  KITCHEN_PIECES,
  KITCHEN_SCALE,
  PAN_BOWL,
  SINK_BOWL,
  SINK_SUNK,
  HOB_TOP,
  SINK_TRAY,
  kitchenDeck,
  kitchenPiece,
  kitchenWorkHeight,
} from './kitchenFit';
import { dinerPiece } from './dinerFit';

/**
 * **Die Maße der eigenen Quelldatei**, in Metern und ungeteilt — abgelesen an
 * `public/models/kitchen.glb` (Breite, Höhe, Tiefe je Knoten).
 *
 * **Drei Zeilen, nicht mehr.** Seit dem Umbau kommen fünfzehn der sechsundzwanzig
 * Katalogstücke aus dem **zweiten** Baukasten (`KitchenPiece.base`), und die
 * misst niemand hier nach: Ihre Maße stehen in `core/dinerFit.ts`, geschrieben
 * vom Werkzeug, das sie aufbereitet hat. Eine zweite Tabelle daneben wäre die,
 * die beim nächsten Austausch stehen bleibt — geprüft wird deshalb gegen den
 * anderen Katalog und nicht gegen abgeschriebene Zahlen
 * (_nimmt die Maße der neuen Möbel aus dem zweiten Katalog_).
 *
 * Was hier steht, sind die Möbel, deren Knoten in der eigenen Datei geblieben
 * sind: Mülleimer, Ausgabetheke und Ausgaberegal. Zwei Knoten liegen dort
 * außerdem und stehen trotzdem nicht in dieser Tabelle — **Pfanne** und
 * **Feuerlöscher**: Beides sind keine Möbel, sondern Geräte auf einem
 * (`stove-pan.over`, `extinguisher.over`). Der Löscher stand hier, solange er
 * seinen eigenen Hocker mitbrachte; der ist weg, und er steht seitdem auf
 * einer Arbeitsplatte wie die Pfanne auf einem Herd.
 */
const SOURCE: Readonly<Record<string, readonly [number, number, number]>> = {
  bin: [2, 0.9, 2],
  pass: [4, 1.06, 2],
  'plate-rack': [4, 1.13, 1.93],
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
    expect(kitchenPiece('sink-basin')?.label).toBe('Spülbecken');
    // Und die ganze Spüle gibt es nicht mehr — sie ist zwei Möbel.
    expect(kitchenPiece('sink')).toBeUndefined();
    // Die Namen kommen über das Netz in einem Plan an — was dort steht, hat
    // niemand geprüft.
    expect(kitchenPiece('../../etc/passwd')).toBeUndefined();
    expect(kitchenPiece('')).toBeUndefined();
  });

  it('nennt die Maße der eigenen Quelle halbiert', () => {
    expect(KITCHEN_SCALE).toBe(0.5);
    for (const piece of KITCHEN_PIECES) {
      const source = SOURCE[piece.name];
      // Drei Herkünfte und keine vierte: aus der eigenen Datei, aus dem
      // zweiten Baukasten, oder gebaut. Ein Möbel, das in keine davon fällt,
      // ist ein vergessener Eintrag und kein Sonderfall.
      const known = source !== undefined || piece.base !== undefined || piece.built === true;
      expect({ name: piece.name, known }).toEqual({ name: piece.name, known: true });
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
   * **Die neuen Möbel werden gegen den zweiten Katalog geprüft und nicht gegen
   * abgeschriebene Zahlen.**
   *
   * Zehn Stücke stehen auf Netzen aus `public/models/diner.glb`, und deren
   * Maße hat das Werkzeug dort schon nachgemessen (`core/dinerFit.ts`). Wer
   * sie hier noch einmal einträgt, führt eine zweite Wahrheit — und die ist
   * beim nächsten Austausch der Quelle die, die stehen bleibt.
   *
   * Geprüft wird deshalb der **Zusammenhang**: Der Knoten muss es geben, die
   * Kachelzahl muss dieselbe sein, und das Möbel darf nicht niedriger sein als
   * das, worauf sein Aufsatz steht.
   */
  it('nimmt die Maße der neuen Möbel aus dem zweiten Katalog', () => {
    const based = KITCHEN_PIECES.filter((piece) => piece.base);
    expect(based.map((piece) => piece.name)).toEqual([
      'plate-counter',
      'extinguisher',
      'sink-basin',
      'sink-drain',
      'table',
      'serve-counter',
      'crate-buns',
      'crate-patty',
      'crate-lettuce',
      'crate-tomatoes',
      'board',
      'counter',
      'stove',
      'stove-pot',
      'stove-pan',
    ]);
    for (const piece of based) {
      const base = dinerPiece(piece.base!.node);
      expect({ name: piece.name, node: base?.name }).toEqual({
        name: piece.name,
        node: piece.base!.node,
      });
      expect({ name: piece.name, file: piece.base!.file }).toEqual({
        name: piece.name,
        file: 'diner',
      });
      // Dieselbe Grundfläche wie das Netz darunter: Ein Möbel, das auf einer
      // Kachel steht und zwei belegt, lässt eine Lücke in der Zeile.
      expect({ name: piece.name, tiles: [...piece.tiles] }).toEqual({
        name: piece.name,
        tiles: [...base!.tiles],
      });
      if (!piece.over) {
        // Ohne Aufsatz ist die Oberkante die des Sockels.
        expect({ name: piece.name, high: piece.height.toFixed(3) }).toEqual({
          name: piece.name,
          high: base!.height.toFixed(3),
        });
        continue;
      }
      // Mit Aufsatz: Der erste steht auf dem Sockel und nicht darüber, und das
      // Möbel reicht über den letzten hinaus.
      const first = piece.over[0]!;
      const last = piece.over[piece.over.length - 1]!;
      expect({ name: piece.name, on: first.at <= base!.height + 1e-9 }).toEqual({
        name: piece.name,
        on: true,
      });
      expect({ name: piece.name, over: piece.height > last.at }).toEqual({
        name: piece.name,
        over: true,
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

  it('lässt nur gebaute und geliehene Möbel ohne eigenen Knoten durchgehen', () => {
    const built = KITCHEN_PIECES.filter((piece) => piece.built);
    expect(built.map((piece) => piece.name)).toEqual([
      'belt',
      'belt-pull',
      'belt-smart',
      'combiner',
      'mixer',
      'griddle',
      'desk',
      'copier',
    ]);
    for (const piece of KITCHEN_PIECES) {
      const own = SOURCE[piece.name] !== undefined;
      // Wer einen eigenen Knoten hat, leiht keinen und baut nichts — und
      // umgekehrt. Ein Möbel, das beides hätte, stünde doppelt da.
      expect({ name: piece.name, own }).toEqual({
        name: piece.name,
        own: piece.built !== true && piece.base === undefined,
      });
    }
    // Und ein gebautes Stück bleibt ein vollwertiges Möbel: Wer es nur halb
    // einträgt, stellt eine Kachel ohne Höhe auf.
    for (const piece of built) {
      expect(piece.height).toBeGreaterThan(0.1);
      const [w, d] = piece.tiles;
      expect(Number.isInteger(w) && w >= 1).toBe(true);
      expect(Number.isInteger(d) && d >= 1).toBe(true);
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
    expect(kitchenDeck(kitchenPiece('stove-pot')!)).toBe(HOB_TOP);
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
   * **Kein Möbel rückt mehr aus der Mitte seiner Kachel** — und das ist die
   * Probe darauf, dass der zweite Baukasten hält, was er verspricht.
   *
   * Der erste zentrierte jedes Möbel in seiner **Hülle**, und weil eine Hülle
   * nicht der Korpus ist, brauchten fünf Stücke einen nachgemessenen Versatz
   * (`align`): Der Türgriff der Küchenzeile allein schob sie um 3,07 cm, die
   * Herde sprangen 8 cm hinter die Zeile zurück, der Pfannenstiel noch einmal
   * 7,8 cm. Der zweite Baukasten ist auf einem Raster gebaut und lässt jeden
   * Ursprung stehen (`core/dinerFit.ts`) — da gibt es nichts auszugleichen.
   *
   * Das Feld bleibt trotzdem: Die vier Stücke aus der eigenen Datei stehen
   * mittig, aber die nächste Quelle tut es vielleicht nicht.
   */
  it('rückt kein Möbel aus der Mitte seiner Kachel', () => {
    expect(KITCHEN_PIECES.filter((piece) => piece.align)).toEqual([]);
  });

  /**
   * **Auf dem Brett wird geschnitten, nicht auf dem Tisch darunter.**
   *
   * Das Schneidebrett ist seit dem Umbau wirklich eines: ein Arbeitstisch
   * (`kitchentable_B`) mit einem Brett von 7,5 cm darauf. Seine Schnittfläche
   * liegt damit **über** der Zeile daneben und nicht mehr bündig mit ihr — der
   * alte Katalog versenkte das Brett um 3,3 cm im Estrich, damit die Reihe eine
   * durchgehende Platte ergab. Das ging, solange das Brett selbst das Möbel
   * war; ein Tisch, der im Boden steckt, ist keiner.
   */
  it('legt die Schnittfläche auf das Brett und nicht auf den Tisch', () => {
    const board = kitchenPiece('board')!;
    const counter = kitchenPiece('counter')!;
    expect(board.base?.node).toBe('kitchencounter_straight_A');
    expect(board.over?.map((step) => step.node)).toEqual(['cuttingboard', 'knife']);
    // Das Brett liegt auf der Tischplatte, und die liegt auf Zeilenhöhe.
    expect(board.over![0]!.at).toBeCloseTo(counter.height, 6);
    // Die Schnittfläche ist die Oberkante des Bretts — und die Oberkante des
    // **Möbels** ist seitdem das Messer, das darin steckt.
    expect(kitchenDeck(board) - counter.height).toBeCloseTo(0.075, 3);
    expect(board.height).toBeGreaterThan(kitchenDeck(board));
  });

  /**
   * **Die Zeile bleibt eine Platte** — bis auf das Brett, und das mit Absicht.
   *
   * Küchenzeile, Arbeitstisch, Tellerausgabe, Ausgabe und Löscherplatte legen
   * ihre Arbeitsfläche auf **einen halben Meter**: Wer daran entlanggeht,
   * schiebt etwas über eine durchgehende Fläche und hebt es nicht alle zwei
   * Kacheln über eine Stufe. Ein halber Meter ist zugleich die Zahl, die zum
   * Koch von 1,60 m passt (`core/chefFit.ts`).
   *
   * **Die Kochstellen liegen höher**, und das ist keine Stufe, sondern ein
   * Rost: Auf einem Herd steht ein Topf, und der steht auf Gusseisen und nicht
   * in der Arbeitsplatte.
   */
  it('legt die Arbeitsflächen der Zeilenmöbel auf eine Höhe', () => {
    const line = ['counter', 'table', 'plate-counter', 'serve-counter', 'extinguisher'];
    for (const name of line) {
      const piece = kitchenPiece(name)!;
      expect({ name, top: kitchenWorkHeight(piece).toFixed(3) }).toEqual({
        name,
        top: (0.5).toFixed(3),
      });
    }
    // Das Brett liegt eine Brettdicke darüber, die Herde auf ihrem Rost — und
    // dessen Höhe ist nicht gerundet, sondern am Netz gemessen (`HOB_TOP`).
    expect(kitchenWorkHeight(kitchenPiece('board')!)).toBeCloseTo(0.575, 3);
    expect(HOB_TOP).toBeCloseTo(dinerPiece('stove_single')!.height, 6);
    for (const name of ['stove', 'stove-pot', 'stove-pan', 'griddle']) {
      expect({ name, top: kitchenWorkHeight(kitchenPiece(name)!).toFixed(4) }).toEqual({
        name,
        top: HOB_TOP.toFixed(4),
      });
    }
  });

  /**
   * **Kein Möbel steckt mehr im Estrich.**
   *
   * `bury` glich aus, was der erste Baukasten schief lieferte: Das
   * Schneidebrett lag 3,3 cm zu hoch, die Spülenhälften 1,7 cm. Die Möbel des
   * zweiten stehen auf ihrem eigenen Boden, also gibt es nichts zu versenken —
   * und `SINK_SUNK` ist folgerichtig null geworden.
   */
  it('versenkt kein Möbel mehr im Boden', () => {
    expect(SINK_SUNK).toBe(0);
    expect(KITCHEN_PIECES.filter((piece) => piece.bury)).toEqual([]);
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

/**
 * **Die Spüle** — zwei Möbel, und seit dem Umbau auch zwei Netze.
 *
 * Sie war einmal **ein** Knoten von vier Metern, aus dem der Lader zwei
 * Kacheln schnitt (`core/kitchenModel.splitSink`, knapp zweihundert Zeilen
 * Geometriechirurgie). Der zweite Baukasten hat eine Spüle von **einer**
 * Kachel und ein Abtropfgitter, das man daneben stellt — geschnitten wird
 * nichts mehr, und die beiden Hälften sind einfach zwei Möbel.
 *
 * Was bleibt, ist die Aufteilung der Arbeit: Im **Becken** wird gespült, auf
 * dem **Abtropfbrett** stehen die sauberen Teller
 * (`worlds/test/zones/kitchenPlan.STATION_KINDS`).
 */
describe('die Spüle', () => {
  const basin = kitchenPiece('sink-basin')!;
  const drain = kitchenPiece('sink-drain')!;

  it('steht auf zwei Netzen von je einer Kachel', () => {
    expect(basin.tiles).toEqual([1, 1]);
    expect(drain.tiles).toEqual([1, 1]);
    expect(basin.base).toEqual({ file: 'diner', node: 'kitchencounter_sink' });
    expect(drain.base).toEqual({ file: 'diner', node: 'kitchencounter_straight_A' });
    // Das Becken ist deutlich höher als das Brett daneben, und das ist die
    // **Armatur**: Sie steht auf 0,90 m, die Wanne liegt bei 0,54 m.
    expect(basin.height).toBeGreaterThan(drain.height);
    expect(SINK_BOWL.rim).toBeLessThan(basin.height);
  });

  /**
   * **Die Wanne ist flach, und das ist nachgemessen und nicht geschätzt.**
   *
   * Im Netz gibt es zwischen Wannenboden und Wannenrand **keine** Stufe: Die
   * einzige waagerechte Fläche im Beckenbereich liegt bei 0,54 m und misst
   * 0,70 × 0,385 m. Der erste Baukasten hatte dort ein Becken von 14 cm Tiefe;
   * dieses ist eine Mulde. Ein Teller liegt darin flach statt schräg — und
   * genau deshalb rechnet `kitchenProps.SINK_TILT` heute null heraus, ohne dass
   * jemand eine Sonderregel dafür schreiben musste.
   */
  it('hat eine flache Wanne statt eines tiefen Beckens', () => {
    expect(SINK_BOWL.floor).toBe(SINK_BOWL.rim);
    expect(SINK_BOWL.water).toBeGreaterThan(SINK_BOWL.rim);
    expect(SINK_BOWL.water - SINK_BOWL.rim).toBeLessThan(0.01);
    // Die Ablage des Beckens ist der Wasserspiegel: Ein Teller liegt im Wasser
    // und nicht daneben.
    expect(kitchenDeck(basin)).toBe(SINK_BOWL.water);
  });

  it('stellt die sauberen Teller in ein Gitter über der Zeile', () => {
    expect(drain.over).toEqual([{ file: 'diner', node: 'dishrack', at: 0.5 }]);
    expect(kitchenDeck(drain)).toBe(SINK_TRAY.floor);
    // Der Gitterboden liegt 2,5 cm über der Zeile — flach genug, dass ein
    // Teller darin liegt und nicht darüber schwebt.
    expect(SINK_TRAY.floor - 0.5).toBeCloseTo(0.025, 3);
    // Und schmaler als die Wanne: Ein Gitter ist kein Becken.
    expect(SINK_TRAY.width).toBeLessThan(SINK_BOWL.width);
  });

  it('lässt beide Hälften auf dem Boden stehen', () => {
    expect(SINK_SUNK).toBe(0);
    expect(basin.bury).toBeUndefined();
    expect(drain.bury).toBeUndefined();
  });
});
