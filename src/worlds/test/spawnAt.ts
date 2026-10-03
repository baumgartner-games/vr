/**
 * **Wo man ankommt, wenn die Adresse es sagt** — `?at=` in der Anschrift der
 * Seite.
 *
 * Wer eine einzelne Kachel ansehen will — beim Bauen, beim Nachstellen eines
 * Fehlers, beim Prüfen eines Möbels —, tippt sie in die Adresse, statt
 * hinzulaufen. Es gilt in der Sandbox und in den Zonen-Testwelten
 * (`ZoneWorld.spawnPoint`):
 *
 * ```
 * /?at=3,-4#sandbox        genau diese Kachel, Ebene 0
 * /?at=3,-4,1#sandbox      und auf Ebene 1
 * ```
 *
 * **Gerechnet wird in Kacheln der Welt**, nicht in Metern: Das sind dieselben
 * Zahlen, die die Positionsanzeige zeigt (`core/positionHud.ts`) und die ein
 * Test ausgibt, wenn er über eine Kachel stolpert.
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
  /** Kachel der Welt, x nach Osten. */
  readonly x: number;
  /** Kachel der Welt, z nach Süden. */
  readonly z: number;
  /** Die Ebene; 0 ist der Boden. */
  readonly level: number;
}

/**
 * **Die Adresse lesen** — oder `null`, und dann gilt der gewöhnliche
 * Startplatz.
 *
 * `null` ist die Antwort auf **alles**, was nicht eindeutig ist: kein `at`,
 * ein Wort statt einer Zahl, eine halbe Koordinate.
 * Eine geratene Kachel wäre schlimmer als keine — wer sich vertippt, soll am
 * Startplatz stehen und es merken, statt irgendwo zu suchen, warum
 * er nicht dort ist, wo er hinwollte.
 *
 * Nachkommastellen werden **abgeschnitten** und nicht gerundet: `at=2.9,0` ist
 * die Kachel 2, denn so liest jede Kachelrechnung dieses Projekts eine Zahl
 *. Eine negative Kachel gibt es
 * wirklich.
 */
export function spawnAt(search: string): SpawnAt | null {
  const raw = new URLSearchParams(search).get('at')?.trim();
  if (!raw) return null;

  const parts = raw.split(',');
  if (parts.length < 2 || parts.length > 3) return null;
  const tiles = parts.map((part) => Number(part.trim()));
  if (tiles.some((value) => !Number.isFinite(value))) return null;
  // `''` wird zu 0 — `at=,3` ist ein Tippfehler und keine Kachel.
  if (parts.some((part) => part.trim() === '')) return null;

  const [x, z, level] = tiles as [number, number, number | undefined];
  return { x: Math.floor(x), z: Math.floor(z), level: Math.max(0, Math.floor(level ?? 0)) };
}
