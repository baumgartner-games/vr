import type { FurnitureFolder, GameElement } from './elementCatalog';
import { COLOR_WORDS, swapRing } from './elementFamily';

/**
 * **Der Parcours im Katalog** — _Platformer_ als Spielelemente: Plattformen
 * und Rampen, Absperrungen, Fallen, Bögen, Sammeldinge. Gewünscht (Oktober
 * 2026): _„Plattformer ja"_.
 *
 * **Der Maßstab des Regals** (0,5): Eine Plattform `platform_2x2x1` ist damit
 * eine Kachel im Quadrat und einen halben Meter hoch — die Zahlen im
 * Dateinamen sind halbe Meter. Hinter jeder Zeile steht, was gemessen wurde:
 * Breite × Höhe × Tiefe in Metern.
 *
 * **Worauf man klettert, hat seine echte Höhe** (`climb`): Plattformen,
 * Absperrungen, Säulen und Gerüste sperren nicht bis 1,40 m wie ein Möbel,
 * sondern so hoch, wie sie sind — ein Parcours, auf den niemand hinaufkommt,
 * ist keiner. Durch Bögen, Reifen und das Ziel läuft man hindurch (`GATES`),
 * über Netze und Holzböden hinweg (`floor`).
 *
 * **Farben sind Fassungen** (`elementFamily.swapRing`): Im Katalog steht jede
 * Form einmal (blau, wo es sie gibt), die anderen Farben tauscht man im
 * Element-Menü. Die Förderbänder fehlen: Das Band der Küche nimmt sie schon
 * (`kaykitFit.KAYKIT_FILE_SCALE`).
 */

/** Eine Adresse aus _Platformer_ — die Farben liegen in eigenen Ordnern, »natur« ohne Endung. */
function platformer(base: string, color: string): string {
  return color === 'neutral'
    ? `platformer/neutral/${base}.glb`
    : `platformer/${color}/${base}_${color}.glb`;
}

/** So hoch ist der Körper eines Möbels — darüber springt niemand. */
const BODY = 1.4;

/** Die Farben, wie sie in der Zeile abgekürzt stehen. */
const COLOR_OF: Readonly<Record<string, string>> = {
  b: 'blue',
  g: 'green',
  r: 'red',
  y: 'yellow',
  n: 'neutral',
};

/**
 * **Was ein Stück ist** — `climb`: sperrt so hoch, wie es ist; `floor`: ein
 * Belag, über den man läuft; `small`: eine Zelle, auch auf eine Ablage;
 * `wall`: hängt an einer Wand; `chest`: eine Truhe mit Deckel; `thing`:
 * steht im Weg wie ein Möbel.
 */
type Kind = 'climb' | 'floor' | 'small' | 'wall' | 'chest' | 'thing';

/** Eine Zeile: Datei ohne Farbe, Name, Farben, Art, Kacheln — und bei `climb` die Höhe. */
type Row = readonly [string, string, string, Kind, readonly [number, number], number?];

const ROWS: readonly Row[] = [
  ['arch', 'Bogen', 'bgry', 'thing', [2, 0.5]], // 1,88 × 1,85 × 0,37
  ['arch_tall', 'Bogen, hoch', 'bgry', 'thing', [2, 0.5]], // 1,87 × 2,35 × 0,37
  ['arch_wide', 'Bogen, breit', 'bgry', 'thing', [3, 0.5]], // 2,88 × 1,90 × 0,37
  ['ball', 'Ball', 'bgryn', 'thing', [1, 1]], // 1,00 × 1,00 × 1,00
  ['barrier_1x1x1', 'Absperrung 0,5 × 0,5 m, 0,5 m hoch', 'bgryn', 'climb', [0.5, 0.5], 0.5], // 0,50 × 0,50 × 0,50
  ['barrier_1x1x2', 'Absperrung 0,5 × 0,5 m, 1 m hoch', 'bgryn', 'climb', [0.5, 0.5], 1], // 0,50 × 1,00 × 0,50
  ['barrier_1x1x4', 'Absperrung 0,5 × 0,5 m, 2 m hoch', 'bgryn', 'climb', [0.5, 0.5], 2], // 0,50 × 2,00 × 0,50
  ['barrier_2x1x1', 'Absperrung 1 × 0,5 m, 0,5 m hoch', 'bgryn', 'climb', [1, 0.5], 0.5], // 1,00 × 0,50 × 0,50
  ['barrier_2x1x2', 'Absperrung 1 × 0,5 m, 1 m hoch', 'bgryn', 'climb', [1, 0.5], 1], // 1,00 × 1,00 × 0,50
  ['barrier_2x1x4', 'Absperrung 1 × 0,5 m, 2 m hoch', 'bgryn', 'climb', [1, 0.5], 2], // 1,00 × 2,00 × 0,50
  ['barrier_3x1x1', 'Absperrung 1,5 × 0,5 m, 0,5 m hoch', 'bgryn', 'climb', [2, 0.5], 0.5], // 1,50 × 0,50 × 0,50
  ['barrier_3x1x2', 'Absperrung 1,5 × 0,5 m, 1 m hoch', 'bgryn', 'climb', [2, 0.5], 1], // 1,50 × 1,00 × 0,50
  ['barrier_3x1x4', 'Absperrung 1,5 × 0,5 m, 2 m hoch', 'bgryn', 'climb', [2, 0.5], 2], // 1,50 × 2,00 × 0,50
  ['barrier_4x1x1', 'Absperrung 2 × 0,5 m, 0,5 m hoch', 'bgryn', 'climb', [2, 0.5], 0.5], // 2,00 × 0,50 × 0,50
  ['barrier_4x1x2', 'Absperrung 2 × 0,5 m, 1 m hoch', 'bgryn', 'climb', [2, 0.5], 1], // 2,00 × 1,00 × 0,50
  ['barrier_4x1x4', 'Absperrung 2 × 0,5 m, 2 m hoch', 'bgryn', 'climb', [2, 0.5], 2], // 2,00 × 2,00 × 0,50
  ['bomb', 'Bombe, schwarz', 'n', 'small', [0.5, 0.5]], // 0,40 × 0,50 × 0,40
  ['bomb_A', 'Bombe', 'bgry', 'small', [0.5, 0.5]], // 0,40 × 0,50 × 0,40
  ['bomb_B', 'Bombe B', 'bgry', 'small', [0.5, 0.5]], // 0,40 × 0,50 × 0,40
  ['bracing_large', 'Strebe, groß', 'bgry', 'small', [0.5, 0.5]], // 0,50 × 0,50 × 0,10
  ['bracing_medium', 'Strebe', 'bgry', 'small', [0.5, 0.5]], // 0,30 × 0,30 × 0,10
  ['bracing_small', 'Strebe, klein', 'bgry', 'small', [0.5, 0.5]], // 0,10 × 0,30 × 0,10
  ['button_base', 'Druckknopf', 'bgry', 'floor', [1, 1]], // 0,88 × 0,16 × 0,88
  ['cannon_base', 'Kanone', 'bgry', 'thing', [2, 2]], // 1,50 × 1,75 × 1,31
  ['cannon_bullet', 'Kanonenkugel', 'n', 'thing', [0.5, 1]], // 0,49 × 0,49 × 0,77
  ['chain_full', 'Kette', 'n', 'thing', [0.5, 0.5]], // 0,31 × 4,30 × 0,31
  ['chain_link', 'Kettenglied', 'n', 'small', [0.5, 0.5]], // 0,31 × 0,40 × 0,09
  ['chain_link_end_bottom', 'Kettenende unten', 'n', 'small', [0.5, 0.5]], // 0,31 × 0,35 × 0,10
  ['chain_link_end_top', 'Kettenende oben', 'n', 'small', [0.5, 0.5]], // 0,31 × 0,35 × 0,10
  ['chest', 'Truhe', 'bgry', 'chest', [0.5, 0.5]], // 0,60 × 0,55 × 0,60
  ['chest_large', 'Große Truhe', 'bgry', 'chest', [1, 1]], // 0,93 × 0,55 × 0,75
  ['cone', 'Pylon', 'bgryn', 'small', [0.5, 0.5]], // 0,25 × 0,32 × 0,25
  ['diamond', 'Diamant', 'bgry', 'small', [0.5, 0.5]], // 0,54 × 0,43 × 0,51
  ['flag_A', 'Fahne, klein', 'bgry', 'thing', [0.5, 1]], // 0,30 × 1,03 × 0,81
  ['flag_B', 'Fahne', 'bgry', 'thing', [0.5, 1]], // 0,30 × 1,53 × 0,81
  ['flag_C', 'Fahne, hoch', 'bgry', 'thing', [0.5, 1]], // 0,30 × 2,03 × 0,81
  ['floor_net_2x2x1', 'Bodennetz', 'bgry', 'floor', [1, 1]], // 1,00 × 0,16 × 1,00
  ['floor_net_4x4x1', 'Bodennetz, groß', 'bgry', 'floor', [2, 2]], // 2,00 × 0,16 × 2,00
  ['floor_spikes_2x2x1', 'Bodenstacheln', 'n', 'thing', [1, 1]], // 1,00 × 0,50 × 1,00
  ['floor_spikes_4x4x1', 'Bodenstacheln, groß', 'n', 'thing', [2, 2]], // 2,00 × 0,50 × 2,00
  ['floor_spikes_curved_4x2x2', 'Bodenstacheln, gebogen', 'n', 'thing', [2, 1]], // 2,00 × 1,00 × 1,00
  ['floor_spikes_trap_2x2x1', 'Stachelfalle', 'bgry', 'thing', [1, 1]], // 1,00 × 0,75 × 1,00
  ['floor_spikes_trap_4x4x1', 'Stachelfalle, groß', 'bgry', 'thing', [2, 2]], // 2,00 × 0,75 × 2,00
  ['floor_wood_1x1', 'Holzboden, klein', 'n', 'floor', [0.5, 0.5]], // 0,50 × 0,25 × 0,50
  ['floor_wood_2x2', 'Holzboden', 'n', 'floor', [1, 1]], // 1,00 × 0,25 × 1,00
  ['floor_wood_2x6', 'Holzsteg', 'n', 'floor', [3, 1]], // 3,00 × 0,25 × 1,00
  ['floor_wood_4x4', 'Holzboden, groß', 'n', 'floor', [2, 2]], // 2,00 × 0,25 × 2,00
  ['hammer', 'Schwinghammer', 'bgry', 'thing', [2, 2]], // 2,00 × 3,75 × 1,50
  ['hammer_large', 'Schwinghammer, groß', 'bgry', 'thing', [3, 2]], // 3,00 × 5,00 × 2,00
  ['hammer_large_spikes', 'Stachelhammer, groß', 'bgry', 'thing', [4, 2]], // 4,00 × 5,00 × 2,00
  ['hammer_spikes', 'Stachelhammer', 'bgry', 'thing', [3, 2]], // 3,00 × 3,75 × 1,50
  ['hammerblock', 'Hammerblock', 'n', 'thing', [2, 2]], // 2,00 × 1,50 × 2,00
  ['hammerblock_spikes', 'Hammerblock mit Stacheln', 'n', 'thing', [2, 2]], // 2,00 × 2,00 × 2,00
  ['heart', 'Herz', 'bgry', 'small', [0.5, 0.5]], // 0,54 × 0,42 × 0,27
  ['hoop', 'Reifen', 'bgry', 'thing', [2, 0.5]], // 1,70 × 2,35 × 0,37
  ['hoop_angled', 'Reifen, schräg', 'bgry', 'thing', [2, 2]], // 1,88 × 2,13 × 1,25
  ['lever_floor_base', 'Bodenhebel', 'bgry', 'small', [0.5, 0.5]], // 0,40 × 0,86 × 0,60
  ['lever_wall_base_A', 'Wandhebel', 'bgry', 'small', [0.5, 0.5]], // 0,40 × 0,60 × 0,55
  ['lever_wall_base_B', 'Wandhebel B', 'bgry', 'small', [0.5, 0.5]], // 0,50 × 0,60 × 0,50
  ['pillar_1x1x1', 'Säule 0,4 × 0,4 m, 0,5 m hoch', 'n', 'climb', [0.5, 0.5], 0.5], // 0,40 × 0,50 × 0,40
  ['pillar_1x1x2', 'Säule 0,4 × 0,4 m, 1 m hoch', 'n', 'climb', [0.5, 0.5], 1], // 0,40 × 1,00 × 0,40
  ['pillar_1x1x4', 'Säule 0,4 × 0,4 m, 2 m hoch', 'n', 'climb', [0.5, 0.5], 2], // 0,40 × 2,00 × 0,40
  ['pillar_1x1x8', 'Säule 0,4 × 0,4 m, 4 m hoch', 'n', 'climb', [0.5, 0.5], 4], // 0,40 × 4,00 × 0,40
  ['pillar_2x2x2', 'Säule 0,8 × 0,8 m, 1 m hoch', 'n', 'climb', [1, 1], 1], // 0,80 × 1,00 × 0,80
  ['pillar_2x2x4', 'Säule 0,8 × 0,8 m, 2 m hoch', 'n', 'climb', [1, 1], 2], // 0,80 × 2,00 × 0,80
  ['pillar_2x2x8', 'Säule 0,8 × 0,8 m, 4 m hoch', 'n', 'climb', [1, 1], 4], // 0,80 × 4,00 × 0,80
  ['pipe_180_A', 'Rohr, Kehre', 'bgry', 'thing', [1, 3]], // 1,00 × 1,50 × 3,00
  ['pipe_180_B', 'Rohr, Kehre B', 'bgry', 'thing', [1, 3]], // 1,00 × 1,50 × 3,00
  ['pipe_90_A', 'Rohr, Bogen', 'bgry', 'thing', [1, 2]], // 1,00 × 1,50 × 1,50
  ['pipe_90_B', 'Rohr, Bogen B', 'bgry', 'thing', [1, 2]], // 1,00 × 1,50 × 1,50
  ['pipe_end', 'Rohrende', 'bgry', 'thing', [2, 2]], // 1,20 × 0,50 × 1,20
  ['pipe_straight_A', 'Rohr, gerade', 'bgry', 'climb', [1, 1], 1], // 1,00 × 1,00 × 1,00
  ['pipe_straight_B', 'Rohr, gerade B', 'bgry', 'climb', [1, 1], 1], // 1,00 × 1,00 × 1,00
  ['platform_1x1x1', 'Plattform 0,5 × 0,5 m, 0,5 m hoch', 'bgry', 'climb', [0.5, 0.5], 0.5], // 0,50 × 0,50 × 0,50
  ['platform_2x2x1', 'Plattform 1 × 1 m, 0,5 m hoch', 'bgry', 'climb', [1, 1], 0.5], // 1,00 × 0,50 × 1,00
  ['platform_2x2x2', 'Plattform 1 × 1 m, 1 m hoch', 'bgry', 'climb', [1, 1], 1], // 1,00 × 1,00 × 1,00
  ['platform_2x2x4', 'Plattform 1 × 1 m, 2 m hoch', 'bgry', 'climb', [1, 1], 2], // 1,00 × 2,00 × 1,00
  ['platform_4x2x1', 'Plattform 2 × 1 m, 0,5 m hoch', 'bgry', 'climb', [2, 1], 0.5], // 2,00 × 0,50 × 1,00
  ['platform_4x2x2', 'Plattform 2 × 1 m, 1 m hoch', 'bgry', 'climb', [2, 1], 1], // 2,00 × 1,00 × 1,00
  ['platform_4x2x4', 'Plattform 2 × 1 m, 2 m hoch', 'bgry', 'climb', [2, 1], 2], // 2,00 × 2,00 × 1,00
  ['platform_4x4x1', 'Plattform 2 × 2 m, 0,5 m hoch', 'bgry', 'climb', [2, 2], 0.5], // 2,00 × 0,50 × 2,00
  ['platform_4x4x2', 'Plattform 2 × 2 m, 1 m hoch', 'bgry', 'climb', [2, 2], 1], // 2,00 × 1,00 × 2,00
  ['platform_4x4x4', 'Plattform 2 × 2 m, 2 m hoch', 'bgry', 'climb', [2, 2], 2], // 2,00 × 2,00 × 2,00
  ['platform_6x2x1', 'Plattform 3 × 1 m, 0,5 m hoch', 'bgry', 'climb', [3, 1], 0.5], // 3,00 × 0,50 × 1,00
  ['platform_6x2x2', 'Plattform 3 × 1 m, 1 m hoch', 'bgry', 'climb', [3, 1], 1], // 3,00 × 1,00 × 1,00
  ['platform_6x2x4', 'Plattform 3 × 1 m, 2 m hoch', 'bgry', 'climb', [3, 1], 2], // 3,00 × 2,00 × 1,00
  ['platform_6x6x1', 'Plattform 3 × 3 m, 0,5 m hoch', 'bgry', 'climb', [3, 3], 0.5], // 3,00 × 0,50 × 3,00
  ['platform_6x6x2', 'Plattform 3 × 3 m, 1 m hoch', 'bgry', 'climb', [3, 3], 1], // 3,00 × 1,00 × 3,00
  ['platform_6x6x4', 'Plattform 3 × 3 m, 2 m hoch', 'bgry', 'climb', [3, 3], 2], // 3,00 × 2,00 × 3,00
  ['platform_arrow_2x2x1', 'Pfeilplattform 1 × 1 m, 0,5 m hoch', 'bgry', 'climb', [1, 1], 0.5], // 1,00 × 0,50 × 1,00
  ['platform_arrow_4x4x1', 'Pfeilplattform 2 × 2 m, 0,5 m hoch', 'bgry', 'climb', [2, 2], 0.5], // 2,00 × 0,50 × 2,00
  [
    'platform_decorative_1x1x1',
    'Zierplattform 0,5 × 0,5 m, 0,5 m hoch',
    'bgry',
    'climb',
    [0.5, 0.5],
    0.5,
  ], // 0,50 × 0,50 × 0,50
  ['platform_decorative_2x2x2', 'Zierplattform 1 × 1 m, 1 m hoch', 'bgry', 'climb', [1, 1], 1], // 1,00 × 1,00 × 1,00
  ['platform_hole_6x6x1', 'Plattform mit Loch 3 × 3 m, 0,5 m hoch', 'bgry', 'climb', [3, 3], 0.5], // 3,00 × 0,50 × 3,00
  ['platform_slope_2x2x2', 'Rampe 1 × 1 m, 1 m hoch', 'bgry', 'climb', [1, 1], 1], // 1,00 × 1,00 × 1,00
  ['platform_slope_2x4x4', 'Rampe 1 × 2 m, 2 m hoch', 'bgry', 'climb', [1, 2], 2], // 1,00 × 2,00 × 2,00
  ['platform_slope_2x6x4', 'Rampe 1 × 3 m, 2 m hoch', 'bgry', 'climb', [1, 3], 2], // 1,00 × 2,00 × 3,00
  ['platform_slope_4x2x2', 'Rampe 2 × 1 m, 1 m hoch', 'bgry', 'climb', [2, 1], 1], // 2,00 × 1,00 × 1,00
  ['platform_slope_4x4x4', 'Rampe 2 × 2 m, 2 m hoch', 'bgry', 'climb', [2, 2], 2], // 2,00 × 2,00 × 2,00
  ['platform_slope_4x6x4', 'Rampe 2 × 3 m, 2 m hoch', 'bgry', 'climb', [2, 3], 2], // 2,00 × 2,00 × 3,00
  ['platform_slope_6x2x2', 'Rampe 3 × 1 m, 1 m hoch', 'bgry', 'climb', [3, 1], 1], // 3,00 × 1,00 × 1,00
  ['platform_slope_6x4x4', 'Rampe 3 × 2 m, 2 m hoch', 'bgry', 'climb', [3, 2], 2], // 3,00 × 2,00 × 2,00
  ['platform_slope_6x6x4', 'Rampe 3 × 3 m, 2 m hoch', 'bgry', 'climb', [3, 3], 2], // 3,00 × 2,00 × 3,00
  ['platform_wood_1x1x1', 'Holzklotz', 'n', 'climb', [0.5, 0.5], 0.5], // 0,50 × 0,50 × 0,50
  ['power', 'Blitz', 'bgry', 'small', [0.5, 0.5]], // 0,45 × 0,60 × 0,20
  ['railing_corner_double', 'Geländer, Ecke doppelt', 'bgry', 'thing', [1, 1]], // 1,00 × 0,60 × 1,00
  ['railing_corner_padded', 'Geländer, Ecke gepolstert', 'bgry', 'thing', [1, 1]], // 1,05 × 0,60 × 1,05
  ['railing_corner_single', 'Geländer, Ecke', 'bgry', 'thing', [1, 1]], // 1,00 × 0,60 × 1,00
  ['railing_straight_double', 'Geländer, doppelt', 'bgry', 'thing', [1, 0.5]], // 1,00 × 0,60 × 0,20
  ['railing_straight_padded', 'Geländer, gepolstert', 'bgry', 'thing', [1, 0.5]], // 1,00 × 0,60 × 0,30
  ['railing_straight_single', 'Geländer', 'bgry', 'thing', [1, 0.5]], // 1,00 × 0,60 × 0,20
  ['safetynet_2x2x1', 'Sicherheitsnetz', 'bgry', 'floor', [1, 1]], // 1,00 × 0,50 × 1,00
  ['safetynet_4x2x1', 'Sicherheitsnetz, lang', 'bgry', 'floor', [2, 1]], // 2,00 × 0,50 × 1,00
  ['safetynet_6x2x1', 'Sicherheitsnetz, sehr lang', 'bgry', 'floor', [3, 1]], // 3,00 × 0,50 × 1,00
  ['saw_trap', 'Sägefalle', 'bgry', 'thing', [4, 4]], // 3,40 × 1,00 × 3,40
  ['saw_trap_double', 'Sägefalle, doppelt', 'bgry', 'thing', [8, 4]], // 7,40 × 1,00 × 3,40
  ['saw_trap_long', 'Sägefalle, lang', 'bgry', 'thing', [4, 5]], // 3,40 × 1,00 × 4,91
  ['sawblade', 'Sägeblatt', 'n', 'thing', [4, 4]], // 3,40 × 0,45 × 3,40
  ['sign', 'Schild', 'n', 'small', [0.5, 0.5]], // 0,38 × 0,63 × 0,38
  ['signage_arrow_stand', 'Pfeilschild', 'bgry', 'small', [0.5, 0.5]], // 0,50 × 1,00 × 0,20
  ['signage_arrow_wall', 'Wandpfeil', 'bgry', 'wall', [0.5, 0.5]], // 0,50 × 0,50 × 0,10
  ['signage_arrows_left', 'Pfeilband links', 'bgryn', 'thing', [3, 0.5]], // 2,70 × 0,75 × 0,34
  ['signage_arrows_right', 'Pfeilband rechts', 'bgryn', 'thing', [3, 0.5]], // 2,70 × 0,75 × 0,34
  ['signage_finish', 'Ziel', 'n', 'thing', [3, 0.5]], // 2,70 × 2,25 × 0,25
  ['signage_finish_wide', 'Ziel, breit', 'n', 'thing', [5, 0.5]], // 4,70 × 2,25 × 0,25
  ['spikeball', 'Stachelkugel', 'n', 'thing', [2, 2]], // 1,29 × 1,37 × 1,36
  ['spikeball_hanger', 'Stachelkugel, hängend', 'n', 'thing', [2, 2]], // 1,29 × 1,48 × 1,36
  ['spikeblock_double_horizontal', 'Stachelblock, doppelt quer', 'bgry', 'thing', [2, 1]], // 2,00 × 1,00 × 1,00
  ['spikeblock_double_vertical', 'Stachelblock, doppelt hoch', 'bgry', 'thing', [1, 1]], // 1,00 × 2,00 × 1,00
  ['spikeblock_down', 'Stachelblock, unten', 'bgry', 'thing', [1, 1]], // 1,00 × 1,50 × 1,00
  ['spikeblock_left', 'Stachelblock, links', 'bgry', 'thing', [2, 1]], // 1,50 × 1,00 × 1,00
  ['spikeblock_omni', 'Stachelblock, rundum', 'bgry', 'thing', [2, 2]], // 2,00 × 2,00 × 2,00
  ['spikeblock_quad', 'Stachelblock, vierfach', 'bgry', 'thing', [2, 1]], // 2,00 × 2,00 × 1,00
  ['spikeblock_right', 'Stachelblock, rechts', 'bgry', 'thing', [2, 1]], // 1,50 × 1,00 × 1,00
  ['spikeblock_up', 'Stachelblock, oben', 'bgry', 'thing', [1, 1]], // 1,00 × 1,50 × 1,00
  ['spikeroller_horizontal', 'Stachelwalze', 'n', 'thing', [2, 2]], // 2,00 × 2,00 × 2,00
  ['spikeroller_vertical', 'Stachelwalze, stehend', 'n', 'thing', [1, 1]], // 1,00 × 1,20 × 1,00
  ['spring', 'Sprungfeder', 'n', 'small', [0.5, 0.5]], // 0,50 × 1,10 × 0,50
  ['spring_pad', 'Sprungfeld', 'bgry', 'thing', [1, 1]], // 0,75 × 0,50 × 0,75
  ['star', 'Stern', 'bgry', 'small', [0.5, 0.5]], // 0,58 × 0,55 × 0,22
  ['structure_A', 'Gerüstplatte', 'n', 'climb', [1, 1], 0.1], // 1,00 × 0,10 × 1,00
  ['structure_B', 'Gerüst', 'n', 'climb', [1, 1], 0.55], // 1,00 × 0,55 × 1,00
  ['structure_C', 'Gerüst, hoch', 'n', 'climb', [1, 1], 1], // 0,90 × 1,00 × 0,90
  ['strut_horizontal', 'Strebe, liegend', 'n', 'thing', [1, 0.5]], // 1,00 × 0,25 × 0,25
  ['strut_vertical', 'Strebe, stehend', 'n', 'small', [0.5, 0.5]], // 0,25 × 1,00 × 0,25
  ['swiper', 'Schwinger', 'bgry', 'thing', [0.5, 2]], // 0,50 × 0,75 × 1,56
  ['swiper_double', 'Schwinger, doppelt', 'bgry', 'thing', [3, 0.5]], // 2,75 × 0,75 × 0,50
  ['swiper_double_long', 'Schwinger, doppelt lang', 'bgry', 'thing', [5, 0.5]], // 4,50 × 0,75 × 0,50
  ['swiper_long', 'Schwinger, lang', 'bgry', 'thing', [0.5, 3]], // 0,50 × 0,75 × 2,44
  ['swiper_quad', 'Schwinger, vierfach', 'bgry', 'thing', [3, 3]], // 2,75 × 0,75 × 2,75
  ['swiper_quad_long', 'Schwinger, vierfach lang', 'bgry', 'thing', [5, 5]], // 4,50 × 0,75 × 4,50
];

/** Durch diese läuft man hindurch — sie sperren keine Zelle. */
const GATES: ReadonlySet<string> = new Set([
  'arch',
  'arch_tall',
  'arch_wide',
  'hoop',
  'hoop_angled',
  'signage_finish',
  'signage_finish_wide',
  'chain_full',
  'spikeball_hanger',
]);

/**
 * **Was in einer Truhe liegt** (`opens: 'lid'`): ein Stern, ein Herz oder ein
 * Diamant — was ein Parcours eben verteilt.
 */
const CHEST_YIELDS: readonly string[] = [
  platformer('star', 'yellow'),
  platformer('heart', 'red'),
  platformer('diamond', 'blue'),
];

/** Ein Stück in einer Farbe. */
function piece(row: Row, color: string): GameElement {
  const [base, label, , kind, tiles, height] = row;
  const id = `parcours-${base.replace(/_/g, '-').toLowerCase()}-${color}`;
  const element: GameElement = {
    id,
    label: `${label}, ${COLOR_WORDS[color]}`,
    aka: ['Parcours', 'Platformer'],
    tiles,
    height: kind === 'climb' ? (height ?? BODY) : BODY,
    kind: null,
    parts: [{ model: platformer(base, color) }],
  };
  if (kind === 'floor') return { ...element, solid: [0, 0], floor: true };
  if (kind === 'small') return { ...element, rests: true };
  if (kind === 'wall') return { ...element, wall: true };
  if (kind === 'chest') return { ...element, opens: 'lid', yields: CHEST_YIELDS };
  if (GATES.has(base)) return { ...element, solid: [0, 0] };
  return element;
}

/** Je Zeile eine Familie: alle Farben, reihum getauscht. */
const FAMILIES: readonly GameElement[][] = ROWS.map((row) =>
  swapRing([...row[2]].map((code) => piece(row, COLOR_OF[code]!))),
);

/** **Alle Elemente des Parcours** — mit allen Fassungen. */
export const PLATFORMER_ELEMENTS: readonly GameElement[] = FAMILIES.flat();

/** Die Ids im Katalog, deren Datei so anfängt. */
function ofKind(...prefixes: string[]): string[] {
  return FAMILIES.filter((_, i) => prefixes.some((prefix) => ROWS[i]![0].startsWith(prefix))).map(
    (family) => family[0]!.id,
  );
}

/** **Der Ordner _Parcours_** — nach Art, zuletzt _Alles_. */
export const PLATFORMER_FOLDER: FurnitureFolder = {
  id: 'parcours',
  label: 'Parcours',
  elements: [],
  cover: { element: 'parcours-platform-4x4x2-blue' },
  folders: [
    {
      id: 'parcours-platforms',
      label: 'Plattformen & Rampen',
      elements: ofKind('platform', 'structure', 'pillar', 'floor_wood', 'strut', 'bracing'),
      cover: { element: 'parcours-platform-slope-4x4x4-blue' },
    },
    {
      id: 'parcours-barriers',
      label: 'Absperrungen & Geländer',
      elements: ofKind('barrier', 'railing', 'pipe', 'cone', 'safetynet', 'floor_net'),
      cover: { element: 'parcours-barrier-4x1x2-blue' },
    },
    {
      id: 'parcours-traps',
      label: 'Fallen',
      elements: ofKind(
        'spike',
        'saw',
        'hammer',
        'swiper',
        'floor_spikes',
        'bomb',
        'cannon',
        'chain',
      ),
      cover: { element: 'parcours-hammer-blue' },
    },
    {
      id: 'parcours-goals',
      label: 'Bögen, Ziel & Schilder',
      elements: ofKind('arch', 'hoop', 'flag', 'sign', 'button', 'lever', 'spring'),
      cover: { element: 'parcours-arch-blue' },
    },
    {
      id: 'parcours-pickups',
      label: 'Sammeln',
      elements: ofKind('star', 'heart', 'diamond', 'power', 'chest', 'ball'),
      cover: { element: 'parcours-star-blue' },
    },
    { id: 'parcours-all', label: 'Alles', elements: FAMILIES.map((family) => family[0]!.id) },
  ],
};
