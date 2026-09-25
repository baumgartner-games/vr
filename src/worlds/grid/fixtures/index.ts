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
  /**
   * **Ob der Spieler selbst darauf steht** — und nicht bloß irgendetwas.
   *
   * Neben `weightOn` und nicht darin, weil die beiden Fragen verschiedene
   * Antworten verlangen. Eine Druckplatte will das **Gewicht**: Zwei Kisten
   * halten sie genauso gedrückt wie ein Spieler, und das ist der ganze Witz an
   * ihr. Ein Tor dagegen bringt jemanden in eine andere Welt — und eine Kiste,
   * die jemand darauf schiebt, soll ihn nicht mitnehmen.
   */
  playerOn: boolean;
  /** Ein anderer Einbau hat ihn ausgelöst (`trigger`). */
  triggered: boolean;
  /**
   * **Das Urteil eines Wandtests** über eine Bodenmarke (`fixtures/mark.ts`,
   * `GridWorld.checkMarks`) — für jeden anderen Einbau leer.
   */
  verdict?: 'pass' | 'fail' | null;
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
 * Fünf Sachen, und mehr sollen es nicht werden. Ein Einbau ruft nichts auf und
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
  /**
   * **Lass einen Effekt laufen** (`worlds/effects/`) — Rauch, Feuer, Funken,
   * Wasser, Staub.
   *
   * `effect` ist eine Kennung aus `effects/effectKinds.ts` und keine Zahl:
   * Wie grau der Rauch ist, entscheidet diese eine Liste, und ein Einbau mit
   * eigenen Partikelzahlen wäre ein zweiter Rauch neben dem ersten. `size`
   * ist der Faktor des Schiebers im Effektlabor (`scaleEffect`), `at` der Ort
   * — ohne Angabe die Kachel dessen, der es meldet, eine Handbreit über dem
   * Boden (`EFFECT_LIFT`). Ein Einbau rechnet nämlich in Kacheln und kennt
   * seine Weltmeter gar nicht.
   */
  | { type: 'effect'; effect: string; at?: FixtureSpot; size?: number }
  /**
   * **Schlag diesen Text als Menüseite auf** (`fixtures/signRows.ts`).
   *
   * Der Weg eines Schildes nach draußen. Bis hierher meldete es seine Zeile
   * als `notify`, also als Hinweis am Handgelenk — vier Sekunden, dann weg.
   * Ein Aushang ist aber kein Hinweis: Er hat eine Überschrift, drei Punkte
   * und vielleicht einen Link, und den will man lesen und nicht erwischen.
   * `GridWorld` macht daraus eine Seite im Menü, mit Markdown und mit einem
   * Zurück (`GridWorld.readAloud`).
   */
  | { type: 'read'; title: string; text: string; markdown: boolean }
  /**
   * **Mach die Umkleide auf** (`ui/WardrobeMenu.ts`, `WorldContext.openWardrobe`).
   *
   * Das einzige Ereignis ohne Inhalt, und das ist Absicht: Der Kleiderschrank
   * weiß nicht, wer davorsteht, was der gerade anhat und ob es am Bildschirm
   * eine Seite oder in der Brille eine Menüseite wird. Er weiß, dass jemand
   * ihn aufgemacht hat — alles andere gehört dem, der die Umkleide besitzt
   * (`App`), und geht über den Weltkontext dorthin.
   */
  | { type: 'wardrobe' };

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

/** Diesen Text als Menüseite aufschlagen — der Aushang eines Schildes. */
export function read(title: string, text: string, markdown = true): FixtureEvent {
  return { type: 'read', title, text, markdown };
}

export function effect(kind: string, size = 1, at?: FixtureSpot): FixtureEvent {
  const event: FixtureEvent = { type: 'effect', effect: kind, size };
  return at === undefined ? event : { ...event, at };
}

/**
 * **Wie hoch über dem Kachelboden ein Effekt losgeht**, in Metern.
 *
 * Eine Wolke, die im Boden anfängt, ist zur Hälfte darunter, und eine, die in
 * Brusthöhe anfängt, schwebt. Eine Handbreit über dem Boden ist der Kompromiss
 * — und er steht hier, weil `GridWorld` ihn beim Zeichnen braucht und eine
 * Art (`fixtures/emitter.ts`) ihre Düse auf dieselbe Höhe baut.
 */
export const EFFECT_LIFT = 0.55;

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
  /**
   * **Den Griff nachreichen**, sobald das Bild aus dem Regal da ist — und das
   * ist der einzige Weg dorthin.
   *
   * Ein benutzbares Ding muss ein **sichtbares Netz** sein
   * (`core/usable.usableShows`): Was `A` findet, ist dasselbe, worauf der
   * gelbe Saum liegt, und beides hängt an dem einen Knoten, den `view.handle`
   * nennt. Solange ein Einbau seine gerechnete Form zeigt, ist sie dieser
   * Knoten; sobald das Modell da ist, muss der Griff **mitwandern**, sonst
   * hängt die Anmeldung an etwas, das niemand mehr sieht. Genau so ist der
   * Bodenhebel verschwunden: Seine Säule blieb `handle` und wurde ausgeknipst.
   *
   * **Warum die Anmeldung nicht gleich beim Modell anfangen kann:** Es ist
   * beim Bauen noch nicht da. Ein Einbau entsteht synchron
   * (`GridWorld.buildFixtures`), das Modell kommt über die Leitung und in
   * einem Checkout ohne die gekauften Pakete nie. Ein Hebel, der erst eine
   * halbe Sekunde später einer wird, ist in dieser halben Sekunde kaputt —
   * und in einem leeren Checkout für immer.
   *
   * **Warum kein zweites Register daneben:** Die Welt merkt sich beim Anmelden
   * genau ein Objekt und meldet beim Umbau unter demselben wieder ab
   * (`GridWorld.attachUsable`, `clearFixtures`). Wer den Griff einfach
   * austauschte, meldete auf dem einen an und auf dem anderen ab und ließe bei
   * jedem Umbau einen Eintrag in der Liste der Welt liegen — im Baumodus
   * Dutzende je Minute, und jeder davon ein Knopf, den es nicht mehr gibt und
   * der trotzdem seine Tür aufmacht. Eine zweite Liste „Griffe, die noch
   * kommen" hätte dieselbe Buchführung ein zweites Mal, und zwei Listen, die
   * dasselbe wissen müssen, wissen es nach der nächsten Änderung verschieden.
   * Also: abmelden, anmelden, `view.handle` mitschreiben — an einer Stelle.
   *
   * **Ist der Einbau längst abgeräumt**, während die Datei noch unterwegs war,
   * läuft der Aufruf ins Leere. Die Arten prüfen das vorher selbst (`gone`),
   * und die Welt prüft es noch einmal: Ein Nachzügler darf nichts anmelden,
   * was niemand mehr abmeldet.
   */
  rehandle(view: FixtureView, object: THREE.Object3D | null): void;
}

/**
 * **Wie großzügig ein Einbau zu bedienen und wie knapp er zu treffen ist**
 * (`PortalWorld.addUsable`).
 *
 * Ohne Angabe misst die Welt das Bild aus, und für die meisten Arten ist das
 * richtig. Es gibt zwei Fälle, in denen es das nicht ist, und beide kommen
 * gleich beim ersten Dutzend vor: eine **Tür**, die eine ganze Kachel breit ist
 * und trotzdem keine Kugel schlucken soll (`shot: 0`), und ein **Knopf**, der
 * von oben großzügig anzuvisieren und aus der Ferne knapp zu treffen ist.
 */
export interface FixtureReach {
  /** Halbmesser fürs Zielen, in Metern. */
  radius?: number;
  /** Halbmesser fürs Treffen; `0` heißt: keine Kugel hält hier an. */
  shot?: number;
  /** Wie weit der Trefferzylinder über und unter der Mitte reicht. */
  half?: number;
}

/**
 * **Was beim Bauen herauskommt.**
 *
 * **Und was es hier nicht mehr gibt: „dreh dich zum Spieler".** Es stand
 * einmal ein `face(head)` darin, jedes Bild gerufen, und das **Schild** war
 * seine einzige Kundschaft (`fixtures/sign.ts`). Es war der halbe Weg: Eine
 * Tafel, die dem Kopf folgt, steht in der Ansicht von oben zur **Figur**
 * gedreht und nicht zur **Kamera** — sie dreht sich also mit, sobald sich die
 * Figur dreht, statt stehen zu bleiben und lesbar zu sein.
 *
 * Wer sich zum Betrachter drehen will, hängt sich das beim Bauen selbst an
 * (`ui/billboard.faceCamera`, `TextPlaneOptions.face`): Ausgerichtet wird dort
 * beim **Zeichnen** und damit je Kamera — am Schirm die von oben, in der
 * Brille je Auge. Kein Einbau muss dafür je Bild etwas tun, und `step` bleibt
 * ohne three.js prüfbar.
 */
export interface FixtureView {
  /** Das Bild — hängt in der Gruppe der Welt und wird beim Umbau weggeräumt. */
  object?: THREE.Object3D | null;
  /**
   * **Wo man ihn anfasst** — und wo eine Kugel ihn trifft.
   *
   * Ohne Angabe die Gruppe selbst, und das ist meistens richtig. Der rote Knopf
   * gibt seine **Kuppel** an: Was man drücken kann, kann man auch treffen
   * (Portal-Regel), und getroffen werden soll der rote Punkt und nicht die
   * Säule darunter — die steht einen halben Meter tiefer, und eine Kugel auf
   * Hüfthöhe flöge sonst daran vorbei.
   *
   * **Es muss ein sichtbares Netz sein** (`core/usable.usableShows`), und
   * deshalb darf es wandern: Wer sein Bild aus dem Regal holt, reicht den
   * Griff nach, sobald die Datei da ist (`FixtureBuild.rehandle`) — dort und
   * nicht von Hand, denn geschrieben werden muss dabei beides, die Liste der
   * Welt und dieses Feld.
   */
  handle?: THREE.Object3D | null;
  /** Seine Maße fürs Bedienen und fürs Treffen. */
  use?: FixtureReach;
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
   * Kein „blockiert ja/nein", genau wie beim Baustein: Ein Knopf steht an der
   * Kante seiner Kachel und lässt den Rest davon frei.
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
