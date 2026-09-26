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
 * **Zur Kamera heißt: parallel zum Bild** — und nicht „mit der Nase auf die
 * Linse". Das ist ein Unterschied, den man erst am Rand des Bildes sieht, und
 * dort sieht man ihn sofort. Ein Schild, das auf die **Stelle** zielt, an der
 * die Kamera steht, dreht sich für jeden Standort ein bisschen anders: Seine
 * Hochachse bleibt in der senkrechten Ebene durch Schild und Kamera, und die
 * steht bei einer Kamera, die von schräg oben blickt, umso schiefer im Bild,
 * je weiter das Schild neben der Blickachse steht. Von oben lagen die
 * Beschriftungen des Küchenkatalogs damit wie hingeworfen — jede in einem
 * anderen Winkel, keine davon waagerecht. Gerechnet wird deshalb aus der
 * **Rückachse der Kamera** (ihrem +Z): Das Schild bekommt genau die Neigung
 * und das Gieren, aus denen die Kamera schaut, steht also parallel zu ihrer
 * Bildebene — alle Schilder im Bild gleich ausgerichtet, alle Zeilen
 * waagerecht, keine verkürzt. Eine Rolle der Kamera wird dabei **nicht**
 * übernommen: Wer in der Brille den Kopf zur Seite legt, soll ein Schild
 * sehen, das an der Wand bleibt, und keines, das mitkippt.
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
 * Ein Schild, das parallel zum Bild steht, ist nie verkürzt — das erledigt die
 * Ausrichtung beim Zeichnen von selbst. Der Mindestwinkel regelt den anderen
 * Fall: eine Kamera, die **waagerecht oder nach oben** schaut. Dort stünde das
 * Schild bolzengerade oder kippte sogar nach vorn und zeigte seine Rückseite
 * nach oben — und diese Welt sieht fast immer von oben auf ihre Küche.
 *
 * 30° sind dafür das gute Maß: Die Kamera von oben blickt 55° nach unten
 * (`core/topDownPose.TOP_DOWN_TILT`), liegt also über dem Mindestwert und
 * bekommt ihren echten Winkel — das Schild steht genau parallel zu ihrem Bild.
 * Aus den Augen schaut man dagegen ungefähr geradeaus; dort greift die
 * Mindestneigung, und 30° zurück sind kaum von „senkrecht" zu unterscheiden
 * (cos 30° = 0,87) — dafür sieht ein Balken aus wie ein Schild über der Pfanne
 * und nicht wie ein Aufkleber in der Luft.
 */
export const BILLBOARD_LEAN_MIN = (30 * Math.PI) / 180;

export interface BillboardOptions {
  /**
   * Mindest-Neigung; Vorgabe `BILLBOARD_LEAN_MIN`. 0 gibt die Kamera
   * unverfälscht wieder — und lässt ein Schild vor einer nach oben blickenden
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
 * `dx`/`dy`/`dz` sind die **Rückachse der Kamera** (ihr +Z, also die Richtung,
 * in der der Betrachter hinter der Linse sitzt), **im Raum des Elternteils** —
 * dort gilt auch die Drehung, die dabei herauskommt. Genau dorthin zeigt
 * danach die Vorderseite des Schildes, und damit steht es **parallel zum Bild**
 * statt bloß auf die Kamera zu zielen; warum das der Unterschied zwischen
 * lesbar und schief ist, steht oben im Kopf dieser Datei.
 *
 * `fallbackYaw` ist das Gieren, das bleiben soll, wenn es keines mehr gibt:
 * Schaut die Kamera **senkrecht** nach unten, ist jede Richtung gleich richtig,
 * und ein Schild, das dann auf den kleinsten Rechenfehler hin herumspringt, ist
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
    // **Die Rückachse der Kamera**, nicht die Strecke zu ihr hin: ihr +Z, also
    // die Richtung, in der der Betrachter sitzt. Und sie kommt in den Raum des
    // Elternteils — die Drehung, die gleich gesetzt wird, gilt in genau diesem
    // Raum. `transformDirection` nimmt dafür nur die obere 3×3-Ecke: Eine
    // Richtung hat keinen Ort, den man verschieben könnte.
    _axis.setFromMatrixColumn(camera.matrixWorld, 2);
    const parent = object.parent;
    if (parent) _axis.transformDirection(_inverse.copy(parent.matrixWorld).invert());
    else _axis.normalize();
    const { yaw, pitch } = billboardAngles(_axis.x, _axis.y, _axis.z, object.rotation.y, options);
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

/**
 * **Wie eine Beschriftung der gedrehten Draufsicht folgt** — ohne Szene
 * nachrechenbar.
 *
 * Die Kamera von oben lässt sich in Vierteln drehen (`TopDownCamera.turn`).
 * Was **flach** liegt und von oben gelesen wird — der Raumname auf der Karte
 * —, stünde danach auf der Seite oder auf dem Kopf; was **aufrecht** an einer
 * Wand hängt, zeigte der Kamera die Kante oder den Rücken.
 *
 * - `flat`: um die Hochachse **mitdrehen**, um genau das Gieren der Kamera —
 *   was vorher oben im Bild lesbar war, ist es danach wieder.
 * - `upright`: nur gieren, **zur Kamera** (wie `faceCamera` mit `upright`) —
 *   ein Schild über einem Tor steht auch nach der Drehung zum Betrachter.
 * - `flip`: flach, aber nur **wenden** (halbe Drehungen) — für Schrift, die
 *   längs eines schmalen Gangs liegt und quer nicht hineinpasst. Sie steht
 *   nie auf dem Kopf; quer im Bild bleibt sie, wenn der Gang quer liegt.
 *
 * `dx`/`dz` sind die Rückachse der Kamera im Raum des Elternteils, `baseYaw`
 * das Gieren, mit dem das Stück gebaut wurde. Zurück kommt das Gieren, das
 * jetzt gilt. Norden oben (Rückachse +Z) lässt alles, wie es gebaut ist.
 */
export function viewYaw(mode: ViewTurnMode, dx: number, dz: number, baseYaw: number): number {
  if (Math.hypot(dx, dz) <= 1e-4) return baseYaw;
  const heading = Math.atan2(dx, dz);
  return mode === 'upright' ? heading : baseYaw + heading;
}

/**
 * **Ob Gangschrift gewendet werden muss** (`flip`): wenn ihre Leserichtung
 * (`readX`/`readZ`, am Boden) gegen die Rechte des Bildes (`rightX`/`rightZ`)
 * zeigt — dann stünde sie auf dem Kopf. Genau quer zum Bild bleibt sie, wie sie
 * ist.
 */
export function flipWanted(readX: number, readZ: number, rightX: number, rightZ: number): boolean {
  return readX * rightX + readZ * rightZ < -1e-6;
}

export type ViewTurnMode = 'flat' | 'flip' | 'upright';

/** Woran die Kamera von oben zu erkennen ist (`core/TopDownCamera.ts`). */
export const TOP_DOWN_CAMERA_NAME = 'top-down-camera';

/**
 * **Hängt das Mitdrehen ans Objekt** — gilt **nur in der Draufsicht**: Aus den
 * Augen, in der Brille und im Spiegel steht das Stück, wie es gebaut wurde.
 * Wie `faceCamera` beim Zeichnen gerechnet, je Kamera, einmal beim Bauen zu
 * rufen und erst, wenn das Objekt seine Kinder hat.
 *
 * Gedreht wird um die Hochachse **des Elternteils**, als Vorsatz vor die
 * gebaute Lage (`quaternion`): Ein flaches Schild bleibt flach, ein
 * aufrechtes aufrecht, gleich in welcher Reihenfolge es gebaut wurde.
 */
export function turnWithView(object: THREE.Object3D, mode: ViewTurnMode): void {
  unfaceCamera(object);
  const base = object.quaternion.clone();
  // Das Gieren, in dem das Stück gebaut wurde — für `upright` der Ausgangspunkt.
  const baseYaw = new THREE.Euler().setFromQuaternion(base, 'YXZ').y;
  const handler = (_renderer: THREE.WebGLRenderer, _scene: THREE.Scene, camera: THREE.Camera) => {
    if (camera.name !== TOP_DOWN_CAMERA_NAME) {
      if (!object.quaternion.equals(base)) {
        object.quaternion.copy(base);
        object.updateMatrix();
        object.updateMatrixWorld(true);
      }
      return;
    }
    _axis.setFromMatrixColumn(camera.matrixWorld, 2);
    const parent = object.parent;
    if (parent) _axis.transformDirection(_inverse.copy(parent.matrixWorld).invert());
    const upright = mode === 'upright';
    let turn: number;
    if (mode === 'flip') {
      // Die Leserichtung (lokal +X) gegen die Rechte des Bildes (Spalte 0).
      _read.set(1, 0, 0).applyQuaternion(base);
      _right.setFromMatrixColumn(camera.matrixWorld, 0);
      if (parent) _right.transformDirection(_inverse);
      turn = flipWanted(_read.x, _read.z, _right.x, _right.z) ? Math.PI : 0;
    } else {
      const yaw = viewYaw(mode, _axis.x, _axis.z, upright ? baseYaw : 0);
      // `flat`: Vorsatz um die Hochachse vor die gebaute Lage. `upright`: die
      // gebaute Lage ohne ihr Gieren, dann das neue davor.
      turn = upright ? yaw - baseYaw : yaw;
    }
    _turn.setFromAxisAngle(_up, turn);
    object.quaternion.multiplyQuaternions(_turn, base);
    // Von Hand: Was als fest gebaut markiert ist (`matrixAutoUpdate = false`),
    // übernähme die Drehung sonst nie.
    object.updateMatrix();
    object.updateMatrixWorld(true);
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
const _axis = new THREE.Vector3();
const _inverse = new THREE.Matrix4();
const _turn = new THREE.Quaternion();
const _read = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
