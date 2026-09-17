import { DINER_NAMES, DINER_PIECES, dinerPiece } from '../../../core/dinerFit';
import { DINER } from '../layout';
import { DINER_SHOWN, DINER_SPOTS, SHOW_W, SHOW_X, dinerFootprint, dinerHangs } from './dinerPlan';

const SHOWN = DINER_SPOTS.filter((spot) => spot.show);
const ROOM = DINER_SPOTS.filter((spot) => !spot.show);

/** Die Kacheln, die ein Stück belegt — dieselbe Rechnung wie im Grundriss. */
function tiles(spot: (typeof DINER_SPOTS)[number]): string[] {
  const piece = dinerPiece(spot.name)!;
  const size = dinerFootprint(piece, spot.turn ?? 0);
  const keys: string[] = [];
  for (let dz = 0; dz < size.d; dz++) {
    for (let dx = 0; dx < size.w; dx++) keys.push(`${spot.x + dx},${spot.z + dz}`);
  }
  return keys;
}

describe('der Aufbau der zweiten Küche', () => {
  it('kennt kein Stück, das nicht im Katalog steht', () => {
    for (const spot of DINER_SPOTS) {
      expect({ name: spot.name, known: dinerPiece(spot.name) !== undefined }).toEqual({
        name: spot.name,
        known: true,
      });
    }
  });

  /**
   * **Jedes Stück bleibt in seiner Zone.** Sonst steht ein Kühlschrank im
   * Freien — und im Schauraum reicht dafür ein Stück zu viel in einer Reihe:
   * Der packt seine Reihen und rechnet nicht nach, ob die letzte noch passt.
   */
  it('hält jedes Stück innerhalb der Zone', () => {
    for (const spot of DINER_SPOTS) {
      const piece = dinerPiece(spot.name)!;
      const size = dinerFootprint(piece, spot.turn ?? 0);
      expect({ name: spot.name, fits: spot.x >= 0 && spot.x + size.w <= DINER.w }).toEqual({
        name: spot.name,
        fits: true,
      });
      expect({ name: spot.name, fits: spot.z >= 0 && spot.z + size.d <= DINER.d }).toEqual({
        name: spot.name,
        fits: true,
      });
    }
  });

  /**
   * **Kein Stück steht in einem anderen** — mit einer Ausnahme, und die ist
   * die Regel dieses Katalogs: Was **hängt**, hängt über etwas
   * (`dinerHangs`). Ein Hängeschrank steht auf derselben Kachel wie die
   * Küchenzeile darunter, eine Abzugshaube über dem Herd. Genau dafür gibt es
   * das Feld, und deshalb wird hier nur unter den **stehenden** Stücken
   * geprüft.
   */
  it('stellt kein stehendes Stück in ein anderes', () => {
    const taken = new Map<string, string>();
    for (const spot of DINER_SPOTS) {
      if (dinerHangs(dinerPiece(spot.name)!)) continue;
      for (const key of tiles(spot)) {
        expect({ key, free: !taken.has(key), by: taken.get(key) ?? spot.name }).toEqual({
          key,
          free: true,
          by: spot.name,
        });
        taken.set(key, spot.name);
      }
    }
  });

  /**
   * **Im Restaurant hängt, was hängt, über einem Möbel und nicht über dem
   * Gang.** Ein Hängeschrank mitten im Raum ist kein Hängeschrank, sondern ein
   * Schrank in der Luft — und man sieht es erst in der Brille.
   *
   * **Im Schauraum gilt das ausdrücklich nicht.** Dort steht jedes Stück für
   * sich, und ein Hängeschrank hängt dort frei in der Luft: Genau das soll man
   * dort sehen. Ein Schauraum, der jedem hängenden Stück eine Küchenzeile
   * unterschöbe, zeigte hundertsechsundvierzig Stücke und dreizehn Möbel, die
   * niemand bestellt hat.
   */
  it('hängt im Restaurant jedes hängende Stück über ein stehendes', () => {
    const standing = new Set<string>();
    for (const spot of ROOM) {
      if (!dinerHangs(dinerPiece(spot.name)!)) for (const key of tiles(spot)) standing.add(key);
    }
    let checked = 0;
    for (const spot of ROOM) {
      if (!dinerHangs(dinerPiece(spot.name)!)) continue;
      const over = tiles(spot).some((key) => standing.has(key));
      expect({ name: spot.name, over }).toEqual({ name: spot.name, over: true });
      checked++;
    }
    expect(checked).toBeGreaterThan(5);
  });

  describe('der Schauraum', () => {
    /**
     * **Er zeigt jedes Stück des Katalogs genau einmal** — er ist der Katalog
     * zum Abgehen, und ein Katalog, in dem ein Stück fehlt, ist eine Liste.
     * Dieselbe Zusage wie im ersten Schauraum (`testPlan.test.ts`), und die
     * gleiche Begründung: So braucht niemand eine zweite Liste zu führen.
     */
    it('zeigt jedes Stück des Katalogs einmal', () => {
      expect([...DINER_SHOWN].sort()).toEqual([...DINER_NAMES].sort());
      expect(new Set(DINER_SHOWN).size).toBe(DINER_SHOWN.length);
    });

    it('fängt östlich des Restaurants an und bleibt im Osten', () => {
      expect(SHOW_X + SHOW_W).toBe(DINER.w);
      for (const spot of SHOWN) {
        expect({ name: spot.name, east: spot.x >= SHOW_X }).toEqual({
          name: spot.name,
          east: true,
        });
      }
    });

    it('lässt kein Stück des Restaurants in den Schauraum ragen', () => {
      for (const spot of ROOM) {
        const size = dinerFootprint(dinerPiece(spot.name)!, spot.turn ?? 0);
        expect({ name: spot.name, west: spot.x + size.w <= SHOW_X }).toEqual({
          name: spot.name,
          west: true,
        });
      }
    });

    /**
     * **Eine Kachel Luft ringsum.** Die Zusage, die den Schauraum zu einem
     * Rundgang macht und nicht zu einer Wand: Zwischen zwei Stücken ist Platz,
     * also sieht man jedes einzeln und kann dazwischen gehen. Geprüft wird
     * nicht der Abstand jedes Paares, sondern die Folgerung daraus — keine
     * belegte Kachel hat einen belegten Nachbarn nach Osten oder Süden.
     */
    it('lässt zwischen zwei Schaustücken eine Kachel frei', () => {
      const taken = new Set<string>();
      for (const spot of SHOWN) for (const key of tiles(spot)) taken.add(key);
      for (const spot of SHOWN) {
        const piece = dinerPiece(spot.name)!;
        const size = dinerFootprint(piece, spot.turn ?? 0);
        for (let dz = 0; dz < size.d; dz++) {
          const east = `${spot.x + size.w},${spot.z + dz}`;
          expect({ name: spot.name, east, free: !taken.has(east) }).toEqual({
            name: spot.name,
            east,
            free: true,
          });
        }
        for (let dx = 0; dx < size.w; dx++) {
          const south = `${spot.x + dx},${spot.z + size.d}`;
          expect({ name: spot.name, south, free: !taken.has(south) }).toEqual({
            name: spot.name,
            south,
            free: true,
          });
        }
      }
    });

    /**
     * **Die Reihenfolge ist die des Katalogs**, und der ist alphabetisch —
     * daran hängt, dass die zwölf Vorratsgläser und die vierundzwanzig
     * Küchenzeilen jeweils beieinanderstehen. Wer den Schauraum umsortiert,
     * soll das merken, bevor jemand vor einem Regal steht, in dem Muster A
     * und Muster B drei Reihen auseinanderliegen.
     */
    it('stellt die Stücke in der Reihenfolge des Katalogs auf', () => {
      expect(DINER_SHOWN).toEqual(DINER_PIECES.map((piece) => piece.name));
    });
  });

  describe('das Restaurant', () => {
    it('stellt mehr als fünfzig Stücke auf', () => {
      expect(ROOM.length).toBeGreaterThan(50);
    });

    /**
     * **Die Wände kommen aus dem Grundriss und nicht aus dem Katalog.** Eine
     * Modellwand steht in der Mitte ihrer Kachel, eine Grundrisswand auf deren
     * **Kante** — beide an derselben Stelle sind zwei Wände, die gegeneinander
     * flackern und zwischen denen ein Spalt bleibt. Die tragenden
     * `wall_*`-Stücke bleiben deshalb Schaustücke.
     *
     * **Die Wandfliesen sind keine Wand**, sondern ein Belag von 15 cm Tiefe,
     * der über der Arbeitsplatte hängt (`wall_tiles_A`, `foot` 0,50 m). Der
     * darf, und er ist der Grund, warum diese Zusage nicht einfach „nichts,
     * was mit `wall` anfängt" heißt.
     */
    it('baut seine Wände aus dem Grundriss und nicht aus dem Katalog', () => {
      for (const spot of ROOM) {
        const wall = spot.name.startsWith('wall') && !spot.name.startsWith('wall_tiles');
        expect({ name: spot.name, wall }).toEqual({ name: spot.name, wall: false });
      }
    });

    /**
     * **An jedem Gasttisch steht je Randkachel ein Stuhl** — sonst ist es ein
     * Stehtisch, und bei einem Tisch von zwei mal zwei Kacheln stünde kein
     * Stuhl mittig (siehe `guestTable`).
     */
    it('stellt an jeden Gasttisch je Randkachel einen Stuhl', () => {
      const tables = ROOM.filter((spot) => spot.name.startsWith('table_round'));
      const chairs = ROOM.filter((spot) => spot.name.startsWith('chair'));
      expect(tables).toHaveLength(6);
      const seats = tables.reduce((sum, spot) => {
        const size = dinerFootprint(dinerPiece(spot.name)!, spot.turn ?? 0);
        return sum + 2 * (size.w + size.d);
      }, 0);
      expect(chairs).toHaveLength(seats);
    });
  });
});
