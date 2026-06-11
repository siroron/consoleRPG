import type { Monster } from '../../entities/Monster.js';
import type { Party } from '../../entities/Party.js';
import type { SkillData } from '../../data-access/schemas/skill.schema.js';
import type { BattleAction } from '../ActionResolver.js';
import type { EnemyAI } from './EnemyAI.js';
import { getAvailableSkills } from './EnemyAI.js';

export class AggressiveAI implements EnemyAI {
  decide(monster: Monster, party: Party, skillMap: Map<string, SkillData>, rng: () => number): BattleAction {
    const skills = getAvailableSkills(monster, skillMap);
    if (skills.length === 0) return { type: 'defend' };

    // Pick highest-power skill
    const best = skills.reduce((a, b) => (a.power >= b.power ? a : b));
    return this.buildAction(best, monster, party, rng);
  }

  protected buildAction(skill: SkillData, monster: Monster, party: Party, rng: () => number): BattleAction {
    const alive = party.aliveMembers;
    if (alive.length === 0) return { type: 'defend' };

    if (skill.target === 'self') return { type: 'skill', skill, targets: [monster] };
    if (skill.target === 'all') return { type: 'skill', skill, targets: alive };

    // Single target: random alive party member
    const target = alive[Math.floor(rng() * alive.length)];
    return { type: 'skill', skill, targets: [target] };
  }
}
