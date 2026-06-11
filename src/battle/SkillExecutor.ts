import type { StatusEffectType } from '../constants/statusTypes.js';
import { STATUS_CONFIG } from '../constants/statusTypes.js';
import type { Character } from '../entities/Character.js';
import type { SkillData } from '../data-access/schemas/skill.schema.js';
import { calculateDamage, calculateHeal } from './DamageCalculator.js';

export interface SkillHitResult {
  target: Character;
  damage: number;
  healed: number;
  statusApplied: StatusEffectType | null;
  isCrit: boolean;
  elementMultiplier: number;
}

export function executeSkill(
  actor: Character,
  targets: Character[],
  skill: SkillData,
  rng: () => number,
): SkillHitResult[] {
  // Consume MP once for the whole skill use
  actor.consumeMp(skill.mpCost);

  const results: SkillHitResult[] = [];

  for (const target of targets) {
    if (!target.isAlive) continue;

    let hit: SkillHitResult;

    if (skill.target === 'self') {
      // Healing
      const healed = calculateHeal(actor, skill);
      target.heal(healed);
      hit = { target, damage: 0, healed, statusApplied: null, isCrit: false, elementMultiplier: 1.0 };
    } else if (skill.power === 0) {
      // Status-only skill (no damage, just apply effect)
      let statusApplied: StatusEffectType | null = null;
      if (skill.effect && skill.effectRate !== undefined && rng() < skill.effectRate) {
        const duration = STATUS_CONFIG[skill.effect].maxDuration;
        target.addStatusEffect(skill.effect, duration);
        statusApplied = skill.effect;
      }
      hit = { target, damage: 0, healed: 0, statusApplied, isCrit: false, elementMultiplier: 1.0 };
    } else {
      // Damage
      const { damage, isCrit, elementMultiplier } = calculateDamage(actor, target, skill, rng);
      target.takeDamage(damage);

      let statusApplied: StatusEffectType | null = null;
      if (skill.effect && skill.effectRate !== undefined && rng() < skill.effectRate) {
        const duration = STATUS_CONFIG[skill.effect].maxDuration;
        target.addStatusEffect(skill.effect, duration);
        statusApplied = skill.effect;
      }

      hit = { target, damage, healed: 0, statusApplied, isCrit, elementMultiplier };
    }

    results.push(hit);
  }

  return results;
}
