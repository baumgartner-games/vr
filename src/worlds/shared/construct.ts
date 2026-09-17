import * as THREE from 'three';
import type { Usable } from '../../core/usable';
import { TILE } from '../nav/navTile';

/**
 * **Der Konstruktionsraum** — der weiße Raum aus _Matrix_, und zwar nur für
 * den, der ihn betritt.
 *
 * Die Figur steht vor einem Schrank oder einem Rechner, drückt `A`, und die
 * Welt um sie herum verblasst. Übrig bleiben: der Schrank, ein weißer
 * Kachelboden unter den Füßen und die Auswahl, die daraus hochfährt. Noch ein
 * Druck auf denselben Schrank, und die Welt ist wieder da.
 *
 * **Und der Körper bleibt stehen.** Nichts hier versetzt den Spieler, dreht
 * ihn oder sperrt seine Steuerung: Die anderen im Raum sehen weiter eine
 * Figur, die vor ihrem Schrank steht — sie sehen nur nicht, dass die gerade in
 * einem weißen Nichts ihre Hosen sortiert. Das ist der Grund für die ganze
 * Bauart: Ein Raum, der die Welt **ausblendet**, statt den Spieler
 * wegzuschicken, braucht keine Zeile im Netzwerk (`net/`), keine zweite Szene
 * und keinen zweiten Spielerkörper. Wer stattdessen in eine eigene Szene
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
  /** Das Netz — der Raum hängt es ein und gibt es beim Verlassen nicht frei. */
  readonly object: THREE.Object3D;
  readonly label: string;
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
 * **Wie weit der Boden reicht**, in Kacheln vom Spieler aus.
 *
 * Sieben zu jeder Seite sind fünfzehn mal fünfzehn Kacheln und damit ein
 * Quadrat von 15 m: weit genug, dass der Rand in der Brille am Bildrand liegt
 * und nicht vor den Füßen, und klein genug, dass der Boden nicht so tut, als
 * könnte man darauf spazieren gehen. Weiter draußen bräuchte er ohnehin einen
 * Nebel, und den gibt es hier nicht.
 */
export const FLOOR_TILES = 7;

/** Die dunkle Fuge zwischen zwei Kacheln, in Metern. */
const GROUT = 0.035;

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
 * Deutlich kleiner als die großzügige Vorgabe (`core/usable.USE_RADIUS`, 0,4 m)
 * und mit Absicht: Die Stücke stehen keine 40 cm auseinander (`RACK_GAP`),
 * also griffe man mit der Vorgabe immer nach zweien gleichzeitig, und welches
 * gewinnt, entschiede der Zufall der Reihenfolge.
 */
const PICK_RADIUS = 0.16;

/** Die Zeile am Handgelenk, wenn die Welt keine eigene mitgibt. */
const DEFAULT_TITLE = 'Konstrukt — wähle aus';

/** Wohin ein Stück im Construct gehört, relativ zur Figur (−z ist vorn). */
export interface RackSlot {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * **Die Regalhöhen**, in Metern über dem Boden — **in der Reihenfolge, in der
 * sie gefüllt werden**.
 *
 * Zuerst 1,05 m: Das ist die Höhe, in der eine stehende Hand von selbst
 * hängt, und wer nur drei Stücke zur Auswahl hat, soll dafür weder bücken
 * noch greifen. Dann 1,55 m — auf Augenhöhe sieht man es wenigstens gut. Und
 * zuletzt 0,55 m, denn Bücken ist von allen dreien das Einzige, was in der
 * Brille unangenehm ist.
 */
export const RACK_ROW_HEIGHTS: readonly number[] = [1.05, 1.55, 0.55];

/** Wie weit vorn der erste Bogen liegt, in Metern. */
export const RACK_REACH = 1.15;

/** Und die Grenzen, in denen eine eigene Angabe noch eine Armlänge ist. */
const RACK_REACH_MIN = 0.45;
const RACK_REACH_MAX = 1.3;

/**
 * **Wie weit der Bogen herumgeht**, im Bogenmaß — gut 200°.
 *
 * Nicht 360°: Was hinter der Figur steht, findet sie nicht, weil sie nicht
 * hinsieht; sie könnte sich zwar umdrehen, weiß aber nicht, dass es sich
 * lohnt. Und nicht 90°: Ein schmaler Bogen legt bei zehn Stücken drei
 * Reihen übereinander, und die oberste liegt dann über dem Kopf. 200° sind
 * der Kompromiss — eine Vierteldrehung auf der Stelle nach links oder rechts,
 * und man hat alles gesehen.
 */
export const RACK_ARC = (200 * Math.PI) / 180;

/**
 * **Der kleinste Abstand zweier Nachbarn**, in Metern (Sehne, nicht Winkel).
 *
 * Eine Hand ist gut 10 cm breit, ein Stück darf gut 20 cm breit sein — bei
 * weniger als 34 cm greift man daneben, und der gelbe Saum (`core/highlight.ts`)
 * springt beim kleinsten Kopfdrehen zwischen zweien hin und her.
 */
export const RACK_GAP = 0.34;

/**
 * **Wie viel weiter draußen der zweite Bogen liegt**, in Metern.
 *
 * Genau eine Griffbreite (`RACK_GAP`), und keinen Zentimeter weniger: Zwei
 * Stücke, die hintereinander stehen, sind nur durch diesen Abstand getrennt —
 * wäre er kleiner als der Abstand innerhalb einer Reihe, griffe man von vorn
 * nach hinten daneben statt von links nach rechts. Ein Bogen weiter draußen
 * liegt damit knapp 1,5 m vor der Figur; das ist gestreckt, aber erreichbar,
 * und er kommt ohnehin erst zum Einsatz, wenn der innere voll ist.
 */
export const RACK_RING_STEP = RACK_GAP;

/**
 * **Und es gibt nur zwei Bögen.**
 *
 * Ein dritter läge 1,75 m vor der Figur, und dahin reicht kein Arm mehr, ohne
 * dass man einen Schritt macht — und einen Schritt zu machen ist genau das,
 * was dieser Raum nicht verlangt. Wer mehr Stücke mitbringt, als in zwei Bögen
 * passen, bekommt sie im äußeren enger gesetzt: zu eng ist unschön, außer
 * Reichweite ist kaputt.
 */
const RACK_RINGS = 2;

/**
 * **Wo die Stücke stehen** — reine Rechnung, damit ein Test nachmessen kann,
 * ob wirklich jedes davon in Reichweite einer Figur liegt, die sich nicht von
 * der Stelle bewegt.
 *
 * Gefüllt wird von innen nach außen und von der Mitte nach oben und unten:
 * erst die mittlere Reihe des inneren Bogens (`RACK_ROW_HEIGHTS`), dann die
 * obere, dann die untere, dann dasselbe eine Armlänge weiter draußen. Eine
 * angefangene Reihe steht **mittig** vor der Figur — bei einem einzigen Stück
 * ist das genau geradeaus, und das ist die halbe Miete für einen Raum, in dem
 * man sich nicht umsehen mag.
 *
 * Der äußere Bogen ist um einen halben Schritt versetzt, damit seine Stücke
 * durch die Lücken des inneren zu sehen sind und nicht dahinter verschwinden.
 *
 * @param count wie viele Plätze gebraucht werden; 0 und Unsinn ergeben nichts
 * @returns die Plätze in genau dieser Reihenfolge, relativ zur Figur
 */
export function rackSlots(count: number, options?: { rows?: number; reach?: number }): RackSlot[] {
  const wanted = Number.isFinite(count) ? Math.floor(count) : 0;
  if (wanted <= 0) return [];

  const asked = options?.rows;
  const rows = Math.max(
    1,
    Math.min(RACK_ROW_HEIGHTS.length, Number.isFinite(asked) ? Math.floor(asked!) : 3),
  );
  const wish = options?.reach;
  const reach = Number.isFinite(wish)
    ? Math.max(RACK_REACH_MIN, Math.min(RACK_REACH_MAX, wish!))
    : RACK_REACH;

  const slots: RackSlot[] = [];
  for (let ring = 0; slots.length < wanted; ring++) {
    const last = ring >= RACK_RINGS - 1;
    const radius = reach + Math.min(ring, RACK_RINGS - 1) * RACK_RING_STEP;
    // Der Winkelschritt, bei dem die Sehne zwischen zwei Nachbarn genau
    // `RACK_GAP` ist: weiter draußen passen deshalb mehr Stücke auf denselben
    // Bogen, ohne dass sie sich näher kommen.
    let pitch = 2 * Math.asin(Math.min(1, RACK_GAP / (2 * radius)));
    const shift = ring % 2 === 0 ? 0 : pitch / 2;
    let perRow = Math.max(1, Math.floor((RACK_ARC - 2 * shift) / pitch) + 1);
    if (last) {
      // Der letzte Bogen nimmt alles, was noch übrig ist — enger gesetzt, aber
      // innerhalb derselben 200°. Damit endet diese Schleife immer.
      const need = Math.ceil((wanted - slots.length) / rows);
      if (need > perRow) {
        perRow = need;
        pitch = perRow > 1 ? (RACK_ARC - 2 * shift) / (perRow - 1) : 0;
      }
    }
    for (let row = 0; row < rows && slots.length < wanted; row++) {
      const y = RACK_ROW_HEIGHTS[row]!;
      const here = Math.min(perRow, wanted - slots.length);
      for (let i = 0; i < here; i++) {
        const angle = (i - (here - 1) / 2) * pitch + shift;
        slots.push({ x: Math.sin(angle) * radius, y, z: -Math.cos(angle) * radius });
      }
    }
  }
  return slots;
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

/** Ein Stück samt seinem Platz — so viel, wie der Raum je Bild davon braucht. */
interface RackEntry {
  readonly item: ConstructItem;
  readonly object: THREE.Object3D;
  readonly slot: RackSlot;
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

  /** Die Bühne mit Boden und Stücken — einmal gebaut, bei jedem Betreten versetzt. */
  private stage: THREE.Group | null = null;
  private floor: THREE.Group | null = null;
  private tiles: THREE.InstancedMesh | null = null;
  private grout: THREE.Mesh | null = null;

  /** Ein Druck will hinaus — abgearbeitet wird das im nächsten `update`, siehe `pickedBy`. */
  private wantsLeave = false;

  constructor(host: ConstructHost) {
    this.host = host;
  }

  /** Ob der weiße Raum gerade gilt — beim Zurückblenden schon wieder `false`. */
  get open(): boolean {
    return this.phase === 'in' || this.phase === 'open';
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

    const stage = this.ensureStage();
    // Die Bühne steht im Baum der Welt, also in **deren** Koordinaten: `at`
    // kommt in Weltmaß herein und muss umgerechnet werden, sonst liegt der
    // Boden bei jeder Welt, die ihre Gruppe verschiebt, woanders als die Füße.
    const local = this.host.root.worldToLocal(options.at.clone());
    stage.position.set(local.x, local.y - this.dropBelow(options.anchor, options.at), local.z);
    this.host.root.add(stage);

    const slots = rackSlots(options.items.length);
    this.entries = options.items.map((item, index) => {
      const entry: RackEntry = { item, object: item.object, slot: slots[index]! };
      stage.add(entry.object);
      entry.object.visible = true;
      // Jedes Stück sieht die Figur an: Ein Regal, dessen Stücke alle in
      // dieselbe Weltrichtung zeigen, zeigt der Figur die Hälfte von hinten.
      entry.object.rotation.y = Math.PI - Math.atan2(entry.slot.x, -entry.slot.z);
      this.host.addUsable(entry.object, this.pickedBy(item), { radius: PICK_RADIUS });
      return entry;
    });

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
    for (const entry of this.entries) this.host.removeUsable(entry.object);
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
        for (const entry of this.entries) this.host.removeUsable(entry.object);
        for (const node of this.hidden) node.object.visible = node.visible;
      }
      this.settle();
    }
    this.tiles?.geometry.dispose();
    (this.tiles?.material as THREE.Material | undefined)?.dispose();
    this.grout?.geometry.dispose();
    (this.grout?.material as THREE.Material | undefined)?.dispose();
    this.stage?.removeFromParent();
    this.stage = null;
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

    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i]!;
      // Hinein als Welle, hinaus alle zusammen: Beim Verlassen ist die Welt
      // nach einer halben Sekunde wieder da, und ein Stück, das dann noch
      // versinkt, versinkt im Küchenboden.
      const risen =
        this.phase === 'out'
          ? 1 - clamp01(this.clock / RISE_SECONDS)
          : this.phase === 'open'
            ? 1
            : clamp01((this.clock - i * RISE_STAGGER) / RISE_SECONDS);
      entry.object.position.set(entry.slot.x, entry.slot.y - RISE * (1 - risen), entry.slot.z);
    }
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
    for (const entry of this.entries) entry.object.removeFromParent();
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

  private ensureStage(): THREE.Group {
    if (this.stage) return this.stage;
    const stage = new THREE.Group();
    stage.name = 'construct';
    stage.add(this.buildFloor());
    this.stage = stage;
    return stage;
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
  private buildFloor(): THREE.Group {
    const floor = new THREE.Group();
    floor.name = 'construct-floor';

    const side = FLOOR_TILES * 2 + 1;
    const tile = new THREE.PlaneGeometry(TILE_SIZE - GROUT, TILE_SIZE - GROUT).rotateX(
      -Math.PI / 2,
    );
    const tiles = new THREE.InstancedMesh(
      tile,
      new THREE.MeshBasicMaterial({
        color: 0xf4f6fa,
        transparent: true,
        opacity: 0,
        toneMapped: false,
      }),
      side * side,
    );
    tiles.name = 'construct-tiles';
    const matrix = new THREE.Matrix4();
    for (let z = 0; z < side; z++) {
      for (let x = 0; x < side; x++) {
        matrix.makeTranslation((x - FLOOR_TILES) * TILE_SIZE, 0, (z - FLOOR_TILES) * TILE_SIZE);
        tiles.setMatrixAt(z * side + x, matrix);
      }
    }
    tiles.instanceMatrix.needsUpdate = true;

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

    for (const mesh of [tiles as THREE.Mesh, grout]) {
      // Der Boden ist Kulisse: kein Schatten, kein Strahl. Ein Boden, der
      // Strahlen aufhält, ist der erste, den `A` findet — und dann meint man
      // nie wieder ein Stück (`core/usable.pickUsable`).
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.raycast = () => {};
    }

    floor.add(grout, tiles);
    this.floor = floor;
    this.tiles = tiles;
    this.grout = grout;
    return floor;
  }

  private setFloorOpacity(value: number): void {
    const tiles = this.tiles?.material as THREE.Material | undefined;
    if (tiles) tiles.opacity = value;
    const grout = this.grout?.material as THREE.Material | undefined;
    if (grout) grout.opacity = value;
  }
}
