import type * as THREE from 'three';
import type { Dir } from '../../nav/navTile';
import type { PlanSolid, PlanSolidKind } from '../solids';

/**
 * **Einbauten** — was auf dem Kachelgitter einen *Zustand* hat.
 *
 * Bausteine (`grid/blocks.ts`) sind still: eine Kachel, eine Sorte, eine
 * Blickrichtung, und daraus werden Quader. Das ist genau richtig für alles,
 * was herumsteht, und reicht für nichts, was etwas *tut*. Eine Tür ist halb
 * offen, ein Knopf hat Nachlauf, eine Platte ist gedrückt, solange eine Kiste
 * darauf liegt, ein Tor führt in eine andere Welt. Bisher stand so etwas
 * ausschließlich in Metern in einer eigenen Welt (`worlds/interact/`), und
 * jede zweite Welt baute dieselbe Tür noch einmal.
 *
 * Ein **Einbau** ist deshalb das Gegenstück zum Baustein: dieselbe Kachel,
 * dieselbe Blickrichtung, dazu eine **Art**, ein paar **Eigenschaften**
 * (`target`, `hold`, `text`, …) und ein Zustand, der jedes Bild einen Schritt
 * weitergeht. Er steht im Grundriss (`gridPlan.ts`), er steht im Weltformat
 * (`worldFile.ts`), er ist im Editor zu setzen — und `GridWorld` kennt von
 * alldem nur diese Registry und keine einzige Art einzeln.
 *
 * **Fünf Handgriffe, und die Trennung dazwischen ist der ganze Zweck:**
 *
 * - `init` und `step` sind **rein**: kein three.js, kein Weltkontext, keine
 *   Physik. Sie rechnen einen Zustand weiter und geben zurück, was dabei nach
 *   außen geht. Genau deshalb hat jede Art einen Test, der in Millisekunden
 *   läuft — `interact/doorMotion.ts` ist das Vorbild, und seine Türmathematik
 *   wird von `fixtures/door.ts` importiert und nicht abgeschrieben.
 * - `solid` sagt, ob die Kachel gerade aufhält. Sie wird gefragt und nicht
 *   gespeichert: Eine Tür ist fest, solange sie zu ist, und das ist eine
 *   Ableitung aus dem Zustand und keine zweite Wahrheit daneben.
 * - `build` und `apply` sind das Bild: `build` baut einmal, `apply` schiebt
 *   den Zustand hinein. Wer beides in einem machte, baute die Tür in jedem
 *   Bild neu.
 *
 * **Der Zustand gehört der Art**, und `step` darf ihn an Ort und Stelle
 * ändern. „Rein" heißt hier nicht „ohne Zuweisung", sondern: Was `step`
 * anfasst, sind der Zustand und der Rückgabewert — sonst nichts. Eine Art, die
 * in `step` etwas zeichnet, ist eine, die man nicht prüfen kann.
 *
 * **Wo die Arten stehen.** Jede in einer eigenen Datei (`fixtures/sign.ts`,
 * später `door.ts`, `button.ts`, `gate.ts`, `emitter.ts`), **angemeldet in
 * `fixtures/kinds.ts`**. Dort und nicht hier, und das ist die eine Abweichung
 * von der ersten Skizze: Eine Art baut three.js-Objekte, der Grundriss aber
 * muss ohne three.js auskommen — und er fragt hier nach Kosten und Türkanten
 * (`gridPlan.ts`). Stünden die Arten in dieser Datei, zöge jeder
 * Grundriss-Test die halbe Grafikbibliothek mit. Also steht hier der Vertrag
 * und nebenan die Anmeldung, eine Zeile je Art.
 */

/** Was an einem Einbau eingestellt ist. Flach und einfach: alles, was so in eine Datei passt. */
export type Props = Record<string, string | number | boolean>;

/** Ein Einbau an seinem Platz. */
export interface FixturePlacement {
  /**
   * Sein Name in dieser Welt — und damit das, worauf ein `target` zeigt.
   *
   * Eine Kennung und keine Kachel: Ein Knopf, der „die Kachel 4,7" schaltet,
   * zeigt ins Leere, sobald jemand die Tür eine Kachel weiter setzt.
   */
  id: string;
  kind: string;
  x: number;
  z: number;
  /** Wohin er zeigt — bei allem an einer Kante gleichzeitig, an welcher er steht. */
  dir: Dir;
  level: number;
  props: Props;
}

/** Was in einem Bild auf einen Einbau einwirkt. */
export interface FixtureInput {
  /** Jemand hat ihn benutzt — `A`, der kurze Strahl nach vorn, in VR die Hand (`core/usable.ts`). */
  used: boolean;
  /** Etwas hat ihn getroffen: eine Kugel auf den roten Knopf. */
  hit: boolean;
  /** Was gerade auf seiner Kachel steht: Spieler, NPCs, Kisten. `0` heißt: nichts. */
  weightOn: number;
  /** Ein anderer Einbau hat ihn ausgelöst (`trigger`). */
  triggered: boolean;
}

/** Ein Ort in der Welt, in Metern. */
export interface FixtureSpot {
  x: number;
  y: number;
  z: number;
}

/**
 * **Was ein Einbau nach außen meldet.**
 *
 * Vier Sachen, und mehr sollen es nicht werden. Ein Einbau ruft nichts auf und
 * kennt niemanden — er sagt, was passiert ist, und `GridWorld` verteilt es.
 * Das ist der Unterschied zwischen einem Knopf, den man ohne Welt prüfen kann,
 * und einem, der eine Tür in der Hand hält.
 */
export type FixtureEvent =
  /** Schalte den Einbau mit dieser Kennung (`props.target`). */
  | { type: 'trigger'; target: string }
  /** Bring den Spieler in diese Welt (`worlds/index.ts`) — das Tor des Hubs. */
  | { type: 'goto'; world: string }
  /** Mach ein Geräusch (`core/Audio.ts`). */
  | { type: 'sound'; name: FixtureSound }
  /** Lass einen Effekt laufen (`worlds/effects/`) — zuhören wird dem jemand in P7. */
  | { type: 'effect'; effect: string; at?: FixtureSpot };

/**
 * Die Geräusche, die es gibt — Namen und keine Frequenzen.
 *
 * Wie ein Schalter klingt, entscheidet `core/Audio.ts` und nicht die Tür. Eine
 * Art, die ihre eigenen Töne mitbrächte, klänge nach zwei Wochen anders als
 * der Rest des Hauses.
 */
export type FixtureSound = 'switch-on' | 'switch-off' | 'slam' | 'pop' | 'pick' | 'drop' | 'empty';

export function trigger(target: string): FixtureEvent {
  return { type: 'trigger', target };
}

export function goto(world: string): FixtureEvent {
  return { type: 'goto', world };
}

export function sound(name: FixtureSound): FixtureEvent {
  return { type: 'sound', name };
}

export function effect(kind: string, at?: FixtureSpot): FixtureEvent {
  return at === undefined ? { type: 'effect', effect: kind } : { type: 'effect', effect: kind, at };
}

/**
 * **Was eine Art beim Bauen bekommt** — und mehr nicht.
 *
 * Absichtlich klein: Wer hier einen `WorldContext` durchreichte, hätte Arten,
 * die den Spieler versetzen, das Menü umbauen und die Physik anhalten. Ein
 * Einbau baut Objekte und meldet Ereignisse; alles andere gehört der Welt.
 */
export interface FixtureBuild {
  /** Woran die Art ihre Objekte hängt. */
  group: THREE.Object3D;
  /** Die Mitte seiner Kachel in Weltmetern, `y` auf der Oberkante des Bodens. */
  at: FixtureSpot;
  /** Ein Material aus der Palette der Welt (`GRID_COLORS`, `GridWorld.tint()`). */
  material(kind: PlanSolidKind): THREE.Material;
  /** Eine Zeile ans Handgelenk (`WorldContext.notify`). */
  notify(message: string): void;
}

/** Was beim Bauen herauskommt. */
export interface FixtureView {
  /** Das Bild — hängt in der Gruppe der Welt und wird beim Umbau weggeräumt. */
  object?: THREE.Object3D | null;
  /**
   * Seine Quader, **solange er fest ist** (`solid`).
   *
   * Sie werden wie Bausteine gebaut: sichtbar, mit Körper, aus der Palette der
   * Welt. Wird ein Einbau durchlässig, verschwinden sie — genau das ist eine
   * Schiebetür, die aufgefahren ist, und genau so macht es das Gitter mit
   * seinen Türblättern heute schon (`slidingDoor.ts`).
   */
  solids?: readonly PlanSolid[];
  /** Was beim Abräumen freizugeben ist, wenn `object` dafür nicht reicht. */
  dispose?(): void;
}

/**
 * **Eine Art von Einbau.**
 *
 * `S` ist ihr Zustand — was sie zwischen zwei Bildern behält. Jede Art hat
 * ihren eigenen; die Registry führt sie als `unknown`, weil eine Liste, die alle
 * Zustände kennt, eine Liste ist, die bei jeder neuen Art wächst.
 */
export interface FixtureKind<S = unknown> {
  kind: string;
  /** Wie sie im Editor heißt. */
  label: string;
  /** Die Farbe ihres Napfes in der Palette (`editor/Palette.ts`). */
  accent: number;
  /**
   * Ob sie an eine **Kante** gehört (Tür, Schild, Schalter an der Wand) oder
   * frei auf der Kachel steht (Tor, Platte, Effektquelle).
   *
   * Dieselbe Frage wie bei den Bausteinen (`gridTool.ts`, `EDGE_BLOCKS`), und
   * aus demselben Grund: Eine geratene Blickrichtung steht in drei von vier
   * Fällen falsch herum.
   */
  edge?: boolean;
  /**
   * Was seine Kachel kostet, solange er fest ist. Ohne Angabe `FIXTURE_COST`.
   *
   * Kein „blockiert ja/nein", genau wie beim Baustein: Eine Kachel ist
   * zweieinhalb Meter breit, und ein Knopf darin lässt reichlich Platz.
   */
  cost?: number;
  /**
   * **Diese Art ist eine Tür in der Kachelkante.**
   *
   * Dann trägt der Grundriss sie als Tür-Kante ein (`door(..., open)`) statt
   * als Aufschlag auf der Kachel — und damit weiß ein NPC von ihr, bevor er
   * losläuft (`nav/navBelief.ts`). Ohne das hätte man eine Tür, die man selbst
   * öffnen kann und die für jeden NPC eine Wand ist.
   */
  door?: boolean;
  /** Ob sie gerade offen ist — nur für Türkanten, und nur für den Graphen. */
  open?(state: S): boolean;
  /** Der Anfangszustand. Rein. */
  init(place: FixturePlacement): S;
  /** Ein Bild. Rein — schreibt den Zustand fort und gibt zurück, was nach außen geht. */
  step(state: S, place: FixturePlacement, input: FixtureInput, dt: number): FixtureEvent[];
  /** Hält die Kachel gerade auf? */
  solid(state: S): boolean;
  /** Das Bild bauen — die einzige Stelle mit three.js. */
  build(place: FixturePlacement, ctx: FixtureBuild): FixtureView;
  /** Den Zustand ins Bild schieben, jedes Bild. */
  apply(view: FixtureView, state: S): void;
}

/**
 * **Wie weit ein Einbau gedreht ist**, in Bogenmaß um die Hochachse.
 *
 * Dieselbe Rechnung, die `blocks.turned()` für Quader macht — gebaut wird nach
 * Norden, gedreht wird danach. Sie steht hier, damit nicht jede Art ihre
 * eigene Fallunterscheidung schreibt: Vier Fälle einzeln sind irgendwann drei
 * richtige und einer, bei dem das Schild in der Wand steckt.
 */
export function fixtureYaw(dir: Dir): number {
  return (-dir * Math.PI) / 2;
}

/**
 * Was ein fester Einbau die Kachel kostet, wenn seine Art nichts anderes sagt.
 *
 * Teuer wie eine Kiste (`BLOCKS.crate`): Ein NPC geht daran vorbei, wenn
 * daneben Platz ist, und hindurch, wenn es sein muss. Eine geschlossene Tür
 * ist etwas anderes — die ist eine Türkante, und dafür gibt es `door`.
 */
export const FIXTURE_COST = 2.6;

// --- die Registry -----------------------------------------------------------

const KINDS = new Map<string, FixtureKind<unknown>>();

/**
 * **Eine Art anmelden.** Doppelt wirft.
 *
 * Und zwar laut und beim Start: Zwei Arten unter demselben Namen sind zwei
 * Welten, von denen eine ihre Türen verliert, sobald sich die Ladereihenfolge
 * ändert. Das ist kein Fehler, den man in der Brille suchen will.
 */
export function registerKind<S>(kind: FixtureKind<S>): void {
  if (KINDS.has(kind.kind)) {
    throw new Error(`Die Einbau-Art „${kind.kind}" gibt es schon`);
  }
  KINDS.set(kind.kind, kind as unknown as FixtureKind<unknown>);
}

/**
 * Die Art mit diesem Namen — `null`, wenn dieses Programm sie nicht kennt.
 *
 * `null` und kein Wurf: Eine Welt aus einer neueren Fassung hat Arten, die es
 * hier noch nicht gibt, und dann will man sein Haus sehen und keine
 * Fehlermeldung über ein Tor. Wer baut, überspringt sie und sagt es
 * (`GridWorld`, `console.warn`).
 */
export function fixtureKind(kind: string): FixtureKind<unknown> | null {
  return KINDS.get(kind) ?? null;
}

/** Alle angemeldeten Arten, in der Reihenfolge ihrer Anmeldung. */
export function fixtureKinds(): readonly FixtureKind<unknown>[] {
  return [...KINDS.values()];
}

/** Nur für Tests: die Registry leeren. */
export function clearKinds(): void {
  KINDS.clear();
}

// --- die Eigenschaften ------------------------------------------------------

/**
 * Eine Eigenschaft als Text, Zahl oder Schalter — mit Vorgabe.
 *
 * Drei Zeilen, die sonst in jeder Art stünden: Was aus einer Datei kommt, ist
 * ungewiss genug, dass man es fragen muss, und eine Art, die `props.hold`
 * blind als Zahl nimmt, rechnet irgendwann mit `"2"` weiter.
 */
export function propText(props: Props, key: string, fallback = ''): string {
  const value = props[key];
  return typeof value === 'string' ? value : fallback;
}

export function propNumber(props: Props, key: string, fallback: number): number {
  const value = props[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function propFlag(props: Props, key: string, fallback = false): boolean {
  const value = props[key];
  return typeof value === 'boolean' ? value : fallback;
}
