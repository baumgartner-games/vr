import { swapOut, type SwapOut } from './shelfSwap';

/**
 * Ein Nachbau des Wechselns im _Baukasten_: Die Hand hält ein frisches Stück,
 * gewählt wird ein anderes. Was beim Wechseln hingestellt wird und frisch
 * war, holt seine nächste Kopie — genau wie `PortalWorld.placedFromShelf`.
 *
 * @returns wie viele Stücke dabei hingestellt wurden und was am Ende in der
 *          Hand liegt; `null`, wenn es nach hundert Runden noch nicht aufhört
 */
function change(rule: (fresh: boolean) => SwapOut): { placed: number; hand: string } | null {
  let hand = 'fass';
  const queue = ['laterne'];
  let placed = 0;
  for (let round = 0; round < 100; round++) {
    const next = queue.shift();
    if (next === undefined) return { placed, hand };
    // Jedes Stück in der Hand ist frisch — aus dem Regal oder nachgeholt.
    if (rule(true) === 'drop') {
      placed++;
      queue.push(hand);
    }
    hand = next;
  }
  return null;
}

describe('shelfSwap', () => {
  it('lässt ein frisches Katalogstück beim Wechseln verschwinden', () => {
    expect(swapOut(true)).toBe('scrap');
  });

  it('lässt alles andere fallen wie bisher', () => {
    expect(swapOut(false)).toBe('drop');
  });

  it('wechselt im Baukasten genau einmal und stellt nichts hin', () => {
    expect(change(swapOut)).toEqual({ placed: 0, hand: 'laterne' });
  });

  it('hörte mit der alten Regel nie auf — die Gegenprobe zum gemeldeten Fehler', () => {
    expect(change(() => 'drop')).toBeNull();
  });
});
