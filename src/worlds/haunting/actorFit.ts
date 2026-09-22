import { gaitFor } from '../../core/kaykitFigureFit';
import type { MonsterKind } from './mission';

/**
 * **Wer im Schiff einen Körper hat** — und welche Datei aus dem Regal ihn
 * hergibt. Die Rechnung dazu, ohne three.js.
 *
 * Nebenan (`actorArt.ts`) steht der Wrapper, der aus einer dieser Sorten eine
 * Gruppe macht: erst den gebauten Körper (`shipArt.buildCrewmate` /
 * `buildCreature`), und sobald die Datei da ist, die Figur aus dem Regal
 * darüber. Hier steht nur, **welche** Datei das ist, **wie hoch** sie stehen
 * soll und ab wann ein Akteur geht — vier Zeilen Tabelle und eine Schwelle.
 *
 * Eigene Datei aus demselben Grund wie `core/kaykitFigureFit.ts`: Der Lader
 * zieht `GLTFLoader` und `import.meta` mit sich und bringt Jest zum Stehen.
 * Was hier steht, prüft dagegen ein Test — und zwar **gegen die wirklichen
 * Dateien** (`actorFit.test.ts` liest den JSON-Teil der `.glb` selbst). Ein
 * Pfad, der sich verschreibt, ist sonst eine Kreatur, die stumm als gebauter
 * Klotz weiterläuft, und niemand sucht das in einer Pfadliste.
 */

/** Die vier Sorten, die im Schiff herumlaufen: der Techniker und die drei Monster. */
export type ActorKind = 'crew' | MonsterKind;

/** Eine Adresse im Regal und die Höhe, auf die die Figur gebracht wird. */
export interface ActorFigure {
  /** Der Pfad ohne `models/kaykit/` davor — dieselbe Schreibweise wie im Regal. */
  readonly path: string;
  /** Meter, vom Boden bis zum Scheitel. */
  readonly height: number;
}

/**
 * **Welche Figur zu welcher Sorte gehört** — oder `null`, wenn es im Regal
 * kein Gegenstück gibt und der gebaute Körper bleibt.
 *
 * Die Höhen sind nicht erfunden, sondern die der gebauten Körper, die sie
 * ersetzen: Der Crewmate misst 1,80 m bis zum Scheitel seines Helms, die
 * Kreatur 1,93 m bis zum Scheitel ihres Kopfes (`shipArt.ts`, nachgerechnet
 * aus den Kugeln). Ein Ersatz, der eine andere Größe hätte, verschöbe
 * stillschweigend alles, was am Körper hängt — Sichtlinien, Ghost, das Bild
 * auf der Karte.
 *
 * - **crew → `Mannequin_Medium`**, 1,75 m. Fünf Zentimeter unter dem gebauten
 *   Crewmate, und das ist Absicht: Dessen 1,80 m sind die Kuppe eines Helms,
 *   und ein bloßer Kopf sitzt tiefer. So stehen die Augen des Mannequins
 *   dort, wo vorher das Visier saß.
 * - **stalker → `Robot_Two`**, 1,90 m. „Der Verlorene" ist ein verlassener
 *   EVA-Anzug (`mission.MONSTERS`), und Robot_Two ist der schlaksigere der
 *   beiden Roboter — ein Ding in Menschengestalt, das keines mehr ist.
 * - **sentinel → `Robot_One`**, 1,90 m. Der Wächter ist wörtlich ein
 *   „defekter Sicherheitsroboter"; dass dafür ein Roboter im Regal liegt, ist
 *   der glücklichste Fall dieser ganzen Tabelle.
 * - **crawler → `null`.** Der Schachtläufer ist „niedrig und schnell" und hat
 *   sechs Beine. Die Sammlung hat dafür kein Gegenstück: Was ihm am nächsten
 *   käme (`mystery-monthly-6/4-october-2025-monstrosity`), steht auf demselben
 *   mittleren Skelett wie die beiden Roboter — zwei Beine, zwei Arme, aufrecht,
 *   1,9 m hoch. Er sähe damit aus wie der Stalker in einer anderen Farbe, und
 *   drei Monster, die sich nur in der Farbe unterscheiden, sind eines. Also
 *   bleibt er gebaut.
 */
export function actorFigure(kind: ActorKind): ActorFigure | null {
  switch (kind) {
    case 'crew':
      return {
        path: 'character-animations/mannequin-character/characters/Mannequin_Medium.glb',
        height: 1.75,
      };
    case 'stalker':
      return {
        path: 'mystery-monthly-4/12-june-2024-robot/characters/Robot_Two.glb',
        height: 1.9,
      };
    case 'sentinel':
      return {
        path: 'mystery-monthly-4/12-june-2024-robot/characters/Robot_One.glb',
        height: 1.9,
      };
    case 'crawler':
      return null;
  }
}

/**
 * **Das Material, das an den Robotern leuchtet.**
 *
 * Nachgesehen im JSON-Teil beider Dateien: `Robot_One.glb` und `Robot_Two.glb`
 * bringen **zwei** Materialien mit, `robot` und `robot_glow`, und das zweite
 * trägt `emissiveFactor: [1,1,1]` — es ist die Leuchtfläche der Augen und der
 * Brustanzeige, vom Zeichner schon als solche gebaut. Das Schiff ist dunkel,
 * und eine Kreatur, die man erst sieht, wenn sie vor einem steht, ist keine
 * Warnung mehr: Also bekommt genau dieses Material die Augenfarbe der
 * gebauten Kreatur (`shipArt.buildCreature`, `SHIP.red` bzw. `SHIP.amber`).
 *
 * Das Mannequin hat **nur** `Character_Material` und damit keine solche
 * Fläche; für den Techniker bleibt deshalb der zweite Weg (`actorArt.ts`, das
 * Visier am Kopfknochen).
 */
export const ACTOR_GLOW_MATERIAL = 'robot_glow';

/**
 * **Das Tempo, das ein bloßes „geht" bedeutet** (m/s).
 *
 * Nicht jede Aufrufstelle kennt eine Geschwindigkeit: Vom Techniker eines
 * anderen Geräts kommt über die Leitung nur ein `moving: boolean`
 * (`HauntState.technician`). Ein Gehschritt ist dafür die ehrliche Antwort —
 * wer rennt, sagt eine Zahl.
 */
export const ACTOR_PACE = 1.4;

/**
 * **Was ein Aufrufer über sein Tempo sagt, als Zahl.**
 *
 * `true`/`false` werden zu `ACTOR_PACE` und null, eine Zahl zu ihrem Betrag
 * (rückwärts gehen ist gehen, siehe `kaykitFigureFit.gaitFor`), und Unsinn zu
 * null: Ein Akteur, dessen Tempo `NaN` ist, soll stehen und nicht zappeln.
 */
export function actorPace(moving: boolean | number): number {
  if (typeof moving === 'boolean') return moving ? ACTOR_PACE : 0;
  return Number.isFinite(moving) ? Math.abs(moving) : 0;
}

/**
 * **Ob sich bei diesem Tempo etwas bewegen soll.**
 *
 * Dieselbe Schwelle wie die der Figur (`kaykitFigureFit.gaitFor`, 5 cm/s) —
 * sonst schwenkte der gebaute Körper die Arme, während die Figur daneben
 * schon stünde, und ein Wechsel zwischen beiden wäre ein sichtbarer Sprung.
 */
export function actorMoving(pace: number): boolean {
  return gaitFor(pace) !== 'idle';
}
