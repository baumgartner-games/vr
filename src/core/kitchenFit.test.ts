import {
  KITCHEN_NAMES,
  KITCHEN_PIECES,
  KITCHEN_SCALE,
  PAN_BOWL,
  SINK_BOWL,
  SINK_SUNK,
  SINK_TRAY,
  kitchenDeck,
  kitchenPiece,
  kitchenWorkHeight,
} from './kitchenFit';
import { PLAN_WALL_T } from '../worlds/editor/levelPlan';
import { TILE } from '../worlds/nav/navTile';
import { KITCHEN } from '../worlds/test/layout';

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
  // **Die Spüle steht als ihre beiden Hälften darin.** Der Knoten `sink` der
  // Datei ist 4 × 2,3 × 2,12 m groß und wird beim Laden bei x = 0 zerschnitten
  // (`core/kitchenModel.splitSink`) — nachzumessen sind also die Hälften, und
  // ihre Breiten müssen die ganze Spüle wieder ergeben (siehe der Test unten).
  // Das Becken behält dabei die volle Höhe: Auf ihm steht die Armatur.
  'sink-basin': [2, 2.3, 2.12],
  // Und 1,035 ausnahmsweise auf drei Stellen: Der Rand liegt bei y = 1,034858,
  // halbiert 0,5174 m — auf zwei Stellen gerundet läge die Quelle mit 1,03
  // genau auf der Grenze, ab der der Katalog auf 0,51 oder 0,52 rundet.
  'sink-drain': [2, 1.035, 2.12],
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
 * **Der Korpus je Möbel**, ebenfalls in Quellmaß: seine **hintere** und seine
 * **vordere** Kante in z, abgelesen aus `public/models/kitchen.glb` (Netz
 * `Kitchen_Cabins`, bei Spüle und Theke `Kitchen_Cabins_Double`).
 *
 * Eine zweite Tabelle neben `SOURCE`, und sie misst ausdrücklich etwas
 * anderes: `SOURCE` nennt die **Hülle** — was ein Möbel belegt, und daran
 * hängen Kachelzahl und Höhe —, `BODY` die **Kanten, die man sieht**. Zwischen
 * beiden liegt bei der Küchenzeile ihr **Türgriff** (z = +0,9291 … +1,0612 auf
 * y = 0,3…0,5) und beim Herd die **Blende mit den Knöpfen** (+0,8180 …
 * +1,0634 auf y = 0,3…0,7). Beides steht über, beides ist keine Arbeitsplatte,
 * und beides zieht beim Zentrieren den Korpus in die Gegenrichtung
 * (`core/kitchenFit.KitchenPiece.align`).
 *
 * **Genau an dieser Verwechslung hing der Versatz des Schneidebretts einmal
 * mit dem falschen Vorzeichen**: Verglichen wurde die Hülle der Zeile (2,1224)
 * mit dem Korpus des Bretts (1,9998), und der Unterschied zwischen ihnen war
 * der Griff. Wer die Quelle austauscht, misst diese Kanten neu — und sieht an
 * den Tests darunter, welcher Versatz nachzuziehen ist.
 */
const BODY: Readonly<Record<string, readonly [back: number, front: number]>> = {
  counter: [-1.0612, 0.9386],
  'plate-counter': [-1.0612, 0.9386],
  // Beide Hälften der Spüle: Zerschnitten wird bei x = 0
  // (`core/kitchenModel.splitSink`), in z bleibt das Profil der ganzen Spüle
  // stehen — und es ist das der Küchenzeile, Griff inbegriffen.
  'sink-basin': [-1.0612, 0.9386],
  'sink-drain': [-1.0612, 0.9386],
  // Ohne Griff, dafür mittig: gleich tief wie die Zeile, aber 0,0613 weiter
  // südlich zentriert.
  board: [-0.9999, 0.9999],
  extinguisher: [-0.9999, 0.9999],
  // Das Blech der Herde — 1,8420 tief und damit das flachste Möbel der Zeile.
  stove: [-1.0634, 0.7786],
  'stove-pot': [-1.0634, 0.7786],
  // Dasselbe Blech, vom Pfannenstiel um 0,1564 nach Norden gezogen.
  'stove-pan': [-1.2198, 0.6221],
};

/**
 * **Wo eine Korpuskante im Spiel liegt**, in Metern vor (+, Süden) oder hinter
 * (−, Norden) der Kachelmitte: Quellmaß halbiert, Versatz dazu.
 *
 * Die eine Rechnung, die alle Zeilenprüfungen teilen — sie ist dieselbe, die
 * `worlds/test/zones/kitchen.ts`, `standAt`, beim Hinstellen macht, nur ohne
 * Drehung: In der Nordzeile steht alles mit `turn: 0`.
 */
function edge(name: string, side: 0 | 1): number {
  return BODY[name]![side] * KITCHEN_SCALE + (kitchenPiece(name)!.align?.[1] ?? 0);
}

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
   * **Der Versatz bleibt in der Kachel.** Er gleicht aus, dass der Ursprung
   * eines Möbels in der Mitte seiner **Hülle** liegt und nicht in der seines
   * Korpus (`KitchenPiece.align`) — ein Türgriff, ein Pfannenstiel, eine
   * Blende mit Knöpfen. Das sind ein paar Zentimeter; wer hier einen halben
   * Meter einträgt, stellt ein Möbel auf die Nachbarkachel, ohne dass der
   * Grundriss davon wüsste.
   */
  it('rückt kein Möbel weiter als eine halbe Kachel aus der Mitte', () => {
    const shifted = KITCHEN_PIECES.filter((piece) => piece.align);
    // In der Reihenfolge des Katalogs, und es sind genau die fünf Möbel der
    // Nordzeile, deren Korpus nicht von allein auf der Linie der Küchenzeile
    // sitzt: der Löscherhocker, das Schneidebrett und die drei Herde.
    expect(shifted.map((piece) => piece.name)).toEqual([
      'extinguisher',
      'board',
      'stove',
      'stove-pot',
      'stove-pan',
    ]);
    for (const piece of KITCHEN_PIECES) {
      const [x, z] = piece.align ?? [0, 0];
      // **Zur Seite rückt keines.** Alle gemessenen Überstände dieser Quelle
      // zeigen nach vorn oder nach hinten — ein Versatz in x wäre ein Möbel,
      // das aus der Reihe nach links oder rechts tritt, und den gibt es nicht.
      expect({ name: piece.name, x }).toEqual({ name: piece.name, x: 0 });
      expect(Math.abs(z)).toBeLessThan(0.5);
    }
    // Der Herd mit der Pfanne trägt die Summe aus beidem: 7,8 cm gegen den
    // Stiel (Korpus −1,2198 … +0,6221 statt −1,0634 … +0,7786) und 8,0 cm für
    // die Vorderkante der Zeile.
    const pan = kitchenPiece('stove-pan')!.align![1];
    const stove = kitchenPiece('stove')!.align![1];
    expect(pan - stove).toBeCloseTo((BODY['stove']![1] - BODY['stove-pan']![1]) * KITCHEN_SCALE, 3);
  });

  /**
   * **Die Zeile an der Nordwand hat eine Vorderkante, und es ist die der
   * Küchenzeile.**
   *
   * Geprüft wird die **Beziehung** und nicht die Zahl: Aus den gemessenen
   * Korpuskanten (`BODY`) und dem Versatz aus dem Katalog wird ausgerechnet,
   * wo jedes Möbel der Reihe vorn aufhört — und das muss überall dieselbe
   * Stelle sein. Wer eine der beiden Seiten ändert, sieht hier, was die andere
   * kostet.
   *
   * Dass es ohne Versatz **keine** Linie wäre, steht mit im Test: Vier
   * verschiedene Vorderkanten liegen in der Quelle nebeneinander (0,469 der
   * Zeile, 0,500 von Brett und Hocker, 0,389 der Herde, 0,311 des Herds mit
   * Pfanne). Ein Test, der nur die fertigen Zahlen gegeneinanderhielte, wäre
   * grün, auch wenn alle fünf Einträge fehlten.
   */
  it('stellt die Möbel der Nordzeile auf eine Vorderkante', () => {
    // Die Zeile an der Nordwand, von Westen nach Osten
    // (`worlds/test/zones/kitchenPlan.KITCHEN_SPOTS`, x = 0…10).
    const row = [
      'counter',
      'stove',
      'stove-pot',
      'stove-pan',
      'extinguisher',
      'sink-basin',
      'sink-drain',
      'board',
      'plate-counter',
    ];
    // Das Maß ist die Küchenzeile, und sie rückt selbst nicht: 0,9386 / 2.
    const line = edge('counter', 1);
    expect(kitchenPiece('counter')!.align).toBeUndefined();
    expect(line).toBeCloseTo(0.4693, 4);
    for (const name of row) {
      expect({ name, front: edge(name, 1).toFixed(3) }).toEqual({ name, front: line.toFixed(3) });
    }
    // Und ohne Versatz stünde dort vierlei.
    const raw = new Set(row.map((name) => (BODY[name]![1] * KITCHEN_SCALE).toFixed(3)));
    expect([...raw].sort()).toEqual(['0.311', '0.389', '0.469', '0.500']);
    // **Wer gleich tief ist, fluchtet danach auch hinten.** Brett und
    // Löscherhocker sind auf den Millimeter so tief wie die Zeile (2,0000 in
    // der Quelle) — eine bündige Vorderkante heißt bei ihnen also zugleich
    // eine bündige Hinterkante, und die alte Klage über die doppelte Lücke zur
    // Wand ist damit gegenstandslos.
    for (const name of ['board', 'extinguisher', 'plate-counter', 'sink-basin', 'sink-drain']) {
      const deep = (BODY[name]![1] - BODY[name]![0]) * KITCHEN_SCALE;
      expect({ name, deep: deep.toFixed(4) }).toEqual({
        name,
        deep: ((BODY['counter']![1] - BODY['counter']![0]) * KITCHEN_SCALE).toFixed(4),
      });
      expect({ name, back: edge(name, 0).toFixed(3) }).toEqual({
        name,
        back: edge('counter', 0).toFixed(3),
      });
    }
  });

  /**
   * **Die Kochstelle steht so weit vor der Wand, wie die Zeile es zulässt** —
   * und das ist nicht ganz, sondern gemessen knapp.
   *
   * Der Herd war der Grund für den ganzen Umbau: Sein Blech ist ein
   * **aufgesetzter Klotz** und keine flache Rückwand, und was davon hinter der
   * Wandinnenseite liegt, ist im Bild abgeschnitten. Mit Versatz 0 waren das
   * 13,2 cm von 92,1 — deutlich zu sehen, weil die Platte vorn zugleich 8 cm
   * hinter den Arbeitsplatten zurückstand: hinten in der Wand, vorn eine Lücke.
   *
   * **Beides zugleich geht nicht**, und dieser Test rechnet genau das nach:
   * Zwischen der Innenseite der 0,2 m dicken Nordwand und der Vorderkante der
   * Zeile liegen 0,8693 m, das Blech ist 0,9210 m tief. Die 5,2 cm Unterschied
   * bleiben hinten in der Wand — dort, wo die Küchenzeile daneben ohnehin mit
   * 13,1 cm steht und wo von der Kamera aus (`core/topDownPose.ts`) nichts im
   * Bild ist.
   */
  it('holt die Kochstelle so weit aus der Wand, wie die Zeile es zulässt', () => {
    // **Wo die Wand steht, wird gerechnet und nicht angenommen**: Sie sitzt auf
    // der Nordkante der Zone und ist 0,2 m dick (`worlds/editor/levelPlan`,
    // `PLAN_WALL_T`), die Zeile steht auf der ersten Kachelreihe darin
    // (`worlds/test/layout.KITCHEN`). Wer die Küche verschiebt oder die Wand
    // dicker macht, kommt hier vorbei.
    const face = (KITCHEN.z + 0.5) * TILE - (KITCHEN.z * TILE + PLAN_WALL_T / 2);
    expect(face).toBeCloseTo(0.4, 6);
    const line = edge('counter', 1);
    /** Wie weit ein Möbel hinter die Innenseite der Wand reicht, in Metern. */
    const buried = (name: string) => -edge(name, 0) - face;
    // Die ganze Zeile steht in der Wand, und zwar seit je: Ihr Korpus ist
    // 0,9999 m tief, die Kachel misst 1 m, und 0,1 m davon gehören der Wand.
    expect(buried('counter')).toBeCloseTo(0.131, 3);
    // Der Herd steckt jetzt **weniger** tief darin als jede Küchenzeile neben
    // ihm — vorher waren es 13,2 cm und damit mehr.
    expect(buried('stove')).toBeCloseTo(0.052, 3);
    expect(buried('stove')).toBeLessThan(buried('counter'));
    expect(buried('stove-pot')).toBeCloseTo(buried('stove'), 6);
    expect(buried('stove-pan')).toBeCloseTo(buried('stove'), 2);
    // **Und weiter geht es nicht, ohne die Vorderkante zu verlieren.** Das
    // Blech ist um genau diese 5,2 cm tiefer als der Platz zwischen
    // Wandinnenseite und Zeilenlinie.
    const plate = (BODY['stove']![1] - BODY['stove']![0]) * KITCHEN_SCALE;
    expect(plate).toBeCloseTo(0.921, 3);
    expect(plate - (face + line)).toBeCloseTo(buried('stove'), 3);
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
    expect(sunk.map((piece) => piece.name)).toEqual(['sink-basin', 'sink-drain', 'board']);
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

/**
 * **Aus einer Spüle sind zwei Möbel geworden**, und dieser Block rechnet die
 * Zerlegung nach — nicht das Netz (das ist `core/kitchenModel.splitSink` und
 * braucht eine Datei), sondern die Zahlen, die im Katalog davon stehen.
 *
 * Der Spieltest hat es so gefordert: „Das Waschbecken müssen wir in 2 Elemente
 * teilen. Das Waschbecken selbst und das Abstellbrett-Element." Die beiden
 * Hälften sind seither zwei Stücke mit zwei Stationen — im Becken wird gespült,
 * auf dem Brett stehen die sauberen Teller.
 */
describe('die geteilte Spüle', () => {
  const basin = kitchenPiece('sink-basin')!;
  const drain = kitchenPiece('sink-drain')!;

  it('macht aus dem einen Knoten zwei Möbel von je einer Kachel', () => {
    expect([basin.name, drain.name]).toEqual(['sink-basin', 'sink-drain']);
    expect(basin.tiles).toEqual([1, 1]);
    expect(drain.tiles).toEqual([1, 1]);
    // **Und zusammen sind sie wieder die ganze Spüle.** Der Knoten `sink` ist
    // in der Quelle 4 m breit; jede Hälfte misst 2 m, weil die Naht auf x = 0
    // liegt und das Netz dort von −2,000 bis +2,000 reicht. Wer die Naht
    // verschiebt, sieht es hier.
    expect(SOURCE['sink-basin']![0] + SOURCE['sink-drain']![0]).toBe(4);
    // Tiefe unverändert: Geschnitten wird in x, nicht in z.
    expect(SOURCE['sink-basin']![2]).toBe(SOURCE['sink-drain']![2]);
    // Die Armatur steht auf dem Becken, also ist nur diese Hälfte hoch.
    expect(basin.height).toBeGreaterThan(drain.height * 2);
  });

  /**
   * **Der Beckenrand reiht sich in die Zeile ein.** Er liegt in der Quelle bei
   * y = 1,034858 (halbiert 0,5174 m) und damit 1,74 cm über der Küchenzeile —
   * eine Stufe mitten in der Nordwand, dieselbe Sorte Fehler wie beim
   * Schneidebrett, nur halb so hoch. `SINK_SUNK` nimmt sie unten wieder weg.
   */
  it('legt den Rand beider Hälften auf die Höhe der Küchenzeile', () => {
    const line = kitchenWorkHeight(kitchenPiece('counter')!);
    expect(line).toBeCloseTo(0.5, 6);
    expect(SINK_BOWL.rim - SINK_SUNK).toBeCloseTo(line, 3);
    // Beide Hälften stecken gleich tief — zwei Hälften eines Möbels mit einer
    // Kante dazwischen wären zwei Möbel.
    expect(basin.bury).toBe(SINK_SUNK);
    expect(drain.bury).toBe(SINK_SUNK);
    // Und was im Boden steckt, ist Sockel und kein Stück Möbel: Unterhalb von
    // y = 0,05 (Quelle) steht der Korpus ohnehin hinter der Deckplatte zurück.
    expect(SINK_SUNK).toBeLessThan(0.05 * KITCHEN_SCALE);
  });

  /**
   * **Im Becken wird hineingelegt und nicht daraufgelegt.** `deck` ist deshalb
   * nicht der Rand, sondern der Wasserspiegel — und der liegt auf halber
   * Beckentiefe, weil genau dort der schräge Teller zur Hälfte eintaucht
   * (`worlds/test/zones/kitchenProps.SINK_TILT`).
   */
  it('setzt die Ablage des Beckens auf den Wasserspiegel', () => {
    expect(kitchenDeck(basin)).toBe(SINK_BOWL.water);
    expect(SINK_BOWL.water).toBeCloseTo((SINK_BOWL.rim + SINK_BOWL.floor) / 2, 4);
    // Das Becken ist 14,4 cm tief (Quelle 1,034858 − 0,746379 = 0,288479).
    expect(SINK_BOWL.rim - SINK_BOWL.floor).toBeCloseTo(0.288479 * KITCHEN_SCALE, 3);
  });

  /**
   * **Und das Abtropfbrett ist flach.** Genau daran unterscheidet die Quelle
   * die beiden Seiten: links eine Mulde von 14,4 cm, rechts eine Riffelwanne
   * von 7,6 cm. Wäre es andersherum, hätten wir zwei Becken und kein Brett.
   */
  it('gibt dem Abtropfbrett eine flache Wanne statt eines zweiten Beckens', () => {
    expect(kitchenDeck(drain)).toBe(SINK_TRAY.floor);
    const tray = SINK_BOWL.rim - SINK_TRAY.floor;
    expect(tray).toBeCloseTo(0.038, 3);
    expect(tray).toBeLessThan((SINK_BOWL.rim - SINK_BOWL.floor) / 2);
    // Beide Mulden sitzen spiegelbildlich zur Naht — dieselbe Zahl mit
    // umgekehrtem Vorzeichen, und in z gleich weit nach Norden versetzt.
    expect(SINK_BOWL.at[0]).toBeCloseTo(-SINK_TRAY.at[0], 6);
    expect(SINK_BOWL.at[1]).toBe(SINK_TRAY.at[1]);
    // Und beide bleiben innerhalb ihrer Kachel (1 m).
    for (const tub of [SINK_BOWL, SINK_TRAY]) {
      expect(Math.abs(tub.at[0]) + tub.width / 2).toBeLessThan(0.5);
      expect(Math.abs(tub.at[1]) + tub.depth / 2).toBeLessThan(0.5);
    }
  });
});
