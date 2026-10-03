import { saveAppearance, type Appearance } from '../core/appearance';
import { HEADGEAR_LABELS, HEADGEAR_SUBS, WARDROBE_HATS } from '../core/headgear';
import { BODY_KINDS, BODY_LABELS, BODY_SUBS } from '../core/avatarLook';
import { FACE_KINDS, FACE_LABELS, FACE_SUBS } from '../core/figureParts';
import { FIGURE_PATHS, figureLabel, figureSub } from '../core/avatarFigures';

/**
 * **Die vier Zeilen der Umkleide** — Kopf, Hut, Körper, Figur, jede mit ‹ und ›.
 *
 * Sie stehen hier und nicht in der Umkleide selbst, und zwar aus demselben
 * Grund, aus dem `init`/`step` einer Einbau-Art rein sind: Was eine Zeile
 * schaltet, ist eine Rechnung über drei Listen, und die kann man in
 * Millisekunden prüfen. Was daraus für ein Knopf wird — DOM am Bildschirm
 * (früher `WardrobeMenu.ts`), Menüzeile am Handgelenk (`App.appearanceMenu`) —, ist
 * eine zweite Frage.
 *
 * **Gespeichert wird sofort.** Es gibt kein _Übernehmen_: Jeder Schritt ruft
 * `saveAppearance`, der eigene Körper und das Netz hören ohnehin zu
 * (`onAppearanceChange`). Ein Umkleidemenü mit einem Abbrechen wäre eines, in
 * dem man vor dem Spiegel steht und die Änderung nicht sieht.
 */

/** Welche der vier Zeilen — und zugleich das Feld in `Appearance`. */
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
 * Die vier Zeilen zu einem Aussehen.
 *
 * `look` wird hereingereicht und nicht hier gelesen: Die Umkleide zeichnet
 * sich nach jeder Änderung neu, und dann soll sie das Aussehen zeigen, das sie
 * gerade bekommen hat — und nicht eines, das sie sich nebenher noch einmal aus
 * dem Speicher holt.
 *
 * **Die Figur steht hinten**, obwohl sie das Meiste entscheidet. Das ist
 * Absicht und eine Abschrift: Das Regal im Konstrukt stellt seine Stücke in
 * derselben Reihenfolge hin (`worlds/shared/wardrobeRack.ts`), und zwei
 * Umkleiden, die dieselben Sachen verschieden sortieren, driften nach der
 * zweiten neuen Mütze auseinander. Wer eine Figur aus dem Regal trägt, an dem
 * wirken die Zeilen _Kopf_ und _Körper_ nicht mehr — sie bleiben trotzdem
 * stehen, denn sie gelten wieder, sobald jemand zum Koch zurückschaltet.
 */
export function wardrobeRows(look: Appearance): WardrobeRow[] {
  return [
    {
      // **Der Kopf ist der einer Figur aus dem Regal** (`Appearance.face`) und
      // nicht mehr das Gesicht des gebauten Kochs — den gibt es als Wahl nicht
      // mehr, und auf eine Figur wirkte dessen Gesicht ohnehin nie.
      slot: 'face',
      label: 'Kopf',
      value: FACE_LABELS[look.face],
      sub: FACE_SUBS[look.face],
      index: FACE_KINDS.indexOf(look.face),
      count: FACE_KINDS.length,
      step: (delta) => saveAppearance({ face: around(FACE_KINDS, look.face, delta) }),
    },
    {
      // Nur, was die Umkleide anbietet (`WARDROBE_HATS`): Ein geliehener oder
      // alter Hut steht bei `-1`, und das nächste › bringt ihn an den Anfang.
      slot: 'hat',
      label: 'Hut',
      value: HEADGEAR_LABELS[look.hat],
      sub: HEADGEAR_SUBS[look.hat],
      index: WARDROBE_HATS.indexOf(look.hat),
      count: WARDROBE_HATS.length,
      step: (delta) => saveAppearance({ hat: around(WARDROBE_HATS, look.hat, delta) }),
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
    {
      slot: 'figure',
      label: 'Figur',
      value: figureLabel(look.figure),
      sub: figureSub(look.figure),
      // **Eine fremde Figur steht nicht in der Liste**, und dann zählt sie
      // auch nicht mit: Wer über die Detailseite des Regals einen Zombie
      // angezogen hat, steht hier bei `-1` von 12 — und das nächste ›
      // bringt ihn zum Anfang der kuratierten Liste zurück (`around`).
      index: FIGURE_PATHS.indexOf(look.figure),
      count: FIGURE_PATHS.length,
      step: (delta) => saveAppearance({ figure: around(FIGURE_PATHS, look.figure, delta) }),
    },
  ];
}
