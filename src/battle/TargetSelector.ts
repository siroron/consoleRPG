import type { Character } from '../entities/Character.js';
import type { SkillData } from '../data-access/schemas/skill.schema.js';
import type { Player } from '../entities/Player.js';
import type { Monster } from '../entities/Monster.js';

export function selectDefaultTargets(
  skill: SkillData,
  actor: Character,
  allyTargets: Character[],
  enemyTargets: Character[],
): Character[] {
  switch (skill.target) {
    case 'self':
      return [actor];
    case 'all':
      return actor.isPlayer ? enemyTargets.filter((e) => e.isAlive) : allyTargets.filter((e) => e.isAlive);
    case 'single':
      // Default to first alive enemy/ally target
      return actor.isPlayer
        ? enemyTargets.filter((e) => e.isAlive).slice(0, 1)
        : allyTargets.filter((e) => e.isAlive).slice(0, 1);
  }
}

export function applyConfusion(
  originalTargets: Character[],
  allAliveCombatants: Character[],
  rng: () => number,
): Character[] {
  // Single-target skills: randomize to any alive combatant
  if (originalTargets.length === 1 && allAliveCombatants.length > 0) {
    const idx = Math.floor(rng() * allAliveCombatants.length);
    return [allAliveCombatants[idx]];
  }
  return originalTargets;
}

export function getEnemyTargetsForSkill(
  skill: SkillData,
  monster: Monster,
  party: { aliveMembers: Player[] },
): Character[] {
  const alive = party.aliveMembers;
  if (alive.length === 0) return [];

  switch (skill.target) {
    case 'self':
      return [monster];
    case 'all':
      return alive;
    case 'single':
      return [alive[Math.floor(alive.length * 0)]]; // first alive, AI overrides this
  }
}
