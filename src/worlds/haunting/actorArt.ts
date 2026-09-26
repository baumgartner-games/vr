import * as THREE from 'three';
import { markBlobShadow } from '../../core/blobShadow';
import { canLoadModels } from '../../core/chefFit';
import { disposeTree } from '../shared/environment';
import { SHIP, animateCreature, buildCreature, buildCrewmate } from './shipArt';
import {
  ACTOR_GLOW_MATERIAL,
  actorFigure,
  actorMoving,
  actorPace,
  type ActorKind,
} from './actorFit';
import type { KaykitFigure } from '../../core/kaykitFigure';

/**
 * **Ein Akteur im Schiff** — der Techniker und die drei Monster, jeder als
 * eine Gruppe, die man hinstellen, bewegen und wieder wegräumen kann.
 *
 * Bis hierher baute das Schiff seine Figuren selbst: ein paar Kapseln und
 * Kästen, aus denen ein Crewmate und drei Kreaturen wurden
 * (`shipArt.buildCrewmate`, `buildCreature`). Die sind nicht schlecht, aber
 * sie haben keine Knochen — ihre Arme und Beine schwenken um eine Sinuskurve
 * (`animateCreature`), und mehr als schwenken können sie nicht. Seit im Regal
 * Figuren mit Skelett liegen (`core/kaykitFigure.ts`), gibt es dafür einen
 * Ersatz, der wirklich geht, rennt und zuschlägt.
 *
 * **Der gebaute Körper bleibt trotzdem** — und zwar als das, was sofort da
 * ist. Eine Datei aus dem Regal kommt über die Leitung, und eine Runde, die
 * erst anfängt, wenn ein Monster geladen ist, fängt manchmal gar nicht an.
 * Also steht im ersten Bild der gebaute Körper, und sobald die Figur eintrifft,
 * wird er **ausgeblendet und nicht weggeworfen**: Er hängt an den Maßen, die
 * die Tests prüfen, und er kostet unsichtbar nichts. Dasselbe Muster wie beim
 * Koch (`core/AvatarBody.wearModel`) und beim Rechner der Küche
 * (`worlds/test/zones/kitchenDesk.fillComputer`).
 *
 * **Und der Lader wird nur dynamisch angefasst.** `core/kaykitFigure.ts` zieht
 * `GLTFLoader` und `import.meta` mit sich, und beides bringt Jest zum Stehen —
 * diese Datei hängt dagegen über `shipArt.ts` an einer Suite, die wirklich
 * läuft (`shipArt.test.ts`). Deshalb steht die Frage `canLoadModels()` vor dem
 * `import()`, und der Typ kommt über ein `import type`, das der Compiler
 * wegwirft.
 */
export interface ShipActor {
  /** Wen dieser Körper darstellt — daran hängt, ob er noch der richtige ist. */
  readonly kind: ActorKind;
  /** Ursprung zwischen den Füßen, Blick nach −Z — wie bei allem in diesem Spiel. */
  readonly root: THREE.Group;
  /** Ob (noch) der gebaute Körper zu sehen ist; `false`, sobald die Figur da ist. */
  readonly built: boolean;
  /**
   * Ein Bild weiter. `moving` ist entweder ein Tempo in m/s — dann bekommt die
   * Figur ihren Gang daraus — oder ein bloßes „geht"/„steht" (`ACTOR_PACE`).
   */
  update(dt: number, moving: boolean | number): void;
  /**
   * **Aus dem Akteur eine Erinnerung machen** (`rules/ghosts.ts`): durchsichtig,
   * kalt leuchtend, ohne Schatten und ohne Tiefenschreiben. Je Bild neu
   * aufgerufen, weil die Deckkraft mit dem Alter der Sichtung fällt.
   */
  setGhost(opacity: number): void;
  dispose(): void;
}

export interface ShipActorOptions {
  /** Die Anzugfarbe des gebauten Crewmates — die Figur aus dem Regal hat ihre eigene. */
  color?: number;
}

/**
 * **Einen Akteur bauen.** Er steht sofort; ob er später auch eine Figur aus
 * dem Regal bekommt, entscheidet `actorFit.actorFigure` — und ob überhaupt
 * jemand Dateien laden kann, `core/chefFit.canLoadModels`.
 */
export function buildActor(kind: ActorKind, options: ShipActorOptions = {}): ShipActor {
  return new Actor(kind, options);
}

/** Das kalte Eigenleuchten, an dem man den Ghost auch im Dunkeln als Kopie erkennt. */
const GHOST_GLOW = 0x4a6a8a;

/** Der Punkt, an dem das Visier des Technikers sitzt — über dem Kopfknochen und davor (m). */
const VISOR_UP = 0.33;
const VISOR_FRONT = 0.4;
/** Und wie groß es ist: ein Leuchtpunkt, kein Scheinwerfer. */
const VISOR_RADIUS = 0.035;

/** Wie schnell ein stehengebliebener gebauter Körper seine Glieder sinken lässt. */
const LIMB_DAMP = 10;

class Actor implements ShipActor {
  readonly root = new THREE.Group();
  /** Der sofortige Ersatz: Kapseln und Kästen, die nichts laden müssen. */
  private readonly body: THREE.Group;
  private figure: KaykitFigure | null = null;
  /**
   * Die Uhr, aus der die gebaute Bewegung ihre Sinuskurve zieht.
   *
   * Die Aufrufer gaben dafür früher `state.time` oder `performance.now()`
   * herein — zwei Uhren für dieselbe Frage, und eine davon läuft auch weiter,
   * wenn die Runde steht. Jetzt hält der Akteur seine eigene und zählt nur
   * hoch, **solange er geht**: Ein Körper, dessen Uhr im Stehen weiterläuft,
   * zuckt beim nächsten Schritt an eine zufällige Stelle der Kurve.
   */
  private clock = 0;
  /** Deckkraft, wenn dieser Akteur ein Ghost ist — sonst `-1`. */
  private ghost = -1;
  /** Ob der Ghost-Anstrich schon liegt (Material-Flags kosten eine Übersetzung). */
  private painted = false;
  private gone = false;

  constructor(
    readonly kind: ActorKind,
    options: ShipActorOptions,
  ) {
    this.body = kind === 'crew' ? buildCrewmate(options.color) : buildCreature(kind);
    this.root.name = kind === 'crew' ? 'crew-technician' : `creature-${kind}`;
    markBlobShadow(this.root, kind === 'crew' ? 0.34 : 0.45);
    this.root.add(this.body);
    this.load();
  }

  get built(): boolean {
    return this.figure === null;
  }

  update(dt: number, moving: boolean | number): void {
    if (this.gone) return;
    const pace = actorPace(moving);
    const walks = actorMoving(pace);
    const figure = this.figure;
    if (figure) {
      figure.gait(pace);
      figure.update(dt);
      return;
    }
    // **Der gebaute Körper schwenkt oder lässt sinken.** Gedämpft und nicht
    // hart auf null: Ein Techniker, der mitten im Schritt einfriert, sieht aus
    // wie ein Standbild, und genau das war er auch.
    if (walks) {
      this.clock += Math.max(0, dt);
      animateCreature(this.body, this.clock);
      return;
    }
    for (const limb of this.body.children) {
      if (limb.name !== 'arm' && limb.name !== 'leg') continue;
      limb.rotation.x = THREE.MathUtils.damp(limb.rotation.x, 0, LIMB_DAMP, Math.max(0, dt));
    }
  }

  setGhost(opacity: number): void {
    if (this.gone) return;
    this.ghost = opacity;
    if (!this.painted) {
      this.painted = true;
      paintGhost(this.root);
    }
    fadeTo(this.root, opacity);
  }

  dispose(): void {
    if (this.gone) return;
    this.gone = true;
    // **Erst die Figur, dann der Rest.** Ihr `dispose` hält am geteilten Modell
    // an (`core/kaykitFigure.ts` → `disposeTree`, `userData.sharedAssets`);
    // wer stattdessen von außen über den ganzen Baum räumt, gibt die Geometrie
    // frei, die noch allen anderen Kopien gehört.
    this.figure?.dispose();
    this.figure = null;
    disposeTree(this.root);
  }

  /**
   * **Die Figur nachladen** — oder es bleiben lassen.
   *
   * Drei Ausgänge, und alle drei sind normal: keine Datei für diese Sorte
   * (der Krabbler, siehe `actorFit.actorFigure`), kein WebGL (Jest), oder eine
   * Datei, die nicht ankommt (ein Checkout ohne die gekauften Pakete). In
   * jedem Fall steht der gebaute Körper weiter da, und die Runde läuft.
   */
  private load(): void {
    const wanted = actorFigure(this.kind);
    if (!wanted || !canLoadModels()) return;
    void import('../../core/kaykitFigure')
      .then(async (module) => module.loadKaykitFigure(wanted.path, wanted.height))
      .then((figure) => {
        if (!figure) return;
        // **Der Wettlauf**: Wer während des Ladens weggeräumt wurde, bekommt
        // keine Figur mehr — sie würde sonst in einer Gruppe hängen, die
        // niemand mehr anfasst, und ihr Mischer liefe bis zum Reload weiter.
        if (this.gone) {
          figure.dispose();
          return;
        }
        this.wear(figure);
      });
  }

  /** Die Figur einhängen, den gebauten Körper verstecken, das Leuchten setzen. */
  private wear(figure: KaykitFigure): void {
    this.figure = figure;
    this.root.add(figure.root);
    this.body.visible = false;
    glow(figure, this.kind);
    // Ein Ghost, dessen Figur erst nach dem ersten `setGhost` eintrifft, wäre
    // sonst ein leibhaftiges zweites Monster an der Erinnerungsstelle.
    if (this.painted) {
      paintGhost(figure.root);
      fadeTo(figure.root, this.ghost);
    }
  }
}

/**
 * **Lesbarkeit im Dunkeln.**
 *
 * Das Schiff ist dunkel, und die gebauten Körper hatten dafür Leuchtflächen,
 * die nichts beleuchtet: die Augen der Kreatur (`MeshBasicMaterial`,
 * `toneMapped: false`) und der Glanzpunkt auf dem Visier des Crewmates. Eine
 * Figur aus dem Regal bringt die nicht mit, und ein mattes Ding in einem
 * dunklen Gang ist kein Monster, sondern eine Wand.
 *
 * Zwei Wege, und welcher gilt, entscheidet die **Datei** und nicht eine
 * Einstellung:
 *
 * - **Die Roboter haben ein Leuchtmaterial.** `robot_glow` steht in beiden
 *   Dateien und trägt schon `emissiveFactor: [1,1,1]`
 *   (`actorFit.ACTOR_GLOW_MATERIAL`) — es ist genau die Fläche, die der
 *   Zeichner als leuchtend gemeint hat. Sie bekommt die Augenfarbe der
 *   gebauten Kreatur, die sie ersetzt: `SHIP.amber` für den Wächter,
 *   `SHIP.red` für alles andere. `toneMapped: false` aus demselben Grund wie
 *   dort — die Augen sollen auch dann leuchten, wenn das Bild insgesamt
 *   dunkel gerechnet wird. Die Farbe ist dabei ein **Faktor** und kein
 *   Anstrich: Das Material trägt dieselbe Atlas-Textur auch als
 *   `emissiveTexture`, und die ist an den Augen bereits rot. Der Wächter wird
 *   damit bernsteinrot und nicht bernsteingelb — verschieden genug vom
 *   Stalker, und der Zeichner behält recht.
 * - **Das Mannequin hat keines** (nur `Character_Material`), also bekommt der
 *   Techniker ein **Visier**: eine 3,5-cm-Kugel in Stationszyan am
 *   Kopfknochen, dort, wo der gebaute Crewmate seinen Glanzpunkt hatte.
 *   Gemessen und nicht geraten: Der Kopfknochen sitzt bei 1,75 m Höhe auf
 *   y = 0,968, das Kopfnetz reicht von 0,87 bis 1,75 und vorn bis z = −0,43 —
 *   also 33 cm darüber und 40 cm davor. Angehängt wird mit `attach`, damit
 *   die Kugel ihre Weltgröße behält: Unter dem Kopfknochen steht der Maßstab
 *   des Pakets, und ein Kind davon wäre um denselben Faktor kleiner.
 */
function glow(figure: KaykitFigure, kind: ActorKind): void {
  const color = kind === 'sentinel' ? SHIP.amber : SHIP.red;
  let found = false;
  figure.root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (const material of materialsOf(mesh)) {
      if (material.name !== ACTOR_GLOW_MATERIAL) continue;
      const lit = material as THREE.MeshStandardMaterial;
      lit.emissive = new THREE.Color(color);
      lit.emissiveIntensity = 1;
      lit.toneMapped = false;
      found = true;
    }
  });
  if (found) return;
  const head = figure.bones.head;
  if (!head) return;
  const visor = new THREE.Mesh(
    new THREE.SphereGeometry(VISOR_RADIUS, 10, 8),
    new THREE.MeshBasicMaterial({ color: kind === 'crew' ? SHIP.cyan : color, toneMapped: false }),
  );
  visor.name = 'actor-visor';
  figure.root.updateMatrixWorld(true);
  const at = head.getWorldPosition(new THREE.Vector3());
  const ahead = new THREE.Vector3(0, VISOR_UP, -VISOR_FRONT).applyQuaternion(
    figure.root.getWorldQuaternion(new THREE.Quaternion()),
  );
  visor.position.copy(at).add(ahead);
  visor.updateMatrixWorld(true);
  head.attach(visor);
}

/**
 * Den Ghost-Anstrich auflegen: durchsichtig, kalt leuchtend, ohne
 * Tiefenschreiben (sonst zerschnitte die Kopie sich selbst in Streifen) und
 * ohne Schatten. Genau **einmal** je Baum — `transparent` umzustellen kostet
 * three.js eine neue Übersetzung des Shaders, und das je Bild wäre eine
 * Erinnerung, die mehr kostet als das Monster.
 */
function paintGhost(root: THREE.Object3D): void {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (const material of materialsOf(mesh)) {
      material.transparent = true;
      material.depthWrite = false;
      const lit = material as THREE.MeshStandardMaterial;
      if (lit.emissive) {
        lit.emissive = new THREE.Color(GHOST_GLOW);
        lit.emissiveIntensity = 0.6;
      }
    }
    mesh.castShadow = false;
    mesh.receiveShadow = false;
  });
}

/** Und je Bild nur noch die Deckkraft — das kostet keine Übersetzung. */
function fadeTo(root: THREE.Object3D, opacity: number): void {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (const material of materialsOf(mesh)) material.opacity = opacity;
  });
}

/** Ein Netz hat ein Material oder mehrere — hier ist beides eine Liste. */
function materialsOf(mesh: THREE.Mesh): THREE.Material[] {
  const material = mesh.material;
  return Array.isArray(material) ? material : material ? [material] : [];
}
