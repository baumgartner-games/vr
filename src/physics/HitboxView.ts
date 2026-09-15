import * as THREE from 'three';
import type { PhysicsWorld } from './PhysicsWorld';

/**
 * **Die Umrisse der Physik, über alles andere gelegt** — das Häkchen
 * _Hitboxen_ unter *Grafik* (`core/graphicsSettings.ts`).
 *
 * Was man sieht, ist nicht, woran man hängen bleibt. Ein Tresen ist einen
 * halben Meter hoch und hat eine Sperre von 1,40 m über sich
 * (`worlds/test/zones/kitchen.ts`); der Spieler ist von oben eine Figur und in
 * der Physik eine Kapsel von 26 cm Halbmesser; ein geladenes Möbel war lange
 * ein Würfelchen von 20 cm, und niemand sah es. Genau diese Lücke zwischen Bild
 * und Körper macht diese Ansicht auf.
 *
 * **Gezeichnet wird, was Rapier selbst zeichnet** (`World.debugRender`), und
 * das ist der ganze Trick an dieser Datei: Die Umrisse aus den Formen
 * nachzubauen hieße, jede Form ein zweites Mal zu kennen — Kasten, Kapsel,
 * Zylinder, Kegel, konvexe Hülle, Höhenfeld —, und die zweite Fassung liefe
 * beim ersten neuen Collider auseinander. Die Engine weiß es besser, und sie
 * gibt es als zwei Zahlenfelder heraus: Punkte und Farben, je zwei Punkte eine
 * Strecke. Die Farbe kommt mit und sagt etwas: fest, beweglich, schlafend.
 *
 * **Ohne Tiefenprüfung**, und das ist der Sinn des Häkchens: Die Linien liegen
 * über allem, auch über dem Möbel, zu dem sie gehören. Ein Umriss, den das
 * Ding verdeckt, dessen Umriss er ist, beantwortet keine Frage — in der
 * Ansicht von oben schon gar nicht, wo alles zwischen Kamera und Boden im Weg
 * steht.
 *
 * **Der Puffer wächst und schrumpft nicht.** `debugRender` gibt bei jedem
 * Aufruf frische Felder in wechselnder Länge zurück; hier wird einmal
 * angelegt, bei Bedarf vergrößert und sonst nur überschrieben
 * (`setDrawRange`). Ein Attribut je Bild neu wäre eine Grafikkarte, die
 * sechzigmal in der Sekunde aufräumt.
 */

/** Womit angefangen wird — genug für eine kleine Welt, ohne gleich ein Megabyte. */
const START_VERTICES = 4096;

/**
 * **Der Kreis um den Spieler** — aus wie vielen Strichen, und in welcher Farbe.
 *
 * Er wird **zusätzlich** gezeichnet, obwohl Rapier die Spielerkapsel längst
 * mitzeichnet, und das hat einen Grund: Die Kapsel ist eine von tausend
 * gelben Umrissen, und in einer Küche voller Tresen findet man sie nicht
 * wieder. Der Kreis liegt flach auf dem Boden, in einem Grün, das sonst
 * nirgends vorkommt, und beantwortet genau die Frage, für die man von oben
 * spielt: **Wie breit bin ich, und passe ich da durch?**
 *
 * Achtundvierzig Striche: bei vierundzwanzig sah man bei 26 cm Halbmesser die
 * Ecken.
 */
const RING_SEGMENTS = 48;
const RING_COLOR: readonly [number, number, number] = [0.35, 1, 0.55];
/** Wie hoch er über den Füßen schwebt, damit er nicht im Boden flimmert. */
const RING_LIFT = 0.03;

/**
 * Wie kräftig die Linien sind.
 *
 * Rapiers eigene Farben sind blass: Auf dem hellen Kachelboden dieses Projekts
 * verschwand ein Umriss fast. Sie werden deshalb aufgehellt — die Unterschiede
 * zwischen fest, beweglich und schlafend bleiben, sie sind nur zu sehen. Mehr
 * als das hier frisst die Unterschiede auf: Bei 1,6 lief jeder Kanal in die
 * Eins, und alles war dasselbe Gelb.
 */
const GAIN = 1.3;

/**
 * **Die Achsenkreuze fliegen raus**, und das ist der Grund, warum diese Datei
 * die Zahlen von Rapier nicht einfach durchreicht.
 *
 * `debugRender` zeichnet nicht nur Umrisse: Zu **jedem** Körper malt es sein
 * Koordinatenkreuz aus drei Strichen, rot, grün, blau. In einer Welt mit
 * anderthalbtausend Körpern sind das anderthalbtausend Kreuze, die flach auf
 * dem Boden liegen — von oben ein Teppich aus bunten Strichen, durch den man
 * die Umrisse nicht mehr sieht, für die man das Häkchen gesetzt hat.
 * Abschalten lässt sich das nicht: Der Modus der Pipeline kommt in dieser
 * Fassung der Bindung nicht durch (`RawDebugRenderPipeline`).
 *
 * Erkannt werden sie an ihrer Farbe: Ein Achsenstrich hat **genau einen**
 * Farbkanal, ein Umriss nie — die Farben der Körper sind Gelb, Magenta,
 * Orange, Blau, und jede davon hat mindestens zwei. Nachgesehen und nicht
 * geraten: In der Testwelt kommen dreizehn verschiedene Farben vor, und die
 * drei reinen sind genau die drei Achsen.
 */
function isAxis(r: number, g: number, b: number): boolean {
  return (r > LIT ? 1 : 0) + (g > LIT ? 1 : 0) + (b > LIT ? 1 : 0) <= 1;
}

/**
 * Ab wann ein Farbkanal zählt.
 *
 * **Nicht `> 0`**, und das ist nachgemessen: Der rote Achsenstrich kommt als
 * glatte (0,5 | 0 | 0) heraus, der grüne und der blaue aber mit einem
 * Millionstel in den Nebenkanälen. Mit der Null als Schwelle blieben zwei von
 * drei Kreuzen stehen — genau das war zu sehen.
 */
const LIT = 0.02;

export class HitboxView {
  /** Die Linien selbst — hängt der Aufrufer in seine Gruppe. */
  readonly object: THREE.LineSegments;

  private readonly geometry = new THREE.BufferGeometry();
  private readonly material: THREE.LineBasicMaterial;
  private positions: THREE.BufferAttribute;
  private colors: THREE.BufferAttribute;

  constructor() {
    this.positions = new THREE.BufferAttribute(new Float32Array(START_VERTICES * 3), 3);
    this.colors = new THREE.BufferAttribute(new Float32Array(START_VERTICES * 4), 4);
    this.positions.setUsage(THREE.DynamicDrawUsage);
    this.colors.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('position', this.positions);
    this.geometry.setAttribute('color', this.colors);
    this.geometry.setDrawRange(0, 0);

    this.material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      // **Über allem**: keine Tiefenprüfung und nichts in den Tiefenpuffer
      // schreiben, sonst schnitten die Linien Löcher in die Welt dahinter.
      depthTest: false,
      depthWrite: false,
      // Eine Werkstattansicht wird nicht belichtet: Sie soll dieselbe Farbe
      // haben, egal wie hell die Welt gerade ist.
      toneMapped: false,
    });

    this.object = new THREE.LineSegments(this.geometry, this.material);
    this.object.name = 'hitboxes';
    // Zuletzt gezeichnet, damit „ohne Tiefenprüfung" auch heißt „ganz oben",
    // und nicht culled: Die Hülle wandert mit jedem Bild, und three würde sie
    // sonst nach der Hülle von vorhin wegwerfen.
    this.object.renderOrder = 9999;
    this.object.frustumCulled = false;
    this.object.visible = false;
  }

  /** An oder aus — das Häkchen aus dem Menü. */
  set visible(on: boolean) {
    this.object.visible = on;
  }

  get visible(): boolean {
    return this.object.visible;
  }

  /**
   * **Ein Bild weiter** — nur wenn sichtbar.
   *
   * `debugRender` läuft über jeden Collider der Welt; das ist für eine Welt mit
   * tausend Quadern ein paar Millisekunden. Deshalb steht die Frage nach dem
   * Häkchen **vor** dem Aufruf und nicht danach: Wer das Häkchen aus hat, soll
   * von dieser Datei nichts merken.
   */
  update(physics: PhysicsWorld): void {
    if (!this.object.visible) return;
    const buffers = physics.debugLines();
    if (!buffers) {
      this.geometry.setDrawRange(0, 0);
      return;
    }
    const segments = Math.floor(buffers.vertices.length / 6);
    if (segments === 0) {
      this.geometry.setDrawRange(0, 0);
      return;
    }
    if (segments * 2 > this.positions.count) this.grow(segments * 2);

    const points = this.positions.array as Float32Array;
    const tints = this.colors.array as Float32Array;
    let kept = 0;
    for (let segment = 0; segment < segments; segment++) {
      const from = segment * 2;
      const r = buffers.colors[from * 4]!;
      const g = buffers.colors[from * 4 + 1]!;
      const b = buffers.colors[from * 4 + 2]!;
      if (isAxis(r, g, b)) continue;
      // Beide Enden der Strecke, Punkt und Farbe, an ihren neuen Platz.
      for (const end of [0, 1]) {
        const source = from + end;
        const target = kept + end;
        points[target * 3] = buffers.vertices[source * 3]!;
        points[target * 3 + 1] = buffers.vertices[source * 3 + 1]!;
        points[target * 3 + 2] = buffers.vertices[source * 3 + 2]!;
        tints[target * 4] = Math.min(1, buffers.colors[source * 4]! * GAIN);
        tints[target * 4 + 1] = Math.min(1, buffers.colors[source * 4 + 1]! * GAIN);
        tints[target * 4 + 2] = Math.min(1, buffers.colors[source * 4 + 2]! * GAIN);
        tints[target * 4 + 3] = buffers.colors[source * 4 + 3]!;
      }
      kept += 2;
    }

    kept = this.addPlayerRing(physics, kept);

    this.positions.addUpdateRange(0, kept * 3);
    this.colors.addUpdateRange(0, kept * 4);
    this.positions.needsUpdate = true;
    this.colors.needsUpdate = true;
    this.geometry.setDrawRange(0, kept);
  }

  /**
   * **Den Kreis um die Füße des Spielers anhängen** und sagen, wie viele
   * Punkte es danach sind.
   *
   * Die Kapsel meldet `PhysicsLocomotion` jedes Bild an die Physik
   * (`PhysicsWorld.playerCapsule`) — sie ändert sich mit jedem Schritt und
   * jeder Kniebeuge, und deshalb wird hier nichts gemerkt, sondern gelesen.
   * `null` heißt: In dieser Welt läuft niemand herum, also gibt es auch
   * keinen Kreis.
   */
  private addPlayerRing(physics: PhysicsWorld, at: number): number {
    const capsule = physics.playerCapsule;
    if (!capsule) return at;
    const needed = at + RING_SEGMENTS * 2;
    if (needed > this.positions.count) this.grow(needed);

    const points = this.positions.array as Float32Array;
    const tints = this.colors.array as Float32Array;
    // Die Füße: die Mitte der Kapsel, minus ihre halbe Achse und die untere
    // Kugelkappe.
    const floor = capsule.y - capsule.halfHeight - capsule.radius + RING_LIFT;
    let index = at;
    for (let step = 0; step < RING_SEGMENTS; step++) {
      for (const end of [step, step + 1]) {
        const angle = (end / RING_SEGMENTS) * Math.PI * 2;
        points[index * 3] = capsule.x + Math.cos(angle) * capsule.radius;
        points[index * 3 + 1] = floor;
        points[index * 3 + 2] = capsule.z + Math.sin(angle) * capsule.radius;
        tints[index * 4] = RING_COLOR[0];
        tints[index * 4 + 1] = RING_COLOR[1];
        tints[index * 4 + 2] = RING_COLOR[2];
        tints[index * 4 + 3] = 1;
        index++;
      }
    }
    return index;
  }

  dispose(): void {
    this.object.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
  }

  /**
   * **Größer werden, und zwar in Sprüngen** — und dabei mitnehmen, was schon
   * drinsteht.
   *
   * Das Mitnehmen ist nicht Bequemlichkeit: Der Kreis um den Spieler wird
   * **nach** den Umrissen angehängt (`addPlayerRing`), und wenn erst dabei der
   * Platz ausgeht, wären ohne diese beiden Zeilen alle Umrisse davor weg — ein
   * Drahtgitter, das aus einem einzigen grünen Kreis besteht.
   */
  private grow(count: number): void {
    let size = Math.max(this.positions.count, START_VERTICES);
    while (size < count) size *= 2;
    const points = new THREE.BufferAttribute(new Float32Array(size * 3), 3);
    const tints = new THREE.BufferAttribute(new Float32Array(size * 4), 4);
    (points.array as Float32Array).set(this.positions.array as Float32Array);
    (tints.array as Float32Array).set(this.colors.array as Float32Array);
    points.setUsage(THREE.DynamicDrawUsage);
    tints.setUsage(THREE.DynamicDrawUsage);
    this.positions = points;
    this.colors = tints;
    this.geometry.setAttribute('position', points);
    this.geometry.setAttribute('color', tints);
  }
}
