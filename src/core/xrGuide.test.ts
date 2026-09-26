import { WORLDS } from '../worlds';
import { worldIntro } from './worldIntro';
import {
  FADE_IDLE,
  FOLLOW_DEAD_ZONE,
  XR_FADE_IN,
  XR_FADE_OUT,
  XR_HINT_MAX,
  angleDelta,
  fadeActive,
  fadeBegin,
  fadeCancel,
  fadeColor,
  fadeReady,
  fadeStep,
  followYaw,
  xrHintText,
  xrHints,
  xrHintsVisible,
  xrIntroKeys,
  xrWorldVisible,
  type FadeState,
  type XRGuideGate,
} from './xrGuide';

/** So viele Bilder, bis `until` gilt — höchstens `max`. */
function run(state: FadeState, dt: number, minHold: number, until: (s: FadeState) => boolean) {
  let s = state;
  let frames = 0;
  while (!until(s) && frames < 10000) {
    s = fadeStep(s, dt, minHold);
    frames++;
  }
  return { state: s, frames };
}

describe('xrGuide — Abblenden beim Weltwechsel', () => {
  it('steht still, solange kein Wechsel läuft', () => {
    expect(fadeStep(FADE_IDLE, 0.1, 0.7)).toBe(FADE_IDLE);
    expect(fadeActive(FADE_IDLE)).toBe(false);
  });

  it('wird in XR_FADE_IN dunkel und bleibt dunkel, bis die Welt fertig ist', () => {
    const begun = fadeBegin(FADE_IDLE);
    expect(fadeActive(begun)).toBe(true);
    const { state, frames } = run(begun, 1 / 72, 0.7, (s) => s.phase === 'hold');
    expect(state.alpha).toBe(1);
    expect(frames).toBeGreaterThanOrEqual(Math.floor(XR_FADE_IN * 72));
    // Ohne `fadeReady` bleibt es dunkel, auch lange nach der Mindestzeit.
    const later = run(state, 1 / 72, 0.7, () => false).state;
    expect(later.phase).toBe('hold');
    expect(later.alpha).toBe(1);
  });

  it('hält mindestens die Mindestzeit, auch wenn die Welt sofort da ist', () => {
    let s = fadeReady(fadeBegin(FADE_IDLE));
    s = run(s, 1 / 72, 0.7, (one) => one.phase === 'out').state;
    expect(s.age).toBeGreaterThanOrEqual(0.7);
  });

  it('blendet danach in XR_FADE_OUT wieder auf und ist dann fertig', () => {
    let s = run(fadeBegin(FADE_IDLE), 1 / 72, 0, (one) => one.phase === 'hold').state;
    s = fadeReady(s);
    s = fadeStep(s, 1 / 72, 0);
    expect(s.phase).toBe('out');
    const { state, frames } = run(s, 1 / 72, 0, (one) => one.phase === 'idle');
    expect(state).toBe(FADE_IDLE);
    expect(frames).toBeGreaterThanOrEqual(Math.floor(XR_FADE_OUT * 72) - 1);
  });

  it('fängt bei einem neuen Wechsel dort an, wo die Blende gerade steht', () => {
    let s = run(fadeBegin(FADE_IDLE), 1 / 72, 0, (one) => one.phase === 'hold').state;
    s = fadeStep(fadeReady(s), 1 / 72, 0);
    s = fadeStep(s, 0.1, 0);
    expect(s.alpha).toBeLessThan(1);
    const again = fadeBegin(s);
    expect(again.phase).toBe('in');
    expect(again.alpha).toBe(s.alpha);
    expect(again.ready).toBe(false);
  });

  it('läuft bei einem Ruckler nicht rückwärts und nicht über 1', () => {
    const s = fadeStep(fadeBegin(FADE_IDLE), 5, 0);
    expect(s.alpha).toBe(1);
    expect(fadeStep(s, -1, 0).alpha).toBe(1);
  });

  it('ist nach einem Abbruch sofort weg', () => {
    expect(fadeCancel()).toBe(FADE_IDLE);
  });

  it('dunkelt die Akzentfarbe ab, statt sie zu zeigen', () => {
    expect(fadeColor(0xffffff)).toBe(0x1f1f1f);
    expect(fadeColor(0x000000)).toBe(0);
    const orange = fadeColor(0xf0a030);
    expect((orange >> 16) & 0xff).toBeLessThan(40);
  });
});

describe('xrGuide — die Tafel steht vor dem Spieler', () => {
  it('rechnet den kürzesten Winkel, auch über ±π', () => {
    expect(angleDelta(0, 0.5)).toBeCloseTo(0.5);
    expect(angleDelta(3, -3)).toBeCloseTo(2 * Math.PI - 6);
    expect(angleDelta(-3, 3)).toBeCloseTo(6 - 2 * Math.PI);
  });

  it('bleibt stehen, solange man nur zur Seite schaut', () => {
    const s = followYaw({ yaw: 0, moving: false }, FOLLOW_DEAD_ZONE * 0.9, 1 / 72);
    expect(s).toEqual({ yaw: 0, moving: false });
  });

  it('rückt weich nach, wenn man sich wegdreht, und steht dann wieder', () => {
    let s = followYaw({ yaw: 0, moving: false }, Math.PI / 2, 1 / 72);
    expect(s.moving).toBe(true);
    expect(s.yaw).toBeGreaterThan(0);
    // Kein Sprung: ein Bild rückt nur ein kleines Stück.
    expect(s.yaw).toBeLessThan(0.1);
    for (let i = 0; i < 400 && s.moving; i++) s = followYaw(s, Math.PI / 2, 1 / 72);
    expect(s.moving).toBe(false);
    expect(Math.abs(angleDelta(s.yaw, Math.PI / 2))).toBeLessThan(0.1);
  });

  it('geht den kurzen Weg um die Rückseite herum', () => {
    const s = followYaw({ yaw: 2.5, moving: false }, -2.5, 0.1);
    expect(s.moving).toBe(true);
    expect(s.yaw).toBeGreaterThan(2.5);
  });
});

describe('xrGuide — die Knöpfe heißen wie in der Hand', () => {
  it('nennt für jede Welt Knöpfe der Brille und keine Tasten', () => {
    for (const world of WORLDS) {
      const intro = worldIntro(world.id);
      if (!intro) continue;
      const keys = xrIntroKeys(intro.tips).map((item) => item.key);
      expect(keys.length).toBeGreaterThan(0);
      for (const key of keys) expect(key).not.toMatch(/^(WASD|E|M|Tab|V|LS)$/);
    }
  });

  it('sagt im Burgerladen Stock, A, Griff und ☰ — in dieser Reihenfolge', () => {
    const keys = xrIntroKeys(worldIntro('plateup')!.tips);
    expect(keys.map((item) => item.key)).toEqual(['Stock L', 'A', 'Griff', '☰']);
    expect(keys[2]!.label).toBe('Greifen');
  });

  it('nimmt in der Testwelt das Werkzeug mit dem Griff und fügt keinen zweiten an', () => {
    const keys = xrIntroKeys(worldIntro('test')!.tips);
    expect(keys.filter((item) => item.key === 'Griff')).toHaveLength(1);
    expect(keys.find((item) => item.key === 'Griff')!.label).toBe('Werkzeug');
  });

  it('lässt die Ansicht weg — in der Brille steht man in der Welt', () => {
    expect(xrIntroKeys([{ action: 'view', label: 'Ansicht' }])).toEqual([]);
  });
});

describe('xrGuide — die Beschriftung am Controller', () => {
  const idle = { useCandidate: false, carrying: false, armed: false, canJump: true };

  it('hat höchstens drei Knöpfe', () => {
    const zones = [
      null,
      { kind: 'kart' } as const,
      { kind: 'burger', holding: false, closed: true } as const,
      { kind: 'haunting', role: 'technician' } as const,
      { kind: 'haunting', role: 'monster' } as const,
    ];
    for (const zone of zones) {
      for (const ctx of [
        idle,
        { useCandidate: true, carrying: true, armed: true, canJump: false },
      ]) {
        const label = xrHints(zone, ctx);
        expect(label).not.toBeNull();
        expect(label!.items.length).toBeLessThanOrEqual(XR_HINT_MAX);
        expect(label!.items.length).toBeGreaterThan(0);
      }
    }
  });

  it('sagt ohne Zone Springen oder Benutzen — je nachdem, was in Reichweite ist', () => {
    expect(xrHintText(xrHints(null, idle))).toBe('A Springen · Griff Greifen');
    expect(xrHintText(xrHints(null, { ...idle, useCandidate: true }))).toContain('A Benutzen');
    expect(xrHintText(xrHints(null, { ...idle, armed: true }))).toContain('Trigger Auslösen');
  });

  it('verspricht auf dem Zellgitter kein Springen', () => {
    const grid = { ...idle, canJump: false };
    expect(xrHintText(xrHints(null, grid))).toBe('Griff Greifen');
    expect(xrHintText(xrHints({ kind: 'haunting', role: 'technician' }, grid))).toBe(
      'Station: Techniker · Griff Greifen',
    );
    expect(xrHintText(xrHints(null, { ...grid, useCandidate: true }))).toContain('A Benutzen');
  });

  it('fährt im Kart mit den Triggern', () => {
    const label = xrHints({ kind: 'kart' }, idle)!;
    expect(label.title).toBe('Kart');
    expect(label.items.map((item) => item.key)).toEqual(['Trigger R', 'Trigger L', 'A halten']);
  });

  it('greift im Burgerladen mit der Hand', () => {
    const closed = xrHints({ kind: 'burger', holding: false, closed: true }, idle)!;
    expect(closed.items[0]).toEqual({ key: 'Griff', label: 'Glocke läuten' });
    const holding = xrHints({ kind: 'burger', holding: true, closed: false }, idle)!;
    expect(holding.items[0]!.key).toBe('Loslassen');
  });

  it('schweigt, wo es in der Brille nichts zu sagen gibt (Kran, Kartenplätze)', () => {
    expect(xrHints({ kind: 'build', tool: 'place' }, idle)).toBeNull();
    expect(xrHints({ kind: 'haunting', role: 'map' }, idle)).toBeNull();
    expect(xrHints({ kind: 'haunting', role: 'watch' }, idle)).toBeNull();
    expect(xrHintText(null)).toBe('');
  });
});

describe('xrGuide — wann was steht', () => {
  const open: XRGuideGate = { presenting: true, transit: false, menu: false, world: true };

  it('zeigt die Welt nur mit Brille, ohne Blende, ohne Menü und mit Welt', () => {
    expect(xrWorldVisible(open)).toBe(true);
    expect(xrWorldVisible({ ...open, presenting: false })).toBe(false);
    expect(xrWorldVisible({ ...open, transit: true })).toBe(false);
    expect(xrWorldVisible({ ...open, menu: true })).toBe(false);
    expect(xrWorldVisible({ ...open, world: false })).toBe(false);
  });

  it('lässt die Beschriftung weg, wenn sie aus ist oder die Willkommens-Tafel steht', () => {
    expect(xrHintsVisible(open, true, false)).toBe(true);
    expect(xrHintsVisible(open, false, false)).toBe(false);
    expect(xrHintsVisible(open, true, true)).toBe(false);
    expect(xrHintsVisible({ ...open, menu: true }, true, false)).toBe(false);
  });
});
