import { CONFIG } from '../constants/config.js';
import type { Stats } from '../entities/Stats.js';

export function getExpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(CONFIG.EXP_CURVE_BASE * Math.pow(level - 1, CONFIG.EXP_CURVE_EXPONENT));
}

export function getExpToNextLevel(level: number): number {
  return getExpForLevel(level + 1) - getExpForLevel(level);
}

export function getStatGrowthForLevel(level: number): Partial<Stats> {
  const milestone = level % 5 === 0;
  return {
    maxHp:   milestone ? 12 : 5,
    maxMp:   2,
    attack:  milestone ? 4 : (level % 2 === 0 ? 2 : 1),
    defense: milestone ? 3 : 1,
    magic:   milestone ? 4 : (level % 3 === 0 ? 2 : 1),
    speed:   level % 3 === 0 ? 1 : 0,
    luck:    milestone ? 2 : 0,
  };
}
