/**
 * **Die Station, Kachel für Kachel** — abgepaust von der Vorlage des Besitzers
 * (`public/haunting/station-outline.png`, `docs/orbital/station-vorlage.webp`)
 * im Maßstab **20 Pixel = 1 Meter** (`world3d/blueprint.ts`).
 *
 * Gewünscht: _„Kannst du map haunting neu aufbauen, die Boden und
 * Wandbekleidung passen nicht zum Boden Bild Rahmen von Raumschiff"_ — und auf
 * die Frage nach dem Maßstab: _„Bitte auf 20px = 1m"_. Jede Wandlinie der
 * Vorlage ist auf die nächste Kachelkante gerundet, jede schräge auf eine
 * Kette von Schrägkacheln.
 *
 * Ein Zeichen je Kachel von einem Meter, Zeile für Zeile von Norden nach
 * Süden (`STATION_ORIGIN` ist die linke obere Ecke):
 *
 * - `.` — nichts, Weltraum;
 * - `:` — Gang (`HouseRoom.circulation`); `stationRooms` legt die Kacheln zu
 *   Rechtecken zusammen;
 * - ein Großbuchstabe — eine ganze Kachel des Raums mit diesem Buchstaben
 *   (`STATION_ROOMS`);
 * - derselbe Buchstabe klein — eine **Schrägkachel** dieses Raums: Durch sie
 *   geht eine 45°-Wand. Welche Ecke abgeschnitten ist, sagen die Nachbarn:
 *   die, an deren beiden Seiten nicht derselbe Raum liegt
 *   (`house.stationShapes`).
 *
 * Zwei Räume berühren sich nie — dazwischen liegt immer ein Gang oder eine
 * Fuge (`house.test`).
 *
 * **Die Gänge folgen nicht mehr der Zeichnung, sondern drei Regeln des
 * Besitzers** (`stationRules.ts`, geprüft in `stationRules.test.ts`):
 * höchstens vier Felder (zwei Kacheln) breit, zwischen parallelen Gängen
 * ohne Raum dazwischen genau vier Felder, und keine zwei Türen direkt
 * hintereinander — also kein Stummelgang zwischen Gang und Raumtür: Jeder
 * Gang läuft bis an die Wand des Raums, in den er führt. Die Räume sind
 * geblieben, wie gezeichnet; Shields ist eine Kachel breiter, damit die
 * Einrichtung neben der tiefer liegenden Westtür Platz hat.
 */
export const STATION_MAP: readonly string[] = [
  '............................aAAAAAAAAAAa.........................',
  '...........................aAAAAAAAAAAAAa........................',
  '..........................aAAAAAAAAAAAAAAa.......................',
  '..........................AAAAAAAAAAAAAAAAa...BBBBb..............',
  '.......cCCCCCC............AAAAAAAAAAAAAAAAA...BBBBBb.............',
  '......cCCCCCCC............AAAAAAAAAAAAAAAAA...BBBBBBb............',
  '......CCCCCCCC............AAAAAAAAAAAAAAAAA:::BBBBBBB............',
  '......CCCCCCCC............AAAAAAAAAAAAAAAAA:::BBBBBBB............',
  '......CCCCCCCC::::::::::::AAAAAAAAAAAAAAAAA...BBBBBBB............',
  '......CCCCCCCC::::::::::::AAAAAAAAAAAAAAAAA...bBBBBBB............',
  '......CCCCCCCC.....DDDDDD.AAAAAAAAAAAAAAAAA....bBBBBB............',
  '.eEEE.CCCCCCCC.....DDDDDD.AAAAAAAAAAAAAAAAA......::..............',
  'eEEEE.......::.....DDDDDD.AAAAAAAAAAAAAAAAa.fFFFF::..............',
  'EEEEE.......::gGGg.DDDDDD.aAAAAAAAAAAAAAAa.fFFFFF::........HHHHh.',
  'EEEEEEE:::::::GGGG.DDDDDDd.aAAAAAAAAAAAAa..FFFFFF::........HHHHHh',
  'EEEEEEE:::::::GGGG.DDDDDDDd.aAAAAAAAAAAa...FFFFFF::........HHHHHH',
  'EEEEEEE.....::GGGG.DDDDDDDDd.aAAAAAAAAa....FFFFFF::........HHHHHH',
  'EEEEEEE.....::GGGG.DDDDDDDDD......::.......FFFFFF::::::::::HHHHHH',
  'EEEEEEE.....::GGGG.dDDDDDDDD......::.............::::::::::HHHHHh',
  'EEEEEEE.....::GGGG................::...IIIIIII...::........HHHHh.',
  'EEEEEEE.....::GGGG..JJJJJJJJ......::...IIIIIII...::..............',
  'EEEEE.......::......JJJJJJJJ......::...IIIIIII:::::..............',
  'eEEEE.......::......JJJJJJJJ......::...IIIIIII:::::..............',
  '.eEEE.LLLLLLLL......JJJJJJJj.kKKKKKKK..IIIIIII...::..............',
  '......LLLLLLLL......JJJJJJj.kKKKKKKKK..IIIIIII...::..............',
  '......LLLLLLLL......JJJJJJ..KKKKKKKKK..IIIIIIi.mMMMMMM...........',
  '......LLLLLLLL......JJJJJJ..KKKKKKKKK.........mMMMMMMM...........',
  '......LLLLLLLL......JJJJJj..KKKKKKKKK.........MMMMMMMM...........',
  '......LLLLLLLL......JJJJj...KKKKKKKKK.........MMMMMMMM...........',
  '......lLLLLLLL::::::::::::::KKKKKKKKK:::::::::MMMMMMMM...........',
  '.......lLLLLLL::::::::::::::KKKKKKKKK:::::::::MMMMMMMm...........',
  '............................KKKKKKKKK.NNNNNNN.MMMMMMm............',
  '............................KKKKKKKKK.NNNNNNN.MMMMMm.............',
  '............................KKKKKKKKK.NNNNNNN....................',
  '............................kKKKKKKKK.NNNNNNN....................',
  '.............................kKKKKKKK.nNNNNNn....................',
  '..............................kKKKKKK..nNNNn.....................',
];

/** Die Kachel (in Metern) der linken oberen Ecke von `STATION_MAP`. */
export const STATION_ORIGIN = { x: -34, z: -52 } as const;
