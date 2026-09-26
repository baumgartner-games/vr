/**
 * **Wand-Ghosting: was zwischen der Kamera und der Figur steht, wird
 * durchsichtig.**
 *
 * Die Ansicht _Von oben_ steht schräg über der Szene (`core/TopDownCamera.ts`),
 * und damit steht sie hinter jeder Wand, die südlich von der Figur liegt. Das
 * Aufschneiden (`core/cutaway.ts`) nimmt nur weg, was **über** ihr liegt —
 * Decken und Dächer; eine Wand auf derselben Ebene bleibt stehen, und hinter
 * ihr ist die Figur weg. In Overcooked und den Sims ist das seit jeher
 * dieselbe Antwort: Die Wand bleibt, wird aber durchsichtig.
 *
 * Hier steht die **Auswahl** dazu, und zwar als reine Rechnung: welche
 * achsenparallelen Kästen eine Strecke schneidet. Kein three.js, kein
 * Raycaster, keine Szene — damit ein Test in Millisekunden nachrechnen kann,
 * was sonst nur in der Brille auffällt. `GridWorld` ruft sie einmal je Bild
 * und tauscht danach Materialien; wie eine durchsichtige Wand *aussieht*,
 * steht dort und nicht hier.
 *
 * **Böden zählen nicht.** Ein Blick von schräg oben geht über jede Bodenplatte
 * hinweg, aber er streift sie — die Strecke zur Figur endet ja auf ihr. Wer
 * Böden mitnähme, hätte in jedem Bild den halben Fußboden durchsichtig, und
 * darunter ist nichts als Nacht. Also: die Sorte `floor` nie, und alles, was
 * flach und unter Kniehöhe liegt, auch nicht (eine Schwelle, eine Rampe, eine
 * Druckplatte).
 *
 * ## Der Strahl läuft in der **Spalte der Figur** und nicht von der Kamera aus
 *
 * Das ist die Korrektur aus dem gemeldeten Befund: „die Wände werden zwar
 * durchsichtig, aber ganz links auf der Karte stimmt der Versatz nicht, und
 * rechts liegt er gespiegelt daneben." Die Ursache steht nicht in dieser
 * Datei, sondern in der Kamera: Sie steht **genau südlich** der Figur
 * (`core/topDownPose.topDownPosition` übernimmt deren `x` unverändert) — aber
 * sie zieht der Figur **weich nach** (`TopDownCamera`, `FOLLOW_TAU` 0,12 s).
 * Wer nach Westen läuft, hat die Kamera für einen Augenblick im Osten, und ein
 * Strahl von dort zur Figur schneidet die Wand **neben** ihr statt der vor
 * ihr. Nach Osten gelaufen kippt derselbe Fehler auf die andere Seite — genau
 * die Spiegelung, die gemeldet wurde.
 *
 * Also wird die Seitwärtsfrage gar nicht erst am Strahl entschieden: Er läuft
 * senkrecht über der Figur nach oben-hinten, in **ihrer** Spalte
 * (`figure.x`), und wie breit diese Spalte ist, sagt `GHOST_SHOULDER`. Was
 * seitlich danebensteht, verdeckt sie auch nicht.
 *
 * ## Und nur, wovon die Kamera die **andere Seite** sieht
 *
 * Der zweite Teil desselben Befunds: „Ich will nicht die Wände links und
 * rechts vom Spieler durchsichtig haben, sondern die, hinter die die Kamera
 * nicht blicken kann." Das ist eine Aussage über die **Seiten** einer Wand:
 * Steht sie ganz zwischen Figur und Kamera, dann sieht die Figur ihre eine
 * Seite und die Kamera die andere — was dahinter liegt, fällt für den Spieler
 * aus, und genau das ist der Informationsverlust. Eine Wand, die neben der
 * Figur **entlangläuft**, reicht dagegen an ihr vorbei nach hinten: Kamera und
 * Figur sehen dieselbe Seite, es geht nichts verloren, und sie bleibt stehen.
 *
 * Geprüft wird das an der **vorderen Kante** (`turnsItsBack`): Der Quader muss
 * vollständig auf der Kameraseite der Figur liegen. Eine Wand, die die Figur
 * nur streift, weil ihre Zelle dieselbe Reihe belegt, zählt damit nicht mehr
 * mit — und die Seitenwände eines Raums bleiben stehen, auch wenn man in der
 * Ecke steht.
 */

/** Ein Punkt im Raum. */
export interface GhostPoint {
  x: number;
  y: number;
  z: number;
}

/** Ein achsenparalleler Kasten: Mitte und Kantenlängen, wie ein `PlanSolid`. */
export interface GhostBox {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
}

/** Was von einem Quader gebraucht wird, um über ihn zu entscheiden. */
export interface GhostCandidate {
  box: GhostBox;
  /** Ob er ein Boden ist (`PlanSolid.kind === 'floor'`). */
  floor?: boolean;
}

/**
 * Bis zu welcher Höhe ein flacher Quader als Boden durchgeht, in Metern.
 *
 * Kniehöhe: Was darunter bleibt, verdeckt niemanden — eine Stufe, eine
 * Schwelle, der Rand einer Druckplatte. Was darüber ragt, kann eine Figur
 * verdecken und wird deshalb behandelt wie eine Wand.
 */
export const GHOST_KNEE = 0.5;

/**
 * **Kann dieser Quader überhaupt jemanden verdecken?**
 *
 * Die Frage steht vor der Strecke, weil sie sich einmal beantworten lässt und
 * nicht jedes Bild neu: Ein Quader wird nicht plötzlich zum Boden.
 */
export function blocksView(one: GhostCandidate, knee = GHOST_KNEE): boolean {
  if (one.floor) return false;
  // Flach **und** tief liegend: Die Oberkante zählt, nicht die Dicke — ein
  // Podest von zehn Zentimetern auf zwei Metern Höhe ist eine Decke.
  return one.box.y + one.box.h / 2 > knee;
}

/**
 * **Wie breit die Spalte der Figur ist**, in Metern nach jeder Seite.
 *
 * Eine Wand verdeckt keinen Punkt, sondern einen Körper: Wer die Figur nur an
 * der Schulter abschneidet, verdeckt sie für den Spieler trotzdem. 0,45 m ist
 * eine halbe Kachel weniger ein Rand — breiter, und die Nachbarwand ginge mit
 * auf, schmaler, und die Figur schaute neben ihrer eigenen Lücke hervor.
 */
export const GHOST_SHOULDER = 0.45;

/**
 * **Welche Wände die Figur verdecken.**
 *
 * Die Strecke läuft von der Kamera zur Figur, und gesucht ist, was **davor**
 * liegt. Zwei Dinge macht diese Funktion anders als ein Strahl von der Kamera
 * zum Punkt, und beide stehen oben ausführlich:
 *
 * 1. **Seitwärts zählt die Spalte der Figur**, nicht die Richtung des Strahls:
 *    Er startet senkrecht über ihr (`figure.x`), und der Quader wird um
 *    `shoulder` verbreitert. Damit hängt die Auswahl nicht mehr daran, wie
 *    weit die Kamera der Figur gerade nachhinkt.
 * 2. **Nur Wände, von denen die Kamera die andere Seite sieht** als die Figur
 *    (`turnsItsBack`) — was neben ihr entlangläuft, bleibt stehen.
 *
 * 3. **Das Bild darf gedreht sein** (`TopDownCamera.turn`): Dann steht die
 *    Kamera nicht im Süden, sondern in einem der anderen drei Viertel. Aus
 *    welchem, sagt ihre Lage zur Figur — und alles wird vorher in das Viertel
 *    gedreht, in dem die Rechnung unten gilt (`toCameraSouth`). Die Kamera
 *    hinkt dabei höchstens ein paar Zentimeter nach; bei gut neun Metern
 *    Abstand kippt das kein Viertel.
 *
 * Dazwischen liegt dieselbe Rechnung wie zuvor: das **Plattenverfahren** (slab
 * test) über die drei Achsen, `t` zwischen 0 und 1. Was hinter der Figur
 * steht, verdeckt sie nicht — und weil die Strecke dort endet, fällt es von
 * selbst heraus. Ein Kasten, **in** dem die Kamera steckt, zählt dagegen mit:
 * Dann ist der Eintritt negativ, der Austritt positiv, und man schaut aus
 * einer Wand heraus. Genau dann soll sie weg.
 */
export function wallsHiding<T extends GhostCandidate>(
  camera: GhostPoint,
  figure: GhostPoint,
  boxes: readonly T[],
  knee = GHOST_KNEE,
  shoulder = GHOST_SHOULDER,
): T[] {
  const out: T[] = [];
  const quarter = cameraQuarter(camera, figure);
  const eye = toCameraSouth(camera, quarter);
  const aim = toCameraSouth(figure, quarter);
  // Der Strahl beginnt in der Spalte der Figur — die Höhe und die Tiefe kommen
  // von der Kamera, die Seite von ihr selbst.
  const from = { x: aim.x, y: eye.y, z: eye.z };
  const dy = aim.y - from.y;
  const dz = aim.z - from.z;
  for (const one of boxes) {
    if (!blocksView(one, knee)) continue;
    const box = quarter === 0 ? one.box : boxToCameraSouth(one.box, quarter);
    if (!turnsItsBack(box, aim, eye)) continue;
    const wide = { ...box, w: box.w + 2 * shoulder };
    if (crosses(from, 0, dy, dz, wide)) out.push(one);
  }
  return out;
}

/**
 * **In welchem Viertel die Kamera steht**, von der Figur aus: 0 im Süden
 * (ungedreht), 1 im Osten, 2 im Norden, 3 im Westen — links herum gezählt
 * wie `topDownPose.quarterOf`. Senkrecht darüber zählt als Süden.
 */
export function cameraQuarter(camera: GhostPoint, figure: GhostPoint): 0 | 1 | 2 | 3 {
  const dx = camera.x - figure.x;
  const dz = camera.z - figure.z;
  if (Math.hypot(dx, dz) < 1e-6) return 0;
  const quarters = Math.round(Math.atan2(dx, dz) / (Math.PI / 2));
  return (((quarters % 4) + 4) % 4) as 0 | 1 | 2 | 3;
}

/**
 * **Einen Punkt so drehen, dass die Kamera im Süden steht** — um ganze
 * Viertel um die Hochachse, zurück um das Viertel, in dem sie steht.
 */
function toCameraSouth(point: GhostPoint, quarter: 0 | 1 | 2 | 3): GhostPoint {
  switch (quarter) {
    case 0:
      return point;
    case 1:
      return { x: -point.z, y: point.y, z: point.x };
    case 2:
      return { x: -point.x, y: point.y, z: -point.z };
    case 3:
      return { x: point.z, y: point.y, z: -point.x };
  }
}

/** Dasselbe für einen Kasten: die Mitte gedreht, Breite und Tiefe getauscht. */
function boxToCameraSouth(box: GhostBox, quarter: 0 | 1 | 2 | 3): GhostBox {
  const centre = toCameraSouth(box, quarter);
  const odd = quarter % 2 === 1;
  return {
    x: centre.x,
    y: box.y,
    z: centre.z,
    w: odd ? box.d : box.w,
    h: box.h,
    d: odd ? box.w : box.d,
  };
}

/**
 * **Zeigt dieser Quader der Kamera seine andere Seite?**
 *
 * Er tut es, wenn er **vollständig** auf der Kameraseite der Figur liegt: Dann
 * steht die Figur davor und die Kamera dahinter, und was zwischen beiden
 * liegt, sieht der Spieler nicht mehr. Reicht er an der Figur vorbei — eine
 * Wand, die neben ihr nach hinten weiterläuft —, sehen beide dieselbe Seite,
 * und er bleibt stehen.
 *
 * Steht die Kamera **senkrecht** über der Figur, gibt es keine Seite, auf die
 * man sich beziehen könnte; dann entscheidet allein die Strecke (der Blick
 * geht von oben durch die Decke und nicht durch eine Wand).
 */
function turnsItsBack(box: GhostBox, figure: GhostPoint, camera: GhostPoint): boolean {
  const toward = camera.z - figure.z;
  if (Math.abs(toward) < 1e-9) return true;
  const near = toward > 0 ? box.z - box.d / 2 : box.z + box.d / 2;
  return toward > 0 ? near >= figure.z : near <= figure.z;
}

/**
 * Schneidet die Strecke diesen Kasten, bevor sie ankommt?
 *
 * Die Strecke ist `from + t · d` mit `t` zwischen 0 und 1. Eine Achse, in der
 * sie sich gar nicht bewegt, wird zur Ja-oder-Nein-Frage: Entweder liegt der
 * Anfang zwischen den beiden Flächen, oder die Strecke kann den Kasten nie
 * treffen. Ohne diesen Zweig entstünde eine Division durch null, und aus einer
 * Wand daneben würde eine Wand davor.
 */
function crosses(from: GhostPoint, dx: number, dy: number, dz: number, box: GhostBox): boolean {
  let near = 0;
  let far = 1;
  const axes: [number, number, number, number][] = [
    [from.x, dx, box.x, box.w],
    [from.y, dy, box.y, box.h],
    [from.z, dz, box.z, box.d],
  ];
  for (const [start, delta, centre, size] of axes) {
    const low = centre - size / 2;
    const high = centre + size / 2;
    if (Math.abs(delta) < 1e-9) {
      if (start < low || start > high) return false;
      continue;
    }
    const first = (low - start) / delta;
    const second = (high - start) / delta;
    near = Math.max(near, Math.min(first, second));
    far = Math.min(far, Math.max(first, second));
    if (near > far) return false;
  }
  return true;
}
