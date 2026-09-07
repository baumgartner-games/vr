import { BAG_ITEMS, type PropKind } from '../portal/props';

/**
 * **Was außer Wänden noch im Grundriss steht** — die Gegenstände, die man in
 * die Miniatur setzt.
 *
 * Der Plan selbst (`levelPlan.ts`) ist der Navigationsgraph und kennt genau
 * drei Sachen: Boden, Wand, Tür. Das ist richtig so — er ist die Karte, auf
 * der später NPCs laufen, und eine Karte, in der auch noch jede Kiste steht,
 * ist keine Karte mehr, sondern eine Szene. Gegenstände sind aber genau das,
 * was einen leeren Grundriss zu einem Raum macht, in dem man etwas tun kann:
 * ein Tisch, ein Stapel Klötze, eine Rampe zum Ausprobieren.
 *
 * Deshalb eine **zweite Liste neben dem Plan** und kein Feld darin. Sie hat
 * ihren eigenen Speicherplatz, ihre eigene Fassung und ihr eigenes Format, und
 * der Plan bleibt, was er ist. Wer den Plan lädt und die Liste nicht hat,
 * bekommt ein leeres Zimmer statt eines Fehlers.
 *
 * **Alles steht auf dem Boden.** Das ist die einzige Regel, die diese Datei
 * über die Lage eines Dings kennt (`standingY`), und sie ist die Antwort auf
 * die Frage, wie man in einer Miniatur von Streichholzgröße die Höhe eines
 * Gegenstands einstellt: gar nicht. Man setzt ihn auf eine Kachel, und er
 * steht darauf. Wer ihn woanders haben will, geht in sein Level und schiebt
 * ihn dort hin — dort ist er ein Ding wie jedes andere.
 *
 * Ohne three.js: Was hier steht, ist eine Liste von Zahlen, und die läßt sich
 * ohne Brille nachrechnen (`planProps.test.ts`).
 */

/** Ein Gegenstand im Plan — in **Planmetern**, wie alles am Grundriss. */
export interface PlanProp {
  /** Eindeutig innerhalb einer Liste; kommt aus `nextPropId`. */
  id: string;
  kind: PropKind;
  x: number;
  z: number;
  /** Wie er steht, um die Hochachse, in Radiant. */
  yaw: number;
}

/**
 * Wie weit ein Ding über seinem Boden abgesetzt wird, in Metern.
 *
 * Ein Millimeter Luft und keine null: Ein Körper, der die Bodenplatte im
 * ersten Bild schon berührt, steckt für die Physik in ihr drin und wird
 * herausgedrückt — und ein Klotz, der beim Hinsetzen einen Satz macht, sieht
 * aus wie ein Fehler.
 */
export const PROP_CLEARANCE = 0.001;

/** Die Höhe, in der die **Mitte** eines Dings sitzt, das auf dem Boden steht. */
export function standingY(halfHeight: number): number {
  return halfHeight + PROP_CLEARANCE;
}

/** Alle Sorten, die es zu setzen gibt — dieselbe Liste wie im magischen Beutel. */
export const PLACEABLE: readonly PropKind[] = BAG_ITEMS.map(([kind]) => kind);

/**
 * Die nächste freie Kennung für diese Liste.
 *
 * Fortlaufend und nicht gewürfelt: Eine Liste, die man in `localStorage`
 * nachlesen kann, soll man auch lesen können — und `prop-7` sagt mehr als
 * sechzehn Hexziffern.
 */
export function nextPropId(props: readonly PlanProp[]): string {
  let highest = 0;
  for (const prop of props) {
    const number = Number.parseInt(prop.id.replace(/^prop-/, ''), 10);
    if (Number.isFinite(number)) highest = Math.max(highest, number);
  }
  return `prop-${highest + 1}`;
}

/** Ein Ding in die Liste, an eine Stelle in Planmetern. Gibt es zurück. */
export function addProp(
  props: PlanProp[],
  kind: PropKind,
  x: number,
  z: number,
  yaw = 0,
): PlanProp {
  const prop: PlanProp = { id: nextPropId(props), kind, x, z, yaw };
  props.push(prop);
  return prop;
}

/** Und wieder heraus. `true`, wenn wirklich eines da war. */
export function removeProp(props: PlanProp[], id: string): boolean {
  const index = props.findIndex((prop) => prop.id === id);
  if (index < 0) return false;
  props.splice(index, 1);
  return true;
}

/** Das nächstgelegene Ding zu einer Stelle — `null` jenseits von `within`. */
export function propNear(
  props: readonly PlanProp[],
  x: number,
  z: number,
  within: number,
): PlanProp | null {
  let best: PlanProp | null = null;
  let gap = within;
  for (const prop of props) {
    const distance = Math.hypot(prop.x - x, prop.z - z);
    if (distance > gap) continue;
    best = prop;
    gap = distance;
  }
  return best;
}

/** Was in den Speicher geht. */
export function writeProps(props: readonly PlanProp[]): unknown {
  return {
    v: 1,
    props: props.map((prop) => ({
      id: prop.id,
      kind: prop.kind,
      x: round(prop.x),
      z: round(prop.z),
      yaw: round(prop.yaw),
    })),
  };
}

/**
 * Und wieder heraus — **wohlwollend**.
 *
 * Was nicht zu lesen ist, fehlt danach einfach: eine Sorte, die es nicht mehr
 * gibt, eine Zeile ohne Zahlen, ein ganz anderes Format. Ein Editor, der beim
 * Laden eines alten Speicherstands abstürzt, hat den Grundriss verloren, um
 * dessentwillen es das Speichern überhaupt gibt.
 */
export function readProps(raw: unknown): PlanProp[] {
  const box = raw as { props?: unknown } | null;
  const list = Array.isArray(box?.props) ? box.props : [];
  const kinds = new Set<string>(PLACEABLE);
  const out: PlanProp[] = [];
  for (const entry of list) {
    const one = entry as Partial<PlanProp>;
    if (typeof one?.kind !== 'string' || !kinds.has(one.kind)) continue;
    if (!Number.isFinite(one.x) || !Number.isFinite(one.z)) continue;
    out.push({
      id: typeof one.id === 'string' && one.id ? one.id : nextPropId(out),
      kind: one.kind as PropKind,
      x: one.x!,
      z: one.z!,
      yaw: Number.isFinite(one.yaw) ? one.yaw! : 0,
    });
  }
  return out;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
