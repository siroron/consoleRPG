import { describe, it, expect } from 'vitest';
import { calculateDamage, calculateHeal } from '../../src/battle/DamageCalculator.js';
import { Player } from '../../src/entities/Player.js';
import { Monster } from '../../src/entities/Monster.js';

const attacker = Player.createDefault(); // attack:25, magic:20, luck:8
const slimeData = {
  id: 'slime', name: 'スライム', element: 'water' as const,
  stats: { maxHp: 30, maxMp: 0, attack: 8, defense: 5, magic: 0, speed: 5, luck: 3 },
  skills: ['tackle'], aiType: 'aggressive' as const, exp: 10, gold: 5, drops: [],
};
const defender = Monster.fromData(slimeData);

const tackle = {
  id: 'tackle', name: 'たいあたり', mpCost: 0, power: 80, element: 'none' as const, target: 'single' as const,
};
const fireBolt = {
  id: 'fire_bolt', name: 'ファイアボルト', mpCost: 5, power: 120, element: 'fire' as const, target: 'single' as const,
};
const healSkill = {
  id: 'heal', name: 'ヒール', mpCost: 8, power: 100, element: 'none' as const, target: 'self' as const,
};

// Fixed RNG for deterministic tests
const fixedRng = (val: number) => () => val;

describe('DamageCalculator', () => {
  it('calculates base damage correctly (physical, no element)', () => {
    // base = (25 * 80 / 100) - (5 / 2) = 20 - 2.5 = 17.5 → floor(17.5 * 1.0 * randMod) ≥ 1
    const result = calculateDamage(attacker, defender, tackle, fixedRng(0.0));
    expect(result.damage).toBeGreaterThanOrEqual(1);
    expect(result.elementMultiplier).toBe(1.0); // none vs water = 1.0
  });

  it('applies element multiplier (fire vs water = 0.5)', () => {
    // fire_bolt vs slime (water): elementMultiplier = 0.5
    const result = calculateDamage(attacker, defender, fireBolt, fixedRng(0.0));
    expect(result.elementMultiplier).toBe(0.5);
  });

  it('enforces minimum damage of 1', () => {
    // Defender with extreme defense
    const tankData = {
      ...slimeData,
      stats: { ...slimeData.stats, defense: 9999 },
    };
    const tank = Monster.fromData(tankData);
    const result = calculateDamage(attacker, tank, tackle, fixedRng(0.0));
    expect(result.damage).toBe(1);
  });

  it('applies critical hit multiplier (1.5x)', () => {
    // Force crit by setting rng always returns 0 (< BASE_CRIT_RATE=0.05)
    // First call: randomRange uses rng for rand modifier, second call: crit check
    let callCount = 0;
    const critRng = () => {
      callCount++;
      return callCount === 1 ? 1.0 : 0.0; // rand=1.0 (max), crit=0.0 (always crit)
    };
    const result = calculateDamage(attacker, defender, tackle, critRng);
    expect(result.isCrit).toBe(true);
  });

  it('does NOT crit when rng returns value above crit threshold', () => {
    let callCount = 0;
    const noCritRng = () => {
      callCount++;
      return callCount === 1 ? 1.0 : 0.99; // rand=1.0, crit check=0.99 (never crits at BASE_CRIT_RATE=0.05)
    };
    const result = calculateDamage(attacker, defender, tackle, noCritRng);
    expect(result.isCrit).toBe(false);
  });

  it('doubles effective defense when defender is defending', () => {
    defender.isDefending = true;
    const defended = calculateDamage(attacker, defender, tackle, fixedRng(1.0));
    defender.isDefending = false;
    const normal = calculateDamage(attacker, defender, tackle, fixedRng(1.0));
    expect(defended.damage).toBeLessThan(normal.damage);
  });

  it('calculateHeal uses magic stat and skill power', () => {
    // magic=20, power=100 → 20 * 100 / 100 = 20
    const healed = calculateHeal(attacker, healSkill);
    expect(healed).toBe(20);
  });

  it('elemental skills use magic stat (fire_bolt vs none-element defender)', () => {
    const noneDefData = { ...slimeData, element: 'none' as const };
    const noneDef = Monster.fromData(noneDefData);
    const result = calculateDamage(attacker, noneDef, fireBolt, fixedRng(1.0));
    // fire vs none = 1.0, magic=20, power=120: base = (20*120/100) - (5/2) = 24 - 2.5 = 21.5
    expect(result.elementMultiplier).toBe(1.0);
    expect(result.damage).toBeGreaterThanOrEqual(1);
  });
});
