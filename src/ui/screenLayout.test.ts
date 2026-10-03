import {
  SCREEN_BODY_TOP,
  SCREEN_W,
  controlAt,
  sameControl,
  screenCols,
  screenHead,
  type Rect,
} from './screenLayout';

const centre = (rect: Rect | null): [number, number] => {
  if (!rect) throw new Error('kein Knopf');
  return [rect.x + rect.w / 2, rect.y + rect.h / 2];
};

/**
 * Der Kopf des Bildschirms in der Brille ist der der Seite am Schirm:
 * ◀ ▶ ganz links, die Reiter, ✕ oben rechts — darunter Zurück und Haus.
 */
describe('screenHead', () => {
  const head = screenHead(6, { back: true, home: true });

  it('puts ◀ ▶ at the far left, before the first tab, and ✕ at the top right', () => {
    expect(head.prev!.x).toBeLessThan(head.next!.x);
    expect(head.next!.x + head.next!.w).toBeLessThan(head.tabs[0]!.x);
    expect(head.close.x + head.close.w).toBeLessThanOrEqual(SCREEN_W);
    expect(head.close.y).toBe(head.prev!.y);
    const last = head.tabs[head.tabs.length - 1]!;
    expect(last.x + last.w).toBeLessThan(head.close.x);
  });

  it('finds every button and every tab where it is drawn', () => {
    expect(controlAt(head, ...centre(head.prev))).toEqual({ kind: 'prev' });
    expect(controlAt(head, ...centre(head.next))).toEqual({ kind: 'next' });
    expect(controlAt(head, ...centre(head.close))).toEqual({ kind: 'close' });
    expect(controlAt(head, ...centre(head.back))).toEqual({ kind: 'back' });
    expect(controlAt(head, ...centre(head.home))).toEqual({ kind: 'home' });
    head.tabs.forEach((rect, index) => {
      expect(controlAt(head, ...centre(rect))).toEqual({ kind: 'tab', index });
    });
  });

  it('has nothing to press in the list below the head', () => {
    expect(controlAt(head, SCREEN_W / 2, SCREEN_BODY_TOP + 40)).toBeNull();
  });

  it('leaves out what the page does not have', () => {
    const bare = screenHead(0, { back: false, home: false });
    expect(bare.prev).toBeNull();
    expect(bare.next).toBeNull();
    expect(bare.tabs).toHaveLength(0);
    expect(bare.back).toBeNull();
    expect(bare.home).toBeNull();
    // Ohne Zurück fängt der Titel am Rand an.
    expect(bare.text.x).toBeLessThan(head.text.x);
  });
});

describe('sameControl', () => {
  it('tells tabs apart by their place', () => {
    expect(sameControl({ kind: 'tab', index: 1 }, { kind: 'tab', index: 1 })).toBe(true);
    expect(sameControl({ kind: 'tab', index: 1 }, { kind: 'tab', index: 2 })).toBe(false);
    expect(sameControl({ kind: 'close' }, null)).toBe(false);
    expect(sameControl(null, null)).toBe(true);
  });
});

describe('screenCols', () => {
  it('puts rows in two columns and as many tiles as fit side by side', () => {
    expect(screenCols(false)).toBe(2);
    expect(screenCols(true)).toBeGreaterThanOrEqual(5);
  });

  it('never gives a page fewer tiles than fit — the two columns of the old wrist panel', () => {
    expect(screenCols(true, 2)).toBe(screenCols(true));
    expect(screenCols(true, 12)).toBe(12);
  });
});

/** Die Figur im Inventar ist eine Spalte des Bildschirms, nicht eine Tafel daneben. */
describe('screenHead aside', () => {
  const head = screenHead(6, { back: false, home: false, aside: true });

  it('narrows the list and finds the button in the column', () => {
    const plain = screenHead(6, { back: false, home: false });
    expect(head.bodyW).toBeLessThan(plain.bodyW);
    expect(controlAt(head, ...centre(head.aside!.buttons[0]!))).toEqual({
      kind: 'aside',
      index: 0,
    });
    expect(plain.aside).toBeNull();
  });

  it('stacks two buttons under Aussehen, each its own control, the figure still large', () => {
    const two = screenHead(6, { back: true, home: false, aside: 2 });
    const [save, reset] = two.aside!.buttons;
    expect(save!.y + save!.h).toBeLessThan(reset!.y);
    expect(reset!.y + reset!.h).toBeLessThanOrEqual(two.aside!.card.y + two.aside!.card.h);
    expect(two.aside!.subY).toBeLessThan(save!.y);
    expect(controlAt(two, ...centre(save!))).toEqual({ kind: 'aside', index: 0 });
    expect(controlAt(two, ...centre(reset!))).toEqual({ kind: 'aside', index: 1 });
    expect(two.aside!.figure.h).toBeGreaterThan(200);
  });

  it('keeps the column inside the screen, below the head', () => {
    const card = head.aside!.card;
    expect(card.x + card.w).toBeLessThanOrEqual(SCREEN_W);
    expect(card.y).toBe(SCREEN_BODY_TOP);
    expect(head.aside!.figure.h).toBeGreaterThan(200);
  });
});
