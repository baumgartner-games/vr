import * as THREE from 'three';
import type { GridPlan } from '../../grid/gridPlan';
import { DIR_E, DIR_N, DIR_S } from '../../nav/navTile';
import { HAZARD_SPIKES } from '../../nav/navProfile';
import { buildRedButton, BUTTON_DOME_R, type RedButton } from '../../shared/redButton';
import { TextPlane } from '../../../ui/TextPlane';
import { canLoadModels } from '../../../core/chefFit';
import type { WorldContext } from '../../../core/types';
import { NAVIGATION, centre } from '../layout';
import type { TestZone, ZoneHost } from './zone';
import { SeatingCorner } from './seating';
import { StaticDecor } from '../../shared/staticDecor';
import type { Npc } from '../../npc/Npc';

/**
 * **Die Navigation** — Westen, und das Wenigste vom alten Navigationslabor.
 *
 * Vier Sachen, an denen man der Wegsuche beim Denken zusieht, und mehr braucht
 * es nicht: ein **enger Gang** mit einer Kiste darin, eine **Tür** an seinem
 * Ende, ein **Stachelfeld** und ein **roter Knopf**, der einen NPC von A nach B
 * schickt. Das Labor hatte acht Buchten davon; sie beantworteten dieselbe Frage
 * achtmal, und wer sie alle gesehen hatte, hatte eine Stunde gebraucht.
 *
 * **Der Gang ist ein Umweg und keine Engstelle.** Man kommt auch nördlich und
 * südlich an ihm vorbei, und das ist Absicht: Er zeigt, dass eine Kiste eine
 * Kachel **teuer** macht und nicht **zu** (`grid/blocks.ts`) — ein NPC nimmt
 * ihn, wenn er der kürzeste Weg ist, und geht außen herum, sobald etwas darin
 * steht. Eine Sackgasse hinter einer geschlossenen Tür zeigte dagegen nur, dass
 * eine Wegsuche aufgibt.
 *
 * **Das Stachelfeld ist eine Kachelnotiz und kein Objekt** (`TileFacts.hazard`,
 * `nav/`): Es steht im Graphen, also weiß ein NPC davon, bevor er hineinläuft.
 * Was man sieht, sind neun Bodenfallen aus dem KayKit-Regal — eine je Kachel,
 * hingestellt von dieser Zone, gerechnet vom Graphen. Die beiden wissen
 * nichts voneinander, und das ist die Stelle, an der man aufpassen muss: Wer
 * die Fallen verschöbe und die Kachelnotiz stehen ließe, hätte eine Gefahr,
 * die man nicht sieht, und daneben Stacheln, die nichts kosten. Deshalb
 * rechnet ein Test die neun Plätze gegen das Rechteck nach
 * (`spikeSpots`, `navigation.test.ts`).
 */

/** Der enge Gang: eine Kachelreihe, von Westen nach Osten. */
export const LANE = { x: NAVIGATION.x + 4, z: 0, length: 7 } as const;
/** Die Kachel, auf der die Kiste im Weg steht. */
export const LANE_CRATE = { x: LANE.x + 2, z: LANE.z } as const;
/** Seine östlichste Kachel — dort hängt die Tür. */
export const LANE_EAST = LANE.x + LANE.length - 1;
/** Die Tür am Ostende des Gangs. */
export const LANE_DOOR = 'tuer-gang';

/** Das Stachelfeld: drei mal drei Kacheln im Nordosten der Zone. */
export const SPIKES = { x: NAVIGATION.x + 12, z: NAVIGATION.z, w: 3, d: 3 } as const;

/**
 * **Die neun Kachelmitten des Stachelfelds** — reine Rechnung, ohne ein einziges
 * Netz darin.
 *
 * Eine eigene, exportierte Funktion und keine Schleife mitten im Bauen, damit
 * ein Test sie nachrechnen kann, ohne eine Welt aufzubauen — derselbe Schnitt
 * wie bei den Scheiben des Schießstands (`zones/range.targetSpot`). Denn wo
 * die Fallen stehen, entscheidet nicht das Modell, sondern das Kachelgitter
 * (`layout.centre`): Ein Bild, das eine halbe Kachel neben den Kacheln liegt,
 * die die Gefahr tragen, ist im Standbild nicht zu erkennen und im Spiel
 * sofort — man läuft durch Stacheln, die nichts kosten, und stolpert daneben
 * über nichts.
 *
 * Zeilenweise von Norden nach Süden, wie das Feld gestempelt wird
 * (`fitNavigation`, `plan.floor`). Dem Bild ist die Reihenfolge gleich; dem
 * Test ist sie bequem.
 */
export function spikeSpots(): { x: number; z: number }[] {
  const spots: { x: number; z: number }[] = [];
  for (let dz = 0; dz < SPIKES.d; dz++) {
    for (let dx = 0; dx < SPIKES.w; dx++) {
      spots.push({ x: centre(SPIKES.x + dx), z: centre(SPIKES.z + dz) });
    }
  }
  return spots;
}

/** Wo der NPC losgeht und wo er hinsoll. */
export const POINT_A = { x: NAVIGATION.x + 14, z: 2 } as const;
export const POINT_B = { x: NAVIGATION.x + 1, z: 0 } as const;

/** Und wo der rote Knopf steht, der ihn losschickt. */
export const BUTTON_TILE = { x: NAVIGATION.x + 14, z: 0 } as const;

export function stampNavigation(plan: GridPlan): void {
  // **Der enge Gang**: eine Kachel breit, zugemauert nach Norden und Süden.
  plan.run(LANE.x, LANE.z, LANE.length, 'x', (x, z) => {
    plan.wall(x, z, DIR_N);
    plan.wall(x, z, DIR_S);
  });
}

/**
 * **Die Einbauten dieser Zone** — und nur sie.
 *
 * Getrennt vom Rest, weil `TestWorld.planLoaded` sie **nach** einem
 * gespeicherten Umbau noch einmal aufsetzt: Ein Einbau hat eine **Kennung**,
 * und `putFixture` ersetzt nach Kennung — es entsteht also kein zweiter
 * daneben. Wände und Bausteine haben keine, und wer eine Wand wegbaut, hat sie
 * weggebaut.
 */
export function fitNavigation(plan: GridPlan): void {
  // Die Tür am Ostende des Gangs. Sie steht im Graphen als Türkante und nicht
  // als Loch in einer Wand — erst damit kann sich eine Meinung über sie irren
  // (`nav/navBelief.ts`).
  plan.door(LANE_EAST, LANE.z, DIR_E, 0, false);
  plan.putFixture({
    id: LANE_DOOR,
    kind: 'door',
    x: LANE_EAST,
    z: LANE.z,
    dir: DIR_E,
    props: { mode: 'swing' },
  });

  /**
   * **Das Stachelfeld.** `hazard` ist eine Eigenschaft der Kachel und kein
   * Objekt darüber: Es steht im Graphen, also weiß ein NPC davon, bevor er
   * hineinläuft.
   *
   * Und für einen **Menschen** sind Stacheln unpassierbar
   * (`HUMAN_PROFILE.hazard[HAZARD_SPIKES] = Infinity`) — er plant nicht
   * hindurch, sondern herum. Ein Zombie kennt keine Gefahr und läuft mitten
   * hinein; das ist der Unterschied, den man hier in einem Durchgang sieht.
   */
  plan.floor({ ...SPIKES }, { hazard: HAZARD_SPIKES });

  plan.putFixture({
    id: 'schild-navigation',
    kind: 'sign',
    x: NAVIGATION.x + 8,
    z: NAVIGATION.z,
    dir: DIR_N,
    props: { text: 'Roter Knopf schickt einen NPC quer durch die Zone zum Ziel' },
  });
  plan.wall(NAVIGATION.x + 8, NAVIGATION.z, DIR_N);

  // Und ein Schild am Gang, damit man weiß, was die Kiste darin soll.
  plan.putFixture({
    id: 'schild-gang',
    kind: 'sign',
    x: LANE.x,
    z: LANE.z - 1,
    dir: DIR_S,
    props: { text: 'Enger Gang: die Kiste macht die Kachel teuer, nicht zu' },
  });
}

// --- was Leben hat ----------------------------------------------------------

/** Kantenlänge der Kiste im Gang. */
const CRATE_SIZE = 0.62;
/** Wie hoch der Zielmast steht. */
const MARK_HEIGHT = 1.8;
/**
 * **Und woher sein Bild kommt** — dieselbe Datei wie unter jedem anderen
 * Schild dieser Welt (`core/kaykitHeight.ts`).
 */
const MARK_MODEL = 'dungeon/post.glb';

/**
 * **Die Bodenfalle aus dem Regal** — neun Kopien, eine je Kachel.
 *
 * Hier lag bis dahin ein flacher rotbrauner Quader mit neun Kegeln darauf.
 * Er war Zierde und wollte nie mehr sein — und für genau diese Zierde hat das
 * KayKit-Regal ein fertiges Stück: die Stachelfalle des _Platformer_-Pakets.
 * Es ist derselbe Tausch wie bei der Druckplatte (`grid/fixtures/plate.ts`),
 * und dort steht die lange Fassung der Begründung.
 *
 * **Warum die rote Falle und nicht `platformer/neutral/floor_spikes_2x2x1.glb`**,
 * die daneben liegt und von oben dasselbe zeigt: Die neutrale ist **ein**
 * Netz, 2,000 × 1,000 × 2,000 Quelleinheiten — halbiert
 * (`core/kaykitFit.KAYKIT_SCALE`) ein Klotz von 1,0 × 0,5 × 1,0 m, dem man von
 * außen nicht ansieht, wo die Platte aufhört und die Stacheln anfangen. Die
 * rote hat **zwei Knoten**, und das ist kein Schönheitsunterschied, sondern
 * die Bedingung dafür, dass sie sich überhaupt einlassen lässt: Man kann die
 * Stacheln abhängen und nachmessen, wie hoch die Platte allein steht (siehe
 * `plateTop`). Ohne diese Naht bliebe nur eine geschätzte Eintauchtiefe, und
 * geschätzte Tiefen stehen irgendwann eine Handbreit daneben.
 *
 * **Und sie passt ohne Umrechnung.** 2,000 × 1,500 × 2,000 → 1,0 × 0,75 × 1,0 m:
 * Die Grundfläche ist genau **eine Kachel** (`nav/navTile.TILE`), neun Kopien
 * decken das Feld also lückenlos ab. Die `4x4x1` aus demselben Ordner wäre
 * 2 × 2 m und ließe auf drei mal drei Kacheln einen Streifen frei.
 *
 * **Rot, weil rot dasselbe sagt** wie der rotbraune Fleck, der hier lag: Für
 * einen Menschen ist dieses Feld unpassierbar (`HUMAN_PROFILE`), und das soll
 * man ihm ansehen, bevor man hineinläuft. Dieselbe Datei gibt es in Blau,
 * Grün und Gelb; hier gewinnt die Warnfarbe.
 */
const SPIKES_MODEL = 'platformer/red/floor_spikes_trap_2x2x1_red.glb';

/**
 * **Wie die Stacheln in der Datei heißen** — der Knoten, der über die Platte
 * hinausragt.
 *
 * Gesucht wird beim **Namen** und nicht beim Index, aus demselben Grund wie
 * bei der Druckplatte (`grid/fixtures/plate.ts`, `PLATE_MODEL_CAP`): Ein
 * `children[0]`, das nach dem nächsten Paket-Update auf die Platte zeigt,
 * wäre ein Feld, das einen Viertelmeter zu tief oder zu hoch steht. Findet
 * sich der Name nicht, bleibt die gebaute Zierde stehen — ein normaler
 * Ausgang und kein Fehler.
 */
const SPIKES_MODEL_TIPS = 'floor_spikes_trap_spikes_2x2x1_red';

/**
 * **Wie weit die Platte über dem Boden bleibt** — fünf Millimeter, und die
 * sind kein Geschmack.
 *
 * Eingelassen heißt eingelassen: Die **Oberseite** der Platte gehört auf die
 * Höhe des Bodens, und was darüber zu sehen ist, sind die Stacheln. Ein Klotz
 * von 0,75 m mitten auf dem Weg wäre falsch — hier laufen ein NPC und ein
 * Spieler **hindurch**, das Feld hält niemanden auf, es kostet nur
 * (`TileFacts.hazard`).
 *
 * Genau auf `y = 0` läge die Oberseite allerdings in derselben Ebene wie der
 * Boden der Welt, und zwei Flächen, die sich eine Ebene teilen, flimmern
 * gegeneinander, sobald die Kamera weit genug weg ist. Der gebaute Fleck hielt
 * aus demselben Grund zwei Millimeter Abstand; fünf sind aus jedem Blickwinkel
 * genug und von oben nicht als Absatz zu erkennen.
 */
const SPIKES_LIFT = 0.005;

/**
 * **Der Knopf, die Kiste, der Zielmast und der NPC.**
 *
 * Der Knopf ist derselbe, der im alten Labor und in den Alpen stand
 * (`worlds/shared/redButton.ts`): Säule, Kragen, Kuppel, Schild. Er meldet
 * sich als **benutzbar** an, also drückt `A` ihn in jeder Ansicht — und weil
 * er auch am Zeiger hängt, geht es in der Brille genauso mit dem Strahl.
 */
export class NavigationZone implements TestZone {
  private button: RedButton | null = null;
  private mark: TextPlane | null = null;
  private host: ZoneHost | null = null;
  private pointerObject: THREE.Object3D | null = null;
  private ctx: WorldContext | null = null;
  private readonly owned: THREE.Material[] = [];
  private readonly shapes: THREE.BufferGeometry[] = [];
  /**
   * Der gebaute Stachelfleck — er hängt nur so lange im Bild, bis die Modelle
   * da sind (`fillSpikes`). Seine Geometrie und seine Farben liegen in
   * `shapes` und `owned` und werden auch dann freigegeben, wenn er längst
   * abgehängt ist.
   */
  private readonly builtSpikes: THREE.Object3D[] = [];
  /**
   * Ob die Zone schon abgeräumt ist, während die Dateien noch unterwegs waren.
   * Ohne diese Frage hinge das Feld gleich an einer Gruppe, die niemand mehr
   * ansieht — samt neun Sätzen Materialien, die nie wieder jemand freigibt.
   */
  private gone = false;
  /** Der zuletzt losgeschickte Läufer — der nächste Druck räumt nur ihn weg. */
  private runner: Npc | null = null;
  /** Die Sitzecke am Südrand — Besucher, die Plätze aufsuchen (`seating.ts`). */
  readonly seating = new SeatingCorner();
  /**
   * Die neun Fallen als Bündel (`shared/staticDecor.ts`): dieselbe Datei
   * neunmal, zwei Netze je Falle — 18 Zeichenaufrufe je Durchgang, jetzt 2.
   */
  private decor: StaticDecor | null = null;

  build(ctx: WorldContext, world: ZoneHost): void {
    this.host = world;
    this.ctx = ctx;
    this.seating.build(ctx, world);

    this.buildCrate(world);
    this.buildSpikes(world);
    this.buildMark(world);
    this.buildButton(ctx, world);
  }

  update(dt: number, ctx?: WorldContext): void {
    this.button?.update(dt);
    this.seating.update(dt, ctx);
    this.decor?.step(dt);
  }

  /** `B`/`Y` räumt die Zone leer: Wer noch unterwegs ist, ist es nicht mehr. */
  reset(): void {
    this.runner = null;
    this.seating.reset();
    this.host?.clearNpcs();
  }

  dispose(): void {
    this.gone = true;
    this.seating.dispose();
    this.decor?.dispose();
    this.decor = null;
    this.builtSpikes.length = 0;
    if (this.ctx && this.pointerObject) this.ctx.pointer.remove(this.pointerObject);
    if (this.button) this.host?.removeUsable(this.button.dome);
    this.button?.dispose();
    this.button = null;
    this.mark?.dispose();
    this.mark = null;
    for (const material of this.owned) material.dispose();
    this.owned.length = 0;
    for (const shape of this.shapes) shape.dispose();
    this.shapes.length = 0;
    this.host = null;
    this.ctx = null;
    this.pointerObject = null;
  }

  // --- die Stücke -----------------------------------------------------------

  /** Die Kiste im Gang — ein Gegenstand, also schiebbar und zurücksetzbar. */
  private buildCrate(world: ZoneHost): void {
    const skin = this.own(new THREE.MeshStandardMaterial({ color: 0x9a6b3c, roughness: 0.9 }));
    const shape = this.shape(new THREE.BoxGeometry(CRATE_SIZE, CRATE_SIZE, CRATE_SIZE));
    const crate = new THREE.Mesh(shape, skin);
    crate.name = 'nav-kiste';
    crate.position.set(centre(LANE_CRATE.x), CRATE_SIZE / 2 + 0.02, centre(LANE_CRATE.z));
    world.root.add(crate);
    crate.updateWorldMatrix(true, false);
    world.addProp(
      world.physics.addDynamic(crate, {
        shape: { kind: 'box' },
        halfExtents: new THREE.Vector3(CRATE_SIZE / 2, CRATE_SIZE / 2, CRATE_SIZE / 2),
        mass: 14,
        friction: 0.9,
        restitution: 0.02,
      }),
      'nav-kiste',
    );
  }

  /**
   * Das Feld, das man sieht, während der Graph die Zahl kennt.
   *
   * Ohne Körper, und das ist der ganze Punkt: Die Stacheln halten niemanden
   * auf — sie **kosten**, und was sie kosten, steht in der Kachel
   * (`TileFacts.hazard`). Ein NPC läuft mitten hindurch, wenn ihm die Gefahr
   * gleich ist, und ein Mensch plant außen herum.
   *
   * Gebaut wird zuerst der alte rotbraune Fleck mit seinen neun Kegeln, und
   * er bleibt genau so lange stehen, bis die Modelle da sind (`fillSpikes`).
   * In einem Checkout ohne die gekauften Pakete — und in Jest, wo gar nichts
   * geladen wird — bleibt er für immer, und das ist die ehrlichere von beiden
   * Möglichkeiten: Eine leere Kachelfläche wäre eine Gefahr, die der Graph
   * kennt und der Spieler nicht, und die sucht hinterher niemand in einer
   * Zeichenroutine. Ein Teppich, der nach Stacheln aussieht, ist schlechter
   * als ein Modell und unendlich viel besser als nichts.
   */
  private buildSpikes(world: ZoneHost): void {
    const skin = this.own(
      new THREE.MeshStandardMaterial({ color: 0x8c3a2c, roughness: 0.95, metalness: 0 }),
    );
    const shape = this.shape(new THREE.BoxGeometry(SPIKES.w, 0.04, SPIKES.d));
    const patch = new THREE.Mesh(shape, skin);
    patch.name = 'nav-stacheln';
    patch.position.set(SPIKES.x + SPIKES.w / 2, 0.022, SPIKES.z + SPIKES.d / 2);
    world.root.add(patch);
    this.builtSpikes.push(patch);

    // Ein paar Spitzen darauf, damit es von oben nach Stacheln aussieht und
    // nicht nach einem Teppich.
    const spike = this.own(new THREE.MeshStandardMaterial({ color: 0xc8cdd8, roughness: 0.4 }));
    const cone = this.shape(new THREE.ConeGeometry(0.06, 0.22, 8));
    for (const spot of spikeSpots()) {
      const tip = new THREE.Mesh(cone, spike);
      tip.position.set(spot.x, 0.15, spot.z);
      world.root.add(tip);
      this.builtSpikes.push(tip);
    }

    this.fillSpikes(world);
  }

  /**
   * **Die neun Fallen holen, einmessen und den gebauten Fleck abhängen** —
   * sofort nichts, später vielleicht etwas.
   *
   * Die Zone wird **synchron** gebaut, die Modelle kommen über die Leitung;
   * dazwischen liegt genau diese Methode, und sie ist bis in die Reihenfolge
   * dieselbe wie bei der Druckplatte (`grid/fixtures/plate.ts`, `fillPlate`).
   *
   * **Ohne WebGL passiert gar nichts** (`core/chefFit.canLoadModels`): In Jest
   * zöge `GLTFLoader` samt `import.meta` den ganzen Lauf mit herein, und was
   * an dieser Zone geprüft wird — welche Kachel welche Gefahr trägt, wo die
   * neun Plätze liegen —, braucht kein Netz.
   *
   * **Neunmal gefragt, einmal geladen**: `kaykitModel` merkt sich die Vorlage
   * je Adresse und gibt neun Kopien zurück, die sich **eine** Geometrie teilen
   * (`core/kaykitModel.ts`). Die gehört deshalb der Vorlage und wird nie
   * freigegeben (`userData.sharedAssets`); die **Materialien** klont jede
   * Kopie für sich und sie gehen in `owned`, damit `dispose` sie findet.
   */
  private fillSpikes(world: ZoneHost): void {
    if (!canLoadModels()) return;
    void import('../../../core/kaykitModel').then(async (module) => {
      const spots = spikeSpots();
      const copies = await Promise.all(spots.map(() => module.kaykitModel(SPIKES_MODEL)));
      const models = copies.filter((copy): copy is THREE.Object3D => copy !== null);
      // Gemessen wird an der ersten Kopie — alle neun sind dieselbe Datei, und
      // eine zweite Messung wäre dieselbe Zahl.
      const top = models.length === spots.length ? plateTop(models[0], SPIKES_MODEL_TIPS) : null;
      // Drei Wege hierher, und alle drei sind normal: Es wurde abgeräumt,
      // während die Dateien unterwegs waren; eine davon kam nicht an; oder die
      // Stacheln heißen inzwischen anders (siehe `SPIKES_MODEL_TIPS`). Jedes
      // Mal sind die Kopien schon gebaut, und ihre Materialien gehören ihnen
      // allein: Sie gehen hier weg und nicht erst, wenn niemand mehr weiß,
      // dass es sie gab.
      if (this.gone || top === null) {
        for (const model of models) for (const skin of skinsOf(model)) skin.dispose();
        return;
      }
      // **Eine Gruppe für alle neun**, und die Einbettung sitzt auf ihr: Die
      // Kopien stehen auf ihren Kachelmitten und wissen nichts davon, wie tief
      // sie im Boden stecken — das entscheidet die eine gemessene Zahl, einmal
      // für das ganze Feld.
      const field = new THREE.Group();
      field.name = 'nav-stacheln';
      field.position.y = SPIKES_LIFT - top;
      spots.forEach((spot, index) => {
        const model = models[index];
        model.position.set(spot.x, 0, spot.z);
        field.add(model);
        for (const skin of skinsOf(model)) this.owned.push(skin);
      });
      world.root.add(field);
      this.decor = new StaticDecor(field);
      for (const model of models) this.decor.add(model);
      // Erst jetzt, und nicht vorher: Ein Fleck, der verschwindet, bevor die
      // Fallen hängen, ist für ein paar Bilder ein Gefahrenfeld aus nichts.
      // Freigegeben wird hier nichts — Quader, Kegel und ihre beiden Farben
      // stehen in `shapes` und `owned` und gehen mit der Zone.
      for (const piece of this.builtSpikes) piece.removeFromParent();
      this.builtSpikes.length = 0;
    });
  }

  /**
   * **Den Zielmast aus dem Regal nachliefern.**
   *
   * Dieselben zwei Schranken wie beim Stachelfeld (`fillSpikes`, dort steht
   * die lange Fassung): `canLoadModels` hält den Lader aus einem Lauf ohne
   * WebGL heraus, und `import()` ist dynamisch, damit Jest den `GLTFLoader`
   * samt `import.meta` gar nicht erst mitzieht. Kommt nichts an, bleibt der
   * gerechnete Mast stehen — er trägt die Tafel, und eine Tafel ohne Mast
   * wäre schlechter als ein Mast aus einem Quader.
   *
   * Die **Materialien** der Kopie gehören ihr allein und gehen in `owned`;
   * ihre **Geometrie** gehört der Vorlage und allen anderen Pfosten
   * (`core/kaykitModel.copyOf`, `userData.sharedAssets`) und darf gerade
   * **nicht** in `shapes`.
   */
  private fillMark(world: ZoneHost, post: THREE.Mesh): void {
    if (!canLoadModels()) return;
    void import('../../../core/kaykitHeight').then(async (module) => {
      const stand = await module.kaykitAtHeight(MARK_MODEL, MARK_HEIGHT);
      if (!stand) return;
      if (this.gone) {
        for (const skin of skinsOf(stand)) skin.dispose();
        return;
      }
      // Der Helfer legt den Fuß auf den Ursprung seiner Gruppe — hingestellt
      // wird sie auf den Boden und nicht auf halbe Höhe gerechnet.
      stand.position.set(centre(POINT_B.x), 0, centre(POINT_B.z));
      world.root.add(stand);
      for (const skin of skinsOf(stand)) this.owned.push(skin);
      post.visible = false;
    });
  }

  /**
   * Der Zielmast am Ende: ein Mast und eine Tafel, die die Kamera ansieht.
   *
   * **Der Mast kommt aus dem Regal** — derselbe `dungeon/post.glb`, der auch
   * unter dem Schild der Gitterwelt, unter der tragbaren Tafel und unter den
   * Entfernungsmarken des Schießstands steht (`core/kaykitHeight.ts`, dort
   * steht die Begründung fürs Messen statt Abschreiben). Vier Stäbe mit
   * derselben Aufgabe aus vier Geometrien wären vier Antworten auf eine
   * Frage.
   *
   * Der gerechnete Quader bleibt stehen, bis das Modell da ist, und wird
   * **dann** ausgeblendet — dieselbe Zusage wie beim Stachelfeld darüber.
   */
  private buildMark(world: ZoneHost): void {
    const steel = this.own(new THREE.MeshStandardMaterial({ color: 0x9aa6bd, roughness: 0.5 }));
    const post = new THREE.Mesh(this.shape(new THREE.BoxGeometry(0.09, MARK_HEIGHT, 0.09)), steel);
    post.position.set(centre(POINT_B.x), MARK_HEIGHT / 2, centre(POINT_B.z));
    world.root.add(post);
    this.fillMark(world, post);

    const plate = new TextPlane({
      width: 1.3,
      height: 0.5,
      title: 'Ziel',
      body: 'Hierher läuft er',
      accent: 0x5ee0a0,
      // Sie stand fest nach Osten — also zu dem hin, der aus der Zone kommt,
      // und quer zu jedem, der von oben zusieht. Jetzt sieht sie die Kamera an
      // (`ui/billboard.ts`), aus welcher auch immer gerade gezeichnet wird.
      face: true,
    });
    plate.position.set(centre(POINT_B.x), MARK_HEIGHT, centre(POINT_B.z));
    world.root.add(plate);
    this.mark = plate;
  }

  /** Und der Knopf, der ihn losschickt. */
  private buildButton(ctx: WorldContext, world: ZoneHost): void {
    const button = buildRedButton({
      title: 'NPC losschicken',
      body: 'Von hier bis zum Zielmast im Westen',
    });
    button.group.position.set(centre(BUTTON_TILE.x), 0, centre(BUTTON_TILE.z));
    // Gedreht steht die Säule so, wie man auf sie zukommt; das Schild darüber
    // sieht ohnehin die Kamera an (`ui/billboard.ts`).
    button.group.rotation.y = Math.PI;
    world.root.add(button.group);
    this.button = button;

    world.addUsable(
      button.dome,
      {
        use: () => this.send(),
        usePrompt: () => 'NPC losschicken',
      },
      { radius: 0.5, shot: BUTTON_DOME_R, half: 0.3 },
    );
    ctx.pointer.add({ object: button.dome, onSelect: () => this.send() });
    this.pointerObject = button.dome;
  }

  /**
   * Einen losschicken — und vorher den letzten wegräumen.
   *
   * Sonst stehen nach dem fünften Druck fünf davon am Ziel und schieben sich
   * gegenseitig vom Mast.
   */
  private send(): boolean {
    const world = this.host;
    if (!world) return false;
    this.button?.press();
    // Nur der letzte Läufer geht — die Besucher der Sitzecke bleiben sitzen.
    if (this.runner) world.npcRoutineHost()?.remove(this.runner);
    this.runner = null;
    const from = new THREE.Vector3(centre(POINT_A.x), 0, centre(POINT_A.z));
    const to = new THREE.Vector3(centre(POINT_B.x), 0, centre(POINT_B.z));
    this.runner = world.sendNpc(from, to);
    if (!this.runner) return false;
    world.notify('Unterwegs zum Ziel');
    return true;
  }

  private own<T extends THREE.Material>(material: T): T {
    this.owned.push(material);
    return material;
  }

  private shape<T extends THREE.BufferGeometry>(geometry: T): T {
    this.shapes.push(geometry);
    return geometry;
  }
}

/**
 * **Wie hoch die Platte einer Falle allein steht**, in Metern — gemessen am
 * geladenen Modell, oder `null`, wenn die Stacheln nicht zu finden sind.
 *
 * Dieselbe Regel wie bei der Druckplatte (`grid/fixtures/plate.ts`): Die Zahl
 * gehört der Datei und nicht dem Kommentar. Nachgemessen ist sie heute 0,50 m
 * — wer sie aber hierhin schriebe, hätte nach dem nächsten Paket-Update ein
 * Feld, das im Boden versunken ist oder als Absatz darauf steht, und niemand
 * rechnet so etwas nach. Der Maßstab des Pakets sitzt schon auf der
 * zurückgegebenen Gruppe (`core/kaykitFit.kaykitScale`), die Antwort ist
 * deshalb ohne jede Umrechnung in Metern.
 *
 * Gemessen wird, indem die Stacheln kurz **abgehängt** werden. `Box3` kennt
 * nur ganze Bäume, und der ganze Baum ist hier 0,75 m hoch: Die Spitzen ragen
 * 25 cm über die Platte hinaus, und genau das sollen sie ja tun — an der
 * Gesamthöhe abgelesen stünde das Feld einen Viertelmeter zu tief. Danach
 * hängen sie wieder, wo sie waren.
 */
function plateTop(model: THREE.Object3D, tips: string): number | null {
  const spikes = model.getObjectByName(tips);
  if (!spikes) return null;
  const parent = spikes.parent;
  spikes.removeFromParent();
  const box = new THREE.Box3().setFromObject(model);
  parent?.add(spikes);
  return box.isEmpty() ? null : box.max.y;
}

/**
 * Die Materialien unter einem Knoten, jedes einmal.
 *
 * Abgeschrieben aus `grid/fixtures/plate.ts` und nicht geteilt: Es sind acht
 * Zeilen, und eine gemeinsame Datei dafür kostete mehr Gemeinsamkeit zwischen
 * einer Gitterwelt und einer Testzone, als sie wert ist — dieselbe Abwägung
 * wie zwischen den drei Modell-Ladern (`core/kaykitModel.ts`).
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
