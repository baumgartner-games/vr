import { ZONE_TILES } from './layout';

/**
 * **Wo man ankommt, wenn die Adresse es sagt** — `?at=` in der Anschrift der
 * Seite.
 *
 * Das Gelände misst 64 × 80 m, und wer eine einzelne Kachel ansehen will —
 * beim Bauen, beim Nachstellen eines Fehlers, beim Prüfen eines Möbels —
 * lief bisher jedes Mal hin. Das Menü springt zu einer **Zone**
 * (`TestWorld.jumpMenu`), und das reicht für „zeig mir die Küche"; es reicht
 * nicht für „stell mich neben das dritte Band". Dafür gibt es diese Zeile in
 * der Adresse:
 *
 * ```
 * /?at=kitchen#test      die Kachel, an der auch der Grundrisstest misst
 * /?at=21,-24#test        genau diese Kachel des Geländes, Ebene 0
 * /?at=18,-16,1#test      und auf Ebene 1 — das Deck des Podests
 * ```
 *
 * **Gerechnet wird in Kacheln des Geländes**, nicht in Metern und nicht in
 * Kacheln einer Zone: Das sind dieselben Zahlen, die in `layout.ts` stehen und
 * die ein Test ausgibt, wenn er über eine Kachel stolpert. Wer eine
 * Fehlermeldung „Kachel 21,-24 hat keinen Anschluss" liest, soll sie in die
 * Adresse tippen können und danebenstehen.
 *
 * **Warum die Adresse und kein Knopf im Spiel.** Ein Zifferblock vor dem Kopf
 * (`PortalWorld.askNumber`) wäre der Weg für einen Spieler — nur ist das hier
 * kein Spielzug, sondern ein Werkzeug für den, der die Welt **prüft**: Er
 * kommt von außen, mit einer Zahl in der Hand, und will sofort dort stehen.
 * Eine Adresse kann man sich dafür aufschreiben, verschicken und in ein
 * Testskript legen; ein Knopf im Spiel kann das nicht.
 *
 * Die Zahl gilt für die ganze Sitzung und damit auch für jedes Wiedereinsetzen
 * (`PortalWorld.rescuePlayer`): Wer in ein Loch fällt, steht wieder dort, wo er
 * hinwollte, und nicht am Startplatz.
 */
export interface SpawnAt {
  /** Kachel des Geländes, x nach Osten. */
  readonly x: number;
  /** Kachel des Geländes, z nach Süden. */
  readonly z: number;
  /** Die Ebene; 0 ist der Boden. */
  readonly level: number;
}

/**
 * **Die Adresse lesen** — oder `null`, und dann gilt der gewöhnliche
 * Startplatz.
 *
 * `null` ist die Antwort auf **alles**, was nicht eindeutig ist: kein `at`,
 * ein unbekannter Zonenname, ein Wort statt einer Zahl, eine halbe Koordinate.
 * Eine geratene Kachel wäre schlimmer als keine — wer sich vertippt, soll am
 * Startplatz stehen und es merken, statt irgendwo im Gelände zu suchen, warum
 * er nicht dort ist, wo er hinwollte.
 *
 * Nachkommastellen werden **abgeschnitten** und nicht gerundet: `at=2.9,0` ist
 * die Kachel 2, denn so liest jede Kachelrechnung dieses Projekts eine Zahl
 * (`Math.floor` in `kitchenBuild.tileAhead`). Eine negative Kachel gibt es
 * wirklich — das Gelände fängt bei x = −27 an.
 */
export function spawnAt(search: string): SpawnAt | null {
  const raw = new URLSearchParams(search).get('at')?.trim();
  if (!raw) return null;

  const zone = ZONE_TILES[raw];
  if (zone) return { x: zone.x, z: zone.z, level: zone.level };

  const parts = raw.split(',');
  if (parts.length < 2 || parts.length > 3) return null;
  const tiles = parts.map((part) => Number(part.trim()));
  if (tiles.some((value) => !Number.isFinite(value))) return null;
  // `''` wird zu 0 — `at=,3` ist ein Tippfehler und keine Kachel.
  if (parts.some((part) => part.trim() === '')) return null;

  const [x, z, level] = tiles as [number, number, number | undefined];
  return { x: Math.floor(x), z: Math.floor(z), level: Math.max(0, Math.floor(level ?? 0)) };
}
