import {
  DEFAULT_APPEARANCE,
  appearance,
  appearanceSummary,
  saveAppearance,
  type Appearance,
} from '../core/appearance';
import { HEADGEAR_LABELS, HEADGEAR_SUBS, WARDROBE_HATS } from '../core/headgear';
import { FACE_KINDS, FACE_LABELS, FACE_SUBS } from '../core/figureParts';
import { FIGURE_PRESETS, figureLabel } from '../core/avatarFigures';
import type { MenuEntry } from './menu';

/**
 * **Das Aussehen im Menü hinter `Tab`** — Kacheln statt Pfeilen.
 *
 * Gewünscht: _„beim menü aussehen anpassen, bitte auch das menü voll machen.
 * Und zudem will ich dass es in dem tab menü eingebunden bleibt […] nur dass
 * dann der button ‚Aussehen speichern' ist, und aussehen zurücksetzen als
 * button noch."_ — und darin zuerst zwei Kacheln, **Vorgefertigte** und
 * **Customizing**, und im Customizing je Bereich wieder Kacheln, jede mit dem
 * Stück selbst als Vorschau.
 *
 * Bis dahin war es ein Kasten über dem Inventar mit drei Zeilen ‹ und ›
 * (die alte Umkleide am Schirm). Jetzt ist es eine Unterseite des Reiters
 * _Inventar_ (`OUTFIT_PAGE`, `MenuEntry.hidden`), also Vollbild wie alles im
 * Menü, und die Figur rechts bleibt stehen (`ui/PlayerCard.ts`).
 *
 * **Vorgefertigt sind die Figuren** (`core/avatarFigures.FIGURE_PRESETS`):
 * fertige Gestalten aus dem Regal, die ihre eigene Haut mitbringen — alle
 * aus den Figurenpaketen. **Customizing ist, was eine Figur dazu trägt**: der
 * Hut, der auf jedem Kopfknochen sitzt, und — getrennt davon — der Kopf einer
 * anderen Figur (`core/figureParts.ts`). Kopf und Jacke gab es hier nur für
 * den Koch aus zwei Kugeln, und den gibt es als Wahl nicht mehr (gewünscht:
 * _„Ich will den originalen charakter nicht mehr haben"_).
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
    preview: `${OUTFIT_PREVIEW}${slot}:${value}`,
    // Markiert ist, was die Figur gerade trägt.
    selected: look[slot] === value,
    run: () => {
      draft.set(patch);
      picked();
    },
  });

  const hats = WARDROBE_HATS.map((kind) =>
    item('hat', kind, HEADGEAR_LABELS[kind], HEADGEAR_SUBS[kind], { hat: kind }),
  );
  const faces = FACE_KINDS.map((kind) =>
    item('face', kind, FACE_LABELS[kind], FACE_SUBS[kind], { face: kind }),
  );
  const figures = FIGURE_PRESETS.map((kind) =>
    item('figure', kind.path, kind.label, kind.sub, { figure: kind.path }),
  );
  const hatPreview = `${OUTFIT_PREVIEW}hat:${look.hat}`;
  const facePreview = `${OUTFIT_PREVIEW}face:${look.face}`;

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
        preview: `${OUTFIT_PREVIEW}figure:${look.figure}`,
        grid: true,
        take: false,
        children: figures,
      },
      {
        id: `${OUTFIT_PAGE}:custom`,
        label: 'Customizing',
        caption: 'Was die Figur dazu trägt',
        icon: 'npc',
        accent: ACCENT,
        preview: hatPreview,
        grid: true,
        take: false,
        children: [
          {
            id: `${OUTFIT_PAGE}:hat`,
            label: 'Hut',
            caption: HEADGEAR_LABELS[look.hat],
            icon: 'npc',
            accent: ACCENT,
            preview: hatPreview,
            grid: true,
            take: false,
            children: hats,
          },
          {
            id: `${OUTFIT_PAGE}:face`,
            label: 'Kopf',
            caption: FACE_LABELS[look.face],
            icon: 'npc',
            accent: ACCENT,
            preview: facePreview,
            grid: true,
            take: false,
            children: faces,
          },
        ],
      },
    ],
  };
}
