import * as THREE from 'three';
import { AvatarBody, type AvatarLimb } from '../core/AvatarBody';
import { CHEF_HEIGHT } from '../core/chefFit';
import { createLighting } from '../worlds/shared/environment';

/**
 * **Die Figur auf ihrem Drehteller** — die kleine Szene neben dem Inventar
 * und unter _Aussehen_ (`ui/PlayerCard.ts`).
 *
 * Ein eigener `WebGLRenderer` in einem eigenen Canvas, ein `AvatarBody` darin,
 * dasselbe Licht wie im Spiel (`createLighting`) — und beides entsteht erst
 * beim Zeigen und ist beim Wegnehmen wieder weg. Das ist die Stelle, an der
 * man es falsch machen kann: Ein zweiter Renderer, der im Hintergrund
 * weiterläuft, kostet auf der Quest genau die Bilder, die dem Spiel fehlen.
 * Der Grund, warum es überhaupt eine zweite Szene ist und kein Ausschnitt der
 * ersten: Die Figur steht im Spiel auf einer Ebene, die nur Portale zeichnen
 * (`PlayerAvatar`, `LAYER_SELF_ONLY`), und sie steht dort, wo der Spieler
 * steht — nicht vor einem Vorhang, in den man hineinschaut.
 *
 * Bis Oktober 2026 stand sie in der Umkleide am Schirm (`WardrobeMenu`), einem
 * Kasten über dem Bild; den gibt es nicht mehr, das Aussehen ist eine Seite im
 * Menü hinter `Tab` (`ui/outfitMenu.ts`).
 */

/** Wie schnell sich die Figur von selbst dreht, in Bogenmaß je Sekunde. */
const SPIN = 0.35;
/** Und wie weit ein Wisch über die ganze Bühne sie dreht. */
const DRAG_TURN = Math.PI * 2;

/**
 * Wo die Kamera steht und wohin sie schaut.
 *
 * **Sie hängt an den Maßen der Figur und nicht an denen des Spielers** — und
 * genau das war hier einmal falsch. Die Zahlen stammten aus der Zeit, in der der
 * Avatar so hoch war wie sein Spieler: Kamera auf 1,62 m, Blick auf 1,42 m.
 * Seit die Figur ein Modell ist (`core/chefFit.ts`), ist sie 1,60 m hoch und
 * ihre Augen liegen bei 0,91 m — die Kamera schaute also gut einen halben
 * Meter über ihren Hut hinweg, und in der Umkleide stand eine Mütze am unteren
 * Bildrand. Man suchte Köpfe aus, die man nicht sah.
 *
 * **Die ganze Figur, nicht ihre obere Hälfte.** Sie ist gedrungen genug, dass
 * sie ganz ins Bild passt, ohne dass der Kopf klein wird — und die Jacke und
 * die Hände gehören zu dem, was man hier aussucht. Gezielt wird auf die Mitte
 * zwischen Fuß und Mützenspitze, die Kamera steht leicht darüber.
 */
const CAMERA_FOV = 34;
/** Wie viel Luft über und unter der Figur bleibt, als Anteil ihrer Höhe. */
const CAMERA_MARGIN = 1.18;
/** Auf halber Höhe der Figur, und von dort aus so weit weg, dass sie hineinpasst. */
const CAMERA_LOOK = new THREE.Vector3(0, CHEF_HEIGHT / 2, 0);
const CAMERA_AT = new THREE.Vector3(
  0,
  CHEF_HEIGHT * 0.62,
  (CHEF_HEIGHT * CAMERA_MARGIN) / 2 / Math.tan((CAMERA_FOV / 2) * (Math.PI / 180)),
);

/**
 * Die Kopfpose, aus der die Figur gebaut wird: aufrecht, zur Kamera gedreht.
 *
 * Es ist die Augenhöhe des **Spielers** und nicht die der Figur: `AvatarBody`
 * setzt den Kopf auf seine eigene feste Höhe (`CHEF_EYE`) und liest aus dieser
 * Pose nur noch Ort und Blickrichtung. Eine Figurenhöhe hier wäre eine Zahl,
 * die zufällig auch stimmt.
 */
const HEAD_Y = 1.62;

/**
 * Wie der Drehteller beim Öffnen steht.
 *
 * **−z ist vorn** am Avatar, die Kamera steht bei +z — ungedreht zeigte die
 * Figur also ihren Rücken, und man suchte ein Gesicht aus, das man nicht sah.
 * Eine halbe Umdrehung, und sie schaut einen an.
 *
 * Die 0,6 rad **davor** sind Absicht: Der Teller dreht weiter (`SPIN`), und
 * wer bei π anfängt, hat die Figur nach drei Sekunden wieder im Halbprofil.
 * So dreht sie in der ersten Sekunde ins Gesicht hinein und bleibt ein paar
 * Sekunden dort — lange genug, um einen Kopf auszusuchen.
 */
const FACING = Math.PI - 0.6;

/**
 * **Wischen dreht die Figur** — solange der Finger liegt. Die Geste der Figur im
 * Inventar (`ui/PlayerCard.ts`).
 */
export function turnByDrag(
  event: PointerEvent,
  stage: HTMLElement,
  view: PreviewScene | null,
): void {
  if (!view) return;
  const width = stage.clientWidth || 1;
  let last = event.clientX;
  view.spinning = false;
  stage.setPointerCapture(event.pointerId);

  const move = (e: PointerEvent): void => {
    view.turn += ((e.clientX - last) / width) * DRAG_TURN;
    last = e.clientX;
  };
  const up = (): void => {
    stage.removeEventListener('pointermove', move);
    stage.removeEventListener('pointerup', up);
    stage.removeEventListener('pointercancel', up);
    view.spinning = true;
  };
  stage.addEventListener('pointermove', move);
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);
}

/**
 * **Die Figur auf ihrem Drehteller — oder `null`**, wenn dieser Browser keinen
 * zweiten WebGL-Kontext hergibt (ohne Bild bleibt die Karte trotzdem bedienbar).
 */
export function openPreviewScene(stage: HTMLElement): PreviewScene | null {
  try {
    // Erst fragen, dann bauen: three zeichnet seit r15x nur noch auf WebGL 2,
    // und ein Renderer, der das im Konstruktor herausfindet, schreibt dabei
    // eine Fehlermeldung in die Konsole, die hier kein Fehler ist.
    if (typeof WebGL2RenderingContext === 'undefined') return null;
    return new PreviewScene(stage);
  } catch {
    return null;
  }
}

/**
 * **Die kleine Szene neben den Zeilen**: ein Renderer, ein Licht, eine Figur
 * auf einem Drehteller.
 *
 * Gedreht wird der **Teller** und nicht der Kopf. Der Körper folgt seinem Kopf
 * mit einer Totzone (`AvatarBody.update`) — wer ihn über den Kopf drehte,
 * bekäme eine Figur, die dem Blick hinterherzuckelt statt sich zu zeigen.
 */
export class PreviewScene {
  readonly body: AvatarBody;
  /** Wie weit der Teller gedreht ist, in Bogenmaß. */
  turn = FACING;
  /** Ob er sich von selbst weiterdreht — beim Wischen nicht. */
  spinning = true;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly table = new THREE.Group();
  private readonly lighting: THREE.Group;
  private readonly head: AvatarLimb = {
    position: new THREE.Vector3(0, HEAD_Y, 0),
    quaternion: new THREE.Quaternion(),
  };
  private readonly clock = new THREE.Clock();
  private frame = 0;
  private size = 0;

  constructor(private readonly stage: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio ?? 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    stage.append(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 20);
    this.camera.position.copy(CAMERA_AT);
    this.camera.lookAt(CAMERA_LOOK);

    this.lighting = createLighting(1);
    this.scene.add(this.lighting);

    // Mit Handkugeln: Ohne sie sieht die Figur von vorn abgesägt aus, und die
    // Hände sind das Einzige, woran man die Hautfarbe zweimal sieht.
    this.body = new AvatarBody({ hands: true });
    this.table.add(this.body);
    this.scene.add(this.table);

    this.loop();
  }

  dispose(): void {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.body.dispose();
    this.lighting.removeFromParent();
    this.renderer.domElement.remove();
    this.renderer.dispose();
    // Der Kontext wird knapp, wenn eine Seite ihn mehrmals aufmacht: `dispose`
    // allein gibt ihn nicht überall zurück.
    this.renderer.forceContextLoss();
  }

  private readonly loop = (): void => {
    this.frame = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.1);
    if (this.spinning) this.turn += dt * SPIN;
    this.table.rotation.y = this.turn;
    this.body.update(dt, this.head, null, null);
    this.fit();
    this.renderer.render(this.scene, this.camera);
  };

  /** Die Bühne kann ihre Größe ändern (Drehen des Telefons) — dann das Bild auch. */
  private fit(): void {
    const width = this.stage.clientWidth;
    const height = this.stage.clientHeight;
    if (width <= 0 || height <= 0) return;
    const stamp = width * 4096 + height;
    if (stamp === this.size) return;
    this.size = stamp;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
