import { placementOf } from '../../../ui/menuGroups';
import { HAUNT_PAGES, hauntPageOf, pageHauntMenu, type PagedRow } from './menuPages';

/** Die Zeilen, wie `HauntingWorld.menu` sie in der Brille flach baut. */
const FLAT: PagedRow[] = [
  { id: 'haunt:status' },
  { id: 'haunt:play' },
  { id: 'haunt:watch' },
  { id: 'haunt:train' },
  { id: 'haunt:roles' },
  { id: 'haunt:light' },
  { id: 'haunt:rooms' },
  { id: 'haunt:seat-technician' },
  { id: 'haunt:seat-red' },
  { id: 'haunt:seat-yellow' },
  { id: 'haunt:seat-blue' },
  { id: 'haunt:seat-monster' },
  { id: 'haunt:powers', children: [{ id: 'haunt:power-red-map' }] },
  { id: 'haunt:monster-kind' },
  { id: 'haunt:rescue' },
  { id: 'tools', children: [] },
  { id: 'reset' },
  {
    id: 'ship:comfort',
    children: [
      { id: 'ship:comfort:turn' },
      { id: 'ship:comfort:vignette' },
      { id: 'ship:comfort:haptics' },
    ],
  },
  { id: 'orbital:sensor' },
  { id: 'orbital:heal' },
  { id: 'orbital:leave' },
  { id: 'orbital:audio' },
  { id: 'orbital:blueprint' },
  { id: 'orbital:ambient' },
  { id: 'orbital:labs', children: [] },
  { id: 'orbital:simulation' },
  { id: 'orbital:visits', children: [] },
  { id: 'orbital:home' },
];

const paged = pageHauntMenu(FLAT, (page, children) => ({ id: page.id, children }));
const ids = (rows: readonly PagedRow[]): string[] => rows.map((row) => row.id);
const pageOf = (id: string): string[] => ids(paged.find((row) => row.id === id)!.children!);

describe('Die Seite „Haunting / Orbital" im Menü', () => {
  it('lässt oben, was die Runde ändert — Stand, Starts, Aufbau, Zentrale', () => {
    expect(ids(paged).slice(0, 5)).toEqual([
      'haunt:status',
      'haunt:play',
      'haunt:watch',
      'haunt:train',
      'haunt:roles',
    ]);
    expect(ids(paged)).toContain('orbital:home');
  });

  it('verteilt den Rest auf wenige Unterseiten, in fester Reihenfolge', () => {
    const pages = ids(paged).filter((id) => HAUNT_PAGES.some((page) => page.id === id));
    expect(pages).toEqual(HAUNT_PAGES.map((page) => page.id));
    expect(HAUNT_PAGES.length).toBeLessThanOrEqual(5);
    expect(pageOf('haunt:seats')).toEqual([
      'haunt:seat-technician',
      'haunt:seat-red',
      'haunt:seat-yellow',
      'haunt:seat-blue',
      'haunt:seat-monster',
      'haunt:powers',
    ]);
    expect(pageOf('haunt:settings')).toEqual(['haunt:light', 'haunt:rooms', 'haunt:monster-kind']);
    expect(pageOf('haunt:gear')).toEqual(['orbital:sensor', 'orbital:heal', 'orbital:leave']);
    expect(pageOf('haunt:sound')).toEqual(['orbital:audio', 'orbital:ambient']);
  });

  it('stellt die Zeilen des VR-Komforts ohne eigene Stufe unter „Ansicht & Komfort"', () => {
    expect(pageOf('haunt:display')).toEqual([
      'orbital:blueprint',
      'ship:comfort:turn',
      'ship:comfort:vignette',
      'ship:comfort:haptics',
    ]);
    expect(ids(paged)).not.toContain('ship:comfort');
  });

  it('setzt die Rettung ans Ende und lässt nichts fallen', () => {
    expect(ids(paged).at(-1)).toBe('haunt:rescue');
    const all = (rows: readonly PagedRow[]): string[] =>
      rows.flatMap((row) => [row.id, ...all(row.children ?? [])]);
    const before = all(FLAT).filter((id) => id !== 'ship:comfort');
    const after = all(paged).filter((id) => !HAUNT_PAGES.some((page) => page.id === id));
    expect(after.sort()).toEqual(before.sort());
  });

  it('baut keine leeren Unterseiten — am Bildschirm ohne Brille gibt es nur wenige Zeilen', () => {
    const few = pageHauntMenu([{ id: 'haunt:technician' }, { id: 'haunt:rescue' }], (page) => ({
      id: page.id,
    }));
    expect(ids(few)).toEqual(['haunt:technician', 'haunt:rescue']);
  });

  it('schickt Werkstatt und Baukasten über die Tabelle der Bereiche in ihre Bereiche', () => {
    for (const id of ['orbital:labs', 'orbital:visits', 'orbital:simulation']) {
      expect(hauntPageOf(id)).toBeNull();
      expect(placementOf(id)?.place.group).toBe('werkstatt');
    }
    expect(placementOf('tools')?.place.group).toBe('bauen');
    // Die Seiten der Welt selbst kennt die Tabelle nicht — sie stehen unter _Diese Welt_.
    for (const page of HAUNT_PAGES) expect(placementOf(page.id)).toBeNull();
  });
});
