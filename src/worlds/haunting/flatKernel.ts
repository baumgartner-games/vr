import type { BotTuning, TechnicianTuning } from './botTuning';
import { FlatRound, type FlatEvent, type FlatInput } from './map/flatRound';
import type { HauntBooks, HauntState } from './net';
import { TechnicianBot } from './rules/technicianBot';
import type { RoundSetup } from './rules/roundSetup';
import type { FloorPoint } from './stationLayout';
import { COMMAND_HOME } from './trainingLayout';

/**
 * **Die 2D-Runde als Rechenkern der 3D-Welt.**
 *
 * Der Besitzer will die Runde auf dem Telefon analysieren und einstellen und
 * sich darauf verlassen, dass die Brille dasselbe Spiel spielt. Dafür genügt
 * es nicht, dass beide Welten dieselben Stücke rufen — sie müssen **dieselbe
 * Rechnung** sein. Seit diesem Paket rechnet im Schiff deshalb nichts mehr
 * selbst: Die Eingaben (Brille, Tastatur, Bildschirmstock) werden zum Stock
 * der 2D-Runde (`FlatInput`), die Runde tut den Schritt, läuft das Monster,
 * fährt die Türen, führt Riegel, Lampen, Spuk, Uhr und Treffer — und die
 * 3D-Welt **zeichnet nur nach**, wo Spieler, Monster und Techniker aus Zahlen
 * auf der Karte stehen (`HauntingWorld.stepKernel`).
 *
 * Der Stand (`HauntState`) ist dabei **derselbe** wie der des Gastgebers:
 * `FlatRound` übernimmt ihn (`FlatResume`), er wird nicht kopiert. Was das
 * Schiff an ihm ändert — eine geöffnete Kiste, ein gelöstes Rätsel, ein
 * Schrank, in den jemand steigt — sieht die Runde im selben Bild; was die
 * Runde ändert — Türen, Licht, Anzug, Phase —, sieht das Schiff.
 *
 * Der **Techniker aus Zahlen** der Bot-Runde ist derselbe wie auf dem
 * Telefon (`rules/technicianBot.ts`): Er spielt mit Stock und Knöpfen die
 * echte Runde, samt Kollision. Der Modelltechniker des Schiffs
 * (`missionBot.ts`), der ohne Kollision auf einer eigenen Bahn lief, ist weg.
 */
export class FlatKernel {
  readonly round: FlatRound;
  private bot: TechnicianBot | null = null;

  constructor(
    seed: number,
    state: HauntState,
    books: Partial<HauntBooks>,
    options: {
      tuning: BotTuning;
      setup?: RoundSetup;
      players?: number;
      /** Wo der Techniker steht und wohin er schaut — das Gestell der Brille. */
      at?: { x: number; z: number; yaw: number };
    },
  ) {
    // `FlatRound` stellt den Techniker dorthin, wo der Stand ihn nennt.
    if (options.at) state.technician = { ...options.at, moving: false };
    this.round = new FlatRound(seed, {
      resume: {
        state,
        locks: books.locks,
        spook: books.spook,
        trail: books.trail,
        memory: books.memory,
        lamps: books.lamps,
        yaw: options.at?.yaw,
      },
      tuning: options.tuning,
      setup: options.setup,
      players: options.players,
      mode: 'realistic',
    });
    // In der Brille steht der Techniker im Gestell, nicht im Stand — die
    // Stelle im Stand ist für den, der in 2D spielt (`HauntState.technician`).
    state.technician = null;
  }

  /** Ein Bild des Menschen am Stock: die Runde rechnet, die Meldungen kommen zurück. */
  step(dt: number, input: FlatInput): FlatEvent[] {
    this.round.step(dt, input);
    return this.round.drain();
  }

  /** Ein Bild des Technikers aus Zahlen (Bot-Runde). */
  stepBot(dt: number): FlatEvent[] {
    this.bot?.step(dt);
    return this.round.drain();
  }

  /**
   * **Die Bot-Runde beginnt**: der Techniker aus Zahlen übernimmt den Stock,
   * von der Zentrale aus — wie auf dem Telefon (`FlatMode`, Rolle `watch`).
   */
  startBot(tuning: TechnicianTuning, roll: () => number): void {
    this.round.place(COMMAND_HOME);
    this.bot = new TechnicianBot(this.round, tuning, roll);
  }

  stopBot(): void {
    this.bot = null;
  }

  get botActive(): boolean {
    return this.bot !== null;
  }

  /** Was der Techniker aus Zahlen gerade tut — für die Tafel der Bot-Runde. */
  get botStage(): string {
    return this.bot?.stage ?? '';
  }

  /** Wo der Techniker steht und wohin er schaut — Mensch oder Bot, es ist dieselbe Figur. */
  get pose(): { x: number; z: number; yaw: number } {
    const player = this.round.player;
    return { x: player.x, z: player.z, yaw: player.yaw };
  }

  /** Der Weg des Technikers aus Zahlen, für die Wege-Ebene — leer ohne Bot. */
  get botNavigation(): { at: FloorPoint; points: readonly FloorPoint[]; goal: FloorPoint | null } {
    const points = this.bot?.route().slice(1) ?? [];
    return { at: this.pose, points, goal: points.length ? points[points.length - 1]! : null };
  }

  /** Der Weg des Monsters, für die Wege-Ebene und den Browser-Smoke. */
  get monsterNavigation(): {
    at: FloorPoint;
    points: readonly FloorPoint[];
    goal: FloorPoint | null;
  } {
    const monster = this.round.monster;
    return {
      at: { x: monster.x, z: monster.z },
      points: this.round.navigator.remaining,
      goal: this.round.navigator.target,
    };
  }

  /**
   * **Das Gestell wurde versetzt** (Zentrale, Schrank, neue Runde): Die Figur
   * auf der Karte geht mit — wenn die Stelle begehbar ist. Sonst bleibt sie,
   * wo sie war, und die Physik trägt das Gestell, bis es zurück ist.
   */
  place(at: FloorPoint): boolean {
    return this.round.place(at);
  }
}
