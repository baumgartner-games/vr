/**
 * **Wie ein Modell aus dem Regal steht** — Wand, Möbel oder lose
 * (`modelStance.ts`). Gewünscht war: Wände, Tische, Vorratskisten und die
 * Küchenmöbel bleiben stehen, statt umzukippen; ein Fass darf weiter rollen.
 */
import { isFloorPiece, modelStance, nameWords, standsFast } from './modelStance';

describe('Die Wörter eines Dateinamens', () => {
  it('trennt an Unterstrich und Großbuchstaben und schreibt klein', () => {
    expect(nameWords('city-builder-bits/park_wall_innerCorner.glb')).toEqual([
      'park',
      'wall',
      'inner',
      'corner',
    ]);
    expect(nameWords('prototype-bits/Primitive_Wall_Half.glb')).toEqual([
      'primitive',
      'wall',
      'half',
    ]);
  });
});

describe('Die Haltung eines Modells', () => {
  it('nennt Wände, Böden, Türen und Säulen Bau', () => {
    for (const path of [
      'restaurant-bits/wall.glb',
      'restaurant-bits/wall_orderwindow.glb',
      'restaurant-bits/floor_kitchen.glb',
      'restaurant-bits/pillar_A.glb',
      'prototype-bits/Primitive_Wall.glb',
      'prototype-bits/Door_A_Decorated.glb',
      'halloween-bits/fence_broken.glb',
      'dungeon/stairs_wide.glb',
    ]) {
      expect([path, modelStance(path)]).toEqual([path, 'structure']);
    }
  });

  it('nennt Tische, Vorratskisten und Küchenmöbel Möbel', () => {
    for (const path of [
      'restaurant-bits/kitchentable_A.glb',
      'restaurant-bits/kitchencounter_straight_A.glb',
      'restaurant-bits/kitchencabinet_corner.glb',
      'restaurant-bits/crate_buns.glb',
      'restaurant-bits/stove_single.glb',
      'restaurant-bits/fridge_A.glb',
      'restaurant-bits/pizza_oven.glb',
      'restaurant-bits/dishrack.glb',
      'furniture-bits/table_medium.glb',
      'furniture-bits/shelf_B_large.glb',
      'furniture-bits/bed_double_A.glb',
      'prototype-bits/Workbench.glb',
      'dungeon/bartop_A.glb',
    ]) {
      expect([path, modelStance(path)]).toEqual([path, 'furniture']);
    }
  });

  it('lässt Fässer, Geschirr und Essen lose', () => {
    for (const path of [
      'prototype-bits/Barrel.glb',
      'dungeon/barrel_large.glb',
      'restaurant-bits/plate.glb',
      'restaurant-bits/pot_A.glb',
      'restaurant-bits/food_burger.glb',
      'halloween-bits/pumpkin_orange.glb',
    ]) {
      expect([path, modelStance(path)]).toEqual([path, 'loose']);
    }
  });

  it('erkennt eine Wand ohne Namen an ihrer Form', () => {
    // Dünn, lang und hoch: gehört auf die Fuge und steht fest.
    expect(modelStance('holiday-bits/gingerbread_thing.glb', { x: 2, y: 1.5, z: 0.2 })).toBe(
      'structure',
    );
    // Dieselbe Grundfläche flach auf dem Boden ist keine Wand.
    expect(modelStance('holiday-bits/gingerbread_thing.glb', { x: 2, y: 0.1, z: 0.2 })).toBe(
      'loose',
    );
  });

  it('lässt nur das Lose kippen', () => {
    expect(standsFast('structure')).toBe(true);
    expect(standsFast('furniture')).toBe(true);
    expect(standsFast('loose')).toBe(false);
  });
});

describe('Bodenstücke', () => {
  const flat = { x: 2, y: 0.1, z: 2 };

  it('sind Bau mit einem Bodenwort im Namen, und flach', () => {
    expect(isFloorPiece('restaurant-bits/floor_kitchen.glb', flat)).toBe(true);
    expect(
      isFloorPiece('platformer/red/floor_spikes_trap_2x2x1_red.glb', { x: 2, y: 1, z: 2 }),
    ).toBe(true);
    expect(isFloorPiece('city/road_straight.glb', flat)).toBe(true);
  });

  it('sind keine Wände und keine hohen Klötze', () => {
    expect(isFloorPiece('restaurant-bits/wall.glb', { x: 2, y: 2, z: 0.25 })).toBe(false);
    expect(isFloorPiece('dungeon/floor_tile_large.glb', { x: 1, y: 2, z: 1 })).toBe(false);
  });
});
