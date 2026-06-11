import type { Character } from '../entities/Character.js';

export function sortBySpeed(combatants: Character[]): Character[] {
  return [...combatants].sort((a, b) => {
    const diff = b.getEffectiveStats().speed - a.getEffectiveStats().speed;
    // Tie-break: players act before enemies at same speed
    if (diff !== 0) return diff;
    return a.isPlayer ? -1 : 1;
  });
}
