import * as THREE from 'three';
import type { Usable } from '../../core/usable';
import { TILE } from '../nav/navTile';
import { canLoadModels } from '../../core/chefFit';
import { showPlate } from './showPlate';
import type { TextPlane } from '../../ui/TextPlane';

/**
 * **Der Konstruktionsraum** — der weiße Raum aus _Matrix_, und zwar nur für
 * den, der ihn betritt.
 *
 * Die Figur steht vor einem Schrank oder einem Rechner, drückt `A`, und die
 * Welt um sie herum verblasst. Übrig bleiben: der Schrank, ein weißer
 * Kachelboden unter den Füßen und die Auswahl, die daraus hochfährt. Noch ein
 * Druck auf denselben Schrank, und die Welt ist wieder da.
 *
 * **Die Auswahl steht auf den Kacheln** und nicht in der Luft (`tileSlots`):
 * ein Ring um den Schrank herum, zwei Kacheln Abstand, die Kreuzmitte frei.
 * Der Boden rastet dafür auf dem Kachelgitter der Welt ein (`enter`), damit
 * der Schrank mittig auf **seiner** Kachel steht und nicht quer über vieren.
 * Darin geht man herum: Ein Regal, um das man nicht herumgehen kann, ist ein
 * Schaufenster. Und weil man dafür nicht bis vor jedes Stück laufen soll,
 * reicht `A` hier so weit, wie das entfernteste steht (`reach`).
 *
 * **Und der Körper bleibt trotzdem stehen.** Der Raum selbst versetzt niemals
 * jemanden — er ist eine Ansicht, und wer darin herumläuft, läuft in ihm.
 * Dafür sorgt die Welt, die ihn aufmacht (`GridWorld.syncConstructBody`): Sie
 * merkt sich die Stelle, an der jemand hineinging, lässt seinen Körper für die
 * Dauer durch alles hindurchgehen (`PhysicsLocomotion.ghost` — die Küche ist
 * ausgeblendet, ihre Wände stehen aber noch), hält die Pose im Netz an der
 * Eintrittsstelle fest (`NetSession.poseAnchor`) und setzt ihn beim Verlassen
 * genau dorthin zurück. Die anderen im Raum sehen also weiter eine Figur, die
 * vor ihrem Schrank steht und sich umsieht — sie sehen nur nicht, dass die
 * gerade in einem weißen Nichts ihre Hosen sortiert.
 *
 * Das ist der Grund für die ganze Bauart: Ein Raum, der die Welt
 * **ausblendet**, statt den Spieler wegzuschicken, braucht keine zweite Szene
 * und keinen zweiten Spielerkörper — im Netz kostet er ein Feld und keinen
 * zweiten Kanal. Wer stattdessen in eine eigene Szene
 * teleportierte, müsste den Rückweg, den Verbindungsabbruch mittendrin und
 * die Frage, wo die anderen die Figur solange sehen, alle drei selbst
 * beantworten.
 *
 * **Deshalb ist er auch rein lokal.** Nichts an diesem Raum wird geteilt, und
 * nichts daran gehört in einen Spielstand. Er ist eine Ansicht, kein Ort.
 *
 * Wem was gehört, ist die zweite Entscheidung: Die Stücke zur Auswahl
 * (`ConstructItem.object`) kommen von außen und gehen beim Verlassen
 * **unversehrt** wieder zurück — der Raum hängt sie aus dem Baum, gibt aber
 * nichts frei. Was er selbst baut (Boden, Fugen), gehört ihm und stirbt mit
 * `dispose`. Derselbe Schnitt wie beim gelben Saum (`core/highlight.ts`), und
 * aus demselben Grund: Ein Raum, der fremde Geometrie entsorgt, fällt erst
 * beim zweiten Betreten auf.
 */

/** Was der Raum von seiner Welt braucht — und mehr nicht. */
export interface ConstructHost {
  readonly root: THREE.Object3D;
  addUsable(
    object: THREE.Object3D,
    usable: Usable,
    options?: { radius?: number; shot?: number; half?: number },
  ): void;
  removeUsable(object: THREE.Object3D): void;
  notify(message: string): void;
}

/** Ein Stück zur Auswahl, das im Construct aus dem Boden fährt. */
export interface ConstructItem {
  /**
   * **Das Netz — auf Abruf**, und beim zweiten Abruf dasselbe.
   *
   * Der Raum ruft es genau dann ab, wenn das Stück an der Reihe ist,
   * aufzufahren (`paint`), und nicht beim Betreten. Der Unterschied ist die
   * Pause, die man sonst nach dem Druck auf den Schrank sieht: Zwanzig
   * Miniaturen zu bauen kostet den Bruchteil einer Sekunde, und dieser
   * Bruchteil fiel bisher **ganz** in das eine Bild, in dem der Raum aufging.
   * Über die Auffahrwelle verteilt (`RISE_STAGGER`) ist es je Bild eine, und
   * die sieht niemand.
   *
   * Der Raum hängt das Netz ein und gibt es beim Verlassen nicht frei — es
   * gehört dem, der es gebaut hat.
   */
  object(): THREE.Object3D;
  readonly label: string;
  /**
   * **Die zweite Zeile auf dem Schild** — Maß, Kachelzahl, was der Lieferant
   * für wissenswert hält. Ohne sie steht nur der Name da.
   */
  readonly body?: string;
  /**
   * **Wie viele Kacheln das Stück belegt**, wenn es einmal steht — ohne Angabe
   * eine.
   *
   * Der Raum stellt es dann auch auf so viele: Eine Ausgabetheke von zwei
   * Kacheln bekommt zwei nebeneinander, ein Möbel von zwei mal zwei deren
   * vier. Vorher bekam jedes Stück genau eine und wurde auf 0,8 m
   * zurechtgestaucht — nebeneinander sahen ein Mülleimer und eine Theke damit
   * **gleich groß** aus, und wer im Katalog nach Platz suchte, fand ihn erst
   * beim Hinstellen nicht.
   */
  readonly tiles?: ConstructSize;
  /** Was ein Druck darauf tut. `true` heißt: der Raum schließt danach. */
  pick(): boolean;
}

export interface ConstructOptions {
  /** Der Gegenstand, der nicht verblasst — Schrank oder Rechner. */
  readonly anchor: THREE.Object3D;
  /** Wo die Figur steht (Weltkoordinaten, Fußhöhe in y). */
  readonly at: THREE.Vector3;
  /** Die Auswahl, die aus dem Boden fährt. */
  readonly items: readonly ConstructItem[];
  /** Die Zeile, die beim Betreten am Handgelenk steht. */
  readonly title?: string;
}

/**
 * **Wie lange das Verblassen dauert**, in Sekunden — hin wie zurück.
 *
 * Eine halbe Sekunde ist lang genug, dass man den Übergang als Übergang sieht
 * und nicht als Bildfehler, und kurz genug, dass niemand auf sie wartet. Wer
 * zehnmal hintereinander in den Schrank sieht, wartet sonst zehnmal.
 */
export const FADE_SECONDS = 0.5;

/** Die Kantenlänge einer Bodenkachel, in Metern — die des Gitters (`nav/navTile.TILE`). */
export const TILE_SIZE = TILE;

/**
 * **Wie weit der Boden mindestens reicht**, in Kacheln von der Mitte aus.
 *
 * Sieben zu jeder Seite sind fünfzehn mal fünfzehn Kacheln und damit ein
 * Quadrat von 15 m: weit genug, dass der Rand in der Brille am Bildrand liegt
 * und nicht vor den Füßen, und klein genug, dass der Boden nicht so tut, als
 * könnte man darauf spazieren gehen. Weiter draußen bräuchte er ohnehin einen
 * Nebel, und den gibt es hier nicht.
 *
 * **Mindestens**, weil die Stücke auf diesen Kacheln stehen (`tileSlots`): Wer
 * mehr mitbringt, als die Ringe bis hierher fassen, bekommt einen größeren
 * Boden statt Stücke, die neben ihm im Nichts stehen (`floorTilesFor`).
 */
export const FLOOR_TILES = 7;

/** Die dunkle Fuge zwischen zwei Kacheln, in Metern. */
const GROUT = 0.035;

/**
 * **Das Licht des Raums** — sein eigenes, und das ist der Punkt.
 *
 * Der Raum blendet die Welt aus, und die Lichter der Welt hängen als oberstes
 * Kind in ihrer Gruppe (`shared/environment.createLighting`): Sie gingen mit
 * aus, und was blieb, war ein weißer Boden mit **schwarzen Scherenschnitten**
 * darauf. Genau so sah es aus, und genau so war es gemeint — nur nicht so
 * gedacht.
 *
 * Geliehen wird es sich deshalb nicht zurück, es wird mitgebracht. Ein Raum,
 * dessen Beleuchtung an der Welt hängt, aus der man ihn aufmacht, zeigt
 * dieselbe Mütze im Dunkelhaus schwarz und in der Küche weiß — und das ist
 * eine Anprobe, der man nicht trauen kann. Hier ist es in jeder Welt dasselbe
 * Licht, und es ist ein **Schauraumlicht**: von oben weich und von vorn
 * gerichtet, ohne Schatten, ohne Farbe, ohne Stimmung. Die Stimmung ist das
 * Weiß.
 */
const LIGHT_SKY = 0xffffff;
const LIGHT_GROUND = 0x8c97ab;
const LIGHT_HEMI = 2.4;
const LIGHT_KEY = 1.2;

/** Wie tief der Boden beim Einblenden noch liegt, in Metern — er kommt herauf. */
const FLOOR_DIP = 0.3;

/**
 * Wie weit unter der Fußhöhe der Boden liegt, in Metern.
 *
 * Gegen das Z-Flimmern mit dem echten Boden darunter, der ja stehen bleibt (er
 * verblasst nur). Ein Zentimeter reicht und ist beim Gehen nicht zu spüren —
 * gegangen wird hier ohnehin nicht.
 */
const FLOOR_DROP = 0.01;

/** Wie weit unter seinem Platz ein Stück startet, in Metern. */
export const RISE = 1.8;
/** Und wie lange es für den Weg braucht. */
export const RISE_SECONDS = 0.35;
/** Der Versatz je Stück, in Sekunden — sie kommen als Welle, nicht als Block. */
export const RISE_STAGGER = 0.04;

/**
 * **Der Halbmesser, mit dem ein Stück angemeldet wird**, in Metern.
 *
 * Knapp unter der halben Kachel: Die Stücke stehen jetzt auf Kachelmitten und
 * damit einen ganzen Meter auseinander (`tileSlots`), also darf die
 * Trefferfläche fast bis an die Fuge reichen, ohne dass zwei Nachbarn sich
 * überlappen — und wer aus vier Metern auf eine Kommode zielt, soll sie auch
 * treffen. Zwei sich überlappende Zylinder wären dagegen ein gelber Saum, der
 * beim kleinsten Kopfdrehen hin und her springt (`core/highlight.ts`).
 */
const PICK_RADIUS = 0.45;

/** Die Zeile am Handgelenk, wenn die Welt keine eigene mitgibt. */
/**
 * **Die Farbe der Linie unter dem Namen** im Konstrukt — dasselbe kühle Blau
 * wie die Kachelfugen des Raums. Die beiden Schauräume haben ihre eigenen
 * (gelb in der ersten Küche, hellblau in der zweiten): Wer an einem Schild
 * steht, soll auch daran sehen, in welchem der drei Kataloge er gerade ist.
 */
const PLATE_ACCENT = 0x9fb4d8;

const DEFAULT_TITLE = 'Konstrukt — wähle aus';

/** Eine Grundfläche in Kacheln. */
export interface ConstructSize {
  readonly w: number;
  readonly d: number;
}

/**
 * Wohin ein Stück im Construct gehört, relativ zur Mitte (−z ist vorn) — und
 * wie viele Kacheln es dort belegt.
 *
 * `x`/`z` sind die **Mitte der Grundfläche** und nicht ihre Nordwestkachel:
 * Ein Stück von zwei Kacheln steht zwischen zwei Kachelmitten, und wer es auf
 * eine davon setzte, ließe es um einen halben Meter danebenstehen.
 */
export interface ConstructSlot {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;
  readonly d: number;
}

/**
 * **Wie viele Kachelringe um die Mitte frei bleiben.**
 *
 * In der Mitte steht der Anker — der Schrank, der Rechner —, und um ihn herum
 * braucht es Platz: Er ist so groß wie ein Möbel, und ein Regal, das ihm auf
 * die Pelle rückt, verdeckt ihn und damit den Weg zurück. Zwei Kacheln sind
 * zugleich der Radius, in dem die Figur steht, sich dreht und nirgends
 * anstößt.
 */
export const TILE_CLEAR = 2;

/** Der erste besetzte Ring, in Kacheln von der Mitte aus. */
const FIRST_RING = TILE_CLEAR + 1;

/**
 * **Und wie weit der nächste Ring draußen liegt**, in Kacheln.
 *
 * Zwei, also bleibt zwischen zwei besetzten Ringen genau einer leer. Das ist
 * keine Zierde, sondern die Sichtlinie: Ein Ring direkt hinter dem anderen
 * stünde in dessen Lücken und wäre von der Mitte aus halb verdeckt — und
 * verdeckt heißt hier „findet man nicht".
 */
const RING_STEP = 2;

/**
 * **Wo die Auswahl steht** — ein Ring um die Mitte, und jedes Stück bekommt so
 * viele Kacheln, wie es belegt.
 *
 * Das Muster ist geblieben: ein quadratischer Ring, die vier Kreuzmitten frei,
 * damit man geradeaus hinaus- und hineinsieht. Was sich geändert hat, ist die
 * Zuteilung — vorher eine Kachel je Stück, heute **die Grundfläche des
 * Stücks**:
 *
 * - **In der Breite** belegt es so viele Kacheln nebeneinander, wie es breit
 *   ist. Zwei müssen dafür *nebeneinander auf derselben Seite* des Rings
 *   liegen: Ein Möbel über Eck stünde im Knick.
 * - **In der Tiefe** wächst es nach **außen**. Die Ringe stehen zwei
 *   auseinander (`RING_STEP`), also passt ein zwei Kacheln tiefes Stück
 *   dazwischen, ohne dem nächsten Ring in die Quere zu kommen.
 *
 * Die Reihenfolge ist die alte: von der Blickrichtung aus nach beiden Seiten,
 * bei gleichem Winkel zuerst nach rechts. Aus derselben Frage kommt damit
 * jedes Mal dieselbe Antwort — und wer ein Stück dazutut, findet die vorherigen
 * noch dort, wo sie waren, solange keins davor breiter geworden ist.
 *
 * `count` darf eine Zahl bleiben: Das sind dann lauter Stücke von einer
 * Kachel, und genau so ruft die Umkleide es auf (`GridWorld.openWardrobe`).
 */
export function tileSlots(
  count: number | readonly ConstructSize[],
  options?: { facing?: number },
): ConstructSlot[] {
  const sizes: ConstructSize[] =
    typeof count === 'number'
      ? Array.from({ length: Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0 }, () => ({
          w: 1,
          d: 1,
        }))
      : count.map((size) => ({
          w: Math.max(1, Math.floor(size.w)),
          d: Math.max(1, Math.floor(size.d)),
        }));
  if (!sizes.length) return [];
  const asked = options?.facing;
  const facing = Number.isFinite(asked) ? asked! : 0;

  const slots: ConstructSlot[] = [];
  let next = 0;
  for (let ring = FIRST_RING; next < sizes.length; ring += RING_STEP) {
    const here: { x: number; z: number; turn: number }[] = [];
    for (let z = -ring; z <= ring; z++) {
      for (let x = -ring; x <= ring; x++) {
        // Der Ring ist der Rand des Quadrats — und die Kreuzmitte bleibt frei.
        if (Math.max(Math.abs(x), Math.abs(z)) !== ring) continue;
        if (x === 0 || z === 0) continue;
        here.push({ x, z, turn: wrapAngle(Math.atan2(x, -z) - facing) });
      }
    }
    // Von der Blickrichtung aus nach beiden Seiten. Bei gleichem Winkel zuerst
    // nach rechts, damit aus derselben Frage jedes Mal dieselbe Antwort wird.
    here.sort((a, b) => Math.abs(a.turn) - Math.abs(b.turn) || b.turn - a.turn);

    const free = new Set(here.map((tile) => `${tile.x},${tile.z}`));
    const onRing = (x: number, z: number) => free.has(`${x},${z}`);

    while (next < sizes.length) {
      const size = sizes[next]!;
      const span = placeOnRing(here, free, ring, size.w, onRing);
      if (!span) break;
      slots.push(slotFor(span, ring, size));
      next++;
    }
  }
  return slots;
}

/** Auf welcher Seite des Rings eine Kachel liegt — dieselbe Regel wie `slotTurn`. */
function sideOf(x: number, z: number): 'n' | 's' | 'e' | 'w' {
  if (Math.abs(z) >= Math.abs(x)) return z < 0 ? 'n' : 's';
  return x > 0 ? 'e' : 'w';
}

/** Die Richtung **längs** des Rings auf dieser Seite. */
function alongSide(side: 'n' | 's' | 'e' | 'w'): { x: number; z: number } {
  return side === 'n' || side === 's' ? { x: 1, z: 0 } : { x: 0, z: 1 };
}

/** Die Richtung **aus** dem Ring heraus. */
function outOfRing(side: 'n' | 's' | 'e' | 'w'): { x: number; z: number } {
  if (side === 'n') return { x: 0, z: -1 };
  if (side === 's') return { x: 0, z: 1 };
  return side === 'e' ? { x: 1, z: 0 } : { x: -1, z: 0 };
}

/**
 * **Sucht `wide` freie Kacheln nebeneinander auf derselben Ringseite** und
 * belegt sie — oder gibt `null`, wenn dieser Ring keine mehr hergibt.
 *
 * Gesucht wird in der Reihenfolge der Liste, also von der Blickrichtung aus
 * nach außen: Das breiteste Stück bekommt nicht den besten Platz, sondern das
 * erste, das noch passt. Eine Sortierung nach Breite brächte ein volleres
 * Regal und eine Reihenfolge, die sich beim nächsten Katalogstück umwirft.
 */
function placeOnRing(
  here: readonly { x: number; z: number }[],
  free: Set<string>,
  ring: number,
  wide: number,
  onRing: (x: number, z: number) => boolean,
): { x: number; z: number }[] | null {
  for (const tile of here) {
    if (!free.has(`${tile.x},${tile.z}`)) continue;
    const side = sideOf(tile.x, tile.z);
    const along = alongSide(side);
    for (const step of [1, -1]) {
      const span: { x: number; z: number }[] = [];
      for (let i = 0; i < wide; i++) {
        const x = tile.x + along.x * step * i;
        const z = tile.z + along.z * step * i;
        // Auf demselben Ring, auf derselben Seite, und noch frei.
        if (!onRing(x, z) || !free.has(`${x},${z}`) || sideOf(x, z) !== side) break;
        span.push({ x, z });
      }
      if (span.length === wide) {
        for (const one of span) free.delete(`${one.x},${one.z}`);
        return span;
      }
      if (wide === 1) break;
    }
    // Diese Kachel trägt das Stück nicht — sie bleibt frei für ein schmaleres.
    void ring;
  }
  return null;
}

/** Aus der belegten Spanne die Mitte, nach außen um die Tiefe verschoben. */
function slotFor(
  span: readonly { x: number; z: number }[],
  ring: number,
  size: ConstructSize,
): ConstructSlot {
  const first = span[0]!;
  const side = sideOf(first.x, first.z);
  const out = outOfRing(side);
  const mx = span.reduce((sum, one) => sum + one.x, 0) / span.length;
  const mz = span.reduce((sum, one) => sum + one.z, 0) / span.length;
  const deep = (size.d - 1) / 2;
  void ring;
  return {
    x: (mx + out.x * deep) * TILE_SIZE,
    y: 0,
    z: (mz + out.z * deep) * TILE_SIZE,
    w: size.w,
    d: size.d,
  };
}

/**
 * **Wie ein Stück auf seiner Kachel steht** — in Vierteldrehungen, und nur in
 * denen.
 *
 * Es sieht zur Mitte, denn ein Regal, dessen Stücke alle in dieselbe
 * Weltrichtung zeigen, zeigt der Figur die Hälfte von hinten. Aber es sieht
 * **nicht genau** zur Mitte, und das ist der Unterschied zu vorher: Wer den
 * Winkel zur Mitte ausrechnet und ihn hinschreibt, bekommt auf jeder Kachel
 * abseits der beiden Achsen eine krumme Zahl — und damit ein Möbel, das schräg
 * auf seiner Kachel steht. Zwanzig davon sehen aus wie eine Küche nach einem
 * Erdbeben, und schlimmer: Ein schräg stehender Herd sagt nichts mehr darüber,
 * wie er später in der Küche steht. Dort gibt es nur vier Drehungen
 * (`test/zones/kitchenPlan.Turn`), also gibt es hier auch nur vier.
 *
 * Genommen wird die von den vieren, die der Mitte am nächsten kommt: Das Stück
 * steht **grade** und zeigt trotzdem in den Viertelkreis, in dem die Figur
 * steht. Bei Gleichstand — auf den Diagonalen — gewinnt die Tiefe, damit zwei
 * spiegelbildliche Kacheln auch spiegelbildlich stehen und nicht die eine nach
 * Süden und die andere nach Osten.
 *
 * @param slot der Platz, relativ zur Mitte (−z ist vorn)
 * @returns die Drehung um y, in Bogenmaß und immer ein Vielfaches von 90°
 */
export function slotTurn(slot: Pick<ConstructSlot, 'x' | 'z'>): number {
  if (Math.abs(slot.z) >= Math.abs(slot.x)) return slot.z < 0 ? Math.PI : 0;
  return slot.x > 0 ? Math.PI / 2 : -Math.PI / 2;
}

/**
 * **Wie groß der Boden für so viele Stücke sein muss**, in Kacheln von der
 * Mitte aus.
 *
 * Der äußerste belegte Ring, mindestens aber `FLOOR_TILES`: Ein Stück, das
 * neben dem Boden im weißen Nichts steht, ist genau der Fehler, den dieser
 * Umbau beheben sollte.
 */
export function floorTilesFor(count: number): number {
  const slots = tileSlots(count);
  let outer = FLOOR_TILES;
  for (const slot of slots) {
    outer = Math.max(outer, Math.abs(slot.x) / TILE_SIZE, Math.abs(slot.z) / TILE_SIZE);
  }
  return outer;
}

/** Einen Winkel auf (−π, π] zurückholen. */
function wrapAngle(angle: number): number {
  const turn = ((angle + Math.PI) % (2 * Math.PI)) - Math.PI;
  return turn <= -Math.PI ? turn + 2 * Math.PI : turn;
}

/** Was von einem Material gemerkt wird, damit es hinterher wieder es selbst ist. */
interface FadeRecord {
  readonly material: THREE.Material;
  readonly transparent: boolean;
  readonly opacity: number;
  readonly depthWrite: boolean;
}

/** Und was von einem ausgeblendeten Ast zu merken ist: ob er vorher überhaupt zu sehen war. */
interface HiddenNode {
  readonly object: THREE.Object3D;
  readonly visible: boolean;
}

/**
 * Ein Stück samt seinem Platz — so viel, wie der Raum je Bild davon braucht.
 *
 * `object` ist `null`, solange das Stück noch unter dem Boden wartet: Gebaut
 * wird es erst, wenn es an der Reihe ist (`ConstructItem.object`), und
 * angemeldet wird es im selben Atemzug. Ein Stück, das es noch nicht gibt,
 * kann niemand greifen — und es steht auch in keiner Liste, die das behauptet.
 */
interface RackEntry {
  readonly item: ConstructItem;
  object: THREE.Object3D | null;
  readonly slot: ConstructSlot;
}

/** Die Materialien an einem Knoten — eins, mehrere oder keins. */
function materialsOf(node: THREE.Object3D): THREE.Material[] {
  const held = (node as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
  if (!held) return [];
  return Array.isArray(held) ? held : [held];
}

function clamp01(value: number): number {
  return value <= 0 ? 0 : value >= 1 ? 1 : value;
}

function clampTo(value: number, least: number, most: number): number {
  return value < least ? least : value > most ? most : value;
}

/** Zwischenlage für `keepInside` — je Bild gefragt, nie neu angelegt. */
const _world = new THREE.Vector3();

/**
 * **Der Raum selbst** — einer je Welt, nicht einer je Schrank.
 *
 * Zwei offene Constructs gleichzeitig gibt es nicht: Der zweite blendete die
 * Welt ein zweites Mal aus und merkte sich dabei die Deckkraft, die der erste
 * gerade heruntergefahren hat — und stellte sie später genau so wieder her.
 */
export class ConstructRoom {
  private readonly host: ConstructHost;

  /**
   * Wo der Raum gerade steht. `in` und `out` sind die beiden Überblendungen,
   * `open` ist der fertige weiße Raum.
   */
  private phase: 'closed' | 'in' | 'open' | 'out' = 'closed';
  private clock = 0;
  /** Wie lange das Aufgehen mit allen Wellen dauert — `FADE_SECONDS` oder länger. */
  private duration = FADE_SECONDS;

  private faded: FadeRecord[] = [];
  private hidden: HiddenNode[] = [];
  /** Ob das Ausblenden schon fertig ist: Dann fasst `paint` die Welt nicht mehr an. */
  private settled = false;

  private entries: RackEntry[] = [];
  /**
   * Die Schilder vor den Stücken — je Eintrag eines, gebaut, wenn er auffährt.
   * Sie gehören dem Raum und werden beim Verlassen freigegeben; die Stücke
   * selbst gehören dem Lieferanten und werden nur ausgehängt.
   */
  private readonly plates = new Map<RackEntry, { holder: THREE.Object3D; plate: TextPlane }>();

  /** Die Bühne mit Boden und Stücken — einmal gebaut, bei jedem Betreten versetzt. */
  private stage: THREE.Group | null = null;
  private floor: THREE.Group | null = null;
  private tiles: THREE.InstancedMesh | null = null;
  private grout: THREE.Mesh | null = null;
  /** Die beiden Lampen des Raums — sie kommen mit der Deckkraft herauf. */
  private lights: THREE.Light[] = [];
  /** Wie weit der gebaute Boden reicht, in Kacheln — er wächst, aber schrumpft nie. */
  private floorTiles = 0;

  /**
   * **Wie weit `A` gerade reichen muss**, in Metern — von den Füßen bis zum
   * entferntesten Stück.
   *
   * Die Vorgabe (`core/usable.USE_REACH`, 1,5 m) ist eine Armlänge und eine
   * halbe, und sie ist genau richtig für eine Welt, in der man zu einem Knopf
   * **hingeht**. Hingehen kann man hier auch — aber der Ring liegt drei
   * Kacheln weit draußen und geht einmal herum, und wer für jedes Stück, das
   * er sich ansehen will, erst drei Schritte und eine halbe Drehung machen
   * muss, sieht sich zwei an und hört auf. Der Raum ist ein Schauraum: Man
   * steht in der Mitte, sieht sich um, und was man ansieht, kann man nehmen.
   *
   * Also reicht der Strahl im Konstrukt so weit, wie das entfernteste Stück
   * steht, und keinen Meter weiter. **Gerechnet und nicht geraten**, weil die
   * Zahl sonst bei jedem zusätzlichen Ring falsch wäre; und harmlos, weil im
   * Konstrukt außer dem Anker und der Auswahl ohnehin nichts mehr sichtbar ist
   * und damit nichts anderes antwortet (`PortalWorld.collectUsables`).
   */
  private far = 0;

  /** Ein Druck will hinaus — abgearbeitet wird das im nächsten `update`, siehe `pickedBy`. */
  private wantsLeave = false;

  constructor(host: ConstructHost) {
    this.host = host;
  }

  /** Ob der weiße Raum gerade gilt — beim Zurückblenden schon wieder `false`. */
  get open(): boolean {
    return this.phase === 'in' || this.phase === 'open';
  }

  /** Wie weit `A` reichen muss, damit jedes Stück erreichbar ist (siehe `far`). */
  get reach(): number {
    return this.far;
  }

  /**
   * **Der Rand des Raums** — eine Stelle in Weltmetern auf den Boden
   * zurückholen, und sagen, ob das nötig war.
   *
   * Seit man hier herumgehen darf, hat der weiße Boden einen Rand, und hinter
   * dem ist wirklich nichts: kein Boden, keine Kachel, keine Schwerkraft, die
   * einen zurückholt (`PhysicsLocomotion.ghost`). Wer darüber hinausliefe,
   * stünde in einem weißen Nichts ohne jedes Merkmal und fände den Weg zurück
   * nur durch Probieren. Also endet der Raum an seinem Boden, wie ein Zimmer
   * an seiner Wand — eine halbe Kachel vor der letzten Fuge, damit man nicht
   * mit den Zehen über der Kante steht.
   *
   * Der Raum klemmt dabei nicht selbst: Er sagt nur, wo sein Rand ist. Wer den
   * Spieler versetzt, ist die Welt (`GridWorld.syncConstructBody`) — der Raum
   * fasst den Spieler an keiner Stelle an, und das soll so bleiben.
   */
  keepInside(point: THREE.Vector3): boolean {
    const stage = this.stage;
    if (!this.open || !stage || this.floorTiles <= 0) return false;
    const reach = (this.floorTiles + 0.5) * TILE_SIZE;
    const centre = stage.getWorldPosition(_world);
    const x = clampTo(point.x, centre.x - reach, centre.x + reach);
    const z = clampTo(point.z, centre.z - reach, centre.z + reach);
    if (x === point.x && z === point.z) return false;
    point.set(x, point.y, z);
    return true;
  }

  /**
   * **Hinein.** Die Welt verblasst, der Boden kommt herauf, die Auswahl fährt
   * aus.
   *
   * Ein zweiter Aufruf auf einem offenen Raum tut nichts — der Schrank meldet
   * `A` ein zweites Mal, weil er nicht weiß, ob der Raum schon offen ist, und
   * das darf ihn nichts kosten. Wer betritt, während noch zurückgeblendet
   * wird, bekommt den Rückweg augenblicklich zu Ende gespielt: sonst stünden
   * gleich zwei Überblendungen auf demselben Material.
   */
  enter(options: ConstructOptions): void {
    if (this.open) return;
    if (this.phase === 'out') this.settle();

    this.collect(options.anchor);

    const stage = this.ensureStage(floorTilesFor(options.items.length));
    // **Die Mitte ist der Anker und nicht die Figur**, und sie rastet auf dem
    // Kachelgitter der Welt ein (`nav/navTile.tileCentreX`). Beides gehört
    // zusammen: Der Schrank steht auf einer Kachel der Welt, und ein
    // Kachelboden, der um die **Füße** herum ausgelegt wird, liegt gegenüber
    // dieser Kachel um jeden Betrag verschoben, den die Figur gerade vom
    // Kachelrand entfernt steht. Der Schrank stünde dann quer über vier
    // Kacheln — man sieht es sofort, und es sieht nach Fehler aus. Eingerastet
    // sind Weltgitter und Konstruktboden dieselben Kacheln, und der Anker
    // steht mittig auf seiner.
    const centre = this.centre(options.anchor, options.at);
    // Die Bühne steht im Baum der Welt, also in **deren** Koordinaten: `centre`
    // ist Weltmaß und muss umgerechnet werden, sonst liegt der Boden bei jeder
    // Welt, die ihre Gruppe verschiebt, woanders als die Füße.
    stage.position.copy(this.host.root.worldToLocal(centre.clone()));
    this.host.root.add(stage);

    // Die Blickrichtung ist die von den Füßen zur Mitte: Wer den Schrank
    // drückt, sieht den Schrank an, und was hinter ihm im Ring steht, ist das
    // Erste, was nach dem Verblassen im Bild ist.
    const slots = tileSlots(options.items.length, {
      facing: Math.atan2(centre.x - options.at.x, -(centre.z - options.at.z)),
    });
    this.far = this.reachFor(slots, options.at, centre);
    // **Hier entsteht noch keins davon.** Die Plätze stehen fest, die Netze
    // kommen einzeln dazu, wenn sie auffahren (`raise`).
    this.entries = options.items.map((item, index) => ({
      item,
      object: null,
      slot: slots[index]!,
    }));

    this.phase = 'in';
    this.clock = 0;
    this.settled = false;
    this.wantsLeave = false;
    this.duration = Math.max(
      FADE_SECONDS,
      this.entries.length > 0
        ? (this.entries.length - 1) * RISE_STAGGER + RISE_SECONDS
        : RISE_SECONDS,
    );
    this.paint();
    this.host.notify(options.title ?? DEFAULT_TITLE);
  }

  /**
   * **Hinaus.** Die Welt kommt zurück, die Auswahl versinkt.
   *
   * Abgemeldet wird sofort und nicht erst am Ende der Überblendung: Ein Stück,
   * das im Boden versinkt und dabei noch auf `A` hört, ist ein Griff ins Leere
   * mit Wirkung.
   *
   * Ohne vorheriges `enter` passiert nichts — eine Welt, die bei jedem
   * Weltwechsel vorsichtshalber schließt, soll das tun dürfen.
   */
  leave(): void {
    if (this.phase === 'closed' || this.phase === 'out') return;
    for (const entry of this.entries) {
      if (entry.object) this.host.removeUsable(entry.object);
    }
    // Erst wieder sichtbar machen, dann einblenden: Was auf `visible = false`
    // steht, blendet nicht ein, es erscheint.
    for (const node of this.hidden) node.object.visible = node.visible;
    this.settled = false;
    // **Mitten im Aufgehen umgedreht heißt: von dort zurück.** `open01` ist
    // beim Hineinblenden `clock / FADE` und beim Hinausblenden `1 − clock /
    // FADE`; eine Uhr, die dabei auf null gestellt wird, springt von dem
    // Stand, den sie gerade hatte, erst auf **ganz offen** und blendet von dort
    // zurück. Wer zweimal kurz hintereinander drückt — und das tut jeder, der
    // sich verdrückt hat —, sieht die Welt dann einmal ganz verschwinden,
    // bevor sie wiederkommt. Also wird der Stand übernommen und nicht
    // verworfen.
    const open01 = this.phase === 'in' ? clamp01(this.clock / FADE_SECONDS) : 1;
    this.phase = 'out';
    this.clock = FADE_SECONDS * (1 - open01);
    this.wantsLeave = false;
    this.paint();
  }

  /** Ein Bild weiter: Überblendung, Boden, Welle — und der Wunsch, hinauszugehen. */
  update(dt: number): void {
    if (this.phase === 'closed') return;
    // **Erst schließen, dann rechnen.** Ein `pick`, das `true` gesagt hat,
    // wurde mitten in der Auswahlschleife der Welt gerufen (`core/usable.ts`);
    // wer von dort aus `leave` ruft, meldet Gegenstände ab, über die diese
    // Schleife gerade läuft, und räumt dem `pick` den Boden unter den Füßen
    // weg, bevor es zu Ende ist. Ein Bild später ist all das vorbei.
    if (this.wantsLeave) {
      this.wantsLeave = false;
      this.leave();
      return;
    }

    this.clock += Number.isFinite(dt) && dt > 0 ? dt : 0;
    this.paint();

    if (this.phase === 'in' && this.clock >= this.duration) this.phase = 'open';
    else if (this.phase === 'out' && this.clock >= FADE_SECONDS) this.settle();
  }

  /**
   * **Weltwechsel.** Was der Raum gebaut hat, ist weg; was ihm geliehen wurde,
   * hängt wieder frei und unversehrt herum.
   */
  dispose(): void {
    if (this.phase !== 'closed') {
      if (this.open) {
        for (const entry of this.entries) {
          if (entry.object) this.host.removeUsable(entry.object);
        }
        for (const node of this.hidden) node.object.visible = node.visible;
      }
      this.settle();
    }
    this.disposeFloor();
    // Eine Lampe hat weder Geometrie noch Material; sie geht mit der Bühne aus
    // dem Baum, und mehr ist an ihr nicht freizugeben.
    this.lights = [];
    this.stage?.removeFromParent();
    this.stage = null;
    this.floorTiles = 0;
  }

  /** Nur der Boden — beim Weltwechsel, und wenn ein größerer gebraucht wird. */
  private disposeFloor(): void {
    this.tiles?.geometry.dispose();
    (this.tiles?.material as THREE.Material | undefined)?.dispose();
    this.grout?.geometry.dispose();
    (this.grout?.material as THREE.Material | undefined)?.dispose();
    this.floor = null;
    this.tiles = null;
    this.grout = null;
  }

  /**
   * **Die Materialien der Welt, einmal eingesammelt** — beim Betreten und nicht
   * je Bild.
   *
   * Ein Durchlauf durch den ganzen Weltbaum kostet bei einer Küche mit ein
   * paar tausend Knoten mehr, als ein Bild in der Brille übrig hat (11 ms bei
   * 90 Hz für alles zusammen), und er brächte nichts: Was während der halben
   * Sekunde Überblendung dazukommt, soll ohnehin nicht mitverblassen — es
   * gehört zur Welt, die gerade verschwindet. Vor allem aber hängt an dieser
   * Liste die **Wiederherstellung**: Nur was hier steht, wird hinterher
   * zurückgesetzt, und eine Liste, die sich je Bild ändert, verliert genau die
   * Materialien, die schon auf halber Deckkraft stehen.
   *
   * Was vom Anker aus erreichbar ist, bleibt draußen — auch wenn es sich ein
   * Material mit der halben Welt **teilt**. Ein geteiltes Material gehört in
   * dem Fall beiden, und die Welt mitzunehmen hieße, den Anker mitzunehmen.
   */
  private collect(anchor: THREE.Object3D): void {
    const keep = new Set<THREE.Material>();
    anchor.traverse((node) => {
      for (const material of materialsOf(node)) keep.add(material);
    });

    const seen = new Set<THREE.Material>();
    this.faded = [];
    this.host.root.traverse((node) => {
      for (const material of materialsOf(node)) {
        if (keep.has(material) || seen.has(material)) continue;
        seen.add(material);
        this.faded.push({
          material,
          transparent: material.transparent,
          opacity: material.opacity,
          depthWrite: material.depthWrite,
        });
      }
    });

    this.hidden = [];
    this.hideList(this.host.root, anchor, this.hidden);
  }

  /**
   * **Was ausgeblendet wird, wenn die Deckkraft unten ist** — die flachsten
   * Äste, die den Anker nicht enthalten.
   *
   * Im Regelfall sind das genau die obersten Kinder der Weltgruppe. Steckt der
   * Anker in einem davon (er steht in der Küchenzone, und die ist eine
   * Gruppe), steigt die Suche in genau diesen einen Ast hinab und blendet dort
   * die Geschwister aus. Der Anker selbst wird nie angefasst — **und nie
   * umgehängt**: Ihn in die Bühne zu hängen wäre eine Zeile und kostete drei:
   * Er verlöre seinen Platz im Baum (und damit seine Weltmatrix), sein
   * Kollisionskörper (`physics/`) bliebe zurück, und wer ihn zwischendurch
   * sucht — Editor, Strahl, Nachbarzone — fände ihn woanders. Stehen lassen
   * und übergehen ist beides nicht.
   *
   * Gemerkt wird auch, ob der Ast vorher überhaupt sichtbar war: Ein Möbel,
   * das die Welt aus eigenen Gründen versteckt hält, darf beim Verlassen des
   * Constructs nicht plötzlich dastehen.
   */
  private hideList(node: THREE.Object3D, anchor: THREE.Object3D, out: HiddenNode[]): void {
    const path = new Set<THREE.Object3D>();
    for (let step: THREE.Object3D | null = anchor; step; step = step.parent) path.add(step);
    const walk = (parent: THREE.Object3D): void => {
      for (const child of parent.children) {
        if (child === anchor) continue;
        if (path.has(child)) walk(child);
        else out.push({ object: child, visible: child.visible });
      }
    };
    walk(node);
  }

  /** Die Anmeldung eines Stücks — ein `Usable` wie jeder Knopf (`core/usable.ts`). */
  private pickedBy(item: ConstructItem): Usable {
    return {
      interaction: 'press',
      usePrompt: () => item.label,
      use: () => {
        if (!this.open) return false;
        if (item.pick()) this.wantsLeave = true;
        return true;
      },
    };
  }

  /**
   * **Ein Bild malen** — aus Phase und Uhr, ohne eigenes Gedächtnis.
   *
   * `open01` ist der einzige Fortschritt, den es gibt: 0 ist die Welt, 1 ist
   * das Construct. Boden, Deckkraft und Welle hängen alle daran, und deshalb
   * sieht ein Übergang, der mittendrin umgedreht wird, nicht kaputt aus.
   */
  private paint(): void {
    const ratio = clamp01(this.clock / FADE_SECONDS);
    const open01 = this.phase === 'out' ? 1 - ratio : this.phase === 'open' ? 1 : ratio;

    if (!this.settled) {
      for (const record of this.faded) {
        record.material.transparent = true;
        record.material.depthWrite = false;
        record.material.opacity = record.opacity * (1 - open01);
      }
      // **Unten angekommen wird geräumt.** Ein Material auf Deckkraft 0 bleibt
      // sonst in der Sortierung der durchsichtigen Dinge hängen, und die
      // kostet je Bild mehr als der ganze Raum: Der Renderer sortiert sie nach
      // Tiefe, zeichnet sie in eigener Reihenfolge und kann nichts davon
      // wegwerfen. Unsichtbar ist billiger als durchsichtig.
      if (this.phase === 'in' && open01 >= 1) {
        for (const node of this.hidden) node.object.visible = false;
        this.restore();
        this.settled = true;
      }
    }

    if (this.floor) {
      this.floor.position.y = -FLOOR_DIP * (1 - open01);
      this.setFloorOpacity(open01);
    }
    this.setLight(open01);

    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i]!;
      // Hinein als Welle, hinaus alle zusammen: Beim Verlassen ist die Welt
      // nach einer halben Sekunde wieder da, und ein Stück, das dann noch
      // versinkt, versinkt im Küchenboden.
      const due = this.clock - i * RISE_STAGGER;
      const risen =
        this.phase === 'out'
          ? 1 - clamp01(this.clock / RISE_SECONDS)
          : this.phase === 'open'
            ? 1
            : clamp01(due / RISE_SECONDS);
      // **Und hier kommt es zur Welt.** Solange die Welle dieses Stück noch
      // nicht erreicht hat, gibt es gar nichts zu setzen — und auf dem Rückweg
      // wird nichts mehr gebaut, was nie zu sehen war.
      const waiting = this.phase === 'out' || (this.phase === 'in' && due < 0);
      const object = entry.object ?? (waiting ? null : this.raise(entry));
      if (!object) continue;
      object.position.set(entry.slot.x, entry.slot.y - RISE * (1 - risen), entry.slot.z);
    }
  }

  /**
   * **Ein Stück bauen, hinstellen und anmelden** — einmal je Stück und je
   * Besuch, in dem Bild, in dem es aus dem Boden kommt.
   *
   * Angemeldet wird hier und nicht beim Betreten, und das ist mehr als eine
   * Sparmaßnahme: `A` meint immer nur, was es sieht, und was noch nicht
   * dasteht, soll auch nicht antworten.
   */
  private raise(entry: RackEntry): THREE.Object3D {
    const object = entry.item.object();
    entry.object = object;
    this.stage?.add(object);
    object.visible = true;
    // Jedes Stück sieht zur Mitte — aber in Vierteln (`slotTurn`).
    object.rotation.y = slotTurn(entry.slot);
    this.host.addUsable(object, this.pickedBy(entry.item), { radius: PICK_RADIUS });
    this.label(entry);
    return object;
  }

  /**
   * **Das Schild vor dem Stück** — unten auf dem Boden, an der Kante, die zur
   * Mitte zeigt.
   *
   * Dieselbe Tafel wie in den beiden Schauräumen (`shared/showPlate.ts`), und
   * zum ersten Mal überhaupt eine im Konstrukt: Bisher stand der Name des
   * Stücks nur in `usePrompt` — und den zeigt seit dem Umbau der Bedienung
   * niemand mehr an (`core/usable.ts`). Wer vor zweiundzwanzig Miniaturen
   * stand, musste raten, welche davon das Filterband ist.
   *
   * **Zur Mitte und nicht nach Süden**: Im Konstrukt steht man in der Mitte,
   * also ist „vorn" die Seite, die dorthin zeigt. Das Schild wird deshalb wie
   * das Stück selbst um `slotTurn` gedreht — dann liegt seine Vorderkante an
   * derselben Seite wie dessen.
   *
   * **Ohne Leinwand kein Schild** (`core/chefFit.canLoadModels`): `TextPlane`
   * malt auf ein Canvas, und der Test dieses Raums läuft ohne `document`.
   */
  private label(entry: RackEntry): void {
    if (!this.stage || !canLoadModels() || this.plates.has(entry)) return;
    const plate = showPlate({
      title: entry.item.label,
      body: entry.item.body,
      accent: PLATE_ACCENT,
      tiles: { w: entry.slot.w, d: entry.slot.d },
      at: { x: 0, z: 0 },
      floor: 0,
    });
    // **Eine halbe Umdrehung mehr als das Stück**, und die ist der Unterschied
    // zwischen den beiden Räumen: In einem Schauraum geht man von Süden an die
    // Reihe heran, dort ist „vorn" die Südkante — und genau dorthin setzt
    // `showPlate` das Schild. Im Konstrukt steht man in der **Mitte**, und
    // vorn ist die Seite, die dorthin zeigt (`slotTurn`, „−z ist vorn").
    // Dieselbe Drehung wie beim Stück ließe das Schild hinter ihm landen.
    const holder = new THREE.Group();
    holder.name = 'construct-plate';
    holder.add(plate);
    holder.position.set(entry.slot.x, entry.slot.y, entry.slot.z);
    holder.rotation.y = slotTurn(entry.slot) + Math.PI;
    // Ein Schild fängt keinen Strahl: Sonst gewinnt es gegen das Stück
    // dahinter, und ein Druck darauf wählt nichts aus.
    holder.traverse((object) => {
      object.raycast = () => {};
    });
    this.stage.add(holder);
    this.plates.set(entry, { holder, plate });
  }

  /** Und wieder weg — die Schilder gehören dem Raum, nicht dem Lieferanten. */
  private clearPlates(): void {
    for (const { holder, plate } of this.plates.values()) {
      holder.removeFromParent();
      plate.dispose();
    }
    this.plates.clear();
  }

  /** Die gemerkten Flaggen zurück — genau so, wie sie waren. */
  private restore(): void {
    for (const record of this.faded) {
      record.material.transparent = record.transparent;
      record.material.opacity = record.opacity;
      record.material.depthWrite = record.depthWrite;
    }
  }

  /**
   * **Aus dem Raum wird wieder nichts**: Flaggen zurück, geliehene Stücke aus
   * dem Baum, Bühne aus der Welt. Was der Raum gebaut hat, bleibt gebaut — das
   * nächste Betreten benutzt denselben Boden wieder, und der ist bis auf seinen
   * Platz jedes Mal derselbe.
   */
  private settle(): void {
    this.restore();
    this.clearPlates();
    for (const entry of this.entries) entry.object?.removeFromParent();
    this.entries = [];
    this.faded = [];
    this.hidden = [];
    this.stage?.removeFromParent();
    this.phase = 'closed';
    this.clock = 0;
    this.settled = false;
  }

  /** Wie tief unter `at` der Boden liegt — unter der Fußkante des Ankers, falls die tiefer ist. */
  private dropBelow(anchor: THREE.Object3D, at: THREE.Vector3): number {
    const box = new THREE.Box3().setFromObject(anchor);
    const foot = box.isEmpty() ? at.y : Math.min(at.y, box.min.y);
    return at.y - foot + FLOOR_DROP;
  }

  /**
   * **Die Mitte des Raums in Weltkoordinaten** — die Kachelmitte, auf der der
   * Anker steht, und die Fußhöhe der Figur.
   *
   * Gerechnet wird über dem **Ursprung** des Ankers und nicht über seinem
   * Kasten: Ein Einbau steht mit seinem Ursprung auf der Kachelmitte
   * (`GridWorld.buildFixtures`), sein Netz aber oft an der Kante davon (der
   * Schrank steht an der Wand, `fixtures/wardrobe.edge`). Wer den Kasten
   * mittelte, rastete deshalb ausgerechnet bei den Möbeln daneben ein, um die
   * es hier geht.
   */
  private centre(anchor: THREE.Object3D, at: THREE.Vector3): THREE.Vector3 {
    const world = anchor.getWorldPosition(new THREE.Vector3());
    return new THREE.Vector3(
      (Math.floor(world.x / TILE_SIZE) + 0.5) * TILE_SIZE,
      at.y - this.dropBelow(anchor, at),
      (Math.floor(world.z / TILE_SIZE) + 0.5) * TILE_SIZE,
    );
  }

  /**
   * **Wie weit `A` reichen muss** (siehe `far`): bis zum entferntesten Stück,
   * von den Füßen aus und waagerecht gemessen — so, wie `pickUsable` misst.
   *
   * Der Halbmesser des Stücks kommt dazu, denn getroffen ist ein Zylinder
   * schon an seiner Vorderkante; ohne ihn läge das äußerste Stück um genau
   * diese Handbreit außerhalb.
   */
  private reachFor(
    slots: readonly ConstructSlot[],
    at: THREE.Vector3,
    centre: THREE.Vector3,
  ): number {
    let far = 0;
    for (const slot of slots) {
      far = Math.max(far, Math.hypot(centre.x + slot.x - at.x, centre.z + slot.z - at.z));
    }
    return far > 0 ? far + PICK_RADIUS : 0;
  }

  /**
   * **Die Bühne** — einmal gebaut, bei jedem Betreten versetzt. Nur der Boden
   * wird noch einmal gebaut, wenn er für die Auswahl zu klein geworden ist.
   *
   * Er **wächst und schrumpft nicht**: Wer erst siebzehn Kleidungsstücke und
   * danach ein einziges Möbel ansieht, bekommt beim zweiten Mal keinen
   * kleineren Boden, sondern denselben. Ein Boden, der bei jeder Auswahl neu
   * entsteht, ist genau der Posten, den das erste Öffnen schon teuer macht.
   */
  private ensureStage(tiles: number): THREE.Group {
    const stage = (this.stage ??= new THREE.Group());
    stage.name = 'construct';
    if (this.lights.length === 0) stage.add(this.buildLight());
    if (this.floorTiles >= tiles) return stage;
    if (this.floor) {
      this.floor.removeFromParent();
      this.disposeFloor();
    }
    stage.add(this.buildFloor(tiles));
    this.floorTiles = tiles;
    return stage;
  }

  /**
   * **Die Lampen des Raums** (siehe `LIGHT_HEMI`) — zwei, und sie hängen an der
   * Bühne.
   *
   * An der Bühne und nicht an der Welt, weil sie mit dem Raum kommen und gehen
   * sollen: Beim Verlassen wird die Bühne ausgehängt (`settle`), und die Welt
   * bekommt danach genau ihr eigenes Licht zurück und keinen Zuschlag. Für die
   * halbe Sekunde dazwischen fahren sie mit der Deckkraft herauf, damit die
   * verblassende Küche nicht kurz doppelt beleuchtet dasteht.
   *
   * Kein Schatten: Er kostet einen zweiten Durchgang für eine Handvoll
   * Miniaturen auf einem Boden, der ohnehin nur weiß ist — und ein Schlagschatten
   * unter jedem Stück machte aus dem Nichts einen Raum mit Decke.
   */
  private buildLight(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'construct-light';
    const hemi = new THREE.HemisphereLight(LIGHT_SKY, LIGHT_GROUND, 0);
    const key = new THREE.DirectionalLight(LIGHT_SKY, 0);
    // Von schräg oben vorn, wie in einem Schaufenster. Die Richtung ist die der
    // Welt und nicht die der Figur: Der Raum dreht sich nicht mit dem Kopf, und
    // ein Licht, das das täte, nähme jedem Stück seine Form.
    key.position.set(3, 8, 5);
    key.castShadow = false;
    group.add(hemi, key);
    this.lights = [hemi, key];
    return group;
  }

  /**
   * **Der weiße Boden** — zwei Netze für 225 Kacheln und keine 225.
   *
   * Ein Netz je Kachel wären 225 Zeichenaufrufe für ein Quadrat, das zu keinem
   * Zeitpunkt etwas anderes tut, als weiß zu sein; in der Brille sind es 450,
   * weil jedes Auge sein eigenes Bild bekommt. Also ein `InstancedMesh` mit
   * einer geteilten Kachelfläche (derselbe Griff wie bei den Randsteinen der
   * Rennstrecke, `test/zones/kart.ts`) und **eine** dunkle Platte darunter,
   * die durch die Fugen zu sehen ist. Die Fuge wird also nicht gezeichnet,
   * sondern freigelassen — das spart die Textur, und eine Textur bräuchte eine
   * Leinwand, die es im Testlauf nicht gibt (`core/chefFit.canLoadModels`).
   *
   * Beide Netze sind `MeshBasicMaterial`: Der Construct hat kein Licht, und er
   * soll auch keins haben — das Weiß ist die Aussage, nicht die Beleuchtung.
   */
  private buildFloor(half: number): THREE.Group {
    const floor = new THREE.Group();
    floor.name = 'construct-floor';

    const side = half * 2 + 1;
    const tile = new THREE.PlaneGeometry(TILE_SIZE - GROUT, TILE_SIZE - GROUT).rotateX(
      -Math.PI / 2,
    );
    const mesh = new THREE.InstancedMesh(
      tile,
      new THREE.MeshBasicMaterial({
        color: 0xf4f6fa,
        transparent: true,
        opacity: 0,
        toneMapped: false,
      }),
      side * side,
    );
    mesh.name = 'construct-tiles';
    const matrix = new THREE.Matrix4();
    for (let z = 0; z < side; z++) {
      for (let x = 0; x < side; x++) {
        matrix.makeTranslation((x - half) * TILE_SIZE, 0, (z - half) * TILE_SIZE);
        mesh.setMatrixAt(z * side + x, matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;

    const grout = new THREE.Mesh(
      new THREE.PlaneGeometry(side * TILE_SIZE, side * TILE_SIZE).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: 0x0b0e14,
        transparent: true,
        opacity: 0,
        toneMapped: false,
      }),
    );
    grout.name = 'construct-grout';
    grout.position.y = -0.004;

    for (const part of [mesh as THREE.Mesh, grout]) {
      // Der Boden ist Kulisse: kein Schatten, kein Strahl. Ein Boden, der
      // Strahlen aufhält, ist der erste, den `A` findet — und dann meint man
      // nie wieder ein Stück (`core/usable.pickUsable`).
      part.castShadow = false;
      part.receiveShadow = false;
      part.raycast = () => {};
    }

    floor.add(grout, mesh);
    this.floor = floor;
    this.tiles = mesh;
    this.grout = grout;
    return floor;
  }

  /** Die Lampen fahren mit dem Raum herauf — siehe `buildLight`. */
  private setLight(value: number): void {
    const [hemi, key] = this.lights;
    if (hemi) hemi.intensity = LIGHT_HEMI * value;
    if (key) key.intensity = LIGHT_KEY * value;
  }

  private setFloorOpacity(value: number): void {
    const tiles = this.tiles?.material as THREE.Material | undefined;
    if (tiles) tiles.opacity = value;
    const grout = this.grout?.material as THREE.Material | undefined;
    if (grout) grout.opacity = value;
  }
}
