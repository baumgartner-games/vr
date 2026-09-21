import * as THREE from 'three';
import { PlayerRig } from './PlayerRig';
import { EYE_SCALE_RANGE } from './posture';
import { ButtonState, type XRInput } from './XRInput';

/**
 * **Versetzt werden die Füße, nicht der Ursprung** (`PlayerRig.placeFeetAt`).
 *
 * In der Brille steht der Kopf dort, wo man im Spielraum gerade steht — selten
 * über dem Ursprung des Rigs. `placeAt` setzt den Ursprung; wer damit den
 * Spieler an einen Punkt bringen wollte, setzte ihn um den eigenen Abstand
 * daneben, beim Missionsstart in die Wand. Hier ein Kopf 1,4 m neben der Mitte.
 */
function rig(): PlayerRig {
  const renderer = { xr: { isPresenting: false } } as unknown as THREE.WebGLRenderer;
  return new PlayerRig(renderer, new THREE.PerspectiveCamera());
}

describe('PlayerRig.placeFeetAt', () => {
  it('bringt den Kopf über den Punkt, auch wenn er neben dem Ursprung steht', () => {
    const player = rig();
    player.camera.position.set(1.4, 1.65, 0.9);
    const head = new THREE.Vector3();
    player.placeAt(new THREE.Vector3(0, 0, -53.5), 0);
    player.getHeadPosition(head);
    expect(head.x).toBeCloseTo(1.4);
    expect(head.z).toBeCloseTo(-52.6);

    player.placeFeetAt(new THREE.Vector3(0, 0, -53.5), 0);
    player.getHeadPosition(head);
    expect(head.x).toBeCloseTo(0);
    expect(head.z).toBeCloseTo(-53.5);
    expect(head.y).toBeCloseTo(1.65);
    expect(player.getFloorY()).toBeCloseTo(0);
  });

  it('rechnet den Versatz nach dem Drehen — er dreht sich mit', () => {
    const player = rig();
    player.camera.position.set(1.4, 1.65, 0.9);
    const head = new THREE.Vector3();
    player.placeFeetAt(new THREE.Vector3(3, 0.25, 7), Math.PI / 2);
    player.getHeadPosition(head);
    expect(head.x).toBeCloseTo(3);
    expect(head.z).toBeCloseTo(7);
    expect(player.getFloorY()).toBeCloseTo(0.25);
    // Die Blickrichtung ist die gewünschte, nicht die alte.
    const forward = player.getHeadForward(new THREE.Vector3());
    expect(forward.x).toBeCloseTo(-1);
    expect(forward.z).toBeCloseTo(0);
  });

  it('ändert am Bildschirm nichts — dort sitzt die Kamera über dem Ursprung', () => {
    const player = rig();
    player.placeFeetAt(new THREE.Vector3(2, 0, -1), 0.3);
    expect(player.position.x).toBeCloseTo(2);
    expect(player.position.z).toBeCloseTo(-1);
  });
});

/**
 * **Wer sitzt, steht trotzdem auf dem Boden** (`PlayerRig.placeAt`).
 *
 * Die Sitz-Anhebung schiebt das Rig nach oben und lässt die Füße stehen
 * (`updateSeatLift`, `getFloorY`). `placeAt` rechnete nur das Ducken heraus
 * und nicht die Anhebung: Ein sitzender Spieler landete bei jedem Versetzen
 * um seine ganze Anhebung **unter** dem Punkt — nach dem Schutzschrank, beim
 * Rundenstart, und auch der Rettungsknopf setzte ihn wieder genauso tief.
 */
describe('PlayerRig.placeAt im Sitzen', () => {
  function seated(): PlayerRig {
    const player = rig();
    player.posture = 'sit';
    player.seatHeight = 0.4;
    player.camera.position.set(0, 1.2, 0);
    // Ein langes Bild in der Brille: die Anhebung ist danach vollständig da.
    const input = { get: () => undefined } as unknown as Parameters<PlayerRig['update']>[1];
    player.update(1, input, true);
    expect(player.seated).toBeCloseTo(0.4);
    return player;
  }

  it('setzt die Füße auf den Punkt und nicht die Anhebung darunter', () => {
    const player = seated();
    player.placeAt(new THREE.Vector3(2, 0.3, -4), 0);
    expect(player.getFloorY()).toBeCloseTo(0.3);
    const head = player.getHeadPosition(new THREE.Vector3());
    expect(head.y).toBeCloseTo(0.3 + 1.2 + 0.4);
  });

  it('gilt genauso für die Füße unter dem Kopf', () => {
    const player = seated();
    player.camera.position.set(0.8, 1.2, -0.5);
    player.placeFeetAt(new THREE.Vector3(-3, 0, 6), 1);
    expect(player.getFloorY()).toBeCloseTo(0);
    const head = player.getHeadPosition(new THREE.Vector3());
    expect(head.x).toBeCloseTo(-3);
    expect(head.z).toBeCloseTo(6);
    expect(head.y).toBeCloseTo(1.6);
  });
});

/**
 * **Die Küche ist klein, also wird der Spieler es auch** (`PlayerRig.eyeScale`).
 *
 * Die Möbel der Küche sind halbiert und die Kochfigur 1,60 m hoch
 * (`core/kitchenFit.ts`, `core/chefFit.ts`); wer dort mit seinen echten 1,65 m
 * steht, schaut von oben in eine Puppenstube. Die Antwort ist eine **Stauchung
 * der Augenhöhe**, kein fester Versatz — und was das für einen Unterschied
 * macht, steht in der letzten Prüfung dieser Gruppe: Ein fester Versatz zöge
 * den Gebückten unter den Boden, ein Faktor lässt die Null die Null.
 */
describe('PlayerRig.eyeScale — die Augenhöhe in der Küche', () => {
  /** 165 cm echte Augenhöhe auf 140 cm Küchenhöhe. */
  const SCALE = 1.4 / 1.65;

  /** Ein langes Bild in der Brille: die Rampe ist danach vollständig durch. */
  function frame(player: PlayerRig, presenting = true, dt = 1): void {
    const input = { get: () => undefined } as unknown as Parameters<PlayerRig['update']>[1];
    player.update(dt, input, presenting);
  }

  function standing(): PlayerRig {
    const player = rig();
    player.camera.position.set(0, 1.65, 0);
    player.eyeScale = SCALE;
    frame(player);
    return player;
  }

  it('bringt den stehenden Spieler auf die eingestellte Höhe — die Füße bleiben', () => {
    const player = standing();
    expect(player.getHeadHeight()).toBeCloseTo(1.4, 4);
    expect(player.getFloorY()).toBeCloseTo(0, 4);
    expect(player.squash).toBeCloseTo(0.25, 4);
  });

  /**
   * Der Sitzende ist über seine Anhebung schon auf Stehhöhe (`seatedLift`);
   * die Stauchung rechnet auf **dieser** Höhe und nicht auf der rohen
   * Kopfhöhe — sonst säße er in der Küche 20 cm tiefer als der Stehende
   * daneben.
   */
  it('rechnet beim Sitzenden auf der angehobenen Höhe', () => {
    const player = rig();
    player.posture = 'sit';
    player.seatHeight = 0.45;
    player.camera.position.set(0, 1.2, 0);
    player.eyeScale = SCALE;
    frame(player);
    expect(player.seated).toBeCloseTo(0.45, 4);
    expect(player.getHeadHeight()).toBeCloseTo(1.4, 4);
    expect(player.getFloorY()).toBeCloseTo(0, 4);
  });

  it('lässt bei 1 alles, wie es ist', () => {
    const player = rig();
    player.camera.position.set(0, 1.65, 0);
    frame(player);
    expect(player.squash).toBe(0);
    expect(player.getHeadHeight()).toBeCloseTo(1.65, 6);
  });

  /**
   * **Am Bildschirm nicht** — weder von oben noch aus den Augen. Dort setzt
   * das Spiel die Kamera selbst, und eine Welt, die eine Brille korrigiert,
   * die gar nicht auf ist, verschiebt nur den Boden.
   */
  it('wirkt nicht am Bildschirm und geht nach dem Absetzen zurück', () => {
    const player = standing();
    expect(player.squash).toBeCloseTo(0.25, 4);
    // Brille ab: dieselbe Rampe zurück auf null.
    frame(player, false);
    expect(player.squash).toBeCloseTo(0, 4);
    expect(player.getHeadHeight()).toBeCloseTo(1.65, 4);
    expect(player.getFloorY()).toBeCloseTo(0, 4);
  });

  /**
   * **Die Prüfung, an der die ganze Entscheidung hängt.** Wer sich in der
   * Küche bis zum Boden bückt, kommt bis zum Boden — anteilig tiefer, aber
   * nie darunter. Ein fester Versatz von 25 cm hätte den Kopf auf 20 cm
   * Höhe fünf Zentimeter **unter** den Estrich gezogen.
   */
  it('lässt das Bücken ein Bücken sein', () => {
    const player = standing();
    for (const head of [1.2, 0.8, 0.4, 0.2, 0.05]) {
      player.camera.position.y = head;
      frame(player);
      const eye = player.camera.position.y - player.squash;
      expect(eye).toBeCloseTo(head * SCALE, 4);
      expect(eye).toBeGreaterThan(0);
      expect(player.getFloorY()).toBeCloseTo(0, 4);
    }
  });

  it('setzt einen sehr kleinen Spieler herauf statt herunter', () => {
    const player = rig();
    player.camera.position.set(0, 1.2, 0);
    player.eyeScale = 1.4 / 1.2;
    frame(player);
    expect(player.getHeadHeight()).toBeCloseTo(1.4, 4);
    expect(player.squash).toBeLessThan(0);
    expect(player.getFloorY()).toBeCloseTo(0, 4);
  });

  it('setzt die Füße beim Versetzen auf den Punkt und nicht die Stauchung darüber', () => {
    const player = standing();
    player.placeAt(new THREE.Vector3(2, 0.3, -4), 0);
    expect(player.getFloorY()).toBeCloseTo(0.3, 4);
    expect(player.getHeadPosition(new THREE.Vector3()).y).toBeCloseTo(0.3 + 1.4, 4);
  });

  it('nimmt die Stauchung nicht in die nächste Welt mit', () => {
    const player = standing();
    player.standUp();
    expect(player.squash).toBe(0);
    expect(player.eyeScale).toBe(1);
    expect(player.getFloorY()).toBeCloseTo(player.position.y, 6);
  });

  /**
   * Eine Stauchung, die eine Welt aus Versehen auf 0 oder 20 setzt, darf den
   * Spieler nicht in den Himmel oder in den Estrich schießen
   * (`posture.EYE_SCALE_RANGE`).
   */
  it('begrenzt, was eine Welt verlangen darf', () => {
    const player = rig();
    player.camera.position.set(0, 1.65, 0);
    player.eyeScale = 0;
    frame(player);
    expect(player.getHeadHeight()).toBeCloseTo(1.65 * EYE_SCALE_RANGE.min, 4);

    player.eyeScale = 20;
    frame(player);
    expect(player.getHeadHeight()).toBeCloseTo(1.65 * EYE_SCALE_RANGE.max, 4);
  });
});

/**
 * **Der Kopf schaut hin, nicht das Rig** (`PlayerRig.turnHeadTo`).
 *
 * In der Brille legt das Headset seine Drehung auf die des Rigs; ein Rig, das
 * nach Norden zeigt, heißt nicht, dass der Spieler nach Norden schaut. Hier
 * trägt die Kamera eine eigene Drehung — so wie ein Kopf, der im Spielraum
 * nach links gedreht ist — und der Spieler soll trotzdem in eine bestimmte
 * Richtung sehen, ohne dass sein Kopf dabei von der Stelle geht.
 */
describe('PlayerRig.turnHeadTo', () => {
  it('dreht um den Kopf, bis der Kopf in die Richtung schaut', () => {
    const player = rig();
    player.camera.position.set(0.6, 1.65, -0.3);
    player.camera.rotation.y = 0.7;
    player.placeFeetAt(new THREE.Vector3(4, 0, 9), Math.PI);
    const before = player.getHeadForward(new THREE.Vector3());
    // Das Rig zeigt nach Süden, der Kopf um 0,7 rad daran vorbei.
    expect(Math.atan2(-before.x, -before.z)).toBeCloseTo(Math.PI + 0.7 - 2 * Math.PI);

    player.turnHeadTo(Math.PI);
    const forward = player.getHeadForward(new THREE.Vector3());
    expect(forward.x).toBeCloseTo(0);
    expect(forward.z).toBeCloseTo(1);
    const head = player.getHeadPosition(new THREE.Vector3());
    expect(head.x).toBeCloseTo(4);
    expect(head.z).toBeCloseTo(9);
  });

  it('ist am Bildschirm ein Nichts — dort dreht sich die Kamera nicht selbst', () => {
    const player = rig();
    player.placeFeetAt(new THREE.Vector3(0, 0, 0), 0.4);
    player.turnHeadTo(0.4);
    expect(new THREE.Euler().setFromQuaternion(player.quaternion, 'YXZ').y).toBeCloseTo(0.4);
  });
});

/**
 * **`A` ist ein Knopf für zwei Dinge** (`PlayerRig.useCandidate`).
 *
 * In der Brille sprang `A` bisher immer — auch direkt vor einer Tür, einem
 * Knopf oder einem Kart, in das man einsteigen wollte. Jetzt sagt die Welt
 * jedes Bild, ob etwas in Reichweite steht, und dieselbe Taste tut das
 * Naheliegende: benutzen, wenn es etwas zu benutzen gibt, sonst springen. Wer
 * das verwechselt, hüpft vor jeder Tür oder springt nie wieder.
 */
describe('Der A-Knopf in der Brille', () => {
  /** Ein Eingabegerät mit genau einem Knopf: `A` der rechten Hand. */
  function pressedInput(): { input: XRInput; a: ButtonState } {
    const a = new ButtonState();
    a.press();
    a.beginFrame();
    const right = { primary: a, stick: new ButtonState(), thumbstick: { x: 0, y: 0 } };
    const input = {
      get: (hand: string) => (hand === 'right' ? right : null),
      controllers: [],
    } as unknown as XRInput;
    return { input, a };
  }

  it('springt, solange nichts in Reichweite steht', () => {
    const player = rig();
    const { input } = pressedInput();
    let jumped = false;
    player.locomotion = { apply: (_rig, _intent, jump) => void (jumped = jump) };

    player.update(1 / 60, input, true);
    expect(jumped).toBe(true);
    expect(player.takeUse()).toBe(false);
  });

  it('benutzt, sobald etwas dasteht — und springt dann nicht', () => {
    const player = rig();
    const { input } = pressedInput();
    let jumped = false;
    player.locomotion = { apply: (_rig, _intent, jump) => void (jumped = jump) };
    player.useCandidate = true;

    player.update(1 / 60, input, true);
    expect(jumped).toBe(false);
    // Eine Flanke: einmal gelesen, einmal weg.
    expect(player.takeUse()).toBe(true);
    expect(player.takeUse()).toBe(false);
  });

  /**
   * **Und was die Figur _trägt_, hat denselben Vorrang** (`useBusy`).
   *
   * Der Feuerlöscher hört von oben und am Schirm auf denselben Knopf; ohne
   * diese Auskunft ging er an, **und** die Figur hüpfte dazu. Ein Knopf, zwei
   * Wirkungen auf einmal — genau der Fehler, gegen den schon `useCandidate`
   * steht, nur mit dem Getragenen statt dem Danebenstehenden.
   */
  it('springt nicht, solange der Knopf dem Getragenen gehört', () => {
    const player = rig();
    const { input } = pressedInput();
    let jumped = false;
    player.locomotion = { apply: (_rig, _intent, jump) => void (jumped = jump) };
    player.useBusy = true;

    player.update(1 / 60, input, true);
    expect(jumped).toBe(false);
    // Und benutzt wird auch nichts: Es steht ja nichts da.
    expect(player.takeUse()).toBe(false);
  });

  it('vergisst die Auskunft beim Aufstehen — sie gehört der Welt von eben', () => {
    const player = rig();
    player.useCandidate = true;
    player.useBusy = true;
    player.standUp();
    expect(player.useCandidate).toBe(false);
    expect(player.useBusy).toBe(false);
  });
});

/**
 * **Der Kopf bewegt sich mit** — in allen drei Achsen (`PlayerRig`).
 *
 * In der Brille misst das Headset, wo der Kopf steht, und `three` setzt die
 * Kamera im Rig auf genau diesen Punkt. Wer sich nach links, rechts oder vorn
 * beugt, verschiebt damit `camera.position` in **x** und **z** — und das muss
 * unangetastet in der Welt ankommen. Kommt es das nicht, bleibt das Bild
 * stehen, während das Innenohr Bewegung meldet: 3DoF statt 6DoF, und davon
 * wird einem in der Brille schlecht.
 *
 * Die Stauchung der Küche (`eyeScale`) darf daran nichts ändern. Sie staucht
 * den **Abstand zum Boden** und sonst nichts; x und z gehen sie nichts an.
 */
describe('Der Kopfversatz der Brille', () => {
  /** 165 cm echte Augenhöhe auf 140 cm Küchenhöhe. */
  const SCALE = 1.4 / 1.65;
  const input = { get: () => undefined } as unknown as Parameters<PlayerRig['update']>[1];

  /**
   * Ein Bild in der Brille — lang genug, dass die Rampe der Stauchung durch
   * ist. Die Matrizen zieht die Brille sonst selbst nach
   * (`renderer.xr.updateCamera`); hier tut es der Test.
   */
  function frame(player: PlayerRig, dt = 1): void {
    player.update(dt, input, true);
    player.updateMatrixWorld(true);
  }

  /** Ein Rig, das in der Brille steckt: die Kamera trägt den gemessenen Kopf. */
  function headset(scale = 1): PlayerRig {
    const player = rig();
    player.camera.position.set(0, 1.65, 0);
    player.eyeScale = scale;
    frame(player);
    return player;
  }

  /**
   * Den Kopf im Spielraum versetzen und ein Bild rechnen. Ein kurzes Bild
   * reicht für x und z — sie kennen keine Rampe; die Höhe braucht ein langes,
   * bis die Stauchung ihr nachgezogen ist.
   */
  function lean(player: PlayerRig, x: number, y: number, z: number, dt = 1 / 90): THREE.Vector3 {
    player.camera.position.set(x, y, z);
    frame(player, dt);
    return player.getHeadPosition(new THREE.Vector3());
  }

  /** Vier Richtungen: links, rechts, nach vorn und schräg. */
  const SIDES = [
    [-0.35, 0],
    [0.4, 0],
    [0, -0.3],
    [0.25, 0.2],
  ] as const;

  it('kommt ungestaucht in allen drei Achsen an', () => {
    const player = headset();
    for (const [x, z] of SIDES) {
      const head = lean(player, x, 1.65, z);
      expect(head.x).toBeCloseTo(x, 6);
      expect(head.z).toBeCloseTo(z, 6);
      expect(head.y).toBeCloseTo(1.65, 6);
    }
  });

  /**
   * **Und gestaucht genauso.** Das ist die Prüfung, an der die Küche hängt:
   * Der Faktor greift an der Höhe an und an nichts sonst.
   */
  it('kommt gestaucht in x und z unverändert an — nur die Höhe wird gestaucht', () => {
    const player = headset(SCALE);
    expect(player.squash).toBeCloseTo(1.65 * (1 - SCALE), 4);
    expect(player.getHeadPosition(new THREE.Vector3()).y).toBeCloseTo(1.4, 4);

    for (const [x, z] of SIDES) {
      const head = lean(player, x, 1.65, z);
      expect(head.x).toBeCloseTo(x, 6);
      expect(head.z).toBeCloseTo(z, 6);
      // Die Höhe bleibt die gestauchte und wandert nicht mit.
      expect(head.y).toBeCloseTo(1.4, 4);
      expect(player.getFloorY()).toBeCloseTo(0, 4);
    }
  });

  /**
   * Beugen heißt: zur Seite **und** nach unten. Die Seite kommt ganz an, die
   * Höhe anteilig — und die Füße bleiben, wo sie waren.
   */
  it('beugt sich anteilig hinunter und dabei ganz zur Seite', () => {
    const player = headset(SCALE);
    for (const [x, y, z] of [
      [0.3, 1.2, -0.2],
      [-0.25, 0.8, 0.15],
      [0.1, 0.4, -0.4],
      [0, 0.05, 0],
    ] as const) {
      const head = lean(player, x, y, z, 1);
      expect(head.x).toBeCloseTo(x, 6);
      expect(head.z).toBeCloseTo(z, 6);
      expect(head.y).toBeCloseTo(y * SCALE, 4);
      // Die Null bleibt die Null: nie unter den Estrich.
      expect(head.y).toBeGreaterThan(0);
      expect(player.getFloorY()).toBeCloseTo(0, 4);
    }
  });

  /**
   * Ducken und Sitz-Anhebung sind die beiden anderen Verschiebungen des Rigs
   * (`crouchOffset`, `seatLift`). Auch sie rechnen an der Höhe und nirgends
   * sonst — ein Kopf neben der Mitte des Spielraums bleibt daneben.
   */
  it('bleibt beim Ducken und beim Sitzen, wo er ist', () => {
    const player = rig();
    player.camera.position.set(0.7, 1.65, -0.45);
    frame(player);
    const standing = player.getHeadPosition(new THREE.Vector3());
    expect(standing.x).toBeCloseTo(0.7, 6);
    expect(standing.z).toBeCloseTo(-0.45, 6);

    // Ducken: das Rig sinkt, die Füße bleiben, x und z rühren sich nicht.
    player.updateDesktopCrouch(true, 1);
    const ducked = player.getHeadPosition(new THREE.Vector3());
    expect(player.crouch).toBeCloseTo(player.crouchDepth, 4);
    expect(ducked.x).toBeCloseTo(0.7, 6);
    expect(ducked.z).toBeCloseTo(-0.45, 6);
    expect(ducked.y).toBeCloseTo(1.65 - player.crouchDepth, 4);
    expect(player.getFloorY()).toBeCloseTo(0, 4);

    // Und sitzend dasselbe in der anderen Richtung.
    player.updateDesktopCrouch(false, 1);
    player.posture = 'sit';
    player.seatHeight = 0.4;
    frame(player);
    const sitting = player.getHeadPosition(new THREE.Vector3());
    expect(player.seated).toBeCloseTo(0.4, 4);
    expect(sitting.x).toBeCloseTo(0.7, 6);
    expect(sitting.z).toBeCloseTo(-0.45, 6);
    expect(sitting.y).toBeCloseTo(1.65 + 0.4, 4);
    expect(player.getFloorY()).toBeCloseTo(0, 4);
  });
});

/**
 * **Ein Raum, in dem nicht gesprungen wird** (`PlayerRig.jumpLock`).
 *
 * Die Küche stellt den Sprung ab (`zones/kitchen.ts`, `holdFeet`), und das
 * Gestell ist die Stelle, an der das passiert: Brille, Tastatur, Pad und
 * Bildschirmstock landen alle in demselben Wunsch (`setIntent`,
 * `requestJump`), also braucht es auch nur eine Sperre. Gesperrt ist dabei
 * **nur** der Absprung — wer nicht mehr hüpfen darf, soll trotzdem laufen.
 */
describe('PlayerRig.jumpLock — wo nicht gesprungen wird', () => {
  const input = { get: () => undefined } as unknown as Parameters<PlayerRig['update']>[1];

  /** Ein Gestell, das aufschreibt, was bei der Fortbewegung ankommt. */
  function watched(): {
    player: PlayerRig;
    jumps: boolean[];
    speeds: number[];
  } {
    const player = rig();
    const jumps: boolean[] = [];
    const speeds: number[] = [];
    player.setLocomotion({
      apply: (_rig, velocity, jump) => {
        jumps.push(jump);
        speeds.push(velocity.x);
      },
    });
    return { player, jumps, speeds };
  }

  it('reicht den Wunsch durch, solange niemand ihn gesperrt hat', () => {
    const { player, jumps } = watched();
    player.requestJump();
    player.update(1 / 60, input, false);
    expect(jumps).toEqual([true]);
  });

  it('verschluckt ihn, solange die Sperre steht', () => {
    const { player, jumps } = watched();
    player.jumpLock = true;
    player.requestJump();
    player.update(1 / 60, input, false);
    expect(jumps).toEqual([false]);

    // Und auch den Wunsch aus `setIntent` — der zweite Weg zum selben Merker.
    player.setIntent(new THREE.Vector3(0, 0, 0), true);
    player.update(1 / 60, input, false);
    expect(jumps).toEqual([false, false]);
  });

  it('sperrt den Sprung und nicht den Schritt', () => {
    const { player, jumps, speeds } = watched();
    player.jumpLock = true;
    player.setIntent(new THREE.Vector3(1.5, 0, 0), true);
    player.update(1 / 60, input, false);
    expect(jumps).toEqual([false]);
    expect(speeds).toEqual([1.5]);
  });

  it('gilt nur in der Welt, die sie gesetzt hat — `standUp` räumt auf', () => {
    const { player, jumps } = watched();
    player.jumpLock = true;
    player.standUp();
    expect(player.jumpLock).toBe(false);
    player.requestJump();
    player.update(1 / 60, input, false);
    expect(jumps).toEqual([true]);
  });
});
