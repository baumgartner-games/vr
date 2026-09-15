/**
 * **Der Möbelkatalog der Küche** — was es gibt, wie groß es ist und wie es
 * heißt. Ohne three.js, ohne Vite, ohne Datei.
 *
 * Getrennt von `core/kitchenModel.ts` aus demselben Grund wie bei der Figur
 * (`core/chefFit.ts`): Der Lader dort braucht `GLTFLoader` und `import.meta`,
 * und beides gibt es in Jest nicht. Was ein Editor über ein Möbel wissen muss
 * — Name, Beschriftung, Grundfläche, Höhe —, sind Zahlen, und die stehen hier.
 *
 * Geschrieben werden sie von `tools/kitchen-model.mjs --list`. Wer die Quelle
 * austauscht, lässt das Werkzeug laufen und trägt die neue Liste ein — und
 * rechnet dabei `KITCHEN_SCALE` mit, siehe dort.
 */

/**
 * **Die Möbel kommen doppelt so groß, wie sie sein sollen** — also halbiert.
 *
 * Nachgemessen an der Datei: Eine Spüle ist dort 4 × 2,1 m groß und 2,3 m
 * hoch, ein Feuerlöscher 2 × 2 m und 2,5 m hoch, und der schmalste Unterschrank
 * belegt 2 × 2 m. Das ist keine Küche, das ist eine Turnhalle: Neben einem Koch
 * von 1,60 m (`core/chefFit.ts`) reichte ein Tresen bis über die Augen, und ein
 * einzelner Schrank war fünfmal so breit wie die Figur davor.
 *
 * Halbiert stimmt es: Ein Unterschrank belegt **eine** Kachel und ist einen
 * halben Meter hoch — beim Vorbild liegt die Arbeitsplatte auf einem guten
 * Drittel der Figurenhöhe, und genau dort liegt sie jetzt auch.
 *
 * Der Faktor sitzt am **Lader** (`core/kitchenModel.ts`) und nicht in der
 * Quelldatei: Die ist fremde Arbeit und wird nicht angefasst, und ein zweites
 * Aufbereiten für eine Zahl wäre 32 MB Rohdaten für einen Faktor. Die Maße in
 * diesem Katalog sind die **fertigen** — was hier steht, ist, wie groß ein
 * Möbel im Spiel ist.
 */
export const KITCHEN_SCALE = 0.5;

/** Ein Möbel im Katalog. */
export interface KitchenPiece {
  /** Der Name des Knotens in `public/models/kitchen.glb`. */
  readonly name: string;
  /** Wie es im Menü heißt. */
  readonly label: string;
  /** Wie viele Kacheln es belegt (`worlds/nav/navTile.TILE` = 1 m). */
  readonly tiles: readonly [x: number, z: number];
  /** Wie hoch es ist, in Metern — für Kopffreiheit und Sicht. */
  readonly height: number;
  /**
   * Ob es **hängt** statt zu stehen: Dann ist `height` seine Oberkante und
   * darunter läuft man durch.
   *
   * **In dieser Fassung der Quelle tut es keines.** Der Katalog führte das
   * Ausgaberegal als hängendes Stück von 3,52 m — die Datei sagt etwas
   * anderes: Es fängt wie jedes andere Möbel bei y = 0 an und ist 1,13 m hoch,
   * also ein Regal, das auf dem Boden steht. Das war keine Kleinigkeit,
   * sondern ein Loch: Ein hängendes Stück bekommt weder Körper noch
   * Wegaufschlag (`worlds/test/zones/kitchen.ts`), und man lief mitten durch
   * das Regal hindurch. Das Feld bleibt trotzdem — eine Dunstabzugshaube in
   * einer nächsten Quelle braucht es wieder.
   */
  readonly hanging?: boolean;

  /**
   * **Wo die Arbeitsfläche liegt**, in Metern über dem Boden — dort landet,
   * was jemand ablegt (`worlds/test/zones/kitchen.ts`).
   *
   * Sie ist bei den meisten Möbeln dasselbe wie `height`, und deshalb steht
   * sie nur dort, wo sie es **nicht** ist: Auf dem Herd mit dem Topf ist
   * `height` die Oberkante des **Topfes** (0,87 m) und nicht die der Platte
   * (0,55 m) — ein Brötchen, das auf `height` abgelegt würde, schwebte eine
   * Handbreit über dem Deckel.
   */
  readonly deck?: number;

  /**
   * Ob man auf diesem Möbel **etwas ablegen** kann.
   *
   * Nicht jede waagerechte Fläche ist eine: In den Mülleimer wird geworfen
   * und nicht gelegt, und das Ausgaberegal steht über der Theke
   * (`worlds/test/zones/kitchen.ts`).
   *
   * **Umgekehrt ist jedes Möbel mit `holds` eine.** Der Hocker unter dem
   * Feuerlöscher sah lange nach keiner Ablage aus — bis der Löscher in die
   * Hand soll: Wohin er zurückgestellt wird, ist eine Fläche. Ohne dieses
   * Feld meldet sich die Stelle gar nicht erst, und dann wird auch nichts
   * abgenommen (`worlds/test/zones/kitchen.ts`, `addStations`: Ein Möbel
   * ohne Stationsart und ohne `worktop` wird übersprungen, `holds` hin oder
   * her).
   */
  readonly worktop?: boolean;

  /**
   * **Was man von diesem Möbel herunternehmen kann** — der Topf, die Pfanne,
   * der Feuerlöscher.
   *
   * Das Stück ist im Modell ein **eigenes Netz** (Material `Kitchen_Utensils`,
   * `core/kitchenModel.ts`): Ein Herd mit Topf ist eine Gruppe aus Korpus und
   * Topf, und wer den Topf nimmt, lässt einen leeren Herd stehen. Ohne dieses
   * Feld wüsste die Küche nicht, dass es dort überhaupt etwas zu greifen gibt.
   *
   * **Der Feuerlöscher gehört dazu, und das ist nachgemessen und nicht
   * angenommen.** In der Datei ist `extinguisher` genau dieselbe Bauart wie
   * ein Herd mit Topf: ein Korpus aus `Kitchen_Cabins` von y = 0,000 bis
   * 1,000 (Quellmaß, halbiert 0,500 m) — das ist der **Hocker** — und darüber
   * **ein einziges** Netz aus `Kitchen_Utensils` von y = 1,002 bis 2,497
   * (halbiert 0,501 bis 1,249 m), der Löscher selbst.
   * `core/kitchenModel.takeUtensil` nimmt das erste Netz dieses Materials und
   * findet damit ohne eine Zeile Sonderfall den Löscher — und lässt den
   * Hocker stehen, auf den er zurückgehört.
   *
   * Die Namen sind die der **getragenen Dinge**
   * (`worlds/test/zones/kitchenRecipes.KitchenItem`) und keine zweite Liste:
   * Was hier steht, legt die Küche unverändert als getragenes Ding auf die
   * Fläche darunter (`worlds/test/zones/kitchen.ts`, `addStations`).
   */
  readonly holds?: 'pot' | 'pan' | 'extinguisher';

  /**
   * **Wie weit das Möbel aus der Mitte seiner Kachel rückt**, in Metern
   * (x, z) — der Ausgleich dafür, dass die Kachelmitte nicht immer die Mitte
   * dessen ist, was man sieht. Zwei Gründe dafür sind gemessen, und beide
   * stehen unten: ein Griff, der übersteht, und ein Möbel, das flacher ist
   * als seine Nachbarn.
   *
   * **Positiv ist nach Süden und nach Osten**, in der eigenen Drehung des
   * Möbels (`worlds/test/zones/kitchen.ts`, `place`) — ein um 180° gedrehter
   * Herd rückt nach der anderen Seite.
   *
   * Der Ursprung eines Möbels liegt in der Mitte seiner **ganzen** Hülle
   * (`tools/kitchen-model.mjs`), und beim Herd mit der Pfanne gehört der
   * Pfannenstiel dazu: Er ragt 16 cm nach Süden heraus, also wanderte der
   * **Korpus** beim Zentrieren 7,8 cm nach Norden — und stand damit als
   * einziger Herd aus der Reihe. Genau diese 7,8 cm stehen hier.
   *
   * Gemessen und nicht geschätzt: Der Korpus (Material `Kitchen_Cabins`)
   * reicht in der Datei von z = −0,610 bis z = +0,453, seine Mitte liegt also
   * bei −0,078.
   *
   * **Und beim Schneidebrett steht gar nichts über — es ist zu flach.** Die
   * Küchenzeile ist 1,0612 m tief (Quelle 2,1224 m), das Brett 0,9999 m
   * (Quelle 1,9998 m), und beide sitzen in ihrer eigenen Datei mittig um
   * z = 0. Auf einer gemeinsamen Kachelmitte sprang das Brett deshalb **vorn
   * und hinten je 3,07 cm zurück** — sichtbar als Delle in einer Zeile aus
   * Zeile, Brett, Zeile (`worlds/test/zones/kitchen.ts`, beide Bretter stehen
   * so).
   *
   * Auszugleichen ist nur **eine** Seite, denn ein flaches Möbel bleibt flach:
   * 0,5306 − 0,4999 = **0,0307 m nach Süden**. Die Vorderkante gewinnt, weil
   * man nur sie sieht — davor steht die Figur, dort greift sie zu, und eine
   * Kante, die um drei Zentimeter versetzt durchläuft, fällt sofort auf.
   * Hinten wächst die Lücke dafür auf 6,1 cm; die zeigt zur Wand und ist von
   * keinem Standpunkt aus im Bild.
   */
  readonly align?: readonly [x: number, z: number];
}

/**
 * **Die dreizehn Möbel**, in der Reihenfolge, in der sie aus der Quelle fallen
 * — mit den Maßen, die sie **im Spiel** haben, also halbiert
 * (`KITCHEN_SCALE`).
 *
 * Die Kachelzahl ist die gerundete Grundfläche und nicht die aufgerundete:
 * Ein Unterschrank ist einen Meter breit und 1,06 m tief, und wer daraus zwei
 * Kacheln macht, stellt eine ganze Reihe davon mit einem Meter Luft dazwischen
 * auf. Ein Möbel darf ein paar Zentimeter über seine Kachel hinausragen; eine
 * Küche mit Lücken darin ist keine Küche.
 *
 * Die Maße der **Quelle** stehen daneben, damit ein zweiter Lauf des Werkzeugs
 * nachrechenbar bleibt: 2 × 2 m und 1 m hoch für einen Unterschrank, 4 m breit
 * für Spüle, Ausgabetheke und Regal.
 */
export const KITCHEN_PIECES: readonly KitchenPiece[] = [
  {
    name: 'plate-counter',
    label: 'Tellerausgabe',
    tiles: [1, 1],
    height: 0.56,
    deck: 0.5,
    worktop: true,
  },
  {
    name: 'extinguisher',
    label: 'Feuerlöscher',
    tiles: [1, 1],
    // 1,25 m ist die Oberkante des **Löschers**, 0,50 m die des Hockers
    // darunter — dieselbe Teilung wie beim Herd mit Topf, und aus demselben
    // Grund getrennt: Wer den Löscher abnimmt und wieder hinstellt, stellt
    // ihn auf den Hocker und nicht auf seine eigene Kappe.
    height: 1.25,
    deck: 0.5,
    worktop: true,
    holds: 'extinguisher',
  },
  { name: 'sink', label: 'Spüle', tiles: [2, 1], height: 1.15 },
  { name: 'bin', label: 'Mülleimer', tiles: [1, 1], height: 0.45 },
  { name: 'table', label: 'Arbeitstisch', tiles: [1, 1], height: 0.5, worktop: true },
  { name: 'serve-counter', label: 'Ausgabe', tiles: [1, 1], height: 0.46, worktop: true },
  {
    name: 'board',
    label: 'Schneidebrett',
    tiles: [1, 1],
    height: 0.57,
    worktop: true,
    // 3,07 cm nach Süden: Das Brett ist 0,9999 m tief, die Küchenzeile neben
    // ihm 1,0612 m — so fluchtet die Vorderkante (`KitchenPiece.align`).
    align: [0, 0.031],
  },
  { name: 'plate-rack', label: 'Ausgaberegal', tiles: [2, 1], height: 0.56 },
  { name: 'pass', label: 'Ausgabetheke', tiles: [2, 1], height: 0.53, worktop: true },
  { name: 'counter', label: 'Küchenzeile', tiles: [1, 1], height: 0.5, worktop: true },
  { name: 'stove', label: 'Herd', tiles: [1, 1], height: 0.55, worktop: true },
  {
    name: 'stove-pot',
    label: 'Herd mit Topf',
    tiles: [1, 1],
    height: 0.87,
    deck: 0.55,
    worktop: true,
    holds: 'pot',
  },
  {
    name: 'stove-pan',
    label: 'Herd mit Pfanne',
    tiles: [1, 1],
    height: 0.68,
    deck: 0.55,
    worktop: true,
    holds: 'pan',
    align: [0, 0.078],
  },
];

/** Die Namen allein — für Listen, die keine Maße brauchen. */
export const KITCHEN_NAMES: readonly string[] = KITCHEN_PIECES.map((piece) => piece.name);

/** Ein Möbel nach Namen, oder `undefined` — Fremdtext kommt über das Netz. */
export function kitchenPiece(name: string): KitchenPiece | undefined {
  return KITCHEN_PIECES.find((piece) => piece.name === name);
}

/**
 * **Wo auf diesem Möbel etwas liegt**, in Metern über seinem Fuß.
 *
 * Eine Zeile und keine drei an jeder Aufrufstelle: `deck` steht nur dort im
 * Katalog, wo es von `height` abweicht (siehe `KitchenPiece.deck`), und wer
 * das von Hand nachschlägt, vergisst es beim nächsten Möbel.
 */
export function kitchenDeck(piece: KitchenPiece): number {
  return piece.deck ?? piece.height;
}
