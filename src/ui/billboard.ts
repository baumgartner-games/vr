import * as THREE from 'three';

/**
 * **Dieses Objekt sieht die Kamera an** — die eine Stelle im Projekt dafür.
 *
 * Ein Schild, ein Fortschrittsbalken, ein Warndreieck: Alles, was Auskunft
 * gibt, will dem Auge zugewandt stehen und nicht hochkant im Bild. Dieselbe
 * Rechnung stand vorher in `worlds/test/zones/kitchenGauge.ts` und hätte beim
 * nächsten Schild ein zweites Mal dagestanden — darum hier, und nur hier.
 *
 * **Ausgerichtet wird beim Zeichnen, nicht im `update`.** Das ist der
 * eigentliche Punkt dieses Moduls. Eine Welt bekommt in `update` genau **eine**
 * Kamera gereicht (`WorldContext.camera`), und das ist die aus den Augen — der
 * Tausch auf die Kamera von oben passiert in `core/App.ts` erst für das
 * **Bild** (`viewContext`). Wer sich im `update` ausrichtet, steht in der
 * Ansicht von oben also zur Figur gedreht statt zur Kamera; genau das war am
 * Schirm zu sehen. `Object3D.onBeforeRender` bekommt dagegen **die Kamera, aus
 * der gerade wirklich gezeichnet wird**: von oben, aus den Augen, im Spiegel,
 * je XR-Auge einmal. Niemand muss eine Kamera durchreichen, und jeder Client
 * richtet dasselbe Schild für seinen eigenen Blick aus — der VR-Spieler
 * daneben sieht es zu sich gedreht, während es am Schirm zur Kamera von oben
 * steht.
 *
 * **Was three dabei nicht tut**: `onBeforeRender` ruft der Renderer nur für
 * Dinge, die er wirklich zeichnet (`Mesh`, `Line`, `Points`, `Sprite`) — eine
 * `Group` bekommt ihn nie. Ein Balken ist aber eine Gruppe aus Grund und
 * Füllung. Darum hängt `faceCamera` den Handler zusätzlich an alles Gezeichnete
 * **darunter**: Jedes dieser Teile richtet vor seinem eigenen Zug die Gruppe
 * aus, und weil three die `modelViewMatrix` erst **nach** `onBeforeRender`
 * bildet, gilt die Drehung noch für dasselbe Bild. Daraus folgt eine Regel für
 * Aufrufer: **erst bauen, dann `faceCamera`** — was danach hineingehängt wird,
 * löst nichts aus.
 */

/**
 * **Wie weit sich ein Schild mindestens zurücklehnt**, im Bogenmaß (30°).
 *
 * Ein Schild, das seiner Kamera genau ins Gesicht sieht, ist nie verkürzt —
 * das erledigt die Ausrichtung beim Zeichnen von selbst. Der Mindestwinkel
 * regelt den anderen Fall: eine Kamera **auf oder unter** der Höhe des
 * Schildes. Dort stünde es bolzengerade oder kippte sogar nach vorn und zeigte
 * seine Rückseite nach oben — und diese Welt sieht fast immer von oben auf ihre
 * Küche.
 *
 * 30° sind dafür das gute Maß: Die Kamera von oben steht 55° über der
 * Waagerechten (`core/topDownPose.TOP_DOWN_TILT`), liegt also über dem
 * Mindestwert und bekommt ihren echten Winkel — das Schild sieht sie genau an.
 * Aus den Augen (0,914 m, `core/chefFit.CHEF_EYE`) steht die Kamera kaum über
 * einem Balken auf 0,85 m; dort greift die Mindestneigung, und 30° zurück sind
 * auf zwei Meter Abstand kaum von „genau angesehen" zu unterscheiden
 * (cos 30° = 0,87) — dafür sieht der Balken aus wie ein Schild über der Pfanne
 * und nicht wie ein Aufkleber in der Luft.
 */
export const BILLBOARD_LEAN_MIN = (30 * Math.PI) / 180;

export interface BillboardOptions {
  /**
   * Mindest-Neigung; Vorgabe `BILLBOARD_LEAN_MIN`. 0 gibt die Kamera
   * unverfälscht wieder — und lässt ein Schild vor einer tiefer stehenden
   * Kamera senkrecht stehen, statt es nach vorn zu kippen.
   */
  readonly leanMin?: number;
  /** Nur gieren, nicht neigen — für Schilder, die senkrecht stehen sollen. */
  readonly upright?: boolean;
}

/**
 * **Die reine Rechnung**: Gieren und Neigen, damit ein Test sie ohne Szene
 * nachrechnen kann.
 *
 * `dx`/`dy`/`dz` zeigen vom Schild zur Kamera, **im Raum des Elternteils** —
 * dort gilt auch die Drehung, die dabei herauskommt. `fallbackYaw` ist das
 * Gieren, das bleiben soll, wenn es keines mehr gibt: Steht die Kamera
 * **senkrecht** über dem Schild, ist jede Richtung gleich richtig, und ein
 * Schild, das dann auf den kleinsten Rechenfehler hin herumspringt, ist
 * schlimmer als eines, das stehen bleibt.
 *
 * @returns `pitch` und `yaw`, wie sie in `rotation` gehören (Ordnung `YXZ`);
 *   `pitch` ist negativ, weil sich das Schild **zurück**lehnt.
 */
export function billboardAngles(
  dx: number,
  dy: number,
  dz: number,
  fallbackYaw: number,
  options: BillboardOptions = {},
): { yaw: number; pitch: number } {
  const flat = Math.hypot(dx, dz);
  const above = flat <= 1e-4;
  const yaw = above ? fallbackYaw : Math.atan2(dx, dz);
  if (options.upright) return { yaw, pitch: 0 };
  const leanMin = options.leanMin ?? BILLBOARD_LEAN_MIN;
  const lean = above ? Math.PI / 2 : Math.atan2(dy, flat);
  return { yaw, pitch: -Math.max(lean, leanMin) };
}

/**
 * **Hängt die Ausrichtung ans Objekt**: Sie passiert ab jetzt bei jedem
 * Zeichnen, je Kamera.
 *
 * Zu rufen ist das **einmal beim Bauen**, nicht je Bild — und erst, wenn das
 * Objekt seine Kinder hat (siehe oben, `onBeforeRender` und `Group`). Danach
 * ist nichts mehr zu tun: Kein `update` muss etwas nachziehen, und beim
 * Wegräumen muss nichts abgemeldet werden, weil der Handler am Objekt lebt und
 * mit ihm verschwindet.
 *
 * Zweimal anhängen ist kein Fehler — das zweite Mal ersetzt das erste (auch
 * mit anderen Einstellungen), statt zwei Handler übereinanderzulegen.
 */
export function faceCamera(object: THREE.Object3D, options?: BillboardOptions): void {
  unfaceCamera(object);

  // Erst gieren, dann kippen: In der Vorgabe `XYZ` kippte das Schild um die
  // **Welt**achse und stünde schief im Bild.
  object.rotation.order = 'YXZ';

  const aim = (camera: THREE.Camera): void => {
    // Die Kamera in den Raum des Elternteils holen — die Drehung, die gleich
    // gesetzt wird, gilt in genau diesem Raum.
    camera.getWorldPosition(_eye);
    object.parent?.worldToLocal(_eye);
    const { yaw, pitch } = billboardAngles(
      _eye.x - object.position.x,
      _eye.y - object.position.y,
      _eye.z - object.position.z,
      object.rotation.y,
      options,
    );
    object.rotation.set(pitch, yaw, 0);
    // **Diese Zeile ist die halbe Miete.** three hat die Matrizen der Szene
    // vor dem Zeichnen längst gebaut; wer hier nur `rotation` setzt, sieht die
    // Drehung ein Bild zu spät — und bei zwei Ansichten nebeneinander die des
    // jeweils anderen Auges.
    object.updateMatrixWorld(true);
  };

  const handler = (_renderer: THREE.WebGLRenderer, _scene: THREE.Scene, camera: THREE.Camera) => {
    aim(camera);
  };

  const nodes: THREE.Object3D[] = [];
  object.traverse((node) => {
    if (node !== object && !drawn(node)) return;
    node.onBeforeRender = handler;
    nodes.push(node);
  });
  object.userData[FACING] = { nodes } satisfies Facing;
}

/** **Nimmt sie wieder ab** — und ist gutmütig, wenn gar keine hängt. */
export function unfaceCamera(object: THREE.Object3D): void {
  const facing = object.userData[FACING] as Facing | undefined;
  if (!facing) return;
  for (const node of facing.nodes) node.onBeforeRender = NO_HANDLER;
  delete object.userData[FACING];
}

/** Woran three die Dinge erkennt, die es wirklich zeichnet — und nur die. */
function drawn(node: THREE.Object3D): boolean {
  const it = node as Partial<THREE.Mesh & THREE.Line & THREE.Points & THREE.Sprite>;
  return it.isMesh === true || it.isLine === true || it.isPoints === true || it.isSprite === true;
}

/**
 * Was am Objekt vermerkt bleibt: **woran** der Handler wirklich hängt. Ohne
 * diese Liste müsste `unfaceCamera` den Baum noch einmal durchgehen — und
 * würde dabei Kinder verfehlen, die inzwischen ausgehängt wurden.
 */
interface Facing {
  readonly nodes: readonly THREE.Object3D[];
}

const FACING = 'billboard';

/** Die Vorgabe von three ist eine leere Funktion; genau die geben wir zurück. */
const NO_HANDLER = function () {};

/** Einer für alle: Wer je Bild einen Vektor baut, baut je Bild einen Vektor. */
const _eye = new THREE.Vector3();
