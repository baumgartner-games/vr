import * as THREE from 'three';
import { canLoadModels } from '../../core/chefFit';
import { GROUND_TOP, markBackdrop } from './environment';
import { PLATE_SIZE, PLATE_SKIRT, plateSpots, type PlateArea } from './plateField';

/**
 * **Der Boden draußen als echte Platten** — hell und dunkel im Wechsel, in
 * genau zwei Zeichenaufrufen.
 *
 * Draußen lag bisher eine **Textur auf einem Kasten** (`environment.ts`,
 * `createGround`): ein gekacheltes Schachbrett auf einer `BoxGeometry` von
 * tausend Metern Kantenlänge. Das ist billig und sieht von oben gut aus — aus
 * der Brille heraus ist es aber unübersehbar ein Anstrich: Ein Boden ohne
 * Dicke hat keine Fugen, keine Kanten und kein Licht auf einer Kante, und
 * genau daran erkennt man ihn.
 *
 * Hier liegen stattdessen **richtige Platten** aus dem KayKit-Regal darauf.
 * Drei Bedingungen entscheiden über diese Datei, und sie stehen alle drei
 * gegeneinander:
 *
 * - **Der Kasten geht bis zum Horizont, die Platten können das nicht.** 500 ×
 *   500 m in 2-m-Platten wären 250 000 Stück. Es gibt deshalb eine **Schürze**
 *   um das Gelände herum (`plateField.PLATE_SKIRT`), und dahinter bleibt der
 *   texturierte Kasten stehen, wie er war.
 * - **Es muss ein Bündel sein.** Viertausend einzelne Netze wären
 *   viertausend Zeichenaufrufe je Bild — der Fehler, den dieses Projekt für
 *   die Bodenkacheln des Grundrisses schon einmal gemacht und aufgeschrieben
 *   hat (`worlds/grid/gridBatch.ts`: „tausend gleiche Kästen in **einem**
 *   Aufruf"). Also **zwei** `InstancedMesh`: gleiche Geometrie, zwei
 *   Materialien, ein Aufruf je Farbe.
 * - **Und die Kollision bleibt beim alten Boden.** Der texturierte Kasten
 *   trägt den Collider (`GROUND_TOP`, `GROUND_THICKNESS`); die Platten sind
 *   reine Zierde und bekommen **keine** Körper. Sie liegen deshalb so tief,
 *   dass man nicht auf ihnen steht, sondern in ihnen — siehe `PLATE_LIFT`.
 *
 * **Und der Kasten darunter behält sein Schachbrett.** Die Frage stellt sich,
 * weil unter der Schürze nichts durchblitzen darf — beantwortet ist sie damit,
 * dass dort gar nichts zu sehen ist: Die Platten stoßen auf dem Feldraster
 * Kante an Kante aneinander (`plateField.plateSpots`), lassen also keine Fuge
 * offen, und sie liegen zwei Zentimeter darüber (`PLATE_LIFT`). Was der Kasten
 * trägt, sieht man erst **hinter** der Schürze wieder — und dort ist das
 * Schachbrett genau das, was man will: Es ist das Lineal dieser Welt
 * (`environment.CHECKER_TILE`, ein Meter je Feld), und es einfarbig zu machen
 * hieße, den Horizont gegen eine Nebelbank einzutauschen. Ihn nur **unter**
 * der Schürze einfarbig zu machen, ginge ohnehin nicht: Der Kasten ist ein
 * einziges Netz mit einer gekachelten Textur darauf.
 *
 * **Ohne WebGL passiert gar nichts** (`core/chefFit.canLoadModels`), und das
 * ist ein normaler Ausgang und kein Fehler: In Jest gibt es weder `import.meta`
 * noch einen `GLTFLoader`, und dann bleibt es beim texturierten Boden — genauso
 * wie in einem Checkout ohne die gekauften Pakete.
 */

/**
 * **Welche Platte** — `Floor_Prototype.glb` aus `prototype-bits`.
 *
 * Vier Kandidaten liegen in demselben Paket, alle vier 4 × 4 Quelleinheiten
 * groß und alle vier auf demselben Atlas. Nachgemessen an den Dateien:
 *
 * | Datei             | Höhe  | Dreiecke | was darauf ist                    |
 * | ----------------- | ----- | -------- | --------------------------------- |
 * | `Primitive_Floor` | 1,000 | **12**   | ein nackter Würfel                |
 * | `Floor_Prototype` | 0,500 | **20**   | eine umlaufend gefaste Oberkante  |
 * | `Floor`           | 0,500 | **52**   | dieselbe Fase, dazu ein Innenfeld |
 * | `Floor_Dirt`      | 0,530 | **120**  | Erde und Geröll obenauf           |
 *
 * `Primitive_Floor` ist der billigste und zugleich der nutzloseste: ein Würfel
 * ohne jede Kante sieht aus wie das, was hier ersetzt werden soll — eine
 * Fläche mit einem Muster darauf. `Floor_Dirt` bringt Geröll mit, und Geröll
 * zerlegt das Schachbrett, um das es geht; sechsmal so viele Dreiecke kosten
 * es obendrein. `Floor` legt in dieselbe Platte noch zwei eingelassene
 * Rahmen — hübsch für einen Raum, und bei viertausend Instanzen der
 * Unterschied zwischen 81 000 und 211 000 Dreiecken je Bild, für ein Muster,
 * das ab zwanzig Metern niemand mehr auseinanderhält.
 *
 * Bleibt `Floor_Prototype`. Ihre Fase ist nachgemessen: Die Oberseite liegt
 * 0,1 Quelleinheiten über dem Rand und steht an jeder Seite 0,1 nach innen —
 * bei zwei Metern Platte also eine Schräge von fünf Zentimetern, in 45° rings
 * um jede Fuge. Genau die macht aus einem gemusterten Rechteck eine Platte,
 * und sie kostet acht Dreiecke. Es ist auch die, die bestellt wurde.
 */
const PLATE_MODEL = 'prototype-bits/Floor_Prototype.glb';

/**
 * **Wie weit die Oberkante der Platten über dem alten Boden liegt**, in
 * Metern.
 *
 * Zwei Zentimeter, und die Zahl steht zwischen zwei Fehlern:
 *
 * **Zu hoch, und man stolpert.** Den Collider trägt weiter der texturierte
 * Kasten, und seine Oberseite liegt auf `GROUND_TOP` (−0,05 m). Wer die
 * Platten darauflegte, bekäme einen Boden, auf dem man **daneben** steht: Die
 * Platte ist 0,25 m dick, und jede Figur schwebte eine Handbreit über dem,
 * worauf sie zu stehen scheint. Die Platten liegen deshalb **im** Boden und
 * nicht darauf — man steckt zwei Zentimeter in ihnen, und zwei Zentimeter sind
 * genau die Haut der Spielerkapsel (`physics/PhysicsLocomotion.CHARACTER_SKIN`),
 * also der kleinste Abstand, den diese Maschine ohnehin für nichts hält.
 *
 * **Zu tief, und es flimmert.** Genau auf `GROUND_TOP` lägen Platte und Kasten
 * in **derselben** Ebene, und zwei Flächen auf derselben Höhe streiten sich um
 * jedes Pixel — derselbe Grund, aus dem der Kasten überhaupt eine Handbreit
 * unter der Null liegt (`environment.GROUND_TOP`) und aus dem der gebaute
 * Boden der Testwelt auf −0,02 sitzt.
 *
 * Nach oben ist dabei genau eine Handbreit Platz, und sie ist aufgebraucht:
 * Die Oberkante liegt mit zwei Zentimetern auf −0,03 m und damit einen
 * Zentimeter **unter** dem gebauten Boden der Testwelt (−0,02 m,
 * `worlds/test/testPlan.ts`). Das ist die Bedingung dafür, dass die
 * Randplatten an der Geländekante begraben bleiben, statt durch ihn
 * hindurchzustoßen (`plateField.plateSpots`).
 *
 * **Und zwei Zentimeter reichen nicht bis zur äußersten Ecke.** Nachgerechnet
 * für die Kamera dieses Spiels (0,05 … 700 m, `core/App.ts`) löst ein
 * Tiefenpuffer von 24 Bit auf 130 m gerade noch zwei Zentimeter auf, auf 175 m
 * nur noch dreieinhalb — und so weit ist die gegenüberliegende Ecke der
 * Schürze von der gegenüberliegenden Ecke des Geländes entfernt. Deshalb
 * bekommen die Platten zusätzlich einen `polygonOffset` (siehe `build`): Der
 * schiebt nicht die Geometrie, sondern nur den geschriebenen Tiefenwert, und
 * zwar in Einheiten des Puffers selbst — er wirkt damit auf jede Entfernung
 * gleich. Der Abstand oben bleibt trotzdem stehen; er ist der, der den
 * Randplatten den gebauten Boden über den Kopf zieht, und das kann kein
 * Tiefenversatz.
 */
export const PLATE_LIFT = 0.02;

/** Wo die Oberseite einer Platte liegt. */
const PLATE_TOP = GROUND_TOP + PLATE_LIFT;

/**
 * **Wie viel dunkler das dunkle Feld ist** — als Faktor auf den Farbton.
 *
 * „Dunkler" heißt dunkler und nicht anders: Es ist **dieselbe** Platte mit
 * demselben Netz und derselben Textur, nur mit einem heruntergezogenen
 * Farbton. `environment.mixed()` ist die Umkehrung davon — dort wird ein Ton
 * um 18 % gegen Weiß gehoben, damit jede Welt ihr Schachbrett bekommt, ohne
 * eine zweite Farbe zu nennen.
 *
 * Die 18 % sind hier trotzdem nicht die richtige Zahl, denn hier steht kein
 * geborgter Ton neben einer Grundfarbe, sondern das Schachbrett des Geländes
 * daneben — und das hat seinen Abstand längst: grau `0x9aa0a8` gegen weiß
 * `0xe8ebef` (`worlds/test/layout.HORIZON_COLORS`), also 154/232, 160/235 und
 * 168/239 — zwischen 0,66 und 0,70. **0,68** ist die Mitte davon, und damit
 * liest sich die Schürze als Fortsetzung des Bretts und nicht als ein zweites,
 * kräftigeres daneben.
 */
export const PLATE_DARK = 0.68;

/** Wiederverwendet statt je Platte neu — viertausend Matrizen sind viertausend. */
const _at = new THREE.Matrix4();
const _box = new THREE.Box3();

/**
 * **Der Plattenboden einer Welt** — angelegt beim Bauen, gefüllt, sobald das
 * Modell da ist, und beim Weltwechsel vollständig wieder weg.
 *
 * Gebaut wird **synchron** (eine leere Gruppe), das Modell kommt über die
 * Leitung. Bis es da ist, ist nichts zu sehen, und das ist richtig: Darunter
 * liegt der texturierte Boden und tut, was er immer tat.
 */
export class PlateFloor {
  private readonly group = new THREE.Group();
  /** Die beiden Bündel — hell und dunkel —, solange es sie gibt. */
  private readonly bundles: THREE.InstancedMesh[] = [];
  /** Alles, was freizugeben ist: die Kopie der Geometrie und beide Materialien. */
  private readonly owned: { dispose(): void }[] = [];
  /** Ob schon aufgeräumt wurde, während die Datei noch unterwegs war. */
  private gone = false;

  constructor(root: THREE.Object3D, field: PlateArea) {
    this.group.name = 'plate-floor';
    root.add(this.group);
    this.fill(field);
  }

  /**
   * **Alles weg** — und zwar alles, was dieser Gruppe gehört.
   *
   * Anders als bei der Druckplatte (`worlds/grid/fixtures/plate.ts`) gehört
   * hier auch die **Geometrie** dazu, und das ist eine bewusste Abweichung vom
   * Muster nebenan. Dort hängen Dutzende Kopien an derselben Vorlage, und wer
   * ihren Puffer freigäbe, nähme ihn allen — deshalb steht auf jeder Kopie
   * `userData.sharedAssets` und `environment.disposeTree` hält daran an. Hier
   * gibt es je Welt genau **zwei** Netze, und beide teilen sich eine einzige
   * Geometrie von vierzig Eckpunkten. Die wird deshalb beim Aufbau **kopiert**
   * (siehe `build`): Vierzig Eckpunkte doppelt im Speicher sind nichts gegen
   * eine Aufräumregel, die an zwei Stellen zugleich stimmen müsste — denn
   * `disposeTree` hält an `sharedAssets` an und lässt dann auch die
   * **Materialien** liegen, und die Vorschau der Werkzeugseite
   * (`PortalWorld.preview`) räumt ausschließlich damit auf. Mit einer eigenen
   * Geometrie gehört dem Bündel alles, was daran hängt, und jeder Weg —
   * Weltwechsel, Vorschau, abgebrochenes Laden — gibt genau dasselbe frei.
   */
  dispose(): void {
    this.gone = true;
    // Ein `InstancedMesh` hält mehr als Netz und Material: Sein
    // `instanceMatrix` ist ein Puffer auf der Grafikkarte, und der geht nur
    // über `dispose()` wieder weg.
    for (const bundle of this.bundles) bundle.dispose();
    this.bundles.length = 0;
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
  private fill(field: PlateArea): void {
    if (!canLoadModels()) return;
    void import('../../core/kaykitModel').then(async (module) => {
      const model = await module.kaykitModel(PLATE_MODEL);
      if (!model) return;
      this.build(model, field);
    });
  }

  /**
   * **Aus einer Kopie werden zwei Bündel.**
   *
   * Der ganze Vorgang ist eine Messung und keine Tabelle, und das ist die
   * Regel dieses Projekts für fremde Dateien (`grid/fixtures/plate.ts`, dort
   * ausführlich): Der Maßstab des Pakets steht auf der zurückgegebenen Gruppe
   * (`core/kaykitFit.kaykitScale`), was er in Metern bedeutet, sagt erst eine
   * `Box3` um das geladene Modell — und genau daraus wird der Faktor gerechnet,
   * der aus 2,80 m die bestellten zwei macht. Eine abgeschriebene Zahl wäre
   * die, die beim nächsten Paket-Update stehen bleibt.
   */
  private build(model: THREE.Object3D, field: PlateArea): void {
    const mesh = onlyMesh(model);
    const skin = mesh && !Array.isArray(mesh.material) ? mesh.material : null;
    // Abgeräumt, während die Datei unterwegs war — oder eine Datei, aus der
    // sich kein Bündel bauen lässt: Ein Bündel hat **ein** Netz und **ein**
    // Material, und was das nicht hergibt, lässt den texturierten Boden
    // stehen. Die Materialien der Kopie gehören ihr allein
    // (`core/kaykitModel.copyOf`) und gehen hier weg und nicht irgendwann.
    if (this.gone || !mesh || !skin) {
      for (const one of skinsOf(model)) one.dispose();
      return;
    }

    // **Erst messen, dann rechnen.** Die Gruppe trägt den Maßstab ihres Pakets
    // (0,7 für `prototype-bits`); was davon in Metern herauskommt, steht in
    // keiner Datei.
    model.position.set(0, 0, 0);
    model.updateMatrixWorld(true);
    _box.setFromObject(model);
    const side = Math.max(_box.max.x - _box.min.x, _box.max.z - _box.min.z);
    if (!(side > 1e-6)) {
      for (const one of skinsOf(model)) one.dispose();
      return;
    }
    model.scale.multiplyScalar(PLATE_SIZE / side);

    // Noch einmal messen, jetzt in der Größe, in der sie liegen wird: Die
    // Platte soll mittig über ihrer Kachel und mit der **Oberkante** auf
    // `PLATE_TOP` sitzen. Dass ihr Ursprung in der Mitte ihrer Unterseite
    // liegt, ist eine Beobachtung an dieser einen Datei und keine Zusage des
    // Pakets — also wird auch das gemessen.
    model.updateMatrixWorld(true);
    _box.setFromObject(model);
    model.position.set(
      -(_box.min.x + _box.max.x) / 2,
      PLATE_TOP - _box.max.y,
      -(_box.min.z + _box.max.z) / 2,
    );
    model.updateMatrixWorld(true);

    // **Die Verschiebung wandert in die Geometrie** und nicht in jede der
    // viertausend Instanzmatrizen: Was dann bleibt, ist je Platte eine reine
    // Translation. Die Kopie ist zugleich das, was diese Gruppe aufräumen darf
    // (siehe `dispose`).
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

    // **Dasselbe Netz, ein heruntergezogener Ton** — mehr ist das dunkle Feld
    // nicht (siehe `PLATE_DARK`). Die Textur bleibt dieselbe: Ein `clone()`
    // eines Materials kopiert die Zahlen und teilt sich das Bild, und das Bild
    // gehört der Vorlage im Speicher. Der Saum von eben kommt dabei mit — er
    // ist eine der Zahlen.
    const shade = skin.clone();
    if ((shade as THREE.MeshStandardMaterial).color) {
      (shade as THREE.MeshStandardMaterial).color.multiplyScalar(PLATE_DARK);
    }
    this.owned.push(shade);

    const spots = plateSpots(field, PLATE_SIZE, PLATE_SKIRT);
    const dark = spots.filter((one) => one.dark).length;
    const bundles = [
      this.bundle(shape, skin, spots.length - dark, 'plate-floor-light'),
      this.bundle(shape, shade, dark, 'plate-floor-dark'),
    ] as const;

    let light = 0;
    let shaded = 0;
    for (const spot of spots) {
      _at.makeTranslation(spot.x, 0, spot.z);
      if (spot.dark) bundles[1].setMatrixAt(shaded++, _at);
      else bundles[0].setMatrixAt(light++, _at);
    }
    for (const bundle of bundles) {
      bundle.instanceMatrix.needsUpdate = true;
      // **Die Hülle kommt aus den Instanzen und nicht aus dem Netz.** Ohne
      // diese Zeile rechnet three sie beim ersten Aussieben aus einer einzigen
      // Platte am Nullpunkt aus — und siebte damit die ganze Schürze weg,
      // sobald man von ihrer Mitte wegschaut.
      bundle.computeBoundingSphere();
      this.group.add(bundle);
      this.bundles.push(bundle);
    }
  }

  /**
   * **Ein Bündel** — und die beiden Zeilen, an denen die Schatten hängen.
   *
   * Gehalten wie der texturierte Boden nebenan (`environment.createGround`):
   * Er **empfängt** Schatten und wirft keinen. Das ist bei einer Fläche dieser
   * Größe keine Sparsamkeit, sondern die Bedingung — ein Boden, der Schatten
   * wirft, wirft ihn auf sich selbst, und die Schattenkarte deckt einen Kasten
   * von 32 m ab (`core/graphicsSettings`). Gesagt wird es über die Marke
   * **Kulisse**: `applySceneQuality` schaltet `castShadow` sonst an jedem
   * undurchsichtigen Netz wieder ein, und an einer Kulisse tut es das nicht
   * (`core/graphicsScene.ts`) — dieselbe Marke spart der Schürze auch den
   * schwarzen Saum im Comic-Modus, der hier ein Strich um jede der
   * viertausend Platten wäre.
   */
  private bundle(
    shape: THREE.BufferGeometry,
    skin: THREE.Material,
    count: number,
    name: string,
  ): THREE.InstancedMesh {
    const bundle = new THREE.InstancedMesh(shape, skin, count);
    bundle.name = name;
    bundle.receiveShadow = true;
    return markBackdrop(bundle);
  }
}

/**
 * **Das eine Netz unter diesem Knoten** — oder `null`, wenn es keines oder
 * mehr als eines sind.
 *
 * Ein Bündel hat genau ein Netz und ein Material; eine Datei mit zwei Teilen
 * wären zwei Bündel je Farbe, und das ist eine andere Datei als diese. Gesucht
 * wird deshalb nicht das erste, sondern das einzige: Ein `children[0]`, das
 * nach dem nächsten Paket-Update auf ein Zierstück zeigt, wäre eine Schürze
 * aus viertausend Zierstücken.
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
