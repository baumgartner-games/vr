/**
 * **Ein Modell aus dem Regal in einen gerechneten Kasten stellen** — gemessen,
 * je Achse einzeln skaliert, und der Ursprung dorthin, wo der Aufrufer ihn
 * haben will.
 *
 * Der Anlass sind zwei Requisiten, die in derselben Woche getauscht wurden:
 * die Steine am Streckenrand (`kart.ts`, `bricks_B.glb`) und das Sprungkissen
 * vor der Kletterwand (`climb.ts`, `colored_block_blue.glb`). Beide haben
 * dasselbe Problem, und es ist nicht das der Pfosten nebenan
 * (`core/kaykitHeight.ts`): Dort steht ein Schild auf einem Stab, und wie
 * **dick** der Stab ist, entscheidet der Zeichner — also wird gleichmäßig auf
 * eine Höhe skaliert und fertig. Hier dagegen steht der Kasten schon da. Er
 * ist ein **Körper** in der Physik und ein Eintrag in der Abtastliste der
 * Welt, und seine Maße sind eingemessen: 1 × 0,6 × 1 m am Streckenrand, 8 × 3
 * m mal 1,40 m unter der Kletterwand. Ein Bild, das kleiner ist als sein
 * Körper, ist ein Hindernis, gegen das man läuft, bevor man es sieht; eines,
 * das größer ist, steht im Weg, wo nichts ist.
 *
 * **Also je Achse und nicht gleichmäßig.** Das ist keine Nachlässigkeit,
 * sondern die Bedingung: Ein Würfel von einem Meter, der 0,6 m hoch werden
 * soll, wird gleichmäßig verkleinert auch nur 0,6 m **breit** — und steht
 * dann schmaler da als der Körper, der ihn trägt. Der Preis ist ein Stein,
 * dessen Ziegelreihen um 40 % flacher sind als beim Zeichner. Das merkt
 * niemand; die Lücke zwischen Bild und Körper merkt jeder.
 *
 * **Gemessen und nicht abgeschrieben.** Was hier hereinkommt, ist eine
 * `Box3` um das **geladene** Netz und keine Zahl aus einem Katalog — dieselbe
 * Regel wie an der Druckplatte (`worlds/grid/fixtures/plate.ts`, „Erst
 * hängen, dann messen") und am Plattenboden (`worlds/shared/plateFloor.ts`).
 * Die Rechnung selbst kommt ohne three.js aus und steht deshalb hier allein,
 * mit ihrem Test daneben; was ein `Object3D` anfassen muss, liegt in
 * `propModel.ts`.
 */

/** Drei Zahlen — three.js-frei, damit die Rechnung prüfbar bleibt. */
export interface PropVec {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Die gemessene Hülle eines geladenen Modells. `THREE.Box3` passt hier hinein. */
export interface PropBox {
  readonly min: PropVec;
  readonly max: PropVec;
}

/**
 * Was dabei herauskommt: der Faktor je Achse und die Verschiebung **danach**.
 * In dieser Reihenfolge angewendet — erst `scale`, dann `shift` —, denn ein
 * Maßstab dreht um den Ursprung und nicht um den Fuß des Modells.
 */
export interface PropFit {
  readonly scale: PropVec;
  readonly shift: PropVec;
}

/**
 * **Wo der Ursprung im fertigen Kasten landet**, als Anteil von unten: 0,5 ist
 * seine Mitte, 0 seine Unterkante.
 *
 * Zwei Anker reichen für alles, was hier bisher getauscht wurde, und beide
 * haben einen Grund. Ein Stein der Bande wird als **Bündel** gesetzt, und ein
 * Bündeleintrag ist eine Matrix mit dem Mittelpunkt darin — genau wie der
 * Quader, den er ersetzt (`THREE.BoxGeometry` steht um ihren Mittelpunkt).
 * Die Rampe dagegen steht auf dem Boden, und ihre Unterkante ist die Zeile,
 * die man beim Hinstellen im Kopf hat.
 */
export const PROP_CENTRE: PropVec = { x: 0.5, y: 0.5, z: 0.5 };
export const PROP_FOOT: PropVec = { x: 0.5, y: 0, z: 0.5 };

/**
 * **Hülle → Faktor und Verschiebung**, die ganze Rechnung.
 *
 * `1` heißt bei einer Achse „lass sie, wie sie ist", und das ist dieselbe
 * Antwort auf dieselben unmöglichen Fälle wie in `core/kaykitHeight.ts`: Ein
 * leeres Netz, eine Ausdehnung von null oder eine gewünschte Größe, die keine
 * ist, sind kein Grund, ein Modell auf das Unendliche zu blasen oder es
 * verschwinden zu lassen. Besser ein Stein in seiner gelieferten Größe als
 * keiner.
 */
export function propFit(box: PropBox, size: PropVec, anchor: PropVec = PROP_CENTRE): PropFit {
  const axis = (key: 'x' | 'y' | 'z'): { scale: number; shift: number } => {
    const span = box.max[key] - box.min[key];
    const fits = span > 1e-6 && size[key] > 0;
    const scale = fits ? size[key] / span : 1;
    // Ohne Einpassen bleibt die gemessene Ausdehnung stehen — der Anker gilt
    // trotzdem, sonst stünde ein nicht eingepasstes Modell auch noch daneben.
    const width = fits ? size[key] : span;
    return { scale, shift: -(box.min[key] * scale + anchor[key] * width) };
  };
  const x = axis('x');
  const y = axis('y');
  const z = axis('z');
  return {
    scale: { x: x.scale, y: y.scale, z: z.scale },
    shift: { x: x.shift, y: y.shift, z: z.shift },
  };
}
