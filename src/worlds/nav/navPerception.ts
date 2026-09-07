import { wrapAngle, yawTo } from '../npc/npcBrain';
import type { NavGraph } from './navGraph';
import { canSee, soundLevel } from './navSight';
import { NO_TILE, keyLevel, type TileKey } from './navTile';

/**
 * **Die Sinne** — was ein NPC mitbekommt, und wie lange er es behält.
 *
 * Drei Fragen, und die dritte ist die wichtigste:
 *
 * - **Sehen**: Kegel (Winkel und Weite) plus Sichtlinie über die Wände des
 *   Gitters (`navSight.ts`).
 * - **Hören**: ein Ereignis mit Lautstärke und Ort; Wände und Decken dämpfen.
 * - **Erinnern**: wo er ihn zuletzt gesehen hat, und wann. **Das** ist der
 *   Unterschied zwischen einem Bot, der stehen bleibt, sobald man um die Ecke
 *   geht, und einem, der um die Ecke kommt. Von allem, was hier steht, macht
 *   dieses eine Feld den meisten Eindruck.
 *
 * Dazu eine **Reaktionszeit**. Ein Bot, der in dem Bild schießt, in dem er
 * einen sieht, ist kein Gegner, sondern ein Schalter — und man merkt das
 * sofort, ohne sagen zu können, woran. Zwei Zehntelsekunden zwischen „sieht"
 * und „reagiert" sind der Unterschied.
 *
 * Kein three.js: hinein gehen Kachelschlüssel und Meter, heraus kommt, was er
 * weiß (`navPerception.test.ts`). Die Winkelmathematik kommt aus
 * `npcBrain.ts` — dieselben Vorzeichen wie überall sonst, und geprüft ist sie
 * dort schon.
 */

/** Wie ein NPC-Typ wahrnimmt. */
export interface SenseConfig {
  /** Der **halbe** Öffnungswinkel des Sichtkegels, in Grad. 180 = Rundumblick. */
  fov: number;
  /** Wie weit er sieht, in Metern. */
  sight: number;
  /** Ab welcher Lautstärke (0..1, nach Dämpfung) er etwas hört. */
  ear: number;
  /** Wie lange eine Erinnerung gilt, in Sekunden. */
  memory: number;
  /** Wie lange er hinsehen muss, bevor er reagiert, in Sekunden. */
  reaction: number;
}

/** Der Zombie: schlechte Augen, guter Kegel, kein Zögern. */
export const ZOMBIE_SENSES: SenseConfig = {
  fov: 110,
  sight: 18,
  ear: 0.12,
  memory: 8,
  reaction: 0.15,
};

/** Der Wachmann: sieht weiter, hört besser, braucht einen Moment. */
export const GUARD_SENSES: SenseConfig = {
  fov: 70,
  sight: 45,
  ear: 0.05,
  memory: 25,
  reaction: 0.28,
};

/** Ein Ort, an dem etwas passiert ist. */
export interface Spot {
  x: number;
  z: number;
  level: number;
}

/** Ein Geräusch, das jemand gemacht hat. */
export interface SoundEvent {
  /** Wo es herkam. */
  tile: TileKey;
  x: number;
  z: number;
  /** Wie laut an der Quelle, 0..1 — ein Schuss ist 1, ein Schritt 0,12. */
  loudness: number;
}

/** Was sich ein NPC über die Zeit merkt. */
export interface Recall {
  /** Wo er sein Ziel zuletzt bemerkt hat — `null`, wenn er nichts weiß. */
  spot: Spot | null;
  /** Wann das war, in Sekunden Weltzeit. */
  when: number;
  /** Woher er es weiß. */
  how: 'sight' | 'sound';
  /** Wie lange er es ununterbrochen sieht, in Sekunden. */
  held: number;
  /** Ob er es im letzten Bild gesehen hat — für die Flanke. */
  saw: boolean;
}

export function newRecall(): Recall {
  return { spot: null, when: -Infinity, how: 'sight', held: 0, saw: false };
}

/** Alles, was ein Sinnesorgan über dieses Bild wissen muss. */
export interface SenseInput {
  graph: NavGraph;
  /** Wo der NPC steht, in Metern, und auf welcher Kachel. */
  at: { x: number; z: number };
  tile: TileKey;
  /** Wohin er schaut, als Gierwinkel (−Z ist vorne, wie überall hier). */
  yaw: number;
  /** Das Ziel — `null`, wenn gerade keines da ist. */
  target: { x: number; z: number } | null;
  targetTile: TileKey;
  /** Was seit dem letzten Bild zu hören war. */
  sounds?: readonly SoundEvent[];
  dt: number;
  /** Weltzeit in Sekunden. */
  now: number;
}

/** Und was dabei herauskommt. */
export interface SenseStep {
  /** Ob das Ziel gerade im Blick ist. */
  sees: boolean;
  /** Die Flanke: In **diesem** Bild ist es ihm aufgefallen. Für Knurren, Ruf, Augen. */
  spotted: boolean;
  /** Ob er reagiert — sieht *und* lange genug gesehen. */
  alert: boolean;
  /** Die Lautstärke des lautesten Geräuschs, das durchkam. 0 = nichts. */
  heard: number;
  /**
   * Wohin er geht, wenn er nichts sieht: die letzte bekannte Stelle.
   *
   * `null`, sobald die Erinnerung abgelaufen ist — dann hat er nichts mehr
   * vor, und was er dann tut, entscheidet sein Hirn und nicht sein Auge.
   */
  goto: Spot | null;
}

const DEG = Math.PI / 180;

/**
 * Ein Bild der Wahrnehmung. Der Zustand wird **verändert**, das Ergebnis ist neu
 * — dieselbe Aufteilung wie bei `stepBrain`.
 */
export function perceive(config: SenseConfig, recall: Recall, input: SenseInput): SenseStep {
  const sees = looksAt(config, input);
  const wasSeeing = recall.saw;
  recall.saw = sees;

  if (sees && input.target) {
    recall.held += input.dt;
    recall.spot = {
      x: input.target.x,
      z: input.target.z,
      level: keyLevel(input.targetTile),
    };
    recall.when = input.now;
    recall.how = 'sight';
  } else {
    recall.held = 0;
  }

  let heard = 0;
  for (const sound of input.sounds ?? []) {
    if (sound.tile === NO_TILE) continue;
    const level = soundLevel(input.graph, sound.tile, input.tile, sound.loudness);
    if (level > heard) heard = level;
    if (level < config.ear || sees) continue;
    // Gehört schlägt Erinnerung, aber nie Sicht: Wer sein Ziel im Blick hat,
    // lässt sich von einem Knall hinter sich nicht dorthin schicken.
    recall.spot = { x: sound.x, z: sound.z, level: keyLevel(sound.tile) };
    recall.when = input.now;
    recall.how = 'sound';
  }

  // Vergessen. Erst hier, damit eine Sichtung in diesem Bild nicht im selben
  // Bild wieder abläuft, wenn jemand `memory` auf null stellt.
  if (recall.spot && input.now - recall.when > config.memory) {
    recall.spot = null;
  }

  return {
    sees,
    spotted: sees && !wasSeeing,
    alert: sees && recall.held >= config.reaction,
    heard,
    goto: recall.spot,
  };
}

/**
 * Ob das Ziel im Kegel liegt, nah genug ist und keine Wand dazwischen steht.
 *
 * In dieser Reihenfolge, und die ist der Grund, warum es eine eigene Funktion
 * ist: Die Sichtlinie ist von den dreien mit Abstand die teuerste, und bei
 * fünfzig NPCs will man sie nur für die rechnen, bei denen die beiden
 * billigeren Prüfungen schon durchgegangen sind.
 */
export function looksAt(config: SenseConfig, input: SenseInput): boolean {
  const { target } = input;
  if (!target || input.tile === NO_TILE || input.targetTile === NO_TILE) return false;

  const range = Math.hypot(target.x - input.at.x, target.z - input.at.z);
  if (range > config.sight) return false;
  if (config.fov < 180) {
    const error = Math.abs(wrapAngle(yawTo(input.at, target) - input.yaw));
    if (error > config.fov * DEG) return false;
  }
  return canSee(input.graph, input.tile, input.targetTile);
}

/** Der Abstand von einem NPC zu einer Erinnerung, in Metern. */
export function spotDistance(at: { x: number; z: number }, spot: Spot): number {
  return Math.hypot(spot.x - at.x, spot.z - at.z);
}

/** Die Kachel zu einer Erinnerung — dorthin läuft er. */
export function spotTile(graph: NavGraph, spot: Spot): TileKey {
  const key = graph.nearest(spot.x, spot.z, graph.levelY(spot.level));
  return key;
}

/**
 * Wie laut ein Schritt, ein Schuss oder ein umgeworfenes Fass sind.
 *
 * Eine Tabelle und keine Zahlen im Code: Wer die Welt hellhöriger machen will,
 * dreht hier und nicht an fünf Stellen. Die Werte beziehen sich auf
 * `SOUND_RANGE` aus `navSight.ts` — `1` heißt „so weit, wie es überhaupt geht".
 */
export const LOUDNESS = {
  step: 0.12,
  run: 0.28,
  land: 0.4,
  door: 0.35,
  crate: 0.5,
  shot: 1,
} as const;

/** Ein Geräusch an einer Weltposition, fertig für `perceive`. */
export function soundAt(
  graph: NavGraph,
  x: number,
  z: number,
  y: number,
  loudness: number,
): SoundEvent {
  return { tile: graph.at(x, z, y), x, z, loudness };
}

/**
 * Wie weit ein Geräusch dieser Lautstärke höchstens getragen werden kann, in
 * Metern — ohne Wände, ohne Decken.
 *
 * Damit lässt sich die Liste der Zuhörer vorsortieren, bevor für jeden die
 * teure Linie gerechnet wird.
 */
export function soundReach(loudness: number, ear: number, range: number): number {
  if (loudness <= ear) return 0;
  return range * (1 - ear / loudness);
}
