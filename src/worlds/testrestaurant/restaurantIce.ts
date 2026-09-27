import * as THREE from 'three';
import type { WorldContext } from '../../core/types';
import type { Handedness } from '../../core/XRInput';
import type { Usable, UseSource } from '../../core/usable';
import type { StationOverride } from '../elements/stationLayer';
import {
  EMPTY_ICE,
  coneKey,
  coneUnder,
  counterDeed,
  dropBall,
  dropIntoHand,
  iceInteraction,
  icePrompt,
  pickTub,
  standDeed,
  tubDeed,
  tubUnder,
  useCounter,
  useStand,
  useTub,
  type IceCone,
  type IceDeed,
  type IceHands,
  type IcePart,
  type IceStation,
  type OtherHeld,
} from '../plateup/plateUpIce';
import { IceCorner, type IceCornerPlace } from '../plateup/plateUpIceView';
import type { StationState } from '../plateup/plateUpStations';

/**
 * **Die Eisecke des Restaurants in der Eis-Küche des Test Restaurants** —
 * dieselbe Regel (`plateup/plateUpIce.ts`), dasselbe Bild
 * (`plateUpIceView.IceCorner`), dieselben Handgriffe wie in `PlateUpWorld`:
 * am Schirm ein Druck am Stand gibt Hörnchen samt Portionierer, ein Druck an
 * einer Wanne setzt eine Kugel auf; in der Brille zwei Hände, eintauchen und
 * absetzen ohne Knopf.
 *
 * Die Möbel sind hier Spielelemente (`ice-stand`, `ice-tubs`); die Ecke bringt
 * nur ihre Anker mit und übernimmt Stapel und Portionierer des Elements
 * (`IceCorner.adopt`).
 *
 * **An den Stationen kommt das Eis vor der Küche dran** (`StationOverride`):
 * Wer ein Eis hält, stellt es auf eine freie Arbeitsplatte oder wirft es in
 * den Mülleimer — und nimmt ein abgestelltes wieder.
 */

/** Was die Welt dafür reichen muss. */
export interface IceHost {
  readonly root: THREE.Object3D;
  addUsable(
    anchor: THREE.Object3D,
    usable: Usable,
    options: { radius: number; half: number },
  ): void;
  removeUsable(anchor: THREE.Object3D): void;
  announce(text: string): void;
  /** Was sonst in der Hand liegt — ein Ding der Küche, ein fertiges Essen. */
  other(): OtherHeld;
  /** Anker und Oberkante einer Station — dort steht ein abgestelltes Eis. */
  shelf(id: string): { anchor: THREE.Object3D; top: number } | null;
  /** Ein kurzer Ton: `taken` — etwas kam in die Hand. */
  picked?(taken: boolean): void;
}

const _v = new THREE.Vector3();

export class RestaurantIce implements StationOverride {
  /** Was die Hände vom Eis halten. */
  hands: IceHands = EMPTY_ICE;
  readonly corner: IceCorner;
  /** Die abgestellten Eise, je Station. */
  private shelved = new Map<string, IceCone>();
  private usableKey = '';

  constructor(
    private readonly host: IceHost,
    place: IceCornerPlace,
  ) {
    this.corner = new IceCorner({ ...place, furnish: false });
  }

  /** Die Anker der Ecke aufbauen — die Möbel stehen als Spielelemente. */
  build(): void {
    this.corner.build(this.host.root);
    this.usableKey = '';
  }

  /** Ob die Hände etwas vom Eis halten. */
  holding(): boolean {
    return this.hands.cone !== null || this.hands.scoop !== null;
  }

  // --- An den Stationen ---------------------------------------------------------

  private station(state: StationState): IceStation {
    return {
      kind: state.spot.kind,
      taken: state.on !== null,
      cone: this.shelved.get(state.spot.id) ?? null,
    };
  }

  private deedAt(state: StationState, hand: Handedness | null): IceDeed | null {
    return counterDeed(this.hands, hand, this.station(state), this.host.other());
  }

  key(state: StationState): string {
    const shelf = this.shelved.get(state.spot.id) ?? null;
    return `${coneKey(this.hands.cone)}|${this.hands.scoop?.hand ?? ''}|${coneKey(shelf)}`;
  }

  usable(state: StationState, use: (by: UseSource) => boolean): Usable | null {
    const deed = this.deedAt(state, null);
    if (!deed) return null;
    return {
      use,
      usePrompt: () => {
        const now = this.deedAt(state, null);
        return now ? icePrompt(now) : '';
      },
      interaction: iceInteraction(deed),
    };
  }

  use(state: StationState, by: UseSource): boolean | null {
    const hand = by.hand ?? null;
    const use = useCounter(this.hands, hand, this.station(state), this.host.other());
    if (!use) return null;
    if (use.deed.do === 'refuse') {
      this.host.announce(use.deed.why);
      return false;
    }
    if (use.deed.do === 'nothing') return false;
    this.hands = use.hands;
    const shelf = new Map(this.shelved);
    if (use.deed.do === 'put' && use.cone) shelf.set(state.spot.id, use.cone);
    if (use.deed.do === 'pick') shelf.delete(state.spot.id);
    this.shelved = shelf;
    this.host.picked?.(use.deed.do === 'pick');
    if (use.deed.do === 'trash') this.host.announce('Eis weggeworfen');
    return true;
  }

  // --- Stand und Wannen ---------------------------------------------------------

  /**
   * **Die Anmeldungen der Ecke** — wie im Restaurant
   * (`PlateUpWorld.refreshIceUsables`): am Schirm der ganze Stand und nur die
   * Wanne, auf die der Blick am geradesten zeigt; in der Brille Stapel und
   * Portionierer je für sich und beide Wannen.
   */
  private refresh(ctx: WorldContext): void {
    const xr = ctx.renderer.xr.isPresenting;
    const corner = this.corner;
    let tub = -1;
    if (!xr) {
      const forward = ctx.topDown
        ? _v.set(Math.sin(ctx.avatar.bodyYaw), 0, Math.cos(ctx.avatar.bodyYaw))
        : ctx.camera.getWorldDirection(_v);
      tub = pickTub(ctx.rig.position, forward, corner.tubSpots());
    }
    const ice = this.hands;
    const other = this.host.other();
    const key = [
      xr,
      tub,
      coneKey(ice.cone),
      ice.coneHand ?? '',
      ice.scoop?.hand ?? '',
      ice.scoop?.ball ?? '',
      other.busy,
    ].join(':');
    if (key === this.usableKey) return;
    this.usableKey = key;
    const standUsable = (part: IcePart, deed: IceDeed): Usable => ({
      use: (by) => this.useStand(part, by.hand ?? null),
      usePrompt: () => icePrompt(standDeed(this.hands, part, null, this.host.other())),
      interaction: iceInteraction(deed),
    });
    if (xr) {
      this.host.removeUsable(corner.stand);
      const cones: IceDeed =
        ice.cone && !ice.cone.balls.length ? { do: 'return-cone' } : { do: 'take-cone' };
      const scoop: IceDeed = ice.scoop ? { do: 'return-scoop' } : { do: 'take-scoop' };
      this.host.addUsable(corner.cones, standUsable('cones', cones), { radius: 0.4, half: 0.4 });
      this.host.addUsable(corner.scoop, standUsable('scoop', scoop), { radius: 0.4, half: 0.4 });
    } else {
      this.host.removeUsable(corner.cones);
      this.host.removeUsable(corner.scoop);
      const deed = standDeed(ice, 'stand', null, other);
      this.host.addUsable(corner.stand, standUsable('stand', deed), { radius: 0.5, half: 0.6 });
    }
    corner.tubs.forEach((view, i) => {
      if (!xr && i !== tub) {
        this.host.removeUsable(view.anchor);
        return;
      }
      this.host.addUsable(
        view.anchor,
        {
          use: (by) => this.useTub(i, by.hand ?? null),
          usePrompt: () => icePrompt(tubDeed(this.hands, view.flavor, null)),
          interaction: iceInteraction(tubDeed(ice, view.flavor, null)),
        },
        { radius: 0.4, half: 0.5 },
      );
    });
  }

  private useStand(part: IcePart, hand: Handedness | null): boolean {
    const use = useStand(this.hands, part, hand, this.host.other());
    const deed = use.deed;
    if (deed.do === 'refuse') {
      this.host.announce(deed.why);
      return false;
    }
    if (deed.do === 'nothing') return false;
    this.hands = use.hands;
    this.host.picked?.(deed.do === 'take-cone' || deed.do === 'take-scoop');
    if (deed.do === 'take-cone') {
      this.host.announce(
        this.hands.coneHand
          ? 'Hörnchen in der Hand — mit der anderen Hand den Portionierer nehmen'
          : 'Hörnchen und Portionierer — jetzt an eine der Eiswannen',
      );
    } else if (deed.do === 'take-scoop') {
      this.host.announce('In eine Wanne tauchen, dann über das Hörnchen halten');
    }
    return true;
  }

  private useTub(index: number, hand: Handedness | null): boolean {
    const tub = this.corner.tubs[index];
    if (!tub) return false;
    const use = useTub(this.hands, tub.flavor, hand);
    if (use.deed.do === 'refuse') {
      this.host.announce(use.deed.why);
      return false;
    }
    if (use.deed.do === 'nothing') return false;
    this.hands = use.hands;
    this.host.picked?.(use.deed.do === 'scoop');
    return true;
  }

  /**
   * **Ein Bild vom Eis** — anmelden, in die Hände hängen, auf die Platten
   * stellen, in der Brille eintauchen und absetzen.
   *
   * @returns ob die Figur (von oben) ein Eis vor dem Bauch trägt — dann steht
   *          der Griffpunkt in `carry`
   */
  step(dt: number, ctx: WorldContext, carry: THREE.Vector3): boolean {
    this.refresh(ctx);
    const belly = this.corner.carry(this.hands, ctx, dt, carry);
    this.corner.showShelf(this.shelved, (id) => this.host.shelf(id), dt);
    if (ctx.renderer.xr.isPresenting) this.scoopByHand();
    return belly;
  }

  /** In der Brille: eintauchen und absetzen, ohne einen Knopf zu drücken. */
  private scoopByHand(): void {
    const scoop = this.hands.scoop;
    const tip = this.corner.scoopTip(this.hands, _v);
    if (!scoop || !tip) return;
    if (!scoop.ball) {
      const tub = this.corner.tubs[tubUnder(tip, this.corner.tubBoxes())];
      if (!tub) return;
      this.hands = { ...this.hands, scoop: { ...scoop, ball: tub.flavor } };
      return;
    }
    const tops: THREE.Vector3[] = [];
    const held = this.hands.cone ? this.corner.heldTop(new THREE.Vector3()) : null;
    if (held) tops.push(held);
    const shelf = this.corner.shelfTops();
    for (const entry of shelf) tops.push(entry.top);
    const hit = coneUnder(tip, tops);
    if (hit < 0) return;
    if (held && hit === 0) {
      this.hands = dropIntoHand(this.hands).hands;
      return;
    }
    const id = shelf[hit - (held ? 1 : 0)]?.id;
    const cone = id ? this.shelved.get(id) : undefined;
    const done = cone ? dropBall(cone, scoop) : null;
    if (!id || !done) return;
    this.shelved = new Map(this.shelved).set(id, done.cone);
    this.hands = { ...this.hands, scoop: done.scoop };
  }

  /** Abmelden und abräumen. */
  dispose(): void {
    const corner = this.corner;
    for (const anchor of [
      corner.stand,
      corner.cones,
      corner.scoop,
      ...corner.tubs.map((t) => t.anchor),
    ])
      this.host.removeUsable(anchor);
    corner.dispose();
    this.hands = EMPTY_ICE;
    this.shelved = new Map();
  }
}
