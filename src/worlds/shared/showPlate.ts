import { TILE } from '../nav/navTile';
import { TextPlane } from '../../ui/TextPlane';

/**
 * **Das Schild vor einem Schaustück** — Name und Maß, am Boden an der
 * Vorderkante seiner Kachel.
 *
 * Eine Datei für drei Schauräume: den der ersten Küche
 * (`test/zones/kitchen.ts`), den der zweiten (`test/zones/diner.ts`) und den
 * Möbelkatalog im Konstrukt-Raum (`shared/construct.ts`). Dreimal dieselben
 * fünf Zeilen wären dreimal die Gelegenheit, ein Schild anders zu setzen als
 * seine Nachbarn — und man sieht das erst, wenn man mit der Brille davorsteht.
 *
 * ## Warum es unten steht und nicht oben
 *
 * Vorher schwebten die Tafeln **über** ihrem Möbel, einen halben Meter über
 * dessen Oberkante. Das hat drei Dinge gleichzeitig falsch gemacht:
 *
 * - **Es verdeckte den Nachbarn.** Ein Schild über einem Hängeschrank hängt
 *   auf zweieinhalb Metern, und aus der Ferne steht es genau vor dem Stück in
 *   der Reihe dahinter.
 * - **Es gehörte zu keinem.** Zwei Meter über dem Boden, zwischen zwei Reihen,
 *   ist ein Schild eine Tafel im Raum und nicht die Beschriftung eines
 *   bestimmten Möbels — bei 146 Stücken sucht man dann, welches gemeint ist.
 * - **Man musste hochsehen.** Ein Katalog, den man abgeht, wird im Gehen
 *   gelesen; der Blick liegt dabei auf dem Möbel und nicht darüber.
 *
 * Jetzt steht es **auf dem Boden an der Vorderkante der Kachel**: Unterkante
 * auf dem Estrich, Oberkante auf Kniehöhe, und dahinter steht das Stück frei.
 * Wer davorsteht, hat Schild und Möbel in einem Blick übereinander, so wie im
 * Museum.
 *
 * **Gedreht wird nur um die Hochachse** (`upright`): Ein Schild, das sich der
 * Kamera auch entgegenneigt, legt sich beim Darüberstehen flach auf den Boden
 * und ist dann ein Strich.
 */
export interface ShowPlateOptions {
  /** Was darauf steht. */
  readonly title: string;
  readonly body?: string;
  /** Die Farbe der Linie darunter — je Schauraum eine andere. */
  readonly accent: number;
  /** Die Grundfläche des Stücks in **Kacheln**. */
  readonly tiles: { readonly w: number; readonly d: number };
  /** Die Mitte dieser Grundfläche, in Weltmetern. */
  readonly at: { readonly x: number; readonly z: number };
  /** Wo der Fußboden liegt, in Metern. */
  readonly floor: number;
}

/**
 * **Wie hoch ein Schild ist**, in Metern.
 *
 * Knapp unter Kniehöhe, und das ist die obere Grenze: Höher verdeckt es die
 * Vorderfront des Möbels dahinter — eine Küchenzeile ist einen halben Meter
 * hoch, und ein Schild von 40 cm stünde wie eine Blende davor. Niedriger wäre
 * die Schrift aus zwei Metern Entfernung nicht mehr zu lesen.
 */
export const PLATE_HEIGHT = 0.28;

/**
 * **Wie weit es vor die Kachel rückt**, in Metern.
 *
 * Genau auf die Kante und keinen Zentimeter davor: Die Kachel davor ist der
 * Gang, durch den man geht, und ein Schild, das hineinragt, ist ein Schild, an
 * dem man hängen bleibt. Die zwei Zentimeter sind das halbe Blatt selbst,
 * damit es die Kante nicht schneidet.
 */
const PLATE_LIP = 0.02;

/**
 * **Wo das Schild steht und wie breit es ist** — die Rechnung allein, ohne
 * Leinwand.
 *
 * Getrennt von `showPlate` aus demselben Grund wie überall in diesem Projekt:
 * `TextPlane` malt auf ein Canvas, und in Jest gibt es keines — geprüft werden
 * kann damit nur, was ohne auskommt. Und genau das ist hier die Frage, an der
 * man sich vertut: nicht, wie die Tafel aussieht, sondern **wo** sie landet.
 */
export function platePose(options: Omit<ShowPlateOptions, 'title' | 'body' | 'accent'>): {
  x: number;
  y: number;
  z: number;
  width: number;
} {
  const { tiles, at, floor } = options;
  return {
    x: at.x,
    // Um die Mitte gesetzt, also liegt die Unterkante eine halbe Höhe tiefer —
    // und die soll den Fußboden berühren.
    y: floor + PLATE_HEIGHT / 2,
    z: at.z + (tiles.d * TILE) / 2 + PLATE_LIP,
    // So breit wie das Stück, aber nie schmaler als ein Schild, auf dem zwei
    // Wörter nebeneinander passen: Ein Messer belegt eine Kachel und heißt
    // trotzdem „Messer" und nicht „Mes-ser".
    width: Math.max(tiles.w * TILE, 1),
  };
}

/** Das Schild, fertig gesetzt — der Aufrufer hängt es nur noch in seine Szene. */
export function showPlate(options: ShowPlateOptions): TextPlane {
  const pose = platePose(options);
  const plate = new TextPlane({
    width: pose.width,
    height: PLATE_HEIGHT,
    title: options.title,
    body: options.body,
    accent: options.accent,
    align: 'center',
    face: { upright: true },
  });
  plate.position.set(pose.x, pose.y, pose.z);
  return plate;
}
