import { PLAN_WALL_H, PLAN_WALL_T } from '../editor/levelPlan';
import { DIR_E, DIR_N, DIR_S, DIR_W, TILE, type Dir } from '../nav/navTile';
import { solidBounds, standing, type PlanSolid } from './solids';

/**
 * **Die Bausteine** — was auf einer Kachel steht.
 *
 * Boden, Wand und Tür kommen aus dem Bauplan (`editor/levelPlan.ts`); die
 * gehören der Kachel und ihren Kanten. Alles andere, was in einem Zimmer
 * herumsteht, stand bisher in jeder Welt einzeln in Metern: die Küchenzeile der
 * Pizzeria, die Schießbank des Stands, die Treppe in Dust, das Geländer am
 * Balkon. Dreimal dieselbe Sache, dreimal andere Zahlen, dreimal ungeprüft.
 *
 * Hier ist sie einmal. Ein Baustein ist genau das, was er bei Minecraft ist:
 * **eine Kachel, eine Sorte, eine Blickrichtung** — mehr braucht niemand
 * anzugeben, und weniger geht nicht. Was daraus wird, sind achsenparallele
 * Quader (`solids.ts`), also dasselbe, was der Bauplan ohnehin ausspuckt, und
 * damit prüfbar, ohne dass eine Brille im Spiel ist.
 *
 * **Gebaut wird nach Norden, gedreht wird danach.** Jeder Baustein steht in
 * seiner eigenen kleinen Welt: Ursprung in der Kachelmitte, Boden auf null,
 * vorne ist −Z. Erst `turned()` legt ihn in die Richtung, in die er zeigen
 * soll. Das ist der Unterschied zwischen zwölf Bausteinen und achtundvierzig
 * Sonderfällen — und vor allem ist es der Grund, warum eine Küchenzeile an der
 * Ostwand genauso aussieht wie dieselbe an der Nordwand. Wer die vier Fälle
 * einzeln schreibt, hat irgendwann drei richtige und einen, bei dem die
 * Arbeitsplatte in der Wand steckt.
 *
 * **Ein Baustein weiß, was er der Kachel antut** (`BLOCKS[kind]`): Ein Podest
 * hebt den Boden an (`rise`), ein Tisch macht das Herumkommen teurer (`cost`).
 * Beides landet im Navigationsgraphen, und deshalb läuft ein NPC um den Tisch
 * herum und auf das Podest hinauf, ohne dass jemand die Karte von Hand
 * nachpinselt.
 */

/** Was es zu setzen gibt. */
export type BlockKind =
  | 'counter'
  | 'shelf'
  | 'table'
  | 'bench'
  | 'crate'
  | 'pillar'
  | 'railing'
  | 'parapet'
  | 'stairs'
  | 'ramp'
  | 'platform'
  | 'panel';

/** Wo ein Baustein steht: Kachelmitte, Bodenoberkante, Blickrichtung. */
export interface BlockSite {
  x: number;
  /** Die Oberkante des Bodens, auf dem er steht. */
  base: number;
  z: number;
  /**
   * Wohin er zeigt — und bei allem, was an einer Wand steht, gleichzeitig, an
   * **welcher** Kante er steht: Ein Regal mit `DIR_N` steht an der Nordkante
   * und schaut nach Süden in den Raum.
   */
  dir: Dir;
  /**
   * Wie hoch, wo das eine Frage ist: Treppe, Rampe, Podest, Decke. Ohne Angabe
   * das, was in `BLOCKS` steht.
   */
  height?: number;
  /**
   * **Wie weit über dem Boden der Etage er anfängt**, in Metern.
   *
   * Die zweite Zahl, die eine Treppe über mehrere Kacheln braucht: Die dritte
   * Kachel eines Laufs steigt nicht von null auf 0,7, sondern von 1,4 auf 2,1.
   * Ohne sie stünden vier Treppenkacheln nebeneinander statt hintereinander,
   * und jede fienge unten wieder an.
   */
  lift?: number;
}

/** Was ein Baustein außer Quadern noch bedeutet. */
export interface BlockFacts {
  label: string;
  /** Um wie viel er den begehbaren Boden der Kachel anhebt. */
  rise: number;
  /**
   * Was das Herumkommen auf dieser Kachel kostet, `1` ist frei.
   *
   * Kein „blockiert ja/nein": Ein Aufschlag sagt „hier kommt man schlechter
   * durch", und genau das kann eine Wegsuche gebrauchen — sie geht daneben
   * herum, solange daneben etwas frei ist, und hindurch, wenn es der einzige
   * Weg ist. Auf dem 1-m-Gitter füllt ein Tisch seine Kachel allerdings fast
   * ganz aus; die Zahlen hier stammen noch von den 2,5-m-Kacheln und sind
   * eher zu freundlich als zu streng.
   */
  cost: number;
  /**
   * Die Höhe, auf der man ihn **benutzt**, wenn niemand eine andere angibt:
   * Arbeitsplatte, Sitzfläche, Handlauf, oberste Trittfläche. Bei allen außer
   * der Bank ist das gleichzeitig die Oberkante — die Lehne steht darüber.
   */
  height: number;
  /**
   * **Ob er an einer Kante steht** — Küchenzeile, Regal, Bank, Geländer,
   * Brüstung, Portaltafel — oder frei auf seiner Kachel: Tisch, Säule, Kisten,
   * Treppe, Rampe, Podest.
   *
   * Dieselbe Frage wie bei den Einbauten (`fixtures/index.FixtureKind.edge`),
   * und deshalb dieselbe Antwort an derselben Art von Stelle: beim Ding selbst.
   * Sie stand bisher als zweite Liste daneben (`gridTool.EDGE_BLOCKS`) und
   * wurde dort auch nur für einen Satz im Werkzeugkasten gebraucht; inzwischen
   * hängt mehr daran — **wohin das Modell aus dem Regal kommt**
   * (`blockModelSpot`). Ein Baustein an der Kante setzt seine Rückwand dorthin,
   * wo seine Quader ihre haben; einer, der frei steht, stellt sich in die
   * Mitte. Zwei Listen, die dasselbe wissen müssen, sind eine zu viel: Wer
   * einen Baustein dazutut und die zweite vergisst, bekommt einen Tisch, der
   * mit dem Rücken an der Wand klebt, und sieht es erst in der Brille.
   */
  edge?: boolean;
  /**
   * **Ob man auf ihm hinaufgeht** — Treppe und Rampe, und sonst nichts.
   *
   * Sie sind die beiden Bausteine, die über ihre Kachel hinweg steigen, und
   * deshalb die beiden, deren Anhebung ihr **Fuß** ist und nicht ihre Höhe
   * (`blockRise`, `BlockSite.lift`).
   */
  steps?: boolean;
  /**
   * **Ob sein Modell je Achse in die gebaute Form gepresst wird** — und um wie
   * viele Vierteldrehungen es dafür vorher gedreht werden muss.
   *
   * Steht hier nichts, wird gleichmäßig skaliert, und das ist bei einem Möbel
   * das Richtige: Ein Regal, das in der Höhe gestreckt und in der Breite
   * gestaucht wird, sieht aus wie ein Fehler (der lange Grund steht bei
   * `blockModelSpot`). Steht hier etwas, gilt das Gegenteil, und auch das hat
   * einen Grund — denselben wie bei den Requisiten
   * (`worlds/test/zones/propFit.ts`) und bei der Rampe auf das Sprungkissen
   * (`worlds/climb/padRamp.ts`): **Auf Theke und Treppe kommt es auf die Form
   * an und nicht auf die Proportion.** Eine Treppe, deren Stufen nicht genau
   * dort liegen, wo die gebauten liegen, ist eine, auf der man sichtbar in der
   * Luft geht; eine Theke, die einen halben Meter tiefer ist als ihr Körper,
   * ragt in den Gang, in dem nichts steht.
   *
   * **Eine Eigenschaft des Bausteins und keine Fallunterscheidung im Rumpf** —
   * dieselbe Überlegung wie bei `edge` eine Zeile darüber: Wer einen Baustein
   * dazutut, sieht hier, was mit seinem Modell geschieht, statt es in
   * `blockModelSpot` zu suchen.
   */
  fit?: BlockModelFit;
}

/**
 * **Wie das Modell eines Bausteins in seine gebaute Form kommt**, wenn es
 * nicht gleichmäßig skaliert wird (`BlockFacts.fit`).
 *
 * Dass dieser Satz überhaupt eine Struktur ist und kein `true`, liegt an der
 * Treppe: Ihr Modell steigt in seine eigene **−x**-Richtung, der Baustein
 * steigt nach vorn, also in −z. Das ist eine Vierteldrehung, und sie gehört zu
 * derselben Entscheidung — wer das Einpassen anschaltet, muss im selben Atemzug
 * sagen, welche Achse des Modells welche des Bausteins ist, sonst presst er die
 * Breite in die Tiefe.
 */
export interface BlockModelFit {
  /**
   * **Vierteldrehungen um die Hochachse**, bevor eingepasst wird: `0` heißt
   * „das Modell liegt schon so herum wie der Baustein", `-1` sind −90° — genau
   * der Winkel, den `blockModelSpot` auch für `DIR_E` rechnet, und damit
   * dieselbe Drehrichtung wie in `turned()`.
   *
   * Gemessen und nicht geraten: Am Netz von `Primitive_Stairs_Half.glb` liegen
   * die vier Trittflächen bei x = 1,5…2 (unten) bis x = 0…0,5 (oben) — es
   * steigt also nach −x. Der Baustein steigt nach −z (`BUILD.stairs`,
   * „hinten ist unten"), und −90° bilden −x auf −z ab.
   */
  turn: number;
}

/**
 * **Die beiden Maße, an denen eine Treppe steht oder klemmt.**
 *
 * Höchstens 0,2 m hoch und mindestens 0,25 m tief — das ist eine Treppe, die
 * man hinaufgeht, ohne darüber nachzudenken. Der Character-Controller steigt
 * 0,32 m (`PhysicsLocomotion`), also ist die Höhe nicht die Grenze; die
 * **Tiefe** ist es. Die Stufen der Straßenküche waren 0,19 m tief, und die
 * Mindestbreite des Autostep lag darüber — man blieb an jeder zweiten hängen.
 */
export const STEP_RISE = 0.2;
export const STEP_RUN = 0.25;

/** Eine Rampe steigt flacher: halb so hohe Stufen, sonst dieselbe Rechnung. */
const RAMP_RISE = 0.1;

/**
 * **Wie viel Anstieg eine Kachel Treppe nimmt**, wenn niemand etwas anderes
 * sagt: 0,7 m — vier Stufen von 0,175 m auf je 0,25 m Tiefe.
 *
 * Damit sind 2,8 m Etagenhöhe genau vier Kacheln Treppe, und das ist die Zahl,
 * aus der `GridPlan.stairs()` ihre Länge rechnet.
 */
export const STAIR_LIFT = 0.7;

/** Und eine Kachel Rampe: halb so viel, dafür gern doppelt so lang. */
export const RAMP_LIFT = 0.35;

export const BLOCKS: Readonly<Record<BlockKind, BlockFacts>> = {
  // **Die Theke behält ihre 0,90 m**, und ihr Modell richtet sich nach ihr und
  // nicht umgekehrt (`BLOCK_MODELS`, `dungeon/bar_straight_B_short.glb`): Der
  // Bartresen ist in der Quelle im Aufriss quadratisch und 1,24 tief, also
  // gleichmäßig auf Arbeitshöhe gebracht 1,12 m tief — einen halben Meter mehr,
  // als `BUILD.counter` baut. Das ist der Fall, für den es `fit` gibt: Der
  // Umriss des Modells wird zum Umriss der Quader, und die Tiefe wird dabei
  // gestaucht. Eine Arbeitshöhe ist eine Zahl, die man am Körper misst und
  // nicht an einer gekauften Datei — 0,90 m bleiben 0,90 m.
  counter: { label: 'Küchenzeile', rise: 0, cost: 1.6, height: 0.9, edge: true, fit: { turn: 0 } },
  // **Das Regal ist 1,50 m hoch, und das ist die Höhe seines Modells**
  // (`BLOCK_MODELS`, `dungeon/bookcase_single.glb`). Es stand einmal auf 1,90
  // m, und diese Zahl wäre mit dem Modell zu einem Regal geworden, das über
  // seine Kachel hinaussteht: Das Modell ist in der Quelle 2,000 × 3,000 ×
  // 0,500 groß, also halbiert (`core/kaykitFit.KAYKIT_SCALE`) **1,00 × 1,50 ×
  // 0,25 m** — genau eine Kachel breit (`TILE`). Gleichmäßig auf 1,90 m
  // gestreckt wären das 1,27 m Breite, dreizehn Zentimeter in jede
  // Nachbarkachel hinein, und `BUILD.shelf` baut seine Böden mit Absicht genau
  // eine Kachel breit, egal wie hoch jemand es stellt.
  //
  // Die zweite Möglichkeit wäre gewesen, das Modell auf die Kachelbreite zu
  // zwingen und den Baustein auf 1,90 m stehen zu lassen. Dann stünde ein
  // sichtbares Regal von 1,50 m vor einem unsichtbaren Hindernis von 1,90 m —
  // vierzig Zentimeter Luft, gegen die man läuft. Ein Modell ersetzt das Bild
  // und nicht die Rechnung (`docs/agents/modelle.md`), also muss die Rechnung
  // stimmen, und zwar in beide Richtungen.
  //
  // Bleibt die dritte: den Baustein auf die natürliche Höhe des Modells
  // stellen. 1,50 m ist ein Bücherregal, wie es in einem Zimmer steht, die
  // vier Böden liegen damit alle 0,49 m, und gebautes Regal, Körper,
  // Wegekosten und Modell sind dieselbe Kiste — mit Modell wie ohne.
  shelf: { label: 'Regal', rise: 0, cost: 1.3, height: 1.5, edge: true },
  // **Der Tisch bleibt auf 0,75 m**, und das ist diesmal keine Zahl, die
  // stehengeblieben ist, sondern eine, die aufgeht: `furniture-bits/
  // table_small.glb` ist in der Quelle 1,000 × 1,000 × 1,000 groß, also im
  // Aufriss **quadratisch**. Auf Tischhöhe gebracht wird er damit 0,75 m breit
  // — eine Handbreit schmaler als die gebauten 0,90 m, und die Kachel bleibt
  // ringsum frei.
  table: { label: 'Tisch', rise: 0, cost: 2.2, height: 0.75 },
  // **Die 0,46 m sind die Sitzfläche und nicht die Oberkante** — die Lehne
  // steht darüber, und die Bank ist der einzige Baustein, bei dem die beiden
  // auseinandergehen. Ihr Modell (`furniture-bits/chair_A.glb`) wird deshalb
  // auch nicht auf diese Zahl eingepasst, sondern auf die **gemessene**
  // Oberkante der gebauten Quader; der Grund steht bei `blockModelSpot`.
  bench: { label: 'Bank', rise: 0, cost: 1.6, height: 0.46, edge: true },
  // Zwei Kisten von 0,45 m übereinander — mehr passt auf eine Kachel von einem
  // Meter nicht, ohne dass der Stapel über die Kante kippt.
  crate: { label: 'Kisten', rise: 0, cost: 2.6, height: 0.9 },
  pillar: { label: 'Säule', rise: 0, cost: 1.4, height: PLAN_WALL_H },
  railing: { label: 'Geländer', rise: 0, cost: 1, height: 1, edge: true },
  // **Die Brüstung ist 0,55 m hoch, und das ist die Höhe ihres Modells**
  // (`BLOCK_MODELS`, `dungeon/barrier_half.glb`). Sie stand einmal auf 0,90 m,
  // und das ist dieselbe Rechnung wie damals beim Regal (siehe dort): Das
  // Modell ist in der Quelle 2,000 × 1,100 × 0,500 groß, halbiert
  // (`core/kaykitFit.KAYKIT_SCALE`) also **1,00 × 0,55 × 0,25 m** — genau eine
  // Kachel breit (`TILE`), und breiter darf es nicht werden, weil `BUILD`
  // seine Mauer bei jeder Höhe genau eine Kachel breit baut.
  //
  // Auf 0,90 m gestreckt wäre das Geländer 1,64 m breit und ragte 32 cm in
  // **jede** Nachbarkachel; bliebe es bei der Kachelbreite und der Baustein
  // bei 0,90 m, stünde ein sichtbares Geländer von 0,55 m vor einem
  // unsichtbaren Hindernis von 0,90 m — 35 Zentimeter Luft, gegen die man
  // läuft. Also geht die Zahl auf die natürliche Höhe des Modells herunter.
  //
  // **Was dabei nicht kippt**: Die Brüstung hält weiter auf, wen sie aufhalten
  // soll. Der Character-Controller steigt 0,32 m (`PhysicsLocomotion`), und
  // 0,55 m sind deutlich mehr — über die Gassenmauer der Boxengasse
  // (`kart/kartPit.ts`) hebt ihn auch diese Höhe nicht. Sie ist jetzt eine
  // Balustrade und keine Brustwehr: unten eine geschlossene Mauer, darüber ein
  // Pfosten und ein Handlauf, und **das** sieht man von oben durch
  // (`core/cutaway.ts`) — bei 0,90 m war es ein blinder Klotz.
  parapet: { label: 'Brüstung', rise: 0, cost: 1, height: 0.55, edge: true },
  // **Die Höhe einer Treppenkachel ist ihr Teilanstieg** und nicht mehr die
  // ganze Etage: Sie liegt zu mehreren hintereinander (`GridPlan.stairs`).
  //
  // **Und sie ist die Zahl, an der ihr Modell hängt.** Die vier gebauten Stufen
  // bleiben der Körper; das Modell (`BLOCK_MODELS`) legt sich je Achse genau
  // darauf, samt der Vierteldrehung, die es dafür braucht (`fit`). Nichts an
  // dieser Zeile darf sich nach dem Modell richten — `STEP_RISE`, `STEP_RUN`
  // und `STAIR_LIFT` sind gelaufene Maße und keine gezeichneten.
  stairs: {
    label: 'Treppe',
    rise: 0,
    cost: 1.8,
    height: STAIR_LIFT,
    steps: true,
    fit: { turn: -1 },
  },
  ramp: { label: 'Rampe', rise: 0, cost: 1.2, height: RAMP_LIFT, steps: true },
  // Ein Podest **ist** der Boden, auf dem man dort steht — deshalb hebt es ihn
  // an, statt ein Hindernis darauf zu sein.
  platform: { label: 'Podest', rise: 1.2, cost: 1, height: 1.2 },
  panel: { label: 'Portaltafel', rise: 0, cost: 1, height: 2.4, edge: true },
};

export const BLOCK_KINDS: readonly BlockKind[] = Object.keys(BLOCKS) as BlockKind[];

/** Wie hoch dieser Baustein hier gebaut wird. */
export function blockHeight(kind: BlockKind, height?: number): number {
  return height ?? BLOCKS[kind].height;
}

/**
 * Um wie viel ein Baustein den Boden der Kachel anhebt.
 *
 * Drei Fälle, und der dritte kam mit der Treppe über mehrere Kacheln:
 *
 * - Ein Möbel hebt gar nichts an.
 * - Beim **Podest** ist es seine Höhe und nicht die Zahl aus der Tabelle: Wer
 *   ein Podest zwei Meter hoch baut, steht zwei Meter höher darauf.
 * - Bei **Treppe und Rampe** ist es ihr `lift`, also ihr **Fuß**. Ein Lauf
 *   steigt über seine Kachel hinweg; wer auf ihr steht, steht irgendwo
 *   zwischen Fuß und Oberkante, und der Fuß ist die Zahl, die nicht lügt —
 *   die Oberkante wäre die der Kachel *davor*.
 */
export function blockRise(kind: BlockKind, height?: number, lift = 0): number {
  const facts = BLOCKS[kind];
  if (facts.steps) return lift;
  if (facts.rise === 0) return 0;
  return blockHeight(kind, height);
}

/**
 * Die Quader eines Bausteins, an seinem Platz und in seiner Richtung.
 *
 * Der einzige Eingang. Was hier herauskommt, geht ohne Umweg in dieselbe Liste
 * wie Boden, Wände und Türen.
 */
export function blockSolids(kind: BlockKind, at: BlockSite): PlanSolid[] {
  const height = blockHeight(kind, at.height);
  const local = BUILD[kind](height);
  const lift = at.lift ?? 0;
  return turned(local, at.dir).map((one) => ({
    ...one,
    // **Woher der Quader kommt**, und nur das (`solids.PlanSolid.block`):
    // Nach dieser Zeile ist ein Regal eine Handvoll Kästen, und ohne sie wäre
    // nicht mehr herauszufinden, welche davon zusammengehören.
    block: kind,
    x: one.x + at.x,
    y: one.y + at.base + lift,
    z: one.z + at.z,
  }));
}

/**
 * Dieselben Quader, in eine andere Richtung gedreht.
 *
 * Vier rechte Winkel, also bleiben achsenparallele Kästen achsenparallel — der
 * ganze Grund, warum die Bausteine nur in eine Richtung geschrieben sind. Bei
 * Ost und West tauschen dabei Breite und Tiefe, und **das** ist die Zeile, die
 * man vergisst: Ohne sie steht die Küchenzeile richtig herum, aber quer.
 */
export function turned(solids: readonly PlanSolid[], dir: Dir): PlanSolid[] {
  if (dir === DIR_N) return solids.map((one) => ({ ...one }));
  return solids.map((one) => {
    if (dir === DIR_S) return { ...one, x: -one.x, z: -one.z };
    if (dir === DIR_E) return { ...one, x: -one.z, z: one.x, w: one.d, d: one.w };
    return { ...one, x: one.z, z: -one.x, w: one.d, d: one.w };
  });
}

// --- die Bausteine selbst, alle nach Norden gebaut -------------------------

/** Wie weit ein Möbelstück von der Kante wegrückt, damit es nicht in der Wand steckt. */
const CLEAR = PLAN_WALL_T / 2;
/** Die Kante, an der etwas steht — in der lokalen Welt die Nordkante. */
const EDGE = -TILE / 2;
/** Wie hoch die Portaltafel über dem Boden anfängt. */
const PANEL_SILL = 0.2;

/** Wie viele Stufen ein Keil über eine Kachel bekommt (`steps`). */
function stepCount(height: number, rise: number): number {
  return Math.max(
    1,
    Math.min(Math.floor(TILE / STEP_RUN), Math.ceil(height / Math.max(0.01, rise))),
  );
}

/**
 * **Wie hoch eine Stufe einer Treppen- oder Rampenkachel ist** — für die Höhe,
 * auf der der Spieler über einen Lauf geht (`GridWorld.flightFloor`): über
 * die Vorderkanten der Stufen, also nie in einer.
 */
export function flightStepRise(kind: 'stairs' | 'ramp', height: number): number {
  return height / stepCount(height, kind === 'stairs' ? STEP_RISE : RAMP_RISE);
}

/**
 * **Ein Keil aus Stufen über eine Kachel**, von hinten nach vorn ansteigend.
 *
 * So viele Stufen, wie die gewünschte Steigung braucht — aber nie so viele,
 * dass eine flacher als `STEP_RUN` wird: Lieber eine Stufe zu hoch (das merkt
 * der Character-Controller nicht) als eine, auf der kein Fuß steht.
 */
function steps(height: number, rise: number): PlanSolid[] {
  const count = stepCount(height, rise);
  const run = TILE / count;
  const out: PlanSolid[] = [];
  for (let i = 0; i < count; i++) {
    const top = ((i + 1) / count) * height;
    // Jede Stufe geht bis zum Boden durch: ein Keil aus Quadern, unter dem
    // niemand steckenbleibt. Hinten ist unten, vorne oben.
    out.push(standing('stone', 0, 0, TILE / 2 - run / 2 - i * run, TILE, top, run));
  }
  return out;
}

const BUILD: Readonly<Record<BlockKind, (height: number) => PlanSolid[]>> = {
  /**
   * **Die Küchenzeile**: Unterschrank, Arbeitsplatte, Nische für die Füße.
   *
   * Die Nische ist die Zeile, die man weglässt und danach vermisst. Ein
   * Schrank, der bis auf den Boden geht, ist ein Kasten; einer, der zehn
   * Zentimeter über dem Boden anfängt, ist eine Küche — und man merkt es nicht
   * am Hinsehen, sondern daran, dass man davorstehen kann, ohne mit den Zehen
   * anzustoßen.
   */
  counter: (height) => {
    // Einen Meter lang und 0,6 m tief — eine Küchenzeile, wie sie in jeder
    // Küche steht. Über die **ganze** Kachel und nicht um `CLEAR` eingerückt:
    // Zwei nebeneinander sollen eine durchgehende Zeile ergeben und nicht zwei
    // Schränke mit einer Fuge dazwischen. `CLEAR` hält sie dafür von der
    // Kante weg, an der sie steht — dort steckt die Wand.
    const depth = 0.6;
    const mid = EDGE + CLEAR + depth / 2;
    const top = 0.04;
    const plinth = 0.1;
    const run = TILE;
    return [
      standing('wood', 0, plinth, mid, run, height - top - plinth, depth),
      // Der Sockel steht zurück — das ist die Nische.
      standing('steel', 0, 0, mid + 0.06, run, plinth, depth - 0.12),
      // Die Platte kragt vorne über, sonst sieht sie aus wie ein Deckel.
      standing('steel', 0, height - top, mid + 0.02, run, top, depth + 0.04),
    ];
  },

  /** **Das Regal**: zwei Wangen und vier Böden. */
  shelf: (height) => {
    const depth = 0.3;
    const mid = EDGE + CLEAR + depth / 2;
    const side = 0.04;
    const out: PlanSolid[] = [];
    const run = TILE;
    for (const s of [-1, 1]) {
      out.push(standing('wood', (s * (run - side)) / 2, 0, mid, side, height, depth));
    }
    const boards = 4;
    for (let i = 0; i < boards; i++) {
      // Der unterste Boden liegt auf dem Fußboden, der oberste ist der Deckel.
      const y = (i / (boards - 1)) * (height - 0.03);
      out.push(standing('wood', 0, y, mid, run - side * 2, 0.03, depth));
    }
    return out;
  },

  /**
   * **Der Tisch**: Platte und vier Beine, mitten auf der Kachel.
   *
   * 0,9 × 0,9 — ein Vierertisch, und er lässt ringsum eine Handbreit bis zur
   * Kachelkante. Größer ginge nicht: Ein Tisch, der über seine Kachel ragt,
   * steht in der Nachbarkachel, und die ist im Zweifel der Weg um ihn herum.
   */
  table: (height) => {
    const w = 0.9;
    const d = 0.9;
    const top = 0.06;
    const leg = 0.06;
    const out: PlanSolid[] = [standing('wood', 0, height - top, 0, w, top, d)];
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        out.push(
          standing(
            'steel',
            (sx * (w - leg * 2 - 0.1)) / 2,
            0,
            (sz * (d - leg * 2 - 0.1)) / 2,
            leg,
            height - top,
            leg,
          ),
        );
      }
    }
    return out;
  },

  /** **Die Bank**: Sitzfläche an der Kante, Lehne dahinter. */
  bench: (height) => {
    const depth = 0.36;
    const mid = EDGE + CLEAR + depth / 2 + 0.04;
    const run = TILE - 0.2;
    const board = 0.05;
    const out: PlanSolid[] = [standing('wood', 0, height - board, mid, run, board, depth)];
    for (const s of [-1, 1]) {
      out.push(
        standing('wood', (s * (run - 0.12)) / 2, 0, mid, 0.08, height - board, depth - 0.06),
      );
    }
    // Die Lehne, direkt an der Kante — ohne sie ist es ein Podest zum Draufstellen.
    out.push(standing('wood', 0, height, EDGE + CLEAR + 0.04, run, height * 0.9, 0.06));
    return out;
  },

  /**
   * **Kisten**: zwei gestapelt, und die obere sitzt schief.
   *
   * Sie sind Kulisse und nichts zum Wegtragen — was man werfen können soll,
   * ist ein Gegenstand und kein Baustein (`portal/props.ts`). Das ist der
   * Unterschied, den man sonst erst merkt, wenn ein Stapel Bausteine
   * durch die Gegend fliegt und die Karte nicht mehr stimmt.
   */
  crate: (height) => {
    // **Zwei Kisten und nicht vier.** Auf 2,5 m lagen hier drei nebeneinander
    // und eine obendrauf; auf einem Meter ist eine Kiste von 0,45 m schon fast
    // die halbe Kachel, und vier davon steckten ineinander.
    const size = Math.min(0.45, height / 2);
    return [
      standing('wood', -0.02, 0, 0.03, size, size, size),
      standing('wood', 0.04, size, -0.04, size, size, size),
    ];
  },

  /**
   * **Die Säule**: vom Boden bis unter die Decke, mitten auf der Kachel.
   *
   * **0,34 m, und das Modell darf breiter sein.** `platformer/neutral/
   * pillar_1x1x4.glb` (`BLOCK_MODELS`) ist ein Fünftel seiner Höhe breit, auf
   * Wandhöhe also 0,56 m — elf Zentimeter je Seite mehr als dieser Kasten. Die
   * beiden bekommt man nicht zur Deckung: Die Breite des Modells folgt seiner
   * Höhe, und eine Säule wird hier in jeder Höhe bestellt (2,60 m in der
   * Boxengasse, `STOREY − PLAN_FLOOR_T` unter dem Podest), also gibt es keine
   * **eine** Zahl, die mitwandern könnte.
   *
   * Von den beiden falschen Möglichkeiten ist das die kleinere. Der Kasten
   * breiter — 0,56 m auf einer Kachel von einem Meter — ließe neben ihm 0,22 m
   * stehen, und die Spielerkapsel misst 0,24 m im Halbmesser
   * (`physics/playerClearance.ts`): Aus „kostet mehr" (`BLOCKS.pillar.cost`)
   * würde „geht nicht mehr", und durch die Boxengasse käme kein Kart mehr. Ein
   * Körper, der etwas schmaler ist als sein Bild, kostet dagegen eine
   * Schulter, die eine Ecke streift.
   */
  pillar: (height) => [standing('stone', 0, 0, 0, 0.34, height, 0.34)],

  /** **Das Geländer**: Handlauf auf Pfosten, an der Kante. */
  railing: (height) => {
    const at = EDGE + PLAN_WALL_T / 2;
    const out: PlanSolid[] = [];
    for (const s of [-1, 0, 1]) {
      out.push(standing('steel', (s * (TILE - 0.12)) / 2, 0, at, 0.07, height, 0.07));
    }
    out.push(standing('steel', 0, height - 0.05, at, TILE, 0.05, 0.09));
    // Ein Knieholm auf halber Höhe: ohne ihn ist ein Geländer ein Balken in
    // der Luft, unter dem man durchfällt.
    out.push(standing('steel', 0, height / 2, at, TILE - 0.14, 0.04, 0.05));
    return out;
  },

  /**
   * **Die Brüstung**: eine niedrige, massive Mauer an der Kante.
   *
   * Sie steht **auf** der Kachelkante und nicht um `CLEAR` davor: Sie ist die
   * Kante — dort, wo sie steht, geht es hinunter, und hinter ihr ist nichts,
   * in dem sie stecken könnte. Ihr Modell (`BLOCK_MODELS`) setzt seine
   * Rückwand deshalb auch dorthin und nicht dahin, wo das Regal seine hat; es
   * ist nachgemessen 0,25 m tief, also fünf Zentimeter mehr als diese Mauer,
   * und die stehen nach **innen** — auf der Kachel, auf der man ohnehin nicht
   * bis an die Kante läuft.
   */
  parapet: (height) => [standing('stone', 0, 0, EDGE + PLAN_WALL_T / 2, TILE, height, PLAN_WALL_T)],

  /**
   * **Die Treppe**: eine Kachel breit, eine Kachel lang, ein **Teilanstieg**
   * hoch — und sie steigt **nach vorn**, also in die Richtung, in die sie
   * zeigt.
   *
   * Auf 2,5 m ging eine ganze Etage in eine Kachel; auf einem Meter geht das
   * nicht mehr, und das ist gut so. Eine Treppe, die 2,8 m auf einem Meter
   * schafft, ist eine Leiter mit Stufen von 7 cm Tiefe — man bleibt an ihr
   * hängen, und genau das war der Vorwurf an die Treppe der Straßenküche.
   * Also legt `GridPlan.stairs()` sie über **mehrere** Kacheln, und jede
   * einzelne bekommt hier ihren Teilanstieg (`height`) und ihren Fuß über dem
   * Etagenboden (`BlockSite.lift`).
   *
   * Die Stufenzahl folgt aus zwei Grenzen und nicht aus einem Geschmack:
   * **höchstens `STEP_RISE` hoch** (sonst steigt sich das nicht mehr) und
   * **mindestens `STEP_RUN` tief** (sonst steht kein Fuß darauf). Bei 0,7 m
   * Anstieg je Kachel sind das vier Stufen von 0,175 m auf 0,25 m.
   */
  stairs: (height) => steps(height, STEP_RISE),

  /** **Die Rampe**: dasselbe flacher, für draußen — Stufen, die man nicht sieht. */
  ramp: (height) => steps(height, RAMP_RISE),

  /**
   * **Das Podest**: eine volle Kachel, angehoben.
   *
   * Es ist kein Möbel, sondern Boden — deshalb steht in `BLOCKS` ein `rise`
   * und kein Aufschlag. Wer darauf will, geht über eine Treppe oder eine Rampe
   * daneben; wer darunter durch will, kann es nicht, und das ist der Zweck.
   */
  platform: (height) => [standing('stone', 0, 0, 0, TILE, height, TILE)],

  /**
   * **Die Portaltafel**: das helle Brett an der Wand, an dem ein Portal hält.
   *
   * Es ist der einzige Baustein, der nicht dafür da ist, dass man ihn ansieht,
   * sondern dafür, dass man ihn *erkennt*: In jeder Welt hier haften Portale
   * an denselben hellen Flächen und nirgends sonst, und wer das einmal gesehen
   * hat, sucht in der nächsten Welt nicht wieder danach. Deshalb ist es ein
   * Baustein und keine Zahl in einer Welt.
   *
   * Es hängt eine Handbreit über dem Boden — ein Portal, dessen Unterkante im
   * Boden steckt, führt in die Bodenplatte.
   */
  panel: (height) => [
    standing(
      'panel',
      0,
      PANEL_SILL,
      EDGE + PLAN_WALL_T / 2 + 0.09,
      TILE - 0.1,
      height - PANEL_SILL,
      0.14,
    ),
  ],
};

// --- und was davon ein Modell aus dem Regal ist ----------------------------

/**
 * **Welcher Baustein durch ein Modell aus dem KayKit-Regal ersetzt wird** —
 * und durch welches.
 *
 * Die Tabelle steht hier und nicht in der Gitterwelt, weil sie zu den
 * Bausteinen gehört und nicht zum Zeichnen: Wer `BUILD.shelf` ändert, muss
 * eine Zeile weiter sehen, dass an derselben Stelle ein Modell steht. Was
 * daraus wird — laden, drehen, hinstellen, aufräumen — ist Sache von
 * `GridWorld.buildBlockModels()`; hier stehen nur die Adresse und die
 * Rechnung dazu (`blockModelSpot`), und beides ohne three.js, damit es ein
 * Test in Millisekunden nachrechnet.
 *
 * **Es ist ein Bild und kein Vertrag** (`docs/agents/modelle.md`, „Drei
 * Regeln, die für jeden Tausch gelten"): Die Quader des Bausteins bleiben
 * stehen, sie tragen weiter den Körper und ihren Aufschlag im
 * Navigationsgraphen, und sie werden lediglich unsichtbar — und zwar erst,
 * wenn die Datei wirklich angekommen ist. In einem Checkout ohne die
 * gekauften Pakete und in jedem Jest-Lauf steht das gerechnete Regal da und
 * tut, was es immer tat.
 *
 * **Das Regal ist der erste Eintrag**, weil es der einzige Baustein ist, bei
 * dem das Modell ohne Umrechnung passt: `dungeon/bookcase_single.glb` ist in
 * der Quelle 2,000 × 3,000 × 0,500 groß, mit dem Maßstab des Pakets
 * (`core/kaykitFit.KAYKIT_SCALE`, 0,5) also 1,00 × 1,50 × 0,25 m — eine
 * Kachel breit, so hoch wie `BLOCKS.shelf` (siehe die Begründung dort) und
 * fünf Zentimeter flacher als die gerechneten 0,30 m. Sein Ursprung liegt in
 * der Mitte seiner Unterkante, seine Rückwand bei z = −0,25 und seine Front
 * bei z = +0,25 — also genau herum wie ein Baustein, der an seiner Kante
 * steht und in den Raum schaut.
 *
 * **Die vier danach sind vier Mal dieselbe Frage**, und sie lautet nicht „wie
 * heißt das Ding", sondern „**geht das Verhältnis auf**": Skaliert wird
 * gleichmäßig (`blockModelSpot`), also entscheidet der Aufriss des Modells
 * darüber, wie breit es wird, sobald es auf die Höhe des Bausteins kommt.
 * Nachgemessen in den Dateien selbst, in Quelleinheiten, und der Maßstab des
 * Pakets ist überall 0,5 (`core/kaykitFit`) außer bei `prototype-bits`:
 *
 * - **Tisch** — `furniture-bits/table_small.glb`, 1,000 × 1,000 × 1,000. Im
 *   Aufriss quadratisch, auf 0,75 m Tischhöhe also 0,75 m breit und tief:
 *   passt mittig auf die Kachel, und `BLOCKS.table.height` bleibt, wie es war.
 *   Der große Bruder (`table_medium.glb`, 2,000 × 1,000 × 2,000) wäre auf
 *   Kachelbreite nur 0,50 m hoch — ein Couchtisch.
 * - **Bank** — `furniture-bits/chair_A.glb`, 0,750 × 1,258 × 0,845: ein Stuhl
 *   mit Lehne, und genau das baut `BUILD.bench` auch. Die Parkbank aus dem
 *   Städtebaukasten (`city-builder-bits/bench.glb`) ist **nachgemessen** 0,400
 *   × 0,100 × 0,150 groß — eine Miniatur für die Vogelperspektive, kein Möbel
 *   zum Danebenstehen.
 * - **Säule** — `platformer/neutral/pillar_1x1x4.glb`, 0,800 × 4,000 × 0,800.
 *   Schlank: ein Fünftel ihrer Höhe breit, auf `PLAN_WALL_H` also 0,56 m. Das
 *   ist mehr als die gerechneten 0,34 m, und es ist der einzige Eintrag, bei
 *   dem das Bild breiter ist als sein Körper — mehr dazu bei `BUILD.pillar`.
 * - **Brüstung** — `dungeon/barrier_half.glb`, 2,000 × 1,100 × 0,500, also
 *   genau eine Kachel breit; die Höhe dazu steht in `BLOCKS.parapet`. Die
 *   lange Schwester (`barrier.glb`, 4,000 breit) wäre auf Kachelbreite nur
 *   0,275 m hoch, und `platformer/neutral/barrier_1x1x1.glb` ist — wieder
 *   nachgemessen und nicht nach dem Namen geraten — ein **massiver Würfel**
 *   von 1 × 1 × 1 und kein Geländer: Er deckte die ganze Kachel zu, auch die
 *   Hälfte, auf der man steht.
 *
 * **Und zwei, bei denen das Verhältnis nicht aufgeht** — die beiden, die hier
 * eine Weile als „bleibt gebaut" standen, und der Grund, warum es
 * `BlockFacts.fit` gibt:
 *
 * - **Die Theke** — `dungeon/bar_straight_B_short.glb`, 1,000 × 1,000 × 1,243:
 *   im Aufriss quadratisch, mit einer überkragenden Platte und einer
 *   Schubladenfront samt zwei Griffen. Gleichmäßig auf 0,90 m Arbeitshöhe
 *   gebracht wäre sie 1,12 m tief und stünde mit 22 cm in die Nachbarkachel
 *   hinein — also genau dorthin, wo man vor einer Theke steht. Dabei wäre sie
 *   nur 0,90 m breit, und zwei nebeneinander ließen eine Fuge von zehn
 *   Zentimetern; eingepasst ergeben sie die durchgehende Zeile, die
 *   `BUILD.counter` baut. Die drei Zeichnungen unterscheiden sich nur an der
 *   Front: `_A` ist ein glatter Kasten, `_C` trägt ein aufgesetztes Schnitzwerk,
 *   das 9 cm vorsteht, und `_B` hat die Schublade mit den beiden Knäufen.
 *   Gesucht ist hier eine **Werkbank** — die Schießbank des Stands ist eine
 *   Küchenzeile (`test/zones/range.ts`) —, also `_B`. Die langen Geschwister
 *   (`_A`/`_B`/`_C` ohne `_short`, 2,000 breit) sind doppelt so breit wie hoch
 *   und ergäben auf Kachelbreite eine Theke von 0,50 m, also eine halbe
 *   Küchenzeile.
 * - **Die Treppe** — `prototype-bits/Primitive_Stairs_Half.glb`: **vier**
 *   Stufen von 0,5 × 0,5 über 2 × 2 Quelleinheiten, 4 breit, und sie steigen
 *   über **x**. Nachgezählt am Netz selbst, Trittfläche für Trittfläche, und
 *   das ist der Unterschied zu den Außenmaßen: `dungeon/
 *   stairs_modular_center.glb` sieht mit 4 × 4 genauso aus und hat **acht**
 *   Stufen; `stairs.glb`/`stairs_narrow.glb` sind ganze Läufe mit Geländer
 *   (5,100 auf 4,000). Vier Stufen sind genau das, was `BUILD.stairs` auf eine
 *   Kachel baut — und weil sie dort wie hier **gleich hoch** sind, fällt jede
 *   Trittfläche des eingepassten Modells auf die des gebauten Keils, solange
 *   die Kachel vier Stufen baut. Das tut sie bei jedem Teilanstieg über 0,6 m,
 *   also bei `STAIR_LIFT` und bei allem, was `GridPlan.flight` daraus rechnet
 *   (der Test daneben rechnet die vier Höhen nach).
 *
 * Beide brauchen dafür dasselbe: **je Achse einpassen statt gleichmäßig**
 * (`BlockFacts.fit`, `BlockModelSpot.scale`). Das war einmal der Einwand gegen
 * sie — `scale` war eine Zahl und die Gitterwelt setzte sie mit
 * `scale.setScalar` —, und es war kein Einwand gegen die Modelle, sondern
 * gegen drei Zeilen Code. Dieselbe Rechnung steht im Projekt seit den
 * Requisiten zweimal da (`test/zones/propFit.ts`, `climb/padRamp.ts`), und dort
 * steht auch das Argument, warum sie bei einer Schräge **exakt** ist: Eine
 * ungleichmäßige Skalierung bildet eine Ebene auf eine Ebene ab. Der Preis ist
 * eine Theke, die 43 % flacher ist, als der Zeichner sie gezeichnet hat; das
 * sieht man nur von der Seite, und an einer Küchenzeile in einer Reihe steht
 * niemand seitlich. Bei einem Stuhl wäre derselbe Handgriff falsch, und
 * deshalb steht er am Baustein und nicht im Rumpf.
 */
export const BLOCK_MODELS: Readonly<Partial<Record<BlockKind, string>>> = {
  shelf: 'dungeon/bookcase_single.glb',
  table: 'furniture-bits/table_small.glb',
  bench: 'furniture-bits/chair_A.glb',
  pillar: 'platformer/neutral/pillar_1x1x4.glb',
  parapet: 'dungeon/barrier_half.glb',
  counter: 'dungeon/bar_straight_B_short.glb',
  stairs: 'prototype-bits/Primitive_Stairs_Half.glb',
};

/** Die Adresse im Regal, oder `null` — der einzige Eingang zu `BLOCK_MODELS`. */
export function blockModel(kind: BlockKind): string | null {
  return BLOCK_MODELS[kind] ?? null;
}

/**
 * **Der Umriss eines geladenen Modells** in Metern, achsenparallel — dasselbe,
 * was `THREE.Box3` hergibt, nur ohne three.js.
 */
export interface ModelBounds {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

/** Drei Zahlen — three.js-frei, damit die Rechnung prüfbar bleibt. */
export interface BlockVec {
  x: number;
  y: number;
  z: number;
}

/** Wohin das Modell kommt: Platz, Drehung und der Maßstab obendrauf. */
export interface BlockModelSpot {
  /**
   * Was **zusätzlich** auf die geladene Gruppe kommt, die den Maßstab ihres
   * Pakets schon trägt (`core/kaykitModel.copyOf`), **in den eigenen Achsen des
   * Modells** — die Drehung kommt danach. Passt das Modell von selbst, ist es
   * überall genau `1`.
   *
   * **Drei Zahlen und nicht eine**, seit Theke und Treppe dazugekommen sind.
   * Es wäre bequemer gewesen, hier eine Zahl stehen zu lassen und die beiden
   * Ausnahmen daneben zu schreiben, aber dann gäbe es zwei Wege, ein Modell
   * hinzustellen, und der zweite wäre der ungeprüfte. Ein gleichmäßig
   * skaliertes Möbel ist jetzt der Sonderfall, in dem alle drei Zahlen
   * dieselbe sind — und genau das prüft der Test daneben für die fünf, bei
   * denen es so bleiben soll.
   */
  scale: BlockVec;
  x: number;
  y: number;
  z: number;
  /**
   * Um die Hochachse, in Bogenmaß — die Drehung, die `turned()` rechnet, und
   * dazu die Vierteldrehung des Modells selbst (`BlockModelFit.turn`), falls es
   * eine braucht.
   */
  yaw: number;
}

/**
 * **Wo das Modell eines Bausteins steht** — gemessen am Modell und nicht
 * abgeschrieben.
 *
 * Der Aufrufer misst den geladenen Baum (`THREE.Box3().setFromObject(…)`) und
 * gibt den Umriss hier herein; was zurückkommt, ist fertig zum Hinstellen. Der
 * Grund für diesen Schnitt steht schon bei der Druckplatte
 * (`fixtures/plate.ts`): Eine Zahl aus einer Datei, die man einmal nachgemessen
 * und dann in den Code geschrieben hat, liegt nach dem nächsten Paket-Update
 * daneben, und niemand rechnet sie nach. Gemessen wird also jedes Mal, und die
 * Rechnung darüber steht hier, wo ein Test sie ohne Brille prüfen kann.
 *
 * **Vier Sachen werden entschieden, und jede hat ihren Grund** — so lange, wie
 * gleichmäßig skaliert wird, und das ist bei einem Möbel immer (die beiden
 * Ausnahmen stehen unten):
 *
 * - **Der Maßstab ist der kleinere von zwei Wünschen**: so hoch wie der
 *   Baustein und höchstens so breit wie seine Kachel (`TILE`).
 *   Der zweite Wunsch ist der, den man vergisst. Ein Möbel wird gleichmäßig
 *   skaliert — ein Regal, das in der Höhe gestreckt und in der Breite gestaucht
 *   wird, sieht aus wie ein Fehler —, und damit wächst mit der Höhe die Breite
 *   mit. `BUILD.shelf` dagegen baut seine Böden bei **jeder** Höhe genau eine
 *   Kachel breit. Wer ein Regal doppelt so hoch stellt, bekäme sonst ein
 *   Modell, das in die Nachbarkachel ragt, während sein Körper brav auf der
 *   eigenen steht.
 * - **„So hoch wie der Baustein" heißt: so hoch wie seine Quader** — gemessen
 *   an `BUILD[kind]` und nicht in `BLOCKS[kind].height` nachgeschlagen. Bei
 *   elf von zwölf Bausteinen ist das dieselbe Zahl (der Test daneben hält sie
 *   zusammen); bei der **Bank** ist es das nicht, denn ihre Zahl ist die
 *   Sitzfläche und ihre Lehne steht darüber. Ein Stuhl, der auf 0,46 m
 *   eingepasst würde, wäre samt Lehne so hoch wie seine eigene Sitzfläche —
 *   Puppenmöbel vor einem Körper in Bankgröße. Gefragt wird deshalb das
 *   Gebaute, und das weiß es ohne eine zweite Zahl in der Tabelle.
 * - **Ein Baustein an der Kante setzt seine Rückwand dorthin, wo seine Quader
 *   ihre haben** (`BlockFacts.edge`, `built.minZ`) — einer, der frei steht,
 *   stellt sich mittig auf die Kachel. Das ist nicht dieselbe Kante für alle:
 *   Regal, Bank und Küchenzeile rücken um `CLEAR` von der Kachelkante ab, weil
 *   dort eine Wand stecken kann; die Brüstung **ist** die Kante und steht
 *   darauf. Eine feste Zahl (`EDGE + CLEAR`) stimmte deshalb für die einen und
 *   ließe die andere eine Handbreit vor ihrem eigenen Körper stehen — genau
 *   der Fehler, den man erst in der Brille sieht. Und ein Tisch, der seine
 *   Rückwand an eine Kante legte, stünde nicht dort, wo `BUILD.table` seine
 *   vier Beine hinstellt.
 * - **Gerechnet wird nach Norden und danach gedreht**, wie überall hier. Der
 *   Winkel ist derselbe, den `turned()` auf die Quader anwendet und
 *   `fixtures/index.fixtureYaw` auf die Einbauten; der Test daneben hält die
 *   beiden zusammen, indem er nicht den Winkel vergleicht, sondern wo die
 *   Rückwand landet.
 *
 * Der Umriss wird dabei **nicht** als mittig angenommen: Verschoben wird nach
 * seiner gemessenen Mitte in x, seiner Unterkante in y und — an einer Kante —
 * seiner Rückkante in z. Ein Modell mit einem Ursprung irgendwo im Nirgendwo
 * steht damit trotzdem richtig, und das ist bei 4 470 fremden Dateien keine
 * Vorsicht, sondern die Regel: Die Brüstung ist so eine (ihre x-Achse läuft
 * von 0 bis 2 statt von −1 bis 1).
 *
 * **Und für zwei Bausteine gilt das alles nicht** (`BlockFacts.fit`): Theke und
 * Treppe werden **je Achse** eingepasst, und dann ist die ganze Rechnung ein
 * Satz — *der Umriss des Modells wird der Umriss der Quader*. Kein kleinerer
 * von zwei Wünschen, keine Kante, keine Mitte: Wenn das Bild denselben Kasten
 * füllt wie der Körper, stehen Rückwand und Mitte von selbst richtig. Was
 * dafür dazukommt, ist die Vierteldrehung des Modells (`BlockModelFit.turn`) —
 * sie muss **vor** dem Einpassen stattfinden, sonst presst man die Breite des
 * Modells in die Tiefe des Bausteins.
 */
export function blockModelSpot(kind: BlockKind, at: BlockSite, box: ModelBounds): BlockModelSpot {
  // **Der Baustein, wie er ohne Modell dastünde** — nach Norden gebaut, also
  // in derselben kleinen Welt, in der gleich gerechnet wird. Er ist das Maß
  // für die Höhe und für die Kante, an der das Modell steht.
  const height = blockHeight(kind, at.height);
  const built = solidBounds(BUILD[kind](height)) ?? {
    minX: 0,
    minY: 0,
    minZ: EDGE + CLEAR,
    maxX: 0,
    maxY: height,
    maxZ: 0,
  };
  const facts = BLOCKS[kind];
  const fitted = facts.fit !== undefined;
  // Vierteldrehungen, auf 0…3 gebracht — negative Zahlen sind dasselbe von der
  // anderen Seite, und `spun` will es nur einmal wissen.
  const quarter = (((facts.fit?.turn ?? 0) % 4) + 4) % 4;
  // **Das Modell in den Achsen des Bausteins.** Bei einer Vierteldrehung
  // tauschen Breite und Tiefe — dieselbe Zeile, die bei den Quadern `turned()`
  // schreibt, und dieselbe, die man vergisst.
  const front = spun(box, quarter);
  // Ein leeres oder entartetes Maß ist kein Absturz wert: Dann bleibt der
  // Maßstab 1, und das Modell steht so da, wie es aus der Datei kam.
  const tall = Math.max(1e-6, front.maxY - front.minY);
  const wide = Math.max(1e-6, front.maxX - front.minX);
  const deep = Math.max(1e-6, front.maxZ - front.minZ);
  // **Gleichmäßig**: der kleinere von zwei Wünschen — so hoch wie die Quader
  // und höchstens so breit wie die Kachel.
  const even = Math.min((built.maxY - built.minY) / tall, TILE / wide);
  // **Oder je Achse**: der Umriss des Modells wird der Umriss der Quader. In
  // den Achsen des **Bausteins**, denn erst dort heißt x Breite und z Tiefe.
  const size: BlockVec = facts.fit
    ? {
        x: (built.maxX - built.minX) / wide,
        y: (built.maxY - built.minY) / tall,
        z: (built.maxZ - built.minZ) / deep,
      }
    : { x: even, y: even, z: even };
  // In der kleinen Welt des Bausteins: Mitte auf der Kachelachse, Unterkante
  // auf der der Quader, Rückwand an der Kante — oder eben mittig auf der
  // Kachel. Eingepasst fallen die drei zusammen, denn dann deckt sich der
  // ganze Kasten, und deshalb steht das Eingepasste bei beiden auf derselben
  // Seite des Fragezeichens.
  const lx = fitted ? built.minX - front.minX * size.x : (-(front.minX + front.maxX) / 2) * size.x;
  const ly = built.minY - front.minY * size.y;
  const lz =
    fitted || facts.edge
      ? built.minZ - front.minZ * size.z
      : (-(front.minZ + front.maxZ) / 2) * size.z;
  const spin = (-at.dir * Math.PI) / 2;
  const cos = Math.cos(spin);
  const sin = Math.sin(spin);
  return {
    // **Zurück in die Achsen des Modells**: `holder.scale` wirkt vor der
    // Drehung (three.js setzt `T · R · S` zusammen), eine Vierteldrehung
    // tauscht also x und z wieder zurück.
    scale: quarter % 2 === 0 ? size : { x: size.z, y: size.y, z: size.x },
    x: at.x + lx * cos + lz * sin,
    y: at.base + (at.lift ?? 0) + ly,
    z: at.z - lx * sin + lz * cos,
    yaw: spin + (quarter * Math.PI) / 2,
  };
}

/**
 * **Derselbe rechte Winkel, nur auf einen Umriss** — `turned()` dreht Quader,
 * das hier dreht die gemessene Hülle eines Modells.
 *
 * Vier rechte Winkel, also bleibt ein achsenparalleler Kasten achsenparallel;
 * gerechnet wird mit Vertauschen und Vorzeichen und nicht mit `Math.cos`, damit
 * eine Vierteldrehung **genau** eine ist und nicht 6,1 · 10⁻¹⁷ daneben.
 *
 * `quarter` ist schon auf 0…3 gebracht — der Aufrufer weiß, ob er nach links
 * oder nach rechts dreht, hier ist beides dieselbe Vertauschung.
 */
function spun(box: ModelBounds, quarter: number): ModelBounds {
  const high = { minY: box.minY, maxY: box.maxY };
  if (quarter === 1)
    return { ...high, minX: box.minZ, maxX: box.maxZ, minZ: -box.maxX, maxZ: -box.minX };
  if (quarter === 2)
    return { ...high, minX: -box.maxX, maxX: -box.minX, minZ: -box.maxZ, maxZ: -box.minZ };
  if (quarter === 3)
    return { ...high, minX: -box.maxZ, maxX: -box.minZ, minZ: box.minX, maxZ: box.maxX };
  return { ...box };
}

/** Nur damit die vier Richtungen einmal namentlich in dieser Datei stehen. */
export const BLOCK_FACINGS: readonly Dir[] = [DIR_N, DIR_E, DIR_S, DIR_W];
