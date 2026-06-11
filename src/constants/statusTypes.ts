export const STATUS_TYPES = ['poison', 'paralysis', 'sleep', 'silence', 'confusion'] as const;
export type StatusEffectType = (typeof STATUS_TYPES)[number];

export interface StatusEffectConfig {
  id: StatusEffectType;
  displayName: string;
  maxDuration: number;
  blocksAction: boolean;
  blocksSkills: boolean;
  chanceToActIfParalyzed?: number;
}

export const STATUS_CONFIG: Record<StatusEffectType, StatusEffectConfig> = {
  poison:    { id: 'poison',    displayName: '毒',   maxDuration: 5, blocksAction: false, blocksSkills: false },
  paralysis: { id: 'paralysis', displayName: '麻痺', maxDuration: 3, blocksAction: false, blocksSkills: false, chanceToActIfParalyzed: 0.5 },
  sleep:     { id: 'sleep',     displayName: '睡眠', maxDuration: 0, blocksAction: true,  blocksSkills: true  },
  silence:   { id: 'silence',   displayName: '沈黙', maxDuration: 3, blocksAction: false, blocksSkills: true  },
  confusion: { id: 'confusion', displayName: '混乱', maxDuration: 3, blocksAction: false, blocksSkills: false },
};
