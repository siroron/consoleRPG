import { CONFIG } from '../constants/config.js';
import { randomRange } from '../utils/math.js';
import { getElementMultiplier } from './ElementChart.js';
import type { Character } from '../entities/Character.js';
import type { SkillData } from '../data-access/schemas/skill.schema.js';

export interface DamageResult {
  damage: number;
  isCrit: boolean;
  elementMultiplier: number;
}

function getAttackStat(actor: Character, skill: SkillData): number {
  const stats = actor.getEffectiveStats();
  // Elemental skills use magic stat; physical (none-element) uses attack
  return skill.element !== 'none' ? stats.magic : stats.attack;
}

export function calculateDamage(
  actor: Character,
  defender: Character,
  skill: SkillData,
  rng: () => number,
): DamageResult {
  const atkStat = getAttackStat(actor, skill);
  const defStats = defender.getEffectiveStats();
  // Defending doubles effective defense
  const defStat = defender.isDefending ? defStats.defense * 2 : defStats.defense;

  const base = Math.max(0, (atkStat * skill.power) / 100 - defStat / 2);
  const elementMultiplier = getElementMultiplier(skill.element, defender.element);
  const randMod = randomRange(CONFIG.RAND_MOD_MIN, CONFIG.RAND_MOD_MAX, rng);
  const critChance = CONFIG.BASE_CRIT_RATE + actor.getEffectiveStats().luck / 1000;
  const isCrit = rng() < critChance;
  const critMod = isCrit ? CONFIG.CRIT_MULTIPLIER : 1.0;

  const damage = Math.max(1, Math.floor(base * elementMultiplier * randMod * critMod));
  return { damage, isCrit, elementMultiplier };
}

export function calculateHeal(actor: Character, skill: SkillData): number {
  const stats = actor.getEffectiveStats();
  return Math.max(1, Math.floor((stats.magic * skill.power) / 100));
}
