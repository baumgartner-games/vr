/**
 * **Weltbau** — die Welt von oben ansehen, auch in der Brille, und darüber
 * fliegen.
 *
 * Gewünscht war es an Stelle des Bauplatzes (`worlds/editor/EditorWorld`, weg
 * seit Oktober 2026): _„einen Welt-Bau-Modus, wo man einfach wie bei ‚von
 * oben' zuschaut, also auch in VR. Nur da kann man dann mit dem linken Stick
 * entlang der x,y-Achse fliegen. Und mit dem rechten Stick hoch, runter, in
 * der Welt hoch und runter fliegen. Mit dem rechten Stick links rechts dreht
 * man sich weiterhin."_
 *
 * Und das Wichtigste daran: _„Die Welt soll nicht kleiner werden, nur die
 * eigenen Bewegungen in VR (also Entfernungen der Hand) oder Neigung/Bewegung
 * des Kopfes werden skaliert, damit die Berechnungen in der Welt gleich
 * bleiben."_ Deshalb wird hier **das Gestell** vergrößert (`PlayerRig.scale`)
 * und nicht die Welt verkleinert: Ein Zentimeter, um den sich der Kopf
 * bewegt, ist in der Welt `BUILD_SCALE` Zentimeter, der Augenabstand auch —
 * und so sieht man die Welt wie ein Modell auf dem Tisch, während jede Wand,
 * jede Zelle und jede Physik in ihren echten Metern bleibt. Das Menü hängt
 * am Gestell und wächst mit (`GameMenu`, `XRMenuLayer` rechnet relativ zum
 * Gestell), es steht also so scharf und so weit weg wie immer.
 *
 * **Am Schirm** heißt Weltbau einfach: von oben (`crane.screenTopDown`). Dort
 * gibt es die Ansicht schon, mit Zoom und Drehen.
 *
 * **Nicht gespeichert, mit Absicht** — aus demselben Grund wie der Spielmodus
 * (`gameMode.ts`): Wer nach dem Neuladen zwanzig Meter über dem Boden
 * aufwacht, wundert sich. Jede Sitzung und jede Welt fängt am Boden an.
 *
 * Kein three.js — hier steht nur die Rechnung; geflogen wird in
 * `PlayerRig.updateFlight`.
 */

/**
 * **Um wie viel das Gestell wächst** — ein echter Meter ist so viele Meter in
 * der Welt. Bei zehn steht ein Spieler mit 1,60 m Augenhöhe mit den Augen
 * auf 16 m, und ein Raum von acht Metern liegt vor ihm wie ein Karton von
 * 80 cm.
 */
export const BUILD_SCALE = 10;

/**
 * **Wie tief und wie hoch die Augen fliegen dürfen**, in Metern über dem
 * Boden, auf dem man losgeflogen ist. Unten reicht es bis knapp über eine
 * Theke — tiefer ist man ein Riese, der in den Boden schaut —, oben bis
 * dorthin, wo auch die größte Welt (die Test Navigation, 60 m) ganz ins Bild
 * passt.
 */
export const BUILD_MIN_EYE = 2;
export const BUILD_MAX_EYE = 150;

/**
 * **Wie schnell geflogen wird** — Abstände je Sekunde, wie beim Kran
 * (`crane.CRANE_PAN`): Wer hoch oben ist, will weit fahren, wer dicht über
 * den Möbeln schwebt, fein. Gemessen an der Augenhöhe über dem Boden, mit
 * `BUILD_MIN_SPEED` Metern je Sekunde als Untergrenze.
 */
export const BUILD_PAN = 0.8;
export const BUILD_CLIMB = 0.8;
export const BUILD_MIN_SPEED = 3;

/** Unter so viel Ausschlag ruht ein Stick — die Sticks der Quest zittern. */
export const BUILD_DEADZONE = 0.15;

/** Ein Stickausschlag ohne Totzone, neu auf 0…1 gestreckt. */
function dead(value: number): number {
  const magnitude = Math.abs(value);
  if (!(magnitude > BUILD_DEADZONE)) return 0;
  return Math.sign(value) * Math.min(1, (magnitude - BUILD_DEADZONE) / (1 - BUILD_DEADZONE));
}

/**
 * **Der Schritt eines Bildes**, in Weltmetern.
 *
 * - Der **linke Stick** fliegt waagerecht, nach vorn ist, wohin der Kopf
 *   schaut (`yaw` wie `walkFrame`: 0 heißt −z), seitlich quer dazu.
 * - Der **rechte Stick nach vorn** steigt, nach hinten sinkt — wie ein Hebel,
 *   den man nach oben drückt. Gekappt wird an `BUILD_MIN_EYE` und
 *   `BUILD_MAX_EYE`.
 *
 * @param eye Augenhöhe über dem Startboden, in Metern
 */
export function flightStep(
  left: { readonly x: number; readonly y: number },
  rightY: number,
  yaw: number,
  eye: number,
  dt: number,
): { x: number; y: number; z: number } {
  if (!(dt > 0)) return { x: 0, y: 0, z: 0 };
  const height = Number.isFinite(eye) ? eye : BUILD_MIN_EYE;
  const speed = Math.max(BUILD_MIN_SPEED, height);

  let sx = dead(left.x);
  let sy = dead(left.y);
  const length = Math.hypot(sx, sy);
  if (length > 1) {
    sx /= length;
    sy /= length;
  }
  // Vorn ist −z, gedreht um `yaw`; rechts steht quer dazu.
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  const rx = Math.cos(yaw);
  const rz = -Math.sin(yaw);
  const pan = speed * BUILD_PAN * dt;
  const x = (fx * -sy + rx * sx) * pan;
  const z = (fz * -sy + rz * sx) * pan;

  const climb = -dead(rightY) * speed * BUILD_CLIMB * dt;
  const goal = Math.min(BUILD_MAX_EYE, Math.max(BUILD_MIN_EYE, height + climb));
  // Wer schon außerhalb steht (eben eingeschaltet, ein kleiner Spieler),
  // wird nicht hineingerissen, sondern darf nur in Richtung Spielraum.
  const y =
    height < BUILD_MIN_EYE
      ? Math.max(0, climb)
      : height > BUILD_MAX_EYE
        ? Math.min(0, climb)
        : goal - height;
  return { x, y, z };
}

let current = false;
const listeners = new Set<(on: boolean) => void>();

/** Ob gerade Weltbau ist. */
export function buildFlight(): boolean {
  return current;
}

/** Ein- oder ausschalten und allen sagen, die zuhören — nur bei einem Wechsel. */
export function setBuildFlight(on: boolean): boolean {
  if (on === current) return current;
  current = on;
  for (const listener of listeners) listener(on);
  return current;
}

/** Zuhören, wenn Weltbau an- oder ausgeht — zurück kommt das Abmelden. */
export function onBuildFlight(listener: (on: boolean) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
