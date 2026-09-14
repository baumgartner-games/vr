import type * as THREE from 'three';

/**
 * **Benutzen** — was `A` (am Schreibtisch `E`) mit dem tut, was vor der Figur
 * steht.
 *
 * In der Brille macht das die Hand: Man geht hin, legt sie auf den Knopf und
 * drückt. Von oben gibt es keine Hand, die man irgendwo hinlegt — es gibt eine
 * Figur, die irgendwo steht und irgendwohin schaut, und eine Taste. Diese
 * Datei ist die Übersetzung zwischen beidem, und sie besteht aus zwei Teilen:
 *
 * - einer **Schnittstelle** `Usable`, an die sich Knöpfe, Hebel, Türgriffe und
 *   Tore hängen — dieselben Objekte, die in VR die Hand berührt, und
 *   **dieselbe** Wirkung. Es gibt keine zweite Knopfmechanik für die Ansicht
 *   von oben, sonst hätte der Knopf nach der dritten Änderung zwei Verhalten.
 * - der **Auswahl** `pickUsable`: welches von allen ist gemeint? Sie ist reine
 *   Rechnung, ohne Szene und ohne Raycaster, damit ein Test sie nachrechnen
 *   kann (Plan, E5).
 *
 * **Gerechnet wird auf dem Boden**, in x und z, und nicht im Raum. Ein
 * Knopf sitzt auf Hüfthöhe, ein Türgriff höher, eine Druckplatte am Boden —
 * wer von oben davorsteht, meint sie alle, und ein Strahl aus der Brust
 * verfehlte die Platte um genau die Höhe der Brust. Die Figur zeigt auf eine
 * **Stelle**, nicht auf eine Höhe; deshalb ist jedes benutzbare Ding hier ein
 * stehender Zylinder, und der Strahl liegt waagerecht.
 */

/** Woher der Druck kam: die Figur selbst, oder eine Kugel (Portal-Regel). */
export type UseKind = 'player' | 'bullet';

/** Wer benutzt — mehr braucht ein Knopf nicht zu wissen. */
export interface UseSource {
  readonly kind: UseKind;
  /** Wo der Anstoß herkam: die Brust der Figur, der Einschlagpunkt der Kugel. */
  readonly at: THREE.Vector3;
  /** Wohin er zeigte: die Blickrichtung der Figur, die Flugbahn der Kugel. */
  readonly forward: THREE.Vector3;
}

/**
 * Was ein Ding können muss, damit man es benutzen kann.
 *
 * `use` gibt zurück, ob wirklich etwas passiert ist — ein Knopf, der gerade
 * nachläuft, und ein Tor, das schon offen steht, sagen `false`, und die Welt
 * sucht dann nicht weiter nach einer Meldung, die es nicht gibt.
 *
 * `usePrompt` ist der Satz über der Figur (_E · Knopf drücken_). Wer keinen
 * hat, bekommt keinen Hinweis — das ist der Normalfall für alles, was man
 * ohnehin sieht.
 */
export interface Usable {
  use(by: UseSource): boolean;
  usePrompt?(): string;
}

/**
 * **Wie weit der Strahl aus der Brust reicht**, in Metern (Plan, E5).
 *
 * Eine Armlänge und noch eine halbe: weit genug, dass man den Knopf nicht
 * suchen muss, kurz genug, dass man nicht die Tür auf der anderen Seite des
 * Raums aufmacht, weil man zufällig hinsah.
 */
export const USE_REACH = 1.5;

/**
 * **Und wie weit um die Füße herum** noch etwas zählt, in Metern (Plan, E5).
 *
 * Der Strahl braucht eine Richtung; wer mitten in einem Ding steht, hat keine.
 * Also gilt zusätzlich: Was die Füße überlappen, ist gemeint — auch wenn die
 * Figur gerade woandershin schaut.
 */
export const USE_TOUCH = 0.6;

/**
 * **Wie hoch über den Füßen der Strahl losgeht**, in Metern.
 *
 * Gerechnet wird damit nichts (die Auswahl liegt auf dem Boden, siehe oben) —
 * es ist der Punkt, den ein Knopf als `UseSource.at` zu sehen bekommt, wenn er
 * wissen will, von wo aus er gedrückt wurde.
 */
export const USE_CHEST = 1.2;

/**
 * **Wie breit ein Ding fürs Benutzen mindestens ist**, in Metern.
 *
 * Ein Kippschalter ist vier Zentimeter groß, und auf vier Zentimeter zielt von
 * oben niemand. Die Trefferfläche ist deshalb nie kleiner als das hier; wem
 * das zu großzügig ist, gibt beim Anmelden seinen eigenen Halbmesser an.
 */
export const USE_RADIUS = 0.4;

/**
 * **Wie weit die Trefferfläche über den Körper hinausreicht**, in Metern.
 *
 * Eine Kugel fliegt nicht *in* einen Knopf hinein: Sie bleibt an seinem
 * Kollisionskörper stehen, und ihre Strecke endet damit genau eine
 * Kuppelhalbmesserlänge neben dessen Mitte — knapp **außerhalb** einer
 * Trefferkugel, die genauso groß ist wie das, was man sieht. Ohne diesen
 * Zuschlag trifft man den Knopf nie, egal wie genau man zielt.
 */
export const SHOT_MARGIN = 0.12;

/** Ein Ding, das benutzt werden könnte — so viel, wie die Auswahl davon braucht. */
export interface UseCandidate {
  usable: Usable;
  /** Wo es steht, in Weltkoordinaten; y wird nicht gelesen. */
  position: THREE.Vector3;
  /** Der Halbmesser seines stehenden Zylinders, in Metern. */
  radius: number;
  /** Das Objekt dahinter — die Welt bekommt es zurück, die Rechnung ignoriert es. */
  object?: THREE.Object3D;
}

/** Was `pickUsable` gefunden hat. */
export interface UsePick {
  candidate: UseCandidate;
  /** Abstand in Metern: entlang des Strahls, sonst waagerecht zur Figur. */
  distance: number;
  /** Ob der Strahl es getroffen hat — sonst überlappen nur die Füße. */
  ray: boolean;
}

/**
 * **Was gemeint ist**, wenn die Figur an `origin` steht, nach `forward` schaut
 * und `A` drückt.
 *
 * Die Reihenfolge ist die Entscheidung E5 aus dem Plan, und sie hat einen
 * Grund: **Der Strahl sticht die Überlappung.** Wer vor einer Druckplatte
 * steht und dabei auf den Knopf dahinter zeigt, meint den Knopf — sonst
 * bediente man beim Danebenstehen immer das, worauf man gerade steht, und das
 * Zeigen hätte keine Wirkung. Unter Gleichen gewinnt das **Nächste**.
 *
 * @param origin  wo die Figur steht (x/z zählen)
 * @param forward wohin sie schaut; die Länge ist egal, y wird nicht gelesen
 * @returns das Gemeinte, oder `null`, wenn nichts in Reichweite ist
 */
export function pickUsable(
  candidates: readonly UseCandidate[],
  origin: THREE.Vector3,
  forward: THREE.Vector3,
  reach = USE_REACH,
  touch = USE_TOUCH,
): UsePick | null {
  const length = Math.hypot(forward.x, forward.z);
  const dx = length > 0 ? forward.x / length : 0;
  const dz = length > 0 ? forward.z / length : 0;

  let best: UsePick | null = null;
  for (const candidate of candidates) {
    const ox = candidate.position.x - origin.x;
    const oz = candidate.position.z - origin.z;
    const radius = Math.max(candidate.radius, 0);

    // Der Strahl: wie weit vorn liegt die Mitte, und wie weit daneben?
    if (length > 0) {
      const along = ox * dx + oz * dz;
      const perp = Math.hypot(ox, oz) ** 2 - along * along;
      if (along >= -radius && along <= reach && perp <= radius * radius) {
        // Die Vorderkante des Zylinders, nie hinter der Figur.
        const distance = Math.max(0, along - Math.sqrt(Math.max(0, radius * radius - perp)));
        if (!best || !best.ray || distance < best.distance) {
          best = { candidate, distance, ray: true };
        }
        continue;
      }
    }

    // Sonst die Füße: überlappen sie den Zylinder?
    if (best?.ray) continue;
    const distance = Math.hypot(ox, oz);
    if (distance > touch + radius) continue;
    if (!best || distance < best.distance) best = { candidate, distance, ray: false };
  }
  return best;
}

/**
 * **Ob eine Strecke einen stehenden Zylinder trifft** — die Frage einer Kugel
 * zwischen zwei Bildern.
 *
 * Eine Kugel fliegt Meter je Bild; was sie unterwegs getroffen hat, ist eine
 * Strecke und kein Punkt (`PortalWorld.bulletTravelled` rechnet mit NPCs
 * genauso). Hier wird nur waagerecht gemessen, aus demselben Grund wie oben —
 * mit einer Ausnahme: Die Höhe wird mitgeprüft, denn eine Kugel, die zwei
 * Meter über einem Knopf hinwegfliegt, hat ihn nicht gedrückt.
 *
 * @param half wie weit der Zylinder über und unter seiner Mitte reicht
 */
export function shotHitsUsable(
  from: THREE.Vector3,
  to: THREE.Vector3,
  centre: THREE.Vector3,
  radius: number,
  half = 0.5,
): boolean {
  const top = Math.max(from.y, to.y);
  const bottom = Math.min(from.y, to.y);
  if (bottom > centre.y + half || top < centre.y - half) return false;

  const vx = to.x - from.x;
  const vz = to.z - from.z;
  const wx = centre.x - from.x;
  const wz = centre.z - from.z;
  const lengthSq = vx * vx + vz * vz;
  // Steht die Kugel still, ist die Strecke ein Punkt — dann zählt der Abstand.
  const t = lengthSq > 0 ? Math.max(0, Math.min(1, (wx * vx + wz * vz) / lengthSq)) : 0;
  const nx = wx - t * vx;
  const nz = wz - t * vz;
  return nx * nx + nz * nz <= radius * radius;
}

/**
 * **Die Ablage am Objekt** (`userData.usable`).
 *
 * Damit findet auch jemand, der die Liste der Welt nicht kennt, heraus, ob
 * etwas benutzbar ist — ein Strahl, ein Editor, eine Kugel. Die Liste bleibt
 * trotzdem die Quelle für die Auswahl je Bild: Eine szeneweite Suche in jedem
 * Bild ist genau das, was sie nicht sein soll.
 */
export function markUsable(object: THREE.Object3D, usable: Usable | null): void {
  if (usable) object.userData.usable = usable;
  else delete object.userData.usable;
}

/** Was hier hängt — oder am nächsten Elternteil darüber. */
export function usableOf(object: THREE.Object3D | null): Usable | null {
  for (let node = object; node; node = node.parent) {
    const found = node.userData.usable as Usable | undefined;
    if (found) return found;
  }
  return null;
}
