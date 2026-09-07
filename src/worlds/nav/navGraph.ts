import {
  DIRS,
  NO_TILE,
  NO_WALL,
  TILE,
  keyLevel,
  neighbour,
  tileCentreX,
  tileCentreZ,
  tileIndexAt,
  tileKey,
  wallKey,
  type Dir,
  type TileKey,
  type WallKey,
} from './navTile';
import type { LinkKind } from './navProfile';
import { afterHit, breakable, doorSpec, fullHealth, type DoorMaterial } from './navDoor';

/**
 * **Der Weltgraph** — was es an Boden gibt, was dazwischen steht und was von
 * wo nach wo führt.
 *
 * Er ist die **Wahrheit** über die Karte, und zwar die aktuelle: eine Tür, die
 * jemand zuwirft, ist hier sofort zu. Dass ein NPC das noch nicht weiß, ist
 * nicht Sache dieses Graphen, sondern seiner Meinung darüber
 * (`navBelief.ts`) — die beiden auseinanderzuhalten ist der Grund, warum es
 * zwei Dateien sind.
 *
 * Drei Dinge stehen darin, und mehr braucht die Navigation nicht:
 *
 * - **Kacheln.** Was es gibt, gibt es; was fehlt, ist kein Boden. Es wird
 *   nichts als „unbegehbar" markiert — eine unbegehbare Kachel ist einfach
 *   keine. Das spart die halbe Karte an Speicher und macht `has()` zur
 *   einzigen Frage, die die Wegsuche stellen muss.
 * - **Wände** zwischen zwei Kacheln, mit einer Art (massiv, Tür, Fenster).
 *   Eine Wand ist dabei ausdrücklich **nicht** nur ein Hindernis: sie sagt
 *   auch, ob man hindurchsehen und wie viel man hindurchhören kann. Dieselbe
 *   Wand bedient damit Bewegung, Sicht und Gehör — ohne sie bräuchte es für
 *   jede der drei Fragen ein eigenes Modell, und alle drei würden auseinander
 *   driften, sobald jemand eine Wand versetzt.
 * - **Verbindungen** für alles, was nicht Nachbarschaft ist: Treppen, Leitern,
 *   Absprünge und Portale. Ein Portal ist dabei nichts Besonderes, sondern
 *   eine Verbindung mit Kosten nahe null, die zur Laufzeit dazukommt und
 *   wieder verschwindet.
 *
 * **Nichts davon wird neu berechnet, wenn sich etwas ändert.** Eine Kiste, die
 * jemand abstellt, setzt eine Kachel auf `blocked`; eine Tür kippt ein Flag;
 * ein Portal fügt zwei Kanten ein. Der Rest des Graphen bleibt, wie er ist,
 * und `version` sagt allen, die einen Weg gespeichert haben, dass sich etwas
 * getan hat.
 */

/** Was auf einer Kachel los ist. */
export interface TileFacts {
  /**
   * Faktor auf die Grundkosten, `1` ist normal.
   *
   * Für alles, was einen Weg nicht verbietet, sondern nur zäh macht: hohes
   * Gras, Geröll, eine Treppe, die man auch langsam hochgeht. Gefahren stehen
   * nicht hier, sondern in `hazard` — die kosten je nach Sorte etwas anderes.
   */
  cost: number;
  /** Bitmaske aus `navProfile.ts`. */
  hazard: number;
  /**
   * Feinhöhe über dem Boden dieser Etage, in Metern.
   *
   * Für Stufen, Rampen und Podeste, die keine eigene Etage verdienen. Die
   * Wegsuche schaut sie nicht an — sie ist nur da, damit die Fortbewegung den
   * NPC auf die richtige Höhe setzt und die Debug-Ansicht den Weg dort
   * zeichnet, wo er wirklich verläuft.
   */
  rise: number;
}

export const DEFAULT_TILE: Readonly<TileFacts> = { cost: 1, hazard: 0, rise: 0 };

/**
 * Was zwischen zwei Kacheln steht.
 *
 * `open` gibt es nicht als Eintrag: **keine Wand ist der Normalfall**, und
 * gespeichert wird nur, was wirklich dasteht.
 */
export type WallKind = 'solid' | 'door' | 'window';

export interface WallFacts {
  kind: WallKind;
  /** Bei einer Tür: steht sie offen? Bei allem anderen bedeutungslos. */
  open: boolean;
  /**
   * Verriegelt oder verbarrikadiert — dann geht sie auch nicht auf.
   *
   * Der Unterschied zu `open: false` ist der ganze Sinn des Feldes: eine
   * geschlossene Tür ist für den, der Türen öffnen kann, ein Umweg von ein
   * paar Metern; eine verbarrikadierte ist eine Wand. Das ist die Kiste, die
   * ein Spieler vor die Tür schiebt.
   */
  barred: boolean;
  /**
   * Wie viel Schall sie schluckt, 0..1 — `1` heißt „nichts kommt durch".
   *
   * Steht auch bei massiven Wänden, denn durch eine dünne Bretterwand hört man
   * Schritte und durch eine Betonwand nicht.
   */
  muffle: number;
  /**
   * Der Name, unter dem eine Meinung sie kennt — „Tür 7".
   *
   * Nur Türen brauchen ihn, denn nur sie ändern ihren Zustand. Eine Wand ohne
   * Namen kann niemand falsch in Erinnerung haben.
   */
  id: string;
  /**
   * Woraus das Blatt ist — nur bei Türen, sonst bedeutungslos (`navDoor.ts`).
   *
   * Die zweite Zahl nach `canOpen`, die aus derselben Karte zwei macht: Eine
   * Holztür ist für einen Zombie ein Umweg von zehn Metern und drei Sekunden
   * Prügel, eine Metalltür eine Wand.
   */
  material: DoorMaterial;
  /**
   * Was das Blatt noch aushält. `Infinity` heißt: es geht nicht kaputt.
   *
   * Bei allem außer Türen steht hier `Infinity` und bleibt es. Fällt der Wert
   * auf null, ist die Tür **hin** — und eine hinüber gegangene Tür ist kein
   * Sonderfall mehr, sondern ein Loch in der Wand: Man geht hindurch, man
   * sieht hindurch, und niemand macht sie wieder zu.
   */
  health: number;
}

/** Ob diese Wand eine Tür ist, die schon eingeschlagen wurde. */
export function doorBroken(facts: WallFacts | undefined): boolean {
  return facts !== undefined && facts.kind === 'door' && facts.health <= 0;
}

/**
 * **Was einer an einer Tür kann** — aufmachen, einschlagen, beides oder
 * nichts.
 *
 * Zwei Wahrheitswerte und nicht einer, seit es Material gibt: Der Mensch macht
 * auf und tritt nicht ein, der Zombie tritt ein und macht nicht auf. Wer nur
 * `canOpen` übergibt, bekommt den alten Fall — jemanden, der keine Tür
 * einschlägt.
 */
export interface DoorPower {
  opens: boolean;
  breaks: boolean;
}

export function doorPower(power: boolean | DoorPower): DoorPower {
  return typeof power === 'boolean' ? { opens: power, breaks: false } : power;
}

/** Was eine Wand für die drei Fragen bedeutet, die an sie gestellt werden. */
export interface WallState {
  /** Kommt man hindurch? */
  walk: boolean;
  /** Was es kostet, hindurchzukommen, in Metern — eine Tür aufzumachen dauert. */
  cost: number;
  /** Sieht man hindurch? */
  see: boolean;
  /** Was vom Schall übrig bleibt, 0..1. */
  hear: number;
}

/** Kein Eintrag heißt: keine Wand, und alles geht hindurch. */
export const NO_WALL_STATE: Readonly<WallState> = { walk: true, cost: 0, see: true, hear: 1 };

/** Was das Öffnen einer geschlossenen, unverriegelten Tür kostet, in Metern. */
export const DOOR_COST = 3;

/** Ein frisches Zustandsobjekt — die Wand, die es nicht gibt. */
export function newWallState(): WallState {
  return { walk: true, cost: 0, see: true, hear: 1 };
}

/**
 * Was eine Wand demjenigen bedeutet, der davorsteht.
 *
 * `power` ist der einzige Unterschied zwischen einem Menschen und einem
 * Zombie an einer geschlossenen Tür — und weil es ihn gibt, ist ein Haus für
 * den einen ein Haus und für den anderen ein Labyrinth. Zwei Fragen stecken
 * darin: Macht er sie **auf**, und schlägt er sie **ein**? Wer nur einen
 * Wahrheitswert übergibt, meint die erste.
 *
 * Die Reihenfolge ist dabei Absicht: Wer aufmachen kann, macht auf — drei
 * Meter Umweg sind billiger als eine eingetretene Tür, und niemand tritt eine
 * Tür ein, deren Klinke er in der Hand hält. Erst wer nicht aufbekommt (oder
 * vor einer **verriegelten** steht), schlägt zu; und ob das etwas nützt,
 * entscheidet das Material (`navDoor.ts`).
 *
 * Das Ergebnis wird in `out` **geschrieben** und nicht neu angelegt: die
 * Wegsuche fragt das je Kachel viermal, und ein Objekt je Frage sind bei
 * fünfzig NPCs ein paar tausend Stueck je Sekunde, die der Sammler in der
 * Brille als Ruckler zurückgibt. Wer ein eigenes will, lässt `out` weg.
 */
export function wallState(
  facts: WallFacts | undefined,
  power: boolean | DoorPower,
  out: WallState = newWallState(),
): WallState {
  out.walk = true;
  out.cost = 0;
  out.see = true;
  out.hear = 1;
  if (!facts) return out;

  out.hear = 1 - facts.muffle;
  if (facts.kind === 'solid') {
    out.walk = false;
    out.see = false;
    return out;
  }
  if (facts.kind === 'window') {
    // Ein Fenster hält auf, aber es verrät: man sieht hindurch, und man hört
    // mehr als durch die Wand daneben. Genau deshalb ist es kein `solid` mit
    // anderer Textur.
    out.walk = false;
    return out;
  }
  // Eine eingeschlagene Tür ist keine Tür mehr, sondern das Loch, in dem sie
  // hing: offen für jeden, für immer, und niemand muss davon erst gehört
  // haben.
  if (doorBroken(facts)) {
    out.hear = 1;
    return out;
  }
  if (facts.open) {
    out.hear = 1;
    return out;
  }
  out.see = false;
  return closedDoor(facts, doorPower(power), out);
}

/**
 * Die geschlossene Tür, für den, der davorsteht — die drei Ausgänge dieser
 * Frage stehen hier zusammen, weil auch die Meinung sie braucht
 * (`navBelief.ts`) und zwei Kopien davon irgendwann auseinanderlaufen.
 */
export function closedDoor(
  facts: Pick<WallFacts, 'barred' | 'material'>,
  power: DoorPower,
  out: WallState,
): WallState {
  if (power.opens && !facts.barred) {
    out.walk = true;
    out.cost = DOOR_COST;
    return out;
  }
  if (power.breaks && breakable(facts.material)) {
    out.walk = true;
    out.cost = doorSpec(facts.material).breakCost;
    return out;
  }
  out.walk = false;
  out.cost = 0;
  return out;
}

/** Eine gebaute Verbindung zwischen zwei Kacheln, die nicht nebeneinander liegen. */
export interface NavLink {
  id: string;
  from: TileKey;
  to: TileKey;
  kind: LinkKind;
  /** Was der Weg darüber kostet, in Metern, bevor das Profil daran multipliziert. */
  cost: number;
  /**
   * Auch rückwärts?
   *
   * **Fast immer ja**, seit die Verbindung ihre Form mitbringt: Ob man eine
   * Kante auch wieder hochkommt, entscheidet nicht mehr die Kante, sondern der,
   * der davorsteht (`navProfile.canTraverse`). `false` bleibt für das, was
   * wirklich nur in eine Richtung geht — die eine Hälfte eines Portals.
   */
  both: boolean;
  /** Ob sie gerade benutzbar ist. */
  open: boolean;

  /**
   * **Wie es hier aussieht** — die drei Zahlen, aus denen jedes Profil seine
   * eigene Antwort zieht (`navProfile.EdgeShape`).
   *
   * Sie sind optional, und das ist kein Nachlassen: Ein Portal hat keine
   * Steigung, und eine von Hand eingehängte Leiter auch nicht. Was fehlt, gilt
   * als eben — und eine ebene Verbindung darf jeder benutzen, der ihre Art
   * benutzen darf.
   */
  /** Höhenunterschied von `from` nach `to`, in Metern (positiv = hinauf). */
  rise?: number;
  /** Die größte einzelne Stufe dazwischen, in Metern. */
  step?: number;
  /** Die waagerechte Weite, in Metern — nur beim Sprung über eine Lücke. */
  gap?: number;
}

/** Die Schalter des Gitters (`NavGraph.features`). */
export type NavFeature = 'obstacles' | 'links';

export type NavFeatures = Record<NavFeature, boolean>;

/** Eine Verbindung, wie sie von einer bestimmten Kachel aus aussieht. */
export interface LinkExit {
  link: NavLink;
  to: TileKey;
}

export class NavGraph {
  /**
   * Die Welt-Y der Etagenböden, von unten nach oben.
   *
   * Eine Liste und keine Etagenhöhe mal Index: der Tunnel unter Dust liegt
   * nicht auf einem Vielfachen von 3,1 m, und ein Dach ist selten dort, wo die
   * Rechnung es hinlegen würde.
   */
  readonly levels: number[];

  /**
   * Zählt jede Änderung mit.
   *
   * Wer einen Weg gespeichert hat, merkt sich diese Zahl dazu und plant neu,
   * wenn sie sich geändert hat. Das ist absichtlich grob — ein Zähler je
   * Kachel wäre genauer und bei fünfzig NPCs trotzdem nur mehr Buchhaltung.
   *
   * **Für NPCs ist das nicht das Signal zum Umplanen.** Sie erfahren von einer
   * Änderung erst, wenn sie sie *sehen* (`navBelief.ts`); dieser Zähler ist
   * für die Debug-Ansicht und für alles, was von oben auf die Welt schaut.
   */
  version = 0;

  private readonly facts = new Map<TileKey, TileFacts>();
  private readonly wallFacts = new Map<WallKey, WallFacts>();
  private readonly doorWalls = new Map<string, WallKey>();
  private readonly linkById = new Map<string, NavLink>();
  private readonly exits = new Map<TileKey, LinkExit[]>();
  private readonly blocked = new Set<TileKey>();

  constructor(levels: readonly number[] = [0]) {
    this.levels = levels.length > 0 ? [...levels] : [0];
  }

  // --- Kacheln ------------------------------------------------------------

  /** Legt eine Kachel an oder ändert sie. */
  setTile(key: TileKey, facts: Partial<TileFacts> = {}): void {
    const current = this.facts.get(key);
    if (current) {
      Object.assign(current, facts);
    } else {
      this.facts.set(key, { ...DEFAULT_TILE, ...facts });
    }
    this.version++;
  }

  removeTile(key: TileKey): boolean {
    if (!this.facts.delete(key)) return false;
    this.blocked.delete(key);
    this.version++;
    return true;
  }

  tile(key: TileKey): TileFacts | undefined {
    return this.facts.get(key);
  }

  has(key: TileKey): boolean {
    return this.facts.has(key);
  }

  get size(): number {
    return this.facts.size;
  }

  tileKeys(): IterableIterator<TileKey> {
    return this.facts.keys();
  }

  // --- Wände --------------------------------------------------------------

  /**
   * Stellt eine Wand zwischen eine Kachel und ihre Nachbarin.
   *
   * Die Richtung wird dabei normiert (`wallKey`), eine Wand von Süden gesetzt
   * ist dieselbe wie von Norden gesetzt. Am Rand des Gitters passiert nichts.
   */
  setWall(key: TileKey, dir: Dir, facts: Partial<WallFacts> & { kind: WallKind }): void {
    const wall = wallKey(key, dir);
    if (wall === NO_WALL) return;
    const previous = this.wallFacts.get(wall);
    if (previous?.id) this.doorWalls.delete(previous.id);
    const material = facts.material ?? 'wood';
    const next: WallFacts = {
      kind: facts.kind,
      open: facts.open ?? false,
      barred: facts.barred ?? false,
      muffle: facts.muffle ?? (facts.kind === 'window' ? 0.5 : 0.85),
      id: facts.id ?? '',
      material,
      // Nur eine Tür hat Leben. Bei allem anderen steht hier `Infinity`, und
      // damit ist `health <= 0` für eine Wand nie wahr — es braucht keine
      // zweite Abfrage, ob das Ding überhaupt kaputtgehen darf.
      health: facts.health ?? (facts.kind === 'door' ? fullHealth(material) : Infinity),
    };
    this.wallFacts.set(wall, next);
    if (next.id) this.doorWalls.set(next.id, wall);
    this.version++;
  }

  clearWall(key: TileKey, dir: Dir): boolean {
    const wall = wallKey(key, dir);
    if (wall === NO_WALL) return false;
    const previous = this.wallFacts.get(wall);
    if (!previous) return false;
    if (previous.id) this.doorWalls.delete(previous.id);
    this.wallFacts.delete(wall);
    this.version++;
    return true;
  }

  wall(key: TileKey, dir: Dir): WallFacts | undefined {
    const wall = wallKey(key, dir);
    return wall === NO_WALL ? undefined : this.wallFacts.get(wall);
  }

  wallAtKey(wall: WallKey): WallFacts | undefined {
    return this.wallFacts.get(wall);
  }

  wallEntries(): IterableIterator<[WallKey, WallFacts]> {
    return this.wallFacts.entries();
  }

  /** Die Tür mit diesem Namen — `undefined`, wenn es sie nicht (mehr) gibt. */
  door(id: string): WallFacts | undefined {
    const wall = this.doorWalls.get(id);
    return wall === undefined ? undefined : this.wallFacts.get(wall);
  }

  doorWall(id: string): WallKey {
    return this.doorWalls.get(id) ?? NO_WALL;
  }

  doorIds(): IterableIterator<string> {
    return this.doorWalls.keys();
  }

  /**
   * Macht eine benannte Tür auf oder zu. `false`, wenn es sie nicht gibt.
   *
   * **Eine eingeschlagene Tür bleibt eingeschlagen.** Wer sie danach „zumacht",
   * bekommt ein `false` und keine heile Tür — das Blatt liegt in Stücken auf
   * dem Boden, und ein Szenario, das es wieder zuzieht, hätte ein Loch, das
   * niemand sieht. Zurück gibt es nur über `mendDoor`, und das ist das
   * Aufräumen zwischen zwei Durchläufen und keine Handlung in der Welt.
   */
  setDoor(
    id: string,
    state: { open?: boolean; barred?: boolean; material?: DoorMaterial },
  ): boolean {
    const facts = this.door(id);
    if (!facts) return false;
    if (doorBroken(facts) && state.material === undefined) return false;
    if (state.material !== undefined && state.material !== facts.material) {
      facts.material = state.material;
      facts.health = fullHealth(state.material);
    }
    if (state.open !== undefined) facts.open = state.open;
    if (state.barred !== undefined) facts.barred = state.barred;
    this.version++;
    return true;
  }

  /**
   * **Ein Schlag auf eine Tür.** `true`, wenn sie **in diesem Schlag** gefallen
   * ist.
   *
   * Der Rückgabewert ist mit Absicht der Moment und nicht der Zustand: Daran
   * hängt ein Krachen, ein Splitter-Effekt und eine Meldung, und alle drei
   * sollen einmal kommen und nicht sechzigmal je Sekunde, solange jemand
   * dagegen haut.
   */
  hitDoor(id: string, damage: number): boolean {
    const facts = this.door(id);
    if (!facts || facts.kind !== 'door' || facts.health <= 0) return false;
    const left = afterHit(facts.health, damage);
    if (left === facts.health) return false;
    facts.health = left;
    this.version++;
    return left <= 0;
  }

  /**
   * **Einer haut `dt` Sekunden lang auf eine Tür.** `true`, wenn sie dabei
   * gefallen ist.
   *
   * Die Rechnung steht hier und nicht bei jedem, der zuschlägt: Sonst prügelt
   * der Zombie im Labor mit einer anderen Zahl auf dieselbe Tür ein als der im
   * Test, und das Grün darunter sagt nichts mehr.
   */
  poundDoor(id: string, dt: number): boolean {
    const facts = this.door(id);
    if (!facts) return false;
    return this.hitDoor(id, doorSpec(facts.material).damage * Math.max(0, dt));
  }

  /** Eine kaputte Tür wieder heil machen — fürs Aufräumen, nicht fürs Spiel. */
  mendDoor(id: string, open = true): boolean {
    const facts = this.door(id);
    if (!facts) return false;
    facts.health = fullHealth(facts.material);
    facts.open = open;
    facts.barred = false;
    this.version++;
    return true;
  }

  // --- Verbindungen -------------------------------------------------------

  /**
   * Hängt eine Verbindung ein. Ein zweiter Aufruf mit derselben Id ersetzt sie
   * — so wird aus einem umgesetzten Portal kein zweites.
   */
  addLink(link: NavLink): void {
    this.removeLink(link.id);
    this.linkById.set(link.id, link);
    this.pushExit(link.from, { link, to: link.to });
    if (link.both) this.pushExit(link.to, { link, to: link.from });
    this.version++;
  }

  private pushExit(from: TileKey, exit: LinkExit): void {
    const list = this.exits.get(from);
    if (list) list.push(exit);
    else this.exits.set(from, [exit]);
  }

  removeLink(id: string): boolean {
    const link = this.linkById.get(id);
    if (!link) return false;
    this.linkById.delete(id);
    for (const from of [link.from, link.to]) {
      const list = this.exits.get(from);
      if (!list) continue;
      const kept = list.filter((exit) => exit.link.id !== id);
      if (kept.length > 0) this.exits.set(from, kept);
      else this.exits.delete(from);
    }
    this.version++;
    return true;
  }

  link(id: string): NavLink | undefined {
    return this.linkById.get(id);
  }

  /** Alles, was von dieser Kachel aus wegführt, ohne Nachbarschaft zu sein. */
  linksFrom(key: TileKey): readonly LinkExit[] {
    if (!this.features.links) return EMPTY_EXITS;
    return this.exits.get(key) ?? EMPTY_EXITS;
  }

  links(): IterableIterator<NavLink> {
    return this.linkById.values();
  }

  setLinkOpen(id: string, open: boolean): boolean {
    const link = this.linkById.get(id);
    if (!link) return false;
    link.open = open;
    this.version++;
    return true;
  }

  // --- Was gerade im Weg steht --------------------------------------------

  /**
   * Sperrt eine Kachel oder gibt sie frei — die Kiste, die jemand abstellt.
   *
   * Ausdrücklich nur für die **Bewegung**: durch eine gesperrte Kachel sieht
   * und hört man weiterhin. Eine Kiste ist kein Sichtschutz, und wer das
   * anders will, stellt eine Wand hin.
   */
  setBlocked(key: TileKey, on: boolean): boolean {
    const changed = on ? !this.blocked.has(key) : this.blocked.has(key);
    if (!changed) return false;
    if (on) this.blocked.add(key);
    else this.blocked.delete(key);
    this.version++;
    return true;
  }

  isBlocked(key: TileKey): boolean {
    return this.features.obstacles && this.blocked.has(key);
  }

  blockedKeys(): IterableIterator<TileKey> {
    return this.blocked.values();
  }

  /** Begehbar heißt: es gibt sie, und es steht gerade nichts darauf. */
  walkable(key: TileKey): boolean {
    return this.facts.has(key) && !this.isBlocked(key);
  }

  // --- die Schalter -------------------------------------------------------

  /**
   * **Was am Gitter gerade mitzählt.**
   *
   * Zwei Schalter, und sie sind keine Einstellung, sondern ein Werkzeug: Im
   * Labor legt man sie um, um zu sehen, *woran* ein Verhalten hängt. Aus mit
   * den Hindernissen heißt, dass die Kiste im Durchgang plötzlich keine mehr
   * ist — der Zombie plant mitten hindurch und rennt dagegen, und genau das
   * ist die Antwort auf die Frage, wozu es sie gibt. Aus mit den Verbindungen
   * heißt: kein Portal, kein Sprung, keine Treppe, und der kurze Weg ist auf
   * einmal der lange.
   *
   * Sie schalten das **Zählen** und nicht den Bestand: Was gesperrt ist, bleibt
   * gesperrt eingetragen (`blockedKeys`), es gilt bloß nicht. Die
   * Debug-Ansicht zeichnet deshalb weiter, was da ist — sonst schaltete man
   * etwas aus und sähe nichts mehr, woran man merkt, dass es aus ist.
   */
  readonly features: NavFeatures = { obstacles: true, links: true };

  setFeature(id: NavFeature, on: boolean): boolean {
    if (this.features[id] === on) return false;
    this.features[id] = on;
    this.version++;
    return true;
  }

  // --- Meter --------------------------------------------------------------

  levelY(level: number): number {
    return this.levels[Math.min(Math.max(level, 0), this.levels.length - 1)] ?? 0;
  }

  /** Die Mitte einer Kachel in Weltkoordinaten, Feinhöhe eingerechnet. */
  worldOf(key: TileKey): { x: number; y: number; z: number } {
    const facts = this.facts.get(key);
    return {
      x: tileCentreX(key),
      y: this.levelY(keyLevel(key)) + (facts?.rise ?? 0),
      z: tileCentreZ(key),
    };
  }

  /**
   * Die Kachel zu einer Weltposition — `NO_TILE`, wenn dort keine liegt.
   *
   * Ohne `y` gewinnt die unterste Etage, die dort überhaupt Boden hat; mit `y`
   * die, deren Boden am nächsten darunter oder knapp darüber liegt. Das ist
   * die Frage „auf welcher Etage steht dieser Spieler", und sie ist der einzige
   * Grund, warum der Graph die Etagenhöhen überhaupt kennt.
   */
  at(x: number, z: number, y?: number): TileKey {
    const tx = tileIndexAt(x);
    const tz = tileIndexAt(z);
    let best = NO_TILE;
    let bestGap = Infinity;
    for (let level = 0; level < this.levels.length; level++) {
      const key = tileKey(tx, tz, level);
      const facts = this.facts.get(key);
      if (!facts) continue;
      if (y === undefined) return key;
      // Ein halber Meter Luft nach oben: wer auf einer Stufe steht, steht
      // trotzdem auf dieser Etage. Nach unten zählt der ganze Abstand.
      const floor = this.levelY(level) + facts.rise;
      const gap = y >= floor - 0.5 ? y - floor : (floor - y) * 4;
      if (gap < bestGap) {
        bestGap = gap;
        best = key;
      }
    }
    return best;
  }

  /**
   * Die nächste begehbare Kachel um einen Punkt herum, im Ring nach außen.
   *
   * Wer einen NPC irgendwohin schickt, hat selten genau eine Kachelmitte im
   * Sinn — und ein Ziel, das auf keiner Kachel liegt, macht aus jeder Wegsuche
   * ein „kein Weg". `radius` ist in Kacheln.
   */
  nearest(x: number, z: number, y?: number, radius = 3): TileKey {
    const direct = this.at(x, z, y);
    if (direct !== NO_TILE && this.walkable(direct)) return direct;
    const tx = tileIndexAt(x);
    const tz = tileIndexAt(z);
    for (let ring = 1; ring <= radius; ring++) {
      let best = NO_TILE;
      let bestGap = Infinity;
      for (let dx = -ring; dx <= ring; dx++) {
        for (let dz = -ring; dz <= ring; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== ring) continue;
          const key = this.at((tx + dx + 0.5) * TILE, (tz + dz + 0.5) * TILE, y);
          if (key === NO_TILE || !this.walkable(key)) continue;
          const gap = Math.hypot(dx, dz);
          if (gap < bestGap) {
            bestGap = gap;
            best = key;
          }
        }
      }
      if (best !== NO_TILE) return best;
    }
    return NO_TILE;
  }

  /**
   * Die Nachbarn einer Kachel auf derselben Etage, an denen keine Wand steht.
   *
   * Nur für den Editor und die Debug-Ansicht — die Wegsuche fragt selbst, denn
   * sie muss dabei Kosten und Türen mitrechnen und will kein Zwischenarray je
   * Kachel bauen.
   */
  openNeighbours(key: TileKey, power: boolean | DoorPower = true): TileKey[] {
    const found: TileKey[] = [];
    for (const dir of DIRS) {
      const next = neighbour(key, dir);
      if (next === NO_TILE || !this.walkable(next)) continue;
      if (!wallState(this.wall(key, dir), power).walk) continue;
      found.push(next);
    }
    return found;
  }
}

const EMPTY_EXITS: readonly LinkExit[] = [];
