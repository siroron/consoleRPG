import { describe, it, expect } from 'vitest';
import { getExpForLevel, getExpToNextLevel, getStatGrowthForLevel } from '../../src/systems/LevelSystem.js';
import { getSkillsLearnedAtLevel } from '../../src/systems/SkillTree.js';

describe('LevelSystem', () => {
  it('calculates exp required for next level', () => {
    // Lv1 → Lv2 requires some EXP
    const toLevel2 = getExpToNextLevel(1);
    expect(toLevel2).toBeGreaterThan(0);
    // Higher levels require more EXP
    const toLevel5 = getExpToNextLevel(4);
    expect(toLevel5).toBeGreaterThan(toLevel2);
    // Cumulative EXP is monotonically increasing
    expect(getExpForLevel(3)).toBeGreaterThan(getExpForLevel(2));
    expect(getExpForLevel(2)).toBeGreaterThan(getExpForLevel(1));
  });

  it('always returns positive stat growth', () => {
    const growth = getStatGrowthForLevel(2);
    // Every level gives at least maxHp and maxMp growth
    expect((growth.maxHp ?? 0)).toBeGreaterThan(0);
    expect((growth.maxMp ?? 0)).toBeGreaterThan(0);
  });

  it('grants larger stat growth at milestone levels (multiples of 5)', () => {
    const normal    = getStatGrowthForLevel(2);
    const milestone = getStatGrowthForLevel(5);
    const totalNormal    = Object.values(normal).reduce((s, v) => s + (v ?? 0), 0);
    const totalMilestone = Object.values(milestone).reduce((s, v) => s + (v ?? 0), 0);
    expect(totalMilestone).toBeGreaterThan(totalNormal);
  });

  it('grants new skills at designated levels', () => {
    // Level 3: water_blast
    expect(getSkillsLearnedAtLevel(3)).toContain('water_blast');
    // Level 5: earth_slash
    expect(getSkillsLearnedAtLevel(5)).toContain('earth_slash');
    // Level 2: no skills
    expect(getSkillsLearnedAtLevel(2)).toHaveLength(0);
  });
});
