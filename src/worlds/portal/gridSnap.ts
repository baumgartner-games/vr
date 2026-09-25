import { TILE } from '../nav/navTile';

/**
 * **Was hingestellt wird, rastet auf dem Kachelgitter ein** — reine Rechnung,
 * ohne three.js und ohne Physik.
 *
 * Ein Modell aus dem Regal (`props.ModelKind`) ist ein **Möbel**: ein Fass, ein
 * Zaun, eine Truhe, eine Wand. Die Möbel dieses Spiels stehen auf Kacheln und
 * schauen in eine der vier Himmelsrichtungen — die Küche tut es
 * (`test/zones/kitchenPlan.Spot`), der Editor tut es (`grid/gridTool.ts`), und
 * der Konstrukt-Raum stellt seine Auswahl aus demselben Grund in
 * Vierteldrehungen hin (`shared/construct.slotTurn`). Wer aus dem Regal eine
 * Reihe Fässer hinstellt, will genau das: eine **Reihe**, und keine Sammlung
 * schräg stehender Fässer, die sich um ein paar Zentimeter verfehlen.
 *
 * Also rastet ein abgelegtes Modell ein, und zwar in beidem:
 *
 * - **Die Kachelmitte** in x und z (`tileCentre`). Dieselbe Kachel wie überall
 *   sonst (`nav/navTile.TILE`, 1 m), also decken sich Regal, Küche und Editor
 *   ohne eine zweite Zahl. Was eine **gerade** Zahl Kacheln breit ist, rastet
 *   stattdessen auf eine Fuge, und eine **Wand** steht quer immer auf einer
 *   (`gridPose`, `snapAxis`) — dazwischen und nicht darauf.
 * - **Die Vierteldrehung** um die Hochachse (`quarterYaw`), und der Rest der
 *   Lage fällt weg: Ein Fass, das man schief in der Faust hielt, steht danach
 *   aufrecht. Nicken und Rollen zu behalten hieße, ein Möbel auf die Kante zu
 *   stellen, das man gerade hinstellen wollte.
 *
 * **Die Höhe bleibt, wie sie ist**, und das ist Absicht: Wo der Boden unter
 * einem Punkt liegt, weiß hier niemand — es kann der Estrich sein, ein Tisch
 * oder das Dach eines Hauses. Also bleibt y stehen, die Geschwindigkeit geht
 * auf null, und den letzten Zentimeter macht die Schwerkraft. Ein Kasten, der
 * ohne Drall aufrecht auf eine ebene Fläche fällt, bleibt aufrecht stehen.
 *
 * **Geworfen wird trotzdem noch.** Einrasten soll, was jemand *hinstellt* —
 * wer ein Fass durch den Raum wirft, meint etwas anderes, und ein Wurf, der
 * mitten im Flug auf eine Kachelmitte springt, sähe aus wie ein Fehler.
 * Die Grenze dazwischen ist `PLACE_SPEED`.
 */

/** Eine Lage, so weit sie hier gebraucht wird: eine Stelle und ein Gierwinkel. */
export interface GridPose {
  readonly x: number;
  readonly z: number;
  /** Die Drehung um die Hochachse, in Bogenmaß — immer ein Vielfaches von 90°. */
  readonly yaw: number;
}

/** Was von einer Drehung hier gelesen wird — die vier Zahlen eines Quaternions. */
export interface Turned {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;
}

/**
 * **Ab welcher Geschwindigkeit es ein Wurf ist**, in Metern je Sekunde.
 *
 * Anderthalb Meter je Sekunde ist die Geschwindigkeit, mit der eine Hand beim
 * Absetzen noch nachgibt — schneller als ein Hinstellen, langsamer als jedes
 * Werfen. Gemessen wird dieselbe Zahl, die auch den Wurf antreibt
 * (`PortalWorld.release`, `grab.velocity`), also gibt es keine zweite
 * Buchführung darüber, wie schnell eine Hand gerade war.
 */
export const PLACE_SPEED = 1.5;

/**
 * **Die Mitte der Kachel, in der ein Punkt liegt**, in Metern.
 *
 * `Math.floor` und nicht `Math.round`: Gesucht ist die Kachel, auf der das Ding
 * **steht**, und die reicht von ihrer Fuge bis zur nächsten. Mit `round` läge
 * die Grenze in der Kachelmitte, und ein Fass auf der Mitte von Kachel 3 sprünge
 * je nach letztem Bit nach 3 oder nach 4.
 */
export function tileCentre(value: number): number {
  return (Math.floor(value / TILE) + 0.5) * TILE;
}

/**
 * **Der Gierwinkel einer Drehung**, in Bogenmaß.
 *
 * Gelesen wird er an der **Blickrichtung**: Die dritte Spalte der Drehmatrix
 * ist das gedrehte +z des Objekts, und ihr Winkel in der Bodenebene ist genau
 * das, was three.js bei einer reinen Drehung um die Hochachse in `rotation.y`
 * schreibt. Über die Eulerwinkel zu gehen wäre der Umweg — dort hängt die Zahl
 * an der Reihenfolge der Achsen, und die steht an einem Gegenstand, der durch
 * die Luft geflogen ist, nirgends fest.
 *
 * Zeigt das Objekt senkrecht nach oben oder unten, ist die Blickrichtung in der
 * Bodenebene ein Punkt; dann ist die Antwort 0. Das ist kein Sonderfall, den
 * jemand abfangen müsste — ein Ding ohne Richtung bekommt eine.
 */
export function yawOf(rotation: Turned): number {
  const { x, y, z, w } = rotation;
  const ahead = { x: 2 * (x * z + w * y), z: 1 - 2 * (x * x + y * y) };
  if (Math.abs(ahead.x) < 1e-9 && Math.abs(ahead.z) < 1e-9) return 0;
  return Math.atan2(ahead.x, ahead.z);
}

/**
 * **Auf die nächste Vierteldrehung gerundet**, in Bogenmaß — und das Ergebnis
 * liegt in (−180°, 180°].
 *
 * Genau zwischen zwei Vierteln gewinnt die größere, weil `Math.round` es so
 * macht; welche das ist, sieht an einem Fass niemand.
 */
export function quarterYaw(yaw: number): number {
  if (!Number.isFinite(yaw)) return 0;
  const quarter = Math.PI / 2;
  const turns = ((Math.round(yaw / quarter) % 4) + 4) % 4;
  return turns > 2 ? (turns - 4) * quarter : turns * quarter;
}

/**
 * **Die eingerastete Lage** — Vierteldrehung um die Hochachse, und die Stelle
 * so, dass das Ding **auf ganzen Kacheln** steht.
 *
 * Ohne `half` (die halbe Grundfläche im eigenen Rahmen des Dings, wie sie an
 * `PhysicsBody.halfExtents` steht) ist das die Kachelmitte. Mit ihr rechnet
 * jede Achse für sich (`snapAxis`), und das ist die Korrektur aus dem
 * gemeldeten Befund: „die Wand steht mittig, statt am Rand der Kacheln" und
 * „steht über 3 Kacheln, obwohl es auf 2 Kacheln stehen könnte".
 */
export function gridPose(
  x: number,
  z: number,
  rotation: Turned,
  half?: { readonly x: number; readonly z: number },
  long?: number,
): PlacePose {
  const raw = yawOf(rotation);
  if (half && wallAxis(2 * half.x, 2 * half.z) !== null) {
    const eighth = eighthYaw(raw);
    if (isDiagonal(eighth)) return diagonalPose(x, z, eighth, half, long);
  }
  const yaw = quarterYaw(raw);
  if (!half) return { x: tileCentre(x), z: tileCentre(z), yaw, wall: null, diagonal: null };
  const { halfX, halfZ } = turnedHalf(half, yaw);
  const wall = wallAxis(2 * halfX, 2 * halfZ);
  return {
    x: snapAxis(x, 2 * halfX, wall === 'x'),
    z: snapAxis(z, 2 * halfZ, wall === 'z'),
    yaw,
    wall,
    diagonal: null,
  };
}

/**
 * **Auf das nächste Achtel gerundet**, in Bogenmaß, in (−180°, 180°] — die
 * Drehung, in der eine Wand stehen darf: gerade oder unter 45°.
 */
export function eighthYaw(yaw: number): number {
  if (!Number.isFinite(yaw)) return 0;
  const eighth = Math.PI / 4;
  const turns = ((Math.round(yaw / eighth) % 8) + 8) % 8;
  return turns > 4 ? (turns - 8) * eighth : turns * eighth;
}

/** Ob ein Achtel schräg ist — 45°, 135°, … */
export function isDiagonal(yaw: number): boolean {
  return Math.abs(Math.round(yaw / (Math.PI / 4))) % 2 === 1;
}

/**
 * **Eine Wand unter 45° einrasten** (`DiagonalWall`).
 *
 * `long` ist die gerade Länge der Wand, wie sie aus dem Regal kam — nach dem
 * Kürzen steht an `half` die schräge, und aus der ließe sich die Zahl der
 * Kacheln nicht mehr zurückrechnen.
 *
 * Bei ungerader Zahl Kacheln sitzt die Mitte auf einer Kachelmitte, bei
 * gerader auf einer Kachelecke — genau wie eine Wand auf Kacheln.
 */
export function diagonalPose(
  x: number,
  z: number,
  yaw: number,
  half: { readonly x: number; readonly z: number },
  long?: number,
): PlacePose {
  const straight = long ?? 2 * Math.max(half.x, half.z);
  const tiles = Math.max(1, Math.round(tileSpan(straight) / 2));
  const odd = tiles % 2 === 1;
  const px = odd ? tileCentre(x) : Math.round(x / TILE) * TILE;
  const pz = odd ? tileCentre(z) : Math.round(z / TILE) * TILE;
  // Die lange Achse im eigenen Rahmen, in die Welt gedreht (three.js: +x
  // wird zu (cos, −sin), +z zu (sin, cos)).
  const alongX = half.x >= half.z;
  const dx = alongX ? Math.cos(yaw) : Math.sin(yaw);
  const dz = alongX ? -Math.sin(yaw) : Math.cos(yaw);
  const sx = Math.sign(Math.round(dx * 1e6)) || 1,
    sz = Math.sign(Math.round(dz * 1e6)) || 1;
  const cells: Array<{ x: number; z: number }> = [];
  for (let k = 0; k < tiles; k++) {
    const off = k - (tiles - 1) / 2;
    cells.push({
      x: Math.floor((px + off * sx * TILE) / TILE),
      z: Math.floor((pz + off * sz * TILE) / TILE),
    });
  }
  return {
    x: px,
    z: pz,
    yaw,
    wall: null,
    diagonal: {
      tiles,
      length: tiles * Math.SQRT2 * TILE,
      slope: sx * sz < 0 ? 'slash' : 'backslash',
      cells,
    },
  };
}

/**
 * **Eine eingerastete Lage, und ob sie eine Wand ist.**
 *
 * `wall` nennt die Weltachse, die **quer** durch die Wand geht — die dünne.
 * `'z'` heißt also: Die Wand läuft von Westen nach Osten und steht auf einer
 * Fuge zwischen zwei Kachelreihen; `null` heißt, das Ding steht auf Kacheln.
 */
export interface PlacePose extends GridPose {
  readonly wall: 'x' | 'z' | null;
  /** Eine Wand unter 45° (`diagonalPose`) — sonst `null`. */
  readonly diagonal: DiagonalWall | null;
}

/**
 * **Eine Wand unter 45°** — gewünscht: _„Dann soll eine 2x1 Wand auch nur
 * genau 1l1u stehen können (z.B. mit rechten Stick auf 45° gedreht), und eine
 * 4x1 Wand soll dann 2l2u abdecken."_
 *
 * Sie geht schräg durch `tiles` Kacheln, eine je zwei Kacheln ihrer geraden
 * Länge, und wird dafür auf die Diagonale dieser Kacheln gekürzt (`length`,
 * `tiles`·√2 m). Jede Kachel trägt danach eine Schräge (`nav/cellGrid.Slope`)
 * — über das Gehen entscheidet sie auf dem Zellgitter wie eine gebaute
 * (`GridWorld`, `wallSlopes`).
 */
export interface DiagonalWall {
  readonly tiles: number;
  /** Die gekürzte Länge längs der Wand, in Metern. */
  readonly length: number;
  /** „╱" von Südwest nach Nordost oder „╲" von Nordwest nach Südost. */
  readonly slope: 'slash' | 'backslash';
  /** Die Kacheln, durch die sie geht, als Kachelnummern. */
  readonly cells: ReadonlyArray<{ readonly x: number; readonly z: number }>;
}

/**
 * **Die halbe Grundfläche in Weltachsen** — nach einer Vierteldrehung sind
 * Breite und Tiefe vertauscht. Genommen wird die Hülle, die auch die Physik
 * benutzt (`props.modelPropShape`): ein zweites Mal messen hieße, zwei Größen
 * für ein Fass zu haben.
 */
export function turnedHalf(
  half: { readonly x: number; readonly z: number },
  yaw: number,
): { halfX: number; halfZ: number } {
  const turned = Math.abs(Math.sin(yaw)) > 0.5;
  return { halfX: turned ? half.z : half.x, halfZ: turned ? half.x : half.z };
}

/**
 * **Wie viele Kacheln ein Maß belegt** — gerundet, und mindestens eine.
 *
 * Gerundet und nicht aufgerundet: Eine Wand aus dem Regal ist 2,00 m breit
 * und belegt zwei Kacheln, ein Apfel von 1,025 m eine. Wer aufrundete, gäbe
 * dem Apfel zwei und schöbe ihn dafür auf eine Fuge.
 */
export function tileSpan(size: number): number {
  if (!Number.isFinite(size)) return 1;
  return Math.max(1, Math.round(size / TILE));
}

/**
 * **Bis zu welcher Dicke ein Ding als Wand gilt**, in Metern — eine halbe
 * Kachel.
 *
 * Nachgemessen an den Wänden des Regals: `restaurant-bits/wall` ist 0,25 m
 * dick, die Prototyp-Wand 0,37 m, die Mauer aus `medieval-hexagon` 0,40 m.
 * Was dicker ist als eine halbe Kachel, belegt seine Kachel und gehört auf
 * ihre Mitte; was dünner ist, gehört **zwischen** zwei Kacheln — dorthin, wo
 * auch die Wände des Grundrisses stehen (`nav/navGraph.ts`: „eine Wand steht
 * zwischen zwei Kacheln").
 */
export const WALL_THIN = TILE / 2;

/**
 * **Wie lang eine Wand mindestens ist**, in Metern — drei Viertel einer
 * Kachel. Ein Schild von einer Handbreit ist auch dünn, aber keine Wand, und
 * gehört auf die Mitte seiner Kachel.
 */
export const WALL_LONG = 0.75 * TILE;

/**
 * **Ob eine Grundfläche eine Wand ist — und welche Achse quer durch sie geht.**
 *
 * Eine Wand ist dünn (`WALL_THIN`), lang (`WALL_LONG`) und mindestens doppelt
 * so lang wie dick. Das ist eine Frage an die Grundfläche und nicht an den
 * Dateinamen: Ein Zaun, eine Brüstung und eine Wand aus Lebkuchen gehören
 * alle auf die Kante, und eine Liste über viertausend Dateien pflegt niemand.
 */
export function wallAxis(width: number, depth: number): 'x' | 'z' | null {
  if (!Number.isFinite(width) || !Number.isFinite(depth)) return null;
  const thin = Math.min(width, depth);
  const long = Math.max(width, depth);
  if (thin > WALL_THIN || long < WALL_LONG || long < 2 * thin) return null;
  return width <= depth ? 'x' : 'z';
}

/**
 * **Eine Achse einrasten** — auf eine Kachelmitte oder auf eine Fuge.
 *
 * - **Quer durch eine Wand** (`edge`): auf die nächste Fuge. Die Wand steht
 *   dann zwischen zwei Kacheln und nicht mitten auf einer.
 * - **Eine ungerade Zahl Kacheln** (`tileSpan`): auf die Kachelmitte — ein
 *   Fass, ein Tisch, ein Möbel von drei Metern.
 * - **Eine gerade Zahl**: auf die Fuge. Ein zwei Meter breites Möbel liegt
 *   dann auf genau zwei Kacheln statt auf einer ganzen und zwei halben — genau
 *   das war der zweite Teil des Befunds.
 *
 * Auf der Fuge wird mit `Math.round` gerastet: Die nächste Fuge ist gemeint,
 * und ein Ding, das schon darauf steht, bleibt dort.
 */
export function snapAxis(value: number, size: number, edge: boolean): number {
  if (edge || tileSpan(size) % 2 === 0) return Math.round(value / TILE) * TILE;
  return tileCentre(value);
}

/**
 * **Die Fugen, auf denen eine Wand steht** — je Kachel ihrer Länge ein Stück,
 * als Mitte des Stücks.
 *
 * Das ist die Anzeige, die im Befund fehlte: „es ist nicht ersichtlich, wo
 * genau die Wand stehen wird (Anzeige des Randes)". Ein Gitter aus Kacheln
 * beantwortet die Frage bei einer Wand nicht — sie steht ja **zwischen**
 * ihnen —, also leuchtet die Kante (`placeGrid.PlaceGrid.showEdges`). Ein
 * Stück je Kachel und nicht ein Strich über alles, aus demselben Grund wie
 * beim Gitter: Man soll zählen können, wie viele Kacheln lang sie ist.
 */
export interface GridEdge {
  readonly x: number;
  readonly z: number;
  /** Ob die Kante von Westen nach Osten läuft (sonst von Norden nach Süden). */
  readonly alongX: boolean;
}

export function wallEdges(pose: PlacePose, halfX: number, halfZ: number): GridEdge[] {
  if (pose.wall === null) return [];
  const alongX = pose.wall === 'z';
  const length = alongX ? 2 * halfX : 2 * halfZ;
  const count = tileSpan(length);
  if (count > MAX_TILES) return [];
  const centre = alongX ? pose.x : pose.z;
  const first = centre - (count * TILE) / 2 + TILE / 2;
  const out: GridEdge[] = [];
  for (let index = 0; index < count; index++) {
    const along = first + index * TILE;
    out.push(alongX ? { x: along, z: pose.z, alongX } : { x: pose.x, z: along, alongX });
  }
  return out;
}

/**
 * **Ob dieses Loslassen ein Hinstellen war.**
 *
 * `placed` sagt es ausdrücklich — am Schirm legt der Benutzen-Knopf ab, und
 * dabei ist die Figur womöglich gerade gelaufen (`PortalWorld.updateScreenCarry`).
 * Sonst entscheidet die Geschwindigkeit: langsam ist hingestellt, schnell ist
 * geworfen.
 */
export function placesOnGrid(speed: number, placed: boolean): boolean {
  if (placed) return true;
  return Number.isFinite(speed) && speed <= PLACE_SPEED;
}

/**
 * **Welche Kacheln ein Ding belegt** — die Mitten aller Kacheln, auf denen es
 * wirklich steht.
 *
 * Die Zahl, die beim Hinstellen fehlte: Einrasten ist eine Rechnung, die man
 * erst **nach** dem Loslassen sieht, und wer eine Reihe Fässer stellt, will
 * vorher wissen, auf welche Kachel das nächste fällt. Genau diese Liste
 * beleuchtet die Welt unter dem Getragenen (`PortalWorld.updatePlaceGrid`).
 *
 * Gerechnet wird über die **Grundfläche** und nicht über eine Kachelzahl je
 * Modell: Ein Zaun ist einen Meter breit und zehn Zentimeter tief, ein
 * Doppelbett anderthalb mal anderthalb, und eine Tabelle für
 * viertausendfünfhundert Dateien pflegt niemand. Wer die Hülle hat, hat die
 * Antwort.
 *
 * **Eine Kachel zählt, wenn mindestens ihre Hälfte bedeckt ist**, und diese
 * Regel ist der ganze Unterschied zwischen einer Anzeige und einem Ärgernis.
 * Gemessen an einem Apfel aus dem Regal: Er ist 1,025 m breit, steht mit
 * seinem Ursprung auf der Kachelmitte und ragt damit **1,2 cm** über beide
 * Fugen. Wer jede berührte Kachel zählt, leuchtet dafür neun Kacheln an — ein
 * Gitter, das dreimal so groß ist wie das Ding darüber, beantwortet die
 * Frage nicht mehr, für die es da ist. Mit der Hälfte als Schwelle ist es
 * eine, und ein Möbel, das wirklich zwei Kacheln breit ist, bekommt zwei.
 *
 * **Die Hälfte zählt mit**, und das ist die andere Seite derselben Regel: Ein
 * zwei Meter breites Möbel steht mit seinem Ursprung auf einer Kachelmitte
 * und liegt damit auf drei Kacheln — einer ganzen und zwei halben. Genau das
 * soll es zeigen, denn genau das passiert: Es ragt über seine Kachel hinaus,
 * und ob daneben noch Platz ist, ist die Frage, für die das Gitter da ist.
 *
 * Bleibt danach **keine** übrig — ein Ding, das kleiner ist als eine halbe
 * Kachel und genau auf einer Fuge liegt —, gewinnt die Kachel unter seiner
 * Mitte. Eine leere Liste hieße „hier landet nichts", und das stimmt nie.
 */

/** Die Mitte einer Kachel, so wie `tilesCovered` sie ausgibt. */
export interface GridTile {
  readonly x: number;
  readonly z: number;
}

/**
 * **Die Notbremse**, und kein Maß: Eine Wand aus dem Regal ist zwei Meter
 * breit, ein Waldstück kann zwanzig sein — und ein Ding, das aus irgendeinem
 * Grund tausend Kacheln belegt, soll kein Gitter aus tausend Flächen
 * aufspannen, sondern gar keines.
 */
export const MAX_TILES = 64;

export function tilesCovered(minX: number, maxX: number, minZ: number, maxZ: number): GridTile[] {
  if (![minX, maxX, minZ, maxZ].every((value) => Number.isFinite(value))) return [];
  const across = axisTiles(minX, maxX);
  const along = axisTiles(minZ, maxZ);
  if (across.length * along.length > MAX_TILES) return [];
  const tiles: GridTile[] = [];
  for (const z of along) {
    for (const x of across) tiles.push({ x: (x + 0.5) * TILE, z: (z + 0.5) * TILE });
  }
  return tiles;
}

/** Die Kachelnummern einer Achse, nach der Hälfte-Regel oben. */
function axisTiles(a: number, b: number): number[] {
  const low = Math.min(a, b);
  const high = Math.max(a, b);
  const first = Math.floor(low / TILE);
  const last = Math.floor(high / TILE);
  // Vor der Schleife und nicht darin: Wer eine Fläche von einem Kilometer
  // hineinreicht, soll keine tausend Überlappungen ausrechnen lassen.
  if (last - first + 1 > MAX_TILES) return [];
  const out: number[] = [];
  for (let index = first; index <= last; index++) {
    const overlap = Math.min(high, (index + 1) * TILE) - Math.max(low, index * TILE);
    if (overlap >= TILE / 2) out.push(index);
  }
  if (out.length === 0) out.push(Math.floor((low + high) / 2 / TILE));
  return out;
}
