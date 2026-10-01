import {
  DEFAULT_APPEARANCE,
  appearance,
  appearanceSummary,
  saveAppearance,
  type Appearance,
} from '../core/appearance';
import { HEADGEAR_KINDS, HEADGEAR_LABELS, HEADGEAR_SUBS } from '../core/headgear';
import {
  BODY_KINDS,
  BODY_LABELS,
  BODY_SUBS,
  HEAD_KINDS,
  HEAD_LABELS,
  HEAD_SUBS,
} from '../core/avatarLook';
import { FIGURE_CHEF, FIGURE_KINDS, figureLabel } from '../core/avatarFigures';
import type { MenuEntry } from './menu';

/**
 * **Das Aussehen im Menü hinter `Tab`** — Kacheln statt Pfeilen.
 *
 * Gewünscht: _„beim menü aussehen anpassen, bitte auch das menü voll machen.
 * Und zudem will ich dass es in dem tab menü eingebunden bleibt […] nur dass
 * dann der button ‚Aussehen speichern' ist, und aussehen zurücksetzen als
 * button noch."_ — und darin zuerst zwei Kacheln, **Vorgefertigte** und
 * **Customizing**, und im Customizing je Bereich (_Kopf_, _Hut_, _Körper_)
 * wieder Kacheln, jede mit dem Stück selbst als Vorschau.
 *
 * Bis dahin war es ein Kasten über dem Inventar mit drei Zeilen ‹ und ›
 * (die alte Umkleide am Schirm). Jetzt ist es eine Unterseite des Reiters
 * _Inventar_ (`OUTFIT_PAGE`, `MenuEntry.hidden`), also Vollbild wie alles im
 * Menü, und die Figur rechts bleibt stehen (`ui/PlayerCard.ts`).
 *
 * **Vorgefertigt sind die Figuren** (`core/avatarFigures.ts`): fertige
 * Gestalten, die ihre eigene Haut mitbringen. **Customizing ist der Koch**,
 * aus Kopf, Hut und Jacke zusammengesetzt. Wer im Customizing einen Kopf oder
 * eine Jacke wählt, wird deshalb wieder zum Koch — sonst wählte er etwas, das
 * an seiner Figur gar nicht wirkt. Der Hut wirkt auf jeder Figur (er sitzt auf
 * ihrem Kopfknochen) und lässt sie, wie sie ist.
 *
 * **Gespeichert wird erst mit _Aussehen speichern_** (`OutfitDraft`). Bis
 * dahin ist jede Wahl ein Entwurf, den die Figur daneben schon trägt; wer das
 * Menü zumacht oder zurück ins Inventar geht, verwirft ihn.
 */

/** Die Id der Seite unter dem Reiter _Inventar_. */
export const OUTFIT_PAGE = 'outfit';

/** Vorschau-Ids der Kacheln: `outfit:<Fach>:<Wert>` (`ui/outfitModels.ts`). */
export const OUTFIT_PREVIEW = 'outfit:';

/** Die Farbe der Seite — dieselbe wie die Figur im Inventar. */
const ACCENT = 0x5ee0a0;

/**
 * **Die Vorschau des Kochs in genau dieser Zusammenstellung.** Die Kachel
 * behält ein Modell, solange sich seine Id nicht ändert (`PagePreviews`) —
 * stünde hier nur „der Koch", zeigte sie nach jeder Wahl den alten.
 */
export function chefPreview(look: Appearance): string {
  return `${OUTFIT_PREVIEW}look:${look.head}|${look.hat}|${look.body}`;
}

/** Ob eine Seite zum Aussehen gehört — dann zeigt die Figur Speichern und Zurücksetzen. */
export function isOutfitPage(id: string): boolean {
  return id === OUTFIT_PAGE || id.startsWith(`${OUTFIT_PAGE}:`);
}

/**
 * **Der Entwurf** — was die Figur daneben trägt, solange es nicht gespeichert
 * ist.
 *
 * Ohne Entwurf gilt, was gespeichert ist (`appearance()`). Gespeichert wird
 * nur über `save`; `reset` stellt die Auslieferung in den Entwurf
 * (`DEFAULT_APPEARANCE`) — gespeichert ist sie damit noch nicht, und wer es
 * sich anders überlegt, macht einfach zu.
 */
export class OutfitDraft {
  private look: Appearance | null = null;
  private readonly listeners = new Set<() => void>();

  /** Was gerade gezeigt wird: der Entwurf, sonst das Gespeicherte. */
  get current(): Appearance {
    return this.look ?? appearance();
  }

  /** Ob es etwas zu speichern gibt. */
  get dirty(): boolean {
    if (!this.look) return false;
    const saved = appearance();
    return (Object.keys(saved) as (keyof Appearance)[]).some(
      (key) => saved[key] !== this.look![key],
    );
  }

  /** Ein Stück anprobieren — nur im Entwurf. */
  set(patch: Partial<Appearance>): void {
    this.look = { ...this.current, ...patch };
    this.changed();
  }

  /** Die Auslieferung in den Entwurf. */
  reset(): void {
    this.look = { ...DEFAULT_APPEARANCE };
    this.changed();
  }

  /** Den Entwurf speichern — danach gilt er für alle (`onAppearanceChange`). */
  save(): Appearance {
    const look = this.current;
    this.look = null;
    const saved = saveAppearance(look);
    this.changed();
    return saved;
  }

  /** Den Entwurf wegwerfen. */
  discard(): void {
    if (!this.look) return;
    this.look = null;
    this.changed();
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private changed(): void {
    for (const listener of this.listeners) listener();
  }
}

/**
 * **Die Seite _Aussehen_** — zwei Kacheln, darunter die Fächer.
 *
 * `picked` wird nach jeder Wahl gerufen: Der Baum ist eine Momentaufnahme und
 * muss neu gebaut werden, damit die gewählte Kachel markiert ist.
 */
export function outfitEntry(draft: OutfitDraft, picked: () => void): MenuEntry {
  const look = draft.current;
  const chef = look.figure === FIGURE_CHEF;

  const item = (
    slot: keyof Appearance,
    value: string,
    label: string,
    sub: string,
    patch: Partial<Appearance>,
  ): MenuEntry => ({
    id: `${OUTFIT_PREVIEW}${slot}:${value}`,
    label,
    caption: sub,
    icon: 'npc',
    accent: ACCENT,
    preview:
      slot === 'figure' && value === FIGURE_CHEF
        ? chefPreview(look)
        : `${OUTFIT_PREVIEW}${slot}:${value}`,
    // Markiert ist, was die Figur gerade trägt. Kopf und Jacke wirken nur am
    // Koch — an einer fertigen Figur ist dort nichts gewählt.
    selected: look[slot] === value && (slot === 'hat' || slot === 'figure' || chef),
    run: () => {
      draft.set(patch);
      picked();
    },
  });

  // Ein Fach zeigt auf seiner Kachel, was darin gerade gewählt ist.
  const section = (
    slot: keyof Appearance,
    label: string,
    value: string,
    children: MenuEntry[],
  ): MenuEntry => ({
    id: `${OUTFIT_PAGE}:${slot}`,
    label,
    caption: value,
    icon: 'npc',
    accent: ACCENT,
    preview: `${OUTFIT_PREVIEW}${slot}:${look[slot]}`,
    grid: true,
    take: false,
    children,
  });

  const heads = HEAD_KINDS.map((kind) =>
    item('head', kind, HEAD_LABELS[kind], HEAD_SUBS[kind], { head: kind, figure: FIGURE_CHEF }),
  );
  const hats = HEADGEAR_KINDS.map((kind) =>
    item('hat', kind, HEADGEAR_LABELS[kind], HEADGEAR_SUBS[kind], { hat: kind }),
  );
  const bodies = BODY_KINDS.map((kind) =>
    item('body', kind, BODY_LABELS[kind], BODY_SUBS[kind], { body: kind, figure: FIGURE_CHEF }),
  );
  const figures = FIGURE_KINDS.map((kind) =>
    item('figure', kind.path, kind.label, kind.sub, { figure: kind.path }),
  );

  return {
    id: OUTFIT_PAGE,
    label: 'Aussehen',
    sub: appearanceSummary(look),
    icon: 'npc',
    accent: ACCENT,
    hidden: true,
    grid: true,
    take: false,
    children: [
      {
        id: `${OUTFIT_PAGE}:presets`,
        label: 'Vorgefertigte',
        caption: `Fertige Figuren · ${figureLabel(look.figure)}`,
        icon: 'npc',
        accent: ACCENT,
        // Die Figur, die man trägt — und als Koch die erste fertige: Den Koch
        // zeigt schon die Kachel daneben, und zwei Kacheln mit derselben
        // Vorschau bekämen nur eine (`PagePreviews` sammelt nach Id).
        preview: `${OUTFIT_PREVIEW}figure:${chef ? (FIGURE_KINDS.find((kind) => kind.path !== FIGURE_CHEF)?.path ?? FIGURE_CHEF) : look.figure}`,
        grid: true,
        take: false,
        children: figures,
      },
      {
        id: `${OUTFIT_PAGE}:custom`,
        label: 'Customizing',
        caption: 'Kopf, Hut und Körper selbst wählen',
        icon: 'npc',
        accent: ACCENT,
        preview: chefPreview(look),
        grid: true,
        take: false,
        children: [
          section('head', 'Kopf', HEAD_LABELS[look.head], heads),
          section('hat', 'Hut', HEADGEAR_LABELS[look.hat], hats),
          section('body', 'Körper', BODY_LABELS[look.body], bodies),
        ],
      },
    ],
  };
}
