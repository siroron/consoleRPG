import type { Monster } from '../../entities/Monster.js';
import type { Party } from '../../entities/Party.js';
import type { SkillData } from '../../data-access/schemas/skill.schema.js';
import type { BattleAction } from '../ActionResolver.js';
import type { EnemyAI } from './EnemyAI.js';
import { getAvailableSkills } from './EnemyAI.js';
import { AggressiveAI } from './AggressiveAI.js';

export class DefensiveAI implements EnemyAI {
  decide(monster: Monster, party: Party, skillMap: Map<string, SkillData>, rng: () => number): BattleAction {
    const hpRatio = monster.currentHp / monster.baseStats.maxHp;

    if (hpRatio < 0.5) {
      const healSkill = getAvailableSkills(monster, skillMap).find((s) => s.target === 'self' && s.power > 0);
      if (healSkill) {
        return { type: 'skill', skill: healSkill, targets: [monster] };
      }
    }

    return new AggressiveAI().decide(monster, party, skillMap, rng);
  }
}
