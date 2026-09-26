import { GridPlan } from '../grid/gridPlan';
import { readWorld, writeWorld } from '../grid/worldFile';
// Damit die Arten bekannt sind: Tür, Tor, Knopf, Hebel, Platte, Lampe,
// Schild, Effektquelle. Die Umkleide (`wardrobe`) fehlt absichtlich — das
// Paket dazu läuft parallel, und dieser Test darf sie nicht verlangen.
import '../grid/fixtures/kinds';
import { flowField, findPath } from '../nav/navPath';
import { HUMAN_PROFILE } from '../nav/navProfile';
import { DIR_E, DIR_W, keyLevel, keyX, keyZ, tileKey } from '../nav/navTile';
import { KART_START, PIT_LANE } from '../kart/kartCourse';
import {
  CLIMB,
  EFFECTS,
  FIELD,
  INTERACT,
  KITCHEN,
  KITCHEN_SPAWN,
  NAVIGATION,
  PODIUM,
  RANGE,
  SPAWN,
  START,
  ZONE_LABELS,
  ZONE_TILES,
} from './layout';
import { DEFAULT_WORLD } from '../index';
import { fitTest, testPlan } from './testPlan';
import { DECK, STAIR_FOOT, STAIR_LANDING, STAIR_LENGTH, STAIR_X } from './zones/podium';
import { DOORS, YARD } from './zones/interact';
import { EMITTERS } from './zones/effects';
import { HUB_GATE, GATE_TILE } from './zones/start';
import { SPIKES } from './zones/navigation';
import { BERM } from './zones/range';
import { KITCHEN_SPOTS } from './zones/kitchen';
import { kitchenPiece } from '../../core/kitchenFit';

/** Einmal gebaut und von allen Behauptungen geteilt: er ändert sich nicht. */
const plan = testPlan();
const spawn = tileKey(SPAWN.x, SPAWN.z, 0);

/**
 * **Der Test, wegen dem der Grundriss ohne three.js auskommt.**
 *
 * Eine Zone hinter einer Wand merkt man sonst erst, wenn man davorsteht — nach
 * dem Laden, nach dem Aufsetzen, nach dem Hinlaufen. Gefragt wird über den
 * Graphen, also genau so, wie später ein NPC fragen würde.
 */
describe('Das Gelände der Testwelt', () => {
  it('lässt einen vom Startplatz in jede Zone laufen', () => {
    const field = flowField(plan.graph, [spawn], { profile: HUMAN_PROFILE });
    for (const [name, at] of Object.entries(ZONE_TILES)) {
      const tile = tileKey(at.x, at.z, at.level);
      expect(plan.graph.has(tile)).toBe(true);
      // Die Meldung soll die Zone nennen und nicht eine Kachelnummer.
      expect({ name, reachable: field.cost.has(tile) }).toEqual({ name, reachable: true });
      const path = findPath(plan.graph, spawn, tile, { profile: HUMAN_PROFILE });
      expect({ name, complete: path.complete }).toEqual({ name, complete: true });
    }
  });

  /**
   * **Und jede Zone hat einen Namen**, denn dieselbe Liste ist das Menü, mit
   * dem man zu ihr springt (`TestWorld.jumpMenu`). Wer eine Zone dazutut und
   * den Namen vergisst, bekäme dort einen Eintrag, der `kitchen` heißt.
   */
  it('nennt jede Zone beim Namen', () => {
    for (const name of Object.keys(ZONE_TILES)) {
      expect({ name, labelled: typeof ZONE_LABELS[name] === 'string' }).toEqual({
        name,
        labelled: true,
      });
    }
    const labels = Object.values(ZONE_LABELS);
    expect(new Set(labels).size).toBe(labels.length);
    // Und keinen Namen zu viel: Ein Ziel, das es nicht gibt, stünde im Menü.
    expect(Object.keys(ZONE_LABELS).sort()).toEqual(Object.keys(ZONE_TILES).sort());
  });

  /**
   * Nicht nur die Anker: Eine Kachel ohne Anschluss ist ein Stück Gang hinter
   * einer Wand, das beim Bauen Geometrie kostet und nichts tut.
   *
   * **Zwei Ausnahmen, und beide sind Absicht.** Der **Hof** der
   * Interaktionszone: Hinter seine Wand kommt man nur durch eine der drei
   * Türen, und die stehen beim Laden alle zu — sonst merkte niemand, dass es
   * Türen sind (die Behauptung darunter öffnet eine). Und das **Stachelfeld**:
   * Für einen Menschen sind Stacheln unpassierbar
   * (`HUMAN_PROFILE.hazard`), also plant er nicht hindurch, und die Kacheln
   * mitten darin erreicht er gar nicht. Genau das ist der Zweck des Feldes.
   */
  it('lässt jede Kachel vom Startplatz aus erreichen — außer Hof und Stacheln', () => {
    const field = flowField(plan.graph, [spawn], { profile: HUMAN_PROFILE });
    const stranded: string[] = [];
    for (const key of plan.graph.tileKeys()) {
      if (field.cost.has(key)) continue;
      if (inYard(keyX(key), keyZ(key), keyLevel(key))) continue;
      if ((plan.graph.tile(key)?.hazard ?? 0) !== 0) continue;
      stranded.push(`${keyX(key)},${keyZ(key)} (Ebene ${keyLevel(key)})`);
    }
    expect(stranded).toEqual([]);
  });

  it('öffnet den Hof, sobald eine der drei Türen aufgeht', () => {
    const open = testPlan();
    // Die Schiebetür auf — dieselbe Kante, die ihr Knopf schaltet.
    const door = DOORS[0]!;
    open.door(YARD.x + YARD.w - 1, door.z, 1, 0, true);
    const field = flowField(open.graph, [spawn], { profile: HUMAN_PROFILE });
    for (let z = YARD.z; z < YARD.z + YARD.d; z++) {
      for (let x = YARD.x; x < YARD.x + YARD.w; x++) {
        expect(field.cost.has(tileKey(x, z, 0))).toBe(true);
      }
    }
  });

  it('hält jede Zone in ihrem eigenen Rechteck', () => {
    const rects = { START, INTERACT, EFFECTS, PODIUM, NAVIGATION, RANGE, CLIMB, KITCHEN };
    const pairs = Object.entries(rects);
    for (let i = 0; i < pairs.length; i++) {
      for (let j = i + 1; j < pairs.length; j++) {
        const [nameA, a] = pairs[i]!;
        const [nameB, b] = pairs[j]!;
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.z < b.z + b.d && b.z < a.z + a.d;
        expect({ nameA, nameB, overlap }).toEqual({ nameA, nameB, overlap: false });
      }
    }
  });

  it('legt einen einzigen portalfähigen Boden über das ganze Gelände', () => {
    const ground = plan.solids().filter((one) => one.portal);
    expect(ground).toHaveLength(1);
    expect(ground[0]!.kind).toBe('floor');
    expect(ground[0]!.w).toBeCloseTo(FIELD.w);
    expect(ground[0]!.d).toBeCloseTo(FIELD.d);
  });

  it('bleibt mit jeder Kachel im Gelände', () => {
    for (const key of plan.graph.tileKeys()) {
      expect(keyX(key)).toBeGreaterThanOrEqual(FIELD.x);
      expect(keyX(key)).toBeLessThan(FIELD.x + FIELD.w);
      expect(keyZ(key)).toBeGreaterThanOrEqual(FIELD.z);
      expect(keyZ(key)).toBeLessThan(FIELD.z + FIELD.d);
    }
  });

  /**
   * **Kein Dach, nirgends** (Plan des Umbaus, Punkt 3): Von oben soll die
   * Kamera in jedes Zimmer hineinsehen. Ein Deckel über der Schießlinie oder
   * über den Boxen wäre ein schwarzer Balken über genau dem, was man sucht.
   *
   * Geprüft wird die Form und nicht der Name: eine **waagerechte Platte über
   * Kopfhöhe**, die breiter ist als ein Baustein. Die Kletterwand und der
   * Kugelfang sind stehende Massen und fallen deshalb nicht darunter.
   */
  /**
   * **`planLoaded` darf zweimal laufen** (`TestWorld`), und das tut es auch:
   * einmal auf dem ausgelieferten Grundriss und einmal auf einem
   * gespeicherten. Einbauten ersetzt `putFixture` nach Kennung; ein Baustein
   * hat keine, und deshalb steht kein einziger in `fitTest`. Diese Behauptung
   * ist der Grund, warum das so getrennt ist.
   */
  it('setzt die Einbauten ein zweites Mal auf, ohne etwas zu verdoppeln', () => {
    const twice = testPlan();
    fitTest(twice);
    expect(twice.fixtures()).toHaveLength(plan.fixtures().length);
    expect(twice.blocks()).toHaveLength(plan.blocks().length);
    expect(twice.masses()).toHaveLength(plan.masses().length);
  });

  it('baut kein Dach', () => {
    const roofs = plan
      .solids()
      .filter(
        (one) =>
          one.kind !== 'floor' &&
          one.y - one.h / 2 >= 2.2 &&
          one.h < 1 &&
          one.w > 1.5 &&
          one.d > 1.5,
      );
    expect(roofs).toEqual([]);
  });
});

describe('Start und Tor', () => {
  it('lässt den Startplatz frei — kein Tor auf der Kachel, auf der man ankommt', () => {
    expect(plan.graph.has(spawn)).toBe(true);
    expect(plan.fixturesOn(spawn)).toHaveLength(0);
  });

  /**
   * **Angekommen wird aber in der Küche** (`TestWorld.spawnPoint`,
   * `worlds/index.DEFAULT_WORLD`): Wer die Seite ohne Adresse öffnet, steht
   * dort, wo gearbeitet wird, und nicht dreißig Meter davor.
   *
   * Geprüft wird das Einzige, was daran schiefgehen kann: dass die Kachel
   * **begehbar** ist und dass sie dieselbe ist, auf die auch das Sprungmenü
   * und `?at=kitchen` setzen (`layout.ZONE_TILES`). Zwei Zahlen, die
   * auseinanderlaufen, wären eine Küche, die umgezogen ist, und ein Startplatz,
   * der stehen geblieben ist — im Zweifel in einer Wand.
   */
  it('setzt den Startplatz der Welt in die Küche', () => {
    // Die Welt, mit der die Seite ohne Adresse aufmacht — sonst führte diese
    // Kachel niemanden irgendwohin.
    expect(DEFAULT_WORLD).toBe('sandbox');
    const tile = tileKey(KITCHEN_SPAWN.x, KITCHEN_SPAWN.z, 0);
    expect(plan.graph.has(tile)).toBe(true);
    expect(plan.fixturesOn(tile)).toHaveLength(0);
    expect(ZONE_TILES['kitchen']).toEqual({ ...KITCHEN_SPAWN, level: 0 });
    // Und von dort kommt man auch wieder heraus — in jede Zone, die es gibt.
    const field = flowField(plan.graph, [tile], { profile: HUMAN_PROFILE });
    for (const [name, at] of Object.entries(ZONE_TILES)) {
      const goal = tileKey(at.x, at.z, at.level);
      expect({ name, reachable: field.cost.has(goal) }).toEqual({ name, reachable: true });
    }
  });

  it('stellt das Tor drei Kacheln vom Startplatz weg', () => {
    const gate = plan.fixture(HUB_GATE);
    expect(gate).not.toBeNull();
    expect(gate!.kind).toBe('gate');
    expect(gate!.props.world).toBe('hub');
    const steps = Math.abs(GATE_TILE.x - SPAWN.x) + Math.abs(GATE_TILE.z - SPAWN.z);
    expect(steps).toBe(3);
  });

  /**
   * **Der Kleiderschrank steht im Plan, auch wenn dieses Programm ihn noch
   * nicht kennt.**
   *
   * Die Art `wardrobe` gehört dem Paket _Umkleide_, das parallel läuft. Eine
   * unbekannte Art fällt beim Lesen **nicht** weg (anders als ein unbekannter
   * Baustein) — sie bleibt stehen und wird nur beim Bauen übersprungen und
   * gemeldet. Deshalb verlangt dieser Test die Art nicht, sondern nur, dass sie
   * im Grundriss steht: Ein Schrank, den ein älteres Programm still
   * verschluckte, wäre nach dem nächsten Speichern weg.
   */
  it('setzt den Kleiderschrank neben den Start, ohne seine Art zu verlangen', () => {
    const wardrobe = plan.fixtures().find((one) => one.kind === 'wardrobe');
    expect(wardrobe).toBeDefined();
    expect(Math.abs(wardrobe!.x - SPAWN.x)).toBeLessThanOrEqual(4);
    expect(Math.abs(wardrobe!.z - SPAWN.z)).toBeLessThanOrEqual(4);
  });

  it('hängt ein Schild mit einer Begrüßung daneben', () => {
    const sign = plan.fixture('schild-start');
    expect(sign?.kind).toBe('sign');
    expect(String(sign?.props.text ?? '')).toContain('Sandbox');
  });
});

describe('Treppe und Podest', () => {
  it('führt die Treppe vom Erdgeschoss auf das Podest', () => {
    // Vier Kacheln Treppe, und die letzte mündet auf der Landekachel darüber.
    for (let i = 0; i < STAIR_LENGTH; i++) {
      const tile = tileKey(STAIR_X, STAIR_FOOT - i, 0);
      expect(plan.graph.has(tile)).toBe(true);
      expect(plan.blocksOn(tile).some((one) => one.kind === 'stairs')).toBe(true);
    }
    const landing = tileKey(STAIR_X, STAIR_LANDING, 1);
    expect(plan.graph.has(landing)).toBe(true);

    const path = findPath(plan.graph, spawn, landing, { profile: HUMAN_PROFILE });
    expect(path.complete).toBe(true);
    // Und der Weg geht wirklich über die **oberste** Treppenkachel: Sie ist
    // die einzige, die mit der Landekachel darüber verbunden ist
    // (`GridPlan.stairs`, `connect`). Die unteren kann man auch von der Seite
    // betreten, und das darf man auch — eine Treppe ist kein Schacht.
    expect(path.tiles).toContain(tileKey(STAIR_X, STAIR_FOOT - (STAIR_LENGTH - 1), 0));
  });

  it('lässt die unterste Treppenkachel von beiden Seiten betreten', () => {
    // Gewünscht: _„an der untersten Treppe … auch von beiden Seiten"_ — über
    // die untere Hälfte, die nur eine Stufe über dem Gelände liegt.
    const foot = tileKey(STAIR_X, STAIR_FOOT, 0);
    for (const side of [DIR_W, DIR_E] as const) {
      expect(plan.flightSideOpen(foot, side, 0)).toBe(true);
      expect(plan.flightSideOpen(foot, side, 1)).toBe(false);
      expect(plan.flightSideOpen(tileKey(STAIR_X, STAIR_FOOT - 1, 0), side, 0)).toBe(false);
    }
  });

  it('schlägt das Loch über jeder Treppenkachel', () => {
    for (let i = 0; i < STAIR_LENGTH; i++) {
      expect(plan.graph.has(tileKey(STAIR_X, STAIR_FOOT - i, 1))).toBe(false);
    }
  });

  it('stellt eine Brüstung um das Podest, nur nicht an der Treppenmündung', () => {
    const rails = plan.blocks().filter((one) => one.kind === 'parapet' && keyLevel(one.tile) === 1);
    expect(rails.length).toBeGreaterThan(0);
    // Auf der Landekachel steht keine, die nach Süden schaut: dort kommt man
    // herauf.
    const landing = tileKey(STAIR_X, STAIR_LANDING, 1);
    expect(rails.some((one) => one.tile === landing && one.dir === 2)).toBe(false);
  });

  it('schaltet der Hebel oben die Lampe unten', () => {
    const lever = plan.fixture('hebel-podest');
    expect(lever?.level).toBe(1);
    expect(lever?.props.target).toBe('lampe-podest');
    expect(plan.fixture('lampe-podest')?.kind).toBe('lamp');
  });

  it('stellt das Podest auf Säulen und nicht auf eine Wand', () => {
    const pillars = plan
      .blocks()
      .filter((one) => one.kind === 'pillar' && keyLevel(one.tile) === 0);
    const corners = [DECK.x, DECK.x + DECK.w - 1].flatMap((x) =>
      [DECK.z, DECK.z + DECK.d - 1].map((z) => tileKey(x, z, 0)),
    );
    for (const corner of corners) {
      expect(pillars.some((one) => one.tile === corner)).toBe(true);
    }
  });
});

describe('Die Zonen dazwischen', () => {
  it('gibt jeder Tür ihre Betriebsart und jedem Auslöser ihr Ziel', () => {
    for (const spot of DOORS) {
      expect(plan.fixture(spot.door)?.props.mode).toBe(spot.mode);
      const trigger = plan.fixture(spot.trigger);
      expect(trigger?.kind).toBe(spot.kind);
      expect(trigger?.props.target).toBe(spot.door);
    }
  });

  it('gibt jeder Effektquelle einen Knopf, der auf sie zeigt', () => {
    for (const one of EMITTERS) {
      expect(plan.fixture(one.id)?.props.effect).toBe(one.effect);
      expect(plan.fixture(`${one.id}-knopf`)?.props.target).toBe(one.id);
    }
    expect(EMITTERS.map((one) => one.effect)).toEqual(['smoke', 'fire', 'sparks', 'water']);
  });

  it('malt das Stachelfeld in die Kacheln und nicht daneben', () => {
    for (let dz = 0; dz < SPIKES.d; dz++) {
      for (let dx = 0; dx < SPIKES.w; dx++) {
        const facts = plan.graph.tile(tileKey(SPIKES.x + dx, SPIKES.z + dz, 0));
        expect(facts?.hazard).toBeGreaterThan(0);
      }
    }
  });

  it('stellt den Kugelfang hinter die Scheiben', () => {
    const berm = plan.masses().find((one) => one.rect.x === BERM.x && one.rect.z === BERM.z);
    expect(berm).toBeDefined();
    expect(berm!.to).toBeGreaterThan(3);
    // Und er steht östlich der Schießlinie, also dort, wohin geschossen wird.
    expect(BERM.x).toBeGreaterThan(RANGE.x + RANGE.w);
  });

  it('legt die Boxengasse an die Zielgerade und macht sie begehbar', () => {
    expect(PIT_LANE.x + PIT_LANE.w).toBe(KART_START.x - 2);
    expect(plan.graph.has(tileKey(PIT_LANE.x, PIT_LANE.z, 0))).toBe(true);
  });

  /**
   * **Die Küche steht im Grundriss und nicht bloß im Bild.**
   *
   * Ihre Möbel sind ein Modell, das asynchron kommt und womöglich gar nicht
   * (`zones/kitchen.ts`). Der Weg eines NPC darf davon nicht abhängen: Was ein
   * Möbel belegt, ist teuer zu begehen, und zwar in jedem Fall. Ohne diese
   * Behauptung liefe ein NPC durch den Herd, sobald die Datei fehlt — und mit
   * Datei liefe er hinein.
   */
  it('verteuert jede Kachel, auf der ein Küchenmöbel steht', () => {
    let checked = 0;
    for (const spot of KITCHEN_SPOTS) {
      const piece = kitchenPiece(spot.name);
      expect({ name: spot.name, known: piece !== undefined }).toEqual({
        name: spot.name,
        known: true,
      });
      if (!piece || piece.hanging) continue;
      const [w, d] = piece.tiles;
      const turned = (spot.turn ?? 0) % 2 === 1;
      for (let dz = 0; dz < (turned ? w : d); dz++) {
        for (let dx = 0; dx < (turned ? d : w); dx++) {
          const x = KITCHEN.x + spot.x + dx;
          const z = KITCHEN.z + spot.z + dz;
          const facts = plan.graph.tile(tileKey(x, z, 0));
          expect({ x, z, cost: (facts?.cost ?? 0) > 1 }).toEqual({ x, z, cost: true });
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(20);
  });

  /** Jedes Möbel bleibt in seiner Zone — sonst steht ein Herd im Freien. */
  it('hält jedes Küchenmöbel innerhalb der Küche', () => {
    for (const spot of KITCHEN_SPOTS) {
      const piece = kitchenPiece(spot.name)!;
      const turned = (spot.turn ?? 0) % 2 === 1;
      const [w, d] = piece.tiles;
      const wide = turned ? d : w;
      const deep = turned ? w : d;
      expect({ name: spot.name, fits: spot.x >= 0 && spot.x + wide <= KITCHEN.w }).toEqual({
        name: spot.name,
        fits: true,
      });
      expect({ name: spot.name, fits: spot.z >= 0 && spot.z + deep <= KITCHEN.d }).toEqual({
        name: spot.name,
        fits: true,
      });
    }
  });

  /**
   * **Kein Möbel steht in einem anderen.** Ein Aufbau von dreißig Stücken wird
   * von Hand gesetzt, und zwei Zahlen, die um eins danebenliegen, sieht man
   * erst, wenn zwei Schränke ineinanderstecken.
   *
   * Die **gehobenen** Stücke sind ausgenommen, und genau dafür gibt es sie:
   * Das Ausgaberegal steht auf derselben Kachel wie die Ausgabetheke, nur eine
   * Ebene höher (`zones/kitchen.ts`, `Spot.lift`).
   */
  it('stellt kein Küchenmöbel in ein anderes', () => {
    const taken = new Map<string, string>();
    for (const spot of KITCHEN_SPOTS) {
      if (spot.lift) continue;
      const piece = kitchenPiece(spot.name)!;
      const turned = (spot.turn ?? 0) % 2 === 1;
      const [w, d] = piece.tiles;
      for (let dz = 0; dz < (turned ? w : d); dz++) {
        for (let dx = 0; dx < (turned ? d : w); dx++) {
          const key = `${spot.x + dx},${spot.z + dz}`;
          expect({ key, free: !taken.has(key), by: taken.get(key) ?? spot.name }).toEqual({
            key,
            free: true,
            by: spot.name,
          });
          taken.set(key, spot.name);
        }
      }
    }
  });

  /** Und der Aushang dort ist mehrzeilig — die Probe auf das Schild als Seite. */
  it('hängt in die Küche ein Schild mit mehr als einer Zeile', () => {
    const sign = plan.fixture('schild-kueche');
    expect(sign?.kind).toBe('sign');
    const text = String(sign?.props.text ?? '');
    expect(text.split('\n').length).toBeGreaterThan(5);
    expect(text).toContain('# Die Küche');
  });

  it('setzt drei Portaltafeln, eine davon auf dem Podest', () => {
    const panels = plan.blocks().filter((one) => one.kind === 'panel');
    // Zwei davon hängen in den Boxen (`kart/kartPit.ts`) — gezählt werden hier
    // die drei, die diese Welt selbst aufstellt.
    expect(panels.length).toBeGreaterThanOrEqual(3);
    expect(panels.some((one) => keyLevel(one.tile) === 1)).toBe(true);
  });
});

/**
 * **Die Datei rundet** — der Serialisierungstest aus dem Plan des Umbaus.
 *
 * `readWorld(writeWorld(plan))` muss denselben Grundriss ergeben: dieselben
 * Kacheln, dieselben Wände, dieselben Bausteine, dieselben Einbauten,
 * dieselben Massen. Einmal durch `JSON` geschickt, denn so kommt eine Welt auch
 * aus dem Speicher und aus einer Datei.
 */
describe('Die Testwelt als Datei', () => {
  const again = roundTrip(plan);

  it('bringt jede Kachel samt ihren Angaben zurück', () => {
    const before = [...plan.graph.tileKeys()].sort((a, b) => a - b);
    const after = [...again.graph.tileKeys()].sort((a, b) => a - b);
    expect(after).toEqual(before);
    for (const key of before) {
      expect({ key, facts: rounded(again.graph.tile(key)) }).toEqual({
        key,
        facts: rounded(plan.graph.tile(key)),
      });
    }
  });

  it('bringt jede Wand und jede Tür zurück', () => {
    const before = [...plan.graph.wallEntries()].sort(byWall);
    const after = [...again.graph.wallEntries()].sort(byWall);
    expect(after).toEqual(before);
  });

  it('bringt jeden Baustein samt Blickrichtung, Höhe und Fuß zurück', () => {
    expect(rounded(again.blocks())).toEqual(rounded(plan.blocks()));
  });

  it('bringt jeden Einbau samt Kennung und Eigenschaften zurück', () => {
    expect(again.fixtures()).toEqual(plan.fixtures());
  });

  it('bringt jede Masse zurück — sonst fehlten Boden, Wand und Kugelfang', () => {
    expect(rounded(again.masses())).toEqual(rounded(plan.masses()));
  });

  it('behält die Etagen', () => {
    expect(again.graph.levels).toEqual(plan.graph.levels);
  });
});

/** Eine Welt einmal durch `JSON` schicken — so kommt sie aus dem Speicher. */
function roundTrip(source: GridPlan): GridPlan {
  const text = JSON.stringify(writeWorld(source, { world: 'test', name: 'Testwelt' }));
  const read = readWorld(JSON.parse(text));
  return new GridPlan(read.graph.levels).restore(
    read.graph,
    read.blocks,
    read.masses,
    read.fixtures,
    read.slopes,
  );
}

/**
 * **Auf einen Zehntelmillimeter genau, und nicht genauer.**
 *
 * Die Datei rundet ihre Längen auf vier Nachkommastellen, mit Absicht
 * (`worldFile.ts`): `2.8 / 4 * 3` ist in Fließkomma `2.0999999999999996`, und
 * eine Datei, die man aufmacht und liest, soll nicht aussehen, als hätte jemand
 * gewürfelt. Der Vergleich muss deshalb genauso rechnen — sonst prüfte er nicht
 * die Serialisierung, sondern die Binärdarstellung von 2,8.
 */
function rounded<T>(value: T): T {
  if (typeof value === 'number') return (Math.round(value * 1e4) / 1e4) as T;
  if (Array.isArray(value)) return value.map(rounded) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, one] of Object.entries(value)) out[key] = rounded(one);
    return out as T;
  }
  return value;
}

/** Ob diese Kachel im verschlossenen Hof der Interaktionszone liegt. */
function inYard(x: number, z: number, level: number): boolean {
  return level === 0 && x >= YARD.x && x < YARD.x + YARD.w && z >= YARD.z && z < YARD.z + YARD.d;
}

/** Wände in eine verlässliche Reihenfolge bringen, damit sich zwei vergleichen lassen. */
function byWall(a: readonly [number, unknown], b: readonly [number, unknown]): number {
  return a[0] - b[0];
}
