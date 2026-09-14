import * as THREE from 'three';
import { ControllerState } from '../../core/XRInput';
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
 * fehlt, fehlt ehrlich: kein Greifen, kein Stick, kein Zeigestrahl, keine
 * Vibration.
 *
 * **Sie hängt am Rig und nicht am Kopf.** Ein Werkzeug darin zeigt entlang
 * −z des Rigs, also genau dorthin, wohin die Figur schaut (`FlatControls`
 * dreht das Rig in die Laufrichtung, Paket P1 in die Zielrichtung). Die
 * Desktop-Kamera bleibt außen vor: Wohin die Maus zuletzt geschaut hat, hat
 * mit der Figur von oben nichts zu tun.
 */

/**
 * Wo die Hand sitzt, im Raum des Rigs: rechts vor der Schulter, in Metern.
 *
 * Eine Figur ist 1,8 m hoch; das hier ist die Höhe, auf der ein ausgestreckter
 * Arm eine Waffe hält, eine Handbreit rechts der Mitte und eine vor dem
 * Körper. Weiter vorn steckte der Lauf in jeder Wand, an der man steht.
 */
const HAND_AT = { x: 0.24, y: 1.2, z: -0.26 } as const;

/** Ab wann der Trigger als gedrückt gilt — dieselbe Schwelle wie am Controller. */
const TRIGGER_DOWN = 0.5;

export class ScreenHand {
  /** Der Zustand, den jedes Werkzeug zu sehen bekommt. */
  readonly state: ControllerState;
  /** Wo die Hand gerade liegt, im Raum des Rigs — der Avatar greift danach. */
  readonly at = new THREE.Vector3();

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
   */
  update(): void {
    this.place();
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

  /** Gibt die Hand zurück an den Raum; was sie hielt, räumt die Welt weg. */
  dispose(): void {
    this.state.hold.removeFromParent();
    this.grip.removeFromParent();
    this.state.reset();
  }

  /**
   * Ducken senkt das Rig und lässt die Füße stehen (`PlayerRig.getFloorY`) —
   * die Hand rechnet denselben Versatz mit, sonst wüchse sie beim Ducken aus
   * dem Kopf heraus.
   */
  private place(): void {
    this.at.set(HAND_AT.x, HAND_AT.y + this.rig.crouch - this.rig.seated, HAND_AT.z);
    this.grip.position.copy(this.at);
    this.grip.updateMatrixWorld(true);
  }
}
