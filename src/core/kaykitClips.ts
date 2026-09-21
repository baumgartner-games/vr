/**
 * **Die Bewegungen der Figuren** — welche Datei sie hergibt, und wie sie in
 * einem Auswahlfeld heißen.
 *
 * Auf der Detailseite eines Modells (`ui/PageDetail.ts`) soll man bei einer
 * Figur die Animation wählen können: „bei Charakteren will ich die Animation
 * auswählen können (Idle, Running, was diese eben noch so anbieten)". Der
 * Haken daran ist, dass eine Figur der Sammlung **keine** Animation mitbringt:
 * Nachgezählt über alle 4470 Dateien haben 78 ein Skelett, aber nur 14 eine
 * Animationsspur — und diese vierzehn sind die **Bibliotheken** in
 * `character-animations/animations/`, nicht die Figuren selbst. KayKit liefert
 * die Bewegungen einmal je Skelett und die Figuren dazu.
 *
 * **Das ist kein Problem, sondern der Entwurf**, denn alle Figuren stehen auf
 * denselben zwei Skeletten mit denselben 23 Knochen (`root`, `hips`, `spine`,
 * …). Ein `AnimationMixer` bindet eine Spur über den **Namen** des Knotens;
 * eine Spur aus `Rig_Medium_General.glb` passt deshalb auf jede Figur der
 * Sammlung, ohne dass irgendetwas umgerechnet werden müsste.
 *
 * Reine Zeichenketten und Zahlen — der Lader steht in `core/kaykitModel.ts`,
 * und was hier drinsteht, prüft ein Test gegen die wirklichen Dateien
 * (`kaykitClips.test.ts`).
 */

/** Die beiden Skelette der Sammlung. */
export type KaykitRig = 'medium' | 'large';

/**
 * **Woran eine Figur ihr Skelett erkennt: an ihrer Höhe.**
 *
 * Am Dateinamen geht es nicht. `Barbarian_Large.glb` sagt es zwar, aber
 * `Skeleton_Golem.glb` (4,23 hoch) und `FrostGolem.glb` (4,16) stehen ebenso
 * auf dem großen Skelett, ohne es im Namen zu tragen — wer nach `_Large`
 * suchte, gäbe den beiden die Bewegungen des kleinen Skeletts.
 *
 * An der Höhe geht es dagegen sauber, und zwar mit großem Abstand:
 * Nachgemessen ist das mittlere Skelett 2,20 hoch (`Mannequin_Medium`, der
 * Ritter 2,54, der Skelett-Krieger 2,59), das große 3,98 (`Mannequin_Large`,
 * der Barbar 4,14, der Skelett-Golem 4,23). Zwischen 2,6 und 4,0 liegt nichts,
 * also liegt die Grenze in der Mitte.
 *
 * **Gemessen wird in den Maßen der Quelle**, nicht in Metern: Der Maßstab des
 * Pakets (`core/kaykitFit.ts`) kommt erst danach darüber, und er ist für alle
 * Figurenpakete derselbe.
 */
export const KAYKIT_LARGE_RIG = 3.2;

export function kaykitRigOf(height: number): KaykitRig {
  return Number.isFinite(height) && height >= KAYKIT_LARGE_RIG ? 'large' : 'medium';
}

/**
 * **Welche Dateien die Bewegungen für eine Vorschau hergeben** — zwei je
 * Skelett und nicht alle.
 *
 * Es gibt mehr: Nahkampf, Fernkampf, Werkzeuge, Simulation, Spezielles —
 * zusammen 2,8 MB für das mittlere Skelett allein. Eine Vorschau im Katalog
 * ist aber kein Animationsbrowser; gefragt war „Idle, Running", und genau die
 * beiden Dateien bringen das: `General` hat das Stehen (und das Sterben),
 * `MovementBasic` das Gehen, Laufen und Springen. Das sind 560 kB für das
 * mittlere Skelett und 340 kB für das große — einmal je Sitzung, und danach
 * liegen sie im Speicher des Browsers wie jedes andere Modell des Regals
 * (`core/kaykitModel.ts`, keine Build-Nummer an dieser Adresse).
 *
 * Wer mehr will, trägt hier eine Datei nach; der Test daneben prüft, dass
 * jede davon wirklich im Regal liegt.
 */
export const KAYKIT_CLIP_FILES: Readonly<Record<KaykitRig, readonly string[]>> = {
  medium: [
    'character-animations/animations/rig-medium/Rig_Medium_General.glb',
    'character-animations/animations/rig-medium/Rig_Medium_MovementBasic.glb',
  ],
  large: [
    'character-animations/animations/rig-large/Rig_Large_General.glb',
    'character-animations/animations/rig-large/Rig_Large_MovementBasic.glb',
  ],
};

/** Die Dateien zum Skelett einer Figur dieser Höhe. */
export function kaykitClipFiles(height: number): readonly string[] {
  return KAYKIT_CLIP_FILES[kaykitRigOf(height)];
}

/**
 * **Wie eine Spur im Auswahlfeld heißt.**
 *
 * `Idle_A` wird zu `Idle A`, `Melee_1H_Slash` zu `Melee 1H Slash`. Mehr
 * passiert nicht: Die Namen sind die des Zeichners, und ein `T-Pose`, das hier
 * zu `T Pose` würde, wäre eine Korrektur, um die niemand gebeten hat — dieselbe
 * Zurückhaltung wie bei den Dateinamen (`core/kaykitIndex.humanLabel`).
 */
export function clipLabel(name: string): string {
  return name.split('_').filter(Boolean).join(' ').trim();
}

/**
 * **Die Liste fürs Auswahlfeld** — aus allem, was die Dateien hergeben.
 *
 * Drei Dinge passieren dabei, und jedes einzelne sieht man sonst erst im
 * offenen Feld:
 *
 * - **Leeres fällt weg.** Eine Spur ohne Namen wäre eine Zeile ohne Text.
 * - **Doppeltes fällt weg.** `General` und `MovementBasic` bringen beide eine
 *   `T-Pose` mit, und zweimal dieselbe Zeile ist keine Auswahl.
 * - **Sortiert wird nach Namen**, mit Zahlen als Zahlen — sonst stünde
 *   `Idle_B` vor `Idle_A`, je nachdem, welche Datei zuerst ankam.
 */
export function clipList(names: Iterable<string>): string[] {
  const seen = new Set<string>();
  for (const raw of names) {
    const name = typeof raw === 'string' ? raw.trim() : '';
    if (name.length > 0) seen.add(name);
  }
  return [...seen].sort((a, b) =>
    clipLabel(a).localeCompare(clipLabel(b), 'de', { numeric: true, sensitivity: 'base' }),
  );
}
