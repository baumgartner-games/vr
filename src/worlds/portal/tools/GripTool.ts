import { Tool } from './Tool';

/**
 * **Der Griff** — als Werkzeug, zum Einstellen der Faust daran.
 *
 * Alles andere in diesem Ordner ist ein Ding *mit* einem Griff. Dieses hier
 * ist der Griff selbst und sonst nichts: derselbe Zylinder, an derselben
 * Stelle in der Faust, mit denselben drei Rillen — nur ohne Lauf, Deck oder
 * Rohr darum herum.
 *
 * Wozu, sagt die Rechnung in `gripFit.ts`: **nicht der Griff folgt dem
 * Werkzeug, sondern das Werkzeug dem Griff.** Damit haben zwanzig Werkzeuge
 * eine gemeinsame Faust — und eine gemeinsame Faust stellt man einmal ein und
 * nicht zwanzigmal. Wer sie zwanzigmal einstellt, stellt neunzehnmal dasselbe
 * ein und einmal aus Versehen etwas anderes.
 *
 * Genau dafür ist dieses Werkzeug da. Was daran eingemessen wird, landet unter
 * seiner eigenen Id `grip`, und die ist zugleich die Id, unter der die Faust
 * des **Pistolengriffs** liegt (`GRIP_POSE_IDS` in `core/handPose.ts`). Jedes
 * Werkzeug mit diesem Griff, das keine eigene Haltung gespeichert hat, erbt
 * sie ab dem nächsten Bild — Pistole, Duplizierer, Inspektor, Teleporter,
 * Größe & Position, Holster, Greifhaken, Portalwaffen, Pinsel, Messband,
 * Radiergummi, Röntgen-Scanner, Stoppuhr.
 *
 * Die **Linie nach vorn** gehört dazu und ist nicht Schmuck: einem Zylinder
 * sieht man nicht an, wie herum er in der Faust liegt, und beim Einstellen ist
 * genau das die Frage. Die grüne Linie sagt, wohin der Griff zeigt, die
 * bernsteinfarbene am Zeigefinger, wohin die Hand zeigt — sind die beiden
 * parallel, sitzt die Faust.
 *
 * Es hat keinen Trigger und keine zweite Funktion. Ein Griff tut nichts, das
 * ist sein ganzer Sinn.
 */
export class GripTool extends Tool {
  override readonly toolId = 'grip';
  override readonly label = 'Griff';

  constructor() {
    super();
    this.name = 'tool-grip';
    this.icon = 'wrench';
    this.accent = 0x5ee0a0;
    this.hint = 'Die Faust am Standardgriff einstellen — sie gilt dann für alle Werkzeuge daran';
    // Kein `holdRotation` davor: ein blanker Griff zeigt dorthin, wohin man
    // zeigt, und das ist genau die Ruhe. `mountGrip` setzt die geteilte
    // `holdPosition` gleich mit.
    this.mountGrip({ front: true });
  }
}
