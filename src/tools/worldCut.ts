/**
 * **Wie hoch eine Welt in der Vorschau aufgeschnitten wird.**
 *
 * Eine Welt mit Decke zeigt von schräg oben genau das, was ein Haus verbirgt:
 * den Deckel. Die Vorschau legt deshalb eine waagerechte Schnittebene hinein —
 * Puppenhaus statt Kiste —, und die lag bisher auf **Kopfhöhe**: Wände, die man
 * noch als Wände erkennt, und nichts mehr darüber.
 *
 * Nur ist „über Kopfhöhe steht nichts als Wand" bloß in einem Zimmer wahr. In
 * der **Kletterhalle** steht dort die Welt selbst: Die Kletterwände sind bis zu
 * 9,4 m hoch, die Decke liegt bei 10 — und der Schnitt auf 2,4 m ließ von der
 * ganzen Halle sechs Stummel auf einer blauen Matte übrig. Dasselbe gälte für
 * jede Halle, jeden Turm und jedes Haus mit einem zweiten Stockwerk.
 *
 * Also wird der Schnitt **gemessen statt gesetzt**: Er liegt über dem Höchsten,
 * was in der Welt steht — nie unter Kopfhöhe, nie über der Decke.
 *
 * **Und was bis an die Decke reicht, steht nicht in der Welt, sondern ist
 * sie:** die Hülle, die ja gerade weg soll. Ohne diese eine Zeile zöge jede
 * Außenwand den Schnitt sofort wieder unter ihre eigene Decke, und aus dem
 * Puppenhaus würde überall wieder die Kiste.
 *
 * Was dabei herauskommt, hängt an der Welt und nicht an einer Zahl hier: In
 * den Zimmern (Portal Labor, Pizzeria, Eingaberaum) hängt unter der Decke noch
 * Technik, und der Schnitt bleibt knapp darunter — man sieht das Zimmer mit
 * seinen Wänden, ohne Deckel. In der Kletterhalle bleiben die Kletterwände
 * stehen. Und in einem leeren Saal, in dem nur Tische stehen, sinkt er auf
 * Kopfhöhe: dort ist über Kopfhöhe wirklich nichts als Hülle.
 *
 * Ohne three.js, damit die Regel für sich geprüft werden kann; die Oberkanten
 * misst der Betrachter (`topsOf` in `viewer.ts`).
 */

/** Kopfhöhe — so tief geht der Schnitt, solange oben nur Hülle steht. */
export const CUT_HEAD = 2.4;

/**
 * So weit **unter** der Decke liegt er höchstens.
 *
 * Ohne den Abstand bliebe von der Decke ein Rand stehen: Sie ist eine Platte
 * mit Dicke, und ein Schnitt genau an ihrer Unterkante trifft sie nicht.
 */
export const CUT_BELOW_ROOF = 0.3;

/** Und so weit **über** dem Höchsten, das stehen bleiben soll. */
export const CUT_ABOVE_TOP = 0.3;

/**
 * Was so dicht unter der Decke endet, zählt als Hülle und nicht als Inhalt.
 *
 * Eine Handbreit, mehr nicht: Eine Wand darf ihre Decke um einen Zentimeter
 * verfehlen oder ein Stück in sie hineinragen. Was tiefer hängt, ist etwas —
 * eine Lampe, ein Schild, eine Galerie —, und das will man sehen.
 */
export const ROOF_REACH = 0.25;

/**
 * Die Höhe des Schnitts durch eine Welt mit Decke.
 *
 * @param roof Wo die Decke liegt (`World.roof`).
 * @param tops Die Oberkanten von allem Sichtbaren, in derselben Höhe gemessen.
 */
export function cutHeight(roof: number, tops: Iterable<number>): number {
  const lid = roof - CUT_BELOW_ROOF;
  let top = 0;
  for (const value of tops) {
    // Die Hülle zählt nicht mit — sonst schnitte sich jede Welt selbst zu.
    if (value > roof - ROOF_REACH) continue;
    if (value > top) top = value;
  }
  // Nie über die Decke: Ein Schnitt darüber ist keiner. Und nie unter
  // Kopfhöhe, solange die noch unter der Decke liegt — in einem Haus mit 2,6 m
  // Decke gewinnt die Decke, sonst bliebe der Deckel liegen.
  return Math.min(lid, Math.max(Math.min(CUT_HEAD, lid), top + CUT_ABOVE_TOP));
}
