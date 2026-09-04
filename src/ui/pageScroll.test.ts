import { pageScroll } from './pageScroll';

const PAGE = { entries: 20, pageSize: 6 };

describe('pageScroll', () => {
  it('keeps its place when the same page goes back on', () => {
    // The tool shelf, scrolled down, after one tool has been taken out of it:
    // the page is re-applied because the row's label changed, and that must not
    // put the player back at the top of the list.
    expect(
      pageScroll({ ...PAGE, previousKey: 'tools', key: 'tools', current: 7 }),
    ).toBe(7);
  });

  it('starts a page that was seen before where it was left', () => {
    expect(
      pageScroll({ ...PAGE, previousKey: 'root', key: 'tools', current: 3, remembered: 9 }),
    ).toBe(9);
  });

  it('starts a page nobody has been on at the top', () => {
    expect(pageScroll({ ...PAGE, previousKey: 'root', key: 'bag', current: 5 })).toBe(0);
  });

  it('never scrolls past the last row', () => {
    // Same page, but four of its rows have gone away since — the leftover
    // offset would otherwise show an empty panel.
    expect(
      pageScroll({ previousKey: 'net', key: 'net', current: 12, entries: 8, pageSize: 6 }),
    ).toBe(2);
    expect(
      pageScroll({ previousKey: 'net', key: 'net', current: 12, entries: 4, pageSize: 6 }),
    ).toBe(0);
  });

  it('shrugs off a nonsensical offset', () => {
    expect(pageScroll({ ...PAGE, previousKey: 'a', key: 'a', current: -3 })).toBe(0);
    expect(pageScroll({ ...PAGE, previousKey: 'a', key: 'a', current: Number.NaN })).toBe(0);
  });
});
