import type { WorldDefinition } from '../core/types';
import type { HintItem } from '../core/controlHints';
import {
  formatSeen,
  parseSeen,
  shouldShowIntro,
  worldIntro,
  type IntroGate,
} from '../core/worldIntro';
import './worldTransit.css';

/**
 * **Die Willkommens-Karte** — beim ersten Betreten einer Welt oben in der
 * Mitte: Name, was man hier tut, der erste Schritt und die Knöpfe dazu
 * (`core/worldIntro.ts` rechnet, was darin steht).
 *
 * Sie geht **von selbst** nach `SHOW_MS` wieder, mit dem Knopf _Verstanden_
 * sofort — und in beiden Fällen ist die Welt danach begrüßt und kommt nicht
 * wieder (gemerkt im Browser, `bgvr.welcomed`). Wer gar keine will, schaltet
 * sie unter _Menü → Steuerung & Hilfe → Eingaben → Willkommen je Welt_ aus.
 *
 * Gefragt wird **jedes Bild** (`App.updateHints`), ob sie jetzt dran ist:
 * Die erste Welt lädt, während noch die Startseite davorsteht, und die Karte
 * soll kommen, wenn man die Welt **sieht** — nicht, wenn sie fertig ist.
 */
export class WorldWelcome {
  readonly element: HTMLElement;
  private readonly title: HTMLElement;
  private readonly goal: HTMLElement;
  private readonly first: HTMLElement;
  private readonly keys: HTMLElement;
  private current = '';
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(host: HTMLElement = document.body) {
    this.element = document.createElement('section');
    this.element.className = 'welcome';
    this.element.hidden = true;
    this.element.setAttribute('role', 'status');
    this.element.setAttribute('aria-live', 'polite');

    const head = document.createElement('div');
    head.className = 'welcome__head';
    const kicker = document.createElement('p');
    kicker.className = 'welcome__kicker';
    kicker.textContent = 'Willkommen';
    this.title = document.createElement('h2');
    this.title.className = 'welcome__title';
    head.append(kicker, this.title);

    this.goal = document.createElement('p');
    this.goal.className = 'welcome__goal';
    this.first = document.createElement('p');
    this.first.className = 'welcome__first';
    this.keys = document.createElement('div');
    this.keys.className = 'welcome__keys';

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'welcome__ok';
    close.textContent = 'Verstanden';
    close.addEventListener('click', () => this.dismiss());

    this.element.append(head, this.goal, this.first, this.keys, close);
    host.append(this.element);
  }

  /** Steht sie gerade da? */
  get open(): boolean {
    return !this.element.hidden;
  }

  /**
   * Ein Bild: kommt sie jetzt, bleibt sie, oder muss sie weg? `keys` wird nur
   * gerufen, wenn sie wirklich aufgeht — die Knöpfe gelten für das Gerät, mit
   * dem in diesem Augenblick bedient wird.
   */
  update(
    world: WorldDefinition | null,
    visible: boolean,
    keys: (tips: NonNullable<ReturnType<typeof worldIntro>>['tips']) => HintItem[],
  ): void {
    const id = world?.id ?? '';
    if (this.open && (id !== this.current || !visible)) {
      // Die Welt ist weg oder verdeckt (Menü, Brille): Die Karte geht mit, und
      // die Welt bleibt begrüßt — sie stand ja schon da.
      this.hide();
    }
    if (this.open || !world) return;
    const gate: IntroGate = { world: id, visible, enabled: welcomeOn(), seen: seenWorlds() };
    if (!shouldShowIntro(gate)) return;
    const intro = worldIntro(id)!;
    this.current = id;
    this.element.style.setProperty(
      '--welcome-accent',
      `#${world.accent.toString(16).padStart(6, '0')}`,
    );
    this.title.textContent = world.title;
    this.goal.textContent = intro.goal;
    this.first.textContent = intro.first ?? '';
    this.first.hidden = !intro.first;
    this.keys.replaceChildren(...keys(intro.tips).map(chip));
    this.keys.hidden = this.keys.childElementCount === 0;
    this.element.hidden = false;
    requestAnimationFrame(() => this.element.classList.add('is-open'));
    markSeen(id);
    this.timer = setTimeout(() => this.dismiss(), SHOW_MS);
  }

  /** Weg damit — _Verstanden_, `Esc`, oder die Zeit ist um. */
  dismiss(): void {
    if (!this.open) return;
    this.element.classList.remove('is-open');
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.hide(), 260);
  }

  private hide(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.element.hidden = true;
    this.element.classList.remove('is-open');
    this.current = '';
  }

  dispose(): void {
    this.hide();
    this.element.remove();
  }
}

/** So lange steht sie, wenn niemand etwas tut — lang genug für drei Zeilen. */
const SHOW_MS = 9000;

function chip(item: HintItem): HTMLElement {
  const node = document.createElement('span');
  node.className = 'hints__item';
  const key = document.createElement('kbd');
  key.className = 'hints__key';
  key.textContent = item.key;
  node.append(key, document.createTextNode(item.label));
  return node;
}

// --- die Einstellung und das Gedächtnis ---------------------------------------

const ON_KEY = 'bgvr.welcome';
const SEEN_KEY = 'bgvr.welcomed';

function read(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // Ohne Speicher gilt es eben nur bis zum Neuladen.
  }
}

/** Ob die Karte überhaupt kommt — ab Werk ja. */
export function welcomeOn(): boolean {
  return read(ON_KEY) !== '0';
}

export function setWelcomeOn(on: boolean): void {
  write(ON_KEY, on ? '1' : '0');
  // Wer sie wieder einschaltet, will sie auch wieder sehen: Die Liste der
  // begrüßten Welten fängt dann von vorn an.
  if (on) write(SEEN_KEY, '');
}

function seenWorlds(): Set<string> {
  return parseSeen(read(SEEN_KEY));
}

function markSeen(id: string): void {
  const seen = seenWorlds();
  seen.add(id);
  write(SEEN_KEY, formatSeen(seen));
}
