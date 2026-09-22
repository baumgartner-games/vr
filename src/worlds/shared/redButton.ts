import * as THREE from 'three';
import { canLoadModels } from '../../core/chefFit';
import { kaykitAtHeight, kaykitSkins } from '../../core/kaykitHeight';
import { TextPlane } from '../../ui/TextPlane';
import {
  BUTTON_DOME_R,
  BUTTON_HEAD_H,
  BUTTON_PEDESTAL_H,
  BUTTON_REST_Y,
  redButtonStack,
} from './redButtonFit';

/**
 * **Ein großer roter Knopf auf einer Säule** — zum Antippen oder Anzielen.
 *
 * Ein Knopf ist das ehrlichste Bedienelement, das eine Welt hat: er steht da,
 * man sieht ihn von weitem, man drückt ihn, und es passiert genau eine Sache.
 * Im Effektlabor ist so einer die Mitte des Raums; in den Alpen holt er einen
 * aus dem Tal zurück auf die Rampe. Damit die beiden nicht auseinanderlaufen
 * — und damit die nächste Welt, die einen braucht, ihn nicht ein drittes Mal
 * baut —, steht er hier: Sockel, Kopf und ein Schild, das sagt, was er tut.
 *
 * Was der Knopf **auslöst**, weiß er nicht; das bleibt Sache der Welt, die ihn
 * hinstellt und seine Kuppel beim Zeiger anmeldet.
 *
 * ## Zwei Modelle aus dem Regal — und eine Rechnung, die bleibt
 *
 * Gebaut waren einmal beide Hälften: eine Säule mit Teller und Kragen und eine
 * rote Halbkugel darauf. Heute kommen beide aus dem KayKit-Regal —
 * `dungeon/column.glb` als **Sockel** und `board-game-bits/pawn_B_red.glb`,
 * eine Spielfigur mit Kugelkopf, als **Kopf**. Die Maße dazu stehen nebenan
 * (`redButtonFit.ts`) und sind dieselben geblieben: Der Sockel wird auf
 * `BUTTON_PEDESTAL_H` gerechnet, der Kopf auf `BUTTON_HEAD_H` — so hoch, wie
 * die Kuppel breit war.
 *
 * **Die Kuppel ist trotzdem noch da**, und sie muss es sein. Sie ist das
 * Objekt, das die Welten als benutzbares Ding anmelden (`addUsable`), an dem
 * der Zeiger hängt und das der Knopf der Gitterwelt in jedem Bild an seinen
 * Platz zurückschreibt. Sie bleibt deshalb liegen, wo sie lag, behält ihren
 * Platz in der Liste der Welt — und schrumpft, sobald die Modelle da sind, auf
 * einen **Kern** zusammen, der im Leib der Spielfigur verschwindet. Die Figur
 * hängt als **Kind** daran: Was die Kuppel bewegt, bewegt damit auch den Kopf,
 * ganz gleich, ob es `press()` war oder eine fremde Uhr.
 *
 * **Ausblenden wäre der eine Fehler gewesen, den man hier machen kann.** Die
 * Welt sammelt nur ein, was sichtbar ist (`PortalWorld.collectUsables`:
 * `if (!entry.object.visible) continue`), und der gelbe Saum braucht ein Netz
 * mit Geometrie (`core/highlight.highlightTargets`). Eine unsichtbare Kuppel
 * wäre ein Knopf, der nicht mehr geht, und ein Eintrag in der Liste der Welt,
 * den niemand mehr findet — genau der Fehler, der beim Hebel schon einmal
 * passiert ist.
 *
 * **Ohne WebGL und ohne die gekauften Pakete bleibt der gerechnete Knopf
 * stehen** und tut, was er immer tat (`core/chefFit.canLoadModels`). Er ist
 * ein Auslöser, und ein Auslöser, der auf eine Datei wartet, ist kaputt —
 * dieselbe Begründung wie an der Druckplatte (`grid/fixtures/plate.ts`).
 */

/** Höhe der Säule: der Knopf liegt damit auf Hüfthöhe. */
const PEDESTAL_H = BUTTON_PEDESTAL_H;
const DOME_R = BUTTON_DOME_R;
/** Wie tief der Knopf beim Drücken eintaucht und wie lange er unten bleibt. */
const PRESS_DEPTH = 0.035;
const PRESS_TIME = 0.14;

/**
 * **Der Sockel und der Kopf**, beide aus dem Regal.
 *
 * Die Säule ist eine Steinsäule mit Sockelplatte, Schaft, Kapitell und einer
 * kleinen Pyramide obendrauf — sie ersetzt Säule, Teller und Kragen in einem.
 * Die Spielfigur ist rot wie der Knopf immer war und hat den Kugelkopf, um den
 * es geht; sie ersetzt die Halbkugel.
 */
const BASE_MODEL = 'dungeon/column.glb';
const HEAD_MODEL = 'board-game-bits/pawn_B_red.glb';

/**
 * **Was von der Kuppel übrig bleibt**, in Metern.
 *
 * Ein Kern von einem Zentimeter: groß genug, dass er Geometrie hat — ohne die
 * gäbe es keinen Saum und keinen Strahl, der ihn trifft —, und klein genug,
 * dass ihn selbst der schmalste Teil einer Spielfigur verdeckt, ihr Schaft
 * zwischen Fuß und Kugel. Sichtbar ist er damit nie; gemeint ist er immer.
 */
const CORE_R = 0.01;

const RED = 0xff3b2f;
const RED_GLOW = 0x400a06;
const RED_HOT = 0x992218;

/** Die Kuppel, so genau getippt, wie die Gitterwelt sie anfasst. */
type Dome = THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;

export { BUTTON_DOME_R };

export interface RedButton {
  /** Alles zusammen — die Welt hängt es dorthin, wo der Knopf stehen soll. */
  group: THREE.Group;
  /**
   * **Die Kuppel**: das Ziel für den Zeiger, der Körper für die Kugel und das,
   * was sich beim Drücken bewegt.
   *
   * Sobald die Modelle da sind, ist sie nur noch der **Kern** unter dem Kopf —
   * das Ding, das bewegt und angemeldet wird, bleibt aber dasselbe, und der
   * Kopf hängt als Kind daran. Wer sie anmeldet, meldet damit die Figur mit
   * an: Saum, Strahl und Greifbox rechnen über den ganzen Baum.
   */
  dome: Dome;
  /** Drückt den Knopf sichtbar ein — der Rest ist Sache der Welt. */
  press(): void;
  /**
   * **Was auf dem Schild steht, neu setzen.**
   *
   * Für den einen Knopf, der nicht immer dasselbe tut: Der Umbauschalter der
   * Küche heißt _Küche umbauen_, solange gekocht wird, und _Küche nutzen_,
   * solange umgebaut wird (`worlds/test/zones/kitchen.ts`). Ein Schild, das
   * dabei stehen bliebe, verspräche beim zweiten Druck das Gegenteil dessen,
   * was passiert.
   */
  setTitle(title: string, body?: string): void;
  /** Der Zeiger liegt darauf, oder eben nicht. */
  hover(on: boolean): void;
  /** Lässt den Knopf wieder hochkommen. */
  update(dt: number): void;
  dispose(): void;
}

/**
 * Was der Nachschub aus dem Regal beim Knopf vorfindet — und verändern darf.
 *
 * Eine eigene Schnittstelle, weil zwischen dem Bauen und dem Eintreffen der
 * Dateien ein paar hundert Millisekunden liegen, in denen alles Mögliche
 * passiert sein kann: Die Gitterwelt baut ihre Einbauten bei jeder Änderung
 * neu, und ein Knopf, der inzwischen abgeräumt ist, soll keine Modelle mehr
 * an eine Gruppe hängen, die niemand mehr ansieht.
 */
interface ButtonParts {
  group: THREE.Group;
  dome: Dome;
  /** Säule, Teller und Kragen — sie treten ab, sobald der Sockel da ist. */
  built: THREE.Object3D[];
  /** Die Materialien des Kopfes: sie glühen zusammen mit der Kuppel. */
  glowing: THREE.MeshStandardMaterial[];
  /** Alle Materialien beider Kopien — sie gehören dieser einen und müssen weg. */
  owned: THREE.Material[];
  /** Ob der Knopf schon abgeräumt ist, während die Dateien noch unterwegs waren. */
  gone: boolean;
  /** Die Farbe neu auftragen, nachdem der Kopf dazugekommen ist. */
  shine(): void;
}

/**
 * **Wo ein Sockel wirklich trägt**, in Metern — und nicht, wo er aufhört.
 *
 * Gemessen wird mit einem Strahl von oben, und zwar genau am **Rand des
 * Fußes**, der daraufkommen soll: Dort entscheidet sich, ob der Kopf aufliegt
 * oder auf einer Spitze balanciert. `dungeon/column.glb` läuft oben in eine
 * vierseitige Pyramide aus; ihre Oberkante ist ein einzelner Punkt, und der
 * Rand eines Fußes von gut 21 Zentimetern schwebte darüber eine Handbreit in
 * der Luft. Sechs Zentimeter tiefer hat die Säule unter demselben Rand noch
 * Stein — und die Pyramide verschwindet dafür im Fuß der Figur.
 *
 * **In der Achse und nicht in der Diagonale**, denn die Säule ist quadratisch:
 * Bei einem quadratischen Querschnitt liegt der **tiefste** Punkt unter einem
 * Kreis vom Halbmesser `rim` dort, wo der Kreis die Seitenmitte kreuzt. Wer in
 * der Diagonale misst, misst die günstigste Stelle und stellt den Kopf wieder
 * zu hoch.
 *
 * **Gemessen wird, bevor gehängt wird.** Der Strahl läuft in Weltkoordinaten,
 * und die Gruppe des Knopfes steht irgendwo in der Welt und ist obendrein
 * gedreht. Solange das Modell noch für sich allein steht, sind seine
 * Weltkoordinaten seine eigenen — und die Rechnung bleibt eine Zeile statt
 * einer Umrechnung.
 */
function carryHeight(base: THREE.Object3D, rim: number): number {
  base.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(base);
  if (box.isEmpty()) return Number.NaN;
  const top = box.max.y;
  const ray = new THREE.Raycaster(
    new THREE.Vector3(rim, top + 0.1, 0),
    new THREE.Vector3(0, -1, 0),
    0,
    top + 0.2,
  );
  // Verfehlt der Strahl, ist der Fuß breiter als der Sockel — dann trägt eben
  // die Oberkante, und der Kopf steht über. Das ist die ehrlichste Antwort,
  // die es dann noch gibt.
  return ray.intersectObject(base, true)[0]?.point.y ?? top;
}

/** Der halbe Fuß eines Modells, in Metern — sein größtes Maß am Boden. */
function rimOf(model: THREE.Object3D): number {
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  if (box.isEmpty()) return 0;
  return Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2;
}

/**
 * **Die beiden Modelle holen und den gebauten Knopf darunter abtreten lassen**
 * — sofort nichts, später vielleicht etwas.
 *
 * **Beide oder keiner.** Fehlt eine der zwei Dateien, bleibt der gerechnete
 * Knopf stehen, und was schon angekommen war, gibt seine Materialien gleich
 * wieder frei: Eine Steinsäule mit einer roten Halbkugel darauf wäre ein
 * halber Umbau, und eine Spielfigur, die auf einer gerechneten Säule steht,
 * ein zweiter Knopf, den niemand entworfen hat.
 *
 * **Die Reihenfolge ist Absicht**: erst messen, dann stapeln, dann hängen, und
 * ganz zum Schluss das Gebaute ausblenden. Ein Kragen, der verschwindet, bevor
 * die Figur hängt, ist ein Knopf mit einem Loch darin.
 */
function fillButton(parts: ButtonParts): void {
  if (!canLoadModels()) return;
  void (async () => {
    const [base, head] = await Promise.all([
      kaykitAtHeight(BASE_MODEL, PEDESTAL_H),
      kaykitAtHeight(HEAD_MODEL, BUTTON_HEAD_H),
    ]);
    if (parts.gone || !base || !head) {
      for (const model of [base, head]) {
        if (model) for (const skin of kaykitSkins(model)) skin.dispose();
      }
      return;
    }
    const stack = redButtonStack(carryHeight(base, rimOf(head)));
    // Der Kopf hängt an der Kuppel und nicht an der Gruppe — das ist die ganze
    // Mechanik des Drückens. `lift` ist derselbe Ort, nur von der Kuppel aus
    // gesehen (`redButtonFit.ts`).
    head.position.y = stack.lift;
    parts.dome.add(head);
    parts.group.add(base);
    for (const model of [base, head]) {
      for (const skin of kaykitSkins(model)) parts.owned.push(skin);
    }
    // **Ein Material für die ganze Figur, nicht eines für ihren Kopf.**
    // `pawn_B_red.glb` ist ein Knoten mit einem Netz und einem Material aus
    // dem Atlas des Pakets (`boardgame`) — eine Kugel, die für sich glühen
    // könnte, gibt es darin nicht. Also glüht die Figur ganz, und das ist auch
    // richtig so: Der Knopf ist die Figur und nicht ihr Scheitel. Dass
    // hineingeschrieben werden darf, liegt an `core/kaykitModel.copyOf` — die
    // Materialien einer Regalkopie gehören ihr allein.
    for (const skin of kaykitSkins(head)) {
      if ((skin as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
        parts.glowing.push(skin as THREE.MeshStandardMaterial);
      }
    }
    parts.shine();
    // Und jetzt erst: Säule, Teller und Kragen gehen, die Kuppel schrumpft auf
    // ihren Kern. Sie bleibt sichtbar — daran hängt, dass sie die Welt noch
    // einsammelt (siehe Klassenkommentar).
    for (const one of parts.built) one.visible = false;
    const wide = parts.dome.geometry;
    parts.dome.geometry = core();
    wide.dispose();
  })();
}

/** Die geschrumpfte Kuppel: dieselbe Bauart, nur unsichtbar klein. */
function core(): THREE.SphereGeometry {
  return new THREE.SphereGeometry(CORE_R, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
}

/**
 * Baut den Knopf mit seinem Schild.
 *
 * Wohin die Gruppe gedreht wird, entscheidet weiterhin die Welt — für das
 * Schild ist es egal geworden: Es richtet sich beim Zeichnen zur Kamera aus
 * (`ui/billboard.ts`) und ist aus jeder Richtung und aus jeder Ansicht zu
 * lesen.
 */
export function buildRedButton(options: { title: string; body?: string }): RedButton {
  const group = new THREE.Group();
  group.name = 'red-button';

  const metal = new THREE.MeshStandardMaterial({
    color: 0x8b93a4,
    roughness: 0.45,
    metalness: 0.55,
  });

  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.2, PEDESTAL_H, 20), metal);
  column.position.y = PEDESTAL_H / 2;
  group.add(column);

  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 24), metal);
  top.position.y = PEDESTAL_H + 0.03;
  group.add(top);

  // Der Kragen um den Knopf: er zeigt, wo der Knopf aufhört, ohne dass es
  // dafür eine Textur braucht.
  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(DOME_R + 0.03, 0.022, 10, 28),
    new THREE.MeshStandardMaterial({ color: 0xffc857, roughness: 0.6 }),
  );
  collar.rotation.x = Math.PI / 2;
  collar.position.y = PEDESTAL_H + 0.07;
  group.add(collar);

  const restY = BUTTON_REST_Y;
  const dome: Dome = new THREE.Mesh(
    new THREE.SphereGeometry(DOME_R, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({
      color: RED,
      roughness: 0.35,
      emissive: new THREE.Color(RED_GLOW),
    }),
  );
  dome.name = 'red-button-dome';
  dome.position.y = restY;
  group.add(dome);

  const sign = new TextPlane({
    width: 1.1,
    height: 0.4,
    title: options.title,
    body: options.body,
    align: 'center',
    accent: RED,
    // **Es sieht die Kamera an** (`ui/billboard.ts`). Vorher stand es fest auf
    // +Z und lehnte sich um 0,12 rad zurück — gut für den, der von vorn
    // ankommt, und unlesbar für jeden, der von der Seite kommt oder von oben
    // spielt: Ein Knopf, den die Welt zum Gang hin gedreht hat, zeigte der
    // Kamera von oben nur die Kante seines Schildes.
    face: true,
  });
  // Über dem Knopf: lesbar, ohne dem drückenden Arm im Weg zu stehen. Die
  // Neigung setzt jetzt die Ausrichtung beim Zeichnen, nicht mehr diese Zeile.
  sign.position.set(0, PEDESTAL_H + 0.62, -0.02);
  group.add(sign);

  let pressed = 0;
  let hovered = false;

  /**
   * **Ruhe oder Druck** — eine Farbe für alles, was leuchten kann.
   *
   * Der Zeiger darauf und der Druck selbst sind zwei Gründe für dasselbe
   * Leuchten, und beide gehen durch diese Zeile. Vorher schrieb `hover` direkt
   * in das Material der Kuppel; seit der Kopf ein Modell ist, sind es zwei
   * Sätze Materialien, und zwei Stellen, die dasselbe fast gleich machen,
   * laufen nach der dritten Änderung auseinander.
   */
  const shine = (): void => {
    const hot = hovered || pressed > 0;
    dome.material.emissive.setHex(hot ? RED_HOT : RED_GLOW);
    for (const skin of parts.glowing) skin.emissive.setHex(hot ? RED_HOT : RED_GLOW);
  };

  const parts: ButtonParts = {
    group,
    dome,
    built: [column, top, collar],
    glowing: [],
    owned: [],
    gone: false,
    shine,
  };
  fillButton(parts);

  return {
    group,
    dome,
    press: () => {
      pressed = PRESS_TIME;
      dome.position.y = restY - PRESS_DEPTH;
      shine();
    },
    setTitle: (title: string, body?: string) => sign.setText(title, body),
    hover: (on: boolean) => {
      hovered = on;
      shine();
    },
    update: (dt: number) => {
      if (pressed <= 0) return;
      pressed = Math.max(0, pressed - dt);
      dome.position.y = restY - PRESS_DEPTH * (pressed / PRESS_TIME);
      shine();
    },
    dispose: () => {
      parts.gone = true;
      sign.dispose();
      // Die **Geometrie** der Regalkopien bleibt liegen: Sie gehört der
      // Vorlage im Speicher und allen anderen Kopien (`kaykitModel.copyOf`,
      // `userData.sharedAssets`). Die Materialien gehören dieser einen Kopie
      // — und die Gitterwelt baut ihre Einbauten bei jeder Änderung neu.
      for (const skin of parts.owned) skin.dispose();
      parts.owned.length = 0;
      parts.glowing.length = 0;
    },
  };
}
