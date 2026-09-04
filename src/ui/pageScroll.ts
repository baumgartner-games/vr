/**
 * Where a page starts when it is put on a panel.
 *
 * Three lines of arithmetic, and every one of them is a bug you only notice
 * with the headset on:
 *
 * - **The same page again keeps its place.** A page is re-applied every time
 *   one of its rows is used, because using a row is what changes its label.
 *   Resetting the scroll there meant that taking a tool off the shelf, or
 *   stepping a setting one notch, threw you back to the top of the list — and
 *   the tool shelf is long enough that you then scrolled down again for every
 *   single tool.
 * - **A different page starts where it was left**, not at the top: coming back
 *   out of a submenu should land on the row you went in from.
 * - **Never past the last row.** A page can lose entries between two visits
 *   (the peer list empties, the shelf shrinks), and a scroll left over from the
 *   longer version shows an empty panel with no way back other than scrolling
 *   up blindly.
 *
 * Pure numbers, so it is tested rather than tried out — the panel around it is
 * a canvas and cannot be.
 */
export interface PageScroll {
  /** Identity of the page that was on show, and of the one going on now. */
  previousKey: string;
  key: string;
  /** Where the panel currently sits. */
  current: number;
  /** What was noted down for the incoming page, if it has been seen before. */
  remembered?: number;
  /** How many entries the incoming page has, and how many fit at once. */
  entries: number;
  pageSize: number;
}

export function pageScroll(page: PageScroll): number {
  const same = page.key === page.previousKey;
  const wanted = same ? page.current : (page.remembered ?? 0);
  const max = Math.max(0, page.entries - page.pageSize);
  if (!Number.isFinite(wanted) || wanted < 0) return 0;
  return Math.min(Math.floor(wanted), max);
}
