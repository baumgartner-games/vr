import type * as THREE from 'three';
import type { InteractionLike } from './interaction';
import type { Handedness } from './XRInput';

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
 * **Womit** man das Gemeinte dann bedient, steht nebenan (`core/interaction.ts`)
 * und ausdrücklich nicht hier: Diese Datei beantwortet „was ist gemeint", jene
 * „was will es" — `A` von oben, linke Maustaste oder `E` aus den Augen, Hand
 * oder Trigger in der Brille, und beim Greifen dort die gehaltene Greif-Taste.
 * Ein `Usable` trägt die Absicht als Feld (`interaction`) und weiß von den
 * Ansichten nichts; die Auflösung macht die Welt, wenn sie weiß, in welcher
 * sie gerade läuft.
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
  /**
   * **Welche Hand es war** — nur in der Brille, und nur, wenn eine es war.
   *
   * Von oben und am Schreibtisch gibt es keine: Dort drückt die Figur, und was
   * sie nimmt, hängt vor ihrem Bauch (`kitchen.carryInHands`). In der Brille
   * gibt es zwei, und was eine davon nimmt, soll **in ihr** liegen und sich
   * mit ihr drehen — die Pfanne wie ein Werkzeug, am Stiel
   * (`core/grabHandles.ts`). Ohne diese Zeile wüsste die Küche nicht, an
   * welche der beiden sie das Ding hängen soll.
   *
   * Freiwillig, und wer nichts angibt, ist die Figur — also alles, was es
   * vorher gab.
   */
  readonly hand?: Handedness;
}

/**
 * Was ein Ding können muss, damit man es benutzen kann.
 *
 * `use` gibt zurück, ob wirklich etwas passiert ist — ein Knopf, der gerade
 * nachläuft, und ein Tor, das schon offen steht, sagen `false`, und die Welt
 * sucht dann nicht weiter nach einer Meldung, die es nicht gibt.
 *
 * `usePrompt` ist der Satz, den ein Ding über seine eigene Tat sagt —
 * „Tomate nehmen", „Feuer löschen", „Das ist noch nicht gebraten".
 *
 * **Gezeigt wird er nicht mehr.** Bis eben hing er als Tafel in der Bildmitte
 * über der Figur (`PortalWorld.showUsePrompt`), und das war einmal zu viel:
 * Was `A` gerade meint, sagt der **gelbe Saum** (`core/highlight.ts`) schon,
 * und zwar dort, wo das Ding steht, statt quer über der halben Küche. Die
 * Tafel ist deshalb weg; der Satz bleibt, weil er die geprüfte Beschreibung
 * dessen ist, was ein Druck bewirkt (`kitchenCarry.kitchenPrompt` und die
 * Tests daneben), und weil eine Welt ihn jederzeit selbst melden kann.
 *
 * **Und `interaction` sagt, wie es benutzt werden will** (`core/interaction.ts`).
 * Das ist die zweite Hälfte der Auskunft und die neuere: `usePrompt` sagt, was
 * ein Druck **bewirkt** („Tomate nehmen"), `interaction` sagt, **womit** man
 * ihn in der gerade laufenden Ansicht auslöst — `A` von oben, linke Maustaste
 * oder `E` aus den Augen, Hand oder Trigger in der Brille, und beim Greifen
 * dort die gehaltene Greif-Taste. Beides getrennt, weil das eine am Gericht
 * hängt und das andere am Gerät.
 *
 * Es ist freiwillig, und wer nichts angibt, ist ein Knopf (`press`) — genau
 * das Verhalten, das jedes Usable dieses Projekts vorher hatte.
 */
export interface Usable {
  use(by: UseSource): boolean;
  usePrompt?(): string;
  readonly interaction?: InteractionLike;
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

/**
 * **Ein Griff ist ein sichtbares Netz** — die Regel, nach der eine Welt einen
 * angemeldeten Kandidaten annimmt oder übergeht (`PortalWorld.collectUsables`).
 *
 * Sie steht hier als reine Frage an einen Knoten, ohne Welt und ohne Liste,
 * und das hat einen Anlass: In `collectUsables` stand dafür ein
 * `entry.object.visible`, und genau daran ist der Bodenhebel hängengeblieben.
 * Er hatte beim Umzug auf das Regalmodell seine gerechnete Säule als Griff
 * **behalten** und sie nur ausgeknipst; angemeldet war damit etwas, das
 * niemand mehr sah. `A` fand ihn nicht mehr, und weil der gelbe Saum auf
 * demselben Knoten liegt (`core/highlight.ts`), leuchtete auch nichts. Ein
 * Fehler dieser Art fällt nur dem auf, der in der Welt davorsteht — und er
 * kommt beim nächsten Modelltausch wieder. Als Funktion lässt er sich
 * aufschreiben und von einem Test nachhalten, ohne dass dafür WebGL läuft.
 *
 * Gefragt wird zweierlei, und beides ist dieselbe Frage aus zwei Richtungen:
 *
 * - **Hängt es im Sichtbaren?** `visible` gilt in three.js für den ganzen Ast
 *   darunter; ein Griff unter einer ausgeknipsten Gruppe ist so unsichtbar wie
 *   ein ausgeknipster Griff. Der Weg nach oben kostet ein paar Knoten und
 *   beantwortet den Fall, den das bloße `visible` des Griffs übersieht.
 * - **Ist etwas davon zu sehen?** Wer Netze mitbringt, muss mindestens eines
 *   zeigen. Eine Gruppe, deren Formen alle aus sind, ist ein Stück Luft mit
 *   einem Namen — und genau das war der Hebel.
 *
 * **Wer gar keine Netze hat, gilt trotzdem.** Ein Usable darf ausdrücklich
 * eine leere Gruppe sein — eine Zone, ein Platz, ein Ort, an dem etwas
 * passiert. Der Saum wird dort zu einem Ring auf dem Boden
 * (`core/highlight.ts`, `Highlight.showRing`), und das ist die Auskunft, die
 * gemeint war. Nur wer Geometrie hat und sie versteckt, versteckt sich.
 */
export function usableShows(object: THREE.Object3D): boolean {
  for (let node: THREE.Object3D | null = object; node; node = node.parent) {
    if (!node.visible) return false;
  }
  let meshes = 0;
  let shown = 0;
  object.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    meshes++;
    if (shownWithin(mesh, object)) shown++;
  });
  return meshes === 0 || shown > 0;
}

/**
 * Ob dieses Netz **unterhalb von `root`** zu sehen ist.
 *
 * Über `root` hinaus wird nicht gefragt: Das hat `usableShows` schon getan,
 * und zweimal denselben Ast hinaufzulaufen kostet bei einer Küche voller
 * Stationen in jedem Bild mehr, als es beantwortet.
 */
function shownWithin(mesh: THREE.Object3D, root: THREE.Object3D): boolean {
  for (let node: THREE.Object3D | null = mesh; node; node = node.parent) {
    if (!node.visible) return false;
    if (node === root) break;
  }
  return true;
}

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

/**
 * **Wohin die Figur schaut, wenn sie `A` drückt** — je Ansicht eine andere
 * Auskunft (Plan, _Interaktion und Steuerung_).
 *
 * Von oben ist es die **Rig-Richtung**: Dort dreht die Steuerung die ganze
 * Figur zum Ziel, und der Kopf hat keine eigene Meinung. Aus den Augen und in
 * der Brille ist es die **Kopfrichtung**, waagerecht projiziert
 * (`PlayerRig.getHeadForward`) — da steht die Figur still und sieht sich um,
 * und wer einen Knopf ansieht, meint ihn.
 *
 * Waagerecht, weil die Auswahl auf dem Boden rechnet (siehe oben). Und wer
 * senkrecht nach unten schaut, hat keine waagerechte Richtung mehr; dann gilt
 * wieder die Figur, sonst zeigte `A` beim Blick auf die eigenen Füße
 * irgendwohin.
 *
 * @param topDown ob gerade von oben gespielt wird (`WorldContext.topDown`)
 */
export function aimForward<T extends THREE.Vector3>(
  topDown: boolean,
  rigForward: THREE.Vector3,
  headForward: THREE.Vector3,
  out: T,
): T {
  const wanted = topDown ? rigForward : headForward;
  const flat = Math.hypot(wanted.x, wanted.z);
  if (flat > 1e-4) {
    out.set(wanted.x / flat, 0, wanted.z / flat);
    return out;
  }
  const fallback = Math.hypot(rigForward.x, rigForward.z);
  if (fallback > 1e-4) {
    out.set(rigForward.x / fallback, 0, rigForward.z / fallback);
    return out;
  }
  out.set(0, 0, -1);
  return out;
}
