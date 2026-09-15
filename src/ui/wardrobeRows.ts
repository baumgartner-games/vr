import { saveAppearance, type Appearance } from '../core/appearance';
import { HEADGEAR_KINDS, HEADGEAR_LABELS, HEADGEAR_SUBS } from '../core/headgear';
import {
  BODY_KINDS,
  BODY_LABELS,
  BODY_SUBS,
  HEAD_KINDS,
  HEAD_LABELS,
  HEAD_SUBS,
} from '../core/avatarLook';

/**
 * **Die drei Zeilen der Umkleide** — Kopf, Hut, Körper, jede mit ‹ und ›.
 *
 * Sie stehen hier und nicht in der Umkleide selbst, und zwar aus demselben
 * Grund, aus dem `init`/`step` einer Einbau-Art rein sind: Was eine Zeile
 * schaltet, ist eine Rechnung über drei Listen, und die kann man in
 * Millisekunden prüfen. Was daraus für ein Knopf wird — DOM am Bildschirm
 * (`WardrobeMenu.ts`), Menüzeile am Handgelenk (`App.appearanceMenu`) —, ist
 * eine zweite Frage.
 *
 * **Gespeichert wird sofort.** Es gibt kein _Übernehmen_: Jeder Schritt ruft
 * `saveAppearance`, der eigene Körper und das Netz hören ohnehin zu
 * (`onAppearanceChange`). Ein Umkleidemenü mit einem Abbrechen wäre eines, in
 * dem man vor dem Spiegel steht und die Änderung nicht sieht.
 */

/** Welche der drei Zeilen — und zugleich das Feld in `Appearance`. */
export type WardrobeSlot = keyof Appearance;

export interface WardrobeRow {
  slot: WardrobeSlot;
  /** Wie die Zeile heißt: _Kopf_, _Hut_, _Körper_. */
  label: string;
  /** Was gerade gewählt ist: _Sommersprossen_, _Kochmütze_, _Kochjacke rot_. */
  value: string;
  /** Der eine Satz dazu — dieselbe Zeile wie im Menü am Handgelenk. */
  sub: string;
  /** Der wievielte von wie vielen — für das kleine `3 / 5` neben den Pfeilen. */
  index: number;
  count: number;
  /**
   * Einen weiter (`+1`) oder einen zurück (`-1`) — **speichert sofort** und
   * gibt zurück, was danach gilt.
   */
  step(delta: number): Appearance;
}

/** Eine Liste im Kreis, in beide Richtungen. */
function around<T>(list: readonly T[], current: T, delta: number): T {
  const at = list.indexOf(current);
  const from = at < 0 ? 0 : at;
  const next = (((from + delta) % list.length) + list.length) % list.length;
  return list[next]!;
}

/**
 * Die drei Zeilen zu einem Aussehen.
 *
 * `look` wird hereingereicht und nicht hier gelesen: Die Umkleide zeichnet
 * sich nach jeder Änderung neu, und dann soll sie das Aussehen zeigen, das sie
 * gerade bekommen hat — und nicht eines, das sie sich nebenher noch einmal aus
 * dem Speicher holt.
 */
export function wardrobeRows(look: Appearance): WardrobeRow[] {
  return [
    {
      slot: 'head',
      label: 'Kopf',
      value: HEAD_LABELS[look.head],
      sub: HEAD_SUBS[look.head],
      index: HEAD_KINDS.indexOf(look.head),
      count: HEAD_KINDS.length,
      step: (delta) => saveAppearance({ head: around(HEAD_KINDS, look.head, delta) }),
    },
    {
      slot: 'hat',
      label: 'Hut',
      value: HEADGEAR_LABELS[look.hat],
      sub: HEADGEAR_SUBS[look.hat],
      index: HEADGEAR_KINDS.indexOf(look.hat),
      count: HEADGEAR_KINDS.length,
      step: (delta) => saveAppearance({ hat: around(HEADGEAR_KINDS, look.hat, delta) }),
    },
    {
      slot: 'body',
      label: 'Körper',
      value: BODY_LABELS[look.body],
      sub: BODY_SUBS[look.body],
      index: BODY_KINDS.indexOf(look.body),
      count: BODY_KINDS.length,
      step: (delta) => saveAppearance({ body: around(BODY_KINDS, look.body, delta) }),
    },
  ];
}
