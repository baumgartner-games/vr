/**
 * Der Schießgang hinter dem Eingaberaum, in Zahlen.
 *
 * Er steht hier und nicht in einer der Klassen darin, weil ihn inzwischen
 * mehrere brauchen und keine ihn besitzt: die Welt baut seine Wände, die
 * Stände richten sich an seiner Länge aus, und die Zielscheiben hängen an
 * seinem Ende. Eine Zahl an zwei Stellen ist eine, die irgendwann
 * auseinanderläuft.
 *
 * Breit ist er, weil viel darin steht: an der einen Wand das Werkzeug-Menü, an
 * der anderen die Knöpfe und die Werte-Tafel, und dazwischen **zwei**
 * Justierstände mit je einem Ausleger voller Griffe. Eng war er, solange nur
 * einer darin stand.
 */

/** Halbe Breite, Länge und lichte Höhe, in Metern. */
export const LANE = { half: 2.2, length: 9.5, height: 2.7 };

/** Wo die Zielscheiben hängen: Höhe über dem Boden und Abstand zur Tür. */
export const TARGET = { y: 1.45, z: LANE.length - 0.35, radius: 0.32 };
