import { ScreenMessage } from './ScreenMessage';
import './updatePrompt.css';

/**
 * **„Eine neue Version ist da"** — die Frage nach dem Neuladen, und nur eine
 * Frage (`core/updateCheck.ts`). Die App läuft darunter weiter: Die Karte
 * fängt keine Berührung ab außer an ihren Knöpfen, und _Später_ (oder das ✕)
 * nimmt sie weg, bis die App das nächste Mal nach vorn kommt.
 */
export class UpdatePrompt {
  readonly element: HTMLElement;
  private readonly message: ScreenMessage;

  constructor(
    private readonly reload: () => void,
    host: HTMLElement = document.body,
  ) {
    this.message = new ScreenMessage({
      tag: 'section',
      className: 'update-prompt',
      kicker: 'Update',
      title: 'Neue Version verfügbar',
      text: 'Du kannst einfach weiterspielen und neu laden, wann es dir passt. Beim Neuladen fängt die Welt von vorn an.',
      closeHint: 'Später',
      onClose: () => this.hide(),
    });
    this.element = this.message.element;
    const actions = document.createElement('div');
    actions.className = 'update-prompt__actions';
    actions.append(
      button('Jetzt neu laden', 'update-prompt__go', () => this.reload()),
      button('Später', 'update-prompt__later', () => this.hide()),
    );
    this.message.body.append(actions);
    host.append(this.element);
  }

  get open(): boolean {
    return this.message.open;
  }

  show(): void {
    this.message.show();
  }

  hide(): void {
    this.message.hide();
  }
}

function button(label: string, className: string, run: () => void): HTMLButtonElement {
  const node = document.createElement('button');
  node.type = 'button';
  node.className = `update-prompt__button ${className}`;
  node.textContent = label;
  node.addEventListener('pointerdown', (event) => event.stopPropagation());
  node.addEventListener('click', (event) => {
    event.stopPropagation();
    run();
  });
  return node;
}
