import type { Monster } from '../../entities/Monster.js';
import type { Party } from '../../entities/Party.js';
import type { SkillData } from '../../data-access/schemas/skill.schema.js';
import type { BattleAction } from '../ActionResolver.js';

export interface EnemyAI {
  decide(
    monster: Monster,
    party: Party,
    skillMap: Map<string, SkillData>,
    rng: () => number,
  ): BattleAction;
}

export function getAvailableSkills(
  monster: Monster,
  skillMap: Map<string, SkillData>,
): SkillData[] {
  return monster.skills
    .map((id) => skillMap.get(id))
    .filter((s): s is SkillData => s !== undefined)
    .filter((s) => monster.currentMp >= s.mpCost)
    .filter((s) => !monster.hasStatus('silence') || s.mpCost === 0);
}
