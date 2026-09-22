/**
 * **Wo an einer fremden Pistole der Griff sitzt** — und wie sie dadurch in die
 * Faust kommt.
 *
 * Die achtzehn Werkzeuge des Eingaberaums halten ihren Griff nicht ungefähr,
 * sondern gerechnet: `mountGrip()` baut den Halterzylinder genau dorthin, wo
 * die Faust ihn erwartet (`gripFit.ts`), und das Werkzeug wird um ihn herum
 * gebaut. Genau daran ist der Tausch der gebauten Pistole gegen ein Modell aus
 * dem Regal bisher gescheitert, und die Absage steht mit dieser Begründung in
 * der Doku: „Kandidat da, Griff fehlt". Ein Regalmodell bringt seinen eigenen
 * Ursprung mit, seine eigene Achse — und keinen Griffzylinder.
 *
 * Diese Datei löst die Absage ein. Sie beantwortet die eine Frage, die dafür
 * offen war: **Welcher Teil dieses Netzes ist der Griff?** Und zwar gemessen
 * und nicht abgeschrieben, denn die Antwort muss ein Paket-Update überleben.
 *
 * ## Warum der Knoten `Gun_Pistol_Magazine` die Frage nicht beantwortet
 *
 * Die naheliegende Hoffnung war, dass ein Magazin im Griff steckt und ihn
 * damit verrät — `Gun_Pistol.glb` hat das Magazin als **eigenen Knoten**, und
 * ein Magazin im Griff wäre ein Maßband für den Griff gewesen. Nachgemessen
 * am geladenen Netz stimmt das für diese Waffe **nicht**: Der Knoten sitzt in
 * der Quelle bei `z` 0,17 bis 0,45, also **vor** dem Abzugsbügel und unter dem
 * Lauf, während der Griff bei `z` −0,17 bis −0,02 hinten herunterhängt. Es ist
 * ein Vordermagazin, wie an einer Maschinenpistole. Der Knoten ist trotzdem
 * ein Geschenk — der Rundenzähler klebt jetzt darauf (`PistolTool`) —, aber er
 * ist nicht der Griff.
 *
 * ## Also wird der Griff an seiner Form gefunden, in zwei Durchgängen
 *
 * Eine Pistole hat genau zwei Teile, die nach unten hängen, und dazwischen ein
 * Loch: den **Griff** hinten, den **Abzugsbügel** als Lücke und alles Weitere
 * davor. Das reicht:
 *
 * 1. **Der hintere Lappen** (`lobeEnd`). Über die Länge der Waffe wird der
 *    tiefste Punkt je Scheibe genommen. Von hinten her gehört jede Scheibe zum
 *    Griff, solange sie unter eine Schwelle reicht; die erste, die es nicht
 *    tut, ist der Abzugsbügel, und dort hört der Griff auf.
 * 2. **Der Rahmen darüber** (`frameFlare`). Ein Griff ist schmal — die Hand
 *    muss sich um ihn schließen —, und das Gehäuse darüber ist es nicht. Vom
 *    Knauf nach oben bleibt die Breite gleich, bis sie ausladet; dort endet
 *    der Griff nach oben.
 *
 * Beides sind eindimensionale Profile, also **reine Rechnung**: Sie stehen
 * hier ohne three.js, wie `aim.ts` und `gripFit.ts` daneben, und
 * `pistolFit.test.ts` rechnet sie nach. Das Messen selbst — aus einem Netz
 * werden Profile — steht in `pistolModel.ts`, weil es three.js braucht.
 */

import type { Vec3 } from './aim';

/**
 * **Wie hoch eine Probe liegen darf, um noch zum Griff zu zählen** — als
 * Anteil zwischen dem tiefsten Punkt der Waffe und ihrer halben Höhe.
 *
 * Die Schwelle selbst ist gemessen (sie kommt aus der Box des Netzes), nur
 * ihre Lage dazwischen steht hier. `0,5` heißt: auf halbem Weg vom Knauf zur
 * Mitte der Waffe. Das ist mit Absicht großzügig — der Abzugsbügel eines
 * Regalmodells hängt tiefer als der einer echten Waffe, und ein zu strenger
 * Wert schnitte den Griff mitten durch.
 */
export const LOBE_LEVEL = 0.5;

/**
 * **Ab wann der Rahmen ausladet**, als Vielfaches der Breite am Knauf.
 *
 * Nicht `1`, weil ein Griff nach oben hin auch mal eine Fase hat und eine
 * einzelne Scheibe deshalb ein paar Millimeter breiter ausfällt als die
 * darunter; und nicht `2`, weil dann der halbe Rahmen mitzählte. Gemessen an
 * `Gun_Pistol.glb` sind es 5,8 cm Griffbreite über die ganze Höhe und dann in
 * einer Scheibe 8,4 cm — der Sprung ist ein Sprung und keine Steigung.
 */
export const FRAME_FLARE = 1.25;

/**
 * **Wo der hintere Lappen aufhört** — die Stelle in der Länge, an der der
 * Griff in den Abzugsbügel übergeht.
 *
 * `floors[i]` ist der tiefste Punkt in der `i`-ten von `floors.length` gleich
 * breiten Scheiben zwischen `from` und `to`; eine Scheibe ohne Netz darin
 * trägt `Number.POSITIVE_INFINITY` und beendet den Lappen genauso — dort ist
 * die Waffe zu Ende.
 *
 * Gesucht wird **von hinten**, also vom Anfang des Feldes: Die Reihenfolge der
 * Scheiben gibt der Aufrufer vor, und der zählt sie vom Knauf her. Findet sich
 * kein Ende, ist die ganze Waffe der Lappen — das wäre ein Netz ohne
 * Abzugsbügel, und dann steht am Ende eben die gebaute Pistole.
 */
export function lobeEnd(
  floors: readonly number[],
  from: number,
  to: number,
  level: number,
): number {
  const step = (to - from) / (floors.length || 1);
  for (let i = 0; i < floors.length; i++) {
    if (floors[i]! > level) return from + step * i;
  }
  return to;
}

/**
 * **Wo der Griff nach oben aufhört** — die erste Scheibe, in der der Rahmen
 * breiter wird als der Knauf.
 *
 * Gesucht wird die **unterste** solche Scheibe und nicht der erste Abbruch
 * eines Laufs: Zwischen zwei Scheiben des Griffs kann eine leere liegen (das
 * Netz ist eine Hülle und keine Suppe, und eine Scheibe trifft manchmal nur
 * Kanten). Ein Lauf, der an einer Lücke abreißt, hätte den Griff nach Laune
 * des Rasters halbiert; die unterste Ausladung liegt fest, egal wie fein man
 * scheibt.
 *
 * `widths[i]` ist die Breite der `i`-ten Scheibe, `NaN` für eine leere.
 */
export function frameFlare(
  widths: readonly number[],
  from: number,
  to: number,
  butt: number,
  factor = FRAME_FLARE,
): number {
  const step = (to - from) / (widths.length || 1);
  const limit = butt * factor;
  for (let i = 0; i < widths.length; i++) {
    const width = widths[i]!;
    if (Number.isFinite(width) && width > limit) return from + step * i;
  }
  return to;
}

/**
 * **Der Maßstab kommt aus dem Griff und nicht aus der Gesamtlänge.**
 *
 * Eine Waffe, die richtig in der Hand liegt, darf länger sein als die gebaute
 * — ihr Griff darf es nicht. Der Halterzylinder ist so lang, wie eine Faust
 * breit ist (`grip.GRIP_LENGTH`, an der Pistole 10 cm), und genau darauf wird
 * der gemessene Griff gebracht. Bei `Gun_Pistol.glb` sind das 16,6 cm Griff im
 * Paketmaßstab und damit ein Faktor von **0,602** — die Waffe wird darüber aus
 * 61 cm rund 37 cm lang, also fast doppelt so lang wie die gebaute. Das ist der Preis
 * dafür, dass der Griff in die Faust passt, und er steht hier, weil ihn sonst
 * jemand mit der Gesamtlänge „korrigiert".
 *
 * `1` heißt „lass es, wie es ist" — dieselbe Antwort auf unmögliche Eingaben
 * wie in `core/kaykitHeight.kaykitHeightScale`: Besser eine Waffe in ihrer
 * gelieferten Größe als eine unendlich große.
 */
export function gripScale(height: number, cylinder: number): number {
  if (!(height > 1e-6) || !(cylinder > 0)) return 1;
  return cylinder / height;
}

/**
 * **Wohin ein Punkt des Modells im Werkzeug kommt** — der ganze Umbau in einer
 * Zeile.
 *
 * Drei Schritte stecken darin, und die Reihenfolge ist die eines
 * Szenengraphen: erst der **Maßstab**, dann eine **halbe Drehung um die
 * Hochachse**, dann der **Ort**. Die halbe Drehung ist die eigentliche
 * Nachricht: `Gun_Pistol.glb` zeigt in seiner Datei nach **+z**, die gebaute
 * Pistole nach **−z** (ihr Lauf sitzt auf `z = −0,155`), und dorthin schießt
 * sie auch — `PistolTool.fire` nimmt `(0, 0, −1)` und nicht die Richtung eines
 * Netzes. Ein Modell, das man nur hinstellt, schösse also nach hinten.
 *
 * Eine Drehung um die **Hochachse** und nicht um die Querachse, und das ist
 * kein Geschmack: Ein Griff lehnt nach hinten, und nur die Hochachse lässt ihn
 * hinten lehnen, während sie den Lauf umdreht.
 *
 * ## Was dabei stehen bleibt, und warum es stehen bleibt
 *
 * Zwei Reste, beide nachgemessen und beide bewusst nicht wegskaliert:
 *
 * - **Der Griff lehnt 18°, der Zylinder 12,6°** — nachgemessen an der
 *   Mittellinie des Griffs gegen die Achse aus `gripFit.STANDARD_GRIP`. Das
 *   ließe sich glattziehen, indem man das Modell um die Querachse nachkippt;
 *   dann stünde aber der **Lauf** um dieselben 5,4° neben der Zielrichtung, und
 *   mit ihm die Kimme auf der Schiene. Eine Waffe, die dorthin zeigt, wohin sie
 *   schießt, ist mehr wert als ein Griff ohne Restwinkel: Über die halbe
 *   Grifflänge sind 5,4° knapp fünf Millimeter, und die liegen in der Faust.
 * - **Der Zylinder ist 4 cm dick, der Griff des Modells 3,5 cm.** Der grüne
 *   Halter schaut damit gut zwei Millimeter seitlich heraus. Ihn dünner zu
 *   machen wäre eine Zahl, die dem Modell folgt statt umgekehrt — und er ist
 *   das, was man anfassen kann; das soll man auch dann sehen, wenn die Waffe
 *   im Halfter steckt.
 */
export function gunPoint(point: Vec3, scale: number, at: Vec3): Vec3 {
  return {
    x: at.x - scale * point.x,
    y: at.y + scale * point.y,
    z: at.z - scale * point.z,
  };
}

/**
 * **Wohin die Modellgruppe kommt, damit ihr Griff auf dem Halterzylinder
 * liegt** — `gunPoint` rückwärts.
 *
 * Gesucht ist der Ort `at`, für den `gunPoint(gripCentre, scale, at)` genau
 * `target` ergibt, also die Mitte des Griffs auf der Mitte des Zylinders
 * (`gripFit.STANDARD_GRIP.position`). Mehr ist an der ganzen Einpassung nicht:
 * Der Zylinder steht fest, das Werkzeug folgt ihm.
 */
export function gunAt(gripCentre: Vec3, scale: number, target: Vec3): Vec3 {
  return {
    x: target.x + scale * gripCentre.x,
    y: target.y - scale * gripCentre.y,
    z: target.z + scale * gripCentre.z,
  };
}
