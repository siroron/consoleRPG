// Skills learned by the default hero (勇者) at each level milestone.
// Level 1 starting skills are set in Player.createDefault().
const HERO_SKILL_TREE: Readonly<Record<number, string[]>> = {
  3:  ['water_blast'],
  5:  ['earth_slash'],
  7:  ['silence_spell'],
  10: ['full_heal'],
  15: ['blaze'],
};

export function getSkillsLearnedAtLevel(level: number): string[] {
  return HERO_SKILL_TREE[level] ?? [];
}
