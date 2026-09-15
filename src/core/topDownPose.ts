/**
 * **Die Kamera von oben, als reine Rechnung.**
 *
 * Die Ansicht _Von oben_ ist keine zweite Welt, sondern ein Blickwinkel auf
 * dieselbe three.js-Szene (`core/TopDownCamera.ts`): eine Kamera, die schräg
 * über der Figur steht, nach Norden ausgerichtet ist und ihr in Stufen näher
 * oder ferner folgt. Wo sie dabei genau steht und wie weit sie nickt, hängt an
 * drei Zahlen — Ziel, Neigung, Abstand —, und die stehen hier, ohne three.js
 * und ohne DOM, damit ein Test sie nachrechnen kann.
 *
 * Warum **perspektivisch und eng** und nicht orthografisch: Overcooked sieht
 * so aus, weil ein langes Objektiv die Szene flach zusammenzieht, ohne ihr die
 * Höhe zu nehmen. Eine orthografische Kamera nimmt sie ganz — ein Podest und
 * der Boden darunter fallen dann auf denselben Fleck, und genau das muss man
 * von oben unterscheiden können. Dreißig Grad Öffnung sind der Kompromiss:
 * flach genug, dass Wände nicht auseinanderklaffen, steil genug, dass eine
 * Treppe eine Treppe bleibt.
 */

/** Ein Punkt in der Welt — so viel three.js braucht diese Datei nicht. */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Eine Richtung auf dem Boden: Nord/Süd ist z, Ost/West ist x. */
export interface Vec2 {
  x: number;
  z: number;
}

/**
 * **Neigung über der Waagerechten, in Grad.** 55° ist der Winkel, unter dem
 * schon der Companion Cube gezeichnet wurde, als es ihn nur von oben gab — flach
 * genug, dass man die Gesichter der Dinge sieht, steil genug, dass die Kacheln
 * unter ihnen ein Raster bleiben.
 */
export const TOP_DOWN_TILT = 55;

/** Öffnungswinkel der Kamera in Grad — eng, siehe oben. */
export const TOP_DOWN_FOV = 30;

/**
 * **Die Zoomstufen als Abstand in Metern.** Nicht als Faktor: Der Abstand ist
 * das, was man sieht, und vier gerastete Werte lassen sich mit Rad und Bumper
 * blind durchklicken. 16 m ist die Vorgabe — rund zwölf Kacheln Breite auf
 * einem 16:9-Schirm, also ein Raum und seine Nachbarn.
 */
export const TOP_DOWN_DISTANCES: readonly number[] = [12, 16, 22, 30];

/** Womit angefangen wird: 16 m. */
export const TOP_DOWN_ZOOM = 1;

/**
 * Wie weit über den Füßen die Kamera zielt, in Metern.
 *
 * Nicht auf den Kopf: Ducken, Sitzen und Umsehen verschieben den, und ein
 * Bild, das beim Ducken springt, ist keine feste Kamera. Nicht auf den Boden:
 * Dann stünde die Figur in der unteren Bildhälfte. Also auf die Mitte einer
 * 1,8-m-Figur.
 */
export const TOP_DOWN_FOCUS = 0.9;

const DEG = Math.PI / 180;

/** Der Abstand einer Zoomstufe, auch wenn die Stufe daneben liegt. */
export function topDownDistance(step: number): number {
  const clamped = clampStep(step);
  return TOP_DOWN_DISTANCES[clamped]!;
}

/**
 * Eine Stufe weiter — `+1` zurück (weiter weg), `-1` heran. An den Enden
 * rastet es: Ein Rad, das über die letzte Stufe hinausdreht, tut nichts.
 */
export function zoomStep(step: number, direction: number): number {
  return clampStep(step + Math.sign(direction));
}

function clampStep(step: number): number {
  return Math.max(0, Math.min(TOP_DOWN_DISTANCES.length - 1, Math.round(step)));
}

/**
 * **Wo die Kamera steht**, wenn sie `target` aus `distance` Metern unter der
 * Neigung `tilt` ansieht.
 *
 * Norden ist oben, also steht sie im **Süden** des Ziels (+z) und schaut nach
 * −z: Auf dem Schirm läuft die Figur nach oben, wenn sie nach Norden läuft.
 */
export function topDownPosition<T extends Vec3>(
  target: Vec3,
  distance: number,
  out: T,
  tilt = TOP_DOWN_TILT,
): T {
  const rad = tilt * DEG;
  out.x = target.x;
  out.y = target.y + distance * Math.sin(rad);
  out.z = target.z + distance * Math.cos(rad);
  return out;
}

/**
 * **Der Nickwinkel der Kamera im Bogenmaß**, Gieren und Rollen bleiben null.
 *
 * Eine Kamera schaut entlang −z; um `tilt` nach unten gekippt heißt also: um
 * `-tilt` um die x-Achse gedreht. Zusammen mit `topDownPosition` sieht sie das
 * Ziel damit genau an — der Test rechnet beides gegeneinander.
 */
export function topDownPitch(tilt = TOP_DOWN_TILT): number {
  return -tilt * DEG;
}

/**
 * **Aus einem Weg auf dem Schirm eine Richtung in der Welt** — für die Maus
 * und den Zielstick (Paket P1).
 *
 * Rechts auf dem Schirm ist Osten, und das eins zu eins. Oben ist Norden, aber
 * **gestaucht**: Die Neigung drückt jede Nord-Süd-Strecke auf ihren Sinus
 * zusammen. Wer den Zeiger einen Zentimeter nach oben schiebt, meint also mehr
 * Meter als einen Zentimeter nach rechts. Ohne diese Division zielt die Figur
 * zu flach — ein Fehler, den man erst merkt, wenn man daneben schießt.
 *
 * @param screenX nach rechts, in beliebiger Einheit
 * @param screenY nach **unten**, dieselbe Einheit (so zählt der Browser)
 * @returns dieselbe Richtung auf dem Boden, Länge 1 — oder `{0, 0}`
 */
export function groundDirection(
  screenX: number,
  screenY: number,
  out: Vec2 = { x: 0, z: 0 },
  tilt = TOP_DOWN_TILT,
): Vec2 {
  const x = screenX;
  const z = screenY / Math.sin(tilt * DEG);
  const length = Math.hypot(x, z);
  out.x = length > 0 ? x / length : 0;
  out.z = length > 0 ? z / length : 0;
  return out;
}

/**
 * **Wohin die Figur schaut, wenn sie läuft** — der Gierwinkel des Rigs für
 * eine Laufrichtung.
 *
 * Ein Rig schaut entlang −z; eine Drehung um φ legt −z auf
 * `(-sin φ, 0, -cos φ)`. Wer nach Norden läuft (`0, -1`), steht also bei φ = 0.
 */
export function yawFromDirection(x: number, z: number): number {
  return Math.atan2(-x, -z);
}

/** Der nächste Abstand, der überhaupt erlaubt ist — die engste Stufe. */
export const TOP_DOWN_MIN = TOP_DOWN_DISTANCES[0]!;
/** Und der fernste. Zwischen beiden darf ein Pinch stufenlos stehen bleiben. */
export const TOP_DOWN_MAX = TOP_DOWN_DISTANCES[TOP_DOWN_DISTANCES.length - 1]!;

/**
 * **Stufenlos zoomen** — zwei Finger auf dem Glas (Plan, _Pinch-Zoom_).
 *
 * Gerechnet wird als **Faktor auf den Abstand** und nicht als Stufe: Ein Pinch
 * ist eine Bewegung und keine Raste, und wer die Finger halb so weit
 * auseinanderzieht, will halb so weit weg stehen. Geklemmt wird auf dieselben
 * Enden, die auch das Rad hat — ein Zoom, der bis in die Kacheln hineinfährt,
 * ist kein Blickwinkel mehr, und einer, der die Welt zum Punkt macht, auch
 * nicht.
 */
export function zoomScaled(distance: number, factor: number): number {
  const scaled = Number.isFinite(factor) && factor > 0 ? distance * factor : distance;
  return Math.max(TOP_DOWN_MIN, Math.min(TOP_DOWN_MAX, scaled));
}

/**
 * **Wie weit zwei Finger den Abstand ändern**, als Faktor.
 *
 * Auseinanderziehen heißt heranzoomen: Der Ausschnitt wird größer, die Kamera
 * kommt näher, der Abstand wird **kleiner**. Also der alte Fingerabstand
 * geteilt durch den neuen. Ein Finger, der aufsetzt und im selben Bild
 * weiterrutscht, hat manchmal noch keinen Abstand — dann bleibt alles, wie es
 * ist (Faktor 1), statt durch null zu teilen.
 */
export function pinchFactor(previousGap: number, currentGap: number): number {
  if (!(previousGap > 0) || !(currentGap > 0)) return 1;
  return previousGap / currentGap;
}

/**
 * **Die nächste Raste vom aktuellen Abstand aus** — Rad und Bumper.
 *
 * Nach dem Pinch steht der Abstand irgendwo zwischen zwei Stufen, und eine
 * Raste, die sich die zuletzt gewählte Stufe merkt, spränge von dort aus
 * irgendwohin. Gefragt ist deshalb die nächste Stufe **oberhalb** (zurück)
 * bzw. **unterhalb** (heran) dessen, was man gerade sieht. An den Enden
 * rastet es wie eh und je.
 *
 * @param direction `-1` heran (näher), `+1` zurück (weiter weg)
 */
export function stepFromDistance(distance: number, direction: number): number {
  const sign = Math.sign(direction);
  if (sign < 0) {
    for (let i = TOP_DOWN_DISTANCES.length - 1; i >= 0; i--) {
      if (TOP_DOWN_DISTANCES[i]! < distance - NOTCH_EPS) return TOP_DOWN_DISTANCES[i]!;
    }
    return TOP_DOWN_MIN;
  }
  if (sign > 0) {
    for (let i = 0; i < TOP_DOWN_DISTANCES.length; i++) {
      if (TOP_DOWN_DISTANCES[i]! > distance + NOTCH_EPS) return TOP_DOWN_DISTANCES[i]!;
    }
    return TOP_DOWN_MAX;
  }
  return Math.max(TOP_DOWN_MIN, Math.min(TOP_DOWN_MAX, distance));
}

/**
 * Wie nah an einer Stufe „auf der Stufe" heißt, in Metern. Ohne diese
 * Kleinigkeit bliebe ein Rad, das bei 16,0000001 m steht, bei 16 m stehen.
 */
const NOTCH_EPS = 1e-3;
