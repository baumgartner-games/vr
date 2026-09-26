import { INTENT_LABELS, INTENTS, startLabel, applyIntent } from './lobby';
import { defaultSetup, withWho } from './roundSetup';
import {
  canHide,
  FLOW,
  FLOW_STEPS,
  LOBBY_FLOW,
  MODE_TEXT,
  pauseActions,
  pauseTitle,
  roundMode,
} from './roundFlow';

describe('Der Ablauf einer Runde', () => {
  /**
   * **Zwei Modi und eine Vorführung** — und der Stand vor dem Start ist
   * dieselbe Übungsrunde wie der sichere Test: Für den Spieler gibt es genau
   * eine „Übung".
   */
  it('nennt jeden Stand mit genau einem Modus', () => {
    const base = { test: false, simulation: false };
    expect(roundMode({ ...base, phase: 'briefing' })).toBe('practice');
    expect(roundMode({ ...base, phase: 'running', test: true })).toBe('practice');
    expect(roundMode({ ...base, phase: 'running' })).toBe('real');
    expect(roundMode({ ...base, phase: 'running', test: true, simulation: true })).toBe('demo');
    expect(roundMode({ ...base, phase: 'won' })).toBe('over');
    expect(roundMode({ ...base, phase: 'lost' })).toBe('over');
  });

  it('sagt in jedem Modus, in welcher Runde man ist', () => {
    expect(MODE_TEXT.practice.line).toMatch(/^Du bist in einer Übungsrunde/);
    expect(MODE_TEXT.real.line).toMatch(/^Du bist in einer echten Runde/);
    expect(MODE_TEXT.practice.badge).toBe('ÜBUNGSRUNDE');
    expect(MODE_TEXT.real.badge).toBe('ECHTE RUNDE');
    expect(pauseTitle('practice')).toBe('Pause · Übungsrunde');
    expect(pauseTitle('real')).toBe('Pause · Echte Runde');
  });

  /**
   * **Ein Weg je Ziel.** Im Pausemenü steht je Modus genau ein Knopf, der die
   * Runde ändert — und nie zwei, die an dieselbe Stelle führen.
   */
  it('bietet im Pausemenü je Modus genau einen Weg, die Runde zu ändern', () => {
    expect(pauseActions('practice')).toEqual(['real']);
    expect(pauseActions('real')).toEqual(['stop']);
    expect(pauseActions('demo')).toEqual(['stop']);
    expect(pauseActions('over')).toEqual(['again', 'back']);
  });

  /**
   * **Der Schutzschrank geht auch in der Übungsrunde auf** — auch im Stand
   * vor dem Start (`briefing`, ohne `options.test`), in dem man nach dem
   * Beitreten landet. Befund: „Ich kann in der Übungsrunde nicht in den Spind
   * rein."
   */
  it('lässt in der Übung und in der echten Runde in den Schutzschrank', () => {
    const base = { test: false, simulation: false };
    expect(canHide(roundMode({ ...base, phase: 'briefing' }))).toBe(true);
    expect(canHide(roundMode({ ...base, phase: 'running', test: true }))).toBe(true);
    expect(canHide(roundMode({ ...base, phase: 'running' }))).toBe(true);
    expect(canHide(roundMode({ ...base, phase: 'running', simulation: true }))).toBe(false);
    expect(canHide(roundMode({ ...base, phase: 'won' }))).toBe(false);
    expect(canHide(roundMode({ ...base, phase: 'lost' }))).toBe(false);
  });

  /**
   * **„Test" heißt nirgends mehr etwas.** Vorher hieß der helle Stand „Rollen
   * testen", der Start ohne Monster „Test starten", und dazu gab es das
   * „Testlicht" — dreimal „Test" für zwei verschiedene Dinge.
   */
  it('kommt ohne das Wort „Test" aus und nennt die Absichten wie die Knöpfe', () => {
    for (const text of [...Object.values(FLOW), ...FLOW_STEPS]) expect(text).not.toMatch(/Test/);
    expect(INTENTS.map((intent) => INTENT_LABELS[intent])).toEqual([
      FLOW.real,
      FLOW.demo,
      FLOW.practice,
    ]);
    const setup = defaultSetup();
    expect(startLabel(setup)).toBe(FLOW.real);
    expect(startLabel(withWho(setup, 'monster', 'off'))).toBe('Übungsrunde starten');
    // Die echte Runde holt ein ausgeschaltetes Monster zurück.
    expect(startLabel(applyIntent(withWho(setup, 'monster', 'off'), 'play'))).toBe(FLOW.real);
  });

  it('führt in zwei Schritten zum Start: Rollen, dann Übung oder echt', () => {
    expect(FLOW_STEPS).toEqual(['1 · Rollen verteilen', '2 · Übungsrunde oder echte Runde']);
  });

  /**
   * **Die Lobby der Startseite** sagt vor dem Beitreten, wo man landet und wie
   * es echt wird — mit den Worten der Knöpfe, nicht mit eigenen.
   */
  it('nennt in der Lobby Übungsrunde und echte Runde wie die Knöpfe im Spiel', () => {
    const [practice, real] = LOBBY_FLOW.cards;
    expect(practice.badge).toBe(MODE_TEXT.practice.badge);
    expect(practice.when).toContain(`„${FLOW.practice}"`);
    expect(practice.hint).toBe(FLOW.practiceHint);
    expect(real.badge).toBe(MODE_TEXT.real.badge);
    expect(real.when).toContain(`„${FLOW.real}"`);
    expect(real.hint).toBe(FLOW.realHint);
    expect(LOBBY_FLOW.steps).toBe(FLOW_STEPS);
    for (const card of LOBBY_FLOW.cards) expect(card.when + card.hint).not.toMatch(/Test/);
  });
});
