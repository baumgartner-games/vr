import type { RoleHost, RoleView } from '../registry/roles';
import { el } from './roleShell';

/**
 * **Der Fernseher** — alles zu sehen, nichts zu bedienen.
 *
 * Er ist die einzige Rolle **ohne Karte**: Sein Bild ist die Station in 3D,
 * von schräg oben, bei Tag, ohne Decke — gezeichnet von der Welt selbst in das
 * Rechteck, das `viewport()` meldet (`HauntingWorld.render`, `aimShow`). Genau
 * diese Ansicht bleibt, wie sie ist; die drei anderen Nicht-VR-Rollen sind
 * Karten geworden, der Fernseher nicht. Ein Zuschauer, der ein Puppenhaus
 * bekommt, schaut zu; einer, der einen Grundriss bekommt, spielt mit.
 *
 * Und er hat keinen einzigen Knopf. Wer alles sieht *und* etwas tun kann, ist
 * kein Zuschauer mehr, sondern der Spieler mit den besten Karten — und dann
 * sind die anderen Deko. Was hier steht, ist deshalb nur, was das Bild ist und
 * was man damit **nicht** macht.
 */
export function mountWatchView(host: RoleHost): RoleView {
  const element = el('div', 'role role--watch');
  // Das Bild selbst gehört der Welt: Dieses Element ist das Loch dafür.
  const hole = el('div', 'role__hole role__hole--full');
  const notes = el('div', 'role__notes');
  element.append(hole, notes);
  let drawn = '';

  const write = (): void => {
    const on = host.snapshot().entities.some((entity) => entity.kind === 'monster');
    const key = String(on);
    if (key === drawn) return;
    drawn = key;
    notes.replaceChildren(
      note(
        'live',
        'Die ganze Station, bei Tag',
        'Von schräg oben, ohne Decke, mit allem darin: den Sachen, dem Mitspieler — und dem Monster, wenn es an ist. Für den Fernseher im Raum gedacht, nicht fürs Telefon in der Hand.',
      ),
      note(
        'warn',
        'Und du sagst nichts',
        'Du siehst, was die anderen sich gerade mühsam zusammenrufen. Ein Zuruf von dir beendet die Runde schneller als das Monster — zusehen ist die ganze Rolle.',
      ),
      note(
        on ? 'live' : 'calm',
        on ? 'Das Monster ist an' : 'Das Monster ist aus',
        on
          ? 'Es läuft in der Station herum, und du siehst es. Die in der Zentrale sehen es nicht — der Späher bekommt alle paar Sekunden einen Punkt, sonst niemand etwas.'
          : 'Es ist ausgeschaltet. Solange bleibt die Station leer, und alle üben.',
      ),
    );
  };
  write();

  return {
    element,
    update: () => write(),
    dispose: () => element.remove(),
    viewport: () => {
      const box = hole.getBoundingClientRect();
      if (box.width < 8 || box.height < 8) return null;
      return { x: box.left, y: box.top, w: box.width, h: box.height };
    },
  };
}

function note(tone: 'warn' | 'live' | 'calm', title: string, text: string): HTMLElement {
  const node = el('div', `role__note is-${tone}`);
  node.append(el('strong', '', title), el('span', '', text));
  return node;
}
