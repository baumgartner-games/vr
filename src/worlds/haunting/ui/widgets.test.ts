/** @jest-environment jsdom */
import { clickedKey, el, setData } from './dom';
import {
  TOAST_SECONDS,
  Toast,
  captioned,
  fact,
  head,
  key,
  labelled,
  note,
  optionKey,
  pillKey,
} from './widgets';

/**
 * **Die Bausteine der Haunting-Oberfläche** (`ui/widgets.ts`): Was fünf
 * Stellen bisher jede für sich gebaut haben, baut jetzt eine Funktion — und
 * die muss genau das liefern, was die Stellen erwartet haben: `strong` und
 * `small`, `data-*`, `is-active`, `aria-pressed`, `disabled`.
 */
describe('Die DOM-Hilfen', () => {
  it('bauen ein Element mit Klasse und Text — und nie mit Markup', () => {
    const node = el('div', 'a b', '<b>Nils</b>');
    expect(node.className).toBe('a b');
    expect(node.textContent).toBe('<b>Nils</b>');
    expect(node.children).toHaveLength(0);
    expect(el('span').className).toBe('');
  });

  it('finden den Knopf über dem Ziel eines Klicks', () => {
    const root = el('div');
    const button = el('button');
    const inner = el('small', '', 'Zeile');
    button.append(inner);
    root.append(button, el('p', '', 'kein Knopf'));
    let seen: HTMLButtonElement | null | undefined;
    root.addEventListener('click', (event) => {
      seen = clickedKey(event);
    });
    inner.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(seen).toBe(button);
    root.lastElementChild!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(seen).toBeNull();
  });

  it('schreiben data-* aus einem Objekt', () => {
    const node = el('div');
    setData(node, { switchView: '2d', leave: '' });
    expect(node.getAttribute('data-switch-view')).toBe('2d');
    expect(node.hasAttribute('data-leave')).toBe(true);
  });
});

describe('Der Knopf', () => {
  it('steht als eine Zeile oder als Name mit Zeile darunter', () => {
    const plain = key('x', { text: 'Mensch' });
    expect(plain.tagName).toBe('BUTTON');
    expect(plain.type).toBe('button');
    expect(plain.className).toBe('x');
    expect(plain.textContent).toBe('Mensch');
    expect(plain.children).toHaveLength(0);

    const two = key('x', { label: 'Rot', sub: 'Archiv' });
    expect(two.querySelector('strong')?.textContent).toBe('Rot');
    expect(two.querySelector('small')?.textContent).toBe('Archiv');

    // Ohne Zeile bleibt der Name groß — und kein leeres `small` darunter.
    const one = key('x', { label: 'Techniker' });
    expect(one.querySelector('strong')?.textContent).toBe('Techniker');
    expect(one.querySelector('small')).toBeNull();
    expect(key('x', { label: 'Techniker', sub: '' }).querySelector('small')).toBeNull();
  });

  it('trägt Schlüssel, Zustand und Titel', () => {
    const node = key('x', {
      text: 'Weiter',
      data: { closeOptions: '', me: 'red' },
      active: true,
      pressed: false,
      disabled: true,
      title: 'Warum nicht',
      ariaLabel: 'Rot · Archiv',
    });
    expect(node.dataset['closeOptions']).toBe('');
    expect(node.dataset['me']).toBe('red');
    expect(node.classList.contains('is-active')).toBe(true);
    expect(node.getAttribute('aria-pressed')).toBe('false');
    expect(node.disabled).toBe(true);
    expect(node.hasAttribute('disabled')).toBe(true);
    expect(node.title).toBe('Warum nicht');
    expect(node.getAttribute('aria-label')).toBe('Rot · Archiv');

    // Was nicht gesagt wird, steht auch nicht dran.
    const bare = key('x', { text: 'Ohne' });
    expect(bare.hasAttribute('aria-pressed')).toBe(false);
    expect(bare.classList.contains('is-active')).toBe(false);
    expect(bare.disabled).toBe(false);
    expect(bare.title).toBe('');
  });

  it('kennt den Listenknopf mit Ton und die Pille', () => {
    const go = optionKey({ label: 'Mission starten', sub: 'jetzt', tone: 'go' }, 'haunt__x');
    expect([...go.classList]).toEqual(['ui-option', 'ui-option--go', 'haunt__x']);
    const leave = optionKey({ text: 'Raus', tone: 'leave' });
    expect([...leave.classList]).toEqual(['ui-option', 'ui-option--leave']);
    expect([...optionKey({ text: 'Weiter' }).classList]).toEqual(['ui-option']);
    expect([...pillKey({ text: 'Karte' }).classList]).toEqual(['ui-pill']);
    expect([...pillKey({ text: '+' }, 'flat__x').classList]).toEqual(['ui-pill', 'flat__x']);
  });

  it('füllt die Knöpfe unter dem Daumen in beiden Reihenfolgen', () => {
    const pad = el('button');
    pad.replaceChildren(...captioned('Wechseln', 'Lampe'));
    expect([...pad.children].map((one) => `${one.tagName}:${one.textContent}`)).toEqual([
      'SMALL:Wechseln',
      'STRONG:Lampe',
    ]);
    pad.replaceChildren(...labelled('Benutzen', 'Kiste A3'));
    expect([...pad.children].map((one) => `${one.tagName}:${one.textContent}`)).toEqual([
      'STRONG:Benutzen',
      'SMALL:Kiste A3',
    ]);
  });
});

describe('Kachel, Zeile und Überschrift', () => {
  it('bauen die Kachel mit Ton und eigener Klasse', () => {
    const node = note('warn', 'Weggeschubst', 'Nimm ein anderes Gerät.', 'haunt__x');
    expect([...node.classList]).toEqual(['ui-note', 'is-warn', 'haunt__x']);
    expect(node.querySelector('strong')?.textContent).toBe('Weggeschubst');
    expect(node.querySelector('span')?.textContent).toBe('Nimm ein anderes Gerät.');
    expect([...note('calm', 'a', 'b').classList]).toEqual(['ui-note', 'is-calm']);
  });

  it('bauen die Zeile mit Begriff und Auskunft', () => {
    const row = fact('Türen', '3 · alle frei');
    expect(row.className).toBe('ui-fact');
    expect(row.querySelector('span')?.textContent).toBe('Türen');
    expect(row.querySelector('b')?.textContent).toBe('3 · alle frei');
    const warn = fact('Licht', 'aus', { warn: true, valueClass: 'role__code' });
    expect(warn.classList.contains('is-warn')).toBe(true);
    expect(warn.querySelector('b')?.className).toBe('role__code');
  });

  it('bauen die Überschrift mit und ohne Beisage', () => {
    const plain = head('Runde');
    expect(plain.tagName).toBe('STRONG');
    expect(plain.className).toBe('ui-head');
    expect(plain.textContent).toBe('Runde');
    expect(plain.querySelector('.ui-head-aside')).toBeNull();
    const aside = head('Wessen Platz?', 'nur sehen', 'role__h');
    expect([...aside.classList]).toEqual(['ui-head', 'role__h']);
    expect(aside.querySelector('.ui-head-aside')?.textContent).toBe('nur sehen');
  });
});

describe('Die Meldung', () => {
  it('steht mit Ton da und geht von selbst wieder', () => {
    const toast = new Toast('flat__toast');
    expect(toast.element.className).toBe('ui-toast flat__toast');
    expect(toast.shown).toBe(false);
    toast.say('Tür gesperrt', 'good');
    expect(toast.element.textContent).toBe('Tür gesperrt');
    expect(toast.element.className).toBe('ui-toast flat__toast is-good');
    expect(toast.shown).toBe(true);
    toast.step(TOAST_SECONDS - 0.1);
    expect(toast.element.textContent).toBe('Tür gesperrt');
    toast.step(0.2);
    expect(toast.element.textContent).toBe('');
    expect(toast.element.className).toBe('ui-toast flat__toast');
    expect(toast.shown).toBe(false);
  });

  it('nimmt eine leere Zeile nicht an und wechselt den Ton mit der nächsten', () => {
    const toast = new Toast();
    toast.say('');
    expect(toast.shown).toBe(false);
    toast.say('eins', 'bad');
    toast.say('zwei');
    expect(toast.element.className).toBe('ui-toast');
    expect(toast.element.textContent).toBe('zwei');
  });
});
