import * as THREE from 'three';
import type { Handedness } from '../../core/XRInput';
import type { Usable, UseSource } from '../../core/usable';
import type { StationSpot } from '../plateup/plateUpPlan';
import {
  DEFAULT_BURN,
  burnShare,
  freshStations,
  stationDeed,
  stationProgress,
  tickStation,
  useStation,
  type StationState,
} from '../plateup/plateUpStations';
import { DIR_S } from '../nav/navTile';
import type { KitchenGauges } from '../test/zones/kitchenGauge';
import {
  ITEM_LABELS,
  kitchenInteractionSpec,
  kitchenPrompt,
  type StationKind,
} from '../test/zones/kitchenCarry';
import type { Dish, KitchenItem } from '../test/zones/kitchenRecipes';
import type { GameElement } from './elementCatalog';
import { spotElement, spotGives, type ElementSpot } from './elementPlace';
import { dishKey } from './dishView';
import type { PlacedElement } from './elementView';

/**
 * **Die Küche auf Spielelementen** — was `A` an einem hingestellten Element
 * tut, damit es jede Welt kann und nicht nur der Burgerladen.
 *
 * Die Regel ist die des Restaurants (`plateup/plateUpStations.ts`, dahinter
 * `test/zones/kitchenCarry.kitchenDeed`) und wird hier nicht neu erfunden:
 * Aus jedem Element mit Zweck werden eine oder zwei Stationen
 * (`elementStations`), deren Stand `useStation` und `tickStation` fortschreiben.
 * Diese Datei ist die Hälfte, die der Burgerladen in `PlateUpWorld` selbst
 * trägt — anmelden, ticken, das Liegende zeigen, Balken —, einmal als Klasse,
 * damit die nächste Welt sie nicht ein drittes Mal abschreibt. Der Burgerladen
 * selbst bleibt, wie er ist.
 */

/** **Wie weit eine Wanne neben der Mitte der Vorderkante liegt**, in Metern. */
export const TUB_SHIFT = 0.25;

/**
 * **Wie nah man an einer Station stehen muss**, damit an ihr gearbeitet wird —
 * die Füße höchstens so weit vom Anker, wie im Restaurant
 * (`PlateUpWorld.NEAR_STATION`).
 */
export const NEAR_STATION = 1.3;

/** Eine Station eines Elements: die Stelle der Regel und wo ihr Anker sitzt. */
export interface StationSlot {
  readonly spot: StationSpot;
  /**
   * Wie weit der Anker längs der Vorderkante neben ihrer Mitte sitzt, in
   * Metern — im Maß des Elements, das nach Süden schaut (x Osten, wie
   * `ElementPart.at`). Die Eiswannen tragen zwei Stationen nebeneinander.
   */
  readonly shift: number;
}

/**
 * **Welche Stationsart ein Element ist** — `null` für eines ohne Zweck
 * (Tisch, Stuhl, Band) und für den Eisstand, den die Eisecke regelt
 * (`plateup/plateUpIce.ts`).
 *
 * Zwei Übersetzungen, sonst gilt die Art des Elements: Ein Brett, auf dem
 * ausgerollt wird, ist für die Regel das Nudelholz (`roller`), und die
 * Eiswannen sind zwei Wannen (`tub`).
 */
export function stationKind(element: GameElement): StationKind | null {
  switch (element.kind) {
    case null:
    case 'ice-stand':
      return null;
    case 'ice-tubs':
      return 'tub';
    case 'board':
      return element.work === 'roll' ? 'roller' : 'board';
    default:
      return element.kind;
  }
}

/** Ob ein Name ein Ding der Küche ist. */
function kitchenItem(name: string | null): KitchenItem | undefined {
  if (name === null) return undefined;
  if (!(name in ITEM_LABELS)) throw new Error(`Kein Ding der Küche: ${name}`);
  return name as KitchenItem;
}

/**
 * **Die Stationen eines Elements** — keine, eine, oder bei den Eiswannen zwei:
 * links (von vorn gesehen, `-TUB_SHIFT`) Vanille, rechts Erdbeere, so wie sie
 * das Element zeigt.
 *
 * Stapel werden nie leer (`stock: Infinity`): Hier gibt es keine Spüle, und
 * Schüsseln, Kartons und Teller gehen nicht zurück.
 */
export function elementStations(spot: ElementSpot): StationSlot[] {
  const element = spotElement(spot);
  const kind = stationKind(element);
  if (!kind) return [];
  const label = spot.label ?? element.label;
  const base = { x: spot.x, z: spot.z, label, model: '', face: DIR_S } as const;
  if (element.kind === 'ice-tubs') {
    const tub = (flavor: 'vanilla' | 'strawberry', shift: number): StationSlot => {
      const gives: KitchenItem = `ice-${flavor}`;
      return {
        spot: { ...base, id: `${spot.id}:${flavor}`, kind, gives, label: ITEM_LABELS[gives] },
        shift,
      };
    };
    return [tub('vanilla', -TUB_SHIFT), tub('strawberry', TUB_SHIFT)];
  }
  const gives = kitchenItem(spotGives(spot));
  return [
    {
      spot: {
        ...base,
        id: spot.id,
        kind,
        ...(gives ? { gives } : {}),
        ...(kind === 'drain' ? { stock: Infinity } : {}),
      },
      shift: 0,
    },
  ];
}

/**
 * **Was vor der Küche drankommt** — das Eis: Wer ein Hörnchen hält, stellt es
 * auf eine Platte oder wirft es in den Müll, statt dass die Küche gefragt
 * wird (`PlateUpWorld.useStationAt` fragt genauso zuerst das Eis).
 */
export interface StationOverride {
  /** Was sich am Anmelden ändert — ändert sich der Schlüssel, wird neu angemeldet. */
  key(state: StationState): string;
  /** Die Anmeldung stattdessen — `null`: Die Küche meldet an. */
  usable(state: StationState, use: (by: UseSource) => boolean): Usable | null;
  /** Ein Druck: `true`/`false` ist erledigt, `null` heißt: Sache der Küche. */
  use(state: StationState, by: UseSource): boolean | null;
}

/** **Was eine Welt reichen muss**, damit ihre Elemente Küche sind. */
export interface StationHost {
  addUsable(
    anchor: THREE.Object3D,
    usable: Usable,
    options: { radius: number; half: number },
  ): void;
  removeUsable(anchor: THREE.Object3D): void;
  /** Eine Zeile unten im Bild — die Ablehnungen der Regel. */
  announce(text: string): void;
  /** Was die Küche in der Hand hat, und in welcher. */
  held(): Dish | null;
  heldHand(): Handedness | null;
  setHeld(dish: Dish | null, hand: Handedness | null): void;
  /**
   * **Ob die Hände mit etwas voll sind, das kein Ding der Küche ist** — dann
   * der Satz dazu, sonst `null`. Das fertige Essen aus einer Vorratsbox etwa:
   * Wer es trägt, legt es nicht auf ein Schneidebrett.
   */
  busy(): string | null;
  /** Das Bild eines Gerichts (`dishView.KaykitDishView.view`). */
  dishView(dish: Dish): THREE.Object3D;
  /** Ein kurzer Ton — `taken`: etwas kam in die Hand. */
  picked?(taken: boolean): void;
}

/** Wie die Station gerade gebaut ist. */
interface StationView {
  readonly spot: StationSpot;
  /** An der Vorderkante: Daran hängt die Anmeldung, dort steht man. */
  readonly anchor: THREE.Group;
  /**
   * **Die Mitte der Platte**, auf dem Boden — ein Kind des Ankers, so tief
   * dahinter, wie das Element halb tief ist (+z zeigt aus dem Element
   * heraus). Darauf liegt, was auf der Station liegt.
   */
  readonly surface: THREE.Group;
  readonly top: number;
  content: THREE.Object3D | null;
  shown: string;
  deedKey: string;
}

const _v = new THREE.Vector3();
const _w = new THREE.Vector3();

/**
 * **Die Stationen einer Welt** — ihr Stand, ihre Anmeldungen, ihr Bild.
 *
 * Jedes Bild einmal `step`: Die Uhren laufen (`tickStation`, braten auch
 * ohne jemanden davor, schneiden nur mit), das Liegende wird neu gezeigt,
 * wenn es sich geändert hat, Balken stehen über dem, was arbeitet oder
 * verbrennt, und angemeldet wird neu, sobald sich die Tat ändert.
 */
export class StationLayer {
  private stations: StationState[] = [];
  private readonly views: StationView[] = [];
  private lastHand: Handedness | null = null;

  /**
   * @param burn wie lange Gebratenes liegen darf — Tag 1 des Restaurants
   *             (`plateUpStations.DEFAULT_BURN`)
   */
  constructor(
    private readonly host: StationHost,
    private readonly gauges: KitchenGauges | null = null,
    private readonly before: StationOverride | null = null,
    private readonly burn = DEFAULT_BURN,
  ) {}

  /** Der Stand aller Stationen, in der Reihenfolge, in der sie dazukamen. */
  get states(): readonly StationState[] {
    return this.stations;
  }

  /**
   * **Ein hingestelltes Element zur Küche machen** — keine, eine oder zwei
   * Stationen (`elementStations`). Ihr Anker hängt am Anker des Elements, an
   * der Mitte seiner Vorderkante.
   *
   * @returns wie viele Stationen es wurden
   */
  add(placed: PlacedElement): number {
    const slots = elementStations(placed.spot);
    const [, depth] = placed.element.tiles;
    for (const slot of slots) {
      const anchor = new THREE.Group();
      anchor.name = `station:${slot.spot.id}`;
      anchor.position.x = slot.shift;
      placed.anchor.add(anchor);
      const surface = new THREE.Group();
      surface.name = `station-surface:${slot.spot.id}`;
      surface.position.z = -depth / 2;
      anchor.add(surface);
      this.views.push({
        spot: slot.spot,
        anchor,
        surface,
        top: placed.top,
        content: null,
        shown: '',
        deedKey: '',
      });
      this.stations.push(...freshStations([slot.spot]));
    }
    return slots.length;
  }

  /**
   * **Die Mitte der Platte einer Station und ihre Oberkante** — für das, was
   * die Welt selbst darauf zeigt (das abgestellte Eis,
   * `plateUpIceView.IceCorner.showShelf`).
   */
  place(id: string): { anchor: THREE.Object3D; top: number } | null {
    const view = this.views.find((one) => one.spot.id === id);
    return view ? { anchor: view.surface, top: view.top } : null;
  }

  /** Den Anker einer Station an seiner Stelle der Welt — für den Abstand der Füße. */
  private where(view: StationView): THREE.Vector3 {
    return view.anchor.getWorldPosition(_v);
  }

  /** **Ein Druck an einer Station.** */
  use(index: number, by: UseSource): boolean {
    const state = this.stations[index];
    if (!state) return false;
    const first = this.before?.use(state, by) ?? null;
    if (first !== null) return first;
    const busy = this.host.busy();
    if (busy) {
      this.host.announce(busy);
      return false;
    }
    const held = this.host.held();
    const result = useStation(held, state);
    const deed = result.deed;
    if (deed.do === 'nothing') return false;
    if (deed.do === 'refuse') {
      this.host.announce(deed.why);
      return false;
    }
    if (by.hand) this.lastHand = by.hand;
    const tookHand = !held && result.held;
    this.host.picked?.(!!result.held && deed.do !== 'scrape');
    this.stations = this.stations.map((s, i) => (i === index ? result.station : s));
    this.host.setHeld(result.held, tookHand ? (by.hand ?? null) : this.host.heldHand());
    return true;
  }

  /**
   * **Ein Bild weiter** — Uhren, Bilder, Balken, Anmeldungen.
   *
   * @param feet wo die Figur steht: Geschnitten wird nur, wer davorsteht
   */
  step(dt: number, feet: { readonly x: number; readonly z: number }): void {
    const free = !this.host.held() && !this.host.busy();
    let toHand: Dish | null = null;
    let changed = false;
    const next = this.stations.map((state, i) => {
      const view = this.views[i]!;
      const at = this.where(view);
      const near = Math.hypot(feet.x - at.x, feet.z - at.z) < NEAR_STATION;
      const tick = tickStation(state, dt, near, free && !toHand, this.burn);
      if (tick.station !== state) changed = true;
      if (tick.toHand) toHand = tick.toHand;
      if (tick.burnt && tick.station.on) {
        this.host.announce(`${ITEM_LABELS[tick.station.on.item]} — ab in den Mülleimer!`);
      }
      return tick.station;
    });
    if (changed) this.stations = next;
    if (toHand) this.host.setHeld(toHand, this.lastHand);
    this.views.forEach((view, i) => this.show(view, this.stations[i]!));
    this.refresh();
  }

  /** Das Liegende zeigen, und darüber den Balken. */
  private show(view: StationView, state: StationState): void {
    const key = state.on ? dishKey(state.on) : '';
    if (key !== view.shown) {
      view.shown = key;
      view.content?.removeFromParent();
      view.content = null;
      if (state.on) {
        const shown = this.host.dishView(state.on);
        shown.position.set(0, view.top, 0);
        view.surface.add(shown);
        view.content = shown;
      }
    }
    const gauges = this.gauges;
    if (!gauges) return;
    const id = `station:${view.spot.id}`;
    const part = stationProgress(state);
    const heat = burnShare(state, this.burn);
    const at = view.surface.localToWorld(_v.set(0, view.top + 0.35, 0));
    const hot = view.spot.kind === 'griddle' || view.spot.kind === 'pot';
    if (part > 0) gauges.bar(id, at, part, hot ? 'cook' : 'chop');
    else if (heat > 0) gauges.bar(id, at, heat, 'burn');
    else gauges.clear(id);
    if (hot) {
      const base = view.surface.localToWorld(_w.set(0, view.top, 0));
      gauges.flame(`flame:${view.spot.id}`, state.work.working ? base : null);
      gauges.warn(`warn:${view.spot.id}`, heat > 0.5 ? base : null);
    }
  }

  /** **Anmelden, was `A` gerade meint** — nur neu, wenn sich die Tat geändert hat. */
  private refresh(): void {
    const held = this.host.held();
    const busy = this.host.busy();
    this.views.forEach((view, index) => {
      const state = this.stations[index]!;
      const deed = stationDeed(held, state);
      const extra = this.before?.key(state) ?? '';
      const key = `${deed.do}:${held ? dishKey(held) : ''}:${state.on ? dishKey(state.on) : ''}:${busy ?? ''}:${extra}`;
      if (key === view.deedKey) return;
      view.deedKey = key;
      const use = (by: UseSource): boolean => this.use(index, by);
      const first = this.before?.usable(state, use) ?? null;
      if (first) {
        this.host.addUsable(view.anchor, first, { radius: 0.5, half: 0.6 });
        return;
      }
      if (busy) {
        this.host.addUsable(
          view.anchor,
          { use, usePrompt: () => this.host.busy() ?? '', interaction: { kind: 'press' } },
          { radius: 0.5, half: 0.6 },
        );
        return;
      }
      if (deed.do === 'nothing') {
        this.host.removeUsable(view.anchor);
        return;
      }
      this.host.addUsable(
        view.anchor,
        {
          use,
          usePrompt: () =>
            kitchenPrompt(stationDeed(this.host.held(), this.stations[index]!), view.spot.label),
          interaction: kitchenInteractionSpec(deed),
        },
        { radius: 0.5, half: 0.6 },
      );
    });
  }

  /** **Alles leer** — was lag, liegt nicht mehr, die Uhren stehen. */
  reset(): void {
    this.stations = freshStations(this.stations.map((state) => state.spot));
  }

  /** Abmelden und abräumen — die Anker gehen mit ihren Elementen. */
  dispose(): void {
    for (const view of this.views) {
      this.host.removeUsable(view.anchor);
      view.content?.removeFromParent();
      this.gauges?.clear(`station:${view.spot.id}`);
      this.gauges?.clear(`flame:${view.spot.id}`);
      this.gauges?.clear(`warn:${view.spot.id}`);
    }
    this.views.length = 0;
    this.stations = [];
  }
}
