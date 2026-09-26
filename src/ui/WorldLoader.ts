import type { WorldDefinition } from '../core/types';
import {
  LOADER_MIN_MS,
  creep,
  loadLine,
  transitKicker,
  type LoadPhase,
  type LoadState,
} from '../core/loadProgress';
import './worldTransit.css';

/**
 * **Der Ladebildschirm beim Weltwechsel** — Bild, Name und Zeile der Zielwelt,
 * darunter ein Balken, der sagt, wie weit es ist (`core/loadProgress.ts`).
 *
 * Bis dahin war ein Wechsel aus dem Menü ein harter Schnitt: Die alte Welt
 * stand still, bis die neue fertig war, und das Einzige, was „es lädt" sagte,
 * war eine Zeile am Handgelenk-Menü — am Schirm also nichts. Auf einer
 * Mobilfunkleitung waren das Sekunden, in denen die Seite aussah wie
 * abgestürzt.
 *
 * Jetzt blendet der Schirm über (`is-open`, 180 ms), hält mindestens
 * `LOADER_MIN_MS` — damit eine Welt aus dem Speicher nicht als Blitz
 * vorbeizieht —, wartet auf die Modelle der neuen Welt (höchstens
 * `LOADER_CAP_MS`, gezählt in `App.goTo`) und blendet dann aus.
 *
 * **Nur am Schirm und nur im Spiel.** In der Brille gibt es kein DOM im Bild,
 * und auf der Startseite hat das Laden seinen eigenen Platz (der Knopf sagt
 * „Lädt … 17 %"); dort ruft `App` diese Klasse gar nicht erst.
 */
export class WorldLoader {
  readonly element: HTMLElement;
  private readonly image: HTMLImageElement;
  private readonly title: HTMLElement;
  /** Die Zeile über dem Namen: _Nächste Welt_ — oder _Wird neu aufgebaut_. */
  private readonly kicker: HTMLElement;
  private readonly tagline: HTMLElement;
  private readonly bar: HTMLElement;
  private readonly line: HTMLElement;
  private state: LoadState = { phase: 'fertig', loaded: 0, total: 0 };
  private shown = 0;
  private openedAt = 0;
  private closing: ReturnType<typeof setTimeout> | null = null;
  private last = 0;

  constructor(
    host: HTMLElement = document.body,
    private readonly base: string = import.meta.env.BASE_URL ?? '/',
  ) {
    this.element = document.createElement('div');
    this.element.className = 'transit';
    this.element.hidden = true;
    this.element.setAttribute('role', 'status');
    this.element.setAttribute('aria-live', 'polite');

    const card = document.createElement('div');
    card.className = 'transit__card';
    this.image = document.createElement('img');
    this.image.className = 'transit__image';
    this.image.alt = '';
    this.image.decoding = 'async';
    const kicker = document.createElement('p');
    kicker.className = 'transit__kicker';
    kicker.textContent = transitKicker(false);
    this.kicker = kicker;
    this.title = document.createElement('h2');
    this.title.className = 'transit__title';
    this.tagline = document.createElement('p');
    this.tagline.className = 'transit__tagline';
    const track = document.createElement('div');
    track.className = 'transit__track';
    this.bar = document.createElement('div');
    this.bar.className = 'transit__bar';
    track.append(this.bar);
    this.line = document.createElement('p');
    this.line.className = 'transit__line';
    card.append(this.image, kicker, this.title, this.tagline, track, this.line);
    this.element.append(card);
    host.append(this.element);
  }

  /** Ob er gerade steht (auch während er ausblendet). */
  get open(): boolean {
    return !this.element.hidden;
  }

  /**
   * Ein Wechsel fängt an — in diese Welt. `again`: Es ist dieselbe Welt noch
   * einmal (_Zurücksetzen_), und dann steht oben nicht _Nächste Welt_.
   */
  begin(world: WorldDefinition, again = false, now = performance.now()): void {
    if (this.closing !== null) {
      clearTimeout(this.closing);
      this.closing = null;
    }
    const accent = `#${world.accent.toString(16).padStart(6, '0')}`;
    this.element.style.setProperty('--transit-accent', accent);
    this.kicker.textContent = transitKicker(again);
    this.title.textContent = world.title;
    this.tagline.textContent = world.tagline;
    if (world.preview) {
      const src = `${this.base}${world.preview}`;
      if (this.image.getAttribute('src') !== src) this.image.src = src;
      this.image.hidden = false;
      this.element.style.setProperty('--transit-image', `url("${src}")`);
    } else {
      this.image.hidden = true;
      this.element.style.removeProperty('--transit-image');
    }
    this.shown = 0;
    this.openedAt = now;
    this.last = now;
    this.set('modul', 0, 0);
    this.element.hidden = false;
    this.element.classList.remove('is-leaving');
    // Ein Bild später, damit die Überblendung auch wirklich eine ist.
    requestAnimationFrame(() => this.element.classList.add('is-open'));
  }

  /** Der Abschnitt wechselt, oder der Zähler der Modelle rückt vor. */
  set(phase: LoadPhase, loaded: number, total: number): void {
    this.state = { phase, loaded, total };
  }

  /** Ein Bild: der Balken kriecht, die Zeile folgt. */
  tick(now = performance.now()): void {
    if (this.element.hidden) return;
    const dt = Math.min(0.25, (now - this.last) / 1000);
    this.last = now;
    this.shown = creep(this.shown, this.state, dt);
    this.bar.style.transform = `scaleX(${this.shown.toFixed(4)})`;
    const text = loadLine(this.state);
    if (this.line.textContent !== text) this.line.textContent = text;
  }

  /**
   * **Fertig** — der Balken läuft voll, und nach der Mindestzeit blendet der
   * Schirm aus. `then` kommt, wenn er weg ist (die Willkommens-Karte wartet
   * darauf, damit nicht zwei Dinge gleichzeitig ins Bild kommen).
   */
  finish(then?: () => void, now = performance.now()): void {
    if (this.element.hidden) {
      then?.();
      return;
    }
    this.set('fertig', 0, 0);
    this.tick(now);
    const wait = Math.max(0, LOADER_MIN_MS - (now - this.openedAt));
    if (this.closing !== null) clearTimeout(this.closing);
    this.closing = setTimeout(() => {
      this.element.classList.remove('is-open');
      this.element.classList.add('is-leaving');
      this.closing = setTimeout(() => {
        this.closing = null;
        this.element.hidden = true;
        this.element.classList.remove('is-leaving');
        then?.();
      }, 320);
    }, wait);
  }

  /** Sofort weg — die Brille geht auf, oder die Ladung ist gescheitert. */
  cancel(): void {
    if (this.closing !== null) clearTimeout(this.closing);
    this.closing = null;
    this.element.hidden = true;
    this.element.classList.remove('is-open', 'is-leaving');
  }

  dispose(): void {
    this.cancel();
    this.element.remove();
  }
}
