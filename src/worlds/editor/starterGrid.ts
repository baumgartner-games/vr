import { GridPlan } from '../grid/gridPlan';
import { DIR_N, DIR_S, DIR_W } from '../nav/navTile';

/**
 * **Der Grundriss, mit dem der Bauplatz aufmacht**: ein Zimmer mit einer Tür —
 * und seit es Bausteine gibt, mit etwas darin.
 *
 * Nicht leer, und das ist der ganze Grund: Eine leere Ebene beantwortet die
 * erste Frage nicht, die jeder hat — *wie sieht denn eine Wand hier aus?* Ein
 * Zimmer beantwortet sie in einem Blick, und wer es nicht will, löscht es in
 * zehn Sekunden.
 *
 * Die Küchenzeile und der Tisch beantworten die zweite: *Was kann ich hier
 * hineinstellen?* Ohne sie sähe die zweite Reihe der Palette aus wie eine
 * Reihe Knöpfe, von denen niemand weiß, wofür sie da sind.
 */
export function starterGrid(): GridPlan {
  const plan = new GridPlan([0]);
  // **Acht mal acht Kacheln, also acht Meter im Quadrat.** Auf dem alten
  // Gitter waren sechs Kacheln fünfzehn Meter — eine Halle, in der man das
  // Zimmer erst suchen muss. Acht Meter sind eine große Stube: groß genug,
  // dass eine Küchenzeile und ein Tisch darin nicht aneinanderstoßen, klein
  // genug, dass man von einer Ecke die andere sieht.
  plan.room({ x: -4, z: -4, w: 8, d: 8 }, { walls: true });
  // Eine Tür in der Südwand, damit man beides einmal gesehen hat.
  plan.door(0, 3, DIR_S);

  // Und eine kleine Küche in der Nordwestecke, damit man sieht, dass ein
  // Zimmer mehr sein darf als vier Wände. Drei Kacheln Zeile sind jetzt drei
  // Meter — eine Küchenzeile, wie sie in einer Küche steht.
  plan.put('counter', -4, -4, DIR_N);
  plan.put('counter', -3, -4, DIR_N);
  plan.put('counter', -2, -4, DIR_N);
  plan.put('shelf', -4, -3, DIR_W);
  plan.put('shelf', -4, -2, DIR_W);
  plan.put('table', -1, -1, DIR_N);
  return plan;
}
