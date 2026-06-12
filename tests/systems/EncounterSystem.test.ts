import { describe, it, expect } from 'vitest';
import { canEncounter, getEncounterEnemyIds } from '../../src/systems/EncounterSystem.js';
import { RNG } from '../../src/core/RNG.js';

const FOREST_ENEMIES = ['slime', 'goblin', 'fire_bat'];
const CAVE_ENEMIES   = ['goblin', 'fire_bat', 'shadow_wolf', 'stone_golem'];

// ──────────────────────────────────────────────────────────
// canEncounter
// ──────────────────────────────────────────────────────────
describe('canEncounter', () => {
  it('town — エンカウントなし', () => {
    expect(canEncounter('town')).toBe(false);
  });

  it('forest — エンカウントあり', () => {
    expect(canEncounter('forest')).toBe(true);
  });

  it('cave — エンカウントあり', () => {
    expect(canEncounter('cave')).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────
// getEncounterEnemyIds
// ──────────────────────────────────────────────────────────
describe('getEncounterEnemyIds', () => {
  it('town — 空配列を返す', () => {
    expect(getEncounterEnemyIds('town', new RNG('seed'))).toHaveLength(0);
  });

  it('forest — 1〜2 体の敵 ID を返す', () => {
    const ids = getEncounterEnemyIds('forest', new RNG('seed'));
    expect(ids.length).toBeGreaterThanOrEqual(1);
    expect(ids.length).toBeLessThanOrEqual(2);
  });

  it('forest — 返される ID はすべて森のテーブルに存在する（20シード試行）', () => {
    for (let i = 0; i < 20; i++) {
      const ids = getEncounterEnemyIds('forest', new RNG(`seed-${i}`));
      for (const id of ids) {
        expect(FOREST_ENEMIES).toContain(id);
      }
    }
  });

  it('cave — 返される ID はすべて洞窟のテーブルに存在する（20シード試行）', () => {
    for (let i = 0; i < 20; i++) {
      const ids = getEncounterEnemyIds('cave', new RNG(`seed-${i}`));
      for (const id of ids) {
        expect(CAVE_ENEMIES).toContain(id);
      }
    }
  });

  it('同じシードは常に同じ結果を返す（決定論的）', () => {
    const ids1 = getEncounterEnemyIds('forest', new RNG('fixed'));
    const ids2 = getEncounterEnemyIds('forest', new RNG('fixed'));
    expect(ids1).toEqual(ids2);
  });
});
