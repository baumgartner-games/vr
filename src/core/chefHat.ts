/**
 * **Die Kochmütze als Netz** — die Form, bevor three.js sie zu sehen bekommt.
 *
 * Bis hierher war die Mütze ein Haufen Grundkörper: ein Rohr als Stirnband,
 * ein zweites als Rand, fünf Kugeln als Lappen und eine sechste als Kuppel
 * (`core/headgear.ts`). Das las sich von weitem als Kochmütze und aus der Nähe
 * als Schneemann, und es kostete sieben Netze, sieben Hüllen und sieben
 * Zeichenaufrufe für ein Stück Stoff.
 *
 * Die Vorlage ist ein **Low-Poly-Drahtgitter**: unten ein zylindrisches Band
 * mit einer feinen Kante obenauf, darüber eine bauschige Haube, die über das
 * Band hinauskragt, mit sechs weichen Falten, die nach oben in eine
 * unregelmäßig gewölbte Kuppel laufen — flächig schattiert, wenige hundert
 * Dreiecke. So etwas baut man nicht aus Kugeln zusammen, sondern man
 * **drechselt** es: ein Profil aus Ringen, jeder Ring mit seinem Halbmesser,
 * und die Falten als gezielte Kerben in genau diesen Ringen.
 *
 * Diese Datei ist die **Rechnung dazu und sonst nichts**: Sie kennt kein
 * three.js, keine Materialien und keine Szene, sondern liefert Zahlen —
 * `chefHatProfile()` die Ringe, `chefHatVertices()` die Ecken der Dreiecke.
 * Das ist dieselbe Trennung wie überall hier (die Rechnung neben der
 * Darstellung), und sie zahlt sich beim Prüfen aus: Ob die Haube über das Band
 * kragt, ob nichts dem Träger über die Augen rutscht und ob das Ganze unter
 * seiner Dreiecksgrenze bleibt, beantwortet ein Jest-Test in Millisekunden und
 * kein Blick auf ein Bild.
 *
 * **Die Einheiten**: `y` und `radius` sind Vielfache des **Kopfhalbmessers**
 * (`avatarLook.HEAD_RADIUS`), wie alles an einer Kopfbedeckung in diesem
 * Projekt — der Kopf ist schon einmal gewachsen, und beim nächsten Mal soll
 * die Mütze von selbst mitwachsen. Waagerecht kommt zusätzlich der `spread`
 * dazu: Der gebaute Kopf ist eine gefaste Kiste und an seinen vier Ecken ein
 * Viertel weiter draußen als eine Kugel (`avatarLook.HEAD_SPREAD`), und ein
 * Band, das das nicht mitrechnet, lässt dort die Haut durchblitzen. Er kommt
 * als Zahl herein und nicht als Import, damit diese Datei three-frei bleibt.
 *
 * **−z ist vorn**, der Ursprung ist die Kopfmitte.
 */

/** Wie viele Falten die Haube hat — sechs, wie auf der Vorlage. */
export const CHEF_HAT_LOBES = 6;

/**
 * Wie viele Ecken ein Ring hat. **Vier je Falte**, und das ist keine runde
 * Zahl, sondern eine passende: So liegt auf jeder Kerbe eine Ecke und auf
 * jedem Wulst dazwischen auch. Bei drei je Falte säße der Wulst zwischen zwei
 * Ecken und würde glatt abgeschnitten — aus den Falten würde ein Zackenkranz.
 */
export const CHEF_HAT_SEGMENTS = 4 * CHEF_HAT_LOBES;

/**
 * **Auf welcher Höhe über der Kopfmitte der Rand aufsitzt**, in
 * Kopfhalbmessern.
 *
 * Tiefer geht nichts, und das ist die Regel des ganzen Hutregals: Darunter
 * liegen die Augen, und eine Mütze, die jemandem über die Augen rutscht, sieht
 * nicht nach Mütze aus, sondern nach Fehler.
 */
export const CHEF_HAT_SEAT = 0.45;

/**
 * **Wie weit die Haube je Halbmesser Höhe nach hinten wandert** (+z ist
 * hinten).
 *
 * Auf der Vorlage steht die Mütze nicht gerade, sondern die Haube kippt nach
 * hinten und oben weg — so sitzt sie auch in Wirklichkeit, weil der Stoff über
 * den Hinterkopf fällt und nicht über die Stirn. Gerechnet wird es als
 * **Schräglage der Ringe** und nicht als Drehung der ganzen Mütze: Das Band
 * bleibt waagerecht um den Kopf liegen (gedreht stünde es vorn ab und schnitte
 * hinten in den Schädel), und erst was darüber sitzt, lehnt sich zurück.
 */
export const CHEF_HAT_LEAN = 0.2;

/** Wo das Band aufhört und die Haube anfängt — ab hier lehnt sich alles. */
const BAND_TOP = 0.95;

/** Ein Ring des Profils. */
export interface ChefHatRing {
  /** Höhe über der Kopfmitte, in Kopfhalbmessern. */
  y: number;
  /** Halbmesser, in Kopfhalbmessern — waagerecht noch mit `spread` zu nehmen. */
  radius: number;
  /**
   * **Wie tief die Falten diesen Ring einkerben**, als Anteil des Halbmessers.
   * 0 ist ein runder Ring; unten und ganz oben ist der Stoff glatt gespannt,
   * dazwischen wirft er die Falten, an denen man eine Kochmütze erkennt.
   */
  fold: number;
  /**
   * **Wie weit die Wülste zwischen den Falten diesen Ring anheben**, in
   * Kopfhalbmessern. Ohne das wäre die Kuppel eine Drehform mit Rillen; mit
   * ihm ist sie die unregelmäßige Wölbung der Vorlage, weil jede Falte oben
   * eine Delle und jeder Wulst eine Beule bekommt.
   */
  wobble: number;
  /** Ob dieser Ring noch zum **Stirnband** gehört (dunkel) oder zur Haube. */
  band: boolean;
}

/** Derselbe Ring, um seine fertige Schräglage ergänzt. */
export interface ChefHatLeaned extends ChefHatRing {
  /** Wie weit dieser Ring nach hinten gewandert ist, in Kopfhalbmessern. */
  lean: number;
}

/**
 * **Das Profil**, von unten nach oben — die eine Stelle, an der die Form
 * dieser Mütze steht.
 *
 * Gelesen wird es wie ein Schnitt durch die Mütze: Das Band steht senkrecht
 * und kaum merklich konisch um den Kopf (0,45 bis 1,0 Halbmesser hoch), darauf
 * sitzt die **Naht** — ein schmaler Absatz, der ein Stück über das Band
 * hinaussteht und damit die Kante wirft, an der die Vorlage ihre beiden Teile
 * trennt —, und darüber bläht sich die Haube auf gut das Anderthalbfache des
 * Bandes auf, bevor sie in die Kuppel einläuft.
 *
 * Die Zahlen sind an der Vorlage abgelesen und an zwei Grenzen gestutzt:
 * unten an `CHEF_HAT_SEAT` (nichts rutscht über die Augen) und in der Breite
 * daran, dass das Stück im Kleiderschrank noch auf eine Kachel passt
 * (`worlds/shared/wardrobeRack.RACK_PIECE_MAX`).
 */
const RINGS: readonly ChefHatRing[] = [
  { y: CHEF_HAT_SEAT, radius: 0.98, fold: 0, wobble: 0, band: true },
  { y: BAND_TOP, radius: 1.0, fold: 0, wobble: 0, band: true },
  { y: 1.0, radius: 1.05, fold: 0, wobble: 0, band: false },
  { y: 1.22, radius: 1.17, fold: 0.055, wobble: 0.014, band: false },
  { y: 1.5, radius: 1.22, fold: 0.085, wobble: 0.026, band: false },
  { y: 1.8, radius: 1.21, fold: 0.095, wobble: 0.036, band: false },
  { y: 2.06, radius: 1.13, fold: 0.085, wobble: 0.04, band: false },
  { y: 2.28, radius: 0.96, fold: 0.065, wobble: 0.04, band: false },
  { y: 2.42, radius: 0.68, fold: 0.04, wobble: 0.032, band: false },
  { y: 2.5, radius: 0.34, fold: 0.022, wobble: 0.018, band: false },
];

/** Die Spitze, auf die die Kuppel zuläuft — ein Punkt, kein Ring. */
const APEX_Y = 2.54;

/**
 * **Das Profil mit seiner Schräglage** — dieselben Ringe, jeder um das nach
 * hinten versetzt, was `CHEF_HAT_LEAN` auf seiner Höhe ausmacht.
 *
 * @param lean Wie stark die Haube zurücklehnt; 0 stellt sie gerade.
 */
export function chefHatProfile(lean = CHEF_HAT_LEAN): ChefHatLeaned[] {
  return RINGS.map((ring) => ({ ...ring, lean: lean * Math.max(0, ring.y - BAND_TOP) }));
}

/** Wie die Mütze gerechnet werden soll — alles hat eine brauchbare Vorgabe. */
export interface ChefHatOptions {
  /**
   * Wie viel weiter der Kopf an seinen Ecken reicht als eine Kugel
   * (`avatarLook.HEAD_SPREAD`). 1 ist ein runder Kopf.
   */
  spread?: number;
  /** Ecken je Ring — siehe `CHEF_HAT_SEGMENTS`. */
  segments?: number;
  /** Falten ringsum. */
  lobes?: number;
  /** Schräglage nach hinten (`CHEF_HAT_LEAN`). */
  lean?: number;
}

/** Die fertigen Dreiecke, Ecke für Ecke. */
export interface ChefHatMesh {
  /** `x, y, z` je Ecke, drei Ecken je Dreieck — **nicht** indiziert. */
  positions: number[];
  /** Je Dreieck: gehört es zum Stirnband (und trägt damit die Rollenfarbe)? */
  band: boolean[];
  /** Wie viele Dreiecke es geworden sind. */
  triangles: number;
}

/**
 * **Die Mütze als Dreiecke.**
 *
 * Nicht indiziert, und zwar mit Absicht: Der Look der Vorlage ist **flach
 * schattiert**, jede Fläche eine eigene Helligkeit. Geteilte Ecken hätten
 * geteilte Normalen und damit eine weiche Rundung — genau das, was hier nicht
 * gewollt ist. Ecken zu verdoppeln kostet ein paar hundert Zahlen und spart
 * den Umweg über `toNonIndexed()` beim Aufrufer.
 *
 * Gebaut wird von unten nach oben: der Deckel unter dem Band (den sieht nur,
 * wer die Mütze im Regal von unten ansieht — aber ohne ihn ist sie dort ein
 * Loch), dann Ring auf Ring je zwei Dreiecke, und oben ein Fächer auf die
 * Spitze.
 */
export function chefHatVertices(options: ChefHatOptions = {}): ChefHatMesh {
  const spread = options.spread ?? 1;
  const segments = options.segments ?? CHEF_HAT_SEGMENTS;
  const lobes = options.lobes ?? CHEF_HAT_LOBES;
  const rings = chefHatProfile(options.lean);

  const positions: number[] = [];
  const band: boolean[] = [];

  /**
   * Eine Ecke auf einem Ring. `Math.cos(lobes * theta)` ist die Falte: Bei 1
   * liegt die Kerbe (der Halbmesser fällt um `fold`, die Höhe sackt um
   * `wobble`), bei −1 der Wulst dazwischen. Weil der Kosinus gerade ist, ist
   * die Mütze links wie rechts dieselbe — eine Kochmütze mit einem Schlag zur
   * Seite wäre ein Fehler und kein Stil.
   */
  const point = (ring: ChefHatLeaned, step: number): [number, number, number] => {
    const theta = ((step % segments) / segments) * Math.PI * 2;
    const wave = Math.cos(lobes * theta);
    const radius = ring.radius * (1 - ring.fold * 0.5 * (1 + wave)) * spread;
    return [
      Math.sin(theta) * radius,
      ring.y - ring.wobble * wave,
      Math.cos(theta) * radius + ring.lean,
    ];
  };

  const push = (
    a: [number, number, number],
    b: [number, number, number],
    c: [number, number, number],
    isBand: boolean,
  ): void => {
    positions.push(...a, ...b, ...c);
    band.push(isBand);
  };

  // Der Deckel unten: ein Fächer auf die Mitte des Randes, nach unten
  // schauend. Er gehört zum Band und ist so dunkel wie es.
  const first = rings[0]!;
  const floor: [number, number, number] = [0, first.y, first.lean];
  for (let s = 0; s < segments; s++) {
    push(floor, point(first, s + 1), point(first, s), true);
  }

  // Die Wand: je zwei Dreiecke zwischen zwei Ringen. Ein Streifen ist Band,
  // solange sein **oberer** Ring noch zum Band gehört — die Schräge vom
  // Bandrand hinaus zur Naht ist damit schon weiß, und das ist richtig: Sie
  // ist die Unterseite der Haube und nicht die Oberkante des Bandes.
  for (let i = 0; i < rings.length - 1; i++) {
    const lower = rings[i]!;
    const upper = rings[i + 1]!;
    for (let s = 0; s < segments; s++) {
      const a = point(lower, s);
      const b = point(lower, s + 1);
      const c = point(upper, s + 1);
      const d = point(upper, s);
      push(a, b, d, upper.band);
      push(b, c, d, upper.band);
    }
  }

  // Und die Kuppel: ein Fächer auf die Spitze.
  const top = rings[rings.length - 1]!;
  const apex: [number, number, number] = [0, APEX_Y, top.lean];
  for (let s = 0; s < segments; s++) {
    push(point(top, s), point(top, s + 1), apex, false);
  }

  return { positions, band, triangles: band.length };
}
