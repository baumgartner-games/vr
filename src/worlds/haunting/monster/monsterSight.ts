import type { MapPoint, MapSnapshot } from '../map/mapSnapshot';
import { inCone, lineOfSight, litAt, type VisibilityField } from '../map/visibility';
import { MONSTER_FOV } from '../perception';

/**
 * **Was das Monster sieht — eine Rechnung für beide Welten.**
 *
 * Bis zu diesem Paket hatte das Monster zwei Augenpaare: In der 2D-Runde sah
 * es, wer **im Licht** stand (die hellen Flächen der Karte,
 * `map/visibility.ts`), in seinem Kegel und ohne Wand dazwischen; im Headset
 * schoss es einen Rapier-Strahl, kannte weder Kegel noch Lampe und sah auf
 * vierundzwanzig Meter jeden, den der Strahl erreichte — mit einem
 * Sichtfaktor aus Taschenlampe und Ducken statt aus dem Licht, in dem jemand
 * steht. Dasselbe Monster, dieselben Gewichte, zwei verschiedene Viecher: Was
 * in der 2D-Runde gemessen und trainiert wurde, galt in der Brille nicht.
 *
 * Jetzt gilt das Modell der Karte in beiden Welten, und zwar dieses hier:
 *
 * - **Berührungsnähe** (`CLOSE_SIGHT`): Wer näher als zweieinhalb Meter
 *   steht, wird gesehen, auch im Dunkeln und auch durch ein Türblatt.
 * - Sonst: Der Spieler steht **im Licht** (Lampe, Zentrale oder seine eigene
 *   Taschenlampe — die hellen Flächen aus `litRegions`), er steht **im
 *   Kegel** (`MONSTER_FOV`, Reichweite `Profil × Gewicht`) und **keine
 *   Wand** und kein geschlossenes Türblatt liegt dazwischen
 *   (`geometry.lineOfSight` — Fenster lassen durch, Möbel zählen nicht).
 * - Im Schrank oder im Schacht sieht ihn niemand (`hidden`).
 *
 * Möbel zählen absichtlich nicht: Die Karte kennt sie als Kästen im Weg, aber
 * nicht als Sichtschutz, und das Monster soll in der Brille nicht mehr und
 * nicht weniger sehen als auf dem Telefon. Wer das ändert, ändert es hier —
 * und damit in beiden Welten zugleich.
 */

/** Ab hier sieht das Monster ohne Licht und durch jedes Türblatt: Berührung. */
export const CLOSE_SIGHT = 2.5;

export interface SightInput {
  snapshot: MapSnapshot;
  /** Die hellen Flächen — `field.lit` der Karte oder `litRegions(snapshot)`. */
  light: Pick<VisibilityField, 'lit' | 'self'>;
  monster: { x: number; z: number; yaw: number };
  player: MapPoint;
  /** Im Schrank oder im Schacht: unsichtbar, aber die Linie zählt weiter. */
  hidden: boolean;
  /** Die Sichtweite in Metern — `Profil × Gewicht`. */
  range: number;
  fov?: number;
}

export interface Sight {
  /** Ob das Monster den Spieler gerade wirklich sieht. */
  seen: boolean;
  /** Ob nichts dazwischen steht — auch dann wahr, wenn er im Dunkeln steht. */
  lineOfSight: boolean;
  /** Der Abstand der beiden, in Metern. */
  gap: number;
}

export function monsterSight(input: SightInput): Sight {
  const { monster, player } = input;
  const gap = Math.hypot(player.x - monster.x, player.z - monster.z);
  const close = gap < CLOSE_SIGHT;
  const lineOfSightNow = close || lineOfSight(input.snapshot, monster, player);
  const visible = !input.hidden && (close || litAt(input.light, player));
  const seen =
    visible &&
    lineOfSightNow &&
    inCone(
      {
        entityId: 'monster',
        at: { x: monster.x, z: monster.z },
        yaw: monster.yaw,
        fov: input.fov ?? MONSTER_FOV,
        range: input.range,
      },
      player,
    );
  return { seen, lineOfSight: lineOfSightNow, gap };
}
