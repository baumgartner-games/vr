import * as THREE from 'three';
import { MirrorSurface } from '../../shared/Mirror';
import { PLAN_WALL_T } from '../../editor/levelPlan';
import { TILE } from '../../nav/navTile';
import { shifted, standing, type PlanSolid } from '../solids';
import { turned } from '../blocks';
import {
  fixtureYaw,
  sound,
  type FixtureBuild,
  type FixtureEvent,
  type FixtureInput,
  type FixtureKind,
  type FixturePlacement,
  type FixtureView,
} from './index';

/**
 * **Der Kleiderschrank** — der Einbau, hinter dem die Umkleide steckt.
 *
 * Er steht an einer Kante wie ein Regal, ist eine Kachel breit, einen halben
 * Meter tief und 2,1 m hoch, und auf einer seiner beiden Türfronten hängt ein
 * **Spiegel**. Wer davorsteht und `A` drückt, meldet `{ type: 'wardrobe' }`,
 * und `GridWorld` macht daraufhin die Umkleide auf (`ui/WardrobeMenu.ts`). Er
 * ist damit der erste Einbau, der nicht die Welt ändert, sondern **den
 * Spieler** — und genau deshalb tut er es über ein Ereignis und nicht selbst:
 * Eine Art, die `saveAppearance` riefe, wäre eine, die man ohne Speicher
 * nicht mehr prüfen kann.
 *
 * **Warum der Spiegel keinen neuen Bau-Kontext braucht.** Der erste Verdacht
 * war, `FixtureBuild` um einen Haken für Spiegel zu erweitern — der
 * Standspiegel (`worlds/portal/standingMirror.ts`) sieht ja so aus, als
 * brauchte er Renderer, Szene und Kamera. Er braucht sie nicht: Eine
 * `MirrorSurface` ist ein gewöhnliches Mesh, und wer ihr ihr Bild malt, sucht
 * sie **im Szenengraphen** (`MirrorRenderer.render` über `collectMirrors`).
 * Der Renderer dazu steht einmal in `App` und läuft über die ganze Szene. Ein
 * Spiegel, der in `ctx.group` hängt, bekommt sein Bild also von selbst — und
 * der Vertrag in `fixtures/index.ts` bleibt so klein, wie sein Kommentar es
 * verspricht („Wer hier einen `WorldContext` durchreichte, hätte Arten, die
 * den Spieler versetzen"). Er kostet nur eines: **Freigeben.** Das Glas hält
 * ein eigenes Material, und erst dessen `dispose` meldet dem Zähler der
 * Spiegel, dass es eines weniger sind — deshalb steht es in `view.dispose`.
 *
 * **Der Korpus steht in `solids`, die Türen im Bild.** Das ist dieselbe
 * Teilung wie bei jedem Einbau, der aufhält: Was Körper hat, gehört in
 * `solids` — dort wird es aus der Palette der Welt gebaut, bekommt Physik und
 * wird von oben durchsichtig, wenn es die Figur verdeckt (`wallGhost.ts`).
 * Die beiden Türfronten dagegen sind das, was man **anfasst**, und sie hängen
 * deshalb in der Gruppe: Was dort hängt, bekommt den gelben Saum
 * (`core/highlight.ts`), und ein Schrank, bei dem der ganze Kasten leuchtet,
 * sagt weniger als einer, bei dem die Türen leuchten.
 */

/** Wie tief er in die Kachel hineinragt, in Metern. */
export const WARDROBE_DEPTH = 0.5;
/** Und wie hoch er ist — Türhöhe plus eine Handbreit Deckel. */
export const WARDROBE_HEIGHT = 2.1;

/** Wangen, Deckel, Rückwand, Türblatt — die Bretterstärken. */
const SIDE = 0.04;
const BACK = 0.03;
const LEAF = 0.035;
/** Der Sockel, auf dem er steht. */
const PLINTH = 0.08;

/** Wie weit er von der Kante wegrückt, damit er nicht in der Wand steckt. */
const CLEAR = PLAN_WALL_T / 2;
/** Die Kante, an der er steht — beim Bauen nach Norden ist das die Nordkante. */
const EDGE = -TILE / 2;
/** Die Vorderkante des Korpus, gemessen von der Kachelmitte. */
const FRONT = EDGE + CLEAR + WARDROBE_DEPTH;

/** Das Glas: Kopf bis Knie, sobald man einen Schritt zurücktritt. */
const GLASS_W = 0.36;
const GLASS_H = 1.5;
/** Auf welcher Höhe seine Mitte sitzt. */
const GLASS_Y = 1.18;

/** Die Griffe: zwei senkrechte Stangen links und rechts des Spalts. */
const GRIP_H = 0.24;
const GRIP_Y = 1.02;

export interface WardrobeState {
  /**
   * Wie oft er aufgemacht wurde.
   *
   * Eine Zahl und kein Schalter, aus demselben Grund wie beim Schild: Zweimal
   * umziehen ist zweimal umziehen. Sie steht hier, damit die Art überhaupt
   * einen Zustand hat, den ein Test lesen kann — sichtbar wird sie nicht.
   */
  opened: number;
}

export const WARDROBE: FixtureKind<WardrobeState> = {
  kind: 'wardrobe',
  label: 'Kleiderschrank',
  accent: 0x9c6b3f,
  // An die Kante wie ein Regal: Ein Schrank mitten auf einer Kachel ist ein
  // Schrank, um den man herumläuft.
  edge: true,
  // Und er kostet die Kachel so viel wie ein Regal (`BLOCKS.shelf`): Er nimmt
  // den halben Meter an der Wand, die andere Hälfte bleibt begehbar.
  cost: 1.3,

  init(): WardrobeState {
    return { opened: 0 };
  },

  /**
   * **Nur `used`, nicht `triggered`.** Beim Schild ist beides gleich — eine
   * Zeile Text darf auch ein Hebel vorlesen. Eine Umkleide dagegen geht dem
   * auf, der davorsteht; ein Hebel am anderen Ende des Raums, der jemandem
   * mitten im Laufen das halbe Bild zuklappt, ist keine Fernbedienung,
   * sondern ein Streich.
   */
  step(state: WardrobeState, _place: FixturePlacement, input: FixtureInput): FixtureEvent[] {
    if (!input.used) return [];
    state.opened++;
    // Der Ton zuerst, die Umkleide danach: Ein Schrank, der sich lautlos
    // öffnet, fühlt sich an wie ein hängendes Bild.
    return [sound('pick'), { type: 'wardrobe' }];
  },

  // Ein Schrank steht. Er ist der einzige Einbau, dessen `solid` nie umschlägt
  // — und deshalb der einzige, dessen Korpus nie neu gebaut wird.
  solid(): boolean {
    return true;
  },

  build(place: FixturePlacement, ctx: FixtureBuild): FixtureView {
    const group = new THREE.Group();
    group.name = `fixture:${place.id}`;
    group.position.set(ctx.at.x, ctx.at.y, ctx.at.z);
    group.rotation.y = fixtureYaw(place.dir);

    const wood = ctx.material('wood');
    const steel = ctx.material('steel');

    // Die beiden Türblätter: zusammen so breit wie der Innenraum, mit einem
    // Fingerbreit Spalt in der Mitte — daran erkennt man, dass es zwei sind.
    const leafW = (TILE - SIDE * 2 - 0.012) / 2;
    const leafH = WARDROBE_HEIGHT - PLINTH - SIDE;
    for (const sign of [-1, 1]) {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(leafW, leafH, LEAF), wood);
      leaf.position.set(sign * (leafW / 2 + 0.006), PLINTH + leafH / 2, FRONT - LEAF / 2);
      group.add(leaf);
    }

    // Die Griffe stehen am Spalt, wo sie auch hingehören, und ein Stück vor
    // dem Blatt: Ein Griff, der auf der Tür klebt, ist eine Leiste.
    for (const sign of [-1, 1]) {
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, GRIP_H, 8), steel);
      grip.position.set(sign * 0.05, GRIP_Y, FRONT + 0.022);
      group.add(grip);
    }

    // **Der Spiegel auf der rechten Tür.** Ein Rahmen aus Messing darunter,
    // damit das Glas nicht wie ein Loch im Holz aussieht, und das Glas selbst
    // zwei Millimeter davor.
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(GLASS_W + 0.05, GLASS_H + 0.05, 0.012),
      steel,
    );
    frame.position.set(leafW / 2 + 0.006, GLASS_Y, FRONT + 0.004);
    group.add(frame);

    const glass = new MirrorSurface(GLASS_W, GLASS_H);
    glass.position.set(leafW / 2 + 0.006, GLASS_Y, FRONT + 0.012);
    group.add(glass);

    ctx.group.add(group);

    return {
      object: group,
      // **So großzügig wie ein Küchenmöbel, und das ist nachgerechnet.**
      //
      // Der Halbmesser ist der Zylinder, den der Strahl treffen muss
      // (`core/usable.pickUsable`) — nicht die Reichweite, die ist überall
      // `USE_REACH`. Ein Küchenmöbel meldet sich ohne eigene Angabe und
      // bekommt dann die **Ausdehnung seines Netzes** (`PortalWorld.addUsable`,
      // `objectRadius`): bei einer Küchenzeile auf einer Kachel gut 0,7 m, bei
      // der Ausgabetheke über zwei Kacheln das Doppelte. Der Schrank steht mit
      // seinem Korpus an der Kante und mit seinen Türen davor, ist also so
      // breit wie eine Kachel und so hoch wie zwei Menschen — nur ist von
      // alledem bloß die Tür in der Gruppe, und 0,7 m maßen genau sie.
      //
      // Wer schräg davor stand, zielte damit daran vorbei und sah nichts
      // leuchten, während jedes Möbel drei Meter weiter schon von der Seite
      // antwortet. Ein Meter ist die halbe Diagonale der Kachel plus eine
      // Handbreit — der Schrank meldet sich jetzt aus derselben Entfernung und
      // unter denselben Winkeln wie alles andere, vor dem man stehen kann.
      //
      // Eine Kugel hält er nicht auf — das tut sein Korpus schon, und zwar als
      // Körper.
      use: { radius: 1, shot: 0, half: 1.1 },
      solids: wardrobeSolids(ctx.at.x, ctx.at.y, ctx.at.z, place),
      // Das Glas hält ein eigenes Material, und erst dessen `dispose` sagt der
      // Spiegel-Zählung, dass es eines weniger sind (`shared/Mirror.ts`). Ohne
      // diese Zeile suchte der Renderer nach jedem Weltwechsel eine Szene
      // länger nach Spiegeln, die es nicht mehr gibt.
      dispose: () => glass.material.dispose(),
    };
  },

  // Er hat keinen Zustand, den man sähe — die Umkleide steht auf dem Schirm
  // und nicht im Schrank.
  apply(): void {},
};

/**
 * **Der Korpus als Quader**, an seinem Platz und in seiner Richtung.
 *
 * Gebaut wird nach Norden und danach gedreht (`blocks.turned`), genau wie bei
 * jedem Baustein: Vier Fälle einzeln sind irgendwann drei richtige und einer,
 * bei dem der Schrank quer in der Wand steht.
 *
 * Steht hier neben der Art und nicht in ihr, damit ein Test ihn ohne three.js
 * nachmessen kann.
 */
export function wardrobeSolids(
  x: number,
  y: number,
  z: number,
  place: FixturePlacement,
): PlanSolid[] {
  const inner = WARDROBE_HEIGHT - PLINTH - SIDE;
  const local: PlanSolid[] = [
    // Sockel und Deckel über die ganze Breite.
    standing('wood', 0, 0, EDGE + CLEAR + WARDROBE_DEPTH / 2, TILE, PLINTH, WARDROBE_DEPTH),
    standing(
      'wood',
      0,
      WARDROBE_HEIGHT - SIDE,
      EDGE + CLEAR + WARDROBE_DEPTH / 2,
      TILE,
      SIDE,
      WARDROBE_DEPTH,
    ),
    // Die Rückwand steht an der Kante — dort, wo die Wand ist.
    standing('wood', 0, PLINTH, EDGE + CLEAR + BACK / 2, TILE, inner, BACK),
  ];
  // Die beiden Wangen.
  for (const sign of [-1, 1]) {
    local.push(
      standing(
        'wood',
        (sign * (TILE - SIDE)) / 2,
        PLINTH,
        EDGE + CLEAR + WARDROBE_DEPTH / 2,
        SIDE,
        inner,
        WARDROBE_DEPTH,
      ),
    );
  }
  return shifted(turned(local, place.dir), x, y, z);
}
