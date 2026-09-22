import { FIGURE_ACTIONS, GAIT_CLIPS, pickClip, type FigureGait } from '../../core/kaykitFigureFit';
import type { NpcSkin } from './npcKinds';

/**
 * **Welche Bewegung ein NPC aus dem Regal gerade spielt** — die Rechnung
 * dazu, ohne three.js.
 *
 * Der Lader (`core/kaykitFigure.ts`) kann selbst entscheiden, welche Spur zu
 * welchem Tempo gehört (`KaykitFigure.gait`), und für alles, was einfach nur
 * laufen soll, ist das richtig. Ein **NPC** ist aber nicht einfach nur eine
 * Figur: Ein Zombie steht anders da als eine Übungspuppe, und die Sammlung
 * hat dafür keine zweite Figur, sondern nur eine zweite **Spur**
 * (`NpcSkin.gaits`). Wer die Wahl trifft, ist deshalb die Haut — und die
 * Wahl selbst ist eine Liste von Namen, also reine Rechnung mit Test.
 *
 * Diese Datei kennt three.js nicht und darf es nicht kennen: `NpcBody.ts`
 * holt den Lader dynamisch und nur hinter `canLoadModels()`, und was hier
 * steht, muss in Jest laufen.
 */

/**
 * **Die Wunschliste einer Haut für einen Gang** — ihre eigenen Namen zuerst,
 * danach die allgemeinen.
 *
 * Angehängt und nicht ersetzt, und das ist der ganze Zweck der Reihenfolge:
 * Eine Haut sagt, was sie **lieber** hätte, und nicht, was sie als Einziges
 * nimmt. Der Zombie will `Walking_C`; auf dem großen Skelett gibt es nur
 * `Walking_A`, und dann geht er eben damit — eine Figur, die gar nicht geht,
 * weil ihr Skelett einen Wunschnamen nicht kennt, wäre der teuerste Weg,
 * einen Geschmack durchzusetzen.
 *
 * Doppelte fallen weg: `pickClip` liest die Liste von vorn, und derselbe Name
 * zweimal ist nur eine Zeile mehr.
 */
export function figureGaitClips(skin: NpcSkin, gait: FigureGait): readonly string[] {
  const wanted = skin.gaits?.[gait];
  if (!wanted || wanted.length === 0) return GAIT_CLIPS[gait];
  return [...new Set([...wanted, ...GAIT_CLIPS[gait]])];
}

/**
 * **Die Spur, die es wirklich gibt** — der erste Wunsch, den dieses Skelett
 * kennt, oder `null`.
 *
 * `names` sind die Spuren der geladenen Figur (`KaykitFigure.clips`). `null`
 * ist ein gültiger Ausgang und heißt: Die Figur bleibt stehen, wie sie steht
 * — dieselbe Zurückhaltung wie im Lader.
 */
export function figureGaitClip(
  skin: NpcSkin,
  gait: FigureGait,
  names: Iterable<string>,
): string | null {
  return pickClip(names, figureGaitClips(skin, gait));
}

/**
 * **Und die Spur für einen Schlag.**
 *
 * Sie steht hier und nicht im Lader (`KaykitFigure.act`), weil der NPC sie
 * selbst abspielt: Er muss wissen, **wie lange** sie dauert, um danach in
 * seinen Gang zurückzukehren — und das sagt nur die Spur selbst
 * (`AnimationClip.duration`). `act()` gibt sie nicht heraus, `play()` schon.
 */
export function figureStrikeClip(names: Iterable<string>): string | null {
  return pickClip(names, FIGURE_ACTIONS.attack);
}
