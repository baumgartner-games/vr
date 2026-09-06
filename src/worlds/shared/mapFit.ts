/**
 * **Wie eine Welt auf ein Blatt kommt** — die Rechnung hinter jeder Karte.
 *
 * Eine Karte ist zwei Dinge: eine Auswahl (was gezeichnet wird, `mapScene.ts`)
 * und eine **Projektion** (wo es landet). Hier steht die zweite, und sie ist
 * absichtlich das kleinste Stück des Ganzen: eine Verschiebung, ein Maßstab
 * und eine mögliche Vierteldrehung. Alles, was eine Karte je zeigen wird —
 * Kacheln, Wände, Wege, wer wo steht —, geht durch diese vier Zeilen; wer die
 * Ansicht ändern will, ändert genau sie und nichts sonst.
 *
 * **Von oben und nicht schräg.** Es ist eine Draufsicht mit Norden oben und
 * keine isometrische Ansicht, und das ist eine Entscheidung: Auf einer
 * gekippten Karte ist ein rechter Winkel keiner mehr, zwei gleich große Räume
 * sind verschieden groß, und ein Weg, der geradeaus läuft, sieht aus wie ein
 * Umweg. Was eine Karte kann und ein Bild nicht, ist Maßstabstreue — und die
 * kippt man sich als Erstes weg. Wer trotzdem eine Schräge will, ändert
 * `toScreen` und `toWorld` und sonst nichts.
 *
 * **Die Vierteldrehung ist keine Zierde.** Ein Labor von 75 × 51 Metern auf
 * einem Telefon im Hochformat füllt die Breite und lässt oben und unten je ein
 * Drittel leer. Quer gelegt ist es doppelt so groß — und ein Grundriss hat,
 * anders als ein Foto, kein Oben, das stimmen müsste.
 *
 * Reine Zahlen, kein three.js und kein Canvas: Der Hin- und Rückweg ist die
 * eine Stelle, an der eine Karte falsch sein kann, ohne dass man es sieht
 * (`mapFit.test.ts`). Ein Tipp, der zehn Zentimeter danebengeht, ist ein Tipp,
 * der den falschen Knopf drückt.
 */

/** Ein Ausschnitt der Welt, in Metern — was auf die Karte soll. */
export interface MapBounds {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

/** Ein Punkt auf der Karte, in Bildpunkten. Y wächst nach unten. */
export interface MapPoint {
  x: number;
  y: number;
}

/** Ein Punkt in der Welt, in Metern. Die Höhe interessiert eine Karte nicht. */
export interface MapSpot {
  x: number;
  z: number;
}

/**
 * Die fertige Projektion: Maßstab, Bildmitte, Weltmitte und die Drehung.
 *
 * Alles vier zusammen, weil man sie nie einzeln braucht und weil ein Wert, der
 * zu den anderen nicht passt, eine Karte ergibt, die um genau diesen Wert
 * verschoben ist.
 */
export interface MapFit {
  /** Bildpunkte je Meter. */
  scale: number;
  /** Die Stelle im Bild, an der die Weltmitte liegt. */
  centre: MapPoint;
  /** Und welche Weltstelle das ist. */
  home: MapSpot;
  /** Ob die Welt dabei quer liegt (Vierteldrehung nach links). */
  turn: boolean;
  /** Die Größe des Bildes, für alles, was am Rand etwas malen will. */
  width: number;
  height: number;
}

export interface FitOptions {
  /** Luft am Rand, als Anteil der kürzeren Bildkante. Voreinstellung: 4 %. */
  padding?: number;
  /**
   * Quer legen: `true`/`false` erzwingt es, `'auto'` entscheidet danach, ob
   * die Welt und das Bild verschieden herum liegen. Voreinstellung `'auto'`.
   */
  turn?: boolean | 'auto';
  /** Näher heran als eingepasst: 2 heißt doppelt so groß. Voreinstellung 1. */
  zoom?: number;
  /**
   * Die Weltstelle, die in die Bildmitte kommt — ohne Angabe die Mitte des
   * Ausschnitts. Für eine **Minikarte**, die dem Spieler folgt, ist das der
   * ganze Unterschied: dieselbe Rechnung, nur mit ihm als Mitte.
   */
  centre?: MapSpot;
}

/** Ein leerer Ausschnitt — für eine Welt, die noch nichts hergibt. */
export function emptyBounds(): MapBounds {
  return { minX: 0, minZ: 0, maxX: 0, maxZ: 0 };
}

/** Der Ausschnitt um eine Reihe von Punkten, mit einem Rand in Metern. */
export function boundsAround(spots: Iterable<MapSpot>, margin = 0): MapBounds {
  let minX = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxZ = -Infinity;
  for (const spot of spots) {
    minX = Math.min(minX, spot.x);
    minZ = Math.min(minZ, spot.z);
    maxX = Math.max(maxX, spot.x);
    maxZ = Math.max(maxZ, spot.z);
  }
  if (!Number.isFinite(minX)) return emptyBounds();
  return { minX: minX - margin, minZ: minZ - margin, maxX: maxX + margin, maxZ: maxZ + margin };
}

/**
 * Passt einen Ausschnitt in ein Bild ein.
 *
 * Der Maßstab ist der **kleinere** der beiden, die je Achse hineinpassen —
 * sonst steht die Welt links und rechts über den Rand hinaus. Eine Welt ohne
 * Ausdehnung (ein Punkt, ein leerer Graph) bekommt einen Maßstab, mit dem man
 * etwas sieht, statt einer Division durch null.
 */
export function fitMap(
  bounds: MapBounds,
  width: number,
  height: number,
  options: FitOptions = {},
): MapFit {
  const wide = Math.max(0.001, bounds.maxX - bounds.minX);
  const deep = Math.max(0.001, bounds.maxZ - bounds.minZ);
  const turn =
    options.turn === undefined || options.turn === 'auto'
      ? width < height === wide > deep
      : options.turn;

  const pad = 1 - 2 * Math.max(0, Math.min(0.4, options.padding ?? 0.04));
  const room = { x: Math.max(1, width) * pad, y: Math.max(1, height) * pad };
  // Quer gelegt zeigt die Breite der Welt nach unten und ihre Tiefe zur Seite.
  const need = turn ? { x: deep, y: wide } : { x: wide, y: deep };
  const scale = Math.min(room.x / need.x, room.y / need.y) * Math.max(0.01, options.zoom ?? 1);

  return {
    scale,
    centre: { x: width / 2, y: height / 2 },
    home: options.centre ?? {
      x: (bounds.minX + bounds.maxX) / 2,
      z: (bounds.minZ + bounds.maxZ) / 2,
    },
    turn,
    width,
    height,
  };
}

/**
 * Welt → Bild.
 *
 * Ungedreht liegt Norden (−Z) oben und Osten (+X) rechts, wie auf jeder Karte.
 * Quer gelegt wird um eine Vierteldrehung **nach links** gekippt: Norden zeigt
 * dann nach links, und die lange Kante der Welt liegt auf der langen Kante des
 * Bildes.
 */
export function toScreen(fit: MapFit, spot: MapSpot, into?: MapPoint): MapPoint {
  const dx = (spot.x - fit.home.x) * fit.scale;
  const dz = (spot.z - fit.home.z) * fit.scale;
  const out = into ?? { x: 0, y: 0 };
  out.x = fit.centre.x + (fit.turn ? dz : dx);
  out.y = fit.centre.y + (fit.turn ? -dx : dz);
  return out;
}

/** Und zurück — für den Finger auf dem Bild. */
export function toWorld(fit: MapFit, point: MapPoint, into?: MapSpot): MapSpot {
  const px = (point.x - fit.centre.x) / fit.scale;
  const py = (point.y - fit.centre.y) / fit.scale;
  const out = into ?? { x: 0, z: 0 };
  out.x = fit.home.x + (fit.turn ? -py : px);
  out.z = fit.home.z + (fit.turn ? px : py);
  return out;
}

/** Wie viele Bildpunkte eine Länge in Metern hat. */
export function toPixels(fit: MapFit, metres: number): number {
  return metres * fit.scale;
}

/** Und umgekehrt — der Radius, in dem ein Tipp noch einen Knopf meint. */
export function toMetres(fit: MapFit, pixels: number): number {
  return pixels / fit.scale;
}
