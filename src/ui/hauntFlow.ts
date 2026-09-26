import { LOBBY_FLOW } from '../worlds/haunting/rules/roundFlow';

/**
 * **Der Ablauf einer Runde in der Lobby der Startseite** (`#haunting`,
 * `index.html` → `#haunt-flow`). Die Worte kommen aus
 * `worlds/haunting/rules/roundFlow.LOBBY_FLOW` — dieselben wie auf den
 * Knöpfen im Spiel —, und die zwei Schilder haben die Farben des Schilds über
 * der Karte (`.haunt__mode`): Übungsrunde blau, echte Runde rot.
 *
 * `roundFlow.ts` ist reine Daten ohne Abhängigkeiten; die Startseite zieht
 * damit keinen Teil der Welt nach.
 */
export function renderHauntFlow(doc: Document = document): void {
  const title = doc.querySelector<HTMLElement>('#haunt-flow-title');
  const steps = doc.querySelector<HTMLElement>('#haunt-flow-steps');
  const modes = doc.querySelector<HTMLElement>('#haunt-flow-modes');
  if (!title || !steps || !modes) return;
  title.textContent = LOBBY_FLOW.title;
  steps.replaceChildren(
    ...LOBBY_FLOW.steps.map((step) => {
      const item = doc.createElement('li');
      // „1 · Rollen verteilen" — die Zahl macht die Liste selbst.
      item.textContent = step.replace(/^\d+\s*·\s*/, '');
      return item;
    }),
  );
  modes.replaceChildren(
    ...LOBBY_FLOW.cards.map((card) => {
      const box = doc.createElement('div');
      box.className = `haunt-flow__mode haunt-flow__mode--${card.tone}`;
      box.dataset['mode'] = card.mode;
      const badge = doc.createElement('span');
      badge.className = 'haunt-flow__badge';
      badge.textContent = card.badge;
      const when = doc.createElement('p');
      when.className = 'haunt-flow__when';
      when.textContent = card.when;
      const hint = doc.createElement('p');
      hint.className = 'haunt-flow__hint';
      hint.textContent = card.hint;
      box.append(badge, when, hint);
      return box;
    }),
  );
}
