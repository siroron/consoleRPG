import { ELEMENT_CHART } from '../../constants/elements.js';
import type { Monster } from '../../entities/Monster.js';
import type { Party } from '../../entities/Party.js';
import type { SkillData } from '../../data-access/schemas/skill.schema.js';
import type { BattleAction } from '../ActionResolver.js';
import type { EnemyAI } from './EnemyAI.js';
import { getAvailableSkills } from './EnemyAI.js';
export class SmartAI implements EnemyAI {
  decide(monster: Monster, party: Party, skillMap: Map<string, SkillData>, _rng: () => number): BattleAction {
    const skills = getAvailableSkills(monster, skillMap);
    if (skills.length === 0) return { type: 'defend' };

    const alive = party.aliveMembers;
    if (alive.length === 0) return { type: 'defend' };

    // Score each skill by best element advantage
    const scored = skills.map((skill) => {
      const bestMult = alive.reduce((max, member) => {
        const mult = ELEMENT_CHART[skill.element][member.element];
        return mult > max ? mult : max;
      }, 0);
      return { skill, score: skill.power * bestMult };
    });
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0]?.skill ?? skills[0];

    if (best.target === 'self') return { type: 'skill', skill: best, targets: [monster] };
    if (best.target === 'all') return { type: 'skill', skill: best, targets: alive };

    // Target the member most vulnerable to this skill's element
    const target = alive.reduce((mostVulnerable, member) => {
      const vMult = ELEMENT_CHART[best.element][mostVulnerable.element];
      const mMult = ELEMENT_CHART[best.element][member.element];
      return mMult > vMult ? member : mostVulnerable;
    });

    return { type: 'skill', skill: best, targets: [target] };
  }
}
