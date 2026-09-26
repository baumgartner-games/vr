/** @jest-environment jsdom */
import { CLOSE_LABEL, ScreenMessage, messagePill } from './ScreenMessage';

/**
 * **Die eine Meldung am Schirm** (`ui/ScreenMessage.ts`): Jede Meldung hat
 * dasselbe ✕ mit demselben Wort, `✕` und `Esc` rufen `onClose`, `hide()`
 * nicht — und der Text der Meldung bleibt ihr Text, ohne angehängtes „✕".
 */
function escape(target: EventTarget = window): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('ScreenMessage', () => {
  it('baut Karte mit Kopfzeile, Titel, Text und ✕', () => {
    const message = new ScreenMessage({
      className: 'welcome',
      kicker: 'Willkommen',
      title: 'Restaurant',
      text: 'Gäste kommen.',
    });
    const node = message.element;
    expect([...node.classList]).toEqual(['msg', 'msg--card', 'welcome']);
    expect(node.hidden).toBe(true);
    expect(node.getAttribute('role')).toBe('status');
    expect(node.querySelector('.msg__kicker')?.textContent).toBe('Willkommen');
    expect(node.querySelector('.msg__title')?.textContent).toBe('Restaurant');
    expect(node.querySelector('.msg__text')?.textContent).toBe('Gäste kommen.');
    const close = node.querySelector<HTMLButtonElement>('.msg__close')!;
    expect(close.type).toBe('button');
    expect(close.getAttribute('aria-label')).toBe(CLOSE_LABEL);
    expect(CLOSE_LABEL).toBe('Schließen');
    // Das Zeichen malt das CSS: Der Text der Meldung ist nur ihr Text.
    expect(node.textContent).toBe('WillkommenRestaurantGäste kommen.');
  });

  it('versteckt leere Zeilen', () => {
    const message = new ScreenMessage({ title: 'Nur ein Titel' });
    expect(message.kickerNode.hidden).toBe(true);
    expect(message.textNode.hidden).toBe(true);
    message.setText('Und jetzt Text');
    expect(message.textNode.hidden).toBe(false);
  });

  it('✕ schließt und ruft onClose, hide() nicht', () => {
    const onClose = jest.fn();
    const message = new ScreenMessage({ title: 'x', onClose, open: true });
    document.body.append(message.element);
    message.hide();
    expect(message.open).toBe(false);
    expect(onClose).not.toHaveBeenCalled();
    message.show();
    message.closeButton.click();
    expect(message.open).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('der Druck auf das ✕ geht nicht an das Spiel darunter', () => {
    const message = new ScreenMessage({ open: true });
    document.body.append(message.element);
    const below = jest.fn();
    document.body.addEventListener('pointerdown', below);
    document.body.addEventListener('click', below);
    message.closeButton.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    message.closeButton.click();
    expect(below).not.toHaveBeenCalled();
  });

  it('Esc schließt die zuletzt geöffnete Karte, eine nach der anderen', () => {
    const first = jest.fn();
    const second = jest.fn();
    const a = new ScreenMessage({ title: 'a', onClose: first });
    const b = new ScreenMessage({ title: 'b', onClose: second });
    document.body.append(a.element, b.element);
    b.show();
    a.show();
    expect(escape().defaultPrevented).toBe(true);
    expect(first).toHaveBeenCalledTimes(1);
    expect(b.open).toBe(true);
    escape();
    expect(second).toHaveBeenCalledTimes(1);
    // Nichts mehr offen: Esc bleibt frei für andere.
    expect(escape().defaultPrevented).toBe(false);
    a.dispose();
    b.dispose();
  });

  it('Esc lässt Menüs, Eingabefelder und Pillen in Ruhe', () => {
    const onClose = jest.fn();
    const card = new ScreenMessage({ title: 'x', onClose });
    document.body.append(card.element);
    card.show();
    // Ein Menü hat die Taste schon genommen.
    const taken = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    taken.preventDefault();
    window.dispatchEvent(taken);
    // Im Eingabefeld gehört Esc dem Feld.
    const input = document.createElement('input');
    document.body.append(input);
    escape(input);
    expect(onClose).not.toHaveBeenCalled();
    card.dispose();

    const pillClose = jest.fn();
    document.body.append(messagePill('Tipp', pillClose));
    escape();
    expect(pillClose).not.toHaveBeenCalled();
  });

  it('messagePill: eine Zeile, gleich sichtbar, mit demselben ✕', () => {
    const onClose = jest.fn();
    const pill = messagePill('Tipp: Glocke', onClose, {
      className: 'plateup-tip',
      closeHint: 'Einsteigerhilfe ausschalten',
    });
    expect([...pill.classList]).toEqual(['msg', 'msg--pill', 'plateup-tip']);
    expect(pill.hidden).toBe(false);
    expect(pill.textContent).toBe('Tipp: Glocke');
    const close = pill.querySelector<HTMLButtonElement>('.msg__close')!;
    expect(close.getAttribute('aria-label')).toBe('Schließen');
    expect(close.title).toBe('Einsteigerhilfe ausschalten');
    close.click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
