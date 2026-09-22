import { GAIT_CLIPS } from '../../core/kaykitFigureFit';
import { figureGaitClip, figureGaitClips, figureStrikeClip } from './npcFigure';
import { npcSkin, shelfSkin } from './npcKinds';

/**
 * **Welche Spur welcher Gang ist, wenn die Haut mitredet.**
 *
 * Die Sammlung hat keine Zombie-Figur; was einen Zombie von einer
 * Übungspuppe unterscheidet, ist die Wahl der Bewegung. Genau diese Wahl
 * steht hier — und sie ist eine Liste von Namen, also etwas, das man ohne
 * Brille prüfen kann. Die Namen selbst prüft `core/kaykitFigureFit.test.ts`
 * gegen die wirklichen Dateien.
 */
describe('Der Gang einer Haut', () => {
  const zombie = npcSkin('zombie');
  const dummy = npcSkin('dummy');

  it('lässt die allgemeine Liste stehen, wo eine Haut nichts sagt', () => {
    expect(figureGaitClips(dummy, 'walk')).toBe(GAIT_CLIPS.walk);
    expect(figureGaitClips(dummy, 'idle')).toBe(GAIT_CLIPS.idle);
  });

  it('stellt die Wünsche des Zombies nach vorn', () => {
    expect(figureGaitClips(zombie, 'idle')[0]).toBe('Melee_Unarmed_Idle');
    expect(figureGaitClips(zombie, 'walk')[0]).toBe('Walking_C');
  });

  /**
   * **Angehängt und nicht ersetzt**: Das große Skelett kennt weder
   * `Walking_C` noch `Melee_Unarmed_Idle` — und eine Figur, die deshalb gar
   * nicht mehr geht, wäre der teuerste Weg, einen Geschmack durchzusetzen.
   */
  it('hängt die allgemeine Liste als Auffang dahinter', () => {
    for (const gait of ['idle', 'walk', 'run'] as const) {
      const list = figureGaitClips(zombie, gait);
      // Der Gang steht in der Erwartung, damit ein Fehlschlag sagt, welcher.
      for (const name of GAIT_CLIPS[gait]) {
        expect([gait, name, list.includes(name)]).toEqual([gait, name, true]);
      }
    }
  });

  it('nennt jeden Namen nur einmal', () => {
    const list = figureGaitClips(zombie, 'walk');
    expect(list.length).toBe(new Set(list).size);
  });

  it('nimmt den ersten Wunsch, den dieses Skelett kennt', () => {
    // Das mittlere Skelett hat alle drei Gehspuren.
    expect(figureGaitClip(zombie, 'walk', ['Walking_A', 'Walking_B', 'Walking_C'])).toBe(
      'Walking_C',
    );
    // Das große hat nur eine — und dann geht er eben damit.
    expect(figureGaitClip(zombie, 'walk', ['Walking_A'])).toBe('Walking_A');
    expect(figureGaitClip(zombie, 'idle', ['Idle_A'])).toBe('Idle_A');
  });

  it('gibt `null` her, wenn das Skelett gar nichts davon kennt', () => {
    expect(figureGaitClip(zombie, 'walk', ['T-Pose'])).toBeNull();
    expect(figureGaitClip(dummy, 'run', [])).toBeNull();
  });

  it('gibt einer Figur aus dem Regal die allgemeinen Spuren', () => {
    const knight = shelfSkin('adventurers/characters/Knight.glb');
    expect(figureGaitClips(knight, 'walk')).toBe(GAIT_CLIPS.walk);
  });
});

describe('Die Spur eines Schlags', () => {
  it('nimmt den Hieb mit einer Hand vor dem Fausthieb', () => {
    expect(figureStrikeClip(['Melee_Unarmed_Attack_Punch_A', 'Melee_1H_Attack_Chop'])).toBe(
      'Melee_1H_Attack_Chop',
    );
  });

  it('kommt auch auf dem großen Skelett an einen Schlag', () => {
    expect(figureStrikeClip(['Melee_1H_Slash', 'Idle_A'])).toBe('Melee_1H_Slash');
  });

  it('gibt `null` her, wenn niemand zuschlagen kann', () => {
    expect(figureStrikeClip(['Idle_A', 'Walking_A'])).toBeNull();
  });
});
