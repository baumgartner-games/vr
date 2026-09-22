import * as THREE from 'three';
import { canLoadModels } from '../../core/chefFit';
import { GROUND_TOP, markBackdrop } from './environment';
import { PLATE_SIZE } from './plateField';

/**
 * **Ein Bündel echter Platten** — eine Datei aus dem KayKit-Regal, viele
 * Kacheln, **ein** Zeichenaufruf.
 *
 * Draußen lag einmal nur eine **Textur auf einem Kasten** (`environment.ts`,
 * `createGround`): ein gekacheltes Schachbrett auf einer `BoxGeometry` von
 * tausend Metern Kantenlänge. Das ist billig und sieht von oben gut aus — aus
 * der Brille heraus ist es aber unübersehbar ein Anstrich: Ein Boden ohne
 * Dicke hat keine Fugen, keine Kanten und kein Licht auf einer Kante, und
 * genau daran erkennt man ihn.
 *
 * Hier liegen stattdessen **richtige Platten** darauf. Die Datei baut das
 * Bündel und sonst nichts; **wo** die Platten liegen, hat der Aufrufer schon
 * ausgerechnet (`plateField.ts`, ohne three.js und deshalb geprüft). Sie ist
 * deshalb zweimal im Einsatz und nicht zweimal geschrieben:
 *
 * - Die **Schürze** um das Gelände (`worlds/test/TestWorld.ts`), eine Platte
 *   je Kachel, 48 m weit — `plateField.plateSpots`.
 * - Der **gebaute Boden** der Gitterwelt selbst (`grid/GridWorld.ts`), eine
 *   Platte auf jeder Bodenkachel, und dort auch einmal aus Stein —
 *   `plateField.floorPlateSpots`.
 *
 * Drei Bedingungen entscheiden über die Bauart, und sie stehen alle drei
 * gegeneinander:
 *
 * - **Es muss ein Bündel sein.** Zehntausende einzelne Netze wären
 *   zehntausende Zeichenaufrufe je Bild — der Fehler, den dieses Projekt für
 *   die Bodenkacheln des Grundrisses schon einmal gemacht und aufgeschrieben
 *   hat (`worlds/grid/gridBatch.ts`: „tausend gleiche Kästen in **einem**
 *   Aufruf"). Also **ein** `InstancedMesh` je Datei: eine Geometrie, ein
 *   Material, ein Aufruf.
 * - **Ein Ton und keine zwei.** Hier standen einmal zwei Bündel, hell und
 *   dunkel im Wechsel, und ein `PLATE_DARK`, das den Ton herunterzog. Beides
 *   ist weg: „das dunklere brauche ich nicht, da die alle einen weißen rand
 *   haben, das reicht." Die Platte bringt ihr Raster selbst mit — ihre Fase
 *   (`plateField.PLATE_SEAM`) **ist** das Gitter, und ein Schachbrett darüber
 *   war ein zweites Raster auf demselben Boden.
 * - **Und die Kollision bleibt beim gebauten Körper.** Die Platten sind reine
 *   Zierde und bekommen **keine** Körper: draußen trägt sie der texturierte
 *   Kasten (`GROUND_TOP`, `GROUND_THICKNESS`), drinnen der Quader aus dem
 *   Grundriss, der unter ihnen unsichtbar wird.
 *
 * **Ohne WebGL passiert gar nichts** (`core/chefFit.canLoadModels`), und das
 * ist ein normaler Ausgang und kein Fehler: In Jest gibt es weder `import.meta`
 * noch einen `GLTFLoader`, und dann bleibt es beim texturierten Boden und beim
 * gebauten Quader — genauso wie in einem Checkout ohne die gekauften Pakete.
 */

/**
 * **Wie weit die Oberkante der Schürzenplatten über dem Boden draußen liegt**,
 * in Metern.
 *
 * Zwei Zentimeter, und die Zahl steht zwischen zwei Fehlern:
 *
 * **Zu hoch, und man stolpert.** Den Collider trägt weiter der texturierte
 * Kasten, und seine Oberseite liegt auf `GROUND_TOP` (−0,05 m). Wer die
 * Platten darauflegte, bekäme einen Boden, auf dem man **daneben** steht: Die
 * Platte ist 0,125 m dick, und jede Figur schwebte eine Handbreit über dem,
 * worauf sie zu stehen scheint. Die Platten liegen deshalb **im** Boden und
 * nicht darauf — man steckt zwei Zentimeter in ihnen, und zwei Zentimeter sind
 * genau die Haut der Spielerkapsel (`physics/PhysicsLocomotion.CHARACTER_SKIN`),
 * also der kleinste Abstand, den diese Maschine ohnehin für nichts hält.
 *
 * **Zu tief, und es flimmert.** Genau auf `GROUND_TOP` lägen Platte und Kasten
 * in **derselben** Ebene, und zwei Flächen auf derselben Höhe streiten sich um
 * jedes Pixel — derselbe Grund, aus dem der Kasten überhaupt eine Handbreit
 * unter der Null liegt (`environment.GROUND_TOP`).
 *
 * **Und zwei Zentimeter reichen nicht bis zur äußersten Ecke.** Nachgerechnet
 * für die Kamera dieses Spiels (0,05 … 700 m, `core/App.ts`) löst ein
 * Tiefenpuffer von 24 Bit auf 130 m gerade noch zwei Zentimeter auf, auf 175 m
 * nur noch dreieinhalb — und so weit ist die gegenüberliegende Ecke der
 * Schürze von der gegenüberliegenden Ecke des Geländes entfernt. Deshalb
 * bekommen die Platten zusätzlich einen `polygonOffset` (siehe `build`): Der
 * schiebt nicht die Geometrie, sondern nur den geschriebenen Tiefenwert, und
 * zwar in Einheiten des Puffers selbst — er wirkt damit auf jede Entfernung
 * gleich.
 *
 * **Für den gebauten Boden gilt er nicht.** Dort tritt die Platte an die
 * Stelle des Quaders, und der wird unsichtbar, sobald sie da ist
 * (`GridWorld.buildFloorPlates`): Zwei Flächen, die sich um Bildpunkte
 * streiten könnten, gibt es nicht — also sitzt die Platte dort **genau** auf
 * der Oberkante, und man steht auf ihr und nicht in ihr.
 */
export const PLATE_LIFT = 0.02;

/** Wo die Oberseite einer Schürzenplatte liegt. */
export const PLATE_TOP = GROUND_TOP + PLATE_LIFT;

/**
 * **Wo eine Platte sitzt** — die Mitte ihrer **Oberseite**, in Weltmetern.
 *
 * Die Oberseite und nicht der Ursprung des Modells: Wo ein fremdes Netz seinen
 * Nullpunkt hat, ist seine Sache (bei `Floor_Prototype` die Mitte der
 * Unterseite, bei `floor_tile_small` mitten im Stein), und niemand, der eine
 * Platte hinlegt, soll das nachschlagen müssen. Gemessen wird beim Bauen
 * (siehe `build`), und was hier steht, ist die Höhe, auf der man geht.
 */
export interface PlateSeat {
  x: number;
  y: number;
  z: number;
}

/** Wiederverwendet statt je Platte neu — zehntausend Matrizen sind zehntausend. */
const _at = new THREE.Matrix4();
const _box = new THREE.Box3();

/**
 * **Ein Plattenboden** — angelegt beim Bauen, gefüllt, sobald das Modell da
 * ist, und beim Weltwechsel vollständig wieder weg.
 *
 * Gebaut wird **synchron** (eine leere Gruppe), das Modell kommt über die
 * Leitung. Bis es da ist, ist nichts zu sehen, und das ist richtig: Darunter
 * liegt der alte Boden und tut, was er immer tat.
 */
export class PlateFloor {
  private readonly group = new THREE.Group();
  /** Das Bündel, solange es eines gibt. */
  private bundle: THREE.InstancedMesh | null = null;
  /** Alles, was freizugeben ist: die Kopie der Geometrie und das Material. */
  private readonly owned: { dispose(): void }[] = [];
  /** Ob schon aufgeräumt wurde, während die Datei noch unterwegs war. */
  private gone = false;
  /** Wer erfahren will, dass wirklich ein Bündel dasteht (siehe Konstruktor). */
  private readonly ready: (() => void) | undefined;

  /**
   * `options.ready` wird **genau dann** gerufen, wenn wirklich ein Bündel
   * dasteht — daran hängt beim gebauten Boden, dass die Quader darunter
   * verschwinden (`GridWorld`). Eine Datei, die nicht ankommt, ruft es nie,
   * und dann bleibt das Gebaute stehen: Das ist der Ausgang ohne die gekauften
   * Pakete.
   *
   * `options.level` ist die **Etage**, und sie ist keine Zierde: Von oben
   * verschwindet alles, was über der Ebene des Spielers liegt
   * (`core/cutaway.ts`, an `userData.level`). Ohne diese Marke bliebe der
   * Steinboden des Podests stehen, während das Podest darunter weggeschnitten
   * wird — ein Boden, der in der Luft liegt. Ein Bündel je Etage ist deshalb
   * die Bedingung und nicht der Sonderfall: Ein Objekt hat genau **eine**
   * Sichtbarkeit, und das ist derselbe Satz, aus dem auch die Bündel des
   * Grundrisses je Etage entstehen (`grid/gridBatch.batchKey`).
   */
  constructor(
    root: THREE.Object3D,
    model: string,
    seats: readonly PlateSeat[],
    options: { level?: number; ready?: () => void } = {},
  ) {
    this.ready = options.ready;
    this.group.name = `plate-floor:${model}`;
    if (options.level !== undefined) this.group.userData.level = options.level;
    root.add(this.group);
    this.fill(model, seats);
  }

  /**
   * **Alles weg** — und zwar alles, was dieser Gruppe gehört.
   *
   * Anders als bei der Druckplatte (`worlds/grid/fixtures/plate.ts`) gehört
   * hier auch die **Geometrie** dazu, und das ist eine bewusste Abweichung vom
   * Muster nebenan. Dort hängen Dutzende Kopien an derselben Vorlage, und wer
   * ihren Puffer freigäbe, nähme ihn allen — deshalb steht auf jeder Kopie
   * `userData.sharedAssets` und `environment.disposeTree` hält daran an. Hier
   * gibt es je Bündel genau **ein** Netz mit einer eigenen Geometrie von
   * vierzig Eckpunkten. Die wird deshalb beim Aufbau **kopiert** (siehe
   * `build`): Vierzig Eckpunkte doppelt im Speicher sind nichts gegen eine
   * Aufräumregel, die an zwei Stellen zugleich stimmen müsste — denn
   * `disposeTree` hält an `sharedAssets` an und lässt dann auch das
   * **Material** liegen. Mit einer eigenen Geometrie gehört dem Bündel alles,
   * was daran hängt, und jeder Weg — Weltwechsel, Umbau, abgebrochenes
   * Laden — gibt genau dasselbe frei.
   */
  dispose(): void {
    this.gone = true;
    // Ein `InstancedMesh` hält mehr als Netz und Material: Sein
    // `instanceMatrix` ist ein Puffer auf der Grafikkarte, und der geht nur
    // über `dispose()` wieder weg.
    this.bundle?.dispose();
    this.bundle = null;
    for (const one of this.owned) one.dispose();
    this.owned.length = 0;
    this.group.removeFromParent();
  }

  /**
   * **Das Modell holen** — sofort nichts, später vielleicht etwas.
   *
   * Dynamisch importiert und nicht oben in der Datei, aus demselben Grund wie
   * bei der Druckplatte: `core/kaykitModel` zieht `GLTFLoader` samt
   * `import.meta` herein, und beides gibt es in Jest nicht.
   */
  private fill(file: string, seats: readonly PlateSeat[]): void {
    if (!canLoadModels() || seats.length === 0) return;
    void import('../../core/kaykitModel').then(async (module) => {
      const model = await module.kaykitModel(file);
      if (!model) return;
      this.build(model, seats);
    });
  }

  /**
   * **Aus einer Kopie wird ein Bündel.**
   *
   * Der ganze Vorgang ist eine Messung und keine Tabelle, und das ist die
   * Regel dieses Projekts für fremde Dateien (`grid/fixtures/plate.ts`, dort
   * ausführlich): Der Maßstab des Pakets steht auf der zurückgegebenen Gruppe
   * (`core/kaykitFit.kaykitScale`), was er in Metern bedeutet, sagt erst eine
   * `Box3` um das geladene Modell — und genau daraus wird der Faktor gerechnet,
   * der aus 2,80 m die bestellte eine Kachel macht. Eine abgeschriebene Zahl
   * wäre die, die beim nächsten Paket-Update stehen bleibt.
   */
  private build(model: THREE.Object3D, seats: readonly PlateSeat[]): void {
    const mesh = onlyMesh(model);
    const skin = mesh && !Array.isArray(mesh.material) ? mesh.material : null;
    // Abgeräumt, während die Datei unterwegs war — oder eine Datei, aus der
    // sich kein Bündel bauen lässt: Ein Bündel hat **ein** Netz und **ein**
    // Material, und was das nicht hergibt, lässt den Boden darunter stehen.
    // Die Materialien der Kopie gehören ihr allein
    // (`core/kaykitModel.copyOf`) und gehen hier weg und nicht irgendwann.
    if (this.gone || !mesh || !skin) {
      for (const one of skinsOf(model)) one.dispose();
      return;
    }

    // **Erst messen, dann rechnen.** Die Gruppe trägt den Maßstab ihres Pakets
    // (0,7 für `prototype-bits`, 0,5 für `dungeon`); was davon in Metern
    // herauskommt, steht in keiner Datei.
    model.position.set(0, 0, 0);
    model.updateMatrixWorld(true);
    _box.setFromObject(model);
    const wide = _box.max.x - _box.min.x;
    const deep = _box.max.z - _box.min.z;
    if (!(wide > 1e-6) || !(deep > 1e-6)) {
      for (const one of skinsOf(model)) one.dispose();
      return;
    }
    // **In x und z getrennt**, und das ist nicht Pedanterie: Die Platte muss
    // **exakt** bis an die Kachelkante reichen, damit sie an die nächste stößt
    // — eine Fuge von einem Millimeter ist über 34 000 Platten ein Raster aus
    // Fugen. Beide Kandidaten sind quadratisch (`Floor_Prototype` 4,000 ×
    // 4,000 Quelleinheiten, `floor_tile_small` 2,000 × 2,000), und genau
    // deshalb steht hier keine Annahme, sondern zwei Faktoren: Wer eine Datei
    // einsetzt, die es nicht ist, bekommt eine Platte, die stimmt, statt einer
    // Lücke, die niemand sucht. Die **Höhe** folgt dem Faktor in x — sonst
    // zöge eine schiefe Platte auch noch ihre Fase in die Länge.
    model.scale.x *= PLATE_SIZE / wide;
    model.scale.y *= PLATE_SIZE / wide;
    model.scale.z *= PLATE_SIZE / deep;

    // Noch einmal messen, jetzt in der Größe, in der sie liegen wird: Die
    // Platte soll **mittig über ihrer Kachel** und mit der **Oberkante** auf
    // null sitzen, damit jede Instanz nachher eine reine Verschiebung auf
    // ihren Sitz ist. Wo das Modell seinen Ursprung hat, ist dabei egal —
    // gemessen wird der Umriss und nicht der Nullpunkt: `Floor_Prototype` hat
    // ihn in der Mitte seiner Unterseite, `floor_tile_small` mitten im Stein,
    // und beides ist eine Beobachtung an einer Datei und keine Zusage des
    // Pakets.
    model.updateMatrixWorld(true);
    _box.setFromObject(model);
    model.position.set(-(_box.min.x + _box.max.x) / 2, -_box.max.y, -(_box.min.z + _box.max.z) / 2);
    model.updateMatrixWorld(true);

    // **Die Verschiebung wandert in die Geometrie** und nicht in jede der
    // zehntausend Instanzmatrizen. Die Kopie ist zugleich das, was diese
    // Gruppe aufräumen darf (siehe `dispose`).
    const shape = mesh.geometry.clone();
    shape.applyMatrix4(mesh.matrixWorld);
    this.owned.push(shape);
    this.owned.push(skin);
    // **Der Saum gegen das Flimmern in der Ferne** — siehe `PLATE_LIFT`. Die
    // klassische Einstellung für alles, was dicht auf etwas anderem liegt: ein
    // Schritt Richtung Kamera, gemessen in der kleinsten Stufe, die der
    // Tiefenpuffer an dieser Stelle hergibt. Sie kostet nichts und hilft dort,
    // wo zwei Zentimeter Abstand nicht mehr reichen.
    depthSeam(skin);

    // **Die Hülle kommt aus den Instanzen und nicht aus dem Netz.** Ohne
    // `computeBoundingSphere` rechnet three sie beim ersten Aussieben aus
    // einer einzigen Platte am Nullpunkt aus — und siebte damit den ganzen
    // Boden weg, sobald man von seiner Mitte wegschaut.
    const bundle = new THREE.InstancedMesh(shape, skin, seats.length);
    bundle.name = this.group.name;
    // Gehalten wie der texturierte Boden nebenan (`environment.createGround`):
    // Er **empfängt** Schatten und wirft keinen. Das ist bei einer Fläche
    // dieser Größe keine Sparsamkeit, sondern die Bedingung — ein Boden, der
    // Schatten wirft, wirft ihn auf sich selbst, und die Schattenkarte deckt
    // einen Kasten von 32 m ab (`core/graphicsSettings`). Gesagt wird es über
    // die Marke **Kulisse**: `applySceneQuality` schaltet `castShadow` sonst
    // an jedem undurchsichtigen Netz wieder ein, und an einer Kulisse tut es
    // das nicht (`core/graphicsScene.ts`) — dieselbe Marke spart dem Boden
    // auch den schwarzen Saum im Comic-Modus, der hier ein Strich um jede der
    // zehntausend Platten wäre.
    bundle.receiveShadow = true;
    markBackdrop(bundle);
    seats.forEach((seat, i) => {
      _at.makeTranslation(seat.x, seat.y, seat.z);
      bundle.setMatrixAt(i, _at);
    });
    bundle.instanceMatrix.needsUpdate = true;
    bundle.computeBoundingSphere();
    this.group.add(bundle);
    this.bundle = bundle;
    this.ready?.();
  }
}

/**
 * **Das eine Netz unter diesem Knoten** — oder `null`, wenn es keines oder
 * mehr als eines sind.
 *
 * Ein Bündel hat genau ein Netz und ein Material; eine Datei mit zwei Teilen
 * wären zwei Bündel, und das ist eine andere Datei als diese. Gesucht wird
 * deshalb nicht das erste, sondern das einzige: Ein `children[0]`, das nach
 * dem nächsten Paket-Update auf ein Zierstück zeigt, wäre ein Boden aus
 * zehntausend Zierstücken.
 */
function onlyMesh(root: THREE.Object3D): THREE.Mesh | null {
  const found: THREE.Mesh[] = [];
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.isMesh) found.push(mesh);
  });
  return found.length === 1 ? found[0]! : null;
}

/**
 * **Ein Schritt Richtung Kamera im Tiefenpuffer** — und keiner im Raum.
 *
 * Die übliche Einstellung für eine Fläche, die dicht auf einer anderen liegt
 * (in diesem Projekt schon einmal beschrieben, `ui/TextPlane.ts`: „was
 * `polygonOffset` an Tiefe verschiebt, ist ein Saum gegen Z-Fighting"). Beide
 * Zahlen auf −1: eine Stufe für die Neigung der Fläche und eine feste dazu.
 * Mehr wäre ein Boden, der vor dem steht, was auf ihm liegt.
 */
function depthSeam(skin: THREE.Material): void {
  skin.polygonOffset = true;
  skin.polygonOffsetFactor = -1;
  skin.polygonOffsetUnits = -1;
}

/** Die Materialien unter einem Knoten, jedes einmal — für den Abbruch. */
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
