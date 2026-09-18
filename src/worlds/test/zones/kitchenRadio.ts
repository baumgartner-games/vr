import * as THREE from 'three';
import { denyShadow } from '../../../core/graphicsScene';

/**
 * **Das Küchenradio** — ein Kasten auf einem Sockel, den man anmacht, und dann
 * spielt Musik.
 *
 * Es ist das einzige Gerät dieser Küche, das **nichts kocht**, und das ist
 * sein ganzer Zweck: Eine Overcooked-Küche ohne Musik ist eine Werkstatt. Wer
 * sie nicht will, macht sie aus — und deshalb steht sie hinter einem Schalter
 * und nicht in der Welt.
 *
 * Wie bei den Möbeln daneben steht hier die **Rechnung** (welcher Sender, was
 * ein Druck bewirkt, was dabei auf dem Schild steht) und daneben der
 * **Bausatz** (`buildKitchenRadio`). Die Rechnung hat einen Test, der Bausatz
 * braucht three.js — derselbe Schnitt wie überall in dieser Küche.
 *
 * Die Musik selbst liegt bei den übrigen Tönen (`kitchenSound.KITCHEN_CUES`,
 * Ton `radio`, drei Aufnahmen); abgespielt wird sie wie jede Schleife
 * (`kitchenAudio.KitchenAudio.loop`), nur mit einem ausdrücklichen Sender
 * statt einer zufälligen Variante.
 */

/**
 * **Die Sender** — in der Reihenfolge, in der der Schalter sie durchgeht, und
 * in derselben Reihenfolge wie die Dateien des Tons `radio`.
 *
 * Drei und nicht einer, weil ein Radio mit genau einem Lied nach dem dritten
 * Durchlauf ausgemacht wird und nie wieder an. Und drei und nicht dreißig,
 * weil jeder Sender anderthalb Minuten Musik ist, die jemand herunterlädt.
 */
export const RADIO_STATIONS: readonly string[] = ['Ladenmusik', 'Eiswagen', 'Jahrmarkt'];

/** Was das Radio gerade tut. */
export interface RadioState {
  readonly on: boolean;
  /** Welcher Sender läuft — oder zuletzt lief. */
  readonly station: number;
}

/**
 * **Aus, und der Zeiger steht auf dem letzten Sender.**
 *
 * Damit rückt der **erste** Druck auf den ersten Sender weiter, und die Küche
 * fängt mit der Ladenmusik an statt mit dem Jahrmarkt. Ein eigener Wert für
 * „noch nie an gewesen" (`-1`, `null`) wäre ein zweiter Zustand, den jede
 * Anzeige daneben auch noch beantworten müsste.
 */
export const RADIO_OFF: RadioState = { on: false, station: RADIO_STATIONS.length - 1 };

/**
 * **Ein Druck**: an, aus, an — und jedes Anmachen ist ein Sender weiter.
 *
 * Der Auftrag war ein Schalter („an/aus"), und einer ist es geblieben: Zwei
 * Drücke sind an und wieder aus, und niemand muss sich durch eine Liste
 * klicken, um das Ding wieder still zu bekommen. Dass der nächste Druck eine
 * andere Musik bringt, ist der Sendersuchlauf, den ein Radio nun einmal hat —
 * wer den Jahrmarkt nicht mag, macht aus und wieder an.
 *
 * **Beim Ausschalten bleibt der Sender stehen** und wird nicht zurückgesetzt:
 * Sonst begänne die Suche nach jedem Ausmachen wieder vorn, und der dritte
 * Sender wäre nur über zwei Umwege erreichbar.
 */
export function radioToggle(state: RadioState): RadioState {
  if (state.on) return { on: false, station: state.station };
  return { on: true, station: (state.station + 1) % RADIO_STATIONS.length };
}

/**
 * **Was der nächste Druck tut** — der Satz am gelben Saum (`core/usable.ts`).
 *
 * Er sagt beim Anmachen gleich mit, **welcher** Sender kommt. Ein Schild, auf
 * dem nur „Radio an" steht, verschweigt die einzige Auskunft, die man vor dem
 * Drücken haben möchte.
 */
export function radioPrompt(state: RadioState): string {
  if (state.on) return 'Radio aus';
  return `Radio an — ${RADIO_STATIONS[(state.station + 1) % RADIO_STATIONS.length]!}`;
}

/** Die Farbe der Skala, wenn das Radio läuft — sonst hat kein Möbel sie. */
export const RADIO_COLOR = '#ffc14d';

const CASE_W = 0.34;
const CASE_H = 0.19;
const CASE_D = 0.15;
/** Höhe des Sockels: Der Kasten liegt damit auf Arbeitsplattenhöhe. */
const STAND_H = 0.5;
const STAND_W = 0.22;
const STAND_D = 0.18;

const CASE_COLOR = 0x39414d;
const STAND_COLOR = 0x8b93a4;
const GRILLE_COLOR = 0x171b21;
const DIAL_DARK = 0x4a4438;

/** Was die Zone vom Radio in der Hand behält. */
export interface KitchenRadio {
  /** Alles zusammen — die Zone stellt es auf seine Kachel. */
  readonly group: THREE.Group;
  /** Die Vorderseite: das Ziel für `A` und den Zeiger. */
  readonly face: THREE.Mesh;
  /** Skala an oder aus. */
  setOn(on: boolean): void;
  dispose(): void;
}

/**
 * **Baut das Radio**, Ursprung auf dem Boden in seiner Mitte, ungedreht — wie
 * jedes Möbel dieser Küche. Wohin es schaut, entscheidet die Zone.
 *
 * Es leuchtet, wenn es läuft, und das ist mehr als Zierrat: Es ist die einzige
 * Anzeige, die das Gerät hat. Musik hört man auch aus dem Nebenraum, aber
 * **wer** sie angemacht hat und ob das eigene Drücken angekommen ist, sieht
 * man nur hier. Deshalb ist es die Skala, die angeht, und nicht etwa der ganze
 * Kasten: ein Fleck Licht in Augenhöhe der Kochfigur, quer durch die Küche zu
 * sehen und trotzdem nicht so hell wie die Flamme auf dem Herd.
 */
export function buildKitchenRadio(): KitchenRadio {
  const group = new THREE.Group();
  group.name = 'kitchen-radio';

  const shapes: THREE.BufferGeometry[] = [];
  const skins: THREE.Material[] = [];
  const shape = <T extends THREE.BufferGeometry>(made: T): T => {
    shapes.push(made);
    return made;
  };
  const skin = (material: THREE.MeshStandardMaterial): THREE.MeshStandardMaterial => {
    skins.push(material);
    return material;
  };

  const stand = new THREE.Mesh(
    shape(new THREE.BoxGeometry(STAND_W, STAND_H, STAND_D)),
    skin(new THREE.MeshStandardMaterial({ color: STAND_COLOR, roughness: 0.45, metalness: 0.5 })),
  );
  stand.position.y = STAND_H / 2;

  const body = new THREE.Mesh(
    shape(new THREE.BoxGeometry(CASE_W, CASE_H, CASE_D)),
    skin(new THREE.MeshStandardMaterial({ color: CASE_COLOR, roughness: 0.8 })),
  );
  body.position.y = STAND_H + CASE_H / 2;
  body.castShadow = true;
  denyShadow(stand);

  // Die Vorderseite zeigt nach −z, wie bei jedem ungedrehten Möbel dieser
  // Küche der Bedienrand.
  const front = -CASE_D / 2 - 0.002;

  const grille = new THREE.Mesh(
    shape(new THREE.CircleGeometry(CASE_H * 0.33, 20)),
    skin(new THREE.MeshStandardMaterial({ color: GRILLE_COLOR, roughness: 0.95 })),
  );
  grille.position.set(-CASE_W * 0.24, STAND_H + CASE_H / 2, front);
  grille.rotation.y = Math.PI;

  const dialSkin = skin(
    new THREE.MeshStandardMaterial({
      color: DIAL_DARK,
      roughness: 0.4,
      emissive: new THREE.Color(RADIO_COLOR),
      emissiveIntensity: 0,
    }),
  );
  const dial = new THREE.Mesh(
    shape(new THREE.BoxGeometry(CASE_W * 0.36, CASE_H * 0.36, 0.004)),
    dialSkin,
  );
  dial.position.set(CASE_W * 0.2, STAND_H + CASE_H * 0.62, front);

  const knob = new THREE.Mesh(
    shape(new THREE.CylinderGeometry(CASE_H * 0.12, CASE_H * 0.12, 0.02, 16).rotateX(Math.PI / 2)),
    skin(new THREE.MeshStandardMaterial({ color: STAND_COLOR, roughness: 0.5, metalness: 0.4 })),
  );
  knob.position.set(CASE_W * 0.2, STAND_H + CASE_H * 0.26, front);

  // Die Antenne steht schräg nach hinten: Gerade nach oben sähe sie aus wie
  // ein Griff, und jemand griffe danach.
  const antenna = new THREE.Mesh(
    shape(new THREE.CylinderGeometry(0.006, 0.004, 0.26, 8)),
    skin(new THREE.MeshStandardMaterial({ color: STAND_COLOR, roughness: 0.35, metalness: 0.7 })),
  );
  antenna.position.set(CASE_W * 0.4, STAND_H + CASE_H + 0.11, CASE_D * 0.3);
  antenna.rotation.x = -0.35;

  for (const flat of [grille, dial, knob, antenna]) denyShadow(flat);
  group.add(stand, body, grille, dial, knob, antenna);

  return {
    group,
    face: body,
    setOn(on: boolean): void {
      dialSkin.emissiveIntensity = on ? 1 : 0;
      dialSkin.color.setHex(on ? new THREE.Color(RADIO_COLOR).getHex() : DIAL_DARK);
      dialSkin.needsUpdate = true;
    },
    dispose(): void {
      for (const one of shapes) one.dispose();
      for (const one of skins) one.dispose();
      shapes.length = 0;
      skins.length = 0;
    },
  };
}

/** Wie hoch das Radio baut — für den Körper, an dem man sich stößt. */
export const RADIO_HEIGHT = STAND_H + CASE_H;
/** Und wie breit — dasselbe. */
export const RADIO_WIDTH = CASE_W;
export const RADIO_DEPTH = CASE_D;
