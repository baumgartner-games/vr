import * as THREE from 'three';
import { ControllerState } from '../../core/XRInput';
import { CHEF_EYE, CHEF_TOOL, POSE_SCALE } from '../../core/chefFit';
import { screenCarryPoint, type CarrySpan, type ScreenCarryView } from '../../core/screenCarry';
import type { PlayerRig } from '../../core/PlayerRig';

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
 * **Sie hängt am Rig und nicht am Kopf.** Ein Werkzeug darin zeigt entlang
 * −z des Rigs, also genau dorthin, wohin die Figur schaut (`FlatControls`
 * dreht das Rig in die Laufrichtung, Paket P1 in die Zielrichtung). Die
 * Desktop-Kamera bleibt außen vor: Wohin die Maus zuletzt geschaut hat, hat
 * mit der Figur von oben nichts zu tun.
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
 * oben: Aus den Augen hält sie kein Werkzeug (dort schießt die Maus die
 * Portale), aber tragen soll die Figur auch dort.
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

  private readonly grip = new THREE.Group();
  private readonly ray = new THREE.Group();
  private down = false;

  constructor(private readonly rig: PlayerRig) {
    this.grip.name = 'screen-hand';
    this.ray.name = 'screen-hand-ray';
    // Der Zeigestrahl sitzt im Griff und ist mit ihm identisch gedreht: Damit
    // ist die Zielkorrektur (`tools/aim.aimRotation`) die Einheitsdrehung, und
    // ein Werkzeug zeigt genau dorthin, wohin die Hand zeigt.
    this.grip.add(this.ray);
    rig.add(this.grip);
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
    this.place();
  }

  /**
   * **Ein Bild weiter**: die Hand an ihren Platz, und der Trigger von der
   * Eingabe (`PlayerRig.setTrigger`) auf die Flanken, die ein Werkzeug kennt.
   *
   * @param stretch wie hoch die Figur in diesem Bild steht (`AvatarBody.stretch`)
   */
  update(stretch = 1): void {
    this.place(stretch);
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
    this.carry.removeFromParent();
    this.state.reset();
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
