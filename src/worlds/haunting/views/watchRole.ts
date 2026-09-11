import { roles, type RoleHost, type RoleView } from '../registry/roles';
import {
  defaultLens,
  seatStation,
  WATCH_FOLLOWS,
  WATCH_SEATS,
  type WatchFollow,
  type WatchLens,
  type WatchSeat,
} from '../watchLens';
import { el } from './roleShell';

/**
 * **Der Fernseher** — alles zu sehen, nichts zu bedienen, aber jetzt aus jedem
 * Blickwinkel.
 *
 * Er war lange das ganze Deck von schräg oben und sonst nichts: ein Fenster,
 * kein Platz. Gewünscht war das Gegenteil — „statt nur den Techniker spielen
 * zu können, auch in die Rollen der anderen Spieler schlüpfen". Deshalb hat er
 * eine **Linse** (`watchLens.ts`) mit drei Fragen: **wessen Platz** man ansieht,
 * **wem** die Kamera über dem Deck folgt, und ob das Overlay **KI-Absichten**
 * mitläuft.
 *
 * **Deck ist das Puppenhaus**, gezeichnet von der Welt selbst in das Rechteck,
 * das `viewport()` meldet (`HauntingWorld.render`, `aimShow`) — ein Zuschauer,
 * der ein Puppenhaus bekommt, schaut zu; einer, der einen Grundriss bekommt,
 * spielt mit. **Jeder andere Platz ist die Ansicht dieser Rolle aus der
 * Registry**, aufgeschlagen wie der Rollenstreifen der 2D-Welt es tut
 * (`views/roleStrip.ts`): Es gibt keine zweite, nachgebaute Fassung des
 * Archivblatts und keine zweite Schalterliste — was der Archivar sieht, ist
 * per Bauweise dasselbe wie das, was der Zuschauer von ihm sieht.
 *
 * **Und er hat keinen einzigen Schalter.** Die fremde Ansicht bekommt einen
 * Wirt, dessen `door` und `light` `''` zurückgeben und nichts tun. Wer alles
 * sieht *und* schalten dürfte, wäre der fünfte Spieler mit den besten Karten,
 * und die anderen vier wären Deko. Das ist keine Höflichkeitsregel, sondern
 * die Rolle: Was er sieht, darf er nicht einmal sagen.
 *
 * **KI-Absichten gibt es nur hier** (Paket M4): Ein Spieler mit dem
 * Glaubensbild des Monsters vor sich weiß, welche Zimmer gerade sicher sind.
 * Die Welt fragt deshalb nicht eine Einstellung, sondern diese Linse
 * (`HauntingWorld.insightWanted`).
 */
export function mountWatchView(host: RoleHost): WatchRoleView {
  return new WatchView(host);
}

export interface WatchRoleView extends RoleView {
  /** Was gerade angesehen wird — die Welt richtet ihre Kamera danach aus. */
  readonly lens: Readonly<WatchLens>;
}

class WatchView implements WatchRoleView {
  readonly element = el('div', 'role role--watch');
  /** Das Loch für das Puppenhaus — die Welt zeichnet hier hinein. */
  private readonly hole = el('div', 'role__hole role__hole--full');
  /** Und der Platz, an dem eine fremde Rollenansicht liegt. */
  private readonly stage = el('div', 'role__stage');
  private readonly notes = el('div', 'role__notes');
  private readonly corner = el('button', 'role__corner');
  private view: RoleView | null = null;
  private shown = '';
  private drawn = '';
  private open = true;
  private state: WatchLens = defaultLens();

  constructor(private readonly host: RoleHost) {
    this.stage.hidden = true;
    this.corner.dataset['watchPanel'] = '';
    this.corner.addEventListener('click', () => {
      this.open = !this.open;
      this.drawn = '';
      this.write();
    });
    this.notes.addEventListener('click', (event) => this.click(event));
    this.element.append(this.hole, this.stage, this.corner, this.notes);
    this.write();
  }

  get lens(): Readonly<WatchLens> {
    return this.state;
  }

  update(dt: number): void {
    this.write();
    this.view?.update(dt);
  }

  /**
   * **Wohin die Welt zeichnen soll.** Über dem Deck ist das sein eigenes Loch;
   * auf einem fremden Platz die Antwort *dieser* Ansicht — der Archivar macht
   * eines auf, solange eine Raumakte offen ist, die Karten nie. Ein Rechteck,
   * in das niemand zeichnet, wäre ein schwarzes Loch in der Seite.
   */
  viewport(): { x: number; y: number; w: number; h: number } | null {
    if (this.state.seat !== 'deck') return this.view?.viewport?.() ?? null;
    const box = this.hole.getBoundingClientRect();
    if (box.width < 8 || box.height < 8) return null;
    return { x: box.left, y: box.top, w: box.width, h: box.height };
  }

  // --- die fremde Ansicht ------------------------------------------------------

  /**
   * **Die Rolle des gewählten Platzes aufschlagen** — dieselbe, die auf dem
   * Telefon des Mitspielers läuft, nur mit einem Wirt, der nichts kann.
   *
   * Abgebaut wird beim Wechsel, und zwar mit `dispose`: Eine Archivansicht,
   * die man stehen ließe, hielte die Kamera der Welt auf ihrem Zimmer fest.
   */
  private mount(): void {
    const wanted = this.state.seat === 'deck' ? '' : seatStation(this.state.seat);
    if (wanted === this.shown) return;
    this.view?.dispose();
    this.view = null;
    this.shown = wanted;
    const role = wanted ? roles.get(wanted) : undefined;
    if (role) {
      this.view = role.mount(this.readOnlyHost());
      this.stage.replaceChildren(this.view.element);
    } else this.stage.replaceChildren();
    this.stage.hidden = !this.view;
    this.element.classList.toggle('is-guest', !!this.view);
  }

  /**
   * **Ein Wirt, der nichts tut.** Lesen darf der Zuschauer alles — den Stand,
   * den Grundriss, die Buchführung, die Beschriftungen der Tafel. Schalten
   * nicht: `door` und `light` geben `''` zurück, und die Ansicht sagt dann von
   * selbst, dass dafür kein Schalter da ist. Auch das Steuer des Monsters
   * bleibt weg (`extra.monster = null`) — ein Stock unter dem Daumen, der
   * nichts bewegt, ist eine Zusage, die das Spiel nicht einhält.
   */
  private readOnlyHost(): RoleHost {
    const host = this.host;
    const extra = host.extra as { archive?: unknown } | null | undefined;
    return {
      snapshot: () => host.snapshot(),
      spec: () => host.spec(),
      ledger: () => host.ledger(),
      me: () => host.me(),
      nameOf: (peer) => host.nameOf(peer),
      door: () => '',
      light: () => '',
      switches: () => host.switches(),
      notify: (text) => host.notify(text),
      // Das Loch des Archivars bleibt: Es ist ein Bild und kein Griff, und
      // genau dafür gibt es den Platz „Archiv" in der Linse.
      extra: { monster: null, archive: extra?.archive ?? null },
    };
  }

  // --- die Linse ----------------------------------------------------------------

  private click(event: Event): void {
    const key = (event.target as HTMLElement | null)?.closest('button');
    if (!key) return;
    // **Nur das Bild wechselt.** Der Platz bleibt der Fernseher — der
    // Zuschauer setzt sich nicht ans Archiv, er sieht dem Archivar zu.
    if (key.dataset['watchSeat'])
      this.state = { ...this.state, seat: key.dataset['watchSeat'] as WatchSeat };
    else if (key.dataset['watchFollow'])
      this.state = { ...this.state, follow: key.dataset['watchFollow'] as WatchFollow };
    else if (key.dataset['watchInsight'] !== undefined)
      this.state = { ...this.state, insight: !this.state.insight };
    else return;
    this.drawn = '';
    this.write();
  }

  private write(): void {
    const on = this.host.snapshot().entities.some((entity) => entity.kind === 'monster');
    const sign = `${this.state.seat}/${this.state.follow}/${this.state.insight}/${on}/${this.open}`;
    if (sign === this.drawn) {
      this.mount();
      return;
    }
    this.drawn = sign;
    this.mount();

    this.corner.replaceChildren(
      el('strong', '', this.open ? 'Blick zu' : 'Blick'),
      el('small', '', WATCH_SEATS.find((one) => one.id === this.state.seat)?.label ?? ''),
    );
    this.corner.setAttribute('aria-pressed', this.open ? 'true' : 'false');
    this.notes.hidden = !this.open;
    if (!this.open) return;

    const parts: HTMLElement[] = [head('Wessen Platz?', 'nur sehen')];
    parts.push(
      grid(
        WATCH_SEATS.map((entry) => ({
          ...entry,
          key: 'watchSeat',
          on: entry.id === this.state.seat,
        })),
      ),
    );
    // **„Wem folgen?" gehört zum Deck.** Auf einem fremden Platz führt die
    // Kamera nicht mehr der Zuschauer, sondern die Rolle, der er zusieht.
    if (this.state.seat === 'deck') {
      parts.push(head('Wem folgen?'));
      parts.push(
        grid(
          WATCH_FOLLOWS.map((entry) => ({
            ...entry,
            key: 'watchFollow',
            on: entry.id === this.state.follow,
          })),
        ),
      );
    }

    const insight = el(
      'button',
      `role__watch-key role__watch-key--wide${this.state.insight ? ' is-active' : ''}`,
    );
    insight.dataset['watchInsight'] = '';
    insight.setAttribute('aria-pressed', this.state.insight ? 'true' : 'false');
    insight.append(
      el('strong', '', `KI-Absichten: ${this.state.insight ? 'an' : 'aus'}`),
      el(
        'small',
        '',
        'Wo das Monster den Techniker vermutet, wohin es ihn laufen sieht und an welcher Tür es ihn abfangen will — mit beiden Ankunftszeiten.',
      ),
    );
    parts.push(head('KI-Absichten', 'nur für Zuschauer'), insight);

    parts.push(
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
    this.notes.replaceChildren(...parts);
  }

  dispose(): void {
    this.view?.dispose();
    this.view = null;
    this.element.remove();
  }
}

/** Eine Reihe Wahlknöpfe: Name groß, Zeile klein, einer davon leuchtet. */
function grid(
  entries: ReadonlyArray<{ id: string; label: string; hint: string; key: string; on: boolean }>,
): HTMLElement {
  const box = el('div', 'role__watch-grid');
  for (const entry of entries) {
    const key = el('button', `role__watch-key${entry.on ? ' is-active' : ''}`);
    key.dataset[entry.key] = entry.id;
    key.setAttribute('aria-pressed', entry.on ? 'true' : 'false');
    key.append(el('strong', '', entry.label), el('small', '', entry.hint));
    box.append(key);
  }
  return box;
}

/** Eine Zwischenüberschrift mit einer kleinen Beisage rechts. */
function head(title: string, aside = ''): HTMLElement {
  const node = el('h2', 'role__h');
  node.append(el('span', '', title));
  if (aside) node.append(el('span', 'role__h-aside', aside));
  return node;
}

function note(tone: 'warn' | 'live' | 'calm', title: string, text: string): HTMLElement {
  const node = el('div', `role__note is-${tone}`);
  node.append(el('strong', '', title), el('span', '', text));
  return node;
}
