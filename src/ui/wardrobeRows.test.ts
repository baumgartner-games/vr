import { DEFAULT_APPEARANCE } from '../core/appearance';
import { BODY_KINDS, HEAD_KINDS } from '../core/avatarLook';
import { HEADGEAR_KINDS } from '../core/headgear';
import { wardrobeRows } from './wardrobeRows';

/**
 * **Welche Zeile wohin schaltet** — die eine Rechnung hinter der Umkleide.
 *
 * Sie ist klein und deshalb prüfbar, und sie ist genau die, die man zu Fuß
 * einmal falsch schreibt: ‹ am Anfang der Liste landet sonst bei `-1` statt
 * hinten, und eine Zeile, die den Hut ändert und den Kopf zurückgibt, fällt
 * erst vor dem Spiegel auf.
 */
describe('Die Zeilen der Umkleide', () => {
  it('sind Kopf, Hut und Körper — in dieser Reihenfolge', () => {
    const rows = wardrobeRows(DEFAULT_APPEARANCE);
    expect(rows.map((row) => row.slot)).toEqual(['head', 'hat', 'body']);
    expect(rows.map((row) => row.label)).toEqual(['Kopf', 'Hut', 'Körper']);
    expect(rows.map((row) => row.count)).toEqual([
      HEAD_KINDS.length,
      HEADGEAR_KINDS.length,
      BODY_KINDS.length,
    ]);
  });

  it('sagt, der wievielte gerade gilt', () => {
    const rows = wardrobeRows({ hat: 'cap', head: 'beard', body: 'green' });
    expect(rows[0]!.index).toBe(HEAD_KINDS.indexOf('beard'));
    expect(rows[1]!.index).toBe(HEADGEAR_KINDS.indexOf('cap'));
    expect(rows[2]!.index).toBe(BODY_KINDS.indexOf('green'));
    expect(rows[0]!.value).toBe('Vollbart');
  });

  it('schaltet › einen weiter und ändert dabei nur das Eigene', () => {
    const look = { ...DEFAULT_APPEARANCE };
    const next = wardrobeRows(look)[1]!.step(1);
    expect(next.hat).toBe(HEADGEAR_KINDS[1]);
    expect(next.head).toBe(look.head);
    expect(next.body).toBe(look.body);
  });

  /** ‹ am Anfang der Liste geht ans Ende und nicht ins Leere. */
  it('läuft mit ‹ im Kreis nach hinten', () => {
    const first = { hat: HEADGEAR_KINDS[0]!, head: HEAD_KINDS[0]!, body: BODY_KINDS[0]! };
    const rows = wardrobeRows(first);
    expect(rows[0]!.step(-1).head).toBe(HEAD_KINDS[HEAD_KINDS.length - 1]);
    expect(rows[1]!.step(-1).hat).toBe(HEADGEAR_KINDS[HEADGEAR_KINDS.length - 1]);
    expect(rows[2]!.step(-1).body).toBe(BODY_KINDS[BODY_KINDS.length - 1]);
  });

  /** Und einmal ganz herum ist wieder dasselbe. */
  it('kommt nach einer Runde wieder an', () => {
    let look = { ...DEFAULT_APPEARANCE };
    for (let i = 0; i < BODY_KINDS.length; i++) look = wardrobeRows(look)[2]!.step(1);
    expect(look.body).toBe(DEFAULT_APPEARANCE.body);
  });
});
