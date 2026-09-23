import * as THREE from 'three';
import { ControllerState } from '../../core/XRInput';
import { CHEF_EYE, CHEF_TOOL, POSE_SCALE } from '../../core/chefFit';
import { screenCarryPoint, type CarrySpan, type ScreenCarryView } from '../../core/screenCarry';
import type { PlayerRig } from '../../core/PlayerRig';
import { GRIP_TO_RAY } from './tools/gripFit';
import {
  EYE_GRIP,
  EYE_GRIP_LEFT,
  EYE_SCALE,
  eyeGripRotation,
  eyeSightPose,
  type EyeHold,
  type EyePose,
  type EyeSight,
} from './eyeHand';

/** Was die Hand vor dem Auge in einem Bild wissen muss (`ScreenHand.update`). */
export interface EyeView {
  /** Wie weit das Fadenkreuz trifft, in Metern. */
  distance: number;
  /** Wie das Werkzeug im Griff liegt, oder `null` für die leere Hand. */
  hold: EyeHold | null;
  /** Die Visierlinie des Werkzeugs, oder `null`, wenn man nicht darüber zielt. */
  sight: EyeSight | null;
  /** Wie weit die Waffe gerade am Auge ist: 0 an der Hüfte, 1 im Anschlag. */
  sighting: number;
}

const _hipTurn = new THREE.Quaternion();
const _sightTurn = new THREE.Quaternion();
const _sightAt = new THREE.Vector3();
const _sightPose: EyePose = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0, w: 1 },
};

/**
 * **Die Bildschirmhand** — die rechte Hand der Figur, wenn keine Brille da
 * ist.
 *
 * Am Schreibtisch gab es bis hierher überhaupt keine Hand: Die Werkzeuge
 * hingen am Gürtel, und in die Hand kamen sie nur, wenn ein Controller sie
 * herauszog. Von oben sieht man die Figur aber, und sie soll etwas halten —
 * die Pistole vor allem, denn der Linksklick ist ihr Trigger (Plan, E5).
 *
 * Gebaut ist sie deshalb als das, was sie ersetzt: ein `ControllerState`, nur
 * ohne Controller. Damit läuft der **ganze** bestehende Weg — `takeTool`,
 * `applyHold`, `onTrigger`, die Zielkorrektur, der Rückstoß —, und es gibt
 * keine zweite Art zu schießen, die beim nächsten Umbau vergessen wird. Was
 * fehlt, fehlt ehrlich: kein Stick, kein Zeigestrahl, keine Vibration — und
 * kein *Greifen*, wohl aber ein **Tragen** (siehe unten).
 *
 * **Von oben hängt sie am Rig und nicht am Kopf.** Ein Werkzeug darin zeigt
 * entlang −z des Rigs, also genau dorthin, wohin die Figur schaut
 * (`FlatControls` dreht das Rig in die Laufrichtung, Paket P1 in die
 * Zielrichtung). Die Desktop-Kamera bleibt dort außen vor: Wohin die Maus
 * zuletzt geschaut hat, hat mit der Figur von oben nichts zu tun. **Aus den
 * Augen** ist es umgekehrt, dort hängt sie am Kopf (unten, `placeAtEye`).
 *
 * ## Und sie trägt jetzt auch etwas, das kein Werkzeug ist
 *
 * Hier stand einmal „was fehlt, fehlt ehrlich: kein Greifen". Das galt,
 * solange aus dem Beutel und dem Regal nichts anderes kam als ein Körper, der
 * vor den Kopf fiel — und genau das war der gemeldete Fehler: *„Wenn ich ein
 * Asset gewählt habe, hat der Spieler es in der Hand."*
 *
 * Also hat diese Hand einen **zweiten Anker** (`carry`), und der ist
 * absichtlich nicht der Griff: Ein Werkzeug liegt an der rechten Faust der
 * Figur (`CHEF_TOOL`), ein getragener Gegenstand vor ihrem Bauch oder — aus
 * den Augen — vor der Kamera. Wo genau, rechnet `core/screenCarry.ts`; hier
 * wird er nur hingehängt. Der Körper, der daran hängt, ist ein ganz normaler
 * Nahgriff (`PortalWorld.attach`), nur dass die Hand keine getrackte ist.
 *
 * **Und es gibt sie jetzt in beiden flachen Ansichten**, nicht mehr nur von
 * oben — und **in beiden hält sie ihr Werkzeug**. Aus den Augen hielt sie
 * lange keines (dort schoss die Maus die Portale), und damit war aus den
 * Augen weder eine Hand zu sehen noch zu schießen. Jetzt hängt sie dort **vor
 * der Kamera**, unten rechts, wie in jedem Ego-Shooter (`eyeHand.ts`): Der
 * Griff steht darin genau wie an einem Controller, also sitzt jede
 * eingemessene Faust und jede Werkzeug-Pose, und die Hand dazu zeichnet
 * dieselbe `HandVisuals` wie in der Brille. Daneben steht eine **linke** —
 * nur zum Ansehen, sie hält nichts und bedient nichts (`offHand`).
 */

/** Ab wann der Trigger als gedrückt gilt — dieselbe Schwelle wie am Controller. */
const TRIGGER_DOWN = 0.5;

export class ScreenHand {
  /** Der Zustand, den jedes Werkzeug zu sehen bekommt. */
  readonly state: ControllerState;
  /** Wo die Hand gerade liegt, im Raum des Rigs — der Avatar greift danach. */
  readonly at = new THREE.Vector3();

  /**
   * **Woran ein getragener Gegenstand hängt** — im Raum des Rigs und in
   * seiner Größe, nicht in der der Figur.
   *
   * Nicht im Griff (`grip`), und das ist wichtig: Der ist auf Figurenmaß
   * gestaucht (`POSE_SCALE`), damit eine Pistole in dieser Faust kein Balken
   * ist. Ein Fass aus dem Regal soll aber so groß bleiben, wie es ist — es
   * liegt ja auch nach dem Loslassen so im Raum.
   */
  readonly carry = new THREE.Group();

  /**
   * **Die linke Hand vor dem Auge** — nur zum Ansehen.
   *
   * Sie ist ein `ControllerState` wie die rechte, damit `HandVisuals` sie
   * zeichnen kann wie jede andere Hand; die Welt kennt sie nicht, und kein
   * Werkzeug bekommt sie je zu sehen.
   */
  readonly offHand: ControllerState;

  /**
   * **Woran der Griff hängt**: von oben am Rig (und dann ohne eigene Lage),
   * aus den Augen an der Kamera — dort trägt es die Lage vor dem Auge.
   *
   * Ein eigener Knoten und nicht der Griff selbst, weil die Zielkorrektur
   * (`Tool.aimQuaternion`) die **Ortsdrehung** des Griffs gegen die des
   * Strahls rechnet: Der Griff bleibt deshalb ungedreht in seinem Halter, und
   * gedreht wird der Halter.
   */
  private readonly pivot = new THREE.Group();
  private readonly offPivot = new THREE.Group();
  private readonly grip = new THREE.Group();
  private readonly ray = new THREE.Group();
  private down = false;
  /** Ob die Hand gerade vor dem Auge hängt — sonst steht sie an der Figur. */
  private eye = false;

  constructor(private readonly rig: PlayerRig) {
    this.grip.name = 'screen-hand';
    this.ray.name = 'screen-hand-ray';
    // Der Zeigestrahl sitzt im Griff und ist mit ihm identisch gedreht: Damit
    // ist die Zielkorrektur (`tools/aim.aimRotation`) die Einheitsdrehung, und
    // ein Werkzeug zeigt genau dorthin, wohin die Hand zeigt.
    this.grip.add(this.ray);
    this.pivot.name = 'screen-hand-pivot';
    this.pivot.add(this.grip);
    rig.add(this.pivot);
    this.carry.name = 'screen-carry';
    rig.add(this.carry);

    this.state = new ControllerState(
      2,
      this.ray,
      this.grip,
      // Eine bloße Hand ist sie nicht (`isHand` bleibt falsch), also wird
      // dieses Feld nie gelesen — es gehört trotzdem zur Form.
      new THREE.Group() as unknown as THREE.XRHandSpace,
    );
    this.state.connected = true;
    this.state.handedness = 'right';
    this.grip.visible = true;
    this.ray.visible = true;
    this.grip.add(this.state.hold);

    const offGrip = new THREE.Group();
    const offRay = new THREE.Group();
    offGrip.name = 'screen-off-hand';
    offGrip.add(offRay);
    offRay.quaternion.set(GRIP_TO_RAY.x, GRIP_TO_RAY.y, GRIP_TO_RAY.z, GRIP_TO_RAY.w);
    this.offPivot.name = 'screen-off-hand-pivot';
    this.offPivot.add(offGrip);
    this.offHand = new ControllerState(
      3,
      offRay,
      offGrip,
      new THREE.Group() as unknown as THREE.XRHandSpace,
    );
    this.offHand.connected = true;
    this.offHand.handedness = 'left';
    this.place();
  }

  /**
   * **Ein Bild weiter**: die Hand an ihren Platz, und der Trigger von der
   * Eingabe (`PlayerRig.setTrigger`) auf die Flanken, die ein Werkzeug kennt.
   *
   * @param stretch wie hoch die Figur in diesem Bild steht (`AvatarBody.stretch`)
   * @param eye     aus den Augen: wohin gezielt wird und wie das Werkzeug im
   *                Griff liegt (`eyeHand.ts`); `null` von oben
   */
  update(stretch = 1, eye: EyeView | null = null): void {
    if (eye) this.placeAtEye(eye);
    else this.place(stretch);
    const value = this.rig.trigger;
    const down = value > TRIGGER_DOWN;
    if (down !== this.down) {
      this.down = down;
      if (down) this.state.trigger.press();
      else this.state.trigger.release();
    }
    this.state.trigger.beginFrame();
    this.state.trigger.value = value;
  }

  /**
   * **Den Trage-Anker an seinen Platz** — je Bild, solange etwas daran hängt.
   *
   * Die Stelle kommt aus `core/screenCarry.ts` und nicht von hier: Sie hängt
   * an der Ansicht und an der Größe des Getragenen, und beides ist Rechnung
   * und keine Darstellung.
   */
  placeCarry(view: ScreenCarryView, span: CarrySpan, bob: number, stretch = 1): void {
    const at = screenCarryPoint(view, span, this.rig.camera.position.y, bob, stretch);
    this.carry.position.set(at.x, at.y, at.z);
    this.carry.updateMatrixWorld(true);
  }

  /** Gibt die Hand zurück an den Raum; was sie hielt, räumt die Welt weg. */
  dispose(): void {
    this.state.hold.removeFromParent();
    this.grip.removeFromParent();
    this.pivot.removeFromParent();
    this.offPivot.removeFromParent();
    this.carry.removeFromParent();
    this.state.reset();
    this.offHand.reset();
  }

  /**
   * **Die Hand vor das Auge** — unten rechts im Bild, auf das Fadenkreuz
   * gedreht (`eyeHand.ts`), halb so groß wie in echt (`EYE_SCALE`).
   *
   * **Und beim Zielen am Auge** (`EyeView.sighting`): Die Lage wandert von der
   * Hüfte zu der, in der die Visierlinie auf der Blickachse liegt
   * (`eyeSightPose`) — Stelle und Drehung zugleich, damit die Waffe auf dem
   * Weg nicht durchs Bild kippt.
   *
   * Der Zeigestrahl steht dabei gegen den Griff wie an einem Controller
   * (`GRIP_TO_RAY`), und das ist der ganze Trick: Die Zielkorrektur jedes
   * Werkzeugs ist damit dieselbe wie in der Brille, also liegt die Pistole
   * so in der gezeichneten Faust wie dort.
   */
  private placeAtEye(view: EyeView): void {
    const { distance, hold, sight, sighting } = view;
    const camera = this.rig.camera;
    if (!this.eye) {
      this.eye = true;
      camera.add(this.pivot);
      camera.add(this.offPivot);
      this.grip.position.set(0, 0, 0);
      this.grip.scale.setScalar(1);
      this.ray.quaternion.set(GRIP_TO_RAY.x, GRIP_TO_RAY.y, GRIP_TO_RAY.z, GRIP_TO_RAY.w);
    }
    this.pivot.position.set(EYE_GRIP.x, EYE_GRIP.y, EYE_GRIP.z);
    eyeGripRotation(EYE_GRIP, hold, distance, _hipTurn, EYE_SCALE);
    this.pivot.quaternion.copy(_hipTurn);
    let scale = EYE_SCALE;
    if (hold && sight && sighting > 0) {
      eyeSightPose(hold, sight, sight.scale, _sightPose);
      const at = _sightPose.position;
      const turn = _sightPose.rotation;
      // Weich hinein und hinaus, damit das Anlegen nicht wie ein Sprung aussieht.
      const t = sighting * sighting * (3 - 2 * sighting);
      this.pivot.position.lerp(_sightAt.set(at.x, at.y, at.z), t);
      this.pivot.quaternion.slerp(_sightTurn.set(turn.x, turn.y, turn.z, turn.w), t);
      scale += (sight.scale - EYE_SCALE) * t;
    }
    this.pivot.scale.setScalar(scale);
    this.offPivot.position.set(EYE_GRIP_LEFT.x, EYE_GRIP_LEFT.y, EYE_GRIP_LEFT.z);
    eyeGripRotation(EYE_GRIP_LEFT, null, distance, this.offPivot.quaternion);
    this.offPivot.scale.setScalar(EYE_SCALE);
    this.pivot.updateMatrixWorld(true);
    this.offPivot.updateMatrixWorld(true);
  }

  /**
   * **Die Hand an ihren Platz** — und der ist eine Stelle an der **Figur**
   * (`core/chefFit.CHEF_TOOL`) und keine am Spieler.
   *
   * Hier stand eine feste Höhe von 1,20 m: die Höhe, auf der ein ausgestreckter
   * Menschenarm eine Waffe hält. Die Figur, die man von oben sieht, ist aber
   * 1,60 m hoch und ihre Augen liegen bei 0,91 m (`core/chefFit.ts`) — die
   * Pistole schwebte damit über ihrer Faust, und sie hatte obendrein
   * Spielergröße, war in dieser Hand also ein Balken. Genau das war gemeint
   * mit „die Werkzeuge sitzen zu hoch".
   *
   * Gerechnet wird deshalb **andersherum**: Die Stelle an der Figur steht
   * fest, und `at` ist die Pose, aus der der Avatar wieder genau diese Stelle
   * macht. Er staucht jede Handpose auf Figurenmaß (`AvatarBody.update`,
   * `POSE_SCALE`) — hier steht die Umkehrung davon und keine zweite geratene
   * Zahl, die beim nächsten Umbau danebenläge.
   *
   * **Und sie federt mit der Figur.** Seit diese sich beim Laufen staucht und
   * beim Stehen atmet (`core/squish.ts`), ist `CHEF_TOOL.y` keine feste Höhe
   * mehr, sondern eine an einem Körper, der gerade flacher oder länger ist —
   * also geht sie mit seiner Höhe mal (`AvatarBody.stretch`). Ohne das blieb
   * die Pistole von oben ruhig in der Luft stehen, während die Faust darunter
   * bei jedem Schritt auf und ab ging: Diese Hand hängt am **Rig** und nicht
   * an der Figur (siehe oben), sie bekommt die Stauchung also nicht geschenkt.
   *
   * Die **Waagerechte** bleibt, wie sie ist. Beim Strecken wird die Figur
   * schmaler, und ein Werkzeug, das dabei nach innen rutschte, steckte im
   * Ärmel — die Hand daneben rechnet aus demselben Grund nur ihre freie
   * Ruhelage mit der Breite (`AvatarBody.update`), nicht eine gehaltene Pose.
   */
  private place(stretch = 1): void {
    if (this.eye) {
      // Zurück an die Figur: der Halter ans Rig und ohne eigene Lage, und der
      // Strahl wieder im Griff — von oben zeigt ein Werkzeug die Rigachse
      // entlang, dorthin, wohin die Figur schaut.
      this.eye = false;
      this.rig.add(this.pivot);
      this.offPivot.removeFromParent();
      this.pivot.position.set(0, 0, 0);
      this.pivot.quaternion.identity();
      this.pivot.scale.setScalar(1);
      this.ray.quaternion.identity();
    }
    // Der Kopf im Raum des Rigs — ohne Brille sitzt die Kamera genau dort, und
    // sie bleibt dort: Ducken senkt das **Rig** und nicht die Kamera darin
    // (`PlayerRig.getFloorY`), und der Avatar hängt am Rig.
    const headY = this.rig.camera.position.y;
    // **Die Pose, aus der der Avatar wieder `CHEF_TOOL` macht.** Er staucht
    // jede Handpose auf Figurenmaß (`AvatarBody.update`, `POSE_SCALE`); damit
    // die Hand genau dort landet, wo das Werkzeug liegt, wird hier die
    // Umkehrung gerechnet und nicht eine zweite Zahl geraten.
    const toolY = CHEF_TOOL.y * stretch;
    this.at.set(
      CHEF_TOOL.x / POSE_SCALE,
      headY + (toolY - CHEF_EYE) / POSE_SCALE,
      CHEF_TOOL.z / POSE_SCALE,
    );
    // Und der Griff selbst steht direkt an der Stelle — in Figurengröße, damit
    // ein Werkzeug in dieser Faust kein Balken ist.
    this.grip.position.set(CHEF_TOOL.x, toolY, CHEF_TOOL.z);
    this.grip.scale.setScalar(POSE_SCALE);
    this.grip.updateMatrixWorld(true);
  }
}
