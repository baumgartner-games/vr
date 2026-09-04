/**
 * Die Farben, an denen man sieht, was man anfassen darf.
 *
 * Eine Spülmaschine sagt einem nie, wo der Griff ist — sie färbt ihn, und
 * danach greift jeder beim ersten Mal richtig. In VR ist das mehr als Komfort:
 * ein Werkzeug ist ein Klotz aus Dreiecken, und ob man es am Lauf oder am
 * Schaft nehmen soll, sieht man ihm nicht an. Also bekommt alles, was eine
 * Hand nehmen darf, dieselbe Farbe — der Griff der Pistole, der Ring um die
 * Linse der Taschenlampe, die Plätze am Gürtel.
 *
 * Zwei Töne, nicht einer: **`GRAB_TINT`** ist die ruhige Farbe des Materials,
 * die immer da ist und nur sagt „hier anfassen"; **`GRAB_GLOW`** ist das
 * Leuchten in dem Moment, in dem die Hand nah genug ist. Sie sind bewusst
 * verwandt und bewusst nicht gleich — sonst wüsste man nicht, ob etwas
 * *anfassbar* ist oder *gerade jetzt* zu greifen.
 *
 * Diese Datei ist der einzige Ort, an dem diese Zahlen stehen. Wer eine neue
 * Handhabe baut, holt sie hier — eine zweite türkise Zahl irgendwo im Code ist
 * genau das, was die Regel nach drei Monaten kaputt macht.
 *
 * Reine Zahlen, kein three.js: das Material dazu baut `grabMaterial()` in
 * `tools/Tool.ts`.
 */

/** Was angefasst werden darf: Griffe, Handhaben, Ringe. */
export const GRAB_TINT = 0x1e9a84;

/**
 * Derselbe Ton, dunkler — für große Flächen, die sonst wie eine Leuchtreklame
 * wirken, und für Handhaben, die auf hellem Material sitzen.
 */
export const GRAB_TINT_DARK = 0x10604f;

/** Wie stark eine Handhabe von sich aus glimmt, damit sie im Dunkeln bleibt. */
export const GRAB_TINT_EMISSIVE = 0.22;

/** In Reichweite, jetzt zu greifen. Verwandt mit `GRAB_TINT`, aber heller. */
export const GRAB_GLOW = 0x5ee0a0;

/** In der Hand eines anderen Spielers oder festgehalten. */
export const GRAB_GLOW_LOCKED = 0xffb35c;

/** Vom Transformationswerkzeug ausgewählt. */
export const GRAB_GLOW_PICKED = 0x9d7bff;

/** Ein Platz, der gerade nichts hergibt — der leere Gürtelring. */
export const GRAB_IDLE = 0x6f7d99;
