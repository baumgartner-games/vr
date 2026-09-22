import * as THREE from 'three';
import { canLoadModels } from '../../../core/chefFit';
import { TILE } from '../../nav/navTile';
import {
  fixtureYaw,
  propFlag,
  propText,
  sound,
  trigger,
  type FixtureBuild,
  type FixtureEvent,
  type FixtureInput,
  type FixtureKind,
  type FixturePlacement,
  type FixtureView,
} from './index';

/**
 * **Der Hebel** — der Schalter, der *rastet*.
 *
 * Der Unterschied zum Knopf ist kein Aussehen, sondern eine Zusage: Ein Knopf
 * löst aus und kommt zurück, ein Hebel **bleibt liegen**. Man sieht ihm über
 * den halben Platz hinweg an, ob das Licht an ist und ob die Flügeltür offen
 * steht, und genau das ist der Grund, warum es beide gibt. Im Labor steht
 * derselbe Hebel neben der Drehtür; hier ist er zusätzlich der Kippschalter an
 * der Straße, denn ein Kippschalter *ist* ein kleiner Hebel.
 *
 * **Seine Stellung ist der Zustand, nicht das Bild.** `apply` legt den Bügel
 * dorthin, wo `state.on` ihn haben will — wer die Stellung im Bild führte,
 * hätte nach dem ersten Umbau der Welt einen Hebel, der oben steht und eine
 * Tür, die zu ist.
 *
 * **Und sein Bild kommt aus dem Regal** (siehe `LEVER_MODEL`): Sobald die
 * Datei da ist, steht hier ein gezeichneter Bodenhebel und nicht mehr die
 * gerechnete Säule mit ihrem Knauf. Was bleibt, ist die Zusage oben — der
 * Bügel des Modells kippt um dieselben `TILT`, und zwar um sein eigenes,
 * mitgebautes Gelenk unten in der Grundplatte und nicht um seine Mitte.
 */

export interface LeverState {
  /** Umgelegt oder nicht. */
  on: boolean;
}

/** Wie weit der Bügel in beide Richtungen kippt. */
const TILT = 0.55;

/**
 * Wie hoch er steht — klein und rund, damit er von oben ein Punkt und kein
 * Möbel ist.
 *
 * Dieselbe Zahl gilt zweimal, und das ist kein Zufall, sondern der Grund, aus
 * dem ausgerechnet dieses Modell hier steht: Sie ist die Höhe der gerechneten
 * **Säule** — und das Maß, auf das der ganze Hebel aus dem Regal umgerechnet
 * wird (`leverFit`). Wer sie ändert, ändert beide Bilder zugleich, und das
 * ist genau richtig so.
 */
export const COLUMN_H = 0.9;

/**
 * Wie weit der Sockel von der Kante weg in die Kachel hineinrückt.
 *
 * Auf einer Kachel von einem Meter ist eine halbe Armlänge zu viel: Der Sockel
 * stünde mitten darauf, und wer davor steht, stünde in ihm. 0,25 m lassen ihn
 * an der Kante und trotzdem vor dem Türrahmen statt darin.
 */
const STANDOFF = 0.25;

/**
 * **Der Hebel aus dem Regal** — derselbe Weg, den vorher schon die Druckplatte
 * gegangen ist (`fixtures/plate.ts`), und aus demselben Paket.
 *
 * `platformer/red/lever_floor_base_red.glb` ist ein **Bodenhebel**: eine
 * flache Grundplatte mit einer Mulde darin, ein rundes Gelenk in der Mulde,
 * eine Stange daraus nach oben und ein Knauf obenauf. Er ist damit Stück für
 * Stück das, was hier bisher gerechnet stand — nur dass der Zeichner das
 * Gelenk mitgebaut hat, das die gerechnete Form nur andeutete.
 *
 * **Nachgemessen an der Datei**, in Quelleinheiten und mit `Box3`:
 *
 * - das Ganze 0,800 × 1,728 × 1,200 — mit `core/kaykitFit.KAYKIT_SCALE` (0,5,
 *   `platformer` steht auf der Vorgabe) also 0,400 × 0,864 × 0,600 m;
 * - die Grundplatte 0,800 × 0,400 × 1,200, mittig über dem Ursprung und mit
 *   der Unterkante auf null;
 * - der Bügel (`LEVER_MODEL_ARM`) von 0,057 bis 1,729, sein Gelenk ein
 *   achteckiger Zapfen **quer zur X-Achse**, Halbmesser 0,244, Mitte bei 0,300.
 *
 * Zwei Dinge folgen daraus, und beide sind der Grund für die Wahl:
 *
 * - **Die Grundplatte ist in Z länger als in X** (1,200 gegen 0,800), und
 *   genau dorthin fällt der Bügel: Das Gelenk liegt quer zu X, also kippt der
 *   Bügel nach vorn und hinten — dieselbe Achse, um die die gerechnete
 *   Bügelgruppe schon immer gedreht hat.
 * - **0,864 m sind fast die 0,900 m der gerechneten Säule.** Es bleiben vier
 *   Prozent, und die rechnet `leverFit` weg — abgemessen und nicht
 *   abgeschrieben.
 *
 * **Rot, weil der Hebel rot ist** (`accent`, `0xff5a4a`). Die Farbdateien des
 * Pakets unterscheiden sich nur in einer verschobenen Textur-Spalte.
 */
const LEVER_MODEL = 'platformer/red/lever_floor_base_red.glb';

/**
 * **Wie der kippbare Teil in der Datei heißt.**
 *
 * Das ist die Bedingung, unter der dieses Modell hier überhaupt infrage kam:
 * Der Bügel muss ein **eigener** Knoten sein und nicht ein Netz, das die
 * Grundplatte gleich mitbringt. `lever_floor_base_red.glb` hat drei Knoten —
 * die Wurzel `lever_floor_base_red` ohne eigenes Netz, darunter
 * `lever_floor_red` (der Bügel) und ein namenloser Knoten (die Grundplatte).
 *
 * Gesucht wird beim **Namen** und nicht beim Index: Ein `children[0]`, das
 * nach dem nächsten Paket-Update auf die Grundplatte zeigt, wäre ein Hebel,
 * dessen Sockel sich umlegt, während der Bügel steht. Findet sich der Name
 * nicht, bleibt die gerechnete Form stehen — ein normaler Ausgang und kein
 * Fehler.
 *
 * Auf den namenlosen Knoten wird hier **nicht** gezeigt, und auch nicht auf
 * den Namen, den three.js ihm ersatzweise gibt (`lever_floor_base_red_1`, aus
 * dem Netz abgeleitet und durchnummeriert): Ein Name, den erst der Lader
 * erfindet, ist keiner.
 */
const LEVER_MODEL_ARM = 'lever_floor_red';

/**
 * **Von der gemessenen Höhe auf die des Hebels** — der ganze Maßstab, als
 * Rechnung ohne three.js.
 *
 * `height` ist die Höhe, die das fertig skalierte Regalmodell **mitbringt**
 * (`Box3` über die Gruppe, in der der Maßstab des Pakets schon sitzt), heraus
 * kommt der Faktor, der daraus `COLUMN_H` macht. Für diese Datei sind das
 * 0,900 / 0,864 ≈ 1,041 — vier Prozent, und genau deshalb steht hier eine
 * Funktion und keine Zahl: Wer die Datei tauscht oder `COLUMN_H` verstellt,
 * bekommt den neuen Faktor, ohne ihn nachzurechnen.
 *
 * **Gemessen wird das Ganze und nicht ein Teil davon**: Beim Modell steckt
 * der Knauf in derselben Höhe wie die Grundplatte in derselben Datei, und wer
 * nur eines von beidem trifft, verzieht das andere. Die naheliegende
 * Alternative wäre gewesen, den Hebel aus dem Regal so hoch zu machen wie die
 * gerechnete Form **mit** ihrem Bügel (rund 1,50 m) — dabei käme eine
 * Grundplatte von 1,04 m Tiefe heraus, und die ragt über ihre eigene Kachel
 * hinaus (`nav/navTile.TILE`, ein Meter). `COLUMN_H` dagegen trifft der
 * Maßstab des Pakets fast von allein.
 *
 * Eine Höhe von null kann es nur bei einer Datei ohne Netz geben; die bleibt,
 * wie sie ist, statt an einer Division durch null zu verschwinden.
 */
export function leverFit(height: number): number {
  return height > 1e-6 ? COLUMN_H / height : 1;
}

interface LeverView extends FixtureView {
  /** Die gerechnete Bügelgruppe — sie kippt, solange kein Modell da ist. */
  arm: THREE.Group;
  /** Die gerechnete Säule: Rückfallbild **und** Griff, siehe `handle`. */
  column: THREE.Mesh;
  /** Der gerechnete Kopf darauf — er verschwindet mit der Säule. */
  head: THREE.Mesh;
  /**
   * Der Drehpunkt des Regalmodells, sobald er da ist — sonst `null`.
   *
   * Nicht der Knoten aus der Datei selbst, sondern die Zwischengruppe um ihn
   * herum; warum, steht in `fillLever`.
   */
  hinge: THREE.Object3D | null;
  /**
   * **Alle** Materialien der Kopie — sie gehören ihr allein und müssen weg.
   *
   * Die **Geometrie** einer Regalkopie gehört der Vorlage und allen anderen
   * Kopien und wird nie freigegeben (`worlds/shared/environment.ts`,
   * `sharedAssets`); die Materialien dagegen klont `core/kaykitModel.copyOf`
   * je Kopie. Wer sie liegen ließe, sammelte hier besonders schnell: Die
   * Gitterwelt baut ihre Einbauten bei **jeder** Änderung neu.
   */
  modelSkins: THREE.Material[];
  /** Ob der Einbau schon abgeräumt ist, während die Datei noch unterwegs war. */
  gone: boolean;
}

/**
 * **Das Modell holen und die gerechnete Form darunter ausknipsen** — sofort
 * nichts, später vielleicht etwas.
 *
 * Der Einbau wird **synchron** gebaut, das Modell kommt über die Leitung;
 * dazwischen liegt genau diese Funktion. Bis die Datei da ist — und in einem
 * Checkout ohne die gekauften Pakete für immer — steht die gerechnete Säule
 * mit ihrem Knauf da und kippt wie eh und je. **Die bleibt deshalb stehen**
 * und wird nicht gelöscht: Ein Hebel ist ein Schalter, den man sehen muss, um
 * ihn zu finden, und ein unsichtbarer Schalter vor einer Tür ist schlimmer als
 * ein hässlicher. Nebeneinander stehen die beiden nie — kommt das Modell,
 * geht die gerechnete Form aus.
 *
 * **Ohne WebGL passiert gar nichts** (`core/chefFit.canLoadModels`): In Jest
 * zieht `GLTFLoader` samt `import.meta` den ganzen Lauf mit herein, und was
 * `lever.test.ts` prüft — umlegen, auslösen, liegen bleiben —, braucht kein
 * Netz.
 *
 * **Gemessen wird, solange das Modell frei hängt.** Erst danach kommt es in
 * die Gruppe des Einbaus, und die ist nach `place.dir` gedreht
 * (`fixtureYaw`): Eine Vierteldrehung später wäre „tief" nicht mehr Z, sondern
 * X, und die ganze Ausrichtung ginge in die Irre. Das ist der Unterschied zur
 * Platte, die rund ist und der es deshalb gleich war.
 */
function fillLever(view: LeverView, group: THREE.Group, edge: number): void {
  if (!canLoadModels()) return;
  void import('../../../core/kaykitModel').then(async (module) => {
    const model = await module.kaykitModel(LEVER_MODEL);
    if (!model) return;
    // Weg ist der Einbau, weil jemand inzwischen umgebaut hat: Dann hängt das
    // Modell an einer Gruppe, die niemand mehr ansieht. Und ein Modell ohne
    // eigenen Bügel wäre ein Hebel, der sich nicht umlegen lässt — dann bleibt
    // die gerechnete Form stehen (siehe `LEVER_MODEL_ARM`). Beide Male ist die
    // Kopie schon gebaut, und ihre **Materialien** gehören ihr allein: Sie
    // gehen hier weg und nicht erst, wenn niemand mehr weiß, dass es sie gab.
    const arm = model.getObjectByName(LEVER_MODEL_ARM);
    const stem = arm?.parent ?? null;
    if (view.gone || !arm || !stem) {
      for (const skin of skinsOf(model)) skin.dispose();
      return;
    }

    // **Erst messen, dann strecken.** Auf der Gruppe sitzt schon der Maßstab
    // des Pakets (`core/kaykitFit.kaykitScale`); was hier dazukommt, ist der
    // Rest bis `COLUMN_H`. Multipliziert und nicht gesetzt: Die Vorgabe des
    // Pakets bleibt damit die Grundlage, und ein Paket, das eines Tages anders
    // eingemessen wird, zieht diesen Hebel mit.
    model.updateMatrixWorld(true);
    const rough = new THREE.Box3().setFromObject(model);
    model.scale.multiplyScalar(leverFit(rough.max.y - rough.min.y));
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const limb = new THREE.Box3().setFromObject(arm);

    // **Der Drehpunkt sitzt am Fuß des Bügels und nicht in seiner Mitte.**
    // Der Knoten aus der Datei hat seinen Ursprung genau auf halber Höhe
    // (0,8925 von 1,729) — würde man ihn selbst drehen, führe das Gelenk unten
    // in die eine und der Knauf oben in die andere Richtung, und die Stange
    // scherte seitlich aus der Mulde. Er bekommt deshalb eine eigene
    // Zwischengruppe, die im Gelenk steht; gedreht wird die.
    //
    // Und **seine Ruhelage bleibt ihm**: Position wie Drehung des Knotens
    // gehen unverändert mit in die Gruppe (die Position um genau den Betrag
    // versetzt, um den die Gruppe vorrückt). Eine Drehung, die das nächste
    // Paket dem Bügel mitgibt, überlebt das hier — anders als ein
    // `rotation.x = …` auf dem Knoten selbst, das sie überschriebe.
    //
    // Wo das Gelenk liegt, ist gemessen: Der Bügel endet unten in einem runden
    // Zapfen, und ein runder Zapfen liegt so weit über dem tiefsten Punkt des
    // Bügels, wie er dick ist — quer zur Kipprichtung (Z) gemessen, denn dort
    // ist der Bügel an genau dieser Stelle am breitesten (0,487 gegen 0,474 am
    // Knauf). Das Ergebnis, 0,300 Quelleinheiten, steht nirgends im Quelltext.
    const unit = stem.getWorldScale(new THREE.Vector3()).y || 1;
    const hinge = new THREE.Group();
    hinge.name = 'hebel:gelenk';
    hinge.position.set(
      arm.position.x,
      (limb.min.y + (limb.max.z - limb.min.z) / 2) / unit,
      arm.position.z,
    );
    arm.position.sub(hinge.position);
    stem.add(hinge);
    hinge.add(arm);

    // **Die Ausrichtung** — gebaut wird nach Norden, gedreht wird danach
    // (`fixtureYaw`). Die Grundplatte liegt mittig über dem Ursprung des
    // Modells und mit ihrer Unterkante auf null; beides wird hier trotzdem
    // nachgemessen statt geglaubt.
    //
    // Nach Norden geschoben wird, so weit **zwei** Schranken es zulassen: Die
    // Grundplatte geht höchstens bis an die Kachelkante — ein Sockel, der
    // darüber hinausragte, stünde auf der Kachel des Nachbarn und vor einer
    // Tür im Türrahmen. Und näher als `STANDOFF` kommt sie ihr nie, dem Maß,
    // das die gerechnete Säule von jeher vor dem Rahmen hielt. Bei dieser
    // Datei hält die erste Schranke (die Platte ist 0,62 m tief; bei
    // `STANDOFF` bliebe ein Streifen jenseits der Kante), bei einem
    // schmaleren Sockel die zweite. Beide zusammen sind dieselbe Zusage wie
    // bisher: nahe der Kante, aber auf der eigenen Kachel.
    model.position.set(
      -(box.min.x + box.max.x) / 2,
      -box.min.y,
      Math.max(-TILE / 2 - box.min.z, edge),
    );
    group.add(model);
    view.hinge = hinge;
    for (const skin of skinsOf(model)) view.modelSkins.push(skin);

    // Der Griff rückt unter den Sockel des Modells — er ist ab jetzt nur noch
    // ein Ziel und kein Bild (siehe `handle`), und ein Ziel, das einen halben
    // Fuß neben dem steht, worauf man zeigt, ist ein schlechtes.
    view.column.position.z = model.position.z + (box.min.z + box.max.z) / 2;

    // Erst jetzt, und nicht vorher: eine Kachel, auf der weder das eine noch
    // das andere steht, wäre ein Hebel, den es kurz nicht gibt.
    view.column.visible = false;
    view.head.visible = false;
    view.arm.visible = false;
  });
}

/**
 * Die Materialien unter einem Knoten, jedes einmal.
 *
 * Dieselben zehn Zeilen stehen in `fixtures/plate.ts`, und sie bleiben
 * doppelt: Ein Einbau soll seine Kopie allein aufräumen können, ohne dass
 * dafür ein gemeinsames Modul zwischen den Arten entsteht, das am Ende jeder
 * anfasst.
 */
function skinsOf(root: THREE.Object3D): THREE.Material[] {
  const out = new Set<THREE.Material>();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (const skin of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      out.add(skin);
    }
  });
  return [...out];
}

export const LEVER: FixtureKind<LeverState> = {
  kind: 'lever',
  label: 'Hebel',
  accent: 0xff5a4a,
  // An eine Kante: Ein Kippschalter gehört an eine Wand, und ein Hebel vor
  // eine Tür — beides ist eine Kante und keine Kachelmitte.
  edge: true,

  init(place: FixturePlacement): LeverState {
    return { on: propFlag(place.props, 'on', false) };
  },

  solid(): boolean {
    return false;
  },

  step(state: LeverState, place: FixturePlacement, input: FixtureInput): FixtureEvent[] {
    if (!input.used && !input.triggered) return [];
    state.on = !state.on;
    const out: FixtureEvent[] = [sound(state.on ? 'switch-on' : 'switch-off')];
    const target = propText(place.props, 'target');
    if (target) out.push(trigger(target));
    return out;
  },

  build(place: FixturePlacement, ctx: FixtureBuild): FixtureView {
    const group = new THREE.Group();
    group.name = `fixture:${place.id}`;
    group.position.set(ctx.at.x, ctx.at.y, ctx.at.z);
    group.rotation.y = fixtureYaw(place.dir);

    // Gebaut nach Norden, wie jeder Einbau: Der Sockel steht nahe der Kante,
    // der Bügel kippt in den Raum davor. Ein Viertelmeter Abstand zur Kante,
    // und nicht weniger — vor einer Tür ist die Kante der Türrahmen, und ein
    // Hebel, der darin klemmt, sieht aus wie ein Fehler.
    const edge = -TILE / 2 + STANDOFF;
    const steel = ctx.material('steel');

    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.17, COLUMN_H, 16), steel);
    column.position.set(0, COLUMN_H / 2, edge);
    group.add(column);

    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.14, 18), steel);
    head.position.set(0, COLUMN_H + 0.07, edge);
    group.add(head);

    // Der Bügel hängt in einer eigenen Gruppe über dem Kopf: Kippen ist dann
    // eine Drehung und keine Rechnerei mit Sinus je Bild.
    const arm = new THREE.Group();
    arm.position.set(0, COLUMN_H + 0.1, edge);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.42, 10), steel);
    bar.position.y = 0.21;
    arm.add(bar);
    // Ein beleuchtetes Material und kein leuchtendes: Den schwarzen Umriss
    // (`core/outlineShell.ts`) bekommt nur, was Licht annimmt, und ohne ihn ist
    // der Knauf von oben ein roter Fleck auf grauem Grund.
    const paint = new THREE.MeshStandardMaterial({ color: 0xff5a4a, roughness: 0.4 });
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), paint);
    knob.position.y = 0.42;
    arm.add(knob);
    group.add(arm);

    ctx.group.add(group);

    const view: LeverView = {
      object: group,
      arm,
      column,
      head,
      hinge: null,
      modelSkins: [],
      gone: false,
      // **Angefasst wird der Sockel und nicht der Knauf.** Der Knauf wandert
      // beim Umlegen zwanzig Zentimeter durch die Gegend, und ein Ziel, das
      // sich mit seinem eigenen Zustand verschiebt, ist eines, das man nach dem
      // ersten Umlegen nicht mehr erwischt. Der Sockel steht.
      //
      // Und es bleibt die **gerechnete** Säule, auch wenn gleich das Modell
      // darüberkommt und sie ausgeknipst wird: Die Welt meldet den Griff genau
      // einmal an, nämlich direkt nach `build` (`GridWorld.attachUsable`), und
      // meldet ihn beim Umbau unter demselben Knoten wieder ab. Ein `handle`,
      // das später auf den Sockel des Modells umspränge, wäre eine Anmeldung
      // auf dem einen und eine Abmeldung auf dem anderen Ding — ein Hebel, der
      // nach dem Umbau weiterhin Türen öffnet. Ein unsichtbarer, schlanker
      // Zylinder an derselben Stelle ist das kleinere Übel, und er kostet
      // nichts: Gezeigt und getroffen wird über Abstände und nicht über
      // Strahlen (`core/usable.ts`), unsichtbar stört also nicht.
      handle: column,
      // Großzügig zu bedienen, knapp zu treffen: Der Sockel steht am Rand der
      // Kachel, und wer mitten darauf steht, soll ihn erreichen.
      use: { radius: 0.7, shot: 0.25, half: 0.8 },
      dispose: () => {
        view.gone = true;
        paint.dispose();
        // Die Geometrie der Regalkopie bleibt liegen (sie gehört der Vorlage),
        // ihre Materialien nicht — siehe `modelSkins`.
        for (const skin of view.modelSkins) skin.dispose();
        view.modelSkins.length = 0;
      },
    };
    fillLever(view, group, edge);
    return view;
  },

  apply(view: FixtureView, state: LeverState): void {
    // **Eines von beiden kippt**, nie beides: Solange das Modell nicht da ist,
    // dreht sich die gerechnete Bügelgruppe, danach das Gelenk des Modells —
    // um denselben Winkel und um dieselbe Achse, denn `TILT` ist die Stellung,
    // die man sieht, und die hängt nicht daran, woher das Bild kommt.
    const one = view as LeverView;
    (one.hinge ?? one.arm).rotation.x = state.on ? TILT : -TILT;
  },
};
