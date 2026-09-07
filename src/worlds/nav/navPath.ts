import { believedLinkOpen, believedWalkable, believedWallState, type NavBelief } from './navBelief';
import {
  doorPower,
  newWallState,
  type DoorPower,
  type NavGraph,
  type NavLink,
  type WallState,
} from './navGraph';
import { hazardCost, linkFactor, powerOf, type CostProfile } from './navProfile';
import { canWalkLine, traceLine } from './navSight';
import {
  DIRS,
  DIR_N,
  NO_TILE,
  TILE,
  dirX,
  dirZ,
  keyLevel,
  keyX,
  keyZ,
  neighbour,
  opposite,
  tileCentreX,
  tileCentreZ,
  tileManhattan,
  type Dir,
  type TileKey,
} from './navTile';

/**
 * **Die Wegsuche** — A* über die Kacheln, und ein Strömungsfeld für die, die
 * zu fünfzigst dasselbe wollen.
 *
 * Die Kosten sind durchgehend in **Metern**, und das ist keine Kosmetik: Die
 * Schätzung darf den echten Weg nie überschätzen, sonst findet A* zwar
 * schnell, aber nicht mehr den kürzesten Weg. Weil eine Kachel mindestens ihre
 * eigene Kantenlänge kostet (`Math.max(1, cost)` unten) und die Schätzung der
 * Weg über die Kanten in Metern ist, stimmt das hier — und wer den Faktor
 * `cost` unter 1 setzen will, um eine Kachel *schneller* zu machen, findet
 * genau hier die Zeile, die ihn daran hindert.
 *
 * Zwei Wege stehen zur Wahl, und sie beantworten verschiedene Fragen:
 *
 * - **`findPath`** — einer will irgendwohin. Kostet, was die Karte groß ist.
 * - **`flowField`** — viele wollen an dieselbe Stelle. Kostet **einmal**, was
 *   die Karte groß ist, und danach ist jede Frage „wohin als nächstes" ein
 *   Nachschlagen. Das ist der Unterschied zwischen einer Horde von fünfzig
 *   Zombies, die läuft, und einer, die ruckelt.
 */

/** Wie gesucht wird. */
export interface PathOptions {
  profile: CostProfile;
  /** Die Meinung dessen, der läuft — ohne sie wird die Welt gesehen, wie sie ist. */
  belief?: NavBelief | null;
  /** Überschreibt, ob er Türen aufmachen kann. Sonst entscheidet das Profil. */
  canOpen?: boolean;
  /** Überschreibt, ob er Türen einschlagen kann. Sonst entscheidet das Profil. */
  canBreak?: boolean;
  /**
   * Wie viele Kacheln höchstens angefasst werden.
   *
   * Die Reißleine für den Fall, dass jemand quer über eine große Karte sucht
   * und das Ziel eingemauert ist: Dann wird die **ganze** erreichbare Welt
   * durchsucht, bevor „kein Weg" herauskommt. Mit der Grenze kommt stattdessen
   * ein Teilweg heraus, und der ist in der Brille immer noch besser als ein
   * Bild, das eine Zehntelsekunde steht.
   */
  maxNodes?: number;
  /**
   * Wie dick der ist, der den Weg laufen soll — sein **Halbmesser** in Metern.
   *
   * Nur der Schnurzug (`pullString`) fragt danach, und er ist der einzige
   * Schritt der Wegsuche, den der Umfang überhaupt etwas angeht: Welche
   * Kacheln begehbar sind, entscheidet das Abtasten (`navBake.ts`) mit der
   * Schulterbreite, mit der es die Lücken misst. Wie **nah an der Hausecke**
   * der fertige Weg vorbeiführt, entscheidet dagegen diese Zahl — und ein Weg,
   * der die Ecke um zwanzig Zentimeter verfehlt, ist für einen 58 cm dicken
   * Zombie eine Wand.
   */
  radius?: number;
  /**
   * Wie viel **Luft** der Weg über den Halbmesser hinaus zur Wand hält, in
   * Metern (`NAV_CLEARANCE`).
   */
  clearance?: number;
}

/**
 * Was der, der diesen Weg läuft, an einer Tür kann.
 *
 * Steht hier und nicht in jedem Aufrufer, weil sonst die Wegsuche eine andere
 * Tür sähe als der Schnurzug danach — und dann plant er durch eine Tür, um die
 * seine Schnur einen Bogen macht.
 */
function powerFor(options: PathOptions): DoorPower {
  const base = powerOf(options.profile);
  return doorPower({
    opens: options.canOpen ?? base.opens,
    breaks: options.canBreak ?? base.breaks,
  });
}

/**
 * **Ein Wegpunkt** — wo er liegt, und auf welcher Kachel.
 *
 * Zwei Angaben, weil zwei Fragen daran hängen. Gelaufen wird zum **Punkt**,
 * und der liegt nach dem Schnurzug selten auf einer Kachelmitte — das ist der
 * ganze Sinn der Sache. Gefragt wird aber nach der **Kachel**: Die
 * Debug-Ansicht zeichnet Kacheln (`navScene.navPathView`), und wer vor einer
 * Tür steht, sucht sie an seiner eigenen (`navAgent.observe`).
 */
export interface PathPoint {
  tile: TileKey;
  x: number;
  z: number;
  /**
   * Ob dieser Punkt **Abstand hält** — er liegt einen Halbmesser neben einer
   * Ecke, und wer ihn abkürzt, läuft in sie hinein.
   *
   * Der Unterschied zählt beim Ablaufen: Einen Punkt mitten im Raum darf man
   * großzügig streifen, einen engen erst dann hinter sich lassen, wenn man
   * wirklich an ihm vorbei ist (`navAgent.ts`).
   */
  tight: boolean;
}

export interface PathResult {
  /** Die Kacheln vom Start zum Ziel, den Start eingeschlossen. */
  tiles: TileKey[];
  /** Was der Weg kostet, in Metern. */
  cost: number;
  /** Wie viele Kacheln dafür angefasst wurden — für die Debug-Ansicht. */
  visited: number;
  /**
   * Ob das Ziel erreicht wurde.
   *
   * `false` heißt nicht „nichts gefunden": `tiles` enthält dann den Weg zu der
   * Kachel, die dem Ziel am nächsten gekommen ist. Ein NPC, der bis vor die
   * Barrikade läuft und dort steht, ist richtig; einer, der auf der Stelle
   * stehen bleibt, weil das Ziel unerreichbar ist, sieht kaputt aus.
   */
  complete: boolean;
}

const DEFAULT_MAX_NODES = 6000;

/**
 * Der Halbmesser, mit dem gerechnet wird, wenn niemand einen nennt, in Metern.
 *
 * Ungefähr ein Mensch (`npc/npcKinds.ts`: 0,29 m für den Zombie, 0,28 für die
 * Puppe). Wer schmaler ist, sagt es — ein Ring auf dem Boden braucht keinen
 * Abstand zur Wand (`shared/previewWalk.ts`).
 */
export const DEFAULT_RADIUS = 0.3;

/**
 * Was eine Wand über ihre Kachelgrenze hinausragt, in Metern.
 *
 * Auf der Karte ist eine Wand eine **Linie** zwischen zwei Kacheln; in der
 * Welt ist sie ein Klotz mit Dicke, und der steht zur Hälfte auf jeder Seite
 * dieser Linie (im Labor 40 cm, außen herum 50). Wer an einer Ecke nur um
 * seinen eigenen Halbmesser einzieht, plant seinen Weg deshalb in die Wand
 * hinein: Von 29 cm Abstand zur Linie bleiben neun zum Klotz, und der Zombie
 * steht am Wandende und kommt weder vor noch zurück. Genau das war der Fehler,
 * wegen dem diese Zeile hier steht — die halbe Wandstärke kommt zum
 * Halbmesser dazu.
 */
export const WALL_SKIN = 0.25;

/**
 * **Wie viel Luft ein Weg zur Wand hält**, über den eigenen Umfang hinaus, in
 * Metern.
 *
 * Der Zentimeterbetrag, der einen Weg von einem *begehbaren* Weg unterscheidet.
 * Bis hierher zog die Schnur genau um Halbmesser und Wandstärke ein: Auf dem
 * Papier passt der Zylinder damit haargenau vorbei, in der Welt schrammt er
 * entlang — Rapier drückt ihn bei jeder Berührung zur Seite, das Hirn zieht
 * ihn zurück auf die Linie, und was man sieht, ist ein Zombie, der sich an
 * einer Ecke festfrisst.
 *
 * Das ist dieselbe Idee, mit der eine Unity-Navmesh um den Agentenradius von
 * jeder Wand **abrückt**, nur an der Stelle, an der dieses Projekt sie braucht:
 * nicht in der Fläche (die ist hier ein Kachelgitter und kennt keine halben
 * Kacheln), sondern in der Linie, die am Ende gelaufen wird.
 *
 * **15 cm**, und die Zahl ist nach oben so begrenzt wie nach unten: Weniger
 * merkt man nicht, mehr macht aus einer Kachel Durchlass einen, durch den die
 * Schnur nicht mehr passt (siehe die Deckelung in `shrinkFor`).
 */
export const NAV_CLEARANCE = 0.15;

/**
 * Wie weit ein Durchlass an einer besetzten Ecke eingezogen wird, in Metern.
 *
 * Vier Posten, und der dritte ist der, den man nicht sieht: der **Halbmesser**
 * dessen, der läuft, die **halbe Wandstärke** (`WALL_SKIN`), ein Aufschlag von
 * √2 für die **Sehne** — und die **Luft** obendrauf (`NAV_CLEARANCE`). Die
 * Schnur legt sich nicht als Bogen um eine Ecke, sondern als Kette von
 * Geraden: Zwei Wegpunkte, die je einen Halbmesser neben derselben Ecke
 * liegen, sind über ihre Verbindungslinie nur noch das 0,71-fache davon
 * entfernt. Wer ohne diesen Aufschlag rechnet, hält an den Wegpunkten sauber
 * Abstand und schleift dazwischen an der Ecke entlang.
 *
 * Nach oben begrenzt eine halbe Kachel: Wer dicker ist als der Durchlass,
 * bekäme einen, der sich selbst überkreuzt — und damit einen Weg, der
 * rückwärts läuft. Dass er dann durch die Lücke nicht passt, ist nicht die
 * Frage der Glättung, sondern die des Abtastens (`navBake.ts`).
 */
export function shrinkFor(radius: number, clearance: number = NAV_CLEARANCE): number {
  const near = (Math.max(radius, 0) + WALL_SKIN) * Math.SQRT2 + Math.max(clearance, 0);
  return Math.min(near, TILE * 0.45);
}

/** Was es kostet, diese Kachel zu betreten, in Metern. `Infinity` = niemals. */
function enterCost(graph: NavGraph, key: TileKey, profile: CostProfile): number {
  const facts = graph.tile(key);
  if (!facts) return Infinity;
  const hazard = hazardCost(profile, facts.hazard);
  if (!Number.isFinite(hazard)) return Infinity;
  // Höchstens schneller als normal geht nicht: siehe oben, sonst lügt die
  // Schätzung und A* findet Umwege statt Wegen.
  return TILE * Math.max(1, facts.cost) + hazard;
}

/**
 * Ein Weg von `from` nach `to`.
 *
 * Gibt es keinen, kommt der beste Teilweg zurück (`complete: false`). Gibt es
 * nicht einmal einen Startpunkt, ein leeres Ergebnis.
 */
export function findPath(
  graph: NavGraph,
  from: TileKey,
  to: TileKey,
  options: PathOptions,
): PathResult {
  const { profile } = options;
  const belief = options.belief ?? null;
  const power = powerFor(options);
  const maxNodes = options.maxNodes ?? DEFAULT_MAX_NODES;
  const empty: PathResult = { tiles: [], cost: 0, visited: 0, complete: false };

  if (from === NO_TILE || to === NO_TILE) return empty;
  if (!believedWalkable(belief, graph, from)) return empty;
  if (from === to) return { tiles: [from], cost: 0, visited: 1, complete: true };

  const open = new NodeHeap();
  const gScore = new Map<TileKey, number>([[from, 0]]);
  const cameFrom = new Map<TileKey, TileKey>();
  const closed = new Set<TileKey>();
  const scratch = newWallState();

  let bestNode = from;
  let bestHeuristic = tileManhattan(from, to);
  let visited = 0;

  open.push(from, bestHeuristic);

  while (open.size > 0) {
    const current = open.pop();
    if (closed.has(current)) continue;
    closed.add(current);
    visited++;

    if (current === to) {
      return {
        tiles: unwind(cameFrom, current),
        cost: gScore.get(current) ?? 0,
        visited,
        complete: true,
      };
    }
    if (visited >= maxNodes) break;

    const g = gScore.get(current) ?? 0;

    // Die vier Nachbarn auf derselben Etage.
    for (const dir of DIRS) {
      const next = neighbour(current, dir);
      if (next === NO_TILE || closed.has(next)) continue;
      if (!believedWalkable(belief, graph, next)) continue;
      const wall = believedWallState(belief, graph.wall(current, dir), power, scratch);
      if (!wall.walk) continue;
      const step = enterCost(graph, next, profile);
      if (!Number.isFinite(step)) continue;
      relax(current, next, g + step + wall.cost);
    }

    // Und alles, was von hier aus gebaut wurde: Rampen, Kanten, Leitern,
    // Sprünge, Portale. **Ob er dort hinaufkommt, sagt sein Profil** — und
    // zwar für diese Richtung: Dieselbe Kante ist hinunter ein Absprung und
    // hinauf eine Wand (`navProfile.linkFactor`).
    for (const exit of graph.linksFrom(current)) {
      const { link, to: next } = exit;
      if (closed.has(next)) continue;
      const factor = linkFactor(profile, link, next);
      if (!Number.isFinite(factor)) continue;
      if (!believedLinkOpen(belief, link)) continue;
      if (!believedWalkable(belief, graph, next)) continue;
      const step = enterCost(graph, next, profile);
      if (!Number.isFinite(step)) continue;
      relax(current, next, g + link.cost * factor + step);
    }
  }

  // Kein Weg ans Ziel: der beste Teilweg ist besser als gar keiner.
  return {
    tiles: bestNode === from ? [from] : unwind(cameFrom, bestNode),
    cost: gScore.get(bestNode) ?? 0,
    visited,
    complete: false,
  };

  function relax(current: TileKey, next: TileKey, cost: number): void {
    const known = gScore.get(next);
    if (known !== undefined && known <= cost) return;
    gScore.set(next, cost);
    cameFrom.set(next, current);
    const heuristic = tileManhattan(next, to);
    if (heuristic < bestHeuristic) {
      bestHeuristic = heuristic;
      bestNode = next;
    }
    open.push(next, cost + heuristic);
  }
}

function unwind(cameFrom: Map<TileKey, TileKey>, end: TileKey): TileKey[] {
  const tiles = [end];
  let node = end;
  // Die Kette ist nie länger als die Zahl der Einträge — der Zähler ist die
  // Versicherung gegen einen Kreis, den es hier nicht geben darf.
  for (let i = 0; i <= cameFrom.size; i++) {
    const previous = cameFrom.get(node);
    if (previous === undefined) break;
    tiles.push(previous);
    node = previous;
  }
  tiles.reverse();
  return tiles;
}

/**
 * **Der Schnurzug** — aus dem Treppenmuster der Kachelmitten wird die Linie,
 * die ein Mensch auch gelaufen wäre.
 *
 * Ohne ihn läuft jeder NPC exakt über die Kachelmitten, und bei 2,5 Metern
 * Kantenlänge sieht man das: Er zickzackt durch einen Gang, der gerade ist —
 * genau das ist gemeint, wenn jemand aus der Brille kommt und sagt, die
 * Navigation laufe „Manhattan-mäßig".
 *
 * Er arbeitet in zwei Schritten, und jeder beantwortet eine eigene Frage:
 *
 * 1. **Über welche Kacheln geht der Weg wirklich?** Was man von seinem
 *    Vorgänger aus in gerader Linie erreicht, braucht keinen eigenen Wegpunkt
 *    (`navSight.canWalkLine`); übrig bleiben die Ecken, um die tatsächlich
 *    herumgelaufen wird, und dazwischen die Kacheln unter der Geraden
 *    (`channels`). Was die Suche wegen einer Gefahr gemieden hat, bleibt dabei
 *    tabu — sonst plant der Mensch sauber um die Stachelgrube herum und läuft
 *    dann quer hindurch.
 * 2. **Wo genau in diesen Kacheln?** Dafür wird eine Schnur durch die
 *    **Durchlässe** zwischen je zwei aufeinanderfolgenden Kacheln gezogen (der
 *    „Trichter"): Sie liegt anfangs im Startpunkt und wird Durchlass für
 *    Durchlass straffgezogen; wo sie sich verhakt, steht ein Wegpunkt.
 *
 * Der zweite Schritt ist der, wegen dem es diese Datei gibt. Jeder Durchlass
 * wird an beiden Enden **eingezogen** — überall dort, wo an der Ecke wirklich
 * etwas steht, und zwar um den Halbmesser dessen, der ihn laufen soll, plus
 * Wandstärke und Sehne (`shrinkFor`). Das ist der Unterschied zwischen einer
 * Linie und einem Weg: Ein NPC ist ein Zylinder mit 29 cm Halbmesser, und eine
 * Linie, die die Hausecke um zwanzig Zentimeter verfehlt, ist für ihn eine
 * Wand. Ohne den Einzug blieb der Zombie im langen Gang des Labors an der
 * Wandkante hängen — sein Weg schickte ihn nie den einen Schritt nach Osten,
 * den sein Körper gebraucht hätte (`navlab/labSim.ts`).
 *
 * **Über eine Verbindung hinweg wird nicht gezogen.** Wer eine Treppe abkürzt,
 * kürzt durch die Decke ab. Jeder Schritt, der kein Schritt ist — eine andere
 * Etage, oder eine Wand zwischen zwei Nachbarn, an der eine Treppe hängt
 * (`walkStep`) —, teilt den Weg in Stücke; jedes Stück bekommt seine eigene
 * Schnur, und beide Enden der Verbindung bleiben feste Punkte.
 */
export function pullString(
  graph: NavGraph,
  tiles: readonly TileKey[],
  options: PathOptions,
): PathPoint[] {
  const out: PathPoint[] = [];
  if (tiles.length === 0) return out;
  const setup: PullSetup = {
    shrink: shrinkFor(options.radius ?? DEFAULT_RADIUS, options.clearance),
    power: powerFor(options),
    belief: options.belief ?? null,
    shunned: shunned(graph, options),
    scratch: newWallState(),
  };
  for (const run of channels(graph, tiles, setup)) pullRun(graph, run, setup, out);
  return out;
}

/**
 * Derselbe Weg, aber nur als Kacheln — für alles, was ihn nicht läuft, sondern
 * bloß wissen will, wo er langführt (Debug-Ansicht, `navAgent.observe`).
 *
 * Zwei Wegpunkte auf derselben Kachel sind dabei einer: An einer Ecke setzt
 * der Schnurzug zwei Punkte in dieselbe Kachel, und auf die Frage „über welche
 * Kacheln geht der Weg" ist das dieselbe Antwort.
 */
export function smoothPath(
  graph: NavGraph,
  tiles: readonly TileKey[],
  options: PathOptions,
): TileKey[] {
  const out: TileKey[] = [];
  for (const point of pullString(graph, tiles, options)) {
    if (out[out.length - 1] !== point.tile) out.push(point.tile);
  }
  return out;
}

/**
 * **Schritt eins: welche Kacheln bleiben übrig** — und zwar als lückenlose
 * Kette, ein Stück je Verbindung.
 *
 * Gestrichen wird eine Ecke, wenn man den nächsten Wegpunkt schon von ihrem
 * Vorgänger aus in gerader Linie erreicht. Was dabei herausfällt, kommt aber
 * nicht einfach weg: Der Trichter danach braucht **Nachbarn** und keine
 * Sprünge, also werden die Kacheln unter der geraden Linie wieder eingesetzt
 * (`extend`). Das Ergebnis ist derselbe Schlauch, nur eben der um die *kurze*
 * Linie herum statt der um das Treppenmuster der Suche — und darin kann die
 * Schnur wirklich diagonal laufen.
 */
function channels(graph: NavGraph, tiles: readonly TileKey[], setup: PullSetup): TileKey[][] {
  const runs: TileKey[][] = [];
  let run: TileKey[] = [tiles[0]!];
  let anchor = 0;
  for (let i = 1; i < tiles.length; i++) {
    const previous = tiles[i - 1]!;
    const here = tiles[i]!;
    if (!walkStep(graph, previous, here, setup)) {
      // Eine Verbindung: Hier endet das Stück, und drüben fängt das nächste an.
      extend(run, tiles[anchor]!, previous);
      runs.push(run);
      run = [here];
      anchor = i;
      continue;
    }
    if (!canWalkLine(graph, tiles[anchor]!, here, setup.power, setup.belief, setup.shunned)) {
      extend(run, tiles[anchor]!, previous);
      anchor = i - 1;
    }
  }
  extend(run, tiles[anchor]!, tiles[tiles.length - 1]!);
  runs.push(run);
  return runs;
}

/**
 * Hängt die Kacheln unter der Geraden von `from` nach `to` an — `from` steht
 * schon darin.
 *
 * Dieselbe Wanderung wie der Sichttest (`navSight.traceLine`), und das ist
 * kein Zufall: Es sind genau die Kacheln, die dort eben noch als frei
 * durchgegangen sind. Trifft die Linie eine Ecke genau, bietet die Wanderung
 * **beide** Wege um sie herum an; genommen wird der erste, denn der Trichter
 * braucht eine Kette und keine Gabel.
 */
function extend(run: TileKey[], from: TileKey, to: TileKey): void {
  let last = from;
  traceLine(from, to, (tile, _dir, next) => {
    if (tile !== last) return true;
    run.push(next);
    last = next;
    return true;
  });
}

/**
 * **Was die Suche gemieden hat** — eine Kachel, die diesem Profil einen
 * Aufschlag kostet.
 *
 * Für die Glättung ist sie so gut wie eine Wand, und zwar in beide
 * Richtungen: Sie wird weder überquert (sonst plant der Mensch sauber um die
 * Stachelgrube herum und läuft dann quer hindurch) noch **gestreift** — an
 * ihrer Kante hält die Schnur denselben Abstand wie an einer Mauer. Wer mit
 * einem Fuß in der Grube steht, steht in der Grube.
 */
function shunned(graph: NavGraph, options: PathOptions): (tile: TileKey) => boolean {
  return (tile: TileKey): boolean => {
    const facts = graph.tile(tile);
    return facts !== undefined && hazardCost(options.profile, facts.hazard) > 0;
  };
}

/**
 * Was man wissen muss, um eine **Ecke** zu beurteilen — mehr braucht
 * `cornerBlocked` nicht, und deshalb steht es getrennt vom Schnurzug: Die
 * Debug-Ansicht stellt dieselbe Frage und läuft keinen Weg.
 */
export interface CornerSetup {
  power: DoorPower;
  belief: NavBelief | null;
  shunned: (tile: TileKey) => boolean;
  /** Ein Zustandsobjekt zum Wiederverwenden — die Frage wird oft gestellt. */
  scratch: WallState;
}

/**
 * Die Ecke, wie sie **ist**: keine Meinung, keine Gefahr, und eine
 * geschlossene Tür zählt wie ein Türblatt, das dort hängt.
 *
 * Für alles, was keinen Läufer mitbringt — die Debug-Ansicht zeichnet die
 * betretbare Fläche für niemanden Bestimmten.
 */
const TRUTH_CORNER: CornerSetup = {
  power: doorPower(true),
  belief: null,
  shunned: () => false,
  scratch: newWallState(),
};

/** Was der Schnurzug über den wissen muss, der den Weg laufen soll. */
interface PullSetup extends CornerSetup {
  /** Wie weit ein Durchlass an einer besetzten Ecke eingezogen wird. */
  shrink: number;
}

/**
 * Ein Durchlass: die Kante zwischen zwei Kacheln, mit ihren beiden Enden
 * **links** und **rechts** der Laufrichtung.
 *
 * Links und rechts und nicht Nord und Süd, denn der Trichter stellt nur eine
 * Frage: Ist die Schnur inzwischen über die andere Seite hinausgekippt? Wer
 * die Enden nach Himmelsrichtung sortierte, müsste sie für vier Richtungen
 * einzeln beantworten.
 */
interface Gate {
  tile: TileKey;
  lx: number;
  lz: number;
  lTight: boolean;
  rx: number;
  rz: number;
  rTight: boolean;
}

/**
 * **Schritt zwei: der Trichter** — ein Stück Weg ohne Verbindung.
 *
 * Er trägt drei Punkte mit sich: den **Scheitel**, an dem die Schnur zuletzt
 * hing, und die beiden Kanten, zwischen denen sie noch Spiel hat. Jeder neue
 * Durchlass zieht die eine oder die andere Kante enger. Kippt eine über die
 * andere hinweg, führt keine gerade Linie mehr an beiden vorbei: Dort verhakt
 * sich die Schnur, dieser Punkt wird ein Wegpunkt, und von ihm aus geht es
 * weiter.
 */
function pullRun(
  graph: NavGraph,
  run: readonly TileKey[],
  setup: PullSetup,
  out: PathPoint[],
): void {
  const first = run[0]!;
  const last = run[run.length - 1]!;
  // Der Anfang eines Stücks steht immer da: Er ist entweder der Start oder das
  // Ende einer Verbindung, und beides ist ein fester Punkt.
  out.push({ tile: first, x: tileCentreX(first), z: tileCentreZ(first), tight: false });
  if (run.length === 1) return;

  const gates: Gate[] = [];
  for (let i = 1; i < run.length; i++) gates.push(gateBetween(graph, run[i - 1]!, run[i]!, setup));
  // Das Ziel als Durchlass ohne Breite: So endet die Schnur an ihm und nicht
  // an der letzten Kante davor.
  gates.push({
    tile: last,
    lx: tileCentreX(last),
    lz: tileCentreZ(last),
    lTight: false,
    rx: tileCentreX(last),
    rz: tileCentreZ(last),
    rTight: false,
  });

  let apexX = tileCentreX(first);
  let apexZ = tileCentreZ(first);
  let apexAt = -1;
  let leftX = apexX;
  let leftZ = apexZ;
  let leftTile = first;
  let leftTight = false;
  let leftAt = -1;
  let rightX = apexX;
  let rightZ = apexZ;
  let rightTile = first;
  let rightTight = false;
  let rightAt = -1;

  // Jeder Durchlass wird höchstens dreimal angefasst: einmal vorwärts und
  // zweimal, wenn die Schnur zu ihm zurückspringt. Die Zugabe ist die
  // Versicherung gegen eine Schleife ohne Ende — in einer Render-Schleife wäre
  // die das Ende der Sitzung.
  let guard = gates.length * 3 + 8;
  for (let i = 0; i < gates.length && guard > 0; i++, guard--) {
    const gate = gates[i]!;

    // Die rechte Kante: Zieht dieser Durchlass sie enger?
    if (turn(apexX, apexZ, rightX, rightZ, gate.rx, gate.rz) <= 0) {
      const loose = apexX === rightX && apexZ === rightZ;
      if (loose || turn(apexX, apexZ, leftX, leftZ, gate.rx, gate.rz) > 0) {
        rightX = gate.rx;
        rightZ = gate.rz;
        rightTile = gate.tile;
        rightTight = gate.rTight;
        rightAt = i;
      } else {
        // Rechts ist über links hinweggekippt: An der linken Kante verhakt
        // sich die Schnur, und von dort aus wird neu gezogen.
        out.push({ tile: leftTile, x: leftX, z: leftZ, tight: leftTight });
        apexX = leftX;
        apexZ = leftZ;
        apexAt = leftAt;
        rightX = apexX;
        rightZ = apexZ;
        rightTile = leftTile;
        rightTight = leftTight;
        rightAt = apexAt;
        i = apexAt;
        continue;
      }
    }

    // Und dieselbe Frage von der anderen Seite.
    if (turn(apexX, apexZ, leftX, leftZ, gate.lx, gate.lz) >= 0) {
      const loose = apexX === leftX && apexZ === leftZ;
      if (loose || turn(apexX, apexZ, rightX, rightZ, gate.lx, gate.lz) < 0) {
        leftX = gate.lx;
        leftZ = gate.lz;
        leftTile = gate.tile;
        leftTight = gate.lTight;
        leftAt = i;
      } else {
        out.push({ tile: rightTile, x: rightX, z: rightZ, tight: rightTight });
        apexX = rightX;
        apexZ = rightZ;
        apexAt = rightAt;
        leftX = apexX;
        leftZ = apexZ;
        leftTile = rightTile;
        leftTight = rightTight;
        leftAt = apexAt;
        i = apexAt;
        continue;
      }
    }
  }

  const end = out[out.length - 1]!;
  const goalX = tileCentreX(last);
  const goalZ = tileCentreZ(last);
  // Das Ende steht nur dann noch einmal da, wenn die Schnur nicht ohnehin
  // schon dort hängt.
  if (Math.abs(end.x - goalX) > 1e-6 || Math.abs(end.z - goalZ) > 1e-6) {
    out.push({ tile: last, x: goalX, z: goalZ, tight: false });
  }
}

/**
 * Auf welcher Seite der Strahl von `o` nach `b` gegenüber dem nach `a` liegt.
 *
 * Positiv heißt **rechts**, negativ links, null in einer Linie — bei X nach
 * Osten und Z nach Süden. Mehr braucht der Trichter nicht: Er vergleicht
 * Seiten und misst nie einen Winkel.
 */
function turn(ox: number, oz: number, ax: number, az: number, bx: number, bz: number): number {
  return (ax - ox) * (bz - oz) - (az - oz) * (bx - ox);
}

/** Der Durchlass zwischen zwei benachbarten Kacheln. */
function gateBetween(graph: NavGraph, a: TileKey, b: TileKey, setup: PullSetup): Gate {
  const dir = dirBetween(a, b);
  const left = leftOf(dir);
  const right = opposite(left);
  const one = gateEnd(graph, a, dir, left, setup);
  const other = gateEnd(graph, a, dir, right, setup);
  return {
    tile: b,
    lx: one.x,
    lz: one.z,
    lTight: one.tight,
    rx: other.x,
    rz: other.z,
    rTight: other.tight,
  };
}

/**
 * Ein Ende eines Durchlasses — die Ecke, und wie weit von ihr weg.
 *
 * Steht an der Ecke etwas, rückt der Punkt um den Halbmesser in den Durchlass
 * hinein und heißt fortan **eng**: Wer ihn abkürzt, läuft in die Ecke. Ist
 * dort nur Boden, bleibt er auf der Ecke und ist keine Vorschrift, sondern nur
 * eine Stelle, an der die Schnur zufällig hängt.
 */
function gateEnd(
  graph: NavGraph,
  a: TileKey,
  dir: Dir,
  side: Dir,
  setup: PullSetup,
): { x: number; z: number; tight: boolean } {
  const x = (keyX(a) + 0.5 + (dirX(dir) + dirX(side)) / 2) * TILE;
  const z = (keyZ(a) + 0.5 + (dirZ(dir) + dirZ(side)) / 2) * TILE;
  if (!cornerBlocked(graph, a, dir, side, setup)) return { x, z, tight: false };
  return { x: x - dirX(side) * setup.shrink, z: z - dirZ(side) * setup.shrink, tight: true };
}

/**
 * **Ob an dieser Ecke einer Kachel wirklich etwas steht.**
 *
 * Gemeint ist die Ecke, an der `tile`, sein Nachbar in Richtung `dir`, sein
 * Nachbar in Richtung `side` und die Kachel schräg gegenüber zusammenstoßen —
 * `dir` und `side` stehen dafür quer zueinander. Fehlt eine der drei anderen,
 * ist sie gesperrt, oder steht zwischen zweien der vier eine Wand, dann ist die
 * Ecke eine Ecke, und wer um sie herum will, hält seinen Halbmesser Abstand.
 * Sind alle vier offen, liegt dort nur Boden — und den darf die Schnur
 * ausnutzen, sonst schlingerte sie um jede Kachelecke eines leeren Saals.
 *
 * **Das Kopfende einer Wand ist genau so eine Ecke**, und es ist die, die man
 * übersieht: Neben der letzten Kachel der Wand liegt eine, die auf allen vier
 * Seiten frei ist — und trotzdem steht der Klotz mit seiner Stirnseite in ihrer
 * Ecke. Wer nur Seite für Seite fragt, hält an der Wand entlang sauber Abstand
 * und stößt an ihrem Ende dagegen.
 *
 * Steht hier und nicht in der Glättung, weil die **Debug-Ansicht** dieselbe
 * Frage stellt (`navScene.ts`, Ebene *Betretbar*): Zwei Antworten darauf wären
 * eine Ansicht, die etwas anderes zeigt, als gelaufen wird.
 */
export function cornerBlocked(
  graph: NavGraph,
  tile: TileKey,
  dir: Dir,
  side: Dir,
  setup: CornerSetup = TRUTH_CORNER,
): boolean {
  const across = neighbour(tile, dir);
  if (across === NO_TILE || !believedWalkable(setup.belief, graph, across)) return true;
  const besideA = neighbour(tile, side);
  const besideB = neighbour(across, side);
  if (besideA === NO_TILE || besideB === NO_TILE) return true;
  if (!believedWalkable(setup.belief, graph, besideA)) return true;
  if (!believedWalkable(setup.belief, graph, besideB)) return true;
  if (setup.shunned(besideA) || setup.shunned(besideB)) return true;
  if (!openWall(graph, tile, side, setup)) return true;
  if (!openWall(graph, across, side, setup)) return true;
  return !openWall(graph, besideA, dir, setup);
}

/**
 * Ob zwischen dieser Kachel und ihrem Nachbarn nichts steht.
 *
 * Eine Tür, die erst aufgemacht werden muss, zählt an einer Ecke wie eine
 * Wand: Ihr Blatt hängt dort, ob sie nun aufgeht oder nicht.
 */
function openWall(graph: NavGraph, tile: TileKey, dir: Dir, setup: CornerSetup): boolean {
  const state = believedWallState(setup.belief, graph.wall(tile, dir), setup.power, setup.scratch);
  return state.walk && state.cost === 0;
}

/** In welche Richtung es von `a` nach `b` geht — die beiden sind Nachbarn. */
function dirBetween(a: TileKey, b: TileKey): Dir {
  for (const dir of DIRS) {
    if (neighbour(a, dir) === b) return dir;
  }
  return DIR_N;
}

/** Was von dieser Richtung aus links liegt. Norden ist −Z (`navTile.ts`). */
function leftOf(dir: Dir): Dir {
  return ((dir + 3) % 4) as Dir;
}

/**
 * Ob von hier nach dort ein **Schritt** geht — Nachbarn auf derselben Etage,
 * und nichts dazwischen.
 *
 * Zwei Kacheln können Nachbarn sein und trotzdem eine Wand zwischen sich
 * haben; dann führt der Weg über eine **Verbindung**, die das Abtasten daneben
 * gelegt hat — die Treppe neben der Stufe, die zu hoch zum Hinauftreten ist
 * (`navBake.ts`). Über die wird nicht geglättet: Sonst zieht die Schnur eine
 * gerade Linie über die Stufe hinweg, der Läufer sieht keine Verbindung mehr
 * und läuft für immer gegen sie an, statt hinaufzuspringen.
 */
function walkStep(graph: NavGraph, a: TileKey, b: TileKey, setup: PullSetup): boolean {
  if (!isNeighbour(a, b)) return false;
  return openWall(graph, a, dirBetween(a, b), setup);
}

function isNeighbour(a: TileKey, b: TileKey): boolean {
  if (keyLevel(a) !== keyLevel(b)) return false;
  return Math.abs(keyX(a) - keyX(b)) + Math.abs(keyZ(a) - keyZ(b)) === 1;
}

// --- Für die Horde --------------------------------------------------------

/**
 * Ein Strömungsfeld: von jeder erreichbaren Kachel aus die nächste Kachel
 * Richtung Ziel, und was von dort noch zu laufen ist.
 */
export interface FlowField {
  /** Wohin es von hier aus weitergeht. */
  readonly next: Map<TileKey, TileKey>;
  /** Restweg in Metern. */
  readonly cost: Map<TileKey, number>;
  /** Wie viele Kacheln angefasst wurden. */
  readonly visited: number;
}

/**
 * Baut das Feld — **einmal für alle**, die dasselbe Ziel haben.
 *
 * Ein Dijkstra rückwärts von den Zielen aus. Danach kostet die Frage „wohin
 * als nächstes" ein `Map.get`, und ob dreißig oder dreihundert danach fragen,
 * ist gleich teuer. Das ist die Antwort auf fünfzig NPCs, und es ist auch die
 * Antwort auf die entfernten unter ihnen: Wer weit weg ist, braucht keinen
 * eigenen Weg, sondern nur eine Richtung.
 *
 * **Rückwärts** heißt: Es wird geprüft, was es kostet, *hierher* zu kommen.
 * Bei den Wänden macht das keinen Unterschied (eine Tür ist von beiden Seiten
 * dieselbe), bei den Verbindungen schon — eine Kante ist hinunter ein
 * Absprung und hinauf womöglich eine Wand. Gefragt wird deshalb immer nach der
 * Richtung, in der später **gelaufen** wird; wer hier die Richtung des
 * Eintrags nähme, ließe seine Horde Klippen hochlaufen.
 */
export function flowField(
  graph: NavGraph,
  goals: readonly TileKey[],
  options: PathOptions,
): FlowField {
  const { profile } = options;
  const belief = options.belief ?? null;
  const power = powerFor(options);
  const maxNodes = options.maxNodes ?? DEFAULT_MAX_NODES;

  const next = new Map<TileKey, TileKey>();
  const cost = new Map<TileKey, number>();
  const open = new NodeHeap();
  const closed = new Set<TileKey>();
  const scratch = newWallState();
  let visited = 0;

  for (const goal of goals) {
    if (goal === NO_TILE || !believedWalkable(belief, graph, goal)) continue;
    cost.set(goal, 0);
    open.push(goal, 0);
  }

  // Wer von wo aus hierherkommt: die Verbindungen einmal umgedreht.
  const incoming = new Map<TileKey, { from: TileKey; link: NavLink }[]>();
  for (const link of graph.links()) {
    push(incoming, link.to, { from: link.from, link });
    if (link.both) push(incoming, link.from, { from: link.to, link });
  }

  while (open.size > 0 && visited < maxNodes) {
    const current = open.pop();
    if (closed.has(current)) continue;
    closed.add(current);
    visited++;
    const here = cost.get(current) ?? 0;
    const step = enterCost(graph, current, profile);
    if (!Number.isFinite(step)) continue;

    for (const dir of DIRS) {
      const from = neighbour(current, dir);
      if (from === NO_TILE || closed.has(from)) continue;
      if (!believedWalkable(belief, graph, from)) continue;
      const wall = believedWallState(belief, graph.wall(current, dir), power, scratch);
      if (!wall.walk) continue;
      offer(from, current, here + step + wall.cost);
    }

    for (const entry of incoming.get(current) ?? []) {
      const link = entry.link;
      if (closed.has(entry.from)) continue;
      // Gefragt wird nach der Richtung, in der gelaufen wird — also **hierher**
      // und nicht von hier weg. Rückwärts gerechnet wird das Feld, gelaufen
      // wird es vorwärts.
      const factor = linkFactor(profile, link, current);
      if (!Number.isFinite(factor)) continue;
      if (!believedLinkOpen(belief, link)) continue;
      if (!believedWalkable(belief, graph, entry.from)) continue;
      offer(entry.from, current, here + link.cost * factor + step);
    }
  }

  return { next, cost, visited };

  function offer(tile: TileKey, towards: TileKey, total: number): void {
    const known = cost.get(tile);
    if (known !== undefined && known <= total) return;
    cost.set(tile, total);
    next.set(tile, towards);
    open.push(tile, total);
  }
}

function push<T>(map: Map<TileKey, T[]>, key: TileKey, value: T): void {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

/**
 * Der Weg, den ein Strömungsfeld von hier aus vorgibt.
 *
 * Nicht für die Fortbewegung gedacht — die fragt Kachel für Kachel — sondern
 * für die Debug-Ansicht, die den Weg zeichnen will, und für die Prüfung, dass
 * das Feld dorthin führt, wohin es soll.
 */
export function flowPath(field: FlowField, from: TileKey, limit = 512): TileKey[] {
  const tiles: TileKey[] = [];
  let node = from;
  for (let i = 0; i < limit; i++) {
    tiles.push(node);
    const step = field.next.get(node);
    if (step === undefined) break;
    node = step;
  }
  return tiles;
}

// --- Der Haufen -----------------------------------------------------------

/**
 * Ein binärer Haufen aus zwei parallelen Zahlenfeldern.
 *
 * Zwei Felder statt einem Feld aus Objekten, und das ist bei einer Wegsuche
 * kein Geiz: Jedes `{key, f}` wäre ein Objekt, das der Sammler hinterher
 * wegräumen muss, und fünfzig NPCs machen daraus Zehntausende je Sekunde. In
 * einer Brille sieht man das.
 */
class NodeHeap {
  private readonly keys: number[] = [];
  private readonly scores: number[] = [];

  get size(): number {
    return this.keys.length;
  }

  push(key: number, score: number): void {
    this.keys.push(key);
    this.scores.push(score);
    let child = this.keys.length - 1;
    while (child > 0) {
      const parent = (child - 1) >> 1;
      if (this.scores[parent]! <= this.scores[child]!) break;
      this.swap(parent, child);
      child = parent;
    }
  }

  pop(): number {
    const top = this.keys[0]!;
    const key = this.keys.pop()!;
    const score = this.scores.pop()!;
    if (this.keys.length > 0) {
      this.keys[0] = key;
      this.scores[0] = score;
      let parent = 0;
      for (;;) {
        const left = parent * 2 + 1;
        const right = left + 1;
        let smallest = parent;
        if (left < this.keys.length && this.scores[left]! < this.scores[smallest]!) smallest = left;
        if (right < this.keys.length && this.scores[right]! < this.scores[smallest]!)
          smallest = right;
        if (smallest === parent) break;
        this.swap(parent, smallest);
        parent = smallest;
      }
    }
    return top;
  }

  private swap(a: number, b: number): void {
    const key = this.keys[a]!;
    this.keys[a] = this.keys[b]!;
    this.keys[b] = key;
    const score = this.scores[a]!;
    this.scores[a] = this.scores[b]!;
    this.scores[b] = score;
  }
}
